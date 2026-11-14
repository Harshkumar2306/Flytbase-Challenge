'use client';

import React, { useState } from 'react';
import { 
  HelpCircle, 
  AlertCircle, 
  Search, 
  Shield, 
  Building, 
  UserCheck, 
  CheckCircle2, 
  MessageSquareShare,
  ArrowRight,
  Filter
} from 'lucide-react';
import { AccountData, KnowledgeGap } from '@/types/crm';
import { EvidenceBadge } from '../EvidenceBadge';

interface BlindSpotsViewProps {
  accounts: AccountData[];
  selectedAccount: string;
  onOpenEvidence: (evidenceId: string) => void;
}

export const BlindSpotsView: React.FC<BlindSpotsViewProps> = ({
  accounts,
  selectedAccount,
  onOpenEvidence,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredAccounts = selectedAccount === 'all'
    ? accounts
    : accounts.filter((a) => a.id === selectedAccount);

  const allGaps = filteredAccounts.flatMap((a) => a.knowledgeGaps);
  const displayedGaps = selectedCategory === 'all'
    ? allGaps
    : allGaps.filter((g) => g.category === selectedCategory);

  const getStatusBadge = (status: KnowledgeGap['status']) => {
    switch (status) {
      case 'confirmed_not_available':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
            Confirmed Not Available
          </span>
        );
      case 'not_found_in_records':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
            Not Found In Records
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
            Unknown — Verification Required
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-800">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-purple-800 tracking-wider">
                Question 5: What do you still not know?
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                Gaps & Unknowns Auditor
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Account Blind Spot & Unknowns Finder
            </h1>
          </div>
        </div>
        <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
          Honest accounting of the gaps our commercial plans rest on, why each gap matters, who can provide the missing information, and the exact question to ask. Strictly separates <span className="font-semibold text-rose-700">"Confirmed not available"</span>, <span className="font-semibold text-amber-700">"Not found in records"</span>, and <span className="font-semibold text-slate-700">"Unknown"</span> without presenting assumptions as facts.
        </p>

        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium">Filter by Category:</span>
          {['all', 'financial', 'payer', 'decision_authority', 'technical', 'compliance', 'operational'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                selectedCategory === cat
                  ? 'bg-purple-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Gaps Cards List */}
      <div className="grid grid-cols-1 gap-4">
        {displayedGaps.map((gap) => {
          const isECPA = gap.accountId === 'A';

          return (
            <div
              key={gap.id}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(gap.status)}
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      {gap.category.replace('_', ' ')}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      isECPA ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      Account {gap.accountId}
                    </span>
                    {gap.blocksDealProgression && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        BLOCKS DEAL PROGRESSION
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">
                    {gap.title}
                  </h3>

                  {/* Why it matters */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <span className="font-bold text-slate-900 block mb-0.5 text-[11px]">
                      Why this missing information matters:
                    </span>
                    <p className="text-slate-700 leading-relaxed">
                      {gap.whyItMatters}
                    </p>
                  </div>

                  {/* Recommended Question to Ask */}
                  <div className="p-3.5 bg-purple-50/70 rounded-lg border border-purple-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-purple-950 text-[11px]">
                      <MessageSquareShare className="w-3.5 h-3.5 text-purple-700" />
                      Recommended Question to Ask Stakeholder:
                    </div>
                    <p className="text-purple-900 italic font-medium">
                      "{gap.recommendedQuestion}"
                    </p>
                  </div>
                </div>

                {/* Right: Who can fill & Source receipts */}
                <div className="lg:w-80 shrink-0 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                      Who can provide this answer:
                    </span>
                    <span className="font-semibold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200 block">
                      {gap.whoCanFill}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                      Priority Level:
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded inline-block ${
                      gap.priority === 'critical'
                        ? 'bg-rose-600 text-white'
                        : gap.priority === 'high'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {gap.priority}
                    </span>
                  </div>

                  {gap.evidenceIds.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">
                        Related Records:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {gap.evidenceIds.map((evId) => (
                          <button
                            key={evId}
                            onClick={() => onOpenEvidence(evId)}
                            className="font-mono text-[10px] bg-white hover:bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded border border-slate-200 transition-colors"
                          >
                            {evId}
                          </button>
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
