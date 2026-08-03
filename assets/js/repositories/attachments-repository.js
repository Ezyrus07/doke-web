/* Doke Attachments Repository
   Responsibility: private transaction attachment boundary.
   UUID sessions use server-owned upload intents and removal commands.
   Non-UUID fixtures remain memory-only and never become remote authority. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});

  var BUCKET = 'transaction-attachments';
  var PROVIDER_ATTRIBUTE = 'data-doke-attachments-provider';
  var MAX_FILE_SIZE = 10 * 1024 * 1024;
  var MAX_FILES = 8;
  var FIXTURE_INLINE_LIMIT = 160000;
  var DEFAULT_SIGNED_URL_TTL = 300;
  var ALLOWED_TYPES = Object.freeze([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'video/mp4',
    'video/webm'
  ]);

  var supabaseClient = null;
  var supabaseClientAttempted = false;
  var lastRemoteError = null;

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return value; }
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizeText(value));
  }

  function getSessionUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') {
      var current = Doke.session.getCurrentUser();
      if (current) return current;
    }
    try {
      var raw = root.localStorage && root.localStorage.getItem('doke.auth.session.v1');
      var session = raw ? JSON.parse(raw) : null;
      return session && session.user || null;
    } catch (error) {
      return null;
    }
  }

  function getAuthorityMode() {
    var user = getSessionUser();
    return user && isUuid(user.id) ? 'remote-server-owned' : 'fixture-memory';
  }

  function setProviderState(provider) {
    try { document.documentElement.setAttribute(PROVIDER_ATTRIBUTE, provider); }
    catch (error) {}
  }

  function createAuthorityError(code, message) {
    var error = new Error(message || 'A autoridade de anexos está indisponível.');
    error.code = code || 'DOKE_ATTACHMENTS_SERVER_AUTHORITY_UNAVAILABLE';
    return error;
  }

  function recordRemoteError(error, context) {
    lastRemoteError = error || createAuthorityError();
    setProviderState(getAuthorityMode() === 'remote-server-owned' ? 'server-error' : 'fixture-memory');
    if (root.console && typeof root.console.warn === 'function') {
      root.console.warn('[Doke attachments repository] Falha em ' + context + '. Operação encerrada em fail-closed.', error);
    }
  }

  function getSupabaseClient() {
    if (supabaseClientAttempted) return supabaseClient;
    supabaseClientAttempted = true;
    var config = root.DOKE_SUPABASE_CONFIG || {};
    var sdk = root.supabase;
    if (!config.enabled || config.attachmentsEnabled === false || !config.url || !config.anonKey || !sdk || typeof sdk.createClient !== 'function') {
      setProviderState(getAuthorityMode() === 'remote-server-owned' ? 'server-unavailable' : 'fixture-memory');
      return null;
    }
    try {
      supabaseClient = root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
        ? root.DokeSupabase.getClient()
        : sdk.createClient(config.url, config.anonKey);
      setProviderState('supabase-private');
    } catch (error) {
      recordRemoteError(error, 'bootstrap');
      supabaseClient = null;
    }
    return supabaseClient;
  }

  function requireRemoteBoundary() {
    var config = root.DOKE_SUPABASE_CONFIG || {};
    if (config.attachmentLifecycleEnabled !== true) {
      throw createAuthorityError(
        'DOKE_ATTACHMENTS_LIFECYCLE_NOT_ACTIVATED',
        'O lifecycle server-owned de anexos ainda não foi ativado.'
      );
    }
    var client = getSupabaseClient();
    if (!client) throw createAuthorityError();
    if (!root.DokeSupabase || typeof root.DokeSupabase.invokeSelfService !== 'function') {
      throw createAuthorityError();
    }
    return client;
  }

  function normalizeSource(value) {
    var source = normalizeText(value).toLowerCase();
    return source === 'message' || source === 'conversation' ? 'conversation' : 'order';
  }

  function createAttachmentId() {
    return 'att_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  function isImageType(type) {
    return /^image\/(jpeg|png|webp|gif)$/i.test(normalizeText(type));
  }

  function isPreviewableType(type) {
    return isImageType(type) || normalizeText(type) === 'application/pdf';
  }

  function normalizeAttachment(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var type = normalizeText(raw.type || raw.mimeType || raw.contentType || '');
    var pathValue = normalizeText(raw.path || raw.storagePath || raw.objectPath || '');
    var url = normalizeText(raw.url || raw.signedUrl || raw.dataUrl || raw.preview || '');
    return {
      id: normalizeText(raw.id || raw.attachmentId || raw.lifecycleId) || createAttachmentId(),
      lifecycleId: normalizeText(raw.lifecycleId || raw.attachmentId || raw.id || ''),
      name: normalizeText(raw.name || raw.filename || raw.originalName || 'anexo'),
      type: type,
      size: Number(raw.size || raw.sizeBytes) || 0,
      bucket: normalizeText(raw.bucket) || (pathValue ? BUCKET : ''),
      path: pathValue,
      source: normalizeSource(raw.source || raw.kind || ''),
      resourceId: normalizeText(raw.resourceId || raw.orderId || raw.conversationId || ''),
      uploadedBy: normalizeText(raw.uploadedBy || raw.uploaderId || ''),
      createdAt: raw.createdAt || nowIso(),
      url: url,
      dataUrl: /^data:/i.test(url) ? url : normalizeText(raw.dataUrl || ''),
      downloadUrl: normalizeText(raw.downloadUrl || ''),
      previewable: raw.previewable === true || (Boolean(url) && isPreviewableType(type)),
      syncStatus: normalizeText(raw.syncStatus) || (pathValue ? 'synced' : 'fixture-memory'),
      retentionState: normalizeText(raw.retentionState || raw.lifecycleStatus || ''),
      tooLarge: raw.tooLarge === true,
      error: normalizeText(raw.error || '')
    };
  }

  function normalizeAttachments(items) {
    return (Array.isArray(items) ? items : [])
      .map(normalizeAttachment)
      .filter(Boolean)
      .slice(0, MAX_FILES);
  }

  function toPersistedMetadata(items) {
    return normalizeAttachments(items).map(function (item) {
      var persisted = Object.assign({}, item);
      persisted.url = '';
      persisted.downloadUrl = '';
      persisted.previewable = isPreviewableType(persisted.type);
      persisted.error = '';
      persisted.tooLarge = false;
      if (persisted.path) {
        persisted.dataUrl = '';
        persisted.syncStatus = 'synced';
      } else if (persisted.syncStatus === 'fixture-memory') {
        persisted.url = /^data:/i.test(item.dataUrl || item.url || '') ? (item.dataUrl || item.url) : '';
        persisted.dataUrl = persisted.url;
      } else {
        persisted.dataUrl = '';
      }
      return persisted;
    });
  }

  function validateFiles(files, options) {
    options = options || {};
    var list = Array.prototype.slice.call(files || []);
    var maxFiles = Math.min(Number(options.maxFiles) || MAX_FILES, MAX_FILES);
    if (list.length > maxFiles) throw new Error('Envie no máximo ' + maxFiles + ' arquivos por vez.');
    list.forEach(function (file) {
      if (!file) throw new Error('Um dos anexos selecionados é inválido.');
      if (Number(file.size || 0) > MAX_FILE_SIZE) throw new Error('O arquivo “' + (file.name || 'anexo') + '” ultrapassa o limite de 10 MB.');
      var type = normalizeText(file.type);
      if (ALLOWED_TYPES.indexOf(type) === -1) throw new Error('O formato de “' + (file.name || 'anexo') + '” não é permitido.');
    });
    return list;
  }

  function fileToDataUrl(file) {
    return new Promise(function (resolve) {
      if (!file || Number(file.size || 0) > FIXTURE_INLINE_LIMIT || typeof FileReader !== 'function') {
        resolve('');
        return;
      }
      var reader = new FileReader();
      reader.addEventListener('load', function () { resolve(String(reader.result || '')); });
      reader.addEventListener('error', function () { resolve(''); });
      reader.readAsDataURL(file);
    });
  }

  function createFixtureAttachments(files, source, resourceId) {
    var normalizedSource = normalizeSource(source);
    return Promise.all(validateFiles(files).map(function (file) {
      return fileToDataUrl(file).then(function (dataUrl) {
        return normalizeAttachment({
          id: createAttachmentId(),
          name: file.name,
          type: file.type,
          size: file.size,
          source: normalizedSource,
          resourceId: resourceId,
          url: dataUrl,
          dataUrl: dataUrl,
          previewable: Boolean(dataUrl) && isPreviewableType(file.type),
          syncStatus: 'fixture-memory',
          tooLarge: !dataUrl && Number(file.size || 0) > FIXTURE_INLINE_LIMIT
        });
      });
    }));
  }

  function signedUrlTtl() {
    var config = root.DOKE_SUPABASE_CONFIG || {};
    var configured = Number(config.attachmentSignedUrlTtlSeconds);
    if (!Number.isFinite(configured) || configured < 60 || configured > 900) return DEFAULT_SIGNED_URL_TTL;
    return configured;
  }

  function createSignedUrls(client, attachment, options) {
    var normalized = normalizeAttachment(attachment);
    if (!normalized || !normalized.path || !client || !client.storage) return Promise.resolve(normalized);
    var bucket = client.storage.from(normalized.bucket || BUCKET);
    var ttl = Number(options && options.expiresIn) || signedUrlTtl();
    var previewTask = bucket.createSignedUrl(normalized.path, ttl).then(function (result) {
      if (result.error) throw result.error;
      return result.data && result.data.signedUrl || '';
    });
    var downloadTask = bucket.createSignedUrl(normalized.path, ttl, { download: normalized.name }).then(function (result) {
      if (result.error) throw result.error;
      return result.data && result.data.signedUrl || '';
    });
    return Promise.all([previewTask, downloadTask]).then(function (urls) {
      return normalizeAttachment(Object.assign({}, normalized, {
        url: urls[0],
        downloadUrl: urls[1] || urls[0],
        previewable: isPreviewableType(normalized.type),
        syncStatus: 'synced'
      }));
    });
  }

  function invokeAttachmentAction(action, params) {
    try {
      requireRemoteBoundary();
    } catch (error) {
      return Promise.reject(error);
    }
    return Promise.resolve(root.DokeSupabase.invokeSelfService(action, params || {})).catch(function (error) {
      recordRemoteError(error, action);
      throw error;
    });
  }

  function prepareRemoteUploads(source, resourceId, files) {
    return invokeAttachmentAction('prepare_transaction_attachment_uploads', {
      p_resource_kind: normalizeSource(source),
      p_resource_ref: normalizeText(resourceId),
      p_files: files.map(function (file) {
        return {
          name: normalizeText(file.name),
          type: normalizeText(file.type),
          size: Number(file.size || 0)
        };
      })
    }).then(function (result) {
      var uploads = result && Array.isArray(result.uploads) ? result.uploads : [];
      if (uploads.length !== files.length) {
        throw createAuthorityError('DOKE_ATTACHMENTS_UPLOAD_INTENT_INCOMPLETE', 'O servidor não preparou todos os anexos.');
      }
      return uploads;
    });
  }

  function abandonPreparedUploads(uploads) {
    return Promise.all((uploads || []).map(function (upload) {
      var id = normalizeText(upload && (upload.attachmentId || upload.lifecycleId || upload.id));
      if (!id) return Promise.resolve(false);
      return invokeAttachmentAction('remove_transaction_attachment', {
        p_attachment_id: id,
        p_reason: 'upload_failed'
      }).then(function () { return true; }).catch(function () { return false; });
    }));
  }

  function uploadRemoteFiles(source, resourceId, files) {
    var client;
    try { client = requireRemoteBoundary(); }
    catch (error) { return Promise.reject(error); }

    var prepared = [];
    return prepareRemoteUploads(source, resourceId, files).then(function (uploads) {
      prepared = uploads;
      return uploads.reduce(function (chain, upload, index) {
        return chain.then(function (completed) {
          var file = files[index];
          var bucketName = normalizeText(upload.bucket) || BUCKET;
          var objectPath = normalizeText(upload.path);
          var token = normalizeText(upload.token);
          if (!objectPath || !token) throw createAuthorityError('DOKE_ATTACHMENTS_SIGNED_UPLOAD_INVALID');
          var bucket = client.storage.from(bucketName);
          if (!bucket || typeof bucket.uploadToSignedUrl !== 'function') {
            throw createAuthorityError('DOKE_ATTACHMENTS_SIGNED_UPLOAD_UNAVAILABLE');
          }
          return Promise.resolve(bucket.uploadToSignedUrl(objectPath, token, file, {
            contentType: normalizeText(file.type),
            cacheControl: '3600'
          })).then(function (result) {
            if (result && result.error) throw result.error;
            completed.push(upload);
            return completed;
          });
        });
      }, Promise.resolve([]));
    }).then(function () {
      return invokeAttachmentAction('confirm_transaction_attachment_uploads', {
        p_attachment_ids: prepared.map(function (item) {
          return normalizeText(item.attachmentId || item.lifecycleId || item.id);
        })
      });
    }).then(function (result) {
      var items = result && Array.isArray(result.items) ? result.items : [];
      if (items.length !== files.length) {
        throw createAuthorityError('DOKE_ATTACHMENTS_CONFIRMATION_INCOMPLETE');
      }
      return Promise.all(items.map(function (item) {
        return createSignedUrls(client, normalizeAttachment({
          id: item.attachmentId || item.id,
          lifecycleId: item.attachmentId || item.id,
          name: item.name,
          type: item.type,
          size: item.size,
          bucket: item.bucket || BUCKET,
          path: item.path,
          source: source,
          resourceId: resourceId,
          uploadedBy: item.uploadedBy,
          retentionState: item.status || 'uploaded',
          syncStatus: 'synced'
        }));
      }));
    }).then(function (items) {
      lastRemoteError = null;
      setProviderState('server-owned');
      return items;
    }).catch(function (error) {
      recordRemoteError(error, 'upload');
      return abandonPreparedUploads(prepared).then(function () { throw error; });
    });
  }

  function uploadFiles(source, resourceId, files, options) {
    var list;
    try { list = validateFiles(files, options); }
    catch (error) { return Promise.reject(error); }
    if (!list.length) return Promise.resolve([]);
    if (getAuthorityMode() === 'fixture-memory') {
      setProviderState('fixture-memory');
      return createFixtureAttachments(list, source, resourceId);
    }
    return uploadRemoteFiles(normalizeSource(source), resourceId, list);
  }

  function syncPending(source, resourceId, attachments) {
    var items = normalizeAttachments(attachments);
    if (getAuthorityMode() === 'fixture-memory') return Promise.resolve(items);
    if (items.some(function (item) { return item.syncStatus !== 'synced' || !item.path; })) {
      return Promise.reject(createAuthorityError(
        'DOKE_ATTACHMENTS_PENDING_SYNC_FORBIDDEN',
        'Sessões reais não aceitam anexos pendentes ou Base64 para sincronização posterior.'
      ));
    }
    return Promise.resolve(items);
  }

  function resolveUrls(attachments, options) {
    var items = normalizeAttachments(attachments);
    if (!items.some(function (item) { return Boolean(item.path); })) return Promise.resolve(items);
    if (getAuthorityMode() === 'fixture-memory') return Promise.resolve(items);
    var client = getSupabaseClient();
    if (!client) return Promise.reject(createAuthorityError());
    return Promise.all(items.map(function (item) {
      if (!item.path) return Promise.resolve(item);
      return createSignedUrls(client, item, options);
    })).catch(function (error) {
      recordRemoteError(error, 'signed-url');
      throw error;
    });
  }

  function remove(attachment) {
    var item = normalizeAttachment(attachment);
    if (!item) return Promise.resolve(false);
    if (getAuthorityMode() === 'fixture-memory') return Promise.resolve(true);
    var attachmentId = normalizeText(item.lifecycleId || item.id);
    if (!attachmentId) return Promise.reject(createAuthorityError('DOKE_ATTACHMENTS_ID_REQUIRED'));
    return invokeAttachmentAction('remove_transaction_attachment', {
      p_attachment_id: attachmentId,
      p_reason: 'user_removed'
    }).then(function () {
      setProviderState('server-owned');
      return true;
    });
  }

  repositories.attachments = Object.freeze({
    bucket: BUCKET,
    maxFiles: MAX_FILES,
    maxFileSize: MAX_FILE_SIZE,
    allowedTypes: ALLOWED_TYPES,
    normalize: normalizeAttachment,
    normalizeAll: normalizeAttachments,
    toPersistedMetadata: toPersistedMetadata,
    validateFiles: validateFiles,
    uploadOrderFiles: function (orderId, files, options) { return uploadFiles('order', orderId, files, options); },
    uploadConversationFiles: function (conversationId, files, options) { return uploadFiles('conversation', conversationId, files, options); },
    syncPendingOrder: function (orderId, attachments) { return syncPending('order', orderId, attachments); },
    syncPendingConversation: function (conversationId, attachments) { return syncPending('conversation', conversationId, attachments); },
    resolveUrls: resolveUrls,
    remove: remove,
    getAuthorityStatus: function () {
      var mode = getAuthorityMode();
      return Object.freeze({
        authority: mode,
        uploadAuthority: mode === 'remote-server-owned' ? 'server-owned-signed-intent' : 'fixture-memory',
        removalAuthority: mode === 'remote-server-owned' ? 'server-owned' : 'fixture-memory',
        pendingSynchronization: false,
        persistentBase64Authority: false
      });
    },
    getProviderStatus: function () {
      var mode = getAuthorityMode();
      return Object.freeze({
        authority: mode,
        provider: mode === 'remote-server-owned' ? (getSupabaseClient() ? 'supabase-private' : 'unavailable') : 'fixture-memory',
        fallbackActive: false,
        lastError: lastRemoteError ? normalizeText(lastRemoteError.message) : ''
      });
    }
  });
})();
