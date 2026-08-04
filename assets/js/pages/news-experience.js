(() => {
  const STORAGE_PREFIX = 'doke.news-view.v1';
  const MUTATION_MANAGER_SRC = 'assets/js/core/mutation-manager.js?v=20260804-ux-core-002-v1';
  const VALID_FILTERS = new Set(['all', 'update', 'announcement', 'security', 'community']);
  let mutationManagerTask = null;

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
    const boundary = root || document.body;
    const stateContracts = window.Doke?.stateContracts;
    const contentKey = detail.contentKey || `view.${String(state).replace(/-/g, '_')}`;
    const options = {
      contentKey,
      variables: detail.variables || {},
      announce: detail.announce ?? state !== 'ready'
    };

    const applied = stateContracts?.setBoundaryState?.(boundary, state, options) === true;
    if (!applied) {
      boundary.dataset.viewState = state;
      boundary.setAttribute('aria-busy', state === 'loading' || state === 'refreshing' ? 'true' : 'false');
    }

    document.body.dataset.newsExperienceState = state;
    window.Doke?.experience?.states?.set?.(boundary, state, detail);
  };

  const normalizePreference = (next) => ({
    filter: VALID_FILTERS.has(next?.filter) ? next.filter : 'all',
    expanded: next?.expanded === true
  });

  const readPreference = () => {
    try {
      const raw = localStorage.getItem(storageKey());
      if (!raw) return { filter: 'all', expanded: false };
      return normalizePreference(JSON.parse(raw));
    } catch (error) {
      console.warn('[Doke][Novidades] Não foi possível restaurar preferências.', error);
      return { filter: 'all', expanded: false };
    }
  };

  const writePreference = (normalized) => {
    const serialized = JSON.stringify(normalized);
    localStorage.setItem(storageKey(), serialized);

    if (localStorage.getItem(storageKey()) !== serialized) {
      const error = new Error('news-preference-persistence-failed');
      error.code = 'NEWS_PREFERENCE_PERSISTENCE_FAILED';
      throw error;
    }

    return normalized;
  };

  const getMutationManager = () => window.Doke?.formMutationManager || null;

  const ensureMutationManager = () => {
    const available = getMutationManager();
    if (available) return Promise.resolve(available);
    if (mutationManagerTask) return mutationManagerTask;

    mutationManagerTask = new Promise((resolve, reject) => {
      const finish = () => {
        const manager = getMutationManager();
        if (manager) resolve(manager);
        else reject(new Error('mutation-manager-unavailable'));
      };

      let script = document.querySelector('script[data-doke-mutation-manager]');
      const isNewScript = !script;
      if (!script) {
        script = document.createElement('script');
        script.src = MUTATION_MANAGER_SRC;
        script.async = false;
        script.dataset.dokeMutationManager = 'true';
      }

      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', () => reject(new Error('mutation-manager-load-failed')), { once: true });

      if (isNewScript) document.head.append(script);
      if (getMutationManager()) finish();
    }).catch((error) => {
      mutationManagerTask = null;
      throw error;
    });

    return mutationManagerTask;
  };

  const reportError = (error) => {
    const state = navigator.onLine === false ? 'offline' : 'error';
    setState(state, { error });
    window.dispatchEvent(new CustomEvent('doke:news-experience-error', { detail: { error, state } }));
  };

  const savePreference = (next) => {
    const normalized = normalizePreference(next);
    const accountId = getUserId();

    return ensureMutationManager()
      .then((manager) => manager.execute({
        domain: 'news',
        action: 'save_preference',
        accountId,
        entityType: 'preference',
        entityId: 'news-view',
        payload: normalized,
        dedupeKey: `news|save_preference|${accountId}|${manager.fingerprint(normalized)}`,
        authority: 'client-local-preference',
        request: () => ({
          value: writePreference(normalized),
          confirmed: true,
          authorityReceipt: {
            authority: 'client-local-preference',
            authorityReference: 'news-view-v1',
            confirmedAt: Date.now()
          }
        }),
        classifyError: () => manager.states.REJECTED,
        onStateChange: (mutation) => {
          document.body.dataset.newsPreferenceMutationState = mutation.state;
        }
      }))
      .then((outcome) => {
        setState('ready', { preference: normalized, announce: false });
        window.dispatchEvent(new CustomEvent('doke:news-preference-saved', {
          detail: {
            receipt: outcome.receipt || null,
            replayed: outcome.replayed === true
          }
        }));
        return outcome.result || normalized;
      })
      .catch((error) => {
        if (error?.message === 'mutation-manager-load-failed' || error?.message === 'mutation-manager-unavailable') {
          try {
            const value = writePreference(normalized);
            setState('ready', { preference: value, announce: false });
            return value;
          } catch (storageError) {
            reportError(storageError);
            return normalized;
          }
        }
        reportError(error);
        return normalized;
      });
  };

  const api = {
    begin() {
      ensureMutationManager().catch((error) => {
        console.warn('[Doke][Novidades] Mutation manager será carregado sob demanda.', error);
      });
      const preference = readPreference();
      setState('ready', { source: 'static-editorial-content', preference, announce: false });
      return preference;
    },
    ready(detail = {}) {
      setState('ready', { ...detail, announce: false });
    },
    refreshing(detail = {}) {
      setState('refreshing', detail);
    },
    savePreference,
    readPreference,
    ensureMutationManager,
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
