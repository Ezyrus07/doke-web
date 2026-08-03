'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  normalizePaymentIntent,
  normalizeProviderIntentAcknowledgement,
  assertNoSensitivePaymentData
} = require('../backend/modules/payments/payment-provider-contract');
const {
  verifyWebhookSignature,
  normalizeProviderEvent,
  reducePaymentState
} = require('../backend/modules/payments/provider-webhook-contract');
const {
  normalizeReconciliationSnapshot,
  compareReconciliationSnapshots
} = require('../backend/modules/payments/payment-reconciliation-contract');
const {
  claimEvent,
  completeEvent
} = require('../backend/modules/payments/provider-event-ledger');
const {
  CONTRACT_VERSION,
  CAPABILITY_NAMES,
  assertProviderAdapter,
  normalizeProviderAdapterManifest,
  assertProviderCapability,
  normalizeProviderHealth,
  normalizeErrorClassification
} = require('../backend/modules/payments/payment-provider-adapter-contract');

const NOW_SECONDS = 1785762480;
const NOW_ISO = new Date(NOW_SECONDS * 1000).toISOString();
const SECRET = 'pay-a05-fixture-secret-32-bytes-minimum';

function expectCode(factory, code) {
  let caught = null;
  try {
    factory();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, `Expected ${code}.`);
  assert.equal(caught.code, code);
}

async function expectCodeAsync(factory, code) {
  let caught = null;
  try {
    await factory();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, `Expected ${code}.`);
  assert.equal(caught.code, code);
}

function financialCapabilities() {
  const result = Object.fromEntries(CAPABILITY_NAMES.map((name) => [name, false]));
  ['authorize', 'hold', 'signed_webhooks', 'idempotency', 'reconciliation'].forEach((name) => { result[name] = true; });
  result.refund_total = true;
  result.cancellation = true;
  return result;
}

function fixtureAdapter() {
  const intents = new Map();
  return {
    async getManifest() {
      return {
        adapterContractVersion: CONTRACT_VERSION,
        adapterVersion: 'fixture-adapter-1.0.0-pay-a05',
        providerKey: 'fixture-adapter',
        financialCapabilities: financialCapabilities(),
        currencies: ['BRL'],
        browserAccessible: false,
        rawCardDataAccepted: false,
        directMoneyMutationAllowed: false,
        localUuidMutationFallbackAllowed: false,
        secretResolution: 'server_runtime_only',
        settlementAuthority: 'verified_provider_events_only'
      };
    },
    async checkHealth(context) {
      assert.equal(context.networkAllowed, false);
      assert.equal(context.remoteMutationAllowed, false);
      return {
        providerKey: 'fixture-adapter',
        status: 'ready',
        effectFree: true,
        networkAccessed: false,
        remoteMutationPerformed: false,
        moneyEffectPerformed: false,
        productionAccessed: false
      };
    },
    async createPaymentIntent(intent, context) {
      assert.equal(context.productionAllowed, false);
      const existing = intents.get(intent.idempotencyKey);
      if (existing && existing.requestHash !== intent.requestHash) {
        const error = new Error('Idempotency payload drift.');
        error.code = 'DOKE_PAYMENT_ADAPTER_IDEMPOTENCY_CONFLICT';
        throw error;
      }
      if (existing) return existing.acknowledgement;
      const acknowledgement = {
        provider: 'fixture-adapter',
        providerIntentId: 'provider_intent_pay_a05_fixture',
        state: 'authorized',
        providerCreatedAt: NOW_ISO
      };
      intents.set(intent.idempotencyKey, { requestHash: intent.requestHash, acknowledgement });
      return acknowledgement;
    },
    async getPaymentIntent(query, context) {
      assert.equal(context.networkAllowed, false);
      const entry = [...intents.values()].find((item) => item.acknowledgement.providerIntentId === query.providerIntentId);
      if (!entry) {
        const error = new Error('Provider object unavailable.');
        error.code = 'PROVIDER_UNAVAILABLE';
        throw error;
      }
      return entry.acknowledgement;
    },
    async normalizeIntentAcknowledgement(intent, acknowledgement) {
      return normalizeProviderIntentAcknowledgement(intent, acknowledgement);
    },
    async normalizeWebhookEvent(input) {
      if (!input.verification || input.verification.verified !== true) {
        const error = new Error('Verified signature required.');
        error.code = 'DOKE_PAYMENT_ADAPTER_VERIFICATION_REQUIRED';
        throw error;
      }
      return {
        provider: 'fixture-adapter',
        eventId: input.payload.event_id,
        type: input.payload.event_type,
        occurredAt: input.payload.occurred_at,
        data: {
          intentKey: input.payload.intent_key,
          providerIntentId: input.payload.object_id,
          orderId: input.payload.order_id,
          paymentId: input.payload.payment_id
        }
      };
    },
    async fetchPaymentSnapshot(query, context) {
      assert.equal(context.remoteMutationAllowed, false);
      return providerSnapshot(query);
    },
    async classifyError(error) {
      const map = {
        ETIMEDOUT: ['transient', true],
        RATE_LIMITED: ['rate_limited', true],
        AUTHENTICATION_FAILED: ['authentication', false],
        IDEMPOTENCY_CONFLICT: ['conflict', false],
        PROVIDER_UNAVAILABLE: ['provider_unavailable', true],
        INCOMPLETE_RESPONSE: ['incomplete_response', false]
      };
      const [category, retry] = map[error && error.code] || ['permanent', false];
      return { category, retryable: retry, safeToRetry: retry };
    }
  };
}

function providerSnapshot(query) {
  return {
    authority: 'provider',
    provider: query.provider,
    intentKey: query.intentKey,
    providerIntentId: query.providerIntentId,
    orderId: query.orderId,
    paymentId: 'payment_pay_a05_fixture',
    state: 'held',
    currency: 'BRL',
    grossAmountCents: 15000,
    feeAmountCents: 1500,
    netAmountCents: 13500,
    releasedAmountCents: 0,
    refundedAmountCents: 0,
    settlementReference: null,
    eventLedgerStatus: 'not_applicable',
    observedAt: NOW_ISO,
    providerUpdatedAt: NOW_ISO,
    metadata: { source: 'pay-a05-fixture' }
  };
}

function internalSnapshot(query) {
  return Object.assign({}, providerSnapshot(query), {
    authority: 'doke',
    eventLedgerStatus: 'succeeded'
  });
}

function fixtureContext() {
  return Object.freeze({
    mode: 'local_fixture_only',
    networkAllowed: false,
    remoteMutationAllowed: false,
    productionAllowed: false,
    now: NOW_ISO
  });
}

function signature(rawBody, secret, timestamp) {
  const value = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return `t=${timestamp},v1=${value}`;
}

function fakeServiceStore() {
  const rows = new Map();
  function query(operation, payload) {
    const filters = [];
    const chain = {
      select() { return chain; },
      eq(field, value) { filters.push([field, value]); return chain; },
      insert(value) { operation = 'insert'; payload = value; return chain; },
      update(value) { operation = 'update'; payload = value; return chain; },
      async maybeSingle() {
        const keyFilter = filters.find(([field]) => field === 'idempotency_key');
        const key = keyFilter && keyFilter[1] || payload && payload.idempotency_key;
        if (operation === 'insert') {
          if (rows.has(key)) return { data: null, error: new Error('duplicate') };
          const row = Object.assign({}, payload);
          rows.set(key, row);
          return { data: row, error: null };
        }
        if (operation === 'update') {
          const row = rows.get(key);
          if (!row) return { data: null, error: null };
          Object.assign(row, payload);
          return { data: row, error: null };
        }
        return { data: rows.get(key) || null, error: null };
      },
      then(resolve, reject) { return chain.maybeSingle().then(resolve, reject); }
    };
    return chain;
  }
  return { from() { return query('select', null); } };
}

async function main() {
  const adapter = fixtureAdapter();
  assert.equal(assertProviderAdapter(adapter), true);
  const manifest = normalizeProviderAdapterManifest(await adapter.getManifest(), 'BRL');
  assert.equal(manifest.adapterVersion, 'fixture-adapter-1.0.0-pay-a05');
  assert.equal(assertProviderCapability(manifest, 'authorize'), true);
  expectCode(() => assertProviderCapability(manifest, 'payout'), 'DOKE_PAYMENT_ADAPTER_CAPABILITY_UNSUPPORTED');
  const health = normalizeProviderHealth(await adapter.checkHealth(fixtureContext()), manifest.providerKey);
  assert.equal(health.effectFree, true);

  const intentInput = {
    orderId: 'order_pay_a05_fixture',
    chargeMessageId: 'charge_pay_a05_fixture',
    clientId: 'client_pay_a05_fixture',
    professionalId: 'professional_pay_a05_fixture',
    idempotencyKey: 'pay_a05_intent_fixture',
    grossAmountCents: 15000,
    chargedAmountCents: 15000,
    discountAmountCents: 0,
    currency: 'BRL'
  };
  const intent = normalizePaymentIntent(intentInput);
  const firstRaw = await adapter.createPaymentIntent(intent, fixtureContext());
  const first = await adapter.normalizeIntentAcknowledgement(intent, firstRaw);
  assert.equal(first.settlementAuthoritative, false);
  const queried = await adapter.getPaymentIntent({ provider: manifest.providerKey, providerIntentId: first.providerIntentId }, fixtureContext());
  assert.equal(queried.providerIntentId, first.providerIntentId);
  const drift = normalizePaymentIntent(Object.assign({}, intentInput, { chargedAmountCents: 14900, discountAmountCents: 100 }));
  await expectCodeAsync(() => adapter.createPaymentIntent(drift, fixtureContext()), 'DOKE_PAYMENT_ADAPTER_IDEMPOTENCY_CONFLICT');
  expectCode(() => assertNoSensitivePaymentData({ pan: '4111111111111111' }), 'DOKE_PAYMENT_SENSITIVE_DATA_FORBIDDEN');
  expectCode(() => normalizeProviderIntentAcknowledgement(intent, { provider: 'fixture-adapter' }), 'DOKE_PAYMENT_INTENT_FIELD_INVALID');

  const rawBody = JSON.stringify({
    object_id: first.providerIntentId,
    event_id: 'event_pay_a05_fixture',
    event_type: 'payment.held',
    occurred_at: NOW_ISO,
    order_id: intent.request.orderId,
    intent_key: intent.intentKey,
    payment_id: 'payment_pay_a05_fixture'
  });
  const header = signature(rawBody, SECRET, NOW_SECONDS);
  const verification = verifyWebhookSignature({ rawBody, secret: SECRET, signatureHeader: header, now: NOW_SECONDS });
  expectCode(() => verifyWebhookSignature({ rawBody, secret: SECRET, signatureHeader: signature(rawBody, SECRET + '-wrong', NOW_SECONDS), now: NOW_SECONDS }), 'DOKE_PAYMENT_WEBHOOK_SIGNATURE_INVALID');
  expectCode(() => verifyWebhookSignature({ rawBody, secret: SECRET, signatureHeader: header, now: NOW_SECONDS + 301 }), 'DOKE_PAYMENT_WEBHOOK_TIMESTAMP_INVALID');
  expectCode(() => verifyWebhookSignature({ rawBody: JSON.parse(rawBody), secret: SECRET, signatureHeader: header, now: NOW_SECONDS }), 'DOKE_PAYMENT_WEBHOOK_RAW_BODY_REQUIRED');
  await expectCodeAsync(() => adapter.normalizeWebhookEvent({ provider: manifest.providerKey, payload: JSON.parse(rawBody), verification: null }), 'DOKE_PAYMENT_ADAPTER_VERIFICATION_REQUIRED');
  const normalized = normalizeProviderEvent(await adapter.normalizeWebhookEvent({ payload: JSON.parse(rawBody), verification }), verification);
  const replay = normalizeProviderEvent(await adapter.normalizeWebhookEvent({ payload: JSON.parse(rawBody), verification }), verification);
  assert.equal(replay.payloadHash, normalized.payloadHash);
  assert.equal(reducePaymentState('held', normalized).replayed, true);
  assert.equal(reducePaymentState('held', Object.assign({}, normalized, { type: 'payment.authorized' })).deferred, true);
  expectCode(() => reducePaymentState('refunded', Object.assign({}, normalized, { type: 'payment.held' })), 'DOKE_PAYMENT_TERMINAL_STATE_CONFLICT');

  const query = { provider: manifest.providerKey, providerIntentId: first.providerIntentId, intentKey: intent.intentKey, orderId: intent.request.orderId };
  const matched = compareReconciliationSnapshots({
    internalSnapshot: normalizeReconciliationSnapshot(internalSnapshot(query)),
    providerSnapshot: normalizeReconciliationSnapshot(await adapter.fetchPaymentSnapshot(query, fixtureContext())),
    detectedAt: NOW_ISO
  });
  assert.equal(matched.matched, true);
  assert.equal(matched.automaticMoneyMutationAllowed, false);
  const divergentProvider = providerSnapshot(query);
  divergentProvider.feeAmountCents += 100;
  divergentProvider.netAmountCents -= 100;
  const divergent = compareReconciliationSnapshots({ internalSnapshot: internalSnapshot(query), providerSnapshot: divergentProvider, detectedAt: NOW_ISO });
  assert.equal(divergent.matched, false);
  assert.equal(divergent.automaticResolutionAllowed, false);
  assert.equal(divergent.automaticMoneyMutationAllowed, false);

  const classifications = [
    ['ETIMEDOUT', 'transient'],
    ['RATE_LIMITED', 'rate_limited'],
    ['AUTHENTICATION_FAILED', 'authentication'],
    ['IDEMPOTENCY_CONFLICT', 'conflict'],
    ['PROVIDER_UNAVAILABLE', 'provider_unavailable'],
    ['INCOMPLETE_RESPONSE', 'incomplete_response'],
    ['INVALID_REQUEST', 'permanent']
  ];
  for (const [code, category] of classifications) {
    const error = new Error(code);
    error.code = code;
    normalizeErrorClassification(await adapter.classifyError(error), category);
  }

  const serviceStore = fakeServiceStore();
  const ledgerEvent = { provider: normalized.provider, eventId: normalized.eventId, payloadHash: normalized.payloadHash };
  const claim = await claimEvent(serviceStore, ledgerEvent, NOW_ISO, 24);
  assert.equal(claim.replay, false);
  await expectCodeAsync(() => claimEvent(serviceStore, ledgerEvent, NOW_ISO, 24), 'DOKE_PAYMENT_PROVIDER_EVENT_IN_PROGRESS');
  await expectCodeAsync(() => claimEvent(serviceStore, Object.assign({}, ledgerEvent, { payloadHash: 'b'.repeat(64) }), NOW_ISO, 24), 'DOKE_PAYMENT_PROVIDER_EVENT_CONFLICT');
  await completeEvent(serviceStore, claim, ledgerEvent, { accepted: true }, NOW_ISO);
  const replayClaim = await claimEvent(serviceStore, ledgerEvent, NOW_ISO, 24);
  assert.equal(replayClaim.replay, true);

  console.log('PAY-A05 explicit adapter contract and extended conformance test passed.');
}

main().catch((error) => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
