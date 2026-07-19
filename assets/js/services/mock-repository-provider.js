(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  var RESOURCE_ALIASES = Object.freeze({
    service: 'services',
    services: 'services',
    worker: 'workers',
    workers: 'workers',
    publication: 'publications',
    publications: 'publications',
    review: 'reviews',
    reviews: 'reviews',
    user: 'users',
    users: 'users',
    profile: 'users',
    profiles: 'users',
    currentProfile: 'users',
    currentUser: 'users',
    conversation: 'conversations',
    conversations: 'conversations',
    message: 'messages',
    messages: 'messages',
    order: 'orders',
    orders: 'orders',
    notification: 'notifications',
    notifications: 'notifications',
    community: 'communities',
    communities: 'communities',
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
    auditEvent: 'auditEvents',
    auditEvents: 'auditEvents'
  });

  function clone(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getResourceName(resourceName) {
    var normalized = normalizeText(resourceName);
    return RESOURCE_ALIASES[normalized] || normalized;
  }

  function loadResource(resourceName) {
    var resource = getResourceName(resourceName);
    if (!Doke.mockData || typeof Doke.mockData.load !== 'function') {
      return Promise.resolve([]);
    }

    return Doke.mockData.load(resource).then(function (payload) {
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.items)) return payload.items;
      if (payload && resource === 'wallet') return payload;
      return payload || [];
    });
  }

  function contains(value, query) {
    if (!query) return true;
    return normalizeText(value).indexOf(query) !== -1;
  }

  function matchesFilters(item, query) {
    query = query || {};
    if (!item || typeof item !== 'object') return true;

    var searchQuery = normalizeText(query.query || query.q || query.search);
    var city = normalizeText(query.city || query.cidade);
    var category = normalizeText(query.category || query.categoria);
    var status = normalizeText(query.status);
    var type = normalizeText(query.type || query.tipo);

    if (searchQuery) {
      var searchable = [
        item.title,
        item.name,
        item.category,
        item.description,
        item.city,
        item.state,
        item.status,
        Array.isArray(item.tags) ? item.tags.join(' ') : ''
      ].join(' ');
      if (!contains(searchable, searchQuery)) return false;
    }

    if (city && normalizeText(item.city) !== city) return false;
    if (category && normalizeText(item.category) !== category) return false;
    if (status && normalizeText(item.status) !== status) return false;
    if (type && normalizeText(item.type) !== type) return false;
    if (query.verified === true && item.verified !== true) return false;

    return true;
  }

  function list(resourceName, query) {
    query = query || {};
    var resource = getResourceName(resourceName);
    if (resource === 'services') {
      var servicesRepository = getServicesRepository();
      if (servicesRepository && typeof servicesRepository.list === 'function') return servicesRepository.list(query);
      return Promise.resolve([]);
    }

    if (resource === 'conversations') {
      var messagesRepository = getMessagesRepository();
      if (messagesRepository && typeof messagesRepository.list === 'function') return messagesRepository.list(query);
    }

    if (isWalletResource(resource)) return mockWalletList(resource, query);

    return loadResource(resourceName).then(function (payload) {
      if (!Array.isArray(payload)) return clone(payload);

      var items = payload.filter(function (item) { return matchesFilters(item, query); });
      var limit = Number(query.limit || query.take || 0);
      return clone(limit > 0 ? items.slice(0, limit) : items);
    });
  }

  function getById(resourceName, payload) {
    var id = payload && payload.id;
    if (!id) return Promise.resolve(null);

    if (getResourceName(resourceName) === 'services') {
      var servicesRepository = getServicesRepository();
      if (servicesRepository && typeof servicesRepository.getById === 'function') return servicesRepository.getById(id);
      return Promise.resolve(null);
    }

    if (getResourceName(resourceName) === 'conversations') {
      var messagesRepository = getMessagesRepository();
      if (messagesRepository && typeof messagesRepository.getById === 'function') return messagesRepository.getById(id);
    }

    return list(resourceName, {}).then(function (items) {
      if (!Array.isArray(items)) return null;
      return items.find(function (item) { return String(item.id) === String(id); }) || null;
    });
  }


  function getServicesRepository() {
    return Doke.repositories && Doke.repositories.services || null;
  }
  function getOrdersRepository() {
    return Doke.repositories && Doke.repositories.orders || null;
  }

  function getMessagesRepository() {
    return Doke.repositories && Doke.repositories.messages || null;
  }

  function getNotificationsRepository() {
    return Doke.repositories && Doke.repositories.notifications || null;
  }

  function getWalletRepository() {
    return Doke.repositories && Doke.repositories.wallet || null;
  }

  function isWalletResource(resource) {
    return [
      'walletSummary',
      'walletTransactions',
      'walletMonthlyDashboard',
      'walletMonthlyHistory',
      'walletReceivablesSchedule',
      'walletBankAccount',
      'receivables',
      'withdrawals',
      'disputes',
      'auditEvents'
    ].indexOf(resource) !== -1;
  }

  function mockWalletList(resource, query) {
    var repository = getWalletRepository();
    if (!repository) return Promise.resolve(resource === 'walletSummary' ? {} : []);
    query = query || {};

    if (resource === 'walletSummary') {
      var transactions = typeof repository.listTransactions === 'function' ? repository.listTransactions(query) : [];
      var summary = typeof repository.getSummary === 'function' ? repository.getSummary(query) : {};
      var dashboard = typeof repository.getMonthlyDashboard === 'function' ? repository.getMonthlyDashboard(query) : {};
      var schedule = typeof repository.getReceivablesSchedule === 'function' ? repository.getReceivablesSchedule(query) : null;
      var bankAccount = typeof repository.getBankAccount === 'function' ? repository.getBankAccount(query) : null;
      return Promise.resolve(clone({
        availableBalance: summary.available || 0,
        pendingBalance: summary.pending || 0,
        monthlyIncome: dashboard.netIncome || summary.income || 0,
        withdrawals: dashboard.withdrawals || summary.withdrawals || 0,
        fees: dashboard.fees || summary.fees || 0,
        monthlyDashboard: dashboard,
        transactions: transactions,
        receivablesSchedule: schedule,
        bankAccount: bankAccount
      }));
    }

    if (resource === 'walletTransactions') return Promise.resolve(clone(typeof repository.listTransactions === 'function' ? repository.listTransactions(query) : []));
    if (resource === 'walletMonthlyDashboard') return Promise.resolve(clone(typeof repository.getMonthlyDashboard === 'function' ? repository.getMonthlyDashboard(query) : {}));
    if (resource === 'walletMonthlyHistory') return Promise.resolve(clone(typeof repository.getMonthlyHistory === 'function' ? repository.getMonthlyHistory(query) : []));
    if (resource === 'walletReceivablesSchedule') return Promise.resolve(clone(typeof repository.getReceivablesSchedule === 'function' ? repository.getReceivablesSchedule(query) : {}));
    if (resource === 'walletBankAccount') return Promise.resolve(clone(typeof repository.getBankAccount === 'function' ? repository.getBankAccount(query) : null));
    if (resource === 'receivables') {
      var receivablesSchedule = typeof repository.getReceivablesSchedule === 'function' ? repository.getReceivablesSchedule(query) : { items: [] };
      return Promise.resolve(clone(receivablesSchedule && receivablesSchedule.items || []));
    }
    if (resource === 'withdrawals') return Promise.resolve(clone(typeof repository.listTransactions === 'function' ? repository.listTransactions(Object.assign({}, query, { type: 'withdraw' })) : []));
    if (resource === 'disputes') return Promise.resolve(clone(typeof repository.listDisputes === 'function' ? repository.listDisputes(query) : []));
    if (resource === 'auditEvents') return Promise.resolve(clone(typeof repository.listAuditEvents === 'function' ? repository.listAuditEvents(query) : []));

    return Promise.resolve([]);
  }

  function normalizeOrderPayload(payload) {
    var repository = getOrdersRepository();
    if (repository && typeof repository.normalize === 'function') return repository.normalize(payload || {});
    return clone(payload || {});
  }

  function mockOrderCreate(payload) {
    var repository = getOrdersRepository();
    if (!repository || typeof repository.save !== 'function') return unsupportedMutation('create', 'orders');
    return repository.save(normalizeOrderPayload(payload));
  }

  function mockOrderUpdate(payload) {
    var repository = getOrdersRepository();
    if (!repository || typeof repository.getById !== 'function' || typeof repository.save !== 'function') {
      return unsupportedMutation('update', 'orders');
    }

    var id = payload && (payload.id || payload.orderId);
    if (!id) return Promise.reject(new Error('Mock orders update requires an id.'));
    return repository.getById(id).then(function (order) {
      if (!order) throw new Error('Pedido não encontrado.');
      return repository.save(normalizeOrderPayload(Object.assign({}, order, payload || {})));
    });
  }

  function mockOrderRemove(payload) {
    var repository = getOrdersRepository();
    if (!repository || typeof repository.remove !== 'function') return unsupportedMutation('remove', 'orders');
    var id = payload && (payload.id || payload.orderId);
    if (!id) return Promise.reject(new Error('Mock orders remove requires an id.'));
    return repository.remove(id);
  }

  function mockConversationCreate(payload) {
    var repository = getMessagesRepository();
    if (!repository || typeof repository.createForOrder !== 'function') return unsupportedMutation('create', 'conversations');
    return repository.createForOrder(payload && payload.order || payload || {}, payload || {});
  }

  function mockConversationUpdate(payload) {
    var repository = getMessagesRepository();
    if (!repository || typeof repository.updateOrderContext !== 'function') return unsupportedMutation('update', 'conversations');
    return repository.updateOrderContext(payload && payload.order || payload || {}, payload || {});
  }

  function mockConversationMessage(payload) {
    var repository = getMessagesRepository();
    if (!repository || typeof repository.addMessage !== 'function') return unsupportedMutation('action', 'conversations');
    var conversationId = payload && (payload.conversationId || payload.id);
    if (!conversationId) return Promise.reject(new Error('Mock conversations sendMessage requires a conversationId.'));
    return repository.addMessage(conversationId, payload || {});
  }

  function mockConversationMarkRead(payload) {
    var repository = getMessagesRepository();
    if (!repository || typeof repository.markAsRead !== 'function') return unsupportedMutation('action', 'conversations');
    var conversationId = payload && (payload.conversationId || payload.id);
    if (!conversationId) return Promise.reject(new Error('Mock conversations markRead requires a conversationId.'));
    return repository.markAsRead(conversationId);
  }

  function mockConversationAction(payload) {
    var actionName = String(payload && payload.action || '').trim();
    if (actionName === 'createForOrder') return mockConversationCreate(payload || {});
    if (actionName === 'updateOrder') return mockConversationUpdate(payload || {});
    if (actionName === 'sendMessage') return mockConversationMessage(payload || {});
    if (actionName === 'markRead') return mockConversationMarkRead(payload || {});
    return unsupportedMutation('action', 'conversations');
  }

  function mockMessageCreate(payload) {
    return mockConversationMessage(payload || {});
  }

  function mockMessageAction(payload) {
    var actionName = String(payload && payload.action || '').trim();
    if (actionName === 'send') return mockConversationMessage(payload || {});
    if (actionName === 'markRead') return mockConversationMarkRead(payload || {});
    return unsupportedMutation('action', 'messages');
  }


  function mockWalletCreate(resource, payload) {
    var repository = getWalletRepository();
    if (!repository) return unsupportedMutation('create', resource);
    if (resource === 'receivables' && typeof repository.registerReceivable === 'function') return repository.registerReceivable(payload || {});
    if (resource === 'withdrawals' && typeof repository.requestWithdraw === 'function') return repository.requestWithdraw(payload || {});
    if (resource === 'disputes' && typeof repository.openDispute === 'function') return repository.openDispute(payload || {});
    return unsupportedMutation('create', resource);
  }

  function mockWalletAction(resource, payload) {
    var repository = getWalletRepository();
    var actionName = String(payload && payload.action || '').trim();
    if (!repository) return unsupportedMutation('action', resource);

    if (resource === 'walletSummary' && actionName === 'saveBankAccount' && typeof repository.saveBankAccount === 'function') {
      return repository.saveBankAccount(payload || {});
    }

    if (resource === 'disputes') {
      if (actionName === 'respond' && typeof repository.respondDispute === 'function') return repository.respondDispute(payload || {});
      if ((actionName === 'release' || actionName === 'refund') && typeof repository.resolveDispute === 'function') {
        return repository.resolveDispute(Object.assign({}, payload || {}, {
          disputeId: payload && (payload.disputeId || payload.id) || '',
          resolution: actionName === 'refund' ? 'client_refund' : 'professional_release'
        }));
      }
    }

    if (resource === 'withdrawals' && typeof repository.resolveWithdraw === 'function') {
      if (actionName === 'approve') return repository.resolveWithdraw(Object.assign({}, payload || {}, { transactionId: payload && (payload.transactionId || payload.id) || '', action: 'approved' }));
      if (actionName === 'decline') return repository.resolveWithdraw(Object.assign({}, payload || {}, { transactionId: payload && (payload.transactionId || payload.id) || '', action: 'declined' }));
    }

    return unsupportedMutation('action', resource);
  }

  function mockNotificationCreate(payload) {
    var repository = getNotificationsRepository();
    if (!repository || typeof repository.create !== 'function') return unsupportedMutation('create', 'notifications');
    return repository.create(payload || {});
  }

  function mockNotificationUpdate(payload) {
    var repository = getNotificationsRepository();
    if (!repository || typeof repository.update !== 'function') return unsupportedMutation('update', 'notifications');
    var id = payload && (payload.id || payload.notificationId);
    if (!id) return Promise.reject(new Error('Mock notifications update requires an id.'));
    return repository.update(id, payload || {});
  }

  function mockNotificationAction(payload) {
    var repository = getNotificationsRepository();
    var actionName = String(payload && payload.action || '').trim();
    var id = payload && (payload.id || payload.notificationId);
    if (!repository) return unsupportedMutation('action', 'notifications');
    if (actionName === 'read') {
      if (!id) return Promise.reject(new Error('Mock notifications read requires an id.'));
      if (typeof repository.markAsRead !== 'function') return unsupportedMutation('action', 'notifications');
      return repository.markAsRead(id);
    }
    if (actionName === 'dismiss') {
      if (!id) return Promise.reject(new Error('Mock notifications dismiss requires an id.'));
      if (typeof repository.dismiss !== 'function') return unsupportedMutation('action', 'notifications');
      return repository.dismiss(id);
    }
    if (actionName === 'readAll') {
      if (typeof repository.markAllAsRead !== 'function') return unsupportedMutation('action', 'notifications');
      return repository.markAllAsRead(payload || {});
    }
    return unsupportedMutation('action', 'notifications');
  }

  function mockOrderAction(payload) {
    var actionName = String(payload && payload.action || '').trim();
    var statusByAction = {
      accept: 'accepted',
      decline: 'cancelled',
      quote: 'quoted',
      start: 'in_progress',
      complete: 'completed',
      updateStatus: payload && payload.status || '',
      transition: payload && payload.status || ''
    };
    var status = statusByAction[actionName];
    if (!status) return unsupportedMutation('action', 'orders');
    return mockOrderUpdate(Object.assign({}, payload || {}, { status: status }));
  }

  function getPageData(pageName, context) {
    var page = normalizeText(pageName).replace(/\.html$/, '');
    context = context || {};

    switch (page) {
      case 'index':
        return Promise.all([
          list('services', { verified: true, limit: context.serviceLimit || 6 }),
          list('workers', { limit: context.workerLimit || 6 }),
          list('publications', { limit: context.publicationLimit || 6 })
        ]).then(function (values) {
          return { services: values[0], workers: values[1], publications: values[2] };
        });
      case 'resultados':
        return list('services', context.filters || context).then(function (services) {
          return { services: services };
        });
      case 'detalhe-anuncio':
        return Promise.all([
          getById('services', { id: context.serviceId }),
          list('workers', { limit: 20 }),
          list('publications', { limit: 20 }),
          list('reviews', { limit: 20 })
        ]).then(function (values) {
          var serviceId = String(context.serviceId || '');
          function related(items) {
            return (Array.isArray(items) ? items : []).filter(function (item) {
              return String(item && (item.serviceId || item.service_id || item.listingId || item.adId) || '') === serviceId;
            }).slice(0, 4);
          }
          return { service: values[0], workers: related(values[1]), publications: related(values[2]), reviews: related(values[3]) };
        });
      case 'pedidos':
        return list('orders', context.filters || context).then(function (orders) {
          var items = Array.isArray(orders) ? orders : [];
          var summary = items.reduce(function (acc, order) {
            var status = normalizeText(order.status);
            acc.total += 1;
            if (status === 'pending') acc.pending += 1;
            if (status === 'conversation') acc.conversation += 1;
            if (status === 'completed') acc.completed += 1;
            if (order.requiresAction === true) acc.action += 1;
            return acc;
          }, { total: 0, pending: 0, conversation: 0, completed: 0, action: 0 });

          return { orders: items, summary: summary };
        });
      default:
        return Promise.resolve({});
    }
  }


  function unsupportedMutation(methodName, resourceName) {
    return Promise.reject(new Error('Mock repository provider does not implement ' + methodName + '() for "' + getResourceName(resourceName) + '". Use the domain repository/service that owns localStorage writes until the API adapter migration reaches this resource.'));
  }

  function create(resourceName, payload) {
    var resource = getResourceName(resourceName);
    if (resource === 'orders') return mockOrderCreate(payload || {});
    if (resource === 'conversations') return mockConversationCreate(payload || {});
    if (resource === 'messages') return mockMessageCreate(payload || {});
    if (resource === 'notifications') return mockNotificationCreate(payload || {});
    if (isWalletResource(resource)) return mockWalletCreate(resource, payload || {});
    return unsupportedMutation('create', resourceName, payload);
  }

  function update(resourceName, payload) {
    if (getResourceName(resourceName) === 'orders') return mockOrderUpdate(payload || {});
    if (getResourceName(resourceName) === 'conversations') return mockConversationUpdate(payload || {});
    if (getResourceName(resourceName) === 'notifications') return mockNotificationUpdate(payload || {});
    return unsupportedMutation('update', resourceName, payload);
  }

  function remove(resourceName, payload) {
    if (getResourceName(resourceName) === 'orders') return mockOrderRemove(payload || {});
    return unsupportedMutation('remove', resourceName, payload);
  }

  function action(resourceName, payload) {
    var resource = getResourceName(resourceName);
    if (resource === 'orders') return mockOrderAction(payload || {});
    if (resource === 'conversations') return mockConversationAction(payload || {});
    if (resource === 'messages') return mockMessageAction(payload || {});
    if (resource === 'notifications') return mockNotificationAction(payload || {});
    if (isWalletResource(resource)) return mockWalletAction(resource, payload || {});
    return unsupportedMutation('action', resourceName, payload);
  }

  var provider = Object.freeze({
    name: 'mock',
    list: list,
    getById: getById,
    create: create,
    update: update,
    remove: remove,
    action: action,
    getPageData: getPageData
  });

  Doke.mockRepositoryProvider = provider;

  if (Doke.repositoryBoundary && typeof Doke.repositoryBoundary.registerProvider === 'function') {
    Doke.repositoryBoundary.registerProvider('mock', provider);
  }
})();
