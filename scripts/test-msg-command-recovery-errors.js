'use strict';
// Focused transport classification tests; real HTTP/DB coverage is a separate suite.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const reliability = require('../assets/js/services/message-command-executor');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/services/api-repository-provider.js'), 'utf8');
const payload = { id: '11111111-1111-4111-8111-111111111111', action: 'sendMessage', body: 'Mensagem sintética' };
const reply = (status, code) => ({ ok: false, status, async json() { return { error: { code } }; } });
const accepted = request => ({ ok: true, status: 200, async json() { return { message: { id: 'synthetic-message' }, acknowledgement: { commandId: JSON.parse(request.body).commandId, action: 'sendMessage', status: 'replayed' } }; } });
function harness(fetch) {
  const requests = [], delays = [];
  const root = { Doke: { runtimeConfig: { apiBaseUrl: 'http://127.0.0.1:5621', flags: { enableNetworkRequests: true } } }, crypto: crypto.webcrypto,
    fetch: async (url, options) => { requests.push({ url, ...options }); return fetch(options, requests.length); } };
  vm.runInNewContext(source, { window: root });
  const provider = root.Doke.createApiRepositoryProvider();
  const executor = reliability.createExecutor({ sleep: async ms => { delays.push(ms); } });
  return { requests, delays, executor, provider, send: () => executor.execute('sendMessage', payload, request => provider.action('conversations', request), { commandId: 'cmd-recovery-errors' }) };
}
function sameIntent(h) {
  assert.equal(new Set(h.requests.map(r => r.body)).size, 1);
  assert(h.requests.every(r => r.headers['x-idempotency-key'] === 'cmd-recovery-errors'));
  assert.equal(h.executor.getInFlightCount(), 0);
}
test('in-progress HTTP 409 preserves structured code and retries the same intent', async () => {
  const h = harness((request, n) => n === 1 ? reply(409, 'DOKE_IDEMPOTENCY_IN_PROGRESS') : accepted(request));
  const r = await h.send();
  assert.equal(r.attempts, 2); assert.equal(r.acknowledgement.status, 'replayed');
  assert.deepEqual(h.delays, [250]); sameIntent(h);
});
test('native TimeoutError code 23 recovers the same intent', async () => {
  const timeout = new DOMException('Synthetic deadline', 'TimeoutError'); assert.equal(timeout.code, 23);
  const h = harness((request, n) => { if (n === 1) throw timeout; return accepted(request); });
  assert.equal((await h.send()).attempts, 2); assert.deepEqual(h.delays, [250]); sameIntent(h);
});
for (const code of ['DOKE_IDEMPOTENCY_CONFLICT', 'DOKE_IDEMPOTENCY_FAILED', 'DOKE_IDEMPOTENCY_EXPIRED', undefined, 'unrelated']) {
  test('HTTP 409 stays definitive: ' + String(code), async () => {
    const h = harness(() => reply(409, code));
    await assert.rejects(h.send(), error => error.code === 'DOKE_API_HTTP_ERROR' && error.status === 409 && error.serverCode === (code || '') && error.retryable !== true);
    assert.equal(h.requests.length, 1); assert.deepEqual(h.delays, []);
  });
}
for (const status of [400, 401, 403, 404, 422]) {
  test('in-progress code cannot override definitive HTTP ' + status, async () => {
    const h = harness(() => reply(status, 'DOKE_IDEMPOTENCY_IN_PROGRESS'));
    await assert.rejects(h.send(), { code: 'DOKE_API_HTTP_ERROR', status, commandAttempts: 1 }); assert.equal(h.requests.length, 1);
  });
}
test('voluntary native AbortError is never retried', async () => {
  const aborted = new DOMException('Synthetic voluntary cancellation', 'AbortError');
  const h = harness(() => { throw aborted; });
  await assert.rejects(h.send(), error => error === aborted && error.commandAttempts === 1);
  assert.equal(h.requests.length, 1); assert.deepEqual(h.delays, []); sameIntent(h);
});
test('in-progress budget exhausts at three; explicit recovery retains commandId', async () => {
  let done = false;
  const h = harness(request => done ? accepted(request) : reply(409, 'DOKE_IDEMPOTENCY_IN_PROGRESS'));
  await assert.rejects(h.send(), { code: 'DOKE_API_HTTP_ERROR', serverCode: 'DOKE_IDEMPOTENCY_IN_PROGRESS', status: 409, retryable: true, commandAttempts: 3, commandId: 'cmd-recovery-errors' });
  assert.equal(h.requests.length, 3); assert.deepEqual(h.delays, [250, 750]); sameIntent(h);
  done = true; assert.equal((await h.send()).acknowledgement.status, 'replayed'); sameIntent(h);
});
test('timeout budget exhausts with diagnostic cause intact', async () => {
  const timeout = new DOMException('Synthetic deadline', 'TimeoutError');
  const h = harness(() => { throw timeout; });
  await assert.rejects(h.send(), error => error.code === 'DOKE_API_NETWORK_ERROR' && error.retryable === true && error.cause === timeout && error.cause.code === 23 && error.commandAttempts === 3);
  assert.equal(h.requests.length, 3); assert.deepEqual(h.delays, [250, 750]); sameIntent(h);
});
test('malformed HTTP error body retains status without becoming a network error', async () => {
  const h = harness(() => ({ ok: false, status: 409, async json() { throw new SyntaxError('HTML response'); } }));
  await assert.rejects(h.send(), { code: 'DOKE_API_HTTP_ERROR', status: 409, serverCode: '', commandAttempts: 1 });
  assert.equal(h.requests.length, 1);
});
test('successful HTTP body decoding failure is not a transport retry', async () => {
  const syntax = new SyntaxError('Invalid JSON');
  const h = harness(() => ({ ok: true, status: 200, async json() { throw syntax; } }));
  await assert.rejects(h.send(), error => error === syntax && error.commandAttempts === 1); assert.equal(h.requests.length, 1);
});
test('coded domain error at transport boundary retains identity', async () => {
  const domain = Object.assign(new Error('Domain unavailable'), { code: 'DOKE_DOMAIN_ERROR' });
  const h = harness(() => { throw domain; });
  await assert.rejects(h.send(), error => error === domain && error.commandAttempts === 1); assert.equal(h.requests.length, 1);
});
test('other provider domains preserve HTTP contracts and never retry by themselves', async () => {
  const h = harness(() => reply(409, 'DOKE_IDEMPOTENCY_CONFLICT'));
  await assert.rejects(h.provider.create('orders', { serviceId: 'synthetic' }), { code: 'DOKE_API_HTTP_ERROR', serverCode: 'DOKE_IDEMPOTENCY_CONFLICT', status: 409 });
  assert.equal(h.requests.length, 1); assert(h.requests[0].url.endsWith('/orders')); assert.equal(JSON.parse(h.requests[0].body).serviceId, 'synthetic');
});
