/* Doke Professional Identity Verifications Repository
   Responsibility: local/mock persistence for professional identity verification records. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  var root = window;
  var STORAGE_KEY = 'doke.professionalIdentityVerifications.v1';
  var DRAFT_STORAGE_KEY = 'doke.professionalIdentityVerificationDrafts.v1';
  var draftMemory = new Map();

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
    var verificationType = String(payload.verificationType || 'individual').toLowerCase();
    if (verificationType !== 'business') verificationType = 'individual';
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
    if (!file) return null;
    return {
      fileName: slot,
      size: file.size,
      type: file.type
    };
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

  function readDrafts() {
    var store = root.sessionStorage;
    if (!store || typeof store.getItem !== 'function') return new Map(draftMemory);
    var parsed = safeParse(store.getItem(DRAFT_STORAGE_KEY), {});
    return new Map(Object.entries(parsed && typeof parsed === 'object' ? parsed : {}));
  }

  function writeDrafts(drafts) {
    draftMemory = new Map(drafts);
    var store = root.sessionStorage;
    if (!store || typeof store.setItem !== 'function') return;
    var value = {};
    drafts.forEach(function (payload, userId) { value[userId] = payload; });
    store.setItem(DRAFT_STORAGE_KEY, JSON.stringify(value));
  }

  function getDraft(userId) {
    return clone(readDrafts().get(String(userId || '')) || null);
  }

  function setDraft(userId, payload) {
    var drafts = readDrafts();
    drafts.set(String(userId), normalizePayload(payload));
    writeDrafts(drafts);
  }

  function removeDraft(userId) {
    var drafts = readDrafts();
    drafts.delete(String(userId || ''));
    writeDrafts(drafts);
  }

  function mergeDraft(record) {
    if (!record || record.status !== STATUSES.NOT_STARTED) return record;
    var draft = getDraft(record.userId);
    return draft ? Object.assign({}, record, { payload: draft }) : record;
  }

  function normalizeStatus(value) {
    var status = String(value || '').trim().toLowerCase();
    return Object.values(STATUSES).indexOf(status) >= 0 ? status : STATUSES.NOT_STARTED;
  }

  function deterministicId(userId) {
    var safe = normalizeText(userId).replace(/[^a-zA-Z0-9_-]/g, '_');
    return 'professional_verification_' + (safe || Date.now());
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

  function readAll() {
    var parsed = safeParse(root.localStorage.getItem(STORAGE_KEY), []);
    if (!Array.isArray(parsed)) return [];
    var normalized = parsed.map(normalizeVerification).filter(Boolean);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) writeAll(normalized);
    return normalized;
  }

  function writeAll(items) {
    root.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  }

  function persist(record) {
    var normalized = normalizeVerification(record);
    if (!normalized) throw new Error('A verificação precisa estar vinculada ao usuário e ao perfil profissional.');
    var items = readAll();
    var index = items.findIndex(function (item) {
      return item.id === normalized.id || item.userId === normalized.userId;
    });
    if (index >= 0) items[index] = normalized;
    else items.push(normalized);
    writeAll(items);
    return clone(normalized);
  }

  function list(filters) {
    filters = filters || {};
    var items = readAll().filter(function (item) {
      if (filters.userId && String(item.userId) !== String(filters.userId)) return false;
      if (filters.professionalProfileId && String(item.professionalProfileId) !== String(filters.professionalProfileId)) return false;
      if (filters.status && String(item.status) !== String(filters.status)) return false;
      return true;
    });
    items.sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); });
    return Promise.resolve(clone(items));
  }

  function getById(verificationId) {
    var id = normalizeText(verificationId);
    if (!id) return Promise.resolve(null);
    var record = readAll().find(function (item) { return item.id === id; }) || null;
    return Promise.resolve(clone(mergeDraft(record)));
  }

  function getByUserId(userId) {
    var id = normalizeText(userId);
    if (!id) return Promise.resolve(null);
    var record = readAll().find(function (item) { return item.userId === id; }) || null;
    return Promise.resolve(clone(mergeDraft(record)));
  }

  function saveDraft(userId, professionalProfileId, draft) {
    var ownerId = normalizeText(userId);
    var profileId = normalizeText(professionalProfileId);
    if (!ownerId || !profileId) return Promise.reject(new Error('Perfil profissional não identificado para salvar a verificação.'));
    draft = draft || {};

    return getByUserId(ownerId).then(function (current) {
      if (current && [STATUSES.SUBMITTED, STATUSES.UNDER_REVIEW, STATUSES.VERIFIED].indexOf(current.status) >= 0) {
        throw new Error('A verificação enviada não pode ser alterada neste momento.');
      }
      var now = new Date().toISOString();
      var rawPayload = normalizePayload(draft.payload || draft.fields || current && current.payload || {});
      setDraft(ownerId, rawPayload);
      var persisted = persist(Object.assign({}, current || {}, {
        id: current && current.id || deterministicId(ownerId),
        userId: ownerId,
        professionalProfileId: profileId,
        status: STATUSES.NOT_STARTED,
        currentStep: draft.currentStep || current && current.currentStep || 1,
        payload: rawPayload,
        rejectionReason: '',
        reviewerId: '',
        createdAt: current && current.createdAt || now,
        updatedAt: now,
        savedAt: now,
        submittedAt: '',
        reviewStartedAt: '',
        decidedAt: ''
      }));
      return mergeDraft(persisted);
    });
  }

  function submit(userId, professionalProfileId, submission) {
    var ownerId = normalizeText(userId);
    var profileId = normalizeText(professionalProfileId);
    if (!ownerId || !profileId) return Promise.reject(new Error('Perfil profissional não identificado para enviar a verificação.'));
    submission = submission || {};

    return getByUserId(ownerId).then(function (current) {
      if (current && [STATUSES.SUBMITTED, STATUSES.UNDER_REVIEW, STATUSES.VERIFIED].indexOf(current.status) >= 0) return current;
      var now = new Date().toISOString();
      removeDraft(ownerId);
      return persist(Object.assign({}, current || {}, {
        id: current && current.id || deterministicId(ownerId),
        userId: ownerId,
        professionalProfileId: profileId,
        status: STATUSES.SUBMITTED,
        currentStep: 3,
        payload: submission.payload || submission.fields || current && current.payload || {},
        rejectionReason: '',
        reviewerId: '',
        createdAt: current && current.createdAt || now,
        updatedAt: now,
        savedAt: now,
        submittedAt: current && current.submittedAt || now,
        reviewStartedAt: '',
        decidedAt: ''
      }));
    });
  }

  function transition(verificationId, nextStatus, meta) {
    var target = normalizeStatus(nextStatus);
    meta = meta || {};
    return getById(verificationId).then(function (current) {
      if (!current) throw new Error('Verificação de identidade não encontrada.');
      if (current.status === target) return current;
      var allowed = TRANSITIONS[current.status] || [];
      if (allowed.indexOf(target) === -1) throw new Error('Transição inválida de ' + current.status + ' para ' + target + '.');
      var now = new Date().toISOString();
      var patch = {
        status: target,
        updatedAt: now,
        reviewerId: normalizeText(meta.reviewerId || current.reviewerId, 120)
      };
      if (target === STATUSES.UNDER_REVIEW) patch.reviewStartedAt = current.reviewStartedAt || now;
      if (target === STATUSES.VERIFIED || target === STATUSES.REJECTED) patch.decidedAt = current.decidedAt || now;
      if (target === STATUSES.REJECTED) patch.rejectionReason = normalizeText(meta.reason, 500);
      if (target === STATUSES.NOT_STARTED) {
        patch.rejectionReason = '';
        patch.reviewerId = '';
        patch.reviewStartedAt = '';
        patch.decidedAt = '';
        patch.submittedAt = '';
        setDraft(current.userId, current.payload || {});
      }
      return mergeDraft(persist(Object.assign({}, current, patch)));
    });
  }

  repositories.professionalIdentityVerifications = Object.freeze({
    storageKey: STORAGE_KEY,
    draftStorageKey: DRAFT_STORAGE_KEY,
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
