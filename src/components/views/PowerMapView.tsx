'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Crown, 
  CreditCard, 
  ShieldCheck, 
  AlertOctagon, 
  Flame, 
  HelpCircle,
  Clock,
  Shield,
  Building,
  UserCheck,
  UserX,
  FileText
} from 'lucide-react';
import { AccountData, Stakeholder } from '@/types/crm';
import { EvidenceBadge } from '../EvidenceBadge';

interface PowerMapViewProps {
  accounts: AccountData[];
  selectedAccount: string;
  onOpenEvidence: (evidenceId: string) => void;
}

export const PowerMapView: React.FC<PowerMapViewProps> = ({
  accounts,
  selectedAccount,
  onOpenEvidence,
}) => {
  const [filterRole, setFilterRole] = useState<string>('all');

  const filteredAccounts = selectedAccount === 'all'
    ? accounts
    : accounts.filter((a) => a.id === selectedAccount);

  const getRelationshipBadge = (status: string) => {
    switch (status) {
      case 'ally':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">Ally</span>;
      case 'warm':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-sky-100 text-sky-800 border border-sky-300">Warm</span>;
      case 'neutral':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-300">Neutral</span>;
      case 'guarded':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">Guarded</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300">Unknown / Unmet</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-800">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-indigo-800 tracking-wider">
                Question 2: Who holds the power?
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                Authority & Blockers
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Stakeholder Power Map & Decision Matrix
            </h1>
          </div>
        </div>
        <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
          For each deal: who decides, who pays, who uses it, who could block it, and where each stands with you. Built on ground-truth rules: champions do not approve spending; procurement does not own the budget; unevidenced roles are explicitly labeled <span className="font-semibold text-rose-700 font-mono">"Unknown — confirmation required."</span>
        </p>

        {/* Role Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium">Role Matrix:</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-purple-50 text-purple-700 font-medium">
            <Crown className="w-3.5 h-3.5" />
            <span>Decision-Maker</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-medium">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Budget Payer</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Operational User</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-rose-50 text-rose-700 font-medium">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Blocker (Tech/Proc/DPIA)</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 text-amber-700 font-medium">
            <Flame className="w-3.5 h-3.5" />
            <span>Champion</span>
          </div>
        </div>
      </div>

      {/* Stakeholder Matrix per Account */}
      {filteredAccounts.map((acc) => {
        const isECPA = acc.id === 'A';

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
                    {acc.stakeholders.length} Stakeholders Profiled ({acc.stakeholders.filter(s => s.isMet).length} Met, {acc.stakeholders.filter(s => !s.isMet).length} Never Met / Critical Gaps)
                  </p>
                </div>
              </div>
            </div>

            {/* Stakeholder Cards Table */}
            <div className="divide-y divide-slate-200">
              {acc.stakeholders.map((person) => {
                return (
                  <div key={person.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      {/* Left: Person Identity & Role */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="font-bold text-slate-900 text-sm">
                            {person.name}
                          </h3>
                          <span className="font-mono text-xs text-slate-400">
                            (ID: {person.id})
                          </span>
                          {getRelationshipBadge(person.relationshipStatus)}
                          {person.isMet ? (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                              <UserCheck className="w-3 h-3" /> Met in Morning
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                              <UserX className="w-3 h-3" /> NEVER MET (CRITICAL GAP)
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-medium text-slate-700">
                          {person.title}
                        </p>

                        {/* Power Tags */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {/* Decision Maker */}
                          {person.decisionMakerStatus === true && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                              <Crown className="w-3 h-3" /> DECISION-MAKER
                            </span>
                          )}
                          {person.decisionMakerStatus === 'unknown' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-300">
                              <HelpCircle className="w-3 h-3" /> Decision Role: Confirmation Required
                            </span>
                          )}

                          {/* Payer / Budget Owner */}
                          {person.payerStatus === true && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CreditCard className="w-3 h-3" /> BUDGET OWNER / PAYER
                            </span>
                          )}
                          {person.payerStatus === false && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
                              No Budget Authority
                            </span>
                          )}
                          {person.payerStatus === 'unknown' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-300">
                              Payer: Confirmation Required
                            </span>
                          )}

                          {/* Operational User */}
                          {person.operationalUserStatus && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              <ShieldCheck className="w-3 h-3" /> OPERATIONAL USER
                            </span>
                          )}

                          {/* Blockers */}
                          {(person.technicalBlockerStatus || person.procurementBlockerStatus) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <AlertOctagon className="w-3 h-3" />
                              {person.procurementBlockerStatus ? 'COMPLIANCE / PROCUREMENT BLOCKER' : 'TECHNICAL BLOCKER'}
                            </span>
                          )}

                          {/* Champion */}
                          {person.championStatus && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Flame className="w-3 h-3" /> CHAMPION
                            </span>
                          )}
                        </div>

                        {/* Associated Deals */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                          <span className="text-slate-400 font-medium">Deals Affected:</span>
                          {person.associatedDealIds.map((did) => (
                            <span key={did} className="font-mono text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                              {did}
                            </span>
                          ))}
                        </div>

                        {/* Manager Guidance & What they need */}
                        {person.needsBeforeProgressing && (
                          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-xs mt-2">
                            <span className="font-bold text-blue-950 block mb-0.5">
                              What this stakeholder needs before progressing:
                            </span>
                            <p className="text-blue-900">{person.needsBeforeProgressing}</p>
                          </div>
                        )}

                        {person.notes && (
                          <p className="text-xs text-slate-500 italic mt-1">
                            Manager note: {person.notes}
                          </p>
                        )}
                      </div>

                      {/* Right: Last Interaction & Ground-Truth Receipts */}
                      <div className="lg:w-80 shrink-0 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                        <div>
                          <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block">
                            Last Known Contact
                          </span>
                          <span className="font-medium text-slate-800 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {person.lastInteraction || 'None on file'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block mb-1.5">
                            Supporting Ground-Truth Citations ({person.evidenceIds.length}):
                          </span>
                          <div className="space-y-1">
                            {person.evidenceIds.map((evId) => (
                              <button
                                key={evId}
                                onClick={() => onOpenEvidence(evId)}
                                className="w-full flex items-center justify-between p-1.5 rounded bg-white hover:bg-blue-50 border border-slate-200 transition-colors text-left"
                              >
                                <span className="font-mono text-[11px] text-blue-700 font-semibold truncate">
                                  {evId}
                                </span>
                                <EvidenceBadge status="told" />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold block">
                            Files in Paperwork
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {person.sourceRecords.map((rec) => (
                              <span key={rec} className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded truncate max-w-full">
                                {rec}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
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
