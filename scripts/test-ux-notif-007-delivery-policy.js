#!/usr/bin/env node
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
