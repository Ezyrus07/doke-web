'use strict';

const r5d = require('./community-realtime-private-auth-r5d');
const r5g = require('./community-realtime-private-auth-r5g');

const CONTRACT_ID = 'com-b03c-r5h-r5g-bound-single-use-r5d-trigger-certification-v1';
const VALIDATION_ID = 'COM-B03C-R5H-R5G-BOUND-SINGLE-USE-R5D-TRIGGER-CERTIFICATION';
const STATUS = 'repository_r5g_bound_single_use_r5d_trigger_certified_no_remote_authority';

const R5G_CERTIFIED_HEAD = '4fc3577316f6426c12cebdd12bb6374e5c45a5f7';
const R5G_CERTIFICATION_RUN = 31850460232;
const R5G_CERTIFICATION_JOB = 94925137596;
const TRIGGER_MATERIALIZATION_HEAD = '3e0f5d1de27099009b4f778f6e40e3e944e00ec1';
const POST_TRIGGER_RECONCILED_HEAD = 'd8e20471b86fca88ec9735a130dd42812772d03c';

const TRIGGER_PATH = 'config/com-b03c-r5c-single-use-corrected-terminal-observation-trigger.json';
const TRIGGER_BLOB = '0d8b8a39104a1de003f9097a867e51b2313bb750';
const TRIGGER_CREATION_AUTHORIZATION_FINGERPRINT = '92b65994a1adac7dd81ff08957a1ff519c288df12b82a040571d691954c450bf';

const R5F_RECEIPT_PATH = 'config/com-b03c-r5f-r5e-fresh-execution-authorization-consumption.json';
const R5F_RECEIPT_BLOB = '12a1e21253759ae334ee6c9bf423cfe3ea7d27f4';
const R5F_RECEIPT_ID = 'cfb488dff7dbccd62362bc06b8a05308cc9f90510fa95254031c4491d3f5b778';

const R5B_RECEIPT_PATH = 'config/com-b03c-r5b-r5a-fresh-authorization-consumption.json';
const R5B_RECEIPT_BLOB = 'a2ed29dc6a44f9d62f5159dfeabd2c769f677b50';
const R5B_RECEIPT_ID = '7f83ad580442b634912f776745f25ec2de7d935ed93a6c3f5c0b622e561f3551';

const R5D_CERTIFIED_HEAD = 'c3520db3b0749d26041e9010c10a30407c781331';
const R5D_MODULE_BLOB = '7cde416f2922230bae6b1e4b1e48fdfaf411da99';
const R5D_CONTRACT_ID = r5d.CONTRACT_ID;
const R5D_VALIDATION_ID = r5d.VALIDATION_ID;
const R5D_ENVELOPE_KIND = r5d.ENVELOPE_KIND;
const CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT = r5d.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT;

const MATRIX_VERSION = r5g.MATRIX_VERSION;
const REQUIRED_MATURITY = r5g.REQUIRED_MATURITY;
const REQUIRED_PRODUCTION_GATE = r5g.REQUIRED_PRODUCTION_GATE;
const TARGET_BRANCH = r5d.TARGET_BRANCH;
const TARGET_PR = r5d.TARGET_PR;
const TARGET_STAGING_PROJECT = r5d.TARGET_STAGING_PROJECT;

const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R5H_REMOTE_EXECUTION_NOT_AUTHORIZED';

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
    triggerCertified: false,
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

function validateTrigger({
  trigger,
  triggerBlob,
  r5fReceipt,
  r5bReceipt,
  parentHead = R5G_CERTIFIED_HEAD,
  changedFiles = [TRIGGER_PATH],
  runAttempt = 1
} = {}) {
  if (triggerBlob !== TRIGGER_BLOB) return blocked('R5H_EXACT_TRIGGER_BLOB_REQUIRED');

  const r5fResult = r5g.validateConsumedAuthorizationReceipt({
    receipt: r5fReceipt,
    receiptBlob: R5F_RECEIPT_BLOB
  });
  if (r5fResult.decision !== 'r5g_consumed_r5f_execution_authorization_receipt_valid_repository_only') {
    return blocked('R5H_VALID_CONSUMED_R5F_RECEIPT_REQUIRED', { predecessorReason: r5fResult.reason || null });
  }
  if (r5fResult.authorizationReceiptId !== R5F_RECEIPT_ID) {
    return blocked('R5H_EXACT_R5F_RECEIPT_ID_REQUIRED');
  }

  const r5dResult = r5d.validateFutureTriggerCommit({
    trigger,
    parentHead,
    changedFiles,
    runAttempt,
    authorizationReceipt: r5bReceipt
  });
  if (r5dResult.decision !== 'r5d_future_trigger_continuity_valid_repository_only') {
    return blocked('R5H_R5D_TRIGGER_CONTINUITY_REQUIRED', { predecessorReason: r5dResult.reason || null });
  }

  if (
    trigger.workflowInstallHead !== R5G_CERTIFIED_HEAD ||
    trigger.r5gCertifiedHead !== R5G_CERTIFIED_HEAD ||
    trigger.r5gContractId !== r5g.CONTRACT_ID ||
    trigger.r5gValidationId !== r5g.VALIDATION_ID ||
    trigger.r5fAuthorizationReceiptPath !== R5F_RECEIPT_PATH ||
    trigger.r5fAuthorizationReceiptBlob !== R5F_RECEIPT_BLOB ||
    trigger.r5fAuthorizationReceiptId !== R5F_RECEIPT_ID ||
    trigger.r5fAuthorizationConsumed !== true ||
    trigger.r5fAuthorizationReusable !== false ||
    trigger.r5dCertifiedHead !== R5D_CERTIFIED_HEAD ||
    trigger.r5dModuleBlob !== R5D_MODULE_BLOB ||
    trigger.authorizationReceiptId !== R5B_RECEIPT_ID ||
    trigger.authorizationReceiptBlob !== R5B_RECEIPT_BLOB ||
    trigger.correctedBridgeSemanticsFingerprint !== CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT ||
    trigger.targetBranch !== TARGET_BRANCH ||
    trigger.targetPr !== TARGET_PR ||
    trigger.targetStagingProject !== TARGET_STAGING_PROJECT ||
    trigger.expectedRunAttempt !== 1 ||
    trigger.singleUse !== true ||
    trigger.reusableAfterFailure !== false ||
    trigger.rawAuthorizationPhrasePersisted !== false ||
    trigger.rawRemoteErrorExposed !== false
  ) {
    return blocked('R5H_TRIGGER_FROZEN_BINDING_REQUIRED');
  }

  return freeze({
    decision: 'r5h_r5g_bound_single_use_r5d_trigger_valid_repository_only',
    triggerPath: TRIGGER_PATH,
    triggerBlob: TRIGGER_BLOB,
    triggerParentHead: R5G_CERTIFIED_HEAD,
    r5fAuthorizationReceiptId: R5F_RECEIPT_ID,
    r5dCertifiedHead: R5D_CERTIFIED_HEAD,
    singleUse: true,
    reusableAfterFailure: false,
    triggerCreated: true,
    triggerCertified: true,
    remoteExecutionAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function evaluateRepositoryCertification(input = {}) {
  if (
    input.r5gCertifiedHead !== R5G_CERTIFIED_HEAD ||
    input.r5gCertificationRun !== R5G_CERTIFICATION_RUN ||
    input.r5gCertificationJob !== R5G_CERTIFICATION_JOB ||
    input.r5gCertificationSuccess !== true ||
    input.triggerMaterializationHead !== TRIGGER_MATERIALIZATION_HEAD ||
    input.postTriggerReconciledHead !== POST_TRIGGER_RECONCILED_HEAD
  ) {
    return blocked('R5H_CERTIFIED_R5G_AND_POST_TRIGGER_HEADS_REQUIRED');
  }

  if (
    input.matrixVersion !== MATRIX_VERSION ||
    input.maturity !== REQUIRED_MATURITY ||
    input.productionGate !== REQUIRED_PRODUCTION_GATE
  ) {
    return blocked('R5H_CANONICAL_MATRIX_STATE_REQUIRED');
  }

  if (
    input.triggerPath !== TRIGGER_PATH ||
    input.triggerBlob !== TRIGGER_BLOB ||
    input.triggerCreationAuthorizationFingerprint !== TRIGGER_CREATION_AUTHORIZATION_FINGERPRINT ||
    input.r5fReceiptPath !== R5F_RECEIPT_PATH ||
    input.r5fReceiptBlob !== R5F_RECEIPT_BLOB ||
    input.r5bReceiptPath !== R5B_RECEIPT_PATH ||
    input.r5bReceiptBlob !== R5B_RECEIPT_BLOB
  ) {
    return blocked('R5H_FROZEN_ASSET_BINDING_REQUIRED');
  }

  const triggerResult = validateTrigger({
    trigger: input.trigger,
    triggerBlob: input.triggerBlob,
    r5fReceipt: input.r5fReceipt,
    r5bReceipt: input.r5bReceipt,
    parentHead: R5G_CERTIFIED_HEAD,
    changedFiles: [TRIGGER_PATH],
    runAttempt: 1
  });
  if (triggerResult.decision !== 'r5h_r5g_bound_single_use_r5d_trigger_valid_repository_only') {
    return triggerResult;
  }

  const required = [
    'triggerMaterializationSingleFile',
    'triggerMaterializationParentIsCertifiedR5g',
    'postTriggerReconciledTreeMatchesMaterializationTree',
    'triggerBlobPinned',
    'r5gHeadPinned',
    'r5gCertificationPinned',
    'r5fReceiptPinned',
    'r5dEnvelopePinned',
    'r5bLineageReceiptPinned',
    'correctedBridgeSemanticsPinned',
    'triggerCreationAuthorizationConsumed',
    'triggerCreationAuthorizationReusableFalse',
    'rawAuthorizationPhrasePersistenceForbidden',
    'singleUseRequired',
    'reusableAfterFailureFalse',
    'runAttemptOneRequired',
    'remoteExecutionBoundarySeparate',
    'stagingExecutionSeparatelyAuthorizedRequired',
    'zeroResidueRequired',
    'baselineRestorationRequired',
    'sanitizedArtifactRequired',
    'workflowPullRequestOnly',
    'workflowPushTriggerAbsent',
    'workflowEnvironmentAbsent',
    'workflowSecretsAbsent',
    'noCausalPromotionWithoutCorrectedRemoteObservation'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R5H_CERTIFICATION_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'triggerReused',
    'remoteExecutionExecuted',
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
    if (input[flag] !== false) return blocked('R5H_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: STATUS,
    r5gCertifiedHead: R5G_CERTIFIED_HEAD,
    triggerMaterializationHead: TRIGGER_MATERIALIZATION_HEAD,
    postTriggerReconciledHead: POST_TRIGGER_RECONCILED_HEAD,
    triggerPath: TRIGGER_PATH,
    triggerBlob: TRIGGER_BLOB,
    triggerCreationAuthorizationFingerprint: TRIGGER_CREATION_AUTHORIZATION_FINGERPRINT,
    r5fAuthorizationReceiptId: R5F_RECEIPT_ID,
    r5dCertifiedHead: R5D_CERTIFIED_HEAD,
    r5dEnvelopeKind: R5D_ENVELOPE_KIND,
    triggerCreated: true,
    triggerCertified: true,
    triggerSingleUse: true,
    triggerReusableAfterFailure: false,
    triggerCreationAuthorizationConsumed: true,
    triggerCreationAuthorizationReusable: false,
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
      'Any corrected terminal observation execution on staging remains a separate explicitly authorized single-use boundary. This R5H certification validates only the frozen trigger and grants no remote, staging, credential, network, runtime, production, or merge authority.'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  R5G_CERTIFIED_HEAD,
  R5G_CERTIFICATION_RUN,
  R5G_CERTIFICATION_JOB,
  TRIGGER_MATERIALIZATION_HEAD,
  POST_TRIGGER_RECONCILED_HEAD,
  TRIGGER_PATH,
  TRIGGER_BLOB,
  TRIGGER_CREATION_AUTHORIZATION_FINGERPRINT,
  R5F_RECEIPT_PATH,
  R5F_RECEIPT_BLOB,
  R5F_RECEIPT_ID,
  R5B_RECEIPT_PATH,
  R5B_RECEIPT_BLOB,
  R5B_RECEIPT_ID,
  R5D_CERTIFIED_HEAD,
  R5D_MODULE_BLOB,
  R5D_CONTRACT_ID,
  R5D_VALIDATION_ID,
  R5D_ENVELOPE_KIND,
  CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  TARGET_BRANCH,
  TARGET_PR,
  TARGET_STAGING_PROJECT,
  REMOTE_EXECUTION_BLOCK_CODE,
  validateTrigger,
  evaluateRepositoryCertification,
  assertRemoteExecutionBoundaryAbsent
});
