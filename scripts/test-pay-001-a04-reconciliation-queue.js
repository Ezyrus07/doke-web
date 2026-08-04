'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  normalizeReconciliationSnapshot,
  compareReconciliationSnapshots
} = require('../backend/modules/payments/payment-reconciliation-contract');
const {
  createPaymentReconciliationQueue
} = require('../backend/modules/payments/payment-reconciliation-queue');

const NOW = '2026-08-03T13:40:00.000Z';
const SUPPORT = Object.freeze({ id: '11111111-1111-4111-8111-111111111111', role: 'support' });
const ADMIN = Object.freeze({ id: '22222222-2222-4222-8222-222222222222', role: 'admin' });
const CLIENT = Object.freeze({ id: '33333333-3333-4333-8333-333333333333', role: 'client' });
const HASH_A = crypto.createHash('sha256').update('a').digest('hex');
const HASH_B = crypto.createHash('sha256').update('b').digest('hex');

function snapshot(authority, overrides) {
  return {
    authority,
    provider: 'fixture-adapter',
    intentKey: 'payment_intent:order_001:charge_001',
    providerIntentId: 'provider_intent_001',
    orderId: 'order_001',
    paymentId: 'payment_001',
    state: 'held',
    currency: 'BRL',
    grossAmountCents: 10000,
    feeAmountCents: 1000,
    netAmountCents: 9000,
    releasedAmountCents: 0,
    refundedAmountCents: 0,
    settlementReference: null,
    eventLedgerStatus: authority === 'doke' ? 'succeeded' : 'not_applicable',
    observedAt: NOW,
    providerUpdatedAt: NOW,
    metadata: { source: 'pay-a04-runtime-test' },
    ...(overrides || {})
  };
}

function memoryStore() {
  const byId = new Map();
  const byKey = new Map();
  return {
    async getByCaseKey(key) { return byKey.get(key) || null; },
    async getById(id) { return byId.get(id) || null; },
    async insert(value) {
      const clone = JSON.parse(JSON.stringify(value));
      byId.set(clone.caseId, clone);
      byKey.set(clone.caseKey, clone);
      return clone;
    },
    async update(id, patch, options) {
      const current = byId.get(id);
      if (!current || Number(current.revision) !== Number(options.expectedRevision)) return null;
      const next = { ...current, ...JSON.parse(JSON.stringify(patch)) };
      byId.set(id, next);
      byKey.set(next.caseKey, next);
      return next;
    }
  };
}

async function expectReject(fn, code) {
  let caught = null;
  try { await fn(); } catch (error) { caught = error; }
  assert.ok(caught, `Expected ${code} rejection.`);
  assert.equal(caught.code, code);
}

async function main() {
  const normalized = normalizeReconciliationSnapshot(snapshot('doke'));
  assert.match(normalized.snapshotHash, /^[0-9a-f]{64}$/);

  assert.throws(
    () => normalizeReconciliationSnapshot(snapshot('provider', { metadata: { cardNumber: '4111111111111111' } })),
    (error) => error && error.code === 'DOKE_PAYMENT_SENSITIVE_DATA_FORBIDDEN'
  );

  const matched = compareReconciliationSnapshots({
    internalSnapshot: snapshot('doke'),
    providerSnapshot: snapshot('provider'),
    detectedAt: NOW
  });
  assert.equal(matched.matched, true);
  assert.equal(matched.severity, 'none');
  assert.equal(matched.automaticMoneyMutationAllowed, false);

  const amountMismatch = compareReconciliationSnapshots({
    internalSnapshot: snapshot('doke'),
    providerSnapshot: snapshot('provider', {
      grossAmountCents: 11000,
      feeAmountCents: 1000,
      netAmountCents: 10000
    }),
    detectedAt: NOW
  });
  assert.equal(amountMismatch.severity, 'critical');
  assert.ok(amountMismatch.divergences.some((item) => item.code === 'gross_amount_mismatch'));
  assert.equal(amountMismatch.replayCandidate, false);

  const missingInternal = compareReconciliationSnapshots({
    providerSnapshot: snapshot('provider'),
    detectedAt: NOW
  });
  assert.equal(missingInternal.severity, 'critical');
  assert.ok(missingInternal.divergences.some((item) => item.code === 'internal_snapshot_missing'));

  const failedEvent = compareReconciliationSnapshots({
    internalSnapshot: snapshot('doke', { eventLedgerStatus: 'failed' }),
    providerSnapshot: snapshot('provider'),
    detectedAt: NOW
  });
  assert.equal(failedEvent.severity, 'high');
  assert.equal(failedEvent.replayCandidate, true);
  assert.ok(failedEvent.divergences.some((item) => item.code === 'event_ledger_failed'));

  assert.throws(
    () => createPaymentReconciliationQueue({ now: NOW }),
    (error) => error && error.code === 'DOKE_PAYMENT_RECONCILIATION_STORE_UNAVAILABLE'
  );

  const store = memoryStore();
  const queue = createPaymentReconciliationQueue({ store, now: NOW });
  const enqueued = await queue.enqueue(failedEvent);
  assert.equal(enqueued.created, true);
  assert.equal(enqueued.case.status, 'open');
  assert.equal(enqueued.case.directMoneyMutationAllowed, false);

  const replayed = await queue.enqueue(failedEvent);
  assert.equal(replayed.created, false);
  assert.equal(replayed.replayed, true);

  await expectReject(
    () => queue.triage(enqueued.case.caseId, CLIENT, {
      outcome: 'request_replay_review',
      rationale: 'Cliente não pode operar reconciliação financeira.'
    }),
    'DOKE_PAYMENT_RECONCILIATION_OPERATOR_REQUIRED'
  );

  const triaged = await queue.triage(enqueued.case.caseId, SUPPORT, {
    outcome: 'request_replay_review',
    rationale: 'Evento verificado falhou e precisa de revisão controlada.'
  });
  assert.equal(triaged.status, 'replay_review');

  await expectReject(
    () => queue.approveReplay(enqueued.case.caseId, SUPPORT, {
      expectedComparisonFingerprint: failedEvent.comparisonFingerprint,
      rationale: 'O mesmo operador não pode aprovar o próprio pedido de replay.',
      evidence: {
        provider: 'fixture-adapter',
        eventId: 'provider_event_001',
        payloadHash: HASH_A,
        rawBodyHash: HASH_B,
        signatureVerifiedAt: NOW
      }
    }),
    'DOKE_PAYMENT_RECONCILIATION_SEPARATION_REQUIRED'
  );

  const approved = await queue.approveReplay(enqueued.case.caseId, ADMIN, {
    expectedComparisonFingerprint: failedEvent.comparisonFingerprint,
    rationale: 'A evidência assinada confere e autoriza apenas o dry-run controlado.',
    evidence: {
      provider: 'fixture-adapter',
      eventId: 'provider_event_001',
      payloadHash: HASH_A,
      rawBodyHash: HASH_B,
      signatureVerifiedAt: NOW
    }
  });
  assert.equal(approved.status, 'approved_for_replay');

  await expectReject(
    () => queue.buildReplayCommand(enqueued.case.caseId, ADMIN, {
      expectedComparisonFingerprint: HASH_A,
      idempotencyKey: 'pay-a04-replay-001'
    }),
    'DOKE_PAYMENT_RECONCILIATION_STALE_SNAPSHOT'
  );

  const command = await queue.buildReplayCommand(enqueued.case.caseId, ADMIN, {
    expectedComparisonFingerprint: failedEvent.comparisonFingerprint,
    idempotencyKey: 'pay-a04-replay-001'
  });
  assert.equal(command.mode, 'dry_run');
  assert.equal(command.dryRunRequired, true);
  assert.equal(command.directPaymentMutationAllowed, false);
  assert.equal(command.directWalletMutationAllowed, false);
  assert.equal(command.directRefundMutationAllowed, false);
  assert.equal(command.directPayoutMutationAllowed, false);
  assert.equal(command.financialMutationAuthority, 'none_in_repository_contract');

  const dryRun = await queue.recordReplayOutcome(enqueued.case.caseId, ADMIN, {
    outcome: 'dry_run_passed',
    note: 'Dry-run validou assinatura, identidade e transição sem aplicar dinheiro.'
  });
  assert.equal(dryRun.status, 'dry_run_passed');

  const applyCommand = await queue.buildReplayCommand(enqueued.case.caseId, ADMIN, {
    expectedComparisonFingerprint: failedEvent.comparisonFingerprint,
    idempotencyKey: 'pay-a04-replay-apply-001'
  });
  assert.equal(applyCommand.mode, 'apply_after_dry_run');
  assert.equal(applyCommand.eventLedgerTransitionRequiresAtomicServerRuntime, true);

  const submitted = await queue.recordReplayOutcome(enqueued.case.caseId, ADMIN, {
    outcome: 'replay_submitted',
    note: 'Replay foi apenas submetido; resolução depende de nova comparação.'
  });
  assert.equal(submitted.status, 'pending_verification');

  await expectReject(
    () => queue.resolveWithFreshComparison(enqueued.case.caseId, ADMIN, failedEvent),
    'DOKE_PAYMENT_RECONCILIATION_NOT_RESOLVED'
  );

  const resolved = await queue.resolveWithFreshComparison(enqueued.case.caseId, ADMIN, matched);
  assert.equal(resolved.status, 'resolved');

  console.log('PAY-A04 reconciliation and controlled replay runtime test passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
