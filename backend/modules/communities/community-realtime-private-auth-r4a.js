'use strict';

const crypto = require('node:crypto');
const r3z = require('./community-realtime-private-auth-r3z');
const r3k = require('./community-realtime-private-auth-r3k');

const CONTRACT_ID =
  'com-b03c-r4a-head-bound-single-use-phase-attributed-retry-authorization-lifecycle-readiness-v1';
const VALIDATION_ID =
  'COM-B03C-R4A-HEAD-BOUND-SINGLE-USE-PHASE-ATTRIBUTED-RETRY-AUTHORIZATION-LIFECYCLE-READINESS';
const STATUS =
  'repository_head_bound_single_use_phase_attributed_retry_authorization_lifecycle_certified_authorization_absent';

const PREDECESSOR_VALIDATION_ID = r3z.VALIDATION_ID;
const PREDECESSOR_STATUS = r3z.STATUS;
const PREDECESSOR_HEAD = 'bb00e1b347c0da68b7d683d734ef81eef32bcf22';
const PREDECESSOR_RECERT_RUN = 31450374755;
const PREDECESSOR_RECERT_JOB = 93653337857;
const PREDECESSOR_NORMAL_HEAD = '32e574c5759439172f034b971e91332d45504d48';
const PREDECESSOR_MATRIX_RUN = 31450164801;
const PREDECESSOR_MATRIX_JOB = 93652714258;

const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';

const REQUIRED_BRANCH = r3k.REQUIRED_BRANCH;
const REQUIRED_PULL_REQUEST = r3k.REQUIRED_PULL_REQUEST;
const REQUIRED_PROJECT_ID = r3k.REQUIRED_PROJECT_ID;
const REQUIRED_PROJECT_NAME = r3k.REQUIRED_PROJECT_NAME;

const FUTURE_TRIGGER_PATH =
  'config/com-b03c-r4a-single-use-phase-attributed-retry-trigger.json';
const TRIGGER_CONTRACT_ID =
  'com-b03c-r4a-single-use-phase-attributed-retry-trigger-v1';
const TRIGGER_STATUS =
  'fresh_retry_authorization_consumed_execution_not_authorized';
const AUTHORIZATION_PREFIX =
  'I_EXPLICITLY_AUTHORIZE_COM_B03C_R4A_SINGLE_USE_PHASE_ATTRIBUTED_RETRY_TRIGGER_CREATION_FOR_HEAD_';
const REMOTE_EXECUTION_BLOCK_CODE =
  'DOKE_COM_B03C_R4A_REMOTE_EXECUTION_BOUNDARY_REQUIRED';

const LIFECYCLE_STATES = Object.freeze([
  'certified_retry_authorization_absent',
  'explicit_retry_authorization_received',
  'retry_authorization_consumed_trigger_creation_pending',
  'retry_trigger_created_terminal_consumed'
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
  'r3zContractId',
  'phaseSemanticsFingerprint'
]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function exactArray(actual, expected) {
  return Array.isArray(actual) &&
    JSON.stringify(actual.map(String)) === JSON.stringify(expected.map(String));
}

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) ===
    JSON.stringify([...expected].sort());
}

function assertSha(value, code = 'R4A_CERTIFIED_EVIDENCE_HEAD_REQUIRED') {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/.test(value)) {
    const error = new TypeError(code);
    error.code = code;
    throw error;
  }
  return value;
}

function assertReceiptId(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) {
    const error = new TypeError('R4A_AUTHORIZATION_RECEIPT_ID_REQUIRED');
    error.code = 'R4A_AUTHORIZATION_RECEIPT_ID_REQUIRED';
    throw error;
  }
  return value;
}

function buildPhaseSemanticsFingerprint() {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      phases: r3z.PREINSTALL_PHASES,
      codes: r3z.PHASE_FAILURE_CODES
    }))
    .digest('hex');
}

const PHASE_SEMANTICS_FINGERPRINT = buildPhaseSemanticsFingerprint();

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'blocked_repository_only',
    reason,
    repositoryAuthorizationLifecycleAuthority: false,
    explicitAuthorizationReceived: false,
    explicitAuthorizationConsumed: false,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false,
    remoteAdapterActivationAuthority: false,
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
  return crypto
    .createHash('sha256')
    .update(buildAuthorizationPhrase(certifiedLifecycleHead))
    .digest('hex');
}

function deriveAuthorizationReceiptId(certifiedLifecycleHead) {
  const head = assertSha(certifiedLifecycleHead);
  return crypto
    .createHash('sha256')
    .update([
      CONTRACT_ID,
      head,
      authorizationPhraseFingerprint(head),
      REQUIRED_PROJECT_ID,
      REQUIRED_BRANCH,
      String(REQUIRED_PULL_REQUEST),
      r3z.CONTRACT_ID,
      PHASE_SEMANTICS_FINGERPRINT
    ].join(':'))
    .digest('hex');
}

function evaluateExplicitAuthorization(input = {}) {
  let head;
  try {
    head = assertSha(input.certifiedLifecycleHead);
  } catch {
    return blocked('R4A_CERTIFIED_LIFECYCLE_HEAD_REQUIRED');
  }

  if (input.authorizationPhrase !== buildAuthorizationPhrase(head)) {
    return blocked('R4A_EXACT_HEAD_BOUND_AUTHORIZATION_PHRASE_REQUIRED');
  }
  if (
    input.authorizationConsumed !== false ||
    input.triggerCreated !== false ||
    input.previousR3yAuthorizationReusable !== false
  ) {
    return blocked('R4A_FRESH_NON_REUSED_AUTHORIZATION_REQUIRED');
  }
  if (
    input.targetEnvironment !== 'staging' ||
    input.projectId !== REQUIRED_PROJECT_ID ||
    input.branch !== REQUIRED_BRANCH ||
    input.pullRequest !== REQUIRED_PULL_REQUEST
  ) {
    return blocked('R4A_EXACT_AUTHORIZATION_SCOPE_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision:
      'head_bound_single_use_phase_attributed_retry_authorization_received_trigger_creation_only',
    lifecycleState: 'explicit_retry_authorization_received',
    certifiedLifecycleHead: head,
    authorizationPhraseFingerprint: authorizationPhraseFingerprint(head),
    authorizationReceiptId: deriveAuthorizationReceiptId(head),
    r3zContractId: r3z.CONTRACT_ID,
    phaseSemanticsFingerprint: PHASE_SEMANTICS_FINGERPRINT,
    singleUse: true,
    reusableAfterFailure: false,
    previousR3yAuthorizationReusable: false,
    authorizationConsumed: false,
    triggerCreated: false,
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

function consumeAuthorizationForTrigger(receipt = {}) {
  if (
    receipt.decision !==
      'head_bound_single_use_phase_attributed_retry_authorization_received_trigger_creation_only' ||
    receipt.authorizationConsumed !== false ||
    receipt.triggerCreated !== false ||
    receipt.singleUse !== true ||
    receipt.reusableAfterFailure !== false ||
    receipt.previousR3yAuthorizationReusable !== false ||
    receipt.r3zContractId !== r3z.CONTRACT_ID ||
    receipt.phaseSemanticsFingerprint !== PHASE_SEMANTICS_FINGERPRINT
  ) {
    return blocked('R4A_VALID_UNCONSUMED_PHASE_BOUND_RECEIPT_REQUIRED');
  }

  return freeze({
    ...receipt,
    decision: 'retry_authorization_consumed_trigger_creation_pending',
    lifecycleState: 'retry_authorization_consumed_trigger_creation_pending',
    authorizationConsumed: true,
    triggerCreationAuthority: true,
    remoteExecutionAuthority: false
  });
}

function buildFutureTriggerDescriptor({
  workflowInstallHead,
  authorizationEvidenceHead,
  authorizationReceiptId
} = {}) {
  const installHead = assertSha(
    workflowInstallHead,
    'R4A_WORKFLOW_INSTALL_HEAD_REQUIRED'
  );
  const evidenceHead = assertSha(
    authorizationEvidenceHead,
    'R4A_AUTHORIZATION_EVIDENCE_HEAD_REQUIRED'
  );
  const receiptId = assertReceiptId(authorizationReceiptId);

  return freeze({
    contractId: TRIGGER_CONTRACT_ID,
    status: TRIGGER_STATUS,
    workflowInstallHead: installHead,
    authorizationEvidenceHead: evidenceHead,
    authorizationReceiptId: receiptId,
    runAttempt: 1,
    targetEnvironment: 'staging',
    projectId: REQUIRED_PROJECT_ID,
    branch: REQUIRED_BRANCH,
    pullRequest: REQUIRED_PULL_REQUEST,
    r3zContractId: r3z.CONTRACT_ID,
    phaseSemanticsFingerprint: PHASE_SEMANTICS_FINGERPRINT
  });
}

function validateFutureTriggerCommit(input = {}) {
  const trigger = input.trigger;
  if (!exactKeys(trigger, REQUIRED_TRIGGER_KEYS)) {
    return blocked('R4A_EXACT_TRIGGER_SHAPE_REQUIRED');
  }
  if (
    trigger.contractId !== TRIGGER_CONTRACT_ID ||
    trigger.status !== TRIGGER_STATUS
  ) {
    return blocked('R4A_TRIGGER_CONTRACT_REQUIRED');
  }
  if (input.runAttempt !== 1 || trigger.runAttempt !== 1) {
    return blocked('R4A_RUN_ATTEMPT_ONE_REQUIRED');
  }
  if (input.parentHead !== trigger.workflowInstallHead) {
    return blocked('R4A_TRIGGER_PARENT_CONTINUITY_REQUIRED');
  }
  if (!exactArray(input.changedFiles, [FUTURE_TRIGGER_PATH])) {
    return blocked('R4A_TRIGGER_SINGLE_FILE_DELTA_REQUIRED');
  }
  if (
    input.authorizationReceipt?.authorizationConsumed !== true ||
    input.authorizationReceipt?.triggerCreated !== false ||
    input.authorizationReceipt?.authorizationReceiptId !==
      trigger.authorizationReceiptId ||
    input.authorizationReceipt?.certifiedLifecycleHead !==
      trigger.authorizationEvidenceHead ||
    input.authorizationReceipt?.previousR3yAuthorizationReusable !== false ||
    input.authorizationReceipt?.r3zContractId !== r3z.CONTRACT_ID ||
    input.authorizationReceipt?.phaseSemanticsFingerprint !==
      PHASE_SEMANTICS_FINGERPRINT
  ) {
    return blocked('R4A_CONSUMED_PHASE_BOUND_RECEIPT_CONTINUITY_REQUIRED');
  }
  if (
    trigger.targetEnvironment !== 'staging' ||
    trigger.projectId !== REQUIRED_PROJECT_ID ||
    trigger.branch !== REQUIRED_BRANCH ||
    trigger.pullRequest !== REQUIRED_PULL_REQUEST
  ) {
    return blocked('R4A_TRIGGER_SCOPE_REQUIRED');
  }
  if (
    trigger.r3zContractId !== r3z.CONTRACT_ID ||
    trigger.phaseSemanticsFingerprint !== PHASE_SEMANTICS_FINGERPRINT
  ) {
    return blocked('R4A_R3Z_PHASE_SEMANTICS_BINDING_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision:
      'future_phase_attributed_retry_trigger_shape_valid_remote_execution_still_separately_blocked',
    lifecycleState: 'retry_authorization_consumed_trigger_creation_pending',
    triggerPath: FUTURE_TRIGGER_PATH,
    triggerContractId: TRIGGER_CONTRACT_ID,
    r3zContractId: r3z.CONTRACT_ID,
    phaseSemanticsFingerprint: PHASE_SEMANTICS_FINGERPRINT,
    runAttempt: 1,
    authorizationConsumed: true,
    previousR3yAuthorizationReusable: false,
    triggerCreationAuthority: true,
    remoteExecutionAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    networkAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) {
    return blocked('R4A_R3Z_VALIDATION_REQUIRED');
  }
  if (input.predecessorStatus !== PREDECESSOR_STATUS) {
    return blocked('R4A_R3Z_CERTIFIED_STATUS_REQUIRED');
  }
  if (input.predecessorHead !== PREDECESSOR_HEAD) {
    return blocked('R4A_R3Z_EVIDENCE_HEAD_REQUIRED');
  }
  if (
    input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN ||
    input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB ||
    input.predecessorRecertSuccess !== true
  ) {
    return blocked('R4A_R3Z_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (
    input.predecessorNormalHead !== PREDECESSOR_NORMAL_HEAD ||
    input.predecessorMatrixRun !== PREDECESSOR_MATRIX_RUN ||
    input.predecessorMatrixJob !== PREDECESSOR_MATRIX_JOB ||
    input.predecessorMatrixSuccess !== true ||
    input.predecessorEvidenceHeadMatrixAuditPassed !== true
  ) {
    return blocked('R4A_R3Z_MATRIX_CONTINUITY_REQUIRED');
  }
  if (
    input.matrixVersion !== MATRIX_VERSION ||
    input.maturity !== REQUIRED_MATURITY ||
    input.productionGate !== REQUIRED_PRODUCTION_GATE
  ) {
    return blocked('R4A_CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (
    input.r3zContractId !== r3z.CONTRACT_ID ||
    input.phaseSemanticsFingerprint !== PHASE_SEMANTICS_FINGERPRINT ||
    input.futureTriggerPath !== FUTURE_TRIGGER_PATH ||
    input.triggerContractId !== TRIGGER_CONTRACT_ID ||
    !exactArray(input.lifecycleStates, LIFECYCLE_STATES) ||
    !exactArray(input.requiredTriggerKeys, REQUIRED_TRIGGER_KEYS)
  ) {
    return blocked('R4A_LIFECYCLE_CONTRACT_CONTINUITY_REQUIRED');
  }

  const required = [
    'predecessorEvidencePinned',
    'historicalR3yFailureRemainsUnattributed',
    'exactThreePhaseAttributionRequired',
    'phaseFailureCodesPinned',
    'phaseSemanticsFingerprintPrepared',
    'headBoundAuthorizationPhraseFactoryPrepared',
    'concreteAuthorizationPhraseNotPersisted',
    'authorizationPhraseFingerprintPrepared',
    'singleUseAuthorizationReceiptPrepared',
    'receiptBindsR3zPhaseSemantics',
    'receiptConsumptionTransitionPrepared',
    'secondConsumptionRejected',
    'reuseAfterFailureRejected',
    'previousR3yAuthorizationReuseRejected',
    'futureTriggerDescriptorPrepared',
    'triggerSingleFileDeltaRequired',
    'triggerParentHeadContinuityRequired',
    'runAttemptOneRequired',
    'authorizationReceiptContinuityRequired',
    'ordinaryPullRequestRemoteJobsAbsent',
    'workflowPushTriggerAbsent',
    'workflowEnvironmentAbsent',
    'workflowSecretsAbsent',
    'repositorySelfTestPrepared',
    'failClosedCasesCovered',
    'noRemoteExecutionAuthority',
    'noCausalPromotionWithoutRemoteObservation'
  ];
  for (const flag of required) {
    if (input[flag] !== true) {
      return blocked('R4A_LIFECYCLE_CONTROL_REQUIRED', { flag });
    }
  }

  const prohibited = [
    'authorizationPhraseReceived',
    'authorizationPhraseConsumed',
    'triggerExists',
    'triggerFilePrepared',
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
    'authIdentityMutationActivated',
    'runtimePolicyChangeAuthorized',
    'runtimeDeployPrepared',
    'productionPrepared',
    'mergePrepared'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) {
      return blocked('R4A_REMOTE_SCOPE_PROHIBITED', { flag });
    }
  }

  if (
    r3z.REMOTE_EXECUTION_BLOCK_CODE !==
    'DOKE_COM_B03C_R3Z_REMOTE_EXECUTION_AUTHORIZATION_BOUNDARY_REQUIRED'
  ) {
    return blocked('R4A_R3Z_REMOTE_HARD_BLOCK_CONTINUITY_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision:
      'repository_head_bound_single_use_phase_attributed_retry_authorization_lifecycle_ready_authorization_absent',
    reason: null,
    predecessorContractId: r3z.CONTRACT_ID,
    predecessorEvidenceHead: PREDECESSOR_HEAD,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    triggerContractId: TRIGGER_CONTRACT_ID,
    triggerStatus: TRIGGER_STATUS,
    lifecycleStates: LIFECYCLE_STATES,
    phaseSemanticsFingerprint: PHASE_SEMANTICS_FINGERPRINT,
    authorizationPhraseMode: 'derived_from_future_certified_r4a_evidence_head',
    authorizationPrefix: AUTHORIZATION_PREFIX,
    concreteAuthorizationPhrasePersisted: false,
    singleUse: true,
    reusableAfterFailure: false,
    previousR3yAuthorizationReusable: false,
    runAttemptMustBeOne: true,
    repositoryAuthorizationLifecycleAuthority: true,
    explicitAuthorizationReceived: false,
    explicitAuthorizationConsumed: false,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false,
    remoteAdapterActivationAuthority: false,
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
    nextBoundaryRequirement:
      'After R4A evidence-head certification, request a new exact head-bound authorization phrase. That phrase may authorize only a future one-file trigger creation bound to the R3Z phase semantics; remote execution remains separately blocked until a later executable boundary is certified.'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  PREDECESSOR_VALIDATION_ID,
  PREDECESSOR_STATUS,
  PREDECESSOR_HEAD,
  PREDECESSOR_RECERT_RUN,
  PREDECESSOR_RECERT_JOB,
  PREDECESSOR_NORMAL_HEAD,
  PREDECESSOR_MATRIX_RUN,
  PREDECESSOR_MATRIX_JOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  REQUIRED_BRANCH,
  REQUIRED_PULL_REQUEST,
  REQUIRED_PROJECT_ID,
  REQUIRED_PROJECT_NAME,
  FUTURE_TRIGGER_PATH,
  TRIGGER_CONTRACT_ID,
  TRIGGER_STATUS,
  AUTHORIZATION_PREFIX,
  REMOTE_EXECUTION_BLOCK_CODE,
  LIFECYCLE_STATES,
  REQUIRED_TRIGGER_KEYS,
  PHASE_SEMANTICS_FINGERPRINT,
  buildPhaseSemanticsFingerprint,
  assertRemoteExecutionBoundaryAbsent,
  buildAuthorizationPhrase,
  authorizationPhraseFingerprint,
  deriveAuthorizationReceiptId,
  evaluateExplicitAuthorization,
  consumeAuthorizationForTrigger,
  buildFutureTriggerDescriptor,
  validateFutureTriggerCommit,
  evaluateRepositoryReadiness
});
