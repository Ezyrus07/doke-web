#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/js/repositories/services-repository.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hostileStorage(counter) {
  return {
    getItem() { counter.reads += 1; throw new Error('localStorage read is forbidden'); },
    setItem() { counter.writes += 1; throw new Error('localStorage write is forbidden'); },
    removeItem() { counter.removes += 1; throw new Error('localStorage remove is forbidden'); }
  };
}

function createContext(options = {}) {
  const storageCounter = { reads: 0, writes: 0, removes: 0 };
  const document = {
    documentElement: { setAttribute() {} },
    addEventListener() {}
  };
  const currentUser = options.currentUser || null;
  const window = {
    Doke: currentUser ? { session: { getCurrentUser() { return currentUser; } } } : {},
    DOKE_SUPABASE_CONFIG: options.config || { enabled: false },
    supabase: options.client ? { createClient() { return options.client; } } : options.sdk,
    localStorage: hostileStorage(storageCounter),
    sessionStorage: { getItem() { return null; }, setItem() {} },
    document,
    location: { href: 'https://doke.local/index.html' },
    console,
    crypto: { randomUUID() { return 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; } }
  };
  window.window = window;
  const context = {
    console,
    Promise,
    Date,
    JSON,
    Object,
    Array,
    String,
    Number,
    Math,
    RegExp,
    URL,
    Blob,
    Uint8Array,
    encodeURIComponent,
    decodeURIComponent,
    window,
    document
  };
  vm.runInNewContext(source, context, { filename: 'services-repository.js' });
  return { repository: window.Doke.repositories.services, storageCounter };
}

function createFailingClient(userId) {
  return {
    auth: {
      getSession() {
        return Promise.resolve({ data: { session: userId ? { user: { id: userId } } : null } });
      }
    },
    from() {
      return {
        select() { return Promise.reject(new Error('remote unavailable')); },
        upsert() {
          return {
            select() {
              return { single() { return Promise.reject(new Error('remote unavailable')); } };
            }
          };
        }
      };
    }
  };
}

(async () => {
  const fixtureUser = { id: 'fixture-owner' };
  const fixtureRuntime = createContext({ currentUser: fixtureUser });
  const fixture = await fixtureRuntime.repository.save({
    id: 'service_fixture_001',
    ownerId: fixtureUser.id,
    title: 'Serviço fixture',
    status: 'draft'
  });
  assert(fixture && fixture.id === 'service_fixture_001', 'Non-UUID fixture save must remain available in the current runtime.');
  const fixtureRead = await fixtureRuntime.repository.getById('service_fixture_001');
  assert(fixtureRead && fixtureRead.id === fixture.id, 'Fixture must be readable in the same runtime.');
  assert(fixtureRuntime.repository.getProviderStatus().provider === 'fixture-memory', 'Fixture runtime must report memory-only authority.');
  assert(fixtureRuntime.storageCounter.reads === 0 && fixtureRuntime.storageCounter.writes === 0 && fixtureRuntime.storageCounter.removes === 0, 'Fixture runtime must never access localStorage.');

  const freshRuntime = createContext({ currentUser: fixtureUser });
  const recovered = await freshRuntime.repository.getById('service_fixture_001');
  assert(recovered === null, 'A fresh runtime must not recover fixture services.');
  assert(freshRuntime.storageCounter.reads === 0 && freshRuntime.storageCounter.writes === 0, 'Fresh runtime must not inspect retired browser storage.');

  const uuidOwner = '11111111-1111-4111-8111-111111111111';
  const unavailable = createContext({
    currentUser: { id: uuidOwner },
    config: { enabled: true, servicesEnabled: true, url: 'https://example.supabase.co', anonKey: 'anon' }
  });
  let unavailableError = null;
  try {
    await unavailable.repository.save({ id: 'service_remote_001', ownerId: uuidOwner, title: 'Serviço remoto' });
  } catch (error) {
    unavailableError = error;
  }
  assert(unavailableError && unavailableError.code === 'DOKE_SERVICE_AUTHORITY_UNAVAILABLE', 'UUID-owned save must fail closed when Supabase authority is unavailable.');
  assert(unavailable.storageCounter.reads === 0 && unavailable.storageCounter.writes === 0, 'Remote authority failure must not activate localStorage fallback.');

  const remoteFailure = createContext({
    currentUser: { id: uuidOwner },
    config: { enabled: true, servicesEnabled: true, url: 'https://example.supabase.co', anonKey: 'anon' },
    client: createFailingClient(uuidOwner)
  });
  let listError = null;
  try {
    await remoteFailure.repository.list({ fresh: true, status: 'active' });
  } catch (error) {
    listError = error;
  }
  assert(listError && /remote unavailable/i.test(String(listError.message)), 'Configured remote catalog read must reject instead of returning a browser fallback.');
  assert(remoteFailure.repository.getProviderStatus().fallbackActive === false, 'Provider status must never claim a local fallback.');
  assert(remoteFailure.storageCounter.reads === 0 && remoteFailure.storageCounter.writes === 0, 'Remote read failure must not access localStorage.');

  console.log('PASS CAT-A02 service catalog authority retirement runtime');
})().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
