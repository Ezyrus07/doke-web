/* Doke Session Store
   Responsibility: persist and broadcast the authenticated user/session.
   Provider-agnostic, currently safe for mock auth and future Supabase/Firebase wiring. */
(function () {
  'use strict';

  const root = window;
  const Doke = root.Doke || (root.Doke = {});
  const ns = root.DokeAuth || (root.DokeAuth = {});

  const STORAGE_KEY = 'doke.auth.session.v1';
  const LEGACY_KEYS = Object.freeze(['doke.auth.session.v2', 'doke.auth.session']);
  const listeners = new Set();

  const safeParse = (value) => {
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  };

  const nowIso = () => new Date().toISOString();

  const normalizeRole = (role) => {
    if (role === 'professional') return 'professional';
    if (role === 'client') return 'client';
    return role || 'guest';
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

  const normalizeUser = (user) => {
    if (!user || typeof user !== 'object') return null;
    const role = normalizeRole(user.role || user.type);
    const name = String(user.name || user.displayName || user.email || 'Usuário Doke').trim();

    return {
      id: user.id || `user_${Date.now()}`,
      name,
      email: user.email || '',
      phone: user.phone || '',
      role,
      type: user.type || role,
      handle: user.handle || '',
      avatar: user.avatar || user.avatarUrl || '',
      avatarUrl: user.avatarUrl || user.avatar || '',
      initials: user.initials || user.avatarInitials || getInitials(name),
      avatarInitials: user.avatarInitials || user.initials || getInitials(name),
      city: user.city || '',
      state: user.state || '',
      points: Number.isFinite(Number(user.points)) ? Number(user.points) : 0,
      verified: Boolean(user.verified),
      isMockSupport: user.isMockSupport === true,
      mockSupport: user.mockSupport === true
    };
  };

  const normalizeSession = (session) => {
    if (!session || typeof session !== 'object') return null;
    const user = normalizeUser(session.user || session.currentUser || session);
    if (!user) return null;

    return {
      provider: session.provider || 'mock',
      token: session.token || `mock-${Date.now()}`,
      remember: session.remember !== false,
      user,
      issuedAt: session.issuedAt || session.createdAt || session.creatédAt || nowIso(),
      updatedAt: session.updatedAt || nowIso()
    };
  };

  const readStored = (key) => safeParse(root.localStorage.getItem(key));

  const read = () => {
    const primary = normalizeSession(readStored(STORAGE_KEY));
    if (primary) return primary;

    for (const key of LEGACY_KEYS) {
      const migrated = normalizeSession(readStored(key));
      if (migrated) return migrated;
    }

    return null;
  };

  const syncAppState = (session) => {
    const user = session?.user || null;
    const role = user?.role || 'guest';
    const permissions = Doke.permissions?.permissionsForRole
      ? Doke.permissions.permissionsForRole(role)
      : [];

    if (Doke.state?.merge) {
      Doke.state.merge('auth', {
        status: user ? 'authenticated' : 'anonymous',
        user,
        profile: user,
        role,
        permissions
      });
    }

    document.documentElement.dataset.authenticated = String(Boolean(user));
    document.documentElement.dataset.authRole = role;
  };

  const notify = (session) => {
    syncAppState(session);

    listeners.forEach((listener) => {
      try {
        listener(session);
      } catch (error) {
        console.error('[DokeSession]', error);
      }
    });

    document.dispatchEvent(new CustomEvent('doke:auth-session-change', {
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
    provider: meta.provider || 'mock',
    token: meta.token || `mock-${Date.now()}`,
    remember: meta.remember !== false,
    user
  });

  const clear = () => write(null);
  const getSession = () => read();
  const getCurrentUser = () => read()?.user || null;
  const getUser = getCurrentUser;
  const isAuthenticated = () => Boolean(getCurrentUser());
  const hasRole = (role) => {
    const currentRole = getCurrentUser()?.role;
    return Array.isArray(role) ? role.includes(currentRole) : currentRole === role;
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
    read,
    write,
    clear,
    getSession,
    getCurrentUser,
    getUser,
    bootstrap,
    setCurrentUser,
    isAuthenticated,
    hasRole,
    subscribe,
    normalizeUser,
    normalizeSession
  });

  ns.session = api;
  ns.SessionStore = api;
  Doke.session = api;

  syncAppState(read());
})();
