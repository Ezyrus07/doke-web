/* Doke Notification Service
   Responsibility: notification business rules for user/product events. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var services = Doke.services || (Doke.services = {});

  function getRepository() {
    return Doke.repositories && Doke.repositories.notifications;
  }

  function getBoundary() {
    return Doke.repositoryBoundary && typeof Doke.repositoryBoundary.list === 'function'
      ? Doke.repositoryBoundary
      : null;
  }

  function getNotificationsProviderStatus() {
    var boundary = getBoundary();
    var activeProvider = boundary && typeof boundary.getActiveProviderName === 'function'
      ? boundary.getActiveProviderName()
      : 'mock';
    var dataStatus = boundary && typeof boundary.getDataProviderStatus === 'function'
      ? boundary.getDataProviderStatus()
      : null;

    return Object.freeze({
      domain: 'notifications',
      activeProvider: activeProvider,
      usesApi: activeProvider === 'api',
      apiReady: Boolean(dataStatus && dataStatus.apiReady),
      networkEnabled: Boolean(dataStatus && dataStatus.networkEnabled),
      apiBaseUrlConfigured: Boolean(dataStatus && dataStatus.apiBaseUrlConfigured)
    });
  }

  function shouldUseNotificationsApi() {
    var status = getNotificationsProviderStatus();
    return status.activeProvider === 'api' && status.apiReady === true;
  }

  function getCurrentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') return Doke.session.getCurrentUser();
    try {
      var raw = root.localStorage.getItem('doke.auth.session.v1');
      var session = raw ? JSON.parse(raw) : null;
      return session && session.user ? session.user : null;
    } catch (error) {
      return null;
    }
  }

  function getSecurity() {
    return Doke.permissions && typeof Doke.permissions === 'object' ? Doke.permissions : null;
  }

  function auditSecurity(action, result, metadata) {
    var security = getSecurity();
    if (security && typeof security.auditSecurityEvent === 'function') {
      security.auditSecurityEvent(Object.assign({
        type: 'notifications_security',
        action: action,
        result: result,
        resource: 'notification'
      }, metadata || {}));
    }
  }

  function assertNotificationAccess(notification, action, actor) {
    var security = getSecurity();
    if (security && typeof security.assertResourceAccess === 'function') {
      return security.assertResourceAccess('notification', notification, action || 'read_notification', actor || getCurrentUser() || {});
    }
    return true;
  }

  function scopeApiFilters(filters) {
    filters = filters || {};
    var actor = getCurrentUser() || {};
    var security = getSecurity();
    if (filters.currentUser === false && !(security && typeof security.canAccessAdmin === 'function' && security.canAccessAdmin(actor))) {
      auditSecurity('list_all_denied', 'denied', { actor: actor, reason: 'currentUser_false_requires_admin' });
      return Object.assign({}, filters, { currentUser: true, userId: actor.id || '', actorId: actor.id || '', actorRole: actor.role || 'guest' });
    }
    return Object.assign({}, filters, { actorId: actor.id || '', actorRole: actor.role || 'guest' });
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  var DEMO_PROFESSIONAL_ID = 'user_profissional_demo';

  function isProviderLikeId(value) {
    var id = normalizeText(value);
    if (!id) return false;
    if (id === DEMO_PROFESSIONAL_ID) return false;
    return /^(pro|provider|profissional|renato)[_-]/i.test(id) || id.indexOf('user_') !== 0;
  }

  function routeProfessionalRecipientForMock(recipientId, order, status, actor) {
    var normalizedRecipient = normalizeText(recipientId);
    var normalizedStatus = normalizeText(status || order && order.status || '');
    var actorRole = normalizeText(actor && actor.role);
    var actorIsClient = actorRole === 'client' || String(actor && actor.id || '') === String(order && order.clientId || '');
    var professionalTarget = normalizeText(order && (order.professionalId || order.providerId || order.displayProfessionalId || order.sourceProfessionalId));

    if ((normalizedStatus === 'in_progress' || normalizedStatus === 'completed') && actorIsClient && professionalTarget && isProviderLikeId(normalizedRecipient)) {
      return DEMO_PROFESSIONAL_ID;
    }

    return normalizedRecipient;
  }

  function fallbackList(filters) {
    filters = filters || {};
    var repository = getRepository();
    if (!repository || typeof repository.isStaticDemoEnabled !== 'function' || !repository.isStaticDemoEnabled()) {
      return Promise.resolve([]);
    }
    if (!Doke.mockData || typeof Doke.mockData.load !== 'function') return Promise.resolve([]);
    return Doke.mockData.load('notifications').then(function (notifications) {
      return (notifications || []).filter(function (notification) {
        if (filters.read === true && notification.read !== true) return false;
        if (filters.read === false && notification.read !== false) return false;
        if (filters.type && notification.type !== filters.type) return false;
        return true;
      });
    });
  }

  function list(filters) {
    filters = filters || {};
    var actor = getCurrentUser() || {};
    var security = getSecurity();
    var boundary = getBoundary();
    if (shouldUseNotificationsApi() && boundary) return boundary.list('notifications', scopeApiFilters(filters));

    if (filters.currentUser === false && !(security && typeof security.canAccessAdmin === 'function' && security.canAccessAdmin(actor))) {
      auditSecurity('list_all_denied', 'denied', { actor: actor, reason: 'currentUser_false_requires_admin' });
      return Promise.resolve([]);
    }

    var repository = getRepository();
    if (repository && typeof repository.list === 'function') {
      return repository.list(filters).then(function (items) {
        if (filters.currentUser === false || !security || typeof security.canAccessNotification !== 'function') return items;
        return (items || []).filter(function (notification) { return security.canAccessNotification(actor, notification, 'read_notification'); });
      });
    }
    return fallbackList(filters).then(function (items) {
      if (!security || typeof security.canAccessNotification !== 'function') return items;
      return (items || []).filter(function (notification) { return security.canAccessNotification(actor, notification, 'read_notification'); });
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
    var repository = getRepository();
    if (repository && typeof repository.listLocal === 'function') return repository.listLocal(filters || {});
    return [];
  }

  function create(payload) {
    payload = payload || {};
    var boundary = getBoundary();
    if (shouldUseNotificationsApi() && boundary) {
      var actor = getCurrentUser() || {};
      return boundary.create('notifications', Object.assign({}, payload, { actorId: payload.actorId || actor.id || '', actorRole: payload.actorRole || actor.role || 'guest' }));
    }

    var repository = getRepository();
    if (!repository || typeof repository.create !== 'function') return Promise.resolve(null);
    return repository.create(payload);
  }

  function createOrderCreated(order, options) {
    order = order || {};
    options = options || {};
    var actor = options.actor || getCurrentUser() || {};
    var recipientId = normalizeText(options.recipientId || order.professionalId || order.providerId || '');
    if (!recipientId) return Promise.resolve(null);

    return create({
      type: 'order_created',
      category: 'orders',
      userId: recipientId,
      actorId: actor.id || order.clientId || '',
      actorName: actor.name || order.clientName || 'Cliente Doke',
      orderId: order.id,
      conversationId: options.conversationId || options.conversation && options.conversation.id || '',
      serviceId: order.serviceId,
      eventKey: ['order_created', order.id || '', recipientId].filter(Boolean).join(':'),
      title: 'Novo pedido recebido',
      body: (order.clientName || 'Cliente') + ' solicitou orçamento para ' + (order.serviceTitle || order.title || 'um serviço') + '.',
      targetUrl: 'pedidos.html?order=' + encodeURIComponent(order.id || ''),
      actionLabel: 'Ver pedido',
      read: false
    });
  }

  function createOrderStatusChanged(order, status, options) {
    order = order || {};
    options = options || {};
    var actor = options.actor || getCurrentUser() || {};
    var normalizedStatus = normalizeText(status || order.status || '');
    var rawRecipientId = normalizeText(options.recipientId || (actor.id === order.clientId ? order.professionalId || order.providerId : order.clientId));
    var recipientId = routeProfessionalRecipientForMock(rawRecipientId, order, normalizedStatus, actor);
    if (!recipientId) return Promise.resolve(null);

    var title = 'Status do pedido atualizado';
    var body = 'O pedido "' + (order.serviceTitle || order.title || 'Pedido') + '" mudou para ' + (order.statusLabel || normalizedStatus || 'nova etapa') + '.';
    var actionLabel = 'Ver pedido';
    var targetUrl = 'pedidos.html?order=' + encodeURIComponent(order.id || '');

    if (normalizedStatus === 'accepted' || normalizedStatus === 'conversation') {
      title = 'Pedido aceito';
      body = (actor.name || 'Profissional') + ' aceitou o pedido "' + (order.serviceTitle || order.title || 'Pedido') + '". A conversa foi liberada.';
      actionLabel = 'Abrir conversa';
      targetUrl = 'mensagens.html?order=' + encodeURIComponent(order.id || '') + (options.conversationId ? '&conversation=' + encodeURIComponent(options.conversationId) : '');
    }

    if (normalizedStatus === 'quoted') {
      title = 'Proposta enviada';
      body = (actor.name || 'Profissional') + ' enviou uma proposta para "' + (order.serviceTitle || order.title || 'Pedido') + '".';
      if (options.amount || order.proposalAmount || order.budget) body += ' Valor: ' + (options.amount || order.proposalAmount || order.budget) + '.';
      actionLabel = 'Abrir conversa';
      targetUrl = 'mensagens.html?order=' + encodeURIComponent(order.id || '') + (options.conversationId ? '&conversation=' + encodeURIComponent(options.conversationId) : '');
    }

    if (normalizedStatus === 'in_progress') {
      title = 'Pagamento confirmado';
      body = (actor.name || 'Cliente') + ' pagou a proposta do pedido "' + (order.serviceTitle || order.title || 'Pedido') + '". O atendimento foi liberado e está em andamento.';
      actionLabel = 'Abrir conversa';
      targetUrl = 'mensagens.html?order=' + encodeURIComponent(order.id || '') + (options.conversationId ? '&conversation=' + encodeURIComponent(options.conversationId) : '');
    }

    if (normalizedStatus === 'completed') {
      title = 'Pedido concluído';
      body = (actor.name || 'Cliente') + ' concluiu o pedido "' + (order.serviceTitle || order.title || 'Pedido') + '".';
      actionLabel = 'Ver pedido';
      targetUrl = 'pedidos.html?order=' + encodeURIComponent(order.id || '');
    }

    if (normalizedStatus === 'cancelled') {
      title = 'Pedido recusado';
      body = (actor.name || 'Profissional') + ' recusou o pedido "' + (order.serviceTitle || order.title || 'Pedido') + '".';
      if (options.reason || order.refusalReason) body += ' Justificativa: ' + (options.reason || order.refusalReason);
    }

    var paymentMessageId = normalizeText(options.paymentMessageId || options.messageId || options.chargeId || '');
    var eventKeyParts = ['order_status_changed', order.id || '', normalizedStatus || ''];
    if (normalizedStatus === 'in_progress' && paymentMessageId) eventKeyParts.push(paymentMessageId);
    eventKeyParts.push(recipientId);

    return create({
      type: 'order_status_changed',
      category: 'orders',
      userId: recipientId,
      actorId: actor.id || '',
      actorName: actor.name || '',
      orderId: order.id,
      conversationId: options.conversationId || '',
      messageId: paymentMessageId,
      serviceId: order.serviceId,
      eventKey: eventKeyParts.filter(Boolean).join(':'),
      title: title,
      body: body,
      targetUrl: targetUrl,
      actionLabel: actionLabel,
      read: false
    });
  }

  function createMessageReceived(conversation, message, options) {
    conversation = conversation || {};
    message = message || {};
    options = options || {};
    var actor = options.actor || getCurrentUser() || {};
    var participants = Array.isArray(conversation.participants) ? conversation.participants : [];
    var explicitRecipient = normalizeText(options.recipientId || '');
    var recipientId = explicitRecipient || participants.find(function (id) { return String(id) !== String(message.senderId || actor.id || ''); }) || '';
    if (!recipientId) return Promise.resolve(null);

    var messageText = normalizeText(message.text || message.body || '');
    if (!messageText && message.type === 'image') messageText = 'Enviou uma imagem.';
    if (!messageText && message.type === 'audio') messageText = 'Enviou um áudio.';
    if (!messageText && message.type === 'charge') messageText = 'Enviou uma cobrança.';
    var compactMessage = messageText.length > 96 ? messageText.slice(0, 93) + '...' : messageText;
    var serviceTitle = conversation.order && (conversation.order.serviceTitle || conversation.order.title) || 'um pedido';

    return create({
      type: 'message_received',
      category: 'messages',
      userId: recipientId,
      actorId: message.senderId || actor.id || '',
      actorName: actor.name || message.author || 'Doke',
      orderId: conversation.orderId || '',
      conversationId: conversation.id || message.conversationId || '',
      serviceId: conversation.serviceId || '',
      messageId: message.id || '',
      eventKey: ['message_received', message.id || '', recipientId].filter(Boolean).join(':'),
      title: 'Nova mensagem',
      body: (actor.name || message.author || 'Contato') + ' sobre ' + serviceTitle + ': "' + (compactMessage || 'Nova atualização na conversa.') + '"',
      targetUrl: 'mensagens.html?order=' + encodeURIComponent(conversation.orderId || '') + (conversation.id ? '&conversation=' + encodeURIComponent(conversation.id) : ''),
      actionLabel: 'Abrir conversa',
      read: false
    });
  }

  function markAsRead(id) {
    var notificationId = normalizeText(id);
    if (!notificationId) return Promise.resolve(null);
    var actor = getCurrentUser() || {};

    var boundary = getBoundary();
    if (shouldUseNotificationsApi() && boundary) {
      return boundary.action('notifications', 'read', { id: notificationId, actorId: actor.id || '', actorRole: actor.role || 'guest' });
    }

    var repository = getRepository();
    if (!repository || typeof repository.markAsRead !== 'function') return Promise.resolve(null);
    return list({ currentUser: true }).then(function (items) {
      var notification = (items || []).find(function (item) { return String(item.id || '') === String(notificationId); });
      if (!notification) throw new Error('Notificação não encontrada.');
      assertNotificationAccess(notification, 'read_notification', actor);
      return repository.markAsRead(notificationId);
    });
  }

  function dismiss(id) {
    var notificationId = normalizeText(id);
    if (!notificationId) return Promise.resolve(null);
    var actor = getCurrentUser() || {};

    var boundary = getBoundary();
    if (shouldUseNotificationsApi() && boundary) {
      return boundary.action('notifications', 'dismiss', { id: notificationId, actorId: actor.id || '', actorRole: actor.role || 'guest' });
    }

    var repository = getRepository();
    if (!repository || typeof repository.dismiss !== 'function') return Promise.resolve(null);
    return list({ currentUser: true }).then(function (items) {
      var notification = (items || []).find(function (item) { return String(item.id || '') === String(notificationId); });
      if (!notification) throw new Error('Notificação não encontrada.');
      assertNotificationAccess(notification, 'dismiss_notification', actor);
      return repository.dismiss(notificationId);
    });
  }

  function markAllAsRead(filters) {
    filters = filters || {};
    var boundary = getBoundary();
    if (shouldUseNotificationsApi() && boundary) {
      return boundary.action('notifications', 'readAll', scopeApiFilters(filters));
    }

    var repository = getRepository();
    if (!repository || typeof repository.markAllAsRead !== 'function') return Promise.resolve(false);
    return repository.markAllAsRead(filters);
  }

  function unreadCount(userId) {
    var boundary = getBoundary();
    if (shouldUseNotificationsApi() && boundary) {
      return boundary.list('notifications', { read: false, dismissed: false, userId: userId || '' })
        .then(function (notifications) { return Array.isArray(notifications) ? notifications.length : Number(notifications && notifications.total || 0); });
    }

    var repository = getRepository();
    if (repository && typeof repository.unreadCount === 'function') return repository.unreadCount(userId);
    return list({ read: false }).then(function (notifications) { return notifications.length; });
  }

  services.notifications = Object.freeze({
    provider: getRepository() ? 'local-mock' : 'static-mock',
    getNotificationsProviderStatus: getNotificationsProviderStatus,
    shouldUseNotificationsApi: shouldUseNotificationsApi,
    list: list,
    listLocal: listLocal,
    create: create,
    createOrderCreated: createOrderCreated,
    createOrderStatusChanged: createOrderStatusChanged,
    createMessageReceived: createMessageReceived,
    markAsRead: markAsRead,
    dismiss: dismiss,
    markAllAsRead: markAllAsRead,
    unreadCount: unreadCount
  });
})();
