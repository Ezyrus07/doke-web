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

const files = Object.freeze({
  runtime: 'backend/runtime/staging/community-moderation-live-route-canary.js',
  handlers: 'backend/modules/communities/route-handlers.js',
  composition: 'backend/modules/communities/community-moderation-runtime-composition.js',
  registry: 'backend/shared/http/route-registry.js',
  config: 'config/com-b04i-staging-live-composition-route-canary.json',
  test: 'scripts/test-com-b04i-staging-live-composition-route-canary.js',
  executor: 'scripts/execute-com-b04i-staging-live-composition-route-canary.js',
  audit: 'scripts/audit-com-b04i-staging-live-composition-route-canary.js',
  doc: 'docs/COM-B04I-STAGING-LIVE-COMPOSITION-ROUTE-CANARY.md',
  evidence: 'docs/validation/COM-B04I-STAGING-LIVE-COMPOSITION-ROUTE-CANARY.json',
  workflow: '.github/workflows/com-b04i-staging-live-composition-route-canary.yml',
  matrix: 'config/domain-completion-matrix.json'
});

for (const file of Object.values(files)) ok(fs.existsSync(path.join(root, file)), `required file: ${file}`);

const runtime = read(files.runtime);
const handlers = read(files.handlers);
const composition = read(files.composition);
const registry = read(files.registry);
const config = json(files.config);
const evidence = json(files.evidence);
const workflow = read(files.workflow);
const doc = read(files.doc);
const matrix = json(files.matrix);

for (const marker of [
  "const CONTRACT_ID = 'com-b04i-staging-live-composition-route-canary-v1'",
  "const READINESS_CONTRACT_ID = 'com-b04h-live-composition-activation-readiness-v1'",
  'I_EXPLICITLY_AUTHORIZE_COM_B04I_STAGING_LIVE_COMPOSITION_ACTIVATION_AND_ROLLBACK_ONLY_ROUTE_CANARY',
  "const ACTIVATION_MODE = 'staging_authenticated_server_runtime'",
  "'com_moderation_load_case_v1'",
  "'com_moderation_commit_case_command_v1'",
  'stagingCanaryAuthority: true',
  'publicTrafficEnabled: false',
  'persistentRuntimeAuthority: false',
  'productionAuthority: false',
  'pullRequestMergeAuthority: false'
]) ok(runtime.includes(marker), `runtime marker: ${marker}`);

for (const forbidden of [
  'createClient(', 'process.env', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD', 'workflow_dispatch', 'production_runtime', 'publicTrafficEnabled: true'
]) ok(!runtime.includes(forbidden), `runtime forbidden marker absent: ${forbidden}`);

for (const marker of [
  "const FAILURE_CODE = 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED'",
  'async function executeModerationCommand()',
  'throw createBlockedRouteError()',
  'error.status = 503',
  'createStagingCanaryModerationCommandHandler',
  'COM_B04I_VALID_SERVER_BOUND_STAGING_RUNTIME_REQUIRED'
]) ok(handlers.includes(marker), `handler marker: ${marker}`);

ok(!handlers.includes("require('../../runtime/staging/community-moderation-live-route-canary')"), 'handler does not import staging runtime');
ok(composition.includes("Object.freeze(['disabled', 'local_test_double'])"), 'core composition live mode not widened');
ok(composition.includes('COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED'), 'core live invocation remains blocked');
ok(registry.includes("'communities.moderation.command'"), 'canonical route retained');

for (const [key, value] of Object.entries({
  contractId: 'com-b04i-staging-live-composition-route-canary-v1',
  status: 'authorization_consumed_execution_pending',
  scope: 'staging_process_local_live_composition_and_rollback_only_route_canary'
})) equal(config[key], value, `config ${key}`);

equal(config.authorization.received, true, 'authorization received');
equal(config.authorization.consumed, true, 'authorization consumed');
equal(config.authorization.singleUse, true, 'single use');
equal(config.authorization.reusableAfterFailure, false, 'not reusable');
equal(config.authorization.sourceHead, '20b17d96012756c547d522dd5ae38637185de4ee', 'source head');
equal(config.target.projectId, 'zwkczgewzbsorbrjuzpb', 'project');
equal(config.target.environment, 'staging', 'staging target');
equal(config.canary.processLocalActivation, true, 'process local');
equal(config.canary.publicTrafficEnabled, false, 'no public traffic');
equal(config.canary.rollbackOnly, true, 'rollback only');
equal(config.canary.syntheticOnly, true, 'synthetic only');
equal(config.canary.outerIsolation, 'serializable', 'serializable');
equal(config.canary.rpcAllowlist, ['com_moderation_load_case_v1', 'com_moderation_commit_case_command_v1'], 'exact RPC allowlist');
for (const [key, value] of Object.entries(config.excludedAuthority)) equal(value, false, `excluded authority false: ${key}`);

equal(evidence.contractId, config.contractId, 'evidence contract');
equal(evidence.status, config.status, 'evidence status');
equal(evidence.effects.productionChanged, false, 'evidence production false');
equal(evidence.effects.pullRequestMerged, false, 'evidence merge false');

for (const marker of [
  'COM-B04I Staging Live Composition Route Canary',
  'environment: staging',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'node scripts/test-com-b04i-staging-live-composition-route-canary.js',
  'node scripts/audit-com-b04i-staging-live-composition-route-canary.js',
  'node scripts/execute-com-b04i-staging-live-composition-route-canary.js',
  'Upload sanitized COM-B04I evidence'
]) ok(workflow.includes(marker), `workflow marker: ${marker}`);

for (const prohibited of ['supabase db push', 'supabase functions deploy', 'vercel deploy', 'production']) {
  ok(!workflow.includes(prohibited), `workflow prohibited marker absent: ${prohibited}`);
}

for (const marker of [
  'process-local staging activation', 'HTTP 503', 'SERIALIZABLE', 'ROLLBACK',
  'public traffic enabled: false', 'production changed: false', 'pull request merged: false'
]) ok(doc.includes(marker), `doc marker: ${marker}`);

ok(['1.3.112', '1.3.113'].includes(matrix.version), 'matrix lifecycle version');
const com = matrix.domains.find((entry) => entry.id === 'COM-001');
ok(com, 'COM-001 exists');
equal(com.maturity, 3, 'maturity unchanged');
equal(com.serverAuthority, 'partial', 'server authority partial');
equal(com.productionGate, 'blocked', 'production blocked');

console.log(`COM-B04I staging live composition route canary audit passed: ${checks}/${checks}`);
