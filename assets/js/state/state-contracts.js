(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var VALID_STATES = ['idle', 'loading', 'empty', 'error', 'ready'];

  function resolve(root) {
    if (!root) return null;
    return typeof root === 'string' ? document.querySelector(root) : root;
  }

  function isValidState(state) {
    return VALID_STATES.indexOf(state) !== -1;
  }

  function setHidden(node, shouldHide) {
    if (!node) return;
    node.hidden = Boolean(shouldHide);
  }

  function syncRegion(boundary, state, message) {
    var region = boundary.querySelector('[data-state-region]');
    if (!region) return;

    var loading = region.querySelector('[data-state-loading]');
    var empty = region.querySelector('[data-state-empty]');
    var error = region.querySelector('[data-state-error]');

    setHidden(loading, state !== 'loading');
    setHidden(empty, state !== 'empty');
    setHidden(error, state !== 'error');

    if (message) {
      var target = state === 'error' ? error : state === 'empty' ? empty : loading;
      if (target) target.textContent = message;
    }
  }

  function setBoundaryState(root, state, message) {
    var boundary = resolve(root);
    if (!boundary || !isValidState(state)) return false;

    boundary.setAttribute('data-view-state', state);
    boundary.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
    syncRegion(boundary, state, message);
    return true;
  }

  function setActionState(action, state, label) {
    var node = resolve(action);
    if (!node || !isValidState(state)) return false;

    node.setAttribute('data-action-state', state);
    if (state === 'loading') {
      node.setAttribute('aria-busy', 'true');
      if ('disabled' in node) node.disabled = true;
      if (label) node.setAttribute('aria-label', label);
    } else {
      node.setAttribute('aria-busy', 'false');
      if ('disabled' in node) node.disabled = false;
    }
    return true;
  }

  function initializeBoundaries() {
    document.querySelectorAll('[data-state-boundary]').forEach(function (boundary) {
      if (!boundary.hasAttribute('data-view-state')) {
        boundary.setAttribute('data-view-state', 'idle');
      }
      if (!boundary.hasAttribute('aria-busy')) {
        boundary.setAttribute('aria-busy', 'false');
      }
      syncRegion(boundary, boundary.getAttribute('data-view-state') || 'idle');
    });
  }

  Doke.stateContracts = Object.freeze({
    states: VALID_STATES.slice(),
    init: initializeBoundaries,
    setBoundaryState: setBoundaryState,
    setActionState: setActionState
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBoundaries, { once: true });
  } else {
    initializeBoundaries();
  }
})();
