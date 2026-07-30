#!/usr/bin/env python3
from pathlib import Path
import json
import textwrap


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, content):
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(textwrap.dedent(content).lstrip(), encoding='utf-8')


def replace_once(source, old, new, label):
    if new in source:
        return source
    if old not in source:
        raise SystemExit(f'Missing patch anchor: {label}')
    return source.replace(old, new, 1)


write('backend/runtime/staging/runtime-release-contract.js', """
'use strict';

const crypto = require('crypto');
const {
  REQUEST_ISSUED_AT_HEADER,
  REQUEST_NONCE_HEADER,
  MAX_REQUEST_AGE_MS,
  MAX_FUTURE_SKEW_MS
} = require('../../shared/security/request-freshness-contract');

const RELEASE_CONTRACT_VERSION = 'ord-a08-staging-release-v1';
const REQUEST_FRESHNESS_CONTRACT_VERSION = 'ord-a07-request-freshness-v1';
const RELEASE_ID_PATTERN = /^ord-a08-[a-z0-9][a-z0-9._-]{7,95}$/;
const REVISION_PATTERN = /^[a-f0-9]{7,64}$/i;

function normalizeEnvironment(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeReleaseId(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRevision(value) {
  return String(value || '').trim().toLowerCase();
}

function createRuntimeReleaseDescriptor(env) {
  const source = env && typeof env === 'object' ? env : {};
  const rawEnvironment = normalizeEnvironment(source.DOKE_ENVIRONMENT || 'local');
  const productionBlocked = rawEnvironment === 'production' || rawEnvironment === 'prod';
  const environment = productionBlocked ? 'blocked' : (rawEnvironment === 'staging' ? 'staging' : 'local');
  const releaseId = normalizeReleaseId(source.DOKE_STAGING_RELEASE_ID);
  const revision = normalizeRevision(source.DOKE_STAGING_RELEASE_SHA);
  const rollbackReleaseId = normalizeReleaseId(source.DOKE_STAGING_ROLLBACK_RELEASE_ID);
  const stagingApiEnabled = String(source.DOKE_ENABLE_STAGING_API || '') === '1';
  const blockers = [];

  if (productionBlocked) blockers.push('production_environment_forbidden');
  if (environment !== 'staging') blockers.push('environment_not_staging');
  if (!releaseId) blockers.push('release_id_missing');
  else if (!RELEASE_ID_PATTERN.test(releaseId)) blockers.push('release_id_invalid');
  if (!revision) blockers.push('release_revision_missing');
  else if (!REVISION_PATTERN.test(revision)) blockers.push('release_revision_invalid');
  if (!rollbackReleaseId) blockers.push('rollback_release_id_missing');
  else if (!RELEASE_ID_PATTERN.test(rollbackReleaseId)) blockers.push('rollback_release_id_invalid');
  if (releaseId && rollbackReleaseId && releaseId === rollbackReleaseId) blockers.push('rollback_release_must_differ');
  if (!stagingApiEnabled) blockers.push('staging_api_not_enabled');

  const fingerprint = crypto.createHash('sha256').update([
    RELEASE_CONTRACT_VERSION,
    environment,
    releaseId || 'unbound',
    revision || 'unbound'
  ].join(':')).digest('hex');

  return Object.freeze({
    contractVersion: RELEASE_CONTRACT_VERSION,
    environment,
    releaseId: releaseId || 'unbound',
    revision: revision || 'unbound',
    fingerprint,
    rollbackReady: Boolean(rollbackReleaseId && RELEASE_ID_PATTERN.test(rollbackReleaseId) && rollbackReleaseId !== releaseId),
    readyForTraffic: blockers.length === 0,
    productionAllowed: false,
    requestFreshness: Object.freeze({
      contractVersion: REQUEST_FRESHNESS_CONTRACT_VERSION,
      issuedAtHeader: REQUEST_ISSUED_AT_HEADER,
      nonceHeader: REQUEST_NONCE_HEADER,
      maximumAgeSeconds: Math.floor(MAX_REQUEST_AGE_MS / 1000),
      maximumFutureSkewSeconds: Math.floor(MAX_FUTURE_SKEW_MS / 1000)
    }),
    blockers: Object.freeze(blockers)
  });
}

function assertRuntimeReleaseEnvironment(env) {
  const rawEnvironment = normalizeEnvironment(env && env.DOKE_ENVIRONMENT);
  if (rawEnvironment === 'production' || rawEnvironment === 'prod') {
    const error = new Error('The staging Node runtime is prohibited from starting with a production environment marker.');
    error.code = 'DOKE_PRODUCTION_RUNTIME_BLOCKED';
    error.status = 503;
    throw error;
  }
  return createRuntimeReleaseDescriptor(env);
}

function createRuntimeReleaseHeaders(descriptor) {
  const safe = descriptor || createRuntimeReleaseDescriptor({});
  return Object.freeze({
    'cache-control': 'no-store',
    'x-doke-runtime-contract': safe.contractVersion,
    'x-doke-runtime-release-fingerprint': safe.fingerprint
  });
}

module.exports = Object.freeze({
  RELEASE_CONTRACT_VERSION,
  REQUEST_FRESHNESS_CONTRACT_VERSION,
  RELEASE_ID_PATTERN,
  REVISION_PATTERN,
  createRuntimeReleaseDescriptor,
  assertRuntimeReleaseEnvironment,
  createRuntimeReleaseHeaders
});
""")

node_path = 'backend/runtime/staging/node-http-server.js'
node_source = read(node_path)
node_source = replace_once(
    node_source,
    "const { createStagingApiRuntime } = require('./staging-api-runtime');\n",
    "const { createStagingApiRuntime } = require('./staging-api-runtime');\nconst { assertRuntimeReleaseEnvironment, createRuntimeReleaseHeaders } = require('./runtime-release-contract');\n",
    'release contract import'
)
node_source = replace_once(
    node_source,
    "  const safeOptions = options && typeof options === 'object' ? options : {};\n  let runtime = safeOptions.runtime || null;\n",
    "  const safeOptions = options && typeof options === 'object' ? options : {};\n  const runtimeEnv = safeOptions.env || process.env;\n  const releaseDescriptor = assertRuntimeReleaseEnvironment(runtimeEnv);\n  const releaseHeaders = createRuntimeReleaseHeaders(releaseDescriptor);\n  let runtime = safeOptions.runtime || null;\n",
    'release descriptor binding'
)
node_source = replace_once(node_source, "      env: safeOptions.env || process.env,\n", "      env: runtimeEnv,\n", 'runtime env binding')
node_source = replace_once(
    node_source,
    "      applyCorsHeaders(response, request.headers.origin);\n\n      if (request.method === 'OPTIONS') {\n",
    "      applyCorsHeaders(response, request.headers.origin);\n      Object.entries(releaseHeaders).forEach(([key, value]) => response.setHeader(key, value));\n\n      if (request.method === 'OPTIONS') {\n",
    'release response headers'
)
node_source = replace_once(
    node_source,
    "          runtime: 'node-http',\n          requestId\n",
    "          runtime: 'node-http',\n          release: releaseDescriptor,\n          capabilities: { requestFreshness: releaseDescriptor.requestFreshness },\n          requestId\n",
    'health release descriptor'
)
node_source = replace_once(node_source, "  const server = createNodeHttpServer();\n", "  const server = createNodeHttpServer({ env: process.env });\n", 'server env binding')
Path(node_path).write_text(node_source, encoding='utf-8')

write('scripts/execute-ord-001-a08-staging-release-preflight.js', """
#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  RELEASE_CONTRACT_VERSION,
  REQUEST_FRESHNESS_CONTRACT_VERSION,
  RELEASE_ID_PATTERN,
  REVISION_PATTERN
} = require('../backend/runtime/staging/runtime-release-contract');

const REPORT_PATH = path.join('reports', 'generated', 'ord-001-a08-staging-release-preflight.json');
const REQUIRED_ALLOW_HEADERS = Object.freeze([
  'x-idempotency-key',
  'x-doke-request-issued-at',
  'x-doke-request-nonce'
]);

function parseMode(argv) {
  const args = new Set(argv || []);
  if (args.has('--execute')) return 'execute';
  if (args.has('--check-env')) return 'check-env';
  return 'dry-run';
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function createPreflightConfig(env) {
  const source = env && typeof env === 'object' ? env : {};
  return Object.freeze({
    environment: String(source.DOKE_ENVIRONMENT || '').trim().toLowerCase(),
    baseUrl: normalizeBaseUrl(source.DOKE_ORD_A08_STAGING_API_URL),
    releaseId: String(source.DOKE_ORD_A08_RELEASE_ID || '').trim().toLowerCase(),
    releaseSha: String(source.DOKE_ORD_A08_RELEASE_SHA || '').trim().toLowerCase(),
    rollbackReleaseId: String(source.DOKE_ORD_A08_ROLLBACK_RELEASE_ID || '').trim().toLowerCase(),
    targetMarker: String(source.DOKE_ORD_A08_TARGET_MARKER || '').trim().toLowerCase(),
    allowNetwork: String(source.DOKE_ORD_A08_ALLOW_NETWORK || '') === '1'
  });
}

function describeSafeTarget(baseUrl, marker) {
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return { safe: false, reason: 'invalid_url' };
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) return { safe: false, reason: 'embedded_credentials_or_query_forbidden' };
  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();
  const loopback = hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1';
  if (parsed.protocol !== 'https:' && !(loopback && parsed.protocol === 'http:')) return { safe: false, reason: 'https_required_outside_loopback' };
  if (/(^|[.-])(prod|production)([.-]|$)/.test(hostname) || /^www\./.test(hostname)) return { safe: false, reason: 'production_like_target_forbidden' };
  const explicitMarker = marker === 'staging' || marker === 'local';
  const targetMarked = /(^|[.-])(staging|stage|stg|preview|local)([.-]|$)/.test(hostname) || /(staging|stage|stg|preview|local)/.test(pathname);
  if (!loopback && !explicitMarker && !targetMarked) return { safe: false, reason: 'staging_marker_required' };
  return {
    safe: true,
    loopback,
    protocol: parsed.protocol,
    targetFingerprint: crypto.createHash('sha256').update(parsed.origin + parsed.pathname).digest('hex')
  };
}

function validatePreflightConfig(config, options) {
  const requireNetwork = Boolean(options && options.requireNetwork);
  const blockers = [];
  if (config.environment !== 'staging') blockers.push('DOKE_ENVIRONMENT');
  if (!config.baseUrl) blockers.push('DOKE_ORD_A08_STAGING_API_URL');
  if (!RELEASE_ID_PATTERN.test(config.releaseId)) blockers.push('DOKE_ORD_A08_RELEASE_ID');
  if (!REVISION_PATTERN.test(config.releaseSha)) blockers.push('DOKE_ORD_A08_RELEASE_SHA');
  if (!RELEASE_ID_PATTERN.test(config.rollbackReleaseId) || config.rollbackReleaseId === config.releaseId) blockers.push('DOKE_ORD_A08_ROLLBACK_RELEASE_ID');
  const target = config.baseUrl ? describeSafeTarget(config.baseUrl, config.targetMarker) : { safe: false, reason: 'missing_url' };
  if (config.baseUrl && !target.safe) blockers.push(`unsafe_target:${target.reason}`);
  if (requireNetwork && !config.allowNetwork) blockers.push('DOKE_ORD_A08_ALLOW_NETWORK');
  return Object.freeze({ ok: blockers.length === 0, blockers: Object.freeze(blockers), target });
}

function buildDryRunPlan() {
  return Object.freeze({
    mode: 'dry-run',
    status: 'no_network_no_deploy_no_mutation',
    requestsWhenExplicitlyExecuted: Object.freeze(['GET /health', 'OPTIONS /orders']),
    requiredEnvironmentNames: Object.freeze([
      'DOKE_ENVIRONMENT',
      'DOKE_ORD_A08_STAGING_API_URL',
      'DOKE_ORD_A08_RELEASE_ID',
      'DOKE_ORD_A08_RELEASE_SHA',
      'DOKE_ORD_A08_ROLLBACK_RELEASE_ID',
      'DOKE_ORD_A08_TARGET_MARKER',
      'DOKE_ORD_A08_ALLOW_NETWORK'
    ]),
    productionAllowed: false
  });
}

async function fetchWithTimeout(url, options, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    return await fetchImpl(url, { ...(options || {}), signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function executePreflight(config, options) {
  const fetchImpl = options && options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw preflightError('DOKE_ORD_A08_FETCH_UNAVAILABLE', 'Global fetch is unavailable.', 500);
  const validation = validatePreflightConfig(config, { requireNetwork: true });
  if (!validation.ok) throw preflightError('DOKE_ORD_A08_PREFLIGHT_BLOCKED', `Missing or invalid preflight inputs: ${validation.blockers.join(', ')}`, 428);

  const healthResponse = await fetchWithTimeout(config.baseUrl + '/health', {
    method: 'GET',
    headers: { Accept: 'application/json', 'x-request-id': 'ord-a08-release-preflight' }
  }, fetchImpl);
  const healthBody = await healthResponse.json().catch(() => ({}));
  if (!healthResponse.ok) throw preflightError('DOKE_ORD_A08_HEALTH_FAILED', `Health endpoint returned ${healthResponse.status}.`, 502);

  const responseContract = healthResponse.headers.get('x-doke-runtime-contract');
  const responseFingerprint = healthResponse.headers.get('x-doke-runtime-release-fingerprint');
  const release = healthBody && healthBody.release || {};
  const freshness = healthBody && healthBody.capabilities && healthBody.capabilities.requestFreshness || {};

  assertEqual(responseContract, RELEASE_CONTRACT_VERSION, 'runtime contract header');
  if (!/^[a-f0-9]{64}$/i.test(String(responseFingerprint || ''))) throw preflightError('DOKE_ORD_A08_FINGERPRINT_INVALID', 'Runtime release fingerprint is missing or invalid.', 502);
  assertEqual(release.contractVersion, RELEASE_CONTRACT_VERSION, 'health release contract');
  assertEqual(release.environment, 'staging', 'health environment');
  assertEqual(release.releaseId, config.releaseId, 'health release id');
  assertEqual(release.revision, config.releaseSha, 'health release revision');
  assertEqual(release.readyForTraffic, true, 'health readyForTraffic');
  assertEqual(release.productionAllowed, false, 'health productionAllowed');
  assertEqual(release.rollbackReady, true, 'health rollbackReady');
  assertEqual(freshness.contractVersion, REQUEST_FRESHNESS_CONTRACT_VERSION, 'freshness contract');
  assertEqual(freshness.maximumAgeSeconds, 300, 'freshness maximum age');
  assertEqual(freshness.maximumFutureSkewSeconds, 30, 'freshness future skew');

  const optionsResponse = await fetchWithTimeout(config.baseUrl + '/orders', {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://127.0.0.1:4173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': REQUIRED_ALLOW_HEADERS.join(',')
    }
  }, fetchImpl);
  if (optionsResponse.status !== 204) throw preflightError('DOKE_ORD_A08_OPTIONS_FAILED', `OPTIONS endpoint returned ${optionsResponse.status}.`, 502);
  const allowedHeaders = String(optionsResponse.headers.get('access-control-allow-headers') || '').toLowerCase();
  REQUIRED_ALLOW_HEADERS.forEach((header) => {
    if (!allowedHeaders.split(',').map((value) => value.trim()).includes(header)) {
      throw preflightError('DOKE_ORD_A08_CORS_HEADER_MISSING', `CORS preflight does not allow ${header}.`, 502);
    }
  });

  return Object.freeze({
    status: 'staging_release_read_only_preflight_passed',
    contractVersion: RELEASE_CONTRACT_VERSION,
    targetFingerprint: validation.target.targetFingerprint,
    runtimeFingerprint: responseFingerprint,
    releaseId: config.releaseId,
    releaseSha: config.releaseSha,
    rollbackReady: true,
    networkRequests: 2,
    mutations: 0,
    productionChanged: false,
    checkedAt: new Date().toISOString()
  });
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw preflightError('DOKE_ORD_A08_CONTRACT_MISMATCH', `${label} mismatch.`, 502);
}

function preflightError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function writeReport(report) {
  const destination = path.resolve(REPORT_PATH);
  const root = path.resolve('reports', 'generated');
  if (!destination.startsWith(root + path.sep)) throw new Error('ORD-A08 report path escaped reports/generated.');
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n', 'utf8');
  return destination;
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  if (mode === 'dry-run') {
    console.log(JSON.stringify(buildDryRunPlan(), null, 2));
    return;
  }
  const config = createPreflightConfig(process.env);
  const validation = validatePreflightConfig(config, { requireNetwork: mode === 'execute' });
  if (mode === 'check-env') {
    console.log(JSON.stringify({ status: validation.ok ? 'environment_ready' : 'environment_blocked', missingOrInvalidNames: validation.blockers }, null, 2));
    if (!validation.ok) process.exitCode = 2;
    return;
  }
  const report = await executePreflight(config);
  if (process.argv.includes('--write-report')) report.reportPath = writeReport(report);
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(JSON.stringify({ ok: false, code: error.code || 'DOKE_ORD_A08_PREFLIGHT_ERROR', message: error.message }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = Object.freeze({
  REPORT_PATH,
  REQUIRED_ALLOW_HEADERS,
  parseMode,
  createPreflightConfig,
  describeSafeTarget,
  validatePreflightConfig,
  buildDryRunPlan,
  executePreflight,
  writeReport
});
""")

write('scripts/test-ord-001-a08-staging-release-runtime.js', """
#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { createNodeHttpServer } = require('../backend/runtime/staging/node-http-server');
const { createRuntimeReleaseDescriptor, RELEASE_CONTRACT_VERSION } = require('../backend/runtime/staging/runtime-release-contract');
const { createPreflightConfig, executePreflight } = require('./execute-ord-001-a08-staging-release-preflight');

const releaseId = 'ord-a08-test-release-01';
const rollbackReleaseId = 'ord-a08-test-rollback-00';
const releaseSha = 'abcdef1234567890abcdef1234567890abcdef12';
let runtimeCalls = 0;

assert.throws(
  () => createNodeHttpServer({ env: { DOKE_ENVIRONMENT: 'production' }, runtime: { handle: async () => ({ status: 200, body: {} }) } }),
  (error) => error && error.code === 'DOKE_PRODUCTION_RUNTIME_BLOCKED'
);
const unbound = createRuntimeReleaseDescriptor({ DOKE_ENVIRONMENT: 'staging' });
assert.strictEqual(unbound.readyForTraffic, false);
assert(unbound.blockers.includes('release_id_missing'));
assert(unbound.blockers.includes('rollback_release_id_missing'));

const server = createNodeHttpServer({
  env: {
    DOKE_ENVIRONMENT: 'staging',
    DOKE_ENABLE_STAGING_API: '1',
    DOKE_STAGING_RELEASE_ID: releaseId,
    DOKE_STAGING_RELEASE_SHA: releaseSha,
    DOKE_STAGING_ROLLBACK_RELEASE_ID: rollbackReleaseId
  },
  runtime: {
    async handle() {
      runtimeCalls += 1;
      return { status: 500, body: { unexpected: true } };
    }
  }
});

server.listen(0, '127.0.0.1', async () => {
  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const health = await fetch(baseUrl + '/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.headers.get('x-doke-runtime-contract'), RELEASE_CONTRACT_VERSION);
    assert.strictEqual(health.headers.get('cache-control'), 'no-store');
    const healthBody = await health.json();
    assert.strictEqual(healthBody.release.releaseId, releaseId);
    assert.strictEqual(healthBody.release.revision, releaseSha);
    assert.strictEqual(healthBody.release.readyForTraffic, true);
    assert.strictEqual(healthBody.release.rollbackReady, true);
    assert.strictEqual(healthBody.release.productionAllowed, false);
    assert.strictEqual(healthBody.capabilities.requestFreshness.maximumAgeSeconds, 300);

    const config = createPreflightConfig({
      DOKE_ENVIRONMENT: 'staging',
      DOKE_ORD_A08_STAGING_API_URL: baseUrl,
      DOKE_ORD_A08_RELEASE_ID: releaseId,
      DOKE_ORD_A08_RELEASE_SHA: releaseSha,
      DOKE_ORD_A08_ROLLBACK_RELEASE_ID: rollbackReleaseId,
      DOKE_ORD_A08_TARGET_MARKER: 'local',
      DOKE_ORD_A08_ALLOW_NETWORK: '1'
    });
    const report = await executePreflight(config, { fetchImpl: fetch });
    assert.strictEqual(report.status, 'staging_release_read_only_preflight_passed');
    assert.strictEqual(report.networkRequests, 2);
    assert.strictEqual(report.mutations, 0);
    assert.strictEqual(runtimeCalls, 0, 'Health and OPTIONS must not invoke the domain runtime.');
    console.log('ORD-A08 staging release runtime test passed.');
  } finally {
    server.close();
  }
});
""")

write('scripts/audit-ord-001-a08-staging-release-readiness.js', """
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
  'DOKE_ORD_A08_ALLOW_NETWORK'
]);
assert(!/method:\s*['"]POST['"]/.test(preflight), 'ORD-A08 preflight must never issue POST.');
assert(!/SUPABASE_SERVICE_ROLE_KEY|password\s*=|Authorization:\s*['"]Bearer/.test(preflight), 'ORD-A08 preflight must not require credentials or service-role secrets.');
requireAll('runtime test', test, [
  'DOKE_PRODUCTION_RUNTIME_BLOCKED',
  'runtimeCalls',
  'executePreflight',
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
""")

write('docs/ORD-001-A08-STAGING-RELEASE-READINESS.md', """
# ORD-001-A08 — prontidão do release de staging

## Decisão arquitetural

Nenhum provedor externo de deploy é declarado canônico no repositório. Não existem Dockerfile, manifesto Railway/Render/Fly, função serverless ou workflow de promoção que possa ser tratado como autoridade operacional.

O ponto de execução existente continua sendo:

```bash
npm run serve:staging-api-runtime
```

ORD-A08 não escolhe fornecedor de hospedagem e não promove código. Ele cria uma fronteira agnóstica de plataforma para que um release futuro seja identificável, verificável e reversível.

## Identidade do runtime

O servidor Node passa a publicar um contrato seguro em `GET /health`:

- versão `ord-a08-staging-release-v1`;
- ambiente sanitizado;
- release ID;
- revisão Git hexadecimal;
- fingerprint SHA-256;
- prontidão de rollback;
- `readyForTraffic`;
- produção permanentemente proibida;
- capacidade ORD-A07 de frescor de requisições.

Os valores vêm apenas do ambiente server-side:

```txt
DOKE_ENVIRONMENT
DOKE_ENABLE_STAGING_API
DOKE_STAGING_RELEASE_ID
DOKE_STAGING_RELEASE_SHA
DOKE_STAGING_ROLLBACK_RELEASE_ID
```

Nenhuma chave Supabase, token, credencial ou URL é devolvida pelo healthcheck.

## Preflight read-only

O executor `scripts/execute-ord-001-a08-staging-release-preflight.js` possui três modos:

- `--dry-run`: não lê alvo, não usa rede e não escreve relatório;
- `--check-env`: valida apenas nomes e formatos, sem rede;
- `--execute`: exige autorização explícita de rede e realiza somente `GET /health` e `OPTIONS /orders`.

A execução real verifica:

1. alvo HTTPS marcado como staging, ou loopback HTTP;
2. rejeição de host com aparência de produção;
3. versão do contrato;
4. release ID e SHA esperados;
5. `readyForTraffic=true`;
6. `productionAllowed=false`;
7. rollback diferente do release atual;
8. contrato ORD-A07 com janela de cinco minutos;
9. CORS permitindo idempotência, issued-at e nonce.

Não existe `POST`, login, bearer token, service-role, pedido, orçamento ou mutação nesse preflight.

## Rollback

Todo release de staging deve declarar previamente um `DOKE_STAGING_ROLLBACK_RELEASE_ID` válido e diferente do release candidato. ORD-A08 apenas comprova que a referência existe; a implementação concreta do rollback pertence ao provedor que vier a ser formalmente escolhido.

Até que um provedor externo seja vinculado, o estado correto é `release_preflight_contract_complete_not_deployed`.

## Produção

A criação do servidor falha com `DOKE_PRODUCTION_RUNTIME_BLOCKED` quando `DOKE_ENVIRONMENT` é `prod` ou `production`. O preflight também rejeita alvos com aparência de produção. Portanto, produção permanece bloqueada em duas fronteiras independentes.

## Comandos

```bash
npm run test:ord-001-a08-staging-release-runtime
npm run audit:ord-001-a08-staging-release-readiness
npm run execute:ord-001-a08-staging-release-preflight:dry-run
npm run execute:ord-001-a08-staging-release-preflight:check-env
npm run execute:ord-001-a08-staging-release-preflight
npm run execute:ord-001-a08-staging-release-preflight:report
```

CI executa somente teste local, auditoria e dry-run. A rede externa nunca é habilitada pelo workflow.

## Próxima fronteira

1. escolher formalmente o provedor de staging;
2. definir release e rollback commands específicos do provedor;
3. injetar identidade de release no ambiente server-side;
4. promover pelo fluxo controlado;
5. executar o preflight read-only;
6. manter o canário visual A06 sob autorização separada.
""")

write('docs/validation/ORD-001-A08-STAGING-RELEASE-READINESS.json', """
{
  "domain": "ORD-001",
  "sublot": "ORD-A08",
  "status": "release_preflight_contract_complete_not_deployed",
  "environment": "staging",
  "recordedAt": "2026-07-30T08:36:00-03:00",
  "objective": "Establish platform-neutral release identity, read-only deployment preflight and mandatory rollback binding before any staging promotion.",
  "canonicalExternalProviderBound": false,
  "runtime": {
    "entrypoint": "npm run serve:staging-api-runtime",
    "contractVersion": "ord-a08-staging-release-v1",
    "healthEndpoint": "GET /health",
    "productionAllowed": false,
    "releaseIdentityRequired": true,
    "rollbackIdentityRequired": true
  },
  "preflight": {
    "allowedMethods": ["GET", "OPTIONS"],
    "loginPerformed": false,
    "credentialsRequired": false,
    "serviceRoleRequired": false,
    "mutationEndpointsAllowed": false,
    "targetSafetyRequired": true
  },
  "rollback": {
    "contractRequired": true,
    "candidateMustDifferFromRollback": true,
    "providerCommandBound": false
  },
  "deployedToStaging": false,
  "networkRequestsPerformed": false,
  "mutationsPerformed": false,
  "accountsUsed": 0,
  "ordersCreated": 0,
  "productionChanged": false,
  "remainingBlockers": [
    "select_and_bind_external_staging_release_provider",
    "define_provider_specific_release_and_rollback_commands",
    "deploy_release_identity_contract_to_staging",
    "execute_read_only_preflight_against_deployed_runtime",
    "explicit_authorization_for_real_visual_canary"
  ],
  "nextAction": "Bind an explicit external staging provider and deterministic rollback command before any deployment attempt."
}
""")

package_path = Path('package.json')
package = json.loads(package_path.read_text(encoding='utf-8'))
package.setdefault('scripts', {}).update({
    'audit:ord-001-a08-staging-release-readiness': 'node scripts/audit-ord-001-a08-staging-release-readiness.js',
    'test:ord-001-a08-staging-release-runtime': 'node scripts/test-ord-001-a08-staging-release-runtime.js',
    'execute:ord-001-a08-staging-release-preflight:dry-run': 'node scripts/execute-ord-001-a08-staging-release-preflight.js --dry-run',
    'execute:ord-001-a08-staging-release-preflight:check-env': 'node scripts/execute-ord-001-a08-staging-release-preflight.js --check-env',
    'execute:ord-001-a08-staging-release-preflight': 'node scripts/execute-ord-001-a08-staging-release-preflight.js --execute',
    'execute:ord-001-a08-staging-release-preflight:report': 'node scripts/execute-ord-001-a08-staging-release-preflight.js --execute --write-report'
})
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

matrix_path = Path('config/domain-completion-matrix.json')
matrix = json.loads(matrix_path.read_text(encoding='utf-8'))
matrix['version'] = '1.3.23'
matrix['updatedAt'] = '2026-07-30T08:36:00-03:00'
ord_domain = next((domain for domain in matrix.get('domains', []) if domain.get('id') == 'ORD-001'), None)
if not ord_domain:
    raise SystemExit('ORD-001 missing from matrix')
new_paths = [
    'backend/runtime/staging/runtime-release-contract.js',
    'backend/runtime/staging/node-http-server.js',
    'scripts/execute-ord-001-a08-staging-release-preflight.js',
    'scripts/test-ord-001-a08-staging-release-runtime.js',
    'scripts/audit-ord-001-a08-staging-release-readiness.js',
    'docs/ORD-001-A08-STAGING-RELEASE-READINESS.md',
    'docs/validation/ORD-001-A08-STAGING-RELEASE-READINESS.json',
    '.github/workflows/ord-001-a08-staging-release-readiness.yml'
]
for item in new_paths:
    if item not in ord_domain['requiredPaths']:
        ord_domain['requiredPaths'].append(item)
for item in [
    'audit:ord-001-a08-staging-release-readiness',
    'test:ord-001-a08-staging-release-runtime',
    'execute:ord-001-a08-staging-release-preflight:dry-run'
]:
    if item not in ord_domain['tests']:
        ord_domain['tests'].append(item)
for item in [
    'ORD-A08 found no canonical external deployment provider and deliberately avoided inventing one.',
    'The staging Node runtime now exposes a platform-neutral release identity, SHA-256 fingerprint, rollback readiness and ORD-A07 capability through a no-store health contract.',
    'The release preflight is read-only and limited to GET /health plus OPTIONS /orders; CI runs only local tests, static audit and dry-run.',
    'Production-like environments and targets are rejected independently by runtime startup and preflight target validation.'
]:
    if item not in ord_domain['evidence']:
        ord_domain['evidence'].append(item)
if not any(blocker.get('id') == 'ORD-B05' for blocker in ord_domain['blockers']):
    ord_domain['blockers'].append({
        'id': 'ORD-B05',
        'severity': 'high',
        'category': 'staging_release',
        'description': 'ORD-A08 release identity and read-only preflight are complete, but no external staging release provider or provider-specific rollback command is formally bound and no deployment has been executed.',
        'targetPhase': 'Fase 6'
    })
for action in [
    'Select and formally bind one external staging release provider without changing production.',
    'Define provider-specific release and rollback commands, then inject release ID, Git revision and rollback release ID server-side.',
    'Deploy ORD-A08 through the controlled provider path and execute only the read-only GET/OPTIONS preflight before any authorized visual canary.'
]:
    if action not in ord_domain['nextActions']:
        ord_domain['nextActions'].append(action)
matrix_path.write_text(json.dumps(matrix, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

Path('scripts/reconcile-ord-a08-staging-release-once.py').unlink(missing_ok=True)
print('ORD-A08 staging release reconciliation complete.')
