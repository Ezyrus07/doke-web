'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
let checks = 0;
const check = (value, message) => { checks += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { checks += 1; assert.deepStrictEqual(actual, expected, message); };

const pkg = JSON.parse(read('package.json'));
const matrix = JSON.parse(read('config/domain-completion-matrix.json'));
const doc = read('docs/DOMAIN-COMPLETION-MATRIX.md');
const report = JSON.parse(read('reports/generated/domain-completion-matrix-report.json'));
const config = JSON.parse(read('config/com-b04b-immutable-moderation-persistence-readiness.json'));
const evidence = JSON.parse(read('docs/validation/COM-B04B-IMMUTABLE-MODERATION-PERSISTENCE-READINESS.json'));
const domain = matrix.domains.find((item) => item.id === 'COM-001');
const flow = matrix.criticalFlows.find((item) => item.id === 'FLOW-12');

check(domain, 'COM-001 domain exists');
check(flow, 'FLOW-12 exists');
check(['1.3.108', '1.3.109', '1.3.110', '1.3.111', '1.3.112'].includes(matrix.version), 'matrix version continuity');
equal(domain.maturity, 3, 'maturity preserved');
equal(domain.serverAuthority, 'partial', 'server authority partial');
equal(domain.productionGate, 'blocked', 'production blocked');

for (const required of [
  'backend/modules/communities/community-moderation-supabase-repository-adapter.js',
  'config/com-b04b-immutable-moderation-persistence-readiness.json',
  'supabase/migrations/20260805205800_com_b04b_moderation_persistence.sql',
  'scripts/test-com-b04b-immutable-moderation-persistence-readiness.js',
  'scripts/audit-com-b04b-immutable-moderation-persistence-readiness.js',
  'scripts/audit-com-b04b-domain-matrix-reconciliation.js',
  'docs/COM-B04B-IMMUTABLE-MODERATION-PERSISTENCE-READINESS.md',
  'docs/validation/COM-B04B-IMMUTABLE-MODERATION-PERSISTENCE-READINESS.json',
  '.github/workflows/com-b04b-immutable-moderation-persistence-readiness.yml'
]) check(domain.requiredPaths.includes(required), `required path: ${required}`);

for (const [name, command] of Object.entries({
  'audit:com-b04b-immutable-moderation-persistence-readiness': 'node scripts/audit-com-b04b-immutable-moderation-persistence-readiness.js',
  'test:com-b04b-immutable-moderation-persistence-readiness': 'node scripts/test-com-b04b-immutable-moderation-persistence-readiness.js'
})) {
  check(domain.tests.includes(name), `matrix test: ${name}`);
  equal(pkg.scripts[name], command, `package command: ${name}`);
}

const readinessMarker = 'COM-B04B immutable moderation persistence readiness is repository-certified';
check(domain.evidence.some((item) => item.includes(readinessMarker)), 'B04B evidence retained');
check(doc.includes(readinessMarker), 'B04B doc evidence retained');

const blocker = domain.blockers.find((item) => item.id === 'COM-B04');
check(blocker, 'COM-B04 blocker retained');
check(flow.blockers.includes('COM-B04'), 'FLOW-12 blocker retained');
if (matrix.version === '1.3.108') {
  equal(blocker.category, 'moderation_persistence_application', 'B04B blocker category');
  check(domain.evidence.some((item) => item.includes('No COM-B04B migration has been applied')), 'migration pending evidence');
  check(domain.nextActions.some((item) => item.includes('COM-B04C')), 'B04C next action');
} else if (matrix.version === '1.3.109') {
  equal(blocker.category, 'moderation_runtime_composition', 'B04C blocker category');
  check(domain.evidence.some((item) => item.includes('COM-B04C applied and structurally verified')), 'B04C applied evidence');
  check(domain.nextActions.some((item) => item.includes('COM-B04D')), 'B04D next action');
} else if (matrix.version === '1.3.110') {
  equal(blocker.category, 'moderation_authenticated_staging_canary', 'B04D blocker category');
  check(domain.evidence.some((item) => item.includes('COM-B04D repository-certified')), 'B04D composition evidence');
  check(domain.nextActions.some((item) => item.includes('COM-B04E')), 'B04E next action');
} else if (matrix.version === '1.3.111') {
  equal(blocker.category, 'moderation_live_composition_activation', 'B04G blocker category');
  check(domain.evidence.some((item) => item.includes('COM-B04G repository-wired')), 'B04G wiring evidence');
  check(domain.nextActions.some((item) => item.includes('COM-B04H')), 'B04H next action');
} else {
  equal(blocker.category, 'moderation_staging_live_activation_authorization', 'B04H blocker category');
  check(domain.evidence.some((item) => item.includes('COM-B04H repository-certified')), 'B04H readiness evidence');
  check(domain.nextActions.some((item) => item.includes('COM-B04I')), 'B04I next action');
}

equal(report.name, 'domain-completion-matrix', 'report name');
equal(report.version, matrix.version, 'report version');
equal(report.generatedAt, matrix.updatedAt, 'report timestamp');
equal(report.status, 'passed', 'report status');
const reportDomain = report.domains.find((item) => item.id === 'COM-001');
check(reportDomain && reportDomain.filesMatched >= 17, 'report COM path coverage');

check(['adapter_and_immutable_migration_prepared_not_applied','repository_contract_certified_migration_not_applied'].includes(config.status), 'B04B config certified');
equal(config.adapterPrepared, true, 'adapter prepared');
equal(config.migrationPrepared, true, 'migration prepared');
equal(config.migrationApplied, false, 'B04B historical application false');
equal(config.runtimeIntegrated, false, 'runtime disconnected');
equal(config.stagingValidated, false, 'B04B historical staging false');
equal(config.authority.productionAuthority, false, 'production authority closed');
equal(evidence.status, 'repository_contract_certified', 'B04B evidence certified');
equal(evidence.result, 'passed_repository_only', 'B04B repository-only result');
for (const value of Object.values(evidence.effects)) equal(value, false, 'B04B effect false');
for (const value of Object.values(evidence.remainingAuthority)) equal(value, false, 'B04B authority false');

console.log(`COM-B04B matrix reconciliation audit passed: ${checks}/${checks}`);
