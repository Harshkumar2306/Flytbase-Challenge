'use client';

import React, { useState } from 'react';
import { 
  CalendarClock, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Shield, 
  Building, 
  Sliders, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  FileText,
  UserCheck
} from 'lucide-react';
import { AccountData, ActionItem } from '@/types/crm';
import { EvidenceBadge } from '../EvidenceBadge';

interface MondayActionPlanViewProps {
  accounts: AccountData[];
  selectedAccount: string;
  onOpenEvidence: (evidenceId: string) => void;
}

export const MondayActionPlanView: React.FC<MondayActionPlanViewProps> = ({
  accounts,
  selectedAccount,
  onOpenEvidence,
}) => {
  const [showAllActions, setShowAllActions] = useState<Record<string, boolean>>({
    A: false,
    B: false,
  });

  const filteredAccounts = selectedAccount === 'all'
    ? accounts
    : accounts.filter((a) => a.id === selectedAccount);

  const toggleShowAll = (accountId: string) => {
    setShowAllActions((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-blue-800 tracking-wider">
                Question 3: What do you do first?
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                Monday 9:00 AM Prioritized Playbook
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              The Ranked Monday Action Plan
            </h1>
          </div>
        </div>
        <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
          The first three moves, ranked with transparent algorithmic scoring, each with an assigned owner, grounded due date, and the specific deal it moves. No generic to-dos; every action cites its underlying blocker clearance or deadline.
        </p>

        {/* Scoring Methodology Formula Strip */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mt-4 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              Prioritization Scoring Model (Max 100 Points):
            </span>
            <span className="font-mono text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              Score = Value (30) + Urgency (25) + Blocker Clearance (25) + Evidence Readiness (20)
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-slate-600 pt-1">
            <div className="p-2 bg-white rounded border border-slate-200">
              <span className="font-bold text-slate-800 block">Deal Value (0-30 pts):</span>
              Grounded in evidenced pipeline magnitude.
            </div>
            <div className="p-2 bg-white rounded border border-slate-200">
              <span className="font-bold text-slate-800 block">Deadline Urgency (0-25 pts):</span>
              Time sensitivity to budget or contract locks.
            </div>
            <div className="p-2 bg-white rounded border border-slate-200">
              <span className="font-bold text-slate-800 block">Blocker Clearance (0-25 pts):</span>
              Whether technical/compliance gates are cleared.
            </div>
            <div className="p-2 bg-white rounded border border-slate-200">
              <span className="font-bold text-slate-800 block">Evidence Readiness (0-20 pts):</span>
              Pack/logs ready to deliver immediately.
            </div>
          </div>
        </div>
      </div>

      {/* Account Action Playbooks */}
      {filteredAccounts.map((acc) => {
        const isECPA = acc.id === 'A';
        const isShowingAll = showAllActions[acc.id];
        const displayActions = isShowingAll ? acc.allActions : acc.topActions;

        return (
          <div key={acc.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {/* Account Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  isECPA ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {isECPA ? <Shield className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">{acc.name}</h2>
                  <p className="text-[11px] text-slate-500">
                    Showing {displayActions.length} of {acc.allActions.length} prioritized actions
                  </p>
                </div>
              </div>

              {acc.allActions.length > 3 && (
                <button
                  onClick={() => toggleShowAll(acc.id)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>{isShowingAll ? 'Show Top 3 Only' : `Inspect Remaining Actions (${acc.allActions.length - 3} more)`}</span>
                  {isShowingAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Ranked Action Cards */}
            <div className="divide-y divide-slate-200">
              {displayActions.map((action) => (
                <div key={action.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Rank Indicator & Action Core */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                        action.rank === 1
                          ? 'bg-blue-600 text-white'
                          : action.rank === 2
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}>
                        #{action.rank}
                      </div>

                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">
                            {action.title}
                          </h3>
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            Deal: {action.relatedDealId}
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            action.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {action.status.toUpperCase()}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed">
                          {action.description}
                        </p>

                        {/* Owner & Date Strip */}
                        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <span className="text-slate-400">Responsible Owner:</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-900 font-semibold">
                              {action.responsibleOwner}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <span className="text-slate-400">Target Due Date:</span>
                            <span className="bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded font-mono font-semibold">
                              {action.dueDate}
                            </span>
                          </div>
                        </div>

                        {/* Rationale & Expected Result */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                            <span className="font-bold text-slate-900 block mb-0.5 text-[11px]">
                              Prioritization Rationale:
                            </span>
                            <p className="text-slate-600 text-[11px] leading-relaxed">
                              {action.reasonForPrioritization}
                            </p>
                          </div>
                          <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200/80">
                            <span className="font-bold text-emerald-950 block mb-0.5 text-[11px]">
                              Expected Outcome:
                            </span>
                            <p className="text-emerald-900 text-[11px] leading-relaxed">
                              {action.expectedOutcome}
                            </p>
                          </div>
                        </div>

                        {/* Dependency */}
                        {action.dependency && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                            <span className="font-semibold text-slate-600">Prerequisite / Dependency:</span>
                            <span className="italic">{action.dependency}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Score Breakdown & Audit Citations */}
                    <div className="lg:w-64 shrink-0 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="font-bold text-slate-800">Priority Score</span>
                        <span className="text-lg font-black text-blue-700">
                          {action.priorityScore}/100
                        </span>
                      </div>

                      {/* Factor bars */}
                      <div className="space-y-1.5 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Deal Value:</span>
                          <span className="font-mono font-semibold text-slate-700">{action.scoringFactors.dealValueWeight}/30</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Deadline Urgency:</span>
                          <span className="font-mono font-semibold text-slate-700">{action.scoringFactors.deadlineUrgency}/25</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Blocker Clearance:</span>
                          <span className="font-mono font-semibold text-slate-700">{action.scoringFactors.blockerClearance}/25</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Evidence Readiness:</span>
                          <span className="font-mono font-semibold text-slate-700">{action.scoringFactors.evidenceReadiness}/20</span>
                        </div>
                      </div>

                      {/* Evidence Citations */}
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Evidence Citations ({action.evidenceIds.length}):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {action.evidenceIds.map((evId) => (
                            <button
                              key={evId}
                              onClick={() => onOpenEvidence(evId)}
                              className="font-mono text-[10px] bg-white hover:bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded border border-slate-200 transition-colors"
                              title="Click to view evidence receipt"
                            >
                              {evId}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
