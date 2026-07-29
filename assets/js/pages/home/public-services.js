(function () {
  'use strict';
  var Doke = window.Doke || (window.Doke = {});
  var favoritesModulePromise = null;
  window.DokeHomePublicServicesAbort?.abort();
  window.DokeHomePublicServicesAbort = new AbortController();

  function root() { return document.querySelector('[data-state-boundary="index"]'); }

  function dispatchModuleError(error) {
    document.dispatchEvent(new CustomEvent('doke:home-favorites-error', {
      detail: {
        code: error && error.code || 'DOKE_HOME_FAVORITES_MODULE_FAILED',
        error: error && error.message || 'Não foi possível carregar seus favoritos.'
      }
    }));
  }

  function ensureHomeFavoritesModule() {
    if (Doke.homeFavoritesSurface && typeof Doke.homeFavoritesSurface.boot === 'function') {
      Doke.homeFavoritesSurface.boot();
      return Promise.resolve(Doke.homeFavoritesSurface);
    }
    if (favoritesModulePromise) return favoritesModulePromise;

    var existing = document.querySelector('script[data-doke-home-favorites-module]');
    var script = existing || document.createElement('script');
    script.async = false;
    script.src = 'assets/js/pages/home/favorites-surface.js?v=20260729-search-ux02-v2';
    script.dataset.dokeHomeFavoritesModule = 'true';

    favoritesModulePromise = new Promise(function (resolve, reject) {
      function complete() {
        var api = Doke.homeFavoritesSurface;
        if (!api || typeof api.boot !== 'function') {
          var invalid = new Error('A superfície de favoritos da página inicial não registrou o contrato esperado.');
          invalid.code = 'DOKE_HOME_FAVORITES_MODULE_INVALID';
          reject(invalid);
          return;
        }
        api.boot();
        resolve(api);
      }
      function fail() {
        var error = new Error('Não foi possível carregar a superfície de favoritos da página inicial.');
        error.code = 'DOKE_HOME_FAVORITES_MODULE_LOAD_FAILED';
        reject(error);
      }
      script.addEventListener('load', complete, { once: true });
      script.addEventListener('error', fail, { once: true });
      if (existing && Doke.homeFavoritesSurface) complete();
    }).catch(function (error) {
      favoritesModulePromise = null;
      dispatchModuleError(error);
      throw error;
    });

    if (!existing) document.head.appendChild(script);
    return favoritesModulePromise;
  }

  function render(items) {
    var scope = root();
    if (!scope) return 0;
    var services = (Array.isArray(items) ? items : []).filter(function (item) {
      return String(item && item.status || 'active').toLowerCase() === 'active';
    });
    var featured = scope.querySelector('[data-home-list="featured-services"]');
    var more = scope.querySelector('[data-home-list="more-services"]');
    var moreSection = scope.querySelector('[data-home-list-region="more-services"]');
    var empty = scope.querySelector('[data-home-services-empty]');
    if (featured) {
      featured.textContent = '';
      services.slice(0, 6).forEach(function (item) {
        featured.appendChild(Doke.publicServiceCard.create(item));
      });
    }
    if (more) {
      more.textContent = '';
      services.slice(6).forEach(function (item) {
        more.appendChild(Doke.publicServiceCard.create(item, { results: true }));
      });
    }
    if (empty) empty.hidden = services.length > 0;
    if (moreSection) moreSection.hidden = services.length <= 6;
    document.dispatchEvent(new CustomEvent('doke:home-services-rendered', { detail: { count: services.length } }));
    ensureHomeFavoritesModule().catch(function () {});
    return services.length;
  }

  var refreshPromise = null;
  function refresh() {
    if (refreshPromise) return refreshPromise;
    var api = Doke.services && Doke.services.services;
    if (!api || typeof api.list !== 'function') return Promise.resolve(render([]));
    var repository = Doke.repositories && Doke.repositories.services;
    if (repository && typeof repository.clearCache === 'function') repository.clearCache();
    refreshPromise = api.list({ status: 'active', fresh: true, sort: 'updated_desc' })
      .then(render)
      .finally(function () { refreshPromise = null; });
    return refreshPromise;
  }

  function init() {
    var scope = root();
    if (!scope) return Promise.resolve(0);
    ensureHomeFavoritesModule().catch(function () {});
    if (scope.dataset.publicServicesBound !== 'true') {
      scope.dataset.publicServicesBound = 'true';
      scope.addEventListener('doke:index-data-ready', function (event) {
        render(event.detail && event.detail.data && event.detail.data.services);
      });
      document.addEventListener('doke:supabase-sdk-ready', function () {
        var current = Doke.indexDataController && Doke.indexDataController.lastPayload;
        if (!current || !current.data) refresh();
      }, { signal: window.DokeHomePublicServicesAbort && window.DokeHomePublicServicesAbort.signal });
    }
    var last = Doke.indexDataController && Doke.indexDataController.lastPayload;
    if (last && last.data) return Promise.resolve(render(last.data.services));
    return refresh();
  }

  Doke.homePublicServices = Object.freeze({
    init: init,
    refresh: refresh,
    render: render,
    ensureHomeFavoritesModule: ensureHomeFavoritesModule
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      ensureHomeFavoritesModule().catch(function () {});
    }, { once: true });
  } else {
    ensureHomeFavoritesModule().catch(function () {});
  }
})();
