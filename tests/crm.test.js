import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getCRMData, getAccountById, getDealById, getEvidenceById, appendLiveSignal } from '../src/lib/data-store.ts';
import { acquireLock, releaseLock, getRateLimitStatus } from '../src/lib/mcp.ts';

describe('Priority 2: Financial Accuracy & Commercial Valuation', () => {
  const data = getCRMData();
  const ecpa = getAccountById('A');
  const aldermoor = getAccountById('B');

  test('Account A (ECPA) strictly separates signed contract value from discovery pipeline', () => {
    assert.ok(ecpa, 'Account A must exist');
    // Signed existing contract baseline: 35 docks @ £10,000/yr
    assert.equal(ecpa.signedContractValue, 350000, 'ECPA signed contract baseline must be £350,000');
    // Morning qualified discovery pipeline across 4 deals
    assert.equal(ecpa.supportedPipeline, 731440, 'ECPA morning qualified pipeline must be £731,440');
    // Maximum nominal uncommitted framework potential
    assert.equal(ecpa.totalNominalPipeline, 2300000, 'ECPA total nominal potential cap must be £2,300,000');

    // Sum of deals supportedValue must equal supportedPipeline
    const dealsSum = ecpa.deals.reduce((sum, d) => sum + d.supportedValue, 0);
    assert.equal(dealsSum, ecpa.supportedPipeline, 'Sum of deal supported values must equal £731,440');
  });

  test('Account B (Aldermoor) strictly separates contract baseline from unbacked savings claim', () => {
    assert.ok(aldermoor, 'Account B must exist');
    // Signed contract baseline: 14 docks @ €10,000/yr
    assert.equal(aldermoor.signedContractValue, 140000, 'Aldermoor contract baseline must be €140,000');
    assert.equal(aldermoor.supportedPipeline, 140000, 'Supported renewal pipeline must be €140,000');

    // Stefan Roy's €1.2M savings claim must NOT be treated as commercial deal value
    const sisterDeal = getDealById('b_sister_company');
    assert.ok(sisterDeal, 'Sister company deal must exist');
    assert.equal(sisterDeal.supportedValue, 0, 'Savings claim must contribute €0 to supported commercial pipeline');
    assert.equal(sisterDeal.stage, 'unqualified', 'Savings claim deal stage must be unqualified');

    // Check evidence item for €1.2M savings claim
    const savingsEvidence = getEvidenceById('email_b_savings');
    assert.ok(savingsEvidence, 'Savings evidence item must exist');
    assert.equal(savingsEvidence.factStatus, 'claim', '€1.2M savings must be classified as claim, not verified');
  });

  test('Every deal includes calculation formula, audit inputs, and evidence citations', () => {
    for (const acc of data.accounts) {
      for (const deal of acc.deals) {
        assert.ok(deal.calculation, `Deal ${deal.id} must have a calculation model`);
        assert.ok(deal.calculation.formula.length > 0, `Deal ${deal.id} must have a formula`);
        assert.ok(deal.calculation.inputs.length > 0, `Deal ${deal.id} must have calculation inputs`);
        assert.ok(deal.evidenceIds.length > 0, `Deal ${deal.id} must cite at least one evidence ID`);
      }
    }
  });
});

describe('Priority 3: Real Evidence Receipts (No Fabrication)', () => {
  test('Key operational and commercial evidence IDs resolve to genuine records', () => {
    // ECPA evidence
    const flightLog = getEvidenceById('flight_log_force_month');
    assert.ok(flightLog, 'flight_log_force_month must resolve');
    assert.equal(flightLog.factStatus, 'verified');
    assert.ok(flightLog.content.includes('Westmere'), 'Flight log must contain genuine Westmere record');

    const heliCost = getEvidenceById('helicopter_cost_overtime');
    assert.ok(heliCost, 'helicopter_cost_overtime must resolve');
    assert.equal(heliCost.factStatus, 'verified');
    assert.ok(heliCost.content.includes('1500') || heliCost.content.includes('1,500'), 'Heli benchmark must contain £1,500/hr');

    const dataflow = getEvidenceById('srv_dataflow');
    assert.ok(dataflow, 'srv_dataflow must resolve');
    assert.equal(dataflow.factStatus, 'verified');
    assert.ok(
      dataflow.content.toLowerCase().includes('data protection') || dataflow.content.toLowerCase().includes('data-flow'),
      'Dataflow pack must mention data protection or data-flow'
    );

    const contractA = getEvidenceById('doc_a_contract');
    assert.ok(contractA, 'doc_a_contract must resolve');
    assert.equal(contractA.factStatus, 'verified');

    // Aldermoor evidence
    const financeEmail = getEvidenceById('email_b_finance');
    assert.ok(financeEmail, 'email_b_finance must resolve');
    assert.ok(financeEmail.content.includes('quote') || financeEmail.content.includes('renewal'), 'Finance email must contain renewal query');

    const contractB = getEvidenceById('doc_b_contract');
    assert.ok(contractB, 'doc_b_contract must resolve');
    assert.equal(contractB.factStatus, 'verified');
  });

  test('Missing or non-existent IDs return undefined with ZERO fabricated fallback', () => {
    const bogusId = 'fabricated_mock_id_99999';
    const result = getEvidenceById(bogusId);
    assert.equal(result, undefined, 'Unknown ID must return undefined without synthesizing content');
  });

  test('Fact statuses accurately preserve verified, told, and claim', () => {
    // Verified: Order form / Contract
    const docContract = getEvidenceById('doc_a_contract');
    assert.equal(docContract?.factStatus, 'verified');

    // Told: Stakeholder spoken claims during calls/meetings
    const toldFact = getEvidenceById('km_usage_0');
    assert.equal(toldFact?.factStatus, 'told');

    // Claim: Unbacked customer ROI claims
    const claimFact = getEvidenceById('email_b_savings');
    assert.equal(claimFact?.factStatus, 'claim');
  });
});

describe('Priority 4: Persistent MCP Rate Limiting & Concurrency Lock', () => {
  test('Persistent lock rejects parallel / simultaneous in-flight executions', () => {
    // Force clean state
    releaseLock(0);

    const firstAcquire = acquireLock();
    assert.equal(firstAcquire.acquired, true, 'First lock acquisition must succeed');

    // Immediate second acquisition while first is in-flight must be rejected
    const secondAcquire = acquireLock();
    assert.equal(secondAcquire.acquired, false, 'Simultaneous in-flight call must be rejected');
    assert.ok(secondAcquire.error?.includes('in flight'), 'Rejection reason must mention in flight');

    // Release lock with cooldown
    releaseLock(61);
  });

  test('Rate limiter enforces 60-second cooldown window across all instances', () => {
    // Set lock released with 61-second cooldown
    releaseLock(61);

    // Call attempted immediately after finish must be rejected by cooldown
    const cooldownAttempt = acquireLock();
    assert.equal(cooldownAttempt.acquired, false, 'Call within 60s cooldown must be rejected');
    assert.ok(cooldownAttempt.retryAfterSeconds > 0, 'Must report positive retryAfterSeconds');
    assert.ok(cooldownAttempt.retryAfterSeconds <= 61, 'retryAfterSeconds must be <= 61s');

    const status = getRateLimitStatus();
    assert.equal(status.canCallNow, false, 'getRateLimitStatus must report canCallNow: false');
    assert.ok(status.secondsRemaining > 0, 'Must have retry cooldown');
  });
});

describe('Priority 5 & 6: Live Signal Deduplication & Action Ranks', () => {
  test('Live signals are deduplicated by stable ID', () => {
    const initialCount = getCRMData().signals.length;
    const testSignalId = 'TEST-SIG-DYNAMIC-' + Date.now();

    appendLiveSignal({
      id: testSignalId,
      timestamp: new Date().toISOString(),
      accountId: 'A',
      text: 'Test stable signal',
      sourceId: 'test_runner',
    });

    const afterFirstInsert = getCRMData().signals.length;
    assert.equal(afterFirstInsert, initialCount + 1, 'First insertion must increment signals');

    // Duplicate insert of same ID
    appendLiveSignal({
      id: testSignalId,
      timestamp: new Date().toISOString(),
      accountId: 'A',
      text: 'Duplicate signal attempt',
      sourceId: 'test_runner',
    });

    const afterSecondInsert = getCRMData().signals.length;
    assert.equal(afterSecondInsert, afterFirstInsert, 'Duplicate insertion must be ignored');
  });

  test('Action item priority scores match sum of scoring factors', () => {
    const ecpa = getAccountById('A');
    const aldermoor = getAccountById('B');

    const allActions = [...(ecpa?.allActions || []), ...(aldermoor?.allActions || [])];
    assert.ok(allActions.length >= 8, 'Must have at least 8 total actions across accounts');

    for (const act of allActions) {
      const expectedScore = 
        act.scoringFactors.dealValueWeight +
        act.scoringFactors.deadlineUrgency +
        act.scoringFactors.blockerClearance +
        act.scoringFactors.evidenceReadiness;

      assert.equal(
        act.priorityScore, 
        expectedScore, 
        `Action ${act.id} priorityScore (${act.priorityScore}) must match sum of factors (${expectedScore})`
      );
      assert.ok(act.responsibleOwner.length > 0, `Action ${act.id} must have a responsible owner`);
      assert.ok(act.dueDate.length > 0, `Action ${act.id} must have a due date`);
      assert.ok(act.relatedDealId.length > 0, `Action ${act.id} must cite related deal ID`);
    }
  });

  test('Gaps and unknown roles are explicitly labeled and uninvented', () => {
    const aldermoor = getAccountById('B');
    assert.ok(aldermoor, 'Aldermoor must exist');

    // Gap 1: Group Finance named signatory
    const gapFinance = aldermoor.knowledgeGaps.find((g) => g.id === 'gap_b_1');
    assert.ok(gapFinance, 'Group Finance gap must exist');
    assert.equal(gapFinance.status, 'confirmed_not_available');
    assert.equal(gapFinance.blocksDealProgression, true);

    // Gap 2: Plant serial mapping
    const gapInstalls = aldermoor.knowledgeGaps.find((g) => g.id === 'gap_b_2');
    assert.ok(gapInstalls, 'Plant serial mapping gap must exist');
    assert.equal(gapInstalls.status, 'not_found_in_records');

    // Unmet stakeholders
    const nadia = aldermoor.stakeholders.find((s) => s.id === 'nadia_rahman');
    assert.ok(nadia, 'Nadia Rahman must exist');
    assert.equal(nadia.isMet, false, 'Nadia must be marked unmet');
    assert.equal(nadia.decisionMakerStatus, 'unknown', 'Nadia decision maker status must be unknown');
  });
});
