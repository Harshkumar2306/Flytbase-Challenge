export const DEMO_EVALUATION_KEY = 'questathon-demo-key-2026';

export interface AuthCheckResult {
  authorized: boolean;
  error?: string;
  keySource?: 'configured_secret' | 'evaluation_key';
}

/**
 * Mandatory Write Authorization Verifier.
 * Protects server-side Questathon API quota from public abuse.
 * In production:
 * - If CRM_WRITE_KEY is configured in env: requires exact match.
 * - Otherwise: requires the evaluation passkey 'questathon-demo-key-2026'.
 * Requests lacking a valid x-crm-write-key header are rejected with HTTP 401.
 */
export function verifyWriteAccess(headers: Headers | Record<string, string | null | undefined>): AuthCheckResult {
  const getHeader = (key: string): string | null => {
    if (typeof (headers as any).get === 'function') {
      return (headers as Headers).get(key);
    }
    const val = (headers as Record<string, string | null | undefined>)[key] || 
                (headers as Record<string, string | null | undefined>)[key.toLowerCase()];
    return val ? String(val) : null;
  };

  const configuredKey = process.env.CRM_WRITE_KEY;
  const providedKey = getHeader('x-crm-write-key');

  if (!providedKey || providedKey.trim() === '') {
    return {
      authorized: false,
      error: 'Unauthorized: Missing required x-crm-write-key header for write operations.',
    };
  }

  if (configuredKey && configuredKey.trim() !== '') {
    if (providedKey === configuredKey.trim()) {
      return { authorized: true, keySource: 'configured_secret' };
    }
    return {
      authorized: false,
      error: 'Unauthorized: Invalid x-crm-write-key secret provided.',
    };
  }

  // Fallback to demo evaluation key
  if (providedKey === DEMO_EVALUATION_KEY) {
    return { authorized: true, keySource: 'evaluation_key' };
  }

  return {
    authorized: false,
    error: 'Unauthorized: Invalid x-crm-write-key provided for evaluation.',
  };
}
