#!/usr/bin/env node
'use strict';

// Import the actual TypeScript shared Edge module with Node 24. No Deno deployment,
// network request, credentials, sockets, or hosted project access is required.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const runtimeEnv = new Map();
globalThis.Deno = { env: { get: (name) => runtimeEnv.get(name) } };

const root = resolve(import.meta.dirname, '..');
const policyPath = join(root, 'supabase/functions/_shared/http-security.ts');
const {
  resolveAllowedOrigin, responseHeaders, rejectDisallowedOrigin, preflightResponse
} = await import(pathToFileURL(policyPath).href);

let checks = 0;
const requestFor = (origin) => new Request('https://edge.example.invalid/function', {
  method: 'OPTIONS',
  headers: origin === undefined ? {} : { Origin: origin }
});

function prepareEnv(values = {}) {
  runtimeEnv.clear();
  for (const [name, value] of Object.entries(values)) runtimeEnv.set(name, value);
}

function expectAllowed(description, origin, config = {}) {
  prepareEnv(config);
  const req = requestFor(origin);
  assert.equal(resolveAllowedOrigin(req), origin, description);
  const preflight = preflightResponse(req);
  assert.equal(preflight.status, 204, description);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin, description);
  assert.equal(preflight.headers.get('Access-Control-Allow-Credentials'), null, description);
  assert.equal(rejectDisallowedOrigin(req), null, description);
  checks++;
}

function expectRejected(description, origin, config = {}) {
  prepareEnv(config);
  const req = requestFor(origin);
  assert.equal(resolveAllowedOrigin(req), null, description);
  const preflight = preflightResponse(req);
  assert.equal(preflight.status, 403, description);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), null, description);
  assert.equal(preflight.headers.get('Access-Control-Allow-Credentials'), null, description);
  assert.equal((awaitRejectBody(preflight)), true, description);
  checks++;
}

// Verify the rejected body's status and content type without reading any external body.
function awaitRejectBody(response) {
  return response.headers.get('Content-Type')?.includes('application/json') === true;
}

// HTTPS explicit origins and the repository's established GitHub Pages default.
expectAllowed('fixed secure default', 'https://ezyrus07.github.io');
expectAllowed('configured secure origin', 'https://preview.example.invalid', {
  DOKE_ALLOWED_ORIGINS: 'https://preview.example.invalid'
});
expectAllowed('configured secure origin with nondefault port', 'https://preview.example.invalid:8443', {
  DOKE_ALLOWED_ORIGINS: 'https://preview.example.invalid:8443'
});
expectAllowed('two valid HTTPS origins', 'https://second.example.invalid', {
  DOKE_ALLOWED_ORIGINS: 'https://first.example.invalid, https://second.example.invalid'
});
expectRejected('not in allowlist', 'https://unlisted.example.invalid', {
  DOKE_ALLOWED_ORIGINS: 'https://preview.example.invalid'
});
expectRejected('port must match exactly', 'https://preview.example.invalid:8443', {
  DOKE_ALLOWED_ORIGINS: 'https://preview.example.invalid'
});

// Default denial, including IPv4 and IPv6 loopback.
for (const origin of ['http://localhost:3010', 'http://127.0.0.1:3010', 'http://[::1]:3010', 'https://localhost:3010']) {
  expectRejected('loopback denied by default: ' + origin, origin);
}
expectRejected('implicit boolean 1 is not opt-in', 'http://localhost:3010', { DOKE_ALLOW_LOCAL_ORIGINS: '1' });
expectRejected('uppercase TRUE is not explicit opt-in', 'http://localhost:3010', { DOKE_ALLOW_LOCAL_ORIGINS: 'TRUE' });
expectRejected('explicit false loopback disabled', 'http://localhost:3010', { DOKE_ALLOW_LOCAL_ORIGINS: 'false' });

// Explicit local testing permission; it never permits a non-loopback HTTP origin.
for (const origin of ['http://localhost:3010', 'http://127.0.0.1:3010', 'http://[::1]:3010', 'https://localhost:3010']) {
  expectAllowed('explicit local development: ' + origin, origin, { DOKE_ALLOW_LOCAL_ORIGINS: 'true' });
}
expectRejected('local opt-in cannot enable external HTTP', 'http://outside.example.invalid', {
  DOKE_ALLOW_LOCAL_ORIGINS: 'true',
  DOKE_ALLOWED_ORIGINS: 'http://outside.example.invalid'
});
expectRejected('configured local host still requires opt-in', 'http://localhost:3010', {
  DOKE_ALLOWED_ORIGINS: 'http://localhost:3010'
});
expectAllowed('configured local host with opt-in', 'http://localhost:3010', {
  DOKE_ALLOWED_ORIGINS: 'http://localhost:3010', DOKE_ALLOW_LOCAL_ORIGINS: 'true'
});

// A malformed entry denies the full custom list, including otherwise-valid entries.
for (const [description, value] of [
  ['external HTTP', 'http://insecure.example.invalid'],
  ['HTTP mixed with HTTPS', 'https://preview.example.invalid,http://insecure.example.invalid'],
  ['wildcard', '*'],
  ['path', 'https://preview.example.invalid/path'],
  ['query', 'https://preview.example.invalid/?q=1'],
  ['fragment', 'https://preview.example.invalid/#fragment'],
  ['userinfo', 'https://user@preview.example.invalid'],
  ['trailing slash', 'https://preview.example.invalid/'],
  ['trailing comma', 'https://preview.example.invalid,'],
  ['empty list item', 'https://preview.example.invalid,,https://second.example.invalid'],
  ['duplicate', 'https://preview.example.invalid,https://preview.example.invalid'],
  ['explicit standard port', 'https://preview.example.invalid:443'],
  ['mixed-case scheme', 'HTTPS://preview.example.invalid']
]) {
  expectRejected('invalid configured origin: ' + description, 'https://preview.example.invalid', {
    DOKE_ALLOWED_ORIGINS: value
  });
}
expectRejected('invalid custom list also disables hardcoded default for browser CORS',
  'https://ezyrus07.github.io', { DOKE_ALLOWED_ORIGINS: '*' });

// Rejected request headers never gain CORS permission.
for (const origin of ['null', 'file:///', 'http://unlisted.example.invalid',
                      'https://preview.example.invalid/path', 'https://user@preview.example.invalid']) {
  expectRejected('invalid request Origin: ' + origin, origin, {
    DOKE_ALLOWED_ORIGINS: 'https://preview.example.invalid'
  });
}

// Existing no-Origin behavior, used by non-browser clients, is not a CORS authorization.
prepareEnv();
const noOrigin = requestFor(undefined);
assert.equal(resolveAllowedOrigin(noOrigin), '');
assert.equal(preflightResponse(noOrigin).status, 204);
assert.equal(responseHeaders(noOrigin).get('Access-Control-Allow-Origin'), null);
checks++;

// Caller-supplied response headers must not override the shared CORS boundary.
prepareEnv({ DOKE_ALLOWED_ORIGINS: 'https://preview.example.invalid' });
const extra = {
  'Access-Control-Allow-Origin': 'https://untrusted.example.invalid',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Expose-Headers': '*'
};
const blockedExtra = responseHeaders(requestFor('https://untrusted.example.invalid'), extra);
assert.equal(blockedExtra.get('Access-Control-Allow-Origin'), null);
assert.equal(blockedExtra.get('Access-Control-Allow-Credentials'), null);
assert.equal(blockedExtra.get('Access-Control-Allow-Headers'), null);
checks++;
const allowedExtra = responseHeaders(requestFor('https://preview.example.invalid'), extra);
assert.equal(allowedExtra.get('Access-Control-Allow-Origin'), 'https://preview.example.invalid');
assert.equal(allowedExtra.get('Access-Control-Allow-Credentials'), null);
assert.equal(allowedExtra.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
assert.notEqual(allowedExtra.get('Access-Control-Allow-Headers'), '*');
checks++;

// All eight importers must retain their shared origin rejection boundary.
const functionsRoot = join(root, 'supabase/functions');
const consumers = readdirSync(functionsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
  .map((entry) => ({
    name: entry.name,
    source: (() => {
      try { return readFileSync(join(functionsRoot, entry.name, 'index.ts'), 'utf8'); }
      catch { return ''; }
    })()
  }))
  .filter((entry) => entry.source.includes('../_shared/http-security.ts'));
const expectedConsumers = [
  'financial-operations', 'order-event-operations', 'professional-verification-operations',
  'quote-template-ai', 'search-public-services-v2', 'self-service-operations',
  'service-moderation-operations', 'staging-finance-sandbox'
];
assert.deepEqual(consumers.map((entry) => entry.name).sort(), expectedConsumers.sort());
for (const consumer of consumers) {
  assert.match(consumer.source, /rejectDisallowedOrigin\s*\(\s*req\s*\)/,
    'Missing rejection gate in ' + consumer.name);
  assert.match(consumer.source, /preflightResponse\s*\(\s*req\s*\)/,
    'Missing preflight gate in ' + consumer.name);
  checks++;
}

console.log('Supabase Edge CORS origin security PASS: ' + checks +
  ' offline assertions, ' + consumers.length + ' function consumers, zero network requests.');
