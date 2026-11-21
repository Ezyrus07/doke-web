/* Doke AUTH-A05 Password Authority
   Responsibility: bind password recovery, reset and authenticated password
   changes to Supabase Auth without browser-local codes or secret persistence. */
(function () {
  'use strict';

  const root = window;
  const ns = root.DokeAuth || (root.DokeAuth = {});
  if (ns.passwordAuthority?.version === 'AUTH-A05') return;

  const baseLogout = typeof ns.logout === 'function' ? ns.logout.bind(ns) : null;
  const baseRefreshSession = typeof ns.refreshSession === 'function' ? ns.refreshSession.bind(ns) : null;
  const state = {
    bound: false,
    eventReceived: false,
    active: false,
    initialized: false,
    recoveryUserId: '',
    proof: '',
    revision: 0,
    status: 'idle',
    message: '',
    verification: null
  };
  const RECOVERY_CHECK_TIMEOUT_MS = 10000;
  let recoveryEvents = Promise.resolve();

  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
  const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
  const passwordScore = (value) => [
    String(value || '').length >= 8,
    /[a-z]/.test(value) && /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value)
  ].filter(Boolean).length;
  const isStrongPassword = (value) => String(value || '').length >= 8 && passwordScore(String(value || '')) >= 3;

  const getClient = () => root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
    ? root.DokeSupabase.getClient()
    : null;

  const requireClient = () => {
    const client = getClient();
    if (!client?.auth) throw new Error('A autoridade de segurança ainda não foi carregada. Recarregue a página e tente novamente.');
    return client;
  };

  const mapAuthError = (error, fallback) => {
    const message = String(error?.message || '').toLowerCase();
    const code = /^[a-z0-9_]{1,80}$/i.test(error?.code || '') ? String(error.code).toLowerCase() : 'auth_operation_failed';
    const status = Number.isInteger(error?.status) ? error.status : 0;
    let text = fallback || 'Não foi possível concluir a operação de segurança.';
    if (status >= 500 || code === 'request_timeout') text = 'O serviço de autenticação está temporariamente indisponível. Tente novamente mais tarde.';
    else if (status === 429 || ['over_email_send_rate_limit', 'over_request_rate_limit'].includes(code) || message.includes('rate limit') || message.includes('too many')) text = 'Muitas solicitações foram feitas. Aguarde alguns minutos e tente novamente.';
    else if (code === 'same_password' || message.includes('same password') || message.includes('different from the old')) text = 'Escolha uma senha diferente da atual.';
    else if (code === 'weak_password' || message.includes('weak password') || message.includes('password should be')) text = 'Use uma senha mais forte, com letras maiúsculas e minúsculas, número e símbolo.';
    else if (code === 'invalid_credentials' || message.includes('invalid login') || message.includes('invalid credentials')) text = 'A senha atual está incorreta.';
    else if (['session_not_found', 'session_expired', 'otp_expired'].includes(code) || message.includes('session') || message.includes('jwt') || message.includes('token')) text = 'Este link não é mais válido. Solicite uma nova recuperação de senha.';
    return Object.assign(new Error(text), { code, status });
  };

  const recoveryRedirectUrl = () => {
    const target = new URL('esqueci-senha.html', root.location.href);
    target.search = '';
    target.searchParams.set('mode', 'reset');
    target.hash = '';
    return target.href;
  };

  const scrubRecoveryUrl = () => {
    if (!root.history?.replaceState) return;
    try {
      const url = new URL(root.location.href);
      ['code', 'token_hash', 'type'].forEach((key) => url.searchParams.delete(key));
      url.hash = '';
      root.history.replaceState({ authRecovery: true }, '', `${url.pathname}${url.search}`);
    } catch {}
  };

  const publishState = (status, detail = {}) => {
    const message = detail.error || '';
    if (state.status === status && state.message === message) return;
    state.status = status;
    state.message = message;
    document.documentElement.dataset.authRecoveryState = status;
    document.dispatchEvent(new CustomEvent('doke:auth-password-state', {
      detail: Object.freeze({ status, ...detail })
    }));
  };

  const getRecoveryState = () => Object.freeze({
    status: state.status,
    active: state.status === 'ready' && state.active,
    message: state.message
  });

  const sessionProof = async (session) => {
    if (!session?.user?.id || !session.access_token || !root.crypto?.subtle) return '';
    // Bind to the SDK session without retaining or publishing its credentials.
    const hash = await root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(session.access_token));
    return `${session.user.id}:${Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  };

  const invalidateRecovery = () => {
    const completed = state.status === 'completed';
    state.revision++;
    state.proof = '';
    state.eventReceived = false;
    state.recoveryUserId = '';
    state.active = false;
    state.verification?.cancel('recovery_context_ended');
    if (!completed) publishState('invalid');
  };

  const bindRecoveryEvent = () => {
    if (state.bound) return;
    const client = getClient();
    if (!client?.auth || typeof client.auth.onAuthStateChange !== 'function') return;
    state.bound = true;
    const subscribe = typeof root.DokeSupabase.subscribeRecoveryEvents === 'function'
      ? root.DokeSupabase.subscribeRecoveryEvents.bind(root.DokeSupabase)
      : client.auth.onAuthStateChange.bind(client.auth);
    subscribe((event, session) => {
      // Never await SDK methods in its callback: process ordered events outside its lock.
      recoveryEvents = recoveryEvents.then(async () => {
        if (event === 'SIGNED_OUT') {
          invalidateRecovery();
          return;
        }
        if (event === 'PASSWORD_RECOVERY') {
          const proof = await sessionProof(session);
          if (!proof) { invalidateRecovery(); return; }
          if (proof !== state.proof) {
            state.revision++;
            state.active = false;
            state.proof = proof;
          }
          state.eventReceived = true;
          state.recoveryUserId = String(session.user.id);
          state.verification?.wake?.();
          if (state.initialized && !state.active && (!state.verification || state.verification.closed) && state.status !== 'completed') void initializePasswordRecovery();
        } else if (event === 'SIGNED_IN' && state.proof) {
          if (await sessionProof(session) !== state.proof) invalidateRecovery();
        } else if (event === 'TOKEN_REFRESHED' && state.proof) {
          if (session?.user?.id !== state.recoveryUserId) { invalidateRecovery(); return; }
          const proof = await sessionProof(session);
          if (!proof) { invalidateRecovery(); return; }
          state.revision++;
          state.proof = proof;
          state.verification?.wake?.();
        }
      }).catch(() => invalidateRecovery());
    });
  };

  const requestPasswordRecovery = async ({ email, contact, method = 'email' } = {}) => {
    if (method !== 'email') throw new Error('A recuperação por telefone ainda não está disponível. Use o e-mail cadastrado.');
    const normalizedEmail = normalizeEmail(email || contact);
    if (!isEmail(normalizedEmail)) throw new Error('Digite um e-mail válido para recuperar o acesso.');

    const client = requireClient();
    if (typeof client.auth.resetPasswordForEmail !== 'function') {
      throw new Error('A recuperação de senha está indisponível neste momento.');
    }

    const { error } = await client.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: recoveryRedirectUrl()
    });
    if (error) throw mapAuthError(error, 'Não foi possível enviar o link de recuperação agora.');

    return Object.freeze({
      accepted: true,
      method: 'email',
      message: 'Se existir uma conta com esse e-mail, enviaremos um link seguro para redefinir a senha.'
    });
  };

  const initializePasswordRecovery = () => {
    if (state.verification && !state.verification.closed) return state.verification.promise;
    bindRecoveryEvent();
    state.initialized = true;
    state.active = false;
    const run = { closed: false, wake: null, cancel: null, promise: null };
    const cancelled = new Promise((resolve) => {
      run.cancel = (reason) => {
        run.closed = true;
        run.wake?.();
        resolve(Object.freeze({ active: false, reason }));
      };
    });
    state.verification = run;
    publishState('checking');
    // This deadline can only deny access; readiness comes from the SDK event and session.
    const timer = setTimeout(() => {
      if (run.closed) return;
      state.active = false;
      publishState('invalid', { error: 'A verificação não foi concluída a tempo. Solicite um novo link ou tente novamente.' });
      run.cancel('verification_timeout');
    }, RECOVERY_CHECK_TIMEOUT_MS);
    const verify = async () => {
      try {
        const client = requireClient();
        if (typeof client.auth.getSession !== 'function') throw new Error('Sessão indisponível.');
        const initialization = await client.auth.initialize?.();
        if (initialization?.error) throw initialization.error;
        const initial = await client.auth.getSession();
        if (initial.error || !initial.data?.session?.user) throw initial.error || new Error('Sessão inválida.');
        for (;;) {
          await recoveryEvents;
          if (run.closed) return Object.freeze({ active: false, reason: 'verification_ended' });
          if (!state.proof) {
            await new Promise((resolve) => { run.wake = resolve; });
            run.wake = null;
            continue;
          }
          const revision = state.revision;
          const { data, error } = await client.auth.getSession();
          if (error) throw error;
          const proof = await sessionProof(data?.session);
          await recoveryEvents;
          if (run.closed) return Object.freeze({ active: false, reason: 'verification_ended' });
          if (revision !== state.revision) continue;
          if (!proof || proof !== state.proof) throw new Error('Sessão inválida para recuperação.');
          state.active = true;
          scrubRecoveryUrl();
          publishState('ready', { source: 'PASSWORD_RECOVERY' });
          return Object.freeze({ active: true, user: data.session.user });
        }
      } catch (error) {
        if (!run.closed) {
          state.active = false;
          publishState('invalid', { error: mapAuthError(error).message });
        }
        return Object.freeze({ active: false, reason: 'invalid_or_expired' });
      }
    };
    run.promise = Promise.race([verify(), cancelled]).finally(() => {
      run.closed = true;
      clearTimeout(timer);
      if (state.verification === run) state.verification = null;
    });
    return run.promise;
  };

  const completePasswordRecovery = async ({ newPassword, nextPassword } = {}) => {
    const password = String(newPassword || nextPassword || '');
    if (!isStrongPassword(password)) {
      throw new Error('Use uma senha com pelo menos 8 caracteres, letras maiúsculas e minúsculas, número e símbolo.');
    }

    const context = await initializePasswordRecovery();
    if (!context.active) throw new Error('Este link é inválido ou expirou. Solicite uma nova recuperação de senha.');

    const client = requireClient();
    const { data, error } = await client.auth.updateUser({ password });
    if (error) throw mapAuthError(error, 'Não foi possível redefinir a senha.');
    if (!data?.user?.id) throw new Error('A redefinição de senha não foi confirmada pelo serviço de autenticação.');

    state.active = false;
    state.proof = '';
    state.eventReceived = false;
    publishState('completed');
    try {
      if (baseLogout) await baseLogout({ scope: 'global', redirect: false });
      else await client.auth.signOut({ scope: 'global' });
    } finally {
      ns.session?.clear?.();
      root.Doke?.session?.clear?.();
    }
    return Object.freeze({ changed: true, requiresLogin: true });
  };

  const reauthenticateWithPassword = async ({ currentPassword } = {}) => {
    const password = String(currentPassword || '');
    if (!password) throw new Error('Digite sua senha atual.');
    const client = requireClient();
    const userResponse = await client.auth.getUser();
    if (userResponse?.error) throw mapAuthError(userResponse.error, 'Não foi possível confirmar sua identidade.');
    const email = normalizeEmail(userResponse?.data?.user?.email);
    if (!email) throw new Error('Sua conta não possui um e-mail apto para reautenticação.');

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data?.session) throw mapAuthError(error, 'A senha atual está incorreta.');
    return Object.freeze({ authenticated: true, user: data.user });
  };

  const changePassword = async ({ currentPassword, newPassword, nextPassword } = {}) => {
    const password = String(newPassword || nextPassword || '');
    if (!isStrongPassword(password)) {
      throw new Error('Use uma senha com pelo menos 8 caracteres, letras maiúsculas e minúsculas, número e símbolo.');
    }
    if (String(currentPassword || '') === password) throw new Error('Escolha uma senha diferente da atual.');

    await reauthenticateWithPassword({ currentPassword });
    const client = requireClient();
    const { data, error } = await client.auth.updateUser({
      password,
      current_password: String(currentPassword || '')
    });
    if (error) throw mapAuthError(error, 'Não foi possível alterar a senha.');
    if (!data?.user?.id) throw new Error('A alteração de senha não foi confirmada pelo serviço de autenticação.');

    let otherSessionsRevoked = false;
    let sessionRefreshConfirmed = false;
    try {
      const response = await client.auth.signOut({ scope: 'others' });
      otherSessionsRevoked = Boolean(response && !response.error);
    } catch {}
    try {
      if (baseRefreshSession) sessionRefreshConfirmed = Boolean((await baseRefreshSession({ silent: true }))?.user);
    } catch {}
    publishState('password_changed');
    return Object.freeze({ changed: true, otherSessionsRevoked, sessionRefreshConfirmed });
  };

  const requestRecovery = (payload = {}) => requestPasswordRecovery(payload);
  const resetPassword = (payload = {}) => completePasswordRecovery(payload);

  const api = Object.freeze({
    version: 'AUTH-A05',
    requestPasswordRecovery,
    initializePasswordRecovery,
    getRecoveryState,
    completePasswordRecovery,
    reauthenticateWithPassword,
    changePassword,
    requestRecovery,
    resetPassword,
    isStrongPassword
  });

  ns.passwordAuthority = api;
  ns.requestPasswordRecovery = requestPasswordRecovery;
  ns.initializePasswordRecovery = initializePasswordRecovery;
  ns.completePasswordRecovery = completePasswordRecovery;
  ns.reauthenticateWithPassword = reauthenticateWithPassword;
  ns.changePassword = changePassword;
  ns.requestRecovery = requestRecovery;
  ns.resetPassword = resetPassword;

  bindRecoveryEvent();
  document.dispatchEvent(new CustomEvent('doke:auth-password-authority-ready', {
    detail: { version: api.version, provider: 'supabase' }
  }));
})();
