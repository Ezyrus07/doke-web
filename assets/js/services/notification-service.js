(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});

  function loadNotifications() {
    if (!Doke.mockData || typeof Doke.mockData.load !== 'function') return Promise.resolve([]);
    return Doke.mockData.load('notifications');
  }

  function list(filters) {
    filters = filters || {};
    return loadNotifications().then(function (notifications) {
      return (notifications || []).filter(function (notification) {
        if (filters.read === true && notification.read !== true) return false;
        if (filters.read === false && notification.read !== false) return false;
        if (filters.type && notification.type !== filters.type) return false;
        return true;
      });
    });
  }

  function unreadCount() {
    return list({ read: false }).then(function (notifications) { return notifications.length; });
  }

  services.notifications = Object.freeze({ list: list, unreadCount: unreadCount });
})();
