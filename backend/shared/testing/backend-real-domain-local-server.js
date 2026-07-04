'use strict';

const http = require('http');
const crypto = require('crypto');

const DEFAULT_HOST = '127.0.0.1';

function stableStringify(value) {
  return JSON.stringify(value || {}, Object.keys(value || {}).sort());
}

function hashPayload(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function createJsonResponse(res, status, payload, extraHeaders) {
  const body = JSON.stringify(payload || {});
  res.writeHead(status, Object.assign({
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body)
  }, extraHeaders || {}));
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function createIdempotencyStore() {
  const entries = new Map();
  return {
    apply(req, payload, responseFactory) {
      const key = req.headers['x-idempotency-key'];
      if (!key) {
        return {
          status: 400,
          body: { code: 'DOKE_IDEMPOTENCY_REQUIRED', message: 'x-idempotency-key is required for this mutation.' }
        };
      }
      const payloadHash = hashPayload(payload || {});
      if (entries.has(key)) {
        const previous = entries.get(key);
        if (previous.payloadHash !== payloadHash) {
          return {
            status: 409,
            body: { code: 'DOKE_IDEMPOTENCY_CONFLICT', message: 'Same idempotency key cannot be reused with a different payload.' }
          };
        }
        return Object.assign({}, previous.response, { headers: { 'x-doke-idempotency-replay': 'true' } });
      }
      const response = responseFactory();
      entries.set(key, { payloadHash, response });
      return response;
    },
    size() {
      return entries.size;
    }
  };
}

function startBackendRealDomainLocalServer(options = {}) {
  const state = createInitialState();
  const idempotency = createIdempotencyStore();
  const calls = [];
  const host = options.host || DEFAULT_HOST;

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || host}`);
      const pathName = url.pathname;
      const method = String(req.method || 'GET').toUpperCase();
      const body = method === 'GET' ? {} : await readBody(req);
      const actor = getActor(req.headers.authorization);
      calls.push({ method, path: pathName, actorRole: actor.role, body, idempotencyKey: req.headers['x-idempotency-key'] || '' });

      const response = routeRequest({ method, pathName, body, actor, req, state, idempotency });
      createJsonResponse(res, response.status || 200, response.body || {}, response.headers);
    } catch (error) {
      createJsonResponse(res, error.statusCode || 500, { code: error.code || 'DOKE_LOCAL_SERVER_ERROR', message: error.message });
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port || 0, host, () => {
      const address = server.address();
      resolve({
        server,
        origin: `http://${host}:${address.port}`,
        calls,
        state,
        close() {
          return new Promise((closeResolve, closeReject) => server.close((error) => error ? closeReject(error) : closeResolve()));
        }
      });
    });
  });
}

function createInitialState() {
  return {
    users: {
      client: { id: 'user_client_1', role: 'client', name: 'Cliente Canary' },
      professional: { id: 'user_professional_1', role: 'professional', name: 'Profissional Canary' },
      admin: { id: 'user_admin_1', role: 'admin', name: 'Admin Canary' }
    },
    profile: { id: 'profile_client_1', userId: 'user_client_1', name: 'Cliente Canary', city: 'Salvador' },
    conversations: [{
      id: 'conv_1',
      orderId: 'order_api_1',
      participants: ['user_client_1', 'user_professional_1'],
      unreadBy: ['user_professional_1'],
      messages: [{ id: 'msg_1', conversationId: 'conv_1', senderId: 'user_client_1', body: 'Mensagem inicial', createdAt: '2026-07-03T00:00:00.000Z' }]
    }],
    notifications: [{ id: 'notif_1', userId: 'user_client_1', type: 'order', title: 'Pedido atualizado', read: false, dismissed: false }],
    wallet: {
      ownerId: 'user_professional_1',
      availableBalance: 450,
      pendingBalance: 120,
      transactions: [{ id: 'txn_1', ownerId: 'user_professional_1', type: 'credit', amount: 450 }],
      withdrawals: [],
      disputes: [],
      receipts: [{ id: 'receipt_1', orderId: 'order_api_1', type: 'service_payment', amount: 450 }],
      bankAccount: { id: 'bank_1', ownerId: 'user_professional_1', bankName: 'Banco Canary' }
    }
  };
}

function getActor(authorization) {
  const token = String(authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (/admin/i.test(token)) return { id: 'user_admin_1', role: 'admin' };
  if (/professional|profissional/i.test(token)) return { id: 'user_professional_1', role: 'professional' };
  return { id: 'user_client_1', role: 'client' };
}

function routeRequest(context) {
  const { method, pathName } = context;

  if (method === 'POST' && pathName === '/auth/login') return { status: 200, body: { token: 'token-client', user: context.state.users.client } };
  if (method === 'GET' && pathName === '/auth/session') return { status: 200, body: { active: true, user: context.state.users.client } };
  if (method === 'GET' && pathName === '/users/me') return { status: 200, body: { user: context.state.users.client } };
  if (method === 'GET' && pathName === '/profiles/me') return { status: 200, body: { profile: context.state.profile } };

  if (pathName.startsWith('/conversations') || /^\/orders\/[^/]+\/conversation$/.test(pathName)) return routeMessaging(context);
  if (pathName.startsWith('/notifications')) return routeNotifications(context);
  if (pathName.startsWith('/wallet') || pathName.startsWith('/withdrawals') || pathName.startsWith('/disputes') || pathName.startsWith('/receipts') || pathName.startsWith('/admin/disputes')) return routeWallet(context);

  return { status: 404, body: { code: 'DOKE_ENDPOINT_NOT_FOUND', message: `No local backend canary route for ${method} ${pathName}` } };
}

function routeMessaging({ method, pathName, body, actor, req, state, idempotency }) {
  if (method === 'GET' && pathName === '/conversations') return { status: 200, body: { conversations: state.conversations } };

  const conversationMatch = pathName.match(/^\/conversations\/([^/]+)$/);
  if (method === 'GET' && conversationMatch) {
    const conversation = state.conversations.find((item) => item.id === conversationMatch[1]);
    return conversation ? { status: 200, body: { conversation } } : { status: 404, body: { code: 'DOKE_CONVERSATION_NOT_FOUND' } };
  }

  const orderConversationMatch = pathName.match(/^\/orders\/([^/]+)\/conversation$/);
  if (method === 'POST' && orderConversationMatch) {
    return idempotency.apply(req, body, () => {
      const next = { id: `conv_${state.conversations.length + 1}`, orderId: orderConversationMatch[1], participants: [actor.id, 'user_professional_1'], messages: [], unreadBy: [] };
      state.conversations.push(next);
      return { status: 201, body: { conversation: next } };
    });
  }

  const updateOrderMatch = pathName.match(/^\/conversations\/([^/]+)\/order$/);
  if (method === 'POST' && updateOrderMatch) {
    return idempotency.apply(req, body, () => {
      const conversation = state.conversations.find((item) => item.id === updateOrderMatch[1]);
      if (!conversation) return { status: 404, body: { code: 'DOKE_CONVERSATION_NOT_FOUND' } };
      conversation.orderSnapshot = body.order || body;
      return { status: 200, body: { conversation } };
    });
  }

  const sendMatch = pathName.match(/^\/conversations\/([^/]+)\/messages$/);
  if (method === 'POST' && sendMatch) {
    return idempotency.apply(req, body, () => {
      const conversation = state.conversations.find((item) => item.id === sendMatch[1]);
      if (!conversation) return { status: 404, body: { code: 'DOKE_CONVERSATION_NOT_FOUND' } };
      const message = { id: `msg_${conversation.messages.length + 1}`, conversationId: conversation.id, senderId: actor.id, body: body.body || body.text || '', createdAt: '2026-07-03T00:00:00.000Z' };
      conversation.messages.push(message);
      return { status: 201, body: { message } };
    });
  }

  const readMatch = pathName.match(/^\/conversations\/([^/]+)\/read$/);
  if (method === 'POST' && readMatch) {
    return idempotency.apply(req, body, () => {
      const conversation = state.conversations.find((item) => item.id === readMatch[1]);
      if (!conversation) return { status: 404, body: { code: 'DOKE_CONVERSATION_NOT_FOUND' } };
      conversation.unreadBy = (conversation.unreadBy || []).filter((id) => id !== actor.id);
      return { status: 200, body: { ok: true, conversationId: conversation.id } };
    });
  }

  return { status: 405, body: { code: 'DOKE_MESSAGING_METHOD_NOT_ALLOWED' } };
}

function routeNotifications({ method, pathName, body, actor, req, state, idempotency }) {
  if (method === 'GET' && pathName === '/notifications') return { status: 200, body: { notifications: state.notifications.filter((item) => !item.dismissed) } };

  const notificationMatch = pathName.match(/^\/notifications\/([^/]+)$/);
  if (method === 'GET' && notificationMatch) {
    const notification = state.notifications.find((item) => item.id === notificationMatch[1]);
    return notification ? { status: 200, body: { notification } } : { status: 404, body: { code: 'DOKE_NOTIFICATION_NOT_FOUND' } };
  }

  if (method === 'POST' && pathName === '/notifications') {
    if (actor.role !== 'admin') return { status: 403, body: { code: 'DOKE_PERMISSION_DENIED', message: 'Only admin can create synthetic notifications in this local harness.' } };
    return idempotency.apply(req, body, () => {
      const notification = Object.assign({ id: `notif_${state.notifications.length + 1}`, userId: body.userId || actor.id, read: false, dismissed: false }, body);
      state.notifications.push(notification);
      return { status: 201, body: { notification } };
    });
  }

  const readMatch = pathName.match(/^\/notifications\/([^/]+)\/read$/);
  if (method === 'POST' && readMatch) {
    return idempotency.apply(req, body, () => {
      const notification = state.notifications.find((item) => item.id === readMatch[1]);
      if (!notification) return { status: 404, body: { code: 'DOKE_NOTIFICATION_NOT_FOUND' } };
      notification.read = true;
      return { status: 200, body: { notification } };
    });
  }

  const dismissMatch = pathName.match(/^\/notifications\/([^/]+)\/dismiss$/);
  if (method === 'POST' && dismissMatch) {
    return idempotency.apply(req, body, () => {
      const notification = state.notifications.find((item) => item.id === dismissMatch[1]);
      if (!notification) return { status: 404, body: { code: 'DOKE_NOTIFICATION_NOT_FOUND' } };
      notification.dismissed = true;
      return { status: 200, body: { notification } };
    });
  }

  if (method === 'POST' && pathName === '/notifications/read-all') {
    return idempotency.apply(req, body, () => {
      state.notifications.forEach((item) => { if (item.userId === actor.id) item.read = true; });
      return { status: 200, body: { ok: true } };
    });
  }

  return { status: 405, body: { code: 'DOKE_NOTIFICATIONS_METHOD_NOT_ALLOWED' } };
}

function routeWallet({ method, pathName, body, actor, req, state, idempotency }) {
  if (method === 'GET' && pathName === '/wallet') return { status: 200, body: { wallet: state.wallet } };
  if (method === 'GET' && pathName === '/wallet/transactions') return { status: 200, body: { transactions: state.wallet.transactions } };
  if (method === 'GET' && pathName === '/wallet/dashboard') return { status: 200, body: { dashboard: { availableBalance: state.wallet.availableBalance, pendingBalance: state.wallet.pendingBalance } } };
  if (method === 'GET' && pathName === '/wallet/monthly-history') return { status: 200, body: { items: [{ month: '2026-07', amount: 450 }] } };
  if (method === 'GET' && pathName === '/wallet/receivables/schedule') return { status: 200, body: { schedule: { items: [], totalNet: state.wallet.pendingBalance } } };
  if (method === 'GET' && pathName === '/wallet/bank-account') return { status: 200, body: { bankAccount: state.wallet.bankAccount } };
  if (method === 'GET' && pathName === '/wallet/receivables') return { status: 200, body: { receivables: [] } };
  if (method === 'GET' && pathName === '/withdrawals') return { status: 200, body: { withdrawals: state.wallet.withdrawals } };
  if (method === 'GET' && pathName === '/disputes') return { status: 200, body: { disputes: state.wallet.disputes } };
  if (method === 'GET' && pathName === '/receipts') return { status: 200, body: { receipts: state.wallet.receipts } };

  const receiptMatch = pathName.match(/^\/receipts\/([^/]+)$/);
  if (method === 'GET' && receiptMatch) {
    const receipt = state.wallet.receipts.find((item) => item.id === receiptMatch[1]);
    return receipt ? { status: 200, body: { receipt } } : { status: 404, body: { code: 'DOKE_RECEIPT_NOT_FOUND' } };
  }

  if (method === 'POST' && pathName === '/wallet/bank-account') {
    return idempotency.apply(req, body, () => {
      state.wallet.bankAccount = Object.assign({ id: 'bank_2', ownerId: actor.id }, body);
      return { status: 200, body: { bankAccount: state.wallet.bankAccount } };
    });
  }

  if (method === 'POST' && pathName === '/wallet/receivables') {
    return idempotency.apply(req, body, () => ({ status: 201, body: { receivable: Object.assign({ id: 'recv_1', status: 'pending' }, body) } }));
  }

  if (method === 'POST' && pathName === '/withdrawals') {
    return idempotency.apply(req, body, () => {
      const withdrawal = Object.assign({ id: `withdrawal_${state.wallet.withdrawals.length + 1}`, ownerId: actor.id, status: 'pending' }, body);
      state.wallet.withdrawals.push(withdrawal);
      return { status: 201, body: { withdrawal } };
    });
  }

  const withdrawalAction = pathName.match(/^\/withdrawals\/([^/]+)\/(approve|decline)$/);
  if (method === 'POST' && withdrawalAction) {
    if (actor.role !== 'admin') return { status: 403, body: { code: 'DOKE_PERMISSION_DENIED' } };
    return idempotency.apply(req, body, () => {
      const withdrawal = state.wallet.withdrawals.find((item) => item.id === withdrawalAction[1]) || { id: withdrawalAction[1] };
      withdrawal.status = withdrawalAction[2] === 'approve' ? 'approved' : 'declined';
      return { status: 200, body: { withdrawal } };
    });
  }

  if (method === 'POST' && pathName === '/disputes') {
    return idempotency.apply(req, body, () => {
      const dispute = Object.assign({ id: `dispute_${state.wallet.disputes.length + 1}`, status: 'open', createdBy: actor.id }, body);
      state.wallet.disputes.push(dispute);
      return { status: 201, body: { dispute } };
    });
  }

  const disputeAction = pathName.match(/^\/(?:admin\/)?disputes\/([^/]+)\/(respond|release|refund)$/);
  if (method === 'POST' && disputeAction) {
    if ((disputeAction[2] === 'release' || disputeAction[2] === 'refund') && actor.role !== 'admin') return { status: 403, body: { code: 'DOKE_PERMISSION_DENIED' } };
    return idempotency.apply(req, body, () => {
      const dispute = state.wallet.disputes.find((item) => item.id === disputeAction[1]) || { id: disputeAction[1] };
      dispute.status = disputeAction[2] === 'respond' ? 'responded' : disputeAction[2] === 'release' ? 'released' : 'refunded';
      return { status: 200, body: { dispute } };
    });
  }

  return { status: 405, body: { code: 'DOKE_WALLET_METHOD_NOT_ALLOWED' } };
}

module.exports = {
  startBackendRealDomainLocalServer
};
