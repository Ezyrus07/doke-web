'use strict';

const INTERNAL_ROLES = Object.freeze(['moderator', 'support', 'admin']);
const AUTHENTICATED_ROLES = Object.freeze(['client', 'professional', 'moderator', 'support', 'admin']);

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (value === 'provider') return 'professional';
  if (AUTHENTICATED_ROLES.includes(value) || value === 'guest') return value;
  return 'guest';
}

function isInternalRole(role) {
  return INTERNAL_ROLES.includes(normalizeRole(role));
}

function getActorRole(actor) {
  return normalizeRole(actor && (actor.role || actor.type));
}

function assertRoutePermission(route, actor, context) {
  const role = getActorRole(actor);
  const allowed = Array.isArray(route.allowedRoles) ? route.allowedRoles : [];
  const scope = route.scope || 'unknown';

  if (!allowed.includes(role)) {
    throw forbidden(`Role ${role} cannot execute ${route.name}.`, route, actor);
  }

  if (route.serviceRoleRequired && !isInternalRole(role)) {
    throw forbidden(`Route ${route.name} requires internal operator role.`, route, actor);
  }

  // Scope-specific checks belong to server actions backed by Supabase/RLS. The
  // framework-neutral skeleton records the required scope so each handler can
  // perform the correct lookup before mutation.
  if (!context || typeof context !== 'object') {
    throw forbidden(`Route ${route.name} requires request context for scope ${scope}.`, route, actor);
  }

  return true;
}

function forbidden(message, route, actor) {
  const error = new Error(message);
  error.code = 'DOKE_FORBIDDEN';
  error.status = 403;
  error.route = route && route.name;
  error.actorId = actor && actor.id;
  return error;
}

module.exports = Object.freeze({
  AUTHENTICATED_ROLES,
  INTERNAL_ROLES,
  normalizeRole,
  isInternalRole,
  getActorRole,
  assertRoutePermission
});
