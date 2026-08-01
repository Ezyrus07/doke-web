#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const PATHS = Object.freeze({
  config: 'config/sched-001-b04-ord-canonical-wiring-readiness.json',
  docs: 'docs/SCHED-001-B04-ORD-CANONICAL-WIRING-READINESS.md',
  evidence: 'docs/validation/SCHED-001-B04-ORD-CANONICAL-WIRING-READINESS.json',
  orderService: 'backend/modules/orders/orders-service.js',
  orderStateMachine: 'backend/modules/orders/order-state-machine.js',
  schedulingRepository: 'backend/modules/scheduling/scheduling-postgres-repository.js',
  b02Evidence: 'docs/validation/SCHED-001-B02B-AUTHENTICATED-COMPOSITION-CANARY.json',
  matrix: 'config/domain-completion-matrix.json',
  workflow: '.github/workflows/sched-001-b04-ord-canonical-wiring-readiness.yml',
  b04bEvidence: 'docs/validation/SCHED-001-B04B-ORD-CANONICAL-WIRING-IMPLEMENTATION.json'
});

Object.entries(PATHS)
  .filter(([key]) => key !== 'b04bEvidence')
  .forEach(([, path]) => assert(fs.existsSync(path), `Missing B04 readiness asset: ${path}`));

const config = JSON.parse(fs.readFileSync(PATHS.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(PATHS.evidence, 'utf8'));
const b02Evidence = JSON.parse(fs.readFileSync(PATHS.b02Evidence, 'utf8'));
const matrix = JSON.parse(fs.readFileSync(PATHS.matrix, 'utf8'));
const docs = fs.readFileSync(PATHS.docs, 'utf8');
const orderService = fs.readFileSync(PATHS.orderService, 'utf8');
const orderStateMachine = fs.readFileSync(PATHS.orderStateMachine, 'utf8');
const schedulingRepository = fs.readFileSync(PATHS.schedulingRepository, 'utf8');
const workflow = fs.readFileSync(PATHS.workflow, 'utf8');

assert.strictEqual(config.contractVersion, 'sched-b04-ord-canonical-wiring-readiness-v1');
assert.strictEqual(evidence.contractVersion, config.contractVersion);
assert.strictEqual(config.scope, 'repository_only_order_scheduling_authority_wiring_readiness');
assert.strictEqual(config.authority.reservationReference, 'orders.schedule_reservation_id');
assert.strictEqual(config.authority.timeProjection, 'orders.scheduled_at');
assert.strictEqual(config.authority.rawScheduledAtIsAuthority, false);
assert.strictEqual(config.authority.orderServiceMayCreateReservation, false);
assert.strictEqual(config.authority.frontendMayWriteCanonicalSchedule, false);
assert.strictEqual(config.requiredOrderReadModel.reservationStatusMustBeResolvedServerSide, true);
assert.strictEqual(config.requiredCommandFlow.createOrder.directScheduledAtInputMustBeIgnoredOrRejected, true);
assert.strictEqual(config.requiredCommandFlow.confirmReservation.sameTransactionRequired, true);
assert.strictEqual(config.requiredCommandFlow.cancelReservation.orderCancellationNotImplicit, true);
assert.strictEqual(config.statePolicy.manualScheduledTransitionAllowed, false);
assert.strictEqual(config.statePolicy.scheduledStateAuthority, 'confirmed_schedule_reservation');
assert.strictEqual(config.transactionBoundary.trustedServerOnly, true);
assert.strictEqual(config.transactionBoundary.serializable, true);
assert.strictEqual(config.transactionBoundary.rollbackOnProjectionFailure, true);
assert.deepStrictEqual(config.blockers.remainingOpen, ['SCHED-B04', 'ORD-B04']);
assert.strictEqual(config.capabilities.orderReadModelWired, false);
assert.strictEqual(config.capabilities.commandCompositionWired, false);
assert.strictEqual(config.capabilities.stagingCanaryExecuted, false);

assert.strictEqual(b02Evidence.result, 'authenticated_composition_canary_passed');
assert.deepStrictEqual(b02Evidence.blockers.remainingOpen, ['SCHED-B04']);

const b04bImplemented = fs.existsSync(PATHS.b04bEvidence);
if (b04bImplemented) {
  assert(readOrderSelect(orderService).includes("'schedule_reservation_id'"));
  assert(orderService.includes('scheduleReservationId: scheduleProjection.scheduleReservationId'));
  assert(orderService.includes('scheduleAuthority: scheduleProjection.authority'));
  assert(orderService.includes('p_scheduled_at: null'));
  assert(!orderService.includes('p_scheduled_at: body.scheduledAt || body.scheduled_at || null'));
  assert(!orderStateMachine.includes("accepted: Object.freeze(['quoted', 'scheduled', 'in_progress', 'cancelled'])"));
  assert(!orderStateMachine.includes("quoted: Object.freeze(['accepted', 'scheduled', 'in_progress', 'cancelled'])"));
  assert(orderStateMachine.includes('DOKE_ORDER_SCHEDULE_AUTHORITY_REQUIRED'));
} else {
  // Current gaps are intentionally frozen by readiness and must remain visible until B04B.
  assert(orderService.includes("'scheduled_at',"));
  assert(!readOrderSelect(orderService).includes("'schedule_reservation_id'"));
  assert(orderService.includes('scheduledAt: source.scheduled_at || source.scheduledAt ||'));
  assert(!orderService.includes('scheduleReservationId: source.schedule_reservation_id'));
  assert(orderService.includes('p_scheduled_at: body.scheduledAt || body.scheduled_at || null'));
  assert(orderStateMachine.includes("accepted: Object.freeze(['quoted', 'scheduled', 'in_progress', 'cancelled'])"));
  assert(orderStateMachine.includes("quoted: Object.freeze(['accepted', 'scheduled', 'in_progress', 'cancelled'])"));
}

// Preserve SCHED as the only canonical projection writer.
[
  'async projectOrderSchedule(orderId, reservationId, scheduledAt)',
  'set schedule_reservation_id = $2, scheduled_at = $3',
  'async clearOrderSchedule(orderId, reservationId)',
  'set schedule_reservation_id = null, scheduled_at = null'
].forEach((fragment) => assert(schedulingRepository.includes(fragment), `Scheduling repository missing ${fragment}`));

[
  '`orders.schedule_reservation_id`',
  '`orders.scheduled_at`',
  '`scheduled_at` isolado nunca prova',
  'Apenas a confirmação de uma reserva canônica',
  'rollback em falha de projeção',
  'SCHED-B04B'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing ${fragment}`));

const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
assert(sched && ord, 'SCHED-001 or ORD-001 missing from completion matrix.');
assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B02'));
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B04'));
assert(ord.blockers.some((blocker) => blocker.id === 'ORD-B04'));
assert.strictEqual(sched.serverAuthority, 'partial');
assert.strictEqual(sched.stagingEvidence, 'staging_canary');

assert(workflow.includes('permissions:\n  contents: read'));
assert(
  workflow.includes('node scripts/audit-sched-001-b04-ord-canonical-wiring-readiness.js')
    || workflow.includes('npm run audit:sched-001-b04-ord-canonical-wiring-readiness')
);
assert(
  workflow.includes('node scripts/test-sched-001-b04-ord-canonical-wiring-readiness.js')
    || workflow.includes('npm run test:sched-001-b04-ord-canonical-wiring-readiness')
);
assert(workflow.includes('node scripts/audit-sched-001-b02b-authenticated-composition-canary.js'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('secrets.'));
assert(!workflow.includes('supabase '));
assert(!workflow.includes('psql '));
assert(!workflow.includes('curl '));
assert(!workflow.includes('--execute'));

console.log('SCHED-B04 ORD canonical wiring readiness audit passed.');

function readOrderSelect(source) {
  const match = source.match(/const ORDER_SELECT = \[(.*?)\]\.join\(','\);/s);
  assert(match, 'ORDER_SELECT definition missing.');
  return match[1];
}
