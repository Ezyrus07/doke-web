'use strict';

const crypto = require('node:crypto');
const r4h = require('./community-realtime-private-auth-r4h');

const CONTRACT_ID = 'com-b03c-r4i-r4h-terminal-observation-authorization-consumption-v1';
const VALIDATION_ID = 'COM-B03C-R4I-R4H-TERMINAL-OBSERVATION-AUTHORIZATION-CONSUMPTION';
const STATUS = 'repository_r4h_terminal_observation_authorization_consumed_no_remote_authority';
const R4H_CERTIFIED_HEAD = 'bb2fb9188ae054916bc3b770ef89e2a0addb38e3';
const R4H_CERTIFICATION_RUN = 31523852988;
const R4H_CERTIFICATION_JOB = 93887242248;
const MATRIX_RUN = 31523853153;
const MATRIX_JOB = 93887242912;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const TARGET_BRANCH = 'com/com-001-baseline-audit';
const TARGET_PR = 61;
const TARGET_STAGING_PROJECT = 'zwkczgewzbsorbrjuzpb';
const AUTHORIZATION_PHRASE_FINGERPRINT = '6e4328d994c72c565c66b521eceafdbcd22be6b2736b5217cb6108c566ba4d12';
const AUTHORIZATION_RECEIPT_ID = '004a68f8916eb8f63b2e6812a9183924f2ceb8135b9e3864b77f280f11efab1f';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4I_REMOTE_EXECUTION_BOUNDARY_NOT_INSTALLED';

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function expectedAuthorizationPhrase() {
  return r4h.buildAuthorizationPhrase(R4H_CERTIFIED_HEAD);
}

function deriveAuthorizationReceiptId() {
  return sha256([
    CONTRACT_ID,
    R4H_CERTIFIED_HEAD,
    AUTHORIZATION_PHRASE_FINGERPRINT,
    TARGET_STAGING_PROJECT,
    TARGET_BRANCH,
    String(TARGET_PR),
    r4h.CONTRACT_ID,
    r4h.PREDECESSOR_R4G_HEAD,
    'single-use',
    'repository-only'
  ].join(':'));
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'blocked_repository_only',
    reason,
    authorizationConsumed: false,
    authorizationReusable: false,
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

function consumeAuthorization(input = {}) {
  if (input.r4hCertifiedHead !== R4H_CERTIFIED_HEAD ||
      input.r4hCertificationRun !== R4H_CERTIFICATION_RUN ||
      input.r4hCertificationJob !== R4H_CERTIFICATION_JOB ||
      input.r4hCertificationSuccess !== true ||
      input.matrixRun !== MATRIX_RUN || input.matrixJob !== MATRIX_JOB || input.matrixSuccess !== true) {
    return blocked('R4I_CERTIFIED_R4H_HEAD_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION || input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('R4I_CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (input.targetBranch !== TARGET_BRANCH || input.targetPr !== TARGET_PR ||
      input.targetStagingProject !== TARGET_STAGING_PROJECT) {
    return blocked('R4I_TARGET_CONTINUITY_REQUIRED');
  }
  const exactPhrase = expectedAuthorizationPhrase();
  if (input.authorizationStatement !== exactPhrase || sha256(input.authorizationStatement) !== AUTHORIZATION_PHRASE_FINGERPRINT) {
    return blocked('R4I_EXACT_HEAD_BOUND_AUTHORIZATION_STATEMENT_REQUIRED');
  }
  if (deriveAuthorizationReceiptId() !== AUTHORIZATION_RECEIPT_ID) {
    return blocked('R4I_RECEIPT_DERIVATION_MISMATCH');
  }
  if (input.authorizationPreviouslyConsumed !== false || input.executionAttempted !== false ||
      input.triggerExists !== false || input.r4eAuthorizationReusable !== false) {
    return blocked('R4I_FRESH_SINGLE_USE_AUTHORIZATION_REQUIRED');
  }
  if (input.separateExecutionBoundaryRequired !== true || input.rawAuthorizationPhrasePersistenceAllowed !== false) {
    return blocked('R4I_REPOSITORY_ONLY_CONSUMPTION_SCOPE_REQUIRED');
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: STATUS,
    status: STATUS,
    r4hContractId: r4h.CONTRACT_ID,
    r4hCertifiedHead: R4H_CERTIFIED_HEAD,
    r4hCertificationRun: R4H_CERTIFICATION_RUN,
    r4hCertificationJob: R4H_CERTIFICATION_JOB,
    matrixRun: MATRIX_RUN,
    matrixJob: MATRIX_JOB,
    matrixVersion: MATRIX_VERSION,
    maturity: REQUIRED_MATURITY,
    productionGate: REQUIRED_PRODUCTION_GATE,
    targetBranch: TARGET_BRANCH,
    targetPr: TARGET_PR,
    targetStagingProject: TARGET_STAGING_PROJECT,
    authorizationPhraseFingerprint: AUTHORIZATION_PHRASE_FINGERPRINT,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
    rawAuthorizationPhrasePersisted: false,
    singleUse: true,
    authorizationConsumed: true,
    authorizationReusable: false,
    reusableAfterFailure: false,
    executionAttempted: false,
    triggerExists: false,
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
    separateExecutionBoundaryRequired: true,
    r4eAuthorizationReusable: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function validatePersistedReceipt(receipt = {}) {
  if (receipt.contractId !== CONTRACT_ID || receipt.validationId !== VALIDATION_ID || receipt.status !== STATUS) return false;
  if (receipt.r4hContractId !== r4h.CONTRACT_ID || receipt.r4hCertifiedHead !== R4H_CERTIFIED_HEAD) return false;
  if (receipt.authorizationPhraseFingerprint !== AUTHORIZATION_PHRASE_FINGERPRINT || receipt.authorizationReceiptId !== AUTHORIZATION_RECEIPT_ID) return false;
  if (receipt.rawAuthorizationPhrasePersisted !== false || receipt.singleUse !== true || receipt.authorizationConsumed !== true ||
      receipt.authorizationReusable !== false || receipt.reusableAfterFailure !== false || receipt.executionAttempted !== false ||
      receipt.triggerExists !== false || receipt.triggerCreationAuthority !== false || receipt.remoteExecutionAuthority !== false ||
      receipt.remoteCredentialReadAuthority !== false || receipt.remoteDependencyLoadAuthority !== false || receipt.networkAuthority !== false ||
      receipt.stagingReadAuthority !== false || receipt.stagingMutationAuthority !== false || receipt.realtimeSubscriptionAuthority !== false ||
      receipt.authIdentityLifecycleAuthority !== false || receipt.runtimeChangeAuthority !== false || receipt.productionAuthority !== false ||
      receipt.pullRequestMergeAuthority !== false || receipt.separateExecutionBoundaryRequired !== true ||
      receipt.r4eAuthorizationReusable !== false || receipt.exactRootCauseProven !== false || receipt.causalPromotionAllowed !== false) return false;
  return true;
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  R4H_CERTIFIED_HEAD,
  R4H_CERTIFICATION_RUN,
  R4H_CERTIFICATION_JOB,
  MATRIX_RUN,
  MATRIX_JOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  TARGET_BRANCH,
  TARGET_PR,
  TARGET_STAGING_PROJECT,
  AUTHORIZATION_PHRASE_FINGERPRINT,
  AUTHORIZATION_RECEIPT_ID,
  REMOTE_EXECUTION_BLOCK_CODE,
  sha256,
  expectedAuthorizationPhrase,
  deriveAuthorizationReceiptId,
  consumeAuthorization,
  validatePersistedReceipt,
  assertRemoteExecutionBoundaryAbsent
});
