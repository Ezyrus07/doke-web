'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fixture = require('../tests/fixtures/pay-a17-transparency-recovery-incident-handoff-cases.json');
const contract = require('../backend/modules/payments/payment-reconciliation-transparency-recovery');
const a16 = require('../backend/modules/payments/payment-reconciliation-identity-status-resilience');

const h = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const sorted = (...values) => values.slice().sort();
const clone = (value) => JSON.parse(JSON.stringify(value));
const WITNESSES = sorted(h('witness.1'), h('witness.2'), h('witness.3'));
const ROLES = sorted(h('role.1'), h('role.2'), h('role.3'));
const OWNER_ROLES = [h('owner.1')];
const REVIEWER_ROLES = sorted(h('reviewer.1'), h('reviewer.2'), h('reviewer.3'));
const REPLICAS = sorted(h('replica.1'), h('replica.2'));
const CACHE_ENTRIES = sorted(h('cache.1'), h('cache.2'));

function buildManifest(epoch, lifecycleSequence, issuedAt, label) {
  const body = {
    manifestVersion: a16.DISTRIBUTION_MANIFEST_VERSION,
    contractVersion: a16.CONTRACT_VERSION,
    manifestId: 'manifest.' + label.padEnd(8, 'x'),
    issuerIdHash: h('issuer.1'),
    issuerFamilyHash: h('issuer-family.1'),
    issuerRecordFingerprint: h('issuer-record.1'),
    trustBundleFingerprint: h('trust-bundle.1'),
    sourceSnapshotFingerprint: h('snapshot.' + label),
    lifecycleEventHash: h('lifecycle.' + lifecycleSequence),
    lifecycleSequence,
    distributionEpoch: epoch,
    previousManifestFingerprint: epoch === 1 ? null : h('manifest.previous.' + epoch),
    issuedAt,
    expiresAt: new Date(Date.parse(issuedAt) + 900000).toISOString(),
    cacheTtlSeconds: 60,
    staleWhileRevalidateSeconds: 120,
    channels: ['offline_bundle', 'primary'],
    minimumReplicas: 2,
    payloadHash: h('payload.' + label),
    production: false,
    containsEndpoints: false,
    containsCredentials: false,
    containsPrivateKeyMaterial: false
  };
  return Object.freeze({ ...body, manifestFingerprint: a16.computeDistributionManifestFingerprint(body) });
}
function buildCacheProof(manifest, label) {
  const body = {
    proofVersion: a16.CACHE_PROOF_VERSION,
    contractVersion: a16.CONTRACT_VERSION,
    manifestFingerprint: manifest.manifestFingerprint,
    issuerIdHash: manifest.issuerIdHash,
    distributionEpoch: manifest.distributionEpoch,
    replicaHashes: REPLICAS,
    consistent: true,
    observedAt: manifest.issuedAt
  };
  return Object.freeze({ ...body, proofFingerprint: a16.computeCacheProofFingerprint(body) });
}
function buildQuorum(manifest, label) {
  const body = {
    decisionVersion: a16.QUORUM_DECISION_VERSION,
    contractVersion: a16.CONTRACT_VERSION,
    decisionId: 'quorum.' + label.padEnd(8, 'x'),
    decision: 'healthy_quorum',
    issuerHealthFingerprints: sorted(h('health.1.' + label), h('health.2.' + label)),
    observedAt: manifest.issuedAt,
    minimumIssuerQuorum: 2,
    productionAllowed: false,
    remoteExecutionAuthorized: false,
    remoteDistributionConfigured: false
  };
  return Object.freeze({ ...body, decisionFingerprint: a16.computeQuorumDecisionFingerprint(body) });
}
function checkpointInput(manifest, proof, quorum, sequence, previous, observedAt, treeSize, label) {
  return {
    checkpointId: 'checkpoint.' + label.padEnd(8, 'x'),
    checkpointSequence: sequence,
    previousCheckpointHash: previous ? previous.checkpointHash : null,
    distributionManifestFingerprint: manifest.manifestFingerprint,
    distributionEpoch: manifest.distributionEpoch,
    lifecycleSequence: manifest.lifecycleSequence,
    issuerIdHash: manifest.issuerIdHash,
    issuerFamilyHash: manifest.issuerFamilyHash,
    cacheProofFingerprint: proof.proofFingerprint,
    quorumDecisionFingerprint: quorum.decisionFingerprint,
    observedAt,
    treeSize,
    rootHash: h('root.' + label),
    witnessHashes: WITNESSES,
    publicationMode: 'offline_bundle',
    containsEndpoints: false,
    containsCredentials: false,
    containsPrivateKeyMaterial: false,
    production: false
  };
}
function buildScenario() {
  const manifest1 = buildManifest(7, 4, '2026-08-04T10:00:00.000Z', 'one');
  const proof1 = buildCacheProof(manifest1, 'one');
  const quorum1 = buildQuorum(manifest1, 'one');
  const cp1Input = checkpointInput(manifest1, proof1, quorum1, 1, null, '2026-08-04T10:01:00.000Z', 1, 'one');
  const cp1 = contract.createTransparencyCheckpoint(cp1Input, { manifest: manifest1, cacheProof: proof1, quorumDecision: quorum1 });

  const manifest2 = buildManifest(8, 4, '2026-08-04T10:02:00.000Z', 'two');
  const proof2 = buildCacheProof(manifest2, 'two');
  const quorum2 = buildQuorum(manifest2, 'two');
  const cp2Input = checkpointInput(manifest2, proof2, quorum2, 2, cp1, '2026-08-04T10:03:00.000Z', 2, 'two');
  const cp2 = contract.createTransparencyCheckpoint(cp2Input, { manifest: manifest2, cacheProof: proof2, quorumDecision: quorum2, previousCheckpoint: cp1 });

  const manifest3 = buildManifest(9, 5, '2026-08-04T10:04:00.000Z', 'three');
  const proof3 = buildCacheProof(manifest3, 'three');
  const quorum3 = buildQuorum(manifest3, 'three');
  const cp3Input = checkpointInput(manifest3, proof3, quorum3, 3, cp2, '2026-08-04T10:05:00.000Z', 3, 'three');
  const cp3 = contract.createTransparencyCheckpoint(cp3Input, { manifest: manifest3, cacheProof: proof3, quorumDecision: quorum3, previousCheckpoint: cp2 });
  const checkpointChain = contract.validateTransparencyCheckpointChain([cp1, cp2, cp3]);

  const planInput = {
    recoveryId: 'recovery.alpha',
    incidentIdHash: h('incident.1'),
    compromisedCheckpointHash: cp2.checkpointHash,
    lastKnownGoodCheckpointHash: cp1.checkpointHash,
    targetManifestFingerprint: manifest3.manifestFingerprint,
    targetDistributionEpoch: manifest3.distributionEpoch,
    targetLifecycleSequence: manifest3.lifecycleSequence,
    plannedAt: '2026-08-04T10:06:00.000Z',
    recoveryMode: 'forward_only_rebuild',
    invalidatedCacheEntryFingerprints: CACHE_ENTRIES,
    requiredWitnessHashes: WITNESSES,
    operatorRoleHashes: ROLES,
    minimumApprovals: 2,
    containsEndpoints: false,
    containsCredentials: false,
    containsPrivateKeyMaterial: false,
    automaticExecutionAuthorized: false,
    production: false
  };
  const plan = contract.createRecoveryPlan(planInput, {
    compromisedCheckpoint: cp2,
    lastKnownGoodCheckpoint: cp1,
    targetManifest: manifest3
  });
  const resultInput = {
    resultVersion: contract.RECOVERY_RESULT_VERSION,
    recoveryId: plan.recoveryId,
    planFingerprint: plan.planFingerprint,
    completedAt: '2026-08-04T10:07:00.000Z',
    rebuiltCheckpointHash: cp3.checkpointHash,
    rebuiltManifestFingerprint: manifest3.manifestFingerprint,
    resultingDistributionEpoch: manifest3.distributionEpoch,
    resultingLifecycleSequence: manifest3.lifecycleSequence,
    invalidatedCacheEntryFingerprints: CACHE_ENTRIES,
    validationStatus: 'validated_offline',
    automaticRemoteExecutionPerformed: false,
    networkRequests: 0,
    databaseConnections: 0,
    subprocesses: 0,
    environmentReads: 0,
    productionAllowed: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false
  };
  const recoveryResult = contract.validateRecoveryResult(plan, resultInput, { rebuiltCheckpoint: cp3 });

  const incident1Input = {
    incidentIdHash: h('incident.1'),
    incidentSequence: 1,
    previousIncidentEvidenceHash: null,
    detectedAt: '2026-08-04T10:06:30.000Z',
    detectionClass: 'manifest_mismatch',
    affectedIssuerIdHash: manifest1.issuerIdHash,
    affectedIssuerFamilyHash: manifest1.issuerFamilyHash,
    compromisedCheckpointHash: cp2.checkpointHash,
    compromisedCacheEntryFingerprints: CACHE_ENTRIES,
    observedReplicaHashes: REPLICAS,
    expectedManifestFingerprint: manifest2.manifestFingerprint,
    observedManifestFingerprints: sorted(manifest2.manifestFingerprint, h('poisoned.manifest')),
    poisonedPayloadHashes: [h('poisoned.payload')],
    containmentState: 'under_investigation',
    evidenceHashOnly: true,
    directIdentifiersPresent: false,
    rawPayloadStored: false,
    containsEndpoints: false,
    containsCredentials: false,
    containsPrivateKeyMaterial: false,
    production: false
  };
  const incident1 = contract.createCachePoisoningIncidentEvidence(incident1Input);
  const incident2Input = {
    ...incident1Input,
    incidentSequence: 2,
    previousIncidentEvidenceHash: incident1.incidentEvidenceHash,
    detectedAt: '2026-08-04T10:07:30.000Z',
    containmentState: 'contained_offline'
  };
  const incident2 = contract.createCachePoisoningIncidentEvidence(incident2Input, { previousIncidentEvidence: incident1 });
  const incident3Input = {
    ...incident2Input,
    incidentSequence: 3,
    previousIncidentEvidenceHash: incident2.incidentEvidenceHash,
    detectedAt: '2026-08-04T10:08:00.000Z',
    containmentState: 'recovery_validated'
  };
  const incident3 = contract.createCachePoisoningIncidentEvidence(incident3Input, {
    previousIncidentEvidence: incident2,
    recoveryResult
  });
  const incidentChain = contract.validateIncidentEvidenceChain([incident1, incident2, incident3]);

  const handoffInput = {
    handoffId: 'handoff.alpha',
    checkpointChainHeadHash: checkpointChain.headCheckpointHash,
    recoveryResultFingerprint: recoveryResult.resultFingerprint,
    incidentChainHeadHash: incidentChain.headIncidentEvidenceHash,
    generatedAt: '2026-08-04T10:09:00.000Z',
    ownerRoleHashes: OWNER_ROLES,
    reviewerRoleHashes: REVIEWER_ROLES,
    minimumApprovals: 2,
    runbookFingerprint: h('runbook'),
    rehearsalEvidenceFingerprint: h('rehearsal'),
    monitoringContractFingerprint: h('monitoring'),
    rollbackProcedureFingerprint: h('rollback-procedure'),
    adoptionState: 'blocked_repository_only',
    blockers: ['PAY-B01', 'PAY-B03', 'PAY-B04'],
    containsEndpoints: false,
    containsCredentials: false,
    containsPrivateKeyMaterial: false,
    production: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false,
    realOperationalAdoptionAuthorized: false
  };
  const handoff = contract.createOperationalAdoptionHandoff(handoffInput, {
    checkpointChain,
    recoveryResult,
    incidentChain
  });
  const decisionInput = {
    decisionId: 'decision.alpha',
    handoffFingerprint: handoff.handoffFingerprint,
    decidedAt: '2026-08-04T10:10:00.000Z',
    decision: 'blocked_repository_only',
    approverRoleHashes: REVIEWER_ROLES,
    minimumApprovals: 2,
    production: false,
    remoteExecutionAuthorized: false,
    remotePublicationAuthorized: false,
    realOperationalAdoptionAuthorized: false
  };
  const decision = contract.evaluateOperationalAdoption(handoff, decisionInput);
  return {
    manifest1, proof1, quorum1, cp1Input, cp1,
    manifest2, proof2, quorum2, cp2Input, cp2,
    manifest3, proof3, quorum3, cp3Input, cp3,
    checkpointChain, planInput, plan, resultInput, recoveryResult,
    incident1Input, incident1, incident2Input, incident2,
    incident3Input, incident3, incidentChain,
    handoffInput, handoff, decisionInput, decision
  };
}

function setPath(target, path, value) {
  const parts = path.split('.');
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = /^\d+$/u.test(parts[index]) ? Number(parts[index]) : parts[index];
    cursor = cursor[key];
  }
  const finalKey = /^\d+$/u.test(parts[parts.length - 1]) ? Number(parts[parts.length - 1]) : parts[parts.length - 1];
  cursor[finalKey] = value;
}
function expectCode(expectedCode, fn, id) {
  let caught = null;
  try { fn(); } catch (error) { caught = error; }
  assert(caught, id + ' must throw.');
  assert.equal(caught.code, expectedCode, id + ' returned unexpected code: ' + (caught && caught.code));
}
function runPositive(id, scenario) {
  const map = {
    checkpoint_genesis_valid: () => assert.equal(scenario.cp1.checkpointVersion, contract.CHECKPOINT_VERSION),
    checkpoint_successor_valid: () => assert.equal(scenario.cp2.previousCheckpointHash, scenario.cp1.checkpointHash),
    checkpoint_chain_valid: () => assert.equal(scenario.checkpointChain.checkpointCount, 3),
    recovery_plan_valid: () => assert.equal(scenario.plan.forwardOnly === undefined, true),
    recovery_result_valid: () => assert.equal(scenario.recoveryResult.rollbackSafe, true),
    incident_genesis_valid: () => assert.equal(scenario.incident1.incidentSequence, 1),
    incident_contained_valid: () => assert.equal(scenario.incident2.containmentState, 'contained_offline'),
    incident_recovery_validated: () => assert.equal(scenario.incident3.containmentState, 'recovery_validated'),
    incident_chain_valid: () => assert.equal(scenario.incidentChain.evidenceCount, 3),
    adoption_handoff_valid: () => assert.equal(scenario.handoff.readyForOperationalAdoption, false),
    adoption_decision_blocked: () => assert.equal(scenario.decision.decision, 'blocked_repository_only'),
    effects_remain_zero: () => {
      [scenario.cp3, scenario.plan, scenario.recoveryResult, scenario.incident3, scenario.handoff, scenario.decision].forEach((item) => {
        assert.equal(item.networkRequests, 0);
        assert.equal(item.databaseConnections, 0);
        assert.equal(item.subprocesses, 0);
        assert.equal(item.environmentReads, 0);
        assert.equal(item.productionAllowed, false);
      });
    }
  };
  assert(map[id], 'Unknown positive case: ' + id);
  map[id]();
}
function executeNegative(entry) {
  const s = buildScenario();
  let input;
  let options;
  let chain;
  let result;
  let handoff;
  switch (entry.target) {
    case 'checkpointGenesis':
      input = clone(s.cp1Input);
      options = { manifest: clone(s.manifest1), cacheProof: clone(s.proof1), quorumDecision: clone(s.quorum1) };
      break;
    case 'checkpointSuccessor':
      input = clone(s.cp2Input);
      options = { manifest: clone(s.manifest2), cacheProof: clone(s.proof2), quorumDecision: clone(s.quorum2), previousCheckpoint: clone(s.cp1) };
      break;
    case 'checkpointChain':
      chain = clone([s.cp1, s.cp2, s.cp3]);
      break;
    case 'recoveryPlan':
      input = clone(s.planInput);
      options = { compromisedCheckpoint: clone(s.cp2), lastKnownGoodCheckpoint: clone(s.cp1), targetManifest: clone(s.manifest3) };
      break;
    case 'recoveryResult':
      result = clone(s.resultInput);
      options = { rebuiltCheckpoint: clone(s.cp3) };
      break;
    case 'incidentGenesis':
      input = clone(s.incident1Input);
      options = {};
      break;
    case 'incidentSuccessor':
      input = clone(s.incident2Input);
      options = { previousIncidentEvidence: clone(s.incident1) };
      break;
    case 'incidentRecovered':
      input = clone(s.incident3Input);
      options = { previousIncidentEvidence: clone(s.incident2), recoveryResult: clone(s.recoveryResult) };
      break;
    case 'incidentChain':
      chain = clone([s.incident1, s.incident2, s.incident3]);
      break;
    case 'handoff':
      input = clone(s.handoffInput);
      options = { checkpointChain: clone(s.checkpointChain), recoveryResult: clone(s.recoveryResult), incidentChain: clone(s.incidentChain) };
      break;
    case 'adoption':
      input = clone(s.decisionInput);
      handoff = clone(s.handoff);
      break;
    default:
      throw new Error('Unknown negative target: ' + entry.target);
  }

  if (entry.special) {
    switch (entry.special) {
      case 'checkpoint_epoch_rollback': {
        const manifest = clone(s.manifest2);
        manifest.distributionEpoch = 6;
        manifest.manifestFingerprint = a16.computeDistributionManifestFingerprint(manifest);
        options.manifest = manifest;
        options.cacheProof.manifestFingerprint = manifest.manifestFingerprint;
        options.cacheProof.proofFingerprint = a16.computeCacheProofFingerprint(options.cacheProof);
        input.distributionManifestFingerprint = manifest.manifestFingerprint;
        input.cacheProofFingerprint = options.cacheProof.proofFingerprint;
        input.distributionEpoch = 6;
        break;
      }
      case 'checkpoint_lifecycle_rollback': {
        const manifest = clone(s.manifest2);
        manifest.lifecycleSequence = 3;
        manifest.manifestFingerprint = a16.computeDistributionManifestFingerprint(manifest);
        options.manifest = manifest;
        options.cacheProof.manifestFingerprint = manifest.manifestFingerprint;
        options.cacheProof.proofFingerprint = a16.computeCacheProofFingerprint(options.cacheProof);
        input.distributionManifestFingerprint = manifest.manifestFingerprint;
        input.cacheProofFingerprint = options.cacheProof.proofFingerprint;
        input.lifecycleSequence = 3;
        break;
      }
      case 'chain_empty':
        chain = [];
        break;
      case 'checkpoint_chain_replay':
        chain = [clone(s.cp1), clone(s.cp1)];
        break;
      case 'checkpoint_chain_fork':
        chain[2].previousCheckpointHash = h('fork');
        chain[2].checkpointHash = contract.computeTransparencyCheckpointHash(chain[2]);
        break;
      case 'checkpoint_chain_sequence_gap':
        chain[2].checkpointSequence = 5;
        chain[2].checkpointHash = contract.computeTransparencyCheckpointHash(chain[2]);
        break;
      case 'checkpoint_chain_epoch_rollback':
        chain[2].distributionEpoch = 7;
        chain[2].checkpointHash = contract.computeTransparencyCheckpointHash(chain[2]);
        break;
      case 'recovery_last_good_order':
        options.lastKnownGoodCheckpoint = clone(s.cp2);
        input.lastKnownGoodCheckpointHash = s.cp2.checkpointHash;
        break;
      case 'recovery_forward_only_epoch': {
        const manifest = clone(s.manifest3);
        manifest.distributionEpoch = s.cp2.distributionEpoch;
        manifest.manifestFingerprint = a16.computeDistributionManifestFingerprint(manifest);
        options.targetManifest = manifest;
        input.targetManifestFingerprint = manifest.manifestFingerprint;
        input.targetDistributionEpoch = manifest.distributionEpoch;
        break;
      }
      case 'recovery_lifecycle_rollback': {
        const manifest = clone(s.manifest3);
        manifest.lifecycleSequence = 3;
        manifest.manifestFingerprint = a16.computeDistributionManifestFingerprint(manifest);
        options.targetManifest = manifest;
        input.targetManifestFingerprint = manifest.manifestFingerprint;
        input.targetLifecycleSequence = manifest.lifecycleSequence;
        break;
      }
      case 'recovery_result_checkpoint_reuse':
        result.rebuiltCheckpointHash = s.cp2.checkpointHash;
        break;
      case 'incident_no_manifest_mismatch':
        input.observedManifestFingerprints = [input.expectedManifestFingerprint];
        break;
      case 'incident_chain_replay':
        chain = [clone(s.incident1), clone(s.incident1)];
        break;
      case 'handoff_role_overlap':
        input.reviewerRoleHashes = sorted(input.ownerRoleHashes[0], h('reviewer.2'));
        break;
      default:
        throw new Error('Unknown special mutation: ' + entry.special);
    }
  }
  if (entry.path) {
    const root = { input, options, chain, result, handoff };
    setPath(root, entry.path, entry.value);
  }

  const invoke = {
    checkpointGenesis: () => contract.createTransparencyCheckpoint(input, options),
    checkpointSuccessor: () => contract.createTransparencyCheckpoint(input, options),
    checkpointChain: () => contract.validateTransparencyCheckpointChain(chain),
    recoveryPlan: () => contract.createRecoveryPlan(input, options),
    recoveryResult: () => contract.validateRecoveryResult(clone(s.plan), result, options),
    incidentGenesis: () => contract.createCachePoisoningIncidentEvidence(input, options),
    incidentSuccessor: () => contract.createCachePoisoningIncidentEvidence(input, options),
    incidentRecovered: () => contract.createCachePoisoningIncidentEvidence(input, options),
    incidentChain: () => contract.validateIncidentEvidenceChain(chain),
    handoff: () => contract.createOperationalAdoptionHandoff(input, options),
    adoption: () => contract.evaluateOperationalAdoption(handoff, input)
  }[entry.target];
  expectCode(entry.expectedCode, invoke, entry.id);
}

assert.equal(fixture.contractVersion, contract.CONTRACT_VERSION);
assert.equal(fixture.totalCases, fixture.positiveCases.length + fixture.negativeCases.length);
assert.equal(new Set([...fixture.positiveCases, ...fixture.negativeCases].map((item) => item.id)).size, fixture.totalCases);

const baseline = buildScenario();
fixture.positiveCases.forEach((item) => runPositive(item.id, baseline));
fixture.negativeCases.forEach(executeNegative);

console.log(JSON.stringify({
  contractVersion: contract.CONTRACT_VERSION,
  totalCases: fixture.totalCases,
  positiveCases: fixture.positiveCases.length,
  negativeCases: fixture.negativeCases.length,
  passedCases: fixture.totalCases,
  networkRequests: 0,
  databaseConnections: 0,
  subprocesses: 0,
  environmentReads: 0
}));
