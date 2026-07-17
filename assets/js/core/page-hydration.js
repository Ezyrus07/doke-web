/* Doke page hydration contract
   Responsibility: coordinate first render/hydration readiness for data-driven
   pages so loading, ready and empty states are not decided from stale DOM
   snapshots during F5 or internal navigation. */
(function () {
  'use strict';

  const lifecycle = window.DokeNavigationLifecycle || window.Doke?.navigationLifecycle || null;
  const DEFAULT_MAX_DURATION = 8000;
  const INTERNAL_NAVIGATION_TTL = 1800;
  const activeHydrations = new Map();
  const ROUTE_SKELETON_CONTRACTS = Object.freeze({
    '/index.html': Object.freeze({
      boundary: '[data-state-boundary="index"]',
      skeleton: '[data-home-hydration-skeleton]',
      ready: '[data-home-hydration-ready]',
      splash: '[data-home-document-preloader]'
    }),
    '/meu-perfil.html': Object.freeze({
      boundary: '[data-state-boundary="meu-perfil"]',
      skeleton: '[data-profile-hydration-skeleton]',
      ready: '[data-profile-hydration-ready]',
      splash: '[data-profile-document-preloader]'
    }),
    '/perfil-cliente.html': Object.freeze({
      boundary: '[data-state-boundary="perfil-cliente"]',
      skeleton: '[data-profile-hydration-skeleton]',
      ready: '[data-profile-hydration-ready]',
      splash: '[data-profile-document-preloader]'
    }),
    '/perfil-profissional.html': Object.freeze({
      boundary: '[data-state-boundary="perfil-profissional"]',
      skeleton: '[data-professional-profile-hydration-skeleton]',
      ready: '[data-professional-profile-hydration-ready]',
      splash: '[data-professional-profile-document-preloader]'
    }),
    '/configuracoes.html': Object.freeze({
      boundary: '[data-state-boundary="configuracoes"]',
      pending: '[data-settings-hydration-pending]',
      ready: '[data-settings-hydration-ready]',
      splash: '[data-settings-document-preloader]'
    }),
    '/tornar-profissional.html': Object.freeze({
      boundary: '[data-state-boundary="tornar-profissional"]',
      pending: '[data-professional-onboarding-hydration-pending]',
      ready: '[data-professional-onboarding-hydration-ready]',
      splash: '[data-professional-onboarding-document-preloader]'
    }),
    '/verificacao-profissional.html': Object.freeze({
      boundary: '[data-state-boundary="verificacao-profissional"]',
      pending: '[data-professional-verification-hydration-pending]',
      ready: '[data-professional-verification-hydration-ready]',
      splash: '[data-professional-verification-document-preloader]'
    }),
    '/pedidos.html': Object.freeze({
      boundary: '[data-state-boundary="pedidos"]',
      skeleton: '[data-orders-hydration-skeleton], [data-orders-hydration-count-skeleton]',
      ready: '[data-orders-hydration-ready], [data-orders-hydration-count-ready]',
      splash: '[data-orders-document-preloader]'
    }),
    '/mensagens.html': Object.freeze({
      boundary: '[data-state-boundary="mensagens"], .messages-app',
      skeleton: '[data-messages-hydration-skeleton]',
      ready: '[data-messages-hydration-ready]',
      splash: '[data-messages-document-preloader]'
    }),
    '/pagamento-profissional.html': Object.freeze({
      boundary: '[data-state-boundary="pagamento"]',
      skeleton: '[data-payment-hydration-skeleton]',
      ready: '[data-payment-hydration-ready]',
      splash: '[data-payment-document-preloader]'
    }),
    '/notificacoes.html': Object.freeze({
      boundary: '[data-state-boundary="notificacoes"]',
      skeleton: '[data-notifications-hydration-skeleton]',
      ready: '[data-notifications-hydration-ready]',
      splash: '[data-notifications-document-preloader]'
    }),
    '/carteira.html': Object.freeze({
      boundary: '[data-state-boundary="carteira"]',
      skeleton: '[data-wallet-hydration-skeleton]',
      ready: '[data-wallet-hydration-ready]',
      splash: '[data-wallet-document-preloader]'
    }),
    '/orcamento.html': Object.freeze({
      boundary: '[data-state-boundary="orcamento"]',
      pending: '[data-budget-hydration-pending]',
      ready: '[data-budget-hydration-ready]',
      splash: '[data-budget-document-preloader]'
    }),
    '/avaliacao-profissional.html': Object.freeze({
      boundary: '[data-state-boundary="avaliacao-profissional"]',
      pending: '[data-review-hydration-pending]',
      ready: '[data-review-hydration-ready]',
      splash: '[data-review-document-preloader]'
    }),
    '/resultados.html': Object.freeze({
      boundary: '[data-state-boundary="resultados"]',
      skeleton: '[data-results-hydration-skeleton]',
      ready: '[data-results-hydration-ready]',
      splash: '[data-results-document-preloader]'
    }),
    '/detalhe-anuncio.html': Object.freeze({
      boundary: '[data-state-boundary="detalhe-anuncio"]',
      skeleton: '[data-detail-hydration-skeleton]',
      ready: '[data-detail-hydration-ready]',
      splash: '[data-detail-document-preloader]'
    })
  });

  const getNavigationType = () => {
    if (lifecycle?.entry?.get) return lifecycle.entry.get().navigationType || 'navigate';
    try {
      const entries = performance.getEntriesByType?.('navigation') || [];
      return entries[0]?.type || 'navigate';
    } catch (error) {
      return 'navigate';
    }
  };

  const hasRecentInternalNavigation = (navigationType = getNavigationType()) => {
    try {
      if (navigationType === 'reload') return false;
      const marker = Number(window.sessionStorage?.getItem('doke.internalRouteNavigation') || 0);
      return Number.isFinite(marker) && marker > 0 && Date.now() - marker < INTERNAL_NAVIGATION_TTL;
    } catch (error) {
      return false;
    }
  };

  const isStableShellNavigation = () => {
    if (lifecycle?.entry) return lifecycle.entry.isInternal() || lifecycle.entry.isRestore();
    if (document.documentElement?.dataset.dokeNavigationMode === 'stable-shell') return true;
    if (document.body?.dataset.dokeNavigationMode === 'stable-shell') return true;
    return hasRecentInternalNavigation();
  };

  const getRouteVisualMode = () => (
    document.documentElement?.dataset.dokeRouteVisualMode
    || document.body?.dataset.dokeRouteVisualMode
    || ''
  );

  const getPolicy = (options = {}) => {
    const navigationType = getNavigationType();
    const internalNavigation = isStableShellNavigation();
    const hardLoad = !internalNavigation;
    const skeletonMode = String(options.skeletonMode || options.skeletonPolicy || 'hard-load');
    const readyPolicy = String(options.readyPolicy || 'internal-immediate');

    const routeVisualMode = getRouteVisualMode();
    const shouldShowSkeleton = (() => {
      if (skeletonMode === 'never') return false;
      if (internalNavigation && routeVisualMode === 'direct') return false;
      if (internalNavigation && routeVisualMode === 'skeleton') return true;
      if (internalNavigation) {
        return skeletonMode === 'route-and-document' || skeletonMode === 'always';
      }
      if (skeletonMode === 'reload') return navigationType === 'reload';
      if (
        skeletonMode === 'document-load'
        || skeletonMode === 'hard-load'
        || skeletonMode === 'route-and-document'
      ) return hardLoad;
      return true;
    })();

    const shouldRevealReadyImmediately = readyPolicy !== 'after-skeleton' && internalNavigation;

    return Object.freeze({
      navigationType,
      hardLoad,
      internalNavigation,
      routeVisualMode,
      shouldShowSkeleton,
      shouldRevealReadyImmediately
    });
  };

  const shouldUseSkeletonForMode = (mode) => {
    const normalized = String(mode || 'always');
    if (normalized === 'never') return false;
    if (isStableShellNavigation()) return getRouteVisualMode() === 'skeleton';
    if (normalized === 'document-load') return document.readyState !== 'complete';
    if (normalized === 'reload') return getNavigationType() === 'reload';
    return true;
  };

  const toArray = (value) => Array.isArray(value) ? value : [value].filter(Boolean);

  const toDatasetKey = (value) => String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9]+([a-zA-Z0-9])/g, (_, char) => char.toUpperCase())
    .replace(/^[^a-zA-Z]+/, '');

  const resolveRoot = (root) => {
    if (!root) return document.body;
    if (typeof root === 'string') return document.querySelector(root) || document.body;
    return root;
  };

  const resolveNodes = (root, selectors) => {
    const owner = resolveRoot(root);
    return toArray(selectors).flatMap((selector) => {
      if (!selector) return [];
      if (typeof selector !== 'string') return [selector].filter(Boolean);
      return Array.from(owner.querySelectorAll(selector));
    });
  };

  const setHidden = (node, hidden) => {
    if (!node) return;
    node.hidden = hidden;
    node.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  };

  const setSkeletonHidden = (node, hidden) => {
    if (!node) return;
    node.hidden = hidden;
    node.setAttribute('aria-hidden', 'true');
  };

  const create = (options = {}) => {
    const page = String(options.page || document.body?.dataset.page || 'page');
    const root = resolveRoot(options.root);
    const emptySelectors = toArray(options.emptySelectors || options.emptySelector || []);
    const loadingSelectors = toArray(options.loadingSelectors || options.loadingSelector || []);
    const skeletonSelectors = toArray(options.skeletonSelectors || options.skeletonSelector || []);
    const pendingSelectors = toArray(options.pendingSelectors || options.pendingSelector || []);
    const readySelectors = toArray(options.readySelectors || options.readySelector || []);
    const errorSelectors = toArray(options.errorSelectors || options.errorSelector || ['[data-state-error]']);
    const policy = getPolicy(options);
    const useSkeleton = typeof options.skeletonMode === 'undefined' && typeof options.skeletonPolicy === 'undefined'
      ? shouldUseSkeletonForMode('hard-load')
      : policy.shouldShowSkeleton;
    const preserveReadyDuringHydration = options.preserveReadyDuringHydration === true;
    const revealReadyImmediately = policy.shouldRevealReadyImmediately
      && (!options.waitFor || preserveReadyDuringHydration);
    const revealReadyOnEmpty = options.revealReadyOnEmpty !== false;
    const waitFor = new Set(toArray(options.waitFor || ['dom']));
    const readySources = new Set();
    const startedAt = Date.now();
    const minDuration = policy.routeVisualMode === 'direct'
      ? 0
      : Number.isFinite(Number(options.minDuration))
      ? Math.max(0, Number(options.minDuration))
      : 0;
    const maxDuration = Number.isFinite(Number(options.maxDuration))
      ? Math.max(minDuration, Number(options.maxDuration))
      : DEFAULT_MAX_DURATION;
    let watchdogTimer = 0;
    let skeletonShownAt = 0;
    let state = 'idle';
    let finalizing = false;
    let lastHasItems = false;
    let lastError = null;

    const readHasItems = (fallback = false) => {
      if (typeof options.hasItems === 'function') {
        try {
          return Boolean(options.hasItems());
        } catch (error) {
          return Boolean(fallback);
        }
      }
      return Boolean(fallback);
    };

    const setState = (nextState, detail = {}) => {
      const previousState = state;
      state = nextState;
      if (root) {
        root.dataset.pageHydration = nextState;
        root.dataset.pageHydrationSkeleton = useSkeleton ? 'on' : 'off';
        root.dataset.pageHydrationBoot = 'off';
        root.dataset.viewState = nextState === 'hydrating'
          ? 'loading'
          : nextState;
        root.setAttribute('aria-busy', String(nextState === 'hydrating'));
      }
      if (document.documentElement) {
        document.documentElement.dataset.pageHydration = nextState;
        document.documentElement.dataset.pageHydrationSkeleton = useSkeleton ? 'on' : 'off';
        document.documentElement.dataset.pageHydrationBoot = 'off';
      }
      if (document.body) {
        document.body.dataset.pageHydration = nextState;
        document.body.dataset.pageHydrationSkeleton = useSkeleton ? 'on' : 'off';
        document.body.dataset.pageHydrationBoot = 'off';
        const pageHydrationKey = toDatasetKey(`${page}-hydration`);
        if (pageHydrationKey) document.body.dataset[pageHydrationKey] = nextState;
      }
      if (lifecycle?.page && previousState !== nextState) {
        if (nextState === 'hydrating') {
          lifecycle.page.begin({
            page,
            source: detail.source || 'page-hydration',
            skeleton: useSkeleton,
            hydrationState: nextState
          });
        } else if (nextState === 'empty') {
          lifecycle.page.empty({ page, source: detail.source || 'page-hydration', hasItems: false });
        } else if (nextState === 'ready') {
          lifecycle.page.ready({
            page,
            source: detail.source || 'page-hydration',
            hasItems: typeof detail.hasItems === 'boolean' ? detail.hasItems : lastHasItems
          });
        } else if (nextState === 'error') {
          lifecycle.page.fail(new Error(detail.error || `Falha ao carregar ${page}.`), {
            page,
            source: detail.source || 'page-hydration'
          });
        }
      }
      document.dispatchEvent(new CustomEvent('doke:page-hydration-state', {
        detail: Object.assign({ page, state: nextState }, detail)
      }));
    };

    const ensureRetryAction = (node) => {
      if (!node || node.querySelector('[data-page-hydration-retry]')) return;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'doke-btn doke-btn--secondary';
      retry.dataset.pageHydrationRetry = 'true';
      retry.textContent = 'Tentar novamente';
      retry.addEventListener('click', () => {
        if (typeof options.onRetry === 'function') {
          options.onRetry(lastError);
          return;
        }
        if (typeof window.DokeNavigate === 'function') {
          window.DokeNavigate(window.location.href, { replace: true, force: true });
          return;
        }
        window.location.reload();
      });
      node.append(document.createTextNode(' '), retry);
    };

    const syncEmptyVisibility = (visible) => {
      resolveNodes(root, emptySelectors).forEach((node) => {
        setHidden(node, !visible);
        const region = node.closest('[data-state-region]');
        if (region) setHidden(region, !visible);
      });
    };

    const hideEmpties = () => {
      syncEmptyVisibility(false);
    };

    const syncLoading = (visible) => {
      resolveNodes(root, loadingSelectors).forEach((node) => setHidden(node, !visible));
    };

    const syncSkeleton = (visible) => {
      resolveNodes(root, skeletonSelectors).forEach((node) => setSkeletonHidden(node, !visible));
    };

    const syncPending = (visible) => {
      resolveNodes(root, pendingSelectors).forEach((node) => {
        setHidden(node, !visible);
        const region = node.closest('[data-state-region]');
        if (region) setHidden(region, !visible);
      });
    };

    const syncReady = (visible) => {
      resolveNodes(root, readySelectors).forEach((node) => setHidden(node, !visible));
    };

    const syncError = (visible) => {
      resolveNodes(root, errorSelectors).forEach((node) => {
        setHidden(node, !visible);
        const region = node.closest('[data-state-region]');
        if (region) setHidden(region, !visible);
        if (visible) ensureRetryAction(node);
      });
    };

    const showSkeleton = () => {
      syncLoading(useSkeleton);
      syncSkeleton(useSkeleton);
      if (useSkeleton && !skeletonShownAt) skeletonShownAt = Date.now();
    };

    const syncEmpty = ({ hasItems } = {}) => {
      lastHasItems = readHasItems(hasItems);
      if (state !== 'ready' && state !== 'empty') {
        hideEmpties();
        return { state, hasItems: lastHasItems };
      }
      const shouldShowEmpty = !lastHasItems;
      const nextState = shouldShowEmpty ? 'empty' : 'ready';
      if (state !== nextState) {
        setState(nextState, { hasItems: lastHasItems, source: 'sync-empty' });
      }
      syncEmptyVisibility(shouldShowEmpty);
      return { state: nextState, hasItems: lastHasItems };
    };

    const finalize = () => {
      if (finalizing || state === 'ready' || state === 'empty') return;
      if (watchdogTimer) {
        window.clearTimeout(watchdogTimer);
        watchdogTimer = 0;
      }
      finalizing = true;
      const complete = () => {
        if (state === 'error') {
          finalizing = false;
          return;
        }
        lastHasItems = readHasItems(lastHasItems);
        const nextState = lastHasItems ? 'ready' : 'empty';
        finalizing = false;

        // Settle every visual surface before publishing the terminal state.
        // This prevents route listeners from observing mixed skeleton/ready/empty DOM.
        syncLoading(false);
        syncSkeleton(false);
        syncPending(false);
        syncError(false);
        syncReady(lastHasItems || revealReadyOnEmpty);
        syncEmptyVisibility(!lastHasItems);
        setState(nextState, { hasItems: lastHasItems });

        document.dispatchEvent(new CustomEvent('doke:page-hydration-ready', {
          detail: { page, hasItems: lastHasItems }
        }));
      };
      const minimumWait = lifecycle?.timing?.wait
        ? lifecycle.timing.wait('page', minDuration, { page, source: 'page-hydration' })
        : (() => {
            const elapsed = Date.now() - startedAt;
            const skeletonElapsed = skeletonShownAt ? Date.now() - skeletonShownAt : elapsed;
            const delay = Math.max(0, minDuration - (useSkeleton ? skeletonElapsed : elapsed));
            return delay > 0
              ? new Promise((resolve) => window.setTimeout(resolve, delay))
              : Promise.resolve();
          })();
      minimumWait.then(complete);
    };

    const canFinalize = () => Array.from(waitFor).every((source) => readySources.has(source));

    const mark = (source = 'dom') => {
      if (state === 'ready' || state === 'empty' || state === 'error') return true;
      readySources.add(source);
      if (root) root.dataset.pageHydrationSources = Array.from(readySources).sort().join(',');
      if (canFinalize()) {
        finalize();
        return true;
      }
      return false;
    };

    const start = () => {
      if (state !== 'idle') return api;
      setState('hydrating');
      hideEmpties();
      syncError(false);
      syncLoading(false);
      syncSkeleton(false);
      syncPending(true);
      syncReady(revealReadyImmediately);
      showSkeleton();
      if (watchdogTimer) window.clearTimeout(watchdogTimer);
      watchdogTimer = window.setTimeout(() => {
        if (state !== 'hydrating') return;
        error(new Error(`Tempo limite de hidratação excedido para ${page}.`), { source: 'watchdog' });
      }, maxDuration);
      return api;
    };

    const ready = ({ hasItems } = {}) => {
      lastHasItems = readHasItems(hasItems);
      waitFor.forEach((source) => readySources.add(source));
      finalize();
      return api;
    };

    const error = (reason, detail = {}) => {
      if (state === 'ready' || state === 'empty' || state === 'error') return api;
      lastError = reason instanceof Error ? reason : new Error(String(reason || 'Falha ao carregar a página.'));
      [watchdogTimer].forEach((timer) => {
        if (timer) window.clearTimeout(timer);
      });
      watchdogTimer = 0;
      finalizing = false;
      // Hide all non-error surfaces before publishing the error state.
      syncLoading(false);
      syncSkeleton(false);
      syncPending(false);
      syncReady(false);
      hideEmpties();
      syncError(true);
      setState('error', Object.assign({
        error: lastError.message,
        source: 'controller'
      }, detail));
      document.dispatchEvent(new CustomEvent('doke:page-hydration-error', {
        detail: Object.assign({ page, error: lastError.message }, detail)
      }));
      return api;
    };

    const api = Object.freeze({
      start,
      mark,
      ready,
      error,
      syncEmpty,
      syncSkeleton,
      syncPending,
      syncReady,
      syncError,
      hideEmpties,
      getState: () => state,
      getPolicy: () => policy,
      canShowEmpty: () => state === 'ready' || state === 'empty',
      isHydrating: () => state === 'hydrating',
      usesSkeleton: () => useSkeleton
    });

    activeHydrations.set(page, api);
    return api;
  };

  const normalizeRoutePath = (value) => {
    try {
      const pathname = new URL(value || window.location.href, window.location.href).pathname;
      if (pathname === '/') return '/index.html';
      return `/${pathname.split('/').filter(Boolean).pop() || 'index.html'}`;
    } catch (error) {
      return '/index.html';
    }
  };

  const getRouteSkeletonContract = (path) => ROUTE_SKELETON_CONTRACTS[normalizeRoutePath(path)] || null;

  const routeHasSkeleton = (doc, path) => {
    const contract = getRouteSkeletonContract(path);
    return Boolean(contract?.skeleton && doc?.querySelector?.(contract.skeleton));
  };

  const prepareRouteDocument = (doc, path, mode = 'direct') => {
    const contract = getRouteSkeletonContract(path);
    if (!doc || !contract) return false;
    const showSkeleton = mode === 'skeleton';
    doc.querySelectorAll(contract.boundary).forEach((node) => {
      node.dataset.viewState = 'loading';
      node.dataset.pageHydration = 'hydrating';
      node.dataset.pageHydrationSkeleton = showSkeleton ? 'on' : 'off';
      node.setAttribute('aria-busy', 'true');
    });
    if (contract.splash) doc.querySelectorAll(contract.splash).forEach((node) => setHidden(node, true));
    if (contract.skeleton) doc.querySelectorAll(contract.skeleton).forEach((node) => setSkeletonHidden(node, !showSkeleton));
    if (contract.pending) doc.querySelectorAll(contract.pending).forEach((node) => setHidden(node, false));
    if (contract.ready) doc.querySelectorAll(contract.ready).forEach((node) => setHidden(node, true));
    doc.querySelectorAll('[data-state-error], [data-state-empty]').forEach((node) => setHidden(node, true));
    return true;
  };

  const setRouteVisualMode = (mode) => {
    const normalized = mode === 'skeleton' ? 'skeleton' : 'direct';
    if (document.documentElement) document.documentElement.dataset.dokeRouteVisualMode = normalized;
    if (document.body) document.body.dataset.dokeRouteVisualMode = normalized;
    return normalized;
  };

  const clearRouteVisualMode = () => {
    document.documentElement?.removeAttribute('data-doke-route-visual-mode');
    document.body?.removeAttribute('data-doke-route-visual-mode');
  };

  const showRouteError = (path, reason) => {
    const page = normalizeRoutePath(path).slice(1).replace(/\.html$/i, '');
    const active = activeHydrations.get(page);
    if (active && typeof active.error === 'function') {
      active.error(reason, { source: 'route-resource' });
      return true;
    }
    const contract = getRouteSkeletonContract(path);
    if (contract) {
      if (contract.skeleton) document.querySelectorAll(contract.skeleton).forEach((node) => setHidden(node, true));
      if (contract.pending) document.querySelectorAll(contract.pending).forEach((node) => setHidden(node, true));
      if (contract.ready) document.querySelectorAll(contract.ready).forEach((node) => setHidden(node, true));
    }
    const errorNode = document.querySelector('[data-state-error]');
    if (errorNode) {
      setHidden(errorNode, false);
      const region = errorNode.closest('[data-state-region]');
      if (region) setHidden(region, false);
      if (!errorNode.querySelector('[data-page-hydration-retry]')) {
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'doke-btn doke-btn--secondary';
        retry.dataset.pageHydrationRetry = 'true';
        retry.textContent = 'Tentar novamente';
        retry.addEventListener('click', () => {
          if (typeof window.DokeNavigate === 'function') {
            window.DokeNavigate(window.location.href, { replace: true, force: true });
          } else {
            window.location.reload();
          }
        });
        errorNode.append(document.createTextNode(' '), retry);
      }
    }
    if (document.body) document.body.dataset.pageHydration = 'error';
    if (document.documentElement) document.documentElement.dataset.pageHydration = 'error';
    return Boolean(errorNode);
  };

  window.DokePageHydration = Object.freeze({
    create,
    getPolicy,
    getRouteSkeletonContract,
    routeHasSkeleton,
    prepareRouteDocument,
    setRouteVisualMode,
    clearRouteVisualMode,
    showRouteError
  });
}());
