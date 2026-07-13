/* Doke Professional Verification Evidence Repository
   Responsibility: persist local/mock verification details and binary evidence outside localStorage. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  var DB_NAME = 'doke-professional-verification-evidence-v1';
  var STORE_NAME = 'evidence';
  var DB_VERSION = 1;
  var memory = new Map();

  function cloneValue(value) {
    if (value == null) return value;
    if (typeof structuredClone === 'function') {
      try { return structuredClone(value); } catch (_) {}
    }
    return value;
  }

  function openDatabase() {
    if (!window.indexedDB) return Promise.resolve(null);
    return new Promise(function (resolve, reject) {
      var request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'verificationId' });
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('Não foi possível abrir o armazenamento documental.')); };
    });
  }

  function withStore(mode, operation) {
    return openDatabase().then(function (db) {
      if (!db) return operation(null);
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction(STORE_NAME, mode);
        var store = transaction.objectStore(STORE_NAME);
        var result;
        try { result = operation(store); }
        catch (error) { reject(error); return; }
        transaction.oncomplete = function () { resolve(result); db.close(); };
        transaction.onerror = function () { reject(transaction.error || new Error('Falha ao acessar documentos da verificação.')); db.close(); };
        transaction.onabort = function () { reject(transaction.error || new Error('Operação documental cancelada.')); db.close(); };
      });
    });
  }

  function normalizeFile(value) {
    if (!value || typeof value !== 'object') return null;
    var blob = typeof Blob !== 'undefined' && value.blob instanceof Blob ? value.blob : typeof Blob !== 'undefined' && value.file instanceof Blob ? value.file : null;
    var fileName = String(value.fileName || value.name || '').trim().slice(0, 180);
    if (!fileName) return null;
    return {
      fileName: fileName,
      size: Math.max(0, Number(value.size || blob && blob.size || 0) || 0),
      type: String(value.type || blob && blob.type || '').trim().slice(0, 100),
      blob: blob
    };
  }

  function normalizePayload(payload) {
    payload = payload && typeof payload === 'object' ? payload : {};
    return {
      verificationType: String(payload.verificationType || 'individual') === 'business' ? 'business' : 'individual',
      legalName: String(payload.legalName || '').trim(),
      taxId: String(payload.taxId || '').replace(/\D/g, ''),
      birthDate: String(payload.birthDate || '').trim(),
      representativeName: String(payload.representativeName || '').trim(),
      postalCode: String(payload.postalCode || '').replace(/\D/g, ''),
      street: String(payload.street || '').trim(),
      number: String(payload.number || '').trim(),
      complement: String(payload.complement || '').trim(),
      district: String(payload.district || '').trim(),
      city: String(payload.city || '').trim(),
      state: String(payload.state || '').trim().toUpperCase(),
      documentType: String(payload.documentType || '').trim(),
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
    var id = String(verificationId || '').trim();
    if (!id) return Promise.reject(new Error('Verificação não identificada para armazenar documentos.'));
    var record = {
      verificationId: id,
      userId: String(userId || '').trim(),
      payload: normalizePayload(payload),
      updatedAt: new Date().toISOString()
    };
    memory.set(id, record);
    return withStore('readwrite', function (store) {
      if (store) store.put(record);
      return cloneValue(record);
    }).catch(function () { return cloneValue(record); });
  }

  function getByVerificationId(verificationId) {
    var id = String(verificationId || '').trim();
    if (!id) return Promise.resolve(null);
    return openDatabase().then(function (db) {
      if (!db) return cloneValue(memory.get(id) || null);
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction(STORE_NAME, 'readonly');
        var request = transaction.objectStore(STORE_NAME).get(id);
        request.onsuccess = function () { resolve(cloneValue(request.result || memory.get(id) || null)); db.close(); };
        request.onerror = function () { reject(request.error || new Error('Não foi possível carregar os documentos.')); db.close(); };
      });
    }).catch(function () { return cloneValue(memory.get(id) || null); });
  }

  function remove(verificationId) {
    var id = String(verificationId || '').trim();
    memory.delete(id);
    if (!id) return Promise.resolve();
    return withStore('readwrite', function (store) {
      if (store) store.delete(id);
    }).catch(function () {});
  }

  repositories.professionalVerificationEvidence = Object.freeze({
    databaseName: DB_NAME,
    save: save,
    getByVerificationId: getByVerificationId,
    remove: remove
  });
})();
