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
