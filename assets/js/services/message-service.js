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

  function loadMessages() {
    var repository = getRepository();
    if (repository && typeof repository.load === 'function') return repository.load({ currentUser: false });
    if (!Doke.mockData || typeof Doke.mockData.load !== 'function') return Promise.resolve([]);
    return Doke.mockData.load('messages');
  }

  function listConversations(filters) {
    filters = filters || {};
    var repository = getRepository();
    if (repository && typeof repository.list === 'function') return repository.list(filters);

    return loadMessages().then(function (threads) {
      return (threads || []).filter(function (thread) {
        if (filters.userId && (thread.participants || []).indexOf(filters.userId) === -1) return false;
        if (filters.orderId && thread.orderId !== filters.orderId) return false;
        return true;
      });
    });
  }

  function listLocalConversations(filters) {
    var repository = getRepository();
    if (repository && typeof repository.listLocal === 'function') return repository.listLocal(filters || {});
    return [];
  }

  function createConversationForOrder(order, options) {
    var repository = getRepository();
    if (!repository || typeof repository.createForOrder !== 'function') return Promise.resolve(null);
    return repository.createForOrder(order, options || {});
  }

  function sendMessage(conversationId, payload) {
    payload = payload || {};
    var repository = getRepository();
    var user = getCurrentUser();
    var body = String(payload.body || payload.text || '').trim();
    var type = payload.type || (payload.src ? 'image' : 'text');

    if (!repository || typeof repository.addMessage !== 'function') return Promise.resolve(null);
    if (!conversationId) return Promise.reject(new Error('Conversa inválida.'));
    if (type === 'text' && !body) return Promise.reject(new Error('Escreva uma mensagem para enviar.'));

    return repository.addMessage(conversationId, Object.assign({}, payload, {
      senderId: payload.senderId || user && user.id || '',
      author: payload.author || 'Você',
      body: payload.body || body,
      text: payload.text || body,
      type: type,
      mine: payload.mine !== false,
      read: true
    })).then(function (message) {
      var notificationsService = services.notifications;
      if (!message || !notificationsService || typeof notificationsService.createMessageReceived !== 'function') return message;

      return repository.getById(conversationId).then(function (conversation) {
        if (!conversation) return message;
        return notificationsService.createMessageReceived(conversation, message, {
          actor: user
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
    });
  }

  function markAsRead(conversationId) {
    var repository = getRepository();
    if (!repository || typeof repository.markAsRead !== 'function') return Promise.resolve(false);
    return repository.markAsRead(conversationId);
  }

  function unreadCount(userId) {
    return listConversations({ userId: userId }).then(function (threads) {
      return (threads || []).reduce(function (sum, thread) { return sum + Number(thread.unreadCount || thread.unread || 0); }, 0);
    });
  }

  services.messages = Object.freeze({
    provider: getRepository() ? 'local-mock' : 'static-mock',
    listConversations: listConversations,
    listLocalConversations: listLocalConversations,
    createConversationForOrder: createConversationForOrder,
    sendMessage: sendMessage,
    markAsRead: markAsRead,
    unreadCount: unreadCount
  });
})();
