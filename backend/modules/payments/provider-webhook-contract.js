'use strict';

const crypto = require('node:crypto');
const {
  assertNoSensitivePaymentData,
  hashCanonicalPayload,
  contractError
} = require('./payment-provider-contract');

const SIGNATURE_VERSION = 'v1';
const DEFAULT_TOLERANCE_SECONDS = 300;
const NORMALIZED_EVENT_TYPES = Object.freeze([
  'payment_intent.created',
  'payment.authorized',
  'payment.requires_action',
  'payment.held',
  'payment.released',
  'payment.refunded',
  'payment.failed',
  'payment.cancelled',
  'dispute.opened',
  'dispute.resolved'
]);
const TERMINAL_STATES = Object.freeze(['refunded', 'failed', 'cancelled']);

function verifyWebhookSignature(options) {
  const source = options && typeof options === 'object' ? options : {};
  const rawBody = normalizeRawBody(source.rawBody);
  const secret = String(source.secret || '');
  const parsed = parseSignatureHeader(source.signatureHeader);
  const toleranceSeconds = positiveTolerance(source.toleranceSeconds);
  const nowSeconds = normalizeNowSeconds(source.now);

  if (secret.length < 16) {
    throw contractError('DOKE_PAYMENT_WEBHOOK_SECRET_UNAVAILABLE', 'Webhook secret is unavailable or too short.', 503);
  }
  if (Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) {
    throw contractError('DOKE_PAYMENT_WEBHOOK_TIMESTAMP_INVALID', 'Webhook timestamp is outside the accepted replay window.', 401);
  }

  const signedPayload = `${parsed.timestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest();
  const valid = parsed.signatures.some((signature) => {
    if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
    const received = Buffer.from(signature, 'hex');
    return received.length === expected.length && crypto.timingSafeEqual(received, expected);
  });

  if (!valid) {
    throw contractError('DOKE_PAYMENT_WEBHOOK_SIGNATURE_INVALID', 'Webhook signature is invalid.', 401);
  }

  return Object.freeze({
    verified: true,
    version: SIGNATURE_VERSION,
    timestamp: parsed.timestamp,
    verifiedAt: new Date(nowSeconds * 1000).toISOString(),
    rawBodyHash: crypto.createHash('sha256').update(rawBody).digest('hex')
  });
}

function signWebhook(rawBody, secret, timestamp) {
  const body = normalizeRawBody(rawBody);
  const safeTimestamp = Number(timestamp);
  if (!Number.isSafeInteger(safeTimestamp) || safeTimestamp <= 0) {
    throw contractError('DOKE_PAYMENT_WEBHOOK_TIMESTAMP_INVALID', 'Webhook timestamp must be a positive Unix timestamp.', 422);
  }
  const signature = crypto.createHmac('sha256', String(secret || '')).update(`${safeTimestamp}.${body}`).digest('hex');
  return `t=${safeTimestamp},${SIGNATURE_VERSION}=${signature}`;
}

function parseSignatureHeader(value) {
  const header = String(value || '').trim();
  const pairs = header.split(',').map((part) => part.trim()).filter(Boolean);
  const timestampPair = pairs.find((part) => part.startsWith('t='));
  const signatures = pairs
    .filter((part) => part.startsWith(`${SIGNATURE_VERSION}=`))
    .map((part) => part.slice(SIGNATURE_VERSION.length + 1).trim())
    .filter(Boolean);
  const timestamp = Number(timestampPair && timestampPair.slice(2));

  if (!Number.isSafeInteger(timestamp) || timestamp <= 0 || !signatures.length) {
    throw contractError('DOKE_PAYMENT_WEBHOOK_SIGNATURE_MALFORMED', 'Webhook signature header is malformed.', 401);
  }
  return Object.freeze({ timestamp, signatures: Object.freeze(signatures) });
}

function normalizeProviderEvent(input, verification) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const verified = verification && verification.verified === true ? verification : null;
  if (!verified) {
    throw contractError('DOKE_PAYMENT_WEBHOOK_VERIFICATION_REQUIRED', 'Provider event normalization requires a verified signature.', 401);
  }
  assertNoSensitivePaymentData(source, 'providerEvent');

  const provider = requiredText(source.provider, 'provider', 80).toLowerCase();
  const eventId = requiredText(source.eventId || source.id, 'eventId', 200);
  const type = requiredText(source.type, 'type', 80).toLowerCase();
  if (!NORMALIZED_EVENT_TYPES.includes(type)) {
    throw contractError('DOKE_PAYMENT_PROVIDER_EVENT_TYPE_UNSUPPORTED', `Unsupported normalized provider event type: ${type}.`, 422);
  }

  const data = source.data && typeof source.data === 'object' && !Array.isArray(source.data) ? source.data : {};
  const occurredAt = normalizeIsoDate(source.occurredAt || source.createdAt);
  const event = {
    provider,
    eventId,
    type,
    occurredAt,
    intentKey: optionalText(data.intentKey || source.intentKey, 400),
    providerIntentId: optionalText(data.providerIntentId || source.providerIntentId, 200),
    orderId: optionalText(data.orderId || source.orderId, 180),
    paymentId: optionalText(data.paymentId || source.paymentId, 180),
    resolution: normalizeResolution(data.resolution || source.resolution),
    rawBodyHash: requiredText(verified.rawBodyHash, 'rawBodyHash', 128),
    verifiedAt: requiredText(verified.verifiedAt, 'verifiedAt', 64),
    signatureVersion: verified.version || SIGNATURE_VERSION
  };
  event.payloadHash = hashCanonicalPayload(event);
  return Object.freeze(event);
}

function reducePaymentState(currentState, event) {
  const current = String(currentState || 'requires_provider').trim().toLowerCase();
  const providerEvent = event && typeof event === 'object' ? event : {};
  const type = String(providerEvent.type || '').trim().toLowerCase();
  const target = targetStateForEvent(providerEvent);

  if (!target) {
    throw contractError('DOKE_PAYMENT_PROVIDER_EVENT_TYPE_UNSUPPORTED', `Unsupported provider event type: ${type || 'empty'}.`, 422);
  }
  if (target === current) {
    return Object.freeze({ applied: false, replayed: true, deferred: false, previousState: current, nextState: current, eventType: type });
  }
  if (TERMINAL_STATES.includes(current)) {
    throw contractError('DOKE_PAYMENT_TERMINAL_STATE_CONFLICT', `Terminal payment state ${current} cannot transition through ${type}.`, 409);
  }

  const allowed = allowedTransitions(current);
  if (!allowed.includes(target)) {
    return Object.freeze({
      applied: false,
      replayed: false,
      deferred: true,
      previousState: current,
      nextState: current,
      expectedStates: Object.freeze(allowed),
      eventType: type,
      reason: 'out_of_order'
    });
  }

  return Object.freeze({ applied: true, replayed: false, deferred: false, previousState: current, nextState: target, eventType: type });
}

function createSignedWebhookIngestionHandler(options) {
  const settings = options && typeof options === 'object' ? options : {};
  requireFunction(settings.resolveSecret, 'resolveSecret');
  requireFunction(settings.normalizeEvent, 'normalizeEvent');
  requireFunction(settings.applyEvent, 'applyEvent');
  if (!settings.eventLedger || typeof settings.eventLedger.claim !== 'function' || typeof settings.eventLedger.complete !== 'function' || typeof settings.eventLedger.fail !== 'function') {
    throw contractError('DOKE_PAYMENT_EVENT_LEDGER_UNAVAILABLE', 'A persistent provider event ledger is required.', 503);
  }

  return async function ingestSignedWebhook(request) {
    const source = request && typeof request === 'object' ? request : {};
    const provider = requiredText(source.provider, 'provider', 80).toLowerCase();
    const rawBody = normalizeRawBody(source.rawBody);
    const secret = await settings.resolveSecret(provider);
    if (!secret) {
      throw contractError('DOKE_PAYMENT_PROVIDER_NOT_CONFIGURED', 'Payment provider is not configured for signed webhook ingestion.', 503);
    }

    const verification = verifyWebhookSignature({
      rawBody,
      secret,
      signatureHeader: source.signatureHeader,
      toleranceSeconds: settings.toleranceSeconds,
      now: source.now || settings.now
    });

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      throw contractError('DOKE_PAYMENT_WEBHOOK_JSON_INVALID', 'Verified webhook body is not valid JSON.', 400);
    }

    const event = normalizeProviderEvent(
      await settings.normalizeEvent({ provider, payload, verification }),
      verification
    );
    const claim = await settings.eventLedger.claim(event);
    if (claim && claim.replay) {
      return Object.freeze({ accepted: true, replayed: true, provider, eventId: event.eventId, result: claim.responseBody || null });
    }

    try {
      const result = await settings.applyEvent(event);
      await settings.eventLedger.complete(claim, event, result);
      return Object.freeze({ accepted: true, replayed: false, provider, eventId: event.eventId, result: result || null });
    } catch (error) {
      await settings.eventLedger.fail(claim, event, error).catch(() => null);
      throw error;
    }
  };
}

function targetStateForEvent(event) {
  const type = String(event && event.type || '').toLowerCase();
  const map = {
    'payment_intent.created': 'pending_provider',
    'payment.requires_action': 'requires_action',
    'payment.authorized': 'authorized',
    'payment.held': 'held',
    'payment.released': 'released',
    'payment.refunded': 'refunded',
    'payment.failed': 'failed',
    'payment.cancelled': 'cancelled',
    'dispute.opened': 'disputed'
  };
  if (type === 'dispute.resolved') {
    const resolution = normalizeResolution(event && event.resolution);
    return resolution === 'refund' ? 'refunded' : resolution === 'release' ? 'released' : resolution === 'restore_hold' ? 'held' : '';
  }
  return map[type] || '';
}

function allowedTransitions(state) {
  const transitions = {
    requires_provider: ['pending_provider'],
    pending_provider: ['requires_action', 'authorized', 'held', 'failed', 'cancelled'],
    requires_action: ['authorized', 'held', 'failed', 'cancelled'],
    authorized: ['held', 'failed', 'cancelled'],
    held: ['released', 'refunded', 'disputed'],
    released: ['disputed'],
    disputed: ['held', 'released', 'refunded']
  };
  return transitions[state] ? transitions[state].slice() : [];
}

function normalizeResolution(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  if (!['refund', 'release', 'restore_hold'].includes(text)) {
    throw contractError('DOKE_PAYMENT_DISPUTE_RESOLUTION_INVALID', 'Dispute resolution is invalid.', 422);
  }
  return text;
}

function normalizeRawBody(value) {
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  if (typeof value === 'string') return value;
  throw contractError('DOKE_PAYMENT_WEBHOOK_RAW_BODY_REQUIRED', 'Signed webhook verification requires the untouched raw body.', 400);
}

function positiveTolerance(value) {
  if (value == null || value === '') return DEFAULT_TOLERANCE_SECONDS;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 30 || number > 900) {
    throw contractError('DOKE_PAYMENT_WEBHOOK_TOLERANCE_INVALID', 'Webhook tolerance must be between 30 and 900 seconds.', 500);
  }
  return number;
}

function normalizeNowSeconds(value) {
  if (value == null || value === '') return Math.floor(Date.now() / 1000);
  if (Number.isSafeInteger(Number(value)) && Number(value) > 0) return Number(value);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw contractError('DOKE_PAYMENT_WEBHOOK_CLOCK_INVALID', 'Webhook verification clock is invalid.', 500);
  }
  return Math.floor(timestamp / 1000);
}

function normalizeIsoDate(value) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) {
    throw contractError('DOKE_PAYMENT_PROVIDER_EVENT_DATE_INVALID', 'Provider event timestamp is invalid.', 422);
  }
  return new Date(timestamp).toISOString();
}

function requiredText(value, field, maxLength) {
  const text = String(value == null ? '' : value).trim();
  if (!text || text.length > maxLength || /[\u0000-\u001f\u007f]/.test(text)) {
    throw contractError('DOKE_PAYMENT_PROVIDER_EVENT_FIELD_INVALID', `Provider event field ${field} is invalid.`, 422);
  }
  return text;
}

function optionalText(value, maxLength) {
  const text = String(value == null ? '' : value).trim();
  return text ? text.slice(0, maxLength) : '';
}

function requireFunction(value, name) {
  if (typeof value !== 'function') {
    throw contractError('DOKE_PAYMENT_WEBHOOK_DEPENDENCY_INVALID', `Signed webhook ingestion requires ${name}().`, 500);
  }
}

module.exports = Object.freeze({
  SIGNATURE_VERSION,
  DEFAULT_TOLERANCE_SECONDS,
  NORMALIZED_EVENT_TYPES,
  TERMINAL_STATES,
  signWebhook,
  parseSignatureHeader,
  verifyWebhookSignature,
  normalizeProviderEvent,
  reducePaymentState,
  createSignedWebhookIngestionHandler
});
