#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r3p = require('../backend/modules/communities/community-realtime-private-auth-r3p');
const r3o = require('../backend/modules/communities/community-realtime-private-auth-r3o');
const config = require('../config/com-b03c-r3p-hosted-runtime-observation-harness-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R3P-HOSTED-RUNTIME-OBSERVATION-HARNESS-READINESS.json');

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
    r3oContractId: config.r3o.contractId,
    r3oPreciseObservation: config.r3o.preciseObservation,
    probeIds: [...config.r3o.probeIds],
    observationPhases: [...config.r3o.observationPhases],
    counters: [...config.r3o.counters],
    syntheticScenarioIds: [...config.syntheticScenarioIds],
    ...config.controls,
    ...config.prohibitedPreparation,
    ...overrides
  };
}

function scenario(overrides = {}) {
  return {
    identityId: 'synthetic-r3p-identity',
    anchorIdentityId: 'synthetic-r3p-identity',
    presenceOnlyIdentityId: 'synthetic-r3p-identity',
    tokenFingerprint: 'token-fingerprint-r3p',
    anchorTokenFingerprint: 'token-fingerprint-r3p',
    presenceOnlyTokenFingerprint: 'token-fingerprint-r3p',
    anchorClientId: 'client-anchor',
    presenceOnlyClientId: 'client-presence-only',
    anchorTopic: 'r3p:anchor',
    presenceOnlyTopic: 'r3p:presence-only',
    privateChannel: true,
    presenceExplicitlyEnabled: true,
    presenceListenerRegisteredBeforeSubscribe: true,
    baselinePolicySnapshotComplete: true,
    baselinePolicyImmutableDuringHarness: true,
    snapshots: {
      baseline_before_probe: {
        broadcast_rls_evaluations: 10,
        presence_rls_evaluations: 20
      },
      after_presence_read_effective_gate: {
        broadcast_rls_evaluations: 11,
        presence_rls_evaluations: 21
      },
      after_presence_only_join: {
        broadcast_rls_evaluations: 12,
        presence_rls_evaluations: 22
      },
      after_cleanup: {
        broadcast_rls_evaluations: 12,
        presence_rls_evaluations: 22
      }
    },
    anchorJoinSubscribed: true,
    anchorPresenceStateObserved: true,
    presenceOnlyJoinSubscribed: true,
    cleanupComplete: true,
    zeroResidueProven: true,
    ...overrides
  };
}

const decision = r3p.evaluateRepositoryReadiness(readinessInput());
assert.equal(decision.decision, 'repository_synthetic_two_probe_harness_ready_no_remote_authority');
assert.equal(decision.remoteExecutionAuthority, false);
assert.equal(decision.stagingReadAuthority, false);
assert.equal(decision.stagingMutationAuthority, false);
assert.equal(decision.exactRootCauseProven, false);
assert.equal(decision.causalPromotionAllowed, false);
assert.equal(decision.harness.classifierAuthority, r3o.CONTRACT_ID);

for (const field of Object.keys(config.controls)) {
  const blocked = r3p.evaluateRepositoryReadiness(readinessInput({ [field]: false }));
  assert.equal(blocked.decision, 'blocked_repository_only', field);
}

for (const field of Object.keys(config.prohibitedPreparation)) {
  const blocked = r3p.evaluateRepositoryReadiness(readinessInput({ [field]: true }));
  assert.equal(blocked.decision, 'blocked_repository_only', field);
}

const extensionSelection = r3p.runSyntheticObservationHarness(scenario({
  snapshots: {
    baseline_before_probe: { broadcast_rls_evaluations: 10, presence_rls_evaluations: 20 },
    after_presence_read_effective_gate: { broadcast_rls_evaluations: 11, presence_rls_evaluations: 20 },
    after_presence_only_join: { broadcast_rls_evaluations: 12, presence_rls_evaluations: 20 },
    after_cleanup: { broadcast_rls_evaluations: 12, presence_rls_evaluations: 20 }
  },
  anchorPresenceStateObserved: false,
  presenceOnlyJoinSubscribed: false
}));
assert.equal(extensionSelection.classification, 'hosted_presence_extension_selection_diverged');

const readGate = r3p.runSyntheticObservationHarness(scenario({
  anchorPresenceStateObserved: false,
  presenceOnlyJoinSubscribed: false
}));
assert.equal(readGate.classification, 'hosted_presence_read_effective_gate_diverged');

const orJoin = r3p.runSyntheticObservationHarness(scenario({
  anchorPresenceStateObserved: true,
  presenceOnlyJoinSubscribed: false
}));
assert.equal(orJoin.classification, 'hosted_presence_only_or_join_diverged');

const pinnedMatch = r3p.runSyntheticObservationHarness(scenario());
assert.equal(pinnedMatch.classification, 'hosted_runtime_observation_matches_pinned_presence_path');
assert.equal(pinnedMatch.deltas.presence_read_effective_gate.broadcast_rls_evaluations, 1);
assert.equal(pinnedMatch.deltas.presence_read_effective_gate.presence_rls_evaluations, 1);
assert.equal(pinnedMatch.deltas.presence_only_join.broadcast_rls_evaluations, 1);
assert.equal(pinnedMatch.deltas.presence_only_join.presence_rls_evaluations, 1);
assert.equal(pinnedMatch.zeroResidueProven, true);
assert.equal(pinnedMatch.exactRootCauseProven, false);

assert.throws(
  () => r3p.runSyntheticObservationHarness(scenario({ presenceOnlyClientId: 'client-anchor' })),
  /FRESH_CLIENT_PER_PROBE_REQUIRED/
);
assert.throws(
  () => r3p.runSyntheticObservationHarness(scenario({ presenceOnlyTopic: 'r3p:anchor' })),
  /UNIQUE_TOPIC_PER_PROBE_REQUIRED/
);
assert.throws(
  () => r3p.runSyntheticObservationHarness(scenario({
    snapshots: {
      baseline_before_probe: { broadcast_rls_evaluations: 10, presence_rls_evaluations: 20 },
      after_presence_read_effective_gate: { broadcast_rls_evaluations: 9, presence_rls_evaluations: 21 },
      after_presence_only_join: { broadcast_rls_evaluations: 10, presence_rls_evaluations: 22 },
      after_cleanup: { broadcast_rls_evaluations: 10, presence_rls_evaluations: 22 }
    }
  })),
  /COUNTER_REGRESSION/
);
assert.throws(
  () => r3p.runSyntheticObservationHarness(scenario({
    snapshots: {
      baseline_before_probe: { broadcast_rls_evaluations: 10, presence_rls_evaluations: 20 },
      after_presence_read_effective_gate: { broadcast_rls_evaluations: 11, presence_rls_evaluations: 21 },
      after_presence_only_join: { broadcast_rls_evaluations: 12, presence_rls_evaluations: 22 },
      after_cleanup: { broadcast_rls_evaluations: 13, presence_rls_evaluations: 22 }
    }
  })),
  /CLEANUP_MUST_NOT_EXECUTE_ADDITIONAL_RLS_EVALUATIONS/
);
assert.throws(
  () => r3p.runSyntheticObservationHarness(scenario({ zeroResidueProven: false })),
  /ZERO_RESIDUE_REQUIRED/
);

assert.equal(evidence.contractId, r3p.CONTRACT_ID);
assert.equal(evidence.status, 'repository_synthetic_two_probe_harness_certified_no_remote_authority');
assert.equal(evidence.initialBoundaryCommit, 'c3f9479491e17d739c77726b648a7efafee016d9');
assert.equal(evidence.certificationHistory.initialFailClosed.conclusion, 'failure');
assert.equal(evidence.certificationHistory.initialFailClosed.failedStep, 'Domain Completion Matrix');
assert.equal(evidence.certificationHistory.initialFailClosed.syntaxPassed, true);
assert.equal(evidence.certificationHistory.initialFailClosed.syntheticHarnessPassed, true);
assert.equal(evidence.certificationHistory.initialFailClosed.preRemoteHardBlockPassed, true);
assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.writerConclusion, 'success');
assert.deepEqual(evidence.certificationHistory.canonicalMatrixReconciliation.writerOutputs, [
  'docs/DOMAIN-COMPLETION-MATRIX.md',
  'reports/generated/domain-completion-matrix-report.json'
]);
assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.matrixSourceChanged, false);
assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.workflowRestoredHead, '7bd9df7f7edf680078d811abf12705320add1de5');
assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.workflowPermissions, 'contents: read');
assert.equal(evidence.certificationHistory.normalHeadCertification.head, '7bd9df7f7edf680078d811abf12705320add1de5');
assert.equal(evidence.certificationHistory.normalHeadCertification.r3pRun, 31399080121);
assert.equal(evidence.certificationHistory.normalHeadCertification.r3pJob, 93489226084);
assert.equal(evidence.certificationHistory.normalHeadCertification.r3pConclusion, 'success');
assert.equal(evidence.certificationHistory.normalHeadCertification.matrixRun, 31399079656);
assert.equal(evidence.certificationHistory.normalHeadCertification.matrixJob, 93489225268);
assert.equal(evidence.certificationHistory.normalHeadCertification.matrixConclusion, 'success');
assert.equal(evidence.certificationHistory.normalHeadCertification.runAttempt, 1);
assert.equal(evidence.authority.remoteExecution, false);
assert.equal(evidence.authority.stagingRead, false);
assert.equal(evidence.authority.stagingMutation, false);
assert.equal(evidence.effects.stagingAccessExecuted, false);
assert.equal(evidence.effects.realtimePolicyMutationExecuted, false);
assert.equal(evidence.effects.realtimeSubscriptionExecuted, false);
assert.equal(evidence.effects.runtimePolicyChangeExecuted, false);
assert.equal(evidence.effects.productionExecuted, false);
assert.equal(evidence.effects.mergeExecuted, false);
assert.equal(evidence.exactRootCauseProven, false);
assert.equal(evidence.causalPromotionAllowed, false);

process.stdout.write(`${JSON.stringify({
  contractId: r3p.CONTRACT_ID,
  decision: decision.decision,
  evidenceStatus: evidence.status,
  scenarios: [...r3p.SYNTHETIC_SCENARIO_IDS],
  remoteExecutionAuthority: decision.remoteExecutionAuthority,
  exactRootCauseProven: decision.exactRootCauseProven
})}\n`);
