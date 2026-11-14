# FlytBase Questathon: Live Account Intelligence CRM
## One-Page Thinking Document: Decision Architecture & Operating Principles

---

### 1. What It Does, and For Whom

The **Live Account Intelligence CRM** is built for a senior Customer Success Manager or Account Director taking over two high-stakes FlytBase customer accounts on Monday morning:
1. **Eastern Counties Police Alliance (ECPA):** 4 member forces, 35 docks commissioned, regional 300-dock framework tender in preparation.
2. **Aldermoor Industrial Group:** 15 plants, 14 docks under contract, contract expiration on 31 January 2027.

Unlike traditional CRMs that record passive notes or unvetted optimistic forecasts, this system functions as an **evidence-driven decision engine**. It connects live to the Questathon MCP, ingesting raw contracts, call logs, emails, flight CSVs, and support tickets to answer five executive questions:
1. **What is the book worth?** Strictly separates signed contract revenue (£350,000 & €140,000) from qualified future pipeline (£731,440), nominal caps, and unbacked claims (€1.2M savings claim shown apart).
2. **Who holds the power?** Delineates decision-makers, budget payers, blockers, and champions.
3. **What do you do first?** Generates an algorithmically ranked Monday 9am action plan with owners, deadlines, and dependencies.
4. **What is about to go wrong?** A risk radar tracking budget window closures, unreplied emails, and single-stakeholder fragility.
5. **What do you still not know?** A blind spot finder identifying missing operational facts, why they matter, and who can fill them.

---

### 2. How It Decides: The Rules & Scoring Engine

#### A. Fact Classification Standard
Every claim in the CRM carries an evidentiary badge:
- **`VERIFIED`:** Backed by a held file in records (e.g. `files/flight_log_force_month.csv`, `contract.txt`, `dataflow_pack.csv`).
- **`TOLD`:** Stated directly by an interviewed stakeholder in calls or emails (credible testimony, but not financial proof).
- **`CLAIM`:** Unbacked customer statement (e.g. Stefan Roy's €1.2M savings email without calculation). Displayed strictly apart.
- **`UNKNOWN`:** Facts absent from records. Never synthesized or guessed.

#### B. Deal Valuation & Financial Provenance Rules
- **Signed Existing Contracts:** Verified by executed order forms (`contract.txt`) and paid invoices (£350,000 for ECPA across 35 docks; €140,000 for Aldermoor across 14 docks).
- **Qualified Morning Discovery Estimates:** £731,440 across 4 deals represents discovery qualification modeling from the morning session, NOT booked revenue. Flight logs, engineering dataflow packs, and helicopter benchmarks are treated as operational blocker evidence, not commercial pricing proofs.
- **Nominal Opportunity Caps:** £2,300,000 (ECPA framework cap) and €350,000 (Aldermoor 35-plant fleet potential) are categorized strictly as nominal uncommitted ceilings (`worth_up_to`).
- **Unbacked Customer Claims:** In Aldermoor, Stefan Roy's €1.2M savings statement is classified strictly as an unbacked customer claim with €0 commercial deal value until supported by plant accountant audits.
- **Aldermoor Contract Baseline:** €140,000 is an existing annual contract baseline (14 docks @ €10k) expiring 31 Jan 2027, NOT a secured renewal. Renewal is actively blocked pending a plant-by-plant quote breakdown requested by Group Finance.

#### C. Stakeholder Authority Rules
- **Champion ≠ Budget Payer:** Rhys Calder is an ardent ally and operational programme lead, but cannot approve spending; each member force signs its own call-off (`rc_funding_2`).
- **Procurement ≠ Budget Owner:** Hannah Doyle manages specifications, but call-offs require individual force finance sign-off (`hd_calloff_2`).
- **Force Budget Owner:** Ewan Brooks owns Metro Central's finance bid (`eb_sign_2`).
- **Unconfirmed Renewal Authority:** Nadia Rahman is Group Finance Controller at Aldermoor; commercial renewal budget signing authority remains unconfirmed pending direct discovery (communication has been confined to unanswered shared mailbox inquiries).
- **Compliance Blocker:** Fatima Osei (DPO) holds the key to the DPIA; Tarn Valley and Norwold were stalled for 4 months awaiting data flows (`fo_needs_3`, `pj_ticket`).

#### D. Monday Action Prioritization Formula
$$\text{Priority Score (0--100)} = \text{Deal Value Weight (30)} + \text{Deadline Urgency (25)} + \text{Blocker Clearance (25)} + \text{Evidence Readiness (20)}$$
- **Rank 1 (ECPA, Score 95):** Deliver engineering data-flow pack to Fatima Osei (DPO) and Rhys Calder. Moves `a_tarn` (£142,302).
- **Rank 1 (Aldermoor, Score 96):** Reply to Group Finance shared mailbox with plant-by-plant quote breakdown before 31 January 2027 expiration. Moves `b_renewal` (€140,000).

---

### 3. What It Does Not Do Yet (Honest Boundaries)

1. **No Invented Win Probabilities:** Where conversion data is absent, the system displays *"Insufficient evidence to estimate"* rather than generating speculative percentages.
2. **No Inferred Dock Locations:** The customer success records omitted per-force and per-plant dock serial locations (flagged as high-priority blind spots).
3. **No Unilateral Claim Promotion:** Stefan Roy's €1.2M savings claim remains flagged as an unbacked customer claim until plant finance managers supply audited guard replacement logs.
4. **Distributed Storage & Rate Limiting:** Enforces Questathon's 1-call/minute limit via distributed atomic locks with conservative 61s reservation before dispatch. When `KV_REST_API_URL` is set, notes and signals persist in Vercel KV REST across serverless instances and cold starts; otherwise, atomic POSIX file staging serves as single-instance local fallback.
5. **Continuous Live-Event Ingestion:** Live sync runs via 65-second automatic background polling and manual override, updating without code changes.

---

### 4. How AI Was Used in System Architecture

AI served as a deterministic engineering accelerator rather than an open-ended generator:
- **Full-Stack Architecture:** Engineered the Next.js 14 App Router, TypeScript interfaces, and secure server-side JSON-RPC MCP proxy.
- **Deterministic Extraction:** Ingested and structured raw transcripts, ticket CSVs, and flight logs without hallucinating missing IDs.
- **Algorithmic Modeling:** Converted executive heuristics into mathematical scoring weights for task prioritization.
- **Zero-Hallucination Guardrails:** Every number in the UI links directly to source IDs and underlying calculations for full audit verification.
