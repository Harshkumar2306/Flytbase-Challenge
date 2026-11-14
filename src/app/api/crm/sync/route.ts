import { NextResponse } from 'next/server';
import { callTool, getRateLimitStatusAsync, getSafeToken } from '@/lib/mcp';
import { appendLiveSignalAsync, getCRMDataAsync } from '@/lib/data-store';
import { getStorageDiagnostics } from '@/lib/storage';

export const dynamic = 'force-dynamic';

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
      message: `Token allows 1 call per minute. Wait ${rateCheck.secondsRemaining}s before syncing again.`,
      retryAfterSeconds: rateCheck.secondsRemaining,
      data: currentData,
      storage: getStorageDiagnostics(),
    });
  }

  try {
    // Attempt MCP tool call get_signals. No immediate REST fallback to prevent violating 1 call/min rule!
    const signalsResult = await callTool('get_signals', {});

    if (signalsResult.success && signalsResult.data) {
      const incoming = Array.isArray(signalsResult.data)
        ? signalsResult.data
        : signalsResult.data.signals || [];

      const current = await getCRMDataAsync();
      let addedCount = 0;

      for (const sig of incoming) {
        // Prefer actual stable source ID or composite key with timestamp & source
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
        message: addedCount > 0 
          ? `Live sync complete: ${addedCount} new signal(s) ingested from MCP.`
          : 'Live sync complete: No new signals on Questathon server.',
        newSignalsCount: addedCount,
        data: updatedData,
        storage: getStorageDiagnostics(),
      });
    }

    const currentData = await getCRMDataAsync();
    return NextResponse.json({
      success: false,
      error: signalsResult.error || 'Failed to fetch signals from MCP.',
      retryAfterSeconds: signalsResult.retryAfterSeconds,
      data: currentData,
      storage: getStorageDiagnostics(),
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
