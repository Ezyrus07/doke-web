(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  if (Doke.responsiveExperience) {
    root.DokeResponsiveExperience = Doke.responsiveExperience;
    return;
  }

  var VERSION = '20260804-ux-resp-001-v1';
  var BREAKPOINT_VERSION = 'responsive-breakpoints-v1';
  var BREAKPOINTS = Object.freeze({
    microMax: 359,
    compactMax: 600,
    mediumMax: 1024,
    wideMin: 1025,
    expandedMin: 1200
  });
  var LAYOUT_MODES = Object.freeze({
    COMPACT: 'COMPACT',
    MEDIUM: 'MEDIUM',
    WIDE: 'WIDE'
  });
  var INPUT_MODES = Object.freeze({
    TOUCH: 'TOUCH',
    POINTER: 'POINTER',
    MIXED: 'MIXED',
    KEYBOARD_ONLY: 'KEYBOARD_ONLY',
    UNKNOWN: 'UNKNOWN'
  });
  var KEYBOARD_STATES = Object.freeze({
    CLOSED: 'CLOSED',
    OPENING: 'OPENING',
    OPEN: 'OPEN',
    CLOSING: 'CLOSING',
    UNKNOWN: 'UNKNOWN'
  });
  var OVERFLOW_STATES = Object.freeze({
    CLEAR: 'CLEAR',
    OVERFLOW: 'OVERFLOW',
    UNKNOWN: 'UNKNOWN'
  });
  var ORIENTATIONS = Object.freeze({
    PORTRAIT: 'PORTRAIT',
    LANDSCAPE: 'LANDSCAPE',
    SQUARE: 'SQUARE'
  });
  var OVERFLOW_TOLERANCE = 2;
  var KEYBOARD_MIN_DELTA = 150;
  var KEYBOARD_RATIO = 0.18;
  var listeners = new Set();
  var boundaries = new Map();
  var rafId = 0;
  var auditRafId = 0;
  var initialized = false;
  var sequence = 0;
  var previousSnapshot = null;
  var mutationObserver = null;
  var resizeObserver = null;

  function number(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number(fallback || 0);
  }

  function round(value) {
    return Math.max(0, Math.round(number(value, 0)));
  }

  function copy(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function media(query) {
    try {
      return Boolean(root.matchMedia && root.matchMedia(query).matches);
    } catch (error) {
      return false;
    }
  }

  function classify(width) {
    var normalized = round(width);
    var layoutMode = normalized <= BREAKPOINTS.compactMax
      ? LAYOUT_MODES.COMPACT
      : normalized <= BREAKPOINTS.mediumMax
      ? LAYOUT_MODES.MEDIUM
      : LAYOUT_MODES.WIDE;

    return Object.freeze({
      width: normalized,
      layoutMode: layoutMode,
      micro: normalized <= BREAKPOINTS.microMax,
      expanded: normalized >= BREAKPOINTS.expandedMin
    });
  }

  function getLayoutViewport() {
    var doc = document.documentElement || {};
    var width = round(doc.clientWidth || root.innerWidth || 0);
    var height = round(doc.clientHeight || root.innerHeight || 0);
    return Object.freeze({ width: width, height: height });
  }

  function getVisualViewport(layoutViewport) {
    var viewport = root.visualViewport;
    if (!viewport) {
      return Object.freeze({
        available: false,
        width: layoutViewport.width,
        height: layoutViewport.height,
        offsetTop: 0,
        offsetLeft: 0,
        scale: 1
      });
    }

    return Object.freeze({
      available: true,
      width: round(viewport.width || layoutViewport.width),
      height: round(viewport.height || layoutViewport.height),
      offsetTop: round(viewport.offsetTop || 0),
      offsetLeft: round(viewport.offsetLeft || 0),
      scale: Math.max(0.1, number(viewport.scale, 1))
    });
  }

  function getOrientation(layoutViewport) {
    if (layoutViewport.width === layoutViewport.height) return ORIENTATIONS.SQUARE;
    return layoutViewport.width > layoutViewport.height
      ? ORIENTATIONS.LANDSCAPE
      : ORIENTATIONS.PORTRAIT;
  }

  function getInputMode() {
    var coarse = media('(pointer: coarse)') || media('(any-pointer: coarse)');
    var fine = media('(pointer: fine)') || media('(any-pointer: fine)');
    var hover = media('(hover: hover)') || media('(any-hover: hover)');

    if (coarse && fine) return INPUT_MODES.MIXED;
    if (coarse) return INPUT_MODES.TOUCH;
    if (fine || hover) return INPUT_MODES.POINTER;
    if (!coarse && !fine && !hover) return INPUT_MODES.KEYBOARD_ONLY;
    return INPUT_MODES.UNKNOWN;
  }

  function isEditable(node) {
    if (!node || node.nodeType !== 1) return false;
    var tag = String(node.tagName || '').toLowerCase();
    return tag === 'input'
      || tag === 'textarea'
      || tag === 'select'
      || node.isContentEditable === true
      || node.getAttribute && node.getAttribute('contenteditable') === 'true';
  }

  function getKeyboardState(layoutViewport, visualViewport) {
    if (!visualViewport.available) return KEYBOARD_STATES.UNKNOWN;
    var delta = Math.max(0, layoutViewport.height - visualViewport.height - visualViewport.offsetTop);
    var threshold = Math.max(KEYBOARD_MIN_DELTA, layoutViewport.height * KEYBOARD_RATIO);
    var focusedEditable = isEditable(document.activeElement);
    var open = focusedEditable && delta >= threshold;
    var previous = previousSnapshot && previousSnapshot.keyboardState;

    if (open && previous === KEYBOARD_STATES.CLOSED) return KEYBOARD_STATES.OPENING;
    if (!open && (previous === KEYBOARD_STATES.OPEN || previous === KEYBOARD_STATES.OPENING)) {
      return KEYBOARD_STATES.CLOSING;
    }
    return open ? KEYBOARD_STATES.OPEN : KEYBOARD_STATES.CLOSED;
  }

  function safeArea() {
    var probe = document.querySelector && document.querySelector('[data-doke-safe-area-probe]');
    if (!probe || !root.getComputedStyle) {
      return Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });
    }
    var style = root.getComputedStyle(probe);
    return Object.freeze({
      top: round(style.paddingTop),
      right: round(style.paddingRight),
      bottom: round(style.paddingBottom),
      left: round(style.paddingLeft)
    });
  }

  function ensureSafeAreaProbe() {
    if (!document.body || !document.createElement) return null;
    var existing = document.querySelector('[data-doke-safe-area-probe]');
    if (existing) return existing;
    var probe = document.createElement('span');
    probe.hidden = true;
    probe.setAttribute('aria-hidden', 'true');
    probe.setAttribute('data-doke-safe-area-probe', '');
    probe.className = 'doke-responsive-safe-area-probe';
    document.body.appendChild(probe);
    return probe;
  }

  function boundaryId(node) {
    if (!node || node.nodeType !== 1) return '';
    var explicit = node.getAttribute('data-responsive-boundary');
    if (explicit) return String(explicit).trim().slice(0, 80);
    var id = String(node.id || '').trim();
    if (id) return ('id:' + id).slice(0, 80);
    return String(node.tagName || 'node').toLowerCase();
  }

  function overflowFor(node) {
    if (!node) return false;
    var clientWidth = round(node.clientWidth);
    var scrollWidth = round(node.scrollWidth);
    return clientWidth > 0 && scrollWidth > clientWidth + OVERFLOW_TOLERANCE;
  }

  function markBoundary(node, overflow) {
    if (!node || node.nodeType !== 1) return;
    node.setAttribute('data-doke-inline-overflow', overflow ? 'true' : 'false');
    node.classList && node.classList.toggle('doke-responsive-has-overflow', overflow);
  }

  function collectBoundaries() {
    var nodes = [];
    if (document.documentElement) nodes.push(document.documentElement);
    if (document.querySelectorAll) {
      Array.prototype.forEach.call(
        document.querySelectorAll('[data-responsive-boundary]'),
        function (node) { nodes.push(node); }
      );
    }
    boundaries.forEach(function (record) {
      if (record && record.node && record.node.isConnected !== false) nodes.push(record.node);
    });
    return Array.from(new Set(nodes));
  }

  function auditOverflow(reason) {
    var nodes = collectBoundaries();
    var overflowCount = 0;
    var boundaryCount = 0;
    var rootOverflow = false;

    nodes.forEach(function (node, index) {
      var overflow = overflowFor(node);
      if (index === 0) rootOverflow = overflow;
      else boundaryCount += 1;
      if (overflow) overflowCount += 1;
      markBoundary(node, overflow);
    });

    var result = Object.freeze({
      state: overflowCount > 0 ? OVERFLOW_STATES.OVERFLOW : OVERFLOW_STATES.CLEAR,
      rootOverflow: rootOverflow,
      boundaryCount: boundaryCount,
      overflowCount: overflowCount,
      reason: String(reason || 'audit')
    });

    if (document.documentElement) {
      document.documentElement.dataset.dokeOverflowState = result.state.toLowerCase();
      document.documentElement.dataset.dokeOverflowCount = String(result.overflowCount);
    }

    document.dispatchEvent(new CustomEvent('doke:responsive-overflow-audit', {
      detail: {
        version: VERSION,
        state: result.state,
        rootOverflow: result.rootOverflow,
        boundaryCount: result.boundaryCount,
        overflowCount: result.overflowCount,
        reason: result.reason
      }
    }));
    return result;
  }

  function scheduleOverflowAudit(reason) {
    if (auditRafId) root.cancelAnimationFrame(auditRafId);
    auditRafId = root.requestAnimationFrame(function () {
      auditRafId = 0;
      auditOverflow(reason || 'scheduled');
    });
  }

  function syncCss(snapshot) {
    var html = document.documentElement;
    if (!html) return;

    html.dataset.dokeResponsiveVersion = VERSION;
    html.dataset.dokeBreakpointVersion = BREAKPOINT_VERSION;
    html.dataset.dokeLayoutMode = snapshot.layoutMode.toLowerCase();
    html.dataset.dokeDensityMode = snapshot.densityMode.toLowerCase();
    html.dataset.dokeOrientation = snapshot.orientation.toLowerCase();
    html.dataset.dokeInputMode = snapshot.inputMode.toLowerCase();
    html.dataset.dokeKeyboardState = snapshot.keyboardState.toLowerCase();
    html.dataset.dokeViewportMicro = String(snapshot.micro);
    html.dataset.dokeViewportExpanded = String(snapshot.expanded);

    html.style.setProperty('--doke-layout-viewport-width', snapshot.layoutViewport.width + 'px');
    html.style.setProperty('--doke-layout-viewport-height', snapshot.layoutViewport.height + 'px');
    html.style.setProperty('--doke-visual-viewport-width', snapshot.visualViewport.width + 'px');
    html.style.setProperty('--doke-visual-viewport-height', snapshot.visualViewport.height + 'px');
    html.style.setProperty('--doke-visual-viewport-offset-top', snapshot.visualViewport.offsetTop + 'px');
    html.style.setProperty('--doke-visual-viewport-offset-left', snapshot.visualViewport.offsetLeft + 'px');
    html.style.setProperty('--doke-visual-viewport-scale', String(snapshot.visualViewport.scale));
    html.style.setProperty('--doke-keyboard-inset', snapshot.keyboardInset + 'px');
    html.style.setProperty('--doke-safe-area-top', snapshot.safeArea.top + 'px');
    html.style.setProperty('--doke-safe-area-right', snapshot.safeArea.right + 'px');
    html.style.setProperty('--doke-safe-area-bottom', snapshot.safeArea.bottom + 'px');
    html.style.setProperty('--doke-safe-area-left', snapshot.safeArea.left + 'px');
  }

  function syncAppState(snapshot) {
    if (!Doke.state || typeof Doke.state.merge !== 'function') return;
    var viewport = snapshot.layoutMode === LAYOUT_MODES.COMPACT
      ? 'mobile'
      : snapshot.layoutMode === LAYOUT_MODES.MEDIUM
      ? 'tablet'
      : 'desktop';
    Doke.state.merge('ui', {
      viewport: viewport,
      layoutMode: snapshot.layoutMode.toLowerCase(),
      orientation: snapshot.orientation.toLowerCase(),
      keyboardState: snapshot.keyboardState.toLowerCase()
    });
  }

  function buildSnapshot(reason) {
    var layoutViewport = getLayoutViewport();
    var visualViewport = getVisualViewport(layoutViewport);
    var classification = classify(layoutViewport.width);
    var keyboardState = getKeyboardState(layoutViewport, visualViewport);
    var keyboardInset = keyboardState === KEYBOARD_STATES.OPEN || keyboardState === KEYBOARD_STATES.OPENING
      ? Math.max(0, layoutViewport.height - visualViewport.height - visualViewport.offsetTop)
      : 0;

    return Object.freeze({
      sequence: ++sequence,
      version: VERSION,
      breakpointVersion: BREAKPOINT_VERSION,
      reason: String(reason || 'sync'),
      timestamp: Date.now(),
      layoutViewport: layoutViewport,
      visualViewport: visualViewport,
      layoutMode: classification.layoutMode,
      densityMode: classification.expanded ? 'COMPACT' : 'COMFORTABLE',
      micro: classification.micro,
      expanded: classification.expanded,
      inputMode: getInputMode(),
      hoverCapability: media('(hover: hover)') || media('(any-hover: hover)'),
      orientation: getOrientation(layoutViewport),
      keyboardState: keyboardState,
      keyboardInset: round(keyboardInset),
      safeArea: safeArea(),
      reducedMotion: media('(prefers-reduced-motion: reduce)'),
      reducedTransparency: media('(prefers-reduced-transparency: reduce)')
    });
  }

  function snapshotsEqual(left, right) {
    if (!left || !right) return false;
    return left.layoutMode === right.layoutMode
      && left.micro === right.micro
      && left.expanded === right.expanded
      && left.orientation === right.orientation
      && left.inputMode === right.inputMode
      && left.keyboardState === right.keyboardState
      && left.layoutViewport.width === right.layoutViewport.width
      && left.layoutViewport.height === right.layoutViewport.height
      && left.visualViewport.width === right.visualViewport.width
      && left.visualViewport.height === right.visualViewport.height
      && left.visualViewport.offsetTop === right.visualViewport.offsetTop
      && left.visualViewport.scale === right.visualViewport.scale;
  }

  function emit(snapshot, changed) {
    var detail = {
      version: VERSION,
      breakpointVersion: BREAKPOINT_VERSION,
      sequence: snapshot.sequence,
      changed: changed,
      reason: snapshot.reason,
      layoutMode: snapshot.layoutMode,
      densityMode: snapshot.densityMode,
      orientation: snapshot.orientation,
      inputMode: snapshot.inputMode,
      keyboardState: snapshot.keyboardState,
      micro: snapshot.micro,
      expanded: snapshot.expanded,
      layoutWidth: snapshot.layoutViewport.width,
      layoutHeight: snapshot.layoutViewport.height,
      visualWidth: snapshot.visualViewport.width,
      visualHeight: snapshot.visualViewport.height,
      visualScale: snapshot.visualViewport.scale
    };
    document.dispatchEvent(new CustomEvent('doke:responsive-change', { detail: detail }));
    listeners.forEach(function (listener) {
      try { listener(copy(snapshot), detail); } catch (error) {
        console.error && console.error('[DokeResponsiveExperience]', error);
      }
    });
  }

  function sync(reason) {
    ensureSafeAreaProbe();
    var snapshot = buildSnapshot(reason || 'manual');
    var changed = !snapshotsEqual(previousSnapshot, snapshot);
    previousSnapshot = snapshot;
    syncCss(snapshot);
    syncAppState(snapshot);
    if (changed) emit(snapshot, true);
    scheduleOverflowAudit(reason || 'sync');
    return copy(snapshot);
  }

  function scheduleSync(reason) {
    if (rafId) root.cancelAnimationFrame(rafId);
    rafId = root.requestAnimationFrame(function () {
      rafId = 0;
      sync(reason || 'scheduled');
    });
  }

  function registerBoundary(node, options) {
    if (!node || node.nodeType !== 1) {
      throw new TypeError('Responsive boundary requires an Element.');
    }
    options = options || {};
    var id = String(options.id || boundaryId(node) || ('boundary-' + (boundaries.size + 1))).slice(0, 80);
    node.setAttribute('data-responsive-boundary', id);
    if (options.containInline === true) {
      node.setAttribute('data-responsive-contain', 'inline');
      node.classList && node.classList.add('doke-responsive-inline-contain');
    }
    if (options.scrollX === true) {
      node.setAttribute('data-responsive-scroll', 'x');
      node.classList && node.classList.add('doke-responsive-scroll-x');
      if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '0');
      if (!node.hasAttribute('role')) node.setAttribute('role', 'region');
      if (options.label && !node.hasAttribute('aria-label')) {
        node.setAttribute('aria-label', String(options.label).slice(0, 120));
      }
    }
    boundaries.set(id, { id: id, node: node });
    if (resizeObserver) resizeObserver.observe(node);
    scheduleOverflowAudit('boundary-registered');
    return Object.freeze({
      id: id,
      unregister: function () {
        boundaries.delete(id);
        if (resizeObserver) {
          try { resizeObserver.unobserve(node); } catch (error) {}
        }
        node.removeAttribute('data-doke-inline-overflow');
        node.classList && node.classList.remove('doke-responsive-has-overflow');
      }
    });
  }

  function applyNewsPilot() {
    if (!document.body || document.body.dataset.page !== 'novidades') return false;
    var page = document.querySelector('[data-news-page], .news-page');
    if (!page) return false;

    page.setAttribute('data-doke-responsive-pilot', 'novidades');
    registerBoundary(page, { id: 'news-page', containInline: true });

    var layout = page.querySelector('.news-layout');
    if (layout) registerBoundary(layout, { id: 'news-layout', containInline: true });

    var grid = page.querySelector('[data-news-grid], .news-grid');
    if (grid) registerBoundary(grid, { id: 'news-grid', containInline: true });

    var filters = page.querySelector('.news-filters');
    if (filters) {
      registerBoundary(filters, {
        id: 'news-filters',
        containInline: true,
        scrollX: true,
        label: 'Filtros de novidades'
      });
    }
    return true;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return function () {};
    listeners.add(listener);
    return function unsubscribe() { listeners.delete(listener); };
  }

  function getSnapshot() {
    return previousSnapshot ? copy(previousSnapshot) : sync('snapshot-request');
  }

  function init() {
    if (initialized) return getSnapshot();
    initialized = true;
    ensureSafeAreaProbe();
    applyNewsPilot();

    root.addEventListener('resize', function () { scheduleSync('window-resize'); }, { passive: true });
    root.addEventListener('orientationchange', function () { scheduleSync('orientation-change'); }, { passive: true });
    root.addEventListener('pageshow', function () { scheduleSync('pageshow'); }, { passive: true });

    if (root.visualViewport && root.visualViewport.addEventListener) {
      root.visualViewport.addEventListener('resize', function () { scheduleSync('visual-viewport-resize'); }, { passive: true });
      root.visualViewport.addEventListener('scroll', function () { scheduleSync('visual-viewport-scroll'); }, { passive: true });
    }

    if (root.ResizeObserver) {
      resizeObserver = new root.ResizeObserver(function () {
        scheduleOverflowAudit('resize-observer');
      });
      collectBoundaries().forEach(function (node) {
        try { resizeObserver.observe(node); } catch (error) {}
      });
    }

    if (root.MutationObserver && document.body) {
      mutationObserver = new root.MutationObserver(function () {
        applyNewsPilot();
        scheduleOverflowAudit('mutation');
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    document.addEventListener('doke:navigation-lifecycle-route', function (event) {
      var state = event && event.detail && event.detail.state;
      if (state === 'ready' || state === 'empty' || state === 'committed') {
        root.setTimeout(function () {
          applyNewsPilot();
          scheduleSync('route-ready');
        }, 0);
      }
    });

    var snapshot = sync('init');
    document.dispatchEvent(new CustomEvent('doke:responsive-ready', {
      detail: {
        version: VERSION,
        breakpointVersion: BREAKPOINT_VERSION,
        layoutMode: snapshot.layoutMode
      }
    }));
    return snapshot;
  }

  var api = Object.freeze({
    version: VERSION,
    breakpointVersion: BREAKPOINT_VERSION,
    breakpoints: BREAKPOINTS,
    layoutModes: LAYOUT_MODES,
    inputModes: INPUT_MODES,
    keyboardStates: KEYBOARD_STATES,
    overflowStates: OVERFLOW_STATES,
    orientations: ORIENTATIONS,
    classify: classify,
    getLayoutViewport: getLayoutViewport,
    getVisualViewport: function () { return copy(getVisualViewport(getLayoutViewport())); },
    getSnapshot: getSnapshot,
    sync: sync,
    scheduleSync: scheduleSync,
    auditOverflow: auditOverflow,
    registerBoundary: registerBoundary,
    subscribe: subscribe,
    applyNewsPilot: applyNewsPilot
  });

  Doke.responsiveExperience = api;
  root.DokeResponsiveExperience = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
