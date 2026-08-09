#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, content):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def replace_exact(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {count}')
    return text.replace(old, new, 1)


DELIVERY = r'''/* Doke canonical notification delivery policy
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
'''

TEST_POLICY = r'''#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

let currentUser = { id: 'account_delivery_alpha' };
const storage = new Map();
const windowListeners = new Map();
const documentEvents = [];
const domains = new Map();

class CustomEventStub {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
}

const localStorageStub = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
  key(index) { return Array.from(storage.keys())[index] || null; },
  get length() { return storage.size; }
};

const accountStorage = {
  dataClasses: { ACCOUNT_PRIVATE: 'account_private' },
  retention: { UNTIL_LOGOUT: 'until_logout' },
  crossTab: { METADATA: 'metadata' },
  registerDomain(policy) {
    const existing = domains.get(policy.domain);
    if (existing) assert.deepEqual(existing, policy);
    domains.set(policy.domain, { ...policy });
    return policy;
  },
  resolveScope() { return { scopeId: currentUser?.id || 'guest_delivery_scope', kind: currentUser ? 'account' : 'guest' }; },
  makeKey({ domain, key, version = 1 }) {
    return `doke:${this.resolveScope().scopeId}:${domain}:${key}:v${version}`;
  },
  publicDescriptor(key) {
    const parts = String(key).split(':');
    return { scopeFingerprint: `scope_${parts[1]}`, domain: parts[2], keyFingerprint: `key_${parts[3]}`, version: Number(String(parts[4] || '').slice(1)) || 1 };
  },
  read(options) {
    const key = typeof options === 'string' ? options : this.makeKey(options);
    const raw = localStorageStub.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  },
  write(options) {
    const key = options.storageKey || this.makeKey(options);
    localStorageStub.setItem(key, JSON.stringify(options.value));
    return { storageKey: key, value: options.value, descriptor: this.publicDescriptor(key) };
  },
  remove(options) {
    const key = typeof options === 'string' ? options : this.makeKey(options);
    localStorageStub.removeItem(key);
    return true;
  }
};

const documentStub = {
  dispatchEvent(event) { documentEvents.push(event); return true; }
};

const Doke = { session: { getCurrentUser() { return currentUser; } }, accountStorage };
const windowStub = {
  Doke,
  localStorage: localStorageStub,
  document: documentStub,
  CustomEvent: CustomEventStub,
  addEventListener(type, listener) {
    if (!windowListeners.has(type)) windowListeners.set(type, []);
    windowListeners.get(type).push(listener);
  }
};

global.window = windowStub;
global.document = documentStub;
global.CustomEvent = CustomEventStub;
global.localStorage = localStorageStub;

const modulePath = require.resolve('../assets/js/core/notification-delivery.js');
delete require.cache[modulePath];
require(modulePath);

const delivery = Doke.notificationDelivery;
assert(delivery, 'notification delivery authority must publish');
assert.equal(delivery.contract, 'notification-delivery-v1');
assert.equal(domains.has('notification_delivery'), true);
assert.equal(storage.has('doke.in-app-notification.preferences.v1'), false);
assert.equal(storage.has('doke.in-app-notification.digest.v1'), false);

let prefs = delivery.getPreferences();
assert.equal(prefs.digest, true);
assert.equal(prefs.operational, true);
assert.equal(delivery.isDndActive(prefs), false);

prefs = delivery.setPreferences({ social: false, priorityMin: 'normal' });
assert.equal(prefs.social, false);
assert.equal(delivery.decide({ id: 'social-1', eventType: 'social_like', priority: 'NORMAL' }).outcome, 'SUPPRESS');
assert.equal(delivery.decide({ id: 'order-1', eventType: 'order_created', eventCategory: 'ORDERS', priority: 'HIGH' }).outcome, 'ALLOW_TOAST');
assert.equal(delivery.decide({ id: 'low-1', eventCategory: 'ORDERS', priority: 'LOW' }).reason, 'below-priority-threshold');

prefs = delivery.muteScope('conversation-1', 'Conversa 1');
assert.equal(prefs.mutedScopes.includes('conversation-1'), true);
assert.equal(delivery.decide({ id: 'message-muted', eventCategory: 'MESSAGES', priority: 'HIGH', conversationId: 'conversation-1' }).reason, 'scope-muted');
prefs = delivery.unmuteScope('conversation-1');
assert.equal(prefs.mutedScopes.includes('conversation-1'), false);

prefs = delivery.setPreferences({
  social: true,
  priorityMin: 'silent',
  digest: true,
  dndEnabled: true,
  dndUntil: Date.now() + 60_000
});
assert.equal(delivery.isDndActive(prefs), true);

const normalPayload = { id: 'digest-1', eventId: 'evt-digest-1', eventCategory: 'ORDERS', priority: 'NORMAL', createdAt: '2026-08-09T20:00:00.000Z' };
let decision = delivery.decide(normalPayload);
assert.equal(decision.outcome, 'QUEUE_DIGEST');
let queued = delivery.enqueueDigest(normalPayload, decision);
assert.equal(queued.queued, true);
assert.equal(queued.size, 1);
queued = delivery.enqueueDigest({ ...normalPayload, createdAt: '2026-08-09T20:01:00.000Z' }, decision);
assert.equal(queued.reason, 'deduped');
assert.equal(queued.size, 1);

const critical = delivery.decide({ id: 'critical-1', eventCategory: 'DISPUTES', priority: 'CRITICAL', attentionState: 'URGENT_ACTION_REQUIRED' });
assert.equal(critical.outcome, 'ALLOW_TOAST');
assert.equal(critical.reason, 'urgent-dnd-bypass');

for (let index = 0; index < 130; index += 1) {
  const payload = { id: `bulk-${index}`, eventId: `evt-bulk-${index}`, eventCategory: 'ORDERS', priority: 'NORMAL' };
  delivery.enqueueDigest(payload, delivery.decide(payload));
}
assert.equal(delivery.getState().digestSize, 100, 'digest queue must remain bounded');

let flush = delivery.flushDigest();
assert.equal(flush.flushed, false);
assert.equal(flush.reason, 'dnd-active');

delivery.setPreferences({ dndEnabled: false, dndUntil: 0, digest: true });
flush = delivery.flushDigest();
assert.equal(flush.flushed, true);
assert.equal(flush.count, 100);
assert.equal(flush.payload.type, 'digest');
assert.equal(delivery.getState().digestSize, 0);

const alphaPrefsKey = accountStorage.makeKey({ domain: 'notification_delivery', key: 'preferences', version: 1 });
delivery.setPreferences({ social: false, messages: false });
assert.equal(delivery.getPreferences().social, false);
currentUser = { id: 'account_delivery_beta' };
const transition = delivery.refreshAccount();
assert.equal(transition.changed, true);
assert.equal(delivery.getPreferences().social, true, 'beta account must not inherit alpha preferences');
const betaPrefsKey = accountStorage.makeKey({ domain: 'notification_delivery', key: 'preferences', version: 1 });
assert.notEqual(alphaPrefsKey, betaPrefsKey);
delivery.setPreferences({ social: true, messages: false });
assert.equal(delivery.getPreferences().messages, false);
currentUser = { id: 'account_delivery_alpha' };
delivery.refreshAccount();
assert.equal(delivery.getPreferences().social, false);
assert.equal(delivery.getPreferences().messages, false);

const storageListeners = windowListeners.get('storage') || [];
const preferenceEventsBefore = documentEvents.filter((event) => event.type === 'doke:notification-preferences-changed').length;
storageListeners.forEach((listener) => listener({ key: alphaPrefsKey, newValue: localStorageStub.getItem(alphaPrefsKey) }));
assert.equal(documentEvents.filter((event) => event.type === 'doke:notification-preferences-changed').length, preferenceEventsBefore + 1);

for (const key of ['window', 'document', 'CustomEvent', 'localStorage']) delete global[key];
delete require.cache[modulePath];

console.log('[ux-notif-007-delivery-policy] ok');
console.log('- account-scoped prefs, DND decisions, urgent bypass, bounded/deduped digest, flush and account fence validated');
'''

TEST_INTEGRATION = r'''#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

const rendered = [];
const queued = [];
const Doke = {};
const documentStub = { body: { appendChild() {} }, createElement() { throw new Error('default DOM renderer must not run'); } };
const windowStub = {
  Doke,
  document: documentStub,
  setTimeout() { return 1; },
  clearTimeout() {}
};
global.window = windowStub;
global.document = documentStub;

const managerPath = require.resolve('../assets/js/core/notification-toast.js');
delete require.cache[managerPath];
require(managerPath);

const manager = Doke.notificationToast;
manager.configure({
  getAccountKey: () => 'account_delivery_test',
  isForCurrentUser: () => true,
  getDeliveryDecision(payload, options) {
    if (options?.skipDelivery) return { outcome: 'ALLOW_TOAST', reason: 'skip' };
    if (payload.mode === 'digest') return { outcome: 'QUEUE_DIGEST', reason: 'dnd-active' };
    if (payload.mode === 'suppress') return { outcome: 'SUPPRESS', reason: 'disabled' };
    return { outcome: 'ALLOW_TOAST', reason: 'allowed' };
  },
  onQueueDigest(payload, decision) { queued.push({ payload, decision }); },
  renderToast(payload) { rendered.push(payload); return { payload, notificationId: payload.id }; }
});

assert.equal(manager.show({ id: 'digest-1', mode: 'digest' }), false);
assert.equal(queued.length, 1);
assert.equal(rendered.length, 0);
assert.equal(manager.show({ id: 'suppress-1', mode: 'suppress' }), false);
assert.equal(rendered.length, 0);
assert.equal(manager.show({ id: 'allow-1', mode: 'allow' }), true);
assert.equal(rendered.length, 1);
assert.equal(manager.show({ id: 'allow-1', mode: 'allow' }), false, 'toast identity dedupe remains owned by manager');
assert.equal(manager.show({ id: 'digest-summary', mode: 'suppress' }, { skipDelivery: true }), true, 'digest summary can bypass H07 requeue explicitly');
assert.equal(rendered.length, 2);

for (const key of ['window', 'document']) delete global[key];
delete require.cache[managerPath];

console.log('[ux-notif-007-toast-delivery-integration] ok');
console.log('- toast manager consumes explicit H07 outcomes while preserving render/dedupe authority');
'''

TEST_DELEGATION = r'''#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const adapter = fs.readFileSync(path.join(root, 'assets/js/features/in-app-notifications.js'), 'utf8');
const toast = fs.readFileSync(path.join(root, 'assets/js/core/notification-toast.js'), 'utf8');
const delivery = fs.readFileSync(path.join(root, 'assets/js/core/notification-delivery.js'), 'utf8');

for (const forbidden of [
  "const PREFS_KEY = 'doke.in-app-notification.preferences.v1'",
  "const DIGEST_KEY = 'doke.in-app-notification.digest.v1'",
  'const DEFAULT_PREFS =',
  'const PRIORITY_RANK =',
  'const queueDigest = (payload)',
  'const shouldToast = (payload'
]) assert.equal(adapter.includes(forbidden), false, `adapter must not retain H07 authority: ${forbidden}`);

for (const required of [
  'const getDeliveryManager = () => window.Doke?.notificationDelivery || null;',
  'getDeliveryDecision:',
  'onQueueDigest:',
  'getDeliveryManager()?.refreshAccount?.()',
  'getPreferences,',
  'setPreferences,'
]) assert.ok(adapter.includes(required), `missing H07 adapter delegation: ${required}`);

assert.ok(toast.includes("outcome === 'QUEUE_DIGEST'"));
assert.ok(toast.includes("outcome !== 'ALLOW_TOAST'"));
assert.ok(delivery.includes("const CONTRACT = 'notification-delivery-v1'"));
assert.ok(delivery.includes("domain: DOMAIN"));
assert.ok(delivery.includes("ALLOW_TOAST"));
assert.ok(delivery.includes("QUEUE_DIGEST"));
assert.ok(delivery.includes("SUPPRESS"));

const consumers = fs.readdirSync(root)
  .filter((name) => name.endsWith('.html'))
  .filter((name) => fs.readFileSync(path.join(root, name), 'utf8').includes('assets/js/features/in-app-notifications.js'));
assert.ok(consumers.length > 0);
for (const name of consumers) {
  const html = fs.readFileSync(path.join(root, name), 'utf8');
  const accountStorageTag = 'assets/js/core/account-storage.js';
  const deliveryTag = 'assets/js/core/notification-delivery.js';
  const adapterTag = 'assets/js/features/in-app-notifications.js';
  assert.equal(html.split(deliveryTag).length - 1, 1, `${name}: delivery authority must load exactly once`);
  assert.ok(html.indexOf(accountStorageTag) < html.indexOf(deliveryTag), `${name}: account storage must load before delivery authority`);
  assert.ok(html.indexOf(deliveryTag) < html.indexOf(adapterTag), `${name}: delivery authority must load before adapter`);
}

console.log('[ux-notif-007-adapter-delegation] ok');
console.log(`- H07 authority delegation and script order validated across ${consumers.length} root consumers`);
'''

DOC = r'''# UX-NOTIF-007 — Canonical digest and DND delivery policy

## Status

- Epic: `EPIC-11 — notificações, badges e reengajamento`;
- Tracking: issue `#103`;
- Base: `ux/ux-notif-006-event-policy-matrix`;
- Base SHA certificado: `7ba99bfbd293f83d8e14bccf75b4bd0703a4199d`;
- Branch: `ux/ux-notif-007-digest-dnd-policy`;
- Handoff: `NOTIF-H07 — digest/DND`;
- Fase 1: implementação frontend/contract em certificação;
- Merge autorizado: não;
- Ready for review autorizado: não;
- Backend/staging/produção: não acessados.

## Causa raiz

Antes do H07, `in-app-notifications.js` mantinha chaves globais de preferências e digest, calculava DND/mute/threshold, enfileirava digest e configurava o toast manager com callbacks fragmentados. Isso criava policy distribuída e não provava isolamento entre contas.

## Autoridade

A Fase 1 introduz:

```text
Doke.notificationDelivery
contract: notification-delivery-v1
```

Responsabilidades:

- preferências de entrega account-scoped;
- mute scopes e prioridade mínima;
- DND;
- decisão `ALLOW_TOAST | QUEUE_DIGEST | SUPPRESS`;
- fila de digest bounded/deduped;
- flush de digest;
- account fence/cross-tab do scope atual.

Não possui:

- render/lifecycle de toast (`Doke.notificationToast`);
- inbox/read/badges (`Doke.notificationCenter`);
- schema/category/priority/attention (`Doke.notificationEvent`);
- persistência/transport de notificações (service/repository);
- backend/browser notifications/quick actions.

## Persistência

H07 registra o domínio `notification_delivery` em `Doke.accountStorage` como `ACCOUNT_PRIVATE`, `UNTIL_LOGOUT`, `clearOnLogout=true`, `crossTab=metadata`.

As antigas chaves globais:

- `doke.in-app-notification.preferences.v1`;
- `doke.in-app-notification.digest.v1`;

são removidas e não são importadas para um usuário novo porque não carregam ownership confiável.

## Policy

A decisão é determinística:

1. read/dismissed/rejected → `SUPPRESS`;
2. grupo desabilitado → `SUPPRESS`;
3. scope silenciado → `SUPPRESS`;
4. abaixo de priority threshold → `SUPPRESS`;
5. DND ativo + `CRITICAL` ou `URGENT_ACTION_REQUIRED` → `ALLOW_TOAST`;
6. DND ativo + digest habilitado → `QUEUE_DIGEST`;
7. DND ativo + digest desabilitado → `SUPPRESS`;
8. demais eventos elegíveis → `ALLOW_TOAST`.

Urgência vem apenas de metadata canônica H06, nunca de copy.

## Digest

- identidade: `dedupeKey -> eventId -> eventKey -> id`;
- máximo: 100 entradas por scope;
- replay da mesma identidade atualiza a entrada, não duplica;
- itens armazenados são mínimos: identity/group/priority/createdAt;
- flush não ocorre durante DND;
- desabilitar digest limpa a fila;
- o digest sintético usa `skipDelivery` somente para evitar reentrada na própria fila.

## Compatibilidade

O adapter mantém a API pública legada `window.DokeInAppNotifications` para a UI atual, mas `getPreferences`, `setPreferences`, `muteScope`, `unmuteScope`, `isDndActive` e `flushDigest` delegam para H07.

`notification-toast.js` preserva o fallback antigo apenas quando nenhuma authority H07 foi configurada. No runtime canônico atual, o adapter configura `getDeliveryDecision` e `onQueueDigest`, portanto o toast manager não decide DND.

## Testes dedicados

- `scripts/test-ux-notif-007-delivery-policy.js`;
- `scripts/test-ux-notif-007-toast-delivery-integration.js`;
- `scripts/test-ux-notif-007-adapter-delegation.js`.

## Fora de escopo

- H08 browser notifications;
- H09 quick actions;
- backend/Supabase migrations/RPCs;
- staging/produção;
- redesign visual amplo;
- novas mutations de domínio.

## Definition of Done

A Fase 1 só pode ser considerada tecnicamente concluída quando, no mesmo SHA permanente:

1. árvore sem executores/patchers temporários;
2. sintaxe JS;
3. três testes H07;
4. regressões H01-H06;
5. notification repository/API e account/auth;
6. Domain Completion Matrix e agent governance;
7. LCOV executável das superfícies H07 alteradas;
8. Sonar Quality Gate com zero New/Accepted/Hotspots e cobertura suficiente;
9. `git diff --check`;
10. PR próprio OPEN / DRAFT / UNMERGED.
'''

# Write new authority/tests/doc.
write('assets/js/core/notification-delivery.js', DELIVERY)
write('scripts/test-ux-notif-007-delivery-policy.js', TEST_POLICY)
write('scripts/test-ux-notif-007-toast-delivery-integration.js', TEST_INTEGRATION)
write('scripts/test-ux-notif-007-adapter-delegation.js', TEST_DELEGATION)
write('docs/ux/UX-NOTIF-007.md', DOC)

# Patch adapter.
path = 'assets/js/features/in-app-notifications.js'
text = read(path)
text = replace_exact(text,
"  const BUS_KEY = 'doke.in-app-notification.bus.v1';\n  const ACTION_KEY = 'doke.in-app-notification.action.v1';\n  const PREFS_KEY = 'doke.in-app-notification.preferences.v1';\n  const DIGEST_KEY = 'doke.in-app-notification.digest.v1';\n  const TAB_ID = `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;\n  const DEFAULT_PREFS = { messages: true, reactions: true, mentions: true, events: true, social: true, sound: true, digest: true, dndEnabled: false, dndUntil: 0, priorityMin: 'silent', mutedScopes: [] };\n  const PRIORITY_RANK = { silent: 0, normal: 1, high: 2 };\n  const pendingActions = new Map();",
"  const BUS_KEY = 'doke.in-app-notification.bus.v1';\n  const ACTION_KEY = 'doke.in-app-notification.action.v1';\n  const TAB_ID = `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;\n  const pendingActions = new Map();",
'adapter header')
text = replace_exact(text,
"  const getToastManager = () => window.Doke?.notificationToast || null;\n  const normalizePrefs = (prefs = {}) => ({ ...DEFAULT_PREFS, ...prefs, mutedScopes: Array.isArray(prefs.mutedScopes) ? prefs.mutedScopes : [] });\n  const readPrefs = () => normalizePrefs(safeParse(localStorage.getItem(PREFS_KEY), {}) || {});\n  const writePrefs = (prefs) => { const next = normalizePrefs(prefs); localStorage.setItem(PREFS_KEY, JSON.stringify(next)); document.dispatchEvent(new CustomEvent('doke:notification-preferences-changed', { detail: next })); return next; };",
"  const getToastManager = () => window.Doke?.notificationToast || null;\n  const getDeliveryManager = () => window.Doke?.notificationDelivery || null;",
'adapter prefs authority')
text = replace_exact(text,
"  const isDndActive = (prefs = readPrefs()) => Boolean(prefs.dndEnabled && Number(prefs.dndUntil || 0) > Date.now());\n  const isMuted = (payload, prefs = readPrefs()) => { const scope = scopeOf(payload); return Boolean(scope && prefs.mutedScopes.includes(scope)); };\n  const shouldToast = (payload, prefs = readPrefs()) => prefs[typeGroup(payload)] !== false && !isMuted(payload, prefs) && PRIORITY_RANK[priorityOf(payload)] >= PRIORITY_RANK[prefs.priorityMin || 'silent'];\n",
"",
'adapter delivery helpers')
text = replace_exact(text,
"  const playSound = (priority) => { if(priority==='silent'||!readPrefs().sound)return; try { const AudioContext=window.AudioContext||window.webkitAudioContext; if(!AudioContext)return; const ctx=new AudioContext(); const oscillator=ctx.createOscillator(); const gain=ctx.createGain(); oscillator.frequency.value=priority==='high'?760:620; gain.gain.setValueAtTime(.0001,ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.045,ctx.currentTime+.015); gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.14); oscillator.connect(gain).connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime+.15); } catch(_error){} };\n  const queueDigest = (payload) => { const queue=safeParse(localStorage.getItem(DIGEST_KEY),[]); const items=Array.isArray(queue)?queue:[]; items.push({id:payload.id,title:payload.title,type:typeGroup(payload),createdAt:payload.createdAt}); localStorage.setItem(DIGEST_KEY,JSON.stringify(items.slice(-100))); };\n  const flushDigest = () => { const prefs=readPrefs(); if(isDndActive(prefs)||!prefs.digest)return; const queue=safeParse(localStorage.getItem(DIGEST_KEY),[]); if(!Array.isArray(queue)||!queue.length)return; localStorage.removeItem(DIGEST_KEY); const groups=queue.reduce((acc,item)=>{acc[item.type]=(acc[item.type]||0)+1;return acc;},{}); const body=Object.entries(groups).map(([key,count])=>`${count} ${key}`).join(' · '); show({id:`digest-${Date.now()}`,title:`${queue.length} alertas acumulados`,body,targetUrl:'notificacoes.html',priority:'normal',type:'digest',duration:9000},{skipDigest:true}); };",
"  const playSound = (priority) => { if(priority==='silent'||getDeliveryManager()?.getPreferences?.().sound===false)return; try { const AudioContext=window.AudioContext||window.webkitAudioContext; if(!AudioContext)return; const ctx=new AudioContext(); const oscillator=ctx.createOscillator(); const gain=ctx.createGain(); oscillator.frequency.value=priority==='high'?760:620; gain.gain.setValueAtTime(.0001,ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.045,ctx.currentTime+.015); gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.14); oscillator.connect(gain).connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime+.15); } catch(_error){} };",
'adapter sound/digest')
text = replace_exact(text,
"  const publish = (payload={}) => { const envelope={...payload,id:payload.id||payload.eventKey||`live-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,createdAt:payload.createdAt||new Date().toISOString(),originTabId:TAB_ID};const stored=persist(envelope);try{localStorage.setItem(BUS_KEY,JSON.stringify(stored));}catch(_error){}document.dispatchEvent(new CustomEvent('doke:in-app-notification',{detail:stored}));return stored; };\n  const muteScope = (scope,label='Origem') => { if(!scope)return readPrefs();const prefs=readPrefs();if(!prefs.mutedScopes.includes(scope))prefs.mutedScopes.push(scope);prefs.mutedScopeLabels={...(prefs.mutedScopeLabels||{}),[scope]:label};return writePrefs(prefs); };\n  const unmuteScope = (scope) => { const prefs=readPrefs();prefs.mutedScopes=prefs.mutedScopes.filter((item)=>item!==scope);if(prefs.mutedScopeLabels)delete prefs.mutedScopeLabels[scope];return writePrefs(prefs); };",
"  const publish = (payload={}) => { const envelope={...payload,id:payload.id||payload.eventKey||`live-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,createdAt:payload.createdAt||new Date().toISOString(),originTabId:TAB_ID};const stored=persist(envelope);try{localStorage.setItem(BUS_KEY,JSON.stringify(stored));}catch(_error){}document.dispatchEvent(new CustomEvent('doke:in-app-notification',{detail:stored}));return stored; };\n  const getPreferences = () => getDeliveryManager()?.getPreferences?.() || {};\n  const setPreferences = (next = {}) => getDeliveryManager()?.setPreferences?.(next) || getPreferences();\n  const muteScope = (scope, label='Origem') => getDeliveryManager()?.muteScope?.(scope, label) || getPreferences();\n  const unmuteScope = (scope) => getDeliveryManager()?.unmuteScope?.(scope) || getPreferences();\n  const isDndActive = (prefs) => getDeliveryManager()?.isDndActive?.(prefs) === true;\n  const flushDigest = () => { const result=getDeliveryManager()?.flushDigest?.() || null; if(result?.payload)show(result.payload,{skipDelivery:true}); return result; };",
'adapter public delivery delegation')
text = replace_exact(text,
"      shouldToast,\n      isDndActive,\n      queueDigest,\n",
"      getDeliveryDecision: (payload, options) => getDeliveryManager()?.decide?.(payload, options) || Object.freeze({ outcome: 'SUPPRESS', reason: 'delivery-authority-unavailable' }),\n      onQueueDigest: (payload, decision) => getDeliveryManager()?.enqueueDigest?.(payload, decision),\n",
'adapter toast delivery config')
text = replace_exact(text,
"    if (event.key === PREFS_KEY) {\n      document.dispatchEvent(new CustomEvent('doke:notification-preferences-changed', { detail: readPrefs() }));\n    }\n",
"",
'adapter storage prefs')
text = replace_exact(text,
"  document.addEventListener('doke:auth-session-change', () => {\n    getToastManager()?.reset?.(getAccountKeys()[0] || 'anonymous');",
"  document.addEventListener('doke:auth-session-change', () => {\n    getDeliveryManager()?.refreshAccount?.();\n    getToastManager()?.reset?.(getAccountKeys()[0] || 'anonymous');",
'adapter account refresh')
text = replace_exact(text,
"    getPreferences: readPrefs,\n    setPreferences(next = {}) {\n      return writePrefs({ ...readPrefs(), ...next });\n    },\n    muteScope,",
"    getPreferences,\n    setPreferences,\n    muteScope,",
'adapter exported prefs')
write(path, text)

# Patch toast manager to consume H07 outcomes first, preserve legacy fallback only when no H07 callback exists.
path = 'assets/js/core/notification-toast.js'
text = read(path)
text = replace_exact(text,
"    if (state.seen.has(identity) && options.force !== true) return false;\n    if (config.shouldToast?.(payload) === false) return false;\n    if (config.isDndActive?.() === true && options.skipDigest !== true) {\n      config.queueDigest?.(payload);\n      return false;\n    }\n\n    const renderer = typeof config.renderToast === 'function' ? config.renderToast : defaultRender;",
"    if (state.seen.has(identity) && options.force !== true) return false;\n    if (typeof config.getDeliveryDecision === 'function' && options.skipDelivery !== true && options.skipDigest !== true) {\n      const deliveryDecision = config.getDeliveryDecision(payload, options) || {};\n      const outcome = normalizeText(deliveryDecision.outcome).toUpperCase();\n      if (outcome === 'QUEUE_DIGEST') {\n        config.onQueueDigest?.(payload, deliveryDecision);\n        return false;\n      }\n      if (outcome !== 'ALLOW_TOAST') return false;\n    } else if (typeof config.getDeliveryDecision !== 'function') {\n      if (config.shouldToast?.(payload) === false) return false;\n      if (config.isDndActive?.() === true && options.skipDigest !== true) {\n        config.queueDigest?.(payload);\n        return false;\n      }\n    }\n\n    const renderer = typeof config.renderToast === 'function' ? config.renderToast : defaultRender;",
'toast H07 decision')
write(path, text)

# Load delivery authority after account-storage in every current in-app consumer.
consumers = []
for html_path in ROOT.glob('*.html'):
    html = html_path.read_text(encoding='utf-8')
    if 'assets/js/features/in-app-notifications.js' not in html:
        continue
    consumers.append(html_path.name)
    if 'assets/js/core/notification-delivery.js' in html:
        raise SystemExit(f'{html_path.name}: delivery script already exists unexpectedly')
    pattern = re.compile(r'(<script[^>]+src=["\']assets/js/core/account-storage\.js[^"\']*["\'][^>]*></script>)')
    matches = list(pattern.finditer(html))
    if len(matches) != 1:
        raise SystemExit(f'{html_path.name}: expected one account-storage script, got {len(matches)}')
    html = pattern.sub(r'\1\n  <script src="assets/js/core/notification-delivery.js?v=20260809-ux-notif-007-v1" defer></script>', html, count=1)
    html_path.write_text(html, encoding='utf-8')
if not consumers:
    raise SystemExit('no in-app notification consumers found')

# Update inherited H01 harness to load H07 and assert scoped keys/cross-tab without product fallback.
path = 'scripts/test-ux-notif-001-in-app-adapter.js'
text = read(path)
text = replace_exact(text,
"const storage = new Map([\n  ['doke.in-app-notification.preferences.v1', JSON.stringify({ social: false, messages: false, reactions: false, mentions: false, events: false, sound: false, digest: false })]\n]);",
"const storage = new Map();\nconst storageDomains = new Map();",
'H01 initial storage')
text = replace_exact(text,
"  accountStorage: {\n    resolveScope() {\n      return currentUser ? { scopeId: currentUser.id, kind: 'account' } : { scopeId: 'guest_scope_123456', kind: 'guest' };\n    }\n  },",
"  accountStorage: {\n    dataClasses: { ACCOUNT_PRIVATE: 'account_private' },\n    retention: { UNTIL_LOGOUT: 'until_logout' },\n    crossTab: { METADATA: 'metadata' },\n    registerDomain(policy) { storageDomains.set(policy.domain, { ...policy }); return policy; },\n    resolveScope() { return currentUser ? { scopeId: currentUser.id, kind: 'account' } : { scopeId: 'guest_scope_123456', kind: 'guest' }; },\n    makeKey({ domain, key, version = 1 }) { return `doke:${this.resolveScope().scopeId}:${domain}:${key}:v${version}`; },\n    publicDescriptor(key) { const parts=String(key).split(':'); return { scopeFingerprint:`scope_${parts[1]}`, domain:parts[2], keyFingerprint:`key_${parts[3]}`, version:Number(String(parts[4]||'').slice(1))||1 }; },\n    read(options) { const key=typeof options==='string'?options:this.makeKey(options); const raw=localStorageStub.getItem(key); return raw==null?null:JSON.parse(raw); },\n    write(options) { const key=options.storageKey||this.makeKey(options); localStorageStub.setItem(key,JSON.stringify(options.value)); return { storageKey:key, value:options.value, descriptor:this.publicDescriptor(key) }; },\n    remove(options) { const key=typeof options==='string'?options:this.makeKey(options); localStorageStub.removeItem(key); return true; }\n  },",
'H01 account storage')
text = replace_exact(text,
"delete require.cache[require.resolve('../assets/js/core/notification-center.js')];\ndelete require.cache[require.resolve('../assets/js/core/notification-toast.js')];\ndelete require.cache[require.resolve('../assets/js/features/in-app-notifications.js')];\nrequire('../assets/js/core/notification-center.js');\nrequire('../assets/js/core/notification-toast.js');\nrequire('../assets/js/features/in-app-notifications.js');",
"delete require.cache[require.resolve('../assets/js/core/notification-center.js')];\ndelete require.cache[require.resolve('../assets/js/core/notification-delivery.js')];\ndelete require.cache[require.resolve('../assets/js/core/notification-toast.js')];\ndelete require.cache[require.resolve('../assets/js/features/in-app-notifications.js')];\nrequire('../assets/js/core/notification-center.js');\nrequire('../assets/js/core/notification-delivery.js');\nrequire('../assets/js/core/notification-toast.js');\nrequire('../assets/js/features/in-app-notifications.js');",
'H01 load H07')
text = replace_exact(text,
"  documentStub.dispatchEvent(new CustomEventStub('DOMContentLoaded'));\n  await flush();",
"  inApp.setPreferences({ social: false, messages: false, reactions: false, mentions: false, events: false, sound: false, digest: false });\n  documentStub.dispatchEvent(new CustomEventStub('DOMContentLoaded'));\n  await flush();",
'H01 set initial prefs')
text = replace_exact(text,
"  assert.equal(storage.has('doke.in-app-notification.digest.v1'), true, 'DND must queue digest instead of rendering DOM');",
"  const alphaDigestKey = Doke.accountStorage.makeKey({ domain: 'notification_delivery', key: 'digest_queue', version: 1 });\n  assert.equal(storage.has(alphaDigestKey), true, 'DND must queue digest in the current account scope');",
'H01 digest key')
text = replace_exact(text,
"  assert.equal(storage.has('doke.in-app-notification.digest.v1'), false, 'digest flush must drain queued notifications');",
"  Doke.notificationToast.configure({ renderToast(payload) { return { payload, notificationId: payload.id }; } });\n  inApp.flushDigest();\n  assert.equal(storage.has(alphaDigestKey), false, 'digest flush must drain the scoped queue');",
'H01 digest flush')
# Remove duplicate old flushDigest call left immediately before replacement target.
text = text.replace("  inApp.flushDigest();\n  Doke.notificationToast.configure", "  Doke.notificationToast.configure", 1)
text = replace_exact(text,
"  const storageListener = (windowListeners.get('storage') || [])[0];\n  assert(storageListener, 'cross-tab storage listener must be registered');",
"  const storageListeners = windowListeners.get('storage') || [];\n  assert(storageListeners.length >= 2, 'delivery and adapter cross-tab storage listeners must be registered');\n  const dispatchStorage = (event) => storageListeners.forEach((listener) => listener(event));",
'H01 storage listeners')
text = text.replace("  storageListener({", "  dispatchStorage({")
text = replace_exact(text,
"    key: 'doke.in-app-notification.preferences.v1',\n    newValue: JSON.stringify(inApp.getPreferences())",
"    key: Doke.accountStorage.makeKey({ domain: 'notification_delivery', key: 'preferences', version: 1 }),\n    newValue: storage.get(Doke.accountStorage.makeKey({ domain: 'notification_delivery', key: 'preferences', version: 1 }))",
'H01 preference storage event')
# Add account isolation assertion after beta transition.
text = replace_exact(text,
"  await flush();\n  assert.deepEqual(center.getSnapshot().items.map((item) => item.id), ['beta-1'], 'account switch must clear and rehydrate only current account');",
"  await flush();\n  assert.deepEqual(center.getSnapshot().items.map((item) => item.id), ['beta-1'], 'account switch must clear and rehydrate only current account');\n  assert.equal(inApp.getPreferences().social, true, 'beta account must not inherit alpha delivery preferences');",
'H01 beta preferences')
write(path, text)

# Update existing delivery-controls contract to point at H07 authority rather than adapter internals.
path = 'scripts/test-notification-delivery-controls-contract.js'
text = read(path)
text = text.replace("const feature = fs.readFileSync(`${root}/assets/js/features/in-app-notifications.js`, 'utf8');", "const feature = fs.readFileSync(`${root}/assets/js/features/in-app-notifications.js`, 'utf8');\nconst delivery = fs.readFileSync(`${root}/assets/js/core/notification-delivery.js`, 'utf8');")
text = replace_exact(text,
"['dndUntil','priorityMin','mutedScopes','flushDigest','muteScope','doke-live-toast--'].forEach((token)=>assert(feature.includes(token), token));",
"['flushDigest','muteScope','getDeliveryManager'].forEach((token)=>assert(feature.includes(token), token));\n['dndUntil','priorityMin','mutedScopes','QUEUE_DIGEST','ALLOW_TOAST','notification_delivery'].forEach((token)=>assert(delivery.includes(token), token));",
'delivery controls authority')
write(path, text)

print(f'patched UX-NOTIF-007 across {len(consumers)} in-app consumers: {", ".join(consumers)}')
