'use strict';

const r5d = require('./community-realtime-private-auth-r5d');
const r5f = require('./community-realtime-private-auth-r5f');

const CONTRACT_ID = 'com-b03c-r5g-r5f-consumed-r5d-execution-trigger-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R5G-R5F-CONSUMED-R5D-EXECUTION-TRIGGER-READINESS';
const STATUS = 'repository_r5f_consumed_r5d_execution_trigger_readiness_certified_no_trigger_no_remote_authority';

const PREDECESSOR_R5F_CERTIFIED_HEAD = '5f60bc2d9fecd35570c99c91e64d06201e0bbb82';
const POST_CONSUMPTION_RECONCILED_HEAD = '24ada4e33a24488cd7be796b32dc19664b88e694';
const AUTHORIZATION_RECEIPT_PATH = r5f.FUTURE_AUTHORIZATION_CONSUMPTION_PATH;
const AUTHORIZATION_RECEIPT_BLOB = '12a1e21253759ae334ee6c9bf423cfe3ea7d27f4';
const FUTURE_TRIGGER_PATH = r5f.FUTURE_TRIGGER_PATH;

const R5D_CERTIFIED_HEAD = 'c3520db3b0749d26041e9010c10a30407c781331';
const R5D_MODULE_BLOB = '7cde416f2922230bae6b1e4b1e48fdfaf411da99';
const R5D_CONTRACT_ID = r5d.CONTRACT_ID;
const R5D_VALIDATION_ID = r5d.VALIDATION_ID;
const R5D_ENVELOPE_KIND = r5d.ENVELOPE_KIND;
const CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT = r5d.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT;

const MATRIX_VERSION = r5f.MATRIX_VERSION;
const REQUIRED_MATURITY = r5f.REQUIRED_MATURITY;
const REQUIRED_PRODUCTION_GATE = r5f.REQUIRED_PRODUCTION_GATE;
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R5G_REMOTE_EXECUTION_NOT_AUTHORIZED';

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'blocked_repository_only',
    reason,
    triggerReadinessCertified: false,
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
    return blocked('R5G_EXACT_R5F_RECEIPT_BLOB_REQUIRED');
  }

  const result = r5f.validateConsumedReceiptDescriptor({
    receipt,
    issuerEvidenceHead: PREDECESSOR_R5F_CERTIFIED_HEAD
  });
  if (result.decision !== 'consumed_r5e_bound_execution_authorization_receipt_valid_repository_only') {
    return blocked('R5G_VALID_CONSUMED_R5F_RECEIPT_REQUIRED', {
      predecessorReason: result.reason || null
    });
  }

  if (
    result.authorizationConsumed !== true ||
    result.authorizationReusable !== false ||
    result.reusableAfterFailure !== false ||
    result.triggerCreationAuthority !== false ||
    result.remoteExecutionAuthority !== false ||
    receipt.predecessorR5dCertifiedHead !== R5D_CERTIFIED_HEAD ||
    receipt.r5dContractId !== R5D_CONTRACT_ID ||
    receipt.r5dEnvelopeKind !== R5D_ENVELOPE_KIND ||
    receipt.authorizedHead !== r5f.R5E_EVIDENCE_HEAD ||
    receipt.futureTriggerPath !== FUTURE_TRIGGER_PATH ||
    receipt.correctedBridgeSemanticsFingerprint !== CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT ||
    receipt.executionAttempted !== false ||
    receipt.triggerCreated !== false
  ) {
    return blocked('R5G_CONSUMED_RECEIPT_FAIL_CLOSED_BINDING_REQUIRED');
  }

  return freeze({
    decision: 'r5g_consumed_r5f_execution_authorization_receipt_valid_repository_only',
    authorizationReceiptId: result.authorizationReceiptId,
    authorizedHead: result.authorizedHead,
    scopeFingerprint: result.scopeFingerprint,
    receiptBlob: AUTHORIZATION_RECEIPT_BLOB,
    predecessorR5dCertifiedHead: R5D_CERTIFIED_HEAD,
    r5dEnvelopeKind: R5D_ENVELOPE_KIND,
    authorizationConsumed: true,
    authorizationReusable: false,
    reusableAfterFailure: false,
    executionAttempted: false,
    triggerCreated: false,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (
    input.predecessorR5fCertifiedHead !== PREDECESSOR_R5F_CERTIFIED_HEAD ||
    input.postConsumptionReconciledHead !== POST_CONSUMPTION_RECONCILED_HEAD ||
    input.r5fContractId !== r5f.CONTRACT_ID ||
    input.r5fValidationId !== r5f.VALIDATION_ID ||
    input.r5dCertifiedHead !== R5D_CERTIFIED_HEAD ||
    input.r5dModuleBlob !== R5D_MODULE_BLOB ||
    input.r5dContractId !== R5D_CONTRACT_ID ||
    input.r5dValidationId !== R5D_VALIDATION_ID ||
    input.r5dEnvelopeKind !== R5D_ENVELOPE_KIND
  ) {
    return blocked('R5G_CERTIFIED_R5F_POST_CONSUMPTION_AND_R5D_LINEAGE_REQUIRED');
  }

  const receiptResult = validateConsumedAuthorizationReceipt({
    receipt: input.authorizationReceipt,
    receiptBlob: input.authorizationReceiptBlob
  });
  if (receiptResult.decision !== 'r5g_consumed_r5f_execution_authorization_receipt_valid_repository_only') {
    return receiptResult;
  }

  if (
    input.authorizationReceiptPath !== AUTHORIZATION_RECEIPT_PATH ||
    input.futureTriggerPath !== FUTURE_TRIGGER_PATH ||
    input.correctedBridgeSemanticsFingerprint !== CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT
  ) {
    return blocked('R5G_FROZEN_ASSET_CONTINUITY_REQUIRED');
  }

  if (
    input.matrixVersion !== MATRIX_VERSION ||
    input.maturity !== REQUIRED_MATURITY ||
    input.productionGate !== REQUIRED_PRODUCTION_GATE
  ) {
    return blocked('R5G_CANONICAL_MATRIX_STATE_REQUIRED');
  }

  const required = [
    'authorizationConsumedTrue',
    'authorizationReusableFalse',
    'reusableAfterFailureFalse',
    'executionAttemptedFalse',
    'receiptBlobPinned',
    'receiptIssuerHeadPinned',
    'r5eAuthorizedHeadPinned',
    'scopeFingerprintPinned',
    'authorizationPhraseFingerprintPinned',
    'authorizationReceiptIdPinned',
    'r5dCertifiedHeadPinned',
    'r5dModuleBlobPinned',
    'r5dEnvelopeKindPinned',
    'correctedBridgeSemanticsFingerprintPinned',
    'singleUseRequired',
    'runAttemptOneRequired',
    'futureTriggerMustBeSingleFileCommit',
    'futureTriggerParentMustEqualCertifiedR5gHead',
    'futureTriggerMustBindReceipt',
    'futureTriggerMustBindR5dEnvelope',
    'futureTriggerMustBindCorrectedBridgeSemantics',
    'futureTriggerBoundarySeparate',
    'remoteExecutionBoundarySeparate',
    'zeroResidueRequired',
    'baselineRestorationRequired',
    'sanitizedArtifactRequired',
    'rawAuthorizationPhrasePersistenceForbidden',
    'historicalR5dR5eR5fUnchanged',
    'workflowPullRequestOnly',
    'workflowPushTriggerAbsent',
    'workflowEnvironmentAbsent',
    'workflowSecretsAbsent',
    'noRemoteExecutionInR5g',
    'noCausalPromotionWithoutCorrectedRemoteObservation'
  ];
  for (const flag of required) {
    if (input[flag] !== true) {
      return blocked('R5G_REPOSITORY_READINESS_CONTROL_REQUIRED', { flag });
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
      return blocked('R5G_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
    }
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: STATUS,
    predecessorR5fCertifiedHead: PREDECESSOR_R5F_CERTIFIED_HEAD,
    postConsumptionReconciledHead: POST_CONSUMPTION_RECONCILED_HEAD,
    authorizationReceiptPath: AUTHORIZATION_RECEIPT_PATH,
    authorizationReceiptBlob: AUTHORIZATION_RECEIPT_BLOB,
    authorizationReceiptId: receiptResult.authorizationReceiptId,
    authorizedR5eHead: receiptResult.authorizedHead,
    scopeFingerprint: receiptResult.scopeFingerprint,
    r5dCertifiedHead: R5D_CERTIFIED_HEAD,
    r5dModuleBlob: R5D_MODULE_BLOB,
    r5dEnvelopeKind: R5D_ENVELOPE_KIND,
    correctedBridgeSemanticsFingerprint: CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    triggerReadinessCertified: true,
    futureCertifiedR5gHead: null,
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
      'After this R5G repository-only boundary is certified on an exact head, a separate single-file trigger boundary may be defined only if it binds that certified R5G head, the frozen consumed R5F receipt, and the certified R5D execution envelope. R5G itself creates no trigger and grants no remote or staging execution authority.'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  PREDECESSOR_R5F_CERTIFIED_HEAD,
  POST_CONSUMPTION_RECONCILED_HEAD,
  AUTHORIZATION_RECEIPT_PATH,
  AUTHORIZATION_RECEIPT_BLOB,
  FUTURE_TRIGGER_PATH,
  R5D_CERTIFIED_HEAD,
  R5D_MODULE_BLOB,
  R5D_CONTRACT_ID,
  R5D_VALIDATION_ID,
  R5D_ENVELOPE_KIND,
  CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  REMOTE_EXECUTION_BLOCK_CODE,
  validateConsumedAuthorizationReceipt,
  evaluateRepositoryReadiness,
  assertRemoteExecutionBoundaryAbsent
});
