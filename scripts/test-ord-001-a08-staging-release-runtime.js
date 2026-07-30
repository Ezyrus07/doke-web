#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createNodeHttpServer } = require('../backend/runtime/staging/node-http-server');
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
    assert(Object.isFrozen(report));

    const writtenPath = writeReport(report);
    assert.strictEqual(writtenPath, absoluteReportPath);
    assert(fs.existsSync(absoluteReportPath));
    const writtenReport = JSON.parse(fs.readFileSync(absoluteReportPath, 'utf8'));
    assert.strictEqual(writtenReport.status, report.status);
    assert.strictEqual(writtenReport.mutations, 0);
    assert.strictEqual(runtimeCalls, 0, 'Health and OPTIONS must not invoke the domain runtime.');
    console.log('ORD-A08 staging release runtime test passed.');
  } finally {
    fs.rmSync(absoluteReportPath, { force: true });
    server.close();
  }
});
