(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var lifecycle = window.DokeNavigationLifecycle || Doke.navigationLifecycle || null;
  var ROUTER_VERSION = '20260721-profile-atomic-route-v1';
  var ROUTE_SETTLEMENT_TIMEOUT_MS = 9000;

  var SAFE_ROUTES = new Set([
    '/ajuda.html',
    '/anunciar-servico.html',
    '/avaliacao-profissional.html',
    '/carteira.html',
    '/admin.html',
    '/admin-verificacao.html',
    '/admin-anuncio-revisao.html',
    '/admin-pedidos-operacao.html',
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
    '/meu-perfil.html',
    '/perfil-cliente.html',
    '/perfil-profissional.html',
    '/resultados.html',
    '/tornar-profissional.html',
    '/verificacao-profissional.html',
    '/'
  ]);

  var NATIVE_ONLY_ROUTES = new Set([
    '/perfil.html'
  ]);
  var HYDRATION_BARRIER_ROUTES = new Set([
    '/index.html',
    '/meu-perfil.html',
    '/perfil-cliente.html',
    '/perfil-profissional.html',
    '/configuracoes.html',
    '/tornar-profissional.html',
    '/verificacao-profissional.html',
    '/pedidos.html',
    '/mensagens.html',
    '/pagamento-profissional.html',
    '/notificacoes.html',
    '/carteira.html',
    '/orcamento.html',
    '/avaliacao-profissional.html',
    '/resultados.html',
    '/detalhe-anuncio.html',
    '/meu-perfil.html',
    '/perfil-cliente.html',
    '/perfil-profissional.html',
    '/comunidade.html',
    '/admin.html',
    '/admin-verificacao.html',
    '/admin-anuncio-revisao.html',
    '/admin-pedidos-operacao.html',
    '/pagamento-profissional.html',
    '/anunciar-servico.html'
  ]);

  var PROFILE_ACTIVE_PATHS = new Set([
    '/perfil.html',
    '/meu-perfil.html',
    '/perfil-cliente.html',
    '/perfil-profissional.html',
    '/tornar-profissional.html',
    '/verificacao-profissional.html',
    '/anunciar-servico.html'
  ]);

  var ROUTE_INIT = {
    '/index.html': ['DokeInitHome'],
    '/resultados.html': ['DokeInitSearchFilterState', 'DokeInitSearchResults'],
    '/detalhe-anuncio.html': ['DokeInitDetailAd'],
    '/avaliacao-profissional.html': ['DokeInitReview'],
    '/ajuda.html': ['DokeInitHelpCenter'],
    '/novidades.html': ['DokeInitNewsPage'],
    '/pedidos.html': ['DokeInitOrders'],
    '/mensagens.html': ['DokeInitMessages'],
    '/notificacoes.html': ['DokeInitNotifications'],
    '/carteira.html': ['DokeInitWalletPage'],
    '/admin.html': ['DokeInitAdmin'],
    '/admin-verificacao.html': ['DokeInitAdminVerification'],
    '/admin-anuncio-revisao.html': ['DokeInitAdminAdReview'],
    '/admin-pedidos-operacao.html': ['DokeInitAdminOrderOperations'],
    '/comunidade.html': ['DokeInitCommunity'],
    '/comunidade-interna.html': [],
    '/perfil.html': ['DokeInitProfile'],
    '/meu-perfil.html': ['DokeInitOwnerProfile'],
    '/perfil-cliente.html': ['DokeInitClientProfile'],
    '/perfil-profissional.html': ['DokeInitProfessionalProfile'],
    '/configuracoes.html': ['DokeInitSettings'],
    '/orcamento.html': ['DokeInitBudget'],
    '/pagamento-profissional.html': ['DokeInitPayment'],
    '/tornar-profissional.html': ['DokeInitBecomePro'],
    '/verificacao-profissional.html': ['DokeInitProfessionalVerification'],
    '/anunciar-servico.html': ['DokeInitPostService']
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
    'is-route-instant-swap',
    'is-shell-swapping',
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

  var PERSISTENT_RUNTIME_STYLE_CAPABILITIES = new Set([
    'card-experience-style',
    'accessibility-experience-style',
    'responsive-experience-style'
  ]);

  var CORE_SCRIPT_RE = /assets\/js\/core\/(?:runtime-config|feature-flags|rollout-guard|navigation-lifecycle|app|stable-shell-router|social-page-router)\.js(?:\?.*)?$/i;
  var routeCache = new Map();
  var routeWarmCache = new Map();
  var loadedScripts = new Set(Array.prototype.map.call(document.querySelectorAll('script[src]'), function (script) {
    return canonicalAssetUrl(script.getAttribute('src'));
  }).filter(Boolean));
  var navigating = false;
  var navigationId = 0;
  var transitionLog = window.__dokeRouteTransitions || (window.__dokeRouteTransitions = []);
  var PRIORITY_WARM_ROUTES = [
    '/index.html',
    '/perfil.html',
    '/pedidos.html',
    '/mensagens.html',
    '/notificacoes.html',
    '/comunidade.html',
    '/resultados.html',
    '/ajuda.html'
  ];

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
    var runtimeCapability = link.getAttribute('data-doke-auth-capability') || '';
    if (PERSISTENT_RUNTIME_STYLE_CAPABILITIES.has(runtimeCapability)) return false;
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
      if (!isRouteManagedStylesheet(link)) return;
      if (key && nextStyles.has(key)) {
        if (link.getAttribute('data-doke-route-style-inactive') === 'true') {
          link.media = link.getAttribute('data-doke-route-style-media') || 'all';
          link.removeAttribute('data-doke-route-style-inactive');
        }
        return;
      }
      if (link.getAttribute('data-doke-route-style-inactive') !== 'true'
        && !link.hasAttribute('data-doke-route-style-media')) {
        link.setAttribute('data-doke-route-style-media', link.media || 'all');
      }
      link.media = 'not all';
      link.setAttribute('data-doke-route-style-inactive', 'true');
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
    style.textContent = '\n      html.is-stable-shell-routing, body.is-stable-shell-routing { cursor: inherit; }\n    ';
    document.head.appendChild(style);
  }

  function fetchDocument(href, options) {
    var url = new URL(href, window.location.href);
    var key = url.pathname + url.search;
    if (options && options.force) routeCache.delete(key);
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

  function activatePendingRouteStyles(nextDoc) {
    var nextStyles = collectStylesheetKeys(nextDoc);
    Array.prototype.forEach.call(document.querySelectorAll('link[data-doke-route-style-pending="true"]'), function (link) {
      if (!nextStyles.has(canonicalAssetUrl(link.getAttribute('href') || link.href))) return;
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

      pending.push(new Promise(function (resolve, reject) {
        var settled = false;
        var done = function () {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          resolve();
        };
        var fail = function () {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          clone.remove();
          reject(new Error('Falha ao carregar CSS essencial: ' + href));
        };
        var timer = window.setTimeout(function () {
          fail();
        }, 5000);
        clone.addEventListener('load', done, { once: true });
        clone.addEventListener('error', fail, { once: true });
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

      pending.push(new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.defer = false;
        script.setAttribute('data-doke-stable-route-script', 'true');
        script.setAttribute('data-doke-route-script-src', src);
        script.addEventListener('load', resolve, { once: true });
        script.addEventListener('error', function () {
          loadedScripts.delete(key);
          script.remove();
          reject(new Error('Falha ao carregar script essencial: ' + src));
        }, { once: true });
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

  function syncElementContract(current, next) {
    if (!current || !next) return;
    Array.prototype.slice.call(current.attributes).forEach(function (attr) {
      if (attr.name === 'style') return;
      current.removeAttribute(attr.name);
    });
    Array.prototype.slice.call(next.attributes).forEach(function (attr) {
      if (attr.name === 'style') return;
      current.setAttribute(attr.name, attr.value);
    });
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

  function syncStandaloneUi(nextDoc) {
    if (!nextDoc || !nextDoc.body || !document.body) return;

    Array.prototype.slice.call(document.body.children).forEach(function (node) {
      if (isRouteStandaloneNode(node)) node.remove();
    });

    var anchor = document.body.querySelector('script');
    Array.prototype.slice.call(nextDoc.body.children).forEach(function (node) {
      if (!isRouteStandaloneNode(node)) return;
      var clone = node.cloneNode(true);
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
    var currentSidebar = currentShell.querySelector(':scope > .sidebar');
    var currentPage = currentShell.querySelector(':scope > .page');
    var nextPage = nextShellNode.querySelector(':scope > .page');
    var currentHeader = currentPage && currentPage.querySelector(':scope > [data-app-header], :scope > .app-header');
    var nextHeader = nextPage && nextPage.querySelector(':scope > [data-app-header], :scope > .app-header');
    var currentContent = currentPage && currentPage.querySelector(':scope > .page__content');
    var nextContent = nextPage && nextPage.querySelector(':scope > .page__content');

    syncHtmlContract(nextDoc.documentElement);
    syncBodyContract(nextDoc.body);
    document.documentElement.dataset.dokeNavigationMode = 'stable-shell';
    if (document.body) document.body.dataset.dokeNavigationMode = 'stable-shell';
    applyRouteRuntimeClasses(path);
    if (currentPage && nextPage && currentHeader && nextHeader && currentContent && nextContent) {
      syncElementContract(currentShell, nextShellNode);
      syncElementContract(currentPage, nextPage);
      syncElementContract(currentHeader, nextHeader);
      currentHeader.replaceChildren.apply(currentHeader, Array.prototype.map.call(nextHeader.childNodes, function (node) {
        return node.cloneNode(true);
      }));
      currentContent.replaceWith(nextContent.cloneNode(true));
      Array.prototype.slice.call(currentShell.children).forEach(function (node) {
        if (node === currentSidebar || node === currentPage) return;
        node.remove();
      });
    } else {
      if (currentSidebar) {
        var nextSidebar = nextShellNode.querySelector(':scope > .sidebar');
        if (nextSidebar) nextSidebar.replaceWith(currentSidebar);
      }
      currentShell.replaceWith(nextShellNode);
    }
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
    return new Promise(function (resolve) {
      var settled = false;
      var fallbackTimer = 0;
      function finishReset() {
        if (settled) return;
        settled = true;
        if (fallbackTimer) window.clearTimeout(fallbackTimer);
        clearTransientRouteState();
        try { window.scrollTo(0, 0); } catch (error) {}
        if (document.documentElement) document.documentElement.style.scrollBehavior = previousHtmlBehavior;
        if (document.body) document.body.style.scrollBehavior = previousBodyBehavior;
        resolve();
      }
      fallbackTimer = window.setTimeout(finishReset, 120);
      try {
        requestAnimationFrame(finishReset);
      } catch (error) {
        finishReset();
      }
    });
  }

  function restoreScrollWithFallback(href) {
    if (!lifecycle || !lifecycle.scroll || typeof lifecycle.scroll.restore !== 'function') {
      return resetScroll();
    }
    return new Promise(function (resolve) {
      var settled = false;
      var fallbackTimer = 0;
      function finishRestore(result) {
        if (settled) return;
        settled = true;
        if (fallbackTimer) window.clearTimeout(fallbackTimer);
        resolve(result);
      }
      fallbackTimer = window.setTimeout(function () { finishRestore(false); }, 120);
      try {
        Promise.resolve(lifecycle.scroll.restore(href)).then(
          function (result) { finishRestore(result); },
          function () { finishRestore(false); }
        );
      } catch (error) {
        finishRestore(false);
      }
    });
  }

  function syncDokeAccountNavigation(path) {
    try {
      if (window.Doke && typeof window.Doke.syncAccountNavigationState === 'function') {
        window.Doke.syncAccountNavigationState(path || currentPath());
      }
    } catch (error) {
      console.warn('[DokeStableShell:account-navigation]', error);
    }
  }

  function updateSidebar(path) {
    var normalized = path || currentPath();
    var active = {
      '.nav-link--home': normalized === '/index.html',
      '.nav-link--orders': normalized === '/pedidos.html',
      '.nav-link--messages': normalized === '/mensagens.html',
      '.nav-link--notifications': normalized === '/notificacoes.html',
      '.nav-link--communities': normalized === '/comunidade.html' || normalized === '/comunidade-interna.html',
      '.nav-link--profile': PROFILE_ACTIVE_PATHS.has(normalized),
      '.nav-link--wallet': normalized === '/carteira.html',
      '.nav-link--admin': normalized === '/admin.html' || normalized === '/admin-verificacao.html' || normalized === '/admin-anuncio-revisao.html' || normalized === '/admin-pedidos-operacao.html',
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
    syncDokeAccountNavigation(normalized);
  }

  function runInitializers(path) {
    var names = ROUTE_INIT[path] || [];
    names.forEach(function (name) {
      if (typeof window[name] !== 'function') return;
      try {
        var outcome = window[name]();
        if (outcome && typeof outcome.then === 'function') {
          outcome.catch(function (error) {
            console.error('[DokeStableShell:init:' + name + ']', error);
          });
        }
      } catch (error) {
        console.error('[DokeStableShell:init:' + name + ']', error);
      }
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

  function recordTransition(id, state, detail) {
    var entry = Object.assign({
      id: id,
      state: state,
      at: Math.round(performance.now())
    }, detail || {});
    transitionLog.push(entry);
    if (transitionLog.length > 120) transitionLog.splice(0, transitionLog.length - 120);
    document.dispatchEvent(new CustomEvent('doke:route-transition-state', { detail: entry }));
    return entry;
  }

  function routeHasSkeleton(nextDoc, path) {
    if (window.DokePageHydration && typeof window.DokePageHydration.routeHasSkeleton === 'function') {
      return window.DokePageHydration.routeHasSkeleton(nextDoc, path);
    }
    return HYDRATION_BARRIER_ROUTES.has(path) && Boolean(nextDoc.querySelector(
      '[data-orders-hydration-skeleton], [data-messages-hydration-skeleton], [data-payment-hydration-skeleton], [data-notifications-hydration-skeleton], [data-wallet-hydration-skeleton], [data-budget-hydration-skeleton], [data-review-hydration-skeleton]'
    ));
  }

  function prepareRouteDocument(nextDoc, path, mode) {
    if (window.DokePageHydration && typeof window.DokePageHydration.prepareRouteDocument === 'function') {
      window.DokePageHydration.prepareRouteDocument(nextDoc, path, mode);
    }
  }

  function setRouteVisualMode(mode) {
    if (window.DokePageHydration && typeof window.DokePageHydration.setRouteVisualMode === 'function') {
      return window.DokePageHydration.setRouteVisualMode(mode);
    }
    document.documentElement.dataset.dokeRouteVisualMode = mode;
    if (document.body) document.body.dataset.dokeRouteVisualMode = mode;
    return mode;
  }

  function waitForVisualThreshold(startedAt) {
    if (lifecycle && lifecycle.timing && typeof lifecycle.timing.wait === 'function') {
      return lifecycle.timing.wait('route').then(function () { return 'threshold'; });
    }
    var remaining = Math.max(0, 150 - (performance.now() - startedAt));
    return new Promise(function (resolve) {
      window.setTimeout(function () { resolve('threshold'); }, remaining);
    });
  }

  function prepareEssentialData(path, url) {
    if (path !== '/detalhe-anuncio.html') return Promise.resolve(null);
    var orchestrator = Doke.pageDataOrchestrator;
    if (!orchestrator || typeof orchestrator.getPageData !== 'function') return Promise.resolve(null);
    var serviceId = url.searchParams.get('id') || url.searchParams.get('serviceId') || url.searchParams.get('servico') || '';
    if (!serviceId) return Promise.resolve(null);
    return orchestrator.getPageData('detalhe-anuncio', { serviceId: serviceId }, { strategy: 'stale-while-revalidate' });
  }

  function bootRouteDataController(path) {
    var controllers = {
      '/index.html': Doke.indexDataController,
      '/resultados.html': Doke.resultadosDataController,
      '/detalhe-anuncio.html': Doke.detailAdDataController,
      '/comunidade.html': Doke.communitiesDataController
    };
    var controller = controllers[path];
    if (!controller) return Promise.resolve(null);
    var method = typeof controller.boot === 'function' ? controller.boot : controller.init;
    if (typeof method !== 'function') return Promise.resolve(null);
    try {
      return Promise.resolve(method.call(controller));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function waitForRouteSettlement(path) {
    if (!HYDRATION_BARRIER_ROUTES.has(path)) return Promise.resolve('ready');
    var currentState = document.body && document.body.dataset.pageHydration;
    if (currentState === 'ready' || currentState === 'empty' || currentState === 'error') {
      return Promise.resolve(currentState);
    }
    return new Promise(function (resolve) {
      var timer = window.setTimeout(function () {
        cleanup();
        resolve('timeout');
      }, ROUTE_SETTLEMENT_TIMEOUT_MS);
      var onState = function (event) {
        var state = event.detail && event.detail.state;
        if (state !== 'ready' && state !== 'empty' && state !== 'error') return;
        cleanup();
        resolve(state);
      };
      var cleanup = function () {
        window.clearTimeout(timer);
        document.removeEventListener('doke:page-hydration-state', onState);
      };
      document.addEventListener('doke:page-hydration-state', onState);
    });
  }

  var INTERNAL_DIRECT_HYDRATION_ROUTES = new Set([
    '/index.html',
    '/mensagens.html',
    '/notificacoes.html',
    '/pedidos.html',
    '/carteira.html',
    '/detalhe-anuncio.html',
    '/comunidade.html',
    '/admin.html',
    '/admin-anuncio-revisao.html',
    '/admin-pedidos-operacao.html',
    '/pagamento-profissional.html',
    '/anunciar-servico.html'
  ]);

  function shouldCommitHydrationRouteDirect(path) {
    return INTERNAL_DIRECT_HYDRATION_ROUTES.has(path);
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
    var startedAt = performance.now();
    var visualMode = 'direct';
    var assetsPromise = null;
    var nextDoc = null;
    var stylesPrepared = false;
    var lifecycleRouteId = Number(options.lifecycleRouteId || 0);
    navigating = true;
    if (lifecycle && lifecycle.scroll && options.captureScroll !== false && !options.lifecycleAdapter) {
      lifecycle.scroll.capture(window.location.href);
    }
    try {
      if (lifecycle && lifecycle.entry && typeof lifecycle.entry.markInternal === 'function') {
        lifecycle.entry.markInternal({
          source: options.source || 'stable-shell',
          from: fromPath,
          to: path,
          replace: options.replace === true,
          restore: options.restoreScroll === true
        });
      } else {
        window.sessionStorage.setItem('doke.internalRouteNavigation', String(Date.now()));
      }
      document.documentElement.dataset.dokeNavigationMode = 'stable-shell';
      if (document.body) document.body.dataset.dokeNavigationMode = 'stable-shell';
      document.dispatchEvent(new CustomEvent('doke:stable-route-start', { detail: { from: fromPath, to: path, router: ROUTER_VERSION } }));
    } catch (error) {}
    if (!lifecycleRouteId && lifecycle && lifecycle.route && typeof lifecycle.route.begin === 'function') {
      lifecycleRouteId = lifecycle.route.begin({
        from: fromPath,
        to: path,
        source: options.source || 'stable-shell',
        replace: options.replace === true,
        restore: options.restoreScroll === true,
        adapter: options.lifecycleAdapter || 'stable-shell'
      });
    }
    recordTransition(id, 'route-start', { from: fromPath, to: path });
    runRouteLeavingCleanup(fromPath, path);
    try {
      nextDoc = await fetchDocument(url.href, { force: options.force === true });
      if (id !== navigationId) return;
      recordTransition(id, 'html-ready', { to: path });
      var routeKey = url.pathname + url.search;
      var warmPromise = options.force === true ? null : routeWarmCache.get(routeKey);
      if (warmPromise) await warmPromise;
      else await ensureStyles(nextDoc, { deferApply: true });
      stylesPrepared = true;
      if (id !== navigationId) return;
      recordTransition(id, 'styles-ready', { to: path });
      var hasSkeleton = routeHasSkeleton(nextDoc, path);
      assetsPromise = ensureScripts(nextDoc)
        .then(function () { return prepareEssentialData(path, url); })
        .then(function () { return 'assets-ready'; });

      // Data-driven routes must never commit with both the skeleton and the
      // real surface hidden. Always mount their structural skeleton first;
      // the page hydration authority is responsible for replacing it.
      if (hasSkeleton && !shouldCommitHydrationRouteDirect(path)) {
        visualMode = 'skeleton';
      } else {
        await assetsPromise;
        visualMode = 'direct';
      }
      if (id !== navigationId) return;
      prepareRouteDocument(nextDoc, path, visualMode);
      setRouteVisualMode(visualMode);
      replaceShell(nextDoc, path);
      setBusy(true);
      setRouteVisualMode(visualMode);
      activatePendingRouteStyles(nextDoc);
      removeObsoleteRouteStyles(nextDoc);
      assertDocumentReadyForRoute();
      if (id !== navigationId) return;
      if (!options.skipHistory) {
        if (options.replace) window.history.replaceState({ dokeStableShell: true, href: url.href }, '', url.href);
        else window.history.pushState({ dokeStableShell: true, href: url.href }, '', url.href);
      }
      committed = true;
      if (lifecycleRouteId && lifecycle && lifecycle.route) {
        lifecycle.route.commit(lifecycleRouteId, {
          adapter: options.lifecycleAdapter || 'stable-shell',
          visualMode: visualMode,
          skipHistory: options.skipHistory === true
        });
      }
      recordTransition(id, visualMode === 'skeleton' ? 'skeleton-commit' : 'direct-commit', {
        to: path,
        elapsed: Math.round(performance.now() - startedAt)
      });

      if (options.restoreScroll && lifecycle && lifecycle.scroll) {
        await restoreScrollWithFallback(url.href);
      } else {
        await resetScroll();
      }
      updateSidebar(path);
      try { window.lucide && window.lucide.createIcons && window.lucide.createIcons(); } catch (error) {}
      setBusy(false);

      await assetsPromise;
      if (id !== navigationId) return;

      runInitializers(path);

      // The shell is already committed and interactive. Do not hold the
      // global navigation mutex while a page hydrates; otherwise every link
      // becomes inert until settlement or timeout. A subsequent navigation
      // increments navigationId and safely supersedes this settlement task.
      if (id === navigationId) {
        navigating = false;
        setBusy(false);
      }

      var dataBoot = bootRouteDataController(path);
      if (path === '/detalhe-anuncio.html') {
        await dataBoot;
      } else {
        dataBoot.catch(function (dataError) {
          console.error('[DokeStableShell:secondary-data]', dataError);
        });
      }
      var settlement = await waitForRouteSettlement(path);
      if (id !== navigationId) return;
      if (settlement === 'timeout' && window.DokePageHydration && typeof window.DokePageHydration.showRouteError === 'function') {
        window.DokePageHydration.showRouteError(path, new Error('Tempo limite da rota excedido.'));
        settlement = 'error';
      }
      recordTransition(id, settlement, {
        to: path,
        elapsed: Math.round(performance.now() - startedAt)
      });
      if (lifecycleRouteId && lifecycle && lifecycle.route) {
        lifecycle.route.ready(lifecycleRouteId, {
          state: settlement,
          to: path,
          elapsed: Math.round(performance.now() - startedAt)
        });
      }
    } catch (error) {
      console.error('[DokeStableShell:navigate]', error);
      recordTransition(id, 'error', { to: path, error: error && error.message ? error.message : String(error) });
      if (lifecycleRouteId && lifecycle && lifecycle.route) {
        lifecycle.route.fail(lifecycleRouteId, error, { to: path, adapter: options.lifecycleAdapter || 'stable-shell' });
      }
      if (!committed) {
        if (nextDoc && stylesPrepared) {
          prepareRouteDocument(nextDoc, path, 'direct');
          setRouteVisualMode('direct');
          replaceShell(nextDoc, path);
          setRouteVisualMode('direct');
          activatePendingRouteStyles(nextDoc);
          removeObsoleteRouteStyles(nextDoc);
          if (!options.skipHistory) {
            if (options.replace) window.history.replaceState({ dokeStableShell: true, href: url.href }, '', url.href);
            else window.history.pushState({ dokeStableShell: true, href: url.href }, '', url.href);
          }
          committed = true;
          updateSidebar(path);
          if (window.DokePageHydration && typeof window.DokePageHydration.showRouteError === 'function') {
            window.DokePageHydration.showRouteError(path, error);
          }
        } else {
          setBusy(false);
          navigating = false;
          throw error;
        }
      } else if (window.DokePageHydration && typeof window.DokePageHydration.showRouteError === 'function') {
        window.DokePageHydration.showRouteError(path, error);
      }
    } finally {
      // An older settlement may finish after the user has already started a
      // new route. Only the current navigation may clear global route state.
      if (id === navigationId) {
        setBusy(false);
        navigating = false;
        try {
          document.documentElement.removeAttribute('data-doke-navigation-mode');
          if (document.body) document.body.removeAttribute('data-doke-navigation-mode');
          if (window.DokePageHydration && typeof window.DokePageHydration.clearRouteVisualMode === 'function') {
            window.DokePageHydration.clearRouteVisualMode();
          }
        } catch (error) {}
        requestAnimationFrame(function () {
          if (id === navigationId) clearTransientRouteState();
        });
      }
    }
  }

  function warm(href) {
    if (!isEnabled() || !isSafeUrl(href) || navigating) return;
    var url = new URL(href, window.location.href);
    var key = url.pathname + url.search;
    if (routeWarmCache.has(key)) return routeWarmCache.get(key);
    var preparation = fetchDocument(href).then(function (nextDoc) {
      preloadRouteAssets(nextDoc);
      return ensureStyles(nextDoc, { deferApply: true }).then(function () {
        if (currentPath(url.href) === '/ajuda.html') return ensureScripts(nextDoc);
        return null;
      });
    }).catch(function (error) {
      routeWarmCache.delete(key);
      throw error;
    });
    routeWarmCache.set(key, preparation);
    preparation.catch(function () {});
    return preparation;
  }

  function warmPriorityRoutes() {
    var current = currentPath();
    PRIORITY_WARM_ROUTES.forEach(function (route, index) {
      if (route === current) return;
      window.setTimeout(function () {
        warm(projectRouteUrl(route));
      }, index * 35);
    });
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
      if (lifecycle && typeof window.DokeNavigate === 'function') {
        window.DokeNavigate(link.href, { source: 'link' });
      } else {
        navigate(link.href);
      }
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

    if (!lifecycle) {
      window.addEventListener('popstate', function () {
        navigate(window.location.href, { replace: true, skipHistory: true, restoreScroll: true, source: 'popstate' });
      });
    }

    window.DokeStableShellRouter = publicRouter;
    if (lifecycle && lifecycle.navigation && typeof lifecycle.navigation.registerAdapter === 'function') {
      lifecycle.navigation.registerAdapter('stable-shell', {
        navigate: navigate,
        warm: warm,
        canHandle: function (href) {
          return isEnabled() && isSafeUrl(href);
        }
      }, { priority: 100 });
    } else {
      window.DokeNavigate = function (href, options) {
        return navigate(href, options || {});
      };
    }

    applyRouteRuntimeClasses(currentPath());
    updateSidebar(currentPath());

    if (window.__DOKE_DISABLE_ROUTE_WARMUP__ !== true) {
      window.setTimeout(function () {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(warmPriorityRoutes, { timeout: 500 });
        } else {
          warmPriorityRoutes();
        }
      }, 350);
    }
  }

  function invalidateRoute(href) {
    var url = new URL(href || window.location.href, window.location.href);
    var key = url.pathname + url.search;
    routeCache.delete(key);
    routeWarmCache.delete(key);
    return true;
  }

  var publicRouter = Object.freeze({
    version: ROUTER_VERSION,
    navigate: navigate,
    warm: warm,
    invalidate: invalidateRoute,
    isEnabled: isEnabled,
    isNavigating: function () { return navigating; }
  });

  Doke.stableShellRouter = publicRouter;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
