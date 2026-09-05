#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r2 = require('../backend/modules/communities/community-realtime-private-auth-r2');
const cfg = require('../config/com-b03c-r2-realtime-auth-predicate-ladder-readiness.json');

let checks = 0;
function ok(value, message) { assert.equal(Boolean(value), true, message); checks += 1; }
function eq(actual, expected, message) { assert.deepEqual(actual, expected, message); checks += 1; }

eq(r2.CONTRACT_ID, cfg.contractId, 'contract');
eq(r2.REQUIRED_PROJECT_ID, 'zwkczgewzbsorbrjuzpb', 'project');
eq(r2.REQUIRED_BRANCH, 'com/com-001-baseline-audit', 'branch');
eq(r2.REQUIRED_PULL_REQUEST, 61, 'pr');
eq(r2.REQUIRED_SUPABASE_JS_VERSION, '2.112.2', 'supabase-js');
eq(r2.REQUIRED_AUTHORIZATION_PHRASE, cfg.authorization.requiredPhrase, 'auth phrase');
eq([...r2.ALLOWED_SCOPE], cfg.design.scope, 'scope');
eq([...r2.BLOCKED_TOPICS], cfg.design.blockedTopics, 'blocked');
eq([...r2.PREDICATE_RUNGS], cfg.design.predicateRungs, 'rungs');
eq([...r2.DIAGNOSTIC_AXES], cfg.design.diagnosticAxes, 'axes');

const good = {
  predecessorValidationId: cfg.predecessor.validationId,
  predecessorStatus: cfg.predecessor.status,
  predecessorAuthorizationConsumed: cfg.predecessor.authorizationConsumed,
  predecessorAuthorizationReusable: cfg.predecessor.authorizationReusable,
  predecessorCleanupZeroResidue: cfg.predecessor.cleanupZeroResidue,
  r1PresenceClassification: cfg.predecessor.presenceClassification,
  r1TypingClassification: cfg.predecessor.typingClassification,
  readWriteAuthorizationSeparated: true,
  predicateRungs: cfg.design.predicateRungs,
  diagnosticAxes: cfg.design.diagnosticAxes,
  negativeControlPrepared: cfg.design.negativeControl.required,
  freshTopicPerRungPrepared: cfg.design.cacheIsolation.freshSyntheticTopicPerRung,
  freshRealtimeClientPerRungPrepared: cfg.design.cacheIsolation.freshRealtimeClientPerRung,
  jwtBeforeChannelCreationPrepared: cfg.design.cacheIsolation.jwtAppliedBeforeChannelCreation,
  presenceChannelBroadcastConfigOmitted: cfg.design.featureIsolation.presenceChannelBroadcastConfigOmitted,
  typingChannelPresenceDisabled: cfg.design.featureIsolation.typingChannelPresenceDisabled,
  policyLifecyclePerRungPrepared: cfg.design.policies.mutuallyExclusivePerRung && cfg.design.policies.droppedAfterEachRung,
  policyIntrospectionPerRungPrepared: cfg.design.policies.introspectedBeforeEachJoin,
  sanitizedDiagnosticsPrepared: cfg.design.diagnostics.sanitized,
  rawRemoteErrorPersistenceAllowed: cfg.design.diagnostics.rawRemoteErrorPersistenceAllowed,
  communityPostsExecutionPlanned: false,
  channelMessagesExecutionPlanned: false,
  domainMutationPlanned: false,
  publicationMutationPlanned: false
};

const ready = r2.evaluateRepositoryReadiness(good);
eq(ready.decision, 'repository_predicate_ladder_ready_new_authorization_required', 'repo ready');
eq(ready.repositoryReadinessAuthority, true, 'repo authority');
eq(ready.stagingReadAuthority, false, 'no staging read');
eq(ready.stagingMutationAuthority, false, 'no staging mutation');
eq(ready.authIdentityLifecycleAuthority, false, 'no auth lifecycle');
eq(ready.realtimePolicyLifecycleAuthority, false, 'no policy lifecycle');
eq(ready.realtimeSubscriptionAuthority, false, 'no subscription');
eq(ready.ephemeralRealtimeActionAuthority, false, 'no ephemeral action');
eq(ready.domainMutationAuthority, false, 'no domain mutation');
eq(ready.publicationMutationAuthority, false, 'no publication mutation');
eq(ready.productionAuthority, false, 'no production');
eq(ready.pullRequestMergeAuthority, false, 'no merge');

for (const [field, value, reason] of [
  ['predecessorStatus', 'wrong', 'COM_B03C_R1_FAIL_CLOSED_STATUS_REQUIRED'],
  ['predecessorAuthorizationConsumed', false, 'COM_B03C_R1_SINGLE_USE_HISTORY_REQUIRED'],
  ['predecessorCleanupZeroResidue', false, 'COM_B03C_R1_ZERO_RESIDUE_REQUIRED'],
  ['r1PresenceClassification', 'unknown_channel_join_failure', 'RLS_REJECTION_CLASSIFICATION_REQUIRED'],
  ['readWriteAuthorizationSeparated', false, 'READ_WRITE_AUTHORIZATION_SEPARATION_REQUIRED'],
  ['negativeControlPrepared', false, 'NEGATIVE_RLS_CONTROL_REQUIRED'],
  ['freshTopicPerRungPrepared', false, 'AUTHORIZATION_CACHE_ISOLATION_REQUIRED'],
  ['presenceChannelBroadcastConfigOmitted', false, 'PRESENCE_CHANNEL_BROADCAST_FEATURE_MUST_BE_OMITTED'],
  ['typingChannelPresenceDisabled', false, 'TYPING_CHANNEL_PRESENCE_MUST_BE_DISABLED'],
  ['policyLifecyclePerRungPrepared', false, 'PER_RUNG_POLICY_LIFECYCLE_REQUIRED'],
  ['sanitizedDiagnosticsPrepared', false, 'SANITIZED_DIAGNOSTICS_REQUIRED'],
  ['domainMutationPlanned', true, 'PERSISTENT_DOMAIN_OR_PUBLICATION_MUTATION_PROHIBITED']
]) {
  const bad = r2.evaluateRepositoryReadiness({ ...good, [field]: value });
  eq(bad.reason, reason, `blocked ${field}`);
}

const authGood = {
  authorizationPhrase: r2.REQUIRED_AUTHORIZATION_PHRASE,
  targetEnvironment: 'staging',
  projectId: r2.REQUIRED_PROJECT_ID,
  branch: r2.REQUIRED_BRANCH,
  pullRequest: r2.REQUIRED_PULL_REQUEST,
  authorizationConsumed: false,
  executionAttempted: false,
  predecessorAuthorizationReusable: false,
  scope: [...r2.ALLOWED_SCOPE],
  predicateRungs: [...r2.PREDICATE_RUNGS],
  diagnosticAxes: [...r2.DIAGNOSTIC_AXES],
  ephemeralAuthIdentityLifecycleAllowed: true,
  authIdentityCleanupRequired: true,
  realtimeMessagesPolicyLifecycleAllowed: true,
  realtimePolicyCleanupRequired: true,
  policyIntrospectionPerRungRequired: true,
  freshTopicPerRungRequired: true,
  freshRealtimeClientPerRungRequired: true,
  negativeControlRequired: true,
  sanitizedDiagnosticsRequired: true,
  jwtBeforeChannelCreationRequired: true,
  presenceChannelBroadcastConfigOmittedRequired: true,
  typingChannelPresenceDisabledRequired: true,
  communityPostsExecutionAllowed: false,
  channelMessagesExecutionAllowed: false,
  domainMutationAllowed: false,
  publicationMutationAllowed: false,
  persistentResidueAllowed: false,
  runtimeDeployAllowed: false,
  productionAllowed: false,
  mergeAllowed: false
};

const auth = r2.evaluateStagingAuthorization(authGood);
eq(auth.decision, 'authorized_for_single_bounded_realtime_authorization_predicate_ladder', 'staging auth');
eq(auth.singleUse, true, 'single use');
eq(auth.reusableAfterFailure, false, 'not reusable');
eq(auth.domainMutationAuthority, false, 'auth no domain');
eq(auth.publicationMutationAuthority, false, 'auth no publication');
eq(auth.productionAuthority, false, 'auth no production');
eq(auth.pullRequestMergeAuthority, false, 'auth no merge');

for (const [field, value, reason] of [
  ['authorizationPhrase', 'wrong', 'EXPLICIT_COM_B03C_R2_STAGING_AUTHORIZATION_REQUIRED'],
  ['targetEnvironment', 'production', 'STAGING_TARGET_MISMATCH'],
  ['projectId', 'wrong', 'STAGING_TARGET_MISMATCH'],
  ['branch', 'main', 'PULL_REQUEST_BOUNDARY_MISMATCH'],
  ['authorizationConsumed', true, 'SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED'],
  ['executionAttempted', true, 'SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED'],
  ['predecessorAuthorizationReusable', true, 'COM_B03C_R1_AUTHORIZATION_REUSE_PROHIBITED'],
  ['negativeControlRequired', false, 'COM_B03C_R2_REQUIRED_FLAG_MISSING'],
  ['communityPostsExecutionAllowed', true, 'COM_B03C_R2_PROHIBITED_FLAG_ENABLED'],
  ['domainMutationAllowed', true, 'COM_B03C_R2_PROHIBITED_FLAG_ENABLED'],
  ['productionAllowed', true, 'COM_B03C_R2_PROHIBITED_FLAG_ENABLED'],
  ['mergeAllowed', true, 'COM_B03C_R2_PROHIBITED_FLAG_ENABLED']
]) {
  const bad = r2.evaluateStagingAuthorization({ ...authGood, [field]: value });
  eq(bad.reason, reason, `auth blocked ${field}`);
}

eq(cfg.status, 'repository_predicate_ladder_certified_new_authorization_required', 'status');
eq(cfg.certification.localReadinessChecks, '65/65', 'local readiness metadata');
eq(cfg.certification.certifiedResult, 'success', 'certification result');
eq(cfg.certification.certifiedAuthorizeResult, 'skipped', 'authorize skipped');
eq(cfg.certification.certifiedCanaryResult, 'skipped', 'canary skipped');
eq(cfg.certification.stagingAccessExecuted, false, 'no staging access');
eq(cfg.certification.remoteEffectsExecuted, false, 'no remote effects');
eq(cfg.authority.repositoryReadinessAuthority, true, 'repository authority recorded');
eq(cfg.authorization.received, false, 'auth not received');
eq(cfg.authorization.consumed, false, 'auth not consumed');
eq(cfg.authorization.executionAttempted, false, 'not executed');
eq(cfg.authorization.triggerExists, false, 'no trigger');
eq(cfg.futureCanaryBoundary.communityPostsExecutionAllowed, false, 'no posts');
eq(cfg.futureCanaryBoundary.channelMessagesExecutionAllowed, false, 'no messages');
eq(cfg.futureCanaryBoundary.persistentResidueAllowed, false, 'no residue');
eq(cfg.futureCanaryBoundary.runtimeDeployAllowed, false, 'no deploy');
eq(cfg.futureCanaryBoundary.productionAllowed, false, 'no production cfg');
eq(cfg.futureCanaryBoundary.mergeAllowed, false, 'no merge cfg');

ok(checks >= 68, `expected >= 68 checks, got ${checks}`);
console.log(`COM-B03C-R2 readiness checks passed: ${checks}/${checks}`);
