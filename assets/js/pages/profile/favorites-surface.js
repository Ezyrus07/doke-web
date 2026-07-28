/* Doke Profile Favorites Surface
   Responsibility: render the authenticated user's saved services from two batched authorities:
   one favorites list read and one approved service catalog read. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var catalog = [];
  var catalogPromise = null;
  var renderPromise = null;

  function nodes() {
    return {
      section: document.querySelector('[data-profile-favorites-surface]'),
      grid: document.querySelector('[data-profile-favorites-grid]'),
      loading: document.querySelector('[data-profile-favorites-loading]'),
      empty: document.querySelector('[data-profile-favorites-empty]'),
      error: document.querySelector('[data-profile-favorites-error]'),
      count: document.querySelector('[data-profile-favorites-count]')
    };
  }

  function setState(state, message) {
    var ui = nodes();
    if (!ui.section) return;
    ui.section.dataset.favoritesState = state;
    if (ui.loading) ui.loading.hidden = state !== 'loading';
    if (ui.empty) ui.empty.hidden = state !== 'empty';
    if (ui.error) {
      ui.error.hidden = state !== 'error';
      if (message) ui.error.textContent = message;
    }
    if (ui.grid) ui.grid.hidden = state !== 'ready';
  }

  function servicesApi() {
    var api = Doke.services && Doke.services.services;
    if (!api || typeof api.list !== 'function') {
      var error = new Error('Catálogo aprovado não carregado para a área de favoritos.');
      error.code = 'DOKE_FAVORITES_CATALOG_UNAVAILABLE';
      throw error;
    }
    return api;
  }

  function controller() {
    var api = Doke.serviceFavoritesController;
    if (!api) {
      var error = new Error('Controlador canônico de favoritos não carregado.');
      error.code = 'DOKE_FAVORITES_CONTROLLER_UNAVAILABLE';
      throw error;
    }
    return api;
  }

  function ensureCatalog(options) {
    options = options || {};
    if (catalog.length && !options.force) return Promise.resolve(catalog.slice());
    if (catalogPromise && !options.force) return catalogPromise;
    catalogPromise = Promise.resolve(servicesApi().list({ status: 'active', fresh: Boolean(options.force), sort: 'updated_desc' }))
      .then(function (items) {
        catalog = (Array.isArray(items) ? items : []).filter(function (item) {
          return String(item && item.status || 'active').toLowerCase() === 'active';
        });
        return catalog.slice();
      })
      .finally(function () { catalogPromise = null; });
    return catalogPromise;
  }

  function render(options) {
    options = options || {};
    var ui = nodes();
    if (!ui.section || !ui.grid) return Promise.resolve(0);
    if (renderPromise && !options.force) return renderPromise;
    setState('loading');

    renderPromise = Promise.all([
      controller().ensureLoaded({ force: Boolean(options.forceFavorites) }),
      ensureCatalog({ force: Boolean(options.forceCatalog) })
    ]).then(function (values) {
      var favoriteIds = values[0] instanceof Set ? values[0] : new Set(values[0] || []);
      var services = values[1].filter(function (item) { return favoriteIds.has(String(item && item.id || '').trim()); });
      ui.grid.textContent = '';
      services.forEach(function (item) {
        if (Doke.publicServiceCard && typeof Doke.publicServiceCard.create === 'function') {
          ui.grid.appendChild(Doke.publicServiceCard.create(item, { results: true }));
        }
      });
      if (ui.count) ui.count.textContent = String(services.length);
      setState(services.length ? 'ready' : 'empty');
      controller().hydrate(ui.grid);
      document.dispatchEvent(new CustomEvent('doke:profile-favorites-rendered', {
        detail: { count: services.length, favoriteIds: Array.from(favoriteIds) }
      }));
      return services.length;
    }).catch(function (error) {
      setState('error', 'Não foi possível carregar seus favoritos agora.');
      document.dispatchEvent(new CustomEvent('doke:profile-favorites-error', {
        detail: { code: error && error.code || 'DOKE_PROFILE_FAVORITES_FAILED', error: error && error.message || '' }
      }));
      return 0;
    }).finally(function () {
      renderPromise = null;
    });
    return renderPromise;
  }

  function boot() {
    if (!nodes().section) return;
    render();
  }

  document.addEventListener('doke:service-favorite-changed', function () {
    render();
  });
  document.addEventListener('doke:service-favorites-loaded', function () {
    render();
  });
  root.addEventListener('online', function () {
    render({ force: true, forceFavorites: true, forceCatalog: true });
  });

  Doke.profileFavoritesSurface = Object.freeze({
    boot: boot,
    render: render,
    ensureCatalog: ensureCatalog,
    getCatalogSnapshot: function () { return catalog.slice(); }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
