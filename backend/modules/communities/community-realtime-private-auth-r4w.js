'use strict';

const crypto = require('node:crypto');
const r3v = require('./community-realtime-private-auth-r3v');
const r4o = require('./community-realtime-private-auth-r4o');
const r4t = require('./community-realtime-private-auth-r4t');
const r4v = require('./community-realtime-private-auth-r4v');

const CONTRACT_ID = 'com-b03c-r4w-r4v-consumed-authorization-r4t-successor-workflow-installation-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4W-R4V-CONSUMED-AUTHORIZATION-R4T-SUCCESSOR-WORKFLOW-INSTALLATION-READINESS';
const STATUS = 'repository_r4t_successor_hosted_execution_workflow_installed_certification_ready_authorization_consumed_no_current_remote_authority';

const AUTHORIZATION_EVIDENCE_HEAD = '6673c49da04658b9fc4276997a7f2a281dad8826';
const R4V_ISSUER_EVIDENCE_HEAD = '77dc1ffe672457cd19fd3f147070a9c9deee8e4d';
const AUTHORIZED_R4U_HEAD = '87e245ea2e6598014fa14f471db314f5eaa10760';
const R4T_EVIDENCE_HEAD = 'c83109ae0b193f2252423053ab0ff22a6876eb14';
const R4T_EXECUTION_SEMANTICS_FINGERPRINT = 'a3183e898ed3b34ac0055044943346f971e7249ef3d3fe5a4560d4beb9bdcd04';
const AUTHORIZATION_RECEIPT_ID = '96caa811dcd15b98d15b2cd936c7939e7c660c6cfb7efacbcf1009f2ec12d729';
const AUTHORIZATION_PHRASE_FINGERPRINT = '95863872d2fe573c17725d71c72269c92c808b7201bbb325828631d4c62ab2d6';

const FUTURE_TRIGGER_PATH = r4v.FUTURE_TRIGGER_PATH;
const WORKFLOW_PATH = '.github/workflows/com-b03c-r4w-r4t-successor-hosted-execution.yml';
const EXECUTOR_PATH = 'scripts/execute-com-b03c-r4w-single-use-r4t-successor-hosted-execution.js';
const VERIFIER_PATH = 'scripts/verify-com-b03c-r4w-single-use-r4t-successor-hosted-execution-report.js';
const REPORT_PATH = 'reports/generated/COM-B03C-R4W-SINGLE-USE-R4T-SUCCESSOR-HOSTED-EXECUTION.json';
const REPORT_SCHEMA = r4o.REPORT_SCHEMA;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const AUTHORIZED_DECISION = 'authorized_for_single_use_r4w_r4t_successor_hosted_execution';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4W_SINGLE_FILE_TRIGGER_REQUIRED';

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
  const check = r4v.validateConsumedReceiptDescriptor({
    receipt,
    issuerEvidenceHead: R4V_ISSUER_EVIDENCE_HEAD
  });
  if (check.decision !== 'consumed_r4u_bound_authorization_receipt_valid_repository_only') {
    return blocked('R4W_CERTIFIED_R4V_CONSUMED_RECEIPT_REQUIRED', {
      predecessorReason: check.reason || null
    });
  }
  if (
    receipt.issuerEvidenceHead !== R4V_ISSUER_EVIDENCE_HEAD ||
    receipt.authorizedHead !== AUTHORIZED_R4U_HEAD ||
    receipt.authorizationReceiptId !== AUTHORIZATION_RECEIPT_ID ||
    receipt.authorizationPhraseFingerprint !== AUTHORIZATION_PHRASE_FINGERPRINT ||
    receipt.predecessorR4tEvidenceHead !== R4T_EVIDENCE_HEAD ||
    receipt.r4tContractId !== r4t.CONTRACT_ID ||
    receipt.r4tExecutionSemanticsFingerprint !== R4T_EXECUTION_SEMANTICS_FINGERPRINT ||
    receipt.authorizationConsumed !== true ||
    receipt.authorizationReusable !== false ||
    receipt.reusableAfterFailure !== false ||
    receipt.rawAuthorizationPhrasePersisted !== false ||
    receipt.executionAttempted !== false ||
    receipt.triggerCreated !== false ||
    receipt.remoteExecutionAuthority !== false
  ) {
    return blocked('R4W_R4V_RECEIPT_AND_R4T_LINEAGE_REQUIRED');
  }
  return freeze({
    decision: 'r4w_consumed_receipt_valid_repository_only',
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    issuerEvidenceHead: R4V_ISSUER_EVIDENCE_HEAD,
    authorizedR4uHead: AUTHORIZED_R4U_HEAD,
    r4tEvidenceHead: R4T_EVIDENCE_HEAD,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
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
    throw new TypeError('R4W_AUTHORIZATION_RECEIPT_ID_REQUIRED');
  }
  return `r4w_${receiptId.slice(0, 28)}`;
}

function buildExecutionBinding() {
  const plan = r3v.buildSingleUseExecutionPlan({ ownershipToken: ownershipTokenForReceipt() });
  return freeze({
    r3vContractId: r3v.CONTRACT_ID,
    r4tContractId: r4t.CONTRACT_ID,
    r4tExecutionSemanticsFingerprint: R4T_EXECUTION_SEMANTICS_FINGERPRINT,
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
  if (
    input.authorizationEvidenceHead !== AUTHORIZATION_EVIDENCE_HEAD ||
    input.r4vIssuerEvidenceHead !== R4V_ISSUER_EVIDENCE_HEAD ||
    input.authorizedR4uHead !== AUTHORIZED_R4U_HEAD ||
    input.r4tEvidenceHead !== R4T_EVIDENCE_HEAD ||
    input.r4tContractId !== r4t.CONTRACT_ID ||
    input.r4tExecutionSemanticsFingerprint !== R4T_EXECUTION_SEMANTICS_FINGERPRINT
  ) {
    return blocked('R4W_CERTIFIED_AUTHORIZATION_AND_R4T_PREDECESSOR_REQUIRED');
  }
  const receiptCheck = assertConsumedReceipt(input.authorizationReceipt);
  if (receiptCheck.decision !== 'r4w_consumed_receipt_valid_repository_only') return receiptCheck;
  if (input.matrixVersion !== MATRIX_VERSION || input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('R4W_CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (
    input.futureTriggerPath !== FUTURE_TRIGGER_PATH ||
    input.workflowPath !== WORKFLOW_PATH ||
    input.executorPath !== EXECUTOR_PATH ||
    input.verifierPath !== VERIFIER_PATH ||
    input.reportPath !== REPORT_PATH ||
    input.reportSchema !== REPORT_SCHEMA
  ) {
    return blocked('R4W_HOSTED_WORKFLOW_ASSET_CONTINUITY_REQUIRED');
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
    'r4tSuccessorExecutorInstalled',
    'r4cCodecBeforeR3vAdapterRequired',
    'r4sCleanupPlanRequired',
    'phaseAttributedObservationPreserved',
    'sanitizedReportVerifierInstalled',
    'canarySecretsOnlyAfterAuthorize',
    'canaryDependenciesOnlyAfterAuthorize',
    'sanitizedArtifactUploadDefined',
    'cleanupRequiredAfterFutureExecution',
    'zeroResidueRequiredAfterFutureExecution',
    'historicalR4tR4vR4uR4qUnchanged',
    'finalCertifiedHeadBecomesFutureWorkflowInstallHead'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R4W_WORKFLOW_INSTALLATION_CONTROL_REQUIRED', { flag });
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
    if (input[flag] !== false) return blocked('R4W_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
  }

  if (
    input.r3vContractId !== EXECUTION_BINDING.r3vContractId ||
    input.executionBindingR4tContractId !== EXECUTION_BINDING.r4tContractId ||
    input.statementFingerprint !== EXECUTION_BINDING.statementFingerprint ||
    input.statementCount !== EXECUTION_BINDING.statementCount ||
    input.ownershipDigest !== EXECUTION_BINDING.ownershipDigest
  ) {
    return blocked('R4W_PINNED_SUCCESSOR_EXECUTION_BINDING_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: STATUS,
    status: STATUS,
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    r4vIssuerEvidenceHead: R4V_ISSUER_EVIDENCE_HEAD,
    authorizedR4uHead: AUTHORIZED_R4U_HEAD,
    r4tEvidenceHead: R4T_EVIDENCE_HEAD,
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
    return blocked('R4W_DISTINCT_CERTIFIED_WORKFLOW_INSTALL_HEAD_REQUIRED');
  }
  const receiptCheck = assertConsumedReceipt(authorizationReceipt);
  if (receiptCheck.decision !== 'r4w_consumed_receipt_valid_repository_only') return receiptCheck;
  if (!nonce) return blocked('R4W_TRIGGER_NONCE_REQUIRED');
  const nonceDigest = sha256(String(nonce));
  return freeze({
    executionContractId: CONTRACT_ID,
    authorizationContractId: r4v.CONTRACT_ID,
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    r4vIssuerEvidenceHead: R4V_ISSUER_EVIDENCE_HEAD,
    authorizedR4uHead: AUTHORIZED_R4U_HEAD,
    r4tEvidenceHead: R4T_EVIDENCE_HEAD,
    r4tContractId: r4t.CONTRACT_ID,
    r4tExecutionSemanticsFingerprint: R4T_EXECUTION_SEMANTICS_FINGERPRINT,
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
  trigger,
  parentHead,
  changedFiles,
  runAttempt,
  hostedWorkflowCertified,
  authorizationReceipt
} = {}) {
  if (!trigger || typeof trigger !== 'object') return blocked('R4W_TRIGGER_REQUIRED');
  if (!isSha(parentHead) || parentHead === AUTHORIZATION_EVIDENCE_HEAD) {
    return blocked('R4W_DISTINCT_CERTIFIED_WORKFLOW_INSTALL_HEAD_REQUIRED');
  }
  const receiptCheck = assertConsumedReceipt(authorizationReceipt);
  if (receiptCheck.decision !== 'r4w_consumed_receipt_valid_repository_only') return receiptCheck;

  const expected = {
    executionContractId: CONTRACT_ID,
    authorizationContractId: r4v.CONTRACT_ID,
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    r4vIssuerEvidenceHead: R4V_ISSUER_EVIDENCE_HEAD,
    authorizedR4uHead: AUTHORIZED_R4U_HEAD,
    r4tEvidenceHead: R4T_EVIDENCE_HEAD,
    r4tContractId: r4t.CONTRACT_ID,
    r4tExecutionSemanticsFingerprint: R4T_EXECUTION_SEMANTICS_FINGERPRINT,
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
    if (trigger[key] !== value) return blocked('R4W_TRIGGER_BINDING_REQUIRED', { field: key });
  }
  if (!Array.isArray(trigger.phases) || JSON.stringify(trigger.phases) !== JSON.stringify(r4o.PHASES)) {
    return blocked('R4W_TRIGGER_PHASE_REGISTRY_REQUIRED');
  }
  if (typeof trigger.nonceDigest !== 'string' || !/^[0-9a-f]{64}$/.test(trigger.nonceDigest)) {
    return blocked('R4W_TRIGGER_NONCE_DIGEST_REQUIRED');
  }
  if (
    hostedWorkflowCertified !== true ||
    !Array.isArray(changedFiles) ||
    changedFiles.length !== 1 ||
    changedFiles[0] !== FUTURE_TRIGGER_PATH ||
    runAttempt !== 1 ||
    parentHead !== trigger.workflowInstallHead
  ) {
    return blocked('R4W_SINGLE_FILE_TRIGGER_CONTINUITY_REQUIRED');
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'r4w_future_trigger_valid_authority_available_for_this_attempt',
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
    r4tEvidenceHead: R4T_EVIDENCE_HEAD,
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
  if (result.decision !== 'r4w_future_trigger_valid_authority_available_for_this_attempt') return result;
  return freeze({ ...result, decision: AUTHORIZED_DECISION, executionAttempted: true });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  AUTHORIZATION_EVIDENCE_HEAD,
  R4V_ISSUER_EVIDENCE_HEAD,
  AUTHORIZED_R4U_HEAD,
  R4T_EVIDENCE_HEAD,
  R4T_EXECUTION_SEMANTICS_FINGERPRINT,
  AUTHORIZATION_RECEIPT_ID,
  AUTHORIZATION_PHRASE_FINGERPRINT,
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
  assertConsumedReceipt,
  ownershipTokenForReceipt,
  buildExecutionBinding,
  assertRemoteExecutionBoundaryAbsent,
  evaluateRepositoryReadiness,
  buildFutureTriggerDescriptor,
  validateFutureTriggerCommit,
  authorizeFutureTriggerExecution
});
