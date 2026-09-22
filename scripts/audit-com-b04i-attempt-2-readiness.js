#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const json = (relative) => JSON.parse(read(relative));
let checks = 0;
const ok = (value, label) => { checks += 1; assert.ok(value, label); };
const equal = (actual, expected, label) => { checks += 1; assert.deepStrictEqual(actual, expected, label); };

const attempt1 = json('config/com-b04i-staging-live-composition-route-canary.json');
const attempt1Evidence = json('docs/validation/COM-B04I-STAGING-LIVE-COMPOSITION-ROUTE-CANARY.json');
const readiness = json('config/com-b04i-attempt-2-readiness.json');
const test = read('scripts/test-com-b04i-staging-live-composition-route-canary.js');
const runtime = read('backend/runtime/staging/community-moderation-live-route-canary.js');
const handlers = read('backend/modules/communities/route-handlers.js');
const archivedWorkflow = read('.github/workflows/com-b04i-staging-live-composition-route-canary.yml');
const readinessWorkflow = read('.github/workflows/com-b04i-attempt-2-readiness.yml');
const matrix = json('config/domain-completion-matrix.json');

for (const file of [
  'docs/COM-B04I-ATTEMPT-2-READINESS.md',
  'docs/validation/COM-B04I-ATTEMPT-2-READINESS.json'
]) ok(fs.existsSync(path.join(root, file)), `required file: ${file}`);

const evidence = json('docs/validation/COM-B04I-ATTEMPT-2-READINESS.json');
const doc = read('docs/COM-B04I-ATTEMPT-2-READINESS.md');

equal(attempt1.status, 'authorization_consumed_pre_staging_local_conformance_failed', 'attempt 1 closed');
equal(attempt1.authorization.consumed, true, 'attempt 1 authorization consumed');
equal(attempt1.authorization.consumedByRun, 31109121586, 'attempt 1 run');
equal(attempt1.authorization.reusableAfterFailure, false, 'attempt 1 not reusable');
equal(attempt1.execution.executorStarted, false, 'executor never started');
equal(attempt1.execution.databaseConnectionAttempted, false, 'database connection not attempted');
equal(attempt1.execution.stagingNetworkRequestExecuted, false, 'staging network not executed');
equal(attempt1.execution.rollbackScopedMutationExecuted, false, 'no mutation');
equal(attempt1.postflight.databaseAccessed, false, 'database untouched');
equal(attempt1.postflight.persistentResidue, false, 'no residue');
equal(attempt1Evidence.execution.canaryResult, 'failure_before_staging_access', 'evidence closure');

ok(test.includes("initialEvidenceRef: 'opaque:com-b04i:local-test'"), 'correct canonical opaque reference');
ok(!test.includes('opaque://'), 'slash-based opaque reference removed');
ok(runtime.includes("const ACTIVATION_MODE = 'staging_authenticated_server_runtime'"), 'candidate mode retained');
ok(runtime.includes('publicTrafficEnabled: false'), 'no public traffic');
ok(runtime.includes('persistentRuntimeAuthority: false'), 'no persistent authority');
ok(handlers.includes("const FAILURE_CODE = 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED'"), 'default failure retained');
ok(handlers.includes('createStagingCanaryModerationCommandHandler'), 'server-bound factory retained');

ok(archivedWorkflow.includes('config/com-b04i-attempt-1-archived-never-trigger.json'), 'attempt 1 workflow archived');
ok(!archivedWorkflow.includes('SUPABASE_ACCESS_TOKEN'), 'archived workflow has no secret access');
ok(!archivedWorkflow.includes('SUPABASE_DB_PASSWORD'), 'archived workflow has no database credential');

for (const [key, value] of Object.entries({
  contractId: 'com-b04i-attempt-2-readiness-v1',
  status: 'repository_ready_new_explicit_authorization_required',
  scope: 'repository_only_attempt_2_readiness'
})) equal(readiness[key], value, `readiness ${key}`);
equal(readiness.previousAttempt.run, 31109121586, 'previous run bound');
equal(readiness.previousAttempt.authorizationConsumed, true, 'previous auth bound');
equal(readiness.previousAttempt.executorStarted, false, 'previous executor false');
equal(readiness.previousAttempt.databaseAccessed, false, 'previous DB false');
equal(readiness.correctiveAction.canonicalOpaqueReference, 'opaque:com-b04i:staging-live-route-canary', 'corrected reference');
equal(readiness.remoteExecutionAuthority, false, 'remote execution blocked');
equal(readiness.stagingAccessAuthority, false, 'staging access blocked');
equal(readiness.productionAuthority, false, 'production blocked');
equal(readiness.pullRequestMergeAuthority, false, 'merge blocked');

equal(evidence.contractId, readiness.contractId, 'evidence contract');
equal(evidence.status, readiness.status, 'evidence status');
equal(evidence.effects.stagingAccessed, false, 'readiness no staging');
equal(evidence.effects.productionChanged, false, 'readiness no production');
equal(evidence.effects.pullRequestMerged, false, 'readiness no merge');

for (const marker of [
  'COM-B04I Attempt 2 Repository Readiness',
  'node scripts/test-com-b04i-staging-live-composition-route-canary.js',
  'node scripts/audit-com-b04i-attempt-2-readiness.js',
  'COM-B04H regression', 'COM-B04G regression', 'git diff --check'
]) ok(readinessWorkflow.includes(marker), `readiness workflow marker: ${marker}`);
for (const forbidden of ['environment: staging', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'workflow_dispatch']) {
  ok(!readinessWorkflow.includes(forbidden), `readiness workflow remote marker absent: ${forbidden}`);
}

ok(doc.includes('I_EXPLICITLY_AUTHORIZE_COM_B04I_ATTEMPT_2_STAGING_LIVE_COMPOSITION_ACTIVATION_AND_ROLLBACK_ONLY_ROUTE_CANARY'), 'next phrase documented');
ok(doc.includes('staging accessed: false'), 'readiness site effect');

ok(matrix.version === '1.3.112', 'matrix remains 1.3.112');
const com = matrix.domains.find((entry) => entry.id === 'COM-001');
ok(com, 'COM domain exists');
equal(com.maturity, 3, 'maturity unchanged');
equal(com.serverAuthority, 'partial', 'server authority partial');
equal(com.productionGate, 'blocked', 'production blocked');

console.log(`COM-B04I attempt-2 readiness audit passed: ${checks}/${checks}`);
