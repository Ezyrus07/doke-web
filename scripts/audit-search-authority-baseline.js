#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const same = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);
const assert = (condition, message) => { if (!condition) errors.push(message); };

const files = {
  matrix: 'config/domain-completion-matrix.json',
  searchService: 'assets/js/services/search-service.js',
  searchData: 'assets/js/pages/search-data.js',
  searchResults: 'assets/js/pages/search-results.js',
  resultsHtml: 'resultados.html',
  searchRepository: 'assets/js/repositories/search-repository.js',
  serverResultsSurface: 'assets/js/pages/search/server-results-surface.js',
  detailExperience: 'assets/js/pages/detail-ad-experience.js',
  favoritesMigration: 'supabase/migrations/112_catalog_favorites_authority.sql',
  evidenceJson: 'docs/validation/SEARCH-001-A01-AUTHORITY-BASELINE.json',
  evidenceMarkdown: 'docs/validation/SEARCH-001-A01-AUTHORITY-BASELINE.md',
  workflow: '.github/workflows/search-authority-baseline.yml',
  a02EvidenceJson: 'docs/validation/SEARCH-001-A02-FAVORITES-AUTHORITY-RETIREMENT.json',
  a03EvidenceJson: 'docs/validation/SEARCH-001-A03-FAVORITES-SURFACES.json',
  a04EvidenceJson: 'docs/validation/SEARCH-001-A04-SERVER-SEARCH-CONTRACT.json',
  a05EvidenceJson: 'docs/validation/SEARCH-001-A05-SERVER-RESULTS-ACTIVATION.json',
  favoritesRepository: 'assets/js/repositories/favorites-repository.js',
  favoritesService: 'assets/js/services/favorites-service.js',
  favoritesController: 'assets/js/components/service-favorites-controller.js',
  detailController: 'assets/js/pages/detalhe-anuncio-data-controller.js'
};

[
  files.matrix,
  files.searchService,
  files.searchData,
  files.searchResults,
  files.detailExperience,
  files.favoritesMigration,
  files.evidenceJson,
  files.evidenceMarkdown,
  files.workflow
].forEach((file) => assert(exists(file), `required file missing: ${file}`));
if (errors.length) {
  console.error('[SEARCH-A01] Required baseline files are missing:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const a02Evidence = exists(files.a02EvidenceJson) ? JSON.parse(read(files.a02EvidenceJson)) : null;
const favoritesAuthorityRetired = Boolean(
  a02Evidence &&
  ['CANDIDATE_VALIDATED_CI_PENDING', 'COMPLETE'].includes(a02Evidence.status) &&
  a02Evidence.authority &&
  a02Evidence.authority.browserPersistentAuthority === 'retired' &&
  a02Evidence.authority.real === 'public.favorites'
);
const a03Evidence = exists(files.a03EvidenceJson) ? JSON.parse(read(files.a03EvidenceJson)) : null;
const favoritesSurfacesComplete = Boolean(
  a03Evidence &&
  a03Evidence.status === 'COMPLETE' &&
  a03Evidence.authority &&
  a03Evidence.authority.initialRead === 'one_owner_scoped_batch' &&
  a03Evidence.authority.perCardRead === 'forbidden' &&
  a03Evidence.matrix &&
  a03Evidence.matrix.searchB01 === 'reconciled_removed'
);
const a04Evidence = exists(files.a04EvidenceJson) ? JSON.parse(read(files.a04EvidenceJson)) : null;
const serverContractValidated = Boolean(
  a04Evidence &&
  a04Evidence.status === 'COMPLETE' &&
  a04Evidence.stagingValidation &&
  a04Evidence.stagingValidation.status === 'success' &&
  a04Evidence.authority &&
  a04Evidence.authority.rpc === 'public.search_public_services_v1(jsonb)'
);
const a05Evidence = exists(files.a05EvidenceJson) ? JSON.parse(read(files.a05EvidenceJson)) : null;
const searchResults = read(files.searchResults);
const serviceResultsActivated = Boolean(
  serverContractValidated &&
  a05Evidence &&
  ['CANDIDATE_IMPLEMENTATION_PENDING', 'CANDIDATE_VALIDATION_RUNNING', 'COMPLETE'].includes(a05Evidence.status) &&
  exists(files.searchRepository) &&
  exists(files.serverResultsSurface) &&
  exists(files.resultsHtml) &&
  searchResults.includes('serverResultsSurface.render({') &&
  searchResults.includes('serverResultsSurface?.loadMore?.()')
);

const matrix = JSON.parse(read(files.matrix));
const searchDomain = (matrix.domains || []).find((domain) => domain.id === 'SEARCH-001');
assert(Boolean(searchDomain), 'SEARCH-001 is missing from the domain completion matrix');
assert(searchDomain && searchDomain.maturity === 2, 'SEARCH-001 maturity must remain local_functional level 2 until controlled reconciliation');
assert(searchDomain && searchDomain.userFacingAuthority === 'hybrid', 'SEARCH-001 user-facing authority must remain hybrid during staged activation');
assert(searchDomain && searchDomain.serverAuthority === 'contract_only', 'SEARCH-001 server authority must remain contract_only until SEARCH-A05 reconciliation');
assert(searchDomain && searchDomain.stagingEvidence === 'local_e2e', 'SEARCH-001 staging evidence must remain local_e2e until SEARCH-A05 reconciliation');
assert(searchDomain && searchDomain.securityGate === 'blocked', 'SEARCH-001 security gate must remain blocked');
assert(searchDomain && searchDomain.productionGate === 'blocked', 'SEARCH-001 production gate must remain blocked');
const blockerIds = (searchDomain && searchDomain.blockers || []).map((blocker) => blocker.id).sort();
const expectedBlockers = favoritesSurfacesComplete
  ? ['SEARCH-B02', 'SEARCH-B03']
  : ['SEARCH-B01', 'SEARCH-B02', 'SEARCH-B03'];
assert(same(blockerIds, expectedBlockers), 'SEARCH-001 blocker set changed outside controlled reconciliation');

const searchService = read(files.searchService);
[
  "services.services.list({ status: 'active' })",
  "Doke.mockData.load('services')",
  'function list(filters)',
  "var query = normalizeText(filters.query || filters.q)",
  "var category = normalizeText(filters.category)",
  "var city = normalizeText(filters.city)",
  "return (items || []).filter(function (item)",
  'function queryPage(request)',
  'queryPage: queryPage'
].forEach((marker) => assert(searchService.includes(marker), `search service cumulative marker missing: ${marker}`));

const searchData = read(files.searchData);
[
  'doke.search.history',
  'window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY)',
  'window.localStorage.setItem(',
  'const userPool = [',
  'const shortVideoPool = [',
  'const beforeAfterPool = [',
  'const locationOptions = {',
  'const getServiceMatches = (query = "", filters = {}) =>'
].forEach((marker) => assert(searchData.includes(marker), `search data historical marker missing: ${marker}`));

if (serviceResultsActivated) {
  [
    'const serverResultsSurface = window.Doke?.searchResultsServerSurface',
    'serverResultsSurface.render({',
    'serverResultsSurface?.loadMore?.()',
    'displayUsers.slice(0, 6)',
    'workerResults.slice(0, 8)',
    'beforeAfterResults.slice(0, 8)'
  ].forEach((marker) => assert(searchResults.includes(marker), `post-SEARCH-A05 results marker missing: ${marker}`));
  [
    "api.list({ status: 'active', fresh, sort: 'updated_desc' })",
    'const getRelatedServices = (query, filters, limit = 6) =>',
    'score += Math.max(0, Math.round((Number(item.rating) || 0) * 2))',
    '.sort((a, b) => b.score - a.score',
    'const displayServices = [...exactServiceResults, ...relatedServices].slice(0, 6)'
  ].forEach((marker) => assert(!searchResults.includes(marker), `retired service-results authority returned: ${marker}`));

  const resultsHtml = read(files.resultsHtml);
  const repositoryIndex = resultsHtml.indexOf('assets/js/repositories/search-repository.js');
  const serviceIndex = resultsHtml.indexOf('assets/js/services/search-service.js');
  const surfaceIndex = resultsHtml.indexOf('assets/js/pages/search/server-results-surface.js');
  const resultsIndex = resultsHtml.indexOf('assets/js/pages/search-results.js');
  assert(repositoryIndex !== -1 && serviceIndex > repositoryIndex && surfaceIndex > serviceIndex && resultsIndex > surfaceIndex, 'SEARCH-A05 module load order is invalid');
  assert(resultsHtml.includes('data-results-load-more'), 'SEARCH-A05 cursor continuation control is missing');

  const repository = read(files.searchRepository);
  assert(repository.includes("RPC_NAME = 'search_public_services_v1'"), 'SEARCH-A05 canonical RPC marker is missing');
  assert(repository.includes("createError('DOKE_SEARCH_AUTHORITY_UNAVAILABLE'"), 'SEARCH-A05 repository must fail closed');
  const surface = read(files.serverResultsSurface);
  assert(surface.includes('searchApi().queryPage(request)'), 'SEARCH-A05 surface does not use queryPage');
  assert(surface.includes('fallbackUsed: false'), 'SEARCH-A05 surface does not prove fail-closed behavior');
} else {
  [
    "api.list({ status: 'active', fresh, sort: 'updated_desc' })",
    'const getRelatedServices = (query, filters, limit = 6) =>',
    'score += Math.max(0, Math.round((Number(item.rating) || 0) * 2))',
    '.sort((a, b) => b.score - a.score',
    'displayUsers.slice(0, 6)',
    'workerResults.slice(0, 8)',
    'beforeAfterResults.slice(0, 8)',
    'const displayServices = [...exactServiceResults, ...relatedServices].slice(0, 6)'
  ].forEach((marker) => assert(searchResults.includes(marker), `historical search-results marker missing: ${marker}`));
}

const detailExperience = read(files.detailExperience);
if (favoritesAuthorityRetired) {
  [files.favoritesRepository, files.favoritesService, files.detailController].forEach((file) => {
    assert(exists(file), `post-SEARCH-A02 authority file missing: ${file}`);
  });
  [
    'Doke.services && Doke.services.favorites',
    'favoritesService().isFavorite(normalizedServiceId)',
    'favoritesService().toggle(serviceId)',
    'DOKE_FAVORITES_AUTH_REQUIRED'
  ].forEach((marker) => assert(detailExperience.includes(marker), `post-SEARCH-A02 experience marker missing: ${marker}`));
  ['localStorage', 'sessionStorage', 'FAVORITES_KEY_PREFIX', 'doke.service-favorites.v1'].forEach((marker) => {
    assert(!detailExperience.includes(marker), `retired favorite browser authority returned: ${marker}`);
  });

  const favoritesRepository = read(files.favoritesRepository);
  [
    "AUTHORITY = 'supabase-or-fixture-memory'",
    "REMOTE_TABLE = 'favorites'",
    "error.code = 'DOKE_FAVORITES_AUTHORITY_UNAVAILABLE'",
    'fixtureFavoritesByUser = new Map()'
  ].forEach((marker) => assert(favoritesRepository.includes(marker), `post-SEARCH-A02 repository marker missing: ${marker}`));
  assert(!favoritesRepository.includes('localStorage'), 'favorites repository cannot reopen browser persistence');

  const detailController = read(files.detailController);
  const repositoryIndex = detailController.indexOf("key: 'favorites-repository'");
  const serviceIndex = detailController.indexOf("key: 'favorites-service'");
  const controllerIndex = detailController.indexOf("key: 'service-favorites-controller'");
  const experienceIndex = detailController.indexOf("key: 'detail-ad-experience'");
  assert(
    repositoryIndex !== -1 &&
    serviceIndex > repositoryIndex &&
    (!favoritesSurfacesComplete || controllerIndex > serviceIndex) &&
    experienceIndex > (favoritesSurfacesComplete ? controllerIndex : serviceIndex),
    'favorite module load order changed'
  );

  if (favoritesSurfacesComplete) {
    assert(exists(files.favoritesController), 'post-SEARCH-A03 favorites controller is missing');
    const favoritesController = read(files.favoritesController);
    assert((favoritesController.match(/service\(\)\.list\(\)/g) || []).length === 1, 'post-SEARCH-A03 controller must retain one list-read call site');
    assert(!favoritesController.includes('.isFavorite('), 'post-SEARCH-A03 controller cannot add per-card favorite reads');
    assert(!favoritesController.includes('localStorage'), 'post-SEARCH-A03 controller cannot reopen browser persistence');
  }
} else {
  [
    "FAVORITES_KEY_PREFIX = 'doke.service-favorites.v1:'",
    'localStorage.getItem(favoriteStorageKey())',
    'localStorage.setItem(favoriteStorageKey(), JSON.stringify(ids))',
    'function toggleFavorite(button)'
  ].forEach((marker) => assert(detailExperience.includes(marker), `favorite browser-authority marker missing: ${marker}`));
}
assert(!detailExperience.includes(".from('favorites')"), 'detail experience must not call favorites table directly');
assert(!detailExperience.includes('.from("favorites")'), 'detail experience must not call favorites table directly');

const favoritesMigration = read(files.favoritesMigration);
[
  'alter table public.favorites enable row level security',
  'create policy favorites_owner_select',
  'create policy favorites_owner_insert',
  'create policy favorites_owner_delete',
  'grant select, insert, delete on table public.favorites to authenticated'
].forEach((marker) => assert(favoritesMigration.includes(marker), `favorites schema authority marker missing: ${marker}`));

const evidence = JSON.parse(read(files.evidenceJson));
assert(evidence.domain === 'SEARCH-001' && evidence.sublot === 'SEARCH-A01', 'SEARCH-A01 evidence identity is invalid');
assert(evidence.status === 'baseline_frozen', 'SEARCH-A01 evidence status must remain baseline_frozen');
assert(['pending', 'done'].includes(evidence.validationStatus), 'SEARCH-A01 validation status is invalid');
assert(evidence.authority && evidence.authority.serviceFiltering === 'browser', 'historical browser service filtering authority is not documented');
assert(evidence.authority && evidence.authority.serviceRanking === 'browser_heuristic', 'historical browser ranking authority is not documented');
assert(evidence.authority && evidence.authority.pagination === 'fixed_client_slice', 'historical fixed client pagination boundary is not documented');
assert(evidence.authority && evidence.authority.favorites === 'browser_local_storage', 'historical browser favorites authority is not documented');
assert(evidence.staging && evidence.staging.favoritesRlsEnabled === true, 'staging favorites RLS evidence must remain explicit');
assert(evidence.staging && evidence.staging.favoritesPolicyCount === 3, 'staging favorites policy count must remain explicit');
assert(evidence.matrixDrift && evidence.matrixDrift.searchB01DescriptionIsStale === true, 'historical SEARCH-B01 matrix drift is not documented');
assert(evidence.safety && evidence.safety.implementationChanged === false, 'SEARCH-A01 cannot claim an implementation change');
assert(evidence.safety && evidence.safety.stagingChanged === false, 'SEARCH-A01 baseline cannot claim a staging write');
assert(evidence.safety && evidence.safety.productionChanged === false, 'SEARCH-A01 cannot change production');

const evidenceMarkdown = read(files.evidenceMarkdown);
[
  'BASELINE FROZEN',
  'doke.search.history',
  'doke.service-favorites.v1:',
  'SEARCH-B01',
  'SEARCH-A02',
  'RLS já está habilitada em staging'
].forEach((marker) => assert(evidenceMarkdown.includes(marker), `human evidence marker missing: ${marker}`));

const workflow = read(files.workflow);
[
  "- 'cat/**'",
  "- 'search/**'",
  'node scripts/audit-search-authority-baseline.js'
].forEach((marker) => assert(workflow.includes(marker), `SEARCH-A01 workflow marker missing: ${marker}`));

if (errors.length) {
  console.error('[SEARCH-A01] Authority baseline audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[SEARCH-A01] Historical search authority baseline remains frozen and cumulative.');
console.log(serviceResultsActivated
  ? '[SEARCH-A01] Service results now use canonical server pagination; static non-service pools and local history remain explicitly preserved.'
  : '[SEARCH-A01] Remote catalog reads still coexist with browser filtering, ranking, fixed slicing and static non-service pools.');
console.log(favoritesSurfacesComplete
  ? '[SEARCH-A01] SEARCH-B01 was reconciled after canonical favorites reached every governed service surface.'
  : favoritesAuthorityRetired
    ? '[SEARCH-A01] Historical browser favorites authority is documented and its controlled SEARCH-A02 retirement is preserved.'
    : '[SEARCH-A01] Favorites schema is RLS-protected in staging, but the product path remains browser-local.');
console.log('[SEARCH-A01] Production remains unchanged.');
