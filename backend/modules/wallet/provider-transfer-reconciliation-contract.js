'use strict';

const crypto = require('node:crypto');

const CONTRACT_VERSION = 'wal-a05-provider-transfer-reconciliation-v1';
const COMMAND_VERSION = 'wallet-provider-transfer-command-v1';
const OBSERVATION_VERSION = 'wallet-provider-transfer-observation-v1';
const SETTLEMENT_VERSION = 'wallet-withdrawal-settlement-evidence-v1';
const RECONCILIATION_VERSION = 'wallet-withdrawal-reconciliation-v1';

const PROVIDER_STATUSES = Object.freeze([
  'submission_unknown',
  'accepted',
  'processing',
  'succeeded',
  'failed',
  'reversed'
]);

const OBSERVATION_SOURCES = Object.freeze([
  'provider_submission_response',
  'provider_webhook',
  'provider_status_poll'
]);

const RECONCILIATION_STATES = Object.freeze([
  'queued',
  'provider_unknown',
  'provider_processing',
  'reconciliation_required',
  'settled',
  'failed_terminal',
  'reversed'
]);

const RAW_BANK_KEYS = Object.freeze([
  'account_holder', 'accountHolder', 'holderName', 'holder',
  'document', 'taxId', 'cpf', 'cnpj',
  'branch', 'agency',
  'account_number', 'accountNumber',
  'pix_key', 'pixKey', 'bankAccount', 'bank_account_snapshot'
]);

const CREDENTIAL_KEYS = Object.freeze([
  'apiKey', 'api_key', 'secret', 'clientSecret', 'client_secret',
  'accessToken', 'access_token', 'refreshToken', 'refresh_token',
  'authorization', 'signatureSecret', 'signature_secret', 'privateKey', 'private_key'
]);

const ALLOWED_TRANSITIONS = Object.freeze({
  submission_unknown: Object.freeze(['submission_unknown', 'accepted', 'processing', 'succeeded', 'failed']),
  accepted: Object.freeze(['accepted', 'processing', 'succeeded', 'failed']),
  processing: Object.freeze(['processing', 'succeeded', 'failed']),
  succeeded: Object.freeze(['succeeded', 'reversed']),
  failed: Object.freeze(['failed']),
  reversed: Object.freeze(['reversed'])
});

class ProviderTransferReconciliationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ProviderTransferReconciliationError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new ProviderTransferReconciliationError(code, message);
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

function assertNoSensitiveData(value, path = '$') {
  if (!value || typeof value !== 'object') return true;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSensitiveData(entry, `${path}[${index}]`));
    return true;
  }
  Object.entries(value).forEach(([key, entry]) => {
    if (RAW_BANK_KEYS.includes(key)) fail('WAL_A05_RAW_BANK_DATA_FORBIDDEN', `Raw bank field ${path}.${key} is forbidden`);
    if (CREDENTIAL_KEYS.includes(key)) fail('WAL_A05_PROVIDER_CREDENTIAL_FORBIDDEN', `Provider credential ${path}.${key} is forbidden`);
    assertNoSensitiveData(entry, `${path}.${key}`);
  });
  return true;
}

function assertDeniedAuthority(value) {
  const fields = [
    'runtimeMutationAuthority',
    'providerSubmissionAuthority',
    'providerTransferAuthority',
    'realMoneyAuthority',
    'remoteExecutionAuthority',
    'stagingAuthority',
    'productionAuthority'
  ];
  fields.forEach((field) => {
    if (value[field] !== false) fail('WAL_A05_AUTHORITY_FORBIDDEN', `${field} must remain false`);
  });
}

function normalizeCommandFields(input) {
  const commandId = text(input.commandId, 80).toLowerCase();
  const withdrawalId = text(input.withdrawalId, 200);
  const intentId = text(input.intentId, 80).toLowerCase();
  const actorScopeHash = text(input.actorScopeHash, 80).toLowerCase();
  const withdrawalIntentFingerprint = text(input.withdrawalIntentFingerprint, 80).toLowerCase();
  const withdrawalRequestFingerprint = text(input.withdrawalRequestFingerprint, 80).toLowerCase();
  const withdrawalOutcomeFingerprint = text(input.withdrawalOutcomeFingerprint, 80).toLowerCase();
  const withdrawalIdempotencyKey = text(input.withdrawalIdempotencyKey, 100).toLowerCase();
  const amountCents = Number(input.amountCents);
  const currency = text(input.currency || 'BRL', 3).toUpperCase();
  const destinationReferenceId = text(input.destinationReferenceId, 200);
  const destinationFingerprint = text(input.destinationFingerprint, 80).toLowerCase();
  const providerAdapterRef = text(input.providerAdapterRef, 200);
  const providerConfigurationFingerprint = text(input.providerConfigurationFingerprint, 80).toLowerCase();
  const createdAt = text(input.createdAt, 64);

  if (!isUuid(commandId) || !isUuid(intentId)) fail('WAL_A05_COMMAND_ID_INVALID', 'commandId and intentId must be UUIDs');
  if (!/^wd_[A-Za-z0-9_-]{12,180}$/.test(withdrawalId)) fail('WAL_A05_WITHDRAWAL_ID_INVALID', 'Opaque withdrawalId is required');
  [actorScopeHash, withdrawalIntentFingerprint, withdrawalRequestFingerprint, withdrawalOutcomeFingerprint, destinationFingerprint, providerConfigurationFingerprint].forEach((value) => {
    if (!isSha256(value)) fail('WAL_A05_FINGERPRINT_INVALID', 'Command fingerprints must be SHA-256');
  });
  if (!/^wd-v1-[a-f0-9]{48}$/.test(withdrawalIdempotencyKey)) fail('WAL_A05_IDEMPOTENCY_KEY_INVALID', 'Withdrawal idempotency key is invalid');
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) fail('WAL_A05_AMOUNT_INVALID', 'amountCents must be a positive safe integer');
  if (currency !== 'BRL') fail('WAL_A05_CURRENCY_UNSUPPORTED', 'Only BRL is supported by this contract');
  if (!/^wdr_[A-Za-z0-9_-]{12,180}$/.test(destinationReferenceId)) fail('WAL_A05_DESTINATION_REFERENCE_INVALID', 'Opaque destinationReferenceId is required');
  if (!/^pspa_[A-Za-z0-9_-]{12,180}$/.test(providerAdapterRef)) fail('WAL_A05_PROVIDER_ADAPTER_INVALID', 'Opaque providerAdapterRef is required');
  if (!isIsoInstant(createdAt)) fail('WAL_A05_TIMESTAMP_INVALID', 'createdAt must be a valid ISO instant');

  return Object.freeze({
    commandId,
    withdrawalId,
    intentId,
    actorScopeHash,
    withdrawalIntentFingerprint,
    withdrawalRequestFingerprint,
    withdrawalOutcomeFingerprint,
    withdrawalIdempotencyKey,
    amountCents,
    currency,
    destinationReferenceId,
    destinationFingerprint,
    providerAdapterRef,
    providerConfigurationFingerprint,
    createdAt
  });
}

function deriveTransferFingerprint(fields) {
  return sha256(canonicalize({
    commandVersion: COMMAND_VERSION,
    withdrawalId: fields.withdrawalId,
    intentId: fields.intentId,
    actorScopeHash: fields.actorScopeHash,
    withdrawalOutcomeFingerprint: fields.withdrawalOutcomeFingerprint,
    amountCents: fields.amountCents,
    currency: fields.currency,
    destinationReferenceId: fields.destinationReferenceId,
    destinationFingerprint: fields.destinationFingerprint,
    providerAdapterRef: fields.providerAdapterRef,
    providerConfigurationFingerprint: fields.providerConfigurationFingerprint
  }));
}

function deriveProviderIdempotencyKey(fields) {
  const digest = sha256(canonicalize({
    contractVersion: CONTRACT_VERSION,
    commandId: fields.commandId,
    withdrawalId: fields.withdrawalId,
    withdrawalIdempotencyKey: fields.withdrawalIdempotencyKey,
    providerConfigurationFingerprint: fields.providerConfigurationFingerprint
  }));
  return `pt-v1-${digest.slice(0, 48)}`;
}

function createTransferCommand(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('WAL_A05_COMMAND_INVALID', 'Transfer command input is required');
  assertNoSensitiveData(input);
  const fields = normalizeCommandFields(input);
  const body = {
    commandVersion: COMMAND_VERSION,
    contractVersion: CONTRACT_VERSION,
    sourceWithdrawalContractVersion: 'wal-a04-withdrawal-idempotency-v1',
    ...fields,
    transferFingerprint: deriveTransferFingerprint(fields),
    providerIdempotencyKey: deriveProviderIdempotencyKey(fields),
    providerNeutral: true,
    rawBankDataAllowed: false,
    providerCredentialsAllowed: false,
    runtimeMutationAuthority: false,
    providerSubmissionAuthority: false,
    providerTransferAuthority: false,
    realMoneyAuthority: false,
    remoteExecutionAuthority: false,
    stagingAuthority: false,
    productionAuthority: false
  };
  return Object.freeze({ ...body, commandFingerprint: fingerprint(body, 'commandFingerprint') });
}

function validateTransferCommand(command) {
  if (!command || command.commandVersion !== COMMAND_VERSION || command.contractVersion !== CONTRACT_VERSION) fail('WAL_A05_COMMAND_INVALID', 'Unsupported transfer command');
  assertNoSensitiveData(command);
  const rebuilt = createTransferCommand(command);
  if (command.transferFingerprint !== rebuilt.transferFingerprint) fail('WAL_A05_TRANSFER_FINGERPRINT_MISMATCH', 'Transfer fingerprint mismatch');
  if (command.providerIdempotencyKey !== rebuilt.providerIdempotencyKey) fail('WAL_A05_PROVIDER_IDEMPOTENCY_MISMATCH', 'Provider idempotency key mismatch');
  if (!isSha256(command.commandFingerprint) || command.commandFingerprint !== rebuilt.commandFingerprint) fail('WAL_A05_COMMAND_FINGERPRINT_MISMATCH', 'Command fingerprint mismatch');
  assertDeniedAuthority(command);
  return rebuilt;
}

function createProviderObservation(command, input) {
  const validCommand = validateTransferCommand(command);
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('WAL_A05_OBSERVATION_INVALID', 'Provider observation input is required');
  assertNoSensitiveData(input);

  const providerStatus = text(input.providerStatus, 40).toLowerCase();
  const source = text(input.source, 60).toLowerCase();
  const providerEventId = text(input.providerEventId, 200);
  const providerTransferReference = input.providerTransferReference == null ? null : text(input.providerTransferReference, 200);
  const providerSequence = Number(input.providerSequence);
  const occurredAt = text(input.occurredAt, 64);
  const receivedAt = text(input.receivedAt, 64);
  const evidenceFingerprint = text(input.evidenceFingerprint, 80).toLowerCase();
  const signatureVerified = input.signatureVerified === true;
  const authenticatedChannel = input.authenticatedChannel === true;

  if (!PROVIDER_STATUSES.includes(providerStatus) || !OBSERVATION_SOURCES.includes(source)) fail('WAL_A05_OBSERVATION_INVALID', 'Provider status or source is unsupported');
  if (!/^pevt_[A-Za-z0-9_-]{12,180}$/.test(providerEventId)) fail('WAL_A05_PROVIDER_EVENT_INVALID', 'Opaque providerEventId is required');
  if (!Number.isSafeInteger(providerSequence) || providerSequence < 1) fail('WAL_A05_PROVIDER_SEQUENCE_INVALID', 'providerSequence must be a positive integer');
  if (!isIsoInstant(occurredAt) || !isIsoInstant(receivedAt) || Date.parse(occurredAt) > Date.parse(receivedAt)) fail('WAL_A05_TIMESTAMP_INVALID', 'Observation timestamps are invalid');
  if (!isSha256(evidenceFingerprint)) fail('WAL_A05_EVIDENCE_FINGERPRINT_INVALID', 'Provider evidence fingerprint is required');
  if (source === 'provider_webhook' && !signatureVerified) fail('WAL_A05_WEBHOOK_SIGNATURE_REQUIRED', 'Provider webhook must be signature verified');
  if (source !== 'provider_webhook' && !authenticatedChannel) fail('WAL_A05_AUTHENTICATED_CHANNEL_REQUIRED', 'Submission responses and polls require an authenticated channel');
  if (providerStatus !== 'submission_unknown' && !/^ptr_[A-Za-z0-9_-]{12,180}$/.test(providerTransferReference || '')) fail('WAL_A05_PROVIDER_REFERENCE_REQUIRED', 'Provider transfer reference is required');
  if (providerStatus === 'submission_unknown' && providerTransferReference !== null) fail('WAL_A05_PROVIDER_REFERENCE_FORBIDDEN', 'Unknown submission cannot assert a provider transfer reference');

  const echoedAmountCents = Number(input.amountCents);
  const echoedCurrency = text(input.currency, 3).toUpperCase();
  const echoedDestinationFingerprint = text(input.destinationFingerprint, 80).toLowerCase();
  const echoedTransferFingerprint = text(input.transferFingerprint, 80).toLowerCase();
  const echoedProviderIdempotencyKey = text(input.providerIdempotencyKey, 100).toLowerCase();
  if (echoedAmountCents !== validCommand.amountCents) fail('WAL_A05_AMOUNT_MISMATCH', 'Provider observation amount does not match command');
  if (echoedCurrency !== validCommand.currency) fail('WAL_A05_CURRENCY_MISMATCH', 'Provider observation currency does not match command');
  if (echoedDestinationFingerprint !== validCommand.destinationFingerprint) fail('WAL_A05_DESTINATION_MISMATCH', 'Provider observation destination does not match command');
  if (echoedTransferFingerprint !== validCommand.transferFingerprint) fail('WAL_A05_TRANSFER_MISMATCH', 'Provider observation transfer fingerprint does not match command');
  if (echoedProviderIdempotencyKey !== validCommand.providerIdempotencyKey) fail('WAL_A05_PROVIDER_IDEMPOTENCY_MISMATCH', 'Provider observation idempotency key does not match command');

  const body = {
    observationVersion: OBSERVATION_VERSION,
    contractVersion: CONTRACT_VERSION,
    commandId: validCommand.commandId,
    commandFingerprint: validCommand.commandFingerprint,
    withdrawalId: validCommand.withdrawalId,
    transferFingerprint: validCommand.transferFingerprint,
    providerIdempotencyKey: validCommand.providerIdempotencyKey,
    providerAdapterRef: validCommand.providerAdapterRef,
    providerStatus,
    source,
    providerEventId,
    providerTransferReference,
    providerSequence,
    amountCents: echoedAmountCents,
    currency: echoedCurrency,
    destinationFingerprint: echoedDestinationFingerprint,
    occurredAt,
    receivedAt,
    evidenceFingerprint,
    signatureVerified,
    authenticatedChannel,
    rawBankDataAllowed: false,
    providerCredentialsAllowed: false,
    runtimeMutationAuthority: false,
    providerSubmissionAuthority: false,
    providerTransferAuthority: false,
    realMoneyAuthority: false,
    remoteExecutionAuthority: false,
    stagingAuthority: false,
    productionAuthority: false
  };
  return Object.freeze({ ...body, observationFingerprint: fingerprint(body, 'observationFingerprint') });
}

function validateProviderObservation(command, observation) {
  const validCommand = validateTransferCommand(command);
  if (!observation || observation.observationVersion !== OBSERVATION_VERSION || observation.contractVersion !== CONTRACT_VERSION) fail('WAL_A05_OBSERVATION_INVALID', 'Unsupported provider observation');
  const rebuilt = createProviderObservation(validCommand, observation);
  if (!isSha256(observation.observationFingerprint) || observation.observationFingerprint !== rebuilt.observationFingerprint) fail('WAL_A05_OBSERVATION_FINGERPRINT_MISMATCH', 'Observation fingerprint mismatch');
  assertDeniedAuthority(observation);
  return rebuilt;
}

function normalizeObservationChain(command, observations) {
  const validCommand = validateTransferCommand(command);
  if (!Array.isArray(observations)) fail('WAL_A05_OBSERVATION_CHAIN_INVALID', 'Observations must be an array');
  const byEvent = new Map();
  const bySequence = new Map();
  const providerReferences = new Set();

  observations.forEach((entry) => {
    const observation = validateProviderObservation(validCommand, entry);
    const priorEvent = byEvent.get(observation.providerEventId);
    if (priorEvent) {
      if (priorEvent.observationFingerprint !== observation.observationFingerprint) fail('WAL_A05_PROVIDER_EVENT_CONFLICT', 'Provider event ID was reused with different evidence');
      return;
    }
    const priorSequence = bySequence.get(observation.providerSequence);
    if (priorSequence && priorSequence.observationFingerprint !== observation.observationFingerprint) fail('WAL_A05_PROVIDER_SEQUENCE_CONFLICT', 'Provider sequence was reused with different evidence');
    byEvent.set(observation.providerEventId, observation);
    bySequence.set(observation.providerSequence, observation);
    if (observation.providerTransferReference) providerReferences.add(observation.providerTransferReference);
  });

  if (providerReferences.size > 1) fail('WAL_A05_PROVIDER_REFERENCE_CONFLICT', 'One command cannot bind to multiple provider transfer references');

  const chain = Array.from(byEvent.values()).sort((left, right) => left.providerSequence - right.providerSequence);
  for (let index = 1; index < chain.length; index += 1) {
    const previous = chain[index - 1];
    const current = chain[index];
    if (current.providerSequence <= previous.providerSequence) fail('WAL_A05_PROVIDER_SEQUENCE_INVALID', 'Provider sequence must increase monotonically');
    if (Date.parse(current.occurredAt) < Date.parse(previous.occurredAt)) fail('WAL_A05_OBSERVATION_ORDER_INVALID', 'Provider event time cannot move backwards');
    if (!ALLOWED_TRANSITIONS[previous.providerStatus].includes(current.providerStatus)) {
      fail('WAL_A05_PROVIDER_TRANSITION_INVALID', `Invalid provider transition ${previous.providerStatus} -> ${current.providerStatus}`);
    }
  }
  if (chain.length && chain[0].providerStatus === 'reversed') fail('WAL_A05_PROVIDER_TRANSITION_INVALID', 'Reversal requires a prior succeeded observation');
  return Object.freeze(chain);
}

function createSettlementEvidence(command, succeededObservation, input) {
  const validCommand = validateTransferCommand(command);
  const observation = validateProviderObservation(validCommand, succeededObservation);
  if (observation.providerStatus !== 'succeeded') fail('WAL_A05_SETTLEMENT_EVIDENCE_INVALID', 'Settlement evidence requires a succeeded provider observation');
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('WAL_A05_SETTLEMENT_EVIDENCE_INVALID', 'Settlement evidence input is required');
  assertNoSensitiveData(input);

  const ledgerEntryId = text(input.ledgerEntryId, 200);
  const settlementReference = text(input.settlementReference, 200);
  const reconcilerScopeHash = text(input.reconcilerScopeHash, 80).toLowerCase();
  const evidenceFingerprint = text(input.evidenceFingerprint, 80).toLowerCase();
  const reconciledAt = text(input.reconciledAt, 64);
  const segregationOfDuties = input.segregationOfDuties === true;
  const amountCents = Number(input.amountCents);
  const currency = text(input.currency, 3).toUpperCase();
  const destinationFingerprint = text(input.destinationFingerprint, 80).toLowerCase();
  const providerTransferReference = text(input.providerTransferReference, 200);
  const transferFingerprint = text(input.transferFingerprint, 80).toLowerCase();
  const providerObservationFingerprint = text(input.providerObservationFingerprint, 80).toLowerCase();

  if (!/^wle_[A-Za-z0-9_-]{12,180}$/.test(ledgerEntryId)) fail('WAL_A05_LEDGER_ENTRY_INVALID', 'Opaque ledgerEntryId is required');
  if (!/^set_[A-Za-z0-9_-]{12,180}$/.test(settlementReference)) fail('WAL_A05_SETTLEMENT_REFERENCE_INVALID', 'Opaque settlementReference is required');
  if (!isSha256(reconcilerScopeHash) || !isSha256(evidenceFingerprint)) fail('WAL_A05_SETTLEMENT_EVIDENCE_INVALID', 'Settlement hashes must be SHA-256');
  if (!isIsoInstant(reconciledAt) || Date.parse(reconciledAt) < Date.parse(observation.occurredAt)) fail('WAL_A05_TIMESTAMP_INVALID', 'reconciledAt must not precede provider success');
  if (!segregationOfDuties) fail('WAL_A05_SEGREGATION_REQUIRED', 'Settlement reconciliation requires segregation of duties');
  if (amountCents !== validCommand.amountCents) fail('WAL_A05_AMOUNT_MISMATCH', 'Settlement amount does not match command');
  if (currency !== validCommand.currency) fail('WAL_A05_CURRENCY_MISMATCH', 'Settlement currency does not match command');
  if (destinationFingerprint !== validCommand.destinationFingerprint) fail('WAL_A05_DESTINATION_MISMATCH', 'Settlement destination does not match command');
  if (providerTransferReference !== observation.providerTransferReference) fail('WAL_A05_PROVIDER_REFERENCE_MISMATCH', 'Settlement provider reference does not match observation');
  if (transferFingerprint !== validCommand.transferFingerprint) fail('WAL_A05_TRANSFER_MISMATCH', 'Settlement transfer fingerprint does not match command');
  if (providerObservationFingerprint !== observation.observationFingerprint) fail('WAL_A05_PROVIDER_OBSERVATION_MISMATCH', 'Settlement observation fingerprint does not match provider evidence');

  const body = {
    settlementVersion: SETTLEMENT_VERSION,
    contractVersion: CONTRACT_VERSION,
    commandId: validCommand.commandId,
    commandFingerprint: validCommand.commandFingerprint,
    withdrawalId: validCommand.withdrawalId,
    transferFingerprint: validCommand.transferFingerprint,
    providerTransferReference,
    providerObservationFingerprint,
    ledgerEntryId,
    settlementReference,
    amountCents,
    currency,
    destinationFingerprint,
    reconcilerScopeHash,
    evidenceFingerprint,
    reconciledAt,
    segregationOfDuties,
    rawBankDataAllowed: false,
    providerCredentialsAllowed: false,
    runtimeMutationAuthority: false,
    providerSubmissionAuthority: false,
    providerTransferAuthority: false,
    realMoneyAuthority: false,
    remoteExecutionAuthority: false,
    stagingAuthority: false,
    productionAuthority: false
  };
  return Object.freeze({ ...body, settlementFingerprint: fingerprint(body, 'settlementFingerprint') });
}

function validateSettlementEvidence(command, succeededObservation, evidence) {
  const rebuilt = createSettlementEvidence(command, succeededObservation, evidence);
  if (!isSha256(evidence.settlementFingerprint) || evidence.settlementFingerprint !== rebuilt.settlementFingerprint) fail('WAL_A05_SETTLEMENT_FINGERPRINT_MISMATCH', 'Settlement fingerprint mismatch');
  assertDeniedAuthority(evidence);
  return rebuilt;
}

function reconcileTransfer(command, observations, settlementEvidence, observedAt) {
  const validCommand = validateTransferCommand(command);
  const chain = normalizeObservationChain(validCommand, observations || []);
  if (!isIsoInstant(observedAt)) fail('WAL_A05_TIMESTAMP_INVALID', 'Reconciliation observedAt must be a valid ISO instant');

  const latest = chain.length ? chain[chain.length - 1] : null;
  let state = 'queued';
  let reasonCode = 'NO_PROVIDER_OBSERVATION';
  let providerTransferReference = null;
  let settlementFingerprint = null;
  let withdrawalCompletedForProjection = false;

  if (latest) {
    providerTransferReference = latest.providerTransferReference;
    if (latest.providerStatus === 'submission_unknown') {
      state = 'provider_unknown';
      reasonCode = 'PROVIDER_SUBMISSION_OUTCOME_UNKNOWN';
    } else if (latest.providerStatus === 'accepted' || latest.providerStatus === 'processing') {
      state = 'provider_processing';
      reasonCode = 'PROVIDER_NOT_TERMINAL';
    } else if (latest.providerStatus === 'failed') {
      state = 'failed_terminal';
      reasonCode = 'PROVIDER_FAILED';
    } else if (latest.providerStatus === 'reversed') {
      state = 'reversed';
      reasonCode = 'PROVIDER_REVERSED';
    } else if (latest.providerStatus === 'succeeded') {
      if (!settlementEvidence) {
        state = 'reconciliation_required';
        reasonCode = 'SETTLEMENT_EVIDENCE_MISSING';
      } else {
        const evidence = validateSettlementEvidence(validCommand, latest, settlementEvidence);
        state = 'settled';
        reasonCode = null;
        settlementFingerprint = evidence.settlementFingerprint;
        withdrawalCompletedForProjection = true;
      }
    }
  }

  if (!RECONCILIATION_STATES.includes(state)) fail('WAL_A05_RECONCILIATION_INVALID', 'Unsupported reconciliation state');
  const body = {
    reconciliationVersion: RECONCILIATION_VERSION,
    contractVersion: CONTRACT_VERSION,
    commandId: validCommand.commandId,
    commandFingerprint: validCommand.commandFingerprint,
    withdrawalId: validCommand.withdrawalId,
    transferFingerprint: validCommand.transferFingerprint,
    providerStatus: latest ? latest.providerStatus : null,
    providerTransferReference,
    latestObservationFingerprint: latest ? latest.observationFingerprint : null,
    observationCount: chain.length,
    state,
    reasonCode,
    settlementFingerprint,
    observedAt,
    withdrawalCompletedForProjection,
    providerSuccessAloneIsInsufficient: true,
    manualApprovalCanSettle: false,
    rawBankDataAllowed: false,
    providerCredentialsAllowed: false,
    runtimeMutationAuthority: false,
    providerSubmissionAuthority: false,
    providerTransferAuthority: false,
    realMoneyAuthority: false,
    remoteExecutionAuthority: false,
    stagingAuthority: false,
    productionAuthority: false
  };
  return Object.freeze({ ...body, reconciliationFingerprint: fingerprint(body, 'reconciliationFingerprint') });
}

function validateReconciliationResult(result) {
  if (!result || result.reconciliationVersion !== RECONCILIATION_VERSION || result.contractVersion !== CONTRACT_VERSION) fail('WAL_A05_RECONCILIATION_INVALID', 'Unsupported reconciliation result');
  if (!RECONCILIATION_STATES.includes(result.state)) fail('WAL_A05_RECONCILIATION_INVALID', 'Unknown reconciliation state');
  if (!isSha256(result.commandFingerprint) || !isSha256(result.transferFingerprint) || !isSha256(result.reconciliationFingerprint)) fail('WAL_A05_RECONCILIATION_INVALID', 'Reconciliation fingerprints are invalid');
  if (result.reconciliationFingerprint !== fingerprint(result, 'reconciliationFingerprint')) fail('WAL_A05_RECONCILIATION_FINGERPRINT_MISMATCH', 'Reconciliation fingerprint mismatch');
  if (result.withdrawalCompletedForProjection !== (result.state === 'settled')) fail('WAL_A05_COMPLETION_AUTHORITY_INVALID', 'Only settled state may complete the withdrawal projection');
  if (result.providerSuccessAloneIsInsufficient !== true || result.manualApprovalCanSettle !== false) fail('WAL_A05_SETTLEMENT_POLICY_INVALID', 'Settlement policy flags are invalid');
  assertNoSensitiveData(result);
  assertDeniedAuthority(result);
  return Object.freeze({ ...result });
}

function canMarkWithdrawalCompleted(result) {
  const valid = validateReconciliationResult(result);
  return valid.state === 'settled' && valid.withdrawalCompletedForProjection === true && isSha256(valid.settlementFingerprint);
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  COMMAND_VERSION,
  OBSERVATION_VERSION,
  SETTLEMENT_VERSION,
  RECONCILIATION_VERSION,
  PROVIDER_STATUSES,
  OBSERVATION_SOURCES,
  RECONCILIATION_STATES,
  ProviderTransferReconciliationError,
  sha256,
  createTransferCommand,
  validateTransferCommand,
  createProviderObservation,
  validateProviderObservation,
  normalizeObservationChain,
  createSettlementEvidence,
  validateSettlementEvidence,
  reconcileTransfer,
  validateReconciliationResult,
  canMarkWithdrawalCompleted
});
