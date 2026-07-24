(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  var ROLES = Object.freeze({
    GUEST: 'guest',
    CLIENT: 'client',
    PROFESSIONAL: 'professional',
    MODERATOR: 'moderator',
    SUPPORT: 'support',
    ADMIN: 'admin'
  });

  var AUTH_PROVIDERS = Object.freeze({
    MOCK: 'mock',
    API: 'api',
    SUPABASE: 'supabase'
  });

  var AUTH_STATUS = Object.freeze({
    ANONYMOUS: 'anonymous',
    AUTHENTICATED: 'authenticated',
    EXPIRED: 'expired',
    BLOCKED: 'blocked'
  });

  var ACCOUNT_STATUS = Object.freeze({
    ACTIVE: 'active',
    PENDING_REVIEW: 'pending_review',
    PENDING_EMAIL: 'pending_email',
    SUSPENDED: 'suspended',
    DISABLED: 'disabled'
  });

  var SESSION_STATUS = Object.freeze({
    ACTIVE: 'active',
    EXPIRED: 'expired',
    REVOKED: 'revoked',
    ANONYMOUS: 'anonymous'
  });

  var AUTH_EVENTS = Object.freeze({
    REGISTERED: 'auth_registered',
    LOGIN_SUCCEEDED: 'auth_login_succeeded',
    LOGIN_FAILED: 'auth_login_failed',
    SESSION_REFRESHED: 'auth_session_refreshed',
    LOGOUT: 'auth_logout',
    PASSWORD_RECOVERY_REQUESTED: 'auth_password_recovery_requested',
    PASSWORD_RESET: 'auth_password_reset',
    ROLE_CHANGED: 'auth_role_changed'
  });

  var PERMISSIONS = Object.freeze({
    READ_PUBLIC_SERVICES: 'read_public_services',
    READ_PUBLIC_PROFILES: 'read_public_profiles',
    READ_PUBLIC_COMMUNITIES: 'read_public_communities',
    CREATE_ORDER: 'create_order',
    MESSAGE_PROFESSIONAL: 'message_professional',
    REVIEW_COMPLETED_ORDER: 'review_completed_order',
    SAVE_FAVORITE: 'save_favorite',
    CREATE_SERVICE: 'create_service',
    MANAGE_OWN_SERVICES: 'manage_own_services',
    RESPOND_BUDGET: 'respond_budget',
    MESSAGE_CLIENT: 'message_client',
    MANAGE_AVAILABILITY: 'manage_availability',
    REQUEST_PAYOUT: 'request_payout',
    REVIEW_REPORTS: 'review_reports',
    MODERATE_CONTENT: 'moderate_content',
    SUSPEND_CONTENT: 'suspend_content',
    VIEW_SUPPORT_QUEUE: 'view_support_queue',
    RESOLVE_DISPUTE: 'resolve_dispute',
    RESOLVE_WITHDRAWAL: 'resolve_withdrawal',
    VIEW_AUDIT_EVENTS: 'view_audit_events',
    MANAGE_PLATFORM: 'manage_platform'
  });

  var ROLE_PERMISSIONS = Object.freeze({
    guest: Object.freeze([
      PERMISSIONS.READ_PUBLIC_SERVICES,
      PERMISSIONS.READ_PUBLIC_PROFILES,
      PERMISSIONS.READ_PUBLIC_COMMUNITIES
    ]),
    client: Object.freeze([
      PERMISSIONS.READ_PUBLIC_SERVICES,
      PERMISSIONS.READ_PUBLIC_PROFILES,
      PERMISSIONS.READ_PUBLIC_COMMUNITIES,
      PERMISSIONS.CREATE_ORDER,
      PERMISSIONS.MESSAGE_PROFESSIONAL,
      PERMISSIONS.REVIEW_COMPLETED_ORDER,
      PERMISSIONS.SAVE_FAVORITE
    ]),
    professional: Object.freeze([
      PERMISSIONS.READ_PUBLIC_SERVICES,
      PERMISSIONS.READ_PUBLIC_PROFILES,
      PERMISSIONS.READ_PUBLIC_COMMUNITIES,
      PERMISSIONS.CREATE_SERVICE,
      PERMISSIONS.MANAGE_OWN_SERVICES,
      PERMISSIONS.RESPOND_BUDGET,
      PERMISSIONS.MESSAGE_CLIENT,
      PERMISSIONS.MANAGE_AVAILABILITY,
      PERMISSIONS.REQUEST_PAYOUT
    ]),
    moderator: Object.freeze([
      PERMISSIONS.READ_PUBLIC_SERVICES,
      PERMISSIONS.READ_PUBLIC_PROFILES,
      PERMISSIONS.READ_PUBLIC_COMMUNITIES,
      PERMISSIONS.REVIEW_REPORTS,
      PERMISSIONS.MODERATE_CONTENT,
      PERMISSIONS.SUSPEND_CONTENT
    ]),
    support: Object.freeze([
      PERMISSIONS.READ_PUBLIC_SERVICES,
      PERMISSIONS.READ_PUBLIC_PROFILES,
      PERMISSIONS.READ_PUBLIC_COMMUNITIES,
      PERMISSIONS.VIEW_SUPPORT_QUEUE,
      PERMISSIONS.RESOLVE_DISPUTE,
      PERMISSIONS.RESOLVE_WITHDRAWAL,
      PERMISSIONS.VIEW_AUDIT_EVENTS
    ]),
    admin: Object.freeze(['*'])
  });

  function normalizeRole(role) {
    var value = String(role || '').trim().toLowerCase();
    if (value === 'pro' || value === 'worker') return ROLES.PROFESSIONAL;
    if (value === 'user' || value === 'customer') return ROLES.CLIENT;
    if (value === ROLES.CLIENT) return ROLES.CLIENT;
    if (value === ROLES.PROFESSIONAL) return ROLES.PROFESSIONAL;
    if (value === ROLES.MODERATOR) return ROLES.MODERATOR;
    if (value === ROLES.SUPPORT) return ROLES.SUPPORT;
    if (value === ROLES.ADMIN) return ROLES.ADMIN;
    return ROLES.GUEST;
  }

  function normalizeAccountStatus(status) {
    var value = String(status || '').trim().toLowerCase();
    return Object.keys(ACCOUNT_STATUS).some(function (key) { return ACCOUNT_STATUS[key] === value; })
      ? value
      : ACCOUNT_STATUS.ACTIVE;
  }

  function normalizeAuthProvider(provider) {
    var value = String(provider || '').trim().toLowerCase();
    if (value === AUTH_PROVIDERS.SUPABASE) return AUTH_PROVIDERS.SUPABASE;
    return value === AUTH_PROVIDERS.API ? AUTH_PROVIDERS.API : AUTH_PROVIDERS.MOCK;
  }

  function permissionsForRole(role) {
    return ROLE_PERMISSIONS[normalizeRole(role)] || ROLE_PERMISSIONS.guest;
  }

  function hasPermission(permission, roleOrPermissions) {
    var permissions = Array.isArray(roleOrPermissions)
      ? roleOrPermissions
      : permissionsForRole(roleOrPermissions || ROLES.GUEST);
    return permissions.indexOf('*') >= 0 || permissions.indexOf(permission) >= 0;
  }

  function isInternalRole(role) {
    var normalized = normalizeRole(role);
    return normalized === ROLES.SUPPORT || normalized === ROLES.ADMIN || normalized === ROLES.MODERATOR;
  }

  function isSupportRole(role) {
    var normalized = normalizeRole(role);
    return normalized === ROLES.SUPPORT || normalized === ROLES.ADMIN;
  }

  function canAccessAdmin(user) {
    if (!user || typeof user !== 'object') return false;
    return isSupportRole(user.role || user.type) || user.isMockSupport === true || user.mockSupport === true;
  }

  Doke.authDomainContract = Object.freeze({
    roles: ROLES,
    authProviders: AUTH_PROVIDERS,
    authStatus: AUTH_STATUS,
    accountStatus: ACCOUNT_STATUS,
    sessionStatus: SESSION_STATUS,
    authEvents: AUTH_EVENTS,
    permissions: PERMISSIONS,
    rolePermissions: ROLE_PERMISSIONS,
    normalizeRole: normalizeRole,
    normalizeAccountStatus: normalizeAccountStatus,
    normalizeAuthProvider: normalizeAuthProvider,
    permissionsForRole: permissionsForRole,
    hasPermission: hasPermission,
    isInternalRole: isInternalRole,
    isSupportRole: isSupportRole,
    canAccessAdmin: canAccessAdmin
  });
})();
