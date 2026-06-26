/* Doke page hydration contract
   Responsibility: coordinate first render/hydration readiness for data-driven
   pages so loading, ready and empty states are not decided from stale DOM
   snapshots during F5 or internal navigation. */
(function () {
  'use strict';

  const DEFAULT_MIN_DURATION = 180;
  const INTERNAL_NAVIGATION_TTL = 1800;

  const getNavigationType = () => {
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
    if (document.documentElement?.dataset.dokeNavigationMode === 'stable-shell') return true;
    if (document.body?.dataset.dokeNavigationMode === 'stable-shell') return true;
    return hasRecentInternalNavigation();
  };

  const getPolicy = (options = {}) => {
    const navigationType = getNavigationType();
    const internalNavigation = isStableShellNavigation();
    const hardLoad = !internalNavigation;
    const skeletonMode = String(options.skeletonMode || options.skeletonPolicy || 'hard-load');
    const bootMode = String(options.bootMode || options.bootPolicy || 'hard-load');
    const readyPolicy = String(options.readyPolicy || 'internal-immediate');

    const shouldShowSkeleton = (() => {
      if (skeletonMode === 'never') return false;
      if (internalNavigation) return false;
      if (skeletonMode === 'reload') return navigationType === 'reload';
      if (skeletonMode === 'document-load' || skeletonMode === 'hard-load') return hardLoad;
      return true;
    })();

    const shouldShowBootLogo = (() => {
      if (bootMode === 'never') return false;
      if (internalNavigation) return false;
      if (bootMode === 'reload') return navigationType === 'reload';
      return hardLoad;
    })();

    const shouldRevealReadyImmediately = readyPolicy !== 'after-skeleton' && internalNavigation;

    return Object.freeze({
      navigationType,
      hardLoad,
      internalNavigation,
      shouldShowBootLogo,
      shouldShowSkeleton,
      shouldRevealReadyImmediately
    });
  };

  const shouldUseSkeletonForMode = (mode) => {
    const normalized = String(mode || 'always');
    if (normalized === 'never') return false;
    if (isStableShellNavigation()) return false;
    if (normalized === 'document-load') return document.readyState !== 'complete';
    if (normalized === 'reload') return getNavigationType() === 'reload';
    return true;
  };

  const toArray = (value) => Array.isArray(value) ? value : [value].filter(Boolean);

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

  const resolveDocumentNodes = (selectors) => toArray(selectors).flatMap((selector) => {
    if (!selector) return [];
    if (typeof selector !== 'string') return [selector].filter(Boolean);
    return Array.from(document.querySelectorAll(selector));
  });

  const setHidden = (node, hidden) => {
    if (!node) return;
    node.hidden = hidden;
    node.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  };

  const create = (options = {}) => {
    const page = String(options.page || document.body?.dataset.page || 'page');
    const root = resolveRoot(options.root);
    const emptySelectors = toArray(options.emptySelectors || options.emptySelector || []);
    const loadingSelectors = toArray(options.loadingSelectors || options.loadingSelector || []);
    const skeletonSelectors = toArray(options.skeletonSelectors || options.skeletonSelector || []);
    const readySelectors = toArray(options.readySelectors || options.readySelector || []);
    const splashSelectors = toArray(options.splashSelectors || options.splashSelector || []);
    const policy = getPolicy(options);
    const useSkeleton = typeof options.skeletonMode === 'undefined' && typeof options.skeletonPolicy === 'undefined'
      ? shouldUseSkeletonForMode('hard-load')
      : policy.shouldShowSkeleton;
    const revealReadyImmediately = policy.shouldRevealReadyImmediately || !useSkeleton;
    const waitFor = new Set(toArray(options.waitFor || ['dom']));
    const readySources = new Set();
    const startedAt = Date.now();
    const minDuration = policy.shouldRevealReadyImmediately
      ? 0
      : Number.isFinite(Number(options.minDuration))
      ? Math.max(0, Number(options.minDuration))
      : DEFAULT_MIN_DURATION;
    const maxDuration = Number.isFinite(Number(options.maxDuration))
      ? Math.max(minDuration, Number(options.maxDuration))
      : 1400;
    const splashDuration = policy.shouldShowBootLogo && useSkeleton && Number.isFinite(Number(options.splashDuration))
      ? Math.max(0, Number(options.splashDuration))
      : 0;
    let watchdogTimer = 0;
    let splashTimer = 0;
    let pendingFinalizeTimer = 0;
    let splashActive = false;
    let skeletonShownAt = 0;
    let state = 'idle';
    let finalizing = false;
    let lastHasItems = false;

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
      state = nextState;
      if (root) {
        root.dataset.pageHydration = nextState;
        root.dataset.pageHydrationSkeleton = useSkeleton ? 'on' : 'off';
        root.dataset.pageHydrationBoot = splashDuration > 0 ? 'on' : 'off';
      }
      if (document.documentElement) {
        document.documentElement.dataset.pageHydration = nextState;
        document.documentElement.dataset.pageHydrationSkeleton = useSkeleton ? 'on' : 'off';
        document.documentElement.dataset.pageHydrationBoot = splashDuration > 0 ? 'on' : 'off';
      }
      if (document.body) {
        document.body.dataset.pageHydration = nextState;
        document.body.dataset.pageHydrationSkeleton = useSkeleton ? 'on' : 'off';
        document.body.dataset.pageHydrationBoot = splashDuration > 0 ? 'on' : 'off';
        document.body.dataset[`${page}Hydration`] = nextState;
      }
      document.dispatchEvent(new CustomEvent('doke:page-hydration-state', {
        detail: Object.assign({ page, state: nextState }, detail)
      }));
    };

    const hideEmpties = () => {
      resolveNodes(root, emptySelectors).forEach((node) => setHidden(node, true));
    };

    const syncLoading = (visible) => {
      resolveNodes(root, loadingSelectors).forEach((node) => setHidden(node, !visible));
    };

    const syncSkeleton = (visible) => {
      resolveNodes(root, skeletonSelectors).forEach((node) => setHidden(node, !visible));
    };

    const syncReady = (visible) => {
      resolveNodes(root, readySelectors).forEach((node) => setHidden(node, !visible));
    };

    const syncSplash = (visible) => {
      splashActive = Boolean(visible);
      resolveDocumentNodes(splashSelectors).forEach((node) => setHidden(node, !visible));
      if (root) root.dataset.pageHydrationSplash = visible ? 'on' : 'off';
      if (document.body) document.body.dataset.pageHydrationSplash = visible ? 'on' : 'off';
    };

    const showSkeleton = () => {
      if (splashActive) return;
      syncLoading(useSkeleton);
      syncSkeleton(useSkeleton);
      if (useSkeleton && !skeletonShownAt) skeletonShownAt = Date.now();
    };

    const releaseSplash = () => {
      if (!splashActive) return;
      syncSplash(false);
      if (state === 'hydrating') showSkeleton();
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
      resolveNodes(root, emptySelectors).forEach((node) => setHidden(node, !shouldShowEmpty));
      return { state: nextState, hasItems: lastHasItems };
    };

    const finalize = () => {
      if (finalizing || state === 'ready' || state === 'empty') return;
      if (state === 'document-boot' && splashActive && splashDuration > 0) {
        const remainingSplash = Math.max(0, splashDuration - (Date.now() - startedAt));
        if (remainingSplash > 0) {
          if (!pendingFinalizeTimer) {
            pendingFinalizeTimer = window.setTimeout(() => {
              pendingFinalizeTimer = 0;
              finalize();
            }, remainingSplash);
          }
          return;
        }
      }
      if (watchdogTimer) {
        window.clearTimeout(watchdogTimer);
        watchdogTimer = 0;
      }
      if (splashTimer) {
        window.clearTimeout(splashTimer);
        splashTimer = 0;
      }
      if (pendingFinalizeTimer) {
        window.clearTimeout(pendingFinalizeTimer);
        pendingFinalizeTimer = 0;
      }
      if (state === 'document-boot' && useSkeleton) {
        setState('hydrating', { from: 'document-boot' });
        releaseSplash();
      } else {
        releaseSplash();
      }
      finalizing = true;
      const elapsed = Date.now() - startedAt;
      const skeletonElapsed = skeletonShownAt ? Date.now() - skeletonShownAt : elapsed;
      const delay = Math.max(0, minDuration - (useSkeleton ? skeletonElapsed : elapsed));
      window.setTimeout(() => {
        lastHasItems = readHasItems(lastHasItems);
        finalizing = false;
        setState(lastHasItems ? 'ready' : 'empty', { hasItems: lastHasItems });
        syncLoading(false);
        syncSkeleton(false);
        syncSplash(false);
        syncReady(true);
        syncEmpty({ hasItems: lastHasItems });
        document.dispatchEvent(new CustomEvent('doke:page-hydration-ready', {
          detail: { page, hasItems: lastHasItems }
        }));
      }, delay);
    };

    const canFinalize = () => Array.from(waitFor).every((source) => readySources.has(source));

    const mark = (source = 'dom') => {
      if (state === 'ready' || state === 'empty') return true;
      readySources.add(source);
      if (canFinalize()) {
        finalize();
        return true;
      }
      return false;
    };

    const start = () => {
      if (state !== 'idle') return api;
      setState(splashDuration > 0 ? 'document-boot' : 'hydrating');
      hideEmpties();
      syncLoading(false);
      syncSkeleton(false);
      syncReady(revealReadyImmediately);
      syncSplash(splashDuration > 0);
      if (splashTimer) window.clearTimeout(splashTimer);
      if (useSkeleton && splashDuration > 0) {
        splashTimer = window.setTimeout(() => {
          splashTimer = 0;
          setState('hydrating');
          releaseSplash();
        }, splashDuration);
      } else {
        showSkeleton();
      }
      if (watchdogTimer) window.clearTimeout(watchdogTimer);
      watchdogTimer = window.setTimeout(() => {
        if (state !== 'hydrating' && state !== 'document-boot') return;
        ready({ hasItems: readHasItems(lastHasItems) });
      }, maxDuration);
      return api;
    };

    const ready = ({ hasItems } = {}) => {
      lastHasItems = readHasItems(hasItems);
      waitFor.forEach((source) => readySources.add(source));
      finalize();
      return api;
    };

    const api = Object.freeze({
      start,
      mark,
      ready,
      syncEmpty,
      syncSkeleton,
      syncReady,
      syncSplash,
      hideEmpties,
      getState: () => state,
      getPolicy: () => policy,
      canShowEmpty: () => state === 'ready' || state === 'empty',
      isHydrating: () => state === 'hydrating' || state === 'document-boot',
      usesSkeleton: () => useSkeleton
    });

    return api;
  };

  window.DokePageHydration = Object.freeze({ create, getPolicy });
}());
