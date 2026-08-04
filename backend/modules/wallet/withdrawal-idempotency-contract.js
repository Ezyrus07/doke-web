'use strict';

const crypto = require('node:crypto');

const CONTRACT_VERSION = 'wal-a04-withdrawal-idempotency-v1';
const INTENT_VERSION = 'wallet-withdrawal-intent-v1';
const REQUEST_VERSION = 'wallet-withdrawal-request-envelope-v1';
const OUTCOME_VERSION = 'wallet-withdrawal-outcome-v1';
const DESTINATION_REFERENCE_VERSION = 'wallet-withdrawal-destination-reference-v1';
const LIFECYCLE_STATES = Object.freeze([
  'prepared',
  'claimed',
  'resolution_required',
  'failed_retryable',
  'succeeded',
  'rejected_terminal'
]);
const RETRYABLE_FAILURE_CODES = Object.freeze([
  'TRANSPORT_TIMEOUT',
  'TRANSPORT_CONNECTION_LOST',
  'TRANSPORT_RESPONSE_LOST',
  'GATEWAY_UNAVAILABLE',
  'IDEMPOTENCY_STORE_TEMPORARILY_UNAVAILABLE'
]);
const RESOLUTION_REQUIRED_CODES = Object.freeze([
  'UNKNOWN_AFTER_SUBMIT',
  'RESPONSE_LOST_AFTER_COMMIT',
  'CLIENT_RELOADED_DURING_SUBMIT'
]);
const TERMINAL_REJECTION_CODES = Object.freeze([
  'INSUFFICIENT_BALANCE',
  'DESTINATION_DISABLED',
  'INTENT_EXPIRED',
  'CURRENCY_UNSUPPORTED',
  'WITHDRAWAL_POLICY_REJECTED'
]);
const RAW_BANK_KEYS = Object.freeze([
  'account_holder', 'accountHolder', 'holderName', 'holder',
  'document', 'taxId', 'cpf', 'cnpj',
  'branch', 'agency',
  'account_number', 'accountNumber',
  'pix_key', 'pixKey', 'bankAccount', 'bank_account_snapshot'
]);

class WithdrawalIdempotencyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WithdrawalIdempotencyError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new WithdrawalIdempotencyError(code, message);
}

function canonicalize(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function fingerprint(value, field) {
  const body = { ...value };
  delete body[field];
  return sha256(canonicalize(body));
}

function text(value, maxLength = 180) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ''));
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function isIsoInstant(value) {
  return /^\d{4}-\d{2}-\d{2}T/.test(String(value || '')) && !Number.isNaN(Date.parse(value));
}

function assertNoRawBankData(value, path = '$') {
  if (!value || typeof value !== 'object') return true;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoRawBankData(entry, `${path}[${index}]`));
    return true;
  }
  Object.entries(value).forEach(([key, entry]) => {
    if (RAW_BANK_KEYS.includes(key)) {
      fail('WAL_A04_RAW_BANK_DATA_FORBIDDEN', `Raw bank field ${path}.${key} is forbidden`);
    }
    assertNoRawBankData(entry, `${path}.${key}`);
  });
  return true;
}

function normalizeImmutableFields(input) {
  const intentId = text(input.intentId, 80).toLowerCase();
  const actorScopeHash = text(input.actorScopeHash, 80).toLowerCase();
  const amountCents = Number(input.amountCents);
  const currency = text(input.currency || 'BRL', 3).toUpperCase();
  const destinationReferenceId = text(input.destinationReferenceId, 200);
  const destinationFingerprint = text(input.destinationFingerprint, 80).toLowerCase();
  const createdAt = text(input.createdAt, 64);
  const expiresAt = text(input.expiresAt, 64);
  const clientRevision = Number(input.clientRevision == null ? 1 : input.clientRevision);

  if (!isUuid(intentId)) fail('WAL_A04_INTENT_ID_INVALID', 'intentId must be a stable UUID');
  if (!isSha256(actorScopeHash)) fail('WAL_A04_ACTOR_SCOPE_INVALID', 'actorScopeHash must be SHA-256');
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) fail('WAL_A04_AMOUNT_INVALID', 'amountCents must be a positive safe integer');
  if (currency !== 'BRL') fail('WAL_A04_CURRENCY_UNSUPPORTED', 'Only BRL is supported by this contract');
  if (!/^wdr_[A-Za-z0-9_-]{12,180}$/.test(destinationReferenceId)) fail('WAL_A04_DESTINATION_REFERENCE_INVALID', 'Opaque destinationReferenceId is required');
  if (!isSha256(destinationFingerprint)) fail('WAL_A04_DESTINATION_FINGERPRINT_INVALID', 'destinationFingerprint must be SHA-256');
  if (!isIsoInstant(createdAt) || !isIsoInstant(expiresAt) || Date.parse(createdAt) >= Date.parse(expiresAt)) {
    fail('WAL_A04_TIMESTAMP_INVALID', 'Intent timestamps are invalid');
  }
  if (Date.parse(expiresAt) - Date.parse(createdAt) > 7 * 24 * 60 * 60 * 1000) {
    fail('WAL_A04_EXPIRY_WINDOW_INVALID', 'Intent lifetime cannot exceed seven days');
  }
  if (!Number.isSafeInteger(clientRevision) || clientRevision < 1) fail('WAL_A04_REVISION_INVALID', 'clientRevision must be a positive integer');

  return Object.freeze({
    intentId,
    actorScopeHash,
    amountCents,
    currency,
    destinationReferenceVersion: DESTINATION_REFERENCE_VERSION,
    destinationReferenceId,
    destinationFingerprint,
    createdAt,
    expiresAt,
    clientRevision
  });
}

function deriveRequestFingerprint(fields) {
  return sha256(canonicalize({
    intentVersion: INTENT_VERSION,
    intentId: fields.intentId,
    actorScopeHash: fields.actorScopeHash,
    amountCents: fields.amountCents,
    currency: fields.currency,
    destinationReferenceVersion: fields.destinationReferenceVersion,
    destinationReferenceId: fields.destinationReferenceId,
    destinationFingerprint: fields.destinationFingerprint,
    clientRevision: fields.clientRevision
  }));
}

function deriveIdempotencyKey(fields) {
  const digest = sha256(canonicalize({
    contractVersion: CONTRACT_VERSION,
    intentId: fields.intentId,
    actorScopeHash: fields.actorScopeHash,
    destinationFingerprint: fields.destinationFingerprint
  }));
  return `wd-v1-${digest.slice(0, 48)}`;
}

function createWithdrawalIntent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('WAL_A04_INTENT_INVALID', 'Withdrawal intent input is required');
  assertNoRawBankData(input);
  const fields = normalizeImmutableFields(input);
  const requestFingerprint = deriveRequestFingerprint(fields);
  const idempotencyKey = deriveIdempotencyKey(fields);
  const body = {
    intentVersion: INTENT_VERSION,
    contractVersion: CONTRACT_VERSION,
    ...fields,
    idempotencyKey,
    requestFingerprint,
    immutable: true,
    rawBankDataAllowed: false,
    mutationAuthority: false,
    withdrawalExecutionAuthority: false,
    providerTransferAuthority: false,
    realMoneyAuthority: false,
    productionAuthority: false
  };
  return Object.freeze({ ...body, intentFingerprint: fingerprint(body, 'intentFingerprint') });
}

function validateWithdrawalIntent(intent) {
  if (!intent || intent.intentVersion !== INTENT_VERSION || intent.contractVersion !== CONTRACT_VERSION) {
    fail('WAL_A04_INTENT_INVALID', 'Unsupported withdrawal intent');
  }
  const rebuilt = createWithdrawalIntent(intent);
  if (intent.idempotencyKey !== rebuilt.idempotencyKey) fail('WAL_A04_IDEMPOTENCY_KEY_MISMATCH', 'Idempotency key does not match immutable intent fields');
  if (intent.requestFingerprint !== rebuilt.requestFingerprint) fail('WAL_A04_REQUEST_FINGERPRINT_MISMATCH', 'Request fingerprint does not match immutable intent fields');
  if (!isSha256(intent.intentFingerprint) || intent.intentFingerprint !== rebuilt.intentFingerprint) fail('WAL_A04_INTENT_FINGERPRINT_MISMATCH', 'Intent fingerprint mismatch');
  assertDeniedAuthority(intent);
  return rebuilt;
}

function createRequestEnvelope(intent, input = {}) {
  const validIntent = validateWithdrawalIntent(intent);
  assertNoRawBankData(input);
  const submittedAt = text(input.submittedAt, 64);
  const attemptNumber = Number(input.attemptNumber == null ? 1 : input.attemptNumber);
  if (!isIsoInstant(submittedAt)) fail('WAL_A04_TIMESTAMP_INVALID', 'submittedAt must be a valid ISO instant');
  if (Date.parse(submittedAt) < Date.parse(validIntent.createdAt)) fail('WAL_A04_TIMESTAMP_INVALID', 'submittedAt cannot precede intent creation');
  if (Date.parse(submittedAt) >= Date.parse(validIntent.expiresAt)) fail('WAL_A04_INTENT_EXPIRED', 'Expired withdrawal intent cannot be submitted');
  if (!Number.isSafeInteger(attemptNumber) || attemptNumber < 1) fail('WAL_A04_ATTEMPT_INVALID', 'attemptNumber must be a positive integer');
  const body = {
    requestVersion: REQUEST_VERSION,
    contractVersion: CONTRACT_VERSION,
    intentId: validIntent.intentId,
    intentFingerprint: validIntent.intentFingerprint,
    actorScopeHash: validIntent.actorScopeHash,
    amountCents: validIntent.amountCents,
    currency: validIntent.currency,
    destinationReferenceVersion: validIntent.destinationReferenceVersion,
    destinationReferenceId: validIntent.destinationReferenceId,
    destinationFingerprint: validIntent.destinationFingerprint,
    idempotencyKey: validIntent.idempotencyKey,
    requestFingerprint: validIntent.requestFingerprint,
    attemptNumber,
    submittedAt,
    retryMustReuseKey: true,
    rawBankDataAllowed: false,
    mutationAuthority: false,
    withdrawalExecutionAuthority: false,
    providerTransferAuthority: false,
    realMoneyAuthority: false,
    productionAuthority: false
  };
  return Object.freeze({ ...body, envelopeFingerprint: fingerprint(body, 'envelopeFingerprint') });
}

function validateRequestEnvelope(envelope) {
  if (!envelope || envelope.requestVersion !== REQUEST_VERSION || envelope.contractVersion !== CONTRACT_VERSION) {
    fail('WAL_A04_REQUEST_INVALID', 'Unsupported withdrawal request envelope');
  }
  assertNoRawBankData(envelope);
  if (!isUuid(envelope.intentId) || !isSha256(envelope.actorScopeHash) || !isSha256(envelope.destinationFingerprint)) {
    fail('WAL_A04_REQUEST_INVALID', 'Request identity fields are invalid');
  }
  if (!/^wd-v1-[a-f0-9]{48}$/.test(String(envelope.idempotencyKey || ''))) fail('WAL_A04_IDEMPOTENCY_KEY_INVALID', 'Request idempotency key is invalid');
  if (!isSha256(envelope.requestFingerprint) || !isSha256(envelope.intentFingerprint) || !isSha256(envelope.envelopeFingerprint)) {
    fail('WAL_A04_REQUEST_INVALID', 'Request fingerprints are invalid');
  }
  if (!Number.isSafeInteger(envelope.amountCents) || envelope.amountCents <= 0 || envelope.currency !== 'BRL') fail('WAL_A04_REQUEST_INVALID', 'Request amount or currency is invalid');
  if (!/^wdr_[A-Za-z0-9_-]{12,180}$/.test(String(envelope.destinationReferenceId || ''))) fail('WAL_A04_REQUEST_INVALID', 'Request destination reference is invalid');
  if (!Number.isSafeInteger(envelope.attemptNumber) || envelope.attemptNumber < 1 || !isIsoInstant(envelope.submittedAt)) fail('WAL_A04_REQUEST_INVALID', 'Request attempt metadata is invalid');
  if (envelope.envelopeFingerprint !== fingerprint(envelope, 'envelopeFingerprint')) fail('WAL_A04_ENVELOPE_FINGERPRINT_MISMATCH', 'Request envelope fingerprint mismatch');
  if (envelope.retryMustReuseKey !== true || envelope.rawBankDataAllowed !== false) fail('WAL_A04_RETRY_POLICY_INVALID', 'Request retry policy is invalid');
  assertDeniedAuthority(envelope);
  return Object.freeze({ ...envelope });
}

function createOutcome(request, input) {
  const validRequest = validateRequestEnvelope(request);
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('WAL_A04_OUTCOME_INVALID', 'Outcome input is required');
  const state = text(input.state, 40).toLowerCase();
  if (!LIFECYCLE_STATES.includes(state)) fail('WAL_A04_STATE_INVALID', 'Unsupported withdrawal lifecycle state');
  const observedAt = text(input.observedAt, 64);
  const attemptCount = Number(input.attemptCount == null ? validRequest.attemptNumber : input.attemptCount);
  if (!isIsoInstant(observedAt) || !Number.isSafeInteger(attemptCount) || attemptCount < 0) fail('WAL_A04_OUTCOME_INVALID', 'Outcome metadata is invalid');

  let withdrawalId = null;
  let committedAt = null;
  let errorCode = null;
  let retrySameKey = false;
  let terminal = false;
  let resolutionRequired = false;

  if (state === 'prepared') {
    if (attemptCount !== 0) fail('WAL_A04_OUTCOME_INVALID', 'Prepared outcome must have zero attempts');
    retrySameKey = true;
  } else if (state === 'claimed') {
    if (attemptCount < 1) fail('WAL_A04_OUTCOME_INVALID', 'Claimed outcome requires an attempt');
    retrySameKey = true;
    resolutionRequired = true;
  } else if (state === 'resolution_required') {
    if (attemptCount < 1 || !RESOLUTION_REQUIRED_CODES.includes(input.errorCode)) fail('WAL_A04_OUTCOME_INVALID', 'Resolution-required outcome needs a canonical code');
    errorCode = input.errorCode;
    retrySameKey = true;
    resolutionRequired = true;
  } else if (state === 'failed_retryable') {
    if (attemptCount < 1 || !RETRYABLE_FAILURE_CODES.includes(input.errorCode)) fail('WAL_A04_OUTCOME_INVALID', 'Retryable outcome needs a canonical code');
    errorCode = input.errorCode;
    retrySameKey = true;
  } else if (state === 'succeeded') {
    withdrawalId = text(input.withdrawalId, 200);
    committedAt = text(input.committedAt, 64);
    if (!/^wd_[A-Za-z0-9_-]{12,180}$/.test(withdrawalId) || !isIsoInstant(committedAt)) fail('WAL_A04_OUTCOME_INVALID', 'Succeeded outcome requires an opaque withdrawalId and committedAt');
    if (Date.parse(committedAt) > Date.parse(observedAt)) fail('WAL_A04_TIMESTAMP_INVALID', 'committedAt cannot be after observedAt');
    terminal = true;
  } else if (state === 'rejected_terminal') {
    if (!TERMINAL_REJECTION_CODES.includes(input.errorCode)) fail('WAL_A04_OUTCOME_INVALID', 'Terminal rejection needs a canonical code');
    errorCode = input.errorCode;
    terminal = true;
  }

  const body = {
    outcomeVersion: OUTCOME_VERSION,
    contractVersion: CONTRACT_VERSION,
    state,
    intentId: validRequest.intentId,
    intentFingerprint: validRequest.intentFingerprint,
    idempotencyKey: validRequest.idempotencyKey,
    requestFingerprint: validRequest.requestFingerprint,
    withdrawalId,
    committedAt,
    errorCode,
    attemptCount,
    observedAt,
    retrySameKey,
    resolutionRequired,
    terminal,
    duplicateCreationAllowed: false,
    mutationAuthority: false,
    withdrawalExecutionAuthority: false,
    providerTransferAuthority: false,
    realMoneyAuthority: false,
    productionAuthority: false
  };
  return Object.freeze({ ...body, outcomeFingerprint: fingerprint(body, 'outcomeFingerprint') });
}

function validateOutcome(outcome) {
  if (!outcome || outcome.outcomeVersion !== OUTCOME_VERSION || outcome.contractVersion !== CONTRACT_VERSION) fail('WAL_A04_OUTCOME_INVALID', 'Unsupported withdrawal outcome');
  if (!isSha256(outcome.outcomeFingerprint) || outcome.outcomeFingerprint !== fingerprint(outcome, 'outcomeFingerprint')) fail('WAL_A04_OUTCOME_FINGERPRINT_MISMATCH', 'Outcome fingerprint mismatch');
  if (!LIFECYCLE_STATES.includes(outcome.state) || !isUuid(outcome.intentId) || !isSha256(outcome.intentFingerprint) || !isSha256(outcome.requestFingerprint)) fail('WAL_A04_OUTCOME_INVALID', 'Outcome identity is invalid');
  if (!/^wd-v1-[a-f0-9]{48}$/.test(String(outcome.idempotencyKey || ''))) fail('WAL_A04_OUTCOME_INVALID', 'Outcome idempotency key is invalid');
  assertDeniedAuthority(outcome);
  return Object.freeze({ ...outcome });
}

function assertRequestBinding(original, candidate) {
  const left = validateRequestEnvelope(original);
  const right = validateRequestEnvelope(candidate);
  if (left.intentId !== right.intentId) fail('WAL_A04_INTENT_CONFLICT', 'Retry changed intentId');
  if (left.idempotencyKey !== right.idempotencyKey) fail('WAL_A04_IDEMPOTENCY_KEY_CONFLICT', 'Retry changed idempotency key');
  if (left.requestFingerprint !== right.requestFingerprint) fail('WAL_A04_PAYLOAD_CONFLICT', 'Same intent cannot be retried with a different payload');
  if (left.intentFingerprint !== right.intentFingerprint) fail('WAL_A04_PAYLOAD_CONFLICT', 'Retry changed immutable intent fields');
  if (right.attemptNumber < left.attemptNumber) fail('WAL_A04_ATTEMPT_REGRESSION', 'Retry attempt number cannot regress');
  return true;
}

function assertTransition(previous, next) {
  const current = validateOutcome(previous);
  const candidate = validateOutcome(next);
  if (current.intentId !== candidate.intentId || current.idempotencyKey !== candidate.idempotencyKey || current.requestFingerprint !== candidate.requestFingerprint) {
    fail('WAL_A04_TRANSITION_BINDING_CONFLICT', 'Lifecycle transition changed request binding');
  }
  const allowed = {
    prepared: ['claimed', 'resolution_required', 'failed_retryable', 'succeeded', 'rejected_terminal'],
    claimed: ['claimed', 'resolution_required', 'failed_retryable', 'succeeded', 'rejected_terminal'],
    resolution_required: ['claimed', 'resolution_required', 'failed_retryable', 'succeeded', 'rejected_terminal'],
    failed_retryable: ['claimed', 'resolution_required', 'failed_retryable', 'succeeded', 'rejected_terminal'],
    succeeded: ['succeeded'],
    rejected_terminal: ['rejected_terminal']
  };
  if (!allowed[current.state].includes(candidate.state)) fail('WAL_A04_TRANSITION_INVALID', `${current.state} cannot transition to ${candidate.state}`);
  if (candidate.attemptCount < current.attemptCount) fail('WAL_A04_ATTEMPT_REGRESSION', 'Lifecycle attempt count cannot regress');
  if (current.state === 'succeeded' && (current.withdrawalId !== candidate.withdrawalId || current.outcomeFingerprint !== candidate.outcomeFingerprint)) {
    fail('WAL_A04_TERMINAL_REPLAY_MISMATCH', 'Succeeded outcome replay must be byte-equivalent');
  }
  if (current.state === 'rejected_terminal' && current.outcomeFingerprint !== candidate.outcomeFingerprint) {
    fail('WAL_A04_TERMINAL_REPLAY_MISMATCH', 'Terminal rejection replay must be byte-equivalent');
  }
  return true;
}

function resolveRetryAction(request, outcome) {
  validateRequestEnvelope(request);
  if (!outcome) return Object.freeze({ action: 'submit_same_key', reuseIdempotencyKey: true, createNewIntent: false, duplicateCreationAllowed: false });
  const validOutcome = validateOutcome(outcome);
  if (request.intentId !== validOutcome.intentId || request.idempotencyKey !== validOutcome.idempotencyKey || request.requestFingerprint !== validOutcome.requestFingerprint) {
    fail('WAL_A04_RETRY_BINDING_CONFLICT', 'Retry request does not match stored outcome');
  }
  const actionByState = {
    prepared: 'submit_same_key',
    claimed: 'wait_and_reconcile_same_key',
    resolution_required: 'reconcile_or_replay_same_key',
    failed_retryable: 'resubmit_same_key',
    succeeded: 'return_stored_success',
    rejected_terminal: 'stop_terminal'
  };
  return Object.freeze({
    action: actionByState[validOutcome.state],
    reuseIdempotencyKey: !validOutcome.terminal,
    createNewIntent: false,
    duplicateCreationAllowed: false,
    withdrawalId: validOutcome.withdrawalId,
    errorCode: validOutcome.errorCode
  });
}

function assertDeniedAuthority(value) {
  if (value.mutationAuthority !== false || value.withdrawalExecutionAuthority !== false || value.providerTransferAuthority !== false || value.realMoneyAuthority !== false || value.productionAuthority !== false) {
    fail('WAL_A04_AUTHORITY_FORBIDDEN', 'Contract artifacts cannot grant runtime or money authority');
  }
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  INTENT_VERSION,
  REQUEST_VERSION,
  OUTCOME_VERSION,
  DESTINATION_REFERENCE_VERSION,
  LIFECYCLE_STATES,
  RETRYABLE_FAILURE_CODES,
  RESOLUTION_REQUIRED_CODES,
  TERMINAL_REJECTION_CODES,
  WithdrawalIdempotencyError,
  sha256,
  canonicalize,
  assertNoRawBankData,
  deriveRequestFingerprint,
  deriveIdempotencyKey,
  createWithdrawalIntent,
  validateWithdrawalIntent,
  createRequestEnvelope,
  validateRequestEnvelope,
  createOutcome,
  validateOutcome,
  assertRequestBinding,
  assertTransition,
  resolveRetryAction
});
