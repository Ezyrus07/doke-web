#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('config/sched-001-b04-ord-canonical-wiring-readiness.json', 'utf8'));

function resolveCanonicalSchedule(order, reservation) {
  if (!order || !order.id) throw new Error('ORDER_REQUIRED');
  if (!reservation) {
    return Object.freeze({
      scheduleReservationId: null,
      scheduledAt: null,
      canonical: false,
      reason: 'reservation_missing'
    });
  }
  if (String(reservation.orderId || reservation.order_id || '') !== String(order.id)) {
    throw new Error('RESERVATION_ORDER_MISMATCH');
  }
  if (String(reservation.status || '').toLowerCase() !== 'confirmed') {
    return Object.freeze({
      scheduleReservationId: reservation.id || null,
      scheduledAt: null,
      canonical: false,
      reason: 'reservation_not_confirmed'
    });
  }
  const startsAt = reservation.startsAt || reservation.starts_at;
  if (!startsAt || !Number.isFinite(new Date(startsAt).getTime())) {
    throw new Error('RESERVATION_START_INVALID');
  }
  return Object.freeze({
    scheduleReservationId: reservation.id,
    scheduledAt: new Date(startsAt).toISOString(),
    canonical: true,
    reason: 'confirmed_reservation'
  });
}

function mayTransitionOrderToScheduled(order, reservation) {
  const current = String(order && order.status || '').toLowerCase();
  if (!['accepted', 'scheduled'].includes(current)) return false;
  return resolveCanonicalSchedule(order, reservation).canonical;
}

function buildCrossDomainEnvelope(command, input) {
  const correlationId = String(input && input.correlationId || '').trim();
  const orderId = String(input && input.orderId || '').trim();
  const idempotencyKey = String(input && input.idempotencyKey || '').trim();
  if (!correlationId || !orderId || !idempotencyKey) throw new Error('ENVELOPE_INCOMPLETE');
  return Object.freeze({ command, correlationId, orderId, idempotencyKey });
}

const order = { id: 'order-1', status: 'accepted', scheduledAt: '2026-08-01T12:00:00.000Z' };
const confirmed = {
  id: 'reservation-1',
  orderId: 'order-1',
  status: 'confirmed',
  startsAt: '2026-08-02T15:00:00.000Z'
};
const held = { ...confirmed, id: 'reservation-2', status: 'held' };

assert.deepStrictEqual(resolveCanonicalSchedule(order, null), {
  scheduleReservationId: null,
  scheduledAt: null,
  canonical: false,
  reason: 'reservation_missing'
});
assert.strictEqual(resolveCanonicalSchedule(order, held).canonical, false);
assert.strictEqual(resolveCanonicalSchedule(order, held).scheduledAt, null);
assert.deepStrictEqual(resolveCanonicalSchedule(order, confirmed), {
  scheduleReservationId: 'reservation-1',
  scheduledAt: '2026-08-02T15:00:00.000Z',
  canonical: true,
  reason: 'confirmed_reservation'
});
assert.throws(
  () => resolveCanonicalSchedule(order, { ...confirmed, orderId: 'order-2' }),
  /RESERVATION_ORDER_MISMATCH/
);
assert.throws(
  () => resolveCanonicalSchedule(order, { ...confirmed, startsAt: 'not-a-date' }),
  /RESERVATION_START_INVALID/
);
assert.strictEqual(mayTransitionOrderToScheduled(order, confirmed), true);
assert.strictEqual(mayTransitionOrderToScheduled(order, held), false);
assert.strictEqual(mayTransitionOrderToScheduled({ ...order, status: 'completed' }, confirmed), false);

assert.deepStrictEqual(
  buildCrossDomainEnvelope('confirm_schedule_reservation', {
    correlationId: 'corr-1',
    orderId: 'order-1',
    idempotencyKey: 'schedule-confirm-1'
  }),
  {
    command: 'confirm_schedule_reservation',
    correlationId: 'corr-1',
    orderId: 'order-1',
    idempotencyKey: 'schedule-confirm-1'
  }
);
assert.throws(() => buildCrossDomainEnvelope('confirm_schedule_reservation', {}), /ENVELOPE_INCOMPLETE/);

assert.strictEqual(config.authority.rawScheduledAtIsAuthority, false);
assert.strictEqual(config.requiredCommandFlow.createHold.projectsOrderOnlyAfterCanonicalMutation, true);
assert.strictEqual(config.requiredCommandFlow.confirmReservation.reservationStatusRequired, 'confirmed');
assert.strictEqual(config.requiredCommandFlow.rescheduleReservation.sameReservationIdRequired, true);
assert.strictEqual(config.requiredCommandFlow.cancelReservation.clearReservationReference, true);
assert.strictEqual(config.requiredCommandFlow.cancelReservation.clearScheduledAtProjection, true);
assert.strictEqual(config.requiredCommandFlow.startOrder.rawScheduledAtCheckForbidden, true);
assert.strictEqual(config.statePolicy.orderCancellationMustCancelActiveReservationInSameComposition, true);
assert.strictEqual(config.statePolicy.terminalOrderMayNotRetainActiveReservation, true);
assert.strictEqual(config.idempotency.correlationIdRequiredAcrossDomains, true);
assert.strictEqual(config.idempotency.partialProjectionMustFailClosed, true);
assert.strictEqual(config.transactionBoundary.compensatingFrontendWriteForbidden, true);

console.log('SCHED-B04 ORD canonical wiring readiness tests passed.');
