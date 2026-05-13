(function () {
  'use strict';

  var INTERNAL_PATHS = new Set([
    '/index.html', '/resultados.html', '/detalhe-anuncio.html', '/pedidos.html', '/mensagens.html',
    '/notificacoes.html', '/carteira.html', '/comunidade.html', '/comunidade-interna.html',
    '/pagamento.html', '/finalizar-pedido.html', '/avaliacao.html', '/adicionar-cartao.html',
    '/perfil.html', '/configuracoes.html', '/mais.html', '/'
  ]);

  var ROUTE_INIT = {
    '/index.html': ['DokeInitHome'],
    '/resultados.html': ['DokeInitSearchResults'],
    '/detalhe-anuncio.html': ['DokeInitDetailPage', 'DokeInitBudget'],
    '/pedidos.html': ['DokeInitOrders'],
    '/mensagens.html': ['DokeInitMessages'],
    '/notificacoes.html': ['DokeInitNotifications'],
    '/carteira.html': ['DokeInitWallet'],
    '/pagamento.html': ['DokeInitPayment'],
    '/finalizar-pedido.html': ['DokeInitOrderFinalize'],
    '/avaliacao.html': ['DokeInitReview'],
    '/perfil.html': ['DokeInitProfile'],
    '/configuracoes.html': [],
    '/comunidade.html': [],
    '/comunidade-interna.html': []
  };

  var PRESERVED_BODY_CLASSES = ['sidebar-collapsed', 'sidebar-open', 'theme-dark', 'mobile-search-active'];
  var CORE_SCRIPT_RE = /assets\/js\/core\/(?:runtime-config|feature-flags|app|stable-shell-router)\.js(?:\?.*)?$/i;
  var loadedScripts = new Set(Array.prototype.map.call(document.querySelectorAll('script[src]'), function (script) {
    return canonicalAssetUrl(script.getAttribute('src'));
  }).filter(Boolean));
  var cache = new Map();
  var navigating = false;

  function currentPath(value) {
    var url = new URL(value || window.location.href, window.location.origin);
    return url.pathname === '/' ? '/index.html' : url.pathname;
  }

  function canonicalAssetUrl(src) {
    if (!src) return '';
    try {
      var url = new URL(src, window.location.href);
      url.search = '';
      url.hash = '';
      return url.href;
    } catch (error) {
      return '';
    }
  }

  function isInternal(href) {
    try {
      var url = new URL(href, window.location.href);
      return url.origin === window.location.origin && INTERNAL_PATHS.has(currentPath(url.href));
    } catch (error) {
      return false;
    }
  }

  function shouldIgnoreClick(event, link) {
    if (!link || !link.href) return true;
    if (link.target && link.target !== '_self') return true;
    if (link.hasAttribute('download')) return true;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return true;
    var url = new URL(link.href, window.location.href);
    if (url.hash && url.pathname === window.location.pathname && url.search === window.location.search) return true;
    return !isInternal(link.href);
  }

  function setBusy(value) {
    document.body.classList.toggle('is-stable-shell-routing', value);
    document.documentElement.classList.toggle('is-stable-shell-routing', value);
    var page = document.querySelector('.app-shell > .page');
    if (page) page.setAttribute('aria-busy', value ? 'true' : 'false');
  }

  function injectStyleGuard() {
    if (document.getElementById('doke-stable-shell-router-style')) return;
    var style = document.createElement('style');
    style.id = 'doke-stable-shell-router-style';
    style.textContent = '\n      html.is-stable-shell-routing, body.is-stable-shell-routing { cursor: progress; }\n      body.is-stable-shell-routing .app-shell > .page { pointer-events: none; }\n      body.is-stable-shell-routing .app-shell > .page * { animation-duration: 0ms !important; transition-duration: 0ms !important; }\n    ';
    document.head.appendChild(style);
  }

  function syncBodyContract(nextBody) {
    if (!nextBody) return;
    var preserved = PRESERVED_BODY_CLASSES.filter(function (className) {
      return document.body.classList.contains(className);
    });
    document.body.className = nextBody.className || '';
    preserved.forEach(function (className) {
      document.body.classList.add(className);
    });
    document.body.classList.remove('sidebar-open', 'mobile-search-active');
  }

  function syncHtmlContract(nextHtml) {
    if (!nextHtml) return;
    var current = document.documentElement;
    var preserved = Array.prototype.filter.call(current.classList, function (className) {
      return className.indexOf('doke-js-') === 0 || className.indexOf('doke-mobile-shell-') === 0;
    });
    current.className = nextHtml.className || '';
    preserved.forEach(function (className) { current.classList.add(className); });
  }

  function replacePage(nextDoc) {
    var currentShell = document.querySelector('.app-shell');
    var currentPage = currentShell && currentShell.querySelector(':scope > .page');
    var nextShell = nextDoc.querySelector('.app-shell');
    var nextPage = nextShell && nextShell.querySelector(':scope > .page');
    if (!currentShell || !currentPage || !nextPage) {
      throw new Error('Contrato .app-shell > .page ausente na rota destino.');
    }

    syncHtmlContract(nextDoc.documentElement);
    syncBodyContract(nextDoc.body);
    currentPage.replaceWith(nextPage.cloneNode(true));

    var currentScrim = document.querySelector('.mobile-scrim');
    var nextScrim = nextDoc.querySelector('.mobile-scrim');
    if (currentScrim && nextScrim) currentScrim.replaceWith(nextScrim.cloneNode(true));
    if (!currentScrim && nextScrim) document.body.appendChild(nextScrim.cloneNode(true));
    if (currentScrim && !nextScrim) currentScrim.remove();
  }

  function resetScroll() {
    var previousHtmlBehavior = document.documentElement.style.scrollBehavior;
    var previousBodyBehavior = document.body.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';
    try { window.scrollTo(0, 0); } catch (error) {}
    ['.app-shell', '.page', '.page__content', '.page__content-inner', '.shell-home__workspace', '.doke-page-shell'].forEach(function (selector) {
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
      '.nav-link--messages': normalized === '/mensagens.html' || normalized === '/pagamento.html' || normalized === '/finalizar-pedido.html' || normalized === '/avaliacao.html',
      '.nav-link--notifications': normalized === '/notificacoes.html',
      '.nav-link--communities': normalized === '/comunidade.html' || normalized === '/comunidade-interna.html',
      '.nav-link--profile': normalized === '/perfil.html',
      '.nav-link--wallet': normalized === '/carteira.html' || normalized === '/adicionar-cartao.html',
      '.nav-link--settings': normalized === '/configuracoes.html' || normalized === '/mais.html'
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
    document.dispatchEvent(new CustomEvent('doke:stable-route-ready', { detail: { path: path } }));
  }

  async function ensureRouteScripts(nextDoc) {
    var scripts = Array.prototype.slice.call(nextDoc.querySelectorAll('script[src]'))
      .map(function (node) { return node.getAttribute('src'); })
      .filter(Boolean)
      .filter(function (src) { return !CORE_SCRIPT_RE.test(src); });

    for (var i = 0; i < scripts.length; i += 1) {
      var src = scripts[i];
      var key = canonicalAssetUrl(src);
      if (!key || loadedScripts.has(key)) continue;
      await new Promise(function (resolve) {
        var script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.onload = resolve;
        script.onerror = resolve;
        document.body.appendChild(script);
        loadedScripts.add(key);
      });
    }
  }

  async function fetchDocument(url) {
    var key = url.pathname + url.search;
    if (!cache.has(key)) {
      cache.set(key, fetch(key, { headers: { 'X-Requested-With': 'doke-stable-shell' } })
        .then(function (response) {
          if (!response.ok) throw new Error('HTTP ' + response.status + ' em ' + key);
          return response.text();
        }));
    }
    var html = await cache.get(key);
    return new DOMParser().parseFromString(html, 'text/html');
  }

  async function navigate(href, options) {
    options = options || {};
    var url = new URL(href, window.location.href);
    var path = currentPath(url.href);
    if (!isInternal(url.href)) {
      window.location.href = url.href;
      return;
    }
    if (navigating) return;
    navigating = true;
    setBusy(true);
    updateSidebar(path);
    try {
      var nextDoc = await fetchDocument(url);
      await ensureRouteScripts(nextDoc);
      replacePage(nextDoc);
      document.title = nextDoc.title || document.title;
      if (options.replace) history.replaceState({ dokeStableShell: true, href: url.href }, '', url.href);
      else history.pushState({ dokeStableShell: true, href: url.href }, '', url.href);
      resetScroll();
      updateSidebar(path);
      runInitializers(path);
    } catch (error) {
      console.error('[DokeStableShell:navigate]', error);
      // Do not fall back to native navigation automatically: that is what made
      // the sidebar flash/reload and exposed unstyled HTML during the cycle.
      // The current page remains stable; users can retry the click.
    } finally {
      requestAnimationFrame(function () {
        setBusy(false);
        navigating = false;
      });
    }
  }

  function bind() {
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

    document.addEventListener('mouseover', function (event) {
      var target = event.target instanceof Element ? event.target : null;
      var link = target && target.closest('a[href]');
      if (!link || !isInternal(link.href)) return;
      try {
        var url = new URL(link.href, window.location.href);
        fetchDocument(url).catch(function () {});
      } catch (error) {}
    }, { passive: true, capture: true });

    window.addEventListener('popstate', function () {
      navigate(window.location.href, { replace: true });
    });

    window.DokeNavigate = function (href, options) {
      navigate(href, options || {});
    };

    updateSidebar(currentPath());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
