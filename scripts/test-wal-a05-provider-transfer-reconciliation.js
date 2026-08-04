'use strict';

const assert = require('node:assert/strict');
const contract = require('../backend/modules/wallet/provider-transfer-reconciliation-contract');

const H = (value) => contract.sha256(value);
const baseCommandInput = {
  commandId: '11111111-1111-4111-8111-111111111111',
  withdrawalId: 'wd_synthetic_000001',
  intentId: '22222222-2222-4222-8222-222222222222',
  actorScopeHash: H('actor'),
  withdrawalIntentFingerprint: H('intent'),
  withdrawalRequestFingerprint: H('request'),
  withdrawalOutcomeFingerprint: H('outcome'),
  withdrawalIdempotencyKey: 'wd-v1-' + 'a'.repeat(48),
  amountCents: 12500,
  currency: 'BRL',
  destinationReferenceId: 'wdr_synthetic_destination_01',
  destinationFingerprint: H('destination'),
  providerAdapterRef: 'pspa_synthetic_adapter_01',
  providerConfigurationFingerprint: H('provider-config'),
  createdAt: '2026-08-04T18:00:00.000Z'
};

const checks = [];
function test(name, fn) {
  try {
    fn();
    checks.push({ name, passed: true });
  } catch (error) {
    checks.push({ name, passed: false, error: error && error.stack || String(error) });
  }
}

function expectCode(code, fn) {
  assert.throws(fn, (error) => error && error.code === code);
}

const command = contract.createTransferCommand(baseCommandInput);
function observationInput(status, sequence, overrides = {}) {
  return {
    providerStatus: status,
    source: 'provider_webhook',
    providerEventId: `pevt_synthetic_${String(sequence).padStart(4, '0')}`,
    providerTransferReference: status === 'submission_unknown' ? null : 'ptr_synthetic_transfer_01',
    providerSequence: sequence,
    amountCents: command.amountCents,
    currency: command.currency,
    destinationFingerprint: command.destinationFingerprint,
    transferFingerprint: command.transferFingerprint,
    providerIdempotencyKey: command.providerIdempotencyKey,
    occurredAt: `2026-08-04T18:${String(sequence).padStart(2, '0')}:00.000Z`,
    receivedAt: `2026-08-04T18:${String(sequence).padStart(2, '0')}:01.000Z`,
    evidenceFingerprint: H(`evidence-${sequence}`),
    signatureVerified: true,
    authenticatedChannel: false,
    ...overrides
  };
}

const accepted = contract.createProviderObservation(command, observationInput('accepted', 1));
const processing = contract.createProviderObservation(command, observationInput('processing', 2));
const succeeded = contract.createProviderObservation(command, observationInput('succeeded', 3));
const failed = contract.createProviderObservation(command, observationInput('failed', 2, { providerEventId: 'pevt_synthetic_failed_02' }));
const reversed = contract.createProviderObservation(command, observationInput('reversed', 4));
const settlementInput = {
  ledgerEntryId: 'wle_synthetic_ledger_01',
  settlementReference: 'set_synthetic_settlement_01',
  reconcilerScopeHash: H('reconciler'),
  evidenceFingerprint: H('settlement-evidence'),
  reconciledAt: '2026-08-04T18:05:00.000Z',
  segregationOfDuties: true,
  amountCents: command.amountCents,
  currency: command.currency,
  destinationFingerprint: command.destinationFingerprint,
  providerTransferReference: succeeded.providerTransferReference,
  transferFingerprint: command.transferFingerprint,
  providerObservationFingerprint: succeeded.observationFingerprint
};
const settlement = contract.createSettlementEvidence(command, succeeded, settlementInput);

test('command version', () => assert.equal(command.commandVersion, contract.COMMAND_VERSION));
test('command validates', () => assert.equal(contract.validateTransferCommand(command).commandFingerprint, command.commandFingerprint));
test('provider key deterministic', () => assert.equal(contract.createTransferCommand(baseCommandInput).providerIdempotencyKey, command.providerIdempotencyKey));
test('transfer fingerprint deterministic', () => assert.equal(contract.createTransferCommand(baseCommandInput).transferFingerprint, command.transferFingerprint));
test('provider neutral', () => assert.equal(command.providerNeutral, true));
test('command authority denied', () => assert.equal(command.providerTransferAuthority, false));
test('accepted observation validates', () => assert.equal(contract.validateProviderObservation(command, accepted).providerStatus, 'accepted'));
test('processing observation validates', () => assert.equal(contract.validateProviderObservation(command, processing).providerStatus, 'processing'));
test('succeeded observation validates', () => assert.equal(contract.validateProviderObservation(command, succeeded).providerStatus, 'succeeded'));
test('poll authenticated', () => {
  const poll = contract.createProviderObservation(command, observationInput('processing', 2, { source: 'provider_status_poll', signatureVerified: false, authenticatedChannel: true, providerEventId: 'pevt_synthetic_poll_02' }));
  assert.equal(poll.authenticatedChannel, true);
});
test('submission response authenticated', () => {
  const response = contract.createProviderObservation(command, observationInput('accepted', 1, { source: 'provider_submission_response', signatureVerified: false, authenticatedChannel: true, providerEventId: 'pevt_synthetic_response_01' }));
  assert.equal(response.source, 'provider_submission_response');
});
test('exact event replay deduplicates', () => assert.equal(contract.normalizeObservationChain(command, [accepted, accepted]).length, 1));
test('chain accepted processing success', () => assert.equal(contract.normalizeObservationChain(command, [accepted, processing, succeeded]).length, 3));
test('settlement evidence validates', () => assert.equal(contract.validateSettlementEvidence(command, succeeded, settlement).settlementFingerprint, settlement.settlementFingerprint));
test('queued state', () => assert.equal(contract.reconcileTransfer(command, [], null, '2026-08-04T18:10:00.000Z').state, 'queued'));
test('provider unknown state', () => {
  const unknown = contract.createProviderObservation(command, observationInput('submission_unknown', 1, { providerEventId: 'pevt_synthetic_unknown_01' }));
  assert.equal(contract.reconcileTransfer(command, [unknown], null, '2026-08-04T18:10:00.000Z').state, 'provider_unknown');
});
test('provider accepted is processing', () => assert.equal(contract.reconcileTransfer(command, [accepted], null, '2026-08-04T18:10:00.000Z').state, 'provider_processing'));
test('provider processing state', () => assert.equal(contract.reconcileTransfer(command, [accepted, processing], null, '2026-08-04T18:10:00.000Z').state, 'provider_processing'));
test('success alone requires reconciliation', () => assert.equal(contract.reconcileTransfer(command, [accepted, processing, succeeded], null, '2026-08-04T18:10:00.000Z').state, 'reconciliation_required'));
test('settled with evidence', () => assert.equal(contract.reconcileTransfer(command, [accepted, processing, succeeded], settlement, '2026-08-04T18:10:00.000Z').state, 'settled'));
test('failed terminal state', () => assert.equal(contract.reconcileTransfer(command, [accepted, failed], null, '2026-08-04T18:10:00.000Z').state, 'failed_terminal'));
test('reversed state', () => assert.equal(contract.reconcileTransfer(command, [accepted, processing, succeeded, reversed], null, '2026-08-04T18:10:00.000Z').state, 'reversed'));
test('settled may complete projection', () => assert.equal(contract.canMarkWithdrawalCompleted(contract.reconcileTransfer(command, [accepted, processing, succeeded], settlement, '2026-08-04T18:10:00.000Z')), true));
test('success without evidence cannot complete', () => assert.equal(contract.canMarkWithdrawalCompleted(contract.reconcileTransfer(command, [accepted, processing, succeeded], null, '2026-08-04T18:10:00.000Z')), false));
test('processing cannot complete', () => assert.equal(contract.canMarkWithdrawalCompleted(contract.reconcileTransfer(command, [accepted, processing], null, '2026-08-04T18:10:00.000Z')), false));
test('failed cannot complete', () => assert.equal(contract.canMarkWithdrawalCompleted(contract.reconcileTransfer(command, [accepted, failed], null, '2026-08-04T18:10:00.000Z')), false));
test('reversal invalidates completion', () => assert.equal(contract.canMarkWithdrawalCompleted(contract.reconcileTransfer(command, [accepted, processing, succeeded, reversed], null, '2026-08-04T18:10:00.000Z')), false));

test('reject invalid command uuid', () => expectCode('WAL_A05_COMMAND_ID_INVALID', () => contract.createTransferCommand({ ...baseCommandInput, commandId: 'bad' })));
test('reject invalid withdrawal id', () => expectCode('WAL_A05_WITHDRAWAL_ID_INVALID', () => contract.createTransferCommand({ ...baseCommandInput, withdrawalId: 'bad' })));
test('reject invalid actor hash', () => expectCode('WAL_A05_FINGERPRINT_INVALID', () => contract.createTransferCommand({ ...baseCommandInput, actorScopeHash: 'bad' })));
test('reject invalid outcome hash', () => expectCode('WAL_A05_FINGERPRINT_INVALID', () => contract.createTransferCommand({ ...baseCommandInput, withdrawalOutcomeFingerprint: 'bad' })));
test('reject invalid withdrawal key', () => expectCode('WAL_A05_IDEMPOTENCY_KEY_INVALID', () => contract.createTransferCommand({ ...baseCommandInput, withdrawalIdempotencyKey: 'bad' })));
test('reject zero amount', () => expectCode('WAL_A05_AMOUNT_INVALID', () => contract.createTransferCommand({ ...baseCommandInput, amountCents: 0 })));
test('reject non-integer amount', () => expectCode('WAL_A05_AMOUNT_INVALID', () => contract.createTransferCommand({ ...baseCommandInput, amountCents: 1.5 })));
test('reject currency', () => expectCode('WAL_A05_CURRENCY_UNSUPPORTED', () => contract.createTransferCommand({ ...baseCommandInput, currency: 'USD' })));
test('reject destination ref', () => expectCode('WAL_A05_DESTINATION_REFERENCE_INVALID', () => contract.createTransferCommand({ ...baseCommandInput, destinationReferenceId: 'bank-1' })));
test('reject provider adapter ref', () => expectCode('WAL_A05_PROVIDER_ADAPTER_INVALID', () => contract.createTransferCommand({ ...baseCommandInput, providerAdapterRef: 'provider' })));
test('reject invalid timestamp', () => expectCode('WAL_A05_TIMESTAMP_INVALID', () => contract.createTransferCommand({ ...baseCommandInput, createdAt: 'today' })));
test('reject raw bank top-level', () => expectCode('WAL_A05_RAW_BANK_DATA_FORBIDDEN', () => contract.createTransferCommand({ ...baseCommandInput, pixKey: 'x' })));
test('reject raw bank nested', () => expectCode('WAL_A05_RAW_BANK_DATA_FORBIDDEN', () => contract.createTransferCommand({ ...baseCommandInput, metadata: { accountNumber: '1' } })));
test('reject provider credential top-level', () => expectCode('WAL_A05_PROVIDER_CREDENTIAL_FORBIDDEN', () => contract.createTransferCommand({ ...baseCommandInput, apiKey: 'x' })));
test('reject provider credential nested', () => expectCode('WAL_A05_PROVIDER_CREDENTIAL_FORBIDDEN', () => contract.createTransferCommand({ ...baseCommandInput, metadata: { clientSecret: 'x' } })));
test('reject tampered transfer fingerprint', () => expectCode('WAL_A05_TRANSFER_FINGERPRINT_MISMATCH', () => contract.validateTransferCommand({ ...command, transferFingerprint: H('tampered') })));
test('reject tampered provider key', () => expectCode('WAL_A05_PROVIDER_IDEMPOTENCY_MISMATCH', () => contract.validateTransferCommand({ ...command, providerIdempotencyKey: 'pt-v1-' + 'b'.repeat(48) })));
test('reject tampered command fingerprint', () => expectCode('WAL_A05_COMMAND_FINGERPRINT_MISMATCH', () => contract.validateTransferCommand({ ...command, commandFingerprint: H('tampered') })));
test('reject command authority elevation', () => expectCode('WAL_A05_AUTHORITY_FORBIDDEN', () => contract.validateTransferCommand({ ...command, realMoneyAuthority: true })));

test('reject unsupported status', () => expectCode('WAL_A05_OBSERVATION_INVALID', () => contract.createProviderObservation(command, observationInput('completed', 1))));
test('reject unsupported source', () => expectCode('WAL_A05_OBSERVATION_INVALID', () => contract.createProviderObservation(command, observationInput('accepted', 1, { source: 'manual' }))));
test('reject bad event id', () => expectCode('WAL_A05_PROVIDER_EVENT_INVALID', () => contract.createProviderObservation(command, observationInput('accepted', 1, { providerEventId: '1' }))));
test('reject zero sequence', () => expectCode('WAL_A05_PROVIDER_SEQUENCE_INVALID', () => contract.createProviderObservation(command, observationInput('accepted', 0))));
test('reject event time after receive', () => expectCode('WAL_A05_TIMESTAMP_INVALID', () => contract.createProviderObservation(command, observationInput('accepted', 1, { occurredAt: '2026-08-04T18:02:00.000Z', receivedAt: '2026-08-04T18:01:00.000Z' }))));
test('reject unsigned webhook', () => expectCode('WAL_A05_WEBHOOK_SIGNATURE_REQUIRED', () => contract.createProviderObservation(command, observationInput('accepted', 1, { signatureVerified: false }))));
test('reject unauthenticated poll', () => expectCode('WAL_A05_AUTHENTICATED_CHANNEL_REQUIRED', () => contract.createProviderObservation(command, observationInput('processing', 2, { source: 'provider_status_poll', signatureVerified: false, authenticatedChannel: false }))));
test('reject missing provider reference', () => expectCode('WAL_A05_PROVIDER_REFERENCE_REQUIRED', () => contract.createProviderObservation(command, observationInput('succeeded', 3, { providerTransferReference: null }))));
test('reject reference on unknown submission', () => expectCode('WAL_A05_PROVIDER_REFERENCE_FORBIDDEN', () => contract.createProviderObservation(command, observationInput('submission_unknown', 1, { providerTransferReference: 'ptr_synthetic_transfer_01' }))));
test('reject amount drift', () => expectCode('WAL_A05_AMOUNT_MISMATCH', () => contract.createProviderObservation(command, observationInput('accepted', 1, { amountCents: command.amountCents + 1 }))));
test('reject currency drift', () => expectCode('WAL_A05_CURRENCY_MISMATCH', () => contract.createProviderObservation(command, observationInput('accepted', 1, { currency: 'USD' }))));
test('reject destination drift', () => expectCode('WAL_A05_DESTINATION_MISMATCH', () => contract.createProviderObservation(command, observationInput('accepted', 1, { destinationFingerprint: H('other') }))));
test('reject transfer drift', () => expectCode('WAL_A05_TRANSFER_MISMATCH', () => contract.createProviderObservation(command, observationInput('accepted', 1, { transferFingerprint: H('other') }))));
test('reject provider key drift', () => expectCode('WAL_A05_PROVIDER_IDEMPOTENCY_MISMATCH', () => contract.createProviderObservation(command, observationInput('accepted', 1, { providerIdempotencyKey: 'pt-v1-' + 'c'.repeat(48) }))));
test('reject tampered observation fingerprint', () => expectCode('WAL_A05_OBSERVATION_FINGERPRINT_MISMATCH', () => contract.validateProviderObservation(command, { ...accepted, observationFingerprint: H('tampered') })));
test('reject event id conflict', () => {
  const conflict = contract.createProviderObservation(command, observationInput('processing', 2, { providerEventId: accepted.providerEventId }));
  expectCode('WAL_A05_PROVIDER_EVENT_CONFLICT', () => contract.normalizeObservationChain(command, [accepted, conflict]));
});
test('reject sequence conflict', () => {
  const conflict = contract.createProviderObservation(command, observationInput('processing', 1, { providerEventId: 'pevt_synthetic_conflict_01' }));
  expectCode('WAL_A05_PROVIDER_SEQUENCE_CONFLICT', () => contract.normalizeObservationChain(command, [accepted, conflict]));
});
test('reject provider reference conflict', () => {
  const other = contract.createProviderObservation(command, observationInput('processing', 2, { providerTransferReference: 'ptr_synthetic_transfer_02' }));
  expectCode('WAL_A05_PROVIDER_REFERENCE_CONFLICT', () => contract.normalizeObservationChain(command, [accepted, other]));
});
test('reject backwards event time', () => {
  const backwards = contract.createProviderObservation(command, observationInput('processing', 2, { occurredAt: '2026-08-04T18:00:30.000Z', receivedAt: '2026-08-04T18:02:01.000Z' }));
  expectCode('WAL_A05_OBSERVATION_ORDER_INVALID', () => contract.normalizeObservationChain(command, [accepted, backwards]));
});
test('reject failed to succeeded', () => expectCode('WAL_A05_PROVIDER_TRANSITION_INVALID', () => contract.normalizeObservationChain(command, [accepted, failed, succeeded])));
test('reject reversal without success', () => expectCode('WAL_A05_PROVIDER_TRANSITION_INVALID', () => contract.normalizeObservationChain(command, [reversed])));
test('reject accepted to unknown', () => {
  const unknown2 = contract.createProviderObservation(command, observationInput('submission_unknown', 2, { providerEventId: 'pevt_synthetic_unknown_02' }));
  expectCode('WAL_A05_PROVIDER_TRANSITION_INVALID', () => contract.normalizeObservationChain(command, [accepted, unknown2]));
});

test('reject settlement on processing', () => expectCode('WAL_A05_SETTLEMENT_EVIDENCE_INVALID', () => contract.createSettlementEvidence(command, processing, settlementInput)));
test('reject invalid ledger id', () => expectCode('WAL_A05_LEDGER_ENTRY_INVALID', () => contract.createSettlementEvidence(command, succeeded, { ...settlementInput, ledgerEntryId: 'ledger' })));
test('reject invalid settlement ref', () => expectCode('WAL_A05_SETTLEMENT_REFERENCE_INVALID', () => contract.createSettlementEvidence(command, succeeded, { ...settlementInput, settlementReference: 'settlement' })));
test('reject reconciliation before success', () => expectCode('WAL_A05_TIMESTAMP_INVALID', () => contract.createSettlementEvidence(command, succeeded, { ...settlementInput, reconciledAt: '2026-08-04T18:02:00.000Z' })));
test('reject missing segregation', () => expectCode('WAL_A05_SEGREGATION_REQUIRED', () => contract.createSettlementEvidence(command, succeeded, { ...settlementInput, segregationOfDuties: false })));
test('reject settlement amount mismatch', () => expectCode('WAL_A05_AMOUNT_MISMATCH', () => contract.createSettlementEvidence(command, succeeded, { ...settlementInput, amountCents: command.amountCents + 1 })));
test('reject settlement currency mismatch', () => expectCode('WAL_A05_CURRENCY_MISMATCH', () => contract.createSettlementEvidence(command, succeeded, { ...settlementInput, currency: 'USD' })));
test('reject settlement destination mismatch', () => expectCode('WAL_A05_DESTINATION_MISMATCH', () => contract.createSettlementEvidence(command, succeeded, { ...settlementInput, destinationFingerprint: H('other') })));
test('reject settlement provider ref mismatch', () => expectCode('WAL_A05_PROVIDER_REFERENCE_MISMATCH', () => contract.createSettlementEvidence(command, succeeded, { ...settlementInput, providerTransferReference: 'ptr_synthetic_transfer_02' })));
test('reject settlement transfer mismatch', () => expectCode('WAL_A05_TRANSFER_MISMATCH', () => contract.createSettlementEvidence(command, succeeded, { ...settlementInput, transferFingerprint: H('other') })));
test('reject settlement observation mismatch', () => expectCode('WAL_A05_PROVIDER_OBSERVATION_MISMATCH', () => contract.createSettlementEvidence(command, succeeded, { ...settlementInput, providerObservationFingerprint: H('other') })));
test('reject settlement raw bank', () => expectCode('WAL_A05_RAW_BANK_DATA_FORBIDDEN', () => contract.createSettlementEvidence(command, succeeded, { ...settlementInput, metadata: { pixKey: 'x' } })));
test('reject settlement provider credential', () => expectCode('WAL_A05_PROVIDER_CREDENTIAL_FORBIDDEN', () => contract.createSettlementEvidence(command, succeeded, { ...settlementInput, metadata: { apiKey: 'x' } })));
test('reject tampered settlement fingerprint', () => expectCode('WAL_A05_SETTLEMENT_FINGERPRINT_MISMATCH', () => contract.validateSettlementEvidence(command, succeeded, { ...settlement, settlementFingerprint: H('tampered') })));

const settledResult = contract.reconcileTransfer(command, [accepted, processing, succeeded], settlement, '2026-08-04T18:10:00.000Z');
test('validate settled reconciliation', () => assert.equal(contract.validateReconciliationResult(settledResult).state, 'settled'));
test('reject forged completion on processing', () => {
  const processingResult = contract.reconcileTransfer(command, [accepted, processing], null, '2026-08-04T18:10:00.000Z');
  const forged = { ...processingResult, withdrawalCompletedForProjection: true };
  forged.reconciliationFingerprint = H('forged');
  expectCode('WAL_A05_RECONCILIATION_FINGERPRINT_MISMATCH', () => contract.validateReconciliationResult(forged));
});
test('reject tampered reconciliation fingerprint', () => expectCode('WAL_A05_RECONCILIATION_FINGERPRINT_MISMATCH', () => contract.validateReconciliationResult({ ...settledResult, reconciliationFingerprint: H('tampered') })));
test('reject completion flag false for settled', () => {
  const forged = { ...settledResult, withdrawalCompletedForProjection: false };
  forged.reconciliationFingerprint = contract.sha256(JSON.stringify(forged));
  expectCode('WAL_A05_RECONCILIATION_FINGERPRINT_MISMATCH', () => contract.validateReconciliationResult(forged));
});
test('reject reconciliation authority elevation', () => {
  const forged = { ...settledResult, productionAuthority: true };
  forged.reconciliationFingerprint = H('tampered-authority');
  expectCode('WAL_A05_RECONCILIATION_FINGERPRINT_MISMATCH', () => contract.validateReconciliationResult(forged));
});

const failedChecks = checks.filter((entry) => !entry.passed);
console.log(JSON.stringify({
  contractId: contract.CONTRACT_VERSION,
  total: checks.length,
  passed: checks.length - failedChecks.length,
  failed: failedChecks.length,
  status: failedChecks.length ? 'failed' : 'passed'
}, null, 2));
if (failedChecks.length) {
  failedChecks.forEach((entry) => console.error(`FAIL ${entry.name}\n${entry.error}`));
  process.exit(1);
}
