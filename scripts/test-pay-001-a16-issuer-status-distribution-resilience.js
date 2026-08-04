'use strict';
const fs = require('node:fs');
const path = require('node:path');
const contract = require('../backend/modules/payments/payment-reconciliation-identity-status-resilience');
const { sha256 } = require('../backend/modules/payments/payment-reconciliation-executor-adapter');
const h = (value) => sha256(String(value));
const FIXED_NOW = '2026-08-04T12:00:00.000Z';
const status = (suffix = 'a', state = 'active', sequence = 1) => Object.freeze({
  verifiedStatusVersion: 'pay-verified-identity-issuer-status-v1',
  issuerIdHash: h('issuer-' + suffix), issuerStatus: state,
  lifecycleEventHash: h('event-' + suffix + '-' + sequence), lifecycleSequence: sequence,
  snapshotFingerprint: h('snapshot-' + suffix + '-' + sequence),
  trustBundleFingerprint: h('trust-' + suffix),
  observedAt: '2026-08-04T11:59:00.000Z', validUntil: '2026-08-04T12:14:00.000Z',
  verifiedOffline: true, productionAllowed: false, remoteExecutionAuthorized: false
});
function manifestInput(s, suffix = 'a', epoch = 1, previous = null) {
  return {
    manifestId: 'manifest-' + suffix + '-' + epoch,
    issuerIdHash: s.issuerIdHash, issuerFamilyHash: h('family-' + suffix),
    issuerRecordFingerprint: h('record-' + suffix), trustBundleFingerprint: s.trustBundleFingerprint,
    sourceSnapshotFingerprint: s.snapshotFingerprint, lifecycleEventHash: s.lifecycleEventHash,
    lifecycleSequence: s.lifecycleSequence, distributionEpoch: epoch,
    previousManifestFingerprint: previous ? previous.manifestFingerprint : null,
    issuedAt: epoch === 1 ? '2026-08-04T12:00:00.000Z' : '2026-08-04T12:01:00.000Z',
    expiresAt: epoch === 1 ? '2026-08-04T12:10:00.000Z' : '2026-08-04T12:11:00.000Z',
    cacheTtlSeconds: 60, staleWhileRevalidateSeconds: 120,
    channels: ['offline_bundle', 'primary', 'secondary'], minimumReplicas: 2,
    payloadHash: contract.computeDistributionPayloadHash(s), production: false,
    containsEndpoints: false, containsCredentials: false, containsPrivateKeyMaterial: false
  };
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
let passed = 0; const positiveIds = []; const negativeIds = [];
function pass(id, fn) { fn(); passed++; positiveIds.push(id); }
function expectError(id, code, fn) {
  let caught = null; try { fn(); } catch (error) { caught = error; }
  if (!caught || caught.code !== code) throw new Error(id + ': expected ' + code + ', got ' + (caught && caught.code) + ' / ' + (caught && caught.message));
  passed++; negativeIds.push(id);
}

const s1 = status('a');
const m1 = contract.createDistributionManifest(manifestInput(s1), { verifiedStatus: s1 });
const s2 = status('a', 'active', 2);
const m2 = contract.createDistributionManifest(manifestInput(s2, 'a', 2, m1), { verifiedStatus: s2, previousManifest: m1 });
const e1 = contract.buildStatusCacheEntry(m1, { cacheEntryId: 'cache-entry-a-0001', cacheKeyHash: h('cache-key-a'), replicaIdHash: h('replica-a1'), cachedAt: FIXED_NOW });
const e2 = contract.buildStatusCacheEntry(m1, { cacheEntryId: 'cache-entry-a-0002', cacheKeyHash: h('cache-key-a'), replicaIdHash: h('replica-a2'), cachedAt: FIXED_NOW });
const pFresh = contract.proveCacheConsistency([e1, e2], m1, { proofAt: '2026-08-04T12:00:30.000Z' });
const pStale = contract.proveCacheConsistency([e1, e2], m1, { proofAt: '2026-08-04T12:01:30.000Z' });
const healthy = contract.evaluateOutagePolicy(m1, pFresh, s1, { policyId: 'outage-policy-a-0001', evaluatedAt: '2026-08-04T12:00:35.000Z', outageStartedAt: null });
const degraded = contract.evaluateOutagePolicy(m1, pStale, s1, { policyId: 'outage-policy-a-0002', evaluatedAt: '2026-08-04T12:01:35.000Z', outageStartedAt: '2026-08-04T12:01:00.000Z' });
const context = h('request-context');
const healthA = contract.buildIssuerHealthSnapshot(m1, pFresh, s1, healthy, { contextFingerprint: context });
const sb = status('b');
const mb = contract.createDistributionManifest(manifestInput(sb, 'b'), { verifiedStatus: sb });
const eb1 = contract.buildStatusCacheEntry(mb, { cacheEntryId: 'cache-entry-b-0001', cacheKeyHash: h('cache-key-b'), replicaIdHash: h('replica-b1'), cachedAt: FIXED_NOW });
const eb2 = contract.buildStatusCacheEntry(mb, { cacheEntryId: 'cache-entry-b-0002', cacheKeyHash: h('cache-key-b'), replicaIdHash: h('replica-b2'), cachedAt: FIXED_NOW });
const pb = contract.proveCacheConsistency([eb1, eb2], mb, { proofAt: '2026-08-04T12:00:30.000Z' });
const healthyB = contract.evaluateOutagePolicy(mb, pb, sb, { policyId: 'outage-policy-b-0001', evaluatedAt: '2026-08-04T12:00:35.000Z', outageStartedAt: null });
const healthB = contract.buildIssuerHealthSnapshot(mb, pb, sb, healthyB, { contextFingerprint: context });
const quorum = contract.aggregateMultiIssuerQuorum([healthA, healthB], { evaluatedAt: '2026-08-04T12:00:40.000Z' });
const ledger = new Set(); const heads = new Map();
const r1 = contract.createDistributionReceipt(m1, pFresh, healthy, { sequence: 1, acceptedAt: '2026-08-04T12:00:40.000Z', receiptLedger: ledger, chainHeadByIssuer: heads });
const e21 = contract.buildStatusCacheEntry(m2, { cacheEntryId: 'cache-entry-a-0003', cacheKeyHash: h('cache-key-a'), replicaIdHash: h('replica-a1'), cachedAt: '2026-08-04T12:01:00.000Z' });
const e22 = contract.buildStatusCacheEntry(m2, { cacheEntryId: 'cache-entry-a-0004', cacheKeyHash: h('cache-key-a'), replicaIdHash: h('replica-a2'), cachedAt: '2026-08-04T12:01:00.000Z' });
const p2 = contract.proveCacheConsistency([e21, e22], m2, { proofAt: '2026-08-04T12:01:30.000Z' });
const h2 = contract.evaluateOutagePolicy(m2, p2, s2, { policyId: 'outage-policy-a-0003', evaluatedAt: '2026-08-04T12:01:35.000Z', outageStartedAt: null });
const r2 = contract.createDistributionReceipt(m2, p2, h2, { sequence: 2, previousReceipt: r1, acceptedAt: '2026-08-04T12:01:40.000Z', receiptLedger: ledger, chainHeadByIssuer: heads });

pass('positive_manifest_genesis', () => contract.validateDistributionManifest(m1, s1));
pass('positive_manifest_rotation', () => contract.validateDistributionManifest(m2, s2, { previousManifest: m1 }));
pass('positive_cache_entry', () => contract.validateStatusCacheEntry(e1, m1));
pass('positive_cache_consistency', () => contract.validateCacheConsistencyProof(pFresh, m1));
pass('positive_outage_healthy', () => { contract.validateOutagePolicyDecision(healthy, m1); if (healthy.state !== 'healthy') throw new Error('healthy state missing'); });
pass('positive_outage_degraded_read_only', () => { contract.validateOutagePolicyDecision(degraded, m1); if (degraded.allowNewCredentialAcceptance) throw new Error('degraded accepted credential'); });
pass('positive_health_snapshot', () => contract.validateIssuerHealthSnapshot(healthA));
pass('positive_multi_issuer_quorum', () => { contract.validateMultiIssuerQuorumDecision(quorum); if (quorum.decision !== 'healthy_quorum') throw new Error('healthy quorum missing'); });
pass('positive_receipt_genesis', () => { if (r1.sequence !== 1) throw new Error('bad genesis'); });
pass('positive_receipt_chain', () => contract.validateDistributionReceiptChain([r1, r2]));

// Manifest negatives (20)
const manifestNegatives = [
  ['manifest_unknown_field','DOKE_PAY_A16_DISTRIBUTION_MANIFEST_INVALID', (x) => { x.endpointUrl = 'x'; }],
  ['manifest_remote_url','DOKE_PAY_A16_REMOTE_MATERIAL_DENIED', (x) => { x.manifestId = 'https://remote.example'; }],
  ['manifest_bad_id','DOKE_PAY_A16_MANIFEST_ID_INVALID', (x) => { x.manifestId = 'bad'; }],
  ['manifest_issuer_mismatch','DOKE_PAY_A16_MANIFEST_ISSUER_MISMATCH', (x) => { x.issuerIdHash = h('other'); }],
  ['manifest_family_hash','DOKE_PAY_A16_ISSUER_FAMILY_HASH_INVALID', (x) => { x.issuerFamilyHash = 'bad'; }],
  ['manifest_record_hash','DOKE_PAY_A16_ISSUER_RECORD_HASH_INVALID', (x) => { x.issuerRecordFingerprint = 'bad'; }],
  ['manifest_trust_mismatch','DOKE_PAY_A16_MANIFEST_TRUST_BUNDLE_MISMATCH', (x) => { x.trustBundleFingerprint = h('other'); }],
  ['manifest_snapshot_mismatch','DOKE_PAY_A16_MANIFEST_SNAPSHOT_MISMATCH', (x) => { x.sourceSnapshotFingerprint = h('other'); }],
  ['manifest_lifecycle_mismatch','DOKE_PAY_A16_MANIFEST_LIFECYCLE_MISMATCH', (x) => { x.lifecycleSequence = 2; }],
  ['manifest_epoch_invalid','DOKE_PAY_A16_DISTRIBUTION_EPOCH_INVALID', (x) => { x.distributionEpoch = 0; }],
  ['manifest_window_too_long','DOKE_PAY_A16_DISTRIBUTION_WINDOW_INVALID', (x) => { x.expiresAt = '2026-08-04T12:20:00.000Z'; }],
  ['manifest_outside_status','DOKE_PAY_A16_MANIFEST_OUTSIDE_STATUS_WINDOW', (x) => { x.issuedAt = '2026-08-04T11:58:00.000Z'; }],
  ['manifest_ttl_invalid','DOKE_PAY_A16_CACHE_TTL_INVALID', (x) => { x.cacheTtlSeconds = 61; }],
  ['manifest_stale_invalid','DOKE_PAY_A16_STALE_WINDOW_INVALID', (x) => { x.staleWhileRevalidateSeconds = 121; }],
  ['manifest_channels_missing','DOKE_PAY_A16_DISTRIBUTION_CHANNELS_REQUIRED', (x) => { x.channels = ['primary']; x.minimumReplicas = 1; }],
  ['manifest_channel_invalid','DOKE_PAY_A16_DISTRIBUTION_CHANNEL_INVALID', (x) => { x.channels = ['offline_bundle','unknown']; }],
  ['manifest_duplicate_channel','DOKE_PAY_A16_DUPLICATE_CHANNEL_DENIED', (x) => { x.channels = ['primary','primary']; }],
  ['manifest_channel_order','DOKE_PAY_A16_CHANNEL_ORDER_INVALID', (x) => { x.channels = ['primary','offline_bundle']; }],
  ['manifest_replicas_invalid','DOKE_PAY_A16_MINIMUM_REPLICAS_INVALID', (x) => { x.minimumReplicas = 4; }],
  ['manifest_production_denied','DOKE_PAY_A16_PRODUCTION_MANIFEST_DENIED', (x) => { x.production = true; }]
];
manifestNegatives.forEach(([id, code, mutate]) => expectError(id, code, () => { const x = manifestInput(s1); mutate(x); contract.createDistributionManifest(x, { verifiedStatus: s1 }); }));

// Manifest chain negatives (7)
expectError('manifest_payload_mismatch','DOKE_PAY_A16_PAYLOAD_HASH_MISMATCH', () => { const x=manifestInput(s1); x.payloadHash=h('bad'); contract.createDistributionManifest(x,{verifiedStatus:s1}); });
expectError('manifest_genesis_predecessor','DOKE_PAY_A16_GENESIS_MANIFEST_PREDECESSOR_DENIED', () => { const x=manifestInput(s1); x.previousManifestFingerprint=h('prev'); contract.createDistributionManifest(x,{verifiedStatus:s1}); });
expectError('manifest_previous_required','DOKE_PAY_A16_PREVIOUS_MANIFEST_REQUIRED', () => { const x=manifestInput(s2,'a',2,m1); contract.createDistributionManifest(x,{verifiedStatus:s2}); });
expectError('manifest_epoch_gap','DOKE_PAY_A16_DISTRIBUTION_EPOCH_GAP', () => { const x=manifestInput(s2,'a',3,m1); contract.createDistributionManifest(x,{verifiedStatus:s2,previousManifest:m1}); });
expectError('manifest_previous_fingerprint','DOKE_PAY_A16_PREVIOUS_MANIFEST_FINGERPRINT_MISMATCH', () => { const x=manifestInput(s2,'a',2,m1); x.previousManifestFingerprint=h('bad'); contract.createDistributionManifest(x,{verifiedStatus:s2,previousManifest:m1}); });
expectError('manifest_lifecycle_rollback','DOKE_PAY_A16_LIFECYCLE_ROLLBACK_DENIED', () => { const rollback=status('a','active',1); const x=manifestInput(rollback,'a',3,m2); contract.createDistributionManifest(x,{verifiedStatus:rollback,previousManifest:m2}); });
expectError('manifest_fingerprint_tamper','DOKE_PAY_A16_MANIFEST_FINGERPRINT_MISMATCH', () => { const x=clone(m1); x.manifestFingerprint=h('bad'); contract.validateDistributionManifest(x,s1); });

// Cache/proof negatives (15)
expectError('cache_bad_id','DOKE_PAY_A16_CACHE_ENTRY_ID_INVALID', () => contract.buildStatusCacheEntry(m1,{cacheEntryId:'bad',cacheKeyHash:h('k'),replicaIdHash:h('r'),cachedAt:FIXED_NOW}));
expectError('cache_bad_key','DOKE_PAY_A16_CACHE_KEY_HASH_INVALID', () => contract.buildStatusCacheEntry(m1,{cacheEntryId:'cache-entry-x-0001',cacheKeyHash:'bad',replicaIdHash:h('r'),cachedAt:FIXED_NOW}));
expectError('cache_bad_replica','DOKE_PAY_A16_REPLICA_HASH_INVALID', () => contract.buildStatusCacheEntry(m1,{cacheEntryId:'cache-entry-x-0001',cacheKeyHash:h('k'),replicaIdHash:'bad',cachedAt:FIXED_NOW}));
expectError('cache_outside_manifest','DOKE_PAY_A16_CACHE_TIME_OUTSIDE_MANIFEST', () => contract.buildStatusCacheEntry(m1,{cacheEntryId:'cache-entry-x-0001',cacheKeyHash:h('k'),replicaIdHash:h('r'),cachedAt:'2026-08-04T11:59:59.000Z'}));
expectError('cache_manifest_mismatch','DOKE_PAY_A16_CACHE_MANIFEST_MISMATCH', () => { const x=clone(e1); x.manifestFingerprint=h('bad'); x.cacheEntryFingerprint=contract.computeCacheEntryFingerprint(x); contract.validateStatusCacheEntry(x,m1); });
expectError('cache_lifecycle_mismatch','DOKE_PAY_A16_CACHE_LIFECYCLE_MISMATCH', () => { const x=clone(e1); x.lifecycleSequence=9; x.cacheEntryFingerprint=contract.computeCacheEntryFingerprint(x); contract.validateStatusCacheEntry(x,m1); });
expectError('cache_epoch_mismatch','DOKE_PAY_A16_CACHE_EPOCH_MISMATCH', () => { const x=clone(e1); x.distributionEpoch=9; x.cacheEntryFingerprint=contract.computeCacheEntryFingerprint(x); contract.validateStatusCacheEntry(x,m1); });
expectError('cache_payload_mismatch','DOKE_PAY_A16_CACHE_PAYLOAD_MISMATCH', () => { const x=clone(e1); x.payloadHash=h('bad'); x.cacheEntryFingerprint=contract.computeCacheEntryFingerprint(x); contract.validateStatusCacheEntry(x,m1); });
expectError('cache_expiry_mismatch','DOKE_PAY_A16_CACHE_EXPIRY_MISMATCH', () => { const x=clone(e1); x.expiresAt='2026-08-04T12:02:00.000Z'; x.cacheEntryFingerprint=contract.computeCacheEntryFingerprint(x); contract.validateStatusCacheEntry(x,m1); });
expectError('cache_fingerprint_tamper','DOKE_PAY_A16_CACHE_ENTRY_FINGERPRINT_MISMATCH', () => { const x=clone(e1); x.cacheEntryFingerprint=h('bad'); contract.validateStatusCacheEntry(x,m1); });
expectError('proof_quorum_missing','DOKE_PAY_A16_CACHE_REPLICA_QUORUM_MISSING', () => contract.proveCacheConsistency([e1],m1,{proofAt:'2026-08-04T12:00:30.000Z'}));
expectError('proof_duplicate_replica','DOKE_PAY_A16_DUPLICATE_REPLICA_DENIED', () => { const x=clone(e2); x.replicaIdHash=e1.replicaIdHash; x.cacheEntryFingerprint=contract.computeCacheEntryFingerprint(x); contract.proveCacheConsistency([e1,x],m1,{proofAt:'2026-08-04T12:00:30.000Z'}); });
expectError('proof_future_cache','DOKE_PAY_A16_CACHE_CLOCK_ROLLBACK_DETECTED', () => { const f1=contract.buildStatusCacheEntry(m1,{cacheEntryId:'cache-entry-f-0001',cacheKeyHash:h('cache-key-f'),replicaIdHash:h('replica-f1'),cachedAt:'2026-08-04T12:00:30.000Z'}); const f2=contract.buildStatusCacheEntry(m1,{cacheEntryId:'cache-entry-f-0002',cacheKeyHash:h('cache-key-f'),replicaIdHash:h('replica-f2'),cachedAt:'2026-08-04T12:00:30.000Z'}); contract.proveCacheConsistency([f1,f2],m1,{proofAt:'2026-08-04T12:00:20.000Z'}); });
expectError('proof_too_stale','DOKE_PAY_A16_CACHE_ENTRY_TOO_STALE', () => contract.proveCacheConsistency([e1,e2],m1,{proofAt:'2026-08-04T12:03:01.000Z'}));
expectError('proof_fingerprint_tamper','DOKE_PAY_A16_CACHE_PROOF_FINGERPRINT_MISMATCH', () => { const x=clone(pFresh); x.proofFingerprint=h('bad'); contract.validateCacheConsistencyProof(x,m1); });

// Outage negatives (8)
expectError('outage_bad_policy_id','DOKE_PAY_A16_OUTAGE_POLICY_ID_INVALID', () => contract.evaluateOutagePolicy(m1,pFresh,s1,{policyId:'bad',evaluatedAt:FIXED_NOW,outageStartedAt:null}));
expectError('outage_issuer_mismatch','DOKE_PAY_A16_OUTAGE_ISSUER_MISMATCH', () => contract.evaluateOutagePolicy(m1,pFresh,sb,{policyId:'outage-policy-x-0001',evaluatedAt:FIXED_NOW,outageStartedAt:null}));
expectError('outage_clock_rollback','DOKE_PAY_A16_OUTAGE_CLOCK_ROLLBACK_DENIED', () => contract.evaluateOutagePolicy(m1,pFresh,s1,{policyId:'outage-policy-x-0001',evaluatedAt:FIXED_NOW,outageStartedAt:'2026-08-04T12:01:00.000Z'}));
expectError('outage_proof_future','DOKE_PAY_A16_OUTAGE_PROOF_FROM_FUTURE', () => contract.evaluateOutagePolicy(m1,pFresh,s1,{policyId:'outage-policy-x-0001',evaluatedAt:'2026-08-04T12:00:20.000Z',outageStartedAt:null}));
expectError('outage_fail_open','DOKE_PAY_A16_FAIL_OPEN_DENIED', () => { const x=clone(healthy); x.failOpen=true; x.policyFingerprint=contract.computeOutagePolicyFingerprint(x); contract.validateOutagePolicyDecision(x,m1); });
expectError('outage_remote_refresh','DOKE_PAY_A16_FAIL_OPEN_DENIED', () => { const x=clone(healthy); x.automaticRemoteRefresh=true; x.policyFingerprint=contract.computeOutagePolicyFingerprint(x); contract.validateOutagePolicyDecision(x,m1); });
expectError('outage_degraded_acceptance','DOKE_PAY_A16_DEGRADED_CREDENTIAL_ACCEPTANCE_DENIED', () => { const x=clone(degraded); x.allowNewCredentialAcceptance=true; x.policyFingerprint=contract.computeOutagePolicyFingerprint(x); contract.validateOutagePolicyDecision(x,m1); });
expectError('outage_fingerprint_tamper','DOKE_PAY_A16_OUTAGE_POLICY_FINGERPRINT_MISMATCH', () => { const x=clone(healthy); x.policyFingerprint=h('bad'); contract.validateOutagePolicyDecision(x,m1); });

// Health/quorum negatives (8)
expectError('health_context_bad','DOKE_PAY_A16_CONTEXT_FINGERPRINT_INVALID', () => contract.buildIssuerHealthSnapshot(m1,pFresh,s1,healthy,{contextFingerprint:'bad'}));
expectError('health_flags_invalid','DOKE_PAY_A16_HEALTH_FLAGS_INVALID', () => { const x=clone(healthA); x.degraded=true; x.healthFingerprint=contract.computeHealthSnapshotFingerprint(x); contract.validateIssuerHealthSnapshot(x); });
expectError('health_fingerprint_tamper','DOKE_PAY_A16_HEALTH_FINGERPRINT_MISMATCH', () => { const x=clone(healthA); x.healthFingerprint=h('bad'); contract.validateIssuerHealthSnapshot(x); });
expectError('quorum_inventory_short','DOKE_PAY_A16_ISSUER_QUORUM_INVENTORY_INVALID', () => contract.aggregateMultiIssuerQuorum([healthA],{evaluatedAt:FIXED_NOW}));
expectError('quorum_duplicate_issuer','DOKE_PAY_A16_DUPLICATE_ISSUER_DENIED', () => { const x=clone(healthB); x.issuerIdHash=healthA.issuerIdHash; x.healthFingerprint=contract.computeHealthSnapshotFingerprint(x); contract.aggregateMultiIssuerQuorum([healthA,x],{evaluatedAt:FIXED_NOW}); });
expectError('quorum_duplicate_family','DOKE_PAY_A16_DUPLICATE_ISSUER_FAMILY_DENIED', () => { const x=clone(healthB); x.issuerFamilyHash=healthA.issuerFamilyHash; x.healthFingerprint=contract.computeHealthSnapshotFingerprint(x); contract.aggregateMultiIssuerQuorum([healthA,x],{evaluatedAt:FIXED_NOW}); });
expectError('quorum_context_mismatch','DOKE_PAY_A16_QUORUM_CONTEXT_MISMATCH', () => { const x=clone(healthB); x.contextFingerprint=h('other-context'); x.healthFingerprint=contract.computeHealthSnapshotFingerprint(x); contract.aggregateMultiIssuerQuorum([healthA,x],{evaluatedAt:FIXED_NOW}); });
expectError('quorum_fingerprint_tamper','DOKE_PAY_A16_QUORUM_DECISION_FINGERPRINT_MISMATCH', () => { const x=clone(quorum); x.decisionFingerprint=h('bad'); contract.validateMultiIssuerQuorumDecision(x); });

// Receipt negatives (4)
expectError('receipt_sequence_invalid','DOKE_PAY_A16_RECEIPT_SEQUENCE_INVALID', () => contract.createDistributionReceipt(m1,pFresh,healthy,{sequence:0,acceptedAt:FIXED_NOW}));
expectError('receipt_genesis_predecessor','DOKE_PAY_A16_GENESIS_RECEIPT_PREDECESSOR_DENIED', () => contract.createDistributionReceipt(m1,pFresh,healthy,{sequence:1,previousReceipt:r1,acceptedAt:FIXED_NOW}));
expectError('receipt_sequence_gap','DOKE_PAY_A16_RECEIPT_SEQUENCE_GAP', () => contract.createDistributionReceipt(m2,p2,h2,{sequence:3,previousReceipt:r1,acceptedAt:'2026-08-04T12:01:40.000Z'}));
expectError('receipt_chain_tamper','DOKE_PAY_A16_DISTRIBUTION_RECEIPT_INTEGRITY_FAILED', () => { const x=clone(r2); x.outageState='fail_closed'; contract.validateDistributionReceiptChain([r1,x]); });

const fixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../tests/fixtures/pay-a16-issuer-status-distribution-resilience-cases.json'), 'utf8'));
if (fixture.contractVersion !== contract.CONTRACT_VERSION || fixture.totalCases !== 72 || fixture.positiveCases.length !== 10 || fixture.negativeCases.length !== 62) throw new Error('Fixture inventory mismatch.');
if (JSON.stringify(fixture.positiveCases.map((item) => item.id)) !== JSON.stringify(positiveIds)) throw new Error('Positive fixture ids drifted.');
if (JSON.stringify(fixture.negativeCases.map((item) => item.id)) !== JSON.stringify(negativeIds)) throw new Error('Negative fixture ids drifted.');
if (positiveIds.length !== 10 || negativeIds.length !== 62 || passed !== 72) throw new Error('Conformance inventory mismatch: ' + JSON.stringify({passed,positive:positiveIds.length,negative:negativeIds.length}));
console.log(JSON.stringify({ contractVersion: contract.CONTRACT_VERSION, totalCases: passed, positiveCases: positiveIds.length, negativeCases: negativeIds.length, passedCases: passed, networkRequests: 0, databaseConnections: 0, subprocesses: 0, environmentReads: 0 }));
