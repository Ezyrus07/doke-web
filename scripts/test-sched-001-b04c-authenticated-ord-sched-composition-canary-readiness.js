#!/usr/bin/env node
'use strict';

const assert = require('assert');
const config = require('../config/sched-001-b04c-authenticated-ord-sched-composition-canary-readiness.json');

function projectConfirmedReservation(order, reservation) {
  if (!order || !order.id) throw new Error('ORDER_REQUIRED');
  if (!reservation || !reservation.id) throw new Error('RESERVATION_REQUIRED');
  if (String(reservation.orderId || '') !== String(order.id)) throw new Error('RESERVATION_ORDER_MISMATCH');
  if (String(reservation.status || '').toLowerCase() !== 'confirmed') throw new Error('CONFIRMED_RESERVATION_REQUIRED');
  const startsAt = new Date(reservation.startsAt || '');
  if (!Number.isFinite(startsAt.getTime())) throw new Error('RESERVATION_START_INVALID');
  if (!['accepted', 'scheduled'].includes(String(order.status || '').toLowerCase())) throw new Error('ORDER_NOT_SCHEDULABLE');
  if (order.scheduleReservationId && String(order.scheduleReservationId) !== String(reservation.id)) {
    throw new Error('DIFFERENT_RESERVATION_REPLACEMENT_FORBIDDEN');
  }
  return Object.freeze({
    ...order,
    status: 'scheduled',
    scheduleReservationId: reservation.id,
    scheduledAt: startsAt.toISOString(),
    scheduleAuthority: 'confirmed_reservation',
    hasCanonicalSchedule: true
  });
}

function clearCancelledReservation(order, reservation) {
  if (!order || !reservation) throw new Error('ORDER_AND_RESERVATION_REQUIRED');
  if (String(order.scheduleReservationId || '') !== String(reservation.id || '')) {
    throw new Error('RESERVATION_PROJECTION_MISMATCH');
  }
  return Object.freeze({
    ...order,
    status: order.status === 'scheduled' ? 'accepted' : order.status,
    scheduleReservationId: null,
    scheduledAt: null,
    scheduleAuthority: 'none',
    hasCanonicalSchedule: false
  });
}

function assertStartAuthority(order, reservation) {
  if (!order.scheduleReservationId) return true;
  if (!reservation || String(reservation.id) !== String(order.scheduleReservationId)) throw new Error('START_RESERVATION_MISSING');
  if (String(reservation.status).toLowerCase() !== 'confirmed') throw new Error('START_RESERVATION_NOT_CONFIRMED');
  if (String(reservation.orderId) !== String(order.id)) throw new Error('START_RESERVATION_ORDER_MISMATCH');
  if (new Date(reservation.startsAt).toISOString() !== new Date(order.scheduledAt).toISOString()) {
    throw new Error('START_RESERVATION_TIME_MISMATCH');
  }
  return true;
}

function assertGenericStatusTransition(nextStatus) {
  if (String(nextStatus || '').toLowerCase() === 'scheduled') throw new Error('DOKE_ORDER_SCHEDULE_AUTHORITY_REQUIRED');
  return true;
}

const order = Object.freeze({
  id: 'order-canary-1',
  status: 'accepted',
  scheduleReservationId: null,
  scheduledAt: null,
  scheduleAuthority: 'none',
  hasCanonicalSchedule: false
});
const confirmed = Object.freeze({
  id: 'reservation-canary-1',
  orderId: order.id,
  status: 'confirmed',
  startsAt: '2026-08-04T12:00:00.000Z'
});

const projected = projectConfirmedReservation(order, confirmed);
assert.strictEqual(projected.status, 'scheduled');
assert.strictEqual(projected.scheduleReservationId, confirmed.id);
assert.strictEqual(projected.scheduledAt, confirmed.startsAt);
assert.strictEqual(projected.hasCanonicalSchedule, true);

const rescheduled = projectConfirmedReservation(projected, {
  ...confirmed,
  startsAt: '2026-08-04T14:00:00.000Z'
});
assert.strictEqual(rescheduled.scheduleReservationId, confirmed.id);
assert.strictEqual(rescheduled.scheduledAt, '2026-08-04T14:00:00.000Z');

assert.throws(() => projectConfirmedReservation(order, { ...confirmed, status: 'held' }), /CONFIRMED_RESERVATION_REQUIRED/);
assert.throws(() => projectConfirmedReservation(projected, { ...confirmed, id: 'reservation-canary-2' }), /DIFFERENT_RESERVATION_REPLACEMENT_FORBIDDEN/);
assert.throws(() => assertGenericStatusTransition('scheduled'), /DOKE_ORDER_SCHEDULE_AUTHORITY_REQUIRED/);

assert.strictEqual(assertStartAuthority(projected, confirmed), true);
assert.throws(() => assertStartAuthority(projected, null), /START_RESERVATION_MISSING/);
assert.throws(() => assertStartAuthority(projected, { ...confirmed, status: 'cancelled' }), /START_RESERVATION_NOT_CONFIRMED/);
assert.throws(() => assertStartAuthority(projected, { ...confirmed, startsAt: '2026-08-04T13:00:00.000Z' }), /START_RESERVATION_TIME_MISMATCH/);

const cleared = clearCancelledReservation(projected, confirmed);
assert.deepStrictEqual({
  status: cleared.status,
  scheduleReservationId: cleared.scheduleReservationId,
  scheduledAt: cleared.scheduledAt,
  hasCanonicalSchedule: cleared.hasCanonicalSchedule
}, {
  status: 'accepted',
  scheduleReservationId: null,
  scheduledAt: null,
  hasCanonicalSchedule: false
});

assert.strictEqual(config.authorization.genericNextAllowed, false);
assert.strictEqual(config.transaction.isolation, 'SERIALIZABLE');
assert.strictEqual(config.transaction.outerBoundary, 'single_postgresql_transaction');
assert.strictEqual(config.transaction.commandBoundary, 'savepoint_per_cross_domain_command');
assert.strictEqual(config.transaction.finalStatement, 'ROLLBACK');
assert.strictEqual(config.transaction.commitForbidden, true);
assert.strictEqual(config.syntheticFixture.transactionScopedOnly, true);
assert.strictEqual(config.syntheticFixture.realUserDataAllowed, false);
assert.strictEqual(config.syntheticFixture.persistentRowsAllowed, 0);
assert.deepStrictEqual(config.personas.map((persona) => persona.name), ['client', 'professional', 'support', 'admin']);
assert.strictEqual(new Set(config.residueTables).size, config.residueTables.length);
assert(config.residueTables.includes('public.orders'));
assert(config.residueTables.includes('public.schedule_reservations'));
assert(config.residueTables.includes('private.schedule_command_idempotency'));
assert(config.prohibitedActions.includes('production_access'));
assert(config.prohibitedActions.includes('persistent_canary_data'));
assert(config.prohibitedActions.includes('merge'));

console.log('SCHED-B04C authenticated ORD/SCHED composition canary readiness tests passed.');
