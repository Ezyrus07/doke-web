(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  function mockUserFromEmail(email, role) {
    var username = String(email || 'gabriel@doke.local').split('@')[0];
    return {
      user: {
        id: 'mock-user-' + username.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
        email: email || 'gabriel@doke.local',
        name: username.charAt(0).toUpperCase() + username.slice(1)
      },
      profile: {
        id: 'mock-profile-' + username.replace(/[^a-z0-9]/gi, '-').toLowerCase(),
        displayName: username.charAt(0).toUpperCase() + username.slice(1),
        role: role || 'client',
        city: 'Salvador',
        state: 'BA'
      },
      issuedAt: new Date().toISOString(),
      provider: 'mock'
    };
  }

  async function getCurrentUser() {
    var session = Doke.session ? Doke.session.read() : null;
    return session ? session.user : null;
  }

  async function getCurrentSession() {
    return Doke.session ? Doke.session.read() : null;
  }

  async function signIn(payload) {
    var session = mockUserFromEmail(payload && payload.email, payload && payload.role);
    if (Doke.session) Doke.session.write(session), Doke.session.apply(session);
    return session;
  }

  async function signOut() {
    if (Doke.session) Doke.session.clear(), Doke.session.apply(null);
    return true;
  }

  function requireAuth(options) {
    var session = Doke.session ? Doke.session.read() : null;
    if (session) return session;
    if (options && options.redirectTo) window.location.href = options.redirectTo;
    return null;
  }

  function requireRole(roles, options) {
    var session = requireAuth(options);
    if (!session) return null;
    var allowed = Array.isArray(roles) ? roles : [roles];
    var role = session.profile && session.profile.role ? session.profile.role : 'guest';
    if (allowed.indexOf(role) >= 0 || role === 'admin') return session;
    if (options && options.redirectTo) window.location.href = options.redirectTo;
    return null;
  }

  Doke.auth = { getCurrentUser: getCurrentUser, getCurrentSession: getCurrentSession, signIn: signIn, signOut: signOut, requireAuth: requireAuth, requireRole: requireRole };
})();
