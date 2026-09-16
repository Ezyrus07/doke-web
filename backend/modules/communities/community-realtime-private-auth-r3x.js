'use strict';

const r3w = require('./community-realtime-private-auth-r3w');
const r3v = require('./community-realtime-private-auth-r3v');
const r3k = require('./community-realtime-private-auth-r3k');

const CONTRACT_ID = 'com-b03c-r3x-authorized-single-file-trigger-creation-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R3X-AUTHORIZED-SINGLE-FILE-TRIGGER-CREATION-READINESS';
const PREDECESSOR_VALIDATION_ID = r3w.VALIDATION_ID;
const PREDECESSOR_STATUS = 'repository_head_bound_single_use_staging_authorization_lifecycle_certified_authorization_absent';
const PREDECESSOR_HEAD = '8c373c9091b9039a64b59b8ad4ca648e7ae80057';
const PREDECESSOR_RECERT_RUN = 31434694024;
const PREDECESSOR_RECERT_JOB = 93606072590;
const PREDECESSOR_MATRIX_RECERT_RUN = 31434693914;
const PREDECESSOR_MATRIX_RECERT_JOB = 93606072246;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';

const AUTHORIZATION_EVIDENCE_HEAD = PREDECESSOR_HEAD;
const AUTHORIZATION_PHRASE_FINGERPRINT = 'afccd375320538f0373da136fd2a52b8c26af5044820370c20fece5ecd0a94ba';
const AUTHORIZATION_RECEIPT_ID = '7fcbee37389539920ea5c0941226f9952315cb58177e613d2abe1fccf649c985';
const TRIGGER_PATH = r3w.FUTURE_TRIGGER_PATH;
const TRIGGER_CONTRACT_ID = r3w.TRIGGER_CONTRACT_ID;
const TRIGGER_STATUS = r3w.TRIGGER_STATUS;
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R3X_REMOTE_EXECUTION_BOUNDARY_REQUIRED';

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
    repositoryTriggerLifecycleAuthority: false,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    networkAuthority: false,
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

function buildAuthorizationReceipt() {
  return freeze({
    contractId: r3w.CONTRACT_ID,
    validationId: r3w.VALIDATION_ID,
    decision: 'authorization_consumed_trigger_creation_pending',
    lifecycleState: 'authorization_consumed_trigger_creation_pending',
    certifiedLifecycleHead: AUTHORIZATION_EVIDENCE_HEAD,
    authorizationPhraseFingerprint: AUTHORIZATION_PHRASE_FINGERPRINT,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
    singleUse: true,
    reusableAfterFailure: false,
    predecessorAuthorizationReusable: false,
    authorizationConsumed: true,
    executionAttempted: false,
    triggerCreationAuthority: true,
    remoteExecutionAuthority: false
  });
}

function verifyAuthorizationReceiptDerivation() {
  const phrase = r3w.buildAuthorizationPhrase(AUTHORIZATION_EVIDENCE_HEAD);
  const received = r3w.evaluateExplicitAuthorization({
    certifiedLifecycleHead: AUTHORIZATION_EVIDENCE_HEAD,
    authorizationPhrase: phrase,
    authorizationConsumed: false,
    executionAttempted: false,
    targetEnvironment: 'staging',
    projectId: r3k.REQUIRED_PROJECT_ID,
    branch: r3k.REQUIRED_BRANCH,
    pullRequest: r3k.REQUIRED_PULL_REQUEST
  });
  const consumed = r3w.consumeAuthorizationForTrigger(received);
  return freeze({
    phraseFingerprintMatches: received.authorizationPhraseFingerprint === AUTHORIZATION_PHRASE_FINGERPRINT,
    receiptIdMatches: received.authorizationReceiptId === AUTHORIZATION_RECEIPT_ID,
    consumedReceiptMatches:
      consumed.authorizationReceiptId === AUTHORIZATION_RECEIPT_ID &&
      consumed.authorizationConsumed === true &&
      consumed.executionAttempted === false,
    concreteAuthorizationPhrasePersisted: false
  });
}

function buildAuthorizedTriggerDescriptor(workflowInstallHead) {
  return r3w.buildFutureTriggerDescriptor({
    workflowInstallHead,
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID
  });
}

function validateAuthorizedTriggerCommit({ trigger, parentHead, changedFiles, runAttempt } = {}) {
  return r3w.validateFutureTriggerCommit({
    trigger,
    parentHead,
    changedFiles,
    runAttempt,
    authorizationReceipt: buildAuthorizationReceipt()
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3W_VALIDATION_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3W_CERTIFIED_STATUS_REQUIRED');
  if (input.predecessorHead !== PREDECESSOR_HEAD) return blocked('R3W_EVIDENCE_HEAD_REQUIRED');
  if (input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN ||
      input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB ||
      input.predecessorRecertSuccess !== true) return blocked('R3W_EVIDENCE_RECERT_REQUIRED');
  if (input.predecessorMatrixRecertRun !== PREDECESSOR_MATRIX_RECERT_RUN ||
      input.predecessorMatrixRecertJob !== PREDECESSOR_MATRIX_RECERT_JOB ||
      input.predecessorMatrixRecertSuccess !== true) return blocked('R3W_MATRIX_RECERT_REQUIRED');
  if (input.matrixVersion !== MATRIX_VERSION || input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) return blocked('CANONICAL_MATRIX_STATE_REQUIRED');
  if (input.r3wContractId !== r3w.CONTRACT_ID || input.r3vContractId !== r3v.CONTRACT_ID) {
    return blocked('R3W_R3V_CONTINUITY_REQUIRED');
  }
  if (input.authorizationEvidenceHead !== AUTHORIZATION_EVIDENCE_HEAD ||
      input.authorizationPhraseFingerprint !== AUTHORIZATION_PHRASE_FINGERPRINT ||
      input.authorizationReceiptId !== AUTHORIZATION_RECEIPT_ID) {
    return blocked('EXACT_AUTHORIZATION_RECEIPT_REQUIRED');
  }
  if (input.triggerPath !== TRIGGER_PATH || input.triggerContractId !== TRIGGER_CONTRACT_ID) {
    return blocked('R3W_TRIGGER_CONTRACT_REQUIRED');
  }

  const required = [
    'authorizationReceiptRecordedByDigestOnly',
    'authorizationPlaintextNotPersisted',
    'authorizationReceiptDerivationReproducible',
    'authorizationConsumedForTriggerCreationOnly',
    'singleFileTriggerDeltaRequired',
    'triggerParentContinuityRequired',
    'runAttemptOneRequired',
    'triggerAuthorizationEvidenceHeadPinned',
    'triggerReceiptIdPinned',
    'triggerScopePinnedToStagingProject',
    'remoteExecutionSeparatelyBlocked',
    'repositorySelfTestPrepared',
    'triggerValidationPrepared',
    'cleanupAfterTriggerValidationRequired',
    'authorizationNonReusableAfterTriggerAttempt',
    'noCausalPromotionWithoutRemoteObservation'
  ];
  for (const flag of required) if (input[flag] !== true) return blocked('R3X_CONTROL_REQUIRED', { flag });

  const prohibited = [
    'authorizationPlaintextPersisted',
    'remoteExecutionAuthorized',
    'stagingEnvironmentJobPrepared',
    'workflowSecretsReferenced',
    'credentialValuesPrepared',
    'remoteDependenciesLoaded',
    'networkAccessActivated',
    'databaseConnectionActivated',
    'sqlExecutionActivated',
    'realtimeClientActivated',
    'stagingReadActivated',
    'stagingMutationActivated',
    'runtimePolicyChangeAuthorized',
    'productionPrepared',
    'mergePrepared'
  ];
  for (const flag of prohibited) if (input[flag] !== false) return blocked('R3X_REMOTE_SCOPE_PROHIBITED', { flag });

  const derivation = verifyAuthorizationReceiptDerivation();
  if (!derivation.phraseFingerprintMatches || !derivation.receiptIdMatches || !derivation.consumedReceiptMatches) {
    return blocked('R3X_AUTHORIZATION_DERIVATION_FAILED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_authorized_single_file_trigger_creation_ready_remote_execution_blocked',
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    authorizationPhraseFingerprint: AUTHORIZATION_PHRASE_FINGERPRINT,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
    triggerPath: TRIGGER_PATH,
    triggerContractId: TRIGGER_CONTRACT_ID,
    triggerStatus: TRIGGER_STATUS,
    repositoryTriggerLifecycleAuthority: true,
    triggerCreationAuthority: true,
    remoteExecutionAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    networkAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  PREDECESSOR_VALIDATION_ID,
  PREDECESSOR_STATUS,
  PREDECESSOR_HEAD,
  PREDECESSOR_RECERT_RUN,
  PREDECESSOR_RECERT_JOB,
  PREDECESSOR_MATRIX_RECERT_RUN,
  PREDECESSOR_MATRIX_RECERT_JOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  AUTHORIZATION_EVIDENCE_HEAD,
  AUTHORIZATION_PHRASE_FINGERPRINT,
  AUTHORIZATION_RECEIPT_ID,
  TRIGGER_PATH,
  TRIGGER_CONTRACT_ID,
  TRIGGER_STATUS,
  REMOTE_EXECUTION_BLOCK_CODE,
  assertRemoteExecutionBoundaryAbsent,
  buildAuthorizationReceipt,
  verifyAuthorizationReceiptDerivation,
  buildAuthorizedTriggerDescriptor,
  validateAuthorizedTriggerCommit,
  evaluateRepositoryReadiness
});
