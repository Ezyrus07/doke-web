'use strict';

const { createStagingApiRuntime } = require('./staging-api-runtime');

function createFetchHandler(options) {
  const runtime = createStagingApiRuntime(options);
  return async function handleFetch(request) {
    const body = await readJsonBody(request);
    const response = await runtime.handle({
      method: request.method,
      url: request.url,
      headers: request.headers,
      body
    });
    return toWebResponse(response);
  };
}

async function readJsonBody(request) {
  if (!request || ['GET', 'HEAD'].includes(String(request.method || 'GET').toUpperCase())) return undefined;
  const contentType = request.headers && request.headers.get && request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return undefined;
  return request.json().catch(() => undefined);
}

function toWebResponse(response) {
  const ResponseCtor = typeof Response === 'function' ? Response : null;
  if (!ResponseCtor) return response;
  return new Response(response.body == null ? null : JSON.stringify(response.body), {
    status: response.status,
    headers: response.headers
  });
}

module.exports = Object.freeze({ createFetchHandler });
