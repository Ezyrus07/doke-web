(function () {
  'use strict';

  if (window.DokeFinalLogicStability) return;

  var SUPPORTED_PAGES = new Set(['comunidade-interna', 'mensagens', 'notificacoes']);
  var AUTH_STORAGE_KEYS = new Set(['doke.auth.session.v1', 'doke.auth.user.v1']);
  var FORM_LOCK_SELECTORS = [
    '[data-community-composer]',
    '[data-community-event-form]',
    '[data-community-role-form]',
    '[data-community-channel-form]',
    '[data-community-invite-form]',
    '[data-message-composer]',
    '[data-notification-preferences-form]'
  ].join(',');
  var controller = null;
  var observer = null;
  var initialized = false;
  var initialAccountFingerprint = '';
  var reloadScheduled = false;
  var fallbackTimer = 0;

  function currentPage() {
    return String(document.body && document.body.dataset.page || '').trim();
  }

  function isSupportedPage() {
    return SUPPORTED_PAGES.has(currentPage());
  }

  function safeJsonParse(value) {
    try { return value ? JSON.parse(value) : null; } catch (error) { return null; }
  }

  function readAccountFingerprint() {
    var session = safeJsonParse(window.localStorage.getItem('doke.auth.session.v1'));
    var user = session && session.user ? session.user : session;
    var id = user && (user.id || user.userId || user.email);
    var role = user && (user.role || user.type);
    return [String(id || 'anonymous'), String(role || 'guest')].join(':');
  }

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function clearVolatileAccountUi() {
    document.querySelectorAll([
      '[data-community-composer-input]',
      '[data-message-composer-input]',
      '[data-community-search-input]',
      '[data-community-member-search]',
      '[data-community-settings-search]',
      '[data-notification-search]'
    ].join(',')).forEach(function (field) {
      if ('value' in field) field.value = '';
    });

    document.querySelectorAll('[data-community-attachment-draft], [data-community-audio-draft], [data-community-reply-preview], [data-message-reply-preview]').forEach(function (node) {
      node.hidden = true;
      node.setAttribute('aria-hidden', 'true');
    });
  }

  function scheduleAccountContextReload(reason) {
    if (reloadScheduled || !isSupportedPage()) return;
    var nextFingerprint = readAccountFingerprint();
    if (!initialAccountFingerprint || nextFingerprint === initialAccountFingerprint) return;
    reloadScheduled = true;
    clearVolatileAccountUi();
    try {
      window.sessionStorage.setItem('doke.account-context-refresh.v1', JSON.stringify({
        page: currentPage(),
        reason: String(reason || 'account-change'),
        at: Date.now()
      }));
    } catch (error) {
      // Non-critical; reload still protects account-scoped state.
    }
    emit('doke:account-context-invalidated', {
      previous: initialAccountFingerprint,
      current: nextFingerprint,
      reason: reason || 'account-change'
    });
    window.setTimeout(function () { window.location.reload(); }, 60);
  }

  function setAttributeIfChanged(node, name, value) {
    if (node.getAttribute(name) === value) return false;
    node.setAttribute(name, value);
    return true;
  }

  function syncAriaState(node) {
    if (!(node instanceof HTMLElement)) return;
    if (node.hasAttribute('hidden')) setAttributeIfChanged(node, 'aria-hidden', 'true');
    else if (node.matches('[role="dialog"], [data-community-panel], [data-notification-preferences-panel]')) {
      setAttributeIfChanged(node, 'aria-hidden', 'false');
    }
  }

  function syncControlsForTarget(node) {
    if (!(node instanceof HTMLElement) || !node.id) return;
    document.querySelectorAll('[aria-controls]').forEach(function (control) {
      if (control.getAttribute('aria-controls') !== node.id) return;
      setAttributeIfChanged(control, 'aria-expanded', node.hidden ? 'false' : 'true');
    });
  }

  function startAriaObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        syncAriaState(mutation.target);
        syncControlsForTarget(mutation.target);
      });
    });
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden']
    });
  }

  function lockForm(form) {
    if (!form || form.dataset.logicSubmitting === 'true') return false;
    form.dataset.logicSubmitting = 'true';
    form.setAttribute('aria-busy', 'true');
    var submitters = form.querySelectorAll('button[type="submit"], input[type="submit"]');
    submitters.forEach(function (button) {
      button.dataset.logicWasDisabled = button.disabled ? 'true' : 'false';
      button.disabled = true;
    });

    var unlock = function () {
      if (!form.isConnected) return;
      form.dataset.logicSubmitting = 'false';
      form.setAttribute('aria-busy', 'false');
      submitters.forEach(function (button) {
        if (button.dataset.logicWasDisabled !== 'true') button.disabled = false;
        delete button.dataset.logicWasDisabled;
      });
    };
    form.addEventListener('doke:submit-complete', unlock, { once: true });
    window.setTimeout(unlock, 4500);
    return true;
  }

  function handleSubmitCapture(event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches(FORM_LOCK_SELECTORS)) return;
    if (!lockForm(form)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  function handleKeyboardActivation(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    var target = event.target instanceof Element ? event.target.closest('[role="button"]') : null;
    if (!target || target.matches('button, a, input, select, textarea') || target.getAttribute('aria-disabled') === 'true') return;
    event.preventDefault();
    target.click();
  }

  function resolvePrimarySurface() {
    if (currentPage() === 'comunidade-interna') return document.querySelector('[data-community-room]');
    if (currentPage() === 'mensagens') return document.querySelector('[data-messages-app], .messages-app, main');
    if (currentPage() === 'notificacoes') return document.querySelector('[data-notifications-hydration-ready], main');
    return null;
  }

  function revealFallbackError(message) {
    var surface = resolvePrimarySurface();
    if (!surface) return;
    var bodyState = document.body && document.body.dataset.dataState;
    var busy = surface.getAttribute('aria-busy') === 'true';
    if (bodyState !== 'loading' && !busy) return;

    if (document.body) document.body.dataset.dataState = 'error';
    surface.dataset.state = 'error';
    surface.setAttribute('aria-busy', 'false');
    surface.hidden = false;

    var existing = surface.querySelector('[data-logic-fallback-error]');
    if (!existing) {
      existing = document.createElement('section');
      existing.dataset.logicFallbackError = 'true';
      existing.setAttribute('role', 'alert');
      existing.innerHTML = '<strong>Não foi possível concluir o carregamento.</strong><span></span><button type="button">Tentar novamente</button>';
      var span = existing.querySelector('span');
      if (span) span.textContent = message || 'Atualize a página ou tente novamente.';
      var button = existing.querySelector('button');
      if (button) button.addEventListener('click', function () { window.location.reload(); }, { once: true });
      surface.prepend(existing);
    }
    emit('doke:logic-fallback-error', { page: currentPage() });
  }

  function consumeAccountRefreshNotice() {
    try {
      var raw = window.sessionStorage.getItem('doke.account-context-refresh.v1');
      if (!raw) return;
      window.sessionStorage.removeItem('doke.account-context-refresh.v1');
      var payload = safeJsonParse(raw) || {};
      emit('doke:account-context-refreshed', payload);
    } catch (error) {
      // Storage may be unavailable in private contexts.
    }
  }

  function cleanup() {
    if (controller) controller.abort();
    controller = null;
    if (observer) observer.disconnect();
    observer = null;
    if (fallbackTimer) window.clearTimeout(fallbackTimer);
    fallbackTimer = 0;
    initialized = false;
  }

  function init() {
    if (initialized || !isSupportedPage()) return;
    initialized = true;
    controller = new AbortController();
    var signal = controller.signal;
    initialAccountFingerprint = readAccountFingerprint();

    document.addEventListener('submit', handleSubmitCapture, { capture: true, signal: signal });
    document.addEventListener('keydown', handleKeyboardActivation, { signal: signal });
    document.addEventListener('doke:auth-session-change', function () { scheduleAccountContextReload('auth-session-change'); }, { signal: signal });
    document.addEventListener('doke:auth-surface-ready', function () { scheduleAccountContextReload('auth-surface-ready'); }, { signal: signal });
    window.addEventListener('storage', function (event) {
      if (AUTH_STORAGE_KEYS.has(String(event.key || ''))) scheduleAccountContextReload('storage');
    }, { signal: signal });
    window.addEventListener('pagehide', cleanup, { once: true, signal: signal });
    document.addEventListener('doke:route-leaving', cleanup, { once: true, signal: signal });

    startAriaObserver();
    consumeAccountRefreshNotice();
    fallbackTimer = window.setTimeout(function () {
      revealFallbackError('O conteúdo demorou mais que o esperado para responder.');
    }, 7000);

    emit('doke:final-logic-stability-ready', {
      page: currentPage(),
      account: initialAccountFingerprint
    });
  }

  window.DokeFinalLogicStability = {
    init: init,
    cleanup: cleanup,
    revealFallbackError: revealFallbackError,
    getAccountFingerprint: readAccountFingerprint
  };

  document.addEventListener('doke:route-ready', function () {
    cleanup();
    window.requestAnimationFrame(init);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
