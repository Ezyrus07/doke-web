#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const interactions = read('assets/js/components/ad-card-interactions.js');
const repository = read('assets/js/repositories/services-repository.js');
const controller = read('assets/js/pages/detalhe-anuncio-data-controller.js');
const detailHtml = read('detalhe-anuncio.html');
const indexHtml = read('index.html');
const resultsHtml = read('resultados.html');

assert(interactions.includes('getCardServiceId'), 'Ad card interactions must resolve the canonical service id.');
assert(interactions.includes('resolveDetailHref'), 'Ad card interactions must expose one detail href resolver.');
assert(interactions.includes("serviceApi.getDetailUrl(serviceId)"), 'Ad cards must use the services routing authority when available.');
assert(!interactions.includes("cta.href = withParams(DETAIL_PAGE, { anuncio: context.ad });"), 'Ad card hydration must not overwrite a valid id href with an ad slug.');
assert(interactions.includes("cta.href = resolveDetailHref(card, context)"), 'Dynamic card CTAs must preserve the canonical service id.');

assert(repository.includes('fetchRemoteServiceById'), 'Services repository must support targeted remote detail reads.');
assert(repository.includes(".eq('external_id', id).maybeSingle()"), 'Repository must resolve public external ids.');
assert(repository.includes(".eq('id', id).maybeSingle()"), 'Repository must resolve remote UUIDs when supplied.');
assert(repository.includes('matchesServiceId'), 'Repository must reconcile local, external and remote ids.');
assert(repository.includes("if (localMatch) return clone(localMatch);"), 'A locally published pending service must remain detail-readable when remote sync fails.');

assert(controller.includes("if (!serviceId)"), 'Detail controller must handle missing route ids explicitly.');
assert(controller.includes("emptyReason: normalized.service ? '' : (serviceId ? 'not-found' : 'missing-id')"), 'Detail controller must distinguish missing and unknown ids.');
assert(controller.includes('data-detail-retry'), 'Detail controller must bind the retry action.');
assert(detailHtml.includes('data-detail-empty-message'), 'Detail page must expose contextual empty copy.');
assert(detailHtml.includes('data-detail-error-message'), 'Detail page must expose contextual error copy.');
assert(detailHtml.includes('data-detail-retry'), 'Detail page must expose a retry action.');

for (const [name, html] of [['index.html', indexHtml], ['resultados.html', resultsHtml]]) {
  assert(/ad-card-interactions\.js\?v=20260719-canonical-service-route-v1/.test(html), `${name} must bust the obsolete slug-routing script cache.`);
}
assert(/detalhe-anuncio-data-controller\.js\?v=20260719-budget-price-label-v1/.test(detailHtml), 'Detail data controller cache version must be current.');
assert(/detalhe-anuncio\.js\?v=20260719-budget-price-label-v1/.test(detailHtml), 'Detail renderer cache version must match the data controller.');

console.log('Detail ad canonical route static contract: PASS');


const runInteractionsRuntime = () => {
  const assigned = [];
  const context = {
    console,
    URL,
    MutationObserver: class { observe() {} },
    document: {
      readyState: 'complete',
      documentElement: {},
      addEventListener() {},
      querySelectorAll() { return []; }
    },
    window: {
      location: {
        href: 'https://doke.local/index.html',
        assign(href) { assigned.push(href); }
      },
      Doke: {
        services: {
          services: {
            getDetailUrl(id) { return `detalhe-anuncio.html?id=${encodeURIComponent(id)}`; }
          }
        }
      }
    }
  };
  context.window.window = context.window;
  context.window.document = context.document;
  vm.runInNewContext(interactions, context, { filename: 'ad-card-interactions.js' });
  const api = context.window.Doke.adCardInteractions;
  const cta = { getAttribute(name) { return name === 'href' ? 'detalhe-anuncio.html?id=service_123' : ''; } };
  const card = {
    dataset: { serviceId: 'service_123' },
    querySelector(selector) { return selector.includes('cta') ? cta : null; }
  };
  assert(api.getCardServiceId(card) === 'service_123', 'Runtime card resolver must prefer data-service-id.');
  assert(api.resolveDetailHref(card, { serviceId: 'service_123' }) === 'detalhe-anuncio.html?id=service_123', 'Runtime detail href must preserve the canonical service id.');
  assert(api.resolveDetailHref(card, { serviceId: 'service_123' }, 'avaliacoes') === 'detalhe-anuncio.html?id=service_123#avaliacoes', 'Runtime rating href must preserve id and append the review anchor.');

  const hrefOnlyCard = {
    dataset: {},
    querySelector(selector) { return selector.includes('cta') ? cta : null; }
  };
  assert(api.getCardServiceId(hrefOnlyCard) === 'service_123', 'Runtime resolver must recover the service id from an existing CTA href.');
};

const createStorage = (initial = {}) => {
  const state = new Map(Object.entries(initial));
  return {
    getItem(key) { return state.has(key) ? state.get(key) : null; },
    setItem(key, value) { state.set(key, String(value)); },
    removeItem(key) { state.delete(key); }
  };
};

const runRepositoryRuntime = async () => {
  const localId = 'service_local_123';
  const storage = createStorage({
    'doke.services.local.v1': JSON.stringify([{ id: localId, title: 'Serviço local', status: 'active' }])
  });
  const context = {
    console,
    URL,
    Blob,
    Uint8Array,
    Promise,
    JSON,
    Date,
    Math,
    Object,
    Array,
    Number,
    String,
    RegExp,
    window: {
      Doke: {},
      DOKE_SUPABASE_CONFIG: { enabled: false },
      localStorage: storage,
      location: { href: 'https://doke.local/detalhe-anuncio.html' },
      document: {
        documentElement: { setAttribute() {} },
        addEventListener() {}
      },
      console
    }
  };
  context.document = context.window.document;
  context.window.window = context.window;
  vm.runInNewContext(repository, context, { filename: 'services-repository.js' });
  const local = await context.window.Doke.repositories.services.getById(localId);
  assert(local && local.id === localId, 'Repository runtime must open a locally published service by its canonical id.');

  const remoteExternalId = 'service_remote_123';
  const remoteUuid = '11111111-1111-4111-8111-111111111111';
  const remoteRow = {
    id: remoteUuid,
    external_id: remoteExternalId,
    professional_id: '22222222-2222-4222-8222-222222222222',
    title: 'Serviço remoto',
    status: 'published',
    metadata: {},
    service_media: []
  };
  const remoteStorage = createStorage();
  const client = {
    from(table) {
      assert(table === 'services', 'Targeted detail read must query the services table.');
      return {
        select() {
          return {
            eq(column, value) {
              return {
                maybeSingle() {
                  if (column === 'external_id' && value === remoteExternalId) return Promise.resolve({ data: remoteRow, error: null });
                  if (column === 'external_id' && value === remoteUuid) return Promise.resolve({ data: null, error: null });
                  if (column === 'id' && value === remoteUuid) return Promise.resolve({ data: remoteRow, error: null });
                  return Promise.resolve({ data: null, error: null });
                }
              };
            }
          };
        }
      };
    },
    auth: { getSession() { return Promise.resolve({ data: { session: null } }); } }
  };
  const remoteContext = {
    console,
    URL,
    Blob,
    Uint8Array,
    Promise,
    JSON,
    Date,
    Math,
    Object,
    Array,
    Number,
    String,
    RegExp,
    window: {
      Doke: { DokeSupabase: null },
      DOKE_SUPABASE_CONFIG: { enabled: true, servicesEnabled: true, url: 'https://example.supabase.co', anonKey: 'anon' },
      supabase: { createClient() { return client; } },
      localStorage: remoteStorage,
      location: { href: 'https://doke.local/detalhe-anuncio.html' },
      document: {
        documentElement: { setAttribute() {} },
        addEventListener() {}
      },
      console
    }
  };
  remoteContext.document = remoteContext.window.document;
  remoteContext.window.window = remoteContext.window;
  vm.runInNewContext(repository, remoteContext, { filename: 'services-repository-remote.js' });
  const repo = remoteContext.window.Doke.repositories.services;
  const byExternal = await repo.getById(remoteExternalId);
  assert(byExternal && byExternal.id === remoteExternalId && byExternal.remoteId === remoteUuid, 'Repository runtime must map external ids and preserve the remote UUID.');
  const byUuid = await repo.getById(remoteUuid);
  assert(byUuid && byUuid.id === remoteExternalId && byUuid.remoteId === remoteUuid, 'Repository runtime must resolve a remote UUID to the canonical public service object.');
};

runInteractionsRuntime();
runRepositoryRuntime().then(() => {
  console.log('Detail ad canonical route runtime: PASS');
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
