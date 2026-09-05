#!/usr/bin/env node
'use strict';

const assert = require('assert');
const CONFIG = require('../config/com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-canary.json');
const ATTEMPT_1 = require('../config/com-b04e-authenticated-rollback-only-moderation-runtime-canary.json');
const {
  CONTRACT_ID,
  REQUIRED_AUTHORIZATION_PHRASE,
  REQUIRED_PROJECT_ID
} = require('../backend/runtime/staging/community-moderation-rollback-canary-attempt-2');

let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.deepStrictEqual(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

// Attempt 1 must remain consumed and non-reusable.
equal(ATTEMPT_1.status, 'authorization_consumed_pre_execution_audit_failed', 'attempt-1 status');
equal(ATTEMPT_1.authorization.consumed, true, 'attempt-1 authorization consumed');
equal(ATTEMPT_1.authorization.consumedByRun, 31065331290, 'attempt-1 run');
equal(ATTEMPT_1.authorization.reusableAfterFailure, false, 'attempt-1 non-reusable');
equal(ATTEMPT_1.execution.executorStarted, false, 'attempt-1 executor did not start');
equal(ATTEMPT_1.execution.databaseConnectionAttemptedByWorkflow, false, 'attempt-1 database not reached');
equal(ATTEMPT_1.execution.rollbackScopedMutationExecuted, false, 'attempt-1 no rollback-scoped mutation');
equal(ATTEMPT_1.postflight.persistentResidue, false, 'attempt-1 no residue');
for (const key of [
  'caseProjectionRows',
  'caseEventRows',
  'commandIdempotencyRows',
  'evidenceRecordRows',
  'decisionRecordRows',
  'sanctionEventRows',
  'appealEventRows',
  'mediaReviewEventRows'
]) equal(ATTEMPT_1.postflight[key], 0, `attempt-1 ${key} zero`);

// New attempt-2 envelope.
equal(CONFIG.contractId, CONTRACT_ID, 'attempt-2 contract');
equal(CONFIG.status, 'explicit_authorization_received_execution_pending', 'attempt-2 pending status');
equal(CONFIG.authorization.phrase, REQUIRED_AUTHORIZATION_PHRASE, 'attempt-2 exact phrase');
equal(CONFIG.authorization.source, 'explicit_user_message', 'attempt-2 source');
equal(CONFIG.authorization.received, true, 'attempt-2 authorization received');
equal(CONFIG.authorization.singleUse, true, 'attempt-2 single use');
equal(CONFIG.authorization.consumed, false, 'attempt-2 not consumed in trigger');
equal(CONFIG.authorization.reusableAfterFailure, false, 'attempt-2 non-reusable');
equal(CONFIG.previousAttempt.run, 31065331290, 'previous run bound');
equal(CONFIG.previousAttempt.authorizationConsumed, true, 'previous authorization bound');
equal(CONFIG.previousAttempt.executorStarted, false, 'previous executor bound');
equal(CONFIG.previousAttempt.persistentResidue, false, 'previous residue bound');
equal(CONFIG.target.environment, 'staging', 'staging only');
equal(CONFIG.target.projectId, REQUIRED_PROJECT_ID, 'project ref');
equal(CONFIG.target.projectName, 'doke-web-staging', 'project name');
equal(CONFIG.target.pullRequest, 61, 'pull request');
equal(CONFIG.target.branch, 'com/com-001-baseline-audit', 'branch');
equal(CONFIG.target.requiredMigrationVersions, ['20260806004634', '20260806004832'], 'migration versions');
equal(CONFIG.readiness.result, 'success', 'readiness success');
ok(/^[a-f0-9]{40}$/.test(CONFIG.readiness.head), 'readiness head SHA');
ok(Number.isInteger(CONFIG.readiness.run) && CONFIG.readiness.run > 0, 'readiness run');
ok(Number.isInteger(CONFIG.readiness.job) && CONFIG.readiness.job > 0, 'readiness job');
equal(CONFIG.readiness.conformance, '36/36', 'conformance result');
equal(CONFIG.readiness.staticAudit, 'passed', 'static audit result');
equal(CONFIG.readiness.predecessorRegressions, 'passed', 'predecessor regressions');
equal(CONFIG.readiness.diffHygiene, 'passed', 'diff hygiene');
equal(CONFIG.canary.syntheticOnly, true, 'synthetic only');
equal(CONFIG.canary.rollbackOnly, true, 'rollback only');
equal(CONFIG.canary.outerIsolation, 'serializable', 'serializable');
equal(CONFIG.canary.coreCompositionActivationMode, 'disabled', 'core disabled');
equal(CONFIG.canary.coreLivePathMustRemainBlocked, true, 'live path blocked');
equal(CONFIG.canary.authenticatedExistingSessionRequired, true, 'existing session required');
equal(CONFIG.canary.newSessionCreationAllowed, false, 'new session prohibited');
equal(CONFIG.canary.singleAtomicCommitRpc, true, 'single atomic RPC');
equal(CONFIG.canary.expectedRevisionInsideTransaction, 1, 'revision one');
equal(CONFIG.canary.expectedPersistentResidue, false, 'no residue');
equal(CONFIG.execution.attempted, false, 'execution pending');
equal(CONFIG.execution.workflowRerunAllowed, false, 'workflow rerun blocked');
equal(CONFIG.effects.stagingReadAllowed, true, 'staging read allowed');
equal(CONFIG.effects.rollbackScopedMutationAllowed, true, 'rollback mutation allowed');
equal(CONFIG.effects.persistentStagingMutationAllowed, false, 'persistent mutation prohibited');
equal(CONFIG.effects.routeRegistrationAllowed, false, 'route prohibited');
equal(CONFIG.effects.runtimeDeploymentAllowed, false, 'deploy prohibited');
equal(CONFIG.effects.realModerationAllowed, false, 'real moderation prohibited');
equal(CONFIG.effects.productionAllowed, false, 'production prohibited');
equal(CONFIG.effects.pullRequestMergeAllowed, false, 'merge prohibited');

console.log(`COM-B04E attempt-2 execution envelope audit passed: ${checks}/${checks}`);
