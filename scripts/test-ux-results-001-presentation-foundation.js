#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const presentationPath = require.resolve('../assets/js/pages/search-results-presentation.js');

const previousWindow = global.window;
global.window = { Doke: {} };
global.window.window = global.window;
delete require.cache[presentationPath];
require(presentationPath);

const api = global.window.Doke.searchResultsPresentation;
assert(api, 'Doke.searchResultsPresentation must be published.');
assert.equal(api.version, '20260805-ux-results-001-v1');
assert.equal(api.contract, 'search-results-presentation-v1');
assert(Object.isFrozen(api));
assert(Object.isFrozen(api.states));
assert(Object.isFrozen(api.modes));
assert(Object.isFrozen(api.sectionKeys));

const ready = api.createViewModel({
  applied: true,
  generation: 4,
  searchFingerprint: 'services-4',
  mode: 'services',
  state: 'ready',
  operation: 'initial',
  query: 'pintor',
  count: 12,
  hasNext: true,
  authority: 'remote_catalog',
  coverage: 'catalog',
  sections: {
    users: { count: 3, intentFingerprint: 'services-4' },
    workers: { count: 2, intentFingerprint: 'old-intent' },
    publications: { count: 0, intentFingerprint: 'services-4' }
  }
});
assert(Object.isFrozen(ready));
assert(Object.isFrozen(ready.summary));
assert.equal(ready.committable, true);
assert.equal(ready.canonical, true);
assert.equal(ready.pagination.visible, true);
assert.equal(ready.contentPolicy, api.contentPolicies.REPLACE);
assert.equal(ready.sections.users.visible, true, 'Related sections must belong to the accepted intent.');
assert.equal(ready.sections.workers.visible, false, 'Stale related sections must remain hidden.');
assert.match(ready.summary.title, /pintor/);

const localUsers = api.createViewModel({
  applied: true,
  searchFingerprint: 'users-1',
  mode: 'users',
  state: 'ready',
  count: 4,
  authority: 'remote_catalog',
  coverage: 'catalog',
  sections: { users: { count: 4, intentFingerprint: 'users-1' } }
});
assert.equal(localUsers.authority, api.authorities.LOCAL_EDITORIAL);
assert.equal(localUsers.coverage, api.coverage.EDITORIAL_SAMPLE);
assert.equal(localUsers.canonical, false);
assert.equal(localUsers.sections.users.visible, false, 'Local result mode must not expose service-related sections.');

const fallback = api.createViewModel({
  applied: true,
  mode: 'services',
  state: 'fallback',
  query: 'serviço inexistente',
  count: 8,
  hasNext: false,
  authority: 'remote_catalog',
  coverage: 'catalog'
});
assert.equal(fallback.summary.tone, 'fallback');
assert.equal(fallback.summary.title, 'Outros anúncios');
assert.match(fallback.summary.description, /Nenhum anúncio correspondeu exatamente/);

const empty = api.createViewModel({ applied: true, mode: 'workers', state: 'empty', count: 0 });
const error = api.createViewModel({
  applied: true,
  mode: 'services',
  state: 'error',
  count: 0,
  retryAvailable: true,
  errorCode: 'DOKE_SEARCH_FAILED'
});
assert.equal(empty.summary.tone, 'empty');
assert.equal(error.summary.tone, 'error');
assert.equal(error.retryAvailable, true);
assert.notEqual(empty.summary.title, error.summary.title, 'Empty and error must remain distinct states.');

const paginating = api.createViewModel({
  applied: true,
  mode: 'services',
  state: 'paginating',
  operation: 'pagination',
  count: 12,
  previousCount: 12
});
assert.equal(paginating.preserveContent, true);
assert.equal(paginating.contentPolicy, api.contentPolicies.PRESERVE);
assert.equal(paginating.pagination.busy, true);

const appended = api.createViewModel({
  applied: true,
  mode: 'services',
  state: 'ready',
  operation: 'pagination',
  count: 20,
  previousCount: 12
});
assert.equal(appended.contentPolicy, api.contentPolicies.APPEND);

const stale = api.createViewModel({
  applied: false,
  mode: 'services',
  state: 'stale',
  operation: 'initial',
  count: 99
});
assert.equal(stale.committable, false);
assert.equal(stale.contentPolicy, api.contentPolicies.NONE);
assert.equal(stale.preserveContent, true);

const controller = api.createController({
  initial: {
    applied: true,
    generation: 1,
    searchFingerprint: 'initial',
    mode: 'services',
    state: 'ready',
    count: 5,
    authority: 'remote_catalog',
    coverage: 'catalog'
  }
});

const pendingA = controller.begin({
  generation: 2,
  searchFingerprint: 'intent-a',
  mode: 'services',
  operation: 'initial',
  query: 'A'
});
assert.equal(pendingA.state, api.states.LOADING);
assert.equal(pendingA.previousCount, 5);

const pendingB = controller.begin({
  generation: 3,
  searchFingerprint: 'intent-b',
  mode: 'services',
  operation: 'initial',
  query: 'B'
});
assert.equal(pendingB.searchFingerprint, 'intent-b');

const staleReceipt = controller.commit({
  applied: true,
  generation: 2,
  searchFingerprint: 'intent-a',
  state: 'ready',
  count: 10
});
assert.equal(staleReceipt.applied, false);
assert.equal(staleReceipt.reason, 'generation-mismatch');
assert.equal(controller.getSnapshot().searchFingerprint, 'intent-b');

const unappliedReceipt = controller.commit({
  applied: false,
  generation: 3,
  searchFingerprint: 'intent-b',
  state: 'ready',
  count: 11
});
assert.equal(unappliedReceipt.applied, false);
assert.equal(unappliedReceipt.reason, 'receipt-not-applied');

const accepted = controller.commit({
  applied: true,
  generation: 3,
  searchFingerprint: 'intent-b',
  state: 'ready',
  count: 11,
  hasNext: true,
  authority: 'remote_catalog',
  coverage: 'catalog'
});
assert.equal(accepted.applied, true);
assert.equal(accepted.snapshot.count, 11);
assert.equal(controller.getActiveIntent(), null);

controller.begin({
  generation: 4,
  searchFingerprint: 'intent-b',
  mode: 'services',
  operation: 'pagination'
});
assert.equal(controller.getSnapshot().state, api.states.PAGINATING);
assert.equal(controller.getSnapshot().count, 11, 'Pagination must preserve accepted content count.');
const pageAccepted = controller.commit({
  applied: true,
  generation: 4,
  searchFingerprint: 'intent-b',
  state: 'ready',
  count: 18,
  hasNext: false,
  authority: 'remote_catalog',
  coverage: 'catalog'
});
assert.equal(pageAccepted.snapshot.contentPolicy, api.contentPolicies.APPEND);
assert.equal(pageAccepted.snapshot.count, 18);

const diagnostic = api.diagnosticFor({
  applied: true,
  generation: 9,
  searchFingerprint: 'safe-fingerprint',
  mode: 'services',
  state: 'error',
  query: 'Rua privada 123',
  count: 0,
  errorCode: 'DOKE_SEARCH_FAILED'
});
assert.equal(Object.hasOwn(diagnostic, 'query'), false, 'Diagnostics must not expose raw query text.');
assert.equal(JSON.stringify(diagnostic).includes('Rua privada 123'), false);
assert.equal(diagnostic.errorCode, 'doke_search_failed');

assert.equal(global.window.Doke.searchResultsPresentation, api);
global.window = previousWindow;
console.log('UX-RESULTS-001 presentation foundation contracts passed.');
