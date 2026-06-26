(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var ROUTER_VERSION = '20260626-stable-shell-router-hydration-surfaces-v2';

  var SAFE_ROUTES = new Set([
    '/ajuda.html',
    '/anunciar-servico.html',
    '/avaliacao-profissional.html',
    '/carteira.html',
    '/comunidade-interna.html',
    '/comunidade.html',
    '/configuracoes.html',
    '/detalhe-anuncio.html',
    '/index.html',
    '/mensagens.html',
    '/notificacoes.html',
    '/novidades.html',
    '/orcamento.html',
    '/pagamento-profissional.html',
    '/pedidos.html',
    '/perfil.html',
    '/resultados.html',
    '/tornar-profissional.html',
    '/'
  ]);

  var NATIVE_ONLY_ROUTES = new Set([]);

  var ROUTE_INIT = {
    '/index.html': ['DokeInitHome'],
    '/resultados.html': ['DokeInitSearchResults'],
    '/detalhe-anuncio.html': ['DokeInitDetailAd'],
    '/ajuda.html': ['DokeInitHelpCenter'],
    '/pedidos.html': ['DokeInitOrders'],
    '/mensagens.html': ['DokeInitMessages'],
    '/notificacoes.html': ['DokeInitNotifications'],
    '/carteira.html': ['DokeInitWallet'],
    '/comunidade.html': [],
    '/comunidade-interna.html': [],
    '/perfil.html': ['DokeInitProfile'],
    '/configuracoes.html': [],
    '/orcamento.html': ['DokeInitBudget'],
    '/tornar-profissional.html': ['DokeInitBecomePro']
  };

  var PRESERVED_BODY_CLASSES = [
    'sidebar-collapsed',
    'theme-dark'
  ];

  var PRESERVED_HTML_CLASSES = [
    'doke-app-ready',
    'doke-shell-state-ready',
    'doke-sidebar-collapsed',
    'doke-sidebar-expanded'
  ];

  var PRESERVED_HTML_CLASS_PREFIXES = [
    'doke-js-',
    'doke-mobile-shell-'
  ];

  var ROUTE_TRANSIENT_BODY_CLASSES = [
    'before-after-preview-open',
    'budget-modal-open',
    'community-modal-open',
    'detail-budget-open',
    'doke-help-drawer-open',
    'doke-mobile-drawer-open',
    'doke-mobile-overlay-open',
    'has-modal-open',
    'home-address-modal-open',
    'home-filter-sheet-open',
    'home-inline-filters-open',
    'home-search-overlay-active',
    'is-media-lightbox-open',
    'is-messages-header-search-open',
    'is-search-open',
    'is-wallet-modal-open',
    'messages-thread-is-open',
    'mobile-home-drawer-open',
    'mobile-search-active',
    'news-detail-open',
    'order-feedback-active',
    'orders-chat-open',
    'orders-detail-open',
    'orders-overlay-open',
    'payment-finish-modal-open',
    'payment-modal-open',
    'pro-review-modal-open',
    'results-filters-open',
    'results-filters-open-from-home',
    'search-open',
    'sidebar-open',
    'ui-modal-open',
    'worker-modal-open',
    'worker-preview-open'
  ];

  var ROUTE_SCROLL_LOCK_STYLE_PROPS = [
    'overflow',
    'overflow-x',
    'overflow-y',
    'height',
    'min-height',
    'max-height',
    'position',
    'top',
    'left',
    'right',
    'width'
  ];

  var CORE_SCRIPT_RE = /assets\/js\/core\/(?:runtime-config|feature-flags|rollout-guard|app|stable-shell-router|social-page-router)\.js(?:\?.*)?$/i;
  var routeCache = new Map();
  var loadedScripts = new Set(Array.prototype.map.call(document.querySelectorAll('script[src]'), function (script) {
    return canonicalAssetUrl(script.getAttribute('src'));
  }).filter(Boolean));
  var navigating = false;
  var navigationId = 0;

  function isEnabled() {
    try {
      if (Doke.flags && typeof Doke.flags.isEnabled === 'function') {
        return Doke.flags.isEnabled('stableShellNavigation') === true;
      }
      return Doke.runtimeConfig?.flags?.stableShellNavigation === true;
    } catch (error) {
      return false;
    }
  }

  function currentPath(value) {
    var url = new URL(value || window.location.href, window.location.href);
    var pathname = url.pathname || '/';
    if (pathname === '/') return '/index.html';
    var filename = pathname.split('/').filter(Boolean).pop() || 'index.html';
    return '/' + filename;
  }

  function projectRouteUrl(route) {
    var filename = currentPath(route).slice(1) || 'index.html';
    return new URL(filename, window.location.href).href;
  }

  function canonicalAssetUrl(src) {
    if (!src) return '';
    try {
      var url = new URL(src, window.location.href);
      url.hash = '';
      if (url.origin === window.location.origin && /^\/assets\//i.test(url.pathname)) {
        url.search = '';
      }
      return url.href;
    } catch (error) {
      return '';
    }
  }

  function isRouteManagedStylesheet(link) {
    if (!link || !link.href) return false;
    try {
      var url = new URL(link.href, window.location.href);
      if (url.origin === window.location.origin && /\/assets\/css\//i.test(url.pathname)) return true;
      if (link.hasAttribute('data-doke-stable-route-style')) return true;
      return url.hostname === 'fonts.googleapis.com';
    } catch (error) {
      return false;
    }
  }

  function collectStylesheetKeys(doc) {
    var keys = new Set();
    Array.prototype.forEach.call(doc.querySelectorAll('link[rel="stylesheet"][href]'), function (link) {
      var key = canonicalAssetUrl(link.getAttribute('href') || link.href);
      if (key) keys.add(key);
    });
    return keys;
  }

  function ensurePreloadHint(href, as) {
    var key = canonicalAssetUrl(href);
    if (!href || !key) return;
    var exists = Array.prototype.some.call(document.querySelectorAll('link[data-doke-route-preload][href]'), function (link) {
      return canonicalAssetUrl(link.getAttribute('href')) === key;
    });
    if (exists) return;

    var preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = as;
    preload.href = href;
    preload.setAttribute('data-doke-route-preload', 'true');
    preload.setAttribute('data-doke-route-preload-key', key);
    document.head.appendChild(preload);
  }

  function preloadRouteAssets(nextDoc) {
    if (!nextDoc) return;

    var existingStyles = new Set(Array.prototype.map.call(document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]'), function (link) {
      return canonicalAssetUrl(link.getAttribute('href'));
    }).filter(Boolean));

    Array.prototype.forEach.call(nextDoc.querySelectorAll('link[rel="stylesheet"][href]'), function (link) {
      var href = link.getAttribute('href');
      var key = canonicalAssetUrl(href);
      if (!href || !key || existingStyles.has(key)) return;
      ensurePreloadHint(href, 'style');
      existingStyles.add(key);
    });

    var existingScripts = new Set(loadedScripts);
    Array.prototype.forEach.call(document.querySelectorAll('link[rel="preload"][as="script"][data-doke-route-preload]'), function (link) {
      var key = canonicalAssetUrl(link.getAttribute('href'));
      if (key) existingScripts.add(key);
    });

    Array.prototype.forEach.call(nextDoc.querySelectorAll('script[src]'), function (script) {
      var src = script.getAttribute('src');
      var key = canonicalAssetUrl(src);
      if (!src || !key || existingScripts.has(key) || CORE_SCRIPT_RE.test(src)) return;
      ensurePreloadHint(src, 'script');
      existingScripts.add(key);
    });
  }

  function removeObsoleteRouteStyles(nextDoc) {
    if (!nextDoc) return;
    var nextStyles = collectStylesheetKeys(nextDoc);

    Array.prototype.forEach.call(document.querySelectorAll('link[rel="stylesheet"][href]'), function (link) {
      var key = canonicalAssetUrl(link.getAttribute('href') || link.href);
      if (!key || nextStyles.has(key)) return;
      if (!isRouteManagedStylesheet(link)) return;
      link.remove();
    });

    document.querySelectorAll('link[rel="preload"][as="style"][data-doke-style-hint]').forEach(function (link) {
      try {
        var href = link.getAttribute('href');
        if (!href || nextStyles.has(canonicalAssetUrl(href))) return;
        link.remove();
      } catch (error) {}
    });
  }

  function isSafeUrl(href) {
    try {
      var url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return false;
      if (url.hash && url.pathname === window.location.pathname && url.search === window.location.search) return false;
      var path = currentPath(url.href);
      return SAFE_ROUTES.has(path) && !NATIVE_ONLY_ROUTES.has(path);
    } catch (error) {
      return false;
    }
  }

  function shouldIgnoreClick(event, link) {
    if (!isEnabled()) return true;
    if (!link || !link.href) return true;
    if (event.defaultPrevented) return true;
    if (event.button !== 0) return true;
    if (link.target && link.target !== '_self') return true;
    if (link.hasAttribute('download')) return true;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return true;
    return !isSafeUrl(link.href);
  }

  function setBusy(value) {
    document.documentElement.classList.toggle('is-stable-shell-routing', value);
    if (document.body) document.body.classList.toggle('is-stable-shell-routing', value);
    var shell = document.querySelector('.app-shell');
    if (shell) shell.setAttribute('aria-busy', value ? 'true' : 'false');
  }

  function injectStyleGuard() {
    if (document.getElementById('doke-stable-shell-router-style')) return;
    var style = document.createElement('style');
    style.id = 'doke-stable-shell-router-style';
    style.textContent = '\n      html.is-stable-shell-routing, body.is-stable-shell-routing { cursor: progress; }\n      body.is-stable-shell-routing .app-shell { pointer-events: none; }\n      body.is-stable-shell-routing :is(.app-shell, .app-shell *) { animation-duration: 0ms !important; transition-duration: 0ms !important; }\n    ';
    document.head.appendChild(style);
  }

  function fetchDocument(href) {
    var url = new URL(href, window.location.href);
    var key = url.pathname + url.search;
    if (!routeCache.has(key)) {
      routeCache.set(key, fetch(key, {
        headers: { 'X-Requested-With': 'doke-stable-shell-router' },
        credentials: 'same-origin'
      })
        .then(function (response) {
          if (!response.ok) throw new Error('HTTP ' + response.status + ' em ' + key);
          return response.text();
        })
        .then(function (html) {
          return new DOMParser().parseFromString(html, 'text/html');
        })
        .catch(function (error) {
          routeCache.delete(key);
          throw error;
        }));
    }
    return routeCache.get(key);
  }

  function activatePendingRouteStyles() {
    Array.prototype.forEach.call(document.querySelectorAll('link[data-doke-route-style-pending="true"]'), function (link) {
      link.media = link.getAttribute('data-doke-route-style-media') || 'all';
      link.removeAttribute('data-doke-route-style-media');
      link.removeAttribute('data-doke-route-style-pending');
    });
  }

  function ensureStyles(nextDoc, options) {
    var deferApply = !!(options && options.deferApply);
    var existing = new Set(Array.prototype.map.call(document.querySelectorAll('link[rel="stylesheet"]'), function (link) {
      return canonicalAssetUrl(link.getAttribute('href'));
    }).filter(Boolean));
    var pending = [];

    Array.prototype.forEach.call(nextDoc.querySelectorAll('link[rel="stylesheet"]'), function (nextLink) {
      var href = nextLink.getAttribute('href');
      var key = canonicalAssetUrl(href);
      if (!href || !key || existing.has(key)) return;

      var clone = document.createElement('link');
      clone.rel = 'stylesheet';
      clone.href = href;
      clone.media = deferApply ? 'not all' : (nextLink.getAttribute('media') || 'all');
      clone.setAttribute('data-doke-stable-route-style', 'true');
      if (deferApply) {
        clone.setAttribute('data-doke-route-style-media', nextLink.getAttribute('media') || 'all');
        clone.setAttribute('data-doke-route-style-pending', 'true');
      }

      pending.push(new Promise(function (resolve) {
        var done = function () {
          window.clearTimeout(timer);
          resolve();
        };
        var timer = window.setTimeout(done, 1800);
        clone.addEventListener('load', done, { once: true });
        clone.addEventListener('error', done, { once: true });
      }));

      document.head.appendChild(clone);
      existing.add(key);
    });

    return Promise.all(pending);
  }

  function ensureScripts(nextDoc) {
    var scripts = Array.prototype.slice.call(nextDoc.querySelectorAll('script[src]'))
      .map(function (script) { return script.getAttribute('src'); })
      .filter(Boolean)
      .filter(function (src) { return !CORE_SCRIPT_RE.test(src); });
    var pending = [];

    scripts.forEach(function (src) {
      var key = canonicalAssetUrl(src);
      if (!key || loadedScripts.has(key)) return;

      pending.push(new Promise(function (resolve) {
        var script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.defer = false;
        script.setAttribute('data-doke-stable-route-script', 'true');
        script.setAttribute('data-doke-route-script-src', src);
        script.addEventListener('load', resolve, { once: true });
        script.addEventListener('error', resolve, { once: true });
        document.body.appendChild(script);
        loadedScripts.add(key);
      }));
    });

    return Promise.all(pending);
  }

  function syncHtmlContract(nextHtml) {
    if (!nextHtml) return;
    var current = document.documentElement;
    var preserved = Array.prototype.filter.call(current.classList, function (className) {
      return PRESERVED_HTML_CLASSES.indexOf(className) !== -1 ||
        PRESERVED_HTML_CLASS_PREFIXES.some(function (prefix) { return className.indexOf(prefix) === 0; });
    });

    current.className = nextHtml.className || '';
    preserved.forEach(function (className) { current.classList.add(className); });
  }

  function clearInlineScrollLocks(node) {
    if (!node || !node.style) return;
    ROUTE_SCROLL_LOCK_STYLE_PROPS.forEach(function (prop) {
      try { node.style.removeProperty(prop); } catch (error) {}
    });
  }

  function clearRouteScrollSurfaces() {
    ['.app-shell', '.page', '.page__content', '.page__content-inner', '.shell-home__workspace', '.doke-page-shell', '.messages-shell-content', '.messages-app'].forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (node) {
        clearInlineScrollLocks(node);
      });
    });
  }

  function clearTransientRouteState() {
    if (!document.body) return;

    ROUTE_TRANSIENT_BODY_CLASSES.forEach(function (className) {
      document.body.classList.remove(className);
      document.documentElement.classList.remove(className);
    });

    clearInlineScrollLocks(document.documentElement);
    clearInlineScrollLocks(document.body);
    clearRouteScrollSurfaces();

    document.documentElement.style.removeProperty('--messages-shell-sidebar-width');
    document.documentElement.style.removeProperty('--messages-app-inline-size');

    document.querySelectorAll('[data-results-filters-backdrop], [data-sidebar-scrim], .mobile-scrim').forEach(function (node) {
      try {
        node.setAttribute('aria-hidden', 'true');
        node.hidden = true;
      } catch (error) {}
    });

    document.querySelectorAll('[aria-modal="true"], dialog[open], .ui-modal.is-open, .modal.is-open').forEach(function (node) {
      try {
        if (node.tagName === 'DIALOG' && typeof node.close === 'function') node.close();
        node.classList.remove('is-open', 'open', 'active');
        node.setAttribute('aria-hidden', 'true');
      } catch (error) {}
    });
  }

  function isMobileShellViewport() {
    try {
      return window.matchMedia('(max-width: 560px), ((hover: none) and (pointer: coarse) and (max-device-width: 560px))').matches;
    } catch (error) {
      var width = window.innerWidth || document.documentElement.clientWidth || 0;
      var touchPhone = false;
      try {
        touchPhone = navigator.maxTouchPoints > 0 && window.screen && Math.min(window.screen.width || 0, window.screen.height || 0) <= 560;
      } catch (innerError) {}
      return width <= 560 || touchPhone;
    }
  }

  function provisionalMobileShellConfig(nextBody) {
    var page = nextBody && nextBody.getAttribute('data-page') || '';
    var searchPages = ['home', 'resultados'];
    var bottomNavDisabledPages = ['notificacoes'];
    return {
      search: searchPages.indexOf(page) !== -1,
      bottomNav: bottomNavDisabledPages.indexOf(page) === -1
    };
  }

  function runRouteLeavingCleanup(fromPath, toPath) {
    try {
      document.dispatchEvent(new CustomEvent('doke:route-leaving', { detail: { from: fromPath, to: toPath, router: ROUTER_VERSION } }));
    } catch (error) {}

    if (fromPath === '/mensagens.html' && typeof window.DokeCleanupMessages === 'function') {
      try { window.DokeCleanupMessages({ from: fromPath, to: toPath, router: ROUTER_VERSION }); } catch (error) { console.error('[DokeStableShell:cleanup:messages]', error); }
    }

    clearTransientRouteState();
  }

  function syncBodyContract(nextBody) {
    if (!nextBody) return;
    var keepMobileShell = document.body.classList.contains('doke-mobile-shell-mounted') && isMobileShellViewport();
    var mobileShellConfig = keepMobileShell ? provisionalMobileShellConfig(nextBody) : null;
    var preserved = PRESERVED_BODY_CLASSES.filter(function (className) {
      return document.body.classList.contains(className);
    });

    Array.prototype.slice.call(document.body.attributes).forEach(function (attr) {
      if (attr.name === 'style') return;
      document.body.removeAttribute(attr.name);
    });

    Array.prototype.slice.call(nextBody.attributes).forEach(function (attr) {
      if (attr.name === 'style') return;
      document.body.setAttribute(attr.name, attr.value);
    });

    preserved.forEach(function (className) { document.body.classList.add(className); });
    if (keepMobileShell) {
      document.body.classList.add('doke-mobile-shell-mounted');
      document.body.setAttribute('data-shell-search', mobileShellConfig.search ? 'true' : 'false');
      document.body.setAttribute('data-shell-bottom-nav', mobileShellConfig.bottomNav ? 'true' : 'false');
      document.documentElement.classList.add('doke-mobile-shell-pending');
      document.documentElement.classList.remove('doke-mobile-shell-ready');
    }
    clearTransientRouteState();
    document.body.classList.remove('is-stable-shell-routing');
  }


  function applyRouteRuntimeClasses(path) {
    var normalized = path || currentPath();
    var isHome = normalized === '/index.html' || normalized === '/';
    document.documentElement.classList.toggle('home-index-root', isHome);
  }

  function isDocumentPreloaderNode(node) {
    if (!node || node.nodeType !== 1 || typeof node.matches !== 'function') return false;
    return node.matches('[data-orders-document-preloader], [data-messages-document-preloader], [data-notifications-document-preloader], .orders-document-preloader, .doke-document-preloader');
  }

  function isRouteStandaloneNode(node) {
    if (!node || node.nodeType !== 1) return false;
    if (node.matches('.app-shell, script')) return false;
    if (isDocumentPreloaderNode(node)) return false;
    if (node.matches('[data-mobile-drawer-authority="canonical"], .doke-global-mobile-drawer')) return false;
    return true;
  }

  function prepareInternalHydrationSurface(scope) {
    if (!scope || typeof scope.querySelectorAll !== 'function') return;
    scope.querySelectorAll('[data-orders-document-preloader], [data-messages-document-preloader], [data-notifications-document-preloader], .orders-document-preloader, .doke-document-preloader').forEach(function (node) {
      try {
        node.hidden = true;
        node.setAttribute('aria-hidden', 'true');
      } catch (error) {}
    });
    scope.querySelectorAll('[data-orders-hydration-skeleton], [data-messages-hydration-skeleton], [data-notifications-hydration-skeleton]').forEach(function (node) {
      try {
        node.hidden = true;
        node.setAttribute('aria-hidden', 'true');
      } catch (error) {}
    });
    scope.querySelectorAll('[data-orders-hydration-ready], [data-messages-hydration-ready], [data-notifications-hydration-ready]').forEach(function (node) {
      try {
        node.hidden = false;
        node.setAttribute('aria-hidden', 'false');
      } catch (error) {}
    });
    scope.querySelectorAll('[data-orders-empty], [data-messages-empty], [data-notifications-empty]').forEach(function (node) {
      try {
        node.hidden = true;
        node.setAttribute('aria-hidden', 'true');
      } catch (error) {}
    });
  }

  function syncStandaloneUi(nextDoc) {
    if (!nextDoc || !nextDoc.body || !document.body) return;

    Array.prototype.slice.call(document.body.children).forEach(function (node) {
      if (isRouteStandaloneNode(node)) node.remove();
    });

    var anchor = document.body.querySelector('script');
    Array.prototype.slice.call(nextDoc.body.children).forEach(function (node) {
      if (!isRouteStandaloneNode(node)) return;
      var clone = node.cloneNode(true);
      prepareInternalHydrationSurface(clone);
      if (anchor && anchor.parentNode === document.body) document.body.insertBefore(clone, anchor);
      else document.body.appendChild(clone);
    });
  }

  function replaceShell(nextDoc, path) {
    var currentShell = document.querySelector('.app-shell');
    var nextShell = nextDoc.querySelector('.app-shell');
    if (!currentShell || !nextShell) {
      throw new Error('Contrato .app-shell ausente na rota destino.');
    }

    var nextShellNode = nextShell.cloneNode(true);
    prepareInternalHydrationSurface(nextShellNode);
    var currentSidebar = currentShell.querySelector(':scope > .sidebar');
    var nextSidebar = nextShellNode.querySelector(':scope > .sidebar');
    if (currentSidebar && nextSidebar) {
      nextSidebar.replaceWith(currentSidebar);
    }

    syncHtmlContract(nextDoc.documentElement);
    syncBodyContract(nextDoc.body);
    document.documentElement.dataset.dokeNavigationMode = 'stable-shell';
    if (document.body) document.body.dataset.dokeNavigationMode = 'stable-shell';
    applyRouteRuntimeClasses(path);
    currentShell.replaceWith(nextShellNode);
    syncStandaloneUi(nextDoc);
    document.title = nextDoc.title || document.title;
  }

  function assertDocumentReadyForRoute() {
    if (!document.documentElement || !document.body) {
      throw new Error('Documento invalido apos troca de rota.');
    }
  }

  function resetScroll() {
    clearTransientRouteState();
    var previousHtmlBehavior = document.documentElement.style.scrollBehavior;
    var previousBodyBehavior = document.body.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';
    try { window.scrollTo(0, 0); } catch (error) {}
    ['html', 'body', '.app-shell', '.page', '.page__content', '.page__content-inner', '.shell-home__workspace', '.doke-page-shell'].forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (node) {
        try { node.scrollTop = 0; node.scrollLeft = 0; } catch (error) {}
      });
    });
    requestAnimationFrame(function () {
      clearTransientRouteState();
      try { window.scrollTo(0, 0); } catch (error) {}
      if (document.documentElement) document.documentElement.style.scrollBehavior = previousHtmlBehavior;
      if (document.body) document.body.style.scrollBehavior = previousBodyBehavior;
    });
  }

  function updateSidebar(path) {
    var normalized = path || currentPath();
    var active = {
      '.nav-link--home': normalized === '/index.html',
      '.nav-link--orders': normalized === '/pedidos.html',
      '.nav-link--messages': normalized === '/mensagens.html',
      '.nav-link--notifications': normalized === '/notificacoes.html',
      '.nav-link--communities': normalized === '/comunidade.html' || normalized === '/comunidade-interna.html',
      '.nav-link--profile': normalized === '/perfil.html',
      '.nav-link--wallet': normalized === '/carteira.html',
      '.nav-link--settings': normalized === '/configuracoes.html'
    };

    document.querySelectorAll('.sidebar .nav-link').forEach(function (link) {
      link.classList.remove('is-active');
      link.removeAttribute('aria-current');
    });

    Object.keys(active).forEach(function (selector) {
      var node = document.querySelector(selector);
      if (!node) return;
      node.classList.toggle('is-active', active[selector]);
      if (active[selector]) node.setAttribute('aria-current', 'page');
    });
  }

  function runInitializers(path) {
    var names = ROUTE_INIT[path] || [];
    names.forEach(function (name) {
      if (typeof window[name] !== 'function') return;
      try { window[name](); } catch (error) { console.error('[DokeStableShell:init:' + name + ']', error); }
    });
    try {
      if (window.Doke && window.Doke.controllers && typeof window.Doke.controllers.initCurrentPage === 'function') {
        var result = window.Doke.controllers.initCurrentPage({ phase: 'stable-shell-route', path: path });
        document.documentElement.setAttribute('data-doke-controller', result.initialized ? result.page : 'none');
      }
    } catch (error) {
      console.error('[DokeStableShell:init:controller]', error);
    }
    try {
      if (window.DokeUiSelect && typeof window.DokeUiSelect.enhanceAll === 'function') {
        window.DokeUiSelect.enhanceAll(document);
      }
      if (window.DokeUiSelect && typeof window.DokeUiSelect.refresh === 'function') {
        window.DokeUiSelect.refresh(document);
      }
    } catch (error) {
      console.error('[DokeStableShell:init:ui-select]', error);
    }
    try { window.DokeMobileAppShell && window.DokeMobileAppShell.refresh && window.DokeMobileAppShell.refresh(); } catch (error) {}
    try { window.lucide && window.lucide.createIcons && window.lucide.createIcons(); } catch (error) {}
    document.dispatchEvent(new CustomEvent('doke:stable-route-ready', { detail: { path: path, router: ROUTER_VERSION } }));
    document.dispatchEvent(new CustomEvent('doke:route-ready', { detail: { path: path, router: ROUTER_VERSION } }));
  }

  async function navigate(href, options) {
    options = options || {};
    var url = new URL(href, window.location.href);
    var path = currentPath(url.href);

    if (!isEnabled() || !isSafeUrl(url.href)) {
      if (options.replace) window.location.replace(url.href);
      else window.location.href = url.href;
      return;
    }

    if (navigating) return Promise.resolve(false);
    var id = ++navigationId;
    var committed = false;
    var fromPath = currentPath();
    navigating = true;
    try {
      window.sessionStorage.setItem('doke.internalRouteNavigation', String(Date.now()));
      document.documentElement.dataset.dokeNavigationMode = 'stable-shell';
      if (document.body) document.body.dataset.dokeNavigationMode = 'stable-shell';
      document.dispatchEvent(new CustomEvent('doke:stable-route-start', { detail: { from: fromPath, to: path, router: ROUTER_VERSION } }));
    } catch (error) {}
    runRouteLeavingCleanup(fromPath, path);
    setBusy(true);
    updateSidebar(path);

    try {
      var nextDoc = await fetchDocument(url.href);
      if (id !== navigationId) return;
      await ensureStyles(nextDoc, { deferApply: true });
      if (id !== navigationId) return;
      replaceShell(nextDoc, path);
      activatePendingRouteStyles();
      removeObsoleteRouteStyles(nextDoc);
      assertDocumentReadyForRoute();
      if (id !== navigationId) return;
      if (options.replace) window.history.replaceState({ dokeStableShell: true, href: url.href }, '', url.href);
      else window.history.pushState({ dokeStableShell: true, href: url.href }, '', url.href);
      committed = true;

      resetScroll();
      updateSidebar(path);
      try { window.lucide && window.lucide.createIcons && window.lucide.createIcons(); } catch (error) {}
      setBusy(false);

      await new Promise(function (resolve) {
        requestAnimationFrame(function () {
          requestAnimationFrame(resolve);
        });
      });

      await ensureScripts(nextDoc);
      if (id !== navigationId) return;

      runInitializers(path);
    } catch (error) {
      console.error('[DokeStableShell:navigate]', error);
      if (!committed) {
        if (options.replace) window.location.replace(url.href);
        else window.location.href = url.href;
      }
    } finally {
      requestAnimationFrame(function () {
        clearTransientRouteState();
        setBusy(false);
        navigating = false;
        try {
          document.documentElement.removeAttribute('data-doke-navigation-mode');
          if (document.body) document.body.removeAttribute('data-doke-navigation-mode');
        } catch (error) {}
      });
    }
  }

  function warm(href) {
    if (!isEnabled() || !isSafeUrl(href)) return;
    fetchDocument(href).then(preloadRouteAssets).catch(function () {});
  }

  function bind() {
    if (!isEnabled()) return;
    injectStyleGuard();

    document.addEventListener('click', function (event) {
      var target = event.target instanceof Element ? event.target : null;
      var link = target && target.closest('a[href]');
      if (shouldIgnoreClick(event, link)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      navigate(link.href);
    }, true);

    document.addEventListener('pointerover', function (event) {
      var target = event.target instanceof Element ? event.target : null;
      var link = target && target.closest('a[href]');
      if (link) warm(link.href);
    }, { passive: true, capture: true });

    document.addEventListener('focusin', function (event) {
      var target = event.target instanceof Element ? event.target : null;
      var link = target && target.closest('a[href]');
      if (link) warm(link.href);
    }, true);

    document.addEventListener('touchstart', function (event) {
      var target = event.target instanceof Element ? event.target : null;
      var link = target && target.closest('a[href]');
      if (link) warm(link.href);
    }, { passive: true, capture: true });

    window.addEventListener('popstate', function () {
      navigate(window.location.href, { replace: true });
    });

    window.DokeStableShellRouter = Object.freeze({ version: ROUTER_VERSION, navigate: navigate, warm: warm });
    window.DokeNavigate = function (href, options) {
      return navigate(href, options || {});
    };

    applyRouteRuntimeClasses(currentPath());
    updateSidebar(currentPath());

    if (currentPath() !== '/index.html') {
      var warmHome = function () { warm(projectRouteUrl('/index.html')); };
      if ('requestIdleCallback' in window) window.requestIdleCallback(warmHome, { timeout: 1200 });
      else window.setTimeout(warmHome, 600);
    }
  }

  Doke.stableShellRouter = Object.freeze({ version: ROUTER_VERSION, navigate: navigate, warm: warm, isEnabled: isEnabled });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
