(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var authContract = Doke.authDomainContract || null;

  var SECURITY_AUDIT_KEY = 'doke.security.audit.v1';
  var DEMO_PROFESSIONAL_ID = 'user_profissional_demo';

  var ROLE_PERMISSIONS = authContract?.rolePermissions || {
    guest: ['read_public_services', 'read_public_profiles', 'read_public_communities'],
    client: ['read_public_services', 'read_public_profiles', 'read_public_communities', 'create_order', 'message_professional', 'review_completed_order', 'save_favorite'],
    professional: ['read_public_services', 'read_public_profiles', 'read_public_communities', 'create_service', 'manage_own_services', 'respond_budget', 'message_client', 'manage_availability', 'request_payout'],
    moderator: ['read_public_services', 'read_public_profiles', 'read_public_communities', 'review_reports', 'moderate_content', 'suspend_content'],
    support: ['read_public_services', 'read_public_profiles', 'read_public_communities', 'view_support_queue', 'resolve_dispute', 'resolve_withdrawal', 'view_audit_events'],
    admin: ['*']
  };

  var ORDER_ACTIONS = Object.freeze({
    READ: 'read_order',
    CREATE: 'create_order',
    ACCEPT: 'accept_order',
    DECLINE: 'decline_order',
    QUOTE: 'quote_order',
    START: 'start_order',
    COMPLETE: 'complete_order',
    UPDATE_STATUS: 'update_order_status'
  });

  var MESSAGE_ACTIONS = Object.freeze({
    READ: 'read_conversation',
    SEND: 'send_message',
    MARK_READ: 'mark_conversation_read',
    SYNC_ORDER: 'sync_conversation_order'
  });

  var WALLET_ACTIONS = Object.freeze({
    READ: 'read_wallet',
    SAVE_BANK_ACCOUNT: 'save_bank_account',
    REQUEST_WITHDRAW: 'request_withdraw',
    OPEN_DISPUTE: 'open_dispute',
    RESPOND_DISPUTE: 'respond_dispute',
    RESOLVE_DISPUTE: 'resolve_dispute',
    RESOLVE_WITHDRAWAL: 'resolve_withdrawal',
    VIEW_AUDIT_EVENTS: 'view_audit_events'
  });

  function safeParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeId(value) {
    return normalizeText(value);
  }

  function normalizeRole(role) {
    if (authContract?.normalizeRole) return authContract.normalizeRole(role);
    var value = String(role || '').trim().toLowerCase();
    if (value === 'pro' || value === 'worker') return 'professional';
    if (value === 'user' || value === 'customer') return 'client';
    if (ROLE_PERMISSIONS[value]) return value;
    return 'guest';
  }

  function getCurrentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') {
      var user = Doke.session.getCurrentUser();
      if (user) return user;
    }

    var session = safeParse(root.localStorage && root.localStorage.getItem('doke.auth.session.v1'), null);
    return session && session.user ? session.user : null;
  }

  function permissionsForRole(role) {
    return ROLE_PERMISSIONS[normalizeRole(role)] || ROLE_PERMISSIONS.guest;
  }

  function has(permission, roleOrPermissions) {
    var permissions = Array.isArray(roleOrPermissions)
      ? roleOrPermissions
      : permissionsForRole(roleOrPermissions || 'guest');
    return permissions.indexOf('*') >= 0 || permissions.indexOf(permission) >= 0;
  }

  function createPermissionError(permission, metadata) {
    var error = new Error('Permission denied: ' + permission);
    error.code = 'permission_denied';
    error.permission = permission;
    error.metadata = metadata || {};
    return error;
  }

  function auditSecurityEvent(event) {
    event = event || {};
    var actor = event.actor || getCurrentUser() || {};
    var record = {
      id: 'security_audit_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
      type: normalizeText(event.type || 'security_event'),
      action: normalizeText(event.action || ''),
      result: normalizeText(event.result || 'observed'),
      resource: normalizeText(event.resource || ''),
      resourceId: normalizeText(event.resourceId || ''),
      actorId: normalizeText(event.actorId || actor.id || ''),
      actorRole: normalizeRole(event.actorRole || actor.role || actor.type),
      actorName: normalizeText(event.actorName || actor.name || ''),
      reason: normalizeText(event.reason || ''),
      metadata: event.metadata && typeof event.metadata === 'object' ? event.metadata : {},
      createdAt: new Date().toISOString()
    };

    try {
      var current = safeParse(root.localStorage.getItem(SECURITY_AUDIT_KEY), []);
      var items = Array.isArray(current) ? current : [];
      root.localStorage.setItem(SECURITY_AUDIT_KEY, JSON.stringify([record].concat(items).slice(0, 120)));
    } catch (error) {
      // localStorage can be unavailable; runtime event below still surfaces the audit record.
    }

    try {
      document.dispatchEvent(new CustomEvent('doke:security-audit-event', { detail: { event: record } }));
    } catch (error) {
      // Document can be unavailable in isolated tests.
    }

    return record;
  }

  function assert(permission, roleOrPermissions, metadata) {
    if (!has(permission, roleOrPermissions)) {
      auditSecurityEvent({
        type: 'permission_denied',
        action: permission,
        result: 'denied',
        reason: 'missing_permission',
        metadata: metadata || {}
      });
      throw createPermissionError(permission, metadata);
    }
    return true;
  }

  function isInternalRole(role) {
    if (authContract?.isInternalRole) return authContract.isInternalRole(role);
    var normalized = normalizeRole(role);
    return normalized === 'support' || normalized === 'admin' || normalized === 'moderator';
  }

  function isSupportRole(role) {
    if (authContract?.isSupportRole) return authContract.isSupportRole(role);
    var normalized = normalizeRole(role);
    return normalized === 'support' || normalized === 'admin';
  }

  function canAccessAdmin(user) {
    if (authContract?.canAccessAdmin) return authContract.canAccessAdmin(user);
    if (!user || typeof user !== 'object') return false;
    return isSupportRole(user.role || user.type) || user.isMockSupport === true || user.mockSupport === true;
  }

  function isDemoProfessional(user) {
    return Boolean(user && normalizeRole(user.role || user.type) === 'professional' && normalizeId(user.id) === DEMO_PROFESSIONAL_ID);
  }

  function idEquals(a, b) {
    return Boolean(normalizeId(a) && normalizeId(b) && normalizeId(a) === normalizeId(b));
  }

  function collectOrderProfessionalIds(order) {
    order = order || {};
    return [order.professionalId, order.providerId, order.userId, order.ownerId, order.displayProfessionalId, order.sourceProfessionalId]
      .map(normalizeId)
      .filter(Boolean);
  }

  function collectConversationParticipants(conversation) {
    conversation = conversation || {};
    var participants = Array.isArray(conversation.participants) ? conversation.participants : [];
    var ids = participants.concat([
      conversation.clientId,
      conversation.professionalId,
      conversation.providerId,
      conversation.ownerId,
      conversation.order && conversation.order.clientId,
      conversation.order && conversation.order.professionalId,
      conversation.order && conversation.order.providerId
    ]);
    return ids.map(normalizeId).filter(Boolean);
  }

  function isOrderClient(actor, order) {
    return Boolean(actor && idEquals(order && order.clientId, actor.id));
  }

  function isOrderProfessional(actor, order) {
    if (!actor || normalizeRole(actor.role || actor.type) !== 'professional') return false;
    var professionalIds = collectOrderProfessionalIds(order);
    if (professionalIds.some(function (id) { return idEquals(id, actor.id); })) return true;
    return isDemoProfessional(actor) && Boolean(order && order.id && (order.clientId || order.serviceId));
  }

  function canAccessOrder(actor, order, action) {
    actor = actor || getCurrentUser() || {};
    order = order || {};
    var role = normalizeRole(actor.role || actor.type);
    var normalizedAction = normalizeText(action || ORDER_ACTIONS.READ);
    if (canAccessAdmin(actor) || role === 'moderator') return true;
    if (normalizedAction === ORDER_ACTIONS.CREATE) return role === 'client' && has('create_order', role);
    if (!order || !order.id) return false;
    if (isOrderClient(actor, order)) return true;
    if (isOrderProfessional(actor, order)) return true;
    return false;
  }

  function canTransitionOrder(actor, order, nextStatus) {
    actor = actor || getCurrentUser() || {};
    var role = normalizeRole(actor.role || actor.type);
    var status = normalizeText(nextStatus || '');
    if (canAccessAdmin(actor)) return true;
    if (!canAccessOrder(actor, order, ORDER_ACTIONS.UPDATE_STATUS)) return false;
    if (role === 'professional') return ['accepted', 'conversation', 'quoted', 'in_progress', 'completed', 'cancelled'].indexOf(status) !== -1;
    if (role === 'client') return ['in_progress', 'completed', 'cancelled'].indexOf(status) !== -1;
    return false;
  }

  function canAccessConversation(actor, conversation, action) {
    actor = actor || getCurrentUser() || {};
    if (canAccessAdmin(actor) || normalizeRole(actor.role || actor.type) === 'moderator') return true;
    var actorId = normalizeId(actor.id);
    if (!actorId || !conversation) return false;
    var participants = collectConversationParticipants(conversation);
    if (participants.some(function (id) { return idEquals(id, actorId); })) return true;
    if (conversation.order && canAccessOrder(actor, conversation.order, ORDER_ACTIONS.READ)) return true;
    return isDemoProfessional(actor) && Boolean(conversation.orderId || conversation.serviceId);
  }

  function collectIdentityKeys(entity) {
    entity = entity || {};
    var profile = entity.profile || {};
    var profiles = Array.isArray(entity.profiles) ? entity.profiles : [];
    var values = [
      entity.id, entity.userId, entity.accountId, entity.email, entity.accountKey,
      entity.providerProfileId, entity.professionalId, entity.clientId,
      profile.id, profile.userId, profile.accountId, profile.email, profile.accountKey
    ];
    profiles.forEach(function (item) {
      values.push(item && item.id, item && item.userId, item && item.accountId, item && item.email, item && item.accountKey);
    });
    return Array.from(new Set(values.map(function (value) {
      return normalizeId(value).toLowerCase();
    }).filter(Boolean)));
  }

  function canAccessNotification(actor, notification, action) {
    actor = actor || getCurrentUser() || {};
    if (canAccessAdmin(actor) || normalizeRole(actor.role || actor.type) === 'moderator') return true;
    if (!notification) return false;
    var actorKeys = collectIdentityKeys(actor);
    if (!actorKeys.length) return false;
    var recipientKeys = [
      notification.userId, notification.recipientId, notification.ownerId,
      notification.recipientAccountKey, notification.accountKey, notification.email
    ].map(function (value) { return normalizeId(value).toLowerCase(); }).filter(Boolean);
    if (!recipientKeys.length) return true;
    if (recipientKeys.some(function (key) { return actorKeys.indexOf(key) !== -1; })) return true;
    return isDemoProfessional(actor) && String(notification.category || '').toLowerCase() === 'orders';
  }

  function canAccessWalletOwner(actor, ownerId, action) {
    actor = actor || getCurrentUser() || {};
    var role = normalizeRole(actor.role || actor.type);
    var normalizedOwner = normalizeId(ownerId || actor.id || '');
    if (canAccessAdmin(actor)) return true;
    if (!normalizedOwner || !actor.id) return false;
    if (role === 'professional' && idEquals(normalizedOwner, actor.id)) return true;
    if (role === 'client' && idEquals(normalizedOwner, actor.id)) return true;
    return isDemoProfessional(actor) && (!normalizedOwner || normalizedOwner === DEMO_PROFESSIONAL_ID);
  }

  function canResolveDispute(actor) {
    actor = actor || getCurrentUser() || {};
    return canAccessAdmin(actor) || has('resolve_dispute', actor.role || actor.type);
  }

  function canResolveWithdrawal(actor) {
    actor = actor || getCurrentUser() || {};
    return canAccessAdmin(actor) || has('resolve_withdrawal', actor.role || actor.type);
  }

  function assertResourceAccess(kind, resource, action, actor) {
    actor = actor || getCurrentUser() || {};
    var allowed = false;
    if (kind === 'order') allowed = canAccessOrder(actor, resource, action);
    if (kind === 'conversation') allowed = canAccessConversation(actor, resource, action);
    if (kind === 'notification') allowed = canAccessNotification(actor, resource, action);
    if (kind === 'wallet') allowed = canAccessWalletOwner(actor, resource && (resource.ownerId || resource.professionalId || resource.userId), action);
    if (allowed) return true;

    auditSecurityEvent({
      type: 'resource_access_denied',
      action: action || 'read',
      result: 'denied',
      resource: kind,
      resourceId: resource && (resource.id || resource.orderId || resource.conversationId || resource.transactionId) || '',
      actor: actor,
      reason: 'resource_scope_mismatch'
    });
    throw createPermissionError(kind + ':' + (action || 'read'), {
      resource: kind,
      resourceId: resource && (resource.id || resource.orderId || resource.conversationId || resource.transactionId) || ''
    });
  }

  function assertOrderTransition(actor, order, nextStatus) {
    if (canTransitionOrder(actor, order, nextStatus)) return true;
    auditSecurityEvent({
      type: 'order_transition_denied',
      action: 'order:' + normalizeText(nextStatus || ''),
      result: 'denied',
      resource: 'order',
      resourceId: order && order.id || '',
      actor: actor,
      reason: 'invalid_actor_or_status'
    });
    throw createPermissionError('order_transition:' + normalizeText(nextStatus || ''), { orderId: order && order.id || '' });
  }

  function assertAdminAction(action, payload, actor) {
    actor = actor || getCurrentUser() || {};
    var normalized = normalizeText(action || '');
    var allowed = false;
    if (normalized === WALLET_ACTIONS.RESOLVE_DISPUTE || normalized === 'resolve_dispute') allowed = canResolveDispute(actor);
    if (normalized === WALLET_ACTIONS.RESOLVE_WITHDRAWAL || normalized === 'resolve_withdrawal') allowed = canResolveWithdrawal(actor);
    if (normalized === WALLET_ACTIONS.VIEW_AUDIT_EVENTS || normalized === 'view_audit_events') allowed = canAccessAdmin(actor) || has('view_audit_events', actor.role || actor.type);
    if (allowed) {
      auditSecurityEvent({
        type: 'admin_action_allowed',
        action: normalized,
        result: 'allowed',
        resource: payload && (payload.resource || payload.kind) || 'admin',
        resourceId: payload && (payload.id || payload.disputeId || payload.transactionId || payload.orderId) || '',
        actor: actor
      });
      return true;
    }

    auditSecurityEvent({
      type: 'admin_action_denied',
      action: normalized,
      result: 'denied',
      resource: payload && (payload.resource || payload.kind) || 'admin',
      resourceId: payload && (payload.id || payload.disputeId || payload.transactionId || payload.orderId) || '',
      actor: actor,
      reason: 'requires_support_or_admin'
    });
    throw createPermissionError('admin_action:' + normalized, payload || {});
  }

  function actorPayload(actor) {
    actor = actor || getCurrentUser() || {};
    return {
      actorId: normalizeId(actor.id || ''),
      actorRole: normalizeRole(actor.role || actor.type),
      actorName: normalizeText(actor.name || '')
    };
  }

  function listSecurityAuditEvents(filters) {
    filters = filters || {};
    var items = safeParse(root.localStorage && root.localStorage.getItem(SECURITY_AUDIT_KEY), []);
    if (!Array.isArray(items)) return [];
    return items.filter(function (event) {
      if (filters.actorId && !idEquals(event.actorId, filters.actorId)) return false;
      if (filters.resource && event.resource !== filters.resource) return false;
      if (filters.result && event.result !== filters.result) return false;
      return true;
    });
  }

  Doke.permissions = {
    ROLE_PERMISSIONS: ROLE_PERMISSIONS,
    ORDER_ACTIONS: ORDER_ACTIONS,
    MESSAGE_ACTIONS: MESSAGE_ACTIONS,
    WALLET_ACTIONS: WALLET_ACTIONS,
    SECURITY_AUDIT_KEY: SECURITY_AUDIT_KEY,
    normalizeRole: normalizeRole,
    permissionsForRole: permissionsForRole,
    has: has,
    assert: assert,
    isInternalRole: isInternalRole,
    isSupportRole: isSupportRole,
    canAccessAdmin: canAccessAdmin,
    canAccessOrder: canAccessOrder,
    canTransitionOrder: canTransitionOrder,
    assertOrderTransition: assertOrderTransition,
    canAccessConversation: canAccessConversation,
    canAccessNotification: canAccessNotification,
    canAccessWalletOwner: canAccessWalletOwner,
    canResolveDispute: canResolveDispute,
    canResolveWithdrawal: canResolveWithdrawal,
    assertResourceAccess: assertResourceAccess,
    assertAdminAction: assertAdminAction,
    actorPayload: actorPayload,
    auditSecurityEvent: auditSecurityEvent,
    listSecurityAuditEvents: listSecurityAuditEvents,
    createPermissionError: createPermissionError
  };
})();
