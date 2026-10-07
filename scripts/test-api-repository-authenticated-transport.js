#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('assets/js/services/api-repository-provider.js', 'utf8');
const calls = [];
const userJwt = 'header.payload.signature';
const window = {
  Doke: {
    runtimeConfig: {
      environment: 'staging',
      dataProvider: 'api',
      apiBaseUrl: 'https://kontrat-staging-api.example',
      flags: { enableNetworkRequests: true }
    }
  },
  DokeSupabase: {
    getClient() {
      return {
        auth: {
          async getSession() {
            return { data: { session: { access_token: userJwt } } };
          }
        }
      };
    }
  },
  crypto: { randomUUID: () => '12345678-1234-4123-8123-123456789abc' },
  async fetch(url, options) {
    calls.push({ url, options });
    return { ok: true, status: 200, async json() { return { ok: true }; } };
  }
};
window.window = window;

vm.runInNewContext(source, {
  window,
  URL,
  URLSearchParams,
  Uint8Array,
  Date,
  Math,
  Object,
  Array,
  String,
  Promise,
  Error,
  JSON
}, { filename: 'api-repository-provider.js' });

(async () => {
  const provider = window.Doke.createApiRepositoryProvider();

  await provider.list('orders', {});
  await provider.create('orders', {
    serviceId: 'service-1',
    __requestMeta: {
      idempotencyKey: 'idem-order-1',
      requestId: 'request-order-1'
    }
  });

  assert.strictEqual(calls.length, 2);
  assert.strictEqual(calls[0].options.headers.Authorization, `Bearer ${userJwt}`);
  assert.strictEqual(calls[0].options.credentials, 'omit');
  assert.strictEqual(calls[0].options.headers['x-doke-request-issued-at'], undefined);
  assert.strictEqual(calls[0].options.headers['x-doke-request-nonce'], undefined);

  const mutationHeaders = calls[1].options.headers;
  assert.strictEqual(mutationHeaders.Authorization, `Bearer ${userJwt}`);
  assert.strictEqual(mutationHeaders['x-idempotency-key'], 'idem-order-1');
  assert.strictEqual(mutationHeaders['x-request-id'], 'request-order-1');
  assert.strictEqual(mutationHeaders['x-doke-request-nonce'], 'ord-12345678-1234-4123-8123-123456789abc');
  assert(/^ord-[A-Za-z0-9._:-]{16,160}$/.test(mutationHeaders['x-doke-request-nonce']), 'Mutation nonce must satisfy the canonical ORD-A07 freshness contract.');
  assert(!Number.isNaN(Date.parse(mutationHeaders['x-doke-request-issued-at'])));
  assert(!JSON.stringify(calls).includes('service_role'));
  assert(!JSON.stringify(calls).includes('sb_secret_'));

  console.log('Authenticated API repository transport passed.');
})().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
