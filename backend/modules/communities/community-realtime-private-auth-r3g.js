'use strict';

const r3f = require('./community-realtime-private-auth-r3f');

const CONTRACT_ID = 'com-b03c-r3g-remote-adapter-wiring-readiness-v1';
const PREDECESSOR_VALIDATION_ID = 'COM-B03C-R3F-CASE-TIME-POLICY-SNAPSHOT-DIAGNOSTIC-READINESS';
const PREDECESSOR_STATUS = 'repository_case_time_snapshot_diagnostic_implementation_certified_no_staging_authority';
const PREDECESSOR_EVIDENCE_HEAD = '5ebd559cbc88a2aa16d0e8a00275f9cea33eb576';
const PREDECESSOR_RECERT_RUN = 31341111150;
const PREDECESSOR_RECERT_JOB = 93314909216;
const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const REQUIRED_PROJECT_ID = 'zwkczgewzbsorbrjuzpb';
const REQUIRED_PROJECT_NAME = 'doke-web-staging';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R3G_REMOTE_AUTHORIZATION_BOUNDARY_REQUIRED';
const FUTURE_TRIGGER_PATH = 'config/com-b03c-r3g-case-time-policy-snapshot-staging-trigger.json';
const REMOTE_DEPENDENCIES = Object.freeze(['pg', '@supabase/supabase-js']);
const CREDENTIAL_NAMES = Object.freeze(['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'SUPABASE_PROJECT_REF']);
const SINGLE_USE_LIFECYCLE = Object.freeze({
  singleUseRequired: true,
  reusableAfterFailure: false,
  predecessorAuthorizationReusable: false,
  triggerMustBeAbsentAtReadiness: true,
  authorizationPhraseMustBeAbsentAtReadiness: true,
  runAttemptMustBeOneWhenEventuallyAuthorized: true
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
    repositoryRemoteWiringAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    authIdentityLifecycleAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function exactArray(value, expected) {
  return Array.isArray(value) && JSON.stringify(value.map(String)) === JSON.stringify(expected);
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
    input.pullRequest === REQUIRED_PULL_REQUEST;
}

function evaluateRepositoryRemoteWiringReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3F_EVIDENCE_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3F_CERTIFIED_STATUS_REQUIRED');
  if (input.predecessorEvidenceHead !== PREDECESSOR_EVIDENCE_HEAD) return blocked('R3F_EVIDENCE_HEAD_REQUIRED');
  if (input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN || input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB || input.predecessorRecertSuccess !== true) {
    return blocked('R3F_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (input.r3fContractId !== r3f.CONTRACT_ID) return blocked('R3F_CONTRACT_ID_REQUIRED');
  if (!exactArray(input.remoteDependencies, REMOTE_DEPENDENCIES)) return blocked('EXACT_REMOTE_DEPENDENCIES_REQUIRED');
  if (!exactArray(input.credentialNames, CREDENTIAL_NAMES)) return blocked('EXACT_CREDENTIAL_NAME_CONTRACT_REQUIRED');
  if (input.futureTriggerPath !== FUTURE_TRIGGER_PATH) return blocked('FUTURE_TRIGGER_PATH_CONTRACT_REQUIRED');

  const required = [
    'remoteAdapterScaffoldCreated', 'r3fHarnessBridgePrepared', 'lazyDependencyLoadingPrepared',
    'credentialNameContractPrepared', 'projectPreflightPrepared', 'databaseAdapterPrepared',
    'supabaseRealtimeAdapterPrepared', 'supabaseAdminAdapterPrepared', 'singleUseLifecycleSchemaPrepared',
    'sanitizedRemoteErrorsPrepared', 'cleanupPlanPrepared', 'repositorySelfTestPrepared',
    'hardBlockBeforeCredentialReadPrepared', 'hardBlockBeforeDependencyLoadPrepared'
  ];
  for (const flag of required) if (input[flag] !== true) return blocked('R3G_REMOTE_WIRING_CONTROL_REQUIRED', { flag });

  const mustBeFalse = [
    'triggerExists', 'authorizationPhraseDefined', 'workflowSecretsReferenced', 'stagingEnvironmentReferenced',
    'remoteExecutionJobCreated', 'stagingReadPlanned', 'stagingMutationPlanned', 'remoteCredentialReadPlanned',
    'remoteDependencyLoadPlanned', 'authIdentityMutationPlanned', 'realtimePolicyMutationPlanned',
    'realtimeSubscriptionPlanned', 'runtimeDeployPlanned', 'productionPlanned', 'mergePlanned', 'realUserMutationPlanned'
  ];
  for (const flag of mustBeFalse) if (input[flag] !== false) return blocked('OUT_OF_SCOPE_EXECUTION_PROHIBITED', { flag });

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_remote_adapter_wiring_ready_new_remote_authorization_boundary_not_defined',
    reason: null,
    predecessorContractId: r3f.CONTRACT_ID,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    remoteDependencies: REMOTE_DEPENDENCIES,
    credentialNames: CREDENTIAL_NAMES,
    singleUseLifecycle: SINGLE_USE_LIFECYCLE,
    exactRootCauseProven: false,
    runtimeChangeAuthorized: false,
    repositoryRemoteWiringAuthority: true,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    authIdentityLifecycleAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

module.exports = freeze({
  CONTRACT_ID, PREDECESSOR_VALIDATION_ID, PREDECESSOR_STATUS, PREDECESSOR_EVIDENCE_HEAD,
  PREDECESSOR_RECERT_RUN, PREDECESSOR_RECERT_JOB, REQUIRED_BRANCH, REQUIRED_PULL_REQUEST,
  REQUIRED_PROJECT_ID, REQUIRED_PROJECT_NAME, REMOTE_EXECUTION_BLOCK_CODE, FUTURE_TRIGGER_PATH,
  REMOTE_DEPENDENCIES, CREDENTIAL_NAMES, SINGLE_USE_LIFECYCLE,
  assertRemoteBoundaryAbsent, validateFutureSingleUseEnvelopeShape, evaluateRepositoryRemoteWiringReadiness
});
