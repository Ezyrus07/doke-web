#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = {
  module: 'backend/runtime/staging/community-composition-root.js',
  config: 'config/com-b02d-community-composition-root-canary-readiness.json',
  fixtures: 'tests/fixtures/com-b02d-community-composition-root-cases.json',
  test: 'scripts/test-com-b02d-community-composition-root-canary-readiness.js',
  docs: 'docs/COM-B02D-COMMUNITY-COMPOSITION-ROOT-CANARY-READINESS.md',
  workflow: '.github/workflows/com-b02d-community-composition-root-canary-readiness.yml',
  runtime: 'backend/runtime/staging/staging-api-runtime.js',
  routes: 'backend/shared/http/route-registry.js',
  loader: 'backend/shared/http/module-route-loader.js',
  predecessor: 'docs/validation/COM-B02C-STAGING-MIGRATION-APPLICATION.json'
};
const read = (key) => fs.readFileSync(path.join(root, files[key]), 'utf8');
let checks = 0;
const check = (value, message) => { checks += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { checks += 1; assert.strictEqual(actual, expected, message); };

for (const [key, relative] of Object.entries(files)) {
  check(fs.existsSync(path.join(root, relative)), `${key} exists`);
  check(fs.statSync(path.join(root, relative)).size > 20, `${key} nonempty`);
}

const source = read('module');
const config = JSON.parse(read('config'));
const fixtures = JSON.parse(read('fixtures'));
const docs = read('docs');
const workflow = read('workflow');
const runtime = read('runtime');
const routes = read('routes');
const loader = read('loader');
const predecessor = JSON.parse(read('predecessor'));
const phrase = 'I_EXPLICITLY_AUTHORIZE_COM_B02D_AUTHENTICATED_READ_ONLY_CANARY_ON_DOKE_STAGING';

check(source.includes("const CONTRACT_ID = 'com-b02d-community-composition-root-canary-readiness-v1'"), 'contract id');
check(source.includes("require('../../modules/communities/community-supabase-repository-adapter')"), 'adapter dependency');
check(source.includes("authority: 'server_service_role'"), 'server role executor');
check(source.includes('name !== RPC.loadCanonicalState'), 'read-only allowlist');
check(source.includes('COM_MUTATING_RPC_BLOCKED'), 'mutation blocker');
check(source.includes('assertAuthenticatedActor'), 'authenticated actor guard');
check(source.includes('authorized_for_single_authenticated_read_only_canary'), 'single canary decision');
check(!source.includes('createClient'), 'no client creation');
check(!source.includes('process.env'), 'no env access');
check(!source.includes('fetch('), 'no direct network');
check(!source.includes('.from('), 'no table access');
check(!source.includes('claimIdempotencyKey('), 'no idempotency mutation exposure');
check(!source.includes('commitEventAndProjection('), 'no event mutation exposure');

const expectedContract = 'com-b02d-community-composition-root-canary-readiness-v1';
equal(config.contractId, expectedContract, 'config contract');
equal(config.scope, 'repository_only', 'repository only');
equal(config.status, 'composition_root_prepared_canary_authorization_required', 'status');
equal(config.stagingFoundation.projectId, 'zwkczgewzbsorbrjuzpb', 'project frozen');
equal(config.stagingFoundation.migrationVersion, '20260805153539', 'migration version');
equal(config.stagingFoundation.migrationApplied, true, 'migration applied');
equal(config.stagingFoundation.structuralVerificationPassed, true, 'predecessor verified');
equal(config.compositionRoot.prepared, true, 'root prepared');
equal(config.compositionRoot.connectedToMainRuntime, false, 'not connected');
equal(config.compositionRoot.routeRegistered, false, 'no route');
equal(config.compositionRoot.mutatingRpcExposed, false, 'no mutation rpc');
equal(config.canary.requiredPhrase, phrase, 'phrase frozen');
equal(config.canary.authorizationReceived, false, 'authorization absent');
equal(config.canary.authorizationConsumed, false, 'authorization not consumed');
equal(config.canary.executionAttempted, false, 'execution not attempted');
equal(config.canary.readOnly, true, 'read only');
equal(config.canary.mutationAllowed, false, 'mutation prohibited');
equal(config.authority.authenticatedCanaryAuthority, false, 'canary authority false');
equal(config.authority.stagingReadAuthority, false, 'read authority false');
equal(config.authority.stagingMutationAuthority, false, 'mutation authority false');
equal(config.authority.runtimeDeploymentAuthority, false, 'deployment false');
equal(config.authority.productionAuthority, false, 'production false');
equal(config.authority.pullRequestMergeAuthority, false, 'merge false');
for (const value of Object.values(config.prohibitedEffects)) equal(value, false, 'prohibited effect false');
equal(config.nextAction, 'await_exact_explicit_canary_authorization_phrase', 'next action');

equal(fixtures.authorizationCases.length, fixtures.expected.authorizationTotal, 'fixture total');
equal(fixtures.expected.authorized, 1, 'one authorized case');
equal(fixtures.expected.blocked, 8, 'eight blocked cases');
check(docs.includes(phrase), 'docs phrase');
check(docs.includes('connected to main runtime: false'), 'docs disconnected');
check(docs.includes('não representa autorização recebida'), 'docs no implied auth');
check(!runtime.includes('community-composition-root'), 'main runtime unchanged');
check(!routes.includes("module: 'communities'"), 'no community route');
check(!loader.includes("require('../../modules/communities"), 'loader unchanged');
equal(predecessor.status, 'staging_migration_applied_and_structurally_verified', 'predecessor success');
equal(predecessor.migration.successfulApplications, 1, 'predecessor migration applied');
equal(predecessor.verification.domainRowsCreated, 0, 'predecessor zero rows');
equal(predecessor.remainingAuthority.stagingMutationAuthority, false, 'predecessor mutation authority closed');
check(workflow.includes('permissions:\n  contents: read'), 'workflow read-only');
check(workflow.includes('Audit COM-B02D'), 'audit step');
check(workflow.includes('Conformance COM-B02D'), 'conformance step');
check(workflow.includes('COM-B02C predecessor regression'), 'predecessor regression');
check(!workflow.includes('workflow_dispatch'), 'no dispatch');
check(!workflow.includes('secrets.'), 'no secrets');
check(!workflow.includes('supabase '), 'no supabase command');
check(!workflow.includes('psql'), 'no psql');
check(!workflow.includes('curl '), 'no curl');

console.log(`COM-B02D audit passed: ${checks}/${checks}`);
