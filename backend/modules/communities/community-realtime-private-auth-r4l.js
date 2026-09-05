'use strict';

const r3v = require('./community-realtime-private-auth-r3v');
const r4j = require('./community-realtime-private-auth-r4j');
const r4k = require('./community-realtime-private-auth-r4k');

const CONTRACT_ID = 'com-b03c-r4l-hosted-terminal-status-observation-workflow-installation-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4L-HOSTED-TERMINAL-STATUS-OBSERVATION-WORKFLOW-INSTALLATION-READINESS';
const STATUS = 'repository_hosted_execution_workflow_installed_certification_ready_no_current_remote_authority';
const PREDECESSOR_R4K_HEAD = '21446d7ba3d359873bb2bf491568c53178d69174';
const AUTHORIZATION_EVIDENCE_HEAD = r4k.AUTHORIZATION_EVIDENCE_HEAD;
const AUTHORIZATION_RECEIPT_ID = r4k.AUTHORIZATION_RECEIPT_ID;
const FUTURE_TRIGGER_PATH = r4k.FUTURE_TRIGGER_PATH;
const WORKFLOW_PATH = '.github/workflows/com-b03c-r4l-hosted-terminal-status-observation-execution.yml';
const EXECUTOR_PATH = 'scripts/execute-com-b03c-r4l-single-use-hosted-terminal-status-observation.js';
const VERIFIER_PATH = 'scripts/verify-com-b03c-r4l-single-use-hosted-terminal-status-observation-report.js';
const REPORT_PATH = 'reports/generated/COM-B03C-R4L-SINGLE-USE-HOSTED-TERMINAL-STATUS-OBSERVATION.json';
const REPORT_SCHEMA = 'com-b03c-r4l-single-use-hosted-terminal-status-observation-report-v1';
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const AUTHORIZED_DECISION = 'authorized_for_single_use_r4j_hosted_terminal_status_observation';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4L_SINGLE_FILE_TRIGGER_REQUIRED';

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
    hostedWorkflowInstalled: true,
    workflowCertificationReady: false,
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

function ownershipTokenForReceipt(receiptId = AUTHORIZATION_RECEIPT_ID) {
  if (typeof receiptId !== 'string' || !/^[0-9a-f]{64}$/.test(receiptId)) {
    throw new TypeError('R4L_AUTHORIZATION_RECEIPT_ID_REQUIRED');
  }
  return `r4l_${receiptId.slice(0, 28)}`;
}

function buildExecutionBinding() {
  const plan = r3v.buildSingleUseExecutionPlan({
    ownershipToken: ownershipTokenForReceipt()
  });
  return freeze({
    r3vContractId: r3v.CONTRACT_ID,
    statementFingerprint: plan.statementFingerprint,
    statementCount: plan.statementCount,
    ownershipDigest: plan.ownershipDigest,
    rawOwnershipTokenPersisted: false
  });
}

const EXECUTION_BINDING = buildExecutionBinding();

function assertRemoteExecutionBoundaryAbsent() {
  const error = new Error(REMOTE_EXECUTION_BLOCK_CODE);
  error.code = REMOTE_EXECUTION_BLOCK_CODE;
  throw error;
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorR4kHead !== PREDECESSOR_R4K_HEAD ||
      input.r4kContractId !== r4k.CONTRACT_ID || input.r4kValidationId !== r4k.VALIDATION_ID ||
      input.r4kStatus !== r4k.STATUS) {
    return blocked('R4L_CERTIFIED_R4K_PREDECESSOR_REQUIRED');
  }
  if (input.authorizationEvidenceHead !== AUTHORIZATION_EVIDENCE_HEAD ||
      input.authorizationReceiptId !== AUTHORIZATION_RECEIPT_ID) {
    return blocked('R4L_R4J_AUTHORIZATION_LINEAGE_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION || input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('R4L_CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (input.futureTriggerPath !== FUTURE_TRIGGER_PATH || input.workflowPath !== WORKFLOW_PATH ||
      input.executorPath !== EXECUTOR_PATH || input.verifierPath !== VERIFIER_PATH ||
      input.reportPath !== REPORT_PATH) {
    return blocked('R4L_HOSTED_WORKFLOW_ASSET_CONTINUITY_REQUIRED');
  }

  const required = [
    'hostedWorkflowInstalled',
    'certifyAuthorizeCanaryOrderingDefined',
    'pullRequestCertifyOnly',
    'pushFilteredToExactTriggerOnly',
    'authorizeNeedsCertify',
    'canaryNeedsAuthorize',
    'singleFileTriggerRequired',
    'triggerParentMustEqualCertifiedWorkflowInstallHead',
    'runAttemptOneRequired',
    'authorizationEvidenceHeadSeparatedFromWorkflowInstallHead',
    'authorizationReceiptContinuityRequired',
    'canarySecretsOnlyAfterAuthorize',
    'canaryDependenciesOnlyAfterAuthorize',
    'sanitizedArtifactUploadDefined',
    'cleanupRequiredAfterFutureExecution',
    'zeroResidueRequiredAfterFutureExecution',
    'historicalR4jR4kR4iR4gUnchanged',
    'finalCertifiedHeadBecomesFutureWorkflowInstallHead'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R4L_WORKFLOW_INSTALLATION_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'futureWorkflowInstallHeadMaterialized',
    'triggerCreated',
    'authorizationJobExecuted',
    'canaryJobExecuted',
    'remoteCredentialReadExecuted',
    'remoteDependencyLoadExecuted',
    'networkExecuted',
    'stagingReadExecuted',
    'stagingMutationExecuted',
    'realtimeSubscriptionExecuted',
    'authIdentityMutationExecuted',
    'runtimeChangeExecuted',
    'productionExecuted',
    'mergeExecuted'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R4L_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
  }

  if (input.r3vContractId !== EXECUTION_BINDING.r3vContractId ||
      input.statementFingerprint !== EXECUTION_BINDING.statementFingerprint ||
      input.statementCount !== EXECUTION_BINDING.statementCount ||
      input.ownershipDigest !== EXECUTION_BINDING.ownershipDigest) {
    return blocked('R4L_PINNED_EXECUTION_BINDING_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: STATUS,
    status: STATUS,
    predecessorR4kHead: PREDECESSOR_R4K_HEAD,
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
    futureWorkflowInstallHead: null,
    futureWorkflowInstallHeadMaterialized: false,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    workflowPath: WORKFLOW_PATH,
    executorPath: EXECUTOR_PATH,
    verifierPath: VERIFIER_PATH,
    reportPath: REPORT_PATH,
    hostedWorkflowInstalled: true,
    workflowCertificationReady: true,
    certifyAvailableNow: true,
    authorizeAvailableNow: false,
    canaryAvailableNow: false,
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

function buildFutureTriggerDescriptor({ workflowInstallHead, nonce, hostedWorkflowCertified } = {}) {
  const lineage = r4k.buildFutureTriggerLineageDescriptor({
    workflowInstallHead,
    nonce,
    hostedWorkflowCertified
  });
  return freeze({
    ...lineage,
    executionContractId: CONTRACT_ID,
    workflowPath: WORKFLOW_PATH,
    executorPath: EXECUTOR_PATH,
    verifierPath: VERIFIER_PATH,
    reportSchema: REPORT_SCHEMA,
    r3vContractId: EXECUTION_BINDING.r3vContractId,
    statementFingerprint: EXECUTION_BINDING.statementFingerprint,
    statementCount: EXECUTION_BINDING.statementCount,
    ownershipDigest: EXECUTION_BINDING.ownershipDigest
  });
}

function validateFutureTriggerCommit({
  trigger,
  parentHead,
  changedFiles,
  runAttempt,
  hostedWorkflowCertified,
  authorizationReceipt
} = {}) {
  if (!trigger || trigger.executionContractId !== CONTRACT_ID ||
      trigger.workflowPath !== WORKFLOW_PATH || trigger.executorPath !== EXECUTOR_PATH ||
      trigger.verifierPath !== VERIFIER_PATH || trigger.reportSchema !== REPORT_SCHEMA) {
    return blocked('R4L_TRIGGER_EXECUTION_CONTRACT_REQUIRED');
  }
  if (trigger.r3vContractId !== EXECUTION_BINDING.r3vContractId ||
      trigger.statementFingerprint !== EXECUTION_BINDING.statementFingerprint ||
      trigger.statementCount !== EXECUTION_BINDING.statementCount ||
      trigger.ownershipDigest !== EXECUTION_BINDING.ownershipDigest) {
    return blocked('R4L_TRIGGER_EXECUTION_BINDING_REQUIRED');
  }
  const continuity = r4k.validateFutureTriggerLineage({
    trigger,
    parentHead,
    changedFiles,
    runAttempt,
    hostedWorkflowCertified,
    authorizationReceipt
  });
  if (continuity.decision !== 'r4k_future_trigger_lineage_valid_repository_only') {
    return blocked('R4L_R4K_TRIGGER_LINEAGE_REQUIRED', { lineageReason: continuity.reason || null });
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'r4l_future_trigger_valid_authority_available_for_this_attempt',
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
    workflowInstallHead: trigger.workflowInstallHead,
    runAttempt: 1,
    singleUse: true,
    reusableAfterFailure: false,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: true,
    remoteCredentialReadAuthority: true,
    remoteDependencyLoadAuthority: true,
    networkAuthority: true,
    stagingReadAuthority: true,
    stagingMutationAuthority: true,
    realtimeSubscriptionAuthority: true,
    authIdentityLifecycleAuthority: true,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function authorizeFutureTriggerExecution(input = {}) {
  const result = validateFutureTriggerCommit(input);
  if (result.decision !== 'r4l_future_trigger_valid_authority_available_for_this_attempt') return result;
  return freeze({ ...result, decision: AUTHORIZED_DECISION, executionAttempted: true });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  PREDECESSOR_R4K_HEAD,
  AUTHORIZATION_EVIDENCE_HEAD,
  AUTHORIZATION_RECEIPT_ID,
  FUTURE_TRIGGER_PATH,
  WORKFLOW_PATH,
  EXECUTOR_PATH,
  VERIFIER_PATH,
  REPORT_PATH,
  REPORT_SCHEMA,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  AUTHORIZED_DECISION,
  REMOTE_EXECUTION_BLOCK_CODE,
  EXECUTION_BINDING,
  ownershipTokenForReceipt,
  evaluateRepositoryReadiness,
  buildFutureTriggerDescriptor,
  validateFutureTriggerCommit,
  authorizeFutureTriggerExecution,
  assertRemoteExecutionBoundaryAbsent
});
