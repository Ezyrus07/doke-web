(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var CONTRACT = 'home-rail-scroll-state-v1';
  var DEFAULT_TOLERANCE = 2;
  var DEFAULT_MIN_STEP = 220;

  function finiteNumber(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function nonNegative(value) {
    return Math.max(0, finiteNumber(value, 0));
  }

  function positive(value, fallback) {
    var number = finiteNumber(value, fallback);
    return number > 0 ? number : fallback;
  }

  function normalizeMetrics(input) {
    input = input || {};
    var clientWidth = nonNegative(input.clientWidth);
    var scrollWidth = Math.max(clientWidth, nonNegative(input.scrollWidth));
    var maxScroll = Math.max(0, scrollWidth - clientWidth);
    var scrollLeft = Math.min(maxScroll, nonNegative(input.scrollLeft));
    var tolerance = nonNegative(input.tolerance == null ? DEFAULT_TOLERANCE : input.tolerance);

    return Object.freeze({
      scrollLeft: scrollLeft,
      clientWidth: clientWidth,
      scrollWidth: scrollWidth,
      maxScroll: maxScroll,
      tolerance: tolerance
    });
  }

  function derive(input) {
    var metrics = normalizeMetrics(input);
    var overflow = metrics.maxScroll > metrics.tolerance;
    var atStart = !overflow || metrics.scrollLeft <= metrics.tolerance;
    var atEnd = !overflow || metrics.maxScroll - metrics.scrollLeft <= metrics.tolerance;

    return Object.freeze({
      contract: CONTRACT,
      scrollLeft: metrics.scrollLeft,
      clientWidth: metrics.clientWidth,
      scrollWidth: metrics.scrollWidth,
      maxScroll: metrics.maxScroll,
      tolerance: metrics.tolerance,
      overflow: overflow,
      atStart: atStart,
      atEnd: atEnd,
      canPrevious: overflow && !atStart,
      canNext: overflow && !atEnd
    });
  }

  function resolveStep(input) {
    input = input || {};
    var clientWidth = nonNegative(input.clientWidth);
    var amountFactor = positive(input.amountFactor, 0.82);
    var minStep = positive(input.minStep, DEFAULT_MIN_STEP);
    return Math.max(minStep, Math.round(clientWidth * amountFactor));
  }

  function resolveTarget(input) {
    input = input || {};
    var metrics = normalizeMetrics(input);
    var direction = input.direction === 'previous' || input.direction === 'prev' || Number(input.direction) < 0 ? -1 : 1;
    var step = resolveStep({
      clientWidth: metrics.clientWidth,
      amountFactor: input.amountFactor,
      minStep: input.minStep
    });
    var target = Math.min(metrics.maxScroll, Math.max(0, metrics.scrollLeft + step * direction));

    return Object.freeze({
      contract: CONTRACT,
      direction: direction < 0 ? 'previous' : 'next',
      step: step,
      target: target,
      delta: target - metrics.scrollLeft,
      maxScroll: metrics.maxScroll
    });
  }

  Doke.homeRailScrollState = Object.freeze({
    contract: CONTRACT,
    normalizeMetrics: normalizeMetrics,
    derive: derive,
    resolveStep: resolveStep,
    resolveTarget: resolveTarget
  });
})();
