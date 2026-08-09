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
  const contract = global.Doke.notificationEvent;

  assert.ok(contract, 'Doke.notificationEvent must be published');
  assert.equal(contract.contract, 'notification-event-v1');
  assert.ok(Object.isFrozen(contract));
  assert.ok(Object.isFrozen(contract.categories));
  assert.ok(contract.categories.includes('UNKNOWN_OPERATIONAL'));
  assert.ok(contract.categories.includes('PRODUCT'));

  const message = contract.normalize({
    eventId: 'evt-message-1',
    eventType: 'message.received',
    sourceAuthority: 'CANONICAL_REMOTE',
    messageId: 'message-1'
  });
  assert.equal(message.accepted, true);
  assert.equal(message.category, 'MESSAGES');
  assert.equal(message.sourceDomain, 'MESSAGES');
  assert.equal(message.dedupeKey, 'evt-message-1');
  assert.equal(message.identitySource, 'eventId');
  assert.equal(message.priority, 'NORMAL');
  assert.equal(message.attentionState, 'INFORMATIONAL');
  assert.ok(Object.isFrozen(message));
  assert.ok(Object.isFrozen(message.channelPolicy));

  const order = contract.normalize({
    eventId: 'evt-order-1',
    eventType: 'order.created',
    sourceAuthority: 'CANONICAL_LOCAL',
    actionRequired: true
  });
  assert.equal(order.accepted, true);
  assert.equal(order.category, 'ORDERS');
  assert.equal(order.attentionState, 'ACTION_REQUIRED');

  const proposal = contract.normalize({
    eventId: 'evt-proposal-1',
    eventType: 'proposal.received',
    sourceAuthority: 'CANONICAL_REMOTE'
  });
  assert.equal(proposal.category, 'PROPOSALS');

  const payment = contract.normalize({
    eventId: 'evt-payment-1',
    eventType: 'payment.confirmed',
    sourceAuthority: 'CANONICAL_REMOTE',
    privacyLevel: 'SENSITIVE_NO_OS_PREVIEW'
  });
  assert.equal(payment.accepted, true);
  assert.equal(payment.category, 'PAYMENTS');
  assert.equal(payment.criticalOperational, true);
  assert.equal(payment.channelPolicy.browser, 'forbidden');

  const nonCanonicalPayment = contract.normalize({
    eventId: 'evt-payment-2',
    eventType: 'payment.released',
    sourceAuthority: 'DERIVED_INFORMATIONAL'
  });
  assert.equal(nonCanonicalPayment.accepted, false);
  assert.equal(nonCanonicalPayment.rejectionReason, 'non-canonical-critical-source');

  const dispute = contract.normalize({
    eventId: 'evt-dispute-1',
    eventType: 'dispute.opened',
    sourceAuthority: 'CANONICAL_REMOTE',
    priority: 'CRITICAL',
    attentionState: 'URGENT_ACTION_REQUIRED'
  });
  assert.equal(dispute.accepted, true);
  assert.equal(dispute.category, 'DISPUTES');
  assert.equal(dispute.priority, 'CRITICAL');
  assert.equal(dispute.attentionState, 'URGENT_ACTION_REQUIRED');
  assert.equal(dispute.channelPolicy.digest, 'forbidden');

  const security = contract.normalize({
    eventId: 'evt-security-1',
    eventType: 'security.session_revoked',
    sourceAuthority: 'CANONICAL_REMOTE'
  });
  assert.equal(security.category, 'SECURITY');
  assert.equal(security.criticalOperational, true);

  const community = contract.normalize({
    eventId: 'evt-community-1',
    eventType: 'community.mention',
    sourceAuthority: 'CANONICAL_REMOTE'
  });
  assert.equal(community.category, 'COMMUNITIES');

  const social = contract.normalize({
    eventId: 'evt-reaction-1',
    eventType: 'reaction.received',
    sourceAuthority: 'CANONICAL_REMOTE'
  });
  assert.equal(social.category, 'SOCIAL');

  const product = contract.normalize({
    eventId: 'evt-product-1',
    eventType: 'product.announcement',
    sourceAuthority: 'DERIVED_INFORMATIONAL'
  });
  assert.equal(product.accepted, true);
  assert.equal(product.category, 'PRODUCT');

  const unknownOperational = contract.normalize({
    eventId: 'evt-unknown-1',
    eventType: 'fulfillment.changed',
    sourceAuthority: 'CANONICAL_REMOTE'
  });
  assert.equal(unknownOperational.accepted, false);
  assert.equal(unknownOperational.category, 'UNKNOWN_OPERATIONAL');
  assert.equal(unknownOperational.rejectionReason, 'unknown-operational-category');
  assert.notEqual(unknownOperational.category, 'SOCIAL');

  const legacyFallback = contract.normalize({
    type: 'order.status_changed',
    orderId: 'order-legacy-1',
    revision: '7',
    sourceAuthority: 'CANONICAL_LOCAL'
  });
  assert.equal(legacyFallback.accepted, true);
  assert.equal(legacyFallback.identitySource, 'legacy-fallback');
  assert.equal(legacyFallback.dedupeKey, 'legacy:order.status_changed:order-legacy-1:7');

  const insufficientLegacy = contract.normalize({
    type: 'order.status_changed',
    orderId: 'order-legacy-2',
    sourceAuthority: 'CANONICAL_LOCAL'
  });
  assert.equal(insufficientLegacy.accepted, false);
  assert.equal(insufficientLegacy.rejectionReason, 'missing-event-identity');

  const explicitDedupe = contract.normalize({
    type: 'message.received',
    eventKey: 'message:legacy:42',
    sourceAuthority: 'CANONICAL_LOCAL'
  });
  assert.equal(explicitDedupe.accepted, true);
  assert.equal(explicitDedupe.identitySource, 'explicit-dedupe');
  assert.equal(contract.getDedupeKey({
    type: 'message.received',
    eventKey: 'message:legacy:42'
  }), 'message:legacy:42');

  const diagnostic = contract.diagnostic(payment, 'test');
  assert.deepEqual(Object.keys(diagnostic).sort(), [
    'accepted',
    'attentionState',
    'category',
    'contract',
    'criticalOperational',
    'identitySource',
    'priority',
    'reason',
    'version'
  ].sort());
  assert.equal(diagnostic.accepted, true);
  assert.equal(diagnostic.category, 'PAYMENTS');
  assert.equal(diagnostic.reason, 'test');
  assert.equal('eventId' in diagnostic, false);
  assert.equal('dedupeKey' in diagnostic, false);
  assert.equal('payload' in diagnostic, false);

  console.log('[ux-notif-002-notification-event] ok');
  console.log('- canonical identity, explicit categories, critical-source fences, legacy fallback and sanitized diagnostics validated');
} finally {
  delete require.cache[require.resolve(modulePath)];
  if (previousWindow === undefined) delete global.window;
  else global.window = previousWindow;
  if (previousDoke === undefined) delete global.Doke;
  else global.Doke = previousDoke;
}
