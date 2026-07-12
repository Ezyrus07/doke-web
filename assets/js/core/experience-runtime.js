/* Doke experience runtime
   Responsibility: shared async state, stale-while-revalidate cache,
   optimistic mutations and domain invalidation for data-driven surfaces. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var RUNTIME_VERSION = '20260712-domain-invalidation-v1';

  if (Doke.experience && Doke.experience.version === RUNTIME_VERSION) return;

  var entries = new Map();
  var activeMutations = new Map();
  var VALID_STATES = new Set([
    'idle',
    'loading',
    'refreshing',
    'ready',
    'empty',
    'error',
    'offline',
    'submitting',
    'success'
  ]);

  var DOMAIN_RULES = Object.freeze({
    orders: Object.freeze({
      cachePrefixes: Object.freeze(['orders:']),
      routes: Object.freeze(['pedidos.html'])
    }),
    messages: Object.freeze({
      cachePrefixes: Object.freeze(['messages:']),
      routes: Object.freeze(['mensagens.html'])
    }),
    notifications: Object.freeze({
      cachePrefixes: Object.freeze(['notifications:']),
      routes: Object.freeze(['notificacoes.html'])
    }),
    wallet: Object.freeze({
      cachePrefixes: Object.freeze(['wallet:']),
      routes: Object.freeze(['carteira.html'])
    }),
    marketplace: Object.freeze({
      cachePrefixes: Object.freeze(['marketplace:']),
      routes: Object.freeze(['index.html', 'resultados.html']),
      pageData: Object.freeze(['index', 'resultados'])
    }),
    profiles: Object.freeze({
      cachePrefixes: Object.freeze(['profile:', 'profile-client:', 'profile-professional:', 'profile-owner:']),
      routes: Object.freeze(['perfil.html', 'perfil-cliente.html', 'perfil-profissional.html', 'meu-perfil.html'])
    }),
    detailAd: Object.freeze({
      cachePrefixes: Object.freeze(['detail-ad:']),
      routes: Object.freeze(['detalhe-anuncio.html']),
      pageData: Object.freeze(['detalhe-anuncio'])
    }),
    admin: Object.freeze({
      routes: Object.freeze(['admin.html'])
    }),
    payment: Object.freeze({
      routes: Object.freeze(['pagamento-profissional.html'])
    })
  });

  var EVENT_DOMAIN_RULES = Object.freeze({
    'doke:auth-session-change': Object.freeze(['orders', 'messages', 'notifications', 'wallet', 'marketplace', 'profiles', 'detailAd']),
    'doke:order-created': Object.freeze(['orders', 'notifications']),
    'doke:order-status-changed': Object.freeze(['orders', 'messages', 'notifications']),
    'doke:message-sent': Object.freeze(['messages', 'notifications']),
    'doke:payment-confirmed': Object.freeze(['orders', 'messages', 'notifications', 'wallet', 'payment']),
    'doke:order-completed': Object.freeze(['orders', 'messages', 'notifications', 'wallet', 'payment']),
    'doke:wallet-receivable-created': Object.freeze(['wallet', 'admin']),
    'doke:wallet-receivable-updated': Object.freeze(['wallet', 'admin']),
    'doke:wallet-withdraw-requested': Object.freeze(['wallet', 'admin']),
    'doke:wallet-withdraw-completed': Object.freeze(['wallet', 'admin']),
    'doke:wallet-withdraw-resolved': Object.freeze(['wallet', 'admin']),
    'doke:wallet-bank-account-saved': Object.freeze(['wallet']),
    'doke:wallet-dispute-opened': Object.freeze(['wallet', 'admin', 'orders', 'messages', 'notifications']),
    'doke:wallet-dispute-resolved': Object.freeze(['wallet', 'admin', 'orders', 'messages', 'notifications']),
    'doke:profile-updated': Object.freeze(['profiles', 'marketplace']),
    'doke:review-created': Object.freeze(['profiles', 'marketplace', 'orders', 'notifications', 'detailAd']),
    'doke:review-updated': Object.freeze(['profiles', 'marketplace', 'orders', 'notifications', 'detailAd']),
    'doke:service-created': Object.freeze(['marketplace', 'profiles', 'detailAd']),
    'doke:service-updated': Object.freeze(['marketplace', 'profiles', 'detailAd']),
    'doke:service-deleted': Object.freeze(['marketplace', 'profiles', 'detailAd']),
    'doke:service-favorite-changed': Object.freeze(['marketplace']),
    'doke:professional-application-submitted': Object.freeze(['profiles', 'admin'])
  });

  function now() {
    return Date.now();
  }

  function normalizeState(state) {
    return VALID_STATES.has(state) ? state : 'idle';
  }

  function normalizeList(value) {
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (value == null || value === '') return [];
    return [String(value)];
  }

  function unique(values) {
    return Array.from(new Set(values));
  }

  function resolveBoundary(boundary) {
    if (!boundary) return null;
    if (typeof boundary === 'string') return document.querySelector(boundary);
    return boundary;
  }

  function setState(boundary, state, detail) {
    var node = resolveBoundary(boundary);
    var nextState = normalizeState(state);
    if (!node) return nextState;

    node.dataset.viewState = nextState;
    node.dataset.experienceState = nextState;
    node.setAttribute('aria-busy', ['loading', 'refreshing', 'submitting'].indexOf(nextState) !== -1 ? 'true' : 'false');

    document.dispatchEvent(new CustomEvent('doke:experience-state', {
      detail: Object.assign({ state: nextState, boundary: node }, detail || {})
    }));
    return nextState;
  }

  function getEntry(key) {
    return entries.get(String(key || '')) || null;
  }

  function invalidate(key) {
    var normalizedKey = String(key || '');
    if (!normalizedKey) return false;
    var entry = entries.get(normalizedKey);
    if (!entry) return false;
    entry.staleAt = 0;
    return true;
  }

  function invalidatePrefix(prefix) {
    var normalizedPrefix = String(prefix || '');
    if (!normalizedPrefix) return 0;
    var count = 0;
    entries.forEach(function (entry, key) {
      if (key.indexOf(normalizedPrefix) !== 0) return;
      entry.staleAt = 0;
      count += 1;
    });
    return count;
  }

  function write(key, data, options) {
    options = options || {};
    var normalizedKey = String(key || '');
    if (!normalizedKey) return null;
    var staleTime = Math.max(0, Number(options.staleTime) || 0);
    var entry = {
      key: normalizedKey,
      data: data,
      error: null,
      promise: null,
      updatedAt: now(),
      staleAt: now() + staleTime
    };
    entries.set(normalizedKey, entry);
    return entry;
  }

  function query(options) {
    options = options || {};
    var key = String(options.key || '');
    var fetcher = options.fetcher;
    if (!key) return Promise.reject(new Error('Experience cache key is required.'));
    if (typeof fetcher !== 'function') return Promise.reject(new Error('Experience cache fetcher is required.'));

    var staleTime = Math.max(0, Number(options.staleTime) || 0);
    var keepPreviousData = options.keepPreviousData !== false;
    var force = options.force === true;
    var entry = entries.get(key);
    var hasData = Boolean(entry && Object.prototype.hasOwnProperty.call(entry, 'data'));
    var fresh = hasData && !force && entry.staleAt > now();

    if (fresh) {
      return Promise.resolve({ data: entry.data, source: 'cache', stale: false, revalidate: null });
    }

    if (entry && entry.promise) {
      if (hasData && keepPreviousData) {
        return Promise.resolve({ data: entry.data, source: 'cache', stale: true, revalidate: entry.promise });
      }
      return entry.promise.then(function (data) {
        return { data: data, source: 'network', stale: false, revalidate: null };
      });
    }

    if (!entry) {
      entry = { key: key, data: undefined, error: null, promise: null, updatedAt: 0, staleAt: 0 };
      entries.set(key, entry);
    }

    entry.promise = Promise.resolve()
      .then(fetcher)
      .then(function (data) {
        entry.data = data;
        entry.error = null;
        entry.updatedAt = now();
        entry.staleAt = entry.updatedAt + staleTime;
        return data;
      })
      .catch(function (error) {
        entry.error = error;
        throw error;
      })
      .finally(function () {
        entry.promise = null;
      });

    if (hasData && keepPreviousData) {
      return Promise.resolve({ data: entry.data, source: 'cache', stale: true, revalidate: entry.promise });
    }

    return entry.promise.then(function (data) {
      return { data: data, source: 'network', stale: false, revalidate: null };
    });
  }

  function mutate(options) {
    options = options || {};
    var key = String(options.key || ('mutation:' + now()));
    if (activeMutations.has(key)) return activeMutations.get(key);
    if (typeof options.request !== 'function') return Promise.reject(new Error('Optimistic mutation request is required.'));

    var snapshot;
    try {
      snapshot = typeof options.apply === 'function' ? options.apply() : undefined;
    } catch (error) {
      return Promise.reject(error);
    }

    var boundary = resolveBoundary(options.boundary);
    setState(boundary, 'submitting', { mutationKey: key });

    var task = Promise.resolve()
      .then(options.request)
      .then(function (result) {
        if (typeof options.commit === 'function') options.commit(result, snapshot);
        setState(boundary, 'success', { mutationKey: key });
        return result;
      })
      .catch(function (error) {
        if (typeof options.rollback === 'function') options.rollback(snapshot, error);
        setState(boundary, 'error', { mutationKey: key, error: error && error.message ? error.message : String(error) });
        throw error;
      })
      .finally(function () {
        activeMutations.delete(key);
        if (boundary && boundary.dataset.experienceState !== 'error') {
          setState(boundary, options.finalState || 'ready', { mutationKey: key });
        }
      });

    activeMutations.set(key, task);
    return task;
  }

  function invalidatePageData(page) {
    var orchestrator = Doke.pageDataOrchestrator;
    if (!orchestrator) return false;
    if (typeof orchestrator.invalidatePageData === 'function') {
      orchestrator.invalidatePageData(page);
      return true;
    }
    if (typeof orchestrator.invalidate === 'function') {
      orchestrator.invalidate(page);
      return true;
    }
    return false;
  }

  function invalidateDomains(domainNames, options) {
    options = options || {};
    var domains = unique(normalizeList(domainNames));
    var cachePrefixes = normalizeList(options.cachePrefixes);
    var routes = normalizeList(options.routes);
    var pageData = normalizeList(options.pageData);

    domains.forEach(function (domainName) {
      var rule = DOMAIN_RULES[domainName];
      if (!rule) return;
      cachePrefixes = cachePrefixes.concat(rule.cachePrefixes || []);
      routes = routes.concat(rule.routes || []);
      pageData = pageData.concat(rule.pageData || []);
    });

    cachePrefixes = unique(cachePrefixes);
    routes = unique(routes);
    pageData = unique(pageData);

    var cacheEntries = 0;
    cachePrefixes.forEach(function (prefix) {
      cacheEntries += invalidatePrefix(prefix);
    });

    var invalidatedRoutes = [];
    if (Doke.stableShellRouter && typeof Doke.stableShellRouter.invalidate === 'function') {
      routes.forEach(function (route) {
        Doke.stableShellRouter.invalidate(route);
        invalidatedRoutes.push(route);
      });
    }

    var invalidatedPageData = [];
    pageData.forEach(function (page) {
      if (invalidatePageData(page)) invalidatedPageData.push(page);
    });

    var report = Object.freeze({
      domains: Object.freeze(domains.slice()),
      cachePrefixes: Object.freeze(cachePrefixes.slice()),
      routes: Object.freeze(invalidatedRoutes.slice()),
      pageData: Object.freeze(invalidatedPageData.slice()),
      cacheEntries: cacheEntries,
      reason: options.reason || '',
      sourceEvent: options.sourceEvent || ''
    });

    document.dispatchEvent(new CustomEvent('doke:domains-invalidated', { detail: report }));
    return report;
  }

  function invalidateEvent(eventName, detail) {
    var normalizedEvent = String(eventName || '');
    var domains = EVENT_DOMAIN_RULES[normalizedEvent] || [];
    return invalidateDomains(domains, {
      reason: detail && detail.reason ? detail.reason : normalizedEvent,
      sourceEvent: normalizedEvent
    });
  }

  function bindInvalidationEvents() {
    if (Doke.__experienceDomainInvalidationBound === RUNTIME_VERSION) return;
    Doke.__experienceDomainInvalidationBound = RUNTIME_VERSION;
    var handledEvents = typeof WeakSet === 'function' ? new WeakSet() : null;

    Object.keys(EVENT_DOMAIN_RULES).forEach(function (eventName) {
      var handler = function (event) {
        if (handledEvents && event && typeof event === 'object') {
          if (handledEvents.has(event)) return;
          handledEvents.add(event);
        }
        invalidateEvent(eventName, event && event.detail ? event.detail : {});
      };
      document.addEventListener(eventName, handler);
      window.addEventListener(eventName, handler);
    });
  }

  var invalidation = Object.freeze({
    domains: DOMAIN_RULES,
    events: EVENT_DOMAIN_RULES,
    invalidateDomains: invalidateDomains,
    invalidateEvent: invalidateEvent
  });

  Doke.experience = Object.freeze({
    version: RUNTIME_VERSION,
    states: Object.freeze({ set: setState, normalize: normalizeState }),
    cache: Object.freeze({ query: query, write: write, get: getEntry, invalidate: invalidate, invalidatePrefix: invalidatePrefix }),
    optimistic: Object.freeze({ mutate: mutate }),
    invalidation: invalidation
  });

  bindInvalidationEvents();
})();
