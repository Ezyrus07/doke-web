'use strict';

const {
  hashCanonicalPayload,
  contractError,
  assertNoSensitivePaymentData
} = require('./payment-provider-contract');
const {
  CONTRACT_VERSION,
  buildReconciliationCase,
  compareReconciliationSnapshots,
  assertComparisonFingerprint
} = require('./payment-reconciliation-contract');

const QUEUE_STATUSES = Object.freeze([
  'open',
  'triaged',
  'replay_review',
  'approved_for_replay',
  'dry_run_passed',
  'replay_submitted',
  'pending_verification',
  'resolved',
  'dismissed',
  'escalated'
]);
const TRIAGE_OUTCOMES = Object.freeze([
  'investigate_provider',
  'await_provider_event',
  'request_replay_review',
  'dismiss_false_positive',
  'escalate'
]);
const OPERATOR_ROLES = Object.freeze(['support', 'admin']);
const REPLAY_APPROVAL_TTL_SECONDS = 15 * 60;

function createPaymentReconciliationQueue(options) {
  const settings = options && typeof options === 'object' ? options : {};
  const store = settings.store;
  assertStore(store);
  const now = () => normalizeNow(settings.now);

  return Object.freeze({
    enqueue(comparison) {
      return enqueueCase(store, comparison, now());
    },
    triage(caseId, actor, input) {
      return triageCase(store, caseId, actor, input, now());
    },
    approveReplay(caseId, actor, input) {
      return approveReplay(store, caseId, actor, input, now());
    },
    buildReplayCommand(caseId, actor, input) {
      return buildReplayCommand(store, caseId, actor, input, now());
    },
    recordReplayOutcome(caseId, actor, input) {
      return recordReplayOutcome(store, caseId, actor, input, now());
    },
    resolveWithFreshComparison(caseId, actor, comparison) {
      return resolveWithFreshComparison(store, caseId, actor, comparison, now());
    }
  });
}

async function enqueueCase(store, comparisonInput, now) {
  const comparison = comparisonInput && comparisonInput.contractVersion === CONTRACT_VERSION
    ? comparisonInput
    : compareReconciliationSnapshots(comparisonInput);
  const candidate = buildReconciliationCase(comparison);
  const existing = await store.getByCaseKey(candidate.caseKey);
  if (existing) {
    if (existing.comparisonFingerprint === candidate.comparisonFingerprint && !isTerminal(existing.status)) {
      return Object.freeze({ created: false, replayed: true, case: freezeClone(existing) });
    }
    throw contractError(
      'DOKE_PAYMENT_RECONCILIATION_CASE_CONFLICT',
      'An existing reconciliation case has another snapshot fingerprint and must be refreshed explicitly.',
      409
    );
  }
  const inserted = await store.insert({ ...candidate, createdAt: now, updatedAt: now });
  return Object.freeze({ created: true, replayed: false, case: freezeClone(inserted) });
}

async function triageCase(store, caseId, actorInput, input, now) {
  const actor = normalizeOperator(actorInput);
  const source = plainObject(input, 'Triage decision is required.');
  assertNoSensitivePaymentData(source, 'reconciliationTriage');
  const current = await requireCase(store, caseId);
  assertStatus(current, ['open', 'triaged', 'escalated']);

  const outcome = String(source.outcome || '').trim().toLowerCase();
  if (!TRIAGE_OUTCOMES.includes(outcome)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_TRIAGE_INVALID', 'Triage outcome is invalid.', 422);
  }
  const rationale = rationaleText(source.rationale);
  if (outcome === 'request_replay_review' && !current.replayCandidate) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_REPLAY_NOT_ELIGIBLE', 'This divergence is not eligible for controlled replay.', 409);
  }

  const status = outcome === 'request_replay_review'
    ? 'replay_review'
    : outcome === 'dismiss_false_positive'
      ? 'dismissed'
      : outcome === 'escalate'
        ? 'escalated'
        : 'triaged';

  const updated = await updateCase(store, current, {
    status,
    triage: {
      outcome,
      rationale,
      actorId: actor.id,
      actorRole: actor.role,
      at: now
    },
    updatedAt: now
  });
  return freezeClone(updated);
}

async function approveReplay(store, caseId, actorInput, input, now) {
  const actor = normalizeOperator(actorInput);
  const source = plainObject(input, 'Replay approval is required.');
  assertNoSensitivePaymentData(source, 'reconciliationReplayApproval');
  const current = await requireCase(store, caseId);
  assertStatus(current, ['replay_review']);
  if (!current.replayCandidate) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_REPLAY_NOT_ELIGIBLE', 'Case is not eligible for controlled replay.', 409);
  }
  if (current.triage && current.triage.actorId === actor.id) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_SEPARATION_REQUIRED', 'Replay approval requires a second operator.', 403);
  }
  if (current.severity === 'critical' && actor.role !== 'admin') {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_ADMIN_REQUIRED', 'Critical replay approval requires an admin.', 403);
  }

  assertComparisonFingerprint(source.expectedComparisonFingerprint, current.comparisonFingerprint);
  const evidence = normalizeReplayEvidence(source.evidence);
  const rationale = rationaleText(source.rationale);
  const approvalId = `recon_approval_${hashCanonicalPayload({
    caseId: current.caseId,
    actorId: actor.id,
    comparisonFingerprint: current.comparisonFingerprint,
    eventId: evidence.eventId,
    at: now
  }).slice(0, 28)}`;
  const expiresAt = new Date(Date.parse(now) + REPLAY_APPROVAL_TTL_SECONDS * 1000).toISOString();

  const updated = await updateCase(store, current, {
    status: 'approved_for_replay',
    replayApproval: {
      approvalId,
      actorId: actor.id,
      actorRole: actor.role,
      rationale,
      expectedComparisonFingerprint: current.comparisonFingerprint,
      evidence,
      approvedAt: now,
      expiresAt
    },
    updatedAt: now
  });
  return freezeClone(updated);
}

async function buildReplayCommand(store, caseId, actorInput, input, now) {
  const actor = normalizeOperator(actorInput);
  const source = plainObject(input, 'Replay command input is required.');
  assertNoSensitivePaymentData(source, 'reconciliationReplayCommand');
  const current = await requireCase(store, caseId);
  assertStatus(current, ['approved_for_replay', 'dry_run_passed']);
  const approval = current.replayApproval;
  if (!approval || Date.parse(approval.expiresAt) <= Date.parse(now)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_APPROVAL_EXPIRED', 'Replay approval is missing or expired.', 409);
  }
  assertComparisonFingerprint(source.expectedComparisonFingerprint, current.comparisonFingerprint);
  const idempotencyKey = identifier(source.idempotencyKey, 'idempotencyKey', 200);
  const mode = current.status === 'approved_for_replay' ? 'dry_run' : 'apply_after_dry_run';

  return Object.freeze({
    contractVersion: 'pay-reconciliation-replay-command-v1',
    action: 'payments.providerWebhook.reconcileReplay',
    commandId: `pay_replay_${hashCanonicalPayload({
      caseId: current.caseId,
      approvalId: approval.approvalId,
      idempotencyKey,
      mode
    }).slice(0, 32)}`,
    caseId: current.caseId,
    caseKey: current.caseKey,
    provider: current.provider,
    intentKey: current.intentKey,
    comparisonFingerprint: current.comparisonFingerprint,
    approvalId: approval.approvalId,
    evidence: approval.evidence,
    requestedBy: Object.freeze({ id: actor.id, role: actor.role }),
    idempotencyKey,
    mode,
    dryRunRequired: true,
    originalVerifiedRawBodyHashRequired: true,
    signatureReverificationRequired: true,
    eventLedgerTransitionRequiresAtomicServerRuntime: true,
    directPaymentMutationAllowed: false,
    directWalletMutationAllowed: false,
    directRefundMutationAllowed: false,
    directPayoutMutationAllowed: false,
    financialMutationAuthority: 'none_in_repository_contract',
    auditRequired: true,
    requestedAt: now
  });
}

async function recordReplayOutcome(store, caseId, actorInput, input, now) {
  const actor = normalizeOperator(actorInput);
  const source = plainObject(input, 'Replay outcome is required.');
  const current = await requireCase(store, caseId);
  assertStatus(current, ['approved_for_replay', 'dry_run_passed', 'replay_submitted']);
  const outcome = String(source.outcome || '').trim().toLowerCase();
  if (!['dry_run_passed', 'dry_run_failed', 'replay_submitted', 'replay_failed'].includes(outcome)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_REPLAY_OUTCOME_INVALID', 'Replay outcome is invalid.', 422);
  }
  const status = outcome === 'dry_run_passed'
    ? 'dry_run_passed'
    : outcome === 'replay_submitted'
      ? 'pending_verification'
      : 'escalated';
  const updated = await updateCase(store, current, {
    status,
    replayOutcome: {
      outcome,
      actorId: actor.id,
      actorRole: actor.role,
      note: rationaleText(source.note),
      at: now
    },
    updatedAt: now
  });
  return freezeClone(updated);
}

async function resolveWithFreshComparison(store, caseId, actorInput, comparisonInput, now) {
  const actor = normalizeOperator(actorInput);
  const current = await requireCase(store, caseId);
  assertStatus(current, ['triaged', 'pending_verification', 'escalated']);
  const comparison = comparisonInput && comparisonInput.contractVersion === CONTRACT_VERSION
    ? comparisonInput
    : compareReconciliationSnapshots(comparisonInput);
  if (!comparison.matched) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_NOT_RESOLVED', 'Fresh comparison still contains divergences.', 409);
  }
  if (comparison.provider !== current.provider || comparison.intentKey !== current.intentKey) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_IDENTITY_CONFLICT', 'Fresh comparison belongs to another payment intent.', 409);
  }
  const updated = await updateCase(store, current, {
    status: 'resolved',
    resolvedBy: { actorId: actor.id, actorRole: actor.role, at: now },
    resolutionFingerprint: comparison.comparisonFingerprint,
    updatedAt: now
  });
  return freezeClone(updated);
}

function normalizeReplayEvidence(value) {
  const source = plainObject(value, 'Replay evidence is required.');
  const payloadHash = identifier(source.payloadHash, 'payloadHash', 64).toLowerCase();
  const rawBodyHash = identifier(source.rawBodyHash, 'rawBodyHash', 64).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(payloadHash) || !/^[0-9a-f]{64}$/.test(rawBodyHash)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_REPLAY_HASH_INVALID', 'Replay evidence hashes must be SHA-256 hex.', 422);
  }
  return Object.freeze({
    provider: identifier(source.provider, 'provider', 80).toLowerCase(),
    eventId: identifier(source.eventId, 'eventId', 200),
    payloadHash,
    rawBodyHash,
    signatureVerifiedAt: isoDate(source.signatureVerifiedAt, 'signatureVerifiedAt')
  });
}

async function requireCase(store, caseId) {
  const id = identifier(caseId, 'caseId', 100);
  const current = await store.getById(id);
  if (!current) throw contractError('DOKE_PAYMENT_RECONCILIATION_CASE_NOT_FOUND', 'Reconciliation case was not found.', 404);
  return current;
}

async function updateCase(store, current, patch) {
  const result = await store.update(current.caseId, {
    ...patch,
    revision: Number(current.revision || 0) + 1
  }, { expectedRevision: Number(current.revision || 0) });
  if (!result) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_CONCURRENT_UPDATE', 'Reconciliation case changed concurrently.', 409);
  }
  return result;
}

function normalizeOperator(value) {
  const source = plainObject(value, 'Operator identity is required.');
  const id = identifier(source.id, 'actor.id', 180);
  const role = String(source.role || '').trim().toLowerCase();
  if (!OPERATOR_ROLES.includes(role)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_OPERATOR_REQUIRED', 'Support or admin operator is required.', 403);
  }
  return Object.freeze({ id, role });
}

function assertStore(store) {
  const required = ['getByCaseKey', 'getById', 'insert', 'update'];
  if (!store || required.some((method) => typeof store[method] !== 'function')) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_STORE_UNAVAILABLE', 'Reconciliation queue requires a configured server-side store adapter.', 503);
  }
}

function assertStatus(current, allowed) {
  if (!QUEUE_STATUSES.includes(current.status) || !allowed.includes(current.status)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_STATUS_CONFLICT', `Case status ${current.status || 'unknown'} does not allow this operation.`, 409);
  }
}

function isTerminal(status) {
  return status === 'resolved' || status === 'dismissed';
}

function rationaleText(value) {
  const text = String(value == null ? '' : value).trim();
  if (text.length < 20 || text.length > 2000) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_RATIONALE_REQUIRED', 'Operator rationale must contain 20 to 2000 characters.', 422);
  }
  return text;
}

function identifier(value, field, maxLength) {
  const text = String(value == null ? '' : value).trim();
  if (!text || text.length > maxLength || /[\u0000-\u001f\u007f]/.test(text)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_FIELD_INVALID', `Reconciliation field ${field} is invalid.`, 422);
  }
  return text;
}

function plainObject(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_INPUT_INVALID', message, 422);
  }
  return value;
}

function isoDate(value, field) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_DATE_INVALID', `${field} must be a valid ISO date.`, 422);
  }
  return new Date(timestamp).toISOString();
}

function normalizeNow(value) {
  const resolved = typeof value === 'function' ? value() : value;
  const timestamp = Date.parse(resolved || new Date().toISOString());
  if (!Number.isFinite(timestamp)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_CLOCK_INVALID', 'Reconciliation clock is invalid.', 500);
  }
  return new Date(timestamp).toISOString();
}

function freezeClone(value) {
  return Object.freeze(JSON.parse(JSON.stringify(value)));
}

module.exports = Object.freeze({
  QUEUE_STATUSES,
  TRIAGE_OUTCOMES,
  OPERATOR_ROLES,
  REPLAY_APPROVAL_TTL_SECONDS,
  createPaymentReconciliationQueue,
  enqueueCase,
  triageCase,
  approveReplay,
  buildReplayCommand,
  recordReplayOutcome,
  resolveWithFreshComparison
});
