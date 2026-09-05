'use strict';

const crypto = require('node:crypto');
const r3k = require('./community-realtime-private-auth-r3k');
const r4t = require('./community-realtime-private-auth-r4t');

const CONTRACT_ID = 'com-b03c-r4u-fresh-head-bound-r4t-successor-authorization-lifecycle-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4U-FRESH-HEAD-BOUND-R4T-SUCCESSOR-AUTHORIZATION-LIFECYCLE-READINESS';
const STATUS = 'repository_fresh_head_bound_r4t_successor_authorization_lifecycle_ready_authorization_absent_no_remote_authority';

const PREDECESSOR_R4T_EVIDENCE_HEAD = 'c83109ae0b193f2252423053ab0ff22a6876eb14';
const PREDECESSOR_R4T_EVIDENCE_BLOB = '63c46dd56ffc2de06399e4d5fbb8c50d9ec9733f';
const PREDECESSOR_R4T_FINAL_RUN = 31633477336;
const PREDECESSOR_R4T_FINAL_JOB = 94237849164;
const PREDECESSOR_R4T_MATRIX_RUN = 31633477364;
const PREDECESSOR_R4T_MATRIX_JOB = 94237849454;

const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const REQUIRED_BRANCH = r3k.REQUIRED_BRANCH;
const REQUIRED_PULL_REQUEST = r3k.REQUIRED_PULL_REQUEST;
const REQUIRED_PROJECT_ID = r3k.REQUIRED_PROJECT_ID;
const REQUIRED_PROJECT_NAME = r3k.REQUIRED_PROJECT_NAME;
const TARGET_ENVIRONMENT = 'staging';

const FUTURE_AUTHORIZATION_CONSUMPTION_PATH = 'config/com-b03c-r4v-r4u-fresh-authorization-consumption.json';
const FUTURE_TRIGGER_PATH = 'config/com-b03c-r4t-single-use-successor-executor-trigger.json';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4U_REMOTE_EXECUTION_NOT_AUTHORIZED';

const LIFECYCLE_STATES = Object.freeze([
  'r4u_certified_authorization_absent',
  'future_explicit_authorization_received',
  'future_authorization_consumed_receipt_frozen',
  'future_single_use_trigger_created',
  'future_execution_terminal_consumed'
]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'blocked_repository_only',
    reason,
    freshAuthorizationLifecycleReady: false,
    authorizationIssuanceAuthority: false,
    authorizationConsumptionAuthority: false,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    networkAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    ...extra
  });
}

function assertRemoteExecutionBoundaryAbsent() {
  const error = new Error(REMOTE_EXECUTION_BLOCK_CODE);
  error.code = REMOTE_EXECUTION_BLOCK_CODE;
  throw error;
}

function buildR4tExecutionSemanticsFingerprint() {
  return sha256(JSON.stringify({
    predecessorR4tEvidenceHead: PREDECESSOR_R4T_EVIDENCE_HEAD,
    predecessorR4tEvidenceBlob: PREDECESSOR_R4T_EVIDENCE_BLOB,
    r4tContractId: r4t.CONTRACT_ID,
    executorComposition: [...r4t.EXECUTOR_COMPOSITION],
    cleanupModes: [...r4t.CLEANUP_MODES],
    invariants: [
      'r4c_codec_before_r3v_restricted_adapter',
      'r3s_strict_safe_integer_contract_preserved',
      'pre_install_failure_skips_cleanup_mutation',
      'pre_install_failure_still_inspects_residue',
      'pre_install_failure_still_resnapshots_baseline_policy',
      'installed_instrumentation_runs_cleanup_mutation',
      'zero_residue_only_from_scoped_counts',
      'baseline_restoration_only_from_snapshot_comparison',
      'raw_remote_error_forbidden'
    ]
  }));
}

const R4T_EXECUTION_SEMANTICS_FINGERPRINT = buildR4tExecutionSemanticsFingerprint();

function buildFutureAuthorizationScope({ certifiedR4uHead } = {}) {
  if (!isSha(certifiedR4uHead)) {
    const error = new TypeError('R4U_CERTIFIED_HEAD_REQUIRED');
    error.code = 'R4U_CERTIFIED_HEAD_REQUIRED';
    throw error;
  }
  const scope = {
    authorizationContractId: CONTRACT_ID,
    certifiedR4uHead,
    predecessorR4tEvidenceHead: PREDECESSOR_R4T_EVIDENCE_HEAD,
    predecessorR4tEvidenceBlob: PREDECESSOR_R4T_EVIDENCE_BLOB,
    r4tContractId: r4t.CONTRACT_ID,
    r4tExecutionSemanticsFingerprint: R4T_EXECUTION_SEMANTICS_FINGERPRINT,
    targetEnvironment: TARGET_ENVIRONMENT,
    projectId: REQUIRED_PROJECT_ID,
    projectName: REQUIRED_PROJECT_NAME,
    branch: REQUIRED_BRANCH,
    pullRequest: REQUIRED_PULL_REQUEST,
    runAttempt: 1,
    singleUse: true,
    authorizationReusable: false,
    reusableAfterFailure: false,
    rawAuthorizationPhrasePersistenceAllowed: false,
    futureAuthorizationConsumptionPath: FUTURE_AUTHORIZATION_CONSUMPTION_PATH,
    futureTriggerPath: FUTURE_TRIGGER_PATH
  };
  return freeze({
    ...scope,
    scopeFingerprint: sha256(JSON.stringify(scope)),
    authorizationPhraseDefined: false,
    authorizationReceiptCreated: false,
    authorizationConsumed: false,
    triggerCreated: false,
    remoteExecutionAuthority: false
  });
}

function validateFutureAuthorizationReceiptShape({ receipt, certifiedR4uHead } = {}) {
  if (!isSha(certifiedR4uHead)) return blocked('R4U_CERTIFIED_HEAD_REQUIRED');
  if (!receipt || typeof receipt !== 'object') return blocked('R4U_FUTURE_RECEIPT_REQUIRED');
  const scope = buildFutureAuthorizationScope({ certifiedR4uHead });
  const exact = [
    ['authorizationContractId', CONTRACT_ID],
    ['authorizedHead', certifiedR4uHead],
    ['scopeFingerprint', scope.scopeFingerprint],
    ['predecessorR4tEvidenceHead', PREDECESSOR_R4T_EVIDENCE_HEAD],
    ['r4tContractId', r4t.CONTRACT_ID],
    ['r4tExecutionSemanticsFingerprint', R4T_EXECUTION_SEMANTICS_FINGERPRINT],
    ['targetEnvironment', TARGET_ENVIRONMENT],
    ['projectId', REQUIRED_PROJECT_ID],
    ['branch', REQUIRED_BRANCH],
    ['pullRequest', REQUIRED_PULL_REQUEST],
    ['runAttempt', 1],
    ['singleUse', true],
    ['authorizationConsumed', true],
    ['authorizationReusable', false],
    ['reusableAfterFailure', false],
    ['rawAuthorizationPhrasePersisted', false],
    ['executionAttempted', false],
    ['triggerCreated', false]
  ];
  for (const [key, expected] of exact) {
    if (receipt[key] !== expected) return blocked('R4U_FUTURE_RECEIPT_BINDING_REQUIRED', { field: key });
  }
  if (typeof receipt.authorizationReceiptId !== 'string' || !/^[0-9a-f]{64}$/.test(receipt.authorizationReceiptId)) {
    return blocked('R4U_FUTURE_RECEIPT_ID_REQUIRED');
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'future_r4u_authorization_receipt_shape_valid_repository_only',
    certifiedR4uHead,
    authorizationReceiptId: receipt.authorizationReceiptId,
    scopeFingerprint: scope.scopeFingerprint,
    authorizationConsumed: true,
    authorizationReusable: false,
    reusableAfterFailure: false,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorR4tEvidenceHead !== PREDECESSOR_R4T_EVIDENCE_HEAD ||
      input.predecessorR4tEvidenceBlob !== PREDECESSOR_R4T_EVIDENCE_BLOB ||
      input.predecessorR4tFinalRun !== PREDECESSOR_R4T_FINAL_RUN ||
      input.predecessorR4tFinalJob !== PREDECESSOR_R4T_FINAL_JOB ||
      input.predecessorR4tMatrixRun !== PREDECESSOR_R4T_MATRIX_RUN ||
      input.predecessorR4tMatrixJob !== PREDECESSOR_R4T_MATRIX_JOB) {
    return blocked('R4U_CERTIFIED_R4T_EVIDENCE_CONTINUITY_REQUIRED');
  }
  if (input.r4tContractId !== r4t.CONTRACT_ID ||
      input.r4tValidationId !== r4t.VALIDATION_ID ||
      input.r4tExecutionSemanticsFingerprint !== R4T_EXECUTION_SEMANTICS_FINGERPRINT) {
    return blocked('R4U_R4T_EXECUTOR_SEMANTICS_CONTINUITY_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION || input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('R4U_CANONICAL_MATRIX_STATE_REQUIRED');
  }

  const required = [
    'freshAuthorizationRequired',
    'futureAuthorizationMustBindExactCertifiedR4uHead',
    'futureAuthorizationScopeFingerprintPrepared',
    'futureAuthorizationReceiptMustBeNew',
    'priorAuthorizationReuseForbidden',
    'priorReceiptReuseForbidden',
    'authorizationSingleUse',
    'authorizationReusableFalse',
    'reusableAfterFailureFalse',
    'runAttemptOneRequired',
    'rawAuthorizationPhrasePersistenceForbidden',
    'r4tExecutorCompositionImmutable',
    'r4tCleanupSemanticsImmutable',
    'futureReceiptValidationPrepared',
    'separateAuthorizationIssuanceBoundaryRequired',
    'separateTriggerCreationBoundaryRequired',
    'separateRemoteExecutionBoundaryRequired',
    'historicalR4tR4sR4qR4cUnchanged',
    'noRemoteExecutionInR4u'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R4U_REPOSITORY_READINESS_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'authorizationPhraseDefined',
    'authorizationReceiptCreated',
    'authorizationConsumed',
    'triggerCreated',
    'authorizationJobExecuted',
    'canaryJobExecuted',
    'workflowSecretsReferenced',
    'stagingEnvironmentPrepared',
    'remoteCredentialReadExecuted',
    'remoteDependencyLoadExecuted',
    'networkExecuted',
    'databaseConnectionExecuted',
    'databaseQueryAgainstRemoteExecuted',
    'realtimeSubscriptionExecuted',
    'authIdentityMutationExecuted',
    'stagingMutationExecuted',
    'runtimeChangeExecuted',
    'productionExecuted',
    'mergeExecuted'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R4U_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: STATUS,
    predecessorR4tEvidenceHead: PREDECESSOR_R4T_EVIDENCE_HEAD,
    predecessorR4tEvidenceBlob: PREDECESSOR_R4T_EVIDENCE_BLOB,
    r4tContractId: r4t.CONTRACT_ID,
    r4tExecutionSemanticsFingerprint: R4T_EXECUTION_SEMANTICS_FINGERPRINT,
    lifecycleStates: LIFECYCLE_STATES,
    freshAuthorizationLifecycleReady: true,
    authorizationPhraseDefined: false,
    authorizationReceiptCreated: false,
    authorizationConsumed: false,
    triggerCreated: false,
    authorizationIssuanceAuthority: false,
    authorizationConsumptionAuthority: false,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    nextBoundaryRequirement:
      'After exact R4U evidence-head certification, create a separate R4V repository-only authorization issuance/consumption boundary bound to that exact R4U head. Do not reuse any prior authorization or receipt, do not create a trigger in R4U, and do not execute staging in R4U.'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  PREDECESSOR_R4T_EVIDENCE_HEAD,
  PREDECESSOR_R4T_EVIDENCE_BLOB,
  PREDECESSOR_R4T_FINAL_RUN,
  PREDECESSOR_R4T_FINAL_JOB,
  PREDECESSOR_R4T_MATRIX_RUN,
  PREDECESSOR_R4T_MATRIX_JOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  REQUIRED_BRANCH,
  REQUIRED_PULL_REQUEST,
  REQUIRED_PROJECT_ID,
  REQUIRED_PROJECT_NAME,
  TARGET_ENVIRONMENT,
  FUTURE_AUTHORIZATION_CONSUMPTION_PATH,
  FUTURE_TRIGGER_PATH,
  REMOTE_EXECUTION_BLOCK_CODE,
  LIFECYCLE_STATES,
  R4T_EXECUTION_SEMANTICS_FINGERPRINT,
  buildFutureAuthorizationScope,
  validateFutureAuthorizationReceiptShape,
  evaluateRepositoryReadiness,
  assertRemoteExecutionBoundaryAbsent
});
