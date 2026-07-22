import assert from 'node:assert/strict';
import {
  buildWebhookEnvelope,
  deliverOptionalWebhook,
  hmacSha256Hex,
  normalizeLimit,
  normalizeWorkerError,
  retryDelaySeconds,
} from '../supabase/functions/order-event-worker/worker.mjs';

assert.equal(normalizeLimit(undefined), 25);
assert.equal(normalizeLimit(0), 1);
assert.equal(normalizeLimit(200), 100);
assert.equal(normalizeLimit(7.9), 7);

assert.equal(retryDelaySeconds(1), 30);
assert.equal(retryDelaySeconds(2), 60);
assert.equal(retryDelaySeconds(5), 480);
assert.equal(retryDelaySeconds(20), 3600);

assert.equal(normalizeWorkerError(Object.assign(new Error('timed out'), { name: 'TimeoutError' })), 'DOKE_ORDER_EVENT_WEBHOOK_TIMEOUT');
assert.equal(normalizeWorkerError(Object.assign(new Error('x'), { code: 'DOKE_ORDER_EVENT_WEBHOOK_5XX' })), 'DOKE_ORDER_EVENT_WEBHOOK_5XX');
assert.equal(normalizeWorkerError(new Error('claim_order_domain_events failed')), 'DOKE_ORDER_EVENT_CLAIM_FAILED');
assert.equal(normalizeWorkerError(new Error('unrelated')), 'DOKE_ORDER_EVENT_DELIVERY_FAILED');

const event = {
  event_key: 'order:123:v2',
  event_type: 'order.accepted',
  order_id: '123',
  sequence_no: 2,
  delivery_attempts: 1,
  created_at: '2026-07-21T15:00:00.000Z',
  payload: { nextStatus: 'accepted' },
  cache_tags: ['order:123', 'orders:client:client-1'],
};
const envelope = buildWebhookEnvelope(event, 'invocation-1');
assert.equal(envelope.id, event.event_key);
assert.equal(envelope.sequence, 2);
assert.deepEqual(envelope.cacheTags, event.cache_tags);

const skipped = await deliverOptionalWebhook(event, {});
assert.deepEqual(skipped, { status: 'skipped', reason: 'not_configured' });

let captured;
const delivered = await deliverOptionalWebhook(event, {
  url: 'https://example.invalid/order-events',
  secret: 'secret',
  invocationId: 'invocation-1',
  fetchImpl: async (url, init) => {
    captured = { url, init };
    return { ok: true, status: 202 };
  },
});
assert.deepEqual(delivered, { status: 'delivered', httpStatus: 202 });
assert.equal(captured.url, 'https://example.invalid/order-events');
assert.equal(captured.init.headers['X-Doke-Event-Id'], event.event_key);
assert.match(captured.init.headers['X-Doke-Signature'], /^sha256=[a-f0-9]{64}$/);

const signatureA = await hmacSha256Hex('secret', 'payload');
const signatureB = await hmacSha256Hex('secret', 'payload');
assert.equal(signatureA, signatureB);
assert.equal(signatureA.length, 64);

await assert.rejects(
  deliverOptionalWebhook(event, {
    url: 'https://example.invalid/order-events',
    fetchImpl: async () => ({ ok: false, status: 503 }),
  }),
  (error) => error?.code === 'DOKE_ORDER_EVENT_WEBHOOK_5XX',
);

console.log('[test:order-event-worker-runtime] ok');
console.log('- retry backoff and stable error codes');
console.log('- optional webhook path and HMAC envelope');
console.log('- deterministic batch normalization');
