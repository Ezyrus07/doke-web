'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contract = JSON.parse(
  fs.readFileSync(path.join(root, 'config', 'ana-001-defense-in-depth-hardening-readiness.json'), 'utf8')
);
const migrationPath = path.join(root, contract.plannedMigration?.path || '');
const migration = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8') : '';

const checks = [];
const check = (name, value) => checks.push({ name, passed: Boolean(value) });

check('contract id', contract.contractId === 'ana-001-defense-in-depth-hardening-readiness-v1');
check('domain', contract.domain === 'ANA-001');
check('staging target', contract.environment === 'staging' && contract.projectRef === 'zwkczgewzbsorbrjuzpb');
check('authorized lifecycle scope', ['staging_hardening_authorized','staging_hardening_applied'].includes(contract.scope));
check('authorized lifecycle status', ['staging_migration_authorized_not_applied','staging_migration_applied_postcheck_passed_canary_pending','staging_migration_applied_verified'].includes(contract.status));
check('production forbidden', contract.productionAllowed === false);
check('staging mutation explicitly authorized', contract.stagingMutationAllowed === true);
check('migration explicitly authorized', contract.migrationAuthorized === true);
check('generic continuation rejected', contract.genericContinuationAccepted === false);
check('authorization phrase exact', contract.authorization?.phrase === 'authorize-ana-hardening-staging-migration');
check('authorization target staging', contract.authorization?.targetEnvironment === 'staging');
check('authorization forbids production', contract.authorization?.productionAllowed === false);
check('authorization forbids merge', contract.authorization?.mergeAllowed === false);
check('pre-apply revalidated', contract.observedReadOnlyStaging?.preApplyRevalidated === true);

const expectedTables = [
  'private.analytics_behavior_events_v1',
  'private.analytics_metric_snapshots_v1',
  'private.analytics_reconciliation_runs_v1',
  'private.analytics_data_quality_rollups_v1'
];
check('four exact RLS targets',
  Array.isArray(contract.plannedChanges?.enableRls)
    && contract.plannedChanges.enableRls.length === 4
    && expectedTables.every((table) => contract.plannedChanges.enableRls.includes(table))
);
check('FORCE RLS forbidden', contract.plannedChanges?.forceRls === false);
check('new policies forbidden', contract.plannedChanges?.createPolicies === false);
check('existing grants preserved', contract.plannedChanges?.preserveExistingGrants === true);

for (const table of expectedTables) {
  const observed = contract.observedReadOnlyStaging?.tables?.[table];
  check(table + ' preflight observed', Boolean(observed));
  check(table + ' preflight RLS off', observed?.rlsEnabled === false);
  check(table + ' preflight FORCE RLS off', observed?.forceRls === false);
  check(table + ' anon grant absent', observed?.anonDirectTableGrant === false);
  check(table + ' authenticated grant absent', observed?.authenticatedDirectTableGrant === false);
  check(table + ' service role SELECT only',
    Array.isArray(observed?.serviceRoleDirectPrivileges)
      && observed.serviceRoleDirectPrivileges.length === 1
      && observed.serviceRoleDirectPrivileges[0] === 'SELECT'
  );
}

check('postgres bypasses RLS', contract.observedReadOnlyStaging?.roles?.postgres?.bypassRls === true);
check('service role bypasses RLS', contract.observedReadOnlyStaging?.roles?.service_role?.bypassRls === true);
check('anon does not bypass RLS', contract.observedReadOnlyStaging?.roles?.anon?.bypassRls === false);
check('authenticated does not bypass RLS', contract.observedReadOnlyStaging?.roles?.authenticated?.bypassRls === false);

const writers = contract.observedReadOnlyStaging?.writerFunctions || [];
check('four canonical RPCs observed', writers.length === 4);
for (const writer of writers) {
  check(writer.name + ' postgres owner', writer.owner === 'postgres');
  check(writer.name + ' security definer', writer.securityDefiner === true);
  check(writer.name + ' execute roles restricted',
    Array.isArray(writer.directExecuteRoles)
      && writer.directExecuteRoles.length === 2
      && writer.directExecuteRoles.includes('postgres')
      && writer.directExecuteRoles.includes('service_role')
  );
}

check('migration path monotonic',
  contract.plannedMigration?.path === 'supabase/migrations/20260921134000_ana_001_private_table_defense_in_depth.sql'
);
check('migration file declared present', contract.plannedMigration?.filePresent === true);
check('migration file exists', fs.existsSync(migrationPath));
check('creation authorization satisfied', contract.plannedMigration?.creationAuthorizationSatisfied === true);
check('application authorization satisfied', contract.plannedMigration?.applicationAuthorizationSatisfied === true);
check('timestamp drift recorded', contract.plannedMigration?.timestampAdjustedForMonotonicHistory === true);

const normalizedMigration = migration
  .replace(/--.*$/gm, '')
  .split(';')
  .map((x) => x.trim().replace(/\s+/g, ' ').toLowerCase())
  .filter(Boolean)
  .map((x) => x + ';');
const expectedSql = (contract.plannedChanges?.plannedSql || [])
  .map((x) => x.trim().replace(/\s+/g, ' ').toLowerCase());

check('migration has exactly seven statements', normalizedMigration.length === 7);
check('migration exactly matches planned SQL',
  normalizedMigration.length === expectedSql.length
    && normalizedMigration.every((stmt, i) => stmt === expectedSql[i])
);

const joined = (' ' + normalizedMigration.join(' ') + ' ');
for (const token of [
  ' force row level security ',
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
  ' alter table public.'
]) {
  check('forbidden SQL absent: ' + token.trim(), !joined.includes(token));
}

check('browser direct canonical access stays false', contract.preservedAuthorities?.browserDirectCanonicalTableAccess === false);
check('browser direct canonical insert stays false', contract.preservedAuthorities?.browserDirectCanonicalInsert === false);
check('RPC write boundary preserved', contract.preservedAuthorities?.serverSideRpcWriteBoundary === true);
check('grant expansion forbidden', contract.preservedAuthorities?.grantExpansionAllowed === false);
check('edge deploy forbidden', contract.preservedAuthorities?.edgeDeploymentAllowed === false);
check('frontend activation forbidden', contract.preservedAuthorities?.frontendActivationAllowed === false);
check('anonymous stitching forbidden', contract.preservedAuthorities?.anonymousIdentityStitchingAllowed === false);
check('production mutation forbidden', contract.preservedAuthorities?.productionMutationAllowed === false);

const failedChecks = checks.filter((entry) => !entry.passed).map((entry) => entry.name);
console.log(JSON.stringify({
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
    migrationAppliedByThisAudit: false,
    deployments: false,
    productionChanges: false
  }
}, null, 2));
if (failedChecks.length) process.exitCode = 1;
