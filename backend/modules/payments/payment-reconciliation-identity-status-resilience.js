'use strict';

const { canonicalJson, sha256 } = require('./payment-reconciliation-executor-adapter');
const issuerLifecycle = require('./payment-reconciliation-identity-issuer-lifecycle');

const CONTRACT_VERSION = 'pay-a16-issuer-status-distribution-resilience-v1';
const DISTRIBUTION_MANIFEST_VERSION = 'pay-identity-status-distribution-manifest-v1';
const CACHE_ENTRY_VERSION = 'pay-identity-status-cache-entry-v1';
const CACHE_PROOF_VERSION = 'pay-identity-status-cache-consistency-proof-v1';
const OUTAGE_POLICY_VERSION = 'pay-identity-status-outage-policy-v1';
const HEALTH_SNAPSHOT_VERSION = 'pay-identity-multi-issuer-health-snapshot-v1';
const QUORUM_DECISION_VERSION = 'pay-identity-multi-issuer-quorum-decision-v1';
const DISTRIBUTION_RECEIPT_VERSION = 'pay-identity-status-distribution-receipt-v1';
const DISTRIBUTION_CHAIN_VERSION = 'pay-identity-status-distribution-chain-v1';
const A15_CONTRACT_VERSION = issuerLifecycle.CONTRACT_VERSION;
const MAX_DISTRIBUTION_WINDOW_SECONDS = 900;
const MAX_CACHE_TTL_SECONDS = 60;
const MAX_STALE_WHILE_REVALIDATE_SECONDS = 120;
const MAX_DEGRADED_MODE_SECONDS = 120;
const MINIMUM_REPLICAS = 2;
const MINIMUM_ISSUER_QUORUM = 2;
const DISTRIBUTION_CHANNELS = Object.freeze(['offline_bundle', 'primary', 'secondary']);
const OUTAGE_STATES = Object.freeze(['healthy', 'degraded_read_only', 'fail_closed']);
const QUORUM_DECISIONS = Object.freeze(['healthy_quorum', 'degraded_quorum', 'fail_closed']);
const REMOTE_FIELD_PATTERN = /(url|uri|endpoint|credential|secret|token|password|private.?key|provider.?name|hostname|origin)/iu;
const REMOTE_VALUE_PATTERN = /(https?:\/\/|postgres(?:ql)?:\/\/|supabase\.co|api[_-]?key|bearer\s|sk_live|sk_test)/iu;

function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
function assert(condition, code, message) { if (!condition) fail(code, message); }
function assertExactKeys(value, allowed, code, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), code, label + ' is required.');
  Object.keys(value).forEach((key) => assert(allowed.includes(key), code, label + ' field is not allowlisted: ' + key));
}
function assertHash(value, code, label) { assert(typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value), code, label + ' must be SHA-256.'); }
function assertId(value, code, label) { assert(typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{7,95}$/u.test(value), code, label + ' is invalid.'); }
function parseTime(value, code, label) { const parsed = Date.parse(value); assert(Number.isFinite(parsed), code, label + ' must be a timestamp.'); return parsed; }
function fingerprint(value, field, omitted = []) {
  const body = { ...value };
  delete body[field];
  omitted.forEach((key) => delete body[key]);
  return sha256(canonicalJson(body));
}
function assertNoRemoteMaterial(value, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoRemoteMaterial(item, path + '[' + index + ']'));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      const declaredBoundary = ['containsEndpoints', 'containsCredentials', 'containsPrivateKeyMaterial', 'remoteDistributionConfigured'].includes(key);
      if (declaredBoundary) {
        assert(item === false, 'DOKE_PAY_A16_REMOTE_MATERIAL_DENIED', 'Remote material boundary must remain false at ' + path + '.' + key + '.');
      } else {
        assert(!REMOTE_FIELD_PATTERN.test(key), 'DOKE_PAY_A16_REMOTE_MATERIAL_DENIED', 'Remote material field denied at ' + path + '.' + key + '.');
        assertNoRemoteMaterial(item, path + '.' + key);
      }
    });
    return;
  }
  if (typeof value === 'string') assert(!REMOTE_VALUE_PATTERN.test(value), 'DOKE_PAY_A16_REMOTE_MATERIAL_DENIED', 'Remote material value denied at ' + path + '.');
}
function assertZeroEffects(value, code, label) {
  ['networkRequests', 'databaseConnections', 'subprocesses', 'environmentReads'].forEach((key) => {
    assert(value[key] === 0, code, label + ' effect must be zero: ' + key);
  });
  ['stagingAuthorized', 'productionAllowed', 'remoteExecutionAuthorized', 'remoteDistributionConfigured'].forEach((key) => {
    assert(value[key] === false, code, label + ' authority must remain false: ' + key);
  });
}
function computeDistributionPayloadHash(status) {
  return sha256(canonicalJson({
    verifiedStatusVersion: status.verifiedStatusVersion,
    issuerIdHash: status.issuerIdHash,
    issuerStatus: status.issuerStatus,
    lifecycleEventHash: status.lifecycleEventHash,
    lifecycleSequence: status.lifecycleSequence,
    snapshotFingerprint: status.snapshotFingerprint,
    trustBundleFingerprint: status.trustBundleFingerprint,
    observedAt: status.observedAt,
    validUntil: status.validUntil
  }));
}
function computeDistributionManifestFingerprint(value) { return fingerprint(value, 'manifestFingerprint'); }
function cacheEntryBody(value) {
  const body = { ...value };
  [
    'cacheEntryFingerprint', 'networkRequests', 'databaseConnections', 'subprocesses',
    'environmentReads', 'stagingAuthorized', 'productionAllowed',
    'remoteExecutionAuthorized', 'remoteDistributionConfigured'
  ].forEach((key) => delete body[key]);
  return body;
}
function computeCacheEntryFingerprint(value) { return sha256(canonicalJson(cacheEntryBody(value))); }
function cacheProofBody(value) {
  const body = { ...value };
  [
    'proofFingerprint', 'networkRequests', 'databaseConnections', 'subprocesses',
    'environmentReads', 'stagingAuthorized', 'productionAllowed',
    'remoteExecutionAuthorized', 'remoteDistributionConfigured'
  ].forEach((key) => delete body[key]);
  return body;
}
function computeCacheProofFingerprint(value) { return sha256(canonicalJson(cacheProofBody(value))); }
function outageBody(value) {
  const body = { ...value };
  [
    'policyFingerprint', 'networkRequests', 'databaseConnections', 'subprocesses',
    'environmentReads', 'stagingAuthorized', 'productionAllowed',
    'remoteExecutionAuthorized', 'remoteDistributionConfigured'
  ].forEach((key) => delete body[key]);
  return body;
}
function computeOutagePolicyFingerprint(value) { return sha256(canonicalJson(outageBody(value))); }
function healthBody(value) {
  const body = { ...value };
  [
    'healthFingerprint', 'networkRequests', 'databaseConnections', 'subprocesses',
    'environmentReads', 'stagingAuthorized', 'productionAllowed',
    'remoteExecutionAuthorized', 'remoteDistributionConfigured'
  ].forEach((key) => delete body[key]);
  return body;
}
function computeHealthSnapshotFingerprint(value) { return sha256(canonicalJson(healthBody(value))); }
function quorumBody(value) {
  const body = { ...value };
  [
    'decisionFingerprint', 'networkRequests', 'databaseConnections', 'subprocesses',
    'environmentReads', 'stagingAuthorized', 'productionAllowed',
    'remoteExecutionAuthorized', 'remoteDistributionConfigured'
  ].forEach((key) => delete body[key]);
  return body;
}
function computeQuorumDecisionFingerprint(value) { return sha256(canonicalJson(quorumBody(value))); }
function receiptBody(value) {
  const body = { ...value };
  [
    'receiptHash', 'networkRequests', 'databaseConnections', 'subprocesses',
    'environmentReads', 'stagingAuthorized', 'productionAllowed',
    'remoteExecutionAuthorized', 'remoteDistributionConfigured'
  ].forEach((key) => delete body[key]);
  return body;
}
function computeDistributionReceiptHash(value) { return sha256(canonicalJson(receiptBody(value))); }

function validateVerifiedStatus(status) {
  assert(status && status.verifiedStatusVersion === issuerLifecycle.VERIFIED_STATUS_VERSION, 'DOKE_PAY_A16_VERIFIED_STATUS_REQUIRED', 'Verified PAY-A15 issuer status is required.');
  assertHash(status.issuerIdHash, 'DOKE_PAY_A16_ISSUER_HASH_INVALID', 'Issuer id hash');
  assert(issuerLifecycle.ISSUER_STATUSES.includes(status.issuerStatus), 'DOKE_PAY_A16_ISSUER_STATUS_INVALID', 'Issuer status is invalid.');
  assertHash(status.lifecycleEventHash, 'DOKE_PAY_A16_LIFECYCLE_HASH_INVALID', 'Lifecycle event hash');
  assert(Number.isInteger(status.lifecycleSequence) && status.lifecycleSequence >= 1, 'DOKE_PAY_A16_LIFECYCLE_SEQUENCE_INVALID', 'Lifecycle sequence is invalid.');
  assertHash(status.snapshotFingerprint, 'DOKE_PAY_A16_SNAPSHOT_HASH_INVALID', 'Status snapshot fingerprint');
  assertHash(status.trustBundleFingerprint, 'DOKE_PAY_A16_TRUST_BUNDLE_HASH_INVALID', 'Trust-bundle fingerprint');
  const observedAt = parseTime(status.observedAt, 'DOKE_PAY_A16_STATUS_TIME_INVALID', 'Status observedAt');
  const validUntil = parseTime(status.validUntil, 'DOKE_PAY_A16_STATUS_TIME_INVALID', 'Status validUntil');
  assert(validUntil > observedAt && validUntil - observedAt <= issuerLifecycle.MAX_STATUS_SNAPSHOT_AGE_SECONDS * 1000, 'DOKE_PAY_A16_STATUS_WINDOW_INVALID', 'PAY-A15 status window is invalid.');
  assert(status.verifiedOffline === true, 'DOKE_PAY_A16_STATUS_NOT_OFFLINE_VERIFIED', 'Status must be verified offline.');
  assert(status.productionAllowed === false && status.remoteExecutionAuthorized === false, 'DOKE_PAY_A16_STATUS_AUTHORITY_ESCALATION', 'Status authority must remain repository-only.');
  return status;
}

function createDistributionManifest(input, options = {}) {
  assertExactKeys(input, [
    'manifestId', 'issuerIdHash', 'issuerFamilyHash', 'issuerRecordFingerprint',
    'trustBundleFingerprint', 'sourceSnapshotFingerprint', 'lifecycleEventHash',
    'lifecycleSequence', 'distributionEpoch', 'previousManifestFingerprint',
    'issuedAt', 'expiresAt', 'cacheTtlSeconds', 'staleWhileRevalidateSeconds',
    'channels', 'minimumReplicas', 'payloadHash', 'production',
    'containsEndpoints', 'containsCredentials', 'containsPrivateKeyMaterial'
  ], 'DOKE_PAY_A16_DISTRIBUTION_MANIFEST_INVALID', 'Distribution manifest input');
  assertNoRemoteMaterial(input);
  const status = validateVerifiedStatus(options.verifiedStatus);
  assertId(input.manifestId, 'DOKE_PAY_A16_MANIFEST_ID_INVALID', 'Manifest id');
  assert(input.issuerIdHash === status.issuerIdHash, 'DOKE_PAY_A16_MANIFEST_ISSUER_MISMATCH', 'Manifest issuer mismatch.');
  assertHash(input.issuerFamilyHash, 'DOKE_PAY_A16_ISSUER_FAMILY_HASH_INVALID', 'Issuer family hash');
  assertHash(input.issuerRecordFingerprint, 'DOKE_PAY_A16_ISSUER_RECORD_HASH_INVALID', 'Issuer record fingerprint');
  assert(input.trustBundleFingerprint === status.trustBundleFingerprint, 'DOKE_PAY_A16_MANIFEST_TRUST_BUNDLE_MISMATCH', 'Manifest trust-bundle mismatch.');
  assert(input.sourceSnapshotFingerprint === status.snapshotFingerprint, 'DOKE_PAY_A16_MANIFEST_SNAPSHOT_MISMATCH', 'Manifest snapshot mismatch.');
  assert(input.lifecycleEventHash === status.lifecycleEventHash && input.lifecycleSequence === status.lifecycleSequence, 'DOKE_PAY_A16_MANIFEST_LIFECYCLE_MISMATCH', 'Manifest lifecycle binding mismatch.');
  assert(Number.isInteger(input.distributionEpoch) && input.distributionEpoch >= 1, 'DOKE_PAY_A16_DISTRIBUTION_EPOCH_INVALID', 'Distribution epoch is invalid.');
  const issuedAt = parseTime(input.issuedAt, 'DOKE_PAY_A16_MANIFEST_TIME_INVALID', 'Manifest issuedAt');
  const expiresAt = parseTime(input.expiresAt, 'DOKE_PAY_A16_MANIFEST_TIME_INVALID', 'Manifest expiresAt');
  assert(expiresAt > issuedAt && expiresAt - issuedAt <= MAX_DISTRIBUTION_WINDOW_SECONDS * 1000, 'DOKE_PAY_A16_DISTRIBUTION_WINDOW_INVALID', 'Distribution window is invalid.');
  const statusObservedAt = parseTime(status.observedAt, 'DOKE_PAY_A16_STATUS_TIME_INVALID', 'Status observedAt');
  const statusValidUntil = parseTime(status.validUntil, 'DOKE_PAY_A16_STATUS_TIME_INVALID', 'Status validUntil');
  assert(issuedAt >= statusObservedAt && expiresAt <= statusValidUntil, 'DOKE_PAY_A16_MANIFEST_OUTSIDE_STATUS_WINDOW', 'Manifest must remain inside the verified status window.');
  assert(Number.isInteger(input.cacheTtlSeconds) && input.cacheTtlSeconds >= 1 && input.cacheTtlSeconds <= MAX_CACHE_TTL_SECONDS, 'DOKE_PAY_A16_CACHE_TTL_INVALID', 'Cache TTL is invalid.');
  assert(Number.isInteger(input.staleWhileRevalidateSeconds) && input.staleWhileRevalidateSeconds >= 0 && input.staleWhileRevalidateSeconds <= MAX_STALE_WHILE_REVALIDATE_SECONDS, 'DOKE_PAY_A16_STALE_WINDOW_INVALID', 'Stale-while-revalidate window is invalid.');
  assert((input.cacheTtlSeconds + input.staleWhileRevalidateSeconds) * 1000 <= expiresAt - issuedAt, 'DOKE_PAY_A16_CACHE_WINDOW_EXCEEDS_MANIFEST', 'Cache window exceeds the manifest window.');
  assert(Array.isArray(input.channels) && input.channels.length >= MINIMUM_REPLICAS, 'DOKE_PAY_A16_DISTRIBUTION_CHANNELS_REQUIRED', 'Distribution channels are required.');
  input.channels.forEach((channel) => assert(DISTRIBUTION_CHANNELS.includes(channel), 'DOKE_PAY_A16_DISTRIBUTION_CHANNEL_INVALID', 'Distribution channel is invalid.'));
  assert(new Set(input.channels).size === input.channels.length, 'DOKE_PAY_A16_DUPLICATE_CHANNEL_DENIED', 'Duplicate distribution channel denied.');
  assert(JSON.stringify(input.channels) === JSON.stringify(input.channels.slice().sort()), 'DOKE_PAY_A16_CHANNEL_ORDER_INVALID', 'Distribution channels must be canonically sorted.');
  assert(Number.isInteger(input.minimumReplicas) && input.minimumReplicas >= MINIMUM_REPLICAS && input.minimumReplicas <= input.channels.length, 'DOKE_PAY_A16_MINIMUM_REPLICAS_INVALID', 'Minimum replicas is invalid.');
  assertHash(input.payloadHash, 'DOKE_PAY_A16_PAYLOAD_HASH_INVALID', 'Distribution payload hash');
  assert(input.payloadHash === computeDistributionPayloadHash(status), 'DOKE_PAY_A16_PAYLOAD_HASH_MISMATCH', 'Distribution payload hash mismatch.');
  assert(input.production === false, 'DOKE_PAY_A16_PRODUCTION_MANIFEST_DENIED', 'Production manifest denied.');
  ['containsEndpoints', 'containsCredentials', 'containsPrivateKeyMaterial'].forEach((key) => assert(input[key] === false, 'DOKE_PAY_A16_REMOTE_MATERIAL_DENIED', 'Manifest boundary must remain false: ' + key));
  const previous = options.previousManifest || null;
  if (input.distributionEpoch === 1) {
    assert(previous == null && input.previousManifestFingerprint == null, 'DOKE_PAY_A16_GENESIS_MANIFEST_PREDECESSOR_DENIED', 'Genesis manifest may not reference a predecessor.');
  } else {
    assert(previous && previous.manifestVersion === DISTRIBUTION_MANIFEST_VERSION, 'DOKE_PAY_A16_PREVIOUS_MANIFEST_REQUIRED', 'Previous manifest is required.');
    assert(previous.manifestFingerprint === computeDistributionManifestFingerprint(previous), 'DOKE_PAY_A16_PREVIOUS_MANIFEST_INTEGRITY_FAILED', 'Previous manifest integrity failed.');
    assert(previous.issuerIdHash === input.issuerIdHash && previous.issuerFamilyHash === input.issuerFamilyHash, 'DOKE_PAY_A16_MANIFEST_CHAIN_ISSUER_MISMATCH', 'Manifest chain crossed issuer.');
    assert(previous.distributionEpoch === input.distributionEpoch - 1, 'DOKE_PAY_A16_DISTRIBUTION_EPOCH_GAP', 'Distribution epoch must be contiguous.');
    assert(input.previousManifestFingerprint === previous.manifestFingerprint, 'DOKE_PAY_A16_PREVIOUS_MANIFEST_FINGERPRINT_MISMATCH', 'Previous manifest fingerprint mismatch.');
    assert(input.lifecycleSequence >= previous.lifecycleSequence, 'DOKE_PAY_A16_LIFECYCLE_ROLLBACK_DENIED', 'Lifecycle sequence rollback denied.');
    assert(issuedAt >= parseTime(previous.issuedAt, 'DOKE_PAY_A16_MANIFEST_TIME_INVALID', 'Previous manifest issuedAt'), 'DOKE_PAY_A16_MANIFEST_CLOCK_ROLLBACK_DENIED', 'Manifest clock rollback denied.');
  }
  const body = { manifestVersion: DISTRIBUTION_MANIFEST_VERSION, contractVersion: CONTRACT_VERSION, a15ContractVersion: A15_CONTRACT_VERSION, ...input };
  return Object.freeze({ ...body, manifestFingerprint: sha256(canonicalJson(body)) });
}

function validateDistributionManifest(manifest, verifiedStatus, options = {}) {
  assertExactKeys(manifest, [
    'manifestVersion', 'contractVersion', 'a15ContractVersion', 'manifestId',
    'issuerIdHash', 'issuerFamilyHash', 'issuerRecordFingerprint',
    'trustBundleFingerprint', 'sourceSnapshotFingerprint', 'lifecycleEventHash',
    'lifecycleSequence', 'distributionEpoch', 'previousManifestFingerprint',
    'issuedAt', 'expiresAt', 'cacheTtlSeconds', 'staleWhileRevalidateSeconds',
    'channels', 'minimumReplicas', 'payloadHash', 'production',
    'containsEndpoints', 'containsCredentials', 'containsPrivateKeyMaterial',
    'manifestFingerprint'
  ], 'DOKE_PAY_A16_DISTRIBUTION_MANIFEST_INVALID', 'Distribution manifest');
  assert(manifest.manifestVersion === DISTRIBUTION_MANIFEST_VERSION && manifest.contractVersion === CONTRACT_VERSION && manifest.a15ContractVersion === A15_CONTRACT_VERSION, 'DOKE_PAY_A16_DISTRIBUTION_MANIFEST_VERSION_INVALID', 'Distribution manifest version mismatch.');
  const rebuilt = createDistributionManifest({
    manifestId: manifest.manifestId, issuerIdHash: manifest.issuerIdHash,
    issuerFamilyHash: manifest.issuerFamilyHash,
    issuerRecordFingerprint: manifest.issuerRecordFingerprint,
    trustBundleFingerprint: manifest.trustBundleFingerprint,
    sourceSnapshotFingerprint: manifest.sourceSnapshotFingerprint,
    lifecycleEventHash: manifest.lifecycleEventHash,
    lifecycleSequence: manifest.lifecycleSequence,
    distributionEpoch: manifest.distributionEpoch,
    previousManifestFingerprint: manifest.previousManifestFingerprint,
    issuedAt: manifest.issuedAt, expiresAt: manifest.expiresAt,
    cacheTtlSeconds: manifest.cacheTtlSeconds,
    staleWhileRevalidateSeconds: manifest.staleWhileRevalidateSeconds,
    channels: manifest.channels, minimumReplicas: manifest.minimumReplicas,
    payloadHash: manifest.payloadHash, production: manifest.production,
    containsEndpoints: manifest.containsEndpoints,
    containsCredentials: manifest.containsCredentials,
    containsPrivateKeyMaterial: manifest.containsPrivateKeyMaterial
  }, { verifiedStatus, previousManifest: options.previousManifest || null });
  assert(manifest.manifestFingerprint === rebuilt.manifestFingerprint, 'DOKE_PAY_A16_MANIFEST_FINGERPRINT_MISMATCH', 'Distribution manifest fingerprint mismatch.');
  return manifest;
}

function buildStatusCacheEntry(manifest, options = {}) {
  assert(manifest && manifest.manifestVersion === DISTRIBUTION_MANIFEST_VERSION, 'DOKE_PAY_A16_DISTRIBUTION_MANIFEST_REQUIRED', 'Distribution manifest is required.');
  assertId(options.cacheEntryId, 'DOKE_PAY_A16_CACHE_ENTRY_ID_INVALID', 'Cache-entry id');
  assertHash(options.cacheKeyHash, 'DOKE_PAY_A16_CACHE_KEY_HASH_INVALID', 'Cache-key hash');
  assertHash(options.replicaIdHash, 'DOKE_PAY_A16_REPLICA_HASH_INVALID', 'Replica id hash');
  const cachedAt = options.cachedAt;
  const cachedAtMs = parseTime(cachedAt, 'DOKE_PAY_A16_CACHE_TIME_INVALID', 'cachedAt');
  const issuedAtMs = parseTime(manifest.issuedAt, 'DOKE_PAY_A16_MANIFEST_TIME_INVALID', 'Manifest issuedAt');
  const manifestExpiresAtMs = parseTime(manifest.expiresAt, 'DOKE_PAY_A16_MANIFEST_TIME_INVALID', 'Manifest expiresAt');
  assert(cachedAtMs >= issuedAtMs && cachedAtMs <= manifestExpiresAtMs, 'DOKE_PAY_A16_CACHE_TIME_OUTSIDE_MANIFEST', 'Cache time is outside the manifest window.');
  const expiresAtMs = cachedAtMs + manifest.cacheTtlSeconds * 1000;
  const staleAtMs = expiresAtMs + manifest.staleWhileRevalidateSeconds * 1000;
  assert(staleAtMs <= manifestExpiresAtMs, 'DOKE_PAY_A16_CACHE_WINDOW_EXCEEDS_MANIFEST', 'Cache entry exceeds the manifest window.');
  const body = {
    cacheEntryVersion: CACHE_ENTRY_VERSION,
    cacheEntryId: options.cacheEntryId,
    cacheKeyHash: options.cacheKeyHash,
    replicaIdHash: options.replicaIdHash,
    issuerIdHash: manifest.issuerIdHash,
    issuerFamilyHash: manifest.issuerFamilyHash,
    manifestFingerprint: manifest.manifestFingerprint,
    snapshotFingerprint: manifest.sourceSnapshotFingerprint,
    lifecycleEventHash: manifest.lifecycleEventHash,
    lifecycleSequence: manifest.lifecycleSequence,
    distributionEpoch: manifest.distributionEpoch,
    payloadHash: manifest.payloadHash,
    cachedAt,
    expiresAt: new Date(expiresAtMs).toISOString(),
    staleAt: new Date(staleAtMs).toISOString(),
    immutableCacheEntry: true,
    rawSnapshotStored: false,
    containsEndpoints: false,
    containsCredentials: false,
    production: false
  };
  const result = {
    ...body,
    cacheEntryFingerprint: sha256(canonicalJson(body)),
    networkRequests: 0, databaseConnections: 0, subprocesses: 0, environmentReads: 0,
    stagingAuthorized: false, productionAllowed: false,
    remoteExecutionAuthorized: false, remoteDistributionConfigured: false
  };
  return Object.freeze(result);
}

function validateStatusCacheEntry(entry, manifest, options = {}) {
  assertExactKeys(entry, [
    'cacheEntryVersion', 'cacheEntryId', 'cacheKeyHash', 'replicaIdHash',
    'issuerIdHash', 'issuerFamilyHash', 'manifestFingerprint',
    'snapshotFingerprint', 'lifecycleEventHash', 'lifecycleSequence',
    'distributionEpoch', 'payloadHash', 'cachedAt', 'expiresAt', 'staleAt',
    'immutableCacheEntry', 'rawSnapshotStored', 'containsEndpoints',
    'containsCredentials', 'production', 'cacheEntryFingerprint',
    'networkRequests', 'databaseConnections', 'subprocesses', 'environmentReads',
    'stagingAuthorized', 'productionAllowed', 'remoteExecutionAuthorized',
    'remoteDistributionConfigured'
  ], 'DOKE_PAY_A16_CACHE_ENTRY_INVALID', 'Status cache entry');
  assertNoRemoteMaterial(entry);
  assert(entry.cacheEntryVersion === CACHE_ENTRY_VERSION, 'DOKE_PAY_A16_CACHE_ENTRY_VERSION_INVALID', 'Cache-entry version mismatch.');
  assertId(entry.cacheEntryId, 'DOKE_PAY_A16_CACHE_ENTRY_ID_INVALID', 'Cache-entry id');
  assertHash(entry.cacheKeyHash, 'DOKE_PAY_A16_CACHE_KEY_HASH_INVALID', 'Cache-key hash');
  assertHash(entry.replicaIdHash, 'DOKE_PAY_A16_REPLICA_HASH_INVALID', 'Replica id hash');
  assert(entry.issuerIdHash === manifest.issuerIdHash && entry.issuerFamilyHash === manifest.issuerFamilyHash, 'DOKE_PAY_A16_CACHE_ISSUER_MISMATCH', 'Cache issuer mismatch.');
  assert(entry.manifestFingerprint === manifest.manifestFingerprint, 'DOKE_PAY_A16_CACHE_MANIFEST_MISMATCH', 'Cache manifest mismatch.');
  assert(entry.snapshotFingerprint === manifest.sourceSnapshotFingerprint && entry.lifecycleEventHash === manifest.lifecycleEventHash && entry.lifecycleSequence === manifest.lifecycleSequence, 'DOKE_PAY_A16_CACHE_LIFECYCLE_MISMATCH', 'Cache lifecycle binding mismatch.');
  assert(entry.distributionEpoch === manifest.distributionEpoch, 'DOKE_PAY_A16_CACHE_EPOCH_MISMATCH', 'Cache distribution epoch mismatch.');
  assert(entry.payloadHash === manifest.payloadHash, 'DOKE_PAY_A16_CACHE_PAYLOAD_MISMATCH', 'Cache payload hash mismatch.');
  const cachedAt = parseTime(entry.cachedAt, 'DOKE_PAY_A16_CACHE_TIME_INVALID', 'cachedAt');
  const expiresAt = parseTime(entry.expiresAt, 'DOKE_PAY_A16_CACHE_TIME_INVALID', 'expiresAt');
  const staleAt = parseTime(entry.staleAt, 'DOKE_PAY_A16_CACHE_TIME_INVALID', 'staleAt');
  assert(expiresAt === cachedAt + manifest.cacheTtlSeconds * 1000, 'DOKE_PAY_A16_CACHE_EXPIRY_MISMATCH', 'Cache expiry mismatch.');
  assert(staleAt === expiresAt + manifest.staleWhileRevalidateSeconds * 1000, 'DOKE_PAY_A16_CACHE_STALE_TIME_MISMATCH', 'Cache stale time mismatch.');
  assert(staleAt <= parseTime(manifest.expiresAt, 'DOKE_PAY_A16_MANIFEST_TIME_INVALID', 'Manifest expiresAt'), 'DOKE_PAY_A16_CACHE_WINDOW_EXCEEDS_MANIFEST', 'Cache entry exceeds manifest window.');
  if (options.now) assert(parseTime(options.now, 'DOKE_PAY_A16_NOW_INVALID', 'Cache clock') <= staleAt, 'DOKE_PAY_A16_CACHE_ENTRY_TOO_STALE', 'Cache entry is beyond stale allowance.');
  assert(entry.immutableCacheEntry === true, 'DOKE_PAY_A16_CACHE_IMMUTABILITY_REQUIRED', 'Cache entry must be immutable.');
  ['rawSnapshotStored', 'containsEndpoints', 'containsCredentials', 'production'].forEach((key) => assert(entry[key] === false, 'DOKE_PAY_A16_CACHE_BOUNDARY_VIOLATION', 'Cache boundary must remain false: ' + key));
  assertHash(entry.cacheEntryFingerprint, 'DOKE_PAY_A16_CACHE_ENTRY_FINGERPRINT_INVALID', 'Cache-entry fingerprint');
  assert(entry.cacheEntryFingerprint === computeCacheEntryFingerprint(entry), 'DOKE_PAY_A16_CACHE_ENTRY_FINGERPRINT_MISMATCH', 'Cache-entry fingerprint mismatch.');
  assertZeroEffects(entry, 'DOKE_PAY_A16_CACHE_EFFECT_NONZERO', 'Cache entry');
  return entry;
}

function proveCacheConsistency(entries, manifest, options = {}) {
  assert(Array.isArray(entries) && entries.length >= manifest.minimumReplicas, 'DOKE_PAY_A16_CACHE_REPLICA_QUORUM_MISSING', 'Minimum cache replicas are required.');
  const proofAt = options.proofAt;
  const proofAtMs = parseTime(proofAt, 'DOKE_PAY_A16_PROOF_TIME_INVALID', 'proofAt');
  assert(proofAtMs >= parseTime(manifest.issuedAt, 'DOKE_PAY_A16_MANIFEST_TIME_INVALID', 'Manifest issuedAt') && proofAtMs <= parseTime(manifest.expiresAt, 'DOKE_PAY_A16_MANIFEST_TIME_INVALID', 'Manifest expiresAt'), 'DOKE_PAY_A16_PROOF_OUTSIDE_MANIFEST_WINDOW', 'Proof time is outside the manifest window.');
  const replicaIds = new Set(); const entryFingerprints = new Set();
  let freshReplicaCount = 0; let staleReplicaCount = 0;
  entries.forEach((entry) => {
    validateStatusCacheEntry(entry, manifest);
    assert(!replicaIds.has(entry.replicaIdHash), 'DOKE_PAY_A16_DUPLICATE_REPLICA_DENIED', 'Duplicate cache replica denied.');
    assert(!entryFingerprints.has(entry.cacheEntryFingerprint), 'DOKE_PAY_A16_DUPLICATE_CACHE_ENTRY_DENIED', 'Duplicate cache entry denied.');
    assert(parseTime(entry.cachedAt, 'DOKE_PAY_A16_CACHE_TIME_INVALID', 'cachedAt') <= proofAtMs, 'DOKE_PAY_A16_CACHE_CLOCK_ROLLBACK_DETECTED', 'Cache entry is from the future.');
    const expiresAt = parseTime(entry.expiresAt, 'DOKE_PAY_A16_CACHE_TIME_INVALID', 'expiresAt');
    const staleAt = parseTime(entry.staleAt, 'DOKE_PAY_A16_CACHE_TIME_INVALID', 'staleAt');
    assert(proofAtMs <= staleAt, 'DOKE_PAY_A16_CACHE_ENTRY_TOO_STALE', 'Cache entry is beyond stale allowance.');
    if (proofAtMs <= expiresAt) freshReplicaCount += 1; else staleReplicaCount += 1;
    replicaIds.add(entry.replicaIdHash); entryFingerprints.add(entry.cacheEntryFingerprint);
  });
  const body = {
    cacheProofVersion: CACHE_PROOF_VERSION,
    manifestFingerprint: manifest.manifestFingerprint,
    issuerIdHash: manifest.issuerIdHash,
    issuerFamilyHash: manifest.issuerFamilyHash,
    snapshotFingerprint: manifest.sourceSnapshotFingerprint,
    lifecycleEventHash: manifest.lifecycleEventHash,
    lifecycleSequence: manifest.lifecycleSequence,
    distributionEpoch: manifest.distributionEpoch,
    payloadHash: manifest.payloadHash,
    totalReplicaCount: entries.length,
    freshReplicaCount,
    staleReplicaCount,
    consistentReplicaCount: entries.length,
    replicaEntryFingerprints: Array.from(entryFingerprints).sort(),
    splitBrainDetected: false,
    rollbackDetected: false,
    clockRollbackDetected: false,
    proofAt,
    production: false
  };
  const result = {
    ...body,
    proofFingerprint: sha256(canonicalJson(body)),
    networkRequests: 0, databaseConnections: 0, subprocesses: 0, environmentReads: 0,
    stagingAuthorized: false, productionAllowed: false,
    remoteExecutionAuthorized: false, remoteDistributionConfigured: false
  };
  return Object.freeze(result);
}

function validateCacheConsistencyProof(proof, manifest) {
  assertExactKeys(proof, [
    'cacheProofVersion', 'manifestFingerprint', 'issuerIdHash', 'issuerFamilyHash',
    'snapshotFingerprint', 'lifecycleEventHash', 'lifecycleSequence',
    'distributionEpoch', 'payloadHash', 'totalReplicaCount', 'freshReplicaCount',
    'staleReplicaCount', 'consistentReplicaCount', 'replicaEntryFingerprints',
    'splitBrainDetected', 'rollbackDetected', 'clockRollbackDetected', 'proofAt',
    'production', 'proofFingerprint', 'networkRequests', 'databaseConnections',
    'subprocesses', 'environmentReads', 'stagingAuthorized', 'productionAllowed',
    'remoteExecutionAuthorized', 'remoteDistributionConfigured'
  ], 'DOKE_PAY_A16_CACHE_PROOF_INVALID', 'Cache consistency proof');
  assert(proof.cacheProofVersion === CACHE_PROOF_VERSION, 'DOKE_PAY_A16_CACHE_PROOF_VERSION_INVALID', 'Cache-proof version mismatch.');
  assert(proof.manifestFingerprint === manifest.manifestFingerprint, 'DOKE_PAY_A16_CACHE_PROOF_MANIFEST_MISMATCH', 'Cache-proof manifest mismatch.');
  assert(proof.issuerIdHash === manifest.issuerIdHash && proof.issuerFamilyHash === manifest.issuerFamilyHash, 'DOKE_PAY_A16_CACHE_PROOF_ISSUER_MISMATCH', 'Cache-proof issuer mismatch.');
  assert(proof.snapshotFingerprint === manifest.sourceSnapshotFingerprint && proof.lifecycleEventHash === manifest.lifecycleEventHash && proof.lifecycleSequence === manifest.lifecycleSequence, 'DOKE_PAY_A16_CACHE_PROOF_LIFECYCLE_MISMATCH', 'Cache-proof lifecycle mismatch.');
  assert(proof.distributionEpoch === manifest.distributionEpoch && proof.payloadHash === manifest.payloadHash, 'DOKE_PAY_A16_CACHE_PROOF_EPOCH_PAYLOAD_MISMATCH', 'Cache-proof epoch or payload mismatch.');
  assert(Number.isInteger(proof.totalReplicaCount) && proof.totalReplicaCount >= manifest.minimumReplicas, 'DOKE_PAY_A16_CACHE_REPLICA_QUORUM_MISSING', 'Cache proof lacks required replicas.');
  assert(proof.freshReplicaCount + proof.staleReplicaCount === proof.totalReplicaCount && proof.consistentReplicaCount === proof.totalReplicaCount, 'DOKE_PAY_A16_CACHE_PROOF_COUNT_MISMATCH', 'Cache-proof counts mismatch.');
  assert(Array.isArray(proof.replicaEntryFingerprints) && proof.replicaEntryFingerprints.length === proof.totalReplicaCount, 'DOKE_PAY_A16_CACHE_PROOF_ENTRY_COUNT_MISMATCH', 'Cache-proof entry count mismatch.');
  proof.replicaEntryFingerprints.forEach((value) => assertHash(value, 'DOKE_PAY_A16_CACHE_ENTRY_FINGERPRINT_INVALID', 'Cache-entry fingerprint'));
  assert(new Set(proof.replicaEntryFingerprints).size === proof.replicaEntryFingerprints.length, 'DOKE_PAY_A16_DUPLICATE_CACHE_ENTRY_DENIED', 'Duplicate cache-entry fingerprints denied.');
  assert(JSON.stringify(proof.replicaEntryFingerprints) === JSON.stringify(proof.replicaEntryFingerprints.slice().sort()), 'DOKE_PAY_A16_CACHE_PROOF_ORDER_INVALID', 'Cache-proof entries must be sorted.');
  ['splitBrainDetected', 'rollbackDetected', 'clockRollbackDetected', 'production'].forEach((key) => assert(proof[key] === false, 'DOKE_PAY_A16_CACHE_PROOF_INCONSISTENT', 'Cache proof must fail closed: ' + key));
  parseTime(proof.proofAt, 'DOKE_PAY_A16_PROOF_TIME_INVALID', 'proofAt');
  assertHash(proof.proofFingerprint, 'DOKE_PAY_A16_CACHE_PROOF_FINGERPRINT_INVALID', 'Cache-proof fingerprint');
  assert(proof.proofFingerprint === computeCacheProofFingerprint(proof), 'DOKE_PAY_A16_CACHE_PROOF_FINGERPRINT_MISMATCH', 'Cache-proof fingerprint mismatch.');
  assertZeroEffects(proof, 'DOKE_PAY_A16_CACHE_EFFECT_NONZERO', 'Cache consistency proof');
  return proof;
}

function evaluateOutagePolicy(manifest, proof, verifiedStatus, options = {}) {
  const status = validateVerifiedStatus(verifiedStatus);
  assert(status.issuerIdHash === manifest.issuerIdHash, 'DOKE_PAY_A16_OUTAGE_ISSUER_MISMATCH', 'Outage status issuer mismatch.');
  assertId(options.policyId, 'DOKE_PAY_A16_OUTAGE_POLICY_ID_INVALID', 'Outage-policy id');
  const evaluatedAt = options.evaluatedAt;
  const evaluatedAtMs = parseTime(evaluatedAt, 'DOKE_PAY_A16_OUTAGE_TIME_INVALID', 'evaluatedAt');
  const outageStartedAt = options.outageStartedAt == null ? null : options.outageStartedAt;
  let outageDurationSeconds = 0;
  if (outageStartedAt != null) {
    const outageStartMs = parseTime(outageStartedAt, 'DOKE_PAY_A16_OUTAGE_TIME_INVALID', 'outageStartedAt');
    assert(outageStartMs <= evaluatedAtMs, 'DOKE_PAY_A16_OUTAGE_CLOCK_ROLLBACK_DENIED', 'Outage clock rollback denied.');
    outageDurationSeconds = Math.floor((evaluatedAtMs - outageStartMs) / 1000);
  }
  let state = 'fail_closed'; let reason = 'distribution_unavailable';
  let canInspectCachedEvidence = false; let allowNewCredentialAcceptance = false;
  if (status.issuerStatus !== 'active') {
    state = 'fail_closed'; reason = 'issuer_' + status.issuerStatus;
  } else if (proof) {
    validateCacheConsistencyProof(proof, manifest);
    assert(parseTime(proof.proofAt, 'DOKE_PAY_A16_PROOF_TIME_INVALID', 'proofAt') <= evaluatedAtMs, 'DOKE_PAY_A16_OUTAGE_PROOF_FROM_FUTURE', 'Outage proof is from the future.');
    const manifestExpiresAt = parseTime(manifest.expiresAt, 'DOKE_PAY_A16_MANIFEST_TIME_INVALID', 'Manifest expiresAt');
    if (evaluatedAtMs > manifestExpiresAt) {
      state = 'fail_closed'; reason = 'manifest_expired';
    } else if (proof.freshReplicaCount >= manifest.minimumReplicas) {
      state = 'healthy'; reason = 'fresh_replica_quorum'; canInspectCachedEvidence = true; allowNewCredentialAcceptance = true;
    } else if (proof.consistentReplicaCount >= 1 && proof.staleReplicaCount >= 1 && outageDurationSeconds <= MAX_DEGRADED_MODE_SECONDS) {
      state = 'degraded_read_only'; reason = 'bounded_stale_cache'; canInspectCachedEvidence = true; allowNewCredentialAcceptance = false;
    } else {
      state = 'fail_closed'; reason = outageDurationSeconds > MAX_DEGRADED_MODE_SECONDS ? 'degraded_window_exceeded' : 'fresh_replica_quorum_missing';
    }
  }
  const body = {
    outagePolicyVersion: OUTAGE_POLICY_VERSION,
    policyId: options.policyId,
    issuerIdHash: manifest.issuerIdHash,
    manifestFingerprint: manifest.manifestFingerprint,
    cacheProofFingerprint: proof ? proof.proofFingerprint : null,
    issuerStatus: status.issuerStatus,
    state,
    reason,
    outageStartedAt,
    outageDurationSeconds,
    maximumDegradedModeSeconds: MAX_DEGRADED_MODE_SECONDS,
    canInspectCachedEvidence,
    allowNewCredentialAcceptance,
    failOpen: false,
    automaticRemoteRefresh: false,
    evaluatedAt,
    production: false
  };
  const result = {
    ...body,
    policyFingerprint: sha256(canonicalJson(body)),
    networkRequests: 0, databaseConnections: 0, subprocesses: 0, environmentReads: 0,
    stagingAuthorized: false, productionAllowed: false,
    remoteExecutionAuthorized: false, remoteDistributionConfigured: false
  };
  return Object.freeze(result);
}

function validateOutagePolicyDecision(decision, manifest) {
  assertExactKeys(decision, [
    'outagePolicyVersion', 'policyId', 'issuerIdHash', 'manifestFingerprint',
    'cacheProofFingerprint', 'issuerStatus', 'state', 'reason', 'outageStartedAt',
    'outageDurationSeconds', 'maximumDegradedModeSeconds',
    'canInspectCachedEvidence', 'allowNewCredentialAcceptance', 'failOpen',
    'automaticRemoteRefresh', 'evaluatedAt', 'production', 'policyFingerprint',
    'networkRequests', 'databaseConnections', 'subprocesses', 'environmentReads',
    'stagingAuthorized', 'productionAllowed', 'remoteExecutionAuthorized',
    'remoteDistributionConfigured'
  ], 'DOKE_PAY_A16_OUTAGE_POLICY_INVALID', 'Outage-policy decision');
  assert(decision.outagePolicyVersion === OUTAGE_POLICY_VERSION, 'DOKE_PAY_A16_OUTAGE_POLICY_VERSION_INVALID', 'Outage-policy version mismatch.');
  assert(decision.issuerIdHash === manifest.issuerIdHash && decision.manifestFingerprint === manifest.manifestFingerprint, 'DOKE_PAY_A16_OUTAGE_MANIFEST_MISMATCH', 'Outage-policy manifest mismatch.');
  if (decision.cacheProofFingerprint != null) assertHash(decision.cacheProofFingerprint, 'DOKE_PAY_A16_CACHE_PROOF_FINGERPRINT_INVALID', 'Cache-proof fingerprint');
  assert(issuerLifecycle.ISSUER_STATUSES.includes(decision.issuerStatus), 'DOKE_PAY_A16_ISSUER_STATUS_INVALID', 'Outage issuer status invalid.');
  assert(OUTAGE_STATES.includes(decision.state), 'DOKE_PAY_A16_OUTAGE_STATE_INVALID', 'Outage state invalid.');
  assert(Number.isInteger(decision.outageDurationSeconds) && decision.outageDurationSeconds >= 0, 'DOKE_PAY_A16_OUTAGE_DURATION_INVALID', 'Outage duration invalid.');
  assert(decision.maximumDegradedModeSeconds === MAX_DEGRADED_MODE_SECONDS, 'DOKE_PAY_A16_DEGRADED_LIMIT_DRIFTED', 'Degraded-mode limit drifted.');
  assert(decision.failOpen === false && decision.automaticRemoteRefresh === false && decision.production === false, 'DOKE_PAY_A16_FAIL_OPEN_DENIED', 'Fail-open or remote refresh denied.');
  if (decision.state === 'healthy') assert(decision.allowNewCredentialAcceptance === true && decision.canInspectCachedEvidence === true, 'DOKE_PAY_A16_HEALTHY_POLICY_INVALID', 'Healthy policy is invalid.');
  else assert(decision.allowNewCredentialAcceptance === false, 'DOKE_PAY_A16_DEGRADED_CREDENTIAL_ACCEPTANCE_DENIED', 'New credential acceptance is denied outside healthy mode.');
  if (decision.state === 'fail_closed') assert(decision.canInspectCachedEvidence === false, 'DOKE_PAY_A16_FAIL_CLOSED_INSPECTION_DENIED', 'Fail-closed mode may not expose cached evidence.');
  assertHash(decision.policyFingerprint, 'DOKE_PAY_A16_OUTAGE_POLICY_FINGERPRINT_INVALID', 'Outage-policy fingerprint');
  assert(decision.policyFingerprint === computeOutagePolicyFingerprint(decision), 'DOKE_PAY_A16_OUTAGE_POLICY_FINGERPRINT_MISMATCH', 'Outage-policy fingerprint mismatch.');
  assertZeroEffects(decision, 'DOKE_PAY_A16_OUTAGE_EFFECT_NONZERO', 'Outage-policy decision');
  return decision;
}

function buildIssuerHealthSnapshot(manifest, proof, verifiedStatus, outageDecision, options = {}) {
  validateCacheConsistencyProof(proof, manifest);
  validateOutagePolicyDecision(outageDecision, manifest);
  const status = validateVerifiedStatus(verifiedStatus);
  assert(status.issuerIdHash === manifest.issuerIdHash, 'DOKE_PAY_A16_HEALTH_ISSUER_MISMATCH', 'Health issuer mismatch.');
  assertHash(options.contextFingerprint, 'DOKE_PAY_A16_CONTEXT_FINGERPRINT_INVALID', 'Health context fingerprint');
  const body = {
    healthSnapshotVersion: HEALTH_SNAPSHOT_VERSION,
    issuerIdHash: manifest.issuerIdHash,
    issuerFamilyHash: manifest.issuerFamilyHash,
    contextFingerprint: options.contextFingerprint,
    manifestFingerprint: manifest.manifestFingerprint,
    cacheProofFingerprint: proof.proofFingerprint,
    statusSnapshotFingerprint: status.snapshotFingerprint,
    lifecycleEventHash: status.lifecycleEventHash,
    lifecycleSequence: status.lifecycleSequence,
    distributionEpoch: manifest.distributionEpoch,
    issuerStatus: status.issuerStatus,
    outageState: outageDecision.state,
    healthy: outageDecision.state === 'healthy',
    degraded: outageDecision.state === 'degraded_read_only',
    failClosed: outageDecision.state === 'fail_closed',
    freshReplicaCount: proof.freshReplicaCount,
    staleReplicaCount: proof.staleReplicaCount,
    observedAt: outageDecision.evaluatedAt,
    expiresAt: manifest.expiresAt,
    production: false
  };
  const result = {
    ...body,
    healthFingerprint: sha256(canonicalJson(body)),
    networkRequests: 0, databaseConnections: 0, subprocesses: 0, environmentReads: 0,
    stagingAuthorized: false, productionAllowed: false,
    remoteExecutionAuthorized: false, remoteDistributionConfigured: false
  };
  return Object.freeze(result);
}

function validateIssuerHealthSnapshot(snapshot) {
  assertExactKeys(snapshot, [
    'healthSnapshotVersion', 'issuerIdHash', 'issuerFamilyHash',
    'contextFingerprint', 'manifestFingerprint', 'cacheProofFingerprint',
    'statusSnapshotFingerprint', 'lifecycleEventHash', 'lifecycleSequence',
    'distributionEpoch', 'issuerStatus', 'outageState', 'healthy', 'degraded',
    'failClosed', 'freshReplicaCount', 'staleReplicaCount', 'observedAt',
    'expiresAt', 'production', 'healthFingerprint', 'networkRequests',
    'databaseConnections', 'subprocesses', 'environmentReads',
    'stagingAuthorized', 'productionAllowed', 'remoteExecutionAuthorized',
    'remoteDistributionConfigured'
  ], 'DOKE_PAY_A16_HEALTH_SNAPSHOT_INVALID', 'Issuer health snapshot');
  assert(snapshot.healthSnapshotVersion === HEALTH_SNAPSHOT_VERSION, 'DOKE_PAY_A16_HEALTH_SNAPSHOT_VERSION_INVALID', 'Health-snapshot version mismatch.');
  ['issuerIdHash', 'issuerFamilyHash', 'contextFingerprint', 'manifestFingerprint', 'cacheProofFingerprint', 'statusSnapshotFingerprint', 'lifecycleEventHash'].forEach((key) => assertHash(snapshot[key], 'DOKE_PAY_A16_HEALTH_HASH_INVALID', key));
  assert(Number.isInteger(snapshot.lifecycleSequence) && snapshot.lifecycleSequence >= 1 && Number.isInteger(snapshot.distributionEpoch) && snapshot.distributionEpoch >= 1, 'DOKE_PAY_A16_HEALTH_SEQUENCE_INVALID', 'Health sequence or epoch invalid.');
  assert(issuerLifecycle.ISSUER_STATUSES.includes(snapshot.issuerStatus) && OUTAGE_STATES.includes(snapshot.outageState), 'DOKE_PAY_A16_HEALTH_STATE_INVALID', 'Health state invalid.');
  assert(Number(snapshot.healthy) + Number(snapshot.degraded) + Number(snapshot.failClosed) === 1, 'DOKE_PAY_A16_HEALTH_FLAGS_INVALID', 'Exactly one health flag is required.');
  assert(snapshot.healthy === (snapshot.outageState === 'healthy') && snapshot.degraded === (snapshot.outageState === 'degraded_read_only') && snapshot.failClosed === (snapshot.outageState === 'fail_closed'), 'DOKE_PAY_A16_HEALTH_FLAGS_MISMATCH', 'Health flags mismatch.');
  assert(Number.isInteger(snapshot.freshReplicaCount) && snapshot.freshReplicaCount >= 0 && Number.isInteger(snapshot.staleReplicaCount) && snapshot.staleReplicaCount >= 0, 'DOKE_PAY_A16_HEALTH_REPLICA_COUNT_INVALID', 'Health replica count invalid.');
  parseTime(snapshot.observedAt, 'DOKE_PAY_A16_HEALTH_TIME_INVALID', 'Health observedAt');
  parseTime(snapshot.expiresAt, 'DOKE_PAY_A16_HEALTH_TIME_INVALID', 'Health expiresAt');
  assert(snapshot.production === false, 'DOKE_PAY_A16_PRODUCTION_HEALTH_DENIED', 'Production health snapshot denied.');
  assertHash(snapshot.healthFingerprint, 'DOKE_PAY_A16_HEALTH_FINGERPRINT_INVALID', 'Health fingerprint');
  assert(snapshot.healthFingerprint === computeHealthSnapshotFingerprint(snapshot), 'DOKE_PAY_A16_HEALTH_FINGERPRINT_MISMATCH', 'Health fingerprint mismatch.');
  assertZeroEffects(snapshot, 'DOKE_PAY_A16_HEALTH_EFFECT_NONZERO', 'Health snapshot');
  return snapshot;
}

function aggregateMultiIssuerQuorum(snapshots, options = {}) {
  assert(Array.isArray(snapshots) && snapshots.length >= MINIMUM_ISSUER_QUORUM && snapshots.length <= 20, 'DOKE_PAY_A16_ISSUER_QUORUM_INVENTORY_INVALID', 'Multi-issuer health inventory is invalid.');
  const minimumIssuerCount = options.minimumIssuerCount == null ? MINIMUM_ISSUER_QUORUM : options.minimumIssuerCount;
  const minimumHealthyIssuers = options.minimumHealthyIssuers == null ? MINIMUM_ISSUER_QUORUM : options.minimumHealthyIssuers;
  assert(Number.isInteger(minimumIssuerCount) && minimumIssuerCount >= MINIMUM_ISSUER_QUORUM && Number.isInteger(minimumHealthyIssuers) && minimumHealthyIssuers >= 1 && minimumHealthyIssuers <= minimumIssuerCount, 'DOKE_PAY_A16_QUORUM_POLICY_INVALID', 'Quorum policy is invalid.');
  snapshots.forEach(validateIssuerHealthSnapshot);
  const issuerIds = snapshots.map((item) => item.issuerIdHash);
  const issuerFamilies = snapshots.map((item) => item.issuerFamilyHash);
  const healthFingerprints = snapshots.map((item) => item.healthFingerprint);
  assert(new Set(issuerIds).size === issuerIds.length, 'DOKE_PAY_A16_DUPLICATE_ISSUER_DENIED', 'Duplicate issuer denied.');
  assert(new Set(issuerFamilies).size === issuerFamilies.length, 'DOKE_PAY_A16_DUPLICATE_ISSUER_FAMILY_DENIED', 'Duplicate issuer family denied.');
  assert(new Set(healthFingerprints).size === healthFingerprints.length, 'DOKE_PAY_A16_DUPLICATE_HEALTH_SNAPSHOT_DENIED', 'Duplicate health snapshot denied.');
  const contextFingerprint = snapshots[0].contextFingerprint;
  assert(snapshots.every((item) => item.contextFingerprint === contextFingerprint), 'DOKE_PAY_A16_QUORUM_CONTEXT_MISMATCH', 'Quorum context mismatch.');
  const healthyIssuerCount = snapshots.filter((item) => item.healthy).length;
  const degradedIssuerCount = snapshots.filter((item) => item.degraded).length;
  const failClosedIssuerCount = snapshots.filter((item) => item.failClosed).length;
  const unsafeStatusPresent = snapshots.some((item) => item.issuerStatus !== 'active');
  let decision = 'fail_closed'; let reason = 'issuer_quorum_missing';
  let quorumSatisfied = false; let allowNewCredentialAcceptance = false;
  if (unsafeStatusPresent || failClosedIssuerCount > 0) {
    decision = 'fail_closed'; reason = unsafeStatusPresent ? 'unsafe_issuer_status_present' : 'issuer_fail_closed_present';
  } else if (snapshots.length >= minimumIssuerCount && healthyIssuerCount >= minimumHealthyIssuers) {
    decision = 'healthy_quorum'; reason = 'independent_healthy_issuer_quorum'; quorumSatisfied = true; allowNewCredentialAcceptance = true;
  } else if (snapshots.length >= minimumIssuerCount && healthyIssuerCount >= 1 && healthyIssuerCount + degradedIssuerCount >= minimumIssuerCount) {
    decision = 'degraded_quorum'; reason = 'bounded_degraded_issuer_quorum'; quorumSatisfied = false; allowNewCredentialAcceptance = false;
  }
  const evaluatedAt = options.evaluatedAt;
  parseTime(evaluatedAt, 'DOKE_PAY_A16_QUORUM_TIME_INVALID', 'Quorum evaluatedAt');
  const body = {
    quorumDecisionVersion: QUORUM_DECISION_VERSION,
    contextFingerprint,
    minimumIssuerCount,
    minimumHealthyIssuers,
    evaluatedIssuerCount: snapshots.length,
    healthyIssuerCount,
    degradedIssuerCount,
    failClosedIssuerCount,
    issuerHealthFingerprints: healthFingerprints.slice().sort(),
    decision,
    reason,
    quorumSatisfied,
    allowNewCredentialAcceptance,
    failOpen: false,
    healthGateOnly: true,
    automaticallyAcceptCredential: false,
    evaluatedAt,
    production: false
  };
  const result = {
    ...body,
    decisionFingerprint: sha256(canonicalJson(body)),
    networkRequests: 0, databaseConnections: 0, subprocesses: 0, environmentReads: 0,
    stagingAuthorized: false, productionAllowed: false,
    remoteExecutionAuthorized: false, remoteDistributionConfigured: false
  };
  return Object.freeze(result);
}

function validateMultiIssuerQuorumDecision(decision) {
  assertExactKeys(decision, [
    'quorumDecisionVersion', 'contextFingerprint', 'minimumIssuerCount',
    'minimumHealthyIssuers', 'evaluatedIssuerCount', 'healthyIssuerCount',
    'degradedIssuerCount', 'failClosedIssuerCount', 'issuerHealthFingerprints',
    'decision', 'reason', 'quorumSatisfied', 'allowNewCredentialAcceptance',
    'failOpen', 'healthGateOnly', 'automaticallyAcceptCredential', 'evaluatedAt',
    'production', 'decisionFingerprint', 'networkRequests', 'databaseConnections',
    'subprocesses', 'environmentReads', 'stagingAuthorized', 'productionAllowed',
    'remoteExecutionAuthorized', 'remoteDistributionConfigured'
  ], 'DOKE_PAY_A16_QUORUM_DECISION_INVALID', 'Multi-issuer quorum decision');
  assert(decision.quorumDecisionVersion === QUORUM_DECISION_VERSION, 'DOKE_PAY_A16_QUORUM_DECISION_VERSION_INVALID', 'Quorum-decision version mismatch.');
  assertHash(decision.contextFingerprint, 'DOKE_PAY_A16_CONTEXT_FINGERPRINT_INVALID', 'Quorum context fingerprint');
  assert(Number.isInteger(decision.minimumIssuerCount) && decision.minimumIssuerCount >= MINIMUM_ISSUER_QUORUM, 'DOKE_PAY_A16_QUORUM_POLICY_INVALID', 'Minimum issuer count invalid.');
  assert(Number.isInteger(decision.minimumHealthyIssuers) && decision.minimumHealthyIssuers >= 1 && decision.minimumHealthyIssuers <= decision.minimumIssuerCount, 'DOKE_PAY_A16_QUORUM_POLICY_INVALID', 'Minimum healthy issuer count invalid.');
  assert(decision.healthyIssuerCount + decision.degradedIssuerCount + decision.failClosedIssuerCount === decision.evaluatedIssuerCount, 'DOKE_PAY_A16_QUORUM_COUNT_MISMATCH', 'Quorum counts mismatch.');
  assert(Array.isArray(decision.issuerHealthFingerprints) && decision.issuerHealthFingerprints.length === decision.evaluatedIssuerCount, 'DOKE_PAY_A16_QUORUM_HEALTH_INVENTORY_MISMATCH', 'Quorum health inventory mismatch.');
  decision.issuerHealthFingerprints.forEach((value) => assertHash(value, 'DOKE_PAY_A16_HEALTH_FINGERPRINT_INVALID', 'Health fingerprint'));
  assert(new Set(decision.issuerHealthFingerprints).size === decision.issuerHealthFingerprints.length, 'DOKE_PAY_A16_DUPLICATE_HEALTH_SNAPSHOT_DENIED', 'Duplicate health snapshots denied.');
  assert(JSON.stringify(decision.issuerHealthFingerprints) === JSON.stringify(decision.issuerHealthFingerprints.slice().sort()), 'DOKE_PAY_A16_QUORUM_HEALTH_ORDER_INVALID', 'Quorum health fingerprints must be sorted.');
  assert(QUORUM_DECISIONS.includes(decision.decision), 'DOKE_PAY_A16_QUORUM_DECISION_STATE_INVALID', 'Quorum decision state invalid.');
  assert(decision.failOpen === false && decision.healthGateOnly === true && decision.automaticallyAcceptCredential === false && decision.production === false, 'DOKE_PAY_A16_QUORUM_AUTHORITY_ESCALATION', 'Quorum authority boundary violated.');
  if (decision.decision === 'healthy_quorum') assert(decision.quorumSatisfied === true && decision.allowNewCredentialAcceptance === true, 'DOKE_PAY_A16_HEALTHY_QUORUM_INVALID', 'Healthy quorum invalid.');
  else assert(decision.quorumSatisfied === false && decision.allowNewCredentialAcceptance === false, 'DOKE_PAY_A16_NON_HEALTHY_QUORUM_ACCEPTANCE_DENIED', 'Non-healthy quorum may not allow credential acceptance.');
  parseTime(decision.evaluatedAt, 'DOKE_PAY_A16_QUORUM_TIME_INVALID', 'Quorum evaluatedAt');
  assertHash(decision.decisionFingerprint, 'DOKE_PAY_A16_QUORUM_DECISION_FINGERPRINT_INVALID', 'Quorum decision fingerprint');
  assert(decision.decisionFingerprint === computeQuorumDecisionFingerprint(decision), 'DOKE_PAY_A16_QUORUM_DECISION_FINGERPRINT_MISMATCH', 'Quorum-decision fingerprint mismatch.');
  assertZeroEffects(decision, 'DOKE_PAY_A16_QUORUM_EFFECT_NONZERO', 'Quorum decision');
  return decision;
}

function createDistributionReceipt(manifest, proof, outageDecision, options = {}) {
  validateCacheConsistencyProof(proof, manifest);
  validateOutagePolicyDecision(outageDecision, manifest);
  const sequence = options.sequence;
  assert(Number.isInteger(sequence) && sequence >= 1, 'DOKE_PAY_A16_RECEIPT_SEQUENCE_INVALID', 'Distribution receipt sequence invalid.');
  const previous = options.previousReceipt || null;
  if (sequence === 1) assert(previous == null, 'DOKE_PAY_A16_GENESIS_RECEIPT_PREDECESSOR_DENIED', 'Genesis receipt may not reference a predecessor.');
  else {
    assert(previous && previous.receiptVersion === DISTRIBUTION_RECEIPT_VERSION, 'DOKE_PAY_A16_PREVIOUS_RECEIPT_REQUIRED', 'Previous distribution receipt required.');
    assert(previous.receiptHash === computeDistributionReceiptHash(previous), 'DOKE_PAY_A16_PREVIOUS_RECEIPT_INTEGRITY_FAILED', 'Previous distribution receipt integrity failed.');
    assert(previous.sequence === sequence - 1, 'DOKE_PAY_A16_RECEIPT_SEQUENCE_GAP', 'Distribution receipt sequence gap.');
    assert(previous.issuerIdHash === manifest.issuerIdHash, 'DOKE_PAY_A16_RECEIPT_ISSUER_MISMATCH', 'Distribution receipt chain crossed issuer.');
  }
  const acceptedAt = options.acceptedAt;
  const acceptedAtMs = parseTime(acceptedAt, 'DOKE_PAY_A16_RECEIPT_TIME_INVALID', 'acceptedAt');
  assert(acceptedAtMs >= parseTime(proof.proofAt, 'DOKE_PAY_A16_PROOF_TIME_INVALID', 'proofAt'), 'DOKE_PAY_A16_RECEIPT_CLOCK_ROLLBACK_DENIED', 'Distribution receipt clock rollback denied.');
  const body = {
    receiptVersion: DISTRIBUTION_RECEIPT_VERSION,
    chainVersion: DISTRIBUTION_CHAIN_VERSION,
    sequence,
    previousReceiptHash: previous ? previous.receiptHash : null,
    issuerIdHash: manifest.issuerIdHash,
    manifestFingerprint: manifest.manifestFingerprint,
    cacheProofFingerprint: proof.proofFingerprint,
    outagePolicyFingerprint: outageDecision.policyFingerprint,
    distributionEpoch: manifest.distributionEpoch,
    lifecycleSequence: manifest.lifecycleSequence,
    outageState: outageDecision.state,
    acceptedAt,
    production: false
  };
  const receipt = {
    ...body,
    receiptHash: sha256(canonicalJson(body)),
    networkRequests: 0, databaseConnections: 0, subprocesses: 0, environmentReads: 0,
    stagingAuthorized: false, productionAllowed: false,
    remoteExecutionAuthorized: false, remoteDistributionConfigured: false
  };
  const ledger = options.receiptLedger || new Set();
  assert(!ledger.has(receipt.receiptHash), 'DOKE_PAY_A16_DISTRIBUTION_RECEIPT_REPLAYED', 'Distribution receipt replay denied.');
  const heads = options.chainHeadByIssuer || new Map();
  const current = heads.get(manifest.issuerIdHash);
  if (sequence === 1) assert(current == null, 'DOKE_PAY_A16_DISTRIBUTION_CHAIN_ALREADY_INITIALIZED', 'Distribution receipt chain already initialized.');
  else assert(current === previous.receiptHash, 'DOKE_PAY_A16_DISTRIBUTION_RECEIPT_FORK_DENIED', 'Distribution receipt fork denied.');
  ledger.add(receipt.receiptHash); heads.set(manifest.issuerIdHash, receipt.receiptHash);
  return Object.freeze(receipt);
}

function validateDistributionReceiptChain(receipts) {
  assert(Array.isArray(receipts) && receipts.length > 0, 'DOKE_PAY_A16_DISTRIBUTION_RECEIPT_CHAIN_REQUIRED', 'Distribution receipt chain is required.');
  const issuerIdHash = receipts[0].issuerIdHash; const seen = new Set(); let previousHash = null;
  receipts.forEach((receipt, index) => {
    assert(receipt.receiptVersion === DISTRIBUTION_RECEIPT_VERSION && receipt.chainVersion === DISTRIBUTION_CHAIN_VERSION, 'DOKE_PAY_A16_DISTRIBUTION_RECEIPT_VERSION_INVALID', 'Distribution receipt version mismatch.');
    assert(receipt.sequence === index + 1, 'DOKE_PAY_A16_RECEIPT_SEQUENCE_GAP', 'Distribution receipt sequence gap.');
    assert(receipt.issuerIdHash === issuerIdHash, 'DOKE_PAY_A16_RECEIPT_ISSUER_MISMATCH', 'Distribution receipt chain crossed issuer.');
    assert(receipt.previousReceiptHash === previousHash, 'DOKE_PAY_A16_PREVIOUS_RECEIPT_HASH_MISMATCH', 'Distribution receipt predecessor mismatch.');
    assert(receipt.receiptHash === computeDistributionReceiptHash(receipt), 'DOKE_PAY_A16_DISTRIBUTION_RECEIPT_INTEGRITY_FAILED', 'Distribution receipt integrity failed.');
    assert(!seen.has(receipt.receiptHash), 'DOKE_PAY_A16_DISTRIBUTION_RECEIPT_REPLAYED', 'Distribution receipt replay denied.');
    assertZeroEffects(receipt, 'DOKE_PAY_A16_RECEIPT_EFFECT_NONZERO', 'Distribution receipt');
    assert(receipt.production === false, 'DOKE_PAY_A16_PRODUCTION_RECEIPT_DENIED', 'Production distribution receipt denied.');
    seen.add(receipt.receiptHash); previousHash = receipt.receiptHash;
  });
  return Object.freeze({
    chainVersion: DISTRIBUTION_CHAIN_VERSION,
    issuerIdHash,
    receiptCount: receipts.length,
    genesisReceiptHash: receipts[0].receiptHash,
    headReceiptHash: receipts[receipts.length - 1].receiptHash,
    contiguous: true, immutable: true, forkFree: true, replayFree: true,
    networkRequests: 0, databaseConnections: 0,
    productionAllowed: false, remoteExecutionAuthorized: false
  });
}

module.exports = Object.freeze({
  CONTRACT_VERSION, DISTRIBUTION_MANIFEST_VERSION, CACHE_ENTRY_VERSION,
  CACHE_PROOF_VERSION, OUTAGE_POLICY_VERSION, HEALTH_SNAPSHOT_VERSION,
  QUORUM_DECISION_VERSION, DISTRIBUTION_RECEIPT_VERSION,
  DISTRIBUTION_CHAIN_VERSION, A15_CONTRACT_VERSION,
  MAX_DISTRIBUTION_WINDOW_SECONDS, MAX_CACHE_TTL_SECONDS,
  MAX_STALE_WHILE_REVALIDATE_SECONDS, MAX_DEGRADED_MODE_SECONDS,
  MINIMUM_REPLICAS, MINIMUM_ISSUER_QUORUM, DISTRIBUTION_CHANNELS,
  OUTAGE_STATES, QUORUM_DECISIONS, computeDistributionPayloadHash,
  computeDistributionManifestFingerprint, computeCacheEntryFingerprint,
  computeCacheProofFingerprint, computeOutagePolicyFingerprint,
  computeHealthSnapshotFingerprint, computeQuorumDecisionFingerprint,
  computeDistributionReceiptHash, createDistributionManifest,
  validateDistributionManifest, buildStatusCacheEntry,
  validateStatusCacheEntry, proveCacheConsistency,
  validateCacheConsistencyProof, evaluateOutagePolicy,
  validateOutagePolicyDecision, buildIssuerHealthSnapshot,
  validateIssuerHealthSnapshot, aggregateMultiIssuerQuorum,
  validateMultiIssuerQuorumDecision, createDistributionReceipt,
  validateDistributionReceiptChain
});
