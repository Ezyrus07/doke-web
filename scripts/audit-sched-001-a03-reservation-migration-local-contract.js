#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const CONFIG_PATH = 'config/sched-001-a03-reservation-migration-local-contract.json';
const DOC_PATH = 'docs/SCHED-001-A03-RESERVATION-MIGRATION-LOCAL-CONTRACT.md';
const EVIDENCE_PATH = 'docs/validation/SCHED-001-A03-RESERVATION-MIGRATION-LOCAL-CONTRACT.json';
const MIGRATION_PATH = 'supabase/migrations/20260731123000_sched_a03_reservation_authority.sql';
const TEST_PATH = 'scripts/test-sched-001-a03-reservation-migration-static.js';
const WORKFLOW_PATH = '.github/workflows/sched-001-a03-reservation-migration-local-contract.yml';

[CONFIG_PATH, DOC_PATH, EVIDENCE_PATH, MIGRATION_PATH, TEST_PATH, WORKFLOW_PATH].forEach((file) => {
  assert(fs.existsSync(file), `Missing SCHED-A03 asset: ${file}`);
});

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
const docs = fs.readFileSync(DOC_PATH, 'utf8');
const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');

assert.strictEqual(config.contractVersion, 'sched-a03-reservation-migration-local-contract-v1');
assert.strictEqual(config.status, 'repository_migration_generated_local_static_tests_only');
assert.strictEqual(config.domain, 'SCHED-001');
assert.strictEqual(config.scope, 'repository_only_migration_generation');
assert.strictEqual(config.migration.applied, false);
assert.strictEqual(config.migration.stagingAuthorized, false);
assert.strictEqual(config.migration.productionAuthorized, false);
assert.strictEqual(config.migration.requiredExtension, 'btree_gist');
assert.strictEqual(config.reservationAuthority.browserDmlAllowed, false);
assert.strictEqual(config.reservationAuthority.serviceRoleCrudOnly, true);
assert.deepStrictEqual(config.reservationAuthority.activeOccupancyStates, ['held', 'confirmed']);
assert.strictEqual(config.reservationAuthority.rangeConvention, '[start,end)');
assert.strictEqual(config.conflictProtection.adjacentRangesConflict, false);
assert.strictEqual(config.idempotency.minimumRetentionDays, 30);
assert.strictEqual(config.events.eventTypes.length, 6);
assert.strictEqual(config.legacyAvailabilityHardening.professionalMayInsertBooked, false);
assert.strictEqual(config.legacyAvailabilityHardening.professionalMayUpdateToBooked, false);
assert.deepStrictEqual(config.blockerDisposition, {
  'SCHED-B02': 'migration_generated_server_command_runtime_pending',
  'SCHED-B03': 'migration_generated_application_and_concurrency_proof_pending',
  'SCHED-B04': 'order_reference_generated_application_and_runtime_integration_pending',
  'SCHED-B05': 'policy_hardening_generated_application_pending'
});
Object.values(config.forbidden).forEach((value) => assert.strictEqual(value, true));
Object.entries(config.evidence).forEach(([key, value]) => {
  if (key === 'productionChanged' || key === 'pullRequestMerged') assert.strictEqual(value, false);
  else assert.strictEqual(value, 0);
});

assert.strictEqual(evidence.contractVersion, config.contractVersion);
assert.strictEqual(evidence.migration.generated, true);
assert.strictEqual(evidence.migration.applied, false);
assert.strictEqual(evidence.migration.wrappedInTransaction, true);
assert.strictEqual(evidence.security.anonReservationDmlGrant, false);
assert.strictEqual(evidence.security.authenticatedReservationDmlGrant, false);
assert.strictEqual(evidence.conflict.remoteConcurrencyProof, false);
assert.deepStrictEqual(evidence.blockers.closed, []);
assert.deepStrictEqual(evidence.blockers.remainingOpen, ['SCHED-B02', 'SCHED-B03', 'SCHED-B04', 'SCHED-B05']);
assert.strictEqual(evidence.execution.stagingReadsPerformed, 0);
assert.strictEqual(evidence.execution.stagingMutationsPerformed, 0);
assert.strictEqual(evidence.execution.migrationsApplied, 0);

[
  'create extension if not exists btree_gist with schema extensions',
  'public.schedule_reservations',
  "tstzrange(starts_at, ends_at, '[)')",
  'private.schedule_command_idempotency',
  'private.schedule_domain_events',
  'schedule_reservation_id',
  "status in ('available', 'blocked')"
].forEach((fragment) => assert(sql.includes(fragment), `Migration missing: ${fragment}`));

[
  'Only `held` and `confirmed` occupy time',
  'half-open `[start,end)`',
  '`btree_gist`',
  '`public.orders.schedule_reservation_id`',
  'cannot insert or update a slot to `booked`',
  'SCHED-A04 — Server Scheduling Command Module and Deterministic Runtime Tests',
  'staging mutations: 0'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing: ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/audit-sched-001-a03-reservation-migration-local-contract.js'));
assert(workflow.includes('node scripts/test-sched-001-a03-reservation-migration-static.js'));
assert(workflow.includes('node scripts/audit-sched-001-a02-command-event-timezone-conflict-contract.js'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('supabase '));
assert(!workflow.includes('curl '));
assert(!workflow.includes('apply_migration'));
assert(!workflow.includes('--execute'));

console.log('SCHED-A03 reservation migration local contract audit passed.');
