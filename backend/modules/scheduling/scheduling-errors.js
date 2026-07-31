'use strict';

const RUNTIME_ERROR_CODES = Object.freeze({
  invalidInput: 'DOKE_SCHEDULE_INVALID_INPUT',
  repositoryUnavailable: 'DOKE_SCHEDULE_REPOSITORY_UNAVAILABLE',
  idempotencyInProgress: 'DOKE_SCHEDULE_IDEMPOTENCY_IN_PROGRESS',
  notFound: 'DOKE_SCHEDULE_NOT_FOUND',
  orderIneligible: 'DOKE_SCHEDULE_ORDER_INELIGIBLE',
  availabilityUnavailable: 'DOKE_SCHEDULE_AVAILABILITY_UNAVAILABLE',
  timezoneInvalid: 'DOKE_SCHEDULE_TIMEZONE_INVALID',
  timezoneResolutionMismatch: 'DOKE_SCHEDULE_TIMEZONE_RESOLUTION_MISMATCH'
});

function runtimeError(code, message, details, status) {
  const error = new Error(message || code);
  error.code = code;
  error.status = Number(status) || 400;
  if (details && typeof details === 'object') error.details = Object.freeze({ ...details });
  return error;
}

function contractError(code, message, details, status) {
  const error = new Error(message || code);
  error.code = code;
  error.status = Number(status) || (String(code).includes('FORBIDDEN') ? 403 : 409);
  if (details && typeof details === 'object') error.details = Object.freeze({ ...details });
  return error;
}

module.exports = Object.freeze({
  RUNTIME_ERROR_CODES,
  runtimeError,
  contractError
});
