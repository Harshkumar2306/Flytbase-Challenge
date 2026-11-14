'use client';

import React, { useState, useEffect } from 'react';
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

  // Evidence Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeEvidence, setActiveEvidence] = useState<EvidenceReference | null>(null);
  const [activeCalculation, setActiveCalculation] = useState<DealCalculation | null>(null);
  const [modalTitle, setModalTitle] = useState<string>('Evidence Receipt');
  const [requestedCitationId, setRequestedCitationId] = useState<string | null>(null);

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
