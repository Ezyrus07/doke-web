export const WORKER_INVOCATION_MAX_AGE_MS = 5 * 60 * 1000;
export const WORKER_INVOCATION_FUTURE_SKEW_MS = 30 * 1000;
export const WORKER_INVOCATION_NONCE_PATTERN = /^[A-Za-z0-9_-]{24,128}$/;

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

function parseIssuedAt(value) {
  const raw = text(value, 64);
  if (!raw) return null;

  if (/^\d{13}$/.test(raw)) {
    const milliseconds = Number(raw);
    return Number.isSafeInteger(milliseconds) ? milliseconds : null;
  }

  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateWorkerInvocationEnvelope(input = {}, options = {}) {
  const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
  const maxAgeMs = Number.isFinite(Number(options.maxAgeMs))
    ? Math.max(1, Number(options.maxAgeMs))
    : WORKER_INVOCATION_MAX_AGE_MS;
  const futureSkewMs = Number.isFinite(Number(options.futureSkewMs))
    ? Math.max(0, Number(options.futureSkewMs))
    : WORKER_INVOCATION_FUTURE_SKEW_MS;

  const issuedAtRaw = text(input.issuedAt, 64);
  const nonce = text(input.nonce, 128);
  const issuedAtMs = parseIssuedAt(issuedAtRaw);
  const blockers = [];

  if (!issuedAtRaw) blockers.push('worker_invocation_issued_at_required');
  else if (issuedAtMs === null) blockers.push('worker_invocation_issued_at_invalid');

  if (!nonce) blockers.push('worker_invocation_nonce_required');
  else if (!WORKER_INVOCATION_NONCE_PATTERN.test(nonce)) {
    blockers.push('worker_invocation_nonce_invalid');
  }

  const ageMs = issuedAtMs === null ? null : nowMs - issuedAtMs;
  if (ageMs !== null) {
    if (ageMs > maxAgeMs) blockers.push('worker_invocation_expired');
    if (ageMs < -futureSkewMs) blockers.push('worker_invocation_from_future');
  }

  return deepFreeze({
    valid: blockers.length === 0,
    issuedAt: issuedAtRaw || null,
    issuedAtMs,
    nonce: nonce || null,
    ageMs,
    maxAgeMs,
    futureSkewMs,
    blockers
  });
}

export async function verifyFreshWorkerInvocation(input = {}, options = {}) {
  const envelope = validateWorkerInvocationEnvelope(input, options);
  if (!envelope.valid) {
    return deepFreeze({
      accepted: false,
      status: 'worker_invocation_rejected',
      replayDetected: false,
      nonceConsumed: false,
      envelope,
      blockers: envelope.blockers
    });
  }

  if (typeof options.consumeNonce !== 'function') {
    return deepFreeze({
      accepted: false,
      status: 'worker_invocation_nonce_ledger_unavailable',
      replayDetected: false,
      nonceConsumed: false,
      envelope,
      blockers: ['worker_invocation_nonce_consumer_required']
    });
  }

  const nonceConsumed = await options.consumeNonce({
    nonce: envelope.nonce,
    issuedAt: envelope.issuedAt,
    issuedAtMs: envelope.issuedAtMs,
    source: text(input.source, 20).toLowerCase() || 'manual'
  });

  if (nonceConsumed !== true) {
    return deepFreeze({
      accepted: false,
      status: 'worker_invocation_replay_rejected',
      replayDetected: true,
      nonceConsumed: false,
      envelope,
      blockers: ['worker_invocation_nonce_already_consumed']
    });
  }

  return deepFreeze({
    accepted: true,
    status: 'worker_invocation_fresh_and_nonce_consumed',
    replayDetected: false,
    nonceConsumed: true,
    envelope,
    blockers: []
  });
}

export async function assertFreshWorkerInvocation(input = {}, options = {}) {
  const decision = await verifyFreshWorkerInvocation(input, options);
  if (!decision.accepted) {
    const error = new Error('Order event worker invocation freshness validation failed.');
    error.code = decision.replayDetected
      ? 'DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED'
      : 'DOKE_ORDER_EVENT_WORKER_FRESHNESS_REQUIRED';
    error.status = decision.replayDetected ? 409 : 428;
    error.decision = decision;
    throw error;
  }
  return decision;
}
