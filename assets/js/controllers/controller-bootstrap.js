(function () {
  'use strict';

  function boot() {
    if (!window.Doke || !window.Doke.controllers) return;
    if (window.Doke.rolloutGuard && !window.Doke.rolloutGuard.shouldRun('controllerBootstrap')) {
      document.documentElement.setAttribute('data-doke-controller', 'disabled');
      window.Doke.rolloutGuard.mark('controllerBootstrap', 'skipped', 'feature-flag-disabled');
      return;
    }
    var result = window.Doke.controllers.initCurrentPage({ phase: 'stage32-runtime-flags' });
    document.documentElement.setAttribute('data-doke-controller', result.initialized ? result.page : 'none');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
