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

  function usersRepository() {
    return window.DokeAuth && window.DokeAuth.repositories
      ? window.DokeAuth.repositories.users || null
      : null;
  }

  function sessionProvider() {
    return String(window.Doke?.session?.getSession?.()?.provider || '').toLowerCase();
  }

  function usesSupabaseProvider() {
    return sessionProvider() === 'supabase';
  }

  function normalizedStatus(user) {
    return user && VALID_STATUSES.includes(user.onboardingStatus)
      ? user.onboardingStatus
      : 'not_started';
  }

  function normalizeInterests(value) {
    var source = Array.isArray(value)
      ? value
      : String(value || '').split(',');
    var seen = new Set();
    return source.map(function (item) { return String(item || '').trim(); })
      .filter(function (item) {
        var key = item.toLowerCase();
        if (!item || seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 8);
  }

  function hasCompleteBaseProfile(user, profile) {
    return Boolean(
      user && user.handle &&
      profile && String(profile.city || '').trim() && String(profile.state || '').trim()
    );
  }

  function reconciliationError(message, code) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function normalizeCanonicalOnboarding(identityState, user) {
    var state = identityState && typeof identityState === 'object' ? identityState : {};
    var profile = state.profile && typeof state.profile === 'object' ? state.profile : null;
    var expectedUserId = String(user && user.id || '');
    var stateUserId = String(state.userId || '');
    var profileUserId = String(profile && (profile.userId || profile.profileId) || '');
    var status = VALID_STATUSES.includes(state.onboardingStatus)
      ? state.onboardingStatus
      : 'not_started';

    if (!expectedUserId || !profile) {
      throw reconciliationError('O servidor não devolveu um estado canônico de onboarding válido.', 'DOKE_ONBOARDING_RECONCILIATION_INVALID');
    }
    if ((stateUserId && stateUserId !== expectedUserId) || (profileUserId && profileUserId !== expectedUserId)) {
      throw reconciliationError('O onboarding devolvido não pertence à sessão atual.', 'DOKE_ONBOARDING_RECONCILIATION_SUBJECT_MISMATCH');
    }

    return Object.freeze({
      status: status,
      completedAt: state.onboardingCompletedAt || '',
      profile: Object.freeze({
        id: profile.profileId || profile.userId || expectedUserId,
        userId: profile.userId || expectedUserId,
        name: String(profile.displayName || profile.name || user.name || '').trim(),
        displayName: String(profile.displayName || profile.name || user.name || '').trim(),
        handle: String(profile.username || profile.handle || user.handle || '').trim().toLowerCase(),
        username: String(profile.username || profile.handle || user.handle || '').trim().toLowerCase(),
        city: String(profile.city || '').trim(),
        state: String(profile.state || '').trim().toUpperCase(),
        bio: String(profile.bio || '').trim(),
        interests: normalizeInterests(profile.interests),
        avatarUrl: String(profile.avatarUrl || '').trim(),
        coverUrl: String(profile.coverUrl || '').trim(),
        updatedAt: profile.updatedAt || ''
      })
    });
  }

  function resolvedUser(user, remoteState) {
    if (!remoteState) return user;
    return Object.freeze(Object.assign({}, user, {
      onboardingStatus: remoteState.status,
      onboardingCompletedAt: remoteState.completedAt || user.onboardingCompletedAt || '',
      city: remoteState.profile.city || user.city || '',
      state: remoteState.profile.state || user.state || '',
      bio: remoteState.profile.bio || '',
      interests: remoteState.profile.interests || [],
      profile: remoteState.profile
    }));
  }

  function invokeSelfService(action, params) {
    if (!window.DokeSupabase || typeof window.DokeSupabase.invokeSelfService !== 'function') {
      return Promise.reject(new Error('Autoridade remota de onboarding indisponível.'));
    }
    return window.DokeSupabase.invokeSelfService(action, params || {});
  }

  function resolveRemoteState(user) {
    var client = window.DokeSupabase && typeof window.DokeSupabase.getClient === 'function'
      ? window.DokeSupabase.getClient()
      : null;
    if (!usesSupabaseProvider() || !client || !user || !user.id) return Promise.resolve(null);

    return invokeSelfService('get_account_identity_state', {}).then(function (data) {
      return normalizeCanonicalOnboarding(data, user);
    }).catch(function (error) {
      var message = String(error && error.message || '');
      if (/function .*get_account_identity_state.*does not exist|schema cache/i.test(message)) {
        throw new Error('A migration 147 da reconciliação de identidade ainda não foi aplicada no Supabase.');
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
      var nextUser = resolvedUser(user, remoteState);
      if (remoteState) profile = remoteState.profile;

      if (!remoteState && status !== 'completed' && hasCompleteBaseProfile(nextUser, profile)) {
        status = 'completed';
      }

      return {
        authenticated: true,
        status: status,
        shouldShow: status !== 'completed',
        user: nextUser,
        profile: profile
      };
    });
  }

  function complete(payload) {
    var user = currentUser();
    var profileService = services.profile;
    var repository = usersRepository();
    var source = payload || {};
    var normalizedPayload = {
      city: String(source.city || '').trim(),
      state: String(source.state || '').trim().toUpperCase(),
      postalCode: String(source.postalCode || '').replace(/\D/g, ''),
      bio: String(source.bio || '').trim(),
      interests: normalizeInterests(source.interests)
    };

    if (!user || !user.id) return Promise.reject(new Error('Sessão não encontrada para concluir o perfil.'));

    if (usesSupabaseProvider()) {
      return invokeSelfService('complete_account_onboarding_reconciled', {
        p_city: normalizedPayload.city,
        p_state: normalizedPayload.state,
        p_postal_code: normalizedPayload.postalCode,
        p_bio: normalizedPayload.bio,
        p_interests: normalizedPayload.interests
      }).then(function (identityState) {
        var remoteState = normalizeCanonicalOnboarding(identityState, user);
        if (remoteState.status !== 'completed' || !remoteState.profile.city || !remoteState.profile.state) {
          throw reconciliationError('O servidor não confirmou a conclusão do onboarding.', 'DOKE_ONBOARDING_RECONCILIATION_INCOMPLETE');
        }
        var nextUser = resolvedUser(user, remoteState);
        window.dispatchEvent(new CustomEvent('doke:onboarding-completed', {
          detail: {
            userId: user.id,
            status: remoteState.status,
            profile: remoteState.profile,
            source: 'server',
            reconciled: true
          }
        }));
        return { user: nextUser, profile: remoteState.profile };
      }).catch(function (error) {
        var message = String(error && error.message || '');
        if (/function .*complete_account_onboarding_reconciled.*does not exist|schema cache/i.test(message)) {
          throw new Error('A migration 147 da reconciliação de onboarding ainda não foi aplicada no Supabase.');
        }
        throw error;
      });
    }

    if (!profileService || typeof profileService.updateCurrentProfile !== 'function') {
      return Promise.reject(new Error('Serviço de perfil indisponível.'));
    }
    if (!repository || typeof repository.updateCurrentUser !== 'function') {
      return Promise.reject(new Error('Persistência local da conta indisponível.'));
    }

    return profileService.updateCurrentProfile(normalizedPayload)
      .then(function (profile) {
        if (!profile || !String(profile.city || '').trim() || !String(profile.state || '').trim()) {
          throw new Error('Informe cidade e estado para concluir o perfil.');
        }
        return repository.updateCurrentUser(user.id, {
          onboardingStatus: 'completed',
          onboardingCompletedAt: new Date().toISOString()
        }).then(function (updatedUser) {
          if (Doke.session && typeof Doke.session.setCurrentUser === 'function') Doke.session.setCurrentUser(updatedUser);
          window.dispatchEvent(new CustomEvent('doke:onboarding-completed', {
            detail: {
              userId: updatedUser && updatedUser.id || user.id,
              status: 'completed',
              profile: updatedUser && updatedUser.profile || profile,
              source: 'local',
              reconciled: false
            }
          }));
          return { user: updatedUser || currentUser(), profile: updatedUser && updatedUser.profile || profile };
        });
      });
  }

  function skipOptional(payload) {
    payload = payload || {};
    return complete({ city: payload.city, state: payload.state, postalCode: payload.postalCode, bio: '', interests: [] });
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
