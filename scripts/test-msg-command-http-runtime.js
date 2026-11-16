'use strict';
// Run only against a fresh local stack. No hosted URL or pre-existing schema is accepted.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const crypto = require('node:crypto');
const { once } = require('node:events');
const { execFileSync } = require('node:child_process');
const { createStagingApiRuntime } = require('../backend/runtime/staging/staging-api-runtime');
const { createNodeHttpServer } = require('../backend/runtime/staging/node-http-server');
const reliability = require('../assets/js/services/message-command-executor');

async function main() {
  const [statusFile, sdkFile, evidenceDir] = process.argv.slice(2);
  const browserMode = process.argv[5] === '--serve-browser';
  assert(statusFile && sdkFile && evidenceDir, 'status.json, installed SDK bundle and evidence directory are required');
  const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
  assert.equal(status.API_URL, 'http://127.0.0.1:54321');
  assert.equal(new URL(status.DB_URL).hostname, '127.0.0.1');
  fs.mkdirSync(evidenceDir, { recursive: true });
  const events = [], results = [];
  const record = event => { events.push({ at: new Date().toISOString(), ...event }); fs.writeFileSync(path.join(evidenceDir, 'requests.json'), JSON.stringify(events, null, 2)); };
  const sdk = vm.runInThisContext(fs.readFileSync(sdkFile, 'utf8') + ';supabase', { filename: 'installed-supabase-2.110.0.js' });
  assert.equal(typeof sdk.createClient, 'function');
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = sdk.createClient(status.API_URL, status.SERVICE_ROLE_KEY, options);
  const sql = query => execFileSync('psql', [status.DB_URL, '-X', '-v', 'ON_ERROR_STOP=1', '-Atc', query], { encoding: 'utf8' }).trim();
  assert.equal(sql("select count(*) from pg_tables where schemaname='public' and tablename in ('users','messages','conversations','api_idempotency_keys')"), '0', 'Refuse populated/schema-reused database');
  execFileSync('psql', [status.DB_URL, '-X', '-v', 'ON_ERROR_STOP=1', '-f', path.join(__dirname, 'fixtures/msg-command-http-baseline.sql')], { stdio: ['ignore', 'pipe', 'pipe'] });
  // NOTIFY reload is asynchronous; wait for catalog visibility, never retry a business command here.
  let catalog;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    catalog = await admin.from('users').select('id').limit(0);
    if (!catalog.error || catalog.error.code !== 'PGRST205') break;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.ifError(catalog.error);
  const actors = [];
  for (const role of ['client', 'professional', 'client']) {
    const email = `replay-${crypto.randomUUID()}@example.test`, password = crypto.randomBytes(24).toString('hex');
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert.ifError(created.error);
    const id = created.data.user.id;
    assert.ifError((await admin.from('users').insert({ id, email, role })).error);
    const client = sdk.createClient(status.API_URL, status.ANON_KEY, options);
    const login = await client.auth.signInWithPassword({ email, password });
    assert.ifError(login.error);
    actors.push({ id, token: login.data.session.access_token });
  }
  const conversation = crypto.randomUUID();
  assert.ifError((await admin.from('conversations').insert({ id: conversation, order_id: crypto.randomUUID(), client_id: actors[0].id, professional_id: actors[1].id })).error);
  const otherConversation = browserMode ? crypto.randomUUID() : null;
  if (browserMode) {
    assert.ifError((await admin.from('conversations').insert({ id: otherConversation, order_id: crypto.randomUUID(), client_id: actors[0].id, professional_id: actors[1].id })).error);
    assert.ifError((await admin.from('messages').insert([conversation, otherConversation].map(id => ({ conversation_id: id, sender_id: actors[1].id, body: 'Conversa sintética de integração.' })))).error);
  }
  const env = {
    DOKE_ENVIRONMENT: 'staging', DOKE_ENABLE_STAGING_API: '1', DOKE_ENABLE_SERVICE_ROLE: '1',
    DOKE_STAGING_RELEASE_ID: 'ord-a08-local-replay-002', DOKE_STAGING_ROLLBACK_RELEASE_ID: 'ord-a08-local-replay-001',
    DOKE_STAGING_RELEASE_SHA: 'fe74f69d1790ba44981c790f2939c29b18bce537',
    ...(browserMode ? { DOKE_ALLOWED_ORIGINS: 'http://127.0.0.1:5644,http://127.0.0.1:5645' } : {}),
    SUPABASE_URL: status.API_URL, SUPABASE_ANON_KEY: status.ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY
  };
  const server = createNodeHttpServer({ env, runtime: createStagingApiRuntime({ env, createClient: sdk.createClient }) });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const faults = new Map();
  const gatewayKey = browserMode ? crypto.randomBytes(32).toString('hex') : '';
  let scenario = { kind: 'none', body: '' };
  const releases = [];
  const snapshot = () => JSON.parse(sql("select json_build_object('messages',(select coalesce(json_agg(json_build_object('id',id,'conversationId',conversation_id,'senderId',sender_id,'body',body,'status',status)),'[]') from public.messages),'ledger',(select coalesce(json_agg(json_build_object('key',idempotency_key,'status',status,'messageId',response_body->'message'->>'id')),'[]') from public.api_idempotency_keys),'auditCount',(select count(*) from public.admin_audit_events))"));
  const proxy = http.createServer(async (req, res) => {
    if (browserMode) {
      const callerOrigin = req.headers.origin;
      if (callerOrigin && !env.DOKE_ALLOWED_ORIGINS.split(',').includes(callerOrigin)) { res.writeHead(403); res.end(); return; }
      if (callerOrigin) { res.setHeader('access-control-allow-origin', callerOrigin); res.setHeader('vary', 'Origin'); }
      if (req.method === 'OPTIONS') {
        res.setHeader('access-control-allow-headers', 'authorization,content-type,x-msg005-gateway,x-idempotency-key,x-request-id,x-doke-request-issued-at,x-doke-request-nonce,x-doke-command-attempt,x-doke-command-created-at');
        res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS'); res.writeHead(204); res.end(); return;
      }
      const capability = Buffer.from(String(req.headers['x-msg005-gateway'] || ''));
      if (capability.length !== gatewayKey.length || !crypto.timingSafeEqual(capability, Buffer.from(gatewayKey))) { res.writeHead(401); res.end(); return; }
    }
    const chunks = []; let size = 0;
    try {
      for await (const c of req) {
        size += c.length;
        if (size > 1024 * 1024) { res.writeHead(413); res.end(); return; }
        chunks.push(c);
      }
    } catch (error) { record({ stage: 'request-body-aborted', code: error.code || error.name }); res.destroy(); return; }
    const body = Buffer.concat(chunks), key = req.headers['x-idempotency-key'];
    if (browserMode && req.url.startsWith('/__msg005/')) {
      try {
        res.setHeader('content-type', 'application/json');
        if (req.method === 'GET' && req.url === '/__msg005/receipt') { res.end(JSON.stringify({ snapshot: snapshot(), events })); return; }
        const control = body.length ? JSON.parse(body) : {};
        if (req.method === 'POST' && req.url === '/__msg005/control') {
          assert(['none', 'lost', 'timeout', 'offline', 'hold'].includes(control.kind));
          assert(typeof control.body === 'string' && control.body.length <= 4000);
          scenario = { kind: control.kind, body: control.body };
          if (control.kind === 'none') releases.splice(0).forEach(release => release());
          res.end('{"ok":true}'); return;
        }
        if (req.method === 'POST' && req.url === '/__msg005/device') {
          assert([conversation, otherConversation].includes(control.conversationId));
          assert(typeof control.body === 'string' && control.body.length <= 4000);
          const commandId = crypto.randomUUID();
          const response = await fetch(origin + '/conversations/' + control.conversationId + '/messages', { method: 'POST', headers: {
            'content-type': 'application/json', authorization: 'Bearer ' + actors[0].token, 'x-idempotency-key': commandId,
            'x-request-id': commandId, 'x-doke-request-issued-at': new Date().toISOString(), 'x-doke-request-nonce': 'ord-' + crypto.randomUUID()
          }, body: JSON.stringify({ id: control.conversationId, action: 'sendMessage', body: control.body, commandId }) });
          const data = await response.json(); record({ stage: 'other-device', commandId, status: response.status, response: data });
          res.writeHead(response.status); res.end(JSON.stringify(data)); return;
        }
        res.writeHead(404); res.end(); return;
      } catch (error) { res.writeHead(400); res.end('{"error":"INVALID_TEST_CONTROL"}'); return; }
    }
    let fault = faults.get(key); if (fault) faults.delete(key);
    if (browserMode && req.method === 'POST') {
      let parsed;
      try { parsed = JSON.parse(body.toString() || '{}'); } catch (error) { res.writeHead(400); res.end(); return; }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { res.writeHead(400); res.end(); return; }
      if (parsed.body === scenario.body) {
        fault = scenario.kind;
        if (fault === 'lost' || fault === 'timeout') scenario = { kind: 'none', body: '' };
      }
    }
    record({ stage: 'request', method: req.method, path: req.url, commandId: key, attempt: req.headers['x-doke-command-attempt'], body: body.toString() });
    if (fault === 'http503') { res.writeHead(503); res.end('{"error":"SYNTHETIC_TRANSPORT_UNAVAILABLE"}'); record({ stage: 'fault', commandId: key, status: 503 }); return; }
    try {
      const headers = { ...req.headers, host: new URL(origin).host };
      delete headers['x-msg005-gateway'];
      const upstream = await fetch(origin + req.url, { method: req.method, headers, body: req.method === 'GET' ? undefined : body });
      const text = await upstream.text();
      record({ stage: 'response', commandId: key, status: upstream.status, body: JSON.parse(text) });
      if (fault === 'lost' || fault === 'timeout' || fault === 'offline' || fault === 'hold') {
        assert(upstream.ok, 'Drop only a successfully committed response');
        const quotedKey = String(key).replace(/'/g, "''");
        assert.equal(sql(`select count(*) from public.messages m join public.api_idempotency_keys k on k.response_body->'message'->>'id'=m.id::text where k.idempotency_key='${quotedKey}' and k.status='succeeded'`), '1');
        record({ stage: 'committed-before-response-loss', commandId: key, persisted: 1 });
        if (fault === 'timeout') await new Promise(resolve => setTimeout(resolve, 750));
        if (fault === 'hold') await new Promise(resolve => releases.push(resolve));
        res.destroy(); return;
      }
      res.writeHead(upstream.status, { 'content-type': 'application/json' }); res.end(text);
    } catch (error) { record({ stage: 'proxy-error', code: error.code || error.name }); res.destroy(); }
  });
  proxy.listen(browserMode ? 8788 : 0, browserMode ? '0.0.0.0' : '127.0.0.1'); await once(proxy, 'listening');
  const base = `http://127.0.0.1:${proxy.address().port}`;
  if (browserMode) {
    fs.writeFileSync(path.join(evidenceDir, 'browser.private.json'), JSON.stringify({ base, actors, conversation, otherConversation, gatewayKey }), { mode: 0o600 });
    fs.writeFileSync(path.join(evidenceDir, 'browser-ready.json'), JSON.stringify({ ready: true, port: 8788, credentials: 'private file only', initialMessages: 2 }));
    console.log('MSG005_BROWSER_RUNTIME_READY port=8788 credentials=private-file-only');
    await new Promise(resolve => { process.once('SIGTERM', resolve); process.once('SIGINT', resolve); });
    releases.splice(0).forEach(release => release());
    proxy.closeAllConnections(); server.closeAllConnections();
    await Promise.all([new Promise(resolve => proxy.close(resolve)), new Promise(resolve => server.close(resolve))]); return;
  }
  let token = actors[0].token;
  const root = {
    Doke: { runtimeConfig: { apiBaseUrl: base, flags: { enableNetworkRequests: true } } }, crypto: crypto.webcrypto,
    DOKE_SUPABASE_CLIENT: { auth: { getSession: async () => ({ data: { session: { access_token: token } } }) } },
    fetch: (url, request) => fetch(url, { ...request, signal: AbortSignal.timeout(request.headers['x-idempotency-key'] === 'cmd-http-timeout' && request.headers['x-doke-command-attempt'] === '1' ? 350 : 10000) }).catch(error => {
      record({ stage: 'client-transport-error', commandId: request.headers['x-idempotency-key'], code: error.name }); throw error;
    })
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/services/api-repository-provider.js'), 'utf8'), { window: root });
  const provider = root.Doke.createApiRepositoryProvider();
  const executor = reliability.createExecutor();
  const payload = { id: conversation, action: 'sendMessage', body: 'Mensagem sintética recuperável' };
  const send = (key, value = payload, run = executor) => run.execute('sendMessage', value, request => provider.action('conversations', request), { commandId: key });
  const counts = () => JSON.parse(sql("select json_build_object('messages',(select count(*) from public.messages),'ledger',(select count(*) from public.api_idempotency_keys),'audit',(select count(*) from public.admin_audit_events))"));
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, result: 'PASS', counts: counts() }); }
    catch (error) { results.push({ name, result: 'FAIL', code: error.code || error.name, message: error.message, counts: counts() }); }
    finally { fs.writeFileSync(path.join(evidenceDir, 'results.json'), JSON.stringify(results, null, 2)); }
  };
  try {
    await test('committed response lost; executor retries stable business body; replay ACK', async () => {
      faults.set('cmd-http-lost', 'lost'); const result = await send('cmd-http-lost');
      assert.equal(result.attempts, 2); assert.equal(result.acknowledgement.status, 'replayed'); assert.equal(counts().messages, 1);
      const requests = events.filter(e => e.stage === 'request' && e.commandId === 'cmd-http-lost');
      assert.equal(requests.length, 2); assert.equal(requests[0].body, requests[1].body);
    });
    await test('reconnect with new executor and same command replays once', async () => {
      const r = await send('cmd-http-lost', payload, reliability.createExecutor());
      assert.equal(r.acknowledgement.status, 'replayed'); assert.equal(counts().messages, 1);
    });
    await test('same key changed payload conflicts without retry', async () => {
      await assert.rejects(send('cmd-http-lost', { ...payload, body: 'Alterada' }), { status: 409, commandAttempts: 1 });
      assert.equal(events.at(-1).body.error.code, 'DOKE_IDEMPOTENCY_CONFLICT'); assert.equal(counts().messages, 1);
    });
    await test('same key different authenticated participant rejected', async () => {
      token = actors[1].token;
      try { await assert.rejects(send('cmd-http-lost'), { status: 409, commandAttempts: 1 }); assert.equal(counts().messages, 1); }
      finally { token = actors[0].token; }
    });
    await test('invalid credential rejected before ledger or message', async () => {
      token = 'invalid.invalid.invalid'; const before = counts();
      try { await assert.rejects(send('cmd-http-invalid'), { status: 401, commandAttempts: 1 }); assert.deepEqual(counts(), before); }
      finally { token = actors[0].token; }
    });
    await test('unrelated authenticated actor denied conversation', async () => {
      token = actors[2].token;
      try { await assert.rejects(send('cmd-http-outsider'), { status: 404, commandAttempts: 1 }); assert.equal(counts().messages, 1); }
      finally { token = actors[0].token; }
    });
    await test('two simultaneous HTTP attempts persist one message', async () => {
      const before = counts().messages;
      // Settle both requests before inspecting persistence or closing the server.
      const output = await Promise.allSettled([send('cmd-http-race', payload, reliability.createExecutor()), send('cmd-http-race', payload, reliability.createExecutor())]);
      assert.equal(counts().messages, before + 1);
      record({ stage: 'concurrency', outcomes: output.map(r => r.status === 'fulfilled' ? { status: r.status, messageId: r.value.data.message.id, ack: r.value.acknowledgement.status } : { status: r.status, code: r.reason.code, httpStatus: r.reason.status }) });
      assert(output.every(r => r.status === 'fulfilled'), 'Both callers must recover the same persisted command');
      assert.equal(output[0].value.data.message.id, output[1].value.data.message.id);
      assert(output.some(r => r.value.acknowledgement.status === 'replayed'));
    });
    await test('HTTP 503 recovers with accepted ACK and one persisted message', async () => {
      const before = counts().messages; faults.set('cmd-http-503', 'http503'); const r = await send('cmd-http-503');
      assert.equal(r.attempts, 2); assert.equal(r.acknowledgement.status, 'accepted'); assert.equal(counts().messages, before + 1);
    });
    await test('timeout after commit recovers replay and releases executor state', async () => {
      const before = counts().messages; faults.set('cmd-http-timeout', 'timeout'); const r = await send('cmd-http-timeout');
      assert.equal(r.attempts, 2); assert.equal(r.acknowledgement.status, 'replayed'); assert.equal(counts().messages, before + 1); assert.equal(executor.getInFlightCount(), 0);
      const committed = events.find(e => e.commandId === 'cmd-http-timeout' && e.stage === 'committed-before-response-loss');
      const aborted = events.find(e => e.commandId === 'cmd-http-timeout' && e.stage === 'client-transport-error');
      assert(committed && aborted && committed.at < aborted.at, 'Timeout must occur after the successful commit');
    });
    fs.writeFileSync(path.join(evidenceDir, 'database.json'), JSON.stringify({ version: sql('select version()'), counts: counts(), ledger: JSON.parse(sql("select coalesce(json_agg(json_build_object('key',idempotency_key,'status',status,'messageId',response_body->'message'->>'id')),'[]') from public.api_idempotency_keys")) }, null, 2));
    const failed = results.filter(r => r.result === 'FAIL').length;
    console.log(JSON.stringify({ result: failed ? 'FAIL' : 'PASS', tests: results.length, passed: results.length - failed, failed, counts: counts(), browser: 'NOT_RUN: no browser installed' }));
    if (failed) process.exitCode = 1;
  } finally { proxy.closeAllConnections(); server.closeAllConnections(); await Promise.all([new Promise(r => proxy.close(r)), new Promise(r => server.close(r))]); }
}
main().catch(error => { console.error(JSON.stringify({ result: 'FAIL', code: error.code || error.name, message: error.message })); process.exitCode = 1; });
