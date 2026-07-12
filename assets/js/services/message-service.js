/* Doke Message Service
   Responsibility: conversation business rules for order-linked messaging. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var services = Doke.services || (Doke.services = {});

  function getRepository() {
    return Doke.repositories && Doke.repositories.messages;
  }

  function getRepositoryBoundary() {
    return Doke.repositoryBoundary && typeof Doke.repositoryBoundary === 'object'
      ? Doke.repositoryBoundary
      : null;
  }

  function clone(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function getMessagesProviderStatus() {
    var boundary = getRepositoryBoundary();
    var status = boundary && typeof boundary.getDataProviderStatus === 'function'
      ? boundary.getDataProviderStatus()
      : null;
    var activeProvider = status && status.activeProvider || 'mock';
    var apiReady = status ? status.apiReady === true : false;

    return Object.freeze({
      domain: 'messages',
      activeProvider: activeProvider,
      requestedProvider: status && status.requestedProvider || activeProvider,
      apiReady: apiReady,
      messagesApiActive: activeProvider === 'api' && apiReady,
      fallbackProvider: 'local-mock'
    });
  }

  function shouldUseMessagesApi() {
    return getMessagesProviderStatus().messagesApiActive === true;
  }

  function normalizeConversationFromProvider(conversation) {
    if (!conversation) return conversation;
    var repository = getRepository();
    if (repository && typeof repository.normalize === 'function') return repository.normalize(conversation);
    return clone(conversation);
  }

  function normalizeConversationsFromProvider(payload) {
    var items = Array.isArray(payload)
      ? payload
      : payload && Array.isArray(payload.items)
        ? payload.items
        : payload && Array.isArray(payload.conversations)
          ? payload.conversations
          : [];
    return items.map(normalizeConversationFromProvider);
  }

  function normalizeMessageFromProvider(payload, conversation) {
    var message = payload && (payload.message || payload.item) || payload || null;
    if (!message) return null;
    var repository = getRepository();
    if (repository && typeof repository.normalizeMessage === 'function') {
      return repository.normalizeMessage(message, conversation || { id: message.conversationId || '' });
    }
    return clone(message);
  }

  function messagesBoundaryList(filters) {
    var boundary = getRepositoryBoundary();
    if (!boundary || typeof boundary.list !== 'function') return Promise.reject(new Error('Messages API boundary indisponível.'));
    return boundary.list('conversations', scopeApiFilters(filters || {})).then(normalizeConversationsFromProvider);
  }

  function messagesBoundaryGetById(conversationId) {
    var boundary = getRepositoryBoundary();
    if (!boundary || typeof boundary.getById !== 'function') return Promise.reject(new Error('Messages API boundary indisponível.'));
    return boundary.getById('conversations', conversationId).then(normalizeConversationFromProvider);
  }

  function messagesBoundaryCreateForOrder(order, options) {
    var boundary = getRepositoryBoundary();
    if (!boundary || typeof boundary.action !== 'function') return Promise.reject(new Error('Messages API boundary indisponível.'));
    var payload = Object.assign({}, options || {}, {
      id: order && (order.id || order.orderId) || options && options.orderId || '',
      orderId: order && (order.id || order.orderId) || options && options.orderId || '',
      order: clone(order || {}),
      actorId: (getCurrentUser() || {}).id || '',
      actorRole: (getCurrentUser() || {}).role || 'guest'
    });
    return boundary.action('conversations', 'createForOrder', payload).then(function (response) {
      return normalizeConversationFromProvider(response && response.conversation || response);
    });
  }

  function messagesBoundaryUpdateOrder(order, options) {
    var boundary = getRepositoryBoundary();
    if (!boundary || typeof boundary.action !== 'function') return Promise.reject(new Error('Messages API boundary indisponível.'));
    var payload = Object.assign({}, options || {}, {
      id: order && (order.conversationId || order.id || order.orderId) || options && options.conversationId || '',
      orderId: order && (order.id || order.orderId) || options && options.orderId || '',
      order: clone(order || {}),
      actorId: (getCurrentUser() || {}).id || '',
      actorRole: (getCurrentUser() || {}).role || 'guest'
    });
    return boundary.action('conversations', 'updateOrder', payload).then(function (response) {
      return normalizeConversationFromProvider(response && response.conversation || response);
    });
  }

  function messagesBoundarySendMessage(conversationId, payload) {
    var boundary = getRepositoryBoundary();
    if (!boundary || typeof boundary.action !== 'function') return Promise.reject(new Error('Messages API boundary indisponível.'));
    var nextPayload = Object.assign({}, payload || {}, {
      id: conversationId,
      conversationId: conversationId,
      actorId: (getCurrentUser() || {}).id || '',
      actorRole: (getCurrentUser() || {}).role || 'guest'
    });
    return boundary.action('conversations', 'sendMessage', nextPayload).then(function (response) {
      return normalizeMessageFromProvider(response && response.message || response, { id: conversationId });
    });
  }

  function messagesBoundaryMarkAsRead(conversationId) {
    var boundary = getRepositoryBoundary();
    if (!boundary || typeof boundary.action !== 'function') return Promise.reject(new Error('Messages API boundary indisponível.'));
    return boundary.action('conversations', 'markRead', {
      id: conversationId,
      conversationId: conversationId,
      actorId: (getCurrentUser() || {}).id || '',
      actorRole: (getCurrentUser() || {}).role || 'guest'
    }).then(function (response) {
      if (typeof response === 'boolean') return response;
      return response ? response.ok !== false : true;
    });
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
        type: 'messages_security',
        action: action,
        result: result,
        resource: 'conversation'
      }, metadata || {}));
    }
  }

  function canActorAccessConversation(actor, conversation) {
    if (!actor || !actor.id || !conversation) return false;
    if (actor.role === 'admin' || actor.role === 'support') return true;
    var actorId = String(actor.id);
    var participants = Array.isArray(conversation.participants) ? conversation.participants.map(String) : [];
    if (participants.indexOf(actorId) !== -1) return true;
    if (actor.role === 'client') return String(conversation.clientId || conversation.order && conversation.order.clientId || '') === actorId;
    if (actor.role === 'professional') {
      var professionalId = String(conversation.professionalId || conversation.order && (conversation.order.professionalId || conversation.order.providerId) || '');
      if (professionalId === actorId) return true;
      return actorId === 'user_profissional_demo' && Boolean(conversation.orderId || conversation.order && conversation.order.id);
    }
    return false;
  }

  function assertConversationAccess(conversation, action, actor) {
    var currentActor = actor || getCurrentUser() || {};
    var security = getSecurity();
    if (security && typeof security.assertResourceAccess === 'function') {
      return security.assertResourceAccess('conversation', conversation, action || 'read_conversation', currentActor);
    }
    if (!canActorAccessConversation(currentActor, conversation)) throw new Error('Você não tem permissão para acessar esta conversa.');
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

  function loadMessages() {
    var repository = getRepository();
    if (repository && typeof repository.load === 'function') return repository.load({ currentUser: false });
    if (!Doke.mockData || typeof Doke.mockData.load !== 'function') return Promise.resolve([]);
    return Doke.mockData.load('messages');
  }

  function listConversations(filters) {
    filters = filters || {};
    var actor = getCurrentUser() || {};
    var security = getSecurity();
    if (shouldUseMessagesApi()) return messagesBoundaryList(filters);

    if (filters.currentUser === false && !(security && typeof security.canAccessAdmin === 'function' && security.canAccessAdmin(actor))) {
      auditSecurity('list_all_denied', 'denied', { actor: actor, reason: 'currentUser_false_requires_admin' });
      return Promise.resolve([]);
    }

    var repository = getRepository();
    if (repository && typeof repository.list === 'function') {
      return repository.list(filters).then(function (threads) {
        if (filters.currentUser === false || !security || typeof security.canAccessConversation !== 'function') return threads;
        return (threads || []).filter(function (thread) { return security.canAccessConversation(actor, thread, 'read_conversation'); });
      });
    }

    return loadMessages().then(function (threads) {
      return (threads || []).filter(function (thread) {
        if (filters.userId && (thread.participants || []).indexOf(filters.userId) === -1) return false;
        if (filters.orderId && thread.orderId !== filters.orderId) return false;
        return !security || typeof security.canAccessConversation !== 'function' || security.canAccessConversation(actor, thread, 'read_conversation');
      });
    });
  }

  function listLocalConversations(filters) {
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

  function getConversationById(conversationId) {
    if (!conversationId) return Promise.resolve(null);
    var actor = getCurrentUser() || {};
    if (shouldUseMessagesApi()) {
      return messagesBoundaryGetById(conversationId).then(function (conversation) {
        if (conversation) assertConversationAccess(conversation, 'read_conversation', actor);
        return conversation;
      });
    }
    var repository = getRepository();
    if (repository && typeof repository.getById === 'function') {
      return repository.getById(conversationId).then(function (conversation) {
        if (conversation) assertConversationAccess(conversation, 'read_conversation', actor);
        return conversation;
      });
    }
    return Promise.resolve(null);
  }

  function createConversationForOrder(order, options) {
    var repository = getRepository();
    var security = getSecurity();
    var actor = getCurrentUser() || {};
    if (order && security && typeof security.canAccessOrder === 'function' && !security.canAccessOrder(actor, order, 'read_order')) {
      auditSecurity('create_for_order_denied', 'denied', { actor: actor, resourceId: order.id || '', reason: 'order_scope_mismatch' });
      return Promise.reject(security.createPermissionError ? security.createPermissionError('conversation:create_for_order', { orderId: order.id || '' }) : new Error('Você não tem permissão para abrir esta conversa.'));
    }
    if (shouldUseMessagesApi()) return messagesBoundaryCreateForOrder(order || {}, options || {});
    if (!repository || typeof repository.createForOrder !== 'function') return Promise.resolve(null);
    return repository.createForOrder(order, options || {});
  }

  function isConversationUnlocked(conversation) {
    var status = conversation && conversation.order && conversation.order.status || conversation && conversation.status || '';
    return ['conversation', 'accepted', 'responded', 'quoted', 'in_progress', 'completed'].indexOf(status) !== -1;
  }

  function updateConversationOrder(order, options) {
    var repository = getRepository();
    if (shouldUseMessagesApi()) return messagesBoundaryUpdateOrder(order || {}, options || {});
    if (!repository || typeof repository.updateOrderContext !== 'function') return Promise.resolve(null);
    return repository.updateOrderContext(order, options || {});
  }

  function dispatchMessageSent(conversationId, message) {
    return getConversationById(conversationId).then(function (conversation) {
      if (!conversation) return message;
      document.dispatchEvent(new CustomEvent('doke:message-sent', {
        detail: {
          conversation: conversation,
          message: message
        }
      }));
      return message;
    });
  }

  function commitMessageEffects(conversationId, message, options) {
    options = options || {};
    var actor = options.actor || getCurrentUser();
    var notificationsService = services.notifications;
    if (!message || !notificationsService || typeof notificationsService.createMessageReceived !== 'function') {
      return message ? dispatchMessageSent(conversationId, message) : Promise.resolve(message);
    }

    return getConversationById(conversationId).then(function (conversation) {
      if (!conversation) return message;
      return notificationsService.createMessageReceived(conversation, message, {
        actor: actor
      }).catch(function (error) {
        console.warn('[DokeMessages:createMessageNotification]', error);
        return null;
      }).then(function () {
        document.dispatchEvent(new CustomEvent('doke:message-sent', {
          detail: {
            conversation: conversation,
            message: message
          }
        }));
        return message;
      });
    });
  }

  function sendMessage(conversationId, payload) {
    payload = payload || {};
    var repository = getRepository();
    var user = getCurrentUser();
    var body = normalizeText(payload.body || payload.text || '');
    var type = payload.type || (payload.src ? 'image' : 'text');
    var deferSideEffects = payload.deferSideEffects === true;

    if (!conversationId) return Promise.reject(new Error('Conversa inválida.'));
    if (type === 'text' && !body) return Promise.reject(new Error('Escreva uma mensagem para enviar.'));

    return getConversationById(conversationId).then(function (conversationBeforeSend) {
      if (!conversationBeforeSend) throw new Error('Conversa não encontrada.');
      assertConversationAccess(conversationBeforeSend, 'send_message', user || {});
      if (!isConversationUnlocked(conversationBeforeSend)) {
        throw new Error('A conversa será liberada quando o profissional aceitar o pedido.');
      }

      var messagePayload = Object.assign({}, payload, {
        senderId: payload.senderId || user && user.id || '',
        author: payload.author || 'Você',
        body: payload.body || body,
        text: payload.text || body,
        type: type,
        mine: payload.mine !== false,
        read: true
      });
      delete messagePayload.deferSideEffects;

      if (shouldUseMessagesApi()) return messagesBoundarySendMessage(conversationId, messagePayload);
      if (!repository || typeof repository.addMessage !== 'function') return Promise.resolve(null);
      return repository.addMessage(conversationId, messagePayload);
    }).then(function (message) {
      if (deferSideEffects) return message;
      return commitMessageEffects(conversationId, message, { actor: user });
    });
  }

  function removeMessage(conversationId, messageId) {
    if (!conversationId || !messageId) return Promise.resolve(false);
    var actor = getCurrentUser() || {};
    return getConversationById(conversationId).then(function (conversation) {
      if (!conversation) return false;
      assertConversationAccess(conversation, 'send_message', actor);
      var message = (conversation.messages || []).find(function (item) {
        return String(item && (item.id || item.messageId) || '') === String(messageId);
      });
      if (!message) return false;
      var canRemove = actor.role === 'admin' || actor.role === 'support' || String(message.senderId || '') === String(actor.id || '');
      if (!canRemove) throw new Error('Você não tem permissão para remover esta mensagem.');
      if (shouldUseMessagesApi()) {
        throw new Error('Remoção compensatória de mensagem ainda não está disponível no provider de API.');
      }
      var repository = getRepository();
      if (!repository || typeof repository.removeMessage !== 'function') return false;
      return repository.removeMessage(conversationId, messageId);
    }).then(function (removed) {
      if (removed) {
        document.dispatchEvent(new CustomEvent('doke:message-removed', {
          detail: { conversationId: conversationId, messageId: messageId }
        }));
      }
      return removed;
    });
  }

  function markAsRead(conversationId) {
    if (!conversationId) return Promise.resolve(false);
    var actor = getCurrentUser() || {};
    if (shouldUseMessagesApi()) {
      return getConversationById(conversationId).then(function (conversation) {
        if (conversation) assertConversationAccess(conversation, 'mark_conversation_read', actor);
        return messagesBoundaryMarkAsRead(conversationId);
      });
    }
    var repository = getRepository();
    if (!repository || typeof repository.markAsRead !== 'function') return Promise.resolve(false);
    return getConversationById(conversationId).then(function (conversation) {
      if (conversation) assertConversationAccess(conversation, 'mark_conversation_read', actor);
      return repository.markAsRead(conversationId);
    });
  }

  function unreadCount(userId) {
    return listConversations({ userId: userId }).then(function (threads) {
      return (threads || []).reduce(function (sum, thread) { return sum + Number(thread.unreadCount || thread.unread || 0); }, 0);
    });
  }

  services.messages = Object.freeze({
    provider: getMessagesProviderStatus().activeProvider,
    getMessagesProviderStatus: getMessagesProviderStatus,
    listConversations: listConversations,
    listLocalConversations: listLocalConversations,
    getConversationById: getConversationById,
    createConversationForOrder: createConversationForOrder,
    updateConversationOrder: updateConversationOrder,
    sendMessage: sendMessage,
    commitMessageEffects: commitMessageEffects,
    removeMessage: removeMessage,
    markAsRead: markAsRead,
    unreadCount: unreadCount
  });
})();
