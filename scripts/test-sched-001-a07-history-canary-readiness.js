#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const { spawnSync } = require('child_process');

const config = JSON.parse(fs.readFileSync('config/sched-001-a07-history-canary-readiness.json', 'utf8'));
const evidence = JSON.parse(fs.readFileSync('docs/validation/SCHED-001-A07-MIGRATION-HISTORY-CANARY-READINESS.json', 'utf8'));
const canary = fs.readFileSync('supabase/tests/020_sched_a07_rolled_back_canaries.sql', 'utf8');
const planner = fs.readFileSync('scripts/plan-sched-001-a07-history-canaries.js', 'utf8');

assert.strictEqual(config.contractVersion, 'sched-a07-history-canary-readiness-v1');
assert.strictEqual(config.staging.canonicalSchemaApplied, true);
assert.strictEqual(config.staging.migrationHistoryAligned, false);
assert.strictEqual(config.historyRepair.authority, 'Supabase CLI migration repair');
assert.strictEqual(config.historyRepair.directSchemaMigrationsTableMutationAllowed, false);
assert.strictEqual(config.historyRepair.localFileRenameAllowed, false);
assert.strictEqual(config.historyRepair.migrationReapplicationAllowed, false);
assert.deepStrictEqual(
  config.staging.remoteRecordedMigrations.map((item) => item.version),
  ['20260731141315', '20260731141349']
);
assert.deepStrictEqual(
  config.staging.canonicalRepositoryMigrations.map((item) => item.version),
  ['20260731123000', '20260731151000']
);
assert.strictEqual(config.rolledBackCanaries.finalStatement, 'rollback');
assert.strictEqual(config.rolledBackCanaries.persistentRowsAllowed, false);
assert.strictEqual(config.capabilities.executeModeAvailable, false);
assert.strictEqual(config.capabilities.migrationHistoryMutationAvailable, false);
assert.strictEqual(config.capabilities.databaseCanaryMutationAvailable, false);
assert.strictEqual(config.evidence.stagingMutationsPerformed, 0);
assert.strictEqual(config.evidence.migrationHistoryMutationsPerformed, 0);
assert.strictEqual(config.evidence.canariesExecuted, 0);
assert.deepStrictEqual(evidence.blockers.closed, ['SCHED-B05']);
assert.deepStrictEqual(evidence.blockers.remainingOpen, ['SCHED-B02', 'SCHED-B03', 'SCHED-B04']);

const normalized = canary.toLowerCase().trim();
assert(normalized.startsWith('-- sched-a07 staging canaries.'));
assert(normalized.includes('\nbegin;'));
assert(normalized.endsWith('rollback;'));
assert.strictEqual((normalized.match(/\bbegin;/g) || []).length >= 1, true);
assert.strictEqual((normalized.match(/\brollback;/g) || []).length, 1);
assert(!normalized.includes('\ncommit;'));
assert(!normalized.includes('supabase_migrations.schema_migrations'));
assert(!normalized.includes('truncate '));
assert(!normalized.includes('drop table'));
assert(!normalized.includes('alter table'));
assert(!normalized.includes('create table'));
assert(!normalized.includes('delete from public.users'));
assert(!normalized.includes('update public.users'));
assert(normalized.includes('when exclusion_violation'));
assert(normalized.includes("tstzrange" ) === false, 'Canary must exercise the stored exclusion constraint rather than recreate it.');
assert(normalized.includes("'2035-08-06t13:00:00z'"));
assert(normalized.includes("'2026-11-01t01:30:00'"));
assert(normalized.includes("'2026-11-01t01:15:00'"));
assert(normalized.includes('local_end < local_start'));
assert(normalized.includes('when unique_violation'));
assert(normalized.includes('schedule_reservation_id = v_reservation_1'));

[
  '--execute',
  '--repair',
  'dry-run only',
  'authorizationPresent',
  'executeModeAvailable: false'
].forEach((fragment) => assert(planner.includes(fragment), `Planner missing ${fragment}`));
assert(!planner.includes('spawnSync'));
assert(!planner.includes('execSync'));
assert(!planner.includes('apply_migration'));
assert(!planner.includes('supabase_migrations.schema_migrations'));

const dryRun = spawnSync(process.execPath, ['scripts/plan-sched-001-a07-history-canaries.js'], {
  encoding: 'utf8',
  env: { ...process.env, SCHED_A07_AUTHORIZATION: '' }
});
assert.strictEqual(dryRun.status, 0, dryRun.stderr);
const plan = JSON.parse(dryRun.stdout);
assert.strictEqual(plan.mode, 'dry-run only');
assert.strictEqual(plan.authorizationPresent, false);
assert.strictEqual(plan.executeModeAvailable, false);
assert.strictEqual(plan.canary.finalStatement, 'rollback');
assert.strictEqual(plan.canary.persistentRowsAllowed, false);

for (const flag of ['--execute', '--apply', '--repair', '--mutate', '--run-canary']) {
  const rejected = spawnSync(process.execPath, ['scripts/plan-sched-001-a07-history-canaries.js', flag], {
    encoding: 'utf8'
  });
  assert.strictEqual(rejected.status, 2, `${flag} was not rejected`);
  assert(rejected.stderr.includes('dry-run only'));
}

console.log('SCHED-A07 migration history and rolled-back canary readiness tests passed.');
