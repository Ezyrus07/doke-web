/* Doke Professional Profiles Repository
   Responsibility: canonical local/mock persistence for professional profile setup. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  var STORAGE_KEY = 'doke.professionalProfiles.v1';
  var LEGACY_APPLICATION_KEY = 'doke.professionalApplications.v1';
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

  var legacyMigrationChecked = false;
  var completionInFlight = new Map();

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return value; }
  }

  function safeParse(value, fallback) {
    try { return value ? JSON.parse(value) : fallback; }
    catch (_) { return fallback; }
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

  function deterministicId(userId) {
    var safe = normalizeText(userId).replace(/[^a-zA-Z0-9_-]/g, '_');
    return 'professional_profile_' + (safe || Date.now());
  }

  function normalizeProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;
    var now = new Date().toISOString();
    var userId = normalizeText(profile.userId || profile.ownerId);
    if (!userId) return null;
    var status = normalizeStatus(profile.status);
    return {
      id: normalizeText(profile.id) || deterministicId(userId),
      userId: userId,
      status: status,
      currentStep: Math.max(1, Math.min(2, Number(profile.currentStep || 1) || 1)),
      payload: normalizePayload(profile.payload || profile.fields || profile.setupPayload),
      createdAt: profile.createdAt || now,
      updatedAt: profile.updatedAt || now,
      savedAt: profile.savedAt || profile.updatedAt || now,
      completedAt: profile.completedAt || profile.submittedAt || '',
      verificationStatus: normalizeVerificationStatus(profile.verificationStatus, status)
    };
  }

  function writeAll(items) {
    root.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  }

  function migrateLegacyApplications() {
    if (legacyMigrationChecked) return;
    legacyMigrationChecked = true;

    var legacy = safeParse(root.localStorage.getItem(LEGACY_APPLICATION_KEY), []);
    if (!Array.isArray(legacy) || !legacy.length) return;

    var existing = safeParse(root.localStorage.getItem(STORAGE_KEY), []);
    if (!Array.isArray(existing)) existing = [];
    var byUser = new Map(existing.map(function (item) { return [String(item && item.userId || ''), item]; }));

    legacy.forEach(function (application) {
      var userId = normalizeText(application && application.userId);
      if (!userId || byUser.has(userId)) return;
      var legacyStatus = String(application.status || 'draft').toLowerCase();
      var migratedStatus = ['submitted', 'under_review', 'approved'].indexOf(legacyStatus) >= 0
        ? STATUSES.PENDING_VERIFICATION
        : STATUSES.DRAFT;
      var migrated = normalizeProfile({
        id: deterministicId(userId),
        userId: userId,
        status: migratedStatus,
        currentStep: migratedStatus === STATUSES.DRAFT ? Math.min(2, Number(application.currentStep || 1)) : 2,
        payload: application.payload || application.fields || {},
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        savedAt: application.savedAt,
        completedAt: application.submittedAt || application.decidedAt || '',
        verificationStatus: migratedStatus === STATUSES.PENDING_VERIFICATION ? 'not_started' : ''
      });
      if (migrated) {
        existing.push(migrated);
        byUser.set(userId, migrated);
      }
    });

    writeAll(existing.map(normalizeProfile).filter(Boolean));
    root.localStorage.removeItem(LEGACY_APPLICATION_KEY);
  }

  function ensureDemoProfessionalProfile(items) {
    var list = Array.isArray(items) ? items.slice() : [];
    var index = list.findIndex(function (item) {
      return String(item && item.userId || '') === DEMO_PROFESSIONAL_USER_ID;
    });
    var current = index >= 0 ? list[index] : null;
    var seeded = normalizeProfile(Object.assign({}, current || {}, {
      id: current && current.id || DEMO_PROFESSIONAL_PROFILE_ID,
      userId: DEMO_PROFESSIONAL_USER_ID,
      status: STATUSES.ACTIVE,
      currentStep: 2,
      payload: Object.assign({
        mainCategory: 'Pintura e acabamento',
        specialties: 'Pintura residencial, acabamento e pequenos reparos',
        shortBio: 'Profissional Doke especializado em pintura residencial.',
        serviceRegion: 'Salvador e região',
        experienceYears: '5+',
        truthConfirmed: true,
        termsAccepted: true
      }, current && current.payload || {}),
      createdAt: current && current.createdAt || '2026-01-01T12:00:00.000Z',
      updatedAt: current && current.updatedAt || '2026-01-01T12:00:00.000Z',
      savedAt: current && current.savedAt || '2026-01-01T12:00:00.000Z',
      completedAt: current && current.completedAt || '2026-01-01T12:00:00.000Z',
      verificationStatus: 'verified'
    }));
    if (index >= 0) list[index] = seeded;
    else list.push(seeded);
    return list;
  }

  function readAll() {
    migrateLegacyApplications();
    var parsed = safeParse(root.localStorage.getItem(STORAGE_KEY), []);
    if (!Array.isArray(parsed)) parsed = [];
    var normalized = ensureDemoProfessionalProfile(parsed.map(normalizeProfile).filter(Boolean));
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) writeAll(normalized);
    return normalized;
  }

  function sortNewest(items) {
    return items.slice().sort(function (a, b) {
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    });
  }

  function list(filters) {
    filters = filters || {};
    var items = readAll().filter(function (item) {
      if (filters.userId && String(item.userId) !== String(filters.userId)) return false;
      if (filters.status && String(item.status) !== String(filters.status)) return false;
      return true;
    });
    return Promise.resolve(clone(sortNewest(items)));
  }

  function getById(profileId) {
    var id = normalizeText(profileId);
    if (!id) return Promise.resolve(null);
    return Promise.resolve(clone(readAll().find(function (item) { return item.id === id; }) || null));
  }

  function getByUserId(userId) {
    var id = normalizeText(userId);
    if (!id) return Promise.resolve(null);
    return Promise.resolve(clone(readAll().find(function (item) { return item.userId === id; }) || null));
  }

  function persist(profile) {
    var normalized = normalizeProfile(profile);
    if (!normalized) throw new Error('O perfil profissional precisa estar vinculado a um usuário.');
    var items = readAll();
    var index = items.findIndex(function (item) { return item.id === normalized.id || item.userId === normalized.userId; });
    if (index >= 0) items[index] = normalized;
    else items.push(normalized);
    writeAll(items);
    return clone(normalized);
  }

  function saveDraft(userId, draft) {
    var id = normalizeText(userId);
    if (!id) return Promise.reject(new Error('Usuário não identificado para salvar o perfil profissional.'));
    draft = draft || {};

    return getByUserId(id).then(function (current) {
      if (current && current.status !== STATUSES.DRAFT) {
        throw new Error('O perfil profissional já foi criado e não pode voltar para rascunho.');
      }
      var now = new Date().toISOString();
      return persist(Object.assign({}, current || {}, {
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
    if (completionInFlight.has(id)) return completionInFlight.get(id);

    var operation = getByUserId(id).then(function (current) {
      if (current && current.status !== STATUSES.DRAFT) return current;
      var now = new Date().toISOString();
      return persist(Object.assign({}, current || {}, {
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
    }).finally(function () {
      completionInFlight.delete(id);
    });

    completionInFlight.set(id, operation);
    return operation;
  }


  function setVerificationStatus(profileId, verificationStatus) {
    var next = String(verificationStatus || '').trim().toLowerCase();
    if (VERIFICATION_STATUSES.indexOf(next) === -1) {
      return Promise.reject(new Error('Status de verificação profissional inválido.'));
    }
    return getById(profileId).then(function (current) {
      if (!current) throw new Error('Perfil profissional não encontrado.');
      if (current.verificationStatus === next) return current;
      return persist(Object.assign({}, current, {
        verificationStatus: next,
        updatedAt: new Date().toISOString()
      }));
    });
  }

  function transition(profileId, nextStatus) {
    var target = normalizeStatus(nextStatus);
    return getById(profileId).then(function (current) {
      if (!current) throw new Error('Perfil profissional não encontrado.');
      if (current.status === target) return current;
      var allowed = TRANSITIONS[current.status] || [];
      if (allowed.indexOf(target) === -1) throw new Error('Transição inválida de ' + current.status + ' para ' + target + '.');
      return persist(Object.assign({}, current, { status: target, updatedAt: new Date().toISOString() }));
    });
  }

  repositories.professionalProfiles = Object.freeze({
    storageKey: STORAGE_KEY,
    legacyApplicationKey: LEGACY_APPLICATION_KEY,
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
    setVerificationStatus: setVerificationStatus,
    transition: transition
  });
})();
