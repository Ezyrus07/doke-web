#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repositorySource = fs.readFileSync(path.resolve(__dirname, '../assets/js/repositories/search-repository.js'), 'utf8');
const serviceSource = fs.readFileSync(path.resolve(__dirname, '../assets/js/services/search-service.js'), 'utf8');

function createContext(options = {}) {
  const fixtureCalls = { list: 0 };
  const rpcCalls = [];
  const fixtureItems = options.fixtureItems || [];
  const serviceRepository = {
    list: async () => {
      fixtureCalls.list += 1;
      return fixtureItems.map((item) => JSON.parse(JSON.stringify(item)));
    }
  };
  const remoteClient = options.remoteClient || {
    rpc: async (name, args) => {
      rpcCalls.push({ name, args });
      return options.remoteResult || { data: null, error: null };
    }
  };
  const context = {
    console,
    Promise,
    Map,
    Set,
    Array,
    String,
    Number,
    Boolean,
    Object,
    JSON,
    Date,
    Math,
    RegExp,
    Error,
    TypeError,
    URLSearchParams,
    encodeURIComponent,
    decodeURIComponent,
    escape,
    unescape,
    Buffer,
    btoa: (value) => Buffer.from(String(value), 'binary').toString('base64'),
    atob: (value) => Buffer.from(String(value), 'base64').toString('binary'),
    location: { search: '' },
    DOKE_SUPABASE_CONFIG: options.remote
      ? { enabled: true, servicesEnabled: true, url: 'https://search.invalid', anonKey: 'anon-test' }
      : { enabled: false, servicesEnabled: false },
    supabase: options.remote ? { createClient: () => remoteClient } : null,
    Doke: { repositories: { services: serviceRepository }, services: {} },
    window: null
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(repositorySource, context, { filename: 'search-repository.js' });
  vm.runInContext(serviceSource, context, { filename: 'search-service.js' });
  return { context, fixtureCalls, rpcCalls };
}

const fixtureItems = [
  {
    id: 'service-local', remoteId: '11111111-1111-4111-8111-111111111111',
    title: 'Eletricista residencial Salvador', description: 'Instalação elétrica',
    category: 'Eletricista', categorySlug: 'eletricista', state: 'BA', city: 'Salvador', neighborhood: 'Centro',
    online: false, guaranteed: true, emergency: true, availableToday: true, rating: 4.9,
    tags: ['elétrica'], keywords: ['tomada'], updatedAt: '2026-07-28T12:00:00Z'
  },
  {
    id: 'service-second', remoteId: '22222222-2222-4222-8222-222222222222',
    title: 'Encanador residencial Salvador', description: 'Reparo hidráulico',
    category: 'Encanador', categorySlug: 'encanador', state: 'BA', city: 'Salvador', neighborhood: 'Barra',
    online: false, rating: 4.7, tags: ['hidráulica'], keywords: ['vazamento'], updatedAt: '2026-07-28T11:00:00Z'
  },
  {
    id: 'service-online', remoteId: '33333333-3333-4333-8333-333333333333',
    title: 'Eletricista online', description: 'Consultoria elétrica por vídeo',
    category: 'Eletricista', categorySlug: 'eletricista', state: 'SP', city: 'São Paulo',
    online: true, rating: 4.8, tags: ['consultoria'], keywords: ['remoto'], updatedAt: '2026-07-28T10:00:00Z'
  },
  {
    id: 'service-nearby', remoteId: '44444444-4444-4444-8444-444444444444',
    title: 'Eletricista Lauro de Freitas', description: 'Atendimento metropolitano',
    category: 'Eletricista', categorySlug: 'eletricista', state: 'BA', city: 'Lauro de Freitas', neighborhood: 'Centro',
    online: false, rating: 4.6, updatedAt: '2026-07-28T09:00:00Z'
  },
  {
    id: 'service-old', remoteId: '55555555-5555-4555-8555-555555555555',
    title: 'Pintura residencial Salvador', description: 'Pintura interna',
    category: 'Pintura', categorySlug: 'pintura', state: 'BA', city: 'Salvador', neighborhood: 'Rio Vermelho',
    online: false, rating: 4.5, updatedAt: '2026-07-28T08:00:00Z'
  }
];

async function fixtureRuntime() {
  const runtime = createContext({ fixtureItems });
  const api = runtime.context.Doke.services.search;
  assert(api && typeof api.queryPage === 'function', 'search service must expose queryPage');

  const local = await api.queryPage({
    query: 'eletricista', state: 'BA', city: 'Salvador', serviceMode: 'local', pageSize: 12
  });
  assert.deepStrictEqual(Array.from(local.items, (item) => item.id), ['service-local']);
  assert.strictEqual(local.items[0].geographicMatch, 'city');

  const anyMode = await api.queryPage({
    query: 'eletricista', state: 'BA', city: 'Salvador', serviceMode: 'any', pageSize: 12
  });
  assert.deepStrictEqual(
    Array.from(anyMode.items, (item) => item.id),
    ['service-local', 'service-online'],
    'any mode must combine exact local eligibility with online services'
  );
  assert(!anyMode.items.some((item) => item.id === 'service-nearby'), 'different city must not leak into exact geographic eligibility');

  const online = await api.queryPage({ query: 'eletricista', serviceMode: 'online', pageSize: 12 });
  assert.deepStrictEqual(Array.from(online.items, (item) => item.id), ['service-online']);

  const filtered = await api.queryPage({
    categories: ['eletricista'], minRating: 4.8, guaranteed: true, emergency: true, availableToday: true, pageSize: 12
  });
  assert.deepStrictEqual(Array.from(filtered.items, (item) => item.id), ['service-local']);

  const first = await api.queryPage({ pageSize: 2 });
  assert.strictEqual(first.items.length, 2);
  assert.strictEqual(first.page.hasNext, true);
  assert(first.page.nextCursor, 'first fixture page must return an opaque cursor');
  const second = await api.queryPage({ pageSize: 2, cursor: first.page.nextCursor });
  const firstIds = new Set(first.items.map((item) => item.id));
  assert(!second.items.some((item) => firstIds.has(item.id)), 'fixture cursor page must not repeat a service');
  assert.deepStrictEqual(Array.from(second.items, (item) => item.id), ['service-online', 'service-nearby']);

  await assert.rejects(
    () => api.queryPage({ pageSize: 25 }),
    (error) => error && error.code === 'DOKE_SEARCH_PAGE_SIZE_INVALID'
  );
  await assert.rejects(
    () => api.queryPage({ unknownField: true }),
    (error) => error && error.code === 'DOKE_SEARCH_REQUEST_UNKNOWN_FIELD'
  );
  await assert.rejects(
    () => api.queryPage({ cursor: 'not-valid-base64' }),
    (error) => error && error.code === 'DOKE_SEARCH_CURSOR_INVALID'
  );
  assert(runtime.fixtureCalls.list >= 1, 'fixture runtime must use current-runtime service authority');
}

async function remoteRuntime() {
  const expectedResponse = {
    authority: 'public.search_public_services_v1',
    contractVersion: '1.0.0',
    request: { query: 'eletricista', pageSize: 12 },
    items: [{ id: 'remote-service', remoteId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }],
    page: { pageSize: 12, hasNext: false, nextCursor: null }
  };
  const runtime = createContext({ remote: true, remoteResult: { data: expectedResponse, error: null } });
  const result = await runtime.context.Doke.services.search.queryPage({ query: 'eletricista', pageSize: 12 });
  assert.strictEqual(result.items[0].id, 'remote-service');
  assert.strictEqual(runtime.rpcCalls.length, 1, 'remote runtime must issue exactly one bounded RPC');
  assert.strictEqual(runtime.rpcCalls[0].name, 'search_public_services_v1');
  assert.deepStrictEqual(Object.keys(runtime.rpcCalls[0].args), ['p_request']);
  assert.strictEqual(runtime.fixtureCalls.list, 0, 'configured remote failure/success path cannot read fixture catalog');
}

async function remoteFailureRuntime() {
  const runtime = createContext({
    remote: true,
    remoteClient: {
      rpc: async (name, args) => {
        runtime.rpcCalls.push({ name, args });
        return { data: null, error: new Error('network unavailable') };
      }
    }
  });
  await assert.rejects(
    () => runtime.context.Doke.services.search.queryPage({ query: 'eletricista' }),
    (error) => error && error.code === 'DOKE_SEARCH_AUTHORITY_UNAVAILABLE'
  );
  assert.strictEqual(runtime.fixtureCalls.list, 0, 'remote failure must fail closed without fixture fallback');
}

function sourceContract() {
  assert(repositorySource.includes("RPC_NAME = 'search_public_services_v1'"));
  assert(repositorySource.includes('MAX_PAGE_SIZE = 24'));
  assert(repositorySource.includes("error.code = code"));
  assert(repositorySource.includes("authority: 'fixture-memory.search_public_services_v1'"));
  assert(!repositorySource.includes('localStorage'));
  assert(!repositorySource.includes('sessionStorage'));
  assert(serviceSource.includes('queryPage: queryPage'));
  assert(serviceSource.includes('Legacy browser list remains executable until SEARCH-A05'));
}

(async () => {
  sourceContract();
  await fixtureRuntime();
  await remoteRuntime();
  await remoteFailureRuntime();
  console.log('[SEARCH-A04] bounded server search runtime: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
