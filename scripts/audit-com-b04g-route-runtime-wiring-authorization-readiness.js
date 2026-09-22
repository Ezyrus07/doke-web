#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const json = (relative) => JSON.parse(read(relative));
const blobSha = (relative) => execFileSync('git', ['rev-parse', `HEAD:${relative}`], {
  cwd: root,
  encoding: 'utf8'
}).trim();

let checks = 0;
const ok = (value, label) => { checks += 1; assert.ok(value, label); };
const equal = (actual, expected, label) => { checks += 1; assert.deepStrictEqual(actual, expected, label); };

const files = Object.freeze({
  gate: 'backend/modules/communities/community-moderation-route-runtime-wiring-authorization.js',
  readiness: 'backend/modules/communities/community-moderation-route-runtime-readiness.js',
  registry: 'backend/shared/http/route-registry.js',
  loader: 'backend/shared/http/module-route-loader.js',
  composition: 'backend/modules/communities/community-moderation-runtime-composition.js',
  config: 'config/com-b04g-route-runtime-wiring-authorization-readiness.json',
  test: 'scripts/test-com-b04g-route-runtime-wiring-authorization-readiness.js',
  doc: 'docs/COM-B04G-ROUTE-RUNTIME-WIRING-AUTHORIZATION-READINESS.md',
  workflow: '.github/workflows/com-b04g-route-runtime-wiring-authorization-readiness.yml',
  matrix: 'config/domain-completion-matrix.json'
});

for (const file of Object.values(files)) {
  ok(fs.existsSync(path.join(root, file)), `required file exists: ${file}`);
}

const gate = read(files.gate);
const readiness = read(files.readiness);
const registry = read(files.registry);
const loader = read(files.loader);
const composition = read(files.composition);
const config = json(files.config);
const test = read(files.test);
const doc = read(files.doc);
const workflow = read(files.workflow);
const matrix = json(files.matrix);

for (const marker of [
  "com-b04g-route-registry-module-loader-wiring-authorization-v1",
  "I_EXPLICITLY_AUTHORIZE_COM_B04G_REPOSITORY_ONLY_ROUTE_REGISTRY_AND_MODULE_LOADER_WIRING",
  "com-b04f-moderation-route-runtime-integration-readiness-v1",
  "e3af9ea714d81f77b6e08d270e5afe6897fc67a2",
  "a0456c2c98662b7f2c48f6426e56e5b0330624eb",
  "d5322507bf7d0ecee4313aab1a7b9c04c9df29c9",
  "authorized_for_single_repository_wiring_execution",
  "PRIOR_EXECUTION_ATTEMPT_REQUIRES_NEW_AUTHORIZATION",
  "AUTHORIZATION_ALREADY_CONSUMED",
  "REPOSITORY_ONLY_SCOPE_REQUIRED",
  "BLOCKED_HANDLER_ONLY_REQUIRED",
  "COM_B04D_COMPOSITION_MUST_REMAIN_DISABLED",
  "STAGING_DEPLOYMENT_MUST_REMAIN_BLOCKED",
  "STAGING_TRAFFIC_MUST_REMAIN_BLOCKED",
  "REAL_MODERATION_MUST_REMAIN_BLOCKED",
  "PRODUCTION_MUST_REMAIN_BLOCKED",
  "PULL_REQUEST_MERGE_MUST_REMAIN_BLOCKED",
  "COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED"
]) ok(gate.includes(marker), `gate marker: ${marker}`);

for (const marker of [
  'process.env',
  'createClient(',
  '.rpc(',
  '.from(',
  'fetch(',
  'child_process',
  'workflow_dispatch',
  'COMMIT'
]) ok(!gate.includes(marker), `gate remote or mutation marker absent: ${marker}`);

// Baseline blobs are exact and remain unchanged before execution.
equal(blobSha(files.readiness), 'e3af9ea714d81f77b6e08d270e5afe6897fc67a2', 'readiness blob exact');
equal(blobSha(files.registry), 'a0456c2c98662b7f2c48f6426e56e5b0330624eb', 'registry blob exact');
equal(blobSha(files.loader), 'd5322507bf7d0ecee4313aab1a7b9c04c9df29c9', 'loader blob exact');

// Current integration is still absent.
ok(!registry.includes("'communities.moderation.command'"), 'candidate route name absent from registry');
ok(!registry.includes("'/communities/:communityId/moderation/commands'"), 'candidate route path absent from registry');
ok(!loader.includes("require('../../modules/communities/route-handlers')"), 'communities route handlers import absent');
ok(!loader.includes('communities,'), 'communities loader key absent');
ok(composition.includes("Object.freeze(['disabled', 'local_test_double'])"), 'composition activation modes unchanged');
ok(composition.includes('COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED'), 'live composition still blocked');
ok(readiness.includes('registrationAllowed: false'), 'B04F registration remains false');
ok(readiness.includes('runtimeWiringAllowed: false'), 'B04F runtime wiring remains false');

// Envelope is fail-closed and unconsumed.
equal(config.contractId, 'com-b04g-route-registry-module-loader-wiring-authorization-v1', 'config contract');
equal(config.status, 'authorization_required_not_consumed', 'config status');
equal(config.authorization.received, false, 'authorization not received');
equal(config.authorization.consumed, false, 'authorization not consumed');
equal(config.authorization.executionAttempted, false, 'execution not attempted');
equal(config.authorization.singleExecutionOnly, true, 'single use');
equal(config.authorization.workflowRerunAllowedAfterAttempt, false, 'rerun false after attempt');
equal(config.boundBaselines.readinessContractBlobSha, blobSha(files.readiness), 'config readiness blob current');
equal(config.boundBaselines.routeRegistryBlobSha, blobSha(files.registry), 'config registry blob current');
equal(config.boundBaselines.moduleRouteLoaderBlobSha, blobSha(files.loader), 'config loader blob current');
equal(config.requiredFailClosedBehavior.httpStatus, 503, 'blocked handler status');
equal(config.requiredFailClosedBehavior.errorCode, 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED', 'blocked handler code');
equal(config.requiredFailClosedBehavior.compositionActivationMode, 'disabled', 'composition disabled');
for (const [key, value] of Object.entries(config.excludedAuthority)) {
  equal(value, false, `excluded authority false: ${key}`);
}
for (const [key, value] of Object.entries(config.currentEffects)) {
  equal(value, false, `current effect false: ${key}`);
}
equal(config.matrix.version, '1.3.110', 'config matrix version');
equal(config.matrix.maturityBefore, 3, 'maturity before');
equal(config.matrix.maturityAfterReadiness, 3, 'maturity after readiness');
equal(config.matrix.promotionAllowed, false, 'promotion blocked');
equal(config.nextAction, 'obtain_exact_single_use_authorization_phrase', 'next action');

for (const marker of [
  'COM-B04G wiring authorization readiness conformance passed',
  'authorization phrase',
  'candidate route still absent',
  'communities loader still absent',
  'live composition remains false',
  'stagingDeploymentAuthority',
  'pullRequestMergeAuthority'
]) ok(test.includes(marker), `test marker: ${marker}`);

for (const marker of [
  'COM-B04G — route registry and module loader wiring authorization readiness',
  'I_EXPLICITLY_AUTHORIZE_COM_B04G_REPOSITORY_ONLY_ROUTE_REGISTRY_AND_MODULE_LOADER_WIRING',
  'authorization received: false',
  'authorization consumed: false',
  'route registered: false',
  'communities module loaded: false',
  'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED',
  'staging deployment authority: false',
  'real moderation authority: false',
  'production authority: false',
  'pull request merge authority: false',
  'COM-001 maturity: 3/6'
]) ok(doc.includes(marker), `doc marker: ${marker}`);

for (const marker of [
  'COM-B04G Route Runtime Wiring Authorization Readiness',
  'node scripts/test-com-b04g-route-runtime-wiring-authorization-readiness.js',
  'node scripts/audit-com-b04g-route-runtime-wiring-authorization-readiness.js',
  'Repository surfaces remain untouched',
  'COM-B04F regression',
  'COM-B04E regression',
  'git diff --check'
]) ok(workflow.includes(marker), `workflow marker: ${marker}`);

for (const marker of [
  'secrets.',
  'environment: staging',
  'workflow_dispatch',
  'curl ',
  'psql ',
  'supabase db',
  'supabase functions'
]) ok(!workflow.includes(marker), `workflow remote marker absent: ${marker}`);

// Canonical matrix remains unpromoted.
equal(matrix.version, '1.3.110', 'canonical matrix version');
const com = matrix.domains.find((entry) => entry.id === 'COM-001');
ok(com, 'COM-001 matrix entry present');
equal(com.maturity, 3, 'COM-001 maturity unchanged');
equal(com.serverAuthority, 'partial', 'COM-001 server authority unchanged');
equal(com.productionGate, 'blocked', 'COM-001 production gate blocked');

console.log(`COM-B04G wiring authorization readiness audit passed: ${checks}/${checks}`);
