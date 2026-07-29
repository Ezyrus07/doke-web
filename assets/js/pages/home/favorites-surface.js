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

  function createSurface() {
    var workspace = document.querySelector('[data-state-boundary="index"]');
    if (!workspace) return null;

    var section = document.createElement('section');
    section.className = 'home-favorites doke-page-section';
    section.hidden = true;
    section.dataset.homeFavoritesSurface = '';
    section.setAttribute('aria-labelledby', 'home-favorites-title');
    section.innerHTML = [
      '<div class="section-heading section-heading--spread home-section-header">',
      '  <div>',
      '    <h2 class="section-heading__title home-section-title" id="home-favorites-title">Seus favoritos</h2>',
      '    <p class="section-heading__description">Serviços que você salvou para consultar depois.</p>',
      '  </div>',
      '  <a class="section-heading__link" href="meu-perfil.html#profile-favorites">Ver todos <span data-home-favorites-count>0</span></a>',
      '</div>',
      '<div class="content-rail doke-scroll-rail">',
      '  <div class="service-grid service-grid--compact doke-grid" data-home-favorites-grid aria-label="Seus serviços favoritos"></div>',
      '</div>'
    ].join('');

    var anchor = workspace.querySelector('.professional-showcase');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(section, anchor);
    else workspace.appendChild(section);
    return section;
  }

  function ensureSurface() {
    return document.querySelector('[data-home-favorites-surface]') || createSurface();
  }

  function nodes() {
    var section = ensureSurface();
    return {
      section: section,
      grid: section && section.querySelector('[data-home-favorites-grid]'),
      count: section && section.querySelector('[data-home-favorites-count]')
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
      });
      var preview = services.slice(0, 6);

      ui.grid.textContent = '';
      preview.forEach(function (item) {
        if (Doke.publicServiceCard && typeof Doke.publicServiceCard.create === 'function') {
          ui.grid.appendChild(Doke.publicServiceCard.create(item));
        }
      });
      if (ui.count) ui.count.textContent = String(services.length);
      ui.section.hidden = preview.length === 0;
      controller().hydrate(ui.grid);
      document.dispatchEvent(new CustomEvent('doke:home-favorites-rendered', {
        detail: { count: services.length, visibleCount: preview.length, favoriteIds: Array.from(favoriteIds) }
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
    if (!ensureSurface()) return;
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

  Doke.homeFavoritesSurface = Object.freeze({
    render: render,
    boot: boot,
    ensureSurface: ensureSurface
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
