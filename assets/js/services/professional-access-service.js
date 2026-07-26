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

  function usesSupabaseProvider() {
    var session = currentSession();
    return String(session && session.provider || '').trim().toLowerCase() === 'supabase';
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
  }

  function professionalAuthorityUnavailable() {
    var error = new Error('Autoridade server-side de acesso profissional indisponível.');
    error.code = 'DOKE_PROFESSIONAL_AUTHORITY_UNAVAILABLE';
    return error;
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
    if (!client || typeof client.from !== 'function') return Promise.reject(professionalAuthorityUnavailable());
    return Promise.all([
      client.from('users').select('id,role,status').eq('id', actor.id).maybeSingle(),
      client.from('professional_profiles').select('*').eq('user_id', actor.id).maybeSingle(),
      client.from('professional_identity_verifications').select('*').eq('user_id', actor.id).maybeSingle()
    ]).then(function (items) {
      if (items[0] && items[0].error) throw items[0].error;
      if (items[1] && items[1].error) throw items[1].error;
      if (items[2] && items[2].error) throw items[2].error;
      var account = items[0] && items[0].data;
      if (!account || String(account.id || '') !== String(actor.id)) return Promise.reject(professionalAuthorityUnavailable());
      var profile = mapRemoteProfessionalProfile(items[1] && items[1].data);
      var verification = mapRemoteVerification(items[2] && items[2].data);
      var accountRole = String(account.role || 'client').trim().toLowerCase();
      var canonicalUser = Object.freeze(Object.assign({}, actor, {
        role: accountRole,
        type: accountRole,
        accountStatus: account.status || actor.accountStatus || 'active',
        professionalProfileId: accountRole === 'professional' && profile ? profile.id : actor.professionalProfileId || '',
        publicProfileUrl: accountRole === 'professional' ? (actor.publicProfileUrl || 'perfil.html') : actor.publicProfileUrl,
        ownerProfileUrl: accountRole === 'professional' ? 'perfil-profissional.html' : actor.ownerProfileUrl
      }));
      return { user: canonicalUser, professionalProfile: profile, verification: verification };
    });
  }

  function profilesRepository() {
    return Doke.repositories && Doke.repositories.professionalProfiles;
  }

  function verificationsRepository() {
    return Doke.repositories && Doke.repositories.professionalIdentityVerifications;
  }

  function resolveContext(user) {
    var actor = user || currentUser();
    if (!actor || !actor.id) {
      return Promise.resolve({ user: actor || null, professionalProfile: null, verification: null });
    }

    if (usesSupabaseProvider()) return resolveRemoteContext(actor);
    if (isUuid(actor.id)) return Promise.reject(professionalAuthorityUnavailable());

    var profiles = profilesRepository();
    var verifications = verificationsRepository();
    var profilePromise = profiles && typeof profiles.getByUserId === 'function'
      ? profiles.getByUserId(actor.id)
      : Promise.resolve(null);
    var verificationPromise = verifications && typeof verifications.getByUserId === 'function'
      ? verifications.getByUserId(actor.id)
      : Promise.resolve(null);

    return Promise.all([profilePromise, verificationPromise]).then(function (items) {
      return { user: actor, professionalProfile: items[0] || null, verification: items[1] || null };
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
