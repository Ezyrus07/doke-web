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

  var ENDPOINTS = Object.freeze({
    currentUser: '/users/me',
    updateCurrentUser: '/users/me',
    currentProfile: '/profiles/me',
    updateCurrentProfile: '/profiles/me',
    publicProfile: '/profiles/:id',
    professionalProfile: '/professionals/:id'
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
    var type = normalizeProfileType(profile.type || profile.role || user?.role || user?.type);
    return Object.freeze({
      id: profile.id || profile.profileId || user?.providerProfileId || user?.id || '',
      userId: profile.userId || profile.ownerId || user?.id || '',
      type: type,
      role: type,
      status: normalizeProfileStatus(profile.status || profile.profileStatus),
      name: String(profile.name || profile.displayName || user?.name || 'Perfil Doke').trim(),
      handle: profile.handle || user?.handle || '',
      avatarUrl: profile.avatarUrl || profile.avatar || user?.avatarUrl || user?.avatar || '',
      coverUrl: profile.coverUrl || profile.cover || user?.coverUrl || '',
      headline: profile.headline || profile.profession || user?.profession || '',
      bio: profile.bio || user?.bio || '',
      city: profile.city || user?.city || '',
      state: profile.state || user?.state || '',
      verified: profile.verified === true || user?.verified === true,
      metrics: profile.metrics && typeof profile.metrics === 'object' ? profile.metrics : {},
      updatedAt: profile.updatedAt || ''
    });
  }

  function normalizeIdentity(payload) {
    var source = payload?.identity || payload || {};
    var user = source.user || source.currentUser || payload?.user || payload?.currentUser || null;
    var profile = normalizeProfile(source.profile || source.currentProfile || payload?.profile || payload?.currentProfile || user?.profile, user);
    return Object.freeze({
      user: user || null,
      profile: profile,
      profiles: Array.isArray(source.profiles || payload?.profiles) ? (source.profiles || payload.profiles).map(function (item) { return normalizeProfile(item, user); }).filter(Boolean) : profile ? [profile] : [],
      provider: source.provider || payload?.provider || 'mock'
    });
  }

  Doke.identityProfileContract = Object.freeze({
    profileTypes: PROFILE_TYPES,
    profileStatus: PROFILE_STATUS,
    endpoints: ENDPOINTS,
    normalizeProfileType: normalizeProfileType,
    normalizeProfileStatus: normalizeProfileStatus,
    normalizeProfile: normalizeProfile,
    normalizeIdentity: normalizeIdentity
  });
})();
