'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  CalendarClock, 
  ShieldAlert, 
  HelpCircle, 
  Radio, 
  FileSearch, 
  NotebookPen, 
  BookOpenCheck,
  Building,
  Shield
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tabId: string) => void;
  selectedAccount: string;
  onSelectAccount: (accountId: string) => void;
  criticalRisksCount: number;
  liveSignalsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  selectedAccount,
  onSelectAccount,
  criticalRisksCount,
  liveSignalsCount,
}) => {
  const navItems = [
    { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
    { id: 'book', label: 'Book with Receipts', icon: Receipt, badge: 'Q1' },
    { id: 'power', label: 'Power Map', icon: Users, badge: 'Q2' },
    { id: 'actions', label: 'Monday Action Plan', icon: CalendarClock, badge: 'Q3' },
    { id: 'risks', label: 'Risk Radar', icon: ShieldAlert, badge: 'Q4', count: criticalRisksCount },
    { id: 'gaps', label: 'Blind Spots', icon: HelpCircle, badge: 'Q5' },
    { id: 'events', label: 'Live Events Feed', icon: Radio, count: liveSignalsCount },
    { id: 'evidence', label: 'Evidence Explorer', icon: FileSearch },
    { id: 'notes', label: 'Notes & Tasks (MCP)', icon: NotebookPen },
    { id: 'thinking', label: 'Decision Rules & AI', icon: BookOpenCheck },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-[calc(100vh-4rem)] border-r border-slate-800 shrink-0">
      {/* Account Quick Selectors */}
      <div className="p-4 border-b border-slate-800">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2 block">
          Managed Accounts
        </span>
        <div className="space-y-1.5">
          <button
            onClick={() => onSelectAccount('A')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              selectedAccount === 'A'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Shield className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              <span className="truncate">Eastern Counties Police</span>
            </div>
            <span className="text-[10px] font-mono bg-blue-900/60 px-1.5 py-0.5 rounded text-blue-200 shrink-0">
              £731k
            </span>
          </button>

          <button
            onClick={() => onSelectAccount('B')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              selectedAccount === 'B'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Building className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">Aldermoor Industrial</span>
            </div>
            <span className="text-[10px] font-mono bg-amber-900/60 px-1.5 py-0.5 rounded text-amber-200 shrink-0">
              €140k
            </span>
          </button>

          <button
            onClick={() => onSelectAccount('all')}
            className={`w-full text-center py-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors ${
              selectedAccount === 'all' ? 'text-white font-semibold underline' : ''
            }`}
          >
            Show Both Accounts Together
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-3 mb-2 block">
          Intelligence Views
        </span>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-slate-800 text-white font-semibold shadow-xs border-l-3 border-blue-500'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {item.badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {item.badge}
                  </span>
                )}
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    item.id === 'risks' ? 'bg-rose-500 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    {item.count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-slate-500 text-[11px] space-y-1">
        <div className="flex items-center justify-between">
          <span>Rate Limit:</span>
          <span className="text-slate-300 font-mono">1 call / min</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Provenance:</span>
          <span className="text-emerald-400 font-semibold">100% ID Traced</span>
        </div>
        <div className="text-[10px] text-slate-600 pt-1">
          Server-side MCP • Zero browser token leak
        </div>
      </div>
    </aside>
  );
};
