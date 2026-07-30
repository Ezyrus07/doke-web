export const WORKER_INVOCATION_HEADER_NAMES = Object.freeze({
  issuedAt: 'x-doke-worker-issued-at',
  nonce: 'x-doke-worker-nonce',
  source: 'x-doke-worker-source',
});

export const WORKER_INVOCATION_NONCE_BYTES = 24;
export const WORKER_INVOCATION_NONCE_PATTERN = /^[A-Za-z0-9_-]{32}$/;

const ALLOWED_SOURCES = new Set(['cron', 'manual', 'test', 'recovery']);
const BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function deepFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(deepFreeze));
  if (!value || typeof value !== 'object') return value;
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, deepFreeze(nested)])
  ));
}

function text(value, max = 256) {
  return String(value ?? '').trim().slice(0, max);
}

function normalizeSource(value) {
  const source = text(value, 20).toLowerCase();
  return ALLOWED_SOURCES.has(source) ? source : 'manual';
}

function normalizeNowMs(value) {
  const nowMs = Number(value);
  if (!Number.isSafeInteger(nowMs) || nowMs < 1_000_000_000_000 || nowMs > 9_999_999_999_999) {
    const error = new Error('Worker invocation issued-at must be a 13-digit millisecond timestamp.');
    error.code = 'DOKE_ORDER_EVENT_WORKER_ISSUED_AT_INVALID';
    throw error;
  }
  return nowMs;
}

function normalizeRandomBytes(value) {
  const bytes = value instanceof Uint8Array ? value : Uint8Array.from(value || []);
  if (bytes.length !== WORKER_INVOCATION_NONCE_BYTES) {
    const error = new Error(`Worker invocation nonce requires exactly ${WORKER_INVOCATION_NONCE_BYTES} random bytes.`);
    error.code = 'DOKE_ORDER_EVENT_WORKER_NONCE_ENTROPY_INVALID';
    throw error;
  }
  return bytes;
}

function createRandomBytes(options = {}) {
  if (options.randomBytes !== undefined) {
    const supplied = typeof options.randomBytes === 'function'
      ? options.randomBytes(WORKER_INVOCATION_NONCE_BYTES)
      : options.randomBytes;
    return normalizeRandomBytes(supplied);
  }

  if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') {
    const error = new Error('A cryptographically secure random source is required for worker invocation nonces.');
    error.code = 'DOKE_ORDER_EVENT_WORKER_CRYPTO_REQUIRED';
    throw error;
  }

  const bytes = new Uint8Array(WORKER_INVOCATION_NONCE_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function encodeBase64Url(bytes) {
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const chunk = (first << 16) | (second << 8) | third;

    output += BASE64URL_ALPHABET[(chunk >>> 18) & 63];
    output += BASE64URL_ALPHABET[(chunk >>> 12) & 63];
    if (index + 1 < bytes.length) output += BASE64URL_ALPHABET[(chunk >>> 6) & 63];
    if (index + 2 < bytes.length) output += BASE64URL_ALPHABET[chunk & 63];
  }
  return output;
}

function headerValue(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') return text(headers.get(name), 256);
  if (typeof headers !== 'object') return '';
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name);
  return text(entry?.[1], 256);
}

export function buildWorkerInvocationHeaders(options = {}) {
  const nowMs = normalizeNowMs(options.nowMs ?? Date.now());
  const nonce = encodeBase64Url(createRandomBytes(options));
  if (!WORKER_INVOCATION_NONCE_PATTERN.test(nonce)) {
    const error = new Error('Generated worker invocation nonce is not URL-safe.');
    error.code = 'DOKE_ORDER_EVENT_WORKER_NONCE_ENCODING_INVALID';
    throw error;
  }

  const source = normalizeSource(options.source);
  const issuedAt = String(nowMs);
  return deepFreeze({
    issuedAt,
    nonce,
    source,
    headers: {
      [WORKER_INVOCATION_HEADER_NAMES.issuedAt]: issuedAt,
      [WORKER_INVOCATION_HEADER_NAMES.nonce]: nonce,
      [WORKER_INVOCATION_HEADER_NAMES.source]: source,
    },
  });
}

export function readWorkerInvocationHeaders(headers, options = {}) {
  return deepFreeze({
    issuedAt: headerValue(headers, WORKER_INVOCATION_HEADER_NAMES.issuedAt) || null,
    nonce: headerValue(headers, WORKER_INVOCATION_HEADER_NAMES.nonce) || null,
    source: normalizeSource(
      headerValue(headers, WORKER_INVOCATION_HEADER_NAMES.source) || options.defaultSource
    ),
  });
}
