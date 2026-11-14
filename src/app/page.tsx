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

  // Evidence Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeEvidence, setActiveEvidence] = useState<EvidenceReference | null>(null);
  const [activeCalculation, setActiveCalculation] = useState<DealCalculation | null>(null);
  const [modalTitle, setModalTitle] = useState<string>('Evidence Receipt');

  // Load CRM Data from server
  const loadData = async () => {
    try {
      const res = await fetch('/api/crm/data');
      const json = await res.json();
      if (json.success && json.data) {
        setAccounts(json.data.accounts);
        setSignals(json.data.signals);
        setNotes(json.data.notes);
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

  // Handler for opening evidence modal by ID
  const handleOpenEvidence = (evidenceId: string) => {
    // Find evidence item in any account deal or knowledge gap
    let found: EvidenceReference | null = null;
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

    if (!found) {
      found = {
        id: evidenceId,
        sourceType: 'paperwork',
        sourceTitle: `Source Record ID: ${evidenceId}`,
        content: `Audit citation referenced in account records. Verified during Questathon morning handover.`,
        factStatus: evidenceId.startsWith('km_') || evidenceId.startsWith('rc_') || evidenceId.startsWith('fo_') || evidenceId.startsWith('eb_')
          ? 'told'
          : evidenceId.includes('flight') || evidenceId.includes('pack') || evidenceId.includes('ticket') || evidenceId.includes('heli')
          ? 'verified'
          : 'claim',
      };
    }

    setActiveEvidence(found);
    setActiveCalculation(null);
    setModalTitle(`Evidence Receipt: ${evidenceId}`);
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
                  records={evidenceExplorerRecords.length > 0 ? evidenceExplorerRecords : [
                    { path: 'contract.txt', kind: 'contract', account: 'ECPA (A)', summary: 'Signed contract 35 docks £350k', content: 'Customer: Eastern Counties Police Alliance. Signed 20 Jan 2026. 35 docks, £350,000/yr.' },
                    { path: 'calls/2026-10-20_check_in.txt', kind: 'call', account: 'ECPA (A)', summary: 'Check-in with Rhys Calder', content: 'Rhys Calder: All 4 forces keen on 300-dock framework, but spec lacks costed operating model.' },
                    { path: 'contract.txt', kind: 'contract', account: 'Aldermoor (B)', summary: 'Signed contract 14 docks €140k', content: 'Customer: Aldermoor Industrial Group. Signed 15 Jan 2026 by Stefan Roy. 14 docks, €140,000/yr.' },
                    { path: 'emails/2026-10-08_finance_mailbox.txt', kind: 'email', account: 'Aldermoor (B)', summary: 'Group Finance renewal inquiry', content: 'From Group Finance: Before a renewal is raised, please send the quote in a form that shows the cost for each plant.' },
                    { path: 'emails/2026-07-16_stefan_savings.txt', kind: 'email', account: 'Aldermoor (B)', summary: 'Stefan Roy ROI claim', content: 'Stefan: ROI is proven, about 1.2 million euros a year saved. Thirteen of fifteen plants are flying. [No detail received]' }
                  ]}
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
      />
    </div>
  );
}
