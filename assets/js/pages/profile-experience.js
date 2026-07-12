(function () {
  'use strict';
  var Doke = window.Doke || (window.Doke = {});
  if (!Doke.profileExperienceCore) return;

  Doke.profileExperience = Doke.profileExperienceCore.createSurface({
    name: 'perfil',
    boundary: 'perfil',
    cachePrefix: 'profile:',
    role: 'public',
    surface: 'public-profile',
    stateDataset: 'profileExperienceState',
    isCurrent: function () {
      return Boolean(document.querySelector('[data-state-boundary="perfil"]'));
    },
    load: function (profileId) {
      if (Doke.domainData && typeof Doke.domainData.loadPageData === 'function') return Doke.domainData.loadPageData('perfil');
      if (Doke.controllerData && typeof Doke.controllerData.loadForPage === 'function') return Doke.controllerData.loadForPage('perfil');
      if (Doke.services && Doke.services.profile && typeof Doke.services.profile.getById === 'function') {
        return Promise.resolve(Doke.services.profile.getById(profileId)).then(function (profile) {
          return { users: profile ? [profile] : [] };
        });
      }
      return Promise.resolve({ source: 'static-profile-surface', profileId: profileId });
    }
  });

  Doke.profileExperience.init();
})();
