#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const searchDataSource = fs.readFileSync('assets/js/pages/search-data.js', 'utf8');
const resultsSource = fs.readFileSync('assets/js/pages/search-results.js', 'utf8');
const resultsHtml = fs.readFileSync('resultados.html', 'utf8');

new vm.Script(searchDataSource, { filename: 'search-data.js' });

const sandbox = {
  window: {
    Doke: {},
    localStorage: {
      getItem() { return null; },
      setItem() {}
    }
  },
  URLSearchParams,
  URL,
  AbortController,
  Event,
  CustomEvent: class CustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init && init.detail;
    }
  },
  Object,
  Array,
  Boolean,
  Number,
  String,
  JSON,
  Math,
  Set,
  console
};
sandbox.window.window = sandbox.window;

vm.runInNewContext(searchDataSource, sandbox, { filename: 'search-data.js' });

const api = sandbox.window.Doke.searchFilterState;
assert(api, 'Doke.searchFilterState must be published.');
assert.strictEqual(api.version, '20260805-ux-filters-001-v1');
assert.strictEqual(api.contract, 'search-filter-state-v1');
assert(Object.isFrozen(api), 'Filter authority must be frozen.');
assert(Object.isFrozen(api.filterKeys), 'Filter key registry must be frozen.');

const normalized = api.normalize({
  searchType: 'invalid',
  categories: ['Limpeza', ' limpeza ', 'Pintura', ''],
  state: ' MG ',
  minRating: '4.8',
  guaranteed: 1
});
assert.strictEqual(normalized.searchType, 'services');
assert.deepStrictEqual(Array.from(normalized.categories), ['Limpeza', 'Pintura']);
assert.strictEqual(normalized.state, 'MG');
assert.strictEqual(normalized.minRating, 4.8);
assert.strictEqual(normalized.guaranteed, true);
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
assert.strictEqual(state.dirty, false);
assert.strictEqual(state.activeAppliedCount, 4);

controller.update({ city: 'Contagem', emergency: true });
state = controller.getSnapshot();
assert.strictEqual(state.dirty, true);
assert.strictEqual(state.applied.city, 'Belo Horizonte', 'Draft edits must not mutate applied filters.');
assert.strictEqual(state.draft.city, 'Contagem');
assert.strictEqual(state.draft.emergency, true);

const beforeCommitUrl = api.serializeUrl(state.applied, '?q=diarista&cursor=opaque');
assert(beforeCommitUrl.includes('city=Belo+Horizonte'));
assert(!beforeCommitUrl.includes('city=Contagem'), 'Draft values must not leak into the applied URL.');

controller.cancel();
state = controller.getSnapshot();
assert.strictEqual(state.dirty, false);
assert.strictEqual(state.draft.city, 'Belo Horizonte');
assert.strictEqual(state.draft.emergency, false);

controller.update({ categories: [], state: '', city: '', guaranteed: false, online: true });
const receipt = controller.commit();
assert.strictEqual(receipt.changed, true);
assert.deepStrictEqual(
  Array.from(receipt.changedKeys).sort(),
  ['categories', 'city', 'guaranteed', 'online', 'state'].sort()
);
assert.strictEqual(receipt.applied.online, true);
assert.strictEqual(controller.getSnapshot().dirty, false);

controller.update({ emergency: true });
controller.clearDraft();
state = controller.getSnapshot();
assert.strictEqual(state.draft.searchType, 'services');
assert.strictEqual(state.activeDraftCount, 0);
assert.strictEqual(state.dirty, true, 'Clearing a non-empty applied snapshot must remain a draft until commit.');
controller.cancel();

const parsed = api.parseUrl(
  '?q=encanador&type=users&categories=Limpeza&cat%C3%A9gory=Pintura&stat%C3%A9=MG&city=Contagem&guaranteed=1'
);
assert.strictEqual(parsed.searchType, 'users');
assert.deepStrictEqual(Array.from(parsed.categories), ['Limpeza', 'Pintura']);
assert.strictEqual(parsed.state, 'MG');
assert.strictEqual(parsed.city, 'Contagem');
assert.strictEqual(parsed.guaranteed, true);

const serialized = api.serializeUrl(parsed, '?q=encanador&cursor=opaque&pageSize=12&categories=old&stat%C3%A9=SP');
const serializedParams = new URLSearchParams(serialized);
assert.strictEqual(serializedParams.get('q'), 'encanador');
assert.strictEqual(serializedParams.get('type'), 'users');
assert.deepStrictEqual(serializedParams.getAll('category'), ['Limpeza', 'Pintura']);
assert.strictEqual(serializedParams.get('state'), 'MG');
assert.strictEqual(serializedParams.get('categories'), null);
assert.strictEqual(serializedParams.get('catégory'), null);
assert.strictEqual(serializedParams.get('staté'), null);
assert.strictEqual(serializedParams.get('cursor'), 'opaque', 'Filter serialization must not own search pagination cleanup.');
assert.strictEqual(serializedParams.get('pageSize'), '12');

assert.strictEqual(api.activeCount(parsed), 5);
assert.strictEqual(api.equals(parsed, api.normalize(parsed)), true);
assert.deepStrictEqual(Array.from(api.changedKeys(parsed, Object.assign({}, parsed, { online: true }))), ['online']);

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

console.log('UX-FILTERS-001 applied/draft filter contracts passed.');
