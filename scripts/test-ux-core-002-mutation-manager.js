const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.cwd();
const MANAGER = path.join(ROOT, 'assets/js/core/mutation-manager.js');
const NEWS = path.join(ROOT, 'assets/js/pages/news-experience.js');

function createContext() {
  const events = [];
  let uuid = 0;
  const document = {
    dispatchEvent(event) {
      events.push(event);
      return true;
    },
    querySelector() {
      return null;
    }
  };
  const window = {
    Doke: {},
    crypto: {
      randomUUID() {
        uuid += 1;
        return `00000000-0000-4000-8000-${String(uuid).padStart(12, '0')}`;
      }
    }
  };
  window.window = window;
  window.document = document;
  const context = {
    window,
    document,
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
    Map,
    Set,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Math,
    Date,
    JSON,
    Promise,
    Error,
    TypeError,
    console,
    setTimeout,
    clearTimeout
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(MANAGER, 'utf8'), context, { filename: MANAGER });
  return { manager: window.Doke.formMutationManager, events };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function testApiAndFingerprint() {
  const { manager } = createContext();
  assert(manager, 'manager must be published');
  assert(Object.isFrozen(manager), 'manager API must be frozen');
  assert(Object.isFrozen(manager.states), 'state enum must be frozen');
  assert.strictEqual(manager.states.UNKNOWN_OUTCOME, 'unknown_outcome');
  assert.strictEqual(manager.states.RECONCILING, 'reconciling');
  assert.strictEqual(
    manager.fingerprint({ b: 2, a: 1 }),
    manager.fingerprint({ a: 1, b: 2 }),
    'payload fingerprint must be key-order stable'
  );
  assert.notStrictEqual(
    manager.fingerprint({ a: 1 }),
    manager.fingerprint({ a: 2 }),
    'different payloads need different fingerprints'
  );
}

async function testSingleFlightReceiptAndReplay() {
  const { manager, events } = createContext();
  const gate = deferred();
  let requestCount = 0;
  const sharedOptions = {
    domain: 'test',
    action: 'save',
    accountId: 'account-1',
    entityType: 'preference',
    entityId: 'news',
    payload: { filter: 'all' },
    dedupeKey: 'test|save|account-1|news|all',
    request() {
      requestCount += 1;
      return gate.promise;
    },
    authority: 'test-authority'
  };

  const first = manager.execute(sharedOptions);
  const second = manager.execute(sharedOptions);
  assert.strictEqual(first, second, 'same in-flight intent must return the same promise');
  assert.strictEqual(requestCount, 0, 'request starts in the next microtask');
  await Promise.resolve();
  assert.strictEqual(requestCount, 1, 'single-flight must execute one request');

  gate.resolve({ value: { saved: true }, confirmed: true });
  const confirmed = await first;
  assert.strictEqual(confirmed.state, manager.states.CONFIRMED);
  assert(confirmed.receipt, 'confirmed mutation needs a receipt');
  assert.strictEqual(confirmed.receipt.authority, 'test-authority');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(confirmed.receipt, 'payload'), false, 'receipt must not contain raw payload');

  const replay = await manager.execute({
    ...sharedOptions,
    intent: confirmed.intent,
    request() {
      requestCount += 1;
      return { value: { saved: false } };
    }
  });
  assert.strictEqual(replay.replayed, true, 'confirmed idempotency key must replay its receipt');
  assert.strictEqual(requestCount, 1, 'replay must not execute the request again');
  assert.strictEqual(replay.receipt.receiptId, confirmed.receipt.receiptId);

  await assert.rejects(
    manager.execute({
      domain: 'test',
      action: 'save',
      accountId: 'account-1',
      entityType: 'preference',
      entityId: 'news',
      payload: { filter: 'security' },
      idempotencyKey: confirmed.intent.idempotencyKey,
      request: () => ({ value: true })
    }),
    (error) => error.code === 'DOKE_MUTATION_PAYLOAD_CONFLICT'
  );

  assert(events.some((event) => event.type === 'doke:mutation-deduped'));
  assert(events.some((event) => event.type === 'doke:mutation-receipt'));
  assert(events.some((event) => event.type === 'doke:mutation-state-changed'));
}

async function testConfirmedRejectionRollsBack() {
  const { manager } = createContext();
  let applied = 0;
  let rolledBack = 0;
  const rejectedError = new Error('rejected');
  rejectedError.code = 'VALIDATION_REJECTED';

  await assert.rejects(
    manager.execute({
      domain: 'test',
      action: 'reject',
      payload: { value: 1 },
      apply() {
        applied += 1;
        return { previous: true };
      },
      request() {
        throw rejectedError;
      },
      rollback(snapshot) {
        rolledBack += 1;
        assert.deepStrictEqual(snapshot, { previous: true });
      }
    }),
    (error) => error === rejectedError
  );
  assert.strictEqual(applied, 1);
  assert.strictEqual(rolledBack, 1, 'confirmed rejection must rollback');
}

async function testUnknownOutcomeAndReconciliation() {
  const { manager } = createContext();
  let ambiguousRollback = 0;
  const timeout = new Error('response lost');
  timeout.code = 'TIMEOUT';
  timeout.unknownOutcome = true;
  let unknownIntentId = '';

  try {
    await manager.execute({
      domain: 'test',
      action: 'ambiguous',
      payload: { value: 2 },
      apply: () => ({ previous: false }),
      request() {
        throw timeout;
      },
      rollback() {
        ambiguousRollback += 1;
      },
      commit(result) {
        assert.strictEqual(result.confirmed, true);
      },
      authority: 'reconciliation-test'
    });
    assert.fail('unknown outcome must reject the initial task');
  } catch (error) {
    assert.strictEqual(error, timeout);
    assert.strictEqual(error.mutation.state, manager.states.UNKNOWN_OUTCOME);
    unknownIntentId = error.mutation.intentId;
  }
  assert.strictEqual(ambiguousRollback, 0, 'unknown outcome must not rollback');

  const repeated = await manager.execute({
    intent: manager.createIntent({
      intentId: unknownIntentId,
      idempotencyKey: manager.get(unknownIntentId).idempotencyKey,
      domain: 'test',
      action: 'ambiguous',
      payloadFingerprint: manager.get(unknownIntentId).payloadFingerprint
    }),
    request: () => {
      throw new Error('must not resubmit');
    }
  });
  assert.strictEqual(repeated.replayed, true);
  assert.strictEqual(repeated.state, manager.states.UNKNOWN_OUTCOME);

  const reconciled = await manager.reconcile(unknownIntentId, () => ({
    confirmed: true,
    value: { persisted: true },
    authorityReceipt: {
      authority: 'server-reconciliation',
      authorityReference: 'test:1'
    }
  }));
  assert.strictEqual(reconciled.state, manager.states.CONFIRMED);
  assert.strictEqual(reconciled.receipt.authority, 'server-reconciliation');
  assert.strictEqual(ambiguousRollback, 0);

  await assert.rejects(
    manager.reconcile(unknownIntentId, () => ({ confirmed: true })),
    /not eligible/
  );
}

function testPilotSource() {
  const newsSource = fs.readFileSync(NEWS, 'utf8');
  assert(newsSource.includes('formMutationManager'), 'pilot must use the canonical manager');
  assert(newsSource.includes("action: 'save_preference'"), 'pilot action must be explicit');
  assert(newsSource.includes("authority: 'client-account-storage'"), 'pilot authority must be explicit');
  assert(newsSource.includes('doke:news-preference-saved'), 'pilot must expose a receipt event');
  assert(!newsSource.includes('experience?.optimistic?.mutate'), 'pilot must not use the legacy optimistic helper');
}

async function main() {
  await testApiAndFingerprint();
  await testSingleFlightReceiptAndReplay();
  await testConfirmedRejectionRollsBack();
  await testUnknownOutcomeAndReconciliation();
  testPilotSource();
  console.log('[test:ux-core-002] passed');
}

main().catch((error) => {
  console.error('[test:ux-core-002] failed');
  console.error(error);
  process.exit(1);
});
