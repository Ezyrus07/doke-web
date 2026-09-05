'use strict';

const r3e = require('./community-realtime-private-auth-r3e');
const r3g = require('./community-realtime-private-auth-r3g');

const CONTRACT_ID = 'com-b03c-r3h-single-use-ephemeral-policy-identity-presence-diagnostic-readiness-v1';
const TRIGGER_CONTRACT_ID = 'com-b03c-r3h-single-use-ephemeral-policy-identity-presence-diagnostic-trigger-v1';
const PREDECESSOR_VALIDATION_ID = 'COM-B03C-R3G-REMOTE-ADAPTER-WIRING-READINESS';
const PREDECESSOR_STATUS = 'repository_remote_adapter_wiring_certified_no_staging_authority';
const PREDECESSOR_EVIDENCE_HEAD = '90e45247b469f6fd2ad4c77f4f3a3b5477abd266';
const PREDECESSOR_RECERT_RUN = 31341929330;
const PREDECESSOR_RECERT_JOB = 93317026708;
const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const REQUIRED_PROJECT_ID = 'zwkczgewzbsorbrjuzpb';
const REQUIRED_PROJECT_NAME = 'doke-web-staging';
const REQUIRED_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B03C_R3H_SINGLE_USE_EPHEMERAL_POLICY_IDENTITY_AND_PRESENCE_DIAGNOSTIC_ON_DOKE_STAGING';
const TRIGGER_PATH = 'config/com-b03c-r3h-case-time-policy-snapshot-presence-diagnostic-staging-trigger.json';
const REPORT_VALIDATION_ID = 'COM-B03C-R3H-CASE-TIME-POLICY-SNAPSHOT-PRESENCE-STAGING-ATTEMPT';
const STAGING_AUTHORIZATION_BLOCK_CODE = 'DOKE_COM_B03C_R3H_STAGING_AUTHORIZATION_REQUIRED';
const POLICY_PREFIX = 'com_b03c_r3h_';
const AUTH_EMAIL_PREFIX = 'com-b03c-r3h-';
const AUTH_EMAIL_SUFFIX = '@canary.doke.invalid';
const AUTH_USER_PURPOSE = 'com-b03c-r3h-case-time-policy-snapshot-presence-diagnostic';
const REQUIRED_SCOPE = Object.freeze([
  'auth.users:single_synthetic_identity',
  'public.synthetic_account_materialization:single_identity',
  'realtime.messages:temporary_policy_lifecycle',
  'pg_policies:case_time_full_catalog_snapshots',
  'realtime:private_presence_read_join'
]);
const CASE_IDS = r3e.CASE_IDS;
const POLICY_SNAPSHOT_COLUMNS = r3e.REQUIRED_POLICY_COLUMNS;
const SNAPSHOT_PHASES = r3e.SNAPSHOT_PHASES;
const LIMITS = Object.freeze({
  syntheticAuthUsers: 1,
  concurrentTemporaryPolicies: 2,
  policiesPerCase: 2,
  cases: CASE_IDS.length,
  realtimeClientsPerCase: 1
});

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'blocked',
    reason,
    repositoryReadinessAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    authIdentityLifecycleAuthority: false,
    syntheticAccountMaterializationAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    domainMutationAuthority: false,
    publicationMutationAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function exactArray(value, expected) {
  return Array.isArray(value) && JSON.stringify(value.map(String)) === JSON.stringify(expected);
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3G_EVIDENCE_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3G_CERTIFIED_STATUS_REQUIRED');
  if (input.predecessorEvidenceHead !== PREDECESSOR_EVIDENCE_HEAD) return blocked('R3G_EVIDENCE_HEAD_REQUIRED');
  if (input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN || input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB || input.predecessorRecertSuccess !== true) {
    return blocked('R3G_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (input.r3gContractId !== r3g.CONTRACT_ID) return blocked('R3G_CONTRACT_ID_REQUIRED');
  if (!exactArray(input.scope, REQUIRED_SCOPE)) return blocked('EXACT_SCOPE_REQUIRED');
  if (!exactArray(input.caseIds, CASE_IDS)) return blocked('EXACT_CASE_MATRIX_REQUIRED');
  if (!exactArray(input.policySnapshotColumns, POLICY_SNAPSHOT_COLUMNS)) return blocked('EXACT_POLICY_SNAPSHOT_COLUMNS_REQUIRED');
  if (!exactArray(input.snapshotPhases, SNAPSHOT_PHASES)) return blocked('EXACT_SNAPSHOT_PHASES_REQUIRED');

  const required = [
    'freshAuthorizationPhraseDefined', 'singleUseTriggerContractDefined', 'executableWorkflowPrepared',
    'authorizeJobPrepared', 'stagingCanaryJobPrepared', 'runAttemptOneRequired',
    'triggerParentContinuityRequired', 'triggerOnlyCommitRequired', 'prOpenDraftUnmergedPreflightRequired',
    'projectIdentityPreflightRequired', 'singleSyntheticIdentityRequired', 'sameIdentityTokenTopicAcrossCasesRequired',
    'temporaryPolicyPairPerCaseRequired', 'fullCatalogSnapshotsRequired', 'preSubscribeStructuralGateRequired',
    'negativeControlRequired', 'perCaseCleanupRequired', 'finalZeroResidueRequired',
    'sanitizedEvidenceRequired', 'independentEvidenceVerifierRequired', 'artifactUploadRequired',
    'noCommunityPostsExecutionRequired', 'noChannelMessagesExecutionRequired',
    'noPublicationMutationRequired', 'noRuntimeDeployRequired', 'noProductionRequired', 'noMergeRequired'
  ];
  for (const flag of required) if (input[flag] !== true) return blocked('R3H_READINESS_CONTROL_REQUIRED', { flag });

  const preauthFalse = [
    'authorizationReceived', 'authorizationConsumed', 'executionAttempted', 'triggerExists',
    'stagingAccessExecuted', 'remoteCredentialReadExecuted', 'remoteDependencyLoadExecuted',
    'authIdentityMutationExecuted', 'syntheticAccountMaterializationExecuted', 'realtimePolicyMutationExecuted', 'realtimeSubscriptionExecuted',
    'generalDomainMutationExecuted', 'publicationMutationExecuted', 'runtimeDeployExecuted',
    'productionExecuted', 'mergeExecuted'
  ];
  for (const flag of preauthFalse) if (input[flag] !== false) return blocked('R3H_PREAUTHORITY_STATE_REQUIRED', { flag });

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_single_use_staging_diagnostic_boundary_ready_new_authorization_required',
    reason: null,
    requiredAuthorizationPhrase: REQUIRED_AUTHORIZATION_PHRASE,
    triggerContractId: TRIGGER_CONTRACT_ID,
    triggerPath: TRIGGER_PATH,
    reportValidationId: REPORT_VALIDATION_ID,
    scope: REQUIRED_SCOPE,
    caseIds: CASE_IDS,
    policySnapshotColumns: POLICY_SNAPSHOT_COLUMNS,
    snapshotPhases: SNAPSHOT_PHASES,
    limits: LIMITS,
    exactRootCauseProven: false,
    runtimeChangeAuthorized: false,
    repositoryReadinessAuthority: true,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    authIdentityLifecycleAuthority: false,
    syntheticAccountMaterializationAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    domainMutationAuthority: false,
    publicationMutationAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

function evaluateStagingAuthorization(input = {}) {
  if (input.authorizationPhrase !== REQUIRED_AUTHORIZATION_PHRASE) return blocked('R3H_EXACT_AUTHORIZATION_REQUIRED');
  if (input.targetEnvironment !== 'staging') return blocked('R3H_TARGET_NOT_STAGING');
  if (input.projectId !== REQUIRED_PROJECT_ID) return blocked('R3H_PROJECT_MISMATCH');
  if (input.branch !== REQUIRED_BRANCH) return blocked('R3H_BRANCH_MISMATCH');
  if (input.pullRequest !== REQUIRED_PULL_REQUEST) return blocked('R3H_PR_MISMATCH');
  if (input.runAttempt !== 1) return blocked('R3H_RUN_ATTEMPT_ONE_REQUIRED');
  if (input.authorizationConsumed !== false || input.executionAttempted !== false) return blocked('R3H_SINGLE_USE_AUTH_ALREADY_SPENT');
  if (input.predecessorAuthorizationReusable !== false) return blocked('R3H_PREDECESSOR_AUTH_REUSE_PROHIBITED');
  if (!exactArray(input.scope, REQUIRED_SCOPE)) return blocked('R3H_SCOPE_MISMATCH');
  if (input.caseCount !== CASE_IDS.length) return blocked('R3H_CASE_COUNT_MISMATCH');
  if (input.syntheticAuthUserLimit !== LIMITS.syntheticAuthUsers) return blocked('R3H_SYNTHETIC_USER_LIMIT_MISMATCH');
  if (input.concurrentTemporaryPolicyLimit !== LIMITS.concurrentTemporaryPolicies) return blocked('R3H_POLICY_LIMIT_MISMATCH');

  const required = [
    'ephemeralAuthIdentityAllowed', 'syntheticAccountMaterializationAllowed',
    'temporaryRealtimePolicyLifecycleAllowed', 'privatePresenceSubscriptionAllowed',
    'completeCaseTimePolicySnapshotsRequired', 'preSubscribeStructuralGateRequired',
    'sameIdentityTokenTopicRequired', 'negativeControlRequired', 'perCaseCleanupRequired',
    'finalZeroResidueRequired', 'sanitizedDiagnosticsRequired',
    'noCommunityPostsExecutionRequired', 'noChannelMessagesExecutionRequired',
    'noPublicationMutationRequired', 'noRuntimeDeployRequired', 'noProductionRequired',
    'noMergeRequired', 'singleUse'
  ];
  for (const flag of required) if (input[flag] !== true) return blocked('R3H_AUTHORIZATION_FLAG_MISSING', { flag });
  if (input.reusableAfterFailure !== false) return blocked('R3H_AUTHORIZATION_MUST_NOT_BE_REUSABLE');

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'authorized_for_single_bounded_ephemeral_policy_identity_presence_diagnostic',
    reason: null,
    scope: REQUIRED_SCOPE,
    limits: LIMITS,
    exactRootCauseProven: false,
    runtimeChangeAuthorized: false,
    repositoryReadinessAuthority: true,
    triggerCreationAuthority: true,
    stagingReadAuthority: true,
    stagingMutationAuthority: true,
    authIdentityLifecycleAuthority: true,
    syntheticAccountMaterializationAuthority: true,
    realtimePolicyLifecycleAuthority: true,
    realtimeSubscriptionAuthority: true,
    domainMutationAuthority: false,
    publicationMutationAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

module.exports = freeze({
  CONTRACT_ID, TRIGGER_CONTRACT_ID, PREDECESSOR_VALIDATION_ID, PREDECESSOR_STATUS,
  PREDECESSOR_EVIDENCE_HEAD, PREDECESSOR_RECERT_RUN, PREDECESSOR_RECERT_JOB,
  REQUIRED_BRANCH, REQUIRED_PULL_REQUEST, REQUIRED_PROJECT_ID, REQUIRED_PROJECT_NAME,
  REQUIRED_AUTHORIZATION_PHRASE, TRIGGER_PATH, REPORT_VALIDATION_ID,
  STAGING_AUTHORIZATION_BLOCK_CODE, POLICY_PREFIX, AUTH_EMAIL_PREFIX, AUTH_EMAIL_SUFFIX,
  AUTH_USER_PURPOSE, REQUIRED_SCOPE, CASE_IDS, POLICY_SNAPSHOT_COLUMNS, SNAPSHOT_PHASES, LIMITS,
  evaluateRepositoryReadiness, evaluateStagingAuthorization
});
