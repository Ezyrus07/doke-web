/* Doke state/session-store.js
   Responsibility: expose the canonical session authority from assets/js/core/session.js
   for future data-ready imports without duplicating localStorage contracts. */
(function () {
  'use strict';

  const Doke = window.Doke || (window.Doke = {});
  const ns = window.DokeAuth || (window.DokeAuth = {});

  if (!ns.session) {
    console.warn('[DokeSessionStore] assets/js/core/session.js must be loaded before session-store.js.');
  }

  const api = ns.session || {
    getCurrentUser: () => null,
    setCurrentUser: () => null,
    clear: () => null,
    isAuthenticated: () => false,
    hasRole: () => false,
    subscribe: () => () => {}
  };

  Doke.sessionStore = api;
  ns.sessionStore = api;
})();
