import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { callTool, getRateLimitStatusAsync, getSafeToken } from '@/lib/mcp';
import { appendCRMNoteAsync } from '@/lib/data-store';
import { getStoredNotesAsync, getPendingNotesAsync } from '@/lib/storage';
import { verifyWriteAccess } from '@/lib/auth';
import { CRMNote } from '@/types/crm';

export const dynamic = 'force-dynamic';

const DEMO_EVALUATION_KEY = 'questathon-demo-key-2026';

// In-memory abuse protection limiter for public demo (tracks IP submissions)
const ipSubmissionTracker = new Map<string, { count: number; firstSeen: number }>();

function checkIpRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxWrites = 6; // Max 6 note submissions per 10 minutes per IP

  const record = ipSubmissionTracker.get(ip);
  if (!record || now - record.firstSeen > windowMs) {
    ipSubmissionTracker.set(ip, { count: 1, firstSeen: now });
    return { allowed: true };
  }

  if (record.count >= maxWrites) {
    const remainingSec = Math.ceil((record.firstSeen + windowMs - now) / 1000);
    return { allowed: false, retryAfterSec: remainingSec };
  }

  record.count += 1;
  return { allowed: true };
}

export async function GET() {
  const notes = await getStoredNotesAsync();
  const pending = await getPendingNotesAsync();
  return NextResponse.json({
    success: true,
    notes,
    pendingCount: pending.length,
  });
}

export async function POST(req: Request) {
  try {
    // 1. Mandatory Authorization / Access Control check
    const authCheck = verifyWriteAccess(req.headers);
    if (!authCheck.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: authCheck.error,
        },
        { status: 401 }
      );
    }

    // 2. IP Abuse Rate Limiting (Protects server-side token quota against automated bots)
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown-client';

    const ipCheck = checkIpRateLimit(clientIp);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Abuse protection: Too many notes submitted from this IP. Please wait ${ipCheck.retryAfterSec}s.`,
          retryAfterSeconds: ipCheck.retryAfterSec,
        },
        { status: 429 }
      );
    }

    // 3. Strict Input Parsing & Length Boundaries
    const body = await req.json();
    const { text, account, kind = 'note', title } = body;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'Note text is required.',
        },
        { status: 400 }
      );
    }

    if (text.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Note text exceeds maximum allowed size (1,000 characters).',
        },
        { status: 400 }
      );
    }

    const cleanTitle = title && typeof title === 'string' ? title.trim().slice(0, 120) : undefined;

    const validKinds = ['note', 'task', 'risk', 'next_step'];
    if (!validKinds.includes(kind)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid kind: ${kind}. Must be one of ${validKinds.join(', ')}.`,
        },
        { status: 400 }
      );
    }

    const validAccounts = ['A', 'B', 'All Accounts'];
    const targetAccount = validAccounts.includes(account) ? account : 'All Accounts';

    // 4. Stable Deterministic Idempotency Key
    // Derived from content + account + kind to prevent duplicate creation
    const textHash = crypto.createHash('sha256').update(`${targetAccount}:${kind}:${text.trim()}`).digest('hex').slice(0, 12);
    const noteId = `note_${Date.now()}_${textHash}`;
    const remoteIdempotencyRef = `ref:${textHash.slice(0, 8)}`;

    const token = getSafeToken();
    let mcpResult: any = null;
    let syncState: 'synced' | 'saved_locally_pending' = 'saved_locally_pending';

    // 5. Opportunistic Dispatch if Rate Limit Slot is Free Right Now
    if (token) {
      const rateCheck = await getRateLimitStatusAsync();
      if (rateCheck.canCallNow) {
        mcpResult = await callTool('write_note', {
          text: text.trim(),
          account: targetAccount !== 'All Accounts' ? targetAccount : undefined,
          kind,
          title: cleanTitle ? `${cleanTitle} [${remoteIdempotencyRef}]` : `[${remoteIdempotencyRef}] ${kind.toUpperCase()}`,
        });

        if (mcpResult.success) {
          syncState = 'synced';
        }
      }
    }

    const newNote: CRMNote = {
      id: noteId,
      accountId: targetAccount,
      kind,
      title: cleanTitle || `${kind.toUpperCase()}: ${text.slice(0, 30)}`,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      author: 'Account Manager',
      syncStatus: syncState,
      remoteConfirmedAt: syncState === 'synced' ? new Date().toISOString() : undefined,
      remoteError: mcpResult && !mcpResult.success ? mcpResult.error : undefined,
      retryCount: 0,
      idempotencyKey: textHash,
    };

    // Staged atomically via per-record HSET / atomic local file store
    await appendCRMNoteAsync(newNote);

    return NextResponse.json({
      success: true,
      note: newNote,
      mcpStatus: syncState,
      mcpError: mcpResult && !mcpResult.success ? mcpResult.error : undefined,
      message:
        syncState === 'synced'
          ? 'Note saved and confirmed synced to Questathon MCP.'
          : 'Note saved locally. Scheduled for automatic background sync to Questathon MCP.',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
