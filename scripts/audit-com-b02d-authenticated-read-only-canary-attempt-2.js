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
  attempt1Evidence: 'docs/validation/COM-B02D-AUTHENTICATED-READ-ONLY-CANARY-ATTEMPT-1.json'
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
check(executor.includes("validationId: 'COM-B02D-AUTHENTICATED-READ-ONLY-CANARY-ATTEMPT-2'"), 'attempt evidence id');
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
equal(attempt1Evidence.retry.newExplicitAuthorizationRequired, true, 'attempt 1 retry boundary retained');

equal(attempt2.contractId, 'com-b02d-authenticated-read-only-canary-attempt-2-v1', 'attempt 2 contract');
equal(attempt2.attempt, 2, 'attempt number');
equal(attempt2.status, 'explicit_authorization_received_execution_pending', 'attempt 2 pending');
equal(attempt2.authorization.phrase, phrase, 'authorization phrase exact');
equal(attempt2.authorization.source, 'explicit_user_message', 'authorization source');
equal(attempt2.authorization.received, true, 'authorization received');
equal(attempt2.authorization.consumed, false, 'authorization not consumed before attempt');
equal(attempt2.authorization.singleUse, true, 'single use');
equal(attempt2.authorization.reusableAfterFailure, false, 'not reusable');
equal(attempt2.execution.attempted, false, 'attempt not started');
equal(attempt2.execution.successfulExecutions, 0, 'zero successes before run');
equal(attempt2.execution.failedExecutions, 0, 'zero failures before run');
equal(attempt2.execution.workflowRerunAllowed, false, 'workflow rerun blocked');
equal(attempt2.target.environment, 'staging', 'staging target');
equal(attempt2.target.projectId, 'zwkczgewzbsorbrjuzpb', 'project exact');
equal(attempt2.target.migrationVersion, '20260805153539', 'migration exact');
equal(attempt2.target.communityId, '00000000-0000-4000-8000-0000000000d2', 'probe exact');
equal(attempt2.actor.source, 'server_verified_authenticated_session', 'actor source');
equal(attempt2.effects.readOnly, true, 'read only');
equal(attempt2.effects.mutationAllowed, false, 'mutation blocked');
equal(attempt2.effects.fixtureCreationAllowed, false, 'fixtures blocked');
equal(attempt2.effects.sessionCreationAllowed, false, 'session creation blocked');
equal(attempt2.effects.routeRegistrationAllowed, false, 'route registration blocked');
equal(attempt2.effects.runtimeDeploymentAllowed, false, 'deployment blocked');
equal(attempt2.authority.authenticatedCanaryAuthority, true, 'canary authority granted only by envelope');
equal(attempt2.authority.stagingReadAuthority, true, 'staging read authority granted');
equal(attempt2.authority.stagingMutationAuthority, false, 'staging mutation blocked');
equal(attempt2.authority.runtimeDeploymentAuthority, false, 'runtime deployment blocked');
equal(attempt2.authority.productionAuthority, false, 'production blocked');
equal(attempt2.authority.pullRequestMergeAuthority, false, 'merge blocked');

equal(readiness.canary.authorizationConsumed, true, 'attempt 1 consumption remains documented');
equal(readiness.canary.failedExecutions, 1, 'readiness attempt 1 failure retained');
equal(readiness.canary.retryAuthorizationRequired, true, 'readiness remains fail closed until evidence');
equal(readiness.authority.stagingMutationAuthority, false, 'readiness mutation blocked');
equal(readiness.authority.productionAuthority, false, 'readiness production blocked');

check(workflow.includes('config/com-b02d-authenticated-read-only-canary-attempt-2.json'), 'workflow watches attempt 2 envelope');
check(workflow.includes("grep -Fxq 'config/com-b02d-authenticated-read-only-canary-attempt-2.json'"), 'one-shot addition gate');
check(workflow.includes('node scripts/audit-com-b02d-authenticated-read-only-canary-attempt-2.js'), 'attempt 2 audit');
check(workflow.includes('node scripts/execute-com-b02d-authenticated-read-only-canary-attempt-2.js'), 'attempt 2 executor');
check(workflow.includes('permissions:\n  contents: read'), 'read-only token');
check(workflow.includes('SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}'), 'access token secret');
check(workflow.includes('SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}'), 'database password secret');
check(workflow.includes('COM-B02D-AUTHENTICATED-READ-ONLY-CANARY-ATTEMPT-2.json'), 'attempt 2 report path');
check(!workflow.includes('workflow_dispatch'), 'no manual dispatch');
check(!workflow.includes('contents: write'), 'no contents write');
check(!workflow.includes('SUPABASE_SERVICE_ROLE_KEY'), 'no service role key secret');

console.log(`COM-B02D attempt 2 executor audit passed: ${checks}/${checks}`);
