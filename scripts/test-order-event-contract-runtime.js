'use strict';

const assert = require('assert');
const contract = require('../backend/modules/orders/order-event-contract');

const event = contract.buildOrderDomainEvent({
  order: {
    id: 'order-123',
    client_id: 'client-123',
    professional_id: 'professional-123',
    service_id: 'service-123',
    status: 'accepted'
  },
  previousStatus: 'requested',
  nextStatus: 'accepted',
  actor: { id: 'professional-123', role: 'professional' },
  action: 'accept',
  note: 'Pedido aceito.',
  sequence: 2,
  occurredAt: '2026-07-21T12:00:00.000Z'
});

assert.strictEqual(event.eventKey, 'order:order-123:v2');
assert.strictEqual(event.eventType, 'order.accepted');
assert.strictEqual(event.previousStatus, 'requested');
assert.strictEqual(event.nextStatus, 'accepted');
assert.strictEqual(event.recipients.length, 1);
assert.strictEqual(event.recipients[0].recipientId, 'client-123');
assert.strictEqual(event.recipients[0].category, 'orders');
assert.ok(event.cacheTags.includes('order:order-123'));
assert.ok(event.cacheTags.includes('orders:client:client-123'));
assert.ok(event.cacheTags.includes('orders:professional:professional-123'));
assert.ok(event.cacheTags.includes('notifications:user:client-123'));
assert.strictEqual(event.metric.eventType, 'order.accepted');

const internalEvent = contract.buildOrderDomainEvent({
  order: {
    id: 'order-456',
    client_id: 'client-456',
    professional_id: 'professional-456',
    status: 'cancelled'
  },
  previousStatus: 'disputed',
  nextStatus: 'cancelled',
  actor: { id: 'support-456', role: 'support' },
  sequence: 5
});
assert.deepStrictEqual(internalEvent.recipients.map((item) => item.recipientId), ['client-456', 'professional-456']);

assert.throws(
  () => contract.buildOrderDomainEvent({ order: { id: 'x', client_id: 'c', status: 'accepted' }, sequence: 0 }),
  (error) => error && error.code === 'DOKE_ORDER_EVENT_SEQUENCE_INVALID'
);

console.log('[test:order-event-contract-runtime] ok');
console.log('- deterministic event keys');
console.log('- actor-aware notification recipients');
console.log('- cache tags and metric projection contract');
