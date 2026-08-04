'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fixture = require('../tests/fixtures/pay-a18-witness-proof-rehearsal-adoption-gate-cases.json');
const C = require('../backend/modules/payments/payment-reconciliation-witness-proof-rehearsal');
const A = require('../backend/modules/payments/payment-reconciliation-transparency-recovery');
const { canonicalJson, sha256 } = require('../backend/modules/payments/payment-reconciliation-executor-adapter');
const h = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
const sort = (...v) => v.sort();
const cp = (v) => JSON.parse(JSON.stringify(v));
const effects = { networkRequests: 0, databaseConnections: 0, subprocesses: 0, environmentReads: 0, productionAllowed: false, remoteExecutionAuthorized: false, remotePublicationAuthorized: false };
function fp(v, field) { const b = { ...v }; [field, ...Object.keys(effects), 'providerContactAuthorized', 'realOperationalAdoptionAuthorized'].forEach((k) => delete b[k]); return sha256(canonicalJson(b)); }
function error(code, fn) { assert.throws(fn, (e) => e && e.code === code, 'Expected ' + code); }
function checkpoint(seq, size, root, at, prev = null) {
  const b = { checkpointVersion: A.CHECKPOINT_VERSION, contractVersion: A.CONTRACT_VERSION, a16ContractVersion: 'pay-a16-issuer-status-distribution-resilience-v1', checkpointId: 'checkpoint.a18.' + seq, checkpointSequence: seq, previousCheckpointHash: prev, distributionManifestFingerprint: h('manifest.' + seq), distributionEpoch: 20 + seq, lifecycleSequence: 10 + seq, issuerIdHash: h('issuer'), issuerFamilyHash: h('family'), cacheProofFingerprint: h('cache.' + seq), quorumDecisionFingerprint: h('quorum.' + seq), observedAt: at, treeSize: size, rootHash: root, witnessHashes: sort(h('legacy.1'), h('legacy.2')), publicationMode: 'offline_bundle', containsEndpoints: false, containsCredentials: false, containsPrivateKeyMaterial: false, production: false };
  return Object.freeze({ ...b, checkpointHash: A.computeTransparencyCheckpointHash(b), ...effects });
}
function a17Assets(target) {
  const rb = { resultVersion: A.RECOVERY_RESULT_VERSION, contractVersion: A.CONTRACT_VERSION, recoveryId: 'recovery.a18', planFingerprint: h('plan'), completedAt: '2026-08-04T14:04:00.000Z', rebuiltCheckpointHash: target.checkpointHash, rebuiltManifestFingerprint: target.distributionManifestFingerprint, resultingDistributionEpoch: target.distributionEpoch, resultingLifecycleSequence: target.lifecycleSequence, invalidatedCacheEntryFingerprints: sort(h('entry.1'), h('entry.2')), validationStatus: 'validated_offline', automaticRemoteExecutionPerformed: false };
  const recoveryResult = Object.freeze({ ...rb, resultFingerprint: A.computeRecoveryResultFingerprint(rb), ...effects });
  const hb = { handoffVersion: A.ADOPTION_HANDOFF_VERSION, contractVersion: A.CONTRACT_VERSION, a16ContractVersion: rb.contractVersion, handoffId: 'handoff.a18', checkpointChainHeadHash: target.checkpointHash, recoveryResultFingerprint: recoveryResult.resultFingerprint, incidentChainHeadHash: h('incident'), generatedAt: '2026-08-04T14:10:00.000Z', ownerRoleHashes: [h('owner')], reviewerRoleHashes: sort(h('reviewer.1'), h('reviewer.2')), minimumApprovals: 2, runbookFingerprint: h('runbook'), rehearsalEvidenceFingerprint: h('legacy-rehearsal'), monitoringContractFingerprint: h('monitoring'), rollbackProcedureFingerprint: h('rollback'), adoptionState: 'blocked_repository_only', blockers: ['PAY-B01','PAY-B03','PAY-B04'], containsEndpoints: false, containsCredentials: false, containsPrivateKeyMaterial: false, production: false, remoteExecutionAuthorized: false, remotePublicationAuthorized: false, realOperationalAdoptionAuthorized: false, readyForOperationalAdoption: false, nextAction: 'PAY-A18' };
  const handoff = Object.freeze({ ...hb, handoffFingerprint: A.computeOperationalAdoptionHandoffFingerprint(hb), ...effects });
  const db = { decisionVersion: A.ADOPTION_DECISION_VERSION, contractVersion: A.CONTRACT_VERSION, decisionId: 'decision.a18', handoffFingerprint: handoff.handoffFingerprint, decidedAt: '2026-08-04T14:11:00.000Z', decision: 'blocked_repository_only', approverRoleHashes: sort(h('reviewer.1'), h('reviewer.2')), minimumApprovals: 2, production: false, remoteExecutionAuthorized: false, remotePublicationAuthorized: false, realOperationalAdoptionAuthorized: false, blockers: hb.blockers, readyForOperationalAdoption: false, nextAction: 'PAY-A18' };
  const decision = Object.freeze({ ...db, decisionFingerprint: A.computeOperationalAdoptionDecisionFingerprint(db), ...effects });
  return { recoveryResult, handoff, decision };
}
function witness(label) { return { witnessIdHash: h('witness.' + label), operatorIdHash: h('operator.' + label), operatorFamilyHash: h('family.' + label), protocolSuite: 'doke_merkle_sha256_v1', protocolVersion: 1, publicKeyFingerprint: h('key.' + label), supportedProofVersions: [C.CONSISTENCY_PROOF_VERSION, C.INCLUSION_PROOF_VERSION].sort(), supportedAttestationVersions: [C.REHEARSAL_ATTESTATION_VERSION], issuedAt: '2026-08-04T14:00:00.000Z', expiresAt: '2026-08-05T13:00:00.000Z', independentOperator: true, containsEndpoints: false, containsCredentials: false, containsPrivateKeyMaterial: false, production: false }; }
function scenario() {
  const leaf = h('leaf'), path = [{ side: 'right', hash: h('sibling') }];
  const oldCheckpoint = checkpoint(1, 1, C.hashMerkleLeaf(h('old')), '2026-08-04T14:00:00.000Z');
  const newCheckpoint = checkpoint(2, 2, C.computeInclusionRoot(leaf, path), '2026-08-04T14:02:00.000Z', oldCheckpoint.checkpointHash);
  const x = a17Assets(newCheckpoint), wa = witness('a'), wb = witness('b');
  const profileA = C.createWitnessProfile(wa), profileB = C.createWitnessProfile(wb);
  const qi = { quorumId: 'witness-quorum.alpha', checkpointHash: newCheckpoint.checkpointHash, selectedWitnessProfileFingerprints: sort(profileA.witnessProfileFingerprint, profileB.witnessProfileFingerprint), minimumWitnesses: 2, evaluatedAt: '2026-08-04T14:03:00.000Z', production: false, remoteExecutionAuthorized: false, remotePublicationAuthorized: false };
  const quorum = C.validateWitnessInteroperability([profileA, profileB], qi);
  const ii = { proofId: 'inclusion-proof.alpha', checkpointHash: newCheckpoint.checkpointHash, checkpointRootHash: newCheckpoint.rootHash, leafHash: leaf, leafIndex: 0, treeSize: 2, path, witnessQuorumFingerprint: quorum.witnessQuorumFingerprint, verifiedAt: '2026-08-04T14:04:00.000Z', proofMode: 'offline_transcript_conformance', containsEndpoints: false, containsCredentials: false, containsPrivateKeyMaterial: false, production: false };
  const inclusion = C.validateCheckpointInclusionProof(ii, { checkpoint: newCheckpoint, witnessQuorum: quorum });
  const ci = { proofId: 'consistency-proof.alpha', oldCheckpointHash: oldCheckpoint.checkpointHash, newCheckpointHash: newCheckpoint.checkpointHash, oldRootHash: oldCheckpoint.rootHash, newRootHash: newCheckpoint.rootHash, oldTreeSize: 1, newTreeSize: 2, consistencyPathHashes: sort(h('consistency.1'), h('consistency.2')), transcriptHash: null, witnessQuorumFingerprint: quorum.witnessQuorumFingerprint, verifiedAt: '2026-08-04T14:04:30.000Z', proofMode: 'offline_transcript_conformance', containsEndpoints: false, containsCredentials: false, containsPrivateKeyMaterial: false, production: false };
  ci.transcriptHash = C.computeConsistencyTranscript(ci);
  const consistency = C.validateCheckpointConsistencyProof(ci, { oldCheckpoint, newCheckpoint, witnessQuorum: quorum });
  const pi = { rehearsalId: 'rehearsal.a18', a17RecoveryResultFingerprint: x.recoveryResult.resultFingerprint, sourceCheckpointHash: oldCheckpoint.checkpointHash, targetCheckpointHash: newCheckpoint.checkpointHash, scenarioIds: ['cache_invalidation','checkpoint_rebuild','rollback_guard'].sort(), expectedInvalidationSet: sort(h('entry.1'), h('entry.2')), runbookFingerprint: h('runbook'), monitoringContractFingerprint: h('monitoring'), rollbackProcedureFingerprint: h('rollback'), plannedAt: '2026-08-04T14:05:00.000Z', maximumDurationSeconds: 900, syntheticOnly: true, containsEndpoints: false, containsCredentials: false, containsPrivateKeyMaterial: false, remoteExecutionAuthorized: false, production: false };
  const plan = C.createRecoveryRehearsalPlan(pi, { recoveryResult: x.recoveryResult, sourceCheckpoint: oldCheckpoint, targetCheckpoint: newCheckpoint });
  const ai = { attestationId: 'attestation.a18', rehearsalPlanFingerprint: plan.rehearsalPlanFingerprint, startedAt: '2026-08-04T14:06:00.000Z', completedAt: '2026-08-04T14:10:00.000Z', scenarioResults: plan.scenarioIds.map((scenarioId) => ({ scenarioId, status: 'passed_offline', evidenceHash: h('evidence.' + scenarioId) })), observedInvalidationSet: plan.expectedInvalidationSet, witnessQuorumFingerprint: quorum.witnessQuorumFingerprint, attestationStatus: 'passed_offline', ...effects };
  const attestation = C.validateRecoveryRehearsalAttestation(plan, ai, { witnessQuorum: quorum });
  const gi = { gateId: 'pre-provider-gate.alpha', a17AdoptionHandoffFingerprint: x.handoff.handoffFingerprint, a17AdoptionDecisionFingerprint: x.decision.decisionFingerprint, witnessQuorumFingerprint: quorum.witnessQuorumFingerprint, inclusionProofFingerprint: inclusion.inclusionProofFingerprint, consistencyProofFingerprint: consistency.consistencyProofFingerprint, recoveryRehearsalAttestationFingerprint: attestation.rehearsalAttestationFingerprint, ownerRoleHashes: [h('owner')], reviewerRoleHashes: sort(h('reviewer.1'), h('reviewer.2')), minimumApprovals: 2, runbookFingerprint: h('runbook'), monitoringContractFingerprint: h('monitoring'), rollbackProcedureFingerprint: h('rollback'), blockers: ['PAY-B01','PAY-B03','PAY-B04'], gateState: 'blocked_repository_only', generatedAt: '2026-08-04T14:12:00.000Z', containsEndpoints: false, containsCredentials: false, containsPrivateKeyMaterial: false, production: false, remoteExecutionAuthorized: false, remotePublicationAuthorized: false, providerContactAuthorized: false, realOperationalAdoptionAuthorized: false };
  const deps = { a17Handoff: x.handoff, a17Decision: x.decision, witnessQuorum: quorum, inclusionProof: inclusion, consistencyProof: consistency, rehearsalAttestation: attestation };
  const gate = C.createPreProviderAdoptionGate(gi, deps);
  const di = { decisionId: 'pre-provider-decision.alpha', preProviderGateFingerprint: gate.preProviderGateFingerprint, decidedAt: '2026-08-04T14:13:00.000Z', decision: 'blocked_repository_only', approverRoleHashes: sort(h('reviewer.1'), h('reviewer.2')), minimumApprovals: 2, production: false, remoteExecutionAuthorized: false, remotePublicationAuthorized: false, providerContactAuthorized: false, realOperationalAdoptionAuthorized: false };
  return { leaf, path, oldCheckpoint, newCheckpoint, ...x, wa, wb, profileA, profileB, qi, quorum, ii, inclusion, ci, consistency, pi, plan, ai, attestation, gi, deps, gate, di, decision: C.evaluatePreProviderAdoption(gate, di) };
}
const positives = {
  witness_profile_a_valid: (s) => assert.equal(s.profileA.witnessProfileVersion, C.WITNESS_PROFILE_VERSION),
  witness_profile_b_valid: (s) => assert.equal(s.profileB.witnessProfileVersion, C.WITNESS_PROFILE_VERSION),
  witness_quorum_interoperable: (s) => assert.equal(s.quorum.interoperable, true),
  inclusion_proof_valid: (s) => assert.equal(s.inclusion.inclusionVerified, true),
  consistency_proof_valid: (s) => assert.equal(s.consistency.consistencyVerified, true),
  rehearsal_plan_valid: (s) => assert.equal(s.plan.syntheticOnly, true),
  rehearsal_attestation_valid: (s) => assert.equal(s.attestation.attestationStatus, 'passed_offline'),
  pre_provider_gate_valid_blocked: (s) => assert.equal(s.gate.eligibleForProviderEvaluation, false),
  pre_provider_decision_valid_blocked: (s) => assert.equal(s.decision.decision, 'blocked_repository_only'),
  inclusion_root_deterministic: (s) => assert.equal(C.computeInclusionRoot(s.leaf, s.path), s.newCheckpoint.rootHash),
  consistency_transcript_deterministic: (s) => assert.equal(C.computeConsistencyTranscript(s.ci), s.ci.transcriptHash),
  all_operational_effects_zero: (s) => [s.quorum,s.inclusion,s.consistency,s.attestation,s.gate,s.decision].forEach((v) => { assert.equal(v.networkRequests, 0); assert.equal(v.databaseConnections, 0); assert.equal(v.productionAllowed, false); })
};
function profileBad(s, key, value) { const i = cp(s.wa); i[key] = value; C.createWitnessProfile(i); }
function quorumWith(s, mutate) { const p = cp(s.profileB), q = cp(s.qi); mutate(p, q); p.witnessProfileFingerprint = fp(p, 'witnessProfileFingerprint'); q.selectedWitnessProfileFingerprints = sort(s.profileA.witnessProfileFingerprint, p.witnessProfileFingerprint); C.validateWitnessInteroperability([s.profileA, p], q); }
function incBad(s, key, value) { const i = cp(s.ii); i[key] = value; C.validateCheckpointInclusionProof(i, { checkpoint: s.newCheckpoint, witnessQuorum: s.quorum }); }
function conBad(s, mutate) { const i = cp(s.ci); mutate(i); C.validateCheckpointConsistencyProof(i, { oldCheckpoint: s.oldCheckpoint, newCheckpoint: s.newCheckpoint, witnessQuorum: s.quorum }); }
function planBad(s, key, value) { const i = cp(s.pi); i[key] = value; C.createRecoveryRehearsalPlan(i, { recoveryResult: s.recoveryResult, sourceCheckpoint: s.oldCheckpoint, targetCheckpoint: s.newCheckpoint }); }
function gateBad(s, key, value) { const i = cp(s.gi); i[key] = value; C.createPreProviderAdoptionGate(i, s.deps); }
const triggers = {
  DOKE_PAY_A18_WITNESS_PROTOCOL_UNSUPPORTED: (s) => profileBad(s, 'protocolSuite', 'other_suite'),
  DOKE_PAY_A18_WITNESS_PROTOCOL_VERSION_INVALID: (s) => profileBad(s, 'protocolVersion', 2),
  DOKE_PAY_A18_WITNESS_LIFETIME_EXCEEDED: (s) => profileBad(s, 'expiresAt', '2026-08-06T14:00:01.000Z'),
  DOKE_PAY_A18_WITNESS_INDEPENDENCE_REQUIRED: (s) => profileBad(s, 'independentOperator', false),
  DOKE_PAY_A18_REMOTE_MATERIAL_DENIED: (s, id) => id.startsWith('gate_') ? gateBad(s, 'providerContactAuthorized', true) : profileBad(s, id.includes('credentials') ? 'containsCredentials' : 'containsEndpoints', true),
  DOKE_PAY_A18_WITNESS_PROOF_CAPABILITIES_INVALID: (s) => profileBad(s, 'supportedProofVersions', [C.INCLUSION_PROOF_VERSION]),
  DOKE_PAY_A18_WITNESS_PROFILE_HASH_INVALID: (s) => profileBad(s, 'witnessIdHash', 'bad'),
  DOKE_PAY_A18_WITNESS_OPERATOR_DUPLICATE: (s) => quorumWith(s, (p) => { p.operatorIdHash = s.profileA.operatorIdHash; }),
  DOKE_PAY_A18_WITNESS_OPERATOR_FAMILY_DUPLICATE: (s) => quorumWith(s, (p) => { p.operatorFamilyHash = s.profileA.operatorFamilyHash; }),
  DOKE_PAY_A18_WITNESS_KEY_DUPLICATE: (s) => quorumWith(s, (p) => { p.publicKeyFingerprint = s.profileA.publicKeyFingerprint; }),
  DOKE_PAY_A18_WITNESS_PROTOCOL_MISMATCH: (s) => quorumWith(s, (p) => { p.protocolVersion = 2; }),
  DOKE_PAY_A18_WITNESS_SELECTION_MISMATCH: (s) => { const q = cp(s.qi); q.selectedWitnessProfileFingerprints = sort(s.profileA.witnessProfileFingerprint, h('other')); C.validateWitnessInteroperability([s.profileA,s.profileB], q); },
  DOKE_PAY_A18_MINIMUM_WITNESSES_INVALID: (s) => { const q = cp(s.qi); q.minimumWitnesses = 1; C.validateWitnessInteroperability([s.profileA,s.profileB], q); },
  DOKE_PAY_A18_WITNESS_EXPIRED: (s) => quorumWith(s, (p) => { p.expiresAt = '2026-08-04T14:02:00.000Z'; }),
  DOKE_PAY_A18_WITNESS_CHECKPOINT_HASH_INVALID: (s) => { const q = cp(s.qi); q.checkpointHash = 'bad'; C.validateWitnessInteroperability([s.profileA,s.profileB], q); },
  DOKE_PAY_A18_INCLUSION_CHECKPOINT_MISMATCH: (s) => incBad(s, 'checkpointHash', h('other')),
  DOKE_PAY_A18_INCLUSION_ROOT_MISMATCH: (s) => incBad(s, 'checkpointRootHash', h('other')),
  DOKE_PAY_A18_INCLUSION_TREE_SIZE_MISMATCH: (s) => incBad(s, 'treeSize', 3),
  DOKE_PAY_A18_INCLUSION_PATH_INVALID: (s) => { const i = cp(s.ii); i.path[0].side = 'up'; C.validateCheckpointInclusionProof(i, { checkpoint: s.newCheckpoint, witnessQuorum: s.quorum }); },
  DOKE_PAY_A18_INCLUSION_VERIFICATION_FAILED: (s) => { const i = cp(s.ii); i.path[0].hash = h('wrong'); C.validateCheckpointInclusionProof(i, { checkpoint: s.newCheckpoint, witnessQuorum: s.quorum }); },
  DOKE_PAY_A18_INCLUSION_WITNESS_QUORUM_MISMATCH: (s) => incBad(s, 'witnessQuorumFingerprint', h('other')),
  DOKE_PAY_A18_PROOF_AGE_EXCEEDED: (s, id) => id.startsWith('inclusion') ? incBad(s, 'verifiedAt', '2026-08-04T14:30:00.000Z') : conBad(s, (i) => { i.verifiedAt = '2026-08-04T14:30:00.000Z'; }),
  DOKE_PAY_A18_CONSISTENCY_CHECKPOINT_MISMATCH: (s) => conBad(s, (i) => { i.newCheckpointHash = h('other'); i.transcriptHash = C.computeConsistencyTranscript(i); }),
  DOKE_PAY_A18_CONSISTENCY_TREE_SIZE_MISMATCH: (s) => conBad(s, (i) => { i.newTreeSize = 1; i.transcriptHash = C.computeConsistencyTranscript(i); }),
  DOKE_PAY_A18_CONSISTENCY_ISSUER_MISMATCH: (s) => { const n = cp(s.newCheckpoint); n.issuerIdHash = h('other'); n.checkpointHash = A.computeTransparencyCheckpointHash(n); const i = cp(s.ci); i.newCheckpointHash = n.checkpointHash; C.validateCheckpointConsistencyProof(i, { oldCheckpoint: s.oldCheckpoint, newCheckpoint: n, witnessQuorum: s.quorum }); },
  DOKE_PAY_A18_CONSISTENCY_TRANSCRIPT_MISMATCH: (s) => conBad(s, (i) => { i.transcriptHash = h('wrong'); }),
  DOKE_PAY_A18_CONSISTENCY_PATH_INVALID: (s) => conBad(s, (i) => { i.consistencyPathHashes = [h('same'),h('same')]; i.transcriptHash = C.computeConsistencyTranscript(i); }),
  DOKE_PAY_A18_REHEARSAL_RECOVERY_RESULT_MISMATCH: (s) => planBad(s, 'a17RecoveryResultFingerprint', h('other')),
  DOKE_PAY_A18_REHEARSAL_SCENARIOS_INVALID: (s) => planBad(s, 'scenarioIds', ['same','same','third'].sort()),
  DOKE_PAY_A18_REHEARSAL_SYNTHETIC_ONLY_REQUIRED: (s) => planBad(s, 'syntheticOnly', false),
  DOKE_PAY_A18_REHEARSAL_DURATION_INVALID: (s) => planBad(s, 'maximumDurationSeconds', 3600),
  DOKE_PAY_A18_REHEARSAL_DURATION_EXCEEDED: (s) => { const i = cp(s.ai); i.completedAt = '2026-08-04T14:30:00.000Z'; C.validateRecoveryRehearsalAttestation(s.plan, i, { witnessQuorum: s.quorum }); },
  DOKE_PAY_A18_REHEARSAL_SCENARIO_FAILED: (s) => { const i = cp(s.ai); i.scenarioResults[0].status = 'failed'; C.validateRecoveryRehearsalAttestation(s.plan, i, { witnessQuorum: s.quorum }); },
  DOKE_PAY_A18_REHEARSAL_INVALIDATION_SET_MISMATCH: (s) => { const i = cp(s.ai); i.observedInvalidationSet = [h('other')]; C.validateRecoveryRehearsalAttestation(s.plan, i, { witnessQuorum: s.quorum }); },
  DOKE_PAY_A18_ROLE_SEPARATION_REQUIRED: (s) => gateBad(s, 'ownerRoleHashes', [s.gi.reviewerRoleHashes[0]]),
  DOKE_PAY_A18_BLOCKER_DRIFT_DENIED: (s) => gateBad(s, 'blockers', ['PAY-B01']),
  DOKE_PAY_A18_GATE_INCLUSION_PROOF_MISMATCH: (s) => gateBad(s, 'inclusionProofFingerprint', h('other')),
  DOKE_PAY_A18_PROVIDER_ADOPTION_DENIED: (s) => { const i = cp(s.di); i.decision = 'approved'; C.evaluatePreProviderAdoption(s.gate, i); },
  DOKE_PAY_A18_PRE_PROVIDER_DECISION_GATE_MISMATCH: (s) => { const i = cp(s.di); i.preProviderGateFingerprint = h('other'); C.evaluatePreProviderAdoption(s.gate, i); }
};
assert.equal(Object.keys(positives).length, fixture.positiveCases.length);
assert.deepEqual(Object.keys(positives), fixture.positiveCases.map((v) => v.id));
const base = scenario();
fixture.positiveCases.forEach(({ id }) => positives[id](base));
fixture.negativeCases.forEach(({ id, expectedCode }) => { assert.equal(typeof triggers[expectedCode], 'function', 'Missing trigger ' + expectedCode); error(expectedCode, () => triggers[expectedCode](scenario(), id)); });
assert.equal(fixture.positiveCases.length + fixture.negativeCases.length, fixture.totalCases);
console.log(`PAY-A18 witness/proof/rehearsal pre-provider conformance passed: ${fixture.totalCases}/${fixture.totalCases}.`);
