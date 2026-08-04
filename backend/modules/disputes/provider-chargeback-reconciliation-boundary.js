'use strict';

const crypto = require('node:crypto');

const CONTRACT_ID = 'dsp-a04-provider-chargeback-reconciliation-boundary-v1';
const OBSERVATION_VERSION = 'dsp-provider-chargeback-observation-v1';
const CHAIN_VERSION = 'dsp-provider-chargeback-observation-chain-v1';
const RECONCILIATION_VERSION = 'dsp-chargeback-reconciliation-v1';

const PROVIDER_STATES = Object.freeze([
  'unknown',
  'opened',
  'evidence_due',
  'evidence_submitted',
  'under_review',
  'won',
  'lost',
  'reversed'
]);

const OBSERVATION_SOURCES = Object.freeze([
  'signed_webhook',
  'authenticated_poll',
  'authenticated_api_response',
  'provider_statement'
]);

const RECONCILIATION_STATES = Object.freeze([
  'provider_unknown',
  'provider_open',
  'evidence_required',
  'provider_review',
  'reconciliation_required',
  'reconciled_won',
  'reconciled_lost',
  'reversed',
  'conflict'
]);

const FINAL_PROVIDER_STATES = Object.freeze(['won', 'lost', 'reversed']);
const FINAL_RECONCILIATION_STATES = Object.freeze(['reconciled_won', 'reconciled_lost', 'reversed']);

const ALLOWED_TRANSITIONS = Object.freeze({
  unknown: Object.freeze(['unknown', 'opened']),
  opened: Object.freeze(['opened', 'evidence_due', 'evidence_submitted', 'under_review', 'won', 'lost']),
  evidence_due: Object.freeze(['evidence_due', 'evidence_submitted', 'under_review', 'won', 'lost']),
  evidence_submitted: Object.freeze(['evidence_submitted', 'under_review', 'won', 'lost']),
  under_review: Object.freeze(['under_review', 'won', 'lost']),
  won: Object.freeze(['won', 'reversed']),
  lost: Object.freeze(['lost', 'reversed']),
  reversed: Object.freeze(['reversed'])
});

const SENSITIVE_KEYS = Object.freeze([
  'card_number', 'cardnumber', 'pan', 'cvv', 'cvc', 'security_code', 'securitycode',
  'api_key', 'apikey', 'client_secret', 'clientsecret', 'provider_secret', 'providersecret',
  'access_token', 'accesstoken', 'refresh_token', 'refreshtoken', 'authorization',
  'webhook_secret', 'webhooksecret', 'signature_secret', 'signaturesecret',
  'bank_account_snapshot', 'bankaccountsnapshot', 'account_number', 'accountnumber',
  'pix_key', 'pixkey', 'raw_body', 'rawbody', 'evidence_body', 'evidencebody'
]);

class ProviderChargebackBoundaryError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'ProviderChargebackBoundaryError';
    this.code = code;
    this.details = details || null;
  }
}

function fail(code, message, details) {
  throw new ProviderChargebackBoundaryError(code, message, details);
}

function normalizeToken(value) {
  return String(value == null ? '' : value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function text(value, maxLength = 200) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function stableSerialize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function fingerprint(value, field) {
  const body = { ...value };
  delete body[field];
  return sha256(stableSerialize(body));
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ''));
}

function isIsoInstant(value) {
  const source = String(value || '');
  return /^\d{4}-\d{2}-\d{2}T/.test(source) && Number.isFinite(Date.parse(source));
}

function assertOpaque(value, prefix, field) {
  const source = text(value, 220);
  const expression = new RegExp(`^${prefix}_[A-Za-z0-9_-]{12,200}$`);
  if (!expression.test(source)) fail('DSP_A04_OPAQUE_REFERENCE_INVALID', `${field} must be an opaque ${prefix}_ reference`);
  return source;
}

function assertNoSensitiveData(value, path = '$') {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSensitiveData(item, `${path}[${index}]`));
    return true;
  }
  if (typeof value !== 'object') return true;
  Object.entries(value).forEach(([key, entry]) => {
    const normalized = normalizeToken(key).replace(/_/g, '');
    if (SENSITIVE_KEYS.some((candidate) => candidate.replace(/_/g, '') === normalized)) {
      fail('DSP_A04_SENSITIVE_DATA_FORBIDDEN', `Sensitive field ${path}.${key} is forbidden`);
    }
    assertNoSensitiveData(entry, `${path}.${key}`);
  });
  return true;
}

function assertDeniedAuthority(value) {
  [
    'runtimeMutationAuthority',
    'providerSubmissionAuthority',
    'providerDecisionAuthority',
    'refundAuthority',
    'releaseAuthority',
    'chargebackAuthority',
    'realMoneyAuthority',
    'stagingAuthority',
    'productionAuthority'
  ].forEach((field) => {
    if (value[field] !== false) fail('DSP_A04_AUTHORITY_FORBIDDEN', `${field} must remain false`);
  });
  return true;
}

function normalizeProviderState(value) {
  const token = normalizeToken(value);
  const aliases = {
    notification_received: 'opened',
    dispute_opened: 'opened',
    needs_response: 'evidence_due',
    evidence_required: 'evidence_due',
    submitted: 'evidence_submitted',
    evidence_received: 'evidence_submitted',
    provider_review: 'under_review',
    review: 'under_review',
    resolved_won: 'won',
    resolved_lost: 'lost',
    chargeback_won: 'won',
    chargeback_lost: 'lost',
    reversal: 'reversed'
  };
  const normalized = PROVIDER_STATES.includes(token) ? token : aliases[token];
  if (!normalized) fail('DSP_A04_PROVIDER_STATE_UNSUPPORTED', `Unsupported provider state: ${token || 'empty'}`);
  return normalized;
}

function createProviderChargebackObservation(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    fail('DSP_A04_OBSERVATION_INVALID', 'Provider observation input is required');
  }
  assertNoSensitiveData(input);

  const providerAdapterRef = assertOpaque(input.providerAdapterRef, 'pspa', 'providerAdapterRef');
  const providerEventId = assertOpaque(input.providerEventId, 'pevt', 'providerEventId');
  const providerDisputeRef = assertOpaque(input.providerDisputeRef, 'pdsp', 'providerDisputeRef');
  const transactionRef = assertOpaque(input.transactionRef, 'txn', 'transactionRef');
  const caseRef = assertOpaque(input.caseRef, 'dsp', 'caseRef');
  const providerState = normalizeProviderState(input.providerState);
  const source = normalizeToken(input.source);
  const providerSequence = Number(input.providerSequence);
  const amountCents = Number(input.amountCents);
  const currency = text(input.currency || 'BRL', 3).toUpperCase();
  const occurredAt = text(input.occurredAt, 64);
  const receivedAt = text(input.receivedAt, 64);
  const evidenceFingerprint = text(input.evidenceFingerprint, 64).toLowerCase();
  const transactionFingerprint = text(input.transactionFingerprint, 64).toLowerCase();
  const caseFingerprint = text(input.caseFingerprint, 64).toLowerCase();
  const signatureVerified = input.signatureVerified === true;
  const authenticatedChannel = input.authenticatedChannel === true;

  if (!OBSERVATION_SOURCES.includes(source)) fail('DSP_A04_SOURCE_UNSUPPORTED', `Unsupported observation source: ${source || 'empty'}`);
  if (!Number.isSafeInteger(providerSequence) || providerSequence < 1) fail('DSP_A04_SEQUENCE_INVALID', 'providerSequence must be a positive safe integer');
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) fail('DSP_A04_AMOUNT_INVALID', 'amountCents must be a positive safe integer');
  if (currency !== 'BRL') fail('DSP_A04_CURRENCY_UNSUPPORTED', 'Only BRL is supported by this contract');
  if (!isIsoInstant(occurredAt) || !isIsoInstant(receivedAt) || Date.parse(occurredAt) > Date.parse(receivedAt)) {
    fail('DSP_A04_TIMESTAMP_INVALID', 'Observation timestamps are invalid');
  }
  [evidenceFingerprint, transactionFingerprint, caseFingerprint].forEach((value) => {
    if (!isSha256(value)) fail('DSP_A04_FINGERPRINT_INVALID', 'Observation fingerprints must be SHA-256');
  });
  if (source === 'signed_webhook' && !signatureVerified) {
    fail('DSP_A04_WEBHOOK_SIGNATURE_REQUIRED', 'Signed webhook observations require verified signatures');
  }
  if (source !== 'signed_webhook' && !authenticatedChannel) {
    fail('DSP_A04_AUTHENTICATED_CHANNEL_REQUIRED', 'Non-webhook observations require an authenticated channel');
  }
  if (source === 'provider_statement' && !isSha256(input.statementFingerprint)) {
    fail('DSP_A04_STATEMENT_FINGERPRINT_REQUIRED', 'Provider statement observations require a statement fingerprint');
  }

  const body = {
    observationVersion: OBSERVATION_VERSION,
    contractId: CONTRACT_ID,
    providerAdapterRef,
    providerEventId,
    providerDisputeRef,
    transactionRef,
    caseRef,
    providerState,
    source,
    providerSequence,
    amountCents,
    currency,
    occurredAt,
    receivedAt,
    evidenceFingerprint,
    transactionFingerprint,
    caseFingerprint,
    statementFingerprint: source === 'provider_statement' ? String(input.statementFingerprint).toLowerCase() : null,
    signatureVerified,
    authenticatedChannel,
    runtimeMutationAuthority: false,
    providerSubmissionAuthority: false,
    providerDecisionAuthority: false,
    refundAuthority: false,
    releaseAuthority: false,
    chargebackAuthority: false,
    realMoneyAuthority: false,
    stagingAuthority: false,
    productionAuthority: false
  };

  return Object.freeze({ ...body, observationFingerprint: fingerprint(body, 'observationFingerprint') });
}

function validateProviderChargebackObservation(observation) {
  if (!observation || observation.observationVersion !== OBSERVATION_VERSION || observation.contractId !== CONTRACT_ID) {
    fail('DSP_A04_OBSERVATION_INVALID', 'Unsupported provider chargeback observation');
  }
  assertNoSensitiveData(observation);
  const rebuilt = createProviderChargebackObservation(observation);
  if (!isSha256(observation.observationFingerprint) || observation.observationFingerprint !== rebuilt.observationFingerprint) {
    fail('DSP_A04_OBSERVATION_FINGERPRINT_MISMATCH', 'Observation fingerprint mismatch');
  }
  assertDeniedAuthority(observation);
  return rebuilt;
}

function buildProviderObservationChain(observations) {
  if (!Array.isArray(observations) || observations.length < 1) {
    fail('DSP_A04_CHAIN_EMPTY', 'At least one provider observation is required');
  }

  const valid = observations.map(validateProviderChargebackObservation);
  const first = valid[0];
  const identities = ['providerAdapterRef', 'providerDisputeRef', 'transactionRef', 'caseRef', 'amountCents', 'currency', 'transactionFingerprint', 'caseFingerprint'];
  valid.forEach((observation) => {
    identities.forEach((field) => {
      if (observation[field] !== first[field]) fail('DSP_A04_CHAIN_IDENTITY_MISMATCH', `Observation chain field ${field} does not match`);
    });
  });

  const byEventId = new Map();
  const bySequence = new Map();
  let replayCount = 0;

  valid.forEach((observation) => {
    const priorEvent = byEventId.get(observation.providerEventId);
    if (priorEvent) {
      if (priorEvent.observationFingerprint !== observation.observationFingerprint) {
        fail('DSP_A04_EVENT_ID_CONFLICT', 'Provider event id was reused with different content');
      }
      replayCount += 1;
      return;
    }
    const priorSequence = bySequence.get(observation.providerSequence);
    if (priorSequence && priorSequence.observationFingerprint !== observation.observationFingerprint) {
      fail('DSP_A04_SEQUENCE_CONFLICT', 'Provider sequence was reused with different content');
    }
    byEventId.set(observation.providerEventId, observation);
    bySequence.set(observation.providerSequence, observation);
  });

  const unique = Array.from(byEventId.values()).sort((a, b) => {
    if (a.providerSequence !== b.providerSequence) return a.providerSequence - b.providerSequence;
    return a.providerEventId.localeCompare(b.providerEventId);
  });

  for (let index = 1; index < unique.length; index += 1) {
    const previous = unique[index - 1];
    const current = unique[index];
    if (current.providerSequence <= previous.providerSequence) fail('DSP_A04_SEQUENCE_ORDER_INVALID', 'Provider sequence must increase');
    if (!ALLOWED_TRANSITIONS[previous.providerState].includes(current.providerState)) {
      fail('DSP_A04_PROVIDER_TRANSITION_INVALID', `${previous.providerState} cannot transition to ${current.providerState}`);
    }
    if (Date.parse(current.occurredAt) < Date.parse(previous.occurredAt)) {
      fail('DSP_A04_EVENT_TIME_ORDER_INVALID', 'Provider event time regressed');
    }
  }

  const latest = unique[unique.length - 1];
  const sourceSet = Array.from(new Set(unique.map((observation) => observation.source))).sort();
  const chainBody = {
    chainVersion: CHAIN_VERSION,
    contractId: CONTRACT_ID,
    providerAdapterRef: first.providerAdapterRef,
    providerDisputeRef: first.providerDisputeRef,
    transactionRef: first.transactionRef,
    caseRef: first.caseRef,
    amountCents: first.amountCents,
    currency: first.currency,
    transactionFingerprint: first.transactionFingerprint,
    caseFingerprint: first.caseFingerprint,
    observations: unique.map((observation) => ({
      providerEventId: observation.providerEventId,
      providerSequence: observation.providerSequence,
      providerState: observation.providerState,
      source: observation.source,
      occurredAt: observation.occurredAt,
      observationFingerprint: observation.observationFingerprint
    })),
    latestProviderState: latest.providerState,
    latestProviderSequence: latest.providerSequence,
    finalProviderStateObserved: FINAL_PROVIDER_STATES.includes(latest.providerState),
    distinctSources: sourceSet,
    replayCount,
    conflictDetected: false,
    runtimeMutationAuthority: false,
    providerSubmissionAuthority: false,
    providerDecisionAuthority: false,
    refundAuthority: false,
    releaseAuthority: false,
    chargebackAuthority: false,
    realMoneyAuthority: false,
    stagingAuthority: false,
    productionAuthority: false
  };

  return Object.freeze({ ...chainBody, chainFingerprint: fingerprint(chainBody, 'chainFingerprint') });
}

function validateProviderObservationChain(chain) {
  if (!chain || chain.chainVersion !== CHAIN_VERSION || chain.contractId !== CONTRACT_ID) {
    fail('DSP_A04_CHAIN_INVALID', 'Unsupported provider observation chain');
  }
  assertNoSensitiveData(chain);
  if (!Array.isArray(chain.observations) || !chain.observations.length) fail('DSP_A04_CHAIN_EMPTY', 'Chain observations are required');
  if (!isSha256(chain.chainFingerprint) || chain.chainFingerprint !== fingerprint(chain, 'chainFingerprint')) {
    fail('DSP_A04_CHAIN_FINGERPRINT_MISMATCH', 'Observation chain fingerprint mismatch');
  }
  assertDeniedAuthority(chain);
  return chain;
}

function reconciliationStateFor(providerState, matched) {
  if (providerState === 'unknown') return 'provider_unknown';
  if (providerState === 'opened') return 'provider_open';
  if (providerState === 'evidence_due') return 'evidence_required';
  if (providerState === 'evidence_submitted' || providerState === 'under_review') return 'provider_review';
  if (!matched) return 'reconciliation_required';
  if (providerState === 'won') return 'reconciled_won';
  if (providerState === 'lost') return 'reconciled_lost';
  if (providerState === 'reversed') return 'reversed';
  return 'reconciliation_required';
}

function createChargebackReconciliation(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    fail('DSP_A04_RECONCILIATION_INVALID', 'Chargeback reconciliation input is required');
  }
  assertNoSensitiveData(input);
  const chain = validateProviderObservationChain(input.chain);

  const providerLedgerFingerprint = text(input.providerLedgerFingerprint, 64).toLowerCase();
  const accountingFingerprint = text(input.accountingFingerprint, 64).toLowerCase();
  const evidenceBundleFingerprint = text(input.evidenceBundleFingerprint, 64).toLowerCase();
  const lifecycleSnapshotFingerprint = text(input.lifecycleSnapshotFingerprint, 64).toLowerCase();
  [providerLedgerFingerprint, accountingFingerprint, evidenceBundleFingerprint, lifecycleSnapshotFingerprint].forEach((value) => {
    if (!isSha256(value)) fail('DSP_A04_RECONCILIATION_FINGERPRINT_INVALID', 'Reconciliation fingerprints must be SHA-256');
  });

  const checks = Object.freeze({
    eventChainVerified: input.eventChainVerified === true,
    providerLedgerMatched: input.providerLedgerMatched === true,
    transactionMatched: input.transactionMatched === true,
    caseMatched: input.caseMatched === true,
    amountCurrencyMatched: input.amountCurrencyMatched === true,
    disputeReferenceMatched: input.disputeReferenceMatched === true,
    evidenceBundleBound: input.evidenceBundleBound === true,
    lifecycleSnapshotBound: input.lifecycleSnapshotBound === true,
    auditRecorded: input.auditRecorded === true
  });
  const allMatched = Object.values(checks).every(Boolean);
  const finalObserved = FINAL_PROVIDER_STATES.includes(chain.latestProviderState);

  if (finalObserved && !chain.finalProviderStateObserved) fail('DSP_A04_FINAL_STATE_INCONSISTENT', 'Final provider state flag is inconsistent');
  if (finalObserved && chain.distinctSources.length < 1) fail('DSP_A04_SOURCE_EVIDENCE_REQUIRED', 'Final provider result requires an authenticated observation source');

  const reconciliationState = reconciliationStateFor(chain.latestProviderState, finalObserved && allMatched);
  const body = {
    reconciliationVersion: RECONCILIATION_VERSION,
    contractId: CONTRACT_ID,
    providerDisputeRef: chain.providerDisputeRef,
    transactionRef: chain.transactionRef,
    caseRef: chain.caseRef,
    amountCents: chain.amountCents,
    currency: chain.currency,
    latestProviderState: chain.latestProviderState,
    chainFingerprint: chain.chainFingerprint,
    providerLedgerFingerprint,
    accountingFingerprint,
    evidenceBundleFingerprint,
    lifecycleSnapshotFingerprint,
    checks,
    reconciliationState,
    terminal: FINAL_RECONCILIATION_STATES.includes(reconciliationState),
    providerResultTrustedAlone: false,
    singleWebhookSufficient: false,
    runtimeMutationAuthority: false,
    providerSubmissionAuthority: false,
    providerDecisionAuthority: false,
    refundAuthority: false,
    releaseAuthority: false,
    chargebackAuthority: false,
    realMoneyAuthority: false,
    stagingAuthority: false,
    productionAuthority: false
  };

  return Object.freeze({ ...body, reconciliationFingerprint: fingerprint(body, 'reconciliationFingerprint') });
}

function validateChargebackReconciliation(reconciliation) {
  if (!reconciliation || reconciliation.reconciliationVersion !== RECONCILIATION_VERSION || reconciliation.contractId !== CONTRACT_ID) {
    fail('DSP_A04_RECONCILIATION_INVALID', 'Unsupported chargeback reconciliation');
  }
  assertNoSensitiveData(reconciliation);
  if (!RECONCILIATION_STATES.includes(reconciliation.reconciliationState)) {
    fail('DSP_A04_RECONCILIATION_STATE_INVALID', 'Unsupported reconciliation state');
  }
  if (!isSha256(reconciliation.reconciliationFingerprint) || reconciliation.reconciliationFingerprint !== fingerprint(reconciliation, 'reconciliationFingerprint')) {
    fail('DSP_A04_RECONCILIATION_FINGERPRINT_MISMATCH', 'Reconciliation fingerprint mismatch');
  }
  if (reconciliation.terminal !== FINAL_RECONCILIATION_STATES.includes(reconciliation.reconciliationState)) {
    fail('DSP_A04_TERMINAL_FLAG_INVALID', 'Terminal flag is inconsistent');
  }
  if (reconciliation.providerResultTrustedAlone !== false || reconciliation.singleWebhookSufficient !== false) {
    fail('DSP_A04_SINGLE_SIGNAL_TRUST_FORBIDDEN', 'A single provider signal cannot establish reconciled authority');
  }
  assertDeniedAuthority(reconciliation);
  return reconciliation;
}

function readiness(input) {
  const source = input || {};
  const structuralReady = Boolean(
    source.observationChainValid &&
    source.reconciliationValid &&
    source.providerNeutral &&
    source.noSensitiveData &&
    source.noSingleWebhookTrust
  );
  return Object.freeze({
    contractId: CONTRACT_ID,
    structuralReady,
    runtimeIntegrated: false,
    providerSelected: false,
    providerCredentialsConfigured: false,
    stagingValidated: false,
    chargebackSubmissionAllowed: false,
    providerDecisionAuthority: false,
    financialEffectAllowed: false,
    productionAllowed: false,
    blockers: Object.freeze(['DSP-B01', 'DSP-B03', 'DSP-B04', 'PAY-B01', 'PAY-B03', 'PAY-B04', 'WAL-B02', 'WAL-B03', 'WAL-B04'])
  });
}

module.exports = {
  CONTRACT_ID,
  OBSERVATION_VERSION,
  CHAIN_VERSION,
  RECONCILIATION_VERSION,
  PROVIDER_STATES,
  OBSERVATION_SOURCES,
  RECONCILIATION_STATES,
  FINAL_PROVIDER_STATES,
  FINAL_RECONCILIATION_STATES,
  ProviderChargebackBoundaryError,
  normalizeProviderState,
  assertNoSensitiveData,
  createProviderChargebackObservation,
  validateProviderChargebackObservation,
  buildProviderObservationChain,
  validateProviderObservationChain,
  createChargebackReconciliation,
  validateChargebackReconciliation,
  readiness
};
