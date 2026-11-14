'use client';

import React, { useState } from 'react';
import { 
  Receipt, 
  HelpCircle, 
  ArrowUpRight, 
  Calculator, 
  FileCheck, 
  AlertCircle,
  Building,
  Shield,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { AccountData, Deal } from '@/types/crm';
import { EvidenceBadge } from '../EvidenceBadge';

interface BookWithReceiptsViewProps {
  accounts: AccountData[];
  selectedAccount: string;
  onOpenEvidence: (evidenceId: string) => void;
  onOpenCalculation: (dealId: string) => void;
}

export const BookWithReceiptsView: React.FC<BookWithReceiptsViewProps> = ({
  accounts,
  selectedAccount,
  onOpenEvidence,
  onOpenCalculation,
}) => {
  const [expandedDealId, setExpandedDealId] = useState<string | null>(null);

  const filteredAccounts = selectedAccount === 'all'
    ? accounts
    : accounts.filter((a) => a.id === selectedAccount);

  const toggleExpand = (dealId: string) => {
    setExpandedDealId(expandedDealId === dealId ? null : dealId);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-emerald-800 tracking-wider">
                Question 1: What is the book worth?
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Audited Financial Provenance
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Book with Receipts & Financial Provenance
            </h1>
          </div>
        </div>
        <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
          Financial accuracy audit: signed existing contracts are strictly separated from qualified future pipeline and speculative nominal caps. Operational flight logs and helicopter benchmarks are presented as blocker-clearance evidence rather than commercial pricing formulas.
        </p>

        {/* Global Financial Tripartite Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              1. Signed Existing Contracts
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-slate-900">£350k + €140k</span>
              <EvidenceBadge status="verified" />
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Verified by order forms (contract.txt) & paid invoices
            </p>
          </div>

          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              2. Qualified Morning Pipeline (ECPA)
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-slate-900">£731,440</span>
              <EvidenceBadge status="told" />
            </div>
            <p className="text-[10px] text-emerald-900/80 mt-0.5">
              Sum of 4 morning qualified deal valuations
            </p>
          </div>

          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
              3. Total Nominal Potential Cap
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-slate-900">£2.30M + €350k</span>
            </div>
            <p className="text-[10px] text-blue-900/80 mt-0.5">
              Maximum uncommitted opportunity caps (worth_up_to)
            </p>
          </div>

          <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
              4. Unbacked Customer Claims
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-amber-900">€1.2M Savings</span>
              <EvidenceBadge status="claim" />
            </div>
            <p className="text-[10px] text-amber-900/80 mt-0.5">
              Stefan Roy claim; [No detail received]
            </p>
          </div>
        </div>
      </div>

      {/* Account Deal Ledgers */}
      {filteredAccounts.map((acc) => {
        const isECPA = acc.id === 'A';
        const currencySymbol = isECPA ? '£' : '€';

        return (
          <div key={acc.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {/* Account Section Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  isECPA ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {isECPA ? <Shield className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-900 text-base">{acc.name}</h2>
                    <span className="text-xs font-mono text-slate-500">
                      ({acc.deals.length} deals on file)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Official Story: "{acc.officialStory}"
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">Contract Baseline</span>
                  <span className="text-slate-900 text-sm font-bold">
                    {currencySymbol}{acc.signedContractValue.toLocaleString()}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">Qualified Pipeline</span>
                  <span className="text-blue-700 text-sm font-bold">
                    {currencySymbol}{acc.supportedPipeline.toLocaleString()}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">Nominal Cap</span>
                  <span className="text-slate-400 text-sm font-bold">
                    {currencySymbol}{acc.totalNominalPipeline.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Deals Table */}
            <div className="divide-y divide-slate-200">
              {acc.deals.map((deal) => {
                const isExpanded = expandedDealId === deal.id;

                return (
                  <div key={deal.id} className="p-6 transition-colors hover:bg-slate-50/40">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Deal title & stage */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {deal.id}
                          </span>
                          <h3 className="font-bold text-slate-900 text-sm">
                            {deal.name}
                          </h3>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            deal.stage === 'cleared'
                              ? 'bg-emerald-100 text-emerald-800'
                              : deal.stage === 'qualified'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            Stage: {deal.stage}
                          </span>
                          {deal.blocker && (
                            <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              deal.blocker.status === 'cleared'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              Blocker: {deal.blocker.status.toUpperCase()}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600">
                          {deal.statusText}
                        </p>

                        {deal.deadline && (
                          <div className="text-[11px] text-amber-700 flex items-center gap-1.5 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Deadline: {deal.deadline.text}</span>
                          </div>
                        )}
                      </div>

                      {/* Values & Action Buttons */}
                      <div className="flex flex-wrap items-center gap-6 shrink-0">
                        {/* Supported value box */}
                        <div 
                          onClick={() => onOpenCalculation(deal.id)}
                          className="p-2.5 bg-slate-50 hover:bg-blue-50 rounded-lg border border-slate-200 cursor-pointer transition-colors text-right"
                          title="Click to inspect exact calculation and source IDs"
                        >
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                            {deal.supportedValue > 0 && deal.id.startsWith('b_') ? 'Contract Baseline' : 'Discovery Value'}
                          </span>
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-base font-bold text-slate-900">
                              {currencySymbol}{deal.supportedValue.toLocaleString()}
                            </span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <span className="text-[10px] text-emerald-700 font-semibold block">
                            {deal.supportedValue > 0 ? 'Receipt Backed' : '€0 supported'}
                          </span>
                        </div>

                        {/* Unbacked value box */}
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-right opacity-80">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                            Nominal Cap (worth_up_to)
                          </span>
                          <span className="text-base font-bold text-slate-500 block">
                            {currencySymbol}{deal.nominalValue.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Unbacked: {currencySymbol}{deal.unsupportedValue.toLocaleString()}
                          </span>
                        </div>

                        {/* Expand Details Button */}
                        <button
                          onClick={() => toggleExpand(deal.id)}
                          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                          title="Toggle audit receipts and calculation"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Receipt & Calculation Drawer */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-in fade-in duration-150">
                        {/* Calculation preview */}
                        {deal.calculation && (
                          <div className="p-3.5 bg-slate-900 text-slate-200 rounded-lg text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white flex items-center gap-1.5">
                                <Calculator className="w-3.5 h-3.5 text-blue-400" />
                                Deal Grounding & Evidence Standard
                              </span>
                              <button
                                onClick={() => onOpenCalculation(deal.id)}
                                className="text-[11px] text-blue-400 hover:underline"
                              >
                                View Input Receipts →
                              </button>
                            </div>
                            <div className="font-mono text-emerald-400 text-xs">
                              {deal.calculation.formula}
                            </div>
                            <p className="text-slate-400 text-[11px] leading-relaxed">
                              {deal.calculation.explanation}
                            </p>
                          </div>
                        )}

                        {/* Supporting Evidence Items */}
                        <div>
                          <span className="text-xs font-semibold text-slate-700 block mb-2">
                            Supporting Ground-Truth Records & Citations ({deal.evidenceIds.length}):
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {deal.evidenceIds.map((evId) => {
                              const ev = deal.evidenceItems.find((e) => e.id === evId);
                              return (
                                <div
                                  key={evId}
                                  onClick={() => onOpenEvidence(evId)}
                                  className="p-2.5 bg-slate-50 hover:bg-blue-50/60 rounded border border-slate-200 cursor-pointer transition-colors text-xs flex items-start justify-between gap-2"
                                >
                                  <div className="truncate">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-[10px] font-bold text-slate-700">
                                        {evId}
                                      </span>
                                      {ev?.saidBy && (
                                        <span className="text-[10px] text-slate-500">
                                          • {ev.saidBy}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                                      {ev ? `"${ev.content.slice(0, 100)}..."` : 'Source record in paperwork'}
                                    </p>
                                  </div>
                                  {ev ? <EvidenceBadge status={ev.factStatus} /> : <span className="text-[10px] text-slate-400">Record</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* What moves this deal */}
                        {deal.whatMovesIt && (
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs">
                            <span className="font-bold text-emerald-950 block mb-0.5">
                              Next Direct Action Required to Advance Deal:
                            </span>
                            <p className="text-emerald-900">{deal.whatMovesIt}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
