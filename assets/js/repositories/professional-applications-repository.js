/* Doke Professional Applications Repository
   Responsibility: canonical local/mock persistence for professional applications. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  var STORAGE_KEY = 'doke.professionalApplications.v1';

  var STATUSES = Object.freeze({
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    UNDER_REVIEW: 'under_review',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  });

  var TRANSITIONS = Object.freeze({
    draft: Object.freeze(['submitted']),
    submitted: Object.freeze(['under_review']),
    under_review: Object.freeze(['approved', 'rejected']),
    approved: Object.freeze([]),
    rejected: Object.freeze(['draft'])
  });

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return value; }
  }

  function normalizeText(value, maxLength) {
    var text = String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
    return maxLength ? text.slice(0, maxLength) : text;
  }

  function safeParse(value, fallback) {
    try { return value ? JSON.parse(value) : fallback; }
    catch (_) { return fallback; }
  }

  function readAll() {
    var parsed = safeParse(root.localStorage.getItem(STORAGE_KEY), []);
    if (!Array.isArray(parsed)) return [];
    var normalized = parsed.map(normalizeApplication).filter(Boolean);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) writeAll(normalized);
    return normalized;
  }

  function writeAll(items) {
    root.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  }

  function generateId() {
    if (root.crypto && typeof root.crypto.randomUUID === 'function') {
      return 'professional_application_' + root.crypto.randomUUID();
    }
    return 'professional_application_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
  }

  function normalizeStatus(value) {
    var status = String(value || '').trim().toLowerCase();
    return Object.values(STATUSES).indexOf(status) >= 0 ? status : STATUSES.DRAFT;
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
      ageConfirmed: normalizeBoolean(payload.ageConfirmed),
      truthConfirmed: normalizeBoolean(payload.truthConfirmed),
      conductAccepted: normalizeBoolean(payload.conductAccepted),
      termsAccepted: normalizeBoolean(payload.termsAccepted)
    };
  }

  function normalizeApplication(application) {
    if (!application || typeof application !== 'object') return null;
    var now = new Date().toISOString();
    var status = normalizeStatus(application.status);
    return {
      id: normalizeText(application.id) || generateId(),
      userId: normalizeText(application.userId),
      status: status,
      currentStep: Math.max(1, Math.min(2, Number(application.currentStep || 1) || 1)),
      payload: normalizePayload(application.payload || application.fields),
      revision: Math.max(1, Number(application.revision || 1) || 1),
      createdAt: application.createdAt || now,
      updatedAt: application.updatedAt || now,
      savedAt: application.savedAt || application.updatedAt || now,
      submittedAt: application.submittedAt || '',
      underReviewAt: application.underReviewAt || '',
      decidedAt: application.decidedAt || '',
      decisionBy: normalizeText(application.decisionBy),
      rejectionReason: normalizeText(application.rejectionReason, 500),
      reopenedAt: application.reopenedAt || ''
    };
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

  function getById(applicationId) {
    var id = normalizeText(applicationId);
    if (!id) return Promise.resolve(null);
    return Promise.resolve(clone(readAll().find(function (item) { return item.id === id; }) || null));
  }

  function getByUserId(userId) {
    var id = normalizeText(userId);
    if (!id) return Promise.resolve(null);
    var items = sortNewest(readAll().filter(function (item) { return item.userId === id; }));
    return Promise.resolve(clone(items[0] || null));
  }

  function persist(application) {
    var normalized = normalizeApplication(application);
    if (!normalized || !normalized.userId) throw new Error('A candidatura precisa estar vinculada a um usuário.');
    var items = readAll();
    var index = items.findIndex(function (item) { return item.id === normalized.id; });
    if (index >= 0) items[index] = normalized;
    else items.push(normalized);
    writeAll(items);
    return clone(normalized);
  }

  function saveDraft(userId, draft) {
    var id = normalizeText(userId);
    if (!id) return Promise.reject(new Error('Usuário não identificado para salvar a candidatura.'));
    draft = draft || {};

    return getByUserId(id).then(function (current) {
      if (current && current.status !== STATUSES.DRAFT) {
        throw new Error('A candidatura atual não pode ser editada neste estado.');
      }
      var now = new Date().toISOString();
      return persist(Object.assign({}, current || {}, {
        id: current && current.id || generateId(),
        userId: id,
        status: STATUSES.DRAFT,
        currentStep: draft.currentStep || current && current.currentStep || 1,
        payload: draft.payload || draft.fields || current && current.payload || {},
        revision: current && current.revision || 1,
        createdAt: current && current.createdAt || now,
        updatedAt: now,
        savedAt: now
      }));
    });
  }

  function submit(userId, submission) {
    var id = normalizeText(userId);
    if (!id) return Promise.reject(new Error('Usuário não identificado para enviar a candidatura.'));
    submission = submission || {};

    return getByUserId(id).then(function (current) {
      if (current && [STATUSES.SUBMITTED, STATUSES.UNDER_REVIEW].indexOf(current.status) >= 0) return current;
      if (current && current.status === STATUSES.APPROVED) return current;
      if (current && current.status === STATUSES.REJECTED) {
        throw new Error('Reabra a candidatura rejeitada antes de reenviar.');
      }
      var now = new Date().toISOString();
      return persist(Object.assign({}, current || {}, {
        id: current && current.id || generateId(),
        userId: id,
        status: STATUSES.SUBMITTED,
        currentStep: 2,
        payload: submission.payload || submission.fields || current && current.payload || {},
        revision: current && current.revision || 1,
        createdAt: current && current.createdAt || now,
        updatedAt: now,
        savedAt: now,
        submittedAt: current && current.submittedAt || now,
        underReviewAt: '',
        decidedAt: '',
        decisionBy: '',
        rejectionReason: ''
      }));
    });
  }

  function transition(applicationId, nextStatus, metadata) {
    metadata = metadata || {};
    var target = normalizeStatus(nextStatus);
    return getById(applicationId).then(function (current) {
      if (!current) throw new Error('Candidatura não encontrada.');
      if (current.status === target) return current;
      var allowed = TRANSITIONS[current.status] || [];
      if (allowed.indexOf(target) === -1) {
        throw new Error('Transição inválida de ' + current.status + ' para ' + target + '.');
      }
      var now = new Date().toISOString();
      var patch = {
        status: target,
        updatedAt: now,
        decisionBy: metadata.decisionBy || current.decisionBy || ''
      };
      if (target === STATUSES.UNDER_REVIEW) patch.underReviewAt = now;
      if (target === STATUSES.APPROVED || target === STATUSES.REJECTED) patch.decidedAt = now;
      if (target === STATUSES.REJECTED) patch.rejectionReason = normalizeText(metadata.reason, 500);
      if (target === STATUSES.APPROVED) patch.rejectionReason = '';
      if (target === STATUSES.DRAFT) {
        patch.revision = Number(current.revision || 1) + 1;
        patch.currentStep = 1;
        patch.reopenedAt = now;
        patch.submittedAt = '';
        patch.underReviewAt = '';
        patch.decidedAt = '';
        patch.decisionBy = '';
        patch.rejectionReason = '';
      }
      return persist(Object.assign({}, current, patch));
    });
  }

  repositories.professionalApplications = Object.freeze({
    storageKey: STORAGE_KEY,
    statuses: STATUSES,
    transitions: TRANSITIONS,
    normalize: normalizeApplication,
    list: list,
    getById: getById,
    getByUserId: getByUserId,
    saveDraft: saveDraft,
    submit: submit,
    transition: transition
  });
})();
