'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = {
  package: 'package.json',
  matrix: 'config/domain-completion-matrix.json',
  doc: 'docs/DOMAIN-COMPLETION-MATRIX.md',
  report: 'reports/generated/domain-completion-matrix-report.json',
  config: 'config/com-b04-moderation-case-authority.json',
  evidence: 'docs/validation/COM-B04-MODERATION-CASE-AUTHORITY.json'
};
const read = (key) => fs.readFileSync(path.join(root, files[key]), 'utf8');
let checks = 0;
const check = (value, message) => { checks += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { checks += 1; assert.strictEqual(actual, expected, message); };

for (const [key, relative] of Object.entries(files)) {
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
const b04bIntegrated = matrix.version === '1.3.108';
const expectedAt = b04bIntegrated ? '2026-08-05T21:24:00-03:00' : '2026-08-05T20:38:00-03:00';

check(domain, 'COM-001 domain exists');
check(flow, 'FLOW-12 exists');
check(['1.3.107', '1.3.108'].includes(matrix.version), 'matrix version continuity');
equal(matrix.updatedAt, expectedAt, 'matrix timestamp');
equal(domain.maturity, 3, 'maturity preserved');
equal(domain.userFacingAuthority, 'hybrid', 'UI authority preserved');
equal(domain.serverAuthority, 'partial', 'server authority partial');
equal(domain.stagingEvidence, 'staging_canary', 'staging evidence preserved');
equal(domain.productionGate, 'blocked', 'production blocked');

for (const required of [
  'backend/modules/communities/community-moderation-case-authority.js',
  'config/com-b04-moderation-case-authority.json',
  'tests/fixtures/com-b04-moderation-case-cases.json',
  'scripts/test-com-b04-moderation-case-authority.js',
  'scripts/audit-com-b04-moderation-case-authority.js',
  'scripts/audit-com-b04-domain-matrix-reconciliation.js',
  'docs/COM-B04-MODERATION-CASE-AUTHORITY.md',
  'docs/validation/COM-B04-MODERATION-CASE-AUTHORITY.json'
]) check(domain.requiredPaths.includes(required), `matrix required path: ${required}`);

for (const script of ['audit:com-b04-moderation-case-authority', 'test:com-b04-moderation-case-authority']) {
  check(domain.tests.includes(script), `matrix test: ${script}`);
  check(typeof pkg.scripts[script] === 'string', `package script: ${script}`);
}
equal(pkg.scripts['audit:com-b04-moderation-case-authority'], 'node scripts/audit-com-b04-moderation-case-authority.js', 'audit command exact');
equal(pkg.scripts['test:com-b04-moderation-case-authority'], 'node scripts/test-com-b04-moderation-case-authority.js', 'test command exact');

for (const marker of [
  'COM-B04 canonical moderation case authority is repository-certified',
  'revision-bound evidence, dual control, bounded sanctions, independent appeals'
]) {
  check(domain.evidence.some((item) => item.includes(marker)), `matrix evidence: ${marker}`);
  check(doc.includes(marker), `generated doc evidence: ${marker}`);
}

const b04 = domain.blockers.find((item) => item.id === 'COM-B04');
check(b04, 'COM-B04 blocker retained');
const expectedCategory = b04bIntegrated ? 'moderation_persistence_application' : 'moderation_persistence_activation';
const expectedDescription = b04bIntegrated
  ? 'Immutable moderation persistence adapter and migration are repository-certified, but migration application, structural staging verification, runtime integration and real moderation execution are not active.'
  : 'Canonical moderation case authority is repository-certified, but immutable persistence, migration, runtime integration and staging validation are not active.';
equal(b04.category, expectedCategory, 'B04 category continuity');
equal(b04.description, expectedDescription, 'B04 blocker precise');
check(flow.blockers.includes('COM-B04'), 'FLOW-12 operational B04 blocker retained');

const expectedNext = b04bIntegrated
  ? 'Apply the COM-B04B migration and verify immutable moderation structure in staging under COM-B04C only after separate explicit authorization.'
  : 'Prepare immutable moderation case persistence and migration readiness under COM-B04B; any staging application requires separate explicit authorization.';
check(domain.nextActions.includes(expectedNext), 'next action exact');
check(doc.includes(`**COM-B04 · HIGH · ${expectedCategory}:**`), 'generated blocker category');
check(doc.includes(expectedNext), 'generated next action');
check(doc.includes(`Baseline: ${expectedAt}.`), 'generated baseline timestamp');

equal(report.name, 'domain-completion-matrix', 'report name');
equal(report.version, matrix.version, 'report version');
equal(report.generatedAt, expectedAt, 'report timestamp');
equal(report.status, 'passed', 'report status');
check(report.summary && report.summary.domains === 23, 'report domain count');
check(Array.isArray(report.domains), 'report domains array');
const reportDomain = report.domains.find((item) => item.id === 'COM-001');
check(reportDomain, 'report COM-001 entry');
check(reportDomain.filesMatched >= 17, 'report scans COM paths');

equal(config.status, 'repository_contract_certified_runtime_blocked', 'B04 config certified');
equal(config.runtimeIntegrated, false, 'runtime remains disconnected');
equal(config.migrationApplied, false, 'B04 migration not applied');
equal(config.stagingValidated, false, 'staging not validated');
equal(config.authority.repositoryWriteAuthority, false, 'repository authority closed');
equal(config.authority.stagingMutationAuthority, false, 'staging authority closed');
equal(config.authority.productionAuthority, false, 'production authority closed');
equal(evidence.status, 'repository_contract_certified', 'B04 evidence certified');
for (const value of Object.values(evidence.effects)) equal(value, false, 'B04 effect false');
for (const value of Object.values(evidence.remainingAuthority)) equal(value, false, 'B04 authority false');

console.log(`COM-B04 matrix reconciliation audit passed: ${checks}/${checks}`);
