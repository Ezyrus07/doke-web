'use strict';

const assert = require('node:assert/strict');
const {
  normalizePaymentIntent,
  assertIntentReplay,
  normalizeProviderIntentAcknowledgement
} = require('../backend/modules/payments/payment-provider-contract');
const {
  signWebhook,
  verifyWebhookSignature,
  normalizeProviderEvent,
  reducePaymentState,
  createSignedWebhookIngestionHandler
} = require('../backend/modules/payments/provider-webhook-contract');
const {
  createProviderEventLedger,
  buildProviderEventKey
} = require('../backend/modules/payments/provider-event-ledger');

const NOW_SECONDS = 1785761700;
const NOW_ISO = new Date(NOW_SECONDS * 1000).toISOString();
const SECRET = 'pay-a03-local-contract-secret-32-bytes';

function baseIntent(overrides) {
  return Object.assign({
    orderId: 'order_fixture_001',
    chargeMessageId: 'message_fixture_001',
    clientId: 'client_fixture_001',
    professionalId: 'professional_fixture_001',
    idempotencyKey: 'pay_a03_intent_fixture_001',
    grossAmountCents: 12500,
    chargedAmountCents: 12000,
    discountAmountCents: 500,
    currency: 'BRL',
    metadata: { source: 'pay-a03-runtime', clientRequestId: 'request-fixture-001', locale: 'pt-BR' }
  }, overrides || {});
}

function createMemorySupabase() {
  const rows = new Map();
  return {
    rows,
    from(table) {
      assert.equal(table, 'api_idempotency_keys');
      let operation = 'select';
      let payload = null;
      const filters = [];
      const builder = {
        select() { return builder; },
        insert(value) { operation = 'insert'; payload = Object.assign({}, value); return builder; },
        update(value) { operation = 'update'; payload = Object.assign({}, value); return builder; },
        eq(field, value) { filters.push([field, value]); return builder; },
        async maybeSingle() {
          const matches = (row) => filters.every(([field, value]) => String(row[field] == null ? '' : row[field]) === String(value == null ? '' : value));
          if (operation === 'insert') {
            if (rows.has(payload.idempotency_key)) return { data: null, error: new Error('duplicate') };
            const row = Object.assign({ id: `ledger_${rows.size + 1}`, created_at: NOW_ISO, updated_at: NOW_ISO }, payload);
            rows.set(row.idempotency_key, row);
            return { data: Object.assign({}, row), error: null };
          }
          if (operation === 'update') {
            const row = [...rows.values()].find(matches) || null;
            if (!row) return { data: null, error: null };
            Object.assign(row, payload);
            return { data: Object.assign({}, row), error: null };
          }
          const row = [...rows.values()].find(matches) || null;
          return { data: row ? Object.assign({}, row) : null, error: null };
        },
        then(resolve, reject) { return builder.maybeSingle().then(resolve, reject); }
      };
      return builder;
    }
  };
}

async function expectReject(promiseFactory, code) {
  let captured = null;
  try { await promiseFactory(); }
  catch (error) { captured = error; }
  assert(captured, `Expected rejection ${code}.`);
  assert.equal(captured.code, code);
  return captured;
}

async function main() {
  const intent = normalizePaymentIntent(baseIntent());
  assert.equal(intent.contractVersion, 'pay-provider-contract-v1');
  assert.equal(intent.state, 'requires_provider');
  assert.equal(intent.request.amount.grossAmountCents, 12500);
  assert.equal(intent.request.amount.chargedAmountCents + intent.request.amount.discountAmountCents, 12500);
  assert.match(intent.requestHash, /^[0-9a-f]{64}$/);
  assert.equal(intent.providerSelectionRequired, true);
  assert.equal(intent.settlementAuthoritative, false);
  assertIntentReplay(intent, normalizePaymentIntent(baseIntent()));

  assert.throws(
    () => assertIntentReplay(intent, normalizePaymentIntent(baseIntent({ chargedAmountCents: 11900, discountAmountCents: 600 }))),
    (error) => error.code === 'DOKE_PAYMENT_INTENT_IDEMPOTENCY_CONFLICT'
  );
  assert.throws(
    () => normalizePaymentIntent(baseIntent({ cardNumber: '4111111111111111' })),
    (error) => error.code === 'DOKE_PAYMENT_SENSITIVE_DATA_FORBIDDEN'
  );
  assert.throws(
    () => normalizePaymentIntent(baseIntent({ chargedAmountCents: 12000, discountAmountCents: 400 })),
    (error) => error.code === 'DOKE_PAYMENT_INTENT_AMOUNT_MISMATCH'
  );

  const acknowledgement = normalizeProviderIntentAcknowledgement(intent, {
    provider: 'fixture-adapter',
    providerIntentId: 'provider_intent_fixture_001',
    state: 'authorized',
    providerCreatedAt: NOW_ISO
  });
  assert.equal(acknowledgement.provider, 'fixture-adapter');
  assert.equal(acknowledgement.state, 'authorized');
  assert.equal(acknowledgement.settlementAuthoritative, false);
  assert.equal(acknowledgement.providerEventRequiredForSettlement, true);

  const rawBody = JSON.stringify({
    id: 'provider_event_fixture_001',
    type: 'payment.held',
    createdAt: NOW_ISO,
    data: {
      intentKey: intent.intentKey,
      providerIntentId: acknowledgement.providerIntentId,
      orderId: intent.request.orderId,
      paymentId: 'payment_fixture_001'
    }
  });
  const signatureHeader = signWebhook(rawBody, SECRET, NOW_SECONDS);
  const verification = verifyWebhookSignature({ rawBody, secret: SECRET, signatureHeader, now: NOW_SECONDS });
  assert.equal(verification.verified, true);
  assert.match(verification.rawBodyHash, /^[0-9a-f]{64}$/);

  await expectReject(
    () => Promise.resolve().then(() => verifyWebhookSignature({ rawBody, secret: SECRET, signatureHeader: signatureHeader.replace(/.$/, '0'), now: NOW_SECONDS })),
    'DOKE_PAYMENT_WEBHOOK_SIGNATURE_INVALID'
  );
  await expectReject(
    () => Promise.resolve().then(() => verifyWebhookSignature({ rawBody, secret: SECRET, signatureHeader, now: NOW_SECONDS + 301 })),
    'DOKE_PAYMENT_WEBHOOK_TIMESTAMP_INVALID'
  );

  const normalizedEvent = normalizeProviderEvent({
    provider: 'fixture-adapter',
    eventId: 'provider_event_fixture_001',
    type: 'payment.held',
    occurredAt: NOW_ISO,
    data: JSON.parse(rawBody).data
  }, verification);
  assert.equal(normalizedEvent.type, 'payment.held');
  assert.match(normalizedEvent.payloadHash, /^[0-9a-f]{64}$/);
  assert.equal(reducePaymentState('authorized', normalizedEvent).nextState, 'held');
  assert.equal(reducePaymentState('held', normalizedEvent).replayed, true);
  assert.equal(reducePaymentState('requires_provider', normalizedEvent).deferred, true);
  assert.throws(
    () => reducePaymentState('refunded', Object.assign({}, normalizedEvent, { type: 'payment.released' })),
    (error) => error.code === 'DOKE_PAYMENT_TERMINAL_STATE_CONFLICT'
  );

  const memorySupabase = createMemorySupabase();
  const eventLedger = createProviderEventLedger({ serviceSupabase: memorySupabase, now: NOW_ISO, ttlHours: 720 });
  let appliedCount = 0;
  const handler = createSignedWebhookIngestionHandler({
    now: NOW_SECONDS,
    resolveSecret(provider) { return provider === 'fixture-adapter' ? SECRET : ''; },
    normalizeEvent({ provider, payload }) {
      return {
        provider,
        eventId: payload.id,
        type: payload.type,
        occurredAt: payload.createdAt,
        data: payload.data
      };
    },
    eventLedger,
    applyEvent(event) {
      appliedCount += 1;
      return { transition: reducePaymentState('authorized', event), appliedCount };
    }
  });

  const first = await handler({ provider: 'fixture-adapter', rawBody, signatureHeader, now: NOW_SECONDS });
  assert.equal(first.accepted, true);
  assert.equal(first.replayed, false);
  assert.equal(appliedCount, 1);
  assert(memorySupabase.rows.has(buildProviderEventKey(normalizedEvent)));

  const replay = await handler({ provider: 'fixture-adapter', rawBody, signatureHeader, now: NOW_SECONDS });
  assert.equal(replay.accepted, true);
  assert.equal(replay.replayed, true);
  assert.equal(appliedCount, 1);

  const driftedBody = JSON.stringify(Object.assign({}, JSON.parse(rawBody), { data: Object.assign({}, JSON.parse(rawBody).data, { paymentId: 'payment_fixture_drift' }) }));
  const driftedSignature = signWebhook(driftedBody, SECRET, NOW_SECONDS);
  await expectReject(
    () => handler({ provider: 'fixture-adapter', rawBody: driftedBody, signatureHeader: driftedSignature, now: NOW_SECONDS }),
    'DOKE_PAYMENT_PROVIDER_EVENT_CONFLICT'
  );
  assert.equal(appliedCount, 1);

  await expectReject(
    () => handler({ provider: 'unconfigured-adapter', rawBody, signatureHeader, now: NOW_SECONDS }),
    'DOKE_PAYMENT_PROVIDER_NOT_CONFIGURED'
  );

  let normalizeCalls = 0;
  const invalidSignatureHandler = createSignedWebhookIngestionHandler({
    now: NOW_SECONDS,
    resolveSecret() { return SECRET; },
    normalizeEvent() { normalizeCalls += 1; return {}; },
    eventLedger,
    applyEvent() { throw new Error('must not run'); }
  });
  await expectReject(
    () => invalidSignatureHandler({ provider: 'fixture-adapter', rawBody: '{not-json', signatureHeader: 't=1,v1=00', now: NOW_SECONDS }),
    'DOKE_PAYMENT_WEBHOOK_TIMESTAMP_INVALID'
  );
  assert.equal(normalizeCalls, 0, 'signature verification must happen before JSON parsing and normalization');

  console.log('PAY-A03 PSP-neutral intent and signed webhook runtime test passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
