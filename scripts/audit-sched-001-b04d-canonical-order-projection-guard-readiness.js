#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const CONFIG_PATH = 'config/sched-001-b04d-canonical-order-projection-guard-readiness.json';
const MIGRATION_PATH = 'supabase/migrations/20260801183000_sched_b04d_canonical_order_projection_guard.sql';
const ADAPTER_PATH = 'backend/modules/scheduling/scheduling-postgres-repository.js';
const DOC_PATH = 'docs/SCHED-001-B04D-CANONICAL-ORDER-PROJECTION-GUARD-READINESS.md';
const VALIDATION_PATH = 'docs/validation/SCHED-001-B04D-CANONICAL-ORDER-PROJECTION-GUARD-READINESS.json';
const WORKFLOW_PATH = '.github/workflows/sched-001-b04d-canonical-order-projection-guard-readiness.yml';
const EXPECTED_AUTHORIZATION = 'I_EXPLICITLY_AUTHORIZE_SCHED_B04D_CANONICAL_ORDER_PROJECTION_GUARD_MIGRATION_ON_DOKE_STAGING';

for (const path of [CONFIG_PATH, MIGRATION_PATH, ADAPTER_PATH, DOC_PATH, VALIDATION_PATH, WORKFLOW_PATH]) {
  assert(fs.existsSync(path), `Missing B04D evidence path: ${path}`);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const validation = JSON.parse(fs.readFileSync(VALIDATION_PATH, 'utf8'));
const migration = fs.readFileSync(MIGRATION_PATH, 'utf8');
const adapter = fs.readFileSync(ADAPTER_PATH, 'utf8');
const documentation = fs.readFileSync(DOC_PATH, 'utf8');
const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');

assert.strictEqual(config.domain, 'SCHED-001');
assert.strictEqual(config.dependentDomain, 'ORD-001');
assert.strictEqual(config.sublot, 'SCHED-B04D');
assert.strictEqual(config.scope, 'repository_only_canonical_order_projection_guard_readiness');
assert.strictEqual(config.rootCauseEvidence.failureCode, 'DOKE_ORDER_TRANSITION_INVALID');
assert.strictEqual(config.rootCauseEvidence.transactionRolledBack, true);
assert.strictEqual(config.rootCauseEvidence.residueCountsZero, true);
assert.strictEqual(config.rootCauseEvidence.authorityCountDeltaZero, true);
assert.strictEqual(config.migration.repositoryOnly, true);
assert.strictEqual(config.migration.appliedToStaging, false);
assert.strictEqual(config.migration.appliedToProduction, false);
assert.strictEqual(config.authorityContract.genericScheduledToAcceptedTransitionAllowed, false);
assert.strictEqual(config.authorityContract.directScheduleFieldWritesForbidden, true);
assert.strictEqual(config.authorityContract.serviceRoleOnly, true);
assert.strictEqual(config.authorization.requiredExactPhrase, EXPECTED_AUTHORIZATION);
assert.strictEqual(config.authorization.genericContinuationAllowed, false);
assert.strictEqual(config.authorization.coversStagingMigrationOnly, true);
assert.strictEqual(config.authorization.coversCanaryRetry, false);
assert.strictEqual(config.capabilities.adapterWiringPrepared, true);
assert.strictEqual(config.capabilities.localStaticTestsPrepared, true);
assert.strictEqual(config.capabilities.stagingMigrationApplied, false);
assert.deepStrictEqual(config.blockers.remainingOpen, ['SCHED-B04', 'ORD-B04']);

assert.strictEqual(validation.result, 'repository_readiness_prepared');
assert.strictEqual(validation.rootCause.rolledBack, true);
assert.strictEqual(validation.rootCause.postRollbackVerification, 'passed');
assert.strictEqual(validation.assertions.genericScheduledToAcceptedRemainsForbidden, true);
assert.strictEqual(validation.assertions.canonicalScheduledToAcceptedRestrictedToClearContext, true);
assert.strictEqual(validation.assertions.stagingMigrationsApplied, 0);
assert.strictEqual(validation.assertions.productionAccess, 0);
assert.strictEqual(validation.nextAuthorization, EXPECTED_AUTHORIZATION);

for (const marker of [
  'create or replace function private.apply_order_schedule_projection',
  'create or replace function private.clear_order_schedule_projection',
  "set_config('doke.order_schedule_projection_mode', 'project', true)",
  "set_config('doke.order_schedule_projection_mode', 'clear', true)",
  'DOKE_ORDER_SCHEDULE_PROJECTION_CONTEXT_REQUIRED',
  'DOKE_SCHEDULE_RESERVATION_PROJECTION_INVALID',
  'DOKE_SCHEDULE_RESERVATION_CLEAR_INVALID',
  'grant execute on function private.apply_order_schedule_projection',
  'grant execute on function private.clear_order_schedule_projection',
  'to service_role',
  'new.schedule_reservation_id is null',
  'new.scheduled_at is null',
  "old.status = 'scheduled' then 'accepted'"
]) {
  assert(migration.includes(marker), `Migration is missing marker: ${marker}`);
}
assert(!migration.includes('create or replace function private.doke_order_transition_allowed'),
  'B04D must not open the generic ORD transition graph.');
assert(!migration.match(/grant execute[^;]+to\s+(anon|authenticated)/i),
  'Canonical projection functions must not be executable by browser roles.');
assert(!migration.match(/supabase_migrations\.schema_migrations\s*(?:\)|set|values|where)/i),
  'Migration history must never be mutated manually.');

const projectStart = adapter.indexOf('async projectOrderSchedule(');
const clearStart = adapter.indexOf('async clearOrderSchedule(');
const expiredStart = adapter.indexOf('async listExpiredHolds(');
assert(projectStart >= 0 && clearStart > projectStart && expiredStart > clearStart,
  'Could not isolate adapter projection methods.');
const projectSection = adapter.slice(projectStart, clearStart);
const clearSection = adapter.slice(clearStart, expiredStart);
assert(projectSection.includes('private.apply_order_schedule_projection'));
assert(clearSection.includes('private.clear_order_schedule_projection'));
assert(!projectSection.includes('update public.orders'));
assert(!clearSection.includes('update public.orders'));
assert(projectSection.includes('/* sched-a05:project-order-schedule */'));
assert(clearSection.includes('/* sched-a05:clear-order-schedule */'));

assert(documentation.includes(EXPECTED_AUTHORIZATION));
assert(documentation.includes('No migration was applied to staging or production.'));
assert(documentation.includes('scheduled -> accepted'));

assert(workflow.includes('permissions:\n  contents: read'));
assert(!workflow.includes('SUPABASE_ACCESS_TOKEN'));
assert(!workflow.includes('SUPABASE_DB_PASSWORD'));
assert(!workflow.includes('workflow_dispatch'));
assert(!workflow.includes('contents: write'));

console.log('SCHED-B04D canonical order projection guard readiness audit passed.');
