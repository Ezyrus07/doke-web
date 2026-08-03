'use strict';

const { contractError } = require('./payment-provider-contract');

const IDEMPOTENCY_TABLE = 'api_idempotency_keys';
const EVENT_ACTION = 'payments.providerWebhook.ingest';
const EVENT_ENTITY_TYPE = 'payment_provider_event';
const EVENT_SELECT = 'id,idempotency_key,actor_id,action,entity_type,entity_id,request_hash,status,response_body,expires_at,created_at,updated_at';

function createProviderEventLedger(options) {
  const settings = options && typeof options === 'object' ? options : {};
  const serviceSupabase = settings.serviceSupabase;
  if (!serviceSupabase || typeof serviceSupabase.from !== 'function') {
    throw contractError('DOKE_PAYMENT_EVENT_LEDGER_UNAVAILABLE', 'Provider event ledger requires a server-side service-role client.', 503);
  }
  const ttlHours = normalizeTtlHours(settings.ttlHours);

  return Object.freeze({
    claim(event) {
      return claimEvent(serviceSupabase, event, settings.now, ttlHours);
    },
    complete(claim, event, result) {
      return completeEvent(serviceSupabase, claim, event, result, settings.now);
    },
    fail(claim, event, error) {
      return failEvent(serviceSupabase, claim, event, error, settings.now);
    }
  });
}

async function claimEvent(serviceSupabase, event, now, ttlHours) {
  const normalized = normalizeLedgerEvent(event);
  const key = buildProviderEventKey(normalized);
  const existing = await readEntry(serviceSupabase, key);
  if (existing) return evaluateExisting(existing, normalized, now);

  const payload = {
    idempotency_key: key,
    actor_id: null,
    action: EVENT_ACTION,
    entity_type: EVENT_ENTITY_TYPE,
    entity_id: null,
    request_hash: normalized.payloadHash,
    status: 'claimed',
    response_body: null,
    expires_at: expiresAt(now, ttlHours)
  };
  const response = await serviceSupabase
    .from(IDEMPOTENCY_TABLE)
    .insert(payload)
    .select(EVENT_SELECT)
    .maybeSingle();

  if (response && response.error) {
    const raced = await readEntry(serviceSupabase, key).catch(() => null);
    if (raced) return evaluateExisting(raced, normalized, now);
    throw response.error;
  }

  return Object.freeze({
    required: true,
    replay: false,
    key,
    requestHash: normalized.payloadHash,
    entry: response && response.data || payload
  });
}

async function completeEvent(serviceSupabase, claim, event, result, now) {
  if (!claim || claim.replay) return null;
  const normalized = normalizeLedgerEvent(event);
  assertClaimMatches(claim, normalized);
  const responseBody = sanitizeLedgerResponse(result);
  const response = await serviceSupabase
    .from(IDEMPOTENCY_TABLE)
    .update({
      status: 'succeeded',
      response_body: responseBody,
      updated_at: normalizeNow(now)
    })
    .eq('idempotency_key', claim.key)
    .eq('request_hash', claim.requestHash)
    .select(EVENT_SELECT)
    .maybeSingle();
  if (response && response.error) throw response.error;
  return response && response.data || null;
}

async function failEvent(serviceSupabase, claim, event, error, now) {
  if (!claim || claim.replay) return null;
  const normalized = normalizeLedgerEvent(event);
  assertClaimMatches(claim, normalized);
  const response = await serviceSupabase
    .from(IDEMPOTENCY_TABLE)
    .update({
      status: 'failed',
      response_body: {
        ok: false,
        error: {
          code: String(error && error.code || 'DOKE_PAYMENT_PROVIDER_EVENT_FAILED').slice(0, 120),
          message: String(error && error.message || 'Provider event processing failed.').slice(0, 500),
          status: Number(error && error.status) || 500
        }
      },
      updated_at: normalizeNow(now)
    })
    .eq('idempotency_key', claim.key)
    .eq('request_hash', claim.requestHash);
  if (response && response.error) throw response.error;
  return true;
}

async function readEntry(serviceSupabase, key) {
  const response = await serviceSupabase
    .from(IDEMPOTENCY_TABLE)
    .select(EVENT_SELECT)
    .eq('idempotency_key', key)
    .maybeSingle();
  if (response && response.error) throw response.error;
  return response && response.data || null;
}

function evaluateExisting(existing, event, now) {
  const sameAction = String(existing.action || '') === EVENT_ACTION;
  const sameEntityType = String(existing.entity_type || '') === EVENT_ENTITY_TYPE;
  const sameHash = String(existing.request_hash || '') === String(event.payloadHash || '');
  const actorIsServerOwned = existing.actor_id == null || String(existing.actor_id || '') === '';
  if (!sameAction || !sameEntityType || !sameHash || !actorIsServerOwned) {
    throw contractError('DOKE_PAYMENT_PROVIDER_EVENT_CONFLICT', 'Provider event ID was reused with another payload or authority.', 409);
  }
  if (isExpired(existing, now)) {
    throw contractError('DOKE_PAYMENT_PROVIDER_EVENT_EXPIRED', 'Provider event ledger entry expired and requires reconciliation.', 409);
  }

  const status = String(existing.status || '').toLowerCase();
  if (status === 'succeeded') {
    return Object.freeze({
      required: true,
      replay: true,
      key: existing.idempotency_key,
      requestHash: existing.request_hash,
      responseBody: existing.response_body == null ? null : existing.response_body,
      entry: existing
    });
  }
  if (status === 'claimed') {
    throw contractError('DOKE_PAYMENT_PROVIDER_EVENT_IN_PROGRESS', 'Provider event is already being processed.', 409);
  }
  if (status === 'failed') {
    throw contractError('DOKE_PAYMENT_PROVIDER_EVENT_PREVIOUSLY_FAILED', 'Provider event previously failed and requires operator reconciliation.', 409);
  }
  throw contractError('DOKE_PAYMENT_PROVIDER_EVENT_STATUS_INVALID', `Unsupported provider event ledger status: ${status || 'unknown'}.`, 409);
}

function buildProviderEventKey(event) {
  const normalized = normalizeLedgerEvent(event);
  return `pay:webhook:${normalized.provider}:${normalized.eventId}`.slice(0, 240);
}

function normalizeLedgerEvent(event) {
  const source = event && typeof event === 'object' ? event : {};
  const provider = String(source.provider || '').trim().toLowerCase();
  const eventId = String(source.eventId || '').trim();
  const payloadHash = String(source.payloadHash || '').trim().toLowerCase();
  if (!provider || !eventId || !/^[0-9a-f]{64}$/.test(payloadHash)) {
    throw contractError('DOKE_PAYMENT_PROVIDER_EVENT_INVALID', 'Provider event ledger identity is invalid.', 422);
  }
  return Object.freeze({ provider, eventId, payloadHash });
}

function assertClaimMatches(claim, event) {
  if (String(claim.key || '') !== buildProviderEventKey(event) || String(claim.requestHash || '') !== event.payloadHash) {
    throw contractError('DOKE_PAYMENT_PROVIDER_EVENT_CLAIM_MISMATCH', 'Provider event claim does not match the normalized event.', 409);
  }
}

function sanitizeLedgerResponse(value) {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value));
}

function isExpired(entry, now) {
  const expiresAtMs = Date.parse(entry && entry.expires_at || '');
  if (!Number.isFinite(expiresAtMs)) return false;
  return Date.parse(normalizeNow(now)) >= expiresAtMs;
}

function expiresAt(now, ttlHours) {
  const date = new Date(normalizeNow(now));
  date.setHours(date.getHours() + ttlHours);
  return date.toISOString();
}

function normalizeNow(value) {
  if (!value) return new Date().toISOString();
  const resolved = typeof value === 'function' ? value() : value;
  const timestamp = Date.parse(resolved);
  if (!Number.isFinite(timestamp)) {
    throw contractError('DOKE_PAYMENT_EVENT_LEDGER_CLOCK_INVALID', 'Provider event ledger clock is invalid.', 500);
  }
  return new Date(timestamp).toISOString();
}

function normalizeTtlHours(value) {
  if (value == null || value === '') return 24 * 30;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 24 || number > 24 * 365) {
    throw contractError('DOKE_PAYMENT_EVENT_LEDGER_TTL_INVALID', 'Provider event ledger TTL must be between one day and one year.', 500);
  }
  return number;
}

module.exports = Object.freeze({
  IDEMPOTENCY_TABLE,
  EVENT_ACTION,
  EVENT_ENTITY_TYPE,
  EVENT_SELECT,
  createProviderEventLedger,
  buildProviderEventKey,
  claimEvent,
  completeEvent,
  failEvent
});
