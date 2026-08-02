#!/usr/bin/env node
'use strict';

const assert = require('assert');
const presenter = require('../assets/js/patterns/order-schedule-presentation.js');

const options = { timeZone: 'America/Bahia' };

assert.deepStrictEqual(presenter.AUTHORITY_VALUES, [
  'none',
  'client_intent',
  'canonical_confirmed',
  'incomplete_projection'
]);

const canonical = presenter.getPresentation({
  scheduleReservationId: 'res-1',
  scheduledAt: '2026-08-10T15:00:00.000Z',
  status: 'scheduled'
}, options);
assert.strictEqual(canonical.authority, 'canonical_confirmed');
assert.strictEqual(canonical.title, 'Horário confirmado');
assert.strictEqual(canonical.badgeLabel, 'Agendado');
assert.strictEqual(canonical.readOnly, true);
assert(canonical.label.startsWith('Agendado: '));

const clientIntent = presenter.getPresentation({
  desiredDate: '2026-08-12',
  shift: 'Tarde',
  status: 'accepted'
}, options);
assert.strictEqual(clientIntent.authority, 'client_intent');
assert.strictEqual(clientIntent.title, 'Horário solicitado');
assert(clientIntent.value.includes('12/08/2026'));
assert(clientIntent.value.includes('Tarde'));

[
  { scheduleReservationId: 'res-2', status: 'accepted' },
  { scheduledAt: '2026-08-10T15:00:00.000Z', status: 'accepted' },
  { status: 'scheduled' },
  {
    scheduleAuthority: 'canonical_confirmed',
    status: 'scheduled',
    scheduledAt: 'invalid',
    scheduleReservationId: 'res-invalid'
  }
].forEach((order) => {
  const result = presenter.getPresentation(order, options);
  assert.strictEqual(result.authority, 'incomplete_projection');
  assert.strictEqual(result.title, 'Sincronização da agenda pendente');
  assert.strictEqual(result.value, 'Nenhum horário confirmado');
});

const forged = presenter.getPresentation({
  scheduleAuthority: 'canonical_confirmed',
  status: 'accepted'
}, options);
assert.notStrictEqual(forged.authority, 'canonical_confirmed');

const availability = presenter.getPresentation({
  status: 'accepted',
  serviceAvailabilitySchedule: [
    { label: 'Segunda', start: '09:00', end: '12:00' },
    { label: 'Quarta', start: '14:00', end: '18:00' }
  ]
}, options);
assert.strictEqual(availability.authority, 'none');
assert.strictEqual(availability.title, 'Disponibilidade do profissional');
assert(availability.value.includes('Segunda 09:00–12:00'));
assert(availability.value.includes('Quarta 14:00–18:00'));

[
  'confirm',
  'confirmSchedule',
  'reschedule',
  'cancelSchedule',
  'mutate',
  'write'
].forEach((key) => assert.strictEqual(Object.prototype.hasOwnProperty.call(presenter, key), false));

console.log('SCHED-C01C deterministic frontend schedule presentation tests passed.');
