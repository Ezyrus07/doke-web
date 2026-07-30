import assert from 'node:assert/strict';
import {
  WORKER_INVOCATION_HEADER_NAMES,
  WORKER_INVOCATION_NONCE_BYTES,
  WORKER_INVOCATION_NONCE_PATTERN,
  buildWorkerInvocationHeaders,
  readWorkerInvocationHeaders,
} from '../supabase/functions/order-event-worker/invocation-headers.mjs';

const fixedNow = 1_775_000_000_123;
const deterministicBytes = Uint8Array.from(
  { length: WORKER_INVOCATION_NONCE_BYTES },
  (_, index) => index
);

const first = buildWorkerInvocationHeaders({
  nowMs: fixedNow,
  source: 'CRON',
  randomBytes: deterministicBytes,
});
const second = buildWorkerInvocationHeaders({
  nowMs: fixedNow,
  source: 'cron',
  randomBytes: deterministicBytes,
});

assert.equal(first.issuedAt, String(fixedNow));
assert.equal(first.source, 'cron');
assert.equal(first.nonce.length, 32);
assert.match(first.nonce, WORKER_INVOCATION_NONCE_PATTERN);
assert.equal(first.nonce, second.nonce, 'same deterministic entropy must produce the same nonce');
assert.equal(first.headers[WORKER_INVOCATION_HEADER_NAMES.issuedAt], String(fixedNow));
assert.equal(first.headers[WORKER_INVOCATION_HEADER_NAMES.nonce], first.nonce);
assert.equal(first.headers[WORKER_INVOCATION_HEADER_NAMES.source], 'cron');
assert.equal(Object.isFrozen(first), true);
assert.equal(Object.isFrozen(first.headers), true);
assert.equal('x-doke-worker-token' in first.headers, false, 'header builder must never carry secrets');

const different = buildWorkerInvocationHeaders({
  nowMs: fixedNow + 1,
  source: 'test',
  randomBytes: Uint8Array.from(deterministicBytes, (value) => value ^ 0xff),
});
assert.notEqual(different.nonce, first.nonce);
assert.equal(different.source, 'test');

const fromHeaders = readWorkerInvocationHeaders(new Headers(first.headers));
assert.deepEqual(fromHeaders, {
  issuedAt: first.issuedAt,
  nonce: first.nonce,
  source: 'cron',
});
assert.equal(Object.isFrozen(fromHeaders), true);

const fromPlainObject = readWorkerInvocationHeaders({
  'X-Doke-Worker-Issued-At': first.issuedAt,
  'X-Doke-Worker-Nonce': first.nonce,
  'X-Doke-Worker-Source': 'RECOVERY',
});
assert.equal(fromPlainObject.source, 'recovery');

const fallback = readWorkerInvocationHeaders({}, { defaultSource: 'test' });
assert.deepEqual(fallback, { issuedAt: null, nonce: null, source: 'test' });

assert.throws(
  () => buildWorkerInvocationHeaders({ nowMs: fixedNow, randomBytes: new Uint8Array(23) }),
  (error) => error?.code === 'DOKE_ORDER_EVENT_WORKER_NONCE_ENTROPY_INVALID'
);
assert.throws(
  () => buildWorkerInvocationHeaders({ nowMs: 123, randomBytes: deterministicBytes }),
  (error) => error?.code === 'DOKE_ORDER_EVENT_WORKER_ISSUED_AT_INVALID'
);

console.log('ORD-A07C worker invocation header tests passed.');
