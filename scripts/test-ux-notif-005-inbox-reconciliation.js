#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');

let currentUser = { id: 'account-h05-a' };
class CustomEventStub { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
const documentStub = { querySelectorAll() { return []; }, dispatchEvent() { return true; } };
const Doke = {
  session: { getCurrentUser() { return currentUser; } },
  accountStorage: { resolveScope() { return { scopeId: currentUser.id, kind: 'account' }; } }
};
const windowStub = { Doke, document: documentStub, CustomEvent: CustomEventStub };
global.window = windowStub;
global.document = documentStub;
global.CustomEvent = CustomEventStub;
const modulePath = require.resolve('../assets/js/core/notification-center.js');
delete require.cache[modulePath];
require(modulePath);
const center = Doke.notificationCenter;

assert.equal(center.reconciliationContract, 'notification-inbox-reconciliation-v1');
assert.equal(typeof center.reconcile, 'function');
assert.equal(typeof center.resolveMutation, 'function');

center.reconcile([
  { id: 'remote-a', eventId: 'evt-shared', eventKey: 'legacy-a', eventAccepted: true, eventCategory: 'MESSAGES', read: false },
  { id: 'remote-b', eventId: 'evt-shared', eventKey: 'legacy-b', eventAccepted: true, eventCategory: 'MESSAGES', read: false }
], { completeSnapshot: true, freshness: 'FRESH', sourceAuthority: 'CANONICAL_REMOTE' });
assert.equal(center.getSnapshot().items.length, 1, 'eventId must be the primary reconciliation identity');
assert.equal(center.getSnapshot().items[0].id, 'remote-a');

center.markRead('remote-a', { pendingSync: true });
let item = center.getSnapshot().items[0];
assert.equal(item.read, true);
assert.equal(item.readSyncState, 'PENDING_SYNC');

center.reconcile([
  { id: 'remote-new-id', eventId: 'evt-shared', eventKey: 'remote-new-key', eventAccepted: true, eventCategory: 'MESSAGES', read: false }
], { completeSnapshot: true, freshness: 'STALE', sourceAuthority: 'CANONICAL_REMOTE' });
item = center.getSnapshot().items[0];
assert.equal(item.id, 'remote-a', 'public identity must remain stable while eventId converges');
assert.equal(item.read, true, 'stale remote snapshot must not undo optimistic read');
assert.equal(item.readSyncState, 'PENDING_SYNC');

center.reconcile([
  { id: 'remote-new-id', eventId: 'evt-shared', eventAccepted: true, eventCategory: 'MESSAGES', read: true }
], { completeSnapshot: true, freshness: 'FRESH', sourceAuthority: 'CANONICAL_REMOTE' });
item = center.getSnapshot().items[0];
assert.equal(item.read, true);
assert.equal(item.readSyncState, 'SYNCED', 'matching remote state must settle optimistic read');

center.dismiss('remote-a', { pendingSync: true });
assert.equal(center.getSnapshot().items.some((entry) => entry.id === 'remote-a'), false,
  'optimistically dismissed item must leave the active public snapshot');
center.reconcile([
  { id: 'remote-new-id', eventId: 'evt-shared', eventAccepted: true, eventCategory: 'MESSAGES', read: true, dismissed: false }
], { completeSnapshot: true, freshness: 'STALE', sourceAuthority: 'CANONICAL_REMOTE' });
assert.equal(center.getSnapshot().items.some((entry) => entry.id === 'remote-a'), false,
  'stale remote snapshot must not resurrect an optimistic dismiss');
center.resolveMutation('remote-a', 'dismiss', { status: 'SYNCED', item: { dismissed: true } });
assert.equal(center.getSnapshot().items.some((entry) => entry.id === 'remote-a'), false,
  'remote dismiss confirmation must preserve the item outside the active snapshot');

const oldFence = center.createFence();
currentUser = { id: 'account-h05-b' };
center.refreshAccount();
center.reconcile([{ id: 'late-a', eventId: 'evt-late-a', read: false }], { fence: oldFence, completeSnapshot: true });
assert.equal(center.getSnapshot().items.length, 0, 'old account fence must reject late reconciliation');

for (const key of ['window', 'document', 'CustomEvent']) delete global[key];
delete require.cache[modulePath];
console.log('[ux-notif-005-inbox-reconciliation] ok');
console.log('- eventId merge, optimistic read/dismiss preservation, remote settlement and account fence validated');
