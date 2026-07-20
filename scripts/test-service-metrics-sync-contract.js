'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const repositorySource = fs.readFileSync(path.join(root, 'assets/js/repositories/services-repository.js'), 'utf8');
const detailSource = fs.readFileSync(path.join(root, 'assets/js/pages/detalhe-anuncio.js'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/030_service_catalog_sync_metrics.sql'), 'utf8');
const html = fs.readFileSync(path.join(root, 'detalhe-anuncio.html'), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(/create unique index if not exists idx_services_external_id\s+on public\.services\(external_id\);/i.test(migration), 'external_id must use a non-partial unique index compatible with PostgREST on_conflict.');
expect(!/idx_services_external_id[\s\S]{0,120}where\s*\(?.*external_id/is.test(migration), 'external_id conflict index must not remain partial.');
expect(/create table if not exists public\.service_metric_events/i.test(migration), 'Service metric events table must exist.');
expect(/unique \(service_id, event_type, visitor_key, occurred_on\)/i.test(migration), 'Metrics must deduplicate daily events per visitor and type.');
expect(/with \(security_invoker = true\)/i.test(migration), 'Metrics totals view must honor the caller RLS context.');
expect(/s\.professional_id is distinct from auth\.uid\(\)/i.test(migration), 'Owners must not increment their own metrics.');
expect(/event_type in \('budget', 'message'\)[\s\S]*auth\.uid\(\) is not null/i.test(migration), 'Contact metrics must require an authenticated actor.');

expect(/syncError:\s*''/.test(repositorySource), 'Successful remote synchronization must clear stale syncError state.');
expect(/repositories\.serviceMetrics = Object\.freeze/.test(repositorySource), 'Service metrics must be exposed through the repository boundary.');
expect(/recordBudgetContact/.test(repositorySource) && /recordMessageContact/.test(repositorySource), 'Budget and message contacts must have separate metric events.');
expect(/ignoreDuplicates:\s*true/.test(repositorySource), 'Metric event writes must be idempotent on their daily unique key.');
expect(!/Falha ao sincronizar/.test(detailSource), 'Recoverable local fallback must not be labeled as a destructive synchronization failure.');
expect(/recordVisitorView/.test(detailSource), 'Detail hydration must record visitor views.');
expect(/recordBudgetContact/.test(detailSource) && /recordMessageContact/.test(detailSource), 'Detail CTAs must record contact intent before navigation.');
expect(/services-repository\.js\?v=20260719-sync-metrics-v1/.test(html), 'Detail page must bust the stale services repository cache.');

let currentUser = { id: '11111111-1111-4111-8111-111111111111' };
const metricWrites = [];
const sessionStorageMap = new Map();
const client = {
  auth: {
    getSession() {
      return Promise.resolve({ data: { session: currentUser ? { user: currentUser } : null } });
    }
  },
  from(table) {
    if (table === 'service_metric_events') {
      return {
        upsert(payload, options) {
          metricWrites.push({ payload, options });
          return Promise.resolve({ data: null, error: null });
        }
      };
    }
    if (table === 'service_metric_totals') {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle() {
                  return Promise.resolve({
                    data: { views_count: 7, contacts_count: 3, budget_count: 2, message_count: 1 },
                    error: null
                  });
                }
              };
            }
          };
        }
      };
    }
    throw new Error('Unexpected table in metrics contract test: ' + table);
  }
};

const documentStub = {
  documentElement: { setAttribute() {} },
  addEventListener() {}
};
const windowStub = {
  Doke: {},
  DOKE_SUPABASE_CONFIG: { enabled: true, servicesEnabled: true, url: 'https://example.supabase.co', anonKey: 'anon' },
  supabase: { createClient: () => client },
  document: documentStub,
  location: { href: 'https://doke.local/detalhe-anuncio.html' },
  localStorage: { getItem: () => null, setItem() {} },
  sessionStorage: {
    getItem(key) { return sessionStorageMap.get(key) || null; },
    setItem(key, value) { sessionStorageMap.set(key, value); }
  },
  crypto: { randomUUID: () => '22222222-2222-4222-8222-222222222222' },
  console
};
windowStub.window = windowStub;
windowStub.Blob = Blob;
const context = vm.createContext({
  window: windowStub,
  document: documentStub,
  console,
  URL,
  Blob,
  Uint8Array,
  Promise,
  Date,
  Math,
  JSON,
  setTimeout,
  clearTimeout
});
vm.runInContext(repositorySource, context);

(async () => {
  const metrics = windowStub.Doke.repositories.serviceMetrics;
  const visitorService = {
    id: 'service-public-1',
    remoteId: '33333333-3333-4333-8333-333333333333',
    ownerId: '44444444-4444-4444-8444-444444444444',
    professionalId: '44444444-4444-4444-8444-444444444444',
    status: 'active'
  };
  const viewResult = await metrics.recordView(visitorService);
  expect(viewResult.recorded === true, 'A non-owner visitor view must be recorded.');
  expect(metricWrites.length === 1 && metricWrites[0].payload.event_type === 'view', 'View event payload must reach the metrics table.');
  expect(metricWrites[0].options.onConflict === 'service_id,event_type,visitor_key,occurred_on', 'Metric upsert must use the daily unique key.');

  currentUser = { id: visitorService.ownerId };
  const ownerViewResult = await metrics.recordView(visitorService);
  expect(ownerViewResult.recorded === false && ownerViewResult.reason === 'owner-view', 'The service owner must not increase their own view count.');
  expect(metricWrites.length === 1, 'Owner view must not create a metric event.');

  const totals = await metrics.getTotals(visitorService);
  expect(totals.viewsCount === 7 && totals.contactsCount === 3, 'Owner totals must map the secure aggregate view.');
  expect(totals.syncStatus === 'synced', 'A resolved remote service must reconcile the local synchronization state.');

  if (failures.length) {
    console.error('[service-metrics-sync-contract] FAIL');
    failures.forEach((failure) => console.error('- ' + failure));
    process.exit(1);
  }
  console.log('[service-metrics-sync-contract] OK');
})().catch((error) => {
  console.error('[service-metrics-sync-contract] FAIL');
  console.error(error);
  process.exit(1);
});
