/* Community experience contract
   Responsibility: cache, stale-while-revalidate state and cross-route
   invalidation for the community listing and room surfaces. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var STALE_TIME = 15000;

  function getCurrentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') {
      return Doke.session.getCurrentUser() || null;
    }
    var auth = window.DokeAuth && window.DokeAuth.service;
    return auth && typeof auth.getCurrentUser === 'function' ? auth.getCurrentUser() : null;
  }

  function getIdentity() {
    var user = getCurrentUser() || {};
    var profile = user.profile || {};
    return String(
      user.accountId || user.userId || user.id || user.email ||
      profile.accountId || profile.userId || profile.id || profile.email ||
      'anonymous'
    ).trim().toLowerCase();
  }

  function getRole() {
    var user = getCurrentUser() || {};
    return String(user.activeRole || user.role || user.type || 'member').trim().toLowerCase();
  }

  function listingKey() {
    return 'communities:' + getIdentity() + ':' + getRole();
  }

  function roomKey(communityId) {
    return 'community-room:' + getIdentity() + ':' + String(communityId || 'unknown');
  }

  function setPageState(boundary, state, detail) {
    if (Doke.experience && Doke.experience.states) {
      Doke.experience.states.set(boundary, state, detail || {});
    } else if (boundary) {
      boundary.dataset.experienceState = state;
      boundary.setAttribute('aria-busy', ['loading', 'refreshing', 'submitting'].indexOf(state) !== -1 ? 'true' : 'false');
    }
    if (document.body) document.body.dataset.communityExperienceState = state;
    return state;
  }

  function query(options) {
    options = options || {};
    var boundary = options.boundary || null;
    var key = options.key;
    var fetcher = options.fetcher;
    var cache = Doke.experience && Doke.experience.cache;

    if (!cache || typeof cache.query !== 'function') {
      setPageState(boundary, 'loading', { domain: 'community' });
      return Promise.resolve().then(fetcher).then(function (data) {
        setPageState(boundary, Array.isArray(data) && data.length === 0 ? 'empty' : 'ready', { domain: 'community' });
        return { data: data, source: 'direct', stale: false, revalidate: null };
      });
    }

    var cached = cache.get(key);
    setPageState(boundary, cached && Object.prototype.hasOwnProperty.call(cached, 'data') ? 'refreshing' : 'loading', {
      domain: 'community',
      cacheKey: key
    });

    return cache.query({
      key: key,
      fetcher: fetcher,
      staleTime: Number(options.staleTime) || STALE_TIME,
      keepPreviousData: true,
      force: options.force === true
    }).then(function (result) {
      var data = result.data;
      setPageState(boundary, Array.isArray(data) && data.length === 0 ? 'empty' : 'ready', {
        domain: 'community',
        cacheKey: key,
        source: result.source
      });
      if (result.revalidate) {
        result.revalidate.then(function (freshData) {
          setPageState(boundary, Array.isArray(freshData) && freshData.length === 0 ? 'empty' : 'ready', {
            domain: 'community',
            cacheKey: key,
            source: 'revalidate'
          });
          document.dispatchEvent(new CustomEvent('doke:community-experience-updated', {
            detail: { key: key, data: freshData, source: 'revalidate' }
          }));
        }).catch(function (error) {
          setPageState(boundary, navigator.onLine === false ? 'offline' : 'error', {
            domain: 'community',
            cacheKey: key,
            error: error && error.message ? error.message : String(error)
          });
        });
      }
      return result;
    }).catch(function (error) {
      setPageState(boundary, navigator.onLine === false ? 'offline' : 'error', {
        domain: 'community',
        cacheKey: key,
        error: error && error.message ? error.message : String(error)
      });
      throw error;
    });
  }

  function loadListing(options) {
    options = options || {};
    return query({
      key: listingKey(),
      boundary: options.boundary,
      fetcher: options.fetcher,
      staleTime: options.staleTime,
      force: options.force
    });
  }

  function loadRoom(communityId, options) {
    options = options || {};
    return query({
      key: roomKey(communityId),
      boundary: options.boundary,
      fetcher: options.fetcher,
      staleTime: options.staleTime || 8000,
      force: options.force
    });
  }

  function invalidate(options) {
    options = options || {};
    var cache = Doke.experience && Doke.experience.cache;
    if (cache) {
      cache.invalidatePrefix('communities:');
      cache.invalidatePrefix('community-room:');
    }
    if (Doke.stableShellRouter && typeof Doke.stableShellRouter.invalidate === 'function') {
      Doke.stableShellRouter.invalidate('comunidade.html');
      Doke.stableShellRouter.invalidate('comunidade-interna.html');
    }
    document.dispatchEvent(new CustomEvent('doke:community-experience-invalidated', {
      detail: { reason: options.reason || 'community-change', communityId: options.communityId || '' }
    }));
  }

  ['doke:auth-session-change', 'doke:community-created', 'doke:community-updated',
    'doke:community-joined', 'doke:community-left', 'doke:community-request-updated',
    'doke:community-message-sent'].forEach(function (eventName) {
    document.addEventListener(eventName, function (event) {
      invalidate({ reason: eventName, communityId: event && event.detail && event.detail.communityId });
    });
  });

  Doke.communityExperience = Object.freeze({
    loadListing: loadListing,
    loadRoom: loadRoom,
    invalidate: invalidate,
    keys: Object.freeze({ listing: listingKey, room: roomKey }),
    states: Object.freeze({ set: setPageState })
  });
})();
