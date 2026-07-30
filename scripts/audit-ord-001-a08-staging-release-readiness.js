#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const read = (file) => fs.readFileSync(file, 'utf8');
const required = [
  'backend/runtime/staging/runtime-release-contract.js',
  'backend/runtime/staging/node-http-server.js',
  'scripts/execute-ord-001-a08-staging-release-preflight.js',
  'scripts/test-ord-001-a08-staging-release-runtime.js',
  'scripts/audit-ord-001-a08-staging-release-readiness.js',
  'docs/ORD-001-A08-STAGING-RELEASE-READINESS.md',
  'docs/validation/ORD-001-A08-STAGING-RELEASE-READINESS.json',
  '.github/workflows/ord-001-a08-staging-release-readiness.yml',
  'config/domain-completion-matrix.json',
  'package.json'
];
required.forEach((file) => assert(fs.existsSync(file), `Missing ORD-A08 asset: ${file}`));

const contract = read(required[0]);
const server = read(required[1]);
const preflight = read(required[2]);
const test = read(required[3]);
const docs = read(required[5]);
const evidence = JSON.parse(read(required[6]));
const workflow = read(required[7]);
const matrix = JSON.parse(read(required[8]));
const pkg = JSON.parse(read(required[9]));

function requireAll(label, source, fragments) {
  fragments.forEach((fragment) => assert(source.includes(fragment), `${label} missing: ${fragment}`));
}
function compareVersions(left, right) {
  const a = String(left).split('.').map(Number);
  const b = String(right).split('.').map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const delta = (a[index] || 0) - (b[index] || 0);
    if (delta) return delta > 0 ? 1 : -1;
  }
  return 0;
}

requireAll('release contract', contract, [
  "RELEASE_CONTRACT_VERSION = 'ord-a08-staging-release-v1'",
  "REQUEST_FRESHNESS_CONTRACT_VERSION = 'ord-a07-request-freshness-v1'",
  'DOKE_PRODUCTION_RUNTIME_BLOCKED',
  'rollback_release_must_differ',
  'productionAllowed: false',
  'readyForTraffic: blockers.length === 0'
]);
requireAll('node runtime', server, [
  "require('./runtime-release-contract')",
  'assertRuntimeReleaseEnvironment(runtimeEnv)',
  'createRuntimeReleaseHeaders(releaseDescriptor)',
  'release: releaseDescriptor',
  'capabilities: { requestFreshness: releaseDescriptor.requestFreshness }'
]);
requireAll('preflight', preflight, [
  "method: 'GET'",
  "method: 'OPTIONS'",
  'production_like_target_forbidden',
  'staging_release_read_only_preflight_passed',
  'networkRequests: 2',
  'mutations: 0',
  'DOKE_ORD_A08_ALLOW_NETWORK',
  'Object.freeze({ ...report, reportPath: writeReport(report) })'
]);
assert(!/method:\s*['"]POST['"]/.test(preflight), 'ORD-A08 preflight must never issue POST.');
assert(!/SUPABASE_SERVICE_ROLE_KEY|password\s*=|Authorization:\s*['"]Bearer/.test(preflight), 'ORD-A08 preflight must not require credentials or service-role secrets.');
assert(!preflight.includes('report.reportPath ='), 'ORD-A08 must not mutate the frozen preflight report.');
requireAll('runtime test', test, [
  'DOKE_PRODUCTION_RUNTIME_BLOCKED',
  'runtimeCalls',
  'executePreflight',
  'writeReport',
  'Object.isFrozen(report)',
  'mutations, 0'
]);
requireAll('docs', docs, [
  'Nenhum provedor externo de deploy é declarado canônico',
  '`GET /health`',
  '`OPTIONS /orders`',
  'rollback',
  'produção permanece bloqueada'
]);
requireAll('workflow', workflow, [
  'permissions:\n  contents: read',
  'Test staging release runtime',
  'Audit staging release readiness',
  '--dry-run',
  'Preserve request freshness contract',
  'Audit completion matrix'
]);
assert(!workflow.includes('contents: write'), 'ORD-A08 workflow must remain read-only.');
assert(!workflow.includes('--execute'), 'ORD-A08 CI must not perform network preflight execution.');

assert.strictEqual(evidence.status, 'release_preflight_contract_complete_not_deployed');
assert.strictEqual(evidence.canonicalExternalProviderBound, false);
assert.strictEqual(evidence.deployedToStaging, false);
assert.strictEqual(evidence.networkRequestsPerformed, false);
assert.strictEqual(evidence.mutationsPerformed, false);
assert.strictEqual(evidence.productionChanged, false);
assert.strictEqual(evidence.rollback.contractRequired, true);
assert.strictEqual(evidence.preflight.allowedMethods.join(','), 'GET,OPTIONS');

const scripts = pkg.scripts || {};
assert.strictEqual(scripts['audit:ord-001-a08-staging-release-readiness'], 'node scripts/audit-ord-001-a08-staging-release-readiness.js');
assert.strictEqual(scripts['test:ord-001-a08-staging-release-runtime'], 'node scripts/test-ord-001-a08-staging-release-runtime.js');
assert.strictEqual(scripts['execute:ord-001-a08-staging-release-preflight:dry-run'], 'node scripts/execute-ord-001-a08-staging-release-preflight.js --dry-run');
assert.strictEqual(scripts['execute:ord-001-a08-staging-release-preflight:check-env'], 'node scripts/execute-ord-001-a08-staging-release-preflight.js --check-env');
assert.strictEqual(scripts['execute:ord-001-a08-staging-release-preflight'], 'node scripts/execute-ord-001-a08-staging-release-preflight.js --execute');
assert.strictEqual(scripts['execute:ord-001-a08-staging-release-preflight:report'], 'node scripts/execute-ord-001-a08-staging-release-preflight.js --execute --write-report');

assert(compareVersions(matrix.version, '1.3.23') >= 0, `Matrix version ${matrix.version} predates ORD-A08.`);
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
assert(ord, 'ORD-001 missing from matrix.');
required.slice(0, 8).forEach((file) => assert(ord.requiredPaths.includes(file), `ORD-001 requiredPaths missing ${file}`));
[
  'audit:ord-001-a08-staging-release-readiness',
  'test:ord-001-a08-staging-release-runtime',
  'execute:ord-001-a08-staging-release-preflight:dry-run'
].forEach((entry) => assert(ord.tests.includes(entry), `ORD-001 tests missing ${entry}`));
assert(ord.blockers.some((blocker) => blocker.id === 'ORD-B05' && blocker.description.includes('external staging release provider')));
console.log('ORD-A08 staging release readiness audit passed.');
