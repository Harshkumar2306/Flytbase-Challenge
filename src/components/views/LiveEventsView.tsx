'use client';

import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Shield,
  Building
} from 'lucide-react';
import { LiveSignal } from '@/types/crm';

interface LiveEventsViewProps {
  signals: LiveSignal[];
  onRefresh: () => void;
}

export const LiveEventsView: React.FC<LiveEventsViewProps> = ({
  signals,
  onRefresh,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [rateCountdown, setRateCountdown] = useState<number>(0);

  const handleManualSync = async () => {
    if (isSyncing || rateCountdown > 0) return;
    setIsSyncing(true);
    setStatusMessage('Connecting to Questathon MCP server...');

    try {
      const res = await fetch('/api/crm/sync', { method: 'POST' });
      const data = await res.json();

      if (data.retryAfterSeconds) {
        setRateCountdown(data.retryAfterSeconds);
      } else {
        setRateCountdown(61);
      }

      setStatusMessage(data.message || (data.success ? 'Sync completed' : data.error));
      onRefresh();
    } catch (err: any) {
      setStatusMessage(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (rateCountdown <= 0) return;
    const timer = setInterval(() => {
      setRateCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [rateCountdown]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-emerald-800 tracking-wider">
                  Live MCP Ingestion Engine
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  get_signals Tool
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">
                Real-Time Account Signals Feed
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleManualSync}
              disabled={isSyncing || rateCountdown > 0}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border flex items-center gap-2 transition-all shadow-xs ${
                rateCountdown > 0
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white border-transparent'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>
                {isSyncing
                  ? 'Querying MCP...'
                  : rateCountdown > 0
                  ? `Rate Limit Cooldown (${rateCountdown}s)`
                  : 'Poll get_signals Now'}
              </span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-600 max-w-3xl mt-2 leading-relaxed">
          The CRM ingests live external signals from the Questathon MCP without requiring code changes or application rebuilds. Calls are strictly throttled to respect the 1-call-per-minute token rate limit, and deduplication prevents redundant writes.
        </p>

        {statusMessage && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-medium">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Signals Feed Stream */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-sm">
            Live Stream Feed ({signals.length} recorded events)
          </h2>
          <span className="text-[11px] text-slate-500 font-mono">
            Endpoint: tools/call (get_signals)
          </span>
        </div>

        {signals.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-sm font-bold text-slate-800">
                No external signals emitted by server yet
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                The Questathon organizers emit live events during the session. Live synchronization is manual via the "Poll get_signals Now" button (or top bar "Sync MCP"), strictly enforcing the 1-call-per-minute token rate limit and preventing automated polling collisions.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {signals.map((sig, idx) => (
              <div key={sig.id || idx} className="p-6 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <span className="font-mono text-xs font-bold text-slate-700">
                        {sig.id}
                      </span>
                      {sig.accountId && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          Account {sig.accountId}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {new Date(sig.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {sig.text}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                      Source: {sig.sourceId}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
