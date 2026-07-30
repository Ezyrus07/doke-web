#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { MAX_REQUEST_AGE_MS, MAX_FUTURE_SKEW_MS, assertRequestFreshness } = require('../backend/shared/security/request-freshness-contract');
const { findRouteByName } = require('../backend/shared/http/route-registry');
const { isIdempotencyEntryExpired } = require('../backend/shared/security/persistent-idempotency-store');

const now = '2026-07-30T12:00:00.000Z';
const nonce = 'ord-0123456789abcdef0123456789abcdef';
const valid = assertRequestFreshness({ now, headers: { 'x-doke-request-issued-at': '2026-07-30T11:59:00.000Z', 'x-doke-request-nonce': nonce } });
assert.strictEqual(valid.ageMs, 60000);
assert.strictEqual(valid.nonceSha256.length, 64);
assertError({}, 'DOKE_REQUEST_FRESHNESS_REQUIRED');
assertError({ now, headers: { 'x-doke-request-issued-at': new Date(Date.parse(now) - MAX_REQUEST_AGE_MS - 1).toISOString(), 'x-doke-request-nonce': nonce } }, 'DOKE_REQUEST_EXPIRED');
assertError({ now, headers: { 'x-doke-request-issued-at': new Date(Date.parse(now) + MAX_FUTURE_SKEW_MS + 1).toISOString(), 'x-doke-request-nonce': nonce } }, 'DOKE_REQUEST_FROM_FUTURE');
assertError({ now, headers: { 'x-doke-request-issued-at': now, 'x-doke-request-nonce': 'weak' } }, 'DOKE_REQUEST_NONCE_INVALID');
for (const name of ['orders.create', 'orders.accept', 'orders.decline', 'orders.quote', 'orders.charge', 'orders.start', 'orders.complete', 'orders.updateStatus']) {
  assert.strictEqual(findRouteByName(name).requestFreshnessRequired, true, `${name} must require freshness.`);
}
assert.strictEqual(findRouteByName('orders.list').requestFreshnessRequired, false);
assert.strictEqual(findRouteByName('orders.get').requestFreshnessRequired, false);
assert.strictEqual(isIdempotencyEntryExpired({ expires_at: '2026-07-30T11:59:59.999Z' }, { now }), true);
assert.strictEqual(isIdempotencyEntryExpired({ expires_at: '2026-07-30T12:00:00.001Z' }, { now }), false);
assert.strictEqual(isIdempotencyEntryExpired({ expires_at: null }, { now }), false);
console.log('ORD-A07 request freshness runtime test passed.');
function assertError(context, code) {
  assert.throws(() => assertRequestFreshness(context), (error) => error && error.code === code);
}
