#!/usr/bin/env node
'use strict';

const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const { createStagingApiRuntime } = require('./staging-api-runtime');

const DEFAULT_PORT = 8787;
const DEFAULT_HOST = '127.0.0.1';
const MAX_BODY_BYTES = 1024 * 1024;
const ALLOWED_METHODS = 'GET,POST,PATCH,PUT,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'authorization,content-type,x-idempotency-key,x-request-id,apikey';

function createNodeHttpServer(options) {
  const safeOptions = options && typeof options === 'object' ? options : {};
  const runtime = safeOptions.runtime || createStagingApiRuntime({
    env: safeOptions.env || process.env,
    createClient
  });

  return http.createServer(async (request, response) => {
    const requestId = readHeader(request.headers, 'x-request-id') || `doke_http_${Date.now()}`;

    try {
      applyCorsHeaders(response, request.headers.origin);

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
          requestId
        });
        return;
      }

      const body = await readRequestBody(request);
      const runtimeResponse = await runtime.handle({
        method: request.method,
        path: parsedUrl.pathname,
        query: Object.fromEntries(parsedUrl.searchParams.entries()),
        headers: request.headers,
        body,
        requestId
      });

      sendRuntimeResponse(response, runtimeResponse);
    } catch (error) {
      sendJson(response, Number(error && error.status) || 500, {
        ok: false,
        error: {
          code: error && error.code || 'DOKE_NODE_HTTP_RUNTIME_ERROR',
          message: Number(error && error.status) >= 400 && Number(error && error.status) < 500
            ? String(error && error.message || 'Solicitação inválida.')
            : 'Não foi possível concluir a solicitação.',
          requestId
        }
      });
    }
  });
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
  response.setHeader('access-control-allow-origin', origin || '*');
  response.setHeader('vary', 'Origin');
  response.setHeader('access-control-allow-methods', ALLOWED_METHODS);
  response.setHeader('access-control-allow-headers', ALLOWED_HEADERS);
  response.setHeader('access-control-max-age', '86400');
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
  const server = createNodeHttpServer();

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
  readRequestBody,
  startServer
});
