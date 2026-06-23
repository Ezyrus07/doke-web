(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  function setViewState(root, state, message) {
    var node = typeof root === 'string' ? document.querySelector(root) : root;
    if (!node) return false;

    node.setAttribute('data-view-state', state);
    node.toggleAttribute('aria-busy', state === 'loading');

    var status = node.querySelector('[data-view-state-message]');
    if (status && message) status.textContent = message;
    return true;
  }

  function showLoading(root, message) {
    return setViewState(root, 'loading', message || 'Carregando...');
  }

  function showEmpty(root, message) {
    return setViewState(root, 'empty', message || 'Nenhum item encontrado.');
  }

  function showError(root, message) {
    return setViewState(root, 'error', message || 'Não foi possível carregar os dados.');
  }

  function showReady(root) {
    return setViewState(root, 'ready');
  }

  Doke.viewState = Object.freeze({
    set: setViewState,
    loading: showLoading,
    empty: showEmpty,
    error: showError,
    ready: showReady
  });
})();
