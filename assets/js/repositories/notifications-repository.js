/* Doke Notifications Repository
   Responsibility: local/mock persistence boundary for notification entities.
   Backend migration rule: pages/services must call this repository instead of localStorage directly. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});

  var STORAGE_KEY = 'doke.notifications.local.v1';
  var LEGACY_STORAGE_KEY = 'doke.notifications';
  var FALLBACK_URL = 'assets/data/mock-notifications.json';
  var MOCK_CLEANUP_KEY = 'doke.notifications.mock-cleanup.v1';
  var MOCK_NOTIFICATION_IDS = Object.freeze(['not_001', 'not_002']);
  var cache = null;
  var PROVIDER_ATTRIBUTE = 'data-doke-notifications-provider';
  var REMOTE_TABLE = 'notifications';
  var REMOTE_CREATE_RPC = 'create_transaction_notification';
  var supabaseClient = null;
  var supabaseClientAttempted = false;
  var lastRemoteError = null;
  var realtimeChannel = null;
  var realtimeUserId = '';

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; }
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeBoolean(value) {
    return value === true || value === 'true' || value === '1' || value === 'on';
  }

  function isStaticDemoEnabled() {
    var config = root.DOKE_RUNTIME_CONFIG && typeof root.DOKE_RUNTIME_CONFIG === 'object'
      ? root.DOKE_RUNTIME_CONFIG
      : {};
    var configured = config.notificationsDemoData;
    if (configured === undefined && config.flags) configured = config.flags.notificationsDemoData;

    try {
      var params = new URLSearchParams(root.location.search || '');
      if (params.has('dokeNotificationsDemo')) configured = params.get('dokeNotificationsDemo');
    } catch (error) {
      // Ignore malformed URLs and keep the secure default: demo data disabled.
    }

    if (configured === undefined) {
      try { configured = root.localStorage.getItem('doke.notifications.demoData'); }
      catch (error) { configured = false; }
    }

    return normalizeBoolean(configured);
  }

  function isLegacyStaticMock(item) {
    if (!item || typeof item !== 'object') return false;
    var id = normalizeText(item.id);
    if (MOCK_NOTIFICATION_IDS.indexOf(id) !== -1) return true;

    var title = normalizeText(item.title);
    var body = normalizeText(item.body || item.message || item.description);
    return (title === 'Novo orçamento recebido' && body === 'Marcos enviou um orçamento para sua pintura residencial.')
      || (title === 'Nova mensagem' && body === 'Ana respondeu sobre o serviço elétrico.');
  }

  function removeLegacyStaticMocks(items) {
    return (Array.isArray(items) ? items : []).filter(function (item) {
      return !isLegacyStaticMock(item);
    });
  }

  function cleanupLegacyStaticMocks() {
    var alreadyCleaned = false;
    try { alreadyCleaned = root.localStorage.getItem(MOCK_CLEANUP_KEY) === 'done'; }
    catch (error) { alreadyCleaned = false; }
    if (alreadyCleaned) return;

    var localItems = removeLegacyStaticMocks(safeRead(STORAGE_KEY));
    var legacyItems = removeLegacyStaticMocks(safeRead(LEGACY_STORAGE_KEY));
    safeWrite(STORAGE_KEY, localItems);
    safeWrite(LEGACY_STORAGE_KEY, legacyItems);
    try { root.localStorage.setItem(MOCK_CLEANUP_KEY, 'done'); }
    catch (error) { /* localStorage may be unavailable. */ }
  }

  function createNotificationId() {
    return 'notif_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
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
      // localStorage may be unavailable in restricted contexts.
    }
  }

  function getSessionUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') {
      var user = Doke.session.getCurrentUser();
      if (user) return user;
    }

    try {
      var raw = root.localStorage.getItem('doke.auth.session.v1');
      var session = raw ? JSON.parse(raw) : null;
      return session && session.user ? session.user : null;
    } catch (error) {
      return null;
    }
  }

  function getIdentityKeysFromUser(user) {
    var profile = user && user.profile || {};
    var profiles = user && Array.isArray(user.profiles) ? user.profiles : [];
    var values = [
      user && user.id,
      user && user.userId,
      user && user.accountId,
      user && user.email,
      profile && profile.id,
      profile && profile.userId,
      profile && profile.accountId,
      profile && profile.email
    ];
    profiles.forEach(function (item) {
      values.push(item && item.id, item && item.userId, item && item.accountId, item && item.email);
    });
    return Array.from(new Set(values.map(function (value) {
      return normalizeText(value).toLowerCase();
    }).filter(Boolean)));
  }

  function getCategory(type) {
    if (/message/i.test(type || '')) return 'messages';
    if (/order|budget|proposal|status/i.test(type || '')) return 'orders';
    if (/service|ad/i.test(type || '')) return 'ads';
    return 'social';
  }

  function getActionLabel(type) {
    return getCategory(type) === 'messages' ? 'Abrir conversa' : 'Abrir';
  }

  function getTargetUrl(raw) {
    if (raw.targetUrl) return raw.targetUrl;
    if (raw.conversationId) return 'mensagens.html?conversation=' + encodeURIComponent(raw.conversationId);
    if (raw.orderId) return 'pedidos.html?orderId=' + encodeURIComponent(raw.orderId);
    return 'notificacoes.html';
  }

  function getEventKey(raw) {
    var explicit = normalizeText(raw.eventKey || raw.dedupeKey || '');
    if (explicit) return explicit;

    var type = normalizeText(raw.type || 'system');
    var userId = normalizeText(raw.userId || raw.recipientId || '');
    var messageId = normalizeText(raw.messageId || '');
    var orderId = normalizeText(raw.orderId || '');
    var conversationId = normalizeText(raw.conversationId || '');

    if (messageId) return [type, messageId, userId].filter(Boolean).join(':');
    if (orderId) return [type, orderId, userId].filter(Boolean).join(':');
    if (conversationId) return [type, conversationId, userId].filter(Boolean).join(':');
    return '';
  }

  function normalizeNotification(raw) {
    raw = raw || {};
    var type = normalizeText(raw.type || 'system');
    var category = normalizeText(raw.category || getCategory(type));
    var createdAt = raw.createdAt || raw.creatédAt || nowIso();
    var title = normalizeText(raw.title || 'Nova notificação');
    var body = normalizeText(raw.body || raw.message || raw.description || '');
    var read = raw.read === true;
    var dismissed = raw.dismissed === true;

    return Object.assign({}, raw, {
      id: normalizeText(raw.id) || createNotificationId(),
      type: type,
      category: category,
      userId: normalizeText(raw.userId || raw.recipientId || ''),
      recipientAccountKey: normalizeText(raw.recipientAccountKey || raw.accountKey || raw.userAccountKey || ''),
      eventKey: getEventKey(raw),
      messageId: normalizeText(raw.messageId || ''),
      actorId: normalizeText(raw.actorId || ''),
      actorName: normalizeText(raw.actorName || ''),
      orderId: normalizeText(raw.orderId || ''),
      conversationId: normalizeText(raw.conversationId || ''),
      serviceId: normalizeText(raw.serviceId || ''),
      title: title,
      body: body,
      targetUrl: getTargetUrl(raw),
      actionLabel: normalizeText(raw.actionLabel || raw.action || getActionLabel(type)),
      read: read,
      dismissed: dismissed,
      createdAt: createdAt,
      creatédAt: raw.creatédAt || createdAt,
      updatedAt: raw.updatedAt || createdAt
    });
  }

  function mergeById() {
    var map = Object.create(null);
    var eventMap = Object.create(null);
    Array.prototype.slice.call(arguments).forEach(function (items) {
      (items || []).forEach(function (item) {
        var normalized = normalizeNotification(item);
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
    cleanupLegacyStaticMocks();
    return mergeById(
      removeLegacyStaticMocks(safeRead(STORAGE_KEY)),
      removeLegacyStaticMocks(safeRead(LEGACY_STORAGE_KEY))
    );
  }

  function writeLocal(items) {
    var normalized = mergeById(Array.isArray(items) ? items : []);
    safeWrite(STORAGE_KEY, normalized);
    safeWrite(LEGACY_STORAGE_KEY, normalized);
    cache = null;
    return clone(normalized);
  }


  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizeText(value));
  }

  function setProviderState(provider) {
    try { document.documentElement.setAttribute(PROVIDER_ATTRIBUTE, provider); }
    catch (error) { /* Non-browser contract tests may not expose documentElement. */ }
  }

  function warnRemote(error, context) {
    lastRemoteError = error || new Error('Falha desconhecida nas notificações remotas.');
    setProviderState('local-fallback');
    if (root.console && typeof root.console.warn === 'function') {
      root.console.warn('[Doke notifications repository] Supabase indisponível em ' + context + '. Usando fallback local.', error);
    }
  }

  function getSupabaseClient() {
    if (supabaseClientAttempted) return supabaseClient;
    supabaseClientAttempted = true;

    var config = root.DOKE_SUPABASE_CONFIG || {};
    var sdk = root.supabase;
    if (!config.enabled || config.notificationsEnabled === false || !config.url || !config.anonKey || !sdk || typeof sdk.createClient !== 'function') {
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

  function sanitizeRemoteData(notification) {
    var metadata = clone(normalizeNotification(notification));
    delete metadata.remoteId;
    delete metadata.syncError;
    delete metadata.syncStatus;
    return metadata;
  }

  function mapRemoteRow(row) {
    row = row || {};
    var metadata = row.data && typeof row.data === 'object' ? clone(row.data) : {};
    return normalizeNotification(Object.assign({}, metadata, {
      id: row.external_id || metadata.id || row.id,
      remoteId: row.id,
      userId: row.user_id || metadata.userId || '',
      actorId: row.actor_id || metadata.actorId || '',
      type: row.type || metadata.type || 'system',
      category: row.category || metadata.category || getCategory(row.type),
      eventKey: row.event_key || metadata.eventKey || '',
      title: row.title || metadata.title || 'Nova notificação',
      body: row.body || metadata.body || '',
      targetUrl: row.target_url || metadata.targetUrl || 'notificacoes.html',
      actionLabel: row.action_label || metadata.actionLabel || getActionLabel(row.type),
      orderId: metadata.orderId || '',
      conversationId: metadata.conversationId || '',
      serviceId: metadata.serviceId || '',
      read: Boolean(row.read_at),
      dismissed: Boolean(row.dismissed_at),
      createdAt: row.created_at || metadata.createdAt || nowIso(),
      updatedAt: row.updated_at || row.created_at || metadata.updatedAt || nowIso(),
      syncStatus: 'synced',
      syncError: ''
    }));
  }

  function saveLocal(notification, syncStatus) {
    var normalized = normalizeNotification(Object.assign({}, notification, {
      syncStatus: syncStatus || notification && notification.syncStatus || 'local'
    }));
    var local = readLocal().filter(function (item) {
      if (String(item.id) === String(normalized.id)) return false;
      if (normalized.eventKey && item.eventKey && String(item.eventKey) === String(normalized.eventKey)) return false;
      return true;
    });
    local.unshift(normalized);
    writeLocal(local);
    return clone(normalized);
  }

  function syncGlobalBadges(items) {
    var center = root.DokeInAppNotifications;
    if (center && typeof center.syncGlobalBadges === 'function') {
      center.syncGlobalBadges((items || []).filter(function (item) { return item.dismissed !== true; }));
    }
  }

  function dispatchCreated(notification, source) {
    try {
      document.dispatchEvent(new CustomEvent('doke:notification-created', {
        detail: { notification: clone(notification), source: source || 'local' }
      }));
    } catch (error) { /* Event delivery is best-effort outside the browser. */ }

    if (source === 'realtime' && root.DokeInAppNotifications && typeof root.DokeInAppNotifications.publish === 'function') {
      root.DokeInAppNotifications.publish(clone(notification));
    }
  }

  function dispatchUpdated(notification, source) {
    try {
      document.dispatchEvent(new CustomEvent('doke:notification-updated', {
        detail: { notification: clone(notification), source: source || 'local' }
      }));
    } catch (error) { /* Event delivery is best-effort outside the browser. */ }
  }

  function stopRealtime() {
    var client = supabaseClient;
    if (realtimeChannel && client && typeof client.removeChannel === 'function') {
      try { client.removeChannel(realtimeChannel); } catch (error) { /* Ignore teardown failures. */ }
    }
    realtimeChannel = null;
    realtimeUserId = '';
  }

  function handleRealtimePayload(payload) {
    var row = payload && (payload.new || payload.record);
    if (!row) return;
    var notification = mapRemoteRow(row);
    saveLocal(notification, 'synced');
    cache = null;
    var eventType = normalizeText(payload && payload.eventType || '').toUpperCase();
    if (eventType === 'INSERT') dispatchCreated(notification, 'realtime');
    else dispatchUpdated(notification, 'realtime');
    syncGlobalBadges(listLocal({ dismissed: false }));
  }

  function startRealtime(userId) {
    var client = getSupabaseClient();
    var normalizedUserId = normalizeText(userId);
    if (!client || !isUuid(normalizedUserId) || typeof client.channel !== 'function') return null;
    if (realtimeChannel && realtimeUserId === normalizedUserId) return realtimeChannel;

    stopRealtime();
    try {
      realtimeChannel = client
        .channel('doke-notifications-' + normalizedUserId)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: REMOTE_TABLE,
          filter: 'user_id=eq.' + normalizedUserId
        }, handleRealtimePayload)
        .subscribe(function (status) {
          if (status === 'SUBSCRIBED') setProviderState('supabase');
        });
      realtimeUserId = normalizedUserId;
    } catch (error) {
      warnRemote(error, 'realtime');
      realtimeChannel = null;
      realtimeUserId = '';
    }
    return realtimeChannel;
  }

  function fetchRemoteNotifications() {
    var client = getSupabaseClient();
    if (!client) return Promise.reject(new Error('Supabase client unavailable.'));

    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) return [];
      startRealtime(user.id);
      return client.from(REMOTE_TABLE).select('*').order('created_at', { ascending: false }).then(function (result) {
        if (result.error) throw result.error;
        setProviderState('supabase');
        return (result.data || []).map(mapRemoteRow);
      });
    });
  }

  function saveRemote(notification) {
    var client = getSupabaseClient();
    if (!client) return Promise.reject(new Error('Supabase client unavailable.'));

    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) throw new Error('Faça login com uma conta Supabase para sincronizar notificações.');
      var normalized = normalizeNotification(notification);
      if (!isUuid(normalized.userId)) throw new Error('O destinatário ainda não possui identidade Supabase válida.');

      var params = {
        p_external_id: normalized.id,
        p_recipient_id: normalized.userId,
        p_type: normalized.type || 'system',
        p_category: normalized.category || getCategory(normalized.type),
        p_title: normalized.title || 'Nova notificação',
        p_body: normalized.body || '',
        p_event_key: normalized.eventKey || null,
        p_target_url: normalized.targetUrl || 'notificacoes.html',
        p_action_label: normalized.actionLabel || getActionLabel(normalized.type),
        p_order_external_id: normalized.orderId || null,
        p_conversation_external_id: normalized.conversationId || null,
        p_service_external_id: normalized.serviceId || null,
        p_data: sanitizeRemoteData(normalized)
      };

      return client.rpc(REMOTE_CREATE_RPC, params).then(function (result) {
        if (result.error) throw result.error;
        var row = Array.isArray(result.data) ? result.data[0] : result.data;
        if (!row) throw new Error('O Supabase não retornou a notificação persistida.');
        setProviderState('supabase');
        return mapRemoteRow(row);
      });
    });
  }

  function updateRemote(id, patch) {
    var client = getSupabaseClient();
    if (!client) return Promise.resolve(null);
    var notificationId = normalizeText(id);
    if (!notificationId) return Promise.resolve(null);

    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) return null;
      var payload = { updated_at: nowIso() };
      if (patch && patch.read === true) payload.read_at = nowIso();
      if (patch && patch.read === false) payload.read_at = null;
      if (patch && patch.dismissed === true) {
        payload.dismissed_at = nowIso();
        payload.read_at = payload.read_at || nowIso();
      }
      if (patch && patch.dismissed === false) payload.dismissed_at = null;

      return client.from(REMOTE_TABLE).update(payload).eq('external_id', notificationId).select('*').maybeSingle().then(function (result) {
        if (result.error) throw result.error;
        return result.data ? mapRemoteRow(result.data) : null;
      });
    });
  }

  function synchronizePending(items) {
    var client = getSupabaseClient();
    if (!client) return Promise.resolve(items || []);

    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) return items || [];
      var pending = (items || []).filter(function (item) {
        if (!item || !item.id || item.syncStatus === 'synced' || !isUuid(item.userId)) return false;
        return !item.actorId || String(item.actorId) === String(user.id);
      });
      return pending.reduce(function (chain, item) {
        return chain.then(function () {
          return saveRemote(item).then(function (synced) {
            saveLocal(synced, 'synced');
          }).catch(function (error) {
            warnRemote(error, 'sincronização pendente');
            saveLocal(Object.assign({}, item, { syncStatus: 'pending', syncError: normalizeText(error && error.message) }), 'pending');
          });
        });
      }, Promise.resolve()).then(function () { return readLocal(); });
    });
  }

  function loadBase(options) {
    options = options || {};
    if (!isStaticDemoEnabled()) return Promise.resolve([]);

    if (Doke.mockData && typeof Doke.mockData.load === 'function') {
      return Doke.mockData.load('notifications', options);
    }

    return fetch(FALLBACK_URL, { cache: 'no-cache', credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Não foi possível carregar notificações mockadas.');
        return response.json();
      });
  }

  function load(options) {
    options = options || {};
    if (cache && !options.fresh) return Promise.resolve(clone(cache));

    var local = readLocal();
    var baseTask = loadBase(options).catch(function () { return []; });
    if (!getSupabaseClient()) {
      return baseTask.then(function (base) {
        cache = mergeById(Array.isArray(base) ? base : [], local);
        syncGlobalBadges(cache);
        return clone(cache);
      });
    }

    return Promise.all([baseTask, fetchRemoteNotifications()]).then(function (results) {
      var base = Array.isArray(results[0]) ? results[0] : [];
      var remote = Array.isArray(results[1]) ? results[1] : [];
      remote.forEach(function (item) { saveLocal(item, 'synced'); });
      cache = mergeById(base, local, remote);
      return synchronizePending(cache).then(function () {
        cache = mergeById(base, readLocal(), remote);
        syncGlobalBadges(cache);
        return clone(cache);
      });
    }).catch(function (error) {
      warnRemote(error, 'leitura');
      return baseTask.then(function (base) {
        cache = mergeById(Array.isArray(base) ? base : [], readLocal());
        syncGlobalBadges(cache);
        return clone(cache);
      });
    });
  }

  function isDemoProfessional(user) {
    return Boolean(user && user.role === 'professional' && String(user.id) === 'user_profissional_demo');
  }

  function isDemoProfessionalFacingNotification(notification) {
    var category = String(notification.category || '').toLowerCase();
    var type = String(notification.type || '').toLowerCase();
    var title = String(notification.title || '').toLowerCase();
    var body = String(notification.body || '').toLowerCase();

    if (category !== 'orders') return false;
    if (type === 'order_created') return true;
    if (type === 'order_reviewed') return true;

    // Backward-compatible mock rule for older local notifications addressed to
    // provider/card IDs instead of the demo professional login. Keep this narrow:
    // accepted/refused/proposal events remain client-facing, while payment confirmation
    // starts the professional's operational work queue.
    return type === 'order_status_changed'
      && (title.indexOf('pagamento confirmado') !== -1
        || title.indexOf('atendimento em andamento') !== -1
        || title.indexOf('pedido concluído') !== -1
        || body.indexOf('atendimento foi liberado') !== -1
        || body.indexOf('pagou a proposta') !== -1
        || body.indexOf('confirmou a proposta') !== -1);
  }

  function matchesCurrentUser(notification, user) {
    if (!user || !user.id) return true;
    var userKeys = getIdentityKeysFromUser(user);
    var notificationKeys = [
      notification.userId,
      notification.recipientId,
      notification.recipientAccountKey
    ].map(function (value) { return normalizeText(value).toLowerCase(); }).filter(Boolean);
    if (!notificationKeys.length) return true;
    if (String(notification.userId) === String(user.id)) return true;
    if (notificationKeys.some(function (key) { return userKeys.indexOf(key) !== -1; })) return true;
    return isDemoProfessional(user) && isDemoProfessionalFacingNotification(notification);
  }

  function list(filters) {
    filters = filters || {};
    var user = filters.currentUser === false ? null : getSessionUser();
    return load(filters).then(function (items) {
      return clone((items || []).filter(function (item) {
        if (filters.currentUser !== false && !matchesCurrentUser(item, user)) return false;
        if (filters.read === true && item.read !== true) return false;
        if (filters.read === false && item.read === true) return false;
        if (filters.dismissed === false && item.dismissed === true) return false;
        if (filters.type && item.type !== filters.type) return false;
        if (filters.category && item.category !== filters.category) return false;
        return true;
      }));
    });
  }

  function listLocal(filters) {
    filters = filters || {};
    var user = filters.currentUser === false ? null : getSessionUser();
    return clone(readLocal().filter(function (item) {
      if (filters.currentUser !== false && !matchesCurrentUser(item, user)) return false;
      if (filters.read === true && item.read !== true) return false;
      if (filters.read === false && item.read === true) return false;
      if (filters.dismissed === false && item.dismissed === true) return false;
      if (filters.type && item.type !== filters.type) return false;
      if (filters.category && item.category !== filters.category) return false;
      return true;
    }));
  }

  function save(notification) {
    var normalized = normalizeNotification(Object.assign({}, notification, {
      syncStatus: notification && notification.syncStatus || 'pending'
    }));
    var localSaved = saveLocal(normalized, getSupabaseClient() ? 'pending' : 'local');
    dispatchCreated(localSaved, 'local');
    syncGlobalBadges(listLocal({ dismissed: false }));

    if (!getSupabaseClient()) return Promise.resolve(clone(localSaved));
    return saveRemote(localSaved).then(function (remoteSaved) {
      var synced = saveLocal(remoteSaved, 'synced');
      syncGlobalBadges(listLocal({ dismissed: false }));
      return clone(synced);
    }).catch(function (error) {
      warnRemote(error, 'gravação');
      var pending = saveLocal(Object.assign({}, localSaved, {
        syncStatus: 'pending',
        syncError: normalizeText(error && error.message)
      }), 'pending');
      return clone(pending);
    });
  }

  function getById(id) {
    var notificationId = normalizeText(id);
    if (!notificationId) return Promise.resolve(null);
    return load({ fresh: true }).then(function (items) {
      return clone((items || []).find(function (item) { return String(item.id) === String(notificationId); }) || null);
    });
  }

  function create(payload) {
    payload = payload || {};
    var normalized = normalizeNotification(payload);
    if (normalized.eventKey) {
      var existing = readLocal().find(function (item) {
        return item.eventKey && String(item.eventKey) === String(normalized.eventKey);
      });
      if (existing && existing.syncStatus === 'synced') return Promise.resolve(clone(existing));
    }

    return save(Object.assign({}, payload, {
      id: payload.id || createNotificationId(),
      read: payload && payload.read === true,
      dismissed: false,
      createdAt: payload && payload.createdAt || nowIso()
    }));
  }

  function update(id, patch) {
    var notificationId = normalizeText(id);
    var changed = null;
    var local = readLocal().map(function (item) {
      if (String(item.id) !== notificationId) return item;
      changed = normalizeNotification(Object.assign({}, item, patch || {}, { updatedAt: nowIso() }));
      return changed;
    });
    if (changed) {
      writeLocal(local);
      dispatchUpdated(changed, 'local');
      syncGlobalBadges(listLocal({ dismissed: false }));
    }
    if (!changed || !getSupabaseClient()) return Promise.resolve(clone(changed));

    return updateRemote(notificationId, patch || {}).then(function (remoteChanged) {
      if (!remoteChanged) return clone(changed);
      var synced = saveLocal(remoteChanged, 'synced');
      syncGlobalBadges(listLocal({ dismissed: false }));
      return clone(synced);
    }).catch(function (error) {
      warnRemote(error, 'atualização');
      return clone(changed);
    });
  }

  function markAsRead(id) {
    return update(id, { read: true });
  }

  function dismiss(id) {
    return update(id, { dismissed: true, read: true });
  }

  function markAllAsRead(filters) {
    filters = filters || {};
    var user = getSessionUser();
    var local = readLocal();
    var changed = false;
    local = local.map(function (item) {
      if (!matchesCurrentUser(item, user)) return item;
      if (filters.category && item.category !== filters.category) return item;
      if (item.read === true) return item;
      changed = true;
      return normalizeNotification(Object.assign({}, item, { read: true, updatedAt: nowIso() }));
    });
    if (changed) {
      writeLocal(local);
      syncGlobalBadges(listLocal({ dismissed: false }));
    }

    var client = getSupabaseClient();
    if (!client) return Promise.resolve(changed);
    return getCurrentSupabaseUser(client).then(function (remoteUser) {
      if (!remoteUser || !isUuid(remoteUser.id)) return changed;
      var query = client.from(REMOTE_TABLE).update({ read_at: nowIso(), updated_at: nowIso() }).is('read_at', null);
      if (filters.category) query = query.eq('category', filters.category);
      return query.then(function (result) {
        if (result.error) throw result.error;
        return changed;
      });
    }).catch(function (error) {
      warnRemote(error, 'marcar todas como lidas');
      return changed;
    });
  }

  function unreadCount(userId) {
    return list({ read: false, dismissed: false, currentUser: userId ? false : true }).then(function (items) {
      return (items || []).filter(function (item) {
        return !userId || String(item.userId) === String(userId) || String(item.recipientAccountKey || '') === String(userId);
      }).length;
    });
  }

  repositories.notifications = Object.freeze({
    storageKey: STORAGE_KEY,
    legacyStorageKey: LEGACY_STORAGE_KEY,
    normalize: normalizeNotification,
    readLocal: readLocal,
    writeLocal: writeLocal,
    load: load,
    list: list,
    listLocal: listLocal,
    getById: getById,
    save: save,
    create: create,
    update: update,
    markAsRead: markAsRead,
    dismiss: dismiss,
    markAllAsRead: markAllAsRead,
    unreadCount: unreadCount,
    isStaticDemoEnabled: isStaticDemoEnabled,
    cleanupLegacyStaticMocks: cleanupLegacyStaticMocks,
    syncPending: function () { return synchronizePending(readLocal()); },
    subscribe: function () {
      var client = getSupabaseClient();
      if (!client) return Promise.resolve(null);
      return getCurrentSupabaseUser(client).then(function (user) { return user ? startRealtime(user.id) : null; });
    },
    getProviderStatus: function () {
      return Object.freeze({
        provider: getSupabaseClient() ? 'supabase' : 'local',
        fallbackActive: Boolean(lastRemoteError),
        lastError: lastRemoteError ? normalizeText(lastRemoteError.message) : '',
        realtimeActive: Boolean(realtimeChannel)
      });
    },
    clearCache: function () { cache = null; },
    clearLocal: function () { writeLocal([]); }
  });

  function bootstrapRemoteNotifications() {
    if (!getSupabaseClient()) return;
    load({ fresh: true }).catch(function (error) { warnRemote(error, 'bootstrap de notificações'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrapRemoteNotifications, { once: true });
  else root.setTimeout(bootstrapRemoteNotifications, 0);

  document.addEventListener('doke:auth-session-change', function () {
    stopRealtime();
    cache = null;
    root.setTimeout(bootstrapRemoteNotifications, 0);
  });
})();
