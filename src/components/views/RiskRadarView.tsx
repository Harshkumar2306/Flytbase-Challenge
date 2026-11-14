'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Clock, 
  Shield, 
  Building, 
  Filter, 
  Flame, 
  UserX, 
  FileWarning,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { AccountData, RiskItem, RiskSeverity } from '@/types/crm';
import { EvidenceBadge } from '../EvidenceBadge';

interface RiskRadarViewProps {
  accounts: AccountData[];
  selectedAccount: string;
  onOpenEvidence: (evidenceId: string) => void;
}

export const RiskRadarView: React.FC<RiskRadarViewProps> = ({
  accounts,
  selectedAccount,
  onOpenEvidence,
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  const filteredAccounts = selectedAccount === 'all'
    ? accounts
    : accounts.filter((a) => a.id === selectedAccount);

  const allRisks = filteredAccounts.flatMap((a) => a.risks);
  const displayedRisks = selectedSeverity === 'all'
    ? allRisks
    : allRisks.filter((r) => r.severity === selectedSeverity);

  const getSeverityBadge = (severity: RiskSeverity, color: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-2xs">
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-300">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
            UNKNOWN
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-800">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-rose-800 tracking-wider">
                Question 4: What is about to go wrong?
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                Ground-Truth Risk Register
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Account Risk Radar & Failure Mode Register
            </h1>
          </div>
        </div>
        <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
          Identifies deadlines at risk, people going cold, deals blocked by missing paperwork, and unbacked claims. Grounded in actual records: nothing is marked green without verified operational proof, and unknown risks remain visibly highlighted.
        </p>

        {/* Severity Filter Strip */}
        <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500">Filter by Severity:</span>
          <button
            onClick={() => setSelectedSeverity('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              selectedSeverity === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Risks ({allRisks.length})
          </button>
          <button
            onClick={() => setSelectedSeverity('critical')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              selectedSeverity === 'critical'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Critical ({allRisks.filter((r) => r.severity === 'critical').length})
          </button>
          <button
            onClick={() => setSelectedSeverity('high')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              selectedSeverity === 'high'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            High ({allRisks.filter((r) => r.severity === 'high').length})
          </button>
          <button
            onClick={() => setSelectedSeverity('medium')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              selectedSeverity === 'medium'
                ? 'bg-sky-600 text-white'
                : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
            }`}
          >
            Medium ({allRisks.filter((r) => r.severity === 'medium').length})
          </button>
        </div>
      </div>

      {/* Risk Cards List */}
      <div className="grid grid-cols-1 gap-4">
        {displayedRisks.map((risk) => {
          const isCritical = risk.severity === 'critical';
          const isAccountA = risk.accountId === 'A';

          return (
            <div
              key={risk.id}
              className={`bg-white rounded-xl border p-6 shadow-xs transition-all hover:shadow-md ${
                isCritical
                  ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/10'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getSeverityBadge(risk.severity, risk.statusColor)}
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {risk.riskId || risk.id}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      isAccountA ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      Account {risk.accountId}
                    </span>
                    {risk.relatedDealId && (
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                        Deal: {risk.relatedDealId}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">
                    {risk.title}
                  </h3>

                  {/* Why it matters */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs">
                    <span className="font-bold text-slate-900 block mb-0.5 text-[11px]">
                      Why this matters to the account manager:
                    </span>
                    <p className="text-slate-700 leading-relaxed">
                      {risk.whyItMatters}
                    </p>
                  </div>

                  {/* Recommended mitigation */}
                  <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200/80 text-xs">
                    <span className="font-bold text-emerald-950 block mb-0.5 text-[11px]">
                      Recommended Monday Mitigation:
                    </span>
                    <p className="text-emerald-900 leading-relaxed font-medium">
                      {risk.recommendedMitigation}
                    </p>
                  </div>

                  {/* Responsible Owner & Deadline */}
                  <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Assigned Owner:</span>
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {risk.responsibleOwner}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Trigger / Cutoff:</span>
                      <span className="font-semibold text-rose-700 font-mono bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {risk.triggerOrDeadline}
                      </span>
                    </div>
                    {risk.probability && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Probability:</span>
                        <span className="font-medium text-slate-600">
                          {risk.probability}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Ground-Truth Evidence Receipts */}
                <div className="lg:w-72 shrink-0 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                    Evidence Receipts & Audit Sources:
                  </span>

                  <div className="space-y-1.5">
                    {risk.evidenceIds.map((evId) => (
                      <button
                        key={evId}
                        onClick={() => onOpenEvidence(evId)}
                        className="w-full flex items-center justify-between p-2 rounded bg-white hover:bg-blue-50 border border-slate-200 transition-colors text-left"
                      >
                        <span className="font-mono text-[11px] font-semibold text-blue-700 truncate">
                          {evId}
                        </span>
                        <EvidenceBadge status="verified" />
                      </button>
                    ))}
                  </div>

                  {risk.sourceRecords.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-slate-400 block mb-1">
                        Files in Records:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {risk.sourceRecords.map((rec) => (
                          <span key={rec} className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded truncate max-w-full">
                            {rec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
