'use strict';

const {
  ORDER_STATUSES,
  normalizeStatus,
  assertTransition
} = require('./order-state-machine');

const ORDER_SELECT = [
  'id',
  'external_id',
  'client_id',
  'professional_id',
  'service_id',
  'service_version_id',
  'service_snapshot',
  'title',
  'description',
  'status',
  'city',
  'state',
  'scheduled_at',
  'metadata',
  'created_at',
  'updated_at'
].join(',');
const BUDGET_SELECT = 'id,order_id,professional_id,amount_cents,currency,description,status,valid_until,created_at,updated_at';
const SERVICE_SELECT = 'id,external_id,professional_id,status,moderation_status,approved_version_id';

const PUBLIC_ORDER_STATUSES = ORDER_STATUSES;

const FRONTEND_STATUS_BY_BACKEND = Object.freeze({
  draft: 'draft',
  requested: 'pending',
  quoted: 'quoted',
  accepted: 'accepted',
  scheduled: 'scheduled',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
  disputed: 'disputed'
});

function isInternal(actor) {
  const role = String(actor && actor.role || '').toLowerCase();
  return role === 'support' || role === 'admin' || role === 'moderator';
}

function requireSupabase(context) {
  if (!context || !context.supabase || typeof context.supabase.from !== 'function') {
    throw unavailable('Supabase user client is required for order runtime handlers.');
  }
  return context.supabase;
}

function chooseOrderSupabase(context, actor) {
  if (isInternal(actor)) {
    if (context && context.serviceSupabase && typeof context.serviceSupabase.from === 'function') {
      return context.serviceSupabase;
    }
    throw unavailable('Internal order operations require a configured server-side service-role client.');
  }
  return requireSupabase(context);
}

function requireActor(actor) {
  if (!actor || !actor.id) throw unauthorized();
  return actor;
}

function cloneJson(value) {
  if (!value || typeof value !== 'object') return value || null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

function normalizeOrder(row, options) {
  const source = row || {};
  const metadata = source.metadata && typeof source.metadata === 'object' ? source.metadata : {};
  const serviceSnapshot = source.service_snapshot && typeof source.service_snapshot === 'object'
    ? source.service_snapshot
    : metadata.serviceSnapshot && typeof metadata.serviceSnapshot === 'object'
      ? metadata.serviceSnapshot
      : null;
  const budget = options && options.budget || null;
  const amountCents = budget && Number.isFinite(Number(budget.amount_cents)) ? Number(budget.amount_cents) : null;
  return Object.freeze({
    id: source.id || '',
    clientId: source.client_id || source.clientId || '',
    professionalId: source.professional_id || source.professionalId || '',
    serviceId: source.service_id || source.serviceId || '',
    serviceVersionId: source.service_version_id || source.serviceVersionId || metadata.serviceVersionId || '',
    serviceSnapshot: cloneJson(serviceSnapshot),
    title: source.title || '',
    description: source.description || '',
    status: FRONTEND_STATUS_BY_BACKEND[source.status] || source.status || 'pending',
    backendStatus: source.status || 'requested',
    city: source.city || '',
    state: source.state || '',
    location: [source.city, source.state].filter(Boolean).join(', '),
    scheduledAt: source.scheduled_at || source.scheduledAt || '',
    metadata: cloneJson(metadata) || {},
    createdAt: source.created_at || source.createdAt || '',
    updatedAt: source.updated_at || source.updatedAt || '',
    amountCents,
    budget: budget ? normalizeBudget(budget) : null
  });
}

function normalizeBudget(row) {
  const source = row || {};
  return Object.freeze({
    id: source.id || '',
    orderId: source.order_id || '',
    professionalId: source.professional_id || '',
    amountCents: Number(source.amount_cents || 0),
    currency: source.currency || 'BRL',
    description: source.description || '',
    status: source.status || 'sent',
    validUntil: source.valid_until || '',
    createdAt: source.created_at || '',
    updatedAt: source.updated_at || ''
  });
}

async function listOrders(context, actor) {
  const safeActor = requireActor(actor);
  const supabase = chooseOrderSupabase(context, safeActor);
  let query = supabase.from('orders').select(ORDER_SELECT);
  // Participant scoping is owned by RLS. Do not narrow by the account's
  // primary role because a professional account may also be the client.
  if (context.query && context.query.status) {
    query = query.eq('status', normalizeBackendStatus(context.query.status));
  }
  if (typeof query.order === 'function') query = query.order('updated_at', { ascending: false });
  const limit = readLimit(context.query && context.query.limit);
  if (limit && typeof query.limit === 'function') query = query.limit(limit);
  const response = await query;
  if (response && response.error) throw response.error;
  const rows = Array.isArray(response && response.data) ? response.data : [];
  return { orders: rows.map((row) => normalizeOrder(row)), count: rows.length };
}

async function getOrder(context, actor, orderId) {
  const supabase = chooseOrderSupabase(context, actor);
  const row = await readOrderRow(supabase, orderId);
  assertOrderAccess(row, actor);
  const budget = await readLatestBudget(supabase, orderId).catch(() => null);
  return { order: normalizeOrder(row, { budget }) };
}

async function createOrder(context, actor) {
  const supabase = requireSupabase(context);
  const safeActor = requireActor(actor);
  const body = context.body || {};
  const serviceRef = sanitizeReference(body.serviceId || body.service_id);
  if (!serviceRef) throw badRequest('Service id is required.');

  const service = await readServiceRow(supabase, serviceRef);
  if (!service) throw notFound('Service not found.');
  if (!isOrderEligibleService(service)) {
    const error = conflict('Service is not eligible to receive new orders.');
    error.code = 'DOKE_ORDER_SERVICE_NOT_ELIGIBLE';
    throw error;
  }
  if (String(service.professional_id) === String(safeActor.id)) {
    const error = forbidden('You cannot request your own service.');
    error.code = 'DOKE_ORDER_OWN_SERVICE_FORBIDDEN';
    throw error;
  }

  const title = sanitizeText(body.title || body.serviceTitle || body.summary, 140);
  if (!title) throw badRequest('Order title is required.');

  const metadata = sanitizeOrderMetadata(body);
  if (typeof supabase.rpc !== 'function') {
    throw unavailable('Supabase RPC support is required for canonical order creation.');
  }
  const response = await supabase.rpc('create_order_command', {
    p_service_ref: serviceRef,
    p_title: title,
    p_description: sanitizeText(body.description || body.details || '', 4000) || null,
    p_city: sanitizeText(body.city || metadata.city || '', 80) || null,
    p_state: sanitizeText(body.state || metadata.state || '', 40) || null,
    p_scheduled_at: body.scheduledAt || body.scheduled_at || null,
    p_metadata: metadata,
    p_external_id: sanitizeText(body.externalId || body.external_id || body.idempotencyKey || body.idempotency_key || '', 160) || null
  });
  if (response && response.error) throw mapOrderDatabaseError(response.error);
  const order = normalizeRpcOrderRow(response && response.data);
  if (!order) throw conflict('Order creation did not return a canonical row.');
  return { order: normalizeOrder(order), status: 'created' };
}

async function acceptOrder(context, actor, orderId) {
  const supabase = requireSupabase(context);
  const order = await readOrderRow(supabase, orderId);
  assertProfessionalOrderAccess(order, actor);
  return transitionOrder(supabase, order, actor, 'accepted', 'Pedido aceito pelo profissional.', 'accept');
}

async function declineOrder(context, actor, orderId) {
  const supabase = requireSupabase(context);
  const order = await readOrderRow(supabase, orderId);
  assertProfessionalOrderAccess(order, actor);
  const note = sanitizeText(context.body && (context.body.reason || context.body.note) || 'Pedido recusado pelo profissional.', 500);
  return transitionOrder(supabase, order, actor, 'cancelled', note, 'decline');
}

async function sendQuote(context, actor, orderId) {
  const supabase = requireSupabase(context);
  const order = await readOrderRow(supabase, orderId);
  assertProfessionalOrderAccess(order, actor);
  const body = context.body || {};
  const amountCents = normalizeAmountCents(body.amountCents || body.amount_cents || body.amount || body.value);
  const payload = {
    order_id: order.id,
    professional_id: actor.id,
    amount_cents: amountCents,
    currency: String(body.currency || 'BRL').trim().toUpperCase() || 'BRL',
    description: sanitizeText(body.description || body.note || 'Orçamento enviado pelo profissional.', 1200),
    status: 'sent',
    valid_until: body.validUntil || body.valid_until || null
  };
  if (typeof supabase.rpc !== 'function') {
    throw unavailable('Supabase RPC support is required for atomic quote submission.');
  }
  const quoteResponse = await supabase.rpc('submit_order_quote_command', {
    p_order_id: order.id,
    p_expected_status: normalizeBackendStatus(order.status),
    p_amount_cents: payload.amount_cents,
    p_currency: payload.currency,
    p_description: payload.description,
    p_valid_until: payload.valid_until
  });
  if (quoteResponse && quoteResponse.error) throw mapOrderDatabaseError(quoteResponse.error);
  const result = quoteResponse && quoteResponse.data || {};
  const orderRow = result.order || null;
  const budgetRow = result.budget || null;
  if (!orderRow || !budgetRow) throw conflict('Quote command did not return its canonical projections.');
  return {
    order: normalizeOrder(orderRow, { budget: budgetRow }),
    status: 'quoted',
    previousStatus: normalizeBackendStatus(order.status),
    budget: normalizeBudget(budgetRow)
  };
}

async function sendCharge(context, actor, orderId) {
  const supabase = requireSupabase(context);
  const order = await readOrderRow(supabase, orderId);
  assertProfessionalOrderAccess(order, actor);
  const note = sanitizeText(context.body && (context.body.note || context.body.description) || 'Cobrança enviada pelo profissional.', 800);
  const update = await transitionOrder(supabase, order, actor, 'quoted', note, 'charge');
  return { ...update, charge: { orderId: order.id, status: 'sent', note } };
}

async function startOrder(context, actor, orderId) {
  const supabase = requireSupabase(context);
  const order = await readOrderRow(supabase, orderId);
  assertProfessionalOrderAccess(order, actor);
  return transitionOrder(supabase, order, actor, 'in_progress', 'Atendimento iniciado pelo profissional.', 'start');
}

async function completeOrder(context, actor, orderId) {
  const supabase = requireSupabase(context);
  const order = await readOrderRow(supabase, orderId);
  assertProfessionalOrderAccess(order, actor);
  return transitionOrder(supabase, order, actor, 'completed', 'Atendimento concluído pelo profissional.', 'complete');
}

async function updateOrderStatus(context, actor, orderId) {
  if (!isInternal(actor)) throw forbidden('Only support or admin can update order status directly.');
  const supabase = chooseOrderSupabase(context, actor);
  const order = await readOrderRow(supabase, orderId);
  const nextStatus = normalizeBackendStatus(context.body && (context.body.status || context.body.nextStatus));
  const note = sanitizeText(context.body && (context.body.note || context.body.reason) || `Status atualizado para ${nextStatus}.`, 800);
  return transitionOrder(supabase, order, actor, nextStatus, note, 'updateStatus');
}

async function readOrderRow(supabase, orderId) {
  const id = sanitizeReference(orderId);
  if (!id) throw badRequest('Order id is required.');
  let query = supabase.from('orders').select(ORDER_SELECT);
  query = isUuid(id) ? query.eq('id', id) : query.eq('external_id', id);
  const response = await query.maybeSingle();
  if (response && response.error) throw response.error;
  if (!response || !response.data) throw notFound('Order not found.');
  return response.data;
}

async function readLatestBudget(supabase, orderId) {
  let query = supabase
    .from('budgets')
    .select(BUDGET_SELECT)
    .eq('order_id', orderId);
  if (typeof query.order === 'function') query = query.order('created_at', { ascending: false });
  if (typeof query.limit === 'function') query = query.limit(1);
  const response = await query;
  if (response && response.error) throw response.error;
  const rows = Array.isArray(response && response.data) ? response.data : [];
  return rows[0] || null;
}

async function readServiceRow(supabase, serviceRef) {
  const reference = sanitizeReference(serviceRef);
  if (!reference) return null;
  let query = supabase.from('services').select(SERVICE_SELECT);
  query = isUuid(reference) ? query.eq('id', reference) : query.eq('external_id', reference);
  const response = await query.maybeSingle();
  if (response && response.error) throw response.error;
  return response && response.data || null;
}

function isOrderEligibleService(service) {
  if (!service || service.status !== 'published' || !service.approved_version_id) return false;
  return ['published', 'changes_pending_review', 'changes_required'].includes(String(service.moderation_status || '').toLowerCase());
}

function sanitizeOrderMetadata(body) {
  const source = body && body.metadata && typeof body.metadata === 'object'
    ? body.metadata
    : body && typeof body === 'object'
      ? body
      : {};
  const metadata = cloneJson(source) || {};
  delete metadata.serviceSnapshot;
  delete metadata.service_snapshot;
  delete metadata.serviceVersionId;
  delete metadata.service_version_id;
  delete metadata.serviceSnapshotAuthority;
  delete metadata.professionalId;
  delete metadata.providerId;
  return metadata;
}

async function transitionOrder(supabase, order, actor, nextStatus, note, action) {
  const backendStatus = normalizeBackendStatus(nextStatus);
  const oldStatus = normalizeBackendStatus(order && order.status || '');
  assertTransition({
    currentStatus: oldStatus,
    nextStatus: backendStatus,
    actorRole: resolveOrderCapability(order, actor) || actor && actor.role,
    action: action || 'updateStatus'
  });
  if (!supabase || typeof supabase.rpc !== 'function') {
    throw unavailable('Supabase RPC support is required for transactional order transitions.');
  }

  const response = await supabase.rpc('transition_order_status', {
    p_order_id: order.id,
    p_expected_status: oldStatus,
    p_next_status: backendStatus,
    p_action: action || 'updateStatus',
    p_note: sanitizeText(note || '', 800) || null
  });
  if (response && response.error) throw mapOrderDatabaseError(response.error);
  const row = normalizeRpcOrderRow(response && response.data);
  if (!row) throw conflict('Order changed while this transition was being processed.');
  return { order: normalizeOrder(row), status: backendStatus, previousStatus: oldStatus };
}

function normalizeRpcOrderRow(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value && typeof value === 'object' ? value : null;
}

function mapOrderDatabaseError(error) {
  const source = error || {};
  const message = String(source.message || source.details || '');
  if (message.includes('DOKE_ORDER_CONFLICT') || source.code === '40001') {
    return conflict('Order changed while this transition was being processed.');
  }
  if (message.includes('DOKE_ORDER_TRANSITION_INVALID')) {
    const mapped = conflict('Order transition is not allowed.');
    mapped.code = 'DOKE_ORDER_TRANSITION_INVALID';
    mapped.details = source.details || null;
    return mapped;
  }
  if (message.includes('DOKE_ORDER_SERVICE_SNAPSHOT_IMMUTABLE')) {
    const mapped = conflict('The service snapshot attached to this order is immutable.');
    mapped.code = 'DOKE_ORDER_SERVICE_SNAPSHOT_IMMUTABLE';
    return mapped;
  }
  if (message.includes('DOKE_ORDER_SERVICE_NOT_ELIGIBLE')) {
    const mapped = conflict('Service is not eligible to receive new orders.');
    mapped.code = 'DOKE_ORDER_SERVICE_NOT_ELIGIBLE';
    return mapped;
  }
  if (message.includes('DOKE_ORDER_OWN_SERVICE_FORBIDDEN')) {
    const mapped = forbidden('You cannot request your own service.');
    mapped.code = 'DOKE_ORDER_OWN_SERVICE_FORBIDDEN';
    return mapped;
  }
  return error;
}

function resolveOrderCapability(order, actor) {
  const safeActor = requireActor(actor);
  if (isInternal(safeActor)) return String(safeActor.role || '').toLowerCase();
  if (String(order && order.client_id || '') === String(safeActor.id)) return 'client';
  if (String(order && order.professional_id || '') === String(safeActor.id)) return 'professional';
  return '';
}

function assertOrderAccess(order, actor) {
  if (resolveOrderCapability(order, actor)) return true;
  throw forbidden('Order is outside the current user scope.');
}

function assertProfessionalOrderAccess(order, actor) {
  const safeActor = requireActor(actor);
  if (safeActor.role !== 'professional') throw forbidden('Only the assigned professional can execute this order action.');
  if (order.professional_id !== safeActor.id) throw forbidden('Order is outside the current professional scope.');
  return true;
}

function normalizeBackendStatus(value) {
  return normalizeStatus(value);
}

function sanitizeText(value, maxLength) {
  const text = String(value || '').trim();
  const limit = Number(maxLength) || 500;
  return text.length > limit ? text.slice(0, limit) : text;
}

function sanitizeReference(value) {
  return String(value || '').trim();
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sanitizeReference(value));
}

function normalizeAmountCents(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 0 && value < 100000000 && Number.isInteger(value)) return value;
    return Math.round(value * 100);
  }
  const normalized = String(value || '').replace(/[^0-9,.-]/g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) throw badRequest('A valid quote amount is required.');
  if (Number.isInteger(parsed) && parsed > 1000) return parsed;
  return Math.round(parsed * 100);
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

function conflict(message) {
  const error = new Error(message || 'Order transition conflict.');
  error.code = 'DOKE_ORDER_CONFLICT';
  error.status = 409;
  return error;
}

function unavailable(message) {
  const error = new Error(message || 'Runtime dependency unavailable.');
  error.code = 'DOKE_RUNTIME_DEPENDENCY_UNAVAILABLE';
  error.status = 503;
  return error;
}

module.exports = Object.freeze({
  PUBLIC_ORDER_STATUSES,
  normalizeOrder,
  normalizeBudget,
  normalizeBackendStatus,
  listOrders,
  getOrder,
  createOrder,
  acceptOrder,
  declineOrder,
  sendQuote,
  sendCharge,
  startOrder,
  completeOrder,
  updateOrderStatus,
  assertOrderAccess,
  assertProfessionalOrderAccess
});
