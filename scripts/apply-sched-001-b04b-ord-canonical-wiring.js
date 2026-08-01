#!/usr/bin/env node
'use strict';

const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceExact(path, before, after) {
  const source = read(path);
  if (source.includes(after)) return;
  if (!source.includes(before)) {
    throw new Error(`Expected fragment missing in ${path}: ${before.slice(0, 120)}`);
  }
  write(path, source.replace(before, after));
}

function replaceAllExact(path, before, after, expectedCount) {
  const source = read(path);
  if (source.includes(after) && !source.includes(before)) return;
  const count = source.split(before).length - 1;
  if (count !== expectedCount) {
    throw new Error(`Expected ${expectedCount} occurrences in ${path}, found ${count}: ${before.slice(0, 120)}`);
  }
  write(path, source.split(before).join(after));
}

function pushUnique(array, value) {
  if (!Array.isArray(array)) throw new Error('Expected array.');
  if (!array.includes(value)) array.push(value);
}

const orderServicePath = 'backend/modules/orders/orders-service.js';
replaceExact(
  orderServicePath,
  "} = require('./order-state-machine');\n",
  "} = require('./order-state-machine');\nconst {\n  readScheduleProjection,\n  readSchedulePreference,\n  applySchedulePreference,\n  assertStartScheduleAuthority,\n  assertGenericCancellationAllowed\n} = require('./order-scheduling-authority');\n"
);
replaceExact(
  orderServicePath,
  "  'scheduled_at',\n  'metadata',",
  "  'scheduled_at',\n  'schedule_reservation_id',\n  'metadata',"
);
replaceExact(
  orderServicePath,
  "  const amountCents = budget && Number.isFinite(Number(budget.amount_cents)) ? Number(budget.amount_cents) : null;\n  return Object.freeze({",
  "  const amountCents = budget && Number.isFinite(Number(budget.amount_cents)) ? Number(budget.amount_cents) : null;\n  const scheduleProjection = readScheduleProjection(source);\n  return Object.freeze({"
);
replaceExact(
  orderServicePath,
  "    scheduledAt: source.scheduled_at || source.scheduledAt || '',\n    metadata:",
  "    scheduleReservationId: scheduleProjection.scheduleReservationId,\n    scheduledAt: scheduleProjection.scheduledAt,\n    scheduleAuthority: scheduleProjection.authority,\n    hasCanonicalSchedule: scheduleProjection.canonical,\n    metadata:"
);
replaceExact(
  orderServicePath,
  "  const body = context.body || {};\n  const serviceRef =",
  "  const body = context.body || {};\n  const schedulePreference = readSchedulePreference(body);\n  const serviceRef ="
);
replaceExact(
  orderServicePath,
  '  const metadata = sanitizeOrderMetadata(body);',
  '  const metadata = sanitizeOrderMetadata(body, schedulePreference);'
);
replaceExact(
  orderServicePath,
  '    p_scheduled_at: body.scheduledAt || body.scheduled_at || null,',
  '    p_scheduled_at: null,'
);
replaceExact(
  orderServicePath,
  "  assertProfessionalOrderAccess(order, actor);\n  const note = sanitizeText(context.body && (context.body.reason || context.body.note) || 'Pedido recusado pelo profissional.', 500);",
  "  assertProfessionalOrderAccess(order, actor);\n  assertGenericCancellationAllowed(order);\n  const note = sanitizeText(context.body && (context.body.reason || context.body.note) || 'Pedido recusado pelo profissional.', 500);"
);
replaceExact(
  orderServicePath,
  "  assertProfessionalOrderAccess(order, actor);\n  return transitionOrder(supabase, order, actor, 'in_progress', 'Atendimento iniciado pelo profissional.', 'start');",
  "  assertProfessionalOrderAccess(order, actor);\n  await assertStartScheduleAuthority(context, order);\n  return transitionOrder(supabase, order, actor, 'in_progress', 'Atendimento iniciado pelo profissional.', 'start');"
);
replaceExact(
  orderServicePath,
  "  const nextStatus = normalizeBackendStatus(context.body && (context.body.status || context.body.nextStatus));\n  const note =",
  "  const nextStatus = normalizeBackendStatus(context.body && (context.body.status || context.body.nextStatus));\n  if (nextStatus === 'cancelled') assertGenericCancellationAllowed(order);\n  if (nextStatus === 'in_progress') await assertStartScheduleAuthority(context, order);\n  const note ="
);
replaceExact(
  orderServicePath,
  'function sanitizeOrderMetadata(body) {',
  'function sanitizeOrderMetadata(body, schedulePreference) {'
);
replaceExact(
  orderServicePath,
  "  delete metadata.providerId;\n  return metadata;\n}",
  "  delete metadata.providerId;\n  return applySchedulePreference(metadata, schedulePreference);\n}"
);

const stateMachinePath = 'backend/modules/orders/order-state-machine.js';
replaceExact(
  stateMachinePath,
  "  accepted: Object.freeze(['quoted', 'scheduled', 'in_progress', 'cancelled']),\n  quoted: Object.freeze(['accepted', 'scheduled', 'in_progress', 'cancelled']),",
  "  accepted: Object.freeze(['quoted', 'in_progress', 'cancelled']),\n  quoted: Object.freeze(['accepted', 'in_progress', 'cancelled']),"
);
replaceExact(
  stateMachinePath,
  "      accepted: ['quoted', 'scheduled', 'in_progress', 'cancelled'],\n      quoted: ['scheduled', 'in_progress', 'cancelled'],",
  "      accepted: ['quoted', 'in_progress', 'cancelled'],\n      quoted: ['in_progress', 'cancelled'],"
);
replaceExact(
  stateMachinePath,
  "  const action = String(details.action || 'updateStatus').trim();\n\n  if (canTransition({ currentStatus: current, nextStatus: next, actorRole: role, action })) {",
  "  const action = String(details.action || 'updateStatus').trim();\n\n  if (next === 'scheduled') {\n    throw createError(\n      'DOKE_ORDER_SCHEDULE_AUTHORITY_REQUIRED',\n      'The scheduled status can be projected only by a confirmed canonical schedule reservation.',\n      409,\n      { currentStatus: current, nextStatus: next, actorRole: role, action }\n    );\n  }\n\n  if (canTransition({ currentStatus: current, nextStatus: next, actorRole: role, action })) {"
);

const repositoryPath = 'backend/modules/scheduling/scheduling-postgres-repository.js';
replaceExact(
  repositoryPath,
  "         set schedule_reservation_id = $2, scheduled_at = $3, updated_at = pg_catalog.now()\n         where id = $1\n         returning id, client_id, professional_id, status, scheduled_at, schedule_reservation_id`,",
  "         set schedule_reservation_id = $2, scheduled_at = $3, status = 'scheduled', updated_at = pg_catalog.now()\n         where id = $1\n           and status in ('accepted', 'scheduled')\n           and (schedule_reservation_id is null or schedule_reservation_id = $2)\n         returning id, client_id, professional_id, status, scheduled_at, schedule_reservation_id`,"
);
replaceExact(
  repositoryPath,
  "         set schedule_reservation_id = null, scheduled_at = null, updated_at = pg_catalog.now()\n         where id = $1 and (schedule_reservation_id is null or schedule_reservation_id = $2)\n         returning id, client_id, professional_id, status, scheduled_at, schedule_reservation_id`,",
  "         set schedule_reservation_id = null, scheduled_at = null,\n             status = case when status = 'scheduled' then 'accepted' else status end,\n             updated_at = pg_catalog.now()\n         where id = $1 and schedule_reservation_id = $2\n         returning id, client_id, professional_id, status, scheduled_at, schedule_reservation_id`,"
);

const handlersPath = 'backend/modules/scheduling/scheduling-command-handlers.js';
replaceExact(
  handlersPath,
  "    const order = await requireOrder(tx, reservation.orderId);\n    assertOrderEligible(order);\n    assertMatchingProfessional(order, reservation.professionalId);",
  "    const order = await requireOrder(tx, reservation.orderId);\n    assertOrderEligible(order);\n    assertOrderSchedulable(order);\n    assertMatchingProfessional(order, reservation.professionalId);"
);
replaceExact(
  handlersPath,
  "    const order = await requireOrder(tx, reservation.orderId);\n    assertOrderEligible(order);\n    contract.assertTransition(scope.commandName, reservation.status, context.actor.role);",
  "    const order = await requireOrder(tx, reservation.orderId);\n    assertOrderEligible(order);\n    assertOrderSchedulable(order);\n    contract.assertTransition(scope.commandName, reservation.status, context.actor.role);"
);
replaceAllExact(
  handlersPath,
  "        scheduledAt: updated.startsAt\n      }),",
  "        scheduledAt: updated.startsAt,\n        orderStatus: 'scheduled'\n      }),",
  2
);
replaceExact(
  handlersPath,
  "        scheduleReservationId: null,\n        scheduledAt: null\n      }),",
  "        scheduleReservationId: null,\n        scheduledAt: null,\n        orderStatus: 'accepted'\n      }),"
);
replaceExact(
  handlersPath,
  "function assertClientOrderParticipant(actor, order) {",
  "function assertOrderSchedulable(order) {\n  const status = String(order && order.status || '').toLowerCase();\n  if (!['accepted', 'scheduled'].includes(status)) {\n    throw runtimeError(\n      RUNTIME_ERROR_CODES.orderIneligible,\n      'The order must be accepted before a schedule reservation can project it as scheduled.',\n      { orderId: order && order.id || null, orderStatus: status || null },\n      409\n    );\n  }\n  return true;\n}\n\nfunction assertClientOrderParticipant(actor, order) {"
);

const b04aAuditPath = 'scripts/audit-sched-001-b04-ord-canonical-wiring-readiness.js';
replaceExact(
  b04aAuditPath,
  "  workflow: '.github/workflows/sched-001-b04-ord-canonical-wiring-readiness.yml'\n});\n\nObject.values(PATHS).forEach((path) => assert(fs.existsSync(path), `Missing B04 readiness asset: ${path}`));",
  "  workflow: '.github/workflows/sched-001-b04-ord-canonical-wiring-readiness.yml',\n  b04bEvidence: 'docs/validation/SCHED-001-B04B-ORD-CANONICAL-WIRING-IMPLEMENTATION.json'\n});\n\nObject.entries(PATHS)\n  .filter(([key]) => key !== 'b04bEvidence')\n  .forEach(([, path]) => assert(fs.existsSync(path), `Missing B04 readiness asset: ${path}`));"
);
const oldGapBlock = `// Current gaps are intentionally frozen by readiness and must remain visible until B04B.\nassert(orderService.includes("'scheduled_at',"));\nassert(!readOrderSelect(orderService).includes("'schedule_reservation_id'"));\nassert(orderService.includes('scheduledAt: source.scheduled_at || source.scheduledAt ||'));\nassert(!orderService.includes('scheduleReservationId: source.schedule_reservation_id'));\nassert(orderService.includes('p_scheduled_at: body.scheduledAt || body.scheduled_at || null'));\nassert(orderStateMachine.includes("accepted: Object.freeze(['quoted', 'scheduled', 'in_progress', 'cancelled'])"));\nassert(orderStateMachine.includes("quoted: Object.freeze(['accepted', 'scheduled', 'in_progress', 'cancelled'])"));`;
const newGapBlock = `const b04bImplemented = fs.existsSync(PATHS.b04bEvidence);\nif (b04bImplemented) {\n  assert(readOrderSelect(orderService).includes("'schedule_reservation_id'"));\n  assert(orderService.includes('scheduleReservationId: scheduleProjection.scheduleReservationId'));\n  assert(orderService.includes('scheduleAuthority: scheduleProjection.authority'));\n  assert(orderService.includes('p_scheduled_at: null'));\n  assert(!orderService.includes('p_scheduled_at: body.scheduledAt || body.scheduled_at || null'));\n  assert(!orderStateMachine.includes("accepted: Object.freeze(['quoted', 'scheduled', 'in_progress', 'cancelled'])"));\n  assert(!orderStateMachine.includes("quoted: Object.freeze(['accepted', 'scheduled', 'in_progress', 'cancelled'])"));\n  assert(orderStateMachine.includes('DOKE_ORDER_SCHEDULE_AUTHORITY_REQUIRED'));\n} else {\n  // Current gaps are intentionally frozen by readiness and must remain visible until B04B.\n  assert(orderService.includes("'scheduled_at',"));\n  assert(!readOrderSelect(orderService).includes("'schedule_reservation_id'"));\n  assert(orderService.includes('scheduledAt: source.scheduled_at || source.scheduledAt ||'));\n  assert(!orderService.includes('scheduleReservationId: source.schedule_reservation_id'));\n  assert(orderService.includes('p_scheduled_at: body.scheduledAt || body.scheduled_at || null'));\n  assert(orderStateMachine.includes("accepted: Object.freeze(['quoted', 'scheduled', 'in_progress', 'cancelled'])"));\n  assert(orderStateMachine.includes("quoted: Object.freeze(['accepted', 'scheduled', 'in_progress', 'cancelled'])"));\n}`;
replaceExact(b04aAuditPath, oldGapBlock, newGapBlock);

const b04aTestPath = 'scripts/test-sched-001-b04-ord-canonical-wiring-readiness.js';
replaceExact(
  b04aTestPath,
  "  if (!['accepted', 'quoted', 'scheduled'].includes(current)) return false;",
  "  if (!['accepted', 'scheduled'].includes(current)) return false;"
);

const packagePath = 'package.json';
const pkg = JSON.parse(read(packagePath));
pkg.scripts['audit:sched-001-b04b-ord-canonical-wiring-implementation'] = 'node scripts/audit-sched-001-b04b-ord-canonical-wiring-implementation.js';
pkg.scripts['test:sched-001-b04b-ord-canonical-wiring-runtime'] = 'node scripts/test-sched-001-b04b-ord-canonical-wiring-runtime.js';
pkg.scripts['audit:sched-001-b04-ord-canonical-wiring-readiness'] = 'node scripts/audit-sched-001-b04-ord-canonical-wiring-readiness.js';
pkg.scripts['test:sched-001-b04-ord-canonical-wiring-readiness'] = 'node scripts/test-sched-001-b04-ord-canonical-wiring-readiness.js';
write(packagePath, JSON.stringify(pkg, null, 2) + '\n');

const matrixPath = 'config/domain-completion-matrix.json';
const matrix = JSON.parse(read(matrixPath));
matrix.version = '1.3.65';
matrix.updatedAt = '2026-08-01T06:53:00-03:00';
const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
if (!sched || !ord) throw new Error('SCHED-001 or ORD-001 missing from matrix.');
[
  'backend/modules/orders/order-scheduling-authority.js',
  'config/sched-001-b04b-ord-canonical-wiring-implementation.json',
  'docs/SCHED-001-B04B-ORD-CANONICAL-WIRING-IMPLEMENTATION.md',
  'docs/validation/SCHED-001-B04B-ORD-CANONICAL-WIRING-IMPLEMENTATION.json',
  'scripts/audit-sched-001-b04b-ord-canonical-wiring-implementation.js',
  'scripts/test-sched-001-b04b-ord-canonical-wiring-runtime.js',
  '.github/workflows/sched-001-b04b-ord-canonical-wiring-implementation.yml'
].forEach((path) => pushUnique(sched.requiredPaths, path));
[
  'audit:sched-001-b04b-ord-canonical-wiring-implementation',
  'test:sched-001-b04b-ord-canonical-wiring-runtime'
].forEach((name) => pushUnique(sched.tests, name));
pushUnique(sched.evidence, 'SCHED-B04B wires the ORD read model to schedule_reservation_id, demotes client-supplied dates to metadata intent, blocks generic scheduled transitions, and projects confirmed reservations atomically as scheduled.');
pushUnique(sched.evidence, 'Reservation cancellation clears the matching reference and time projection, returns scheduled orders to accepted, and start/cancel paths fail closed when canonical scheduling authority is unavailable.');
pushUnique(sched.nextActions, 'Prepare SCHED-B04C authenticated ORD/SCHED composition canary readiness with rollback-only staging evidence.');
[
  'backend/modules/orders/order-scheduling-authority.js',
  'config/sched-001-b04b-ord-canonical-wiring-implementation.json',
  'docs/validation/SCHED-001-B04B-ORD-CANONICAL-WIRING-IMPLEMENTATION.json'
].forEach((path) => pushUnique(ord.requiredPaths, path));
[
  'audit:sched-001-b04b-ord-canonical-wiring-implementation',
  'test:sched-001-b04b-ord-canonical-wiring-runtime'
].forEach((name) => pushUnique(ord.tests, name));
pushUnique(ord.evidence, 'ORD generic commands can no longer manufacture scheduled state or cancel/start through an unresolved canonical reservation; B04B remains fail-closed until the authenticated composition canary.');
pushUnique(ord.nextActions, 'Validate ORD/SCHED authenticated composition and atomic order-event behavior in SCHED-B04C before frontend authority switch.');
write(matrixPath, JSON.stringify(matrix, null, 2) + '\n');

const tempWorkflow = '.github/workflows/sched-001-b04b-repository-applicator.yml';
if (fs.existsSync(tempWorkflow)) fs.unlinkSync(tempWorkflow);
if (fs.existsSync(__filename)) fs.unlinkSync(__filename);

console.log('SCHED-B04B repository implementation applied; temporary executor removed.');
