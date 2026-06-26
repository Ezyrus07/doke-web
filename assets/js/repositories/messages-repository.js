/* Doke Messages Repository
   Responsibility: local/mock persistence boundary for conversations and messages.
   Backend migration rule: pages/services must call this repository instead of localStorage directly. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});

  var STORAGE_KEY = 'doke.conversations.local.v1';
  var LEGACY_STORAGE_KEY = 'doke.messages.local.v1';
  var FALLBACK_URL = 'assets/data/mock-messages.json';
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

  function createConversationId(order) {
    var base = normalizeText(order && order.id);
    return base ? 'conv_' + base.replace(/^order_/, '') : 'conv_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function createMessageId() {
    return 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function toTimeLabel(value) {
    var date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return 'agora';
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function formatBudget(value) {
    var raw = normalizeText(value);
    if (raw) return raw;
    return 'A definir';
  }

  function getInitials(value) {
    return normalizeText(value || 'Doke')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toUpperCase(); })
      .join('') || 'DK';
  }

  function resolvePeer(raw, order) {
    var user = getSessionUser();
    var professionalId = raw.professionalId || raw.providerId || order.professionalId || order.providerId || '';
    var clientId = raw.clientId || order.clientId || '';
    var viewingAsProfessional = Boolean(user && user.id && String(user.id) === String(professionalId));

    if (viewingAsProfessional) {
      var clientName = raw.clientName || order.clientName || order.customerName || 'Cliente Doke';
      return {
        name: clientName,
        initials: raw.clientInitials || order.clientInitials || order.customerInitials || getInitials(clientName),
        role: 'client',
        id: clientId
      };
    }

    var professionalName = raw.peerName || raw.name || raw.professionalName || raw.providerName || order.providerName || order.provider || 'Profissional Doke';
    return {
      name: professionalName,
      initials: raw.peerInitials || raw.avatar || raw.providerInitials || order.providerInitials || getInitials(professionalName),
      role: 'professional',
      id: professionalId
    };
  }

  function normalizeMessage(raw, conversation) {
    raw = raw || {};
    var createdAt = raw.createdAt || raw.creatédAt || nowIso();
    var senderId = raw.senderId || '';
    var currentUser = getSessionUser();
    return Object.assign({}, raw, {
      id: normalizeText(raw.id) || createMessageId(),
      conversationId: normalizeText(raw.conversationId || conversation && conversation.id),
      senderId: senderId,
      author: raw.author || (currentUser && senderId === currentUser.id ? 'Você' : conversation && conversation.peerName || 'Doke'),
      text: raw.text || raw.body || '',
      body: raw.body || raw.text || '',
      type: raw.type || 'text',
      attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
      read: raw.read === true,
      mine: raw.mine === true,
      createdAt: createdAt,
      creatédAt: createdAt,
      time: raw.time || toTimeLabel(createdAt)
    });
  }

  function normalizeConversation(raw) {
    raw = raw || {};
    var order = raw.order || {};
    var id = normalizeText(raw.id) || createConversationId(order);
    var messages = Array.isArray(raw.messages) ? raw.messages : [];
    var updatedAt = raw.updatedAt || raw.createdAt || raw.creatédAt || nowIso();
    var peer = resolvePeer(raw, order);
    var peerName = peer.name;
    var peerInitials = peer.initials;
    var normalized = Object.assign({}, raw, {
      id: id,
      type: raw.type || 'order',
      orderId: raw.orderId || order.id || '',
      serviceId: raw.serviceId || order.serviceId || '',
      clientId: raw.clientId || order.clientId || '',
      professionalId: raw.professionalId || raw.providerId || order.professionalId || order.providerId || '',
      participants: Array.isArray(raw.participants) ? raw.participants : [raw.clientId || order.clientId, raw.professionalId || raw.providerId || order.professionalId || order.providerId].filter(Boolean),
      name: peerName,
      peerName: peerName,
      peerRole: peer.role,
      peerId: peer.id,
      clientName: raw.clientName || order.clientName || order.customerName || 'Cliente Doke',
      clientInitials: raw.clientInitials || order.clientInitials || order.customerInitials || getInitials(raw.clientName || order.clientName || 'Cliente Doke'),
      avatar: peerInitials,
      peerInitials: peerInitials,
      group: raw.group || 'orders',
      unread: Number(raw.unread || raw.unreadCount || 0),
      unreadCount: Number(raw.unreadCount || raw.unread || 0),
      archived: raw.archived === true,
      order: Object.assign({}, order, {
        id: raw.orderId || order.id || '',
        clientId: raw.clientId || order.clientId || '',
        clientName: raw.clientName || order.clientName || order.customerName || 'Cliente Doke',
        clientInitials: raw.clientInitials || order.clientInitials || order.customerInitials || getInitials(raw.clientName || order.clientName || 'Cliente Doke'),
        professionalId: raw.professionalId || raw.providerId || order.professionalId || order.providerId || '',
        providerName: raw.professionalName || raw.providerName || order.providerName || order.provider || 'Profissional Doke',
        title: order.title || raw.orderTitle || raw.serviceTitle || 'Pedido de serviço',
        serviceTitle: order.serviceTitle || raw.serviceTitle || raw.orderTitle || 'Pedido de serviço',
        status: order.status || raw.status || 'pending',
        statusLabel: order.statusLabel || raw.statusLabel || 'Aguardando resposta',
        budget: formatBudget(order.budget || raw.budget),
        category: order.category || raw.category || '',
        location: order.location || raw.location || ''
      }),
      messages: messages
        .filter(function (message) {
          var text = String(message && (message.text || message.body) || '');
          var type = String(message && message.type || '');
          if (type === 'system' && /Pedido aceito\. A conversa foi liberada|Pedido recusado\. Justificativa:/i.test(text)) return false;
          return true;
        })
        .map(function (message) { return normalizeMessage(message, { id: id, peerName: peerName }); }),
      createdAt: raw.createdAt || raw.creatédAt || updatedAt,
      creatédAt: raw.creatédAt || raw.createdAt || updatedAt,
      updatedAt: updatedAt,
      lastSeen: raw.lastSeen || 'Conversa do pedido'
    });
    var lastMessage = normalized.messages[normalized.messages.length - 1];
    normalized.lastMessage = raw.lastMessage || (lastMessage ? lastMessage.text || lastMessage.body : 'Conversa criada para acompanhar o pedido.');
    return normalized;
  }

  function mergeById() {
    var map = Object.create(null);
    Array.prototype.slice.call(arguments).forEach(function (items) {
      (items || []).forEach(function (item) {
        var normalized = normalizeConversation(item);
        if (!normalized.id) return;
        map[normalized.id] = Object.assign({}, map[normalized.id] || {}, normalized);
      });
    });
    return Object.keys(map)
      .map(function (id) { return map[id]; })
      .sort(function (a, b) { return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0); });
  }

  function readLocal() {
    return mergeById(safeRead(STORAGE_KEY), safeRead(LEGACY_STORAGE_KEY));
  }

  function writeLocal(items) {
    var normalized = (Array.isArray(items) ? items : []).map(normalizeConversation);
    safeWrite(STORAGE_KEY, normalized);
    safeWrite(LEGACY_STORAGE_KEY, normalized);
    cache = null;
    return clone(normalized);
  }

  function isDemoProfessional(user) {
    return Boolean(user && user.role === 'professional' && String(user.id) === 'user_profissional_demo');
  }

  function matchesCurrentUser(conversation, user) {
    if (!user || !user.id) return true;
    if ((conversation.participants || []).map(String).indexOf(String(user.id)) !== -1) return true;
    if (user.role === 'professional') {
      if (String(conversation.professionalId) === String(user.id)) return true;
      return isDemoProfessional(user) && Boolean(conversation.orderId || conversation.order && conversation.order.id);
    }
    if (user.role === 'client') return String(conversation.clientId) === String(user.id);
    return false;
  }

  function loadBase(options) {
    options = options || {};
    if (Doke.mockData && typeof Doke.mockData.load === 'function') {
      return Doke.mockData.load('messages', options);
    }

    return fetch(FALLBACK_URL, { cache: 'no-cache', credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Não foi possível carregar mensagens mockadas.');
        return response.json();
      });
  }

  function load(options) {
    options = options || {};
    if (cache && !options.fresh) return Promise.resolve(clone(cache));

    if (options.currentUser !== false) {
      cache = mergeById(readLocal());
      return Promise.resolve(clone(cache));
    }

    return loadBase(options)
      .catch(function () { return []; })
      .then(function (base) {
        cache = mergeById(Array.isArray(base) ? base : [], readLocal());
        return clone(cache);
      });
  }

  function list(filters) {
    filters = filters || {};
    var user = filters.currentUser === false ? null : getSessionUser();
    var orderId = normalizeText(filters.orderId || '');
    return load(filters).then(function (items) {
      return clone((items || []).filter(function (item) {
        if (orderId && item.orderId !== orderId) return false;
        if (filters.currentUser !== false && !matchesCurrentUser(item, user)) return false;
        return true;
      }));
    });
  }

  function listLocal(filters) {
    filters = filters || {};
    var user = filters.currentUser === false ? null : getSessionUser();
    var orderId = normalizeText(filters.orderId || '');
    return clone(readLocal().filter(function (item) {
      if (orderId && item.orderId !== orderId) return false;
      if (filters.currentUser !== false && !matchesCurrentUser(item, user)) return false;
      return true;
    }));
  }

  function getById(id) {
    var conversationId = normalizeText(id);
    if (!conversationId) return Promise.resolve(null);
    return load({ currentUser: false }).then(function (items) {
      return clone((items || []).find(function (item) { return String(item.id) === conversationId; }) || null);
    });
  }

  function save(conversation) {
    var normalized = normalizeConversation(conversation);
    var local = readLocal().filter(function (item) { return String(item.id) !== String(normalized.id); });
    local.unshift(normalized);
    writeLocal(local);
    return Promise.resolve(clone(normalized));
  }

  function createForOrder(order, options) {
    order = order || {};
    options = options || {};
    var id = options.id || createConversationId(order);
    var currentUser = getSessionUser();
    var professionalName = order.providerName || order.provider || order.professionalName || 'Profissional Doke';
    var clientName = order.clientName || currentUser && currentUser.name || 'Cliente Doke';
    var clientInitials = order.clientInitials || currentUser && (currentUser.initials || currentUser.avatarInitials) || getInitials(clientName);
    var createdAt = nowIso();
    var existing = readLocal().find(function (item) { return item.orderId && String(item.orderId) === String(order.id); });
    if (existing) return Promise.resolve(clone(existing));

    return save({
      id: id,
      type: 'order',
      orderId: order.id,
      serviceId: order.serviceId,
      clientId: order.clientId,
      clientName: clientName,
      clientInitials: clientInitials,
      professionalId: order.professionalId || order.providerId,
      participants: [order.clientId, order.professionalId || order.providerId].filter(Boolean),
      name: professionalName,
      peerName: professionalName,
      avatar: order.providerInitials || 'DK',
      peerInitials: order.providerInitials || 'DK',
      group: 'orders',
      unread: currentUser && currentUser.id !== order.clientId ? 1 : 0,
      unreadCount: currentUser && currentUser.id !== order.clientId ? 1 : 0,
      order: Object.assign({}, order, {
        status: order.status || 'pending',
        statusLabel: order.statusLabel || 'Aguardando resposta'
      }),
      messages: [],
      locked: true,
      lastMessage: 'Pedido enviado. Aguardando aceite do profissional.',
      lastSeen: 'Aguardando aceite do profissional',
      createdAt: createdAt,
      updatedAt: createdAt
    });
  }

  function updateOrderContext(order, options) {
    order = order || {};
    options = options || {};
    var orderId = normalizeText(order.id || order.orderId || '');
    if (!orderId) return Promise.resolve(null);
    var conversations = readLocal();
    var index = conversations.findIndex(function (item) { return String(item.orderId || item.order && item.order.id) === String(orderId); });
    if (index < 0) return Promise.resolve(null);

    var conversation = conversations[index];
    var status = order.status || options.status || conversation.status || conversation.order && conversation.order.status || 'pending';
    var statusLabels = {
      accepted: 'Pedido aceito',
      conversation: 'Pedido aceito',
      quoted: 'Proposta enviada',
      in_progress: 'Em andamento',
      completed: 'Concluído',
      cancelled: 'Pedido recusado',
      pending: 'Aguardando resposta'
    };
    var statusLabel = order.statusLabel || statusLabels[status] || 'Aguardando resposta';
    var updatedAt = nowIso();
    conversation.status = status;
    conversation.statusLabel = statusLabel;
    conversation.locked = !(status === 'accepted' || status === 'conversation' || status === 'responded' || status === 'quoted' || status === 'in_progress' || status === 'completed');
    conversation.order = Object.assign({}, conversation.order || {}, order, {
      status: status,
      statusLabel: statusLabel,
      refusalReason: options.reason || order.refusalReason || ''
    });
    var flowCopy = {
      accepted: 'Conversa liberada',
      conversation: 'Conversa liberada',
      quoted: 'Proposta enviada',
      in_progress: 'Atendimento em andamento',
      completed: 'Pedido concluído',
      cancelled: 'Pedido recusado'
    };
    conversation.lastSeen = flowCopy[status] || 'Aguardando aceite do profissional';
    conversation.lastMessage = flowCopy[status] || conversation.lastMessage || 'Aguardando aceite do profissional';
    conversation.updatedAt = updatedAt;

    conversations.splice(index, 1);
    conversations.unshift(conversation);
    writeLocal(conversations);
    return Promise.resolve(clone(normalizeConversation(conversation)));
  }

  function addMessage(conversationId, message) {
    var id = normalizeText(conversationId);
    var conversations = readLocal();
    var index = conversations.findIndex(function (item) { return String(item.id) === id; });
    if (index < 0) return Promise.resolve(null);
    var conversation = conversations[index];
    var createdAt = nowIso();
    var normalizedMessage = normalizeMessage(Object.assign({}, message || {}, {
      conversationId: id,
      createdAt: (message && message.createdAt) || createdAt
    }), conversation);
    conversation.messages = (conversation.messages || []).concat(normalizedMessage);
    conversation.lastMessage = normalizedMessage.text || normalizedMessage.body || conversation.lastMessage;
    conversation.updatedAt = normalizedMessage.createdAt;
    conversations.splice(index, 1);
    conversations.unshift(conversation);
    writeLocal(conversations);
    return Promise.resolve(clone(normalizedMessage));
  }

  function markAsRead(conversationId) {
    var id = normalizeText(conversationId);
    var conversations = readLocal();
    var didChange = false;
    conversations.forEach(function (conversation) {
      if (String(conversation.id) !== id) return;
      conversation.unread = 0;
      conversation.unreadCount = 0;
      (conversation.messages || []).forEach(function (message) { message.read = true; });
      didChange = true;
    });
    if (didChange) writeLocal(conversations);
    return Promise.resolve(didChange);
  }

  repositories.messages = Object.freeze({
    storageKey: STORAGE_KEY,
    legacyStorageKey: LEGACY_STORAGE_KEY,
    normalize: normalizeConversation,
    readLocal: readLocal,
    writeLocal: writeLocal,
    listLocal: listLocal,
    load: load,
    list: list,
    getById: getById,
    save: save,
    createForOrder: createForOrder,
    updateOrderContext: updateOrderContext,
    addMessage: addMessage,
    markAsRead: markAsRead,
    clearLocal: function () { writeLocal([]); }
  });
})();
