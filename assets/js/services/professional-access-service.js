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

  function currentSession() {
    return Doke.session && typeof Doke.session.getSession === 'function'
      ? Doke.session.getSession()
      : null;
  }

  function supabaseClient() {
    try {
      return root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
        ? root.DokeSupabase.getClient()
        : null;
    } catch (_) {
      return null;
    }
  }

  function hasConfiguredSupabase() {
    var config = root.DOKE_SUPABASE_CONFIG || {};
    return Boolean(
      config.enabled !== false
      && config.url
      && (config.anonKey || config.publishableKey)
      && supabaseClient()
    );
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
  }

  function usesSupabaseProvider(actor) {
    var session = currentSession();
    var provider = String(session && session.provider || '').trim().toLowerCase();
    if (provider === 'supabase') return true;

    // O contrato legado normaliza provedores desconhecidos como `mock`, inclusive
    // sessões reais do Supabase. Um usuário autenticado remoto mantém UUID e o
    // cliente configurado, enquanto os usuários mock usam IDs sem formato UUID.
    var user = actor || currentUser();
    return hasConfiguredSupabase() && isUuid(user && user.id);
  }

  function mapRemoteProfessionalProfile(row) {
    if (!row) return null;
    return {
      id: row.id || 'professional_profile_' + row.user_id,
      userId: row.user_id,
      status: row.setup_status || 'draft',
      currentStep: Number(row.setup_current_step || 1),
      payload: row.setup_payload || {},
      verificationStatus: row.verification_status || 'not_started',
      documentStatus: row.document_status || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
      completedAt: row.setup_completed_at || ''
    };
  }

  function mapRemoteVerification(row) {
    if (!row) return null;
    return {
      id: row.id || 'professional_verification_' + row.user_id,
      userId: row.user_id,
      professionalProfileId: row.professional_profile_id || '',
      status: row.status || 'not_started',
      documentStatus: row.document_status || '',
      rejectionReason: row.rejection_reason || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
      decidedAt: row.decided_at || ''
    };
  }

  function resolveRemoteContext(actor) {
    var client = supabaseClient();
    if (!client || typeof client.from !== 'function') {
      return Promise.reject(new Error('Supabase indisponível para validar o acesso profissional.'));
    }
    return Promise.all([
      client.from('professional_profiles').select('*').eq('user_id', actor.id).maybeSingle(),
      client.from('professional_identity_verifications').select('*').eq('user_id', actor.id).maybeSingle()
    ]).then(function (items) {
      if (items[0] && items[0].error) throw items[0].error;
      if (items[1] && items[1].error) throw items[1].error;
      var profile = mapRemoteProfessionalProfile(items[0] && items[0].data);
      var verification = mapRemoteVerification(items[1] && items[1].data);
      var approved = Boolean(
        profile
        && verification
        && profile.status === 'active'
        && profile.verificationStatus === 'verified'
        && profile.documentStatus === 'verified'
        && verification.status === 'verified'
      );
      var canonicalUser = approved ? Object.assign({}, actor, {
        role: 'professional',
        type: 'professional',
        professionalProfileId: profile.id,
        publicProfileUrl: actor.publicProfileUrl || 'perfil.html',
        ownerProfileUrl: 'perfil-profissional.html'
      }) : actor;
      return {
        user: canonicalUser,
        professionalProfile: profile,
        verification: verification
      };
    });
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
      if (typeof users.updateProfessionalFixtureUser !== 'function') return context;
      return users.updateProfessionalFixtureUser(actor.id, {
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

    if (usesSupabaseProvider(actor)) return resolveRemoteContext(actor);

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

      // Falha de leitura do contexto não representa mudança de estado da conta.
      // Redirecionar nesse caso faz outra página consultar novamente e pode criar
      // um ciclo entre perfil e verificação. Mantemos a rota e exibimos o erro.
      if (result.reason === 'professional_access_context_unavailable') {
        var contextError = result.error || new Error('Não foi possível validar o acesso profissional.');
        if (lifecycleApi && lifecycleApi.guard) lifecycleApi.guard.fail(guardId, contextError, {
          result: result,
          reason: result.reason
        });
        throw contextError;
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
