'use strict';

const http = require('http');
const crypto = require('crypto');
const { STAGING_E2E_DEFAULT_USERS } = require('./staging-e2e-scenarios');
const { IDEMPOTENCY_HEADER, stableStringify } = require('../security/idempotency-contract');

const ORDERS_WRITE_CANARY_ENDPOINTS = Object.freeze([
  'POST /auth/login',
  'GET /auth/session',
  'GET /users/me',
  'GET /profiles/me',
  'GET /orders',
  'GET /orders/:id',
  'POST /orders',
  'POST /orders/:id/accept',
  'POST /orders/:id/decline',
  'POST /orders/:id/quote',
  'POST /orders/:id/charge',
  'POST /orders/:id/start',
  'POST /orders/:id/complete',
  'POST /orders/:id/status'
]);

const FORBIDDEN_DOMAIN_PATTERN = /\/(conversations|notifications|wallet|withdrawals|disputes|receipts|admin)(\/|$)/;
const MUTATION_PATTERN = /^(POST|PATCH|PUT|DELETE)\s+/;

function createOrdersWriteCanaryLocalServer(options = {}) {
  const identities = createIdentities(['client', 'professional']);
  const tokens = new Map();
  const orders = createInitialOrders();
  const idempotency = new Map();
  const requests = [];
  const unexpectedRequests = [];
  const forbiddenRequests = [];
  const idempotencyEvents = [];
  let nextOrderNumber = 2000;
  let server = null;
  let baseUrl = '';

  async function start() {
    if (server) return { baseUrl, port: addressPort(server) };
    server = http.createServer(async (request, response) => {
      try {
        await handleRequest(request, response);
      } catch (error) {
        sendJson(response, 500, { error: { code: 'DOKE_LOCAL_ORDERS_WRITE_CANARY_SERVER_ERROR', message: error.message || 'Server error.' } });
      }
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${addressPort(server)}`;
    return { baseUrl, port: addressPort(server) };
  }

  async function stop() {
    if (!server) return;
    const activeServer = server;
    server = null;
    baseUrl = '';
    if (typeof activeServer.closeIdleConnections === 'function') activeServer.closeIdleConnections();
    if (typeof activeServer.closeAllConnections === 'function') activeServer.closeAllConnections();
    await new Promise((resolve, reject) => activeServer.close((error) => error ? reject(error) : resolve()));
  }

  async function handleRequest(request, response) {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    const method = String(request.method || 'GET').toUpperCase();
    const path = normalizePath(url.pathname);
    const shape = shapePath(path);
    const signature = `${method} ${shape}`;
    const body = await readJsonBody(request);
    recordRequest(requests, signature, path, body, request.headers);

    if (FORBIDDEN_DOMAIN_PATTERN.test(path)) {
      forbiddenRequests.push({ signature, path });
      return sendJson(response, 405, { error: { code: 'DOKE_LOCAL_ORDERS_WRITE_FORBIDDEN_DOMAIN', message: `Forbidden domain in write canary: ${path}` } });
    }

    if (signature === 'POST /auth/login') return handleLogin(response, body);
    if (signature === 'GET /auth/session') return withIdentity(request, response, tokens, (identity, token) => sendJson(response, 200, createSessionPayload(identity, token)));
    if (signature === 'GET /users/me') return withIdentity(request, response, tokens, (identity) => sendJson(response, 200, { user: identity.user }));
    if (signature === 'GET /profiles/me') return withIdentity(request, response, tokens, (identity) => sendJson(response, 200, { profile: identity.profile }));
    if (signature === 'GET /orders') return withIdentity(request, response, tokens, (identity) => sendJson(response, 200, { items: ordersForRole(orders, identity.user.role), meta: { provider: 'api', mode: 'write-local-canary' } }));
    if (signature === 'GET /orders/:id') return withIdentity(request, response, tokens, (identity) => handleGetOrder(response, identity, path));

    if (isAllowedMutation(signature)) {
      return withIdentity(request, response, tokens, (identity) => handleMutation(request, response, identity, method, shape, path, body));
    }

    unexpectedRequests.push({ signature, path });
    return sendJson(response, 404, { error: { code: 'DOKE_LOCAL_ORDERS_WRITE_UNEXPECTED_ENDPOINT', message: `Unexpected endpoint: ${signature}` } });
  }

  function handleLogin(response, body) {
    const email = String(body.email || body.login || '').trim().toLowerCase();
    const password = String(body.password || '');
    const identity = Object.values(identities).find((entry) => entry.credentials.email === email && entry.credentials.password === password);
    if (!identity) return sendUnauthorized(response);
    const token = `local-orders-write-token-${identity.user.role}`;
    tokens.set(token, identity.user.role);
    return sendJson(response, 200, createSessionPayload(identity, token));
  }

  function handleGetOrder(response, identity, path) {
    const orderId = orderIdFromPath(path);
    const order = orders.find((entry) => entry.id === orderId && canReadOrder(identity.user.role, entry));
    if (!order) return sendJson(response, 404, { error: { code: 'DOKE_ORDER_NOT_FOUND', message: 'Order not found.' } });
    return sendJson(response, 200, { order });
  }

  function handleMutation(request, response, identity, method, shape, path, body) {
    const key = readHeader(request.headers, IDEMPOTENCY_HEADER);
    if (!key) {
      idempotencyEvents.push({ type: 'missing_key', shape, role: identity.user.role });
      return sendJson(response, 409, { error: { code: 'DOKE_IDEMPOTENCY_REQUIRED', message: `Missing required ${IDEMPOTENCY_HEADER} header.` } });
    }

    const hash = requestHash(identity, method, shape, path, body);
    const existing = idempotency.get(key);
    if (existing) {
      if (existing.hash !== hash) {
        idempotencyEvents.push({ type: 'conflict', key, shape, role: identity.user.role });
        return sendJson(response, 409, { error: { code: 'DOKE_IDEMPOTENCY_CONFLICT', message: 'Idempotency key already exists for another actor, action or payload.' } });
      }
      idempotencyEvents.push({ type: 'replay', key, shape, role: identity.user.role });
      return sendJson(response, existing.status, Object.assign({}, existing.payload, { idempotency: { replay: true, key } }));
    }

    const result = executeMutation(identity, shape, path, body);
    idempotency.set(key, { hash, status: result.status, payload: result.payload });
    idempotencyEvents.push({ type: 'claimed', key, shape, role: identity.user.role });
    return sendJson(response, result.status, Object.assign({}, result.payload, { idempotency: { replay: false, key } }));
  }

  function executeMutation(identity, shape, path, body) {
    if (shape === '/orders') {
      if (identity.user.role !== 'client') return forbidden('Only clients can create orders in this local write canary.');
      const order = {
        id: `order-write-${nextOrderNumber++}`,
        clientId: identities.client.user.id,
        professionalId: identities.professional.user.id,
        status: 'requested',
        title: body.title || 'Pedido local write canary',
        description: body.description || 'Pedido criado pelo harness local.',
        amountCents: Number(body.amountCents || 0),
        events: ['created']
      };
      orders.push(order);
      return ok(201, { order });
    }

    const order = orders.find((entry) => entry.id === orderIdFromPath(path));
    if (!order) return ok(404, { error: { code: 'DOKE_ORDER_NOT_FOUND', message: 'Order not found.' } });

    const action = path.split('/').filter(Boolean)[2];
    if (['accept', 'decline', 'quote', 'charge', 'start', 'complete', 'status'].includes(action) && identity.user.role !== 'professional') {
      return forbidden('Only professionals can mutate existing orders in this local write canary.');
    }

    const statusByAction = {
      accept: 'accepted',
      decline: 'declined',
      quote: 'quoted',
      charge: 'charged',
      start: 'in_progress',
      complete: 'completed',
      status: body.status || 'updated'
    };
    order.status = statusByAction[action] || order.status;
    if (action === 'quote' || action === 'charge') order.amountCents = Number(body.amountCents || order.amountCents || 0);
    order.events.push(action);
    return ok(200, { order });
  }

  function getReport() {
    return Object.freeze({
      name: 'orders-write-canary-local-server',
      baseUrl: baseUrl ? redactBaseUrl(baseUrl) : '',
      expectedEndpoints: ORDERS_WRITE_CANARY_ENDPOINTS.slice(),
      requests: requests.slice(),
      unexpectedRequests: unexpectedRequests.slice(),
      forbiddenRequests: forbiddenRequests.slice(),
      idempotencyEvents: idempotencyEvents.slice(),
      orderCount: orders.length,
      issuedTokens: tokens.size
    });
  }

  return Object.freeze({ start, stop, getReport });
}

function createIdentities(roles) {
  return roles.reduce((index, role) => {
    const credentials = STAGING_E2E_DEFAULT_USERS[role] || { email: `${role}@doke.local`, password: 'Doke1234!' };
    index[role] = {
      credentials,
      user: { id: `local-${role}-user`, name: role === 'client' ? 'Cliente Local' : 'Profissional Local', role, email: credentials.email },
      profile: { id: `local-${role}-profile`, userId: `local-${role}-user`, role, displayName: role === 'client' ? 'Cliente Local' : 'Profissional Local' }
    };
    return index;
  }, {});
}

function createInitialOrders() {
  return [{ id: 'order-write-seeded-1', clientId: 'local-client-user', professionalId: 'local-professional-user', status: 'requested', title: 'Pedido seed write canary', amountCents: 0, events: ['seeded'] }];
}

function withIdentity(request, response, tokens, callback) {
  const token = bearerToken(request.headers);
  const role = tokens.get(token);
  const identity = role ? identitiesForRequest(role) : null;
  if (!identity) return sendUnauthorized(response);
  return callback(identity, token);
}

function identitiesForRequest(role) {
  const credentials = STAGING_E2E_DEFAULT_USERS[role] || { email: `${role}@doke.local`, password: 'Doke1234!' };
  return { credentials, user: { id: `local-${role}-user`, name: role === 'client' ? 'Cliente Local' : 'Profissional Local', role, email: credentials.email }, profile: { id: `local-${role}-profile`, userId: `local-${role}-user`, role, displayName: role === 'client' ? 'Cliente Local' : 'Profissional Local' } };
}

function createSessionPayload(identity, token) {
  return { session: { token, accessToken: token, access_token: token, user: identity.user, profile: identity.profile }, user: identity.user, profile: identity.profile };
}

function ordersForRole(orders, role) {
  return orders.filter((order) => canReadOrder(role, order));
}

function canReadOrder(role, order) {
  if (role === 'client') return order.clientId === 'local-client-user';
  if (role === 'professional') return order.professionalId === 'local-professional-user';
  return false;
}

function isAllowedMutation(signature) {
  return ['POST /orders', 'POST /orders/:id/accept', 'POST /orders/:id/decline', 'POST /orders/:id/quote', 'POST /orders/:id/charge', 'POST /orders/:id/start', 'POST /orders/:id/complete', 'POST /orders/:id/status'].includes(signature);
}

function requestHash(identity, method, shape, path, body) {
  return crypto.createHash('sha256').update(stableStringify({ actorId: identity.user.id, method, shape, path, body: body || {} })).digest('hex');
}

function ok(status, payload) { return { status, payload }; }
function forbidden(message) { return ok(403, { error: { code: 'DOKE_FORBIDDEN', message } }); }
function orderIdFromPath(path) { return path.split('/').filter(Boolean)[1] || ''; }
function bearerToken(headers) { return String(readHeader(headers, 'authorization') || '').replace(/^Bearer\s+/i, '').trim(); }
function readHeader(headers, name) { const wanted = String(name).toLowerCase(); const key = Object.keys(headers || {}).find((entry) => entry.toLowerCase() === wanted); return key ? headers[key] : ''; }
function normalizePath(value) { return `/${String(value || '').replace(/^\/+|\/+$/g, '')}`.replace(/\/+/g, '/'); }
function shapePath(value) { return normalizePath(value).replace(/^\/orders\/[^/]+(\/|$)/, '/orders/:id$1').replace(/\/$/, '') || '/'; }
function addressPort(server) { const address = server.address(); return address && typeof address === 'object' ? address.port : 0; }
function redactBaseUrl(value) { try { const url = new URL(value); return `${url.protocol}//${url.hostname}:<port>`; } catch (_) { return ''; } }
async function readJsonBody(request) { const chunks = []; for await (const chunk of request) chunks.push(chunk); const raw = Buffer.concat(chunks).toString('utf8').trim(); if (!raw) return {}; try { return JSON.parse(raw); } catch (_) { return {}; } }
function sendUnauthorized(response) { return sendJson(response, 401, { error: { code: 'DOKE_UNAUTHORIZED', message: 'Unauthorized.' } }); }
function sendJson(response, status, payload) { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); response.end(`${JSON.stringify(payload)}\n`); }
function recordRequest(list, signature, path, body, headers) { list.push({ signature, path, hasIdempotencyKey: Boolean(readHeader(headers, IDEMPOTENCY_HEADER)), bodyKeys: Object.keys(body || {}).sort() }); }

module.exports = Object.freeze({ createOrdersWriteCanaryLocalServer, ORDERS_WRITE_CANARY_ENDPOINTS });
