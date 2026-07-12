(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var DEFAULT_STALE_TIME = 60000;
  var CACHE_PREFIXES = ['profile:', 'profile-client:', 'profile-professional:', 'profile-owner:'];
  var ROUTES = ['perfil.html', 'perfil-cliente.html', 'perfil-profissional.html', 'meu-perfil.html', 'index.html', 'resultados.html'];

  function currentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') {
      return Doke.session.getCurrentUser() || null;
    }
    return null;
  }

  function resolveProfileId(config) {
    var params = new URLSearchParams(window.location.search || '');
    var explicitId = params.get('id') || params.get('userId') || params.get('profile');
    if (explicitId && config.allowExplicitProfileId !== false) return explicitId;

    var boundary = document.querySelector('[data-state-boundary="' + config.boundary + '"]');
    if (boundary && boundary.dataset.profileId) return boundary.dataset.profileId;

    var user = currentUser();
    return user && user.id ? user.id : (config.fallbackProfileId || 'user_001');
  }

  function normalizeProfile(payload) {
    if (!payload) return null;
    if (payload.profile) return payload.profile;
    if (payload.user) return payload.user;
    if (Array.isArray(payload.users)) return payload.users[0] || null;
    if (payload.id || payload.name || payload.username) return payload;
    return null;
  }

  function profileRole(profile) {
    if (!profile) return null;
    var value = profile.role || profile.accountType || profile.profileType;
    return value ? String(value).toLowerCase() : null;
  }

  function invalidateRoutes() {
    if (!Doke.stableShellRouter || typeof Doke.stableShellRouter.invalidate !== 'function') return;
    ROUTES.forEach(function (route) {
      Doke.stableShellRouter.invalidate(route);
    });
  }

  function invalidateAllProfileCaches() {
    var cache = Doke.experience && Doke.experience.cache;
    if (!cache || typeof cache.invalidatePrefix !== 'function') return;
    CACHE_PREFIXES.forEach(function (prefix) {
      cache.invalidatePrefix(prefix);
    });
  }

  function createSurface(config) {
    if (!config || !config.name || !config.boundary || !config.cachePrefix || typeof config.load !== 'function') {
      throw new Error('Invalid profile experience surface configuration.');
    }

    var initialized = false;
    var listenersBound = false;
    var pendingSave = null;

    function getBoundary() {
      return document.querySelector('[data-state-boundary="' + config.boundary + '"]');
    }

    function isCurrentSurface() {
      if (typeof config.isCurrent === 'function') return Boolean(config.isCurrent());
      return Boolean(getBoundary());
    }

    function applySurfaceContract() {
      document.documentElement.dataset.profileRole = config.role;
      document.documentElement.dataset.profileSurface = config.surface;
      if (document.body) {
        document.body.dataset.profileRole = config.role;
        document.body.dataset.profileSurface = config.surface;
      }
    }

    function setState(state, detail) {
      var boundary = getBoundary();
      var busy = state === 'loading' || state === 'refreshing' || state === 'submitting';

      if (boundary) {
        boundary.dataset.viewState = state;
        boundary.setAttribute('aria-busy', busy ? 'true' : 'false');
      }

      if (document.body) {
        document.body.dataset.profileExperienceState = state;
        document.body.dataset[config.stateDataset || 'profileSurfaceState'] = state;
      }

      applySurfaceContract();

      if (Doke.experience && Doke.experience.states && typeof Doke.experience.states.set === 'function') {
        Doke.experience.states.set(boundary || document.body, state, detail || {});
      }
    }

    function getCacheKey(profileId) {
      return config.cachePrefix + String(profileId || 'unknown');
    }

    function validatePayload(payload) {
      var profile = normalizeProfile(payload);
      var role = profileRole(profile);

      if (typeof config.validate === 'function') {
        return config.validate({ payload: payload || {}, profile: profile, role: role });
      }

      return { valid: true, state: 'ready', profile: profile, payload: payload || {} };
    }

    function finalize(payload, source, profileId) {
      var result = validatePayload(payload || {});
      var state = result && result.state ? result.state : (result && result.valid === false ? 'error' : 'ready');
      setState(state, {
        source: source || 'network',
        profileId: profileId,
        reason: result && result.reason ? result.reason : undefined,
        hasProfile: Boolean(result && result.profile)
      });
      return result && Object.prototype.hasOwnProperty.call(result, 'payload') ? result.payload : (payload || {});
    }

    function query(options) {
      options = options || {};
      var profileId = options.profileId || resolveProfileId(config);
      var cacheKey = getCacheKey(profileId);
      var cache = Doke.experience && Doke.experience.cache;

      function fetcher() {
        return Promise.resolve(config.load(profileId));
      }

      if (!cache || typeof cache.query !== 'function') {
        setState('loading');
        return fetcher().then(function (payload) {
          return finalize(payload, 'direct', profileId);
        }).catch(function (error) {
          setState(navigator.onLine === false ? 'offline' : 'error', { error: error, profileId: profileId });
          throw error;
        });
      }

      var cached = typeof cache.get === 'function' ? cache.get(cacheKey) : null;
      setState(cached && Object.prototype.hasOwnProperty.call(cached, 'data') ? 'refreshing' : 'loading');

      return cache.query({
        key: cacheKey,
        staleTime: Number(config.staleTime || DEFAULT_STALE_TIME),
        keepPreviousData: true,
        force: Boolean(options.force),
        fetcher: fetcher
      }).then(function (result) {
        var payload = result && Object.prototype.hasOwnProperty.call(result, 'data') ? result.data : result;
        return finalize(payload || {}, result && result.source ? result.source : 'network', profileId);
      }).catch(function (error) {
        setState(navigator.onLine === false ? 'offline' : 'error', { error: error, profileId: profileId });
        throw error;
      });
    }

    function invalidate(profileId, options) {
      options = options || {};
      var cache = Doke.experience && Doke.experience.cache;

      if (cache) {
        if (profileId && typeof cache.invalidate === 'function') cache.invalidate(getCacheKey(profileId));
        else if (typeof cache.invalidatePrefix === 'function') cache.invalidatePrefix(config.cachePrefix);
      }

      if (options.allProfiles) invalidateAllProfileCaches();
      invalidateRoutes();
    }

    function save(options) {
      options = options || {};
      if (config.allowSave !== true) {
        return Promise.reject(new Error('Profile updates are not enabled for this surface.'));
      }
      if (typeof options.updater !== 'function') {
        return Promise.reject(new Error('Profile updater is not implemented for this surface.'));
      }
      if (pendingSave) return pendingSave;

      var profileId = options.profileId || resolveProfileId(config);
      var optimistic = Doke.experience && Doke.experience.optimistic;
      var operation = {
        key: config.cachePrefix + 'update:' + profileId,
        boundary: getBoundary(),
        apply: typeof options.apply === 'function' ? options.apply : undefined,
        request: function () { return options.updater(options.payload || {}, profileId); },
        commit: function (result, snapshot) {
          if (typeof options.commit === 'function') options.commit(result, snapshot);
          invalidate(profileId, { allProfiles: true });
          window.dispatchEvent(new CustomEvent('doke:profile-updated', {
            detail: { profileId: profileId, userId: profileId, source: config.name }
          }));
        },
        rollback: typeof options.rollback === 'function' ? options.rollback : undefined,
        finalState: 'ready'
      };

      if (optimistic && typeof optimistic.mutate === 'function') {
        pendingSave = Promise.resolve(optimistic.mutate(operation)).finally(function () { pendingSave = null; });
        return pendingSave;
      }

      setState('submitting');
      pendingSave = Promise.resolve()
        .then(operation.request)
        .then(function (result) {
          operation.commit(result);
          setState('success');
          return result;
        })
        .catch(function (error) {
          if (operation.rollback) operation.rollback(undefined, error);
          setState(navigator.onLine === false ? 'offline' : 'error', { error: error });
          throw error;
        })
        .finally(function () {
          pendingSave = null;
          var boundary = getBoundary();
          if (boundary && boundary.dataset.viewState !== 'error' && boundary.dataset.viewState !== 'offline') setState('ready');
        });

      return pendingSave;
    }

    function handleInvalidation(event) {
      var detail = event && event.detail ? event.detail : {};
      invalidate(detail.userId || detail.profileId || null, { allProfiles: Boolean(config.invalidateAllOnEvent) });
      if (isCurrentSurface()) query({ force: true }).catch(function () {});
    }

    function bindListeners() {
      if (listenersBound) return;
      listenersBound = true;
      (config.events || ['doke:profile-updated', 'doke:review-created', 'doke:review-updated', 'doke:auth-session-change'])
        .forEach(function (eventName) { window.addEventListener(eventName, handleInvalidation); });
      window.addEventListener('online', function () {
        if (isCurrentSurface()) query({ force: true }).catch(function () {});
      });
    }

    function init() {
      if (initialized || !isCurrentSurface()) return;
      initialized = true;
      applySurfaceContract();
      bindListeners();
      setState('loading');
      query().catch(function () {});
    }

    var api = Object.freeze({
      init: init,
      query: query,
      save: save,
      invalidate: invalidate,
      resolveProfileId: function () { return resolveProfileId(config); },
      getCacheKey: getCacheKey,
      setState: setState
    });

    return api;
  }

  Doke.profileExperienceCore = Object.freeze({
    createSurface: createSurface,
    normalizeProfile: normalizeProfile,
    resolveProfileId: resolveProfileId,
    invalidateAll: function () {
      invalidateAllProfileCaches();
      invalidateRoutes();
    }
  });
})();
