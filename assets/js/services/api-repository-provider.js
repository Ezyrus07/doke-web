(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  var RESOURCE_ENDPOINTS = Object.freeze({
    users: '/users',
    professionals: '/professionals',
    services: '/services',
    orders: '/orders',
    conversations: '/conversations',
    messages: '/messages',
    payments: '/payments',
    walletTransactions: '/wallet/transactions',
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
    wallet: 'walletTransactions',
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
    orders: Object.freeze({
      accept: '/orders/:id/accept',
      charge: '/orders/:id/charge',
      complete: '/orders/:id/complete'
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
      read: '/notifications/:id/read'
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

  function assertClient(client) {
    if (!client || typeof client.get !== 'function' || typeof client.post !== 'function') {
      throw new Error('API repository provider requires an injected client with get() and post().');
    }
  }

  function createApiRepositoryProvider(options) {
    options = options || {};
    var client = options.client || Doke.apiClient || null;

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
          list('walletTransactions', context),
          list('receivables', context),
          list('withdrawals', context)
        ]).then(function (values) {
          return { transactions: values[0], receivables: values[1], withdrawals: values[2] };
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
