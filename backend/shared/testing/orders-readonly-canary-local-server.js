'use strict';

const http = require('http');
const { STAGING_E2E_DEFAULT_USERS } = require('./staging-e2e-scenarios');

const ORDERS_READONLY_CANARY_ENDPOINTS = Object.freeze([
  'POST /auth/login',
  'GET /auth/session',
  'GET /users/me',
  'GET /profiles/me',
  'GET /orders',
  'GET /orders/:id'
]);

const FORBIDDEN_WRITE_PATTERN = /^POST \/orders|^PATCH \/orders|^PUT \/orders|^DELETE \/orders/;
const FORBIDDEN_DOMAIN_PATTERN = /\/(conversations|notifications|wallet|withdrawals|disputes|receipts|admin)(\/|$)/;

function createOrdersReadonlyCanaryLocalServer(options = {}) {
  const roles = normalizeRoles(options.roles || ['client', 'professional']);
  const identities = createIdentities(roles);
  const orders = createOrders(identities);
  const tokens = new Map();
  const requests = [];
  const unexpectedRequests = [];
  const forbiddenRequests = [];
  let server = null;
  let baseUrl = '';

  async function start() {
    if (server) return { baseUrl, port: addressPort(server) };
    server = http.createServer(async (request, response) => {
      try {
        await handleRequest(request, response);
      } catch (error) {
        sendJson(response, 500, {
          error: {
            code: 'DOKE_LOCAL_ORDERS_READONLY_CANARY_SERVER_ERROR',
            message: error.message || 'Local orders read-only canary server error.'
          }
        });
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
    await new Promise((resolve, reject) => {
      activeServer.close((error) => error ? reject(error) : resolve());
    });
  }

  async function handleRequest(request, response) {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    const method = String(request.method || 'GET').toUpperCase();
    const normalizedPath = normalizePath(url.pathname);
    const route = `${method} ${normalizedPath}`;
    const routeShape = `${method} ${shapePath(normalizedPath)}`;
    const body = await readJsonBody(request);
    recordRequest(requests, routeShape, normalizedPath, body, request.headers);

    if (FORBIDDEN_WRITE_PATTERN.test(route) || FORBIDDEN_DOMAIN_PATTERN.test(normalizedPath)) {
      forbiddenRequests.push({ route, routeShape, pathname: normalizedPath });
      sendJson(response, 405, {
        error: {
          code: 'DOKE_LOCAL_ORDERS_READONLY_FORBIDDEN_ENDPOINT',
          message: `Forbidden local orders read-only canary endpoint: ${route}`
        }
      });
      return;
    }

    if (route === 'POST /auth/login') {
      const email = String(body.email || body.login || '').trim().toLowerCase();
      const password = String(body.password || '');
      const identity = findIdentityByCredentials(identities, email, password);
      if (!identity) return sendUnauthorized(response);
      const token = `local-orders-readonly-token-${identity.user.role}`;
      tokens.set(token, identity.user.role);
      sendJson(response, 200, createSessionPayload(identity, token));
      return;
    }

    if (route === 'GET /auth/session') {
      const identity = identityFromAuthorization(request.headers, tokens, identities);
      if (!identity) return sendUnauthorized(response);
      sendJson(response, 200, createSessionPayload(identity, bearerToken(request.headers)));
      return;
    }

    if (route === 'GET /users/me') {
      const identity = identityFromAuthorization(request.headers, tokens, identities);
      if (!identity) return sendUnauthorized(response);
      sendJson(response, 200, { user: identity.user });
      return;
    }

    if (route === 'GET /profiles/me') {
      const identity = identityFromAuthorization(request.headers, tokens, identities);
      if (!identity) return sendUnauthorized(response);
      sendJson(response, 200, { profile: identity.profile });
      return;
    }

    if (route === 'GET /orders') {
      const identity = identityFromAuthorization(request.headers, tokens, identities);
      if (!identity) return sendUnauthorized(response);
      sendJson(response, 200, {
        items: ordersForRole(orders, identity.user.role),
        meta: { provider: 'api', mode: 'readonly-local-canary' }
      });
      return;
    }

    if (routeShape === 'GET /orders/:id') {
      const identity = identityFromAuthorization(request.headers, tokens, identities);
      if (!identity) return sendUnauthorized(response);
      const orderId = normalizedPath.split('/').filter(Boolean)[1] || '';
      const order = orders.find((entry) => entry.id === orderId && canReadOrder(identity.user.role, entry));
      if (!order) {
        sendJson(response, 404, {
          error: {
            code: 'DOKE_ORDER_NOT_FOUND',
            message: 'Order not found in local read-only canary.'
          }
        });
        return;
      }
      sendJson(response, 200, { order });
      return;
    }

    unexpectedRequests.push({ route, routeShape, pathname: normalizedPath });
    sendJson(response, 404, {
      error: {
        code: 'DOKE_LOCAL_ORDERS_READONLY_UNEXPECTED_ENDPOINT',
        message: `Unexpected local orders read-only canary endpoint: ${route}`
      }
    });
  }

  function getReport() {
    return Object.freeze({
      name: 'orders-readonly-canary-local-server',
      baseUrl: baseUrl ? redactBaseUrl(baseUrl) : '',
      roles: roles.slice(),
      expectedEndpoints: ORDERS_READONLY_CANARY_ENDPOINTS.slice(),
      requests: requests.slice(),
      unexpectedRequests: unexpectedRequests.slice(),
      forbiddenRequests: forbiddenRequests.slice(),
      issuedTokens: tokens.size,
      orderCount: orders.length
    });
  }

  return Object.freeze({
    start,
    stop,
    getReport
  });
}

function createIdentities(roles) {
  return roles.reduce((index, role) => {
    const fallback = STAGING_E2E_DEFAULT_USERS[role];
    if (!fallback) throw new Error(`Unsupported orders read-only local canary role: ${role}`);
    const id = `local_${role}_orders_user_1`;
    index[role] = Object.freeze({
      credentials: Object.freeze({ email: fallback.email, password: fallback.password }),
      user: Object.freeze({
        id,
        email: fallback.email,
        role,
        status: 'active',
        accountStatus: 'active'
      }),
      profile: Object.freeze({
        id: `local_${role}_orders_profile_1`,
        userId: id,
        role,
        type: role,
        name: role === 'professional' ? 'Profissional Orders Canary' : 'Cliente Orders Canary',
        displayName: role === 'professional' ? 'Profissional Orders Canary' : 'Cliente Orders Canary',
        handle: role === 'professional' ? '@profissional-orders-canary' : '@cliente-orders-canary',
        city: 'Salvador',
        state: 'BA',
        country: 'BR'
      })
    });
    return index;
  }, {});
}

function createOrders(identities) {
  const client = identities.client && identities.client.user;
  const professional = identities.professional && identities.professional.user;
  if (!client || !professional) return [];
  const now = new Date().toISOString();
  return [
    Object.freeze({
      id: 'local_orders_readonly_001',
      clientId: client.id,
      professionalId: professional.id,
      title: 'Instalação elétrica residencial',
      serviceId: 'service_local_orders_readonly_001',
      status: 'pending',
      statusLabel: 'Aguardando resposta',
      source: 'budget',
      createdAt: now,
      updatedAt: now
    }),
    Object.freeze({
      id: 'local_orders_readonly_002',
      clientId: client.id,
      professionalId: professional.id,
      title: 'Manutenção hidráulica preventiva',
      serviceId: 'service_local_orders_readonly_002',
      status: 'accepted',
      statusLabel: 'Pedido aceito',
      source: 'budget',
      createdAt: now,
      updatedAt: now
    })
  ];
}

function ordersForRole(orders, role) {
  return orders.filter((order) => canReadOrder(role, order));
}

function canReadOrder(role, order) {
  if (role === 'support' || role === 'admin') return true;
  if (role === 'client') return Boolean(order.clientId);
  if (role === 'professional') return Boolean(order.professionalId);
  return false;
}

function createSessionPayload(identity, token) {
  return {
    session: {
      provider: 'api',
      token,
      accessToken: token,
      access_token: token,
      refreshToken: `${token}-refresh`,
      refresh_token: `${token}-refresh`,
      sessionStatus: 'active',
      user: identity.user,
      profile: identity.profile
    },
    user: identity.user,
    profile: identity.profile
  };
}

function normalizeRoles(value) {
  const roles = Array.isArray(value) ? value : String(value || '').split(',');
  const normalized = roles.map((role) => String(role || '').trim().toLowerCase()).filter(Boolean);
  return Array.from(new Set(normalized.length ? normalized : ['client', 'professional']));
}

function normalizePath(value) {
  const path = String(value || '/').trim() || '/';
  return path.length > 1 ? path.replace(/\/$/, '') : path;
}

function shapePath(value) {
  const parts = normalizePath(value).split('/').filter(Boolean);
  if (parts[0] === 'orders' && parts[1]) return '/orders/:id';
  return normalizePath(value);
}

function findIdentityByCredentials(identities, email, password) {
  return Object.values(identities).find((identity) => identity.credentials.email === email && identity.credentials.password === password) || null;
}

function identityFromAuthorization(headers, tokens, identities) {
  const token = bearerToken(headers);
  const role = tokens.get(token);
  return role ? identities[role] || null : null;
}

function bearerToken(headers) {
  const authorization = readHeader(headers, 'authorization');
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function readHeader(headers, name) {
  const normalized = String(name || '').toLowerCase();
  const key = Object.keys(headers || {}).find((candidate) => candidate.toLowerCase() === normalized);
  return key ? String(headers[key] || '') : '';
}

function recordRequest(requests, route, pathname, body, headers) {
  requests.push(Object.freeze({
    route,
    pathname,
    hasAuthorization: Boolean(bearerToken(headers)),
    login: body && (body.email || body.login) ? String(body.email || body.login).toLowerCase() : undefined
  }));
}

async function readJsonBody(request) {
  if (!request || ['GET', 'HEAD'].includes(String(request.method || 'GET').toUpperCase())) return {};
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) || {};
  } catch {
    return {};
  }
}

function sendUnauthorized(response) {
  sendJson(response, 401, {
    error: {
      code: 'DOKE_UNAUTHORIZED',
      message: 'Local orders read-only canary authorization token is missing or invalid.'
    }
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'close'
  });
  response.end(JSON.stringify(payload));
}

function addressPort(server) {
  const address = server && server.address && server.address();
  return address && typeof address === 'object' ? address.port : 0;
}

function redactBaseUrl(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.hostname}:${url.port || ''}`.replace(/:$/, '');
  } catch {
    return 'local-orders-readonly-canary';
  }
}

module.exports = {
  ORDERS_READONLY_CANARY_ENDPOINTS,
  createOrdersReadonlyCanaryLocalServer
};
