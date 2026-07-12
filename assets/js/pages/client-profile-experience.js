(function () {
  'use strict';
  var Doke = window.Doke || (window.Doke = {});
  if (!Doke.profileExperienceCore) return;

  Doke.clientProfileExperience = Doke.profileExperienceCore.createSurface({
    name: 'perfil-cliente',
    boundary: 'perfil-cliente',
    cachePrefix: 'profile-client:',
    role: 'client',
    surface: 'public-client',
    stateDataset: 'clientProfileExperienceState',
    load: function (profileId) {
      if (Doke.services && Doke.services.profile && typeof Doke.services.profile.getById === 'function') {
        return Promise.resolve(Doke.services.profile.getById(profileId)).then(function (profile) { return { profile: profile || null }; });
      }
      if (Doke.domainData && typeof Doke.domainData.loadPageData === 'function') return Doke.domainData.loadPageData('perfil-cliente');
      if (Doke.controllerData && typeof Doke.controllerData.loadForPage === 'function') return Doke.controllerData.loadForPage('perfil-cliente');
      return Promise.resolve({ source: 'static-client-profile', profileId: profileId });
    },
    validate: function (context) {
      var role = context.role;
      var mismatch = role === 'professional' || role === 'profissional' || role === 'provider';
      return {
        valid: !mismatch,
        state: mismatch ? 'empty' : 'ready',
        reason: mismatch ? 'profile-role-mismatch' : undefined,
        profile: context.profile,
        payload: context.payload
      };
    }
  });

  Doke.clientProfileExperience.init();
})();
