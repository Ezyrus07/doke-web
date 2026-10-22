#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { createRuntimeReleaseDescriptor } = require('../backend/runtime/staging/runtime-release-contract');
const {
  createPreflightConfig,
  executePreflight
} = require('./execute-ord-001-a08-staging-release-preflight');

const releaseId = 'ord-a08-staging-release-999';
const rollbackId = 'ord-a08-rollback-release-998';
const revision = '66b0fc04262cacd76a014212db729d75a31b6c91';
const descriptor = createRuntimeReleaseDescriptor({
  DOKE_ENVIRONMENT: 'staging',
  DOKE_ENABLE_STAGING_API: '1',
  DOKE_STAGING_RELEASE_ID: releaseId,
  DOKE_STAGING_RELEASE_SHA: revision,
  DOKE_STAGING_ROLLBACK_RELEASE_ID: rollbackId
});
assert.equal(descriptor.readyForTraffic, true);

const config = createPreflightConfig({
  DOKE_ENVIRONMENT: 'staging',
  DOKE_ORD_A08_STAGING_API_URL: 'https://staging.example.invalid',
  DOKE_ORD_A08_RELEASE_ID: releaseId,
  DOKE_ORD_A08_RELEASE_SHA: revision,
  DOKE_ORD_A08_ROLLBACK_RELEASE_ID: rollbackId,
  DOKE_ORD_A08_ALLOWED_ORIGIN: 'https://preview.example.invalid',
  DOKE_ORD_A08_ALLOW_NETWORK: '1'
});
const readHeader = (values) => ({ get: (name) => values[name.toLowerCase()] || null });

function fixture(overrides = {}) {
  let requests = 0;
  const release = { ...descriptor, ...(overrides.release || {}) };
  const responseFingerprint = overrides.headerFingerprint || descriptor.fingerprint;
  async function fetchImpl(url) {
    requests++;
    if (url.endsWith('/health')) {
      return {
        ok: true,
        status: 200,
        headers: readHeader({
          'x-doke-runtime-contract': descriptor.contractVersion,
          'x-doke-runtime-release-fingerprint': responseFingerprint
        }),
        json: async () => ({
          release,
          capabilities: { requestFreshness: descriptor.requestFreshness }
        })
      };
    }
    if (url.endsWith('/orders')) {
      return {
        ok: true,
        status: 204,
        headers: readHeader({
          'access-control-allow-headers': 'x-idempotency-key,x-doke-request-issued-at,x-doke-request-nonce'
        })
      };
    }
    throw new Error('Unexpected URL in offline fixture: ' + url);
  }
  return { fetchImpl, getRequests: () => requests };
}

async function run() {
  const valid = fixture();
  const report = await executePreflight(config, { fetchImpl: valid.fetchImpl });
  assert.equal(report.status, 'staging_release_read_only_preflight_passed');
  assert.equal(report.runtimeFingerprint, descriptor.fingerprint);
  assert.equal(report.networkRequests, 2);
  assert.equal(report.mutations, 0);
  assert.equal(valid.getRequests(), 2);

  const headerMismatch = fixture({ headerFingerprint: 'f'.repeat(64) });
  await assert.rejects(
    executePreflight(config, { fetchImpl: headerMismatch.fetchImpl }),
    (error) => error.code === 'DOKE_ORD_A08_CONTRACT_MISMATCH'
      && /fingerprint header/.test(error.message)
  );
  assert.equal(headerMismatch.getRequests(), 1, 'Stop before CORS when header fingerprint mismatches');

  const bodyMismatch = fixture({ release: { fingerprint: '0'.repeat(64) } });
  await assert.rejects(
    executePreflight(config, { fetchImpl: bodyMismatch.fetchImpl }),
    (error) => error.code === 'DOKE_ORD_A08_CONTRACT_MISMATCH'
      && /health release fingerprint/.test(error.message)
  );
  assert.equal(bodyMismatch.getRequests(), 1, 'Stop before CORS when health fingerprint mismatches');

  const revisionMismatch = fixture({ release: { revision: 'deadbee' } });
  await assert.rejects(
    executePreflight(config, { fetchImpl: revisionMismatch.fetchImpl }),
    (error) => error.code === 'DOKE_ORD_A08_CONTRACT_MISMATCH'
      && /health release revision/.test(error.message)
  );
  assert.equal(revisionMismatch.getRequests(), 1);

  console.log('ORD-A08 preflight fingerprint binding PASS: 4 synthetic cases, zero external requests.');
}

run().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
