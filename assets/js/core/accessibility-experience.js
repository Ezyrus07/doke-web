/* Doke accessibility experience
 * Responsibility: establish skip navigation, one main landmark, keyboard
 * modality, visible focus, explicit keyboard semantics and sanitized audits.
 */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var VERSION = '20260804-ux-a11y-001-v1';

  if (Doke.accessibilityExperience && Doke.accessibilityExperience.version === VERSION) return;

  var MODALITY = Object.freeze({
    KEYBOARD: 'keyboard',
    POINTER: 'pointer',
    PROGRAMMATIC: 'programmatic'
  });

  var MAIN_SELECTORS = [
    'main',
    '[role="main"]',
    '[data-shell-main]',
    '.page__content',
    '.doke-page',
    '#main-content'
  ];

  var INTERACTIVE_SELECTOR = [
    'button',
    'a[href]',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[tabindex]'
  ].join(',');

  var EXPLICIT_ACTION_SELECTOR = [
    '[data-a11y-action]',
    '[data-a11y-button]',
    '[role="button"]:not(button):not(input):not(a)'
  ].join(',');

  var state = {
    modality: MODALITY.POINTER,
    initialized: false,
    auditSequence: 0,
    lastAudit: null,
    observer: null,
    auditTimer: 0,
    liveRegion: null
  };

  function emit(name, detail) {
    var safeDetail = Object.assign({ version: VERSION }, detail || {});
    try {
      document.dispatchEvent(new CustomEvent(name, { detail: safeDetail }));
    } catch (error) {}
  }

  function normalizedText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function isNativeInteractive(node) {
    if (!node || !node.tagName) return false;
    var tag = String(node.tagName).toLowerCase();
    return tag === 'button'
      || tag === 'a'
      || tag === 'input'
      || tag === 'select'
      || tag === 'textarea'
      || tag === 'summary';
  }

  function isDisabled(node) {
    if (!node) return true;
    return node.disabled === true
      || node.hasAttribute && node.hasAttribute('disabled')
      || node.getAttribute && node.getAttribute('aria-disabled') === 'true';
  }

  function labelsNode(node) {
    if (!node) return false;
    if (node.labels && node.labels.length) return true;
    var labelledBy = normalizedText(node.getAttribute && node.getAttribute('aria-labelledby'));
    if (labelledBy) return true;
    var ariaLabel = normalizedText(node.getAttribute && node.getAttribute('aria-label'));
    if (ariaLabel) return true;
    var title = normalizedText(node.getAttribute && node.getAttribute('title'));
    if (title) return true;
    var tag = String(node.tagName || '').toLowerCase();
    if (tag === 'input' && ['button', 'submit', 'reset'].indexOf(String(node.type || '').toLowerCase()) !== -1) {
      return Boolean(normalizedText(node.value));
    }
    if (tag === 'img') return Boolean(normalizedText(node.getAttribute && node.getAttribute('alt')));
    return Boolean(normalizedText(node.textContent));
  }

  function applyExplicitName(node) {
    if (!node || labelsNode(node)) return false;
    var explicit = normalizedText(node.getAttribute && node.getAttribute('data-a11y-label'));
    if (!explicit) {
      var title = normalizedText(node.getAttribute && node.getAttribute('title'));
      if (title) explicit = title;
    }
    if (!explicit) return false;
    node.setAttribute('aria-label', explicit);
    return true;
  }

  function ensureMainLandmark() {
    var landmarks = Array.prototype.slice.call(document.querySelectorAll('main, [role="main"]'));
    var main = landmarks[0] || null;

    if (!main) {
      for (var index = 0; index < MAIN_SELECTORS.length; index += 1) {
        var candidate = document.querySelector(MAIN_SELECTORS[index]);
        if (!candidate) continue;
        main = candidate;
        if (String(main.tagName || '').toLowerCase() !== 'main') main.setAttribute('role', 'main');
        break;
      }
    }

    if (!main) return null;

    if (!main.id) {
      var baseId = 'doke-main-content';
      var id = baseId;
      var suffix = 1;
      while (document.getElementById(id) && document.getElementById(id) !== main) {
        suffix += 1;
        id = baseId + '-' + suffix;
      }
      main.id = id;
    }

    main.setAttribute('data-doke-main-landmark', 'canonical');
    if (!main.hasAttribute('tabindex')) {
      main.setAttribute('tabindex', '-1');
      main.setAttribute('data-doke-a11y-managed-tabindex', 'true');
    }

    return main;
  }

  function focusMain(options) {
    options = options || {};
    var main = ensureMainLandmark();
    if (!main || typeof main.focus !== 'function') return false;
    try {
      main.focus({ preventScroll: options.preventScroll === true });
    } catch (error) {
      try { main.focus(); } catch (focusError) { return false; }
    }
    if (options.scroll !== false && typeof main.scrollIntoView === 'function') {
      try { main.scrollIntoView({ block: 'start', behavior: 'auto' }); } catch (error) {}
    }
    emit('doke:a11y-main-focused', { source: String(options.source || 'api') });
    return true;
  }

  function ensureSkipLink() {
    var main = ensureMainLandmark();
    if (!main || !document.body) return null;

    var link = document.querySelector('[data-doke-skip-link]');
    if (!link) {
      link = document.createElement('a');
      link.className = 'doke-skip-link';
      link.setAttribute('data-doke-skip-link', 'canonical');
      link.textContent = 'Ir para o conteúdo principal';
      link.addEventListener('click', function (event) {
        event.preventDefault();
        focusMain({ source: 'skip-link' });
      });
      document.body.insertBefore(link, document.body.firstChild || null);
    }

    link.setAttribute('href', '#' + main.id);
    return link;
  }

  function setModality(value, source) {
    var next = Object.values(MODALITY).indexOf(value) !== -1 ? value : MODALITY.PROGRAMMATIC;
    if (state.modality === next) return next;
    state.modality = next;
    if (document.documentElement) document.documentElement.dataset.dokeInputModality = next;
    emit('doke:a11y-modality-changed', {
      modality: next,
      source: String(source || 'runtime')
    });
    return next;
  }

  function handleKeydown(event) {
    if (!event) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var key = String(event.key || '');
    if (key === 'Tab' || key.indexOf('Arrow') === 0 || key === 'Enter' || key === ' ' || key === 'Escape') {
      setModality(MODALITY.KEYBOARD, 'keydown');
    }

    if (key !== 'Enter' && key !== ' ') return;
    var target = event.target && event.target.closest ? event.target.closest(EXPLICIT_ACTION_SELECTOR) : null;
    if (!target || isNativeInteractive(target) || isDisabled(target)) return;
    if (key === ' ' && event.repeat) return;
    event.preventDefault();
    if (typeof target.click === 'function') target.click();
    emit('doke:a11y-keyboard-action', {
      key: key === ' ' ? 'Space' : 'Enter',
      role: normalizedText(target.getAttribute && target.getAttribute('role')) || 'button'
    });
  }

  function handlePointer() {
    setModality(MODALITY.POINTER, 'pointer');
  }

  function handleFocusIn(event) {
    var target = event && event.target;
    if (!target || !target.setAttribute) return;
    if (state.modality === MODALITY.KEYBOARD) {
      target.setAttribute('data-doke-focus-visible', 'true');
    }
  }

  function handleFocusOut(event) {
    var target = event && event.target;
    if (target && target.removeAttribute) target.removeAttribute('data-doke-focus-visible');
  }

  function repairExplicitActions(scope) {
    var rootNode = scope && scope.querySelectorAll ? scope : document;
    var repaired = 0;
    Array.prototype.slice.call(rootNode.querySelectorAll(EXPLICIT_ACTION_SELECTOR)).forEach(function (node) {
      if (isNativeInteractive(node) || isDisabled(node)) return;
      if (!node.hasAttribute('role')) node.setAttribute('role', 'button');
      if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '0');
      repaired += 1;
    });
    return repaired;
  }

  function repairHelpDrawer(scope) {
    var rootNode = scope && scope.querySelector ? scope : document;
    var drawer = rootNode.querySelector('#doke-help-drawer') || document.querySelector('#doke-help-drawer');
    if (!drawer) return 0;
    var repairs = 0;
    var search = drawer.querySelector('input[type="search"]');
    if (search && !labelsNode(search)) {
      search.setAttribute('aria-label', 'Buscar na ajuda');
      repairs += 1;
    }
    var list = drawer.querySelector('.doke-help-drawer__list');
    if (list && list.getAttribute('role') === 'list') {
      list.setAttribute('role', 'group');
      if (!list.hasAttribute('aria-label')) list.setAttribute('aria-label', 'Tópicos de ajuda');
      repairs += 1;
    }
    Array.prototype.slice.call(drawer.querySelectorAll('button[role="listitem"]')).forEach(function (button) {
      button.removeAttribute('role');
      repairs += 1;
    });
    Array.prototype.slice.call(drawer.querySelectorAll('.doke-help-drawer__item-icon, .doke-help-drawer__item-chevron')).forEach(function (node) {
      if (node.getAttribute('aria-hidden') !== 'true') {
        node.setAttribute('aria-hidden', 'true');
        repairs += 1;
      }
    });
    return repairs;
  }

  function audit(scope, options) {
    options = options || {};
    var rootNode = scope && scope.querySelectorAll ? scope : document;
    var main = ensureMainLandmark();
    var skipLink = ensureSkipLink();
    var repairedNames = 0;
    var unnamed = 0;
    var controls = Array.prototype.slice.call(rootNode.querySelectorAll(INTERACTIVE_SELECTOR));

    controls.forEach(function (node) {
      if (applyExplicitName(node)) repairedNames += 1;
      if (!labelsNode(node)) unnamed += 1;
    });

    var explicitActions = repairExplicitActions(rootNode);
    var helpDrawerRepairs = repairHelpDrawer(rootNode);
    var mainCount = document.querySelectorAll('main, [role="main"]').length;
    var report = Object.freeze({
      auditId: ++state.auditSequence,
      source: String(options.source || 'manual'),
      mainPresent: Boolean(main),
      mainCount: mainCount,
      skipLinkPresent: Boolean(skipLink),
      controlsChecked: controls.length,
      unnamedControls: unnamed,
      repairedNames: repairedNames,
      explicitActionsRepaired: explicitActions,
      pilotRepairs: helpDrawerRepairs,
      at: Date.now()
    });
    state.lastAudit = report;
    emit('doke:a11y-audit', {
      auditId: report.auditId,
      source: report.source,
      mainPresent: report.mainPresent,
      mainCount: report.mainCount,
      skipLinkPresent: report.skipLinkPresent,
      controlsChecked: report.controlsChecked,
      unnamedControls: report.unnamedControls,
      repairedNames: report.repairedNames,
      explicitActionsRepaired: report.explicitActionsRepaired,
      pilotRepairs: report.pilotRepairs
    });
    return report;
  }

  function scheduleAudit(source) {
    root.clearTimeout(state.auditTimer);
    state.auditTimer = root.setTimeout(function () {
      audit(document, { source: source || 'scheduled' });
    }, 24);
  }

  function ensureLiveRegion() {
    if (state.liveRegion && state.liveRegion.isConnected !== false) return state.liveRegion;
    var region = document.querySelector('[data-doke-a11y-live-region]');
    if (!region) {
      region = document.createElement('div');
      region.className = 'sr-only';
      region.setAttribute('data-doke-a11y-live-region', 'polite');
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'true');
      document.body.appendChild(region);
    }
    state.liveRegion = region;
    return region;
  }

  function announce(message, options) {
    options = options || {};
    var text = normalizedText(message);
    if (!text) return false;
    var region = ensureLiveRegion();
    region.setAttribute('aria-live', options.assertive === true ? 'assertive' : 'polite');
    region.textContent = '';
    root.setTimeout(function () { region.textContent = text; }, 0);
    return true;
  }

  function getSnapshot() {
    return Object.freeze({
      version: VERSION,
      modality: state.modality,
      initialized: state.initialized,
      lastAudit: state.lastAudit
        ? Object.freeze({
          auditId: state.lastAudit.auditId,
          source: state.lastAudit.source,
          mainPresent: state.lastAudit.mainPresent,
          mainCount: state.lastAudit.mainCount,
          skipLinkPresent: state.lastAudit.skipLinkPresent,
          controlsChecked: state.lastAudit.controlsChecked,
          unnamedControls: state.lastAudit.unnamedControls
        })
        : null
    });
  }

  function init() {
    if (state.initialized || !document.body) return false;
    state.initialized = true;
    if (document.documentElement) document.documentElement.dataset.dokeInputModality = state.modality;
    document.addEventListener('keydown', handleKeydown, true);
    document.addEventListener('pointerdown', handlePointer, true);
    document.addEventListener('mousedown', handlePointer, true);
    document.addEventListener('touchstart', handlePointer, true);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);
    document.addEventListener('doke:navigation-lifecycle-route', function (event) {
      var routeState = event && event.detail && event.detail.state;
      if (routeState === 'ready' || routeState === 'empty') scheduleAudit('route-ready');
    });
    document.addEventListener('doke:route-ready', function () { scheduleAudit('route-ready-legacy'); });

    if (root.MutationObserver) {
      try {
        state.observer = new MutationObserver(function (records) {
          if (!records || !records.some(function (record) { return record.addedNodes && record.addedNodes.length; })) return;
          scheduleAudit('mutation');
        });
        state.observer.observe(document.body, { childList: true, subtree: true });
      } catch (error) {}
    }

    ensureLiveRegion();
    audit(document, { source: 'bootstrap' });
    emit('doke:a11y-ready', { modality: state.modality });
    return true;
  }

  var api = Object.freeze({
    version: VERSION,
    modality: MODALITY,
    init: init,
    audit: audit,
    scheduleAudit: scheduleAudit,
    ensureMainLandmark: ensureMainLandmark,
    ensureSkipLink: ensureSkipLink,
    focusMain: focusMain,
    hasAccessibleName: labelsNode,
    applyExplicitName: applyExplicitName,
    repairExplicitActions: repairExplicitActions,
    repairHelpDrawer: repairHelpDrawer,
    setModality: setModality,
    announce: announce,
    getSnapshot: getSnapshot
  });

  Doke.accessibilityExperience = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
