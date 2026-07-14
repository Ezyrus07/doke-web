(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var professionalSurface = null;
  var professionalHydration = null;
  var professionalHydrationBoundary = null;
  var professionalInitialization = null;
  var professionalInitializationBoundary = null;
  var professionalReadyBoundary = null;
  var professionalLastPayload = null;

  function ensureHydration() {
    var boundary = document.querySelector('[data-state-boundary="perfil-profissional"]');
    if (!boundary || !window.DokePageHydration || typeof window.DokePageHydration.create !== 'function') return null;
    if (professionalHydrationBoundary === boundary && professionalHydration) return professionalHydration;

    professionalHydrationBoundary = boundary;
    professionalHydration = window.DokePageHydration.create({
      page: 'perfil-profissional',
      root: boundary,
      skeletonSelectors: '[data-professional-profile-hydration-skeleton]',
      readySelectors: '[data-professional-profile-hydration-ready]',
      errorSelectors: '[data-state-error]',
      skeletonMode: 'route-and-document',
      maxDuration: 9000,
      hasItems: function () { return true; },
      onRetry: function () { window.DokeInitProfessionalProfile(); }
    });
    return professionalHydration;
  }

  function ensureSurface() {
    if (professionalSurface) return professionalSurface;
    if (!Doke.profileExperienceCore) throw new Error('O core de perfil profissional não está disponível.');

    professionalSurface = Doke.profileExperienceCore.createSurface({
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
          return Promise.resolve(Doke.services.profile.getById(profileId)).then(function (profile) {
            return { profile: profile || null };
          });
        }
        if (Doke.domainData && typeof Doke.domainData.loadPageData === 'function') {
          return Doke.domainData.loadPageData('perfil-profissional');
        }
        if (Doke.controllerData && typeof Doke.controllerData.loadForPage === 'function') {
          return Doke.controllerData.loadForPage('perfil-profissional');
        }
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

    Doke.professionalProfileExperience = professionalSurface;
    return professionalSurface;
  }

  window.DokeInitProfessionalProfile = function DokeInitProfessionalProfile() {
    var boundary = document.querySelector('[data-state-boundary="perfil-profissional"]');
    if (!boundary) return Promise.resolve(null);
    if (professionalReadyBoundary === boundary) return Promise.resolve(professionalLastPayload);
    if (professionalInitializationBoundary === boundary && professionalInitialization) return professionalInitialization;

    professionalInitializationBoundary = boundary;
    var hydration = ensureHydration();
    hydration?.start();

    var access = Doke.services && Doke.services.professionalAccess;
    var action = access && access.ACTIONS && access.ACTIONS.ACCESS_PROFILE || 'access_professional_profile';

    professionalInitialization = Promise.resolve().then(function () {
      if (!access || typeof access.guardPage !== 'function') {
        throw new Error('O guard profissional não está disponível.');
      }
      return access.guardPage(action, {
        guardName: 'professional-profile-access',
        source: 'perfil-profissional.html',
        hardRedirect: true
      });
    }).then(function (result) {
      if (!result || !result.allowed) return null;
      return ensureSurface().init();
    }).then(function (payload) {
      if (payload === null) return null;
      hydration?.ready({ hasItems: true });
      professionalReadyBoundary = boundary;
      professionalLastPayload = payload;
      if (typeof window.DokeInitProfileReviews === 'function') {
        window.DokeInitProfileReviews();
      }
      return professionalLastPayload;
    }).catch(function (error) {
      hydration?.error(error, { source: 'professional-profile-controller' });
      throw error;
    }).finally(function () {
      professionalInitialization = null;
    });

    return professionalInitialization;
  };

  Promise.resolve(window.DokeInitProfessionalProfile()).catch(function () {});
})();
