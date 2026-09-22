#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const r3 = require('../backend/modules/communities/community-realtime-private-auth-r3');
const cfg = require('../config/com-b03c-r3-corrected-realtime-auth-predicate-ladder-readiness.json');

let checks = 0;
function ok(value, message) { assert.equal(Boolean(value), true, message); checks += 1; }
function eq(actual, expected, message) { assert.deepEqual(actual, expected, message); checks += 1; }

const executorPath = path.resolve(__dirname, 'execute-com-b03c-r3-corrected-realtime-auth-predicate-ladder-staging-canary.js');
const verifierPath = path.resolve(__dirname, 'verify-com-b03c-r3-corrected-realtime-auth-predicate-ladder-staging-canary-evidence.js');
const executor = fs.readFileSync(executorPath, 'utf8');
const verifier = fs.readFileSync(verifierPath, 'utf8');

eq(r3.CONTRACT_ID, cfg.contractId, 'contract');
eq(r3.REQUIRED_PROJECT_ID, 'zwkczgewzbsorbrjuzpb', 'project');
eq(r3.REQUIRED_BRANCH, 'com/com-001-baseline-audit', 'branch');
eq(r3.REQUIRED_PULL_REQUEST, 61, 'pr');
eq(r3.REQUIRED_SUPABASE_JS_VERSION, '2.112.2', 'supabase-js');
eq(r3.REQUIRED_AUTHORIZATION_PHRASE, cfg.authorization.requiredPhrase, 'auth phrase');
eq([...r3.ALLOWED_SCOPE], cfg.design.scope, 'scope');
eq([...r3.BLOCKED_TOPICS], cfg.design.blockedTopics, 'blocked');
eq([...r3.PREDICATE_RUNGS], cfg.design.predicateRungs, 'rungs');
eq([...r3.DIAGNOSTIC_AXES], cfg.design.diagnosticAxes, 'axes');
eq(r3.POLICY_PREFIX, cfg.design.policies.prefix, 'policy prefix');
eq(r3.AUTH_EMAIL_PREFIX, cfg.design.identity.emailPrefix, 'auth email prefix');
eq(r3.AUTH_EMAIL_SUFFIX, cfg.design.identity.emailSuffix, 'auth email suffix');
eq(r3.AUTH_USER_PURPOSE, cfg.design.identity.purpose, 'auth purpose');

const good = {
  predecessorValidationId: cfg.predecessor.validationId,
  predecessorStatus: cfg.predecessor.status,
  r2AuthorizationConsumed: cfg.predecessor.r2AuthorizationConsumed,
  r2AuthorizationReusable: cfg.predecessor.r2AuthorizationReusable,
  r2PredicateConclusionValid: cfg.predecessor.r2PredicateConclusionValid,
  r2RootCauseClass: cfg.predecessor.r2RootCauseClass,
  r2aZeroResidueProven: cfg.predecessor.r2aZeroResidueProven,
  listenerRegistrationBeforeSubscribePrepared: cfg.design.listenerOrderingRecovery.listenerRegistrationBeforeSubscribe,
  waiterTimerArmedOnlyAfterActionPrepared: cfg.design.listenerOrderingRecovery.waiterTimerArmedOnlyAfterAction,
  earlyEventBufferPrepared: cfg.design.listenerOrderingRecovery.earlyEventBuffer,
  outerCleanupFallbackPrepared: cfg.design.policies.outerCleanupFallback && cfg.design.identity.outerCleanupFallback,
  perRungCleanupPrepared: cfg.design.policies.droppedAfterEachRung,
  allCreatedPolicyDefinitionsTracked: cfg.design.policies.allCreatedDefinitionsTrackedGlobally,
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
  reportAlwaysWrittenPrepared: cfg.design.diagnostics.reportAlwaysWritten,
  artifactAlwaysUploadedPrepared: cfg.design.diagnostics.artifactAlwaysUploaded,
  communityPostsExecutionPlanned: false,
  channelMessagesExecutionPlanned: false,
  domainMutationPlanned: false,
  publicationMutationPlanned: false,
  runtimeDeployPlanned: false,
  productionPlanned: false,
  mergePlanned: false
};

const ready = r3.evaluateRepositoryReadiness(good);
eq(ready.decision, 'repository_corrected_predicate_ladder_ready_new_authorization_required', 'repo ready');
eq(ready.repositoryReadinessAuthority, true, 'repo authority');
for (const key of [
  'stagingReadAuthority','stagingMutationAuthority','authIdentityLifecycleAuthority','realtimePolicyLifecycleAuthority',
  'realtimeSubscriptionAuthority','ephemeralRealtimeActionAuthority','domainMutationAuthority','publicationMutationAuthority',
  'persistentResidueAuthority','runtimeDeployAuthority','productionAuthority','pullRequestMergeAuthority'
]) eq(ready[key], false, `repo ${key} false`);

for (const [field, value, reason] of [
  ['predecessorValidationId', 'wrong', 'COM_B03C_R2A_EVIDENCE_REQUIRED'],
  ['predecessorStatus', 'wrong', 'COM_B03C_R2A_ZERO_RESIDUE_STATUS_REQUIRED'],
  ['r2AuthorizationConsumed', false, 'COM_B03C_R2_SINGLE_USE_HISTORY_REQUIRED'],
  ['r2PredicateConclusionValid', true, 'COM_B03C_R2_INVALID_DIAGNOSTIC_HISTORY_REQUIRED'],
  ['r2RootCauseClass', 'wrong', 'COM_B03C_R2_LISTENER_ORDER_ROOT_CAUSE_REQUIRED'],
  ['r2aZeroResidueProven', false, 'COM_B03C_R2A_ZERO_RESIDUE_PROOF_REQUIRED'],
  ['listenerRegistrationBeforeSubscribePrepared', false, 'PRE_SUBSCRIBE_LISTENER_REGISTRATION_REQUIRED'],
  ['waiterTimerArmedOnlyAfterActionPrepared', false, 'POST_ACTION_WAITER_ARMING_REQUIRED'],
  ['earlyEventBufferPrepared', false, 'EARLY_EVENT_BUFFER_REQUIRED'],
  ['outerCleanupFallbackPrepared', false, 'REDUNDANT_CLEANUP_BOUNDARY_REQUIRED'],
  ['allCreatedPolicyDefinitionsTracked', false, 'GLOBAL_POLICY_TRACKING_REQUIRED'],
  ['readWriteAuthorizationSeparated', false, 'READ_WRITE_AUTHORIZATION_SEPARATION_REQUIRED'],
  ['negativeControlPrepared', false, 'NEGATIVE_RLS_CONTROL_REQUIRED'],
  ['freshTopicPerRungPrepared', false, 'AUTHORIZATION_CACHE_ISOLATION_REQUIRED'],
  ['jwtBeforeChannelCreationPrepared', false, 'JWT_BEFORE_CHANNEL_CREATION_REQUIRED'],
  ['policyLifecyclePerRungPrepared', false, 'PER_RUNG_POLICY_LIFECYCLE_REQUIRED'],
  ['sanitizedDiagnosticsPrepared', false, 'SANITIZED_DIAGNOSTICS_REQUIRED'],
  ['reportAlwaysWrittenPrepared', false, 'FAIL_CLOSED_EVIDENCE_PERSISTENCE_REQUIRED'],
  ['domainMutationPlanned', true, 'PERSISTENT_OR_DEPLOYMENT_MUTATION_PROHIBITED'],
  ['runtimeDeployPlanned', true, 'PERSISTENT_OR_DEPLOYMENT_MUTATION_PROHIBITED']
]) {
  const bad = r3.evaluateRepositoryReadiness({ ...good, [field]: value });
  eq(bad.reason, reason, `blocked ${field}`);
}

const authGood = {
  authorizationPhrase: r3.REQUIRED_AUTHORIZATION_PHRASE,
  targetEnvironment: 'staging',
  projectId: r3.REQUIRED_PROJECT_ID,
  branch: r3.REQUIRED_BRANCH,
  pullRequest: r3.REQUIRED_PULL_REQUEST,
  authorizationConsumed: false,
  executionAttempted: false,
  predecessorAuthorizationReusable: false,
  scope: [...r3.ALLOWED_SCOPE],
  predicateRungs: [...r3.PREDICATE_RUNGS],
  diagnosticAxes: [...r3.DIAGNOSTIC_AXES],
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
  listenerRegistrationBeforeSubscribeRequired: true,
  waiterTimerArmedOnlyAfterActionRequired: true,
  earlyEventBufferRequired: true,
  perRungCleanupRequired: true,
  outerCleanupFallbackRequired: true,
  globalPolicyTrackingRequired: true,
  postExecutionZeroResidueVerificationRequired: true,
  reportAlwaysWrittenRequired: true,
  communityPostsExecutionAllowed: false,
  channelMessagesExecutionAllowed: false,
  domainMutationAllowed: false,
  publicationMutationAllowed: false,
  persistentResidueAllowed: false,
  runtimeDeployAllowed: false,
  productionAllowed: false,
  mergeAllowed: false,
  realUserMutationAllowed: false
};

const auth = r3.evaluateStagingAuthorization(authGood);
eq(auth.decision, 'authorized_for_single_bounded_corrected_realtime_authorization_predicate_ladder', 'staging auth');
eq(auth.singleUse, true, 'single use');
eq(auth.reusableAfterFailure, false, 'not reusable');
eq(auth.domainMutationAuthority, false, 'auth no domain');
eq(auth.publicationMutationAuthority, false, 'auth no publication');
eq(auth.runtimeDeployAuthority, false, 'auth no deploy');
eq(auth.productionAuthority, false, 'auth no production');
eq(auth.pullRequestMergeAuthority, false, 'auth no merge');

for (const [field, value, reason] of [
  ['authorizationPhrase', 'wrong', 'EXPLICIT_COM_B03C_R3_STAGING_AUTHORIZATION_REQUIRED'],
  ['targetEnvironment', 'production', 'STAGING_TARGET_MISMATCH'],
  ['projectId', 'wrong', 'STAGING_TARGET_MISMATCH'],
  ['branch', 'main', 'PULL_REQUEST_BOUNDARY_MISMATCH'],
  ['authorizationConsumed', true, 'SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED'],
  ['executionAttempted', true, 'SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED'],
  ['predecessorAuthorizationReusable', true, 'COM_B03C_R2_OR_R2A_AUTHORIZATION_REUSE_PROHIBITED'],
  ['listenerRegistrationBeforeSubscribeRequired', false, 'COM_B03C_R3_REQUIRED_FLAG_MISSING'],
  ['outerCleanupFallbackRequired', false, 'COM_B03C_R3_REQUIRED_FLAG_MISSING'],
  ['communityPostsExecutionAllowed', true, 'COM_B03C_R3_PROHIBITED_FLAG_ENABLED'],
  ['persistentResidueAllowed', true, 'COM_B03C_R3_PROHIBITED_FLAG_ENABLED'],
  ['productionAllowed', true, 'COM_B03C_R3_PROHIBITED_FLAG_ENABLED'],
  ['mergeAllowed', true, 'COM_B03C_R3_PROHIBITED_FLAG_ENABLED']
]) {
  const bad = r3.evaluateStagingAuthorization({ ...authGood, [field]: value });
  eq(bad.reason, reason, `auth blocked ${field}`);
}

eq(cfg.status, 'repository_corrected_predicate_ladder_certified_new_authorization_required', 'status');
eq(cfg.implementation.implementationCommit, 'c54854832cecb25c64bb2aaf990eba8d2088fc2e', 'implementation commit');
eq(cfg.certification.localReadinessChecks, '96/96', 'local readiness');
eq(cfg.certification.initialRunId, 31287527733, 'initial run');
eq(cfg.certification.initialCertifyJobId, 93178960607, 'initial certify');
eq(cfg.certification.initialCertifyResult, 'success', 'initial certify result');
eq(cfg.certification.initialAuthorizeResult, 'skipped', 'initial authorize skipped');
eq(cfg.certification.initialCanaryResult, 'skipped', 'initial canary skipped');
eq(cfg.certification.stagingAccessExecuted, false, 'no staging in certification');
eq(cfg.certification.remoteEffectsExecuted, false, 'no remote effects in certification');
eq(cfg.authority.repositoryReadinessAuthority, true, 'repository authority certified');
eq(cfg.authorization.received, false, 'auth not received');
eq(cfg.authorization.consumed, false, 'auth not consumed');
eq(cfg.authorization.executionAttempted, false, 'not executed');
eq(cfg.authorization.triggerExists, false, 'no trigger');
eq(cfg.predecessor.r2aZeroResidueProven, true, 'predecessor clean');
eq(cfg.futureCanaryBoundary.communityPostsExecutionAllowed, false, 'no posts');
eq(cfg.futureCanaryBoundary.channelMessagesExecutionAllowed, false, 'no messages');
eq(cfg.futureCanaryBoundary.persistentResidueAllowed, false, 'no residue');
eq(cfg.futureCanaryBoundary.runtimeDeployAllowed, false, 'no deploy');
eq(cfg.futureCanaryBoundary.productionAllowed, false, 'no production cfg');
eq(cfg.futureCanaryBoundary.mergeAllowed, false, 'no merge cfg');
eq(cfg.futureCanaryBoundary.realUserMutationAllowed, false, 'no real user mutation');

ok(/function preparePresenceObserver\(channel\)/.test(executor), 'presence observer helper');
ok(/function prepareBroadcastObserver\(channel/.test(executor), 'broadcast observer helper');
ok(/const observer = preparePresenceObserver\(channel\);[\s\S]{0,1200}const join = await subscribe\(channel\)/.test(executor), 'presence observer before subscribe');
ok(/const observer = prepareBroadcastObserver\(channel, 'typing_started'\);[\s\S]{0,1200}const join = await subscribe\(channel\)/.test(executor), 'broadcast observer before subscribe');
ok(!/function waitPresence\(/.test(executor), 'legacy post-subscribe presence waiter removed');
ok(!/function waitBroadcast\(/.test(executor), 'legacy post-subscribe broadcast waiter removed');
ok(/allDefinitionGroups\.push\(definitions\)/.test(executor), 'global definitions tracked');
ok(/cleanupAllPolicies/.test(executor), 'outer policy cleanup fallback');
ok(/postExecutionZeroResidue/.test(executor), 'post execution residue verification');
ok(/reportAlwaysWritten: true/.test(executor), 'always-report harness flag');
ok(/rawRemoteErrorExposed: false/.test(executor), 'sanitized executor');
ok(/assert\.equal\(evidence\.cleanup\?\.zeroResidueProven, true\)/.test(verifier), 'verifier requires zero residue');
ok(/listenerRegistrationBeforeSubscribe/.test(verifier), 'verifier listener ordering');

ok(checks >= 95, `expected >= 95 checks, got ${checks}`);
console.log(`COM-B03C-R3 corrected predicate ladder readiness checks passed: ${checks}/${checks}`);
