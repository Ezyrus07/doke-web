#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const recovery = require('../backend/modules/communities/community-realtime-private-auth-r1');
const config = require('../config/com-b03c-r1-private-realtime-auth-recovery-readiness.json');
let checks = 0;
const eq = (a,b,label) => { assert.deepEqual(a,b,label); checks += 1; };

eq(config.contractId, recovery.CONTRACT_ID, 'contract');
eq(config.predecessor.status, 'failed_closed_private_presence_subscription', 'predecessor status');
eq(config.predecessor.authorizationConsumed, true, 'predecessor consumed');
eq(config.predecessor.authorizationReusable, false, 'predecessor non-reusable');
eq(config.predecessor.persistentIdentityResidue, 0, 'identity clean');
eq(config.predecessor.persistentDomainResidue, 0, 'domain clean');
eq(config.diagnosticPlan.sanitizedSubscribeDiagnosticsRequired, true, 'sanitized diagnostics');
eq(config.diagnosticPlan.rawSubscribeErrorInEvidenceAllowed, false, 'raw error prohibited');
eq(config.diagnosticPlan.explicitPresenceEnabledRequired, true, 'presence enabled');
eq(config.diagnosticPlan.noOrphanedPresenceWaiterRequired, true, 'no orphan waiter');
eq(config.diagnosticPlan.policyIntrospectionRequired, true, 'policy introspection');
eq(config.diagnosticPlan.separatePresenceTypingDiagnosticsRequired, true, 'separate diagnostics');
eq(config.diagnosticPlan.jwtBeforeChannelSubscriptionRequired, true, 'jwt ordering');
eq(config.diagnosticPlan.domainMutationAllowed, false, 'no domain mutation');
eq(config.diagnosticPlan.publicationMutationAllowed, false, 'no publication mutation');
eq(config.authorization.received, false, 'authorization not received');
eq(config.authorization.consumed, false, 'authorization not consumed');
eq(config.authorization.executionAttempted, false, 'execution not attempted');

const ready = recovery.evaluateRepositoryRecovery({
  predecessorStatus: config.predecessor.status,
  predecessorAuthorizationConsumed: config.predecessor.authorizationConsumed,
  predecessorAuthorizationReusable: config.predecessor.authorizationReusable,
  cleanupZeroResidue: config.predecessor.persistentIdentityResidue === 0 && config.predecessor.persistentDomainResidue === 0,
  sanitizedSubscribeDiagnosticsPrepared: true,
  orphanPresenceWaiterRemoved: true,
  explicitPresenceEnabledPrepared: true,
  policyIntrospectionPrepared: true,
  separatePresenceTypingDiagnosticsPrepared: true,
  jwtBeforeChannelSubscriptionPrepared: true,
  domainMutationPlanned: false,
  publicationMutationPlanned: false
});
eq(ready.decision, 'repository_private_realtime_authorization_diagnostic_ready_new_authorization_required', 'repository ready');
eq(ready.stagingMutationAuthority, false, 'repository no staging authority');
eq(ready.domainMutationAuthority, false, 'repository no domain authority');

const packet = {
  authorizationPhrase: recovery.REQUIRED_AUTHORIZATION_PHRASE,
  targetEnvironment: 'staging',
  projectId: recovery.REQUIRED_PROJECT_ID,
  branch: recovery.REQUIRED_BRANCH,
  pullRequest: recovery.REQUIRED_PULL_REQUEST,
  authorizationConsumed: false,
  executionAttempted: false,
  predecessorAuthorizationReusable: false,
  scope: recovery.ALLOWED_SCOPE,
  ephemeralAuthIdentityLifecycleAllowed: true,
  authIdentityCleanupRequired: true,
  realtimeMessagesPolicyLifecycleAllowed: true,
  realtimePolicyCleanupRequired: true,
  policyIntrospectionRequired: true,
  sanitizedSubscribeDiagnosticsRequired: true,
  explicitPresenceEnabledRequired: true,
  noOrphanedPresenceWaiterRequired: true,
  separatePresenceTypingDiagnosticsRequired: true,
  jwtBeforeChannelSubscriptionRequired: true,
  communityPostsExecutionAllowed: false,
  channelMessagesExecutionAllowed: false,
  domainMutationAllowed: false,
  publicationMutationAllowed: false,
  persistentResidueAllowed: false
};
const negatives = [
  [{authorizationPhrase:'wrong'}, 'EXPLICIT_COM_B03C_R1_STAGING_AUTHORIZATION_REQUIRED'],
  [{targetEnvironment:'production'}, 'STAGING_TARGET_REQUIRED'],
  [{projectId:'wrong'}, 'STAGING_PROJECT_MISMATCH'],
  [{branch:'main'}, 'PULL_REQUEST_BOUNDARY_MISMATCH'],
  [{authorizationConsumed:true}, 'SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED'],
  [{predecessorAuthorizationReusable:true}, 'COM_B03C_AUTHORIZATION_REUSE_PROHIBITED'],
  [{scope:['channel_presence']}, 'COM_B03C_R1_SCOPE_MISMATCH'],
  [{authIdentityCleanupRequired:false}, 'EPHEMERAL_AUTH_IDENTITY_LIFECYCLE_REQUIRED'],
  [{realtimePolicyCleanupRequired:false}, 'TEMPORARY_REALTIME_POLICY_LIFECYCLE_REQUIRED'],
  [{policyIntrospectionRequired:false}, 'DIAGNOSTIC_OBSERVABILITY_REQUIRED'],
  [{explicitPresenceEnabledRequired:false}, 'PRESENCE_HARNESS_RECOVERY_REQUIRED'],
  [{separatePresenceTypingDiagnosticsRequired:false}, 'PRIVATE_CHANNEL_DIAGNOSTIC_SEPARATION_REQUIRED'],
  [{communityPostsExecutionAllowed:true}, 'OUT_OF_SCOPE_EXECUTION_PROHIBITED'],
  [{channelMessagesExecutionAllowed:true}, 'OUT_OF_SCOPE_EXECUTION_PROHIBITED'],
  [{domainMutationAllowed:true}, 'DOMAIN_MUTATION_PROHIBITED'],
  [{publicationMutationAllowed:true}, 'PUBLICATION_MUTATION_PROHIBITED'],
  [{persistentResidueAllowed:true}, 'ZERO_PERSISTENT_RESIDUE_REQUIRED']
];
for (const [patch, reason] of negatives) eq(recovery.evaluateStagingDiagnosticAuthorization({...packet,...patch}).reason, reason, reason);

const auth = recovery.evaluateStagingDiagnosticAuthorization(packet);
eq(auth.decision, 'authorized_for_single_bounded_private_realtime_authorization_diagnostic', 'future auth');
eq(auth.authIdentityLifecycleAuthority, true, 'auth lifecycle');
eq(auth.realtimePolicyLifecycleAuthority, true, 'policy lifecycle');
eq(auth.realtimeSubscriptionAuthority, true, 'subscription');
eq(auth.domainMutationAuthority, false, 'no domain');
eq(auth.publicationMutationAuthority, false, 'no publication');
eq(auth.productionAuthority, false, 'no production');
eq(auth.pullRequestMergeAuthority, false, 'no merge');
eq(auth.singleUse, true, 'single use');

eq(recovery.classifySubscribeFailure('CHANNEL_ERROR', new Error('new row violates row-level security policy')).classification,
   'realtime_rls_authorization_rejected', 'classifies RLS');
eq(recovery.classifySubscribeFailure('CHANNEL_ERROR', new Error('invalid JWT token')).classification,
   'jwt_or_auth_context_rejected', 'classifies jwt');
eq(recovery.classifySubscribeFailure('TIMED_OUT', null).classification, 'channel_join_timeout', 'classifies timeout');
eq(recovery.classifySubscribeFailure('CLOSED', null).classification, 'channel_closed_during_join', 'classifies closed');
console.log(`COM-B03C-R1 private Realtime authorization recovery readiness passed: ${checks}/${checks}`);
