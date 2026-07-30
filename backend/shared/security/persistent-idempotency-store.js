'use strict';

const {
  buildRequestHash,
  buildRequestHashPayload
} = require('./idempotency-contract');
const { inferEntityType } = require('./audit-event-contract');

const IDEMPOTENCY_SELECT = 'id,idempotency_key,actor_id,action,entity_type,entity_id,request_hash,status,response_body,expires_at,created_at,updated_at';
const IDEMPOTENCY_TABLE = 'api_idempotency_keys';

async function claimIdempotencyEntry(route, context, actor, idempotencyKey) {
  if (!route || !route.idempotencyRequired) {
    return Object.freeze({ required: false, key: '', requestHash: '' });
  }
  const serviceSupabase = requireServiceSupabase(context);
  const safeKey = String(idempotencyKey || '').trim();
  const requestHash = buildRequestHash(route, context, actor);
  const entityType = inferEntityType(route);
  const entityId = sanitizeNullableUuid(readEntityId(context));
  const actorId = sanitizeNullableUuid(actor && actor.id);

  const existing = await readIdempotencyEntry(serviceSupabase, safeKey);
  if (existing) return evaluateExistingEntry(existing, route, actorId, requestHash, context);

  const payload = {
    idempotency_key: safeKey,
    actor_id: actorId || null,
    action: route.name,
    entity_type: entityType,
    entity_id: entityId || null,
    request_hash: requestHash,
    status: 'claimed',
    response_body: null,
    expires_at: expiresAt(context)
  };

  const response = await serviceSupabase
    .from(IDEMPOTENCY_TABLE)
    .insert(payload)
    .select(IDEMPOTENCY_SELECT)
    .maybeSingle();

  if (response && response.error) {
    const racedEntry = await readIdempotencyEntry(serviceSupabase, safeKey).catch(() => null);
    if (racedEntry) return evaluateExistingEntry(racedEntry, route, actorId, requestHash, context);
    throw response.error;
  }

  return Object.freeze({
    required: true,
    replay: false,
    key: safeKey,
    requestHash,
    entry: response && response.data || payload
  });
}

async function completeIdempotencyEntry(context, claim, result) {
  if (!claim || !claim.required || claim.replay) return null;
  const serviceSupabase = requireServiceSupabase(context);
  const response = await serviceSupabase
    .from(IDEMPOTENCY_TABLE)
    .update({
      status: 'succeeded',
      response_body: normalizeResponseBody(result),
      updated_at: context && context.now || new Date().toISOString()
    })
    .eq('idempotency_key', claim.key)
    .eq('request_hash', claim.requestHash)
    .select(IDEMPOTENCY_SELECT)
    .maybeSingle();
  if (response && response.error) throw response.error;
  return response && response.data || null;
}

async function failIdempotencyEntry(context, claim, error) {
  if (!claim || !claim.required || claim.replay) return null;
  const serviceSupabase = safeServiceSupabase(context);
  if (!serviceSupabase) return null;
  const response = await serviceSupabase
    .from(IDEMPOTENCY_TABLE)
    .update({
      status: 'failed',
      response_body: {
        ok: false,
        error: {
          code: String(error && error.code || 'DOKE_RUNTIME_ERROR'),
          message: String(error && error.message || 'Runtime action failed.'),
          status: Number(error && error.status) || 500
        }
      },
      updated_at: context && context.now || new Date().toISOString()
    })
    .eq('idempotency_key', claim.key)
    .eq('request_hash', claim.requestHash);
  if (response && response.error) throw response.error;
  return true;
}

async function readIdempotencyEntry(serviceSupabase, idempotencyKey) {
  const response = await serviceSupabase
    .from(IDEMPOTENCY_TABLE)
    .select(IDEMPOTENCY_SELECT)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (response && response.error) throw response.error;
  return response && response.data || null;
}

function evaluateExistingEntry(existing, route, actorId, requestHash, context) {
  const existingActorId = sanitizeNullableUuid(existing.actor_id);
  const sameActor = !existingActorId && !actorId || existingActorId === actorId;
  const sameAction = String(existing.action || '') === String(route.name || '');
  const sameHash = String(existing.request_hash || '') === String(requestHash || '');

  if (!sameActor || !sameAction || !sameHash) {
    throw conflict('Idempotency key already exists for another actor, action or payload.');
  }

  if (isIdempotencyEntryExpired(existing, context)) throw expired();

  const status = String(existing.status || '').toLowerCase();
  if (status === 'succeeded') {
    return Object.freeze({
      required: true,
      replay: true,
      key: existing.idempotency_key,
      requestHash: existing.request_hash,
      responseBody: normalizeStoredResponseBody(existing.response_body),
      entry: existing
    });
  }

  if (status === 'claimed') throw inProgress();
  if (status === 'failed') throw failed();
  if (status === 'expired') throw expired();
  throw conflict(`Unsupported idempotency status: ${status || 'unknown'}.`);
}

function isIdempotencyEntryExpired(existing, context) {
  const expiresAtMs = Date.parse(existing && existing.expires_at || '');
  if (!Number.isFinite(expiresAtMs)) return false;
  const nowMs = Date.parse(context && context.now || new Date().toISOString());
  return Number.isFinite(nowMs) && nowMs >= expiresAtMs;
}

function normalizeResponseBody(result) {
  if (result === undefined) return null;
  return result;
}

function normalizeStoredResponseBody(value) {
  if (value === undefined) return null;
  return value;
}

function buildIdempotencyDebugPayload(route, context, actor) {
  return buildRequestHashPayload(route, context, actor);
}

function readEntityId(context) {
  const params = context && context.params || {};
  const body = context && context.body || {};
  return params.id || body.id || body.orderId || body.order_id || body.withdrawalId || body.withdrawal_id || body.disputeId || body.dispute_id || null;
}

function expiresAt(context) {
  const now = context && context.now ? new Date(context.now) : new Date();
  now.setHours(now.getHours() + 24);
  return now.toISOString();
}

function requireServiceSupabase(context) {
  const serviceSupabase = safeServiceSupabase(context);
  if (serviceSupabase) return serviceSupabase;
  const error = new Error('Persistent idempotency requires a configured server-side service-role client.');
  error.code = 'DOKE_IDEMPOTENCY_STORE_UNAVAILABLE';
  error.status = 503;
  throw error;
}

function safeServiceSupabase(context) {
  return context && context.serviceSupabase && typeof context.serviceSupabase.from === 'function' ? context.serviceSupabase : null;
}

function sanitizeNullableUuid(value) {
  const text = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : '';
}

function conflict(message) {
  const error = new Error(message || 'Idempotency conflict.');
  error.code = 'DOKE_IDEMPOTENCY_CONFLICT';
  error.status = 409;
  return error;
}

function inProgress() {
  const error = new Error('Idempotency key is already claimed and still processing.');
  error.code = 'DOKE_IDEMPOTENCY_IN_PROGRESS';
  error.status = 409;
  return error;
}

function failed() {
  const error = new Error('Previous request with this idempotency key failed. Use a new key after correcting the request.');
  error.code = 'DOKE_IDEMPOTENCY_FAILED';
  error.status = 409;
  return error;
}

function expired() {
  const error = new Error('Idempotency key has expired. Use a new key.');
  error.code = 'DOKE_IDEMPOTENCY_EXPIRED';
  error.status = 409;
  return error;
}

module.exports = Object.freeze({
  IDEMPOTENCY_TABLE,
  IDEMPOTENCY_SELECT,
  claimIdempotencyEntry,
  completeIdempotencyEntry,
  failIdempotencyEntry,
  isIdempotencyEntryExpired,
  buildIdempotencyDebugPayload
});
