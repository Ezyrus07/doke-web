#!/usr/bin/env node
'use strict';

// Static local policy tests; no socket, Supabase, Vercel or other network calls.
const assert = require('node:assert/strict');
const {
  createCorsPolicy,
  parseAllowedOrigins,
  isAllowedOrigin,
  createNodeHttpServer
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

console.log('ORD-A08 staging CORS HTTPS boundary PASS: '+checks+' offline assertions, 0 external network requests.');
