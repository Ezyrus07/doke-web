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
      var paymentStatus = normalizeText(options.paymentStatus || order.paymentStatus || '').toLowerCase();
      var paymentConfirmed = ['paid', 'confirmed', 'held', 'released'].indexOf(paymentStatus) !== -1 || options.paymentConfirmed === true;
      title = paymentConfirmed ? 'Pagamento confirmado' : 'Proposta aprovada';
      body = paymentConfirmed
        ? (actor.name || 'Cliente') + ' confirmou o pagamento do pedido "' + (order.serviceTitle || order.title || 'Pedido') + '". O atendimento segue em andamento.'
        : (actor.name || 'Cliente') + ' aprovou a proposta do pedido "' + (order.serviceTitle || order.title || 'Pedido') + '". O atendimento foi liberado, mas o pagamento ainda não foi confirmado.';
      actionLabel = 'Abrir conversa';
      targetUrl = 'mensagens.html?order=' + encodeURIComponent(order.id || '') + (options.conversationId ? '&conversation=' + encodeURIComponent(options.conversationId) : '');
    }

    if (normalizedStatus === 'completed') {
      var paymentReleased = normalizeText(options.paymentStatus || order.paymentStatus || '').toLowerCase() === 'released';
      title = paymentReleased ? 'Pedido concluído e pagamento liberado' : 'Pedido concluído';
      body = paymentReleased
        ? (actor.name || 'Cliente') + ' confirmou a conclusão do pedido "' + (order.serviceTitle || order.title || 'Pedido') + '". O pagamento em garantia foi liberado.'
        : (actor.name || 'Cliente') + ' concluiu o pedido "' + (order.serviceTitle || order.title || 'Pedido') + '".';
      actionLabel = 'Ver pedido';
      targetUrl = 'pedidos.html?order=' + encodeURIComponent(order.id || '');
    }

    if (normalizedStatus === 'cancelled') {
      var cancellationType = normalizeText(options.cancellationType || order.cancellationType || '').toLowerCase();
      var proposalRejected = cancellationType === 'proposal_rejected';
      var clientCancelled = cancellationType === 'client_cancelled_before_payment';
      var professionalCancelled = cancellationType === 'professional_cancelled_before_payment';
      title = proposalRejected ? 'Proposta recusada' : clientCancelled || professionalCancelled ? 'Pedido cancelado' : 'Pedido recusado';
      body = proposalRejected
        ? (actor.name || 'Cliente') + ' recusou a proposta do pedido "' + (order.serviceTitle || order.title || 'Pedido') + '".'
        : clientCancelled
          ? (actor.name || 'Cliente') + ' cancelou o pedido "' + (order.serviceTitle || order.title || 'Pedido') + '" antes do pagamento.'
          : professionalCancelled
            ? (actor.name || 'Profissional') + ' cancelou o pedido "' + (order.serviceTitle || order.title || 'Pedido') + '" antes do pagamento.'
            : (actor.name || 'Profissional') + ' recusou o pedido "' + (order.serviceTitle || order.title || 'Pedido') + '".';
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

  function createOrderReviewed(order, review, options) {
    order = order || {};
    review = review || {};
    options = options || {};
    var actor = options.actor || getCurrentUser() || {};
    var recipientId = normalizeText(options.recipientId || order.professionalId || order.providerId || review.professionalId || review.providerId || '');
    if (!recipientId) return Promise.resolve(null);
    var rating = Number(review.rating || 0);
    var ratingLabel = Number.isFinite(rating) && rating > 0 ? rating.toFixed(1).replace('.', ',') : '—';

    return create({
      type: 'order_reviewed',
      category: 'orders',
      userId: recipientId,
      actorId: actor.id || order.clientId || review.clientId || '',
      actorName: actor.name || order.clientName || review.clientName || 'Cliente Doke',
      orderId: order.id || review.orderId || '',
      conversationId: options.conversationId || review.conversationId || '',
      messageId: options.messageId || review.messageId || '',
      serviceId: order.serviceId || review.serviceId || '',
      eventKey: ['order_reviewed', order.id || review.orderId || '', review.id || '', recipientId].filter(Boolean).join(':'),
      title: 'Avaliação recebida',
      body: (actor.name || order.clientName || review.clientName || 'Cliente Doke') + ' avaliou o atendimento "' + (order.serviceTitle || order.title || review.serviceTitle || 'Pedido') + '" com nota ' + ratingLabel + '.',
      targetUrl: options.targetUrl || 'mensagens.html?order=' + encodeURIComponent(order.id || review.orderId || ''),
      actionLabel: 'Abrir conversa',
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
    if (!messageText && message.type === 'proposal') messageText = 'Enviou uma proposta.';
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

  function createPaymentHeld(payment, options) {
    payment = payment || {};
    options = options || {};
    var order = options.order || {};
    var conversation = options.conversation || {};
    var actor = options.actor || getCurrentUser() || {};
    var recipientId = normalizeText(payment.professionalId || order.professionalId || order.providerId || conversation.professionalId || '');
    if (!recipientId) return Promise.resolve(null);
    var grossAmount = Number(payment.grossAmount || payment.amount || 0);
    var amountLabel = Number.isFinite(grossAmount)
      ? grossAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : normalizeText(payment.grossAmount || payment.amount || '');
    var title = normalizeText(order.serviceTitle || order.title || conversation.serviceTitle || 'Pedido');

    return create({
      type: 'payment_held',
      category: 'payments',
      userId: recipientId,
      actorId: actor.id || payment.clientId || '',
      actorName: actor.name || order.clientName || conversation.clientName || 'Cliente Doke',
      orderId: payment.orderId || order.id || conversation.orderId || '',
      conversationId: payment.conversationId || conversation.id || '',
      messageId: payment.messageId || payment.chargeMessageId || '',
      serviceId: order.serviceId || conversation.serviceId || '',
      eventKey: ['payment_held', payment.id || '', recipientId].filter(Boolean).join(':'),
      title: 'Pagamento em garantia',
      body: (actor.name || order.clientName || 'O cliente') + ' confirmou o pagamento de ' + (amountLabel || 'valor combinado') + ' para "' + title + '". O valor ficará em garantia até a conclusão.',
      targetUrl: 'mensagens.html?order=' + encodeURIComponent(payment.orderId || order.id || '') + (payment.conversationId ? '&conversation=' + encodeURIComponent(payment.conversationId) : ''),
      actionLabel: 'Acompanhar atendimento',
      read: false
    });
  }

  function createCompletionRequested(order, payment, options) {
    order = order || {};
    payment = payment || {};
    options = options || {};
    var conversation = options.conversation || {};
    var actor = options.actor || getCurrentUser() || {};
    var recipientId = normalizeText(order.clientId || payment.clientId || conversation.clientId || '');
    if (!recipientId) return Promise.resolve(null);
    var serviceTitle = normalizeText(order.serviceTitle || order.title || conversation.serviceTitle || 'Pedido');

    return create({
      type: 'completion_requested',
      category: 'orders',
      userId: recipientId,
      actorId: actor.id || order.professionalId || order.providerId || '',
      actorName: actor.name || order.professionalName || 'Profissional Doke',
      orderId: order.id || payment.orderId || conversation.orderId || '',
      conversationId: payment.conversationId || conversation.id || '',
      messageId: payment.messageId || payment.chargeMessageId || '',
      serviceId: order.serviceId || conversation.serviceId || '',
      eventKey: ['completion_requested', order.id || payment.orderId || '', recipientId].filter(Boolean).join(':'),
      title: 'Confirme a conclusão do serviço',
      body: (actor.name || order.professionalName || 'O profissional') + ' informou que "' + serviceTitle + '" foi concluído. Confirme a entrega ou relate um problema.',
      targetUrl: 'mensagens.html?order=' + encodeURIComponent(order.id || payment.orderId || '') + (conversation.id ? '&conversation=' + encodeURIComponent(conversation.id) : ''),
      actionLabel: 'Revisar conclusão',
      read: false
    });
  }

  function createDisputeOpened(order, payment, dispute, options) {
    order = order || {};
    payment = payment || {};
    dispute = dispute || {};
    options = options || {};
    var actor = options.actor || getCurrentUser() || {};
    var professionalId = normalizeText(order.professionalId || order.providerId || payment.professionalId || dispute.professionalId || '');
    var clientId = normalizeText(order.clientId || payment.clientId || dispute.clientId || actor.id || '');
    var orderId = normalizeText(order.id || payment.orderId || dispute.orderId || '');
    var conversationId = normalizeText(payment.conversationId || dispute.conversationId || '');
    var targetUrl = 'mensagens.html?order=' + encodeURIComponent(orderId) + (conversationId ? '&conversation=' + encodeURIComponent(conversationId) : '');
    var tasks = [];

    if (professionalId) {
      tasks.push(create({
        type: 'order_dispute_opened',
        category: 'orders',
        userId: professionalId,
        actorId: actor.id || clientId,
        actorName: actor.name || order.clientName || 'Cliente Doke',
        orderId: orderId,
        conversationId: conversationId,
        messageId: payment.messageId || payment.chargeMessageId || dispute.messageId || '',
        eventKey: ['order_dispute_opened', dispute.id || orderId, professionalId].filter(Boolean).join(':'),
        title: 'Pedido em contestação',
        body: 'O cliente relatou um problema. O pagamento permanece congelado até a análise.',
        targetUrl: targetUrl,
        actionLabel: 'Responder contestação',
        read: false
      }));
    }

    if (clientId) {
      tasks.push(create({
        type: 'order_dispute_reported',
        category: 'orders',
        userId: clientId,
        actorId: professionalId,
        actorName: 'Doke Financeiro',
        orderId: orderId,
        conversationId: conversationId,
        messageId: payment.messageId || payment.chargeMessageId || dispute.messageId || '',
        eventKey: ['order_dispute_reported', dispute.id || orderId, clientId].filter(Boolean).join(':'),
        title: 'Relato enviado',
        body: 'Seu relato foi registrado. O pagamento continuará em garantia durante a análise.',
        targetUrl: targetUrl,
        actionLabel: 'Acompanhar contestação',
        read: false
      }));
    }

    return Promise.all(tasks);
  }

  function createDisputeResponded(order, payment, dispute, options) {
    order = order || {};
    payment = payment || {};
    dispute = dispute || {};
    options = options || {};
    var actor = options.actor || getCurrentUser() || {};
    var clientId = normalizeText(order.clientId || payment.clientId || dispute.clientId || '');
    if (!clientId) return Promise.resolve([]);
    var orderId = normalizeText(order.id || payment.orderId || dispute.orderId || '');
    var conversationId = normalizeText(payment.conversationId || dispute.conversationId || '');
    return Promise.all([create({
      type: 'order_dispute_response',
      category: 'orders',
      userId: clientId,
      actorId: actor.id || order.professionalId || order.providerId || '',
      actorName: actor.name || order.professionalName || 'Profissional Doke',
      orderId: orderId,
      conversationId: conversationId,
      messageId: payment.messageId || payment.chargeMessageId || dispute.messageId || '',
      eventKey: ['order_dispute_response', dispute.id || orderId, clientId].filter(Boolean).join(':'),
      title: 'Profissional respondeu',
      body: 'A resposta foi registrada. O pagamento continua congelado enquanto o suporte analisa o caso.',
      targetUrl: 'mensagens.html?order=' + encodeURIComponent(orderId) + (conversationId ? '&conversation=' + encodeURIComponent(conversationId) : ''),
      actionLabel: 'Ver resposta',
      read: false
    })]);
  }

  function createDisputeResolved(order, payment, dispute, options) {
    order = order || {};
    payment = payment || {};
    dispute = dispute || {};
    options = options || {};
    var resolution = normalizeText(options.resolution || dispute.resolution || '').toLowerCase();
    var clientWon = resolution === 'cliente' || resolution === 'client';
    var clientId = normalizeText(order.clientId || payment.clientId || dispute.clientId || '');
    var professionalId = normalizeText(order.professionalId || order.providerId || payment.professionalId || dispute.professionalId || '');
    var orderId = normalizeText(order.id || payment.orderId || dispute.orderId || '');
    var conversationId = normalizeText(payment.conversationId || dispute.conversationId || '');
    var targetUrl = 'mensagens.html?order=' + encodeURIComponent(orderId) + (conversationId ? '&conversation=' + encodeURIComponent(conversationId) : '');
    var title = clientWon ? 'Cliente reembolsado' : 'Repasse liberado';
    var body = clientWon
      ? 'A contestação foi encerrada com reembolso ao cliente.'
      : 'A contestação foi encerrada e o pagamento foi liberado ao profissional.';
    var tasks = [];

    [clientId, professionalId].filter(Boolean).forEach(function (recipientId) {
      tasks.push(create({
        type: 'order_dispute_resolved',
        category: 'orders',
        userId: recipientId,
        actorId: options.actor && options.actor.id || '',
        actorName: 'Doke Financeiro',
        orderId: orderId,
        conversationId: conversationId,
        messageId: payment.messageId || payment.chargeMessageId || dispute.messageId || '',
        eventKey: ['order_dispute_resolved', dispute.id || orderId, resolution || 'resolved', recipientId].filter(Boolean).join(':'),
        title: title,
        body: body,
        targetUrl: targetUrl,
        actionLabel: 'Ver resolução',
        read: false
      }));
    });

    return Promise.all(tasks);
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
    createPaymentHeld: createPaymentHeld,
    createCompletionRequested: createCompletionRequested,
    createDisputeOpened: createDisputeOpened,
    createDisputeResponded: createDisputeResponded,
    createDisputeResolved: createDisputeResolved,
    createOrderReviewed: createOrderReviewed,
    createMessageReceived: createMessageReceived,
    markAsRead: markAsRead,
    dismiss: dismiss,
    markAllAsRead: markAllAsRead,
    unreadCount: unreadCount
  });
})();
