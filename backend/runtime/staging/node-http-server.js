#!/usr/bin/env node
'use strict';

const http = require('http');
const { createStagingApiRuntime } = require('./staging-api-runtime');
const { assertRuntimeReleaseEnvironment, createRuntimeReleaseHeaders } = require('./runtime-release-contract');

const DEFAULT_PORT = 8787;
const DEFAULT_HOST = '127.0.0.1';
const MAX_BODY_BYTES = 1024 * 1024;
const ALLOWED_METHODS = 'GET,POST,PATCH,PUT,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'authorization,content-type,x-idempotency-key,x-request-id,x-doke-request-issued-at,x-doke-request-nonce,apikey';

function createNodeHttpServer(options) {
  const safeOptions = options && typeof options === 'object' ? options : {};
  const runtimeEnv = safeOptions.env || process.env;
  const releaseDescriptor = assertRuntimeReleaseEnvironment(runtimeEnv);
  const releaseHeaders = createRuntimeReleaseHeaders(releaseDescriptor);
  let runtime = safeOptions.runtime || null;

  function getRuntime() {
    if (runtime) return runtime;
    const { createClient } = loadSupabaseClientFactory();
    runtime = createStagingApiRuntime({
      env: runtimeEnv,
      createClient
    });
    return runtime;
  }

  return http.createServer(async (request, response) => {
    const requestId = readHeader(request.headers, 'x-request-id') || `doke_http_${Date.now()}`;

    try {
      applyCorsHeaders(response, request.headers.origin);
      Object.entries(releaseHeaders).forEach(([key, value]) => response.setHeader(key, value));

      if (request.method === 'OPTIONS') {
        sendJson(response, 204, null);
        return;
      }

      const parsedUrl = new URL(request.url || '/', 'http://doke-staging-runtime.local');
      if (request.method === 'GET' && parsedUrl.pathname === '/health') {
        sendJson(response, 200, {
          ok: true,
          service: 'doke-staging-api-runtime',
          runtime: 'node-http',
          release: releaseDescriptor,
          capabilities: { requestFreshness: releaseDescriptor.requestFreshness },
          requestId
        });
        return;
      }

      const body = await readRequestBody(request);
      const runtimeResponse = await getRuntime().handle({
        method: request.method,
        path: parsedUrl.pathname,
        query: Object.fromEntries(parsedUrl.searchParams.entries()),
        headers: request.headers,
        body,
        requestId
      });

      sendRuntimeResponse(response, runtimeResponse);
    } catch (error) {
      const status = Number(error && error.status) || 500;
      sendJson(response, status, {
        ok: false,
        error: {
          code: error && error.code || 'DOKE_NODE_HTTP_RUNTIME_ERROR',
          message: status >= 400 && status < 500 || status === 503
            ? String(error && error.message || 'Solicitação inválida.')
            : 'Não foi possível concluir a solicitação.',
          requestId
        }
      });
    }
  });
}

function loadSupabaseClientFactory() {
  try {
    return require('@supabase/supabase-js');
  } catch (error) {
    if (error && error.code === 'MODULE_NOT_FOUND') {
      const missingDependencyError = new Error(
        'Missing @supabase/supabase-js. Run npm install with the public npm registry, then start the staging API again.'
      );
      missingDependencyError.code = 'DOKE_SUPABASE_JS_MISSING';
      missingDependencyError.status = 503;
      missingDependencyError.cause = error;
      throw missingDependencyError;
    }
    throw error;
  }
}

async function readRequestBody(request) {
  const method = String(request.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return undefined;

  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      const error = new Error('Request body exceeds the staging API payload limit.');
      error.code = 'DOKE_REQUEST_BODY_TOO_LARGE';
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  const rawBody = Buffer.concat(chunks).toString('utf8');
  if (!rawBody.trim()) return {};

  const contentType = readHeader(request.headers, 'content-type');
  if (!String(contentType || '').toLowerCase().includes('application/json')) return { rawBody };

  try {
    return JSON.parse(rawBody);
  } catch {
    const error = new Error('Request body must be valid JSON.');
    error.code = 'DOKE_INVALID_JSON_BODY';
    error.status = 400;
    throw error;
  }
}

function sendRuntimeResponse(response, runtimeResponse) {
  const safeResponse = runtimeResponse && typeof runtimeResponse === 'object' ? runtimeResponse : {};
  const headers = safeResponse.headers || {};

  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined && value !== null) response.setHeader(key, value);
  });

  sendJson(response, Number(safeResponse.status) || 200, safeResponse.body === undefined ? null : safeResponse.body);
}

function sendJson(response, status, payload) {
  if (!response.hasHeader('content-type')) response.setHeader('content-type', 'application/json; charset=utf-8');
  response.statusCode = Number(status) || 200;
  if (response.statusCode === 204) {
    response.end();
    return;
  }
  response.end(JSON.stringify(payload === undefined ? null : payload));
}

function applyCorsHeaders(response, origin) {
  response.setHeader('vary', 'Origin');
  response.setHeader('access-control-allow-methods', ALLOWED_METHODS);
  response.setHeader('access-control-allow-headers', ALLOWED_HEADERS);
  response.setHeader('access-control-max-age', '86400');

  if (!origin) {
    response.setHeader('access-control-allow-origin', '*');
    return;
  }

  if (!isAllowedCredentialedOrigin(origin)) return;

  response.setHeader('access-control-allow-origin', origin);
  response.setHeader('access-control-allow-credentials', 'true');
}

function isAllowedCredentialedOrigin(origin) {
  try {
    const url = new URL(String(origin || ''));
    return url.protocol === 'http:' &&
      Boolean(url.port) &&
      (url.hostname === '127.0.0.1' || url.hostname === 'localhost');
  } catch {
    return false;
  }
}

function readHeader(headers, name) {
  const normalized = String(name || '').toLowerCase();
  const source = headers || {};
  const key = Object.keys(source).find((candidate) => candidate.toLowerCase() === normalized);
  return key ? source[key] : '';
}

function readPort(env) {
  const raw = env.DOKE_STAGING_API_PORT || env.PORT || DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid staging API port: ${raw}`);
  }
  return port;
}

function startServer() {
  const port = readPort(process.env);
  const host = process.env.DOKE_STAGING_API_HOST || DEFAULT_HOST;
  const server = createNodeHttpServer({ env: process.env });

  server.listen(port, host, () => {
    console.log(`[doke-staging-api-runtime] listening on http://${host}:${port}`);
    console.log('[doke-staging-api-runtime] healthcheck: GET /health');
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = Object.freeze({
  createNodeHttpServer,
  isAllowedCredentialedOrigin,
  readRequestBody,
  startServer
});
