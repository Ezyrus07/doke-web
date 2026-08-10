/* Doke browser notification boundary
   Responsibility: privacy-safe Web Notifications presentation for canonical events already received by the app.
   Remote push subscriptions/providers remain outside this module. */
(() => {
  'use strict';

  const Doke = (window.Doke = window.Doke || {});
  const VERSION = '20260809-ux-notif-008-v1';
  const CONTRACT = 'notification-browser-v1';
  const DOMAIN = 'notification_browser';
  const STORAGE_VERSION = 1;
  const PREFS_KEY = 'preferences';
  const LEGACY_PREFS_KEY = 'doke.browser-notifications.v1';
  const MAX_SEEN = 200;
  const ALLOWED_ROUTES = new Set([
    'notificacoes.html',
    'mensagens.html',
    'pedidos.html',
    'carteira.html',
    'comunidade.html',
    'comunidade-interna.html',
    'perfil.html',
    'meu-perfil.html',
    'detalhe-anuncio.html'
  ]);
  const ALLOWED_QUERY_KEYS = new Set([
    'id', 'tab', 'order', 'orderId', 'conversation', 'conversationId',
    'community', 'communityId', 'service', 'serviceId'
  ]);
  const DEFAULT_PREFS = Object.freeze({ enabled: false, promptDismissed: false });

  if (Doke.notificationBrowser?.version === VERSION) {
    window.DokeBrowserNotifications = Doke.notificationBrowser;
    return;
  }

  const seen = new Set();
  let scopeFingerprint = '';

  const normalizeText = (value) => String(value == null ? '' : value).trim();
  const accountStorage = () => Doke.accountStorage || null;
  const eventAuthority = () => Doke.notificationEvent || null;
  const deliveryAuthority = () => Doke.notificationDelivery || null;

  const registerDomain = () => {
    const storage = accountStorage();
    if (!storage?.registerDomain) return false;
    storage.registerDomain({
      domain: DOMAIN,
      dataClass: storage.dataClasses?.ACCOUNT_PRIVATE || 'account_private',
      retention: storage.retention?.UNTIL_LOGOUT || 'until_logout',
      clearOnLogout: true,
      allowGuest: true,
      crossTab: storage.crossTab?.METADATA || 'metadata',
      maxBytes: 4096
    });
    return true;
  };

  const storageKey = () => accountStorage()?.makeKey?.({ domain: DOMAIN, key: PREFS_KEY, version: STORAGE_VERSION }) || '';

  const currentScopeFingerprint = () => {
    const key = storageKey();
    return key ? normalizeText(accountStorage()?.publicDescriptor?.(key)?.scopeFingerprint) : '';
  };

  const normalizePrefs = (value = {}) => Object.freeze({
    enabled: value?.enabled === true,
    promptDismissed: value?.promptDismissed === true
  });

  const readPreferences = () => {
    try {
      const storage = accountStorage();
      const value = storage?.read?.({ domain: DOMAIN, key: PREFS_KEY, version: STORAGE_VERSION });
      return normalizePrefs({ ...DEFAULT_PREFS, ...(value && typeof value === 'object' ? value : {}) });
    } catch (_error) {
      return DEFAULT_PREFS;
    }
  };

  const emitPreferenceChange = (reason) => {
    const prefs = readPreferences();
    try {
      document.dispatchEvent(new CustomEvent('doke:browser-notification-preferences-changed', {
        detail: Object.freeze({
          contract: CONTRACT,
          version: VERSION,
          enabled: prefs.enabled,
          promptDismissed: prefs.promptDismissed,
          scopeFingerprint: currentScopeFingerprint(),
          reason: normalizeText(reason) || 'updated'
        })
      }));
    } catch (_error) {}
    return prefs;
  };

  const writePreferences = (next = {}, reason = 'updated') => {
    const prefs = normalizePrefs({ ...readPreferences(), ...(next && typeof next === 'object' ? next : {}) });
    try {
      accountStorage()?.write?.({ domain: DOMAIN, key: PREFS_KEY, version: STORAGE_VERSION, value: prefs });
    } catch (_error) {}
    emitPreferenceChange(reason);
    return prefs;
  };

  const supported = () => typeof window.Notification === 'function' || typeof window.Notification === 'object';
  const permission = () => supported() ? normalizeText(window.Notification.permission || 'default').toLowerCase() : 'unsupported';

  const getState = () => {
    const prefs = readPreferences();
    return Object.freeze({
      contract: CONTRACT,
      version: VERSION,
      supported: supported(),
      permission: permission(),
      enabled: prefs.enabled,
      promptDismissed: prefs.promptDismissed,
      scopeFingerprint: currentScopeFingerprint()
    });
  };

  const canNotify = () => {
    const state = getState();
    return Boolean(state.supported && state.permission === 'granted' && state.enabled && state.scopeFingerprint);
  };

  const requestPermission = async () => {
    if (!supported()) return 'unsupported';
    let result = permission();
    if (result === 'default') {
      try {
        result = normalizeText(await window.Notification.requestPermission()).toLowerCase() || 'default';
      } catch (_error) {
        result = 'default';
      }
    }
    writePreferences({
      enabled: result === 'granted',
      promptDismissed: result !== 'granted'
    }, 'permission-result');
    return result;
  };

  const disable = () => writePreferences({ enabled: false }, 'disabled');
  const dismissPrompt = () => writePreferences({ promptDismissed: true }, 'prompt-dismissed');

  const canonicalize = (payload) => {
    const authority = eventAuthority();
    if (!authority?.normalize) return null;
    try { return authority.normalize(payload || {}); }
    catch (_error) { return null; }
  };

  const identityOf = (payload, canonical) => normalizeText(
    canonical?.dedupeKey || canonical?.eventId || payload?.dedupeKey || payload?.eventId || payload?.eventKey || payload?.id
  );

  const recipientMatches = (payload = {}) => {
    const recipient = normalizeText(payload.recipientAccountKey || payload.userId || payload.recipientAccountId).toLowerCase();
    if (!recipient) return true;
    let current = null;
    try { current = Doke.session?.getCurrentUser?.() || window.DokeAuth?.service?.getCurrentUser?.() || null; }
    catch (_error) { current = null; }
    if (!current) return false;
    return [current.id, current.accountKey, current.email]
      .map((value) => normalizeText(value).toLowerCase())
      .filter(Boolean)
      .includes(recipient);
  };

  const sanitizePreviewText = (value, maxLength) => normalizeText(value)
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);

  const buildPreview = (payload, canonical) => {
    const channel = normalizeText(canonical?.channelPolicy?.browser).toLowerCase();
    const privacy = normalizeText(canonical?.privacyLevel).toUpperCase();
    if (channel === 'forbidden' || privacy === 'SENSITIVE_NO_OS_PREVIEW') return null;

    const generic = channel === 'generic_only' || privacy !== 'PUBLIC_PREVIEW';
    if (generic) {
      return Object.freeze({
        title: 'Doke',
        body: 'Você recebeu uma nova notificação na Doke.'
      });
    }

    return Object.freeze({
      title: sanitizePreviewText(payload?.title || 'Doke', 80) || 'Doke',
      body: sanitizePreviewText(payload?.body || payload?.message || 'Você recebeu uma nova notificação na Doke.', 160)
    });
  };

  const deliveryAllows = (payload, canonical) => {
    const delivery = deliveryAuthority();
    if (!delivery?.decide) return false;
    const decision = delivery.decide({
      ...payload,
      eventAccepted: canonical?.accepted === true,
      eventCategory: canonical?.category,
      priority: canonical?.priority,
      attentionState: canonical?.attentionState
    });
    return decision?.outcome === delivery.outcomes?.ALLOW_TOAST || decision?.outcome === 'ALLOW_TOAST';
  };

  const identityTag = (identity) => {
    let hash = 2166136261;
    for (let index = 0; index < identity.length; index += 1) {
      hash ^= identity.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `doke-${(hash >>> 0).toString(36)}`;
  };

  const remember = (key) => {
    if (seen.has(key)) return false;
    seen.add(key);
    while (seen.size > MAX_SEEN) seen.delete(seen.values().next().value);
    return true;
  };

  const safeTarget = (rawTarget) => {
    const fallback = 'notificacoes.html';
    const raw = normalizeText(rawTarget);
    if (!raw) return fallback;
    try {
      const base = new URL(window.location?.href || 'https://doke.local/notificacoes.html');
      const target = new URL(raw, base);
      if (target.origin !== base.origin || target.username || target.password) return fallback;
      const route = target.pathname.split('/').filter(Boolean).pop() || '';
      if (!ALLOWED_ROUTES.has(route)) return fallback;
      const safeParams = new URLSearchParams();
      target.searchParams.forEach((value, key) => {
        if (ALLOWED_QUERY_KEYS.has(key)) safeParams.append(key, value);
      });
      const search = safeParams.toString();
      return `${route}${search ? `?${search}` : ''}${target.hash || ''}`;
    } catch (_error) {
      return fallback;
    }
  };

  const navigate = (target) => {
    if (typeof window.DokeNavigate === 'function') {
      window.DokeNavigate(target);
      return;
    }
    if (typeof window.location?.assign === 'function') {
      window.location.assign(target);
      return;
    }
    window.location.href = target;
  };

  const present = (payload = {}) => {
    if (!canNotify()) return Object.freeze({ shown: false, reason: 'channel-disabled' });
    if (document.visibilityState === 'visible') return Object.freeze({ shown: false, reason: 'document-visible' });
    if (!recipientMatches(payload)) return Object.freeze({ shown: false, reason: 'recipient-mismatch' });

    const canonical = canonicalize(payload);
    if (!canonical) return Object.freeze({ shown: false, reason: 'event-authority-unavailable' });
    if (canonical.accepted !== true) return Object.freeze({ shown: false, reason: canonical.rejectionReason || 'event-rejected' });
    if (!deliveryAllows(payload, canonical)) return Object.freeze({ shown: false, reason: 'delivery-suppressed' });

    const preview = buildPreview(payload, canonical);
    if (!preview) return Object.freeze({ shown: false, reason: 'browser-preview-forbidden' });

    const identity = identityOf(payload, canonical);
    if (!identity) return Object.freeze({ shown: false, reason: 'missing-identity' });
    const fence = currentScopeFingerprint();
    if (!fence) return Object.freeze({ shown: false, reason: 'missing-account-fence' });
    const seenKey = `${fence}:${identity}`;
    if (!remember(seenKey)) return Object.freeze({ shown: false, reason: 'duplicate' });

    const deliveryPrefs = deliveryAuthority()?.getPreferences?.() || {};
    let notification;
    try {
      notification = new window.Notification(preview.title, {
        body: preview.body,
        tag: identityTag(identity),
        renotify: canonical.priority === 'HIGH' || canonical.priority === 'CRITICAL',
        silent: deliveryPrefs.sound === false || canonical.channelPolicy?.sound === 'forbidden'
      });
    } catch (_error) {
      seen.delete(seenKey);
      return Object.freeze({ shown: false, reason: 'notification-construction-failed' });
    }

    notification.onclick = () => {
      try { notification.close?.(); } catch (_error) {}
      try { window.focus?.(); } catch (_error) {}
      const sameAccount = fence === currentScopeFingerprint();
      if (sameAccount) {
        const notificationId = normalizeText(payload.id || payload.notificationId);
        if (notificationId) {
          try { window.DokeInAppNotifications?.markAsRead?.(notificationId); } catch (_error) {}
        }
      }
      navigate(sameAccount ? safeTarget(payload.targetUrl || payload.deepLink) : 'notificacoes.html');
    };

    return Object.freeze({ shown: true, reason: 'shown', identity });
  };

  const removePrompt = () => {
    try { document.querySelector('[data-browser-notification-prompt]')?.remove?.(); } catch (_error) {}
  };

  const ensurePrompt = () => {
    const state = getState();
    if (!state.supported || state.permission !== 'default' || state.enabled || state.promptDismissed || !state.scopeFingerprint) return false;
    if (document.querySelector('[data-browser-notification-prompt]')) return false;
    const prompt = document.createElement('section');
    prompt.className = 'doke-browser-notification-prompt';
    prompt.dataset.browserNotificationPrompt = '';
    prompt.setAttribute('role', 'status');
    prompt.innerHTML = '<div><strong>Receba alertas mesmo fora desta aba</strong><span>Ative as notificações do navegador para atualizações permitidas pelas suas preferências.</span></div><div class="doke-browser-notification-prompt__actions"><button class="doke-btn doke-btn--primary" type="button" data-browser-notification-enable>Ativar</button><button class="doke-btn doke-btn--ghost" type="button" data-browser-notification-dismiss>Agora não</button></div>';
    document.body?.appendChild?.(prompt);
    prompt.querySelector('[data-browser-notification-enable]')?.addEventListener('click', async () => {
      await requestPermission();
      prompt.remove?.();
    });
    prompt.querySelector('[data-browser-notification-dismiss]')?.addEventListener('click', () => {
      dismissPrompt();
      prompt.remove?.();
    });
    return true;
  };

  const refreshAccount = () => {
    const next = currentScopeFingerprint();
    const changed = Boolean(scopeFingerprint && next && scopeFingerprint !== next);
    if (changed) {
      seen.clear();
      removePrompt();
    }
    scopeFingerprint = next;
    return Object.freeze({ changed, ...getState() });
  };

  const cleanupLegacyGlobal = () => {
    try { window.localStorage?.removeItem?.(LEGACY_PREFS_KEY); } catch (_error) {}
  };

  registerDomain();
  cleanupLegacyGlobal();
  scopeFingerprint = currentScopeFingerprint();

  document.addEventListener('doke:in-app-notification', (event) => {
    present(event?.detail || {});
  });
  document.addEventListener('doke:auth-session-change', () => {
    refreshAccount();
    window.setTimeout?.(ensurePrompt, 0);
  });
  document.addEventListener('DOMContentLoaded', () => {
    window.setTimeout?.(ensurePrompt, 1600);
  });

  const api = Object.freeze({
    version: VERSION,
    contract: CONTRACT,
    supported,
    permission,
    canNotify,
    getPreferences: readPreferences,
    getState,
    requestPermission,
    enable: requestPermission,
    disable,
    dismissPrompt,
    ensurePrompt,
    present,
    refreshAccount,
    safeTarget
  });

  Doke.notificationBrowser = api;
  window.DokeBrowserNotifications = api;
})();
