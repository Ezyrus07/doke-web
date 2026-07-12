(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PAGE = 'detalhe-anuncio';
  var STALE_MS = 60000;
  var FAVORITES_KEY_PREFIX = 'doke.service-favorites.v1:';
  var inFlightFavorite = new Map();

  function getRoot() {
    return document.querySelector('[data-detail-page-root], [data-state-boundary="detalhe-anuncio"]');
  }

  function resolveUserId() {
    var session = Doke.session;
    var user = session && typeof session.getCurrentUser === 'function' ? session.getCurrentUser() : null;
    return String(user && (user.id || user.userId || user.email) || 'guest');
  }

  function resolveServiceId(root) {
    var params = new URLSearchParams(window.location.search || '');
    return String(params.get('id') || params.get('serviceId') || root && root.dataset.serviceId || 'service-reforma-banheiro-premium');
  }

  function setState(state, message) {
    var root = getRoot();
    if (!root) return;
    root.dataset.viewState = state;
    root.setAttribute('aria-busy', state === 'loading' || state === 'refreshing' ? 'true' : 'false');
    document.body.dataset.detailAdExperienceState = state;
    if (message) root.dataset.stateMessage = message;
    else delete root.dataset.stateMessage;
    if (Doke.experience && Doke.experience.states && typeof Doke.experience.states.set === 'function') {
      Doke.experience.states.set(root, state, { message: message || '' });
    }
  }

  function invalidateDomains(domains, reason) {
    var invalidation = Doke.experience && Doke.experience.invalidation;
    if (!invalidation || typeof invalidation.invalidateDomains !== 'function') return null;
    return invalidation.invalidateDomains(domains, { reason: reason || 'detail-ad' });
  }

  function favoriteStorageKey() {
    return FAVORITES_KEY_PREFIX + resolveUserId();
  }

  function readFavorites() {
    try {
      var parsed = JSON.parse(localStorage.getItem(favoriteStorageKey()) || '[]');
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (_) {
      return [];
    }
  }

  function writeFavorites(ids) {
    localStorage.setItem(favoriteStorageKey(), JSON.stringify(ids));
    var confirmed = JSON.parse(localStorage.getItem(favoriteStorageKey()) || '[]');
    if (!Array.isArray(confirmed) || confirmed.length !== ids.length || confirmed.some(function (id, index) { return String(id) !== String(ids[index]); })) {
      throw new Error('Não foi possível confirmar o favorito.');
    }
    return confirmed;
  }

  function syncFavoriteButtons(serviceId) {
    var active = readFavorites().includes(String(serviceId));
    document.querySelectorAll('[data-favorite-toggle]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-label', active ? 'Remover anúncio dos favoritos' : 'Salvar anúncio');
    });
    return active;
  }

  function toggleFavorite(button) {
    var root = getRoot();
    var serviceId = resolveServiceId(root);
    if (!serviceId || inFlightFavorite.has(serviceId)) return inFlightFavorite.get(serviceId) || Promise.resolve(false);

    var before = readFavorites();
    var wasActive = before.includes(serviceId);
    var next = wasActive ? before.filter(function (id) { return id !== serviceId; }) : before.concat(serviceId);

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.setAttribute('aria-pressed', String(!wasActive));
    button.classList.toggle('is-active', !wasActive);

    var operation = Promise.resolve().then(function () {
      writeFavorites(next);
      syncFavoriteButtons(serviceId);
      document.dispatchEvent(new CustomEvent('doke:service-favorite-changed', {
        detail: { serviceId: serviceId, isFavorite: !wasActive }
      }));
      if (!invalidateDomains(['marketplace'], 'service-favorite-changed')) {
        if (Doke.experience && Doke.experience.cache && typeof Doke.experience.cache.invalidatePrefix === 'function') {
          Doke.experience.cache.invalidatePrefix('marketplace:');
        }
        Doke.stableShellRouter && Doke.stableShellRouter.invalidate && Doke.stableShellRouter.invalidate('index.html');
        Doke.stableShellRouter && Doke.stableShellRouter.invalidate && Doke.stableShellRouter.invalidate('resultados.html');
      }
      return !wasActive;
    }).catch(function (error) {
      try { writeFavorites(before); } catch (_) {}
      syncFavoriteButtons(serviceId);
      document.dispatchEvent(new CustomEvent('doke:service-favorite-error', {
        detail: { serviceId: serviceId, error: error && error.message ? error.message : 'Falha ao salvar favorito.' }
      }));
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
    syncFavoriteButtons(resolveServiceId(getRoot()));
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
    var root = getRoot();
    if (!root || root.dataset.detailExperienceReady === 'true') return;
    root.dataset.detailExperienceReady = 'true';
    root.dataset.detailExperienceStaleMs = String(STALE_MS);
    setState('loading');
    bindFavoriteButtons();
    bindBudgetIntent();
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

  window.addEventListener('online', function () {
    var root = getRoot();
    if (!root) return;
    invalidate();
    if (Doke.detailAdDataController && typeof Doke.detailAdDataController.load === 'function') {
      Doke.detailAdDataController.load(root, { forceRefresh: true });
    }
  });

  Doke.detailAdExperience = {
    boot: boot,
    invalidate: invalidate,
    toggleFavorite: toggleFavorite,
    syncFavoriteButtons: syncFavoriteButtons
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
