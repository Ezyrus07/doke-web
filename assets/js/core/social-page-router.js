(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var ROUTER_VERSION = '20260513-social-page-router-v1';
  var SAFE_ROUTES = new Set([
    '/index.html',
    '/pedidos.html',
    '/mensagens.html',
    '/notificacoes.html',
    '/comunidade.html',
    '/comunidade-interna.html',
    '/carteira.html',
    '/perfil.html',
    '/configuracoes.html',
    '/resultados.html'
  ]);
  var NATIVE_ONLY_ROUTES = new Set([
    '/detalhe-anuncio.html',
    '/pagamento-profissional.html',
    '/perfil.html',
  ]);
  var CORE_SCRIPT_RE = /\/assets\/js\/core\/(runtime-config|feature-flags|app|social-page-router)\.js(?:\?|$)/;
  var routeCache = new Map();
  var navigationId = 0;
  var isNavigating = false;

  function isEnabled() {
    try {
      if (Doke.flags && typeof Doke.flags.isEnabled === 'function') {
        return Doke.flags.isEnabled('socialPageNavigation') === true;
      }
      return Doke.runtimeConfig?.flags?.socialPageNavigation === true;
    } catch (_) {
      return false;
    }
  }

  function normalizePath(value) {
    var url = new URL(value || window.location.href, window.location.href);
    return url.pathname === '/' ? '/index.html' : url.pathname;
  }

  function isSafeUrl(href) {
    try {
      var url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return false;
      if (url.hash && url.pathname === window.location.pathname && url.search === window.location.search) return false;
      var path = normalizePath(url.href);
      return SAFE_ROUTES.has(path) && !NATIVE_ONLY_ROUTES.has(path);
    } catch (_) {
      return false;
    }
  }

  function sameDocument(href) {
    var url = new URL(href, window.location.href);
    return url.pathname === window.location.pathname && url.search === window.location.search;
  }

  function getCacheKey(href) {
    var url = new URL(href, window.location.href);
    return normalizePath(url.href) + url.search;
  }

  function fetchDocument(href) {
    var key = getCacheKey(href);
    if (!routeCache.has(key)) {
      routeCache.set(key, fetch(key, {
        headers: { 'X-Requested-With': 'doke-social-router' },
        credentials: 'same-origin'
      }).then(function (response) {
        if (!response.ok) throw new Error('Falha ao carregar ' + key);
        return response.text();
      }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        return { html: html, doc: doc };
      }).catch(function (error) {
        routeCache.delete(key);
        throw error;
      }));
    }
    return routeCache.get(key);
  }

  function preload(href) {
    if (!isEnabled() || !isSafeUrl(href)) return;
    fetchDocument(href).catch(function () {});
  }

  function absoluteHrefFromNode(node) {
    var raw = node.getAttribute('href');
    if (!raw) return '';
    return new URL(raw, window.location.href).href;
  }

  function ensureStyles(nextDoc) {
    var existing = new Set(Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(function (link) {
      return link.href;
    }));
    var stylePromises = [];

    Array.from(nextDoc.querySelectorAll('link[rel="stylesheet"]')).forEach(function (nextLink) {
      var href = absoluteHrefFromNode(nextLink);
      if (!href || existing.has(href)) return;

      var clone = document.createElement('link');
      clone.rel = 'stylesheet';
      clone.href = href;
      clone.setAttribute('data-doke-social-route-style', 'true');

      var media = nextLink.getAttribute('media');
      if (media) clone.media = media;

      stylePromises.push(new Promise(function (resolve) {
        var done = function () {
          window.clearTimeout(timer);
          resolve();
        };
        var timer = window.setTimeout(done, 2000);
        clone.addEventListener('load', done, { once: true });
        clone.addEventListener('error', done, { once: true });
      }));

      document.head.appendChild(clone);
      existing.add(href);
    });

    syncInlineRouteStyles(nextDoc);
    return Promise.all(stylePromises);
  }

  function syncInlineRouteStyles(nextDoc) {
    document.querySelectorAll('style[data-doke-social-inline-style]').forEach(function (node) {
      node.remove();
    });

    Array.from(nextDoc.head.querySelectorAll('style')).forEach(function (style, index) {
      if (!style.textContent || !style.textContent.trim()) return;
      var clone = document.createElement('style');
      clone.textContent = style.textContent;
      clone.setAttribute('data-doke-social-inline-style', String(index));
      document.head.appendChild(clone);
    });
  }

  function syncBodyState(nextDoc) {
    var nextBody = nextDoc.body;
    if (!nextBody) return;

    var keep = [];
    ['sidebar-collapsed', 'sidebar-open', 'mobile-search-active', 'home-search-overlay-active'].forEach(function (className) {
      if (document.body.classList.contains(className) && className === 'sidebar-collapsed') keep.push(className);
    });

    document.body.className = nextBody.className;
    keep.forEach(function (className) { document.body.classList.add(className); });

    Array.from(document.body.attributes).forEach(function (attr) {
      if (attr.name.indexOf('data-page') === 0) document.body.removeAttribute(attr.name);
    });
    Array.from(nextBody.attributes).forEach(function (attr) {
      if (attr.name.indexOf('data-page') === 0) document.body.setAttribute(attr.name, attr.value);
    });
  }

  function updateActiveNavigation(path) {
    document.querySelectorAll('.sidebar a[href], .bottom-nav a[href], .doke-bottom-nav a[href]').forEach(function (link) {
      var linkPath = normalizePath(link.href);
      var isActive = linkPath === path;
      link.classList.toggle('is-active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function syncPageScripts(nextDoc) {
    Array.from(nextDoc.querySelectorAll('script[src]')).forEach(function (script) {
      var src = new URL(script.getAttribute('src'), window.location.href).href;
      if (CORE_SCRIPT_RE.test(new URL(src).pathname)) return;
      if (document.querySelector('script[src="' + src + '"]')) return;

      var clone = document.createElement('script');
      clone.src = src;
      clone.defer = true;
      clone.setAttribute('data-doke-social-route-script', 'true');
      document.body.appendChild(clone);
    });
  }

  function resetScroll() {
    var previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    try { window.scrollTo(0, 0); } catch (_) {}
    try { document.scrollingElement.scrollTop = 0; } catch (_) {}
    document.querySelectorAll('.page, .page__content, .app-shell-page__workspace').forEach(function (node) {
      try { node.scrollTop = 0; } catch (_) {}
    });
    window.requestAnimationFrame(function () {
      document.documentElement.style.scrollBehavior = previous;
    });
  }

  function replacePage(nextDoc, href) {
    var currentShell = document.querySelector('.app-shell');
    var currentPage = currentShell?.querySelector(':scope > .page');
    var nextPage = nextDoc.querySelector('.app-shell > .page');
    if (!currentShell || !currentPage || !nextPage) {
      throw new Error('Contrato .app-shell > .page não encontrado.');
    }

    var importedPage = document.importNode(nextPage, true);
    syncBodyState(nextDoc);
    currentPage.replaceWith(importedPage);
    document.title = nextDoc.title || document.title;
    updateActiveNavigation(normalizePath(href));
    syncPageScripts(nextDoc);
    resetScroll();
    document.dispatchEvent(new CustomEvent('doke:route-ready', {
      detail: { href: href, path: normalizePath(href), router: 'social-page-router' }
    }));
  }

  async function navigate(href, options) {
    options = options || {};
    if (!isEnabled() || !isSafeUrl(href) || sameDocument(href)) {
      if (options.replace) window.location.replace(href);
      else window.location.href = href;
      return;
    }
    if (isNavigating) return;

    var id = ++navigationId;
    isNavigating = true;
    document.body.classList.add('is-social-route-loading');

    try {
      var result = await fetchDocument(href);
      if (id !== navigationId) return;
      await ensureStyles(result.doc);
      if (id !== navigationId) return;

      var commit = function () {
        replacePage(result.doc, href);
        if (options.replace) window.history.replaceState({ href: href }, '', href);
        else window.history.pushState({ href: href }, '', href);
      };

      if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        await document.startViewTransition(commit).finished;
      } else {
        document.body.classList.add('is-social-route-swapping');
        await new Promise(function (resolve) { window.requestAnimationFrame(resolve); });
        commit();
        await new Promise(function (resolve) { window.requestAnimationFrame(resolve); });
        document.body.classList.remove('is-social-route-swapping');
      }
    } catch (error) {
      console.error('[Doke:social-page-router]', error);
      if (options.replace) window.location.replace(href);
      else window.location.href = href;
    } finally {
      isNavigating = false;
      document.body.classList.remove('is-social-route-loading', 'is-social-route-swapping');
    }
  }

  function handleClick(event) {
    if (!isEnabled()) return;
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target?.closest?.('a[href]');
    if (!link) return;
    if (link.target && link.target !== '_self') return;
    if (link.hasAttribute('download')) return;
    if (!isSafeUrl(link.href)) return;

    event.preventDefault();
    event.stopPropagation();
    navigate(link.href);
  }

  function handleWarm(event) {
    var link = event.target?.closest?.('a[href]');
    if (link) preload(link.href);
  }

  function init() {
    if (!isEnabled()) return;
    document.documentElement.classList.add('doke-social-router-ready');
    document.addEventListener('click', handleClick, true);
    document.addEventListener('pointerover', handleWarm, { passive: true, capture: true });
    document.addEventListener('focusin', handleWarm, true);
    document.addEventListener('touchstart', handleWarm, { passive: true, capture: true });
    window.addEventListener('popstate', function () {
      navigate(window.location.href, { replace: true });
    });
  }

  Doke.socialPageRouter = Object.freeze({ version: ROUTER_VERSION, navigate: navigate, preload: preload });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
