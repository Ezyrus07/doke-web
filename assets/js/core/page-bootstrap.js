(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var auth = root.DokeAuth || (root.DokeAuth = {});
  var bootstrapScriptUrl = document.currentScript && document.currentScript.src || '';

  function pageName() {
    return (root.location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
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

  function coreScriptUrl(fileName) {
    try {
      if (bootstrapScriptUrl) return new URL(fileName, bootstrapScriptUrl).href;
      return new URL('assets/js/core/' + fileName, document.baseURI).href;
    } catch (error) {
      return 'assets/js/core/' + fileName;
    }
  }

  function findScript(fileName) {
    var suffix = '/assets/js/core/' + fileName;
    return Array.prototype.find.call(document.scripts || [], function (script) {
      try {
        return new URL(script.src, document.baseURI).pathname.endsWith(suffix);
      } catch (error) {
        return String(script.src || '').split('?')[0].endsWith('assets/js/core/' + fileName);
      }
    }) || null;
  }

  function loadCoreScript(fileName, ready) {
    if (typeof ready === 'function' && ready()) return Promise.resolve();
    var existing = findScript(fileName);

    return new Promise(function (resolve, reject) {
      var script = existing || document.createElement('script');
      var settled = false;
      var finish = function () {
        if (settled) return;
        settled = true;
        resolve();
      };
      var fail = function () {
        if (settled) return;
        settled = true;
        reject(new Error('Não foi possível carregar ' + fileName + '.'));
      };

      if (existing) {
        if (typeof ready === 'function' && ready()) return finish();
        existing.addEventListener('load', finish, { once: true });
        existing.addEventListener('error', fail, { once: true });
        root.setTimeout(function () {
          if (typeof ready === 'function' && ready()) finish();
          else fail();
        }, 1800);
        return;
      }

      script.src = coreScriptUrl(fileName);
      script.async = false;
      script.dataset.dokeAuthCore = fileName;
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', fail, { once: true });
      (document.head || document.documentElement).appendChild(script);
    });
  }

  async function ensureAuthRouteGuard() {
    await loadCoreScript('auth-route-map.js', function () {
      return Boolean(auth.routes && typeof auth.routes.getRoutePolicy === 'function');
    });
    await loadCoreScript('route-guard.js', function () {
      return Boolean(auth.guard && typeof auth.guard.evaluate === 'function');
    });
    return auth.guard && typeof auth.guard.evaluate === 'function'
      ? auth.guard.evaluate()
      : null;
  }

  function failClosedAuthGuard(error) {
    var html = document.documentElement;
    var protectedSurface = html.hasAttribute('data-auth-guard');
    if (!protectedSurface) {
      console.warn && console.warn('[Doke] Auth route guard indisponível.', error);
      return;
    }
    html.dataset.authGuard = 'error';
    html.dataset.authRouteDecision = 'error';
    html.dataset.authGuardMode = 'enforce';
    console.error && console.error('[Doke] Falha fechada no guard de autenticação.', error);
  }

  async function bootstrap() {
    applyPageMetadata();

    if (!Doke.rolloutGuard || Doke.rolloutGuard.shouldRun('authSessionBootstrap')) {
      if (Doke.session) Doke.session.bootstrap();
    } else {
      Doke.rolloutGuard.mark('authSessionBootstrap', 'skipped', 'feature-flag-disabled');
    }

    try {
      await ensureAuthRouteGuard();
    } catch (error) {
      failClosedAuthGuard(error);
    }

    applyPermissionHooks();
    if (Doke.state) Doke.state.set('bootstrapped', true);
    document.documentElement.classList.add('doke-app-ready');
    document.dispatchEvent(new CustomEvent('doke:page-bootstrap-ready', {
      detail: { authGuardReady: Boolean(auth.guard) }
    }));
  }

  Doke.pageBootstrap = Object.freeze({
    bootstrap: bootstrap,
    ensureAuthRouteGuard: ensureAuthRouteGuard
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
