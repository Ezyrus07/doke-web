'use strict';

function jsonResponse(status, payload, headers) {
  return Object.freeze({
    status: Number(status) || 200,
    headers: Object.freeze({
      'content-type': 'application/json; charset=utf-8',
      ...(headers || {})
    }),
    body: payload === undefined ? null : payload
  });
}

function ok(payload, headers) {
  return jsonResponse(200, payload, headers);
}

function created(payload, headers) {
  return jsonResponse(201, payload, headers);
}

function empty(headers) {
  return jsonResponse(204, null, headers);
}

function errorResponse(error, requestId) {
  const status = Number(error && error.status) || 500;
  const code = String(error && error.code || 'DOKE_RUNTIME_ERROR');
  const message = status >= 500 ? 'Não foi possível concluir a solicitação.' : String(error && error.message || 'Solicitação inválida.');
  return jsonResponse(status, {
    ok: false,
    error: {
      code,
      message,
      requestId: requestId || '',
      route: error && error.route || ''
    }
  });
}

module.exports = Object.freeze({
  jsonResponse,
  ok,
  created,
  empty,
  errorResponse
});
