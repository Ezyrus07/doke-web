/* Doke Auth Route Map
   Responsibility: classify routes and expose immutable access policies.
   This file has no redirect side effects. */
(function () {
  'use strict';

  const ns = (window.DokeAuth = window.DokeAuth || {});

  const PUBLIC_ROUTES = Object.freeze([
    'index.html',
    'resultados.html',
    'resultado.html',
    'detalhe-anuncio.html',
    'perfil.html',
    'perfil-cliente.html',
    'ajuda.html',
    'novidades.html'
  ]);

  const AUTH_ONLY_ROUTES = Object.freeze([
    'auth/login.html',
    'auth/cadastro.html',
    'auth/esqueci-senha.html'
  ]);

  const ADMIN_ROUTES = Object.freeze([
    'admin.html',
    'admin-verificacao.html',
    'admin-anuncio-revisao.html',
    'admin-pedidos-operacao.html'
  ]);

  const PRIVATE_ROUTES = Object.freeze([
    'pedidos.html',
    'mensagens.html',
    'notificacoes.html',
    'carteira.html',
    ...ADMIN_ROUTES,
    'meu-perfil.html',
    'perfil-profissional.html',
    'orcamento.html',
    'anunciar-servico.html',
    'configuracoes.html',
    'tornar-profissional.html',
    'verificacao-profissional.html',
    'pagamento-profissional.html',
    'avaliacao-profissional.html',
    'comunidade.html',
    'comunidade-interna.html'
  ]);

  const ACTIVE_ACCOUNT_STATUSES = Object.freeze([
    'active',
    'pending_email',
    'pending_review'
  ]);

  const ACTIVE_SESSION_STATUSES = Object.freeze(['active']);

  const normalizePath = (path = window.location.pathname) => {
    const clean = String(path || '')
      .split('?')[0]
      .split('#')[0]
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');

    if (clean.startsWith('auth/')) return clean;

    const marker = clean.lastIndexOf('/auth/');
    if (marker >= 0) return clean.slice(marker + 1);

    return clean.split('/').filter(Boolean).slice(-1)[0] || 'index.html';
  };

  const getRouteType = (path = window.location.pathname) => {
    const route = normalizePath(path);
    if (AUTH_ONLY_ROUTES.includes(route)) return 'auth';
    if (PRIVATE_ROUTES.includes(route)) return 'private';
    return 'public';
  };

  const getRoutePolicy = (path = window.location.pathname) => {
    const route = normalizePath(path);
    const type = getRouteType(route);
    return Object.freeze({
      route,
      type,
      requiresAuth: type === 'private',
      guestOnly: type === 'auth',
      requiresAdmin: ADMIN_ROUTES.includes(route),
      allowedAccountStatuses: ACTIVE_ACCOUNT_STATUSES,
      allowedSessionStatuses: ACTIVE_SESSION_STATUSES
    });
  };

  const isAuthRoute = (path) => getRouteType(path) === 'auth';
  const isPrivateRoute = (path) => getRouteType(path) === 'private';
  const isPublicRoute = (path) => getRouteType(path) === 'public';
  const isAdminRoute = (path) => ADMIN_ROUTES.includes(normalizePath(path));

  ns.routes = Object.freeze({
    PUBLIC_ROUTES,
    AUTH_ONLY_ROUTES,
    PRIVATE_ROUTES,
    ADMIN_ROUTES,
    ACTIVE_ACCOUNT_STATUSES,
    ACTIVE_SESSION_STATUSES,
    normalizePath,
    getRouteType,
    getRoutePolicy,
    isAuthRoute,
    isPrivateRoute,
    isPublicRoute,
    isAdminRoute
  });
})();
