'use client';

import React, { useState } from 'react';
import { 
  FileSearch, 
  Search, 
  Filter, 
  FileText, 
  ExternalLink, 
  Copy, 
  Check, 
  Shield, 
  Building,
  Hash
} from 'lucide-react';
import { EvidenceRecord } from '@/types/crm';

interface EvidenceExplorerViewProps {
  records: EvidenceRecord[];
  selectedAccount: string;
}

export const EvidenceExplorerView: React.FC<EvidenceExplorerViewProps> = ({
  records,
  selectedAccount,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKind, setSelectedKind] = useState<string>('all');
  const [activeRecord, setActiveRecord] = useState<EvidenceRecord | null>(records[0] || null);
  const [copied, setCopied] = useState(false);

  const kinds = ['all', ...Array.from(new Set(records.map((r) => r.kind)))];

  const filtered = records.filter((r) => {
    if (selectedAccount !== 'all') {
      const matchA = selectedAccount === 'A' && r.account.includes('(A)');
      const matchB = selectedAccount === 'B' && r.account.includes('(B)');
      if (!matchA && !matchB) return false;
    }
    if (selectedKind !== 'all' && r.kind !== selectedKind) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const inPath = r.path.toLowerCase().includes(term);
      const inSummary = r.summary.toLowerCase().includes(term);
      const inContent = r.content.toLowerCase().includes(term);
      return inPath || inSummary || inContent;
    }
    return true;
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800">
            <FileSearch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-blue-800 tracking-wider">
                Audited Paperwork Repository
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                {records.length} Documents on File
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Evidence Explorer & Paperwork Records
            </h1>
          </div>
        </div>
        <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
          Full audit repository of customer records: contracts, call transcripts, email threads, support tickets, flight CSVs, and internal notes. Search any phrase to verify what FlytBase was told before and during handover.
        </p>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in records, contracts, transcripts, tickets, quotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 capitalize"
            >
              {kinds.map((k) => (
                <option key={k} value={k}>
                  Type: {k.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Explorer Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Document List (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col h-[650px]">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">
              Matching Records ({filtered.length})
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Click to view source
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No paperwork records match the current filter or search.
              </div>
            ) : (
              filtered.map((rec) => {
                const isSelected = activeRecord?.path === rec.path && activeRecord?.account === rec.account;
                return (
                  <button
                    key={`${rec.account}-${rec.path}`}
                    onClick={() => setActiveRecord(rec)}
                    className={`w-full text-left p-3.5 transition-all text-xs flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-800 truncate">
                        {rec.path}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        {rec.kind}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-500 truncate">
                      {rec.account}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Document Viewer (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col h-[650px]">
          {activeRecord ? (
            <>
              {/* Document Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700">
                      {activeRecord.path}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      {activeRecord.kind}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Account: {activeRecord.account}
                  </p>
                </div>

                <button
                  onClick={() => handleCopy(activeRecord.content)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-slate-700 shadow-2xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Record'}</span>
                </button>
              </div>

              {/* Document Body */}
              <div className="flex-1 p-6 overflow-y-auto bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed selection:bg-blue-600 selection:text-white">
                <pre className="whitespace-pre-wrap font-mono text-xs">
                  {activeRecord.content}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              Select a record on the left to inspect its raw text.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
