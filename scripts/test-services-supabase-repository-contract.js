#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const repositoryPath = path.join(root, 'assets/js/repositories/services-repository.js');
const migrationPath = path.join(root, 'supabase/migrations/009_service_catalog_shared_runtime.sql');
const source = fs.readFileSync(repositoryPath, 'utf8');
const migration = fs.readFileSync(migrationPath, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

[
  'external_id',
  'metadata jsonb',
  'services_public_read_published',
  'services_owner_insert',
  'services_owner_update',
  'service_media_public_read',
  'auth.uid()'
].forEach((token) => assert(migration.includes(token), `Migration missing: ${token}`));

[
  "REMOTE_TABLE = 'services'",
  "REMOTE_MEDIA_TABLE = 'service_media'",
  'fetchRemoteServices',
  'saveRemote',
  "AUTHORITY = 'supabase-or-fixture-memory'",
  'DOKE_SERVICE_AUTHORITY_UNAVAILABLE',
  "syncStatus: 'synced'",
  "upsert(payload, { onConflict: 'external_id' })"
].forEach((token) => assert(source.includes(token), `Repository missing remote contract: ${token}`));

const storageAccess = { reads: 0, writes: 0, removes: 0 };
const remoteRow = {
  id: 'd98dc31e-2677-45a3-a16f-17b777a7ca98',
  external_id: 'service_shared_001',
  professional_id: '7b2f8590-4930-4f0f-a104-e7f2cc738faa',
  title: 'Serviço compartilhado',
  description: 'Descrição pública',
  price_mode: 'quote',
  price_cents: null,
  status: 'published',
  city: 'Salvador',
  state: 'BA',
  metadata: { category: 'Tecnologia', providerName: 'Profissional remoto', verified: true },
  service_media: [{ url: 'data:image/png;base64,AAA', sort_order: 0, media_type: 'image' }],
  created_at: '2026-07-18T12:00:00.000Z',
  updated_at: '2026-07-18T12:00:00.000Z'
};

function createClient() {
  return {
    auth: {
      getSession() {
        return Promise.resolve({ data: { session: { user: { id: remoteRow.professional_id } } } });
      }
    },
    from(table) {
      if (table === 'services') {
        return {
          select() { return Promise.resolve({ data: [remoteRow], error: null }); },
          upsert() {
            return {
              select() {
                return {
                  single() { return Promise.resolve({ data: remoteRow, error: null }); }
                };
              }
            };
          }
        };
      }
      if (table === 'service_media') {
        return {
          delete() {
            return { eq() { return Promise.resolve({ data: [], error: null }); } };
          },
          insert() {
            return { select() { return Promise.resolve({ data: [], error: null }); } };
          }
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }
  };
}

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
  window: null,
  document: { documentElement: { setAttribute() {} }, addEventListener() {} },
  localStorage: {
    getItem() { storageAccess.reads += 1; throw new Error('localStorage must not be accessed by the service repository.'); },
    setItem() { storageAccess.writes += 1; throw new Error('localStorage must not be accessed by the service repository.'); },
    removeItem() { storageAccess.removes += 1; throw new Error('localStorage must not be accessed by the service repository.'); }
  },
  sessionStorage: { getItem() { return null; }, setItem() {} },
  DOKE_SUPABASE_CONFIG: { enabled: true, url: 'https://example.supabase.co', anonKey: 'anon' },
  supabase: { createClient }
};
context.window = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: repositoryPath });

(async () => {
  const repository = context.Doke.repositories.services;
  const publicItems = await repository.list({ status: 'active', fresh: true });
  assert(publicItems.length === 1, 'Remote published service must be visible in public list.');
  assert(publicItems[0].id === 'service_shared_001', 'External service id must remain the public canonical id.');
  assert(publicItems[0].ownerId === remoteRow.professional_id, 'Remote professional id must map to ownerId.');
  assert(publicItems[0].images.length === 1, 'Remote media must map to service images.');
  assert(publicItems[0].status === 'active', 'Published database status must map to active frontend status.');

  const saved = await repository.save({
    id: 'service_shared_001',
    ownerId: remoteRow.professional_id,
    title: 'Serviço compartilhado',
    description: 'Descrição pública',
    status: 'active',
    images: ['data:image/png;base64,AAA']
  });
  assert(saved.syncStatus === 'synced', 'Authenticated remote save must finish as synced.');
  assert(repository.authority === 'supabase-or-fixture-memory', 'Repository must expose the retired authority contract.');
  assert(repository.getProviderStatus().provider === 'supabase', 'Supabase must be reported as active provider.');
  assert(repository.getProviderStatus().fallbackActive === false, 'Repository must never report a browser fallback.');
  assert(storageAccess.reads === 0 && storageAccess.writes === 0 && storageAccess.removes === 0, 'localStorage must not be accessed by the service repository.');
  console.log('PASS services Supabase repository contract');
})().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
