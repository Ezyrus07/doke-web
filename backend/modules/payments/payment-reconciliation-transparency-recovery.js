'use strict';

const { canonicalJson, sha256 } = require('./payment-reconciliation-executor-adapter');
const distribution = require('./payment-reconciliation-identity-status-resilience');

const CONTRACT_VERSION = 'pay-a17-transparency-recovery-incident-handoff-v1';
const CHECKPOINT_VERSION = 'pay-identity-distribution-transparency-checkpoint-v1';
const CHECKPOINT_CHAIN_VERSION = 'pay-identity-distribution-transparency-chain-v1';
const RECOVERY_PLAN_VERSION = 'pay-identity-distribution-recovery-plan-v1';
const RECOVERY_RESULT_VERSION = 'pay-identity-distribution-recovery-result-v1';
const INCIDENT_EVIDENCE_VERSION = 'pay-identity-cache-poisoning-incident-evidence-v1';
const INCIDENT_CHAIN_VERSION = 'pay-identity-cache-poisoning-incident-chain-v1';
const ADOPTION_HANDOFF_VERSION = 'pay-identity-distribution-operational-adoption-handoff-v1';
const ADOPTION_DECISION_VERSION = 'pay-identity-distribution-operational-adoption-decision-v1';
const A16_CONTRACT_VERSION = distribution.CONTRACT_VERSION;
const MINIMUM_WITNESSES = 2;
const MINIMUM_APPROVALS = 2;
const MAX_CHECKPOINT_INTERVAL_SECONDS = 300;
const MAX_RECOVERY_WINDOW_SECONDS = 900;
const MAX_INCIDENT_EVIDENCE_DELAY_SECONDS = 300;
const PUBLICATION_MODES = Object.freeze(['offline_bundle']);
const RECOVERY_MODES = Object.freeze(['forward_only_rebuild']);
const DETECTION_CLASSES = Object.freeze([
  'manifest_mismatch',
  'payload_hash_mismatch',
  'split_brain',
  'replay',
  'clock_rollback'
]);
const CONTAINMENT_STATES = Object.freeze([
  'under_investigation',
  'contained_offline',
  'recovery_validated'
]);
const ADOPTION_STATES = Object.freeze(['blocked_repository_only']);
const REMOTE_FIELD_PATTERN = /(url|uri|endpoint|credential|secret|token|password|private.?key|provider.?name|hostname|origin)/iu;
const REMOTE_VALUE_PATTERN = /(https?:\/\/|postgres(?:ql)?:\/\/|supabase\.co|api[_-]?key|bearer\s|sk_live|sk_test)/iu;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}
function assert(condition, code, message) {
  if (!condition) fail(code, message);
}
function assertExactKeys(value, allowed, code, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), code, label + ' is required.');
  Object.keys(value).forEach((key) => {
    assert(allowed.includes(key), code, label + ' field is not allowlisted: ' + key);
  });
}
function assertHash(value, code, label) {
  assert(typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value), code, label + ' must be SHA-256.');
}
function assertId(value, code, label) {
  assert(typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{7,95}$/u.test(value), code, label + ' is invalid.');
}
function parseTime(value, code, label) {
  const parsed = Date.parse(value);
  assert(Number.isFinite(parsed), code, label + ' must be a timestamp.');
  return parsed;
}
function fingerprint(value, field, omitted = []) {
  const body = { ...value };
  delete body[field];
  omitted.forEach((key) => delete body[key]);
  return sha256(canonicalJson(body));
}
function assertCanonicalHashList(value, minimum, code, label) {
  assert(Array.isArray(value) && value.length >= minimum, code, label + ' is required.');
  value.forEach((item) => assertHash(item, code, label + ' item'));
  assert(new Set(value).size === value.length, code, label + ' contains duplicates.');
  assert(JSON.stringify(value) === JSON.stringify(value.slice().sort()), code, label + ' must be canonically sorted.');
}
function assertNoRemoteMaterial(value, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoRemoteMaterial(item, path + '[' + index + ']'));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      const boundary = [
        'containsEndpoints',
        'containsCredentials',
        'containsPrivateKeyMaterial',
        'remoteExecutionAuthorized',
        'remotePublicationAuthorized',
        'realOperationalAdoptionAuthorized'
      ].includes(key);
      if (boundary) {
        assert(item === false, 'DOKE_PAY_A17_REMOTE_MATERIAL_DENIED', 'Remote authority boundary must remain false at ' + path + '.' + key + '.');
      } else {
        assert(!REMOTE_FIELD_PATTERN.test(key), 'DOKE_PAY_A17_REMOTE_MATERIAL_DENIED', 'Remote material field denied at ' + path + '.' + key + '.');
        assertNoRemoteMaterial(item, path + '.' + key);
      }
    });
    return;
  }
  if (typeof value === 'string') {
    assert(!REMOTE_VALUE_PATTERN.test(value), 'DOKE_PAY_A17_REMOTE_MATERIAL_DENIED', 'Remote material value denied at ' + path + '.');
  }
}
function assertZeroEffects(value, code, label) {
  ['networkRequests', 'databaseConnections', 'subprocesses', 'environmentReads'].forEach((key) => {
    assert(value[key] === 0, code, label + ' effect must be zero: ' + key);
  });
  [
    'productionAllowed',
    'remoteExecutionAuthorized',
    'remotePublicationAuthorized'
  ].forEach((key) => {
    assert(value[key] === false, code, label + ' authority must remain false: ' + key);
  });
  if (Object.prototype.hasOwnProperty.call(value, 'realOperationalAdoptionAuthorized')) {
    assert(value.realOperationalAdoptionAuthorized === false, code, label + ' authority must remain false: realOperationalAdoptionAuthorized');
  }
}
function checkpointBody(value) {
  const body = { ...value };
  [
    'checkpointHash',
    'networkRequests',
    'databaseConnections',
    'subprocesses',
    'environmentReads',
    'productionAllowed',
    'remoteExecutionAuthorized',
    'remotePublicationAuthorized'
  ].forEach((key) => delete body[key]);
  return body;
}
function computeTransparencyCheckpointHash(value) {
  return sha256(canonicalJson(checkpointBody(value)));
}
function recoveryPlanBody(value) {
  const body = { ...value };
  [
    'planFingerprint',
    'networkRequests',
    'databaseConnections',
    'subprocesses',
    'environmentReads',
    'productionAllowed',
    'remoteExecutionAuthorized',
    'remotePublicationAuthorized'
  ].forEach((key) => delete body[key]);
  return body;
}
function computeRecoveryPlanFingerprint(value) {
  return sha256(canonicalJson(recoveryPlanBody(value)));
}
function recoveryResultBody(value) {
  const body = { ...value };
  [
    'resultFingerprint',
    'networkRequests',
    'databaseConnections',
    'subprocesses',
    'environmentReads',
    'productionAllowed',
    'remoteExecutionAuthorized',
    'remotePublicationAuthorized'
  ].forEach((key) => delete body[key]);
  return body;
}
function computeRecoveryResultFingerprint(value) {
  return sha256(canonicalJson(recoveryResultBody(value)));
}
function incidentBody(value) {
  const body = { ...value };
  [
    'incidentEvidenceHash',
    'networkRequests',
    'databaseConnections',
    'subprocesses',
    'environmentReads',
    'productionAllowed',
    'remoteExecutionAuthorized',
    'remotePublicationAuthorized'
  ].forEach((key) => delete body[key]);
  return body;
}
function computeIncidentEvidenceHash(value) {
  return sha256(canonicalJson(incidentBody(value)));
}
function handoffBody(value) {
  const body = { ...value };
  [
    'handoffFingerprint',
    'networkRequests',
    'databaseConnections',
    'subprocesses',
    'environmentReads',
    'productionAllowed',
    'remoteExecutionAuthorized',
    'remotePublicationAuthorized',
    'realOperationalAdoptionAuthorized'
  ].forEach((key) => delete body[key]);
  return body;
}
function computeOperationalAdoptionHandoffFingerprint(value) {
  return sha256(canonicalJson(handoffBody(value)));
}
function adoptionDecisionBody(value) {
  const body = { ...value };
  [
    'decisionFingerprint',
    'networkRequests',
    'databaseConnections',
    'subprocesses',
    'environmentReads',
    'productionAllowed',
    'remoteExecutionAuthorized',
    'remotePublicationAuthorized',
    'realOperationalAdoptionAuthorized'
  ].forEach((key) => delete body[key]);
  return body;
}
function computeOperationalAdoptionDecisionFingerprint(value) {
  return sha256(canonicalJson(adoptionDecisionBody(value)));
}

function validateA16Manifest(value) {
  assert(value && value.manifestVersion === distribution.DISTRIBUTION_MANIFEST_VERSION, 'DOKE_PAY_A17_A16_MANIFEST_REQUIRED', 'A valid PAY-A16 distribution manifest is required.');
  assert(value.contractVersion === distribution.CONTRACT_VERSION, 'DOKE_PAY_A17_A16_CONTRACT_MISMATCH', 'PAY-A16 contract mismatch.');
  assertHash(value.manifestFingerprint, 'DOKE_PAY_A17_A16_MANIFEST_INTEGRITY_FAILED', 'Manifest fingerprint');
  assert(value.manifestFingerprint === distribution.computeDistributionManifestFingerprint(value), 'DOKE_PAY_A17_A16_MANIFEST_INTEGRITY_FAILED', 'Manifest integrity failed.');
  assertHash(value.issuerIdHash, 'DOKE_PAY_A17_ISSUER_HASH_INVALID', 'Issuer id hash');
  assertHash(value.issuerFamilyHash, 'DOKE_PAY_A17_ISSUER_FAMILY_HASH_INVALID', 'Issuer family hash');
  assert(Number.isInteger(value.distributionEpoch) && value.distributionEpoch >= 1, 'DOKE_PAY_A17_DISTRIBUTION_EPOCH_INVALID', 'Distribution epoch is invalid.');
  assert(Number.isInteger(value.lifecycleSequence) && value.lifecycleSequence >= 1, 'DOKE_PAY_A17_LIFECYCLE_SEQUENCE_INVALID', 'Lifecycle sequence is invalid.');
  assert(value.production === false, 'DOKE_PAY_A17_PRODUCTION_DENIED', 'Production manifest denied.');
  return value;
}
function validateA16CacheProof(value, manifest) {
  assert(value && value.proofVersion === distribution.CACHE_PROOF_VERSION, 'DOKE_PAY_A17_A16_CACHE_PROOF_REQUIRED', 'A valid PAY-A16 cache proof is required.');
  assertHash(value.proofFingerprint, 'DOKE_PAY_A17_A16_CACHE_PROOF_INTEGRITY_FAILED', 'Cache proof fingerprint');
  assert(value.proofFingerprint === distribution.computeCacheProofFingerprint(value), 'DOKE_PAY_A17_A16_CACHE_PROOF_INTEGRITY_FAILED', 'Cache proof integrity failed.');
  assert(value.manifestFingerprint === manifest.manifestFingerprint, 'DOKE_PAY_A17_CACHE_PROOF_MANIFEST_MISMATCH', 'Cache proof manifest mismatch.');
  return value;
}
function validateA16QuorumDecision(value) {
  assert(value && value.decisionVersion === distribution.QUORUM_DECISION_VERSION, 'DOKE_PAY_A17_A16_QUORUM_REQUIRED', 'A valid PAY-A16 quorum decision is required.');
  assertHash(value.decisionFingerprint, 'DOKE_PAY_A17_A16_QUORUM_INTEGRITY_FAILED', 'Quorum decision fingerprint');
  assert(value.decisionFingerprint === distribution.computeQuorumDecisionFingerprint(value), 'DOKE_PAY_A17_A16_QUORUM_INTEGRITY_FAILED', 'Quorum decision integrity failed.');
  assert(distribution.QUORUM_DECISIONS.includes(value.decision), 'DOKE_PAY_A17_A16_QUORUM_DECISION_INVALID', 'Quorum decision is invalid.');
  return value;
}

function createTransparencyCheckpoint(input, options = {}) {
  assertExactKeys(input, [
    'checkpointId',
    'checkpointSequence',
    'previousCheckpointHash',
    'distributionManifestFingerprint',
    'distributionEpoch',
    'lifecycleSequence',
    'issuerIdHash',
    'issuerFamilyHash',
    'cacheProofFingerprint',
    'quorumDecisionFingerprint',
    'observedAt',
    'treeSize',
    'rootHash',
    'witnessHashes',
    'publicationMode',
    'containsEndpoints',
    'containsCredentials',
    'containsPrivateKeyMaterial',
    'production'
  ], 'DOKE_PAY_A17_CHECKPOINT_INVALID', 'Transparency checkpoint input');
  assertNoRemoteMaterial(input);
  const manifest = validateA16Manifest(options.manifest);
  const cacheProof = validateA16CacheProof(options.cacheProof, manifest);
  const quorum = validateA16QuorumDecision(options.quorumDecision);
  assertId(input.checkpointId, 'DOKE_PAY_A17_CHECKPOINT_ID_INVALID', 'Checkpoint id');
  assert(input.distributionManifestFingerprint === manifest.manifestFingerprint, 'DOKE_PAY_A17_CHECKPOINT_MANIFEST_MISMATCH', 'Checkpoint manifest mismatch.');
  assert(input.distributionEpoch === manifest.distributionEpoch, 'DOKE_PAY_A17_CHECKPOINT_EPOCH_MISMATCH', 'Checkpoint epoch mismatch.');
  assert(input.lifecycleSequence === manifest.lifecycleSequence, 'DOKE_PAY_A17_CHECKPOINT_LIFECYCLE_MISMATCH', 'Checkpoint lifecycle mismatch.');
  assert(input.issuerIdHash === manifest.issuerIdHash, 'DOKE_PAY_A17_CHECKPOINT_ISSUER_MISMATCH', 'Checkpoint issuer mismatch.');
  assert(input.issuerFamilyHash === manifest.issuerFamilyHash, 'DOKE_PAY_A17_CHECKPOINT_FAMILY_MISMATCH', 'Checkpoint issuer-family mismatch.');
  assert(input.cacheProofFingerprint === cacheProof.proofFingerprint, 'DOKE_PAY_A17_CHECKPOINT_CACHE_PROOF_MISMATCH', 'Checkpoint cache-proof mismatch.');
  assert(input.quorumDecisionFingerprint === quorum.decisionFingerprint, 'DOKE_PAY_A17_CHECKPOINT_QUORUM_MISMATCH', 'Checkpoint quorum mismatch.');
  assert(Number.isInteger(input.checkpointSequence) && input.checkpointSequence >= 1, 'DOKE_PAY_A17_CHECKPOINT_SEQUENCE_INVALID', 'Checkpoint sequence is invalid.');
  const observedAt = parseTime(input.observedAt, 'DOKE_PAY_A17_CHECKPOINT_TIME_INVALID', 'Checkpoint observedAt');
  assert(Number.isInteger(input.treeSize) && input.treeSize >= 1, 'DOKE_PAY_A17_TREE_SIZE_INVALID', 'Checkpoint tree size is invalid.');
  assertHash(input.rootHash, 'DOKE_PAY_A17_ROOT_HASH_INVALID', 'Checkpoint root hash');
  assertCanonicalHashList(input.witnessHashes, MINIMUM_WITNESSES, 'DOKE_PAY_A17_WITNESSES_INVALID', 'Checkpoint witnesses');
  assert(PUBLICATION_MODES.includes(input.publicationMode), 'DOKE_PAY_A17_PUBLICATION_MODE_INVALID', 'Publication mode is invalid.');
  ['containsEndpoints', 'containsCredentials', 'containsPrivateKeyMaterial'].forEach((key) => {
    assert(input[key] === false, 'DOKE_PAY_A17_REMOTE_MATERIAL_DENIED', 'Checkpoint boundary must remain false: ' + key);
  });
  assert(input.production === false, 'DOKE_PAY_A17_PRODUCTION_DENIED', 'Production checkpoint denied.');
  const previous = options.previousCheckpoint || null;
  if (input.checkpointSequence === 1) {
    assert(previous == null && input.previousCheckpointHash == null, 'DOKE_PAY_A17_GENESIS_CHECKPOINT_PREDECESSOR_DENIED', 'Genesis checkpoint may not reference a predecessor.');
  } else {
    assert(previous && previous.checkpointVersion === CHECKPOINT_VERSION, 'DOKE_PAY_A17_PREVIOUS_CHECKPOINT_REQUIRED', 'Previous checkpoint is required.');
    assert(previous.checkpointHash === computeTransparencyCheckpointHash(previous), 'DOKE_PAY_A17_PREVIOUS_CHECKPOINT_INTEGRITY_FAILED', 'Previous checkpoint integrity failed.');
    assert(input.previousCheckpointHash === previous.checkpointHash, 'DOKE_PAY_A17_PREVIOUS_CHECKPOINT_HASH_MISMATCH', 'Previous checkpoint hash mismatch.');
    assert(input.checkpointSequence === previous.checkpointSequence + 1, 'DOKE_PAY_A17_CHECKPOINT_SEQUENCE_GAP', 'Checkpoint sequence must be contiguous.');
    assert(input.issuerIdHash === previous.issuerIdHash && input.issuerFamilyHash === previous.issuerFamilyHash, 'DOKE_PAY_A17_CHECKPOINT_CHAIN_ISSUER_MISMATCH', 'Checkpoint chain crossed issuer.');
    assert(input.distributionEpoch >= previous.distributionEpoch, 'DOKE_PAY_A17_CHECKPOINT_EPOCH_ROLLBACK_DENIED', 'Checkpoint epoch rollback denied.');
    assert(input.lifecycleSequence >= previous.lifecycleSequence, 'DOKE_PAY_A17_CHECKPOINT_LIFECYCLE_ROLLBACK_DENIED', 'Checkpoint lifecycle rollback denied.');
    assert(input.treeSize > previous.treeSize, 'DOKE_PAY_A17_TREE_SIZE_ROLLBACK_DENIED', 'Checkpoint tree size must increase.');
    const previousObservedAt = parseTime(previous.observedAt, 'DOKE_PAY_A17_CHECKPOINT_TIME_INVALID', 'Previous checkpoint observedAt');
    assert(observedAt >= previousObservedAt, 'DOKE_PAY_A17_CHECKPOINT_CLOCK_ROLLBACK_DENIED', 'Checkpoint clock rollback denied.');
    assert(observedAt - previousObservedAt <= MAX_CHECKPOINT_INTERVAL_SECONDS * 1000, 'DOKE_PAY_A17_CHECKPOINT_INTERVAL_EXCEEDED', 'Checkpoint interval exceeded.');
  }
  const body = {
    checkpointVersion: CHECKPOINT_VERSION,
    contractVersion: CONTRACT_VERSION,
    a16ContractVersion: A16_CONTRACT_VERSION,
    ...input
  };
  return Object.freeze({
    ...body,
    checkpointHash: sha256(canonicalJson(body)),
    networkRequests: 0,
    databaseConnections: 0,
    subprocesses: 0,
    environmentReads: 0,
    productionAllowed: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false
  });
}

function validateTransparencyCheckpointChain(checkpoints) {
  assert(Array.isArray(checkpoints) && checkpoints.length >= 1, 'DOKE_PAY_A17_CHECKPOINT_CHAIN_REQUIRED', 'Checkpoint chain is required.');
  const hashes = new Set();
  checkpoints.forEach((checkpoint, index) => {
    assert(checkpoint && checkpoint.checkpointVersion === CHECKPOINT_VERSION, 'DOKE_PAY_A17_CHECKPOINT_VERSION_INVALID', 'Checkpoint version is invalid.');
    assert(checkpoint.checkpointHash === computeTransparencyCheckpointHash(checkpoint), 'DOKE_PAY_A17_CHECKPOINT_INTEGRITY_FAILED', 'Checkpoint integrity failed.');
    assertZeroEffects(checkpoint, 'DOKE_PAY_A17_CHECKPOINT_AUTHORITY_ESCALATION', 'Checkpoint');
    assert(!hashes.has(checkpoint.checkpointHash), 'DOKE_PAY_A17_CHECKPOINT_REPLAY_DENIED', 'Checkpoint replay denied.');
    hashes.add(checkpoint.checkpointHash);
    if (index === 0) {
      assert(checkpoint.checkpointSequence === 1 && checkpoint.previousCheckpointHash == null, 'DOKE_PAY_A17_CHECKPOINT_GENESIS_INVALID', 'Checkpoint genesis is invalid.');
      return;
    }
    const previous = checkpoints[index - 1];
    assert(checkpoint.previousCheckpointHash === previous.checkpointHash, 'DOKE_PAY_A17_CHECKPOINT_FORK_DENIED', 'Checkpoint fork denied.');
    assert(checkpoint.checkpointSequence === previous.checkpointSequence + 1, 'DOKE_PAY_A17_CHECKPOINT_SEQUENCE_GAP', 'Checkpoint sequence gap.');
    assert(checkpoint.issuerIdHash === previous.issuerIdHash && checkpoint.issuerFamilyHash === previous.issuerFamilyHash, 'DOKE_PAY_A17_CHECKPOINT_CHAIN_ISSUER_MISMATCH', 'Checkpoint chain crossed issuer.');
    assert(checkpoint.distributionEpoch >= previous.distributionEpoch, 'DOKE_PAY_A17_CHECKPOINT_EPOCH_ROLLBACK_DENIED', 'Checkpoint epoch rollback denied.');
    assert(checkpoint.lifecycleSequence >= previous.lifecycleSequence, 'DOKE_PAY_A17_CHECKPOINT_LIFECYCLE_ROLLBACK_DENIED', 'Checkpoint lifecycle rollback denied.');
    assert(checkpoint.treeSize > previous.treeSize, 'DOKE_PAY_A17_TREE_SIZE_ROLLBACK_DENIED', 'Checkpoint tree-size rollback denied.');
    assert(parseTime(checkpoint.observedAt, 'DOKE_PAY_A17_CHECKPOINT_TIME_INVALID', 'Checkpoint observedAt') >= parseTime(previous.observedAt, 'DOKE_PAY_A17_CHECKPOINT_TIME_INVALID', 'Previous checkpoint observedAt'), 'DOKE_PAY_A17_CHECKPOINT_CLOCK_ROLLBACK_DENIED', 'Checkpoint clock rollback denied.');
  });
  return Object.freeze({
    chainVersion: CHECKPOINT_CHAIN_VERSION,
    contractVersion: CONTRACT_VERSION,
    issuerIdHash: checkpoints[0].issuerIdHash,
    issuerFamilyHash: checkpoints[0].issuerFamilyHash,
    checkpointCount: checkpoints.length,
    genesisCheckpointHash: checkpoints[0].checkpointHash,
    headCheckpointHash: checkpoints[checkpoints.length - 1].checkpointHash,
    headDistributionEpoch: checkpoints[checkpoints.length - 1].distributionEpoch,
    headLifecycleSequence: checkpoints[checkpoints.length - 1].lifecycleSequence,
    appendOnly: true,
    contiguous: true,
    rollbackFree: true,
    forkFree: true,
    replayFree: true,
    networkRequests: 0,
    databaseConnections: 0,
    subprocesses: 0,
    environmentReads: 0,
    productionAllowed: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false
  });
}

function createRecoveryPlan(input, options = {}) {
  assertExactKeys(input, [
    'recoveryId',
    'incidentIdHash',
    'compromisedCheckpointHash',
    'lastKnownGoodCheckpointHash',
    'targetManifestFingerprint',
    'targetDistributionEpoch',
    'targetLifecycleSequence',
    'plannedAt',
    'recoveryMode',
    'invalidatedCacheEntryFingerprints',
    'requiredWitnessHashes',
    'operatorRoleHashes',
    'minimumApprovals',
    'containsEndpoints',
    'containsCredentials',
    'containsPrivateKeyMaterial',
    'automaticExecutionAuthorized',
    'production'
  ], 'DOKE_PAY_A17_RECOVERY_PLAN_INVALID', 'Recovery plan input');
  assertNoRemoteMaterial(input);
  const compromised = options.compromisedCheckpoint;
  const lastKnownGood = options.lastKnownGoodCheckpoint;
  const targetManifest = validateA16Manifest(options.targetManifest);
  assert(compromised && compromised.checkpointVersion === CHECKPOINT_VERSION, 'DOKE_PAY_A17_COMPROMISED_CHECKPOINT_REQUIRED', 'Compromised checkpoint is required.');
  assert(lastKnownGood && lastKnownGood.checkpointVersion === CHECKPOINT_VERSION, 'DOKE_PAY_A17_LAST_KNOWN_GOOD_REQUIRED', 'Last-known-good checkpoint is required.');
  assert(compromised.checkpointHash === computeTransparencyCheckpointHash(compromised), 'DOKE_PAY_A17_COMPROMISED_CHECKPOINT_INTEGRITY_FAILED', 'Compromised checkpoint integrity failed.');
  assert(lastKnownGood.checkpointHash === computeTransparencyCheckpointHash(lastKnownGood), 'DOKE_PAY_A17_LAST_KNOWN_GOOD_INTEGRITY_FAILED', 'Last-known-good checkpoint integrity failed.');
  assertId(input.recoveryId, 'DOKE_PAY_A17_RECOVERY_ID_INVALID', 'Recovery id');
  assertHash(input.incidentIdHash, 'DOKE_PAY_A17_INCIDENT_ID_HASH_INVALID', 'Incident id hash');
  assert(input.compromisedCheckpointHash === compromised.checkpointHash, 'DOKE_PAY_A17_COMPROMISED_CHECKPOINT_MISMATCH', 'Compromised checkpoint mismatch.');
  assert(input.lastKnownGoodCheckpointHash === lastKnownGood.checkpointHash, 'DOKE_PAY_A17_LAST_KNOWN_GOOD_MISMATCH', 'Last-known-good checkpoint mismatch.');
  assert(lastKnownGood.issuerIdHash === compromised.issuerIdHash && lastKnownGood.issuerFamilyHash === compromised.issuerFamilyHash, 'DOKE_PAY_A17_RECOVERY_ISSUER_MISMATCH', 'Recovery checkpoints crossed issuer.');
  assert(lastKnownGood.checkpointSequence < compromised.checkpointSequence, 'DOKE_PAY_A17_LAST_KNOWN_GOOD_ORDER_INVALID', 'Last-known-good checkpoint must precede the compromised checkpoint.');
  assert(input.targetManifestFingerprint === targetManifest.manifestFingerprint, 'DOKE_PAY_A17_RECOVERY_TARGET_MANIFEST_MISMATCH', 'Recovery target manifest mismatch.');
  assert(input.targetDistributionEpoch === targetManifest.distributionEpoch, 'DOKE_PAY_A17_RECOVERY_TARGET_EPOCH_MISMATCH', 'Recovery target epoch mismatch.');
  assert(input.targetLifecycleSequence === targetManifest.lifecycleSequence, 'DOKE_PAY_A17_RECOVERY_TARGET_LIFECYCLE_MISMATCH', 'Recovery target lifecycle mismatch.');
  assert(input.targetDistributionEpoch > compromised.distributionEpoch, 'DOKE_PAY_A17_FORWARD_ONLY_EPOCH_REQUIRED', 'Recovery must move to a newer distribution epoch.');
  assert(input.targetLifecycleSequence >= compromised.lifecycleSequence, 'DOKE_PAY_A17_RECOVERY_LIFECYCLE_ROLLBACK_DENIED', 'Recovery lifecycle rollback denied.');
  assert(input.targetManifestFingerprint !== compromised.distributionManifestFingerprint, 'DOKE_PAY_A17_COMPROMISED_MANIFEST_REUSE_DENIED', 'Compromised manifest reuse denied.');
  parseTime(input.plannedAt, 'DOKE_PAY_A17_RECOVERY_TIME_INVALID', 'Recovery plannedAt');
  assert(RECOVERY_MODES.includes(input.recoveryMode), 'DOKE_PAY_A17_RECOVERY_MODE_INVALID', 'Recovery mode is invalid.');
  assertCanonicalHashList(input.invalidatedCacheEntryFingerprints, 1, 'DOKE_PAY_A17_INVALIDATED_CACHE_SET_INVALID', 'Invalidated cache entries');
  assertCanonicalHashList(input.requiredWitnessHashes, MINIMUM_WITNESSES, 'DOKE_PAY_A17_RECOVERY_WITNESSES_INVALID', 'Recovery witnesses');
  assertCanonicalHashList(input.operatorRoleHashes, MINIMUM_APPROVALS, 'DOKE_PAY_A17_OPERATOR_ROLES_INVALID', 'Operator roles');
  assert(Number.isInteger(input.minimumApprovals) && input.minimumApprovals >= MINIMUM_APPROVALS && input.minimumApprovals <= input.operatorRoleHashes.length, 'DOKE_PAY_A17_MINIMUM_APPROVALS_INVALID', 'Minimum approvals is invalid.');
  ['containsEndpoints', 'containsCredentials', 'containsPrivateKeyMaterial', 'automaticExecutionAuthorized'].forEach((key) => {
    assert(input[key] === false, 'DOKE_PAY_A17_RECOVERY_AUTHORITY_DENIED', 'Recovery authority must remain false: ' + key);
  });
  assert(input.production === false, 'DOKE_PAY_A17_PRODUCTION_DENIED', 'Production recovery denied.');
  const body = {
    planVersion: RECOVERY_PLAN_VERSION,
    contractVersion: CONTRACT_VERSION,
    a16ContractVersion: A16_CONTRACT_VERSION,
    issuerIdHash: compromised.issuerIdHash,
    issuerFamilyHash: compromised.issuerFamilyHash,
    compromisedDistributionEpoch: compromised.distributionEpoch,
    compromisedLifecycleSequence: compromised.lifecycleSequence,
    ...input
  };
  return Object.freeze({
    ...body,
    planFingerprint: sha256(canonicalJson(body)),
    networkRequests: 0,
    databaseConnections: 0,
    subprocesses: 0,
    environmentReads: 0,
    productionAllowed: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false
  });
}

function validateRecoveryResult(plan, result, options = {}) {
  assert(plan && plan.planVersion === RECOVERY_PLAN_VERSION, 'DOKE_PAY_A17_RECOVERY_PLAN_REQUIRED', 'Recovery plan is required.');
  assert(plan.planFingerprint === computeRecoveryPlanFingerprint(plan), 'DOKE_PAY_A17_RECOVERY_PLAN_INTEGRITY_FAILED', 'Recovery plan integrity failed.');
  assertExactKeys(result, [
    'resultVersion',
    'recoveryId',
    'planFingerprint',
    'completedAt',
    'rebuiltCheckpointHash',
    'rebuiltManifestFingerprint',
    'resultingDistributionEpoch',
    'resultingLifecycleSequence',
    'invalidatedCacheEntryFingerprints',
    'validationStatus',
    'automaticRemoteExecutionPerformed',
    'networkRequests',
    'databaseConnections',
    'subprocesses',
    'environmentReads',
    'productionAllowed',
    'remoteExecutionAuthorized',
    'remotePublicationAuthorized'
  ], 'DOKE_PAY_A17_RECOVERY_RESULT_INVALID', 'Recovery result');
  assertNoRemoteMaterial(result);
  assert(result.resultVersion === RECOVERY_RESULT_VERSION, 'DOKE_PAY_A17_RECOVERY_RESULT_VERSION_INVALID', 'Recovery-result version is invalid.');
  assert(result.recoveryId === plan.recoveryId && result.planFingerprint === plan.planFingerprint, 'DOKE_PAY_A17_RECOVERY_RESULT_PLAN_MISMATCH', 'Recovery result plan mismatch.');
  const completedAt = parseTime(result.completedAt, 'DOKE_PAY_A17_RECOVERY_TIME_INVALID', 'Recovery completedAt');
  const plannedAt = parseTime(plan.plannedAt, 'DOKE_PAY_A17_RECOVERY_TIME_INVALID', 'Recovery plannedAt');
  assert(completedAt >= plannedAt && completedAt - plannedAt <= MAX_RECOVERY_WINDOW_SECONDS * 1000, 'DOKE_PAY_A17_RECOVERY_WINDOW_INVALID', 'Recovery window is invalid.');
  assertHash(result.rebuiltCheckpointHash, 'DOKE_PAY_A17_REBUILT_CHECKPOINT_HASH_INVALID', 'Rebuilt checkpoint hash');
  assertHash(result.rebuiltManifestFingerprint, 'DOKE_PAY_A17_REBUILT_MANIFEST_HASH_INVALID', 'Rebuilt manifest fingerprint');
  assert(result.rebuiltCheckpointHash !== plan.compromisedCheckpointHash && result.rebuiltCheckpointHash !== plan.lastKnownGoodCheckpointHash, 'DOKE_PAY_A17_RECOVERY_CHECKPOINT_REUSE_DENIED', 'Recovery checkpoint reuse denied.');
  assert(result.rebuiltManifestFingerprint === plan.targetManifestFingerprint, 'DOKE_PAY_A17_RECOVERY_RESULT_MANIFEST_MISMATCH', 'Recovery result manifest mismatch.');
  assert(result.resultingDistributionEpoch === plan.targetDistributionEpoch, 'DOKE_PAY_A17_RECOVERY_RESULT_EPOCH_MISMATCH', 'Recovery result epoch mismatch.');
  assert(result.resultingLifecycleSequence === plan.targetLifecycleSequence, 'DOKE_PAY_A17_RECOVERY_RESULT_LIFECYCLE_MISMATCH', 'Recovery result lifecycle mismatch.');
  assert(result.resultingDistributionEpoch > plan.compromisedDistributionEpoch, 'DOKE_PAY_A17_RECOVERY_RESULT_EPOCH_ROLLBACK_DENIED', 'Recovery result epoch rollback denied.');
  assert(result.resultingLifecycleSequence >= plan.compromisedLifecycleSequence, 'DOKE_PAY_A17_RECOVERY_RESULT_LIFECYCLE_ROLLBACK_DENIED', 'Recovery result lifecycle rollback denied.');
  assert(JSON.stringify(result.invalidatedCacheEntryFingerprints) === JSON.stringify(plan.invalidatedCacheEntryFingerprints), 'DOKE_PAY_A17_RECOVERY_INVALIDATION_SET_MISMATCH', 'Recovery invalidation set mismatch.');
  assert(result.validationStatus === 'validated_offline', 'DOKE_PAY_A17_RECOVERY_VALIDATION_STATUS_INVALID', 'Recovery result must be validated offline.');
  assert(result.automaticRemoteExecutionPerformed === false, 'DOKE_PAY_A17_AUTOMATIC_RECOVERY_EXECUTION_DENIED', 'Automatic remote recovery execution denied.');
  assertZeroEffects(result, 'DOKE_PAY_A17_RECOVERY_RESULT_AUTHORITY_ESCALATION', 'Recovery result');
  const rebuilt = options.rebuiltCheckpoint;
  if (rebuilt) {
    assert(rebuilt.checkpointVersion === CHECKPOINT_VERSION, 'DOKE_PAY_A17_REBUILT_CHECKPOINT_INVALID', 'Rebuilt checkpoint is invalid.');
    assert(rebuilt.checkpointHash === computeTransparencyCheckpointHash(rebuilt), 'DOKE_PAY_A17_REBUILT_CHECKPOINT_INTEGRITY_FAILED', 'Rebuilt checkpoint integrity failed.');
    assert(rebuilt.checkpointHash === result.rebuiltCheckpointHash, 'DOKE_PAY_A17_REBUILT_CHECKPOINT_MISMATCH', 'Rebuilt checkpoint mismatch.');
    assert(rebuilt.distributionManifestFingerprint === result.rebuiltManifestFingerprint, 'DOKE_PAY_A17_REBUILT_CHECKPOINT_MANIFEST_MISMATCH', 'Rebuilt checkpoint manifest mismatch.');
    assert(rebuilt.distributionEpoch === result.resultingDistributionEpoch && rebuilt.lifecycleSequence === result.resultingLifecycleSequence, 'DOKE_PAY_A17_REBUILT_CHECKPOINT_SEQUENCE_MISMATCH', 'Rebuilt checkpoint sequence mismatch.');
  }
  const body = {
    contractVersion: CONTRACT_VERSION,
    ...result,
    rollbackSafe: true,
    forwardOnly: true,
    repositoryOnly: true
  };
  return Object.freeze({
    ...body,
    resultFingerprint: computeRecoveryResultFingerprint(body)
  });
}

function createCachePoisoningIncidentEvidence(input, options = {}) {
  assertExactKeys(input, [
    'incidentIdHash',
    'incidentSequence',
    'previousIncidentEvidenceHash',
    'detectedAt',
    'detectionClass',
    'affectedIssuerIdHash',
    'affectedIssuerFamilyHash',
    'compromisedCheckpointHash',
    'compromisedCacheEntryFingerprints',
    'observedReplicaHashes',
    'expectedManifestFingerprint',
    'observedManifestFingerprints',
    'poisonedPayloadHashes',
    'containmentState',
    'evidenceHashOnly',
    'directIdentifiersPresent',
    'rawPayloadStored',
    'containsEndpoints',
    'containsCredentials',
    'containsPrivateKeyMaterial',
    'production'
  ], 'DOKE_PAY_A17_INCIDENT_EVIDENCE_INVALID', 'Incident evidence input');
  assertNoRemoteMaterial(input);
  assertHash(input.incidentIdHash, 'DOKE_PAY_A17_INCIDENT_ID_HASH_INVALID', 'Incident id hash');
  assert(Number.isInteger(input.incidentSequence) && input.incidentSequence >= 1, 'DOKE_PAY_A17_INCIDENT_SEQUENCE_INVALID', 'Incident sequence is invalid.');
  const detectedAt = parseTime(input.detectedAt, 'DOKE_PAY_A17_INCIDENT_TIME_INVALID', 'Incident detectedAt');
  assert(DETECTION_CLASSES.includes(input.detectionClass), 'DOKE_PAY_A17_DETECTION_CLASS_INVALID', 'Detection class is invalid.');
  assertHash(input.affectedIssuerIdHash, 'DOKE_PAY_A17_ISSUER_HASH_INVALID', 'Affected issuer id hash');
  assertHash(input.affectedIssuerFamilyHash, 'DOKE_PAY_A17_ISSUER_FAMILY_HASH_INVALID', 'Affected issuer family hash');
  assertHash(input.compromisedCheckpointHash, 'DOKE_PAY_A17_COMPROMISED_CHECKPOINT_HASH_INVALID', 'Compromised checkpoint hash');
  assertCanonicalHashList(input.compromisedCacheEntryFingerprints, 1, 'DOKE_PAY_A17_COMPROMISED_CACHE_SET_INVALID', 'Compromised cache entries');
  assertCanonicalHashList(input.observedReplicaHashes, MINIMUM_WITNESSES, 'DOKE_PAY_A17_OBSERVED_REPLICAS_INVALID', 'Observed replicas');
  assertHash(input.expectedManifestFingerprint, 'DOKE_PAY_A17_EXPECTED_MANIFEST_HASH_INVALID', 'Expected manifest fingerprint');
  assertCanonicalHashList(input.observedManifestFingerprints, 1, 'DOKE_PAY_A17_OBSERVED_MANIFESTS_INVALID', 'Observed manifest fingerprints');
  assertCanonicalHashList(input.poisonedPayloadHashes, 1, 'DOKE_PAY_A17_POISONED_PAYLOADS_INVALID', 'Poisoned payload hashes');
  if (input.detectionClass === 'manifest_mismatch') {
    assert(input.observedManifestFingerprints.some((value) => value !== input.expectedManifestFingerprint), 'DOKE_PAY_A17_MANIFEST_MISMATCH_EVIDENCE_REQUIRED', 'Manifest mismatch evidence is required.');
  }
  if (input.detectionClass === 'split_brain') {
    assert(input.observedManifestFingerprints.length >= 2, 'DOKE_PAY_A17_SPLIT_BRAIN_EVIDENCE_REQUIRED', 'Split-brain evidence requires at least two manifest observations.');
  }
  assert(CONTAINMENT_STATES.includes(input.containmentState), 'DOKE_PAY_A17_CONTAINMENT_STATE_INVALID', 'Containment state is invalid.');
  assert(input.evidenceHashOnly === true, 'DOKE_PAY_A17_HASH_ONLY_EVIDENCE_REQUIRED', 'Incident evidence must be hashes-only.');
  ['directIdentifiersPresent', 'rawPayloadStored', 'containsEndpoints', 'containsCredentials', 'containsPrivateKeyMaterial'].forEach((key) => {
    assert(input[key] === false, 'DOKE_PAY_A17_INCIDENT_SENSITIVE_MATERIAL_DENIED', 'Incident sensitive material must remain false: ' + key);
  });
  assert(input.production === false, 'DOKE_PAY_A17_PRODUCTION_DENIED', 'Production incident evidence denied.');
  const previous = options.previousIncidentEvidence || null;
  if (input.incidentSequence === 1) {
    assert(previous == null && input.previousIncidentEvidenceHash == null, 'DOKE_PAY_A17_GENESIS_INCIDENT_PREDECESSOR_DENIED', 'Genesis incident evidence may not reference a predecessor.');
  } else {
    assert(previous && previous.incidentEvidenceVersion === INCIDENT_EVIDENCE_VERSION, 'DOKE_PAY_A17_PREVIOUS_INCIDENT_EVIDENCE_REQUIRED', 'Previous incident evidence is required.');
    assert(previous.incidentEvidenceHash === computeIncidentEvidenceHash(previous), 'DOKE_PAY_A17_PREVIOUS_INCIDENT_INTEGRITY_FAILED', 'Previous incident evidence integrity failed.');
    assert(input.previousIncidentEvidenceHash === previous.incidentEvidenceHash, 'DOKE_PAY_A17_PREVIOUS_INCIDENT_HASH_MISMATCH', 'Previous incident evidence hash mismatch.');
    assert(input.incidentIdHash === previous.incidentIdHash, 'DOKE_PAY_A17_INCIDENT_CHAIN_ID_MISMATCH', 'Incident chain crossed incident id.');
    assert(input.incidentSequence === previous.incidentSequence + 1, 'DOKE_PAY_A17_INCIDENT_SEQUENCE_GAP', 'Incident sequence must be contiguous.');
    assert(input.affectedIssuerIdHash === previous.affectedIssuerIdHash && input.affectedIssuerFamilyHash === previous.affectedIssuerFamilyHash, 'DOKE_PAY_A17_INCIDENT_CHAIN_ISSUER_MISMATCH', 'Incident chain crossed issuer.');
    assert(detectedAt >= parseTime(previous.detectedAt, 'DOKE_PAY_A17_INCIDENT_TIME_INVALID', 'Previous incident detectedAt'), 'DOKE_PAY_A17_INCIDENT_CLOCK_ROLLBACK_DENIED', 'Incident clock rollback denied.');
    const allowed = {
      under_investigation: ['under_investigation', 'contained_offline'],
      contained_offline: ['contained_offline', 'recovery_validated'],
      recovery_validated: ['recovery_validated']
    };
    assert(allowed[previous.containmentState].includes(input.containmentState), 'DOKE_PAY_A17_CONTAINMENT_STATE_ROLLBACK_DENIED', 'Containment-state rollback denied.');
  }
  if (input.containmentState === 'recovery_validated') {
    const recoveryResult = options.recoveryResult;
    assert(recoveryResult && recoveryResult.resultVersion === RECOVERY_RESULT_VERSION && recoveryResult.validationStatus === 'validated_offline', 'DOKE_PAY_A17_VALIDATED_RECOVERY_REQUIRED', 'Validated recovery result is required.');
    assert(recoveryResult.resultFingerprint === computeRecoveryResultFingerprint(recoveryResult), 'DOKE_PAY_A17_RECOVERY_RESULT_INTEGRITY_FAILED', 'Recovery-result integrity failed.');
    assert(detectedAt - parseTime(recoveryResult.completedAt, 'DOKE_PAY_A17_RECOVERY_TIME_INVALID', 'Recovery completedAt') <= MAX_INCIDENT_EVIDENCE_DELAY_SECONDS * 1000, 'DOKE_PAY_A17_INCIDENT_EVIDENCE_DELAY_EXCEEDED', 'Incident evidence delay exceeded.');
  }
  const body = {
    incidentEvidenceVersion: INCIDENT_EVIDENCE_VERSION,
    contractVersion: CONTRACT_VERSION,
    a16ContractVersion: A16_CONTRACT_VERSION,
    ...input
  };
  return Object.freeze({
    ...body,
    incidentEvidenceHash: sha256(canonicalJson(body)),
    networkRequests: 0,
    databaseConnections: 0,
    subprocesses: 0,
    environmentReads: 0,
    productionAllowed: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false
  });
}

function validateIncidentEvidenceChain(items) {
  assert(Array.isArray(items) && items.length >= 1, 'DOKE_PAY_A17_INCIDENT_CHAIN_REQUIRED', 'Incident evidence chain is required.');
  const hashes = new Set();
  items.forEach((item, index) => {
    assert(item && item.incidentEvidenceVersion === INCIDENT_EVIDENCE_VERSION, 'DOKE_PAY_A17_INCIDENT_VERSION_INVALID', 'Incident evidence version is invalid.');
    assert(item.incidentEvidenceHash === computeIncidentEvidenceHash(item), 'DOKE_PAY_A17_INCIDENT_INTEGRITY_FAILED', 'Incident evidence integrity failed.');
    assertZeroEffects(item, 'DOKE_PAY_A17_INCIDENT_AUTHORITY_ESCALATION', 'Incident evidence');
    assert(!hashes.has(item.incidentEvidenceHash), 'DOKE_PAY_A17_INCIDENT_REPLAY_DENIED', 'Incident evidence replay denied.');
    hashes.add(item.incidentEvidenceHash);
    if (index === 0) {
      assert(item.incidentSequence === 1 && item.previousIncidentEvidenceHash == null, 'DOKE_PAY_A17_INCIDENT_GENESIS_INVALID', 'Incident evidence genesis is invalid.');
      return;
    }
    const previous = items[index - 1];
    assert(item.previousIncidentEvidenceHash === previous.incidentEvidenceHash, 'DOKE_PAY_A17_INCIDENT_FORK_DENIED', 'Incident evidence fork denied.');
    assert(item.incidentSequence === previous.incidentSequence + 1, 'DOKE_PAY_A17_INCIDENT_SEQUENCE_GAP', 'Incident sequence gap.');
    assert(item.incidentIdHash === previous.incidentIdHash, 'DOKE_PAY_A17_INCIDENT_CHAIN_ID_MISMATCH', 'Incident chain crossed incident id.');
    assert(item.affectedIssuerIdHash === previous.affectedIssuerIdHash && item.affectedIssuerFamilyHash === previous.affectedIssuerFamilyHash, 'DOKE_PAY_A17_INCIDENT_CHAIN_ISSUER_MISMATCH', 'Incident chain crossed issuer.');
    assert(parseTime(item.detectedAt, 'DOKE_PAY_A17_INCIDENT_TIME_INVALID', 'Incident detectedAt') >= parseTime(previous.detectedAt, 'DOKE_PAY_A17_INCIDENT_TIME_INVALID', 'Previous incident detectedAt'), 'DOKE_PAY_A17_INCIDENT_CLOCK_ROLLBACK_DENIED', 'Incident clock rollback denied.');
    const rank = { under_investigation: 0, contained_offline: 1, recovery_validated: 2 };
    assert(rank[item.containmentState] >= rank[previous.containmentState], 'DOKE_PAY_A17_CONTAINMENT_STATE_ROLLBACK_DENIED', 'Containment-state rollback denied.');
  });
  return Object.freeze({
    chainVersion: INCIDENT_CHAIN_VERSION,
    contractVersion: CONTRACT_VERSION,
    incidentIdHash: items[0].incidentIdHash,
    issuerIdHash: items[0].affectedIssuerIdHash,
    issuerFamilyHash: items[0].affectedIssuerFamilyHash,
    evidenceCount: items.length,
    genesisIncidentEvidenceHash: items[0].incidentEvidenceHash,
    headIncidentEvidenceHash: items[items.length - 1].incidentEvidenceHash,
    containmentState: items[items.length - 1].containmentState,
    hashOnly: true,
    immutable: true,
    forkFree: true,
    replayFree: true,
    networkRequests: 0,
    databaseConnections: 0,
    subprocesses: 0,
    environmentReads: 0,
    productionAllowed: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false
  });
}

function createOperationalAdoptionHandoff(input, options = {}) {
  assertExactKeys(input, [
    'handoffId',
    'checkpointChainHeadHash',
    'recoveryResultFingerprint',
    'incidentChainHeadHash',
    'generatedAt',
    'ownerRoleHashes',
    'reviewerRoleHashes',
    'minimumApprovals',
    'runbookFingerprint',
    'rehearsalEvidenceFingerprint',
    'monitoringContractFingerprint',
    'rollbackProcedureFingerprint',
    'adoptionState',
    'blockers',
    'containsEndpoints',
    'containsCredentials',
    'containsPrivateKeyMaterial',
    'production',
    'remoteExecutionAuthorized',
    'remotePublicationAuthorized',
    'realOperationalAdoptionAuthorized'
  ], 'DOKE_PAY_A17_ADOPTION_HANDOFF_INVALID', 'Operational adoption handoff input');
  assertNoRemoteMaterial(input);
  const checkpointChain = options.checkpointChain;
  const recoveryResult = options.recoveryResult;
  const incidentChain = options.incidentChain;
  assert(checkpointChain && checkpointChain.chainVersion === CHECKPOINT_CHAIN_VERSION, 'DOKE_PAY_A17_CHECKPOINT_CHAIN_REQUIRED', 'Checkpoint chain is required.');
  assert(recoveryResult && recoveryResult.resultVersion === RECOVERY_RESULT_VERSION, 'DOKE_PAY_A17_RECOVERY_RESULT_REQUIRED', 'Recovery result is required.');
  assert(recoveryResult.resultFingerprint === computeRecoveryResultFingerprint(recoveryResult), 'DOKE_PAY_A17_RECOVERY_RESULT_INTEGRITY_FAILED', 'Recovery result integrity failed.');
  assert(incidentChain && incidentChain.chainVersion === INCIDENT_CHAIN_VERSION, 'DOKE_PAY_A17_INCIDENT_CHAIN_REQUIRED', 'Incident chain is required.');
  assertId(input.handoffId, 'DOKE_PAY_A17_HANDOFF_ID_INVALID', 'Handoff id');
  assert(input.checkpointChainHeadHash === checkpointChain.headCheckpointHash, 'DOKE_PAY_A17_HANDOFF_CHECKPOINT_HEAD_MISMATCH', 'Handoff checkpoint head mismatch.');
  assert(input.recoveryResultFingerprint === recoveryResult.resultFingerprint, 'DOKE_PAY_A17_HANDOFF_RECOVERY_RESULT_MISMATCH', 'Handoff recovery-result mismatch.');
  assert(input.incidentChainHeadHash === incidentChain.headIncidentEvidenceHash, 'DOKE_PAY_A17_HANDOFF_INCIDENT_HEAD_MISMATCH', 'Handoff incident head mismatch.');
  parseTime(input.generatedAt, 'DOKE_PAY_A17_HANDOFF_TIME_INVALID', 'Handoff generatedAt');
  assertCanonicalHashList(input.ownerRoleHashes, 1, 'DOKE_PAY_A17_OWNER_ROLES_INVALID', 'Owner roles');
  assertCanonicalHashList(input.reviewerRoleHashes, MINIMUM_APPROVALS, 'DOKE_PAY_A17_REVIEWER_ROLES_INVALID', 'Reviewer roles');
  assert(input.ownerRoleHashes.every((value) => !input.reviewerRoleHashes.includes(value)), 'DOKE_PAY_A17_ROLE_SEPARATION_REQUIRED', 'Owner and reviewer roles must be separated.');
  assert(Number.isInteger(input.minimumApprovals) && input.minimumApprovals >= MINIMUM_APPROVALS && input.minimumApprovals <= input.reviewerRoleHashes.length, 'DOKE_PAY_A17_MINIMUM_APPROVALS_INVALID', 'Minimum approvals is invalid.');
  ['runbookFingerprint', 'rehearsalEvidenceFingerprint', 'monitoringContractFingerprint', 'rollbackProcedureFingerprint'].forEach((key) => {
    assertHash(input[key], 'DOKE_PAY_A17_HANDOFF_FINGERPRINT_INVALID', key);
  });
  assert(input.adoptionState === 'blocked_repository_only', 'DOKE_PAY_A17_ADOPTION_STATE_INVALID', 'Operational adoption must remain blocked.');
  assert(JSON.stringify(input.blockers) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'DOKE_PAY_A17_BLOCKERS_CHANGED', 'PAY blockers changed.');
  ['containsEndpoints', 'containsCredentials', 'containsPrivateKeyMaterial', 'production', 'remoteExecutionAuthorized', 'remotePublicationAuthorized', 'realOperationalAdoptionAuthorized'].forEach((key) => {
    assert(input[key] === false, 'DOKE_PAY_A17_ADOPTION_AUTHORITY_DENIED', 'Adoption authority must remain false: ' + key);
  });
  const body = {
    handoffVersion: ADOPTION_HANDOFF_VERSION,
    contractVersion: CONTRACT_VERSION,
    a16ContractVersion: A16_CONTRACT_VERSION,
    ...input,
    readyForOperationalAdoption: false,
    nextAction: 'PAY-A18'
  };
  return Object.freeze({
    ...body,
    handoffFingerprint: computeOperationalAdoptionHandoffFingerprint(body),
    networkRequests: 0,
    databaseConnections: 0,
    subprocesses: 0,
    environmentReads: 0,
    productionAllowed: false
  });
}

function evaluateOperationalAdoption(handoff, input) {
  assert(handoff && handoff.handoffVersion === ADOPTION_HANDOFF_VERSION, 'DOKE_PAY_A17_ADOPTION_HANDOFF_REQUIRED', 'Operational adoption handoff is required.');
  assert(handoff.handoffFingerprint === computeOperationalAdoptionHandoffFingerprint(handoff), 'DOKE_PAY_A17_ADOPTION_HANDOFF_INTEGRITY_FAILED', 'Operational adoption handoff integrity failed.');
  assertExactKeys(input, [
    'decisionId',
    'handoffFingerprint',
    'decidedAt',
    'decision',
    'approverRoleHashes',
    'minimumApprovals',
    'production',
    'remoteExecutionAuthorized',
    'remotePublicationAuthorized',
    'realOperationalAdoptionAuthorized'
  ], 'DOKE_PAY_A17_ADOPTION_DECISION_INVALID', 'Operational adoption decision input');
  assertNoRemoteMaterial(input);
  assertId(input.decisionId, 'DOKE_PAY_A17_ADOPTION_DECISION_ID_INVALID', 'Adoption decision id');
  assert(input.handoffFingerprint === handoff.handoffFingerprint, 'DOKE_PAY_A17_ADOPTION_DECISION_HANDOFF_MISMATCH', 'Adoption decision handoff mismatch.');
  parseTime(input.decidedAt, 'DOKE_PAY_A17_ADOPTION_DECISION_TIME_INVALID', 'Adoption decision decidedAt');
  assert(ADOPTION_STATES.includes(input.decision), 'DOKE_PAY_A17_OPERATIONAL_ADOPTION_DENIED', 'Operational adoption remains blocked.');
  assertCanonicalHashList(input.approverRoleHashes, MINIMUM_APPROVALS, 'DOKE_PAY_A17_APPROVER_ROLES_INVALID', 'Approver roles');
  assert(Number.isInteger(input.minimumApprovals) && input.minimumApprovals >= MINIMUM_APPROVALS && input.minimumApprovals <= input.approverRoleHashes.length, 'DOKE_PAY_A17_MINIMUM_APPROVALS_INVALID', 'Minimum approvals is invalid.');
  ['production', 'remoteExecutionAuthorized', 'remotePublicationAuthorized', 'realOperationalAdoptionAuthorized'].forEach((key) => {
    assert(input[key] === false, 'DOKE_PAY_A17_OPERATIONAL_ADOPTION_DENIED', 'Operational adoption authority must remain false: ' + key);
  });
  const body = {
    decisionVersion: ADOPTION_DECISION_VERSION,
    contractVersion: CONTRACT_VERSION,
    ...input,
    blockers: handoff.blockers,
    readyForOperationalAdoption: false,
    nextAction: 'PAY-A18'
  };
  return Object.freeze({
    ...body,
    decisionFingerprint: computeOperationalAdoptionDecisionFingerprint(body),
    networkRequests: 0,
    databaseConnections: 0,
    subprocesses: 0,
    environmentReads: 0,
    productionAllowed: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false,
    realOperationalAdoptionAuthorized: false
  });
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  CHECKPOINT_VERSION,
  CHECKPOINT_CHAIN_VERSION,
  RECOVERY_PLAN_VERSION,
  RECOVERY_RESULT_VERSION,
  INCIDENT_EVIDENCE_VERSION,
  INCIDENT_CHAIN_VERSION,
  ADOPTION_HANDOFF_VERSION,
  ADOPTION_DECISION_VERSION,
  A16_CONTRACT_VERSION,
  MINIMUM_WITNESSES,
  MINIMUM_APPROVALS,
  MAX_CHECKPOINT_INTERVAL_SECONDS,
  MAX_RECOVERY_WINDOW_SECONDS,
  MAX_INCIDENT_EVIDENCE_DELAY_SECONDS,
  PUBLICATION_MODES,
  RECOVERY_MODES,
  DETECTION_CLASSES,
  CONTAINMENT_STATES,
  ADOPTION_STATES,
  computeTransparencyCheckpointHash,
  computeRecoveryPlanFingerprint,
  computeRecoveryResultFingerprint,
  computeIncidentEvidenceHash,
  computeOperationalAdoptionHandoffFingerprint,
  computeOperationalAdoptionDecisionFingerprint,
  createTransparencyCheckpoint,
  validateTransparencyCheckpointChain,
  createRecoveryPlan,
  validateRecoveryResult,
  createCachePoisoningIncidentEvidence,
  validateIncidentEvidenceChain,
  createOperationalAdoptionHandoff,
  evaluateOperationalAdoption
});
