'use strict';

const http = require('http');
const { STAGING_E2E_DEFAULT_USERS } = require('./staging-e2e-scenarios');

const AUTH_IDENTITY_ENDPOINTS = Object.freeze([
  'POST /auth/login',
  'GET /auth/session',
  'GET /users/me',
  'GET /profiles/me'
]);

function createAuthIdentityCanaryLocalServer(options = {}) {
  const roles = normalizeRoles(options.roles || ['client', 'professional']);
  const identities = createIdentities(roles);
  const tokens = new Map();
  const requests = [];
  const unexpectedRequests = [];
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
            code: 'DOKE_LOCAL_CANARY_SERVER_ERROR',
            message: error.message || 'Local canary server error.'
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
    const route = `${method} ${normalizePath(url.pathname)}`;
    const body = await readJsonBody(request);
    recordRequest(requests, route, body, request.headers);

    if (route === 'POST /auth/login') {
      const email = String(body.email || body.login || '').trim().toLowerCase();
      const password = String(body.password || '');
      const identity = findIdentityByCredentials(identities, email, password);
      if (!identity) {
        sendJson(response, 401, {
          error: {
            code: 'DOKE_UNAUTHORIZED',
            message: 'Invalid local canary credentials.'
          }
        });
        return;
      }
      const token = `local-canary-token-${identity.user.role}`;
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

    unexpectedRequests.push({ route, pathname: url.pathname });
    sendJson(response, 404, {
      error: {
        code: 'DOKE_LOCAL_CANARY_UNEXPECTED_ENDPOINT',
        message: `Unexpected local canary endpoint: ${route}`
      }
    });
  }

  function getReport() {
    return Object.freeze({
      name: 'auth-identity-canary-local-server',
      baseUrl: baseUrl ? redactBaseUrl(baseUrl) : '',
      roles: roles.slice(),
      expectedEndpoints: AUTH_IDENTITY_ENDPOINTS.slice(),
      requests: requests.slice(),
      unexpectedRequests: unexpectedRequests.slice(),
      issuedTokens: tokens.size
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
    if (!fallback) throw new Error(`Unsupported auth/identity local canary role: ${role}`);
    const id = `local_${role}_user_1`;
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
        id: `local_${role}_profile_1`,
        userId: id,
        role,
        type: role,
        name: role === 'professional' ? 'Profissional Local Canary' : 'Cliente Local Canary',
        displayName: role === 'professional' ? 'Profissional Local Canary' : 'Cliente Local Canary',
        handle: role === 'professional' ? '@profissional-local-canary' : '@cliente-local-canary',
        city: 'Salvador',
        state: 'BA',
        country: 'BR',
        publicUrl: role === 'professional' ? 'perfil.html' : 'perfil-cliente.html',
        ownerUrl: role === 'professional' ? 'perfil-profissional.html' : 'meu-perfil.html'
      })
    });
    return index;
  }, {});
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

function recordRequest(requests, route, body, headers) {
  requests.push(Object.freeze({
    route,
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
      message: 'Local canary authorization token is missing or invalid.'
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
    return `${url.protocol}//${url.hostname}:${url.port}`;
  } catch {
    return '';
  }
}

module.exports = Object.freeze({
  AUTH_IDENTITY_ENDPOINTS,
  createAuthIdentityCanaryLocalServer
});
