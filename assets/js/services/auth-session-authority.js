/* Doke AUTH-A06 Session Authority
   Responsibility: provide explicit Supabase session lifecycle, refresh and logout
   semantics without persisting provider credentials or falling back to browser identity. */
(function () {
  'use strict';

  const root = window;
  const ns = root.DokeAuth || (root.DokeAuth = {});
  const VERSION = 'AUTH-A06';
  const LEGACY_RECOVERY_KEY = 'doke.auth.recovery.v1';
  const LEGACY_SESSION_KEY = 'doke.auth.session';
  const LOGOUT_SCOPES = Object.freeze({ local: 'local', others: 'others', global: 'global' });

  if (ns.sessionAuthority?.version === VERSION) return;

  let baseService = null;
  let unsubscribePublicSession = null;
  let installAttempts = 0;
  let initialized = false;
  let captureBound = false;

  const state = {
    status: 'idle',
    source: 'bootstrap',
    lastEvent: '',
    lastError: '',
    updatedAt: ''
  };

  const getClient = () => root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
    ? root.DokeSupabase.getClient()
    : null;

  const getSessionStore = () => ns.session || root.Doke?.session || null;
  const getPublicSession = () => baseService?.getSession?.() || getSessionStore()?.getSession?.() || getSessionStore()?.read?.() || null;

  const removeLegacyBrowserState = () => {
    try {
      root.localStorage.removeItem(LEGACY_RECOVERY_KEY);
      root.localStorage.removeItem(LEGACY_SESSION_KEY);
    } catch {}
  };

  const publish = (status, detail = {}) => {
    state.status = status;
    state.source = detail.source || state.source || 'runtime';
    state.lastEvent = detail.event || state.lastEvent || '';
    state.lastError = detail.error || '';
    state.updatedAt = new Date().toISOString();
    document.documentElement.dataset.authSessionAuthority = status;
    document.dispatchEvent(new CustomEvent('doke:auth-session-authority-state', {
      detail: Object.freeze({ ...state, ...detail })
    }));
    return Object.freeze({ ...state });
  };

  const classifyPublicSession = (session) => {
    if (!session?.user) return 'anonymous';
    const explicit = String(session.sessionStatus || '').trim().toLowerCase();
    if (explicit === 'revoked') return 'revoked';
    if (explicit === 'expired') return 'expired';
    if (session.expiresAt) {
      const expiresAt = Date.parse(session.expiresAt);
      if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) return 'expired';
    }
    return 'active';
  };

  const reconcilePublicSession = (session, detail = {}) => publish(classifyPublicSession(session), {
    source: detail.source || 'public_session',
    event: detail.event || ''
  });

  const mapSessionError = (error, fallback) => {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('refresh token') || message.includes('invalid token') || message.includes('token not found') || message.includes('jwt')) {
      const mapped = new Error('Sua sessão foi revogada. Entre novamente para continuar.');
      mapped.code = 'DOKE_AUTH_SESSION_REVOKED';
      return mapped;
    }
    if (message.includes('expired')) {
      const mapped = new Error('Sua sessão expirou. Entre novamente para continuar.');
      mapped.code = 'DOKE_AUTH_SESSION_EXPIRED';
      return mapped;
    }
    const mapped = new Error(fallback || 'Não foi possível concluir a operação de sessão.');
    mapped.code = error?.code || 'DOKE_AUTH_SESSION_OPERATION_FAILED';
    return mapped;
  };

  const requireClient = () => {
    const client = getClient();
    if (!client?.auth) {
      const error = new Error('A autoridade de sessão do Supabase está indisponível. Recarregue a página e tente novamente.');
      error.code = 'DOKE_AUTH_SESSION_AUTHORITY_UNAVAILABLE';
      throw error;
    }
    return client;
  };

  const clearCurrentPublicSession = () => {
    getSessionStore()?.clear?.();
    removeLegacyBrowserState();
  };

  const refresh = async ({ silent = false } = {}) => {
    const client = requireClient();
    if (typeof client.auth.refreshSession !== 'function') {
      const error = new Error('A renovação segura da sessão está indisponível.');
      error.code = 'DOKE_AUTH_SESSION_REFRESH_UNAVAILABLE';
      if (silent) return getPublicSession();
      throw error;
    }

    publish('refreshing', { source: 'supabase', event: 'REFRESH_REQUESTED' });
    try {
      const response = await client.auth.refreshSession();
      if (response?.error) throw response.error;
      const session = response?.data?.session || null;
      if (!session?.user) {
        clearCurrentPublicSession();
        publish('revoked', { source: 'supabase', event: 'REFRESH_REJECTED' });
        return null;
      }
      const reconciled = await baseService?.refreshSupabaseSession?.({ silent: true });
      reconcilePublicSession(reconciled || getPublicSession(), { source: 'supabase', event: 'TOKEN_REFRESHED' });
      return reconciled || getPublicSession();
    } catch (error) {
      const mapped = mapSessionError(error, 'Não foi possível renovar sua sessão agora.');
      if (mapped.code === 'DOKE_AUTH_SESSION_REVOKED' || mapped.code === 'DOKE_AUTH_SESSION_EXPIRED') {
        clearCurrentPublicSession();
        publish(mapped.code.endsWith('EXPIRED') ? 'expired' : 'revoked', {
          source: 'supabase',
          event: 'REFRESH_REJECTED',
          error: mapped.message
        });
      } else {
        publish('refresh_failed', { source: 'supabase', event: 'REFRESH_FAILED', error: mapped.message });
      }
      if (silent) return getPublicSession();
      throw mapped;
    }
  };

  const normalizeScope = (value) => {
    const scope = String(value || LOGOUT_SCOPES.local).trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(LOGOUT_SCOPES, scope)) {
      const error = new Error('Escopo de encerramento de sessão inválido.');
      error.code = 'DOKE_AUTH_LOGOUT_SCOPE_INVALID';
      throw error;
    }
    return LOGOUT_SCOPES[scope];
  };

  const signOutWithScope = async (scopeValue, { redirect = false, redirectTo } = {}) => {
    const scope = normalizeScope(scopeValue);
    const client = requireClient();
    if (typeof client.auth.signOut !== 'function') {
      const error = new Error('O encerramento seguro da sessão está indisponível.');
      error.code = 'DOKE_AUTH_SIGN_OUT_UNAVAILABLE';
      throw error;
    }

    publish('signing_out', { source: 'supabase', event: `SIGN_OUT_${scope.toUpperCase()}`, scope });
    const response = await client.auth.signOut({ scope });
    if (response?.error) {
      const mapped = mapSessionError(response.error, 'Não foi possível encerrar a sessão no provedor. Tente novamente.');
      publish('sign_out_failed', {
        source: 'supabase',
        event: `SIGN_OUT_${scope.toUpperCase()}_FAILED`,
        scope,
        error: mapped.message
      });
      throw mapped;
    }

    if (scope === LOGOUT_SCOPES.others) {
      const current = await baseService?.refreshSupabaseSession?.({ silent: true });
      reconcilePublicSession(current || getPublicSession(), { source: 'supabase', event: 'SIGNED_OUT_OTHERS' });
    } else {
      clearCurrentPublicSession();
      publish('anonymous', { source: 'supabase', event: scope === LOGOUT_SCOPES.global ? 'SIGNED_OUT_GLOBAL' : 'SIGNED_OUT_LOCAL', scope });
    }

    if (redirect && scope !== LOGOUT_SCOPES.others) {
      root.location.assign(redirectTo || resolveLoginRedirect());
    }

    return Object.freeze({
      signedOut: true,
      scope,
      currentSessionEnded: scope !== LOGOUT_SCOPES.others,
      otherSessionsRevoked: scope !== LOGOUT_SCOPES.local
    });
  };

  const signOutCurrentDevice = (options = {}) => signOutWithScope(LOGOUT_SCOPES.local, options);
  const signOutOtherSessions = (options = {}) => signOutWithScope(LOGOUT_SCOPES.others, options);
  const signOutAllSessions = (options = {}) => signOutWithScope(LOGOUT_SCOPES.global, options);
  const logout = ({ scope = LOGOUT_SCOPES.local, ...options } = {}) => signOutWithScope(scope, options);

  const requirePasswordAuthority = () => {
    const authority = ns.passwordAuthority;
    if (!authority?.requestRecovery || !authority?.resetPassword) {
      const error = new Error('A autoridade de recuperação de senha ainda não foi carregada.');
      error.code = 'DOKE_AUTH_PASSWORD_AUTHORITY_UNAVAILABLE';
      throw error;
    }
    return authority;
  };

  const requestRecovery = (payload = {}) => requirePasswordAuthority().requestRecovery(payload);
  const resetPassword = (payload = {}) => requirePasswordAuthority().resetPassword(payload);

  const resolveLoginRedirect = () => {
    const inAuthFolder = root.location.pathname.includes('/auth/');
    const loginPath = inAuthFolder ? 'login.html' : 'auth/login.html';
    const current = `${root.location.pathname.split('/').pop() || 'index.html'}${root.location.search || ''}${root.location.hash || ''}`;
    return `${loginPath}?next=${encodeURIComponent(current)}`;
  };

  const getPublicState = () => Object.freeze({
    ...state,
    session: getPublicSession(),
    authenticated: Boolean(getPublicSession()?.user)
  });

  const bindPublicSession = () => {
    if (unsubscribePublicSession || typeof baseService?.onAuthChange !== 'function') return;
    unsubscribePublicSession = baseService.onAuthChange((session) => {
      reconcilePublicSession(session, { source: 'doke_session', event: 'PUBLIC_SESSION_CHANGED' });
    });
  };

  const initialize = async () => {
    removeLegacyBrowserState();
    bindPublicSession();
    if (initialized) return getPublicState();
    initialized = true;
    publish('checking', { source: 'supabase', event: 'INITIAL_SESSION' });

    const client = getClient();
    if (!client?.auth) {
      publish('unavailable', { source: 'supabase', event: 'AUTHORITY_UNAVAILABLE' });
      return getPublicState();
    }

    try {
      const session = await baseService?.refreshSupabaseSession?.({ silent: false });
      reconcilePublicSession(session || getPublicSession(), { source: 'supabase', event: 'INITIAL_SESSION' });
    } catch (error) {
      const mapped = mapSessionError(error, 'Não foi possível validar a sessão atual.');
      publish('unavailable', { source: 'supabase', event: 'INITIAL_SESSION_FAILED', error: mapped.message });
    }
    return getPublicState();
  };

  const dispose = () => {
    if (typeof unsubscribePublicSession === 'function') unsubscribePublicSession();
    unsubscribePublicSession = null;
    initialized = false;
    publish('disposed', { source: 'runtime', event: 'DISPOSED' });
  };

  const bindLogoutCapture = () => {
    if (captureBound) return;
    captureBound = true;
    document.addEventListener('click', (event) => {
      const button = event.target?.closest?.('[data-profile-logout], [data-sidebar-logout], [data-auth-logout]');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const scope = button.dataset.authLogoutScope || LOGOUT_SCOPES.local;
      const originalLabel = button.textContent;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = scope === LOGOUT_SCOPES.global ? 'Encerrando sessões...' : 'Saindo...';
      logout({ scope, redirect: true, redirectTo: resolveLoginRedirect() }).catch((error) => {
        button.disabled = false;
        button.setAttribute('aria-busy', 'false');
        button.textContent = originalLabel;
        document.dispatchEvent(new CustomEvent('doke:auth-session-operation-error', {
          detail: { operation: 'sign_out', scope, message: error?.message || 'Não foi possível encerrar a sessão.' }
        }));
      });
    }, true);
  };

  const api = Object.freeze({
    version: VERSION,
    scopes: LOGOUT_SCOPES,
    initialize,
    refresh,
    logout,
    signOut: logout,
    signOutCurrentDevice,
    signOutOtherSessions,
    signOutAllSessions,
    requestRecovery,
    resetPassword,
    getPublicState,
    dispose
  });

  const installFacade = () => {
    if (ns.sessionAuthority?.version === VERSION) return true;
    if (!ns.service) return false;
    baseService = ns.service;
    const facade = Object.freeze({
      ...baseService,
      refreshSession: refresh,
      logout,
      signOut: logout,
      requestRecovery,
      resetPassword,
      sessionAuthority: api
    });
    ns.service = facade;
    ns.sessionAuthority = api;
    ns.refreshSession = refresh;
    ns.logout = logout;
    ns.signOut = logout;
    ns.requestRecovery = requestRecovery;
    ns.resetPassword = resetPassword;
    bindLogoutCapture();
    initialize();
    document.dispatchEvent(new CustomEvent('doke:auth-session-authority-ready', {
      detail: { version: VERSION, provider: 'supabase' }
    }));
    return true;
  };

  const installWhenReady = () => {
    if (installFacade()) return;
    installAttempts += 1;
    if (installAttempts > 80) {
      publish('unavailable', { source: 'runtime', event: 'AUTH_SERVICE_UNAVAILABLE' });
      return;
    }
    root.setTimeout(installWhenReady, 25);
  };

  document.addEventListener('doke:supabase-client-ready', () => initialize());
  installWhenReady();
})();
