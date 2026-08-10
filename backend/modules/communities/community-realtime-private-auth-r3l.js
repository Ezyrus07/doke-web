'use strict';

const r3k = require('./community-realtime-private-auth-r3k');
const r3j = require('./community-realtime-private-auth-r3j');

const CONTRACT_ID = 'com-b03c-r3l-single-use-evaluation-context-differential-presence-diagnostic-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R3L-SINGLE-USE-EVALUATION-CONTEXT-DIFFERENTIAL-PRESENCE-DIAGNOSTIC-READINESS';
const PREDECESSOR_VALIDATION_ID = 'COM-B03C-R3K-DIFFERENTIAL-REMOTE-ADAPTER-LIFECYCLE-READINESS';
const PREDECESSOR_STATUS = 'repository_differential_remote_adapter_lifecycle_certified_no_remote_authority';
const PREDECESSOR_EVIDENCE_HEAD = '13abadb84e4729727bd86190d68c40bec99ecfdc';
const PREDECESSOR_RECERT_RUN = 31346503180;
const PREDECESSOR_RECERT_JOB = 93329305878;
const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const REQUIRED_PROJECT_ID = r3k.REQUIRED_PROJECT_ID;
const REQUIRED_PROJECT_NAME = r3k.REQUIRED_PROJECT_NAME;
const REQUIRED_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B03C_R3L_SINGLE_USE_EVALUATION_CONTEXT_DIFFERENTIAL_PRESENCE_DIAGNOSTIC_ON_DOKE_STAGING';
const TRIGGER_PATH = 'config/com-b03c-r3l-evaluation-context-differential-staging-trigger.json';
const TRIGGER_CONTRACT_ID = 'com-b03c-r3l-single-use-evaluation-context-differential-presence-diagnostic-trigger-v1';
const TRIGGER_STATUS = 'authorization_consumed_execution_pending';
const STAGING_AUTHORIZATION_BLOCK_CODE = 'DOKE_COM_B03C_R3L_STAGING_AUTHORIZATION_REQUIRED';
const EXECUTION_CASE_IDS = r3k.EXECUTION_CASE_IDS;
const CREDENTIAL_NAMES = r3k.CREDENTIAL_NAMES;
const REMOTE_DEPENDENCIES = r3k.REMOTE_DEPENDENCIES;

const AUTHORIZED_SCOPE = Object.freeze({
  singleUse: true,
  reusableAfterFailure: false,
  predecessorAuthorizationReusable: false,
  runAttempt: 1,
  targetEnvironment: 'staging',
  differentialProbeCount: r3j.CASE_IDS.length,
  totalExecutionCaseCount: EXECUTION_CASE_IDS.length,
  negativeControlId: r3j.NEGATIVE_CONTROL_ID,
  sameSyntheticIdentityAcrossCases: true,
  sameAccessTokenAcrossCases: true,
  sameTopicAcrossCases: true,
  freshRealtimeClientPerCase: true,
  exactlyTwoTemporaryPoliciesPerCase: true,
  structuralGateBeforeProbe: true,
  cleanupAfterEveryCase: true,
  syntheticIdentityCleanupFinally: true,
  zeroResidueRequired: true,
  runtimePolicyChangeAuthorized: false,
  productionAuthorized: false,
  mergeAuthorized: false
});

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function exactArray(actual, expected) {
  return Array.isArray(actual) &&
    JSON.stringify(actual.map(String)) === JSON.stringify(expected.map(String));
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'blocked',
    reason,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    authIdentityLifecycleAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    runtimePolicyChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function assertRemoteBoundaryAbsent() {
  const error = new Error(STAGING_AUTHORIZATION_BLOCK_CODE);
  error.code = STAGING_AUTHORIZATION_BLOCK_CODE;
  throw error;
}

function exactScope(input = {}) {
  return input.singleUse === true &&
    input.reusableAfterFailure === false &&
    input.predecessorAuthorizationReusable === false &&
    input.runAttempt === 1 &&
    input.targetEnvironment === 'staging' &&
    input.projectId === REQUIRED_PROJECT_ID &&
    input.branch === REQUIRED_BRANCH &&
    input.pullRequest === REQUIRED_PULL_REQUEST &&
    input.differentialProbeCount === r3j.CASE_IDS.length &&
    input.totalExecutionCaseCount === EXECUTION_CASE_IDS.length &&
    input.negativeControlId === r3j.NEGATIVE_CONTROL_ID &&
    exactArray(input.executionCaseIds, EXECUTION_CASE_IDS) &&
    input.sameSyntheticIdentityAcrossCases === true &&
    input.sameAccessTokenAcrossCases === true &&
    input.sameTopicAcrossCases === true &&
    input.freshRealtimeClientPerCase === true &&
    input.exactlyTwoTemporaryPoliciesPerCase === true &&
    input.structuralGateBeforeProbe === true &&
    input.cleanupAfterEveryCase === true &&
    input.syntheticIdentityCleanupFinally === true &&
    input.zeroResidueRequired === true &&
    input.runtimePolicyChangeAuthorized === false &&
    input.productionAuthorized === false &&
    input.mergeAuthorized === false;
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3K_VALIDATION_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3K_CERTIFIED_STATUS_REQUIRED');
  if (input.predecessorEvidenceHead !== PREDECESSOR_EVIDENCE_HEAD) return blocked('R3K_EVIDENCE_HEAD_REQUIRED');
  if (
    input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN ||
    input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB ||
    input.predecessorRecertSuccess !== true
  ) return blocked('R3K_EVIDENCE_HEAD_RECERT_REQUIRED');
  if (input.r3kContractId !== r3k.CONTRACT_ID) return blocked('R3K_CONTRACT_ID_REQUIRED');
  if (input.requiredAuthorizationPhrase !== REQUIRED_AUTHORIZATION_PHRASE) return blocked('EXACT_AUTHORIZATION_PHRASE_DEFINITION_REQUIRED');
  if (input.triggerPath !== TRIGGER_PATH || input.triggerContractId !== TRIGGER_CONTRACT_ID) return blocked('TRIGGER_CONTRACT_REQUIRED');
  if (!exactArray(input.executionCaseIds, EXECUTION_CASE_IDS)) return blocked('EXACT_17_CASE_MATRIX_REQUIRED');
  if (!exactArray(input.credentialNames, CREDENTIAL_NAMES)) return blocked('EXACT_CREDENTIAL_CONTRACT_REQUIRED');
  if (!exactArray(input.remoteDependencies, REMOTE_DEPENDENCIES)) return blocked('EXACT_DEPENDENCY_CONTRACT_REQUIRED');

  const requiredTrue = [
    'authorizationPhraseDefined',
    'singleUseLifecycleDefined',
    'certifyAuthorizeCanaryOrderingDefined',
    'triggerContinuityCheckDefined',
    'triggerSingleFileDeltaRequired',
    'runAttemptOneRequired',
    'authorizationConsumedOnAttemptRequired',
    'predecessorAuthorizationNonReusableRequired',
    'r3kLifecycleBridgeDefined',
    'r3jSeventeenCaseMatrixPreserved',
    'sameIdentityTokenTopicRequired',
    'freshRealtimeClientPerCaseRequired',
    'twoTemporaryPoliciesPerCaseRequired',
    'structuralGateBeforeProbeRequired',
    'cleanupAfterEveryCaseRequired',
    'syntheticIdentityCleanupFinallyRequired',
    'zeroResidueRequired',
    'sanitizedArtifactRequired',
    'independentArtifactVerificationRequired',
    'ordinaryPullRequestRemoteJobsSkipped',
    'remoteCliHardBlockedBeforeAuthorization',
    'causalPromotionBlocked'
  ];
  for (const flag of requiredTrue) {
    if (input[flag] !== true) return blocked('R3L_READINESS_CONTROL_REQUIRED', { flag });
  }

  const requiredFalse = [
    'authorizationPhraseReceived',
    'authorizationPhraseConsumed',
    'triggerExists',
    'stagingAccessExecuted',
    'remoteCredentialReadExecuted',
    'remoteDependencyLoadExecuted',
    'policyMutationExecuted',
    'authIdentityMutationExecuted',
    'realtimeSubscriptionExecuted',
    'runtimePolicyChangeExecuted',
    'productionExecuted',
    'mergeExecuted'
  ];
  for (const flag of requiredFalse) {
    if (input[flag] !== false) return blocked('R3L_PREAUTH_STATE_MUST_BE_FALSE', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_single_use_differential_presence_authorization_lifecycle_ready_authorization_not_received',
    reason: null,
    requiredAuthorizationPhrase: REQUIRED_AUTHORIZATION_PHRASE,
    authorizationPhraseDefined: true,
    authorizationPhraseReceived: false,
    authorizationPhraseConsumed: false,
    triggerPath: TRIGGER_PATH,
    triggerContractId: TRIGGER_CONTRACT_ID,
    triggerExists: false,
    executionCaseIds: EXECUTION_CASE_IDS,
    authorizedScope: AUTHORIZED_SCOPE,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    authIdentityLifecycleAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    runtimePolicyChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

function evaluateStagingAuthorization(input = {}) {
  if (input.authorizationPhrase !== REQUIRED_AUTHORIZATION_PHRASE) return blocked('EXACT_R3L_AUTHORIZATION_PHRASE_REQUIRED');
  if (input.authorizationConsumed !== false || input.executionAttempted !== false) return blocked('R3L_AUTHORIZATION_ALREADY_CONSUMED_OR_ATTEMPTED');
  if (!exactScope(input)) return blocked('R3L_EXACT_SINGLE_USE_SCOPE_REQUIRED');

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'authorized_for_single_bounded_evaluation_context_differential_presence_diagnostic',
    reason: null,
    singleUse: true,
    reusableAfterFailure: false,
    executionCaseIds: EXECUTION_CASE_IDS,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    stagingReadAuthority: true,
    stagingMutationAuthority: true,
    remoteCredentialReadAuthority: true,
    remoteDependencyLoadAuthority: true,
    authIdentityLifecycleAuthority: true,
    realtimePolicyLifecycleAuthority: true,
    realtimeSubscriptionAuthority: true,
    runtimePolicyChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  PREDECESSOR_VALIDATION_ID,
  PREDECESSOR_STATUS,
  PREDECESSOR_EVIDENCE_HEAD,
  PREDECESSOR_RECERT_RUN,
  PREDECESSOR_RECERT_JOB,
  REQUIRED_BRANCH,
  REQUIRED_PULL_REQUEST,
  REQUIRED_PROJECT_ID,
  REQUIRED_PROJECT_NAME,
  REQUIRED_AUTHORIZATION_PHRASE,
  TRIGGER_PATH,
  TRIGGER_CONTRACT_ID,
  TRIGGER_STATUS,
  STAGING_AUTHORIZATION_BLOCK_CODE,
  EXECUTION_CASE_IDS,
  CREDENTIAL_NAMES,
  REMOTE_DEPENDENCIES,
  AUTHORIZED_SCOPE,
  assertRemoteBoundaryAbsent,
  exactScope,
  evaluateRepositoryReadiness,
  evaluateStagingAuthorization
});
