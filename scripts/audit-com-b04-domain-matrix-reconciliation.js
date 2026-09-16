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
const config = JSON.parse(read('config/com-b04-moderation-case-authority.json'));
const evidence = JSON.parse(read('docs/validation/COM-B04-MODERATION-CASE-AUTHORITY.json'));
const domain = matrix.domains.find((item) => item.id === 'COM-001');
const flow = matrix.criticalFlows.find((item) => item.id === 'FLOW-12');

check(domain, 'COM-001 domain exists');
check(flow, 'FLOW-12 exists');
check(['1.3.108', '1.3.109', '1.3.110', '1.3.111', '1.3.112', '1.3.113'].includes(matrix.version), 'matrix version continuity');
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
]) check(domain.requiredPaths.includes(required), `required path: ${required}`);

for (const [name, command] of Object.entries({
  'audit:com-b04-moderation-case-authority': 'node scripts/audit-com-b04-moderation-case-authority.js',
  'test:com-b04-moderation-case-authority': 'node scripts/test-com-b04-moderation-case-authority.js'
})) {
  check(domain.tests.includes(name), `matrix test: ${name}`);
  equal(pkg.scripts[name], command, `package command: ${name}`);
}

for (const marker of [
  'COM-B04 canonical moderation case authority is repository-certified',
  'revision-bound evidence, dual control, bounded sanctions, independent appeals'
]) {
  check(domain.evidence.some((item) => item.includes(marker)), `matrix evidence: ${marker}`);
  check(doc.includes(marker), `doc evidence: ${marker}`);
}

const blocker = domain.blockers.find((item) => item.id === 'COM-B04');
check(blocker, 'COM-B04 blocker retained');
check(flow.blockers.includes('COM-B04'), 'FLOW-12 blocker retained');
if (matrix.version === '1.3.108') {
  equal(blocker.category, 'moderation_persistence_application', 'B04 category at B04B');
  check(domain.nextActions.some((item) => item.includes('COM-B04C')), 'B04C next action');
} else if (matrix.version === '1.3.109') {
  equal(blocker.category, 'moderation_runtime_composition', 'B04 category at B04C');
  check(domain.nextActions.some((item) => item.includes('COM-B04D')), 'B04D next action');
} else if (matrix.version === '1.3.110') {
  equal(blocker.category, 'moderation_authenticated_staging_canary', 'B04 category at B04D');
  check(domain.nextActions.some((item) => item.includes('COM-B04E')), 'B04E next action');
} else if (matrix.version === '1.3.111') {
  equal(blocker.category, 'moderation_live_composition_activation', 'B04 category at B04G');
  check(domain.evidence.some((item) => item.includes('COM-B04G repository-wired')), 'B04G wiring evidence');
  check(domain.nextActions.some((item) => item.includes('COM-B04H')), 'B04H next action');
} else if (matrix.version === '1.3.112') {
  equal(blocker.category, 'moderation_staging_live_activation_authorization', 'B04 category at B04H');
  check(domain.evidence.some((item) => item.includes('COM-B04H repository-certified')), 'B04H readiness evidence');
  check(domain.nextActions.some((item) => item.includes('COM-B04I')), 'B04I next action');
} else {
  equal(blocker.category, 'moderation_live_runtime_activation', 'B04 category after B04I canary');
  check(domain.evidence.some((item) => item.includes('COM-B04I authenticated a real staging session and passed the process-local')), 'B04I success evidence');
  check(domain.evidence.some((item) => item.includes('default handler remains HTTP 503 COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED')), 'B04I persistent-runtime limit evidence');
  check(domain.nextActions.includes('Keep moderation fail-closed until a separately governed persistent staging runtime deployment/traffic boundary is defined and authorized.'), 'persistent staging runtime next action');
  check(!domain.nextActions.some((item) => item.includes('Authorize and execute COM-B04I')), 'stale B04I action removed');
  check(doc.includes('COM-B04I authenticated a real staging session and passed the process-local'), 'generated B04I evidence');
}

equal(report.name, 'domain-completion-matrix', 'report name');
equal(report.version, matrix.version, 'report version');
equal(report.generatedAt, matrix.updatedAt, 'report timestamp');
equal(report.status, 'passed', 'report status');
check(report.summary && report.summary.domains === 23, 'report domain count');
const reportDomain = report.domains.find((item) => item.id === 'COM-001');
check(reportDomain && reportDomain.filesMatched >= 17, 'report COM path coverage');

equal(config.status, 'repository_contract_certified_runtime_blocked', 'B04 config certified');
equal(config.runtimeIntegrated, false, 'runtime disconnected');
equal(config.migrationApplied, false, 'B04 contract did not apply migration');
equal(config.authority.productionAuthority, false, 'production authority closed');
equal(evidence.status, 'repository_contract_certified', 'B04 evidence certified');
for (const value of Object.values(evidence.effects)) equal(value, false, 'B04 effect false');
for (const value of Object.values(evidence.remainingAuthority)) equal(value, false, 'B04 authority false');

console.log(`COM-B04 matrix reconciliation audit passed: ${checks}/${checks}`);
