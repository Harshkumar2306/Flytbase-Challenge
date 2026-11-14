process.env.NODE_ENV = 'test';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { 
  getCRMData, 
  getAccountById, 
  getDealById, 
  getEvidenceById, 
  appendLiveSignal,
  appendCRMNote
} from '../src/lib/data-store.ts';
import { 
  acquireLock, 
  releaseLock, 
  releaseLockOnError,
  getRateLimitStatus 
} from '../src/lib/mcp.ts';
import { 
  getStoredNotes, 
  getStoredNotesAsync,
  saveStoredNote, 
  saveStoredNoteAsync,
  updateStoredNoteStatus,
  saveStoredSignal,
  saveStoredSignalAsync,
  getStoredSignals,
  getStoredSignalsAsync,
  getStorageDiagnostics
} from '../src/lib/storage.ts';

describe('Priority 1 & 2: Financial Provenance & Separation of Tiers', () => {
  const data = getCRMData();
  const ecpa = getAccountById('A');
  const aldermoor = getAccountById('B');

  test('Account A (ECPA) strictly separates signed contract from discovery estimates & nominal cap', () => {
    assert.ok(ecpa, 'Account A must exist');
    // Tier 1: Executed commercial order form baseline (35 docks @ £10,000/yr)
    assert.equal(ecpa.signedContractBaseline, 350000, 'ECPA signed contract baseline must be £350,000');
    // Tier 2: Qualified discovery progression estimate across 4 deals (not booked revenue)
    assert.equal(ecpa.qualifiedDiscoveryEstimate, 731440, 'ECPA morning discovery estimate must be £731,440');
    // Tier 3: Uncommitted nominal framework ambition ceiling
    assert.equal(ecpa.nominalOpportunityCeiling, 2300000, 'ECPA nominal framework ceiling must be £2,300,000');

    // Sum of deals supportedValue matches qualifiedDiscoveryEstimate
    const dealsSum = ecpa.deals.reduce((sum, d) => sum + d.supportedValue, 0);
    assert.equal(dealsSum, ecpa.qualifiedDiscoveryEstimate, 'Sum of deal supported values must equal £731,440');
  });

  test('Account B (Aldermoor) retains €140,000 as existing contract baseline and isolates €1.2M savings claim', () => {
    assert.ok(aldermoor, 'Account B must exist');
    // Existing contract baseline: 14 docks @ €10,000/yr expiring 31 Jan 2027 (NOT a secured renewal)
    assert.equal(aldermoor.signedContractBaseline, 140000, 'Aldermoor contract baseline must be €140,000');
    // Future qualified discovery pipeline for new expansion deals is €0
    assert.equal(aldermoor.futurePipelineEstimate, 0, 'Aldermoor future discovery pipeline for new expansion deals must be €0');
    assert.equal(aldermoor.supportedPipeline, 140000, 'Supported contract baseline is €140,000 (doc_b_contract)');
    
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

  test('Every deal has an explicit calculation model and does NOT cite its own deal ID', () => {
    const dealIds = new Set(['a_renewal', 'a_tarn', 'a_westmere', 'a_tender', 'b_renewal', 'b_idle_plants', 'b_sister_company', 'b_priority_support']);
    
    for (const acc of data.accounts) {
      for (const deal of acc.deals) {
        assert.ok(deal.calculation, `Deal ${deal.id} must have a calculation model`);
        assert.ok(deal.calculation.formula.length > 0, `Deal ${deal.id} must have a formula`);
        assert.ok(deal.calculation.inputs.length > 0, `Deal ${deal.id} must have calculation inputs`);
        assert.ok(deal.evidenceIds.length > 0, `Deal ${deal.id} must cite at least one evidence ID`);

        // Check that calculation inputs do not self-reference deal IDs
        for (const input of deal.calculation.inputs) {
          assert.equal(
            dealIds.has(input.sourceId), 
            false, 
            `Deal calculation for ${deal.id} must NOT cite deal ID ${input.sourceId} as its valuation source`
          );
        }
      }
    }
  });
});

describe('Priority 3: Complete Evidence Audit (100% Genuine IDs)', () => {
  const data = getCRMData();

  test('100% of cited evidence IDs across all deals, stakeholders, risks, actions, and gaps resolve to genuine records', () => {
    const missing = [];
    let checkedCount = 0;

    function checkList(list, context) {
      if (!list) return;
      for (const id of list) {
        checkedCount++;
        const resolved = getEvidenceById(id);
        if (!resolved) {
          missing.push(`${context} -> ${id}`);
        }
      }
    }

    for (const acc of data.accounts) {
      for (const d of acc.deals) {
        checkList(d.evidenceIds, `deal ${d.id}`);
        if (d.calculation) {
          checkList(d.calculation.inputs.map((i) => i.sourceId), `deal calc ${d.id}`);
        }
      }
      for (const s of acc.stakeholders) {
        checkList(s.evidenceIds, `stakeholder ${s.id}`);
      }
      for (const r of acc.risks) {
        checkList(r.evidenceIds, `risk ${r.id}`);
      }
      for (const a of acc.allActions) {
        checkList(a.evidenceIds, `action ${a.id}`);
      }
      for (const g of acc.knowledgeGaps) {
        checkList(g.evidenceIds, `gap ${g.id}`);
      }
    }

    assert.ok(checkedCount >= 30, `Must verify at least 30 evidence citations (checked: ${checkedCount})`);
    assert.deepEqual(missing, [], `Every cited ID must resolve. Found missing: ${missing.join(', ')}`);
  });

  test('Key operational records resolve to authentic contents without fabrication', () => {
    const flightLog = getEvidenceById('flight_log_force_month');
    assert.ok(flightLog, 'flight_log_force_month must resolve');
    assert.equal(flightLog.factStatus, 'verified');
    assert.ok(flightLog.content.includes('Westmere'), 'Flight log must contain Westmere record');

    const heliCost = getEvidenceById('helicopter_cost_overtime');
    assert.ok(heliCost, 'helicopter_cost_overtime must resolve');
    assert.equal(heliCost.factStatus, 'verified');

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

    const financeEmail = getEvidenceById('email_b_finance');
    assert.ok(financeEmail, 'email_b_finance must resolve');
    assert.ok(financeEmail.content.includes('quote') || financeEmail.content.includes('renewal'));
  });

  test('Missing or non-existent IDs return undefined with ZERO fabricated fallback', () => {
    const bogusId = 'fabricated_mock_id_99999';
    const result = getEvidenceById(bogusId);
    assert.equal(result, undefined, 'Unknown ID must return undefined without synthesizing content');
  });
});

describe('Priority 4 & 5: Distributed Locking, Storage Persistence & Idempotency', () => {
  test('Distributed lock enforces 60-second cooldown and rejects simultaneous calls', async () => {
    // Release any previous lock
    await releaseLock(0);

    const first = await acquireLock();
    assert.equal(first.acquired, true, 'First lock acquisition must succeed');

    // Attempt second simultaneous call while first is in-flight
    const second = await acquireLock();
    assert.equal(second.acquired, false, 'Simultaneous call must be rejected');
    assert.ok(second.error?.includes('in flight') || second.error?.includes('cooldown'));

    // Release with 61 second cooldown
    await releaseLock(61);

    // Call attempted during cooldown must be rejected
    const cooldownCall = await acquireLock();
    assert.equal(cooldownCall.acquired, false, 'Call in cooldown must be rejected');
    assert.ok(cooldownCall.retryAfterSeconds > 0, 'Must report positive retryAfterSeconds');
  });

  test('Uncertain network error conservatively preserves cooldown', async () => {
    // Simulate error after dispatch
    await releaseLockOnError(61);

    const status = getRateLimitStatus();
    assert.equal(status.canCallNow, false, 'Rate limit must remain active after error');
    assert.ok(status.secondsRemaining > 0, 'Seconds remaining must be positive');
  });

  test('Notes persist across reloads with explicit syncStatus tracking', () => {
    const noteId = `test_note_${Date.now()}`;
    const testNote = {
      id: noteId,
      accountId: 'A',
      kind: 'next_step',
      title: 'Persistent Storage Test',
      text: 'Testing cold start durability',
      createdAt: new Date().toISOString(),
      author: 'Test Runner',
      syncStatus: 'saved_locally_pending',
    };

    saveStoredNote(testNote);
    const stored = getStoredNotes();
    const found = stored.find((n) => n.id === noteId);
    assert.ok(found, 'Note must exist in stored notes');
    assert.equal(found.syncStatus, 'saved_locally_pending');

    // Update to confirmed remote synced
    const confirmedTime = new Date().toISOString();
    updateStoredNoteStatus(noteId, 'synced', confirmedTime);

    const updatedStored = getStoredNotes();
    const updatedFound = updatedStored.find((n) => n.id === noteId);
    assert.ok(updatedFound, 'Updated note must exist');
    assert.equal(updatedFound.syncStatus, 'synced');
    assert.equal(updatedFound.remoteConfirmedAt, confirmedTime);
  });

  test('Composite key deduplication preserves distinct events with identical text at different times', () => {
    const uniqueTime1 = '2026-11-14T09:00:00.000Z';
    const uniqueTime2 = '2026-11-14T09:05:00.000Z';
    const sharedText = 'Drone patrol completed successfully';

    const sig1 = {
      id: `sig_${Date.now()}_1`,
      timestamp: uniqueTime1,
      sourceId: 'event_stream',
      text: sharedText,
      accountId: 'A',
    };

    const sig2 = {
      id: `sig_${Date.now()}_2`,
      timestamp: uniqueTime2,
      sourceId: 'event_stream',
      text: sharedText,
      accountId: 'A',
    };

    const inserted1 = saveStoredSignal(sig1);
    const inserted2 = saveStoredSignal(sig2);

    assert.equal(inserted1, true, 'First event must be inserted');
    assert.equal(inserted2, true, 'Second event with different timestamp must NOT be discarded');

    // Duplicate attempt of exact same event
    const dupAttempt = saveStoredSignal(sig1);
    assert.equal(dupAttempt, false, 'Exact duplicate event must be deduplicated');
  });

  test('Storage diagnostics expose active engine and telemetry', async () => {
    const diag = getStorageDiagnostics();
    assert.ok(['vercel_kv', 'atomic_file_store'].includes(diag.engine));
    assert.ok(typeof diag.engineDescription === 'string');
    assert.ok(typeof diag.isDistributed === 'boolean');
    assert.ok(typeof diag.notesCount === 'number');
    assert.ok(typeof diag.signalsCount === 'number');

    const { getStorageDiagnosticsAsync } = await import('../src/lib/storage.ts');
    const asyncDiag = await getStorageDiagnosticsAsync();
    assert.ok(['vercel_kv', 'atomic_file_store'].includes(asyncDiag.engine));
    assert.ok(typeof asyncDiag.notesCount === 'number');
  });

  test('Async storage methods read and persist notes and signals seamlessly', async () => {
    const asyncNoteId = `async_note_${Date.now()}`;
    await saveStoredNoteAsync({
      id: asyncNoteId,
      accountId: 'A',
      kind: 'task',
      title: 'Async Persistence Verification',
      text: 'Validating async storage pipeline',
      createdAt: new Date().toISOString(),
      author: 'Async Test',
      syncStatus: 'saved_locally_pending',
    });

    const asyncNotes = await getStoredNotesAsync();
    const found = asyncNotes.find((n) => n.id === asyncNoteId);
    assert.ok(found, 'Async saved note must be readable via getStoredNotesAsync');

    const asyncSigId = `async_sig_${Date.now()}`;
    const inserted = await saveStoredSignalAsync({
      id: asyncSigId,
      timestamp: new Date().toISOString(),
      sourceId: 'async_stream',
      text: 'Async signal persistence verified',
      accountId: 'A',
    });
    assert.equal(inserted, true, 'Async signal must be successfully saved');

    const asyncSignals = await getStoredSignalsAsync();
    const sigFound = asyncSignals.find((s) => s.id === asyncSigId);
    assert.ok(sigFound, 'Async saved signal must be readable via getStoredSignalsAsync');
  });

  test('Safe lock release enforces owner-token verification', async () => {
    // Release any prior lock
    await releaseLock(0);

    const first = await acquireLock();
    assert.equal(first.acquired, true, 'First lock acquisition should succeed');
    assert.ok(first.ownerToken, 'Must issue an ownerToken upon acquisition');

    // Attempt release with WRONG owner token
    await releaseLock('imposter_token_99999', 61);

    // In-flight status must still be protected against unauthorized release
    const status = getRateLimitStatus();
    assert.equal(status.inFlight, true, 'In-flight lock must NOT be released by an imposter token');

    // Release with CORRECT owner token
    await releaseLock(first.ownerToken, 0);
    const postReleaseStatus = getRateLimitStatus();
    assert.equal(postReleaseStatus.inFlight, false, 'Lock must be released when matching owner token is supplied');
  });

  test('Pending notes detection accurately tracks notes awaiting MCP dispatch', async () => {
    const { getPendingNotesAsync } = await import('../src/lib/storage.ts');
    
    const pendingNoteId = `pending_${Date.now()}`;
    await saveStoredNoteAsync({
      id: pendingNoteId,
      accountId: 'A',
      kind: 'task',
      title: 'Pending Note Queue Verification',
      text: 'Note awaiting remote sync',
      createdAt: new Date().toISOString(),
      author: 'Queue Test',
      syncStatus: 'saved_locally_pending',
    });

    const pending = await getPendingNotesAsync();
    const found = pending.find((n) => n.id === pendingNoteId);
    assert.ok(found, 'Pending note must be returned by getPendingNotesAsync');

    // Mark it synced
    await updateStoredNoteStatus(pendingNoteId, 'synced', new Date().toISOString());
    const pendingAfter = await getPendingNotesAsync();
    const foundAfter = pendingAfter.find((n) => n.id === pendingNoteId);
    assert.equal(foundAfter, undefined, 'Synced note must no longer appear in pending queue');
  });

  test('KV command failures return explicit error objects without false positive success', async () => {
    const { kvRestCommand } = await import('../src/lib/storage.ts');
    
    // In test environment without KV configured, command returns ok: false with explicit error
    const result = await kvRestCommand(['PING']);
    assert.equal(result.ok, false, 'Unconfigured KV must return ok: false without throwing silently');
    assert.ok(result.error && result.error.length > 0, 'Must provide explicit error explanation');
  });

  test('Write endpoint enforces mandatory x-crm-write-key authorization and rejects unauthorized callers', async () => {
    const { verifyWriteAccess, DEMO_EVALUATION_KEY } = await import('../src/lib/auth.ts');
    
    // 1. Request with NO authorization header
    const unauthCheck = verifyWriteAccess({});
    assert.equal(unauthCheck.authorized, false, 'Request lacking x-crm-write-key must be rejected');
    assert.ok(unauthCheck.error?.includes('x-crm-write-key'));

    // 2. Request with an invalid key
    const invalidCheck = verifyWriteAccess({ 'x-crm-write-key': 'attacker_random_key' });
    assert.equal(invalidCheck.authorized, false, 'Request with bogus key must be rejected');

    // 3. Request with valid evaluation passkey
    const authCheck = verifyWriteAccess({ 'x-crm-write-key': DEMO_EVALUATION_KEY });
    assert.equal(authCheck.authorized, true, 'Request with valid evaluation key must be accepted');
    assert.equal(authCheck.keySource, 'evaluation_key');
  });
});

describe('Priority 6: Action Scoring Consistency & Power Map', () => {
  test('Action item priority scores strictly match sum of scoring factors', () => {
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
    const ecpa = getAccountById('A');
    const aldermoor = getAccountById('B');
    assert.ok(aldermoor, 'Aldermoor must exist');
    assert.ok(ecpa, 'ECPA must exist');

    // Gap 1: Group Finance named signatory
    const gapFinance = aldermoor.knowledgeGaps.find((g) => g.id === 'gap_b_1');
    assert.ok(gapFinance, 'Group Finance gap must exist');
    assert.equal(gapFinance.status, 'confirmed_not_available');
    assert.equal(gapFinance.blocksDealProgression, true);

    // Unmet stakeholders and authority boundaries
    const nadia = aldermoor.stakeholders.find((s) => s.id === 'nadia_rahman');
    assert.ok(nadia, 'Nadia Rahman must exist');
    assert.equal(nadia.isMet, false, 'Nadia must be marked unmet');
    assert.equal(nadia.decisionMakerStatus, 'unknown', 'Nadia decision maker status must be unknown');
    assert.equal(nadia.payerStatus, 'unknown', 'Nadia renewal budget signing authority must be unconfirmed/unknown');

    const rhys = ecpa.stakeholders.find((s) => s.id === 'rhys_calder');
    assert.ok(rhys, 'Rhys Calder must exist');
    assert.equal(rhys.payerStatus, false, 'Rhys Calder must NOT be marked as payer (rc_funding_2: each force funds own budget)');
  });
});
