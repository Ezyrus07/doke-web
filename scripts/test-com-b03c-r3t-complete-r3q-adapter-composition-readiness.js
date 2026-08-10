#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r3t = require('../backend/modules/communities/community-realtime-private-auth-r3t');
const r3q = require('../backend/modules/communities/community-realtime-private-auth-r3q');
const r3r = require('../backend/modules/communities/community-realtime-private-auth-r3r');
const r3s = require('../backend/modules/communities/community-realtime-private-auth-r3s');
const r3g = require('../backend/modules/communities/community-realtime-private-auth-r3g');
const r3k = require('../backend/modules/communities/community-realtime-private-auth-r3k');
const config = require('../config/com-b03c-r3t-complete-r3q-adapter-composition-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R3T-COMPLETE-R3Q-ADAPTER-COMPOSITION-READINESS.json');

function readinessInput(overrides = {}) {
  return {
    predecessorValidationId: config.predecessor.validationId,
    predecessorStatus: config.predecessor.status,
    predecessorHead: config.predecessor.head,
    predecessorRecertRun: config.predecessor.recertRun,
    predecessorRecertJob: config.predecessor.recertJob,
    predecessorRecertSuccess: config.predecessor.recertSuccess,
    predecessorMatrixRecertRun: config.predecessor.matrixRecertRun,
    predecessorMatrixRecertJob: config.predecessor.matrixRecertJob,
    predecessorMatrixRecertSuccess: config.predecessor.matrixRecertSuccess,
    matrixVersion: config.matrixVersion,
    maturity: config.maturity,
    productionGate: config.productionGate,
    r3qContractId: config.continuity.r3qContractId,
    r3rContractId: config.continuity.r3rContractId,
    r3sContractId: config.continuity.r3sContractId,
    r3gContractId: config.continuity.r3gContractId,
    r3kContractId: config.continuity.r3kContractId,
    adapterMethods: [...config.continuity.adapterMethods],
    lifecycleMethods: [...config.continuity.lifecycleMethods],
    observationMethods: [...config.continuity.observationMethods],
    originalR3rGaps: [...config.continuity.originalR3rGaps],
    r3sCapabilities: [...config.continuity.r3sCapabilities],
    forbiddenProviderMethods: [...config.continuity.forbiddenProviderMethods],
    ...config.controls,
    ...config.prohibitedPreparation,
    ...overrides
  };
}

function syntheticLifecycleProvider(options = {}) {
  const trace = [];
  return {
    kind: 'synthetic_repository',
    remoteCapable: false,
    trace,
    async preflight() { trace.push('preflight'); },
    async snapshotPolicies() { trace.push('snapshotPolicies'); return { complete: true, immutable: true }; },
    async installInstrumentation(spec) {
      trace.push('installInstrumentation');
      assert.equal(spec, r3q.INSTRUMENTATION_SPEC);
      assert.equal(spec.executableSqlPrepared, false);
      if (options.failAt === 'install') throw new Error('R3T_SYNTHETIC_INSTALL_FAILURE');
    },
    async runPresenceReadEffectiveGate() {
      trace.push('runPresenceReadEffectiveGate');
      if (options.failAt === 'anchor') throw new Error('R3T_SYNTHETIC_ANCHOR_FAILURE');
      return {
        joinSubscribed: options.anchorJoinSubscribed !== false,
        presenceStateObserved: options.anchorPresenceStateObserved !== false
      };
    },
    async switchToPresenceOnlyPolicy(policy) {
      trace.push('switchToPresenceOnlyPolicy');
      assert.equal(policy, r3q.INSTRUMENTATION_SPEC.presenceOnlyPolicy);
      if (options.failAt === 'switch') throw new Error('R3T_SYNTHETIC_SWITCH_FAILURE');
    },
    async runPresenceOnlyJoin() {
      trace.push('runPresenceOnlyJoin');
      if (options.failAt === 'presenceOnly') throw new Error('R3T_SYNTHETIC_PRESENCE_ONLY_FAILURE');
      return { joinSubscribed: options.presenceOnlyJoinSubscribed !== false };
    },
    async cleanup() { trace.push('cleanup'); }
  };
}

function syntheticObservationExecutor(options = {}) {
  const calls = [];
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
    calls,
    async executeObservation(descriptor, context) {
      calls.push({ descriptorId: descriptor.id, context: { ...context } });
      if (descriptor.id === r3s.COUNTER_READ_DESCRIPTOR.id) return counters[context.phase];
      if (descriptor.id === r3s.RESIDUE_INSPECTION_DESCRIPTOR.id) {
        return options.residue || { policyCount: 0, functionCount: 0, sequenceCount: 0 };
      }
      throw new Error('R3T_UNEXPECTED_OBSERVATION_DESCRIPTOR');
    }
  };
}

function buildAdapter(options = {}) {
  const lifecycleProvider = syntheticLifecycleProvider(options);
  const observationExecutor = syntheticObservationExecutor(options);
  const adapter = r3t.buildCompleteR3qRepositoryAdapter({
    lifecycleProvider,
    observationExecutor,
    ownershipToken: 'r3t_owner_001'
  });
  return { adapter, lifecycleProvider, observationExecutor };
}

function envelopeInput() {
  return {
    mode: 'synthetic_repository',
    identityId: 'synthetic-r3t-identity',
    tokenFingerprint: 'synthetic-r3t-token',
    anchorClientId: 'r3t-anchor-client',
    presenceOnlyClientId: 'r3t-presence-client',
    anchorTopic: 'r3t:anchor',
    presenceOnlyTopic: 'r3t:presence-only'
  };
}

async function classify(options = {}) {
  const { adapter } = buildAdapter(options);
  return r3q.executeRepositoryObservationEnvelope(envelopeInput(), adapter);
}

async function main() {
  const decision = r3t.evaluateRepositoryReadiness(readinessInput());
  assert.equal(decision.decision, 'repository_complete_r3q_adapter_composition_ready_nine_of_nine_no_remote_authority');
  assert.equal(decision.repositoryCompleteAdapterCompositionAuthority, true);
  assert.equal(decision.remoteAdapterActivationAuthority, false);
  assert.equal(decision.remoteExecutionAuthority, false);
  assert.equal(decision.stagingReadAuthority, false);
  assert.equal(decision.stagingMutationAuthority, false);
  assert.equal(decision.productionAuthority, false);
  assert.equal(decision.pullRequestMergeAuthority, false);
  assert.equal(decision.exactRootCauseProven, false);
  assert.equal(decision.causalPromotionAllowed, false);

  assert.equal(decision.composition.methodCount, 9);
  assert.equal(decision.composition.boundMethodCount, 9);
  assert.equal(decision.composition.unboundMethodCount, 0);
  assert.equal(decision.composition.fullyBound, true);
  assert.equal(decision.composition.gapSetSatisfiedByR3s, true);
  assert.deepEqual([...decision.composition.originalR3rGaps], [...r3r.REQUIRED_MISSING_CAPABILITIES]);
  assert.deepEqual([...decision.composition.r3sCapabilities], [...r3s.REQUIRED_CAPABILITIES]);
  assert.deepEqual([...decision.adapterMethods], [...r3q.ADAPTER_METHODS]);

  for (const field of Object.keys(config.controls)) {
    assert.equal(r3t.evaluateRepositoryReadiness(readinessInput({ [field]: false })).decision, 'blocked_repository_only', field);
  }
  for (const field of Object.keys(config.prohibitedPreparation)) {
    assert.equal(r3t.evaluateRepositoryReadiness(readinessInput({ [field]: true })).decision, 'blocked_repository_only', field);
  }

  assert.throws(() => r3t.assertSyntheticLifecycleProvider({ kind: 'remote', remoteCapable: true }), /REMOTE_CAPABLE_LIFECYCLE_PROVIDER_PROHIBITED/);
  const badLifecycle = syntheticLifecycleProvider();
  badLifecycle.query = async () => {};
  assert.throws(() => r3t.assertSyntheticLifecycleProvider(badLifecycle), /FORBIDDEN_PROVIDER_METHOD_query/);
  assert.throws(() => r3t.buildCompleteR3qRepositoryAdapter({
    lifecycleProvider: syntheticLifecycleProvider(),
    observationExecutor: { kind: 'remote', remoteCapable: true, async executeObservation() {} },
    ownershipToken: 'r3t_owner_001'
  }), /R3S_REMOTE_CAPABLE_EXECUTOR_PROHIBITED/);

  const composed = buildAdapter();
  assert.equal(r3q.assertSyntheticAdapter(composed.adapter), composed.adapter);
  assert.deepEqual(
    r3q.ADAPTER_METHODS.filter((method) => typeof composed.adapter[method] === 'function'),
    [...r3q.ADAPTER_METHODS]
  );

  const pinned = await classify();
  assert.equal(pinned.classification, 'hosted_runtime_observation_matches_pinned_presence_path');
  assert.equal(pinned.zeroResidueProven, true);

  const extension = await classify({
    counters: {
      baseline_before_probe: { broadcast_rls_evaluations: 10, presence_rls_evaluations: 20 },
      after_presence_read_effective_gate: { broadcast_rls_evaluations: 11, presence_rls_evaluations: 20 },
      after_presence_only_join: { broadcast_rls_evaluations: 12, presence_rls_evaluations: 20 },
      after_cleanup: { broadcast_rls_evaluations: 12, presence_rls_evaluations: 20 }
    },
    anchorPresenceStateObserved: false,
    presenceOnlyJoinSubscribed: false
  });
  assert.equal(extension.classification, 'hosted_presence_extension_selection_diverged');

  const readGate = await classify({ anchorPresenceStateObserved: false, presenceOnlyJoinSubscribed: false });
  assert.equal(readGate.classification, 'hosted_presence_read_effective_gate_diverged');

  const orJoin = await classify({ presenceOnlyJoinSubscribed: false });
  assert.equal(orJoin.classification, 'hosted_presence_only_or_join_diverged');

  const failed = buildAdapter({ failAt: 'presenceOnly' });
  await assert.rejects(
    () => r3q.executeRepositoryObservationEnvelope(envelopeInput(), failed.adapter),
    /R3T_SYNTHETIC_PRESENCE_ONLY_FAILURE/
  );
  assert.ok(failed.lifecycleProvider.trace.includes('cleanup'));
  assert.ok(failed.observationExecutor.calls.some(
    (call) => call.descriptorId === r3s.COUNTER_READ_DESCRIPTOR.id && call.context.phase === 'after_cleanup'
  ));
  assert.ok(failed.observationExecutor.calls.some(
    (call) => call.descriptorId === r3s.RESIDUE_INSPECTION_DESCRIPTOR.id
  ));

  assert.equal(r3q.INSTRUMENTATION_SPEC.executableSqlPrepared, false);
  assert.equal(r3s.COUNTER_READ_DESCRIPTOR.executableSqlPrepared, false);
  assert.equal(r3s.RESIDUE_INSPECTION_DESCRIPTOR.executableSqlPrepared, false);
  assert.equal(r3g.CONTRACT_ID, config.continuity.r3gContractId);
  assert.equal(r3k.CONTRACT_ID, config.continuity.r3kContractId);

  assert.equal(evidence.contractId, r3t.CONTRACT_ID);
  assert.equal(
    evidence.status,
    'repository_complete_r3q_adapter_composition_certified_nine_of_nine_no_remote_authority'
  );
  assert.equal(evidence.initialBoundaryCommit, '858e87aec924352c8b15253b98e6a84e9706ea34');
  assert.equal(evidence.composition.r3qMethodCount, 9);
  assert.equal(evidence.composition.boundMethodCount, 9);
  assert.equal(evidence.composition.unboundMethodCount, 0);
  assert.equal(evidence.composition.fullyBound, true);
  assert.equal(evidence.certificationHistory.initialFailClosed.r3tRun, 31412008217);
  assert.equal(evidence.certificationHistory.initialFailClosed.r3tJob, 93532071721);
  assert.equal(evidence.certificationHistory.initialFailClosed.failedStep, 'Domain Completion Matrix');
  assert.equal(evidence.certificationHistory.initialFailClosed.syntaxPassed, true);
  assert.equal(evidence.certificationHistory.initialFailClosed.completeCompositionPassed, true);
  assert.equal(evidence.certificationHistory.initialFailClosed.preRemoteHardBlockPassed, true);
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.writerRun, 31412222397);
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.writerJob, 93532770028);
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.writerConclusion, 'success');
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.writerOutputCommit, 'aa540b4c1c239d1ccb1078b6843fdbe3ccb9cc46');
  assert.deepEqual(evidence.certificationHistory.canonicalMatrixReconciliation.writerOutputs, [
    'docs/DOMAIN-COMPLETION-MATRIX.md',
    'reports/generated/domain-completion-matrix-report.json'
  ]);
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.matrixSourceChanged, false);
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.workflowRestoredHead, 'bd807e56b7290dfe1d1a93b62409bea5b13e5f0c');
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.workflowRestoredBlob, '299108d86dc097ba090392ebe9f218f6849e74ad');
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.workflowPermissions, 'contents: read');
  assert.equal(evidence.certificationHistory.normalHeadCertification.head, 'bd807e56b7290dfe1d1a93b62409bea5b13e5f0c');
  assert.equal(evidence.certificationHistory.normalHeadCertification.r3tRun, 31412341563);
  assert.equal(evidence.certificationHistory.normalHeadCertification.r3tJob, 93533144199);
  assert.equal(evidence.certificationHistory.normalHeadCertification.r3tConclusion, 'success');
  assert.equal(evidence.certificationHistory.normalHeadCertification.matrixRun, 31412341381);
  assert.equal(evidence.certificationHistory.normalHeadCertification.matrixJob, 93533143368);
  assert.equal(evidence.certificationHistory.normalHeadCertification.matrixConclusion, 'success');
  assert.equal(evidence.certificationHistory.normalHeadCertification.runAttempt, 1);
  assert.equal(evidence.authority.remoteAdapterActivation, false);
  assert.equal(evidence.authority.remoteExecution, false);
  assert.equal(evidence.effects.stagingAccessExecuted, false);
  assert.equal(evidence.effects.databaseQueryExecuted, false);
  assert.equal(evidence.exactRootCauseProven, false);
  assert.equal(evidence.causalPromotionAllowed, false);

  process.stdout.write(`${JSON.stringify({
    contractId: r3t.CONTRACT_ID,
    decision: decision.decision,
    evidenceStatus: evidence.status,
    methodCount: decision.composition.methodCount,
    boundMethodCount: decision.composition.boundMethodCount,
    classificationsCovered: 4,
    remoteExecutionAuthority: decision.remoteExecutionAuthority,
    exactRootCauseProven: decision.exactRootCauseProven
  })}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
