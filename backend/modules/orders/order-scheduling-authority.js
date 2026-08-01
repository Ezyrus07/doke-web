'use strict';

const SCHEDULE_AUTHORITY = Object.freeze({
  none: 'none',
  canonical: 'canonical_reservation',
  incomplete: 'incomplete_projection'
});

function readScheduleProjection(order) {
  const source = order || {};
  const scheduleReservationId = clean(
    source.schedule_reservation_id || source.scheduleReservationId
  );
  const scheduledAt = clean(source.scheduled_at || source.scheduledAt);
  const authority = scheduleReservationId && scheduledAt
    ? SCHEDULE_AUTHORITY.canonical
    : scheduleReservationId || scheduledAt
      ? SCHEDULE_AUTHORITY.incomplete
      : SCHEDULE_AUTHORITY.none;

  return Object.freeze({
    scheduleReservationId,
    scheduledAt,
    authority,
    canonical: authority === SCHEDULE_AUTHORITY.canonical
  });
}

function readSchedulePreference(body) {
  const source = body || {};
  const raw = source.preferredScheduledAt
    || source.preferred_scheduled_at
    || source.scheduledAt
    || source.scheduled_at;
  const value = clean(raw);
  if (!value) return null;
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) {
    throw schedulingError(
      'DOKE_ORDER_SCHEDULE_PREFERENCE_INVALID',
      'Schedule preference must be a valid date-time.',
      400,
      { value }
    );
  }
  return Object.freeze({
    requestedAt: timestamp.toISOString(),
    authority: 'client_intent'
  });
}

function applySchedulePreference(metadata, preference) {
  const output = metadata && typeof metadata === 'object'
    ? cloneJson(metadata)
    : {};

  [
    'scheduledAt',
    'scheduled_at',
    'preferredScheduledAt',
    'preferred_scheduled_at',
    'scheduleReservationId',
    'schedule_reservation_id',
    'scheduleAuthority'
  ].forEach((key) => delete output[key]);

  if (preference) {
    output.schedulePreference = {
      requestedAt: preference.requestedAt,
      authority: preference.authority
    };
  } else {
    delete output.schedulePreference;
  }
  return output;
}

async function assertStartScheduleAuthority(context, order) {
  const projection = readScheduleProjection(order);
  if (projection.authority === SCHEDULE_AUTHORITY.none) {
    return Object.freeze({ required: false, projection, reservation: null });
  }
  if (!projection.canonical) {
    throw schedulingError(
      'DOKE_ORDER_SCHEDULE_PROJECTION_INVALID',
      'A scheduled order must contain both the canonical reservation reference and its time projection.',
      409,
      { orderId: clean(order && order.id), projection }
    );
  }

  const authority = context && context.schedulingAuthority;
  if (!authority || typeof authority.getReservation !== 'function') {
    throw schedulingError(
      'DOKE_ORDER_SCHEDULE_AUTHORITY_UNAVAILABLE',
      'Canonical scheduling authority is required before starting this order.',
      503,
      { orderId: clean(order && order.id), reservationId: projection.scheduleReservationId }
    );
  }

  const reservation = await authority.getReservation(projection.scheduleReservationId, {
    orderId: clean(order && order.id)
  });
  const normalized = normalizeReservation(reservation);
  if (!normalized.id || normalized.id !== projection.scheduleReservationId) {
    throw schedulingError(
      'DOKE_ORDER_SCHEDULE_RESERVATION_NOT_FOUND',
      'The canonical schedule reservation could not be resolved.',
      409,
      { orderId: clean(order && order.id), reservationId: projection.scheduleReservationId }
    );
  }
  if (normalized.orderId !== clean(order && order.id)) {
    throw schedulingError(
      'DOKE_ORDER_SCHEDULE_RESERVATION_MISMATCH',
      'The canonical schedule reservation belongs to another order.',
      409,
      { orderId: clean(order && order.id), reservationOrderId: normalized.orderId }
    );
  }
  if (normalized.status !== 'confirmed') {
    throw schedulingError(
      'DOKE_ORDER_SCHEDULE_RESERVATION_NOT_CONFIRMED',
      'The order can start only with a confirmed schedule reservation.',
      409,
      { orderId: clean(order && order.id), reservationId: normalized.id, status: normalized.status }
    );
  }
  if (!sameInstant(normalized.startsAt, projection.scheduledAt)) {
    throw schedulingError(
      'DOKE_ORDER_SCHEDULE_PROJECTION_MISMATCH',
      'The order schedule projection does not match the canonical reservation.',
      409,
      {
        orderId: clean(order && order.id),
        reservationId: normalized.id,
        reservationStartsAt: normalized.startsAt,
        scheduledAt: projection.scheduledAt
      }
    );
  }

  return Object.freeze({
    required: true,
    projection,
    reservation: Object.freeze(normalized)
  });
}

function assertGenericCancellationAllowed(order) {
  const projection = readScheduleProjection(order);
  if (!projection.scheduleReservationId) return true;
  throw schedulingError(
    'DOKE_ORDER_SCHEDULE_CANCELLATION_COMPOSITION_REQUIRED',
    'An order with a canonical schedule reservation must be cancelled through the ORD/SCHED composition.',
    409,
    {
      orderId: clean(order && order.id),
      reservationId: projection.scheduleReservationId
    }
  );
}

function normalizeReservation(reservation) {
  const source = reservation || {};
  return {
    id: clean(source.id),
    orderId: clean(source.order_id || source.orderId),
    status: clean(source.status).toLowerCase(),
    startsAt: clean(source.starts_at || source.startsAt)
  };
}

function sameInstant(left, right) {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime === rightTime;
}

function clean(value) {
  return String(value || '').trim();
}

function cloneJson(value) {
  try {
    return JSON.parse(JSON.stringify(value || {}));
  } catch (error) {
    return {};
  }
}

function schedulingError(code, message, status, details) {
  const error = new Error(message || code);
  error.code = code;
  error.status = status || 409;
  if (details && typeof details === 'object') error.details = Object.freeze({ ...details });
  return error;
}

module.exports = Object.freeze({
  SCHEDULE_AUTHORITY,
  readScheduleProjection,
  readSchedulePreference,
  applySchedulePreference,
  assertStartScheduleAuthority,
  assertGenericCancellationAllowed,
  schedulingError
});
