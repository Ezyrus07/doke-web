#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r3q = require('../backend/modules/communities/community-realtime-private-auth-r3q');
const r3p = require('../backend/modules/communities/community-realtime-private-auth-r3p');
const r3o = require('../backend/modules/communities/community-realtime-private-auth-r3o');
const config = require('../config/com-b03c-r3q-repository-executable-observation-envelope-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R3Q-REPOSITORY-EXECUTABLE-OBSERVATION-ENVELOPE-READINESS.json');

function readinessInput(overrides = {}) {
  return {
    predecessorValidationId: config.predecessor.validationId,
    predecessorStatus: config.predecessor.status,
    predecessorHead: config.predecessor.head,
    predecessorRecertRun: config.predecessor.recertRun,
    predecessorRecertJob: config.predecessor.recertJob,
    predecessorRecertSuccess: config.predecessor.recertSuccess,
    matrixVersion: config.matrixVersion,
    maturity: config.maturity,
    productionGate: config.productionGate,
    r3pContractId: config.continuity.r3pContractId,
    r3oContractId: config.continuity.r3oContractId,
    envelopePhases: [...config.continuity.envelopePhases],
    adapterMethods: [...config.continuity.adapterMethods],
    forbiddenAdapterMethods: [...config.continuity.forbiddenAdapterMethods],
    ...config.controls,
    ...config.prohibitedPreparation,
    ...overrides
  };
}

function syntheticAdapter(options = {}) {
  const trace = [];
  const counters = {
    baseline_before_probe: { broadcast_rls_evaluations: 10, presence_rls_evaluations: 20 },
    after_presence_read_effective_gate: { broadcast_rls_evaluations: 11, presence_rls_evaluations: 21 },
    after_presence_only_join: { broadcast_rls_evaluations: 12, presence_rls_evaluations: 22 },
    after_cleanup: { broadcast_rls_evaluations: 12, presence_rls_evaluations: 22 },
    ...(options.counters || {})
  };
  return {
    kind: 'synthetic_repository',
    remoteCapable: false,
    trace,
    async preflight() { trace.push('preflight'); },
    async snapshotPolicies() { trace.push('snapshotPolicies'); return { complete: options.snapshotComplete !== false, immutable: true }; },
    async installInstrumentation() { trace.push('installInstrumentation'); if (options.failAt === 'install') throw new Error('SYNTHETIC_INSTALL_FAILURE'); },
    async runPresenceReadEffectiveGate() { trace.push('runPresenceReadEffectiveGate'); if (options.failAt === 'anchor') throw new Error('SYNTHETIC_ANCHOR_FAILURE'); return { joinSubscribed: options.anchorJoinSubscribed !== false, presenceStateObserved: options.anchorPresenceStateObserved !== false }; },
    async readCounters(phase) { trace.push(`readCounters:${phase}`); return counters[phase]; },
    async switchToPresenceOnlyPolicy() { trace.push('switchToPresenceOnlyPolicy'); if (options.failAt === 'switch') throw new Error('SYNTHETIC_SWITCH_FAILURE'); },
    async runPresenceOnlyJoin() { trace.push('runPresenceOnlyJoin'); if (options.failAt === 'presenceOnly') throw new Error('SYNTHETIC_PRESENCE_ONLY_FAILURE'); return { joinSubscribed: options.presenceOnlyJoinSubscribed !== false }; },
    async cleanup() { trace.push('cleanup'); },
    async assertZeroResidue() { trace.push('assertZeroResidue'); return options.zeroResidue !== false; }
  };
}

function envelopeInput() {
  return {
    mode: 'synthetic_repository',
    identityId: 'synthetic-r3q-identity',
    tokenFingerprint: 'synthetic-r3q-token',
    anchorClientId: 'r3q-anchor-client',
    presenceOnlyClientId: 'r3q-presence-client',
    anchorTopic: 'r3q:anchor',
    presenceOnlyTopic: 'r3q:presence-only'
  };
}

async function main() {
  const decision = r3q.evaluateRepositoryReadiness(readinessInput());
  assert.equal(decision.decision, 'repository_executable_observation_envelope_ready_no_remote_authority');
  assert.equal(decision.repositoryExecutableEnvelopeAuthority, true);
  assert.equal(decision.remoteAdapterBindingAuthority, false);
  assert.equal(decision.stagingReadAuthority, false);
  assert.equal(decision.stagingMutationAuthority, false);
  assert.equal(decision.remoteCredentialReadAuthority, false);
  assert.equal(decision.remoteDependencyLoadAuthority, false);
  assert.equal(decision.productionAuthority, false);
  assert.equal(decision.pullRequestMergeAuthority, false);
  assert.equal(decision.exactRootCauseProven, false);
  assert.equal(decision.causalPromotionAllowed, false);

  for (const field of Object.keys(config.controls)) {
    assert.equal(r3q.evaluateRepositoryReadiness(readinessInput({ [field]: false })).decision, 'blocked_repository_only', field);
  }
  for (const field of Object.keys(config.prohibitedPreparation)) {
    assert.equal(r3q.evaluateRepositoryReadiness(readinessInput({ [field]: true })).decision, 'blocked_repository_only', field);
  }

  assert.throws(() => r3q.assertSyntheticAdapter({ kind: 'remote', remoteCapable: true }), /REMOTE_CAPABLE_ADAPTER_PROHIBITED/);
  const forbiddenAdapter = syntheticAdapter();
  forbiddenAdapter.query = async () => {};
  assert.throws(() => r3q.assertSyntheticAdapter(forbiddenAdapter), /FORBIDDEN_REMOTE_ADAPTER_METHOD_query/);

  const pinned = await r3q.executeRepositoryObservationEnvelope(envelopeInput(), syntheticAdapter());
  assert.equal(pinned.classification, 'hosted_runtime_observation_matches_pinned_presence_path');
  assert.deepEqual([...pinned.envelopeTrace], [...r3q.ENVELOPE_PHASES]);
  assert.equal(pinned.zeroResidueProven, true);
  assert.equal(pinned.harnessContractId, r3p.CONTRACT_ID);
  assert.equal(pinned.classifierContractId, r3o.CONTRACT_ID);

  const extension = await r3q.executeRepositoryObservationEnvelope(envelopeInput(), syntheticAdapter({
    counters: {
      baseline_before_probe: { broadcast_rls_evaluations: 10, presence_rls_evaluations: 20 },
      after_presence_read_effective_gate: { broadcast_rls_evaluations: 11, presence_rls_evaluations: 20 },
      after_presence_only_join: { broadcast_rls_evaluations: 12, presence_rls_evaluations: 20 },
      after_cleanup: { broadcast_rls_evaluations: 12, presence_rls_evaluations: 20 }
    },
    anchorPresenceStateObserved: false,
    presenceOnlyJoinSubscribed: false
  }));
  assert.equal(extension.classification, 'hosted_presence_extension_selection_diverged');

  const readGate = await r3q.executeRepositoryObservationEnvelope(envelopeInput(), syntheticAdapter({ anchorPresenceStateObserved: false, presenceOnlyJoinSubscribed: false }));
  assert.equal(readGate.classification, 'hosted_presence_read_effective_gate_diverged');

  const orJoin = await r3q.executeRepositoryObservationEnvelope(envelopeInput(), syntheticAdapter({ presenceOnlyJoinSubscribed: false }));
  assert.equal(orJoin.classification, 'hosted_presence_only_or_join_diverged');

  await assert.rejects(() => r3q.executeRepositoryObservationEnvelope(envelopeInput(), syntheticAdapter({ snapshotComplete: false })), /BASELINE_POLICY_SNAPSHOT_REQUIRED/);
  await assert.rejects(() => r3q.executeRepositoryObservationEnvelope(envelopeInput(), syntheticAdapter({ zeroResidue: false })), /ZERO_RESIDUE_REQUIRED/);

  const failed = syntheticAdapter({ failAt: 'presenceOnly' });
  await assert.rejects(() => r3q.executeRepositoryObservationEnvelope(envelopeInput(), failed), /SYNTHETIC_PRESENCE_ONLY_FAILURE/);
  assert.ok(failed.trace.includes('cleanup'));
  assert.ok(failed.trace.includes('assertZeroResidue'));

  assert.equal(evidence.contractId, r3q.CONTRACT_ID);
  assert.equal(evidence.status, 'repository_executable_observation_envelope_certified_no_remote_authority');
  assert.equal(evidence.initialBoundaryCommit, '25a21c87be989b29c965d70523d70e3d56f0b8c4');
  assert.equal(evidence.certificationHistory.initialFailClosed.conclusion, 'failure');
  assert.equal(evidence.certificationHistory.initialFailClosed.failedStep, 'Domain Completion Matrix');
  assert.equal(evidence.certificationHistory.initialFailClosed.syntaxPassed, true);
  assert.equal(evidence.certificationHistory.initialFailClosed.executableEnvelopePassed, true);
  assert.equal(evidence.certificationHistory.initialFailClosed.preRemoteHardBlockPassed, true);
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.writerConclusion, 'success');
  assert.deepEqual(evidence.certificationHistory.canonicalMatrixReconciliation.writerOutputs, [
    'docs/DOMAIN-COMPLETION-MATRIX.md',
    'reports/generated/domain-completion-matrix-report.json'
  ]);
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.matrixSourceChanged, false);
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.workflowRestoredHead, '639fc4528a5d4bcbdf48837574a407047e811f47');
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.workflowPermissions, 'contents: read');
  assert.equal(evidence.certificationHistory.normalHeadCertification.head, '639fc4528a5d4bcbdf48837574a407047e811f47');
  assert.equal(evidence.certificationHistory.normalHeadCertification.r3qRun, 31401079003);
  assert.equal(evidence.certificationHistory.normalHeadCertification.r3qJob, 93495923438);
  assert.equal(evidence.certificationHistory.normalHeadCertification.r3qConclusion, 'success');
  assert.equal(evidence.certificationHistory.normalHeadCertification.matrixRun, 31401079780);
  assert.equal(evidence.certificationHistory.normalHeadCertification.matrixJob, 93495929208);
  assert.equal(evidence.certificationHistory.normalHeadCertification.matrixConclusion, 'success');
  assert.equal(evidence.certificationHistory.normalHeadCertification.runAttempt, 1);
  assert.equal(evidence.authority.remoteAdapterBinding, false);
  assert.equal(evidence.authority.remoteExecution, false);
  assert.equal(evidence.authority.stagingRead, false);
  assert.equal(evidence.authority.stagingMutation, false);
  assert.equal(evidence.envelope.remoteDependencies, false);
  assert.equal(evidence.envelope.executableSqlPrepared, false);
  assert.equal(evidence.envelope.supabaseClientPrepared, false);
  assert.equal(evidence.envelope.pgClientPrepared, false);
  assert.equal(evidence.envelope.remoteExecutorPrepared, false);
  assert.equal(evidence.effects.stagingAccessExecuted, false);
  assert.equal(evidence.effects.remoteCredentialReadExecuted, false);
  assert.equal(evidence.effects.remoteDependencyLoadExecuted, false);
  assert.equal(evidence.effects.authIdentityMutationExecuted, false);
  assert.equal(evidence.effects.realtimePolicyMutationExecuted, false);
  assert.equal(evidence.effects.realtimeSubscriptionExecuted, false);
  assert.equal(evidence.effects.runtimePolicyChangeExecuted, false);
  assert.equal(evidence.effects.productionExecuted, false);
  assert.equal(evidence.effects.mergeExecuted, false);
  assert.equal(evidence.exactRootCauseProven, false);
  assert.equal(evidence.causalPromotionAllowed, false);

  process.stdout.write(`${JSON.stringify({ contractId: r3q.CONTRACT_ID, decision: decision.decision, evidenceStatus: evidence.status, classificationsCovered: evidence.coverage.classifications.length, remoteAdapterBindingAuthority: decision.remoteAdapterBindingAuthority, exactRootCauseProven: decision.exactRootCauseProven })}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
