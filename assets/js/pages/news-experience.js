(() => {
  const STORAGE_PREFIX = 'doke.news-view.v1';
  const VALID_FILTERS = new Set(['all', 'update', 'announcement', 'security', 'community']);

  const getUserId = () => {
    const candidates = [
      window.Doke?.services?.auth?.getCurrentUser?.(),
      window.Doke?.authService?.getCurrentUser?.(),
      window.Doke?.session?.getCurrentUser?.(),
      window.Doke?.state?.auth?.user
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      const user = candidate?.user || candidate;
      const id = user?.id || user?.userId || user?.uid;
      if (id) return String(id);
    }

    return 'guest';
  };

  const storageKey = () => `${STORAGE_PREFIX}:${getUserId()}`;

  const setState = (state, detail = {}) => {
    const root = document.querySelector('[data-state-boundary="novidades"]');
    if (root) {
      root.dataset.viewState = state;
      root.setAttribute('aria-busy', state === 'loading' || state === 'refreshing' ? 'true' : 'false');
    }

    document.body.dataset.newsExperienceState = state;
    window.Doke?.experience?.states?.set?.(root || document.body, state, detail);
  };

  const readPreference = () => {
    try {
      const raw = localStorage.getItem(storageKey());
      if (!raw) return { filter: 'all', expanded: false };
      const parsed = JSON.parse(raw);
      return {
        filter: VALID_FILTERS.has(parsed?.filter) ? parsed.filter : 'all',
        expanded: parsed?.expanded === true
      };
    } catch (error) {
      console.warn('[Doke][Novidades] Não foi possível restaurar preferências.', error);
      return { filter: 'all', expanded: false };
    }
  };

  const savePreference = (next) => {
    const normalized = {
      filter: VALID_FILTERS.has(next?.filter) ? next.filter : 'all',
      expanded: next?.expanded === true
    };

    const serialized = JSON.stringify(normalized);
    localStorage.setItem(storageKey(), serialized);

    if (localStorage.getItem(storageKey()) !== serialized) {
      throw new Error('news-preference-persistence-failed');
    }

    return normalized;
  };

  const reportError = (error) => {
    const state = navigator.onLine === false ? 'offline' : 'error';
    setState(state, { error });
    window.dispatchEvent(new CustomEvent('doke:news-experience-error', { detail: { error, state } }));
  };

  const api = {
    begin() {
      setState('loading');
      return readPreference();
    },
    ready(detail = {}) {
      setState('ready', detail);
    },
    refreshing(detail = {}) {
      setState('refreshing', detail);
    },
    savePreference(next) {
      try {
        const value = savePreference(next);
        setState('ready', { preference: value });
        return value;
      } catch (error) {
        reportError(error);
        throw error;
      }
    },
    readPreference,
    invalidate() {
      window.Doke?.stableShellRouter?.invalidate?.('novidades.html');
    }
  };

  window.Doke = window.Doke || {};
  window.Doke.newsExperience = api;

  window.addEventListener('online', () => {
    api.refreshing({ reason: 'online' });
    api.invalidate();
    window.setTimeout(() => api.ready({ reason: 'online' }), 0);
  });
})();
