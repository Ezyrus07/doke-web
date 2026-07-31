#!/usr/bin/env node
'use strict';

const assert = require('assert');
const contract = require('../backend/modules/scheduling/scheduling-contract');

assert.deepStrictEqual(contract.RESERVATION_STATES, ['held', 'confirmed', 'cancelled', 'expired']);
assert.deepStrictEqual(contract.ACTIVE_OCCUPANCY_STATES, ['held', 'confirmed']);
assert.strictEqual(contract.RANGE_CONVENTION, '[start,end)');
assert.strictEqual(contract.HOLD_TTL_SECONDS, 600);

const validRange = contract.validateRange('2026-08-01T12:00:00.000Z', '2026-08-01T13:00:00.000Z');
assert.strictEqual(validRange.durationMs, 3_600_000);
assert.throws(
  () => contract.validateRange('2026-08-01T12:00:00.000Z', '2026-08-01T12:10:00.000Z'),
  (error) => error.code === 'DOKE_SCHEDULE_INVALID_RANGE'
);

assert.strictEqual(contract.rangesOverlap(
  { startsAt: '2026-08-01T12:00:00Z', endsAt: '2026-08-01T13:00:00Z' },
  { startsAt: '2026-08-01T12:30:00Z', endsAt: '2026-08-01T13:30:00Z' }
), true);
// Adjacent half-open ranges do not conflict.
assert.strictEqual(contract.rangesOverlap(
  { startsAt: '2026-08-01T12:00:00Z', endsAt: '2026-08-01T13:00:00Z' },
  { startsAt: '2026-08-01T13:00:00Z', endsAt: '2026-08-01T14:00:00Z' }
), false);

assert.strictEqual(contract.assertNoActiveConflict({
  id: 'candidate',
  professionalId: 'professional-1',
  startsAt: '2026-08-01T13:00:00Z',
  endsAt: '2026-08-01T14:00:00Z'
}, [{
  id: 'existing',
  professionalId: 'professional-1',
  status: 'confirmed',
  startsAt: '2026-08-01T12:00:00Z',
  endsAt: '2026-08-01T13:00:00Z'
}]), true);
assert.throws(() => contract.assertNoActiveConflict({
  professionalId: 'professional-1',
  startsAt: '2026-08-01T12:30:00Z',
  endsAt: '2026-08-01T13:30:00Z'
}, [{
  id: 'existing',
  professionalId: 'professional-1',
  status: 'held',
  startsAt: '2026-08-01T12:00:00Z',
  endsAt: '2026-08-01T13:00:00Z'
}]), (error) => error.code === 'DOKE_SCHEDULE_CONFLICT');

assert.deepStrictEqual(contract.assertTransition(
  'confirm_schedule_reservation',
  'held',
  'order_service'
), {
  command: 'confirm_schedule_reservation',
  previousState: 'held',
  nextState: 'confirmed',
  eventType: 'schedule.confirmed'
});
assert.deepStrictEqual(contract.assertTransition(
  'reschedule_reservation',
  'confirmed',
  'support'
), {
  command: 'reschedule_reservation',
  previousState: 'confirmed',
  nextState: 'confirmed',
  eventType: 'schedule.rescheduled'
});
assert.throws(
  () => contract.assertTransition('confirm_schedule_reservation', 'confirmed', 'order_service'),
  (error) => error.code === 'DOKE_SCHEDULE_INVALID_TRANSITION'
);
assert.throws(
  () => contract.assertTransition('confirm_schedule_reservation', 'held', 'professional_owner'),
  (error) => error.code === 'DOKE_SCHEDULE_ACTOR_FORBIDDEN'
);

assert.strictEqual(contract.assertExpectedVersion(3, 3), true);
assert.throws(
  () => contract.assertExpectedVersion(4, 3),
  (error) => error.code === 'DOKE_SCHEDULE_VERSION_CONFLICT'
);
assert.strictEqual(contract.assertIdempotencyReplay(null, { payloadFingerprint: 'abc' }), 'new');
assert.strictEqual(contract.assertIdempotencyReplay(
  { payloadFingerprint: 'abc' },
  { payloadFingerprint: 'abc' }
), 'replay');
assert.throws(
  () => contract.assertIdempotencyReplay({ payloadFingerprint: 'abc' }, { payloadFingerprint: 'xyz' }),
  (error) => error.code === 'DOKE_SCHEDULE_IDEMPOTENCY_CONFLICT'
);

assert.strictEqual(contract.buildEventKey('reservation-1', 2), 'schedule:reservation-1:v2');
assert.strictEqual(contract.isHoldExpired({
  status: 'held',
  holdExpiresAt: '2026-08-01T12:10:00Z'
}, '2026-08-01T12:10:00Z'), true);
assert.strictEqual(contract.isHoldExpired({
  status: 'confirmed',
  holdExpiresAt: '2026-08-01T12:10:00Z'
}, '2026-08-01T12:20:00Z'), false);

console.log('SCHED-A02 executable scheduling contract runtime tests passed.');
