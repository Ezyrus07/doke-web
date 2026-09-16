'use strict';

const crypto = require('node:crypto');
const r4a = require('./community-realtime-private-auth-r4a');
const r3z = require('./community-realtime-private-auth-r3z');
const r3y = require('./community-realtime-private-auth-r3y');
const r3v = require('./community-realtime-private-auth-r3v');
const r3k = require('./community-realtime-private-auth-r3k');

const CONTRACT_ID = 'com-b03c-r4b-phase-attributed-retry-execution-authorization-lifecycle-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4B-PHASE-ATTRIBUTED-RETRY-EXECUTION-AUTHORIZATION-LIFECYCLE-READINESS';
const STATUS = 'repository_phase_attributed_retry_execution_authorization_lifecycle_certified_authorization_absent';

const R4A_EVIDENCE_HEAD = '6affdcc7dd34166cfd8195167469de153215abd0';
const R4A_EVIDENCE_RECERT_RUN = 31484551663;
const R4A_EVIDENCE_RECERT_JOB = 93756852450;
const R4A_TRIGGER_COMMIT = '8eaa7748b79b3d1e9eda0bcc40d34c3d08d62923';
const R4A_AUTHORIZATION_RECEIPT_ID = 'fa9744fba0bc9eb51a5bcd6da6ca8c82b4c73281143ddf5713c697c0746b8b0d';
const R4A_TRIGGER_PARENT = R4A_EVIDENCE_HEAD;

const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const REQUIRED_BRANCH = r3k.REQUIRED_BRANCH;
const REQUIRED_PULL_REQUEST = r3k.REQUIRED_PULL_REQUEST;
const REQUIRED_PROJECT_ID = r3k.REQUIRED_PROJECT_ID;
const REQUIRED_PROJECT_NAME = r3k.REQUIRED_PROJECT_NAME;

const R3Z_PHASE_SEMANTICS_FINGERPRINT = r4a.PHASE_SEMANTICS_FINGERPRINT;
const FUTURE_TRIGGER_PATH = 'config/com-b03c-r4b-single-use-phase-attributed-retry-execution-trigger.json';
const TRIGGER_CONTRACT_ID = 'com-b03c-r4b-single-use-phase-attributed-retry-execution-trigger-v1';
const TRIGGER_STATUS = 'fresh_execution_authorization_consumed_execution_pending';
const AUTHORIZATION_PREFIX = 'I_EXPLICITLY_AUTHORIZE_COM_B03C_R4B_SINGLE_USE_PHASE_ATTRIBUTED_RETRY_EXECUTION_ON_DOKE_STAGING_FOR_HEAD_';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4B_FRESH_EXECUTION_AUTHORIZATION_REQUIRED';
const REPORT_SCHEMA = 'com-b03c-r4b-single-use-phase-attributed-retry-report-v1';
const AUTHORIZED_DECISION = 'authorized_for_single_use_phase_attributed_hosted_runtime_retry';

const LIFECYCLE_STATES = Object.freeze([
  'certified_execution_authorization_absent',
  'fresh_execution_authorization_received',
  'fresh_execution_authorization_consumed_trigger_pending',
  'execution_attempted_terminal_consumed',
  'cleanup_verified_terminal'
]);

const REQUIRED_TRIGGER_KEYS = Object.freeze([
  'contractId',
  'status',
  'workflowInstallHead',
  'authorizationEvidenceHead',
  'authorizationReceiptId',
  'runAttempt',
  'targetEnvironment',
  'projectId',
  'branch',
  'pullRequest',
  'r4aTriggerCommit',
  'r4aAuthorizationReceiptId',
  'r3zContractId',
  'phaseSemanticsFingerprint',
  'r3yContractId',
  'r3vContractId',
  'statementFingerprint',
  'statementCount',
  'ownershipDigest'
]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function exactArray(actual, expected) {
  return Array.isArray(actual) && JSON.stringify(actual.map(String)) === JSON.stringify(expected.map(String));
}

function exactKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function assertSha(value, code = 'R4B_CERTIFIED_LIFECYCLE_HEAD_REQUIRED') {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/.test(value)) {
    const error = new TypeError(code);
    error.code = code;
    throw error;
  }
  return value;
}

function assertReceiptId(value, code = 'R4B_AUTHORIZATION_RECEIPT_ID_REQUIRED') {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) {
    const error = new TypeError(code);
    error.code = code;
    throw error;
  }
  return value;
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'blocked_repository_only',
    reason,
    repositoryExecutionAuthorizationLifecycleAuthority: false,
    explicitExecutionAuthorizationReceived: false,
    explicitExecutionAuthorizationConsumed: false,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    networkAuthority: false,
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

function buildAuthorizationPhrase(certifiedLifecycleHead) {
  return `${AUTHORIZATION_PREFIX}${assertSha(certifiedLifecycleHead)}`;
}

function authorizationPhraseFingerprint(certifiedLifecycleHead) {
  return crypto.createHash('sha256').update(buildAuthorizationPhrase(certifiedLifecycleHead)).digest('hex');
}

function deriveAuthorizationReceiptId(certifiedLifecycleHead) {
  const head = assertSha(certifiedLifecycleHead);
  return crypto.createHash('sha256').update([
    CONTRACT_ID,
    head,
    authorizationPhraseFingerprint(head),
    REQUIRED_PROJECT_ID,
    REQUIRED_BRANCH,
    String(REQUIRED_PULL_REQUEST),
    R4A_EVIDENCE_HEAD,
    R4A_TRIGGER_COMMIT,
    R4A_AUTHORIZATION_RECEIPT_ID,
    r3z.CONTRACT_ID,
    R3Z_PHASE_SEMANTICS_FINGERPRINT,
    r3y.CONTRACT_ID,
    r3v.CONTRACT_ID
  ].join(':')).digest('hex');
}

function ownershipTokenForReceipt(receiptId) {
  return `r4b_${assertReceiptId(receiptId).slice(0, 28)}`;
}

function buildExecutionBinding(receiptId) {
  const plan = r3v.buildSingleUseExecutionPlan({ ownershipToken: ownershipTokenForReceipt(receiptId) });
  return freeze({
    r3vContractId: r3v.CONTRACT_ID,
    statementFingerprint: plan.statementFingerprint,
    statementCount: plan.statementCount,
    ownershipDigest: plan.ownershipDigest,
    rawOwnershipTokenPersisted: false
  });
}

function assertConsumedR4ATrigger(trigger = {}) {
  if (!exactKeys(trigger, r4a.REQUIRED_TRIGGER_KEYS)) {
    return blocked('R4B_R4A_TRIGGER_EXACT_SHAPE_REQUIRED');
  }
  if (
    trigger.contractId !== r4a.TRIGGER_CONTRACT_ID ||
    trigger.status !== r4a.TRIGGER_STATUS ||
    trigger.workflowInstallHead !== R4A_TRIGGER_PARENT ||
    trigger.authorizationEvidenceHead !== R4A_EVIDENCE_HEAD ||
    trigger.authorizationReceiptId !== R4A_AUTHORIZATION_RECEIPT_ID ||
    trigger.runAttempt !== 1 ||
    trigger.targetEnvironment !== 'staging' ||
    trigger.projectId !== REQUIRED_PROJECT_ID ||
    trigger.branch !== REQUIRED_BRANCH ||
    trigger.pullRequest !== REQUIRED_PULL_REQUEST ||
    trigger.r3zContractId !== r3z.CONTRACT_ID ||
    trigger.phaseSemanticsFingerprint !== R3Z_PHASE_SEMANTICS_FINGERPRINT
  ) {
    return blocked('R4B_R4A_CONSUMED_TRIGGER_CONTINUITY_REQUIRED');
  }
  return freeze({
    decision: 'r4a_consumed_trigger_continuity_verified',
    r4aTriggerCommit: R4A_TRIGGER_COMMIT,
    r4aAuthorizationReceiptId: R4A_AUTHORIZATION_RECEIPT_ID,
    phaseSemanticsFingerprint: R3Z_PHASE_SEMANTICS_FINGERPRINT,
    remoteExecutionAuthority: false
  });
}

function evaluateExplicitExecutionAuthorization(input = {}) {
  let head;
  try { head = assertSha(input.certifiedLifecycleHead); }
  catch { return blocked('R4B_CERTIFIED_LIFECYCLE_HEAD_REQUIRED'); }

  if (input.authorizationPhrase !== buildAuthorizationPhrase(head)) {
    return blocked('R4B_EXACT_HEAD_BOUND_EXECUTION_AUTHORIZATION_PHRASE_REQUIRED');
  }
  if (input.authorizationConsumed !== false || input.executionAttempted !== false) {
    return blocked('R4B_EXECUTION_AUTHORIZATION_ALREADY_CONSUMED_OR_ATTEMPTED');
  }
  if (
    input.targetEnvironment !== 'staging' ||
    input.projectId !== REQUIRED_PROJECT_ID ||
    input.branch !== REQUIRED_BRANCH ||
    input.pullRequest !== REQUIRED_PULL_REQUEST
  ) {
    return blocked('R4B_EXACT_EXECUTION_AUTHORIZATION_SCOPE_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'fresh_head_bound_execution_authorization_received_trigger_creation_only',
    lifecycleState: 'fresh_execution_authorization_received',
    certifiedLifecycleHead: head,
    authorizationPhraseFingerprint: authorizationPhraseFingerprint(head),
    authorizationReceiptId: deriveAuthorizationReceiptId(head),
    r4aTriggerCommit: R4A_TRIGGER_COMMIT,
    r4aAuthorizationReceiptId: R4A_AUTHORIZATION_RECEIPT_ID,
    r3zContractId: r3z.CONTRACT_ID,
    phaseSemanticsFingerprint: R3Z_PHASE_SEMANTICS_FINGERPRINT,
    singleUse: true,
    reusableAfterFailure: false,
    predecessorAuthorizationReusable: false,
    authorizationConsumed: false,
    executionAttempted: false,
    triggerCreationAuthority: true,
    remoteExecutionAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    networkAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function consumeExecutionAuthorizationForTrigger(receipt = {}) {
  if (
    receipt.contractId !== CONTRACT_ID ||
    receipt.decision !== 'fresh_head_bound_execution_authorization_received_trigger_creation_only' ||
    receipt.authorizationConsumed !== false ||
    receipt.executionAttempted !== false ||
    receipt.singleUse !== true ||
    receipt.reusableAfterFailure !== false ||
    receipt.r4aTriggerCommit !== R4A_TRIGGER_COMMIT ||
    receipt.r4aAuthorizationReceiptId !== R4A_AUTHORIZATION_RECEIPT_ID ||
    receipt.phaseSemanticsFingerprint !== R3Z_PHASE_SEMANTICS_FINGERPRINT
  ) return blocked('R4B_VALID_FRESH_UNCONSUMED_EXECUTION_AUTHORIZATION_RECEIPT_REQUIRED');

  return freeze({
    ...receipt,
    decision: 'fresh_execution_authorization_consumed_trigger_creation_pending',
    lifecycleState: 'fresh_execution_authorization_consumed_trigger_pending',
    authorizationConsumed: true,
    triggerCreationAuthority: true,
    remoteExecutionAuthority: false
  });
}

function buildExpectedConsumedReceipt(certifiedLifecycleHead) {
  const head = assertSha(certifiedLifecycleHead);
  return consumeExecutionAuthorizationForTrigger(evaluateExplicitExecutionAuthorization({
    certifiedLifecycleHead: head,
    authorizationPhrase: buildAuthorizationPhrase(head),
    authorizationConsumed: false,
    executionAttempted: false,
    targetEnvironment: 'staging',
    projectId: REQUIRED_PROJECT_ID,
    branch: REQUIRED_BRANCH,
    pullRequest: REQUIRED_PULL_REQUEST
  }));
}

function buildFutureExecutionTriggerDescriptor({ certifiedLifecycleHead, authorizationReceiptId } = {}) {
  const head = assertSha(certifiedLifecycleHead, 'R4B_WORKFLOW_INSTALL_HEAD_REQUIRED');
  const receiptId = assertReceiptId(authorizationReceiptId);
  if (receiptId !== deriveAuthorizationReceiptId(head)) {
    const error = new Error('R4B_AUTHORIZATION_RECEIPT_HEAD_BINDING_REQUIRED');
    error.code = 'R4B_AUTHORIZATION_RECEIPT_HEAD_BINDING_REQUIRED';
    throw error;
  }
  const binding = buildExecutionBinding(receiptId);
  return freeze({
    contractId: TRIGGER_CONTRACT_ID,
    status: TRIGGER_STATUS,
    workflowInstallHead: head,
    authorizationEvidenceHead: head,
    authorizationReceiptId: receiptId,
    runAttempt: 1,
    targetEnvironment: 'staging',
    projectId: REQUIRED_PROJECT_ID,
    branch: REQUIRED_BRANCH,
    pullRequest: REQUIRED_PULL_REQUEST,
    r4aTriggerCommit: R4A_TRIGGER_COMMIT,
    r4aAuthorizationReceiptId: R4A_AUTHORIZATION_RECEIPT_ID,
    r3zContractId: r3z.CONTRACT_ID,
    phaseSemanticsFingerprint: R3Z_PHASE_SEMANTICS_FINGERPRINT,
    r3yContractId: r3y.CONTRACT_ID,
    r3vContractId: r3v.CONTRACT_ID,
    statementFingerprint: binding.statementFingerprint,
    statementCount: binding.statementCount,
    ownershipDigest: binding.ownershipDigest
  });
}

function validateFutureExecutionTriggerCommit({ trigger, parentHead, changedFiles, runAttempt, authorizationReceipt } = {}) {
  if (!exactKeys(trigger, REQUIRED_TRIGGER_KEYS)) return blocked('R4B_EXACT_EXECUTION_TRIGGER_SHAPE_REQUIRED');
  if (trigger.contractId !== TRIGGER_CONTRACT_ID || trigger.status !== TRIGGER_STATUS) return blocked('R4B_EXECUTION_TRIGGER_CONTRACT_REQUIRED');
  if (runAttempt !== 1 || trigger.runAttempt !== 1) return blocked('R4B_RUN_ATTEMPT_ONE_REQUIRED');
  if (trigger.workflowInstallHead !== trigger.authorizationEvidenceHead || parentHead !== trigger.workflowInstallHead) {
    return blocked('R4B_EXECUTION_TRIGGER_PARENT_AND_AUTHORIZATION_HEAD_CONTINUITY_REQUIRED');
  }
  if (!exactArray(changedFiles, [FUTURE_TRIGGER_PATH])) return blocked('R4B_EXECUTION_TRIGGER_SINGLE_FILE_DELTA_REQUIRED');
  if (
    authorizationReceipt?.contractId !== CONTRACT_ID ||
    authorizationReceipt?.authorizationConsumed !== true ||
    authorizationReceipt?.executionAttempted !== false ||
    authorizationReceipt?.singleUse !== true ||
    authorizationReceipt?.reusableAfterFailure !== false ||
    authorizationReceipt?.authorizationReceiptId !== trigger.authorizationReceiptId ||
    authorizationReceipt?.certifiedLifecycleHead !== trigger.authorizationEvidenceHead
  ) return blocked('R4B_CONSUMED_EXECUTION_AUTHORIZATION_RECEIPT_CONTINUITY_REQUIRED');

  if (
    trigger.targetEnvironment !== 'staging' ||
    trigger.projectId !== REQUIRED_PROJECT_ID ||
    trigger.branch !== REQUIRED_BRANCH ||
    trigger.pullRequest !== REQUIRED_PULL_REQUEST ||
    trigger.r4aTriggerCommit !== R4A_TRIGGER_COMMIT ||
    trigger.r4aAuthorizationReceiptId !== R4A_AUTHORIZATION_RECEIPT_ID ||
    trigger.r3zContractId !== r3z.CONTRACT_ID ||
    trigger.phaseSemanticsFingerprint !== R3Z_PHASE_SEMANTICS_FINGERPRINT ||
    trigger.r3yContractId !== r3y.CONTRACT_ID ||
    trigger.r3vContractId !== r3v.CONTRACT_ID
  ) return blocked('R4B_PHASE_ATTRIBUTED_EXECUTION_BINDING_REQUIRED');

  const binding = buildExecutionBinding(trigger.authorizationReceiptId);
  if (
    trigger.statementFingerprint !== binding.statementFingerprint ||
    trigger.statementCount !== binding.statementCount ||
    trigger.ownershipDigest !== binding.ownershipDigest
  ) return blocked('R4B_R3V_EXECUTION_SQL_BINDING_REQUIRED');

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'phase_attributed_execution_trigger_valid_authority_available_for_this_attempt',
    lifecycleState: 'fresh_execution_authorization_consumed_trigger_pending',
    authorizationReceiptId: trigger.authorizationReceiptId,
    authorizationEvidenceHead: trigger.authorizationEvidenceHead,
    phaseSemanticsFingerprint: trigger.phaseSemanticsFingerprint,
    statementFingerprint: trigger.statementFingerprint,
    statementCount: trigger.statementCount,
    ownershipDigest: trigger.ownershipDigest,
    singleUse: true,
    reusableAfterFailure: false,
    runAttempt: 1,
    remoteExecutionAuthority: true,
    remoteAdapterActivationAuthority: true,
    stagingReadAuthority: true,
    stagingMutationAuthority: true,
    remoteCredentialReadAuthority: true,
    remoteDependencyLoadAuthority: true,
    networkAuthority: true,
    realtimeSubscriptionAuthority: true,
    authIdentityLifecycleAuthority: true,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function authorizeExecution(input = {}) {
  const result = validateFutureExecutionTriggerCommit(input);
  if (result.decision !== 'phase_attributed_execution_trigger_valid_authority_available_for_this_attempt') return result;
  return freeze({
    ...result,
    decision: AUTHORIZED_DECISION,
    lifecycleState: 'execution_attempted_terminal_consumed',
    executionAttempted: true,
    triggerCreationAuthority: false
  });
}

function evaluateRepositoryReadiness(input = {}) {
  const requiredTrue = [
    'r4aEvidenceHeadCertified',
    'r4aTriggerCommitPinned',
    'r4aAuthorizationConsumed',
    'r4aAuthorizationNonReusable',
    'r4aTriggerPresentAndExact',
    'r3zPhaseSemanticsPinned',
    'r3zWrapperRepositorySelfTestPrepared',
    'r3yExecutionMechanicsReused',
    'r3vSqlBindingPrepared',
    'freshExecutionAuthorizationLifecyclePrepared',
    'executionTriggerSingleFileDeltaRequired',
    'executionTriggerParentContinuityRequired',
    'runAttemptOneRequired',
    'canarySecretsOnlyAfterAuthorize',
    'canaryDependenciesOnlyAfterAuthorize',
    'sanitizedFailurePhaseReportPrepared',
    'zeroResidueCleanupPreserved',
    'repositorySelfTestPrepared',
    'noHistoricalR3yReclassification'
  ];
  for (const flag of requiredTrue) if (input[flag] !== true) return blocked('R4B_CONTROL_REQUIRED', { flag });

  const requiredFalse = [
    'freshExecutionAuthorizationReceived',
    'freshExecutionAuthorizationConsumed',
    'executionTriggerExists',
    'remoteCredentialReadExecuted',
    'remoteDependencyLoadExecuted',
    'networkExecuted',
    'databaseConnectionExecuted',
    'databaseQueryAgainstRemoteExecuted',
    'realtimeSubscriptionExecuted',
    'stagingMutationExecuted',
    'runtimePolicyChangeAuthorized',
    'productionPrepared',
    'mergePrepared'
  ];
  for (const flag of requiredFalse) if (input[flag] !== false) return blocked('R4B_REMOTE_SCOPE_PROHIBITED', { flag });

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: 'repository_phase_attributed_retry_execution_authorization_lifecycle_ready_authorization_absent',
    r4aEvidenceHead: R4A_EVIDENCE_HEAD,
    r4aTriggerCommit: R4A_TRIGGER_COMMIT,
    r4aAuthorizationReceiptId: R4A_AUTHORIZATION_RECEIPT_ID,
    r3zContractId: r3z.CONTRACT_ID,
    phaseSemanticsFingerprint: R3Z_PHASE_SEMANTICS_FINGERPRINT,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    triggerContractId: TRIGGER_CONTRACT_ID,
    authorizationPrefix: AUTHORIZATION_PREFIX,
    concreteAuthorizationPhrasePersisted: false,
    singleUse: true,
    reusableAfterFailure: false,
    predecessorAuthorizationReusable: false,
    repositoryExecutionAuthorizationLifecycleAuthority: true,
    explicitExecutionAuthorizationReceived: false,
    explicitExecutionAuthorizationConsumed: false,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

module.exports = freeze({
  CONTRACT_ID, VALIDATION_ID, STATUS,
  R4A_EVIDENCE_HEAD, R4A_EVIDENCE_RECERT_RUN, R4A_EVIDENCE_RECERT_JOB,
  R4A_TRIGGER_COMMIT, R4A_AUTHORIZATION_RECEIPT_ID, R4A_TRIGGER_PARENT,
  MATRIX_VERSION, REQUIRED_MATURITY, REQUIRED_PRODUCTION_GATE,
  REQUIRED_BRANCH, REQUIRED_PULL_REQUEST, REQUIRED_PROJECT_ID, REQUIRED_PROJECT_NAME,
  R3Z_PHASE_SEMANTICS_FINGERPRINT,
  FUTURE_TRIGGER_PATH, TRIGGER_CONTRACT_ID, TRIGGER_STATUS, AUTHORIZATION_PREFIX,
  REMOTE_EXECUTION_BLOCK_CODE, REPORT_SCHEMA, AUTHORIZED_DECISION,
  LIFECYCLE_STATES, REQUIRED_TRIGGER_KEYS,
  assertRemoteExecutionBoundaryAbsent, buildAuthorizationPhrase,
  authorizationPhraseFingerprint, deriveAuthorizationReceiptId,
  ownershipTokenForReceipt, buildExecutionBinding, assertConsumedR4ATrigger,
  evaluateExplicitExecutionAuthorization, consumeExecutionAuthorizationForTrigger,
  buildExpectedConsumedReceipt, buildFutureExecutionTriggerDescriptor,
  validateFutureExecutionTriggerCommit, authorizeExecution, evaluateRepositoryReadiness
});
