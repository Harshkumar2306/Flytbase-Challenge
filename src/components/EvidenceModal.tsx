'use client';

import React from 'react';
import { X, FileText, AlertTriangle, User, Hash, FileQuestion } from 'lucide-react';
import { EvidenceReference, DealCalculation } from '@/types/crm';
import { EvidenceBadge } from './EvidenceBadge';

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence?: EvidenceReference | null;
  dealCalculation?: DealCalculation | null;
  title?: string;
  requestedId?: string | null;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  isOpen,
  onClose,
  evidence,
  dealCalculation,
  title,
  requestedId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                {title || 'Evidence & Audit Receipt'}
              </h3>
              <p className="text-xs text-slate-500">
                Ground-truth provenance verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {evidence ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-slate-400" />
                  <span className="font-mono text-xs font-semibold text-slate-700">
                    Source ID: {evidence.id}
                  </span>
                </div>
                <EvidenceBadge status={evidence.factStatus} />
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Source Title / Document
                </h4>
                <p className="font-medium text-slate-800">{evidence.sourceTitle}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Exact Record Content / Excerpt
                </h4>
                <div className="p-3.5 bg-slate-50 border-l-3 border-blue-600 text-slate-800 rounded-r-md text-xs leading-relaxed max-h-60 overflow-y-auto font-mono whitespace-pre-wrap">
                  {evidence.content}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {evidence.saidBy && (
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 block">Said by:</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1 mt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {evidence.saidBy}
                    </span>
                  </div>
                )}
                {evidence.verifiedBy && (
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 block">Verified by File:</span>
                    <span className="font-mono font-medium text-emerald-700 mt-0.5 block">
                      {evidence.verifiedBy}
                    </span>
                  </div>
                )}
                {evidence.filePath && (
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200 col-span-2">
                    <span className="text-slate-500 block">Repository File Path:</span>
                    <span className="font-mono font-medium text-slate-700 mt-0.5 block truncate">
                      {evidence.filePath}
                    </span>
                  </div>
                )}
                {evidence.recordPath && (
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200 col-span-2">
                    <span className="text-slate-500 block">Paperwork Record Path:</span>
                    <span className="font-mono font-medium text-slate-700 mt-0.5 block truncate">
                      {evidence.recordPath}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : requestedId ? (
            /* Honest Source Not Found Block (NO FABRICATED DATA) */
            <div className="p-6 bg-rose-50/50 rounded-xl border border-rose-200 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 mx-auto">
                <FileQuestion className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Source Record Not Found in Repository
                </h4>
                <p className="text-xs text-rose-900 font-mono mt-1">
                  Requested Citation ID: "{requestedId}"
                </p>
                <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
                  This identifier was cited in notes or deals, but no corresponding file or fact exists in the Questathon records. Under strict system rules, no synthetic fallback text is generated.
                </p>
              </div>
            </div>
          ) : null}

          {/* Deal Calculation Breakdown */}
          {dealCalculation && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <h4 className="font-semibold text-slate-900 text-sm">
                  Calculation & Evidence Grounding
                </h4>
              </div>

              <div className="p-3 bg-slate-900 text-white rounded-lg font-mono text-xs">
                <span className="text-slate-400 block text-[10px] uppercase mb-1">
                  Formula / Classification:
                </span>
                {dealCalculation.formula}
              </div>

              <div>
                <h5 className="text-xs font-semibold text-slate-600 mb-2">
                  Inputs & Audit Sources:
                </h5>
                <div className="space-y-2">
                  {dealCalculation.inputs.map((inp, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded border border-slate-200 text-xs"
                    >
                      <div>
                        <span className="font-medium text-slate-800">{inp.label}: </span>
                        <span className="font-semibold text-blue-700">{inp.value}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {inp.sourceId}
                        </span>
                        <EvidenceBadge status={inp.factStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/70 p-3 rounded border border-amber-200 text-amber-900">
                <strong className="block text-amber-950 font-medium mb-0.5">Manager Audit Note:</strong>
                {dealCalculation.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
