/* Doke Profile Favorites Surface
   Responsibility: render the authenticated user's saved services from two batched authorities:
   one favorites list read and one approved service catalog read. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var catalog = [];
  var catalogPromise = null;
  var catalogAuthorityPromise = null;
  var renderPromise = null;
  var CATALOG_MODULES = [
    {
      key: 'services-repository',
      src: 'assets/js/repositories/services-repository.js?v=20260720-moderation-flow-v1',
      ready: function () { return Boolean(Doke.repositories && Doke.repositories.services); }
    },
    {
      key: 'services-service',
      src: 'assets/js/services/services-service.js?v=20260720-moderation-flow-v1',
      ready: function () { return Boolean(Doke.services && Doke.services.services); }
    }
  ];

  function ensurePlacement() {
    var section = document.querySelector('[data-profile-favorites-surface]');
    var feed = section && section.closest('.profile-feed');
    if (feed && feed.lastElementChild !== section) feed.appendChild(section);

    var tab = document.querySelector('.profile-tabs [aria-controls="profile-favorites"]');
    var nav = tab && tab.parentElement;
    if (nav && nav.lastElementChild !== tab) nav.appendChild(tab);
    return Boolean(section);
  }

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

  function ensureScript(module) {
    if (module.ready()) return Promise.resolve();
    var selector = 'script[data-doke-module="' + module.key + '"]';
    var existing = document.querySelector(selector);
    if (existing && existing.__dokeModulePromise) return existing.__dokeModulePromise;
    var script = existing || document.createElement('script');
    script.async = false;
    script.src = module.src;
    script.dataset.dokeModule = module.key;
    script.__dokeModulePromise = new Promise(function (resolve, reject) {
      function complete() {
        if (module.ready()) return resolve();
        var error = new Error('Módulo de catálogo não registrou a autoridade esperada: ' + module.key);
        error.code = 'DOKE_FAVORITES_CATALOG_MODULE_INVALID';
        reject(error);
      }
      function fail() {
        var error = new Error('Não foi possível carregar o módulo de catálogo: ' + module.key);
        error.code = 'DOKE_FAVORITES_CATALOG_MODULE_LOAD_FAILED';
        reject(error);
      }
      script.addEventListener('load', complete, { once: true });
      script.addEventListener('error', fail, { once: true });
    });
    if (!existing) document.head.appendChild(script);
    return script.__dokeModulePromise;
  }

  function ensureCatalogAuthority() {
    if (catalogAuthorityPromise) return catalogAuthorityPromise;
    catalogAuthorityPromise = CATALOG_MODULES.reduce(function (chain, module) {
      return chain.then(function () { return ensureScript(module); });
    }, Promise.resolve()).catch(function (error) {
      catalogAuthorityPromise = null;
      throw error;
    });
    return catalogAuthorityPromise;
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
    catalogPromise = ensureCatalogAuthority()
      .then(function () {
        return servicesApi().list({ status: 'active', fresh: Boolean(options.force), sort: 'updated_desc' });
      })
      .then(function (items) {
        catalog = (Array.isArray(items) ? items : []).filter(function (item) {
          return String(item && item.status || 'active').toLowerCase() === 'active';
        });
        return catalog.slice();
      })
      .finally(function () { catalogPromise = null; });
    return catalogPromise;
  }

  function serviceIdentifiers(item) {
    item = item || {};
    return [item.serviceId, item.remoteId, item.remote_id, item.id, item.externalId, item.external_id]
      .map(function (value) { return String(value || '').trim(); })
      .filter(Boolean);
  }

  function render(options) {
    options = options || {};
    ensurePlacement();
    var ui = nodes();
    if (!ui.section || !ui.grid) return Promise.resolve(0);
    if (renderPromise && !options.force) return renderPromise;
    setState('loading');

    renderPromise = Promise.all([
      controller().ensureLoaded({ force: Boolean(options.forceFavorites) }),
      ensureCatalog({ force: Boolean(options.forceCatalog) })
    ]).then(function (values) {
      var favoriteIds = values[0] instanceof Set ? values[0] : new Set(values[0] || []);
      var services = values[1].filter(function (item) {
        return serviceIdentifiers(item).some(function (id) { return favoriteIds.has(id); });
      });
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
    if (!ensurePlacement()) return;
    render();
  }

  document.addEventListener('doke:service-favorite-changed', function () {
    render({ force: true });
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
    ensurePlacement: ensurePlacement,
    ensureCatalog: ensureCatalog,
    ensureCatalogAuthority: ensureCatalogAuthority,
    getCatalogSnapshot: function () { return catalog.slice(); }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
