import { NextResponse } from 'next/server';
import { callTool, getRateLimitStatusAsync, getSafeToken } from '@/lib/mcp';
import { appendLiveSignalAsync, getCRMDataAsync } from '@/lib/data-store';
import { getStorageDiagnosticsAsync, getPendingNotesAsync, updateStoredNoteStatusAsync } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * Unified Background Ingestion & Dispatch Scheduler.
 * Intelligently coordinates the single 1-call-per-minute MCP rate limit quota:
 * 1. Checks if any pending notes (saved_locally_pending or pending_retry) are awaiting remote write_note.
 *    If yes: Prioritizes draining the oldest pending note! (Prevents pending notes from being starved).
 * 2. If no pending notes: Queries get_signals from Questathon MCP and ingests new events atomically.
 */
async function handleSync() {
  const token = getSafeToken();
  if (!token) {
    return NextResponse.json({
      success: false,
      error: 'AQ_TOKEN is not configured on server.',
    }, { status: 400 });
  }

  const rateCheck = await getRateLimitStatusAsync();
  if (!rateCheck.canCallNow) {
    const currentData = await getCRMDataAsync();
    return NextResponse.json({
      success: false,
      reason: 'rate_limited',
      message: `Token allows 1 call per minute. Wait ${rateCheck.secondsRemaining}s before next MCP call.`,
      retryAfterSeconds: rateCheck.secondsRemaining,
      data: currentData,
      storage: await getStorageDiagnosticsAsync(),
    });
  }

  try {
    // Priority 1: Check for pending notes awaiting remote dispatch
    const pendingNotes = await getPendingNotesAsync();

    if (pendingNotes.length > 0) {
      // Pick oldest pending note to dispatch
      const noteToSync = pendingNotes[pendingNotes.length - 1];

      const writeResult = await callTool('write_note', {
        text: noteToSync.text,
        account: noteToSync.accountId !== 'All Accounts' ? noteToSync.accountId : undefined,
        kind: noteToSync.kind,
        title: noteToSync.title,
      });

      if (writeResult.success) {
        await updateStoredNoteStatusAsync(noteToSync.id, 'synced', new Date().toISOString());
        const updatedData = await getCRMDataAsync();
        return NextResponse.json({
          success: true,
          actionTaken: 'dispatched_pending_note',
          dispatchedNoteId: noteToSync.id,
          dispatchedNoteTitle: noteToSync.title,
          remainingPendingCount: Math.max(0, pendingNotes.length - 1),
          message: `Synced pending note "${noteToSync.title}" to Questathon MCP.`,
          data: updatedData,
          storage: await getStorageDiagnosticsAsync(),
        });
      } else {
        await updateStoredNoteStatusAsync(noteToSync.id, 'pending_retry', undefined, writeResult.error);
        const currentData = await getCRMDataAsync();
        return NextResponse.json({
          success: false,
          actionTaken: 'pending_note_failed',
          dispatchedNoteId: noteToSync.id,
          remainingPendingCount: pendingNotes.length,
          error: writeResult.error || 'Failed to dispatch pending note to MCP.',
          retryAfterSeconds: writeResult.retryAfterSeconds,
          data: currentData,
          storage: await getStorageDiagnosticsAsync(),
        });
      }
    }

    // Priority 2: If no notes pending, poll get_signals
    const signalsResult = await callTool('get_signals', {});

    if (signalsResult.success && signalsResult.data) {
      const incoming = Array.isArray(signalsResult.data)
        ? signalsResult.data
        : signalsResult.data.signals || [];

      const current = await getCRMDataAsync();
      let addedCount = 0;

      for (const sig of incoming) {
        const stableId = sig.id
          ? String(sig.id)
          : (sig.signal_id
              ? String(sig.signal_id)
              : `${sig.sourceId || 'get_signals'}_${sig.timestamp || new Date().toISOString()}_${sig.account || sig.accountId || 'portfolio'}`);
        if (!stableId) continue;

        const exists = current.signals.some((s) => s.id === stableId);
        if (!exists) {
          await appendLiveSignalAsync({
            id: stableId,
            timestamp: sig.timestamp || new Date().toISOString(),
            accountId: sig.account || sig.accountId,
            dealId: sig.dealId,
            text: sig.text || sig.message || JSON.stringify(sig),
            sourceId: sig.sourceId || 'get_signals',
          });
          addedCount++;
        }
      }

      const updatedData = await getCRMDataAsync();
      return NextResponse.json({
        success: true,
        actionTaken: 'fetched_signals',
        message: addedCount > 0 
          ? `Live sync complete: ${addedCount} new signal(s) ingested from MCP.`
          : 'Live sync complete: No new signals on Questathon server.',
        newSignalsCount: addedCount,
        data: updatedData,
        storage: await getStorageDiagnosticsAsync(),
      });
    }

    const currentData = await getCRMDataAsync();
    return NextResponse.json({
      success: false,
      actionTaken: 'signals_fetch_failed',
      error: signalsResult.error || 'Failed to fetch signals from MCP.',
      retryAfterSeconds: signalsResult.retryAfterSeconds,
      data: currentData,
      storage: await getStorageDiagnosticsAsync(),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}

export async function GET() {
  return handleSync();
}

export async function POST() {
  return handleSync();
}
