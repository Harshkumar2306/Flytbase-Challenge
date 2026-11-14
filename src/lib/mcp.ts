import fs from 'fs';
import path from 'path';

const MCP_ENDPOINT = 'https://questathon.aihackerscollective.com/api/public/mcp';
const REST_BASE = 'https://questathon.aihackerscollective.com/api/public/v1';

// Persistent lock file location: supports serverless (/tmp) and local development
const LOCK_FILE_PATH = path.join('/tmp', 'questathon_mcp_lock.json');

export interface ToolCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  retryAfterSeconds?: number;
  fromCache?: boolean;
}

interface McpLockState {
  isLocked: boolean;
  lockedAt: number;
  lastCallTimestamp: number;
  nextAllowedTimestamp: number;
}

/**
 * Returns safe environment token without ever leaking it to client
 */
export function getSafeToken(): string | null {
  const token = process.env.AQ_TOKEN;
  if (!token || token.trim() === '' || token.includes('your_questathon_token')) {
    return null;
  }
  return token.trim();
}

/**
 * Read persistent lock state from disk (/tmp)
 */
function readLockState(): McpLockState {
  try {
    if (fs.existsSync(LOCK_FILE_PATH)) {
      const content = fs.readFileSync(LOCK_FILE_PATH, 'utf8');
      const parsed = JSON.parse(content);
      return {
        isLocked: !!parsed.isLocked,
        lockedAt: Number(parsed.lockedAt) || 0,
        lastCallTimestamp: Number(parsed.lastCallTimestamp) || 0,
        nextAllowedTimestamp: Number(parsed.nextAllowedTimestamp) || 0,
      };
    }
  } catch (_) {}

  return {
    isLocked: false,
    lockedAt: 0,
    lastCallTimestamp: 0,
    nextAllowedTimestamp: 0,
  };
}

/**
 * Write persistent lock state to disk (/tmp)
 */
function writeLockState(state: McpLockState) {
  try {
    fs.writeFileSync(LOCK_FILE_PATH, JSON.stringify(state), 'utf8');
  } catch (err) {
    console.error('Failed to write MCP lock file:', err);
  }
}

/**
 * Check rate limit timing across all server instances
 */
export function getRateLimitStatus(): {
  canCallNow: boolean;
  secondsRemaining: number;
  inFlight: boolean;
} {
  const state = readLockState();
  const now = Date.now();

  // Check if a call is currently in-flight (max 15s timeout before assuming stale lock)
  const inFlight = state.isLocked && (now - state.lockedAt < 15000);

  if (now < state.nextAllowedTimestamp) {
    const remaining = Math.ceil((state.nextAllowedTimestamp - now) / 1000);
    return { canCallNow: false, secondsRemaining: remaining, inFlight };
  }

  if (inFlight) {
    return { canCallNow: false, secondsRemaining: Math.ceil((15000 - (now - state.lockedAt)) / 1000), inFlight: true };
  }

  return { canCallNow: true, secondsRemaining: 0, inFlight: false };
}

/**
 * Acquire call lock, verifying rate limit and preventing parallel calls
 */
export function acquireLock(): { acquired: boolean; error?: string; retryAfterSeconds?: number } {
  const state = readLockState();
  const now = Date.now();

  // Prevent parallel in-flight calls
  if (state.isLocked && (now - state.lockedAt < 15000)) {
    const waitSec = Math.ceil((15000 - (now - state.lockedAt)) / 1000);
    return {
      acquired: false,
      error: 'Another MCP call is currently in flight. Parallel calls are forbidden by Questathon rules.',
      retryAfterSeconds: waitSec,
    };
  }

  // Enforce 1 call per minute rate limit
  if (now < state.nextAllowedTimestamp) {
    const waitSec = Math.ceil((state.nextAllowedTimestamp - now) / 1000);
    return {
      acquired: false,
      error: `Rate limit in effect: token allows 1 call per minute. Try again in ${waitSec}s.`,
      retryAfterSeconds: waitSec,
    };
  }

  // Acquire lock
  writeLockState({
    ...state,
    isLocked: true,
    lockedAt: now,
  });

  return { acquired: true };
}

/**
 * Release lock and set next permitted call timestamp
 */
export function releaseLock(retryAfterSeconds = 61) {
  const state = readLockState();
  const now = Date.now();
  writeLockState({
    isLocked: false,
    lockedAt: 0,
    lastCallTimestamp: now,
    nextAllowedTimestamp: now + (retryAfterSeconds * 1000),
  });
}

/**
 * Release lock on failure without advancing rate limit unless 429 was reported
 */
function releaseLockOnError(retryAfterSeconds = 0) {
  const state = readLockState();
  const now = Date.now();
  writeLockState({
    ...state,
    isLocked: false,
    lockedAt: 0,
    nextAllowedTimestamp: retryAfterSeconds > 0 ? (now + retryAfterSeconds * 1000) : state.nextAllowedTimestamp,
  });
}

/**
 * Call MCP Tool via JSON-RPC 2.0 with persistent rate limit lock
 */
export async function callTool<T = any>(
  toolName: string,
  args: Record<string, any> = {}
): Promise<ToolCallResult<T>> {
  const token = getSafeToken();
  if (!token) {
    return {
      success: false,
      error: 'AQ_TOKEN is not configured on server.',
    };
  }

  const lockCheck = acquireLock();
  if (!lockCheck.acquired) {
    return {
      success: false,
      error: lockCheck.error,
      retryAfterSeconds: lockCheck.retryAfterSeconds,
    };
  }

  try {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (res.status === 429) {
      const errorJson = await res.json().catch(() => ({}));
      const wait = errorJson.retry_after_seconds || 61;
      releaseLock(wait);
      return {
        success: false,
        error: errorJson.error || `Too many requests: token allows 1 call per minute. Wait ${wait}s.`,
        retryAfterSeconds: wait,
      };
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      releaseLockOnError(0);
      return {
        success: false,
        error: `MCP HTTP Error ${res.status}: ${errText.slice(0, 150)}`,
      };
    }

    const json = await res.json();
    if (json.error) {
      releaseLockOnError(0);
      return {
        success: false,
        error: json.error.message || 'MCP JSON-RPC Error',
      };
    }

    if (json.result?.isError) {
      releaseLockOnError(0);
      return {
        success: false,
        error: json.result.content?.[0]?.text || 'MCP Tool reported an error',
      };
    }

    // Call succeeded: record 61-second rate limit window
    releaseLock(61);

    const rawText = json.result?.content?.[0]?.text;
    let parsedData = rawText;
    try {
      parsedData = JSON.parse(rawText);
    } catch (_) {}

    return {
      success: true,
      data: parsedData,
    };
  } catch (err: any) {
    releaseLockOnError(0);
    return {
      success: false,
      error: `Network/MCP exception: ${err.message}`,
    };
  }
}

/**
 * Fetch direct REST endpoint under /api/public/v1 with rate limit locking
 */
export async function fetchRestEndpoint<T = any>(
  endpointPath: string
): Promise<ToolCallResult<T>> {
  const token = getSafeToken();
  if (!token) {
    return {
      success: false,
      error: 'AQ_TOKEN is not configured on server.',
    };
  }

  const lockCheck = acquireLock();
  if (!lockCheck.acquired) {
    return {
      success: false,
      error: lockCheck.error,
      retryAfterSeconds: lockCheck.retryAfterSeconds,
    };
  }

  try {
    const url = `${REST_BASE}${endpointPath.startsWith('/') ? '' : '/'}${endpointPath}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (res.status === 429) {
      const errorJson = await res.json().catch(() => ({}));
      const wait = errorJson.retry_after_seconds || 61;
      releaseLock(wait);
      return {
        success: false,
        error: errorJson.error || `Too many requests: wait ${wait} seconds.`,
        retryAfterSeconds: wait,
      };
    }

    if (!res.ok) {
      releaseLockOnError(0);
      return {
        success: false,
        error: `HTTP ${res.status}`,
      };
    }

    releaseLock(61);
    const json = await res.json();
    return {
      success: true,
      data: json,
    };
  } catch (err: any) {
    releaseLockOnError(0);
    return {
      success: false,
      error: err.message,
    };
  }
}
