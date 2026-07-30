import assert from 'node:assert/strict';
import { buildWorkerInvocationHeaders } from '../supabase/functions/order-event-worker/invocation-headers.mjs';
import { assertFreshWorkerRequest } from '../supabase/functions/order-event-worker/invocation-gate.mjs';

const nowMs = 1_786_000_000_000;
const randomBytes = Uint8Array.from({ length: 24 }, (_, index) => index + 1);
const built = buildWorkerInvocationHeaders({ nowMs, randomBytes, source: 'cron' });
const consumed = new Set();
let consumeCalls = 0;
let captured = null;

const consumeNonce = async (input) => {
  consumeCalls += 1;
  captured = input;
  if (consumed.has(input.nonce)) return false;
  consumed.add(input.nonce);
  return true;
};

const accepted = await assertFreshWorkerRequest(built.headers, { nowMs, consumeNonce });
assert.equal(accepted.accepted, true);
assert.equal(accepted.source, 'cron');
assert.equal(accepted.issuedAt, String(nowMs));
assert.equal(accepted.issuedAtMs, nowMs);
assert.equal(accepted.ageMs, 0);
assert.equal(accepted.nonceConsumed, true);
assert.equal(Object.isFrozen(accepted), true);
assert.equal(consumeCalls, 1);
assert.equal(captured.nonce, built.nonce);
assert.equal(captured.issuedAtMs, nowMs);
assert.equal(captured.issuedAt, new Date(nowMs).toISOString());
assert.equal(captured.source, 'cron');

await assert.rejects(
  () => assertFreshWorkerRequest(built.headers, { nowMs, consumeNonce }),
  (error) => error.code === 'DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED' && error.status === 409
);
assert.equal(consumeCalls, 2);

let invalidConsumeCalled = false;
await assert.rejects(
  () => assertFreshWorkerRequest({ 'x-doke-worker-source': 'cron' }, {
    nowMs,
    consumeNonce: async () => {
      invalidConsumeCalled = true;
      return true;
    },
  }),
  (error) => error.code === 'DOKE_ORDER_EVENT_WORKER_FRESHNESS_REQUIRED' && error.status === 428
);
assert.equal(invalidConsumeCalled, false);

await assert.rejects(
  () => assertFreshWorkerRequest(built.headers, {
    nowMs,
    consumeNonce: async () => {
      const error = new Error('ledger unavailable');
      error.code = 'DOKE_ORDER_EVENT_WORKER_NONCE_LEDGER_UNAVAILABLE';
      error.status = 428;
      throw error;
    },
  }),
  (error) => error.code === 'DOKE_ORDER_EVENT_WORKER_NONCE_LEDGER_UNAVAILABLE' && error.status === 428
);

await assert.rejects(
  () => assertFreshWorkerRequest(built.headers, { nowMs }),
  (error) => error.code === 'DOKE_ORDER_EVENT_WORKER_NONCE_LEDGER_UNAVAILABLE' && error.status === 428
);

console.log('ORD-A07D worker invocation gate tests passed.');
