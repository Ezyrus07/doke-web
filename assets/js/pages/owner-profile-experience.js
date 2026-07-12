(function () {
  'use strict';
  var Doke = window.Doke || (window.Doke = {});
  if (!Doke.profileExperienceCore) return;

  Doke.ownerProfileExperience = Doke.profileExperienceCore.createSurface({
    name: 'meu-perfil',
    boundary: 'meu-perfil',
    cachePrefix: 'profile-owner:',
    role: 'owner',
    surface: 'owner-edit',
    stateDataset: 'ownerProfileExperienceState',
    allowExplicitProfileId: false,
    allowSave: true,
    invalidateAllOnEvent: true,
    load: function (profileId) {
      if (Doke.services && Doke.services.profile) {
        if (typeof Doke.services.profile.getCurrentProfile === 'function') {
          return Promise.resolve(Doke.services.profile.getCurrentProfile()).then(function (profile) {
            return { profile: profile || null, source: 'profile-service' };
          });
        }
        if (typeof Doke.services.profile.getById === 'function') {
          return Promise.resolve(Doke.services.profile.getById(profileId)).then(function (profile) {
            return { profile: profile || null, source: 'profile-service' };
          });
        }
      }
      if (Doke.controllerData && typeof Doke.controllerData.loadForPage === 'function') {
        return Promise.resolve(Doke.controllerData.loadForPage('perfil'));
      }
      return Promise.resolve({ source: 'static-owner-profile', profileId: profileId });
    },
    validate: function (context) {
      var explicitEmpty = Object.prototype.hasOwnProperty.call(context.payload || {}, 'profile') && !context.payload.profile;
      var isStatic = context.payload && context.payload.source === 'static-owner-profile';
      return {
        valid: true,
        state: explicitEmpty && !isStatic ? 'empty' : 'ready',
        profile: context.profile,
        payload: context.payload
      };
    }
  });

  Doke.ownerProfileExperience.init();
})();
