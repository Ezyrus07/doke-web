/* Doke Auth Service
   Responsibility: provider orchestration for login, registration, session and public identity.
   Provider boundary: pages call this service; repository can later switch to backend. */
(function () {
  'use strict';

  const root = window;
  const ns = root.DokeAuth || (root.DokeAuth = {});
  const Doke = root.Doke || (root.Doke = {});

  const AUTH_PROVIDER_VALUES = Object.freeze({ supabase: 'supabase' });
  const DEFAULT_LOGIN_URL = 'auth/login.html';
  const DEFAULT_APP_URL = 'index.html';
  const DELAY_MS = 120;
  let supabaseAuthSubscription = null;
  let supabaseBootstrapPromise = null;

  const delay = (ms = DELAY_MS) => new Promise((resolve) => root.setTimeout(resolve, ms));
  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
  const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
  const normalizeText = (value) => String(value || '').trim().replace(/\s+/g, ' ');
  const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
  const isPhone = (value) => {
    const digits = normalizePhone(value);
    return digits.length >= 10 && digits.length <= 13;
  };

  const getUsersRepository = () => ns.repositories?.users || null;
  const getSessionStore = () => ns.session || Doke.session || null;
  const getSupabaseClient = () => root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
    ? root.DokeSupabase.getClient()
    : null;
  const isSupabaseAuthRequired = () => {
    const config = root.DOKE_SUPABASE_CONFIG || {};
    return config.enabled !== false && Boolean(config.url) && Boolean(config.anonKey);
  };
  const roleFromMetadata = (user) => {
    const value = String(user?.app_metadata?.role || 'client').trim().toLowerCase();
    return ['client', 'professional', 'moderator', 'support', 'admin'].includes(value) ? value : 'client';
  };
  const publicUserFromSupabase = (user) => {
    if (!user) return null;
    const metadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};
    const name = normalizeText(metadata.name || metadata.full_name || user.email || 'Conta Doke');
    const role = roleFromMetadata(user);
    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'DK';
    return {
      id: user.id,
      name,
      displayName: name,
      email: normalizeEmail(user.email),
      phone: normalizePhone(metadata.display_phone || metadata.phone || user.phone || ''),
      role,
      type: role,
      handle: String(metadata.handle || '').trim().toLowerCase(),
      initials,
      avatarInitials: initials,
      avatarUrl: metadata.avatar_url || metadata.avatarUrl || '',
      avatar: metadata.avatar_url || metadata.avatarUrl || '',
      accountStatus: appMetadata.account_status || 'active',
      verified: Boolean(user.email_confirmed_at || user.confirmed_at),
      createdAt: user.created_at || new Date().toISOString(),
      publicProfileUrl: role === 'professional' ? 'perfil.html' : 'perfil-cliente.html',
      ownerProfileUrl: role === 'professional' ? 'perfil-profissional.html' : 'meu-perfil.html'
    };
  };
  const mergeSupabaseUserWithSnapshot = (user) => {
    const publicUser = publicUserFromSupabase(user);
    const currentUser = getSessionStore()?.getCurrentUser?.() || getSessionStore()?.getUser?.() || null;
    if (!publicUser || !currentUser || String(currentUser.id || '') !== String(publicUser.id || '')) return publicUser;
    return {
      ...currentUser,
      ...publicUser,
      profile: currentUser.profile || publicUser.profile || null,
      profiles: Array.isArray(currentUser.profiles) ? currentUser.profiles : [],
      publicProfileUrl: currentUser.publicProfileUrl || publicUser.publicProfileUrl || '',
      ownerProfileUrl: currentUser.ownerProfileUrl || publicUser.ownerProfileUrl || ''
    };
  };

  const setSupabaseSession = (session, remember = true) => {
    const user = mergeSupabaseUserWithSnapshot(session?.user);
    if (!user) throw new Error('Sessão Supabase inválida.');
    const store = getSessionStore();
    if (!store?.write) throw new Error('Session Store não foi carregado.');
    const current = store.getSession?.() || store.read?.() || null;
    return store.write({
      provider: 'supabase',
      remember,
      user,
      accountStatus: user.accountStatus || 'active',
      sessionStatus: 'active',
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : '',
      issuedAt: current?.issuedAt || new Date().toISOString()
    });
  };

  const getSupabaseAccessToken = async () => {
    const client = getSupabaseClient();
    if (!client?.auth || typeof client.auth.getSession !== 'function') return '';
    const response = await client.auth.getSession();
    if (response?.error) throw response.error;
    return String(response?.data?.session?.access_token || '').trim();
  };

  const getAccessToken = async () => {
    if (isSupabaseAuthRequired()) return getSupabaseAccessToken();
    return '';
  };

  const toPublicUser = (user) => {
    const repo = getUsersRepository();
    if (repo?.toPublicUser) return repo.toPublicUser(user);
    if (!user) return null;
    const { password, passwordHash, ...publicUser } = user;
    return publicUser;
  };

  const normalizeProfilePayload = (payload, user) => {
    const source = payload?.profile || payload?.currentProfile || payload?.professionalProfile || payload?.clientProfile || payload;
    if (!source || typeof source !== 'object') return null;
    const role = Doke.authDomainContract?.normalizeRole
      ? Doke.authDomainContract.normalizeRole(source.role || source.type || user?.role || user?.type)
      : String(source.role || source.type || user?.role || 'client');
    const name = normalizeText(source.name || source.displayName || user?.name || 'Perfil Doke');
    return {
      id: source.id || source.profileId || source.providerProfileId || user?.providerProfileId || user?.id || '',
      userId: source.userId || source.ownerId || user?.id || '',
      role,
      type: source.type || role,
      name,
      handle: source.handle || user?.handle || '',
      avatar: source.avatar || source.avatarUrl || user?.avatar || user?.avatarUrl || '',
      avatarUrl: source.avatarUrl || source.avatar || user?.avatarUrl || user?.avatar || '',
      avatarInitials: source.avatarInitials || source.initials || user?.avatarInitials || user?.initials || '',
      initials: source.initials || source.avatarInitials || user?.initials || user?.avatarInitials || '',
      coverUrl: source.coverUrl || source.cover || user?.coverUrl || '',
      headline: source.headline || source.profession || user?.profession || '',
      profession: source.profession || source.headline || user?.profession || '',
      bio: source.bio || user?.bio || '',
      interests: Array.isArray(source.interests) ? source.interests.slice(0, 8) : [],
      city: source.city || user?.city || '',
      state: source.state || user?.state || '',
      location: source.location || [source.city || user?.city, source.state || user?.state].filter(Boolean).join(', '),
      rating: Number.isFinite(Number(source.rating)) ? Number(source.rating) : Number.isFinite(Number(user?.rating)) ? Number(user.rating) : 0,
      verified: source.verified === true || user?.verified === true,
      metrics: source.metrics && typeof source.metrics === 'object' ? source.metrics : {},
      publicUrl: source.publicUrl || source.publicProfileUrl || '',
      ownerUrl: source.ownerUrl || source.ownerProfileUrl || '',
      createdAt: source.createdAt || source.created_at || user?.createdAt || '',
      updatedAt: source.updatedAt || ''
    };
  };

  const buildSession = (user, options = {}) => ({
    provider: options.provider || 'mock',
    remember: options.remember !== false,
    user: toPublicUser(user),
    sessionStatus: options.sessionStatus || 'active',
    expiresAt: options.expiresAt || '',
    issuedAt: new Date().toISOString()
  });

  const reconcileSupabaseSession = (session) => {
    const current = getSession();
    if (session?.user) {
      const stored = setSupabaseSession(session, current?.remember !== false);
      updateAccountSurfaces();
      return stored;
    }
    if (String(current?.provider || '').toLowerCase() === 'supabase') {
      getSessionStore()?.clear?.();
      updateAccountSurfaces();
    }
    return null;
  };

  const bindSupabaseAuthStateChange = (client) => {
    if (supabaseAuthSubscription || !client?.auth || typeof client.auth.onAuthStateChange !== 'function') return supabaseAuthSubscription;
    const response = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) reconcileSupabaseSession(null);
      else reconcileSupabaseSession(session);
    });
    supabaseAuthSubscription = response?.data?.subscription || response?.subscription || response || true;
    return supabaseAuthSubscription;
  };

  const refreshSupabaseSession = async ({ silent = false } = {}) => {
    if (!isSupabaseAuthRequired()) return getSession();
    const client = getSupabaseClient();
    if (!client?.auth || typeof client.auth.getSession !== 'function') return getSession();
    try {
      bindSupabaseAuthStateChange(client);
      const response = await client.auth.getSession();
      if (response?.error) throw response.error;
      return reconcileSupabaseSession(response?.data?.session || null);
    } catch (error) {
      if (!silent) throw error;
      return getSession();
    }
  };

  const bootstrapSupabaseSessionBridge = ({ silent = true } = {}) => {
    if (!isSupabaseAuthRequired()) return Promise.resolve(getSession());
    const client = getSupabaseClient();
    if (!client) return Promise.resolve(getSession());
    bindSupabaseAuthStateChange(client);
    if (!supabaseBootstrapPromise) {
      supabaseBootstrapPromise = refreshSupabaseSession({ silent }).finally(() => {
        supabaseBootstrapPromise = null;
      });
    }
    return supabaseBootstrapPromise;
  };

  const refreshSession = (options = {}) => refreshSupabaseSession(options);

  const getCurrentIdentity = () => {
    const session = getSession();
    const user = session?.user || null;
    return Object.freeze({
      user,
      profile: user?.profile || null,
      profiles: user?.profiles || [],
      publicProfileUrl: user?.publicProfileUrl || user?.profile?.publicUrl || '',
      ownerProfileUrl: user?.ownerProfileUrl || user?.profile?.ownerUrl || '',
      provider: session?.provider || AUTH_PROVIDER_VALUES.supabase
    });
  };

  const updateCurrentUser = async (patch = {}) => {
    await delay(60);

    const repo = getUsersRepository();
    const currentUser = getCurrentUser();
    if (repo?.updateCurrentUser && currentUser?.id) {
      const user = await repo.updateCurrentUser(currentUser.id, patch);
      const session = setSessionForUser(user, { provider: 'mock', remember: true });
      updateAccountSurfaces();
      return session.user;
    }

    const session = setSessionForUser({ ...(currentUser || {}), ...patch }, { provider: 'mock', remember: true });
    updateAccountSurfaces();
    return session.user;
  };

  const updateCurrentProfile = async (patch = {}) => {
    await delay(60);

    const repo = getUsersRepository();
    const currentUser = getCurrentUser();
    if (repo?.updateCurrentProfile && currentUser?.id) {
      const user = await repo.updateCurrentProfile(currentUser.id, patch);
      const session = setSessionForUser(user, { provider: 'mock', remember: true });
      updateAccountSurfaces();
      return session.user?.profile || null;
    }

    const nextProfile = normalizeProfilePayload({ ...(currentUser?.profile || {}), ...patch }, currentUser);
    const session = setSessionForUser({ ...(currentUser || {}), profile: nextProfile }, { provider: 'mock', remember: true });
    updateAccountSurfaces();
    return session.user?.profile || null;
  };

  const getSession = () => getSessionStore()?.getSession?.() || getSessionStore()?.read?.() || null;
  const getCurrentUser = () => getSessionStore()?.getCurrentUser?.() || getSessionStore()?.getUser?.() || null;
  const isAuthenticated = () => Boolean(getCurrentUser());
  const hasRole = (role) => getSessionStore()?.hasRole?.(role) || false;
  const getAuthContext = () => getSessionStore()?.getAuthContext?.() || Object.freeze({
    authenticated: isAuthenticated(),
    user: getCurrentUser(),
    role: getCurrentUser()?.role || 'guest',
    permissions: [],
    provider: AUTH_PROVIDER_VALUES.supabase,
    accountStatus: getCurrentUser()?.accountStatus || 'active',
    sessionStatus: getCurrentUser() ? 'active' : 'anonymous',
    canAccessAdmin: false,
    isInternal: false,
    isSupport: false
  });
  const onAuthChange = (listener) => getSessionStore()?.subscribe?.(listener) || (() => {});

  const setSessionForUser = (user, options = {}) => {
    const session = buildSession(user, options);
    const store = getSessionStore();
    if (!store?.write) throw new Error('Session Store não foi carregado.');
    return store.write(session);
  };

  const login = async ({ email, login: loginValue, password, remember = true } = {}) => {
    const access = normalizeText(email || loginValue);
    const rawPassword = String(password || '');
    if (!access || !rawPassword) throw new Error('Preencha o acesso e a senha para entrar.');

    if (isSupabaseAuthRequired()) {
      const client = getSupabaseClient();
      if (!client) throw new Error('O Supabase ainda não foi carregado. Recarregue a página e tente novamente.');
      if (!isEmail(access)) throw new Error('Entre usando o e-mail cadastrado.');
      const { data, error } = await client.auth.signInWithPassword({ email: normalizeEmail(access), password: rawPassword });
      if (error) {
        const message = String(error.message || '').toLowerCase();
        if (message.includes('email not confirmed')) throw new Error('Confirme seu e-mail antes de entrar.');
        throw new Error('Credenciais inválidas. Revise seu e-mail e senha.');
      }
      const stored = setSupabaseSession(data.session, remember);
      updateAccountSurfaces();
      return stored.user;
    }
    throw new Error('Autenticação real indisponível. O login local/demo está desativado.');
  };

  const register = async (payload = {}) => {
    const name = normalizeText(payload.name);
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);
    const password = String(payload.password || '');
    const handle = String(payload.handle || '').trim().toLowerCase();
    if (name.length < 3) throw new Error('Informe um nome mais completo.');
    if (!isEmail(email)) throw new Error('Digite um e-mail válido.');
    if (password.length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');

    if (isSupabaseAuthRequired()) {
      const client = getSupabaseClient();
      if (!client) throw new Error('O Supabase ainda não foi carregado. Recarregue a página e tente novamente.');
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { name, handle, ...(phone ? { display_phone: phone } : {}) } }
      });
      if (error) {
        const message = String(error.message || '').toLowerCase();
        if (message.includes('already registered') || message.includes('already been registered')) throw new Error('Já existe uma conta com esse e-mail.');
        throw new Error(error.message || 'Não foi possível criar a conta.');
      }
      if (data.session) {
        const stored = setSupabaseSession(data.session, true);
        updateAccountSurfaces();
        return { ...stored.user, pendingConfirmation: false };
      }
      return { ...publicUserFromSupabase(data.user), pendingConfirmation: true };
    }
    throw new Error('Cadastro real indisponível. O cadastro local/demo está desativado.');
  };


  const logout = async ({ redirect = false, redirectTo } = {}) => {
    const client = getSupabaseClient();
    if (client) {
      try { await client.auth.signOut(); } catch (error) { console.warn?.('[DokeAuth] Supabase logout failed.', error); }
    }
    getSessionStore()?.clear?.();
    try {
      root.localStorage.removeItem('doke.auth.users.v1');
      root.localStorage.removeItem('doke.auth.userProfiles.v1');
    } catch {}
    if (redirect) root.location.assign(redirectTo || resolveUrlForCurrentPage(DEFAULT_LOGIN_URL));
    return true;
  };

  const signOut = logout;
  const signIn = (payload) => login(payload);

  const getCurrentPathForNext = () => {
    const path = root.location.pathname.split('/').pop() || 'index.html';
    return `${path}${root.location.search || ''}${root.location.hash || ''}`;
  };

  function resolveUrlForCurrentPage(target) {
    const value = String(target || '').trim();
    if (!value) return '';
    if (/^(https?:)?\/\//.test(value) || value.startsWith('mailto:') || value.startsWith('#')) return value;

    const inAuthFolder = root.location.pathname.includes('/auth/');
    if (!inAuthFolder) return value;

    if (value.startsWith('auth/')) return value.replace(/^auth\//, '');
    if (value === 'index.html' || value.startsWith('index.html?')) return `../${value}`;
    if (!value.startsWith('../') && !value.startsWith('./')) return `../${value}`;
    return value;
  }

  const appendNext = (loginUrl, next) => {
    const target = resolveUrlForCurrentPage(loginUrl || DEFAULT_LOGIN_URL);
    const nextValue = next || getCurrentPathForNext();
    const joiner = target.includes('?') ? '&' : '?';
    return `${target}${joiner}next=${encodeURIComponent(nextValue)}`;
  };

  const requireAuth = ({ enforce = false, redirectToLogin = DEFAULT_LOGIN_URL, next } = {}) => {
    const authenticated = isAuthenticated();
    document.documentElement.dataset.authenticated = String(authenticated);

    if (!authenticated && enforce) {
      root.location.assign(appendNext(redirectToLogin, next));
    }

    return authenticated;
  };

  const redirectIfAuthenticated = ({ enforce = false, redirectToApp = DEFAULT_APP_URL } = {}) => {
    const authenticated = isAuthenticated();

    if (authenticated && enforce) {
      root.location.assign(resolveUrlForCurrentPage(redirectToApp));
    }

    return authenticated;
  };

  const getNextUrl = (fallback = DEFAULT_APP_URL) => {
    const params = new URLSearchParams(root.location.search);
    const next = params.get('next');
    if (!next) return resolveUrlForCurrentPage(fallback);

    const clean = next.replace(/^\/+/, '');
    if (/^(https?:)?\/\//.test(clean)) return resolveUrlForCurrentPage(fallback);
    return resolveUrlForCurrentPage(clean);
  };

  const getFirstName = (name) => normalizeText(name).split(/\s+/).filter(Boolean)[0] || name || 'Conta';
  const getRoleLabel = (user) => {
    if (user?.role === 'professional') return 'Profissional';
    if (user?.role === 'client') return 'Cliente';
    if (user?.role === 'support') return 'Suporte';
    if (user?.role === 'admin') return 'Admin';
    if (user?.role === 'moderator') return 'Moderação';
    return 'Conta';
  };

  const updateAccountSurfaces = () => {
    const user = getCurrentUser();
    const authenticated = Boolean(user);
    const displayName = authenticated ? getFirstName(user.name || user.email || 'Conta Doke') : 'Entrar';
    const initials = authenticated ? user?.initials || user?.avatarInitials || 'DK' : 'DK';
    const avatarUrl = authenticated ? user?.profile?.avatarUrl || user?.avatarUrl || user?.avatar || '' : '';
    const roleLabel = authenticated ? getRoleLabel(user) : 'Conta';

    document.documentElement.dataset.authenticated = String(authenticated);
    document.documentElement.dataset.authRole = user?.role || 'guest';

    document.querySelectorAll('.home-side-meta__profile-wrap').forEach((element) => {
      element.hidden = false;
      element.dataset.authenticated = String(authenticated);
    });

    document.querySelectorAll('.home-side-meta__profile').forEach((element) => {
      element.hidden = false;
      element.setAttribute('aria-label', authenticated ? 'Abrir menu da conta' : 'Entrar na Doke');
      element.dataset.authenticated = String(authenticated);
    });

    document.querySelectorAll('.home-side-meta__avatar.doke-avatar, .sidebar__avatar, [data-user-avatar]').forEach((element) => {
      element.replaceChildren();
      if (avatarUrl) {
        const image = document.createElement('img');
        image.src = avatarUrl;
        image.alt = '';
        element.appendChild(image);
      } else {
        element.textContent = initials;
      }
    });

    document.querySelectorAll('.home-side-meta__identity strong, [data-user-name]').forEach((element) => {
      element.textContent = displayName;
    });

    document.querySelectorAll('.home-side-meta__identity span, [data-user-role]').forEach((element) => {
      element.textContent = roleLabel;
    });

    document.querySelectorAll('.profile-dropdown__header').forEach((element) => {
      if (authenticated && user?.handle) element.textContent = `@${user.handle}`;
      else if (authenticated) element.textContent = user?.email || 'Conta Doke';
      else element.textContent = 'Conta Doke';
    });

    document.querySelectorAll('[data-authenticated-only]').forEach((element) => {
      element.hidden = !authenticated;
    });

    document.querySelectorAll('[data-guest-only]').forEach((element) => {
      element.hidden = authenticated;
    });

    document.dispatchEvent(new CustomEvent('doke:auth-surface-ready', {
      detail: {
        user,
        authenticated
      }
    }));
  };

  const bindLogoutButtons = () => {
    document.querySelectorAll('[data-profile-logout], [data-sidebar-logout], [data-auth-logout]').forEach((button) => {
      if (button.dataset.authLogoutBound === 'true') return;
      button.dataset.authLogoutBound = 'true';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        logout({ redirect: true, redirectTo: appendNext(DEFAULT_LOGIN_URL, getCurrentPathForNext()) });
      });
    });
  };

  const boot = () => {
    updateAccountSurfaces();
    bindLogoutButtons();
    onAuthChange(updateAccountSurfaces);
    document.addEventListener('doke:auth-session-change', updateAccountSurfaces);
    document.addEventListener('doke:route-ready', () => {
      bindLogoutButtons();
      updateAccountSurfaces();
    });
    document.addEventListener('doke:stable-route-ready', () => {
      bindLogoutButtons();
      updateAccountSurfaces();
    });

    if (isSupabaseAuthRequired()) {
      bootstrapSupabaseSessionBridge({ silent: true }).then(() => updateAccountSurfaces());
      document.addEventListener('doke:supabase-client-ready', () => {
        bootstrapSupabaseSessionBridge({ silent: true }).then(() => updateAccountSurfaces());
      });
    }

    root.setTimeout(updateAccountSurfaces, 0);
    root.setTimeout(updateAccountSurfaces, 120);
    root.setTimeout(updateAccountSurfaces, 420);
  };

  const api = Object.freeze({
    provider: AUTH_PROVIDER_VALUES.supabase,
    authProvider: AUTH_PROVIDER_VALUES.supabase,
    getActiveAuthProvider: () => AUTH_PROVIDER_VALUES.supabase,
    refreshSession,
    refreshSupabaseSession,
    bootstrapSupabaseSessionBridge,
    getAccessToken,
    getCurrentIdentity,
    updateCurrentUser,
    updateCurrentProfile,
    getAuthContext,
    login,
    signIn,
    register,
    logout,
    signOut,
    getSession,
    getCurrentUser,
    isAuthenticated,
    hasRole,
    onAuthChange,
    requireAuth,
    redirectIfAuthenticated,
    getNextUrl,
    isEmail,
    isPhone,
    normalizeEmail,
    normalizePhone
  });

  ns.service = api;

  // Compatibility with the existing auth page controller, which reads window.DokeAuth directly.
  Object.assign(ns, api);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
