(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  function parseFilters(search) {
    var params = new URLSearchParams(search || window.location.search || '');
    var filters = {};
    ['status', 'q', 'query', 'category'].forEach(function (key) {
      var value = params.get(key);
      if (value) filters[key] = value;
    });
    return filters;
  }

  function getRoot() {
    return document.querySelector('[data-orders-page-root]') || document.querySelector('.orders-page');
  }

  function markListHooks(root) {
    if (!root) return;

    var ordersList = root.querySelector('[data-orders-list]');
    if (ordersList) {
      ordersList.setAttribute('data-list', '');
      ordersList.setAttribute('data-list-kind', 'orders');
    }

    var agendaList = root.querySelector('[data-orders-agenda-list]');
    if (agendaList) {
      agendaList.setAttribute('data-list', '');
      agendaList.setAttribute('data-list-kind', 'order-events');
    }
  }

  function setState(root, state) {
    if (!root) return;
    root.setAttribute('data-data-state', state);
  }

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function init() {
    var root = getRoot();
    if (!root) return;

    root.setAttribute('data-page-key', 'pedidos');
    root.setAttribute('data-data-ready', 'orders');
    setState(root, 'loading');
    markListHooks(root);

    if (!Doke.pageDataOrchestrator || typeof Doke.pageDataOrchestrator.getPageData !== 'function') {
      setState(root, 'idle');
      emit('doke:orders-data-unavailable', { root: root });
      return;
    }

    Doke.pageDataOrchestrator
      .getPageData('pedidos', { filters: parseFilters() })
      .then(function (payload) {
        setState(root, 'ready');
        emit('doke:orders-data-ready', { root: root, payload: payload || {} });
      })
      .catch(function (error) {
        setState(root, 'error');
        emit('doke:orders-data-error', { root: root, error: error });
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
