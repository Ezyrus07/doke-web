'use strict';

const r3j = require('./community-realtime-private-auth-r3j');
const r3g = require('./community-realtime-private-auth-r3g');

const CONTRACT_ID = 'com-b03c-r3k-differential-remote-adapter-lifecycle-readiness-v1';
const PREDECESSOR_VALIDATION_ID = 'COM-B03C-R3J-EVALUATION-CONTEXT-DIFFERENTIAL-HARNESS-READINESS';
const PREDECESSOR_STATUS = 'repository_evaluation_context_differential_harness_certified_no_remote_authority';
const PREDECESSOR_EVIDENCE_HEAD = '79f86714aece9bec734b66f5ee620de398766ea7';
const PREDECESSOR_RECERT_RUN = 31345504963;
const PREDECESSOR_RECERT_JOB = 93326567071;
const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const REQUIRED_PROJECT_ID = r3g.REQUIRED_PROJECT_ID;
const REQUIRED_PROJECT_NAME = r3g.REQUIRED_PROJECT_NAME;
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R3K_REMOTE_AUTHORIZATION_BOUNDARY_REQUIRED';
const FUTURE_TRIGGER_PATH = 'config/com-b03c-r3k-evaluation-context-differential-staging-trigger.json';
const REMOTE_DEPENDENCIES = r3g.REMOTE_DEPENDENCIES;
const CREDENTIAL_NAMES = r3g.CREDENTIAL_NAMES;
const EXECUTION_CASE_IDS = r3j.EXECUTION_CASE_IDS;

const SINGLE_USE_LIFECYCLE = Object.freeze({
  singleUseRequired: true,
  reusableAfterFailure: false,
  predecessorAuthorizationReusable: false,
  runAttemptMustBeOneWhenEventuallyAuthorized: true,
  targetEnvironment: 'staging',
  executionCaseCount: EXECUTION_CASE_IDS.length,
  differentialProbeCount: r3j.CASE_IDS.length,
  negativeControlCount: 1,
  negativeControlId: r3j.NEGATIVE_CONTROL_ID,
  sameSyntheticIdentityAcrossCases: true,
  sameAccessTokenAcrossCases: true,
  sameTopicAcrossCases: true,
  freshRealtimeClientPerCase: true,
  exactlyTwoTemporaryPoliciesPerCase: true,
  structuralGateBeforeProbe: true,
  cleanupAfterEveryCase: true,
  syntheticIdentityCleanupFinally: true,
  zeroResidueRequired: true
});

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'blocked_repository_only',
    reason,
    repositoryRemoteLifecycleAuthority: false,
    remoteExecutionAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    authIdentityLifecycleAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function exactArray(actual, expected) {
  return Array.isArray(actual) &&
    JSON.stringify(actual.map(String)) === JSON.stringify(expected.map(String));
}

function assertRemoteBoundaryAbsent() {
  const error = new Error(REMOTE_EXECUTION_BLOCK_CODE);
  error.code = REMOTE_EXECUTION_BLOCK_CODE;
  throw error;
}

function validateFutureSingleUseEnvelopeShape(input = {}) {
  return input.singleUse === true &&
    input.reusableAfterFailure === false &&
    input.predecessorAuthorizationReusable === false &&
    input.runAttempt === 1 &&
    input.targetEnvironment === 'staging' &&
    input.projectId === REQUIRED_PROJECT_ID &&
    input.branch === REQUIRED_BRANCH &&
    input.pullRequest === REQUIRED_PULL_REQUEST &&
    input.negativeControlId === r3j.NEGATIVE_CONTROL_ID &&
    exactArray(input.executionCaseIds, EXECUTION_CASE_IDS);
}

function evaluateRepositoryRemoteLifecycleReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3J_EVIDENCE_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3J_CERTIFIED_STATUS_REQUIRED');
  if (input.predecessorEvidenceHead !== PREDECESSOR_EVIDENCE_HEAD) return blocked('R3J_EVIDENCE_HEAD_REQUIRED');
  if (
    input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN ||
    input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB ||
    input.predecessorRecertSuccess !== true
  ) {
    return blocked('R3J_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (input.r3jContractId !== r3j.CONTRACT_ID) return blocked('R3J_CONTRACT_ID_REQUIRED');
  if (!exactArray(input.executionCaseIds, EXECUTION_CASE_IDS)) return blocked('EXACT_17_CASE_EXECUTION_MATRIX_REQUIRED');
  if (!exactArray(input.remoteDependencies, REMOTE_DEPENDENCIES)) return blocked('EXACT_REMOTE_DEPENDENCIES_REQUIRED');
  if (!exactArray(input.credentialNames, CREDENTIAL_NAMES)) return blocked('EXACT_CREDENTIAL_NAME_CONTRACT_REQUIRED');
  if (input.futureTriggerPath !== FUTURE_TRIGGER_PATH) return blocked('FUTURE_TRIGGER_PATH_CONTRACT_REQUIRED');

  const required = [
    'r3jHarnessBridgePrepared',
    'r3gRemoteAdaptersReused',
    'negativeControlPreserved',
    'lazyDependencyLoadingPrepared',
    'credentialNameContractReused',
    'projectPreflightPrepared',
    'apiKeyDiscoveryContractPrepared',
    'databaseAdapterPrepared',
    'realtimeAdapterPrepared',
    'adminIdentityAdapterPrepared',
    'singleSyntheticIdentityLifecyclePrepared',
    'sameIdentityTokenTopicPlanPreserved',
    'freshRealtimeClientPerCasePreserved',
    'twoPolicyPerCaseLifecyclePrepared',
    'structuralPreProbeGatePrepared',
    'sanitizedRemoteErrorsPrepared',
    'cleanupAfterEveryCasePrepared',
    'syntheticIdentityCleanupFinallyPrepared',
    'zeroResidueRequirementPrepared',
    'singleUseLifecycleSchemaPrepared',
    'repositorySelfTestPrepared',
    'independentSelfTestVerifierPrepared',
    'hardBlockBeforeCredentialReadPrepared',
    'hardBlockBeforeDependencyLoadPrepared'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R3K_REMOTE_LIFECYCLE_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'triggerExists',
    'authorizationPhraseDefined',
    'workflowSecretsReferenced',
    'stagingEnvironmentReferenced',
    'remoteExecutionJobCreated',
    'stagingReadPlanned',
    'stagingMutationPlanned',
    'remoteCredentialReadPlanned',
    'remoteDependencyLoadPlanned',
    'authIdentityMutationPlanned',
    'realtimePolicyMutationPlanned',
    'realtimeSubscriptionPlanned',
    'runtimePolicyChangePlanned',
    'runtimeDeployPlanned',
    'productionPlanned',
    'mergePlanned',
    'realUserMutationPlanned'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R3K_REMOTE_SCOPE_PROHIBITED', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_differential_remote_adapter_lifecycle_ready_new_remote_authorization_boundary_not_defined',
    reason: null,
    predecessorContractId: r3j.CONTRACT_ID,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    remoteDependencies: REMOTE_DEPENDENCIES,
    credentialNames: CREDENTIAL_NAMES,
    executionCaseIds: EXECUTION_CASE_IDS,
    singleUseLifecycle: SINGLE_USE_LIFECYCLE,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    runtimeChangeAuthorized: false,
    repositoryRemoteLifecycleAuthority: true,
    remoteExecutionAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    authIdentityLifecycleAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  PREDECESSOR_VALIDATION_ID,
  PREDECESSOR_STATUS,
  PREDECESSOR_EVIDENCE_HEAD,
  PREDECESSOR_RECERT_RUN,
  PREDECESSOR_RECERT_JOB,
  REQUIRED_BRANCH,
  REQUIRED_PULL_REQUEST,
  REQUIRED_PROJECT_ID,
  REQUIRED_PROJECT_NAME,
  REMOTE_EXECUTION_BLOCK_CODE,
  FUTURE_TRIGGER_PATH,
  REMOTE_DEPENDENCIES,
  CREDENTIAL_NAMES,
  EXECUTION_CASE_IDS,
  SINGLE_USE_LIFECYCLE,
  assertRemoteBoundaryAbsent,
  validateFutureSingleUseEnvelopeShape,
  evaluateRepositoryRemoteLifecycleReadiness
});
