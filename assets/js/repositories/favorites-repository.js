/* Doke Favorites Repository
   Responsibility: canonical persistence boundary for service favorites.
   Real authority: Supabase public.favorites protected by owner-scoped RLS.
   Fixture compatibility: non-UUID identities and services held only in runtime memory. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  var AUTHORITY = 'supabase-or-fixture-memory';
  var REMOTE_TABLE = 'favorites';
  var PROVIDER_ATTRIBUTE = 'data-doke-favorites-provider';
  var fixtureFavoritesByUser = new Map();
  var supabaseClient = null;
  var lastRemoteError = null;

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizeText(value));
  }

  function setProviderState(provider) {
    try {
      document.documentElement.setAttribute(PROVIDER_ATTRIBUTE, provider);
    } catch (error) {
      // VM and non-browser contract environments may not expose documentElement.
    }
  }

  function getCurrentUser() {
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

  function isSupabaseConfigured() {
    var config = root.DOKE_SUPABASE_CONFIG || {};
    return config.enabled !== false && Boolean(config.url) && Boolean(config.anonKey);
  }

  function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    try {
      supabaseClient = root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
        ? root.DokeSupabase.getClient()
        : null;
    } catch (error) {
      lastRemoteError = error;
      supabaseClient = null;
    }
    return supabaseClient;
  }

  function createAuthRequiredError() {
    var error = new Error('Entre na sua conta para salvar este anúncio.');
    error.code = 'DOKE_FAVORITES_AUTH_REQUIRED';
    return error;
  }

  function createAuthorityUnavailableError(context, cause) {
    var suffix = cause && cause.message ? ': ' + normalizeText(cause.message) : '';
    var error = new Error('Autoridade remota de favoritos indisponível em ' + context + suffix);
    error.code = 'DOKE_FAVORITES_AUTHORITY_UNAVAILABLE';
    if (cause) error.cause = cause;
    return error;
  }

  function resolveMode(user, serviceId) {
    var userId = normalizeText(user && user.id);
    var normalizedServiceId = normalizeText(serviceId);
    if (!userId) return 'anonymous';
    if (isSupabaseConfigured() || isUuid(userId) || isUuid(normalizedServiceId)) return 'remote';
    return 'fixture-memory';
  }

  function requireRemoteIdentity(user, serviceId, context) {
    var userId = normalizeText(user && user.id);
    var normalizedServiceId = normalizeText(serviceId);
    if (!isUuid(userId) || (normalizedServiceId && !isUuid(normalizedServiceId))) {
      throw createAuthorityUnavailableError(context, new Error('Identidade remota inválida.'));
    }
    return { userId: userId, serviceId: normalizedServiceId };
  }

  function fixtureSet(userId) {
    var key = normalizeText(userId);
    if (!fixtureFavoritesByUser.has(key)) fixtureFavoritesByUser.set(key, new Set());
    return fixtureFavoritesByUser.get(key);
  }

  function readFixture(userId) {
    setProviderState('fixture-memory');
    return Array.from(fixtureSet(userId));
  }

  function remoteClient(context) {
    var client = getSupabaseClient();
    if (!client || typeof client.from !== 'function') {
      setProviderState('remote-unavailable');
      throw createAuthorityUnavailableError(context, lastRemoteError);
    }
    setProviderState('supabase');
    return client;
  }

  function list(options) {
    options = options || {};
    var user = options.user || getCurrentUser();
    var mode = resolveMode(user, '');
    if (mode === 'anonymous') return Promise.resolve([]);
    if (mode === 'fixture-memory') return Promise.resolve(readFixture(user.id));

    var identity;
    try {
      identity = requireRemoteIdentity(user, '', 'list');
    } catch (error) {
      return Promise.reject(error);
    }

    var client;
    try {
      client = remoteClient('list');
    } catch (error) {
      return Promise.reject(error);
    }

    return client
      .from(REMOTE_TABLE)
      .select('service_id')
      .eq('user_id', identity.userId)
      .then(function (response) {
        if (response && response.error) throw response.error;
        return (response && Array.isArray(response.data) ? response.data : [])
          .map(function (row) { return normalizeText(row && row.service_id); })
          .filter(Boolean);
      })
      .catch(function (error) {
        lastRemoteError = error;
        setProviderState('remote-unavailable');
        throw createAuthorityUnavailableError('list', error);
      });
  }

  function isFavorite(serviceId, options) {
    var normalizedServiceId = normalizeText(serviceId);
    if (!normalizedServiceId) return Promise.resolve(false);
    return list(options).then(function (ids) {
      return ids.indexOf(normalizedServiceId) !== -1;
    });
  }

  function add(serviceId, options) {
    options = options || {};
    var user = options.user || getCurrentUser();
    var normalizedServiceId = normalizeText(serviceId);
    var mode = resolveMode(user, normalizedServiceId);
    if (mode === 'anonymous') return Promise.reject(createAuthRequiredError());
    if (!normalizedServiceId) return Promise.reject(new Error('Serviço inválido para favorito.'));

    if (mode === 'fixture-memory') {
      fixtureSet(user.id).add(normalizedServiceId);
      setProviderState('fixture-memory');
      return Promise.resolve(true);
    }

    var identity;
    var client;
    try {
      identity = requireRemoteIdentity(user, normalizedServiceId, 'add');
      client = remoteClient('add');
    } catch (error) {
      return Promise.reject(error);
    }

    return client
      .from(REMOTE_TABLE)
      .insert({ user_id: identity.userId, service_id: identity.serviceId })
      .then(function (response) {
        if (response && response.error && String(response.error.code || '') !== '23505') throw response.error;
        return true;
      })
      .catch(function (error) {
        lastRemoteError = error;
        setProviderState('remote-unavailable');
        throw createAuthorityUnavailableError('add', error);
      });
  }

  function remove(serviceId, options) {
    options = options || {};
    var user = options.user || getCurrentUser();
    var normalizedServiceId = normalizeText(serviceId);
    var mode = resolveMode(user, normalizedServiceId);
    if (mode === 'anonymous') return Promise.reject(createAuthRequiredError());
    if (!normalizedServiceId) return Promise.reject(new Error('Serviço inválido para favorito.'));

    if (mode === 'fixture-memory') {
      fixtureSet(user.id).delete(normalizedServiceId);
      setProviderState('fixture-memory');
      return Promise.resolve(false);
    }

    var identity;
    var client;
    try {
      identity = requireRemoteIdentity(user, normalizedServiceId, 'remove');
      client = remoteClient('remove');
    } catch (error) {
      return Promise.reject(error);
    }

    return client
      .from(REMOTE_TABLE)
      .delete()
      .eq('user_id', identity.userId)
      .eq('service_id', identity.serviceId)
      .then(function (response) {
        if (response && response.error) throw response.error;
        return false;
      })
      .catch(function (error) {
        lastRemoteError = error;
        setProviderState('remote-unavailable');
        throw createAuthorityUnavailableError('remove', error);
      });
  }

  function toggle(serviceId, options) {
    options = options || {};
    return isFavorite(serviceId, options).then(function (active) {
      return active ? remove(serviceId, options) : add(serviceId, options);
    });
  }

  repositories.favorites = Object.freeze({
    authority: AUTHORITY,
    table: REMOTE_TABLE,
    list: list,
    isFavorite: isFavorite,
    add: add,
    remove: remove,
    toggle: toggle,
    getProviderState: function () {
      try {
        return document.documentElement.getAttribute(PROVIDER_ATTRIBUTE) || '';
      } catch (error) {
        return '';
      }
    },
    getLastRemoteError: function () { return lastRemoteError; }
  });
})();
