(() => {
  const PREFETCH_ATTR = 'data-doke-prefetched';
  const SAVE_DATA = navigator.connection?.saveData === true;
  const SLOW_CONNECTION = /(^|\s)(slow-2g|2g)(\s|$)/i.test(navigator.connection?.effectiveType || '');
  const MAX_IDLE_PREFETCH = 3;
  const MAX_TOTAL_PREFETCH = 12;
  const prefetched = new Set();

  if (SAVE_DATA || SLOW_CONNECTION) return;

  const sameOrigin = (url) => url.origin === window.location.origin;
  const isHtmlRoute = (url) => {
    const path = url.pathname.split('/').pop() || 'index.html';
    return path === '' || path.endsWith('.html') || !path.includes('.');
  };

  const normalizeRoute = (rawHref) => {
    if (!rawHref || typeof rawHref !== 'string') return null;
    if (rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) return null;

    try {
      const url = new URL(rawHref, window.location.href);
      if (!sameOrigin(url) || !isHtmlRoute(url)) return null;
      url.hash = '';
      const current = new URL(window.location.href);
      current.hash = '';
      if (url.href === current.href) return null;
      return url.href;
    } catch (_) {
      return null;
    }
  };

  const prefetch = (href, priority = 'route') => {
    const url = normalizeRoute(href);
    if (!url || prefetched.has(url) || prefetched.size >= MAX_TOTAL_PREFETCH) return;

    prefetched.add(url);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'document';
    link.href = url;
    link.setAttribute(PREFETCH_ATTR, priority);
    document.head.appendChild(link);
  };

  const getRouteFromTarget = (target) => {
    const navButton = target.closest?.('[data-header-nav]');
    if (navButton?.dataset?.headerNav) return navButton.dataset.headerNav;
    const anchor = target.closest?.('a[href]');
    return anchor?.getAttribute('href') || null;
  };

  const warmTarget = (event) => {
    const href = getRouteFromTarget(event.target);
    if (href) prefetch(href, 'intent');
  };

  document.addEventListener('pointerenter', warmTarget, { capture: true, passive: true });
  document.addEventListener('focusin', warmTarget, { capture: true, passive: true });
  document.addEventListener('touchstart', warmTarget, { capture: true, passive: true });

  const ROUTE_GROUPS = {
    index: ['resultados.html', 'detalhe-anuncio.html', 'perfil.html'],
    home: ['resultados.html', 'detalhe-anuncio.html', 'perfil.html'],
    pedidos: ['mensagens.html', 'notificacoes.html', 'perfil.html'],
    mensagens: ['pedidos.html', 'notificacoes.html', 'perfil.html'],
    notificacoes: ['mensagens.html', 'pedidos.html', 'novidades.html'],
    novidades: ['ajuda.html', 'notificacoes.html', 'comunidade.html'],
    ajuda: ['notificacoes.html', 'novidades.html', 'index.html'],
    comunidade: ['comunidade-interna.html', 'perfil.html', 'mensagens.html'],
    'comunidade-interna': ['comunidade.html', 'mensagens.html', 'perfil.html'],
    perfil: ['mensagens.html', 'pedidos.html', 'tornar-profissional.html'],
    carteira: ['adicionar-cartao.html', 'perfil.html'],
    configuracoes: ['perfil.html', 'ajuda.html', 'index.html'],
    resultados: ['detalhe-anuncio.html', 'index.html', 'perfil.html'],
    'detalhe-anuncio': ['perfil.html', 'finalizar-pedido.html', 'mensagens.html'],
    'finalizar-pedido': ['pedidos.html', 'detalhe-anuncio.html']
  };

  const getPageKey = () => {
    const dataPage = document.body?.dataset?.page;
    if (dataPage) return dataPage;
    return (window.location.pathname.split('/').pop() || 'index.html').replace(/\.html$/i, '') || 'index';
  };

  const idle = (callback) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout: 2400 });
      return;
    }
    window.setTimeout(callback, 1200);
  };

  const warmLikelyRoutes = () => {
    const routes = ROUTE_GROUPS[getPageKey()] || ROUTE_GROUPS.index;
    routes.slice(0, MAX_IDLE_PREFETCH).forEach((href, index) => {
      window.setTimeout(() => prefetch(href, 'idle'), index * 180);
    });
  };

  const optimizeImages = () => {
    const viewportBottom = window.innerHeight * 1.6;
    document.querySelectorAll('img:not([loading])').forEach((img) => {
      const rect = img.getBoundingClientRect();
      if (rect.top > viewportBottom) img.loading = 'lazy';
      if (!img.decoding) img.decoding = 'async';
    });
  };

  if (document.readyState === 'complete') {
    idle(warmLikelyRoutes);
    idle(optimizeImages);
  } else {
    window.addEventListener('load', () => {
      idle(warmLikelyRoutes);
      idle(optimizeImages);
    }, { once: true });
  }
})();
