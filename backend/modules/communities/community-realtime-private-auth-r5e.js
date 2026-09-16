'use strict';

const crypto = require('node:crypto');
const r5d = require('./community-realtime-private-auth-r5d');

const CONTRACT_ID = 'com-b03c-r5e-fresh-head-bound-r5d-execution-authorization-lifecycle-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R5E-FRESH-HEAD-BOUND-R5D-EXECUTION-AUTHORIZATION-LIFECYCLE-READINESS';
const STATUS = 'repository_fresh_head_bound_r5d_execution_authorization_lifecycle_ready_authorization_absent_no_remote_authority';

const PREDECESSOR_R5D_CERTIFIED_HEAD = 'c3520db3b0749d26041e9010c10a30407c781331';
const PREDECESSOR_R5D_CERTIFIED_TREE = '44f788fcd2534604e38adb545190033ab17c9142';
const PREDECESSOR_R5D_CERTIFICATION_RUN = 31763633555;
const PREDECESSOR_R5D_CERTIFICATION_JOB = 94654950997;
const R5D_MODULE_BLOB = '7cde416f2922230bae6b1e4b1e48fdfaf411da99';

const MATRIX_VERSION = r5d.MATRIX_VERSION;
const REQUIRED_MATURITY = r5d.REQUIRED_MATURITY;
const REQUIRED_PRODUCTION_GATE = r5d.REQUIRED_PRODUCTION_GATE;
const REQUIRED_BRANCH = r5d.TARGET_BRANCH;
const REQUIRED_PULL_REQUEST = r5d.TARGET_PR;
const REQUIRED_PROJECT_ID = r5d.TARGET_STAGING_PROJECT;
const TARGET_ENVIRONMENT = 'staging';

const LINEAGE_AUTHORIZATION_RECEIPT_PATH = r5d.AUTHORIZATION_RECEIPT_PATH;
const LINEAGE_AUTHORIZATION_RECEIPT_BLOB = r5d.AUTHORIZATION_RECEIPT_BLOB;
const LINEAGE_AUTHORIZATION_RECEIPT_ID = r5d.AUTHORIZATION_RECEIPT_ID;
const CORRECTED_BRIDGE_PATH = r5d.CORRECTED_BRIDGE_PATH;
const CORRECTED_BRIDGE_BLOB = r5d.CORRECTED_BRIDGE_BLOB;
const CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT = r5d.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT;
const FUTURE_TRIGGER_PATH = r5d.FUTURE_TRIGGER_PATH;
const FUTURE_AUTHORIZATION_CONSUMPTION_PATH =
  'config/com-b03c-r5f-r5e-fresh-execution-authorization-consumption.json';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R5E_REMOTE_EXECUTION_NOT_AUTHORIZED';

const LIFECYCLE_STATES = Object.freeze([
  'r5e_certified_execution_authorization_absent',
  'future_explicit_r5e_execution_authorization_received',
  'future_r5e_execution_authorization_consumed_receipt_frozen',
  'future_single_use_r5d_trigger_created',
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
    freshExecutionAuthorizationLifecycleReady: false,
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

function buildFutureAuthorizationScope({ certifiedR5eHead } = {}) {
  if (!isSha(certifiedR5eHead)) {
    const error = new TypeError('R5E_CERTIFIED_HEAD_REQUIRED');
    error.code = 'R5E_CERTIFIED_HEAD_REQUIRED';
    throw error;
  }
  const scope = {
    authorizationContractId: CONTRACT_ID,
    certifiedR5eHead,
    predecessorR5dCertifiedHead: PREDECESSOR_R5D_CERTIFIED_HEAD,
    predecessorR5dCertifiedTree: PREDECESSOR_R5D_CERTIFIED_TREE,
    r5dContractId: r5d.CONTRACT_ID,
    r5dValidationId: r5d.VALIDATION_ID,
    r5dEnvelopeKind: r5d.ENVELOPE_KIND,
    r5cCertifiedHead: r5d.R5C_CERTIFIED_HEAD,
    lineageAuthorizationReceiptId: LINEAGE_AUTHORIZATION_RECEIPT_ID,
    lineageAuthorizationReceiptBlob: LINEAGE_AUTHORIZATION_RECEIPT_BLOB,
    correctedBridgeBlob: CORRECTED_BRIDGE_BLOB,
    correctedBridgeSemanticsFingerprint: CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    targetEnvironment: TARGET_ENVIRONMENT,
    projectId: REQUIRED_PROJECT_ID,
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
    futureAuthorizationConsumptionPath: FUTURE_AUTHORIZATION_CONSUMPTION_PATH
  };
  return freeze({
    ...scope,
    scopeFingerprint: sha256(JSON.stringify(scope)),
    authorizationPhraseDefined: false,
    authorizationReceiptCreated: false,
    authorizationConsumed: false,
    triggerCreated: false,
    executionAttempted: false,
    remoteExecutionAuthority: false
  });
}

function validateFutureAuthorizationReceiptShape({ receipt, certifiedR5eHead } = {}) {
  if (!isSha(certifiedR5eHead)) return blocked('R5E_CERTIFIED_HEAD_REQUIRED');
  if (!receipt || typeof receipt !== 'object') return blocked('R5E_FUTURE_RECEIPT_REQUIRED');
  const scope = buildFutureAuthorizationScope({ certifiedR5eHead });
  const exact = [
    ['authorizationContractId', CONTRACT_ID],
    ['authorizedHead', certifiedR5eHead],
    ['scopeFingerprint', scope.scopeFingerprint],
    ['predecessorR5dCertifiedHead', PREDECESSOR_R5D_CERTIFIED_HEAD],
    ['r5dContractId', r5d.CONTRACT_ID],
    ['r5dEnvelopeKind', r5d.ENVELOPE_KIND],
    ['lineageAuthorizationReceiptId', LINEAGE_AUTHORIZATION_RECEIPT_ID],
    ['lineageAuthorizationReceiptBlob', LINEAGE_AUTHORIZATION_RECEIPT_BLOB],
    ['correctedBridgeSemanticsFingerprint', CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT],
    ['futureTriggerPath', FUTURE_TRIGGER_PATH],
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
    if (receipt[key] !== expected) return blocked('R5E_FUTURE_RECEIPT_BINDING_REQUIRED', { field: key });
  }
  if (typeof receipt.authorizationReceiptId !== 'string' || !/^[0-9a-f]{64}$/.test(receipt.authorizationReceiptId)) {
    return blocked('R5E_FUTURE_RECEIPT_ID_REQUIRED');
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'future_r5e_execution_authorization_receipt_shape_valid_repository_only',
    certifiedR5eHead,
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
    input.predecessorR5dCertifiedHead !== PREDECESSOR_R5D_CERTIFIED_HEAD ||
    input.predecessorR5dCertifiedTree !== PREDECESSOR_R5D_CERTIFIED_TREE ||
    input.predecessorR5dCertificationRun !== PREDECESSOR_R5D_CERTIFICATION_RUN ||
    input.predecessorR5dCertificationJob !== PREDECESSOR_R5D_CERTIFICATION_JOB ||
    input.predecessorR5dCertificationSuccess !== true
  ) {
    return blocked('R5E_CERTIFIED_R5D_EVIDENCE_CONTINUITY_REQUIRED');
  }
  if (
    input.r5dContractId !== r5d.CONTRACT_ID ||
    input.r5dValidationId !== r5d.VALIDATION_ID ||
    input.r5dStatus !== r5d.STATUS ||
    input.r5dEnvelopeKind !== r5d.ENVELOPE_KIND ||
    input.r5dModuleBlob !== R5D_MODULE_BLOB
  ) {
    return blocked('R5E_R5D_EXECUTION_ENVELOPE_CONTINUITY_REQUIRED');
  }
  if (
    input.lineageAuthorizationReceiptPath !== LINEAGE_AUTHORIZATION_RECEIPT_PATH ||
    input.lineageAuthorizationReceiptBlob !== LINEAGE_AUTHORIZATION_RECEIPT_BLOB ||
    input.lineageAuthorizationReceiptId !== LINEAGE_AUTHORIZATION_RECEIPT_ID ||
    input.correctedBridgePath !== CORRECTED_BRIDGE_PATH ||
    input.correctedBridgeBlob !== CORRECTED_BRIDGE_BLOB ||
    input.correctedBridgeSemanticsFingerprint !== CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT
  ) {
    return blocked('R5E_FROZEN_LINEAGE_BINDING_REQUIRED');
  }
  if (
    input.matrixVersion !== MATRIX_VERSION ||
    input.maturity !== REQUIRED_MATURITY ||
    input.productionGate !== REQUIRED_PRODUCTION_GATE
  ) {
    return blocked('R5E_CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (
    input.targetBranch !== REQUIRED_BRANCH ||
    input.targetPr !== REQUIRED_PULL_REQUEST ||
    input.targetStagingProject !== REQUIRED_PROJECT_ID
  ) {
    return blocked('R5E_TARGET_CONTINUITY_REQUIRED');
  }
  if (input.futureTriggerPath !== FUTURE_TRIGGER_PATH || input.futureTriggerExists !== false) {
    return blocked('R5E_TRIGGER_MUST_REMAIN_ABSENT');
  }

  const required = [
    'freshExecutionAuthorizationRequired',
    'futureAuthorizationMustBindExactCertifiedR5eHead',
    'futureAuthorizationScopeFingerprintPrepared',
    'futureAuthorizationReceiptMustBeNew',
    'priorAuthorizationReuseForbidden',
    'priorExecutionAuthorizationReceiptReuseForbidden',
    'lineageR5bReceiptPreservedNotReissued',
    'authorizationSingleUse',
    'authorizationReusableFalse',
    'reusableAfterFailureFalse',
    'runAttemptOneRequired',
    'rawAuthorizationPhrasePersistenceForbidden',
    'r5dExecutionEnvelopeImmutable',
    'r5dTriggerDescriptorSemanticsPreserved',
    'correctedBridgeSemanticsImmutable',
    'zeroResidueRequiredForFutureRemoteAttempt',
    'baselineRestorationRequiredForFutureRemoteAttempt',
    'sanitizedArtifactRequiredForFutureRemoteAttempt',
    'futureReceiptValidationPrepared',
    'separateAuthorizationIssuanceBoundaryRequired',
    'separateTriggerCreationBoundaryRequired',
    'separateRemoteExecutionBoundaryRequired',
    'noRemoteExecutionInR5e'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R5E_REPOSITORY_READINESS_CONTROL_REQUIRED', { flag });
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
    if (input[flag] !== false) return blocked('R5E_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: STATUS,
    predecessorR5dCertifiedHead: PREDECESSOR_R5D_CERTIFIED_HEAD,
    predecessorR5dCertifiedTree: PREDECESSOR_R5D_CERTIFIED_TREE,
    r5dContractId: r5d.CONTRACT_ID,
    r5dEnvelopeKind: r5d.ENVELOPE_KIND,
    r5cCertifiedHead: r5d.R5C_CERTIFIED_HEAD,
    lineageAuthorizationReceiptId: LINEAGE_AUTHORIZATION_RECEIPT_ID,
    lineageAuthorizationReceiptBlob: LINEAGE_AUTHORIZATION_RECEIPT_BLOB,
    correctedBridgeBlob: CORRECTED_BRIDGE_BLOB,
    correctedBridgeSemanticsFingerprint: CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    lifecycleStates: LIFECYCLE_STATES,
    freshExecutionAuthorizationLifecycleReady: true,
    authorizationPhraseDefined: false,
    authorizationReceiptCreated: false,
    authorizationConsumed: false,
    triggerCreated: false,
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
    nextBoundaryRequirement:
      'After exact R5E evidence-head certification, create a separate R5F repository-only execution-authorization issuance/consumption boundary bound to that exact R5E head and the immutable R5D lineage. R5E must not define or consume the authorization phrase, create the trigger, or execute staging.'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  PREDECESSOR_R5D_CERTIFIED_HEAD,
  PREDECESSOR_R5D_CERTIFIED_TREE,
  PREDECESSOR_R5D_CERTIFICATION_RUN,
  PREDECESSOR_R5D_CERTIFICATION_JOB,
  R5D_MODULE_BLOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  REQUIRED_BRANCH,
  REQUIRED_PULL_REQUEST,
  REQUIRED_PROJECT_ID,
  TARGET_ENVIRONMENT,
  LINEAGE_AUTHORIZATION_RECEIPT_PATH,
  LINEAGE_AUTHORIZATION_RECEIPT_BLOB,
  LINEAGE_AUTHORIZATION_RECEIPT_ID,
  CORRECTED_BRIDGE_PATH,
  CORRECTED_BRIDGE_BLOB,
  CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
  FUTURE_TRIGGER_PATH,
  FUTURE_AUTHORIZATION_CONSUMPTION_PATH,
  REMOTE_EXECUTION_BLOCK_CODE,
  LIFECYCLE_STATES,
  buildFutureAuthorizationScope,
  validateFutureAuthorizationReceiptShape,
  evaluateRepositoryReadiness,
  assertRemoteExecutionBoundaryAbsent
});
