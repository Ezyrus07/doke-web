/* Doke messages experience
   Responsibility: shared conversation cache, stale-while-revalidate loading,
   domain invalidation and page state for the messages surface. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var STALE_TIME = 10000;
  var snapshot = [];
  var activeKey = '';

  function getCurrentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') {
      return Doke.session.getCurrentUser() || null;
    }
    try {
      var raw = window.localStorage.getItem('doke.auth.session.v1');
      var session = raw ? JSON.parse(raw) : null;
      return session && session.user ? session.user : null;
    } catch (error) {
      return null;
    }
  }

  function getCacheKey() {
    var user = getCurrentUser() || {};
    return 'messages:' + String(user.id || 'guest') + ':' + String(user.role || 'guest');
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; }
  }

  function normalizeList(value) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
  }

  function setPageState(state, detail) {
    var boundary = document.querySelector('[data-state-boundary="mensagens"]');
    if (Doke.experience && Doke.experience.states) {
      Doke.experience.states.set(boundary, state, Object.assign({ domain: 'messages' }, detail || {}));
    } else if (boundary) {
      boundary.dataset.viewState = state;
      boundary.dataset.experienceState = state;
      boundary.setAttribute('aria-busy', ['loading', 'refreshing', 'submitting'].indexOf(state) !== -1 ? 'true' : 'false');
    }
    if (document.body) document.body.dataset.messagesExperienceState = state;
  }

  function emitUpdated(items, detail) {
    snapshot = normalizeList(items);
    document.dispatchEvent(new CustomEvent('doke:messages-experience-updated', {
      detail: Object.assign({ items: clone(snapshot), cacheKey: activeKey || getCacheKey() }, detail || {})
    }));
    return snapshot;
  }

  function fetchConversations() {
    var service = Doke.services && Doke.services.messages;
    if (!service || typeof service.listConversations !== 'function') {
      if (service && typeof service.listLocalConversations === 'function') {
        return Promise.resolve(normalizeList(service.listLocalConversations({ currentUser: true })));
      }
      return Promise.resolve([]);
    }
    return Promise.resolve(service.listConversations({ currentUser: true, fresh: true })).then(normalizeList);
  }

  function load(options) {
    options = options || {};
    var key = getCacheKey();
    activeKey = key;
    var cache = Doke.experience && Doke.experience.cache;
    var hasSnapshot = snapshot.length > 0;
    setPageState(hasSnapshot ? 'refreshing' : 'loading', { cacheKey: key });

    if (!cache || typeof cache.query !== 'function') {
      return fetchConversations().then(function (items) {
        emitUpdated(items, { source: 'repository', stale: false });
        setPageState(items.length ? 'ready' : 'empty', { cacheKey: key });
        return { data: clone(items), source: 'repository', stale: false };
      }).catch(function (error) {
        setPageState(navigator.onLine === false ? 'offline' : 'error', { cacheKey: key, error: error && error.message });
        throw error;
      });
    }

    return cache.query({
      key: key,
      staleTime: STALE_TIME,
      keepPreviousData: true,
      force: options.force === true,
      fetcher: fetchConversations
    }).then(function (result) {
      var items = normalizeList(result.data);
      emitUpdated(items, { source: result.source, stale: result.stale === true });
      setPageState(items.length ? (result.stale ? 'refreshing' : 'ready') : (result.stale ? 'refreshing' : 'empty'), { cacheKey: key });

      if (result.revalidate && typeof result.revalidate.then === 'function') {
        result.revalidate.then(function (freshItems) {
          var normalized = normalizeList(freshItems);
          emitUpdated(normalized, { source: 'revalidate', stale: false });
          setPageState(normalized.length ? 'ready' : 'empty', { cacheKey: key });
        }).catch(function (error) {
          setPageState(items.length ? 'ready' : (navigator.onLine === false ? 'offline' : 'error'), { cacheKey: key, error: error && error.message });
        });
      }
      return result;
    }).catch(function (error) {
      setPageState(snapshot.length ? 'ready' : (navigator.onLine === false ? 'offline' : 'error'), { cacheKey: key, error: error && error.message });
      throw error;
    });
  }

  function invalidate() {
    var domainInvalidation = Doke.experience && Doke.experience.invalidation;
    if (domainInvalidation && typeof domainInvalidation.invalidateDomains === 'function') {
      return domainInvalidation.invalidateDomains(['messages'], { reason: 'messages-experience' });
    }
    var cache = Doke.experience && Doke.experience.cache;
    if (cache && typeof cache.invalidatePrefix === 'function') cache.invalidatePrefix('messages:');
    if (Doke.stableShellRouter && typeof Doke.stableShellRouter.invalidate === 'function') {
      Doke.stableShellRouter.invalidate('mensagens.html');
    }
    return null;
  }

  function getSnapshot() {
    return clone(snapshot);
  }

  function prime(items) {
    var normalized = normalizeList(items);
    snapshot = normalized;
    activeKey = getCacheKey();
    var cache = Doke.experience && Doke.experience.cache;
    if (cache && typeof cache.write === 'function') cache.write(activeKey, clone(normalized), { staleTime: STALE_TIME });
    return clone(snapshot);
  }

  if (!(Doke.experience && Doke.experience.invalidation)) {
    ['doke:auth-session-change', 'doke:order-created', 'doke:order-status-changed', 'doke:message-sent'].forEach(function (eventName) {
      document.addEventListener(eventName, function () { invalidate(); });
    });
  }

  Doke.messagesExperience = Object.freeze({
    load: load,
    invalidate: invalidate,
    getSnapshot: getSnapshot,
    prime: prime,
    getCacheKey: getCacheKey
  });
})();
