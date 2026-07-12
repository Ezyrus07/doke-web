/* Doke Orders Service
   Responsibility: business rules for creating and reading marketplace orders. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var services = Doke.services || (Doke.services = {});

  var ORDERS_WRITE_CANARY_KEYS = Object.freeze({
    enabled: 'doke.canary.ordersWrite.enabled',
    backup: 'doke.canary.ordersWrite.backup.v1',
    ordersProvider: 'doke.ordersProvider',
    orderWriteActivation: 'doke.orderWriteActivation',
    apiBaseUrl: 'doke.apiBaseUrl',
    ordersApiBaseUrl: 'doke.canary.ordersWrite.apiBaseUrl',
    dataProvider: 'doke.dataProvider',
    network: 'doke.flag.enableNetworkRequests',
    marker: 'doke.canary.ordersWrite.targetMarker'
  });
  var ORDERS_WRITE_CANARY_PROVIDER = 'api-write-canary-frontend-activation';
  var ORDERS_WRITE_ALLOWED_ACTIONS = Object.freeze({
    accept: '/orders/:id/accept',
    decline: '/orders/:id/decline',
    quote: '/orders/:id/quote',
    charge: '/orders/:id/charge',
    start: '/orders/:id/start',
    complete: '/orders/:id/complete',
    updateStatus: '/orders/:id/status',
    transition: '/orders/:id/status'
  });

  function readStorage(key) {
    try { return root.localStorage.getItem(key); }
    catch (error) { return null; }
  }

  function writeStorageValue(key, value) {
    try {
      if (value === null || value === undefined) root.localStorage.removeItem(key);
      else root.localStorage.setItem(key, String(value));
    } catch (error) {
      // Storage can be unavailable in constrained browser modes. Status calls will remain blocked.
    }
  }

  function readQueryParam(key) {
    try { return new URLSearchParams(root.location.search || '').get(key); }
    catch (error) { return null; }
  }

  function normalizeBoolean(value) {
    if (value === true || value === 'true' || value === '1' || value === 'on') return true;
    if (value === false || value === 'false' || value === '0' || value === 'off') return false;
    return undefined;
  }

  function normalizeBaseUrl(value) {
    return String(value || '').trim().replace(/\/$/, '');
  }

  function normalizeMarker(value) {
    var marker = String(value || '').trim().toLowerCase();
    return ['local', 'staging'].indexOf(marker) !== -1 ? marker : '';
  }

  function getRuntimeConfig() {
    return Doke.runtimeConfig && typeof Doke.runtimeConfig === 'object' ? Doke.runtimeConfig : {};
  }

  function getRuntimeFlags() {
    var config = getRuntimeConfig();
    return config.flags && typeof config.flags === 'object' ? config.flags : {};
  }

  function readOrdersWriteCanaryFlag(config) {
    var paramsValue = readQueryParam('dokeOrdersWriteCanary');
    if (paramsValue !== null) return normalizeBoolean(paramsValue) === true;
    if (config.ordersWriteCanary === true || (config.canary && config.canary.ordersWrite === true)) return true;
    return normalizeBoolean(readStorage(ORDERS_WRITE_CANARY_KEYS.enabled)) === true;
  }

  function readOrderWriteActivation(config) {
    var paramsValue = readQueryParam('dokeOrderWriteActivation');
    if (paramsValue !== null) return normalizeBoolean(paramsValue) === true;
    if (config.orderWriteActivation === true || (config.canary && config.canary.orderWriteActivation === true)) return true;
    return normalizeBoolean(readStorage(ORDERS_WRITE_CANARY_KEYS.orderWriteActivation)) === true;
  }

  function readOrdersProvider(config) {
    var paramsValue = readQueryParam('dokeOrdersProvider');
    if (paramsValue !== null) return String(paramsValue || '').trim().toLowerCase();
    return String(config.ordersProvider || (config.canary && config.canary.ordersProvider) || readStorage(ORDERS_WRITE_CANARY_KEYS.ordersProvider) || 'mock').trim().toLowerCase();
  }

  function readOrdersApiBaseUrl(config) {
    return normalizeBaseUrl(
      readQueryParam('dokeOrdersWriteApiBaseUrl') ||
      readStorage(ORDERS_WRITE_CANARY_KEYS.ordersApiBaseUrl) ||
      config.apiBaseUrl ||
      readStorage(ORDERS_WRITE_CANARY_KEYS.apiBaseUrl) ||
      ''
    );
  }

  function readNetworkEnabled(config) {
    var paramsValue = readQueryParam('dokeEnableNetwork');
    if (paramsValue !== null) return normalizeBoolean(paramsValue) === true;
    var flags = config.flags && typeof config.flags === 'object' ? config.flags : {};
    if (flags.enableNetworkRequests === true) return true;
    return normalizeBoolean(readStorage(ORDERS_WRITE_CANARY_KEYS.network)) === true;
  }

  function getStoredOrdersWriteMarker() {
    return normalizeMarker(readQueryParam('dokeOrdersWriteCanaryMarker') || readStorage(ORDERS_WRITE_CANARY_KEYS.marker));
  }

  function describeOrdersCanaryTarget(value) {
    try {
      var url = new URL(value);
      return {
        protocol: url.protocol,
        host: url.host,
        pathname: url.pathname,
        label: url.protocol + ' ' + url.host + url.pathname
      };
    } catch (error) {
      return { protocol: '', host: '', pathname: '', label: '' };
    }
  }

  function isSafeOrdersCanaryTarget(value, marker) {
    var description = describeOrdersCanaryTarget(value);
    var host = String(description.host || '').toLowerCase();
    var path = String(description.pathname || '').toLowerCase();
    var explicitMarker = normalizeMarker(marker);
    var safeByHost = /localhost|127\.0\.0\.1|staging|stage|stg|preview|local/.test(host);
    var safeByPath = /staging|stage|stg|preview|local/.test(path);
    if (!description.host || description.protocol !== 'https:' && !/^localhost|127\.0\.0\.1/.test(host)) return false;
    if (safeByHost || safeByPath) return true;
    return explicitMarker === 'local' || explicitMarker === 'staging';
  }

  function createOrdersWriteCanaryBackup() {
    return {
      createdAt: new Date().toISOString(),
      values: {
        'doke.canary.ordersWrite.enabled': readStorage(ORDERS_WRITE_CANARY_KEYS.enabled),
        'doke.ordersProvider': readStorage(ORDERS_WRITE_CANARY_KEYS.ordersProvider),
        'doke.orderWriteActivation': readStorage(ORDERS_WRITE_CANARY_KEYS.orderWriteActivation),
        'doke.apiBaseUrl': readStorage(ORDERS_WRITE_CANARY_KEYS.apiBaseUrl),
        'doke.canary.ordersWrite.apiBaseUrl': readStorage(ORDERS_WRITE_CANARY_KEYS.ordersApiBaseUrl),
        'doke.dataProvider': readStorage(ORDERS_WRITE_CANARY_KEYS.dataProvider),
        'doke.flag.enableNetworkRequests': readStorage(ORDERS_WRITE_CANARY_KEYS.network),
        'doke.canary.ordersWrite.targetMarker': readStorage(ORDERS_WRITE_CANARY_KEYS.marker)
      }
    };
  }

  function readOrdersWriteCanaryBackup() {
    try {
      var raw = readStorage(ORDERS_WRITE_CANARY_KEYS.backup);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function restoreOrdersWriteCanaryBackup(backup) {
    var values = backup && backup.values || {};
    Object.keys(values).forEach(function (key) { writeStorageValue(key, values[key]); });
    writeStorageValue(ORDERS_WRITE_CANARY_KEYS.backup, null);
    refreshRuntimeOrdersWriteCanaryConfig(false);
  }

  function refreshRuntimeOrdersWriteCanaryConfig(enabled) {
    var config = getRuntimeConfig();
    var flags = Object.assign({}, getRuntimeFlags(), {
      enableNetworkRequests: readNetworkEnabled(config)
    });
    var ordersProvider = enabled ? ORDERS_WRITE_CANARY_PROVIDER : readOrdersProvider(config);
    Doke.runtimeConfig = Object.freeze(Object.assign({}, config, {
      flags: flags,
      dataProvider: enabled ? 'mock' : (config.dataProvider || 'mock'),
      ordersProvider: ordersProvider,
      orderWriteActivation: enabled && readOrderWriteActivation(config),
      ordersWriteCanary: enabled,
      apiBaseUrl: readOrdersApiBaseUrl(config) || config.apiBaseUrl || '',
      canary: Object.freeze(Object.assign({}, config.canary || {}, {
        ordersWrite: enabled,
        ordersProvider: ordersProvider,
        forcedDataProvider: enabled ? 'mock' : (config.canary && config.canary.forcedDataProvider || ''),
        orderWriteActivation: enabled && readOrderWriteActivation(config)
      }))
    }));
  }

  function getOrdersWriteCanaryStatus() {
    var config = getRuntimeConfig();
    var canaryRequested = readOrdersWriteCanaryFlag(config);
    var orderWriteActivation = readOrderWriteActivation(config);
    var ordersProvider = readOrdersProvider(config);
    var apiBaseUrl = readOrdersApiBaseUrl(config);
    var networkEnabled = readNetworkEnabled(config);
    var dataProvider = String(config.dataProvider || readStorage(ORDERS_WRITE_CANARY_KEYS.dataProvider) || 'mock').trim().toLowerCase();
    var targetSafe = Boolean(apiBaseUrl) && isSafeOrdersCanaryTarget(apiBaseUrl, getStoredOrdersWriteMarker());
    var blockers = [];

    if (!canaryRequested) blockers.push('ordersWriteCanary is not enabled.');
    if (ordersProvider !== ORDERS_WRITE_CANARY_PROVIDER) blockers.push('ordersProvider is not api-write-canary-frontend-activation.');
    if (dataProvider !== 'mock') blockers.push('dataProvider must remain mock during orders write canary.');
    if (!orderWriteActivation) blockers.push('orderWriteActivation is not enabled.');
    if (!apiBaseUrl) blockers.push('orders write apiBaseUrl is not configured.');
    if (!networkEnabled) blockers.push('enableNetworkRequests flag is disabled.');
    if (apiBaseUrl && !targetSafe) blockers.push('orders write target is not marked as local/staging.');
    if (typeof root.fetch !== 'function') blockers.push('window.fetch is not available.');

    return Object.freeze({
      domain: 'orders',
      active: blockers.length === 0,
      canaryRequested: canaryRequested,
      ordersProvider: ordersProvider,
      dataProvider: dataProvider,
      orderWriteActivation: orderWriteActivation,
      apiBaseUrlConfigured: Boolean(apiBaseUrl),
      networkEnabled: networkEnabled,
      targetSafe: targetSafe,
      blockers: blockers
    });
  }

  function configureOrdersWriteCanary(options) {
    options = options || {};
    var apiBaseUrl = normalizeBaseUrl(options.apiBaseUrl || options.baseUrl || readOrdersApiBaseUrl(getRuntimeConfig()));
    var marker = normalizeMarker(options.targetMarker || options.marker || getStoredOrdersWriteMarker());

    if (!apiBaseUrl) throw new Error('Orders write canary requires apiBaseUrl.');
    if (!isSafeOrdersCanaryTarget(apiBaseUrl, marker)) throw new Error('Orders write canary target is production-like or not marked as local/staging.');

    if (!readOrdersWriteCanaryBackup()) {
      writeStorageValue(ORDERS_WRITE_CANARY_KEYS.backup, JSON.stringify(createOrdersWriteCanaryBackup()));
    }

    writeStorageValue(ORDERS_WRITE_CANARY_KEYS.enabled, 'true');
    writeStorageValue(ORDERS_WRITE_CANARY_KEYS.ordersProvider, ORDERS_WRITE_CANARY_PROVIDER);
    writeStorageValue(ORDERS_WRITE_CANARY_KEYS.orderWriteActivation, 'true');
    writeStorageValue(ORDERS_WRITE_CANARY_KEYS.dataProvider, 'mock');
    writeStorageValue(ORDERS_WRITE_CANARY_KEYS.apiBaseUrl, apiBaseUrl);
    writeStorageValue(ORDERS_WRITE_CANARY_KEYS.ordersApiBaseUrl, apiBaseUrl);
    writeStorageValue(ORDERS_WRITE_CANARY_KEYS.network, 'true');
    if (marker) writeStorageValue(ORDERS_WRITE_CANARY_KEYS.marker, marker);

    refreshRuntimeOrdersWriteCanaryConfig(true);
    var status = getOrdersWriteCanaryStatus();
    if (!status.active) throw new Error('Orders write canary activation blocked: ' + status.blockers.join(' '));
    return status;
  }

  function rollbackOrdersWriteCanary() {
    var backup = readOrdersWriteCanaryBackup();
    if (backup) restoreOrdersWriteCanaryBackup(backup);
    else {
      writeStorageValue(ORDERS_WRITE_CANARY_KEYS.enabled, null);
      writeStorageValue(ORDERS_WRITE_CANARY_KEYS.ordersProvider, 'mock');
      writeStorageValue(ORDERS_WRITE_CANARY_KEYS.orderWriteActivation, null);
      writeStorageValue(ORDERS_WRITE_CANARY_KEYS.ordersApiBaseUrl, null);
      writeStorageValue(ORDERS_WRITE_CANARY_KEYS.marker, null);
      refreshRuntimeOrdersWriteCanaryConfig(false);
    }
    return getOrdersWriteCanaryStatus();
  }

  function shouldUseOrdersWriteCanary() {
    return getOrdersWriteCanaryStatus().active === true;
  }

  function getSessionToken() {
    if (Doke.session && typeof Doke.session.getSession === 'function') {
      var session = Doke.session.getSession();
      if (session && session.token) return session.token;
    }
    if (root.DokeAuth && typeof root.DokeAuth.getSession === 'function') {
      var authSession = root.DokeAuth.getSession();
      if (authSession && authSession.token) return authSession.token;
    }
    return '';
  }

  function extractIdempotencyKey(payload, options) {
    payload = payload || {};
    options = options || {};
    return normalizeText(options.idempotencyKey || options.idempotency_key || payload.idempotencyKey || payload.idempotency_key || '');
  }

  function stripCanaryPayloadMetadata(payload) {
    var body = Object.assign({}, payload || {});
    delete body.idempotencyKey;
    delete body.idempotency_key;
    return body;
  }

  function assertOrdersWriteIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) throw new Error('Orders write API canary requires idempotencyKey for every mutation.');
  }

  function getOrdersWriteCanaryActionPath(actionName, orderId) {
    var action = String(actionName || '').trim();
    var template = ORDERS_WRITE_ALLOWED_ACTIONS[action];
    if (!template) throw new Error('Orders write API canary action is not allowed: ' + action);
    var id = encodeURIComponent(String(orderId || '').trim());
    if (!id) throw new Error('Orders write API canary action requires orderId.');
    return template.replace(':id', id);
  }

  function ordersWriteCanaryRequest(path, payload, idempotencyKey) {
    assertOrdersWriteIdempotencyKey(idempotencyKey);
    if (!/^\/orders(\/|$)/.test(path)) return Promise.reject(new Error('Orders write API canary blocked non-orders endpoint: ' + path));

    var status = getOrdersWriteCanaryStatus();
    if (!status.active) return Promise.reject(new Error('Orders write API canary is not active: ' + status.blockers.join(' ')));

    var baseUrl = readOrdersApiBaseUrl(getRuntimeConfig());
    var headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-idempotency-key': idempotencyKey
    };
    var token = getSessionToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    return root.fetch(baseUrl + path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: headers,
      body: JSON.stringify(stripCanaryPayloadMetadata(payload || {}))
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok) {
          var message = body && (body.error || body.message || body.code) || 'Orders write API canary request failed: ' + response.status;
          var error = new Error(message);
          error.code = body && body.code;
          error.status = response.status;
          throw error;
        }
        return normalizeOrderFromProvider(body && (body.order || body.item) || body);
      });
    });
  }

  function ordersWriteCanaryCreate(payload, user) {
    var apiPayload = getApiCreatePayload(payload, user);
    return ordersWriteCanaryRequest('/orders', apiPayload, extractIdempotencyKey(payload));
  }

  function ordersWriteCanaryAction(actionName, orderId, payload, options) {
    payload = payload || {};
    options = options || {};
    var path = getOrdersWriteCanaryActionPath(actionName, orderId);
    var body = Object.assign({}, payload, {
      id: orderId,
      orderId: orderId
    });
    return ordersWriteCanaryRequest(path, body, extractIdempotencyKey(body, options));
  }

  function getRepository() {
    return Doke.repositories && Doke.repositories.orders;
  }

  function assertRepository() {
    var repository = getRepository();
    if (!repository) throw new Error('Orders Repository não foi carregado.');
    return repository;
  }

  function clone(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function getRepositoryBoundary() {
    return Doke.repositoryBoundary && typeof Doke.repositoryBoundary === 'object'
      ? Doke.repositoryBoundary
      : null;
  }

  function getOrdersProviderStatus() {
    var boundary = getRepositoryBoundary();
    var status = boundary && typeof boundary.getDataProviderStatus === 'function'
      ? boundary.getDataProviderStatus()
      : null;
    var activeProvider = status && status.activeProvider || 'mock';
    var apiReady = status ? status.apiReady === true : false;

    var writeCanaryStatus = getOrdersWriteCanaryStatus();

    return Object.freeze({
      domain: 'orders',
      activeProvider: writeCanaryStatus.active ? writeCanaryStatus.ordersProvider : activeProvider,
      requestedProvider: writeCanaryStatus.canaryRequested ? writeCanaryStatus.ordersProvider : status && status.requestedProvider || activeProvider,
      apiReady: apiReady || writeCanaryStatus.active,
      ordersApiActive: activeProvider === 'api' && apiReady,
      ordersWriteCanaryActive: writeCanaryStatus.active,
      ordersWriteCanary: writeCanaryStatus,
      fallbackProvider: 'local-mock'
    });
  }

  function shouldUseOrdersApi() {
    var status = getOrdersProviderStatus();
    return status.ordersApiActive === true;
  }

  function normalizeOrderFromProvider(order) {
    if (!order) return order;
    var repository = getRepository();
    if (repository && typeof repository.normalize === 'function') return repository.normalize(order);
    return clone(order);
  }

  function normalizeOrdersFromProvider(payload) {
    var items = Array.isArray(payload)
      ? payload
      : payload && Array.isArray(payload.items)
        ? payload.items
        : [];
    return items.map(normalizeOrderFromProvider);
  }

  function ordersBoundaryList(filters) {
    var boundary = getRepositoryBoundary();
    if (!boundary || typeof boundary.list !== 'function') return Promise.reject(new Error('Orders API boundary indisponível.'));
    return boundary.list('orders', scopeApiFilters(filters || {})).then(normalizeOrdersFromProvider);
  }

  function ordersBoundaryGetById(orderId) {
    var boundary = getRepositoryBoundary();
    if (!boundary || typeof boundary.getById !== 'function') return Promise.reject(new Error('Orders API boundary indisponível.'));
    return boundary.getById('orders', orderId).then(normalizeOrderFromProvider);
  }

  function ordersBoundaryCreate(payload) {
    var boundary = getRepositoryBoundary();
    if (!boundary || typeof boundary.create !== 'function') return Promise.reject(new Error('Orders API boundary indisponível.'));
    return boundary.create('orders', payload || {}).then(function (response) {
      return normalizeOrderFromProvider(response && response.order || response);
    });
  }

  function ordersBoundaryAction(actionName, payload) {
    var boundary = getRepositoryBoundary();
    if (!boundary || typeof boundary.action !== 'function') return Promise.reject(new Error('Orders API boundary indisponível.'));
    return boundary.action('orders', actionName, payload || {}).then(function (response) {
      return normalizeOrderFromProvider(response && response.order || response);
    });
  }

  function getCurrentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') return Doke.session.getCurrentUser();
    if (root.DokeAuth && root.DokeAuth.service && typeof root.DokeAuth.service.getCurrentUser === 'function') return root.DokeAuth.service.getCurrentUser();
    return null;
  }

  function getSecurity() {
    return Doke.permissions && typeof Doke.permissions === 'object' ? Doke.permissions : null;
  }

  function auditSecurity(action, result, metadata) {
    var security = getSecurity();
    if (security && typeof security.auditSecurityEvent === 'function') {
      security.auditSecurityEvent(Object.assign({
        type: 'orders_security',
        action: action,
        result: result,
        resource: 'order'
      }, metadata || {}));
    }
  }

  function canActorReadOrder(actor, order) {
    if (!actor || !actor.id || !order) return false;
    if (actor.role === 'admin' || actor.role === 'support') return true;
    if (actor.role === 'professional') return canProfessionalActOnOrder(actor, order);
    if (actor.role === 'client') return isOrderClient(actor, order);
    return false;
  }

  function assertOrderAccess(order, action, actor) {
    var currentActor = actor || getCurrentUser() || {};
    var security = getSecurity();
    if (security && typeof security.assertResourceAccess === 'function') {
      return security.assertResourceAccess('order', order, action || 'read_order', currentActor);
    }
    if (!canActorReadOrder(currentActor, order)) throw new Error('Você não tem permissão para acessar este pedido.');
    return true;
  }

  function assertOrderTransitionAccess(actor, order, nextStatus) {
    var security = getSecurity();
    if (security && typeof security.assertOrderTransition === 'function') {
      return security.assertOrderTransition(actor || getCurrentUser() || {}, order || {}, nextStatus || 'pending');
    }
    return canActorTransition(actor, order, nextStatus);
  }

  function scopeApiFilters(filters) {
    filters = filters || {};
    var actor = getCurrentUser() || {};
    var security = getSecurity();
    if (filters.currentUser === false && !(security && typeof security.canAccessAdmin === 'function' && security.canAccessAdmin(actor))) {
      auditSecurity('list_all_denied', 'denied', { actor: actor, reason: 'currentUser_false_requires_admin' });
      return Object.assign({}, filters, { currentUser: true, actorId: actor.id || '', actorRole: actor.role || 'guest' });
    }
    return Object.assign({}, filters, { actorId: actor.id || '', actorRole: actor.role || 'guest' });
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function parseCurrencyValue(value) {
    var normalized = normalizeText(value).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    var amount = Number(normalized);
    return Number.isFinite(amount) ? amount : 0;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function getInitials(value) {
    return String(value || 'Doke')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toUpperCase(); })
      .join('') || 'DK';
  }

  function createOrderId() {
    return 'order_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  var STATUS_META = {
    pending: {
      label: 'Aguardando resposta',
      nextAction: 'Acompanhar pedido',
      flow: 'Pedido criado pelo fluxo de orçamento. Aguarde o retorno do profissional.'
    },
    accepted: {
      label: 'Pedido aceito',
      nextAction: 'Abrir conversa',
      flow: 'Pedido aceito pelo profissional. A conversa foi liberada para alinhar proposta e próximos passos.'
    },
    conversation: {
      label: 'Pedido aceito',
      nextAction: 'Abrir conversa',
      flow: 'Pedido aceito pelo profissional. A conversa foi liberada para alinhar proposta e próximos passos.'
    },
    quoted: {
      label: 'Proposta enviada',
      nextAction: 'Aprovar proposta',
      flow: 'O profissional enviou uma proposta. Revise os valores e confirme para liberar o atendimento.'
    },
    in_progress: {
      label: 'Em andamento',
      nextAction: 'Acompanhar atendimento',
      flow: 'A proposta foi aprovada e o atendimento está em andamento.'
    },
    completed: {
      label: 'Concluído',
      nextAction: 'Avaliar atendimento',
      flow: 'Pedido concluído. O cliente pode avaliar o atendimento.'
    },
    cancelled: {
      label: 'Pedido recusado',
      nextAction: 'Pedido encerrado',
      flow: 'Pedido recusado pelo profissional. A justificativa fica registrada no histórico do pedido.'
    }
  };

  function getStatusMeta(status) {
    return STATUS_META[status] || STATUS_META.pending;
  }

  var ORDER_TRANSITIONS = Object.freeze({
    pending: Object.freeze({
      accepted: Object.freeze(['professional']),
      cancelled: Object.freeze(['professional'])
    }),
    accepted: Object.freeze({
      quoted: Object.freeze(['professional'])
    }),
    conversation: Object.freeze({
      quoted: Object.freeze(['professional'])
    }),
    quoted: Object.freeze({
      in_progress: Object.freeze(['client']),
      cancelled: Object.freeze(['client'])
    }),
    in_progress: Object.freeze({
      completed: Object.freeze(['client', 'professional']),
      cancelled: Object.freeze(['client', 'professional'])
    }),
    completed: Object.freeze({}),
    cancelled: Object.freeze({})
  });

  function normalizeStatusToken(status) {
    var normalized = normalizeText(status || '').toLowerCase();
    return normalized === 'conversation' ? 'accepted' : normalized;
  }

  function getAllowedTransitions(status, role) {
    var currentStatus = normalizeStatusToken(status || 'pending');
    var transitions = ORDER_TRANSITIONS[currentStatus] || {};
    return Object.keys(transitions).filter(function (nextStatus) {
      return !role || transitions[nextStatus].indexOf(role) !== -1;
    });
  }

  function canTransition(order, nextStatus, actor) {
    var currentStatus = normalizeStatusToken(order && order.status || 'pending');
    var targetStatus = normalizeStatusToken(nextStatus);
    var role = normalizeText(actor && actor.role || '').toLowerCase();
    if (!targetStatus || currentStatus === targetStatus) return false;
    var transitions = ORDER_TRANSITIONS[currentStatus] || {};
    if (!Array.isArray(transitions[targetStatus]) || transitions[targetStatus].indexOf(role) === -1) return false;
    return canActorTransition(actor, order, targetStatus);
  }

  function assertCanonicalTransition(order, nextStatus, actor) {
    if (canTransition(order, nextStatus, actor)) return true;
    var currentStatus = normalizeStatusToken(order && order.status || 'pending');
    var allowed = getAllowedTransitions(currentStatus, normalizeText(actor && actor.role || '').toLowerCase());
    var detail = allowed.length ? ' Próximos estados permitidos: ' + allowed.join(', ') + '.' : '';
    throw new Error('Transição inválida de ' + currentStatus + ' para ' + normalizeStatusToken(nextStatus) + '.' + detail);
  }

  function getApiActionForStatus(status) {
    var normalizedStatus = normalizeText(status || '');
    var actions = {
      accepted: 'accept',
      conversation: 'accept',
      quoted: 'quote',
      in_progress: 'start',
      completed: 'complete',
      cancelled: 'decline'
    };
    return actions[normalizedStatus] || 'updateStatus';
  }

  function getApiCreatePayload(payload, user) {
    payload = payload || {};
    var createdAt = nowIso();
    return Object.assign({}, payload, {
      clientId: user.id,
      clientName: user.name || 'Cliente Doke',
      clientInitials: user.initials || user.avatarInitials || getInitials(user.name || 'Cliente Doke'),
      status: payload.status || 'pending',
      statusLabel: payload.statusLabel || 'Aguardando resposta',
      nextAction: payload.nextAction || 'Acompanhar pedido',
      title: payload.title || buildTitle(payload),
      source: payload.source || 'budget',
      createdAt: payload.createdAt || createdAt,
      updatedAt: payload.updatedAt || createdAt
    });
  }

  var DEMO_PROFESSIONAL_ID = 'user_profissional_demo';

  function routeProfessionalForMock(payload) {
    payload = payload || {};
    var originalProfessionalId = normalizeText(payload.professionalId || payload.providerId || '');
    if (!originalProfessionalId) return payload;

    // Static mock environment rule:
    // service cards may use provider IDs (pro_001, pro-renato, etc.), while the login
    // account used for professional testing is user_profissional_demo. Route operational
    // ownership to that mock account and preserve the provider identity as display data.
    if (originalProfessionalId !== DEMO_PROFESSIONAL_ID) {
      return Object.assign({}, payload, {
        displayProfessionalId: originalProfessionalId,
        sourceProfessionalId: originalProfessionalId,
        professionalId: DEMO_PROFESSIONAL_ID,
        providerId: DEMO_PROFESSIONAL_ID
      });
    }

    return payload;
  }

  function buildTitle(payload) {
    var service = normalizeText(payload.serviceTitle || payload.service || payload.title || 'Serviço solicitado');
    var address = normalizeText(payload.locationTitle || payload.location || '');
    return address ? service + ' · ' + address : service;
  }

  function validateCreatePayload(payload, user) {
    if (!user || !user.id) throw new Error('Entre na sua conta para solicitar orçamento.');
    if (user.role && user.role !== 'client') {
      throw new Error('Use uma conta de cliente para solicitar orçamento.');
    }
    if (!normalizeText(payload.serviceId)) throw new Error('Serviço inválido. Abra o anúncio novamente.');
    if (!normalizeText(payload.professionalId || payload.providerId)) throw new Error('Profissional inválido. Abra o anúncio novamente.');
    if (String(payload.professionalId || payload.providerId) === String(user.id)) {
      throw new Error('Você não pode solicitar orçamento para o próprio serviço.');
    }
  }

  function create(payload) {
    payload = payload || {};
    var user = getCurrentUser();
    validateCreatePayload(payload, user);

    if (shouldUseOrdersWriteCanary()) {
      return ordersWriteCanaryCreate(payload, user).then(function (saved) {
        document.dispatchEvent(new CustomEvent('doke:order-created', {
          detail: {
            order: saved,
            user: user,
            provider: ORDERS_WRITE_CANARY_PROVIDER
          }
        }));
        return saved;
      });
    }

    if (shouldUseOrdersApi()) {
      return ordersBoundaryCreate(getApiCreatePayload(payload, user)).then(function (saved) {
        document.dispatchEvent(new CustomEvent('doke:order-created', {
          detail: {
            order: saved,
            user: user,
            provider: 'api'
          }
        }));
        return saved;
      });
    }

    var repository = assertRepository();
    var createdAt = nowIso();
    var routedPayload = routeProfessionalForMock(payload);
    var order = repository.normalize(Object.assign({}, routedPayload, {
      id: routedPayload.id || createOrderId(),
      clientId: user.id,
      clientName: user.name || 'Cliente Doke',
      clientInitials: user.initials || user.avatarInitials || getInitials(user.name || 'Cliente Doke'),
      status: 'pending',
      statusLabel: 'Aguardando resposta',
      nextAction: 'Acompanhar pedido',
      title: routedPayload.title || buildTitle(routedPayload),
      source: 'budget',
      createdAt: createdAt,
      creatédAt: createdAt,
      updatedAt: createdAt
    }));

    return repository.save(order).then(function (saved) {
      var messagesService = services.messages;
      var conversationTask = messagesService && typeof messagesService.createConversationForOrder === 'function'
        ? messagesService.createConversationForOrder(saved).catch(function (error) {
            console.warn('[DokeOrders:createConversationForOrder]', error);
            return null;
          })
        : Promise.resolve(null);

      return conversationTask.then(function (conversation) {
        var notificationsService = services.notifications;
        var notificationTask = notificationsService && typeof notificationsService.createOrderCreated === 'function'
          ? notificationsService.createOrderCreated(saved, {
              actor: user,
              conversation: conversation,
              conversationId: conversation && conversation.id
            }).catch(function (error) {
              console.warn('[DokeOrders:createOrderNotification]', error);
              return null;
            })
          : Promise.resolve(null);

        return notificationTask.then(function (notification) {
          document.dispatchEvent(new CustomEvent('doke:order-created', {
            detail: {
              order: saved,
              user: user,
              conversation: conversation,
              notification: notification
            }
          }));
          return saved;
        });
      });
    });
  }

  function list(filters) {
    filters = filters || {};
    var actor = getCurrentUser() || {};
    var security = getSecurity();
    if (shouldUseOrdersApi()) return ordersBoundaryList(filters);
    if (filters.currentUser === false && !(security && typeof security.canAccessAdmin === 'function' && security.canAccessAdmin(actor))) {
      auditSecurity('list_all_denied', 'denied', { actor: actor, reason: 'currentUser_false_requires_admin' });
      return Promise.resolve([]);
    }
    return assertRepository().list(filters).then(function (orders) {
      if (filters.currentUser === false) return orders;
      if (!security || typeof security.canAccessOrder !== 'function') return orders;
      return (orders || []).filter(function (order) { return security.canAccessOrder(actor, order, 'read_order'); });
    });
  }

  function listLocal(filters) {
    filters = filters || {};
    var actor = getCurrentUser() || {};
    var security = getSecurity();
    if (filters.currentUser === false && !(security && typeof security.canAccessAdmin === 'function' && security.canAccessAdmin(actor))) {
      auditSecurity('list_local_all_denied', 'denied', { actor: actor, reason: 'currentUser_false_requires_admin' });
      return [];
    }
    return assertRepository().listLocal(filters || {});
  }

  function listForCurrentUser(filters) {
    return list(Object.assign({}, filters || {}, { currentUser: true }));
  }

  function getById(orderId) {
    var actor = getCurrentUser() || {};
    if (shouldUseOrdersApi()) {
      return ordersBoundaryGetById(orderId).then(function (order) {
        if (order) assertOrderAccess(order, 'read_order', actor);
        return order;
      });
    }
    return assertRepository().getById(orderId).then(function (order) {
      if (order) assertOrderAccess(order, 'read_order', actor);
      return order;
    });
  }

  function updateLinkedConversation(order, status, options) {
    var messagesService = services.messages;
    if (!messagesService || typeof messagesService.updateConversationOrder !== 'function') return Promise.resolve(null);
    return messagesService.updateConversationOrder(order, {
      status: status,
      reason: options && options.reason
    }).catch(function (error) {
      console.warn('[DokeOrders:updateConversationOrder]', error);
      return null;
    });
  }

  function isDemoProfessionalActor(actor) {
    return Boolean(actor && actor.role === 'professional' && String(actor.id) === 'user_profissional_demo');
  }

  function canProfessionalActOnOrder(actor, order) {
    if (!actor || actor.role !== 'professional') return true;
    if (String(order.professionalId || order.providerId) === String(actor.id)) return true;
    // Static mock compatibility: older orders may still keep the service-card provider ID.
    // The demo professional account owns all local/mock service orders in Sprint flow tests.
    return isDemoProfessionalActor(actor) && Boolean(order && order.id && (order.clientId || order.serviceId));
  }

  function isOrderClient(actor, order) {
    return Boolean(actor && actor.id && String(order.clientId) === String(actor.id));
  }

  function canActorTransition(actor, order, nextStatus) {
    if (!actor || !actor.id) return false;
    if (actor.role === 'professional') {
      if (!canProfessionalActOnOrder(actor, order)) return false;
      return ['accepted', 'conversation', 'quoted', 'in_progress', 'completed', 'cancelled'].indexOf(nextStatus) !== -1;
    }
    if (actor.role === 'client') {
      if (!isOrderClient(actor, order)) return false;
      return ['in_progress', 'completed', 'cancelled'].indexOf(nextStatus) !== -1;
    }
    return false;
  }

  function notifyStatus(order, status, options) {
    var notificationsService = services.notifications;
    if (!notificationsService || typeof notificationsService.createOrderStatusChanged !== 'function') return Promise.resolve(null);
    return notificationsService.createOrderStatusChanged(order, status, options || {}).catch(function (error) {
      console.warn('[DokeOrders:createStatusNotification]', error);
      return null;
    });
  }

  function saveStatus(orderId, nextStatus, statusLabel, options) {
    options = options || {};
    var actor = getCurrentUser() || {};

    if (shouldUseOrdersWriteCanary()) {
      var canaryStatus = nextStatus || 'pending';
      var canaryMeta = getStatusMeta(canaryStatus);
      var canaryPayload = Object.assign({}, options, {
        status: canaryStatus,
        statusLabel: statusLabel || options.statusLabel || canaryMeta.label,
        actorId: actor.id || '',
        actorRole: actor.role || 'guest'
      });
      return ordersWriteCanaryAction(getApiActionForStatus(canaryStatus), orderId, canaryPayload, options).then(function (saved) {
        document.dispatchEvent(new CustomEvent('doke:order-status-changed', {
          detail: {
            order: saved,
            status: canaryStatus,
            provider: ORDERS_WRITE_CANARY_PROVIDER
          }
        }));
        return saved;
      });
    }

    if (shouldUseOrdersApi()) {
      var normalizedStatus = nextStatus || 'pending';
      var meta = getStatusMeta(normalizedStatus);
      var apiPayload = Object.assign({}, options, {
        id: orderId,
        orderId: orderId,
        status: normalizedStatus,
        statusLabel: statusLabel || options.statusLabel || meta.label,
        actorId: actor.id || '',
        actorRole: actor.role || 'guest'
      });

      if (!['admin', 'support'].includes(String(actor.role || '').toLowerCase())) {
        var roleAllowedStatuses = actor.role === 'professional'
          ? ['accepted', 'conversation', 'quoted', 'in_progress', 'completed', 'cancelled']
          : actor.role === 'client'
            ? ['in_progress', 'completed', 'cancelled']
            : [];
        if (roleAllowedStatuses.indexOf(normalizedStatus) === -1) {
          auditSecurity('api_transition_denied', 'denied', { actor: actor, resourceId: orderId, reason: 'role_status_mismatch' });
          throw new Error('Você não tem permissão para alterar este pedido.');
        }
      }

      return ordersBoundaryAction(getApiActionForStatus(normalizedStatus), apiPayload).then(function (saved) {
        document.dispatchEvent(new CustomEvent('doke:order-status-changed', {
          detail: {
            order: saved,
            status: normalizedStatus,
            provider: 'api'
          }
        }));
        return saved;
      });
    }

    var repository = assertRepository();
    return repository.getById(orderId).then(function (order) {
      if (!order) throw new Error('Pedido não encontrado.');
      var normalizedStatus = normalizeStatusToken(nextStatus || order.status || 'pending');
      if (!assertOrderTransitionAccess(actor, order, normalizedStatus)) {
        throw new Error('Você não tem permissão para alterar este pedido.');
      }
      assertCanonicalTransition(order, normalizedStatus, actor);

      var meta = getStatusMeta(normalizedStatus);
      var updatedAt = nowIso();
      var updated = Object.assign({}, order, {
        status: normalizedStatus,
        statusLabel: statusLabel || options.statusLabel || meta.label || order.statusLabel,
        refusalReason: normalizeText(options.reason || order.refusalReason || ''),
        budget: options.budget || order.budget,
        detailBudget: options.budget || order.detailBudget || order.budget,
        payment: options.payment || order.payment,
        proposalAmount: options.amount || order.proposalAmount || '',
        proposalInstallments: options.installments || order.proposalInstallments || '',
        acceptedAt: normalizedStatus === 'accepted' || normalizedStatus === 'conversation' ? order.acceptedAt || updatedAt : order.acceptedAt || '',
        quotedAt: normalizedStatus === 'quoted' ? order.quotedAt || updatedAt : order.quotedAt || '',
        startedAt: normalizedStatus === 'in_progress' ? order.startedAt || updatedAt : order.startedAt || '',
        completedAt: normalizedStatus === 'completed' ? order.completedAt || updatedAt : order.completedAt || '',
        declinedAt: normalizedStatus === 'cancelled' ? order.declinedAt || updatedAt : order.declinedAt || '',
        detailFlow: options.detailFlow || meta.flow || order.detailFlow,
        nextAction: options.nextAction || meta.nextAction || order.nextAction,
        updatedAt: updatedAt
      });

      return repository.save(updated).then(function (saved) {
        return updateLinkedConversation(saved, nextStatus, options).then(function (conversation) {
          return notifyStatus(saved, nextStatus, Object.assign({}, options, {
            actor: actor,
            conversationId: conversation && conversation.id
          })).then(function (notification) {
            document.dispatchEvent(new CustomEvent('doke:order-status-changed', {
              detail: {
                order: saved,
                status: nextStatus,
                conversation: conversation,
                notification: notification
              }
            }));
            return saved;
          });
        });
      });
    });
  }

  function accept(orderId, options) {
    return saveStatus(orderId, 'accepted', 'Pedido aceito', options || {});
  }

  function decline(orderId, reason) {
    var normalizedReason = normalizeText(reason);
    if (!normalizedReason) return Promise.reject(new Error('Informe uma justificativa para recusar o pedido.'));
    return saveStatus(orderId, 'cancelled', 'Pedido recusado', { reason: normalizedReason });
  }

  function findConversationForOrder(orderId) {
    var messagesService = services.messages;
    if (!messagesService) return Promise.resolve(null);

    if (typeof messagesService.listLocalConversations === 'function') {
      var local = messagesService.listLocalConversations({ currentUser: true, orderId: orderId }) || [];
      var localMatch = local.find(function (conversation) {
        return String(conversation && (conversation.orderId || conversation.order && conversation.order.id) || '') === String(orderId || '');
      });
      if (localMatch) return Promise.resolve(localMatch);
    }

    if (typeof messagesService.listConversations === 'function') {
      return messagesService.listConversations({ currentUser: true, orderId: orderId }).then(function (items) {
        return (items || []).find(function (conversation) {
          return String(conversation && (conversation.orderId || conversation.order && conversation.order.id) || '') === String(orderId || '');
        }) || null;
      });
    }

    return Promise.resolve(null);
  }

  function rollbackProposalMessage(conversationId, messageId, originalError) {
    var messagesService = services.messages;
    if (!messagesService || typeof messagesService.removeMessage !== 'function' || !conversationId || !messageId) {
      throw originalError;
    }

    return messagesService.removeMessage(conversationId, messageId).then(function (removed) {
      if (!removed) {
        originalError.rollbackMessageFailed = true;
        originalError.rollbackError = 'A mensagem da proposta não pôde ser removida.';
      }
      throw originalError;
    }).catch(function (rollbackError) {
      if (rollbackError === originalError) throw originalError;
      console.warn('[DokeOrders:rollbackProposalMessage]', rollbackError);
      originalError.rollbackMessageFailed = true;
      originalError.rollbackError = rollbackError && rollbackError.message || String(rollbackError || '');
      throw originalError;
    });
  }

  function submitProposal(orderId, payload) {
    payload = payload || {};
    var actor = getCurrentUser() || {};
    var amount = normalizeText(payload.amount || payload.budget || '');
    var installments = normalizeText(payload.installments || '') || 'À vista';
    var messagesService = services.messages;

    if (!amount) return Promise.reject(new Error('Informe o valor da proposta.'));
    if (parseCurrencyValue(amount) <= 0) return Promise.reject(new Error('Informe um valor de proposta válido e maior que zero.'));
    if (!messagesService || typeof messagesService.sendMessage !== 'function') {
      return Promise.reject(new Error('Serviço de mensagens indisponível para enviar a proposta.'));
    }

    return getById(orderId).then(function (order) {
      if (!order) throw new Error('Pedido não encontrado.');
      if (!assertOrderTransitionAccess(actor, order, 'quoted')) {
        throw new Error('Você não tem permissão para enviar proposta neste pedido.');
      }
      assertCanonicalTransition(order, 'quoted', actor);
      return findConversationForOrder(orderId).then(function (conversation) {
        if (!conversation || !conversation.id) throw new Error('Conversa vinculada ao pedido não encontrada.');
        return { order: order, conversation: conversation };
      });
    }).then(function (context) {
      var messagePayload = {
        type: 'charge',
        body: normalizeText(payload.messageText || '') || 'Proposta pronta para aprovação. Você pode pagar por aqui para confirmar o atendimento.',
        text: normalizeText(payload.messageText || '') || 'Proposta pronta para aprovação. Você pode pagar por aqui para confirmar o atendimento.',
        amount: amount,
        installments: installments,
        paid: false,
        orderId: orderId,
        senderId: actor.id || '',
        mine: true,
        author: 'Você',
        deferSideEffects: true
      };

      return messagesService.sendMessage(context.conversation.id, messagePayload).then(function (message) {
        if (!message || !(message.id || message.messageId)) {
          throw new Error('A mensagem da proposta não pôde ser persistida.');
        }
        var messageId = message.id || message.messageId;
        return quote(orderId, {
          amount: amount,
          budget: amount,
          installments: installments
        }).then(function (order) {
          var result = {
            order: order,
            message: message,
            conversationId: context.conversation.id
          };
          if (typeof messagesService.commitMessageEffects !== 'function') return result;
          return messagesService.commitMessageEffects(context.conversation.id, message, { actor: actor }).catch(function (sideEffectError) {
            console.warn('[DokeOrders:commitProposalMessageEffects]', sideEffectError);
            result.sideEffectsPending = true;
            result.sideEffectsError = sideEffectError && sideEffectError.message || String(sideEffectError || '');
            return null;
          }).then(function () {
            return result;
          });
        }, function (error) {
          return rollbackProposalMessage(context.conversation.id, messageId, error);
        });
      });
    });
  }

  function quote(orderId, payload) {
    payload = payload || {};
    return saveStatus(orderId, 'quoted', 'Proposta enviada', {
      amount: normalizeText(payload.amount || payload.budget || ''),
      budget: normalizeText(payload.amount || payload.budget || ''),
      payment: payload.installments || 'Pagamento seguro pela Doke',
      installments: payload.installments || '',
      detailFlow: 'O profissional enviou uma proposta. Revise os valores e confirme para liberar o atendimento.',
      nextAction: 'Aprovar proposta'
    });
  }

  function start(orderId, options) {
    options = options || {};
    return saveStatus(orderId, 'in_progress', 'Em andamento', Object.assign({}, options, {
      detailFlow: options.detailFlow || 'A proposta foi aprovada e o atendimento está em andamento.',
      nextAction: options.nextAction || 'Acompanhar atendimento'
    }));
  }

  function complete(orderId, options) {
    options = options || {};
    return saveStatus(orderId, 'completed', 'Concluído', Object.assign({}, options, {
      detailFlow: options.detailFlow || 'Pedido concluído. O cliente pode avaliar o atendimento.',
      nextAction: options.nextAction || 'Avaliar atendimento'
    }));
  }

  function updateStatus(orderId, status, options) {
    return saveStatus(orderId, status || 'pending', null, options || {});
  }

  services.orders = Object.freeze({
    provider: 'local-mock',
    getOrdersProviderStatus: getOrdersProviderStatus,
    getOrdersWriteCanaryStatus: getOrdersWriteCanaryStatus,
    configureOrdersWriteCanary: configureOrdersWriteCanary,
    rollbackOrdersWriteCanary: rollbackOrdersWriteCanary,
    create: create,
    list: list,
    listLocal: listLocal,
    listForCurrentUser: listForCurrentUser,
    getById: getById,
    accept: accept,
    decline: decline,
    quote: quote,
    submitProposal: submitProposal,
    start: start,
    complete: complete,
    updateStatus: updateStatus,
    stateMachine: Object.freeze({
      transitions: ORDER_TRANSITIONS,
      canTransition: canTransition,
      getAllowedTransitions: getAllowedTransitions
    })
  });
})();
