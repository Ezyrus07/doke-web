'use strict';

const { assertIdempotencyKey } = require('../security/idempotency-contract');
const { assertRoutePermission } = require('../security/backend-permission-contract');
const { buildAuditEvent } = require('../security/audit-event-contract');
const {
  claimIdempotencyEntry,
  completeIdempotencyEntry,
  failIdempotencyEntry
} = require('../security/persistent-idempotency-store');

function createActionHandler(route, implementation) {
  if (!route || !route.name) throw new Error('createActionHandler requires a route definition.');
  if (!implementation || typeof implementation.execute !== 'function') {
    throw new Error(`Route ${route.name} requires an execute() implementation.`);
  }

  return async function routeHandler(context) {
    const requestContext = normalizeContext(context);
    const actor = requestContext.actor;

    assertRoutePermission(route, actor, requestContext);
    const idempotencyKey = route.idempotencyRequired ? assertIdempotencyKey(requestContext) : '';
    const idempotencyClaim = route.idempotencyRequired
      ? await claimIdempotencyEntry(route, requestContext, actor, idempotencyKey)
      : null;

    if (idempotencyClaim && idempotencyClaim.replay) {
      return Object.freeze({
        ok: true,
        route: route.name,
        replayed: true,
        idempotencyKey,
        data: idempotencyClaim.responseBody || null
      });
    }

    try {
      const result = await implementation.execute({
        route,
        context: requestContext,
        actor,
        idempotencyKey
      });

      if (route.auditRequired) {
        await recordAuditEvent(route, implementation, actor, requestContext, result, idempotencyKey);
      }

      await completeIdempotencyEntry(requestContext, idempotencyClaim, result);

      return Object.freeze({
        ok: true,
        route: route.name,
        data: result || null
      });
    } catch (error) {
      await failIdempotencyEntry(requestContext, idempotencyClaim, error).catch(() => null);
      throw error;
    }
  };
}

async function recordAuditEvent(route, implementation, actor, requestContext, result, idempotencyKey) {
  const event = buildAuditEvent(route, actor, requestContext, result, idempotencyKey);
  if (implementation.recordAudit) {
    await implementation.recordAudit(event, requestContext);
    return;
  }
  await recordDefaultAuditEvent(event, requestContext);
}

async function recordDefaultAuditEvent(event, context) {
  const serviceSupabase = context && context.serviceSupabase;
  if (!serviceSupabase || typeof serviceSupabase.from !== 'function') {
    const error = new Error('Audit-required routes require a configured server-side service-role client.');
    error.code = 'DOKE_AUDIT_STORE_UNAVAILABLE';
    error.status = 503;
    throw error;
  }
  const response = await serviceSupabase.from('admin_audit_events').insert({
    actor_id: event.actorId || null,
    actor_role: event.actorRole || 'guest',
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId || null,
    idempotency_key: event.idempotencyKey || null,
    metadata: event.metadata || {},
    created_at: event.createdAt
  });
  if (response && response.error) throw response.error;
}

function normalizeContext(context) {
  const safeContext = context && typeof context === 'object' ? context : {};
  return Object.freeze({
    params: safeContext.params || {},
    query: safeContext.query || {},
    body: safeContext.body || {},
    headers: safeContext.headers || {},
    actor: safeContext.actor || null,
    supabase: safeContext.supabase || null,
    serviceSupabase: safeContext.serviceSupabase || null,
    createUserSupabaseClient: safeContext.createUserSupabaseClient || null,
    requestId: safeContext.requestId || '',
    now: safeContext.now || new Date().toISOString()
  });
}

function notImplementedHandler(route) {
  return createActionHandler(route, {
    execute() {
      const error = new Error(`Route ${route.name} is registered but not implemented yet.`);
      error.code = 'DOKE_ENDPOINT_NOT_IMPLEMENTED';
      error.status = 501;
      throw error;
    }
  });
}

module.exports = Object.freeze({
  createActionHandler,
  notImplementedHandler,
  normalizeContext,
  recordDefaultAuditEvent
});
