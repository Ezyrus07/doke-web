/* Doke AUTH-A06 compatibility guard.
   Responsibility: preserve the historical DokeAuthGuard.hasSession surface while
   delegating the decision to the canonical auth/session authority. */
(function () {
  'use strict';

  const getAuthService = () => window.DokeAuth?.service || window.DokeAuth || null;

  const hasSession = () => {
    const service = getAuthService();
    try {
      return Boolean(service?.getCurrentUser?.() || service?.getSession?.()?.user);
    } catch {
      return false;
    }
  };

  window.DokeAuthGuard = Object.freeze({
    version: 'AUTH-A06-COMPAT',
    authority: 'DokeAuth.service',
    hasSession
  });
})();
