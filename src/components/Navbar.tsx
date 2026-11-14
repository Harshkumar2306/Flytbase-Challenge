'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';

interface NavbarProps {
  selectedAccount: string;
  onSelectAccount: (accountId: string) => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedAccount,
  onSelectAccount,
  onSearchChange,
  searchQuery,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [rateCountdown, setRateCountdown] = useState<number>(0);

  // Poll or check sync status
  const handleSync = async () => {
    if (isSyncing || rateCountdown > 0) return;
    setIsSyncing(true);
    setSyncMessage('Calling Questathon MCP get_signals...');

    try {
      const res = await fetch('/api/crm/sync', { method: 'POST' });
      const data = await res.json();

      if (data.retryAfterSeconds) {
        setRateCountdown(data.retryAfterSeconds);
      } else {
        setRateCountdown(61);
      }

      setSyncMessage(data.message || (data.success ? 'Sync completed' : data.error));
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      setSyncMessage(`Sync failed: ${err.message}`);
      setTimeout(() => setSyncMessage(null), 4000);
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
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-6 h-16">
        {/* Brand & Account Selector */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-navy-900 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              AI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-sm">
                  ACCOUNT INTELLIGENCE
                </span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  FlytBase Questathon
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Ground-Truth Evidence CRM & Monday Decision Engine
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200" />

          {/* Account Dropdown */}
          <div className="relative">
            <select
              value={selectedAccount}
              onChange={(e) => onSelectAccount(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs hover:bg-slate-100 transition-colors"
            >
              <option value="all">Global Overview (Both Accounts)</option>
              <option value="A">Eastern Counties Police Alliance (4 Forces / £731k)</option>
              <option value="B">Aldermoor Industrial Group (14 Docks / €140k)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Global Search & Sync Controls */}
        <div className="flex items-center gap-4">
          {/* Search Box */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search facts, IDs, deals, people..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-all"
            />
          </div>

          {/* Sync & Rate Limit Badge */}
          <div className="flex items-center gap-2">
            <div 
              title="Questathon MCP connection is active with 1-call-per-minute rate limiting."
              className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-md text-[11px] font-medium text-emerald-800"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>MCP Connected</span>
            </div>

            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing || rateCountdown > 0}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md border transition-all shadow-2xs ${
                rateCountdown > 0
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 active:scale-95'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
              <span>
                {isSyncing 
                  ? 'Syncing...' 
                  : rateCountdown > 0 
                  ? `Wait ${rateCountdown}s` 
                  : 'Sync MCP'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncMessage && (
        <div className="bg-blue-600 text-white text-xs px-6 py-1 flex items-center justify-between transition-all">
          <span>{syncMessage}</span>
          <span className="text-[10px] opacity-80">1 call/min limit enforced</span>
        </div>
      )}
    </header>
  );
};
