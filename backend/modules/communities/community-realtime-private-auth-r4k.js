'use strict';

const r4j = require('./community-realtime-private-auth-r4j');

const CONTRACT_ID = 'com-b03c-r4k-r4j-lineage-reconciliation-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4K-R4J-LINEAGE-RECONCILIATION-READINESS';
const STATUS = 'repository_r4j_lineage_reconciled_no_remote_authority';
const PREDECESSOR_R4J_HEAD = '66e8b1fefdbf7fa70be3093bdcad50880a5cdf70';
const PREDECESSOR_R4J_RUN = 31549295980;
const PREDECESSOR_R4J_JOB = 93968274391;
const AUTHORIZATION_EVIDENCE_HEAD = PREDECESSOR_R4J_HEAD;
const AUTHORIZATION_RECEIPT_ID = r4j.AUTHORIZATION_RECEIPT_ID;
const AUTHORIZATION_PHRASE_FINGERPRINT = r4j.AUTHORIZATION_PHRASE_FINGERPRINT;
const FUTURE_TRIGGER_PATH = r4j.FUTURE_TRIGGER_PATH;
const TARGET_BRANCH = r4j.TARGET_BRANCH;
const TARGET_PR = r4j.TARGET_PR;
const TARGET_STAGING_PROJECT = r4j.TARGET_STAGING_PROJECT;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const LINEAGE_KIND = 'r4k_separated_authorization_evidence_and_workflow_install_head_lineage';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4K_REMOTE_EXECUTION_NOT_AUTHORIZED';

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
}

function exactArray(actual, expected) {
  return Array.isArray(actual) && JSON.stringify(actual.map(String)) === JSON.stringify(expected.map(String));
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'blocked_repository_only',
    reason,
    lineageReconciled: false,
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

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorR4jHead !== PREDECESSOR_R4J_HEAD ||
      input.predecessorR4jRun !== PREDECESSOR_R4J_RUN ||
      input.predecessorR4jJob !== PREDECESSOR_R4J_JOB ||
      input.predecessorR4jSuccess !== true) {
    return blocked('R4K_FINAL_CERTIFIED_R4J_EVIDENCE_HEAD_REQUIRED');
  }
  if (input.r4jContractId !== r4j.CONTRACT_ID ||
      input.r4jValidationId !== r4j.VALIDATION_ID ||
      input.r4jEnvelopeKind !== r4j.ENVELOPE_KIND) {
    return blocked('R4K_R4J_EXECUTION_ENVELOPE_CONTINUITY_REQUIRED');
  }
  if (input.authorizationEvidenceHead !== AUTHORIZATION_EVIDENCE_HEAD ||
      input.authorizationReceiptId !== AUTHORIZATION_RECEIPT_ID ||
      input.authorizationPhraseFingerprint !== AUTHORIZATION_PHRASE_FINGERPRINT) {
    return blocked('R4K_AUTHORIZATION_LINEAGE_CONTINUITY_REQUIRED');
  }
  if (input.futureTriggerPath !== FUTURE_TRIGGER_PATH ||
      input.targetBranch !== TARGET_BRANCH || input.targetPr !== TARGET_PR ||
      input.targetStagingProject !== TARGET_STAGING_PROJECT) {
    return blocked('R4K_TARGET_AND_TRIGGER_PATH_CONTINUITY_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION || input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('R4K_CANONICAL_MATRIX_STATE_REQUIRED');
  }

  const required = [
    'authorizationEvidenceHeadPinnedToFinalR4jHead',
    'authorizationReceiptContinuityRequired',
    'futureWorkflowInstallHeadMustBeCertifiedAfterHostedWorkflowInstall',
    'futureWorkflowInstallHeadMustDifferFromAuthorizationEvidenceHead',
    'triggerParentMustEqualFutureWorkflowInstallHead',
    'triggerMustRemainSingleFile',
    'runAttemptOneRequired',
    'r4jTriggerAbsentNow',
    'hostedWorkflowAbsentNow',
    'separateHostedWorkflowInstallBoundaryRequired',
    'separateSingleFileTriggerBoundaryRequired',
    'historicalR4jMustRemainUnchanged',
    'authorizationReuseForbidden',
    'noCausalPromotionWithoutHostedEvidence'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R4K_LINEAGE_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'futureWorkflowInstallHeadMaterialized',
    'triggerCreated',
    'pushExecutionWorkflowInstalled',
    'stagingEnvironmentPrepared',
    'remoteCredentialLoadingPrepared',
    'remoteDependencyLoadingPrepared',
    'networkPrepared',
    'stagingReadPrepared',
    'stagingMutationPrepared',
    'realtimeSubscriptionPrepared',
    'authIdentityLifecyclePrepared',
    'runtimeChangePrepared',
    'productionPrepared',
    'mergePrepared'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R4K_REMOTE_OR_FUTURE_HEAD_SCOPE_PROHIBITED', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: STATUS,
    status: STATUS,
    lineageKind: LINEAGE_KIND,
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
    authorizationPhraseFingerprint: AUTHORIZATION_PHRASE_FINGERPRINT,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    futureWorkflowInstallHead: null,
    futureWorkflowInstallHeadMaterialized: false,
    lineageReconciled: true,
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

function buildFutureExecutionLineage({ workflowInstallHead, hostedWorkflowCertified } = {}) {
  if (!isSha(workflowInstallHead)) throw new TypeError('R4K_CERTIFIED_FUTURE_WORKFLOW_INSTALL_HEAD_REQUIRED');
  if (workflowInstallHead === AUTHORIZATION_EVIDENCE_HEAD) {
    throw new Error('R4K_WORKFLOW_INSTALL_HEAD_MUST_DIFFER_FROM_AUTHORIZATION_EVIDENCE_HEAD');
  }
  if (hostedWorkflowCertified !== true) {
    throw new Error('R4K_HOSTED_WORKFLOW_CERTIFICATION_REQUIRED');
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    lineageKind: LINEAGE_KIND,
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    authorizationReceiptId: AUTHORIZATION_RECEIPT_ID,
    authorizationPhraseFingerprint: AUTHORIZATION_PHRASE_FINGERPRINT,
    workflowInstallHead,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    requiredTriggerParentHead: workflowInstallHead,
    expectedRunAttempt: 1,
    changedFiles: [FUTURE_TRIGGER_PATH],
    singleUse: true,
    reusableAfterFailure: false,
    rawAuthorizationPhrasePersisted: false,
    rawRemoteErrorExposed: false,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false
  });
}

function buildFutureTriggerLineageDescriptor({ workflowInstallHead, hostedWorkflowCertified, nonce } = {}) {
  const lineage = buildFutureExecutionLineage({ workflowInstallHead, hostedWorkflowCertified });
  const r4jTrigger = r4j.buildFutureTriggerDescriptor({ workflowInstallHead, nonce });
  return freeze({
    ...r4jTrigger,
    lineageContractId: CONTRACT_ID,
    lineageValidationId: VALIDATION_ID,
    lineageKind: LINEAGE_KIND,
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    requiredTriggerParentHead: lineage.requiredTriggerParentHead
  });
}

function validateFutureTriggerLineage({
  trigger,
  parentHead,
  changedFiles,
  runAttempt,
  hostedWorkflowCertified,
  authorizationReceipt
} = {}) {
  if (!trigger || trigger.lineageContractId !== CONTRACT_ID ||
      trigger.lineageValidationId !== VALIDATION_ID || trigger.lineageKind !== LINEAGE_KIND) {
    return blocked('R4K_TRIGGER_LINEAGE_DESCRIPTOR_REQUIRED');
  }
  if (trigger.authorizationEvidenceHead !== AUTHORIZATION_EVIDENCE_HEAD ||
      trigger.authorizationReceiptId !== AUTHORIZATION_RECEIPT_ID) {
    return blocked('R4K_TRIGGER_AUTHORIZATION_EVIDENCE_BINDING_REQUIRED');
  }
  if (hostedWorkflowCertified !== true || !isSha(trigger.workflowInstallHead) ||
      trigger.workflowInstallHead === AUTHORIZATION_EVIDENCE_HEAD ||
      parentHead !== trigger.workflowInstallHead || trigger.requiredTriggerParentHead !== parentHead) {
    return blocked('R4K_TRIGGER_WORKFLOW_INSTALL_HEAD_CONTINUITY_REQUIRED');
  }
  if (!exactArray(changedFiles, [FUTURE_TRIGGER_PATH]) || runAttempt !== 1) {
    return blocked('R4K_EXACT_SINGLE_FILE_RUN_ATTEMPT_REQUIRED');
  }
  const r4jContinuity = r4j.validateFutureTriggerCommit({
    trigger,
    parentHead,
    changedFiles,
    runAttempt,
    authorizationReceipt
  });
  if (r4jContinuity.decision !== 'r4j_future_trigger_continuity_valid_repository_only') {
    return blocked('R4K_R4J_TRIGGER_CONTINUITY_REQUIRED');
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'r4k_future_trigger_lineage_valid_repository_only',
    lineageKind: LINEAGE_KIND,
    authorizationEvidenceHead: AUTHORIZATION_EVIDENCE_HEAD,
    workflowInstallHead: trigger.workflowInstallHead,
    triggerParentHead: parentHead,
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

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  PREDECESSOR_R4J_HEAD,
  PREDECESSOR_R4J_RUN,
  PREDECESSOR_R4J_JOB,
  AUTHORIZATION_EVIDENCE_HEAD,
  AUTHORIZATION_RECEIPT_ID,
  AUTHORIZATION_PHRASE_FINGERPRINT,
  FUTURE_TRIGGER_PATH,
  TARGET_BRANCH,
  TARGET_PR,
  TARGET_STAGING_PROJECT,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  LINEAGE_KIND,
  REMOTE_EXECUTION_BLOCK_CODE,
  evaluateRepositoryReadiness,
  buildFutureExecutionLineage,
  buildFutureTriggerLineageDescriptor,
  validateFutureTriggerLineage,
  assertRemoteExecutionBoundaryAbsent
});
