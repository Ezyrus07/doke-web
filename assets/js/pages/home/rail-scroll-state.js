(function () {
  'use strict';

  var root = typeof window !== 'undefined' ? window : globalThis;
  var Doke = root.Doke || (root.Doke = {});
  var DEFAULT_EPSILON = 1;

  var STATES = Object.freeze({
    READY_FITS: 'ready-fits',
    READY_OVERFLOW_START: 'ready-overflow-start',
    READY_OVERFLOW_MIDDLE: 'ready-overflow-middle',
    READY_OVERFLOW_END: 'ready-overflow-end'
  });

  function finiteNumber(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function positiveNumber(value, fallback) {
    var parsed = finiteNumber(value, fallback);
    return parsed > 0 ? parsed : fallback;
  }

  function normalizeMetrics(input) {
    input = input || {};
    var clientWidth = Math.max(0, finiteNumber(input.clientWidth, 0));
    var scrollWidth = Math.max(clientWidth, finiteNumber(input.scrollWidth, clientWidth));
    var maxScroll = Math.max(0, scrollWidth - clientWidth);
    var scrollLeft = finiteNumber(input.scrollLeft, 0);
    var epsilon = positiveNumber(input.epsilon, DEFAULT_EPSILON);

    return Object.freeze({
      clientWidth: clientWidth,
      scrollWidth: scrollWidth,
      maxScroll: maxScroll,
      scrollLeft: Math.min(maxScroll, Math.max(0, scrollLeft)),
      epsilon: epsilon
    });
  }

  function deriveOverflowState(input) {
    var metrics = normalizeMetrics(input);
    var hasOverflow = metrics.maxScroll > metrics.epsilon;
    var atStart = !hasOverflow || metrics.scrollLeft <= metrics.epsilon;
    var atEnd = !hasOverflow || metrics.maxScroll - metrics.scrollLeft <= metrics.epsilon;
    var state = STATES.READY_OVERFLOW_MIDDLE;

    if (!hasOverflow) state = STATES.READY_FITS;
    else if (atStart) state = STATES.READY_OVERFLOW_START;
    else if (atEnd) state = STATES.READY_OVERFLOW_END;

    return Object.freeze({
      state: state,
      hasOverflow: hasOverflow,
      atStart: atStart,
      atEnd: atEnd,
      canScrollPrevious: hasOverflow && !atStart,
      canScrollNext: hasOverflow && !atEnd,
      metrics: metrics
    });
  }

  function deriveItemStep(input) {
    input = input || {};
    var firstOffset = finiteNumber(input.firstOffset, 0);
    var secondOffset = finiteNumber(input.secondOffset, NaN);
    var measuredDistance = secondOffset - firstOffset;
    if (Number.isFinite(measuredDistance) && measuredDistance > DEFAULT_EPSILON) {
      return measuredDistance;
    }

    var itemWidth = positiveNumber(input.itemWidth, 0);
    var gap = Math.max(0, finiteNumber(input.gap, 0));
    if (itemWidth > 0) return itemWidth + gap;

    return positiveNumber(input.fallbackStep, 1);
  }

  function resolveScrollBehavior(reducedMotion) {
    return reducedMotion ? 'auto' : 'smooth';
  }

  Doke.homeRailScrollState = Object.freeze({
    states: STATES,
    defaultEpsilon: DEFAULT_EPSILON,
    normalizeMetrics: normalizeMetrics,
    deriveOverflowState: deriveOverflowState,
    deriveItemStep: deriveItemStep,
    resolveScrollBehavior: resolveScrollBehavior
  });
})();
