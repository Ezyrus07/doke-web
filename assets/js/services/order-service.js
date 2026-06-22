(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});

  function loadOrders() {
    if (!Doke.mockData || typeof Doke.mockData.load !== 'function') return Promise.resolve([]);
    return Doke.mockData.load('orders');
  }

  function list(filters) {
    filters = filters || {};
    return loadOrders().then(function (orders) {
      return (orders || []).filter(function (order) {
        if (filters.status && order.status !== filters.status) return false;
        if (filters.clientId && order.clientId !== filters.clientId) return false;
        if (filters.professionalId && order.professionalId !== filters.professionalId) return false;
        return true;
      });
    });
  }

  function getById(orderId) {
    return loadOrders().then(function (orders) {
      return (orders || []).find(function (order) { return order.id === orderId; }) || null;
    });
  }

  function summary() {
    return loadOrders().then(function (orders) {
      return (orders || []).reduce(function (result, order) {
        result.total += 1;
        result.byStatus[order.status] = (result.byStatus[order.status] || 0) + 1;
        return result;
      }, { total: 0, byStatus: {} });
    });
  }

  if (!services.orders || typeof services.orders.create !== 'function') {
    services.orders = Object.freeze({ list: list, getById: getById, summary: summary });
  }
})();
