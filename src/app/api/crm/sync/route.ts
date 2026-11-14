import { NextResponse } from 'next/server';
import { callTool, fetchRestEndpoint, getRateLimitStatus, getSafeToken } from '@/lib/mcp';
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
    // Attempt MCP tool call get_signals
    let signalsResult = await callTool('get_signals', {});
    
    // Fallback to REST endpoint if MCP method encountered an issue
    if (!signalsResult.success) {
      signalsResult = await fetchRestEndpoint('/signals');
    }

    if (signalsResult.success && signalsResult.data) {
      const incoming = Array.isArray(signalsResult.data)
        ? signalsResult.data
        : signalsResult.data.signals || [];

      const current = getCRMData();
      let addedCount = 0;

      for (const sig of incoming) {
        const exists = current.signals.some((s) => s.id === sig.id || s.text === sig.text);
        if (!exists) {
          appendLiveSignal({
            id: sig.id || `sig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: sig.timestamp || new Date().toISOString(),
            accountId: sig.account || sig.accountId,
            dealId: sig.dealId,
            text: sig.text || sig.message || JSON.stringify(sig),
            sourceId: sig.sourceId || 'mcp_signal',
          });
          addedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: addedCount > 0 
          ? `Sync successful: ${addedCount} new signal(s) ingested.`
          : 'Sync successful: No new signals on Questathon server.',
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
