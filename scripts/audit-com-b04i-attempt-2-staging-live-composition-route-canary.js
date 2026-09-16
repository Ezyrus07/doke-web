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

const configPath = 'config/com-b04i-attempt-2-staging-live-composition-route-canary.json';
const workflowPath = '.github/workflows/com-b04i-attempt-2-staging-live-composition-route-canary.yml';
const executorPath = 'scripts/execute-com-b04i-attempt-2-staging-live-composition-route-canary.js';
const evidencePath = 'docs/validation/COM-B04I-ATTEMPT-2-STAGING-LIVE-COMPOSITION-ROUTE-CANARY.json';
const docPath = 'docs/COM-B04I-ATTEMPT-2-STAGING-LIVE-COMPOSITION-ROUTE-CANARY.md';

for (const file of [configPath, workflowPath, executorPath, evidencePath, docPath]) {
  ok(fs.existsSync(path.join(root, file)), `required file: ${file}`);
}

const config = json(configPath);
const workflow = read(workflowPath);
const executor = read(executorPath);
const runtime = read('backend/runtime/staging/community-moderation-live-route-canary.js');
const handlers = read('backend/modules/communities/route-handlers.js');
const evidence = json(evidencePath);
const matrix = json('config/domain-completion-matrix.json');

for (const [key, value] of Object.entries({
  contractId: 'com-b04i-attempt-2-staging-live-composition-route-canary-v1',
  runtimeContractId: 'com-b04i-staging-live-composition-route-canary-v1',
  status: 'authorization_consumed_execution_pending',
  scope: 'staging_process_local_live_composition_and_rollback_only_route_canary_attempt_2'
})) equal(config[key], value, `config ${key}`);

equal(config.authorization.phrase, 'I_EXPLICITLY_AUTHORIZE_COM_B04I_ATTEMPT_2_STAGING_LIVE_COMPOSITION_ACTIVATION_AND_ROLLBACK_ONLY_ROUTE_CANARY', 'phrase');
equal(config.authorization.sourceHead, 'baa531e6672fbd752038e7f9b35d436aa6efa486', 'source head');
equal(config.authorization.received, true, 'received');
equal(config.authorization.consumed, true, 'consumed');
equal(config.authorization.singleUse, true, 'single use');
equal(config.authorization.reusableAfterFailure, false, 'not reusable');
equal(config.execution.attempted, true, 'attempted');
equal(config.execution.executorStarted, false, 'executor pending');
equal(config.execution.workflowRerunAllowed, false, 'rerun blocked');
equal(config.target.environment, 'staging', 'staging target');
equal(config.target.projectId, 'zwkczgewzbsorbrjuzpb', 'project id');
equal(config.canary.processLocalActivation, true, 'process local');
equal(config.canary.syntheticOnly, true, 'synthetic only');
equal(config.canary.rollbackOnly, true, 'rollback only');
equal(config.canary.outerIsolation, 'serializable', 'serializable');
equal(config.canary.publicTrafficEnabled, false, 'no public traffic');
equal(config.canary.rpcAllowlist, ['com_moderation_load_case_v1', 'com_moderation_commit_case_command_v1'], 'exact allowlist');
equal(config.synthetic.initialEvidenceReference, 'opaque:com-b04i:staging-live-route-canary', 'canonical opaque reference');

for (const marker of [
  "const REQUIRED_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B04I_ATTEMPT_2_STAGING_LIVE_COMPOSITION_ACTIVATION_AND_ROLLBACK_ONLY_ROUTE_CANARY'",
  "const REQUIRED_AUTHORIZATION_SOURCE_HEAD = 'baa531e6672fbd752038e7f9b35d436aa6efa486'",
  "const ACTIVATION_MODE = 'staging_authenticated_server_runtime'",
  'publicTrafficEnabled: false',
  'persistentRuntimeAuthority: false',
  'productionAuthority: false',
  'pullRequestMergeAuthority: false'
]) ok(runtime.includes(marker), `runtime marker: ${marker}`);

ok(handlers.includes("const FAILURE_CODE = 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED'"), 'default handler blocked');
ok(handlers.includes('createStagingCanaryModerationCommandHandler'), 'canary factory present');

for (const marker of [
  'COM-B04I Attempt 2 Staging Live Composition Route Canary',
  "config/com-b04i-attempt-2-staging-live-composition-route-canary.json",
  'environment: staging',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'node scripts/test-com-b04i-staging-live-composition-route-canary.js',
  'node scripts/audit-com-b04i-attempt-2-staging-live-composition-route-canary.js',
  'node scripts/execute-com-b04i-attempt-2-staging-live-composition-route-canary.js',
  'Upload sanitized COM-B04I attempt-2 evidence'
]) ok(workflow.includes(marker), `workflow marker: ${marker}`);

for (const forbidden of ['workflow_dispatch', 'supabase db push', 'supabase functions deploy', 'vercel deploy']) {
  ok(!workflow.includes(forbidden), `forbidden workflow marker absent: ${forbidden}`);
}

for (const marker of [
  "const CONFIG = require('../config/com-b04i-attempt-2-staging-live-composition-route-canary.json')",
  "BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE",
  "SET LOCAL ROLE service_role",
  "await client.query('ROLLBACK')",
  'DOKE_COM_B04I_ATTEMPT_2_PERSISTENT_RESIDUE_DETECTED'
]) ok(executor.includes(marker), `executor marker: ${marker}`);

for (const forbidden of ['COM_B04I_ATTEMPT_2_AUTHORIZATION =', 'production database', 'real user content']) {
  ok(!executor.includes(forbidden), `executor forbidden marker absent: ${forbidden}`);
}

equal(evidence.contractId, config.contractId, 'evidence contract');
equal(evidence.status, config.status, 'evidence status');
equal(evidence.effects.persistentStagingMutationExecuted, false, 'pending persistence false');
equal(evidence.effects.productionChanged, false, 'production false');
equal(evidence.effects.pullRequestMerged, false, 'merge false');

ok(matrix.version === '1.3.112', 'matrix unchanged before execution');
const com = matrix.domains.find((entry) => entry.id === 'COM-001');
ok(com, 'COM-001 exists');
equal(com.maturity, 3, 'maturity unchanged');
equal(com.productionGate, 'blocked', 'production blocked');

console.log(`COM-B04I attempt-2 staging live composition route canary audit passed: ${checks}/${checks}`);
