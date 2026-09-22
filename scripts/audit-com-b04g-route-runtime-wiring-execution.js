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
  gate: 'backend/modules/communities/community-moderation-route-runtime-wiring-authorization.js',
  readiness: 'backend/modules/communities/community-moderation-route-runtime-readiness.js',
  registry: 'backend/shared/http/route-registry.js',
  loader: 'backend/shared/http/module-route-loader.js',
  handlers: 'backend/modules/communities/route-handlers.js',
  composition: 'backend/modules/communities/community-moderation-runtime-composition.js',
  config: 'config/com-b04g-route-runtime-wiring-authorization-readiness.json',
  test: 'scripts/test-com-b04g-route-runtime-wiring-execution.js',
  audit: 'scripts/audit-com-b04g-route-runtime-wiring-execution.js',
  evidence: 'docs/validation/COM-B04G-ROUTE-RUNTIME-WIRING-EXECUTION.json',
  doc: 'docs/COM-B04G-ROUTE-RUNTIME-WIRING-EXECUTION.md',
  workflow: '.github/workflows/com-b04g-route-runtime-wiring-execution.yml',
  readinessWorkflow: '.github/workflows/com-b04g-route-runtime-wiring-authorization-readiness.yml',
  b04fWorkflow: '.github/workflows/com-b04f-moderation-route-runtime-integration-readiness.yml',
  matrix: 'config/domain-completion-matrix.json'
});

for (const file of Object.values(files)) {
  ok(fs.existsSync(path.join(root, file)), `required file: ${file}`);
}

const gate = read(files.gate);
const readiness = read(files.readiness);
const registry = read(files.registry);
const loader = read(files.loader);
const handlers = read(files.handlers);
const composition = read(files.composition);
const config = json(files.config);
const test = read(files.test);
const evidence = json(files.evidence);
const doc = read(files.doc);
const workflow = read(files.workflow);
const readinessWorkflow = read(files.readinessWorkflow);
const b04fWorkflow = read(files.b04fWorkflow);
const matrix = json(files.matrix);

for (const marker of [
  "'communities.moderation.command'",
  "'/communities/:communityId/moderation/commands'",
  "'communities'",
  "'executeModerationCommand'",
  "'canonical_community_moderation_authority'",
  'true,\n    true,\n    true,\n    true,',
  "'backend_route_guard_plus_canonical_domain_authority'",
  "authorizationGate: authorizationGate || 'backend_route_guard'"
]) ok(registry.includes(marker), `registry marker: ${marker}`);

ok(registry.match(/communities\.moderation\.command/g).length === 1, 'route name occurs once in registry');
ok(registry.match(/\/communities\/:communityId\/moderation\/commands/g).length === 1, 'route path occurs once in registry');

for (const marker of [
  "require('../../modules/communities/route-handlers')",
  'communities\n});',
  'const modules = Object.freeze'
]) ok(loader.includes(marker), `loader marker: ${marker}`);

for (const marker of [
  "const ROUTE_NAME = 'communities.moderation.command'",
  "const FAILURE_CODE = 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED'",
  'async function executeModerationCommand()',
  'throw createBlockedRouteError()',
  'error.status = 503',
  'error.retryable = false',
  'error.runtimeActivated = false',
  'error.stagingTrafficEnabled = false',
  'error.realModerationEnabled = false',
  'const handlers = Object.freeze({ executeModerationCommand })'
]) ok(handlers.includes(marker), `handler marker: ${marker}`);

for (const forbidden of [
  'community-moderation-runtime-composition',
  'community-moderation-supabase-repository-adapter',
  'createClient(',
  '.rpc(',
  '.from(',
  'fetch(',
  'process.env',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'COMMIT',
  'ROLLBACK'
]) ok(!handlers.includes(forbidden), `handler forbidden marker absent: ${forbidden}`);

for (const marker of [
  'authorized_for_single_repository_wiring_execution',
  'routeRegistryMutationAuthority: true',
  'moduleRouteLoaderMutationAuthority: true',
  'blockedRouteHandlerCreationAuthority: true',
  'liveCompositionAuthority: false',
  'stagingDeploymentAuthority: false',
  'productionAuthority: false'
]) ok(gate.includes(marker), `gate marker: ${marker}`);

ok(readiness.includes('registrationAllowed: false'), 'historical readiness remains blocked');
ok(readiness.includes('runtimeWiringAllowed: false'), 'historical runtime readiness remains blocked');
ok(composition.includes("Object.freeze(['disabled', 'local_test_double'])"), 'composition modes unchanged');
ok(composition.includes('COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED'), 'live composition remains blocked');

for (const marker of [
  'COM-B04G blocked route wiring execution passed',
  'candidate route registered',
  'handler always fails closed before dependencies',
  'composition modes unchanged',
  'matrix promotion false'
]) ok(test.includes(marker), `test marker: ${marker}`);

for (const marker of [
  'COM-B04G — repository-only blocked route wiring execution',
  'I_EXPLICITLY_AUTHORIZE_COM_B04G_REPOSITORY_ONLY_ROUTE_REGISTRY_AND_MODULE_LOADER_WIRING',
  'authorization consumed: true',
  'route registered in repository: true',
  'communities module loaded in repository: true',
  'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED',
  'staging deployment executed: false',
  'real moderation enabled: false',
  'production changed: false',
  'pull request merged: false',
  'COM-001 maturity: 3/6'
]) ok(doc.includes(marker), `doc marker: ${marker}`);

for (const marker of [
  'COM-B04G Route Runtime Wiring Execution',
  'node scripts/test-com-b04g-route-runtime-wiring-execution.js',
  'node scripts/audit-com-b04g-route-runtime-wiring-execution.js',
  'Blocked route invocation',
  'COM-B04E regression',
  'git diff --check'
]) ok(workflow.includes(marker), `workflow marker: ${marker}`);

for (const remote of [
  'secrets.',
  'environment: staging',
  'workflow_dispatch',
  'curl ',
  'psql ',
  'supabase db',
  'supabase functions'
]) {
  ok(!workflow.includes(remote), `execution workflow remote marker absent: ${remote}`);
  ok(!readinessWorkflow.includes(remote), `readiness workflow remote marker absent: ${remote}`);
  ok(!b04fWorkflow.includes(remote), `B04F workflow remote marker absent: ${remote}`);
}

const supportedStatuses = [
  'authorization_consumed_repository_wiring_completed_pending_certification',
  'authorization_consumed_repository_wiring_certified'
];
const supportedResults = [
  'repository_wiring_completed_pending_certification',
  'repository_wiring_certified'
];
const supportedEvidenceResults = ['pending_certification', 'success'];
ok(supportedStatuses.includes(config.status), 'config lifecycle status');
equal(config.authorization.received, true, 'authorization received');
equal(config.authorization.source, 'explicit_user_message', 'authorization source');
equal(config.authorization.consumed, true, 'authorization consumed');
equal(config.authorization.executionAttempted, true, 'execution attempted');
equal(config.authorization.singleExecutionOnly, true, 'single execution');
equal(config.authorization.workflowRerunAllowedAfterAttempt, false, 'rerun false');
ok(supportedResults.includes(config.execution.result), 'execution lifecycle result');
equal(config.currentEffects.routeRegistered, true, 'route registered effect');
equal(config.currentEffects.communitiesModuleLoaded, true, 'module loaded effect');
equal(config.currentEffects.runtimeHandlerExported, true, 'handler exported effect');
equal(config.currentEffects.runtimeActivated, false, 'runtime inactive effect');
equal(config.currentEffects.stagingAccessed, false, 'staging untouched');
equal(config.currentEffects.productionChanged, false, 'production untouched');
equal(config.currentEffects.pullRequestMerged, false, 'merge untouched');
for (const [key, value] of Object.entries(config.excludedAuthority)) {
  equal(value, false, `excluded authority false: ${key}`);
}

equal(evidence.contractId, config.contractId, 'evidence contract');
equal(evidence.status, config.status, 'evidence status');
equal(evidence.authorization.consumed, true, 'evidence consumed');
equal(evidence.execution.routeRegistered, true, 'evidence route');
equal(evidence.execution.moduleLoaded, true, 'evidence module');
equal(evidence.execution.handlerExported, true, 'evidence handler');
equal(evidence.execution.handlerFailureCode, 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED', 'evidence code');
equal(evidence.execution.handlerHttpStatus, 503, 'evidence status code');
ok(supportedEvidenceResults.includes(evidence.execution.result), 'evidence lifecycle result');
equal(evidence.effects.runtimeActivated, false, 'evidence runtime false');
equal(evidence.effects.stagingAccessed, false, 'evidence staging false');
equal(evidence.effects.productionChanged, false, 'evidence production false');
equal(evidence.effects.pullRequestMerged, false, 'evidence merge false');

ok(['1.3.110', '1.3.111', '1.3.112'].includes(matrix.version), 'matrix version');
const com = matrix.domains.find((entry) => entry.id === 'COM-001');
ok(com, 'COM-001 matrix entry');
equal(com.maturity, 3, 'COM maturity unchanged');
equal(com.serverAuthority, 'partial', 'server authority partial');
equal(com.productionGate, 'blocked', 'production blocked');

if (matrix.version === '1.3.111') {
  equal(matrix.updatedAt, '2026-08-06T09:36:00-03:00', 'matrix B04G timestamp');
  const blocker = com.blockers.find((item) => item.id === 'COM-B04');
  ok(blocker, 'COM-B04 blocker');
  equal(blocker.category, 'moderation_live_composition_activation', 'live composition blocker');
  ok(com.evidence.some((item) => item.includes('COM-B04G repository-wired')), 'matrix B04G evidence');
  ok(com.nextActions.some((item) => item.includes('COM-B04H')), 'matrix B04H next action');
} else if (matrix.version === '1.3.112') {
  equal(matrix.updatedAt, '2026-08-06T10:24:00-03:00', 'matrix B04H timestamp');
  const blocker = com.blockers.find((item) => item.id === 'COM-B04');
  ok(blocker, 'COM-B04 blocker after B04H');
  equal(blocker.category, 'moderation_staging_live_activation_authorization', 'B04H authorization blocker');
  ok(com.evidence.some((item) => item.includes('COM-B04H repository-certified')), 'matrix B04H evidence');
  ok(com.nextActions.some((item) => item.includes('COM-B04I')), 'matrix B04I next action');
}

if (config.status === 'authorization_consumed_repository_wiring_certified') {
  ok(/^[a-f0-9]{40}$/.test(config.execution.certifiedHead), 'config certified head');
  ok(Number.isInteger(config.execution.run) && config.execution.run > 0, 'config certified run');
  ok(Number.isInteger(config.execution.job) && config.execution.job > 0, 'config certified job');
  equal(evidence.execution.certifiedHead, config.execution.certifiedHead, 'evidence certified head');
  equal(evidence.execution.run, config.execution.run, 'evidence certified run');
  equal(evidence.execution.job, config.execution.job, 'evidence certified job');
}

console.log(`COM-B04G blocked route wiring audit passed: ${checks}/${checks}`);
