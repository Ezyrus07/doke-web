#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const PATHS = Object.freeze({
  config: 'config/sched-001-b04b-ord-canonical-wiring-implementation.json',
  docs: 'docs/SCHED-001-B04B-ORD-CANONICAL-WIRING-IMPLEMENTATION.md',
  evidence: 'docs/validation/SCHED-001-B04B-ORD-CANONICAL-WIRING-IMPLEMENTATION.json',
  authority: 'backend/modules/orders/order-scheduling-authority.js',
  orderService: 'backend/modules/orders/orders-service.js',
  stateMachine: 'backend/modules/orders/order-state-machine.js',
  handlers: 'backend/modules/scheduling/scheduling-command-handlers.js',
  repository: 'backend/modules/scheduling/scheduling-postgres-repository.js',
  b04aAudit: 'scripts/audit-sched-001-b04-ord-canonical-wiring-readiness.js',
  test: 'scripts/test-sched-001-b04b-ord-canonical-wiring-runtime.js',
  workflow: '.github/workflows/sched-001-b04b-ord-canonical-wiring-implementation.yml',
  matrix: 'config/domain-completion-matrix.json',
  package: 'package.json'
});

Object.values(PATHS).forEach((path) => assert(fs.existsSync(path), `Missing SCHED-B04B asset: ${path}`));

const config = JSON.parse(fs.readFileSync(PATHS.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(PATHS.evidence, 'utf8'));
const matrix = JSON.parse(fs.readFileSync(PATHS.matrix, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(PATHS.package, 'utf8'));
const docs = fs.readFileSync(PATHS.docs, 'utf8');
const authority = fs.readFileSync(PATHS.authority, 'utf8');
const orderService = fs.readFileSync(PATHS.orderService, 'utf8');
const stateMachine = fs.readFileSync(PATHS.stateMachine, 'utf8');
const handlers = fs.readFileSync(PATHS.handlers, 'utf8');
const repository = fs.readFileSync(PATHS.repository, 'utf8');
const b04aAudit = fs.readFileSync(PATHS.b04aAudit, 'utf8');
const test = fs.readFileSync(PATHS.test, 'utf8');
const workflow = fs.readFileSync(PATHS.workflow, 'utf8');

assert.strictEqual(config.contractVersion, 'sched-b04b-ord-canonical-wiring-implementation-v1');
assert.strictEqual(evidence.contractVersion, config.contractVersion);
assert.strictEqual(config.scope, 'repository_only_ord_sched_canonical_wiring_implementation');
assert.strictEqual(config.authority.reservationReference, 'orders.schedule_reservation_id');
assert.strictEqual(config.authority.timeProjection, 'orders.scheduled_at');
assert.strictEqual(config.authority.statusProjection, 'orders.status=scheduled');
assert.strictEqual(config.orderReadModel.scheduleReservationIdExposed, true);
assert.strictEqual(config.createOrder.directScheduledAtWriteBlocked, true);
assert.strictEqual(config.statePolicy.manualScheduledTransitionAllowed, false);
assert.deepStrictEqual(config.statePolicy.confirmationAllowedFrom, ['accepted', 'scheduled']);
assert.strictEqual(config.statePolicy.reservationCancellationRestoresOrderStatus, 'accepted');
assert.strictEqual(config.transactionPolicy.confirmationAndProjectionSameTransaction, true);
assert.strictEqual(config.capabilities.frontendAuthoritySwitched, false);
assert.strictEqual(config.capabilities.stagingCanaryExecuted, false);
assert.deepStrictEqual(config.blockers.remainingOpen, ['SCHED-B04', 'ORD-B04']);
assert.strictEqual(evidence.result, 'repository_implementation_prepared_for_local_validation');
assert.strictEqual(evidence.effects.stagingReads, 0);
assert.strictEqual(evidence.effects.stagingMutations, 0);
assert.strictEqual(evidence.effects.productionAccess, 0);

[
  "canonical: 'canonical_reservation'",
  "incomplete: 'incomplete_projection'",
  'readSchedulePreference',
  'applySchedulePreference',
  'assertStartScheduleAuthority',
  'DOKE_ORDER_SCHEDULE_AUTHORITY_UNAVAILABLE',
  'DOKE_ORDER_SCHEDULE_CANCELLATION_COMPOSITION_REQUIRED',
  "normalized.status !== 'confirmed'",
  'sameInstant(normalized.startsAt, projection.scheduledAt)'
].forEach((fragment) => assert(authority.includes(fragment), `Authority policy missing ${fragment}`));

[
  "require('./order-scheduling-authority')",
  "'schedule_reservation_id',",
  'scheduleReservationId: scheduleProjection.scheduleReservationId',
  'scheduleAuthority: scheduleProjection.authority',
  'hasCanonicalSchedule: scheduleProjection.canonical',
  'const schedulePreference = readSchedulePreference(body)',
  'p_scheduled_at: null',
  'applySchedulePreference(metadata, schedulePreference)',
  'assertGenericCancellationAllowed(order)',
  'await assertStartScheduleAuthority(context, order)'
].forEach((fragment) => assert(orderService.includes(fragment), `Order service missing ${fragment}`));
assert(!orderService.includes('p_scheduled_at: body.scheduledAt || body.scheduled_at || null'));

assert(!stateMachine.includes("accepted: Object.freeze(['quoted', 'scheduled', 'in_progress', 'cancelled'])"));
assert(!stateMachine.includes("quoted: Object.freeze(['accepted', 'scheduled', 'in_progress', 'cancelled'])"));
assert(stateMachine.includes('DOKE_ORDER_SCHEDULE_AUTHORITY_REQUIRED'));
assert(stateMachine.includes("if (next === 'scheduled')"));

const delegatesProjectionToB04D =
  repository.includes('private.apply_order_schedule_projection')
  && repository.includes('private.clear_order_schedule_projection');
if (delegatesProjectionToB04D) {
  [
    '/* sched-a05:project-order-schedule */',
    'private.apply_order_schedule_projection',
    '/* sched-a05:clear-order-schedule */',
    'private.clear_order_schedule_projection',
    'DOKE_SCHEDULE_ORDER_PROJECTION_FAILED',
    'DOKE_SCHEDULE_ORDER_CLEAR_FAILED'
  ].forEach((fragment) => assert(repository.includes(fragment), `B04D delegated repository missing ${fragment}`));
} else {
  [
    "status = 'scheduled'",
    "status in ('accepted', 'scheduled')",
    'schedule_reservation_id is null or schedule_reservation_id = $2',
    "when status = 'scheduled' then 'accepted'",
    'and schedule_reservation_id = $2'
  ].forEach((fragment) => assert(repository.includes(fragment), `Scheduling repository missing ${fragment}`));
}

[
  'assertOrderSchedulable(order)',
  "orderStatus: 'scheduled'",
  "orderStatus: 'accepted'"
].forEach((fragment) => assert(handlers.includes(fragment), `Scheduling handlers missing ${fragment}`));

assert(b04aAudit.includes('const b04bImplemented = fs.existsSync(PATHS.b04bEvidence)'));
assert(b04aAudit.includes('if (b04bImplemented)'));

[
  '`orders.schedule_reservation_id`',
  '`orders.status = scheduled`',
  '`incomplete_projection`',
  'rollback integral',
  'SCHED-B04C'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing ${fragment}`));

[
  'DOKE_ORDER_SCHEDULE_AUTHORITY_UNAVAILABLE',
  'DOKE_ORDER_SCHEDULE_CANCELLATION_COMPOSITION_REQUIRED',
  "status = 'scheduled'",
  "then 'accepted'",
  'SCHED-B04B ORD canonical wiring runtime tests passed.'
].forEach((fragment) => assert(test.includes(fragment), `Runtime test missing ${fragment}`));

assert.strictEqual(pkg.scripts['audit:sched-001-b04b-ord-canonical-wiring-implementation'], 'node scripts/audit-sched-001-b04b-ord-canonical-wiring-implementation.js');
assert.strictEqual(pkg.scripts['test:sched-001-b04b-ord-canonical-wiring-runtime'], 'node scripts/test-sched-001-b04b-ord-canonical-wiring-runtime.js');

const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
assert(sched && ord, 'SCHED-001 or ORD-001 missing from matrix.');
assert(sched.requiredPaths.includes(PATHS.authority));
assert(sched.requiredPaths.includes(PATHS.config));
assert(sched.tests.includes('audit:sched-001-b04b-ord-canonical-wiring-implementation'));
assert(sched.tests.includes('test:sched-001-b04b-ord-canonical-wiring-runtime'));
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B04'));
assert(ord.blockers.some((blocker) => blocker.id === 'ORD-B04'));
assert.strictEqual(sched.serverAuthority, 'partial');
assert.strictEqual(sched.productionGate, 'blocked');

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('npm run audit:sched-001-b04b-ord-canonical-wiring-implementation'));
assert(workflow.includes('npm run test:sched-001-b04b-ord-canonical-wiring-runtime'));
assert(workflow.includes('npm run audit:sched-001-b04-ord-canonical-wiring-readiness'));
assert(workflow.includes('npm run audit:domain-completion-matrix'));
['contents: write', 'secrets.', 'supabase ', 'psql ', 'curl ', '--execute', 'git push'].forEach((fragment) => {
  assert(!workflow.includes(fragment), `Workflow contains forbidden fragment ${fragment}`);
});

console.log('SCHED-B04B ORD canonical wiring implementation audit passed.');
