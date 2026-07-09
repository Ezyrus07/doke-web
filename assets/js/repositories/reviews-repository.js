/* Doke Reviews Repository
   Responsibility: local/mock persistence boundary for verified professional reviews.
   Backend migration rule: pages must call this repository instead of localStorage directly. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});

  var STORAGE_KEY = 'doke.reviews.local.v1';
  var LEGACY_STORAGE_KEY = 'doke.reviews';

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; }
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeKey(value) {
    return normalizeText(value).toLowerCase();
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function createReviewId() {
    return 'review_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function safeRead(key) {
    try {
      var raw = root.localStorage.getItem(key);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function safeWrite(key, items) {
    try {
      root.localStorage.setItem(key, JSON.stringify(Array.isArray(items) ? items : []));
    } catch (error) {
      // localStorage can be unavailable in restricted contexts.
    }
  }

  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function toRating(value) {
    var rating = Number(String(value || '').replace(',', '.'));
    if (!Number.isFinite(rating) || rating <= 0) return 5;
    return Math.max(1, Math.min(5, Math.round(rating * 10) / 10));
  }

  function getInitials(value) {
    return normalizeText(value)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toUpperCase(); })
      .join('') || 'CL';
  }

  function getEventKey(raw) {
    var explicit = normalizeText(raw.eventKey || raw.dedupeKey || '');
    if (explicit) return explicit;

    return [
      'profile_review',
      normalizeText(raw.orderId || ''),
      normalizeText(raw.messageId || ''),
      normalizeText(raw.professionalId || raw.providerId || raw.displayProfessionalId || raw.sourceProfessionalId || '')
    ].filter(Boolean).join(':');
  }

  function normalizeReview(raw) {
    raw = raw || {};
    var createdAt = raw.createdAt || raw.reviewedAt || nowIso();
    var rating = toRating(raw.rating || raw.score || 5);
    var professionalId = normalizeText(raw.professionalId || raw.providerId || '');
    var displayProfessionalId = normalizeText(raw.displayProfessionalId || raw.sourceProfessionalId || raw.providerProfileId || '');
    var professionalName = normalizeText(raw.professionalName || raw.providerName || 'Profissional Doke');
    var clientName = normalizeText(raw.clientName || raw.authorName || raw.author || 'Cliente Doke');
    var profileIds = toArray(raw.profileIds)
      .concat([professionalId, displayProfessionalId, normalizeText(raw.sourceProfessionalId || '')])
      .map(normalizeText)
      .filter(Boolean);
    var uniqueProfileIds = Array.from(new Set(profileIds));

    return Object.assign({}, raw, {
      id: normalizeText(raw.id) || createReviewId(),
      eventKey: getEventKey(raw),
      orderId: normalizeText(raw.orderId || ''),
      conversationId: normalizeText(raw.conversationId || ''),
      messageId: normalizeText(raw.messageId || ''),
      serviceId: normalizeText(raw.serviceId || ''),
      serviceTitle: normalizeText(raw.serviceTitle || raw.service || raw.orderTitle || 'Serviço Doke'),
      professionalId: professionalId,
      providerId: professionalId,
      displayProfessionalId: displayProfessionalId,
      sourceProfessionalId: normalizeText(raw.sourceProfessionalId || displayProfessionalId || ''),
      profileIds: uniqueProfileIds,
      professionalName: professionalName,
      providerName: professionalName,
      clientId: normalizeText(raw.clientId || raw.authorId || ''),
      clientName: clientName,
      authorName: clientName,
      avatarText: normalizeText(raw.avatarText || raw.clientInitials || getInitials(clientName)),
      rating: rating,
      tags: toArray(raw.tags).map(normalizeText).filter(Boolean),
      criteria: toArray(raw.criteria),
      comment: normalizeText(raw.comment || raw.text || raw.content || ''),
      text: normalizeText(raw.text || raw.comment || raw.content || ''),
      verified: raw.verified !== false,
      source: normalizeText(raw.source || 'order-review'),
      reviewedAt: raw.reviewedAt || createdAt,
      createdAt: createdAt,
      updatedAt: raw.updatedAt || createdAt
    });
  }

  function mergeById() {
    var map = Object.create(null);
    var eventMap = Object.create(null);
    Array.prototype.slice.call(arguments).forEach(function (items) {
      (items || []).forEach(function (item) {
        var normalized = normalizeReview(item);
        if (!normalized.id) return;
        var existingId = normalized.eventKey && eventMap[normalized.eventKey];
        var key = existingId || normalized.id;
        map[key] = Object.assign({}, map[key] || {}, normalized, { id: key });
        if (normalized.eventKey) eventMap[normalized.eventKey] = key;
      });
    });

    return Object.keys(map)
      .map(function (id) { return map[id]; })
      .sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
  }

  function readLocal() {
    return mergeById(safeRead(STORAGE_KEY), safeRead(LEGACY_STORAGE_KEY));
  }

  function writeLocal(items) {
    var normalized = mergeById(Array.isArray(items) ? items : []);
    safeWrite(STORAGE_KEY, normalized);
    safeWrite(LEGACY_STORAGE_KEY, normalized);
    return clone(normalized);
  }

  function matchesFilter(review, filters) {
    filters = filters || {};
    var professionalId = normalizeText(filters.professionalId || filters.providerId || '');
    var professionalName = normalizeKey(filters.professionalName || filters.providerName || '');
    var serviceId = normalizeText(filters.serviceId || '');

    if (professionalId) {
      var ids = toArray(review.profileIds).concat([
        review.professionalId,
        review.providerId,
        review.displayProfessionalId,
        review.sourceProfessionalId
      ]).map(normalizeText);
      if (ids.indexOf(professionalId) === -1) return false;
    }

    if (professionalName && normalizeKey(review.professionalName || review.providerName) !== professionalName) return false;
    if (serviceId && review.serviceId !== serviceId) return false;
    return true;
  }

  function listLocal(filters) {
    return clone(readLocal().filter(function (review) { return matchesFilter(review, filters || {}); }));
  }

  function save(review) {
    var normalized = normalizeReview(review);
    var local = readLocal().filter(function (item) {
      if (String(item.id) === String(normalized.id)) return false;
      if (normalized.eventKey && item.eventKey && String(item.eventKey) === String(normalized.eventKey)) return false;
      return true;
    });
    local.unshift(normalized);
    writeLocal(local);
    document.dispatchEvent(new CustomEvent('doke:profile-review-created', { detail: { review: clone(normalized) } }));
    return Promise.resolve(clone(normalized));
  }

  function create(payload) {
    return save(Object.assign({}, payload || {}, {
      id: payload && payload.id || createReviewId(),
      createdAt: payload && payload.createdAt || nowIso(),
      updatedAt: nowIso()
    }));
  }

  repositories.reviews = Object.freeze({
    storageKey: STORAGE_KEY,
    legacyStorageKey: LEGACY_STORAGE_KEY,
    normalize: normalizeReview,
    readLocal: readLocal,
    writeLocal: writeLocal,
    listLocal: listLocal,
    save: save,
    create: create,
    clearLocal: function () { writeLocal([]); }
  });
})();
