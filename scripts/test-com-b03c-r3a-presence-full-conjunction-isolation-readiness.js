#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const r3a = require('../backend/modules/communities/community-realtime-private-auth-r3a');
const cfg = require('../config/com-b03c-r3a-presence-full-conjunction-isolation-readiness.json');
const executor = require('./execute-com-b03c-r3a-presence-full-conjunction-isolation-staging-canary');
const verifier = require('./verify-com-b03c-r3a-presence-full-conjunction-isolation-staging-canary-evidence');

let checks = 0;
function eq(actual, expected, message) { assert.deepEqual(actual, expected, message); checks += 1; }
function ok(value, message) { assert.equal(Boolean(value), true, message); checks += 1; }

eq(r3a.CONTRACT_ID, cfg.contractId, 'contract');
eq(r3a.REQUIRED_BRANCH, cfg.checkpoint.branch, 'branch');
eq(r3a.REQUIRED_PULL_REQUEST, cfg.checkpoint.pullRequest, 'pr');
eq([...r3a.ISOLATION_CASES], cfg.design.isolationCases, 'cases');

const pred = cfg.predecessor;
const impl = cfg.design.implementation;
const common = {
  predecessorValidationId: pred.validationId,
  predecessorStatus: pred.status,
  r3AuthorizationConsumed: pred.authorizationConsumed,
  r3AuthorizationReusable: pred.authorizationReusable,
  r3PredicateConclusionValid: pred.predicateConclusionValid,
  r3ZeroResidueProven: pred.zeroResidueProven,
  typingFullConjunctionReadProven: pred.typingFullConjunctionReadProven,
  typingFullConjunctionWriteProven: pred.typingFullConjunctionWriteProven,
  presenceFullConjunctionReadProven: pred.presenceFullConjunctionReadProven,
  presenceFullConjunctionWriteProven: pred.presenceFullConjunctionWriteProven,
  observedFailureClass: pred.observedFailureClass,
  exactCombinedPredicateCauseIsolated: pred.exactCombinedPredicateCauseIsolated,
  isolationCases: cfg.design.isolationCases
};

const readiness = r3a.evaluateRepositoryReadiness({
  ...common,
  presenceOnly: true,
  readJoinOnly: true,
  sameAuthIdentityAcrossCases: true,
  sameTopicAcrossCases: true,
  freshRealtimeClientPerCase: true,
  insertControlPredicateTrue: true,
  writeActionExecuted: false,
  temporarySelectPolicyPerCase: true,
  dropPolicyAfterEachCase: true,
  policyIntrospectionPerCase: true,
  negativeControlPrepared: true,
  sanitizedDiagnosticsPrepared: true,
  rawRemoteErrorPersistenceAllowed: false,
  futureStagingAuthorizationDefined: false,
  triggerExists: false,
  stagingExecutorExists: false,
  stagingWorkflowExists: false,
  communityPostsExecutionPlanned: false,
  channelMessagesExecutionPlanned: false,
  domainMutationPlanned: false,
  publicationMutationPlanned: false,
  runtimeDeployPlanned: false,
  productionPlanned: false,
  mergePlanned: false
});
eq(readiness.decision, 'repository_presence_full_conjunction_isolation_ready_no_staging_authority', 'base readiness preserved');

const implementationGood = {
  ...common,
  sameAuthIdentityAcrossCases: cfg.design.sameContextControls.sameAuthIdentityAcrossCases,
  sameTopicAcrossCases: cfg.design.sameContextControls.sameTopicAcrossCases,
  freshRealtimeClientPerCase: cfg.design.sameContextControls.freshRealtimeClientPerCase,
  predicateBuilderPrepared: impl.predicateBuilderPrepared,
  caseOrderingPrepared: impl.caseOrderingPrepared,
  executorPrepared: impl.executorPrepared,
  executorHardBlockedWithoutFutureAuthorization: impl.executorHardBlockedWithoutFutureAuthorization,
  verifierPrepared: impl.verifierPrepared,
  verifierRequiresZeroResidue: impl.verifierRequiresZeroResidue,
  verifierRequiresSanitizedEvidence: impl.verifierRequiresSanitizedEvidence,
  pullRequestOnlyWorkflowPrepared: impl.pullRequestOnlyWorkflowPrepared,
  workflowUsesSecrets: impl.workflowUsesSecrets,
  workflowUsesStagingEnvironment: impl.workflowUsesStagingEnvironment,
  futureStagingAuthorizationDefined: impl.futureStagingAuthorizationDefined,
  triggerExists: impl.triggerExists,
  pushTriggerExists: impl.pushTriggerExists,
  domainMutationPlanned: cfg.outOfScope.domainMutationPlanned,
  publicationMutationPlanned: cfg.outOfScope.publicationMutationPlanned,
  runtimeDeployPlanned: cfg.outOfScope.runtimeDeployPlanned,
  productionPlanned: cfg.outOfScope.productionPlanned,
  mergePlanned: cfg.outOfScope.mergePlanned,
  realUserMutationPlanned: cfg.outOfScope.realUserMutationPlanned
};

const implementation = r3a.evaluateImplementationReadiness(implementationGood);
eq(implementation.decision, 'repository_presence_full_conjunction_isolation_implementation_ready_no_staging_authority', 'implementation ready');
eq(implementation.repositoryReadinessAuthority, true, 'repo authority');
for (const key of [
  'stagingReadAuthority','stagingMutationAuthority','authIdentityLifecycleAuthority',
  'realtimePolicyLifecycleAuthority','realtimeSubscriptionAuthority','domainMutationAuthority',
  'publicationMutationAuthority','runtimeDeployAuthority','productionAuthority','pullRequestMergeAuthority'
]) eq(implementation[key], false, `${key} false`);

for (const [field, value, reason] of [
  ['predicateBuilderPrepared', false, 'ISOLATION_PREDICATE_IMPLEMENTATION_REQUIRED'],
  ['caseOrderingPrepared', false, 'ISOLATION_PREDICATE_IMPLEMENTATION_REQUIRED'],
  ['executorPrepared', false, 'HARD_BLOCKED_EXECUTOR_REQUIRED'],
  ['executorHardBlockedWithoutFutureAuthorization', false, 'HARD_BLOCKED_EXECUTOR_REQUIRED'],
  ['verifierPrepared', false, 'FAIL_CLOSED_VERIFIER_REQUIRED'],
  ['verifierRequiresZeroResidue', false, 'FAIL_CLOSED_VERIFIER_REQUIRED'],
  ['pullRequestOnlyWorkflowPrepared', false, 'REPOSITORY_ONLY_WORKFLOW_REQUIRED'],
  ['workflowUsesSecrets', true, 'REPOSITORY_ONLY_WORKFLOW_REQUIRED'],
  ['workflowUsesStagingEnvironment', true, 'REPOSITORY_ONLY_WORKFLOW_REQUIRED'],
  ['futureStagingAuthorizationDefined', true, 'FUTURE_REMOTE_AUTHORITY_MUST_REMAIN_UNDEFINED'],
  ['triggerExists', true, 'FUTURE_REMOTE_AUTHORITY_MUST_REMAIN_UNDEFINED'],
  ['pushTriggerExists', true, 'FUTURE_REMOTE_AUTHORITY_MUST_REMAIN_UNDEFINED'],
  ['runtimeDeployPlanned', true, 'OUT_OF_SCOPE_EXECUTION_PROHIBITED'],
  ['productionPlanned', true, 'OUT_OF_SCOPE_EXECUTION_PROHIBITED'],
  ['mergePlanned', true, 'OUT_OF_SCOPE_EXECUTION_PROHIBITED']
]) {
  eq(r3a.evaluateImplementationReadiness({ ...implementationGood, [field]: value }).reason, reason, `blocked ${field}`);
}

const userId = '11111111-1111-4111-8111-111111111111';
const topic = 'private:community:test:channel_presence';
const plan = executor.buildIsolationPlan({ userId, topic });
eq(plan.length, r3a.ISOLATION_CASES.length, 'plan length');
eq(plan.map((item) => item.caseId), [...r3a.ISOLATION_CASES], 'plan order');
for (const item of plan) {
  eq(item.transport, 'channel_presence', `${item.caseId} presence only`);
  eq(item.axis, 'read_join', `${item.caseId} read only`);
  eq(item.sameTopicRequired, true, `${item.caseId} same topic`);
  eq(item.freshRealtimeClientRequired, true, `${item.caseId} fresh client`);
  eq(item.insertControlPredicate, 'true', `${item.caseId} insert control`);
  eq(item.writeActionAllowed, false, `${item.caseId} no write`);
}

const byId = Object.fromEntries(plan.map((item) => [item.caseId, item.selectPredicate]));
eq(byId.control_true, 'true', 'true control');
ok(byId.uid_topic_direct.includes('(select auth.uid())'), 'uid topic uid');
ok(byId.uid_topic_direct.includes('realtime.topic() ='), 'uid topic direct topic');
ok(!byId.uid_topic_direct.includes('extension'), 'uid topic no extension');
ok(byId.uid_extension_eq.includes("extension = 'presence'"), 'uid extension eq');
ok(!byId.uid_extension_eq.includes('realtime.topic()'), 'uid extension no topic');
ok(byId.topic_extension_direct.includes('realtime.topic() ='), 'topic extension direct');
ok(!byId.topic_extension_direct.includes('auth.uid()'), 'topic extension no uid');
ok(byId.full_current_direct.includes('realtime.topic() ='), 'current full direct topic');
ok(byId.full_topic_select_wrapper.includes('(select realtime.topic()) ='), 'topic select wrapper');
ok(byId.full_topic_select_extension_in.includes("extension in ('presence')"), 'extension in');
ok(byId.full_docs_canonical_exists.startsWith('exists (select 1 where '), 'exists wrapper');
ok(byId.full_docs_canonical_exists.includes('(select realtime.topic()) ='), 'exists wrapped topic');
ok(byId.full_docs_canonical_exists.includes("extension in ('presence')"), 'exists extension in');

const cli = spawnSync(process.execPath, [path.resolve(__dirname, 'execute-com-b03c-r3a-presence-full-conjunction-isolation-staging-canary.js')], {
  env: {},
  encoding: 'utf8'
});
eq(cli.status, 2, 'executor hard blocked');
ok(cli.stderr.includes(executor.HARD_BLOCK), 'hard block code');
eq(cfg.authorization.futureStagingAuthorizationDefined, false, 'no future auth phrase');
eq(cfg.authorization.requiredPhrase, null, 'phrase absent');
eq(cfg.authorization.triggerExists, false, 'no trigger');
eq(cfg.authorization.pushTriggerExists, false, 'no push trigger');

const validEvidence = {
  validationId: 'COM-B03C-R3A-PRESENCE-FULL-CONJUNCTION-ISOLATION-STAGING-ATTEMPT',
  contractId: r3a.CONTRACT_ID,
  sanitized: true,
  rawRemoteErrorsPersisted: false,
  caseOrder: [...r3a.ISOLATION_CASES],
  sameContext: { sameAuthIdentityAcrossCases: true, sameTopicAcrossCases: true, freshRealtimeClientPerCase: true },
  negativeControl: { passed: true },
  results: r3a.ISOLATION_CASES.map((caseId) => ({ caseId, joinAllowed: false, rawRemoteErrorExposed: false })),
  cleanup: { temporaryPoliciesAfter: 0, syntheticAuthAfter: 0, syntheticDomainRowsAfter: 0, zeroResidueProven: true },
  effects: { communityPostsExecuted: false, channelMessagesExecuted: false, publicationMutationExecuted: false, runtimeDeployed: false, productionChanged: false, pullRequestMerged: false }
};
eq(verifier.verifyEvidence(validEvidence), true, 'verifier accepts valid shape');
assert.throws(() => verifier.verifyEvidence({ ...validEvidence, sanitized: false })); checks += 1;
assert.throws(() => verifier.verifyEvidence({ ...validEvidence, cleanup: { ...validEvidence.cleanup, zeroResidueProven: false } })); checks += 1;

eq(cfg.status, 'repository_presence_full_conjunction_isolation_implementation_ready_no_staging_authority', 'status');
eq(cfg.checkpoint.matrixVersion, '1.3.113', 'matrix unchanged');
eq(cfg.checkpoint.maturity, 3, 'maturity unchanged');
eq(cfg.checkpoint.productionGate, 'blocked', 'production blocked');
eq(cfg.authority.stagingReadAuthority, false, 'no staging read');
eq(cfg.authority.productionAuthority, false, 'no prod');
eq(cfg.authority.pullRequestMergeAuthority, false, 'no merge');

ok(checks >= 100, `expected >=100 checks, got ${checks}`);
console.log(`COM-B03C-R3A isolation implementation readiness checks passed: ${checks}/${checks}`);
