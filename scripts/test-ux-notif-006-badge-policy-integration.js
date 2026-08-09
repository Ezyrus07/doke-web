#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

let currentUser = { id: 'account-policy-badge' };
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
  dispatchEvent() { return true; }
};

const Doke = {
  session: { getCurrentUser() { return currentUser; } },
  accountStorage: {
    resolveScope() {
      return currentUser
        ? { scopeId: currentUser.id, kind: 'account' }
        : { scopeId: 'guest-policy-badge', kind: 'guest' };
    }
  }
};

const windowStub = { Doke, document: documentStub, CustomEvent: CustomEventStub };
global.window = windowStub;
global.document = documentStub;
global.CustomEvent = CustomEventStub;

const eventPath = require.resolve('../assets/js/core/notification-event.js');
const centerPath = require.resolve('../assets/js/core/notification-center.js');
delete require.cache[eventPath];
delete require.cache[centerPath];
require(eventPath);
require(centerPath);

const event = Doke.notificationEvent;
const center = Doke.notificationCenter;
assert.ok(event, 'notification event authority must be published');
assert.ok(center, 'notification center authority must be published');

function item(id, raw, entity) {
  const normalized = event.normalize(Object.assign({
    eventId: `evt-${id}`,
    sourceAuthority: 'CANONICAL_REMOTE'
  }, raw || {}));
  assert.equal(normalized.accepted, true, `${id} must be accepted before entering center`);
  return Object.assign({
    id,
    eventId: normalized.eventId,
    eventKey: normalized.dedupeKey,
    dedupeKey: normalized.dedupeKey,
    eventAccepted: normalized.accepted,
    eventCategory: normalized.category,
    priority: normalized.priority,
    attentionState: normalized.attentionState,
    actionRequired: normalized.actionRequired,
    read: false
  }, entity || {});
}

const source = [
  item('message', { eventType: 'message_received', eventCategory: 'MESSAGES' }, {
    conversationId: 'conversation-1', messageId: 'message-1'
  }),
  item('order-created', { eventType: 'order_created', eventCategory: 'ORDERS' }, {
    orderId: 'order-action'
  }),
  item('proposal', { eventType: 'proposal_sent', eventCategory: 'PROPOSALS' }, {
    proposalId: 'proposal-action'
  }),
  item('payment-held', { eventType: 'payment_held', eventCategory: 'PAYMENTS' }, {
    paymentId: 'payment-info'
  }),
  item('dispute-opened', { eventType: 'dispute_opened', eventCategory: 'DISPUTES' }, {
    disputeId: 'dispute-urgent'
  }),
  item('wallet-declined', { eventType: 'wallet_withdraw_declined', eventCategory: 'PAYMENTS' }, {
    paymentId: 'withdraw-action'
  }),
  item('resolved-order', { eventType: 'order_completed', eventCategory: 'ORDERS' }, {
    orderId: 'order-resolved'
  }),
  item('resolved-dispute', { eventType: 'dispute_resolved', eventCategory: 'DISPUTES' }, {
    disputeId: 'dispute-resolved'
  })
];

center.replace(source, {
  freshness: 'FRESH',
  sourceAuthority: 'CANONICAL_REMOTE',
  updatedAt: '2026-08-09T18:00:00.000Z'
});

let badge = center.getBadgeSnapshot();
assert.equal(badge.unreadTotal, 8, 'all accepted unread events remain unread independently of attention');
assert.equal(badge.unreadMessages, 1);
assert.equal(badge.actionRequiredTotal, 4, 'order, proposal, dispute and declined withdrawal require action');
assert.equal(badge.urgentTotal, 1, 'only dispute_opened is urgent in the current H06 matrix');
assert.equal(badge.byCategory.ORDERS.actionRequired, 1);
assert.equal(badge.byCategory.PROPOSALS.actionRequired, 1);
assert.equal(badge.byCategory.DISPUTES.actionRequired, 1);
assert.equal(badge.byCategory.DISPUTES.urgent, 1);
assert.equal(badge.byCategory.PAYMENTS.actionRequired, 1, 'payment_held is informational while declined withdrawal needs action');

center.markRead('order-created');
badge = center.getBadgeSnapshot();
assert.equal(badge.unreadTotal, 7);
assert.equal(badge.actionRequiredTotal, 4, 'reading does not resolve domain attention');

center.replace([
  item('resolved-order', { eventType: 'order_completed', eventCategory: 'ORDERS' }, {
    orderId: 'order-action'
  }),
  item('resolved-dispute', { eventType: 'dispute_resolved', eventCategory: 'DISPUTES' }, {
    disputeId: 'dispute-urgent'
  })
], {
  freshness: 'FRESH',
  sourceAuthority: 'CANONICAL_REMOTE',
  completeSnapshot: true
});
badge = center.getBadgeSnapshot();
assert.equal(badge.actionRequiredTotal, 0, 'resolved policies must not leave stale action counters');
assert.equal(badge.urgentTotal, 0);

for (const key of ['window', 'document', 'CustomEvent']) delete global[key];
delete require.cache[eventPath];
delete require.cache[centerPath];

console.log('[ux-notif-006-badge-policy-integration] ok');
console.log('- canonical event policy feeds H04 unread/action/urgent counters without coupling read state to attention');
