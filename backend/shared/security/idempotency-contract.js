'use strict';

const crypto = require('crypto');

const IDEMPOTENCY_HEADER = 'x-idempotency-key';

function readHeader(headers, name) {
  const normalized = String(name || '').toLowerCase();
  const source = headers || {};
  const key = Object.keys(source).find((candidate) => candidate.toLowerCase() === normalized);
  return key ? source[key] : '';
}

function normalizeIdempotencyKey(value) {
  return String(value || '').trim();
}

function assertIdempotencyKey(context) {
  const key = normalizeIdempotencyKey(readHeader(context && context.headers, IDEMPOTENCY_HEADER));
  if (!key) {
    const error = new Error(`Missing required ${IDEMPOTENCY_HEADER} header.`);
    error.code = 'DOKE_IDEMPOTENCY_REQUIRED';
    error.status = 409;
    throw error;
  }
  return key;
}

function buildRequestHashPayload(route, context, actor) {
  return Object.freeze({
    actorId: actor && actor.id || null,
    action: route && route.name || '',
    method: route && route.method || '',
    path: route && route.path || '',
    params: context && context.params || {},
    body: context && context.body || {}
  });
}

function buildRequestHash(route, context, actor) {
  return crypto
    .createHash('sha256')
    .update(stableStringify(buildRequestHashPayload(route, context, actor)))
    .digest('hex');
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

module.exports = Object.freeze({
  IDEMPOTENCY_HEADER,
  normalizeIdempotencyKey,
  assertIdempotencyKey,
  buildRequestHashPayload,
  buildRequestHash,
  stableStringify
});
