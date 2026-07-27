/* Doke Professional Identity Verifications Repository
   Responsibility: fixture-only in-memory compatibility. Supabase subjects use the canonical service. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  var DEMO_USER_ID = 'user_profissional_demo';
  var DEMO_PROFILE_ID = 'professional_profile_user_profissional_demo';
  var DEMO_VERIFICATION_ID = 'professional_verification_user_profissional_demo';

  var STATUSES = Object.freeze({
    NOT_STARTED: 'not_started',
    SUBMITTED: 'submitted',
    UNDER_REVIEW: 'under_review',
    VERIFIED: 'verified',
    REJECTED: 'rejected'
  });

  var TRANSITIONS = Object.freeze({
    not_started: Object.freeze(['submitted']),
    submitted: Object.freeze(['under_review']),
    under_review: Object.freeze(['verified', 'rejected']),
    rejected: Object.freeze(['not_started']),
    verified: Object.freeze([])
  });

  var fixtureRecords = new Map();
  var fixtureDrafts = new Map();
  var submissionLocks = new Map();

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
      type: normalizeText(value.type, 100),
      blob: typeof Blob !== 'undefined' && value.blob instanceof Blob
        ? value.blob
        : typeof Blob !== 'undefined' && value.file instanceof Blob ? value.file : null
    };
  }

  function normalizePayload(payload) {
    payload = payload && typeof payload === 'object' ? payload : {};
    var verificationType = String(payload.verificationType || 'individual').toLowerCase() === 'business'
      ? 'business'
      : 'individual';
    return {
      verificationType: verificationType,
      legalName: normalizeText(payload.legalName, 120),
      taxId: String(payload.taxId || '').replace(/\D/g, '').slice(0, verificationType === 'business' ? 14 : 11),
      taxIdLast4: String(payload.taxIdLast4 || '').replace(/\D/g, '').slice(-4),
      birthDate: normalizeText(payload.birthDate, 10),
      representativeName: normalizeText(payload.representativeName, 120),
      postalCode: String(payload.postalCode || '').replace(/\D/g, '').slice(0, 8),
      street: normalizeText(payload.street, 120),
      number: normalizeText(payload.number, 20),
      complement: normalizeText(payload.complement, 80),
      district: normalizeText(payload.district, 80),
      city: normalizeText(payload.city, 80),
      state: normalizeText(payload.state, 2).toUpperCase(),
      documentType: normalizeText(payload.documentType, 40),
      documentFront: normalizeFile(payload.documentFront),
      documentBack: normalizeFile(payload.documentBack),
      selfieDocument: normalizeFile(payload.selfieDocument),
      proofOfAddress: normalizeFile(payload.proofOfAddress),
      businessDocument: normalizeFile(payload.businessDocument),
      truthConfirmed: normalizeBoolean(payload.truthConfirmed),
      consentAccepted: normalizeBoolean(payload.consentAccepted)
    };
  }

  function sanitizeFile(value, slot) {
    var file = normalizeFile(value);
    return file ? { fileName: slot, size: file.size, type: file.type } : null;
  }

  function sanitizePayloadForPersistence(payload) {
    var normalized = normalizePayload(payload);
    return {
      verificationType: normalized.verificationType,
      taxIdLast4: normalized.taxId.slice(-4) || normalized.taxIdLast4,
      city: normalized.city,
      state: normalized.state,
      documentType: normalized.documentType,
      documentFront: sanitizeFile(normalized.documentFront, 'document-front'),
      documentBack: sanitizeFile(normalized.documentBack, 'document-back'),
      selfieDocument: sanitizeFile(normalized.selfieDocument, 'selfie-verification'),
      proofOfAddress: sanitizeFile(normalized.proofOfAddress, 'proof-of-address'),
      businessDocument: sanitizeFile(normalized.businessDocument, 'business-document'),
      truthConfirmed: normalized.truthConfirmed,
      consentAccepted: normalized.consentAccepted
    };
  }

  function normalizeStatus(value) {
    var status = String(value || '').trim().toLowerCase();
    return Object.values(STATUSES).indexOf(status) >= 0 ? status : STATUSES.NOT_STARTED;
  }

  function deterministicId(userId) {
    return 'professional_verification_' + normalizeText(userId).replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  function normalizeVerification(record) {
    if (!record || typeof record !== 'object') return null;
    var userId = normalizeText(record.userId || record.ownerId);
    var professionalProfileId = normalizeText(record.professionalProfileId || record.profileId);
    if (!userId || !professionalProfileId) return null;
    var now = new Date().toISOString();
    return {
      id: normalizeText(record.id) || deterministicId(userId),
      userId: userId,
      professionalProfileId: professionalProfileId,
      status: normalizeStatus(record.status),
      currentStep: Math.max(1, Math.min(3, Number(record.currentStep || 1) || 1)),
      payload: sanitizePayloadForPersistence(record.payload || record.fields || {}),
      rejectionReason: normalizeText(record.rejectionReason || record.reason, 500),
      reviewerId: normalizeText(record.reviewerId, 120),
      createdAt: record.createdAt || now,
      updatedAt: record.updatedAt || now,
      savedAt: record.savedAt || record.updatedAt || now,
      submittedAt: record.submittedAt || '',
      reviewStartedAt: record.reviewStartedAt || '',
      decidedAt: record.decidedAt || ''
    };
  }

  function sessionProvider() {
    var session = Doke.session && typeof Doke.session.getSession === 'function' ? Doke.session.getSession() : null;
    return String(session && session.provider || '').trim().toLowerCase();
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
  }

  function isRemoteSubject(userId) {
    return sessionProvider() === 'supabase' || isUuid(userId);
  }

  function remoteAuthorityUnavailable() {
    var error = new Error('Autoridade server-side da verificação profissional indisponível.');
    error.code = 'DOKE_PROFESSIONAL_VERIFICATION_AUTHORITY_UNAVAILABLE';
    return error;
  }

  function seedFixture() {
    if (fixtureRecords.has(DEMO_USER_ID)) return;
    fixtureRecords.set(DEMO_USER_ID, normalizeVerification({
      id: DEMO_VERIFICATION_ID,
      userId: DEMO_USER_ID,
      professionalProfileId: DEMO_PROFILE_ID,
      status: STATUSES.VERIFIED,
      currentStep: 3,
      payload: {},
      reviewerId: 'user_suporte_demo',
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:10:00.000Z',
      savedAt: '2026-01-01T12:10:00.000Z',
      submittedAt: '2026-01-01T12:00:00.000Z',
      reviewStartedAt: '2026-01-01T12:05:00.000Z',
      decidedAt: '2026-01-01T12:10:00.000Z'
    }));
  }

  function mergeDraft(record) {
    if (!record || record.status !== STATUSES.NOT_STARTED) return record;
    var draft = fixtureDrafts.get(record.userId);
    return draft ? Object.assign({}, record, { payload: clone(draft) }) : record;
  }

  function fixtureList(filters) {
    seedFixture();
    filters = filters || {};
    return clone(Array.from(fixtureRecords.values()).filter(function (item) {
      if (filters.userId && String(item.userId) !== String(filters.userId)) return false;
      if (filters.professionalProfileId && String(item.professionalProfileId) !== String(filters.professionalProfileId)) return false;
      if (filters.status && String(item.status) !== String(filters.status)) return false;
      return true;
    }).sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); }));
  }

  function list(filters) {
    filters = filters || {};
    if (isRemoteSubject(filters.userId)) return Promise.reject(remoteAuthorityUnavailable());
    return Promise.resolve(fixtureList(filters));
  }

  function getByUserId(userId) {
    var id = normalizeText(userId);
    if (!id) return Promise.resolve(null);
    if (isRemoteSubject(id)) return Promise.reject(remoteAuthorityUnavailable());
    seedFixture();
    return Promise.resolve(clone(mergeDraft(fixtureRecords.get(id) || null)));
  }

  function getById(verificationId) {
    var id = normalizeText(verificationId);
    if (!id) return Promise.resolve(null);
    seedFixture();
    var record = Array.from(fixtureRecords.values()).find(function (item) { return item.id === id; }) || null;
    if (record && isRemoteSubject(record.userId)) return Promise.reject(remoteAuthorityUnavailable());
    return Promise.resolve(clone(mergeDraft(record)));
  }

  function persistFixture(record) {
    var normalized = normalizeVerification(record);
    if (!normalized) throw new Error('A verificação precisa estar vinculada ao usuário e ao perfil profissional.');
    if (isRemoteSubject(normalized.userId)) throw remoteAuthorityUnavailable();
    fixtureRecords.set(normalized.userId, normalized);
    return clone(normalized);
  }

  function saveDraft(userId, professionalProfileId, draft) {
    var ownerId = normalizeText(userId);
    var profileId = normalizeText(professionalProfileId);
    if (!ownerId || !profileId) return Promise.reject(new Error('Perfil profissional não identificado para salvar a verificação.'));
    if (isRemoteSubject(ownerId)) return Promise.reject(remoteAuthorityUnavailable());
    draft = draft || {};
    return getByUserId(ownerId).then(function (current) {
      if (current && [STATUSES.SUBMITTED, STATUSES.UNDER_REVIEW, STATUSES.VERIFIED].indexOf(current.status) >= 0) {
        throw new Error('A verificação enviada não pode ser alterada neste momento.');
      }
      var now = new Date().toISOString();
      var rawPayload = normalizePayload(draft.payload || draft.fields || current && current.payload || {});
      fixtureDrafts.set(ownerId, rawPayload);
      return mergeDraft(persistFixture(Object.assign({}, current || {}, {
        id: current && current.id || deterministicId(ownerId),
        userId: ownerId,
        professionalProfileId: profileId,
        status: STATUSES.NOT_STARTED,
        currentStep: draft.currentStep || current && current.currentStep || 1,
        payload: rawPayload,
        createdAt: current && current.createdAt || now,
        updatedAt: now,
        savedAt: now
      })));
    });
  }

  function submit(userId, professionalProfileId, submission) {
    var ownerId = normalizeText(userId);
    var profileId = normalizeText(professionalProfileId);
    if (!ownerId || !profileId) return Promise.reject(new Error('Perfil profissional não identificado para enviar a verificação.'));
    if (isRemoteSubject(ownerId)) return Promise.reject(remoteAuthorityUnavailable());
    if (submissionLocks.has(ownerId)) {
      var locked = new Error('A verificação já foi enviada ou está sendo processada.');
      locked.code = 'PROFESSIONAL_IDENTITY_VERIFICATION_SUBMISSION_LOCKED';
      return Promise.reject(locked);
    }
    var operation = getByUserId(ownerId).then(function (current) {
      if (current && current.status !== STATUSES.NOT_STARTED) throw new Error('A verificação não pode ser reenviada neste momento.');
      var now = new Date().toISOString();
      var rawPayload = submission && (submission.payload || submission.fields) || current && current.payload || {};
      var evidence = repositories.professionalVerificationEvidence;
      var verificationId = current && current.id || deterministicId(ownerId);
      var saveEvidence = evidence && typeof evidence.save === 'function'
        ? evidence.save(verificationId, ownerId, rawPayload)
        : Promise.resolve(null);
      return saveEvidence.then(function () {
        fixtureDrafts.delete(ownerId);
        return persistFixture(Object.assign({}, current || {}, {
          id: verificationId,
          userId: ownerId,
          professionalProfileId: profileId,
          status: STATUSES.SUBMITTED,
          currentStep: 3,
          payload: rawPayload,
          createdAt: current && current.createdAt || now,
          updatedAt: now,
          savedAt: now,
          submittedAt: current && current.submittedAt || now
        }));
      });
    }).finally(function () { submissionLocks.delete(ownerId); });
    submissionLocks.set(ownerId, operation);
    return operation;
  }

  function transition(verificationId, nextStatus, meta) {
    meta = meta || {};
    return getById(verificationId).then(function (current) {
      if (!current) throw new Error('Verificação de identidade não encontrada.');
      if (isRemoteSubject(current.userId)) throw remoteAuthorityUnavailable();
      var target = normalizeStatus(nextStatus);
      if (current.status === target) return current;
      var allowed = TRANSITIONS[current.status] || [];
      if (allowed.indexOf(target) === -1) throw new Error('Transição inválida de ' + current.status + ' para ' + target + '.');
      var now = new Date().toISOString();
      var patch = { status: target, updatedAt: now, reviewerId: normalizeText(meta.reviewerId || current.reviewerId, 120) };
      if (target === STATUSES.UNDER_REVIEW) patch.reviewStartedAt = current.reviewStartedAt || now;
      if (target === STATUSES.VERIFIED || target === STATUSES.REJECTED) patch.decidedAt = current.decidedAt || now;
      if (target === STATUSES.REJECTED) patch.rejectionReason = normalizeText(meta.reason, 500);
      if (target === STATUSES.NOT_STARTED) {
        fixtureDrafts.set(current.userId, current.payload || {});
        patch.rejectionReason = '';
        patch.reviewerId = '';
        patch.reviewStartedAt = '';
        patch.decidedAt = '';
        patch.submittedAt = '';
      }
      return mergeDraft(persistFixture(Object.assign({}, current, patch)));
    });
  }

  repositories.professionalIdentityVerifications = Object.freeze({
    authority: 'supabase-service-or-fixture-memory',
    statuses: STATUSES,
    transitions: TRANSITIONS,
    normalize: normalizeVerification,
    normalizePayload: normalizePayload,
    sanitizePayloadForPersistence: sanitizePayloadForPersistence,
    list: list,
    getById: getById,
    getByUserId: getByUserId,
    saveDraft: saveDraft,
    submit: submit,
    transition: transition
  });
})();