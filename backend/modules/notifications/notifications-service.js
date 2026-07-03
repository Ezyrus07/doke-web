'use strict';

const NOTIFICATION_SELECT = 'id,user_id,type,title,body,data,read_at,created_at';
const PUBLIC_NOTIFICATION_TYPES = Object.freeze(['system', 'order', 'orders', 'message', 'messages', 'wallet', 'payment', 'support', 'admin', 'security']);

function isInternal(actor) {
  const role = String(actor && actor.role || '').toLowerCase();
  return role === 'support' || role === 'admin' || role === 'moderator';
}

function requireSupabase(context) {
  if (!context || !context.supabase || typeof context.supabase.from !== 'function') {
    throw unavailable('Supabase user client is required for notifications runtime handlers.');
  }
  return context.supabase;
}

function chooseNotificationsSupabase(context, actor) {
  if (isInternal(actor)) {
    if (context && context.serviceSupabase && typeof context.serviceSupabase.from === 'function') {
      return context.serviceSupabase;
    }
    throw unavailable('Internal notification operations require a configured server-side service-role client.');
  }
  return requireSupabase(context);
}

function requireActor(actor) {
  if (!actor || !actor.id) throw unauthorized();
  return actor;
}

function normalizeNotification(row) {
  const source = row || {};
  const data = normalizeData(source.data);
  const createdAt = source.created_at || source.createdAt || '';
  const readAt = source.read_at || source.readAt || data.readAt || '';
  const dismissedAt = data.dismissedAt || data.dismissed_at || '';
  const type = normalizeType(source.type || data.type || 'system');

  return Object.freeze({
    id: source.id || '',
    type,
    category: data.category || inferCategory(type),
    userId: source.user_id || source.userId || source.recipientId || '',
    recipientId: source.user_id || source.userId || source.recipientId || '',
    actorId: data.actorId || data.actor_id || '',
    actorName: data.actorName || data.actor_name || '',
    orderId: data.orderId || data.order_id || '',
    conversationId: data.conversationId || data.conversation_id || '',
    messageId: data.messageId || data.message_id || '',
    serviceId: data.serviceId || data.service_id || '',
    title: sanitizeText(source.title || data.title || 'Nova notificação', 180),
    body: sanitizeText(source.body || data.body || data.description || '', 1200),
    data,
    targetUrl: data.targetUrl || data.target_url || inferTargetUrl(data),
    actionLabel: data.actionLabel || data.action_label || inferActionLabel(type),
    eventKey: data.eventKey || data.event_key || '',
    read: Boolean(readAt),
    readAt,
    dismissed: data.dismissed === true || Boolean(dismissedAt),
    dismissedAt,
    createdAt,
    updatedAt: data.updatedAt || data.updated_at || readAt || dismissedAt || createdAt
  });
}

async function listNotifications(context, actor) {
  const safeActor = requireActor(actor);
  const supabase = chooseNotificationsSupabase(context, safeActor);
  let query = supabase.from('notifications').select(NOTIFICATION_SELECT);

  const targetUserId = sanitizeNullableUuid(context.query && (context.query.userId || context.query.user_id || context.query.recipientId));
  if (!isInternal(safeActor)) {
    query = query.eq('user_id', safeActor.id);
  } else if (targetUserId) {
    query = query.eq('user_id', targetUserId);
  }

  const type = normalizeOptionalType(context.query && context.query.type);
  if (type) query = query.eq('type', type);

  const readFilter = parseOptionalBoolean(context.query && context.query.read);
  if (readFilter === true && typeof query.not === 'function') query = query.not('read_at', 'is', null);
  if (readFilter === false && typeof query.is === 'function') query = query.is('read_at', null);

  if (typeof query.order === 'function') query = query.order('created_at', { ascending: false });
  const limit = readLimit(context.query && context.query.limit);
  if (limit && typeof query.limit === 'function') query = query.limit(limit);

  const response = await query;
  if (response && response.error) throw response.error;
  const rows = Array.isArray(response && response.data) ? response.data : [];
  const dismissedFilter = parseOptionalBoolean(context.query && context.query.dismissed);
  const notifications = rows.map(normalizeNotification).filter((notification) => {
    if (dismissedFilter === true && notification.dismissed !== true) return false;
    if (dismissedFilter === false && notification.dismissed === true) return false;
    return true;
  });

  return {
    notifications,
    count: notifications.length,
    unreadCount: notifications.filter((notification) => !notification.read && !notification.dismissed).length
  };
}

async function getNotification(context, actor, notificationId) {
  const safeActor = requireActor(actor);
  const supabase = chooseNotificationsSupabase(context, safeActor);
  const row = await readNotificationRow(supabase, notificationId);
  assertNotificationAccess(row, safeActor);
  return { notification: normalizeNotification(row) };
}

async function createNotification(context, actor) {
  const safeActor = requireActor(actor);
  if (!isInternal(safeActor)) throw forbidden('Only support or admin can create backend notifications.');
  const supabase = chooseNotificationsSupabase(context, safeActor);
  const body = context.body || {};
  const userId = sanitizeNullableUuid(body.userId || body.user_id || body.recipientId || body.recipient_id);
  const title = sanitizeText(body.title, 180);
  if (!userId) throw badRequest('Notification recipient userId is required.');
  if (!title) throw badRequest('Notification title is required.');

  const data = normalizeData(body.data);
  const payload = {
    user_id: userId,
    type: normalizeType(body.type || data.type || 'system'),
    title,
    body: sanitizeText(body.body || body.description || '', 1200) || null,
    data: buildNotificationData(body, data, safeActor, context.now)
  };

  const response = await supabase
    .from('notifications')
    .insert(payload)
    .select(NOTIFICATION_SELECT)
    .maybeSingle();
  if (response && response.error) throw response.error;
  return { notification: normalizeNotification(response && response.data), status: 'created' };
}

async function updateNotification(context, actor, notificationId) {
  const safeActor = requireActor(actor);
  if (!isInternal(safeActor)) throw forbidden('Only support or admin can update backend notifications.');
  const supabase = chooseNotificationsSupabase(context, safeActor);
  const current = await readNotificationRow(supabase, notificationId);
  const body = context.body || {};
  const currentData = normalizeData(current.data);
  const nextData = buildNotificationData(body, Object.assign({}, currentData, normalizeData(body.data)), safeActor, context.now);
  const payload = {};

  if (body.type !== undefined) payload.type = normalizeType(body.type);
  if (body.title !== undefined) payload.title = sanitizeText(body.title, 180) || current.title;
  if (body.body !== undefined || body.description !== undefined) payload.body = sanitizeText(body.body || body.description || '', 1200) || null;
  if (body.read === true || body.readAt) payload.read_at = body.readAt || context.now || new Date().toISOString();
  if (body.read === false) payload.read_at = null;
  payload.data = nextData;

  const response = await supabase
    .from('notifications')
    .update(payload)
    .eq('id', current.id)
    .select(NOTIFICATION_SELECT)
    .maybeSingle();
  if (response && response.error) throw response.error;
  return { notification: normalizeNotification(response && response.data), status: 'updated' };
}

async function markNotificationRead(context, actor, notificationId) {
  const safeActor = requireActor(actor);
  const supabase = chooseNotificationsSupabase(context, safeActor);
  const row = await readNotificationRow(supabase, notificationId);
  assertNotificationAccess(row, safeActor);
  const now = context.now || new Date().toISOString();
  const response = await supabase
    .from('notifications')
    .update({ read_at: now })
    .eq('id', row.id)
    .select(NOTIFICATION_SELECT)
    .maybeSingle();
  if (response && response.error) throw response.error;
  return { notification: normalizeNotification(response && response.data), status: 'read' };
}

async function dismissNotification(context, actor, notificationId) {
  const safeActor = requireActor(actor);
  const supabase = chooseNotificationsSupabase(context, safeActor);
  const row = await readNotificationRow(supabase, notificationId);
  assertNotificationAccess(row, safeActor);
  const now = context.now || new Date().toISOString();
  const data = Object.assign({}, normalizeData(row.data), {
    dismissed: true,
    dismissedAt: now,
    dismissedBy: safeActor.id,
    updatedAt: now
  });
  const response = await supabase
    .from('notifications')
    .update({ data, read_at: row.read_at || now })
    .eq('id', row.id)
    .select(NOTIFICATION_SELECT)
    .maybeSingle();
  if (response && response.error) throw response.error;
  return { notification: normalizeNotification(response && response.data), status: 'dismissed' };
}

async function markAllNotificationsRead(context, actor) {
  const safeActor = requireActor(actor);
  const supabase = chooseNotificationsSupabase(context, safeActor);
  const targetUserId = resolveTargetUserIdForBulkAction(context, safeActor);
  const now = context.now || new Date().toISOString();
  let query = supabase
    .from('notifications')
    .update({ read_at: now })
    .eq('user_id', targetUserId);
  if (typeof query.is === 'function') query = query.is('read_at', null);
  const response = await query;
  if (response && response.error) throw response.error;
  return { ok: true, userId: targetUserId, status: 'read', readAt: now };
}

async function readNotificationRow(supabase, notificationId) {
  const id = sanitizeNullableUuid(notificationId);
  if (!id) throw badRequest('Notification id is required.');
  const response = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (response && response.error) throw response.error;
  if (!response || !response.data) throw notFound('Notification not found.');
  return response.data;
}

function assertNotificationAccess(notification, actor) {
  const safeActor = requireActor(actor);
  if (isInternal(safeActor)) return true;
  if (notification && notification.user_id === safeActor.id) return true;
  throw forbidden('Notification is outside the current user scope.');
}

function resolveTargetUserIdForBulkAction(context, actor) {
  if (!isInternal(actor)) return actor.id;
  const explicit = sanitizeNullableUuid(context.body && (context.body.userId || context.body.user_id || context.body.recipientId)
    || context.query && (context.query.userId || context.query.user_id || context.query.recipientId));
  return explicit || actor.id;
}

function buildNotificationData(body, data, actor, now) {
  const timestamp = now || new Date().toISOString();
  const merged = Object.assign({}, data || {});
  [
    'category', 'eventKey', 'targetUrl', 'actionLabel', 'orderId', 'conversationId',
    'messageId', 'serviceId', 'actorId', 'actorName', 'receiptId', 'walletTransactionId'
  ].forEach((key) => {
    if (body[key] !== undefined && body[key] !== null && body[key] !== '') merged[key] = body[key];
  });
  if (!merged.actorId && actor && actor.id) merged.actorId = actor.id;
  if (!merged.updatedAt) merged.updatedAt = timestamp;
  if (body.dismissed === true) {
    merged.dismissed = true;
    merged.dismissedAt = body.dismissedAt || timestamp;
    merged.dismissedBy = actor && actor.id || merged.dismissedBy || '';
  }
  if (body.dismissed === false) {
    delete merged.dismissed;
    delete merged.dismissedAt;
    delete merged.dismissedBy;
  }
  return merged;
}

function normalizeData(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) return Object.assign({}, value);
  return {};
}

function normalizeType(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return raw || 'system';
}

function normalizeOptionalType(value) {
  const type = normalizeType(value);
  return type && type !== 'system' || String(value || '').trim() ? type : '';
}

function inferCategory(type) {
  const value = String(type || '').toLowerCase();
  if (value.indexOf('message') >= 0 || value.indexOf('conversation') >= 0) return 'messages';
  if (value.indexOf('order') >= 0 || value.indexOf('budget') >= 0 || value.indexOf('quote') >= 0) return 'orders';
  if (value.indexOf('wallet') >= 0 || value.indexOf('payment') >= 0 || value.indexOf('withdrawal') >= 0 || value.indexOf('receipt') >= 0) return 'wallet';
  if (value.indexOf('support') >= 0 || value.indexOf('admin') >= 0 || value.indexOf('dispute') >= 0) return 'support';
  return PUBLIC_NOTIFICATION_TYPES.includes(value) ? value : 'social';
}

function inferTargetUrl(data) {
  if (data.conversationId || data.conversation_id) return `mensagens.html?conversation=${encodeURIComponent(data.conversationId || data.conversation_id)}`;
  if (data.orderId || data.order_id) return `pedidos.html?order=${encodeURIComponent(data.orderId || data.order_id)}`;
  if (data.receiptId || data.receipt_id || data.walletTransactionId) return 'carteira.html';
  return 'notificacoes.html';
}

function inferActionLabel(type) {
  const category = inferCategory(type);
  if (category === 'messages') return 'Abrir conversa';
  if (category === 'orders') return 'Ver pedido';
  if (category === 'wallet') return 'Ver carteira';
  return 'Abrir';
}

function sanitizeText(value, maxLength) {
  const text = String(value || '').trim();
  if (!maxLength || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim();
}

function sanitizeNullableUuid(value) {
  const id = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : '';
}

function parseOptionalBoolean(value) {
  if (value === true || value === false) return value;
  const raw = String(value === undefined || value === null ? '' : value).trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'true' || raw === '1' || raw === 'yes') return true;
  if (raw === 'false' || raw === '0' || raw === 'no') return false;
  return null;
}

function readLimit(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 50;
  return Math.min(parsed, 100);
}

function badRequest(message) {
  const error = new Error(message || 'Invalid notification request.');
  error.code = 'DOKE_BAD_REQUEST';
  error.status = 400;
  return error;
}

function unauthorized() {
  const error = new Error('Authentication is required.');
  error.code = 'DOKE_UNAUTHORIZED';
  error.status = 401;
  return error;
}

function forbidden(message) {
  const error = new Error(message || 'Notification access denied.');
  error.code = 'DOKE_FORBIDDEN';
  error.status = 403;
  return error;
}

function notFound(message) {
  const error = new Error(message || 'Notification not found.');
  error.code = 'DOKE_NOT_FOUND';
  error.status = 404;
  return error;
}

function unavailable(message) {
  const error = new Error(message || 'Notification runtime unavailable.');
  error.code = 'DOKE_RUNTIME_UNAVAILABLE';
  error.status = 503;
  return error;
}

module.exports = Object.freeze({
  PUBLIC_NOTIFICATION_TYPES,
  normalizeNotification,
  listNotifications,
  getNotification,
  createNotification,
  updateNotification,
  markNotificationRead,
  dismissNotification,
  markAllNotificationsRead,
  assertNotificationAccess
});
