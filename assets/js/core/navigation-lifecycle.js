/* Doke canonical navigation and lifecycle facade
 * Responsibility: expose one shared entry-mode decision, navigation adapter
 * boundary and observable document/route/page/guard state. Existing routers,
 * hydration and preload modules remain implementation adapters during the
 * staged migration; pages must not create a second global authority.
 */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  if (Doke.navigationLifecycle) {
    window.DokeNavigationLifecycle = Doke.navigationLifecycle;
    window.DokeNavigate = Doke.navigationLifecycle.navigation.go;
    return;
  }

  var VERSION = '20260714-navigation-lifecycle-v2';
  var INTERNAL_MARKER_KEY = 'doke.internalRouteNavigation';
  var INTENT_MARKER_KEY = 'doke.navigationIntent';
  var SCROLL_STORAGE_KEY = 'doke.navigationScroll.v1';
  var INTERNAL_NAVIGATION_TTL = 2500;
  var MAX_LOG_ENTRIES = 160;
  var VISUAL_MINIMUMS = Object.freeze({ document: 0, route: 0, page: 0, guard: 0 });
  var adapters = new Map();
  var scrollPositions = new Map();
  var sequence = 0;
  var visualCycleSequence = 0;
  var visualCycle = { id: 0, mode: 'hard-load', source: 'bootstrap', startedAt: Date.now() };
  var popstateBound = false;
  var log = window.__dokeNavigationLifecycleLog || (window.__dokeNavigationLifecycleLog = []);

  function now() {
    return Date.now();
  }

  function performanceNow() {
    try {
      return Math.round(window.performance && window.performance.now ? window.performance.now() : 0);
    } catch (error) {
      return 0;
    }
  }

  function normalizeDuration(value, fallback) {
    var number = Number(value);
    if (!Number.isFinite(number)) number = Number(fallback || 0);
    return Math.max(0, number);
  }

  function beginVisualCycle(detail) {
    detail = detail || {};
    visualCycle = {
      id: ++visualCycleSequence,
      mode: String(detail.mode || state && state.entry && state.entry.mode || 'hard-load'),
      source: String(detail.source || 'navigation'),
      startedAt: now()
    };
    document.dispatchEvent(new CustomEvent('doke:navigation-visual-cycle', {
      detail: copy(visualCycle)
    }));
    return copy(visualCycle);
  }

  function getVisualCycle() {
    return copy(visualCycle);
  }

  function visualMinimum(surface, requested) {
    var fallback = Object.prototype.hasOwnProperty.call(VISUAL_MINIMUMS, surface)
      ? VISUAL_MINIMUMS[surface]
      : 0;
    return normalizeDuration(requested, fallback);
  }

  function visualMinimumRemaining(surface, requested, detail) {
    detail = detail || {};
    var minimum = visualMinimum(surface, requested);
    var startedAt = Number(detail.startedAt || visualCycle.startedAt || now());
    return Math.max(0, minimum - Math.max(0, now() - startedAt));
  }

  function waitForVisualMinimum(surface, requested, detail) {
    var remaining = visualMinimumRemaining(surface, requested, detail);
    if (remaining <= 0) return Promise.resolve(0);
    return new Promise(function (resolve) {
      window.setTimeout(function () { resolve(remaining); }, remaining);
    });
  }

  function normalizeUrl(value) {
    try {
      return new URL(value || window.location.href, window.location.href);
    } catch (error) {
      return new URL(window.location.href);
    }
  }

  function normalizePath(value) {
    var pathname = normalizeUrl(value).pathname || '/';
    if (pathname === '/') return '/index.html';
    return '/' + (pathname.split('/').filter(Boolean).pop() || 'index.html');
  }

  function getNavigationType() {
    try {
      var entries = window.performance && window.performance.getEntriesByType
        ? window.performance.getEntriesByType('navigation')
        : [];
      return entries && entries[0] && entries[0].type || 'navigate';
    } catch (error) {
      return 'navigate';
    }
  }

  function readInternalMarker() {
    try {
      var value = Number(window.sessionStorage && window.sessionStorage.getItem(INTERNAL_MARKER_KEY) || 0);
      return Number.isFinite(value) ? value : 0;
    } catch (error) {
      return 0;
    }
  }

  function readIntentMarker() {
    try {
      var raw = window.sessionStorage && window.sessionStorage.getItem(INTENT_MARKER_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Number.isFinite(Number(parsed.at))) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function hasRecentInternalNavigation(navigationType) {
    if (navigationType === 'reload' || navigationType === 'back_forward') return false;
    var marker = readInternalMarker();
    return marker > 0 && now() - marker < INTERNAL_NAVIGATION_TTL;
  }

  function detectEntry() {
    var navigationType = getNavigationType();
    var datasetMode = document.documentElement && document.documentElement.dataset.dokeNavigationMode
      || document.body && document.body.dataset.dokeNavigationMode
      || '';
    var intent = readIntentMarker();
    var recentInternal = hasRecentInternalNavigation(navigationType);
    var mode = navigationType === 'back_forward'
      ? 'restore'
      : datasetMode === 'stable-shell' || recentInternal
      ? 'internal'
      : 'hard-load';

    return Object.freeze({
      mode: mode,
      navigationType: navigationType,
      source: intent && now() - Number(intent.at) < INTERNAL_NAVIGATION_TTL
        ? String(intent.source || mode)
        : mode,
      path: normalizePath(),
      href: window.location.href,
      detectedAt: now(),
      recentInternalMarker: recentInternal
    });
  }

  var state = {
    entry: detectEntry(),
    document: {
      state: 'idle',
      source: 'bootstrap',
      updatedAt: now(),
      error: ''
    },
    route: {
      id: 0,
      state: 'idle',
      from: normalizePath(),
      to: normalizePath(),
      source: 'bootstrap',
      replace: false,
      restore: false,
      adapter: '',
      updatedAt: now(),
      error: ''
    },
    page: {
      state: 'idle',
      page: document.body && document.body.dataset.page || normalizePath().slice(1).replace(/\.html$/i, ''),
      source: 'bootstrap',
      hasItems: null,
      updatedAt: now(),
      error: ''
    },
    guard: {
      id: 0,
      state: 'idle',
      name: '',
      source: 'bootstrap',
      redirect: '',
      updatedAt: now(),
      error: ''
    }
  };

  visualCycle = {
    id: ++visualCycleSequence,
    mode: state.entry.mode,
    source: 'entry',
    startedAt: now()
  };

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function syncDataset() {
    var roots = [document.documentElement, document.body].filter(Boolean);
    roots.forEach(function (root) {
      root.dataset.dokeLifecycleVersion = VERSION;
      root.dataset.dokeEntryMode = state.entry.mode;
      root.dataset.dokeDocumentState = state.document.state;
      root.dataset.dokeRouteState = state.route.state;
      root.dataset.dokePageState = state.page.state;
      root.dataset.dokeGuardState = state.guard.state;
      if (state.route.adapter) root.dataset.dokeNavigationAdapter = state.route.adapter;
      else root.removeAttribute('data-doke-navigation-adapter');
    });
  }

  function appendLog(domain, nextState, detail) {
    var entry = {
      domain: domain,
      state: nextState,
      at: performanceNow(),
      detail: detail || {}
    };
    log.push(entry);
    if (log.length > MAX_LOG_ENTRIES) log.splice(0, log.length - MAX_LOG_ENTRIES);
    return entry;
  }

  function emit(domain, nextState, detail) {
    syncDataset();
    var entry = appendLog(domain, nextState, detail);
    document.dispatchEvent(new CustomEvent('doke:navigation-lifecycle-change', {
      detail: Object.assign({
        version: VERSION,
        domain: domain,
        state: nextState,
        snapshot: getSnapshot()
      }, detail || {})
    }));
    document.dispatchEvent(new CustomEvent('doke:navigation-lifecycle-' + domain, {
      detail: Object.assign({
        version: VERSION,
        state: nextState,
        snapshot: getSnapshot(),
        logEntry: entry
      }, detail || {})
    }));
  }

  function updateDomain(domain, patch, detail) {
    state[domain] = Object.assign({}, state[domain], patch || {}, { updatedAt: now() });
    emit(domain, state[domain].state, detail || patch || {});
    return copy(state[domain]);
  }

  function getSnapshot() {
    return copy(state);
  }

  function markInternalNavigation(detail) {
    var payload = Object.assign({
      at: now(),
      source: 'internal',
      from: normalizePath(),
      to: ''
    }, detail || {});
    try {
      window.sessionStorage.setItem(INTERNAL_MARKER_KEY, String(payload.at));
      window.sessionStorage.setItem(INTENT_MARKER_KEY, JSON.stringify(payload));
    } catch (error) {}
    return payload;
  }

  function clearInternalNavigation() {
    try {
      window.sessionStorage.removeItem(INTERNAL_MARKER_KEY);
      window.sessionStorage.removeItem(INTENT_MARKER_KEY);
    } catch (error) {}
  }

  function refreshEntry(mode, detail) {
    var nextMode = mode || detectEntry().mode;
    state.entry = Object.freeze(Object.assign({}, state.entry, detail || {}, {
      mode: nextMode,
      path: normalizePath(),
      href: window.location.href,
      detectedAt: now()
    }));
    emit('entry', nextMode, detail || {});
    return state.entry;
  }

  function documentBegin(detail) {
    return updateDomain('document', {
      state: 'booting',
      source: detail && detail.source || 'document',
      error: ''
    }, detail);
  }

  function markShellReady(detail) {
    return updateDomain('document', {
      state: 'shell-ready',
      source: detail && detail.source || 'shell',
      error: ''
    }, detail);
  }

  function documentReady(detail) {
    return updateDomain('document', {
      state: 'ready',
      source: detail && detail.source || 'document',
      error: ''
    }, detail);
  }

  function documentFail(reason, detail) {
    var error = reason instanceof Error ? reason : new Error(String(reason || 'Falha no boot do documento.'));
    return updateDomain('document', {
      state: 'error',
      source: detail && detail.source || 'document',
      error: error.message
    }, Object.assign({ error: error.message }, detail || {}));
  }

  function pageBegin(detail) {
    detail = detail || {};
    return updateDomain('page', {
      state: 'hydrating',
      page: String(detail.page || state.page.page || normalizePath().slice(1).replace(/\.html$/i, '')),
      source: String(detail.source || 'hydration'),
      hasItems: null,
      error: ''
    }, detail);
  }

  function pageReady(detail) {
    detail = detail || {};
    var hasItems = typeof detail.hasItems === 'boolean' ? detail.hasItems : state.page.hasItems;
    return updateDomain('page', {
      state: detail.state === 'empty' || hasItems === false ? 'empty' : 'ready',
      page: String(detail.page || state.page.page),
      source: String(detail.source || 'hydration'),
      hasItems: typeof hasItems === 'boolean' ? hasItems : null,
      error: ''
    }, detail);
  }

  function pageFail(reason, detail) {
    var error = reason instanceof Error ? reason : new Error(String(reason || 'Falha ao carregar a página.'));
    detail = detail || {};
    return updateDomain('page', {
      state: 'error',
      page: String(detail.page || state.page.page),
      source: String(detail.source || 'hydration'),
      error: error.message
    }, Object.assign({ error: error.message }, detail));
  }

  function routeBegin(detail) {
    detail = detail || {};
    var id = ++sequence;
    beginVisualCycle({
      mode: detail.restore ? 'restore' : 'internal',
      source: detail.source || 'route'
    });
    updateDomain('route', {
      id: id,
      state: 'pending',
      from: normalizePath(detail.from || window.location.href),
      to: normalizePath(detail.to || detail.href || window.location.href),
      source: String(detail.source || 'internal'),
      replace: detail.replace === true,
      restore: detail.restore === true,
      adapter: String(detail.adapter || ''),
      error: ''
    }, Object.assign({ id: id }, detail));
    return id;
  }

  function isCurrentRoute(id) {
    return !id || Number(id) === Number(state.route.id);
  }

  function routeCommit(id, detail) {
    if (!isCurrentRoute(id)) return copy(state.route);
    return updateDomain('route', {
      state: 'committed',
      adapter: String(detail && detail.adapter || state.route.adapter),
      error: ''
    }, Object.assign({ id: state.route.id }, detail || {}));
  }

  function routeReady(id, detail) {
    if (!isCurrentRoute(id)) return copy(state.route);
    var requestedState = detail && detail.state;
    var nextState = requestedState === 'empty' ? 'empty' : requestedState === 'error' ? 'error' : 'ready';
    var result = updateDomain('route', {
      state: nextState,
      error: nextState === 'error' ? String(detail && detail.error || state.route.error || 'Falha ao concluir a rota.') : ''
    }, Object.assign({ id: state.route.id }, detail || {}));
    if (nextState === 'ready' || nextState === 'empty') clearInternalNavigation();
    return result;
  }

  function routeFail(id, reason, detail) {
    if (!isCurrentRoute(id)) return copy(state.route);
    var error = reason instanceof Error ? reason : new Error(String(reason || 'Falha na navegação.'));
    return updateDomain('route', {
      state: 'error',
      error: error.message
    }, Object.assign({ id: state.route.id, error: error.message }, detail || {}));
  }

  function guardBegin(detail) {
    detail = detail || {};
    var id = ++sequence;
    updateDomain('guard', {
      id: id,
      state: 'pending',
      name: String(detail.name || 'guard'),
      source: String(detail.source || normalizePath()),
      redirect: '',
      error: ''
    }, Object.assign({ id: id }, detail));
    return id;
  }

  function isCurrentGuard(id) {
    return !id || Number(id) === Number(state.guard.id);
  }

  function guardAllow(id, detail) {
    if (!isCurrentGuard(id)) return copy(state.guard);
    return updateDomain('guard', {
      state: 'allowed',
      redirect: '',
      error: ''
    }, Object.assign({ id: state.guard.id }, detail || {}));
  }

  function guardRedirect(id, target, detail) {
    if (!isCurrentGuard(id)) return copy(state.guard);
    return updateDomain('guard', {
      state: 'redirecting',
      redirect: normalizeUrl(target).href,
      error: ''
    }, Object.assign({ id: state.guard.id, target: normalizeUrl(target).href }, detail || {}));
  }

  function guardFail(id, reason, detail) {
    if (!isCurrentGuard(id)) return copy(state.guard);
    var error = reason instanceof Error ? reason : new Error(String(reason || 'Falha ao validar acesso.'));
    return updateDomain('guard', {
      state: 'error',
      error: error.message
    }, Object.assign({ id: state.guard.id, error: error.message }, detail || {}));
  }

  function adapterList() {
    return Array.from(adapters.values()).sort(function (left, right) {
      return right.priority - left.priority || left.name.localeCompare(right.name);
    });
  }

  function registerNavigationAdapter(name, adapter, options) {
    if (!name || !adapter || typeof adapter.navigate !== 'function') {
      throw new TypeError('Navigation adapter requires a name and navigate function.');
    }
    var record = {
      name: String(name),
      navigate: adapter.navigate,
      warm: typeof adapter.warm === 'function' ? adapter.warm : null,
      canHandle: typeof adapter.canHandle === 'function' ? adapter.canHandle : function () { return true; },
      priority: Number(options && options.priority || adapter.priority || 0)
    };
    adapters.set(record.name, record);
    document.dispatchEvent(new CustomEvent('doke:navigation-adapter-registered', {
      detail: { name: record.name, priority: record.priority, version: VERSION }
    }));
    return function unregister() {
      adapters.delete(record.name);
    };
  }

  function resolveAdapter(href, options) {
    if (options && options.forceDocument === true) return null;
    return adapterList().find(function (adapter) {
      try {
        return adapter.canHandle(href, options || {}) !== false;
      } catch (error) {
        return false;
      }
    }) || null;
  }

  function readStoredScroll() {
    try {
      var raw = window.sessionStorage && window.sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (!raw) return {};
      var value = JSON.parse(raw);
      return value && typeof value === 'object' ? value : {};
    } catch (error) {
      return {};
    }
  }

  function persistScroll(key, value) {
    try {
      var stored = readStoredScroll();
      stored[key] = value;
      var keys = Object.keys(stored);
      if (keys.length > 24) {
        keys.sort(function (a, b) { return Number(stored[a].at || 0) - Number(stored[b].at || 0); });
        keys.slice(0, keys.length - 24).forEach(function (oldKey) { delete stored[oldKey]; });
      }
      window.sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {}
  }

  function scrollKey(value) {
    var url = normalizeUrl(value);
    return url.pathname + url.search + url.hash;
  }

  function findMainScroller() {
    var selectors = [
      '[data-shell-main]',
      '.shell-home__workspace',
      '.page__content',
      '.doke-page-shell',
      '.orders-shell-content',
      '.settings-shell-content'
    ];
    for (var index = 0; index < selectors.length; index += 1) {
      var node = document.querySelector(selectors[index]);
      if (node && node.scrollHeight > node.clientHeight + 2) return node;
    }
    return null;
  }

  function captureScroll(value) {
    var key = scrollKey(value || window.location.href);
    var main = findMainScroller();
    var position = {
      x: Number(window.scrollX || 0),
      y: Number(window.scrollY || 0),
      mainX: main ? Number(main.scrollLeft || 0) : 0,
      mainY: main ? Number(main.scrollTop || 0) : 0,
      at: now()
    };
    scrollPositions.set(key, position);
    persistScroll(key, position);
    return copy(position);
  }

  function getScroll(value) {
    var key = scrollKey(value || window.location.href);
    var memory = scrollPositions.get(key);
    if (memory) return copy(memory);
    var stored = readStoredScroll()[key];
    return stored ? copy(stored) : null;
  }

  function restoreScroll(value) {
    var position = getScroll(value || window.location.href);
    if (!position) return Promise.resolve(false);
    return new Promise(function (resolve) {
      window.requestAnimationFrame(function () {
        try { window.scrollTo(position.x || 0, position.y || 0); } catch (error) {}
        var main = findMainScroller();
        if (main) {
          try {
            main.scrollLeft = position.mainX || 0;
            main.scrollTop = position.mainY || 0;
          } catch (error) {}
        }
        resolve(true);
      });
    });
  }

  function warm(href, options) {
    var adapter = resolveAdapter(href, options || {});
    if (!adapter || !adapter.warm) return Promise.resolve(false);
    try {
      return Promise.resolve(adapter.warm(href, options || {}));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function documentNavigate(url, options) {
  var id = routeBegin({
    from: window.location.href,
    to: url.href,
    source: options.source || 'document-fallback',
    replace: options.replace === true,
    restore: options.restoreScroll === true,
    adapter: 'document'
  });
  routeCommit(id, { adapter: 'document' });
  if (options.replace === true) window.location.replace(url.href);
  else window.location.assign(url.href);
  return Promise.resolve(true);
}
  function go(href, options) {
    options = Object.assign({
      replace: false,
      restoreScroll: false,
      skipHistory: false,
      captureScroll: true,
      source: 'navigation'
    }, options || {});
    var url = normalizeUrl(href);
    var adapter = resolveAdapter(url.href, options);

    if (options.captureScroll !== false) captureScroll(window.location.href);

    if (!adapter) return documentNavigate(url, options);

    markInternalNavigation({
      source: options.source || 'internal',
      from: normalizePath(),
      to: normalizePath(url.href),
      replace: options.replace === true,
      restore: options.restoreScroll === true
    });
    refreshEntry(options.restoreScroll ? 'restore' : 'internal', {
      source: options.source || 'internal',
      path: normalizePath(url.href),
      href: url.href
    });

    var lifecycleRouteId = routeBegin({
      from: window.location.href,
      to: url.href,
      source: options.source || 'internal',
      replace: options.replace === true,
      restore: options.restoreScroll === true,
      adapter: adapter.name
    });

    try {
      return Promise.resolve(adapter.navigate(url.href, Object.assign({}, options, {
        lifecycleAdapter: adapter.name,
        lifecycleRouteId: lifecycleRouteId
      }))).catch(function (error) {
        routeFail(lifecycleRouteId, error, { adapter: adapter.name, to: normalizePath(url.href) });
        throw error;
      });
    } catch (error) {
      routeFail(lifecycleRouteId, error, { adapter: adapter.name, to: normalizePath(url.href) });
      return Promise.reject(error);
    }
  }

  function back(fallback, options) {
    options = Object.assign({
      replaceFallback: true,
      source: 'back'
    }, options || {});
    if (window.history && window.history.length > 1) {
      captureScroll(window.location.href);
      window.history.back();
      return Promise.resolve(true);
    }
    if (!fallback) return Promise.resolve(false);
    return go(fallback, {
      replace: options.replaceFallback !== false,
      restoreScroll: false,
      source: options.source + '-fallback'
    });
  }

  function runGuard(options) {
  options = options || {};
  if (typeof options.check !== 'function') {
    return Promise.reject(new TypeError('Guard check must be a function.'));
  }
  var id = guardBegin({ name: options.name || 'guard', source: options.source || normalizePath() });
  return Promise.resolve()
    .then(function () { return options.check(); })
    .then(function (result) {
      var allowed = typeof options.allowed === 'function' ? options.allowed(result) : Boolean(result);
      if (allowed) {
        guardAllow(id, { result: result });
        return { allowed: true, result: result, guardId: id };
      }
      var target = typeof options.redirect === 'function' ? options.redirect(result) : options.redirect;
      if (!target) throw new Error('Guard negado sem destino seguro.');
      guardRedirect(id, target, { result: result });
      return go(target, {
        replace: true,
        source: 'guard',
        forceDocument: options.forceDocument === true
      }).then(function () {
        return { allowed: false, result: result, guardId: id, redirect: normalizeUrl(target).href };
      });
    })
    .catch(function (error) {
      guardFail(id, error, { source: options.source || normalizePath() });
      if (!options.fallback) throw error;
      guardRedirect(id, options.fallback, { fallback: true });
      return go(options.fallback, {
        replace: true,
        source: 'guard-fallback',
        forceDocument: options.forceDocument === true
      }).then(function () {
        return { allowed: false, error: error, guardId: id, redirect: normalizeUrl(options.fallback).href };
      });
    });
}
  function bindPopstate() {
    if (popstateBound) return;
    popstateBound = true;
    window.addEventListener('popstate', function () {
      refreshEntry('restore', { source: 'popstate' });
      go(window.location.href, {
        replace: true,
        restoreScroll: true,
        skipHistory: true,
        captureScroll: false,
        source: 'popstate'
      }).catch(function (error) {
        console.error('[DokeNavigationLifecycle:popstate]', error);
        window.location.reload();
      });
    });
  }

  var api = Object.freeze({
    version: VERSION,
    getSnapshot: getSnapshot,
    entry: Object.freeze({
      get: function () { return state.entry; },
      getMode: function () { return state.entry.mode; },
      isHardLoad: function () { return state.entry.mode === 'hard-load'; },
      isInternal: function () { return state.entry.mode === 'internal'; },
      isRestore: function () { return state.entry.mode === 'restore'; },
      refresh: refreshEntry,
      markInternal: markInternalNavigation,
      clearInternal: clearInternalNavigation
    }),
    document: Object.freeze({
      begin: documentBegin,
      markShellReady: markShellReady,
      ready: documentReady,
      fail: documentFail,
      getState: function () { return copy(state.document); }
    }),
    page: Object.freeze({
      begin: pageBegin,
      ready: pageReady,
      empty: function (detail) { return pageReady(Object.assign({}, detail || {}, { state: 'empty', hasItems: false })); },
      fail: pageFail,
      getState: function () { return copy(state.page); }
    }),
    route: Object.freeze({
      begin: routeBegin,
      commit: routeCommit,
      ready: routeReady,
      fail: routeFail,
      getState: function () { return copy(state.route); }
    }),
    guard: Object.freeze({
      begin: guardBegin,
      allow: guardAllow,
      redirect: guardRedirect,
      fail: guardFail,
      run: runGuard,
      getState: function () { return copy(state.guard); }
    }),
    navigation: Object.freeze({
      go: go,
      back: back,
      warm: warm,
      registerAdapter: registerNavigationAdapter,
      getAdapters: function () {
        return adapterList().map(function (adapter) {
          return { name: adapter.name, priority: adapter.priority };
        });
      }
    }),
    scroll: Object.freeze({
      capture: captureScroll,
      get: getScroll,
      restore: restoreScroll
    }),
    timing: Object.freeze({
      beginCycle: beginVisualCycle,
      getCycle: getVisualCycle,
      getMinimum: visualMinimum,
      remaining: visualMinimumRemaining,
      wait: waitForVisualMinimum
    })
  });

  Doke.navigationLifecycle = api;
  Doke.navigation = Doke.navigation || {};
  Doke.navigation.go = go;
  Doke.navigation.back = back;
  Doke.navigation.warm = warm;
  Doke.navigation.guard = runGuard;
  Doke.navigation.transition = api.route;
  Doke.navigation.lifecycle = api;
  Doke.pageLifecycle = api.page;
  window.DokeNavigationLifecycle = api;
  window.DokeNavigate = go;

  syncDataset();
  if (state.entry.mode === 'hard-load') documentBegin({ source: 'initial-document' });
  else documentReady({ source: state.entry.mode });
  bindPopstate();

  document.dispatchEvent(new CustomEvent('doke:navigation-lifecycle-ready', {
    detail: { version: VERSION, snapshot: getSnapshot() }
  }));
}());
