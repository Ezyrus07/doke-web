(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var ROUTER_VERSION = '20260513-stable-shell-router-v2';

  var SAFE_ROUTES = new Set([
    '/index.html',
    '/resultados.html',
    '/pedidos.html',
    '/mensagens.html',
    '/notificacoes.html',
    '/carteira.html',
    '/comunidade.html',
    '/comunidade-interna.html',
    '/perfil.html',
    '/configuracoes.html',
    '/tornar-profissional.html',
    '/'
  ]);

  var NATIVE_ONLY_ROUTES = new Set([
    '/detalhe-anuncio.html',
    '/pagamento-profissional.html',
    '/avaliacao.html'
  ]);

  var ROUTE_INIT = {
    '/index.html': ['DokeInitHome'],
    '/resultados.html': ['DokeInitSearchResults'],
    '/pedidos.html': ['DokeInitOrders'],
    '/mensagens.html': ['DokeInitMessages'],
    '/notificacoes.html': ['DokeInitNotifications'],
    '/carteira.html': ['DokeInitWallet'],
    '/comunidade.html': [],
    '/comunidade-interna.html': [],
    '/perfil.html': ['DokeInitProfile'],
    '/configuracoes.html': [],
    '/tornar-profissional.html': ['DokeInitBecomePro']
  };

  var PRESERVED_BODY_CLASSES = [
    'sidebar-collapsed',
    'theme-dark'
  ];

  var PRESERVED_HTML_CLASS_PREFIXES = [
    'doke-js-',
    'doke-mobile-shell-'
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
    return url.pathname === '/' ? '/index.html' : url.pathname;
  }

  function canonicalAssetUrl(src) {
    if (!src) return '';
    try {
      var url = new URL(src, window.location.href);
      url.hash = '';
      url.search = '';
      return url.href;
    } catch (error) {
      return '';
    }
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
    document.body.classList.toggle('is-stable-shell-routing', value);
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

  function ensureStyles(nextDoc) {
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
      clone.media = nextLink.getAttribute('media') || 'all';
      clone.setAttribute('data-doke-stable-route-style', 'true');

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

    return scripts.reduce(function (promise, src) {
      return promise.then(function () {
        var key = canonicalAssetUrl(src);
        if (!key || loadedScripts.has(key)) return undefined;
        return new Promise(function (resolve) {
          var script = document.createElement('script');
          script.src = src;
          script.async = false;
          script.defer = false;
          script.setAttribute('data-doke-stable-route-script', 'true');
          script.addEventListener('load', resolve, { once: true });
          script.addEventListener('error', resolve, { once: true });
          document.body.appendChild(script);
          loadedScripts.add(key);
        });
      });
    }, Promise.resolve());
  }

  function syncHtmlContract(nextHtml) {
    if (!nextHtml) return;
    var current = document.documentElement;
    var preserved = Array.prototype.filter.call(current.classList, function (className) {
      return PRESERVED_HTML_CLASS_PREFIXES.some(function (prefix) { return className.indexOf(prefix) === 0; });
    });

    current.className = nextHtml.className || '';
    preserved.forEach(function (className) { current.classList.add(className); });
  }

  function syncBodyContract(nextBody) {
    if (!nextBody) return;
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
    document.body.classList.remove('sidebar-open', 'mobile-search-active', 'home-search-overlay-active', 'is-stable-shell-routing');
  }


  function applyRouteRuntimeClasses(path) {
    var normalized = path || currentPath();
    var isHome = normalized === '/index.html' || normalized === '/';
    document.documentElement.classList.toggle('home-index-root', isHome);
  }

  function syncStandaloneUi(nextDoc) {
    var currentScrim = document.querySelector('.mobile-scrim');
    var nextScrim = nextDoc.querySelector('.mobile-scrim');
    if (currentScrim && nextScrim) currentScrim.replaceWith(nextScrim.cloneNode(true));
    else if (!currentScrim && nextScrim) document.body.appendChild(nextScrim.cloneNode(true));
    else if (currentScrim && !nextScrim) currentScrim.remove();

    var currentModal = document.querySelector('.ui-modal');
    var nextModal = nextDoc.querySelector('.ui-modal');
    if (currentModal && nextModal) currentModal.replaceWith(nextModal.cloneNode(true));
    else if (!currentModal && nextModal) document.body.appendChild(nextModal.cloneNode(true));
    else if (currentModal && !nextModal) currentModal.remove();
  }

  function replaceShell(nextDoc, path) {
    var currentShell = document.querySelector('.app-shell');
    var nextShell = nextDoc.querySelector('.app-shell');
    if (!currentShell || !nextShell) {
      throw new Error('Contrato .app-shell ausente na rota destino.');
    }

    var nextShellNode = nextShell.cloneNode(true);
    var currentSidebar = currentShell.querySelector(':scope > .sidebar');
    var nextSidebar = nextShellNode.querySelector(':scope > .sidebar');
    if (currentSidebar && nextSidebar) {
      nextSidebar.replaceWith(currentSidebar);
    }

    syncHtmlContract(nextDoc.documentElement);
    syncBodyContract(nextDoc.body);
    applyRouteRuntimeClasses(path);
    currentShell.replaceWith(nextShellNode);
    syncStandaloneUi(nextDoc);
    document.title = nextDoc.title || document.title;
  }

  function resetScroll() {
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
      try { window.scrollTo(0, 0); } catch (error) {}
      document.documentElement.style.scrollBehavior = previousHtmlBehavior;
      document.body.style.scrollBehavior = previousBodyBehavior;
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
    try { window.DokeUiSelect && window.DokeUiSelect.refresh && window.DokeUiSelect.refresh(); } catch (error) {}
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

    if (navigating) return;
    var id = ++navigationId;
    navigating = true;
    setBusy(true);
    updateSidebar(path);

    try {
      var nextDoc = await fetchDocument(url.href);
      if (id !== navigationId) return;
      await ensureStyles(nextDoc);
      if (id !== navigationId) return;
      await ensureScripts(nextDoc);
      if (id !== navigationId) return;
      replaceShell(nextDoc, path);

      if (options.replace) window.history.replaceState({ dokeStableShell: true, href: url.href }, '', url.href);
      else window.history.pushState({ dokeStableShell: true, href: url.href }, '', url.href);

      resetScroll();
      updateSidebar(path);
      runInitializers(path);
    } catch (error) {
      console.error('[DokeStableShell:navigate]', error);
      if (options.replace) window.location.replace(url.href);
      else window.location.href = url.href;
    } finally {
      requestAnimationFrame(function () {
        setBusy(false);
        navigating = false;
      });
    }
  }

  function warm(href) {
    if (!isEnabled() || !isSafeUrl(href)) return;
    fetchDocument(href).catch(function () {});
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
      navigate(href, options || {});
    };

    applyRouteRuntimeClasses(currentPath());
    updateSidebar(currentPath());
  }

  Doke.stableShellRouter = Object.freeze({ version: ROUTER_VERSION, navigate: navigate, warm: warm, isEnabled: isEnabled });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
