#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

const events = [];
const documentStub = {
  dispatchEvent(event) {
    events.push(event);
    return true;
  }
};
class CustomEventStub {
  constructor(type, options) {
    this.type = type;
    this.detail = options?.detail;
  }
}

const windowStub = {
  Doke: {},
  document: documentStub,
  CustomEvent: CustomEventStub
};

global.window = windowStub;

const modulePath = require.resolve('../assets/js/pages/home/more-services-state.js');
delete require.cache[modulePath];
require(modulePath);

const api = windowStub.Doke.homeMoreServicesState;
assert(api, 'more-services state authority must be published');
assert.equal(api.contract, 'home-more-services-state-v1');
assert(Object.isFrozen(api));
assert(Object.isFrozen(api.intents));

const services = [
  {
    id: 'svc-01',
    title: 'Eletricista residencial',
    category: 'Reforma',
    state: 'MG',
    city: 'Belo Horizonte',
    neighborhood: 'Savassi',
    rating: 4.7,
    guaranteed: true,
    emergency: true,
    online: false,
    availableToday: true,
    createdAt: '2026-08-01T10:00:00Z'
  },
  {
    id: 'svc-02',
    title: 'Diarista premium',
    category: 'Limpeza',
    state: 'MG',
    city: 'Belo Horizonte',
    neighborhood: 'Centro',
    rating: 4.9,
    guaranteed: false,
    emergency: false,
    online: false,
    availableToday: true,
    createdAt: '2026-08-05T10:00:00Z'
  },
  {
    id: 'svc-03',
    title: 'Aulas de inglês',
    category: 'Aulas',
    state: 'MG',
    city: 'Belo Horizonte',
    neighborhood: 'Sion',
    rating: 4.8,
    guaranteed: true,
    emergency: false,
    online: true,
    availableToday: false,
    createdAt: '2026-08-04T10:00:00Z'
  },
  {
    id: 'svc-04',
    title: 'Suporte remoto',
    category: 'Tecnologia',
    state: 'SP',
    city: 'São Paulo',
    neighborhood: 'Pinheiros',
    rating: 4.6,
    guaranteed: true,
    emergency: false,
    online: true,
    availableToday: true,
    createdAt: '2026-08-03T10:00:00Z'
  },
  {
    id: 'svc-05',
    title: 'Pintura interna',
    category: 'Reforma',
    state: 'MG',
    city: 'Contagem',
    neighborhood: 'Eldorado',
    rating: 4.5,
    guaranteed: false,
    emergency: false,
    online: false,
    availableToday: false,
    createdAt: '2026-07-28T10:00:00Z'
  },
  {
    id: 'svc-06',
    title: 'Consultoria de design',
    category: 'Tecnologia',
    state: 'RJ',
    city: 'Rio de Janeiro',
    neighborhood: 'Botafogo',
    rating: 5,
    guaranteed: true,
    emergency: false,
    online: true,
    availableToday: true,
    updatedAt: '2026-08-06T10:00:00Z'
  },
  {
    id: 'svc-07',
    title: 'Manutenção hidráulica',
    category: 'Reforma',
    state: 'MG',
    city: 'Belo Horizonte',
    neighborhood: 'Savassi',
    rating: 4.9,
    guaranteed: true,
    emergency: true,
    online: false,
    availableToday: true,
    createdAt: '2026-08-02T10:00:00Z'
  },
  {
    id: 'svc-08',
    title: 'Serviço sem timestamp',
    category: 'Reforma',
    state: 'MG',
    city: 'Belo Horizonte',
    neighborhood: 'Savassi',
    rating: 0,
    guaranteed: false,
    emergency: false,
    online: false,
    availableToday: false
  }
];

const controller = api.createController({ items: services, initialLimit: 6, step: 3 });
let snapshot = controller.getSnapshot();
assert.equal(snapshot.intent, api.intents.FOR_YOU);
assert.equal(snapshot.resultState, 'ready');
assert.equal(snapshot.resultCount, 8);
assert.equal(snapshot.visibleCount, 6);
assert.equal(snapshot.hasMore, true);
assert.deepEqual(snapshot.items.map((item) => item.id), services.map((item) => item.id), 'Para você must preserve canonical received order');
assert(Object.isFrozen(snapshot));
assert(Object.isFrozen(snapshot.items));
assert(Object.isFrozen(snapshot.visibleItems));
assert(Object.isFrozen(snapshot.appliedFilters));
assert(Object.isFrozen(snapshot.draftFilters));

const originalGeneration = snapshot.generation;
controller.setDraft({ guaranteed: true });
snapshot = controller.getSnapshot();
assert.equal(snapshot.generation, originalGeneration, 'draft edits must not mutate applied generation');
assert.equal(snapshot.activeFilterCount, 0, 'draft edits must not affect applied filter count');
assert.equal(snapshot.resultCount, 8, 'draft edits must not mutate rendered collection');
assert.equal(snapshot.draftFilters.guaranteed, true);
assert.equal(snapshot.appliedFilters.guaranteed, false);

controller.cancelDraft();
snapshot = controller.getSnapshot();
assert.equal(snapshot.draftFilters.guaranteed, false, 'cancel must restore the applied snapshot');

controller.setDraft({ guaranteed: true, state: 'MG', city: 'Belo Horizonte', minRating: 4.8 });
snapshot = controller.applyDraft();
assert.equal(snapshot.activeFilterCount, 4);
assert.deepEqual(snapshot.items.map((item) => item.id), ['svc-03', 'svc-07']);
assert.equal(snapshot.visibleCount, 2);
assert.equal(snapshot.hasMore, false);

controller.setDraft({
  guaranteed: false,
  state: '',
  city: '',
  minRating: 0,
  categories: ['Tecnologia'],
  online: true
});
snapshot = controller.applyDraft();
assert.equal(snapshot.activeFilterCount, 2);
assert.deepEqual(snapshot.items.map((item) => item.id), ['svc-04', 'svc-06']);

snapshot = controller.resetFilters();
assert.equal(snapshot.activeFilterCount, 0);
assert.equal(snapshot.resultCount, 8);
assert.equal(snapshot.visibleCount, 6, 'reset must reset progressive reveal');

snapshot = controller.revealMore();
assert.equal(snapshot.visibleCount, 8);
assert.equal(snapshot.hasMore, false);

snapshot = controller.setIntent(api.intents.TOP_RATED);
assert.equal(snapshot.visibleCount, 6, 'intent change must reset progressive reveal');
assert.deepEqual(snapshot.items.map((item) => item.id), [
  'svc-06',
  'svc-02',
  'svc-07',
  'svc-03',
  'svc-01',
  'svc-04',
  'svc-05'
]);
assert(!snapshot.items.some((item) => item.id === 'svc-08'), 'top-rated must require a real numeric rating');

snapshot = controller.setIntent(api.intents.GUARANTEED);
assert.deepEqual(snapshot.items.map((item) => item.id), ['svc-01', 'svc-03', 'svc-04', 'svc-06', 'svc-07']);

snapshot = controller.setIntent(api.intents.AVAILABLE_TODAY);
assert.deepEqual(snapshot.items.map((item) => item.id), ['svc-01', 'svc-02', 'svc-04', 'svc-06', 'svc-07']);

snapshot = controller.setIntent(api.intents.NEWEST);
assert.deepEqual(snapshot.items.map((item) => item.id), [
  'svc-06',
  'svc-02',
  'svc-03',
  'svc-04',
  'svc-07',
  'svc-01',
  'svc-05'
]);
assert(!snapshot.items.some((item) => item.id === 'svc-08'), 'newest must not fabricate recency for missing timestamps');

snapshot = controller.setIntent(api.intents.FOLLOWING);
assert.equal(snapshot.availabilityState, 'unavailable');
assert.equal(snapshot.unavailableReason, 'following-authority-unavailable');
assert.equal(snapshot.resultState, 'unavailable');
assert.equal(snapshot.resultCount, 0);
assert.equal(snapshot.visibleCount, 0);
assert.equal(snapshot.hasMore, false);

snapshot = controller.setIntent(api.intents.FOR_YOU);
assert.equal(snapshot.resultCount, 8);
assert.equal(snapshot.visibleCount, 6);

controller.revealMore();
snapshot = controller.setSource(services.slice(0, 7));
assert.equal(snapshot.resultCount, 7);
assert.equal(snapshot.visibleCount, 6, 'source generation change must reset stale reveal state');
assert.equal(snapshot.hasMore, true);

snapshot = controller.revealMore();
assert.equal(snapshot.visibleCount, 7);
assert.equal(snapshot.hasMore, false);

snapshot = controller.setSource([]);
assert.equal(snapshot.resultState, 'empty');
assert.equal(snapshot.resultCount, 0);
assert.equal(snapshot.visibleCount, 0);

assert.throws(
  () => controller.setIntent('invented-ranking'),
  (error) => error?.code === 'DOKE_HOME_MORE_SERVICES_INTENT_INVALID',
  'unknown intents must fail closed'
);

const stateEvents = events.filter((event) => event.type === 'doke:home-more-services-state-change');
assert(stateEvents.length >= 1, 'applied presentation transitions must emit diagnostics');
for (const event of stateEvents) {
  assert.deepEqual(Object.keys(event.detail).sort(), [
    'activeFilterCount',
    'availabilityState',
    'contract',
    'generation',
    'intent',
    'resultCount',
    'resultState',
    'visibleCount'
  ]);
  const serialized = JSON.stringify(event.detail);
  assert(!serialized.includes('svc-'));
  assert(!Object.hasOwn(event.detail, 'items'));
  assert(!Object.hasOwn(event.detail, 'userId'));
  assert(!Object.hasOwn(event.detail, 'providerId'));
  assert(!Object.hasOwn(event.detail, 'query'));
}

delete require.cache[modulePath];
delete global.window;

console.log('ux-home-002-more-services-state: ok');
console.log('- intents, draft/applied filters, fail-closed following, progressive reveal and sanitized events validated');
