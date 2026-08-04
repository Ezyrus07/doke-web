'use strict';

const {
  normalizePaymentIntent,
  assertIntentReplay,
  normalizeProviderIntentAcknowledgement,
  assertNoSensitivePaymentData,
  hashCanonicalPayload,
  contractError
} = require('./payment-provider-contract');
const {
  NORMALIZED_EVENT_TYPES,
  verifyWebhookSignature,
  normalizeProviderEvent
} = require('./provider-webhook-contract');
const {
  normalizeReconciliationSnapshot,
  compareReconciliationSnapshots
} = require('./payment-reconciliation-contract');

const ADAPTER_CONTRACT_VERSION = 'pay-provider-adapter-v1';
const HARNESS_VERSION = 'pay-provider-adapter-conformance-v1';
const REQUIRED_METHODS = Object.freeze([
  'getManifest',
  'createPaymentIntent',
  'normalizeWebhookEvent',
  'fetchPaymentSnapshot',
  'classifyError'
]);
const REQUIRED_CAPABILITIES = Object.freeze([
  'idempotent_payment_intent',
  'verified_webhook_normalization',
  'provider_snapshot_read',
  'no_raw_card_data',
  'server_only_secret_resolution',
  'verified_events_only_settlement',
  'no_direct_money_mutation'
]);
const ERROR_CATEGORIES = Object.freeze([
  'transient',
  'rate_limited',
  'authentication',
  'conflict',
  'permanent'
]);

async function runPaymentProviderAdapterConformance(adapter, options) {
  assertAdapterShape(adapter);
  const settings = options && typeof options === 'object' ? options : {};
  const nowSeconds = normalizeNowSeconds(settings.nowSeconds);
  const nowIso = new Date(nowSeconds * 1000).toISOString();
  const secret = String(settings.fixtureSecret || 'pay-a05-fixture-secret-32-bytes-minimum');
  const manifest = normalizeAdapterManifest(await adapter.getManifest(), settings.requiredCurrency || 'BRL');

  if (settings.expectedProviderKey && manifest.providerKey !== String(settings.expectedProviderKey).trim().toLowerCase()) {
    throw contractError('DOKE_PAYMENT_ADAPTER_PROVIDER_MISMATCH', 'Adapter provider key does not match the expected candidate.', 409);
  }

  const intentInput = Object.assign({
    orderId: 'order_pay_a05_fixture',
    chargeMessageId: 'charge_pay_a05_fixture',
    clientId: 'client_pay_a05_fixture',
    professionalId: 'professional_pay_a05_fixture',
    idempotencyKey: 'pay_a05_intent_fixture',
    grossAmountCents: 15000,
    chargedAmountCents: 15000,
    discountAmountCents: 0,
    currency: settings.requiredCurrency || 'BRL',
    metadata: {
      source: 'pay-a05-conformance',
      requestId: 'pay-a05-fixture-request'
    }
  }, settings.intentInput || {});
  const intent = normalizePaymentIntent(intentInput);

  const firstRaw = await adapter.createPaymentIntent(intent, fixtureContext(nowIso));
  assertNoSensitivePaymentData(firstRaw, 'adapterCreateIntentResult');
  const firstAcknowledgement = normalizeProviderIntentAcknowledgement(intent, firstRaw);
  assertAcknowledgementAuthority(firstAcknowledgement);

  const secondRaw = await adapter.createPaymentIntent(intent, fixtureContext(nowIso));
  const secondAcknowledgement = normalizeProviderIntentAcknowledgement(intent, secondRaw);
  assertSameAcknowledgement(firstAcknowledgement, secondAcknowledgement);

  const replayIntent = normalizePaymentIntent(Object.assign({}, intentInput));
  assertIntentReplay(intent, replayIntent);

  const driftIntent = normalizePaymentIntent(Object.assign({}, intentInput, {
    chargedAmountCents: intentInput.chargedAmountCents - 100,
    discountAmountCents: Number(intentInput.discountAmountCents || 0) + 100
  }));
  await expectAdapterError(
    () => adapter.createPaymentIntent(driftIntent, fixtureContext(nowIso)),
    'DOKE_PAYMENT_ADAPTER_IDEMPOTENCY_CONFLICT'
  );

  const rawBody = JSON.stringify({
    object_id: firstAcknowledgement.providerIntentId,
    event_id: 'event_pay_a05_fixture',
    event_type: 'payment.held',
    occurred_at: nowIso,
    order_id: intent.request.orderId,
    intent_key: intent.intentKey,
    payment_id: 'payment_pay_a05_fixture'
  });
  const signatureHeader = buildFixtureSignature(rawBody, secret, nowSeconds);
  const verification = verifyWebhookSignature({
    rawBody,
    secret,
    signatureHeader,
    now: nowSeconds
  });

  await expectAdapterError(
    () => adapter.normalizeWebhookEvent({
      provider: manifest.providerKey,
      payload: JSON.parse(rawBody),
      verification: null
    }),
    'DOKE_PAYMENT_ADAPTER_VERIFICATION_REQUIRED'
  );

  const normalizedByAdapter = await adapter.normalizeWebhookEvent({
    provider: manifest.providerKey,
    payload: JSON.parse(rawBody),
    verification
  });
  assertNoSensitivePaymentData(normalizedByAdapter, 'adapterNormalizedWebhook');
  const event = normalizeProviderEvent(normalizedByAdapter, verification);
  if (!manifest.eventTypes.includes(event.type)) {
    throw contractError('DOKE_PAYMENT_ADAPTER_EVENT_UNDECLARED', 'Adapter produced an event type outside its manifest.', 422);
  }

  const internalSnapshot = normalizeReconciliationSnapshot(settings.internalSnapshot || defaultInternalSnapshot({
    provider: manifest.providerKey,
    providerIntentId: firstAcknowledgement.providerIntentId,
    intentKey: intent.intentKey,
    orderId: intent.request.orderId,
    occurredAt: nowIso
  }));
  const providerSnapshotRaw = await adapter.fetchPaymentSnapshot({
    provider: manifest.providerKey,
    providerIntentId: firstAcknowledgement.providerIntentId,
    intentKey: intent.intentKey,
    orderId: intent.request.orderId
  }, fixtureContext(nowIso));
  assertNoSensitivePaymentData(providerSnapshotRaw, 'adapterProviderSnapshot');
  const providerSnapshot = normalizeReconciliationSnapshot(providerSnapshotRaw);
  const comparison = compareReconciliationSnapshots({
    internalSnapshot,
    providerSnapshot,
    detectedAt: nowIso
  });
  if (!comparison.matched) {
    throw contractError('DOKE_PAYMENT_ADAPTER_SNAPSHOT_MISMATCH', 'Adapter snapshot does not reconcile with the canonical fixture.', 409);
  }

  const classifications = Object.freeze({
    transient: normalizeErrorClassification(await adapter.classifyError(fixtureError('timeout', 'ETIMEDOUT')), 'transient'),
    rateLimited: normalizeErrorClassification(await adapter.classifyError(fixtureError('rate limited', 'RATE_LIMITED')), 'rate_limited'),
    authentication: normalizeErrorClassification(await adapter.classifyError(fixtureError('authentication failed', 'AUTHENTICATION_FAILED')), 'authentication'),
    conflict: normalizeErrorClassification(await adapter.classifyError(fixtureError('idempotency conflict', 'IDEMPOTENCY_CONFLICT')), 'conflict'),
    permanent: normalizeErrorClassification(await adapter.classifyError(fixtureError('invalid request', 'INVALID_REQUEST')), 'permanent')
  });
  assertClassificationSafety(classifications);

  const evidence = Object.freeze({
    adapterContractVersion: manifest.adapterContractVersion,
    harnessVersion: HARNESS_VERSION,
    providerKey: manifest.providerKey,
    manifestHash: hashCanonicalPayload(manifest),
    intentRequestHash: intent.requestHash,
    providerIntentId: firstAcknowledgement.providerIntentId,
    webhookEventId: event.eventId,
    webhookPayloadHash: event.payloadHash,
    providerSnapshotHash: providerSnapshot.snapshotHash,
    comparisonFingerprint: comparison.comparisonFingerprint,
    classifications,
    externalNetworkCalls: 0,
    remoteMutations: 0,
    moneyEffects: 0
  });

  return Object.freeze({
    passed: true,
    providerKey: manifest.providerKey,
    manifest,
    checks: Object.freeze([
      'manifest',
      'required_methods',
      'required_capabilities',
      'intent_idempotency',
      'intent_payload_drift',
      'settlement_authority_denial',
      'verified_webhook_normalization',
      'provider_snapshot_reconciliation',
      'sensitive_data_rejection',
      'error_classification'
    ]),
    evidence,
    evidenceHash: hashCanonicalPayload(evidence)
  });
}

function normalizeAdapterManifest(input, requiredCurrency) {
  const source = plainObject(input, 'Adapter manifest is required.');
  const adapterContractVersion = text(source.adapterContractVersion, 'adapterContractVersion', 80);
  if (adapterContractVersion !== ADAPTER_CONTRACT_VERSION) {
    throw contractError('DOKE_PAYMENT_ADAPTER_VERSION_UNSUPPORTED', 'Adapter contract version is unsupported.', 422);
  }
  const providerKey = text(source.providerKey, 'providerKey', 80).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(providerKey)) {
    throw contractError('DOKE_PAYMENT_ADAPTER_PROVIDER_INVALID', 'Adapter provider key is invalid.', 422);
  }
  const capabilities = uniqueStrings(source.capabilities, 'capabilities', 80);
  REQUIRED_CAPABILITIES.forEach((capability) => {
    if (!capabilities.includes(capability)) {
      throw contractError('DOKE_PAYMENT_ADAPTER_CAPABILITY_MISSING', `Adapter capability is missing: ${capability}.`, 422);
    }
  });
  const currencies = uniqueStrings(source.currencies, 'currencies', 3).map((item) => item.toUpperCase());
  const currency = String(requiredCurrency || 'BRL').toUpperCase();
  if (!currencies.includes(currency)) {
    throw contractError('DOKE_PAYMENT_ADAPTER_CURRENCY_UNSUPPORTED', `Adapter does not declare required currency ${currency}.`, 422);
  }
  const eventTypes = uniqueStrings(source.eventTypes, 'eventTypes', 80);
  NORMALIZED_EVENT_TYPES.forEach((eventType) => {
    if (!eventTypes.includes(eventType)) {
      throw contractError('DOKE_PAYMENT_ADAPTER_EVENT_TYPE_MISSING', `Adapter event type is missing: ${eventType}.`, 422);
    }
  });
  const captureStrategies = uniqueStrings(source.captureStrategies, 'captureStrategies', 80);
  if (!captureStrategies.includes('authorize_then_hold')) {
    throw contractError('DOKE_PAYMENT_ADAPTER_CAPTURE_STRATEGY_MISSING', 'Adapter must support authorize_then_hold.', 422);
  }
  if (source.browserAccessible !== false
      || source.rawCardDataAccepted !== false
      || source.directMoneyMutationAllowed !== false
      || source.settlementAuthority !== 'verified_provider_events_only'
      || source.secretResolution !== 'server_runtime_only') {
    throw contractError('DOKE_PAYMENT_ADAPTER_AUTHORITY_INVALID', 'Adapter manifest grants forbidden payment authority.', 422);
  }
  return Object.freeze({
    adapterContractVersion,
    providerKey,
    capabilities: Object.freeze(capabilities),
    currencies: Object.freeze(currencies),
    eventTypes: Object.freeze(eventTypes),
    captureStrategies: Object.freeze(captureStrategies),
    browserAccessible: false,
    rawCardDataAccepted: false,
    directMoneyMutationAllowed: false,
    settlementAuthority: 'verified_provider_events_only',
    secretResolution: 'server_runtime_only'
  });
}

function assertAdapterShape(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw contractError('DOKE_PAYMENT_ADAPTER_UNAVAILABLE', 'Payment provider adapter is unavailable.', 503);
  }
  REQUIRED_METHODS.forEach((method) => {
    if (typeof adapter[method] !== 'function') {
      throw contractError('DOKE_PAYMENT_ADAPTER_METHOD_MISSING', `Payment adapter method is missing: ${method}.`, 500);
    }
  });
}

function assertAcknowledgementAuthority(acknowledgement) {
  if (acknowledgement.settlementAuthoritative !== false
      || acknowledgement.browserMayAssertProviderSuccess !== false
      || acknowledgement.providerEventRequiredForSettlement !== true) {
    throw contractError('DOKE_PAYMENT_ADAPTER_SETTLEMENT_AUTHORITY_INVALID', 'Adapter acknowledgement asserted forbidden settlement authority.', 422);
  }
}

function assertSameAcknowledgement(left, right) {
  if (left.provider !== right.provider
      || left.providerIntentId !== right.providerIntentId
      || left.state !== right.state
      || left.requestHash !== right.requestHash) {
    throw contractError('DOKE_PAYMENT_ADAPTER_IDEMPOTENCY_BROKEN', 'Idempotent payment intent replay changed the provider acknowledgement.', 409);
  }
}

function normalizeErrorClassification(input, expectedCategory) {
  const source = plainObject(input, 'Adapter error classification is required.');
  const category = String(source.category || '').trim().toLowerCase();
  if (!ERROR_CATEGORIES.includes(category) || category !== expectedCategory) {
    throw contractError('DOKE_PAYMENT_ADAPTER_ERROR_CLASSIFICATION_INVALID', `Adapter error category must be ${expectedCategory}.`, 422);
  }
  return Object.freeze({
    category,
    retryable: source.retryable === true,
    safeToRetry: source.safeToRetry === true
  });
}

function assertClassificationSafety(classifications) {
  if (!classifications.transient.retryable || !classifications.transient.safeToRetry) {
    throw contractError('DOKE_PAYMENT_ADAPTER_RETRY_POLICY_INVALID', 'Transient idempotent operations must be classified as safe to retry.', 422);
  }
  if (!classifications.rateLimited.retryable || !classifications.rateLimited.safeToRetry) {
    throw contractError('DOKE_PAYMENT_ADAPTER_RETRY_POLICY_INVALID', 'Rate-limited idempotent operations must be classified as safe to retry.', 422);
  }
  ['authentication', 'conflict', 'permanent'].forEach((key) => {
    if (classifications[key].retryable || classifications[key].safeToRetry) {
      throw contractError('DOKE_PAYMENT_ADAPTER_RETRY_POLICY_INVALID', `${key} errors must fail closed without automatic retry.`, 422);
    }
  });
}

async function expectAdapterError(factory, expectedCode) {
  let caught = null;
  try {
    await factory();
  } catch (error) {
    caught = error;
  }
  if (!caught || caught.code !== expectedCode) {
    throw contractError(
      'DOKE_PAYMENT_ADAPTER_NEGATIVE_CASE_FAILED',
      `Adapter negative case must reject with ${expectedCode}.`,
      422
    );
  }
  return caught;
}

function defaultInternalSnapshot(input) {
  return {
    authority: 'doke',
    provider: input.provider,
    intentKey: input.intentKey,
    providerIntentId: input.providerIntentId,
    orderId: input.orderId,
    paymentId: 'payment_pay_a05_fixture',
    state: 'held',
    currency: 'BRL',
    grossAmountCents: 15000,
    feeAmountCents: 1500,
    netAmountCents: 13500,
    releasedAmountCents: 0,
    refundedAmountCents: 0,
    settlementReference: null,
    eventLedgerStatus: 'succeeded',
    observedAt: input.occurredAt,
    providerUpdatedAt: input.occurredAt,
    metadata: { source: 'pay-a05-conformance' }
  };
}

function fixtureContext(nowIso) {
  return Object.freeze({
    mode: 'local_fixture_only',
    networkAllowed: false,
    remoteMutationAllowed: false,
    productionAllowed: false,
    now: nowIso
  });
}

function fixtureError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function buildFixtureSignature(rawBody, secret, timestamp) {
  const crypto = require('node:crypto');
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

function normalizeNowSeconds(value) {
  if (value == null || value === '') return 1785762480;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw contractError('DOKE_PAYMENT_ADAPTER_CLOCK_INVALID', 'Adapter conformance clock is invalid.', 500);
  }
  return number;
}

function uniqueStrings(value, field, maxLength) {
  if (!Array.isArray(value) || !value.length) {
    throw contractError('DOKE_PAYMENT_ADAPTER_MANIFEST_INVALID', `Adapter manifest ${field} must be a non-empty array.`, 422);
  }
  const list = value.map((item) => text(item, field, maxLength));
  return [...new Set(list)];
}

function text(value, field, maxLength) {
  const result = String(value == null ? '' : value).trim();
  if (!result || result.length > maxLength || /[\u0000-\u001f\u007f]/.test(result)) {
    throw contractError('DOKE_PAYMENT_ADAPTER_MANIFEST_INVALID', `Adapter manifest field ${field} is invalid.`, 422);
  }
  return result;
}

function plainObject(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw contractError('DOKE_PAYMENT_ADAPTER_INPUT_INVALID', message, 422);
  }
  return value;
}

function isSha(value) {
  return /^[0-9a-f]{40}$/i.test(String(value || '').trim());
}

module.exports = Object.freeze({
  ADAPTER_CONTRACT_VERSION,
  HARNESS_VERSION,
  REQUIRED_METHODS,
  REQUIRED_CAPABILITIES,
  ERROR_CATEGORIES,
  normalizeAdapterManifest,
  runPaymentProviderAdapterConformance
});
