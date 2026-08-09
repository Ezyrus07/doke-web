(() => {
  'use strict';

  const Doke = (window.Doke = window.Doke || {});
  const CRITICAL_CATEGORIES = new Set(['PAYMENTS', 'DISPUTES', 'SECURITY']);
  const CANONICAL_AUTHORITIES = new Set(['CANONICAL_LOCAL', 'CANONICAL_REMOTE']);
  const state = {
    accountKey: '',
    seen: new Set(),
    records: new Map(),
    notificationIndex: new Map(),
    host: null
  };
  let config = {};

  const normalizeText = (value) => String(value == null ? '' : value).trim();
  const escapeHtml = (value) => normalizeText(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const identityOf = (payload = {}) => normalizeText(
    payload.dedupeKey || payload.eventId || payload.eventKey || payload.id || ''
  );

  const policyAllows = (payload = {}) => {
    if (!payload || payload.read === true || payload.dismissed === true) return false;
    if (payload.eventAccepted === false) return false;

    const category = normalizeText(payload.eventCategory || payload.canonicalCategory || '').toUpperCase();
    if (CRITICAL_CATEGORIES.has(category)) {
      if (payload.eventAccepted !== true) return false;
      const authority = normalizeText(payload.sourceAuthority || '').toUpperCase();
      if (!CANONICAL_AUTHORITIES.has(authority)) return false;
    }

    const channelPolicy = payload.channelPolicy;
    if (channelPolicy && typeof channelPolicy === 'object') {
      const toastPolicy = normalizeText(channelPolicy.toast).toLowerCase();
      if (!toastPolicy) return false;
      if (toastPolicy !== 'allowed') return false;
    }

    return true;
  };

  const currentAccountKey = () => normalizeText(config.getAccountKey?.() || 'anonymous').toLowerCase() || 'anonymous';

  const removeRecord = (identity) => {
    const record = state.records.get(identity);
    if (!record) return;
    if (record.notificationId) state.notificationIndex.delete(record.notificationId);
    state.records.delete(identity);
  };

  const removeRecordByNode = (node) => {
    for (const [identity, record] of state.records.entries()) {
      if (record?.toast === node) {
        removeRecord(identity);
        return;
      }
    }
  };

  const ensureHost = () => {
    if (state.host?.isConnected) return state.host;
    const host = document.createElement('section');
    host.className = 'doke-live-toast-stack';
    host.dataset.liveToastStack = '';
    host.setAttribute('aria-live', 'polite');
    host.setAttribute('aria-label', 'Notificações recentes');
    document.body.appendChild(host);
    state.host = host;
    return host;
  };

  const defaultRender = (payload, identity) => {
    const priority = normalizeText(config.priorityOf?.(payload) || 'normal').toLowerCase() || 'normal';
    const actions = Array.isArray(config.resolveActions?.(payload)) ? config.resolveActions(payload) : [];
    const toast = document.createElement('article');
    toast.className = `doke-live-toast doke-live-toast--${priority}`;
    toast.tabIndex = 0;
    toast.dataset.liveToast = identity;

    const repeat = Number(payload.repeatCount || 1);
    const icon = normalizeText(config.iconFor?.(payload) || '!');
    const repeatMarkup = repeat > 1 ? ` <em>×${repeat}</em>` : '';
    const actionButtonsMarkup = actions
      .map((action, index) => `<button type="button" data-toast-action="${index}">${escapeHtml(action.label)}</button>`)
      .join('');
    const actionsMarkup = actionButtonsMarkup
      ? `<span class="doke-live-toast__actions">${actionButtonsMarkup}</span>`
      : '';
    const titleMarkup = `${escapeHtml(payload.title || 'Nova notificação')}${repeatMarkup}`;
    const bodyMarkup = escapeHtml(payload.body || payload.message || '');
    toast.innerHTML = `<span class="doke-live-toast__icon" aria-hidden="true">${escapeHtml(icon)}</span><span class="doke-live-toast__content"><strong>${titleMarkup}</strong><span>${bodyMarkup}</span>${actionsMarkup}<small class="doke-live-toast__status" data-toast-action-status aria-live="polite"></small></span><button class="doke-live-toast__close doke-close-button doke-icon-btn doke-icon-btn--flat" type="button" aria-label="Fechar notificação"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg></button>`;

    let timer = null;
    const close = () => {
      if (timer) window.clearTimeout(timer);
      removeRecord(identity);
      toast.classList.add('is-leaving');
      window.setTimeout(() => toast.remove(), 180);
    };
    const restartTimer = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(close, Number(payload.duration || (priority === 'high' ? 10000 : 6500)));
    };

    toast.querySelector('.doke-live-toast__close')?.addEventListener('click', (event) => {
      event.stopPropagation();
      close();
    });

    toast.querySelectorAll('[data-toast-action]').forEach((button) => button.addEventListener('click', (event) => {
      event.stopPropagation();
      const action = actions[Number(button.dataset.toastAction)];
      if (!action) return;
      if (config.isActionExpired?.(payload, action)) {
        button.disabled = true;
        button.textContent = 'Expirada';
        config.onRecordActionResult?.(payload.id, 'expired', 'Esta ação expirou.');
        return;
      }
      if (action.action === 'mute-scope') {
        config.onMuteScope?.(
          config.scopeOf?.(payload),
          payload.scopeLabel || payload.communityName || payload.conversationName || 'Origem'
        );
        close();
        return;
      }
      if (['quick-reply', 'event-rsvp', 'request-decision', 'undo'].includes(action.action)) {
        config.onQuickAction?.(toast, payload, action, close, restartTimer);
        restartTimer();
        return;
      }
      if (action.url) {
        config.onMarkRead?.(payload.id);
        window.location.href = action.url;
        return;
      }
      if (action.eventName) {
        document.dispatchEvent(new CustomEvent(action.eventName, { detail: { payload, action } }));
        close();
      }
    }));

    toast.addEventListener('click', (event) => {
      if (event.target.closest('button,input,form')) return;
      if (payload.targetUrl) config.onOpen?.(payload);
      else close();
    });
    toast.addEventListener('keydown', (event) => {
      if (event.target.matches('input,button')) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (payload.targetUrl) config.onOpen?.(payload);
        else close();
      }
      if (event.key === 'Escape') close();
    });

    const host = ensureHost();
    host.prepend(toast);
    while (host.children.length > 4) {
      const node = host.lastElementChild;
      removeRecordByNode(node);
      node?.remove();
    }
    config.onPlaySound?.(priority);
    restartTimer();

    return {
      toast,
      payload,
      actions,
      close,
      restartTimer,
      notificationId: normalizeText(payload.id)
    };
  };

  const reset = (accountKey = currentAccountKey()) => {
    for (const record of state.records.values()) {
      try { record?.close?.(); } catch (_error) {}
      try { record?.toast?.remove?.(); } catch (_error) {}
    }
    state.records.clear();
    state.notificationIndex.clear();
    state.seen.clear();
    try { state.host?.remove?.(); } catch (_error) {}
    state.host = null;
    state.accountKey = normalizeText(accountKey).toLowerCase() || 'anonymous';
    return getState();
  };

  const ensureAccountFence = () => {
    const accountKey = currentAccountKey();
    if (!state.accountKey) {
      state.accountKey = accountKey;
      return;
    }
    if (state.accountKey !== accountKey) reset(accountKey);
  };

  const configure = (next = {}) => {
    config = { ...config, ...next };
    ensureAccountFence();
    return api;
  };

  const show = (payload, options = {}) => {
    if (!payload || config.isForCurrentUser?.(payload) === false) return false;
    ensureAccountFence();
    if (!policyAllows(payload)) return false;
    const identity = identityOf(payload);
    if (!identity) return false;
    if (state.seen.has(identity) && options.force !== true) return false;
    if (config.shouldToast?.(payload) === false) return false;
    if (config.isDndActive?.() === true && options.skipDigest !== true) {
      config.queueDigest?.(payload);
      return false;
    }

    const renderer = typeof config.renderToast === 'function' ? config.renderToast : defaultRender;
    state.seen.add(identity);
    try {
      const record = renderer(payload, identity, options);
      if (record === false) {
        state.seen.delete(identity);
        return false;
      }
      const normalizedRecord = record && typeof record === 'object' ? record : { payload };
      normalizedRecord.payload = normalizedRecord.payload || payload;
      normalizedRecord.notificationId = normalizeText(normalizedRecord.notificationId || payload.id);
      state.records.set(identity, normalizedRecord);
      if (normalizedRecord.notificationId) state.notificationIndex.set(normalizedRecord.notificationId, identity);
      return true;
    } catch (error) {
      state.seen.delete(identity);
      config.onRenderError?.(Object.freeze({
        name: normalizeText(error?.name || 'Error'),
        message: normalizeText(error?.message || 'Toast renderer failed')
      }));
      return false;
    }
  };

  const getRecord = (notificationId) => {
    const key = normalizeText(notificationId);
    const identity = state.notificationIndex.get(key) || key;
    return state.records.get(identity) || null;
  };

  function getState() {
    return Object.freeze({
      accountKey: state.accountKey,
      seenCount: state.seen.size,
      activeCount: state.records.size
    });
  }

  const api = Object.freeze({
    version: '20260809-ux-notif-003-v1',
    configure,
    show,
    reset,
    getState,
    getRecord,
    identityOf,
    policyAllows
  });

  Doke.notificationToast = api;
})();
