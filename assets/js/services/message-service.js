(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});

  function loadMessages() {
    if (!Doke.mockData || typeof Doke.mockData.load !== 'function') return Promise.resolve([]);
    return Doke.mockData.load('messages');
  }

  function listConversations(filters) {
    filters = filters || {};
    return loadMessages().then(function (threads) {
      return (threads || []).filter(function (thread) {
        if (filters.userId && (thread.participants || []).indexOf(filters.userId) === -1) return false;
        if (filters.orderId && thread.orderId !== filters.orderId) return false;
        return true;
      });
    });
  }

  function unreadCount(userId) {
    return listConversations({ userId: userId }).then(function (threads) {
      return (threads || []).reduce(function (sum, thread) { return sum + Number(thread.unreadCount || 0); }, 0);
    });
  }

  services.messages = Object.freeze({
    listConversations: listConversations,
    unreadCount: unreadCount
  });
})();
