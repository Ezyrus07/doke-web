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

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function fallbackList(filters) {
    filters = filters || {};
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
    var repository = getRepository();
    if (repository && typeof repository.list === 'function') return repository.list(filters || {});
    return fallbackList(filters);
  }

  function listLocal(filters) {
    var repository = getRepository();
    if (repository && typeof repository.listLocal === 'function') return repository.listLocal(filters || {});
    return [];
  }

  function create(payload) {
    var repository = getRepository();
    if (!repository || typeof repository.create !== 'function') return Promise.resolve(null);
    return repository.create(payload || {});
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
    var recipientId = normalizeText(options.recipientId || (actor.id === order.clientId ? order.professionalId || order.providerId : order.clientId));
    if (!recipientId) return Promise.resolve(null);

    var normalizedStatus = normalizeText(status || order.status || '');
    var title = 'Status do pedido atualizado';
    var body = 'O pedido "' + (order.serviceTitle || order.title || 'Pedido') + '" mudou para ' + (order.statusLabel || normalizedStatus || 'nova etapa') + '.';
    var actionLabel = 'Ver pedido';
    var targetUrl = 'pedidos.html?order=' + encodeURIComponent(order.id || '');

    if (normalizedStatus === 'conversation') {
      title = 'Pedido aceito';
      body = (actor.name || 'Profissional') + ' aceitou o pedido "' + (order.serviceTitle || order.title || 'Pedido') + '". A conversa foi liberada.';
      actionLabel = 'Abrir conversa';
      targetUrl = 'mensagens.html?order=' + encodeURIComponent(order.id || '') + (options.conversationId ? '&conversation=' + encodeURIComponent(options.conversationId) : '');
    }

    if (normalizedStatus === 'cancelled') {
      title = 'Pedido recusado';
      body = (actor.name || 'Profissional') + ' recusou o pedido "' + (order.serviceTitle || order.title || 'Pedido') + '".';
      if (options.reason || order.refusalReason) body += ' Justificativa: ' + (options.reason || order.refusalReason);
    }

    return create({
      type: 'order_status_changed',
      category: 'orders',
      userId: recipientId,
      actorId: actor.id || '',
      actorName: actor.name || '',
      orderId: order.id,
      conversationId: options.conversationId || '',
      serviceId: order.serviceId,
      eventKey: ['order_status_changed', order.id || '', normalizedStatus || '', recipientId].filter(Boolean).join(':'),
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
      body: (actor.name || message.author || 'Contato') + ' enviou uma mensagem sobre ' + (conversation.order && (conversation.order.serviceTitle || conversation.order.title) || 'um pedido') + '.',
      targetUrl: 'mensagens.html?order=' + encodeURIComponent(conversation.orderId || '') + (conversation.id ? '&conversation=' + encodeURIComponent(conversation.id) : ''),
      actionLabel: 'Abrir conversa',
      read: false
    });
  }

  function markAsRead(id) {
    var repository = getRepository();
    if (!repository || typeof repository.markAsRead !== 'function') return Promise.resolve(null);
    return repository.markAsRead(id);
  }

  function dismiss(id) {
    var repository = getRepository();
    if (!repository || typeof repository.dismiss !== 'function') return Promise.resolve(null);
    return repository.dismiss(id);
  }

  function markAllAsRead(filters) {
    var repository = getRepository();
    if (!repository || typeof repository.markAllAsRead !== 'function') return Promise.resolve(false);
    return repository.markAllAsRead(filters || {});
  }

  function unreadCount(userId) {
    var repository = getRepository();
    if (repository && typeof repository.unreadCount === 'function') return repository.unreadCount(userId);
    return list({ read: false }).then(function (notifications) { return notifications.length; });
  }

  services.notifications = Object.freeze({
    provider: getRepository() ? 'local-mock' : 'static-mock',
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
