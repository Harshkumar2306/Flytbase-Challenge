import { 
  acquireDistributedLock, 
  releaseDistributedLock, 
  releaseDistributedLockOnError,
  getRateLimitStatus as getStorageRateLimitStatus 
} from './storage.ts';

const MCP_ENDPOINT = 'https://questathon.aihackerscollective.com/api/public/mcp';
const REST_BASE = 'https://questathon.aihackerscollective.com/api/public/v1';

export interface ToolCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  retryAfterSeconds?: number;
  fromCache?: boolean;
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
 * Check rate limit timing across all server instances
 */
export function getRateLimitStatus(): {
  canCallNow: boolean;
  secondsRemaining: number;
  inFlight: boolean;
  storageEngine: string;
} {
  return getStorageRateLimitStatus();
}

/**
 * Exported lock helpers for direct testing and synchronization control
 */
export async function acquireLock(): Promise<{ acquired: boolean; error?: string; retryAfterSeconds?: number; engine?: string }> {
  return acquireDistributedLock();
}

export async function releaseLock(retryAfterSeconds = 61): Promise<void> {
  return releaseDistributedLock(retryAfterSeconds);
}

export async function releaseLockOnError(retryAfterSeconds = 61): Promise<void> {
  return releaseDistributedLockOnError(retryAfterSeconds);
}

/**
 * Call MCP Tool via JSON-RPC 2.0 with persistent distributed rate limit lock.
 * Lock is reserved and cooldown stamped BEFORE dispatch.
 * Network/uncertain errors are handled conservatively (preserving 60s cooldown).
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

  // 1. Atomically acquire distributed lock before dispatch
  const lockCheck = await acquireDistributedLock();
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
    const timeoutId = setTimeout(() => controller.abort(), 14000);

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
      await releaseDistributedLock(wait);
      return {
        success: false,
        error: errorJson.error || `Too many requests: token allows 1 call per minute. Wait ${wait}s.`,
        retryAfterSeconds: wait,
      };
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      // Conservative handling: HTTP errors might still have reached Questathon
      await releaseDistributedLockOnError(61);
      return {
        success: false,
        error: `MCP HTTP Error ${res.status}: ${errText.slice(0, 150)}`,
        retryAfterSeconds: 61,
      };
    }

    const json = await res.json();
    if (json.error) {
      await releaseDistributedLockOnError(61);
      return {
        success: false,
        error: json.error.message || 'MCP JSON-RPC Error',
        retryAfterSeconds: 61,
      };
    }

    if (json.result?.isError) {
      await releaseDistributedLockOnError(61);
      return {
        success: false,
        error: json.result.content?.[0]?.text || 'MCP Tool reported an error',
        retryAfterSeconds: 61,
      };
    }

    // Call succeeded: record confirmed 61-second rate limit window
    await releaseDistributedLock(61);

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
    // Conservative handling: network failure or timeout could mean request was dispatched
    await releaseDistributedLockOnError(61);
    return {
      success: false,
      error: `Network/MCP exception (${err.message}). Rate limit preserved conservatively for 61s.`,
      retryAfterSeconds: 61,
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

  const lockCheck = await acquireDistributedLock();
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
    const timeoutId = setTimeout(() => controller.abort(), 14000);

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
      await releaseDistributedLock(wait);
      return {
        success: false,
        error: errorJson.error || `Too many requests: wait ${wait} seconds.`,
        retryAfterSeconds: wait,
      };
    }

    if (!res.ok) {
      await releaseDistributedLockOnError(61);
      return {
        success: false,
        error: `HTTP ${res.status}`,
        retryAfterSeconds: 61,
      };
    }

    await releaseDistributedLock(61);
    const json = await res.json();
    return {
      success: true,
      data: json,
    };
  } catch (err: any) {
    await releaseDistributedLockOnError(61);
    return {
      success: false,
      error: err.message,
      retryAfterSeconds: 61,
    };
  }
}
