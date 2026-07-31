#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const PATHS = Object.freeze({
  config: 'config/sched-001-a05-persistence-readiness.json',
  adapter: 'backend/modules/scheduling/scheduling-postgres-repository.js',
  runtimeTest: 'scripts/test-sched-001-a05-postgres-repository-runtime.js',
  readinessTest: 'scripts/test-sched-001-a05-staging-readiness.js',
  planner: 'scripts/plan-sched-001-a05-staging-readiness.js',
  docs: 'docs/SCHED-001-A05-PERSISTENCE-READINESS.md',
  evidence: 'docs/validation/SCHED-001-A05-PERSISTENCE-READINESS.json',
  workflow: '.github/workflows/sched-001-a05-persistence-readiness.yml',
  matrix: 'config/domain-completion-matrix.json',
  package: 'package.json'
});

Object.values(PATHS).forEach((path) => assert(fs.existsSync(path), `Missing SCHED-A05 asset: ${path}`));

const config = JSON.parse(fs.readFileSync(PATHS.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(PATHS.evidence, 'utf8'));
const matrix = JSON.parse(fs.readFileSync(PATHS.matrix, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(PATHS.package, 'utf8'));
const adapter = fs.readFileSync(PATHS.adapter, 'utf8');
const runtimeTest = fs.readFileSync(PATHS.runtimeTest, 'utf8');
const readinessTest = fs.readFileSync(PATHS.readinessTest, 'utf8');
const planner = fs.readFileSync(PATHS.planner, 'utf8');
const docs = fs.readFileSync(PATHS.docs, 'utf8');
const workflow = fs.readFileSync(PATHS.workflow, 'utf8');

assert.strictEqual(config.contractVersion, 'sched-a05-persistence-readiness-v1');
assert.strictEqual(evidence.contractVersion, config.contractVersion);
assert.strictEqual(config.scope, 'repository_adapter_and_read_only_staging_preflight');
assert.strictEqual(config.adapter.path, PATHS.adapter);
assert.strictEqual(config.adapter.supabaseJsMultiQueryTransactionUsed, false);
assert.strictEqual(config.compatibilityGate.applicationAuthorized, false);
assert.strictEqual(config.capabilities.executeModeAvailable, false);
assert.strictEqual(config.capabilities.databaseMutationAvailable, false);
assert.strictEqual(config.evidence.stagingMutationsPerformed, 0);
assert.strictEqual(config.evidence.migrationsApplied, 0);
assert.deepStrictEqual(evidence.blockers.closed, []);
assert.deepStrictEqual(evidence.blockers.remainingOpen, ['SCHED-B02', 'SCHED-B03', 'SCHED-B04', 'SCHED-B05']);

[
  'createSchedulingPostgresRepository',
  'begin isolation level ${isolationLevel} read write',
  "set_config('lock_timeout'",
  "set_config('statement_timeout'",
  'claim-idempotency-insert',
  'claim-idempotency-read',
  'for update',
  'for update skip locked',
  "tstzrange(starts_at, ends_at, '[)')",
  'schedule_command_idempotency',
  'schedule_domain_events',
  'schedule_reservation_id',
  'ruleContainsRange',
  'unknown rule shapes'
].forEach((fragment) => assert(adapter.toLowerCase().includes(fragment.toLowerCase()), `Adapter missing ${fragment}`));
assert(!adapter.includes('process.env'));
assert(!adapter.includes('@supabase/supabase-js'));
assert(!adapter.includes('service_role'));
assert(!adapter.includes('supabaseKey'));
assert(!adapter.includes('SUPABASE_SERVICE_ROLE'));

[
  'SCHED-A05 PostgreSQL persistence adapter runtime tests passed.',
  'for update skip locked',
  'synthetic transaction failure',
  'DOKE_SCHEDULE_POSTGRES_ISOLATION_INVALID',
  '_eventMeta'
].forEach((fragment) => assert(runtimeTest.includes(fragment), `Runtime test missing ${fragment}`));

[
  '--execute',
  'dry-run only',
  'authorizationPresent',
  'sha256',
  'executeModeAvailable: false'
].forEach((fragment) => assert(planner.includes(fragment), `Planner missing ${fragment}`));
assert(!planner.includes('apply_migration'));
assert(!planner.includes('supabase db push'));
assert(!planner.includes('fetch('));

[
  'applicationAuthorized, false',
  'stagingMutationsPerformed, 0',
  'migrationsApplied, 0',
  "['scripts/plan-sched-001-a05-staging-readiness.js', '--execute']"
].forEach((fragment) => assert(readinessTest.includes(fragment), `Readiness test missing ${fragment}`));

[
  'PostgreSQL `17.6`',
  'Three aggregate-only SQL reads',
  'still permit a professional to insert `booked`',
  'I_EXPLICITLY_AUTHORIZE_SCHED_A03_A04_MIGRATIONS_ON_DOKE_STAGING',
  'forward-only through a separately reviewed migration',
  'SCHED-A06 — Authorized Staging Migration Application',
  'staging mutations: 0'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing ${fragment}`));

assert(compareVersions(matrix.version, '1.3.48') >= 0, `Matrix version ${matrix.version} predates SCHED-A05.`);
const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
assert(sched && ord, 'ORD-001 or SCHED-001 missing from matrix.');
assert.strictEqual(sched.maturity, 2);
assert.strictEqual(sched.serverAuthority, 'partial');
assert.strictEqual(sched.stagingEvidence, 'staging_canary');
assert.strictEqual(sched.securityGate, 'partial');
assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B03', 'SCHED-B04']);
assert(sched.nextActions[0].includes('SCHED-A07'));
assert(ord.nextActions[0].includes('SCHED-A07'));
const requiredPaths = [
  PATHS.config, PATHS.adapter, PATHS.runtimeTest, PATHS.readinessTest,
  PATHS.planner, PATHS.docs, PATHS.evidence, PATHS.workflow
];
requiredPaths.forEach((path) => {
  assert(sched.requiredPaths.includes(path), `SCHED matrix missing ${path}`);
  assert(ord.requiredPaths.includes(path), `ORD matrix missing ${path}`);
});
assert(sched.tests.includes('audit:sched-001-a05-persistence-readiness'));
assert(sched.tests.includes('test:sched-001-a05-postgres-repository-runtime'));
assert(sched.tests.includes('test:sched-001-a05-staging-readiness'));
assert(ord.tests.includes('audit:sched-001-a05-persistence-readiness'));
assert.strictEqual(pkg.scripts['audit:sched-001-a05-persistence-readiness'], 'node scripts/audit-sched-001-a05-persistence-readiness.js');
assert.strictEqual(pkg.scripts['test:sched-001-a05-postgres-repository-runtime'], 'node scripts/test-sched-001-a05-postgres-repository-runtime.js');
assert.strictEqual(pkg.scripts['test:sched-001-a05-staging-readiness'], 'node scripts/test-sched-001-a05-staging-readiness.js');
assert.strictEqual(pkg.scripts['plan:sched-001-a05-staging-readiness'], 'node scripts/plan-sched-001-a05-staging-readiness.js --dry-run');

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/audit-sched-001-a05-persistence-readiness.js'));
assert(workflow.includes('node scripts/test-sched-001-a05-postgres-repository-runtime.js'));
assert(workflow.includes('node scripts/test-sched-001-a05-staging-readiness.js'));
assert(workflow.includes('node scripts/plan-sched-001-a05-staging-readiness.js --dry-run'));
assert(workflow.includes('node scripts/audit-sched-001-a04-server-command-runtime.js'));
assert(workflow.includes('node scripts/audit-domain-completion-matrix.js'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('supabase '));
assert(!workflow.includes('curl '));
assert(!workflow.includes('apply_migration'));
assert(!workflow.includes('--execute'));

console.log('SCHED-A05 PostgreSQL persistence and staging readiness audit passed.');

function compareVersions(left, right) {
  const a = String(left).split('.').map(Number);
  const b = String(right).split('.').map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const delta = (a[index] || 0) - (b[index] || 0);
    if (delta) return delta;
  }
  return 0;
}
