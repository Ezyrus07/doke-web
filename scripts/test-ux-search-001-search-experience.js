'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const BUNDLE = 'assets/js/pages/search/server-results-surface.js';
const WORKFLOW = '.github/workflows/ux-search-001-search-experience.yml';
const DOCUMENTATION = 'docs/ux/UX-SEARCH-001.md';

const observedEvents = [];
const locationState = {
  pathname: '/resultados.html',
  search: '?busca=antiga&cursor=secret&type=users',
  hash: '#resultados'
};
const historyState = {
  last: '',
  replaceState(_state, _title, url) { this.last = String(url); }
};

class TestCustomEvent {
  constructor(type, init) {
    this.type = type;
    this.detail = init?.detail;
  }
}

global.window = global;
global.location = locationState;
global.history = historyState;
global.CustomEvent = TestCustomEvent;
global.document = {
  readyState: 'complete',
  querySelector() { return null; },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent(event) {
    observedEvents.push(event?.detail);
    return true;
  }
};
global.Doke = { services: {} };

const bundlePath = path.join(root, BUNDLE);
delete require.cache[require.resolve(bundlePath)];
require(bundlePath);
const api = global.Doke.searchExperience;

function resetObservations() {
  observedEvents.splice(0);
  historyState.last = '';
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function testEnumsAndAuthorityDisclosure() {
  assert(api, 'search authority must be published');
  assert(Object.isFrozen(api), 'API must be frozen');
  assert(Object.isFrozen(api.states), 'states must be frozen');
  assert(Object.isFrozen(api.modes), 'modes must be frozen');
  assert(Object.isFrozen(api.authorities), 'authorities must be frozen');

  const remote = api.describeMode('services', { transport: 'edge-v2' });
  assert.strictEqual(remote.authority, api.authorities.REMOTE_CATALOG);
  assert.strictEqual(remote.canonical, true);
  assert(remote.label.includes('catálogo oficial'));

  const fixture = api.describeMode('services', { transport: 'fixture-memory' });
  assert.strictEqual(fixture.authority, api.authorities.FIXTURE_CATALOG);
  assert.strictEqual(fixture.canonical, false);

  ['users', 'workers', 'before-after'].forEach((mode) => {
    const descriptor = api.describeMode(mode, {});
    assert.strictEqual(descriptor.authority, api.authorities.LOCAL_EDITORIAL);
    assert.strictEqual(descriptor.coverage, api.coverage.EDITORIAL_SAMPLE);
    assert.strictEqual(descriptor.canonical, false);
    assert(/Amostra/.test(descriptor.label));
  });
}

async function testLatestWins() {
  resetObservations();
  const controller = api.createController({ id: 'latest-wins-static-bundle', reuse: false });
  const requestA = deferred();
  const requestB = deferred();
  let signalA;

  const promiseA = controller.run(
    { mode: 'services', query: 'pintor', contract: { transport: 'edge-v2' } },
    ({ signal }) => {
      signalA = signal;
      return requestA.promise;
    }
  );
  const promiseB = controller.run(
    { mode: 'services', query: 'eletricista', contract: { transport: 'edge-v2' } },
    () => requestB.promise
  );

  assert.strictEqual(signalA.aborted, true, 'new initial search must abort the previous signal');
  requestA.resolve({ response: { items: [{ id: 'old' }] } });
  const receiptA = await promiseA;
  assert.strictEqual(receiptA.applied, false);
  assert.strictEqual(receiptA.status, api.outcomes.STALE);
  assert.strictEqual(
    controller.getState(),
    api.states.LOADING,
    'stale completion must not replace the current loading state'
  );

  requestB.resolve({ response: { items: [{ id: 'new' }] } });
  const receiptB = await promiseB;
  assert.strictEqual(receiptB.applied, true);
  assert.strictEqual(receiptB.state, api.states.READY);
  assert.strictEqual(controller.getState(), api.states.READY);
  assert(observedEvents.some((event) => event?.type === 'stale-result'));
  assert(!JSON.stringify(observedEvents).includes('eletricista'), 'events must not expose raw queries');
}

async function testPaginationAndContextFence() {
  const controller = api.createController({ id: 'pagination-static-bundle', reuse: false });
  await controller.run(
    { mode: 'services', query: 'limpeza', contract: { transport: 'edge-v2' } },
    () => ({ response: { items: [{ id: '1' }] } })
  );

  const page = deferred();
  const intent = {
    mode: 'services',
    query: 'limpeza',
    cursor: 'cursor-1',
    append: true,
    operation: api.operations.PAGINATION,
    contract: { transport: 'edge-v2' }
  };
  const first = controller.run(intent, () => page.promise);
  const second = controller.run(intent, () => Promise.reject(new Error('must not execute twice')));
  assert.strictEqual(first, second, 'identical pagination must join one in-flight promise');
  page.resolve({ response: { items: [{ id: '2' }] } });
  const receipt = await first;
  assert.strictEqual(receipt.applied, true);

  await assert.rejects(
    controller.run({ ...intent, query: 'encanador', cursor: 'cursor-2' }, () => ({})),
    (error) => error.code === 'DOKE_SEARCH_CONTEXT_CHANGED'
  );
}

async function testRetry() {
  const controller = api.createController({ id: 'retry-static-bundle', reuse: false });
  let attempts = 0;
  const executor = () => {
    attempts += 1;
    if (attempts === 1) {
      const error = new Error('offline');
      error.code = 'DOKE_SEARCH_AUTHORITY_UNAVAILABLE';
      return Promise.reject(error);
    }
    return Promise.resolve({ response: { items: [{ id: 'recovered' }] } });
  };

  await assert.rejects(
    controller.run(
      { mode: 'services', query: 'jardinagem', contract: { transport: 'rpc-v1' } },
      executor
    )
  );
  assert.strictEqual(controller.getSnapshot().retryAvailable, true);
  const receipt = await controller.retry();
  assert.strictEqual(receipt.applied, true);
  assert.strictEqual(receipt.operation, api.operations.RETRY);
  assert.strictEqual(controller.getSnapshot().retryAvailable, false);
  assert.strictEqual(attempts, 2);
}

function testUrlContract() {
  resetObservations();
  const input = {
    mode: 'services',
    query: '  Pintor  ',
    filters: {
      categories: ['Reformas', 'Pintura', 'Reformas'],
      state: 'MG',
      city: 'Belo Horizonte',
      minRating: 4,
      guaranteed: true,
      online: false
    },
    cursor: 'must-not-persist'
  };
  const serialized = api.serializeUrl(
    input,
    '?busca=antiga&cursor=secret&pageSize=24&type=users&foo=keep'
  );
  const params = new URLSearchParams(serialized);
  assert.strictEqual(params.get('q'), 'Pintor');
  assert.strictEqual(params.get('type'), 'services');
  assert.deepStrictEqual(params.getAll('category'), ['Pintura', 'Reformas']);
  assert.strictEqual(params.get('state'), 'MG');
  assert.strictEqual(params.get('city'), 'Belo Horizonte');
  assert.strictEqual(params.get('guaranteed'), '1');
  assert.strictEqual(params.get('cursor'), null);
  assert.strictEqual(params.get('pageSize'), null);
  assert.strictEqual(params.get('busca'), null);
  assert.strictEqual(params.get('foo'), 'keep');

  api.replaceUrl(input);
  assert(historyState.last.startsWith('/resultados.html?'));
  assert(!historyState.last.includes('cursor='));
  assert(historyState.last.endsWith('#resultados'));
}

function testSourceContracts() {
  const bundle = read(BUNDLE);
  const workflow = read(WORKFLOW);
  const documentation = read(DOCUMENTATION);

  assert(bundle.includes('Doke.searchExperience = api'), 'authority must be published');
  assert(bundle.includes("STALE: 'stale'"), 'stale state must exist');
  assert(bundle.includes('abortActive'), 'previous requests must receive an abort signal');
  assert(bundle.includes('currentSearchFingerprint'), 'generation fence must include search identity');
  assert(bundle.includes('serializeUrl'), 'URL contract must be explicit');
  assert(!bundle.includes('location.href'), 'authority must not capture full URLs');
  assert(!bundle.includes('console.log'), 'authority must not log query payloads');

  assert(bundle.includes('controller.run(intent'), 'server surface must delegate concurrency');
  assert(bundle.includes('receipt.applied !== true'), 'stale receipts must not mutate the DOM');
  assert(bundle.includes('DOKE_SEARCH_CONTEXT_CHANGED'), 'pagination fence must remain explicit');
  assert(bundle.includes('retry: retry'), 'retry must be exposed');
  assert(!bundle.includes('if (state.loading && state.inFlight) return state.inFlight'));
  assert(bundle.includes('syncCanonicalUrl(context)'), 'initial search must canonicalize the URL');
  assert(bundle.includes('DOKE_SEARCH_EXPERIENCE_UNAVAILABLE'), 'missing static authority must fail closed');

  assert(bundle.includes('Amostra editorial local') || bundle.includes('Amostra local de perfis'));
  assert(bundle.includes('describeMode'), 'pilot must consume the authority descriptor');
  assert(bundle.includes('searchAuthorityNote'), 'authority note must be created');
  assert(bundle.includes('searchRetry'), 'retry control must be created');

  assert(!bundle.includes("createElement('script')"), 'runtime code injection must not be used');
  assert(!bundle.includes('script.src ='), 'runtime script URLs must not be assigned');
  assert(!bundle.includes("createElement('style')"), 'runtime style injection must not be used');
  assert(!bundle.includes('eval('), 'dynamic evaluation must not be used');
  assert(!bundle.includes('new Function'), 'dynamic function construction must not be used');

  assert(workflow.includes('node --check assets/js/pages/search/server-results-surface.js'));
  assert(!workflow.includes('assets/js/core/search-experience.js'));
  assert(!workflow.includes('assets/js/pages/search/results-authority-pilot.js'));
  assert(documentation.includes('static delivery bundle'));
}

(async () => {
  await testEnumsAndAuthorityDisclosure();
  await testLatestWins();
  await testPaginationAndContextFence();
  await testRetry();
  testUrlContract();
  testSourceContracts();
  console.log('[test:ux-search-001] passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
