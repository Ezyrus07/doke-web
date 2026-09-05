'use strict';

const CONTRACT_ID = 'com-b03c-r2a-staging-residue-cleanup-readiness-v1';
const REQUIRED_PROJECT_ID = 'zwkczgewzbsorbrjuzpb';
const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const REQUIRED_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B03C_R2A_STAGING_RESIDUE_INSPECTION_AND_CLEANUP_ONLY';
const POLICY_PREFIX = 'com_b03c_r2_';
const AUTH_EMAIL_PREFIX = 'com-b03c-r2-';
const AUTH_EMAIL_SUFFIX = '@doke.local';
const AUTH_USER_PURPOSE = 'realtime-auth-predicate-ladder';

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
    repositoryReadinessAuthority: false,
    stagingInspectionAuthority: false,
    stagingCleanupAuthority: false,
    realtimePolicyCreateAuthority: false,
    realtimeSubscriptionAuthority: false,
    diagnosticRerunAuthority: false,
    publicationMutationAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== 'COM-B03C-R2-REALTIME-AUTH-PREDICATE-LADDER-STAGING-ATTEMPT') {
    return blocked('COM_B03C_R2_ATTEMPT_EVIDENCE_REQUIRED');
  }
  if (input.predecessorStatus !== 'failed_closed_harness_listener_registration_order_cleanup_unproven') {
    return blocked('COM_B03C_R2_CLEANUP_UNPROVEN_STATUS_REQUIRED');
  }
  if (input.predecessorAuthorizationConsumed !== true || input.predecessorAuthorizationReusable !== false) {
    return blocked('COM_B03C_R2_SINGLE_USE_HISTORY_REQUIRED');
  }
  if (input.cleanupZeroResidueAlreadyProven === true) return blocked('R2A_NOT_REQUIRED_WHEN_ZERO_RESIDUE_PROVEN');
  if (input.policyPrefix !== POLICY_PREFIX || input.authEmailPrefix !== AUTH_EMAIL_PREFIX || input.authEmailSuffix !== AUTH_EMAIL_SUFFIX || input.authUserPurpose !== AUTH_USER_PURPOSE) {
    return blocked('R2A_EXACT_RESIDUE_SELECTORS_REQUIRED');
  }
  for (const key of ['inspectPoliciesPrepared','dropMatchingPoliciesPrepared','inspectSyntheticAuthPrepared','deleteMatchingSyntheticAuthPrepared','postCleanupZeroResidueVerificationPrepared','sanitizedEvidencePrepared']) {
    if (input[key] !== true) return blocked('R2A_REQUIRED_CLEANUP_CAPABILITY_MISSING', { flag: key });
  }
  for (const key of ['createRealtimePoliciesPlanned','openRealtimeChannelsPlanned','rerunPredicateLadderPlanned','communityPostsExecutionPlanned','channelMessagesExecutionPlanned','publicationMutationPlanned','runtimeDeployPlanned','productionPlanned','mergePlanned','realUserMutationPlanned']) {
    if (input[key] === true) return blocked('R2A_PROHIBITED_ACTION_PLANNED', { flag: key });
  }
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_cleanup_recovery_ready_new_authorization_required',
    reason: null,
    repositoryReadinessAuthority: true,
    stagingInspectionAuthority: false,
    stagingCleanupAuthority: false,
    realtimePolicyCreateAuthority: false,
    realtimeSubscriptionAuthority: false,
    diagnosticRerunAuthority: false,
    publicationMutationAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

function evaluateStagingAuthorization(input = {}) {
  if (input.authorizationPhrase !== REQUIRED_AUTHORIZATION_PHRASE) return blocked('EXPLICIT_COM_B03C_R2A_STAGING_AUTHORIZATION_REQUIRED');
  if (input.targetEnvironment !== 'staging' || input.projectId !== REQUIRED_PROJECT_ID) return blocked('STAGING_TARGET_MISMATCH');
  if (input.branch !== REQUIRED_BRANCH || input.pullRequest !== REQUIRED_PULL_REQUEST) return blocked('PULL_REQUEST_BOUNDARY_MISMATCH');
  if (input.authorizationConsumed === true || input.executionAttempted === true) return blocked('SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED');
  if (input.predecessorAuthorizationReusable !== false) return blocked('COM_B03C_R2_AUTHORIZATION_REUSE_PROHIBITED');
  if (input.policyPrefix !== POLICY_PREFIX || input.authEmailPrefix !== AUTH_EMAIL_PREFIX || input.authEmailSuffix !== AUTH_EMAIL_SUFFIX || input.authUserPurpose !== AUTH_USER_PURPOSE) return blocked('R2A_EXACT_RESIDUE_SELECTORS_REQUIRED');
  for (const key of ['inspectPoliciesAllowed','dropMatchingPoliciesAllowed','inspectSyntheticAuthAllowed','deleteMatchingSyntheticAuthAllowed','postCleanupZeroResidueVerificationRequired','sanitizedEvidenceRequired']) {
    if (input[key] !== true) return blocked('R2A_REQUIRED_FLAG_MISSING', { flag: key });
  }
  for (const key of ['createRealtimePoliciesAllowed','openRealtimeChannelsAllowed','rerunPredicateLadderAllowed','communityPostsExecutionAllowed','channelMessagesExecutionAllowed','publicationMutationAllowed','runtimeDeployAllowed','productionAllowed','mergeAllowed','realUserMutationAllowed']) {
    if (input[key] !== false) return blocked('R2A_PROHIBITED_FLAG_ENABLED', { flag: key });
  }
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'authorized_for_single_bounded_r2_residue_inspection_and_cleanup_only',
    reason: null,
    projectId: REQUIRED_PROJECT_ID,
    branch: REQUIRED_BRANCH,
    pullRequest: REQUIRED_PULL_REQUEST,
    policyPrefix: POLICY_PREFIX,
    authEmailPrefix: AUTH_EMAIL_PREFIX,
    authEmailSuffix: AUTH_EMAIL_SUFFIX,
    authUserPurpose: AUTH_USER_PURPOSE,
    stagingInspectionAuthority: true,
    stagingCleanupAuthority: true,
    syntheticCanaryIdentityCleanupAuthority: true,
    realtimePolicyDropAuthority: true,
    realtimePolicyCreateAuthority: false,
    realtimeSubscriptionAuthority: false,
    diagnosticRerunAuthority: false,
    publicationMutationAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    singleUse: true,
    reusableAfterFailure: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  REQUIRED_PROJECT_ID,
  REQUIRED_BRANCH,
  REQUIRED_PULL_REQUEST,
  REQUIRED_AUTHORIZATION_PHRASE,
  POLICY_PREFIX,
  AUTH_EMAIL_PREFIX,
  AUTH_EMAIL_SUFFIX,
  AUTH_USER_PURPOSE,
  evaluateRepositoryReadiness,
  evaluateStagingAuthorization
});
