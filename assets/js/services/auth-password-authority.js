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
    initialized: false
  };

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
    const code = String(error?.code || error?.status || '').toLowerCase();
    if (message.includes('rate limit') || message.includes('too many') || code === '429') {
      return new Error('Muitas solicitações foram feitas. Aguarde alguns minutos e tente novamente.');
    }
    if (message.includes('same password') || message.includes('different from the old')) {
      return new Error('Escolha uma senha diferente da atual.');
    }
    if (message.includes('weak password') || message.includes('password should be')) {
      return new Error('Use uma senha mais forte, com letras maiúsculas e minúsculas, número e símbolo.');
    }
    if (message.includes('invalid login') || message.includes('invalid credentials')) {
      return new Error('A senha atual está incorreta.');
    }
    if (message.includes('session') || message.includes('jwt') || message.includes('token')) {
      return new Error('Este link não é mais válido. Solicite uma nova recuperação de senha.');
    }
    return new Error(fallback || 'Não foi possível concluir a operação de segurança.');
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
    document.documentElement.dataset.authRecoveryState = status;
    document.dispatchEvent(new CustomEvent('doke:auth-password-state', {
      detail: Object.freeze({ status, ...detail })
    }));
  };

  const bindRecoveryEvent = () => {
    if (state.bound) return;
    const client = getClient();
    if (!client?.auth || typeof client.auth.onAuthStateChange !== 'function') return;
    state.bound = true;
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session?.user) {
        state.eventReceived = true;
        state.active = true;
        state.initialized = true;
        publishState('ready', { source: 'PASSWORD_RECOVERY' });
      }
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

  const initializePasswordRecovery = async () => {
    bindRecoveryEvent();
    publishState('checking');
    const client = requireClient();
    if (typeof client.auth.getSession !== 'function') {
      publishState('invalid');
      return Object.freeze({ active: false, reason: 'authority_unavailable' });
    }

    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      const boot = root.DOKE_AUTH_RECOVERY_BOOT || {};
      state.active = Boolean(data?.session?.user && (state.eventReceived || boot.requested === true));
      state.initialized = true;
      if (state.active) {
        scrubRecoveryUrl();
        publishState('ready', { source: state.eventReceived ? 'event' : 'recovery_url' });
        return Object.freeze({ active: true, user: data.session.user });
      }
      publishState('invalid');
      return Object.freeze({ active: false, reason: 'recovery_context_required' });
    } catch (error) {
      state.active = false;
      state.initialized = true;
      publishState('invalid');
      return Object.freeze({ active: false, reason: 'invalid_or_expired', error: mapAuthError(error).message });
    }
  };

  const completePasswordRecovery = async ({ newPassword, nextPassword } = {}) => {
    const password = String(newPassword || nextPassword || '');
    if (!isStrongPassword(password)) {
      throw new Error('Use uma senha com pelo menos 8 caracteres, letras maiúsculas e minúsculas, número e símbolo.');
    }

    const context = state.initialized && state.active
      ? { active: true }
      : await initializePasswordRecovery();
    if (!context.active) throw new Error('Este link é inválido ou expirou. Solicite uma nova recuperação de senha.');

    const client = requireClient();
    const { error } = await client.auth.updateUser({ password });
    if (error) throw mapAuthError(error, 'Não foi possível redefinir a senha.');

    state.active = false;
    publishState('completed');
    try {
      if (baseLogout) await baseLogout({ redirect: false });
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
    const { error } = await client.auth.updateUser({
      password,
      currentPassword: String(currentPassword || '')
    });
    if (error) throw mapAuthError(error, 'Não foi possível alterar a senha.');

    try {
      await client.auth.signOut({ scope: 'others' });
    } catch {}
    if (baseRefreshSession) await baseRefreshSession({ silent: true });
    publishState('password_changed');
    return Object.freeze({ changed: true, otherSessionsRevoked: true });
  };

  const requestRecovery = (payload = {}) => requestPasswordRecovery(payload);
  const resetPassword = (payload = {}) => completePasswordRecovery(payload);

  const api = Object.freeze({
    version: 'AUTH-A05',
    requestPasswordRecovery,
    initializePasswordRecovery,
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
