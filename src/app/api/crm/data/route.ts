import { NextResponse } from 'next/server';
import { getCRMData } from '@/lib/data-store';
import { getRateLimitStatus, getSafeToken } from '@/lib/mcp';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = getCRMData();
    const rateStatus = getRateLimitStatus();
    const hasToken = !!getSafeToken();

    // Calculate aggregated overview stats
    const totalSupportedPipelineGBP = data.accounts[0]?.supportedPipeline || 0;
    const totalNominalPipelineGBP = data.accounts[0]?.totalNominalPipeline || 0;
    const totalSupportedPipelineEUR = data.accounts[1]?.supportedPipeline || 0;
    const totalNominalPipelineEUR = data.accounts[1]?.totalNominalPipeline || 0;

    const criticalRisksCount = data.accounts.reduce(
      (acc, a) => acc + a.risks.filter((r) => r.severity === 'critical').length,
      0
    );
    const highRisksCount = data.accounts.reduce(
      (acc, a) => acc + a.risks.filter((r) => r.severity === 'high').length,
      0
    );
    const knowledgeGapsCount = data.accounts.reduce(
      (acc, a) => acc + a.knowledgeGaps.length,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        accounts: data.accounts,
        signals: data.signals,
        notes: data.notes,
        evidenceExplorer: data.evidenceExplorer,
        evidenceMap: data.allEvidenceItems,
        overview: {
          totalSupportedPipelineGBP,
          totalNominalPipelineGBP,
          totalSupportedPipelineEUR,
          totalNominalPipelineEUR,
          criticalRisksCount,
          highRisksCount,
          knowledgeGapsCount,
          liveSignalsCount: data.signals.length,
          lastSyncTimestamp: data.lastLoaded,
        },
        meta: {
          hasToken,
          rateLimit: rateStatus,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
