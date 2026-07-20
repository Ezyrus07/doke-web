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

  function syncCompletedSession(user, remoteState) {
    if (!user || !remoteState || remoteState.status !== 'completed') return user;
    var nextUser = Object.assign({}, user, {
      onboardingStatus: 'completed',
      onboardingCompletedAt: remoteState.completedAt || user.onboardingCompletedAt || '',
      city: remoteState.profile && remoteState.profile.city || user.city || '',
      state: remoteState.profile && remoteState.profile.state || user.state || ''
    });
    if (window.Doke?.session?.setCurrentUser) window.Doke.session.setCurrentUser(nextUser);
    return nextUser;
  }

  function resolveRemoteState(user) {
    var client = window.DokeSupabase && typeof window.DokeSupabase.getClient === 'function'
      ? window.DokeSupabase.getClient()
      : null;
    var provider = String(window.Doke?.session?.getSession?.()?.provider || '').toLowerCase();
    if (provider !== 'supabase' || !client || !user || !user.id) return Promise.resolve(null);

    return client.rpc('get_account_onboarding_state').then(function (result) {
      if (result.error) throw result.error;
      var data = result.data || {};
      return {
        status: VALID_STATUSES.includes(data.onboardingStatus) ? data.onboardingStatus : 'not_started',
        completedAt: data.onboardingCompletedAt || '',
        profile: data.profile || null
      };
    }).catch(function (error) {
      var message = String(error && error.message || '');
      if (/function .*get_account_onboarding_state.*does not exist|schema cache/i.test(message)) {
        throw new Error('A migration 021 do estado de onboarding ainda não foi aplicada no Supabase.');
      }
      throw error;
    });
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

    return Promise.all([
      Promise.resolve(profileService.getCurrentProfile()),
      resolveRemoteState(user)
    ]).then(function (values) {
      var profile = values[0] || null;
      var remoteState = values[1];
      var status = remoteState ? remoteState.status : normalizedStatus(user);
      if (remoteState && remoteState.profile) profile = Object.assign({}, profile || {}, remoteState.profile);
      var resolvedUser = syncCompletedSession(user, remoteState);
      var legacyComplete = status !== 'completed' && hasCompleteBaseProfile(resolvedUser, profile);
      var finalStatus = status === 'completed' || legacyComplete ? 'completed' : status;
      return {
        authenticated: true,
        status: finalStatus,
        shouldShow: finalStatus !== 'completed',
        user: resolvedUser,
        profile: profile
      };
    });
  }

  function complete(payload) {
    var user = currentUser();
    var profileService = services.profile;
    var auth = authService();
    var source = payload || {};
    if (!user || !user.id) return Promise.reject(new Error('Sessão não encontrada para concluir o perfil.'));

    var supabaseClient = window.DokeSupabase && typeof window.DokeSupabase.getClient === 'function'
      ? window.DokeSupabase.getClient()
      : null;
    var sessionProvider = String(window.Doke?.session?.getSession?.()?.provider || '').toLowerCase();

    if (sessionProvider === 'supabase' && supabaseClient) {
      return supabaseClient.rpc('complete_account_onboarding', {
        p_city: String(source.city || '').trim(),
        p_state: String(source.state || '').trim().toUpperCase(),
        p_postal_code: String(source.postalCode || '').replace(/\D/g, ''),
        p_bio: String(source.bio || '').trim(),
        p_interests: Array.isArray(source.interests)
          ? source.interests
          : String(source.interests || '').split(',').map(function (item) { return item.trim(); }).filter(Boolean)
      }).then(function (result) {
        if (result.error) throw result.error;
        return supabaseClient.auth.updateUser({
          data: {
            city: String(source.city || '').trim(),
            state: String(source.state || '').trim().toUpperCase(),
            onboarding_status: 'completed'
          }
        }).catch(function () { return null; }).then(function () {
          var current = currentUser() || user;
          var nextUser = Object.assign({}, current, {
            city: String(source.city || '').trim(),
            state: String(source.state || '').trim().toUpperCase(),
            bio: String(source.bio || '').trim(),
            interests: Array.isArray(source.interests) ? source.interests : [],
            onboardingStatus: 'completed',
            onboardingCompletedAt: new Date().toISOString()
          });
          if (window.Doke?.session?.setCurrentUser) window.Doke.session.setCurrentUser(nextUser);
          window.dispatchEvent(new CustomEvent('doke:onboarding-completed', { detail: { userId: user.id } }));
          return { user: nextUser, profile: result.data || source };
        });
      }).catch(function (error) {
        var message = String(error && error.message || '');
        if (/function .*complete_account_onboarding.*does not exist|schema cache/i.test(message)) {
          throw new Error('A migration 015 do onboarding ainda não foi aplicada no Supabase.');
        }
        throw error;
      });
    }

    if (!profileService || typeof profileService.updateCurrentProfile !== 'function') return Promise.reject(new Error('Serviço de perfil indisponível.'));
    if (!auth || typeof auth.updateCurrentUser !== 'function') return Promise.reject(new Error('Persistência da conta indisponível.'));

    return profileService.updateCurrentProfile(source)
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
