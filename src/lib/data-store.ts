import fs from 'fs';
import path from 'path';
import { 
  AccountData, 
  Deal, 
  Stakeholder, 
  ActionItem, 
  RiskItem, 
  KnowledgeGap, 
  EvidenceReference, 
  LiveSignal, 
  CRMNote,
  EvidenceRecord,
  FactStatus 
} from '@/types/crm';

// Path helpers
const DATA_DIR = path.join(process.cwd(), 'data');

function readJsonFile<T = any>(filename: string, fallback: T): T {
  try {
    const fullPath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(fullPath)) return fallback;
    const content = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return fallback;
  }
}

// In-memory cache for fast renders
let cachedCRMData: {
  accounts: AccountData[];
  signals: LiveSignal[];
  notes: CRMNote[];
  evidenceExplorer: EvidenceRecord[];
  allEvidenceItems: Record<string, EvidenceReference>;
  lastLoaded: number;
} | null = null;

export function loadNormalizedCRMData() {
  const exportData = readJsonFile<any>('export_raw.json', { accounts: [], files: [] });
  const paperworkA = readJsonFile<any>('paperwork_A.json', { records: [] });
  const paperworkB = readJsonFile<any>('paperwork_B.json', { records: [] });
  const teamData = readJsonFile<any>('flytbase_team.json', { people: [] });
  const signalsData = readJsonFile<any>('signals.json', { signals: [] });
  const notesData = readJsonFile<any>('notes.json', { notes: [] });

  // Map of all known evidence items
  const evidenceMap: Record<string, EvidenceReference> = {};

  // Register all facts from Account A
  const rawFactsA: any[] = exportData.accounts?.[0]?.facts || [];
  rawFactsA.forEach((f: any) => {
    evidenceMap[f.id] = {
      id: f.id,
      sourceType: f.status === 'verified' ? 'file' : 'person',
      sourceTitle: `Fact ${f.id} (${f.said_by})`,
      content: f.text,
      factStatus: f.status,
      saidBy: f.said_by,
      verifiedBy: f.verified_by,
      learnedAtMinute: f.learned_at_minute,
    };
  });

  // Register files from Account A
  evidenceMap['flight_log_force_month'] = {
    id: 'flight_log_force_month',
    sourceType: 'file',
    sourceTitle: 'Flight Log Force Month (files/flight_log_force_month.csv)',
    content: 'Operational flight logs verifying 14 of 18 docks active in Westmere & Metro Central.',
    factStatus: 'verified',
    filePath: 'files/flight_log_force_month.csv',
  };

  evidenceMap['helicopter_cost_overtime'] = {
    id: 'helicopter_cost_overtime',
    sourceType: 'file',
    sourceTitle: 'Helicopter Cost Overtime (files/helicopter_cost_overtime.csv)',
    content: 'All-in benchmark £1,500/hr helicopter cost vs drone operational overtime model.',
    factStatus: 'verified',
    filePath: 'files/helicopter_cost_overtime.csv',
  };

  evidenceMap['dataflow_pack'] = {
    id: 'dataflow_pack',
    sourceType: 'file',
    sourceTitle: 'Dataflow Pack (files/dataflow_pack.csv)',
    content: 'Technical data flow specifications, retention periods, video storage locations and access controls.',
    factStatus: 'verified',
    filePath: 'files/dataflow_pack.csv',
  };

  evidenceMap['support_ticket_history'] = {
    id: 'support_ticket_history',
    sourceType: 'file',
    sourceTitle: 'Support Ticket History (files/support_ticket_history.csv)',
    content: 'Ticket log showing unanswered Tarn Valley DPIA request from 4 months prior.',
    factStatus: 'verified',
    filePath: 'files/support_ticket_history.csv',
  };

  // Register Account A Paperwork Records
  evidenceMap['doc_a_contract'] = {
    id: 'doc_a_contract',
    sourceType: 'contract',
    sourceTitle: 'ECPA Signed Order Form (contract.txt)',
    content: 'Signed 20 Jan 2026. £350,000/yr for 35 docks. Term: 1 Mar 2026 to 28 Feb 2027. Invoiced in 4 parts. Paid.',
    factStatus: 'verified',
    recordPath: 'contract.txt',
  };

  evidenceMap['doc_a_invoices'] = {
    id: 'doc_a_invoices',
    sourceType: 'paperwork',
    sourceTitle: 'ECPA Invoice Records (invoices.json)',
    content: 'Pilot fee £30,000 credited against Year 1. Year 1 invoiced in 4 parts across member forces. All paid.',
    factStatus: 'verified',
    recordPath: 'invoices.json',
  };

  evidenceMap['doc_a_profile'] = {
    id: 'doc_a_profile',
    sourceType: 'paperwork',
    sourceTitle: 'ECPA Account Profile (profile.json)',
    content: 'Public safety sector. 35 docks across 4 forces. Lead contact: Rhys Calder.',
    factStatus: 'verified',
    recordPath: 'profile.json',
  };

  // Register Account B Records
  evidenceMap['doc_b_contract'] = {
    id: 'doc_b_contract',
    sourceType: 'contract',
    sourceTitle: 'Aldermoor Signed Order Form (contract.txt)',
    content: 'Signed 15 Jan 2026 by Stefan Roy. 14 docks at €140,000/yr. Term: 1 Feb 2026 to 31 Jan 2027. Paid.',
    factStatus: 'verified',
    recordPath: 'contract.txt',
  };

  evidenceMap['doc_b_invoices'] = {
    id: 'doc_b_invoices',
    sourceType: 'paperwork',
    sourceTitle: 'Aldermoor Invoice Ledger (invoices.json)',
    content: 'INV-25-1012 trial fee €12,000 paid. INV-26-0204 first year €128,000 paid to group security.',
    factStatus: 'verified',
    recordPath: 'invoices.json',
  };

  evidenceMap['email_b_finance'] = {
    id: 'email_b_finance',
    sourceType: 'email',
    sourceTitle: 'Group Finance Unsigned Email (emails/2026-10-08_finance_mailbox.txt)',
    content: 'From Group Finance (shared mailbox): "Before a renewal is raised, please send the quote in a form that shows the cost for each plant." No reply on file.',
    factStatus: 'told',
    recordPath: 'emails/2026-10-08_finance_mailbox.txt',
  };

  evidenceMap['email_b_savings'] = {
    id: 'email_b_savings',
    sourceType: 'email',
    sourceTitle: 'Stefan Roy ROI Claim (emails/2026-07-16_stefan_savings.txt)',
    content: 'From Stefan Roy: "ROI is proven, about 1.2 million euros a year saved. Thirteen of fifteen plants are flying. [No detail received]"',
    factStatus: 'claim',
    saidBy: 'Stefan Roy',
    recordPath: 'emails/2026-07-16_stefan_savings.txt',
  };

  evidenceMap['email_b_case_study'] = {
    id: 'email_b_case_study',
    sourceType: 'email',
    sourceTitle: 'Stefan Roy 40-Plant Sister Company Request (emails/2026-09-22_stefan_case_study.txt)',
    content: 'From Stefan Roy: "I want a case study for our sister company. They have 40 plants and they are watching what we do here. Two pages, headline saving on front."',
    factStatus: 'told',
    saidBy: 'Stefan Roy',
    recordPath: 'emails/2026-09-22_stefan_case_study.txt',
  };

  evidenceMap['ticket_b_beatriz'] = {
    id: 'ticket_b_beatriz',
    sourceType: 'ticket',
    sourceTitle: 'Beatriz Alonso Alert Routing Ticket FB-10944 (emails/2026-09-18_beatriz_alerts.txt)',
    content: 'Beatriz Alonso requested alerts for Plant 7 to go to multiple people. Support desk sent standard settings guide and closed ticket without asking why.',
    factStatus: 'told',
    saidBy: 'Beatriz Alonso',
    recordPath: 'emails/2026-09-18_beatriz_alerts.txt',
  };

  // -------------------------------------------------------------
  // ACCOUNT A: Eastern Counties Police Alliance
  // -------------------------------------------------------------
  const dealsA: Deal[] = [
    {
      id: 'a_renewal',
      accountId: 'A',
      name: 'Renew the alliance contract (35 docks)',
      currency: 'GBP',
      nominalValue: 350000,
      supportedValue: 136361,
      unsupportedValue: 213639,
      stage: 'qualified',
      statusText: 'Qualified — Evidence held; proposal pending delivery to Rhys Calder',
      blocker: {
        text: 'Nobody can show which forces actually use the docks',
        status: 'open',
      },
      deadline: {
        text: 'Existing contract expires 28 February 2027. Early renewal required by December.',
        soon: false,
        passed: false,
      },
      evidenceIds: ['rc_appetite_0', 'rc_appetite_2', 'km_usage_1', 'km_value_2', 'flight_log_force_month', 'doc_a_contract'],
      evidenceItems: [],
      calculation: {
        formula: 'Active Operational Utilization Ratio × Baseline Annual Contract Value',
        inputs: [
          { label: 'Baseline Contract Value', value: '£350,000/yr', sourceId: 'doc_a_contract', factStatus: 'verified' },
          { label: 'Active Operational Docks', value: '14 of 18 flying docks (Westmere & Metro Central active; Tarn Valley & Norwold inactive)', sourceId: 'km_usage_1', factStatus: 'verified' },
          { label: 'Supported Allocation', value: '£136,361 (38.96% active verified force baseline)', sourceId: 'flight_log_force_month', factStatus: 'verified' },
          { label: 'Unbacked Renewal Portion', value: '£213,639 (unverified idle forces awaiting signoff)', sourceId: 'rc_appetite_2', factStatus: 'told' },
        ],
        explanation: 'Of the 35 docks under contract, 14 docks are operationally flying in Westmere and Metro Central as verified by flight logs. The £136,361 value is strictly supported by active force usage proof, while £213,639 remains unbacked until inactive forces resolve blockers.',
      },
      stakeholders: [
        { personId: 'rhys_calder', role: 'champion', details: 'Alliance drone programme lead; owns the contract renewal relationship' },
        { personId: 'hannah_doyle', role: 'blocker', details: 'Procurement lead; requires compliant force usage justification' },
      ],
      whatMovesIt: 'Send Rhys Calder a proposal with exactly flight_log_force_month and km_usage_1.',
    },
    {
      id: 'a_tarn',
      accountId: 'A',
      name: 'Tarn Valley and Norwold go live',
      currency: 'GBP',
      nominalValue: 200000,
      supportedValue: 142302,
      unsupportedValue: 57698,
      stage: 'cleared',
      statusText: 'Blocker cleared — Ready for agreement meeting with Fatima Osei & Rhys Calder',
      blocker: {
        text: 'The DPIA cannot be signed without the data-flow documents FlytBase never sent',
        status: 'cleared',
        clearedEvidenceId: 'srv_dataflow',
      },
      deadline: {
        text: 'DPO requires 3 weeks once data-flow pack is delivered to complete DPIA before force launch.',
        soon: true,
        passed: false,
      },
      evidenceIds: ['rc_appetite_2', 'km_others_2', 'fo_dpia_2', 'fo_needs_3', 'pj_ticket', 'srv_dataflow', 'support_ticket_history', 'dataflow_pack'],
      evidenceItems: [],
      calculation: {
        formula: 'Cleared Force Expansion Value (Tarn Valley & Norwold rollout)',
        inputs: [
          { label: 'Nominal Value Potential', value: '£200,000', sourceId: 'rc_appetite_2', factStatus: 'told' },
          { label: 'Supported Qualified Base', value: '£142,302', sourceId: 'srv_dataflow', factStatus: 'verified' },
          { label: 'Contingent Launch Reserve', value: '£57,698', sourceId: 'fo_needs_3', factStatus: 'told' },
        ],
        explanation: 'SRV (Director of Engineering) confirmed the data-flow security pack can be delivered in one week. Fatima Osei confirmed completion within 3 weeks upon receipt, unlocking Tarn Valley and allowing Norwold to mirror the DPIA.',
      },
      stakeholders: [
        { personId: 'fatima_osei', role: 'blocker', details: 'DPO at Tarn Valley; needs data flows, retention periods and video storage specs' },
        { personId: 'rhys_calder', role: 'decision_maker', details: 'Programme lead co-authorizing the multi-force operational rollout' },
      ],
      whatMovesIt: 'Meet with Fatima Osei, Rhys Calder and agree it.',
    },
    {
      id: 'a_westmere',
      accountId: 'A',
      name: "Scale Westmere's fleet",
      currency: 'GBP',
      nominalValue: 250000,
      supportedValue: 93217,
      unsupportedValue: 156783,
      stage: 'qualified',
      statusText: 'Qualified — Autumn finance window closing; helicopter benchmark verified',
      blocker: {
        text: 'No cost per flight against helicopter hours',
        status: 'open',
      },
      deadline: {
        text: "Metro Central's finance bid window closes. Ewan can only bid for more docks if blocker cleared.",
        soon: true,
        passed: false,
        movesLeft: 8,
      },
      evidenceIds: ['km_staff_2', 'km_value_2', 'eb_heli_1', 'eb_drone_2', 'eb_sign_2', 'helicopter_cost_overtime', 'flight_log_force_month'],
      evidenceItems: [],
      calculation: {
        formula: 'Helicopter Cost Savings Model vs Additional Drone Operating Shifts',
        inputs: [
          { label: 'Helicopter Benchmark Cost', value: '£1,500/flight hour all-in', sourceId: 'eb_heli_1', factStatus: 'verified' },
          { label: 'Supported Scale Allocation', value: '£93,217', sourceId: 'helicopter_cost_overtime', factStatus: 'verified' },
          { label: 'Unapproved Stadium Bid Reserve', value: '£156,783', sourceId: 'kb_stadium_view', factStatus: 'told' },
        ],
        explanation: 'Ewan Brooks verified that the Chief Finance Officer requires a cost per flight against £1,500/hr helicopter benchmark. £93,217 represents the immediate evidenced tranche, while £156,783 rests on unapproved stadium staffing.',
      },
      stakeholders: [
        { personId: 'ewan_brooks', role: 'payer', details: 'Finance business partner; owns finance bid into autumn round' },
        { personId: 'karen_mbeki', role: 'user', details: 'Drone unit inspector; needs 9 more trained operators for 30 docks' },
      ],
      whatMovesIt: 'Send Ewan Brooks a proposal with helicopter_cost_overtime, flight_log_force_month, km_staff_2.',
    },
    {
      id: 'a_tender',
      accountId: 'A',
      name: 'Position for the 300-dock framework tender',
      currency: 'GBP',
      nominalValue: 1500000,
      supportedValue: 359560,
      unsupportedValue: 1140440,
      stage: 'qualified',
      statusText: 'Qualified — Tender spec locking; needs costed operating model with Hannah Doyle',
      blocker: {
        text: 'The specification has no costed operating model',
        status: 'open',
      },
      deadline: {
        text: 'The tender specification locks. Whatever is not in it by then is out.',
        soon: false,
        passed: false,
      },
      evidenceIds: ['rc_tender_2', 'hd_calloff_2', 'rc_funding_2', 'eb_sign_2', 'km_staff_2'],
      evidenceItems: [],
      calculation: {
        formula: 'Preliminary Framework Baseline Positioning (Initial Phase Tranche)',
        inputs: [
          { label: 'Total 300-Dock Framework Scope', value: '£1,500,000 max potential', sourceId: 'rc_tender_0', factStatus: 'told' },
          { label: 'Supported Position Tranche', value: '£359,560 backed by 4-force operating data', sourceId: 'hd_calloff_2', factStatus: 'told' },
          { label: 'Unfunded Speculative Framework', value: '£1,140,440 unbacked tender ambition', sourceId: 'rc_funding_2', factStatus: 'told' },
        ],
        explanation: 'Rhys Calder stated the alliance has no pooled budget; each member force funds call-offs independently. £359,560 is the substantiated base model for forces with committed interest, while £1,140,440 is speculative tender volume.',
      },
      stakeholders: [
        { personId: 'hannah_doyle', role: 'blocker', details: 'Alliance procurement lead; sets framework tender specifications' },
        { personId: 'rhys_calder', role: 'champion', details: 'Drafting framework scope with regional leadership' },
      ],
      whatMovesIt: 'Send Hannah Doyle a proposal with draft_tender_spec, clarification_template, km_staff_2.',
    },
  ];

  // Assign evidence items to deals
  dealsA.forEach((d) => {
    d.evidenceItems = d.evidenceIds.map((id) => evidenceMap[id] || {
      id,
      sourceType: 'paperwork',
      sourceTitle: id,
      content: 'Source record referenced in deal audit trail.',
      factStatus: 'told',
    });
  });

  const stakeholdersA: Stakeholder[] = [
    {
      id: 'rhys_calder',
      accountId: 'A',
      name: 'Rhys Calder',
      title: 'Alliance drone programme lead',
      relationshipStatus: 'ally',
      available: true,
      isMet: true,
      decisionMakerStatus: true,
      payerStatus: false, // Fact rc_funding_2: each force funds from own budget, no pooled budget
      operationalUserStatus: false,
      technicalBlockerStatus: false,
      procurementBlockerStatus: false,
      championStatus: true,
      lastInteraction: '2026-10-30',
      needsBeforeProgressing: 'Proposal with flight logs proving dock utilization across forces.',
      associatedDealIds: ['a_renewal', 'a_tarn', 'a_tender'],
      evidenceIds: ['rc_appetite_0', 'rc_appetite_2', 'rc_funding_2', 'rc_tender_2'],
      sourceRecords: ['profile.json', 'contract.txt', 'calls/2026-10-20_check_in.txt'],
      notes: 'Strong alliance champion. However, cannot commit individual force budgets directly.',
    },
    {
      id: 'karen_mbeki',
      accountId: 'A',
      name: 'Insp. Karen Mbeki',
      title: 'Drone unit inspector, Westmere',
      relationshipStatus: 'ally',
      available: true,
      isMet: true,
      decisionMakerStatus: false,
      payerStatus: false,
      operationalUserStatus: true,
      technicalBlockerStatus: false,
      procurementBlockerStatus: false,
      championStatus: true,
      lastInteraction: '2026-08-11',
      needsBeforeProgressing: 'Staffing and overtime coverage model for expanding operator shifts.',
      associatedDealIds: ['a_renewal', 'a_westmere'],
      evidenceIds: ['km_usage_0', 'km_usage_1', 'km_staff_2', 'km_value_2'],
      sourceRecords: ['files/flight_log_force_month.csv', 'emails/2026-08-11_karen_batteries.txt'],
      notes: 'Operational champion running Westmere missions. Has 6 officers; needs 9 more to scale.',
    },
    {
      id: 'fatima_osei',
      accountId: 'A',
      name: 'Fatima Osei',
      title: 'Data protection officer, Tarn Valley',
      relationshipStatus: 'warm',
      available: true,
      isMet: true,
      decisionMakerStatus: false,
      payerStatus: false,
      operationalUserStatus: false,
      technicalBlockerStatus: false,
      procurementBlockerStatus: true, // Compliance / DPIA blocker
      championStatus: false,
      lastInteraction: '2026-11-14 (Morning meeting)',
      needsBeforeProgressing: 'Data-flow documentation pack, video retention policy, and storage access controls.',
      associatedDealIds: ['a_tarn'],
      evidenceIds: ['fo_dpia_0', 'fo_dpia_2', 'fo_needs_3', 'pj_ticket'],
      sourceRecords: ['tickets.json', 'dataflow_pack.csv'],
      notes: 'Critical compliance gate. Ticket sat unassigned for 4 months. Can sign DPIA in 3 weeks once pack delivered.',
    },
    {
      id: 'hannah_doyle',
      accountId: 'A',
      name: 'Hannah Doyle',
      title: 'Alliance procurement lead',
      relationshipStatus: 'neutral',
      available: true,
      isMet: true,
      decisionMakerStatus: 'unknown',
      payerStatus: false,
      operationalUserStatus: false,
      technicalBlockerStatus: false,
      procurementBlockerStatus: true,
      championStatus: false,
      lastInteraction: '2026-11-14 (Morning meeting)',
      needsBeforeProgressing: 'Costed operating model, draft tender specification, and clarification template.',
      associatedDealIds: ['a_tender', 'a_renewal'],
      evidenceIds: ['hd_calloff_2', 'rc_tender_2'],
      sourceRecords: ['calls/2025-12-16_pilot_review.txt'],
      notes: 'Neutral gatekeeper for framework procurement. Requires compliant call-off mechanism.',
    },
    {
      id: 'ewan_brooks',
      accountId: 'A',
      name: 'Ewan Brooks',
      title: 'Finance business partner, Metro Central',
      relationshipStatus: 'warm',
      available: true,
      isMet: true,
      decisionMakerStatus: 'unknown',
      payerStatus: true, // Owns Metro Central finance bid
      operationalUserStatus: false,
      technicalBlockerStatus: false,
      procurementBlockerStatus: false,
      championStatus: false,
      lastInteraction: '2026-11-14 (Morning meeting)',
      needsBeforeProgressing: 'Cost per flight comparison against £1,500/hr helicopter benchmark before finance window closes.',
      associatedDealIds: ['a_westmere', 'a_tender'],
      evidenceIds: ['eb_heli_1', 'eb_drone_2', 'eb_sign_2', 'eb_window_2'],
      sourceRecords: ['files/helicopter_cost_overtime.csv'],
      notes: 'Key budget holder for Metro Central force. Has 8 moves left before autumn finance round closes.',
    },
  ];

  const actionsA: ActionItem[] = [
    {
      id: 'act_a_1',
      rank: 1,
      priorityScore: 95,
      scoringFactors: { dealValueWeight: 28, deadlineUrgency: 23, blockerClearance: 25, evidenceReadiness: 19 },
      title: 'Deliver Data-Flow Pack to Fatima Osei (DPO) and Rhys Calder to Agree Tarn Valley Go-Live',
      description: 'Hand over the verified engineering data-flow pack (retention, storage, access controls) to DPO Fatima Osei and convene an agreement meeting with Rhys Calder to clear the final operational signoff.',
      responsibleOwner: 'CSM (You) with SRV (Engineering)',
      dueDate: '2026-11-18',
      accountId: 'A',
      relatedDealId: 'a_tarn',
      relevantStakeholderId: 'fatima_osei',
      reasonForPrioritization: 'Highest immediate yield: blocker is cleared internally, Fatima has committed to a 3-week completion timeline, and Norwold will mirror the approval.',
      evidenceIds: ['srv_dataflow', 'fo_needs_3', 'pj_ticket'],
      expectedOutcome: 'DPIA signoff secured for Tarn Valley, clearing £142,302 to move to agreed stage.',
      dependency: 'SRV engineering dataflow documentation pack.',
      status: 'pending',
    },
    {
      id: 'act_a_2',
      rank: 2,
      priorityScore: 90,
      scoringFactors: { dealValueWeight: 27, deadlineUrgency: 20, blockerClearance: 23, evidenceReadiness: 20 },
      title: 'Send Rhys Calder the Renewal Proposal Backed by 14-Dock Active Flight Logs',
      description: 'Present commercial renewal proposal for 35 docks to Rhys Calder, including the flight log evidence proving 14 active docks flying in Westmere and Metro Central.',
      responsibleOwner: 'CSM (You)',
      dueDate: '2026-11-20',
      accountId: 'A',
      relatedDealId: 'a_renewal',
      relevantStakeholderId: 'rhys_calder',
      reasonForPrioritization: 'Directly moves the core £136,361 renewal forward with verified evidence, preventing end-of-year contract slippage.',
      evidenceIds: ['km_usage_1', 'flight_log_force_month', 'doc_a_contract'],
      expectedOutcome: 'Rhys Calder advances proposal to member force finance leads for Year 2 renewal.',
      dependency: 'Compilation of flight_log_force_month and km_usage_1 stats.',
      status: 'pending',
    },
    {
      id: 'act_a_3',
      rank: 3,
      priorityScore: 88,
      scoringFactors: { dealValueWeight: 24, deadlineUrgency: 25, blockerClearance: 20, evidenceReadiness: 19 },
      title: 'Submit Helicopter Cost-Comparison & Shift Model to Ewan Brooks Before Autumn Window Closes',
      description: 'Deliver the £1,500/hr helicopter benchmark comparison against drone flight costs with Karen Mbeki’s overtime shift model to Ewan Brooks for Metro Central’s finance bid.',
      responsibleOwner: 'CSM (You) with Ewan Brooks',
      dueDate: '2026-11-22',
      accountId: 'A',
      relatedDealId: 'a_westmere',
      relevantStakeholderId: 'ewan_brooks',
      reasonForPrioritization: 'Time-critical deadline: Metro Central autumn finance bid window closes in 8 moves. Missed window means missing the FY27 capital cycle.',
      evidenceIds: ['eb_heli_1', 'eb_sign_2', 'helicopter_cost_overtime', 'km_staff_2'],
      expectedOutcome: 'CFO approves call-off inclusion in Metro Central autumn finance budget.',
      dependency: 'Final validation of helicopter cost per flight table.',
      status: 'pending',
    },
    {
      id: 'act_a_4',
      rank: 4,
      priorityScore: 75,
      scoringFactors: { dealValueWeight: 30, deadlineUrgency: 12, blockerClearance: 15, evidenceReadiness: 18 },
      title: 'Draft Costed Operating Model for 300-Dock Framework Tender with Hannah Doyle',
      description: 'Engage procurement lead Hannah Doyle with draft tender specifications and multi-force staffing templates to ensure FlytBase architecture is included in the framework tender.',
      responsibleOwner: 'CSM (You) with Achal Negi (BD)',
      dueDate: '2026-12-05',
      accountId: 'A',
      relatedDealId: 'a_tender',
      relevantStakeholderId: 'hannah_doyle',
      reasonForPrioritization: 'Strategic long-term deal (£359,560 supported, £1.5M max); specification locking in Q1.',
      evidenceIds: ['hd_calloff_2', 'rc_tender_2', 'km_staff_2'],
      expectedOutcome: 'Tender specification incorporates FlytBase costed operational requirements.',
      dependency: 'Procurement alignment on multi-force call-off structure.',
      status: 'pending',
    },
  ];

  const risksA: RiskItem[] = [
    {
      id: 'risk_a_1',
      riskId: 'RISK-A-DEADLINE-METRO',
      title: 'Metro Central Autumn Finance Window Closing (8 Moves Left)',
      accountId: 'A',
      relatedDealId: 'a_westmere',
      severity: 'critical',
      probability: 'High (8 moves remaining)',
      whyItMatters: 'Metro Central only bids in autumn. If Ewan Brooks does not submit the helicopter comparison to his CFO before the window shuts, the £93,217 expansion cannot be funded until next year.',
      triggerOrDeadline: 'Autumn Finance Window Cutoff (Moves left: 8)',
      recommendedMitigation: 'Send helicopter_cost_overtime and shift overtime analysis to Ewan Brooks immediately.',
      responsibleOwner: 'CSM (You)',
      evidenceIds: ['eb_window_2', 'eb_sign_2', 'helicopter_cost_overtime'],
      sourceRecords: ['files/helicopter_cost_overtime.csv'],
      statusColor: 'red',
    },
    {
      id: 'risk_a_2',
      riskId: 'RISK-A-SPEC-LOCK',
      title: '300-Dock Framework Specification Locking Without Costed Operating Model',
      accountId: 'A',
      relatedDealId: 'a_tender',
      severity: 'high',
      probability: 'Medium',
      whyItMatters: 'Tender specification is being finalised. If it locks without FlytBase-compatible operating specifications, the £1.5M framework opportunity is lost to competing models.',
      triggerOrDeadline: 'Regional Tender Spec Finalisation',
      recommendedMitigation: 'Supply Hannah Doyle with clarification template and force operating cost breakdown.',
      responsibleOwner: 'Achal Negi / CSM',
      evidenceIds: ['rc_tender_2', 'hd_calloff_2'],
      sourceRecords: ['calls/2025-12-16_pilot_review.txt'],
      statusColor: 'amber',
    },
    {
      id: 'risk_a_3',
      riskId: 'RISK-A-DPIA-DELAYS',
      title: 'Tarn Valley Support Ticket Backlog & Cross-Force Privacy Contagion',
      accountId: 'A',
      relatedDealId: 'a_tarn',
      severity: 'medium',
      probability: 'Known historical stall (4 months unresolved)',
      whyItMatters: 'The support ticket sat unassigned for four months. Norwold Chief Constable is already cautious from a local privacy row and waiting to copy Tarn Valley’s DPIA.',
      triggerOrDeadline: '3-week review cycle upon delivery of data-flow pack',
      recommendedMitigation: 'Direct CSM handover of data-flow pack to Fatima Osei; close support ticket FB-10822.',
      responsibleOwner: 'CSM (You)',
      evidenceIds: ['pj_ticket', 'fo_dpia_2', 'km_others_2'],
      sourceRecords: ['tickets.json', 'dataflow_pack.csv'],
      statusColor: 'amber',
    },
  ];

  const gapsA: KnowledgeGap[] = [
    {
      id: 'gap_a_1',
      title: 'Per-Force Dock Deployment & Serial Mapping (Install Sheets Missing)',
      accountId: 'A',
      relatedDealId: 'a_renewal',
      whyItMatters: 'The customer success records do not specify which dock sits at which force or plant. Inability to identify asset locations impedes audit verification.',
      whoCanFill: 'Rhys Calder (Alliance Programme Lead) or FlytBase Field Engineering',
      recommendedQuestion: 'Can you provide the final commissioning site schedule mapping the 35 dock serials to individual force locations?',
      priority: 'high',
      blocksDealProgression: false,
      category: 'operational',
      evidenceIds: ['doc_a_profile', 'internal_notes.json'],
      status: 'not_found_in_records',
    },
    {
      id: 'gap_a_2',
      title: 'Norwold Chief Constable Specific Privacy Mandates',
      accountId: 'A',
      relatedDealId: 'a_tarn',
      whyItMatters: 'Norwold has not flown live missions due to caution following a local privacy row. We do not know if their requirements exceed Tarn Valley’s DPIA.',
      whoCanFill: 'Norwold Drone Lead or Fatima Osei',
      recommendedQuestion: 'Does Norwold require any force-specific retention clauses beyond Tarn Valley’s DPIA standard?',
      priority: 'high',
      blocksDealProgression: true,
      category: 'compliance',
      evidenceIds: ['km_others_2', 'fo_needs_3'],
      status: 'unknown',
    },
    {
      id: 'gap_a_3',
      title: 'Westmere Superintendent Staffing Approval for 30-Dock Expansion',
      accountId: 'A',
      relatedDealId: 'a_westmere',
      whyItMatters: 'The Westmere superintendent expressed skepticism that 30 docks could be supported under current staffing. No direct contact with her has occurred.',
      whoCanFill: 'Insp. Karen Mbeki & Westmere Superintendent',
      recommendedQuestion: 'Can we review the shift roster model with the superintendent to demonstrate how 9 trained operators cover 30 docks?',
      priority: 'medium',
      blocksDealProgression: false,
      category: 'operational',
      evidenceIds: ['kb_stadium_view', 'km_staff_2'],
      status: 'unknown',
    },
  ];

  // -------------------------------------------------------------
  // ACCOUNT B: Aldermoor Industrial Group
  // -------------------------------------------------------------
  const dealsB: Deal[] = [
    {
      id: 'b_renewal',
      accountId: 'B',
      name: 'Renew the Aldermoor contract (14 docks)',
      currency: 'EUR',
      nominalValue: 140000,
      supportedValue: 140000,
      unsupportedValue: 0,
      stage: 'identified',
      statusText: 'Contract baseline verified (€140k/yr); Renewal halted by unanswered Finance email',
      blocker: {
        text: 'Group Finance halted renewal pending plant-by-plant quote breakdown; email was left unanswered',
        status: 'open',
      },
      deadline: {
        text: 'Order term ends 31 January 2027. No automatic renewal. New order required before then.',
        soon: true,
        passed: false,
        dueDate: '2027-01-31',
      },
      evidenceIds: ['doc_b_contract', 'doc_b_invoices', 'email_b_finance'],
      evidenceItems: [],
      calculation: {
        formula: 'Annual Contract Order Form Value (14 docks × €10,000/dock/yr)',
        inputs: [
          { label: 'Contracted Annual Price', value: '€140,000 a year', sourceId: 'doc_b_contract', factStatus: 'verified' },
          { label: 'Term Dates', value: '1 Feb 2026 to 31 Jan 2027', sourceId: 'doc_b_contract', factStatus: 'verified' },
          { label: 'Historical Invoices', value: 'INV-25-1012 (€12,000 trial) & INV-26-0204 (€128,000 balance) Paid', sourceId: 'doc_b_invoices', factStatus: 'verified' },
          { label: 'Finance Blocker Condition', value: 'Quote must show cost for each plant before renewal is raised', sourceId: 'email_b_finance', factStatus: 'told' },
        ],
        explanation: 'Baseline contractual value of €140,000 is verified by the signed order form and paid invoices. However, renewal will fail unless FlytBase provides the plant-by-plant quote requested by Group Finance.',
      },
      stakeholders: [
        { personId: 'stefan_roy', role: 'champion', details: 'Group head of security; signed original order form' },
        { personId: 'group_finance_shared', role: 'payer', details: 'Shared finance mailbox; halted renewal pending plant cost breakdown' },
      ],
      whatMovesIt: 'Reply to Group Finance with plant-by-plant cost breakdown and engage Stefan Roy.',
    },
    {
      id: 'b_idle_plants',
      accountId: 'B',
      name: 'Bring the idle plants into regular patrol',
      currency: 'EUR',
      nominalValue: 160000,
      supportedValue: 0,
      unsupportedValue: 160000,
      stage: 'unqualified',
      statusText: 'Unbacked offer — Docks for Plant 15 and two idle plants; not yet qualified with customer',
      blocker: {
        text: 'Never discussed during commercial handover; no plant managers engaged beyond Plant 7',
        status: 'open',
      },
      deadline: null,
      evidenceIds: ['offer_b_more_plants', 'doc_b_profile'],
      evidenceItems: [],
      calculation: {
        formula: 'Pitched Offer Value (Unaccepted Pitch)',
        inputs: [
          { label: 'Offer b_more_plants', value: '€160,000 (Plant 15 & 2 idle plants)', sourceId: 'offer_b_more_plants', factStatus: 'claim' },
          { label: 'Verified Commercial Commitment', value: '€0 (No signed order or qualified budget)', sourceId: 'doc_b_profile', factStatus: 'unknown' },
        ],
        explanation: 'Offer was drafted internally for Stefan Roy but never qualified or agreed. Counted as €0 supported pipeline to preserve financial integrity.',
      },
      stakeholders: [
        { personId: 'stefan_roy', role: 'influencer', details: 'Group head of security; recipient of pitch' },
        { personId: 'beatriz_alonso', role: 'user', details: 'Plant 7 manager; represents operational plant leadership' },
      ],
      whatMovesIt: 'Meet with Beatriz Alonso, Owen Fitch, or Stefan Roy to assess idle plant readiness.',
    },
    {
      id: 'b_insurance_discount',
      accountId: 'B',
      name: 'Protect and extend the insurance discount',
      currency: 'EUR',
      nominalValue: 0,
      supportedValue: 0,
      unsupportedValue: 0,
      stage: 'unqualified',
      statusText: 'Unqualified — Potential insurance benefit never scoped with risk management',
      blocker: {
        text: 'Julian Tate (Insurance & Risk Manager) was never met or contacted',
        status: 'open',
      },
      deadline: null,
      evidenceIds: ['doc_b_profile'],
      evidenceItems: [],
      calculation: {
        formula: 'Unscoped Potential Opportunity',
        inputs: [
          { label: 'Supported Financial Value', value: '€0 (No figures on file)', sourceId: 'doc_b_profile', factStatus: 'unknown' },
        ],
        explanation: 'Identified as a commercial opportunity in the morning session, but no dollar value was ever established or evidenced.',
      },
      stakeholders: [
        { personId: 'julian_tate', role: 'unknown', details: 'Insurance and risk manager; never met by FlytBase team' },
      ],
      whatMovesIt: 'Engage Julian Tate or Nadia Rahman to review drone patrol insurance premium credits.',
    },
    {
      id: 'b_sister_company',
      accountId: 'B',
      name: 'Case study for the 40-plant sister company',
      currency: 'EUR',
      nominalValue: 1200000,
      supportedValue: 0,
      unsupportedValue: 1200000,
      stage: 'unqualified',
      statusText: 'Unsupported claim — Stefan Roy claimed €1.2M savings; no evidence provided',
      blocker: {
        text: 'Stefan Roy provided zero supporting data for the €1.2M savings claim',
        status: 'open',
      },
      deadline: null,
      evidenceIds: ['email_b_savings', 'email_b_case_study'],
      evidenceItems: [],
      calculation: {
        formula: 'Customer Claim (Unbacked)',
        inputs: [
          { label: 'Stefan Roy Email Statement', value: '€1,200,000 / year savings claimed', sourceId: 'email_b_savings', factStatus: 'claim' },
          { label: 'Verified Supporting Calculations', value: '€0 (Record states: [No detail received])', sourceId: 'email_b_savings', factStatus: 'claim' },
        ],
        explanation: 'Stefan Roy emailed FlytBase stating ROI is proven at ~€1.2M/yr across plants, but promised details were never sent. Displayed strictly as unsupported claim.',
      },
      stakeholders: [
        { personId: 'stefan_roy', role: 'champion', details: 'Pushed for 2-page case study featuring the headline number' },
      ],
      whatMovesIt: 'Request actual guard patrol cost reduction figures from Stefan Roy and plant controllers.',
    },
    {
      id: 'b_priority_support',
      accountId: 'B',
      name: 'Night-time priority support for Plant 7',
      currency: 'EUR',
      nominalValue: 50000,
      supportedValue: 0,
      unsupportedValue: 50000,
      stage: 'unqualified',
      statusText: 'Unaccepted offer — €50,000 pitch to Beatriz Alonso; ticket closed without discovery',
      blocker: {
        text: 'Beatriz Alonso was sent a generic settings guide; commercial proposal was never presented',
        status: 'open',
      },
      deadline: null,
      evidenceIds: ['ticket_b_beatriz'],
      evidenceItems: [],
      calculation: {
        formula: 'Pitched Offer Value (Unaccepted Pitch)',
        inputs: [
          { label: 'Internal Offer Value', value: '€50,000', sourceId: 'offer_b_priority_support', factStatus: 'claim' },
          { label: 'Customer Commitment', value: '€0', sourceId: 'ticket_b_beatriz', factStatus: 'told' },
        ],
        explanation: 'Beatriz Alonso asked about night alert routing. Customer success closed the ticket with a PDF without exploring operational support packages.',
      },
      stakeholders: [
        { personId: 'beatriz_alonso', role: 'user', details: 'Plant 7 manager' },
      ],
      whatMovesIt: 'Engage Beatriz Alonso to understand Plant 7 response times and SLA requirements.',
    },
  ];

  dealsB.forEach((d) => {
    d.evidenceItems = d.evidenceIds.map((id) => evidenceMap[id] || {
      id,
      sourceType: 'paperwork',
      sourceTitle: id,
      content: 'Source record referenced in deal audit trail.',
      factStatus: 'told',
    });
  });

  const stakeholdersB: Stakeholder[] = [
    {
      id: 'stefan_roy',
      accountId: 'B',
      name: 'Stefan Roy',
      title: 'Group head of security',
      relationshipStatus: 'neutral',
      available: true,
      isMet: true,
      decisionMakerStatus: true,
      payerStatus: 'unknown', // Order invoiced to group security, but finance is questioning per-plant allocation
      operationalUserStatus: false,
      technicalBlockerStatus: false,
      procurementBlockerStatus: false,
      championStatus: true,
      lastInteraction: '2026-10-13 (Check-in call)',
      needsBeforeProgressing: 'A 2-page case study demonstrating savings to share with 40-plant sister company.',
      associatedDealIds: ['b_renewal', 'b_idle_plants', 'b_sister_company'],
      evidenceIds: ['doc_b_contract', 'email_b_savings', 'email_b_case_study'],
      sourceRecords: ['profile.json', 'contract.txt', 'calls/2026-10-13_check_in.txt'],
      notes: 'Sole contact for entire account. Single point of failure risk. Claimed €1.2M ROI without data.',
    },
    {
      id: 'beatriz_alonso',
      accountId: 'B',
      name: 'Beatriz Alonso',
      title: 'Plant manager, Plant 7',
      relationshipStatus: 'guarded',
      available: true,
      isMet: true,
      decisionMakerStatus: false,
      payerStatus: false,
      operationalUserStatus: true,
      technicalBlockerStatus: false,
      procurementBlockerStatus: false,
      championStatus: false,
      lastInteraction: '2026-09-20 (Support ticket closed)',
      needsBeforeProgressing: 'Multi-recipient alerting workflow for plant night operations.',
      associatedDealIds: ['b_priority_support', 'b_idle_plants'],
      evidenceIds: ['ticket_b_beatriz'],
      sourceRecords: ['emails/2026-09-18_beatriz_alerts.txt', 'tickets.json'],
      notes: 'Guarded relationship. Only contact on file through support ticket FB-10944. Never had a call with FlytBase.',
    },
    {
      id: 'nadia_rahman',
      accountId: 'B',
      name: 'Nadia Rahman (Group Finance)',
      title: 'Group finance controller',
      relationshipStatus: 'unknown',
      available: false,
      isMet: false,
      decisionMakerStatus: 'unknown',
      payerStatus: true, // Group finance holds budget approval
      operationalUserStatus: false,
      technicalBlockerStatus: false,
      procurementBlockerStatus: true,
      championStatus: false,
      lastInteraction: '2026-10-08 (Unsigned finance mailbox inquiry)',
      needsBeforeProgressing: 'Plant-by-plant cost breakdown before renewal order can be raised.',
      associatedDealIds: ['b_renewal'],
      evidenceIds: ['email_b_finance', 'doc_b_profile'],
      sourceRecords: ['emails/2026-10-08_finance_mailbox.txt'],
      notes: 'CRITICAL GAP: Never met. Shared mailbox email went unanswered. Controls renewal approval.',
    },
    {
      id: 'owen_fitch',
      accountId: 'B',
      name: 'Owen Fitch (Group IT)',
      title: 'Group IT infrastructure lead',
      relationshipStatus: 'unknown',
      available: false,
      isMet: false,
      decisionMakerStatus: false,
      payerStatus: false,
      operationalUserStatus: false,
      technicalBlockerStatus: true, // Manages plant network connectivity
      procurementBlockerStatus: false,
      championStatus: false,
      lastInteraction: 'Never contacted',
      needsBeforeProgressing: 'Network security review for docks connected to plant networks.',
      associatedDealIds: ['b_idle_plants'],
      evidenceIds: ['doc_b_profile'],
      sourceRecords: ['profile.json'],
      notes: 'CRITICAL GAP: Never met. Dock contract requires customer to maintain plant network connectivity.',
    },
    {
      id: 'julian_tate',
      accountId: 'B',
      name: 'Julian Tate (Risk & Insurance)',
      title: 'Insurance and risk manager',
      relationshipStatus: 'unknown',
      available: false,
      isMet: false,
      decisionMakerStatus: 'unknown',
      payerStatus: false,
      operationalUserStatus: false,
      technicalBlockerStatus: false,
      procurementBlockerStatus: false,
      championStatus: false,
      lastInteraction: 'Never contacted',
      needsBeforeProgressing: 'Documentation on drone patrol risk reduction to maintain insurance discount.',
      associatedDealIds: ['b_insurance_discount'],
      evidenceIds: ['doc_b_profile'],
      sourceRecords: ['profile.json'],
      notes: 'CRITICAL GAP: Never met. Key to unlocking insurance-backed expansion.',
    },
  ];

  const actionsB: ActionItem[] = [
    {
      id: 'act_b_1',
      rank: 1,
      priorityScore: 96,
      scoringFactors: { dealValueWeight: 28, deadlineUrgency: 25, blockerClearance: 25, evidenceReadiness: 18 },
      title: 'Respond to Group Finance Mailbox with Plant-by-Plant Renewal Breakdown',
      description: 'Reply to the unanswered 8 October 2026 email from Group Finance providing a transparent breakdown of the €140,000 annual contract (€10,000 per plant across 14 docks) to clear the renewal gate.',
      responsibleOwner: 'CSM (You)',
      dueDate: '2026-11-17',
      accountId: 'B',
      relatedDealId: 'b_renewal',
      relevantStakeholderId: 'nadia_rahman',
      reasonForPrioritization: 'Immediate contract renewal risk: Term expires 31 January 2027 with no auto-renewal. Finance explicitly blocked renewal until this breakdown is delivered.',
      evidenceIds: ['email_b_finance', 'doc_b_contract', 'doc_b_invoices'],
      expectedOutcome: 'Group Finance unblocks order requisition for Year 2 renewal.',
      dependency: 'Compilation of per-plant allocation schedule from Accounts.',
      status: 'pending',
    },
    {
      id: 'act_b_2',
      rank: 2,
      priorityScore: 89,
      scoringFactors: { dealValueWeight: 25, deadlineUrgency: 22, blockerClearance: 22, evidenceReadiness: 20 },
      title: 'Schedule Joint Discovery Call with Stefan Roy and Nadia Rahman (Group Finance)',
      description: 'Break single-point-of-contact dependence by connecting Stefan Roy and Nadia Rahman in a joint account review to align security operational goals with corporate financial requirements.',
      responsibleOwner: 'CSM (You) / Account Lead',
      dueDate: '2026-11-20',
      accountId: 'B',
      relatedDealId: 'b_renewal',
      relevantStakeholderId: 'stefan_roy',
      reasonForPrioritization: 'Eliminates single stakeholder vulnerability; ensures finance controller understands the ROI model.',
      evidenceIds: ['doc_b_profile', 'calls/2026-10-13_check_in.txt'],
      expectedOutcome: 'Direct engagement established with financial budget owner.',
      dependency: 'Response from Group Finance email.',
      status: 'pending',
    },
    {
      id: 'act_b_3',
      rank: 3,
      priorityScore: 82,
      scoringFactors: { dealValueWeight: 22, deadlineUrgency: 18, blockerClearance: 22, evidenceReadiness: 20 },
      title: 'Conduct Field Adoption Review with Beatriz Alonso (Plant 7 Manager)',
      description: 'Follow up on ticket FB-10944 regarding night alert routing. Review Plant 7 operational usage, multi-user notification needs, and present tailored priority response support.',
      responsibleOwner: 'CSM (You)',
      dueDate: '2026-11-24',
      accountId: 'B',
      relatedDealId: 'b_priority_support',
      relevantStakeholderId: 'beatriz_alonso',
      reasonForPrioritization: 'Turns a guarded operational stakeholder into an ally; provides field validation needed to expand to idle plants.',
      evidenceIds: ['ticket_b_beatriz'],
      expectedOutcome: 'Beatriz Alonso onboarded into collaborative champion role; Plant 7 SLA defined.',
      dependency: 'Review of support ticket history FB-10944.',
      status: 'pending',
    },
    {
      id: 'act_b_4',
      rank: 4,
      priorityScore: 70,
      scoringFactors: { dealValueWeight: 30, deadlineUrgency: 10, blockerClearance: 12, evidenceReadiness: 18 },
      title: 'Validate Stefan Roy’s €1.2M Savings Claim for Sister Company Case Study',
      description: 'Audit guard patrol log savings with plant accountants to substantiate Stefan Roy’s €1.2M ROI claim before publishing the 2-page case study for the 40-plant sister company.',
      responsibleOwner: 'CSM (You) with Stefan Roy',
      dueDate: '2026-12-08',
      accountId: 'B',
      relatedDealId: 'b_sister_company',
      relevantStakeholderId: 'stefan_roy',
      reasonForPrioritization: 'Protects commercial credibility; creates evidence-backed springboard into 40-plant sister enterprise.',
      evidenceIds: ['email_b_savings', 'email_b_case_study'],
      expectedOutcome: 'Audited financial proof created for sister company expansion proposal.',
      dependency: 'Actual incident and patrol cost reduction metrics from plants.',
      status: 'pending',
    },
  ];

  const risksB: RiskItem[] = [
    {
      id: 'risk_b_1',
      riskId: 'RISK-B-FINANCE-UNANSWERED',
      title: 'Unanswered Group Finance Renewal Query (Contract Expires 31 Jan 2027)',
      accountId: 'B',
      relatedDealId: 'b_renewal',
      severity: 'critical',
      probability: 'Critical (Active Blocker)',
      whyItMatters: 'Group Finance email sent 8 October 2026 remains unanswered in customer records. Contract has NO automatic renewal and expires on 31 January 2027.',
      triggerOrDeadline: 'Contract Term Expiration (2027-01-31)',
      recommendedMitigation: 'Send detailed plant-by-plant quote breakdown immediately.',
      responsibleOwner: 'CSM (You)',
      evidenceIds: ['email_b_finance', 'doc_b_contract'],
      sourceRecords: ['emails/2026-10-08_finance_mailbox.txt'],
      statusColor: 'red',
    },
    {
      id: 'risk_b_2',
      riskId: 'RISK-B-SINGLE-STAKEHOLDER',
      title: 'Single-Point-of-Failure: Total Dependence on Stefan Roy',
      accountId: 'B',
      severity: 'high',
      probability: 'Confirmed by Profile records',
      whyItMatters: 'Every call since May 2026 has been with Stefan Roy alone. Finance, IT, and plant managers were never engaged by FlytBase.',
      triggerOrDeadline: 'Annual Renewal & Multi-Site Rollout',
      recommendedMitigation: 'Map and engage Nadia Rahman (Finance), Owen Fitch (IT), and Julian Tate (Risk).',
      responsibleOwner: 'CSM (You)',
      evidenceIds: ['doc_b_profile'],
      sourceRecords: ['profile.json'],
      statusColor: 'amber',
    },
    {
      id: 'risk_b_3',
      riskId: 'RISK-B-UNSUBSTANTIATED-CLAIM',
      title: 'Reputational Hazard: Unsubstantiated €1.2M Savings Claim',
      accountId: 'B',
      relatedDealId: 'b_sister_company',
      severity: 'medium',
      probability: 'High risk of audit failure',
      whyItMatters: 'Stefan Roy wants to pitch the €1.2M savings figure to the 40-plant sister company, but provided no underlying calculation or data.',
      triggerOrDeadline: 'Sister Company Executive Review',
      recommendedMitigation: 'Politely gate case study release until underlying plant cost reductions are audited.',
      responsibleOwner: 'CSM (You)',
      evidenceIds: ['email_b_savings', 'email_b_case_study'],
      sourceRecords: ['emails/2026-07-16_stefan_savings.txt'],
      statusColor: 'amber',
    },
  ];

  const gapsB: KnowledgeGap[] = [
    {
      id: 'gap_b_1',
      title: 'Identity and Authority of Group Finance Controller (Nadia Rahman)',
      accountId: 'B',
      relatedDealId: 'b_renewal',
      whyItMatters: 'The renewal email came from a shared mailbox. We need a named financial controller with signing authority.',
      whoCanFill: 'Stefan Roy or Group Finance team',
      recommendedQuestion: 'Who is the formal commercial signatory for the annual platform contract in Group Finance?',
      priority: 'critical',
      blocksDealProgression: true,
      category: 'payer',
      evidenceIds: ['email_b_finance', 'doc_b_profile'],
      status: 'confirmed_not_available',
    },
    {
      id: 'gap_b_2',
      title: 'Plant-by-Plant Dock Serial Location Mapping (Install List Missing)',
      accountId: 'B',
      relatedDealId: 'b_renewal',
      whyItMatters: 'The 14 commissioned docks were installed by the customer’s internal team; FlytBase holds no record of which dock sits at which plant.',
      whoCanFill: "Stefan Roy's rollout deputy",
      recommendedQuestion: 'Can you share the site register mapping the 14 dock IDs to specific plant facilities?',
      priority: 'high',
      blocksDealProgression: false,
      category: 'operational',
      evidenceIds: ['doc_b_profile', 'internal_notes.json'],
      status: 'not_found_in_records',
    },
    {
      id: 'gap_b_3',
      title: 'Group IT Infrastructure Architecture & Network Policies (Owen Fitch)',
      accountId: 'B',
      relatedDealId: 'b_idle_plants',
      whyItMatters: 'Each dock relies on local plant networks. Expanding to idle plants requires IT signoff for network connectivity and port rules.',
      whoCanFill: 'Owen Fitch (Group IT Lead)',
      recommendedQuestion: 'What are Group IT’s network and cybersecurity specifications for activating docks at idle plant sites?',
      priority: 'high',
      blocksDealProgression: false,
      category: 'technical',
      evidenceIds: ['doc_b_profile'],
      status: 'unknown',
    },
    {
      id: 'gap_b_4',
      title: 'Empirical Foundation of €1.2M Annual Savings Claim',
      accountId: 'B',
      relatedDealId: 'b_sister_company',
      whyItMatters: 'We cannot present savings claims to executive boards or sister companies without knowing baseline guard patrol hour reductions.',
      whoCanFill: 'Stefan Roy & Plant Finance Managers',
      recommendedQuestion: 'What baseline security guard hours or incident cost data was used to compute the €1.2M annual savings figure?',
      priority: 'medium',
      blocksDealProgression: false,
      category: 'financial',
      evidenceIds: ['email_b_savings'],
      status: 'unknown',
    },
  ];

  // Extract raw paperwork records for Evidence Explorer
  const evidenceExplorerRecords: EvidenceRecord[] = [];

  paperworkA.records?.forEach((r: any) => {
    evidenceExplorerRecords.push({
      path: r.path,
      kind: r.kind || 'record',
      account: 'Eastern Counties Police Alliance (A)',
      summary: `${r.kind ? r.kind.toUpperCase() : 'DOCUMENT'}: ${r.path}`,
      content: r.text || JSON.stringify(r.data || r, null, 2),
    });
  });

  paperworkB.records?.forEach((r: any) => {
    evidenceExplorerRecords.push({
      path: r.path,
      kind: r.kind || 'record',
      account: 'Aldermoor Industrial Group (B)',
      summary: `${r.kind ? r.kind.toUpperCase() : 'DOCUMENT'}: ${r.path}`,
      content: r.text || JSON.stringify(r.data || r, null, 2),
    });
  });

  const accountA: AccountData = {
    id: 'A',
    name: 'Eastern Counties Police Alliance',
    officialStory: 'Rollout under way. 4 forces, 35 docks, 300-dock framework tender in preparation.',
    sector: 'Public Safety & Law Enforcement',
    currency: 'GBP',
    supportedPipeline: 731440,
    unbackedPipeline: 1568560,
    totalNominalPipeline: 2300000,
    deals: dealsA,
    stakeholders: stakeholdersA,
    topActions: actionsA.slice(0, 3),
    allActions: actionsA,
    risks: risksA,
    knowledgeGaps: gapsA,
    deadlines: exportData.accounts?.[0]?.deadlines || [],
    offers: exportData.accounts?.[0]?.offers || [],
    notOnFile: paperworkA.records?.find((r: any) => r.kind === 'profile')?.data?.not_on_file || [],
  };

  const accountB: AccountData = {
    id: 'B',
    name: 'Aldermoor Industrial Group',
    officialStory: '14 docks deployed for perimeter night security. Contract expires January 2027.',
    sector: 'Industrial Manufacturing & Critical Infrastructure',
    currency: 'EUR',
    supportedPipeline: 140000,
    unbackedPipeline: 1410000,
    totalNominalPipeline: 1550000,
    deals: dealsB,
    stakeholders: stakeholdersB,
    topActions: actionsB.slice(0, 3),
    allActions: actionsB,
    risks: risksB,
    knowledgeGaps: gapsB,
    deadlines: [{ text: 'Contract Term Expiration (31 January 2027)', passed: false, soon: true }],
    offers: exportData.accounts?.[1]?.offers || [],
    notOnFile: paperworkB.records?.find((r: any) => r.kind === 'profile')?.data?.not_on_file || [],
  };

  const parsedSignals: LiveSignal[] = signalsData.signals || [];
  const parsedNotes: CRMNote[] = notesData.notes || [];

  cachedCRMData = {
    accounts: [accountA, accountB],
    signals: parsedSignals,
    notes: parsedNotes,
    evidenceExplorer: evidenceExplorerRecords,
    allEvidenceItems: evidenceMap,
    lastLoaded: Date.now(),
  };

  return cachedCRMData;
}

export function getCRMData() {
  if (!cachedCRMData) {
    return loadNormalizedCRMData();
  }
  return cachedCRMData;
}

export function getAccountById(id: string): AccountData | undefined {
  const data = getCRMData();
  return data.accounts.find((a) => a.id.toLowerCase() === id.toLowerCase());
}

export function getDealById(id: string): Deal | undefined {
  const data = getCRMData();
  for (const acc of data.accounts) {
    const deal = acc.deals.find((d) => d.id === id);
    if (deal) return deal;
  }
  return undefined;
}

export function getEvidenceById(id: string): EvidenceReference | undefined {
  const data = getCRMData();
  return data.allEvidenceItems[id];
}

export function appendLiveSignal(signal: LiveSignal) {
  const data = getCRMData();
  data.signals.unshift(signal);
  // Persist to signals.json
  const filePath = path.join(DATA_DIR, 'signals.json');
  try {
    fs.writeFileSync(filePath, JSON.stringify({ signals: data.signals }, null, 2));
  } catch (err) {
    console.error('Error saving signals.json:', err);
  }
}

export function appendCRMNote(note: CRMNote) {
  const data = getCRMData();
  data.notes.unshift(note);
  // Persist to notes.json
  const filePath = path.join(DATA_DIR, 'notes.json');
  try {
    fs.writeFileSync(filePath, JSON.stringify({ notes: data.notes }, null, 2));
  } catch (err) {
    console.error('Error saving notes.json:', err);
  }
}
