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

  var ACCESS_REFRESH_TIMEOUT = 2500;

  function lifecycle() {
    return window.DokeNavigationLifecycle || Doke.navigationLifecycle || null;
  }

  function sessionStore() {
    return Doke.session || window.DokeAuth && window.DokeAuth.session || null;
  }

  function authService() {
    return window.DokeAuth && window.DokeAuth.service || null;
  }

  function setGuardState(state) {
    if (document.documentElement) document.documentElement.dataset.authGuard = state;
    if (document.body) document.body.dataset.authGuard = state;
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
    if (!session || typeof session.getCurrentUser !== 'function') return readCachedUser() || null;
    return session.getCurrentUser() || readCachedUser() || null;
  }

  function refreshCanonicalSession() {
    var auth = authService();
    if (!auth || typeof auth.refreshSession !== 'function') return Promise.resolve(null);

    var refresh = Promise.resolve()
      .then(function () { return auth.refreshSession({ silent: true }); })
      .catch(function () { return null; });
    var timeout = new Promise(function (resolve) {
      window.setTimeout(function () { resolve(null); }, ACCESS_REFRESH_TIMEOUT);
    });
    return Promise.race([refresh, timeout]);
  }

  function buildAccessResult(user) {
    return Object.freeze({
      allowed: Boolean(user),
      authenticated: Boolean(user),
      user: user || null,
      reason: user ? 'allowed' : 'auth_required'
    });
  }

  function resolveAccess() {
    return Promise.resolve().then(function () {
      var immediateUser = getCurrentUser();
      if (immediateUser) return buildAccessResult(immediateUser);

      return refreshCanonicalSession().then(function () {
        return buildAccessResult(getCurrentUser());
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

    setGuardState('pending');
    return resolveAccess().then(function (result) {
      if (result.allowed) {
        setGuardState('allowed');
        if (api && api.guard) api.guard.allow(guardId, { userId: result.user && result.user.id || '' });
        return result;
      }

      var target = safeTarget(options);
      if (api && api.guard) {
        api.guard.redirect(guardId, target, { reason: result.reason });
      }

      if (options.redirect === false) {
        setGuardState('denied');
        return Object.freeze(Object.assign({}, result, { target: target, redirecting: false }));
      }

      setGuardState('redirecting');
      return navigate(target, { source: options.source || 'account-access-guard' }).then(function () {
        return Object.freeze(Object.assign({}, result, { target: target, redirecting: true }));
      });
    }).catch(function (error) {
      setGuardState('error');
      if (api && api.guard) {
        api.guard.fail(guardId, error, { source: options.source || window.location.pathname });
      }
      throw error;
    });
  }

  Doke.services.accountAccess = Object.freeze({
    getCurrentUser: getCurrentUser,
    resolveAccess: resolveAccess,
    refreshCanonicalSession: refreshCanonicalSession,
    guardPage: guardPage
  });
}());