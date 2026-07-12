(function () {
  'use strict';
  var Doke = window.Doke || (window.Doke = {});
  if (!Doke.profileExperienceCore) return;

  Doke.professionalProfileExperience = Doke.profileExperienceCore.createSurface({
    name: 'perfil-profissional',
    boundary: 'perfil-profissional',
    cachePrefix: 'profile-professional:',
    role: 'professional',
    surface: 'owner-professional',
    stateDataset: 'professionalProfileExperienceState',
    events: [
      'doke:profile-updated', 'doke:service-created', 'doke:service-updated', 'doke:service-deleted',
      'doke:portfolio-updated', 'doke:review-created', 'doke:review-updated', 'doke:auth-session-change'
    ],
    load: function (profileId) {
      if (Doke.services && Doke.services.profile && typeof Doke.services.profile.getById === 'function') {
        return Promise.resolve(Doke.services.profile.getById(profileId)).then(function (profile) { return { profile: profile || null }; });
      }
      if (Doke.domainData && typeof Doke.domainData.loadPageData === 'function') return Doke.domainData.loadPageData('perfil-profissional');
      if (Doke.controllerData && typeof Doke.controllerData.loadForPage === 'function') return Doke.controllerData.loadForPage('perfil-profissional');
      return Promise.resolve({ source: 'static-professional-profile', profileId: profileId });
    },
    validate: function (context) {
      var role = context.role;
      var valid = !role || role === 'professional' || role === 'profissional' || role === 'provider';
      return {
        valid: valid,
        state: valid ? 'ready' : 'error',
        reason: valid ? undefined : 'profile-role-mismatch',
        profile: context.profile,
        payload: context.payload
      };
    }
  });

  Doke.professionalProfileExperience.init();
})();
