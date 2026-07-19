/* Doke authenticated account access service
 * Responsibility: resolve access to owner-only account surfaces through the
 * canonical session and navigation lifecycle authorities. Pages own only
 * their structural loading, ready and error surfaces.
 */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  Doke.services = Doke.services || {};

  if (Doke.services.accountAccess) return;

  function lifecycle() {
    return window.DokeNavigationLifecycle || Doke.navigationLifecycle || null;
  }

  function sessionStore() {
    return Doke.session || window.DokeAuth && window.DokeAuth.session || null;
  }


  function readCachedUser() {
    var keys = ['doke.auth.session.v1', 'doke.auth.session.v2', 'doke.auth.session'];
    for (var index = 0; index < keys.length; index += 1) {
      try {
        var raw = window.localStorage.getItem(keys[index]);
        var parsed = raw ? JSON.parse(raw) : null;
        var user = parsed && (parsed.user || parsed.currentUser);
        if (user && user.id) return user;
      } catch (error) {}
    }
    return null;
  }

  function getCurrentUser() {
    var session = sessionStore();
    if (!session || typeof session.getCurrentUser !== 'function') return null;
    return session.getCurrentUser() || readCachedUser() || null;
  }

  function resolveAccess() {
    return Promise.resolve().then(function () {
      var session = sessionStore();
      var user = getCurrentUser() || readCachedUser();
      return Object.freeze({
        allowed: Boolean(user),
        authenticated: Boolean(user),
        user: user,
        reason: user ? 'allowed' : 'auth_required'
      });
    });
  }

  function safeTarget(options) {
    options = options || {};
    var next = options.next || window.location.pathname + window.location.search;
    return (options.loginRedirect || 'auth/login.html') + '?next=' + encodeURIComponent(next);
  }

  function navigate(target, options) {
    options = options || {};
    var api = lifecycle();
    var go = api && api.navigation && api.navigation.go
      || Doke.navigation && Doke.navigation.go
      || window.DokeNavigate;

    if (typeof go === 'function') {
      return Promise.resolve(go(target, {
        replace: true,
        forceDocument: true,
        source: options.source || 'account-access-guard'
      }));
    }

    window.location.replace(target);
    return Promise.resolve(true);
  }

  function guardPage(options) {
    options = options || {};
    var api = lifecycle();
    var guardId = api && api.guard
      ? api.guard.begin({
          name: options.name || 'account-access',
          source: options.source || window.location.pathname
        })
      : 0;

    return resolveAccess().then(function (result) {
      if (result.allowed) {
        if (api && api.guard) api.guard.allow(guardId, { userId: result.user && result.user.id || '' });
        return result;
      }

      var target = safeTarget(options);
      if (api && api.guard) {
        api.guard.redirect(guardId, target, { reason: result.reason });
      }

      if (options.redirect === false) {
        return Object.freeze(Object.assign({}, result, { target: target, redirecting: false }));
      }

      return navigate(target, { source: options.source || 'account-access-guard' }).then(function () {
        return Object.freeze(Object.assign({}, result, { target: target, redirecting: true }));
      });
    }).catch(function (error) {
      if (api && api.guard) {
        api.guard.fail(guardId, error, { source: options.source || window.location.pathname });
      }
      throw error;
    });
  }

  Doke.services.accountAccess = Object.freeze({
    getCurrentUser: getCurrentUser,
    resolveAccess: resolveAccess,
    guardPage: guardPage
  });
}());
