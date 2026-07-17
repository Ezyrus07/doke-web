/* Doke Professional Access Service
   Responsibility: resolve the canonical professional state and enforce professional feature access. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var services = Doke.services || (Doke.services = {});
  var permissions = Doke.permissions || {};
  try { document.documentElement.dataset.professionalAccessState = 'pending'; } catch (_) {}
  var ACTIONS = permissions.PROFESSIONAL_ACTIONS || Object.freeze({
    ACCESS_PROFILE: 'access_professional_profile',
    EDIT_PROFILE: 'edit_professional_profile',
    PUBLISH_SERVICE: 'publish_service',
    PUBLISH_CONTENT: 'publish_professional_content',
    RECEIVE_ORDERS: 'receive_professional_orders',
    MANAGE_AVAILABILITY: 'manage_professional_availability',
    REQUEST_PAYOUT: 'request_professional_payout'
  });

  function currentUser() {
    return Doke.session && typeof Doke.session.getCurrentUser === 'function'
      ? Doke.session.getCurrentUser()
      : null;
  }

  function profilesRepository() {
    return Doke.repositories && Doke.repositories.professionalProfiles;
  }

  function verificationsRepository() {
    return Doke.repositories && Doke.repositories.professionalIdentityVerifications;
  }

  function usersRepository() {
    return root.DokeAuth && root.DokeAuth.repositories && root.DokeAuth.repositories.users
      ? root.DokeAuth.repositories.users
      : null;
  }

  function syncCurrentSession(user) {
    var sessionUser = currentUser();
    if (!sessionUser || String(sessionUser.id) !== String(user && user.id)) return;
    if (!Doke.session || typeof Doke.session.setCurrentUser !== 'function') return;
    var session = Doke.session.getSession && Doke.session.getSession();
    Doke.session.setCurrentUser(user, {
      provider: session && session.provider || 'mock',
      token: session && session.token || '',
      refreshToken: session && session.refreshToken || '',
      remember: session ? session.remember !== false : true,
      sessionStatus: session && session.sessionStatus || 'active',
      expiresAt: session && session.expiresAt || ''
    });
  }

  function reconcileVerifiedProfessionalState(context) {
    var actor = context && context.user;
    var profile = context && context.professionalProfile;
    var verification = context && context.verification;
    if (!actor || !actor.id || !profile || !verification || verification.status !== 'verified') {
      return Promise.resolve(context);
    }
    if (profile.status === 'suspended') return Promise.resolve(context);

    var profiles = profilesRepository();
    var users = usersRepository();
    if (!profiles || !users) return Promise.resolve(context);

    var profilePromise = Promise.resolve(profile);
    if (profile.verificationStatus !== 'verified' && typeof profiles.setVerificationStatus === 'function') {
      profilePromise = profiles.setVerificationStatus(profile.id, 'verified');
    }

    return profilePromise.then(function (nextProfile) {
      if (nextProfile.status === 'pending_verification' && typeof profiles.transition === 'function') {
        return profiles.transition(nextProfile.id, 'active');
      }
      return nextProfile;
    }).then(function (nextProfile) {
      if (nextProfile.status !== 'active') return context;
      if (actor.role === 'professional' && actor.professionalProfileId === nextProfile.id) {
        return Object.assign({}, context, { professionalProfile: nextProfile });
      }
      if (typeof users.updateCurrentUser !== 'function') return context;
      return users.updateCurrentUser(actor.id, {
        role: 'professional',
        type: 'professional',
        professionalProfileId: nextProfile.id,
        publicProfileUrl: 'perfil.html',
        ownerProfileUrl: 'perfil-profissional.html'
      }).then(function (nextUser) {
        syncCurrentSession(nextUser);
        return { user: nextUser, professionalProfile: nextProfile, verification: verification };
      });
    }).catch(function (error) {
      console.warn && console.warn('[Doke] Falha ao reconciliar ativação profissional.', error);
      return context;
    });
  }

  function resolveContext(user) {
    var actor = user || currentUser();
    if (!actor || !actor.id) {
      return Promise.resolve({ user: actor || null, professionalProfile: null, verification: null });
    }

    var profiles = profilesRepository();
    var verifications = verificationsRepository();
    var profilePromise = profiles && typeof profiles.getByUserId === 'function'
      ? profiles.getByUserId(actor.id)
      : Promise.resolve(null);
    var verificationPromise = verifications && typeof verifications.getByUserId === 'function'
      ? verifications.getByUserId(actor.id)
      : Promise.resolve(null);

    return Promise.all([profilePromise, verificationPromise]).then(function (items) {
      return reconcileVerifiedProfessionalState({
        user: actor,
        professionalProfile: items[0] || null,
        verification: items[1] || null
      });
    });
  }

  function evaluate(action, context) {
    if (!permissions || typeof permissions.evaluateProfessionalAccess !== 'function') {
      return Object.assign({}, context || {}, { action: action, allowed: false, reason: 'professional_access_policy_unavailable' });
    }
    return permissions.evaluateProfessionalAccess(action, context || {});
  }

  function can(action, options) {
    options = options || {};
    return resolveContext(options.user).then(function (context) {
      return evaluate(action, context);
    });
  }

  function createAccessError(result) {
    var error = new Error('Acesso profissional indisponível para esta conta.');
    error.code = 'PROFESSIONAL_ACCESS_DENIED';
    error.action = result && result.action || '';
    error.reason = result && result.reason || 'denied';
    error.context = result || null;
    return error;
  }

  function assert(action, options) {
    return can(action, options).then(function (result) {
      if (!result.allowed) throw createAccessError(result);
      return result;
    });
  }

  function redirectFor(result) {
    var reason = result && result.reason || '';
    if (reason === 'auth_required') {
      return 'auth/login.html?return=' + encodeURIComponent(root.location.pathname.split('/').pop() + root.location.search);
    }
    if (reason === 'professional_profile_required' || reason === 'professional_profile_draft') return 'tornar-profissional.html';
    if (reason === 'professional_verification_required' || reason === 'professional_verification_pending' || reason === 'professional_verification_rejected') {
      return 'verificacao-profissional.html';
    }
    return 'meu-perfil.html';
  }

  function lifecycle() {
    return root.DokeNavigationLifecycle || Doke.navigationLifecycle || null;
  }

  function navigate(url, options) {
    if (!url) return Promise.resolve(false);
    options = options || {};
    var navigation = Doke.navigation && Doke.navigation.go;

    if (typeof navigation === 'function') {
      return navigation(url, {
        replace: options.replace !== false,
        forceDocument: options.hard === true,
        source: options.source || 'professional-access-guard',
        captureScroll: options.captureScroll !== false
      });
    }

    if (options.replace !== false) root.location.replace(url);
    else root.location.assign(url);
    return Promise.resolve(true);
  }

  function guardPage(action, options) {
    options = options || {};
    var lifecycleApi = lifecycle();
    var guardId = lifecycleApi && lifecycleApi.guard
      ? lifecycleApi.guard.begin({
          name: options.guardName || action || 'professional-access',
          source: options.source || root.location.pathname
        })
      : 0;
    try { document.documentElement.dataset.professionalAccessState = 'pending'; } catch (_) {}

    return can(action, options).catch(function (error) {
      return {
        action: action,
        allowed: false,
        reason: 'professional_access_context_unavailable',
        error: error || null
      };
    }).then(function (result) {
      try {
        document.documentElement.dataset.professionalAccessState = result.allowed ? 'allowed' : 'denied';
        document.dispatchEvent(new CustomEvent('doke:professional-access-resolved', { detail: result }));
      } catch (_) {}

      if (result.allowed) {
        if (lifecycleApi && lifecycleApi.guard) lifecycleApi.guard.allow(guardId, { result: result });
        return result;
      }

      if (options.redirect === false) {
        if (lifecycleApi && lifecycleApi.guard) lifecycleApi.guard.fail(
          guardId,
          result.error || new Error('Acesso profissional negado.'),
          { result: result, reason: result.reason }
        );
        return result;
      }

      var target = options.redirectUrl || redirectFor(result) || options.fallbackUrl || 'meu-perfil.html';
      if (lifecycleApi && lifecycleApi.guard) lifecycleApi.guard.redirect(guardId, target, {
        result: result,
        reason: result.reason
      });
      navigate(target, {
        hard: options.hardRedirect !== false,
        replace: true,
        source: 'professional-access-guard'
      });
      return Object.assign({}, result, { redirect: target });
    }).catch(function (error) {
      if (lifecycleApi && lifecycleApi.guard) lifecycleApi.guard.fail(guardId, error, {
        source: options.source || root.location.pathname
      });
      throw error;
    });
  }

  services.professionalAccess = Object.freeze({
    ACTIONS: ACTIONS,
    resolveContext: resolveContext,
    evaluate: evaluate,
    can: can,
    assert: assert,
    guardPage: guardPage,
    redirectFor: redirectFor
  });
})();
