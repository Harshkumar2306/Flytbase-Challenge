'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { EvidenceModal } from '@/components/EvidenceModal';
import { OverviewView } from '@/components/views/OverviewView';
import { BookWithReceiptsView } from '@/components/views/BookWithReceiptsView';
import { PowerMapView } from '@/components/views/PowerMapView';
import { MondayActionPlanView } from '@/components/views/MondayActionPlanView';
import { RiskRadarView } from '@/components/views/RiskRadarView';
import { BlindSpotsView } from '@/components/views/BlindSpotsView';
import { LiveEventsView } from '@/components/views/LiveEventsView';
import { EvidenceExplorerView } from '@/components/views/EvidenceExplorerView';
import { NotesTasksView } from '@/components/views/NotesTasksView';
import { ThinkingDocView } from '@/components/views/ThinkingDocView';
import { AccountData, EvidenceReference, DealCalculation, LiveSignal, CRMNote, EvidenceRecord } from '@/types/crm';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [signals, setSignals] = useState<LiveSignal[]>([]);
  const [notes, setNotes] = useState<CRMNote[]>([]);
  const [evidenceExplorerRecords, setEvidenceExplorerRecords] = useState<EvidenceRecord[]>([]);
  const [evidenceMap, setEvidenceMap] = useState<Record<string, EvidenceReference>>({});

  // Sync status telemetry (Priority 5: polling error visibility)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [nextSyncIn, setNextSyncIn] = useState<number | null>(null);

  // Evidence Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeEvidence, setActiveEvidence] = useState<EvidenceReference | null>(null);
  const [activeCalculation, setActiveCalculation] = useState<DealCalculation | null>(null);
  const [modalTitle, setModalTitle] = useState<string>('Evidence Receipt');
  const [requestedCitationId, setRequestedCitationId] = useState<string | null>(null);
  const hasInitialSyncedRef = useRef(false);

  // Load CRM Data from server
  const loadData = async () => {
    try {
      const res = await fetch('/api/crm/data');
      const json = await res.json();
      if (json.success && json.data) {
        setAccounts(json.data.accounts || []);
        setSignals(json.data.signals || []);
        setNotes(json.data.notes || []);
        setEvidenceExplorerRecords(json.data.evidenceExplorer || []);
        setEvidenceMap(json.data.evidenceMap || {});
      }
    } catch (err) {
      console.error('Error fetching CRM data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Automatic Live-Event Background Ingestion
    // Checks /api/crm/sync every 65 seconds (respects Questathon 1-call-per-minute rate limit)
    const runBackgroundSync = async () => {
      try {
        const res = await fetch('/api/crm/sync', { method: 'POST' });
        const json = await res.json();
        setLastSyncTime(new Date().toLocaleTimeString());
        if (json.success && json.newSignalsCount > 0) {
          // New events ingested: reload fresh state seamlessly
          setLastSyncError(null);
          loadData();
        } else if (!json.success && json.error) {
          setLastSyncError(json.error);
        } else {
          setLastSyncError(null);
        }
        // Show next permitted sync time from server
        if (json.retryAfterSeconds) {
          setNextSyncIn(json.retryAfterSeconds);
        } else {
          setNextSyncIn(65);
        }
        // Attempt to retry any pending notes opportunistically
        try {
          await fetch('/api/crm/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'retry_pending' }),
          });
        } catch (_) {}
      } catch (err: any) {
        setLastSyncTime(new Date().toLocaleTimeString());
        setLastSyncError(err.message || 'Network error');
      }
    };

    // Initial opportunistic background sync 3 seconds after initial page load (guarded against React double-mount)
    const initialSyncTimer = setTimeout(() => {
      if (!hasInitialSyncedRef.current) {
        hasInitialSyncedRef.current = true;
        runBackgroundSync();
      }
    }, 3000);

    // Continuous 65-second recurring background poll
    const syncInterval = setInterval(runBackgroundSync, 65000);

    return () => {
      clearTimeout(initialSyncTimer);
      clearInterval(syncInterval);
    };
  }, []);

  // Handler for opening genuine evidence modal by ID (NO FABRICATION)
  const handleOpenEvidence = (evidenceId: string) => {
    setRequestedCitationId(evidenceId);

    // 1. Direct O(1) lookup in real evidenceMap
    let found = evidenceMap[evidenceId] || null;

    // 2. Search inside account deals if not in top-level map
    if (!found) {
      for (const acc of accounts) {
        for (const d of acc.deals) {
          const ev = d.evidenceItems.find((e) => e.id === evidenceId);
          if (ev) {
            found = ev;
            break;
          }
        }
        if (found) break;
      }
    }

    // 3. Search in evidence explorer records by path
    if (!found) {
      const matchedRecord = evidenceExplorerRecords.find((r) => r.path === evidenceId || evidenceId.endsWith(r.path));
      if (matchedRecord) {
        found = {
          id: matchedRecord.path,
          sourceType: matchedRecord.kind as any,
          sourceTitle: `${matchedRecord.account}: ${matchedRecord.path}`,
          content: matchedRecord.content,
          factStatus: matchedRecord.kind === 'contract' || matchedRecord.kind === 'invoices' ? 'verified' : 'told',
          recordPath: matchedRecord.path,
        };
      }
    }

    // If found, display genuine record; if null, display "Source not found" (NO INVENTED CONTENT)
    setActiveEvidence(found);
    setActiveCalculation(null);
    setModalTitle(found ? `Evidence Receipt: ${evidenceId}` : `Audit Receipt Lookup: ${evidenceId}`);
    setIsModalOpen(true);
  };

  // Handler for opening deal calculation breakdown
  const handleOpenCalculation = (dealId: string) => {
    let deal = null;
    for (const acc of accounts) {
      const d = acc.deals.find((x) => x.id === dealId);
      if (d) {
        deal = d;
        break;
      }
    }

    if (deal && deal.calculation) {
      setActiveCalculation(deal.calculation);
      setActiveEvidence(null);
      setRequestedCitationId(null);
      setModalTitle(`Financial Calculation Model: ${deal.name}`);
      setIsModalOpen(true);
    }
  };

  const criticalRisksCount = accounts.reduce(
    (sum, a) => sum + a.risks.filter((r) => r.severity === 'critical').length,
    0
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Top Navigation */}
      <Navbar
        selectedAccount={selectedAccount}
        onSelectAccount={setSelectedAccount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          selectedAccount={selectedAccount}
          onSelectAccount={setSelectedAccount}
          criticalRisksCount={criticalRisksCount}
          liveSignalsCount={signals.length}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {/* Sync Status Telemetry Bar */}
          {lastSyncTime && (
            <div className={`mb-4 px-4 py-2 rounded-lg text-xs font-mono flex items-center gap-4 ${lastSyncError ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}`}>
              <span className={`w-2 h-2 rounded-full ${lastSyncError ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
              <span>Last sync: {lastSyncTime}</span>
              {lastSyncError && <span className="text-amber-700">· Error: {lastSyncError}</span>}
              {nextSyncIn !== null && <span>· Next: ~{nextSyncIn}s</span>}
              <span className="ml-auto text-slate-500">Auto-poll: 65s</span>
            </div>
          )}
          {loading ? (
            <div className="h-full flex items-center justify-center space-y-2 flex-col">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-500">
                Loading Account Intelligence Records...
              </p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              {currentTab === 'overview' && (
                <OverviewView
                  accounts={accounts}
                  signals={signals}
                  onSelectAccount={setSelectedAccount}
                  onNavigateTab={setCurrentTab}
                  onOpenEvidence={handleOpenEvidence}
                  onOpenCalculation={handleOpenCalculation}
                />
              )}

              {currentTab === 'book' && (
                <BookWithReceiptsView
                  accounts={accounts}
                  selectedAccount={selectedAccount}
                  onOpenEvidence={handleOpenEvidence}
                  onOpenCalculation={handleOpenCalculation}
                />
              )}

              {currentTab === 'power' && (
                <PowerMapView
                  accounts={accounts}
                  selectedAccount={selectedAccount}
                  onOpenEvidence={handleOpenEvidence}
                />
              )}

              {currentTab === 'actions' && (
                <MondayActionPlanView
                  accounts={accounts}
                  selectedAccount={selectedAccount}
                  onOpenEvidence={handleOpenEvidence}
                />
              )}

              {currentTab === 'risks' && (
                <RiskRadarView
                  accounts={accounts}
                  selectedAccount={selectedAccount}
                  onOpenEvidence={handleOpenEvidence}
                  evidenceMap={evidenceMap}
                />
              )}

              {currentTab === 'gaps' && (
                <BlindSpotsView
                  accounts={accounts}
                  selectedAccount={selectedAccount}
                  onOpenEvidence={handleOpenEvidence}
                />
              )}

              {currentTab === 'events' && (
                <LiveEventsView
                  signals={signals}
                  onRefresh={loadData}
                />
              )}

              {currentTab === 'evidence' && (
                <EvidenceExplorerView
                  records={evidenceExplorerRecords}
                  selectedAccount={selectedAccount}
                />
              )}

              {currentTab === 'notes' && (
                <NotesTasksView
                  notes={notes}
                  onRefresh={loadData}
                />
              )}

              {currentTab === 'thinking' && (
                <ThinkingDocView />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Reusable Evidence & Calculation Modal */}
      <EvidenceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        evidence={activeEvidence}
        dealCalculation={activeCalculation}
        title={modalTitle}
        requestedId={requestedCitationId}
      />
    </div>
  );
}
