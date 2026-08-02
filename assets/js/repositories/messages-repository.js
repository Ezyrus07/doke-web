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
  var cacheAuthority = '';
  var fixtureMemory = [];
  var fixtureMemoryInitialized = false;

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

  function normalizeMessageAttachments(items, conversationId) {
    var attachmentRepository = Doke.repositories && Doke.repositories.attachments;
    var sourceItems = (Array.isArray(items) ? items : []).map(function (item) {
      if (!item || typeof item !== 'object') return item;
      return Object.assign({}, item, {
        source: 'conversation',
        resourceId: item.resourceId || item.conversationId || conversationId || ''
      });
    });
    if (attachmentRepository && typeof attachmentRepository.normalizeAll === 'function') {
      return attachmentRepository.normalizeAll(sourceItems);
    }
    return sourceItems.slice(0, 8);
  }

  function normalizeMessage(raw, conversation) {
    raw = raw || {};
    var createdAt = raw.createdAt || raw.creatédAt || nowIso();
    var senderId = raw.senderId || '';
    var currentUser = getSessionUser();
    var conversationId = normalizeText(raw.conversationId || conversation && conversation.id);
    var attachments = normalizeMessageAttachments(raw.attachments || (raw.attachment ? [raw.attachment] : []), conversationId);
    var primaryAttachment = attachments[0] || null;
    var resolvedType = raw.type || (primaryAttachment && /^image\//i.test(primaryAttachment.type || '') ? 'image' : primaryAttachment ? 'attachment' : 'text');
    return Object.assign({}, raw, {
      id: normalizeText(raw.id) || createMessageId(),
      conversationId: conversationId,
      senderId: senderId,
      author: raw.author || (currentUser && senderId === currentUser.id ? 'Você' : conversation && conversation.peerName || 'Doke'),
      text: raw.text || raw.body || '',
      body: raw.body || raw.text || '',
      type: resolvedType,
      attachments: attachments,
      attachment: primaryAttachment,
      src: raw.src || primaryAttachment && primaryAttachment.url || '',
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
    return clone(fixtureMemory);
  }

  function writeLocal(items) {
    fixtureMemory = (Array.isArray(items) ? items : []).map(normalizeConversation);
    fixtureMemoryInitialized = true;
    cache = clone(fixtureMemory);
    cacheAuthority = 'fixture-memory';
    setProviderState('fixture-memory');
    return clone(fixtureMemory);
  }

  function isDemoProfessional(user) {
    return Boolean(user && user.role === 'professional' && String(user.id) === 'user_profissional_demo');
  }

  function matchesCurrentUser(conversation, user) {
    if (!user || !user.id) return false;
    if ((conversation.participants || []).map(String).indexOf(String(user.id)) !== -1) return true;
    if (user.role === 'professional') {
      if (String(conversation.professionalId) === String(user.id)) return true;
      return isDemoProfessional(user) && Boolean(conversation.orderId || conversation.order && conversation.order.id);
    }
    if (user.role === 'client') return String(conversation.clientId) === String(user.id);
    return false;
  }

  var PROVIDER_ATTRIBUTE = 'data-doke-messages-provider';
  var REMOTE_CONVERSATIONS_TABLE = 'conversations';
  var REMOTE_MESSAGES_TABLE = 'messages';
  var supabaseClient = null;
  var supabaseClientAttempted = false;
  var lastRemoteError = null;

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizeText(value));
  }

  function getAuthorityMode() {
    var user = getSessionUser();
    return user && isUuid(user.id) ? 'remote-only' : 'fixture-memory';
  }

  function createAuthorityError(message) {
    var error = new Error(message || 'A autoridade remota de mensagens está indisponível.');
    error.code = 'DOKE_MESSAGES_REMOTE_AUTHORITY_UNAVAILABLE';
    return error;
  }

  function setProviderState(provider) {
    try { document.documentElement.setAttribute(PROVIDER_ATTRIBUTE, provider); } catch (error) {}
  }

  function warnRemote(error, context) {
    lastRemoteError = error || createAuthorityError('Falha desconhecida nas mensagens remotas.');
    var remoteOnly = getAuthorityMode() === 'remote-only';
    setProviderState(remoteOnly ? 'supabase-error' : 'fixture-memory');
    if (root.console && typeof root.console.warn === 'function') {
      root.console.warn('[Doke messages repository] Falha em ' + context + (remoteOnly ? '. Operação encerrada em fail-closed.' : '. Fixture mantida somente em memória.'), error);
    }
  }

  function getSupabaseClient() {
    if (supabaseClientAttempted) return supabaseClient;
    supabaseClientAttempted = true;
    var config = root.DOKE_SUPABASE_CONFIG || {};
    var sdk = root.supabase;
    if (!config.enabled || config.messagesEnabled === false || !config.url || !config.anonKey || !sdk || typeof sdk.createClient !== 'function') {
      setProviderState(getAuthorityMode() === 'remote-only' ? 'supabase-unavailable' : 'fixture-memory');
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

  function loadBase(options) {
    options = options || {};
    if (Doke.mockData && typeof Doke.mockData.load === 'function') return Doke.mockData.load('messages', options);
    return fetch(FALLBACK_URL, { cache: 'no-cache', credentials: 'same-origin' }).then(function (response) {
      if (!response.ok) throw new Error('Não foi possível carregar mensagens mockadas.');
      return response.json();
    });
  }

  function loadLocal(options) {
    options = options || {};
    if (cache && cacheAuthority === 'fixture-memory' && !options.fresh) return Promise.resolve(clone(cache));
    if (options.currentUser !== false) {
      cache = mergeById(readLocal());
      return Promise.resolve(clone(cache));
    }
    return loadBase(options).catch(function () { return []; }).then(function (base) {
      cache = mergeById(Array.isArray(base) ? base : [], readLocal());
      return clone(cache);
    });
  }

  function resolveRemoteOrderId(client, orderId) {
    var id = normalizeText(orderId);
    if (!id) return Promise.resolve(null);
    if (isUuid(id)) return Promise.resolve(id);
    return client.from('orders').select('id').eq('external_id', id).maybeSingle().then(function (result) {
      if (result.error) throw result.error;
      return result.data && result.data.id || null;
    });
  }

  function mapRemoteMessage(row, conversation) {
    var metadata = row && row.metadata && typeof row.metadata === 'object' ? clone(row.metadata) : {};
    return normalizeMessage(Object.assign({}, metadata, {
      id: row.external_id || metadata.id || row.id,
      remoteId: row.id,
      conversationId: conversation.id,
      senderId: row.sender_id,
      body: row.body || metadata.body || '',
      text: row.body || metadata.text || '',
      type: row.message_type || metadata.type || 'text',
      attachments: row.attachments || metadata.attachments || [],
      read: Boolean(row.read_at) || row.status === 'read',
      status: row.status,
      createdAt: row.created_at
    }), conversation);
  }

  function mapRemoteConversation(row, messageRows) {
    var metadata = row && row.metadata && typeof row.metadata === 'object' ? clone(row.metadata) : {};
    var base = Object.assign({}, metadata, {
      id: row.external_id || metadata.id || row.id,
      remoteId: row.id,
      remoteOrderId: row.order_id || '',
      clientId: row.client_id,
      professionalId: row.professional_id,
      participants: [row.client_id, row.professional_id].filter(Boolean),
      archived: row.status === 'archived',
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.last_message_at || row.created_at,
      syncStatus: 'synced'
    });
    var normalized = normalizeConversation(base);
    normalized.messages = (messageRows || []).map(function (message) { return mapRemoteMessage(message, normalized); });
    var last = normalized.messages[normalized.messages.length - 1];
    normalized.lastMessage = metadata.lastMessage || (last ? getMessagePreview(last) : normalized.lastMessage);
    return normalizeConversation(normalized);
  }

  function hydrateConversationAttachmentUrls(conversation) {
    var attachmentRepository = Doke.repositories && Doke.repositories.attachments;
    if (!conversation || !attachmentRepository || typeof attachmentRepository.resolveUrls !== 'function') return Promise.resolve(conversation);
    var messages = conversation.messages || [];
    return Promise.all(messages.map(function (message) {
      return attachmentRepository.resolveUrls(message.attachments || []).then(function (attachments) {
        return normalizeMessage(Object.assign({}, message, {
          attachments: attachments,
          attachment: attachments[0] || null,
          src: attachments[0] && attachments[0].url || message.src || ''
        }), conversation);
      }).catch(function () { return message; });
    })).then(function (hydratedMessages) {
      return normalizeConversation(Object.assign({}, conversation, { messages: hydratedMessages }));
    });
  }

  function fetchRemoteConversations() {
    var client = getSupabaseClient();
    if (!client) return Promise.reject(new Error('Supabase client unavailable.'));
    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) throw createAuthorityError('Sessão Supabase canônica indisponível para leitura de mensagens.');
      return client.from(REMOTE_CONVERSATIONS_TABLE).select('*').order('updated_at', { ascending: false }).then(function (result) {
        if (result.error) throw result.error;
        var rows = result.data || [];
        var ids = rows.map(function (row) { return row.id; });
        if (!ids.length) return [];
        return client.from(REMOTE_MESSAGES_TABLE).select('*').in('conversation_id', ids).order('created_at', { ascending: true }).then(function (messagesResult) {
          if (messagesResult.error) throw messagesResult.error;
          var grouped = Object.create(null);
          (messagesResult.data || []).forEach(function (message) {
            (grouped[message.conversation_id] || (grouped[message.conversation_id] = [])).push(message);
          });
          setProviderState('supabase');
          return Promise.all(rows.map(function (row) {
            return hydrateConversationAttachmentUrls(mapRemoteConversation(row, grouped[row.id] || []));
          }));
        });
      });
    });
  }

  function sanitizeConversationMetadata(conversation) {
    var metadata = clone(normalizeConversation(conversation));
    delete metadata.messages;
    delete metadata.remoteId;
    delete metadata.syncError;
    return metadata;
  }

  function saveRemote(conversation) {
    var client = getSupabaseClient();
    if (!client) return Promise.reject(new Error('Supabase client unavailable.'));
    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) throw new Error('Faça login com uma conta Supabase para sincronizar a conversa.');
      var normalized = normalizeConversation(conversation);
      if (!isUuid(normalized.clientId) || !isUuid(normalized.professionalId)) throw new Error('Cliente ou profissional ainda não possuem identidade Supabase válida.');
      if (user.id !== normalized.clientId && user.id !== normalized.professionalId) throw new Error('Você não participa desta conversa.');
      return resolveRemoteOrderId(client, normalized.orderId).then(function (remoteOrderId) {
        var payload = {
          external_id: normalized.id,
          order_id: remoteOrderId,
          client_id: normalized.clientId,
          professional_id: normalized.professionalId,
          status: normalized.archived ? 'archived' : 'active',
          last_message_at: normalized.updatedAt || nowIso(),
          metadata: sanitizeConversationMetadata(normalized),
          updated_at: nowIso()
        };
        return client.from(REMOTE_CONVERSATIONS_TABLE).upsert(payload, { onConflict: 'external_id' }).select('*').single().then(function (result) {
          if (result.error) throw result.error;
          var remoteConversation = result.data;
          var messages = normalized.messages || [];
          return messages.reduce(function (chain, message) {
            return chain.then(function () {
              if (!isUuid(message.senderId)) return null;
              var attachmentRepository = Doke.repositories && Doke.repositories.attachments;
              var attachmentTask = attachmentRepository && typeof attachmentRepository.syncPendingConversation === 'function'
                ? attachmentRepository.syncPendingConversation(normalized.id, message.attachments || [])
                : Promise.resolve(message.attachments || []);
              return attachmentTask.then(function (attachments) {
                var normalizedMessage = normalizeMessage(Object.assign({}, message, {
                  attachments: attachments,
                  attachment: attachments[0] || null,
                  src: attachments[0] && attachments[0].url || message.src || ''
                }), normalized);
                var persistedAttachments = attachmentRepository && typeof attachmentRepository.toPersistedMetadata === 'function'
                  ? attachmentRepository.toPersistedMetadata(normalizedMessage.attachments || [])
                  : normalizedMessage.attachments || [];
                var persistedMetadata = clone(normalizedMessage);
                persistedMetadata.attachments = persistedAttachments;
                persistedMetadata.attachment = persistedAttachments[0] || null;
                if (persistedAttachments[0] && persistedAttachments[0].path) persistedMetadata.src = '';
                var messagePayload = {
                  external_id: normalizedMessage.id,
                  conversation_id: remoteConversation.id,
                  sender_id: normalizedMessage.senderId,
                  body: normalizedMessage.body || normalizedMessage.text || '',
                  message_type: normalizedMessage.type || 'text',
                  attachments: persistedAttachments,
                  metadata: persistedMetadata,
                  status: normalizedMessage.read ? 'read' : (normalizedMessage.status || 'sent'),
                  read_at: normalizedMessage.read ? nowIso() : null,
                  created_at: normalizedMessage.createdAt || nowIso()
                };
                return client.from(REMOTE_MESSAGES_TABLE).upsert(messagePayload, { onConflict: 'external_id' }).then(function (messageResult) {
                  if (messageResult.error) throw messageResult.error;
                });
              });
            });
          }, Promise.resolve()).then(function () {
            return fetchRemoteConversations().then(function (items) {
              return items.find(function (item) { return item.id === normalized.id; }) || normalized;
            });
          });
        });
      });
    });
  }

  function saveLocal(conversation, syncStatus) {
    var normalized = normalizeConversation(Object.assign({}, conversation, { syncStatus: syncStatus || conversation.syncStatus || 'local' }));
    var local = readLocal().filter(function (item) { return String(item.id) !== String(normalized.id); });
    local.unshift(normalized);
    writeLocal(local);
    return Promise.resolve(clone(normalized));
  }

  function synchronizePending(items) {
    if (getAuthorityMode() === 'remote-only') return Promise.resolve([]);
    return Promise.resolve(clone(items || fixtureMemory));
  }

  function load(options) {
    options = options || {};
    var authority = getAuthorityMode();
    if (cache && cacheAuthority === authority && !options.fresh) return Promise.resolve(clone(cache));
    if (authority === 'fixture-memory') {
      return loadLocal(options).then(function (items) {
        cacheAuthority = 'fixture-memory';
        setProviderState('fixture-memory');
        return clone(items);
      });
    }
    if (!getSupabaseClient()) {
      var unavailable = createAuthorityError('Cliente Supabase indisponível para a sessão autenticada.');
      warnRemote(unavailable, 'bootstrap remoto');
      return Promise.reject(unavailable);
    }
    return fetchRemoteConversations().then(function (remote) {
      cache = mergeById(remote);
      cacheAuthority = 'remote-only';
      lastRemoteError = null;
      setProviderState('supabase');
      return clone(cache);
    }).catch(function (error) {
      warnRemote(error, 'leitura');
      throw error;
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
    if (getAuthorityMode() === 'remote-only') return [];
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
    return load({ currentUser: false, fresh: true }).then(function (items) {
      return clone((items || []).find(function (item) { return String(item.id) === conversationId; }) || null);
    });
  }

  function save(conversation) {
    var normalized = normalizeConversation(conversation);
    if (getAuthorityMode() === 'fixture-memory') return saveLocal(normalized, 'memory-only');
    if (!getSupabaseClient()) {
      var unavailable = createAuthorityError('Cliente Supabase indisponível para gravar a conversa autenticada.');
      warnRemote(unavailable, 'gravação');
      return Promise.reject(unavailable);
    }
    return saveRemote(normalized).then(function (remoteSaved) {
      cache = mergeById([remoteSaved], cache || []);
      cacheAuthority = 'remote-only';
      lastRemoteError = null;
      setProviderState('supabase');
      return clone(remoteSaved);
    }).catch(function (error) {
      warnRemote(error, 'gravação');
      throw error;
    });
  }

  function createForOrder(order, options) {
    order = order || {}; options = options || {};
    var existing = readLocal().find(function (item) { return item.orderId && String(item.orderId) === String(order.id); });
    if (existing) return Promise.resolve(clone(existing));
    var currentUser = getSessionUser();
    var professionalName = order.providerName || order.provider || order.professionalName || 'Profissional Doke';
    var clientName = order.clientName || currentUser && currentUser.name || 'Cliente Doke';
    var createdAt = nowIso();
    return save({
      id: options.id || createConversationId(order), type: 'order', orderId: order.id, serviceId: order.serviceId,
      clientId: order.clientId, clientName: clientName,
      clientInitials: order.clientInitials || currentUser && (currentUser.initials || currentUser.avatarInitials) || getInitials(clientName),
      professionalId: order.professionalId || order.providerId,
      participants: [order.clientId, order.professionalId || order.providerId].filter(Boolean),
      name: professionalName, peerName: professionalName, avatar: order.providerInitials || 'DK', peerInitials: order.providerInitials || 'DK',
      group: 'orders', unread: 0, unreadCount: 0,
      order: Object.assign({}, order, { status: order.status || 'pending', statusLabel: order.statusLabel || 'Aguardando resposta' }),
      messages: [], locked: true, lastMessage: 'Pedido enviado. Aguardando aceite do profissional.',
      lastSeen: 'Aguardando aceite do profissional', createdAt: createdAt, updatedAt: createdAt
    });
  }

  function updateOrderContext(order, options) {
    order = order || {}; options = options || {};
    var orderId = normalizeText(order.id || order.orderId || '');
    if (!orderId) return Promise.resolve(null);
    return load({ fresh: true }).then(function (conversations) {
      var conversation = (conversations || []).find(function (item) { return String(item.orderId || item.order && item.order.id) === orderId; });
      if (!conversation) return null;
      var status = order.status || options.status || conversation.status || conversation.order && conversation.order.status || 'pending';
      var labels = { accepted:'Pedido aceito', conversation:'Pedido aceito', quoted:'Proposta enviada', in_progress:'Em andamento', completed:'Concluído', cancelled:'Pedido recusado', pending:'Aguardando resposta' };
      conversation.status = status; conversation.statusLabel = order.statusLabel || labels[status] || 'Aguardando resposta';
      conversation.locked = ['accepted','conversation','responded','quoted','in_progress','completed'].indexOf(status) === -1;
      conversation.order = Object.assign({}, conversation.order || {}, order, { status: status, statusLabel: conversation.statusLabel, refusalReason: options.reason || order.refusalReason || '' });
      var copy = { accepted:'Conversa liberada', conversation:'Conversa liberada', quoted:'Proposta enviada', in_progress:'Atendimento em andamento', completed:'Pedido concluído', cancelled:'Pedido recusado' };
      conversation.lastSeen = copy[status] || 'Aguardando aceite do profissional';
      conversation.lastMessage = copy[status] || conversation.lastMessage || 'Aguardando aceite do profissional';
      conversation.updatedAt = nowIso();
      return save(conversation);
    });
  }

  function addMessage(conversationId, message) {
    var id = normalizeText(conversationId);
    return getById(id).then(function (conversation) {
      if (!conversation) return null;
      var normalizedMessage = normalizeMessage(Object.assign({}, message || {}, { conversationId: id, createdAt: message && message.createdAt || nowIso() }), conversation);
      conversation.messages = (conversation.messages || []).concat(normalizedMessage);
      conversation.lastMessage = getMessagePreview(normalizedMessage) || conversation.lastMessage;
      conversation.updatedAt = normalizedMessage.createdAt;
      return save(conversation).then(function () { return clone(normalizedMessage); });
    });
  }

  function getMessagePreview(message) {
    if (!message) return '';
    if (message.type === 'audio') return 'Áudio enviado';
    if (message.type === 'image') return 'Imagem enviada';
    if (message.type === 'attachment') return message.attachment && message.attachment.name ? message.attachment.name : 'Arquivo enviado';
    if (message.type === 'proposal') return message.amount ? 'Proposta ' + message.amount : 'Proposta enviada';
    if (message.type === 'charge') return message.amount ? 'Cobrança ' + message.amount : 'Cobrança enviada';
    return normalizeText(message.text || message.body || '');
  }

  function removeMessage(conversationId, messageId) {
    var id = normalizeText(conversationId), target = normalizeText(messageId);
    if (!id || !target) return Promise.resolve(false);
    return getById(id).then(function (conversation) {
      if (!conversation) return false;
      var before = conversation.messages || [];
      conversation.messages = before.filter(function (message) { return String(message && (message.id || message.messageId) || '') !== target; });
      if (conversation.messages.length === before.length) return false;
      var last = conversation.messages[conversation.messages.length - 1];
      conversation.lastMessage = getMessagePreview(last) || conversation.lastSeen || conversation.statusLabel || 'Conversa do pedido';
      conversation.updatedAt = nowIso();
      return save(conversation).then(function () {
        var client = getSupabaseClient();
        if (!client) return true;
        return client.from(REMOTE_MESSAGES_TABLE).update({ status: 'removed', body: '', metadata: {} }).eq('external_id', target).then(function () { return true; });
      });
    });
  }

  function markAsRead(conversationId) {
    var id = normalizeText(conversationId);
    return getById(id).then(function (conversation) {
      if (!conversation) return false;
      var user = getSessionUser() || {};
      conversation.unread = 0; conversation.unreadCount = 0;
      (conversation.messages || []).forEach(function (message) { if (String(message.senderId) !== String(user.id)) message.read = true; });
      return save(conversation).then(function () { return true; });
    });
  }

  repositories.messages = Object.freeze({
    storageKey: STORAGE_KEY, legacyStorageKey: LEGACY_STORAGE_KEY, normalize: normalizeConversation, normalizeMessage: normalizeMessage,
    readLocal: readLocal, writeLocal: writeLocal, listLocal: listLocal, load: load, list: list, getById: getById, save: save,
    createForOrder: createForOrder, updateOrderContext: updateOrderContext, addMessage: addMessage, removeMessage: removeMessage,
    markAsRead: markAsRead, clearLocal: function () { writeLocal([]); }, syncPending: function () { return synchronizePending(readLocal()); },
    getAuthorityStatus: function () { return Object.freeze({ authority: getAuthorityMode(), persistentLocalAuthority: false, pendingSynchronization: false }); },
    getProviderStatus: function () { var authority = getAuthorityMode(); return Object.freeze({ authority: authority, provider: authority === 'remote-only' ? (getSupabaseClient() ? 'supabase' : 'unavailable') : 'fixture-memory', fallbackActive: false, lastError: lastRemoteError ? normalizeText(lastRemoteError.message) : '' }); },
    clearCache: function () { cache = null; cacheAuthority = ''; }
  });
})();
