#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

const listeners = new Map();
const windowListeners = new Map();
let currentUser = { id: 'account_alpha_123456' };
let serviceItems = [{ id: 'alpha-reload', eventKey: 'alpha-reload', userId: currentUser.id, title: 'Reload', read: false }];
const badge = { textContent: '', hidden: true, dataset: {}, classList: { contains() { return false; } } };
const storage = new Map([
  ['doke.in-app-notification.preferences.v1', JSON.stringify({ social: false, messages: false, reactions: false, mentions: false, events: false, sound: false, digest: false })]
]);

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

const documentStub = {
  readyState: 'loading',
  body: { appendChild() {} },
  querySelectorAll(selector) { return selector === '[data-notifications-unread-count]' ? [badge] : []; },
  addEventListener(type, listener) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(listener);
  },
  dispatchEvent(event) {
    for (const listener of listeners.get(event.type) || []) listener(event);
    return true;
  },
  createElement() { throw new Error('Toast DOM should not be created while test preferences disable delivery.'); },
  documentElement: { style: { setProperty() {} } }
};

const Doke = {
  session: { getCurrentUser() { return currentUser; } },
  accountStorage: {
    resolveScope() {
      return currentUser ? { scopeId: currentUser.id, kind: 'account' } : { scopeId: 'guest_scope_123456', kind: 'guest' };
    }
  },
  services: {
    notifications: {
      list() { return Promise.resolve(serviceItems.map((item) => ({ ...item }))); }
    }
  }
};

const windowStub = {
  Doke,
  document: documentStub,
  CustomEvent: CustomEventStub,
  localStorage: localStorageStub,
  setTimeout() { return 1; },
  clearTimeout() {},
  setInterval() { return 1; },
  clearInterval() {},
  addEventListener(type, listener) {
    if (!windowListeners.has(type)) windowListeners.set(type, []);
    windowListeners.get(type).push(listener);
  },
  location: { href: 'https://doke.test/notificacoes.html' }
};

global.window = windowStub;
global.document = documentStub;
global.CustomEvent = CustomEventStub;
global.localStorage = localStorageStub;

delete require.cache[require.resolve('../assets/js/core/notification-center.js')];
delete require.cache[require.resolve('../assets/js/features/in-app-notifications.js')];
require('../assets/js/core/notification-center.js');
require('../assets/js/features/in-app-notifications.js');

const center = Doke.notificationCenter;
const inApp = windowStub.DokeInAppNotifications;
assert(center && inApp);

async function flush() { await Promise.resolve(); await Promise.resolve(); }

(async () => {
  documentStub.dispatchEvent(new CustomEventStub('DOMContentLoaded'));
  await flush();
  assert.equal(center.getSnapshot().unreadCount, 1, 'reload hydration must populate canonical center');
  assert.equal(badge.dataset.notificationCenterWriter, 'notification-center-v1');

  const published = inApp.publish({ id: 'alpha-live', eventKey: 'alpha-live', recipientAccountKey: currentUser.id, title: 'Live', read: false });
  assert.equal(published.id, 'alpha-live');
  assert.equal(center.getSnapshot().unreadCount, 2);

  inApp.markAsRead('alpha-live');
  assert.equal(center.getSnapshot().unreadCount, 1);
  inApp.recordActionResult('alpha-reload', 'completed', 'Concluído');
  assert.equal(center.getSnapshot().unreadCount, 0);

  inApp.publish({ id: 'alpha-dismiss', eventKey: 'alpha-dismiss', recipientAccountKey: currentUser.id, title: 'Dismiss', read: false });
  inApp.dismiss('alpha-dismiss');
  assert.equal(center.getSnapshot().items.some((item) => item.id === 'alpha-dismiss'), false);

  serviceItems = [
    { id: 'beta-1', eventKey: 'beta-1', userId: 'account_beta_654321', title: 'Beta', read: false },
    { id: 'alpha-stale', eventKey: 'alpha-stale', userId: 'account_alpha_123456', title: 'Alpha stale', read: false }
  ];
  currentUser = { id: 'account_beta_654321' };
  documentStub.dispatchEvent(new CustomEventStub('doke:auth-session-change'));
  await flush();
  assert.deepEqual(center.getSnapshot().items.map((item) => item.id), ['beta-1'], 'account switch must clear and rehydrate only current account');

  const storageListener = (windowListeners.get('storage') || [])[0];
  assert(storageListener, 'cross-tab storage listener must be registered');
  storageListener({
    key: 'doke.in-app-notification.bus.v1',
    newValue: JSON.stringify({ id: 'beta-cross-tab', eventKey: 'beta-cross-tab', recipientAccountKey: currentUser.id, title: 'Cross-tab', read: false, originTabId: 'other-tab' })
  });
  assert(center.getSnapshot().items.some((item) => item.id === 'beta-cross-tab'), 'cross-tab delivery must enter canonical center');

  documentStub.dispatchEvent(new CustomEventStub('doke:notifications-synced', { detail: {
    items: [
      { id: 'beta-sync', eventKey: 'beta-sync', userId: currentUser.id, title: 'Synced', read: false },
      { id: 'alpha-ignored', eventKey: 'alpha-ignored', userId: 'account_alpha_123456', title: 'Ignored', read: false }
    ]
  } }));
  assert.deepEqual(center.getSnapshot().items.map((item) => item.id), ['beta-sync'], 'repository sync must replace snapshot with current-account items only');

  inApp.markAllAsRead();
  assert.equal(center.getSnapshot().unreadCount, 0);
  assert.equal(storage.has('doke.in-app-notification.center.v1'), false, 'private center storage must never be recreated');

  console.log('[ux-notif-001-in-app-adapter] ok');
  console.log('- reload hydration, publish/read/dismiss, account switch, repository sync and cross-tab delivery validated');
})().finally(() => {
  for (const key of ['window', 'document', 'CustomEvent', 'localStorage']) delete global[key];
});
