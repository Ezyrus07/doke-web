#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const PATHS = Object.freeze({
  config: 'config/sched-001-a07-history-canary-readiness.json',
  docs: 'docs/SCHED-001-A07-MIGRATION-HISTORY-CANARY-READINESS.md',
  evidence: 'docs/validation/SCHED-001-A07-MIGRATION-HISTORY-CANARY-READINESS.json',
  planner: 'scripts/plan-sched-001-a07-history-canaries.js',
  test: 'scripts/test-sched-001-a07-history-canary-readiness.js',
  canary: 'supabase/tests/020_sched_a07_rolled_back_canaries.sql',
  workflow: '.github/workflows/sched-001-a07-history-canary-readiness.yml',
  matrix: 'config/domain-completion-matrix.json',
  package: 'package.json'
});

Object.values(PATHS).forEach((path) => assert(fs.existsSync(path), `Missing SCHED-A07 asset: ${path}`));

const config = JSON.parse(fs.readFileSync(PATHS.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(PATHS.evidence, 'utf8'));
const matrix = JSON.parse(fs.readFileSync(PATHS.matrix, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(PATHS.package, 'utf8'));
const docs = fs.readFileSync(PATHS.docs, 'utf8');
const planner = fs.readFileSync(PATHS.planner, 'utf8');
const test = fs.readFileSync(PATHS.test, 'utf8');
const canary = fs.readFileSync(PATHS.canary, 'utf8');
const workflow = fs.readFileSync(PATHS.workflow, 'utf8');

assert.strictEqual(config.contractVersion, 'sched-a07-history-canary-readiness-v1');
assert.strictEqual(evidence.contractVersion, config.contractVersion);
assert.strictEqual(config.scope, 'repository_only_history_repair_and_rolled_back_canary_readiness');
assert.strictEqual(config.staging.canonicalSchemaApplied, true);
assert.strictEqual(config.staging.migrationHistoryAligned, false);
assert.strictEqual(config.historyRepair.directSchemaMigrationsTableMutationAllowed, false);
assert.strictEqual(config.historyRepair.schemaMutationExpected, false);
assert.strictEqual(config.historyRepair.migrationHistoryMutationExpected, true);
assert.strictEqual(config.rolledBackCanaries.path, PATHS.canary);
assert.strictEqual(config.rolledBackCanaries.transactionRequired, true);
assert.strictEqual(config.rolledBackCanaries.persistentRowsAllowed, false);
assert.strictEqual(config.capabilities.executeModeAvailable, false);
assert.strictEqual(config.capabilities.migrationHistoryMutationAvailable, false);
assert.strictEqual(config.capabilities.databaseCanaryMutationAvailable, false);
assert.deepStrictEqual(evidence.blockers.closed, ['SCHED-B05']);
assert.deepStrictEqual(evidence.blockers.remainingOpen, ['SCHED-B02', 'SCHED-B03', 'SCHED-B04']);

[
  'Supabase compares migration timestamps',
  'supabase migration repair 20260731141315 20260731141349 --status reverted --linked',
  'supabase migration repair 20260731123000 20260731151000 --status applied --linked',
  'single PostgreSQL transaction',
  'I_EXPLICITLY_AUTHORIZE_SCHED_A07_MIGRATION_HISTORY_REPAIR_AND_ROLLED_BACK_CANARIES_ON_DOKE_STAGING',
  'SCHED-B05 is therefore closed',
  'staging mutations in A07 readiness: 0',
  'SCHED-A08 — Authorized Migration History Repair'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing ${fragment}`));

[
  'dry-run only',
  'authorizationPresent',
  'sha256',
  'executeModeAvailable: false'
].forEach((fragment) => assert(planner.includes(fragment), `Planner missing ${fragment}`));
assert(!planner.includes('child_process'));
assert(!planner.includes('apply_migration'));
assert(!planner.includes('schema_migrations'));

[
  'when exclusion_violation',
  'when unique_violation',
  'local_end < local_start',
  'schedule_reservation_id = v_reservation_1',
  'rollback;'
].forEach((fragment) => assert(canary.toLowerCase().includes(fragment.toLowerCase()), `Canary missing ${fragment}`));
assert(!canary.toLowerCase().includes('\ncommit;'));
assert(!canary.toLowerCase().includes('schema_migrations'));
assert(!canary.toLowerCase().includes('drop table'));
assert(!canary.toLowerCase().includes('truncate '));

[
  '--execute',
  'SCHED-A07 migration history and rolled-back canary readiness tests passed.'
].forEach((fragment) => assert(test.includes(fragment), `Test missing ${fragment}`));

assert(compareVersions(matrix.version, '1.3.49') >= 0, `Matrix version ${matrix.version} predates SCHED-A07.`);
const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
const flow = matrix.criticalFlows.find((item) => item.id === 'FLOW-06');
assert(sched && ord && flow, 'ORD-001, SCHED-001 or FLOW-06 missing from matrix.');
assert.strictEqual(sched.serverAuthority, 'partial');
assert.strictEqual(sched.stagingEvidence, 'staging_canary');
assert.strictEqual(sched.securityGate, 'partial');

const blockerIds = sched.blockers.map((item) => item.id);
const postExecutionState = compareVersions(matrix.version, '1.3.50') >= 0
  && sched.maturity === 3
  && !blockerIds.includes('SCHED-B03');

if (postExecutionState) {
  const schedMatrixPatchA07 = Number(String(matrix.version).split('.')[2] || 0);
  if (schedMatrixPatchA07 >= 70) {
    assert.deepStrictEqual(blockerIds, []);
    assert(Array.isArray(sched.nextActions) && sched.nextActions.length > 0);
  } else if (schedMatrixPatchA07 >= 63) {
    assert.deepStrictEqual(blockerIds, ['SCHED-B04']);
    assert(sched.nextActions[0].includes('SCHED-B04') || sched.nextActions[0].includes('ORD-001'));
  } else {
    assert.deepStrictEqual(blockerIds, ['SCHED-B02', 'SCHED-B04']);
    if (schedMatrixPatchA07 >= 51) {
      assert(sched.nextActions[0].includes('authenticated staging composition canary'));
    } else {
      assert(sched.nextActions[0].includes('trusted server composition root'));
    }
  }
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
  assert(!flow.blockers.includes('SCHED-B03'));
} else {
  assert.strictEqual(sched.maturity, 2);
  assert.deepStrictEqual(blockerIds, ['SCHED-B02', 'SCHED-B03', 'SCHED-B04']);
  assert.deepStrictEqual(sched.nextActions, config.orderedNextActions);
  assert(ord.nextActions[0].includes('SCHED-A07'));
}

const requiredPaths = [PATHS.config, PATHS.docs, PATHS.evidence, PATHS.planner, PATHS.test, PATHS.canary, PATHS.workflow];
requiredPaths.forEach((path) => {
  assert(sched.requiredPaths.includes(path), `SCHED matrix missing ${path}`);
  assert(ord.requiredPaths.includes(path), `ORD matrix missing ${path}`);
});
assert(sched.tests.includes('audit:sched-001-a07-history-canary-readiness'));
assert(sched.tests.includes('test:sched-001-a07-history-canary-readiness'));
assert(ord.tests.includes('audit:sched-001-a07-history-canary-readiness'));
assert.strictEqual(pkg.scripts['audit:sched-001-a07-history-canary-readiness'], 'node scripts/audit-sched-001-a07-history-canary-readiness.js');
assert.strictEqual(pkg.scripts['test:sched-001-a07-history-canary-readiness'], 'node scripts/test-sched-001-a07-history-canary-readiness.js');
assert.strictEqual(pkg.scripts['plan:sched-001-a07-history-canaries'], 'node scripts/plan-sched-001-a07-history-canaries.js');

const temporaryA09Executor = workflow.includes('name: SCHED-A09 Documentation and Matrix Reconciliation');
if (temporaryA09Executor) {
  const writeExecutor = workflow.includes('permissions:\n  contents: write');
  const readOnlyArtifactExecutor = workflow.includes('permissions:\n  contents: read')
    && workflow.includes('actions/upload-artifact@v4')
    && workflow.includes('sched-a09-');
  assert(writeExecutor || readOnlyArtifactExecutor);
  assert(workflow.includes('node scripts/close-sched-001-a09-documentation-matrix.js'));
  assert(!workflow.includes('supabase migration repair'));
  assert(!workflow.includes('psql '));
} else {
  assert(workflow.includes('permissions:\n  contents: read'));
  assert(workflow.includes('node scripts/audit-sched-001-a07-history-canary-readiness.js'));
  assert(workflow.includes('node scripts/test-sched-001-a07-history-canary-readiness.js'));
  assert(workflow.includes('node scripts/plan-sched-001-a07-history-canaries.js'));
  assert(workflow.includes('node scripts/audit-sched-001-a05-persistence-readiness.js'));
  assert(workflow.includes('node scripts/audit-domain-completion-matrix.js'));
  assert(!workflow.includes('contents: write'));
  assert(!workflow.includes('supabase migration repair'));
  assert(!workflow.includes('psql '));
  assert(!workflow.includes('--execute'));
}

console.log('SCHED-A07 migration history and canary readiness audit passed.');

function compareVersions(left, right) {
  const a = String(left).split('.').map(Number);
  const b = String(right).split('.').map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const delta = (a[index] || 0) - (b[index] || 0);
    if (delta) return delta;
  }
  return 0;
}
