'use strict';

const ORDER_STATUSES = Object.freeze([
  'draft',
  'requested',
  'quoted',
  'accepted',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'disputed'
]);

const INTERNAL_ROLES = Object.freeze(['support', 'admin', 'moderator', 'system', 'service_role']);

const STATUS_ALIASES = Object.freeze({
  pending: 'requested',
  request: 'requested',
  conversation: 'accepted',
  quote: 'quoted',
  responded: 'quoted',
  progress: 'in_progress',
  complete: 'completed',
  canceled: 'cancelled',
  dispute: 'disputed',
  under_review: 'disputed',
  released: 'completed',
  refunded: 'cancelled'
});

const TRANSITIONS = Object.freeze({
  draft: Object.freeze(['requested', 'cancelled']),
  requested: Object.freeze(['accepted', 'quoted', 'cancelled']),
  accepted: Object.freeze(['quoted', 'in_progress', 'cancelled']),
  quoted: Object.freeze(['accepted', 'in_progress', 'cancelled']),
  scheduled: Object.freeze(['in_progress', 'cancelled']),
  in_progress: Object.freeze(['completed', 'cancelled', 'disputed']),
  completed: Object.freeze(['disputed']),
  disputed: Object.freeze(['completed', 'cancelled']),
  cancelled: Object.freeze([])
});

const ACTION_RULES = Object.freeze({
  accept: Object.freeze({
    roles: Object.freeze(['professional']),
    from: Object.freeze(['requested']),
    to: 'accepted',
    allowSameStatus: false
  }),
  decline: Object.freeze({
    roles: Object.freeze(['professional']),
    from: Object.freeze(['requested', 'accepted', 'quoted', 'scheduled', 'in_progress']),
    to: 'cancelled',
    allowSameStatus: false
  }),
  quote: Object.freeze({
    roles: Object.freeze(['professional']),
    from: Object.freeze(['requested', 'accepted', 'quoted']),
    to: 'quoted',
    allowSameStatus: true
  }),
  charge: Object.freeze({
    roles: Object.freeze(['professional']),
    from: Object.freeze(['quoted']),
    to: 'quoted',
    allowSameStatus: true
  }),
  start: Object.freeze({
    roles: Object.freeze(['professional']),
    from: Object.freeze(['accepted', 'quoted', 'scheduled']),
    to: 'in_progress',
    allowSameStatus: false
  }),
  complete: Object.freeze({
    roles: Object.freeze(['professional']),
    from: Object.freeze(['in_progress']),
    to: 'completed',
    allowSameStatus: false
  }),
  updateStatus: Object.freeze({
    roles: INTERNAL_ROLES,
    from: ORDER_STATUSES,
    to: null,
    allowSameStatus: true
  })
});

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeStatus(value) {
  const raw = String(value || '').trim().toLowerCase();
  const normalized = STATUS_ALIASES[raw] || raw;
  if (!ORDER_STATUSES.includes(normalized)) {
    throw createError('DOKE_ORDER_STATUS_INVALID', `Invalid order status: ${value || ''}`, 400, {
      status: value || ''
    });
  }
  return normalized;
}

function isInternalRole(role) {
  return INTERNAL_ROLES.includes(normalizeRole(role));
}

function getAllowedTransitions(currentStatus, actorRole) {
  const current = normalizeStatus(currentStatus);
  const role = normalizeRole(actorRole);
  const candidates = TRANSITIONS[current] || [];

  if (isInternalRole(role)) return candidates.slice();

  return candidates.filter((next) => isRoleTransitionAllowed(current, next, role));
}

function isRoleTransitionAllowed(currentStatus, nextStatus, actorRole) {
  const current = normalizeStatus(currentStatus);
  const next = normalizeStatus(nextStatus);
  const role = normalizeRole(actorRole);

  if (isInternalRole(role)) return (TRANSITIONS[current] || []).includes(next);

  if (role === 'professional') {
    return {
      draft: [],
      requested: ['accepted', 'quoted', 'cancelled'],
      accepted: ['quoted', 'in_progress', 'cancelled'],
      quoted: ['in_progress', 'cancelled'],
      scheduled: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled', 'disputed'],
      completed: ['disputed'],
      disputed: [],
      cancelled: []
    }[current].includes(next);
  }

  if (role === 'client') {
    return {
      draft: ['requested', 'cancelled'],
      requested: ['cancelled'],
      accepted: ['cancelled'],
      quoted: ['accepted', 'in_progress', 'cancelled'],
      scheduled: ['cancelled'],
      in_progress: ['completed', 'cancelled', 'disputed'],
      completed: ['disputed'],
      disputed: [],
      cancelled: []
    }[current].includes(next);
  }

  return false;
}

function canTransition(input) {
  const details = input || {};
  const current = normalizeStatus(details.currentStatus);
  const next = normalizeStatus(details.nextStatus);
  const role = normalizeRole(details.actorRole);
  const action = String(details.action || 'updateStatus').trim();
  const rule = ACTION_RULES[action];

  if (!rule) return false;
  if (!rule.roles.includes(role)) return false;
  if (!rule.from.includes(current)) return false;
  if (rule.to && rule.to !== next) return false;

  if (current === next) return rule.allowSameStatus === true;
  if (!(TRANSITIONS[current] || []).includes(next)) return false;
  return isRoleTransitionAllowed(current, next, role);
}

function assertTransition(input) {
  const details = input || {};
  const current = normalizeStatus(details.currentStatus);
  const next = normalizeStatus(details.nextStatus);
  const role = normalizeRole(details.actorRole);
  const action = String(details.action || 'updateStatus').trim();

  if (next === 'scheduled') {
    throw createError(
      'DOKE_ORDER_SCHEDULE_AUTHORITY_REQUIRED',
      'The scheduled status can be projected only by a confirmed canonical schedule reservation.',
      409,
      { currentStatus: current, nextStatus: next, actorRole: role, action }
    );
  }

  if (canTransition({ currentStatus: current, nextStatus: next, actorRole: role, action })) {
    return Object.freeze({ currentStatus: current, nextStatus: next, actorRole: role, action });
  }

  const allowed = getAllowedTransitions(current, role);
  throw createError(
    'DOKE_ORDER_TRANSITION_INVALID',
    `Order transition ${current} -> ${next} is not allowed for ${role || 'unknown'} using ${action}.`,
    409,
    { currentStatus: current, nextStatus: next, actorRole: role, action, allowedTransitions: allowed }
  );
}

function createError(code, message, status, details) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.details = Object.freeze(Object.assign({}, details || {}));
  return error;
}

module.exports = Object.freeze({
  ORDER_STATUSES,
  INTERNAL_ROLES,
  STATUS_ALIASES,
  TRANSITIONS,
  ACTION_RULES,
  normalizeStatus,
  normalizeRole,
  isInternalRole,
  isRoleTransitionAllowed,
  getAllowedTransitions,
  canTransition,
  assertTransition
});
