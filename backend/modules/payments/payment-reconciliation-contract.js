'use strict';

const {
  assertNoSensitivePaymentData,
  hashCanonicalPayload,
  contractError
} = require('./payment-provider-contract');

const CONTRACT_VERSION = 'pay-reconciliation-contract-v1';
const SNAPSHOT_AUTHORITIES = Object.freeze(['doke', 'provider']);
const PAYMENT_STATES = Object.freeze([
  'requires_provider',
  'pending_provider',
  'requires_action',
  'authorized',
  'held',
  'released',
  'refunded',
  'failed',
  'cancelled',
  'disputed'
]);
const EVENT_LEDGER_STATUSES = Object.freeze([
  'succeeded',
  'claimed',
  'failed',
  'missing',
  'not_applicable'
]);
const SEVERITY_RANK = Object.freeze({
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
});
const PRIORITY_BY_SEVERITY = Object.freeze({
  none: 'P4',
  low: 'P3',
  medium: 'P2',
  high: 'P1',
  critical: 'P0'
});
const REPLAY_BLOCKING_DIVERGENCES = Object.freeze([
  'internal_snapshot_missing',
  'provider_snapshot_missing',
  'provider_identity_mismatch',
  'currency_mismatch',
  'gross_amount_mismatch',
  'net_amount_mismatch',
  'released_amount_mismatch',
  'refunded_amount_mismatch',
  'duplicate_provider_object'
]);

function normalizeReconciliationSnapshot(input) {
  const source = plainObject(input, 'Reconciliation snapshot is required.');
  assertNoSensitivePaymentData(source, 'reconciliationSnapshot');

  const authority = identifier(source.authority, 'authority', 20).toLowerCase();
  if (!SNAPSHOT_AUTHORITIES.includes(authority)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_AUTHORITY_INVALID', 'Snapshot authority must be doke or provider.', 422);
  }

  const provider = identifier(source.provider, 'provider', 80).toLowerCase();
  const intentKey = identifier(source.intentKey, 'intentKey', 400);
  const providerIntentId = identifier(source.providerIntentId, 'providerIntentId', 200);
  const orderId = identifier(source.orderId, 'orderId', 180);
  const paymentId = optionalIdentifier(source.paymentId, 'paymentId', 180);
  const state = identifier(source.state, 'state', 40).toLowerCase();
  if (!PAYMENT_STATES.includes(state)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_STATE_INVALID', `Unsupported normalized payment state: ${state}.`, 422);
  }

  const currency = String(source.currency || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_CURRENCY_INVALID', 'Snapshot currency must be an ISO alpha code.', 422);
  }

  const grossAmountCents = nonNegativeInteger(source.grossAmountCents, 'grossAmountCents');
  const feeAmountCents = nonNegativeInteger(source.feeAmountCents, 'feeAmountCents');
  const netAmountCents = nonNegativeInteger(source.netAmountCents, 'netAmountCents');
  const releasedAmountCents = nonNegativeInteger(source.releasedAmountCents || 0, 'releasedAmountCents');
  const refundedAmountCents = nonNegativeInteger(source.refundedAmountCents || 0, 'refundedAmountCents');
  if (feeAmountCents + netAmountCents !== grossAmountCents) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_AMOUNT_INVALID', 'Fee plus net amount must equal gross amount.', 422);
  }
  if (releasedAmountCents > grossAmountCents || refundedAmountCents > grossAmountCents) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_AMOUNT_INVALID', 'Released or refunded amount exceeds gross amount.', 422);
  }

  const eventLedgerStatus = String(source.eventLedgerStatus || 'not_applicable').trim().toLowerCase();
  if (!EVENT_LEDGER_STATUSES.includes(eventLedgerStatus)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_LEDGER_STATUS_INVALID', 'Event ledger status is invalid.', 422);
  }

  const canonical = Object.freeze({
    contractVersion: CONTRACT_VERSION,
    authority,
    provider,
    intentKey,
    providerIntentId,
    orderId,
    paymentId,
    state,
    currency,
    grossAmountCents,
    feeAmountCents,
    netAmountCents,
    releasedAmountCents,
    refundedAmountCents,
    settlementReference: optionalIdentifier(source.settlementReference, 'settlementReference', 240),
    eventLedgerStatus,
    observedAt: isoDate(source.observedAt, 'observedAt'),
    providerUpdatedAt: optionalIsoDate(source.providerUpdatedAt),
    metadata: normalizeMetadata(source.metadata)
  });

  return Object.freeze({
    ...canonical,
    snapshotHash: hashCanonicalPayload(canonical)
  });
}

function compareReconciliationSnapshots(input) {
  const source = plainObject(input, 'Reconciliation comparison input is required.');
  const internalSnapshot = source.internalSnapshot == null ? null : normalizeReconciliationSnapshot(source.internalSnapshot);
  const providerSnapshot = source.providerSnapshot == null ? null : normalizeReconciliationSnapshot(source.providerSnapshot);
  if (!internalSnapshot && !providerSnapshot) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_SNAPSHOTS_REQUIRED', 'At least one reconciliation snapshot is required.', 422);
  }
  if (internalSnapshot && internalSnapshot.authority !== 'doke') {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_INTERNAL_AUTHORITY_INVALID', 'Internal snapshot must use doke authority.', 422);
  }
  if (providerSnapshot && providerSnapshot.authority !== 'provider') {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_PROVIDER_AUTHORITY_INVALID', 'Provider snapshot must use provider authority.', 422);
  }

  const divergences = [];
  if (!internalSnapshot) {
    divergences.push(divergence('internal_snapshot_missing', 'critical', 'Provider object has no Doke financial projection.', 'freeze_and_investigate'));
  }
  if (!providerSnapshot) {
    divergences.push(divergence('provider_snapshot_missing', 'high', 'Doke projection has no corresponding provider object.', 'query_provider_and_events'));
  }

  if (internalSnapshot && providerSnapshot) {
    compareIdentity(internalSnapshot, providerSnapshot, divergences);
    compareField(internalSnapshot.currency, providerSnapshot.currency, 'currency_mismatch', 'critical', 'Currency differs between Doke and provider.', 'freeze_and_investigate', divergences);
    compareField(internalSnapshot.grossAmountCents, providerSnapshot.grossAmountCents, 'gross_amount_mismatch', 'critical', 'Gross amount differs between Doke and provider.', 'freeze_and_investigate', divergences);
    compareField(internalSnapshot.feeAmountCents, providerSnapshot.feeAmountCents, 'fee_amount_mismatch', 'medium', 'Fee amount differs between Doke and provider.', 'review_fee_configuration', divergences);
    compareField(internalSnapshot.netAmountCents, providerSnapshot.netAmountCents, 'net_amount_mismatch', 'critical', 'Net amount differs between Doke and provider.', 'freeze_and_investigate', divergences);
    compareField(internalSnapshot.releasedAmountCents, providerSnapshot.releasedAmountCents, 'released_amount_mismatch', 'critical', 'Released amount differs between Doke and provider.', 'freeze_and_investigate', divergences);
    compareField(internalSnapshot.refundedAmountCents, providerSnapshot.refundedAmountCents, 'refunded_amount_mismatch', 'critical', 'Refunded amount differs between Doke and provider.', 'freeze_and_investigate', divergences);
    if (internalSnapshot.state !== providerSnapshot.state) {
      divergences.push(divergence('state_mismatch', 'high', `Doke state ${internalSnapshot.state} differs from provider state ${providerSnapshot.state}.`, 'inspect_event_sequence'));
    }
    if (requiresSettlementReference(providerSnapshot.state) && !providerSnapshot.settlementReference) {
      divergences.push(divergence('provider_settlement_reference_missing', 'high', 'Provider terminal money state lacks a settlement reference.', 'query_provider_settlement'));
    }
    if (internalSnapshot.settlementReference && providerSnapshot.settlementReference
        && internalSnapshot.settlementReference !== providerSnapshot.settlementReference) {
      divergences.push(divergence('settlement_reference_mismatch', 'high', 'Settlement references differ between Doke and provider.', 'freeze_and_investigate'));
    }
    appendLedgerDivergence(internalSnapshot.eventLedgerStatus, divergences);
  }

  const severity = highestSeverity(divergences);
  const provider = (providerSnapshot || internalSnapshot).provider;
  const intentKey = (providerSnapshot || internalSnapshot).intentKey;
  const fingerprintPayload = Object.freeze({
    provider,
    intentKey,
    internalSnapshotHash: internalSnapshot && internalSnapshot.snapshotHash || null,
    providerSnapshotHash: providerSnapshot && providerSnapshot.snapshotHash || null,
    divergences: divergences.map((item) => ({ code: item.code, severity: item.severity }))
  });
  const comparisonFingerprint = hashCanonicalPayload(fingerprintPayload);
  const replayCandidate = isReplayCandidate(divergences);

  return Object.freeze({
    contractVersion: CONTRACT_VERSION,
    provider,
    intentKey,
    internalSnapshot,
    providerSnapshot,
    divergences: Object.freeze(divergences),
    matched: divergences.length === 0,
    severity,
    priority: PRIORITY_BY_SEVERITY[severity],
    comparisonFingerprint,
    replayCandidate,
    automaticResolutionAllowed: false,
    automaticMoneyMutationAllowed: false,
    detectedAt: isoDate(source.detectedAt || new Date().toISOString(), 'detectedAt')
  });
}

function buildReconciliationCase(comparisonInput) {
  const comparison = comparisonInput && comparisonInput.contractVersion === CONTRACT_VERSION
    ? comparisonInput
    : compareReconciliationSnapshots(comparisonInput);
  if (comparison.matched) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_CASE_NOT_REQUIRED', 'Matched snapshots must not enter the operator queue.', 409);
  }
  const caseHash = hashCanonicalPayload({
    provider: comparison.provider,
    intentKey: comparison.intentKey,
    comparisonFingerprint: comparison.comparisonFingerprint
  });
  return Object.freeze({
    contractVersion: CONTRACT_VERSION,
    caseId: `pay_recon_${caseHash.slice(0, 32)}`,
    caseKey: `pay:reconciliation:${comparison.provider}:${comparison.intentKey}`.slice(0, 240),
    provider: comparison.provider,
    intentKey: comparison.intentKey,
    status: 'open',
    revision: 1,
    severity: comparison.severity,
    priority: comparison.priority,
    comparisonFingerprint: comparison.comparisonFingerprint,
    replayCandidate: comparison.replayCandidate,
    divergenceCodes: Object.freeze(comparison.divergences.map((item) => item.code)),
    comparison,
    requiresOperator: true,
    automaticResolutionAllowed: false,
    directMoneyMutationAllowed: false,
    createdAt: comparison.detectedAt,
    updatedAt: comparison.detectedAt
  });
}

function assertComparisonFingerprint(expected, actual) {
  const left = String(expected || '').trim();
  const right = String(actual || '').trim();
  if (!left || !right || left !== right) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_STALE_SNAPSHOT', 'Reconciliation snapshot changed and must be compared again.', 409);
  }
  return true;
}

function compareIdentity(internalSnapshot, providerSnapshot, divergences) {
  const fields = ['provider', 'intentKey', 'providerIntentId', 'orderId'];
  fields.forEach((field) => {
    if (internalSnapshot[field] !== providerSnapshot[field]) {
      divergences.push(divergence('provider_identity_mismatch', 'critical', `Financial identity field ${field} differs.`, 'freeze_and_investigate'));
    }
  });
  if (internalSnapshot.paymentId && providerSnapshot.paymentId && internalSnapshot.paymentId !== providerSnapshot.paymentId) {
    divergences.push(divergence('provider_identity_mismatch', 'critical', 'Payment identity differs between Doke and provider.', 'freeze_and_investigate'));
  }
}

function appendLedgerDivergence(status, divergences) {
  if (status === 'failed') {
    divergences.push(divergence('event_ledger_failed', 'high', 'Verified provider event previously failed during processing.', 'request_controlled_replay_review'));
  } else if (status === 'claimed') {
    divergences.push(divergence('event_ledger_in_progress', 'low', 'Provider event remains claimed and may still be processing.', 'await_or_investigate_timeout'));
  } else if (status === 'missing') {
    divergences.push(divergence('event_ledger_missing', 'high', 'Provider state has no corresponding verified event ledger entry.', 'fetch_missing_provider_event'));
  }
}

function compareField(left, right, code, severity, message, action, divergences) {
  if (left !== right) divergences.push(divergence(code, severity, message, action));
}

function divergence(code, severity, message, recommendedAction) {
  return Object.freeze({ code, severity, message, recommendedAction });
}

function isReplayCandidate(divergences) {
  const codes = divergences.map((item) => item.code);
  const hasReplaySignal = codes.includes('event_ledger_failed') || codes.includes('event_ledger_missing');
  const hasBlocker = codes.some((code) => REPLAY_BLOCKING_DIVERGENCES.includes(code));
  return hasReplaySignal && !hasBlocker;
}

function highestSeverity(divergences) {
  return divergences.reduce((highest, item) => (
    SEVERITY_RANK[item.severity] > SEVERITY_RANK[highest] ? item.severity : highest
  ), 'none');
}

function requiresSettlementReference(state) {
  return state === 'released' || state === 'refunded';
}

function normalizeMetadata(value) {
  if (value == null) return Object.freeze({});
  const source = plainObject(value, 'Reconciliation metadata must be an object.');
  assertNoSensitivePaymentData(source, 'reconciliationMetadata');
  const result = {};
  ['source', 'requestId', 'providerObjectType', 'providerEventId'].forEach((field) => {
    const text = String(source[field] == null ? '' : source[field]).trim();
    if (text) result[field] = text.slice(0, 160);
  });
  return Object.freeze(result);
}

function plainObject(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_INPUT_INVALID', message, 422);
  }
  return value;
}

function identifier(value, field, maxLength) {
  const text = String(value == null ? '' : value).trim();
  if (!text || text.length > maxLength || /[\u0000-\u001f\u007f]/.test(text)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_FIELD_INVALID', `Reconciliation field ${field} is invalid.`, 422);
  }
  return text;
}

function optionalIdentifier(value, field, maxLength) {
  if (value == null || String(value).trim() === '') return null;
  return identifier(value, field, maxLength);
}

function nonNegativeInteger(value, field) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_AMOUNT_INVALID', `${field} must be a non-negative integer in minor currency units.`, 422);
  }
  return number;
}

function isoDate(value, field) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_DATE_INVALID', `${field} must be a valid ISO date.`, 422);
  }
  return new Date(timestamp).toISOString();
}

function optionalIsoDate(value) {
  if (value == null || String(value).trim() === '') return null;
  return isoDate(value, 'providerUpdatedAt');
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  SNAPSHOT_AUTHORITIES,
  PAYMENT_STATES,
  EVENT_LEDGER_STATUSES,
  SEVERITY_RANK,
  PRIORITY_BY_SEVERITY,
  normalizeReconciliationSnapshot,
  compareReconciliationSnapshots,
  buildReconciliationCase,
  assertComparisonFingerprint
});
