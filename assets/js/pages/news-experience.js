(() => {
  const STORAGE_PREFIX = 'doke.news-view.v1';
  const MUTATION_MANAGER_SRC = 'assets/js/core/mutation-manager.js?v=20260804-ux-core-002-v1';
  const CONTINUITY_SRC = 'assets/js/core/continuity-experience.js?v=20260804-ux-cont-001-v1';
  const VALID_FILTERS = new Set(['all', 'update', 'announcement', 'security', 'community']);
  let mutationManagerTask = null;
  let continuityTask = null;

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

  const writePreference = (normalized, targetStorageKey) => {
    const serialized = JSON.stringify(normalized);
    localStorage.setItem(targetStorageKey, serialized);

    if (localStorage.getItem(targetStorageKey) !== serialized) {
      const error = new Error('news-preference-persistence-failed');
      error.code = 'NEWS_PREFERENCE_PERSISTENCE_FAILED';
      throw error;
    }

    return normalized;
  };

  const getMutationManager = () => window.Doke?.formMutationManager || null;
  const getContinuity = () => window.Doke?.continuityExperience || null;

  const ensureScriptAuthority = ({
    getter,
    task,
    setTask,
    selector,
    src,
    datasetKey,
    unavailable,
    loadFailed
  }) => {
    const available = getter();
    if (available) return Promise.resolve(available);
    if (task) return task;

    const loading = new Promise((resolve, reject) => {
      const finish = () => {
        const authority = getter();
        if (authority) resolve(authority);
        else reject(new Error(unavailable));
      };

      let script = document.querySelector(selector);
      const isNewScript = !script;
      if (!script) {
        script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.dataset[datasetKey] = 'true';
      }

      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', () => reject(new Error(loadFailed)), { once: true });

      if (isNewScript) document.head.append(script);
      if (getter()) finish();
    }).catch((error) => {
      setTask(null);
      throw error;
    });

    setTask(loading);
    return loading;
  };

  const ensureMutationManager = () => ensureScriptAuthority({
    getter: getMutationManager,
    task: mutationManagerTask,
    setTask: (value) => { mutationManagerTask = value; },
    selector: 'script[data-doke-mutation-manager]',
    src: MUTATION_MANAGER_SRC,
    datasetKey: 'dokeMutationManager',
    unavailable: 'mutation-manager-unavailable',
    loadFailed: 'mutation-manager-load-failed'
  });

  const ensureContinuity = () => ensureScriptAuthority({
    getter: getContinuity,
    task: continuityTask,
    setTask: (value) => { continuityTask = value; },
    selector: 'script[data-doke-continuity-experience]',
    src: CONTINUITY_SRC,
    datasetKey: 'dokeContinuityExperience',
    unavailable: 'continuity-experience-unavailable',
    loadFailed: 'continuity-experience-load-failed'
  });

  const reportError = (error) => {
    const state = navigator.onLine === false ? 'offline' : 'error';
    setState(state, { error });
    window.dispatchEvent(new CustomEvent('doke:news-experience-error', { detail: { error, state } }));
  };

  const saveWithManager = ({
    manager,
    requestHandle,
    normalized,
    accountId,
    targetStorageKey
  }) => {
    requestHandle?.assertCurrent();

    return manager.execute({
      domain: 'news',
      action: 'save_preference',
      accountId,
      entityType: 'preference',
      entityId: 'news-view',
      payload: normalized,
      dedupeKey: `news|save_preference|${accountId}|${manager.fingerprint(normalized)}`,
      authority: 'client-local-preference',
      request: () => {
        requestHandle?.assertCurrent();
        if (requestHandle?.signal?.aborted) {
          const error = new Error('news-preference-request-aborted');
          error.code = 'NEWS_PREFERENCE_REQUEST_ABORTED';
          throw error;
        }

        return {
          value: writePreference(normalized, targetStorageKey),
          confirmed: true,
          authorityReceipt: {
            authority: 'client-local-preference',
            authorityReference: 'news-view-v1',
            confirmedAt: Date.now()
          }
        };
      },
      classifyError: (error) => (
        error?.code === 'DOKE_CONTINUITY_STALE_CONTEXT'
          ? manager.states.CANCELLED
          : manager.states.REJECTED
      ),
      onStateChange: (mutation) => {
        const apply = () => {
          document.body.dataset.newsPreferenceMutationState = mutation.state;
        };
        if (requestHandle) requestHandle.commit(apply);
        else apply();
      }
    }).then((outcome) => {
      const applyOutcome = () => {
        setState('ready', { preference: normalized, announce: false });
        window.dispatchEvent(new CustomEvent('doke:news-preference-saved', {
          detail: {
            receipt: outcome.receipt || null,
            replayed: outcome.replayed === true
          }
        }));
        return outcome.result || normalized;
      };

      if (!requestHandle) return applyOutcome();
      const committed = requestHandle.commit(applyOutcome);
      return committed.applied ? committed.value : normalized;
    });
  };

  const savePreference = (next) => {
    const normalized = normalizePreference(next);
    const accountId = getUserId();
    const targetStorageKey = storageKey();

    return ensureContinuity()
      .catch((error) => {
        console.warn('[Doke][Novidades] Continuity fences indisponíveis; usando compatibilidade local.', error);
        return null;
      })
      .then((continuity) => {
        const revisionKey = 'news.preference';
        const revision = continuity?.bumpRevision?.(revisionKey) || '';
        const requestHandle = continuity?.beginRequest?.({
          lane: 'news.preference.save',
          revisionKey,
          revision,
          entityKey: 'preference/news-view',
          abortPrevious: true
        }) || null;

        return ensureMutationManager()
          .then((manager) => saveWithManager({
            manager,
            requestHandle,
            normalized,
            accountId,
            targetStorageKey
          }))
          .catch((error) => {
            const validation = requestHandle?.validate?.();
            if (validation && !validation.current) return normalized;

            if (error?.message === 'mutation-manager-load-failed' || error?.message === 'mutation-manager-unavailable') {
              const applyFallback = () => {
                const value = writePreference(normalized, targetStorageKey);
                setState('ready', { preference: value, announce: false });
                return value;
              };

              if (!requestHandle) return applyFallback();
              const committed = requestHandle.commit(applyFallback);
              return committed.applied ? committed.value : normalized;
            }

            reportError(error);
            return normalized;
          })
          .finally(() => {
            requestHandle?.settle?.();
          });
      });
  };

  const api = {
    begin() {
      ensureContinuity().catch((error) => {
        console.warn('[Doke][Novidades] Continuity fences serão carregados sob demanda.', error);
      });
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
    ensureContinuity,
    invalidate() {
      window.Doke?.stableShellRouter?.invalidate?.('novidades.html');
    }
  };

  window.Doke = window.Doke || {};
  window.Doke.newsExperience = api;

  window.addEventListener('online', () => {
    ensureContinuity().catch(() => null).then((continuity) => {
      const requestHandle = continuity?.beginRequest?.({
        lane: 'news.online-refresh',
        entityKey: 'route/novidades',
        abortPrevious: true
      }) || null;

      const beginRefresh = () => {
        api.refreshing({ reason: 'online' });
        api.invalidate();
      };

      if (requestHandle) requestHandle.commit(beginRefresh);
      else beginRefresh();

      window.setTimeout(() => {
        const finishRefresh = () => api.ready({ reason: 'online' });
        if (requestHandle) requestHandle.commit(finishRefresh);
        else finishRefresh();
        requestHandle?.settle?.();
      }, 0);
    });
  });
})();
