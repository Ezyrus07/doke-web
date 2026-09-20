'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contract = JSON.parse(
  fs.readFileSync(path.join(root, 'config', 'ana-001-defense-in-depth-hardening-readiness.json'), 'utf8')
);

const checks = [];
const check = (name, value) => checks.push({ name, passed: Boolean(value) });

const sql = contract.plannedChanges?.plannedSql || [];
const normalized = sql.map((statement) => statement.trim().replace(/\s+/g, ' ').toLowerCase());

check('all planned statements are SQL strings', sql.every((statement) => typeof statement === 'string' && statement.trim()));
check(
  'only RLS enable or CREATE INDEX statements are planned',
  normalized.every(
    (statement) =>
      /^alter table private\.[a-z0-9_]+ enable row level security;$/.test(statement)
      || /^create index if not exists [a-z0-9_]+ on private\.[a-z0-9_]+ \([a-z0-9_]+\);$/.test(statement)
  )
);

const forbiddenTokens = [
  ' force row level security',
  ' create policy ',
  ' alter policy ',
  ' drop policy ',
  ' grant ',
  ' revoke ',
  ' insert ',
  ' update ',
  ' delete ',
  ' truncate ',
  ' drop table ',
  ' alter table public.',
  ' create index if not exists public.'
];
for (const token of forbiddenTokens) {
  check('forbidden SQL token absent: ' + token.trim(), !(' ' + normalized.join(' ') + ' ').includes(token));
}

const rlsStatements = normalized.filter((statement) => statement.includes('enable row level security'));
const indexStatements = normalized.filter((statement) => statement.startsWith('create index if not exists '));
check('exactly four RLS statements', rlsStatements.length === 4);
check('exactly three index statements', indexStatements.length === 3);
check('no duplicate RLS statements', new Set(rlsStatements).size === rlsStatements.length);
check('no duplicate index statements', new Set(indexStatements).size === indexStatements.length);

const expectedIndexPairs = new Map([
  ['private.analytics_behavior_events_v1', 'order_id'],
  ['private.analytics_data_quality_rollups_v1', 'source_run_id'],
  ['private.analytics_metric_snapshots_v1', 'supersedes_snapshot_id']
]);
for (const [table, column] of expectedIndexPairs) {
  check(
    table + ' FK index planned',
    indexStatements.some((statement) => statement.includes(' on ' + table + ' (' + column + ');'))
  );
}

const expectedRlsTables = new Set([
  'private.analytics_behavior_events_v1',
  'private.analytics_metric_snapshots_v1',
  'private.analytics_reconciliation_runs_v1',
  'private.analytics_data_quality_rollups_v1'
]);
for (const table of expectedRlsTables) {
  check(
    table + ' RLS planned exactly once',
    rlsStatements.filter((statement) => statement === 'alter table ' + table + ' enable row level security;').length === 1
  );
}

check('no policy creation authority', contract.plannedChanges?.createPolicies === false);
check('FORCE RLS remains forbidden', contract.plannedChanges?.forceRls === false);
check('grant expansion remains forbidden', contract.preservedAuthorities?.grantExpansionAllowed === false);
check('browser activation remains forbidden', contract.preservedAuthorities?.frontendActivationAllowed === false);
check('production remains forbidden', contract.productionAllowed === false);
check('staging mutation remains forbidden', contract.stagingMutationAllowed === false);
check('generic continuation cannot authorize migration', contract.genericContinuationAccepted === false);
check(
  'exact authorization phrase is non-generic',
  typeof contract.requiredExplicitAuthorization === 'string'
    && contract.requiredExplicitAuthorization.includes('ana-hardening-staging-migration')
    && !['prossiga', 'continue', 'go'].includes(contract.requiredExplicitAuthorization.toLowerCase())
);

const migrationPath = path.join(root, contract.plannedMigration.path);
check('no migration file exists yet', !fs.existsSync(migrationPath));

const failedCases = checks.filter((entry) => !entry.passed).map((entry) => entry.name);
console.log(
  JSON.stringify(
    {
      contractId: 'ana-001-defense-in-depth-hardening-readiness-negative-v1',
      total: checks.length,
      passed: checks.length - failedCases.length,
      failed: failedCases.length,
      status: failedCases.length ? 'failed' : 'passed',
      failedCases
    },
    null,
    2
  )
);
if (failedCases.length) process.exitCode = 1;
