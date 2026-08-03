'use strict';

const crypto = require('node:crypto');

const CONTRACT_VERSION = 'pay-provider-contract-v1';
const DEFAULT_CURRENCY = 'BRL';
const INTENT_STATES = Object.freeze([
  'requires_provider',
  'pending_provider',
  'requires_action',
  'authorized',
  'held',
  'released',
  'refunded',
  'failed',
  'cancelled',
  'disputed'
]);
const PROVIDER_ACKNOWLEDGEMENT_STATES = Object.freeze([
  'pending_provider',
  'requires_action',
  'authorized',
  'failed',
  'cancelled'
]);
const SENSITIVE_FIELD_PATTERN = /(^|_)(card(number)?|pan|cvv|cvc|security(code)?|track[12]?|magnetic|raw(card|payment)|full(card|pan))($|_)/i;

function normalizePaymentIntent(input) {
  const source = assertPlainObject(input, 'Payment intent input is required.');
  assertNoSensitivePaymentData(source);

  const orderId = requiredIdentifier(source.orderId, 'orderId', 180);
  const chargeMessageId = requiredIdentifier(source.chargeMessageId || source.messageId, 'chargeMessageId', 180);
  const clientId = requiredIdentifier(source.clientId, 'clientId', 180);
  const professionalId = requiredIdentifier(source.professionalId || source.providerId, 'professionalId', 180);
  const idempotencyKey = requiredIdentifier(source.idempotencyKey, 'idempotencyKey', 200);
  const currency = normalizeCurrency(source.currency || DEFAULT_CURRENCY);
  const grossAmountCents = positiveInteger(source.grossAmountCents, 'grossAmountCents');
  const chargedAmountCents = positiveInteger(source.chargedAmountCents == null ? grossAmountCents : source.chargedAmountCents, 'chargedAmountCents');
  const discountAmountCents = nonNegativeInteger(source.discountAmountCents == null ? grossAmountCents - chargedAmountCents : source.discountAmountCents, 'discountAmountCents');

  if (chargedAmountCents + discountAmountCents !== grossAmountCents) {
    throw contractError('DOKE_PAYMENT_INTENT_AMOUNT_MISMATCH', 'Charged amount plus discount must equal gross amount.', 422);
  }

  const intentKey = `payment_intent:${orderId}:${chargeMessageId}`;
  const requestPayload = Object.freeze({
    intentKey,
    orderId,
    chargeMessageId,
    clientId,
    professionalId,
    amount: Object.freeze({
      grossAmountCents,
      chargedAmountCents,
      discountAmountCents,
      currency
    }),
    captureStrategy: 'authorize_then_hold',
    metadata: normalizeMetadata(source.metadata)
  });

  return Object.freeze({
    contractVersion: CONTRACT_VERSION,
    intentKey,
    idempotencyKey,
    requestHash: hashCanonicalPayload(requestPayload),
    state: 'requires_provider',
    provider: null,
    providerIntentId: null,
    providerSelectionRequired: true,
    settlementAuthoritative: false,
    browserMayAssertProviderSuccess: false,
    request: requestPayload
  });
}

function assertIntentReplay(existing, candidate) {
  const left = assertPlainObject(existing, 'Existing payment intent is required.');
  const right = assertPlainObject(candidate, 'Candidate payment intent is required.');
  const sameKey = String(left.intentKey || '') === String(right.intentKey || '');
  const sameIdempotencyKey = String(left.idempotencyKey || '') === String(right.idempotencyKey || '');
  const sameHash = String(left.requestHash || '') === String(right.requestHash || '');
  if (!sameKey || !sameIdempotencyKey || !sameHash) {
    throw contractError('DOKE_PAYMENT_INTENT_IDEMPOTENCY_CONFLICT', 'Payment intent replay changed the logical command or payload.', 409);
  }
  return true;
}

function normalizeProviderIntentAcknowledgement(intent, acknowledgement) {
  const canonicalIntent = assertPlainObject(intent, 'Canonical payment intent is required.');
  const source = assertPlainObject(acknowledgement, 'Provider acknowledgement is required.');
  assertNoSensitivePaymentData(source);

  const provider = requiredIdentifier(source.provider, 'provider', 80).toLowerCase();
  const providerIntentId = requiredIdentifier(source.providerIntentId, 'providerIntentId', 200);
  const state = requiredIdentifier(source.state, 'state', 40).toLowerCase();
  if (!PROVIDER_ACKNOWLEDGEMENT_STATES.includes(state)) {
    throw contractError('DOKE_PAYMENT_PROVIDER_STATE_INVALID', `Provider acknowledgement state is not allowed: ${state}.`, 422);
  }

  return Object.freeze({
    contractVersion: CONTRACT_VERSION,
    intentKey: requiredIdentifier(canonicalIntent.intentKey, 'intentKey', 400),
    requestHash: requiredIdentifier(canonicalIntent.requestHash, 'requestHash', 128),
    provider,
    providerIntentId,
    state,
    nextAction: normalizeNextAction(source.nextAction),
    providerCreatedAt: normalizeIsoDate(source.providerCreatedAt),
    settlementAuthoritative: false,
    browserMayAssertProviderSuccess: false,
    providerEventRequiredForSettlement: true
  });
}

function normalizeNextAction(value) {
  if (value == null) return null;
  const source = assertPlainObject(value, 'Provider nextAction must be an object.');
  assertNoSensitivePaymentData(source);
  const type = requiredIdentifier(source.type, 'nextAction.type', 80).toLowerCase();
  const redirectUrl = source.redirectUrl == null ? '' : String(source.redirectUrl).trim();
  if (redirectUrl && !/^https:\/\//i.test(redirectUrl)) {
    throw contractError('DOKE_PAYMENT_NEXT_ACTION_URL_INVALID', 'Provider redirect URL must use HTTPS.', 422);
  }
  return Object.freeze({ type, redirectUrl: redirectUrl || null });
}

function assertNoSensitivePaymentData(value, path) {
  const location = path || 'payload';
  if (value == null) return true;
  if (Buffer.isBuffer(value)) return true;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSensitivePaymentData(item, `${location}[${index}]`));
    return true;
  }
  if (typeof value !== 'object') return true;

  Object.keys(value).forEach((key) => {
    const normalizedKey = String(key).replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    if (SENSITIVE_FIELD_PATTERN.test(normalizedKey)) {
      throw contractError('DOKE_PAYMENT_SENSITIVE_DATA_FORBIDDEN', `Sensitive payment field is forbidden at ${location}.${key}.`, 422);
    }
    assertNoSensitivePaymentData(value[key], `${location}.${key}`);
  });
  return true;
}

function normalizeMetadata(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  assertNoSensitivePaymentData(source, 'metadata');
  return Object.freeze(stripEmpty({
    source: limitedText(source.source, 64),
    clientRequestId: limitedText(source.clientRequestId, 120),
    requestId: limitedText(source.requestId, 120),
    locale: limitedText(source.locale, 20)
  }));
}

function hashCanonicalPayload(value) {
  return crypto.createHash('sha256').update(stableSerialize(value)).digest('hex');
}

function stableSerialize(value) {
  if (value === null || value === undefined) return JSON.stringify(value === undefined ? null : value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizeCurrency(value) {
  const currency = String(value || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw contractError('DOKE_PAYMENT_CURRENCY_INVALID', 'Payment currency must be an ISO 4217 alpha code.', 422);
  }
  return currency;
}

function normalizeIsoDate(value) {
  const text = String(value || '').trim();
  const timestamp = Date.parse(text);
  if (!text || !Number.isFinite(timestamp)) {
    throw contractError('DOKE_PAYMENT_PROVIDER_DATE_INVALID', 'Provider timestamp must be a valid ISO date.', 422);
  }
  return new Date(timestamp).toISOString();
}

function requiredIdentifier(value, field, maxLength) {
  const text = String(value == null ? '' : value).trim();
  if (!text || text.length > maxLength || /[\u0000-\u001f\u007f]/.test(text)) {
    throw contractError('DOKE_PAYMENT_INTENT_FIELD_INVALID', `Payment intent field ${field} is invalid.`, 422);
  }
  return text;
}

function positiveInteger(value, field) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw contractError('DOKE_PAYMENT_INTENT_AMOUNT_INVALID', `${field} must be a positive integer in minor currency units.`, 422);
  }
  return number;
}

function nonNegativeInteger(value, field) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw contractError('DOKE_PAYMENT_INTENT_AMOUNT_INVALID', `${field} must be a non-negative integer in minor currency units.`, 422);
  }
  return number;
}

function limitedText(value, maxLength) {
  const text = String(value == null ? '' : value).trim();
  return text ? text.slice(0, maxLength) : '';
}

function stripEmpty(value) {
  return Object.keys(value).reduce((result, key) => {
    if (value[key] !== '' && value[key] !== null && value[key] !== undefined) result[key] = value[key];
    return result;
  }, {});
}

function assertPlainObject(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw contractError('DOKE_PAYMENT_CONTRACT_INPUT_INVALID', message, 422);
  }
  return value;
}

function contractError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status || 400;
  return error;
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  DEFAULT_CURRENCY,
  INTENT_STATES,
  PROVIDER_ACKNOWLEDGEMENT_STATES,
  normalizePaymentIntent,
  assertIntentReplay,
  normalizeProviderIntentAcknowledgement,
  assertNoSensitivePaymentData,
  hashCanonicalPayload,
  stableSerialize,
  contractError
});
