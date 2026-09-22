#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = {
  executor: 'scripts/execute-com-b02d-authenticated-read-only-canary.js',
  workflow: '.github/workflows/com-b02d-authenticated-read-only-canary.yml',
  execution: 'config/com-b02d-authenticated-read-only-canary-execution.json',
  readiness: 'config/com-b02d-community-composition-root-canary-readiness.json',
  compositionRoot: 'backend/runtime/staging/community-composition-root.js',
  docs: 'docs/COM-B02D-COMMUNITY-COMPOSITION-ROOT-CANARY-READINESS.md',
  evidence: 'docs/validation/COM-B02D-AUTHENTICATED-READ-ONLY-CANARY-ATTEMPT-1.json'
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
const execution = JSON.parse(read('execution'));
const readiness = JSON.parse(read('readiness'));
const compositionRoot = read('compositionRoot');
const docs = read('docs');
const evidence = JSON.parse(read('evidence'));
const phrase = 'I_EXPLICITLY_AUTHORIZE_COM_B02D_AUTHENTICATED_READ_ONLY_CANARY_ON_DOKE_STAGING';

check(executor.includes("require('../backend/runtime/staging/community-composition-root')"), 'composition root dependency');
check(executor.includes('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'), 'read-only transaction');
check(executor.includes("SET LOCAL ROLE service_role"), 'service role scoped');
check(executor.includes('transaction_read_only'), 'read-only setting asserted');
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

const expectedContract = 'com-b02d-authenticated-read-only-canary-execution-v1';
equal(execution.contractId, expectedContract, 'execution contract');
equal(execution.status, 'attempt_failed_before_database_access', 'failure status');
equal(execution.authorization.phrase, phrase, 'phrase exact');
equal(execution.authorization.received, true, 'authorization received');
equal(execution.authorization.consumed, true, 'authorization consumed');
equal(execution.authorization.reusableAfterFailure, false, 'authorization not reusable');
equal(execution.execution.attempted, true, 'attempt recorded');
equal(execution.execution.successfulExecutions, 0, 'zero successes');
equal(execution.execution.failedExecutions, 1, 'one failure');
equal(execution.execution.failedStage, 'executor_audit', 'failed stage');
equal(execution.execution.databaseAccessStarted, false, 'database not reached');
equal(execution.execution.compositionRootInvoked, false, 'root not invoked');
equal(execution.effects.databaseReadExecuted, false, 'no database read by canary');
equal(execution.effects.databaseMutationExecuted, false, 'no database mutation');
equal(execution.authority.authenticatedCanaryAuthority, false, 'canary authority closed');
equal(execution.authority.stagingReadAuthority, false, 'read authority closed');
equal(execution.authority.productionAuthority, false, 'production blocked');
equal(execution.authority.pullRequestMergeAuthority, false, 'merge blocked');

equal(readiness.status, 'canary_attempt_1_failed_before_database_access_retry_authorization_required', 'readiness failure state');
equal(readiness.canary.authorizationConsumed, true, 'readiness consumed');
equal(readiness.canary.executionAttempted, true, 'readiness attempt');
equal(readiness.canary.failedExecutions, 1, 'readiness failure count');
equal(readiness.canary.lastAttemptReachedDatabase, false, 'readiness database not reached');
equal(readiness.canary.retryAuthorizationRequired, true, 'retry authorization required');
equal(readiness.authority.authenticatedCanaryAuthority, false, 'readiness authority closed');

equal(evidence.status, 'failed_closed_before_database_access', 'evidence status');
equal(evidence.workflow.runId, 31024711149, 'run frozen');
equal(evidence.workflow.executionJobId, 92370362046, 'job frozen');
equal(evidence.workflow.failedStep, 'Audit execution surface', 'failed step');
equal(evidence.rootCause.class, 'static_auditor_literal_mismatch', 'root cause');
equal(evidence.execution.databaseAccessStarted, false, 'evidence database not reached');
equal(evidence.execution.compositionRootInvoked, false, 'evidence root not invoked');
equal(evidence.effects.databaseMutationExecuted, false, 'evidence no mutation');
equal(evidence.retry.newExplicitAuthorizationRequired, true, 'evidence retry authorization');
check(docs.includes('static_auditor_literal_mismatch'), 'docs root cause');
check(docs.includes('database read executed by canary: false'), 'docs no database read');
check(docs.includes(phrase), 'docs retry phrase');

check(workflow.includes('permissions:\n  contents: read'), 'read-only token');
check(workflow.includes('Require one-shot execution envelope addition'), 'one-shot addition gate');
check(workflow.includes('SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}'), 'access token secret');
check(workflow.includes('SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}'), 'database password secret');
check(!workflow.includes('workflow_dispatch'), 'no manual dispatch');
check(!workflow.includes('contents: write'), 'no contents write');
check(!workflow.includes('SUPABASE_SERVICE_ROLE_KEY'), 'no service role key secret');

console.log(`COM-B02D failed-closed attempt audit passed: ${checks}/${checks}`);
