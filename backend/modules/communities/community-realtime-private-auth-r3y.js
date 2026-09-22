'use strict';

const crypto = require('node:crypto');
const r3x = require('./community-realtime-private-auth-r3x');
const r3v = require('./community-realtime-private-auth-r3v');
const r3w = require('./community-realtime-private-auth-r3w');
const r3k = require('./community-realtime-private-auth-r3k');
const r3o = require('./community-realtime-private-auth-r3o');
const r3p = require('./community-realtime-private-auth-r3p');

const CONTRACT_ID =
  'com-b03c-r3y-fresh-single-use-hosted-runtime-execution-lifecycle-readiness-v1';
const VALIDATION_ID =
  'COM-B03C-R3Y-FRESH-SINGLE-USE-HOSTED-RUNTIME-EXECUTION-LIFECYCLE-READINESS';

const PREDECESSOR_VALIDATION_ID = r3x.VALIDATION_ID;
const PREDECESSOR_STATUS =
  'repository_authorized_single_file_trigger_creation_certified_remote_execution_blocked';
const PREDECESSOR_HEAD = 'c8fb12b4302af203da8d9c906878716cbf5f13e0';
const PREDECESSOR_RECERT_RUN = 31446099223;
const PREDECESSOR_RECERT_JOB = 93640563224;
const PREDECESSOR_MATRIX_RECERT_RUN = 31446099310;
const PREDECESSOR_MATRIX_RECERT_JOB = 93640563186;

const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';

const REQUIRED_BRANCH = r3k.REQUIRED_BRANCH;
const REQUIRED_PULL_REQUEST = r3k.REQUIRED_PULL_REQUEST;
const REQUIRED_PROJECT_ID = r3k.REQUIRED_PROJECT_ID;
const REQUIRED_PROJECT_NAME = r3k.REQUIRED_PROJECT_NAME;

const FUTURE_TRIGGER_PATH =
  'config/com-b03c-r3y-single-use-hosted-runtime-observation-trigger.json';
const TRIGGER_CONTRACT_ID =
  'com-b03c-r3y-single-use-hosted-runtime-observation-trigger-v1';
const TRIGGER_STATUS = 'fresh_authorization_consumed_execution_pending';
const AUTHORIZATION_PREFIX =
  'I_EXPLICITLY_AUTHORIZE_COM_B03C_R3Y_SINGLE_USE_HOSTED_RUNTIME_OBSERVATION_ON_DOKE_STAGING_FOR_HEAD_';
const REMOTE_EXECUTION_BLOCK_CODE =
  'DOKE_COM_B03C_R3Y_FRESH_HEAD_BOUND_AUTHORIZATION_REQUIRED';
const REPORT_SCHEMA =
  'com-b03c-r3y-single-use-hosted-runtime-observation-report-v1';
const AUTHORIZED_DECISION =
  'authorized_for_single_use_hosted_runtime_presence_observation';

const LIFECYCLE_STATES = Object.freeze([
  'certified_fresh_authorization_absent',
  'fresh_authorization_received',
  'fresh_authorization_consumed_trigger_pending',
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
  'r3vContractId',
  'statementFingerprint',
  'statementCount',
  'ownershipDigest'
]);

const ALLOWED_CLASSIFICATIONS = Object.freeze([
  'hosted_presence_extension_selection_diverged',
  'anchor_join_failed_before_presence_flag_observation',
  'hosted_presence_read_effective_gate_diverged',
  'hosted_presence_only_or_join_diverged',
  'hosted_runtime_observation_matches_pinned_presence_path'
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

function assertSha(value, code = 'R3Y_CERTIFIED_LIFECYCLE_HEAD_REQUIRED') {
  if (typeof value !== 'string' || !/^[0-9a-f]{40}$/.test(value)) {
    const error = new TypeError(code);
    error.code = code;
    throw error;
  }
  return value;
}

function assertReceiptId(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) {
    const error = new TypeError('R3Y_AUTHORIZATION_RECEIPT_ID_REQUIRED');
    error.code = 'R3Y_AUTHORIZATION_RECEIPT_ID_REQUIRED';
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
    repositoryHostedExecutionLifecycleAuthority: false,
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

function assertFreshAuthorizationBoundaryAbsent() {
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
      r3v.CONTRACT_ID
    ].join(':'))
    .digest('hex');
}

function ownershipTokenForReceipt(authorizationReceiptId) {
  const receiptId = assertReceiptId(authorizationReceiptId);
  return `r3y_${receiptId.slice(0, 28)}`;
}

function buildExecutionBinding(authorizationReceiptId) {
  const receiptId = assertReceiptId(authorizationReceiptId);
  const plan = r3v.buildSingleUseExecutionPlan({
    ownershipToken: ownershipTokenForReceipt(receiptId)
  });
  return freeze({
    r3vContractId: r3v.CONTRACT_ID,
    statementFingerprint: plan.statementFingerprint,
    statementCount: plan.statementCount,
    ownershipDigest: plan.ownershipDigest,
    rawOwnershipTokenPersisted: false
  });
}

function evaluateExplicitAuthorization(input = {}) {
  let head;
  try {
    head = assertSha(input.certifiedLifecycleHead);
  } catch {
    return blocked('R3Y_CERTIFIED_LIFECYCLE_HEAD_REQUIRED');
  }

  if (input.authorizationPhrase !== buildAuthorizationPhrase(head)) {
    return blocked('R3Y_EXACT_HEAD_BOUND_AUTHORIZATION_PHRASE_REQUIRED');
  }
  if (input.authorizationConsumed !== false || input.executionAttempted !== false) {
    return blocked('R3Y_AUTHORIZATION_ALREADY_CONSUMED_OR_ATTEMPTED');
  }
  if (
    input.targetEnvironment !== 'staging' ||
    input.projectId !== REQUIRED_PROJECT_ID ||
    input.branch !== REQUIRED_BRANCH ||
    input.pullRequest !== REQUIRED_PULL_REQUEST
  ) {
    return blocked('R3Y_EXACT_AUTHORIZATION_SCOPE_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'fresh_head_bound_single_use_authorization_received_trigger_creation_only',
    lifecycleState: 'fresh_authorization_received',
    certifiedLifecycleHead: head,
    authorizationPhraseFingerprint: authorizationPhraseFingerprint(head),
    authorizationReceiptId: deriveAuthorizationReceiptId(head),
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
  if (
    receipt.contractId !== CONTRACT_ID ||
    receipt.decision !==
      'fresh_head_bound_single_use_authorization_received_trigger_creation_only' ||
    receipt.authorizationConsumed !== false ||
    receipt.executionAttempted !== false ||
    receipt.singleUse !== true ||
    receipt.reusableAfterFailure !== false ||
    receipt.predecessorAuthorizationReusable !== false
  ) {
    return blocked('R3Y_VALID_FRESH_UNCONSUMED_AUTHORIZATION_RECEIPT_REQUIRED');
  }

  return freeze({
    ...receipt,
    decision: 'fresh_authorization_consumed_trigger_creation_pending',
    lifecycleState: 'fresh_authorization_consumed_trigger_pending',
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
    executionAttempted: false,
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
  const head = assertSha(certifiedLifecycleHead, 'R3Y_WORKFLOW_INSTALL_HEAD_REQUIRED');
  const expectedReceiptId = deriveAuthorizationReceiptId(head);
  const receiptId = assertReceiptId(authorizationReceiptId);
  if (receiptId !== expectedReceiptId) {
    throw new Error('R3Y_AUTHORIZATION_RECEIPT_HEAD_BINDING_REQUIRED');
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
    r3vContractId: binding.r3vContractId,
    statementFingerprint: binding.statementFingerprint,
    statementCount: binding.statementCount,
    ownershipDigest: binding.ownershipDigest
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
    return blocked('R3Y_EXACT_TRIGGER_SHAPE_REQUIRED');
  }
  if (trigger.contractId !== TRIGGER_CONTRACT_ID || trigger.status !== TRIGGER_STATUS) {
    return blocked('R3Y_TRIGGER_CONTRACT_REQUIRED');
  }
  if (runAttempt !== 1 || trigger.runAttempt !== 1) {
    return blocked('R3Y_RUN_ATTEMPT_ONE_REQUIRED');
  }
  if (
    trigger.workflowInstallHead !== trigger.authorizationEvidenceHead ||
    parentHead !== trigger.workflowInstallHead
  ) {
    return blocked('R3Y_TRIGGER_PARENT_AND_AUTHORIZATION_HEAD_CONTINUITY_REQUIRED');
  }
  if (!exactArray(changedFiles, [FUTURE_TRIGGER_PATH])) {
    return blocked('R3Y_TRIGGER_SINGLE_FILE_DELTA_REQUIRED');
  }
  if (
    authorizationReceipt?.contractId !== CONTRACT_ID ||
    authorizationReceipt?.authorizationConsumed !== true ||
    authorizationReceipt?.executionAttempted !== false ||
    authorizationReceipt?.singleUse !== true ||
    authorizationReceipt?.reusableAfterFailure !== false ||
    authorizationReceipt?.authorizationReceiptId !== trigger.authorizationReceiptId ||
    authorizationReceipt?.certifiedLifecycleHead !== trigger.authorizationEvidenceHead
  ) {
    return blocked('R3Y_CONSUMED_AUTHORIZATION_RECEIPT_CONTINUITY_REQUIRED');
  }
  if (
    trigger.targetEnvironment !== 'staging' ||
    trigger.projectId !== REQUIRED_PROJECT_ID ||
    trigger.branch !== REQUIRED_BRANCH ||
    trigger.pullRequest !== REQUIRED_PULL_REQUEST
  ) {
    return blocked('R3Y_TRIGGER_SCOPE_REQUIRED');
  }

  const binding = buildExecutionBinding(trigger.authorizationReceiptId);
  if (
    trigger.r3vContractId !== binding.r3vContractId ||
    trigger.statementFingerprint !== binding.statementFingerprint ||
    trigger.statementCount !== binding.statementCount ||
    trigger.ownershipDigest !== binding.ownershipDigest
  ) {
    return blocked('R3Y_R3V_EXECUTION_BINDING_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'fresh_trigger_commit_valid_execution_authority_available_for_this_attempt',
    lifecycleState: 'fresh_authorization_consumed_trigger_pending',
    authorizationReceiptId: trigger.authorizationReceiptId,
    authorizationEvidenceHead: trigger.authorizationEvidenceHead,
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
  const validated = validateFutureTriggerCommit(input);
  if (
    validated.decision !==
    'fresh_trigger_commit_valid_execution_authority_available_for_this_attempt'
  ) {
    return validated;
  }
  return freeze({
    ...validated,
    decision: AUTHORIZED_DECISION,
    lifecycleState: 'execution_attempted_terminal_consumed',
    executionAttempted: true,
    triggerCreationAuthority: false
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) {
    return blocked('R3X_VALIDATION_REQUIRED');
  }
  if (input.predecessorStatus !== PREDECESSOR_STATUS) {
    return blocked('R3X_CERTIFIED_STATUS_REQUIRED');
  }
  if (input.predecessorHead !== PREDECESSOR_HEAD) {
    return blocked('R3X_EVIDENCE_HEAD_REQUIRED');
  }
  if (
    input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN ||
    input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB ||
    input.predecessorRecertSuccess !== true
  ) {
    return blocked('R3X_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (
    input.predecessorMatrixRecertRun !== PREDECESSOR_MATRIX_RECERT_RUN ||
    input.predecessorMatrixRecertJob !== PREDECESSOR_MATRIX_RECERT_JOB ||
    input.predecessorMatrixRecertSuccess !== true
  ) {
    return blocked('R3X_MATRIX_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (
    input.matrixVersion !== MATRIX_VERSION ||
    input.maturity !== REQUIRED_MATURITY ||
    input.productionGate !== REQUIRED_PRODUCTION_GATE
  ) {
    return blocked('CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (
    input.r3xContractId !== r3x.CONTRACT_ID ||
    input.r3vContractId !== r3v.CONTRACT_ID ||
    input.r3wContractId !== r3w.CONTRACT_ID ||
    input.r3pContractId !== r3p.CONTRACT_ID ||
    input.r3oContractId !== r3o.CONTRACT_ID
  ) {
    return blocked('R3X_R3V_R3W_R3P_R3O_CONTINUITY_REQUIRED');
  }
  if (
    input.futureTriggerPath !== FUTURE_TRIGGER_PATH ||
    input.triggerContractId !== TRIGGER_CONTRACT_ID ||
    input.reportSchema !== REPORT_SCHEMA ||
    !exactArray(input.lifecycleStates, LIFECYCLE_STATES) ||
    !exactArray(input.requiredTriggerKeys, REQUIRED_TRIGGER_KEYS) ||
    !exactArray(input.allowedClassifications, ALLOWED_CLASSIFICATIONS)
  ) {
    return blocked('R3Y_EXECUTION_LIFECYCLE_CONTRACT_CONTINUITY_REQUIRED');
  }

  const required = [
    'previousAuthorizationConsumed',
    'previousAuthorizationNonReusable',
    'previousTriggerRemoved',
    'previousExecutionNotAttempted',
    'r3xPrHeadContinuityHardeningPreserved',
    'freshAuthorizationHeadBound',
    'freshAuthorizationDigestOnlyPersistence',
    'freshAuthorizationSingleUse',
    'freshAuthorizationNonReusableAfterFailure',
    'triggerSingleFileDeltaRequired',
    'triggerParentEqualsAuthorizationEvidenceHeadRequired',
    'runAttemptOneRequired',
    'exactR3vStatementFingerprintBoundToReceipt',
    'rawOwnershipTokenPersistenceProhibited',
    'credentialReadAfterAuthorizationOnly',
    'dependencyLoadAfterAuthorizationOnly',
    'projectIdentityPreflightRequired',
    'apiKeyDiscoveryAfterAuthorizationOnly',
    'syntheticIdentityLifecyclePrepared',
    'sameIdentityAndTokenAcrossTwoProbes',
    'freshRealtimeClientPerProbe',
    'uniqueTopicPerProbe',
    'r3vRestrictedDbAdapterReused',
    'r3vPresenceAwareBridgeReused',
    'r3pHarnessAndR3oClassifierReusedWithoutForking',
    'cleanupInFinallyRequired',
    'scopedResidueInspectionRequired',
    'baselinePolicyRestorationCheckRequired',
    'syntheticIdentityCleanupFinallyRequired',
    'databaseConnectionCleanupFinallyRequired',
    'sanitizedReportVerifierPrepared',
    'sanitizedArtifactUploadPrepared',
    'canaryFailurePropagatedAfterArtifact',
    'workflowPushRestrictedToExactTriggerPath',
    'ordinaryPullRequestRemoteJobsSkipped',
    'repositorySelfTestPrepared',
    'hardBlockBeforeCredentialReadPrepared',
    'hardBlockBeforeDependencyLoadPrepared',
    'noCausalPromotionWithoutHostedObservation'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R3Y_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'freshAuthorizationPhraseReceived',
    'freshAuthorizationConsumed',
    'triggerExists',
    'credentialValuesPersisted',
    'authorizationPlaintextPersisted',
    'rawOwnershipTokenPersisted',
    'remoteDependenciesLoadedDuringReadiness',
    'networkAccessActivatedDuringReadiness',
    'databaseConnectionActivatedDuringReadiness',
    'sqlExecutionActivatedDuringReadiness',
    'realtimeClientActivatedDuringReadiness',
    'stagingReadActivatedDuringReadiness',
    'stagingMutationActivatedDuringReadiness',
    'authIdentityMutationActivatedDuringReadiness',
    'runtimePolicyChangeAuthorized',
    'productionPrepared',
    'mergePrepared'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R3Y_REMOTE_SCOPE_PROHIBITED', { flag });
  }

  if (
    r3x.AUTHORIZATION_RECEIPT_ID !==
      '7fcbee37389539920ea5c0941226f9952315cb58177e613d2abe1fccf649c985'
  ) {
    return blocked('R3X_CONSUMED_RECEIPT_CONTINUITY_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision:
      'repository_fresh_single_use_hosted_runtime_execution_lifecycle_ready_authorization_absent',
    reason: null,
    predecessorContractId: r3x.CONTRACT_ID,
    predecessorEvidenceHead: PREDECESSOR_HEAD,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    triggerContractId: TRIGGER_CONTRACT_ID,
    triggerStatus: TRIGGER_STATUS,
    reportSchema: REPORT_SCHEMA,
    lifecycleStates: LIFECYCLE_STATES,
    requiredTriggerKeys: REQUIRED_TRIGGER_KEYS,
    allowedClassifications: ALLOWED_CLASSIFICATIONS,
    authorizationPrefix: AUTHORIZATION_PREFIX,
    concreteAuthorizationPhrasePersisted: false,
    singleUse: true,
    reusableAfterFailure: false,
    predecessorAuthorizationReusable: false,
    runAttemptMustBeOne: true,
    repositoryHostedExecutionLifecycleAuthority: true,
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
      'After this exact R3Y evidence head is certified, receive a new explicit head-bound single-use authorization, consume it into exactly one R3Y trigger-file commit, execute once at run_attempt=1, upload only sanitized evidence, remove the trigger, and never reuse the authorization.'
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
  REPORT_SCHEMA,
  AUTHORIZED_DECISION,
  LIFECYCLE_STATES,
  REQUIRED_TRIGGER_KEYS,
  ALLOWED_CLASSIFICATIONS,
  assertFreshAuthorizationBoundaryAbsent,
  buildAuthorizationPhrase,
  authorizationPhraseFingerprint,
  deriveAuthorizationReceiptId,
  ownershipTokenForReceipt,
  buildExecutionBinding,
  evaluateExplicitAuthorization,
  consumeAuthorizationForTrigger,
  buildExpectedConsumedReceipt,
  buildFutureTriggerDescriptor,
  validateFutureTriggerCommit,
  authorizeExecution,
  evaluateRepositoryReadiness
});
