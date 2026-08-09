#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

let currentUser = { id: 'account-h05-runtime' };
let mutationMode = 'success';
const listeners = new Map();
const windowListeners = new Map();
const storage = new Map([
  ['doke.in-app-notification.preferences.v1', JSON.stringify({
    social: false,
    messages: false,
    reactions: false,
    mentions: false,
    events: false,
    sound: false,
    digest: false,
    dndEnabled: false,
    dndUntil: 0,
    priorityMin: 'silent',
    mutedScopes: []
  })]
]);

class CustomEventStub {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

const localStorageStub = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); }
};

const documentStub = {
  readyState: 'loading',
  body: { appendChild() {} },
  documentElement: { style: { setProperty() {} } },
  querySelectorAll() { return []; },
  addEventListener(type, listener) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(listener);
  },
  dispatchEvent(event) {
    for (const listener of listeners.get(event.type) || []) listener(event);
    return true;
  },
  createElement() { throw new Error('Toast DOM is not expected in mutation reconciliation test.'); }
};

const notificationService = {
  list() { return Promise.resolve([]); },
  markAsRead(id) {
    if (mutationMode === 'reject') return Promise.reject(new Error('offline-read'));
    return Promise.resolve({
      id,
      eventId: `evt-${id}`,
      read: true,
      stateSyncStatus: mutationMode === 'pending' ? 'pending' : 'synced'
    });
  },
  dismiss(id) {
    if (mutationMode === 'reject') return Promise.reject(new Error('offline-dismiss'));
    return Promise.resolve({
      id,
      eventId: `evt-${id}`,
      read: true,
      dismissed: true,
      stateSyncStatus: mutationMode === 'pending' ? 'pending' : 'synced'
    });
  }
};

const Doke = {
  session: { getCurrentUser() { return currentUser; } },
  accountStorage: {
    resolveScope() {
      return currentUser ? { scopeId: currentUser.id, kind: 'account' } : { scopeId: 'guest-h05', kind: 'guest' };
    }
  },
  services: { notifications: notificationService }
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

const previous = {
  window: global.window,
  document: global.document,
  CustomEvent: global.CustomEvent,
  localStorage: global.localStorage
};

global.window = windowStub;
global.document = documentStub;
global.CustomEvent = CustomEventStub;
global.localStorage = localStorageStub;

const centerPath = require.resolve('../assets/js/core/notification-center.js');
const inAppPath = require.resolve('../assets/js/features/in-app-notifications.js');
delete require.cache[centerPath];
delete require.cache[inAppPath];
require(centerPath);
require(inAppPath);

const center = Doke.notificationCenter;
const inApp = windowStub.DokeInAppNotifications;
assert(center && inApp);

function seed(id) {
  center.upsert({
    id,
    eventId: `evt-${id}`,
    eventKey: `evt-${id}`,
    eventAccepted: true,
    eventCategory: 'MESSAGES',
    userId: currentUser.id,
    read: false,
    dismissed: false,
    title: id
  });
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

(async () => {
  mutationMode = 'success';
  seed('read-success');
  const optimisticRead = inApp.markAsRead('read-success');
  assert.equal(optimisticRead.readSyncState, 'PENDING_SYNC');
  assert.equal(center.getSnapshot().items.find((item) => item.id === 'read-success').readSyncState, 'PENDING_SYNC');
  await flush();
  let item = center.getSnapshot().items.find((entry) => entry.id === 'read-success');
  assert.equal(item.read, true);
  assert.equal(item.readSyncState, 'SYNCED');
  assert.equal(item.readSyncError, '');

  mutationMode = 'pending';
  seed('read-pending');
  inApp.markAsRead('read-pending');
  await flush();
  item = center.getSnapshot().items.find((entry) => entry.id === 'read-pending');
  assert.equal(item.readSyncState, 'PENDING_SYNC');

  mutationMode = 'reject';
  seed('read-reject');
  inApp.markAsRead('read-reject');
  await flush();
  item = center.getSnapshot().items.find((entry) => entry.id === 'read-reject');
  assert.equal(item.readSyncState, 'PENDING_SYNC');
  assert.equal(item.readSyncError, 'persistence-failed');

  mutationMode = 'success';
  seed('dismiss-success');
  inApp.dismiss('dismiss-success');
  assert.equal(center.getSnapshot().items.some((entry) => entry.id === 'dismiss-success'), false);
  await flush();
  assert.equal(center.getSnapshot().items.some((entry) => entry.id === 'dismiss-success'), false);

  seed('service-unavailable');
  Doke.services.notifications = null;
  inApp.markAsRead('service-unavailable');
  item = center.getSnapshot().items.find((entry) => entry.id === 'service-unavailable');
  assert.equal(item.readSyncState, 'PENDING_SYNC');
  assert.equal(item.readSyncError, 'service-unavailable');
  Doke.services.notifications = notificationService;

  const beforeMismatch = center.getSnapshot().items.map((entry) => entry.id);
  documentStub.dispatchEvent(new CustomEventStub('doke:notifications-synced', {
    detail: {
      accountId: 'other-account',
      freshness: 'FRESH',
      sourceAuthority: 'DERIVED_PRESENTATION',
      completeSnapshot: true,
      items: [{ id: 'foreign-sync', eventId: 'evt-foreign-sync', userId: 'other-account', read: false }]
    }
  }));
  assert.deepEqual(center.getSnapshot().items.map((entry) => entry.id), beforeMismatch, 'foreign account sync must be ignored');

  documentStub.dispatchEvent(new CustomEventStub('doke:notifications-synced', {
    detail: {
      accountId: currentUser.id,
      freshness: 'FRESH',
      sourceAuthority: 'DERIVED_PRESENTATION',
      completeSnapshot: true,
      items: [{
        id: 'current-sync',
        eventId: 'evt-current-sync',
        eventAccepted: true,
        eventCategory: 'MESSAGES',
        userId: currentUser.id,
        read: false
      }]
    }
  }));
  assert.deepEqual(center.getSnapshot().items.map((entry) => entry.id), ['current-sync']);
  assert.equal(center.getBadgeSnapshot().freshness, 'FRESH');
  assert.equal(center.getBadgeSnapshot().sourceAuthority, 'DERIVED_PRESENTATION');

  console.log('[ux-notif-005-in-app-mutation-runtime] ok');
  console.log('- service success/pending/failure, unavailable service and account-scoped reconciliation validated');
})().finally(() => {
  delete require.cache[centerPath];
  delete require.cache[inAppPath];
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete global[key];
    else global[key] = value;
  }
});
