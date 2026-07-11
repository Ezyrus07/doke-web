/* Doke orders role gate — runs before first paint.
   Responsibility: expose the persisted account role early enough for CSS to
   suppress professional-only surfaces before deferred session hydration. */
(function () {
  'use strict';

  var root = document.documentElement;
  var keys = ['doke.auth.session.v1', 'doke.auth.session.v2', 'doke.auth.session'];

  function parse(value) {
    try {
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }

  function normalize(role) {
    var value = String(role || '').trim().toLowerCase();
    if (value === 'pro' || value === 'worker') return 'professional';
    if (value === 'user' || value === 'customer') return 'client';
    if (value === 'professional' || value === 'client') return value;
    return 'guest';
  }

  function roleFromSession(session) {
    if (!session || typeof session !== 'object') return 'guest';
    var user = session.user || session.currentUser || session;
    if (!user || typeof user !== 'object') return 'guest';
    return normalize(
      user.role ||
      user.type ||
      user.profileKind ||
      (user.profile && (user.profile.role || user.profile.type)) ||
      (user.activeProfile && (user.activeProfile.role || user.activeProfile.type))
    );
  }

  var role = 'guest';
  for (var index = 0; index < keys.length; index += 1) {
    try {
      role = roleFromSession(parse(window.localStorage.getItem(keys[index])));
    } catch (error) {
      role = 'guest';
    }
    if (role !== 'guest') break;
  }

  root.dataset.ordersRole = role;
}());
