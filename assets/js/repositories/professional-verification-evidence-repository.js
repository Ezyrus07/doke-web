/* Doke Professional Verification Evidence Repository
   Responsibility: preserve fixture-only binary evidence in memory while Supabase Storage owns real KYC evidence. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  var fixtureEvidence = new Map();

  function cloneValue(value) {
    if (value == null) return value;
    if (typeof structuredClone === 'function') {
      try { return structuredClone(value); } catch (_) {}
    }
    return value;
  }

  function normalizeText(value, maxLength) {
    var text = String(value == null ? '' : value).trim();
    return maxLength ? text.slice(0, maxLength) : text;
  }

  function sessionProvider() {
    try {
      var session = Doke.session && typeof Doke.session.getSession === 'function'
        ? Doke.session.getSession()
        : null;
      return normalizeText(session && session.provider, 40).toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizeText(value));
  }

  function remoteAuthorityUnavailable() {
    var error = new Error('A evidência documental real pertence ao Supabase Storage e não possui fallback local.');
    error.code = 'DOKE_PROFESSIONAL_VERIFICATION_EVIDENCE_AUTHORITY_UNAVAILABLE';
    return error;
  }

  function assertFixtureAuthority(userId) {
    if (sessionProvider() === 'supabase' || isUuid(userId)) throw remoteAuthorityUnavailable();
  }

  function normalizeFile(value) {
    if (!value || typeof value !== 'object') return null;
    var blob = typeof Blob !== 'undefined' && value.blob instanceof Blob
      ? value.blob
      : typeof Blob !== 'undefined' && value.file instanceof Blob
        ? value.file
        : null;
    var fileName = normalizeText(value.fileName || value.name, 180);
    if (!fileName) return null;
    return {
      fileName: fileName,
      size: Math.max(0, Number(value.size || blob && blob.size || 0) || 0),
      type: normalizeText(value.type || blob && blob.type, 100),
      blob: blob
    };
  }

  function normalizePayload(payload) {
    payload = payload && typeof payload === 'object' ? payload : {};
    return {
      verificationType: String(payload.verificationType || 'individual') === 'business' ? 'business' : 'individual',
      legalName: normalizeText(payload.legalName),
      taxId: String(payload.taxId || '').replace(/\D/g, ''),
      birthDate: normalizeText(payload.birthDate),
      representativeName: normalizeText(payload.representativeName),
      postalCode: String(payload.postalCode || '').replace(/\D/g, ''),
      street: normalizeText(payload.street),
      number: normalizeText(payload.number),
      complement: normalizeText(payload.complement),
      district: normalizeText(payload.district),
      city: normalizeText(payload.city),
      state: normalizeText(payload.state).toUpperCase(),
      documentType: normalizeText(payload.documentType),
      documentFront: normalizeFile(payload.documentFront),
      documentBack: normalizeFile(payload.documentBack),
      selfieDocument: normalizeFile(payload.selfieDocument),
      proofOfAddress: normalizeFile(payload.proofOfAddress),
      businessDocument: normalizeFile(payload.businessDocument),
      truthConfirmed: Boolean(payload.truthConfirmed),
      consentAccepted: Boolean(payload.consentAccepted)
    };
  }

  function save(verificationId, userId, payload) {
    var id = normalizeText(verificationId);
    var ownerId = normalizeText(userId);
    if (!id || !ownerId) return Promise.reject(new Error('Verificação e usuário são obrigatórios para preservar evidências fixture.'));
    try { assertFixtureAuthority(ownerId); }
    catch (error) { return Promise.reject(error); }
    var record = {
      verificationId: id,
      userId: ownerId,
      payload: normalizePayload(payload),
      updatedAt: new Date().toISOString()
    };
    fixtureEvidence.set(id, record);
    return Promise.resolve(cloneValue(record));
  }

  function getByVerificationId(verificationId) {
    var id = normalizeText(verificationId);
    if (!id) return Promise.resolve(null);
    try { assertFixtureAuthority(''); }
    catch (error) { return Promise.reject(error); }
    return Promise.resolve(cloneValue(fixtureEvidence.get(id) || null));
  }

  function remove(verificationId) {
    var id = normalizeText(verificationId);
    if (!id) return Promise.resolve();
    try { assertFixtureAuthority(''); }
    catch (error) { return Promise.reject(error); }
    fixtureEvidence.delete(id);
    return Promise.resolve();
  }

  repositories.professionalVerificationEvidence = Object.freeze({
    authority: 'supabase-storage-or-fixture-memory',
    save: save,
    getByVerificationId: getByVerificationId,
    remove: remove
  });
})();
