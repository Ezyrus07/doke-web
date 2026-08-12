'use strict';

const r4i = require('./community-realtime-private-auth-r4i');
const r4g = require('./community-realtime-private-auth-r4g');

const CONTRACT_ID = 'com-b03c-r4j-hosted-terminal-status-observation-execution-envelope-v1';
const VALIDATION_ID = 'COM-B03C-R4J-HOSTED-TERMINAL-STATUS-OBSERVATION-EXECUTION-ENVELOPE-READINESS';
const STATUS = 'repository_hosted_terminal_status_observation_execution_envelope_ready_no_remote_authority';
const PREDECESSOR_R4I_HEAD = '1f134f087a5f6645f4c3ca86dd56e93da1c164ee';
const PREDECESSOR_R4I_RUN = 31536990588;
const PREDECESSOR_R4I_JOB = 93930332287;
const AUTHORIZATION_RECEIPT_ID = r4i.AUTHORIZATION_RECEIPT_ID;
const AUTHORIZATION_PHRASE_FINGERPRINT = r4i.AUTHORIZATION_PHRASE_FINGERPRINT;
const TARGET_BRANCH = r4i.TARGET_BRANCH;
const TARGET_PR = r4i.TARGET_PR;
const TARGET_STAGING_PROJECT = r4i.TARGET_STAGING_PROJECT;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const FUTURE_TRIGGER_PATH = 'config/com-b03c-r4j-single-use-hosted-terminal-status-observation-trigger.json';
const ENVELOPE_KIND = 'r4j_repository_hosted_terminal_status_observation_execution_envelope';
const REPORT_SCHEMA = 'com-b03c-r4j-hosted-terminal-status-observation-report-v1';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4J_REMOTE_EXECUTION_NOT_AUTHORIZED';

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function exactArray(actual, expected) {
  return Array.isArray(actual) && JSON.stringify(actual.map(String)) === JSON.stringify(expected.map(String));
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
    executionEnvelopeReady: false,
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

function assertReceipt(receipt) {
  if (!r4i.validatePersistedReceipt(receipt)) return false;
  return receipt.authorizationReceiptId === AUTHORIZATION_RECEIPT_ID &&
    receipt.authorizationPhraseFingerprint === AUTHORIZATION_PHRASE_FINGERPRINT &&
    receipt.authorizationConsumed === true &&
    receipt.authorizationReusable === false &&
    receipt.reusableAfterFailure === false &&
    receipt.executionAttempted === false &&
    receipt.triggerExists === false &&
    receipt.rawAuthorizationPhrasePersisted === false;
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorR4iHead !== PREDECESSOR_R4I_HEAD ||
      input.predecessorR4iRun !== PREDECESSOR_R4I_RUN ||
      input.predecessorR4iJob !== PREDECESSOR_R4I_JOB ||
      input.predecessorR4iSuccess !== true) {
    return blocked('R4J_CERTIFIED_R4I_EVIDENCE_HEAD_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION || input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('R4J_CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (input.targetBranch !== TARGET_BRANCH || input.targetPr !== TARGET_PR ||
      input.targetStagingProject !== TARGET_STAGING_PROJECT) {
    return blocked('R4J_TARGET_CONTINUITY_REQUIRED');
  }
  if (!assertReceipt(input.authorizationReceipt)) {
    return blocked('R4J_CERTIFIED_CONSUMED_AUTHORIZATION_RECEIPT_REQUIRED');
  }
  if (input.r4gContractId !== r4g.CONTRACT_ID || input.r4gEnvelopeKind !== r4g.ENVELOPE_KIND) {
    return blocked('R4J_R4G_TERMINAL_OBSERVATION_CONTRACT_REQUIRED');
  }
  if (input.futureTriggerPath !== FUTURE_TRIGGER_PATH || input.futureTriggerExists !== false ||
      input.futureTriggerPrepared !== false || input.separateTriggerBoundaryRequired !== true) {
    return blocked('R4J_TRIGGER_MUST_REMAIN_ABSENT');
  }
  const required = [
    'receiptBoundEnvelope',
    'terminalStatusPreserved',
    'sanitizedJoinClassificationRequired',
    'broadcastPresenceCounterCorrelationRequired',
    'singleSyntheticIdentityRequired',
    'freshRealtimeClientRequired',
    'privatePresenceOnlyChannelRequired',
    'uniqueTopicRequired',
    'rawRemoteErrorForbidden',
    'runAttemptOneRequired',
    'singleFileTriggerRequired',
    'triggerParentContinuityRequired',
    'cleanupRequiredAfterFutureExecution',
    'zeroResidueRequiredForSuccessfulFutureExecution',
    'noCausalPromotionFromTerminalStatusAlone'
  ];
  for (const flag of required) if (input[flag] !== true) return blocked('R4J_EXECUTION_ENVELOPE_CONTROL_REQUIRED', { flag });
  const prohibited = [
    'remoteCredentialReadPreparedNow',
    'remoteDependencyLoadPreparedNow',
    'networkPreparedNow',
    'stagingReadPreparedNow',
    'stagingMutationPreparedNow',
    'realtimeSubscriptionPreparedNow',
    'authIdentityLifecyclePreparedNow',
    'runtimeChangePreparedNow',
    'productionPreparedNow',
    'mergePreparedNow'
  ];
  for (const flag of prohibited) if (input[flag] !== false) return blocked('R4J_REMOTE_SCOPE_PROHIBITED', { flag });
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: STATUS,
    status: STATUS,
    envelopeKind: ENVELOPE_KIND,
    reportSchema: REPORT_SCHEMA,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
    authorizationPhraseFingerprint: AUTHORIZATION_PHRASE_FINGERPRINT,
    predecessorR4iHead: PREDECESSOR_R4I_HEAD,
    predecessorR4iRun: PREDECESSOR_R4I_RUN,
    predecessorR4iJob: PREDECESSOR_R4I_JOB,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    executionEnvelopeReady: true,
    authorizationConsumed: true,
    authorizationReusable: false,
    executionAttempted: false,
    futureTriggerExists: false,
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
    rawRemoteErrorExposed: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function buildFutureTriggerDescriptor({ workflowInstallHead, nonce } = {}) {
  if (!isSha(workflowInstallHead)) throw new TypeError('R4J_WORKFLOW_INSTALL_HEAD_REQUIRED');
  if (typeof nonce !== 'string' || !/^[a-z0-9][a-z0-9_-]{7,63}$/.test(nonce)) {
    throw new TypeError('R4J_TRIGGER_NONCE_REQUIRED');
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    envelopeKind: ENVELOPE_KIND,
    workflowInstallHead,
    predecessorR4iHead: PREDECESSOR_R4I_HEAD,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
    authorizationPhraseFingerprint: AUTHORIZATION_PHRASE_FINGERPRINT,
    targetBranch: TARGET_BRANCH,
    targetPr: TARGET_PR,
    targetStagingProject: TARGET_STAGING_PROJECT,
    expectedRunAttempt: 1,
    changedFiles: [FUTURE_TRIGGER_PATH],
    nonce,
    singleUse: true,
    reusableAfterFailure: false,
    rawAuthorizationPhrasePersisted: false,
    rawRemoteErrorExposed: false
  });
}

function validateFutureTriggerCommit({ trigger, parentHead, changedFiles, runAttempt, authorizationReceipt } = {}) {
  if (!assertReceipt(authorizationReceipt)) return blocked('R4J_CONSUMED_RECEIPT_CONTINUITY_REQUIRED');
  if (!trigger || trigger.contractId !== CONTRACT_ID || trigger.validationId !== VALIDATION_ID ||
      trigger.envelopeKind !== ENVELOPE_KIND) return blocked('R4J_TRIGGER_DESCRIPTOR_REQUIRED');
  if (!isSha(trigger.workflowInstallHead) || parentHead !== trigger.workflowInstallHead) {
    return blocked('R4J_TRIGGER_PARENT_CONTINUITY_REQUIRED');
  }
  if (trigger.predecessorR4iHead !== PREDECESSOR_R4I_HEAD ||
      trigger.authorizationReceiptId !== AUTHORIZATION_RECEIPT_ID ||
      trigger.authorizationPhraseFingerprint !== AUTHORIZATION_PHRASE_FINGERPRINT) {
    return blocked('R4J_TRIGGER_RECEIPT_BINDING_REQUIRED');
  }
  if (trigger.targetBranch !== TARGET_BRANCH || trigger.targetPr !== TARGET_PR ||
      trigger.targetStagingProject !== TARGET_STAGING_PROJECT) {
    return blocked('R4J_TRIGGER_TARGET_CONTINUITY_REQUIRED');
  }
  if (runAttempt !== 1 || trigger.expectedRunAttempt !== 1 || trigger.singleUse !== true ||
      trigger.reusableAfterFailure !== false) return blocked('R4J_SINGLE_USE_RUN_ATTEMPT_REQUIRED');
  if (!exactArray(changedFiles, [FUTURE_TRIGGER_PATH]) || !exactArray(trigger.changedFiles, [FUTURE_TRIGGER_PATH])) {
    return blocked('R4J_EXACT_SINGLE_FILE_TRIGGER_REQUIRED');
  }
  if (trigger.rawAuthorizationPhrasePersisted !== false || trigger.rawRemoteErrorExposed !== false) {
    return blocked('R4J_SANITIZED_TRIGGER_REQUIRED');
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'r4j_future_trigger_continuity_valid_repository_only',
    executionEnvelopeReady: true,
    triggerContinuityValid: true,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
    runAttempt: 1,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    rawRemoteErrorExposed: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function buildSanitizedTerminalObservation(input = {}) {
  const observation = r4g.buildTerminalObservation({
    terminalStatus: input.terminalStatus,
    subscribed: input.subscribed,
    sanitizedJoinClassification: input.sanitizedJoinClassification,
    broadcastDelta: input.broadcastDelta,
    presenceDelta: input.presenceDelta,
    rawRemoteErrorExposed: false
  });
  if (observation.rawRemoteErrorExposed !== false || observation.exactRootCauseProven !== false ||
      observation.causalPromotionAllowed !== false) throw new Error('R4J_R4G_SANITIZATION_INVARIANT_VIOLATED');
  return observation;
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  PREDECESSOR_R4I_HEAD,
  PREDECESSOR_R4I_RUN,
  PREDECESSOR_R4I_JOB,
  AUTHORIZATION_RECEIPT_ID,
  AUTHORIZATION_PHRASE_FINGERPRINT,
  TARGET_BRANCH,
  TARGET_PR,
  TARGET_STAGING_PROJECT,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  FUTURE_TRIGGER_PATH,
  ENVELOPE_KIND,
  REPORT_SCHEMA,
  REMOTE_EXECUTION_BLOCK_CODE,
  assertReceipt,
  evaluateRepositoryReadiness,
  buildFutureTriggerDescriptor,
  validateFutureTriggerCommit,
  buildSanitizedTerminalObservation,
  assertRemoteExecutionBoundaryAbsent
});
