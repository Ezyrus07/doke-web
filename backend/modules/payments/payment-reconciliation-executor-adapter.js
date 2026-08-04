'use strict';

const crypto = require('node:crypto');

const CONTRACT_VERSION = 'pay-a10-external-executor-evidence-ingestion-v1';
const ADAPTER_VERSION = 'pay-reconciliation-executor-adapter-v1';
const DISPATCH_VERSION = 'pay-reconciliation-executor-dispatch-v1';
const RECEIPT_VERSION = 'pay-reconciliation-execution-receipt-v1';
const EVIDENCE_VERSION = 'pay-reconciliation-execution-evidence-v1';
const A09_CONTRACT_VERSION = 'pay-a09-deployment-inspection-handoff-v1';
const A09_PLAN_VERSION = 'pay-reconciliation-staging-handoff-plan-v1';
const MAX_RECEIPT_AGE_SECONDS = 15 * 60;

const ADAPTER_PROFILES = Object.freeze({
  read_only_preflight: Object.freeze({
    executorType: 'external_read_only_inspector',
    capability: 'read_only_catalog_query',
    allowedStatuses: Object.freeze(['preflight_passed', 'blocked'])
  }),
  migration_application: Object.freeze({
    executorType: 'external_database_executor',
    capability: 'ordered_migration_application',
    allowedStatuses: Object.freeze(['applied', 'partial', 'failed', 'blocked'])
  }),
  post_migration_verification: Object.freeze({
    executorType: 'external_read_only_inspector',
    capability: 'post_migration_catalog_query',
    allowedStatuses: Object.freeze(['verified', 'verification_failed', 'blocked'])
  }),
  rollback: Object.freeze({
    executorType: 'external_database_executor',
    capability: 'forward_only_corrective_migration',
    allowedStatuses: Object.freeze(['rollback_planned', 'rolled_forward', 'failed', 'blocked'])
  }),
  cleanup: Object.freeze({
    executorType: 'external_cleanup_executor',
    capability: 'temporary_artifact_cleanup',
    allowedStatuses: Object.freeze(['cleaned', 'failed', 'blocked'])
  })
});

const ALLOWED_SIGNATURE_SCHEMES = Object.freeze(['ed25519', 'rsa_pss_sha256']);
const ALLOWED_OUTCOME_CODES = Object.freeze([
  'ok',
  'blocked_policy',
  'blocked_drift',
  'blocked_authorization',
  'partial_failure',
  'execution_failure',
  'verification_failure',
  'cleanup_failure'
]);

const SENSITIVE_KEY_PATTERN = /(user|actor|order|payment|case|intent|provider|event|email|phone|cpf|cnpj|card|cvv|cvc|secret|token|password|authorization|cookie|raw|sql|stdout|stderr|idempotency)/i;

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function assert(condition, code, message) {
  if (!condition) fail(code, message);
}

function assertHash(value, code, label) {
  assert(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), code, label + ' must be a SHA-256 digest.');
}

function assertHead(value, code, label) {
  assert(typeof value === 'string' && /^[a-f0-9]{40}$/.test(value), code, label + ' must be an exact git commit.');
}

function assertNoSensitiveKeys(value, path = 'payload') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSensitiveKeys(item, path + '[' + index + ']'));
    return;
  }
  if (!value || typeof value !== 'object') return;
  Object.entries(value).forEach(([key, nested]) => {
    assert(!SENSITIVE_KEY_PATTERN.test(key), 'DOKE_PAY_A10_SENSITIVE_FIELD_DENIED', 'Sensitive field is denied at ' + path + '.' + key);
    assertNoSensitiveKeys(nested, path + '.' + key);
  });
}

function validateAdapterDescriptor(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'DOKE_PAY_A10_ADAPTER_DESCRIPTOR_REQUIRED', 'Adapter descriptor is required.');
  const profile = ADAPTER_PROFILES[input.operation];
  assert(profile, 'DOKE_PAY_A10_OPERATION_INVALID', 'Adapter operation is invalid.');
  assert(input.executorType === profile.executorType, 'DOKE_PAY_A10_EXECUTOR_TYPE_INVALID', 'Executor type does not match the phase.');
  assert(input.capability === profile.capability, 'DOKE_PAY_A10_CAPABILITY_INVALID', 'Executor capability does not match the phase.');
  assertHash(input.executorIdHash, 'DOKE_PAY_A10_EXECUTOR_ID_HASH_INVALID', 'Executor id');
  assert(typeof input.adapterId === 'string' && /^[a-z0-9][a-z0-9_-]{7,63}$/.test(input.adapterId), 'DOKE_PAY_A10_ADAPTER_ID_INVALID', 'Adapter id is invalid.');
  assert(input.transportConfigured === false, 'DOKE_PAY_A10_TRANSPORT_MUST_BE_DISABLED', 'Transport must remain unconfigured.');
  assert(input.credentialsConfigured === false, 'DOKE_PAY_A10_CREDENTIALS_MUST_BE_DISABLED', 'Credentials must remain unconfigured.');
  assert(input.endpointConfigured === false, 'DOKE_PAY_A10_ENDPOINT_MUST_BE_DISABLED', 'Endpoint must remain unconfigured.');
  assert(input.production === false, 'DOKE_PAY_A10_PRODUCTION_DENIED', 'Production is denied.');
  return Object.freeze({
    adapterId: input.adapterId,
    operation: input.operation,
    executorType: input.executorType,
    capability: input.capability,
    executorIdHash: input.executorIdHash
  });
}

function validateA09Plan(plan, descriptor) {
  assert(plan && typeof plan === 'object' && !Array.isArray(plan), 'DOKE_PAY_A10_A09_PLAN_REQUIRED', 'PAY-A09 plan is required.');
  assert(plan.contractVersion === A09_CONTRACT_VERSION, 'DOKE_PAY_A10_A09_CONTRACT_MISMATCH', 'PAY-A09 contract version mismatch.');
  assert(plan.planVersion === A09_PLAN_VERSION, 'DOKE_PAY_A10_A09_PLAN_VERSION_MISMATCH', 'PAY-A09 plan version mismatch.');
  assert(plan.operation === descriptor.operation, 'DOKE_PAY_A10_PLAN_OPERATION_MISMATCH', 'Plan operation does not match the adapter.');
  assertHead(plan.exactGitHead, 'DOKE_PAY_A10_PLAN_HEAD_INVALID', 'Plan head');
  ['manifestHash', 'resourcePlanHash', 'evidenceHash', 'planFingerprint'].forEach((key) => {
    assertHash(plan[key], 'DOKE_PAY_A10_PLAN_HASH_INVALID', key);
  });
  assert(plan.externalAuthorizedExecutorRequired === true, 'DOKE_PAY_A10_EXTERNAL_EXECUTOR_REQUIRED', 'External authorized executor boundary is required.');
  assert(plan.remoteExecutionAllowedByThisContract === false, 'DOKE_PAY_A10_REMOTE_AUTHORITY_ESCALATION', 'PAY-A09 plan may not grant repository remote authority.');
  assert(plan.repositoryExecutionPerformed === false, 'DOKE_PAY_A10_REPOSITORY_EXECUTION_CLAIM_DENIED', 'Repository execution claim is denied.');
  assert(plan.productionAllowed === false, 'DOKE_PAY_A10_PRODUCTION_DENIED', 'Production is denied.');
  assert(plan.directMoneyMutationAllowed === false, 'DOKE_PAY_A10_MONEY_MUTATION_DENIED', 'Money mutation is denied.');
  assert(plan.providerOperationAllowed === false, 'DOKE_PAY_A10_PROVIDER_OPERATION_DENIED', 'Provider operations are denied.');
  return plan;
}

function buildDispatchEnvelope(plan, adapterDescriptor) {
  const descriptor = validateAdapterDescriptor(adapterDescriptor);
  validateA09Plan(plan, descriptor);
  const body = {
    contractVersion: CONTRACT_VERSION,
    adapterVersion: ADAPTER_VERSION,
    dispatchVersion: DISPATCH_VERSION,
    adapterId: descriptor.adapterId,
    operation: descriptor.operation,
    executorType: descriptor.executorType,
    capability: descriptor.capability,
    executorIdHash: descriptor.executorIdHash,
    exactGitHead: plan.exactGitHead,
    manifestHash: plan.manifestHash,
    resourcePlanHash: plan.resourcePlanHash,
    evidenceHash: plan.evidenceHash,
    planFingerprint: plan.planFingerprint
  };
  return Object.freeze({
    ...body,
    dispatchFingerprint: sha256(canonicalJson(body)),
    externalExecutorAuthorizationStillRequired: true,
    transportConfigured: false,
    credentialsConfigured: false,
    endpointConfigured: false,
    remoteExecutionPerformed: false,
    repositoryExecutionPerformed: false,
    nextPhaseAutomaticallyAuthorized: false,
    productionAllowed: false,
    directMoneyMutationAllowed: false,
    providerOperationAllowed: false
  });
}

function validateReceiptFields(receipt) {
  const allowed = [
    'receiptVersion', 'operation', 'status', 'exactGitHead', 'manifestHash', 'resourcePlanHash',
    'planFingerprint', 'dispatchFingerprint', 'executorIdHash', 'executionIdHash',
    'signatureScheme', 'signatureHash', 'issuedAt', 'observedAt', 'sequence',
    'outcomeCode', 'receiptFingerprint'
  ];
  Object.keys(receipt).forEach((key) => {
    assert(allowed.includes(key), 'DOKE_PAY_A10_RECEIPT_FIELD_DENIED', 'Receipt field is not allowlisted: ' + key);
  });
}

function computeReceiptFingerprint(receipt) {
  const body = { ...receipt };
  delete body.receiptFingerprint;
  return sha256(canonicalJson(body));
}

function validateExecutorReceipt(receipt, dispatchEnvelope, receiptLedger = new Set()) {
  assert(receipt && typeof receipt === 'object' && !Array.isArray(receipt), 'DOKE_PAY_A10_RECEIPT_REQUIRED', 'Executor receipt is required.');
  assert(dispatchEnvelope && typeof dispatchEnvelope === 'object', 'DOKE_PAY_A10_DISPATCH_REQUIRED', 'Dispatch envelope is required.');
  validateReceiptFields(receipt);
  const profile = ADAPTER_PROFILES[dispatchEnvelope.operation];
  assert(profile, 'DOKE_PAY_A10_OPERATION_INVALID', 'Dispatch operation is invalid.');
  assert(receipt.receiptVersion === RECEIPT_VERSION, 'DOKE_PAY_A10_RECEIPT_VERSION_INVALID', 'Receipt version is invalid.');
  assert(receipt.operation === dispatchEnvelope.operation, 'DOKE_PAY_A10_RECEIPT_OPERATION_MISMATCH', 'Receipt operation mismatch.');
  assert(profile.allowedStatuses.includes(receipt.status), 'DOKE_PAY_A10_RECEIPT_STATUS_INVALID', 'Receipt status is invalid for the operation.');
  assertHead(receipt.exactGitHead, 'DOKE_PAY_A10_RECEIPT_HEAD_INVALID', 'Receipt head');
  ['manifestHash', 'resourcePlanHash', 'planFingerprint', 'dispatchFingerprint', 'executorIdHash',
    'executionIdHash', 'signatureHash', 'receiptFingerprint'].forEach((key) => {
    assertHash(receipt[key], 'DOKE_PAY_A10_RECEIPT_HASH_INVALID', key);
  });
  assert(receipt.exactGitHead === dispatchEnvelope.exactGitHead, 'DOKE_PAY_A10_RECEIPT_HEAD_MISMATCH', 'Receipt head mismatch.');
  ['manifestHash', 'resourcePlanHash', 'planFingerprint', 'dispatchFingerprint', 'executorIdHash'].forEach((key) => {
    assert(receipt[key] === dispatchEnvelope[key], 'DOKE_PAY_A10_RECEIPT_BINDING_MISMATCH', 'Receipt binding mismatch: ' + key);
  });
  assert(ALLOWED_SIGNATURE_SCHEMES.includes(receipt.signatureScheme), 'DOKE_PAY_A10_SIGNATURE_SCHEME_INVALID', 'Signature scheme is invalid.');
  assert(ALLOWED_OUTCOME_CODES.includes(receipt.outcomeCode), 'DOKE_PAY_A10_OUTCOME_CODE_INVALID', 'Outcome code is invalid.');
  assert(Number.isInteger(receipt.sequence) && receipt.sequence >= 1, 'DOKE_PAY_A10_RECEIPT_SEQUENCE_INVALID', 'Receipt sequence is invalid.');
  const issued = Date.parse(receipt.issuedAt);
  const observed = Date.parse(receipt.observedAt);
  assert(Number.isFinite(issued) && Number.isFinite(observed), 'DOKE_PAY_A10_RECEIPT_TIME_INVALID', 'Receipt timestamps are invalid.');
  assert(observed >= issued && (observed - issued) / 1000 <= MAX_RECEIPT_AGE_SECONDS, 'DOKE_PAY_A10_RECEIPT_EXPIRED', 'Receipt is expired.');
  assert(receipt.receiptFingerprint === computeReceiptFingerprint(receipt), 'DOKE_PAY_A10_RECEIPT_FINGERPRINT_MISMATCH', 'Receipt fingerprint mismatch.');
  assert(!receiptLedger.has(receipt.receiptFingerprint), 'DOKE_PAY_A10_RECEIPT_REPLAYED', 'Receipt replay is denied.');
  receiptLedger.add(receipt.receiptFingerprint);
  return Object.freeze({
    ...receipt,
    signatureDigestAccepted: true,
    rawSignatureStored: false,
    rawLogsStored: false,
    sanitized: true,
    nextPhaseAutomaticallyAuthorized: false,
    remoteActionTriggeredByIngestion: false,
    directMoneyMutationAllowed: false,
    providerOperationAllowed: false
  });
}

function validateEvidenceFields(evidence) {
  const allowed = [
    'evidenceVersion', 'operation', 'status', 'receiptFingerprint', 'planFingerprint',
    'observedAt', 'migrationsExpected', 'migrationsApplied', 'objectsExpected',
    'objectsObserved', 'schemaCompatible', 'migrationHistoryCompatible',
    'rollbackRequired', 'forwardCorrectionApplied', 'cleanupComplete',
    'outcomeCode', 'evidenceFingerprint'
  ];
  Object.keys(evidence).forEach((key) => {
    assert(allowed.includes(key), 'DOKE_PAY_A10_EVIDENCE_FIELD_DENIED', 'Evidence field is not allowlisted: ' + key);
  });
  assertNoSensitiveKeys(evidence);
}

function computeEvidenceFingerprint(evidence) {
  const body = { ...evidence };
  delete body.evidenceFingerprint;
  return sha256(canonicalJson(body));
}

function assertEvidenceConsistency(evidence) {
  if (evidence.status === 'preflight_passed' || evidence.status === 'verified') {
    assert(evidence.schemaCompatible === true && evidence.migrationHistoryCompatible === true, 'DOKE_PAY_A10_COMPATIBILITY_EVIDENCE_INVALID', 'Successful inspection requires compatible schema and history.');
    assert(evidence.objectsObserved === evidence.objectsExpected, 'DOKE_PAY_A10_OBJECT_COUNT_MISMATCH', 'Successful inspection requires all expected objects.');
  }
  if (evidence.status === 'applied') {
    assert(evidence.migrationsApplied === evidence.migrationsExpected, 'DOKE_PAY_A10_MIGRATION_COUNT_MISMATCH', 'Applied status requires all expected migrations.');
  }
  if (evidence.status === 'rolled_forward') {
    assert(evidence.forwardCorrectionApplied === true, 'DOKE_PAY_A10_FORWARD_CORRECTION_EVIDENCE_REQUIRED', 'Rolled-forward status requires corrective migration evidence.');
  }
  if (evidence.status === 'cleaned') {
    assert(evidence.cleanupComplete === true, 'DOKE_PAY_A10_CLEANUP_EVIDENCE_REQUIRED', 'Cleaned status requires cleanup completion evidence.');
  }
}

function ingestExecutionEvidence(evidence, acceptedReceipt, evidenceLedger = new Set()) {
  assert(evidence && typeof evidence === 'object' && !Array.isArray(evidence), 'DOKE_PAY_A10_EVIDENCE_REQUIRED', 'Execution evidence is required.');
  assert(acceptedReceipt && acceptedReceipt.sanitized === true, 'DOKE_PAY_A10_ACCEPTED_RECEIPT_REQUIRED', 'Accepted sanitized receipt is required.');
  validateEvidenceFields(evidence);
  assert(evidence.evidenceVersion === EVIDENCE_VERSION, 'DOKE_PAY_A10_EVIDENCE_VERSION_INVALID', 'Evidence version is invalid.');
  assert(evidence.operation === acceptedReceipt.operation, 'DOKE_PAY_A10_EVIDENCE_OPERATION_MISMATCH', 'Evidence operation mismatch.');
  assert(evidence.status === acceptedReceipt.status, 'DOKE_PAY_A10_EVIDENCE_STATUS_MISMATCH', 'Evidence status must match the accepted receipt.');
  assertHash(evidence.receiptFingerprint, 'DOKE_PAY_A10_EVIDENCE_RECEIPT_HASH_INVALID', 'Receipt fingerprint');
  assertHash(evidence.planFingerprint, 'DOKE_PAY_A10_EVIDENCE_PLAN_HASH_INVALID', 'Plan fingerprint');
  assertHash(evidence.evidenceFingerprint, 'DOKE_PAY_A10_EVIDENCE_HASH_INVALID', 'Evidence fingerprint');
  assert(evidence.receiptFingerprint === acceptedReceipt.receiptFingerprint, 'DOKE_PAY_A10_EVIDENCE_RECEIPT_MISMATCH', 'Evidence receipt binding mismatch.');
  assert(evidence.planFingerprint === acceptedReceipt.planFingerprint, 'DOKE_PAY_A10_EVIDENCE_PLAN_MISMATCH', 'Evidence plan binding mismatch.');
  assert(Number.isFinite(Date.parse(evidence.observedAt)), 'DOKE_PAY_A10_EVIDENCE_TIME_INVALID', 'Evidence timestamp is invalid.');
  ['migrationsExpected', 'migrationsApplied', 'objectsExpected', 'objectsObserved'].forEach((key) => {
    assert(Number.isInteger(evidence[key]) && evidence[key] >= 0, 'DOKE_PAY_A10_EVIDENCE_COUNT_INVALID', key + ' must be a non-negative integer.');
  });
  ['schemaCompatible', 'migrationHistoryCompatible', 'rollbackRequired', 'forwardCorrectionApplied', 'cleanupComplete'].forEach((key) => {
    assert(typeof evidence[key] === 'boolean', 'DOKE_PAY_A10_EVIDENCE_BOOLEAN_INVALID', key + ' must be boolean.');
  });
  assert(ALLOWED_OUTCOME_CODES.includes(evidence.outcomeCode), 'DOKE_PAY_A10_OUTCOME_CODE_INVALID', 'Evidence outcome code is invalid.');
  assertEvidenceConsistency(evidence);
  assert(evidence.evidenceFingerprint === computeEvidenceFingerprint(evidence), 'DOKE_PAY_A10_EVIDENCE_FINGERPRINT_MISMATCH', 'Evidence fingerprint mismatch.');
  assert(!evidenceLedger.has(evidence.evidenceFingerprint), 'DOKE_PAY_A10_EVIDENCE_REPLAYED', 'Evidence replay is denied.');
  evidenceLedger.add(evidence.evidenceFingerprint);
  return Object.freeze({
    ...evidence,
    sanitized: true,
    immutableAuditRecord: true,
    rawEvidenceStored: false,
    rawLogsStored: false,
    containsUserIdentifiers: false,
    containsFinancialIdentifiers: false,
    containsProviderPayload: false,
    containsSecrets: false,
    nextPhaseAutomaticallyAuthorized: false,
    remoteActionTriggeredByIngestion: false,
    directMoneyMutationAllowed: false,
    providerOperationAllowed: false
  });
}

function createInertExecutorAdapter(adapterDescriptor) {
  const descriptor = validateAdapterDescriptor(adapterDescriptor);
  return Object.freeze({
    contractVersion: CONTRACT_VERSION,
    adapterVersion: ADAPTER_VERSION,
    descriptor,
    prepareDispatch(plan) {
      return buildDispatchEnvelope(plan, adapterDescriptor);
    },
    acceptReceipt(receipt, dispatchEnvelope, receiptLedger) {
      return validateExecutorReceipt(receipt, dispatchEnvelope, receiptLedger);
    },
    ingestEvidence(evidence, acceptedReceipt, evidenceLedger) {
      return ingestExecutionEvidence(evidence, acceptedReceipt, evidenceLedger);
    },
    transportConfigured: false,
    credentialsConfigured: false,
    endpointConfigured: false,
    remoteExecutionAllowed: false,
    repositoryExecutionPerformed: false,
    executeMethodPresent: false
  });
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  ADAPTER_VERSION,
  DISPATCH_VERSION,
  RECEIPT_VERSION,
  EVIDENCE_VERSION,
  A09_CONTRACT_VERSION,
  A09_PLAN_VERSION,
  MAX_RECEIPT_AGE_SECONDS,
  ADAPTER_PROFILES,
  ALLOWED_SIGNATURE_SCHEMES,
  ALLOWED_OUTCOME_CODES,
  createInertExecutorAdapter,
  buildDispatchEnvelope,
  validateExecutorReceipt,
  ingestExecutionEvidence,
  computeReceiptFingerprint,
  computeEvidenceFingerprint,
  canonicalJson,
  sha256
});
