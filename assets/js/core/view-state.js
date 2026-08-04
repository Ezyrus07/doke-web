(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  function contracts() {
    return Doke.stateContracts || null;
  }

  function fallbackSet(root, state, messageOrOptions) {
    var node = typeof root === 'string' ? document.querySelector(root) : root;
    if (!node) return false;

    var normalized = String(state || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    node.setAttribute('data-view-state', normalized);
    node.setAttribute('aria-busy', ['loading', 'refreshing', 'submitting', 'reconciling'].indexOf(normalized) !== -1 ? 'true' : 'false');

    var options = typeof messageOrOptions === 'string' ? { message: messageOrOptions } : messageOrOptions || {};
    var status = node.querySelector('[data-view-state-message], [data-state-message]');
    if (status && options.message) status.textContent = options.message;
    return true;
  }

  function setViewState(root, state, messageOrOptions) {
    var api = contracts();
    return api && typeof api.setBoundaryState === 'function'
      ? api.setBoundaryState(root, state, messageOrOptions)
      : fallbackSet(root, state, messageOrOptions);
  }

  function stateMethod(state, defaultMessage) {
    return function (root, messageOrOptions) {
      var options = messageOrOptions;
      if (!options && defaultMessage) options = { message: defaultMessage };
      return setViewState(root, state, options);
    };
  }

  Doke.viewState = Object.freeze({
    set: setViewState,
    loading: stateMethod('loading', 'Carregando…'),
    refreshing: stateMethod('refreshing'),
    ready: stateMethod('ready'),
    empty: stateMethod('empty', 'Nenhum item encontrado.'),
    error: stateMethod('error', 'Não foi possível carregar os dados.'),
    offline: stateMethod('offline'),
    stale: stateMethod('stale'),
    degraded: stateMethod('degraded'),
    submitting: stateMethod('submitting'),
    success: stateMethod('success'),
    unknownOutcome: stateMethod('unknown_outcome'),
    reconciling: stateMethod('reconciling'),
    conflict: stateMethod('conflict'),
    readOnly: stateMethod('read_only'),
    maintenance: stateMethod('maintenance')
  });
})();
