'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const paths = {
  package: 'package.json',
  matrix: 'config/domain-completion-matrix.json',
  doc: 'docs/DOMAIN-COMPLETION-MATRIX.md',
  report: 'reports/generated/domain-completion-matrix-report.json',
  config: 'config/com-b04b-immutable-moderation-persistence-readiness.json',
  evidence: 'docs/validation/COM-B04B-IMMUTABLE-MODERATION-PERSISTENCE-READINESS.json'
};
const read = (key) => fs.readFileSync(path.join(root, paths[key]), 'utf8');
let checks = 0;
const check = (value, message) => { checks += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { checks += 1; assert.strictEqual(actual, expected, message); };

for (const [key, relative] of Object.entries(paths)) {
  check(fs.existsSync(path.join(root, relative)), `${key} exists`);
  check(fs.statSync(path.join(root, relative)).size > 20, `${key} nonempty`);
}

const pkg = JSON.parse(read('package'));
const matrix = JSON.parse(read('matrix'));
const doc = read('doc');
const report = JSON.parse(read('report'));
const config = JSON.parse(read('config'));
const evidence = JSON.parse(read('evidence'));
const domain = matrix.domains.find((item) => item.id === 'COM-001');
const flow = matrix.criticalFlows.find((item) => item.id === 'FLOW-12');

check(domain, 'COM-001 exists');
check(flow, 'FLOW-12 exists');
equal(matrix.version, '1.3.108', 'matrix version');
equal(matrix.updatedAt, '2026-08-05T21:24:00-03:00', 'matrix timestamp');
equal(domain.maturity, 3, 'maturity preserved');
equal(domain.serverAuthority, 'partial', 'server authority partial');
equal(domain.productionGate, 'blocked', 'production gate blocked');

const requiredPaths = [
  'backend/modules/communities/community-moderation-supabase-repository-adapter.js',
  'config/com-b04b-immutable-moderation-persistence-readiness.json',
  'supabase/migrations/20260805205800_com_b04b_moderation_persistence.sql',
  'scripts/test-com-b04b-immutable-moderation-persistence-readiness.js',
  'scripts/audit-com-b04b-immutable-moderation-persistence-readiness.js',
  'scripts/audit-com-b04b-domain-matrix-reconciliation.js',
  'docs/COM-B04B-IMMUTABLE-MODERATION-PERSISTENCE-READINESS.md',
  'docs/validation/COM-B04B-IMMUTABLE-MODERATION-PERSISTENCE-READINESS.json',
  '.github/workflows/com-b04b-immutable-moderation-persistence-readiness.yml'
];
for (const required of requiredPaths) check(domain.requiredPaths.includes(required), `required path ${required}`);

const commands = {
  'audit:com-b04b-immutable-moderation-persistence-readiness': 'node scripts/audit-com-b04b-immutable-moderation-persistence-readiness.js',
  'test:com-b04b-immutable-moderation-persistence-readiness': 'node scripts/test-com-b04b-immutable-moderation-persistence-readiness.js'
};
for (const [name, command] of Object.entries(commands)) {
  check(domain.tests.includes(name), `matrix test ${name}`);
  equal(pkg.scripts[name], command, `package command ${name}`);
}

const evidenceMarkers = [
  'COM-B04B immutable moderation persistence readiness is repository-certified',
  'private RLS-forced tables, append-only ledgers, service-role-only SECURITY DEFINER RPCs',
  'No COM-B04B migration has been applied; runtime, staging writes, real moderation actions and production remain blocked.'
];
for (const marker of evidenceMarkers) {
  check(domain.evidence.some((item) => item.includes(marker)), `matrix evidence ${marker}`);
  check(doc.includes(marker), `document evidence ${marker}`);
}

const blocker = domain.blockers.find((item) => item.id === 'COM-B04');
check(blocker, 'COM-B04 blocker exists');
equal(blocker.category, 'moderation_persistence_application', 'blocker category');
equal(
  blocker.description,
  'Immutable moderation persistence adapter and migration are repository-certified, but migration application, structural staging verification, runtime integration and real moderation execution are not active.',
  'blocker description'
);
check(flow.blockers.includes('COM-B04'), 'FLOW-12 blocker retained');
const nextAction = 'Apply the COM-B04B migration and verify immutable moderation structure in staging under COM-B04C only after separate explicit authorization.';
check(domain.nextActions.includes(nextAction), 'next action');
check(doc.includes(nextAction), 'document next action');
check(doc.includes('Baseline: 2026-08-05T21:24:00-03:00.'), 'document baseline');

equal(report.name, 'domain-completion-matrix', 'report name');
equal(report.version, '1.3.108', 'report version');
equal(report.generatedAt, '2026-08-05T21:24:00-03:00', 'report timestamp');
equal(report.status, 'passed', 'report status');
check(report.summary && report.summary.domains === 23, 'report domain count');
const reportDomain = report.domains.find((item) => item.id === 'COM-001');
check(reportDomain, 'report COM-001');
check(reportDomain.filesMatched >= 17, 'report scans COM paths');

check([
  'adapter_and_immutable_migration_prepared_not_applied',
  'repository_contract_certified_migration_not_applied'
].includes(config.status), 'config status');
equal(config.migrationPrepared, true, 'migration prepared');
equal(config.migrationApplied, false, 'migration not applied');
equal(config.runtimeIntegrated, false, 'runtime disconnected');
equal(config.stagingValidated, false, 'staging unvalidated');
equal(config.authority.migrationExecutionAuthority, false, 'migration authority closed');
equal(config.authority.stagingMutationAuthority, false, 'staging authority closed');
equal(config.authority.productionAuthority, false, 'production authority closed');
check([
  'repository_artifacts_prepared_pending_ci',
  'repository_contract_certified'
].includes(evidence.status), 'evidence status');
for (const value of Object.values(evidence.effects)) equal(value, false, 'effect false');
for (const value of Object.values(evidence.remainingAuthority)) equal(value, false, 'authority false');

console.log(`COM-B04B matrix reconciliation audit passed: ${checks}/${checks}`);
