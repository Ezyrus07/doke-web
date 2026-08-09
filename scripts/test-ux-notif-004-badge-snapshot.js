#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

let currentUser = { id: 'account_badge_alpha' };
const events = [];
const nodes = {
  unreadTotal: { textContent: '', hidden: true, dataset: {} },
  actionRequiredTotal: { textContent: '', hidden: true, dataset: {} },
  urgentTotal: { textContent: '', hidden: true, dataset: {} },
  unreadMessages: { textContent: '', hidden: true, dataset: {} }
};
const selectors = {
  '[data-notifications-unread-count]': [nodes.unreadTotal],
  '[data-notifications-action-required-count]': [nodes.actionRequiredTotal],
  '[data-notifications-urgent-count]': [nodes.urgentTotal],
  '[data-notifications-messages-count]': [nodes.unreadMessages]
};

class CustomEventStub {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

const documentStub = {
  querySelectorAll(selector) { return selectors[selector] || []; },
  dispatchEvent(event) { events.push(event); return true; }
};

const Doke = {
  session: { getCurrentUser() { return currentUser; } },
  accountStorage: {
    resolveScope() {
      return currentUser
        ? { scopeId: currentUser.id, kind: 'account' }
        : { scopeId: 'guest_badge_scope', kind: 'guest' };
    }
  }
};

const windowStub = { Doke, document: documentStub, CustomEvent: CustomEventStub };
global.window = windowStub;
global.document = documentStub;
global.CustomEvent = CustomEventStub;

const modulePath = require.resolve('../assets/js/core/notification-center.js');
delete require.cache[modulePath];
require(modulePath);

const center = Doke.notificationCenter;
assert(center, 'notification center must be published');
assert.equal(center.contract, 'notification-center-v1');
assert.equal(center.badgeContract, 'notification-badge-snapshot-v1');
assert.equal(typeof center.getBadgeSnapshot, 'function');
assert.equal(typeof center.setBadgeMetadata, 'function');

const source = [
  {
    id: 'msg-1', eventKey: 'evt-msg-1', eventId: 'evt-msg-1', eventAccepted: true,
    eventCategory: 'MESSAGES', conversationId: 'conversation-a', messageId: 'message-1',
    attentionState: 'INFORMATIONAL', read: false
  },
  {
    id: 'msg-2', eventKey: 'evt-msg-2', eventId: 'evt-msg-2', eventAccepted: true,
    eventCategory: 'MESSAGES', conversationId: 'conversation-a', messageId: 'message-2',
    attentionState: 'INFORMATIONAL', read: false
  },
  {
    id: 'order-action-read', eventKey: 'evt-order-action', eventId: 'evt-order-action', eventAccepted: true,
    eventCategory: 'ORDERS', orderId: 'order-1', attentionState: 'ACTION_REQUIRED', actionRequired: true,
    read: true
  },
  {
    id: 'order-urgent-unread', eventKey: 'evt-order-urgent', eventId: 'evt-order-urgent', eventAccepted: true,
    eventCategory: 'ORDERS', orderId: 'order-1', attentionState: 'URGENT_ACTION_REQUIRED', actionRequired: true,
    read: false
  },
  {
    id: 'order-action-second', eventKey: 'evt-order-second', eventId: 'evt-order-second', eventAccepted: true,
    eventCategory: 'ORDERS', orderId: 'order-2', actionRequired: true, read: true
  },
  {
    id: 'legacy-social-looking', eventKey: 'evt-legacy', category: 'social', read: false
  },
  {
    id: 'rejected-payment-action', eventKey: 'evt-payment-rejected', eventId: 'evt-payment-rejected', eventAccepted: false,
    eventCategory: 'PAYMENTS', paymentId: 'payment-1', attentionState: 'URGENT_ACTION_REQUIRED', actionRequired: true,
    read: true
  }
];

let state = center.replace(source, {
  freshness: 'FRESH',
  sourceAuthority: 'CANONICAL_REMOTE',
  updatedAt: '2026-08-09T13:00:00.000Z'
});
let badges = center.getBadgeSnapshot();

assert(Object.isFrozen(badges));
assert(Object.isFrozen(badges.byCategory));
assert(Object.isFrozen(badges.byCategory.ORDERS));
assert.equal(badges.contract, 'notification-badge-snapshot-v1');
assert.equal(badges.unreadTotal, 4, 'unread must remain independent from attention');
assert.equal(state.unreadCount, badges.unreadTotal, 'legacy unreadCount must remain compatible');
assert.equal(state.unreadTotal, badges.unreadTotal);
assert.equal(badges.actionRequiredTotal, 2, 'same actionable order must count once');
assert.equal(badges.urgentTotal, 1, 'urgent must use canonical attention state only');
assert.equal(badges.unreadMessages, 1, 'message badge counts distinct unread conversations');
assert.equal(badges.byCategory.MESSAGES.unread, 2);
assert.equal(badges.byCategory.ORDERS.unread, 1);
assert.equal(badges.byCategory.ORDERS.actionRequired, 2);
assert.equal(badges.byCategory.ORDERS.urgent, 1);
assert.equal(badges.byCategory.PAYMENTS.actionRequired, 0, 'rejected canonical event must not create attention');
assert.equal(badges.byCategory.UNKNOWN_OPERATIONAL.unread, 1, 'legacy social-looking item must fail closed to UNKNOWN_OPERATIONAL');
assert.equal(badges.byCategory.SOCIAL.unread, 0);
assert.equal(badges.freshness, 'FRESH');
assert.equal(badges.sourceAuthority, 'CANONICAL_REMOTE');
assert.equal(badges.updatedAt, '2026-08-09T13:00:00.000Z');

assert.equal(nodes.unreadTotal.textContent, '4');
assert.equal(nodes.actionRequiredTotal.textContent, '2');
assert.equal(nodes.urgentTotal.textContent, '1');
assert.equal(nodes.unreadMessages.textContent, '1');
for (const [metric, node] of Object.entries(nodes)) {
  assert.equal(node.hidden, false);
  assert.equal(node.dataset.notificationCenterWriter, 'notification-center-v1');
  assert.equal(node.dataset.notificationBadgeMetric, metric);
  assert.equal(node.dataset.notificationBadgeCount, String(badges[metric]));
}

const staleBefore = center.getBadgeSnapshot();
badges = center.setBadgeMetadata({ freshness: 'STALE' });
assert.equal(badges.freshness, 'STALE');
assert.equal(badges.sourceAuthority, 'CANONICAL_REMOTE');
assert.equal(badges.unreadTotal, staleBefore.unreadTotal, 'stale metadata must preserve last counts');
assert.equal(badges.actionRequiredTotal, staleBefore.actionRequiredTotal);

center.markRead('order-urgent-unread');
badges = center.getBadgeSnapshot();
assert.equal(badges.unreadTotal, 3);
assert.equal(badges.actionRequiredTotal, 2, 'read action-required item remains action-required');
assert.equal(badges.urgentTotal, 1, 'read urgent item remains urgent until domain resolves it');
assert.equal(badges.sourceAuthority, 'DERIVED_PRESENTATION', 'local presentation mutation cannot claim remote authority');

center.markRead('msg-1');
badges = center.getBadgeSnapshot();
assert.equal(badges.unreadMessages, 1, 'second unread message keeps conversation unread');
center.markRead('msg-2');
badges = center.getBadgeSnapshot();
assert.equal(badges.unreadMessages, 0);
assert.equal(nodes.unreadMessages.hidden, true);

const many = Array.from({ length: 101 }, (_, index) => ({
  id: `bulk-${index}`,
  eventKey: `bulk-event-${index}`,
  eventId: `bulk-event-${index}`,
  eventAccepted: true,
  eventCategory: 'PRODUCT',
  read: false
}));
center.replace(many);
badges = center.getBadgeSnapshot();
assert.equal(badges.unreadTotal, 101);
assert.equal(nodes.unreadTotal.textContent, '99+');
assert.equal(nodes.unreadTotal.dataset.notificationBadgeCount, '101');

const alphaFence = center.createFence();
currentUser = { id: 'account_badge_beta' };
const transition = center.refreshAccount();
assert.equal(transition.changed, true);
badges = center.getBadgeSnapshot();
assert.equal(badges.unreadTotal, 0);
assert.equal(badges.actionRequiredTotal, 0);
assert.equal(badges.urgentTotal, 0);
assert.equal(badges.unreadMessages, 0);
assert.equal(badges.freshness, 'UNKNOWN');
assert.equal(badges.sourceAuthority, 'DERIVED_PRESENTATION');
assert.equal(nodes.unreadTotal.hidden, true);
assert.equal(center.isFenceCurrent(alphaFence), false);

const publicEvents = events.filter((event) => event.type === 'doke:notification-center-changed');
assert(publicEvents.length > 0);
for (const event of publicEvents) {
  const detail = event.detail || {};
  const serialized = JSON.stringify(detail);
  assert.equal(Object.hasOwn(detail, 'items'), false);
  assert.equal(Object.hasOwn(detail, 'byCategory'), false);
  assert.equal(serialized.includes('order-1'), false);
  assert.equal(serialized.includes('conversation-a'), false);
  assert.equal(typeof detail.unreadTotal, 'number');
  assert.equal(typeof detail.actionRequiredTotal, 'number');
  assert.equal(typeof detail.urgentTotal, 'number');
  assert.equal(typeof detail.unreadMessages, 'number');
}

const centerSource = require('node:fs').readFileSync(modulePath, 'utf8');
assert.equal(/\.(?:title|body|message)\b/.test(centerSource.match(/function badgeSnapshot\([\s\S]*?\n  }/)[0]), false,
  'badge derivation must not infer counters from title/body/message copy');

for (const key of ['window', 'document', 'CustomEvent']) delete global[key];
delete require.cache[modulePath];

console.log('[ux-notif-004-badge-snapshot] ok');
console.log('- unread, attention, urgent, distinct unread conversations, categories, freshness, shell writers and account fence validated');
