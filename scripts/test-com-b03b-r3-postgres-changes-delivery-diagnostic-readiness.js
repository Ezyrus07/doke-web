#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r3 = require('../backend/modules/communities/community-realtime-postgres-changes-delivery-diagnostic-recovery');
const r2 = require('../backend/modules/communities/community-realtime-ephemeral-auth-recovery');
const config = require('../config/com-b03b-r3-postgres-changes-delivery-diagnostic-readiness.json');

let checks = 0;
function eq(actual, expected, label) { assert.deepEqual(actual, expected, label); checks += 1; }

eq(config.contractId, r3.CONTRACT_ID, 'config contract');
eq(config.rootCause.r2AuthorizationConsumed, true, 'r2 consumed');
eq(config.rootCause.r2AuthorizationReusableAfterFailure, false, 'r2 non-reusable');
eq(config.rootCause.code, 'DOKE_COM_B03B_R2_POSTGRES_CHANGES_TIMEOUT', 'r2 timeout');
eq(config.rootCause.persistentDomainResidue, 0, 'domain zero residue');
eq(config.rootCause.persistentIdentityResidue, 0, 'identity zero residue');
eq(config.rootCause.ephemeralAuthSucceeded, true, 'ephemeral auth succeeded');
eq(config.rootCause.communityPostsPublicationObserved, true, 'publication observed');
eq(config.diagnosticPlan.supabaseJsVersion, r3.REQUIRED_SUPABASE_JS_VERSION, 'current client pinned');
eq(config.diagnosticPlan.serverBindingIdRequired, true, 'binding id required');
eq(config.diagnosticPlan.postgresChangesSystemStatusRequired, true, 'postgres system status required');
eq(config.diagnosticPlan.replicationConnectionReadyStatusRequired, true, 'replication ready required');
eq(config.diagnosticPlan.authenticatedDataApiVisibilityProbeRequired, true, 'data api probe required');
eq(config.diagnosticPlan.presenceOrTypingExecutionAllowed, false, 'ephemeral topics deferred');
eq(config.authorization.received, false, 'authorization not received');
eq(config.authorization.consumed, false, 'authorization not consumed');
eq(config.authorization.executionAttempted, false, 'execution not attempted');

const ready = r3.evaluateRepositoryRecovery({
  r2ContractId: r2.CONTRACT_ID,
  r2AuthorizationConsumed: true,
  r2ReusableAfterFailure: false,
  r2FailureCode: 'DOKE_COM_B03B_R2_POSTGRES_CHANGES_TIMEOUT',
  r2PersistentDomainResidue: 0,
  r2PersistentIdentityResidue: 0,
  communityPostsPublicationObserved: true,
  ephemeralAuthSucceeded: true,
  filteredSubscriptionPrepared: true,
  dataApiVisibilityProbePrepared: true,
  replicationSystemObservabilityPrepared: true,
  currentSupabaseClientPrepared: true
});
eq(ready.decision, 'repository_diagnostic_ready_new_authorization_required', 'repo ready');
eq(ready.stagingMutationAuthority, false, 'no staging authority before trigger');
eq(ready.diagnosticAuthority, false, 'no diagnostic authority before trigger');

const base = {
  authorizationPhrase: r3.REQUIRED_AUTHORIZATION_PHRASE,
  targetEnvironment: 'staging',
  projectId: r3.REQUIRED_PROJECT_ID,
  branch: r3.REQUIRED_BRANCH,
  pullRequest: r3.REQUIRED_PULL_REQUEST,
  authorizationConsumed: false,
  executionAttempted: false,
  r2AuthorizationReusable: false,
  ephemeralAuthIdentityLifecycleAllowed: true,
  authIdentityCleanupRequired: true,
  publicationVerificationRequired: true,
  publicationMutationAllowed: false,
  filteredPostgresChangesSubscriptionRequired: true,
  authenticatedDataApiVisibilityProbeRequired: true,
  replicationSystemObservabilityRequired: true,
  syntheticDomainFixtureLifecycleAllowed: true,
  syntheticDomainCleanupRequired: true,
  persistentResidueAllowed: false,
  presenceOrTypingExecutionAllowed: false,
  scope: r3.ALLOWED_SCOPE
};

for (const [label, patch, reason] of [
  ['wrong auth', { authorizationPhrase: 'wrong' }, 'EXPLICIT_COM_B03B_R3_STAGING_AUTHORIZATION_REQUIRED'],
  ['production', { targetEnvironment: 'production' }, 'STAGING_TARGET_REQUIRED'],
  ['project', { projectId: 'wrong' }, 'STAGING_PROJECT_MISMATCH'],
  ['consumed', { authorizationConsumed: true }, 'SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED'],
  ['r2 reuse', { r2AuthorizationReusable: true }, 'R2_AUTHORIZATION_REUSE_PROHIBITED'],
  ['publication mutation', { publicationMutationAllowed: true }, 'PUBLICATION_VERIFY_ONLY_REQUIRED'],
  ['no filter', { filteredPostgresChangesSubscriptionRequired: false }, 'FILTERED_POSTGRES_CHANGES_SUBSCRIPTION_REQUIRED'],
  ['no data api probe', { authenticatedDataApiVisibilityProbeRequired: false }, 'AUTHENTICATED_DATA_API_VISIBILITY_PROBE_REQUIRED'],
  ['no system observability', { replicationSystemObservabilityRequired: false }, 'REPLICATION_SYSTEM_OBSERVABILITY_REQUIRED'],
  ['presence execution', { presenceOrTypingExecutionAllowed: true }, 'R3_COMMUNITY_POSTS_DIAGNOSTIC_ONLY'],
  ['wrong scope', { scope: ['community_posts', 'channel_presence'] }, 'COM_B03B_R3_SCOPE_MISMATCH']
]) {
  eq(r3.evaluateStagingDiagnosticAuthorization({ ...base, ...patch }).reason, reason, label);
}

const authorized = r3.evaluateStagingDiagnosticAuthorization(base);
eq(authorized.decision, 'authorized_for_single_bounded_r3_staging_diagnostic', 'authorized');
eq(authorized.realtimePublicationMutationAuthority, false, 'no publication mutation');
eq(authorized.realtimeSubscriptionAuthority, true, 'subscription authority');
eq(authorized.diagnosticAuthority, true, 'diagnostic authority');
eq(authorized.productionAuthority, false, 'no production');
eq(authorized.pullRequestMergeAuthority, false, 'no merge');
eq(authorized.singleUse, true, 'single use');
eq(authorized.reusableAfterFailure, false, 'not reusable');

console.log(`COM-B03B-R3 Postgres Changes delivery diagnostic readiness passed: ${checks}/${checks}`);
