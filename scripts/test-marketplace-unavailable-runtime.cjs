'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const flush = () => new Promise(resolve => setImmediate(resolve));
const unhandled = [];
process.on('unhandledRejection', error => unhandled.push(error));
function environment(file) {
  const { window, document } = parseHTML(fs.readFileSync(file, 'utf8'));
  Object.defineProperty(document, 'readyState', { value: 'loading' });
  window.location = new URL('https://synthetic.test/' + file + '?id=synthetic-ad');
  window.Doke = {};
  const context = vm.createContext({ window, document, console, Promise, URL, URLSearchParams,
    AbortController, CustomEvent: window.CustomEvent, setTimeout, clearTimeout });
  return { window, document, run(file) { vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }); } };
}
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
function denied() { const error = new Error('INTERNAL_TOKEN_MUST_NOT_RENDER'); error.code = 'DOKE_E2E_CAPABILITY_DENIED'; return error; }
(async () => {
  for (const kind of ['sync', 'async']) {
    await test('orchestrator ' + kind + ' failure rejects and permits retry without cache success', async () => {
      const e = environment('detalhe-anuncio.html'); let calls = 0, errors = 0;
      e.document.addEventListener('doke:page-data-revalidation-error', () => errors++);
      e.window.Doke.repositoryBoundary = { getPageData() { calls++; if (kind === 'sync') throw denied(); return Promise.reject(denied()); } };
      e.run('assets/js/services/page-data-orchestrator.js');
      const api = e.window.Doke.pageDataOrchestrator;
      let request; assert.doesNotThrow(() => { request = api.getPageData('detalhe-anuncio', { serviceId: 'synthetic-ad' }); });
      await assert.rejects(request, /INTERNAL_TOKEN/);
      assert.equal(errors, 1); assert.equal(api.peekPageData('detalhe-anuncio', { serviceId: 'synthetic-ad' }), null);
      e.window.Doke.repositoryBoundary.getPageData = () => { calls++; return { service: { id: 'synthetic-ad' } }; };
      assert.equal((await api.getPageData('detalhe-anuncio', { serviceId: 'synthetic-ad' })).service.id, 'synthetic-ad');
      assert.equal(calls, 2);
    });
    await test('home ' + kind + ' failure is explicit, sanitized, recoverable, never empty success', async () => {
      const e = environment('index.html'), d = e.window.Doke; let successes = 0, cards = 0;
      d.homeFavoritesSurface = { boot() {} };
      d.publicServiceCard = { create(item) { cards++; const card = e.document.createElement('div'); card.textContent = item.title; return card; } };
      d.services = { services: { list() { if (kind === 'sync') throw denied(); return Promise.reject(denied()); } } };
      e.document.addEventListener('doke:home-services-rendered', () => successes++);
      e.run('assets/js/pages/home/public-services.js'); const api = d.homePublicServices;
      const result = await api.init(); assert.equal(result.ok, false); assert.equal(cards, 0); assert.equal(successes, 0);
      const scope = e.document.querySelector('[data-state-boundary="index"]'), status = scope.querySelector('[data-home-services-empty]');
      assert.equal(status.hidden, false); assert.match(status.textContent, /Não foi possível/); assert(!status.textContent.includes('INTERNAL_TOKEN'));
      scope.dispatchEvent(new e.window.CustomEvent('doke:index-data-ready', { detail: { data: { services: [{ title: 'STALE' }] } } }));
      assert.equal(cards, 0); assert.equal(scope.dataset.publicServicesError, 'unavailable');
      d.services.services.list = () => Promise.resolve([{ title: 'Recovered', status: 'active' }]);
      assert.equal(await api.refresh(), 1); assert.equal(status.hidden, true); assert.equal(scope.dataset.publicServicesError, undefined);
      assert.equal(cards, 1); assert.equal(successes, 1);
    });
  }
  await test('home late response cannot replace a newer route error', async () => {
    const e = environment('index.html'), d = e.window.Doke; let release;
    d.homeFavoritesSurface = { boot() {} }; d.publicServiceCard = { create() { throw Error('Stale card rendered'); } };
    d.services = { services: { list: () => new Promise(resolve => { release = resolve; }) } };
    e.run('assets/js/pages/home/public-services.js'); const api = d.homePublicServices, first = api.refresh(); await flush();
    const old = e.document.querySelector('[data-state-boundary="index"]'), current = old.cloneNode(true); old.replaceWith(current);
    d.services.services.list = () => Promise.reject(denied()); await api.refresh();
    release([{ title: 'STALE' }]); await first; assert.equal(current.dataset.publicServicesError, 'unavailable');
  });
  await test('detail terminates hydration on sync/async failure, rejects stale results and recovers', async () => {
    const e = environment('detalhe-anuncio.html'), d = e.window.Doke, root = e.document.querySelector('[data-state-boundary="detalhe-anuncio"]');
    let state, starts = 0, errors = 0, message = '';
    const hydration = { start() { starts++; state = 'hydrating'; }, mark(source) { if (source === 'detail') state = root.dataset.dataState; },
      error(error) { errors++; message = error.message; state = 'error'; root.querySelectorAll('[data-detail-hydration-skeleton]').forEach(n => { n.hidden = true; }); root.querySelector('[data-state-error]').hidden = false; },
      getState() { return state; }, syncReady() {}, syncEmpty() {} };
    e.window.DokePageHydration = { create: () => hydration };
    d.repositoryBoundary = { getRegisteredProviders: () => [] };
    d.pageDataOrchestrator = { getPageData: () => Promise.reject(denied()) };
    e.run('assets/js/pages/detalhe-anuncio-data-controller.js'); const api = d.detailAdDataController;
    await api.load(root); assert.equal(state, 'error'); assert.equal(root.dataset.dataState, 'error'); assert.equal(errors, 1);
    assert(!message.includes('INTERNAL_TOKEN')); assert(!root.querySelector('[data-detail-error-message]').textContent.includes('INTERNAL_TOKEN'));
    assert([...root.querySelectorAll('[data-detail-hydration-skeleton]')].every(n => n.hidden));
    let release; d.pageDataOrchestrator.getPageData = () => new Promise(resolve => { release = resolve; }); const old = api.load(root);
    d.pageDataOrchestrator.getPageData = () => Promise.reject(denied()); await api.load(root);
    release({ service: { id: 'synthetic-ad' } }); await old; assert.equal(state, 'error');
    e.document.dispatchEvent(new e.window.CustomEvent('doke:page-data-revalidated', { detail: { page: 'detalhe-anuncio', context: { serviceId: 'synthetic-ad' }, data: { service: { id: 'synthetic-ad' } } } }));
    assert.equal(root.dataset.dataState, 'error');
    d.pageDataOrchestrator.getPageData = () => Promise.resolve({ service: { id: 'synthetic-ad' } });
    await api.load(root); assert.equal(root.dataset.dataState, 'ready'); assert.equal(state, 'ready'); assert(starts >= 2);
  });
  await flush(); assert.equal(unhandled.length, 0); console.log('PASS no unhandled rejections');
  console.log('UNAVAILABLE_RUNTIME: ' + (passed + 1) + ' checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
