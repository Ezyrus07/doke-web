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
  repository: 'assets/js/repositories/favorites-repository.js',
  service: 'assets/js/services/favorites-service.js',
  experience: 'assets/js/pages/detail-ad-experience.js',
  controller: 'assets/js/pages/detalhe-anuncio-data-controller.js',
  detailHtml: 'detalhe-anuncio.html',
  migration: 'supabase/migrations/112_catalog_favorites_authority.sql',
  runtime: 'scripts/test-favorites-authority-retirement-runtime.js',
  evidenceJson: 'docs/validation/SEARCH-001-A02-FAVORITES-AUTHORITY-RETIREMENT.json',
  evidenceMarkdown: 'docs/validation/SEARCH-001-A02-FAVORITES-AUTHORITY-RETIREMENT.md',
  a03EvidenceJson: 'docs/validation/SEARCH-001-A03-FAVORITES-SURFACES.json',
  workflow: '.github/workflows/search-favorites-authority.yml'
};

[
  files.matrix,
  files.repository,
  files.service,
  files.experience,
  files.controller,
  files.detailHtml,
  files.migration,
  files.runtime,
  files.evidenceJson,
  files.evidenceMarkdown,
  files.workflow
].forEach((file) => assert(exists(file), `required file missing: ${file}`));
if (errors.length) {
  console.error('[SEARCH-A02] Required files are missing:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const a03Evidence = exists(files.a03EvidenceJson) ? JSON.parse(read(files.a03EvidenceJson)) : null;
const searchB01Reconciled = Boolean(
  a03Evidence &&
  a03Evidence.status === 'COMPLETE' &&
  a03Evidence.matrix &&
  a03Evidence.matrix.searchB01 === 'reconciled_removed'
);

const matrix = JSON.parse(read(files.matrix));
const search = (matrix.domains || []).find((domain) => domain.id === 'SEARCH-001');
assert(Boolean(search), 'SEARCH-001 is missing from the domain completion matrix');
assert(search && search.maturity === 2, 'SEARCH-001 maturity cannot advance before full domain reconciliation');
assert(search && search.userFacingAuthority === 'hybrid', 'SEARCH-001 user-facing authority must remain hybrid during A02');
assert(search && search.serverAuthority === 'contract_only', 'SEARCH-001 server authority must remain contract_only during A02');
assert(search && search.securityGate === 'blocked', 'SEARCH-001 security gate must remain blocked');
assert(search && search.productionGate === 'blocked', 'SEARCH-001 production gate must remain blocked');
const blockers = (search && search.blockers || []).map((blocker) => blocker.id).sort();
assert(
  same(blockers, searchB01Reconciled ? ['SEARCH-B02', 'SEARCH-B03'] : ['SEARCH-B01', 'SEARCH-B02', 'SEARCH-B03']),
  'SEARCH blockers changed outside controlled matrix reconciliation'
);

const repository = read(files.repository);
[
  "AUTHORITY = 'supabase-or-fixture-memory'",
  "REMOTE_TABLE = 'favorites'",
  'fixtureFavoritesByUser = new Map()',
  'function resolveMode(user, serviceId)',
  "return client\n      .from(REMOTE_TABLE)\n      .select('service_id')",
  '.insert({ user_id: identity.userId, service_id: identity.serviceId })',
  '.delete()',
  "error.code = 'DOKE_FAVORITES_AUTH_REQUIRED'",
  "error.code = 'DOKE_FAVORITES_AUTHORITY_UNAVAILABLE'",
  'list: list',
  'isFavorite: isFavorite',
  'add: add',
  'remove: remove',
  'toggle: toggle'
].forEach((marker) => assert(repository.includes(marker), `favorites repository marker missing: ${marker}`));
['localStorage', 'sessionStorage', 'doke.service-favorites.v1'].forEach((marker) => {
  assert(!repository.includes(marker), `retired browser authority remains in favorites repository: ${marker}`);
});

const service = read(files.service);
[
  'Doke.repositories && Doke.repositories.favorites',
  'services.favorites = Object.freeze({',
  'list: list',
  'isFavorite: isFavorite',
  'add: add',
  'remove: remove',
  'toggle: toggle'
].forEach((marker) => assert(service.includes(marker), `favorites service marker missing: ${marker}`));
['localStorage', 'sessionStorage', 'doke.service-favorites.v1'].forEach((marker) => {
  assert(!service.includes(marker), `retired browser authority remains in favorites service: ${marker}`);
});

const experience = read(files.experience);
[
  'Doke.services && Doke.services.favorites',
  'favoritesService().isFavorite(normalizedServiceId)',
  'favoritesService().toggle(serviceId)',
  'DOKE_FAVORITES_AUTH_REQUIRED',
  "auth/login.html?next=",
  'doke:service-favorite-changed',
  'doke:service-favorite-error'
].forEach((marker) => assert(experience.includes(marker), `detail favorite experience marker missing: ${marker}`));
['localStorage', 'sessionStorage', 'FAVORITES_KEY_PREFIX', 'doke.service-favorites.v1'].forEach((marker) => {
  assert(!experience.includes(marker), `retired browser favorite authority remains executable: ${marker}`);
});
assert(!experience.includes(".from('favorites')"), 'page experience must not bypass the favorites service');
assert(!experience.includes('.from("favorites")'), 'page experience must not bypass the favorites service');

const controller = read(files.controller);
const repositoryIndex = controller.indexOf("key: 'favorites-repository'");
const serviceIndex = controller.indexOf("key: 'favorites-service'");
const surfaceControllerIndex = controller.indexOf("key: 'service-favorites-controller'");
const experienceIndex = controller.indexOf("key: 'detail-ad-experience'");
assert(repositoryIndex !== -1, 'detail controller must load favorites repository');
assert(serviceIndex > repositoryIndex, 'favorites service must load after repository');
assert(!searchB01Reconciled || surfaceControllerIndex > serviceIndex, 'shared favorites controller must load after service');
assert(experienceIndex > (searchB01Reconciled ? surfaceControllerIndex : serviceIndex), 'detail experience load order is invalid');
[
  'function ensureScript(module)',
  'function ensureFavoritesAuthority()',
  'return chain.then(function () { return ensureScript(module); })',
  'ensureFavoritesAuthority()\n      .catch(function (error)',
  'return load(root);',
  'ensureFavoritesAuthority: ensureFavoritesAuthority'
].forEach((marker) => assert(controller.includes(marker), `detail loader marker missing: ${marker}`));
assert(controller.indexOf('ensureFavoritesAuthority()\n      .catch') < controller.indexOf('return load(root);'), 'favorites authority must be attempted before detail data load');

const detailHtml = read(files.detailHtml);
assert(detailHtml.includes('detalhe-anuncio-data-controller.js'), 'detail page must retain its data controller');
assert(detailHtml.includes('supabase-config.js'), 'detail page must load the Supabase singleton configuration');
assert(detailHtml.includes('session.js'), 'detail page must retain canonical session loading');
assert(detailHtml.includes('auth-session-authority.js'), 'detail page must retain canonical auth session authority');

const migration = read(files.migration);
[
  'alter table public.favorites enable row level security',
  'create policy favorites_owner_select',
  'create policy favorites_owner_insert',
  'create policy favorites_owner_delete',
  'user_id = (select auth.uid())',
  'grant select, insert, delete on table public.favorites to authenticated'
].forEach((marker) => assert(migration.includes(marker), `favorites RLS marker missing: ${marker}`));

const runtime = read(files.runtime);
[
  'fixtureMemoryRuntime',
  'remoteRuntime',
  'anonymousRuntime',
  'failClosedRuntime',
  'sourceContract',
  'DOKE_FAVORITES_AUTH_REQUIRED',
  'DOKE_FAVORITES_AUTHORITY_UNAVAILABLE'
].forEach((marker) => assert(runtime.includes(marker), `favorites runtime coverage marker missing: ${marker}`));

const evidence = JSON.parse(read(files.evidenceJson));
assert(evidence.domain === 'SEARCH-001' && evidence.sublot === 'SEARCH-A02', 'SEARCH-A02 evidence identity is invalid');
assert(['CANDIDATE_VALIDATED_CI_PENDING', 'COMPLETE'].includes(evidence.status), 'SEARCH-A02 evidence status is invalid');
assert(evidence.authority && evidence.authority.real === 'public.favorites', 'remote favorites authority is not documented');
assert(evidence.authority && evidence.authority.fixture === 'runtime_memory_only', 'fixture-memory authority is not documented');
assert(evidence.authority && evidence.authority.browserPersistentAuthority === 'retired', 'browser persistent authority retirement is not documented');
assert(evidence.authority && evidence.authority.remoteFailureMode === 'fail_closed', 'remote fail-closed mode is not documented');
assert(evidence.staging && evidence.staging.rlsEnabled === true, 'staging RLS evidence must remain explicit');
assert(evidence.staging && evidence.staging.policyCount === 3, 'staging policy count must remain explicit');
assert(evidence.safety && evidence.safety.stagingChanged === false, 'SEARCH-A02 cannot claim a staging write');
assert(evidence.safety && evidence.safety.productionChanged === false, 'SEARCH-A02 cannot change production');
assert(evidence.safety && evidence.safety.realFavoritesChanged === false, 'SEARCH-A02 cannot change real favorites');

const evidenceMarkdown = read(files.evidenceMarkdown);
[
  'SEARCH-A02',
  'AUTORIDADE LOCAL RETIRADA',
  'public.favorites',
  'DOKE_FAVORITES_AUTH_REQUIRED',
  'DOKE_FAVORITES_AUTHORITY_UNAVAILABLE',
  'runtime-memory-only',
  'produção não alterada'
].forEach((marker) => assert(evidenceMarkdown.includes(marker), `human evidence marker missing: ${marker}`));

const workflow = read(files.workflow);
[
  "- 'cat/**'",
  "- 'search/**'",
  'node scripts/audit-search-authority-baseline.js',
  'node scripts/audit-favorites-authority-retirement.js',
  'node scripts/test-favorites-authority-retirement-runtime.js'
].forEach((marker) => assert(workflow.includes(marker), `SEARCH-A02 workflow marker missing: ${marker}`));

if (errors.length) {
  console.error('[SEARCH-A02] Favorites authority retirement audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[SEARCH-A02] Browser-persistent favorites authority is retired.');
console.log('[SEARCH-A02] Supabase/UUID flows use public.favorites and fail closed.');
console.log('[SEARCH-A02] Non-UUID fixtures remain current-runtime memory only.');
console.log(searchB01Reconciled
  ? '[SEARCH-A02] SEARCH-B01 reconciliation preserves A02 as the canonical persistence foundation.'
  : '[SEARCH-A02] SEARCH-B01 remains open until every governed favorite surface is canonical.');
console.log('[SEARCH-A02] Production, staging data and real favorites were not changed.');
