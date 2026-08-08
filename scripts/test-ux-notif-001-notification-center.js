#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

let currentUser = { id: 'account_alpha_123456' };
const badgeA = { textContent: '', hidden: true, dataset: {} };
const badgeB = { textContent: '', hidden: true, dataset: {} };
const events = [];

class CustomEventStub {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

const documentStub = {
  querySelectorAll(selector) {
    return selector === '[data-notifications-unread-count]' ? [badgeA, badgeB] : [];
  },
  dispatchEvent(event) {
    events.push(event);
    return true;
  }
};

const Doke = {
  session: {
    getCurrentUser() { return currentUser; }
  },
  accountStorage: {
    resolveScope() {
      return currentUser
        ? { scopeId: currentUser.id, kind: 'account' }
        : { scopeId: 'guest_scope_123456', kind: 'guest' };
    }
  }
};

const windowStub = {
  Doke,
  document: documentStub,
  CustomEvent: CustomEventStub
};

global.window = windowStub;
global.document = documentStub;
global.CustomEvent = CustomEventStub;

const modulePath = require.resolve('../assets/js/core/notification-center.js');
delete require.cache[modulePath];
require(modulePath);

const center = Doke.notificationCenter;
assert(center, 'Doke.notificationCenter must be published.');
assert.equal(center.contract, 'notification-center-v1');

const notifications = [
  { id: 'notif-a', eventKey: 'evt-a', title: 'Pedido', body: 'Conteúdo A', read: false, dismissed: false },
  { id: 'notif-b', eventKey: 'evt-b', title: 'Mensagem', body: 'Conteúdo B', read: true, dismissed: false },
  { id: 'notif-c', eventKey: 'evt-c', title: 'Atualização', body: 'Conteúdo C', read: false, dismissed: true },
  { id: 'notif-a-duplicate', eventKey: 'evt-a', title: 'Duplicada', read: false }
];

let subscriberCalls = 0;
const unsubscribe = center.subscribe((snapshot, reason) => {
  subscriberCalls += 1;
  assert(Object.isFrozen(snapshot));
  assert.equal(typeof reason, 'string');
});

let state = center.replace(notifications);
assert.equal(state.itemCount, 2, 'Dismissed items must not count as active center items.');
assert.equal(state.unreadCount, 1, 'Unread count must ignore read and dismissed notifications.');
assert.equal(state.dismissedCount, 1);
assert.equal(state.items.length, 2);
assert.equal(badgeA.textContent, '1');
assert.equal(badgeB.textContent, '1');
assert.equal(badgeA.hidden, false);
assert.equal(badgeA.dataset.notificationCenterWriter, 'notification-center-v1');

state = center.upsert({ id: 'notif-d', eventKey: 'evt-d', title: 'Nova', read: false });
assert.equal(state.itemCount, 3);
assert.equal(state.unreadCount, 2);
assert.equal(state.items[0].id, 'notif-d', 'New notifications must enter at the front.');

state = center.markRead('notif-d');
assert.equal(state.unreadCount, 1);
assert.equal(badgeA.textContent, '1');

state = center.upsert({ id: 'notif-d-replayed', eventKey: 'evt-d', title: 'Nova atualizada' });
const replayedRead = state.items.find((item) => item.eventKey === 'evt-d');
assert(replayedRead, 'Replayed event must remain in the center.');
assert.equal(replayedRead.id, 'notif-d', 'Event-key replay must preserve the canonical existing id.');
assert.equal(replayedRead.read, true, 'Partial replay must not reopen an already-read notification.');
assert.equal(state.unreadCount, 1);

state = center.dismiss('notif-a');
assert.equal(state.itemCount, 2);
assert.equal(state.unreadCount, 0);
assert.equal(state.dismissedCount, 2);
assert.equal(badgeA.textContent, '0');
assert.equal(badgeA.hidden, true);

state = center.upsert({ id: 'notif-a-replayed', eventKey: 'evt-a', title: 'Pedido atualizado' });
assert.equal(state.itemCount, 2, 'Partial replay must not reactivate a dismissed notification.');
assert.equal(state.unreadCount, 0);
assert.equal(state.dismissedCount, 2);

const alphaFence = center.createFence();
const alphaGeneration = state.accountGeneration;
currentUser = { id: 'account_beta_654321' };

state = center.replace([{ id: 'beta-stale', read: false }], { fence: alphaFence });
assert.equal(state.accountGeneration, alphaGeneration + 1, 'Account switch must advance the account generation.');
assert.equal(state.itemCount, 0, 'A stale account fence must not commit data into the next account.');
assert.equal(center.isFenceCurrent(alphaFence), false);

const betaFence = center.createFence();
state = center.replace([
  { id: 'beta-1', eventKey: 'beta-event', read: false },
  { id: 'beta-2', readAt: '2026-08-07T10:00:00Z' }
], { fence: betaFence });
assert.equal(state.itemCount, 2);
assert.equal(state.unreadCount, 1);

currentUser = { id: 'account_alpha_123456' };
const transition = center.refreshAccount();
assert.equal(transition.changed, true);
assert.equal(transition.snapshot.itemCount, 0, 'Returning to a previous account must not reuse another account snapshot.');
assert.equal(transition.snapshot.unreadCount, 0);

unsubscribe();
const callsBefore = subscriberCalls;
center.replace([{ id: 'alpha-new', read: false }]);
assert.equal(subscriberCalls, callsBefore, 'Unsubscribe must detach the listener.');

const publicEvents = events.filter((event) => event.type === 'doke:notification-center-changed');
assert(publicEvents.length >= 1, 'Center changes must publish a sanitized public event.');
for (const event of publicEvents) {
  const detail = event.detail || {};
  const serialized = JSON.stringify(detail);
  assert.equal(Object.hasOwn(detail, 'items'), false);
  assert.equal(Object.hasOwn(detail, 'userId'), false);
  assert.equal(Object.hasOwn(detail, 'accountId'), false);
  assert.equal(Object.hasOwn(detail, 'notificationId'), false);
  assert.equal(serialized.includes('notif-'), false, 'Public event must not contain notification IDs.');
  assert.equal(serialized.includes('Conteúdo'), false, 'Public event must not contain notification bodies.');
  assert.equal(serialized.includes('account_alpha'), false, 'Public event must not contain account identifiers.');
  assert.equal(typeof detail.unreadCount, 'number');
  assert.equal(typeof detail.generation, 'number');
  assert.equal(typeof detail.accountGeneration, 'number');
}

delete require.cache[modulePath];
for (const key of ['window', 'document', 'CustomEvent']) delete global[key];

console.log('[ux-notif-001-notification-center] ok');
console.log('- replace/upsert/dedupe, lifecycle replay, unread badge, account fence and sanitized events validated');
