/* Doke Service Media Upload Service
   Responsibility: immutable signed upload reservation and atomic media-aware review submission. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var services = Doke.services || (Doke.services = {});
  var BUCKET = 'service-media';

  function normalizeText(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeSearch(value) {
    return normalizeText(value).toLowerCase();
  }

  function clone(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function authorityUnavailable(context, cause) {
    var suffix = cause && cause.message ? ': ' + normalizeText(cause.message) : '';
    var error = new Error('Autoridade server-side de mídia indisponível em ' + context + suffix);
    error.code = 'DOKE_SERVICE_MEDIA_AUTHORITY_UNAVAILABLE';
    if (cause) error.cause = cause;
    return error;
  }

  function getClient() {
    try {
      return root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
        ? root.DokeSupabase.getClient()
        : null;
    } catch (error) {
      return null;
    }
  }

  function invoke(action, params) {
    if (!root.DokeSupabase || typeof root.DokeSupabase.invokeSelfService !== 'function') {
      return Promise.reject(authorityUnavailable(action));
    }
    return Promise.resolve(root.DokeSupabase.invokeSelfService(action, params || {}));
  }

  function dataUrlToBlob(value) {
    var match = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(String(value || ''));
    if (!match) return null;
    var mime = match[1] || 'application/octet-stream';
    var encoded = match[3] || '';
    var binary = match[2] ? root.atob(encoded) : decodeURIComponent(encoded);
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mime });
  }

  function extensionFromMime(mime) {
    var normalized = normalizeSearch(mime).split('/').pop().replace(/[^a-z0-9]/g, '');
    if (normalized === 'jpeg') return 'jpg';
    return normalized || 'bin';
  }

  function prepareDescriptors(service) {
    var images = Array.isArray(service && service.images) ? service.images.filter(Boolean) : [];
    if (images.length < 1 || images.length > 3) {
      var countError = new Error('Adicione de 1 a 3 imagens ao anúncio.');
      countError.code = 'DOKE_SERVICE_MEDIA_FILES_INVALID';
      throw countError;
    }

    var uploads = {};
    var files = images.map(function (image, index) {
      var text = String(image || '');
      if (!/^data:/i.test(text)) {
        return {
          kind: 'retain',
          url: text,
          sortOrder: index
        };
      }

      var blob = dataUrlToBlob(text);
      if (!blob) {
        var invalidError = new Error('Imagem do anúncio inválida.');
        invalidError.code = 'DOKE_SERVICE_MEDIA_FILE_INVALID';
        throw invalidError;
      }
      uploads[index] = blob;
      return {
        kind: 'upload',
        fileName: 'service-image-' + String(index + 1).padStart(2, '0') + '.' + extensionFromMime(blob.type),
        size: blob.size,
        type: blob.type,
        sortOrder: index
      };
    });

    return { files: files, uploads: uploads };
  }

  function uploadPreparedItems(client, intent, descriptors) {
    var uploads = intent && Array.isArray(intent.uploads) ? intent.uploads : [];
    var expectedUploads = Object.keys(descriptors.uploads).length;
    if (!intent || !intent.intentId || uploads.length !== expectedUploads) {
      return Promise.reject(authorityUnavailable('preparação do upload'));
    }

    return Promise.all(uploads.map(function (upload) {
      var sortOrder = Number(upload.sortOrder);
      var blob = descriptors.uploads[sortOrder];
      if (!(blob instanceof Blob) || !upload.path || !upload.token) {
        var manifestError = new Error('Manifesto de upload de mídia inválido.');
        manifestError.code = 'DOKE_SERVICE_MEDIA_UPLOAD_MANIFEST_INVALID';
        throw manifestError;
      }

      return client.storage.from(upload.bucket || BUCKET)
        .uploadToSignedUrl(upload.path, upload.token, blob, {
          contentType: upload.type || blob.type || 'application/octet-stream',
          cacheControl: '3600'
        }).then(function (result) {
          if (result && result.error) throw result.error;
          return true;
        });
    })).then(function () {
      return { intentId: intent.intentId };
    });
  }

  function prepareAndUpload(service) {
    var client = getClient();
    if (!client || !client.storage || typeof client.storage.from !== 'function') {
      return Promise.reject(authorityUnavailable('acesso ao Storage'));
    }

    var descriptors;
    try {
      descriptors = prepareDescriptors(service || {});
    } catch (error) {
      return Promise.reject(error);
    }

    return invoke('prepare_service_media_uploads', {
      p_external_id: normalizeText(service && (service.externalId || service.id)),
      p_files: descriptors.files
    }).then(function (intent) {
      return uploadPreparedItems(client, intent, descriptors);
    }).catch(function (error) {
      if (error && error.code && error.code !== 'DOKE_SERVICE_MEDIA_AUTHORITY_UNAVAILABLE') throw error;
      throw authorityUnavailable('reserva imutável', error);
    });
  }

  function buildSubmissionSnapshot(service) {
    var snapshot = clone(service || {}) || {};
    snapshot.images = [];
    snapshot.image = '';
    delete snapshot.remoteId;
    delete snapshot.remote_id;
    delete snapshot.syncError;
    delete snapshot.syncStatus;
    return snapshot;
  }

  function fallbackSavedService(service, response) {
    response = response || {};
    var mediaUrls = Array.isArray(response.mediaUrls) ? response.mediaUrls.slice() : [];
    return Object.assign({}, clone(service || {}), {
      id: response.externalId || service.id,
      externalId: response.externalId || service.externalId || service.id,
      remoteId: response.serviceId || service.remoteId || '',
      status: response.publicStatus || service.status || 'draft',
      moderationStatus: response.moderationStatus || 'pending_review',
      pendingVersionId: response.versionId || '',
      images: mediaUrls,
      image: mediaUrls[0] || '',
      reviewSubmittedAt: response.submittedAt || new Date().toISOString(),
      pendingChangeClass: response.changeClass || '',
      pendingVisibilityAction: response.visibilityAction || '',
      pendingRiskFlags: Array.isArray(response.riskFlags) ? response.riskFlags : [],
      pendingClassificationReasons: Array.isArray(response.classificationReasons) ? response.classificationReasons : [],
      syncStatus: 'synced',
      syncError: '',
      syncedAt: new Date().toISOString()
    });
  }

  function submitForReview(service, options, repository) {
    options = options || {};
    repository = repository || Doke.repositories && Doke.repositories.services;
    if (!repository) return Promise.reject(authorityUnavailable('repositório do catálogo'));

    return prepareAndUpload(service).then(function (prepared) {
      return invoke('submit_service_for_review', {
        p_external_id: normalizeText(service && (service.externalId || service.id)),
        p_snapshot: buildSubmissionSnapshot(service),
        p_change_class: normalizeSearch(options.changeClass || 'major') || 'major',
        p_upload_intent_id: prepared.intentId
      });
    }).then(function (response) {
      var externalId = normalizeText(response && (response.externalId || response.serviceId) || service.id);
      if (typeof repository.getOwnedReviewDraft !== 'function') {
        return fallbackSavedService(service, response);
      }
      return Promise.resolve(repository.getOwnedReviewDraft(externalId)).then(function (draft) {
        return draft || fallbackSavedService(service, response);
      });
    }).catch(function (error) {
      if (error && error.code) throw error;
      throw authorityUnavailable('submissão versionada', error);
    });
  }

  services.serviceMediaUploads = Object.freeze({
    authority: 'signed-upload-intent',
    prepareAndUpload: prepareAndUpload,
    submitForReview: submitForReview
  });
})();
