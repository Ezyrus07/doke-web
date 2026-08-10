'use strict';

const crypto = require('node:crypto');
const r3v = require('./community-realtime-private-auth-r3v');
const r3k = require('./community-realtime-private-auth-r3k');

const CONTRACT_ID = 'com-b03c-r3w-head-bound-single-use-staging-authorization-lifecycle-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R3W-HEAD-BOUND-SINGLE-USE-STAGING-AUTHORIZATION-LIFECYCLE-READINESS';
const PREDECESSOR_VALIDATION_ID = r3v.VALIDATION_ID;
const PREDECESSOR_STATUS = 'repository_single_use_remote_execution_envelope_certified_no_remote_authority';
const PREDECESSOR_HEAD = '4816bc197fd167d61abe3dd5e3952fc14d406faf';
const PREDECESSOR_RECERT_RUN = 31428556908;
const PREDECESSOR_RECERT_JOB = 93586058536;
const PREDECESSOR_MATRIX_RECERT_RUN = 31428559238;
const PREDECESSOR_MATRIX_RECERT_JOB = 93586061213;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';

const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const REQUIRED_PROJECT_ID = r3k.REQUIRED_PROJECT_ID;
const REQUIRED_PROJECT_NAME = r3k.REQUIRED_PROJECT_NAME;

const FUTURE_TRIGGER_PATH =
  'config/com-b03c-r3w-single-use-staging-authorization-trigger.json';
const TRIGGER_CONTRACT_ID =
  'com-b03c-r3w-single-use-staging-authorization-trigger-v1';
const TRIGGER_STATUS = 'authorization_consumed_execution_pending';
const AUTHORIZATION_PREFIX =
  'I_EXPLICITLY_AUTHORIZE_COM_B03C_R3V_SINGLE_USE_HOSTED_RUNTIME_OBSERVATION_ON_DOKE_STAGING_FOR_HEAD_';
const REMOTE_EXECUTION_BLOCK_CODE =
  'DOKE_COM_B03C_R3W_NEW_HEAD_BOUND_SINGLE_USE_AUTHORIZATION_REQUIRED';

const LIFECYCLE_STATES = Object.freeze([
  'certified_authorization_absent',
  'explicit_authorization_received',
  'authorization_consumed_trigger_creation_pending',
  'execution_attempted_terminal_consumed'
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
  'pullRequest'
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
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function assertSha(value, code = 'R3W_CERTIFIED_EVIDENCE_HEAD_REQUIRED') {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/.test(value)) {
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
  const head = assertSha(certifiedLifecycleHead);
  return `${AUTHORIZATION_PREFIX}${head}`;
}

function authorizationPhraseFingerprint(certifiedLifecycleHead) {
  return crypto
    .createHash('sha256')
    .update(buildAuthorizationPhrase(certifiedLifecycleHead))
    .digest('hex');
}

function evaluateExplicitAuthorization(input = {}) {
  let head;
  try {
    head = assertSha(input.certifiedLifecycleHead);
  } catch {
    return blocked('R3W_CERTIFIED_LIFECYCLE_HEAD_REQUIRED');
  }

  if (input.authorizationPhrase !== buildAuthorizationPhrase(head)) {
    return blocked('R3W_EXACT_HEAD_BOUND_AUTHORIZATION_PHRASE_REQUIRED');
  }
  if (input.authorizationConsumed !== false || input.executionAttempted !== false) {
    return blocked('R3W_AUTHORIZATION_ALREADY_CONSUMED_OR_ATTEMPTED');
  }
  if (input.targetEnvironment !== 'staging' ||
      input.projectId !== REQUIRED_PROJECT_ID ||
      input.branch !== REQUIRED_BRANCH ||
      input.pullRequest !== REQUIRED_PULL_REQUEST) {
    return blocked('R3W_EXACT_AUTHORIZATION_SCOPE_REQUIRED');
  }

  const receiptId = crypto
    .createHash('sha256')
    .update([
      CONTRACT_ID,
      head,
      authorizationPhraseFingerprint(head),
      input.projectId,
      input.branch,
      String(input.pullRequest)
    ].join(':'))
    .digest('hex');

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'head_bound_single_use_authorization_received_trigger_creation_only',
    lifecycleState: 'explicit_authorization_received',
    certifiedLifecycleHead: head,
    authorizationPhraseFingerprint: authorizationPhraseFingerprint(head),
    authorizationReceiptId: receiptId,
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

function consumeAuthorizationForTrigger(receipt = {}) {
  if (receipt.decision !== 'head_bound_single_use_authorization_received_trigger_creation_only' ||
      receipt.authorizationConsumed !== false ||
      receipt.executionAttempted !== false ||
      receipt.singleUse !== true ||
      receipt.reusableAfterFailure !== false) {
    return blocked('R3W_VALID_UNCONSUMED_AUTHORIZATION_RECEIPT_REQUIRED');
  }

  return freeze({
    ...receipt,
    decision: 'authorization_consumed_trigger_creation_pending',
    lifecycleState: 'authorization_consumed_trigger_creation_pending',
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
  const installHead = assertSha(workflowInstallHead, 'R3W_WORKFLOW_INSTALL_HEAD_REQUIRED');
  const evidenceHead = assertSha(
    authorizationEvidenceHead,
    'R3W_AUTHORIZATION_EVIDENCE_HEAD_REQUIRED'
  );
  if (typeof authorizationReceiptId !== 'string' ||
      !/^[0-9a-f]{64}$/.test(authorizationReceiptId)) {
    throw new TypeError('R3W_AUTHORIZATION_RECEIPT_ID_REQUIRED');
  }

  return freeze({
    contractId: TRIGGER_CONTRACT_ID,
    status: TRIGGER_STATUS,
    workflowInstallHead: installHead,
    authorizationEvidenceHead: evidenceHead,
    authorizationReceiptId,
    runAttempt: 1,
    targetEnvironment: 'staging',
    projectId: REQUIRED_PROJECT_ID,
    branch: REQUIRED_BRANCH,
    pullRequest: REQUIRED_PULL_REQUEST
  });
}

function validateFutureTriggerCommit(input = {}) {
  const trigger = input.trigger;
  if (!exactKeys(trigger, REQUIRED_TRIGGER_KEYS)) {
    return blocked('R3W_EXACT_TRIGGER_SHAPE_REQUIRED');
  }
  if (trigger.contractId !== TRIGGER_CONTRACT_ID || trigger.status !== TRIGGER_STATUS) {
    return blocked('R3W_TRIGGER_CONTRACT_REQUIRED');
  }
  if (input.runAttempt !== 1 || trigger.runAttempt !== 1) {
    return blocked('R3W_RUN_ATTEMPT_ONE_REQUIRED');
  }
  if (input.parentHead !== trigger.workflowInstallHead) {
    return blocked('R3W_TRIGGER_PARENT_CONTINUITY_REQUIRED');
  }
  if (!exactArray(input.changedFiles, [FUTURE_TRIGGER_PATH])) {
    return blocked('R3W_TRIGGER_SINGLE_FILE_DELTA_REQUIRED');
  }
  if (input.authorizationReceipt?.authorizationConsumed !== true ||
      input.authorizationReceipt?.executionAttempted !== false ||
      input.authorizationReceipt?.authorizationReceiptId !== trigger.authorizationReceiptId ||
      input.authorizationReceipt?.certifiedLifecycleHead !== trigger.authorizationEvidenceHead) {
    return blocked('R3W_CONSUMED_AUTHORIZATION_RECEIPT_CONTINUITY_REQUIRED');
  }
  if (trigger.targetEnvironment !== 'staging' ||
      trigger.projectId !== REQUIRED_PROJECT_ID ||
      trigger.branch !== REQUIRED_BRANCH ||
      trigger.pullRequest !== REQUIRED_PULL_REQUEST) {
    return blocked('R3W_TRIGGER_SCOPE_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'future_trigger_commit_shape_valid_remote_execution_still_separately_blocked',
    lifecycleState: 'authorization_consumed_trigger_creation_pending',
    triggerPath: FUTURE_TRIGGER_PATH,
    triggerContractId: TRIGGER_CONTRACT_ID,
    runAttempt: 1,
    authorizationConsumed: true,
    reusableAfterFailure: false,
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
    return blocked('R3V_VALIDATION_REQUIRED');
  }
  if (input.predecessorStatus !== PREDECESSOR_STATUS) {
    return blocked('R3V_CERTIFIED_STATUS_REQUIRED');
  }
  if (input.predecessorHead !== PREDECESSOR_HEAD) {
    return blocked('R3V_EVIDENCE_HEAD_REQUIRED');
  }
  if (input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN ||
      input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB ||
      input.predecessorRecertSuccess !== true) {
    return blocked('R3V_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (input.predecessorMatrixRecertRun !== PREDECESSOR_MATRIX_RECERT_RUN ||
      input.predecessorMatrixRecertJob !== PREDECESSOR_MATRIX_RECERT_JOB ||
      input.predecessorMatrixRecertSuccess !== true) {
    return blocked('R3V_MATRIX_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION ||
      input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (input.r3vContractId !== r3v.CONTRACT_ID ||
      input.r3kContractId !== r3k.CONTRACT_ID) {
    return blocked('R3V_R3K_CONTRACT_CONTINUITY_REQUIRED');
  }
  if (input.futureTriggerPath !== FUTURE_TRIGGER_PATH ||
      input.triggerContractId !== TRIGGER_CONTRACT_ID ||
      !exactArray(input.lifecycleStates, LIFECYCLE_STATES) ||
      !exactArray(input.requiredTriggerKeys, REQUIRED_TRIGGER_KEYS)) {
    return blocked('R3W_LIFECYCLE_CONTRACT_CONTINUITY_REQUIRED');
  }

  const required = [
    'headBoundAuthorizationPhraseFactoryPrepared',
    'concreteAuthorizationPhraseNotPersisted',
    'authorizationPhraseFingerprintPrepared',
    'singleUseAuthorizationReceiptPrepared',
    'receiptConsumptionTransitionPrepared',
    'secondConsumptionRejected',
    'reuseAfterFailureRejected',
    'predecessorAuthorizationReuseRejected',
    'futureTriggerDescriptorPrepared',
    'triggerSingleFileDeltaRequired',
    'triggerParentHeadContinuityRequired',
    'runAttemptOneRequired',
    'authorizationReceiptContinuityRequired',
    'authorizationEvidenceHeadPinned',
    'r3vRemoteExecutionEnvelopePinned',
    'r3vRemoteHardBlockPreserved',
    'ordinaryPullRequestRemoteJobsAbsent',
    'workflowPushTriggerAbsent',
    'workflowEnvironmentAbsent',
    'workflowSecretsAbsent',
    'repositorySelfTestPrepared',
    'failClosedCasesCovered',
    'noCausalPromotionWithoutRemoteObservation'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R3W_LIFECYCLE_CONTROL_REQUIRED', { flag });
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
    if (input[flag] !== false) return blocked('R3W_REMOTE_SCOPE_PROHIBITED', { flag });
  }

  if (r3v.REMOTE_EXECUTION_BLOCK_CODE !==
      'DOKE_COM_B03C_R3V_NEW_SINGLE_USE_REMOTE_AUTHORIZATION_BOUNDARY_REQUIRED') {
    return blocked('R3V_REMOTE_HARD_BLOCK_CONTINUITY_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_head_bound_single_use_staging_authorization_lifecycle_ready_authorization_absent',
    reason: null,
    predecessorContractId: r3v.CONTRACT_ID,
    predecessorEvidenceHead: PREDECESSOR_HEAD,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    triggerContractId: TRIGGER_CONTRACT_ID,
    triggerStatus: TRIGGER_STATUS,
    lifecycleStates: LIFECYCLE_STATES,
    authorizationPhraseMode: 'derived_from_future_certified_r3w_evidence_head',
    authorizationPrefix: AUTHORIZATION_PREFIX,
    concreteAuthorizationPhrasePersisted: false,
    singleUse: true,
    reusableAfterFailure: false,
    predecessorAuthorizationReusable: false,
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
      'After R3W evidence-head certification, a new explicit authorization phrase must be generated from that exact certified head. Only that phrase may authorize creation of a one-file single-use trigger in a separate boundary; remote execution remains separately blocked until that boundary is certified.'
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
  assertRemoteExecutionBoundaryAbsent,
  buildAuthorizationPhrase,
  authorizationPhraseFingerprint,
  evaluateExplicitAuthorization,
  consumeAuthorizationForTrigger,
  buildFutureTriggerDescriptor,
  validateFutureTriggerCommit,
  evaluateRepositoryReadiness
});
