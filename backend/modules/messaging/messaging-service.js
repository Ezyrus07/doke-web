'use strict';

const CONVERSATION_SELECT = 'id,order_id,client_id,professional_id,status,last_message_at,created_at,messages(id,conversation_id,sender_id,body,status,created_at)';
const CONVERSATION_BASE_SELECT = 'id,order_id,client_id,professional_id,status,last_message_at,created_at';
const MESSAGE_SELECT = 'id,conversation_id,sender_id,body,status,created_at';
const ORDER_SELECT = 'id,client_id,professional_id,status,title,description,created_at,updated_at';

const PUBLIC_CONVERSATION_STATUSES = Object.freeze(['active', 'archived', 'blocked']);
const PUBLIC_MESSAGE_STATUSES = Object.freeze(['sent', 'delivered', 'read', 'removed']);

function isInternal(actor) {
  const role = String(actor && actor.role || '').toLowerCase();
  return role === 'support' || role === 'admin' || role === 'moderator';
}

function requireSupabase(context) {
  if (!context || !context.supabase || typeof context.supabase.from !== 'function') {
    throw unavailable('Supabase user client is required for messaging runtime handlers.');
  }
  return context.supabase;
}

function chooseMessagingSupabase(context, actor) {
  if (isInternal(actor)) {
    if (context && context.serviceSupabase && typeof context.serviceSupabase.from === 'function') {
      return context.serviceSupabase;
    }
    throw unavailable('Internal messaging operations require a configured server-side service-role client.');
  }
  return requireSupabase(context);
}

function requireActor(actor) {
  if (!actor || !actor.id) throw unauthorized();
  return actor;
}

function normalizeConversation(row) {
  const source = row || {};
  const messages = Array.isArray(source.messages) ? source.messages : [];
  const normalizedMessages = messages
    .map((message) => normalizeMessage(message, source))
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const lastMessage = normalizedMessages[normalizedMessages.length - 1] || null;

  return Object.freeze({
    id: source.id || '',
    orderId: source.order_id || source.orderId || '',
    clientId: source.client_id || source.clientId || '',
    professionalId: source.professional_id || source.professionalId || '',
    participants: [source.client_id || source.clientId, source.professional_id || source.professionalId].filter(Boolean),
    status: source.status || 'active',
    backendStatus: source.status || 'active',
    unread: 0,
    unreadCount: 0,
    lastMessage: lastMessage ? lastMessage.text || lastMessage.body : '',
    lastMessageAt: source.last_message_at || source.lastMessageAt || lastMessage && lastMessage.createdAt || '',
    updatedAt: source.last_message_at || source.updatedAt || source.created_at || source.createdAt || '',
    createdAt: source.created_at || source.createdAt || '',
    messages: normalizedMessages
  });
}

function normalizeMessage(row, conversation) {
  const source = row || {};
  const conversationId = source.conversation_id || source.conversationId || conversation && (conversation.id || conversation.conversation_id) || '';
  return Object.freeze({
    id: source.id || '',
    conversationId,
    senderId: source.sender_id || source.senderId || '',
    body: source.body || source.text || '',
    text: source.text || source.body || '',
    type: source.type || 'text',
    status: source.status || 'sent',
    read: source.status === 'read' || source.read === true,
    createdAt: source.created_at || source.createdAt || '',
    attachments: Array.isArray(source.attachments) ? source.attachments : []
  });
}

async function listConversations(context, actor) {
  const safeActor = requireActor(actor);
  const supabase = chooseMessagingSupabase(context, safeActor);
  let query = supabase.from('conversations').select(CONVERSATION_SELECT);

  if (!isInternal(safeActor)) {
    if (safeActor.role === 'client') query = query.eq('client_id', safeActor.id);
    if (safeActor.role === 'professional') query = query.eq('professional_id', safeActor.id);
  }

  const orderId = sanitizeNullableUuid(context.query && (context.query.orderId || context.query.order_id));
  if (orderId) query = query.eq('order_id', orderId);

  const status = normalizeOptionalConversationStatus(context.query && context.query.status);
  if (status) query = query.eq('status', status);

  if (typeof query.order === 'function') query = query.order('last_message_at', { ascending: false, nullsFirst: false });
  const limit = readLimit(context.query && context.query.limit);
  if (limit && typeof query.limit === 'function') query = query.limit(limit);

  const response = await query;
  if (response && response.error) throw response.error;
  const rows = Array.isArray(response && response.data) ? response.data : [];
  return { conversations: rows.map(normalizeConversation), count: rows.length };
}

async function getConversation(context, actor, conversationId) {
  const supabase = chooseMessagingSupabase(context, actor);
  const row = await readConversationRow(supabase, conversationId);
  assertConversationAccess(row, actor);
  return { conversation: normalizeConversation(row) };
}

async function createConversationForOrder(context, actor, orderId) {
  const safeActor = requireActor(actor);
  const supabase = chooseMessagingSupabase(context, safeActor);
  const order = await readOrderRow(supabase, orderId);
  assertOrderAccess(order, safeActor);

  if (!order.professional_id) throw badRequest('Order must have an assigned professional before creating a conversation.');

  const existing = await readConversationByOrderId(supabase, order.id).catch(() => null);
  if (existing) return { conversation: normalizeConversation(existing), status: 'existing' };

  const now = context.now || new Date().toISOString();
  const payload = {
    order_id: order.id,
    client_id: order.client_id,
    professional_id: order.professional_id,
    status: 'active',
    last_message_at: now
  };

  const response = await supabase
    .from('conversations')
    .insert(payload)
    .select(CONVERSATION_SELECT)
    .maybeSingle();
  if (response && response.error) throw response.error;
  const conversation = response && response.data;

  const initialMessage = sanitizeText(context.body && (context.body.message || context.body.initialMessage || context.body.body || context.body.text), 1200);
  if (initialMessage) {
    await insertMessage(supabase, conversation.id, safeActor.id, initialMessage, 'sent').catch(() => null);
  }

  const fullConversation = await readConversationRow(supabase, conversation && conversation.id).catch(() => conversation);
  return { conversation: normalizeConversation(fullConversation), status: 'created' };
}

async function updateConversationOrder(context, actor, conversationId) {
  const safeActor = requireActor(actor);
  const supabase = chooseMessagingSupabase(context, safeActor);
  const conversation = await readConversationRow(supabase, conversationId);
  assertConversationAccess(conversation, safeActor);

  const body = context.body || {};
  const payload = {};
  const nextOrderId = sanitizeNullableUuid(body.orderId || body.order_id || body.order && body.order.id);
  const nextStatus = normalizeOptionalConversationStatus(body.status || body.conversationStatus);

  if (nextOrderId) {
    const order = await readOrderRow(supabase, nextOrderId);
    assertOrderAccess(order, safeActor);
    if (order.client_id !== conversation.client_id || order.professional_id !== conversation.professional_id) {
      throw forbidden('Order participants do not match the current conversation.');
    }
    payload.order_id = order.id;
  }

  if (nextStatus) payload.status = nextStatus;
  if (body.touch === true || body.touchLastMessageAt === true) payload.last_message_at = context.now || new Date().toISOString();

  if (Object.keys(payload).length === 0) return { conversation: normalizeConversation(conversation), status: 'unchanged' };

  const response = await supabase
    .from('conversations')
    .update(payload)
    .eq('id', conversation.id)
    .select(CONVERSATION_SELECT)
    .maybeSingle();
  if (response && response.error) throw response.error;
  return { conversation: normalizeConversation(response && response.data), status: 'updated' };
}

async function sendMessage(context, actor, conversationId) {
  const safeActor = requireActor(actor);
  const supabase = chooseMessagingSupabase(context, safeActor);
  const conversation = await readConversationRow(supabase, conversationId);
  assertConversationAccess(conversation, safeActor);

  const body = context.body || {};
  const text = sanitizeText(body.body || body.text || body.message, 4000);
  if (!text) throw badRequest('Message body is required.');

  const message = await insertMessage(supabase, conversation.id, safeActor.id, text, 'sent');
  await supabase
    .from('conversations')
    .update({ last_message_at: message.created_at || context.now || new Date().toISOString() })
    .eq('id', conversation.id);

  return {
    message: normalizeMessage(message, conversation),
    conversationId: conversation.id,
    status: 'sent'
  };
}

async function removeMessage(context, actor, conversationId) {
  const safeActor = requireActor(actor);
  const supabase = chooseMessagingSupabase(context, safeActor);
  const conversation = await readConversationRow(supabase, conversationId);
  assertConversationAccess(conversation, safeActor);
  const messageId = sanitizeNullableUuid(context.body && (context.body.messageId || context.body.id));
  if (!messageId) throw badRequest('Message id is required.');
  const messageResponse = await supabase.from('messages').select(MESSAGE_SELECT).eq('id', messageId).eq('conversation_id', conversation.id).maybeSingle();
  if (messageResponse && messageResponse.error) throw messageResponse.error;
  const message = messageResponse && messageResponse.data;
  if (!message) throw notFound('Message not found.');
  if (!isInternal(safeActor) && message.sender_id !== safeActor.id) throw forbidden('Only the sender can remove this message.');
  if (message.status === 'removed') return { ok: true, messageId, conversationId: conversation.id, status: 'removed', alreadyRemoved: true };
  const response = await supabase.from('messages').update({ status: 'removed', body: '' }).eq('id', messageId).eq('conversation_id', conversation.id).select(MESSAGE_SELECT).maybeSingle();
  if (response && response.error) throw response.error;
  return { ok: true, message: normalizeMessage(response && response.data, conversation), messageId, conversationId: conversation.id, status: 'removed', alreadyRemoved: false };
}

async function markConversationRead(context, actor, conversationId) {
  const safeActor = requireActor(actor);
  const supabase = chooseMessagingSupabase(context, safeActor);
  const conversation = await readConversationRow(supabase, conversationId);
  assertConversationAccess(conversation, safeActor);

  let query = supabase
    .from('messages')
    .update({ status: 'read' })
    .eq('conversation_id', conversation.id);
  if (typeof query.neq === 'function') query = query.neq('sender_id', safeActor.id);
  const response = await query;
  if (response && response.error) throw response.error;

  return {
    ok: true,
    conversationId: conversation.id,
    status: 'read'
  };
}

async function readConversationRow(supabase, conversationId) {
  const id = sanitizeNullableUuid(conversationId);
  if (!id) throw badRequest('Conversation id is required.');
  const response = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (response && response.error) throw response.error;
  if (!response || !response.data) throw notFound('Conversation not found.');
  return response.data;
}

async function readConversationByOrderId(supabase, orderId) {
  const response = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('order_id', orderId)
    .maybeSingle();
  if (response && response.error) throw response.error;
  if (!response || !response.data) return null;
  return response.data;
}

async function readOrderRow(supabase, orderId) {
  const id = sanitizeNullableUuid(orderId);
  if (!id) throw badRequest('Order id is required.');
  const response = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (response && response.error) throw response.error;
  if (!response || !response.data) throw notFound('Order not found.');
  return response.data;
}

async function insertMessage(supabase, conversationId, senderId, body, status) {
  const messageStatus = normalizeMessageStatus(status || 'sent');
  const response = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: sanitizeText(body, 4000),
      status: messageStatus
    })
    .select(MESSAGE_SELECT)
    .maybeSingle();
  if (response && response.error) throw response.error;
  return response && response.data;
}

function assertConversationAccess(conversation, actor) {
  const safeActor = requireActor(actor);
  if (isInternal(safeActor)) return true;
  if (safeActor.role === 'client' && conversation.client_id === safeActor.id) return true;
  if (safeActor.role === 'professional' && conversation.professional_id === safeActor.id) return true;
  throw forbidden('Conversation is outside the current user scope.');
}

function assertOrderAccess(order, actor) {
  const safeActor = requireActor(actor);
  if (isInternal(safeActor)) return true;
  if (safeActor.role === 'client' && order.client_id === safeActor.id) return true;
  if (safeActor.role === 'professional' && order.professional_id === safeActor.id) return true;
  throw forbidden('Order is outside the current user scope.');
}

function normalizeOptionalConversationStatus(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  if (!PUBLIC_CONVERSATION_STATUSES.includes(text)) throw badRequest(`Invalid conversation status: ${value || ''}`);
  return text;
}

function normalizeMessageStatus(value) {
  const text = String(value || 'sent').trim().toLowerCase() || 'sent';
  if (!PUBLIC_MESSAGE_STATUSES.includes(text)) throw badRequest(`Invalid message status: ${value || ''}`);
  return text;
}

function sanitizeText(value, maxLength) {
  const text = String(value || '').trim();
  const limit = Number(maxLength) || 500;
  return text.length > limit ? text.slice(0, limit) : text;
}

function sanitizeNullableUuid(value) {
  const text = String(value || '').trim();
  return text || '';
}

function readLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 50;
  return Math.min(Math.round(parsed), 100);
}

function badRequest(message) {
  const error = new Error(message || 'Invalid request.');
  error.code = 'DOKE_BAD_REQUEST';
  error.status = 400;
  return error;
}

function unauthorized(message) {
  const error = new Error(message || 'Authentication required.');
  error.code = 'DOKE_UNAUTHORIZED';
  error.status = 401;
  return error;
}

function forbidden(message) {
  const error = new Error(message || 'Forbidden.');
  error.code = 'DOKE_FORBIDDEN';
  error.status = 403;
  return error;
}

function notFound(message) {
  const error = new Error(message || 'Not found.');
  error.code = 'DOKE_NOT_FOUND';
  error.status = 404;
  return error;
}

function unavailable(message) {
  const error = new Error(message || 'Runtime dependency unavailable.');
  error.code = 'DOKE_RUNTIME_DEPENDENCY_UNAVAILABLE';
  error.status = 503;
  return error;
}

module.exports = Object.freeze({
  PUBLIC_CONVERSATION_STATUSES,
  PUBLIC_MESSAGE_STATUSES,
  normalizeConversation,
  normalizeMessage,
  listConversations,
  getConversation,
  createConversationForOrder,
  updateConversationOrder,
  sendMessage,
  removeMessage,
  markConversationRead,
  assertConversationAccess,
  assertOrderAccess
});
