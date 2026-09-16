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

const files = {
  contract: 'backend/modules/communities/community-moderation-route-runtime-readiness.js',
  composition: 'backend/modules/communities/community-moderation-runtime-composition.js',
  registry: 'backend/shared/http/route-registry.js',
  loader: 'backend/shared/http/module-route-loader.js',
  runtime: 'backend/runtime/staging/staging-api-runtime.js',
  server: 'backend/runtime/staging/node-http-server.js',
  release: 'backend/runtime/staging/runtime-release-contract.js',
  config: 'config/com-b04f-moderation-route-runtime-integration-readiness.json',
  evidence: 'docs/validation/COM-B04E-ATTEMPT-2-AUTHENTICATED-ROLLBACK-ONLY-MODERATION-RUNTIME-CANARY.json',
  matrix: 'config/domain-completion-matrix.json',
  test: 'scripts/test-com-b04f-moderation-route-runtime-integration-readiness.js',
  doc: 'docs/COM-B04F-MODERATION-ROUTE-RUNTIME-INTEGRATION-READINESS.md',
  workflow: '.github/workflows/com-b04f-moderation-route-runtime-integration-readiness.yml'
};

for (const file of Object.values(files)) ok(fs.existsSync(path.join(root, file)), `required file: ${file}`);

const contract = read(files.contract);
const composition = read(files.composition);
const registry = read(files.registry);
const loader = read(files.loader);
const runtime = read(files.runtime);
const server = read(files.server);
const release = read(files.release);
const config = json(files.config);
const evidence = json(files.evidence);
const matrix = json(files.matrix);
const test = read(files.test);
const doc = read(files.doc);
const workflow = read(files.workflow);

for (const marker of [
  "com-b04f-moderation-route-runtime-integration-readiness-v1",
  "communities.moderation.command",
  "/communities/:communityId/moderation/commands",
  "executeModerationCommand",
  "canonical_community_moderation_authority",
  "idempotencyRequired: true",
  "auditRequired: true",
  "serviceRoleRequired: true",
  "requestFreshnessRequired: true",
  "rlsValidationRequired: true",
  "registrationAllowed: false",
  "runtimeWiringAllowed: false",
  "stagingTrafficAllowed: false",
  "realModerationAllowed: false",
  "productionAllowed: false",
  "COM_B04F_ROUTE_ACTIVATION_NOT_AUTHORIZED",
  "error.status = 503",
  "repository_ready_activation_blocked",
  "nextSublot: 'COM-B04G'",
  "request_separate_authority_for_route_registry_and_runtime_wiring"
]) ok(contract.includes(marker), `contract marker: ${marker}`);

for (const marker of [
  'process.env',
  'SUPABASE_SERVICE_ROLE_KEY',
  'createClient(',
  '.rpc(',
  '.from(',
  'fetch(',
  'registerRoute(',
  "client.query('COMMIT')"
]) ok(!contract.includes(marker), `contract remote marker absent: ${marker}`);

ok(composition.includes("Object.freeze(['disabled', 'local_test_double'])"), 'composition modes unchanged');
ok(composition.includes('COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED'), 'composition live path blocked');
ok(composition.includes('routeRegistered: false'), 'composition route false');
ok(!registry.includes("'communities.moderation.command'"), 'candidate absent from registry');
ok(!registry.includes("'/communities/:communityId/moderation/commands'"), 'candidate path absent from registry');
ok(!loader.includes("require('../../modules/communities/route-handlers')"), 'communities loader import absent');
ok(!loader.includes('communities,'), 'communities loader key absent');
ok(!runtime.includes('communities.moderation.command'), 'runtime candidate special case absent');
ok(!server.includes('communities.moderation.command'), 'server candidate special case absent');
ok(!release.includes('COM-B04F'), 'release contract unchanged');

for (const marker of [
  'COM-B04F route/runtime readiness conformance passed',
  'blocked handler fails closed',
  'candidate absent from registry',
  'communities routes absent',
  'communities module absent',
  'runtime handler absent',
  "handoff.nextSublot, 'COM-B04G'",
  "config.matrix.maturityAfter, 3"
]) ok(test.includes(marker), `test marker: ${marker}`);

for (const marker of [
  'COM-B04F — moderation route/runtime integration readiness',
  'authenticated_rollback_only_canary_passed',
  'communities.moderation.command',
  '/communities/:communityId/moderation/commands',
  'candidate present in route-registry.js: false',
  'communities present in module-route-loader.js: false',
  'COM_B04F_ROUTE_ACTIVATION_NOT_AUTHORIZED',
  'INSTITUTIONAL_POLICY_APPROVAL_REQUIRED',
  'EXPLICIT_ROUTE_REGISTRY_AUTHORIZATION_REQUIRED',
  'matrix version: 1.3.110',
  'COM-001 maturity after: 3/6',
  'There is no visible or functional site effect.',
  'COM-B04G'
]) ok(doc.includes(marker), `doc marker: ${marker}`);

for (const marker of [
  'COM-B04F Moderation Route Runtime Integration Readiness',
  'node scripts/test-com-b04f-moderation-route-runtime-integration-readiness.js',
  'node scripts/audit-com-b04f-moderation-route-runtime-integration-readiness.js',
  'Repository-only fail-closed checks',
  'COM-B04E regression',
  'COM-B04D regression',
  'COM-B04C regression',
  'COM-B04B regression',
  'COM-B04 regression',
  'git diff --check'
]) ok(workflow.includes(marker), `workflow marker: ${marker}`);

for (const marker of [
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'SUPABASE_SERVICE_ROLE_KEY',
  'curl ',
  'psql ',
  'supabase db',
  'supabase functions',
  'workflow_dispatch',
  'environment: staging'
]) ok(!workflow.includes(marker), `workflow remote marker absent: ${marker}`);

// Canonical envelope.
equal(config.contractId, 'com-b04f-moderation-route-runtime-integration-readiness-v1', 'config contract');
equal(config.status, 'repository_ready_activation_blocked', 'config status');
equal(config.predecessorEvidence.compositionActivationMode, 'disabled', 'predecessor disabled');
equal(config.predecessorEvidence.compositionRouteRegistered, false, 'predecessor route false');
equal(config.predecessorEvidence.canaryStatus, 'authenticated_rollback_only_canary_passed', 'predecessor canary');
equal(config.predecessorEvidence.canaryRun, 31067102891, 'predecessor run');
equal(config.predecessorEvidence.canaryJob, 92507013853, 'predecessor job');
equal(config.predecessorEvidence.artifactId, 8954212159, 'predecessor artifact');
equal(config.predecessorEvidence.persistentResidue, false, 'predecessor residue');
equal(config.candidateRoute.name, 'communities.moderation.command', 'candidate name');
equal(config.candidateRoute.requestFreshnessRequired, true, 'candidate freshness');
equal(config.currentIntegration.routeRegistryContainsCandidate, false, 'registry absent');
equal(config.currentIntegration.moduleLoaderContainsCommunities, false, 'loader absent');
equal(config.currentIntegration.routeHandlerExportedToRuntime, false, 'handler absent');
equal(config.activationBlockers.length, 7, 'activation blockers');
for (const value of Object.values(config.authority)) equal(value, false, 'authority false');
for (const value of Object.values(config.effects)) equal(value, false, 'effect false');
equal(config.matrix.version, '1.3.110', 'config matrix version');
equal(config.matrix.maturityBefore, 3, 'maturity before');
equal(config.matrix.maturityAfter, 3, 'maturity after');
equal(config.matrix.promotionAllowed, false, 'promotion false');
equal(config.nextSublot, 'COM-B04G', 'next sublot');

// Bound live evidence stays immutable.
equal(evidence.status, 'authenticated_rollback_only_canary_passed', 'evidence status');
equal(evidence.execution.run, 31067102891, 'evidence run');
equal(evidence.execution.job, 92507013853, 'evidence job');
equal(evidence.execution.artifact.id, 8954212159, 'evidence artifact');
equal(evidence.observed.coreCompositionActivationMode, 'disabled', 'evidence disabled');
equal(evidence.observed.coreLivePathBlocked, true, 'evidence live block');
equal(evidence.observed.transactionRolledBack, true, 'evidence rollback');
equal(evidence.postflight.persistentResidue, false, 'evidence residue');
equal(evidence.effects.routeRegistered, false, 'evidence route false');
equal(evidence.effects.runtimeDeployed, false, 'evidence deploy false');
equal(evidence.effects.realModerationExecuted, false, 'evidence moderation false');
equal(evidence.effects.productionChanged, false, 'evidence production false');
equal(evidence.effects.pullRequestMerged, false, 'evidence merge false');

// Matrix remains unpromoted.
equal(matrix.version, '1.3.110', 'canonical matrix version');
const com = matrix.domains.find((entry) => entry.id === 'COM-001');
ok(com, 'COM-001 matrix entry');
equal(com.maturity, 3, 'COM-001 maturity unchanged');
equal(com.serverAuthority, 'partial', 'COM-001 server authority unchanged');
equal(com.productionGate, 'blocked', 'COM-001 production blocked');

console.log(`COM-B04F route/runtime readiness audit passed: ${checks}/${checks}`);
