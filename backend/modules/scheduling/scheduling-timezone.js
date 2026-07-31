'use strict';

const contract = require('./scheduling-contract');
const { RUNTIME_ERROR_CODES, runtimeError } = require('./scheduling-errors');

function assertTimezoneResolution(payload) {
  const range = contract.validateRange(payload.startsAt, payload.endsAt);
  assertIanaTimezone(payload.timezone);
  const startProjection = projectInstant(payload.startsAt, payload.timezone);
  const endProjection = projectInstant(payload.endsAt, payload.timezone);
  const localStart = normalizeLocalTimestamp(payload.localStart, 'localStart');
  const localEnd = normalizeLocalTimestamp(payload.localEnd, 'localEnd');
  if (startProjection.local !== localStart || endProjection.local !== localEnd) {
    throw runtimeError(
      RUNTIME_ERROR_CODES.timezoneResolutionMismatch,
      'The supplied local time does not resolve to the canonical UTC range in the selected timezone.',
      {
        expectedLocalStart: startProjection.local,
        expectedLocalEnd: endProjection.local,
        suppliedLocalStart: localStart,
        suppliedLocalEnd: localEnd
      },
      409
    );
  }
  if (startProjection.offsetMinutes !== Number(payload.resolvedOffsetMinutes)) {
    throw runtimeError(
      RUNTIME_ERROR_CODES.timezoneResolutionMismatch,
      'The supplied timezone offset does not match the canonical start instant.',
      {
        expectedOffsetMinutes: startProjection.offsetMinutes,
        suppliedOffsetMinutes: Number(payload.resolvedOffsetMinutes)
      },
      409
    );
  }
  return Object.freeze({
    startsAt: range.startsAt,
    endsAt: range.endsAt,
    timezone: payload.timezone,
    localStart,
    localEnd,
    resolvedOffsetMinutes: startProjection.offsetMinutes,
    endOffsetMinutes: endProjection.offsetMinutes,
    rangeConvention: contract.RANGE_CONVENTION
  });
}

function assertIanaTimezone(timezone) {
  const value = String(timezone || '').trim();
  if (!value) throw runtimeError(RUNTIME_ERROR_CODES.timezoneInvalid, 'Timezone is required.');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date(0));
  } catch (error) {
    throw runtimeError(
      RUNTIME_ERROR_CODES.timezoneInvalid,
      'Timezone must be a valid IANA identifier.',
      { timezone: value }
    );
  }
  return value;
}

function projectInstant(value, timezone) {
  const instant = readInstant(value, 'instant');
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
  const local = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  const localAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return Object.freeze({
    local,
    offsetMinutes: Math.round((localAsUtc - instant.getTime()) / 60_000)
  });
}

function normalizeLocalTimestamp(value, fieldName) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    throw runtimeError(
      RUNTIME_ERROR_CODES.timezoneResolutionMismatch,
      `${fieldName} must be a local timestamp without a timezone suffix.`
    );
  }
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6] || '00'}`;
}

function readInstant(value, fieldName) {
  const instant = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(instant.getTime())) {
    throw runtimeError(RUNTIME_ERROR_CODES.invalidInput, `${fieldName || 'instant'} must be valid.`);
  }
  return instant;
}

module.exports = Object.freeze({
  assertIanaTimezone,
  assertTimezoneResolution,
  projectInstant,
  normalizeLocalTimestamp
});
