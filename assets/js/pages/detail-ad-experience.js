(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var PAGE = 'detalhe-anuncio';
  var STALE_MS = 60000;
  var inFlightFavorite = new Map();
  var unsubscribeAuth = null;

  function getRoot() {
    return document.querySelector('[data-detail-page-root], [data-state-boundary="detalhe-anuncio"]');
  }

  function resolveServiceId(pageRoot) {
    var params = new URLSearchParams(root.location.search || '');
    return String(params.get('id') || params.get('serviceId') || pageRoot && pageRoot.dataset.serviceId || '').trim();
  }

  function favoritesService() {
    var service = Doke.services && Doke.services.favorites;
    if (!service) {
      var error = new Error('Serviço de favoritos não carregado.');
      error.code = 'DOKE_FAVORITES_SERVICE_UNAVAILABLE';
      throw error;
    }
    return service;
  }

  function setState(state, message) {
    var pageRoot = getRoot();
    if (!pageRoot) return;
    pageRoot.dataset.viewState = state;
    pageRoot.setAttribute('aria-busy', state === 'loading' || state === 'refreshing' ? 'true' : 'false');
    document.body.dataset.detailAdExperienceState = state;
    if (message) pageRoot.dataset.stateMessage = message;
    else delete pageRoot.dataset.stateMessage;
    if (Doke.experience && Doke.experience.states && typeof Doke.experience.states.set === 'function') {
      Doke.experience.states.set(pageRoot, state, { message: message || '' });
    }
  }

  function invalidateDomains(domains, reason) {
    var invalidation = Doke.experience && Doke.experience.invalidation;
    if (!invalidation || typeof invalidation.invalidateDomains !== 'function') return null;
    return invalidation.invalidateDomains(domains, { reason: reason || 'detail-ad' });
  }

  function updateFavoriteButtons(serviceId, active, options) {
    options = options || {};
    document.querySelectorAll('[data-favorite-toggle]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(Boolean(active)));
      button.classList.toggle('is-active', Boolean(active));
      button.setAttribute('aria-label', active ? 'Remover anúncio dos favoritos' : 'Salvar anúncio');
      button.dataset.favoriteServiceId = String(serviceId || '');
      button.dataset.favoriteState = options.state || (active ? 'active' : 'inactive');
      if (options.message) button.title = options.message;
      else button.removeAttribute('title');
    });
    return Boolean(active);
  }

  function syncFavoriteButtons(serviceId) {
    var normalizedServiceId = String(serviceId || '').trim();
    if (!normalizedServiceId) {
      updateFavoriteButtons('', false, { state: 'unavailable' });
      return Promise.resolve(false);
    }

    return favoritesService().isFavorite(normalizedServiceId).then(function (active) {
      return updateFavoriteButtons(normalizedServiceId, active, { state: 'ready' });
    }).catch(function (error) {
      if (error && error.code === 'DOKE_FAVORITES_AUTH_REQUIRED') {
        return updateFavoriteButtons(normalizedServiceId, false, {
          state: 'auth-required',
          message: 'Entre para salvar este anúncio.'
        });
      }
      updateFavoriteButtons(normalizedServiceId, false, {
        state: 'error',
        message: 'Favoritos indisponíveis no momento.'
      });
      document.dispatchEvent(new CustomEvent('doke:service-favorite-error', {
        detail: {
          serviceId: normalizedServiceId,
          error: error && error.message ? error.message : 'Falha ao consultar favorito.'
        }
      }));
      return false;
    });
  }

  function redirectToLogin(serviceId) {
    document.dispatchEvent(new CustomEvent('doke:service-favorite-auth-required', {
      detail: { serviceId: serviceId, returnUrl: root.location.href }
    }));
    if (root.location && typeof root.location.assign === 'function') {
      root.location.assign('auth/login.html?next=' + encodeURIComponent(root.location.href));
    }
  }

  function toggleFavorite(button) {
    var pageRoot = getRoot();
    var serviceId = resolveServiceId(pageRoot);
    if (!serviceId || inFlightFavorite.has(serviceId)) {
      return inFlightFavorite.get(serviceId) || Promise.resolve(false);
    }

    var before = button.getAttribute('aria-pressed') === 'true';
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.dataset.favoriteState = 'saving';

    var operation;
    try {
      operation = favoritesService().toggle(serviceId);
    } catch (error) {
      operation = Promise.reject(error);
    }

    operation = Promise.resolve(operation).then(function (active) {
      updateFavoriteButtons(serviceId, active, { state: 'ready' });
      document.dispatchEvent(new CustomEvent('doke:service-favorite-changed', {
        detail: { serviceId: serviceId, isFavorite: Boolean(active), authority: 'remote-or-fixture-memory' }
      }));
      if (!invalidateDomains(['marketplace'], 'service-favorite-changed')) {
        if (Doke.experience && Doke.experience.cache && typeof Doke.experience.cache.invalidatePrefix === 'function') {
          Doke.experience.cache.invalidatePrefix('marketplace:');
        }
        Doke.stableShellRouter && Doke.stableShellRouter.invalidate && Doke.stableShellRouter.invalidate('index.html');
        Doke.stableShellRouter && Doke.stableShellRouter.invalidate && Doke.stableShellRouter.invalidate('resultados.html');
      }
      return Boolean(active);
    }).catch(function (error) {
      updateFavoriteButtons(serviceId, before, {
        state: error && error.code === 'DOKE_FAVORITES_AUTH_REQUIRED' ? 'auth-required' : 'error',
        message: error && error.code === 'DOKE_FAVORITES_AUTH_REQUIRED'
          ? 'Entre para salvar este anúncio.'
          : 'Não foi possível atualizar o favorito.'
      });
      document.dispatchEvent(new CustomEvent('doke:service-favorite-error', {
        detail: {
          serviceId: serviceId,
          code: error && error.code ? error.code : 'DOKE_FAVORITES_UNKNOWN_ERROR',
          error: error && error.message ? error.message : 'Falha ao salvar favorito.'
        }
      }));
      if (error && error.code === 'DOKE_FAVORITES_AUTH_REQUIRED') redirectToLogin(serviceId);
      throw error;
    }).finally(function () {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      inFlightFavorite.delete(serviceId);
    });

    inFlightFavorite.set(serviceId, operation);
    return operation;
  }

  function bindFavoriteButtons() {
    document.querySelectorAll('[data-favorite-toggle]').forEach(function (button) {
      if (button.dataset.favoriteExperienceBound === 'true') return;
      button.dataset.favoriteExperienceBound = 'true';
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(button).catch(function () {});
      });
    });
    return syncFavoriteButtons(resolveServiceId(getRoot()));
  }

  function bindBudgetIntent() {
    document.querySelectorAll('[data-budget-cta]').forEach(function (link) {
      if (link.dataset.budgetExperienceBound === 'true') return;
      link.dataset.budgetExperienceBound = 'true';
      link.addEventListener('click', function () {
        var serviceId = resolveServiceId(getRoot());
        document.dispatchEvent(new CustomEvent('doke:budget-request-started', {
          detail: { serviceId: serviceId, href: link.href }
        }));
      });
    });
  }

  function bindAuthRefresh() {
    if (unsubscribeAuth) return;
    var subscribe = Doke.session && typeof Doke.session.subscribe === 'function'
      ? Doke.session.subscribe.bind(Doke.session)
      : root.DokeAuth && root.DokeAuth.service && typeof root.DokeAuth.service.onAuthChange === 'function'
        ? root.DokeAuth.service.onAuthChange.bind(root.DokeAuth.service)
        : null;
    if (!subscribe) return;
    unsubscribeAuth = subscribe(function () {
      syncFavoriteButtons(resolveServiceId(getRoot()));
    });
  }

  function invalidate() {
    if (invalidateDomains(['detailAd'], 'detail-ad-refresh')) return;
    if (Doke.pageDataOrchestrator && typeof Doke.pageDataOrchestrator.invalidate === 'function') {
      Doke.pageDataOrchestrator.invalidate(PAGE);
    }
    if (Doke.experience && Doke.experience.cache && typeof Doke.experience.cache.invalidatePrefix === 'function') {
      Doke.experience.cache.invalidatePrefix('detail-ad:');
    }
    Doke.stableShellRouter && Doke.stableShellRouter.invalidate && Doke.stableShellRouter.invalidate('detalhe-anuncio.html');
  }

  function boot() {
    var pageRoot = getRoot();
    if (!pageRoot || pageRoot.dataset.detailExperienceReady === 'true') return;
    pageRoot.dataset.detailExperienceReady = 'true';
    pageRoot.dataset.detailExperienceStaleMs = String(STALE_MS);
    setState('loading');
    bindFavoriteButtons();
    bindBudgetIntent();
    bindAuthRefresh();
  }

  document.addEventListener('doke:detail-ad-data-ready', function (event) {
    var payload = event.detail || {};
    setState(payload.data && payload.data.service ? 'ready' : 'empty');
    bindFavoriteButtons();
    bindBudgetIntent();
  });

  document.addEventListener('doke:detail-ad-data-refreshing', function () {
    setState('refreshing');
  });

  document.addEventListener('doke:detail-ad-data-error', function (event) {
    var offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    setState(offline ? 'offline' : 'error', event.detail && event.detail.error);
  });

  ['doke:service-updated', 'doke:service-deleted', 'doke:review-created', 'doke:review-updated'].forEach(function (name) {
    document.addEventListener(name, invalidate);
  });

  root.addEventListener('online', function () {
    var pageRoot = getRoot();
    if (!pageRoot) return;
    invalidate();
    syncFavoriteButtons(resolveServiceId(pageRoot));
    if (Doke.detailAdDataController && typeof Doke.detailAdDataController.load === 'function') {
      Doke.detailAdDataController.load(pageRoot, { forceRefresh: true });
    }
  });

  Doke.detailAdExperience = Object.freeze({
    boot: boot,
    invalidate: invalidate,
    toggleFavorite: toggleFavorite,
    syncFavoriteButtons: syncFavoriteButtons
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
