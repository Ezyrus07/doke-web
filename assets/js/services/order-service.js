/* Doke legacy order-service compatibility facade.
   Responsibility: delegate old consumers to the canonical orders-service.
   This file must never become a mock or persistence authority. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});
  var facade = null;

  function canonicalService() {
    var api = services.orders;
    if (api && api !== facade && api.isCanonicalOrderService === true) return api;

    var error = new Error('O serviço canônico de pedidos ainda não está disponível nesta página.');
    error.code = 'DOKE_CANONICAL_ORDERS_SERVICE_UNAVAILABLE';
    document.dispatchEvent(new CustomEvent('doke:orders-service-unavailable', {
      detail: { code: error.code, source: 'order-service-compatibility-facade' }
    }));
    throw error;
  }

  function invoke(method, args) {
    try {
      var api = canonicalService();
      if (typeof api[method] !== 'function') {
        var unsupported = new Error('O serviço canônico de pedidos não implementa ' + method + '().');
        unsupported.code = 'DOKE_CANONICAL_ORDERS_METHOD_UNAVAILABLE';
        throw unsupported;
      }
      return Promise.resolve(api[method].apply(api, args || []));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  facade = Object.freeze({
    provider: 'canonical-compatibility-facade',
    isLegacyOrderFacade: true,
    list: function (filters) { return invoke('list', [filters || {}]); },
    listForCurrentUser: function (filters) { return invoke('listForCurrentUser', [filters || {}]); },
    getById: function (orderId) { return invoke('getById', [orderId]); },
    summary: function (filters) { return invoke('summary', [filters || {}]); },
    create: function (payload) { return invoke('create', [payload || {}]); },
    updateStatus: function (orderId, status, options) { return invoke('updateStatus', [orderId, status, options || {}]); }
  });

  if (!services.orders || services.orders.isLegacyOrderFacade === true) services.orders = facade;
  services.order = facade;
})();