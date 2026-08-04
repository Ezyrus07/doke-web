'use strict';

const {
  CONTRACT_VERSION: A10_CONTRACT_VERSION,
  DISPATCH_VERSION,
  RECEIPT_VERSION,
  EVIDENCE_VERSION,
  A09_CONTRACT_VERSION,
  A09_PLAN_VERSION,
  MAX_RECEIPT_AGE_SECONDS,
  ADAPTER_PROFILES,
  ALLOWED_SIGNATURE_SCHEMES,
  buildDispatchEnvelope,
  validateExecutorReceipt,
  ingestExecutionEvidence,
  computeReceiptFingerprint,
  computeEvidenceFingerprint,
  canonicalJson,
  sha256
} = require('./payment-reconciliation-executor-adapter');

const CONTRACT_VERSION = 'pay-a11-executor-protocol-conformance-v1';
const MANIFEST_VERSION = 'pay-reconciliation-executor-protocol-manifest-v1';
const DRY_RUN_VERSION = 'pay-reconciliation-executor-dry-run-v1';
const CORPUS_VERSION = 'pay-reconciliation-executor-conformance-corpus-v1';
const RESULT_VERSION = 'pay-reconciliation-executor-conformance-result-v1';

const COMMAND_KINDS = Object.freeze({
  read_only_preflight: 'inspect_catalog_snapshot',
  migration_application: 'validate_ordered_migration_application',
  post_migration_verification: 'inspect_post_migration_catalog_snapshot',
  rollback: 'validate_forward_only_corrective_migration',
  cleanup: 'validate_temporary_artifact_cleanup'
});

const POSITIVE_STATUSES = Object.freeze({
  read_only_preflight: 'preflight_passed',
  migration_application: 'applied',
  post_migration_verification: 'verified',
  rollback: 'rolled_forward',
  cleanup: 'cleaned'
});

const RECEIPT_FIELDS = Object.freeze([
  'receiptVersion', 'operation', 'status', 'exactGitHead', 'manifestHash',
  'resourcePlanHash', 'planFingerprint', 'dispatchFingerprint', 'executorIdHash',
  'executionIdHash', 'signatureScheme', 'signatureHash', 'issuedAt', 'observedAt',
  'sequence', 'outcomeCode', 'receiptFingerprint'
]);

const EVIDENCE_FIELDS = Object.freeze([
  'evidenceVersion', 'operation', 'status', 'receiptFingerprint', 'planFingerprint',
  'observedAt', 'migrationsExpected', 'migrationsApplied', 'objectsExpected',
  'objectsObserved', 'schemaCompatible', 'migrationHistoryCompatible',
  'rollbackRequired', 'forwardCorrectionApplied', 'cleanupComplete', 'outcomeCode',
  'evidenceFingerprint'
]);

const RESOURCE_BINDINGS = Object.freeze([
  'exactGitHead', 'manifestHash', 'resourcePlanHash', 'planFingerprint',
  'dispatchFingerprint', 'executorIdHash'
]);

const DENIED_CAPABILITIES = Object.freeze([
  'network', 'database_connection', 'subprocess', 'environment_read',
  'raw_sql', 'production', 'direct_money_mutation', 'provider_operation',
  'automatic_next_phase'
]);

const CLEANUP_TARGETS = Object.freeze([
  'temporary_authorization_envelope',
  'temporary_executor_workspace',
  'temporary_canary_evidence',
  'temporary_ci_artifact'
]);

const PHASE_POLICIES = Object.freeze({
  read_only_preflight: Object.freeze({
    mutationAllowed: false,
    financialRowReadsAllowed: false,
    personalDataReadsAllowed: false
  }),
  migration_application: Object.freeze({
    orderedOnceFailClosed: true,
    stopOnFirstFailure: true,
    manualSqlAllowed: false,
    manualMigrationHistoryMutationAllowed: false
  }),
  post_migration_verification: Object.freeze({
    mutationAllowed: false,
    automaticDriftRepairAllowed: false
  }),
  rollback: Object.freeze({
    mode: 'forward_only_reviewed_migration',
    destructiveDownMigrationAllowed: false,
    dataDeletionAllowed: false,
    automaticRollbackAllowed: false
  }),
  cleanup: Object.freeze({
    allowedTargets: CLEANUP_TARGETS,
    databaseRowsDeletionAllowed: false,
    migrationHistoryDeletionAllowed: false,
    secretDeletionAllowed: false,
    automaticCleanupAllowed: false
  })
});

const MANIFEST_KEYS = Object.freeze([
  'contractVersion', 'manifestVersion', 'operation', 'executorType', 'capability',
  'commandKind', 'dispatchVersion', 'receiptVersion', 'evidenceVersion',
  'signatureSchemes', 'maxReceiptAgeSeconds', 'allowedStatuses',
  'requiredReceiptFields', 'allowedEvidenceFields', 'resourceBindings',
  'deniedCapabilities', 'phasePolicy', 'providerNeutral', 'dryRunOnly',
  'transportConfigured', 'credentialsConfigured', 'endpointConfigured',
  'networkAllowed', 'databaseConnectionAllowed', 'subprocessAllowed',
  'environmentReadAllowed', 'rawSqlAllowed', 'productionAllowed',
  'directMoneyMutationAllowed', 'providerOperationAllowed',
  'automaticNextPhaseAllowed', 'manifestFingerprint'
]);

const DRY_RUN_KEYS = Object.freeze([
  'dryRunVersion', 'manifestVersion', 'operation', 'executorType', 'capability',
  'commandKind', 'exactGitHead', 'manifestHash', 'resourcePlanHash',
  'planFingerprint', 'dispatchFingerprint', 'protocolManifestFingerprint',
  'fixtureId', 'fixtureClock', 'executionMode', 'networkAllowed',
  'databaseConnectionAllowed', 'subprocessAllowed', 'environmentReadAllowed',
  'rawSqlAllowed', 'productionAllowed', 'directMoneyMutationAllowed',
  'providerOperationAllowed', 'automaticNextPhaseAllowed',
  'remoteExecutionPerformed', 'repositoryExecutionPerformed',
  'dryRunFingerprint'
]);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function assert(condition, code, message) {
  if (!condition) fail(code, message);
}

function assertExactKeys(value, allowed, code, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), code, label + ' is required.');
  const keys = Object.keys(value).sort();
  const expected = [...allowed].sort();
  assert(canonicalJson(keys) === canonicalJson(expected), code, label + ' fields drifted.');
}

function assertHash(value, code, label) {
  assert(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), code, label + ' must be a SHA-256 digest.');
}

function assertHead(value, code, label) {
  assert(typeof value === 'string' && /^[a-f0-9]{40}$/.test(value), code, label + ' must be an exact git commit.');
}

function manifestBody(operation) {
  const profile = ADAPTER_PROFILES[operation];
  assert(profile, 'DOKE_PAY_A11_OPERATION_INVALID', 'Operation is invalid.');
  return {
    contractVersion: CONTRACT_VERSION,
    manifestVersion: MANIFEST_VERSION,
    operation,
    executorType: profile.executorType,
    capability: profile.capability,
    commandKind: COMMAND_KINDS[operation],
    dispatchVersion: DISPATCH_VERSION,
    receiptVersion: RECEIPT_VERSION,
    evidenceVersion: EVIDENCE_VERSION,
    signatureSchemes: ALLOWED_SIGNATURE_SCHEMES,
    maxReceiptAgeSeconds: MAX_RECEIPT_AGE_SECONDS,
    allowedStatuses: profile.allowedStatuses,
    requiredReceiptFields: RECEIPT_FIELDS,
    allowedEvidenceFields: EVIDENCE_FIELDS,
    resourceBindings: RESOURCE_BINDINGS,
    deniedCapabilities: DENIED_CAPABILITIES,
    phasePolicy: PHASE_POLICIES[operation],
    providerNeutral: true,
    dryRunOnly: true,
    transportConfigured: false,
    credentialsConfigured: false,
    endpointConfigured: false,
    networkAllowed: false,
    databaseConnectionAllowed: false,
    subprocessAllowed: false,
    environmentReadAllowed: false,
    rawSqlAllowed: false,
    productionAllowed: false,
    directMoneyMutationAllowed: false,
    providerOperationAllowed: false,
    automaticNextPhaseAllowed: false
  };
}

function buildProtocolManifest(operation) {
  const body = manifestBody(operation);
  return Object.freeze({
    ...body,
    manifestFingerprint: sha256(canonicalJson(body))
  });
}

function validatePhasePolicy(operation, policy) {
  const expected = PHASE_POLICIES[operation];
  assert(canonicalJson(policy) === canonicalJson(expected), 'DOKE_PAY_A11_PHASE_POLICY_DRIFT', 'Phase policy drifted.');
}

function validateProtocolManifest(manifest) {
  assertExactKeys(manifest, MANIFEST_KEYS, 'DOKE_PAY_A11_MANIFEST_FIELD_DENIED', 'Protocol manifest');
  const expected = manifestBody(manifest.operation);
  assert(manifest.contractVersion === CONTRACT_VERSION, 'DOKE_PAY_A11_CONTRACT_VERSION_INVALID', 'Contract version mismatch.');
  assert(manifest.manifestVersion === MANIFEST_VERSION, 'DOKE_PAY_A11_MANIFEST_VERSION_INVALID', 'Manifest version mismatch.');
  assert(manifest.executorType === expected.executorType, 'DOKE_PAY_A11_EXECUTOR_TYPE_MISMATCH', 'Executor type mismatch.');
  assert(manifest.capability === expected.capability, 'DOKE_PAY_A11_CAPABILITY_MISMATCH', 'Capability mismatch.');
  assert(manifest.commandKind === expected.commandKind, 'DOKE_PAY_A11_COMMAND_KIND_MISMATCH', 'Command kind mismatch.');
  assert(manifest.dispatchVersion === DISPATCH_VERSION, 'DOKE_PAY_A11_DISPATCH_VERSION_MISMATCH', 'Dispatch version mismatch.');
  assert(manifest.receiptVersion === RECEIPT_VERSION, 'DOKE_PAY_A11_RECEIPT_VERSION_MISMATCH', 'Receipt version mismatch.');
  assert(manifest.evidenceVersion === EVIDENCE_VERSION, 'DOKE_PAY_A11_EVIDENCE_VERSION_MISMATCH', 'Evidence version mismatch.');
  assert(manifest.maxReceiptAgeSeconds === MAX_RECEIPT_AGE_SECONDS, 'DOKE_PAY_A11_RECEIPT_AGE_DRIFT', 'Receipt age drifted.');
  [
    ['signatureSchemes', ALLOWED_SIGNATURE_SCHEMES],
    ['allowedStatuses', expected.allowedStatuses],
    ['requiredReceiptFields', RECEIPT_FIELDS],
    ['allowedEvidenceFields', EVIDENCE_FIELDS],
    ['resourceBindings', RESOURCE_BINDINGS],
    ['deniedCapabilities', DENIED_CAPABILITIES]
  ].forEach(([key, value]) => {
    assert(canonicalJson(manifest[key]) === canonicalJson(value), 'DOKE_PAY_A11_MANIFEST_ARRAY_DRIFT', key + ' drifted.');
  });
  validatePhasePolicy(manifest.operation, manifest.phasePolicy);
  assert(manifest.providerNeutral === true, 'DOKE_PAY_A11_PROVIDER_NEUTRALITY_REQUIRED', 'Manifest must remain provider-neutral.');
  assert(manifest.dryRunOnly === true, 'DOKE_PAY_A11_DRY_RUN_ONLY_REQUIRED', 'Manifest must remain dry-run-only.');
  [
    'transportConfigured', 'credentialsConfigured', 'endpointConfigured',
    'networkAllowed', 'databaseConnectionAllowed', 'subprocessAllowed',
    'environmentReadAllowed', 'rawSqlAllowed', 'productionAllowed',
    'directMoneyMutationAllowed', 'providerOperationAllowed',
    'automaticNextPhaseAllowed'
  ].forEach((key) => {
    assert(manifest[key] === false, 'DOKE_PAY_A11_CAPABILITY_DENIED', key + ' must remain false.');
  });
  assertHash(manifest.manifestFingerprint, 'DOKE_PAY_A11_MANIFEST_FINGERPRINT_INVALID', 'Manifest fingerprint');
  assert(
    manifest.manifestFingerprint === sha256(canonicalJson(expected)),
    'DOKE_PAY_A11_MANIFEST_FINGERPRINT_MISMATCH',
    'Manifest fingerprint mismatch.'
  );
  return Object.freeze({ ...manifest });
}

function dryRunBody(dispatchEnvelope, protocolManifest, fixtureId, fixtureClock) {
  return {
    dryRunVersion: DRY_RUN_VERSION,
    manifestVersion: protocolManifest.manifestVersion,
    operation: dispatchEnvelope.operation,
    executorType: dispatchEnvelope.executorType,
    capability: dispatchEnvelope.capability,
    commandKind: protocolManifest.commandKind,
    exactGitHead: dispatchEnvelope.exactGitHead,
    manifestHash: dispatchEnvelope.manifestHash,
    resourcePlanHash: dispatchEnvelope.resourcePlanHash,
    planFingerprint: dispatchEnvelope.planFingerprint,
    dispatchFingerprint: dispatchEnvelope.dispatchFingerprint,
    protocolManifestFingerprint: protocolManifest.manifestFingerprint,
    fixtureId,
    fixtureClock,
    executionMode: 'dry_run_only',
    networkAllowed: false,
    databaseConnectionAllowed: false,
    subprocessAllowed: false,
    environmentReadAllowed: false,
    rawSqlAllowed: false,
    productionAllowed: false,
    directMoneyMutationAllowed: false,
    providerOperationAllowed: false,
    automaticNextPhaseAllowed: false,
    remoteExecutionPerformed: false,
    repositoryExecutionPerformed: false
  };
}

function buildDryRunEnvelope(dispatchEnvelope, protocolManifest, fixtureId, fixtureClock) {
  validateProtocolManifest(protocolManifest);
  assert(dispatchEnvelope && typeof dispatchEnvelope === 'object', 'DOKE_PAY_A11_DISPATCH_REQUIRED', 'A10 dispatch is required.');
  assert(dispatchEnvelope.operation === protocolManifest.operation, 'DOKE_PAY_A11_DRY_RUN_OPERATION_MISMATCH', 'Dispatch operation mismatch.');
  assert(dispatchEnvelope.executorType === protocolManifest.executorType, 'DOKE_PAY_A11_DRY_RUN_EXECUTOR_MISMATCH', 'Dispatch executor mismatch.');
  assert(dispatchEnvelope.capability === protocolManifest.capability, 'DOKE_PAY_A11_DRY_RUN_CAPABILITY_MISMATCH', 'Dispatch capability mismatch.');
  assert(typeof fixtureId === 'string' && /^[a-z0-9][a-z0-9_-]{7,95}$/.test(fixtureId), 'DOKE_PAY_A11_FIXTURE_ID_INVALID', 'Fixture id is invalid.');
  assert(Number.isFinite(Date.parse(fixtureClock)), 'DOKE_PAY_A11_FIXTURE_CLOCK_INVALID', 'Fixture clock is invalid.');
  const body = dryRunBody(dispatchEnvelope, protocolManifest, fixtureId, fixtureClock);
  return Object.freeze({
    ...body,
    dryRunFingerprint: sha256(canonicalJson(body))
  });
}

function validateDryRunEnvelope(dryRun, protocolManifest, dispatchEnvelope) {
  assertExactKeys(dryRun, DRY_RUN_KEYS, 'DOKE_PAY_A11_DRY_RUN_FIELD_DENIED', 'Dry-run envelope');
  validateProtocolManifest(protocolManifest);
  assert(dryRun.dryRunVersion === DRY_RUN_VERSION, 'DOKE_PAY_A11_DRY_RUN_VERSION_INVALID', 'Dry-run version mismatch.');
  assert(dryRun.manifestVersion === MANIFEST_VERSION, 'DOKE_PAY_A11_DRY_RUN_MANIFEST_VERSION_INVALID', 'Dry-run manifest version mismatch.');
  assert(dryRun.operation === protocolManifest.operation && dryRun.operation === dispatchEnvelope.operation, 'DOKE_PAY_A11_DRY_RUN_OPERATION_MISMATCH', 'Dry-run operation mismatch.');
  assert(dryRun.executorType === protocolManifest.executorType && dryRun.executorType === dispatchEnvelope.executorType, 'DOKE_PAY_A11_DRY_RUN_EXECUTOR_MISMATCH', 'Dry-run executor mismatch.');
  assert(dryRun.capability === protocolManifest.capability && dryRun.capability === dispatchEnvelope.capability, 'DOKE_PAY_A11_DRY_RUN_CAPABILITY_MISMATCH', 'Dry-run capability mismatch.');
  assert(dryRun.commandKind === protocolManifest.commandKind, 'DOKE_PAY_A11_DRY_RUN_COMMAND_MISMATCH', 'Dry-run command mismatch.');
  assertHead(dryRun.exactGitHead, 'DOKE_PAY_A11_DRY_RUN_HEAD_INVALID', 'Dry-run head');
  ['manifestHash', 'resourcePlanHash', 'planFingerprint', 'dispatchFingerprint', 'protocolManifestFingerprint', 'dryRunFingerprint']
    .forEach((key) => assertHash(dryRun[key], 'DOKE_PAY_A11_DRY_RUN_HASH_INVALID', key));
  ['exactGitHead', 'manifestHash', 'resourcePlanHash', 'planFingerprint', 'dispatchFingerprint']
    .forEach((key) => assert(dryRun[key] === dispatchEnvelope[key], 'DOKE_PAY_A11_DRY_RUN_BINDING_MISMATCH', 'Dry-run binding mismatch: ' + key));
  assert(dryRun.protocolManifestFingerprint === protocolManifest.manifestFingerprint, 'DOKE_PAY_A11_DRY_RUN_MANIFEST_MISMATCH', 'Protocol manifest binding mismatch.');
  assert(typeof dryRun.fixtureId === 'string' && /^[a-z0-9][a-z0-9_-]{7,95}$/.test(dryRun.fixtureId), 'DOKE_PAY_A11_FIXTURE_ID_INVALID', 'Fixture id is invalid.');
  assert(Number.isFinite(Date.parse(dryRun.fixtureClock)), 'DOKE_PAY_A11_FIXTURE_CLOCK_INVALID', 'Fixture clock is invalid.');
  assert(dryRun.executionMode === 'dry_run_only', 'DOKE_PAY_A11_DRY_RUN_MODE_REQUIRED', 'Execution mode must remain dry-run-only.');
  [
    'networkAllowed', 'databaseConnectionAllowed', 'subprocessAllowed',
    'environmentReadAllowed', 'rawSqlAllowed', 'productionAllowed',
    'directMoneyMutationAllowed', 'providerOperationAllowed',
    'automaticNextPhaseAllowed', 'remoteExecutionPerformed',
    'repositoryExecutionPerformed'
  ].forEach((key) => assert(dryRun[key] === false, 'DOKE_PAY_A11_DRY_RUN_CAPABILITY_DENIED', key + ' must remain false.'));
  const body = { ...dryRun };
  delete body.dryRunFingerprint;
  assert(dryRun.dryRunFingerprint === sha256(canonicalJson(body)), 'DOKE_PAY_A11_DRY_RUN_FINGERPRINT_MISMATCH', 'Dry-run fingerprint mismatch.');
  return Object.freeze({ ...dryRun });
}

function makePlan(operation, exactGitHead, seed) {
  return {
    contractVersion: A09_CONTRACT_VERSION,
    planVersion: A09_PLAN_VERSION,
    operation,
    exactGitHead,
    manifestHash: sha256('manifest:' + seed),
    resourcePlanHash: sha256('resources:' + seed),
    evidenceHash: sha256('evidence:' + seed),
    planFingerprint: sha256('plan:' + seed),
    externalAuthorizedExecutorRequired: true,
    remoteExecutionAllowedByThisContract: false,
    repositoryExecutionPerformed: false,
    productionAllowed: false,
    directMoneyMutationAllowed: false,
    providerOperationAllowed: false
  };
}

function makeDescriptor(operation, seed) {
  const profile = ADAPTER_PROFILES[operation];
  return {
    adapterId: 'pay-a11-' + operation.replaceAll('_', '-'),
    operation,
    executorType: profile.executorType,
    capability: profile.capability,
    executorIdHash: sha256('executor:' + seed),
    transportConfigured: false,
    credentialsConfigured: false,
    endpointConfigured: false,
    production: false
  };
}

function makeReceipt(dispatch, status, fixtureClock, seed) {
  const issued = new Date(fixtureClock);
  const observed = new Date(issued.getTime() + 5_000);
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
    executionIdHash: sha256('execution:' + seed),
    signatureScheme: 'ed25519',
    signatureHash: sha256('signature:' + seed),
    issuedAt: issued.toISOString(),
    observedAt: observed.toISOString(),
    sequence: 1,
    outcomeCode: 'ok'
  };
  receipt.receiptFingerprint = computeReceiptFingerprint(receipt);
  return receipt;
}

function makeEvidence(receipt, fixtureClock) {
  const evidence = {
    evidenceVersion: EVIDENCE_VERSION,
    operation: receipt.operation,
    status: receipt.status,
    receiptFingerprint: receipt.receiptFingerprint,
    planFingerprint: receipt.planFingerprint,
    observedAt: new Date(new Date(fixtureClock).getTime() + 10_000).toISOString(),
    migrationsExpected: 0,
    migrationsApplied: 0,
    objectsExpected: 0,
    objectsObserved: 0,
    schemaCompatible: false,
    migrationHistoryCompatible: false,
    rollbackRequired: false,
    forwardCorrectionApplied: false,
    cleanupComplete: false,
    outcomeCode: 'ok'
  };
  if (receipt.operation === 'read_only_preflight' || receipt.operation === 'post_migration_verification') {
    evidence.objectsExpected = 9;
    evidence.objectsObserved = 9;
    evidence.schemaCompatible = true;
    evidence.migrationHistoryCompatible = true;
  }
  if (receipt.operation === 'migration_application') {
    evidence.migrationsExpected = 4;
    evidence.migrationsApplied = 4;
  }
  if (receipt.operation === 'rollback') {
    evidence.migrationsExpected = 1;
    evidence.migrationsApplied = 1;
    evidence.rollbackRequired = true;
    evidence.forwardCorrectionApplied = true;
  }
  if (receipt.operation === 'cleanup') {
    evidence.cleanupComplete = true;
  }
  evidence.evidenceFingerprint = computeEvidenceFingerprint(evidence);
  return evidence;
}

function createCanonicalFixture(operation, options = {}) {
  const exactGitHead = options.exactGitHead || 'a'.repeat(40);
  const fixtureClock = options.fixtureClock || '2026-08-03T20:00:00.000Z';
  const seed = options.seed || operation;
  const descriptor = makeDescriptor(operation, seed);
  const plan = makePlan(operation, exactGitHead, seed);
  const dispatch = buildDispatchEnvelope(plan, descriptor);
  const manifest = JSON.parse(JSON.stringify(buildProtocolManifest(operation)));
  const dryRun = JSON.parse(JSON.stringify(buildDryRunEnvelope(dispatch, manifest, 'pay-a11-' + operation.replaceAll('_', '-'), fixtureClock)));
  const receipt = makeReceipt(dispatch, POSITIVE_STATUSES[operation], fixtureClock, seed);
  const evidence = makeEvidence(receipt, fixtureClock);
  return { descriptor, plan, dispatch, manifest, dryRun, receipt, evidence };
}

function refreshReceiptFingerprint(receipt) {
  receipt.receiptFingerprint = computeReceiptFingerprint(receipt);
}

function refreshEvidenceFingerprint(evidence) {
  evidence.evidenceFingerprint = computeEvidenceFingerprint(evidence);
}

function mutateFixture(fixture, mutation) {
  switch (mutation) {
    case 'none':
      return;
    case 'manifest_extra_field':
      fixture.manifest.providerName = 'opaque-vendor';
      return;
    case 'manifest_transport_enabled':
      fixture.manifest.transportConfigured = true;
      return;
    case 'manifest_credentials_enabled':
      fixture.manifest.credentialsConfigured = true;
      return;
    case 'manifest_endpoint_enabled':
      fixture.manifest.endpointConfigured = true;
      return;
    case 'manifest_network_enabled':
      fixture.manifest.networkAllowed = true;
      return;
    case 'manifest_database_enabled':
      fixture.manifest.databaseConnectionAllowed = true;
      return;
    case 'manifest_subprocess_enabled':
      fixture.manifest.subprocessAllowed = true;
      return;
    case 'manifest_environment_enabled':
      fixture.manifest.environmentReadAllowed = true;
      return;
    case 'manifest_raw_sql_enabled':
      fixture.manifest.rawSqlAllowed = true;
      return;
    case 'manifest_production_enabled':
      fixture.manifest.productionAllowed = true;
      return;
    case 'manifest_money_enabled':
      fixture.manifest.directMoneyMutationAllowed = true;
      return;
    case 'manifest_provider_enabled':
      fixture.manifest.providerOperationAllowed = true;
      return;
    case 'manifest_auto_next_enabled':
      fixture.manifest.automaticNextPhaseAllowed = true;
      return;
    case 'manifest_wrong_capability':
      fixture.manifest.capability = 'unexpected_capability';
      return;
    case 'manifest_fingerprint_drift':
      fixture.manifest.manifestFingerprint = '0'.repeat(64);
      return;
    case 'phase_preflight_mutation_enabled':
      fixture.manifest.phasePolicy = { ...fixture.manifest.phasePolicy, mutationAllowed: true };
      return;
    case 'phase_migration_stop_on_failure_disabled':
      fixture.manifest.phasePolicy = { ...fixture.manifest.phasePolicy, stopOnFirstFailure: false };
      return;
    case 'phase_post_auto_repair_enabled':
      fixture.manifest.phasePolicy = { ...fixture.manifest.phasePolicy, automaticDriftRepairAllowed: true };
      return;
    case 'phase_rollback_destructive_enabled':
      fixture.manifest.phasePolicy = { ...fixture.manifest.phasePolicy, destructiveDownMigrationAllowed: true };
      return;
    case 'phase_cleanup_database_target_added':
      fixture.manifest.phasePolicy = {
        ...fixture.manifest.phasePolicy,
        allowedTargets: [...fixture.manifest.phasePolicy.allowedTargets, 'database_rows']
      };
      return;
    case 'dry_run_operation_drift':
      fixture.dryRun.operation = 'cleanup';
      return;
    case 'dry_run_network_enabled':
      fixture.dryRun.networkAllowed = true;
      return;
    case 'dry_run_fingerprint_drift':
      fixture.dryRun.dryRunFingerprint = '0'.repeat(64);
      return;
    case 'receipt_cross_phase_status':
      fixture.receipt.status = 'applied';
      refreshReceiptFingerprint(fixture.receipt);
      return;
    case 'receipt_stale':
      fixture.receipt.observedAt = new Date(new Date(fixture.receipt.issuedAt).getTime() + (MAX_RECEIPT_AGE_SECONDS + 1) * 1000).toISOString();
      refreshReceiptFingerprint(fixture.receipt);
      return;
    case 'receipt_head_drift':
      fixture.receipt.exactGitHead = 'b'.repeat(40);
      refreshReceiptFingerprint(fixture.receipt);
      return;
    case 'receipt_replay':
      return;
    case 'evidence_raw_sql_field':
      fixture.evidence.rawSql = 'forbidden';
      return;
    case 'evidence_receipt_drift':
      fixture.evidence.receiptFingerprint = 'f'.repeat(64);
      refreshEvidenceFingerprint(fixture.evidence);
      return;
    case 'evidence_replay':
      return;
    default:
      fail('DOKE_PAY_A11_CORPUS_MUTATION_INVALID', 'Unknown corpus mutation: ' + mutation);
  }
}

function executeFixture(fixture, mutation) {
  validateProtocolManifest(fixture.manifest);
  validateDryRunEnvelope(fixture.dryRun, fixture.manifest, fixture.dispatch);
  const receiptLedger = new Set();
  const acceptedReceipt = validateExecutorReceipt(fixture.receipt, fixture.dispatch, receiptLedger);
  if (mutation === 'receipt_replay') {
    validateExecutorReceipt(fixture.receipt, fixture.dispatch, receiptLedger);
  }
  const evidenceLedger = new Set();
  const acceptedEvidence = ingestExecutionEvidence(fixture.evidence, acceptedReceipt, evidenceLedger);
  if (mutation === 'evidence_replay') {
    ingestExecutionEvidence(fixture.evidence, acceptedReceipt, evidenceLedger);
  }
  return { acceptedReceipt, acceptedEvidence };
}

function runConformanceCase(caseDefinition, corpus) {
  const fixture = createCanonicalFixture(caseDefinition.operation, {
    exactGitHead: corpus.exactGitHead,
    fixtureClock: corpus.fixtureClock,
    seed: caseDefinition.id
  });
  mutateFixture(fixture, caseDefinition.mutation);
  try {
    executeFixture(fixture, caseDefinition.mutation);
    return Object.freeze({
      id: caseDefinition.id,
      operation: caseDefinition.operation,
      accepted: true,
      errorCode: null,
      passed: caseDefinition.expected.accepted === true
    });
  } catch (error) {
    return Object.freeze({
      id: caseDefinition.id,
      operation: caseDefinition.operation,
      accepted: false,
      errorCode: error && error.code ? error.code : 'UNEXPECTED_ERROR',
      passed: caseDefinition.expected.accepted === false && caseDefinition.expected.errorCode === error.code
    });
  }
}

function validateCorpus(corpus) {
  assert(corpus && typeof corpus === 'object' && !Array.isArray(corpus), 'DOKE_PAY_A11_CORPUS_REQUIRED', 'Corpus is required.');
  assert(corpus.corpusVersion === CORPUS_VERSION, 'DOKE_PAY_A11_CORPUS_VERSION_INVALID', 'Corpus version mismatch.');
  assertHead(corpus.exactGitHead, 'DOKE_PAY_A11_CORPUS_HEAD_INVALID', 'Corpus head');
  assert(Number.isFinite(Date.parse(corpus.fixtureClock)), 'DOKE_PAY_A11_CORPUS_CLOCK_INVALID', 'Corpus clock invalid.');
  assert(Array.isArray(corpus.cases) && corpus.cases.length >= 10, 'DOKE_PAY_A11_CORPUS_TOO_SMALL', 'Corpus is too small.');
  const ids = new Set();
  const positiveOperations = new Set();
  corpus.cases.forEach((item) => {
    assert(item && typeof item === 'object', 'DOKE_PAY_A11_CORPUS_CASE_INVALID', 'Corpus case invalid.');
    assert(typeof item.id === 'string' && /^[a-z0-9][a-z0-9_-]{7,95}$/.test(item.id), 'DOKE_PAY_A11_CORPUS_CASE_ID_INVALID', 'Corpus case id invalid.');
    assert(!ids.has(item.id), 'DOKE_PAY_A11_CORPUS_CASE_DUPLICATE', 'Corpus case id duplicated.');
    ids.add(item.id);
    assert(ADAPTER_PROFILES[item.operation], 'DOKE_PAY_A11_CORPUS_OPERATION_INVALID', 'Corpus operation invalid.');
    assert(typeof item.mutation === 'string', 'DOKE_PAY_A11_CORPUS_MUTATION_REQUIRED', 'Corpus mutation required.');
    assert(item.expected && typeof item.expected.accepted === 'boolean', 'DOKE_PAY_A11_CORPUS_EXPECTATION_INVALID', 'Corpus expectation invalid.');
    if (item.expected.accepted) {
      assert(item.mutation === 'none', 'DOKE_PAY_A11_CORPUS_POSITIVE_MUTATION_INVALID', 'Positive cases may not mutate fixtures.');
      positiveOperations.add(item.operation);
    } else {
      assert(typeof item.expected.errorCode === 'string' && item.expected.errorCode.startsWith('DOKE_PAY_'), 'DOKE_PAY_A11_CORPUS_ERROR_CODE_INVALID', 'Negative case error code invalid.');
    }
  });
  assert(canonicalJson([...positiveOperations].sort()) === canonicalJson(Object.keys(ADAPTER_PROFILES).sort()), 'DOKE_PAY_A11_CORPUS_PHASE_COVERAGE_INCOMPLETE', 'Every phase requires a positive case.');
  return corpus;
}

function runConformanceCorpus(corpus) {
  validateCorpus(corpus);
  const results = corpus.cases.map((item) => runConformanceCase(item, corpus));
  const acceptedCases = results.filter((item) => item.accepted).length;
  const rejectedCases = results.length - acceptedCases;
  const passedCases = results.filter((item) => item.passed).length;
  return Object.freeze({
    resultVersion: RESULT_VERSION,
    corpusVersion: CORPUS_VERSION,
    corpusFingerprint: sha256(canonicalJson(corpus)),
    totalCases: results.length,
    acceptedCases,
    rejectedCases,
    passedCases,
    allPassed: passedCases === results.length,
    networkRequests: 0,
    databaseConnections: 0,
    subprocesses: 0,
    environmentReads: 0,
    remoteExecutions: 0,
    repositoryExecutions: 0,
    productionChanges: 0,
    financialMutations: 0,
    providerOperations: 0,
    results: Object.freeze(results)
  });
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  MANIFEST_VERSION,
  DRY_RUN_VERSION,
  CORPUS_VERSION,
  RESULT_VERSION,
  A10_CONTRACT_VERSION,
  COMMAND_KINDS,
  POSITIVE_STATUSES,
  RECEIPT_FIELDS,
  EVIDENCE_FIELDS,
  RESOURCE_BINDINGS,
  DENIED_CAPABILITIES,
  PHASE_POLICIES,
  CLEANUP_TARGETS,
  buildProtocolManifest,
  validateProtocolManifest,
  buildDryRunEnvelope,
  validateDryRunEnvelope,
  createCanonicalFixture,
  validateCorpus,
  runConformanceCase,
  runConformanceCorpus
});
