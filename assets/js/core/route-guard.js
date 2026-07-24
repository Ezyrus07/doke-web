/* Doke Auth Route Guard
   Responsibility: make the canonical authorization decision for the current route.
   Pre-paint scripts may hide a protected document, but only this guard may authorize it. */
(function () {
  'use strict';

  const root = window;
  const doc = document;
  const ns = (root.DokeAuth = root.DokeAuth || {});
  const ACCESS_STATE_SELECTOR = '[data-auth-access-state]';
  const ACTIVE_ACCOUNT_STATUSES = new Set(['active', 'pending_email', 'pending_review']);
  const ACTIVE_SESSION_STATUSES = new Set(['active']);
  let bound = false;
  let evaluationVersion = 0;

  const getRedirects = () => ({
    login: doc.documentElement.dataset.authLoginUrl || 'auth/login.html',
    app: doc.documentElement.dataset.authAppUrl || 'index.html',
    help: doc.documentElement.dataset.authHelpUrl || 'ajuda.html'
  });

  const getMode = (routeType) => {
    const configured = String(
      doc.documentElement.dataset.authGuardMode ||
      doc.body?.dataset.authGuardMode ||
      ''
    ).trim().toLowerCase();

    if (configured === 'observe' || configured === 'enforce') return configured;
    return routeType === 'private' || routeType === 'auth' ? 'enforce' : 'observe';
  };

  const currentLocationPath = () => [
    root.location.pathname || '/',
    root.location.search || '',
    root.location.hash || ''
  ].join('');

  const sameOriginUrl = (target, fallback) => {
    try {
      const base = new URL(doc.baseURI || root.location.href);
      const resolved = new URL(String(target || ''), base);
      if (!/^https?:$/.test(resolved.protocol) || resolved.origin !== base.origin) {
        return new URL(String(fallback || 'index.html'), base);
      }
      return resolved;
    } catch {
      return new URL(String(fallback || 'index.html'), doc.baseURI || root.location.href);
    }
  };

  const buildLoginUrl = (reason) => {
    const redirects = getRedirects();
    const login = sameOriginUrl(redirects.login, 'auth/login.html');
    login.searchParams.set('next', currentLocationPath());
    if (reason) login.searchParams.set('reason', reason);
    return login.href;
  };

  const clearAccessState = () => {
    const current = doc.querySelector?.(ACCESS_STATE_SELECTOR);
    if (current?.remove) current.remove();
  };

  const createActionLink = (href, label, primary) => {
    const link = doc.createElement('a');
    link.className = primary
      ? 'doke-auth-access-state__action doke-auth-access-state__action--primary'
      : 'doke-auth-access-state__action';
    link.href = sameOriginUrl(href, 'index.html').href;
    link.textContent = label;
    return link;
  };

  const accessPresentation = (state) => {
    const redirects = getRedirects();
    const presentations = {
      expired: {
        eyebrow: 'Sessão encerrada',
        title: 'Sua sessão expirou',
        description: 'Entre novamente para continuar com segurança.',
        primaryHref: buildLoginUrl('expired'),
        primaryLabel: 'Entrar novamente'
      },
      revoked: {
        eyebrow: 'Sessão revogada',
        title: 'Este acesso não é mais válido',
        description: 'Sua sessão foi encerrada em outro dispositivo ou pelo servidor.',
        primaryHref: buildLoginUrl('revoked'),
        primaryLabel: 'Entrar novamente'
      },
      suspended: {
        eyebrow: 'Conta suspensa',
        title: 'O acesso à conta está temporariamente bloqueado',
        description: 'Consulte o suporte da Doke para entender o status da sua conta.',
        primaryHref: redirects.help,
        primaryLabel: 'Abrir ajuda'
      },
      disabled: {
        eyebrow: 'Conta desativada',
        title: 'Esta conta não pode acessar a Doke',
        description: 'Consulte o suporte caso acredite que isso seja um engano.',
        primaryHref: redirects.help,
        primaryLabel: 'Abrir ajuda'
      },
      forbidden: {
        eyebrow: 'Acesso restrito',
        title: 'Você não tem permissão para abrir esta página',
        description: 'A página exige um perfil ou nível de acesso diferente.',
        primaryHref: redirects.app,
        primaryLabel: 'Voltar ao início'
      },
      error: {
        eyebrow: 'Proteção de acesso',
        title: 'Não foi possível validar sua sessão',
        description: 'Recarregue a página. O conteúdo privado continuará protegido.',
        primaryHref: currentLocationPath(),
        primaryLabel: 'Recarregar'
      }
    };
    return presentations[state] || presentations.error;
  };

  const renderAccessState = (state) => {
    if (!doc.body || typeof doc.createElement !== 'function') return null;
    clearAccessState();

    const presentation = accessPresentation(state);
    const section = doc.createElement('section');
    section.className = 'doke-auth-access-state';
    section.dataset.authAccessState = state;
    section.setAttribute('role', state === 'forbidden' ? 'alert' : 'status');
    section.setAttribute('aria-live', 'polite');

    const card = doc.createElement('div');
    card.className = 'doke-auth-access-state__card';

    const eyebrow = doc.createElement('span');
    eyebrow.className = 'doke-auth-access-state__eyebrow';
    eyebrow.textContent = presentation.eyebrow;

    const title = doc.createElement('h1');
    title.className = 'doke-auth-access-state__title';
    title.textContent = presentation.title;

    const description = doc.createElement('p');
    description.className = 'doke-auth-access-state__description';
    description.textContent = presentation.description;

    const actions = doc.createElement('div');
    actions.className = 'doke-auth-access-state__actions';
    actions.appendChild(createActionLink(presentation.primaryHref, presentation.primaryLabel, true));

    if (state !== 'expired' && state !== 'revoked') {
      actions.appendChild(createActionLink(getRedirects().app, 'Ir para a página inicial', false));
    }

    card.appendChild(eyebrow);
    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(actions);
    section.appendChild(card);
    doc.body.appendChild(section);
    return section;
  };

  const setDecision = (state, detail = {}) => {
    const html = doc.documentElement;
    html.dataset.authRouteDecision = state;
    html.dataset.authGuard = state === 'authorized' ? 'authorized' : state;
    html.dataset.authenticated = String(detail.authenticated === true);
    if (detail.routeType) html.dataset.authRouteType = detail.routeType;
    if (detail.mode) html.dataset.authGuardMode = detail.mode;
    if (detail.accountStatus) html.dataset.authAccountStatus = detail.accountStatus;
    if (detail.sessionStatus) html.dataset.authSessionStatus = detail.sessionStatus;

    if (state === 'authorized') clearAccessState();
    else if (!['pending', 'redirecting', 'anonymous'].includes(state)) renderAccessState(state);

    doc.dispatchEvent(new CustomEvent('doke:auth-route-evaluated', {
      detail: Object.assign({ state }, detail)
    }));

    return Object.freeze(Object.assign({ state }, detail));
  };

  const getAuthContext = () => {
    if (typeof ns.service?.getAuthContext === 'function') return ns.service.getAuthContext();
    const session = ns.session?.getSession?.() || null;
    const user = session?.user || null;
    return {
      authenticated: Boolean(user),
      user,
      role: user?.role || 'guest',
      accountStatus: session?.accountStatus || user?.accountStatus || 'active',
      sessionStatus: user ? session?.sessionStatus || 'active' : 'anonymous',
      canAccessAdmin: Boolean(ns.session?.canAccessAdmin?.())
    };
  };

  const isExpiredByTime = (context) => {
    const expiresAt = context?.expiresAt || ns.session?.getSession?.()?.expiresAt || '';
    const timestamp = expiresAt ? Date.parse(expiresAt) : NaN;
    return Number.isFinite(timestamp) && timestamp <= Date.now();
  };

  const normalizeAccessState = (context) => {
    if (!context?.authenticated) return 'anonymous';

    const sessionStatus = String(context.sessionStatus || 'active').trim().toLowerCase();
    if (sessionStatus === 'revoked') return 'revoked';
    if (sessionStatus === 'expired' || isExpiredByTime(context)) return 'expired';
    if (!ACTIVE_SESSION_STATUSES.has(sessionStatus)) return 'expired';

    const accountStatus = String(context.accountStatus || 'active').trim().toLowerCase();
    if (accountStatus === 'suspended') return 'suspended';
    if (accountStatus === 'disabled') return 'disabled';
    if (!ACTIVE_ACCOUNT_STATUSES.has(accountStatus)) return 'forbidden';

    return 'active';
  };

  const refreshAuthority = async (policy) => {
    if (!policy.requiresAuth && !policy.guestOnly) return;
    if (typeof ns.service?.refreshSession !== 'function') return;
    try {
      await ns.service.refreshSession({ silent: true });
    } catch {
      // The next context evaluation remains fail-closed for protected routes.
    }
  };

  const redirectAnonymous = (reason) => {
    const href = buildLoginUrl(reason || 'authentication_required');
    setDecision('redirecting', {
      authenticated: false,
      routeType: 'private',
      mode: 'enforce',
      reason: reason || 'authentication_required'
    });
    root.location.replace(href);
  };

  const evaluate = async () => {
    if (!ns.routes || !ns.service) {
      return setDecision('pending', {
        authenticated: false,
        routeType: 'unknown',
        mode: 'enforce',
        reason: 'auth_runtime_pending'
      });
    }

    const version = ++evaluationVersion;
    const policy = ns.routes.getRoutePolicy();
    const mode = getMode(policy.type);
    const enforce = mode === 'enforce';

    if (enforce && (policy.requiresAuth || policy.guestOnly)) {
      setDecision('pending', {
        authenticated: false,
        routeType: policy.type,
        route: policy.route,
        mode,
        enforce
      });
    }

    await refreshAuthority(policy);
    if (version !== evaluationVersion) return null;

    const context = getAuthContext();
    const accessState = normalizeAccessState(context);
    const detail = {
      mode,
      enforce,
      route: policy.route,
      routeType: policy.type,
      authenticated: context.authenticated === true,
      accountStatus: context.accountStatus || 'active',
      sessionStatus: context.sessionStatus || 'anonymous',
      role: context.role || 'guest'
    };

    if (policy.type === 'public') return setDecision('authorized', detail);

    if (policy.guestOnly) {
      if (accessState === 'active' && enforce) {
        ns.service.redirectIfAuthenticated({
          enforce: true,
          redirectToApp: getRedirects().app
        });
        return setDecision('redirecting', Object.assign({}, detail, { reason: 'already_authenticated' }));
      }
      return setDecision('authorized', detail);
    }

    if (!enforce) return setDecision('authorized', detail);

    if (accessState === 'anonymous') {
      redirectAnonymous('authentication_required');
      return null;
    }

    if (accessState !== 'active') {
      return setDecision(accessState, Object.assign({}, detail, { reason: accessState }));
    }

    if (policy.requiresAdmin && context.canAccessAdmin !== true) {
      return setDecision('forbidden', Object.assign({}, detail, { reason: 'admin_access_required' }));
    }

    return setDecision('authorized', detail);
  };

  const bind = () => {
    if (bound) return evaluate();
    bound = true;
    ns.service?.onAuthChange?.(() => evaluate());
    doc.addEventListener('doke:supabase-client-ready', () => evaluate());
    root.addEventListener('pageshow', () => evaluate());
    return evaluate();
  };

  ns.guard = Object.freeze({
    evaluate,
    bind,
    getMode,
    getAuthContext,
    normalizeAccessState,
    renderAccessState,
    buildLoginUrl
  });

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
