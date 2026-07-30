import { assertFreshWorkerRequest } from '../../supabase/functions/order-event-worker/invocation-gate.mjs';

const DEFAULT_CONCURRENCY = 32;
const DEFAULT_NOW_MS = 1_775_000_000_000;
const DEFAULT_NONCE = 'A07EConcurrentReplayNonce000001';

function deepFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(deepFreeze));
  if (!value || typeof value !== 'object') return value;
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, deepFreeze(nested)])
  ));
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function createAtomicMemoryLedger() {
  const consumed = new Set();
  let calls = 0;

  return Object.freeze({
    async consume({ nonce }) {
      calls += 1;
      await Promise.resolve();
      if (consumed.has(nonce)) return false;
      consumed.add(nonce);
      return true;
    },
    snapshot() {
      return deepFreeze({ calls, consumedCount: consumed.size });
    },
  });
}

function createHeaders({ nowMs, nonce, source = 'test' }) {
  return Object.freeze({
    'x-doke-worker-issued-at': String(nowMs),
    'x-doke-worker-nonce': nonce,
    'x-doke-worker-source': source,
  });
}

export async function runConcurrentReplayCanary(options = {}) {
  const concurrency = positiveInteger(options.concurrency, DEFAULT_CONCURRENCY);
  const nowMs = Number.isSafeInteger(Number(options.nowMs)) ? Number(options.nowMs) : DEFAULT_NOW_MS;
  const nonce = String(options.nonce || DEFAULT_NONCE);
  const ledger = createAtomicMemoryLedger();
  const headers = createHeaders({ nowMs, nonce, source: options.source || 'test' });
  let workerRunsStarted = 0;
  let eventClaimsStarted = 0;

  const attempts = Array.from({ length: concurrency }, async (_, index) => {
    try {
      const gate = await assertFreshWorkerRequest(headers, {
        nowMs,
        defaultSource: 'test',
        consumeNonce: (input) => ledger.consume(input),
      });
      workerRunsStarted += 1;
      eventClaimsStarted += 1;
      return deepFreeze({ index, status: 'accepted', code: null, gate });
    } catch (error) {
      return deepFreeze({
        index,
        status: 'rejected',
        code: error?.code || 'UNKNOWN_ERROR',
        httpStatus: error?.status || 500,
      });
    }
  });

  const outcomes = await Promise.all(attempts);
  const accepted = outcomes.filter((outcome) => outcome.status === 'accepted');
  const replayRejected = outcomes.filter(
    (outcome) => outcome.code === 'DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED' && outcome.httpStatus === 409
  );
  const unexpected = outcomes.filter(
    (outcome) => outcome.status !== 'accepted'
      && outcome.code !== 'DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED'
  );
  const ledgerSnapshot = ledger.snapshot();

  const passed = accepted.length === 1
    && replayRejected.length === concurrency - 1
    && unexpected.length === 0
    && workerRunsStarted === 1
    && eventClaimsStarted === 1
    && ledgerSnapshot.calls === concurrency
    && ledgerSnapshot.consumedCount === 1;

  return deepFreeze({
    canary: 'ORD-A07E',
    mode: 'local_deterministic_no_network',
    passed,
    concurrency,
    acceptedCount: accepted.length,
    replayRejectedCount: replayRejected.length,
    unexpectedCount: unexpected.length,
    workerRunsStarted,
    eventClaimsStarted,
    ledger: ledgerSnapshot,
    networkRequestsPerformed: 0,
    stagingMutationsPerformed: 0,
    productionChanged: false,
    outcomes,
  });
}
