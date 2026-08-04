/* Doke overlay and focus experience
 * Responsibility: one stack authority for modal/drawer/sheet/lightbox focus,
 * Escape, Tab trapping, background inertness, scroll lock and route focus.
 */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var VERSION = '20260804-ux-nav-001-v1';

  if (Doke.overlayExperience && Doke.overlayExperience.version === VERSION) return;

  var KINDS = Object.freeze({
    MODAL: 'modal',
    DRAWER: 'drawer',
    SHEET: 'sheet',
    LIGHTBOX: 'lightbox',
    POPOVER: 'popover'
  });

  var CLOSE_REASONS = Object.freeze({
    ESCAPE: 'escape',
    BACKDROP: 'backdrop',
    ACTION: 'action',
    PROGRAMMATIC: 'programmatic',
    ROUTE_CHANGE: 'route-change',
    REPLACED: 'replaced',
    OWNER_REMOVED: 'owner-removed'
  });

  var FOCUSABLE_SELECTOR = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  var ROUTE_TARGET_SELECTORS = Object.freeze([
    '[data-route-focus-target]',
    '[data-page-title]',
    'main h1',
    '[role="main"] h1',
    'main',
    '[role="main"]',
    '[data-shell-main]'
  ]);

  var stack = [];
  var subscribers = new Set();
  var managedInert = new Map();
  var sequence = 0;
  var scrollSnapshot = null;
  var routeFocusSequence = 0;
  var routeFocusFrame = 0;
  var lastRouteIdentity = readRouteIdentity();

  function now() {
    return Date.now();
  }

  function createId(prefix) {
    sequence += 1;
    return String(prefix || 'overlay') + '-' + now().toString(36) + '-' + sequence.toString(36);
  }

  function sanitizeId(value) {
    var id = String(value || '').trim();
    if (!id) id = createId('overlay');
    if (!/^[A-Za-z0-9][A-Za-z0-9:_-]{0,95}$/.test(id)) {
      var error = new Error('Overlay id must be a technical identifier.');
      error.code = 'DOKE_OVERLAY_INVALID_ID';
      throw error;
    }
    return id;
  }

  function isElement(node) {
    return Boolean(node && node.nodeType === 1);
  }

  function isConnected(node) {
    if (!isElement(node)) return false;
    if (typeof node.isConnected === 'boolean') return node.isConnected;
    return Boolean(document.documentElement && document.documentElement.contains(node));
  }

  function isEditable(node) {
    if (!isElement(node)) return false;
    var tag = String(node.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    return node.getAttribute && node.getAttribute('contenteditable') === 'true';
  }

  function isHidden(node) {
    if (!isElement(node)) return true;
    if (node.hidden === true) return true;
    if (node.getAttribute && node.getAttribute('aria-hidden') === 'true') return true;
    try {
      var style = root.getComputedStyle ? root.getComputedStyle(node) : null;
      if (style && (style.display === 'none' || style.visibility === 'hidden')) return true;
    } catch (error) {}
    return false;
  }

  function isDisabled(node) {
    return Boolean(node && (node.disabled === true || node.getAttribute && node.getAttribute('aria-disabled') === 'true'));
  }

  function canFocus(node) {
    return isElement(node) && isConnected(node) && !isHidden(node) && !isDisabled(node) && typeof node.focus === 'function';
  }

  function focusables(surface) {
    if (!isElement(surface) || typeof surface.querySelectorAll !== 'function') return [];
    return Array.prototype.slice.call(surface.querySelectorAll(FOCUSABLE_SELECTOR)).filter(function (node) {
      return canFocus(node) && Number(node.getAttribute && node.getAttribute('tabindex')) !== -1;
    });
  }

  function ensureProgrammaticFocus(node, marker) {
    if (!isElement(node)) return false;
    var tag = String(node.tagName || '').toLowerCase();
    var naturallyFocusable = ['a', 'button', 'input', 'select', 'textarea'].indexOf(tag) !== -1;
    if (!naturallyFocusable && !node.hasAttribute('tabindex')) {
      node.setAttribute('tabindex', '-1');
      node.setAttribute(marker || 'data-doke-temporary-focus-target', 'true');
      return true;
    }
    return false;
  }

  function focusNode(node, options) {
    if (!canFocus(node)) return false;
    try {
      node.focus({ preventScroll: !options || options.preventScroll !== false });
      return document.activeElement === node || true;
    } catch (error) {
      try {
        node.focus();
        return true;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  function routeSnapshot() {
    try {
      if (Doke.navigationLifecycle && typeof Doke.navigationLifecycle.getSnapshot === 'function') {
        return Doke.navigationLifecycle.getSnapshot();
      }
    } catch (error) {}
    return null;
  }

  function readRouteIdentity() {
    var snapshot = routeSnapshot();
    var route = snapshot && snapshot.route || {};
    return Object.freeze({
      id: Number(route.id || 0),
      path: String(route.to || route.path || root.location && root.location.pathname || ''),
      href: String(root.location && root.location.href || '')
    });
  }

  function sameRoute(left, right) {
    if (!left || !right) return false;
    if (left.id && right.id) return Number(left.id) === Number(right.id);
    return String(left.path || left.href || '') === String(right.path || right.href || '');
  }

  function publicRecord(record) {
    return Object.freeze({
      id: record.id,
      kind: record.kind,
      depth: stack.indexOf(record) + 1,
      top: topRecord() === record,
      modal: record.modal,
      closeOnEscape: record.closeOnEscape,
      trapFocus: record.trapFocus,
      lockScroll: record.lockScroll,
      inertBackground: record.inertBackground,
      routeId: Number(record.routeIdentity.id || 0),
      openedAt: record.openedAt,
      state: record.state
    });
  }

  function getStack() {
    return stack.map(publicRecord);
  }

  function getSnapshot() {
    return Object.freeze({
      version: VERSION,
      depth: stack.length,
      topId: topRecord() ? topRecord().id : '',
      scrollLocked: Boolean(scrollSnapshot),
      routeFocusSequence: routeFocusSequence,
      stack: getStack()
    });
  }

  function emit(name, detail) {
    var safe = Object.assign({ version: VERSION, depth: stack.length }, detail || {});
    try {
      document.dispatchEvent(new CustomEvent(name, { detail: safe }));
    } catch (error) {}
    subscribers.forEach(function (listener) {
      try { listener(name, safe); } catch (error) {}
    });
  }

  function topRecord() {
    return stack.length ? stack[stack.length - 1] : null;
  }

  function recordById(id) {
    return stack.find(function (record) { return record.id === id; }) || null;
  }

  function rememberInert(node) {
    if (!isElement(node) || managedInert.has(node)) return;
    managedInert.set(node, {
      hadInert: node.hasAttribute && node.hasAttribute('inert'),
      inert: Boolean(node.inert),
      hadAriaHidden: node.hasAttribute && node.hasAttribute('aria-hidden'),
      ariaHidden: node.getAttribute && node.getAttribute('aria-hidden')
    });
  }

  function setInert(node) {
    if (!isElement(node)) return;
    rememberInert(node);
    try { node.inert = true; } catch (error) {}
    try { node.setAttribute('inert', ''); } catch (error) {}
    try { node.setAttribute('aria-hidden', 'true'); } catch (error) {}
    try { node.setAttribute('data-doke-overlay-inert', 'true'); } catch (error) {}
  }

  function restoreManagedInert() {
    managedInert.forEach(function (snapshot, node) {
      if (!isElement(node)) return;
      try { node.inert = snapshot.inert; } catch (error) {}
      try {
        if (snapshot.hadInert) node.setAttribute('inert', '');
        else node.removeAttribute('inert');
      } catch (error) {}
      try {
        if (snapshot.hadAriaHidden) node.setAttribute('aria-hidden', snapshot.ariaHidden);
        else node.removeAttribute('aria-hidden');
      } catch (error) {}
      try { node.removeAttribute('data-doke-overlay-inert'); } catch (error) {}
    });
    managedInert.clear();
  }

  function exemptBodyChild(child, top) {
    if (!isElement(child)) return true;
    var tag = String(child.tagName || '').toLowerCase();
    if (['script', 'style', 'link', 'meta', 'template'].indexOf(tag) !== -1) return true;
    if (child === top.root) return true;
    if (typeof child.contains === 'function' && child.contains(top.root)) return true;
    return false;
  }

  function syncInertness() {
    restoreManagedInert();
    var top = topRecord();
    if (!top || !top.inertBackground || !document.body) return;

    Array.prototype.slice.call(document.body.children || []).forEach(function (child) {
      if (!exemptBodyChild(child, top)) setInert(child);
    });

    stack.slice(0, -1).forEach(function (record) {
      if (record.root !== top.root) setInert(record.root);
    });

    try {
      top.root.inert = false;
      top.root.removeAttribute('inert');
      top.root.removeAttribute('data-doke-overlay-inert');
      if (top.root.getAttribute('aria-hidden') === 'true') top.root.setAttribute('aria-hidden', 'false');
    } catch (error) {}
  }

  function lockScroll() {
    if (scrollSnapshot || !document.documentElement || !document.body) return;
    scrollSnapshot = {
      htmlOverflow: document.documentElement.style && document.documentElement.style.overflow || '',
      bodyOverflow: document.body.style && document.body.style.overflow || '',
      htmlHadClass: document.documentElement.classList && document.documentElement.classList.contains('doke-overlay-stack-open'),
      bodyHadClass: document.body.classList && document.body.classList.contains('doke-overlay-stack-open')
    };
    try { document.documentElement.style.overflow = 'hidden'; } catch (error) {}
    try { document.body.style.overflow = 'hidden'; } catch (error) {}
    try { document.documentElement.classList.add('doke-overlay-stack-open'); } catch (error) {}
    try { document.body.classList.add('doke-overlay-stack-open'); } catch (error) {}
  }

  function unlockScroll() {
    if (!scrollSnapshot || !document.documentElement || !document.body) return;
    try { document.documentElement.style.overflow = scrollSnapshot.htmlOverflow; } catch (error) {}
    try { document.body.style.overflow = scrollSnapshot.bodyOverflow; } catch (error) {}
    try {
      if (!scrollSnapshot.htmlHadClass) document.documentElement.classList.remove('doke-overlay-stack-open');
      if (!scrollSnapshot.bodyHadClass) document.body.classList.remove('doke-overlay-stack-open');
    } catch (error) {}
    scrollSnapshot = null;
  }

  function syncScrollLock() {
    var required = stack.some(function (record) { return record.lockScroll; });
    if (required) lockScroll();
    else unlockScroll();
    try {
      document.documentElement.setAttribute('data-doke-overlay-depth', String(stack.length));
      document.body.setAttribute('data-doke-overlay-depth', String(stack.length));
    } catch (error) {}
  }

  function syncStackMetadata() {
    stack.forEach(function (record, index) {
      var isTop = index === stack.length - 1;
      record.root.setAttribute('data-doke-overlay-id', record.id);
      record.root.setAttribute('data-doke-overlay-kind', record.kind);
      record.root.setAttribute('data-doke-overlay-depth', String(index + 1));
      record.root.setAttribute('data-doke-overlay-top', String(isTop));
      if (record.root.style && typeof record.root.style.setProperty === 'function') {
        record.root.style.setProperty('--doke-overlay-depth', String(index + 1));
      }
    });
    syncScrollLock();
    syncInertness();
  }

  function resolveInitialFocus(record) {
    var candidate = record.initialFocus;
    if (typeof candidate === 'function') {
      try { candidate = candidate(publicRecord(record)); } catch (error) { candidate = null; }
    }
    if (typeof candidate === 'string' && record.surface.querySelector) {
      candidate = record.surface.querySelector(candidate);
    }
    if (canFocus(candidate)) return candidate;

    var autofocus = record.surface.querySelector && record.surface.querySelector('[autofocus], [data-overlay-initial-focus]');
    if (canFocus(autofocus)) return autofocus;

    var available = focusables(record.surface);
    if (available.length) return available[0];

    ensureProgrammaticFocus(record.surface, 'data-doke-overlay-surface-focusable');
    return record.surface;
  }

  function focusInitialRecord(record) {
    if (!record || topRecord() !== record || record.state !== 'open') return false;
    var target = resolveInitialFocus(record);
    var focused = focusNode(target, { preventScroll: true });
    if (focused) record.lastFocusedWithin = target;
    return focused;
  }

  function requestCloseRecord(record, reason, sourceEvent) {
    if (!record || record.state !== 'open' || topRecord() !== record) return false;
    var safeReason = String(reason || CLOSE_REASONS.PROGRAMMATIC);
    emit('doke:overlay-close-requested', {
      id: record.id,
      kind: record.kind,
      reason: safeReason,
      routeId: Number(record.routeIdentity.id || 0)
    });

    if (typeof record.onRequestClose === 'function') {
      try {
        record.onRequestClose(Object.freeze({
          id: record.id,
          kind: record.kind,
          reason: safeReason,
          sourceEvent: sourceEvent || null
        }));
        return true;
      } catch (error) {
        emit('doke:overlay-close-request-failed', {
          id: record.id,
          kind: record.kind,
          reason: safeReason,
          errorCode: String(error && error.code || 'OVERLAY_CLOSE_CALLBACK_FAILED')
        });
        return false;
      }
    }

    closeRecord(record, { reason: safeReason });
    return true;
  }

  function validReturnTarget(record, currentRoute) {
    if (!record.returnFocus || !sameRoute(record.routeIdentity, currentRoute)) return null;
    return canFocus(record.trigger) ? record.trigger : null;
  }

  function closeRecord(record, options) {
    options = options || {};
    if (!record || record.state !== 'open') return false;
    var index = stack.indexOf(record);
    if (index === -1) return false;

    record.state = 'closed';
    stack.splice(index, 1);

    try {
      record.root.removeAttribute('data-doke-overlay-id');
      record.root.removeAttribute('data-doke-overlay-kind');
      record.root.removeAttribute('data-doke-overlay-depth');
      record.root.removeAttribute('data-doke-overlay-top');
      record.root.setAttribute('aria-hidden', 'true');
      record.surface.removeAttribute('data-doke-overlay-surface');
      record.surface.removeAttribute('data-doke-overlay-surface-focusable');
      if (record.root.style && typeof record.root.style.removeProperty === 'function') {
        record.root.style.removeProperty('--doke-overlay-depth');
      }
    } catch (error) {}

    syncStackMetadata();

    var nextTop = topRecord();
    var currentRoute = readRouteIdentity();
    var restore = options.restoreFocus !== false ? validReturnTarget(record, currentRoute) : null;

    if (nextTop) {
      var active = document.activeElement;
      if (!nextTop.surface.contains(active)) focusInitialRecord(nextTop);
    } else if (restore) {
      focusNode(restore, { preventScroll: true });
    } else if (!sameRoute(record.routeIdentity, currentRoute)) {
      scheduleRouteFocus({ reason: 'overlay-closed-after-route-change', force: true });
    }

    emit('doke:overlay-closed', {
      id: record.id,
      kind: record.kind,
      reason: String(options.reason || CLOSE_REASONS.PROGRAMMATIC),
      restoredFocus: Boolean(restore),
      routeId: Number(currentRoute.id || 0)
    });

    if (typeof record.onAfterClose === 'function') {
      try { record.onAfterClose(publicRecord(record)); } catch (error) {}
    }
    return true;
  }

  function open(options) {
    options = options || {};
    var id = sanitizeId(options.id);
    if (recordById(id)) {
      var duplicate = new Error('Overlay id is already open.');
      duplicate.code = 'DOKE_OVERLAY_DUPLICATE_ID';
      throw duplicate;
    }

    var overlayRoot = options.root;
    var surface = options.surface || overlayRoot;
    if (!isElement(overlayRoot) || !isElement(surface)) {
      var invalid = new TypeError('Overlay root and surface must be elements.');
      invalid.code = 'DOKE_OVERLAY_INVALID_ELEMENT';
      throw invalid;
    }
    if (typeof overlayRoot.contains === 'function' && !overlayRoot.contains(surface) && overlayRoot !== surface) {
      var detached = new Error('Overlay surface must belong to its root.');
      detached.code = 'DOKE_OVERLAY_SURFACE_OUTSIDE_ROOT';
      throw detached;
    }

    var kind = String(options.kind || KINDS.MODAL).toLowerCase();
    if (Object.values(KINDS).indexOf(kind) === -1) kind = KINDS.MODAL;
    var modal = options.modal !== false && kind !== KINDS.POPOVER;

    var record = {
      id: id,
      kind: kind,
      root: overlayRoot,
      surface: surface,
      trigger: isElement(options.trigger) ? options.trigger : document.activeElement,
      initialFocus: options.initialFocus || null,
      modal: modal,
      closeOnEscape: options.closeOnEscape !== false,
      trapFocus: options.trapFocus !== false && modal,
      lockScroll: options.lockScroll !== false && modal,
      inertBackground: options.inertBackground !== false && modal,
      returnFocus: options.returnFocus !== false,
      onRequestClose: options.onRequestClose,
      onAfterClose: options.onAfterClose,
      routeIdentity: readRouteIdentity(),
      openedAt: now(),
      lastFocusedWithin: null,
      state: 'open',
      handle: null
    };

    record.handle = Object.freeze({
      id: record.id,
      close: function (closeOptions) { return closeRecord(record, closeOptions || {}); },
      requestClose: function (reason) { return requestCloseRecord(record, reason); },
      focusInitial: function () { return focusInitialRecord(record); },
      isTop: function () { return topRecord() === record; },
      getSnapshot: function () { return publicRecord(record); }
    });

    stack.push(record);
    try {
      overlayRoot.setAttribute('aria-hidden', 'false');
      surface.setAttribute('data-doke-overlay-surface', '');
    } catch (error) {}
    syncStackMetadata();

    emit('doke:overlay-opened', {
      id: record.id,
      kind: record.kind,
      routeId: Number(record.routeIdentity.id || 0)
    });

    root.requestAnimationFrame(function () { focusInitialRecord(record); });
    return record.handle;
  }

  function close(id, options) {
    return closeRecord(recordById(String(id || '')), options || {});
  }

  function closeTop(options) {
    var top = topRecord();
    return top ? closeRecord(top, options || {}) : false;
  }

  function requestCloseTop(reason) {
    return requestCloseRecord(topRecord(), reason || CLOSE_REASONS.PROGRAMMATIC);
  }

  function requestCloseAll(reason) {
    var records = stack.slice().reverse();
    records.forEach(function (record) {
      if (topRecord() === record) requestCloseRecord(record, reason || CLOSE_REASONS.PROGRAMMATIC);
    });
    return records.length;
  }

  function handleKeydown(event) {
    var top = topRecord();
    if (!top || event.defaultPrevented) return;

    if (event.key === 'Escape' && top.closeOnEscape) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      requestCloseRecord(top, CLOSE_REASONS.ESCAPE, event);
      return;
    }

    if (event.key !== 'Tab' || !top.trapFocus) return;
    var available = focusables(top.surface);
    if (!available.length) {
      event.preventDefault();
      focusNode(resolveInitialFocus(top), { preventScroll: true });
      return;
    }

    var active = document.activeElement;
    var first = available[0];
    var last = available[available.length - 1];
    if (!top.surface.contains(active)) {
      event.preventDefault();
      focusNode(event.shiftKey ? last : first, { preventScroll: true });
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      focusNode(first, { preventScroll: true });
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      focusNode(last, { preventScroll: true });
    }
  }

  function routeFocusTarget() {
    for (var index = 0; index < ROUTE_TARGET_SELECTORS.length; index += 1) {
      var selector = ROUTE_TARGET_SELECTORS[index];
      var target = document.querySelector && document.querySelector(selector);
      if (isElement(target) && !isHidden(target)) {
        return { node: target, selector: selector };
      }
    }
    return null;
  }

  function scheduleRouteFocus(options) {
    options = options || {};
    routeFocusSequence += 1;
    var token = routeFocusSequence;
    if (routeFocusFrame && root.cancelAnimationFrame) root.cancelAnimationFrame(routeFocusFrame);

    if (stack.length && options.force !== true) {
      emit('doke:route-focus-skipped', { reason: 'overlay-open', sequence: token });
      return false;
    }

    if (isEditable(document.activeElement) && options.force !== true) {
      emit('doke:route-focus-skipped', { reason: 'editable-active', sequence: token });
      return false;
    }

    var expected = readRouteIdentity();
    routeFocusFrame = root.requestAnimationFrame(function () {
      routeFocusFrame = 0;
      if (token !== routeFocusSequence) return;
      if (stack.length && options.force !== true) return;

      var current = readRouteIdentity();
      if (expected.id && current.id && expected.id !== current.id) return;
      if (isEditable(document.activeElement) && options.force !== true) return;

      var resolved = routeFocusTarget();
      if (!resolved) {
        emit('doke:route-focus-skipped', { reason: 'target-missing', sequence: token });
        return;
      }

      var temporary = ensureProgrammaticFocus(resolved.node, 'data-doke-route-focus-temporary');
      var focused = focusNode(resolved.node, { preventScroll: true });
      if (temporary && resolved.node.addEventListener) {
        resolved.node.addEventListener('blur', function cleanup() {
          if (resolved.node.getAttribute('data-doke-route-focus-temporary') === 'true') {
            resolved.node.removeAttribute('tabindex');
            resolved.node.removeAttribute('data-doke-route-focus-temporary');
          }
        }, { once: true });
      }

      if (focused) {
        emit('doke:route-focus-applied', {
          sequence: token,
          routeId: Number(current.id || 0),
          target: resolved.selector
        });
      }
    });

    return true;
  }

  function handleRouteLifecycle(event) {
    var detail = event && event.detail || {};
    var state = String(detail.state || detail.snapshot && detail.snapshot.route && detail.snapshot.route.state || '');
    var nextIdentity = readRouteIdentity();

    if (state === 'pending' || state === 'committed') {
      if (!sameRoute(lastRouteIdentity, nextIdentity) || state === 'pending') {
        requestCloseAll(CLOSE_REASONS.ROUTE_CHANGE);
      }
      lastRouteIdentity = nextIdentity;
      return;
    }

    if (state === 'ready' || state === 'empty') {
      lastRouteIdentity = nextIdentity;
      scheduleRouteFocus({
        reason: 'navigation-lifecycle',
        force: detail.forceFocus === true
      });
    }
  }

  function handleGenericRouteReady(event) {
    var detail = event && event.detail || {};
    scheduleRouteFocus({
      reason: event && event.type || 'route-ready',
      force: detail.forceFocus === true
    });
  }

  function handleFocusin(event) {
    var top = topRecord();
    if (!top || !top.trapFocus) return;
    if (top.surface.contains(event.target)) {
      top.lastFocusedWithin = event.target;
      return;
    }
    focusInitialRecord(top);
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return function () {};
    subscribers.add(listener);
    return function () { subscribers.delete(listener); };
  }

  document.addEventListener('keydown', handleKeydown, true);
  document.addEventListener('focusin', handleFocusin, true);
  document.addEventListener('doke:navigation-lifecycle-route', handleRouteLifecycle);
  document.addEventListener('doke:route-ready', handleGenericRouteReady);
  document.addEventListener('doke:stable-route-ready', handleGenericRouteReady);

  var api = Object.freeze({
    version: VERSION,
    kinds: KINDS,
    closeReasons: CLOSE_REASONS,
    open: open,
    close: close,
    closeTop: closeTop,
    requestCloseTop: requestCloseTop,
    requestCloseAll: requestCloseAll,
    getStack: getStack,
    getSnapshot: getSnapshot,
    isOpen: function (id) { return Boolean(recordById(String(id || ''))); },
    top: function () { return topRecord() ? publicRecord(topRecord()) : null; },
    focusRoute: scheduleRouteFocus,
    subscribe: subscribe
  });

  Doke.overlayExperience = api;
  Doke.routeFocusManager = Object.freeze({
    focus: scheduleRouteFocus,
    getSequence: function () { return routeFocusSequence; }
  });

  emit('doke:overlay-experience-ready', {
    routeId: Number(lastRouteIdentity.id || 0)
  });
}());
