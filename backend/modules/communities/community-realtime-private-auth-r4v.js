'use strict';

const crypto = require('node:crypto');
const r4u = require('./community-realtime-private-auth-r4u');

const CONTRACT_ID = 'com-b03c-r4v-r4u-bound-successor-authorization-issuance-consumption-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4V-R4U-BOUND-SUCCESSOR-AUTHORIZATION-ISSUANCE-CONSUMPTION-READINESS';
const STATUS = 'repository_r4u_bound_successor_authorization_issuance_consumption_ready_authorization_absent_no_remote_authority';

const R4U_EVIDENCE_HEAD = '87e245ea2e6598014fa14f471db314f5eaa10760';
const R4U_EVIDENCE_BLOB = '87afab34952ef2db32091dd1789e00b669c0c0ad';
const R4U_CERTIFIED_STATUS =
  'repository_fresh_head_bound_r4t_successor_authorization_lifecycle_certified_authorization_absent_no_remote_authority';
const R4U_FINAL_RUN = 31653567689;
const R4U_FINAL_JOB = 94302938630;
const R4U_MATRIX_RUN = 31653567868;
const R4U_MATRIX_JOB = 94302921337;

const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const REQUIRED_BRANCH = r4u.REQUIRED_BRANCH;
const REQUIRED_PULL_REQUEST = r4u.REQUIRED_PULL_REQUEST;
const REQUIRED_PROJECT_ID = r4u.REQUIRED_PROJECT_ID;
const REQUIRED_PROJECT_NAME = r4u.REQUIRED_PROJECT_NAME;
const TARGET_ENVIRONMENT = r4u.TARGET_ENVIRONMENT;

const FUTURE_AUTHORIZATION_CONSUMPTION_PATH = r4u.FUTURE_AUTHORIZATION_CONSUMPTION_PATH;
const FUTURE_TRIGGER_PATH = r4u.FUTURE_TRIGGER_PATH;
const RECEIPT_CONTRACT_ID = 'com-b03c-r4v-r4u-bound-single-use-authorization-receipt-v1';
const RECEIPT_STATUS = 'authorization_consumed_trigger_boundary_pending';
const AUTHORIZATION_PREFIX =
  'I_EXPLICITLY_AUTHORIZE_COM_B03C_R4T_SUCCESSOR_EXECUTOR_SINGLE_USE_ON_DOKE_STAGING_FOR_R4U_HEAD_';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4V_REMOTE_EXECUTION_NOT_AUTHORIZED';

const LIFECYCLE_STATES = Object.freeze([
  'r4u_certified_authorization_absent',
  'fresh_r4u_bound_authorization_received',
  'fresh_r4u_bound_authorization_consumed',
  'consumed_receipt_frozen_trigger_boundary_required'
]);

const REQUIRED_CONSUMED_RECEIPT_KEYS = Object.freeze([
  'contractId',
  'status',
  'issuerContractId',
  'issuerEvidenceHead',
  'authorizationContractId',
  'authorizedHead',
  'scopeFingerprint',
  'authorizationPhraseFingerprint',
  'authorizationReceiptId',
  'predecessorR4tEvidenceHead',
  'r4tContractId',
  'r4tExecutionSemanticsFingerprint',
  'targetEnvironment',
  'projectId',
  'projectName',
  'branch',
  'pullRequest',
  'runAttempt',
  'singleUse',
  'authorizationConsumed',
  'authorizationReusable',
  'reusableAfterFailure',
  'rawAuthorizationPhrasePersisted',
  'executionAttempted',
  'triggerCreated',
  'remoteExecutionAuthority'
]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
}

function assertSha(value, code = 'R4V_SHA_REQUIRED') {
  if (!isSha(value)) {
    const error = new TypeError(code);
    error.code = code;
    throw error;
  }
  return value;
}

function exactKeys(value, expected) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
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
    repositoryAuthorizationIssuanceConsumptionReady: false,
    explicitAuthorizationReceived: false,
    authorizationReceiptCreated: false,
    authorizationConsumed: false,
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

function buildAuthorizationScope() {
  return r4u.buildFutureAuthorizationScope({ certifiedR4uHead: R4U_EVIDENCE_HEAD });
}

function buildAuthorizationPhrase() {
  return `${AUTHORIZATION_PREFIX}${R4U_EVIDENCE_HEAD}`;
}

function authorizationPhraseFingerprint() {
  return sha256(buildAuthorizationPhrase());
}

function deriveAuthorizationReceiptId() {
  const scope = buildAuthorizationScope();
  return sha256([
    CONTRACT_ID,
    R4U_EVIDENCE_HEAD,
    R4U_EVIDENCE_BLOB,
    scope.scopeFingerprint,
    authorizationPhraseFingerprint(),
    REQUIRED_PROJECT_ID,
    REQUIRED_BRANCH,
    String(REQUIRED_PULL_REQUEST),
    r4u.R4T_EXECUTION_SEMANTICS_FINGERPRINT
  ].join(':'));
}

function evaluateExplicitAuthorization(input = {}) {
  if (input.authorizationPhrase !== buildAuthorizationPhrase()) {
    return blocked('R4V_EXACT_R4U_HEAD_BOUND_AUTHORIZATION_PHRASE_REQUIRED');
  }
  if (input.authorizationConsumed !== false || input.executionAttempted !== false) {
    return blocked('R4V_AUTHORIZATION_ALREADY_CONSUMED_OR_ATTEMPTED');
  }
  if (
    input.authorizedHead !== R4U_EVIDENCE_HEAD ||
    input.targetEnvironment !== TARGET_ENVIRONMENT ||
    input.projectId !== REQUIRED_PROJECT_ID ||
    input.projectName !== REQUIRED_PROJECT_NAME ||
    input.branch !== REQUIRED_BRANCH ||
    input.pullRequest !== REQUIRED_PULL_REQUEST ||
    input.runAttempt !== 1
  ) {
    return blocked('R4V_EXACT_AUTHORIZATION_SCOPE_REQUIRED');
  }

  const scope = buildAuthorizationScope();
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'fresh_r4u_bound_authorization_received_repository_only',
    lifecycleState: 'fresh_r4u_bound_authorization_received',
    authorizedHead: R4U_EVIDENCE_HEAD,
    scopeFingerprint: scope.scopeFingerprint,
    authorizationPhraseFingerprint: authorizationPhraseFingerprint(),
    authorizationReceiptId: deriveAuthorizationReceiptId(),
    singleUse: true,
    authorizationConsumed: false,
    authorizationReusable: false,
    reusableAfterFailure: false,
    rawAuthorizationPhrasePersisted: false,
    executionAttempted: false,
    triggerCreated: false,
    authorizationIssuanceAuthority: true,
    authorizationConsumptionAuthority: true,
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
    causalPromotionAllowed: false
  });
}

function consumeAuthorization(receipt = {}) {
  if (
    receipt.contractId !== CONTRACT_ID ||
    receipt.decision !== 'fresh_r4u_bound_authorization_received_repository_only' ||
    receipt.authorizedHead !== R4U_EVIDENCE_HEAD ||
    receipt.scopeFingerprint !== buildAuthorizationScope().scopeFingerprint ||
    receipt.authorizationPhraseFingerprint !== authorizationPhraseFingerprint() ||
    receipt.authorizationReceiptId !== deriveAuthorizationReceiptId() ||
    receipt.singleUse !== true ||
    receipt.authorizationConsumed !== false ||
    receipt.authorizationReusable !== false ||
    receipt.reusableAfterFailure !== false ||
    receipt.rawAuthorizationPhrasePersisted !== false ||
    receipt.executionAttempted !== false ||
    receipt.triggerCreated !== false
  ) {
    return blocked('R4V_VALID_FRESH_UNCONSUMED_AUTHORIZATION_RECEIPT_REQUIRED');
  }

  return freeze({
    ...receipt,
    decision: 'fresh_r4u_bound_authorization_consumed_repository_only',
    lifecycleState: 'fresh_r4u_bound_authorization_consumed',
    authorizationConsumed: true,
    authorizationIssuanceAuthority: false,
    authorizationConsumptionAuthority: false,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false
  });
}

function buildExpectedConsumedAuthorization() {
  return consumeAuthorization(evaluateExplicitAuthorization({
    authorizationPhrase: buildAuthorizationPhrase(),
    authorizedHead: R4U_EVIDENCE_HEAD,
    targetEnvironment: TARGET_ENVIRONMENT,
    projectId: REQUIRED_PROJECT_ID,
    projectName: REQUIRED_PROJECT_NAME,
    branch: REQUIRED_BRANCH,
    pullRequest: REQUIRED_PULL_REQUEST,
    runAttempt: 1,
    authorizationConsumed: false,
    executionAttempted: false
  }));
}

function buildConsumedReceiptDescriptor({ issuerEvidenceHead } = {}) {
  const issuerHead = assertSha(issuerEvidenceHead, 'R4V_CERTIFIED_ISSUER_EVIDENCE_HEAD_REQUIRED');
  const consumed = buildExpectedConsumedAuthorization();
  if (consumed.decision === 'blocked_repository_only') {
    const error = new Error(consumed.reason);
    error.code = consumed.reason;
    throw error;
  }
  const scope = buildAuthorizationScope();

  return freeze({
    contractId: RECEIPT_CONTRACT_ID,
    status: RECEIPT_STATUS,
    issuerContractId: CONTRACT_ID,
    issuerEvidenceHead: issuerHead,
    authorizationContractId: r4u.CONTRACT_ID,
    authorizedHead: R4U_EVIDENCE_HEAD,
    scopeFingerprint: scope.scopeFingerprint,
    authorizationPhraseFingerprint: consumed.authorizationPhraseFingerprint,
    authorizationReceiptId: consumed.authorizationReceiptId,
    predecessorR4tEvidenceHead: r4u.PREDECESSOR_R4T_EVIDENCE_HEAD,
    r4tContractId: scope.r4tContractId,
    r4tExecutionSemanticsFingerprint: r4u.R4T_EXECUTION_SEMANTICS_FINGERPRINT,
    targetEnvironment: TARGET_ENVIRONMENT,
    projectId: REQUIRED_PROJECT_ID,
    projectName: REQUIRED_PROJECT_NAME,
    branch: REQUIRED_BRANCH,
    pullRequest: REQUIRED_PULL_REQUEST,
    runAttempt: 1,
    singleUse: true,
    authorizationConsumed: true,
    authorizationReusable: false,
    reusableAfterFailure: false,
    rawAuthorizationPhrasePersisted: false,
    executionAttempted: false,
    triggerCreated: false,
    remoteExecutionAuthority: false
  });
}

function validateConsumedReceiptDescriptor({ receipt, issuerEvidenceHead } = {}) {
  if (!isSha(issuerEvidenceHead)) return blocked('R4V_CERTIFIED_ISSUER_EVIDENCE_HEAD_REQUIRED');
  if (!exactKeys(receipt, REQUIRED_CONSUMED_RECEIPT_KEYS)) {
    return blocked('R4V_EXACT_CONSUMED_RECEIPT_SHAPE_REQUIRED');
  }
  if (
    receipt.contractId !== RECEIPT_CONTRACT_ID ||
    receipt.status !== RECEIPT_STATUS ||
    receipt.issuerContractId !== CONTRACT_ID ||
    receipt.issuerEvidenceHead !== issuerEvidenceHead ||
    receipt.authorizationPhraseFingerprint !== authorizationPhraseFingerprint() ||
    receipt.authorizationReceiptId !== deriveAuthorizationReceiptId() ||
    receipt.projectName !== REQUIRED_PROJECT_NAME ||
    receipt.remoteExecutionAuthority !== false
  ) {
    return blocked('R4V_CONSUMED_RECEIPT_BINDING_REQUIRED');
  }

  const r4uCompatibility = r4u.validateFutureAuthorizationReceiptShape({
    receipt,
    certifiedR4uHead: R4U_EVIDENCE_HEAD
  });
  if (r4uCompatibility.decision !== 'future_r4u_authorization_receipt_shape_valid_repository_only') {
    return blocked('R4V_R4U_RECEIPT_COMPATIBILITY_REQUIRED', {
      predecessorReason: r4uCompatibility.reason || null
    });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'consumed_r4u_bound_authorization_receipt_valid_repository_only',
    issuerEvidenceHead,
    authorizedHead: R4U_EVIDENCE_HEAD,
    authorizationReceiptId: receipt.authorizationReceiptId,
    scopeFingerprint: receipt.scopeFingerprint,
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
    input.r4uContractId !== r4u.CONTRACT_ID ||
    input.r4uValidationId !== r4u.VALIDATION_ID ||
    input.r4uEvidenceHead !== R4U_EVIDENCE_HEAD ||
    input.r4uEvidenceBlob !== R4U_EVIDENCE_BLOB ||
    input.r4uCertifiedStatus !== R4U_CERTIFIED_STATUS ||
    input.r4uFinalRun !== R4U_FINAL_RUN ||
    input.r4uFinalJob !== R4U_FINAL_JOB ||
    input.r4uMatrixRun !== R4U_MATRIX_RUN ||
    input.r4uMatrixJob !== R4U_MATRIX_JOB
  ) {
    return blocked('R4V_CERTIFIED_R4U_EVIDENCE_CONTINUITY_REQUIRED');
  }
  if (
    input.matrixVersion !== MATRIX_VERSION ||
    input.maturity !== REQUIRED_MATURITY ||
    input.productionGate !== REQUIRED_PRODUCTION_GATE
  ) {
    return blocked('R4V_CANONICAL_MATRIX_STATE_REQUIRED');
  }

  const required = [
    'exactR4uEvidenceHeadPinned',
    'exactR4uEvidenceBlobPinned',
    'r4uAuthorizationScopeFingerprintPinned',
    'freshAuthorizationPhraseFactoryPrepared',
    'concreteAuthorizationPhraseNotPersisted',
    'authorizationPhraseFingerprintPrepared',
    'freshReceiptDerivationPrepared',
    'receiptConsumptionTransitionPrepared',
    'receiptCompatibilityWithR4uPrepared',
    'receiptMustBindCertifiedR4vIssuerEvidenceHead',
    'singleUseRequired',
    'authorizationReusableFalse',
    'reusableAfterFailureFalse',
    'secondConsumptionRejected',
    'priorAuthorizationReuseRejected',
    'priorReceiptReuseRejected',
    'rawAuthorizationPhrasePersistenceForbidden',
    'runAttemptOneRequired',
    'triggerBoundarySeparate',
    'remoteExecutionBoundarySeparate',
    'historicalR4uR4tUnchanged',
    'workflowPushTriggerAbsent',
    'workflowEnvironmentAbsent',
    'workflowSecretsAbsent',
    'repositorySelfTestPrepared',
    'noRemoteExecutionInR4v',
    'noCausalPromotionWithoutRemoteObservation'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R4V_REPOSITORY_READINESS_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'authorizationPhraseReceived',
    'authorizationReceiptCreated',
    'authorizationConsumed',
    'futureAuthorizationConsumptionFileExists',
    'triggerCreated',
    'futureTriggerExists',
    'authorizationJobExecuted',
    'canaryJobExecuted',
    'stagingEnvironmentPrepared',
    'workflowSecretsReferenced',
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
    if (input[flag] !== false) return blocked('R4V_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: STATUS,
    predecessorR4uEvidenceHead: R4U_EVIDENCE_HEAD,
    predecessorR4uEvidenceBlob: R4U_EVIDENCE_BLOB,
    authorizationScopeFingerprint: buildAuthorizationScope().scopeFingerprint,
    lifecycleStates: LIFECYCLE_STATES,
    futureAuthorizationConsumptionPath: FUTURE_AUTHORIZATION_CONSUMPTION_PATH,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    repositoryAuthorizationIssuanceConsumptionReady: true,
    explicitAuthorizationReceived: false,
    authorizationReceiptCreated: false,
    authorizationConsumed: false,
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
      'After exact R4V evidence-head certification, wait for a fresh explicit single-use authorization matching the R4U-head-bound phrase. Only then may R4V materialize the consumed authorization receipt as a separate single-file evidence commit. Do not create a trigger or execute staging in R4V. After receipt freeze, create a separate repository-only trigger boundary.'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  R4U_EVIDENCE_HEAD,
  R4U_EVIDENCE_BLOB,
  R4U_CERTIFIED_STATUS,
  R4U_FINAL_RUN,
  R4U_FINAL_JOB,
  R4U_MATRIX_RUN,
  R4U_MATRIX_JOB,
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
  RECEIPT_CONTRACT_ID,
  RECEIPT_STATUS,
  AUTHORIZATION_PREFIX,
  REMOTE_EXECUTION_BLOCK_CODE,
  LIFECYCLE_STATES,
  REQUIRED_CONSUMED_RECEIPT_KEYS,
  buildAuthorizationScope,
  buildAuthorizationPhrase,
  authorizationPhraseFingerprint,
  deriveAuthorizationReceiptId,
  evaluateExplicitAuthorization,
  consumeAuthorization,
  buildExpectedConsumedAuthorization,
  buildConsumedReceiptDescriptor,
  validateConsumedReceiptDescriptor,
  evaluateRepositoryReadiness,
  assertRemoteExecutionBoundaryAbsent
});
