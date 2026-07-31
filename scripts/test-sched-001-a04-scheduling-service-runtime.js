#!/usr/bin/env node
'use strict';

const assert = require('assert');
const contract = require('../backend/modules/scheduling/scheduling-contract');
const { createSchedulingService } = require('../backend/modules/scheduling/scheduling-service');
const { RUNTIME_ERROR_CODES } = require('../backend/modules/scheduling/scheduling-errors');
const { assertTimezoneResolution } = require('../backend/modules/scheduling/scheduling-timezone');
const { mapRepositoryError } = require('../backend/modules/scheduling/scheduling-repository-port');

function clone(value) {
  return structuredClone(value);
}

function createMemoryRepository(seed) {
  const state = {
    availabilityRules: new Map(),
    reservations: new Map(),
    orders: new Map(),
    idempotency: new Map(),
    events: new Map(),
    unavailableProfessionals: new Set(),
    failNextEvent: false,
    ...(seed || {})
  };

  function snapshot() {
    return {
      availabilityRules: clone(state.availabilityRules),
      reservations: clone(state.reservations),
      orders: clone(state.orders),
      idempotency: clone(state.idempotency),
      events: clone(state.events),
      unavailableProfessionals: clone(state.unavailableProfessionals),
      failNextEvent: state.failNextEvent
    };
  }

  function restore(before) {
    Object.assign(state, before);
  }

  function keyOf(record) {
    return `${record.commandName}:${record.principalKey}:${record.idempotencyKey}`;
  }

  const tx = {
    async claimIdempotency(record) {
      const key = keyOf(record);
      const existing = state.idempotency.get(key);
      if (existing) return clone(existing);
      state.idempotency.set(key, { ...clone(record), state: 'in_progress' });
      return { ...clone(record), state: 'claimed' };
    },
    async completeIdempotency(record) {
      const key = keyOf(record);
      const current = state.idempotency.get(key);
      assert(current, 'Idempotency claim must exist before completion.');
      state.idempotency.set(key, { ...current, ...clone(record), state: 'completed' });
      return clone(state.idempotency.get(key));
    },
    async getAvailabilityRule(id) {
      return clone(state.availabilityRules.get(id) || null);
    },
    async insertAvailabilityRule(row) {
      assert(!state.availabilityRules.has(row.id));
      state.availabilityRules.set(row.id, clone(row));
      return clone(row);
    },
    async updateAvailabilityRule(id, expectedVersion, patch) {
      const current = state.availabilityRules.get(id);
      assert(current);
      if (Number(current.version) !== Number(expectedVersion)) {
        const error = new Error('VERSION');
        error.code = '40001';
        throw error;
      }
      const next = { ...current, ...clone(patch) };
      state.availabilityRules.set(id, next);
      return clone(next);
    },
    async getOrder(id) {
      return clone(state.orders.get(id) || null);
    },
    async isRangeAvailable({ professionalId }) {
      return !state.unavailableProfessionals.has(professionalId);
    },
    async listActiveReservations(professionalId) {
      return Array.from(state.reservations.values())
        .filter((row) => row.professionalId === professionalId)
        .filter((row) => ['held', 'confirmed'].includes(row.status))
        .map(clone);
    },
    async insertReservation(row) {
      assert(!state.reservations.has(row.id));
      state.reservations.set(row.id, clone(row));
      return clone(row);
    },
    async getReservationForUpdate(id) {
      return clone(state.reservations.get(id) || null);
    },
    async updateReservation(id, expectedVersion, patch) {
      const current = state.reservations.get(id);
      assert(current);
      if (Number(current.version) !== Number(expectedVersion)) {
        const error = new Error('VERSION');
        error.code = '40001';
        throw error;
      }
      const next = { ...current, ...clone(patch) };
      state.reservations.set(id, next);
      return clone(next);
    },
    async insertEvent(event) {
      if (state.failNextEvent) {
        state.failNextEvent = false;
        throw new Error('synthetic event failure');
      }
      assert(!state.events.has(event.eventKey), `Duplicate event key ${event.eventKey}`);
      state.events.set(event.eventKey, clone(event));
      return clone(event);
    },
    async projectOrderSchedule(orderId, reservationId, scheduledAt) {
      const order = state.orders.get(orderId);
      assert(order);
      state.orders.set(orderId, { ...order, scheduleReservationId: reservationId, scheduledAt });
      return clone(state.orders.get(orderId));
    },
    async clearOrderSchedule(orderId, reservationId) {
      const order = state.orders.get(orderId);
      assert(order);
      if (!order.scheduleReservationId || order.scheduleReservationId === reservationId) {
        state.orders.set(orderId, { ...order, scheduleReservationId: null, scheduledAt: null });
      }
      return clone(state.orders.get(orderId));
    },
    async listExpiredHolds(cutoff, limit) {
      return Array.from(state.reservations.values())
        .filter((row) => row.status === 'held')
        .filter((row) => new Date(row.holdExpiresAt).getTime() <= new Date(cutoff).getTime())
        .sort((a, b) => new Date(a.holdExpiresAt) - new Date(b.holdExpiresAt))
        .slice(0, limit)
        .map(clone);
    }
  };

  return {
    state,
    async transaction(handler) {
      const before = snapshot();
      try {
        return await handler(tx);
      } catch (error) {
        restore(before);
        throw error;
      }
    }
  };
}

function order(id, clientId, professionalId, status = 'accepted') {
  return { id, clientId, professionalId, status, scheduleReservationId: null, scheduledAt: null };
}

function context(actor, idempotencyKey, payload) {
  return {
    actor,
    idempotencyKey,
    correlationId: `corr-${idempotencyKey}`,
    causationId: `cause-${idempotencyKey}`,
    payload
  };
}

const bahiaRange = (startHour, endHour) => ({
  startsAt: `2026-08-03T${String(startHour + 3).padStart(2, '0')}:00:00.000Z`,
  endsAt: `2026-08-03T${String(endHour + 3).padStart(2, '0')}:00:00.000Z`,
  timezone: 'America/Bahia',
  localStart: `2026-08-03T${String(startHour).padStart(2, '0')}:00:00`,
  localEnd: `2026-08-03T${String(endHour).padStart(2, '0')}:00:00`,
  resolvedOffsetMinutes: -180
});

(async () => {
  let clock = new Date('2026-08-03T11:50:00.000Z');
  let id = 0;
  const repository = createMemoryRepository();
  [
    order('order-1', 'client-1', 'pro-1'),
    order('order-2', 'client-2', 'pro-1'),
    order('order-3', 'client-3', 'pro-1'),
    order('order-4', 'client-4', 'pro-1'),
    order('order-5', 'client-5', 'pro-1'),
    order('order-ny-1', 'client-ny', 'pro-ny'),
    order('order-ny-2', 'client-ny', 'pro-ny'),
    order('order-fail', 'client-fail', 'pro-fail'),
    order('order-unavailable', 'client-unavailable', 'pro-unavailable'),
    order('order-terminal', 'client-terminal', 'pro-terminal', 'completed')
  ].forEach((row) => repository.state.orders.set(row.id, row));

  assert.throws(
    () => createSchedulingService({ repository, holdTtlSeconds: 299 }),
    (error) => error.code === RUNTIME_ERROR_CODES.invalidInput
  );

  const service = createSchedulingService({
    repository,
    now: () => new Date(clock),
    idFactory: () => `sched-id-${++id}`,
    holdTtlSeconds: 600
  });

  const owner = { id: 'pro-1', role: 'professional_owner' };
  const ruleInput = context(owner, 'rule-create-1', {
    professionalId: 'pro-1',
    timezone: 'America/Bahia',
    rule: { weekdays: [1, 2, 3, 4, 5], windows: [{ start: '09:00', end: '18:00' }] },
    status: 'active'
  });
  const createdRule = await service.upsertAvailabilityRule(ruleInput);
  assert.strictEqual(createdRule.availabilityRule.version, 1);
  assert.strictEqual(createdRule.event.aggregateType, 'availability_rule');
  assert.strictEqual(createdRule.event.orderId, null);
  assert.strictEqual(createdRule.event.eventKey, 'schedule:availability_rule:sched-id-1:v1');

  const replayedRule = await service.upsertAvailabilityRule(ruleInput);
  assert.deepStrictEqual(replayedRule, createdRule);
  assert.strictEqual(repository.state.events.size, 1);
  await assert.rejects(
    () => service.upsertAvailabilityRule(context(owner, 'rule-create-1', {
      ...ruleInput.payload,
      status: 'paused'
    })),
    (error) => error.code === contract.ERROR_CODES.idempotencyConflict
  );

  const updatedRule = await service.upsertAvailabilityRule(context(owner, 'rule-update-1', {
    ruleId: createdRule.availabilityRule.id,
    professionalId: 'pro-1',
    timezone: 'America/Bahia',
    rule: { weekdays: [1, 2, 3, 4, 5, 6], windows: [{ start: '09:00', end: '18:00' }] },
    status: 'active',
    expectedVersion: 1
  }));
  assert.strictEqual(updatedRule.availabilityRule.version, 2);
  assert.strictEqual(updatedRule.event.eventKey, 'schedule:availability_rule:sched-id-1:v2');

  await assert.rejects(
    () => service.createScheduleHold(context(
      { id: 'pro-1', role: 'professional_owner' },
      'hold-forbidden',
      { orderId: 'order-1', professionalId: 'pro-1', ...bahiaRange(9, 10) }
    )),
    (error) => error.code === contract.ERROR_CODES.actorForbidden
  );

  const hold1Input = context(
    { id: 'client-1', role: 'client_order_participant' },
    'hold-1',
    { orderId: 'order-1', professionalId: 'pro-1', ...bahiaRange(9, 10) }
  );
  const hold1 = await service.createScheduleHold(hold1Input);
  assert.strictEqual(hold1.reservation.status, 'held');
  assert.strictEqual(hold1.reservation.version, 1);
  assert.strictEqual(hold1.reservation.holdExpiresAt, '2026-08-03T12:00:00.000Z');
  assert.strictEqual(hold1.event.eventType, 'schedule.hold_created');
  assert.deepStrictEqual(await service.createScheduleHold(hold1Input), hold1);

  await assert.rejects(
    () => service.createScheduleHold(context(
      { id: 'client-2', role: 'client_order_participant' },
      'hold-overlap',
      {
        orderId: 'order-2', professionalId: 'pro-1',
        startsAt: '2026-08-03T12:30:00.000Z', endsAt: '2026-08-03T13:30:00.000Z',
        timezone: 'America/Bahia', localStart: '2026-08-03T09:30:00',
        localEnd: '2026-08-03T10:30:00', resolvedOffsetMinutes: -180
      }
    )),
    (error) => error.code === contract.ERROR_CODES.conflict
  );
  assert(!Array.from(repository.state.idempotency.keys()).some((key) => key.endsWith(':hold-overlap')));

  const hold2 = await service.createScheduleHold(context(
    { id: 'client-2', role: 'client_order_participant' },
    'hold-adjacent',
    { orderId: 'order-2', professionalId: 'pro-1', ...bahiaRange(10, 11) }
  ));
  assert.strictEqual(hold2.reservation.startsAt, hold1.reservation.endsAt);

  const confirmed = await service.confirmScheduleReservation(context(
    { role: 'order_service', principalKey: 'service:orders' },
    'confirm-1',
    { reservationId: hold1.reservation.id, expectedVersion: 1 }
  ));
  assert.strictEqual(confirmed.reservation.status, 'confirmed');
  assert.strictEqual(confirmed.reservation.version, 2);
  assert.strictEqual(repository.state.orders.get('order-1').scheduleReservationId, hold1.reservation.id);
  assert.strictEqual(repository.state.orders.get('order-1').scheduledAt, hold1.reservation.startsAt);
  assert.deepStrictEqual(await service.confirmScheduleReservation(context(
    { role: 'order_service', principalKey: 'service:orders' },
    'confirm-1',
    { reservationId: hold1.reservation.id, expectedVersion: 1 }
  )), confirmed);

  await assert.rejects(
    () => service.rescheduleReservation(context(
      { role: 'order_service', principalKey: 'service:orders' },
      'reschedule-stale',
      { reservationId: hold1.reservation.id, expectedVersion: 1, ...bahiaRange(11, 12) }
    )),
    (error) => error.code === contract.ERROR_CODES.versionConflict
  );

  const rescheduled = await service.rescheduleReservation(context(
    { role: 'order_service', principalKey: 'service:orders' },
    'reschedule-1',
    { reservationId: hold1.reservation.id, expectedVersion: 2, ...bahiaRange(11, 12) }
  ));
  assert.strictEqual(rescheduled.reservation.version, 3);
  assert.strictEqual(rescheduled.event.eventType, 'schedule.rescheduled');
  assert.strictEqual(repository.state.orders.get('order-1').scheduledAt, '2026-08-03T14:00:00.000Z');

  const cancelled = await service.cancelScheduleReservation(context(
    { role: 'order_service', principalKey: 'service:orders' },
    'cancel-2',
    { reservationId: hold2.reservation.id, expectedVersion: 1, reason: 'Cliente alterou o planejamento.' }
  ));
  assert.strictEqual(cancelled.reservation.status, 'cancelled');
  assert.strictEqual(cancelled.reservation.version, 2);

  const hold3 = await service.createScheduleHold(context(
    { id: 'client-3', role: 'client_order_participant' },
    'hold-expire',
    { orderId: 'order-3', professionalId: 'pro-1', ...bahiaRange(10, 11) }
  ));
  assert.strictEqual(hold3.reservation.status, 'held');
  clock = new Date('2026-08-03T12:01:00.000Z');
  const expired = await service.expireScheduleHolds(context(
    { role: 'schedule_worker', principalKey: 'worker:schedule-expiration' },
    'expire-batch-1',
    { cutoff: clock.toISOString(), limit: 20 }
  ));
  assert.strictEqual(expired.expiredCount, 1);
  assert.strictEqual(expired.reservations[0].status, 'expired');
  assert.strictEqual(expired.events[0].eventType, 'schedule.hold_expired');

  const hold4 = await service.createScheduleHold(context(
    { id: 'client-4', role: 'client_order_participant' },
    'hold-late-confirm',
    { orderId: 'order-4', professionalId: 'pro-1', ...bahiaRange(12, 13) }
  ));
  clock = new Date('2026-08-03T12:12:00.000Z');
  await assert.rejects(
    () => service.confirmScheduleReservation(context(
      { role: 'order_service', principalKey: 'service:orders' },
      'confirm-expired',
      { reservationId: hold4.reservation.id, expectedVersion: 1 }
    )),
    (error) => error.code === contract.ERROR_CODES.holdExpired
  );
  assert.strictEqual(repository.state.reservations.get(hold4.reservation.id).status, 'held');

  await assert.rejects(
    () => service.createScheduleHold(context(
      { id: 'client-5', role: 'client_order_participant' },
      'hold-bad-timezone',
      { orderId: 'order-5', professionalId: 'pro-1', ...bahiaRange(14, 15), timezone: 'Mars/Olympus' }
    )),
    (error) => error.code === RUNTIME_ERROR_CODES.timezoneInvalid
  );

  assert.throws(
    () => assertTimezoneResolution({
      startsAt: '2026-03-08T07:30:00.000Z', endsAt: '2026-03-08T08:30:00.000Z',
      timezone: 'America/New_York', localStart: '2026-03-08T02:30:00',
      localEnd: '2026-03-08T04:30:00', resolvedOffsetMinutes: -300
    }),
    (error) => error.code === RUNTIME_ERROR_CODES.timezoneResolutionMismatch
  );

  const ambiguousEarly = await service.createScheduleHold(context(
    { id: 'client-ny', role: 'client_order_participant' },
    'hold-ambiguous-early',
    {
      orderId: 'order-ny-1', professionalId: 'pro-ny',
      startsAt: '2026-11-01T05:30:00.000Z', endsAt: '2026-11-01T06:00:00.000Z',
      timezone: 'America/New_York', localStart: '2026-11-01T01:30:00',
      localEnd: '2026-11-01T01:00:00', resolvedOffsetMinutes: -240
    }
  ));
  assert.strictEqual(ambiguousEarly.reservation.resolvedOffsetMinutes, -240);

  const ambiguousLate = await service.createScheduleHold(context(
    { id: 'client-ny', role: 'client_order_participant' },
    'hold-ambiguous-late',
    {
      orderId: 'order-ny-2', professionalId: 'pro-ny',
      startsAt: '2026-11-01T06:30:00.000Z', endsAt: '2026-11-01T07:00:00.000Z',
      timezone: 'America/New_York', localStart: '2026-11-01T01:30:00',
      localEnd: '2026-11-01T02:00:00', resolvedOffsetMinutes: -300
    }
  ));
  assert.strictEqual(ambiguousLate.reservation.resolvedOffsetMinutes, -300);

  repository.state.failNextEvent = true;
  const reservationCountBeforeFailure = repository.state.reservations.size;
  await assert.rejects(
    () => service.createScheduleHold(context(
      { id: 'client-fail', role: 'client_order_participant' },
      'hold-event-failure',
      {
        orderId: 'order-fail', professionalId: 'pro-fail',
        startsAt: '2026-08-04T12:00:00.000Z', endsAt: '2026-08-04T13:00:00.000Z',
        timezone: 'America/Bahia', localStart: '2026-08-04T09:00:00',
        localEnd: '2026-08-04T10:00:00', resolvedOffsetMinutes: -180
      }
    )),
    /synthetic event failure/
  );
  assert.strictEqual(repository.state.reservations.size, reservationCountBeforeFailure);
  assert(!Array.from(repository.state.idempotency.keys()).some((key) => key.endsWith(':hold-event-failure')));

  repository.state.unavailableProfessionals.add('pro-unavailable');
  await assert.rejects(
    () => service.createScheduleHold(context(
      { id: 'client-unavailable', role: 'client_order_participant' },
      'hold-unavailable',
      {
        orderId: 'order-unavailable', professionalId: 'pro-unavailable',
        startsAt: '2026-08-04T12:00:00.000Z', endsAt: '2026-08-04T13:00:00.000Z',
        timezone: 'America/Bahia', localStart: '2026-08-04T09:00:00',
        localEnd: '2026-08-04T10:00:00', resolvedOffsetMinutes: -180
      }
    )),
    (error) => error.code === RUNTIME_ERROR_CODES.availabilityUnavailable
  );

  await assert.rejects(
    () => service.createScheduleHold(context(
      { id: 'client-terminal', role: 'client_order_participant' },
      'hold-terminal-order',
      {
        orderId: 'order-terminal', professionalId: 'pro-terminal',
        startsAt: '2026-08-04T12:00:00.000Z', endsAt: '2026-08-04T13:00:00.000Z',
        timezone: 'America/Bahia', localStart: '2026-08-04T09:00:00',
        localEnd: '2026-08-04T10:00:00', resolvedOffsetMinutes: -180
      }
    )),
    (error) => error.code === RUNTIME_ERROR_CODES.orderIneligible
  );

  const mappedConflict = mapRepositoryError({
    code: '23P01',
    message: 'schedule_reservations_no_active_overlap'
  });
  assert.strictEqual(mappedConflict.code, contract.ERROR_CODES.conflict);

  assert(Object.isFrozen(createdRule));
  assert(Object.isFrozen(createdRule.availabilityRule));
  assert.strictEqual(repository.state.events.size >= 10, true);

  console.log('SCHED-A04 server scheduling command runtime tests passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
