#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const searchDataPath = require.resolve('../assets/js/pages/search-data.js');
const searchDataSource = fs.readFileSync(searchDataPath, 'utf8');
const resultsSource = fs.readFileSync('assets/js/pages/search-results.js', 'utf8');
const resultsHtml = fs.readFileSync('resultados.html', 'utf8');

const previousWindow = global.window;
global.window = {
  Doke: {},
  localStorage: {
    getItem() { return null; },
    setItem() {}
  }
};
global.window.window = global.window;

delete require.cache[searchDataPath];
require(searchDataPath);

const api = global.window.Doke.searchFilterState;
assert(api, 'Doke.searchFilterState must be published.');
assert.equal(api.version, '20260805-ux-filters-001-v1');
assert.equal(api.contract, 'search-filter-state-v1');
assert(Object.isFrozen(api), 'Filter authority must be frozen.');
assert(Object.isFrozen(api.filterKeys), 'Filter key registry must be frozen.');

const normalized = api.normalize({
  searchType: 'invalid',
  categories: ['Limpeza', ' limpeza ', 'Pintura', ''],
  state: ' MG ',
  minRating: '4.8',
  guaranteed: 1
});
assert.equal(normalized.searchType, 'services');
assert.deepEqual(Array.from(normalized.categories), ['Limpeza', 'Pintura']);
assert.equal(normalized.state, 'MG');
assert(Math.abs(normalized.minRating - 4.8) < Number.EPSILON);
assert.equal(normalized.guaranteed, true);
assert(Object.isFrozen(normalized));
assert(Object.isFrozen(normalized.categories));

const initial = api.normalize({
  searchType: 'services',
  categories: ['Limpeza'],
  state: 'MG',
  city: 'Belo Horizonte',
  guaranteed: true
});
const controller = api.createController({ applied: initial });
let state = controller.getSnapshot();
assert.equal(state.dirty, false);
assert.equal(state.activeAppliedCount, 4);

controller.update({ city: 'Contagem', emergency: true });
state = controller.getSnapshot();
assert.equal(state.dirty, true);
assert.equal(state.applied.city, 'Belo Horizonte', 'Draft edits must not mutate applied filters.');
assert.equal(state.draft.city, 'Contagem');
assert.equal(state.draft.emergency, true);

const beforeCommitUrl = api.serializeUrl(state.applied, '?q=diarista&cursor=opaque');
assert(beforeCommitUrl.includes('city=Belo+Horizonte'));
assert(!beforeCommitUrl.includes('city=Contagem'), 'Draft values must not leak into the applied URL.');

controller.cancel();
state = controller.getSnapshot();
assert.equal(state.dirty, false);
assert.equal(state.draft.city, 'Belo Horizonte');
assert.equal(state.draft.emergency, false);

controller.update({ categories: [], state: '', city: '', guaranteed: false, online: true });
const receipt = controller.commit();
assert.equal(receipt.changed, true);
const alphabetical = (left, right) => left.localeCompare(right, 'en');
assert.deepEqual(
  Array.from(receipt.changedKeys).sort(alphabetical),
  ['categories', 'city', 'guaranteed', 'online', 'state'].sort(alphabetical)
);
assert.equal(receipt.applied.online, true);
assert.equal(controller.getSnapshot().dirty, false);

controller.update({ emergency: true });
controller.clearDraft();
state = controller.getSnapshot();
assert.equal(state.draft.searchType, 'services');
assert.equal(state.activeDraftCount, 0);
assert.equal(state.dirty, true, 'Clearing a non-empty applied snapshot must remain a draft until commit.');
controller.cancel();

const parsed = api.parseUrl(
  '?q=encanador&type=users&categories=Limpeza&cat%C3%A9gory=Pintura&stat%C3%A9=MG&city=Contagem&guaranteed=1'
);
assert.equal(parsed.searchType, 'users');
assert.deepEqual(Array.from(parsed.categories), ['Limpeza', 'Pintura']);
assert.equal(parsed.state, 'MG');
assert.equal(parsed.city, 'Contagem');
assert.equal(parsed.guaranteed, true);

const serialized = api.serializeUrl(parsed, '?q=encanador&cursor=opaque&pageSize=12&categories=old&stat%C3%A9=SP');
const serializedParams = new URLSearchParams(serialized);
assert.equal(serializedParams.get('q'), 'encanador');
assert.equal(serializedParams.get('type'), 'users');
assert.deepEqual(serializedParams.getAll('category'), ['Limpeza', 'Pintura']);
assert.equal(serializedParams.get('state'), 'MG');
assert.equal(serializedParams.get('categories'), null);
assert.equal(serializedParams.get('catégory'), null);
assert.equal(serializedParams.get('staté'), null);
assert.equal(serializedParams.get('cursor'), 'opaque', 'Filter serialization must not own search pagination cleanup.');
assert.equal(serializedParams.get('pageSize'), '12');

assert.equal(api.activeCount(parsed), 5);
assert.equal(api.equals(parsed, api.normalize(parsed)), true);
assert.deepEqual(Array.from(api.changedKeys(parsed, { ...parsed, online: true })), ['online']);

assert(
  searchDataSource.includes("root.document.addEventListener('change', onChange, { capture: true") &&
  searchDataSource.includes("root.document.addEventListener('submit', onSubmit, { capture: true"),
  'Applied/draft authority must intercept legacy auto-apply before target handlers.'
);
assert(
  searchDataSource.includes('__dokeFiltersCommit') &&
  searchDataSource.includes('dispatchSingleSearchCommit(form)'),
  'Exactly one marked synthetic change must bridge an explicit commit to the legacy renderer.'
);
assert(
  searchDataSource.includes('controller.cancel()') &&
  searchDataSource.includes('Alterações descartadas'),
  'Closing/cancelling must restore the applied snapshot.'
);
assert(
  searchDataSource.includes('Filtros limpos no rascunho') &&
  searchDataSource.includes("source: 'empty-reset'"),
  'Draft clear and explicit applied reset must remain distinct operations.'
);
assert(
  searchDataSource.includes('resolveCep(input)') &&
  !searchDataSource.includes("createElement('script')") &&
  !searchDataSource.includes('new Function') &&
  !searchDataSource.includes('eval('),
  'CEP must remain a local draft mutation and the authority must not introduce dynamic execution.'
);
assert(
  searchDataSource.includes('function scheduleArm()') &&
  searchDataSource.includes('root.setTimeout(arm, 0)') &&
  searchDataSource.includes("root.document.addEventListener('DOMContentLoaded', scheduleArm"),
  'The authority must arm after the route bootstrap task has populated canonical URL filters.'
);
assert(
  searchDataSource.includes('Doke.searchFilterStateInstallation.cleanup()') &&
  searchDataSource.includes('Doke.searchFilterStateInstallation = install()') &&
  !searchDataSource.includes('var installation = null;'),
  'Route re-execution must clean the globally published installation before replacing it.'
);

const searchDataIndex = resultsHtml.indexOf('assets/js/pages/search-data.js');
const resultsRuntimeIndex = resultsHtml.indexOf('assets/js/pages/search-results.js');
assert(searchDataIndex >= 0 && resultsRuntimeIndex >= 0 && searchDataIndex < resultsRuntimeIndex,
  'Filter capture authority must load before search-results.js installs legacy handlers.');

assert(
  resultsSource.includes("els.filtersForm.addEventListener('change'") &&
  resultsSource.includes('loadResults();'),
  'The regression gate must keep detecting the legacy auto-apply boundary that the authority intercepts.'
);

global.window = previousWindow;
console.log('UX-FILTERS-001 applied/draft filter contracts passed.');
