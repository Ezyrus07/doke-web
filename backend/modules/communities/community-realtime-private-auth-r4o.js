'use strict';

const crypto = require('node:crypto');
const r4n = require('./community-realtime-private-auth-r4n');

const CONTRACT_ID = 'com-b03c-r4o-fresh-single-use-phase-attributed-execution-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4O-FRESH-SINGLE-USE-PHASE-ATTRIBUTED-EXECUTION-READINESS';
const STATUS = 'repository_fresh_single_use_phase_attributed_execution_ready_no_remote_authority';
const PREDECESSOR_R4N_EVIDENCE_HEAD = '125791a4de79b2e740e9b73c3b18777a5a5168e2';
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const AUTHORIZATION_PHRASE_PREFIX = 'I_EXPLICITLY_AUTHORIZE_COM_B03C_R4O_SINGLE_USE_PHASE_ATTRIBUTED_HOSTED_TERMINAL_OBSERVATION_FOR_HEAD_';
const FUTURE_AUTHORIZATION_RECEIPT_PATH = 'config/com-b03c-r4p-r4o-fresh-authorization-consumption.json';
const FUTURE_TRIGGER_PATH = 'config/com-b03c-r4o-single-use-phase-attributed-hosted-terminal-observation-trigger.json';
const WORKFLOW_PATH = '.github/workflows/com-b03c-r4o-fresh-single-use-phase-attributed-execution-readiness.yml';
const EXECUTOR_PATH = 'scripts/execute-com-b03c-r4o-phase-attributed-hosted-terminal-observation.js';
const VERIFIER_PATH = 'scripts/verify-com-b03c-r4o-phase-attributed-hosted-terminal-observation-report.js';
const REPORT_PATH = 'reports/generated/COM-B03C-R4O-PHASE-ATTRIBUTED-HOSTED-TERMINAL-OBSERVATION.json';
const REPORT_SCHEMA = 'com-b03c-r4o-phase-attributed-hosted-terminal-observation-report-v1';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4O_REMOTE_EXECUTION_NOT_AUTHORIZED';
const PHASES = Object.freeze([...r4n.PHASES]);
const OBSERVED_LAST_PROVEN_PHASE = r4n.OBSERVED_LAST_PROVEN_PHASE;
const OBSERVED_FIRST_UNPROVEN_PHASES = Object.freeze([...r4n.OBSERVED_FIRST_UNPROVEN_PHASES]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
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
    freshAuthorizationLifecycleReady: false,
    phaseAttributedExecutionEnvelopeReady: false,
    authorizationConsumptionAuthority: false,
    triggerCreationAuthority: false,
    hostedRemoteExecutionWorkflowInstalled: false,
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

function buildFreshAuthorizationRequest({ certifiedHead } = {}) {
  if (!isSha(certifiedHead)) throw new TypeError('R4O_CERTIFIED_HEAD_REQUIRED');
  const authorizationPhrase = `${AUTHORIZATION_PHRASE_PREFIX}${certifiedHead}`;
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    certifiedHead,
    authorizationPhrase,
    authorizationPhraseFingerprint: sha256(authorizationPhrase),
    singleUse: true,
    authorizationReusable: false,
    reusableAfterFailure: false,
    rawAuthorizationPhrasePersistenceAllowed: false,
    authorizationReceiptPath: FUTURE_AUTHORIZATION_RECEIPT_PATH,
    receiptMaterialized: false,
    triggerMaterialized: false,
    remoteExecutionAuthority: false
  });
}

function validateFreshAuthorizationReceipt({ receipt, certifiedHead } = {}) {
  if (!isSha(certifiedHead)) return blocked('R4O_CERTIFIED_HEAD_REQUIRED');
  if (!receipt || typeof receipt !== 'object') return blocked('R4O_FRESH_AUTHORIZATION_RECEIPT_REQUIRED');
  const request = buildFreshAuthorizationRequest({ certifiedHead });
  if (receipt.authorizationContractId !== CONTRACT_ID ||
      receipt.authorizedHead !== certifiedHead ||
      receipt.authorizationPhraseFingerprint !== request.authorizationPhraseFingerprint ||
      typeof receipt.authorizationReceiptId !== 'string' ||
      !/^[0-9a-f]{64}$/.test(receipt.authorizationReceiptId)) {
    return blocked('R4O_FRESH_AUTHORIZATION_RECEIPT_BINDING_REQUIRED');
  }
  if (receipt.authorizationConsumed !== true ||
      receipt.authorizationReusable !== false ||
      receipt.reusableAfterFailure !== false ||
      receipt.rawAuthorizationPhrasePersisted !== false ||
      receipt.executionAttempted !== false ||
      receipt.triggerCreated !== false) {
    return blocked('R4O_SINGLE_USE_AUTHORIZATION_CONSUMPTION_INVARIANTS_REQUIRED');
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'r4o_fresh_authorization_receipt_valid_repository_only',
    certifiedHead,
    authorizationReceiptId: receipt.authorizationReceiptId,
    authorizationConsumed: true,
    authorizationReusable: false,
    reusableAfterFailure: false,
    executionAttempted: false,
    triggerCreated: false,
    remoteExecutionAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function buildFutureTriggerDescriptor({ workflowInstallHead, authorizationReceipt } = {}) {
  const receiptCheck = validateFreshAuthorizationReceipt({
    receipt: authorizationReceipt,
    certifiedHead: workflowInstallHead
  });
  if (receiptCheck.decision !== 'r4o_fresh_authorization_receipt_valid_repository_only') return receiptCheck;
  return freeze({
    executionContractId: CONTRACT_ID,
    workflowInstallHead,
    authorizationReceiptId: authorizationReceipt.authorizationReceiptId,
    authorizationPhraseFingerprint: authorizationReceipt.authorizationPhraseFingerprint,
    triggerPath: FUTURE_TRIGGER_PATH,
    executorPath: EXECUTOR_PATH,
    verifierPath: VERIFIER_PATH,
    reportPath: REPORT_PATH,
    reportSchema: REPORT_SCHEMA,
    phases: PHASES,
    runAttempt: 1,
    singleUse: true,
    reusableAfterFailure: false,
    rawAuthorizationPhrasePersisted: false,
    rawRemoteErrorPersistenceAllowed: false
  });
}

function validateFutureTriggerCommit({ trigger, parentHead, changedFiles, runAttempt, authorizationReceipt } = {}) {
  if (!isSha(parentHead)) return blocked('R4O_TRIGGER_PARENT_HEAD_REQUIRED');
  const descriptor = buildFutureTriggerDescriptor({ workflowInstallHead: parentHead, authorizationReceipt });
  if (!descriptor || descriptor.executionContractId !== CONTRACT_ID) {
    return blocked('R4O_FRESH_AUTHORIZATION_RECEIPT_REQUIRED_FOR_TRIGGER');
  }
  if (!trigger || typeof trigger !== 'object') return blocked('R4O_TRIGGER_REQUIRED');
  const expected = {
    executionContractId: CONTRACT_ID,
    workflowInstallHead: parentHead,
    authorizationReceiptId: descriptor.authorizationReceiptId,
    authorizationPhraseFingerprint: descriptor.authorizationPhraseFingerprint,
    triggerPath: FUTURE_TRIGGER_PATH,
    executorPath: EXECUTOR_PATH,
    verifierPath: VERIFIER_PATH,
    reportSchema: REPORT_SCHEMA,
    runAttempt: 1,
    singleUse: true,
    reusableAfterFailure: false
  };
  for (const [key, value] of Object.entries(expected)) {
    if (trigger[key] !== value) return blocked('R4O_TRIGGER_BINDING_REQUIRED', { field: key });
  }
  if (!Array.isArray(changedFiles) || changedFiles.length !== 1 ||
      changedFiles[0] !== FUTURE_TRIGGER_PATH || runAttempt !== 1) {
    return blocked('R4O_SINGLE_FILE_TRIGGER_CONTINUITY_REQUIRED');
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'r4o_future_trigger_lineage_valid_repository_only',
    workflowInstallHead: parentHead,
    authorizationReceiptId: descriptor.authorizationReceiptId,
    runAttempt: 1,
    singleUse: true,
    reusableAfterFailure: false,
    phaseAttributedExecutionEnvelopeReady: true,
    hostedRemoteExecutionWorkflowInstalled: false,
    remoteExecutionAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorR4nEvidenceHead !== PREDECESSOR_R4N_EVIDENCE_HEAD ||
      input.r4nContractId !== r4n.CONTRACT_ID || input.r4nValidationId !== r4n.VALIDATION_ID ||
      input.r4nStatus !== r4n.STATUS) {
    return blocked('R4O_CERTIFIED_R4N_PREDECESSOR_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION || input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('R4O_CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (input.observedLastProvenPhase !== OBSERVED_LAST_PROVEN_PHASE ||
      JSON.stringify(input.observedFirstUnprovenPhases) !== JSON.stringify(OBSERVED_FIRST_UNPROVEN_PHASES) ||
      JSON.stringify(input.phases) !== JSON.stringify(PHASES)) {
    return blocked('R4O_R4N_PHASE_ATTRIBUTION_CONTINUITY_REQUIRED');
  }
  const required = [
    'freshAuthorizationRequired', 'authorizationPhraseHeadBound', 'authorizationReceiptMustBeNew',
    'authorizationSingleUse', 'authorizationNonReusableAfterFailure',
    'genericContinuationDoesNotAuthorizeRemoteExecution', 'rawAuthorizationPhrasePersistenceForbidden',
    'singleFileTriggerRequired', 'triggerParentMustEqualCertifiedR4oHead', 'runAttemptOneRequired',
    'phaseAttributedExecutorInstalled', 'sanitizedReportVerifierInstalled',
    'rawRemoteErrorPersistenceForbidden', 'cleanupRequiredForFutureRemoteAttempt',
    'zeroResidueRequiredForFutureRemoteAttempt', 'separateHostedRemoteExecutionBoundaryRequired',
    'historicalR4lR4mR4nUnchanged'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R4O_REPOSITORY_READINESS_CONTROL_REQUIRED', { flag });
  }
  const prohibited = [
    'authorizationReceiptMaterialized', 'authorizationConsumed', 'triggerCreated',
    'hostedRemoteExecutionWorkflowInstalled', 'authorizationJobExecuted', 'canaryJobExecuted',
    'remoteCredentialReadExecuted', 'remoteDependencyLoadExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'realtimeSubscriptionExecuted',
    'authIdentityMutationExecuted', 'runtimeChangeExecuted', 'productionExecuted', 'mergeExecuted'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R4O_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: STATUS,
    status: STATUS,
    predecessorR4nEvidenceHead: PREDECESSOR_R4N_EVIDENCE_HEAD,
    observedLastProvenPhase: OBSERVED_LAST_PROVEN_PHASE,
    observedFirstUnprovenPhases: OBSERVED_FIRST_UNPROVEN_PHASES,
    phases: PHASES,
    freshAuthorizationLifecycleReady: true,
    phaseAttributedExecutionEnvelopeReady: true,
    futureAuthorizationReceiptPath: FUTURE_AUTHORIZATION_RECEIPT_PATH,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    workflowPath: WORKFLOW_PATH,
    executorPath: EXECUTOR_PATH,
    verifierPath: VERIFIER_PATH,
    reportPath: REPORT_PATH,
    reportSchema: REPORT_SCHEMA,
    authorizationReceiptMaterialized: false,
    authorizationConsumed: false,
    triggerCreated: false,
    hostedRemoteExecutionWorkflowInstalled: false,
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
    causalPromotionAllowed: false
  });
}

module.exports = freeze({
  CONTRACT_ID, VALIDATION_ID, STATUS, PREDECESSOR_R4N_EVIDENCE_HEAD,
  MATRIX_VERSION, REQUIRED_MATURITY, REQUIRED_PRODUCTION_GATE,
  AUTHORIZATION_PHRASE_PREFIX, FUTURE_AUTHORIZATION_RECEIPT_PATH, FUTURE_TRIGGER_PATH,
  WORKFLOW_PATH, EXECUTOR_PATH, VERIFIER_PATH, REPORT_PATH, REPORT_SCHEMA,
  REMOTE_EXECUTION_BLOCK_CODE, PHASES, OBSERVED_LAST_PROVEN_PHASE,
  OBSERVED_FIRST_UNPROVEN_PHASES, buildFreshAuthorizationRequest,
  validateFreshAuthorizationReceipt, buildFutureTriggerDescriptor,
  validateFutureTriggerCommit, evaluateRepositoryReadiness, assertRemoteExecutionBoundaryAbsent
});
