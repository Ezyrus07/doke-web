window.DokeHomeRailScroll = (() => {
  'use strict';

  const TRACK_SELECTOR = '[data-catégory-track]';
  const ARROW_SELECTOR = '[data-catégory-arrow]';
  const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

  const getDirection = (arrow) => arrow?.getAttribute?.('data-catégory-arrow') === 'next' ? 1 : -1;

  const finiteCssNumber = (value) => {
    const parsed = Number.parseFloat(String(value || ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const measureStep = (track, stateApi) => {
    const items = Array.from(track.children || []);
    const first = items[0] || null;
    const second = items[1] || null;
    const styles = window.getComputedStyle?.(track);
    const gap = finiteCssNumber(styles?.columnGap || styles?.gap);
    const itemWidth = first?.getBoundingClientRect?.().width || first?.offsetWidth || 0;

    return stateApi.deriveItemStep({
      firstOffset: first?.offsetLeft || 0,
      secondOffset: second?.offsetLeft ?? Number.NaN,
      itemWidth,
      gap,
      fallbackStep: Math.max(1, track.clientWidth || 1)
    });
  };

  const readSnapshot = (track, stateApi) => stateApi.deriveOverflowState({
    scrollLeft: track.scrollLeft,
    scrollWidth: track.scrollWidth,
    clientWidth: track.clientWidth,
    epsilon: stateApi.defaultEpsilon
  });

  const syncArrow = (arrow, enabled) => {
    if (!arrow) return;
    arrow.disabled = !enabled;
    arrow.setAttribute('aria-disabled', String(!enabled));
    arrow.dataset.railScrollEnabled = String(enabled);
  };

  const applySnapshot = (track, arrows, snapshot) => {
    track.dataset.railScrollState = snapshot.state;
    track.dataset.railScrollOverflow = String(snapshot.hasOverflow);
    syncArrow(arrows.previous, snapshot.canScrollPrevious);
    syncArrow(arrows.next, snapshot.canScrollNext);
    return snapshot;
  };

  const mapArrows = (nodes) => {
    const arrows = { previous: null, next: null };
    Array.from(nodes || []).forEach((arrow) => {
      if (getDirection(arrow) > 0) arrows.next = arrow;
      else arrows.previous = arrow;
    });
    return arrows;
  };

  const bindCategoryRail = ({ signal } = {}) => {
    const stateApi = window.Doke?.homeRailScrollState;
    const track = document.querySelector(TRACK_SELECTOR);
    const arrowNodes = document.querySelectorAll(ARROW_SELECTOR);
    const arrows = mapArrows(arrowNodes);
    if (!stateApi?.deriveOverflowState || !stateApi?.deriveItemStep || !track || !arrows.previous || !arrows.next) {
      return () => {};
    }

    let frameId = 0;
    let destroyed = false;
    let resizeObserver = null;
    let mutationObserver = null;

    const sync = () => {
      if (destroyed || signal?.aborted) return null;
      return applySnapshot(track, arrows, readSnapshot(track, stateApi));
    };

    const scheduleSync = () => {
      if (destroyed || signal?.aborted || frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        sync();
      });
    };

    const observeGeometry = () => {
      if (!resizeObserver) return;
      resizeObserver.disconnect();
      resizeObserver.observe(track);
      Array.from(track.children || []).forEach((item) => resizeObserver.observe(item));
    };

    const onArrowClick = (event) => {
      const arrow = event.currentTarget;
      if (!arrow || arrow.disabled) return;
      event.preventDefault();
      const reducedMotion = window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches === true;
      const step = measureStep(track, stateApi);
      track.scrollBy({
        left: step * getDirection(arrow),
        behavior: stateApi.resolveScrollBehavior(reducedMotion)
      });
    };

    const cleanup = () => {
      if (destroyed) return;
      destroyed = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      track.removeEventListener('scroll', scheduleSync);
      window.removeEventListener('resize', scheduleSync);
      arrows.previous.removeEventListener('click', onArrowClick);
      arrows.next.removeEventListener('click', onArrowClick);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };

    track.addEventListener('scroll', scheduleSync, { passive: true });
    window.addEventListener('resize', scheduleSync, { passive: true });
    arrows.previous.addEventListener('click', onArrowClick);
    arrows.next.addEventListener('click', onArrowClick);

    if (typeof window.ResizeObserver === 'function') {
      resizeObserver = new window.ResizeObserver(scheduleSync);
      observeGeometry();
    }

    if (typeof window.MutationObserver === 'function') {
      mutationObserver = new window.MutationObserver(() => {
        observeGeometry();
        scheduleSync();
      });
      mutationObserver.observe(track, { childList: true });
    }

    if (document.fonts?.ready?.then) {
      document.fonts.ready.then(scheduleSync, () => {});
    }

    signal?.addEventListener?.('abort', cleanup, { once: true });
    sync();
    return cleanup;
  };

  return Object.freeze({
    create({ signal } = {}) {
      return () => bindCategoryRail({ signal });
    }
  });
})();
