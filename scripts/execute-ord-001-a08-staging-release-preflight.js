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
  const output = process.argv.includes('--write-report')
    ? Object.freeze({ ...report, reportPath: writeReport(report) })
    : report;
  console.log(JSON.stringify(output, null, 2));
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
