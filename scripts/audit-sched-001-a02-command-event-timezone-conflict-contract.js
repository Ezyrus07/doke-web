#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const CONFIG_PATH = 'config/sched-001-a02-command-event-timezone-conflict-contract.json';
const DOC_PATH = 'docs/SCHED-001-A02-COMMAND-EVENT-TIMEZONE-CONFLICT-CONTRACT.md';
const EVIDENCE_PATH = 'docs/validation/SCHED-001-A02-COMMAND-EVENT-TIMEZONE-CONFLICT-CONTRACT.json';
const CONTRACT_PATH = 'backend/modules/scheduling/scheduling-contract.js';
const TEST_PATH = 'scripts/test-sched-001-a02-contract-runtime.js';
const WORKFLOW_PATH = '.github/workflows/sched-001-a02-command-event-timezone-conflict-contract.yml';
const MATRIX_PATH = 'config/domain-completion-matrix.json';

[CONFIG_PATH, DOC_PATH, EVIDENCE_PATH, CONTRACT_PATH, TEST_PATH, WORKFLOW_PATH, MATRIX_PATH, 'package.json']
  .forEach((file) => assert(fs.existsSync(file), `Missing SCHED-A02 asset: ${file}`));

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const docs = fs.readFileSync(DOC_PATH, 'utf8');
const contractSource = fs.readFileSync(CONTRACT_PATH, 'utf8');
const testSource = fs.readFileSync(TEST_PATH, 'utf8');
const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');

const compareVersions = (left, right) => {
  const a = String(left).split('.').map(Number);
  const b = String(right).split('.').map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const delta = (a[index] || 0) - (b[index] || 0);
    if (delta !== 0) return delta;
  }
  return 0;
};

assert.strictEqual(config.contractVersion, 'sched-a02-command-event-timezone-conflict-contract-v2');
assert.strictEqual(config.status, 'repository_contract_frozen_migration_and_runtime_pending');
assert.strictEqual(config.domain, 'SCHED-001');
assert.strictEqual(config.scope, 'repository_only_executable_contract');
assert(config.compatibilityCorrection.includes('aggregate-aware'));
assert.strictEqual(config.authority.canonicalOwner, 'SCHED-001');
assert.strictEqual(config.authority.reservationMutationBoundary, 'server_command_only');
assert.strictEqual(config.authority.browserMayConfirmBooking, false);
assert.strictEqual(config.authority.professionalMaySetBookedDirectly, false);

assert.deepStrictEqual(config.entities.scheduleReservation.states, ['held', 'confirmed', 'cancelled', 'expired']);
assert.deepStrictEqual(config.entities.scheduleReservation.activeOccupancyStates, ['held', 'confirmed']);
assert.strictEqual(Object.keys(config.commands).length, 6);
assert.strictEqual(config.commands.upsert_availability_rule.aggregateType, 'availability_rule');
assert.strictEqual(config.commands.create_schedule_hold.aggregateType, 'reservation');
assert.strictEqual(config.commands.create_schedule_hold.holdTtlSeconds, 600);
assert.deepStrictEqual(config.commands.create_schedule_hold.holdTtlAllowedRangeSeconds, [300, 900]);
assert.deepStrictEqual(config.commands.confirm_schedule_reservation.authorizedActors, ['order_service', 'support', 'admin']);
assert(!config.commands.confirm_schedule_reservation.authorizedActors.includes('professional_owner'));
assert.strictEqual(config.transitions.length, 5);

assert.strictEqual(config.idempotency.sameKeyDifferentPayload, 'reject with DOKE_SCHEDULE_IDEMPOTENCY_CONFLICT');
assert.strictEqual(config.optimisticConcurrency.field, 'version');
assert.strictEqual(config.optimisticConcurrency.conflictCode, 'DOKE_SCHEDULE_VERSION_CONFLICT');
assert.strictEqual(config.timePolicy.canonicalInstantStorage, 'UTC timestamptz');
assert.strictEqual(config.timePolicy.ruleTimezone, 'IANA identifier');
assert.strictEqual(config.timePolicy.rangeConvention, 'half-open [start,end)');
assert.strictEqual(config.timePolicy.adjacentRangesConflict, false);
assert.strictEqual(config.timePolicy.minimumDurationMinutes, 15);
assert.strictEqual(config.conflictPolicy.requiredExtension, 'btree_gist');
assert(config.conflictPolicy.databasePrimitive.includes('GiST exclusion constraint'));
assert.strictEqual(config.conflictPolicy.conflictCode, 'DOKE_SCHEDULE_CONFLICT');
assert.strictEqual(config.events.eventStore, 'private.schedule_domain_events');
assert.deepStrictEqual(config.events.aggregateTypes, ['availability_rule', 'reservation']);
assert.strictEqual(config.events.eventKey, 'schedule:{aggregate_type}:{aggregate_id}:v{sequence_no}');
assert.deepStrictEqual(config.events.conditionalReferences.availability_rule, ['availability_rule_id']);
assert.deepStrictEqual(config.events.conditionalReferences.reservation, ['reservation_id', 'order_id']);
assert.strictEqual(config.events.types.length, 6);
assert(config.events.transactionality.includes('canonical mutation and durable event insertion'));
assert.strictEqual(config.orderIntegration.canonicalReference, 'orders.schedule_reservation_id');
assert.strictEqual(config.orderIntegration.scheduledAtRole, 'read projection only');
assert.strictEqual(config.orderedNextActions.length, 4);
Object.values(config.forbidden).forEach((value) => assert.strictEqual(value, true));
Object.entries(config.evidence).forEach(([key, value]) => {
  if (key === 'productionChanged' || key === 'pullRequestMerged') assert.strictEqual(value, false);
  else assert.strictEqual(value, 0);
});

assert.strictEqual(evidence.contractVersion, config.contractVersion);
assert.strictEqual(evidence.status, config.status);
assert.strictEqual(evidence.contract.commandCount, 6);
assert.strictEqual(evidence.contract.eventTypeCount, 6);
assert.deepStrictEqual(evidence.contract.eventAggregateTypes, ['availability_rule', 'reservation']);
assert.strictEqual(evidence.contract.serverOnlyReservationMutation, true);
assert.strictEqual(evidence.time.rangeConvention, '[start,end)');
assert.strictEqual(evidence.time.adjacentRangesConflict, false);
assert.strictEqual(evidence.conflict.requiredExtension, 'btree_gist');
assert.strictEqual(evidence.concurrency.optimisticVersionRequired, true);
assert.strictEqual(evidence.concurrency.idempotencyRequired, true);
assert.strictEqual(evidence.events.availabilityRuleEventHasReservationId, false);
assert.strictEqual(evidence.events.reservationEventsRequireOrderId, true);
assert.strictEqual(evidence.events.transactionalWithCanonicalMutation, true);
assert.deepStrictEqual(evidence.blockers.closed, []);
assert.deepStrictEqual(evidence.blockers.remainingOpen, ['SCHED-B02', 'SCHED-B03', 'SCHED-B04', 'SCHED-B05']);
assert.strictEqual(evidence.execution.stagingReadsPerformed, 0);
assert.strictEqual(evidence.execution.stagingMutationsPerformed, 0);
assert.strictEqual(evidence.execution.migrationsApplied, 0);

[
  "const RANGE_CONVENTION = '[start,end)'",
  "const EVENT_AGGREGATE_TYPES = Object.freeze(['availability_rule', 'reservation'])",
  'function validateRange',
  'function rangesOverlap',
  'function assertNoActiveConflict',
  'function assertTransition',
  'function assertExpectedVersion',
  'function assertIdempotencyReplay',
  'function buildEventKey',
  'function isHoldExpired',
  'DOKE_SCHEDULE_CONFLICT',
  'DOKE_SCHEDULE_VERSION_CONFLICT',
  'DOKE_SCHEDULE_IDEMPOTENCY_CONFLICT',
  'DOKE_SCHEDULE_EVENT_AGGREGATE_INVALID'
].forEach((fragment) => assert(contractSource.includes(fragment), `Contract module missing: ${fragment}`));
assert(!contractSource.includes('fetch('));
assert(!contractSource.includes('supabase'));
assert(!contractSource.includes('process.env'));
assert(testSource.includes('adjacent'));
assert(testSource.includes("buildEventKey('availability_rule'"));
assert(testSource.includes('DOKE_SCHEDULE_ACTOR_FORBIDDEN'));
assert(testSource.includes('DOKE_SCHEDULE_IDEMPOTENCY_CONFLICT'));

assert(compareVersions(matrix.version, '1.3.46') >= 0, `Matrix version ${matrix.version} predates SCHED-A03.`);
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
assert(ord, 'ORD-001 missing from matrix');
assert(sched, 'SCHED-001 missing from matrix');
assert(sched.maturity >= 1);
assert(['none', 'contract_only', 'partial', 'canonical'].includes(sched.serverAuthority));
assert.strictEqual(sched.securityGate, 'partial');
assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B03', 'SCHED-B04', 'SCHED-B05']);
assert(config.orderedNextActions[0].includes('SCHED-A04'));
assert(sched.nextActions[0].includes('SCHED-A05'));
assert(ord.nextActions[0].includes('SCHED-A05'));

[CONFIG_PATH, DOC_PATH, EVIDENCE_PATH, CONTRACT_PATH, TEST_PATH,
  'scripts/audit-sched-001-a02-command-event-timezone-conflict-contract.js', WORKFLOW_PATH]
  .forEach((path) => {
    assert(sched.requiredPaths.includes(path), `SCHED requiredPaths missing ${path}`);
    assert(ord.requiredPaths.includes(path), `ORD requiredPaths missing ${path}`);
  });
assert(sched.tests.includes('audit:sched-001-a02-command-event-timezone-conflict-contract'));
assert(sched.tests.includes('test:sched-001-a02-contract-runtime'));
assert(ord.tests.includes('audit:sched-001-a02-command-event-timezone-conflict-contract'));
assert.strictEqual(pkg.scripts['audit:sched-001-a02-command-event-timezone-conflict-contract'], 'node scripts/audit-sched-001-a02-command-event-timezone-conflict-contract.js');
assert.strictEqual(pkg.scripts['test:sched-001-a02-contract-runtime'], 'node scripts/test-sched-001-a02-contract-runtime.js');

[
  'server-authoritative scheduling contract',
  'professional cannot directly mark a slot as booked',
  '`held` → `confirmed`',
  'same key and different payload',
  'half-open `[start,end)`',
  'btree_gist',
  'aggregate-aware',
  'schedule:{aggregate_type}:{aggregate_id}:v{sequence_no}',
  'private.schedule_domain_events',
  'SCHED-A04 — Server Scheduling Command Module and Deterministic Runtime Tests',
  'staging mutations: 0'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing: ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/audit-sched-001-a02-command-event-timezone-conflict-contract.js'));
assert(workflow.includes('node scripts/test-sched-001-a02-contract-runtime.js'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('supabase '));
assert(!workflow.includes('curl '));
assert(!workflow.includes('--execute'));
assert(!workflow.includes('apply_migration'));

console.log('SCHED-A02 command, event, timezone and conflict contract audit passed.');
