(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  var PROFILE_TYPES = Object.freeze({
    CLIENT: 'client',
    PROFESSIONAL: 'professional',
    SUPPORT: 'support',
    ADMIN: 'admin'
  });

  var PROFILE_STATUS = Object.freeze({
    ACTIVE: 'active',
    PENDING_REVIEW: 'pending_review',
    HIDDEN: 'hidden',
    SUSPENDED: 'suspended'
  });

  var SELF_SERVICE_ACTIONS = Object.freeze({
    GET_IDENTITY_STATE: 'get_account_identity_state',
    UPDATE_CURRENT_PROFILE: 'update_account_profile_reconciled',
    UPDATE_CURRENT_SETTINGS: 'update_account_settings',
    COMPLETE_ONBOARDING: 'complete_account_onboarding_reconciled'
  });

  var AUTHORITIES = Object.freeze({
    authentication: 'supabase-auth',
    session: 'supabase-auth-plus-doke-public-snapshot',
    account: 'public.users',
    publicProfile: 'public.user_profiles',
    browserTransport: 'self-service-operations',
    browserProvider: 'supabase',
    localCredentialAuthority: 'retired'
  });

  function normalizeProfileType(type) {
    var value = String(type || '').trim().toLowerCase();
    if (value === 'pro' || value === 'worker') return PROFILE_TYPES.PROFESSIONAL;
    if (value === PROFILE_TYPES.SUPPORT) return PROFILE_TYPES.SUPPORT;
    if (value === PROFILE_TYPES.ADMIN) return PROFILE_TYPES.ADMIN;
    return value === PROFILE_TYPES.PROFESSIONAL ? PROFILE_TYPES.PROFESSIONAL : PROFILE_TYPES.CLIENT;
  }

  function normalizeProfileStatus(status) {
    var value = String(status || '').trim().toLowerCase();
    return Object.keys(PROFILE_STATUS).some(function (key) { return PROFILE_STATUS[key] === value; })
      ? value
      : PROFILE_STATUS.ACTIVE;
  }

  function normalizeProfile(profile, user) {
    if (!profile || typeof profile !== 'object') return null;
    var type = normalizeProfileType(profile.type || profile.role || (user && (user.role || user.type)));
    return Object.freeze({
      id: profile.id || profile.profileId || (user && (user.providerProfileId || user.id)) || '',
      userId: profile.userId || profile.ownerId || (user && user.id) || '',
      type: type,
      role: type,
      status: normalizeProfileStatus(profile.status || profile.profileStatus),
      name: String(profile.name || profile.displayName || (user && user.name) || 'Perfil Doke').trim(),
      handle: profile.handle || profile.username || (user && user.handle) || '',
      avatarUrl: profile.avatarUrl || profile.avatar || (user && (user.avatarUrl || user.avatar)) || '',
      coverUrl: profile.coverUrl || profile.cover || (user && user.coverUrl) || '',
      headline: profile.headline || profile.profession || (user && user.profession) || '',
      bio: profile.bio || (user && user.bio) || '',
      city: profile.city || (user && user.city) || '',
      state: profile.state || (user && user.state) || '',
      interests: Array.isArray(profile.interests) ? profile.interests.slice(0, 8) : [],
      verified: profile.verified === true || Boolean(user && user.verified === true),
      metrics: profile.metrics && typeof profile.metrics === 'object' ? profile.metrics : {},
      updatedAt: profile.updatedAt || ''
    });
  }

  function normalizeIdentity(payload) {
    var rootPayload = payload && typeof payload === 'object' ? payload : {};
    var source = rootPayload.identity && typeof rootPayload.identity === 'object'
      ? rootPayload.identity
      : rootPayload;
    var user = source.user || source.currentUser || rootPayload.user || rootPayload.currentUser || null;
    var profile = normalizeProfile(
      source.profile || source.currentProfile || rootPayload.profile || rootPayload.currentProfile || (user && user.profile),
      user
    );
    var sourceProfiles = source.profiles || rootPayload.profiles;
    var settings = source.settings && typeof source.settings === 'object' && !Array.isArray(source.settings)
      ? source.settings
      : user && user.settings && typeof user.settings === 'object' && !Array.isArray(user.settings)
        ? user.settings
        : {};

    return Object.freeze({
      user: user || null,
      profile: profile,
      profiles: Array.isArray(sourceProfiles)
        ? sourceProfiles.map(function (item) { return normalizeProfile(item, user); }).filter(Boolean)
        : profile ? [profile] : [],
      settings: Object.freeze(Object.assign({}, settings)),
      onboardingStatus: source.onboardingStatus || (user && user.onboardingStatus) || 'not_started',
      onboardingCompletedAt: source.onboardingCompletedAt || (user && user.onboardingCompletedAt) || '',
      provider: 'supabase',
      transport: AUTHORITIES.browserTransport,
      reconciled: true
    });
  }

  Doke.identityProfileContract = Object.freeze({
    version: 'AUTH-A12B.1',
    profileTypes: PROFILE_TYPES,
    profileStatus: PROFILE_STATUS,
    actions: SELF_SERVICE_ACTIONS,
    authorities: AUTHORITIES,
    normalizeProfileType: normalizeProfileType,
    normalizeProfileStatus: normalizeProfileStatus,
    normalizeProfile: normalizeProfile,
    normalizeIdentity: normalizeIdentity
  });
})();
