const assert = require('node:assert/strict');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const eventPath = path.join(rootDir, 'assets/js/core/notification-event.js');
const servicePath = path.join(rootDir, 'assets/js/services/notification-service.js');
const previous = { window: global.window, Doke: global.Doke, localStorage: global.localStorage };
let provider = 'mock';
const localPayloads = [];
const remotePayloads = [];

global.window = global;
global.localStorage = { getItem() { return null; } };
global.Doke = {
  session: { getCurrentUser() { return { id: 'client-1', role: 'client', name: 'Cliente' }; } },
  repositories: { notifications: { create(payload) { localPayloads.push(payload); return Promise.resolve(payload); } } },
  repositoryBoundary: {
    list() { return Promise.resolve([]); },
    getActiveProviderName() { return provider; },
    getDataProviderStatus() { return { apiReady: provider === 'api', networkEnabled: provider === 'api', apiBaseUrlConfigured: provider === 'api' }; },
    create(domain, payload) { assert.equal(domain, 'notifications'); remotePayloads.push(payload); return Promise.resolve(payload); }
  }
};

delete require.cache[require.resolve(eventPath)];
delete require.cache[require.resolve(servicePath)];

function normalize(payload) {
  return global.Doke.notificationEvent.normalize(payload);
}

function assertEnvelope(payload, expected) {
  const expectedAuthority = expected.sourceAuthority || 'DERIVED_INFORMATIONAL';
  assert.ok(payload.eventId, `${expected.eventType} must publish eventId`);
  assert.equal(payload.eventType, expected.eventType);
  assert.equal(payload.eventCategory, expected.category);
  assert.equal(payload.sourceDomain, expected.category);
  assert.equal(payload.sourceAuthority, expectedAuthority);
  assert.equal(payload.dedupeKey, payload.eventId);
  assert.equal(payload.eventKey, payload.eventId);
  const normalized = normalize(payload);
  assert.equal(normalized.identitySource, 'eventId');
  assert.equal(normalized.category, expected.category);
  assert.equal(normalized.sourceDomain, expected.category);
  assert.equal(normalized.sourceAuthority, expectedAuthority);
  assert.equal(normalized.accepted, expected.accepted !== false);
  if (expected.reason) assert.equal(normalized.rejectionReason, expected.reason);
  return normalized;
}

(async () => {
  try {
    require(eventPath);
    require(servicePath);
    const notifications = global.Doke.services.notifications;
    assert.ok(notifications);

    let payload = await notifications.createOrderCreated({ id: 'order-1', clientId: 'client-1', professionalId: 'pro-1', serviceTitle: 'Limpeza' }, { recipientId: 'pro-1' });
    assert.equal(payload.type, 'order_created');
    assert.equal(payload.category, 'orders');
    assertEnvelope(payload, { eventType: 'order_created', category: 'ORDERS' });

    payload = await notifications.createOrderStatusChanged({ id: 'order-2', clientId: 'client-1', professionalId: 'pro-2', serviceTitle: 'Pintura' }, 'quoted', { recipientId: 'client-1', amount: 'R$ 300' });
    assert.equal(payload.type, 'order_status_changed');
    assert.equal(payload.category, 'orders');
    assertEnvelope(payload, { eventType: 'proposal_sent', category: 'PROPOSALS' });

    payload = await notifications.createOrderStatusChanged({ id: 'order-3', clientId: 'client-1', professionalId: 'pro-3', serviceTitle: 'Reparo' }, 'in_progress', { recipientId: 'pro-3', paymentStatus: 'held', paymentMessageId: 'charge-3' });
    assert.equal(assertEnvelope(payload, { eventType: 'order_in_progress', category: 'ORDERS' }).criticalOperational, false);

    payload = await notifications.createCompletionRequested({ id: 'order-4', clientId: 'client-1', professionalId: 'pro-4' }, { id: 'pay-4', orderId: 'order-4', clientId: 'client-1' }, {});
    assertEnvelope(payload, { eventType: 'order_completion_requested', category: 'ORDERS' });

    payload = await notifications.createPaymentHeld({ id: 'pay-derived', orderId: 'order-5', professionalId: 'pro-5', amount: 500 }, { order: { id: 'order-5', professionalId: 'pro-5' } });
    assert.equal(assertEnvelope(payload, { eventType: 'payment_held', category: 'PAYMENTS', accepted: false, reason: 'non-canonical-critical-source' }).criticalOperational, true);

    payload = await notifications.createPaymentHeld({ id: 'pay-local', orderId: 'order-5', professionalId: 'pro-5', amount: 500 }, { order: { id: 'order-5', professionalId: 'pro-5' }, sourceAuthority: 'CANONICAL_LOCAL' });
    assert.equal(assertEnvelope(payload, { eventType: 'payment_held', category: 'PAYMENTS', sourceAuthority: 'CANONICAL_LOCAL' }).criticalOperational, true);

    const derivedDispute = await notifications.createDisputeOpened({ id: 'order-6', clientId: 'client-1', professionalId: 'pro-6' }, { id: 'pay-6', orderId: 'order-6' }, { id: 'dispute-derived', orderId: 'order-6' }, {});
    assert.equal(derivedDispute.length, 2);
    assert.equal(assertEnvelope(derivedDispute[0], { eventType: 'dispute_opened', category: 'DISPUTES', accepted: false, reason: 'non-canonical-critical-source' }).criticalOperational, true);

    const opened = await notifications.createDisputeOpened({ id: 'order-6', clientId: 'client-1', professionalId: 'pro-6' }, { id: 'pay-6', orderId: 'order-6' }, { id: 'dispute-6', orderId: 'order-6' }, { sourceAuthority: 'CANONICAL_LOCAL' });
    assert.equal(opened.length, 2);
    assert.equal(opened[0].category, 'orders');
    assertEnvelope(opened[0], { eventType: 'dispute_opened', category: 'DISPUTES', sourceAuthority: 'CANONICAL_LOCAL' });
    assertEnvelope(opened[1], { eventType: 'dispute_reported', category: 'DISPUTES', sourceAuthority: 'CANONICAL_LOCAL' });

    const responded = await notifications.createDisputeResponded({ id: 'order-6', clientId: 'client-1', professionalId: 'pro-6' }, { orderId: 'order-6' }, { id: 'dispute-6', orderId: 'order-6' }, { actor: { id: 'pro-6', name: 'Profissional' }, sourceAuthority: 'CANONICAL_LOCAL' });
    assertEnvelope(responded[0], { eventType: 'dispute_responded', category: 'DISPUTES', sourceAuthority: 'CANONICAL_LOCAL' });

    const resolved = await notifications.createDisputeResolved({ id: 'order-6', clientId: 'client-1', professionalId: 'pro-6' }, { orderId: 'order-6' }, { id: 'dispute-6', orderId: 'order-6', resolution: 'client' }, { sourceAuthority: 'CANONICAL_LOCAL' });
    assert.equal(resolved.length, 2);
    resolved.forEach((item) => assertEnvelope(item, { eventType: 'dispute_resolved', category: 'DISPUTES', sourceAuthority: 'CANONICAL_LOCAL' }));

    payload = await notifications.createMessageReceived({ id: 'conversation-7', orderId: 'order-7', participants: ['client-1', 'pro-7'] }, { id: 'message-7', senderId: 'pro-7', text: 'Olá' }, { recipientId: 'client-1', actor: { id: 'pro-7', name: 'Profissional' } });
    assertEnvelope(payload, { eventType: 'message_received', category: 'MESSAGES' });

    provider = 'api';
    payload = await notifications.createPaymentHeld({ id: 'pay-api-derived', orderId: 'order-api', professionalId: 'pro-api', amount: 10 }, { order: { id: 'order-api', professionalId: 'pro-api' } });
    assertEnvelope(payload, { eventType: 'payment_held', category: 'PAYMENTS', accepted: false, reason: 'non-canonical-critical-source' });
    payload = await notifications.createPaymentHeld({ id: 'pay-remote', orderId: 'order-remote', professionalId: 'pro-remote', amount: 10 }, { order: { id: 'order-remote', professionalId: 'pro-remote' }, sourceAuthority: 'CANONICAL_REMOTE' });
    assertEnvelope(payload, { eventType: 'payment_held', category: 'PAYMENTS', sourceAuthority: 'CANONICAL_REMOTE' });
    assert.equal(remotePayloads.length, 2);
    assert.ok(localPayloads.length >= 13);

    console.log('[ux-notif-002-producer-envelopes] ok');
    console.log('- eventCategory precedence, native identity, semantic classification and critical source provenance validated');
  } finally {
    delete require.cache[require.resolve(eventPath)];
    delete require.cache[require.resolve(servicePath)];
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete global[key];
      else global[key] = value;
    }
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
