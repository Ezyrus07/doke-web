'use strict';

const { listRoutes } = require('../../shared/http/route-registry');
const { getHandler } = require('../../shared/http/module-route-loader');
const { resolveSupabaseActor, toGuestActor } = require('../../shared/auth/supabase-actor-resolver');
const { errorResponse, jsonResponse } = require('../../shared/http/http-response');
const { createStagingRuntimeConfig, assertStagingRuntimeConfig } = require('./staging-runtime-config');

function createStagingApiRuntime(options) {
  const safeOptions = options && typeof options === 'object' ? options : {};
  const config = createStagingRuntimeConfig(safeOptions);
  const createClient = safeOptions.createClient;
  if (typeof createClient !== 'function') {
    throw new Error('createStagingApiRuntime requires a Supabase createClient factory.');
  }

  function createUserSupabaseClient(authorizationHeader) {
    assertStagingRuntimeConfig(config);
    const headers = authorizationHeader ? { Authorization: authorizationHeader } : {};
    return createClient(config.supabaseUrl, config.anonKey, {
      global: { headers },
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  function createServiceSupabaseClient() {
    if (!config.hasServiceClientConfig) return null;
    return createClient(config.supabaseUrl, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }

  async function handle(input) {
    const request = normalizeRuntimeRequest(input);
    const requestId = request.requestId;
    try {
      assertStagingRuntimeConfig(config);
      const match = matchRoute(request.method, request.path);
      if (!match) throw notFound(request.method, request.path);
      const authorizationHeader = readHeader(request.headers, 'authorization');
      const supabase = createUserSupabaseClient(authorizationHeader);
      const serviceSupabase = createServiceSupabaseClient();
      if (routeRequiresServiceStore(match.route) && !serviceSupabase) {
        throw serviceRoleUnavailable(match.route.name);
      }
      const actor = await resolveActorForRoute(match.route, supabase, request.headers);
      const handler = getHandler(match.route.module, match.route.handler);
      if (typeof handler !== 'function') throw notFoundHandler(match.route.name);

      const result = await handler({
        params: match.params,
        query: request.query,
        body: request.body,
        headers: request.headers,
        actor,
        supabase,
        serviceSupabase,
        createUserSupabaseClient,
        requestId,
        now: request.now
      });

      return jsonResponse(statusForRoute(match.route), result && Object.prototype.hasOwnProperty.call(result, 'data') ? result.data : result);
    } catch (error) {
      return errorResponse(error, requestId);
    }
  }

  return Object.freeze({
    config,
    handle,
    createUserSupabaseClient,
    createServiceSupabaseClient,
    listRoutes
  });
}

async function resolveActorForRoute(route, supabase, headers) {
  const allowed = Array.isArray(route.allowedRoles) ? route.allowedRoles : [];
  if (allowed.length === 1 && allowed[0] === 'guest') return toGuestActor();
  return resolveSupabaseActor({ supabase, headers });
}

function normalizeRuntimeRequest(input) {
  const safeInput = input && typeof input === 'object' ? input : {};
  const url = parseUrl(safeInput.url || safeInput.path || '/');
  return Object.freeze({
    method: String(safeInput.method || 'GET').toUpperCase(),
    path: normalizePath(url.pathname),
    query: { ...Object.fromEntries(url.searchParams.entries()), ...(safeInput.query || {}) },
    body: safeInput.body || {},
    headers: normalizeHeaders(safeInput.headers || {}),
    requestId: String(safeInput.requestId || readHeader(safeInput.headers || {}, 'x-request-id') || `doke_req_${Date.now()}`),
    now: safeInput.now || new Date().toISOString()
  });
}

function normalizeHeaders(headers) {
  if (headers && typeof headers.forEach === 'function') {
    const output = {};
    headers.forEach((value, key) => { output[key] = value; });
    return output;
  }
  return { ...(headers || {}) };
}

function parseUrl(value) {
  try {
    return new URL(String(value || '/'), 'https://staging.doke.local');
  } catch {
    return new URL('/', 'https://staging.doke.local');
  }
}

function normalizePath(path) {
  const value = String(path || '/').trim() || '/';
  return value.length > 1 ? value.replace(/\/$/, '') : value;
}

function readHeader(headers, name) {
  const normalized = String(name || '').toLowerCase();
  const source = headers || {};
  const key = Object.keys(source).find((candidate) => candidate.toLowerCase() === normalized);
  return key ? source[key] : '';
}

function matchRoute(method, requestPath) {
  for (const route of listRoutes()) {
    if (route.method !== method) continue;
    const params = matchPath(route.path, requestPath);
    if (params) return { route, params };
  }
  return null;
}

function matchPath(routePath, requestPath) {
  const routeParts = normalizePath(routePath).split('/').filter(Boolean);
  const requestParts = normalizePath(requestPath).split('/').filter(Boolean);
  if (routeParts.length !== requestParts.length) return null;
  return routeParts.reduce((params, part, index) => {
    if (params === null) return null;
    const value = requestParts[index];
    if (part.startsWith(':')) {
      params[part.slice(1)] = decodeURIComponent(value);
      return params;
    }
    return part === value ? params : null;
  }, {});
}

function statusForRoute(route) {
  if (route.method === 'POST' && (route.name.endsWith('.create') || route.name === 'auth.register')) return 201;
  return 200;
}

function routeRequiresServiceStore(route) {
  return Boolean(route && (route.serviceRoleRequired || route.idempotencyRequired || route.auditRequired));
}

function notFound(method, path) {
  const error = new Error(`No route registered for ${method} ${path}.`);
  error.code = 'DOKE_ROUTE_NOT_FOUND';
  error.status = 404;
  return error;
}

function notFoundHandler(routeName) {
  const error = new Error(`No handler registered for route ${routeName}.`);
  error.code = 'DOKE_ROUTE_HANDLER_NOT_FOUND';
  error.status = 501;
  return error;
}

function serviceRoleUnavailable(routeName) {
  const error = new Error(`Route ${routeName} requires a configured service-role client.`);
  error.code = 'DOKE_SERVICE_ROLE_UNAVAILABLE';
  error.status = 503;
  return error;
}

module.exports = Object.freeze({
  createStagingApiRuntime,
  matchRoute,
  matchPath,
  normalizeRuntimeRequest,
  routeRequiresServiceStore
});
