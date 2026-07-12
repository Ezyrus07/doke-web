(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var DEFAULT_TTL = 24 * 60 * 60 * 1000;

  function normalize(value) { return String(value == null ? '' : value).trim(); }
  function safeParse(value, fallback) { try { return JSON.parse(value); } catch (_) { return fallback; } }
  function currentUserId() {
    var user = null;
    try { user = Doke.session && Doke.session.getCurrentUser && Doke.session.getCurrentUser(); } catch (_) {}
    if (!user) {
      try { user = Doke.auth && Doke.auth.getCurrentUser && Doke.auth.getCurrentUser(); } catch (_) {}
    }
    if (!user) {
      var session = safeParse(localStorage.getItem('doke.auth.session.v1'), null)
        || safeParse(localStorage.getItem('doke.auth.session'), null)
        || safeParse(localStorage.getItem('doke.currentUser'), null);
      user = session && (session.user || session);
    }
    return normalize(user && (user.id || user.userId || user.uid)) || 'guest';
  }

  function createStateController(options) {
    var boundary = options.boundary;
    var bodyDatasetKey = options.bodyDatasetKey;
    return function setState(state, detail) {
      if (boundary) {
        boundary.dataset.viewState = state;
        boundary.setAttribute('aria-busy', state === 'loading' || state === 'submitting' || state === 'refreshing' ? 'true' : 'false');
      }
      if (document.body && bodyDatasetKey) document.body.dataset[bodyDatasetKey] = state;
      if (Doke.experience && Doke.experience.states && typeof Doke.experience.states.set === 'function') {
        Doke.experience.states.set(boundary || document.body, state, detail || {});
      }
    };
  }

  function createDraftStore(options) {
    var prefix = options.prefix;
    var context = typeof options.context === 'function' ? options.context : function () { return options.context || ''; };
    var ttl = Number(options.ttl || DEFAULT_TTL);
    var version = Number(options.version || 1);
    var verify = options.verify !== false;
    var timer = 0;

    function key() {
      var suffix = normalize(context());
      return prefix + ':' + currentUserId() + (suffix ? ':' + suffix : '');
    }
    function read() {
      var record = safeParse(localStorage.getItem(key()), null);
      if (!record || record.version !== version || !record.savedAt || Date.now() - Number(record.savedAt) > ttl) {
        try { localStorage.removeItem(key()); } catch (_) {}
        return null;
      }
      return record.payload;
    }
    function write(payload) {
      var record = { version: version, savedAt: Date.now(), payload: payload };
      localStorage.setItem(key(), JSON.stringify(record));
      if (verify) {
        var confirmed = safeParse(localStorage.getItem(key()), null);
        if (!confirmed || confirmed.version !== version || confirmed.savedAt !== record.savedAt) {
          throw new Error('Não foi possível confirmar a persistência do rascunho.');
        }
      }
      return payload;
    }
    function clear() { try { localStorage.removeItem(key()); } catch (_) {} }
    function schedule(factory, delay) {
      clearTimeout(timer);
      timer = setTimeout(function () { try { write(factory()); } catch (_) {} }, Number(delay || 220));
    }
    function cancel() { clearTimeout(timer); }
    return { key: key, read: read, write: write, clear: clear, schedule: schedule, cancel: cancel };
  }

  function createMutationGuard() {
    var active = new Map();
    return {
      run: function (key, task) {
        if (active.has(key)) return active.get(key);
        var promise = Promise.resolve().then(task).finally(function () { active.delete(key); });
        active.set(key, promise);
        return promise;
      },
      isRunning: function (key) { return active.has(key); }
    };
  }

  function invalidate(options) {
    options = options || {};
    var invalidation = Doke.experience && Doke.experience.invalidation;
    if (invalidation && typeof invalidation.invalidateDomains === 'function') {
      return invalidation.invalidateDomains(options.domains || [], {
        cachePrefixes: options.cachePrefixes || [],
        routes: options.routes || [],
        pageData: options.pageData || [],
        reason: options.reason || 'form-experience'
      });
    }

    var cachePrefixes = options.cachePrefixes || [];
    var routes = options.routes || [];
    cachePrefixes.forEach(function (prefix) {
      if (Doke.experience && Doke.experience.cache) {
        if (typeof Doke.experience.cache.invalidatePrefix === 'function') Doke.experience.cache.invalidatePrefix(prefix);
        else if (typeof Doke.experience.cache.invalidate === 'function') Doke.experience.cache.invalidate(prefix);
      }
    });
    routes.forEach(function (route) {
      if (Doke.stableShellRouter && Doke.stableShellRouter.invalidate) Doke.stableShellRouter.invalidate(route);
    });
    return null;
  }

  Doke.formExperienceCore = Object.freeze({
    normalize: normalize,
    currentUserId: currentUserId,
    createStateController: createStateController,
    createDraftStore: createDraftStore,
    createMutationGuard: createMutationGuard,
    invalidate: invalidate
  });
})();
