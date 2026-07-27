/* Doke Professional Profiles Repository
   Responsibility: Supabase-first professional profile reads and fixture-only in-memory compatibility. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  var DEMO_PROFESSIONAL_USER_ID = 'user_profissional_demo';
  var DEMO_PROFESSIONAL_PROFILE_ID = 'professional_profile_user_profissional_demo';

  var STATUSES = Object.freeze({
    DRAFT: 'draft',
    PENDING_VERIFICATION: 'pending_verification',
    ACTIVE: 'active',
    SUSPENDED: 'suspended'
  });

  var VERIFICATION_STATUSES = Object.freeze(['not_started', 'submitted', 'under_review', 'verified', 'rejected']);
  var TRANSITIONS = Object.freeze({
    draft: Object.freeze(['pending_verification']),
    pending_verification: Object.freeze(['active', 'suspended']),
    active: Object.freeze(['suspended']),
    suspended: Object.freeze(['active'])
  });

  var fixtureProfiles = new Map();
  var completionInFlight = new Map();

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return value; }
  }

  function normalizeText(value, maxLength) {
    var text = String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
    return maxLength ? text.slice(0, maxLength) : text;
  }

  function normalizeBoolean(value) {
    return value === true || value === 'true' || value === 'on' || value === 1 || value === '1';
  }

  function normalizeFile(value) {
    if (!value || typeof value !== 'object') return null;
    var fileName = normalizeText(value.fileName || value.name, 180);
    if (!fileName) return null;
    return {
      fileName: fileName,
      size: Math.max(0, Number(value.size || 0) || 0),
      type: normalizeText(value.type, 100)
    };
  }

  function normalizePayload(payload) {
    payload = payload && typeof payload === 'object' ? payload : {};
    return {
      mainCategory: normalizeText(payload.mainCategory, 80),
      otherCategory: normalizeText(payload.otherCategory, 80),
      specialties: normalizeText(payload.specialties || payload.specialty, 180),
      shortBio: normalizeText(payload.shortBio, 350),
      serviceRegion: normalizeText(payload.serviceRegion, 140),
      experienceYears: normalizeText(payload.experienceYears, 60),
      experienceEvidence: normalizeFile(payload.experienceEvidence),
      truthConfirmed: normalizeBoolean(payload.truthConfirmed),
      termsAccepted: normalizeBoolean(payload.termsAccepted || payload.conductAccepted)
    };
  }

  function normalizeVerificationStatus(value, profileStatus) {
    var status = String(value || '').trim().toLowerCase();
    if (VERIFICATION_STATUSES.indexOf(status) >= 0) return status;
    return profileStatus === STATUSES.PENDING_VERIFICATION ? 'not_started' : (profileStatus === STATUSES.ACTIVE ? 'verified' : '');
  }

  function normalizeStatus(value) {
    var status = String(value || '').trim().toLowerCase();
    return Object.values(STATUSES).indexOf(status) >= 0 ? status : STATUSES.DRAFT;
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
  }

  function deterministicId(userId) {
    var safe = normalizeText(userId).replace(/[^a-zA-Z0-9_-]/g, '_');
    return 'professional_profile_' + (safe || Date.now());
  }

  function normalizeProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;
    var now = new Date().toISOString();
    var userId = normalizeText(profile.userId || profile.user_id || profile.ownerId);
    if (!userId) return null;
    var status = normalizeStatus(profile.status || profile.setup_status);
    return {
      id: normalizeText(profile.id) || deterministicId(userId),
      userId: userId,
      status: status,
      currentStep: Math.max(1, Math.min(2, Number(profile.currentStep || profile.setup_current_step || 1) || 1)),
      payload: normalizePayload(profile.payload || profile.setup_payload || profile.fields || profile.setupPayload),
      createdAt: profile.createdAt || profile.created_at || now,
      updatedAt: profile.updatedAt || profile.updated_at || now,
      savedAt: profile.savedAt || profile.updatedAt || profile.updated_at || now,
      completedAt: profile.completedAt || profile.setup_completed_at || profile.submittedAt || '',
      verificationStatus: normalizeVerificationStatus(profile.verificationStatus || profile.verification_status, status),
      documentStatus: normalizeText(profile.documentStatus || profile.document_status, 40)
    };
  }

  function seedFixtureProfile() {
    if (fixtureProfiles.has(DEMO_PROFESSIONAL_USER_ID)) return;
    fixtureProfiles.set(DEMO_PROFESSIONAL_USER_ID, normalizeProfile({
      id: DEMO_PROFESSIONAL_PROFILE_ID,
      userId: DEMO_PROFESSIONAL_USER_ID,
      status: STATUSES.ACTIVE,
      currentStep: 2,
      payload: {
        mainCategory: 'Pintura e acabamento',
        specialties: 'Pintura residencial, acabamento e pequenos reparos',
        shortBio: 'Profissional Doke especializado em pintura residencial.',
        serviceRegion: 'Salvador e região',
        experienceYears: '5+',
        truthConfirmed: true,
        termsAccepted: true
      },
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
      savedAt: '2026-01-01T12:00:00.000Z',
      completedAt: '2026-01-01T12:00:00.000Z',
      verificationStatus: 'verified',
      documentStatus: 'verified'
    }));
  }

  function session() {
    return Doke.session && typeof Doke.session.getSession === 'function'
      ? Doke.session.getSession()
      : null;
  }

  function currentUser() {
    return Doke.session && typeof Doke.session.getCurrentUser === 'function'
      ? Doke.session.getCurrentUser()
      : null;
  }

  function sessionProvider() {
    var value = session();
    return String(value && value.provider || '').trim().toLowerCase();
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

  function isRemoteSubject(userId) {
    return sessionProvider() === 'supabase' || isUuid(userId);
  }

  function authorityError(message, code) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function remoteAuthorityUnavailable() {
    return authorityError(
      'Autoridade server-side do perfil profissional indisponível.',
      'DOKE_PROFESSIONAL_PROFILE_AUTHORITY_UNAVAILABLE'
    );
  }

  function remoteTransitionRequired() {
    return authorityError(
      'Transições do perfil profissional exigem autoridade server-side.',
      'DOKE_PROFESSIONAL_PROFILE_SERVER_TRANSITION_REQUIRED'
    );
  }

  function activeEditAuthorityUnavailable() {
    return authorityError(
      'A edição dos campos profissionais aguarda uma operação server-side reconciliada.',
      'DOKE_PROFESSIONAL_PROFILE_EDIT_AUTHORITY_UNAVAILABLE'
    );
  }

  function requireRemoteActor(userId) {
    var user = currentUser();
    var client = supabaseClient();
    if (sessionProvider() !== 'supabase' || !client) throw remoteAuthorityUnavailable();
    if (!user || !user.id || String(user.id) !== String(userId)) {
      throw authorityError('O perfil profissional não pertence à sessão atual.', 'DOKE_PROFESSIONAL_PROFILE_SUBJECT_MISMATCH');
    }
    return { user: user, client: client };
  }

  function mapRemoteProfile(row) {
    return normalizeProfile(row);
  }

  function readRemoteByUserId(userId) {
    var client = supabaseClient();
    if (sessionProvider() !== 'supabase' || !client) return Promise.reject(remoteAuthorityUnavailable());
    return client.from('professional_profiles').select('*').eq('user_id', userId).maybeSingle().then(function (result) {
      if (result && result.error) throw result.error;
      return mapRemoteProfile(result && result.data);
    });
  }

  function fixtureList(filters) {
    seedFixtureProfile();
    filters = filters || {};
    var items = Array.from(fixtureProfiles.values()).filter(function (item) {
      if (filters.userId && String(item.userId) !== String(filters.userId)) return false;
      if (filters.status && String(item.status) !== String(filters.status)) return false;
      return true;
    });
    return clone(items.sort(function (a, b) {
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    }));
  }

  function list(filters) {
    filters = filters || {};
    var targetUserId = normalizeText(filters.userId);
    var user = currentUser();
    if (!isRemoteSubject(targetUserId || (user && user.id))) {
      return Promise.resolve(fixtureList(filters));
    }
    var client = supabaseClient();
    if (sessionProvider() !== 'supabase' || !client) return Promise.reject(remoteAuthorityUnavailable());
    var query = client.from('professional_profiles').select('*');
    if (targetUserId) query = query.eq('user_id', targetUserId);
    if (filters.status) query = query.eq('setup_status', String(filters.status));
    return Promise.resolve(query).then(function (result) {
      if (result && result.error) throw result.error;
      return clone((result && result.data || []).map(mapRemoteProfile).filter(Boolean));
    });
  }

  function profileUserId(profileId) {
    var value = normalizeText(profileId);
    return value.indexOf('professional_profile_') === 0
      ? value.slice('professional_profile_'.length)
      : value;
  }

  function getById(profileId) {
    var userId = profileUserId(profileId);
    if (!userId) return Promise.resolve(null);
    return getByUserId(userId);
  }

  function getByUserId(userId) {
    var id = normalizeText(userId);
    if (!id) return Promise.resolve(null);
    if (isRemoteSubject(id)) return readRemoteByUserId(id);
    seedFixtureProfile();
    return Promise.resolve(clone(fixtureProfiles.get(id) || null));
  }

  function invokeProfileSetup(userId, draft, complete) {
    requireRemoteActor(userId);
    var api = root.DokeSupabase;
    if (!api || typeof api.invokeSelfService !== 'function') return Promise.reject(remoteAuthorityUnavailable());
    draft = draft || {};
    return api.invokeSelfService('save_professional_profile_setup', {
      p_payload: normalizePayload(draft.payload || draft.fields || {}),
      p_current_step: complete ? 2 : (draft.currentStep || draft.step || 1),
      p_complete: Boolean(complete)
    }).then(function (profile) {
      return normalizeProfile(profile);
    });
  }

  function persistFixture(profile) {
    var normalized = normalizeProfile(profile);
    if (!normalized) throw new Error('O perfil profissional precisa estar vinculado a um usuário.');
    if (isRemoteSubject(normalized.userId)) throw remoteAuthorityUnavailable();
    fixtureProfiles.set(normalized.userId, normalized);
    return clone(normalized);
  }

  function saveDraft(userId, draft) {
    var id = normalizeText(userId);
    if (!id) return Promise.reject(new Error('Usuário não identificado para salvar o perfil profissional.'));
    if (isRemoteSubject(id)) return invokeProfileSetup(id, draft, false);
    draft = draft || {};
    return getByUserId(id).then(function (current) {
      if (current && current.status !== STATUSES.DRAFT) throw new Error('O perfil profissional já foi criado e não pode voltar para rascunho.');
      var now = new Date().toISOString();
      return persistFixture(Object.assign({}, current || {}, {
        id: current && current.id || deterministicId(id),
        userId: id,
        status: STATUSES.DRAFT,
        currentStep: draft.currentStep || current && current.currentStep || 1,
        payload: draft.payload || draft.fields || current && current.payload || {},
        createdAt: current && current.createdAt || now,
        updatedAt: now,
        savedAt: now,
        completedAt: '',
        verificationStatus: ''
      }));
    });
  }

  function completeSetup(userId, setup) {
    var id = normalizeText(userId);
    if (!id) return Promise.reject(new Error('Usuário não identificado para criar o perfil profissional.'));
    setup = setup || {};
    if (isRemoteSubject(id)) {
      if (completionInFlight.has(id)) return completionInFlight.get(id);
      var remoteOperation = invokeProfileSetup(id, setup, true).finally(function () { completionInFlight.delete(id); });
      completionInFlight.set(id, remoteOperation);
      return remoteOperation;
    }
    return getByUserId(id).then(function (current) {
      if (current && current.status !== STATUSES.DRAFT) return current;
      var now = new Date().toISOString();
      return persistFixture(Object.assign({}, current || {}, {
        id: current && current.id || deterministicId(id),
        userId: id,
        status: STATUSES.PENDING_VERIFICATION,
        currentStep: 2,
        payload: setup.payload || setup.fields || current && current.payload || {},
        createdAt: current && current.createdAt || now,
        updatedAt: now,
        savedAt: now,
        completedAt: current && current.completedAt || now,
        verificationStatus: 'not_started'
      }));
    });
  }

  function updateActiveProfile(userId, patch) {
    var id = normalizeText(userId);
    if (!id) return Promise.reject(new Error('Usuário não identificado para editar o perfil profissional.'));
    if (isRemoteSubject(id)) return Promise.reject(activeEditAuthorityUnavailable());
    patch = patch && typeof patch === 'object' ? patch : {};
    return getByUserId(id).then(function (current) {
      if (!current) throw new Error('Perfil profissional não encontrado.');
      if (current.status !== STATUSES.ACTIVE) throw new Error('Apenas perfis profissionais ativos podem ser editados.');
      return persistFixture(Object.assign({}, current, {
        payload: normalizePayload(Object.assign({}, current.payload || {}, patch.payload || patch.fields || patch)),
        updatedAt: new Date().toISOString(),
        savedAt: new Date().toISOString()
      }));
    });
  }

  function setVerificationStatus(profileId, verificationStatus) {
    var userId = profileUserId(profileId);
    if (isRemoteSubject(userId)) return Promise.reject(remoteTransitionRequired());
    var next = String(verificationStatus || '').trim().toLowerCase();
    if (VERIFICATION_STATUSES.indexOf(next) === -1) return Promise.reject(new Error('Status de verificação profissional inválido.'));
    return getByUserId(userId).then(function (current) {
      if (!current) throw new Error('Perfil profissional não encontrado.');
      return persistFixture(Object.assign({}, current, { verificationStatus: next, updatedAt: new Date().toISOString() }));
    });
  }

  function transition(profileId, nextStatus) {
    var userId = profileUserId(profileId);
    if (isRemoteSubject(userId)) return Promise.reject(remoteTransitionRequired());
    var target = normalizeStatus(nextStatus);
    return getByUserId(userId).then(function (current) {
      if (!current) throw new Error('Perfil profissional não encontrado.');
      if (current.status === target) return current;
      var allowed = TRANSITIONS[current.status] || [];
      if (allowed.indexOf(target) === -1) throw new Error('Transição inválida de ' + current.status + ' para ' + target + '.');
      return persistFixture(Object.assign({}, current, { status: target, updatedAt: new Date().toISOString() }));
    });
  }

  repositories.professionalProfiles = Object.freeze({
    authority: 'supabase-or-fixture-memory',
    statuses: STATUSES,
    transitions: TRANSITIONS,
    verificationStatuses: VERIFICATION_STATUSES,
    normalize: normalizeProfile,
    normalizePayload: normalizePayload,
    list: list,
    getById: getById,
    getByUserId: getByUserId,
    saveDraft: saveDraft,
    completeSetup: completeSetup,
    updateActiveProfile: updateActiveProfile,
    setVerificationStatus: setVerificationStatus,
    transition: transition
  });
})();
