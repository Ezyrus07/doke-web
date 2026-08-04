'use strict';

const assert = require('node:assert/strict');
const {
  CONTRACT_VERSION,
  ADAPTER_VERSION,
  RECEIPT_VERSION,
  EVIDENCE_VERSION,
  ADAPTER_PROFILES,
  createInertExecutorAdapter,
  computeReceiptFingerprint,
  computeEvidenceFingerprint
} = require('../backend/modules/payments/payment-reconciliation-executor-adapter');

function expectCode(fn, code) {
  assert.throws(fn, (error) => error && error.code === code);
}

const head = 'a'.repeat(40);
const manifestHash = 'b'.repeat(64);
const resourcePlanHash = 'c'.repeat(64);
const evidenceHash = 'd'.repeat(64);

function makePlan(operation) {
  return {
    contractVersion: 'pay-a09-deployment-inspection-handoff-v1',
    planVersion: 'pay-reconciliation-staging-handoff-plan-v1',
    operation,
    exactGitHead: head,
    manifestHash,
    resourcePlanHash,
    evidenceHash,
    planFingerprint: 'e'.repeat(64),
    externalAuthorizedExecutorRequired: true,
    remoteExecutionAllowedByThisContract: false,
    repositoryExecutionPerformed: false,
    productionAllowed: false,
    directMoneyMutationAllowed: false,
    providerOperationAllowed: false
  };
}

function descriptor(operation, suffix) {
  const profile = ADAPTER_PROFILES[operation];
  return {
    adapterId: 'pay-a10-' + operation.replaceAll('_', '-') + '-' + suffix,
    operation,
    executorType: profile.executorType,
    capability: profile.capability,
    executorIdHash: suffix.repeat(64),
    transportConfigured: false,
    credentialsConfigured: false,
    endpointConfigured: false,
    production: false
  };
}

function makeReceipt(dispatch, status, suffix, overrides = {}) {
  const receipt = {
    receiptVersion: RECEIPT_VERSION,
    operation: dispatch.operation,
    status,
    exactGitHead: dispatch.exactGitHead,
    manifestHash: dispatch.manifestHash,
    resourcePlanHash: dispatch.resourcePlanHash,
    planFingerprint: dispatch.planFingerprint,
    dispatchFingerprint: dispatch.dispatchFingerprint,
    executorIdHash: dispatch.executorIdHash,
    executionIdHash: suffix.repeat(64),
    signatureScheme: 'ed25519',
    signatureHash: '9'.repeat(64),
    issuedAt: '2026-08-03T20:00:00.000Z',
    observedAt: '2026-08-03T20:05:00.000Z',
    sequence: 1,
    outcomeCode: 'ok',
    ...overrides
  };
  receipt.receiptFingerprint = computeReceiptFingerprint(receipt);
  return receipt;
}

function makeEvidence(receipt, overrides = {}) {
  const evidence = {
    evidenceVersion: EVIDENCE_VERSION,
    operation: receipt.operation,
    status: receipt.status,
    receiptFingerprint: receipt.receiptFingerprint,
    planFingerprint: receipt.planFingerprint,
    observedAt: '2026-08-03T20:05:30.000Z',
    migrationsExpected: 4,
    migrationsApplied: 0,
    objectsExpected: 5,
    objectsObserved: 0,
    schemaCompatible: false,
    migrationHistoryCompatible: false,
    rollbackRequired: false,
    forwardCorrectionApplied: false,
    cleanupComplete: false,
    outcomeCode: 'ok',
    ...overrides
  };
  evidence.evidenceFingerprint = computeEvidenceFingerprint(evidence);
  return evidence;
}

const phaseCases = [
  ['read_only_preflight', 'preflight_passed', { objectsObserved: 5, schemaCompatible: true, migrationHistoryCompatible: true }],
  ['migration_application', 'applied', { migrationsApplied: 4 }],
  ['post_migration_verification', 'verified', { objectsObserved: 5, schemaCompatible: true, migrationHistoryCompatible: true }],
  ['rollback', 'rolled_forward', { rollbackRequired: true, forwardCorrectionApplied: true }],
  ['cleanup', 'cleaned', { cleanupComplete: true }]
];

for (let index = 0; index < phaseCases.length; index += 1) {
  const [operation, status, evidenceOverrides] = phaseCases[index];
  const suffix = String(index + 1);
  const adapter = createInertExecutorAdapter(descriptor(operation, suffix));
  assert.equal(adapter.contractVersion, CONTRACT_VERSION);
  assert.equal(adapter.adapterVersion, ADAPTER_VERSION);
  assert.equal(adapter.transportConfigured, false);
  assert.equal(adapter.credentialsConfigured, false);
  assert.equal(adapter.endpointConfigured, false);
  assert.equal(adapter.remoteExecutionAllowed, false);
  assert.equal(adapter.repositoryExecutionPerformed, false);
  assert.equal(adapter.executeMethodPresent, false);
  assert.equal('execute' in adapter, false);
  assert.equal('send' in adapter, false);
  assert.equal('request' in adapter, false);

  const dispatch = adapter.prepareDispatch(makePlan(operation));
  assert.equal(dispatch.operation, operation);
  assert.equal(dispatch.transportConfigured, false);
  assert.equal(dispatch.externalExecutorAuthorizationStillRequired, true);
  assert.equal(dispatch.nextPhaseAutomaticallyAuthorized, false);
  assert.equal(dispatch.remoteExecutionPerformed, false);
  assert.equal(dispatch.directMoneyMutationAllowed, false);

  const receiptLedger = new Set();
  const receiptInput = makeReceipt(dispatch, status, suffix);
  const receipt = adapter.acceptReceipt(receiptInput, dispatch, receiptLedger);
  assert.equal(receipt.sanitized, true);
  assert.equal(receipt.rawSignatureStored, false);
  assert.equal(receipt.rawLogsStored, false);
  assert.equal(receipt.nextPhaseAutomaticallyAuthorized, false);
  assert.equal(receipt.remoteActionTriggeredByIngestion, false);
  expectCode(() => adapter.acceptReceipt(receiptInput, dispatch, receiptLedger), 'DOKE_PAY_A10_RECEIPT_REPLAYED');

  const evidenceLedger = new Set();
  const evidenceInput = makeEvidence(receipt, evidenceOverrides);
  const evidence = adapter.ingestEvidence(evidenceInput, receipt, evidenceLedger);
  assert.equal(evidence.sanitized, true);
  assert.equal(evidence.immutableAuditRecord, true);
  assert.equal(evidence.rawEvidenceStored, false);
  assert.equal(evidence.containsUserIdentifiers, false);
  assert.equal(evidence.containsFinancialIdentifiers, false);
  assert.equal(evidence.nextPhaseAutomaticallyAuthorized, false);
  assert.equal(evidence.remoteActionTriggeredByIngestion, false);
  expectCode(() => adapter.ingestEvidence(evidenceInput, receipt, evidenceLedger), 'DOKE_PAY_A10_EVIDENCE_REPLAYED');
}

expectCode(() => createInertExecutorAdapter({
  ...descriptor('read_only_preflight', '6'),
  transportConfigured: true
}), 'DOKE_PAY_A10_TRANSPORT_MUST_BE_DISABLED');

const preflightAdapter = createInertExecutorAdapter(descriptor('read_only_preflight', '7'));
expectCode(() => preflightAdapter.prepareDispatch({
  ...makePlan('read_only_preflight'),
  remoteExecutionAllowedByThisContract: true
}), 'DOKE_PAY_A10_REMOTE_AUTHORITY_ESCALATION');

const preflightDispatch = preflightAdapter.prepareDispatch(makePlan('read_only_preflight'));
const badStatusReceipt = makeReceipt(preflightDispatch, 'applied', '8');
expectCode(() => preflightAdapter.acceptReceipt(badStatusReceipt, preflightDispatch, new Set()), 'DOKE_PAY_A10_RECEIPT_STATUS_INVALID');

const unsignedReceipt = makeReceipt(preflightDispatch, 'blocked', '8', { signatureScheme: 'none' });
expectCode(() => preflightAdapter.acceptReceipt(unsignedReceipt, preflightDispatch, new Set()), 'DOKE_PAY_A10_SIGNATURE_SCHEME_INVALID');

const expiredReceipt = makeReceipt(preflightDispatch, 'blocked', '8', {
  observedAt: '2026-08-03T20:16:01.000Z'
});
expectCode(() => preflightAdapter.acceptReceipt(expiredReceipt, preflightDispatch, new Set()), 'DOKE_PAY_A10_RECEIPT_EXPIRED');

const accepted = preflightAdapter.acceptReceipt(makeReceipt(preflightDispatch, 'preflight_passed', '8'), preflightDispatch, new Set());
const inconsistent = makeEvidence(accepted, {
  objectsObserved: 4,
  schemaCompatible: true,
  migrationHistoryCompatible: true
});
expectCode(() => preflightAdapter.ingestEvidence(inconsistent, accepted, new Set()), 'DOKE_PAY_A10_OBJECT_COUNT_MISMATCH');

const sensitive = makeEvidence(accepted, {
  objectsObserved: 5,
  schemaCompatible: true,
  migrationHistoryCompatible: true
});
sensitive.paymentId = 'forbidden';
sensitive.evidenceFingerprint = computeEvidenceFingerprint(sensitive);
expectCode(() => preflightAdapter.ingestEvidence(sensitive, accepted, new Set()), 'DOKE_PAY_A10_EVIDENCE_FIELD_DENIED');

console.log('PAY-A10 external executor adapter and evidence ingestion runtime tests passed.');
