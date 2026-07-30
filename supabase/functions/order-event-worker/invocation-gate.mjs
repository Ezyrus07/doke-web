import { readWorkerInvocationHeaders } from './invocation-headers.mjs';
import { verifyFreshWorkerInvocation } from './invocation-freshness.mjs';

function deepFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(deepFreeze));
  if (!value || typeof value !== 'object') return value;
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, deepFreeze(nested)])
  ));
}

function workerInvocationError(code, status, message, decision = null) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.decision = decision;
  return error;
}

export async function assertFreshWorkerRequest(headers, options = {}) {
  const envelope = readWorkerInvocationHeaders(headers, {
    defaultSource: options.defaultSource || 'manual',
  });

  let decision;
  try {
    decision = await verifyFreshWorkerInvocation(envelope, {
      nowMs: options.nowMs,
      consumeNonce: async ({ nonce, issuedAtMs, source }) => {
        if (typeof options.consumeNonce !== 'function') {
          throw workerInvocationError(
            'DOKE_ORDER_EVENT_WORKER_NONCE_LEDGER_UNAVAILABLE',
            428,
            'Order event worker nonce ledger is unavailable.'
          );
        }

        const consumed = await options.consumeNonce({
          nonce,
          issuedAtMs,
          issuedAt: new Date(issuedAtMs).toISOString(),
          source,
        });
        return consumed === true;
      },
    });
  } catch (cause) {
    if (cause && typeof cause === 'object' && cause.code) throw cause;
    throw workerInvocationError(
      'DOKE_ORDER_EVENT_WORKER_NONCE_LEDGER_UNAVAILABLE',
      428,
      'Order event worker nonce ledger verification failed.'
    );
  }

  if (!decision.accepted) {
    throw workerInvocationError(
      decision.replayDetected
        ? 'DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED'
        : 'DOKE_ORDER_EVENT_WORKER_FRESHNESS_REQUIRED',
      decision.replayDetected ? 409 : 428,
      decision.replayDetected
        ? 'Order event worker invocation nonce was already consumed.'
        : 'Order event worker invocation freshness headers are required.',
      decision
    );
  }

  return deepFreeze({
    accepted: true,
    source: envelope.source,
    issuedAt: envelope.issuedAt,
    issuedAtMs: decision.envelope.issuedAtMs,
    ageMs: decision.envelope.ageMs,
    nonceConsumed: true,
  });
}
