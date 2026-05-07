/* Doke Auth Route Guard
   Responsibility: evaluate auth route state.
   Default mode is "observe", not "enforce", to avoid breaking unfinished pages. */
(function () {
  const ns = (window.DokeAuth = window.DokeAuth || {});

  const getMode = () => {
    const htmlMode = document.documentElement.dataset.authGuard;
    const bodyMode = document.body?.dataset.authGuard;
    return htmlMode || bodyMode || 'observe';
  };

  const getRedirects = () => ({
    login: document.documentElement.dataset.authLoginUrl || 'auth/login.html',
    app: document.documentElement.dataset.authAppUrl || 'index.html'
  });

  const evaluate = () => {
    if (!ns.routes || !ns.service) return null;

    const mode = getMode();
    const enforce = mode === 'enforce';
    const routeType = ns.routes.getRouteType();
    const authenticated = ns.service.isAuthenticated();
    const redirects = getRedirects();

    document.documentElement.dataset.authRouteType = routeType;
    document.documentElement.dataset.authenticated = String(authenticated);
    document.documentElement.dataset.authGuardMode = mode;

    if (routeType === 'private') {
      ns.service.requireAuth({ enforce, redirectToLogin: redirects.login });
    }

    if (routeType === 'auth') {
      ns.service.redirectIfAuthenticated({ enforce, redirectToApp: redirects.app });
    }

    document.dispatchEvent(new CustomEvent('doke:auth-route-evaluated', {
      detail: {
        mode,
        enforce,
        routeType,
        authenticated
      }
    }));

    return {
      mode,
      enforce,
      routeType,
      authenticated
    };
  };

  const bind = () => {
    evaluate();
    ns.service?.onAuthChange?.(evaluate);
  };

  ns.guard = Object.freeze({
    evaluate,
    bind
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
