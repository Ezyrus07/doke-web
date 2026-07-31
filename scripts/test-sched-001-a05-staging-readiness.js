#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const { spawnSync } = require('child_process');

const CONFIG_PATH = 'config/sched-001-a05-persistence-readiness.json';
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

assert.strictEqual(config.contractVersion, 'sched-a05-persistence-readiness-v1');
assert.strictEqual(config.status, 'postgres_adapter_complete_staging_readiness_complete_application_unauthorized');
assert.strictEqual(config.adapter.supabaseJsMultiQueryTransactionUsed, false);
assert.strictEqual(config.adapter.transactionIsolation, 'serializable');
assert.strictEqual(config.adapter.parameterizedQueriesOnly, true);
assert.strictEqual(config.adapter.transactionPortMethods, 15);
assert.strictEqual(config.adapter.expiredHoldLocking, 'for update skip locked');
assert.deepStrictEqual(config.compatibilityGate.requiredOrder, ['20260731123000', '20260731151000']);
assert.strictEqual(config.compatibilityGate.applicationReady, true);
assert.strictEqual(config.compatibilityGate.applicationAuthorized, false);
assert.strictEqual(config.compatibilityGate.runtimeActivationReady, false);
assert.strictEqual(config.stagingPreflight.postgresMajor, 17);
assert.strictEqual(config.stagingPreflight.readOnlySqlQueries, 3);
assert.strictEqual(config.stagingPreflight.aggregateOnly, true);
assert.strictEqual(config.stagingPreflight.scheduleReservationsExists, false);
assert.strictEqual(config.stagingPreflight.btreeGistInstalled, false);
assert.strictEqual(config.stagingPreflight.availabilitySlots.rows, 0);
assert.strictEqual(config.stagingPreflight.orders.rows, 0);
assert.strictEqual(config.stagingPreflight.availabilitySlots.legacyInsertCanCreateBooked, true);
assert.strictEqual(config.stagingPreflight.availabilitySlots.a03HardeningRequired, true);
assert.strictEqual(config.authorization.exactPhrase, 'I_EXPLICITLY_AUTHORIZE_SCHED_A03_A04_MIGRATIONS_ON_DOKE_STAGING');
assert.strictEqual(config.rollback.strategy, 'forward_only_reviewed_rollback_migration');
assert.strictEqual(config.rollback.manualMigrationHistoryDeletionAllowed, false);
assert(config.rollback.requiredSequence.length >= 8);
assert.deepStrictEqual(Object.keys(config.blockerDisposition), ['SCHED-B02', 'SCHED-B03', 'SCHED-B04', 'SCHED-B05']);
assert.strictEqual(config.evidence.stagingReadsPerformed, 3);
assert.strictEqual(config.evidence.stagingMutationsPerformed, 0);
assert.strictEqual(config.evidence.migrationsApplied, 0);

for (const migration of config.migrations) {
  assert(fs.existsSync(migration.path), `Missing migration ${migration.path}`);
  const source = fs.readFileSync(migration.path, 'utf8').toLowerCase();
  assert(source.includes('repository-generated migration only'));
  assert(source.includes('do not apply without an exact, independent staging authorization'));
}

const dryRun = spawnSync(process.execPath, ['scripts/plan-sched-001-a05-staging-readiness.js', '--dry-run'], {
  encoding: 'utf8'
});
assert.strictEqual(dryRun.status, 0, dryRun.stderr);
const plan = JSON.parse(dryRun.stdout);
assert.strictEqual(plan.executeModeAvailable, false);
assert.strictEqual(plan.authorizationPresent, false);
assert.deepStrictEqual(plan.requiredOrder, config.compatibilityGate.requiredOrder);
assert.strictEqual(plan.migrations.length, 2);
assert(plan.migrations.every((item) => /^[a-f0-9]{64}$/.test(item.sha256)));

const forbidden = spawnSync(process.execPath, ['scripts/plan-sched-001-a05-staging-readiness.js', '--execute'], {
  encoding: 'utf8'
});
assert.strictEqual(forbidden.status, 2);
assert(forbidden.stderr.includes('dry-run only'));

console.log('SCHED-A05 staging migration readiness tests passed.');
