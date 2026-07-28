/* Doke Service Favorites Controller
   Responsibility: one page-level favorite snapshot shared by every service card and detail surface.
   Authority: Doke.services.favorites -> public.favorites or explicit fixture runtime memory.
   Network contract: one owner-scoped list read per identity/page load; mutations use add/remove directly. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var CHANNEL_NAME = 'doke.service-favorites.authority.v1';
  var BUTTON_SELECTOR = '[data-service-favorite], [data-favorite-toggle], .doke-ad-card__favorite';
  var favoriteIds = new Set();
  var loadedIdentity = '';
  var loadPromise = null;
  var inFlightByService = new Map();
  var observer = null;
  var unsubscribeAuth = null;
  var channel = null;

  function normalize(value) {
    return String(value || '').trim();
  }

  function currentUser() {
    try {
      return Doke.session && typeof Doke.session.getCurrentUser === 'function'
        ? Doke.session.getCurrentUser()
        : root.DokeAuth && root.DokeAuth.service && typeof root.DokeAuth.service.getCurrentUser === 'function'
          ? root.DokeAuth.service.getCurrentUser()
          : null;
    } catch (error) {
      return null;
    }
  }

  function identityKey() {
    var user = currentUser();
    return normalize(user && user.id) || 'anonymous';
  }

  function service() {
    var api = Doke.services && Doke.services.favorites;
    if (!api) {
      var error = new Error('Serviço canônico de favoritos não carregado.');
      error.code = 'DOKE_FAVORITES_SERVICE_UNAVAILABLE';
      throw error;
    }
    return api;
  }

  function serviceIdFromHref(href) {
    if (!href) return '';
    try {
      var url = new URL(href, root.location && root.location.href ? root.location.href : 'https://doke.local/');
      return normalize(url.searchParams.get('id') || url.searchParams.get('serviceId') || url.searchParams.get('servico'));
    } catch (error) {
      return '';
    }
  }

  function resolveServiceId(button) {
    if (!button) return '';
    var direct = normalize(button.dataset && (button.dataset.favoriteServiceId || button.dataset.serviceId));
    if (direct) return direct;
    var card = button.closest && button.closest('[data-service-id], .doke-ad-card');
    var cardId = normalize(card && card.dataset && card.dataset.serviceId);
    if (cardId) return cardId;
    var href = card && card.querySelector
      ? card.querySelector('.doke-ad-card__cta[href], [data-service-detail-href][href]')
      : null;
    if (href) {
      var fromCardHref = serviceIdFromHref(href.getAttribute('href'));
      if (fromCardHref) return fromCardHref;
    }
    try {
      var params = new URLSearchParams(root.location && root.location.search || '');
      return normalize(params.get('id') || params.get('serviceId') || params.get('servico'));
    } catch (error) {
      return '';
    }
  }

  function buttons(scope) {
    var host = scope && typeof scope.querySelectorAll === 'function' ? scope : document;
    var found = Array.from(host.querySelectorAll(BUTTON_SELECTOR));
    if (host.matches && host.matches(BUTTON_SELECTOR)) found.unshift(host);
    return Array.from(new Set(found));
  }

  function updateButton(button, serviceId, active, state, message) {
    if (!button) return;
    var normalizedServiceId = normalize(serviceId || resolveServiceId(button));
    if (normalizedServiceId) button.dataset.favoriteServiceId = normalizedServiceId;
    button.dataset.serviceFavorite = '';
    button.dataset.favoriteState = state || (active ? 'active' : 'inactive');
    button.setAttribute('aria-pressed', String(Boolean(active)));
    button.setAttribute('aria-label', active ? 'Remover anúncio dos favoritos' : 'Salvar anúncio');
    button.classList.toggle('is-active', Boolean(active));
    if (message) button.title = message;
    else button.removeAttribute('title');
  }

  function syncService(serviceId, active, state, message) {
    var normalizedServiceId = normalize(serviceId);
    buttons(document).forEach(function (button) {
      if (resolveServiceId(button) !== normalizedServiceId) return;
      updateButton(button, normalizedServiceId, active, state, message);
    });
  }

  function syncAll(scope) {
    buttons(scope || document).forEach(function (button) {
      var serviceId = resolveServiceId(button);
      if (!serviceId) {
        updateButton(button, '', false, 'unavailable', 'Anúncio sem identificador válido.');
        return;
      }
      updateButton(button, serviceId, favoriteIds.has(serviceId), loadedIdentity ? 'ready' : 'loading');
    });
    return new Set(favoriteIds);
  }

  function dispatch(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function setSnapshot(ids, identity, source) {
    favoriteIds = new Set((Array.isArray(ids) ? ids : Array.from(ids || [])).map(normalize).filter(Boolean));
    loadedIdentity = identity || identityKey();
    syncAll(document);
    dispatch('doke:service-favorites-loaded', {
      identity: loadedIdentity,
      serviceIds: Array.from(favoriteIds),
      source: source || 'canonical-list'
    });
    return new Set(favoriteIds);
  }

  function ensureLoaded(options) {
    options = options || {};
    var identity = identityKey();
    if (!options.force && loadedIdentity === identity) return Promise.resolve(new Set(favoriteIds));
    if (!options.force && loadPromise && loadPromise.identity === identity) return loadPromise;

    var request;
    try {
      request = service().list();
    } catch (error) {
      request = Promise.reject(error);
    }

    loadPromise = Promise.resolve(request).then(function (ids) {
      return setSnapshot(ids, identity, 'canonical-list');
    }).catch(function (error) {
      favoriteIds = new Set();
      loadedIdentity = identity;
      buttons(document).forEach(function (button) {
        updateButton(button, resolveServiceId(button), false, 'error', 'Favoritos indisponíveis no momento.');
      });
      dispatch('doke:service-favorite-error', {
        code: error && error.code || 'DOKE_FAVORITES_LIST_FAILED',
        error: error && error.message || 'Falha ao carregar favoritos.',
        operation: 'list'
      });
      throw error;
    }).finally(function () {
      loadPromise = null;
    });
    loadPromise.identity = identity;
    return loadPromise;
  }

  function redirectToLogin(serviceId) {
    var returnUrl = root.location && root.location.href ? root.location.href : '';
    dispatch('doke:service-favorite-auth-required', { serviceId: serviceId, returnUrl: returnUrl });
    if (root.location && typeof root.location.assign === 'function') {
      root.location.assign('auth/login.html?next=' + encodeURIComponent(returnUrl));
    }
  }

  function publishChange(serviceId, active, source) {
    var detail = {
      serviceId: serviceId,
      isFavorite: Boolean(active),
      identity: identityKey(),
      authority: 'canonical-favorites-service',
      source: source || 'local-mutation'
    };
    dispatch('doke:service-favorite-changed', detail);
    try {
      channel && channel.postMessage(detail);
    } catch (error) {
      // Cross-tab synchronization is best-effort; canonical persistence already succeeded.
    }
    return detail;
  }

  function setFavorite(serviceId, active, options) {
    options = options || {};
    var normalizedServiceId = normalize(serviceId);
    if (!normalizedServiceId) return Promise.reject(new Error('Serviço inválido para favorito.'));
    if (inFlightByService.has(normalizedServiceId)) return inFlightByService.get(normalizedServiceId);

    var operation = ensureLoaded().then(function () {
      var api = service();
      var currentlyActive = favoriteIds.has(normalizedServiceId);
      if (currentlyActive === Boolean(active)) return currentlyActive;
      syncService(normalizedServiceId, currentlyActive, 'saving');
      return (active ? api.add(normalizedServiceId) : api.remove(normalizedServiceId)).then(function (result) {
        var next = Boolean(result);
        if (next) favoriteIds.add(normalizedServiceId);
        else favoriteIds.delete(normalizedServiceId);
        syncService(normalizedServiceId, next, 'ready');
        publishChange(normalizedServiceId, next, options.source || 'controller');
        return next;
      });
    }).catch(function (error) {
      var before = favoriteIds.has(normalizedServiceId);
      syncService(normalizedServiceId, before, error && error.code === 'DOKE_FAVORITES_AUTH_REQUIRED' ? 'auth-required' : 'error', error && error.code === 'DOKE_FAVORITES_AUTH_REQUIRED' ? 'Entre para salvar este anúncio.' : 'Não foi possível atualizar o favorito.');
      dispatch('doke:service-favorite-error', {
        serviceId: normalizedServiceId,
        code: error && error.code || 'DOKE_FAVORITES_MUTATION_FAILED',
        error: error && error.message || 'Falha ao atualizar favorito.',
        operation: active ? 'add' : 'remove'
      });
      if (error && error.code === 'DOKE_FAVORITES_AUTH_REQUIRED' && options.redirectOnAuth !== false) redirectToLogin(normalizedServiceId);
      throw error;
    }).finally(function () {
      inFlightByService.delete(normalizedServiceId);
      syncService(normalizedServiceId, favoriteIds.has(normalizedServiceId), 'ready');
    });

    inFlightByService.set(normalizedServiceId, operation);
    return operation;
  }

  function toggleButton(button, options) {
    options = options || {};
    var serviceId = resolveServiceId(button);
    if (!serviceId) return Promise.reject(new Error('Serviço inválido para favorito.'));
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    return ensureLoaded().then(function () {
      return setFavorite(serviceId, !favoriteIds.has(serviceId), options);
    }).finally(function () {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    });
  }

  function hydrate(scope) {
    syncAll(scope || document);
    return ensureLoaded().then(function () {
      syncAll(scope || document);
      return new Set(favoriteIds);
    }).catch(function () {
      return new Set();
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
      favoriteIds = new Set();
      loadedIdentity = '';
      loadPromise = null;
      hydrate(document);
    });
  }

  function bindChannel() {
    if (channel || typeof root.BroadcastChannel !== 'function') return;
    try {
      channel = new root.BroadcastChannel(CHANNEL_NAME);
      channel.addEventListener('message', function (event) {
        var detail = event && event.data || {};
        if (normalize(detail.identity) !== identityKey()) return;
        var serviceId = normalize(detail.serviceId);
        if (!serviceId) return;
        if (detail.isFavorite) favoriteIds.add(serviceId);
        else favoriteIds.delete(serviceId);
        loadedIdentity = identityKey();
        syncService(serviceId, Boolean(detail.isFavorite), 'ready');
        dispatch('doke:service-favorite-changed', Object.assign({}, detail, { source: 'broadcast' }));
      });
    } catch (error) {
      channel = null;
    }
  }

  function boot() {
    bindChannel();
    bindAuthRefresh();
    hydrate(document);
    if (!observer && typeof MutationObserver === 'function') {
      observer = new MutationObserver(function (mutations) {
        var relevant = mutations.some(function (mutation) {
          return Array.from(mutation.addedNodes || []).some(function (node) {
            return node && node.nodeType === 1 && (node.matches && node.matches(BUTTON_SELECTOR) || node.querySelector && node.querySelector(BUTTON_SELECTOR));
          });
        });
        if (relevant) syncAll(document);
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  Doke.serviceFavoritesController = Object.freeze({
    boot: boot,
    hydrate: hydrate,
    ensureLoaded: ensureLoaded,
    syncAll: syncAll,
    syncService: syncService,
    resolveServiceId: resolveServiceId,
    toggleButton: toggleButton,
    setFavorite: setFavorite,
    isFavorite: function (serviceId) { return favoriteIds.has(normalize(serviceId)); },
    getSnapshot: function () { return new Set(favoriteIds); },
    getLoadedIdentity: function () { return loadedIdentity; },
    getInFlightCount: function () { return inFlightByService.size; }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
