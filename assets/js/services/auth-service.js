/* Doke Auth Service
   Responsibility: rules for local/mock login, registration, logout and recovery.
   Provider boundary: pages call this service; repository can later switch to backend. */
(function () {
  'use strict';

  const root = window;
  const ns = root.DokeAuth || (root.DokeAuth = {});
  const Doke = root.Doke || (root.Doke = {});

  const RECOVERY_KEY = 'doke.auth.recovery.v1';
  const DEFAULT_LOGIN_URL = 'auth/login.html';
  const DEFAULT_APP_URL = 'index.html';
  const DELAY_MS = 120;

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

  const readJson = (key, fallback) => {
    try {
      const raw = root.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const writeJson = (key, value) => {
    if (!value) {
      root.localStorage.removeItem(key);
      return;
    }
    root.localStorage.setItem(key, JSON.stringify(value));
  };

  const toPublicUser = (user) => {
    const repo = getUsersRepository();
    if (repo?.toPublicUser) return repo.toPublicUser(user);
    if (!user) return null;
    const { password, passwordHash, ...publicUser } = user;
    return publicUser;
  };

  const buildSession = (user, options = {}) => ({
    provider: 'mock',
    token: `mock-${Date.now()}`,
    remember: options.remember !== false,
    user: toPublicUser(user),
    issuedAt: new Date().toISOString()
  });

  const getSession = () => getSessionStore()?.getSession?.() || getSessionStore()?.read?.() || null;
  const getCurrentUser = () => getSessionStore()?.getCurrentUser?.() || getSessionStore()?.getUser?.() || null;
  const isAuthenticated = () => Boolean(getCurrentUser());
  const hasRole = (role) => getSessionStore()?.hasRole?.(role) || false;
  const onAuthChange = (listener) => getSessionStore()?.subscribe?.(listener) || (() => {});

  const setSessionForUser = (user, options = {}) => {
    const session = buildSession(user, options);
    const store = getSessionStore();
    if (!store?.write) throw new Error('Session Store não foi carregado.');
    return store.write(session);
  };

  const login = async ({ email, login: loginValue, password, remember = true } = {}) => {
    await delay();

    const repo = getUsersRepository();
    if (!repo) throw new Error('Users Repository não foi carregado.');

    const access = normalizeText(email || loginValue);
    const rawPassword = String(password || '');

    if (!access || !rawPassword) {
      throw new Error('Preencha o acesso e a senha para entrar.');
    }

    const user = await repo.findByLogin(access);
    const passwordHash = await repo.hashPassword(rawPassword);

    if (!user || user.passwordHash !== passwordHash) {
      throw new Error('Credenciais inválidas. Revise os dados e tente novamente.');
    }

    const session = setSessionForUser(user, { remember });
    return session.user;
  };

  const register = async (payload = {}) => {
    await delay();

    const repo = getUsersRepository();
    if (!repo) throw new Error('Users Repository não foi carregado.');

    const role = payload.role === 'professional' ? 'professional' : 'client';
    const user = await repo.create({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
      role
    });

    const session = setSessionForUser(user, { remember: true });
    return {
      ...session.user,
      pendingConfirmation: false
    };
  };

  const logout = async ({ redirect = false, redirectTo } = {}) => {
    await delay(60);
    getSessionStore()?.clear?.();

    if (redirect) {
      root.location.assign(redirectTo || resolveUrlForCurrentPage(DEFAULT_LOGIN_URL));
    }

    return true;
  };

  const signOut = logout;
  const signIn = (payload) => login(payload);

  const maskEmail = (value) => {
    const [local, domain] = normalizeEmail(value).split('@');
    if (!local || !domain) return value;
    return `${local.slice(0, 2)}***@${domain}`;
  };

  const maskPhone = (value) => {
    const digits = normalizePhone(value);
    if (!digits) return value;
    return `(${digits.slice(0, 2)}) *****-${digits.slice(-4)}`;
  };

  const generateRecoveryCode = () => String(Math.floor(100000 + Math.random() * 900000));

  const requestRecovery = async ({ method = 'email', contact } = {}) => {
    await delay();

    const repo = getUsersRepository();
    if (!repo) throw new Error('Users Repository não foi carregado.');

    const recoveryMethod = method === 'phone' ? 'phone' : 'email';
    const access = normalizeText(contact);

    if (recoveryMethod === 'email' && !isEmail(access)) {
      throw new Error('Digite um e-mail válido para recuperar o acesso.');
    }

    if (recoveryMethod === 'phone' && !isPhone(access)) {
      throw new Error('Digite um telefone válido com DDD.');
    }

    const user = await repo.findByLogin(access);
    if (!user) throw new Error('Não encontramos uma conta com esse dado.');

    const code = generateRecoveryCode();
    const recovery = {
      userId: user.id,
      method: recoveryMethod,
      contact: recoveryMethod === 'email' ? user.email : user.phone,
      code,
      expiresAt: Date.now() + 10 * 60 * 1000
    };

    writeJson(RECOVERY_KEY, recovery);

    return {
      method: recoveryMethod,
      maskedContact: recoveryMethod === 'email' ? maskEmail(user.email) : maskPhone(user.phone),
      debugCode: code
    };
  };

  const resetPassword = async ({ method = 'email', contact, code, nextPassword } = {}) => {
    await delay();

    const repo = getUsersRepository();
    if (!repo) throw new Error('Users Repository não foi carregado.');

    const recovery = readJson(RECOVERY_KEY, null);
    if (!recovery) throw new Error('Solicite um código antes de redefinir a senha.');

    const recoveryMethod = method === 'phone' ? 'phone' : 'email';
    const normalizedContact = recoveryMethod === 'email' ? normalizeEmail(contact) : normalizePhone(contact);

    if (recovery.method !== recoveryMethod || recovery.contact !== normalizedContact || recovery.code !== normalizeText(code)) {
      throw new Error('Código ou contato inválidos.');
    }

    if (Date.now() > recovery.expiresAt) {
      writeJson(RECOVERY_KEY, null);
      throw new Error('O código expirou. Solicite outro.');
    }

    if (String(nextPassword || '').length < 8) {
      throw new Error('A nova senha precisa ter pelo menos 8 caracteres.');
    }

    const user = await repo.updatePassword(recovery.userId, nextPassword);
    writeJson(RECOVERY_KEY, null);
    return toPublicUser(user);
  };

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

  const updateAccountSurfaces = () => {
    const user = getCurrentUser();
    const name = user?.name || 'Visitante';
    const initials = user?.initials || user?.avatarInitials || 'DK';
    const roleLabel = user?.role === 'professional' ? 'Profissional' : user?.role === 'client' ? 'Cliente' : 'Entrar';
    const pointsLabel = user ? `${roleLabel}${Number.isFinite(Number(user.points)) && Number(user.points) > 0 ? ` · Pontos: ${user.points}` : ''}` : 'Acesse sua conta';

    document.querySelectorAll('.home-side-meta__avatar.doke-avatar, .sidebar__avatar, [data-user-avatar]').forEach((element) => {
      element.textContent = initials;
    });

    document.querySelectorAll('.home-side-meta__identity strong, [data-user-name]').forEach((element) => {
      element.textContent = name;
    });

    document.querySelectorAll('.home-side-meta__identity span, [data-user-role]').forEach((element) => {
      element.textContent = pointsLabel;
    });

    document.querySelectorAll('.profile-dropdown__header').forEach((element) => {
      if (user?.handle) element.textContent = `@${user.handle}`;
      else element.textContent = user?.email || 'Conta Doke';
    });
  };

  const bindLogoutButtons = () => {
    document.querySelectorAll('[data-profile-logout], [data-sidebar-logout], [data-auth-logout]').forEach((button) => {
      if (button.dataset.authLogoutBound === 'true') return;
      button.dataset.authLogoutBound = 'true';
      button.addEventListener('click', () => {
        logout({ redirect: true, redirectTo: appendNext(DEFAULT_LOGIN_URL, getCurrentPathForNext()) });
      });
    });
  };

  const boot = () => {
    updateAccountSurfaces();
    bindLogoutButtons();
    onAuthChange(updateAccountSurfaces);
  };

  const api = Object.freeze({
    provider: 'mock',
    login,
    signIn,
    register,
    logout,
    signOut,
    requestRecovery,
    resetPassword,
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
