#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const foundationPath = require.resolve('../assets/js/pages/search-results-presentation.js');
const adapterPath = require.resolve('../assets/js/pages/search-results-dom-adapter.js');

function node() {
  return {
    dataset: {},
    hidden: false,
    disabled: false,
    textContent: '',
    attrs: {},
    setAttribute(name, value) { this.attrs[name] = String(value); },
    removeAttribute(name) { delete this.attrs[name]; }
  };
}

const previousWindow = global.window;
const previousCustomEvent = global.CustomEvent;
global.CustomEvent = function CustomEvent(name, init) {
  this.type = name;
  this.detail = init && init.detail;
};
global.window = { Doke: {}, document: { dispatchEvent() {} } };
global.window.window = global.window;
delete require.cache[foundationPath];
delete require.cache[adapterPath];
require(foundationPath);
require(adapterPath);

const api = global.window.Doke.searchResultsDomAdapter;
assert(api, 'Doke.searchResultsDomAdapter must be published.');
assert.equal(api.version, '20260805-ux-results-001-dom-v1');
assert.equal(api.contract, 'search-results-dom-adapter-v1');
assert(Object.isFrozen(api));

const nodes = {
  boundary: node(),
  layout: node(),
  summary: node(),
  title: node(),
  description: node(),
  count: node(),
  loading: node(),
  grid: node(),
  inlineEmpty: node(),
  pagination: node(),
  loadMore: node(),
  stateLoading: node(),
  stateEmpty: node(),
  stateError: node(),
  stateHosts: [node(), node()],
  sections: {
    users: { section: node(), grid: node() },
    workers: { section: node(), grid: node() },
    publications: { section: node(), grid: node() }
  }
};

const installation = api.install({ nodes });
assert(installation, 'DOM adapter installation must be created.');

const local = installation.commitLocal({
  mode: 'users',
  query: 'ana',
  count: 3,
  filters: {}
});
assert.equal(local.applied, true);
assert.equal(nodes.title.textContent, 'Usuários para “ana”');
assert.equal(nodes.count.textContent, '3');
assert.equal(nodes.grid.hidden, false);
assert.equal(nodes.inlineEmpty.hidden, true);
assert.equal(nodes.layout.dataset.searchAuthority, 'local_editorial');
assert.equal(nodes.layout.dataset.searchCoverage, 'editorial_sample');

const ticket = installation.begin({
  mode: 'services',
  operation: 'initial',
  query: 'pintor',
  authority: 'remote_catalog',
  coverage: 'catalog'
});
assert.equal(nodes.layout.dataset.resultsState, 'loading');
assert.equal(nodes.loading.hidden, true, 'Existing accepted content must remain visible during a new search.');
assert.equal(nodes.grid.hidden, false);

const accepted = installation.commit(ticket, {
  applied: true,
  state: 'ready',
  mode: 'services',
  query: 'pintor',
  count: 12,
  hasNext: true,
  authority: 'remote_catalog',
  coverage: 'catalog'
});
assert.equal(accepted.applied, true);
assert.equal(nodes.title.textContent, 'Resultados para “pintor”');
assert.equal(nodes.pagination.hidden, false);
assert.equal(nodes.loadMore.hidden, false);
assert.equal(nodes.layout.dataset.searchCanonical, 'true');

const pageTicket = installation.begin({
  mode: 'services',
  operation: 'pagination',
  query: 'pintor',
  authority: 'remote_catalog',
  coverage: 'catalog'
});
assert.equal(nodes.loadMore.disabled, true);
assert.equal(nodes.loadMore.textContent, 'Carregando mais...');
installation.cancel(pageTicket, 'pagination-failed');
assert.equal(nodes.count.textContent, '12');
assert.equal(nodes.loadMore.disabled, false);

const replacementPageTicket = installation.begin({
  mode: 'services',
  operation: 'pagination',
  query: 'pintor',
  authority: 'remote_catalog',
  coverage: 'catalog'
});
const stale = installation.commit(ticket, {
  applied: true,
  state: 'ready',
  count: 99
});
assert.equal(stale.applied, false);
assert.equal(nodes.count.textContent, '12', 'Stale visual receipt must not replace the accepted count.');

installation.commit(replacementPageTicket, {
  applied: true,
  state: 'ready',
  mode: 'services',
  operation: 'pagination',
  query: 'pintor',
  count: 18,
  hasNext: false,
  authority: 'remote_catalog',
  coverage: 'catalog'
});
assert.equal(nodes.count.textContent, '18');
assert.equal(nodes.pagination.hidden, true);

const errorTicket = installation.begin({
  mode: 'services',
  operation: 'retry',
  query: 'pintor'
});
installation.fail(errorTicket, {
  mode: 'services',
  query: 'pintor',
  retryAvailable: true,
  errorCode: 'DOKE_SEARCH_FAILED'
});
assert.equal(nodes.stateError.hidden, false);
assert.equal(nodes.title.textContent, 'Busca indisponível');

installation.cleanup();
global.window = previousWindow;
global.CustomEvent = previousCustomEvent;
console.log('UX-RESULTS-001 DOM adapter contracts passed.');
