/* Doke Session Snapshot Store
   Responsibility: persist and broadcast sanitized public identity/session state.
   Authentication secrets remain under the active provider authority and never enter this snapshot. */
(function () {
  'use strict';

  const root = window;
  const Doke = root.Doke || (root.Doke = {});
  const ns = root.DokeAuth || (root.DokeAuth = {});

  const STORAGE_KEY = 'doke.auth.session.v1';
  const LEGACY_KEYS = Object.freeze(['doke.auth.session.v2', 'doke.auth.session']);
  const SENSITIVE_SESSION_KEYS = Object.freeze(['token', 'accessToken', 'access_token', 'refreshToken', 'refresh_token']);
  const ACCOUNT_STORAGE_VERSION = '20260804-ux-priv-001-v1';
  const listeners = new Set();
  let accountStorageTask = null;
  let activeAccountId = '';

  const resolveAccountStorageSrc = () => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const owner = document.currentScript || scripts.find((script) => /\/assets\/js\/core\/session\.js(?:\?|$)/i.test(script.src));
    try {
      return new URL(`account-storage.js?v=${ACCOUNT_STORAGE_VERSION}`, owner?.src || root.location.href).href;
    } catch {
      return `assets/js/core/account-storage.js?v=${ACCOUNT_STORAGE_VERSION}`;
    }
  };

  const getAccountStorage = () => Doke.accountStorage || null;

  const ensureAccountStorage = () => {
    const available = getAccountStorage();
    if (available) return Promise.resolve(available);
    if (accountStorageTask) return accountStorageTask;

    accountStorageTask = new Promise((resolve, reject) => {
      const finish = () => {
        const authority = getAccountStorage();
        if (authority) resolve(authority);
        else reject(new Error('account-storage-unavailable'));
      };

      let script = document.querySelector('script[data-doke-account-storage]');
      const isNewScript = !script;
      if (!script) {
        script = document.createElement('script');
        script.src = resolveAccountStorageSrc();
        script.async = false;
        script.dataset.dokeAccountStorage = 'true';
      }

      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', () => reject(new Error('account-storage-load-failed')), { once: true });
      if (isNewScript) document.head.append(script);
      if (getAccountStorage()) finish();
    }).catch((error) => {
      accountStorageTask = null;
      throw error;
    });

    return accountStorageTask;
  };

  const sessionAccountId = (session) => String(session?.user?.id || session?.user?.userId || session?.user?.uid || '').trim();

  const coordinateAccountStorage = (previousAccountId, nextAccountId, reason = 'session-change') => {
    if (previousAccountId === nextAccountId) return;
    ensureAccountStorage()
      .then((storage) => storage.handleAccountTransition({ previousAccountId, nextAccountId, reason }))
      .catch((error) => console.warn('[DokeSession] Account storage cleanup unavailable.', error));
  };

  const safeParse = (value) => {
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  };

  const nowIso = () => new Date().toISOString();

  const normalizeSessionProvider = (provider) => {
    const value = String(provider || '').trim().toLowerCase();
    if (value === 'supabase') return 'supabase';
    if (Doke.authDomainContract?.normalizeAuthProvider) return Doke.authDomainContract.normalizeAuthProvider(value);
    return value === 'api' ? 'api' : 'mock';
  };

  const normalizeRole = (role) => {
    if (Doke.authDomainContract?.normalizeRole) return Doke.authDomainContract.normalizeRole(role);
    const value = String(role || '').trim().toLowerCase();
    if (value === 'pro' || value === 'worker') return 'professional';
    if (value === 'user' || value === 'customer') return 'client';
    if (['client', 'professional', 'moderator', 'support', 'admin'].includes(value)) return value;
    return 'guest';
  };

  const normalizeAccountStatus = (status) => {
    if (Doke.authDomainContract?.normalizeAccountStatus) return Doke.authDomainContract.normalizeAccountStatus(status);
    const value = String(status || '').trim().toLowerCase();
    return ['active', 'pending_review', 'pending_email', 'suspended', 'disabled'].includes(value) ? value : 'active';
  };

  const getInitials = (name) => {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (!parts.length) return 'DK';
    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  };

  const normalizeProfile = (profile, user) => {
    if (!profile || typeof profile !== 'object') return null;
    const baseName = user?.name || profile.name || profile.displayName || 'Perfil Doke';
    const role = normalizeRole(profile.role || profile.type || user?.role || user?.type);
    return {
      id: profile.id || profile.profileId || profile.providerProfileId || user?.providerProfileId || user?.id || '',
      userId: profile.userId || profile.ownerId || user?.id || '',
      role,
      type: profile.type || role,
      name: String(profile.name || profile.displayName || baseName).trim(),
      handle: profile.handle || user?.handle || '',
      avatar: profile.avatar || profile.avatarUrl || user?.avatar || user?.avatarUrl || '',
      avatarUrl: profile.avatarUrl || profile.avatar || user?.avatarUrl || user?.avatar || '',
      avatarInitials: profile.avatarInitials || profile.initials || user?.avatarInitials || user?.initials || getInitials(baseName),
      initials: profile.initials || profile.avatarInitials || user?.initials || user?.avatarInitials || getInitials(baseName),
      coverUrl: profile.coverUrl || profile.cover || user?.coverUrl || '',
      headline: profile.headline || profile.profession || user?.profession || '',
      bio: profile.bio || user?.bio || '',
      interests: Array.isArray(profile.interests) ? profile.interests.slice(0, 8) : Array.isArray(user?.interests) ? user.interests.slice(0, 8) : [],
      city: profile.city || user?.city || '',
      state: profile.state || user?.state || '',
      location: profile.location || [profile.city || user?.city, profile.state || user?.state].filter(Boolean).join(', '),
      rating: Number.isFinite(Number(profile.rating)) ? Number(profile.rating) : Number.isFinite(Number(user?.rating)) ? Number(user.rating) : 0,
      verified: profile.verified === true || user?.verified === true,
      metrics: profile.metrics && typeof profile.metrics === 'object' ? profile.metrics : {},
      publicUrl: profile.publicUrl || profile.publicProfileUrl || '',
      ownerUrl: profile.ownerUrl || profile.ownerProfileUrl || '',
      createdAt: profile.createdAt || user?.createdAt || '',
      updatedAt: profile.updatedAt || ''
    };
  };

  const normalizeUser = (user) => {
    if (!user || typeof user !== 'object') return null;
    const role = normalizeRole(user.role || user.type);
    const name = String(user.name || user.displayName || user.email || 'Usuário Doke').trim();

    const sourceProfile = user.profile || user.activeProfile || user.publicProfile || user.professionalProfile || user.clientProfile || null;
    const profile = normalizeProfile(sourceProfile, { ...user, name, role });

    return {
      id: user.id || `user_${Date.now()}`,
      name,
      displayName: name,
      email: user.email || '',
      phone: user.phone || '',
      role,
      type: user.type || role,
      handle: user.handle || user.username || profile?.handle || '',
      username: user.handle || user.username || profile?.handle || '',
      avatar: profile?.avatarUrl || user.avatarUrl || user.avatar || '',
      avatarUrl: profile?.avatarUrl || user.avatarUrl || user.avatar || '',
      initials: user.initials || user.avatarInitials || profile?.initials || getInitials(name),
      avatarInitials: user.avatarInitials || user.initials || profile?.avatarInitials || getInitials(name),
      city: user.city || profile?.city || '',
      state: user.state || profile?.state || '',
      points: Number.isFinite(Number(user.points)) ? Number(user.points) : 0,
      rating: Number.isFinite(Number(user.rating)) ? Number(user.rating) : profile?.rating || 0,
      verified: Boolean(user.verified || profile?.verified),
      accountStatus: normalizeAccountStatus(user.accountStatus || user.status),
      providerProfileId: user.providerProfileId || user.professionalId || profile?.id || '',
      profileKind: user.profileKind || profile?.type || role,
      profile,
      profiles: Array.isArray(user.profiles)
        ? user.profiles.map((item) => normalizeProfile(item, { ...user, name, role })).filter(Boolean)
        : profile ? [profile] : [],
      publicProfileUrl: user.publicProfileUrl || profile?.publicUrl || (role === 'professional' ? 'perfil.html' : 'perfil-cliente.html'),
      ownerProfileUrl: user.ownerProfileUrl || profile?.ownerUrl || (role === 'professional' ? 'perfil-profissional.html' : 'meu-perfil.html'),
      bio: user.bio || profile?.bio || '',
      coverUrl: profile?.coverUrl || user.coverUrl || '',
      profession: user.profession || profile?.headline || '',
      settings: user.settings && typeof user.settings === 'object' ? user.settings : {},
      onboardingStatus: ['not_started', 'in_progress', 'completed'].includes(user.onboardingStatus) ? user.onboardingStatus : '',
      onboardingCompletedAt: user.onboardingCompletedAt || '',
      createdAt: user.createdAt || '',
      updatedAt: user.updatedAt || '',
      isMockSupport: user.isMockSupport === true,
      mockSupport: user.mockSupport === true
    };
  };

  const normalizeSession = (session) => {
    if (!session || typeof session !== 'object') return null;
    const user = normalizeUser(session.user || session.currentUser || session);
    if (!user) return null;

    return {
      provider: normalizeSessionProvider(session.provider || session.authProvider || 'mock'),
      remember: session.remember !== false,
      user,
      accountStatus: normalizeAccountStatus(session.accountStatus || user.accountStatus),
      sessionStatus: session.sessionStatus || 'active',
      expiresAt: session.expiresAt || '',
      issuedAt: session.issuedAt || session.createdAt || session.creatédAt || nowIso(),
      updatedAt: session.updatedAt || nowIso()
    };
  };

  const readStored = (key) => safeParse(root.localStorage.getItem(key));

  const withoutSensitiveFields = (session) => {
    if (!session || typeof session !== 'object') return session;
    const sanitized = { ...session };
    SENSITIVE_SESSION_KEYS.forEach((key) => delete sanitized[key]);
    return sanitized;
  };

  const readSanitizedFromKey = (key) => {
    const raw = readStored(key);
    const normalized = normalizeSession(raw);
    if (!normalized) return null;
    const sanitized = withoutSensitiveFields(normalized);
    if (JSON.stringify(raw) !== JSON.stringify(sanitized)) {
      root.localStorage.setItem(key, JSON.stringify(sanitized));
    }
    return sanitized;
  };

  const read = () => {
    const primary = readSanitizedFromKey(STORAGE_KEY);
    if (primary) return primary;

    for (const key of LEGACY_KEYS) {
      const migrated = readSanitizedFromKey(key);
      if (migrated) {
        root.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        LEGACY_KEYS.forEach((legacyKey) => root.localStorage.removeItem(legacyKey));
        return migrated;
      }
    }

    return null;
  };

  const syncAppState = (session) => {
    const user = session?.user || null;
    const role = user?.role || 'guest';
    const permissions = Doke.permissions?.permissionsForRole
      ? Doke.permissions.permissionsForRole(role)
      : [];
    const accountStatus = session?.accountStatus || user?.accountStatus || 'active';
    const sessionStatus = user ? session?.sessionStatus || 'active' : 'anonymous';
    const profile = user?.profile || null;
    const canAccessAdmin = Doke.permissions?.canAccessAdmin
      ? Doke.permissions.canAccessAdmin(user)
      : Boolean(user && (role === 'admin' || role === 'support' || user.isMockSupport || user.mockSupport));

    if (Doke.state?.merge) {
      Doke.state.merge('auth', {
        status: user ? 'authenticated' : 'anonymous',
        sessionStatus,
        accountStatus,
        provider: session?.provider || 'mock',
        user,
        profile: profile || user,
        profiles: user?.profiles || [],
        role,
        permissions,
        canAccessAdmin
      });
    }

    document.documentElement.dataset.authenticated = String(Boolean(user));
    document.documentElement.dataset.authRole = role;
    document.documentElement.dataset.authAccountStatus = accountStatus;
    document.documentElement.dataset.authSessionStatus = sessionStatus;
    document.documentElement.dataset.authCanAccessAdmin = String(canAccessAdmin);
  };

  const notify = (session) => {
    const nextAccountId = sessionAccountId(session);
    const previousAccountId = activeAccountId;
    activeAccountId = nextAccountId;
    coordinateAccountStorage(previousAccountId, nextAccountId, 'session-change');

    syncAppState(session);

    listeners.forEach((listener) => {
      try {
        listener(session);
      } catch (error) {
        console.error('[DokeSession]', error);
      }
    });

    document.dispatchEvent(new CustomEvent('doke:auth-session-change', {
      bubbles: true,
      detail: {
        session,
        user: session?.user || null,
        authenticated: Boolean(session?.user)
      }
    }));
  };

  const write = (session) => {
    const normalized = normalizeSession(session);

    if (!normalized) {
      root.localStorage.removeItem(STORAGE_KEY);
      LEGACY_KEYS.forEach((key) => root.localStorage.removeItem(key));
      notify(null);
      return null;
    }

    const nextSession = {
      ...normalized,
      updatedAt: nowIso()
    };

    root.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    notify(nextSession);
    return nextSession;
  };

  const setCurrentUser = (user, meta = {}) => write({
    provider: meta.provider || meta.authProvider || 'mock',
    remember: meta.remember !== false,
    sessionStatus: meta.sessionStatus || 'active',
    expiresAt: meta.expiresAt || '',
    user
  });

  const clear = () => write(null);
  const getSession = () => read();
  const getCurrentUser = () => read()?.user || null;
  const getUser = getCurrentUser;
  const getCurrentProfile = () => {
    const user = getCurrentUser();
    return user?.profile || null;
  };
  const isAuthenticated = () => Boolean(getCurrentUser());
  const hasRole = (role) => {
    const currentRole = getCurrentUser()?.role;
    return Array.isArray(role) ? role.includes(currentRole) : currentRole === role;
  };
  const hasPermission = (permission) => {
    const user = getCurrentUser();
    return Doke.permissions?.has ? Doke.permissions.has(permission, user?.role || 'guest') : false;
  };
  const canAccessAdmin = () => {
    const user = getCurrentUser();
    return Doke.permissions?.canAccessAdmin
      ? Doke.permissions.canAccessAdmin(user)
      : Boolean(user && (user.role === 'admin' || user.role === 'support' || user.isMockSupport || user.mockSupport));
  };
  const getAuthContext = () => {
    const session = read();
    const user = session?.user || null;
    const role = user?.role || 'guest';
    const permissions = Doke.permissions?.permissionsForRole ? Doke.permissions.permissionsForRole(role) : [];
    const profile = user?.profile || null;
    return Object.freeze({
      authenticated: Boolean(user),
      user,
      profile,
      profiles: user?.profiles || [],
      role,
      permissions,
      provider: session?.provider || 'mock',
      accountStatus: session?.accountStatus || user?.accountStatus || 'active',
      sessionStatus: user ? session?.sessionStatus || 'active' : 'anonymous',
      canAccessAdmin: canAccessAdmin(),
      isInternal: Doke.permissions?.isInternalRole ? Doke.permissions.isInternalRole(role) : ['moderator', 'support', 'admin'].includes(role),
      isSupport: Doke.permissions?.isSupportRole ? Doke.permissions.isSupportRole(role) : ['support', 'admin'].includes(role),
      publicProfileUrl: user?.publicProfileUrl || profile?.publicUrl || '',
      ownerProfileUrl: user?.ownerProfileUrl || profile?.ownerUrl || ''
    });
  };
  const bootstrap = () => {
    const session = read();
    notify(session);
    return session;
  };

  const subscribe = (listener) => {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  root.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && !LEGACY_KEYS.includes(event.key)) return;
    notify(read());
  });

  const api = Object.freeze({
    STORAGE_KEY,
    LEGACY_KEYS,
    SENSITIVE_SESSION_KEYS,
    read,
    write,
    clear,
    getSession,
    getCurrentUser,
    getUser,
    getCurrentProfile,
    bootstrap,
    setCurrentUser,
    isAuthenticated,
    hasRole,
    hasPermission,
    canAccessAdmin,
    getAuthContext,
    subscribe,
    normalizeUser,
    normalizeProfile,
    normalizeSession,
    normalizeSessionProvider,
    ensureAccountStorage
  });

  ns.session = api;
  ns.SessionStore = api;
  Doke.session = api;

  const initialSession = read();
  activeAccountId = sessionAccountId(initialSession);
  syncAppState(initialSession);
  ensureAccountStorage()
    .then((storage) => storage.bootstrap({ currentAccountId: activeAccountId }))
    .catch((error) => console.warn('[DokeSession] Account storage authority will retry on demand.', error));
})();