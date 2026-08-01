'use strict';

const contract = require('./scheduling-contract');
const { RUNTIME_ERROR_CODES, runtimeError, contractError } = require('./scheduling-errors');
const { assertIanaTimezone, assertTimezoneResolution } = require('./scheduling-timezone');
const {
  normalizeAvailabilityRule,
  normalizeReservation,
  normalizeOrder,
  readRange,
  cloneJson,
  freezeResult
} = require('./scheduling-normalization');

const TERMINAL_ORDER_STATUSES = Object.freeze(['completed', 'cancelled', 'disputed']);

function createCommandHandlers(options) {
  const idFactory = options.idFactory;
  const holdTtlSeconds = options.holdTtlSeconds;

  async function upsertAvailabilityRule(tx, context, scope) {
    const payload = scope.normalizedPayload;
    assertProfessionalOwner(context.actor, payload.professionalId);
    assertIanaTimezone(payload.timezone);

    const existing = payload.ruleId ? await tx.getAvailabilityRule(payload.ruleId) : null;
    if (payload.ruleId && !existing) {
      throw runtimeError(RUNTIME_ERROR_CODES.notFound, 'Availability rule not found.', { ruleId: payload.ruleId }, 404);
    }

    let row;
    if (existing) {
      assertProfessionalOwner(context.actor, existing.professionalId || existing.professional_id);
      contract.assertExpectedVersion(existing.version, payload.expectedVersion);
      row = await tx.updateAvailabilityRule(existing.id, payload.expectedVersion, {
        timezone: payload.timezone,
        rule: cloneJson(payload.rule),
        status: payload.status,
        version: Number(existing.version) + 1,
        updatedAt: scope.occurredAt
      });
    } else {
      row = await tx.insertAvailabilityRule({
        id: idFactory(),
        professionalId: payload.professionalId,
        timezone: payload.timezone,
        rule: cloneJson(payload.rule),
        status: payload.status,
        version: 1,
        createdBy: context.actor.id || null,
        createdAt: scope.occurredAt,
        updatedAt: scope.occurredAt
      });
    }

    const normalized = normalizeAvailabilityRule(row);
    const event = buildEvent({
      aggregateType: 'availability_rule',
      aggregateId: normalized.id,
      professionalId: normalized.professionalId,
      sequenceNo: normalized.version,
      eventType: contract.COMMANDS.upsert_availability_rule.eventType,
      actor: context.actor,
      commandName: scope.commandName,
      payload: {
        previousVersion: existing ? Number(existing.version) : null,
        version: normalized.version,
        status: normalized.status,
        timezone: normalized.timezone,
        rule: cloneJson(normalized.rule)
      },
      context,
      occurredAt: scope.occurredAt
    });
    await tx.insertEvent(event);
    return freezeResult({
      command: scope.commandName,
      aggregateType: 'availability_rule',
      aggregateId: normalized.id,
      replayed: false,
      availabilityRule: normalized,
      event
    });
  }

  async function createScheduleHold(tx, context, scope) {
    const payload = scope.normalizedPayload;
    const order = await requireOrder(tx, payload.orderId);
    assertOrderEligible(order);
    assertClientOrderParticipant(context.actor, order);
    assertMatchingProfessional(order, payload.professionalId);

    const resolved = assertTimezoneResolution(payload);
    await assertCanonicalAvailability(tx, payload.professionalId, resolved);
    await assertNoStoredConflict(tx, {
      professionalId: payload.professionalId,
      startsAt: resolved.startsAt,
      endsAt: resolved.endsAt
    });

    const holdExpiresAt = new Date(new Date(scope.occurredAt).getTime() + holdTtlSeconds * 1000).toISOString();
    const row = await tx.insertReservation({
      id: idFactory(),
      professionalId: payload.professionalId,
      orderId: payload.orderId,
      startsAt: resolved.startsAt,
      endsAt: resolved.endsAt,
      timezone: resolved.timezone,
      localStart: resolved.localStart,
      localEnd: resolved.localEnd,
      resolvedOffsetMinutes: resolved.resolvedOffsetMinutes,
      status: 'held',
      holdExpiresAt,
      version: 1,
      idempotencyKey: context.idempotencyKey,
      createdBy: context.actor.id || null,
      createdAt: scope.occurredAt,
      updatedAt: scope.occurredAt
    });
    const reservation = normalizeReservation(row);
    const event = buildReservationEvent({
      reservation,
      eventType: contract.COMMANDS.create_schedule_hold.eventType,
      commandName: scope.commandName,
      actor: context.actor,
      context,
      occurredAt: scope.occurredAt,
      previousStatus: null,
      previousRange: null
    });
    await tx.insertEvent(event);
    return freezeResult({
      command: scope.commandName,
      aggregateType: 'reservation',
      aggregateId: reservation.id,
      replayed: false,
      reservation,
      event
    });
  }

  async function confirmScheduleReservation(tx, context, scope) {
    const payload = scope.normalizedPayload;
    const reservation = await requireReservation(tx, payload.reservationId);
    const order = await requireOrder(tx, reservation.orderId);
    assertOrderEligible(order);
    assertOrderSchedulable(order);
    assertMatchingProfessional(order, reservation.professionalId);
    contract.assertTransition(scope.commandName, reservation.status, context.actor.role);
    contract.assertExpectedVersion(reservation.version, payload.expectedVersion);
    if (contract.isHoldExpired(reservation, scope.occurredAt)) {
      throw contractError(contract.ERROR_CODES.holdExpired, 'The schedule hold expired before confirmation.', {
        reservationId: reservation.id,
        holdExpiresAt: reservation.holdExpiresAt
      });
    }

    const updated = normalizeReservation(await tx.updateReservation(
      reservation.id,
      payload.expectedVersion,
      {
        status: 'confirmed',
        holdExpiresAt: null,
        version: reservation.version + 1,
        updatedAt: scope.occurredAt
      }
    ));
    await tx.projectOrderSchedule(order.id, updated.id, updated.startsAt);
    const event = buildReservationEvent({
      reservation: updated,
      eventType: contract.COMMANDS.confirm_schedule_reservation.eventType,
      commandName: scope.commandName,
      actor: context.actor,
      context,
      occurredAt: scope.occurredAt,
      previousStatus: reservation.status,
      previousRange: readRange(reservation)
    });
    await tx.insertEvent(event);
    return freezeResult({
      command: scope.commandName,
      aggregateType: 'reservation',
      aggregateId: updated.id,
      replayed: false,
      reservation: updated,
      orderProjection: Object.freeze({
        orderId: order.id,
        scheduleReservationId: updated.id,
        scheduledAt: updated.startsAt,
        orderStatus: 'scheduled'
      }),
      event
    });
  }

  async function rescheduleReservation(tx, context, scope) {
    const payload = scope.normalizedPayload;
    const reservation = await requireReservation(tx, payload.reservationId);
    const order = await requireOrder(tx, reservation.orderId);
    assertOrderEligible(order);
    assertOrderSchedulable(order);
    contract.assertTransition(scope.commandName, reservation.status, context.actor.role);
    contract.assertExpectedVersion(reservation.version, payload.expectedVersion);

    const resolved = assertTimezoneResolution(payload);
    await assertCanonicalAvailability(tx, reservation.professionalId, resolved);
    await assertNoStoredConflict(tx, {
      id: reservation.id,
      professionalId: reservation.professionalId,
      startsAt: resolved.startsAt,
      endsAt: resolved.endsAt
    });

    const updated = normalizeReservation(await tx.updateReservation(
      reservation.id,
      payload.expectedVersion,
      {
        startsAt: resolved.startsAt,
        endsAt: resolved.endsAt,
        timezone: resolved.timezone,
        localStart: resolved.localStart,
        localEnd: resolved.localEnd,
        resolvedOffsetMinutes: resolved.resolvedOffsetMinutes,
        status: 'confirmed',
        version: reservation.version + 1,
        updatedAt: scope.occurredAt
      }
    ));
    await tx.projectOrderSchedule(order.id, updated.id, updated.startsAt);
    const event = buildReservationEvent({
      reservation: updated,
      eventType: contract.COMMANDS.reschedule_reservation.eventType,
      commandName: scope.commandName,
      actor: context.actor,
      context,
      occurredAt: scope.occurredAt,
      previousStatus: reservation.status,
      previousRange: readRange(reservation)
    });
    await tx.insertEvent(event);
    return freezeResult({
      command: scope.commandName,
      aggregateType: 'reservation',
      aggregateId: updated.id,
      replayed: false,
      reservation: updated,
      orderProjection: Object.freeze({
        orderId: order.id,
        scheduleReservationId: updated.id,
        scheduledAt: updated.startsAt,
        orderStatus: 'scheduled'
      }),
      event
    });
  }

  async function cancelScheduleReservation(tx, context, scope) {
    const payload = scope.normalizedPayload;
    const reservation = await requireReservation(tx, payload.reservationId);
    const order = await requireOrder(tx, reservation.orderId);
    contract.assertTransition(scope.commandName, reservation.status, context.actor.role);
    contract.assertExpectedVersion(reservation.version, payload.expectedVersion);

    const updated = normalizeReservation(await tx.updateReservation(
      reservation.id,
      payload.expectedVersion,
      {
        status: 'cancelled',
        holdExpiresAt: null,
        version: reservation.version + 1,
        updatedAt: scope.occurredAt
      }
    ));
    await tx.clearOrderSchedule(order.id, updated.id);
    const event = buildReservationEvent({
      reservation: updated,
      eventType: contract.COMMANDS.cancel_schedule_reservation.eventType,
      commandName: scope.commandName,
      actor: context.actor,
      context,
      occurredAt: scope.occurredAt,
      previousStatus: reservation.status,
      previousRange: readRange(reservation),
      extraPayload: { reason: payload.reason }
    });
    await tx.insertEvent(event);
    return freezeResult({
      command: scope.commandName,
      aggregateType: 'reservation',
      aggregateId: updated.id,
      replayed: false,
      reservation: updated,
      orderProjection: Object.freeze({
        orderId: order.id,
        scheduleReservationId: null,
        scheduledAt: null,
        orderStatus: 'accepted'
      }),
      event
    });
  }

  async function expireScheduleHolds(tx, context, scope) {
    const payload = scope.normalizedPayload;
    const cutoff = payload.cutoff || scope.occurredAt;
    const candidates = await tx.listExpiredHolds(cutoff, payload.limit);
    const expired = [];
    const events = [];

    for (const raw of Array.isArray(candidates) ? candidates : []) {
      const reservation = normalizeReservation(raw);
      if (!contract.isHoldExpired(reservation, cutoff)) continue;
      contract.assertTransition(scope.commandName, reservation.status, context.actor.role);
      const updated = normalizeReservation(await tx.updateReservation(
        reservation.id,
        reservation.version,
        {
          status: 'expired',
          holdExpiresAt: reservation.holdExpiresAt,
          version: reservation.version + 1,
          updatedAt: scope.occurredAt
        }
      ));
      const event = buildReservationEvent({
        reservation: updated,
        eventType: contract.COMMANDS.expire_schedule_holds.eventType,
        commandName: scope.commandName,
        actor: context.actor,
        context,
        occurredAt: scope.occurredAt,
        previousStatus: reservation.status,
        previousRange: readRange(reservation)
      });
      await tx.insertEvent(event);
      expired.push(updated);
      events.push(event);
    }

    return freezeResult({
      command: scope.commandName,
      aggregateType: null,
      aggregateId: null,
      replayed: false,
      cutoff,
      expiredCount: expired.length,
      reservations: expired,
      events
    });
  }

  return Object.freeze({
    upsert_availability_rule: upsertAvailabilityRule,
    create_schedule_hold: createScheduleHold,
    confirm_schedule_reservation: confirmScheduleReservation,
    reschedule_reservation: rescheduleReservation,
    cancel_schedule_reservation: cancelScheduleReservation,
    expire_schedule_holds: expireScheduleHolds
  });
}

async function assertCanonicalAvailability(tx, professionalId, resolvedRange) {
  const available = await tx.isRangeAvailable({
    professionalId,
    startsAt: resolvedRange.startsAt,
    endsAt: resolvedRange.endsAt,
    timezone: resolvedRange.timezone,
    localStart: resolvedRange.localStart,
    localEnd: resolvedRange.localEnd
  });
  if (!available) {
    throw runtimeError(
      RUNTIME_ERROR_CODES.availabilityUnavailable,
      'The selected range is outside canonical professional availability.',
      { professionalId, startsAt: resolvedRange.startsAt, endsAt: resolvedRange.endsAt },
      409
    );
  }
}

async function assertNoStoredConflict(tx, candidate) {
  const existing = await tx.listActiveReservations(candidate.professionalId, {
    startsAt: candidate.startsAt,
    endsAt: candidate.endsAt,
    excludeReservationId: candidate.id || null
  });
  contract.assertNoActiveConflict(candidate, existing);
}

async function requireOrder(tx, orderId) {
  const order = normalizeOrder(await tx.getOrder(orderId));
  if (!order || !order.id) {
    throw runtimeError(RUNTIME_ERROR_CODES.notFound, 'Order not found.', { orderId }, 404);
  }
  return order;
}

async function requireReservation(tx, reservationId) {
  const reservation = normalizeReservation(await tx.getReservationForUpdate(reservationId));
  if (!reservation || !reservation.id) {
    throw runtimeError(RUNTIME_ERROR_CODES.notFound, 'Schedule reservation not found.', { reservationId }, 404);
  }
  return reservation;
}

function assertOrderEligible(order) {
  if (TERMINAL_ORDER_STATUSES.includes(String(order.status || '').toLowerCase())) {
    throw runtimeError(
      RUNTIME_ERROR_CODES.orderIneligible,
      'The order is not eligible for scheduling.',
      { orderId: order.id, orderStatus: order.status },
      409
    );
  }
  return true;
}

function assertOrderSchedulable(order) {
  const status = String(order && order.status || '').toLowerCase();
  if (!['accepted', 'scheduled'].includes(status)) {
    throw runtimeError(
      RUNTIME_ERROR_CODES.orderIneligible,
      'The order must be accepted before a schedule reservation can project it as scheduled.',
      { orderId: order && order.id || null, orderStatus: status || null },
      409
    );
  }
  return true;
}

function assertClientOrderParticipant(actor, order) {
  if (actor.role === 'support' || actor.role === 'admin') return true;
  if (actor.role !== 'client_order_participant' || !actor.id || String(actor.id) !== String(order.clientId)) {
    throw contractError(contract.ERROR_CODES.actorForbidden, 'Only the canonical client participant may create this hold.');
  }
  return true;
}

function assertProfessionalOwner(actor, professionalId) {
  if (actor.role === 'support' || actor.role === 'admin') return true;
  if (actor.role !== 'professional_owner' || !actor.id || String(actor.id) !== String(professionalId)) {
    throw contractError(contract.ERROR_CODES.actorForbidden, 'Only the professional owner may mutate this availability rule.');
  }
  return true;
}

function assertMatchingProfessional(order, professionalId) {
  if (String(order.professionalId) !== String(professionalId)) {
    throw runtimeError(
      RUNTIME_ERROR_CODES.orderIneligible,
      'The scheduling professional does not match the canonical order.',
      { orderProfessionalId: order.professionalId, schedulingProfessionalId: professionalId },
      409
    );
  }
}

function buildReservationEvent(options) {
  const reservation = options.reservation;
  return buildEvent({
    aggregateType: 'reservation',
    aggregateId: reservation.id,
    reservationId: reservation.id,
    orderId: reservation.orderId,
    professionalId: reservation.professionalId,
    sequenceNo: reservation.version,
    eventType: options.eventType,
    actor: options.actor,
    commandName: options.commandName,
    payload: {
      previousStatus: options.previousStatus,
      status: reservation.status,
      previousRange: options.previousRange,
      range: readRange(reservation),
      timezone: reservation.timezone,
      localStart: reservation.localStart,
      localEnd: reservation.localEnd,
      resolvedOffsetMinutes: reservation.resolvedOffsetMinutes,
      holdExpiresAt: reservation.holdExpiresAt,
      version: reservation.version,
      ...(options.extraPayload || {})
    },
    context: options.context,
    occurredAt: options.occurredAt
  });
}

function buildEvent(options) {
  return Object.freeze({
    id: null,
    eventKey: contract.buildEventKey(options.aggregateType, options.aggregateId, options.sequenceNo),
    aggregateType: options.aggregateType,
    aggregateId: options.aggregateId,
    availabilityRuleId: options.aggregateType === 'availability_rule' ? options.aggregateId : null,
    reservationId: options.aggregateType === 'reservation' ? options.aggregateId : null,
    orderId: options.orderId || null,
    professionalId: options.professionalId,
    sequenceNo: options.sequenceNo,
    eventType: options.eventType,
    actorId: options.actor.id || null,
    actorRole: options.actor.role,
    command: options.commandName,
    payload: cloneJson(options.payload) || {},
    correlationId: options.context.correlationId,
    causationId: options.context.causationId,
    occurredAt: options.occurredAt
  });
}

module.exports = Object.freeze({
  TERMINAL_ORDER_STATUSES,
  createCommandHandlers,
  buildEvent,
  buildReservationEvent
});
