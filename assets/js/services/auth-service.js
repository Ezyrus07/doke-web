/* Doke Auth Service
   Responsibility: one facade for login/logout/session across providers.
   Current provider: mock. Future providers: Supabase/Firebase without changing pages. */
(function () {
  const ns = (window.DokeAuth = window.DokeAuth || {});

  const DEFAULT_USER = Object.freeze({
    id: 'mock-user-doke',
    name: 'Gabriel',
    initials: 'DK',
    role: 'student-founder',
    email: 'gabriel@doke.local'
  });

  const config = {
    provider: 'mock',
    loginRedirect: '../index.html',
    logoutRedirect: 'auth/login.html'
  };

  const delay = (ms = 180) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

  const createMockSession = ({ email, name } = {}) => ({
    provider: 'mock',
    token: `mock-${Date.now()}`,
    user: {
      ...DEFAULT_USER,
      email: normalizeEmail(email) || DEFAULT_USER.email,
      name: String(name || DEFAULT_USER.name).trim() || DEFAULT_USER.name
    }
  });

  const getSession = () => ns.session?.read() || null;
  const getCurrentUser = () => ns.session?.getUser() || null;
  const isAuthenticated = () => ns.session?.isAuthenticated() || false;

  const login = async ({ email, password, name, remember = true } = {}) => {
    if (config.provider !== 'mock') {
      throw new Error(`Auth provider "${config.provider}" ainda não foi conectado.`);
    }

    await delay();

    if (!normalizeEmail(email)) {
      throw new Error('Informe um e-mail válido.');
    }

    if (typeof password === 'string' && password.length > 0 && password.length < 4) {
      throw new Error('A senha precisa ter pelo menos 4 caracteres no modo mock.');
    }

    const session = createMockSession({ email, name });
    ns.session.write({
      ...session,
      remember
    });

    return session;
  };

  const logout = async () => {
    await delay(80);
    ns.session.clear();
    return true;
  };

  const onAuthChange = (listener) => ns.session.subscribe(listener);

  const redirectTo = (target) => {
    if (!target) return;
    window.location.assign(target);
  };

  const requireAuth = ({ enforce = false, redirectToLogin = config.logoutRedirect } = {}) => {
    const authenticated = isAuthenticated();

    document.documentElement.dataset.authenticated = String(authenticated);

    if (!authenticated && enforce) {
      redirectTo(redirectToLogin);
    }

    return authenticated;
  };

  const redirectIfAuthenticated = ({ enforce = false, redirectToApp = config.loginRedirect } = {}) => {
    const authenticated = isAuthenticated();

    if (authenticated && enforce) {
      redirectTo(redirectToApp);
    }

    return authenticated;
  };

  const setProvider = (provider) => {
    config.provider = provider || 'mock';
  };

  ns.service = Object.freeze({
    config,
    setProvider,
    login,
    logout,
    getSession,
    getCurrentUser,
    isAuthenticated,
    onAuthChange,
    requireAuth,
    redirectIfAuthenticated
  });
})();
