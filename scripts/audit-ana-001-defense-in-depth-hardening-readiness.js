'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contractPath = path.join(root, 'config', 'ana-001-defense-in-depth-hardening-readiness.json');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

const a03 = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260918232000_ana_a03_behavioral_event_ledger.sql'),
  'utf8'
);
const a04 = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260918233000_ana_a04_metric_projection_runtime.sql'),
  'utf8'
);
const a05 = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260918234000_ana_a05_reconciliation_runtime.sql'),
  'utf8'
);

const checks = [];
const check = (name, value) => checks.push({ name, passed: Boolean(value) });

check('contract id', contract.contractId === 'ana-001-defense-in-depth-hardening-readiness-v1');
check('domain', contract.domain === 'ANA-001');
check('staging target', contract.environment === 'staging' && contract.projectRef === 'zwkczgewzbsorbrjuzpb');
check('repository-only scope', contract.scope === 'repository_only_preflight');
check(
  'status remains unapplied',
  contract.status === 'repository_preflight_ready_staging_migration_not_authorized'
);
check('production forbidden', contract.productionAllowed === false);
check('staging mutation forbidden', contract.stagingMutationAllowed === false);
check('migration not authorized', contract.migrationAuthorized === false);
check('generic continuation rejected', contract.genericContinuationAccepted === false);
check(
  'explicit authorization phrase',
  contract.requiredExplicitAuthorization === 'authorize-ana-hardening-staging-migration'
);

const expectedTables = [
  'private.analytics_behavior_events_v1',
  'private.analytics_metric_snapshots_v1',
  'private.analytics_reconciliation_runs_v1',
  'private.analytics_data_quality_rollups_v1'
];

check(
  'four exact RLS targets',
  Array.isArray(contract.plannedChanges?.enableRls)
    && contract.plannedChanges.enableRls.length === expectedTables.length
    && expectedTables.every((table) => contract.plannedChanges.enableRls.includes(table))
);
check('FORCE RLS forbidden', contract.plannedChanges?.forceRls === false);
check('new policies forbidden', contract.plannedChanges?.createPolicies === false);
check('existing grants preserved', contract.plannedChanges?.preserveExistingGrants === true);

for (const table of expectedTables) {
  const observed = contract.observedReadOnlyStaging?.tables?.[table];
  check(table + ' observed', Boolean(observed));
  check(table + ' RLS currently off', observed?.rlsEnabled === false);
  check(table + ' FORCE RLS currently off', observed?.forceRls === false);
  check(table + ' anon direct grant absent', observed?.anonDirectTableGrant === false);
  check(table + ' authenticated direct grant absent', observed?.authenticatedDirectTableGrant === false);
  check(
    table + ' service role SELECT only',
    Array.isArray(observed?.serviceRoleDirectPrivileges)
      && observed.serviceRoleDirectPrivileges.length === 1
      && observed.serviceRoleDirectPrivileges[0] === 'SELECT'
  );
}

check('postgres bypasses RLS', contract.observedReadOnlyStaging?.roles?.postgres?.bypassRls === true);
check('service role bypasses RLS', contract.observedReadOnlyStaging?.roles?.service_role?.bypassRls === true);
check('anon does not bypass RLS', contract.observedReadOnlyStaging?.roles?.anon?.bypassRls === false);
check(
  'authenticated does not bypass RLS',
  contract.observedReadOnlyStaging?.roles?.authenticated?.bypassRls === false
);

const writers = contract.observedReadOnlyStaging?.writerFunctions || [];
const expectedWriters = [
  'public.record_analytics_behavior_event_v1(jsonb)',
  'public.append_analytics_metric_snapshot_v1(jsonb)',
  'public.run_analytics_order_reconciliation_v1(timestamptz,timestamptz)',
  'public.compute_analytics_order_health_v1(timestamptz,timestamptz,text,text)'
];
for (const name of expectedWriters) {
  const writer = writers.find((entry) => entry.name === name);
  check(name + ' observed', Boolean(writer));
  check(name + ' postgres owner', writer?.owner === 'postgres');
  check(name + ' security definer', writer?.securityDefiner === true);
  check(
    name + ' execute roles restricted',
    Array.isArray(writer?.directExecuteRoles)
      && writer.directExecuteRoles.length === 2
      && writer.directExecuteRoles.includes('postgres')
      && writer.directExecuteRoles.includes('service_role')
  );
}

const expectedIndexes = [
  ['analytics_behavior_events_order_id_idx', 'private.analytics_behavior_events_v1', 'order_id'],
  ['analytics_dq_rollups_source_run_id_idx', 'private.analytics_data_quality_rollups_v1', 'source_run_id'],
  ['analytics_metric_snapshots_supersedes_id_idx', 'private.analytics_metric_snapshots_v1', 'supersedes_snapshot_id']
];

check(
  'three exact covering indexes planned',
  Array.isArray(contract.plannedChanges?.indexes)
    && contract.plannedChanges.indexes.length === expectedIndexes.length
);
for (const [name, table, column] of expectedIndexes) {
  const index = contract.plannedChanges.indexes.find((entry) => entry.name === name);
  check(name + ' target table', index?.table === table);
  check(
    name + ' leading FK column',
    Array.isArray(index?.columns) && index.columns.length === 1 && index.columns[0] === column
  );
}

const plannedSql = contract.plannedChanges?.plannedSql || [];
check('seven idempotent planned statements', Array.isArray(plannedSql) && plannedSql.length === 7);

const joinedSql = plannedSql.join('\n').toLowerCase();
for (const table of expectedTables) {
  check(
    table + ' enables RLS',
    joinedSql.includes('alter table ' + table + ' enable row level security;')
  );
}
for (const [name, table, column] of expectedIndexes) {
  check(
    name + ' SQL exact',
    joinedSql.includes(
      'create index if not exists ' + name + ' on ' + table + ' (' + column + ');'
    )
  );
}

check('no FORCE RLS SQL', !joinedSql.includes('force row level security'));
check('no CREATE POLICY SQL', !joinedSql.includes('create policy'));
check('no GRANT SQL', !/\bgrant\b/.test(joinedSql));
check('no REVOKE SQL', !/\brevoke\b/.test(joinedSql));
check('no DROP SQL', !/\bdrop\b/.test(joinedSql));
check('no DML SQL', !/\b(insert|update|delete|truncate)\b/.test(joinedSql));

check(
  'A03 browser table grants remain revoked',
  a03.includes('revoke all on table private.analytics_behavior_events_v1 from public, anon, authenticated, service_role;')
    && a03.includes('grant select on table private.analytics_behavior_events_v1 to service_role;')
);
check(
  'A04 browser table grants remain revoked',
  a04.includes('revoke all on table private.analytics_metric_snapshots_v1 from public, anon, authenticated, service_role;')
    && a04.includes('grant select on table private.analytics_metric_snapshots_v1 to service_role;')
);
check(
  'A05 browser table grants remain revoked',
  a05.includes('revoke all on table private.analytics_reconciliation_runs_v1 from public, anon, authenticated, service_role;')
    && a05.includes('revoke all on table private.analytics_data_quality_rollups_v1 from public, anon, authenticated, service_role;')
    && a05.includes('grant select on table private.analytics_reconciliation_runs_v1 to service_role;')
    && a05.includes('grant select on table private.analytics_data_quality_rollups_v1 to service_role;')
);
check(
  'server-side RPC write boundary remains SECURITY DEFINER',
  a03.includes('create or replace function public.record_analytics_behavior_event_v1')
    && a03.includes('security definer')
    && a04.includes('create or replace function public.append_analytics_metric_snapshot_v1')
    && a04.includes('security definer')
    && a05.includes('create or replace function public.run_analytics_order_reconciliation_v1')
    && a05.includes('security definer')
);

const plannedMigrationPath = path.join(root, contract.plannedMigration?.path || '');
check('migration path declared', Boolean(contract.plannedMigration?.path));
check('migration contract says absent', contract.plannedMigration?.filePresent === false);
check('migration file not created before authorization', !fs.existsSync(plannedMigrationPath));
check(
  'migration creation requires explicit authorization',
  contract.plannedMigration?.creationRequiresExplicitAuthorization === true
);
check(
  'migration application requires explicit authorization',
  contract.plannedMigration?.applicationRequiresExplicitAuthorization === true
);

check('browser direct canonical access stays false', contract.preservedAuthorities?.browserDirectCanonicalTableAccess === false);
check('browser direct canonical insert stays false', contract.preservedAuthorities?.browserDirectCanonicalInsert === false);
check('RPC write boundary preserved', contract.preservedAuthorities?.serverSideRpcWriteBoundary === true);
check('grant expansion forbidden', contract.preservedAuthorities?.grantExpansionAllowed === false);
check('edge deploy forbidden', contract.preservedAuthorities?.edgeDeploymentAllowed === false);
check('frontend activation forbidden', contract.preservedAuthorities?.frontendActivationAllowed === false);
check('anonymous stitching forbidden', contract.preservedAuthorities?.anonymousIdentityStitchingAllowed === false);
check('production mutation forbidden', contract.preservedAuthorities?.productionMutationAllowed === false);

const failedChecks = checks.filter((entry) => !entry.passed).map((entry) => entry.name);
const result = {
  contractId: contract.contractId,
  total: checks.length,
  passed: checks.length - failedChecks.length,
  failed: failedChecks.length,
  status: failedChecks.length ? 'failed' : 'passed',
  failedChecks,
  effects: {
    networkRequests: false,
    databaseConnections: false,
    stagingReads: false,
    stagingMutations: false,
    migrations: false,
    deployments: false,
    productionChanges: false
  }
};

console.log(JSON.stringify(result, null, 2));
if (failedChecks.length) process.exitCode = 1;
