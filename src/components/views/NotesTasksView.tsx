'use client';

import React, { useState } from 'react';
import { 
  NotebookPen, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  ShieldAlert, 
  CalendarClock,
  Eye,
  Check,
  X
} from 'lucide-react';
import { CRMNote } from '@/types/crm';

interface NotesTasksViewProps {
  notes: CRMNote[];
  onRefresh: () => void;
}

export const NotesTasksView: React.FC<NotesTasksViewProps> = ({
  notes,
  onRefresh,
}) => {
  const [account, setAccount] = useState<'A' | 'B' | ''>('A');
  const [kind, setKind] = useState<'note' | 'task' | 'risk' | 'next_step'>('next_step');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [filterSync, setFilterSync] = useState<'all' | 'synced' | 'pending'>('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string;
  } | null>(null);

  const syncedNotes = notes.filter((n) => n.syncStatus === 'synced');
  const pendingNotes = notes.filter((n) => n.syncStatus !== 'synced');
  const displayedNotes = filterSync === 'synced'
    ? syncedNotes
    : filterSync === 'pending'
    ? pendingNotes
    : notes;

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setFeedback({ type: 'error', message: 'Note text cannot be empty.' });
      return;
    }
    setFeedback(null);
    setShowConfirmModal(true);
  };

  const handleConfirmedSubmit = async () => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/crm/notes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          account: account || undefined,
          kind,
          title: title.trim() || undefined,
          text: text.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setFeedback({
          type: 'success',
          message: data.mcpStatus === 'synced'
            ? 'Success: Note written to Questathon MCP server and saved to local journal.'
            : 'Success: Note saved to local journal (MCP sync will complete on next permitted minute).',
          details: data.mcpError ? `MCP Note: ${data.mcpError}` : undefined,
        });
        setText('');
        setTitle('');
        setShowConfirmModal(false);
        onRefresh();
      } else {
        setFeedback({
          type: 'error',
          message: `Submission failed: ${data.error || 'Unknown error'}`,
        });
        setShowConfirmModal(false);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Network error: ${err.message}`,
      });
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800">
            <NotebookPen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-blue-800 tracking-wider">
                Two-Way MCP Action Writer
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                write_note Tool
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Write Back to Questathon MCP
            </h1>
          </div>
        </div>
        <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
          Record observations, assign follow-up tasks, log discovered risks, or set next steps directly into the Questathon database via the <span className="font-mono font-semibold text-slate-800">write_note</span> tool. Includes preview verification before remote dispatch and enforces 1-call-per-minute pacing.
        </p>

        {feedback && (
          <div className={`mt-4 p-4 rounded-xl border text-xs font-medium flex items-start gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p>{feedback.message}</p>
              {feedback.details && (
                <p className="text-[11px] opacity-80 mt-0.5 font-mono">{feedback.details}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Form (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h2 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <NotebookPen className="w-4 h-4 text-blue-600" />
            <span>Compose Manager Entry</span>
          </h2>

          <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
            {/* Account Selector */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Account:
              </label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="A">Account A: Eastern Counties Police Alliance</option>
                <option value="B">Account B: Aldermoor Industrial Group</option>
                <option value="">Global / Unassigned</option>
              </select>
            </div>

            {/* Note Kind Selector */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Entry Kind (Supported by Questathon Schema):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['next_step', 'task', 'risk', 'note'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`py-2 px-3 rounded-lg border text-left text-xs font-semibold capitalize transition-all ${
                      kind === k
                        ? 'bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {k.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Title / Subject (Optional):
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Schedule discovery with Nadia Rahman"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Detailed Note Text (Required):
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                required
                placeholder="Enter complete description, owner, deadlines, or discovered evidence..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Eye className="w-4 h-4" />
              <span>Preview & Confirm Dispatch</span>
            </button>
          </form>
        </div>

        {/* Right: Notes History (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col h-[560px]">
          <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                Notes & Tasks Journal ({notes.length})
              </h2>
              <span className="text-[10px] text-slate-500">
                {syncedNotes.length} confirmed remote • {pendingNotes.length} locally saved
              </span>
            </div>

            {/* Sync Filter Toggle */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setFilterSync('all')}
                className={`px-2 py-1 rounded transition-colors ${filterSync === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                All ({notes.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterSync('synced')}
                className={`px-2 py-1 rounded transition-colors ${filterSync === 'synced' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-800 hover:text-emerald-950'}`}
              >
                Confirmed Synced ({syncedNotes.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterSync('pending')}
                className={`px-2 py-1 rounded transition-colors ${filterSync === 'pending' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-800 hover:text-amber-950'}`}
              >
                Pending ({pendingNotes.length})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-6 space-y-4">
            {displayedNotes.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No notes in this view. Use the form on the left to record updates.
              </div>
            ) : (
              displayedNotes.map((n) => (
                <div key={n.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        n.kind === 'next_step'
                          ? 'bg-blue-100 text-blue-800'
                          : n.kind === 'task'
                          ? 'bg-purple-100 text-purple-800'
                          : n.kind === 'risk'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-200 text-slate-800'
                      }`}>
                        {n.kind.replace('_', ' ')}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {n.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {n.syncStatus === 'synced' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Remote Synced (MCP)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Locally Saved / Pending
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {new Date(n.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-700 leading-relaxed">
                    {n.text}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 font-mono">
                    <span>Account: {n.accountId}</span>
                    <span>Author: {n.author}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                Confirm Write to Questathon MCP
              </h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                You are about to dispatch an audited update to the Questathon public MCP server. Please verify the payload details:
              </p>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Account:</span>
                  <span className="font-semibold text-slate-800">
                    {account ? `Account ${account}` : 'All Accounts'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Entry Kind:</span>
                  <span className="font-bold uppercase text-blue-700 font-mono">
                    {kind}
                  </span>
                </div>
                {title && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Title:</span>
                    <span className="font-medium text-slate-800">{title}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 block mb-1">Payload Content:</span>
                  <p className="p-2.5 bg-white rounded border border-slate-200 text-slate-900 font-mono text-[11px] leading-relaxed">
                    {text}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting to MCP...' : 'Confirm & Write to MCP'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
