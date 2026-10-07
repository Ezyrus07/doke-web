#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const nodeHttpModule = require('../backend/runtime/staging/node-http-server');
const { createNodeHttpServer } = nodeHttpModule;
const { createRuntimeReleaseDescriptor, RELEASE_CONTRACT_VERSION } = require('../backend/runtime/staging/runtime-release-contract');
const {
  REPORT_PATH,
  createPreflightConfig,
  executePreflight,
  writeReport
} = require('./execute-ord-001-a08-staging-release-preflight');

const releaseId = 'ord-a08-test-release-01';
const rollbackReleaseId = 'ord-a08-test-rollback-00';
const releaseSha = 'abcdef1234567890abcdef1234567890abcdef12';
const allowedOrigin = 'https://staging-web.example';
const rejectedOrigin = 'https://untrusted.example';
let runtimeCalls = 0;

function createResponseCapture() {
  const headers = new Map();
  return {
    statusCode: 0,
    body: '',
    setHeader(name, value) { headers.set(String(name).toLowerCase(), value); },
    hasHeader(name) { return headers.has(String(name).toLowerCase()); },
    getHeader(name) { return headers.get(String(name).toLowerCase()); },
    end(value) { this.body = value === undefined ? '' : String(value); },
    headers
  };
}

assert.strictEqual(typeof nodeHttpModule, 'function', 'The staging runtime must export a deployable HTTP handler.');

assert.throws(
  () => createNodeHttpServer({ env: { DOKE_ENVIRONMENT: 'production' }, runtime: { handle: async () => ({ status: 200, body: {} }) } }),
  (error) => error && error.code === 'DOKE_PRODUCTION_RUNTIME_BLOCKED'
);
const unbound = createRuntimeReleaseDescriptor({ DOKE_ENVIRONMENT: 'staging' });
assert.strictEqual(unbound.readyForTraffic, false);
assert(unbound.blockers.includes('release_id_missing'));
assert(unbound.blockers.includes('rollback_release_id_missing'));

const matchingVercel = createRuntimeReleaseDescriptor({
  DOKE_ENVIRONMENT: 'staging',
  DOKE_ENABLE_STAGING_API: '1',
  DOKE_STAGING_RELEASE_ID: releaseId,
  DOKE_STAGING_RELEASE_SHA: releaseSha,
  DOKE_STAGING_ROLLBACK_RELEASE_ID: rollbackReleaseId,
  VERCEL: '1',
  VERCEL_ENV: 'preview',
  VERCEL_GIT_COMMIT_SHA: releaseSha
});
assert.strictEqual(matchingVercel.readyForTraffic, true);
assert.strictEqual(matchingVercel.deploymentIdentity.provider, 'vercel');
assert.strictEqual(matchingVercel.deploymentIdentity.source, 'VERCEL_GIT_COMMIT_SHA');
assert.strictEqual(matchingVercel.deploymentIdentity.deploymentRevision, releaseSha);
assert.strictEqual(matchingVercel.deploymentIdentity.verified, true);
assert.strictEqual(matchingVercel.rollbackReady, true);

const mismatchedVercel = createRuntimeReleaseDescriptor({
  DOKE_ENVIRONMENT: 'staging',
  DOKE_ENABLE_STAGING_API: '1',
  DOKE_STAGING_RELEASE_ID: releaseId,
  DOKE_STAGING_RELEASE_SHA: releaseSha,
  DOKE_STAGING_ROLLBACK_RELEASE_ID: rollbackReleaseId,
  VERCEL: '1',
  VERCEL_ENV: 'preview',
  VERCEL_GIT_COMMIT_SHA: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
});
assert.strictEqual(mismatchedVercel.readyForTraffic, false);
assert.strictEqual(mismatchedVercel.deploymentIdentity.verified, false);
assert(mismatchedVercel.blockers.includes('release_revision_deployment_mismatch'));
assert.strictEqual(mismatchedVercel.rollbackReady, true);

const missingVercelCommit = createRuntimeReleaseDescriptor({
  DOKE_ENVIRONMENT: 'staging',
  DOKE_ENABLE_STAGING_API: '1',
  DOKE_STAGING_RELEASE_ID: releaseId,
  DOKE_STAGING_RELEASE_SHA: releaseSha,
  DOKE_STAGING_ROLLBACK_RELEASE_ID: rollbackReleaseId,
  VERCEL: '1',
  VERCEL_ENV: 'preview'
});
assert.strictEqual(missingVercelCommit.readyForTraffic, false);
assert.strictEqual(missingVercelCommit.deploymentIdentity.verified, false);
assert(missingVercelCommit.blockers.includes('vercel_git_commit_sha_missing'));
assert.strictEqual(missingVercelCommit.rollbackReady, true);

const server = createNodeHttpServer({
  env: {
    DOKE_ENVIRONMENT: 'staging',
    DOKE_ENABLE_STAGING_API: '1',
    DOKE_STAGING_RELEASE_ID: releaseId,
    DOKE_STAGING_RELEASE_SHA: releaseSha,
    DOKE_STAGING_ROLLBACK_RELEASE_ID: rollbackReleaseId,
    DOKE_ALLOWED_ORIGINS: allowedOrigin,
    VERCEL: '1',
    VERCEL_ENV: 'preview',
    VERCEL_GIT_COMMIT_SHA: releaseSha
  },
  runtime: {
    async handle() {
      runtimeCalls += 1;
      return { status: 500, body: { unexpected: true } };
    }
  }
});

server.listen(0, '127.0.0.1', async () => {
  const absoluteReportPath = path.resolve(REPORT_PATH);
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
    assert.strictEqual(healthBody.release.deploymentIdentity.deploymentRevision, releaseSha);
    assert.strictEqual(healthBody.release.deploymentIdentity.verified, true);
    assert.strictEqual(healthBody.release.readyForTraffic, true);
    assert.strictEqual(healthBody.release.rollbackReady, true);
    assert.strictEqual(healthBody.release.productionAllowed, false);
    assert.strictEqual(healthBody.capabilities.requestFreshness.maximumAgeSeconds, 300);

    const allowedPreflight = await fetch(baseUrl + '/orders', {
      method: 'OPTIONS',
      headers: { Origin: allowedOrigin }
    });
    assert.strictEqual(allowedPreflight.status, 204);
    assert.strictEqual(allowedPreflight.headers.get('access-control-allow-origin'), allowedOrigin);
    assert.strictEqual(allowedPreflight.headers.get('access-control-allow-credentials'), 'true');
    assert(allowedPreflight.headers.get('access-control-expose-headers').includes('x-doke-runtime-release-fingerprint'));

    const rejectedPreflight = await fetch(baseUrl + '/orders', {
      method: 'OPTIONS',
      headers: { Origin: rejectedOrigin }
    });
    assert.strictEqual(rejectedPreflight.status, 403);
    assert.strictEqual(rejectedPreflight.headers.get('access-control-allow-origin'), null);
    const rejectedBody = await rejectedPreflight.json();
    assert.strictEqual(rejectedBody.error.code, 'DOKE_CORS_ORIGIN_FORBIDDEN');

    let mismatchRuntimeCalls = 0;
    const mismatchHandler = nodeHttpModule.createNodeRequestHandler({
      env: {
        DOKE_ENVIRONMENT: 'staging',
        DOKE_ENABLE_STAGING_API: '1',
        DOKE_STAGING_RELEASE_ID: releaseId,
        DOKE_STAGING_RELEASE_SHA: releaseSha,
        DOKE_STAGING_ROLLBACK_RELEASE_ID: rollbackReleaseId,
        DOKE_ALLOWED_ORIGINS: allowedOrigin,
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        VERCEL_GIT_COMMIT_SHA: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      },
      runtime: {
        async handle() {
          mismatchRuntimeCalls += 1;
          return { status: 200, body: { shouldNotRun: true } };
        }
      }
    });
    const mismatchResponse = createResponseCapture();
    await mismatchHandler({ method: 'GET', url: '/orders', headers: {} }, mismatchResponse);
    assert.strictEqual(mismatchResponse.statusCode, 503);
    const mismatchBody = JSON.parse(mismatchResponse.body);
    assert.strictEqual(mismatchBody.error.code, 'DOKE_STAGING_RELEASE_IDENTITY_MISMATCH');
    assert.strictEqual(mismatchBody.release.deploymentIdentity.verified, false);
    assert.strictEqual(mismatchRuntimeCalls, 0, 'Identity mismatch must fail closed before domain runtime execution.');

    const config = createPreflightConfig({
      DOKE_ENVIRONMENT: 'staging',
      DOKE_ORD_A08_STAGING_API_URL: baseUrl,
      DOKE_ORD_A08_RELEASE_ID: releaseId,
      DOKE_ORD_A08_RELEASE_SHA: releaseSha,
      DOKE_ORD_A08_ROLLBACK_RELEASE_ID: rollbackReleaseId,
      DOKE_ORD_A08_ALLOWED_ORIGIN: allowedOrigin,
      DOKE_ORD_A08_TARGET_MARKER: 'local',
      DOKE_ORD_A08_ALLOW_NETWORK: '1'
    });
    const report = await executePreflight(config, { fetchImpl: fetch });
    assert.strictEqual(report.status, 'staging_release_read_only_preflight_passed');
    assert.strictEqual(report.networkRequests, 2);
    assert.strictEqual(report.mutations, 0);
    assert(Object.isFrozen(report));

    const writtenPath = writeReport(report);
    assert.strictEqual(writtenPath, absoluteReportPath);
    assert(fs.existsSync(absoluteReportPath));
    const writtenReport = JSON.parse(fs.readFileSync(absoluteReportPath, 'utf8'));
    assert.strictEqual(writtenReport.status, report.status);
    assert.strictEqual(writtenReport.mutations, 0);
    assert.strictEqual(runtimeCalls, 0, 'Health and allowed/rejected OPTIONS must not invoke the domain runtime.');
    console.log('ORD-A08 staging release runtime test passed.');
  } finally {
    fs.rmSync(absoluteReportPath, { force: true });
    server.close();
  }
});
