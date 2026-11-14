import { NextResponse } from 'next/server';
import { callTool, getRateLimitStatus, getSafeToken } from '@/lib/mcp';
import { appendLiveSignal, getCRMData } from '@/lib/data-store';

export const dynamic = 'force-dynamic';

export async function POST() {
  const token = getSafeToken();
  if (!token) {
    return NextResponse.json({
      success: false,
      error: 'AQ_TOKEN is not configured on server.',
    }, { status: 400 });
  }

  const rateCheck = getRateLimitStatus();
  if (!rateCheck.canCallNow) {
    return NextResponse.json({
      success: false,
      message: `Token allows 1 call per minute. Wait ${rateCheck.secondsRemaining}s before syncing again.`,
      retryAfterSeconds: rateCheck.secondsRemaining,
      data: getCRMData(),
    });
  }

  try {
    // Attempt MCP tool call get_signals. No immediate REST fallback to prevent violating 1 call/min rule!
    const signalsResult = await callTool('get_signals', {});

    if (signalsResult.success && signalsResult.data) {
      const incoming = Array.isArray(signalsResult.data)
        ? signalsResult.data
        : signalsResult.data.signals || [];

      const current = getCRMData();
      let addedCount = 0;

      for (const sig of incoming) {
        // Derive stable ID from signal attributes (never random UUID)
        const stableId = String(sig.id || sig.signal_id || (sig.text ? `sig_${Buffer.from(sig.text).toString('hex').slice(0, 16)}` : ''));
        if (!stableId) continue;

        const exists = current.signals.some((s) => s.id === stableId);
        if (!exists) {
          appendLiveSignal({
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

      return NextResponse.json({
        success: true,
        message: addedCount > 0 
          ? `Manual sync complete: ${addedCount} new signal(s) ingested from MCP.`
          : 'Manual sync complete: No new signals on Questathon server.',
        newSignalsCount: addedCount,
        data: getCRMData(),
      });
    }

    return NextResponse.json({
      success: false,
      error: signalsResult.error || 'Failed to fetch signals from MCP.',
      retryAfterSeconds: signalsResult.retryAfterSeconds,
      data: getCRMData(),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
