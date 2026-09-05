'use strict';

const crypto = require('node:crypto');
const r4c = require('./community-realtime-private-auth-r4c');
const r3s = require('./community-realtime-private-auth-r3s');
const r3k = require('./community-realtime-private-auth-r3k');

const CONTRACT_ID =
  'com-b03c-r4d-head-bound-single-use-r4c-bridged-retry-authorization-lifecycle-readiness-v1';
const VALIDATION_ID =
  'COM-B03C-R4D-HEAD-BOUND-SINGLE-USE-R4C-BRIDGED-RETRY-AUTHORIZATION-LIFECYCLE-READINESS';
const STATUS =
  'repository_head_bound_single_use_r4c_bridged_retry_authorization_lifecycle_certified_authorization_absent';

const PREDECESSOR_VALIDATION_ID = r4c.VALIDATION_ID;
const PREDECESSOR_STATUS = r4c.STATUS;
const PREDECESSOR_HEAD = 'de6a6fdd77a2a1490eaa984cd18b14cc6f1309a4';
const PREDECESSOR_RECERT_RUN = 31489909008;
const PREDECESSOR_RECERT_JOB = 93773682660;
const PREDECESSOR_MATRIX_RUN = 31489908871;
const PREDECESSOR_MATRIX_JOB = 93773681982;

const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';

const REQUIRED_BRANCH = r3k.REQUIRED_BRANCH;
const REQUIRED_PULL_REQUEST = r3k.REQUIRED_PULL_REQUEST;
const REQUIRED_PROJECT_ID = r3k.REQUIRED_PROJECT_ID;
const REQUIRED_PROJECT_NAME = r3k.REQUIRED_PROJECT_NAME;

const FUTURE_TRIGGER_PATH =
  'config/com-b03c-r4d-single-use-r4c-bridged-retry-trigger.json';
const TRIGGER_CONTRACT_ID =
  'com-b03c-r4d-single-use-r4c-bridged-retry-trigger-v1';
const TRIGGER_STATUS =
  'fresh_r4c_bridged_retry_authorization_consumed_execution_not_authorized';
const AUTHORIZATION_PREFIX =
  'I_EXPLICITLY_AUTHORIZE_COM_B03C_R4D_SINGLE_USE_R4C_BRIDGED_STAGING_RETRY_TRIGGER_CREATION_FOR_HEAD_';
const REMOTE_EXECUTION_BLOCK_CODE =
  'DOKE_COM_B03C_R4D_REMOTE_EXECUTION_BOUNDARY_REQUIRED';

const LIFECYCLE_STATES = Object.freeze([
  'certified_r4c_bridged_retry_authorization_absent',
  'explicit_r4c_bridged_retry_authorization_received',
  'r4c_bridged_retry_authorization_consumed_trigger_creation_pending',
  'r4c_bridged_retry_trigger_created_terminal_consumed'
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
  'predecessorR4cEvidenceHead',
  'r4cContractId',
  'codecSemanticsFingerprint'
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

function assertSha(value, code = 'R4D_CERTIFIED_LIFECYCLE_HEAD_REQUIRED') {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/.test(value)) {
    const error = new TypeError(code);
    error.code = code;
    throw error;
  }
  return value;
}

function assertReceiptId(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) {
    const error = new TypeError('R4D_AUTHORIZATION_RECEIPT_ID_REQUIRED');
    error.code = 'R4D_AUTHORIZATION_RECEIPT_ID_REQUIRED';
    throw error;
  }
  return value;
}

function buildCodecSemanticsFingerprint() {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      predecessorR4cEvidenceHead: PREDECESSOR_HEAD,
      r4cContractId: r4c.CONTRACT_ID,
      pgInt8Oid: r4c.PG_INT8_OID,
      counterIds: [...r3s.COUNTER_IDS],
      policy: [
        'nonnegative_safe_integer_passthrough',
        'decimal_digit_string_to_bigint_then_safe_number',
        'reject_negative_malformed_or_unsafe_integer',
        'normalize_exact_r3u_counter_read_result_only',
        'historical_r3v_unchanged',
        'historical_r3s_unchanged'
      ]
    }))
    .digest('hex');
}

const CODEC_SEMANTICS_FINGERPRINT = buildCodecSemanticsFingerprint();

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
      PREDECESSOR_HEAD,
      r4c.CONTRACT_ID,
      CODEC_SEMANTICS_FINGERPRINT
    ].join(':'))
    .digest('hex');
}

function evaluateExplicitAuthorization(input = {}) {
  let head;
  try {
    head = assertSha(input.certifiedLifecycleHead);
  } catch {
    return blocked('R4D_CERTIFIED_LIFECYCLE_HEAD_REQUIRED');
  }

  if (input.authorizationPhrase !== buildAuthorizationPhrase(head)) {
    return blocked('R4D_EXACT_HEAD_BOUND_AUTHORIZATION_PHRASE_REQUIRED');
  }
  if (
    input.authorizationConsumed !== false ||
    input.triggerCreated !== false ||
    input.previousR4bAuthorizationReusable !== false
  ) {
    return blocked('R4D_FRESH_NON_REUSED_AUTHORIZATION_REQUIRED');
  }
  if (
    input.targetEnvironment !== 'staging' ||
    input.projectId !== REQUIRED_PROJECT_ID ||
    input.branch !== REQUIRED_BRANCH ||
    input.pullRequest !== REQUIRED_PULL_REQUEST
  ) {
    return blocked('R4D_EXACT_AUTHORIZATION_SCOPE_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision:
      'head_bound_single_use_r4c_bridged_retry_authorization_received_trigger_creation_only',
    lifecycleState: 'explicit_r4c_bridged_retry_authorization_received',
    certifiedLifecycleHead: head,
    authorizationPhraseFingerprint: authorizationPhraseFingerprint(head),
    authorizationReceiptId: deriveAuthorizationReceiptId(head),
    predecessorR4cEvidenceHead: PREDECESSOR_HEAD,
    r4cContractId: r4c.CONTRACT_ID,
    codecSemanticsFingerprint: CODEC_SEMANTICS_FINGERPRINT,
    singleUse: true,
    reusableAfterFailure: false,
    previousR4bAuthorizationReusable: false,
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
    receipt.contractId !== CONTRACT_ID ||
    receipt.decision !==
      'head_bound_single_use_r4c_bridged_retry_authorization_received_trigger_creation_only' ||
    receipt.authorizationConsumed !== false ||
    receipt.triggerCreated !== false ||
    receipt.singleUse !== true ||
    receipt.reusableAfterFailure !== false ||
    receipt.previousR4bAuthorizationReusable !== false ||
    receipt.predecessorR4cEvidenceHead !== PREDECESSOR_HEAD ||
    receipt.r4cContractId !== r4c.CONTRACT_ID ||
    receipt.codecSemanticsFingerprint !== CODEC_SEMANTICS_FINGERPRINT
  ) {
    return blocked('R4D_VALID_UNCONSUMED_CODEC_BOUND_RECEIPT_REQUIRED');
  }

  return freeze({
    ...receipt,
    decision: 'r4c_bridged_retry_authorization_consumed_trigger_creation_pending',
    lifecycleState: 'r4c_bridged_retry_authorization_consumed_trigger_creation_pending',
    authorizationConsumed: true,
    triggerCreationAuthority: true,
    remoteExecutionAuthority: false
  });
}

function buildExpectedConsumedReceipt(certifiedLifecycleHead) {
  const head = assertSha(certifiedLifecycleHead);
  const received = evaluateExplicitAuthorization({
    certifiedLifecycleHead: head,
    authorizationPhrase: buildAuthorizationPhrase(head),
    authorizationConsumed: false,
    triggerCreated: false,
    previousR4bAuthorizationReusable: false,
    targetEnvironment: 'staging',
    projectId: REQUIRED_PROJECT_ID,
    branch: REQUIRED_BRANCH,
    pullRequest: REQUIRED_PULL_REQUEST
  });
  return consumeAuthorizationForTrigger(received);
}

function buildFutureTriggerDescriptor({
  certifiedLifecycleHead,
  authorizationReceiptId
} = {}) {
  const head = assertSha(
    certifiedLifecycleHead,
    'R4D_WORKFLOW_INSTALL_HEAD_REQUIRED'
  );
  const receiptId = assertReceiptId(authorizationReceiptId);
  if (receiptId !== deriveAuthorizationReceiptId(head)) {
    throw new Error('R4D_AUTHORIZATION_RECEIPT_HEAD_BINDING_REQUIRED');
  }

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
    predecessorR4cEvidenceHead: PREDECESSOR_HEAD,
    r4cContractId: r4c.CONTRACT_ID,
    codecSemanticsFingerprint: CODEC_SEMANTICS_FINGERPRINT
  });
}

function validateFutureTriggerCommit({
  trigger,
  parentHead,
  changedFiles,
  runAttempt,
  authorizationReceipt
} = {}) {
  if (!exactKeys(trigger, REQUIRED_TRIGGER_KEYS)) {
    return blocked('R4D_EXACT_TRIGGER_SHAPE_REQUIRED');
  }
  if (
    trigger.contractId !== TRIGGER_CONTRACT_ID ||
    trigger.status !== TRIGGER_STATUS
  ) {
    return blocked('R4D_TRIGGER_CONTRACT_REQUIRED');
  }
  if (runAttempt !== 1 || trigger.runAttempt !== 1) {
    return blocked('R4D_RUN_ATTEMPT_ONE_REQUIRED');
  }
  if (
    trigger.workflowInstallHead !== trigger.authorizationEvidenceHead ||
    parentHead !== trigger.workflowInstallHead
  ) {
    return blocked('R4D_TRIGGER_PARENT_AND_AUTHORIZATION_HEAD_CONTINUITY_REQUIRED');
  }
  if (!exactArray(changedFiles, [FUTURE_TRIGGER_PATH])) {
    return blocked('R4D_TRIGGER_SINGLE_FILE_DELTA_REQUIRED');
  }
  if (
    authorizationReceipt?.contractId !== CONTRACT_ID ||
    authorizationReceipt?.authorizationConsumed !== true ||
    authorizationReceipt?.triggerCreated !== false ||
    authorizationReceipt?.singleUse !== true ||
    authorizationReceipt?.reusableAfterFailure !== false ||
    authorizationReceipt?.previousR4bAuthorizationReusable !== false ||
    authorizationReceipt?.authorizationReceiptId !== trigger.authorizationReceiptId ||
    authorizationReceipt?.certifiedLifecycleHead !== trigger.authorizationEvidenceHead ||
    authorizationReceipt?.predecessorR4cEvidenceHead !== PREDECESSOR_HEAD ||
    authorizationReceipt?.r4cContractId !== r4c.CONTRACT_ID ||
    authorizationReceipt?.codecSemanticsFingerprint !== CODEC_SEMANTICS_FINGERPRINT
  ) {
    return blocked('R4D_CONSUMED_CODEC_BOUND_RECEIPT_CONTINUITY_REQUIRED');
  }
  if (
    trigger.targetEnvironment !== 'staging' ||
    trigger.projectId !== REQUIRED_PROJECT_ID ||
    trigger.branch !== REQUIRED_BRANCH ||
    trigger.pullRequest !== REQUIRED_PULL_REQUEST
  ) {
    return blocked('R4D_TRIGGER_SCOPE_REQUIRED');
  }
  if (
    trigger.predecessorR4cEvidenceHead !== PREDECESSOR_HEAD ||
    trigger.r4cContractId !== r4c.CONTRACT_ID ||
    trigger.codecSemanticsFingerprint !== CODEC_SEMANTICS_FINGERPRINT
  ) {
    return blocked('R4D_R4C_CODEC_SEMANTICS_BINDING_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision:
      'future_r4c_bridged_retry_trigger_shape_valid_remote_execution_still_separately_blocked',
    lifecycleState: 'r4c_bridged_retry_authorization_consumed_trigger_creation_pending',
    triggerPath: FUTURE_TRIGGER_PATH,
    triggerContractId: TRIGGER_CONTRACT_ID,
    predecessorR4cEvidenceHead: PREDECESSOR_HEAD,
    r4cContractId: r4c.CONTRACT_ID,
    codecSemanticsFingerprint: CODEC_SEMANTICS_FINGERPRINT,
    runAttempt: 1,
    authorizationConsumed: true,
    previousR4bAuthorizationReusable: false,
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
  if (
    input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID ||
    input.predecessorStatus !== PREDECESSOR_STATUS ||
    input.predecessorHead !== PREDECESSOR_HEAD
  ) {
    return blocked('R4D_R4C_CERTIFIED_EVIDENCE_REQUIRED');
  }
  if (
    input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN ||
    input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB ||
    input.predecessorRecertSuccess !== true ||
    input.predecessorMatrixRun !== PREDECESSOR_MATRIX_RUN ||
    input.predecessorMatrixJob !== PREDECESSOR_MATRIX_JOB ||
    input.predecessorMatrixSuccess !== true
  ) {
    return blocked('R4D_R4C_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (
    input.matrixVersion !== MATRIX_VERSION ||
    input.maturity !== REQUIRED_MATURITY ||
    input.productionGate !== REQUIRED_PRODUCTION_GATE
  ) {
    return blocked('R4D_CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (
    input.r4cContractId !== r4c.CONTRACT_ID ||
    input.codecSemanticsFingerprint !== CODEC_SEMANTICS_FINGERPRINT ||
    input.futureTriggerPath !== FUTURE_TRIGGER_PATH ||
    input.triggerContractId !== TRIGGER_CONTRACT_ID ||
    !exactArray(input.lifecycleStates, LIFECYCLE_STATES) ||
    !exactArray(input.requiredTriggerKeys, REQUIRED_TRIGGER_KEYS)
  ) {
    return blocked('R4D_LIFECYCLE_CONTRACT_CONTINUITY_REQUIRED');
  }

  const requiredTrue = [
    'r4cCodecCompatibilityCertified',
    'r4cBridgeScopedToExactCounterReadResult',
    'r4cHistoricalR3vUnchanged',
    'r4cHistoricalR3sUnchanged',
    'r4bAuthorizationConsumedNonReusable',
    'r4bExecutionTriggerAbsent',
    'headBoundAuthorizationPhraseFactoryPrepared',
    'concreteAuthorizationPhraseNotPersisted',
    'authorizationPhraseFingerprintPrepared',
    'singleUseAuthorizationReceiptPrepared',
    'receiptBindsR4cCodecSemantics',
    'receiptConsumptionTransitionPrepared',
    'secondConsumptionRejected',
    'reuseAfterFailureRejected',
    'previousR4bAuthorizationReuseRejected',
    'futureTriggerDescriptorPrepared',
    'triggerSingleFileDeltaRequired',
    'triggerParentHeadContinuityRequired',
    'runAttemptOneRequired',
    'authorizationReceiptContinuityRequired',
    'remoteExecutionSeparatelyBlocked',
    'noRemoteExecutionInR4d'
  ];
  for (const flag of requiredTrue) {
    if (input[flag] !== true) return blocked('R4D_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'explicitAuthorizationReceived',
    'explicitAuthorizationConsumed',
    'triggerCreated',
    'remoteCredentialReadExecuted',
    'remoteDependencyLoadExecuted',
    'networkExecuted',
    'databaseConnectionExecuted',
    'databaseQueryAgainstRemoteExecuted',
    'realtimeSubscriptionExecuted',
    'stagingReadExecuted',
    'stagingMutationExecuted',
    'runtimePolicyChangeAuthorized',
    'productionPrepared',
    'mergePrepared'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R4D_REMOTE_SCOPE_PROHIBITED', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision:
      'repository_head_bound_single_use_r4c_bridged_retry_authorization_lifecycle_ready_authorization_absent',
    predecessorR4cEvidenceHead: PREDECESSOR_HEAD,
    codecSemanticsFingerprint: CODEC_SEMANTICS_FINGERPRINT,
    authorizationPrefix: AUTHORIZATION_PREFIX,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    singleUse: true,
    reusableAfterFailure: false,
    previousR4bAuthorizationReusable: false,
    repositoryAuthorizationLifecycleAuthority: true,
    explicitAuthorizationReceived: false,
    explicitAuthorizationConsumed: false,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    nextBoundaryRequirement:
      'After R4D evidence-head certification, request the exact head-bound R4D phrase. It may authorize only the one-file R4D trigger creation; remote execution remains separately blocked for a later executable boundary.'
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
  CODEC_SEMANTICS_FINGERPRINT,
  buildCodecSemanticsFingerprint,
  buildAuthorizationPhrase,
  authorizationPhraseFingerprint,
  deriveAuthorizationReceiptId,
  evaluateExplicitAuthorization,
  consumeAuthorizationForTrigger,
  buildExpectedConsumedReceipt,
  buildFutureTriggerDescriptor,
  validateFutureTriggerCommit,
  assertRemoteExecutionBoundaryAbsent,
  evaluateRepositoryReadiness
});
