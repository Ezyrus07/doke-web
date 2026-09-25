'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const contract = JSON.parse(
  fs.readFileSync(path.join(root, 'config', 'ana-001-defense-in-depth-hardening-readiness.json'), 'utf8')
);
const migration = fs.readFileSync(path.join(root, contract.plannedMigration.path), 'utf8');

const checks = [];
const check = (name, value) => checks.push({ name, passed: Boolean(value) });
const normalized = migration
  .replace(/--.*$/gm, '')
  .split(';')
  .map((x) => x.trim().replace(/\s+/g, ' ').toLowerCase())
  .filter(Boolean)
  .map((x) => x + ';');

check('explicit authorization captured', contract.authorization?.phrase === contract.requiredExplicitAuthorization);
check('staging only', contract.environment === 'staging' && contract.authorization?.targetEnvironment === 'staging');
check('production forbidden', contract.productionAllowed === false && contract.authorization?.productionAllowed === false);
check('merge forbidden', contract.authorization?.mergeAllowed === false);
check('generic continuation rejected', contract.genericContinuationAccepted === false);
check('migration authorized', contract.migrationAuthorized === true && contract.stagingMutationAllowed === true);
check('exactly seven statements', normalized.length === 7);
check('exactly four RLS enables', normalized.filter((s) => /enable row level security/.test(s)).length === 4);
check('exactly three indexes', normalized.filter((s) => /^create index if not exists /.test(s)).length === 3);
check('no FORCE RLS', !migration.toLowerCase().includes('force row level security'));
check('no policy DDL', !/\b(create|alter|drop)\s+policy\b/i.test(migration));
check('no grant expansion', !/\bgrant\b/i.test(migration));
check('no revoke mutation', !/\brevoke\b/i.test(migration));
check('no DML', !/\b(insert|update|delete|truncate)\b/i.test(migration));
check('no public table target', !/alter\s+table\s+public\./i.test(migration));
check('RLS behavior table', /alter table private\.analytics_behavior_events_v1\s+enable row level security;/i.test(migration));
check('RLS snapshot table', /alter table private\.analytics_metric_snapshots_v1\s+enable row level security;/i.test(migration));
check('RLS reconciliation table', /alter table private\.analytics_reconciliation_runs_v1\s+enable row level security;/i.test(migration));
check('RLS DQ table', /alter table private\.analytics_data_quality_rollups_v1\s+enable row level security;/i.test(migration));
check('order FK index', /analytics_behavior_events_order_id_idx\s+on private\.analytics_behavior_events_v1 \(order_id\)/i.test(migration));
check('source run FK index', /analytics_dq_rollups_source_run_id_idx\s+on private\.analytics_data_quality_rollups_v1 \(source_run_id\)/i.test(migration));
check('supersedes FK index', /analytics_metric_snapshots_supersedes_id_idx\s+on private\.analytics_metric_snapshots_v1 \(supersedes_snapshot_id\)/i.test(migration));
check('preflight found no existing planned indexes',
  Array.isArray(contract.observedReadOnlyStaging?.plannedIndexesAlreadyPresent)
    && contract.observedReadOnlyStaging.plannedIndexesAlreadyPresent.length === 0
);
check('preflight found no policies',
  Array.isArray(contract.observedReadOnlyStaging?.policies)
    && contract.observedReadOnlyStaging.policies.length === 0
);

const failedCases = checks.filter((entry) => !entry.passed).map((entry) => entry.name);
console.log(JSON.stringify({
  contractId: 'ana-001-defense-in-depth-hardening-readiness-negative-v2',
  total: checks.length,
  passed: checks.length - failedCases.length,
  failed: failedCases.length,
  status: failedCases.length ? 'failed' : 'passed',
  failedCases
}, null, 2));
if (failedCases.length) process.exitCode = 1;
