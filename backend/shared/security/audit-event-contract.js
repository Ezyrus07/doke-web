'use strict';

function buildAuditEvent(route, actor, context, result, idempotencyKey) {
  return Object.freeze({
    actorId: actor && actor.id || null,
    actorRole: actor && actor.role || 'guest',
    action: route.name,
    entityType: inferEntityType(route),
    entityId: context && context.params && context.params.id || context && context.body && (context.body.id || context.body.orderId) || null,
    idempotencyKey: idempotencyKey || null,
    requestId: context && context.requestId || '',
    metadata: {
      scope: route.scope,
      method: route.method,
      path: route.path,
      resultStatus: result && (result.status || result.state) || null
    },
    createdAt: context && context.now || new Date().toISOString()
  });
}

function inferEntityType(route) {
  const name = String(route && route.name || 'unknown');
  if (name.startsWith('orders.')) return 'order';
  if (name.startsWith('messages.') || name.startsWith('conversations.')) return 'conversation';
  if (name.startsWith('notifications.')) return 'notification';
  if (name.startsWith('withdrawals.')) return 'withdrawal';
  if (name.startsWith('disputes.')) return 'dispute';
  if (name.startsWith('wallet.') || name.startsWith('receivables.')) return 'wallet';
  if (name.startsWith('auth.') || name.startsWith('users.') || name.startsWith('profiles.')) return 'identity';
  return 'system';
}

module.exports = Object.freeze({
  buildAuditEvent,
  inferEntityType
});
