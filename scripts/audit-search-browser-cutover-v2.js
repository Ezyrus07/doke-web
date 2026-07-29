#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) errors.push(message); };

const files = {
  config: 'assets/js/core/supabase-config.js',
  repository: 'assets/js/repositories/search-repository.js',
  service: 'assets/js/services/search-service.js',
  surface: 'assets/js/pages/search/server-results-surface.js',
  passiveController: 'assets/js/pages/resultados-data-controller.js',
  runtime: 'scripts/test-search-browser-cutover-runtime.js',
  browserTest: 'tests/search/search-results-staging.spec.js',
  workflow: '.github/workflows/search-results-staging-browser.yml',
  evidence: 'docs/validation/SEARCH-001-A10-BROWSER-CUTOVER-V2.json',
  prerequisite: 'docs/validation/SEARCH-001-A09-OBSERVABILITY-V2.json'
};

Object.values(files).forEach((file) => assert(exists(file), `required SEARCH-A10 file missing: ${file}`));
if (errors.length) {
  console.error('[SEARCH-A10] Required files are missing:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const config = read(files.config);
[
  'searchTransport: "edge-v2"',
  'searchRollbackTransport: "rpc-v1"',
  'searchEdgeFunction: "search-public-services-v2"'
].forEach((marker) => assert(config.includes(marker), `staging cutover config marker missing: ${marker}`));
assert(!config.includes('searchTransport: "automatic"'), 'automatic search transport is forbidden');

const repository = read(files.repository);
[
  "TRANSPORT_EDGE_V2 = 'edge-v2'",
  "TRANSPORT_RPC_V1 = 'rpc-v1'",
  "RPC_NAME = 'search_public_services_v1'",
  "EDGE_FUNCTION_NAME = 'search-public-services-v2'",
  'function resolveTransport(config)',
  'function resolveRollbackTransport(config)',
  'function queryEdgeV2(request)',
  'function queryRpcV1(request)',
  'client.functions.invoke(EDGE_FUNCTION_NAME, options)',
  'client.rpc(RPC_NAME, { p_request: request })',
  "rankingVersion: 'search-rank-v0'",
  "throw createError('DOKE_SEARCH_TRANSPORT_INVALID'",
  "throw createError('DOKE_SEARCH_ROLLBACK_INVALID'",
  "transport === TRANSPORT_EDGE_V2",
  '? queryEdgeV2(request)',
  ': queryRpcV1(request)'
].forEach((marker) => assert(repository.includes(marker), `repository cutover marker missing: ${marker}`));
[
  'localStorage',
  'sessionStorage',
  'queryEdgeV2(request).catch(function () { return queryRpcV1(request)',
  'queryEdgeV2(request).catch(() => queryRpcV1(request))'
].forEach((marker) => assert(!repository.includes(marker), `forbidden browser authority/fallback marker remains: ${marker}`));
assert(repository.includes("['rankScore', 'reviewSignal', 'availabilitySignal', 'recencySignal']"), 'private ranking payload denylist is missing');

const service = read(files.service);
assert(service.includes('queryPage: queryPage'), 'search service no longer exposes queryPage');
assert(service.includes('getContract: function () { return assertSearchRepository().getContract(); }'), 'search service no longer exposes the active transport contract');

const surface = read(files.surface);
[
  'function searchContract()',
  "transport: contract.transport || 'unknown'",
  "rankingVersion: response && response.ranking && response.ranking.version || null",
  'fallbackUsed: false'
].forEach((marker) => assert(surface.includes(marker), `surface cutover marker missing: ${marker}`));

const passiveController = read(files.passiveController);
[
  'function currentAuthority()',
  'function currentContractVersion()',
  'function currentTransport()',
  'repositoryTransport',
  'transport: source.transport || currentTransport()'
].forEach((marker) => assert(passiveController.includes(marker), `passive controller transport marker missing: ${marker}`));

const runtime = read(files.runtime);
[
  "searchTransport: 'edge-v2'",
  "searchTransport: 'rpc-v1'",
  "Edge failure must not auto-fallback to RPC v1",
  "DOKE_SEARCH_TRANSPORT_INVALID",
  "DOKE_SEARCH_ROLLBACK_INVALID",
  "DOKE_SEARCH_RESPONSE_INVALID"
].forEach((marker) => assert(runtime.includes(marker), `runtime proof marker missing: ${marker}`));

const browserTest = read(files.browserTest);
[
  "EDGE_PATH = '/functions/v1/search-public-services-v2'",
  "ROLLBACK_RPC_PATH = '/rest/v1/rpc/search_public_services_v1'",
  "renders service results through the real staging Edge v2 authority under rank v0",
  "fails closed when Edge v2 is unavailable and does not auto-fallback to RPC v1",
  "rolls back deliberately to the real staging RPC v1 when configured",
  "expect(rendered.transport).toBe('edge-v2')",
  "expect(rendered.transport).toBe('rpc-v1')",
  'expect(authorityRequests.directCatalog).toEqual([])'
].forEach((marker) => assert(browserTest.includes(marker), `browser proof marker missing: ${marker}`));

const workflow = read(files.workflow);
[
  'Doke SEARCH-A10 Browser Cutover V2',
  'node scripts/audit-search-browser-cutover-v2.js',
  'node scripts/test-search-browser-cutover-runtime.js',
  'tests/search/search-results-staging.spec.js'
].forEach((marker) => assert(workflow.includes(marker), `workflow marker missing: ${marker}`));

const prerequisite = JSON.parse(read(files.prerequisite));
assert(prerequisite.domain === 'SEARCH-001' && prerequisite.sublot === 'SEARCH-A09', 'SEARCH-A09 prerequisite identity is invalid');
assert(prerequisite.status === 'COMPLETE_STAGING_BACKEND_INACTIVE', 'SEARCH-A09 must be complete before browser cutover');

const evidence = JSON.parse(read(files.evidence));
assert(evidence.domain === 'SEARCH-001' && evidence.sublot === 'SEARCH-A10', 'SEARCH-A10 evidence identity is invalid');
assert(['CANDIDATE_IMPLEMENTATION_PENDING', 'CANDIDATE_VALIDATION_RUNNING', 'COMPLETE_STAGING_BROWSER_CUTOVER'].includes(evidence.status), 'SEARCH-A10 evidence status is invalid');
assert(evidence.transport && evidence.transport.active === 'edge-v2', 'A10 active transport is not documented');
assert(evidence.transport && evidence.transport.rollback === 'rpc-v1', 'A10 rollback transport is not documented');
assert(evidence.transport && evidence.transport.automaticFallback === false, 'A10 automatic fallback must remain disabled');
assert(evidence.ranking && evidence.ranking.activeVersion === 'search-rank-v0', 'A10 must preserve ranking v0');
assert(evidence.safety && evidence.safety.productionChanged === false, 'A10 cannot change production');
assert(evidence.safety && evidence.safety.realDataMutated === false, 'A10 cannot mutate real marketplace data');

if (errors.length) {
  console.error('[SEARCH-A10] Browser cutover audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[SEARCH-A10] Browser Edge v2 cutover contract: PASS');
console.log('[SEARCH-A10] Staging defaults to Edge v2, RPC v1 remains explicit rollback, and automatic fallback is forbidden.');
