#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const NOW = '2026-08-09T14:30:00.000Z';
const storage = new Map();
const documentListeners = new Map();
const windowListeners = new Map();
const dispatched = [];
let realtimeHandler = null;
let rpcMode = 'success';
let fetchMode = 'success';
let remoteRows = [];

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
  visibilityState: 'visible',
  documentElement: { setAttribute() {} },
  addEventListener(type, listener) {
    if (!documentListeners.has(type)) documentListeners.set(type, []);
    documentListeners.get(type).push(listener);
  },
  dispatchEvent(event) {
    dispatched.push(event);
    for (const listener of documentListeners.get(event.type) || []) listener(event);
    return true;
  }
};

function rowFor(id, options = {}) {
  const eventId = options.eventId || `evt-${id}`;
  const read = options.read === true;
  const dismissed = options.dismissed === true;
  return {
    id: `remote-${id}`,
    external_id: id,
    user_id: USER_ID,
    actor_id: null,
    type: 'message_received',
    category: 'messages',
    event_key: eventId,
    title: `Notification ${id}`,
    body: 'Runtime coverage',
    target_url: 'notificacoes.html',
    action_label: 'Abrir',
    read_at: read || dismissed ? NOW : null,
    dismissed_at: dismissed ? NOW : null,
    created_at: NOW,
    updated_at: NOW,
    data: {
      id,
      eventId,
      eventType: 'message_received',
      eventCategory: 'MESSAGES',
      dedupeKey: eventId,
      sourceAuthority: 'CANONICAL_REMOTE',
      userId: USER_ID,
      messageId: `msg-${id}`
    }
  };
}

function localNotification(id, options = {}) {
  return {
    id,
    eventId: options.eventId || `evt-${id}`,
    eventType: 'message_received',
    eventCategory: 'MESSAGES',
    type: 'message_received',
    category: 'messages',
    userId: USER_ID,
    messageId: `msg-${id}`,
    title: `Notification ${id}`,
    body: 'Runtime coverage',
    read: options.read === true,
    dismissed: options.dismissed === true,
    syncStatus: options.syncStatus || 'synced',
    stateSyncStatus: options.stateSyncStatus || 'synced',
    pendingStatePatch: options.pendingStatePatch || null,
    stateSyncError: options.stateSyncError || ''
  };
}

const channel = {
  on(_kind, _filter, handler) {
    realtimeHandler = handler;
    return this;
  },
  subscribe(callback) {
    if (typeof callback === 'function') callback('SUBSCRIBED');
    return this;
  }
};

const client = {
  auth: {
    getSession() {
      return Promise.resolve({ data: { session: { user: { id: USER_ID } } } });
    }
  },
  channel() { return channel; },
  removeChannel() {},
  from() {
    return {
      select() { return this; },
      order() {
        if (fetchMode === 'reject') return Promise.reject(new Error('remote-list-offline'));
        return Promise.resolve({ data: remoteRows.slice(), error: null });
      }
    };
  }
};

const Doke = {
  session: { getCurrentUser() { return { id: USER_ID, role: 'client' }; } }
};

const DokeSupabase = {
  getClient() { return client; },
  invokeSelfService(rpc, params) {
    if (rpc === 'update_own_notification_state') {
      if (rpcMode === 'reject-update') return Promise.reject(new Error('remote-update-offline'));
      return Promise.resolve(rowFor(params.p_notification_ref, {
        read: params.p_mark_read === true || params.p_dismiss === true,
        dismissed: params.p_dismiss === true
      }));
    }
    if (rpc === 'create_transaction_notification') {
      if (rpcMode === 'reject-create') return Promise.reject(new Error('remote-create-offline'));
      return Promise.resolve(rowFor(params.p_external_id, {
        eventId: params.p_event_key || `evt-${params.p_external_id}`
      }));
    }
    return Promise.reject(new Error(`Unexpected RPC: ${rpc}`));
  }
};

const windowStub = {
  Doke,
  DokeSupabase,
  DOKE_SUPABASE_CONFIG: {
    enabled: true,
    notificationsEnabled: true,
    url: 'https://doke.test.supabase.co',
    anonKey: 'test-anon-key'
  },
  supabase: { createClient() { return client; } },
  document: documentStub,
  localStorage: localStorageStub,
  CustomEvent: CustomEventStub,
  location: { search: '' },
  console: { warn() {} },
  setTimeout() { return 1; },
  clearTimeout() {},
  setInterval() { return 1; },
  clearInterval() {},
  addEventListener(type, listener) {
    if (!windowListeners.has(type)) windowListeners.set(type, []);
    windowListeners.get(type).push(listener);
  }
};

const previous = {
  window: global.window,
  Doke: global.Doke,
  document: global.document,
  localStorage: global.localStorage,
  CustomEvent: global.CustomEvent,
  location: global.location,
  fetch: global.fetch,
  URLSearchParams: global.URLSearchParams
};

global.window = windowStub;
global.Doke = Doke;
global.document = documentStub;
global.localStorage = localStorageStub;
global.CustomEvent = CustomEventStub;
global.location = windowStub.location;
global.fetch = async () => { throw new Error('Unexpected fetch'); };

const eventPath = require.resolve('../assets/js/core/notification-event.js');
const repositoryPath = require.resolve('../assets/js/repositories/notifications-repository.js');
delete require.cache[eventPath];
delete require.cache[repositoryPath];

function syncedEvents() {
  return dispatched.filter((event) => event.type === 'doke:notifications-synced').map((event) => event.detail);
}

(async () => {
  require(eventPath);
  require(repositoryPath);
  const repository = Doke.repositories.notifications;
  assert(repository, 'notifications repository must load');

  repository.writeLocal([localNotification('notif-read-ok')]);
  rpcMode = 'success';
  let changed = await repository.markAsRead('notif-read-ok');
  assert.equal(changed.read, true);
  assert.equal(changed.stateSyncStatus, 'synced');
  assert.equal(changed.pendingStatePatch, null);
  assert(syncedEvents().some((detail) => detail.source === 'local-mutation' && detail.freshness === 'STALE'));
  assert(syncedEvents().some((detail) => detail.source === 'remote-mutation' && detail.freshness === 'FRESH'));
  assert(syncedEvents().every((detail) => detail.accountId === USER_ID));

  repository.writeLocal([localNotification('notif-dismiss-offline')]);
  rpcMode = 'reject-update';
  changed = await repository.dismiss('notif-dismiss-offline');
  assert.equal(changed.dismissed, true);
  assert.equal(changed.read, true);
  assert.equal(changed.stateSyncStatus, 'pending');
  assert.deepEqual(changed.pendingStatePatch, { read: true, dismissed: true });
  assert.match(changed.stateSyncError, /remote-update-offline/);
  assert(syncedEvents().some((detail) => detail.source === 'offline-mutation' && detail.freshness === 'DEGRADED'));

  rpcMode = 'success';
  await repository.syncPending();
  changed = repository.listLocal({ currentUser: true }).find((item) => item.id === 'notif-dismiss-offline');
  assert.equal(changed.dismissed, true);
  assert.equal(changed.stateSyncStatus, 'synced');
  assert.equal(changed.pendingStatePatch, null);
  assert.equal(changed.stateSyncError, '');

  repository.writeLocal([localNotification('notif-create-pending', { syncStatus: 'pending' })]);
  rpcMode = 'success';
  await repository.syncPending();
  changed = repository.listLocal({ currentUser: true }).find((item) => item.id === 'notif-create-pending');
  assert.equal(changed.syncStatus, 'synced');

  repository.clearLocal();
  repository.clearCache();
  remoteRows = [rowFor('notif-remote-list')];
  fetchMode = 'success';
  const remoteList = await repository.load({ fresh: true });
  assert.equal(remoteList.some((item) => item.id === 'notif-remote-list'), true);
  assert(syncedEvents().some((detail) => detail.source === 'remote-list' && detail.freshness === 'FRESH'));
  assert.equal(typeof realtimeHandler, 'function', 'remote load must attach realtime reconciliation');

  realtimeHandler({ eventType: 'UPDATE', new: rowFor('notif-remote-list', { read: true }) });
  changed = repository.listLocal({ currentUser: true }).find((item) => item.id === 'notif-remote-list');
  assert.equal(changed.read, true);
  assert(syncedEvents().some((detail) => detail.source === 'realtime' && detail.freshness === 'FRESH'));

  repository.clearCache();
  fetchMode = 'reject';
  const fallbackList = await repository.load({ fresh: true });
  assert.equal(fallbackList.some((item) => item.id === 'notif-remote-list'), true);
  assert(syncedEvents().some((detail) => detail.source === 'local-fallback' && detail.freshness === 'DEGRADED'));

  console.log('[ux-notif-005-remote-mutation-runtime] ok');
  console.log('- remote mutation success/failure, pending retry, pending create, realtime and degraded fallback validated');
})().finally(() => {
  delete require.cache[eventPath];
  delete require.cache[repositoryPath];
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete global[key];
    else global[key] = value;
  }
});
