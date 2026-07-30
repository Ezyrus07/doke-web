'use strict';

const crypto = require('crypto');

const REQUEST_ISSUED_AT_HEADER = 'x-doke-request-issued-at';
const REQUEST_NONCE_HEADER = 'x-doke-request-nonce';
const MAX_REQUEST_AGE_MS = 5 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 30 * 1000;
const NONCE_PATTERN = /^ord-[A-Za-z0-9._:-]{16,160}$/;

function readHeader(headers, name) {
  const normalized = String(name || '').toLowerCase();
  const source = headers || {};
  const key = Object.keys(source).find((candidate) => candidate.toLowerCase() === normalized);
  return key ? source[key] : '';
}

function assertRequestFreshness(context) {
  const headers = context && context.headers || {};
  const issuedAtRaw = String(readHeader(headers, REQUEST_ISSUED_AT_HEADER) || '').trim();
  const nonce = String(readHeader(headers, REQUEST_NONCE_HEADER) || '').trim();
  if (!issuedAtRaw || !nonce) {
    throw freshnessError('DOKE_REQUEST_FRESHNESS_REQUIRED', `Missing required ${REQUEST_ISSUED_AT_HEADER} or ${REQUEST_NONCE_HEADER} header.`, 428);
  }
  const issuedAtMs = Date.parse(issuedAtRaw);
  const nowMs = Date.parse(context && context.now || new Date().toISOString());
  if (!Number.isFinite(issuedAtMs) || !Number.isFinite(nowMs)) {
    throw freshnessError('DOKE_REQUEST_FRESHNESS_INVALID', 'Request freshness timestamps must be valid ISO-8601 values.', 400);
  }
  if (!NONCE_PATTERN.test(nonce)) {
    throw freshnessError('DOKE_REQUEST_NONCE_INVALID', 'Request nonce does not match the ORD-A07 contract.', 400);
  }
  const ageMs = nowMs - issuedAtMs;
  if (ageMs > MAX_REQUEST_AGE_MS) {
    throw freshnessError('DOKE_REQUEST_EXPIRED', 'Request is older than the five-minute mutation window.', 408);
  }
  if (ageMs < -MAX_FUTURE_SKEW_MS) {
    throw freshnessError('DOKE_REQUEST_FROM_FUTURE', 'Request timestamp exceeds the allowed clock skew.', 400);
  }
  return Object.freeze({
    issuedAt: new Date(issuedAtMs).toISOString(),
    ageMs,
    nonceSha256: crypto.createHash('sha256').update(nonce).digest('hex')
  });
}

function freshnessError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

module.exports = Object.freeze({
  REQUEST_ISSUED_AT_HEADER,
  REQUEST_NONCE_HEADER,
  MAX_REQUEST_AGE_MS,
  MAX_FUTURE_SKEW_MS,
  NONCE_PATTERN,
  assertRequestFreshness
});
