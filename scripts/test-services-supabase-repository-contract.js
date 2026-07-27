#!/usr/bin/env node
'use strict';

const nodeAssert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const repositoryPath = path.join(root, 'assets/js/repositories/services-repository.js');
const migrationPath = path.join(root, 'supabase/migrations/149_service_lifecycle_authority.sql');
const source = fs.readFileSync(repositoryPath, 'utf8');
const migration = fs.readFileSync(migrationPath, 'utf8');
function assert(condition, message) { if (!condition) throw new Error(message); }

[
  'transition_owned_service_lifecycle',
  'revoke insert, update, delete on table public.services from anon, authenticated',
  'SERVICE_OWNERSHIP_REQUIRED'
].forEach((token) => assert(migration.includes(token), 'Lifecycle migration missing: ' + token));
[
  "REMOTE_TABLE = 'services'",
  'fetchRemoteServices',
  "AUTHORITY = 'supabase-or-fixture-memory'",
  'DOKE_SERVICE_AUTHORITY_UNAVAILABLE',
  'DOKE_SERVICE_DIRECT_MUTATION_FORBIDDEN',
  "invokeSelfService('transition_owned_service_lifecycle'"
].forEach((token) => assert(source.includes(token), 'Repository missing remote contract: ' + token));
assert(!source.includes('function saveRemote(service)'), 'Direct remote save function must be retired.');
assert(!source.includes("upsert(payload, { onConflict: 'external_id' })"), 'Direct services upsert must be retired.');

const storageAccess = { reads: 0, writes: 0, removes: 0 };
const remoteRow = {
  id: 'd98dc31e-2677-45a3-a16f-17b777a7ca98', external_id: 'service_shared_001',
  professional_id: '7b2f8590-4930-4f0f-a104-e7f2cc738faa', title: 'Serviço compartilhado',
  description: 'Descrição pública', price_mode: 'quote', price_cents: null, status: 'published',
  moderation_status: 'published', approved_version_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  city: 'Salvador', state: 'BA', metadata: { category: 'Tecnologia', providerName: 'Profissional remoto', verified: true },
  service_media: [{ url: 'data:image/png;base64,AAA', sort_order: 0, media_type: 'image' }],
  created_at: '2026-07-18T12:00:00.000Z', updated_at: '2026-07-18T12:00:00.000Z'
};
function createClient() {
  return {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: remoteRow.professional_id } } } }) },
    from(table) {
      if (table === 'services') return {
        select() {
          return {
            eq() { return this; },
            or() { return this; },
            maybeSingle() { return Promise.resolve({ data: remoteRow, error: null }); },
            then(resolve) { return Promise.resolve({ data: [remoteRow], error: null }).then(resolve); }
          };
        }
      };
      if (table === 'service_metric_totals') return { select() { return { eq() { return { maybeSingle: () => Promise.resolve({ data: null, error: null }) }; } }; } };
      throw new Error('Unexpected table: ' + table);
    }
  };
}
const context = {
  console, Promise, Date, JSON, Object, Array, String, Number, Math, RegExp, URL, Blob, Uint8Array, encodeURIComponent, decodeURIComponent,
  window: null, document: { documentElement: { setAttribute() {} }, addEventListener() {} },
  localStorage: {
    getItem() { storageAccess.reads += 1; throw new Error('localStorage must not be accessed by the service repository.'); },
    setItem() { storageAccess.writes += 1; throw new Error('localStorage must not be accessed by the service repository.'); },
    removeItem() { storageAccess.removes += 1; throw new Error('localStorage must not be accessed by the service repository.'); }
  },
  sessionStorage: { getItem() { return null; }, setItem() {} },
  DOKE_SUPABASE_CONFIG: { enabled: true, url: 'https://example.supabase.co', anonKey: 'anon' },
  supabase: { createClient },
  DokeSupabase: { getClient: createClient, invokeSelfService: () => Promise.resolve({ externalId: remoteRow.external_id }) }
};
context.window = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: repositoryPath });
(async () => {
  const repository = context.Doke.repositories.services;
  const publicItems = await repository.list({ status: 'active', fresh: true });
  assert(publicItems.length === 1 && publicItems[0].status === 'active', 'Remote published service must remain readable.');
  await nodeAssert.rejects(
    repository.save({ id: remoteRow.external_id, ownerId: remoteRow.professional_id, title: remoteRow.title }),
    (error) => error && error.code === 'DOKE_SERVICE_DIRECT_MUTATION_FORBIDDEN'
  );
  assert(repository.authority === 'supabase-or-fixture-memory', 'Repository authority contract changed unexpectedly.');
  assert(repository.getProviderStatus().provider === 'supabase', 'Supabase must remain the active provider.');
  assert(repository.getProviderStatus().fallbackActive === false, 'Browser fallback must remain disabled.');
  assert(storageAccess.reads === 0 && storageAccess.writes === 0 && storageAccess.removes === 0, 'localStorage must not be accessed.');
  console.log('PASS services Supabase repository contract');
})().catch((error) => { console.error(error.stack || error.message || error); process.exitCode = 1; });
