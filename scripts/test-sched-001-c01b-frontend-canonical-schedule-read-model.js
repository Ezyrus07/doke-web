#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('assets/js/repositories/orders-repository.js', 'utf8');
const storage = new Map();
const document = {
  documentElement: { setAttribute() {} },
  dispatchEvent() {}
};
const window = {
  Doke: {
    runtimeConfig: {
      environment: 'local',
      ordersReadProvider: 'mock',
      ordersMockDevelopment: true
    }
  },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  },
  document,
  console,
  Intl,
  Date,
  Promise,
  URL,
  URLSearchParams,
  fetch: async () => ({ ok: true, json: async () => [] })
};
window.window = window;

const context = vm.createContext({
  window,
  document,
  console,
  Intl,
  Date,
  Promise,
  URL,
  URLSearchParams,
  fetch: window.fetch,
  CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; }
});
vm.runInContext(source, context, { filename: 'orders-repository.js' });

const repository = window.Doke.repositories.orders;
assert(repository);
assert.strictEqual(typeof repository.normalize, 'function');
assert.strictEqual(typeof repository.deriveScheduleAuthority, 'function');

const none = repository.normalize({ id: 'order-none', status: 'accepted' });
assert.strictEqual(none.scheduleAuthority, 'none');
assert.strictEqual(none.hasCanonicalSchedule, false);
assert.strictEqual(none.scheduleReservationId, '');
assert.strictEqual(none.scheduledAt, '');

const intent = repository.normalize({
  id: 'order-intent',
  status: 'requested',
  desiredDate: '2026-08-10'
});
assert.strictEqual(intent.scheduleAuthority, 'client_intent');
assert.strictEqual(intent.hasCanonicalSchedule, false);
assert.strictEqual(intent.desiredDate, '2026-08-10');

const canonical = repository.normalize({
  id: 'order-canonical',
  status: 'scheduled',
  scheduleReservationId: '11111111-1111-4111-8111-111111111111',
  scheduledAt: '2026-08-10T15:30:00.000Z'
});
assert.strictEqual(canonical.status, 'scheduled');
assert.strictEqual(canonical.statusLabel, 'Agendado');
assert.strictEqual(canonical.scheduleAuthority, 'canonical_confirmed');
assert.strictEqual(canonical.hasCanonicalSchedule, true);
assert.strictEqual(canonical.scheduleReservationId, '11111111-1111-4111-8111-111111111111');
assert.strictEqual(canonical.scheduledAt, '2026-08-10T15:30:00.000Z');

[
  {
    id: 'missing-time',
    status: 'scheduled',
    scheduleReservationId: '11111111-1111-4111-8111-111111111111'
  },
  {
    id: 'missing-reference',
    status: 'scheduled',
    scheduledAt: '2026-08-10T15:30:00.000Z'
  },
  {
    id: 'wrong-status',
    status: 'accepted',
    scheduleReservationId: '11111111-1111-4111-8111-111111111111',
    scheduledAt: '2026-08-10T15:30:00.000Z'
  },
  {
    id: 'status-only',
    status: 'scheduled'
  }
].forEach((value) => {
  const order = repository.normalize(value);
  assert.strictEqual(order.scheduleAuthority, 'incomplete_projection', value.id);
  assert.strictEqual(order.hasCanonicalSchedule, false, value.id);
});

const snakeCase = repository.normalize({
  id: 'snake-case',
  status: 'scheduled',
  schedule_reservation_id: '22222222-2222-4222-8222-222222222222',
  scheduled_at: '2026-08-11T12:00:00.000Z'
});
assert.strictEqual(snakeCase.scheduleAuthority, 'canonical_confirmed');
assert.strictEqual(snakeCase.scheduleReservationId, '22222222-2222-4222-8222-222222222222');
assert.strictEqual(snakeCase.scheduledAt, '2026-08-11T12:00:00.000Z');

const derived = repository.deriveScheduleAuthority({
  status: 'scheduled',
  scheduleReservationId: '33333333-3333-4333-8333-333333333333',
  scheduledAt: '2026-08-12T09:00:00.000Z'
});
assert.strictEqual(derived.scheduleAuthority, 'canonical_confirmed');
assert.strictEqual(derived.hasCanonicalSchedule, true);
assert(Object.isFrozen(derived));

const quoteSource = fs.readFileSync('assets/js/pages/orcamento.js', 'utf8');
const serviceSource = fs.readFileSync('assets/js/services/orders-service.js', 'utf8');
const surfaceSource = fs.readFileSync('assets/js/pages/pedidos-local-orders.js', 'utf8');

assert(quoteSource.includes('desiredDate: data.get("data") || ""'));
assert(!quoteSource.includes('scheduleReservationId:'));
assert(!quoteSource.includes('scheduledAt:'));
assert(!serviceSource.includes("scheduled: 'schedule'"));
assert(!serviceSource.includes("scheduled: 'confirmSchedule'"));
assert(surfaceSource.includes('Agenda indisponível: atualize o pedido'));
assert(surfaceSource.includes('data-order-schedule-authority'));

console.log('SCHED-C01B frontend canonical schedule read model tests passed.');
