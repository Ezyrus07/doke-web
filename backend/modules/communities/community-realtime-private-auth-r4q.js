'use strict';

const crypto = require('node:crypto');
const r3v = require('./community-realtime-private-auth-r3v');
const r4o = require('./community-realtime-private-auth-r4o');
const r4p = require('./community-realtime-private-auth-r4p');

const CONTRACT_ID = 'com-b03c-r4q-hosted-phase-attributed-terminal-observation-workflow-installation-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4Q-HOSTED-PHASE-ATTRIBUTED-TERMINAL-OBSERVATION-WORKFLOW-INSTALLATION-READINESS';
const STATUS = 'repository_hosted_phase_attributed_execution_workflow_installed_certification_ready_no_current_remote_authority';
const PREDECESSOR_R4P_HEAD = '185ee09842354feabbe14bffe9f11c73e8cf3137';
const EXPECTED_R4P_EVIDENCE_STATUS = 'repository_r4o_fresh_authorization_consumed_certified_no_remote_authority';
const AUTHORIZATION_EVIDENCE_HEAD = PREDECESSOR_R4P_HEAD;
const AUTHORIZED_R4O_HEAD = r4p.R4O_CERTIFIED_HEAD;
const AUTHORIZATION_RECEIPT_ID = r4p.AUTHORIZATION_RECEIPT_ID;
const AUTHORIZATION_PHRASE_FINGERPRINT = r4p.AUTHORIZATION_PHRASE_FINGERPRINT;
const FUTURE_TRIGGER_PATH = r4o.FUTURE_TRIGGER_PATH;
const WORKFLOW_PATH = '.github/workflows/com-b03c-r4q-hosted-phase-attributed-terminal-observation-execution.yml';
const EXECUTOR_PATH = 'scripts/execute-com-b03c-r4q-single-use-phase-attributed-hosted-terminal-observation.js';
const VERIFIER_PATH = 'scripts/verify-com-b03c-r4q-single-use-phase-attributed-hosted-terminal-observation-report.js';
const REPORT_PATH = 'reports/generated/COM-B03C-R4Q-SINGLE-USE-PHASE-ATTRIBUTED-HOSTED-TERMINAL-OBSERVATION.json';
const REPORT_SCHEMA = r4o.REPORT_SCHEMA;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const AUTHORIZED_DECISION = 'authorized_for_single_use_r4q_phase_attributed_hosted_terminal_observation';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4Q_SINGLE_FILE_TRIGGER_REQUIRED';

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

function assertConsumedReceipt(receipt) {
  if (!r4p.validatePersistedReceipt(receipt)) {
    return blocked('R4Q_CERTIFIED_R4P_CONSUMED_RECEIPT_REQUIRED');
  }
  if (receipt.authorizationReceiptId !== AUTHORIZATION_RECEIPT_ID ||
      receipt.authorizationPhraseFingerprint !== AUTHORIZATION_PHRASE_FINGERPRINT ||
      receipt.authorizedHead !== AUTHORIZED_R4O_HEAD ||
      receipt.authorizationConsumed !== true || receipt.authorizationReusable !== false ||
      receipt.reusableAfterFailure !== false || receipt.executionAttempted !== false ||
      receipt.triggerCreated !== false || receipt.rawAuthorizationPhrasePersisted !== false) {
    return blocked('R4Q_R4P_RECEIPT_LINEAGE_REQUIRED');
  }
  return freeze({
    decision: 'r4q_consumed_receipt_valid_repository_only',
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    authorizedR4oHead: AUTHORIZED_R4O_HEAD,
    authorizationConsumed: true,
    authorizationReusable: false,
    reusableAfterFailure: false,
    executionAttempted: false,
    triggerCreated: false,
    remoteExecutionAuthority: false
  });
}

function ownershipTokenForReceipt(receiptId = AUTHORIZATION_RECEIPT_ID) {
  if (typeof receiptId !== 'string' || !/^[0-9a-f]{64}$/.test(receiptId)) {
    throw new TypeError('R4Q_AUTHORIZATION_RECEIPT_ID_REQUIRED');
  }
  return `r4q_${receiptId.slice(0, 28)}`;
}

function buildExecutionBinding() {
  const plan = r3v.buildSingleUseExecutionPlan({ ownershipToken: ownershipTokenForReceipt() });
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
  if (input.predecessorR4pHead !== PREDECESSOR_R4P_HEAD ||
      input.r4pContractId !== r4p.CONTRACT_ID || input.r4pValidationId !== r4p.VALIDATION_ID ||
      input.r4pEvidenceStatus !== EXPECTED_R4P_EVIDENCE_STATUS) {
    return blocked('R4Q_CERTIFIED_R4P_PREDECESSOR_REQUIRED');
  }
  const receiptCheck = assertConsumedReceipt(input.authorizationReceipt);
  if (receiptCheck.decision !== 'r4q_consumed_receipt_valid_repository_only') return receiptCheck;
  if (input.authorizationEvidenceHead !== AUTHORIZATION_EVIDENCE_HEAD ||
      input.authorizationReceiptId !== AUTHORIZATION_RECEIPT_ID ||
      input.authorizedR4oHead !== AUTHORIZED_R4O_HEAD) {
    return blocked('R4Q_AUTHORIZATION_AND_WORKFLOW_LINEAGE_SEPARATION_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION || input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('R4Q_CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (input.futureTriggerPath !== FUTURE_TRIGGER_PATH || input.workflowPath !== WORKFLOW_PATH ||
      input.executorPath !== EXECUTOR_PATH || input.verifierPath !== VERIFIER_PATH ||
      input.reportPath !== REPORT_PATH || input.reportSchema !== REPORT_SCHEMA) {
    return blocked('R4Q_HOSTED_WORKFLOW_ASSET_CONTINUITY_REQUIRED');
  }
  const required = [
    'hostedWorkflowInstalled', 'certifyAuthorizeCanaryOrderingDefined', 'pullRequestCertifyOnly',
    'pushFilteredToExactTriggerOnly', 'authorizeNeedsCertify', 'canaryNeedsAuthorize',
    'singleFileTriggerRequired', 'triggerParentMustEqualCertifiedWorkflowInstallHead',
    'runAttemptOneRequired', 'authorizationEvidenceHeadSeparatedFromWorkflowInstallHead',
    'authorizationReceiptContinuityRequired', 'phaseRegistryPreservedFromR4o',
    'phaseAttributedExecutorInstalled', 'sanitizedReportVerifierInstalled',
    'canarySecretsOnlyAfterAuthorize', 'canaryDependenciesOnlyAfterAuthorize',
    'sanitizedArtifactUploadDefined', 'cleanupRequiredAfterFutureExecution',
    'zeroResidueRequiredAfterFutureExecution', 'historicalR4oR4pUnchanged',
    'finalCertifiedHeadBecomesFutureWorkflowInstallHead'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R4Q_WORKFLOW_INSTALLATION_CONTROL_REQUIRED', { flag });
  }
  const prohibited = [
    'futureWorkflowInstallHeadMaterialized', 'triggerCreated', 'authorizationJobExecuted',
    'canaryJobExecuted', 'remoteCredentialReadExecuted', 'remoteDependencyLoadExecuted',
    'networkExecuted', 'stagingReadExecuted', 'stagingMutationExecuted',
    'realtimeSubscriptionExecuted', 'authIdentityMutationExecuted', 'runtimeChangeExecuted',
    'productionExecuted', 'mergeExecuted'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R4Q_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
  }
  if (input.r3vContractId !== EXECUTION_BINDING.r3vContractId ||
      input.statementFingerprint !== EXECUTION_BINDING.statementFingerprint ||
      input.statementCount !== EXECUTION_BINDING.statementCount ||
      input.ownershipDigest !== EXECUTION_BINDING.ownershipDigest) {
    return blocked('R4Q_PINNED_EXECUTION_BINDING_REQUIRED');
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: STATUS,
    status: STATUS,
    predecessorR4pHead: PREDECESSOR_R4P_HEAD,
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    authorizedR4oHead: AUTHORIZED_R4O_HEAD,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
    futureWorkflowInstallHead: null,
    futureWorkflowInstallHeadMaterialized: false,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    workflowPath: WORKFLOW_PATH,
    executorPath: EXECUTOR_PATH,
    verifierPath: VERIFIER_PATH,
    reportPath: REPORT_PATH,
    reportSchema: REPORT_SCHEMA,
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

function buildFutureTriggerDescriptor({ workflowInstallHead, nonce, authorizationReceipt } = {}) {
  if (!isSha(workflowInstallHead) || workflowInstallHead === AUTHORIZATION_EVIDENCE_HEAD) {
    return blocked('R4Q_DISTINCT_CERTIFIED_WORKFLOW_INSTALL_HEAD_REQUIRED');
  }
  const receiptCheck = assertConsumedReceipt(authorizationReceipt);
  if (receiptCheck.decision !== 'r4q_consumed_receipt_valid_repository_only') return receiptCheck;
  const nonceDigest = sha256(String(nonce || ''));
  if (!nonce || !/^[0-9a-f]{64}$/.test(nonceDigest)) return blocked('R4Q_TRIGGER_NONCE_REQUIRED');
  return freeze({
    executionContractId: CONTRACT_ID,
    authorizationContractId: r4p.CONTRACT_ID,
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    authorizedR4oHead: AUTHORIZED_R4O_HEAD,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
    authorizationPhraseFingerprint: AUTHORIZATION_PHRASE_FINGERPRINT,
    workflowInstallHead,
    triggerPath: FUTURE_TRIGGER_PATH,
    workflowPath: WORKFLOW_PATH,
    executorPath: EXECUTOR_PATH,
    verifierPath: VERIFIER_PATH,
    reportPath: REPORT_PATH,
    reportSchema: REPORT_SCHEMA,
    phases: [...r4o.PHASES],
    r3vContractId: EXECUTION_BINDING.r3vContractId,
    statementFingerprint: EXECUTION_BINDING.statementFingerprint,
    statementCount: EXECUTION_BINDING.statementCount,
    ownershipDigest: EXECUTION_BINDING.ownershipDigest,
    nonceDigest,
    runAttempt: 1,
    singleUse: true,
    reusableAfterFailure: false,
    rawAuthorizationPhrasePersisted: false,
    rawOwnershipTokenPersisted: false,
    rawRemoteErrorPersistenceAllowed: false
  });
}

function validateFutureTriggerCommit({
  trigger, parentHead, changedFiles, runAttempt, hostedWorkflowCertified, authorizationReceipt
} = {}) {
  if (!trigger || typeof trigger !== 'object') return blocked('R4Q_TRIGGER_REQUIRED');
  if (!isSha(parentHead) || parentHead === AUTHORIZATION_EVIDENCE_HEAD) {
    return blocked('R4Q_DISTINCT_CERTIFIED_WORKFLOW_INSTALL_HEAD_REQUIRED');
  }
  const receiptCheck = assertConsumedReceipt(authorizationReceipt);
  if (receiptCheck.decision !== 'r4q_consumed_receipt_valid_repository_only') return receiptCheck;
  const expected = {
    executionContractId: CONTRACT_ID,
    authorizationContractId: r4p.CONTRACT_ID,
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    authorizedR4oHead: AUTHORIZED_R4O_HEAD,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
    authorizationPhraseFingerprint: AUTHORIZATION_PHRASE_FINGERPRINT,
    workflowInstallHead: parentHead,
    triggerPath: FUTURE_TRIGGER_PATH,
    workflowPath: WORKFLOW_PATH,
    executorPath: EXECUTOR_PATH,
    verifierPath: VERIFIER_PATH,
    reportPath: REPORT_PATH,
    reportSchema: REPORT_SCHEMA,
    r3vContractId: EXECUTION_BINDING.r3vContractId,
    statementFingerprint: EXECUTION_BINDING.statementFingerprint,
    statementCount: EXECUTION_BINDING.statementCount,
    ownershipDigest: EXECUTION_BINDING.ownershipDigest,
    runAttempt: 1,
    singleUse: true,
    reusableAfterFailure: false,
    rawAuthorizationPhrasePersisted: false,
    rawOwnershipTokenPersisted: false,
    rawRemoteErrorPersistenceAllowed: false
  };
  for (const [key, value] of Object.entries(expected)) {
    if (trigger[key] !== value) return blocked('R4Q_TRIGGER_BINDING_REQUIRED', { field: key });
  }
  if (!Array.isArray(trigger.phases) || JSON.stringify(trigger.phases) !== JSON.stringify(r4o.PHASES)) {
    return blocked('R4Q_TRIGGER_PHASE_REGISTRY_REQUIRED');
  }
  if (typeof trigger.nonceDigest !== 'string' || !/^[0-9a-f]{64}$/.test(trigger.nonceDigest)) {
    return blocked('R4Q_TRIGGER_NONCE_DIGEST_REQUIRED');
  }
  if (hostedWorkflowCertified !== true || !Array.isArray(changedFiles) || changedFiles.length !== 1 ||
      changedFiles[0] !== FUTURE_TRIGGER_PATH || runAttempt !== 1 || parentHead !== trigger.workflowInstallHead) {
    return blocked('R4Q_SINGLE_FILE_TRIGGER_CONTINUITY_REQUIRED');
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'r4q_future_trigger_valid_authority_available_for_this_attempt',
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
    workflowInstallHead: parentHead,
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
  if (result.decision !== 'r4q_future_trigger_valid_authority_available_for_this_attempt') return result;
  return freeze({ ...result, decision: AUTHORIZED_DECISION, executionAttempted: true });
}

module.exports = freeze({
  CONTRACT_ID, VALIDATION_ID, STATUS, PREDECESSOR_R4P_HEAD, EXPECTED_R4P_EVIDENCE_STATUS,
  AUTHORIZATION_EVIDENCE_HEAD, AUTHORIZED_R4O_HEAD, AUTHORIZATION_RECEIPT_ID,
  AUTHORIZATION_PHRASE_FINGERPRINT, FUTURE_TRIGGER_PATH, WORKFLOW_PATH, EXECUTOR_PATH,
  VERIFIER_PATH, REPORT_PATH, REPORT_SCHEMA, MATRIX_VERSION, REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE, AUTHORIZED_DECISION, REMOTE_EXECUTION_BLOCK_CODE,
  EXECUTION_BINDING, isSha, sha256, assertConsumedReceipt, ownershipTokenForReceipt,
  evaluateRepositoryReadiness, buildFutureTriggerDescriptor, validateFutureTriggerCommit,
  authorizeFutureTriggerExecution, assertRemoteExecutionBoundaryAbsent
});
