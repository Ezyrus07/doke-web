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
  evidence: 'docs/validation/COM-B03-COMMUNITY-REALTIME-CHANNEL-SCALE-POLICY.json',
  refresh: 'config/domain-completion-matrix-refresh.json',
  syncWorkflow: '.github/workflows/domain-completion-matrix-sync.yml'
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
for (const relative of temporaryPaths) equal(fs.existsSync(path.join(root, relative)), false, `temporary removed: ${relative}`);

const pkg = JSON.parse(read('package'));
const matrix = JSON.parse(read('matrix'));
const doc = read('doc');
const report = JSON.parse(read('report'));
const policy = JSON.parse(read('policy'));
const evidence = JSON.parse(read('evidence'));
const refresh = JSON.parse(read('refresh'));
const syncWorkflow = read('syncWorkflow');
const domain = matrix.domains.find((item) => item.id === 'COM-001');
const flow = matrix.criticalFlows.find((item) => item.id === 'FLOW-12');

check(domain, 'COM-001 exists');
check(flow, 'FLOW-12 exists');
const parts = String(matrix.version).split('.').map(Number);
check(parts.length === 3 && parts[0] === 1 && parts[1] === 3 && parts[2] >= 106, 'matrix version preserves B03 baseline');
check(Number.isFinite(Date.parse(matrix.updatedAt)), 'matrix timestamp valid');
equal(domain.maturity, 3, 'maturity preserved');
equal(domain.userFacingAuthority, 'hybrid', 'UI authority preserved');
equal(domain.serverAuthority, 'partial', 'server authority partial');
equal(domain.stagingEvidence, 'staging_canary', 'staging evidence preserved');
equal(domain.productionGate, 'blocked', 'production blocked');

for (const required of [
  'backend/modules/communities/community-server-authority-contract.js',
  'backend/modules/communities/community-supabase-repository-adapter.js',
  'backend/runtime/staging/community-composition-root.js',
  'backend/modules/communities/community-realtime-channel-scale-policy.js',
  'config/com-b03-realtime-channel-scale-policy.json',
  'scripts/test-com-b03-community-realtime-channel-scale-policy.js',
  'scripts/audit-com-b03-community-realtime-channel-scale-policy.js',
  'docs/validation/COM-B03-COMMUNITY-REALTIME-CHANNEL-SCALE-POLICY.json'
]) check(domain.requiredPaths.includes(required), `B03 required path: ${required}`);

for (const script of ['audit:com-b03-community-realtime-channel-scale-policy', 'test:com-b03-community-realtime-channel-scale-policy']) {
  check(domain.tests.includes(script), `B03 matrix test: ${script}`);
  check(typeof pkg.scripts[script] === 'string', `B03 package script: ${script}`);
}

for (const marker of [
  'server-authority contract, Supabase repository adapter and private persistence foundation',
  'authenticated read-only composition-root canary passed',
  'COM-B03 scalable realtime channel policy is repository-certified',
  'No community Realtime publication, authenticated subscription, route or runtime integration is active yet.'
]) {
  check(domain.evidence.some((item) => item.includes(marker)), `B03 evidence: ${marker}`);
  check(doc.includes(marker), `B03 generated evidence: ${marker}`);
}
check(!domain.evidence.includes('Backend communities module is empty and all three core community tables have RLS disabled.'), 'stale evidence removed');
check(!doc.includes('Backend communities module is empty and all three core community tables have RLS disabled.'), 'stale generated evidence removed');

const b02 = domain.blockers.find((item) => item.id === 'COM-B02');
const b03 = domain.blockers.find((item) => item.id === 'COM-B03');
check(b02 && b03, 'B02/B03 blockers retained');
equal(b02.category, 'server_runtime_activation', 'B02 category');
equal(b03.category, 'realtime_activation', 'B03 category');
equal(b03.description, 'Scalable channel policy is repository-certified, but no community Realtime publication or authenticated subscription is active.', 'B03 blocker precise');
check(flow.blockers.includes('COM-B03'), 'FLOW-12 B03 retained');
check(domain.nextActions.includes('Prepare scoped Realtime publication and an authenticated subscription canary under separate explicit staging authorization.'), 'B03 next action retained');
check(doc.includes('**COM-B03 · HIGH · realtime_activation:** Scalable channel policy is repository-certified'), 'B03 generated blocker');

 equal(report.name, 'domain-completion-matrix', 'report name');
equal(report.version, matrix.version, 'report follows matrix version');
equal(report.generatedAt, matrix.updatedAt, 'report follows matrix timestamp');
equal(report.status, 'passed', 'report passed');
check(report.summary && report.summary.domains === 23, 'report domains');
check(Array.isArray(report.domains) && report.domains.some((item) => item.id === 'COM-001'), 'report COM-001');

 equal(refresh.contractId, 'domain-completion-matrix-refresh-v1', 'refresh contract');
equal(refresh.status, 'refresh_requested', 'refresh status');
equal(refresh.matrixVersion, matrix.version, 'refresh version follows matrix');
equal(refresh.domain, 'COM-001', 'refresh domain');
check(['COM-B03', 'COM-B04'].includes(refresh.boundary), 'refresh boundary compatible');
check(refresh.effects.repositoryDerivedArtifactsOnly === true || refresh.effects.repositorySourceAndDerivedArtifacts === true, 'refresh repository scope explicit');
for (const [key, value] of Object.entries(refresh.effects)) {
  if (key === 'repositoryDerivedArtifactsOnly' || key === 'repositorySourceAndDerivedArtifacts') continue;
  equal(value, false, `refresh ${key} false`);
}

for (const marker of [
  "- 'config/domain-completion-matrix-refresh.json'",
  'permissions:\n  contents: write',
  'npm run write:domain-completion-matrix',
  'npm run audit:domain-completion-matrix',
  'node scripts/audit-com-b03-domain-matrix-reconciliation.js',
  'git add -f reports/generated/domain-completion-matrix-report.json',
  'git push origin HEAD:com/com-001-baseline-audit'
]) check(syncWorkflow.includes(marker), `sync marker: ${marker}`);
for (const forbidden of ['workflow_dispatch', 'secrets.', 'SUPABASE_', 'supabase ', 'psql', 'curl ']) {
  check(!syncWorkflow.includes(forbidden), `sync no ${forbidden}`);
}

 equal(policy.status, 'repository_contract_certified_runtime_blocked', 'B03 policy certified');
equal(policy.realtimePublicationConfigured, false, 'publication false');
equal(policy.subscriptionCreated, false, 'subscription false');
equal(policy.runtimeIntegrated, false, 'runtime disconnected');
equal(policy.authority.realtimeSubscriptionAuthority, false, 'subscription authority closed');
equal(policy.authority.realtimePublicationAuthority, false, 'publication authority closed');
equal(policy.authority.stagingMutationAuthority, false, 'staging mutation closed');
equal(policy.authority.productionAuthority, false, 'production authority closed');
equal(evidence.status, 'repository_contract_certified', 'B03 evidence certified');
for (const value of Object.values(evidence.effects)) equal(value, false, 'B03 effect false');

console.log(`COM-B03 matrix reconciliation audit passed: ${checks}/${checks}`);
