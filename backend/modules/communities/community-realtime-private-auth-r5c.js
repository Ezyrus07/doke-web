'use strict';

const r5b = require('./community-realtime-private-auth-r5b');

const CONTRACT_ID = 'com-b03c-r5c-single-use-corrected-terminal-observation-trigger-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R5C-SINGLE-USE-CORRECTED-TERMINAL-OBSERVATION-TRIGGER-READINESS';
const STATUS = 'repository_single_use_corrected_terminal_observation_trigger_readiness_certified_no_trigger_no_remote_authority';

const PREDECESSOR_R5B_CERTIFIED_HEAD = '6a16670f666f639099412b6531bd3c311ac571fa';
const POST_CONSUMPTION_RECONCILED_HEAD = '17e20cc0170182ed269abe92178bb15fc15155d6';
const AUTHORIZATION_RECEIPT_PATH = r5b.FUTURE_AUTHORIZATION_CONSUMPTION_PATH;
const AUTHORIZATION_RECEIPT_BLOB = 'a2ed29dc6a44f9d62f5159dfeabd2c769f677b50';
const FUTURE_TRIGGER_PATH = r5b.FUTURE_TRIGGER_PATH;
const CORRECTED_BRIDGE_ASSET = 'scripts/build-com-b03c-r4z-corrected-terminal-realtime-bridge.js';
const CORRECTED_BRIDGE_BLOB = 'ff083f29e43b2f85045b23bf8f12a4b354fb0005';
const MATRIX_VERSION = r5b.MATRIX_VERSION;
const REQUIRED_MATURITY = r5b.REQUIRED_MATURITY;
const REQUIRED_PRODUCTION_GATE = r5b.REQUIRED_PRODUCTION_GATE;
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R5C_REMOTE_EXECUTION_NOT_AUTHORIZED';

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'blocked_repository_only',
    reason,
    triggerReadinessCertified: false,
    triggerCreated: false,
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

function validateConsumedAuthorizationReceipt({ receipt, receiptBlob } = {}) {
  if (receiptBlob !== AUTHORIZATION_RECEIPT_BLOB) {
    return blocked('R5C_EXACT_RECEIPT_BLOB_REQUIRED');
  }
  const result = r5b.validateConsumedReceiptDescriptor({
    receipt,
    issuerEvidenceHead: PREDECESSOR_R5B_CERTIFIED_HEAD
  });
  if (result.decision !== 'consumed_r5a_bound_authorization_receipt_valid_repository_only') {
    return blocked('R5C_VALID_CONSUMED_R5B_RECEIPT_REQUIRED', {
      predecessorReason: result.reason || null
    });
  }
  if (
    result.authorizationConsumed !== true ||
    result.authorizationReusable !== false ||
    result.reusableAfterFailure !== false ||
    result.triggerCreationAuthority !== false ||
    result.remoteExecutionAuthority !== false
  ) {
    return blocked('R5C_CONSUMED_RECEIPT_FAIL_CLOSED_BINDING_REQUIRED');
  }
  return freeze({
    decision: 'r5c_consumed_authorization_receipt_valid_repository_only',
    authorizationReceiptId: result.authorizationReceiptId,
    authorizedHead: result.authorizedHead,
    scopeFingerprint: result.scopeFingerprint,
    receiptBlob: AUTHORIZATION_RECEIPT_BLOB,
    authorizationConsumed: true,
    authorizationReusable: false,
    reusableAfterFailure: false,
    triggerCreated: false,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (
    input.predecessorR5bCertifiedHead !== PREDECESSOR_R5B_CERTIFIED_HEAD ||
    input.postConsumptionReconciledHead !== POST_CONSUMPTION_RECONCILED_HEAD ||
    input.r5bContractId !== r5b.CONTRACT_ID ||
    input.r5bValidationId !== r5b.VALIDATION_ID
  ) {
    return blocked('R5C_CERTIFIED_R5B_AND_POST_CONSUMPTION_LINEAGE_REQUIRED');
  }

  const receiptResult = validateConsumedAuthorizationReceipt({
    receipt: input.authorizationReceipt,
    receiptBlob: input.authorizationReceiptBlob
  });
  if (receiptResult.decision !== 'r5c_consumed_authorization_receipt_valid_repository_only') {
    return receiptResult;
  }

  if (
    input.authorizationReceiptPath !== AUTHORIZATION_RECEIPT_PATH ||
    input.futureTriggerPath !== FUTURE_TRIGGER_PATH ||
    input.correctedBridgeAsset !== CORRECTED_BRIDGE_ASSET ||
    input.correctedBridgeBlob !== CORRECTED_BRIDGE_BLOB
  ) {
    return blocked('R5C_ASSET_CONTINUITY_REQUIRED');
  }

  if (
    input.matrixVersion !== MATRIX_VERSION ||
    input.maturity !== REQUIRED_MATURITY ||
    input.productionGate !== REQUIRED_PRODUCTION_GATE
  ) {
    return blocked('R5C_CANONICAL_MATRIX_STATE_REQUIRED');
  }

  const required = [
    'authorizationConsumedTrue',
    'authorizationReusableFalse',
    'reusableAfterFailureFalse',
    'receiptBlobPinned',
    'receiptIssuerHeadPinned',
    'r5aAuthorizedHeadPinned',
    'scopeFingerprintPinned',
    'authorizationPhraseFingerprintPinned',
    'authorizationReceiptIdPinned',
    'correctedBridgeBlobPinned',
    'correctedBridgeSemanticsFingerprintPinned',
    'singleUseRequired',
    'runAttemptOneRequired',
    'futureTriggerMustBeSingleFileCommit',
    'futureTriggerParentMustEqualCertifiedR5cHead',
    'futureTriggerMustBindReceipt',
    'futureTriggerMustBindCorrectedBridge',
    'futureTriggerBoundarySeparate',
    'remoteExecutionBoundarySeparate',
    'zeroResidueRequired',
    'baselineRestorationRequired',
    'sanitizedArtifactRequired',
    'rawAuthorizationPhrasePersistenceForbidden',
    'historicalR4zR5aR5bUnchanged',
    'workflowPullRequestOnly',
    'workflowPushTriggerAbsent',
    'workflowEnvironmentAbsent',
    'workflowSecretsAbsent',
    'noRemoteExecutionInR5c',
    'noCausalPromotionWithoutCorrectedRemoteObservation'
  ];
  for (const flag of required) {
    if (input[flag] !== true) {
      return blocked('R5C_REPOSITORY_READINESS_CONTROL_REQUIRED', { flag });
    }
  }

  const prohibited = [
    'futureTriggerExists',
    'triggerCreated',
    'triggerCreationAuthority',
    'authorizationJobExecuted',
    'canaryJobExecuted',
    'remoteCredentialReadExecuted',
    'remoteDependencyLoadExecuted',
    'networkExecuted',
    'databaseConnectionExecuted',
    'databaseQueryAgainstRemoteExecuted',
    'realtimeSubscriptionExecuted',
    'authIdentityMutationExecuted',
    'stagingReadExecuted',
    'stagingMutationExecuted',
    'runtimeChangeExecuted',
    'productionExecuted',
    'mergeExecuted'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) {
      return blocked('R5C_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
    }
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: STATUS,
    predecessorR5bCertifiedHead: PREDECESSOR_R5B_CERTIFIED_HEAD,
    postConsumptionReconciledHead: POST_CONSUMPTION_RECONCILED_HEAD,
    authorizationReceiptPath: AUTHORIZATION_RECEIPT_PATH,
    authorizationReceiptBlob: AUTHORIZATION_RECEIPT_BLOB,
    authorizationReceiptId: receiptResult.authorizationReceiptId,
    authorizedHead: receiptResult.authorizedHead,
    scopeFingerprint: receiptResult.scopeFingerprint,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    correctedBridgeAsset: CORRECTED_BRIDGE_ASSET,
    correctedBridgeBlob: CORRECTED_BRIDGE_BLOB,
    triggerReadinessCertified: true,
    futureCertifiedR5cHead: null,
    futureTriggerExists: false,
    triggerCreated: false,
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
      'After this R5C repository-only boundary is certified on an exact head, a separate boundary may define a single-file trigger bound to that certified R5C head, the frozen receipt, and the corrected bridge. R5C itself creates no trigger and grants no remote execution authority.'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  PREDECESSOR_R5B_CERTIFIED_HEAD,
  POST_CONSUMPTION_RECONCILED_HEAD,
  AUTHORIZATION_RECEIPT_PATH,
  AUTHORIZATION_RECEIPT_BLOB,
  FUTURE_TRIGGER_PATH,
  CORRECTED_BRIDGE_ASSET,
  CORRECTED_BRIDGE_BLOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  REMOTE_EXECUTION_BLOCK_CODE,
  validateConsumedAuthorizationReceipt,
  evaluateRepositoryReadiness,
  assertRemoteExecutionBoundaryAbsent
});
