#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets/js/core/supabase-config.js'), 'utf8');
const edgeSource = fs.readFileSync(path.join(__dirname, '..', 'supabase/functions/search-public-services-v2/index.ts'), 'utf8');
const USER_JWT = 'header.payload.signature';

function serviceRoleJwt() {
  const payload = Buffer.from(JSON.stringify({ role: 'service_role' }), 'utf8').toString('base64url');
  return `header.${payload}.signature`;
}

function createRuntime(options = {}) {
  const calls = { clients: [], fetches: [] };
  const session = options.session === undefined
    ? { access_token: USER_JWT }
    : options.session;
  const client = {
    auth: {
      getSession() {
        return Promise.resolve({ data: { session } });
      }
    },
    functions: { invoke() { throw new Error('Direct Functions SDK transport must not be used.'); } }
  };
  const listeners = new Map();
  const window = {
    DOKE_SUPABASE_CONFIG: Object.assign({
      enabled: true,
      url: 'https://project-ref.supabase.co',
      publishableKey: 'sb_publishable_browser_key',
      anonKey: 'legacy-anon-key'
    }, options.config || {}),
    supabase: {
      createClient(url, key) {
        calls.clients.push({ url, key });
        return client;
      }
    },
    fetch(url, request) {
      calls.fetches.push({ url, request });
      return Promise.resolve({
        ok: true,
        status: 200,
        text() { return Promise.resolve(JSON.stringify({ ok: true })); }
      });
    },
    atob(value) { return Buffer.from(value, 'base64').toString('binary'); },
    document: {
      addEventListener(name, listener) { listeners.set(name, listener); },
      dispatchEvent() { return true; }
    },
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    }
  };
  window.window = window;
  vm.runInContext(source, vm.createContext({
    window,
    document: window.document,
    CustomEvent: window.CustomEvent,
    Promise,
    Object,
    Array,
    String,
    Boolean,
    JSON,
    Error,
    encodeURIComponent
  }), { filename: 'supabase-config.js' });
  Object.assign(window.DOKE_SUPABASE_CONFIG, {
    enabled: true,
    url: 'https://project-ref.supabase.co',
    publishableKey: 'sb_publishable_browser_key',
    anonKey: 'legacy-anon-key'
  }, options.config || {});
  window.DokeSupabase.resetClient();
  calls.clients.length = 0;
  calls.fetches.length = 0;
  return { window, calls };
}

async function rejects(promise, pattern) {
  let error = null;
  try { await promise; } catch (caught) { error = caught; }
  assert(error, 'Expected the Edge invocation to reject.');
  assert.match(error.message, pattern);
}

(async () => {
  for (const snippet of [
    'SUPABASE_PUBLISHABLE_KEYS',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SECRET_KEYS',
    'const presentedApiKey =',
    'publicKeys.includes(presentedApiKey)',
    'const userJwt = bearerJwt(',
    'await authClient.auth.getUser(userJwt)',
    'actorId && userJwt ? { Authorization: `Bearer ${userJwt}` } : {}'
  ]) {
    assert(edgeSource.includes(snippet), `Search Edge authentication contract missing: ${snippet}`);
  }
  assert(!edgeSource.includes('global: { headers: { Authorization: authorization } }'), 'Unvalidated Authorization must not reach the request client.');

  const authenticated = createRuntime();
  const response = await authenticated.window.DokeSupabase.invokeEdgeFunction('search-public-services-v2', {
    body: { query: 'limpeza' },
    headers: {
      Authorization: 'Bearer attacker-token',
      apikey: 'sb_secret_attacker',
      'x-doke-request-id': 'request-1'
    }
  });
  assert.deepEqual(response.data, { ok: true });
  assert.equal(authenticated.calls.clients[0].key, 'sb_publishable_browser_key');
  assert.equal(authenticated.calls.fetches.length, 1);
  const authenticatedRequest = authenticated.calls.fetches[0].request;
  assert.equal(authenticatedRequest.headers.apikey, 'sb_publishable_browser_key');
  assert.equal(authenticatedRequest.headers.Authorization, `Bearer ${USER_JWT}`);
  assert.equal(authenticatedRequest.headers['x-doke-request-id'], 'request-1');
  assert.equal(authenticatedRequest.credentials, 'omit');
  assert(!Object.values(authenticatedRequest.headers).includes('sb_secret_attacker'));
  assert(!Object.values(authenticatedRequest.headers).includes('Bearer attacker-token'));

  const anonymous = createRuntime({ session: null });
  await anonymous.window.DokeSupabase.invokeEdgeFunction('search-public-services-v2', { body: {} });
  assert.equal(anonymous.calls.fetches[0].request.headers.apikey, 'sb_publishable_browser_key');
  assert.equal(Object.prototype.hasOwnProperty.call(anonymous.calls.fetches[0].request.headers, 'Authorization'), false);

  const legacy = createRuntime({ config: { publishableKey: '', anonKey: 'legacy-anon-key' } });
  await legacy.window.DokeSupabase.invokeEdgeFunction('search-public-services-v2', { body: {} });
  assert.equal(legacy.calls.fetches[0].request.headers.apikey, 'legacy-anon-key');

  const secret = createRuntime({
    config: { publishableKey: 'sb_secret_forbidden', anonKey: serviceRoleJwt() }
  });
  await rejects(
    secret.window.DokeSupabase.invokeEdgeFunction('search-public-services-v2', { body: {} }),
    /Autoridade Edge do Supabase indisponível/
  );
  assert.equal(secret.calls.clients.length, 0);
  assert.equal(secret.calls.fetches.length, 0);

  console.log('[SEARCH-A10] Publishable-key transport runtime: PASS');
  console.log('[SEARCH-A10] apikey is browser-safe, Authorization carries only the real user JWT, and secret/service-role keys fail closed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
