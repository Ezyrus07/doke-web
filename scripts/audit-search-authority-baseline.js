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
  matrix: 'config/domain-completion-matrix.json',
  searchService: 'assets/js/services/search-service.js',
  searchData: 'assets/js/pages/search-data.js',
  searchResults: 'assets/js/pages/search-results.js',
  detailExperience: 'assets/js/pages/detail-ad-experience.js',
  favoritesMigration: 'supabase/migrations/112_catalog_favorites_authority.sql',
  evidenceJson: 'docs/validation/SEARCH-001-A01-AUTHORITY-BASELINE.json',
  evidenceMarkdown: 'docs/validation/SEARCH-001-A01-AUTHORITY-BASELINE.md',
  workflow: '.github/workflows/search-authority-baseline.yml'
};

Object.values(files).forEach((file) => assert(exists(file), `required file missing: ${file}`));
if (errors.length) {
  console.error('[SEARCH-A01] Required baseline files are missing:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const matrix = JSON.parse(read(files.matrix));
const searchDomain = (matrix.domains || []).find((domain) => domain.id === 'SEARCH-001');
assert(Boolean(searchDomain), 'SEARCH-001 is missing from the domain completion matrix');
assert(searchDomain && searchDomain.maturity === 2, 'SEARCH-001 maturity must remain local_functional level 2 during baseline');
assert(searchDomain && searchDomain.userFacingAuthority === 'hybrid', 'SEARCH-001 user-facing authority must remain hybrid during baseline');
assert(searchDomain && searchDomain.serverAuthority === 'contract_only', 'SEARCH-001 server authority must remain contract_only during baseline');
assert(searchDomain && searchDomain.stagingEvidence === 'local_e2e', 'SEARCH-001 staging evidence must remain local_e2e during baseline');
assert(searchDomain && searchDomain.securityGate === 'blocked', 'SEARCH-001 security gate must remain blocked');
assert(searchDomain && searchDomain.productionGate === 'blocked', 'SEARCH-001 production gate must remain blocked');
const blockerIds = (searchDomain && searchDomain.blockers || []).map((blocker) => blocker.id).sort();
assert(JSON.stringify(blockerIds) === JSON.stringify(['SEARCH-B01', 'SEARCH-B02', 'SEARCH-B03']), 'SEARCH-001 blocker set changed outside controlled reconciliation');

const searchService = read(files.searchService);
[
  "services.services.list({ status: 'active' })",
  "Doke.mockData.load('services')",
  'function list(filters)',
  "var query = normalizeText(filters.query || filters.q)",
  "var category = normalizeText(filters.category)",
  "var city = normalizeText(filters.city)",
  "return (items || []).filter(function (item)"
].forEach((marker) => assert(searchService.includes(marker), `search service baseline marker missing: ${marker}`));

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
].forEach((marker) => assert(searchData.includes(marker), `search data baseline marker missing: ${marker}`));

const searchResults = read(files.searchResults);
[
  "api.list({ status: 'active', fresh, sort: 'updated_desc' })",
  'const getRelatedServices = (query, filters, limit = 6) =>',
  'score += Math.max(0, Math.round((Number(item.rating) || 0) * 2))',
  '.sort((a, b) => b.score - a.score',
  'displayUsers.slice(0, 6)',
  'workerResults.slice(0, 8)',
  'beforeAfterResults.slice(0, 8)',
  'const displayServices = [...exactServiceResults, ...relatedServices].slice(0, 6)'
].forEach((marker) => assert(searchResults.includes(marker), `search results baseline marker missing: ${marker}`));

const detailExperience = read(files.detailExperience);
[
  "FAVORITES_KEY_PREFIX = 'doke.service-favorites.v1:'",
  'localStorage.getItem(favoriteStorageKey())',
  'localStorage.setItem(favoriteStorageKey(), JSON.stringify(ids))',
  'function toggleFavorite(button)'
].forEach((marker) => assert(detailExperience.includes(marker), `favorite browser-authority marker missing: ${marker}`));
assert(!detailExperience.includes(".from('favorites')"), 'baseline unexpectedly contains a remote favorites mutation in detail-ad experience');
assert(!detailExperience.includes('.from("favorites")'), 'baseline unexpectedly contains a remote favorites mutation in detail-ad experience');

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
assert(evidence.authority && evidence.authority.serviceFiltering === 'browser', 'browser service filtering authority is not documented');
assert(evidence.authority && evidence.authority.serviceRanking === 'browser_heuristic', 'browser ranking authority is not documented');
assert(evidence.authority && evidence.authority.pagination === 'fixed_client_slice', 'fixed client pagination boundary is not documented');
assert(evidence.authority && evidence.authority.favorites === 'browser_local_storage', 'browser favorites authority is not documented');
assert(evidence.staging && evidence.staging.favoritesRlsEnabled === true, 'staging favorites RLS evidence must remain explicit');
assert(evidence.staging && evidence.staging.favoritesPolicyCount === 3, 'staging favorites policy count must remain explicit');
assert(evidence.matrixDrift && evidence.matrixDrift.searchB01DescriptionIsStale === true, 'SEARCH-B01 matrix drift must remain documented until reconciliation');
assert(evidence.safety && evidence.safety.implementationChanged === false, 'SEARCH-A01 cannot claim a product implementation change');
assert(evidence.safety && evidence.safety.stagingChanged === false, 'SEARCH-A01 cannot change staging');
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

console.log('[SEARCH-A01] Search authority baseline is frozen.');
console.log('[SEARCH-A01] Remote catalog reads coexist with browser filtering, ranking, fixed slicing and static non-service pools.');
console.log('[SEARCH-A01] Favorites schema is RLS-protected in staging, but the product path remains browser-local.');
console.log('[SEARCH-A01] Production and staging were not changed.');
