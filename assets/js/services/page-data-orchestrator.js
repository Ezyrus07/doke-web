(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

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

  function getPageData(pageName, context) {
    var page = normalizePageName(pageName);
    if (!Doke.repositoryBoundary || typeof Doke.repositoryBoundary.getPageData !== 'function') {
      return Promise.resolve({});
    }

    return Doke.repositoryBoundary.getPageData(page, context || {});
  }

  Doke.pageDataOrchestrator = Object.freeze({
    plans: PAGE_DATA_PLANS,
    normalizePageName: normalizePageName,
    getPagePlan: getPagePlan,
    getPageResources: getPageResources,
    getPageData: getPageData
  });
})();
