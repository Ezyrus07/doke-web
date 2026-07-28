#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) errors.push(message); };
const same = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);

const files = {
  matrix: 'config/domain-completion-matrix.json',
  migration: 'supabase/migrations/158_service_search_contract.sql',
  sqlTest: 'supabase/tests/022_service_search_contract_validation.sql',
  repository: 'assets/js/repositories/search-repository.js',
  service: 'assets/js/services/search-service.js',
  results: 'assets/js/pages/search-results.js',
  resultsHtml: 'resultados.html',
  serverSurface: 'assets/js/pages/search/server-results-surface.js',
  runtime: 'scripts/test-search-server-contract-runtime.js',
  evidence: 'docs/validation/SEARCH-001-A04-SERVER-SEARCH-CONTRACT.json',
  a03Evidence: 'docs/validation/SEARCH-001-A03-FAVORITES-SURFACES.json',
  a05Evidence: 'docs/validation/SEARCH-001-A05-SERVER-RESULTS-ACTIVATION.json',
  workflow: '.github/workflows/search-server-contract.yml'
};

[
  files.matrix,
  files.migration,
  files.sqlTest,
  files.repository,
  files.service,
  files.results,
  files.resultsHtml,
  files.runtime,
  files.evidence,
  files.a03Evidence,
  files.workflow
].forEach((file) => assert(exists(file), `required SEARCH-A04 file missing: ${file}`));
if (errors.length) {
  console.error('[SEARCH-A04] Required files are missing:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const migration = read(files.migration);
[
  'create or replace function private.refresh_service_search_vector()',
  "pg_catalog.to_tsvector('pg_catalog.portuguese'::pg_catalog.regconfig",
  'extensions.unaccent(',
  'create trigger trg_services_search_vector',
  'create index if not exists idx_services_public_search_vector',
  'using gin (search_vector)',
  'create index if not exists idx_services_public_search_cursor',
  'create or replace function public.search_public_services_v1(p_request jsonb',
  "security definer\nset search_path = 'pg_catalog'",
  "message = 'DOKE_SEARCH_REQUEST_UNKNOWN_FIELD'",
  "message = 'DOKE_SEARCH_PAGE_SIZE_INVALID'",
  "message = 'DOKE_SEARCH_CURSOR_INVALID'",
  'v_page_size > 24',
  "s.status = 'published'",
  's.approved_version_id is not null',
  "av.review_status = 'approved'",
  "v_service_mode = 'online'",
  "v_service_mode = 'local'",
  "v_service_mode = 'any'",
  'order by updated_at desc, id desc',
  "'authority', 'public.search_public_services_v1'",
  "'contractVersion', '1.0.0'",
  'grant execute on function public.search_public_services_v1(jsonb) to anon, authenticated',
  'revoke all on function private.refresh_service_search_vector() from public, anon, authenticated'
].forEach((marker) => assert(migration.includes(marker), `migration contract marker missing: ${marker}`));
[
  "'metadata'",
  "'email'",
  "'searchVector'"
].forEach((field) => {
  const dtoSection = migration.slice(migration.indexOf("'items'"), migration.indexOf("'page'", migration.indexOf("'items'")));
  assert(!dtoSection.includes(field), `public item DTO exposes forbidden field ${field}`);
});
assert(!migration.includes('service_role'), 'SEARCH-A04 public search cannot depend on service_role browser authority');

const sqlTest = read(files.sqlTest);
[
  'begin;',
  'rollback;',
  "to_regprocedure('public.search_public_services_v1(jsonb)')",
  "has_function_privilege('anon', 'public.search_public_services_v1(jsonb)', 'EXECUTE')",
  'SEARCH-A04 service without an approved version acquired a search_vector',
  'SEARCH-A04 approved version transition did not materialize search_vector',
  'SEARCH-A04 exact local geographic eligibility failed',
  'SEARCH-A04 any-mode did not combine exact local and online eligibility',
  'SEARCH-A04 online-only eligibility failed',
  'SEARCH-A04 cursor pagination returned a duplicate service',
  'SEARCH-A04 accepted an oversized page',
  'SEARCH-A04 accepted an unknown request field',
  'SEARCH-A04 accepted an invalid cursor'
].forEach((marker) => assert(sqlTest.includes(marker), `SQL validation marker missing: ${marker}`));

const repository = read(files.repository);
[
  "AUTHORITY = 'supabase-rpc-or-fixture-memory'",
  "RPC_NAME = 'search_public_services_v1'",
  "CONTRACT_VERSION = '1.0.0'",
  'MAX_PAGE_SIZE = 24',
  'DEFAULT_PAGE_SIZE = 12',
  'ALLOWED_FIELDS = Object.freeze([',
  'client.rpc(RPC_NAME, { p_request: request })',
  "createError('DOKE_SEARCH_AUTHORITY_UNAVAILABLE'",
  "authority: 'fixture-memory.search_public_services_v1'",
  'function fixtureGeographicMatch(item, request)',
  'function afterFixtureCursor(item, cursor)',
  'queryPage: queryPage',
  'normalizeRequest: normalizeRequest'
].forEach((marker) => assert(repository.includes(marker), `repository contract marker missing: ${marker}`));
assert(!repository.includes('localStorage'), 'search repository cannot use localStorage');
assert(!repository.includes('sessionStorage'), 'search repository cannot use sessionStorage');
assert(!repository.includes("Doke.mockData.load('services')"), 'canonical search repository cannot bypass the service catalog boundary');

const service = read(files.service);
[
  'function list(filters)',
  'return loadServices().then(function (items)',
  'function queryPage(request)',
  'queryPage: queryPage',
  'normalizeRequest: normalizeRequest',
  'pageRequestFromLocationSearch: pageRequestFromLocationSearch'
].forEach((marker) => assert(service.includes(marker), `search service contract marker missing: ${marker}`));

const a05Evidence = exists(files.a05Evidence) ? JSON.parse(read(files.a05Evidence)) : null;
const results = read(files.results);
const resultsHtml = read(files.resultsHtml);
const resultsActivated = Boolean(
  a05Evidence &&
  ['CANDIDATE_IMPLEMENTATION_PENDING', 'CANDIDATE_VALIDATION_RUNNING', 'COMPLETE'].includes(a05Evidence.status) &&
  exists(files.serverSurface) &&
  results.includes('serverResultsSurface.render({') &&
  resultsHtml.includes('assets/js/repositories/search-repository.js')
);

if (resultsActivated) {
  [
    'const serverResultsSurface = window.Doke?.searchResultsServerSurface',
    'serverResultsSurface.render({',
    'serverResultsSurface?.loadMore?.()',
    "resultsPagination: queryAny('[data-results-pagination]')",
    "resultsLoadMore: queryAny('[data-results-load-more]')"
  ].forEach((marker) => assert(results.includes(marker), `post-SEARCH-A05 activation marker missing: ${marker}`));
  [
    'const getServiceMatches = searchData.getServiceMatches || (() => [])',
    'const exactServiceResults = getServiceMatches(query, {',
    'const displayServices = [...exactServiceResults, ...relatedServices].slice(0, 6)'
  ].forEach((marker) => assert(!results.includes(marker), `retired A04 rollout-boundary marker remains: ${marker}`));

  const repositoryIndex = resultsHtml.indexOf('assets/js/repositories/search-repository.js');
  const serviceIndex = resultsHtml.indexOf('assets/js/services/search-service.js');
  const surfaceIndex = resultsHtml.indexOf('assets/js/pages/search/server-results-surface.js');
  const resultsIndex = resultsHtml.indexOf('assets/js/pages/search-results.js');
  assert(repositoryIndex !== -1 && serviceIndex > repositoryIndex && surfaceIndex > serviceIndex && resultsIndex > surfaceIndex, 'post-SEARCH-A05 module order is invalid');
  assert((resultsHtml.match(/assets\/js\/services\/search-service\.js/g) || []).length === 1, 'search service must load exactly once after activation');
  assert(resultsHtml.includes('data-results-load-more'), 'post-SEARCH-A05 cursor control is missing');

  const surface = read(files.serverSurface);
  assert(surface.includes('searchApi().queryPage(request)'), 'post-SEARCH-A05 surface does not call queryPage');
  assert(surface.includes('fallbackUsed: false'), 'post-SEARCH-A05 surface does not fail closed');
} else {
  [
    'const getServiceMatches = searchData.getServiceMatches || (() => [])',
    'const exactServiceResults = getServiceMatches(query, {',
    'const displayServices = [...exactServiceResults, ...relatedServices].slice(0, 6)'
  ].forEach((marker) => assert(results.includes(marker), `SEARCH-A04 rollout boundary marker missing: ${marker}`));
  assert(!resultsHtml.includes('assets/js/repositories/search-repository.js'), 'SEARCH-A04 must not partially activate the new repository before A05');
  assert(resultsHtml.includes('assets/js/services/search-service.js'), 'results page must retain the search service');
}

const runtime = read(files.runtime);
[
  'fixtureRuntime',
  'remoteRuntime',
  'remoteFailureRuntime',
  'sourceContract',
  'DOKE_SEARCH_PAGE_SIZE_INVALID',
  'DOKE_SEARCH_REQUEST_UNKNOWN_FIELD',
  'DOKE_SEARCH_CURSOR_INVALID',
  'DOKE_SEARCH_AUTHORITY_UNAVAILABLE',
  'assert.strictEqual(runtime.rpcCalls.length, 1'
].forEach((marker) => assert(runtime.includes(marker), `runtime coverage marker missing: ${marker}`));

const matrix = JSON.parse(read(files.matrix));
const searchDomain = (matrix.domains || []).find((domain) => domain.id === 'SEARCH-001');
assert(Boolean(searchDomain), 'SEARCH-001 is missing from the domain matrix');
const searchB02Reconciled = Boolean(a05Evidence && a05Evidence.status === 'COMPLETE' && a05Evidence.matrix && a05Evidence.matrix.searchB02 === 'reconciled_removed');
assert(searchDomain && searchDomain.maturity === (searchB02Reconciled ? 3 : 2), 'SEARCH maturity changed outside controlled A05 reconciliation');
assert(searchDomain && searchDomain.userFacingAuthority === 'hybrid', 'SEARCH user-facing authority must remain hybrid');
assert(searchDomain && searchDomain.serverAuthority === (searchB02Reconciled ? 'partial' : 'contract_only'), 'SEARCH server authority changed outside controlled A05 reconciliation');
assert(searchDomain && searchDomain.stagingEvidence === (searchB02Reconciled ? 'staging_canary' : 'local_e2e'), 'SEARCH staging evidence changed outside controlled A05 reconciliation');
assert(searchDomain && searchDomain.securityGate === 'blocked', 'SEARCH security gate must remain blocked');
assert(searchDomain && searchDomain.productionGate === 'blocked', 'SEARCH production gate must remain blocked');
const blockers = (searchDomain && searchDomain.blockers || []).map((blocker) => blocker.id).sort();
assert(same(blockers, searchB02Reconciled ? ['SEARCH-B03'] : ['SEARCH-B02', 'SEARCH-B03']), 'SEARCH blocker set changed outside controlled A05 reconciliation');

const a03Evidence = JSON.parse(read(files.a03Evidence));
assert(a03Evidence.status === 'COMPLETE', 'SEARCH-A03 must remain complete');
assert(a03Evidence.matrix && a03Evidence.matrix.searchB01 === 'reconciled_removed', 'SEARCH-B01 reconciliation must remain preserved');

const evidence = JSON.parse(read(files.evidence));
const stagingValidated = evidence.status === 'COMPLETE';
assert(evidence.domain === 'SEARCH-001' && evidence.sublot === 'SEARCH-A04', 'SEARCH-A04 evidence identity is invalid');
assert(['CANDIDATE_IMPLEMENTED_CI_PENDING', 'COMPLETE'].includes(evidence.status), 'SEARCH-A04 evidence status is invalid');
assert(evidence.authority && evidence.authority.rpc === 'public.search_public_services_v1(jsonb)', 'SEARCH-A04 RPC authority is not documented');
assert(evidence.requestDto && evidence.requestDto.pageSizeMaximum === 24, 'SEARCH-A04 page bound is not documented');
assert(evidence.activation && evidence.activation.resultsRenderer === 'not_yet_activated', 'SEARCH-A04 historical rollout boundary is not documented');
assert(
  evidence.matrix && ['preserved_until_SEARCH_A05_activation', 'preserved_until_activation_and_staging_validation', 'reconciled_removed_by_SEARCH_A05'].includes(evidence.matrix.searchB02),
  'SEARCH-B02 preservation is not documented in A04'
);
assert(evidence.safety && evidence.safety.migrationApplied === stagingValidated, 'SEARCH-A04 migration application evidence is inconsistent');
assert(evidence.safety && evidence.safety.approvedSnapshotHardeningApplied === stagingValidated, 'SEARCH-A04 hardening evidence is inconsistent');
assert(evidence.safety && evidence.safety.stagingChanged === stagingValidated, 'SEARCH-A04 staging evidence is inconsistent');
assert(evidence.safety && evidence.safety.productionChanged === false, 'SEARCH-A04 cannot change production');
if (stagingValidated) {
  assert(evidence.stagingValidation && evidence.stagingValidation.status === 'success', 'SEARCH-A04 staging validation is not recorded');
  assert(evidence.stagingValidation.transactionalSqlTest022 === 'success', 'SEARCH-A04 SQL test 022 did not pass');
  assert(evidence.stagingValidation.transactionalSqlTest023 === 'success', 'SEARCH-A04 SQL test 023 did not pass');
  assert(evidence.stagingValidation.fixturesRolledBack === true, 'SEARCH-A04 staging fixtures were not rolled back');
  assert(evidence.stagingValidation.realServiceVectorMatchesApprovedSnapshot === true, 'SEARCH-A04 real service vector does not match the approved snapshot');
  assert(evidence.approvedSnapshotAuthority.pendingEditsSearchable === false, 'SEARCH-A04 pending edits must remain excluded');
  assert(evidence.safety.realServiceContentChanged === false, 'SEARCH-A04 cannot change real service content');
  assert(evidence.safety.persistentSyntheticEntitiesCreated === false, 'SEARCH-A04 cannot persist synthetic entities');
}

const workflow = read(files.workflow);
[
  'node scripts/audit-search-authority-baseline.js',
  'node scripts/audit-favorites-authority-retirement.js',
  'node scripts/test-favorites-authority-retirement-runtime.js',
  'node scripts/audit-service-favorites-surfaces.js',
  'node scripts/test-service-favorites-controller-runtime.js',
  'node scripts/audit-search-server-contract.js',
  'node scripts/audit-search-approved-snapshot-authority.js',
  'node scripts/test-search-server-contract-runtime.js'
].forEach((marker) => assert(workflow.includes(marker), `SEARCH-A04 workflow marker missing: ${marker}`));

if (errors.length) {
  console.error('[SEARCH-A04] Server search contract audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[SEARCH-A04] Bounded server-side search DTO is versioned and structurally governed.');
console.log('[SEARCH-A04] Approved publication, exact geography, allowlisted filters and cursor bounds are enforced.');
console.log(resultsActivated
  ? '[SEARCH-A04] The validated contract is consumed by the SEARCH-A05 candidate while matrix reconciliation remains blocked.'
  : stagingValidated
    ? '[SEARCH-A04] Migrations and transactional SQL validations passed in staging; UI activation remains deferred to SEARCH-A05.'
    : '[SEARCH-A04] Results renderer activation remains explicitly deferred pending controlled staging validation.');
console.log('[SEARCH-A04] Production was not changed.');
