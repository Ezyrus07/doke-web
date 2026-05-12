(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var LIST_STATES = ['idle', 'loading', 'empty', 'error', 'ready'];

  function includes(list, value) {
    return list.indexOf(value) !== -1;
  }

  function normalizeListState(state) {
    return includes(LIST_STATES, state) ? state : 'idle';
  }

  function toggleHidden(node, shouldHide) {
    if (!node) return;
    node.hidden = Boolean(shouldHide);
  }

  function setListState(region, state, options) {
    options = options || {};
    if (!region) return null;

    var nextState = normalizeListState(state);
    region.dataset.state = nextState;
    region.setAttribute('aria-busy', nextState === 'loading' ? 'true' : 'false');

    var list = region.querySelector('[data-list]');
    var loading = region.querySelector('[data-list-loading]');
    var empty = region.querySelector('[data-list-empty]');
    var error = region.querySelector('[data-list-error]');

    toggleHidden(list, includes(['loading', 'empty', 'error'], nextState));
    toggleHidden(loading, nextState !== 'loading');
    toggleHidden(empty, nextState !== 'empty');
    toggleHidden(error, nextState !== 'error');

    if (options.message) {
      var target = region.querySelector('[data-list-' + nextState + '-message]');
      if (target) target.textContent = options.message;
    }

    return nextState;
  }

  function updateListStateFromItems(region, items, options) {
    options = options || {};
    if (!Array.isArray(items)) {
      return setListState(region, 'error', options.error ? { message: options.error } : {});
    }

    if (items.length === 0) {
      return setListState(region, 'empty', options.empty ? { message: options.empty } : {});
    }

    return setListState(region, 'ready');
  }

  function clearList(listNode) {
    if (!listNode) return;
    listNode.replaceChildren();
  }

  function appendListItems(listNode, nodes) {
    if (!listNode || !Array.isArray(nodes)) return;
    var fragment = document.createDocumentFragment();
    nodes.filter(Boolean).forEach(function (node) {
      fragment.appendChild(node);
    });
    listNode.appendChild(fragment);
  }

  Doke.listState = Object.freeze({
    normalizeListState: normalizeListState,
    setListState: setListState,
    updateListStateFromItems: updateListStateFromItems,
    clearList: clearList,
    appendListItems: appendListItems
  });
})();
