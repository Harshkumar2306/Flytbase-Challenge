# ACCOUNT INTELLIGENCE — FlytBase Questathon CRM

An evidence-driven, manager-ready Monday Account Intelligence CRM built for the FlytBase Questathon. It ingests live customer data through the Questathon MCP, models two enterprise accounts, deterministically answers five executive questions, provides clickable audit receipts tracing every pound and euro to source files, and writes notes back through the MCP.

---

## 1. Executive Summary & Purpose

Designed for a Customer Success Manager or Account Director taking over two high-stakes accounts on Monday morning:
1. **Eastern Counties Police Alliance (ECPA):** 4 member forces, 35 docks under contract, 300-dock framework tender in preparation.
2. **Aldermoor Industrial Group:** 15 plants, 14 docks under contract, contract expiration on 31 January 2027.

Unlike traditional CRMs that store unvetted promises or optimistic sales totals, this system is an **evidence engine**:
- **Separates backed reality from unbacked claims:** £731,440 (ECPA) and €140,000 (Aldermoor) supported pipeline vs. unevidenced champion ambitions.
- **Enforces stakeholder authority boundaries:** Identifies actual budget payers, procurement gates, and technical blockers.
- **Generates prioritized Monday 9am action plans:** 3 ranked, dated, and owned moves per account based on transparent scoring.
- **Audits critical failure modes:** Tracks the closing Metro Central autumn finance bid window and unreplied Group Finance emails.
- **Documents blind spots:** Distinguishes unknown facts from confirmed unrecorded information, assigning owners to fill each gap.

---

## 2. The Five Management Answers

### Question 1: What is the book worth?
- **Signed Existing Contracts (Order Form Verified):**
  - **ECPA Baseline:** **£350,000/yr** (35 docks @ £10k/yr, verified by `doc_a_contract` and paid quarterly invoices).
  - **Aldermoor Baseline:** **€140,000/yr** (14 docks @ €10k/yr, verified by `doc_b_contract` and paid invoices).
- **Qualified Morning Discovery Pipeline:**
  - **ECPA Pipeline:** **£731,440** across 4 qualified deals:
    - `a_renewal` (£136,361): 14 of 18 active flying docks verified in flight logs (`files/flight_log_force_month.csv`, fact `km_usage_1`).
    - `a_tarn` (£142,302): Blocker cleared by SRV engineering data-flow pack (`dataflow_pack.txt`, fact `srv_dataflow`).
    - `a_westmere` (£93,217): Grounded by £1,500/hr helicopter benchmark comparison (`files/helicopter_cost_overtime.csv`, fact `eb_heli_1`).
    - `a_tender` (£359,560): Grounded by multi-force operating model qualifications (`hd_calloff_2`).
- **Nominal Opportunity Caps (worth_up_to):**
  - **ECPA:** £2,300,000 maximum framework ceiling (isolating £1,568,560 uncommitted pipeline).
  - **Aldermoor:** €350,000 full-fleet potential.
- **Unbacked Customer Claims (Shown Strictly Apart):**
  - **Aldermoor €1.2M Savings:** Stefan Roy's email claim (`email_b_savings`) is classified strictly as an unbacked customer claim contributing **€0 to supported commercial pipeline** until audited against plant guard reduction logs. Operational flight logs and helicopter benchmarks are presented as operational evidence, never confused for commercial pricing calculations.

### Question 2: Who holds the power?
- **ECPA:**
  - *Rhys Calder (Ally):* Alliance Programme Lead. Co-decider, but **cannot approve spending**; each member force signs its own call-off (`rc_funding_2`).
  - *Insp. Karen Mbeki (Ally):* Westmere Inspector. Operational user; needs 9 more trained operators to scale (`km_staff_2`).
  - *Hannah Doyle (Neutral):* Procurement Lead. Gatekeeper for 300-dock specification; requires costed operating model (`hd_calloff_2`).
  - *Ewan Brooks (Warm):* Metro Central Finance Partner. **Payer / Budget Owner**; owns the autumn finance bid (`eb_sign_2`).
  - *Fatima Osei (Warm):* Tarn Valley DPO. **Compliance Blocker**; unblocks force rollout once data-flow pack is delivered (`fo_needs_3`).
- **Aldermoor:**
  - *Stefan Roy (Neutral):* Head of Group Security. Signed original order; single point of failure risk.
  - *Beatriz Alonso (Guarded):* Plant 7 Manager. Operational user; requires multi-user night alert routing.
  - *Nadia Rahman (Group Finance):* **Budget Owner / Payer.** NEVER MET (Critical Gap). Shared mailbox halted renewal.
  - *Owen Fitch (Group IT):* Technical Blocker. NEVER MET (Critical Gap). Controls plant network access.
  - *Julian Tate (Risk & Insurance):* NEVER MET (Critical Gap). Controls insurance discount.

### Question 3: What do you do first? (Monday 9am Action Plan)
- **Scoring Formula:** `Priority Score (0-100) = Deal Value Weight (30) + Deadline Urgency (25) + Blocker Clearance (25) + Evidence Readiness (20)`
- **ECPA Rank 1 (Score 95):** Deliver engineering data-flow pack to Fatima Osei (DPO) and Rhys Calder to agree Tarn Valley launch. Owner: CSM with SRV. Due: 2026-11-18. Moves `a_tarn` (£142,302).
- **ECPA Rank 2 (Score 90):** Submit flight log evidence (14 active docks) to Rhys Calder for contract renewal. Owner: CSM. Due: 2026-11-20. Moves `a_renewal` (£136,361).
- **ECPA Rank 3 (Score 88):** Submit helicopter comparison (£1,500/hr) and shift model to Ewan Brooks before autumn window closes (8 moves left). Owner: CSM. Due: 2026-11-22. Moves `a_westmere` (£93,217).
- **Aldermoor Rank 1 (Score 96):** Reply to Group Finance shared mailbox with plant-by-plant quote breakdown to unblock renewal before 31 January 2027 expiration. Owner: CSM. Due: 2026-11-17. Moves `b_renewal` (€140,000).
- **Aldermoor Rank 2 (Score 89):** Schedule joint discovery call with Stefan Roy and Nadia Rahman (Group Finance). Owner: CSM / Account Lead. Due: 2026-11-21.
- **Aldermoor Rank 3 (Score 82):** Conduct field adoption review with Beatriz Alonso (Plant 7) on alert routing and priority support. Owner: CSM. Due: 2026-11-24.

### Question 4: What is about to go wrong? (Risk Radar)
- **Critical (ECPA):** Metro Central Autumn Finance Window Closing (8 moves left). If helicopter cost comparison is delayed, capital funding is lost for FY27.
- **Critical (Aldermoor):** Unreplied Group Finance Email (Contract expires 31 Jan 2027). Finance explicitly halted renewal until plant cost allocation is delivered.
- **High (ECPA):** 300-Dock Framework Specification Locking without a costed operating model.
- **High (Aldermoor):** Single-Point-of-Failure: entire commercial relationship rests on Stefan Roy alone.

### Question 5: What do you still not know? (Blind Spots)
- **ECPA Gap 1:** Per-force dock serial mapping (install sheets retained by field team).
- **ECPA Gap 2:** Norwold Chief Constable privacy requirements following local controversy.
- **Aldermoor Gap 1:** Identity and authority of Group Finance Controller (shared mailbox signatory).
- **Aldermoor Gap 2:** Plant-by-plant dock serial location register (install list stayed with customer).
- **Aldermoor Gap 3:** Empirical verification of Stefan Roy's €1.2M savings claim (no plant cost logs provided).

---

## 3. Technology Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Navy enterprise design system)
- **Icons:** Lucide React
- **Validation:** Zod
- **Data Persistence & Cache:** Multi-engine durable persistence (Vercel KV REST, Postgres, or atomic file store with POSIX rename staging)
- **MCP Client:** Server-side JSON-RPC 2.0 client with distributed atomic rate-limiting lock (1 call/min) and zero token leakage

---

## 4. Architecture & Security

```
Browser (Private/Incognito)
      │
      ▼ HTTP (No tokens, public client)
Next.js 14 App Router (Server-Side)
      ├── /api/crm/data   ── Reads normalized local store / cache
      ├── /api/crm/sync   ── Throttled MCP get_signals (1 call/min)
      └── /api/crm/notes  ── MCP write_note with preview confirmation
            │
            ▼ JSON-RPC 2.0 (Bearer $AQ_TOKEN server-side only)
Questathon Public MCP Endpoint (https://questathon.aihackerscollective.com/api/public/mcp)
```

### Security Standards Enforced:
1. **Zero Token in Client:** `AQ_TOKEN` is accessed strictly in server routes (`src/lib/mcp.ts`). Never exposed in browser bundles or HTML.
2. **Zero Token in Git:** `.env.local` is ignored by `.gitignore`. Zero commits contain credentials.
3. **Safe Logging:** Error handlers and loggers sanitize authorization headers and tokens.
4. **Rate Limit Protection:** Tracks request timestamps and `retry_after_seconds` to enforce 1 call per minute, avoiding 429 penalties.

---

## 5. Local Setup & Execution

### Prerequisites:
- Node.js 18+ (tested on Node 20 & 26)
- npm 9+

### 1. Clone the repository:
```bash
git clone https://github.com/Harshkumar2306/Flytbase-Challenge.git
cd Flytbase-Challenge
```

### 2. Configure Environment:
```bash
cp .env.example .env.local
```
Edit `.env.local` and insert your Questathon token:
```ini
AQ_TOKEN=your_questathon_token_here
```

### 3. Install Dependencies:
```bash
npm install
```

### 4. Run Development Server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in any browser (including Incognito/Private mode).

### 5. Production Build & Start:
```bash
npm run build
npm run start
```

---

## 6. Deployment to Vercel

The application is fully configured for zero-config Vercel deployment:
1. Push the repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Under **Environment Variables**, add:
   - **Key:** `AQ_TOKEN`
   - **Value:** `your_questathon_token_here`
4. Deploy! The production build will succeed and open without login in any private window.

---

## 7. Evidence Classification Standard

| Status | Badge | Definition |
|---|---|---|
| **VERIFIED** | Green checkmark | Backed by a physical file in records (`flight_log_force_month.csv`, `contract.txt`, `dataflow_pack.csv`). |
| **TOLD** | Sky speech bubble | Stated by a person during discovery or in emails/calls. |
| **CLAIM** | Amber warning | Customer claim without underlying audit details (e.g., €1.2M savings email). |
| **UNKNOWN** | Rose question mark | Information missing from all paperwork and discovery. |

---

## 8. Known Limitations & Honest Boundaries

1. **Dock Serial Mapping:** Customer success records omitted per-force and per-plant dock serial locations (noted as Blind Spot).
2. **Win Probabilities:** No fabricated probability percentages; the CRM states "Insufficient evidence to estimate" when empirical conversion rates are absent.
3. **Rate Pacing:** Enforces 60-second cooldowns on MCP interactions; updates are queued and stored locally if dispatched during cooldowns.

---

## 9. Hand-In Deliverables & Documents

- **Thinking Document:** [`docs/THINKING_DOC.md`](docs/THINKING_DOC.md) (One-page decision architecture, rules, and AI usage)
- **Walkthrough Video Script:** [`docs/WALKTHROUGH_VIDEO_SCRIPT.md`](docs/WALKTHROUGH_VIDEO_SCRIPT.md) (3-minute scene-by-scene script)
- **Automated Test Suite:** Run `npm test` to verify financial totals, genuine evidence ID resolution, and persistent rate limiting.
