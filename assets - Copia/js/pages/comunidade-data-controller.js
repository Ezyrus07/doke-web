(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  function toArray(collection) {
    return Array.prototype.slice.call(collection || []);
  }

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getRoot() {
    return document.querySelector('[data-communities-page-root]') || document.querySelector('[data-communities-page]') || document.body;
  }

  function getSearchValue() {
    var params = new URLSearchParams(window.location.search || '');
    var query = params.get('q') || params.get('search') || '';
    var input = document.querySelector('[data-community-search]') || document.querySelector('[data-community-search-mobile]');
    return query || (input && input.value) || '';
  }

  function getActiveCategory() {
    var params = new URLSearchParams(window.location.search || '');
    var category = params.get('category') || params.get('categoria') || '';
    var active = document.querySelector('[data-community-filter].is-active');
    return category || (active && active.getAttribute('data-community-filter')) || 'all';
  }

  function setState(state) {
    var root = getRoot();
    if (root) root.setAttribute('data-state', state);
    if (document.body) document.body.setAttribute('data-data-state', state);
  }

  function dispatch(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function annotateExistingCards() {
    var cards = toArray(document.querySelectorAll('[data-community-card], [data-community-discover-card]'));
    cards.forEach(function (card, index) {
      if (!card.hasAttribute('data-card-kind')) card.setAttribute('data-card-kind', 'community');
      if (!card.hasAttribute('data-community-id')) {
        var title = card.getAttribute('data-title') || (card.querySelector('h3') && card.querySelector('h3').textContent) || 'community-' + (index + 1);
        card.setAttribute('data-community-id', normalizeText(title).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'community-' + (index + 1));
      }
    });
  }

  function prepareListHooks() {
    annotateExistingCards();
    toArray(document.querySelectorAll('[data-community-grid], [data-community-continue-list], [data-community-ranking]')).forEach(function (list) {
      if (!list.hasAttribute('data-list-kind')) list.setAttribute('data-list-kind', 'communities');
    });
  }

  function loadCommunities(filters) {
    if (Doke.services && Doke.services.communities && typeof Doke.services.communities.list === 'function') {
      return Doke.services.communities.list(filters);
    }

    if (Doke.mockData && typeof Doke.mockData.load === 'function') {
      return Doke.mockData.load('communities');
    }

    return Promise.resolve([]);
  }

  function init() {
    var root = getRoot();
    if (!root) return;

    var filters = {
      query: getSearchValue(),
      category: getActiveCategory()
    };

    setState('loading');
    prepareListHooks();

    loadCommunities(filters)
      .then(function (communities) {
        setState('ready');
        dispatch('doke:communities-data-ready', {
          page: 'comunidade',
          filters: filters,
          communities: communities || [],
          total: (communities || []).length
        });
      })
      .catch(function (error) {
        setState('error');
        dispatch('doke:communities-data-error', {
          page: 'comunidade',
          filters: filters,
          error: error
        });
      });
  }

  Doke.communitiesDataController = Object.freeze({ init: init });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
