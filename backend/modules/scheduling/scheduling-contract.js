'use strict';

const RESERVATION_STATES = Object.freeze(['held', 'confirmed', 'cancelled', 'expired']);
const ACTIVE_OCCUPANCY_STATES = Object.freeze(['held', 'confirmed']);
const TERMINAL_STATES = Object.freeze(['cancelled', 'expired']);
const EVENT_AGGREGATE_TYPES = Object.freeze(['availability_rule', 'reservation']);
const RANGE_CONVENTION = '[start,end)';
const HOLD_TTL_SECONDS = 600;

const COMMANDS = Object.freeze({
  upsert_availability_rule: Object.freeze({
    actors: Object.freeze(['professional_owner', 'support', 'admin']),
    aggregateType: 'availability_rule',
    eventType: 'schedule.availability_rule_upserted'
  }),
  create_schedule_hold: Object.freeze({
    actors: Object.freeze(['client_order_participant', 'support', 'admin']),
    aggregateType: 'reservation',
    to: 'held',
    eventType: 'schedule.hold_created'
  }),
  confirm_schedule_reservation: Object.freeze({
    actors: Object.freeze(['order_service', 'support', 'admin']),
    aggregateType: 'reservation',
    from: Object.freeze(['held']),
    to: 'confirmed',
    eventType: 'schedule.confirmed'
  }),
  reschedule_reservation: Object.freeze({
    actors: Object.freeze(['order_service', 'support', 'admin']),
    aggregateType: 'reservation',
    from: Object.freeze(['confirmed']),
    to: 'confirmed',
    eventType: 'schedule.rescheduled'
  }),
  cancel_schedule_reservation: Object.freeze({
    actors: Object.freeze(['order_service', 'support', 'admin']),
    aggregateType: 'reservation',
    from: Object.freeze(['held', 'confirmed']),
    to: 'cancelled',
    eventType: 'schedule.cancelled'
  }),
  expire_schedule_holds: Object.freeze({
    actors: Object.freeze(['schedule_worker', 'service_role']),
    aggregateType: 'reservation',
    from: Object.freeze(['held']),
    to: 'expired',
    eventType: 'schedule.hold_expired'
  })
});

const ERROR_CODES = Object.freeze({
  actorForbidden: 'DOKE_SCHEDULE_ACTOR_FORBIDDEN',
  invalidRange: 'DOKE_SCHEDULE_INVALID_RANGE',
  conflict: 'DOKE_SCHEDULE_CONFLICT',
  versionConflict: 'DOKE_SCHEDULE_VERSION_CONFLICT',
  idempotencyConflict: 'DOKE_SCHEDULE_IDEMPOTENCY_CONFLICT',
  invalidTransition: 'DOKE_SCHEDULE_INVALID_TRANSITION',
  invalidEventAggregate: 'DOKE_SCHEDULE_EVENT_AGGREGATE_INVALID',
  holdExpired: 'DOKE_SCHEDULE_HOLD_EXPIRED'
});

function contractError(code, message, details) {
  const error = new Error(message || code);
  error.code = code;
  if (details && typeof details === 'object') error.details = Object.freeze({ ...details });
  return error;
}

function normalizeState(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeActor(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeAggregateType(value) {
  return String(value || '').trim().toLowerCase();
}

function readInstant(value, fieldName) {
  const instant = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(instant.getTime())) {
    throw contractError(ERROR_CODES.invalidRange, `${fieldName || 'instant'} must be a valid ISO instant.`);
  }
  return instant;
}

function validateRange(startsAt, endsAt, options) {
  const start = readInstant(startsAt, 'startsAt');
  const end = readInstant(endsAt, 'endsAt');
  const durationMs = end.getTime() - start.getTime();
  const minimumMinutes = Number(options && options.minimumMinutes || 15);
  const maximumDays = Number(options && options.maximumDays || 30);
  if (durationMs <= 0 || durationMs < minimumMinutes * 60_000 || durationMs > maximumDays * 86_400_000) {
    throw contractError(ERROR_CODES.invalidRange, 'Schedule range is outside the frozen duration policy.', {
      minimumMinutes,
      maximumDays,
      rangeConvention: RANGE_CONVENTION
    });
  }
  return Object.freeze({
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    durationMs,
    rangeConvention: RANGE_CONVENTION
  });
}

function rangesOverlap(left, right) {
  const a = validateRange(left.startsAt, left.endsAt);
  const b = validateRange(right.startsAt, right.endsAt);
  return new Date(a.startsAt).getTime() < new Date(b.endsAt).getTime()
    && new Date(b.startsAt).getTime() < new Date(a.endsAt).getTime();
}

function assertNoActiveConflict(candidate, existingReservations) {
  const candidateRange = validateRange(candidate.startsAt, candidate.endsAt);
  const professionalId = String(candidate.professionalId || candidate.professional_id || '').trim();
  const candidateId = String(candidate.id || '').trim();
  const conflict = (Array.isArray(existingReservations) ? existingReservations : []).find((reservation) => {
    if (!ACTIVE_OCCUPANCY_STATES.includes(normalizeState(reservation.status))) return false;
    if (String(reservation.professionalId || reservation.professional_id || '').trim() !== professionalId) return false;
    if (candidateId && String(reservation.id || '') === candidateId) return false;
    return rangesOverlap(candidateRange, {
      startsAt: reservation.startsAt || reservation.starts_at,
      endsAt: reservation.endsAt || reservation.ends_at
    });
  });
  if (conflict) {
    throw contractError(ERROR_CODES.conflict, 'The professional already has an active overlapping occupancy.', {
      conflictingReservationId: conflict.id || null,
      rangeConvention: RANGE_CONVENTION
    });
  }
  return true;
}

function assertActorAuthorized(commandName, actorRole) {
  const command = COMMANDS[commandName];
  if (!command) throw contractError(ERROR_CODES.invalidTransition, `Unknown scheduling command: ${commandName}`);
  const actor = normalizeActor(actorRole);
  if (!command.actors.includes(actor)) {
    throw contractError(ERROR_CODES.actorForbidden, `Actor ${actor || 'unknown'} cannot execute ${commandName}.`);
  }
  return true;
}

function assertTransition(commandName, currentState, actorRole) {
  const command = COMMANDS[commandName];
  if (!command) throw contractError(ERROR_CODES.invalidTransition, `Unknown scheduling command: ${commandName}`);
  assertActorAuthorized(commandName, actorRole);
  const state = normalizeState(currentState);
  if (Array.isArray(command.from) && !command.from.includes(state)) {
    throw contractError(ERROR_CODES.invalidTransition, `${commandName} is not allowed from ${state || 'empty'}.`, {
      allowedFrom: command.from
    });
  }
  return Object.freeze({
    command: commandName,
    aggregateType: command.aggregateType,
    previousState: state || null,
    nextState: command.to || state || null,
    eventType: command.eventType
  });
}

function assertExpectedVersion(actualVersion, expectedVersion) {
  const actual = Number(actualVersion);
  const expected = Number(expectedVersion);
  if (!Number.isInteger(actual) || actual < 1 || !Number.isInteger(expected) || expected < 1 || actual !== expected) {
    throw contractError(ERROR_CODES.versionConflict, 'The canonical scheduling version changed before mutation.', {
      actualVersion: Number.isFinite(actual) ? actual : null,
      expectedVersion: Number.isFinite(expected) ? expected : null
    });
  }
  return true;
}

function assertIdempotencyReplay(previous, incoming) {
  if (!previous) return 'new';
  const previousFingerprint = String(previous.payloadFingerprint || previous.payload_fingerprint || '').trim();
  const incomingFingerprint = String(incoming && (incoming.payloadFingerprint || incoming.payload_fingerprint) || '').trim();
  if (previousFingerprint && previousFingerprint === incomingFingerprint) return 'replay';
  throw contractError(ERROR_CODES.idempotencyConflict, 'The idempotency key was reused with a different payload.');
}

function buildEventKey(aggregateType, aggregateId, sequenceNo) {
  const type = normalizeAggregateType(aggregateType);
  const id = String(aggregateId || '').trim();
  const sequence = Number(sequenceNo);
  if (!EVENT_AGGREGATE_TYPES.includes(type) || !id || !Number.isInteger(sequence) || sequence < 1) {
    throw contractError(
      ERROR_CODES.invalidEventAggregate,
      'A supported aggregate type, aggregate id and positive event sequence are required.'
    );
  }
  return `schedule:${type}:${id}:v${sequence}`;
}

function isHoldExpired(reservation, cutoff) {
  if (normalizeState(reservation && reservation.status) !== 'held') return false;
  const expiresAt = readInstant(reservation.holdExpiresAt || reservation.hold_expires_at, 'holdExpiresAt');
  const cutoffInstant = readInstant(cutoff || new Date(), 'cutoff');
  return expiresAt.getTime() <= cutoffInstant.getTime();
}

module.exports = Object.freeze({
  RESERVATION_STATES,
  ACTIVE_OCCUPANCY_STATES,
  TERMINAL_STATES,
  EVENT_AGGREGATE_TYPES,
  RANGE_CONVENTION,
  HOLD_TTL_SECONDS,
  COMMANDS,
  ERROR_CODES,
  normalizeState,
  normalizeAggregateType,
  validateRange,
  rangesOverlap,
  assertNoActiveConflict,
  assertActorAuthorized,
  assertTransition,
  assertExpectedVersion,
  assertIdempotencyReplay,
  buildEventKey,
  isHoldExpired
});
