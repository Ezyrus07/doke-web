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
  var cache = null;

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
    var body = normalizeText(raw.body || raw.description || '');
    var read = raw.read === true;
    var dismissed = raw.dismissed === true;

    return Object.assign({}, raw, {
      id: normalizeText(raw.id) || createNotificationId(),
      type: type,
      category: category,
      userId: normalizeText(raw.userId || raw.recipientId || ''),
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
      actionLabel: normalizeText(raw.actionLabel || getActionLabel(type)),
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
    return mergeById(safeRead(STORAGE_KEY), safeRead(LEGACY_STORAGE_KEY));
  }

  function writeLocal(items) {
    var normalized = mergeById(Array.isArray(items) ? items : []);
    safeWrite(STORAGE_KEY, normalized);
    safeWrite(LEGACY_STORAGE_KEY, normalized);
    cache = null;
    return clone(normalized);
  }

  function loadBase(options) {
    options = options || {};
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

    return loadBase(options)
      .catch(function () { return []; })
      .then(function (base) {
        cache = mergeById(Array.isArray(base) ? base : [], readLocal());
        return clone(cache);
      });
  }

  function isDemoProfessional(user) {
    return Boolean(user && user.role === 'professional' && String(user.id) === 'user_profissional_demo');
  }

  function matchesCurrentUser(notification, user) {
    if (!user || !user.id) return true;
    if (!notification.userId) return true;
    if (String(notification.userId) === String(user.id)) return true;
    // Backward-compatible mock rule: only new-order notifications may have been addressed
    // to the service provider ID, not the demo professional login ID. Status changes
    // such as accepted/refused are client-facing and must not leak into professional view.
    return isDemoProfessional(user)
      && String(notification.category || '').toLowerCase() === 'orders'
      && String(notification.type || '').toLowerCase() === 'order_created';
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
    var normalized = normalizeNotification(notification);
    var local = readLocal().filter(function (item) {
      if (String(item.id) === String(normalized.id)) return false;
      if (normalized.eventKey && item.eventKey && String(item.eventKey) === String(normalized.eventKey)) return false;
      return true;
    });
    local.unshift(normalized);
    writeLocal(local);
    document.dispatchEvent(new CustomEvent('doke:notification-created', { detail: { notification: clone(normalized) } }));
    return Promise.resolve(clone(normalized));
  }

  function create(payload) {
    payload = payload || {};
    var normalized = normalizeNotification(payload);
    if (normalized.eventKey) {
      var existing = readLocal().find(function (item) { return item.eventKey && String(item.eventKey) === String(normalized.eventKey); });
      if (existing) return Promise.resolve(clone(existing));
    }

    return save(Object.assign({}, payload, {
      id: payload.id || createNotificationId(),
      read: payload && payload.read === true ? true : false,
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
    if (changed) writeLocal(local);
    return Promise.resolve(clone(changed));
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
    if (changed) writeLocal(local);
    return Promise.resolve(changed);
  }

  function unreadCount(userId) {
    return list({ read: false, dismissed: false, currentUser: userId ? false : true }).then(function (items) {
      return (items || []).filter(function (item) {
        return !userId || String(item.userId) === String(userId);
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
    save: save,
    create: create,
    update: update,
    markAsRead: markAsRead,
    dismiss: dismiss,
    markAllAsRead: markAllAsRead,
    unreadCount: unreadCount,
    clearLocal: function () { writeLocal([]); }
  });
})();
