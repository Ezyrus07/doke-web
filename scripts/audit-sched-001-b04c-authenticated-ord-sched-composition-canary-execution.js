#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const CONFIG_PATH = 'config/sched-001-b04c-authenticated-ord-sched-composition-canary-execution.json';
const READINESS_PATH = 'config/sched-001-b04c-authenticated-ord-sched-composition-canary-readiness.json';
const EXECUTOR_PATH = 'scripts/execute-sched-001-b04c-authenticated-ord-sched-composition-canary.js';
const WORKFLOW_PATH = '.github/workflows/sched-001-b04c-authenticated-ord-sched-composition-canary.yml';
const READINESS_WORKFLOW_PATH = '.github/workflows/sched-001-b04c-authenticated-ord-sched-composition-canary-readiness.yml';

[CONFIG_PATH, READINESS_PATH, EXECUTOR_PATH, WORKFLOW_PATH, READINESS_WORKFLOW_PATH].forEach((file) => {
  assert(fs.existsSync(file), `Missing SCHED-B04C execution asset: ${file}`);
});

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const readiness = JSON.parse(fs.readFileSync(READINESS_PATH, 'utf8'));
const executor = fs.readFileSync(EXECUTOR_PATH, 'utf8');
const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');

assert.strictEqual(config.contractVersion, 'sched-b04c-authenticated-ord-sched-composition-canary-execution-v1');
assert.strictEqual(config.authorization.exactPhrase, readiness.authorization.requiredExactPhrase);
assert([
  'awaiting_exact_authorization',
  'consumed_failed_closed_blocked_on_b04d',
  'consumed_success'
].includes(config.authorization.status), `Unexpected B04C authorization status: ${config.authorization.status}`);
assert.strictEqual(config.authorization.genericContinuationAllowed, false);
assert.strictEqual(config.authorization.repositoryAdditionTriggersExecution, false);
assert.strictEqual(config.authorization.trigger, 'workflow_dispatch_exact_phrase_and_expected_head_sha');
assert.strictEqual(config.target.repository, 'Ezyrus07/doke-web');
assert.strictEqual(config.target.pullRequest, 25);
assert.strictEqual(config.target.branch, 'ord/ord-001-baseline-audit');
assert.strictEqual(config.target.projectRef, 'zwkczgewzbsorbrjuzpb');
assert.strictEqual(config.target.projectName, 'doke-web-staging');
assert.strictEqual(config.runtimeGate.failClosed, true);
assert.strictEqual(config.runtimeGate.browserExecutionForbidden, true);
assert.strictEqual(config.runtimeGate.expectedHeadShaRequired, true);
assert.strictEqual(config.syntheticFixture.persistentRowsAllowed, 0);
assert.strictEqual(config.syntheticFixture.realUserDataAllowed, false);
assert.strictEqual(config.transaction.isolation, 'SERIALIZABLE');
assert.strictEqual(config.transaction.finalStatement, 'ROLLBACK');
assert.strictEqual(config.transaction.commitAllowed, false);
assert.strictEqual(config.transaction.postRollbackVerificationRequired, true);
assert.deepStrictEqual(config.allowedSecrets.sort(), ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD'].sort());
[
  'production_access',
  'migration_application',
  'deployment',
  'frontend_authority_switch',
  'cron_activation',
  'worker_activation',
  'persistent_canary_data',
  'pull_request_merge'
].forEach((action) => assert(config.prohibitedActions.includes(action), `Missing prohibited action: ${action}`));

if (config.authorization.status === 'consumed_failed_closed_blocked_on_b04d') {
  assert.strictEqual(config.executionState.authenticatedCanaryExecuted, true);
  assert.strictEqual(config.executionState.canaryPassed, false);
  assert.strictEqual(config.executionState.blockedBy, 'SCHED-B04D-STAGING-MIGRATION');
  assert.strictEqual(config.executionState.persistentMutationsPerformed, 0);
  assert.strictEqual(config.executionState.allAuthorizedAttemptsRolledBack, true);
  assert.strictEqual(config.executionState.allResidueCountsZero, true);
} else if (config.authorization.status === 'consumed_success') {
  assert.strictEqual(config.authorization.mayBeReusedForRetry, false);
  assert.strictEqual(config.executionState.authenticatedCanaryExecuted, true);
  assert.strictEqual(config.executionState.canaryPassed, true);
  assert.strictEqual(config.executionState.blockedBy, null);
  assert.strictEqual(config.executionState.transactionalAttemptsPerformed, 8);
  assert.strictEqual(config.executionState.successfulAttempts, 1);
  assert.strictEqual(config.executionState.failedClosedAttemptsBeforeSuccess, 7);
  assert.strictEqual(config.executionState.successfulRun.runId, 30716088197);
  assert.strictEqual(config.executionState.successfulRun.jobId, 91411759384);
  assert.strictEqual(config.executionState.successfulRun.result, 'authenticated_ord_sched_composition_canary_passed');
  assert.strictEqual(config.executionState.successfulRun.isolation, 'SERIALIZABLE');
  assert.strictEqual(config.executionState.successfulRun.finalStatement, 'ROLLBACK');
  assert.strictEqual(config.executionState.successfulRun.committed, false);
  assert.strictEqual(config.executionState.successfulRun.rolledBack, true);
  assert.strictEqual(config.executionState.allAuthorizedAttemptsRolledBack, true);
  assert.strictEqual(config.executionState.allResidueCountsZero, true);
  assert.strictEqual(config.executionState.allAuthorityCountDeltasZero, true);
  assert.strictEqual(config.executionState.persistentMutationsPerformed, 0);
  assert.strictEqual(config.executionState.temporaryAuthorizedWorkflowRemoved, true);
  assert.strictEqual(config.executionState.temporaryBigintReconcilerRemoved, true);
}

[
  "const MODES = new Set(['--preflight', '--execute'])",
  'SCHED_B04C_AUTHORIZATION',
  'SCHED_B04C_EXPECTED_HEAD_SHA',
  "begin isolation level serializable",
  "connection.client.query('rollback')",
  'DOKE_SCHED_B04C_POST_ROLLBACK_RESIDUE_PRESENT',
  'DOKE_SCHED_B04C_AUTHORITY_COUNT_DRIFT',
  'createTransactionalCanaryPool',
  'assertStartScheduleAuthority',
  'assertGenericCancellationAllowed',
  'DOKE_ORDER_SCHEDULE_AUTHORITY_REQUIRED',
  'DOKE_SCHEDULE_ORDER_PROJECTION_FAILED',
  'authenticated_ord_sched_composition_canary_passed'
].forEach((fragment) => assert(executor.includes(fragment), `Executor missing: ${fragment}`));
assert(!executor.includes("connection.client.query('commit')"));
assert(!executor.includes('process.env.NODE_ENV ='));

assert(workflow.includes('workflow_dispatch:'));
assert(workflow.includes('authorization_phrase:'));
assert(workflow.includes('expected_head_sha:'));
assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes(readiness.authorization.requiredExactPhrase));
assert(workflow.includes('SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}'));
assert(workflow.includes('SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}'));
assert(workflow.includes('SCHED_B04C_AUTHORIZATION: ${{ inputs.authorization_phrase }}'));
assert(workflow.includes('SCHED_B04C_EXPECTED_HEAD_SHA: ${{ inputs.expected_head_sha }}'));
assert(workflow.includes('node scripts/execute-sched-001-b04c-authenticated-ord-sched-composition-canary.js --preflight'));
assert(workflow.includes('node scripts/execute-sched-001-b04c-authenticated-ord-sched-composition-canary.js --execute'));
assert(!workflow.includes('\n  push:'));
assert(!workflow.includes('\n  pull_request:'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('supabase migration'));
assert(!workflow.includes('supabase functions deploy'));
assert(!workflow.includes('git push'));

console.log('SCHED-B04C authenticated ORD/SCHED canary execution audit passed.');
