(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PAGE_DATA_CACHE_MAX_AGE = 5 * 60 * 1000;
  var pageDataCache = new Map();
  var pageDataRequests = new Map();

  var PAGE_DATA_PLANS = Object.freeze({
    index: Object.freeze({
      status: 'stable-reference',
      resources: ['services', 'workers', 'publications'],
      controller: 'index-controller',
      strategy: 'render marketplace sections from repository data while preserving home visual contract'
    }),
    resultados: Object.freeze({
      status: 'marketplace-evolving',
      resources: ['services'],
      controller: 'resultados-controller',
      strategy: 'render search results from filters without coupling card markup to mock content'
    }),
    perfil: Object.freeze({
      status: 'critical-stable-baseline',
      resources: ['users', 'services', 'workers', 'publications', 'reviews'],
      controller: 'perfil-controller',
      strategy: 'keep owner/visitor/client modes data-driven without changing approved visual baseline'
    }),
    'detalhe-anuncio': Object.freeze({
      status: 'evolving',
      resources: ['services', 'workers', 'publications', 'reviews'],
      controller: 'detalhe-anuncio',
      strategy: 'hydrate ad detail sections from a service id and related marketplace resources'
    }),
    pedidos: Object.freeze({
      status: 'operational',
      resources: ['orders', 'services', 'users'],
      controller: 'pedidos-controller',
      strategy: 'separate order state/rendering from static dashboard examples'
    }),
    carteira: Object.freeze({
      status: 'evolving',
      resources: ['wallet', 'orders'],
      controller: 'wallet-controller',
      strategy: 'prepare balances, transactions and payout summaries for repository data'
    }),
    notificacoes: Object.freeze({
      status: 'operational',
      resources: ['notifications'],
      controller: 'notificacoes-controller',
      strategy: 'render notification lists with read/unread and empty/loading/error states'
    }),
    configuracoes: Object.freeze({
      status: 'evolving',
      resources: ['users', 'settings'],
      controller: 'configuracoes-controller',
      strategy: 'keep account/preferences data separate from form layout'
    }),
    comunidade: Object.freeze({
      status: 'community',
      resources: ['communities', 'users'],
      controller: 'comunidade-controller',
      strategy: 'render community discovery from repository data and preserve card contracts'
    }),
    mensagens: Object.freeze({
      status: 'complex-communication',
      resources: ['conversations', 'messages', 'users'],
      controller: 'mensagens-controller',
      strategy: 'separate conversation state from workspace UI and message renderer'
    }),
    pagamento: Object.freeze({
      status: 'evolving',
      resources: ['wallet', 'paymentMethods', 'orders'],
      controller: 'pagamento',
      strategy: 'prepare payment summaries and method selection for future backend data'
    }),
    'finalizar-pedido': Object.freeze({
      status: 'evolving',
      resources: ['orders', 'services', 'budgets'],
      controller: 'finalizar-pedido',
      strategy: 'keep checkout/order review data separate from provisional page layout'
    }),
    'adicionar-cartao': Object.freeze({
      status: 'evolving',
      resources: ['paymentMethods', 'wallet'],
      controller: 'adicionar-cartao',
      strategy: 'prepare card form state and payment method persistence boundary'
    }),
    login: Object.freeze({
      status: 'auth',
      resources: ['session'],
      controller: 'login-controller',
      strategy: 'keep authentication state outside visual form contracts'
    }),
    cadastro: Object.freeze({
      status: 'auth',
      resources: ['session', 'users'],
      controller: 'auth',
      strategy: 'keep signup data outside visual form contracts'
    }),
    'esqueci-senha': Object.freeze({
      status: 'auth',
      resources: ['session'],
      controller: 'auth',
      strategy: 'keep password recovery data outside visual form contracts'
    })
  });

  function clone(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function normalizePageName(pageName) {
    return String(pageName || '')
      .replace(/\\/g, '/')
      .split('/')
      .pop()
      .replace(/\.html$/i, '')
      .trim();
  }

  function getPagePlan(pageName) {
    var page = normalizePageName(pageName);
    return clone(PAGE_DATA_PLANS[page] || {
      status: 'unmapped',
      resources: [],
      controller: null,
      strategy: 'map this page before wiring dynamic data'
    });
  }

  function getPageResources(pageName) {
    var plan = getPagePlan(pageName);
    return plan.resources || [];
  }

  function stableSerialize(value) {
    if (!value || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stableSerialize).join(',') + ']';
    return '{' + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ':' + stableSerialize(value[key]);
    }).join(',') + '}';
  }

  function getCacheKey(page, context) {
    return page + ':' + stableSerialize(context || {});
  }

  function dispatchDataEvent(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail }));
  }

  function requestPageData(page, context, key, source) {
    if (pageDataRequests.has(key)) return pageDataRequests.get(key);
    var request = Promise.resolve(Doke.repositoryBoundary.getPageData(page, context || {}))
      .then(function (payload) {
        var value = clone(payload || {});
        pageDataCache.set(key, { value: value, storedAt: Date.now() });
        dispatchDataEvent('doke:page-data-revalidated', {
          page: page,
          context: clone(context || {}),
          data: clone(value),
          source: source || 'repository'
        });
        return clone(value);
      })
      .catch(function (error) {
        dispatchDataEvent('doke:page-data-revalidation-error', {
          page: page,
          context: clone(context || {}),
          error: error
        });
        throw error;
      })
      .finally(function () {
        pageDataRequests.delete(key);
      });
    pageDataRequests.set(key, request);
    return request;
  }

  function getPageData(pageName, context, options) {
    var page = normalizePageName(pageName);
    var normalizedContext = clone(context || {});
    var policy = options || {};
    var maxAge = Math.max(0, Number(policy.maxAge));
    if (!Number.isFinite(maxAge) || maxAge <= 0) maxAge = PAGE_DATA_CACHE_MAX_AGE;
    if (!Doke.repositoryBoundary || typeof Doke.repositoryBoundary.getPageData !== 'function') {
      return Promise.resolve({});
    }

    var key = getCacheKey(page, normalizedContext);
    var cached = pageDataCache.get(key);
    var cacheIsValid = cached && Date.now() - cached.storedAt <= maxAge;
    if (cacheIsValid && policy.cache !== 'reload') {
      dispatchDataEvent('doke:page-data-cache-hit', {
        page: page,
        context: clone(normalizedContext),
        age: Date.now() - cached.storedAt
      });
      requestPageData(page, normalizedContext, key, 'stale-while-revalidate').catch(function () {});
      return Promise.resolve(clone(cached.value));
    }

    if (cached) pageDataCache.delete(key);
    return requestPageData(page, normalizedContext, key, 'repository');
  }

  function peekPageData(pageName, context) {
    var page = normalizePageName(pageName);
    var cached = pageDataCache.get(getCacheKey(page, context || {}));
    if (!cached || Date.now() - cached.storedAt > PAGE_DATA_CACHE_MAX_AGE) return null;
    return clone(cached.value);
  }

  function invalidatePageData(pageName, context) {
    var page = normalizePageName(pageName);
    if (context) return pageDataCache.delete(getCacheKey(page, context));
    Array.from(pageDataCache.keys()).forEach(function (key) {
      if (key.indexOf(page + ':') === 0) pageDataCache.delete(key);
    });
    return true;
  }

  Doke.pageDataOrchestrator = Object.freeze({
    plans: PAGE_DATA_PLANS,
    normalizePageName: normalizePageName,
    getPagePlan: getPagePlan,
    getPageResources: getPageResources,
    getPageData: getPageData,
    peekPageData: peekPageData,
    invalidatePageData: invalidatePageData
  });
})();
