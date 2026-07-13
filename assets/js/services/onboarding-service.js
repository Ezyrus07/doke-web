(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});
  var VALID_STATUSES = ['not_started', 'in_progress', 'completed'];

  function currentUser() {
    return Doke.session && typeof Doke.session.getCurrentUser === 'function'
      ? Doke.session.getCurrentUser()
      : null;
  }

  function authService() {
    return window.DokeAuth && window.DokeAuth.service ? window.DokeAuth.service : null;
  }

  function normalizedStatus(user) {
    return user && VALID_STATUSES.includes(user.onboardingStatus)
      ? user.onboardingStatus
      : 'not_started';
  }

  function hasCompleteBaseProfile(user, profile) {
    return Boolean(
      user && user.handle &&
      profile && String(profile.city || '').trim() && String(profile.state || '').trim()
    );
  }

  function resolveState() {
    var user = currentUser();
    var profileService = services.profile;
    if (!user || !user.id) {
      return Promise.resolve({ authenticated: false, status: 'anonymous', shouldShow: false, user: null, profile: null });
    }
    if (!profileService || typeof profileService.getCurrentProfile !== 'function') {
      return Promise.reject(new Error('Serviço de perfil indisponível.'));
    }

    return Promise.resolve(profileService.getCurrentProfile()).then(function (profile) {
      var status = normalizedStatus(user);
      var legacyComplete = status !== 'completed' && hasCompleteBaseProfile(user, profile);
      return {
        authenticated: true,
        status: status === 'completed' || legacyComplete ? 'completed' : status,
        shouldShow: status !== 'completed' && !legacyComplete,
        user: user,
        profile: profile || null
      };
    });
  }

  function complete(payload) {
    var user = currentUser();
    var profileService = services.profile;
    var auth = authService();
    if (!user || !user.id) return Promise.reject(new Error('Sessão não encontrada para concluir o perfil.'));
    if (!profileService || typeof profileService.updateCurrentProfile !== 'function') return Promise.reject(new Error('Serviço de perfil indisponível.'));
    if (!auth || typeof auth.updateCurrentUser !== 'function') return Promise.reject(new Error('Persistência da conta indisponível.'));

    return profileService.updateCurrentProfile(payload || {})
      .then(function (profile) {
        if (!profile || !String(profile.city || '').trim() || !String(profile.state || '').trim()) {
          throw new Error('Informe cidade e estado para concluir o perfil.');
        }
        return auth.updateCurrentUser({
          onboardingStatus: 'completed',
          onboardingCompletedAt: new Date().toISOString()
        }).then(function (updatedUser) {
          window.dispatchEvent(new CustomEvent('doke:onboarding-completed', {
            detail: { userId: updatedUser && updatedUser.id || user.id }
          }));
          return { user: updatedUser || currentUser(), profile: profile };
        });
      });
  }

  function skipOptional(payload) {
    payload = payload || {};
    return complete({ city: payload.city, state: payload.state, bio: '', interests: [] });
  }

  function getStatus() {
    var user = currentUser();
    return user ? normalizedStatus(user) : 'anonymous';
  }

  services.onboarding = Object.freeze({
    complete: complete,
    skipOptional: skipOptional,
    resolveState: resolveState,
    getStatus: getStatus
  });
})();
