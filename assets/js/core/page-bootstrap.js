(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var auth = root.DokeAuth || (root.DokeAuth = {});
  var bootstrapScriptUrl = document.currentScript && document.currentScript.src || '';
  var OVERLAY_EXPERIENCE_VERSION = '20260804-ux-nav-001-v1';
  var ACCESSIBILITY_EXPERIENCE_VERSION = '20260804-ux-a11y-001-v1';
  var RESPONSIVE_EXPERIENCE_VERSION = '20260804-ux-resp-001-v1';
  var PERFORMANCE_EXPERIENCE_VERSION = '20260804-ux-perf-001-v1';
  var NEWS_PERFORMANCE_PILOT_VERSION = '20260804-ux-perf-001-news-v1';

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

  function assetUrl(relativePath) {
    try {
      if (bootstrapScriptUrl) {
        var assetsRoot = new URL('../../../', bootstrapScriptUrl);
        return new URL(String(relativePath || ''), assetsRoot).href;
      }
      return new URL(String(relativePath || ''), document.baseURI).href;
    } catch (error) {
      return String(relativePath || '');
    }
  }

  function coreScriptUrl(fileName) {
    return assetUrl('assets/js/core/' + fileName);
  }

  function pageScriptUrl(fileName) {
    return assetUrl('assets/js/pages/' + fileName);
  }

  function findScriptByUrl(src) {
    var expected = '';
    try {
      expected = new URL(src, document.baseURI).href;
    } catch (error) {
      expected = String(src || '');
    }
    return Array.prototype.find.call(document.scripts || [], function (script) {
      try {
        return new URL(script.src, document.baseURI).href === expected;
      } catch (error) {
        return String(script.src || '') === expected;
      }
    }) || null;
  }

  function loadScript(src, ready, datasetValue) {
    if (typeof ready === 'function' && ready()) return Promise.resolve();
    var existing = findScriptByUrl(src);

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
        reject(new Error('Não foi possível carregar ' + src + '.'));
      };

      if (existing) {
        if (typeof ready !== 'function' || ready()) return finish();
        existing.addEventListener('load', finish, { once: true });
        existing.addEventListener('error', fail, { once: true });
        root.setTimeout(function () {
          if (typeof ready !== 'function' || ready()) finish();
          else fail();
        }, 2200);
        return;
      }

      script.src = src;
      script.async = false;
      if (datasetValue) script.dataset.dokeAuthCapability = datasetValue;
      script.addEventListener('load', function () {
        if (typeof ready !== 'function' || ready()) finish();
        else fail();
      }, { once: true });
      script.addEventListener('error', fail, { once: true });
      (document.head || document.documentElement).appendChild(script);
    });
  }

  function loadCoreScript(fileName, ready) {
    return loadScript(coreScriptUrl(fileName), ready, fileName);
  }

  function ensureStyle(relativePath, datasetValue) {
    var href = assetUrl(relativePath);
    var exists = Array.prototype.some.call(document.styleSheets || [], function (sheet) {
      return sheet && sheet.href === href;
    }) || Boolean(document.querySelector('link[href="' + href + '"]'));
    if (exists) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.dokeAuthCapability = datasetValue || 'runtime-style';
    (document.head || document.documentElement).appendChild(link);
  }

  async function ensureAuthSessionAuthority() {
    await loadScript(assetUrl('assets/js/services/auth-session-authority.js'), function () {
      return Boolean(auth.sessionAuthority && auth.sessionAuthority.version === 'AUTH-A06');
    }, 'session-authority');
    return auth.sessionAuthority || null;
  }

  async function ensureSettingsPasswordAuthority() {
    if (pageName() !== 'configuracoes') return null;

    ensureStyle('assets/css/components/auth/password-dialog.css', 'settings-password-style');
    await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', function () {
      return Boolean(root.supabase && typeof root.supabase.createClient === 'function');
    }, 'supabase-sdk');
    await loadScript(assetUrl('assets/js/core/supabase-config.js'), function () {
      return Boolean(root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function');
    }, 'supabase-config');
    await loadScript(assetUrl('assets/js/services/auth-password-authority.js'), function () {
      return auth.passwordAuthority && auth.passwordAuthority.version === 'AUTH-A05';
    }, 'password-authority');
    await loadScript(assetUrl('assets/js/pages/settings-password.js'), function () {
      return Boolean(root.DokeSettingsPassword && typeof root.DokeSettingsPassword.bind === 'function');
    }, 'settings-password');
    root.DokeSettingsPassword.bind();
    return auth.passwordAuthority;
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

  async function ensurePerformanceExperience() {
    await loadCoreScript('performance-experience.js', function () {
      return Boolean(
        Doke.performanceExperience
        && Doke.performanceExperience.version === PERFORMANCE_EXPERIENCE_VERSION
      );
    });
    return Doke.performanceExperience || null;
  }

  async function ensurePerformancePilot() {
    if (pageName() !== 'novidades') return null;
    await loadScript(pageScriptUrl('news-performance-pilot.js'), function () {
      return Boolean(
        Doke.newsPerformancePilot
        && Doke.newsPerformancePilot.version === NEWS_PERFORMANCE_PILOT_VERSION
      );
    }, 'news-performance-pilot');
    return Doke.newsPerformancePilot || null;
  }

  async function ensureOverlayExperience() {
    await loadCoreScript('overlay-experience.js', function () {
      return Boolean(Doke.overlayExperience && Doke.overlayExperience.version === OVERLAY_EXPERIENCE_VERSION);
    });
    return Doke.overlayExperience || null;
  }

  async function ensureAccessibilityExperience() {
    ensureStyle('assets/css/core/accessibility-experience.css', 'accessibility-experience-style');
    await loadCoreScript('accessibility-experience.js', function () {
      return Boolean(
        Doke.accessibilityExperience
        && Doke.accessibilityExperience.version === ACCESSIBILITY_EXPERIENCE_VERSION
      );
    });
    return Doke.accessibilityExperience || null;
  }

  async function ensureResponsiveExperience() {
    ensureStyle('assets/css/core/responsive-experience.css', 'responsive-experience-style');
    await loadCoreScript('responsive-experience.js', function () {
      return Boolean(
        Doke.responsiveExperience
        && Doke.responsiveExperience.version === RESPONSIVE_EXPERIENCE_VERSION
      );
    });
    return Doke.responsiveExperience || null;
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

    var performanceTask = ensurePerformanceExperience()
      .then(function () { return ensurePerformancePilot(); })
      .catch(function (error) {
        console.warn && console.warn('[Doke] Performance experience indisponível; loading legado permanecerá ativo.', error);
        return null;
      });

    if (!Doke.rolloutGuard || Doke.rolloutGuard.shouldRun('authSessionBootstrap')) {
      if (Doke.session) Doke.session.bootstrap();
    } else {
      Doke.rolloutGuard.mark('authSessionBootstrap', 'skipped', 'feature-flag-disabled');
    }

    try {
      await ensureAuthSessionAuthority();
      await ensureSettingsPasswordAuthority();
      await ensureAuthRouteGuard();
    } catch (error) {
      failClosedAuthGuard(error);
    }

    try {
      await ensureOverlayExperience();
    } catch (error) {
      console.warn && console.warn('[Doke] Overlay/focus experience indisponível; componentes manterão fallback local.', error);
    }

    try {
      await ensureAccessibilityExperience();
    } catch (error) {
      console.warn && console.warn('[Doke] Accessibility experience indisponível; semântica nativa será preservada.', error);
    }

    try {
      await ensureResponsiveExperience();
    } catch (error) {
      console.warn && console.warn('[Doke] Responsive experience indisponível; CSS e guards legados permanecerão ativos.', error);
    }

    await performanceTask;
    applyPermissionHooks();
    if (Doke.state) Doke.state.set('bootstrapped', true);
    document.documentElement.classList.add('doke-app-ready');
    document.dispatchEvent(new CustomEvent('doke:page-bootstrap-ready', {
      detail: {
        authGuardReady: Boolean(auth.guard),
        sessionAuthorityReady: Boolean(auth.sessionAuthority),
        passwordAuthorityReady: Boolean(auth.passwordAuthority),
        performanceExperienceReady: Boolean(Doke.performanceExperience),
        performancePilotReady: Boolean(Doke.newsPerformancePilot),
        overlayExperienceReady: Boolean(Doke.overlayExperience),
        accessibilityExperienceReady: Boolean(Doke.accessibilityExperience),
        responsiveExperienceReady: Boolean(Doke.responsiveExperience)
      }
    }));
  }

  Doke.pageBootstrap = Object.freeze({
    bootstrap: bootstrap,
    ensureAuthRouteGuard: ensureAuthRouteGuard,
    ensureAuthSessionAuthority: ensureAuthSessionAuthority,
    ensureSettingsPasswordAuthority: ensureSettingsPasswordAuthority,
    ensurePerformanceExperience: ensurePerformanceExperience,
    ensurePerformancePilot: ensurePerformancePilot,
    ensureOverlayExperience: ensureOverlayExperience,
    ensureAccessibilityExperience: ensureAccessibilityExperience,
    ensureResponsiveExperience: ensureResponsiveExperience
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
