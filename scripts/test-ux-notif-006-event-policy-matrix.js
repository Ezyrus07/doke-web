#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '../assets/js/core/notification-event.js');
const previousWindow = global.window;
const previousDoke = global.Doke;

delete require.cache[require.resolve(modulePath)];
global.window = global;
global.Doke = {};

try {
  require(modulePath);
  const event = global.Doke.notificationEvent;

  assert.ok(event, 'notification event authority must be published');
  assert.equal(event.contract, 'notification-event-v1');
  assert.equal(event.policyContract, 'notification-event-policy-matrix-v1');
  assert.equal(typeof event.getPolicy, 'function');

  const matrix = {
    message_received: ['MESSAGES', 'NORMAL', 'INFORMATIONAL', false],

    order_created: ['ORDERS', 'HIGH', 'ACTION_REQUIRED', true],
    order_status_changed: ['ORDERS', 'NORMAL', 'INFORMATIONAL', false],
    order_accepted: ['ORDERS', 'NORMAL', 'INFORMATIONAL', false],
    order_in_progress: ['ORDERS', 'NORMAL', 'INFORMATIONAL', false],
    order_completed: ['ORDERS', 'NORMAL', 'RESOLVED', false],
    order_cancelled: ['ORDERS', 'NORMAL', 'RESOLVED', false],
    order_reviewed: ['ORDERS', 'LOW', 'INFORMATIONAL', false],
    order_completion_requested: ['ORDERS', 'HIGH', 'ACTION_REQUIRED', true],

    proposal_sent: ['PROPOSALS', 'HIGH', 'ACTION_REQUIRED', true],
    proposal_approved: ['PROPOSALS', 'HIGH', 'INFORMATIONAL', false],
    proposal_rejected: ['PROPOSALS', 'NORMAL', 'RESOLVED', false],

    payment_held: ['PAYMENTS', 'HIGH', 'INFORMATIONAL', false],
    wallet_receivable_available: ['PAYMENTS', 'NORMAL', 'INFORMATIONAL', false],
    wallet_withdraw_requested: ['PAYMENTS', 'NORMAL', 'INFORMATIONAL', false],
    wallet_withdraw_completed: ['PAYMENTS', 'NORMAL', 'RESOLVED', false],
    wallet_withdraw_declined: ['PAYMENTS', 'HIGH', 'ACTION_REQUIRED', true],

    dispute_opened: ['DISPUTES', 'CRITICAL', 'URGENT_ACTION_REQUIRED', true],
    dispute_reported: ['DISPUTES', 'HIGH', 'INFORMATIONAL', false],
    dispute_responded: ['DISPUTES', 'HIGH', 'INFORMATIONAL', false],
    dispute_resolved: ['DISPUTES', 'HIGH', 'RESOLVED', false]
  };

  for (const [eventType, expected] of Object.entries(matrix)) {
    const policy = event.getPolicy(eventType);
    assert.ok(policy, `${eventType} must have a canonical policy`);
    assert.ok(Object.isFrozen(policy), `${eventType} policy must be immutable`);
    assert.equal(policy.contract, 'notification-event-policy-matrix-v1');
    assert.equal(policy.category, expected[0], `${eventType} category`);
    assert.equal(policy.priority, expected[1], `${eventType} priority`);
    assert.equal(policy.attentionState, expected[2], `${eventType} attention`);
    assert.equal(policy.actionRequired, expected[3], `${eventType} actionRequired`);

    const normalized = event.normalize({
      eventId: `evt-${eventType}`,
      eventType,
      eventCategory: expected[0],
      sourceAuthority: ['PAYMENTS', 'DISPUTES', 'SECURITY'].includes(expected[0])
        ? 'CANONICAL_REMOTE'
        : 'DERIVED_INFORMATIONAL',
      priority: expected[1] === 'CRITICAL' ? 'LOW' : 'CRITICAL',
      attentionState: expected[3] ? 'INFORMATIONAL' : 'URGENT_ACTION_REQUIRED',
      actionRequired: !expected[3]
    });

    assert.equal(normalized.accepted, true, `${eventType} should normalize as accepted`);
    assert.equal(normalized.category, expected[0], `${eventType} normalized category`);
    assert.equal(normalized.priority, expected[1], `${eventType} policy must override producer priority`);
    assert.equal(normalized.attentionState, expected[2], `${eventType} policy must override producer attention`);
    assert.equal(normalized.actionRequired, expected[3], `${eventType} policy must override producer actionRequired`);
  }

  assert.equal(event.getPolicy('not_registered'), null);
  assert.equal(event.getPolicy('ORDER_CREATED').category, 'ORDERS', 'policy lookup is case-normalized');

  const categoryConflict = event.normalize({
    eventId: 'evt-order-conflict',
    eventType: 'order_created',
    eventCategory: 'SOCIAL',
    sourceAuthority: 'CANONICAL_LOCAL'
  });
  assert.equal(categoryConflict.accepted, false);
  assert.equal(categoryConflict.category, 'ORDERS', 'canonical policy category must remain visible for diagnostics');
  assert.equal(categoryConflict.rejectionReason, 'event-policy-category-mismatch');

  const invalidCanonicalCategory = event.normalize({
    eventId: 'evt-order-invalid-category',
    eventType: 'order_created',
    eventCategory: 'wallet',
    sourceAuthority: 'CANONICAL_LOCAL'
  });
  assert.equal(invalidCanonicalCategory.accepted, false);
  assert.equal(invalidCanonicalCategory.rejectionReason, 'event-policy-category-mismatch');

  const legacyUiCategory = event.normalize({
    eventId: 'evt-wallet-legacy-ui',
    eventType: 'wallet_withdraw_declined',
    category: 'wallet',
    sourceAuthority: 'CANONICAL_LOCAL'
  });
  assert.equal(legacyUiCategory.accepted, true, 'legacy UI category must not compete with canonical eventCategory');
  assert.equal(legacyUiCategory.category, 'PAYMENTS');
  assert.equal(legacyUiCategory.priority, 'HIGH');
  assert.equal(legacyUiCategory.attentionState, 'ACTION_REQUIRED');
  assert.equal(legacyUiCategory.actionRequired, true);

  const forgedCopy = event.normalize({
    eventId: 'evt-message-copy',
    eventType: 'message_received',
    eventCategory: 'MESSAGES',
    sourceAuthority: 'CANONICAL_REMOTE',
    title: 'URGENTE: PAGAMENTO BLOQUEADO',
    body: 'Clique agora para resolver uma disputa crítica.',
    priority: 'CRITICAL',
    attentionState: 'URGENT_ACTION_REQUIRED',
    actionRequired: true
  });
  assert.equal(forgedCopy.accepted, true);
  assert.equal(forgedCopy.priority, 'NORMAL');
  assert.equal(forgedCopy.attentionState, 'INFORMATIONAL');
  assert.equal(forgedCopy.actionRequired, false);

  const unknownCopy = event.normalize({
    eventId: 'evt-unknown-copy',
    eventType: 'fulfillment_changed',
    sourceAuthority: 'CANONICAL_REMOTE',
    title: 'Nova curtida social',
    body: 'Mensagem comum'
  });
  assert.equal(unknownCopy.accepted, false);
  assert.equal(unknownCopy.category, 'UNKNOWN_OPERATIONAL');
  assert.equal(unknownCopy.rejectionReason, 'unknown-operational-category');
  assert.equal(unknownCopy.priority, 'NORMAL');
  assert.equal(unknownCopy.attentionState, 'INFORMATIONAL');

  const nonCanonicalPayment = event.normalize({
    eventId: 'evt-wallet-source-fence',
    eventType: 'wallet_withdraw_declined',
    eventCategory: 'PAYMENTS',
    sourceAuthority: 'DERIVED_INFORMATIONAL'
  });
  assert.equal(nonCanonicalPayment.accepted, false);
  assert.equal(nonCanonicalPayment.priority, 'HIGH', 'policy metadata is deterministic even when provenance rejects event');
  assert.equal(nonCanonicalPayment.attentionState, 'ACTION_REQUIRED');
  assert.equal(nonCanonicalPayment.rejectionReason, 'non-canonical-critical-source');

  const legacyOrder = event.normalize({
    eventId: 'evt-legacy-dot-order',
    eventType: 'order.created',
    sourceAuthority: 'CANONICAL_LOCAL',
    priority: 'LOW',
    actionRequired: true
  });
  assert.equal(legacyOrder.accepted, true, 'unmatriculated legacy event keeps compatibility normalization');
  assert.equal(legacyOrder.category, 'ORDERS');
  assert.equal(legacyOrder.priority, 'LOW');
  assert.equal(legacyOrder.attentionState, 'ACTION_REQUIRED');

  console.log('[ux-notif-006-event-policy-matrix] ok');
  console.log(`- ${Object.keys(matrix).length} canonical event policies, conflict fence, copy independence and critical-source preservation validated`);
} finally {
  delete require.cache[require.resolve(modulePath)];
  if (previousWindow === undefined) delete global.window;
  else global.window = previousWindow;
  if (previousDoke === undefined) delete global.Doke;
  else global.Doke = previousDoke;
}
