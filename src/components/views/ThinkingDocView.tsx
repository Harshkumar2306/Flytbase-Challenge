'use client';

import React from 'react';
import { 
  BookOpenCheck, 
  CheckCircle2, 
  Sliders, 
  HelpCircle, 
  Cpu, 
  ShieldAlert, 
  Users, 
  Receipt,
  FileCheck
} from 'lucide-react';

export const ThinkingDocView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white">
            <BookOpenCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                System Design Document & Decision Architecture
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                1-Page Thinking Blueprint
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              FlytBase Live Account Intelligence: Decision Rules & Methodology
            </h1>
          </div>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Comprehensive specification of the underlying reasoning engine, algorithmic scoring weights, strict evidentiary boundaries, and how AI was utilized to build this manager-ready Monday CRM.
        </p>
      </div>

      {/* Section 1: What it does and for whom */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
          <Receipt className="w-5 h-5 text-blue-600" />
          <h2>1. What It Does, and For Whom</h2>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          The <strong>Live Account Intelligence CRM</strong> is built specifically for a FlytBase Account Director or Customer Success Manager stepping into two high-stakes accounts on Monday morning: <strong>Eastern Counties Police Alliance (ECPA)</strong> and <strong>Aldermoor Industrial Group</strong>.
        </p>
        <p className="text-xs text-slate-700 leading-relaxed">
          Unlike standard CRMs that store passive notes and unvetted optimistic forecasts, this system functions as an <strong>evidence-driven decision engine</strong>. It parses raw paperwork, flight logs, support tickets, and morning discovery notes through the Questathon MCP to deterministically answer the five core executive questions:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs pt-1">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">Q1: Book Value</span>
            Separates mathematically backed tranches (£731k & €140k) from unbacked claims.
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">Q2: Power Map</span>
            Distinguishes decision-makers, budget payers, blockers, and champions.
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">Q3: Monday Moves</span>
            Ranks first 3 actions with owner, due date, score, and prerequisite.
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">Q4: Risk Radar</span>
            Tracks autumn finance deadlines, unreplied emails, and failure modes.
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900 block mb-1">Q5: Blind Spots</span>
            Documents missing operational facts and who can answer each question.
          </div>
        </div>
      </div>

      {/* Section 2: How it decides: the rules */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
          <Sliders className="w-5 h-5 text-purple-600" />
          <h2>2. How It Decides: The Rules & Scoring Engine</h2>
        </div>

        <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-900 text-sm block">A. Fact Classification Standard</span>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-emerald-700 font-mono">VERIFIED:</strong> Directly grounded in an actual physical file held in FlytBase records (e.g., <code className="bg-slate-200 px-1 py-0.5 rounded">files/flight_log_force_month.csv</code>, <code className="bg-slate-200 px-1 py-0.5 rounded">files/helicopter_cost_overtime.csv</code>, signed <code className="bg-slate-200 px-1 py-0.5 rounded">contract.txt</code>).</li>
              <li><strong className="text-sky-700 font-mono">TOLD:</strong> Stated directly by an interviewed stakeholder in calls or emails. Accepted as witness testimony, but not financial truth.</li>
              <li><strong className="text-amber-700 font-mono">CLAIM:</strong> Unbacked customer aspiration or unsubstantiated claim (e.g., Stefan Roy's €1.2M savings email without calculation). Displayed strictly apart.</li>
              <li><strong className="text-rose-700 font-mono">UNKNOWN:</strong> Facts or metrics absent from all paperwork and morning notes. Never guessed or synthesized.</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-900 text-sm block">B. Deal Valuation Logic</span>
            <p>
              Pipeline is never calculated by summing nominal quotes. In ECPA, the nominal £350k contract is evaluated at <strong>£136,361</strong> based on the 14 of 18 active docks verified in flight logs. The £200k Tarn Valley expansion is evaluated at <strong>£142,302</strong> because the engineering data-flow blocker is cleared. In Aldermoor, the €140,000 baseline contract is backed, but Stefan's €1.2M claim and unaccepted pitches are isolated as <strong>€0 supported</strong>.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-900 text-sm block">C. Stakeholder Authority Rules</span>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Champion ≠ Payer:</strong> Rhys Calder is an ardent ally, but cannot commit budget because each force signs its own call-off (Fact <code className="bg-slate-200 px-1 py-0.5 rounded">rc_funding_2</code>).</li>
              <li><strong>Procurement ≠ Budget Owner:</strong> Hannah Doyle sets specifications, but requires force finance signoff (Fact <code className="bg-slate-200 px-1 py-0.5 rounded">hd_calloff_2</code>).</li>
              <li><strong>Payer Identification:</strong> Ewan Brooks holds the pen for Metro Central's finance bid; Nadia Rahman holds signoff for Aldermoor Group Finance.</li>
              <li><strong>Blocker Identification:</strong> Fatima Osei is the compliance gatekeeper whose missing DPIA blocked Tarn Valley and Norwold for 4 months.</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-900 text-sm block">D. Monday Action Prioritization Formula</span>
            <p className="font-mono text-blue-700 font-semibold">
              Action Score (0-100) = Deal Value Weight (30) + Deadline Urgency (25) + Blocker Clearance (25) + Evidence Readiness (20)
            </p>
            <p>
              Rank 1 for ECPA is delivering the verified data-flow pack to Fatima Osei (Score 95/100) because the blocker is cleared and yields £142,302 immediately. Rank 1 for Aldermoor is replying to Group Finance's unanswered renewal inquiry (Score 96/100) to protect the €140,000 contract before the 31 January 2027 expiration.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: What it does not do yet */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
          <HelpCircle className="w-5 h-5 text-amber-600" />
          <h2>3. What It Does Not Do Yet (Honest System Boundaries)</h2>
        </div>
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700 leading-relaxed">
          <li><strong>No Fabricated Win Probabilities:</strong> When historical conversion data is absent, the system explicitly displays <em>"Insufficient evidence to estimate"</em> rather than inventing artificial percentages.</li>
          <li><strong>No Inferred Dock Locations:</strong> The system does not invent which dock serial is installed at which police force or industrial plant; it flags the missing install sheets as an operational knowledge gap.</li>
          <li><strong>No Unilateral Claim Promotion:</strong> Stefan Roy's €1.2M savings email is preserved as an unbacked claim until plant finance managers supply audited guard replacement logs.</li>
          <li><strong>Rate Limit Buffering:</strong> Adheres strictly to the Questathon 1-call-per-minute rate limit. Writes are queued and cached locally if triggered within a cooldown window.</li>
        </ul>
      </div>

      {/* Section 4: How AI was used */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
          <Cpu className="w-5 h-5 text-emerald-600" />
          <h2>4. How AI Was Used in System Architecture</h2>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          AI was employed as an <strong>accelerator for deterministic full-stack synthesis</strong> rather than an unconstrained text generator:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700 leading-relaxed">
          <li><strong>Architectural Synthesis:</strong> Engineered production-grade TypeScript schemas, normalized relation graphs, and server-side MCP proxies connecting Next.js App Router to Questathon endpoints.</li>
          <li><strong>Deterministic Extraction:</strong> AI extracted and structured raw transcripts, ticket CSVs, and flight logs into verified data relations without ever hallucinating missing IDs.</li>
          <li><strong>Algorithmic Scorer:</strong> Transformed fuzzy CRM heuristics into transparent mathematical weights (Value, Urgency, Clearance, Readiness).</li>
          <li><strong>Zero Hallucination Guardrails:</strong> Every aggregate in the UI is tied to source citations with clickable audit receipts, guaranteeing 100% provenance verification.</li>
        </ul>
      </div>
    </div>
  );
};
