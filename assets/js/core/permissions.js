(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  var ROLE_PERMISSIONS = {
    guest: ['read_public_services', 'read_public_profiles', 'read_public_communities'],
    client: ['read_public_services', 'read_public_profiles', 'read_public_communities', 'create_order', 'message_professional', 'review_completed_order', 'save_favorite'],
    professional: ['read_public_services', 'read_public_profiles', 'read_public_communities', 'create_service', 'manage_own_services', 'respond_budget', 'message_client', 'manage_availability', 'request_payout'],
    moderator: ['read_public_services', 'read_public_profiles', 'read_public_communities', 'review_reports', 'moderate_content', 'suspend_content'],
    admin: ['*']
  };

  function permissionsForRole(role) {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.guest;
  }

  function has(permission, roleOrPermissions) {
    var permissions = Array.isArray(roleOrPermissions)
      ? roleOrPermissions
      : permissionsForRole(roleOrPermissions || 'guest');
    return permissions.indexOf('*') >= 0 || permissions.indexOf(permission) >= 0;
  }

  function assert(permission, roleOrPermissions) {
    if (!has(permission, roleOrPermissions)) {
      var error = new Error('Permission denied: ' + permission);
      error.code = 'permission_denied';
      throw error;
    }
    return true;
  }

  Doke.permissions = {
    ROLE_PERMISSIONS: ROLE_PERMISSIONS,
    permissionsForRole: permissionsForRole,
    has: has,
    assert: assert
  };
})();
