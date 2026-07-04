/* Doke Auth Service
   Responsibility: rules for local/mock login, registration, logout and recovery.
   Provider boundary: pages call this service; repository can later switch to backend. */
(function () {
  'use strict';

  const root = window;
  const ns = root.DokeAuth || (root.DokeAuth = {});
  const Doke = root.Doke || (root.Doke = {});

  const RECOVERY_KEY = 'doke.auth.recovery.v1';
  const AUTH_PROVIDER_VALUES = Object.freeze({ mock: 'mock', api: 'api' });
  const AUTH_ENDPOINTS = Object.freeze({
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    session: '/auth/session',
    recovery: '/auth/recovery',
    resetPassword: '/auth/reset-password',
    currentUser: '/users/me',
    currentProfile: '/profiles/me',
    updateCurrentUser: '/users/me',
    updateCurrentProfile: '/profiles/me'
  });
  const DEFAULT_LOGIN_URL = 'auth/login.html';
  const DEFAULT_APP_URL = 'index.html';
  const DELAY_MS = 120;
  const AUTH_IDENTITY_CANARY_KEYS = Object.freeze({
    enabled: 'doke.canary.authIdentity.enabled',
    backup: 'doke.canary.authIdentity.backup.v1',
    authProvider: 'doke.authProvider',
    dataProvider: 'doke.dataProvider',
    apiBaseUrl: 'doke.apiBaseUrl',
    network: 'doke.flag.enableNetworkRequests'
  });
  const CANARY_REQUIRED_ENDPOINTS = Object.freeze({
    login: AUTH_ENDPOINTS.login,
    session: AUTH_ENDPOINTS.session,
    currentUser: AUTH_ENDPOINTS.currentUser,
    currentProfile: AUTH_ENDPOINTS.currentProfile
  });

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

  const readQueryParam = (key) => {
    try {
      return new URLSearchParams(root.location.search || '').get(key);
    } catch {
      return null;
    }
  };

  const readStorage = (key) => {
    try {
      return root.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const normalizeBoolean = (value) => {
    if (value === true || value === 'true' || value === '1' || value === 'on') return true;
    if (value === false || value === 'false' || value === '0' || value === 'off') return false;
    return undefined;
  };

  const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/$/, '');
  const normalizeProviderName = (value) => String(value || '').trim().toLowerCase() === AUTH_PROVIDER_VALUES.api
    ? AUTH_PROVIDER_VALUES.api
    : AUTH_PROVIDER_VALUES.mock;

  const readAuthIdentityCanaryFlag = (windowConfig = {}) => {
    const nestedCanary = windowConfig.canary && typeof windowConfig.canary === 'object'
      ? windowConfig.canary.authIdentity
      : undefined;
    let value = windowConfig.authIdentityCanary;
    if (value === undefined) value = nestedCanary;
    if (value === undefined) value = readStorage(AUTH_IDENTITY_CANARY_KEYS.enabled);
    const queryValue = readQueryParam('dokeAuthIdentityCanary');
    if (queryValue !== null) value = queryValue;
    return normalizeBoolean(value) === true;
  };

  const readDataProviderRequest = (windowConfig = {}) => {
    if (readAuthIdentityCanaryFlag(windowConfig)) return AUTH_PROVIDER_VALUES.mock;
    return normalizeProviderName(readQueryParam('dokeDataProvider') || windowConfig.dataProvider || windowConfig.dataSource || readStorage(AUTH_IDENTITY_CANARY_KEYS.dataProvider) || AUTH_PROVIDER_VALUES.mock);
  };

  const getRuntimeConfig = () => {
    const hasCanaryOverride = readQueryParam('dokeAuthIdentityCanary') !== null || readStorage(AUTH_IDENTITY_CANARY_KEYS.enabled) !== null;
    if (!hasCanaryOverride && Doke.runtimeConfig && typeof Doke.runtimeConfig === 'object') return Doke.runtimeConfig;

    const windowConfig = root.DOKE_RUNTIME_CONFIG && typeof root.DOKE_RUNTIME_CONFIG === 'object'
      ? root.DOKE_RUNTIME_CONFIG
      : {};
    const authIdentityCanary = readAuthIdentityCanaryFlag(windowConfig);
    const authProvider = authIdentityCanary
      ? AUTH_PROVIDER_VALUES.api
      : readQueryParam('dokeAuthProvider') || windowConfig.authProvider || readStorage(AUTH_IDENTITY_CANARY_KEYS.authProvider) || AUTH_PROVIDER_VALUES.mock;
    const apiBaseUrl = readQueryParam('dokeApiBaseUrl') || windowConfig.apiBaseUrl || readStorage(AUTH_IDENTITY_CANARY_KEYS.apiBaseUrl) || '';
    const networkValue = readQueryParam('dokeEnableNetwork') ?? windowConfig.enableNetworkRequests ?? windowConfig.flags?.enableNetworkRequests ?? readStorage(AUTH_IDENTITY_CANARY_KEYS.network);
    const enableNetworkRequests = normalizeBoolean(networkValue) === true;

    return {
      authProvider,
      dataProvider: readDataProviderRequest(windowConfig),
      authIdentityCanary,
      apiBaseUrl: normalizeBaseUrl(apiBaseUrl),
      flags: { enableNetworkRequests }
    };
  };

  const getRuntimeFlags = () => {
    const config = getRuntimeConfig();
    return config.flags && typeof config.flags === 'object' ? config.flags : {};
  };
  const normalizeAuthProvider = (provider) => {
    if (Doke.authDomainContract?.normalizeAuthProvider) return Doke.authDomainContract.normalizeAuthProvider(provider);
    return String(provider || '').trim().toLowerCase() === AUTH_PROVIDER_VALUES.api ? AUTH_PROVIDER_VALUES.api : AUTH_PROVIDER_VALUES.mock;
  };
  const getRequestedAuthProvider = () => normalizeAuthProvider(getRuntimeConfig().authProvider || AUTH_PROVIDER_VALUES.mock);
  const getApiBaseUrl = () => normalizeBaseUrl(getRuntimeConfig().apiBaseUrl || '');
  const isNetworkEnabled = () => getRuntimeFlags().enableNetworkRequests === true;
  const getAuthProviderBlockReason = (provider = getRequestedAuthProvider()) => {
    const normalized = normalizeAuthProvider(provider);
    if (normalized !== AUTH_PROVIDER_VALUES.api) return '';
    if (!getApiBaseUrl()) return 'apiBaseUrl is not configured.';
    if (!isNetworkEnabled()) return 'enableNetworkRequests flag is disabled.';
    if (typeof root.fetch !== 'function') return 'window.fetch is not available.';
    return '';
  };
  const canUseApiAuth = () => getRequestedAuthProvider() === AUTH_PROVIDER_VALUES.api && !getAuthProviderBlockReason(AUTH_PROVIDER_VALUES.api);
  const getAuthProviderStatus = () => {
    const requestedProvider = getRequestedAuthProvider();
    const blockReason = getAuthProviderBlockReason(requestedProvider);
    const apiReady = requestedProvider === AUTH_PROVIDER_VALUES.api && !blockReason;

    return Object.freeze({
      activeProvider: apiReady ? AUTH_PROVIDER_VALUES.api : AUTH_PROVIDER_VALUES.mock,
      requestedProvider,
      implementationStatus: apiReady ? 'api_active' : 'mock_active',
      apiBaseUrlConfigured: Boolean(getApiBaseUrl()),
      networkEnabled: isNetworkEnabled(),
      apiReady,
      blockReason,
      endpoints: AUTH_ENDPOINTS,
      note: apiReady
        ? 'Sprint 12A auth API provider is active. Sprint 25 auth/identity API canary keeps dataProvider mock.'
        : 'Mock auth remains active until apiBaseUrl and enableNetworkRequests are configured.'
    });
  };

  const readCanaryBackup = () => {
    try {
      const raw = readStorage(AUTH_IDENTITY_CANARY_KEYS.backup);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const writeStorageValue = (key, value) => {
    if (value === null || value === undefined) {
      root.localStorage.removeItem(key);
      return;
    }
    root.localStorage.setItem(key, String(value));
  };

  const createCanaryBackup = () => ({
    createdAt: new Date().toISOString(),
    values: {
      [AUTH_IDENTITY_CANARY_KEYS.enabled]: readStorage(AUTH_IDENTITY_CANARY_KEYS.enabled),
      [AUTH_IDENTITY_CANARY_KEYS.authProvider]: readStorage(AUTH_IDENTITY_CANARY_KEYS.authProvider),
      [AUTH_IDENTITY_CANARY_KEYS.dataProvider]: readStorage(AUTH_IDENTITY_CANARY_KEYS.dataProvider),
      [AUTH_IDENTITY_CANARY_KEYS.apiBaseUrl]: readStorage(AUTH_IDENTITY_CANARY_KEYS.apiBaseUrl),
      [AUTH_IDENTITY_CANARY_KEYS.network]: readStorage(AUTH_IDENTITY_CANARY_KEYS.network)
    }
  });

  const restoreCanaryBackup = (backup) => {
    const values = backup?.values || {};
    Object.keys(values).forEach((key) => writeStorageValue(key, values[key]));
    root.localStorage.removeItem(AUTH_IDENTITY_CANARY_KEYS.backup);
  };

  const getAuthIdentityCanaryStatus = () => {
    const config = getRuntimeConfig();
    const providerStatus = getAuthProviderStatus();
    const dataProvider = readDataProviderRequest(config);
    const canaryRequested = config.authIdentityCanary === true || readAuthIdentityCanaryFlag(config);
    const blockers = [];

    if (!canaryRequested) blockers.push('authIdentityCanary is not enabled.');
    if (providerStatus.requestedProvider !== AUTH_PROVIDER_VALUES.api) blockers.push('authProvider is not api.');
    if (dataProvider !== AUTH_PROVIDER_VALUES.mock) blockers.push('dataProvider must remain mock during auth/identity canary.');
    if (!providerStatus.apiBaseUrlConfigured) blockers.push('apiBaseUrl is not configured.');
    if (!providerStatus.networkEnabled) blockers.push('enableNetworkRequests flag is disabled.');
    if (providerStatus.blockReason) blockers.push(providerStatus.blockReason);

    return Object.freeze({
      canaryRequested,
      active: canaryRequested && providerStatus.apiReady && dataProvider === AUTH_PROVIDER_VALUES.mock,
      authProvider: providerStatus.activeProvider,
      requestedAuthProvider: providerStatus.requestedProvider,
      dataProvider,
      apiBaseUrlConfigured: providerStatus.apiBaseUrlConfigured,
      networkEnabled: providerStatus.networkEnabled,
      rollbackAvailable: Boolean(readCanaryBackup()),
      endpoints: CANARY_REQUIRED_ENDPOINTS,
      blockers: Array.from(new Set(blockers.filter(Boolean)))
    });
  };

  const configureAuthIdentityCanary = ({ apiBaseUrl, preservePrevious = true } = {}) => {
    const baseUrl = normalizeBaseUrl(apiBaseUrl || getApiBaseUrl());
    if (!baseUrl) throw new Error('Informe apiBaseUrl para ativar o canary de auth/identity.');

    if (preservePrevious && !readCanaryBackup()) {
      root.localStorage.setItem(AUTH_IDENTITY_CANARY_KEYS.backup, JSON.stringify(createCanaryBackup()));
    }

    writeStorageValue(AUTH_IDENTITY_CANARY_KEYS.enabled, 'true');
    writeStorageValue(AUTH_IDENTITY_CANARY_KEYS.authProvider, AUTH_PROVIDER_VALUES.api);
    writeStorageValue(AUTH_IDENTITY_CANARY_KEYS.dataProvider, AUTH_PROVIDER_VALUES.mock);
    writeStorageValue(AUTH_IDENTITY_CANARY_KEYS.apiBaseUrl, baseUrl);
    writeStorageValue(AUTH_IDENTITY_CANARY_KEYS.network, 'true');

    return getAuthIdentityCanaryStatus();
  };

  const rollbackAuthIdentityCanary = () => {
    const backup = readCanaryBackup();
    if (backup) {
      restoreCanaryBackup(backup);
    } else {
      [
        AUTH_IDENTITY_CANARY_KEYS.enabled,
        AUTH_IDENTITY_CANARY_KEYS.authProvider,
        AUTH_IDENTITY_CANARY_KEYS.dataProvider,
        AUTH_IDENTITY_CANARY_KEYS.apiBaseUrl,
        AUTH_IDENTITY_CANARY_KEYS.network
      ].forEach((key) => root.localStorage.removeItem(key));
    }

    return getAuthIdentityCanaryStatus();
  };

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
      city: source.city || user?.city || '',
      state: source.state || user?.state || '',
      location: source.location || [source.city || user?.city, source.state || user?.state].filter(Boolean).join(', '),
      rating: Number.isFinite(Number(source.rating)) ? Number(source.rating) : Number.isFinite(Number(user?.rating)) ? Number(user.rating) : 0,
      verified: source.verified === true || user?.verified === true,
      metrics: source.metrics && typeof source.metrics === 'object' ? source.metrics : {},
      publicUrl: source.publicUrl || source.publicProfileUrl || '',
      ownerUrl: source.ownerUrl || source.ownerProfileUrl || '',
      updatedAt: source.updatedAt || ''
    };
  };

  const mergeUserWithProfile = (user, profile) => {
    const publicUser = toPublicUser(user);
    const normalizedProfile = normalizeProfilePayload(profile, publicUser);
    if (!publicUser || !normalizedProfile) return publicUser;
    return {
      ...publicUser,
      providerProfileId: publicUser.providerProfileId || normalizedProfile.id || '',
      profileKind: normalizedProfile.type || publicUser.role || publicUser.type || 'client',
      profile: normalizedProfile,
      profiles: Array.isArray(publicUser.profiles) ? publicUser.profiles : [normalizedProfile],
      handle: publicUser.handle || normalizedProfile.handle || '',
      avatarUrl: publicUser.avatarUrl || normalizedProfile.avatarUrl || '',
      avatar: publicUser.avatar || normalizedProfile.avatarUrl || '',
      avatarInitials: publicUser.avatarInitials || normalizedProfile.avatarInitials || '',
      initials: publicUser.initials || normalizedProfile.initials || '',
      city: publicUser.city || normalizedProfile.city || '',
      state: publicUser.state || normalizedProfile.state || '',
      bio: publicUser.bio || normalizedProfile.bio || '',
      coverUrl: publicUser.coverUrl || normalizedProfile.coverUrl || '',
      profession: publicUser.profession || normalizedProfile.profession || normalizedProfile.headline || '',
      publicProfileUrl: publicUser.publicProfileUrl || normalizedProfile.publicUrl || (publicUser.role === 'professional' ? 'perfil.html' : 'perfil-cliente.html'),
      ownerProfileUrl: publicUser.ownerProfileUrl || normalizedProfile.ownerUrl || (publicUser.role === 'professional' ? 'perfil-profissional.html' : 'meu-perfil.html')
    };
  };

  const buildSession = (user, options = {}) => ({
    provider: options.provider || 'mock',
    token: `mock-${Date.now()}`,
    remember: options.remember !== false,
    user: toPublicUser(user),
    sessionStatus: options.sessionStatus || 'active',
    expiresAt: options.expiresAt || '',
    issuedAt: new Date().toISOString()
  });

  const getSessionToken = () => {
    const session = getSessionStore()?.getSession?.() || getSessionStore()?.read?.() || null;
    return session?.token || '';
  };

  const normalizeApiErrorMessage = (payload, fallback) => {
    const message = payload?.message || payload?.error?.message || payload?.error || fallback || 'Não foi possível concluir a autenticação.';
    return String(message || '').trim();
  };

  const apiRequest = async (method, path, body) => {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) throw new Error('Auth API blocked: apiBaseUrl is not configured.');
    if (!isNetworkEnabled()) throw new Error('Auth API blocked: enableNetworkRequests flag is disabled.');
    if (typeof root.fetch !== 'function') throw new Error('Auth API requires window.fetch.');

    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
    const token = getSessionToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const options = {
      method,
      credentials: 'include',
      headers
    };

    if (body !== undefined) options.body = JSON.stringify(body);

    const response = await root.fetch(`${baseUrl}${path}`, options);
    const contentType = response.headers?.get?.('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json().catch(() => null) : null;

    if (!response.ok) {
      throw new Error(normalizeApiErrorMessage(payload, `Auth API request failed: ${response.status}`));
    }

    return payload;
  };

  const normalizeApiSessionPayload = (payload, options = {}) => {
    const source = payload?.session || payload || {};
    const user = source.user || payload?.user || payload?.currentUser || null;
    if (!user) return null;

    const profilePayload = source.profile || payload?.profile || payload?.currentProfile || user.profile || null;
    const publicUser = profilePayload ? mergeUserWithProfile(user, profilePayload) : toPublicUser(user);

    return {
      provider: AUTH_PROVIDER_VALUES.api,
      token: source.token || source.accessToken || source.access_token || payload?.token || '',
      refreshToken: source.refreshToken || source.refresh_token || payload?.refreshToken || '',
      remember: options.remember !== false,
      user: publicUser,
      accountStatus: source.accountStatus || user.accountStatus || user.status || 'active',
      sessionStatus: source.sessionStatus || source.status || 'active',
      expiresAt: source.expiresAt || source.expires_at || payload?.expiresAt || '',
      issuedAt: source.issuedAt || source.createdAt || new Date().toISOString()
    };
  };

  const setSessionFromApiPayload = (payload, options = {}) => {
    const session = normalizeApiSessionPayload(payload, options);
    if (!session) return null;
    const store = getSessionStore();
    if (!store?.write) throw new Error('Session Store não foi carregado.');
    return store.write(session);
  };


  const applyCurrentIdentity = (userPayload, profilePayload) => {
    const currentSession = getSession();
    const currentUser = currentSession?.user || null;
    const nextUser = mergeUserWithProfile(userPayload || currentUser, profilePayload || userPayload?.profile || currentUser?.profile);
    if (!nextUser) return currentSession;

    const store = getSessionStore();
    if (!store?.write) throw new Error('Session Store não foi carregado.');
    return store.write({
      ...(currentSession || {}),
      provider: currentSession?.provider || AUTH_PROVIDER_VALUES.api,
      token: currentSession?.token || '',
      refreshToken: currentSession?.refreshToken || '',
      remember: currentSession?.remember !== false,
      accountStatus: currentSession?.accountStatus || nextUser.accountStatus || 'active',
      sessionStatus: currentSession?.sessionStatus || 'active',
      expiresAt: currentSession?.expiresAt || '',
      user: nextUser
    });
  };

  const fetchApiCurrentIdentity = async ({ silent = false } = {}) => {
    if (!canUseApiAuth()) return getSession();
    try {
      const [userPayload, profilePayload] = await Promise.all([
        apiRequest('GET', AUTH_ENDPOINTS.currentUser),
        apiRequest('GET', AUTH_ENDPOINTS.currentProfile).catch((error) => {
          if (!silent) throw error;
          return null;
        })
      ]);
      return applyCurrentIdentity(userPayload?.user || userPayload?.currentUser || userPayload, profilePayload?.profile || profilePayload?.currentProfile || profilePayload);
    } catch (error) {
      if (!silent) throw error;
      return getSession();
    }
  };

  const apiLogin = async ({ login: loginValue, email, password, remember = true } = {}) => {
    const access = normalizeText(email || loginValue);
    const rawPassword = String(password || '');
    const payload = await apiRequest('POST', AUTH_ENDPOINTS.login, {
      login: access,
      email: isEmail(access) ? normalizeEmail(access) : undefined,
      phone: isPhone(access) ? normalizePhone(access) : undefined,
      password: rawPassword,
      remember
    });
    const session = setSessionFromApiPayload(payload, { remember });
    if (!session?.user) throw new Error('Auth API não retornou usuário de sessão.');
    const identitySession = await fetchApiCurrentIdentity({ silent: true });
    return identitySession?.user || session.user;
  };

  const apiRegister = async (payload = {}) => {
    const response = await apiRequest('POST', AUTH_ENDPOINTS.register, {
      name: normalizeText(payload.name),
      email: normalizeEmail(payload.email),
      phone: normalizePhone(payload.phone),
      password: String(payload.password || ''),
      role: payload.role === 'professional' ? 'professional' : 'client'
    });
    const session = setSessionFromApiPayload(response, { remember: true });
    const identitySession = await fetchApiCurrentIdentity({ silent: true });
    const user = identitySession?.user || session?.user || toPublicUser(response?.user);
    if (!user) throw new Error('Auth API não retornou usuário cadastrado.');
    return {
      ...user,
      pendingConfirmation: response?.pendingConfirmation === true || response?.requiresEmailConfirmation === true
    };
  };

  const refreshApiSession = async ({ silent = false } = {}) => {
    if (!canUseApiAuth()) return getSession();
    try {
      const payload = await apiRequest('GET', AUTH_ENDPOINTS.session);
      const session = setSessionFromApiPayload(payload, { remember: true });
      return await fetchApiCurrentIdentity({ silent: true }) || session;
    } catch (error) {
      if (!silent) throw error;
      return getSession();
    }
  };

  const getCurrentIdentity = () => {
    const session = getSession();
    const user = session?.user || null;
    return Object.freeze({
      user,
      profile: user?.profile || null,
      profiles: user?.profiles || [],
      publicProfileUrl: user?.publicProfileUrl || user?.profile?.publicUrl || '',
      ownerProfileUrl: user?.ownerProfileUrl || user?.profile?.ownerUrl || '',
      provider: session?.provider || 'mock'
    });
  };

  const updateCurrentUser = async (patch = {}) => {
    await delay(60);
    if (canUseApiAuth()) {
      const payload = await apiRequest('PATCH', AUTH_ENDPOINTS.updateCurrentUser, patch);
      const session = applyCurrentIdentity(payload?.user || payload?.currentUser || payload, payload?.profile || payload?.currentProfile);
      updateAccountSurfaces();
      return session?.user || null;
    }

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
    if (canUseApiAuth()) {
      const payload = await apiRequest('PATCH', AUTH_ENDPOINTS.updateCurrentProfile, patch);
      const session = applyCurrentIdentity(payload?.user || payload?.currentUser || getCurrentUser(), payload?.profile || payload?.currentProfile || payload);
      updateAccountSurfaces();
      return session?.user?.profile || null;
    }

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
    provider: 'mock',
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
    await delay();

    const access = normalizeText(email || loginValue);
    const rawPassword = String(password || '');

    if (!access || !rawPassword) {
      throw new Error('Preencha o acesso e a senha para entrar.');
    }

    if (canUseApiAuth()) {
      const user = await apiLogin({ login: access, password: rawPassword, remember });
      updateAccountSurfaces();
      return user;
    }

    const repo = getUsersRepository();
    if (!repo) throw new Error('Users Repository não foi carregado.');

    const user = await repo.findByLogin(access);
    const passwordHash = await repo.hashPassword(rawPassword);

    if (!user || user.passwordHash !== passwordHash) {
      throw new Error('Credenciais inválidas. Revise os dados e tente novamente.');
    }

    const session = setSessionForUser(user, { remember });
    updateAccountSurfaces();
    return session.user;
  };

  const register = async (payload = {}) => {
    await delay();

    const role = payload.role === 'professional' ? 'professional' : 'client';

    if (canUseApiAuth()) {
      const user = await apiRegister({ ...payload, role });
      updateAccountSurfaces();
      return user;
    }

    const repo = getUsersRepository();
    if (!repo) throw new Error('Users Repository não foi carregado.');

    const user = await repo.create({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
      role
    });

    const session = setSessionForUser(user, { remember: true });
    updateAccountSurfaces();
    return {
      ...session.user,
      pendingConfirmation: false
    };
  };

  const logout = async ({ redirect = false, redirectTo } = {}) => {
    await delay(60);
    const session = getSession();

    if (session?.provider === AUTH_PROVIDER_VALUES.api && canUseApiAuth()) {
      try {
        await apiRequest('POST', AUTH_ENDPOINTS.logout, { refreshToken: session.refreshToken || '' });
      } catch (error) {
        console.warn?.('[DokeAuth] API logout failed; clearing local session.', error);
      }
    }

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

    const recoveryMethod = method === 'phone' ? 'phone' : 'email';
    const access = normalizeText(contact);

    if (recoveryMethod === 'email' && !isEmail(access)) {
      throw new Error('Digite um e-mail válido para recuperar o acesso.');
    }

    if (recoveryMethod === 'phone' && !isPhone(access)) {
      throw new Error('Digite um telefone válido com DDD.');
    }

    if (canUseApiAuth()) {
      const payload = await apiRequest('POST', AUTH_ENDPOINTS.recovery, {
        method: recoveryMethod,
        contact: recoveryMethod === 'email' ? normalizeEmail(access) : normalizePhone(access)
      });
      return {
        method: payload?.method || recoveryMethod,
        maskedContact: payload?.maskedContact || payload?.masked_contact || access,
        debugCode: payload?.debugCode
      };
    }

    const repo = getUsersRepository();
    if (!repo) throw new Error('Users Repository não foi carregado.');

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

    const recoveryMethod = method === 'phone' ? 'phone' : 'email';
    const normalizedContact = recoveryMethod === 'email' ? normalizeEmail(contact) : normalizePhone(contact);
    const normalizedCode = normalizeText(code);
    const nextPasswordValue = String(nextPassword || '');

    if (nextPasswordValue.length < 8) {
      throw new Error('A nova senha precisa ter pelo menos 8 caracteres.');
    }

    if (canUseApiAuth()) {
      const payload = await apiRequest('POST', AUTH_ENDPOINTS.resetPassword, {
        method: recoveryMethod,
        contact: normalizedContact,
        code: normalizedCode,
        nextPassword: nextPasswordValue
      });
      return toPublicUser(payload?.user || payload?.currentUser || payload);
    }

    const repo = getUsersRepository();
    if (!repo) throw new Error('Users Repository não foi carregado.');

    const recovery = readJson(RECOVERY_KEY, null);
    if (!recovery) throw new Error('Solicite um código antes de redefinir a senha.');

    if (recovery.method !== recoveryMethod || recovery.contact !== normalizedContact || recovery.code !== normalizedCode) {
      throw new Error('Código ou contato inválidos.');
    }

    if (Date.now() > recovery.expiresAt) {
      writeJson(RECOVERY_KEY, null);
      throw new Error('O código expirou. Solicite outro.');
    }

    const user = await repo.updatePassword(recovery.userId, nextPasswordValue);
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
      element.textContent = initials;
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

    if (canUseApiAuth()) {
      refreshApiSession({ silent: true }).then(() => updateAccountSurfaces());
    }

    root.setTimeout(updateAccountSurfaces, 0);
    root.setTimeout(updateAccountSurfaces, 120);
    root.setTimeout(updateAccountSurfaces, 420);
  };

  const api = Object.freeze({
    provider: 'mock',
    authProvider: 'mock',
    getActiveAuthProvider: () => getAuthProviderStatus().activeProvider,
    getAuthProviderStatus,
    getAuthIdentityCanaryStatus,
    configureAuthIdentityCanary,
    rollbackAuthIdentityCanary,
    refreshSession: refreshApiSession,
    refreshApiSession,
    refreshCurrentIdentity: fetchApiCurrentIdentity,
    getCurrentIdentity,
    updateCurrentUser,
    updateCurrentProfile,
    getAuthContext,
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
