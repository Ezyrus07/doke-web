/* Doke canonical notification delivery policy
   Responsibility: account-scoped notification preferences, DND/digest decisions
   and bounded digest queue. Toast rendering remains owned by notification-toast. */
(() => {
  'use strict';

  const Doke = (window.Doke = window.Doke || {});
  const VERSION = '20260809-ux-notif-007-v1';
  const CONTRACT = 'notification-delivery-v1';
  const DOMAIN = 'notification_delivery';
  const STORAGE_VERSION = 1;
  const PREFS_KEY = 'preferences';
  const DIGEST_KEY = 'digest_queue';
  const LEGACY_PREFS_KEY = 'doke.in-app-notification.preferences.v1';
  const LEGACY_DIGEST_KEY = 'doke.in-app-notification.digest.v1';
  const MAX_DIGEST_ITEMS = 100;
  const OUTCOMES = Object.freeze({
    ALLOW_TOAST: 'ALLOW_TOAST',
    QUEUE_DIGEST: 'QUEUE_DIGEST',
    SUPPRESS: 'SUPPRESS'
  });
  const PRIORITY_RANK = Object.freeze({ LOW: 0, SILENT: 0, NORMAL: 1, HIGH: 2, CRITICAL: 3 });
  const OPERATIONAL_CATEGORIES = new Set([
    'ORDERS', 'PROPOSALS', 'PAYMENTS', 'DISPUTES', 'ACCOUNT', 'SECURITY', 'PRODUCT', 'UNKNOWN_OPERATIONAL'
  ]);
  const DEFAULT_PREFS = Object.freeze({
    messages: true,
    reactions: true,
    mentions: true,
    events: true,
    social: true,
    operational: true,
    sound: true,
    digest: true,
    dndEnabled: false,
    dndUntil: 0,
    priorityMin: 'silent',
    mutedScopes: Object.freeze([]),
    mutedScopeLabels: Object.freeze({})
  });

  if (Doke.notificationDelivery && Doke.notificationDelivery.version === VERSION) return;

  let scopeFingerprint = '';

  const normalizeText = (value) => String(value == null ? '' : value).trim();
  const storage = () => Doke.accountStorage || null;
  const cloneObject = (value) => value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
  const uniqueStrings = (values) => Array.from(new Set((Array.isArray(values) ? values : [])
    .map((value) => normalizeText(value))
    .filter(Boolean))).slice(0, 100);

  const registerDomain = () => {
    const accountStorage = storage();
    if (!accountStorage?.registerDomain) return false;
    accountStorage.registerDomain({
      domain: DOMAIN,
      dataClass: accountStorage.dataClasses?.ACCOUNT_PRIVATE || 'account_private',
      retention: accountStorage.retention?.UNTIL_LOGOUT || 'until_logout',
      clearOnLogout: true,
      allowGuest: true,
      crossTab: accountStorage.crossTab?.METADATA || 'metadata',
      maxBytes: 32768
    });
    return true;
  };

  const storageKey = (key) => storage()?.makeKey?.({ domain: DOMAIN, key, version: STORAGE_VERSION }) || '';

  const currentScopeFingerprint = () => {
    const key = storageKey(PREFS_KEY);
    return key ? normalizeText(storage()?.publicDescriptor?.(key)?.scopeFingerprint) : '';
  };

  const readValue = (key, fallback) => {
    try {
      const accountStorage = storage();
      if (!accountStorage?.read) return fallback;
      const value = accountStorage.read({ domain: DOMAIN, key, version: STORAGE_VERSION });
      return value == null ? fallback : value;
    } catch (_error) {
      return fallback;
    }
  };

  const writeValue = (key, value) => {
    try {
      const accountStorage = storage();
      if (!accountStorage?.write) return false;
      accountStorage.write({ domain: DOMAIN, key, version: STORAGE_VERSION, value });
      return true;
    } catch (_error) {
      return false;
    }
  };

  const removeValue = (key) => {
    try {
      const accountStorage = storage();
      if (!accountStorage?.remove) return false;
      accountStorage.remove({ domain: DOMAIN, key, version: STORAGE_VERSION });
      return true;
    } catch (_error) {
      return false;
    }
  };

  const normalizePriorityMin = (value) => {
    const normalized = normalizeText(value).toLowerCase();
    return ['silent', 'normal', 'high'].includes(normalized) ? normalized : 'silent';
  };

  const normalizePrefs = (input = {}) => {
    const prefs = cloneObject(input);
    const mutedScopes = uniqueStrings(prefs.mutedScopes);
    const labels = cloneObject(prefs.mutedScopeLabels);
    const mutedScopeLabels = {};
    mutedScopes.forEach((scope) => {
      const label = normalizeText(labels[scope]);
      if (label) mutedScopeLabels[scope] = label.slice(0, 120);
    });
    const dndEnabled = prefs.dndEnabled === true;
    const dndUntil = dndEnabled && Number.isFinite(Number(prefs.dndUntil)) ? Math.max(0, Number(prefs.dndUntil)) : 0;
    return Object.freeze({
      messages: prefs.messages !== false,
      reactions: prefs.reactions !== false,
      mentions: prefs.mentions !== false,
      events: prefs.events !== false,
      social: prefs.social !== false,
      operational: prefs.operational !== false,
      sound: prefs.sound !== false,
      digest: prefs.digest !== false,
      dndEnabled,
      dndUntil,
      priorityMin: normalizePriorityMin(prefs.priorityMin),
      mutedScopes: Object.freeze(mutedScopes),
      mutedScopeLabels: Object.freeze(mutedScopeLabels)
    });
  };

  const getPreferences = () => normalizePrefs({ ...DEFAULT_PREFS, ...cloneObject(readValue(PREFS_KEY, {})) });

  const emitPreferenceChange = (reason = 'updated') => {
    const detail = Object.freeze({
      contract: CONTRACT,
      version: VERSION,
      scopeFingerprint: currentScopeFingerprint(),
      reason: normalizeText(reason) || 'updated'
    });
    try { document.dispatchEvent(new CustomEvent('doke:notification-preferences-changed', { detail })); } catch (_error) {}
    return detail;
  };

  const setPreferences = (next = {}) => {
    const previous = getPreferences();
    const merged = normalizePrefs({ ...previous, ...cloneObject(next) });
    writeValue(PREFS_KEY, merged);
    if (merged.digest === false) removeValue(DIGEST_KEY);
    emitPreferenceChange('updated');
    return merged;
  };

  const scopeOf = (payload = {}) => normalizeText(
    payload.scopeKey || payload.conversationId || payload.communityId || payload.sourceKey || ''
  );

  const identityOf = (payload = {}) => normalizeText(
    payload.dedupeKey || payload.eventId || payload.eventKey || payload.id || ''
  );

  const categoryOf = (payload = {}) => normalizeText(
    payload.eventCategory || payload.canonicalCategory || ''
  ).toUpperCase();

  const groupOf = (payload = {}) => {
    const type = normalizeText(payload.eventType || payload.type).toLowerCase();
    const category = categoryOf(payload);
    if (type.includes('mention')) return 'mentions';
    if (type.includes('reaction')) return 'reactions';
    if (type.includes('event')) return 'events';
    if (category === 'MESSAGES' || type.includes('message') || payload.category === 'messages') return 'messages';
    if (OPERATIONAL_CATEGORIES.has(category)) return 'operational';
    return 'social';
  };

  const priorityOf = (payload = {}) => {
    const value = normalizeText(payload.priority).toUpperCase();
    if (Object.hasOwn(PRIORITY_RANK, value)) return value;
    return 'NORMAL';
  };

  const isUrgent = (payload = {}) => (
    priorityOf(payload) === 'CRITICAL'
    || normalizeText(payload.attentionState).toUpperCase() === 'URGENT_ACTION_REQUIRED'
  );

  const isDndActive = (prefs = getPreferences(), at = Date.now()) => Boolean(
    prefs?.dndEnabled === true && Number(prefs?.dndUntil || 0) > Number(at)
  );

  const isMuted = (payload, prefs) => {
    const scope = scopeOf(payload);
    return Boolean(scope && Array.isArray(prefs?.mutedScopes) && prefs.mutedScopes.includes(scope));
  };

  const thresholdAllows = (payload, prefs) => {
    const threshold = normalizeText(prefs?.priorityMin || 'silent').toUpperCase();
    const thresholdRank = PRIORITY_RANK[threshold] ?? 0;
    return (PRIORITY_RANK[priorityOf(payload)] ?? 1) >= thresholdRank;
  };

  const decision = (outcome, reason, payload, prefs) => Object.freeze({
    contract: CONTRACT,
    outcome,
    reason,
    group: groupOf(payload),
    priority: priorityOf(payload),
    attentionState: normalizeText(payload?.attentionState).toUpperCase() || 'INFORMATIONAL',
    dndActive: isDndActive(prefs),
    digestEnabled: prefs?.digest !== false
  });

  const decide = (payload = {}, options = {}) => {
    const prefs = getPreferences();
    if (!payload || payload.read === true || payload.dismissed === true || payload.eventAccepted === false) {
      return decision(OUTCOMES.SUPPRESS, 'ineligible-presentation', payload, prefs);
    }
    if (options.skipDelivery === true || options.skipDigest === true) {
      return decision(OUTCOMES.ALLOW_TOAST, 'explicit-delivery-bypass', payload, prefs);
    }
    const group = groupOf(payload);
    if (prefs[group] === false) return decision(OUTCOMES.SUPPRESS, `group-disabled:${group}`, payload, prefs);
    if (isMuted(payload, prefs)) return decision(OUTCOMES.SUPPRESS, 'scope-muted', payload, prefs);
    if (!thresholdAllows(payload, prefs)) return decision(OUTCOMES.SUPPRESS, 'below-priority-threshold', payload, prefs);
    if (isDndActive(prefs)) {
      if (isUrgent(payload)) return decision(OUTCOMES.ALLOW_TOAST, 'urgent-dnd-bypass', payload, prefs);
      if (prefs.digest === false) return decision(OUTCOMES.SUPPRESS, 'dnd-digest-disabled', payload, prefs);
      return decision(OUTCOMES.QUEUE_DIGEST, 'dnd-active', payload, prefs);
    }
    return decision(OUTCOMES.ALLOW_TOAST, 'delivery-allowed', payload, prefs);
  };

  const readDigest = () => {
    const value = readValue(DIGEST_KEY, []);
    return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object').slice(-MAX_DIGEST_ITEMS) : [];
  };

  const enqueueDigest = (payload = {}, deliveryDecision = null) => {
    const identity = identityOf(payload);
    if (!identity) return Object.freeze({ queued: false, reason: 'missing-identity', size: readDigest().length });
    const resolved = deliveryDecision?.outcome ? deliveryDecision : decide(payload);
    if (resolved.outcome !== OUTCOMES.QUEUE_DIGEST) {
      return Object.freeze({ queued: false, reason: 'decision-not-digest', size: readDigest().length });
    }
    const queue = readDigest();
    const nextItem = Object.freeze({
      identity,
      group: resolved.group || groupOf(payload),
      priority: resolved.priority || priorityOf(payload),
      createdAt: normalizeText(payload.createdAt) || new Date().toISOString()
    });
    const existingIndex = queue.findIndex((item) => item.identity === identity);
    if (existingIndex >= 0) queue[existingIndex] = nextItem;
    else queue.push(nextItem);
    const bounded = queue.slice(-MAX_DIGEST_ITEMS);
    writeValue(DIGEST_KEY, bounded);
    return Object.freeze({ queued: true, reason: existingIndex >= 0 ? 'deduped' : 'queued', size: bounded.length });
  };

  const digestBody = (groups) => Object.entries(groups)
    .map(([group, count]) => `${count} ${group}`)
    .join(' · ');

  const flushDigest = () => {
    const prefs = getPreferences();
    if (isDndActive(prefs)) return Object.freeze({ flushed: false, reason: 'dnd-active', count: 0, payload: null });
    if (prefs.digest === false) {
      removeValue(DIGEST_KEY);
      return Object.freeze({ flushed: false, reason: 'digest-disabled', count: 0, payload: null });
    }
    const queue = readDigest();
    if (!queue.length) return Object.freeze({ flushed: false, reason: 'empty', count: 0, payload: null });
    const groups = queue.reduce((acc, item) => {
      const key = normalizeText(item.group) || 'social';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    removeValue(DIGEST_KEY);
    const payload = Object.freeze({
      id: `digest-${Date.now()}`,
      eventKey: `digest-${Date.now()}`,
      title: `${queue.length} alertas acumulados`,
      body: digestBody(groups),
      targetUrl: 'notificacoes.html',
      priority: 'NORMAL',
      type: 'digest',
      duration: 9000
    });
    return Object.freeze({ flushed: true, reason: 'flushed', count: queue.length, groups: Object.freeze({ ...groups }), payload });
  };

  const muteScope = (scope, label = 'Origem') => {
    const normalizedScope = normalizeText(scope);
    if (!normalizedScope) return getPreferences();
    const prefs = getPreferences();
    const mutedScopes = uniqueStrings([...prefs.mutedScopes, normalizedScope]);
    const mutedScopeLabels = { ...prefs.mutedScopeLabels, [normalizedScope]: normalizeText(label).slice(0, 120) || 'Origem' };
    return setPreferences({ mutedScopes, mutedScopeLabels });
  };

  const unmuteScope = (scope) => {
    const normalizedScope = normalizeText(scope);
    const prefs = getPreferences();
    const mutedScopes = prefs.mutedScopes.filter((item) => item !== normalizedScope);
    const mutedScopeLabels = { ...prefs.mutedScopeLabels };
    delete mutedScopeLabels[normalizedScope];
    return setPreferences({ mutedScopes, mutedScopeLabels });
  };

  const refreshAccount = () => {
    const nextFingerprint = currentScopeFingerprint();
    const changed = Boolean(scopeFingerprint && nextFingerprint && scopeFingerprint !== nextFingerprint);
    scopeFingerprint = nextFingerprint;
    if (changed) {
      try {
        document.dispatchEvent(new CustomEvent('doke:notification-delivery-account-changed', {
          detail: Object.freeze({ contract: CONTRACT, version: VERSION, scopeFingerprint })
        }));
      } catch (_error) {}
    }
    return Object.freeze({ changed, scopeFingerprint, preferences: getPreferences(), digestSize: readDigest().length });
  };

  const cleanupLegacyGlobals = () => {
    try { window.localStorage?.removeItem?.(LEGACY_PREFS_KEY); } catch (_error) {}
    try { window.localStorage?.removeItem?.(LEGACY_DIGEST_KEY); } catch (_error) {}
  };

  registerDomain();
  cleanupLegacyGlobals();
  scopeFingerprint = currentScopeFingerprint();

  window.addEventListener?.('storage', (event) => {
    const prefsStorageKey = storageKey(PREFS_KEY);
    const digestStorageKey = storageKey(DIGEST_KEY);
    if (event.key === prefsStorageKey) emitPreferenceChange('cross-tab');
    if (event.key === digestStorageKey) {
      try {
        document.dispatchEvent(new CustomEvent('doke:notification-digest-changed', {
          detail: Object.freeze({ contract: CONTRACT, version: VERSION, scopeFingerprint: currentScopeFingerprint() })
        }));
      } catch (_error) {}
    }
  });

  const api = Object.freeze({
    version: VERSION,
    contract: CONTRACT,
    outcomes: OUTCOMES,
    maxDigestItems: MAX_DIGEST_ITEMS,
    getPreferences,
    setPreferences,
    muteScope,
    unmuteScope,
    isDndActive,
    decide,
    enqueueDigest,
    flushDigest,
    refreshAccount,
    getState() {
      return Object.freeze({
        contract: CONTRACT,
        version: VERSION,
        scopeFingerprint: currentScopeFingerprint(),
        preferences: getPreferences(),
        digestSize: readDigest().length
      });
    }
  });

  Doke.notificationDelivery = api;
})();
