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
  'package.json',
  'backend/runtime/staging/vercel.json',
  'scripts/test-api-repository-authenticated-transport.js'
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
const deploymentConfig = JSON.parse(read(required[10]));
const transportTest = read(required[11]);

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
  'capabilities: { requestFreshness: releaseDescriptor.requestFreshness }',
  'createNodeRequestHandler',
  'DOKE_ALLOWED_ORIGINS',
  'DOKE_CORS_ORIGIN_FORBIDDEN'
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
  '`kontrat-staging-api-runtime`',
  '`STAGING_RUNTIME_ENDPOINTS`',
  '`DOKE_ENABLE_STAGING_API=0`',
  '`GET /health`',
  '`OPTIONS /orders`',
  'rollback',
  'produção permanece bloqueada'
]);
assert.strictEqual(deploymentConfig.version, 2);
assert(deploymentConfig.builds.some((entry) => entry.src === 'node-http-server.js' && entry.use === '@vercel/node'));
assert(deploymentConfig.routes.some((entry) => entry.src === '/(.*)' && entry.dest === 'node-http-server.js'));
requireAll('authenticated transport', transportTest, [
  'headers.Authorization',
  "'x-doke-request-issued-at'",
  "'x-doke-request-nonce'",
  "'x-idempotency-key'",
  "options.credentials, 'omit'",
  "includes('service_role')"
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

assert.strictEqual(evidence.status, 'staging_runtime_deployed_preflight_passed_browser_canary_proven');
assert.strictEqual(evidence.browserCanary.status, 'passed');
assert.strictEqual(evidence.browserCanary.scope, 'isolated-staging-preview-only');
assert(/^[a-f0-9]{40}$/.test(evidence.browserCanary.evidenceHeadSha));
assert.strictEqual(evidence.browserCanary.acceptedOrderReadback, true);
assert.strictEqual(evidence.browserCanary.activeConversationReadback, true);
assert.strictEqual(evidence.browserCanary.persistedMessageReadback, true);
assert.strictEqual(evidence.browserCanary.messagePostAwaitedBeforeReload, true);
assert.strictEqual(evidence.browserCanary.productionTested, false);
assert.strictEqual(evidence.historicalPreflight.status, 'staging_runtime_deployed_preflight_passed_browser_canary_blocked');
assert.strictEqual(evidence.canonicalExternalProviderBound, true);
assert.strictEqual(evidence.provider.project, 'kontrat-staging-api-runtime');
assert.strictEqual(evidence.provider.productionProjectReused, false);
assert.strictEqual(evidence.deployedToStaging, true);
assert.strictEqual(evidence.networkRequestsPerformed, true);
assert.strictEqual(evidence.mutationsPerformed, true);
assert.strictEqual(evidence.preflight.mutationsPerformed, false);
assert.strictEqual(evidence.accountsUsed, 2);
assert.strictEqual(evidence.ordersCreated, 1);
assert.strictEqual(evidence.productionChanged, false);
assert.strictEqual(evidence.rollback.contractRequired, true);
assert.strictEqual(evidence.rollback.providerCommandBound, true);
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
assert(!ord.blockers.some((blocker) => blocker.id === 'ORD-B05'), 'ORD-B05 must be closed after the isolated staging deployment.');
assert(ord.blockers.some((blocker) => blocker.id === 'ORD-B02' && blocker.description.includes('synthetic credentials')));
console.log('ORD-A08 staging release readiness audit passed.');
