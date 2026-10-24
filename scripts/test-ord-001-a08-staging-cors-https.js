#!/usr/bin/env node
'use strict';

// Static local policy tests; no socket, Supabase, Vercel or other network calls.
const assert = require('node:assert/strict');
const {
  createCorsPolicy,
  parseAllowedOrigins,
  isAllowedOrigin,
  createNodeHttpServer,
  createNodeRequestHandler
} = require('../backend/runtime/staging/node-http-server');

let checks = 0;
const accepted = createCorsPolicy({
  DOKE_ENVIRONMENT: 'staging',
  DOKE_ALLOWED_ORIGINS: 'https://preview.example.invalid,https://staging-web.example.invalid'
});
assert.deepEqual(accepted.configuredOrigins, [
  'https://preview.example.invalid',
  'https://staging-web.example.invalid'
]);
assert.equal(isAllowedOrigin('https://preview.example.invalid', accepted), true);
assert.equal(isAllowedOrigin('https://unlisted.example.invalid', accepted), false);
checks++;

for (const origin of [
  'http://unsecured.example.invalid',
  'http://unsecured.example.invalid:8080',
  'http://192.0.2.10:3000'
]) {
  assert.throws(
    () => createCorsPolicy({ DOKE_ENVIRONMENT: 'staging', DOKE_ALLOWED_ORIGINS: origin }),
    (error) => error.code === 'DOKE_CORS_CONFIG_INVALID' && /HTTPS outside loopback/.test(error.message),
    'Staging must reject non-TLS external origin ' + origin
  );
  checks++;
}

for (const origin of [
  'http://localhost:3010',
  'http://127.0.0.1:3010',
  'http://[::1]:3010'
]) {
  const policy = createCorsPolicy({ DOKE_ENVIRONMENT: 'staging', DOKE_ALLOWED_ORIGINS: origin });
  assert.equal(isAllowedOrigin(origin, policy), true);
  checks++;
}

const local = createCorsPolicy({
  DOKE_ENVIRONMENT: 'local',
  DOKE_ALLOWED_ORIGINS: 'http://development.example.invalid:8080'
});
assert.equal(isAllowedOrigin('http://development.example.invalid:8080', local), true);
checks++;

assert.throws(
  () => parseAllowedOrigins('https://safe.example.invalid,http://unsafe.example.invalid', 'staging'),
  (error) => error.code === 'DOKE_CORS_CONFIG_INVALID'
);
checks++;

assert.throws(
  () => createCorsPolicy({ DOKE_ENVIRONMENT: 'staging', DOKE_ALLOWED_ORIGINS: '*' }),
  (error) => error.code === 'DOKE_CORS_CONFIG_INVALID'
);
checks++;

assert.throws(
  () => createCorsPolicy({ DOKE_ENVIRONMENT: 'staging', DOKE_ALLOWED_ORIGINS: 'https://safe.example.invalid/path' }),
  (error) => error.code === 'DOKE_CORS_CONFIG_INVALID'
);
checks++;

assert.throws(
  () => createNodeHttpServer({
    env: { DOKE_ENVIRONMENT: 'staging', DOKE_ALLOWED_ORIGINS: 'http://insecure.example.invalid' },
    runtime: { handle: async () => ({ status: 200, body: {} }) }
  }),
  (error) => error.code === 'DOKE_CORS_CONFIG_INVALID',
  'Invalid CORS should abort staging Node server construction before listening'
);
checks++;

// No sockets: exercise the deployed HTTP request handler with synthetic response objects.
function mockResponse() {
  const headers = new Map();
  return {
    statusCode: 200,
    body: null,
    setHeader(name, value) { headers.set(String(name).toLowerCase(), value); },
    getHeader(name) { return headers.get(String(name).toLowerCase()); },
    hasHeader(name) { return headers.has(String(name).toLowerCase()); },
    end(value) { this.body = value || ''; }
  };
}

async function verifyReleaseGate() {
  const full = {
    DOKE_ENABLE_STAGING_API: '1',
    DOKE_STAGING_RELEASE_ID: 'ord-a08-test-release-01',
    DOKE_STAGING_RELEASE_SHA: 'abcdef1234567890',
    DOKE_STAGING_ROLLBACK_RELEASE_ID: 'ord-a08-test-rollback-01',
    SUPABASE_URL: 'https://synthetic.example.invalid',
    SUPABASE_ANON_KEY: 'synthetic-anon-key',
    DOKE_ALLOWED_ORIGINS: 'http://unsecured.example.invalid'
  };
  let calls = 0;
  const fakeRuntime = { async handle() { calls++; return { status: 200, body: {} }; } };
  const scenarios = [
    ['environment missing', { ...full }, 'OPTIONS', '/orders', 'http://unsecured.example.invalid'],
    ['environment preview', { ...full, DOKE_ENVIRONMENT: 'preview' }, 'OPTIONS', '/orders', 'http://unsecured.example.invalid'],
    ['environment local', { ...full, DOKE_ENVIRONMENT: 'local' }, 'POST', '/orders', 'http://unsecured.example.invalid'],
    ['release identity missing', { DOKE_ENVIRONMENT: 'staging', DOKE_ENABLE_STAGING_API: '1' }, 'GET', '/health', null],
    ['staging disabled', { ...full, DOKE_ENVIRONMENT: 'staging', DOKE_ENABLE_STAGING_API: '0', DOKE_ALLOWED_ORIGINS: 'https://staging.example.invalid' }, 'OPTIONS', '/orders', 'https://staging.example.invalid'],
    ['staging missing Supabase client configuration', { ...full, DOKE_ENVIRONMENT: 'staging', SUPABASE_URL: '', SUPABASE_ANON_KEY: '', DOKE_ALLOWED_ORIGINS: 'https://staging.example.invalid' }, 'GET', '/health', null],
    ['staging missing Supabase anon key', { ...full, DOKE_ENVIRONMENT: 'staging', SUPABASE_ANON_KEY: '', DOKE_ALLOWED_ORIGINS: 'https://staging.example.invalid' }, 'OPTIONS', '/orders', 'https://staging.example.invalid'],
    ['staging whitespace-only Supabase URL', { ...full, DOKE_ENVIRONMENT: 'staging', SUPABASE_URL: '   ', DOKE_ALLOWED_ORIGINS: 'https://staging.example.invalid' }, 'GET', '/health', null]
  ];
  for (const [description, env, method, path, origin] of scenarios) {
    const handler = createNodeRequestHandler({ env, runtime: fakeRuntime });
    const response = mockResponse();
    await handler({ method, url: path, headers: origin ? { origin } : {} }, response);
    assert.equal(response.statusCode, 503, description);
    assert.equal(JSON.parse(response.body).error.code, 'DOKE_STAGING_RELEASE_NOT_READY', description);
    assert.equal(response.getHeader('access-control-allow-origin'), undefined, description);
    assert.equal(response.getHeader('access-control-allow-credentials'), undefined, description);
    checks++;
  }
  assert.equal(calls, 0, 'Denied requests never enter the domain runtime');
  checks++;

  const ready = { ...full, DOKE_ENVIRONMENT: 'staging', DOKE_ALLOWED_ORIGINS: 'https://staging.example.invalid' };
  const handler = createNodeRequestHandler({ env: ready, runtime: fakeRuntime });
  const response = mockResponse();
  await handler({ method: 'OPTIONS', url: '/orders', headers: { origin: 'https://staging.example.invalid' } }, response);
  assert.equal(response.statusCode, 204);
  assert.equal(response.getHeader('access-control-allow-origin'), 'https://staging.example.invalid');
  assert.equal(calls, 0);
  checks++;
  console.log('ORD-A08 staging CORS HTTPS boundary PASS: '+checks+' offline assertions, 0 external network requests.');
}
verifyReleaseGate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
