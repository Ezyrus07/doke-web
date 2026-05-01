(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var STORAGE_KEY = 'doke.session.v1';

  function safeParse(value) {
    try { return JSON.parse(value); } catch (_) { return null; }
  }

  function read() {
    var raw = window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : null;
    var session = raw ? safeParse(raw) : null;
    if (!session || !session.user) return null;
    return session;
  }

  function write(session) {
    if (!window.localStorage) return session;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  function clear() {
    if (window.localStorage) window.localStorage.removeItem(STORAGE_KEY);
  }

  function currentRole(session) {
    return session && session.profile && session.profile.role ? session.profile.role : 'guest';
  }

  function apply(session) {
    var role = currentRole(session);
    var permissions = Doke.permissions ? Doke.permissions.permissionsForRole(role) : [];
    if (Doke.state) {
      Doke.state.merge('auth', {
        status: session ? 'authenticated' : 'anonymous',
        user: session ? session.user : null,
        profile: session ? session.profile : null,
        role: role,
        permissions: permissions
      });
    }
    document.documentElement.setAttribute('data-auth-state', session ? 'authenticated' : 'anonymous');
    document.documentElement.setAttribute('data-user-role', role);
    return session;
  }

  function bootstrap() {
    return apply(read());
  }

  Doke.session = { read: read, write: write, clear: clear, apply: apply, bootstrap: bootstrap };
})();
