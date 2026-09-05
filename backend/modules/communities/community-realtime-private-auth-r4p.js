'use strict';

const crypto = require('node:crypto');
const r4o = require('./community-realtime-private-auth-r4o');

const CONTRACT_ID = 'com-b03c-r4p-r4o-fresh-authorization-consumption-v1';
const VALIDATION_ID = 'COM-B03C-R4P-R4O-FRESH-AUTHORIZATION-CONSUMPTION';
const STATUS = 'repository_r4o_fresh_authorization_consumed_no_remote_authority';
const R4O_CERTIFIED_HEAD = 'd4f0b3c2395571d25ffb8cf4be459e161326def3';
const R4O_CERTIFICATION_RUN = 31590595847;
const R4O_CERTIFICATION_JOB = 94094407235;
const MATRIX_RUN = 31590595744;
const MATRIX_JOB = 94094406473;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const TARGET_BRANCH = 'com/com-001-baseline-audit';
const TARGET_PR = 61;
const TARGET_ENVIRONMENT = 'doke-staging';
const AUTHORIZATION_PHRASE_FINGERPRINT = '935d09b07589c90d55680d16c793a8e4f5d78a1147d4f417504b4e05efeed60f';
const AUTHORIZATION_RECEIPT_ID = '91555629bfacef190fe8977fc8258a852c461a55e703cdf88949d0b6c46c647b';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4P_REMOTE_EXECUTION_BOUNDARY_NOT_INSTALLED';

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function expectedAuthorizationRequest() {
  return r4o.buildFreshAuthorizationRequest({ certifiedHead: R4O_CERTIFIED_HEAD });
}

function deriveAuthorizationReceiptId() {
  return sha256([
    CONTRACT_ID,
    R4O_CERTIFIED_HEAD,
    AUTHORIZATION_PHRASE_FINGERPRINT,
    TARGET_ENVIRONMENT,
    TARGET_BRANCH,
    String(TARGET_PR),
    r4o.CONTRACT_ID,
    r4o.PREDECESSOR_R4N_EVIDENCE_HEAD,
    String(R4O_CERTIFICATION_RUN),
    String(R4O_CERTIFICATION_JOB),
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
  if (input.r4oCertifiedHead !== R4O_CERTIFIED_HEAD ||
      input.r4oCertificationRun !== R4O_CERTIFICATION_RUN ||
      input.r4oCertificationJob !== R4O_CERTIFICATION_JOB ||
      input.r4oCertificationSuccess !== true ||
      input.matrixRun !== MATRIX_RUN || input.matrixJob !== MATRIX_JOB || input.matrixSuccess !== true) {
    return blocked('R4P_CERTIFIED_R4O_HEAD_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION || input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('R4P_CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (input.targetBranch !== TARGET_BRANCH || input.targetPr !== TARGET_PR ||
      input.targetEnvironment !== TARGET_ENVIRONMENT) {
    return blocked('R4P_TARGET_CONTINUITY_REQUIRED');
  }

  const request = expectedAuthorizationRequest();
  if (request.authorizationPhraseFingerprint !== AUTHORIZATION_PHRASE_FINGERPRINT ||
      input.authorizationPhraseFingerprint !== AUTHORIZATION_PHRASE_FINGERPRINT) {
    return blocked('R4P_EXACT_HEAD_BOUND_AUTHORIZATION_FINGERPRINT_REQUIRED');
  }
  if (deriveAuthorizationReceiptId() !== AUTHORIZATION_RECEIPT_ID) {
    return blocked('R4P_RECEIPT_DERIVATION_MISMATCH');
  }
  if (input.authorizationPreviouslyConsumed !== false ||
      input.historicalAuthorizationReceiptReuseAttempted !== false ||
      input.executionAttempted !== false || input.triggerCreated !== false) {
    return blocked('R4P_FRESH_SINGLE_USE_AUTHORIZATION_REQUIRED');
  }
  if (input.separateHostedExecutionBoundaryRequired !== true ||
      input.rawAuthorizationPhrasePersistenceAllowed !== false) {
    return blocked('R4P_REPOSITORY_ONLY_CONSUMPTION_SCOPE_REQUIRED');
  }

  const receipt = freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    authorizationContractId: r4o.CONTRACT_ID,
    authorizedHead: R4O_CERTIFIED_HEAD,
    r4oCertificationRun: R4O_CERTIFICATION_RUN,
    r4oCertificationJob: R4O_CERTIFICATION_JOB,
    matrixRun: MATRIX_RUN,
    matrixJob: MATRIX_JOB,
    matrixVersion: MATRIX_VERSION,
    maturity: REQUIRED_MATURITY,
    productionGate: REQUIRED_PRODUCTION_GATE,
    targetBranch: TARGET_BRANCH,
    targetPr: TARGET_PR,
    targetEnvironment: TARGET_ENVIRONMENT,
    authorizationPhraseFingerprint: AUTHORIZATION_PHRASE_FINGERPRINT,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
    rawAuthorizationPhrasePersisted: false,
    singleUse: true,
    authorizationConsumed: true,
    authorizationReusable: false,
    reusableAfterFailure: false,
    historicalAuthorizationReceiptReused: false,
    executionAttempted: false,
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
    separateHostedExecutionBoundaryRequired: true,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });

  const r4oCheck = r4o.validateFreshAuthorizationReceipt({
    receipt,
    certifiedHead: R4O_CERTIFIED_HEAD
  });
  if (r4oCheck.decision !== 'r4o_fresh_authorization_receipt_valid_repository_only') {
    return blocked('R4P_R4O_RECEIPT_VALIDATION_REQUIRED');
  }
  return receipt;
}

function validatePersistedReceipt(receipt = {}) {
  if (receipt.contractId !== CONTRACT_ID || receipt.validationId !== VALIDATION_ID || receipt.status !== STATUS) return false;
  if (receipt.authorizationContractId !== r4o.CONTRACT_ID || receipt.authorizedHead !== R4O_CERTIFIED_HEAD) return false;
  if (receipt.authorizationPhraseFingerprint !== AUTHORIZATION_PHRASE_FINGERPRINT ||
      receipt.authorizationReceiptId !== AUTHORIZATION_RECEIPT_ID ||
      deriveAuthorizationReceiptId() !== AUTHORIZATION_RECEIPT_ID) return false;

  const r4oCheck = r4o.validateFreshAuthorizationReceipt({
    receipt,
    certifiedHead: R4O_CERTIFIED_HEAD
  });
  if (r4oCheck.decision !== 'r4o_fresh_authorization_receipt_valid_repository_only') return false;

  if (receipt.rawAuthorizationPhrasePersisted !== false || receipt.singleUse !== true ||
      receipt.authorizationConsumed !== true || receipt.authorizationReusable !== false ||
      receipt.reusableAfterFailure !== false || receipt.historicalAuthorizationReceiptReused !== false ||
      receipt.executionAttempted !== false || receipt.triggerCreated !== false ||
      receipt.triggerCreationAuthority !== false || receipt.remoteExecutionAuthority !== false ||
      receipt.remoteCredentialReadAuthority !== false || receipt.remoteDependencyLoadAuthority !== false ||
      receipt.networkAuthority !== false || receipt.stagingReadAuthority !== false ||
      receipt.stagingMutationAuthority !== false || receipt.realtimeSubscriptionAuthority !== false ||
      receipt.authIdentityLifecycleAuthority !== false || receipt.runtimeChangeAuthority !== false ||
      receipt.productionAuthority !== false || receipt.pullRequestMergeAuthority !== false ||
      receipt.separateHostedExecutionBoundaryRequired !== true ||
      receipt.exactRootCauseProven !== false || receipt.causalPromotionAllowed !== false) return false;
  return true;
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  R4O_CERTIFIED_HEAD,
  R4O_CERTIFICATION_RUN,
  R4O_CERTIFICATION_JOB,
  MATRIX_RUN,
  MATRIX_JOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  TARGET_BRANCH,
  TARGET_PR,
  TARGET_ENVIRONMENT,
  AUTHORIZATION_PHRASE_FINGERPRINT,
  AUTHORIZATION_RECEIPT_ID,
  REMOTE_EXECUTION_BLOCK_CODE,
  sha256,
  expectedAuthorizationRequest,
  deriveAuthorizationReceiptId,
  consumeAuthorization,
  validatePersistedReceipt,
  assertRemoteExecutionBoundaryAbsent
});
