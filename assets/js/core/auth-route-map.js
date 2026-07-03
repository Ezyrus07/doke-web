/* Doke Auth Route Map
   Responsibility: classify routes as public, private or auth-only.
   This file has no side effects and does not redirect by itself. */
(function () {
  'use strict';

  const ns = (window.DokeAuth = window.DokeAuth || {});

  const PUBLIC_ROUTES = Object.freeze([
    'index.html',
    'resultados.html',
    'resultado.html',
    'detalhe-anuncio.html',
    'perfil.html',
    'perfil-profissional.html',
    'perfil-cliente.html',
    'ajuda.html',
    'novidades.html',
    'auth/login.html',
    'auth/cadastro.html',
    'auth/esqueci-senha.html',
  ]);

  const AUTH_ONLY_ROUTES = Object.freeze([
    'auth/login.html',
    'auth/cadastro.html',
    'auth/esqueci-senha.html',
  ]);

  const PRIVATE_ROUTES = Object.freeze([
    'pedidos.html',
    'mensagens.html',
    'notificacoes.html',
    'carteira.html',
    'admin.html',
    'meu-perfil.html',
    'orcamento.html',
    'anunciar-servico.html',
    'configuracoes.html',
    'tornar-profissional.html',
    'pagamento-profissional.html',
    'avaliacao-profissional.html',
    'comunidade.html',
    'comunidade-interna.html'
  ]);

  const normalizePath = (path = window.location.pathname) => {
    const clean = String(path || '')
      .split('?')[0]
      .split('#')[0]
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');

    const marker = clean.lastIndexOf('/auth/');
    if (marker >= 0) return clean.slice(marker + 1);

    return clean.split('/').filter(Boolean).slice(-1)[0] || 'index.html';
  };

  const getRouteType = (path = window.location.pathname) => {
    const route = normalizePath(path);

    if (AUTH_ONLY_ROUTES.includes(route)) return 'auth';
    if (PRIVATE_ROUTES.includes(route)) return 'private';
    if (PUBLIC_ROUTES.includes(route)) return 'public';

    return route.endsWith('.html') ? 'public' : 'public';
  };

  const isAuthRoute = (path) => getRouteType(path) === 'auth';
  const isPrivateRoute = (path) => getRouteType(path) === 'private';
  const isPublicRoute = (path) => getRouteType(path) === 'public';

  ns.routes = Object.freeze({
    PUBLIC_ROUTES,
    AUTH_ONLY_ROUTES,
    PRIVATE_ROUTES,
    normalizePath,
    getRouteType,
    isAuthRoute,
    isPrivateRoute,
    isPublicRoute
  });
})();
