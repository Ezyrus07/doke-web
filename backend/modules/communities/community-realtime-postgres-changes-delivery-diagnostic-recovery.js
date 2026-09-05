'use strict';

const r2Recovery = require('./community-realtime-ephemeral-auth-recovery');

const CONTRACT_ID = 'com-b03b-r3-postgres-changes-delivery-diagnostic-readiness-v1';
const REQUIRED_PROJECT_ID = r2Recovery.REQUIRED_PROJECT_ID;
const REQUIRED_BRANCH = r2Recovery.REQUIRED_BRANCH;
const REQUIRED_PULL_REQUEST = r2Recovery.REQUIRED_PULL_REQUEST;
const REQUIRED_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B03B_R3_AUTHENTICATED_POSTGRES_CHANGES_DELIVERY_DIAGNOSTIC_ON_DOKE_STAGING';
const ALLOWED_SCOPE = Object.freeze(['community_posts']);
const DEFERRED_TOPICS = Object.freeze(['channel_presence', 'channel_typing']);
const BLOCKED_TOPICS = Object.freeze(['channel_messages']);
const REQUIRED_SUPABASE_JS_VERSION = '2.112.2';

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
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    authIdentityLifecycleAuthority: false,
    realtimePublicationMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    diagnosticAuthority: false,
    persistentResidueAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function evaluateRepositoryRecovery(input = {}) {
  if (input.r2ContractId !== r2Recovery.CONTRACT_ID) return blocked('R2_CONTRACT_MISMATCH');
  if (input.r2AuthorizationConsumed !== true) return blocked('R2_AUTHORIZATION_CONSUMPTION_EVIDENCE_REQUIRED');
  if (input.r2ReusableAfterFailure !== false) return blocked('R2_AUTHORIZATION_MUST_REMAIN_NON_REUSABLE');
  if (input.r2FailureCode !== 'DOKE_COM_B03B_R2_POSTGRES_CHANGES_TIMEOUT') return blocked('R2_FAILURE_CLASS_MISMATCH');
  if (input.r2PersistentDomainResidue !== 0 || input.r2PersistentIdentityResidue !== 0) return blocked('R2_ZERO_RESIDUE_EVIDENCE_REQUIRED');
  if (input.communityPostsPublicationObserved !== true) return blocked('COMMUNITY_POSTS_PUBLICATION_OBSERVATION_REQUIRED');
  if (input.ephemeralAuthSucceeded !== true) return blocked('R2_EPHEMERAL_AUTH_SUCCESS_EVIDENCE_REQUIRED');
  if (input.filteredSubscriptionPrepared !== true) return blocked('FILTERED_POSTGRES_CHANGES_SUBSCRIPTION_REQUIRED');
  if (input.dataApiVisibilityProbePrepared !== true) return blocked('AUTHENTICATED_DATA_API_VISIBILITY_PROBE_REQUIRED');
  if (input.replicationSystemObservabilityPrepared !== true) return blocked('REPLICATION_SYSTEM_OBSERVABILITY_REQUIRED');
  if (input.currentSupabaseClientPrepared !== true) return blocked('CURRENT_SUPABASE_CLIENT_REQUIRED');
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_diagnostic_ready_new_authorization_required',
    reason: null,
    predecessorContractId: r2Recovery.CONTRACT_ID,
    allowedScope: ALLOWED_SCOPE,
    deferredTopics: DEFERRED_TOPICS,
    blockedTopics: BLOCKED_TOPICS,
    requiredSupabaseJsVersion: REQUIRED_SUPABASE_JS_VERSION,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    authIdentityLifecycleAuthority: false,
    realtimePublicationMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    diagnosticAuthority: false,
    persistentResidueAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

function evaluateStagingDiagnosticAuthorization(input = {}) {
  if (input.authorizationPhrase !== REQUIRED_AUTHORIZATION_PHRASE) return blocked('EXPLICIT_COM_B03B_R3_STAGING_AUTHORIZATION_REQUIRED');
  if (input.targetEnvironment !== 'staging') return blocked('STAGING_TARGET_REQUIRED');
  if (input.projectId !== REQUIRED_PROJECT_ID) return blocked('STAGING_PROJECT_MISMATCH');
  if (input.branch !== REQUIRED_BRANCH || input.pullRequest !== REQUIRED_PULL_REQUEST) return blocked('PULL_REQUEST_BOUNDARY_MISMATCH');
  if (input.authorizationConsumed === true || input.executionAttempted === true) return blocked('SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED');
  if (input.r2AuthorizationReusable !== false) return blocked('R2_AUTHORIZATION_REUSE_PROHIBITED');
  if (input.ephemeralAuthIdentityLifecycleAllowed !== true || input.authIdentityCleanupRequired !== true) return blocked('EPHEMERAL_AUTH_IDENTITY_LIFECYCLE_REQUIRED');
  if (input.publicationVerificationRequired !== true || input.publicationMutationAllowed === true) return blocked('PUBLICATION_VERIFY_ONLY_REQUIRED');
  if (input.filteredPostgresChangesSubscriptionRequired !== true) return blocked('FILTERED_POSTGRES_CHANGES_SUBSCRIPTION_REQUIRED');
  if (input.authenticatedDataApiVisibilityProbeRequired !== true) return blocked('AUTHENTICATED_DATA_API_VISIBILITY_PROBE_REQUIRED');
  if (input.replicationSystemObservabilityRequired !== true) return blocked('REPLICATION_SYSTEM_OBSERVABILITY_REQUIRED');
  if (input.syntheticDomainFixtureLifecycleAllowed !== true || input.syntheticDomainCleanupRequired !== true) return blocked('SYNTHETIC_DOMAIN_FIXTURE_LIFECYCLE_REQUIRED');
  if (input.persistentResidueAllowed === true) return blocked('ZERO_PERSISTENT_RESIDUE_REQUIRED');
  if (input.presenceOrTypingExecutionAllowed === true) return blocked('R3_COMMUNITY_POSTS_DIAGNOSTIC_ONLY');
  const scope = Array.isArray(input.scope) ? input.scope.slice().sort() : [];
  if (JSON.stringify(scope) !== JSON.stringify(ALLOWED_SCOPE.slice().sort())) return blocked('COM_B03B_R3_SCOPE_MISMATCH');

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'authorized_for_single_bounded_r3_staging_diagnostic',
    reason: null,
    projectId: REQUIRED_PROJECT_ID,
    branch: REQUIRED_BRANCH,
    pullRequest: REQUIRED_PULL_REQUEST,
    scope: ALLOWED_SCOPE,
    deferredTopics: DEFERRED_TOPICS,
    blockedTopics: BLOCKED_TOPICS,
    stagingReadAuthority: true,
    stagingMutationAuthority: true,
    authIdentityLifecycleAuthority: true,
    realtimePublicationMutationAuthority: false,
    realtimePublicationVerificationAuthority: true,
    realtimeSubscriptionAuthority: true,
    diagnosticAuthority: true,
    persistentResidueAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    singleUse: true,
    reusableAfterFailure: false,
    r2AuthorizationReusable: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  REQUIRED_PROJECT_ID,
  REQUIRED_BRANCH,
  REQUIRED_PULL_REQUEST,
  REQUIRED_AUTHORIZATION_PHRASE,
  ALLOWED_SCOPE,
  DEFERRED_TOPICS,
  BLOCKED_TOPICS,
  REQUIRED_SUPABASE_JS_VERSION,
  evaluateRepositoryRecovery,
  evaluateStagingDiagnosticAuthorization
});
