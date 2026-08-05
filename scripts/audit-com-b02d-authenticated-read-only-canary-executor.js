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
  docs: 'docs/COM-B02D-AUTHENTICATED-READ-ONLY-CANARY-EXECUTION.md'
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
const phrase = 'I_EXPLICITLY_AUTHORIZE_COM_B02D_AUTHENTICATED_READ_ONLY_CANARY_ON_DOKE_STAGING';

check(executor.includes("require('../backend/runtime/staging/community-composition-root')"), 'composition root invoked');
check(executor.includes('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'), 'read-only transaction');
check(executor.includes("SET LOCAL ROLE service_role"), 'service role scoped');
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

const expectedContract = 'com-b02d-authenticated-read-only-canary-execution-v1';
equal(execution.contractId, expectedContract, 'execution contract');
equal(execution.status, 'explicit_authorization_received_execution_pending', 'pending status');
equal(execution.authorization.phrase, phrase, 'phrase exact');
equal(execution.authorization.received, true, 'authorization received');
equal(execution.authorization.consumed, false, 'not consumed before attempt');
equal(execution.authorization.singleUse, true, 'single use');
equal(execution.authorization.reusableAfterFailure, false, 'not reusable');
equal(execution.execution.attempted, false, 'not attempted before run');
equal(execution.target.environment, 'staging', 'staging target');
equal(execution.target.projectId, 'zwkczgewzbsorbrjuzpb', 'project exact');
equal(execution.target.migrationVersion, '20260805153539', 'migration exact');
equal(execution.target.communityId, '00000000-0000-4000-8000-0000000000d2', 'probe exact');
equal(execution.effects.readOnly, true, 'read only');
equal(execution.effects.mutationAllowed, false, 'mutation blocked');
equal(execution.authority.productionAuthority, false, 'production blocked');
equal(execution.authority.pullRequestMergeAuthority, false, 'merge blocked');
equal(readiness.canary.authorizationReceived, false, 'readiness remains pre-execution until evidence');
equal(readiness.canary.executionAttempted, false, 'readiness attempt remains false until evidence');
check(compositionRoot.includes('COM_MUTATING_RPC_BLOCKED'), 'root mutation blocker retained');
check(docs.includes(phrase), 'docs phrase');
check(docs.includes('BEGIN READ ONLY'), 'docs read only');

check(workflow.includes('branches:\n      - com/com-001-baseline-audit'), 'exact branch');
check(workflow.includes('permissions:\n  contents: read'), 'read-only token');
check(workflow.includes('Require one-shot execution envelope addition'), 'one-shot addition gate');
check(workflow.includes('SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}'), 'access token secret');
check(workflow.includes('SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}'), 'database password secret');
check(workflow.includes('Audit execution surface'), 'executor audited');
check(workflow.includes('Execute authenticated read-only canary'), 'execution step');
check(workflow.includes('Upload sanitized evidence'), 'evidence uploaded');
check(!workflow.includes('workflow_dispatch'), 'no manual dispatch');
check(!workflow.includes('contents: write'), 'no contents write');
check(!workflow.includes('SUPABASE_SERVICE_ROLE_KEY'), 'no service role key secret');
check(!workflow.includes('production'), 'no production target');

console.log(`COM-B02D canary executor audit passed: ${checks}/${checks}`);
