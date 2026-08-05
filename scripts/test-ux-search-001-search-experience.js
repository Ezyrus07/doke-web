const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const AUTHORITY = 'assets/js/core/search-experience.js';
const SURFACE = 'assets/js/pages/search/server-results-surface.js';
const PILOT = 'assets/js/pages/search/results-authority-pilot.js';
const CSS = 'assets/css/core/search-experience.css';

function loadAuthority() {
  const events = [];
  const location = {
    pathname: '/resultados.html',
    search: '?busca=antiga&cursor=secret&type=users',
    hash: '#resultados'
  };
  const history = {
    last: '',
    replaceState(_state, _title, url) { this.last = String(url); }
  };
  const document = {
    dispatchEvent(event) { events.push(event.detail); }
  };
  class CustomEvent {
    constructor(type, init) { this.type = type; this.detail = init && init.detail; }
  }
  const context = {
    console,
    Promise,
    Map,
    Set,
    Object,
    Array,
    String,
    Number,
    Math,
    JSON,
    URLSearchParams,
    AbortController,
    Error,
    document,
    CustomEvent,
    location,
    history,
    window: null
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read(AUTHORITY), context, { filename: AUTHORITY });
  return { api: context.Doke.searchExperience, events, location, history };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function testEnumsAndAuthorityDisclosure() {
  const { api } = loadAuthority();
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
  const { api, events } = loadAuthority();
  const controller = api.createController({ id: 'latest-wins' });
  const a = deferred();
  const b = deferred();
  let signalA;

  const promiseA = controller.run({ mode: 'services', query: 'pintor', contract: { transport: 'edge-v2' } }, ({ signal }) => {
    signalA = signal;
    return a.promise;
  });
  const promiseB = controller.run({ mode: 'services', query: 'eletricista', contract: { transport: 'edge-v2' } }, () => b.promise);

  assert.strictEqual(signalA.aborted, true, 'new initial search must abort the previous signal');
  a.resolve({ response: { items: [{ id: 'old' }] } });
  const receiptA = await promiseA;
  assert.strictEqual(receiptA.applied, false);
  assert.strictEqual(receiptA.status, api.outcomes.STALE);
  assert.strictEqual(controller.getState(), api.states.LOADING, 'stale completion must not replace the current loading state');

  b.resolve({ response: { items: [{ id: 'new' }] } });
  const receiptB = await promiseB;
  assert.strictEqual(receiptB.applied, true);
  assert.strictEqual(receiptB.state, api.states.READY);
  assert.strictEqual(controller.getState(), api.states.READY);
  assert(events.some((event) => event.type === 'stale-result'), 'stale result must be observable');
  assert(!JSON.stringify(events).includes('eletricista'), 'events must not expose raw queries');
}

async function testPaginationAndContextFence() {
  const { api } = loadAuthority();
  const controller = api.createController({ id: 'pagination' });
  await controller.run({ mode: 'services', query: 'limpeza', contract: { transport: 'edge-v2' } }, () => ({ response: { items: [{ id: '1' }] } }));

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
  const { api } = loadAuthority();
  const controller = api.createController({ id: 'retry' });
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

  await assert.rejects(controller.run({ mode: 'services', query: 'jardinagem', contract: { transport: 'rpc-v1' } }, executor));
  assert.strictEqual(controller.getSnapshot().retryAvailable, true);
  const receipt = await controller.retry();
  assert.strictEqual(receipt.applied, true);
  assert.strictEqual(receipt.operation, api.operations.RETRY);
  assert.strictEqual(controller.getSnapshot().retryAvailable, false);
  assert.strictEqual(attempts, 2);
}

function testUrlContract() {
  const { api, history } = loadAuthority();
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
  const serialized = api.serializeUrl(input, '?busca=antiga&cursor=secret&pageSize=24&type=users&foo=keep');
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
  assert(history.last.startsWith('/resultados.html?'));
  assert(!history.last.includes('cursor='));
  assert(history.last.endsWith('#resultados'));
}

function testSourceContracts() {
  const authority = read(AUTHORITY);
  const surface = read(SURFACE);
  const pilot = read(PILOT);
  const css = read(CSS);

  assert(authority.includes('Doke.searchExperience = api'), 'authority must be published');
  assert(authority.includes("STALE: 'stale'"), 'stale state must exist');
  assert(authority.includes('abortActive'), 'previous requests must receive an abort signal');
  assert(authority.includes('currentSearchFingerprint'), 'generation fence must include search identity');
  assert(authority.includes('serializeUrl'), 'URL contract must be explicit');
  assert(!authority.includes('location.href'), 'authority must not capture full URLs');
  assert(!authority.includes('console.log'), 'authority must not log query payloads');

  assert(surface.includes('controller.run(intent'), 'server surface must delegate concurrency to the authority');
  assert(surface.includes('receipt.applied !== true'), 'stale receipts must not mutate the DOM');
  assert(surface.includes('DOKE_SEARCH_CONTEXT_CHANGED'), 'pagination context fence must remain explicit');
  assert(surface.includes('retry: retry'), 'retry must be exposed');
  assert(!surface.includes('if (state.loading && state.inFlight) return state.inFlight'), 'new initial searches must not join an old promise');
  assert(surface.includes('syncCanonicalUrl(context)'), 'initial search must canonicalize the URL');
  assert(surface.includes('ensureDependencies().catch'), 'authority disclosure must load even when a local mode is initially selected');

  assert(authority.includes('Amostra editorial local') || authority.includes('Amostra local de perfis'), 'local scopes must disclose sample coverage');
  assert(pilot.includes('describeMode'), 'pilot must consume the canonical authority descriptor');
  assert(pilot.includes('data-search-authority-note') || pilot.includes('searchAuthorityNote'), 'authority note must be created');
  assert(pilot.includes('data-search-retry') || pilot.includes('searchRetry'), 'retry control must be created');
  assert(!pilot.includes('location.href'), 'pilot must not capture full URLs');
  assert(!css.includes('!important'), 'search CSS must not use !important');
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
