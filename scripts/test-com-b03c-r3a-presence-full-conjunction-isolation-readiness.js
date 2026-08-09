#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r3a = require('../backend/modules/communities/community-realtime-private-auth-r3a');
const cfg = require('../config/com-b03c-r3a-presence-full-conjunction-isolation-readiness.json');

let checks = 0;
function eq(actual, expected, message) { assert.deepEqual(actual, expected, message); checks += 1; }

eq(r3a.CONTRACT_ID, cfg.contractId, 'contract');
eq(r3a.REQUIRED_BRANCH, cfg.checkpoint.branch, 'branch');
eq(r3a.REQUIRED_PULL_REQUEST, cfg.checkpoint.pullRequest, 'pr');
eq(r3a.PREDECESSOR_VALIDATION_ID, cfg.predecessor.validationId, 'predecessor id');
eq(r3a.PREDECESSOR_STATUS, cfg.predecessor.status, 'predecessor status');
eq(r3a.FAILURE_CLASS, cfg.predecessor.observedFailureClass, 'failure class');
eq([...r3a.ISOLATION_CASES], cfg.design.isolationCases, 'case order');

const good = {
  predecessorValidationId: cfg.predecessor.validationId,
  predecessorStatus: cfg.predecessor.status,
  r3AuthorizationConsumed: cfg.predecessor.authorizationConsumed,
  r3AuthorizationReusable: cfg.predecessor.authorizationReusable,
  r3PredicateConclusionValid: cfg.predecessor.predicateConclusionValid,
  r3ZeroResidueProven: cfg.predecessor.zeroResidueProven,
  typingFullConjunctionReadProven: cfg.predecessor.typingFullConjunctionReadProven,
  typingFullConjunctionWriteProven: cfg.predecessor.typingFullConjunctionWriteProven,
  presenceFullConjunctionReadProven: cfg.predecessor.presenceFullConjunctionReadProven,
  presenceFullConjunctionWriteProven: cfg.predecessor.presenceFullConjunctionWriteProven,
  observedFailureClass: cfg.predecessor.observedFailureClass,
  exactCombinedPredicateCauseIsolated: cfg.predecessor.exactCombinedPredicateCauseIsolated,
  isolationCases: cfg.design.isolationCases,
  presenceOnly: cfg.design.scope.length === 1 && cfg.design.scope[0] === 'channel_presence',
  readJoinOnly: cfg.design.axis.length === 1 && cfg.design.axis[0] === 'read_join',
  sameAuthIdentityAcrossCases: cfg.design.sameContextControls.sameAuthIdentityAcrossCases,
  sameTopicAcrossCases: cfg.design.sameContextControls.sameTopicAcrossCases,
  freshRealtimeClientPerCase: cfg.design.sameContextControls.freshRealtimeClientPerCase,
  insertControlPredicateTrue: cfg.design.policyControls.insertControlPredicate === 'true',
  writeActionExecuted: cfg.design.sameContextControls.writeActionExecuted,
  temporarySelectPolicyPerCase: cfg.design.policyControls.temporarySelectPolicyPerCase,
  dropPolicyAfterEachCase: cfg.design.policyControls.dropPolicyAfterEachCase,
  policyIntrospectionPerCase: cfg.design.policyControls.policyIntrospectionPerCase,
  negativeControlPrepared: cfg.design.policyControls.negativeControlPrepared,
  sanitizedDiagnosticsPrepared: cfg.design.diagnostics.sanitized,
  rawRemoteErrorPersistenceAllowed: cfg.design.diagnostics.rawRemoteErrorPersistenceAllowed,
  futureStagingAuthorizationDefined: cfg.authorization.futureStagingAuthorizationDefined,
  triggerExists: cfg.authorization.triggerExists,
  stagingExecutorExists: cfg.authorization.stagingExecutorExists,
  stagingWorkflowExists: cfg.authorization.stagingWorkflowExists,
  communityPostsExecutionPlanned: cfg.outOfScope.communityPostsExecutionPlanned,
  channelMessagesExecutionPlanned: cfg.outOfScope.channelMessagesExecutionPlanned,
  domainMutationPlanned: cfg.outOfScope.domainMutationPlanned,
  publicationMutationPlanned: cfg.outOfScope.publicationMutationPlanned,
  runtimeDeployPlanned: cfg.outOfScope.runtimeDeployPlanned,
  productionPlanned: cfg.outOfScope.productionPlanned,
  mergePlanned: cfg.outOfScope.mergePlanned
};

const ready = r3a.evaluateRepositoryReadiness(good);
eq(ready.decision, 'repository_presence_full_conjunction_isolation_ready_no_staging_authority', 'repo ready');
eq(ready.repositoryReadinessAuthority, true, 'repo authority');
for (const key of [
  'stagingReadAuthority','stagingMutationAuthority','authIdentityLifecycleAuthority',
  'realtimePolicyLifecycleAuthority','realtimeSubscriptionAuthority','domainMutationAuthority',
  'publicationMutationAuthority','runtimeDeployAuthority','productionAuthority','pullRequestMergeAuthority'
]) eq(ready[key], false, `${key} false`);

for (const [field, value, reason] of [
  ['predecessorValidationId', 'wrong', 'COM_B03C_R3_EVIDENCE_REQUIRED'],
  ['predecessorStatus', 'wrong', 'COM_B03C_R3_DIAGNOSTIC_STATUS_REQUIRED'],
  ['r3AuthorizationConsumed', false, 'COM_B03C_R3_SINGLE_USE_HISTORY_REQUIRED'],
  ['r3AuthorizationReusable', true, 'COM_B03C_R3_SINGLE_USE_HISTORY_REQUIRED'],
  ['r3PredicateConclusionValid', false, 'COM_B03C_R3_VALID_DIAGNOSTIC_REQUIRED'],
  ['r3ZeroResidueProven', false, 'COM_B03C_R3_ZERO_RESIDUE_REQUIRED'],
  ['typingFullConjunctionReadProven', false, 'COM_B03C_R3_TYPING_CONTROL_REQUIRED'],
  ['presenceFullConjunctionReadProven', true, 'COM_B03C_R3_PRESENCE_SPLIT_RESULT_REQUIRED'],
  ['presenceFullConjunctionWriteProven', false, 'COM_B03C_R3_PRESENCE_SPLIT_RESULT_REQUIRED'],
  ['observedFailureClass', 'wrong', 'COM_B03C_R3_FAILURE_CLASS_REQUIRED'],
  ['exactCombinedPredicateCauseIsolated', true, 'COM_B03C_R3_CAUSE_MUST_REMAIN_UNRESOLVED'],
  ['presenceOnly', false, 'PRESENCE_READ_JOIN_ONLY_REQUIRED'],
  ['readJoinOnly', false, 'PRESENCE_READ_JOIN_ONLY_REQUIRED'],
  ['sameAuthIdentityAcrossCases', false, 'SAME_CONTEXT_CONTROL_REQUIRED'],
  ['sameTopicAcrossCases', false, 'SAME_CONTEXT_CONTROL_REQUIRED'],
  ['freshRealtimeClientPerCase', false, 'FRESH_CLIENT_PER_CASE_REQUIRED'],
  ['insertControlPredicateTrue', false, 'READ_AXIS_CONTROL_REQUIRED'],
  ['writeActionExecuted', true, 'READ_AXIS_CONTROL_REQUIRED'],
  ['temporarySelectPolicyPerCase', false, 'TEMPORARY_POLICY_LIFECYCLE_REQUIRED'],
  ['dropPolicyAfterEachCase', false, 'TEMPORARY_POLICY_LIFECYCLE_REQUIRED'],
  ['policyIntrospectionPerCase', false, 'POLICY_INTROSPECTION_AND_NEGATIVE_CONTROL_REQUIRED'],
  ['negativeControlPrepared', false, 'POLICY_INTROSPECTION_AND_NEGATIVE_CONTROL_REQUIRED'],
  ['sanitizedDiagnosticsPrepared', false, 'SANITIZED_DIAGNOSTICS_REQUIRED'],
  ['futureStagingAuthorizationDefined', true, 'STAGING_EXECUTION_BOUNDARY_NOT_YET_ALLOWED'],
  ['triggerExists', true, 'STAGING_EXECUTION_BOUNDARY_NOT_YET_ALLOWED'],
  ['stagingExecutorExists', true, 'STAGING_EXECUTION_BOUNDARY_NOT_YET_ALLOWED'],
  ['stagingWorkflowExists', true, 'STAGING_EXECUTION_BOUNDARY_NOT_YET_ALLOWED'],
  ['communityPostsExecutionPlanned', true, 'OUT_OF_SCOPE_EXECUTION_PROHIBITED'],
  ['channelMessagesExecutionPlanned', true, 'OUT_OF_SCOPE_EXECUTION_PROHIBITED'],
  ['runtimeDeployPlanned', true, 'OUT_OF_SCOPE_EXECUTION_PROHIBITED'],
  ['productionPlanned', true, 'OUT_OF_SCOPE_EXECUTION_PROHIBITED'],
  ['mergePlanned', true, 'OUT_OF_SCOPE_EXECUTION_PROHIBITED']
]) {
  const bad = r3a.evaluateRepositoryReadiness({ ...good, [field]: value });
  eq(bad.reason, reason, `blocked ${field}`);
}

const reordered = [...cfg.design.isolationCases];
[reordered[0], reordered[1]] = [reordered[1], reordered[0]];
eq(r3a.evaluateRepositoryReadiness({ ...good, isolationCases: reordered }).reason, 'EXACT_ISOLATION_CASE_MATRIX_REQUIRED', 'case order canonical');

eq(cfg.authorization.futureStagingAuthorizationDefined, false, 'no future phrase');
eq(cfg.authorization.triggerExists, false, 'no trigger');
eq(cfg.authorization.stagingExecutorExists, false, 'no executor');
eq(cfg.authorization.stagingWorkflowExists, false, 'no staging workflow');
eq(cfg.authority.repositoryReadinessAuthority, true, 'config repo authority');
eq(cfg.authority.stagingReadAuthority, false, 'config no staging');
eq(cfg.authority.productionAuthority, false, 'config no prod');
eq(cfg.authority.pullRequestMergeAuthority, false, 'config no merge');
eq(cfg.checkpoint.matrixVersion, '1.3.113', 'matrix unchanged');
eq(cfg.checkpoint.maturity, 3, 'maturity unchanged');
eq(cfg.checkpoint.productionGate, 'blocked', 'production blocked');

assert.ok(checks >= 50, `expected >= 50 checks, got ${checks}`);
console.log(`COM-B03C-R3A Presence full-conjunction isolation readiness checks passed: ${checks}/${checks}`);
