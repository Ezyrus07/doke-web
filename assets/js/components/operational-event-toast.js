/* Doke Operational Event Toast
   Responsibility: shared ephemeral feedback for new operational events.
   Owns toast queue, storage-event detection, dedupe, and target navigation.
   Does not own sidebar badges, header, shell, rail, page layout, or repositories. */
(function () {
  'use strict';

  var root = window;
  var documentRef = root.document;
  var Doke = root.Doke || (root.Doke = {});

  var NOTIFICATION_KEYS = ['doke.notifications.local.v1', 'doke.notifications'];
  var ORDER_KEYS = ['doke.orders.local.v1', 'doke.orders'];
  var MESSAGE_KEYS = ['doke.messages.local.v1', 'doke.messages'];
  var ALL_KEYS = NOTIFICATION_KEYS.concat(ORDER_KEYS, MESSAGE_KEYS);
  var MAX_VISIBLE_TOASTS = 3;
  var DEFAULT_DISMISS_MS = 6200;
  var SESSION_DIGEST_KEY = 'doke.operational.session-digest.v1';
  var SESSION_DIGEST_DELAY_MS = 420;

  var runtimeSeen = new Set();
  var sessionDigestTimer = 0;

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; }
  }

  function safeParse(raw, fallback) {
    if (!raw) return fallback;
    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function safeRead(key) {
    try { return safeParse(root.localStorage.getItem(key), []); } catch (error) { return []; }
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function compactText(value, limit) {
    var text = normalizeText(value);
    if (!limit || text.length <= limit) return text;
    return text.slice(0, Math.max(0, limit - 1)).trim() + '…';
  }

  function getCurrentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') {
      var sessionUser = Doke.session.getCurrentUser();
      if (sessionUser) return sessionUser;
    }

    try {
      var raw = root.localStorage.getItem('doke.auth.session.v1');
      var session = raw ? JSON.parse(raw) : null;
      return session && session.user ? session.user : null;
    } catch (error) {
      return null;
    }
  }

  function getCurrentUserId() {
    var user = getCurrentUser();
    return normalizeText(user && user.id);
  }

  function isDemoProfessional(user) {
    return Boolean(user && user.role === 'professional' && String(user.id) === 'user_profissional_demo');
  }

  function matchesNotificationUser(notification) {
    if (!notification || notification.read === true || notification.dismissed === true) return false;
    var user = getCurrentUser();
    var userId = normalizeText(user && user.id);
    var notificationUserId = normalizeText(notification.userId || notification.recipientId || '');
    if (!userId || !notificationUserId) return true;
    if (String(notificationUserId) === String(userId)) return true;
    if (isDemoProfessional(user) && String(notification.category || '').toLowerCase() === 'orders') return true;
    return false;
  }

  function matchesOrderUser(order) {
    if (!order) return false;
    var user = getCurrentUser();
    var userId = normalizeText(user && user.id);
    if (!userId) return true;
    if (String(order.clientId || '') === String(userId)) return true;
    if (String(order.professionalId || order.providerId || '') === String(userId)) return true;
    return isDemoProfessional(user) && Boolean(order.id);
  }

  function matchesConversationUser(conversation) {
    if (!conversation) return false;
    var user = getCurrentUser();
    var userId = normalizeText(user && user.id);
    if (!userId) return true;
    var participants = Array.isArray(conversation.participants) ? conversation.participants.map(String) : [];
    if (participants.indexOf(String(userId)) !== -1) return true;
    if (String(conversation.clientId || '') === String(userId)) return true;
    if (String(conversation.professionalId || conversation.providerId || '') === String(userId)) return true;
    return isDemoProfessional(user) && Boolean(conversation.orderId || conversation.order && conversation.order.id);
  }


  function isProfessionalSessionUser(user) {
    return Boolean(user && String(user.role || user.type || '').toLowerCase() === 'professional');
  }

  function isOpenOrder(order) {
    var status = String(order && order.status || 'pending').toLowerCase();
    return ['completed', 'cancelled', 'canceled', 'declined', 'rejected'].indexOf(status) === -1;
  }

  function isMessageNotification(notification) {
    var raw = String(notification && (notification.category || notification.type || '') || '').toLowerCase();
    return raw.indexOf('message') !== -1 || raw.indexOf('conversa') !== -1 || raw.indexOf('chat') !== -1;
  }

  function getSessionDigestCounts() {
    var orders = safeRead('doke.orders.local.v1').filter(function (order) {
      return isOpenOrder(order) && matchesOrderUser(order);
    }).length;

    var notifications = safeRead('doke.notifications.local.v1').filter(function (notification) {
      return matchesNotificationUser(notification);
    });

    var messages = notifications.filter(isMessageNotification).length;

    return {
      orders: orders,
      messages: messages,
      notifications: notifications.length
    };
  }

  function pluralizeCount(count, singular, plural) {
    var value = Math.max(0, Number(count) || 0);
    return value + ' ' + (value === 1 ? singular : plural);
  }

  function joinSegments(segments) {
    if (!segments.length) return '';
    if (segments.length === 1) return segments[0];
    if (segments.length === 2) return segments[0] + ' e ' + segments[1];
    return segments.slice(0, -1).join(', ') + ' e ' + segments[segments.length - 1];
  }

  function buildSessionDigestEvent(user, counts) {
    var segments = [];
    if (counts.orders > 0) segments.push(pluralizeCount(counts.orders, 'pedido', 'pedidos'));
    if (counts.messages > 0) segments.push(pluralizeCount(counts.messages, 'mensagem', 'mensagens'));
    if (counts.notifications > 0) segments.push(pluralizeCount(counts.notifications, 'notificação', 'notificações'));
    if (!segments.length) return null;

    var targetUrl = counts.orders > 0 ? 'pedidos.html' : counts.messages > 0 ? 'mensagens.html' : 'notificacoes.html';
    var category = counts.orders > 0 ? 'orders' : counts.messages > 0 ? 'messages' : 'notifications';
    var summary = joinSegments(segments);

    return {
      id: 'session-digest-' + normalizeText(user && user.id || 'professional'),
      eventKey: ['session_digest', normalizeText(user && user.id || 'professional'), counts.orders, counts.messages, counts.notifications].join(':'),
      type: 'session_digest',
      status: '',
      category: category,
      title: 'Você tem atualizações pendentes',
      body: summary.charAt(0).toUpperCase() + summary.slice(1) + ' aguardam sua atenção.',
      orderId: '',
      conversationId: '',
      messageId: '',
      targetUrl: targetUrl,
      actionLabel: 'Ver agora',
      createdAt: '',
      raw: { user: clone(user), counts: clone(counts) }
    };
  }

  function getStoredSessionDigestSignature() {
    try { return root.sessionStorage.getItem(SESSION_DIGEST_KEY) || ''; } catch (error) { return ''; }
  }

  function setStoredSessionDigestSignature(signature) {
    try { root.sessionStorage.setItem(SESSION_DIGEST_KEY, signature); } catch (error) {}
  }

  function shouldRenderSessionDigestInSidebar() {
    try {
      if (!root.matchMedia || !root.matchMedia('(min-width: 1025px)').matches) return false;
      return Boolean(documentRef.querySelector('.app-shell > .sidebar [data-sidebar-quick-panel]'));
    } catch (error) {
      return false;
    }
  }

  function shouldUseSidebarQuickAlert(event) {
    try {
      if (!event || ['orders', 'messages', 'notifications'].indexOf(event.category) === -1) return false;
      if (!root.matchMedia || !root.matchMedia('(min-width: 1025px)').matches) return false;
      return Boolean(documentRef.querySelector('.app-shell > .sidebar [data-sidebar-quick-chip]:not([hidden])'));
    } catch (error) {
      return false;
    }
  }

  function showSessionDigest() {
    var user = getCurrentUser();
    if (!isProfessionalSessionUser(user)) return null;

    var counts = getSessionDigestCounts();
    var event = buildSessionDigestEvent(user, counts);
    if (!event) return null;

    var signature = event.eventKey;
    if (getStoredSessionDigestSignature() === signature) return null;
    setStoredSessionDigestSignature(signature);

    if (shouldRenderSessionDigestInSidebar()) return null;
    return renderToast(event);
  }

  function scheduleSessionDigest() {
    root.clearTimeout(sessionDigestTimer);
    sessionDigestTimer = root.setTimeout(showSessionDigest, SESSION_DIGEST_DELAY_MS);
  }

  function getNotificationCategory(notification) {
    var raw = String(notification && (notification.category || notification.type) || '').toLowerCase();
    if (raw.indexOf('message') !== -1) return 'messages';
    if (raw.indexOf('order') !== -1 || raw.indexOf('budget') !== -1 || raw.indexOf('proposal') !== -1 || raw.indexOf('status') !== -1) return 'orders';
    return 'notifications';
  }

  function getTargetUrl(event) {
    if (!event) return '';
    if (event.targetUrl) return event.targetUrl;
    if (event.conversationId) return 'mensagens.html?conversation=' + encodeURIComponent(event.conversationId);
    if (event.orderId) return 'pedidos.html?order=' + encodeURIComponent(event.orderId);
    if (event.category === 'messages') return 'mensagens.html';
    if (event.category === 'orders') return 'pedidos.html';
    return 'notificacoes.html';
  }

  function getActionLabel(event) {
    if (event && event.actionLabel) return event.actionLabel;
    if (event && event.category === 'messages') return 'Abrir conversa';
    if (event && event.category === 'orders') return 'Ver pedido';
    return 'Ver aviso';
  }

  function normalizeNotification(notification) {
    if (!notification || !matchesNotificationUser(notification)) return null;
    var category = getNotificationCategory(notification);
    return {
      id: normalizeText(notification.id || ''),
      eventKey: normalizeText(notification.eventKey || notification.dedupeKey || ''),
      type: normalizeText(notification.type || category),
      status: normalizeText(notification.status || ''),
      category: category,
      title: normalizeText(notification.title || (category === 'messages' ? 'Nova mensagem' : category === 'orders' ? 'Atualização de pedido' : 'Nova notificação')),
      body: normalizeText(notification.body || notification.description || 'Há uma nova atualização no Doke.'),
      orderId: normalizeText(notification.orderId || ''),
      conversationId: normalizeText(notification.conversationId || ''),
      messageId: normalizeText(notification.messageId || ''),
      targetUrl: getTargetUrl(notification),
      actionLabel: getActionLabel(notification),
      createdAt: normalizeText(notification.createdAt || notification.updatedAt || ''),
      raw: clone(notification)
    };
  }

  function normalizeOrderEvent(order, status) {
    if (!order || !matchesOrderUser(order)) return null;
    var userId = getCurrentUserId();
    if (userId && String(order.clientId || '') === String(userId) && !status) return null;
    var normalizedStatus = normalizeText(status || order.status || 'pending');
    var title = normalizedStatus && normalizedStatus !== 'pending' ? 'Status do pedido atualizado' : 'Novo pedido recebido';
    var body = (order.clientName || 'Cliente') + ' solicitou orçamento para ' + (order.serviceTitle || order.title || 'um serviço') + '.';
    var targetUrl = 'pedidos.html?order=' + encodeURIComponent(order.id || '');
    var actionLabel = 'Ver pedido';

    if (normalizedStatus === 'accepted' || normalizedStatus === 'conversation') {
      title = 'Pedido aceito';
      body = 'A conversa do pedido "' + (order.serviceTitle || order.title || 'Pedido') + '" foi liberada.';
      targetUrl = 'mensagens.html?order=' + encodeURIComponent(order.id || '');
      actionLabel = 'Abrir conversa';
    } else if (normalizedStatus === 'quoted') {
      title = 'Proposta enviada';
      body = 'Uma proposta foi enviada para "' + (order.serviceTitle || order.title || 'Pedido') + '".';
      targetUrl = 'mensagens.html?order=' + encodeURIComponent(order.id || '');
      actionLabel = 'Abrir conversa';
    } else if (normalizedStatus === 'in_progress') {
      title = 'Pagamento confirmado';
      body = 'O atendimento de "' + (order.serviceTitle || order.title || 'Pedido') + '" foi liberado.';
      targetUrl = 'mensagens.html?order=' + encodeURIComponent(order.id || '');
      actionLabel = 'Abrir conversa';
    } else if (normalizedStatus === 'completed') {
      title = 'Pedido concluído';
      body = 'O pedido "' + (order.serviceTitle || order.title || 'Pedido') + '" foi concluído.';
    } else if (normalizedStatus === 'cancelled') {
      title = 'Pedido recusado';
      body = 'O pedido "' + (order.serviceTitle || order.title || 'Pedido') + '" foi recusado.';
    }

    return {
      id: normalizeText(order.id || ''),
      eventKey: ['order', normalizedStatus || 'created', order.id || ''].filter(Boolean).join(':'),
      type: normalizedStatus && normalizedStatus !== 'pending' ? 'order_status_changed' : 'order_created',
      status: normalizedStatus,
      category: 'orders',
      title: title,
      body: body,
      orderId: normalizeText(order.id || ''),
      conversationId: normalizeText(order.conversationId || ''),
      messageId: '',
      targetUrl: targetUrl,
      actionLabel: actionLabel,
      createdAt: normalizeText(order.updatedAt || order.createdAt || ''),
      raw: clone(order)
    };
  }

  function normalizeMessageEvent(conversation, message) {
    if (!conversation || !message || !matchesConversationUser(conversation)) return null;
    var userId = getCurrentUserId();
    var senderId = normalizeText(message.senderId || message.authorId || '');
    if (userId && senderId && String(senderId) === String(userId)) return null;
    if (message.mine === true) return null;

    var text = normalizeText(message.text || message.body || 'Nova atualização na conversa.');
    if (!text && message.type === 'image') text = 'Enviou uma imagem.';
    if (!text && message.type === 'audio') text = 'Enviou um áudio.';
    if (!text && message.type === 'charge') text = 'Enviou uma cobrança.';
    var peerName = normalizeText(message.author || conversation.peerName || conversation.name || 'Contato');
    var orderTitle = normalizeText(conversation.order && (conversation.order.serviceTitle || conversation.order.title) || conversation.serviceTitle || 'um pedido');

    return {
      id: normalizeText(message.id || message.messageId || ''),
      eventKey: ['message_received', message.id || message.createdAt || '', conversation.id || ''].filter(Boolean).join(':'),
      type: 'message_received',
      status: '',
      category: 'messages',
      title: 'Nova mensagem',
      body: peerName + ' sobre ' + orderTitle + ': "' + compactText(text, 90) + '"',
      orderId: normalizeText(conversation.orderId || conversation.order && conversation.order.id || ''),
      conversationId: normalizeText(conversation.id || ''),
      messageId: normalizeText(message.id || message.messageId || ''),
      targetUrl: 'mensagens.html?order=' + encodeURIComponent(conversation.orderId || '') + (conversation.id ? '&conversation=' + encodeURIComponent(conversation.id) : ''),
      actionLabel: 'Abrir conversa',
      createdAt: normalizeText(message.createdAt || conversation.updatedAt || ''),
      raw: { conversation: clone(conversation), message: clone(message) }
    };
  }

  function normalizeFromDocumentEvent(eventName, detail) {
    detail = detail || {};
    if (detail.notification) return normalizeNotification(detail.notification);

    if (eventName === 'doke:notification-created') return normalizeNotification(detail.notification || detail);
    if (eventName === 'doke:order-created') return normalizeOrderEvent(detail.order, 'pending');
    if (eventName === 'doke:order-status-changed') return normalizeOrderEvent(detail.order, detail.status || detail.order && detail.order.status);
    if (eventName === 'doke:message-sent') return normalizeMessageEvent(detail.conversation, detail.message);
    return null;
  }

  function getEventAliases(event) {
    var aliases = [];
    if (!event) return aliases;
    if (event.id) aliases.push('id:' + event.category + ':' + event.id);
    if (event.eventKey) aliases.push('event:' + event.eventKey);
    if (event.orderId && event.type) {
      aliases.push('order:' + event.type + ':' + event.orderId);
      aliases.push('order:' + event.type + ':' + (event.status || '') + ':' + event.orderId);
    }
    if (event.messageId) aliases.push('message:' + event.messageId);
    if (event.conversationId && event.type) aliases.push('conversation:' + event.type + ':' + event.conversationId);
    if (!aliases.length) aliases.push('fallback:' + [event.category, event.title, event.body, event.createdAt].join(':'));
    return aliases;
  }

  function hasSeen(event) {
    return getEventAliases(event).some(function (alias) { return runtimeSeen.has(alias); });
  }

  function markSeen(event) {
    getEventAliases(event).forEach(function (alias) { runtimeSeen.add(alias); });
  }

  function primeCurrentStorage() {
    NOTIFICATION_KEYS.forEach(function (key) {
      safeRead(key).forEach(function (item) {
        var event = normalizeNotification(item);
        if (event) markSeen(event);
      });
    });

    ORDER_KEYS.forEach(function (key) {
      safeRead(key).forEach(function (item) {
        var event = normalizeOrderEvent(item, item && item.status);
        if (event) markSeen(event);
      });
    });

    MESSAGE_KEYS.forEach(function (key) {
      safeRead(key).forEach(function (conversation) {
        (conversation.messages || []).forEach(function (message) {
          var event = normalizeMessageEvent(conversation, message);
          if (event) markSeen(event);
        });
      });
    });
  }

  function getIconSvg(category) {
    if (category === 'messages') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v10H8l-4 4V6z"></path><path d="M8 10h8"></path></svg>';
    }
    if (category === 'orders') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v3H7z"></path><path d="M6 7h12v13H6z"></path><path d="M9 12h6"></path><path d="M9 15h4"></path></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.75a4 4 0 0 0-4 4v2.1c0 .7-.24 1.38-.68 1.92L5.9 14.5h12.2l-1.42-1.73a3 3 0 0 1-.68-1.92v-2.1a4 4 0 0 0-4-4Z"></path><path d="M10 17.2a2.3 2.3 0 0 0 4 0"></path></svg>';
  }

  function ensureRegion() {
    var region = documentRef.querySelector('[data-doke-event-toast-region]');
    if (region) return region;

    region = documentRef.createElement('div');
    region.className = 'doke-event-toast-region';
    region.setAttribute('data-doke-event-toast-region', 'true');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'false');
    documentRef.body.appendChild(region);
    return region;
  }

  function navigateTo(targetUrl) {
    var target = normalizeText(targetUrl);
    if (!target) return;
    if (typeof root.DokeNavigate === 'function') {
      root.DokeNavigate(target);
      return;
    }
    root.location.href = target;
  }

  function removeToast(toast) {
    if (!toast || toast.dataset.removing === 'true') return;
    toast.dataset.removing = 'true';
    toast.classList.add('is-leaving');
    root.setTimeout(function () { toast.remove(); }, 220);
  }

  function renderToast(event) {
    if (!documentRef.body || !event || hasSeen(event)) return null;
    markSeen(event);

    if (typeof Doke.syncOperationalBadges === 'function') Doke.syncOperationalBadges();
    if (shouldUseSidebarQuickAlert(event)) return null;

    var region = ensureRegion();
    var toast = documentRef.createElement(event.targetUrl ? 'button' : 'div');
    toast.className = 'doke-event-toast doke-event-toast--' + event.category;
    toast.setAttribute('data-operational-event-toast', 'true');
    toast.setAttribute('data-toast-category', event.category);
    toast.setAttribute('role', event.targetUrl ? 'button' : 'status');
    if (event.targetUrl) {
      toast.type = 'button';
      toast.setAttribute('aria-label', event.title + '. ' + getActionLabel(event));
      toast.addEventListener('click', function () { navigateTo(event.targetUrl); });
    }

    var icon = documentRef.createElement('span');
    icon.className = 'doke-event-toast__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = getIconSvg(event.category);

    var copy = documentRef.createElement('span');
    copy.className = 'doke-event-toast__copy';

    var title = documentRef.createElement('strong');
    title.textContent = event.title || 'Nova atualização';

    var body = documentRef.createElement('span');
    body.textContent = event.body || 'Há uma nova atualização no Doke.';

    copy.append(title, body);

    var action = documentRef.createElement('span');
    action.className = 'doke-event-toast__action';
    action.textContent = getActionLabel(event);

    toast.append(icon, copy, action);
    region.prepend(toast);

    Array.prototype.slice.call(region.querySelectorAll('[data-operational-event-toast]'))
      .slice(MAX_VISIBLE_TOASTS)
      .forEach(removeToast);

    root.setTimeout(function () { removeToast(toast); }, DEFAULT_DISMISS_MS);
    return toast;
  }

  function itemKey(item) {
    return normalizeText(item && (item.id || item.eventKey || item.createdAt || item.updatedAt || JSON.stringify(item).slice(0, 120)));
  }

  function mapByKey(items) {
    var map = Object.create(null);
    (items || []).forEach(function (item) {
      var key = itemKey(item);
      if (key) map[key] = item;
    });
    return map;
  }

  function getNewItems(oldValue, newValue) {
    var oldItems = safeParse(oldValue, []);
    var newItems = safeParse(newValue, []);
    var oldMap = mapByKey(oldItems);
    return newItems.filter(function (item) {
      var key = itemKey(item);
      return key && !oldMap[key];
    });
  }

  function getMessageKey(conversation, message) {
    return [conversation && conversation.id || '', message && (message.id || message.createdAt || message.text || message.body) || ''].join(':');
  }

  function mapMessages(items) {
    var map = Object.create(null);
    (items || []).forEach(function (conversation) {
      (conversation.messages || []).forEach(function (message) {
        map[getMessageKey(conversation, message)] = { conversation: conversation, message: message };
      });
    });
    return map;
  }

  function handleNotificationStorage(event) {
    getNewItems(event.oldValue, event.newValue).forEach(function (item) {
      var normalized = normalizeNotification(item);
      if (normalized) renderToast(normalized);
    });
  }

  function handleOrderStorage(event) {
    getNewItems(event.oldValue, event.newValue).forEach(function (order) {
      var normalized = normalizeOrderEvent(order, order && order.status);
      if (normalized) renderToast(normalized);
    });
  }

  function handleMessageStorage(event) {
    var previous = mapMessages(safeParse(event.oldValue, []));
    var next = mapMessages(safeParse(event.newValue, []));
    Object.keys(next).forEach(function (key) {
      if (previous[key]) return;
      var normalized = normalizeMessageEvent(next[key].conversation, next[key].message);
      if (normalized) renderToast(normalized);
    });
  }

  function handleStorage(event) {
    if (!event || ALL_KEYS.indexOf(event.key) === -1) return;
    if (typeof Doke.syncOperationalBadges === 'function') Doke.syncOperationalBadges();
    if (NOTIFICATION_KEYS.indexOf(event.key) !== -1) return handleNotificationStorage(event);
    if (ORDER_KEYS.indexOf(event.key) !== -1) return handleOrderStorage(event);
    if (MESSAGE_KEYS.indexOf(event.key) !== -1) return handleMessageStorage(event);
  }

  function bindDocumentEvent(eventName) {
    documentRef.addEventListener(eventName, function (event) {
      var normalized = normalizeFromDocumentEvent(eventName, event.detail || {});
      if (normalized) renderToast(normalized);
    });
  }

  function init() {
    primeCurrentStorage();
    ['doke:notification-created', 'doke:message-sent', 'doke:order-created', 'doke:order-status-changed'].forEach(bindDocumentEvent);
    ['doke:auth-session-change', 'doke:auth-surface-ready'].forEach(function (eventName) {
      documentRef.addEventListener(eventName, scheduleSessionDigest);
    });
    root.addEventListener('storage', function (event) {
      handleStorage(event);
      if (event && (event.key === 'doke.auth.session.v1' || ALL_KEYS.indexOf(event.key) !== -1)) scheduleSessionDigest();
    });
    if (documentRef.readyState === 'loading') {
      documentRef.addEventListener('DOMContentLoaded', scheduleSessionDigest, { once: true });
    } else {
      scheduleSessionDigest();
    }
  }

  Doke.operationalEventToast = Object.freeze({
    notify: function (detail, options) {
      var normalized = options && options.normalized ? detail : normalizeNotification(detail && detail.notification || detail || {});
      if (normalized) return renderToast(normalized);
      return null;
    },
    notifyEvent: function (eventName, detail) {
      var normalized = normalizeFromDocumentEvent(eventName, detail || {});
      if (normalized) return renderToast(normalized);
      return null;
    },
    syncFromStorage: handleStorage,
    showSessionDigest: showSessionDigest,
    scheduleSessionDigest: scheduleSessionDigest,
    prime: primeCurrentStorage
  });

  init();
})();
