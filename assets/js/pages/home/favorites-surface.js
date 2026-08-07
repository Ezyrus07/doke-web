/* Doke Home Favorites Surface
   Responsibility: expose the authenticated user's saved approved services on index.html.
   Authority: serviceFavoritesController snapshot + canonical services catalog.
   Presentation state: Doke.homeRailState favorites rail. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var activeRender = null;
  var catalog = [];
  var catalogPromise = null;
  var railSection = null;
  var railController = null;
  var surfaceAccountKey = '';
  var requestSerial = 0;

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
        : root.DokeAuth && root.DokeAuth.service && typeof root.DokeAuth.service.getCurrentUser === 'function'
          ? root.DokeAuth.service.getCurrentUser()
          : null;
    } catch (_error) {
      return null;
    }
  }

  function currentAccountKey() {
    return normalize(currentUser()?.id);
  }

  function currentRouteKey() {
    var bodyKey = document.body?.dataset?.pageKey || document.body?.dataset?.page || '';
    return normalize(bodyKey || root.location?.pathname || 'index');
  }

  function createSurface() {
    var workspace = document.querySelector('[data-state-boundary="index"]');
    if (!workspace) return null;

    var section = document.createElement('section');
    section.className = 'home-favorites doke-page-section';
    section.hidden = true;
    section.dataset.homeFavoritesSurface = '';
    section.dataset.homeListRegion = 'favorites';
    section.dataset.dataSource = 'canonical-favorites-service';
    section.setAttribute('aria-labelledby', 'home-favorites-title');
    section.innerHTML = [
      '<div class="section-heading section-heading--spread home-section-header">',
      '  <div>',
      '    <h2 class="section-heading__title home-section-title" id="home-favorites-title">Seus favoritos</h2>',
      '    <p class="section-heading__description">Serviços que você salvou para consultar depois.</p>',
      '  </div>',
      '  <a class="section-heading__link" href="meu-perfil.html#profile-favorites">',
      '    <span>Ver todos</span>',
      '    <span class="home-favorites__count" data-home-favorites-count aria-label="0 favoritos">0</span>',
      '  </a>',
      '</div>',
      '<div class="home-favorites__rail doke-scroll-rail">',
      '  <div class="home-favorites__grid" data-home-favorites-grid aria-label="Seus serviços favoritos"></div>',
      '</div>'
    ].join('');

    var anchor = workspace.querySelector('.professional-showcase');
    if (anchor?.parentNode) anchor.parentNode.insertBefore(section, anchor);
    else workspace.appendChild(section);
    return section;
  }

  function ensureSurface() {
    return document.querySelector('[data-home-favorites-surface]') || createSurface();
  }

  function ensureFeedback(section) {
    if (!section?.querySelector) return null;
    var existing = section.querySelector('[data-home-favorites-feedback]');
    if (existing) return existing;

    var feedback = document.createElement('div');
    feedback.className = 'doke-state-region home-favorites__feedback';
    feedback.dataset.homeFavoritesFeedback = '';
    feedback.hidden = true;

    var status = document.createElement('p');
    status.className = 'doke-error-state';
    status.dataset.homeFavoritesFeedbackStatus = '';
    status.setAttribute('role', 'status');

    var retry = document.createElement('button');
    retry.className = 'doke-btn doke-btn--link';
    retry.type = 'button';
    retry.textContent = 'Tentar novamente';
    retry.dataset.homeFavoritesRetry = '';
    retry.addEventListener('click', function () {
      retry.disabled = true;
      Promise.resolve(render({
        force: true,
        forceFavorites: true,
        forceCatalog: true,
        retry: true
      })).finally(function () {
        retry.disabled = false;
      });
    });

    feedback.appendChild(status);
    feedback.appendChild(retry);
    section.appendChild(feedback);
    return feedback;
  }

  function nodes() {
    var section = ensureSurface();
    return {
      section: section,
      grid: section?.querySelector('[data-home-favorites-grid]') || null,
      count: section?.querySelector('[data-home-favorites-count]') || null,
      feedback: ensureFeedback(section)
    };
  }

  function favoritesController() {
    var api = Doke.serviceFavoritesController;
    if (!api || typeof api.ensureLoaded !== 'function' || typeof api.getSnapshot !== 'function') {
      var error = new Error('Controlador canônico de favoritos não carregado.');
      error.code = 'DOKE_HOME_FAVORITES_CONTROLLER_UNAVAILABLE';
      throw error;
    }
    return api;
  }

  function servicesApi() {
    var api = Doke.services?.services;
    if (!api || typeof api.list !== 'function') {
      var error = new Error('Catálogo canônico não carregado para favoritos da página inicial.');
      error.code = 'DOKE_HOME_FAVORITES_CATALOG_UNAVAILABLE';
      throw error;
    }
    return api;
  }

  function normalizeErrorCode(value, fallback) {
    var normalized = String(value || fallback || 'DOKE_HOME_FAVORITES_FAILED').trim().toUpperCase();
    return normalized.replace(/[^A-Z0-9_:-]/g, '').slice(0, 96) || 'DOKE_HOME_FAVORITES_FAILED';
  }

  function failureCode(source, error) {
    var explicit = normalizeErrorCode(error?.code, '');
    if (source === 'ledger') {
      if (explicit === 'DOKE_HOME_FAVORITES_CONTROLLER_UNAVAILABLE') return explicit;
      return root.navigator?.onLine === false
        ? 'DOKE_HOME_FAVORITES_LEDGER_OFFLINE'
        : 'DOKE_HOME_FAVORITES_LEDGER_FAILED';
    }
    if (explicit === 'DOKE_HOME_FAVORITES_CATALOG_UNAVAILABLE') return explicit;
    return root.navigator?.onLine === false
      ? 'DOKE_HOME_FAVORITES_CATALOG_OFFLINE'
      : 'DOKE_HOME_FAVORITES_CATALOG_FAILED';
  }

  function loadCatalog(force) {
    if (catalog.length && !force) return Promise.resolve(catalog.slice());
    if (catalogPromise && !force) return catalogPromise;

    var request;
    try {
      request = Promise.resolve(servicesApi().list({
        status: 'active',
        fresh: Boolean(force),
        sort: 'updated_desc'
      }));
    } catch (error) {
      request = Promise.reject(error);
    }

    request = request.then(function (items) {
      catalog = (Array.isArray(items) ? items : []).filter(function (item) {
        return String(item?.status || 'active').toLowerCase() === 'active';
      });
      return catalog.slice();
    });
    catalogPromise = request;
    request.then(function () {
      if (catalogPromise === request) catalogPromise = null;
    }, function () {
      if (catalogPromise === request) catalogPromise = null;
    });
    return request;
  }

  function loadFavoritesOutcome(force) {
    var request;
    try {
      request = favoritesController().ensureLoaded({ force: Boolean(force) });
    } catch (error) {
      request = Promise.reject(error);
    }
    return Promise.resolve(request).then(function (snapshot) {
      var ids = snapshot instanceof Set ? snapshot : new Set(snapshot || []);
      return Object.freeze({ ok: true, ids: new Set(Array.from(ids).map(normalize).filter(Boolean)), errorCode: '' });
    }).catch(function (error) {
      return Object.freeze({ ok: false, ids: new Set(), errorCode: failureCode('ledger', error) });
    });
  }

  function loadCatalogOutcome(force) {
    return loadCatalog(Boolean(force)).then(function (items) {
      return Object.freeze({ ok: true, items: items, errorCode: '' });
    }).catch(function (error) {
      return Object.freeze({ ok: false, items: [], errorCode: failureCode('catalog', error) });
    });
  }

  function getRailController(section, forceReset) {
    if (!section || !Doke.homeRailState || typeof Doke.homeRailState.createController !== 'function') return null;
    if (forceReset || railSection !== section || !railController) {
      railSection = section;
      railController = Doke.homeRailState.createController({ dispatchTarget: section });
    }
    return railController;
  }

  function updateCount(ui, count) {
    var total = Math.max(0, Number(count) || 0);
    ui.section.dataset.itemCount = String(total);
    if (!ui.count) return;
    ui.count.textContent = String(total);
    ui.count.setAttribute('aria-label', total + (total === 1 ? ' favorito' : ' favoritos'));
  }

  function feedbackMessage(snapshot) {
    if (snapshot?.freshnessState === 'stale') {
      return 'Não foi possível atualizar seus favoritos. Exibindo a última versão disponível.';
    }
    var code = String(snapshot?.errorCode || '');
    if (code.indexOf('CATALOG') !== -1) {
      return 'Seus favoritos foram encontrados, mas os anúncios não puderam ser carregados.';
    }
    if (code.indexOf('OFFLINE') !== -1) {
      return 'Você está offline. Conecte-se e tente carregar seus favoritos novamente.';
    }
    return 'Não foi possível carregar seus favoritos agora.';
  }

  function updateFeedback(ui, snapshot) {
    var feedback = ui.feedback || ensureFeedback(ui.section);
    if (!feedback) return;
    var status = feedback.querySelector('[data-home-favorites-feedback-status]');
    var show = snapshot?.dataState === 'error' || snapshot?.freshnessState === 'stale';
    feedback.hidden = !show;
    if (status) status.textContent = show ? feedbackMessage(snapshot) : '';
  }

  function applySnapshot(ui, controller, snapshot) {
    if (!snapshot) return snapshot;
    ui.section.dataset.dataSource = 'canonical-favorites-service';
    if (controller && typeof controller.apply === 'function') {
      controller.apply(ui.section, snapshot, {
        afterApply: function () { updateFeedback(ui, snapshot); }
      });
    } else {
      ui.section.hidden = snapshot.visibilityState !== 'visible';
      ui.section.setAttribute('aria-busy', snapshot.dataState === 'loading' || snapshot.dataState === 'retrying' ? 'true' : 'false');
      updateFeedback(ui, snapshot);
    }
    updateCount(ui, snapshot.itemCount);
    return snapshot;
  }

  function dispatchSurface(name, snapshot, extra) {
    var detail = {
      rail: 'favorites',
      dataState: snapshot?.dataState || 'idle',
      freshnessState: snapshot?.freshnessState || 'unknown',
      visibilityState: snapshot?.visibilityState || 'visible',
      itemCount: snapshot?.itemCount || 0,
      generation: snapshot?.generation || 0,
      errorCode: snapshot?.errorCode || ''
    };
    if (extra && Number.isFinite(extra.visibleCount)) detail.visibleCount = Math.max(0, Math.floor(extra.visibleCount));
    document.dispatchEvent(new CustomEvent(name, { detail: Object.freeze(detail) }));
  }

  function resetForAccount(ui, accountKey) {
    if (surfaceAccountKey === accountKey) return getRailController(ui.section, false);
    surfaceAccountKey = accountKey;
    requestSerial += 1;
    activeRender = null;
    ui.grid.textContent = '';
    updateCount(ui, 0);
    if (ui.feedback) ui.feedback.hidden = true;
    return getRailController(ui.section, true);
  }

  function isCurrentRequest(context) {
    if (!context || context.serial !== requestSerial) return false;
    if (!context.section?.isConnected) return false;
    if (document.querySelector('[data-home-favorites-surface]') !== context.section) return false;
    if (currentAccountKey() !== context.accountKey) return false;
    if (currentRouteKey() !== context.routeKey) return false;
    if (context.controller !== railController) return false;
    return !context.receipt || !context.controller || context.controller.accepts(context.receipt);
  }

  function failureSnapshot(ui, context, ledgerOutcome, catalogOutcome, unexpectedCode) {
    if (!isCurrentRequest(context)) return null;
    var code = unexpectedCode || '';
    if (!code && !ledgerOutcome.ok && !catalogOutcome.ok) code = 'DOKE_HOME_FAVORITES_MULTIPLE_FAILED';
    else if (!code && !ledgerOutcome.ok) code = ledgerOutcome.errorCode;
    else if (!code && !catalogOutcome.ok) code = catalogOutcome.errorCode;
    code = normalizeErrorCode(code, 'DOKE_HOME_FAVORITES_FAILED');

    var snapshot = context.controller
      ? context.controller.fail(context.receipt, code, { preserveContent: true, visibilityState: 'visible' })
      : Object.freeze({
          dataState: 'error',
          freshnessState: 'unknown',
          visibilityState: 'visible',
          itemCount: 0,
          generation: context.serial,
          errorCode: code
        });
    applySnapshot(ui, context.controller, snapshot);
    dispatchSurface('doke:home-favorites-error', snapshot);
    return snapshot;
  }

  function buildPreviewNodes(items) {
    var preview = items.slice(0, 6);
    if (preview.length && (!Doke.publicServiceCard || typeof Doke.publicServiceCard.create !== 'function')) {
      var error = new Error('Renderer canônico de card indisponível.');
      error.code = 'DOKE_HOME_FAVORITES_CARD_RENDERER_UNAVAILABLE';
      throw error;
    }
    return preview.map(function (item) { return Doke.publicServiceCard.create(item); });
  }

  function commitAcceptedResult(ui, context, favoriteIds, availableServices) {
    if (!isCurrentRequest(context)) return 0;
    var services = availableServices.filter(function (item) {
      return canonicalIds(item).some(function (id) { return favoriteIds.has(id); });
    });
    var previewNodes = buildPreviewNodes(services);
    if (!isCurrentRequest(context)) return 0;

    ui.grid.textContent = '';
    previewNodes.forEach(function (node) { ui.grid.appendChild(node); });
    var api = favoritesController();
    if (typeof api.syncAll === 'function') api.syncAll(ui.grid);

    var snapshot = context.controller
      ? context.controller.commit(context.receipt, {
          itemCount: services.length,
          dataState: services.length ? 'ready' : 'empty',
          freshnessState: 'fresh',
          visibilityState: services.length ? 'visible' : 'hidden-insufficient-items'
        })
      : Object.freeze({
          dataState: services.length ? 'ready' : 'empty',
          freshnessState: 'fresh',
          visibilityState: services.length ? 'visible' : 'hidden-insufficient-items',
          itemCount: services.length,
          generation: context.serial,
          errorCode: ''
        });
    applySnapshot(ui, context.controller, snapshot);
    dispatchSurface('doke:home-favorites-rendered', snapshot, { visibleCount: previewNodes.length });
    return services.length;
  }

  function render(options) {
    options = options || {};
    var ui = nodes();
    if (!ui.section || !ui.grid) return Promise.resolve(0);

    var accountKey = currentAccountKey();
    var controller = resetForAccount(ui, accountKey || 'anonymous');
    if (!accountKey) {
      requestSerial += 1;
      ui.grid.textContent = '';
      updateCount(ui, 0);
      var anonymousSnapshot = controller
        ? controller.hide('favorites', 'hidden-anonymous')
        : Object.freeze({
            dataState: 'idle',
            freshnessState: 'unknown',
            visibilityState: 'hidden-anonymous',
            itemCount: 0,
            generation: requestSerial,
            errorCode: ''
          });
      applySnapshot(ui, controller, anonymousSnapshot);
      dispatchSurface('doke:home-favorites-rendered', anonymousSnapshot, { visibleCount: 0 });
      return Promise.resolve(0);
    }

    var routeKey = currentRouteKey();
    if (activeRender && !options.force && activeRender.accountKey === accountKey && activeRender.routeKey === routeKey && activeRender.section === ui.section) {
      return activeRender.promise;
    }

    requestSerial += 1;
    var serial = requestSerial;
    var receipt = controller ? controller.begin('favorites', {
      retry: Boolean(options.retry),
      preserveContent: true,
      visibilityState: 'visible'
    }) : null;
    if (controller) applySnapshot(ui, controller, controller.get('favorites'));

    var context = {
      serial: serial,
      accountKey: accountKey,
      routeKey: routeKey,
      section: ui.section,
      controller: controller,
      receipt: receipt
    };

    var operation = Promise.all([
      loadFavoritesOutcome(Boolean(options.forceFavorites)),
      loadCatalogOutcome(Boolean(options.forceCatalog))
    ]).then(function (values) {
      var ledgerOutcome = values[0];
      var catalogOutcome = values[1];
      if (!isCurrentRequest(context)) return 0;
      if (!ledgerOutcome.ok || !catalogOutcome.ok) {
        var failed = failureSnapshot(ui, context, ledgerOutcome, catalogOutcome, '');
        return failed?.itemCount || 0;
      }
      try {
        return commitAcceptedResult(ui, context, ledgerOutcome.ids, catalogOutcome.items);
      } catch (error) {
        var code = normalizeErrorCode(error?.code, 'DOKE_HOME_FAVORITES_RENDER_FAILED');
        var failed = failureSnapshot(ui, context, ledgerOutcome, catalogOutcome, code);
        return failed?.itemCount || 0;
      }
    }).catch(function (error) {
      var fallbackLedger = Object.freeze({ ok: true, ids: new Set(), errorCode: '' });
      var fallbackCatalog = Object.freeze({ ok: true, items: [], errorCode: '' });
      var failed = failureSnapshot(
        ui,
        context,
        fallbackLedger,
        fallbackCatalog,
        normalizeErrorCode(error?.code, 'DOKE_HOME_FAVORITES_UNEXPECTED_FAILED')
      );
      return failed?.itemCount || 0;
    });

    activeRender = {
      serial: serial,
      accountKey: accountKey,
      routeKey: routeKey,
      section: ui.section,
      promise: operation
    };
    operation.then(function () {
      if (activeRender?.serial === serial) activeRender = null;
    }, function () {
      if (activeRender?.serial === serial) activeRender = null;
    });
    return operation;
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
    render({ force: true, forceFavorites: true, forceCatalog: true, retry: true });
  });
  root.addEventListener('pageshow', function () {
    render();
  });

  Doke.homeFavoritesSurface = Object.freeze({
    render: render,
    boot: boot,
    ensureSurface: ensureSurface
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();