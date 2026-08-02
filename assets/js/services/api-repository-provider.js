(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  var RESOURCE_ENDPOINTS = Object.freeze({
    users: '/users',
    currentUser: '/users/me',
    profiles: '/profiles',
    currentProfile: '/profiles/me',
    professionals: '/professionals',
    services: '/services',
    orders: '/orders',
    conversations: '/conversations',
    messages: '/messages',
    payments: '/payments',
    walletSummary: '/wallet',
    walletTransactions: '/wallet/transactions',
    walletMonthlyDashboard: '/wallet/dashboard',
    walletMonthlyHistory: '/wallet/monthly-history',
    walletReceivablesSchedule: '/wallet/receivables/schedule',
    walletBankAccount: '/wallet/bank-account',
    receivables: '/wallet/receivables',
    withdrawals: '/withdrawals',
    disputes: '/disputes',
    notifications: '/notifications',
    receipts: '/receipts',
    auditEvents: '/admin/audit-events'
  });

  var RESOURCE_ALIASES = Object.freeze({
    user: 'users',
    users: 'users',
    currentUser: 'currentUser',
    me: 'currentUser',
    profile: 'profiles',
    profiles: 'profiles',
    currentProfile: 'currentProfile',
    myProfile: 'currentProfile',
    professional: 'professionals',
    professionals: 'professionals',
    service: 'services',
    services: 'services',
    order: 'orders',
    orders: 'orders',
    conversation: 'conversations',
    conversations: 'conversations',
    message: 'messages',
    messages: 'messages',
    payment: 'payments',
    payments: 'payments',
    wallet: 'walletSummary',
    walletSummary: 'walletSummary',
    walletDashboard: 'walletMonthlyDashboard',
    walletMonthlyDashboard: 'walletMonthlyDashboard',
    walletMonthlyHistory: 'walletMonthlyHistory',
    walletReceivablesSchedule: 'walletReceivablesSchedule',
    walletBankAccount: 'walletBankAccount',
    bankAccount: 'walletBankAccount',
    bankAccounts: 'walletBankAccount',
    walletTransaction: 'walletTransactions',
    walletTransactions: 'walletTransactions',
    transaction: 'walletTransactions',
    transactions: 'walletTransactions',
    receivable: 'receivables',
    receivables: 'receivables',
    withdrawal: 'withdrawals',
    withdrawals: 'withdrawals',
    dispute: 'disputes',
    disputes: 'disputes',
    notification: 'notifications',
    notifications: 'notifications',
    receipt: 'receipts',
    receipts: 'receipts',
    auditEvent: 'auditEvents',
    auditEvents: 'auditEvents'
  });

  var ACTION_ENDPOINTS = Object.freeze({
    conversations: Object.freeze({
      createForOrder: '/orders/:id/conversation',
      updateOrder: '/conversations/:id/order',
      sendMessage: '/conversations/:id/messages',
      removeMessage: '/conversations/:id/messages/remove',
      markRead: '/conversations/:id/read'
    }),
    messages: Object.freeze({
      send: '/conversations/:id/messages',
      markRead: '/messages/:id/read'
    }),
    orders: Object.freeze({
      accept: '/orders/:id/accept',
      decline: '/orders/:id/decline',
      quote: '/orders/:id/quote',
      charge: '/orders/:id/charge',
      start: '/orders/:id/start',
      requestCompletion: '/orders/:id/completion-request',
      complete: '/orders/:id/complete',
      updateStatus: '/orders/:id/status',
      transition: '/orders/:id/status'
    }),
    payments: Object.freeze({
      confirm: '/payments/:id/confirm',
      requestCompletion: '/payments/:id/completion-request',
      release: '/payments/:id/release'
    }),
    receivables: Object.freeze({
      release: '/wallet/receivables/:id/release'
    }),
    walletSummary: Object.freeze({
      saveBankAccount: '/wallet/bank-account'
    }),
    disputes: Object.freeze({
      respond: '/disputes/:id/respond',
      release: '/admin/disputes/:id/release',
      refund: '/admin/disputes/:id/refund'
    }),
    withdrawals: Object.freeze({
      approve: '/withdrawals/:id/approve',
      decline: '/withdrawals/:id/decline'
    }),
    notifications: Object.freeze({
      read: '/notifications/:id/read',
      dismiss: '/notifications/:id/dismiss',
      readAll: '/notifications/read-all'
    }),
    users: Object.freeze({
      updateMe: '/users/me'
    }),
    profiles: Object.freeze({
      updateMe: '/profiles/me',
      publish: '/profiles/:id/publish'
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

  function normalizeResourceName(resourceName) {
    var name = String(resourceName || '').trim();
    return RESOURCE_ALIASES[name] || RESOURCE_ALIASES[name.charAt(0).toLowerCase() + name.slice(1)] || name;
  }

  function getEndpoint(resourceName) {
    var resource = normalizeResourceName(resourceName);
    var endpoint = RESOURCE_ENDPOINTS[resource];
    if (!endpoint) throw new Error('API resource endpoint is not mapped: ' + resourceName);
    return { resource: resource, endpoint: endpoint };
  }

  function getId(payload) {
    return encodeURIComponent(String(payload && (payload.id || payload.orderId || payload.transactionId) || '').trim());
  }

  function appendQuery(path, query) {
    var keys = Object.keys(query || {}).filter(function (key) {
      return query[key] !== undefined && query[key] !== null && query[key] !== '';
    });

    if (!keys.length) return path;

    var params = keys.map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(String(query[key]));
    }).join('&');

    return path + (path.indexOf('?') >= 0 ? '&' : '?') + params;
  }


  function normalizeBaseUrl(value) {
    return String(value || '').trim().replace(/\/$/, '');
  }

  function getRuntimeConfig() {
    return Doke.runtimeConfig && typeof Doke.runtimeConfig === 'object'
      ? Doke.runtimeConfig
      : {};
  }

  function isNetworkEnabled() {
    var config = getRuntimeConfig();
    var flags = config.flags && typeof config.flags === 'object' ? config.flags : {};
    return flags.enableNetworkRequests === true;
  }

  function getApiBaseUrl() {
    var config = getRuntimeConfig();
    return normalizeBaseUrl(config.apiBaseUrl || '');
  }

  function createRuntimeApiClient() {
    function request(method, path, body) {
      var baseUrl = getApiBaseUrl();
      if (!baseUrl) return Promise.reject(new Error('API provider blocked: apiBaseUrl is not configured.'));
      if (!isNetworkEnabled()) return Promise.reject(new Error('API provider blocked: enableNetworkRequests is disabled.'));
      if (typeof window.fetch !== 'function') return Promise.reject(new Error('API provider requires window.fetch.'));

      var options = {
        method: method,
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      };

      if (body !== undefined) options.body = JSON.stringify(body);

      return window.fetch(baseUrl + path, options).then(function (response) {
        if (!response.ok) throw new Error('API request failed: ' + response.status);
        return response.status === 204 ? null : response.json();
      });
    }

    return Object.freeze({
      get: function (path) { return request('GET', path); },
      post: function (path, body) { return request('POST', path, body); },
      put: function (path, body) { return request('PUT', path, body); },
      patch: function (path, body) { return request('PATCH', path, body); },
      remove: function (path) { return request('DELETE', path); }
    });
  }

  function assertClient(client) {
    if (!client || typeof client.get !== 'function' || typeof client.post !== 'function') {
      throw new Error('API repository provider requires an injected client with get() and post().');
    }
  }

  function createApiRepositoryProvider(options) {
    options = options || {};
    var client = options.client || Doke.apiClient || createRuntimeApiClient();

    function list(resourceName, query) {
      assertClient(client);
      return Promise.resolve(client.get(appendQuery(getEndpoint(resourceName).endpoint, query || {}))).then(clone);
    }

    function getById(resourceName, payload) {
      assertClient(client);
      var id = getId(payload);
      if (!id) return Promise.resolve(null);
      return Promise.resolve(client.get(getEndpoint(resourceName).endpoint + '/' + id)).then(clone);
    }

    function create(resourceName, payload) {
      assertClient(client);
      return Promise.resolve(client.post(getEndpoint(resourceName).endpoint, clone(payload || {}))).then(clone);
    }

    function update(resourceName, payload) {
      assertClient(client);
      var id = getId(payload);
      if (!id) return Promise.reject(new Error('API update requires an id.'));
      var method = typeof client.patch === 'function' ? client.patch : client.put;
      if (typeof method !== 'function') throw new Error('API client must implement patch() or put().');
      return Promise.resolve(method.call(client, getEndpoint(resourceName).endpoint + '/' + id, clone(payload || {}))).then(clone);
    }

    function remove(resourceName, payload) {
      assertClient(client);
      var id = getId(payload);
      if (!id) return Promise.reject(new Error('API remove requires an id.'));
      var method = client.remove || client.delete;
      if (typeof method !== 'function') throw new Error('API client must implement remove() or delete().');
      return Promise.resolve(method.call(client, getEndpoint(resourceName).endpoint + '/' + id)).then(clone);
    }

    function action(resourceName, payload) {
      assertClient(client);
      var resourceInfo = getEndpoint(resourceName);
      var actionName = String(payload && payload.action || '').trim();
      var id = getId(payload);
      var actionMap = ACTION_ENDPOINTS[resourceInfo.resource] || {};
      var template = actionMap[actionName];

      if (!actionName) return Promise.reject(new Error('API action requires an action name.'));
      if (!template) return Promise.reject(new Error('API action is not mapped: ' + resourceInfo.resource + '.' + actionName));
      if (template.indexOf(':id') >= 0 && !id) return Promise.reject(new Error('API action requires an id.'));

      var path = template.replace(':id', id);
      return Promise.resolve(client.post(path, clone(payload || {}))).then(clone);
    }

    function getPageData(pageName, context) {
      context = context || {};
      var page = String(pageName || '').replace(/\.html$/, '');

      if (page === 'pedidos') {
        return list('orders', context.filters || context).then(function (orders) { return { orders: orders }; });
      }

      if (page === 'carteira') {
        return Promise.all([
          list('walletSummary', context),
          list('walletTransactions', context),
          list('walletReceivablesSchedule', context),
          list('withdrawals', context)
        ]).then(function (values) {
          return { wallet: values[0], transactions: values[1], receivablesSchedule: values[2], withdrawals: values[3] };
        });
      }

      if (page === 'mensagens') {
        return list('conversations', context).then(function (conversations) { return { conversations: conversations }; });
      }

      if (page === 'notificacoes') {
        return list('notifications', context).then(function (notifications) { return { notifications: notifications }; });
      }

      return Promise.resolve({});
    }

    return Object.freeze({
      name: 'api',
      list: list,
      getById: getById,
      create: create,
      update: update,
      remove: remove,
      action: action,
      getPageData: getPageData
    });
  }

  Doke.createApiRepositoryProvider = createApiRepositoryProvider;
  Doke.apiRepositoryProviderContract = Object.freeze({
    resources: RESOURCE_ENDPOINTS,
    actions: ACTION_ENDPOINTS
  });

  if (Doke.repositoryBoundary && typeof Doke.repositoryBoundary.registerProvider === 'function') {
    Doke.repositoryBoundary.registerProvider('api', createApiRepositoryProvider());
  }
})();
