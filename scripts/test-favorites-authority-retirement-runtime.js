#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const UUID_USER = '11111111-1111-4111-8111-111111111111';
const UUID_SERVICE = '22222222-2222-4222-8222-222222222222';

function createDocument() {
  const attributes = new Map();
  return {
    documentElement: {
      setAttribute(name, value) { attributes.set(String(name), String(value)); },
      getAttribute(name) { return attributes.get(String(name)) || null; }
    }
  };
}

function createRemoteClient(rows, calls) {
  return {
    from(table) {
      assert.strictEqual(table, 'favorites');
      return {
        select(columns) {
          calls.push({ operation: 'select', columns });
          return {
            eq(column, value) {
              calls.push({ operation: 'select.eq', column, value });
              return Promise.resolve({ data: rows.map((serviceId) => ({ service_id: serviceId })), error: null });
            }
          };
        },
        insert(payload) {
          calls.push({ operation: 'insert', payload });
          if (!rows.includes(payload.service_id)) rows.push(payload.service_id);
          return Promise.resolve({ data: null, error: null });
        },
        delete() {
          calls.push({ operation: 'delete' });
          const filters = [];
          const chain = {
            eq(column, value) {
              filters.push({ column, value });
              calls.push({ operation: 'delete.eq', column, value });
              return chain;
            },
            then(resolve, reject) {
              const serviceFilter = filters.find((filter) => filter.column === 'service_id');
              if (serviceFilter) {
                const index = rows.indexOf(serviceFilter.value);
                if (index !== -1) rows.splice(index, 1);
              }
              return Promise.resolve({ data: null, error: null }).then(resolve, reject);
            }
          };
          return chain;
        }
      };
    }
  };
}

function createContext(options = {}) {
  const document = createDocument();
  const calls = [];
  const rows = options.rows || [];
  const currentUser = options.user === undefined ? { id: 'fixture-user' } : options.user;
  const context = {
    console,
    Promise,
    Map,
    Set,
    Object,
    Array,
    String,
    Boolean,
    Error,
    JSON,
    document,
    DOKE_SUPABASE_CONFIG: options.config || { enabled: false, url: '', anonKey: '' },
    Doke: {
      repositories: {},
      services: {},
      session: { getCurrentUser: () => currentUser }
    },
    window: null
  };
  if (options.remoteClient !== false) {
    context.DokeSupabase = { getClient: () => createRemoteClient(rows, calls) };
  }
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read('assets/js/repositories/favorites-repository.js'), context, { filename: 'favorites-repository.js' });
  vm.runInContext(read('assets/js/services/favorites-service.js'), context, { filename: 'favorites-service.js' });
  return { context, calls, rows };
}

async function fixtureMemoryRuntime() {
  const { context } = createContext({
    user: { id: 'fixture-user' },
    config: { enabled: false, url: '', anonKey: '' },
    remoteClient: false
  });
  const service = context.Doke.services.favorites;
  assert(service, 'favorites service must be registered');
  assert.strictEqual(await service.isFavorite('fixture-service'), false);
  assert.strictEqual(await service.add('fixture-service'), true);
  assert.strictEqual(await service.isFavorite('fixture-service'), true);
  assert.deepStrictEqual(Array.from(await service.list()), ['fixture-service']);
  assert.strictEqual(await service.toggle('fixture-service'), false);
  assert.strictEqual(await service.isFavorite('fixture-service'), false);
  assert.strictEqual(context.Doke.repositories.favorites.getProviderState(), 'fixture-memory');
}

async function remoteRuntime() {
  const { context, calls, rows } = createContext({
    user: { id: UUID_USER },
    config: { enabled: true, url: 'https://staging.example.supabase.co', anonKey: 'anon-key' },
    rows: []
  });
  const service = context.Doke.services.favorites;
  assert.strictEqual(await service.isFavorite(UUID_SERVICE), false);
  assert.strictEqual(await service.add(UUID_SERVICE), true);
  assert.strictEqual(rows.includes(UUID_SERVICE), true);
  assert.strictEqual(await service.isFavorite(UUID_SERVICE), true);
  assert.strictEqual(await service.remove(UUID_SERVICE), false);
  assert.strictEqual(rows.includes(UUID_SERVICE), false);

  const insert = calls.find((call) => call.operation === 'insert');
  assert.deepStrictEqual(insert.payload, { user_id: UUID_USER, service_id: UUID_SERVICE });
  assert(calls.some((call) => call.operation === 'select.eq' && call.column === 'user_id' && call.value === UUID_USER));
  assert(calls.some((call) => call.operation === 'delete.eq' && call.column === 'user_id' && call.value === UUID_USER));
  assert(calls.some((call) => call.operation === 'delete.eq' && call.column === 'service_id' && call.value === UUID_SERVICE));
  assert.strictEqual(context.Doke.repositories.favorites.getProviderState(), 'supabase');
}

async function anonymousRuntime() {
  const { context } = createContext({ user: null, remoteClient: false });
  await assert.rejects(
    () => context.Doke.services.favorites.add('fixture-service'),
    (error) => error && error.code === 'DOKE_FAVORITES_AUTH_REQUIRED'
  );
  assert.deepStrictEqual(Array.from(await context.Doke.services.favorites.list()), []);
}

async function failClosedRuntime() {
  const { context } = createContext({
    user: { id: UUID_USER },
    config: { enabled: true, url: 'https://staging.example.supabase.co', anonKey: 'anon-key' },
    remoteClient: false
  });
  await assert.rejects(
    () => context.Doke.services.favorites.add(UUID_SERVICE),
    (error) => error && error.code === 'DOKE_FAVORITES_AUTHORITY_UNAVAILABLE'
  );
  assert.strictEqual(context.Doke.repositories.favorites.getProviderState(), 'remote-unavailable');
}

function sourceContract() {
  const repository = read('assets/js/repositories/favorites-repository.js');
  const service = read('assets/js/services/favorites-service.js');
  const experience = read('assets/js/pages/detail-ad-experience.js');
  const controller = read('assets/js/pages/detalhe-anuncio-data-controller.js');

  [repository, service, experience].forEach((source) => {
    assert(!source.includes('localStorage'), 'favorites authority files must not access localStorage');
    assert(!source.includes('doke.service-favorites.v1'), 'retired favorite storage key must not remain');
  });
  assert(repository.includes("AUTHORITY = 'supabase-or-fixture-memory'"));
  assert(repository.includes("REMOTE_TABLE = 'favorites'"));
  assert(repository.includes("error.code = 'DOKE_FAVORITES_AUTH_REQUIRED'"));
  assert(repository.includes("error.code = 'DOKE_FAVORITES_AUTHORITY_UNAVAILABLE'"));
  assert(experience.includes('Doke.services && Doke.services.favorites'));
  assert(experience.includes("auth/login.html?next="));

  const repositoryIndex = controller.indexOf("key: 'favorites-repository'");
  const serviceIndex = controller.indexOf("key: 'favorites-service'");
  const experienceIndex = controller.indexOf("key: 'detail-ad-experience'");
  assert(repositoryIndex !== -1 && serviceIndex > repositoryIndex && experienceIndex > serviceIndex, 'favorite modules must load repository -> service -> experience');
  assert(controller.indexOf('ensureFavoritesAuthority()') < controller.indexOf('return load(root);'), 'favorite authority must load before detail data publication');
}

(async () => {
  sourceContract();
  await fixtureMemoryRuntime();
  await remoteRuntime();
  await anonymousRuntime();
  await failClosedRuntime();
  console.log('[SEARCH-A02] Favorites authority retirement runtime: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
