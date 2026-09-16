#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = {
  executor: 'scripts/execute-com-b02d-authenticated-read-only-canary-attempt-2.js',
  workflow: '.github/workflows/com-b02d-authenticated-read-only-canary.yml',
  attempt1: 'config/com-b02d-authenticated-read-only-canary-execution.json',
  attempt2: 'config/com-b02d-authenticated-read-only-canary-attempt-2.json',
  readiness: 'config/com-b02d-community-composition-root-canary-readiness.json',
  compositionRoot: 'backend/runtime/staging/community-composition-root.js',
  attempt1Evidence: 'docs/validation/COM-B02D-AUTHENTICATED-READ-ONLY-CANARY-ATTEMPT-1.json',
  attempt2Evidence: 'docs/validation/COM-B02D-AUTHENTICATED-READ-ONLY-CANARY-ATTEMPT-2.json'
};

const read = (key) => fs.readFileSync(path.join(root, files[key]), 'utf8');
let checks = 0;
const check = (value, message) => { checks += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { checks += 1; assert.strictEqual(actual, expected, message); };

for (const [key, relative] of Object.entries(files)) {
  check(fs.existsSync(path.join(root, relative)), `${key} exists`);
  check(fs.statSync(path.join(root, relative)).size > 20, `${key} nonempty`);
}

const executor = read('executor');
const workflow = read('workflow');
const attempt1 = JSON.parse(read('attempt1'));
const attempt2 = JSON.parse(read('attempt2'));
const readiness = JSON.parse(read('readiness'));
const compositionRoot = read('compositionRoot');
const attempt1Evidence = JSON.parse(read('attempt1Evidence'));
const evidence = JSON.parse(read('attempt2Evidence'));
const phrase = 'I_EXPLICITLY_AUTHORIZE_COM_B02D_AUTHENTICATED_READ_ONLY_CANARY_ON_DOKE_STAGING';

check(executor.includes("require('../config/com-b02d-authenticated-read-only-canary-attempt-2.json')"), 'attempt 2 envelope dependency');
check(executor.includes("const EXPECTED_CONTRACT = 'com-b02d-authenticated-read-only-canary-attempt-2-v1'"), 'attempt 2 contract frozen');
check(executor.includes('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'), 'read-only transaction');
check(executor.includes('BEGIN READ ONLY'), 'read-only postflight');
check(executor.includes('SET LOCAL ROLE service_role'), 'service role scoped');
check(executor.includes("current_setting('transaction_read_only')"), 'read-only setting asserted');
check(executor.includes('server_verified_authenticated_session'), 'authenticated session source');
check(executor.includes('createCommunityStagingCompositionRoot'), 'real root construction');
check(executor.includes('root.probeCanonicalState'), 'real probe invocation');
check(executor.includes("name !== 'com_load_canonical_state_v1'"), 'rpc allowlist');
check(executor.includes('DOKE_COM_B02D_WORKFLOW_RERUN_BLOCKED'), 'rerun blocked');
check(executor.includes("await client.query('ROLLBACK')"), 'rollback required');
check(executor.includes('rawIdentifiersExposed: false'), 'identifiers sanitized');
for (const token of ['insert into', 'update ', 'delete from', 'truncate ', 'alter table', 'drop table', 'create table']) {
  check(!executor.toLowerCase().includes(token), `no mutating SQL: ${token}`);
}
check(!executor.includes('com_claim_idempotency_key_v1'), 'no idempotency rpc');
check(!executor.includes('com_commit_event_projection_v1'), 'no commit rpc');
check(compositionRoot.includes('COM_MUTATING_RPC_BLOCKED'), 'root mutation blocker retained');

equal(attempt1.status, 'attempt_failed_before_database_access', 'attempt 1 remains failed');
equal(attempt1.authorization.consumed, true, 'attempt 1 remains consumed');
equal(attempt1.authorization.reusableAfterFailure, false, 'attempt 1 remains non-reusable');
equal(attempt1.execution.failedExecutions, 1, 'attempt 1 failure count retained');
equal(attempt1.execution.databaseAccessStarted, false, 'attempt 1 did not reach database');
equal(attempt1Evidence.status, 'failed_closed_before_database_access', 'attempt 1 evidence retained');

equal(attempt2.contractId, 'com-b02d-authenticated-read-only-canary-attempt-2-v1', 'attempt 2 contract');
equal(attempt2.attempt, 2, 'attempt number');
equal(attempt2.status, 'authenticated_read_only_canary_passed', 'attempt 2 passed');
equal(attempt2.authorization.phrase, phrase, 'authorization phrase exact');
equal(attempt2.authorization.received, true, 'authorization received');
equal(attempt2.authorization.consumed, true, 'authorization consumed');
equal(attempt2.authorization.singleUse, true, 'single use');
equal(attempt2.authorization.reusableAfterFailure, false, 'not reusable');
equal(attempt2.execution.attempted, true, 'attempt executed');
equal(attempt2.execution.successfulExecutions, 1, 'one success');
equal(attempt2.execution.failedExecutions, 0, 'zero failures');
equal(attempt2.execution.workflowRunId, 31026205446, 'run frozen');
equal(attempt2.execution.executionJobId, 92375512459, 'job frozen');
equal(attempt2.execution.artifactId, 8938744322, 'artifact frozen');
equal(attempt2.execution.workflowRerunAllowed, false, 'rerun blocked');
equal(attempt2.execution.databaseAccessStarted, true, 'database read reached');
equal(attempt2.execution.compositionRootInvoked, true, 'root invoked');
equal(attempt2.execution.readRpcInvoked, true, 'read rpc invoked');
equal(attempt2.actor.source, 'server_verified_authenticated_session', 'actor source');
equal(attempt2.actor.assuranceLevel, 'aal1', 'aal frozen');
equal(attempt2.result.found, false, 'probe absent');
equal(attempt2.result.state, null, 'state null');
equal(attempt2.result.countsUnchanged, true, 'counts unchanged');
equal(attempt2.result.domainRowsCreated, 0, 'zero rows created');
equal(attempt2.result.endedWithRollback, true, 'rollback completed');
equal(attempt2.effects.readOnly, true, 'read only');
equal(attempt2.effects.databaseReadExecuted, true, 'database read recorded');
equal(attempt2.effects.databaseMutationExecuted, false, 'no mutation');
equal(attempt2.authority.authenticatedCanaryAuthority, false, 'canary authority closed');
equal(attempt2.authority.stagingReadAuthority, false, 'read authority closed');
equal(attempt2.authority.stagingMutationAuthority, false, 'mutation blocked');
equal(attempt2.authority.productionAuthority, false, 'production blocked');
equal(attempt2.authority.pullRequestMergeAuthority, false, 'merge blocked');

equal(evidence.status, 'authenticated_read_only_canary_passed', 'evidence success');
equal(evidence.workflow.runId, 31026205446, 'evidence run');
equal(evidence.workflow.executionJobId, 92375512459, 'evidence job');
equal(evidence.artifact.id, 8938744322, 'evidence artifact');
equal(evidence.artifact.digest, 'sha256:2d7e7b292c14770900f2de8939abb34e648c173da24917785431783b1e5d1371', 'artifact digest');
equal(evidence.certification.attempt2ExecutorAuditPassed, 91, 'executor audit');
equal(evidence.actor.assuranceLevel, 'aal1', 'evidence aal');
equal(evidence.actor.rawIdentifiersExposed, false, 'raw identifiers hidden');
equal(evidence.transaction.readOnly, true, 'evidence read only');
equal(evidence.transaction.endedWithRollback, true, 'evidence rollback');
equal(evidence.result.found, false, 'evidence probe absent');
equal(evidence.result.state, null, 'evidence state null');
equal(evidence.result.countsUnchanged, true, 'evidence counts unchanged');
equal(evidence.result.domainRowsCreated, 0, 'evidence zero rows');
for (const phase of ['beforeCounts', 'afterCounts', 'postflightCounts']) {
  equal(evidence.result[phase].communityState, 0, `${phase} community state zero`);
  equal(evidence.result[phase].communityEvent, 0, `${phase} community event zero`);
  equal(evidence.result[phase].commandIdempotency, 0, `${phase} idempotency zero`);
}
equal(evidence.effects.databaseMutationExecuted, false, 'evidence no mutation');
equal(evidence.effects.routeRegistered, false, 'evidence no route');
equal(evidence.effects.runtimeDeployed, false, 'evidence no deploy');
equal(evidence.effects.productionChanged, false, 'evidence no production');
equal(evidence.effects.pullRequestMerged, false, 'evidence no merge');
for (const value of Object.values(evidence.remainingAuthority)) equal(value, false, 'remaining authority closed');

equal(readiness.status, 'authenticated_read_only_canary_certified', 'readiness certified');
equal(readiness.canary.successfulExecutions, 1, 'readiness one success');
equal(readiness.canary.failedExecutions, 1, 'readiness preserves failed attempt');
equal(readiness.canary.successfulAttemptNumber, 2, 'readiness attempt 2');
equal(readiness.canary.retryAuthorizationRequired, false, 'no retry required');
equal(readiness.canary.countsUnchanged, true, 'readiness counts unchanged');
equal(readiness.canary.domainRowsCreated, 0, 'readiness zero rows');
equal(readiness.canary.endedWithRollback, true, 'readiness rollback');
for (const key of ['authenticatedCanaryAuthority', 'stagingReadAuthority', 'stagingMutationAuthority', 'runtimeDeploymentAuthority', 'productionAuthority', 'pullRequestMergeAuthority']) {
  equal(readiness.authority[key], false, `readiness ${key} closed`);
}

check(workflow.includes('config/com-b02d-authenticated-read-only-canary-attempt-2.json'), 'workflow watches attempt 2 envelope');
check(workflow.includes("grep -Fxq 'config/com-b02d-authenticated-read-only-canary-attempt-2.json'"), 'one-shot addition gate');
check(workflow.includes('permissions:\n  contents: read'), 'read-only token');
check(!workflow.includes('workflow_dispatch'), 'no manual dispatch');
check(!workflow.includes('contents: write'), 'no contents write');
check(!workflow.includes('SUPABASE_SERVICE_ROLE_KEY'), 'no service role key secret');

console.log(`COM-B02D attempt 2 success audit passed: ${checks}/${checks}`);
