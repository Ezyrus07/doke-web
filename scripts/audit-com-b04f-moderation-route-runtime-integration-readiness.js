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

const paths = Object.freeze({
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
});

for (const required of Object.values(paths)) {
  ok(fs.existsSync(path.join(root, required)), `required file: ${required}`);
}

const contract = read(paths.contract);
const composition = read(paths.composition);
const registry = read(paths.registry);
const loader = read(paths.loader);
const runtime = read(paths.runtime);
const server = read(paths.server);
const release = read(paths.release);
const config = json(paths.config);
const evidence = json(paths.evidence);
const matrix = json(paths.matrix);
const test = read(paths.test);
const doc = read(paths.doc);
const workflow = read(paths.workflow);

for (const marker of [
  "const CONTRACT_ID = 'com-b04f-moderation-route-runtime-integration-readiness-v1'",
  "name: 'communities.moderation.command'",
  "method: 'POST'",
  "path: '/communities/:communityId/moderation/commands'",
  "module: 'communities'",
  "handler: 'executeModerationCommand'",
  "scope: 'canonical_community_moderation_authority'",
  'idempotencyRequired: true',
  'auditRequired: true',
  'serviceRoleRequired: true',
  'requestFreshnessRequired: true',
  'rlsValidationRequired: true',
  'registrationAllowed: false',
  'runtimeWiringAllowed: false',
  'stagingTrafficAllowed: false',
  'realModerationAllowed: false',
  'productionAllowed: false',
  "const REQUIRED_CANARY_RUN = 31067102891",
  "decision: repositoryReady",
  "'repository_ready_activation_blocked'",
  "'INSTITUTIONAL_POLICY_APPROVAL_REQUIRED'",
  "'EXPLICIT_ROUTE_REGISTRY_AUTHORIZATION_REQUIRED'",
  "'EXPLICIT_MODULE_LOADER_AUTHORIZATION_REQUIRED'",
  "'EXPLICIT_RUNTIME_WIRING_AUTHORIZATION_REQUIRED'",
  "'EXPLICIT_STAGING_DEPLOYMENT_AUTHORIZATION_REQUIRED'",
  "'EXPLICIT_STAGING_TRAFFIC_AUTHORIZATION_REQUIRED'",
  "'EXPLICIT_REAL_MODERATION_AUTHORIZATION_REQUIRED'",
  "error.code = 'COM_B04F_ROUTE_ACTIVATION_NOT_AUTHORIZED'",
  'error.status = 503',
  "nextSublot: 'COM-B04G'",
  "nextAction: 'request_separate_authority_for_route_registry_and_runtime_wiring'",
  'routeRegistrationAuthority: false',
  'runtimeWiringAuthority: false',
  'stagingDeploymentAuthority: false',
  'stagingTrafficAuthority: false',
  'realModerationAuthority: false',
  'pullRequestMergeAuthority: false'
]) ok(contract.includes(marker), `contract marker: ${marker}`);

for (const forbidden of [
  'process.env',
  'SUPABASE_SERVICE_ROLE_KEY',
  "require('../../shared/http/route-registry')",
  "require('../../shared/http/module-route-loader')",
  'createClient(',
  '.from(',
  '.rpc(',
  'fetch(',
  'listen(',
  'registerRoute(',
  'COMMIT'
]) ok(!contract.includes(forbidden), `contract forbidden marker absent: ${forbidden}`);

ok(composition.includes("const ACTIVATION_MODES = Object.freeze(['disabled', 'local_test_double'])"), 'composition safe modes unchanged');
ok(composition.includes("throw new Error('COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED')"), 'composition live invocation blocked');
ok(composition.includes('routeRegistered: false'), 'composition route unregistered');

ok(!registry.includes("'communities.moderation.command'"), 'candidate route absent from registry');
ok(!registry.includes("'/communities/:communityId/moderation/commands'"), 'candidate path absent from registry');
ok(!registry.includes("'communities', 'executeModerationCommand'"), 'candidate module handler absent from registry');
ok(!loader.includes("require('../../modules/communities/route-handlers')"), 'communities route handlers absent from loader');
ok(!loader.includes('communities,'), 'communities module absent from loader map');
ok(!runtime.includes('communities.moderation.command'), 'staging runtime has no candidate route special case');
ok(!server.includes('communities.moderation.command'), 'HTTP server has no candidate route special case');
ok(!release.includes('COM-B04F'), 'release contract unchanged by COM-B04F');

for (const marker of [
  'COM-B04F route/runtime readiness conformance passed',
  'candidate absent from registry',
  'communities routes absent',
  'communities module absent',
  'runtime handler absent',
  'blocked handler fails closed',
  'complete packet activation ready',
  "nextSublot, 'COM-B04G'",
  "matrix maturity unchanged"
]) ok(test.includes(marker), `test marker: ${marker}`);

for (const marker of [
  'COM-B04F — moderation route/runtime integration readiness',
  'COM-B04E attempt-2 status: authenticated_rollback_only_canary_passed',
  'name: communities.moderation.command',
  'path: /communities/:communityId/moderation/commands',
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
  'backend/modules/communities/community-moderation-route-runtime-readiness.js',
  'config/com-b04f-moderation-route-runtime-integration-readiness.json',
  'scripts/test-com-b04f-moderation-route-runtime-integration-readiness.js',
  'scripts/audit-com-b04f-moderation-route-runtime-integration-readiness.js',
  'node scripts/test-com-b04f-moderation-route-runtime-integration-readiness.js',
  'node scripts/audit-com-b04f-moderation-route-runtime-integration-readiness.js',
  'COM-B04E regression',
  'COM-B04D regression',
  'COM-B04C regression',
  'COM-B04B regression',
  'COM-B04 regression',
  'git diff --check'
]) ok(workflow.includes(marker), `workflow marker: ${marker}`);

for (const forbidden of [
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'SUPABASE_SERVICE_ROLE_KEY',
  'curl ',
  'psql ',
  'supabase db',
  'supabase functions',
  'workflow_dispatch',
  'environment: staging'
]) ok(!workflow.includes(forbidden), `workflow remote marker absent: ${forbidden}`);

// Canonical config.
equal(config.contractId, 'com-b04f-moderation-route-runtime-integration-readiness-v1', 'config contract');
equal(config.domain, 'COM-001', 'config domain');
equal(config.status, 'repository_ready_activation_blocked', 'config status');
equal(config.predecessorEvidence.compositionActivationMode, 'disabled', 'config composition disabled');
equal(config.predecessorEvidence.compositionRouteRegistered, false, 'config predecessor route false');
equal(config.predecessorEvidence.canaryStatus, 'authenticated_rollback_only_canary_passed', 'config canary status');
equal(config.predecessorEvidence.canaryRun, 31067102891, 'config canary run');
equal(config.predecessorEvidence.canaryJob, 92507013853, 'config canary job');
equal(config.predecessorEvidence.artifactId, 8954212159, 'config artifact');
equal(config.predecessorEvidence.persistentResidue, false, 'config residue false');
equal(config.candidateRoute.name, 'communities.moderation.command', 'config route name');
equal(config.candidateRoute.requestFreshnessRequired, true, 'config freshness');
equal(config.currentIntegration.routeRegistryContainsCandidate, false, 'config registry absent');
equal(config.currentIntegration.moduleLoaderContainsCommunities, false, 'config loader absent');
equal(config.currentIntegration.routeHandlerExportedToRuntime, false, 'config handler absent');
equal(config.activationBlockers.length, 7, 'config blocker count');
for (const value of Object.values(config.authority)) equal(value, false, 'config authority false');
for (const value of Object.values(config.effects)) equal(value, false, 'config effect false');
equal(config.matrix.version, '1.3.110', 'config matrix version');
equal(config.matrix.maturityBefore, 3, 'config maturity before');
equal(config.matrix.maturityAfter, 3, 'config maturity after');
equal(config.matrix.promotionAllowed, false, 'config promotion false');
equal(config.nextSublot, 'COM-B04G', 'config next sublot');

// Bound predecessor evidence.
equal(evidence.status, 'authenticated_rollback_only_canary_passed', 'evidence status');
equal(evidence.execution.run, 31067102891, 'evidence run');
equal(evidence.execution.job, 92507013853, 'evidence job');
equal(evidence.execution.artifact.id, 8954212159, 'evidence artifact');
equal(evidence.observed.coreCompositionActivationMode, 'disabled', 'evidence composition disabled');
equal(evidence.observed.coreLivePathBlocked, true, 'evidence live path blocked');
equal(evidence.observed.transactionRolledBack, true, 'evidence rollback');
equal(evidence.postflight.persistentResidue, false, 'evidence residue false');
equal(evidence.effects.routeRegistered, false, 'evidence route false');
equal(evidence.effects.runtimeDeployed, false, 'evidence deploy false');
equal(evidence.effects.realModerationExecuted, false, 'evidence moderation false');
equal(evidence.effects.productionChanged, false, 'evidence production false');
equal(evidence.effects.pullRequestMerged, false, 'evidence merge false');

// Matrix must remain unpromoted.
equal(matrix.version, '1.3.110', 'canonical matrix version');
const com = matrix.domains.find((entry) => entry.id === 'COM-001');
ok(com, 'COM-001 matrix entry');
equal(com.maturity, 3, 'COM-001 maturity unchanged');
equal(com.serverAuthority, 'partial', 'COM-001 server authority unchanged');
equal(com.productionGate, 'blocked', 'COM-001 production blocked');

console.log(`COM-B04F route/runtime readiness audit passed: ${checks}/${checks}`);
