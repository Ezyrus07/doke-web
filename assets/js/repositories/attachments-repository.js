/* Doke Attachments Repository
   Responsibility: secure persistence boundary for order and conversation attachments.
   Files are private in Supabase Storage and exposed through short-lived signed URLs.
   Local fallback preserves small previews and file metadata without blocking the product. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});

  var BUCKET = 'transaction-attachments';
  var PROVIDER_ATTRIBUTE = 'data-doke-attachments-provider';
  var MAX_FILE_SIZE = 10 * 1024 * 1024;
  var MAX_FILES = 8;
  var LOCAL_INLINE_LIMIT = 160000;
  var SIGNED_URL_TTL = 900;
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

  function setProviderState(provider) {
    try { document.documentElement.setAttribute(PROVIDER_ATTRIBUTE, provider); }
    catch (error) { /* test environments may not expose documentElement */ }
  }

  function warnRemote(error, context) {
    lastRemoteError = error || new Error('Falha desconhecida no armazenamento de anexos.');
    setProviderState('local-fallback');
    if (root.console && typeof root.console.warn === 'function') {
      root.console.warn('[Doke attachments repository] Supabase Storage indisponível em ' + context + '. Usando fallback local.', error);
    }
  }

  function getSupabaseClient() {
    if (supabaseClientAttempted) return supabaseClient;
    supabaseClientAttempted = true;
    var config = root.DOKE_SUPABASE_CONFIG || {};
    var sdk = root.supabase;
    if (!config.enabled || config.attachmentsEnabled === false || !config.url || !config.anonKey || !sdk || typeof sdk.createClient !== 'function') {
      setProviderState('local');
      return null;
    }
    try {
      supabaseClient = root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
        ? root.DokeSupabase.getClient()
        : sdk.createClient(config.url, config.anonKey);
      setProviderState('supabase');
    } catch (error) {
      warnRemote(error, 'bootstrap');
      supabaseClient = null;
    }
    return supabaseClient;
  }

  function getCurrentSupabaseUser(client) {
    if (!client || !client.auth || typeof client.auth.getSession !== 'function') return Promise.resolve(null);
    return Promise.resolve(client.auth.getSession()).then(function (result) {
      return result && result.data && result.data.session && result.data.session.user || null;
    });
  }

  function normalizeSource(value) {
    var source = normalizeText(value).toLowerCase();
    return source === 'message' || source === 'conversation' ? 'conversation' : 'order';
  }

  function getResourceTable(source) {
    return normalizeSource(source) === 'conversation' ? 'conversations' : 'orders';
  }

  function getResourceFolder(source) {
    return normalizeSource(source) === 'conversation' ? 'conversations' : 'orders';
  }

  function sanitizeFileName(value) {
    var input = normalizeText(value || 'anexo');
    var extensionMatch = input.match(/(\.[a-z0-9]{1,10})$/i);
    var extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';
    var base = extension ? input.slice(0, -extension.length) : input;
    base = base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'anexo';
    return base + extension;
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
    if (!raw) return null;
    if (typeof raw === 'string') {
      return {
        id: createAttachmentId(),
        name: raw,
        type: '',
        size: 0,
        bucket: '',
        path: '',
        source: '',
        resourceId: '',
        uploadedBy: '',
        createdAt: '',
        url: '',
        downloadUrl: '',
        previewable: false,
        syncStatus: 'local'
      };
    }
    if (typeof raw !== 'object') return null;

    var type = normalizeText(raw.type || raw.mimeType || raw.contentType || '');
    var url = normalizeText(raw.url || raw.signedUrl || raw.dataUrl || raw.preview || '');
    var path = normalizeText(raw.path || raw.storagePath || raw.objectPath || '');
    return {
      id: normalizeText(raw.id || raw.attachmentId) || createAttachmentId(),
      name: normalizeText(raw.name || raw.filename || raw.originalName || 'anexo'),
      type: type,
      size: Number(raw.size || raw.sizeBytes) || 0,
      bucket: normalizeText(raw.bucket) || (path ? BUCKET : ''),
      path: path,
      source: normalizeSource(raw.source || raw.kind || ''),
      resourceId: normalizeText(raw.resourceId || raw.orderId || raw.conversationId || ''),
      uploadedBy: normalizeText(raw.uploadedBy || raw.uploaderId || ''),
      createdAt: raw.createdAt || nowIso(),
      url: url,
      dataUrl: /^data:/i.test(url) ? url : normalizeText(raw.dataUrl || ''),
      downloadUrl: normalizeText(raw.downloadUrl || ''),
      previewable: raw.previewable === true || (Boolean(url) && isPreviewableType(type)),
      syncStatus: normalizeText(raw.syncStatus) || (path ? 'synced' : 'local'),
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
      if (persisted.path) {
        persisted.url = '';
        persisted.dataUrl = '';
        persisted.downloadUrl = '';
        persisted.previewable = isPreviewableType(persisted.type);
        persisted.syncStatus = 'synced';
        persisted.tooLarge = false;
        persisted.error = '';
      } else {
        persisted.url = /^data:/i.test(persisted.dataUrl || persisted.url || '') ? (persisted.dataUrl || persisted.url) : '';
        persisted.dataUrl = persisted.url;
        persisted.downloadUrl = '';
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
      if (!file || Number(file.size || 0) > LOCAL_INLINE_LIMIT || typeof FileReader !== 'function') {
        resolve('');
        return;
      }
      var reader = new FileReader();
      reader.addEventListener('load', function () { resolve(String(reader.result || '')); });
      reader.addEventListener('error', function () { resolve(''); });
      reader.readAsDataURL(file);
    });
  }

  function createLocalAttachments(files, source, resourceId, reason) {
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
          syncStatus: 'pending',
          tooLarge: !dataUrl && Number(file.size || 0) > LOCAL_INLINE_LIMIT,
          error: reason ? normalizeText(reason.message || reason) : ''
        });
      });
    }));
  }

  function dataUrlToBlob(dataUrl) {
    var raw = normalizeText(dataUrl);
    if (!/^data:/i.test(raw)) return null;
    var parts = raw.split(',');
    if (parts.length < 2) return null;
    var header = parts[0];
    var mimeMatch = header.match(/^data:([^;,]+)/i);
    var mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    var binary;
    try { binary = header.indexOf(';base64') !== -1 ? atob(parts[1]) : decodeURIComponent(parts[1]); }
    catch (error) { return null; }
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mime });
  }

  function resolveRemoteResourceId(client, source, resourceId) {
    var id = normalizeText(resourceId);
    if (!id) return Promise.reject(new Error('Recurso do anexo não informado.'));
    if (isUuid(id)) return Promise.resolve(id);
    return client.from(getResourceTable(source)).select('id').eq('external_id', id).maybeSingle().then(function (result) {
      if (result.error) throw result.error;
      if (!result.data || !result.data.id) throw new Error('O recurso ainda não foi sincronizado no Supabase.');
      return result.data.id;
    });
  }

  function createObjectPath(source, remoteResourceId, userId, fileName) {
    return [
      getResourceFolder(source),
      remoteResourceId,
      userId,
      Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + '-' + sanitizeFileName(fileName)
    ].join('/');
  }

  function createSignedUrls(client, attachment, options) {
    options = options || {};
    var normalized = normalizeAttachment(attachment);
    if (!normalized || !normalized.path || !client || !client.storage) return Promise.resolve(normalized);
    var bucket = client.storage.from(normalized.bucket || BUCKET);
    var ttl = Number(options.expiresIn) || SIGNED_URL_TTL;
    var previewPromise = bucket.createSignedUrl(normalized.path, ttl).then(function (result) {
      if (result.error) throw result.error;
      return result.data && result.data.signedUrl || '';
    });
    var downloadPromise = bucket.createSignedUrl(normalized.path, ttl, { download: normalized.name }).then(function (result) {
      if (result.error) throw result.error;
      return result.data && result.data.signedUrl || '';
    }).catch(function () { return ''; });
    return Promise.all([previewPromise, downloadPromise]).then(function (urls) {
      return normalizeAttachment(Object.assign({}, normalized, {
        url: urls[0],
        downloadUrl: urls[1] || urls[0],
        previewable: isPreviewableType(normalized.type),
        syncStatus: 'synced'
      }));
    });
  }

  function uploadBlob(client, user, source, resourceId, remoteResourceId, blob, metadata) {
    var name = normalizeText(metadata && metadata.name || 'anexo');
    var type = normalizeText(metadata && metadata.type || blob && blob.type || 'application/octet-stream');
    var size = Number(metadata && metadata.size || blob && blob.size || 0);
    var objectPath = createObjectPath(source, remoteResourceId, user.id, name);
    var bucket = client.storage.from(BUCKET);
    return bucket.upload(objectPath, blob, {
      upsert: false,
      contentType: type,
      cacheControl: '3600'
    }).then(function (result) {
      if (result.error) throw result.error;
      return createSignedUrls(client, {
        id: normalizeText(metadata && metadata.id) || createAttachmentId(),
        name: name,
        type: type,
        size: size,
        bucket: BUCKET,
        path: objectPath,
        source: source,
        resourceId: resourceId,
        uploadedBy: user.id,
        createdAt: metadata && metadata.createdAt || nowIso(),
        syncStatus: 'synced'
      });
    });
  }

  function uploadFiles(source, resourceId, files, options) {
    options = options || {};
    var list;
    try { list = validateFiles(files, options); }
    catch (error) { return Promise.reject(error); }
    if (!list.length) return Promise.resolve([]);

    var client = getSupabaseClient();
    if (!client) return createLocalAttachments(list, source, resourceId);

    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) throw new Error('Faça login com uma conta Supabase para enviar anexos.');
      return resolveRemoteResourceId(client, source, resourceId).then(function (remoteResourceId) {
        return list.reduce(function (chain, file) {
          return chain.then(function (uploaded) {
            return uploadBlob(client, user, normalizeSource(source), resourceId, remoteResourceId, file, {
              name: file.name,
              type: file.type,
              size: file.size
            }).then(function (attachment) {
              uploaded.push(attachment);
              return uploaded;
            });
          });
        }, Promise.resolve([]));
      });
    }).then(function (items) {
      setProviderState('supabase');
      return items;
    }).catch(function (error) {
      warnRemote(error, 'upload');
      return createLocalAttachments(list, source, resourceId, error);
    });
  }

  function syncPending(source, resourceId, attachments) {
    var items = normalizeAttachments(attachments);
    var pending = items.filter(function (item) {
      return item.syncStatus !== 'synced' && /^data:/i.test(item.dataUrl || item.url || '');
    });
    if (!pending.length || !getSupabaseClient()) return Promise.resolve(items);

    var client = getSupabaseClient();
    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) return items;
      return resolveRemoteResourceId(client, source, resourceId).then(function (remoteResourceId) {
        var syncedById = Object.create(null);
        return pending.reduce(function (chain, item) {
          return chain.then(function () {
            var blob = dataUrlToBlob(item.dataUrl || item.url);
            if (!blob) return null;
            return uploadBlob(client, user, normalizeSource(source), resourceId, remoteResourceId, blob, item).then(function (synced) {
              syncedById[item.id] = synced;
              return synced;
            });
          });
        }, Promise.resolve()).then(function () {
          return items.map(function (item) { return syncedById[item.id] || item; });
        });
      });
    }).catch(function (error) {
      warnRemote(error, 'sincronização pendente');
      return items;
    });
  }

  function resolveUrls(attachments, options) {
    var items = normalizeAttachments(attachments);
    var client = getSupabaseClient();
    if (!client || !items.some(function (item) { return Boolean(item.path); })) return Promise.resolve(items);
    return Promise.all(items.map(function (item) {
      if (!item.path) return Promise.resolve(item);
      return createSignedUrls(client, item, options).catch(function (error) {
        warnRemote(error, 'URL assinada');
        return item;
      });
    }));
  }

  function remove(attachment) {
    var item = normalizeAttachment(attachment);
    if (!item || !item.path) return Promise.resolve(false);
    var client = getSupabaseClient();
    if (!client) return Promise.resolve(false);
    return client.storage.from(item.bucket || BUCKET).remove([item.path]).then(function (result) {
      if (result.error) throw result.error;
      return true;
    }).catch(function (error) {
      warnRemote(error, 'remoção');
      return false;
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
    getProviderStatus: function () {
      return Object.freeze({
        provider: getSupabaseClient() ? 'supabase' : 'local',
        fallbackActive: Boolean(lastRemoteError),
        lastError: lastRemoteError ? normalizeText(lastRemoteError.message) : ''
      });
    }
  });
})();
