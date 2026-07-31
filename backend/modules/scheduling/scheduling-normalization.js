'use strict';

const crypto = require('crypto');
const contract = require('./scheduling-contract');
const { RUNTIME_ERROR_CODES, runtimeError, contractError } = require('./scheduling-errors');

const DEFAULT_IDEMPOTENCY_RETENTION_DAYS = 30;
const DEFAULT_EXPIRATION_BATCH_SIZE = 100;
const MAX_EXPIRATION_BATCH_SIZE = 500;

function normalizeContext(context) {
  const source = context || {};
  const actor = source.actor || {};
  const role = String(actor.role || '').trim().toLowerCase();
  if (!role) throw runtimeError(RUNTIME_ERROR_CODES.invalidInput, 'Scheduling actor role is required.');
  const idempotencyKey = sanitizeText(source.idempotencyKey || source.idempotency_key, 160);
  if (!idempotencyKey) {
    throw runtimeError(RUNTIME_ERROR_CODES.invalidInput, 'Scheduling idempotency key is required.');
  }
  return Object.freeze({
    actor: Object.freeze({
      id: sanitizeText(actor.id, 160) || null,
      role,
      principalKey: sanitizeText(actor.principalKey || actor.principal_key, 200) || null
    }),
    idempotencyKey,
    correlationId: sanitizeText(source.correlationId || source.correlation_id, 160) || null,
    causationId: sanitizeText(source.causationId || source.causation_id, 160) || null,
    payload: cloneJson(source.payload || source.body || {}) || {}
  });
}

function normalizeCommandPayload(commandName, payload) {
  const source = payload || {};
  switch (commandName) {
    case 'upsert_availability_rule': {
      const professionalId = requiredText(source.professionalId || source.professional_id, 'professionalId');
      const rule = source.rule;
      if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
        throw runtimeError(RUNTIME_ERROR_CODES.invalidInput, 'Availability rule must be an object.');
      }
      const status = String(source.status || 'active').trim().toLowerCase();
      if (!['active', 'paused', 'archived'].includes(status)) {
        throw runtimeError(RUNTIME_ERROR_CODES.invalidInput, 'Availability rule status is invalid.');
      }
      return Object.freeze({
        ruleId: sanitizeText(source.ruleId || source.rule_id, 160) || null,
        professionalId,
        timezone: requiredText(source.timezone, 'timezone'),
        rule: cloneJson(rule),
        status,
        expectedVersion: optionalPositiveInteger(source.expectedVersion || source.expected_version)
      });
    }
    case 'create_schedule_hold':
      return Object.freeze({
        orderId: requiredText(source.orderId || source.order_id, 'orderId'),
        professionalId: requiredText(source.professionalId || source.professional_id, 'professionalId'),
        ...normalizeResolvedRange(source)
      });
    case 'confirm_schedule_reservation':
      return Object.freeze({
        reservationId: requiredText(source.reservationId || source.reservation_id, 'reservationId'),
        expectedVersion: requiredPositiveInteger(source.expectedVersion || source.expected_version, 'expectedVersion')
      });
    case 'reschedule_reservation':
      return Object.freeze({
        reservationId: requiredText(source.reservationId || source.reservation_id, 'reservationId'),
        expectedVersion: requiredPositiveInteger(source.expectedVersion || source.expected_version, 'expectedVersion'),
        ...normalizeResolvedRange(source)
      });
    case 'cancel_schedule_reservation':
      return Object.freeze({
        reservationId: requiredText(source.reservationId || source.reservation_id, 'reservationId'),
        expectedVersion: requiredPositiveInteger(source.expectedVersion || source.expected_version, 'expectedVersion'),
        reason: requiredText(source.reason, 'reason', 500)
      });
    case 'expire_schedule_holds':
      return Object.freeze({
        cutoff: source.cutoff ? readInstant(source.cutoff, 'cutoff').toISOString() : null,
        limit: readPositiveInteger(source.limit, DEFAULT_EXPIRATION_BATCH_SIZE, MAX_EXPIRATION_BATCH_SIZE)
      });
    default:
      throw contractError(contract.ERROR_CODES.invalidTransition, `Unknown scheduling command: ${commandName}`);
  }
}

function normalizeResolvedRange(source) {
  return {
    startsAt: requiredText(source.startsAt || source.starts_at, 'startsAt'),
    endsAt: requiredText(source.endsAt || source.ends_at, 'endsAt'),
    timezone: requiredText(source.timezone, 'timezone'),
    localStart: requiredText(source.localStart || source.local_start, 'localStart'),
    localEnd: requiredText(source.localEnd || source.local_end, 'localEnd'),
    resolvedOffsetMinutes: requiredInteger(
      source.resolvedOffsetMinutes !== undefined
        ? source.resolvedOffsetMinutes
        : source.resolved_offset_minutes,
      'resolvedOffsetMinutes'
    )
  };
}

function normalizeAvailabilityRule(row) {
  const source = row || {};
  return Object.freeze({
    id: source.id || '',
    professionalId: source.professionalId || source.professional_id || '',
    timezone: source.timezone || '',
    rule: cloneJson(source.rule) || {},
    status: source.status || 'active',
    version: Number(source.version || 0),
    createdBy: source.createdBy || source.created_by || null,
    createdAt: source.createdAt || source.created_at || null,
    updatedAt: source.updatedAt || source.updated_at || null
  });
}

function normalizeReservation(row) {
  const source = row || {};
  if (!source || typeof source !== 'object') return null;
  return Object.freeze({
    id: source.id || '',
    professionalId: source.professionalId || source.professional_id || '',
    orderId: source.orderId || source.order_id || '',
    startsAt: source.startsAt || source.starts_at || '',
    endsAt: source.endsAt || source.ends_at || '',
    timezone: source.timezone || '',
    localStart: source.localStart || source.local_start || '',
    localEnd: source.localEnd || source.local_end || '',
    resolvedOffsetMinutes: Number(
      source.resolvedOffsetMinutes !== undefined
        ? source.resolvedOffsetMinutes
        : source.resolved_offset_minutes
    ),
    status: String(source.status || '').toLowerCase(),
    holdExpiresAt: source.holdExpiresAt || source.hold_expires_at || null,
    version: Number(source.version || 0),
    idempotencyKey: source.idempotencyKey || source.idempotency_key || '',
    createdBy: source.createdBy || source.created_by || null,
    createdAt: source.createdAt || source.created_at || null,
    updatedAt: source.updatedAt || source.updated_at || null
  });
}

function normalizeOrder(row) {
  if (!row || typeof row !== 'object') return null;
  return Object.freeze({
    id: row.id || '',
    clientId: row.clientId || row.client_id || '',
    professionalId: row.professionalId || row.professional_id || '',
    status: row.status || '',
    scheduleReservationId: row.scheduleReservationId || row.schedule_reservation_id || null,
    scheduledAt: row.scheduledAt || row.scheduled_at || null
  });
}

function readRange(reservation) {
  return Object.freeze({
    startsAt: reservation.startsAt,
    endsAt: reservation.endsAt,
    rangeConvention: contract.RANGE_CONVENTION
  });
}

function resolvePrincipalKey(actor) {
  const principal = actor.principalKey || (actor.id ? `${actor.role}:${actor.id}` : actor.role);
  if (!principal) throw runtimeError(RUNTIME_ERROR_CODES.invalidInput, 'A stable actor principal is required.');
  return principal;
}

function sha256Payload(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function cloneJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function freezeResult(value) {
  return deepFreeze(cloneJson(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function readNow(now) {
  const value = now();
  return readInstant(value, 'now');
}

function readInstant(value, fieldName) {
  const instant = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(instant.getTime())) {
    throw runtimeError(RUNTIME_ERROR_CODES.invalidInput, `${fieldName || 'instant'} must be valid.`);
  }
  return instant;
}

function addDays(date, days) {
  return new Date(date.getTime() + Number(days) * 86_400_000);
}

function readHoldTtl(value) {
  const ttl = value === undefined ? contract.HOLD_TTL_SECONDS : Number(value);
  if (!Number.isInteger(ttl) || ttl < 300 || ttl > 900) {
    throw runtimeError(RUNTIME_ERROR_CODES.invalidInput, 'Hold TTL must be between 300 and 900 seconds.');
  }
  return ttl;
}

function readPositiveInteger(value, fallback, maximum) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw runtimeError(RUNTIME_ERROR_CODES.invalidInput, `Value must be an integer between 1 and ${maximum}.`);
  }
  return parsed;
}

function optionalPositiveInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  return requiredPositiveInteger(value, 'expectedVersion');
}

function requiredPositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw runtimeError(RUNTIME_ERROR_CODES.invalidInput, `${fieldName} must be a positive integer.`);
  }
  return parsed;
}

function requiredInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw runtimeError(RUNTIME_ERROR_CODES.invalidInput, `${fieldName} must be an integer.`);
  }
  return parsed;
}

function requiredText(value, fieldName, maxLength) {
  const text = sanitizeText(value, maxLength || 1000);
  if (!text) throw runtimeError(RUNTIME_ERROR_CODES.invalidInput, `${fieldName} is required.`);
  return text;
}

function sanitizeText(value, maxLength) {
  const text = String(value === undefined || value === null ? '' : value).trim();
  return text.slice(0, Number(maxLength) || 1000);
}

module.exports = Object.freeze({
  DEFAULT_IDEMPOTENCY_RETENTION_DAYS,
  DEFAULT_EXPIRATION_BATCH_SIZE,
  MAX_EXPIRATION_BATCH_SIZE,
  normalizeContext,
  normalizeCommandPayload,
  normalizeAvailabilityRule,
  normalizeReservation,
  normalizeOrder,
  readRange,
  resolvePrincipalKey,
  sha256Payload,
  stableStringify,
  cloneJson,
  freezeResult,
  readNow,
  addDays,
  readHoldTtl,
  readPositiveInteger
});
