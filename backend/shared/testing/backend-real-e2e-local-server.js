'use strict';

const http = require('http');
const crypto = require('crypto');

const HOST = '127.0.0.1';
const IDEMPOTENCY_HEADER = 'x-idempotency-key';

function stableStringify(value) {
  if (!value || typeof value !== 'object') return JSON.stringify(value || null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function hash(value) {
  return crypto.createHash('sha256').update(stableStringify(value || {})).digest('hex');
}

function createBackendRealE2ELocalServer(options = {}) {
  const state = createState();
  const idempotency = new Map();
  const calls = [];
  let server = null;
  let origin = '';

  async function start() {
    if (server) return { origin };
    server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || '/', `http://${req.headers.host || HOST}`);
        const method = String(req.method || 'GET').toUpperCase();
        const pathName = normalize(url.pathname);
        const body = method === 'GET' ? {} : await readBody(req);
        const actor = actorFromAuth(req.headers.authorization, state);
        const idempotencyKey = readHeader(req.headers, IDEMPOTENCY_HEADER);
        calls.push({ method, path: shape(pathName), rawPath: pathName, actorRole: actor.role, hasIdempotencyKey: Boolean(idempotencyKey) });
        const response = route({ method, pathName, body, actor, req, state, idempotency });
        send(res, response.status || 200, response.body || {}, response.headers || {});
      } catch (error) {
        send(res, error.statusCode || 500, { error: { code: error.code || 'DOKE_E2E_LOCAL_SERVER_ERROR', message: error.message } });
      }
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(options.port || 0, HOST, resolve);
    });
    origin = `http://${HOST}:${server.address().port}`;
    return { origin };
  }

  async function stop() {
    if (!server) return;
    const active = server;
    server = null;
    origin = '';
    if (typeof active.closeIdleConnections === 'function') active.closeIdleConnections();
    if (typeof active.closeAllConnections === 'function') active.closeAllConnections();
    await new Promise((resolve, reject) => active.close((error) => error ? reject(error) : resolve()));
  }

  function getReport() {
    return {
      name: 'backend-real-e2e-local-server',
      origin: origin ? 'http://127.0.0.1:<redacted>' : '',
      calls: calls.slice(),
      idempotencyEntryCount: idempotency.size,
      orderCount: state.orders.length,
      conversationCount: state.conversations.length,
      notificationCount: state.notifications.length,
      withdrawalCount: state.wallet.withdrawals.length,
      receiptCount: state.wallet.receipts.length
    };
  }

  return Object.freeze({ start, stop, getReport });
}

function createState() {
  const users = {
    client: { id: 'user_client_e2e', role: 'client', email: 'client@doke.local', name: 'Cliente E2E' },
    professional: { id: 'user_professional_e2e', role: 'professional', email: 'professional@doke.local', name: 'Profissional E2E' },
    admin: { id: 'user_admin_e2e', role: 'admin', email: 'admin@doke.local', name: 'Admin E2E' }
  };
  return {
    users,
    profiles: {
      client: { id: 'profile_client_e2e', userId: users.client.id, role: 'client', displayName: 'Cliente E2E' },
      professional: { id: 'profile_professional_e2e', userId: users.professional.id, role: 'professional', displayName: 'Profissional E2E' },
      admin: { id: 'profile_admin_e2e', userId: users.admin.id, role: 'admin', displayName: 'Admin E2E' }
    },
    orders: [{ id: 'order_e2e_seeded', clientId: users.client.id, professionalId: users.professional.id, status: 'requested', title: 'Pedido seed E2E', amountCents: 0, events: ['seeded'] }],
    conversations: [],
    notifications: [],
    wallet: {
      ownerId: users.professional.id,
      availableBalance: 100000,
      pendingBalance: 0,
      transactions: [],
      withdrawals: [],
      disputes: [],
      receipts: []
    }
  };
}

function route(context) {
  const { method, pathName } = context;
  if (method === 'POST' && pathName === '/auth/login') return login(context);
  if (method === 'GET' && pathName === '/auth/session') return { body: { active: true, user: context.actor.user } };
  if (method === 'GET' && pathName === '/users/me') return { body: { user: context.actor.user } };
  if (method === 'GET' && pathName === '/profiles/me') return { body: { profile: context.actor.profile } };

  if (method === 'GET' && pathName === '/orders') return { body: { orders: visibleOrders(context.state, context.actor), items: visibleOrders(context.state, context.actor) } };
  if (method === 'POST' && pathName === '/orders') return idempotent(context, () => createOrder(context));
  const orderGet = pathName.match(/^\/orders\/([^/]+)$/);
  if (method === 'GET' && orderGet) return getOrder(context, orderGet[1]);
  const orderAction = pathName.match(/^\/orders\/([^/]+)\/(accept|decline|quote|charge|start|complete|status)$/);
  if (method === 'POST' && orderAction) return idempotent(context, () => mutateOrder(context, orderAction[1], orderAction[2]));

  if (method === 'GET' && pathName === '/conversations') return { body: { conversations: context.state.conversations } };
  const convGet = pathName.match(/^\/conversations\/([^/]+)$/);
  if (method === 'GET' && convGet) return getConversation(context, convGet[1]);
  const orderConv = pathName.match(/^\/orders\/([^/]+)\/conversation$/);
  if (method === 'POST' && orderConv) return idempotent(context, () => createConversation(context, orderConv[1]));
  const sendMessage = pathName.match(/^\/conversations\/([^/]+)\/messages$/);
  if (method === 'POST' && sendMessage) return idempotent(context, () => createMessage(context, sendMessage[1]));
  const readConv = pathName.match(/^\/conversations\/([^/]+)\/read$/);
  if (method === 'POST' && readConv) return idempotent(context, () => readConversation(context, readConv[1]));

  if (method === 'GET' && pathName === '/notifications') return { body: { notifications: context.state.notifications.filter((item) => item.userId === context.actor.user.id || context.actor.role === 'admin') } };
  if (method === 'POST' && pathName === '/notifications') return idempotent(context, () => createNotification(context));
  const notificationRead = pathName.match(/^\/notifications\/([^/]+)\/read$/);
  if (method === 'POST' && notificationRead) return idempotent(context, () => setNotification(context, notificationRead[1], { read: true }));
  if (method === 'POST' && pathName === '/notifications/read-all') return idempotent(context, () => readAllNotifications(context));

  if (method === 'GET' && pathName === '/wallet') return { body: { wallet: context.state.wallet } };
  if (method === 'GET' && pathName === '/wallet/transactions') return { body: { transactions: context.state.wallet.transactions } };
  if (method === 'POST' && pathName === '/withdrawals') return idempotent(context, () => createWithdrawal(context));
  if (method === 'GET' && pathName === '/receipts') return { body: { receipts: context.state.wallet.receipts } };

  return { status: 404, body: { error: { code: 'DOKE_E2E_ENDPOINT_NOT_FOUND', message: `${method} ${pathName}` } } };
}

function login({ body, state }) {
  const email = String(body.email || body.login || '').toLowerCase();
  const role = email.includes('admin') ? 'admin' : email.includes('professional') || email.includes('profissional') ? 'professional' : 'client';
  return { body: { token: `token-${role}`, session: { token: `token-${role}` }, user: state.users[role] } };
}

function actorFromAuth(authorization, state) {
  const token = String(authorization || '').replace(/^Bearer\s+/i, '').trim();
  const role = token.includes('admin') ? 'admin' : token.includes('professional') || token.includes('profissional') ? 'professional' : 'client';
  return { role, user: state.users[role], profile: state.profiles[role] };
}

function idempotent(context, factory) {
  const key = readHeader(context.req.headers, IDEMPOTENCY_HEADER);
  if (!key) return { status: 409, body: { error: { code: 'DOKE_IDEMPOTENCY_REQUIRED', message: 'x-idempotency-key is required.' } } };
  const signature = `${context.actor.user.id}:${context.method}:${context.pathName}:${hash(context.body)}`;
  const existing = context.idempotency.get(key);
  if (existing) {
    if (existing.signature !== signature) return { status: 409, body: { error: { code: 'DOKE_IDEMPOTENCY_CONFLICT', message: 'Same key cannot be reused with a different payload.' } } };
    return { status: existing.status, body: Object.assign({}, existing.body, { idempotency: { replay: true, key } }), headers: { 'x-doke-idempotency-replay': 'true' } };
  }
  const response = factory();
  context.idempotency.set(key, { signature, status: response.status || 200, body: response.body || {} });
  return { status: response.status || 200, body: Object.assign({}, response.body || {}, { idempotency: { replay: false, key } }) };
}

function visibleOrders(state, actor) {
  if (actor.role === 'admin') return state.orders;
  return state.orders.filter((order) => order.clientId === actor.user.id || order.professionalId === actor.user.id);
}

function getOrder(context, id) {
  const order = visibleOrders(context.state, context.actor).find((item) => item.id === id);
  return order ? { body: { order } } : { status: 404, body: { error: { code: 'DOKE_ORDER_NOT_FOUND' } } };
}

function createOrder({ state, actor, body }) {
  if (actor.role !== 'client') return { status: 403, body: { error: { code: 'DOKE_ORDER_CREATE_FORBIDDEN' } } };
  const order = { id: `order_e2e_${state.orders.length + 1}`, clientId: actor.user.id, professionalId: state.users.professional.id, status: 'requested', title: body.title || 'Pedido E2E', amountCents: Number(body.amountCents || 0), events: ['created'] };
  state.orders.push(order);
  state.notifications.push({ id: `notif_${state.notifications.length + 1}`, userId: state.users.professional.id, type: 'order_created', title: 'Novo pedido', read: false });
  return { status: 201, body: { order } };
}

function mutateOrder({ state, actor, body }, id, action) {
  if (actor.role !== 'professional') return { status: 403, body: { error: { code: 'DOKE_ORDER_ACTION_FORBIDDEN' } } };
  const order = state.orders.find((item) => item.id === id);
  if (!order) return { status: 404, body: { error: { code: 'DOKE_ORDER_NOT_FOUND' } } };
  const statusByAction = { accept: 'accepted', decline: 'declined', quote: 'quoted', charge: 'charged', start: 'in_progress', complete: 'completed', status: body.status || 'updated' };
  order.status = statusByAction[action] || order.status;
  if (action === 'quote' || action === 'charge') order.amountCents = Number(body.amountCents || order.amountCents || 0);
  order.events.push(action);
  if (action === 'charge') state.wallet.transactions.push({ id: `txn_${state.wallet.transactions.length + 1}`, orderId: order.id, type: 'charge', amountCents: order.amountCents });
  if (action === 'complete') state.wallet.receipts.push({ id: `receipt_${state.wallet.receipts.length + 1}`, orderId: order.id, amountCents: order.amountCents, type: 'order_completed' });
  state.notifications.push({ id: `notif_${state.notifications.length + 1}`, userId: order.clientId, type: `order_${action}`, title: `Pedido ${action}`, read: false });
  return { body: { order } };
}

function getConversation({ state }, id) {
  const conversation = state.conversations.find((item) => item.id === id);
  return conversation ? { body: { conversation } } : { status: 404, body: { error: { code: 'DOKE_CONVERSATION_NOT_FOUND' } } };
}

function createConversation({ state, actor }, orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return { status: 404, body: { error: { code: 'DOKE_ORDER_NOT_FOUND' } } };
  const conversation = { id: `conv_e2e_${state.conversations.length + 1}`, orderId, participants: [order.clientId, order.professionalId], messages: [], unreadBy: [order.professionalId] };
  state.conversations.push(conversation);
  return { status: 201, body: { conversation } };
}

function createMessage({ state, actor, body }, conversationId) {
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation) return { status: 404, body: { error: { code: 'DOKE_CONVERSATION_NOT_FOUND' } } };
  const message = { id: `msg_e2e_${conversation.messages.length + 1}`, conversationId, senderId: actor.user.id, body: body.body || body.text || 'Mensagem E2E' };
  conversation.messages.push(message);
  conversation.unreadBy = conversation.participants.filter((id) => id !== actor.user.id);
  return { status: 201, body: { message } };
}

function readConversation({ state, actor }, conversationId) {
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation) return { status: 404, body: { error: { code: 'DOKE_CONVERSATION_NOT_FOUND' } } };
  conversation.unreadBy = conversation.unreadBy.filter((id) => id !== actor.user.id);
  return { body: { ok: true, conversation } };
}

function createNotification({ state, actor, body }) {
  if (actor.role !== 'admin') return { status: 403, body: { error: { code: 'DOKE_NOTIFICATION_CREATE_FORBIDDEN' } } };
  const notification = { id: `notif_${state.notifications.length + 1}`, userId: body.userId || state.users.client.id, type: body.type || 'system', title: body.title || 'Notificação E2E', read: false };
  state.notifications.push(notification);
  return { status: 201, body: { notification } };
}

function setNotification({ state, actor }, id, patch) {
  const notification = state.notifications.find((item) => item.id === id && (item.userId === actor.user.id || actor.role === 'admin'));
  if (!notification) return { status: 404, body: { error: { code: 'DOKE_NOTIFICATION_NOT_FOUND' } } };
  Object.assign(notification, patch);
  return { body: { notification } };
}

function readAllNotifications({ state, actor }) {
  state.notifications.forEach((notification) => { if (notification.userId === actor.user.id || actor.role === 'admin') notification.read = true; });
  return { body: { ok: true } };
}

function createWithdrawal({ state, actor, body }) {
  if (actor.role !== 'professional') return { status: 403, body: { error: { code: 'DOKE_WITHDRAWAL_FORBIDDEN' } } };
  const withdrawal = { id: `withdrawal_${state.wallet.withdrawals.length + 1}`, ownerId: actor.user.id, amountCents: Number(body.amountCents || body.amount || 0), status: 'pending' };
  state.wallet.withdrawals.push(withdrawal);
  return { status: 201, body: { withdrawal } };
}

function normalize(pathName) { return (`/${String(pathName || '').replace(/^\/+/, '')}`).replace(/\/+$/, '') || '/'; }
function shape(pathName) {
  return pathName
    .replace(/^\/orders\/[^/]+\/conversation$/, '/orders/:id/conversation')
    .replace(/^\/orders\/[^/]+\/(accept|decline|quote|charge|start|complete|status)$/, '/orders/:id/$1')
    .replace(/^\/orders\/[^/]+$/, '/orders/:id')
    .replace(/^\/conversations\/[^/]+\/(messages|read)$/, '/conversations/:id/$1')
    .replace(/^\/conversations\/[^/]+$/, '/conversations/:id')
    .replace(/^\/notifications\/[^/]+\/read$/, '/notifications/:id/read');
}
function readHeader(headers, name) { return headers[String(name).toLowerCase()] || headers[name] || ''; }
function readBody(req) { return new Promise((resolve, reject) => { const chunks = []; req.on('data', (chunk) => chunks.push(chunk)); req.on('end', () => { const raw = Buffer.concat(chunks).toString('utf8'); if (!raw) return resolve({}); try { resolve(JSON.parse(raw)); } catch (error) { reject(Object.assign(error, { statusCode: 400 })); } }); req.on('error', reject); }); }
function send(res, status, payload, headers) { const body = JSON.stringify(payload || {}); res.writeHead(status, Object.assign({ 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) }, headers || {})); res.end(body); }

module.exports = { createBackendRealE2ELocalServer };
