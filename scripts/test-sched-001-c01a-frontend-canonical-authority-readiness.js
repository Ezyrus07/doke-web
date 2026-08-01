#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync(
  'config/sched-001-c01a-frontend-canonical-authority-readiness.json',
  'utf8'
));

function deriveScheduleAuthority(order) {
  const reference = String(order && order.scheduleReservationId || '').trim();
  const scheduledAt = String(order && order.scheduledAt || '').trim();
  const status = String(order && order.status || '').trim().toLowerCase();
  const requestedAt = String(order && order.schedulePreference && order.schedulePreference.requestedAt || '').trim();
  const hasReference = Boolean(reference);
  const hasTime = Boolean(scheduledAt);
  const scheduled = status === 'scheduled';

  if (hasReference && hasTime && scheduled) {
    return { scheduleAuthority: 'canonical_confirmed', hasCanonicalSchedule: true };
  }
  if (hasReference || hasTime || scheduled) {
    return { scheduleAuthority: 'incomplete_projection', hasCanonicalSchedule: false };
  }
  if (requestedAt) {
    return { scheduleAuthority: 'client_intent', hasCanonicalSchedule: false };
  }
  return { scheduleAuthority: 'none', hasCanonicalSchedule: false };
}

assert.deepStrictEqual(deriveScheduleAuthority({}), {
  scheduleAuthority: 'none',
  hasCanonicalSchedule: false
});
assert.deepStrictEqual(deriveScheduleAuthority({
  schedulePreference: { requestedAt: '2026-08-04T12:00:00.000Z' },
  status: 'requested'
}), {
  scheduleAuthority: 'client_intent',
  hasCanonicalSchedule: false
});
assert.deepStrictEqual(deriveScheduleAuthority({
  scheduleReservationId: 'reservation-1',
  scheduledAt: '2026-08-04T12:00:00.000Z',
  status: 'scheduled'
}), {
  scheduleAuthority: 'canonical_confirmed',
  hasCanonicalSchedule: true
});
[
  { scheduleReservationId: 'reservation-1', status: 'scheduled' },
  { scheduledAt: '2026-08-04T12:00:00.000Z', status: 'scheduled' },
  { scheduleReservationId: 'reservation-1', scheduledAt: '2026-08-04T12:00:00.000Z', status: 'accepted' },
  { status: 'scheduled' }
].forEach((value) => {
  assert.deepStrictEqual(deriveScheduleAuthority(value), {
    scheduleAuthority: 'incomplete_projection',
    hasCanonicalSchedule: false
  });
});

assert.strictEqual(config.frontendReadContract.canonicalConfirmedRequiresCompleteTuple, true);
assert.strictEqual(config.frontendReadContract.incompleteProjectionMustRenderErrorState, true);
assert.strictEqual(config.frontendReadContract.serviceAvailabilityMustRemainSeparateFromBooking, true);
assert.strictEqual(config.frontendCommandContract.clientIntentSubmissionAllowed, true);
assert.strictEqual(config.frontendCommandContract.holdRequestRequiresServerCommandBoundary, true);
assert.strictEqual(config.frontendCommandContract.confirmationRequiresServerComposition, true);
assert.strictEqual(config.frontendCommandContract.rescheduleRequiresServerComposition, true);
assert.strictEqual(config.frontendCommandContract.cancellationRequiresServerComposition, true);
assert.strictEqual(config.frontendCommandContract.idempotencyKeyRequiredForEveryCommand, true);
assert.strictEqual(config.frontendCommandContract.serverResponseMustBeReReadBeforePresentation, true);

const repositorySource = fs.readFileSync('assets/js/repositories/orders-repository.js', 'utf8');
const serviceSource = fs.readFileSync('assets/js/services/orders-service.js', 'utf8');
const quoteSource = fs.readFileSync('assets/js/pages/orcamento.js', 'utf8');
const ordersSurfaceSource = fs.readFileSync('assets/js/pages/pedidos-local-orders.js', 'utf8');

assert(repositorySource.includes('scheduledAt: row.scheduled_at || metadata.scheduledAt'));
assert(!repositorySource.includes('scheduleReservationId: row.schedule_reservation_id'));
assert(!serviceSource.includes("scheduled: Object.freeze({"));
assert(quoteSource.includes('desiredDate: data.get("data") || ""'));
assert(!quoteSource.includes('scheduledAt:'));
assert(ordersSurfaceSource.includes('serviceAvailabilitySchedule'));
assert(!ordersSurfaceSource.includes('hasCanonicalSchedule'));

assert.strictEqual(config.nextImplementation.sublot, 'SCHED-C01B');
assert.strictEqual(config.nextImplementation.stagingAuthorizationRequired, false);
assert.strictEqual(config.nextImplementation.frontendCommandActivationAllowed, false);
assert.deepStrictEqual(config.effects, {
  runtimeFilesModified: 0,
  frontendBehaviorChanged: false,
  stagingReads: 0,
  stagingMutations: 0,
  migrationsApplied: 0,
  deployments: 0,
  productionAccess: 0,
  mergePerformed: false
});

console.log('SCHED-C01A frontend canonical authority readiness tests passed.');
