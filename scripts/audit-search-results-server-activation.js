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
  html: 'resultados.html',
  results: 'assets/js/pages/search-results.js',
  passiveController: 'assets/js/pages/resultados-data-controller.js',
  controllerData: 'assets/js/controllers/controller-data.js',
  surface: 'assets/js/pages/search/server-results-surface.js',
  repository: 'assets/js/repositories/search-repository.js',
  service: 'assets/js/services/search-service.js',
  css: 'assets/css/pages/search-results.css',
  runtime: 'scripts/test-search-results-server-surface-runtime.js',
  evidence: 'docs/validation/SEARCH-001-A05-SERVER-RESULTS-ACTIVATION.json',
  a04Evidence: 'docs/validation/SEARCH-001-A04-SERVER-SEARCH-CONTRACT.json',
  workflow: '.github/workflows/search-results-server-activation.yml',
  browserWorkflow: '.github/workflows/search-results-staging-browser.yml',
  browserTest: 'tests/search/search-results-staging.spec.js'
};

Object.values(files).forEach((file) => assert(exists(file), `required SEARCH-A05 file missing: ${file}`));
if (errors.length) {
  console.error('[SEARCH-A05] Required files are missing:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const html = read(files.html);
const repositoryIndex = html.indexOf('assets/js/repositories/search-repository.js');
const serviceIndex = html.indexOf('assets/js/services/search-service.js');
const surfaceIndex = html.indexOf('assets/js/pages/search/server-results-surface.js');
const resultsIndex = html.indexOf('assets/js/pages/search-results.js');
assert(repositoryIndex !== -1, 'resultados.html does not load the search repository');
assert(serviceIndex > repositoryIndex, 'search service must load after search repository');
assert(surfaceIndex > serviceIndex, 'server results surface must load after search service');
assert(resultsIndex > surfaceIndex, 'legacy page coordinator must load after the server results surface');
assert((html.match(/assets\/js\/services\/search-service\.js/g) || []).length === 1, 'search service must load exactly once');
assert(html.includes('data-results-pagination'), 'results pagination container is missing');
assert(html.includes('data-results-load-more'), 'results cursor continuation button is missing');

const results = read(files.results);
[
  "resultsPagination: queryAny('[data-results-pagination]')",
  "resultsLoadMore: queryAny('[data-results-load-more]')",
  'window.Doke?.searchResultsServerSurface',
  'serverResultsSurface.render({',
  'serverResultsSurface?.loadMore?.()',
  'serverResultsSurface?.cancel?.()',
  "setResultsState('error')"
].forEach((marker) => assert(results.includes(marker), `results activation marker missing: ${marker}`));
[
  'const ensurePublicServices =',
  'const getServiceMatches =',
  'const getRelatedServices =',
  'const renderEmptySuggestions =',
  'const exactServiceResults = getServiceMatches',
  'const displayServices = [...exactServiceResults, ...relatedServices].slice(0, 6)',
  'api.list({ status: \'active\', fresh, sort: \'updated_desc\' })'
].forEach((marker) => assert(!results.includes(marker), `retired browser service authority remains: ${marker}`));
assert(results.includes("filters.searchType === 'users'"), 'static user search scope must remain available');
assert(results.includes("filters.searchType === 'workers'"), 'static Worker search scope must remain available');
assert(results.includes("filters.searchType === 'before-after'"), 'static publication search scope must remain available');

const passiveController = read(files.passiveController);
[
  "mode: 'passive-canonical-event-observer'",
  "document.addEventListener('doke:search-server-page-rendered'",
  "document.addEventListener('doke:search-server-error'",
  "authority: 'public.search_public_services_v1'",
  "source: 'canonical-server-search-event'"
].forEach((marker) => assert(passiveController.includes(marker), `passive resultados controller marker missing: ${marker}`));
[
  'pageDataOrchestrator',
  'repositoryBoundary',
  'getPageData(',
  'peekPageData(',
  'doke:page-data-revalidated'
].forEach((marker) => assert(!passiveController.includes(marker), `legacy resultados data loader remains executable: ${marker}`));

const controllerData = read(files.controllerData);
assert(controllerData.includes('resultados: []'), 'generic controller resources must be empty for resultados');
assert(controllerData.includes("mode: pageName === 'resultados' ? 'canonical-search-owned'"), 'generic controller must mark resultados as canonical-search-owned');
assert(!controllerData.includes("resultados: ['services'"), 'generic controller reopened the full service catalog for resultados');

const surface = read(files.surface);
[
  'searchApi().queryPage(request)',
  "serviceMode: filters.online ? 'online' : 'any'",
  'pageSize: PAGE_SIZE',
  'cursor: normalizeText(cursor)',
  'uniqueItems(state.items, incoming)',
  "dispatch('doke:search-server-error'",
  'fallbackUsed: false',
  'loadMore: loadMore',
  'cancel: cancel'
].forEach((marker) => assert(surface.includes(marker), `server surface marker missing: ${marker}`));
['localStorage', 'sessionStorage', 'getServiceMatches', 'services.services.list', 'Doke.mockData'].forEach((marker) => {
  assert(!surface.includes(marker), `server surface reopened local authority: ${marker}`);
});

const repository = read(files.repository);
assert(repository.includes("RPC_NAME = 'search_public_services_v1'"), 'canonical search RPC marker is missing');
assert(repository.includes('client.rpc(RPC_NAME, { p_request: request })'), 'repository does not call the canonical RPC');
assert(repository.includes("createError('DOKE_SEARCH_AUTHORITY_UNAVAILABLE'"), 'repository does not fail closed');

const service = read(files.service);
assert(service.includes('function queryPage(request)'), 'search service queryPage boundary is missing');
assert(service.includes('queryPage: queryPage'), 'search service does not expose queryPage');

const css = read(files.css);
assert(css.includes('.results-pagination'), 'results pagination CSS is missing');
assert(css.includes('[data-results-load-more]'), 'load-more CSS contract is missing');

const runtime = read(files.runtime);
[
  'surface.render(runtime.resultContext)',
  'surface.loadMore()',
  "serviceMode, 'online'",
  'duplicate cursor rows must not be appended',
  'fallbackUsed, false'
].forEach((marker) => assert(runtime.includes(marker), `SEARCH-A05 runtime marker missing: ${marker}`));

const browserTest = read(files.browserTest);
[
  "SEARCH_RPC_PATH = '/rest/v1/rpc/search_public_services_v1'",
  "url.pathname === '/rest/v1/services'",
  'expect(directCatalogRequests).toEqual([])',
  'expect(error.fallbackUsed).toBe(false)',
  "toHaveAttribute('data-results-state', 'error')"
].forEach((marker) => assert(browserTest.includes(marker), `staging browser proof marker missing: ${marker}`));

const a04Evidence = JSON.parse(read(files.a04Evidence));
assert(a04Evidence.status === 'COMPLETE', 'SEARCH-A04 must be complete before activation');
assert(a04Evidence.stagingValidation && a04Evidence.stagingValidation.status === 'success', 'SEARCH-A04 staging RPC must be validated before activation');
assert(a04Evidence.approvedSnapshotAuthority && a04Evidence.approvedSnapshotAuthority.pendingEditsSearchable === false, 'approved-snapshot search authority is not preserved');

const evidence = JSON.parse(read(files.evidence));
assert(evidence.domain === 'SEARCH-001' && evidence.sublot === 'SEARCH-A05', 'SEARCH-A05 evidence identity is invalid');
assert(['CANDIDATE_IMPLEMENTATION_PENDING', 'CANDIDATE_VALIDATION_RUNNING', 'COMPLETE'].includes(evidence.status), 'SEARCH-A05 evidence status is invalid');
assert(evidence.targetAuthority && evidence.targetAuthority.remoteFailureMode === 'fail_closed', 'A05 fail-closed mode is not documented');
assert(evidence.targetAuthority && evidence.targetAuthority.localCatalogFallback === 'forbidden_for_service_results', 'A05 local fallback retirement is not documented');
assert(evidence.scope && evidence.scope.ranking === 'SEARCH_B03_preserved', 'SEARCH-B03 preservation is not documented');
assert(evidence.safety && evidence.safety.productionChanged === false, 'SEARCH-A05 cannot change production');

const workflow = read(files.workflow);
[
  'assets/js/pages/resultados-data-controller.js',
  'assets/js/controllers/controller-data.js',
  'node scripts/audit-search-authority-baseline.js',
  'node scripts/audit-search-server-contract.js',
  'node scripts/audit-search-approved-snapshot-authority.js',
  'node scripts/test-search-server-contract-runtime.js',
  'node scripts/audit-search-results-server-activation.js',
  'node scripts/test-search-results-server-surface-runtime.js'
].forEach((marker) => assert(workflow.includes(marker), `SEARCH-A05 workflow marker missing: ${marker}`));

const browserWorkflow = read(files.browserWorkflow);
[
  'assets/js/pages/resultados-data-controller.js',
  'assets/js/controllers/controller-data.js',
  'tests/search/search-results-staging.spec.js',
  'Run staging browser authority tests'
].forEach((marker) => assert(browserWorkflow.includes(marker), `SEARCH-A05 browser workflow marker missing: ${marker}`));

if (errors.length) {
  console.error('[SEARCH-A05] Server results activation audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[SEARCH-A05] Canonical server-side service results activation: PASS');
console.log('[SEARCH-A05] Full-catalog browser filtering, related fallback, fixed slicing and parallel legacy catalog loaders are retired for service results.');
console.log('[SEARCH-A05] Cursor continuation is canonical and remote failures remain fail-closed.');
console.log('[SEARCH-A05] Static users, Workers, publications, suggestions and history remain explicitly out of this sublot.');
