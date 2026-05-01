(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  function pageName() {
    return (window.location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  }

  function applyPageMetadata() {
    var page = document.body && document.body.getAttribute('data-page') || pageName();
    document.documentElement.setAttribute('data-doke-page', page);
    if (Doke.state) Doke.state.merge('ui', { page: page });
  }

  function applyPermissionHooks() {
    var role = Doke.state ? Doke.state.get('auth.role') : 'guest';
    var nodes = document.querySelectorAll('[data-requires-permission]');
    nodes.forEach(function (node) {
      var permission = node.getAttribute('data-requires-permission');
      var allowed = Doke.permissions ? Doke.permissions.has(permission, role) : false;
      node.toggleAttribute('hidden', !allowed);
      node.setAttribute('aria-hidden', allowed ? 'false' : 'true');
    });
  }

  function bootstrap() {
    applyPageMetadata();
    if (!Doke.rolloutGuard || Doke.rolloutGuard.shouldRun('authSessionBootstrap')) {
      if (Doke.session) Doke.session.bootstrap();
      applyPermissionHooks();
    } else {
      Doke.rolloutGuard.mark('authSessionBootstrap', 'skipped', 'feature-flag-disabled');
    }
    if (Doke.state) Doke.state.set('bootstrapped', true);
    document.documentElement.classList.add('doke-app-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
