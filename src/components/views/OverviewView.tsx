'use client';

import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  ArrowUpRight, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  TrendingUp,
  Building,
  Shield,
  FileText,
  AlertCircle
} from 'lucide-react';
import { AccountData, LiveSignal } from '@/types/crm';
import { EvidenceBadge } from '../EvidenceBadge';

interface OverviewViewProps {
  accounts: AccountData[];
  signals: LiveSignal[];
  onSelectAccount: (accountId: string) => void;
  onNavigateTab: (tabId: string) => void;
  onOpenEvidence: (evidenceId: string) => void;
  onOpenCalculation: (dealId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  accounts,
  signals,
  onSelectAccount,
  onNavigateTab,
  onOpenEvidence,
  onOpenCalculation,
}) => {
  const accountA = accounts.find((a) => a.id === 'A') || accounts[0];
  const accountB = accounts.find((a) => a.id === 'B') || accounts[1];

  const totalCriticalRisks = accounts.reduce(
    (sum, a) => sum + a.risks.filter((r) => r.severity === 'critical').length,
    0
  );
  const totalGaps = accounts.reduce((sum, a) => sum + a.knowledgeGaps.length, 0);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Manager Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-blue-700 tracking-wider">
                Monday 9:00 AM Executive Briefing
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                2 Accounts Active
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Portfolio Account Intelligence
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Deterministic, evidence-grounded view across Eastern Counties Police Alliance and Aldermoor Industrial Group. Every pound and euro cites its source file, person, or calculation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('actions')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Review Monday 9am Plan</span>
            </button>
            <button
              onClick={() => onNavigateTab('book')}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-2"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Audit Book Receipts</span>
            </button>
          </div>
        </div>

        {/* Global KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div 
            onClick={() => onNavigateTab('book')}
            className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-lg border border-slate-200/80 cursor-pointer transition-colors"
          >
            <span className="text-[11px] font-medium text-slate-500 block">
              Signed Baseline (UK + EU)
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-slate-900">£350k + €140k</span>
              <span className="text-[10px] text-emerald-600 font-semibold">Contract Verified</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Order forms & paid invoices
            </span>
          </div>

          <div 
            onClick={() => onNavigateTab('book')}
            className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-lg border border-slate-200/80 cursor-pointer transition-colors"
          >
            <span className="text-[11px] font-medium text-slate-500 block">
              Qualified Morning Pipeline
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-blue-700">£731,440</span>
              <span className="text-[10px] text-blue-600 font-semibold">4 Deals Model</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Nominal cap: £2.3M | €1.2M savings claim
            </span>
          </div>

          <div 
            onClick={() => onNavigateTab('risks')}
            className="p-3 bg-slate-50 hover:bg-rose-50/50 rounded-lg border border-slate-200/80 cursor-pointer transition-colors"
          >
            <span className="text-[11px] font-medium text-slate-500 block">
              Critical & High Risks
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-rose-600">{totalCriticalRisks} Critical</span>
              <span className="text-xs font-semibold text-amber-600">3 High</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Autumn window & Unanswered emails
            </span>
          </div>

          <div 
            onClick={() => onNavigateTab('gaps')}
            className="p-3 bg-slate-50 hover:bg-purple-50/50 rounded-lg border border-slate-200/80 cursor-pointer transition-colors"
          >
            <span className="text-[11px] font-medium text-slate-500 block">
              Documented Blind Spots
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-slate-900">{totalGaps} Gaps</span>
              <span className="text-[10px] text-purple-600 font-semibold">All Assigned</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Identified owners to question
            </span>
          </div>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account A Card */}
        {accountA && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-900 text-base">
                      {accountA.name}
                    </h2>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      Account A
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {accountA.sector} • 4 Police Forces • 35 Docks
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSelectAccount('A')}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
              >
                <span>Deep Dive</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Pipeline summary */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Supported Pipeline
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-bold text-slate-900">
                      £{accountA.supportedPipeline.toLocaleString()}
                    </span>
                    <EvidenceBadge status="verified" />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Backed by logs & cleared blockers
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Unsupported Potential
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-bold text-slate-400">
                      £{accountA.unbackedPipeline.toLocaleString()}
                    </span>
                    <EvidenceBadge status="claim" />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Speculative framework & stadium
                  </span>
                </div>
              </div>

              {/* Deals breakdown */}
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-2">
                  Active Deals & Evidence Receipts (Click value to inspect):
                </span>
                <div className="space-y-1.5">
                  {accountA.deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50/80 transition-all text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-slate-800 block truncate">
                          {deal.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            ID: {deal.id}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                            deal.stage === 'cleared' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {deal.stage.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onOpenCalculation(deal.id)}
                        className="text-right shrink-0 group"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            £{deal.supportedValue.toLocaleString()}
                          </span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          Receipt backed
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Monday Action */}
              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-600" />
                    Top Monday 9am Move:
                  </span>
                  <span className="text-[10px] font-semibold text-blue-700 bg-white px-1.5 py-0.2 rounded border border-blue-200">
                    Score: 95/100
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  {accountA.topActions[0]?.title}
                </p>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>Owner: {accountA.topActions[0]?.responsibleOwner}</span>
                  <span>Due: {accountA.topActions[0]?.dueDate}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account B Card */}
        {accountB && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-bold shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-900 text-base">
                      {accountB.name}
                    </h2>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      Account B
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {accountB.sector} • 15 Plants • 14 Docks Deployed
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSelectAccount('B')}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
              >
                <span>Deep Dive</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Pipeline summary */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Supported Baseline
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-bold text-slate-900">
                      €{accountB.supportedPipeline.toLocaleString()}
                    </span>
                    <EvidenceBadge status="verified" />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Annual contract (14 docks)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Unbacked Claims / Offers
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-bold text-slate-400">
                      €{accountB.unbackedPipeline.toLocaleString()}
                    </span>
                    <EvidenceBadge status="claim" />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    €1.2M ROI claim & idle plant pitch
                  </span>
                </div>
              </div>

              {/* Opportunities list */}
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-2">
                  Commercial Position & Blockers:
                </span>
                <div className="space-y-1.5">
                  {accountB.deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50/80 transition-all text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-slate-800 block truncate">
                          {deal.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            ID: {deal.id}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                            deal.supportedValue > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {deal.supportedValue > 0 ? 'VERIFIED ORDER' : 'UNBACKED / OFFER'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onOpenCalculation(deal.id)}
                        className="text-right shrink-0 group"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span className={`font-bold transition-colors ${
                            deal.supportedValue > 0 ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-400'
                          }`}>
                            €{deal.supportedValue.toLocaleString()}
                          </span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          {deal.supportedValue > 0 ? 'Order receipt' : '€0 supported'}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Monday Action */}
              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Top Monday 9am Move:
                  </span>
                  <span className="text-[10px] font-semibold text-amber-800 bg-white px-1.5 py-0.2 rounded border border-amber-200">
                    Score: 96/100
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  {accountB.topActions[0]?.title}
                </p>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>Owner: {accountB.topActions[0]?.responsibleOwner}</span>
                  <span>Due: {accountB.topActions[0]?.dueDate}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Signals & Alert Preview */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-bold text-slate-900 text-sm">
              Live Signals Feed (Questathon get_signals)
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('events')}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            View Feed & Sync History →
          </button>
        </div>

        {signals.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center">
            <CheckCircle2 className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700">
              No new signals on Questathon server yet.
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Sync with Questathon MCP is manual to strictly respect the 1 call per minute rate limit across instances. Click "Sync MCP" in the top bar or "Poll get_signals Now" in Live Events to pull new signals.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {signals.map((sig) => (
              <div 
                key={sig.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-800">{sig.text}</span>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                    <span>Source: {sig.sourceId}</span>
                    <span>•</span>
                    <span>{new Date(sig.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                {sig.accountId && (
                  <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    Account {sig.accountId}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
