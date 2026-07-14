/* Doke admin access service
 * Responsibility: resolve administrative access through the canonical session,
 * permission and navigation lifecycle authorities. Page controllers own only
 * their visual pending/ready/error surfaces.
 */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  Doke.services = Doke.services || {};

  if (Doke.services.adminAccess) return;

  var ADMIN_ROLES = Object.freeze(['admin', 'support']);

  function lifecycle() {
    return window.DokeNavigationLifecycle || Doke.navigationLifecycle || null;
  }

  function sessionStore() {
    return Doke.session || window.DokeAuth && window.DokeAuth.session || null;
  }

  function getCurrentUser() {
    var session = sessionStore();
    if (!session || typeof session.getCurrentUser !== 'function') return null;
    return session.getCurrentUser();
  }

  function normalizeRole(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function canUseAdmin(user) {
    var current = user || getCurrentUser();
    if (!current) return false;

    var session = sessionStore();
    if (session && typeof session.canAccessAdmin === 'function') {
      return session.canAccessAdmin() === true;
    }

    if (Doke.permissions && typeof Doke.permissions.canAccessAdmin === 'function') {
      return Doke.permissions.canAccessAdmin(current) === true;
    }

    var role = normalizeRole(current.role || current.type);
    return ADMIN_ROLES.indexOf(role) >= 0 || current.isMockSupport === true || current.mockSupport === true;
  }

  function resolveAccess() {
    return Promise.resolve().then(function () {
      var session = sessionStore();
      if (!session || typeof session.getCurrentUser !== 'function') {
        throw new Error('A sessão administrativa ainda não está disponível.');
      }

      var user = getCurrentUser();
      var authenticated = Boolean(user);
      return Object.freeze({
        allowed: authenticated && canUseAdmin(user),
        authenticated: authenticated,
        user: user,
        role: normalizeRole(user && (user.role || user.type)),
        reason: !authenticated ? 'auth_required' : canUseAdmin(user) ? 'allowed' : 'admin_role_required'
      });
    });
  }

  function safeTarget(result, options) {
    options = options || {};
    if (!result || result.authenticated !== true) {
      var next = options.next || window.location.pathname + window.location.search;
      return (options.loginRedirect || 'auth/login.html') + '?next=' + encodeURIComponent(next);
    }
    return options.deniedRedirect || 'pedidos.html';
  }

  function navigate(target, options) {
    var api = lifecycle();
    var go = api && api.navigation && api.navigation.go
      || Doke.navigation && Doke.navigation.go
      || window.DokeNavigate;

    if (typeof go === 'function') {
      return Promise.resolve(go(target, {
        replace: true,
        forceDocument: true,
        source: options && options.source || 'admin-access-guard'
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
          name: options.name || 'admin-access',
          source: options.source || window.location.pathname
        })
      : 0;

    return resolveAccess().then(function (result) {
      if (result.allowed) {
        if (api && api.guard) api.guard.allow(guardId, { role: result.role });
        return result;
      }

      var target = safeTarget(result, options);
      if (api && api.guard) {
        api.guard.redirect(guardId, target, {
          reason: result.reason,
          role: result.role
        });
      }

      if (options.redirect === false) {
        return Object.freeze(Object.assign({}, result, { target: target, redirecting: false }));
      }

      return navigate(target, {
        source: options.source || 'admin-access-guard'
      }).then(function () {
        return Object.freeze(Object.assign({}, result, { target: target, redirecting: true }));
      });
    }).catch(function (error) {
      if (api && api.guard) {
        api.guard.fail(guardId, error, {
          source: options.source || window.location.pathname
        });
      }
      throw error;
    });
  }

  Doke.services.adminAccess = Object.freeze({
    roles: ADMIN_ROLES,
    getCurrentUser: getCurrentUser,
    canUseAdmin: canUseAdmin,
    resolveAccess: resolveAccess,
    guardPage: guardPage
  });
}());
