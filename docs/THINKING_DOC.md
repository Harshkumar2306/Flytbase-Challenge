# FlytBase Questathon: Live Account Intelligence CRM
## One-Page Thinking Document: Decision Architecture & Operating Principles

### 1. What It Does, and For Whom
Built for a Customer Success Director or Account Executive taking over two critical enterprise accounts on Monday morning:
1. **Eastern Counties Police Alliance (ECPA):** 4 regional police forces, 35 deployed docks, preparing a 300-dock framework tender.
2. **Aldermoor Industrial Group:** 15 chemical/refinery sites, 14 docks contracted through 31 January 2027.

Instead of optimistic promises, this CRM functions as an **evidence-driven decision engine**. Connected live to the Questathon MCP, it ingests raw contracts, call logs, tickets, and flight telemetry to answer five executive questions:
- **Book Worth:** Separates executed contracts (£350k / €140k) from uncontracted morning discovery estimates (£731k), nominal caps (£2.3M / €350k), and unbacked customer claims (€1.2M savings).
- **Power Structure:** Identifies actual budget signatories, procurement gates, operational blockers, and champions.
- **Immediate Priorities:** Generates an algorithmically ranked Monday 9am action plan with owners, dates, and deal impact.
- **Risk Radar:** Audits looming failure modes (autumn budget window closure, 4-month unanswered procurement inquiries).
- **Blind Spots:** Pinpoints unrecorded operational facts, their commercial consequence, and who can answer them.

### 2. How It Decides: The Rules & Scoring Engine
- **Evidence Hierarchy:** Every fact carries a strict evidentiary badge: `VERIFIED` (held primary file: contracts, logs, dataflow packs), `TOLD` (credible stakeholder statement from call transcripts or emails), `CLAIM` (unbacked customer assertion shown strictly apart), or `UNKNOWN` (omitted from records; never fabricated).
- **Financial Provenance:** Executed baselines require signed order forms (`contract.txt`). Flight logs, benchmarks, and stakeholder interest are treated as operational blocker evidence, not commercial pricing proofs. Nominal ceilings (`worth_up_to`) are segregated from pipeline.
- **Stakeholder Authority:** Champions are never assumed to hold budget approval (e.g., Rhys Calder champions ECPA, but individual forces hold budget veto; Hannah Doyle manages specifications, not call-off funding).
- **Prioritization Formula:** Moves are ranked deterministically (0–100) using:
  $$\text{Priority Score} = \text{Deal Value Weight (30)} + \text{Deadline Urgency (25)} + \text{Blocker Clearance (25)} + \text{Evidence Readiness (20)}$$
  Top Move: Deliver engineering dataflow pack to DPO Fatima Osei to unblock £142k Tarn Valley expansion.

### 3. What It Does Not Do Yet (Honest Boundaries)
- **No Inferred Win Rates or Values:** When conversion or pricing records are missing, the CRM marks them as unbacked rather than guessing numbers.
- **No Fabricated Locations:** Omitted per-plant dock serials are flagged as high-priority blind spots rather than simulated.
- **Zero Token Bypass:** Adheres strictly to the 1-call/min rate limit using distributed atomic reservation (Vercel KV when configured, atomic file lock fallback).
- **Polling vs. Webhooks:** Ingests live signals via 65-second client-driven polling rather than server-push webhooks.

### 4. How AI Was Used
AI acted as a deterministic software engineering accelerator, not a generative content creator:
- Structured messy unstructured paperwork (emails, tickets, transcripts) into clean, type-safe schemas.
- Implemented robust Next.js 14 / TypeScript architecture, distributed rate limiting, and zero-hallucination receipt tracking.
- Synthesized operational heuristics into transparent mathematical priority rankings.
