import fs from 'fs';
import path from 'path';

const MCP_ENDPOINT = 'https://questathon.aihackerscollective.com/api/public/mcp';
const REST_BASE = 'https://questathon.aihackerscollective.com/api/public/v1';

// Server-side rate limit tracking (1 call per minute per token)
let lastCallTimestamp = 0;
let nextAllowedCallTimestamp = 0;

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
 * Helper to check rate limit timing
 */
export function getRateLimitStatus(): {
  canCallNow: boolean;
  secondsRemaining: number;
} {
  const now = Date.now();
  if (now >= nextAllowedCallTimestamp) {
    return { canCallNow: true, secondsRemaining: 0 };
  }
  const remaining = Math.ceil((nextAllowedCallTimestamp - now) / 1000);
  return { canCallNow: false, secondsRemaining: remaining };
}

/**
 * Update rate limit countdown after a call
 */
function recordCallMade(retryAfterSeconds = 61) {
  const now = Date.now();
  lastCallTimestamp = now;
  nextAllowedCallTimestamp = now + retryAfterSeconds * 1000;
}

/**
 * Call MCP Tool via JSON-RPC 2.0
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

  const rateCheck = getRateLimitStatus();
  if (!rateCheck.canCallNow) {
    return {
      success: false,
      error: `Rate limit in effect: token allows 1 call per minute. Try again in ${rateCheck.secondsRemaining}s.`,
      retryAfterSeconds: rateCheck.secondsRemaining,
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

    const res = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 429) {
      const errorJson = await res.json().catch(() => ({}));
      const wait = errorJson.retry_after_seconds || 61;
      recordCallMade(wait);
      return {
        success: false,
        error: errorJson.error || `Too many requests: wait ${wait} seconds.`,
        retryAfterSeconds: wait,
      };
    }

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        error: `MCP HTTP Error ${res.status}: ${errText.slice(0, 200)}`,
      };
    }

    const json = await res.json();
    if (json.error) {
      return {
        success: false,
        error: json.error.message || 'MCP JSON-RPC Error',
      };
    }

    if (json.result?.isError) {
      return {
        success: false,
        error: json.result.content?.[0]?.text || 'MCP Tool reported an error',
      };
    }

    recordCallMade(61);

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
    return {
      success: false,
      error: `Network/MCP exception: ${err.message}`,
    };
  }
}

/**
 * Fetch direct REST endpoint under /api/public/v1
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

  const rateCheck = getRateLimitStatus();
  if (!rateCheck.canCallNow) {
    return {
      success: false,
      error: `Rate limit in effect: token allows 1 call per minute. Try again in ${rateCheck.secondsRemaining}s.`,
      retryAfterSeconds: rateCheck.secondsRemaining,
    };
  }

  try {
    const url = `${REST_BASE}${endpointPath.startsWith('/') ? '' : '/'}${endpointPath}`;
    const res = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
      },
    });

    if (res.status === 429) {
      const errorJson = await res.json().catch(() => ({}));
      const wait = errorJson.retry_after_seconds || 61;
      recordCallMade(wait);
      return {
        success: false,
        error: errorJson.error || `Too many requests: wait ${wait} seconds.`,
        retryAfterSeconds: wait,
      };
    }

    if (!res.ok) {
      return {
        success: false,
        error: `HTTP ${res.status}`,
      };
    }

    recordCallMade(61);
    const json = await res.json();
    return {
      success: true,
      data: json,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
}
