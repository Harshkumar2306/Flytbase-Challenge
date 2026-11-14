import { NextResponse } from 'next/server';
import { callTool, getRateLimitStatusAsync, getSafeToken } from '@/lib/mcp';
import { appendCRMNoteAsync } from '@/lib/data-store';
import { getStoredNotesAsync, updateStoredNoteStatusAsync } from '@/lib/storage';
import { CRMNote } from '@/types/crm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const notes = await getStoredNotesAsync();
  return NextResponse.json({
    success: true,
    notes,
  });
}

/**
 * Retry pending notes when MCP rate limit allows.
 * Called internally; returns count of notes successfully synced.
 */
async function retryPendingNotes(): Promise<{ retriedCount: number; errors: string[] }> {
  const token = getSafeToken();
  if (!token) return { retriedCount: 0, errors: [] };

  const rateCheck = await getRateLimitStatusAsync();
  if (!rateCheck.canCallNow) return { retriedCount: 0, errors: [] };

  const notes = await getStoredNotesAsync();
  const pending = notes.filter(
    (n) => n.syncStatus === 'saved_locally_pending' || n.syncStatus === 'pending_retry'
  );

  if (pending.length === 0) return { retriedCount: 0, errors: [] };

  // Only retry the oldest pending note to respect 1-call/min rate limit
  const oldest = pending[pending.length - 1];
  const errors: string[] = [];
  let retriedCount = 0;

  try {
    const result = await callTool('write_note', {
      text: oldest.text,
      account: oldest.accountId !== 'All Accounts' ? oldest.accountId : undefined,
      kind: oldest.kind,
      title: oldest.title,
    });

    if (result.success) {
      await updateStoredNoteStatusAsync(oldest.id, 'synced', new Date().toISOString());
      retriedCount = 1;
    } else {
      await updateStoredNoteStatusAsync(oldest.id, 'pending_retry', undefined, result.error);
      errors.push(`${oldest.id}: ${result.error}`);
    }
  } catch (e: any) {
    await updateStoredNoteStatusAsync(oldest.id, 'pending_retry', undefined, e.message);
    errors.push(`${oldest.id}: ${e.message}`);
  }

  return { retriedCount, errors };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, account, kind = 'note', title, action } = body;

    // Support a retry action for pending notes
    if (action === 'retry_pending') {
      const result = await retryPendingNotes();
      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    if (!text || text.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Note text is required.',
      }, { status: 400 });
    }

    const validKinds = ['note', 'task', 'risk', 'next_step'];
    if (!validKinds.includes(kind)) {
      return NextResponse.json({
        success: false,
        error: `Invalid kind: ${kind}. Must be one of ${validKinds.join(', ')}.`,
      }, { status: 400 });
    }

    const token = getSafeToken();
    let mcpResult: any = null;
    let syncState: 'synced' | 'saved_locally_pending' = 'saved_locally_pending';

    if (token) {
      const rateCheck = await getRateLimitStatusAsync();
      if (rateCheck.canCallNow) {
        // Dispatch write_note to Questathon MCP
        mcpResult = await callTool('write_note', {
          text: text.trim(),
          account: account || undefined,
          kind,
          title: title ? title.trim() : undefined,
        });

        if (mcpResult.success) {
          syncState = 'synced';
        }
      }
    }

    // Stable note identifier
    const noteId = `note_${Date.now()}_${Buffer.from(text.trim()).toString('hex').slice(0, 8)}`;

    const newNote: CRMNote = {
      id: noteId,
      accountId: account || 'All Accounts',
      kind,
      title: title ? title.trim() : (kind.toUpperCase() + ': ' + text.slice(0, 30)),
      text: text.trim(),
      createdAt: new Date().toISOString(),
      author: 'Account Manager',
      syncStatus: syncState,
    };

    await appendCRMNoteAsync(newNote);

    return NextResponse.json({
      success: true,
      note: newNote,
      mcpStatus: syncState,
      mcpError: mcpResult && !mcpResult.success ? mcpResult.error : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
