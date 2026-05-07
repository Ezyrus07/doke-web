/* Doke Session Store
   Responsibility: persist and broadcast the authenticated user/session.
   Provider-agnostic, currently safe for mock auth and future Supabase/Firebase wiring. */
(function () {
  const ns = (window.DokeAuth = window.DokeAuth || {});
  const STORAGE_KEY = 'doke.auth.session.v1';
  const listeners = new Set();

  const safeParse = (value) => {
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  };

  const nowIso = () => new Date().toISOString();

  const read = () => safeParse(window.localStorage.getItem(STORAGE_KEY));

  const write = (session) => {
    if (!session) {
      window.localStorage.removeItem(STORAGE_KEY);
      notify(null);
      return null;
    }

    const normalized = {
      ...session,
      provider: session.provider || 'mock',
      issuedAt: session.issuedAt || nowIso(),
      updatedAt: nowIso()
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    notify(normalized);
    return normalized;
  };

  const clear = () => write(null);

  const getUser = () => read()?.user || null;

  const isAuthenticated = () => Boolean(getUser());

  const subscribe = (listener) => {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  function notify(session) {
    listeners.forEach((listener) => listener(session));
    document.dispatchEvent(new CustomEvent('doke:auth-session-change', {
      detail: {
        session,
        user: session?.user || null,
        authenticated: Boolean(session?.user)
      }
    }));
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    notify(safeParse(event.newValue));
  });

  ns.session = Object.freeze({
    STORAGE_KEY,
    read,
    write,
    clear,
    getUser,
    isAuthenticated,
    subscribe
  });
})();
