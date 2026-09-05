'use strict';

const crypto = require('node:crypto');
const r5e = require('./community-realtime-private-auth-r5e');

const CONTRACT_ID = 'com-b03c-r5f-r5e-bound-r5d-execution-authorization-issuance-consumption-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R5F-R5E-BOUND-R5D-EXECUTION-AUTHORIZATION-ISSUANCE-CONSUMPTION-READINESS';
const STATUS = 'repository_r5e_bound_r5d_execution_authorization_issuance_consumption_ready_authorization_absent_no_remote_authority';

const R5E_EVIDENCE_HEAD = 'bc8532c3afacb515ef72ebefb55667937d8925e8';
const R5E_EVIDENCE_TREE = '89837f46e8061fdce3ee8e84c0c689e7259ee9a6';
const R5E_EVIDENCE_BLOB = 'e6e71f10007c796576e036902dfb1cb8e285b7f8';
const R5E_CERTIFIED_STATUS = r5e.STATUS;
const R5E_FINAL_RUN = 31804043387;
const R5E_FINAL_JOB = 94778528648;
const R5E_RECONCILIATION_RUN = 31803876365;
const R5E_RECONCILIATION_JOB = 94777986987;

const MATRIX_VERSION = r5e.MATRIX_VERSION;
const REQUIRED_MATURITY = r5e.REQUIRED_MATURITY;
const REQUIRED_PRODUCTION_GATE = r5e.REQUIRED_PRODUCTION_GATE;
const REQUIRED_BRANCH = r5e.REQUIRED_BRANCH;
const REQUIRED_PULL_REQUEST = r5e.REQUIRED_PULL_REQUEST;
const REQUIRED_PROJECT_ID = r5e.REQUIRED_PROJECT_ID;
const TARGET_ENVIRONMENT = r5e.TARGET_ENVIRONMENT;

const FUTURE_AUTHORIZATION_CONSUMPTION_PATH = r5e.FUTURE_AUTHORIZATION_CONSUMPTION_PATH;
const FUTURE_TRIGGER_PATH = r5e.FUTURE_TRIGGER_PATH;
const RECEIPT_CONTRACT_ID = 'com-b03c-r5f-r5e-bound-single-use-r5d-execution-authorization-receipt-v1';
const RECEIPT_STATUS = 'authorization_consumed_trigger_boundary_pending';
const AUTHORIZATION_PREFIX =
  'I_EXPLICITLY_AUTHORIZE_COM_B03C_R5D_CORRECTED_TERMINAL_OBSERVATION_EXECUTION_SINGLE_USE_ON_DOKE_STAGING_FOR_R5E_HEAD_';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R5F_REMOTE_EXECUTION_NOT_AUTHORIZED';

const LIFECYCLE_STATES = Object.freeze([
  'r5e_certified_execution_authorization_absent',
  'fresh_r5e_bound_execution_authorization_received',
  'fresh_r5e_bound_execution_authorization_consumed',
  'consumed_receipt_frozen_trigger_boundary_required'
]);

const REQUIRED_CONSUMED_RECEIPT_KEYS = Object.freeze([
  'contractId', 'status', 'issuerContractId', 'issuerEvidenceHead',
  'authorizationContractId', 'authorizedHead', 'scopeFingerprint',
  'authorizationPhraseFingerprint', 'authorizationReceiptId',
  'predecessorR5dCertifiedHead', 'r5dContractId', 'r5dEnvelopeKind',
  'lineageAuthorizationReceiptId', 'lineageAuthorizationReceiptBlob',
  'correctedBridgeSemanticsFingerprint', 'futureTriggerPath',
  'targetEnvironment', 'projectId', 'branch', 'pullRequest', 'runAttempt',
  'singleUse', 'authorizationConsumed', 'authorizationReusable',
  'reusableAfterFailure', 'zeroResidueRequired', 'baselineRestorationRequired',
  'sanitizedArtifactRequired', 'rawAuthorizationPhrasePersisted',
  'executionAttempted', 'triggerCreated', 'remoteExecutionAuthority'
]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
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
  return r5e.buildFutureAuthorizationScope({ certifiedR5eHead: R5E_EVIDENCE_HEAD });
}

function buildAuthorizationPhrase() {
  return `${AUTHORIZATION_PREFIX}${R5E_EVIDENCE_HEAD}`;
}

function authorizationPhraseFingerprint() {
  return sha256(buildAuthorizationPhrase());
}

function deriveAuthorizationReceiptId() {
  const scope = buildAuthorizationScope();
  return sha256([
    CONTRACT_ID,
    R5E_EVIDENCE_HEAD,
    R5E_EVIDENCE_TREE,
    R5E_EVIDENCE_BLOB,
    scope.scopeFingerprint,
    authorizationPhraseFingerprint(),
    REQUIRED_PROJECT_ID,
    REQUIRED_BRANCH,
    String(REQUIRED_PULL_REQUEST),
    r5e.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT
  ].join(':'));
}

function evaluateExplicitAuthorization(input = {}) {
  if (input.authorizationPhrase !== buildAuthorizationPhrase()) {
    return blocked('R5F_EXACT_R5E_HEAD_BOUND_AUTHORIZATION_PHRASE_REQUIRED');
  }
  if (input.authorizationConsumed !== false || input.executionAttempted !== false) {
    return blocked('R5F_AUTHORIZATION_ALREADY_CONSUMED_OR_ATTEMPTED');
  }
  if (
    input.authorizedHead !== R5E_EVIDENCE_HEAD ||
    input.targetEnvironment !== TARGET_ENVIRONMENT ||
    input.projectId !== REQUIRED_PROJECT_ID ||
    input.branch !== REQUIRED_BRANCH ||
    input.pullRequest !== REQUIRED_PULL_REQUEST ||
    input.runAttempt !== 1
  ) {
    return blocked('R5F_EXACT_AUTHORIZATION_SCOPE_REQUIRED');
  }
  const scope = buildAuthorizationScope();
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'fresh_r5e_bound_execution_authorization_received_repository_only',
    lifecycleState: 'fresh_r5e_bound_execution_authorization_received',
    authorizedHead: R5E_EVIDENCE_HEAD,
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
    receipt.decision !== 'fresh_r5e_bound_execution_authorization_received_repository_only' ||
    receipt.authorizedHead !== R5E_EVIDENCE_HEAD ||
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
    return blocked('R5F_VALID_FRESH_UNCONSUMED_AUTHORIZATION_RECEIPT_REQUIRED');
  }
  return freeze({
    ...receipt,
    decision: 'fresh_r5e_bound_execution_authorization_consumed_repository_only',
    lifecycleState: 'fresh_r5e_bound_execution_authorization_consumed',
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
    authorizedHead: R5E_EVIDENCE_HEAD,
    targetEnvironment: TARGET_ENVIRONMENT,
    projectId: REQUIRED_PROJECT_ID,
    branch: REQUIRED_BRANCH,
    pullRequest: REQUIRED_PULL_REQUEST,
    runAttempt: 1,
    authorizationConsumed: false,
    executionAttempted: false
  }));
}

function buildConsumedReceiptDescriptor({ issuerEvidenceHead } = {}) {
  if (!isSha(issuerEvidenceHead)) {
    const error = new TypeError('R5F_CERTIFIED_ISSUER_EVIDENCE_HEAD_REQUIRED');
    error.code = 'R5F_CERTIFIED_ISSUER_EVIDENCE_HEAD_REQUIRED';
    throw error;
  }
  const consumed = buildExpectedConsumedAuthorization();
  if (consumed.decision === 'blocked_repository_only') throw new Error(consumed.reason);
  const scope = buildAuthorizationScope();
  return freeze({
    contractId: RECEIPT_CONTRACT_ID,
    status: RECEIPT_STATUS,
    issuerContractId: CONTRACT_ID,
    issuerEvidenceHead,
    authorizationContractId: r5e.CONTRACT_ID,
    authorizedHead: R5E_EVIDENCE_HEAD,
    scopeFingerprint: scope.scopeFingerprint,
    authorizationPhraseFingerprint: consumed.authorizationPhraseFingerprint,
    authorizationReceiptId: consumed.authorizationReceiptId,
    predecessorR5dCertifiedHead: r5e.PREDECESSOR_R5D_CERTIFIED_HEAD,
    r5dContractId: scope.r5dContractId,
    r5dEnvelopeKind: scope.r5dEnvelopeKind,
    lineageAuthorizationReceiptId: r5e.LINEAGE_AUTHORIZATION_RECEIPT_ID,
    lineageAuthorizationReceiptBlob: r5e.LINEAGE_AUTHORIZATION_RECEIPT_BLOB,
    correctedBridgeSemanticsFingerprint: r5e.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    targetEnvironment: TARGET_ENVIRONMENT,
    projectId: REQUIRED_PROJECT_ID,
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
  if (!isSha(issuerEvidenceHead)) return blocked('R5F_CERTIFIED_ISSUER_EVIDENCE_HEAD_REQUIRED');
  if (!exactKeys(receipt, REQUIRED_CONSUMED_RECEIPT_KEYS)) {
    return blocked('R5F_EXACT_CONSUMED_RECEIPT_SHAPE_REQUIRED');
  }
  if (
    receipt.contractId !== RECEIPT_CONTRACT_ID ||
    receipt.status !== RECEIPT_STATUS ||
    receipt.issuerContractId !== CONTRACT_ID ||
    receipt.issuerEvidenceHead !== issuerEvidenceHead ||
    receipt.authorizationPhraseFingerprint !== authorizationPhraseFingerprint() ||
    receipt.authorizationReceiptId !== deriveAuthorizationReceiptId() ||
    receipt.zeroResidueRequired !== true ||
    receipt.baselineRestorationRequired !== true ||
    receipt.sanitizedArtifactRequired !== true ||
    receipt.remoteExecutionAuthority !== false
  ) {
    return blocked('R5F_CONSUMED_RECEIPT_BINDING_REQUIRED');
  }
  const compatibility = r5e.validateFutureAuthorizationReceiptShape({
    receipt,
    certifiedR5eHead: R5E_EVIDENCE_HEAD
  });
  if (compatibility.decision !== 'future_r5e_execution_authorization_receipt_shape_valid_repository_only') {
    return blocked('R5F_R5E_RECEIPT_COMPATIBILITY_REQUIRED', {
      predecessorReason: compatibility.reason || null
    });
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'consumed_r5e_bound_execution_authorization_receipt_valid_repository_only',
    issuerEvidenceHead,
    authorizedHead: R5E_EVIDENCE_HEAD,
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
    input.r5eContractId !== r5e.CONTRACT_ID ||
    input.r5eValidationId !== r5e.VALIDATION_ID ||
    input.r5eEvidenceHead !== R5E_EVIDENCE_HEAD ||
    input.r5eEvidenceTree !== R5E_EVIDENCE_TREE ||
    input.r5eEvidenceBlob !== R5E_EVIDENCE_BLOB ||
    input.r5eCertifiedStatus !== R5E_CERTIFIED_STATUS ||
    input.r5eFinalRun !== R5E_FINAL_RUN ||
    input.r5eFinalJob !== R5E_FINAL_JOB ||
    input.r5eReconciliationRun !== R5E_RECONCILIATION_RUN ||
    input.r5eReconciliationJob !== R5E_RECONCILIATION_JOB
  ) return blocked('R5F_CERTIFIED_R5E_EVIDENCE_CONTINUITY_REQUIRED');
  if (
    input.matrixVersion !== MATRIX_VERSION ||
    input.maturity !== REQUIRED_MATURITY ||
    input.productionGate !== REQUIRED_PRODUCTION_GATE
  ) return blocked('R5F_CANONICAL_MATRIX_STATE_REQUIRED');

  const required = [
    'exactR5eEvidenceHeadPinned', 'exactR5eEvidenceTreePinned', 'exactR5eEvidenceBlobPinned',
    'r5eAuthorizationScopeFingerprintPinned', 'r5dImmutableLineagePinned',
    'correctedBridgeSemanticsFingerprintPinned', 'freshAuthorizationPhraseFactoryPrepared',
    'concreteAuthorizationPhraseNotPersisted', 'authorizationPhraseFingerprintPrepared',
    'freshReceiptDerivationPrepared', 'receiptConsumptionTransitionPrepared',
    'receiptCompatibilityWithR5ePrepared', 'receiptMustBindCertifiedR5fIssuerEvidenceHead',
    'singleUseRequired', 'authorizationReusableFalse', 'reusableAfterFailureFalse',
    'zeroResidueRequired', 'baselineRestorationRequired', 'sanitizedArtifactRequired',
    'secondConsumptionRejected', 'priorAuthorizationReuseRejected', 'priorReceiptReuseRejected',
    'rawAuthorizationPhrasePersistenceForbidden', 'runAttemptOneRequired',
    'triggerBoundarySeparate', 'remoteExecutionBoundarySeparate',
    'workflowPushTriggerAbsent', 'workflowEnvironmentAbsent', 'workflowSecretsAbsent',
    'repositorySelfTestPrepared', 'noRemoteExecutionInR5f',
    'noCausalPromotionWithoutCorrectedRemoteObservation'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R5F_REPOSITORY_READINESS_CONTROL_REQUIRED', { flag });
  }
  const prohibited = [
    'authorizationPhraseReceived', 'authorizationReceiptCreated', 'authorizationConsumed',
    'futureAuthorizationConsumptionFileExists', 'triggerCreated', 'futureTriggerFileExists',
    'authorizationJobExecuted', 'canaryJobExecuted', 'remoteCredentialReadExecuted',
    'remoteDependencyLoadExecuted', 'networkExecuted', 'databaseConnectionExecuted',
    'databaseQueryAgainstRemoteExecuted', 'realtimeSubscriptionExecuted',
    'authIdentityMutationExecuted', 'stagingMutationExecuted', 'runtimeChangeExecuted',
    'productionExecuted', 'mergeExecuted'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R5F_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: STATUS,
    r5eEvidenceHead: R5E_EVIDENCE_HEAD,
    r5eEvidenceTree: R5E_EVIDENCE_TREE,
    r5eEvidenceBlob: R5E_EVIDENCE_BLOB,
    scopeFingerprint: buildAuthorizationScope().scopeFingerprint,
    correctedBridgeSemanticsFingerprint: r5e.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
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
      'After exact R5F evidence-head certification, wait for a fresh explicit single-use authorization matching buildAuthorizationPhrase(). Only then may a separate single-file consumed receipt be frozen at the R5E future authorization consumption path. Do not create the trigger or execute staging in R5F.'
  });
}

module.exports = freeze({
  CONTRACT_ID, VALIDATION_ID, STATUS, R5E_EVIDENCE_HEAD, R5E_EVIDENCE_TREE,
  R5E_EVIDENCE_BLOB, R5E_CERTIFIED_STATUS, R5E_FINAL_RUN, R5E_FINAL_JOB,
  R5E_RECONCILIATION_RUN, R5E_RECONCILIATION_JOB, MATRIX_VERSION,
  REQUIRED_MATURITY, REQUIRED_PRODUCTION_GATE, REQUIRED_BRANCH,
  REQUIRED_PULL_REQUEST, REQUIRED_PROJECT_ID, TARGET_ENVIRONMENT,
  FUTURE_AUTHORIZATION_CONSUMPTION_PATH, FUTURE_TRIGGER_PATH,
  RECEIPT_CONTRACT_ID, RECEIPT_STATUS, AUTHORIZATION_PREFIX,
  REMOTE_EXECUTION_BLOCK_CODE, LIFECYCLE_STATES, REQUIRED_CONSUMED_RECEIPT_KEYS,
  buildAuthorizationScope, buildAuthorizationPhrase, authorizationPhraseFingerprint,
  deriveAuthorizationReceiptId, evaluateExplicitAuthorization, consumeAuthorization,
  buildExpectedConsumedAuthorization, buildConsumedReceiptDescriptor,
  validateConsumedReceiptDescriptor, evaluateRepositoryReadiness,
  assertRemoteExecutionBoundaryAbsent
});
