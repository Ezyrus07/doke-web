#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repositorySource = fs.readFileSync(
  path.join(__dirname, '..', 'assets/js/repositories/search-repository.js'),
  'utf8'
);

function v1Response(request) {
  return {
    authority: 'public.search_public_services_v1',
    contractVersion: '1.0.0',
    request,
    items: [{ id: 'service-v1', remoteId: 'service-v1' }],
    page: { pageSize: request.pageSize, hasNext: false, nextCursor: null }
  };
}

function v2Response(request) {
  return {
    authority: 'public.search_public_services_v2',
    contractVersion: '2.0.0',
    request,
    ranking: { version: 'search-rank-v0', strategy: 'legacy_updated_at' },
    items: [{ id: 'service-v2', remoteId: 'service-v2' }],
    page: {
      pageSize: request.pageSize,
      hasNext: false,
      nextCursor: null,
      rankingVersion: 'search-rank-v0',
      asOf: '2026-07-29T11:00:00.000Z'
    }
  };
}

function createRuntime(overrides = {}) {
  const calls = { edge: [], rpc: [], fixture: [] };
  const client = {
    functions: {
      invoke(name, options) {
        calls.edge.push({ name, options });
        if (overrides.edgeInvoke) return overrides.edgeInvoke(name, options);
        return Promise.resolve({ data: v2Response(options.body), error: null });
      }
    },
    rpc(name, params) {
      calls.rpc.push({ name, params });
      if (overrides.rpcInvoke) return overrides.rpcInvoke(name, params);
      return Promise.resolve({ data: v1Response(params.p_request), error: null });
    }
  };

  const window = {
    DOKE_SUPABASE_CONFIG: Object.assign({
      enabled: true,
      servicesEnabled: true,
      url: 'https://staging.example.test',
      anonKey: 'anon-test-key',
      searchTransport: 'edge-v2',
      searchRollbackTransport: 'rpc-v1',
      searchEdgeFunction: 'search-public-services-v2'
    }, overrides.config || {}),
    Doke: {
      repositories: {
        services: {
          list() {
            calls.fixture.push(true);
            return Promise.resolve([]);
          }
        }
      }
    },
    DokeSupabase: { getClient: () => client },
    supabase: { createClient: () => client },
    crypto: { randomUUID: () => '11111111-1111-4111-8111-111111111111' }
  };

  const context = vm.createContext({
    window,
    Promise,
    Object,
    Array,
    Set,
    Number,
    String,
    Boolean,
    JSON,
    Error,
    Buffer,
    encodeURIComponent,
    decodeURIComponent,
    escape,
    unescape
  });
  vm.runInContext(repositorySource, context, { filename: 'search-repository.js' });
  return { repository: window.Doke.repositories.search, config: window.DOKE_SUPABASE_CONFIG, calls };
}

async function expectReject(promise, code) {
  let caught = null;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  assert(caught, `expected rejection ${code}`);
  assert.strictEqual(caught.code, code);
  return caught;
}

(async () => {
  const request = { query: 'limpeza', pageSize: 12 };

  const edgeRuntime = createRuntime();
  const edgePage = await edgeRuntime.repository.queryPage(request);
  assert.strictEqual(edgePage.authority, 'public.search_public_services_v2');
  assert.strictEqual(edgePage.contractVersion, '2.0.0');
  assert.strictEqual(edgePage.ranking.version, 'search-rank-v0');
  assert.strictEqual(edgeRuntime.calls.edge.length, 1);
  assert.strictEqual(edgeRuntime.calls.rpc.length, 0);
  assert.strictEqual(edgeRuntime.calls.fixture.length, 0);
  assert.strictEqual(edgeRuntime.calls.edge[0].name, 'search-public-services-v2');
  assert.strictEqual(edgeRuntime.calls.edge[0].options.body.query, 'limpeza');
  assert.strictEqual(edgeRuntime.calls.edge[0].options.headers['x-doke-request-id'], '11111111-1111-4111-8111-111111111111');
  assert.strictEqual(edgeRuntime.repository.getContract().transport, 'edge-v2');
  assert.strictEqual(edgeRuntime.repository.getContract().rollbackTransport, 'rpc-v1');

  const edgeFailureRuntime = createRuntime({
    edgeInvoke() {
      return Promise.resolve({
        data: null,
        error: {
          message: 'forced edge failure',
          context: {
            clone() { return this; },
            json() { return Promise.resolve({ error: 'DOKE_SEARCH_EDGE_CANARY_FAILURE', requestId: '22222222-2222-4222-8222-222222222222' }); }
          }
        }
      });
    }
  });
  const edgeError = await expectReject(edgeFailureRuntime.repository.queryPage(request), 'DOKE_SEARCH_EDGE_CANARY_FAILURE');
  assert.strictEqual(edgeError.requestId, '22222222-2222-4222-8222-222222222222');
  assert.strictEqual(edgeFailureRuntime.calls.edge.length, 1);
  assert.strictEqual(edgeFailureRuntime.calls.rpc.length, 0, 'Edge failure must not auto-fallback to RPC v1');
  assert.strictEqual(edgeFailureRuntime.calls.fixture.length, 0, 'Edge failure must not reopen fixture authority');

  const rollbackRuntime = createRuntime({ config: { searchTransport: 'rpc-v1' } });
  const rollbackPage = await rollbackRuntime.repository.queryPage(request);
  assert.strictEqual(rollbackPage.authority, 'public.search_public_services_v1');
  assert.strictEqual(rollbackPage.contractVersion, '1.0.0');
  assert.strictEqual(rollbackRuntime.calls.rpc.length, 1);
  assert.strictEqual(rollbackRuntime.calls.edge.length, 0);
  assert.strictEqual(rollbackRuntime.repository.getContract().transport, 'rpc-v1');
  assert.strictEqual(rollbackRuntime.repository.getContract().rollbackTransport, 'rpc-v1');

  const invalidRuntime = createRuntime({ config: { searchTransport: 'automatic' } });
  await expectReject(invalidRuntime.repository.queryPage(request), 'DOKE_SEARCH_TRANSPORT_INVALID');
  assert.strictEqual(invalidRuntime.calls.edge.length, 0);
  assert.strictEqual(invalidRuntime.calls.rpc.length, 0);
  assert.strictEqual(invalidRuntime.calls.fixture.length, 0);

  const invalidRollbackRuntime = createRuntime({ config: { searchRollbackTransport: 'edge-v2' } });
  await expectReject(invalidRollbackRuntime.repository.queryPage(request), 'DOKE_SEARCH_ROLLBACK_INVALID');
  assert.strictEqual(invalidRollbackRuntime.calls.edge.length, 0);
  assert.strictEqual(invalidRollbackRuntime.calls.rpc.length, 0);

  const privateSignalRuntime = createRuntime({
    edgeInvoke(_name, options) {
      const response = v2Response(options.body);
      response.items[0].rankScore = 10;
      return Promise.resolve({ data: response, error: null });
    }
  });
  await expectReject(privateSignalRuntime.repository.queryPage(request), 'DOKE_SEARCH_RESPONSE_INVALID');

  console.log('[SEARCH-A10] Browser transport runtime: PASS');
  console.log('[SEARCH-A10] Edge v2 is explicit, RPC v1 rollback is deliberate, and remote failures remain fail-closed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
