/* Doke Home Favorites Surface
   Responsibility: expose the authenticated user's saved approved services on index.html.
   Authority: serviceFavoritesController snapshot + canonical services catalog. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var renderPromise = null;
  var catalog = [];
  var catalogPromise = null;

  function normalize(value) {
    return String(value || '').trim();
  }

  function canonicalIds(item) {
    item = item || {};
    return [item.serviceId, item.remoteId, item.remote_id, item.id, item.externalId, item.external_id]
      .map(normalize)
      .filter(Boolean);
  }

  function currentUser() {
    try {
      return Doke.session && typeof Doke.session.getCurrentUser === 'function'
        ? Doke.session.getCurrentUser()
        : null;
    } catch (_error) {
      return null;
    }
  }

  function nodes() {
    return {
      section: document.querySelector('[data-home-favorites-surface]'),
      grid: document.querySelector('[data-home-favorites-grid]'),
      count: document.querySelector('[data-home-favorites-count]')
    };
  }

  function controller() {
    var api = Doke.serviceFavoritesController;
    if (!api || typeof api.ensureLoaded !== 'function') {
      var error = new Error('Controlador canônico de favoritos não carregado.');
      error.code = 'DOKE_HOME_FAVORITES_CONTROLLER_UNAVAILABLE';
      throw error;
    }
    return api;
  }

  function servicesApi() {
    var api = Doke.services && Doke.services.services;
    if (!api || typeof api.list !== 'function') {
      var error = new Error('Catálogo canônico não carregado para favoritos da página inicial.');
      error.code = 'DOKE_HOME_FAVORITES_CATALOG_UNAVAILABLE';
      throw error;
    }
    return api;
  }

  function loadCatalog(force) {
    if (catalog.length && !force) return Promise.resolve(catalog.slice());
    if (catalogPromise && !force) return catalogPromise;
    catalogPromise = Promise.resolve(servicesApi().list({
      status: 'active',
      fresh: Boolean(force),
      sort: 'updated_desc'
    })).then(function (items) {
      catalog = (Array.isArray(items) ? items : []).filter(function (item) {
        return String(item && item.status || 'active').toLowerCase() === 'active';
      });
      return catalog.slice();
    }).finally(function () {
      catalogPromise = null;
    });
    return catalogPromise;
  }

  function render(options) {
    options = options || {};
    var ui = nodes();
    if (!ui.section || !ui.grid) return Promise.resolve(0);

    if (!currentUser()) {
      ui.section.hidden = true;
      ui.grid.textContent = '';
      if (ui.count) ui.count.textContent = '0';
      return Promise.resolve(0);
    }

    if (renderPromise && !options.force) return renderPromise;
    renderPromise = Promise.all([
      controller().ensureLoaded({ force: Boolean(options.forceFavorites) }),
      loadCatalog(Boolean(options.forceCatalog))
    ]).then(function (values) {
      var favoriteIds = values[0] instanceof Set ? values[0] : new Set(values[0] || []);
      var services = values[1].filter(function (item) {
        return canonicalIds(item).some(function (id) { return favoriteIds.has(id); });
      }).slice(0, 6);

      ui.grid.textContent = '';
      services.forEach(function (item) {
        if (Doke.publicServiceCard && typeof Doke.publicServiceCard.create === 'function') {
          ui.grid.appendChild(Doke.publicServiceCard.create(item));
        }
      });
      if (ui.count) ui.count.textContent = String(services.length);
      ui.section.hidden = services.length === 0;
      controller().hydrate(ui.grid);
      document.dispatchEvent(new CustomEvent('doke:home-favorites-rendered', {
        detail: { count: services.length, favoriteIds: Array.from(favoriteIds) }
      }));
      return services.length;
    }).catch(function (error) {
      ui.section.hidden = true;
      document.dispatchEvent(new CustomEvent('doke:home-favorites-error', {
        detail: { code: error && error.code || 'DOKE_HOME_FAVORITES_FAILED', error: error && error.message || '' }
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
    render({ force: true, forceFavorites: false, forceCatalog: false });
  });
  document.addEventListener('doke:service-favorites-loaded', function () {
    render();
  });
  document.addEventListener('doke:auth-session-change', function () {
    render({ force: true, forceFavorites: true, forceCatalog: false });
  });
  root.addEventListener('online', function () {
    render({ force: true, forceFavorites: true, forceCatalog: true });
  });

  Doke.homeFavoritesSurface = Object.freeze({ render: render, boot: boot });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();