#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const errors = [];
const lifecyclePath = 'assets/js/core/navigation-lifecycle.js';
const lifecycleSource = read(lifecyclePath);

const productionPages = [
  'admin-verificacao.html',
  'admin.html',
  'ajuda.html',
  'anunciar-servico.html',
  'auth/cadastro.html',
  'auth/esqueci-senha.html',
  'auth/login.html',
  'avaliacao-profissional.html',
  'carteira.html',
  'comunidade.html',
  'configuracoes.html',
  'detalhe-anuncio.html',
  'index.html',
  'mensagens.html',
  'meu-perfil.html',
  'notificacoes.html',
  'novidades.html',
  'orcamento.html',
  'pagamento-profissional.html',
  'pedidos.html',
  'perfil-cliente.html',
  'perfil-profissional.html',
  'perfil.html',
  'resultados.html',
  'tornar-profissional.html',
  'verificacao-profissional.html'
];

for (const file of productionPages) {
  const html = read(file);
  const prefix = file.startsWith('auth/') ? '../' : '';
  const lifecycleTag = `${prefix}assets/js/core/navigation-lifecycle.js?v=20260713-navigation-lifecycle-v1`;
  const count = (html.match(/assets\/js\/core\/navigation-lifecycle\.js\?v=20260713-navigation-lifecycle-v1/g) || []).length;
  if (count !== 1) errors.push(`${file}: expected exactly one lifecycle facade script, found ${count}`);
  if (!html.includes(lifecycleTag)) errors.push(`${file}: lifecycle facade path is invalid`);

  const lifecycleIndex = html.indexOf(lifecycleTag);
  const appIndex = html.indexOf(`${prefix}assets/js/core/app.js`);
  const preloaderIndex = html.indexOf(`${prefix}assets/js/core/document-preloader.js`);
  const authorityIndex = appIndex >= 0 ? appIndex : preloaderIndex;
  if (authorityIndex >= 0 && lifecycleIndex > authorityIndex) {
    errors.push(`${file}: lifecycle facade must load before app/preloader adapters`);
  }
}

if (read('comunidade-interna.html').includes('assets/js/core/navigation-lifecycle.js')) {
  errors.push('comunidade-interna.html: excluded runtime surface was modified with lifecycle facade loading');
}

[
  'Doke.navigationLifecycle',
  'Doke.pageLifecycle',
  'window.DokeNavigationLifecycle',
  'window.DokeNavigate = go',
  'registerNavigationAdapter',
  "window.addEventListener('popstate'",
  'doke:navigation-lifecycle-change',
  'doke.internalRouteNavigation',
  'doke.navigationIntent',
  'skipHistory',
  'restoreScroll',
  'Doke.navigation.back',
  'timing: Object.freeze'
].forEach((needle) => {
  if (!lifecycleSource.includes(needle)) errors.push(`${lifecyclePath}: missing ${needle}`);
});

const appSource = read('assets/js/core/app.js');
const stableRouterSource = read('assets/js/core/stable-shell-router.js');
const hydrationSource = read('assets/js/core/page-hydration.js');
const preloaderSource = read('assets/js/core/document-preloader.js');

if (!appSource.includes("registerAdapter('legacy-shell'")) errors.push('app.js: legacy router is not registered as an adapter');
if (!stableRouterSource.includes("registerAdapter('stable-shell'")) errors.push('stable-shell-router.js: stable router is not registered as an adapter');
if (!appSource.includes('if (!navigationLifecycle)')) errors.push('app.js: legacy popstate fallback is not gated by the facade');
if (!stableRouterSource.includes('if (!lifecycle)')) errors.push('stable-shell-router.js: legacy popstate fallback is not gated by the facade');
if (!hydrationSource.includes('lifecycle?.entry')) errors.push('page-hydration.js: entry mode does not delegate to the facade');
if (!hydrationSource.includes('lifecycle.page.begin')) errors.push('page-hydration.js: page state does not delegate to the facade');
if (!preloaderSource.includes('lifecycle.entry')) errors.push('document-preloader.js: entry mode does not delegate to the facade');
if (!preloaderSource.includes('lifecycle.document.markShellReady')) errors.push('document-preloader.js: shell readiness does not delegate to the facade');
if (!stableRouterSource.includes('options.skipHistory')) errors.push('stable-shell-router.js: popstate cannot skip history mutation');
if (!appSource.includes('skipHistory = false')) errors.push('app.js: legacy router cannot skip history mutation');
if (!stableRouterSource.includes('navigation-lifecycle|app|stable-shell-router')) errors.push('stable-shell-router.js: lifecycle facade is not protected as a persistent core script');
if (!appSource.includes('navigation-lifecycle|app|stable-shell-router')) errors.push('app.js: lifecycle facade is not protected as a persistent core script');

function makeEventTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      const values = listeners.get(type) || [];
      listeners.set(type, values.filter((value) => value !== handler));
    },
    dispatchEvent(event) {
      (listeners.get(event.type) || []).slice().forEach((handler) => handler.call(this, event));
      return true;
    }
  };
}

async function runtimeContract() {
  const documentEvents = makeEventTarget();
  const windowEvents = makeEventTarget();
  const storage = new Map();
  const assigned = [];
  const rootNode = {
    dataset: {},
    removeAttribute(name) {
      if (name.startsWith('data-')) {
        const key = name.slice(5).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
        delete this.dataset[key];
      }
    }
  };
  const bodyNode = {
    dataset: { page: 'index' },
    removeAttribute: rootNode.removeAttribute
  };

  class TestCustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }

  const location = {
    href: 'https://doke.test/index.html',
    assign(value) { assigned.push({ method: 'assign', value }); },
    replace(value) { assigned.push({ method: 'replace', value }); },
    reload() { assigned.push({ method: 'reload', value: this.href }); }
  };

  const document = Object.assign(documentEvents, {
    documentElement: rootNode,
    body: bodyNode,
    querySelector() { return null; }
  });

  const windowObject = Object.assign(windowEvents, {
    Doke: {},
    document,
    location,
    history: {
      state: null,
      length: 1,
      backCalls: 0,
      back() { this.backCalls += 1; },
      pushState() {},
      replaceState() {}
    },
    performance: {
      now: () => 10,
      getEntriesByType: () => [{ type: 'navigate' }]
    },
    sessionStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    },
    scrollX: 0,
    scrollY: 0,
    scrollTo() {},
    requestAnimationFrame(callback) { callback(); return 1; },
    setTimeout,
    clearTimeout,
    console
  });
  windowObject.window = windowObject;

  const context = vm.createContext({
    window: windowObject,
    document,
    CustomEvent: TestCustomEvent,
    URL,
    Map,
    Set,
    Object,
    Array,
    Number,
    String,
    Boolean,
    Date,
    Error,
    TypeError,
    JSON,
    Promise,
    console,
    setTimeout,
    clearTimeout
  });

  vm.runInContext(lifecycleSource, context, { filename: lifecyclePath });
  const api = windowObject.DokeNavigationLifecycle;

  assert(api, 'facade must be exposed');
  assert.strictEqual(api.entry.getMode(), 'hard-load');
  assert.strictEqual(windowObject.DokeNavigate, api.navigation.go);
  assert.strictEqual(windowObject.Doke.pageLifecycle, api.page);
  assert.strictEqual(windowObject.Doke.navigation.back, api.navigation.back);
  assert.strictEqual(api.timing.getMinimum('document'), 0);
  assert.strictEqual(api.timing.getMinimum('route'), 0);
  assert.strictEqual(api.timing.getMinimum('page'), 0);
  assert.strictEqual((windowEvents.listeners.get('popstate') || []).length, 1, 'facade must own one popstate listener');

  const calls = [];
  api.navigation.registerAdapter('low', {
    navigate(href, options) { calls.push({ adapter: 'low', href, options }); return true; },
    canHandle() { return true; }
  }, { priority: 10 });
  api.navigation.registerAdapter('high', {
    navigate(href, options) {
      calls.push({
        adapter: 'high',
        href,
        options,
        markerDuringPending: storage.has('doke.internalRouteNavigation'),
        intentDuringPending: storage.has('doke.navigationIntent')
      });
      api.route.commit(options.lifecycleRouteId, { adapter: 'high' });
      api.route.ready(options.lifecycleRouteId, { state: 'ready' });
      return true;
    },
    canHandle() { return true; }
  }, { priority: 100 });

  await api.navigation.go('https://doke.test/pedidos.html', { source: 'test-link' });
  assert.strictEqual(calls[0].adapter, 'high', 'highest-priority compatible adapter must win');
  assert(Number(calls[0].options.lifecycleRouteId) > 0, 'adapter must receive the canonical route id');
  assert.strictEqual(api.route.getState().state, 'ready');
  assert.strictEqual(api.route.getState().adapter, 'high');
  assert.strictEqual(calls[0].markerDuringPending, true, 'legacy internal marker must exist while navigation is pending');
  assert.strictEqual(calls[0].intentDuringPending, true, 'structured navigation intent must exist while navigation is pending');
  assert.strictEqual(storage.has('doke.internalRouteNavigation'), false, 'legacy internal marker must be cleared after successful settlement');
  assert.strictEqual(storage.has('doke.navigationIntent'), false, 'structured intent must be cleared after successful settlement');

  const documentNavigation = api.navigation.go('https://doke.test/pagamento-profissional.html', {
    source: 'test-document-navigation',
    forceDocument: true
  });
  assert.strictEqual(assigned.length, 0, 'document navigation must not destroy the caller context synchronously');
  await documentNavigation;
  assert.strictEqual(assigned.length, 0, 'document navigation must settle before the hard navigation task');
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.deepStrictEqual(assigned.at(-1), {
    method: 'assign',
    value: 'https://doke.test/pagamento-profissional.html'
  });

  await api.navigation.back('https://doke.test/index.html', { source: 'test-back' });
  const fallbackBackCall = calls.at(-1);
  assert.strictEqual(fallbackBackCall.href, 'https://doke.test/index.html');
  assert.strictEqual(fallbackBackCall.options.replace, true, 'back fallback must replace history');
  windowObject.history.length = 2;
  await api.navigation.back('https://doke.test/index.html', { source: 'test-native-back' });
  assert.strictEqual(windowObject.history.backCalls, 1, 'canonical back must use browser history when available');

  const allowed = await api.guard.run({ name: 'allowed-test', check: () => true });
  assert.strictEqual(allowed.allowed, true);
  assert.strictEqual(api.guard.getState().state, 'allowed');

  await api.guard.run({
    name: 'redirect-test',
    check: () => false,
    redirect: 'https://doke.test/verificacao-profissional.html'
  });
  assert.strictEqual(api.guard.getState().state, 'redirecting');
  assert.strictEqual(calls.at(-1).adapter, 'high');
  assert.strictEqual(calls.at(-1).options.replace, true);

  const popstateHandler = windowEvents.listeners.get('popstate')[0];
  await popstateHandler();
  const popCall = calls.at(-1);
  assert.strictEqual(popCall.options.skipHistory, true);
  assert.strictEqual(popCall.options.restoreScroll, true);
  assert.strictEqual(popCall.options.source, 'popstate');
  assert.strictEqual(assigned.length, 1, 'adapter-backed routes must not add another document navigation');
}

(async () => {
  if (errors.length) {
    console.error('[navigation-lifecycle-core-contract] failed');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  try {
    await runtimeContract();
  } catch (error) {
    console.error('[navigation-lifecycle-core-contract] runtime failed');
    console.error(error.stack || error);
    process.exit(1);
  }

  console.log('[navigation-lifecycle-core-contract] ok');
  console.log(`- lifecycle facade loaded by ${productionPages.length} production pages`);
  console.log('- stable-shell and legacy-shell are adapters behind one DokeNavigate authority');
  console.log('- entry mode, route state, guard state, popstate and scroll contracts are exposed');
  console.log('- comunidade-interna.html remains outside the runtime patch');
})();
