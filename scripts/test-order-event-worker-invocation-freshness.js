'use strict';

const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const contract = await import(pathToFileURL(path.resolve(
    __dirname,
    '../supabase/functions/order-event-worker/invocation-freshness.mjs'
  )).href);

  const nowMs = Date.parse('2026-07-30T14:15:00.000Z');
  const validNonce = 'nonce_0123456789abcdefghijklmnop';
  const issuedAt = new Date(nowMs - 60_000).toISOString();

  const missing = contract.validateWorkerInvocationEnvelope({}, { nowMs });
  assert.strictEqual(missing.valid, false);
  assert(missing.blockers.includes('worker_invocation_issued_at_required'));
  assert(missing.blockers.includes('worker_invocation_nonce_required'));

  const malformedTime = contract.validateWorkerInvocationEnvelope({
    issuedAt: 'not-a-date',
    nonce: validNonce
  }, { nowMs });
  assert.strictEqual(malformedTime.valid, false);
  assert(malformedTime.blockers.includes('worker_invocation_issued_at_invalid'));

  const malformedNonce = contract.validateWorkerInvocationEnvelope({
    issuedAt,
    nonce: 'short'
  }, { nowMs });
  assert.strictEqual(malformedNonce.valid, false);
  assert(malformedNonce.blockers.includes('worker_invocation_nonce_invalid'));

  const expired = contract.validateWorkerInvocationEnvelope({
    issuedAt: new Date(nowMs - contract.WORKER_INVOCATION_MAX_AGE_MS - 1).toISOString(),
    nonce: validNonce
  }, { nowMs });
  assert.strictEqual(expired.valid, false);
  assert(expired.blockers.includes('worker_invocation_expired'));

  const future = contract.validateWorkerInvocationEnvelope({
    issuedAt: new Date(nowMs + contract.WORKER_INVOCATION_FUTURE_SKEW_MS + 1).toISOString(),
    nonce: validNonce
  }, { nowMs });
  assert.strictEqual(future.valid, false);
  assert(future.blockers.includes('worker_invocation_from_future'));

  const noLedger = await contract.verifyFreshWorkerInvocation({
    issuedAt,
    nonce: validNonce,
    source: 'cron'
  }, { nowMs });
  assert.strictEqual(noLedger.accepted, false);
  assert.strictEqual(noLedger.status, 'worker_invocation_nonce_ledger_unavailable');
  assert(noLedger.blockers.includes('worker_invocation_nonce_consumer_required'));

  const consumed = new Set();
  const consumeNonce = async ({ nonce }) => {
    if (consumed.has(nonce)) return false;
    consumed.add(nonce);
    return true;
  };

  const first = await contract.verifyFreshWorkerInvocation({
    issuedAt,
    nonce: validNonce,
    source: 'cron'
  }, { nowMs, consumeNonce });
  assert.strictEqual(first.accepted, true);
  assert.strictEqual(first.nonceConsumed, true);
  assert.strictEqual(first.replayDetected, false);
  assert(Object.isFrozen(first));
  assert(Object.isFrozen(first.envelope));

  const replay = await contract.verifyFreshWorkerInvocation({
    issuedAt,
    nonce: validNonce,
    source: 'cron'
  }, { nowMs, consumeNonce });
  assert.strictEqual(replay.accepted, false);
  assert.strictEqual(replay.replayDetected, true);
  assert.strictEqual(replay.status, 'worker_invocation_replay_rejected');
  assert(replay.blockers.includes('worker_invocation_nonce_already_consumed'));

  await assert.rejects(
    () => contract.assertFreshWorkerInvocation({ issuedAt, nonce: validNonce }, { nowMs, consumeNonce }),
    (error) => error.code === 'DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED' && error.status === 409
  );

  console.log('ORD-A07B worker invocation freshness tests passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
