'use strict';

const crypto = require('node:crypto');
const r5a = require('./community-realtime-private-auth-r5a');

const CONTRACT_ID = 'com-b03c-r5b-r5a-bound-corrected-terminal-observation-authorization-issuance-consumption-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R5B-R5A-BOUND-CORRECTED-TERMINAL-OBSERVATION-AUTHORIZATION-ISSUANCE-CONSUMPTION-READINESS';
const STATUS = 'repository_r5a_bound_corrected_terminal_observation_authorization_issuance_consumption_ready_authorization_absent_no_remote_authority';

const R5A_EVIDENCE_HEAD = '2bf75e3452aa87109f10c986e2e60715d770407e';
const R5A_EVIDENCE_BLOB = '279478d9d7512fbeb47f44300135fbc5ed31a294';
const R5A_CERTIFIED_STATUS =
  'repository_fresh_head_bound_corrected_terminal_observation_authorization_lifecycle_certified_authorization_absent_no_remote_authority';
const R5A_FINAL_RUN = 31699449361;
const R5A_FINAL_JOB = 94444780094;
const R5A_MATRIX_RUN = 31699448071;
const R5A_MATRIX_JOB = 94444778615;

const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const REQUIRED_BRANCH = r5a.REQUIRED_BRANCH;
const REQUIRED_PULL_REQUEST = r5a.REQUIRED_PULL_REQUEST;
const REQUIRED_PROJECT_ID = r5a.REQUIRED_PROJECT_ID;
const REQUIRED_PROJECT_NAME = r5a.REQUIRED_PROJECT_NAME;
const TARGET_ENVIRONMENT = r5a.TARGET_ENVIRONMENT;

const FUTURE_AUTHORIZATION_CONSUMPTION_PATH = r5a.FUTURE_AUTHORIZATION_CONSUMPTION_PATH;
const FUTURE_TRIGGER_PATH = r5a.FUTURE_TRIGGER_PATH;
const RECEIPT_CONTRACT_ID = 'com-b03c-r5b-r5a-bound-single-use-corrected-terminal-observation-authorization-receipt-v1';
const RECEIPT_STATUS = 'authorization_consumed_trigger_boundary_pending';
const AUTHORIZATION_PREFIX =
  'I_EXPLICITLY_AUTHORIZE_COM_B03C_R5C_CORRECTED_TERMINAL_OBSERVATION_SINGLE_USE_ON_DOKE_STAGING_FOR_R5A_HEAD_';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R5B_REMOTE_EXECUTION_NOT_AUTHORIZED';

const LIFECYCLE_STATES = Object.freeze([
  'r5a_certified_authorization_absent',
  'fresh_r5a_bound_authorization_received',
  'fresh_r5a_bound_authorization_consumed',
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
  'predecessorR4zEvidenceHead',
  'r4zContractId',
  'correctedBridgeAsset',
  'correctedBridgeBlob',
  'correctedBridgeSemanticsFingerprint',
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
  'zeroResidueRequired',
  'baselineRestorationRequired',
  'sanitizedArtifactRequired',
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

function assertSha(value, code = 'R5B_SHA_REQUIRED') {
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
  return r5a.buildFutureAuthorizationScope({ certifiedR5aHead: R5A_EVIDENCE_HEAD });
}

function buildAuthorizationPhrase() {
  return `${AUTHORIZATION_PREFIX}${R5A_EVIDENCE_HEAD}`;
}

function authorizationPhraseFingerprint() {
  return sha256(buildAuthorizationPhrase());
}

function deriveAuthorizationReceiptId() {
  const scope = buildAuthorizationScope();
  return sha256([
    CONTRACT_ID,
    R5A_EVIDENCE_HEAD,
    R5A_EVIDENCE_BLOB,
    scope.scopeFingerprint,
    authorizationPhraseFingerprint(),
    REQUIRED_PROJECT_ID,
    REQUIRED_BRANCH,
    String(REQUIRED_PULL_REQUEST),
    r5a.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT
  ].join(':'));
}

function evaluateExplicitAuthorization(input = {}) {
  if (input.authorizationPhrase !== buildAuthorizationPhrase()) {
    return blocked('R5B_EXACT_R5A_HEAD_BOUND_AUTHORIZATION_PHRASE_REQUIRED');
  }
  if (input.authorizationConsumed !== false || input.executionAttempted !== false) {
    return blocked('R5B_AUTHORIZATION_ALREADY_CONSUMED_OR_ATTEMPTED');
  }
  if (
    input.authorizedHead !== R5A_EVIDENCE_HEAD ||
    input.targetEnvironment !== TARGET_ENVIRONMENT ||
    input.projectId !== REQUIRED_PROJECT_ID ||
    input.projectName !== REQUIRED_PROJECT_NAME ||
    input.branch !== REQUIRED_BRANCH ||
    input.pullRequest !== REQUIRED_PULL_REQUEST ||
    input.runAttempt !== 1
  ) {
    return blocked('R5B_EXACT_AUTHORIZATION_SCOPE_REQUIRED');
  }

  const scope = buildAuthorizationScope();
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'fresh_r5a_bound_authorization_received_repository_only',
    lifecycleState: 'fresh_r5a_bound_authorization_received',
    authorizedHead: R5A_EVIDENCE_HEAD,
    scopeFingerprint: scope.scopeFingerprint,
    authorizationPhraseFingerprint: authorizationPhraseFingerprint(),
    authorizationReceiptId: deriveAuthorizationReceiptId(),
    singleUse: true,
    authorizationConsumed: false,
    authorizationReusable: false,
    reusableAfterFailure: false,
    zeroResidueRequired: true,
    baselineRestorationRequired: true,
    sanitizedArtifactRequired: true,
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
    receipt.decision !== 'fresh_r5a_bound_authorization_received_repository_only' ||
    receipt.authorizedHead !== R5A_EVIDENCE_HEAD ||
    receipt.scopeFingerprint !== buildAuthorizationScope().scopeFingerprint ||
    receipt.authorizationPhraseFingerprint !== authorizationPhraseFingerprint() ||
    receipt.authorizationReceiptId !== deriveAuthorizationReceiptId() ||
    receipt.singleUse !== true ||
    receipt.authorizationConsumed !== false ||
    receipt.authorizationReusable !== false ||
    receipt.reusableAfterFailure !== false ||
    receipt.zeroResidueRequired !== true ||
    receipt.baselineRestorationRequired !== true ||
    receipt.sanitizedArtifactRequired !== true ||
    receipt.rawAuthorizationPhrasePersisted !== false ||
    receipt.executionAttempted !== false ||
    receipt.triggerCreated !== false
  ) {
    return blocked('R5B_VALID_FRESH_UNCONSUMED_AUTHORIZATION_RECEIPT_REQUIRED');
  }

  return freeze({
    ...receipt,
    decision: 'fresh_r5a_bound_authorization_consumed_repository_only',
    lifecycleState: 'fresh_r5a_bound_authorization_consumed',
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
    authorizedHead: R5A_EVIDENCE_HEAD,
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
  const issuerHead = assertSha(issuerEvidenceHead, 'R5B_CERTIFIED_ISSUER_EVIDENCE_HEAD_REQUIRED');
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
    authorizationContractId: r5a.CONTRACT_ID,
    authorizedHead: R5A_EVIDENCE_HEAD,
    scopeFingerprint: scope.scopeFingerprint,
    authorizationPhraseFingerprint: consumed.authorizationPhraseFingerprint,
    authorizationReceiptId: consumed.authorizationReceiptId,
    predecessorR4zEvidenceHead: r5a.PREDECESSOR_R4Z_EVIDENCE_HEAD,
    r4zContractId: scope.r4zContractId,
    correctedBridgeAsset: r5a.CORRECTED_BRIDGE_ASSET,
    correctedBridgeBlob: r5a.CORRECTED_BRIDGE_BLOB,
    correctedBridgeSemanticsFingerprint: r5a.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
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
    zeroResidueRequired: true,
    baselineRestorationRequired: true,
    sanitizedArtifactRequired: true,
    rawAuthorizationPhrasePersisted: false,
    executionAttempted: false,
    triggerCreated: false,
    remoteExecutionAuthority: false
  });
}

function validateConsumedReceiptDescriptor({ receipt, issuerEvidenceHead } = {}) {
  if (!isSha(issuerEvidenceHead)) return blocked('R5B_CERTIFIED_ISSUER_EVIDENCE_HEAD_REQUIRED');
  if (!exactKeys(receipt, REQUIRED_CONSUMED_RECEIPT_KEYS)) {
    return blocked('R5B_EXACT_CONSUMED_RECEIPT_SHAPE_REQUIRED');
  }
  if (
    receipt.contractId !== RECEIPT_CONTRACT_ID ||
    receipt.status !== RECEIPT_STATUS ||
    receipt.issuerContractId !== CONTRACT_ID ||
    receipt.issuerEvidenceHead !== issuerEvidenceHead ||
    receipt.authorizationPhraseFingerprint !== authorizationPhraseFingerprint() ||
    receipt.authorizationReceiptId !== deriveAuthorizationReceiptId() ||
    receipt.projectName !== REQUIRED_PROJECT_NAME ||
    receipt.zeroResidueRequired !== true ||
    receipt.baselineRestorationRequired !== true ||
    receipt.sanitizedArtifactRequired !== true ||
    receipt.remoteExecutionAuthority !== false
  ) {
    return blocked('R5B_CONSUMED_RECEIPT_BINDING_REQUIRED');
  }

  const r5aCompatibility = r5a.validateFutureAuthorizationReceiptShape({
    receipt,
    certifiedR5aHead: R5A_EVIDENCE_HEAD
  });
  if (r5aCompatibility.decision !== 'future_r5a_authorization_receipt_shape_valid_repository_only') {
    return blocked('R5B_R5A_RECEIPT_COMPATIBILITY_REQUIRED', {
      predecessorReason: r5aCompatibility.reason || null
    });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'consumed_r5a_bound_authorization_receipt_valid_repository_only',
    issuerEvidenceHead,
    authorizedHead: R5A_EVIDENCE_HEAD,
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
    input.r5aContractId !== r5a.CONTRACT_ID ||
    input.r5aValidationId !== r5a.VALIDATION_ID ||
    input.r5aEvidenceHead !== R5A_EVIDENCE_HEAD ||
    input.r5aEvidenceBlob !== R5A_EVIDENCE_BLOB ||
    input.r5aCertifiedStatus !== R5A_CERTIFIED_STATUS ||
    input.r5aFinalRun !== R5A_FINAL_RUN ||
    input.r5aFinalJob !== R5A_FINAL_JOB ||
    input.r5aMatrixRun !== R5A_MATRIX_RUN ||
    input.r5aMatrixJob !== R5A_MATRIX_JOB
  ) {
    return blocked('R5B_CERTIFIED_R5A_EVIDENCE_CONTINUITY_REQUIRED');
  }
  if (
    input.matrixVersion !== MATRIX_VERSION ||
    input.maturity !== REQUIRED_MATURITY ||
    input.productionGate !== REQUIRED_PRODUCTION_GATE
  ) {
    return blocked('R5B_CANONICAL_MATRIX_STATE_REQUIRED');
  }

  const required = [
    'exactR5aEvidenceHeadPinned',
    'exactR5aEvidenceBlobPinned',
    'r5aAuthorizationScopeFingerprintPinned',
    'correctedBridgeSemanticsFingerprintPinned',
    'freshAuthorizationPhraseFactoryPrepared',
    'concreteAuthorizationPhraseNotPersisted',
    'authorizationPhraseFingerprintPrepared',
    'freshReceiptDerivationPrepared',
    'receiptConsumptionTransitionPrepared',
    'receiptCompatibilityWithR5aPrepared',
    'receiptMustBindCertifiedR5bIssuerEvidenceHead',
    'singleUseRequired',
    'authorizationReusableFalse',
    'reusableAfterFailureFalse',
    'zeroResidueRequired',
    'baselineRestorationRequired',
    'sanitizedArtifactRequired',
    'secondConsumptionRejected',
    'priorAuthorizationReuseRejected',
    'priorReceiptReuseRejected',
    'rawAuthorizationPhrasePersistenceForbidden',
    'runAttemptOneRequired',
    'triggerBoundarySeparate',
    'remoteExecutionBoundarySeparate',
    'historicalR4lR4wR4xR4yR4zR5aUnchanged',
    'workflowPushTriggerAbsent',
    'workflowEnvironmentAbsent',
    'workflowSecretsAbsent',
    'repositorySelfTestPrepared',
    'noRemoteExecutionInR5b',
    'noCausalPromotionWithoutCorrectedRemoteObservation'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R5B_REPOSITORY_READINESS_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'authorizationPhraseReceived',
    'authorizationReceiptCreated',
    'authorizationConsumed',
    'futureAuthorizationConsumptionFileExists',
    'triggerCreated',
    'futureTriggerFileExists',
    'authorizationJobExecuted',
    'canaryJobExecuted',
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
    if (input[flag] !== false) return blocked('R5B_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: STATUS,
    r5aEvidenceHead: R5A_EVIDENCE_HEAD,
    r5aEvidenceBlob: R5A_EVIDENCE_BLOB,
    scopeFingerprint: buildAuthorizationScope().scopeFingerprint,
    correctedBridgeSemanticsFingerprint: r5a.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    authorizationPhrasePrefix: AUTHORIZATION_PREFIX,
    authorizationPhraseFingerprint: authorizationPhraseFingerprint(),
    authorizationReceiptId: deriveAuthorizationReceiptId(),
    lifecycleStates: LIFECYCLE_STATES,
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
      'After exact R5B evidence-head certification, wait for a fresh explicit single-use authorization matching buildAuthorizationPhrase(). Only then may a separate single-file consumed receipt be frozen at the R5A future authorization consumption path. Do not create the R5C trigger or execute staging in R5B.'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  R5A_EVIDENCE_HEAD,
  R5A_EVIDENCE_BLOB,
  R5A_CERTIFIED_STATUS,
  R5A_FINAL_RUN,
  R5A_FINAL_JOB,
  R5A_MATRIX_RUN,
  R5A_MATRIX_JOB,
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
