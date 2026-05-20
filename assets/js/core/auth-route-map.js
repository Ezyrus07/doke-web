/* Doke Auth Route Map
   Responsibility: classify routes as public, private or auth-only.
   This file has no side effects and does not redirect by itself. */
(function () {
  const ns = (window.DokeAuth = window.DokeAuth || {});

  const PUBLIC_ROUTES = Object.freeze([
    'auth/login.html',
    'auth/register.html',
    'auth/forgot-password.html',
    'login.html',
    'register.html',
    'forgot-password.html'
  ]);

  const AUTH_ONLY_ROUTES = Object.freeze([
    'auth/login.html',
    'auth/register.html',
    'auth/forgot-password.html',
    'login.html',
    'register.html',
    'forgot-password.html'
  ]);

  const PRIVATE_ROUTES = Object.freeze([
    'index.html',
    'pedidos.html',
    'mensagens.html',
    'comunidade.html',
    'comunidades.html',
    'comunidade.html',
    'resultados.html',
    'resultado.html',
    'perfil.html',
    'notificacoes.html',
    'carteira.html',
    'configuracoes.html',
    'tornar-profissional.html',
    'anunciar-servico.html'
  ]);

  const normalizePath = (path = window.location.pathname) => {
    const clean = String(path || '')
      .split('?')[0]
      .split('#')[0]
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');

    return clean || 'index.html';
  };

  const getRouteType = (path = window.location.pathname) => {
    const route = normalizePath(path);

    if (AUTH_ONLY_ROUTES.includes(route)) return 'auth';
    if (PUBLIC_ROUTES.includes(route)) return 'public';
    if (PRIVATE_ROUTES.includes(route)) return 'private';

    // Safe default for Doke internal HTML pages.
    if (route.endsWith('.html')) return 'private';

    return 'public';
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
