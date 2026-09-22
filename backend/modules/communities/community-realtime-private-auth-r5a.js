'use strict';

const crypto = require('node:crypto');
const r3k = require('./community-realtime-private-auth-r3k');
const r4z = require('./community-realtime-private-auth-r4z');

const CONTRACT_ID = 'com-b03c-r5a-fresh-head-bound-corrected-terminal-observation-authorization-lifecycle-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R5A-FRESH-HEAD-BOUND-CORRECTED-TERMINAL-OBSERVATION-AUTHORIZATION-LIFECYCLE-READINESS';
const STATUS = 'repository_fresh_head_bound_corrected_terminal_observation_authorization_lifecycle_ready_authorization_absent_no_remote_authority';

const PREDECESSOR_R4Z_EVIDENCE_HEAD = '7b7e4491d8ae73030300e2821f6be58897c78cad';
const PREDECESSOR_R4Z_EVIDENCE_BLOB = 'e8fb7f90021a5129bd01597f6e4e98564bd9b65f';
const PREDECESSOR_R4Z_FINAL_RUN = 31697661371;
const PREDECESSOR_R4Z_FINAL_JOB = 94439044522;
const PREDECESSOR_R4Z_MATRIX_RUN = 31697661175;
const PREDECESSOR_R4Z_MATRIX_JOB = 94439043486;
const PREDECESSOR_R4Z_STATUS = 'repository_corrected_terminal_bridge_certified_no_remote_authority';
const R4Z_MODULE_BLOB = '37f9a8597e1b2ee21b3c742a3a1f4490549bc640';
const CORRECTED_BRIDGE_ASSET = 'scripts/build-com-b03c-r4z-corrected-terminal-realtime-bridge.js';
const CORRECTED_BRIDGE_BLOB = 'ff083f29e43b2f85045b23bf8f12a4b354fb0005';

const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const REQUIRED_BRANCH = r3k.REQUIRED_BRANCH;
const REQUIRED_PULL_REQUEST = r3k.REQUIRED_PULL_REQUEST;
const REQUIRED_PROJECT_ID = r3k.REQUIRED_PROJECT_ID;
const REQUIRED_PROJECT_NAME = r3k.REQUIRED_PROJECT_NAME;
const TARGET_ENVIRONMENT = 'staging';

const FUTURE_AUTHORIZATION_CONSUMPTION_PATH = 'config/com-b03c-r5b-r5a-fresh-authorization-consumption.json';
const FUTURE_TRIGGER_PATH = 'config/com-b03c-r5c-single-use-corrected-terminal-observation-trigger.json';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R5A_REMOTE_EXECUTION_NOT_AUTHORIZED';

const LIFECYCLE_STATES = Object.freeze([
  'r5a_certified_authorization_absent',
  'future_explicit_authorization_received',
  'future_authorization_consumed_receipt_frozen',
  'future_single_use_corrected_observation_trigger_created',
  'future_corrected_observation_terminal_consumed'
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

function buildCorrectedBridgeSemanticsFingerprint() {
  return sha256(JSON.stringify({
    predecessorR4zEvidenceHead: PREDECESSOR_R4Z_EVIDENCE_HEAD,
    predecessorR4zEvidenceBlob: PREDECESSOR_R4Z_EVIDENCE_BLOB,
    r4zContractId: r4z.CONTRACT_ID,
    r4zValidationId: r4z.VALIDATION_ID,
    r4zModuleBlob: R4Z_MODULE_BLOB,
    correctedBridgeAsset: CORRECTED_BRIDGE_ASSET,
    correctedBridgeBlob: CORRECTED_BRIDGE_BLOB,
    correctedOrdering: [...r4z.CORRECTED_ORDERING],
    invariants: [
      'corrected_bridge_separate_from_historical_r4l',
      'subscribe_observation_awaited_inside_try',
      'observation_settles_before_cleanup_started',
      'remove_channel_cleanup_remains_in_finally',
      'subscribed_channel_error_timeout_outcomes_preserved_before_cleanup',
      'observer_rejection_settles_before_cleanup',
      'cleanup_runs_after_observer_rejection',
      'raw_remote_error_persistence_forbidden'
    ]
  }));
}

const CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT = buildCorrectedBridgeSemanticsFingerprint();

function buildFutureAuthorizationScope({ certifiedR5aHead } = {}) {
  if (!isSha(certifiedR5aHead)) {
    const error = new TypeError('R5A_CERTIFIED_HEAD_REQUIRED');
    error.code = 'R5A_CERTIFIED_HEAD_REQUIRED';
    throw error;
  }
  const scope = {
    authorizationContractId: CONTRACT_ID,
    certifiedR5aHead,
    predecessorR4zEvidenceHead: PREDECESSOR_R4Z_EVIDENCE_HEAD,
    predecessorR4zEvidenceBlob: PREDECESSOR_R4Z_EVIDENCE_BLOB,
    r4zContractId: r4z.CONTRACT_ID,
    correctedBridgeAsset: CORRECTED_BRIDGE_ASSET,
    correctedBridgeBlob: CORRECTED_BRIDGE_BLOB,
    correctedBridgeSemanticsFingerprint: CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    targetEnvironment: TARGET_ENVIRONMENT,
    projectId: REQUIRED_PROJECT_ID,
    projectName: REQUIRED_PROJECT_NAME,
    branch: REQUIRED_BRANCH,
    pullRequest: REQUIRED_PULL_REQUEST,
    runAttempt: 1,
    singleUse: true,
    authorizationReusable: false,
    reusableAfterFailure: false,
    zeroResidueRequired: true,
    baselineRestorationRequired: true,
    sanitizedArtifactRequired: true,
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

function validateFutureAuthorizationReceiptShape({ receipt, certifiedR5aHead } = {}) {
  if (!isSha(certifiedR5aHead)) return blocked('R5A_CERTIFIED_HEAD_REQUIRED');
  if (!receipt || typeof receipt !== 'object') return blocked('R5A_FUTURE_RECEIPT_REQUIRED');
  const scope = buildFutureAuthorizationScope({ certifiedR5aHead });
  const exact = [
    ['authorizationContractId', CONTRACT_ID],
    ['authorizedHead', certifiedR5aHead],
    ['scopeFingerprint', scope.scopeFingerprint],
    ['predecessorR4zEvidenceHead', PREDECESSOR_R4Z_EVIDENCE_HEAD],
    ['r4zContractId', r4z.CONTRACT_ID],
    ['correctedBridgeSemanticsFingerprint', CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT],
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
    if (receipt[key] !== expected) return blocked('R5A_FUTURE_RECEIPT_BINDING_REQUIRED', { field: key });
  }
  if (typeof receipt.authorizationReceiptId !== 'string' || !/^[0-9a-f]{64}$/.test(receipt.authorizationReceiptId)) {
    return blocked('R5A_FUTURE_RECEIPT_ID_REQUIRED');
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'future_r5a_authorization_receipt_shape_valid_repository_only',
    certifiedR5aHead,
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
  if (
    input.predecessorR4zEvidenceHead !== PREDECESSOR_R4Z_EVIDENCE_HEAD ||
    input.predecessorR4zEvidenceBlob !== PREDECESSOR_R4Z_EVIDENCE_BLOB ||
    input.predecessorR4zFinalRun !== PREDECESSOR_R4Z_FINAL_RUN ||
    input.predecessorR4zFinalJob !== PREDECESSOR_R4Z_FINAL_JOB ||
    input.predecessorR4zMatrixRun !== PREDECESSOR_R4Z_MATRIX_RUN ||
    input.predecessorR4zMatrixJob !== PREDECESSOR_R4Z_MATRIX_JOB ||
    input.predecessorR4zStatus !== PREDECESSOR_R4Z_STATUS
  ) {
    return blocked('R5A_CERTIFIED_R4Z_EVIDENCE_CONTINUITY_REQUIRED');
  }
  if (
    input.r4zContractId !== r4z.CONTRACT_ID ||
    input.r4zValidationId !== r4z.VALIDATION_ID ||
    input.r4zModuleBlob !== R4Z_MODULE_BLOB ||
    input.correctedBridgeAsset !== CORRECTED_BRIDGE_ASSET ||
    input.correctedBridgeBlob !== CORRECTED_BRIDGE_BLOB ||
    input.correctedBridgeSemanticsFingerprint !== CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT
  ) {
    return blocked('R5A_R4Z_CORRECTED_BRIDGE_SEMANTICS_CONTINUITY_REQUIRED');
  }
  if (
    input.matrixVersion !== MATRIX_VERSION ||
    input.maturity !== REQUIRED_MATURITY ||
    input.productionGate !== REQUIRED_PRODUCTION_GATE
  ) {
    return blocked('R5A_CANONICAL_MATRIX_STATE_REQUIRED');
  }

  const required = [
    'freshAuthorizationRequired',
    'futureAuthorizationMustBindExactCertifiedR5aHead',
    'futureAuthorizationScopeFingerprintPrepared',
    'futureAuthorizationReceiptMustBeNew',
    'priorAuthorizationReuseForbidden',
    'priorReceiptReuseForbidden',
    'authorizationSingleUse',
    'authorizationReusableFalse',
    'reusableAfterFailureFalse',
    'runAttemptOneRequired',
    'rawAuthorizationPhrasePersistenceForbidden',
    'correctedBridgeAssetImmutable',
    'correctedBridgeSemanticsImmutable',
    'zeroResidueRequiredForFutureRemoteAttempt',
    'baselineRestorationRequiredForFutureRemoteAttempt',
    'sanitizedArtifactRequiredForFutureRemoteAttempt',
    'futureReceiptValidationPrepared',
    'separateAuthorizationIssuanceBoundaryRequired',
    'separateTriggerCreationBoundaryRequired',
    'separateRemoteExecutionBoundaryRequired',
    'historicalR4lR4wR4xR4yR4zUnchanged',
    'noRemoteExecutionInR5a'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R5A_REPOSITORY_READINESS_CONTROL_REQUIRED', { flag });
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
    if (input[flag] !== false) return blocked('R5A_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: STATUS,
    predecessorR4zEvidenceHead: PREDECESSOR_R4Z_EVIDENCE_HEAD,
    predecessorR4zEvidenceBlob: PREDECESSOR_R4Z_EVIDENCE_BLOB,
    r4zContractId: r4z.CONTRACT_ID,
    correctedBridgeAsset: CORRECTED_BRIDGE_ASSET,
    correctedBridgeBlob: CORRECTED_BRIDGE_BLOB,
    correctedBridgeSemanticsFingerprint: CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
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
      'After exact R5A evidence-head certification, create a separate R5B repository-only authorization issuance/consumption boundary bound to that exact R5A head. Do not reuse any prior authorization or receipt, do not create a trigger in R5A, and do not execute staging in R5A.'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  PREDECESSOR_R4Z_EVIDENCE_HEAD,
  PREDECESSOR_R4Z_EVIDENCE_BLOB,
  PREDECESSOR_R4Z_FINAL_RUN,
  PREDECESSOR_R4Z_FINAL_JOB,
  PREDECESSOR_R4Z_MATRIX_RUN,
  PREDECESSOR_R4Z_MATRIX_JOB,
  PREDECESSOR_R4Z_STATUS,
  R4Z_MODULE_BLOB,
  CORRECTED_BRIDGE_ASSET,
  CORRECTED_BRIDGE_BLOB,
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
  CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
  buildFutureAuthorizationScope,
  validateFutureAuthorizationReceiptShape,
  evaluateRepositoryReadiness,
  assertRemoteExecutionBoundaryAbsent
});
