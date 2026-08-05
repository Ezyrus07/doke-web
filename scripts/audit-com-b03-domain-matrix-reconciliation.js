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
  policy: 'config/com-b03-realtime-channel-scale-policy.json',
  evidence: 'docs/validation/COM-B03-COMMUNITY-REALTIME-CHANNEL-SCALE-POLICY.json'
};
const temporaryPaths = [
  '.github/workflows/com-b03-domain-matrix-reconciliation.yml',
  'config/com-b03-domain-matrix-reconciliation.json',
  'config/com-b03-domain-matrix-reconciliation-attempt-2.json',
  'config/com-b03-domain-matrix-reconciliation-attempt-3.json'
];
const read = (key) => fs.readFileSync(path.join(root, files[key]), 'utf8');
let checks = 0;
const check = (value, message) => { checks += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { checks += 1; assert.strictEqual(actual, expected, message); };

for (const [key, relative] of Object.entries(files)) {
  check(fs.existsSync(path.join(root, relative)), `${key} exists`);
  check(fs.statSync(path.join(root, relative)).size > 20, `${key} nonempty`);
}
for (const relative of temporaryPaths) {
  equal(fs.existsSync(path.join(root, relative)), false, `temporary artifact removed: ${relative}`);
}

const pkg = JSON.parse(read('package'));
const matrix = JSON.parse(read('matrix'));
const doc = read('doc');
const report = JSON.parse(read('report'));
const policy = JSON.parse(read('policy'));
const evidence = JSON.parse(read('evidence'));
const domain = matrix.domains.find((item) => item.id === 'COM-001');
const flow = matrix.criticalFlows.find((item) => item.id === 'FLOW-12');

check(domain, 'COM-001 domain exists');
check(flow, 'FLOW-12 exists');
equal(matrix.version, '1.3.106', 'matrix version');
equal(matrix.updatedAt, '2026-08-05T19:52:00-03:00', 'matrix timestamp');
equal(domain.maturity, 3, 'maturity preserved');
equal(domain.userFacingAuthority, 'hybrid', 'UI authority preserved');
equal(domain.serverAuthority, 'partial', 'server authority remains partial');
equal(domain.stagingEvidence, 'staging_canary', 'staging evidence preserved');
equal(domain.productionGate, 'blocked', 'production remains blocked');

for (const required of [
  'backend/modules/communities/community-server-authority-contract.js',
  'backend/modules/communities/community-supabase-repository-adapter.js',
  'backend/runtime/staging/community-composition-root.js',
  'backend/modules/communities/community-realtime-channel-scale-policy.js',
  'config/com-b03-realtime-channel-scale-policy.json',
  'scripts/test-com-b03-community-realtime-channel-scale-policy.js',
  'scripts/audit-com-b03-community-realtime-channel-scale-policy.js',
  'docs/validation/COM-B03-COMMUNITY-REALTIME-CHANNEL-SCALE-POLICY.json'
]) check(domain.requiredPaths.includes(required), `matrix required path: ${required}`);

for (const script of [
  'audit:com-b03-community-realtime-channel-scale-policy',
  'test:com-b03-community-realtime-channel-scale-policy'
]) {
  check(domain.tests.includes(script), `matrix test: ${script}`);
  check(typeof pkg.scripts[script] === 'string', `package script: ${script}`);
}
equal(
  pkg.scripts['audit:com-b03-community-realtime-channel-scale-policy'],
  'node scripts/audit-com-b03-community-realtime-channel-scale-policy.js',
  'audit command exact'
);
equal(
  pkg.scripts['test:com-b03-community-realtime-channel-scale-policy'],
  'node scripts/test-com-b03-community-realtime-channel-scale-policy.js',
  'test command exact'
);

const evidenceMarkers = [
  'server-authority contract, Supabase repository adapter and private persistence foundation',
  'authenticated read-only composition-root canary passed',
  'COM-B03 scalable realtime channel policy is repository-certified',
  'No community Realtime publication, authenticated subscription, route or runtime integration is active yet.'
];
for (const marker of evidenceMarkers) {
  check(domain.evidence.some((item) => item.includes(marker)), `matrix evidence: ${marker}`);
  check(doc.includes(marker), `generated doc evidence: ${marker}`);
}
check(
  !domain.evidence.includes('Backend communities module is empty and all three core community tables have RLS disabled.'),
  'stale empty-module evidence removed'
);
check(!doc.includes('Backend communities module is empty and all three core community tables have RLS disabled.'), 'stale generated evidence removed');

const b02 = domain.blockers.find((item) => item.id === 'COM-B02');
const b03 = domain.blockers.find((item) => item.id === 'COM-B03');
check(b02, 'COM-B02 blocker retained');
check(b03, 'COM-B03 blocker retained');
equal(b02.category, 'server_runtime_activation', 'COM-B02 category reconciled');
check(b02.description.includes('not integrated into the canonical runtime'), 'COM-B02 runtime blocker precise');
equal(b03.category, 'realtime_activation', 'COM-B03 category reconciled');
equal(
  b03.description,
  'Scalable channel policy is repository-certified, but no community Realtime publication or authenticated subscription is active.',
  'COM-B03 activation blocker precise'
);
check(flow.blockers.includes('COM-B03'), 'FLOW-12 operational COM-B03 blocker retained');
check(
  domain.nextActions.includes('Prepare scoped Realtime publication and an authenticated subscription canary under separate explicit staging authorization.'),
  'authorized next action exact'
);
check(
  domain.nextActions.includes('Integrate the certified server-authority repository into the main runtime for invitations, join requests, roles, bans and content commands.'),
  'runtime integration next action exact'
);

for (const marker of [
  '**COM-B03 · HIGH · realtime_activation:** Scalable channel policy is repository-certified',
  'Prepare scoped Realtime publication and an authenticated subscription canary under separate explicit staging authorization.',
  'Baseline: 2026-08-05T19:52:00-03:00.'
]) check(doc.includes(marker), `generated document marker: ${marker}`);

equal(report.name, 'domain-completion-matrix', 'report name');
equal(report.version, '1.3.106', 'report version');
equal(report.generatedAt, '2026-08-05T19:52:00-03:00', 'report timestamp');
equal(report.status, 'passed', 'report status');
check(report.summary && report.summary.domains === 23, 'report domain count');
check(Array.isArray(report.domains), 'report domains array');
const reportDomain = report.domains.find((item) => item.id === 'COM-001');
check(reportDomain, 'report COM-001 entry');
check(reportDomain.filesMatched >= 16, 'report scans COM-B03 paths');

 equal(policy.status, 'repository_contract_certified_runtime_blocked', 'policy certified');
equal(policy.realtimePublicationConfigured, false, 'publication remains false');
equal(policy.subscriptionCreated, false, 'subscription remains false');
equal(policy.runtimeIntegrated, false, 'runtime remains disconnected');
equal(policy.authority.realtimeSubscriptionAuthority, false, 'subscription authority closed');
equal(policy.authority.realtimePublicationAuthority, false, 'publication authority closed');
equal(policy.authority.stagingMutationAuthority, false, 'staging mutation authority closed');
equal(policy.authority.productionAuthority, false, 'production authority closed');
equal(evidence.status, 'repository_contract_certified', 'COM-B03 evidence certified');
for (const value of Object.values(evidence.effects)) equal(value, false, 'COM-B03 effect remains false');

console.log(`COM-B03 matrix reconciliation audit passed: ${checks}/${checks}`);
