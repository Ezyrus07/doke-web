#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r3o = require('../backend/modules/communities/community-realtime-private-auth-r3o');
const config = require('../config/com-b03c-r3o-hosted-runtime-observation-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R3O-HOSTED-RUNTIME-OBSERVATION-READINESS.json');

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
    upstreamRepository: config.upstream.repository,
    upstreamCommit: config.upstream.commit,
    upstreamSourcePaths: [...config.upstream.sourcePaths],
    probeIds: [...config.probePlan.probeIds],
    observationPhases: [...config.probePlan.observationPhases],
    counters: [...config.probePlan.counters],
    ...config.controls,
    ...config.prohibitedPreparation,
    ...overrides
  };
}

const decision = r3o.evaluateRepositoryReadiness(readinessInput());
assert.equal(decision.decision, 'repository_hosted_runtime_observation_contract_ready_no_remote_authority');
assert.equal(decision.preciseObservation, r3o.PRECISE_OBSERVATION);
assert.deepEqual([...decision.probes.map((probe) => probe.id)], [...r3o.PROBE_IDS]);
assert.equal(decision.exactRootCauseProven, false);
assert.equal(decision.causalPromotionAllowed, false);
assert.equal(decision.remoteExecutionAuthority, false);
assert.equal(decision.stagingReadAuthority, false);
assert.equal(decision.stagingMutationAuthority, false);
assert.equal(decision.productionAuthority, false);
assert.equal(decision.pullRequestMergeAuthority, false);

for (const field of Object.keys(config.controls)) {
  const blocked = r3o.evaluateRepositoryReadiness(readinessInput({ [field]: false }));
  assert.equal(blocked.decision, 'blocked_repository_only', field);
}

for (const field of Object.keys(config.prohibitedPreparation)) {
  const blocked = r3o.evaluateRepositoryReadiness(readinessInput({ [field]: true }));
  assert.equal(blocked.decision, 'blocked_repository_only', field);
}

assert.equal(
  r3o.classifyFutureObservation({
    anchorJoinSubscribed: true,
    anchorBroadcastEvaluationObserved: true,
    anchorPresenceEvaluationObserved: false,
    anchorPresenceStateObserved: false,
    presenceOnlyBroadcastEvaluationObserved: true,
    presenceOnlyPresenceEvaluationObserved: false,
    presenceOnlyJoinSubscribed: false
  }).classification,
  'hosted_presence_extension_selection_diverged'
);

assert.equal(
  r3o.classifyFutureObservation({
    anchorJoinSubscribed: true,
    anchorBroadcastEvaluationObserved: true,
    anchorPresenceEvaluationObserved: true,
    anchorPresenceStateObserved: false,
    presenceOnlyBroadcastEvaluationObserved: true,
    presenceOnlyPresenceEvaluationObserved: true,
    presenceOnlyJoinSubscribed: false
  }).classification,
  'hosted_presence_read_effective_gate_diverged'
);

assert.equal(
  r3o.classifyFutureObservation({
    anchorJoinSubscribed: true,
    anchorBroadcastEvaluationObserved: true,
    anchorPresenceEvaluationObserved: true,
    anchorPresenceStateObserved: true,
    presenceOnlyBroadcastEvaluationObserved: true,
    presenceOnlyPresenceEvaluationObserved: true,
    presenceOnlyJoinSubscribed: false
  }).classification,
  'hosted_presence_only_or_join_diverged'
);

assert.equal(
  r3o.classifyFutureObservation({
    anchorJoinSubscribed: true,
    anchorBroadcastEvaluationObserved: true,
    anchorPresenceEvaluationObserved: true,
    anchorPresenceStateObserved: true,
    presenceOnlyBroadcastEvaluationObserved: true,
    presenceOnlyPresenceEvaluationObserved: true,
    presenceOnlyJoinSubscribed: true
  }).classification,
  'hosted_runtime_observation_matches_pinned_presence_path'
);

assert.equal(evidence.contractId, r3o.CONTRACT_ID);
assert.equal(evidence.status, 'repository_hosted_runtime_observation_contract_certified_no_remote_authority');
assert.equal(evidence.initialBoundaryCommit, '6fbf528b045c105e8ff35be70b416220784d324f');
assert.equal(evidence.certificationHistory.initialFailClosed.conclusion, 'failure');
assert.equal(evidence.certificationHistory.initialFailClosed.failedStep, 'Domain Completion Matrix');
assert.equal(evidence.certificationHistory.initialFailClosed.syntaxPassed, true);
assert.equal(evidence.certificationHistory.initialFailClosed.observationContractPassed, true);
assert.equal(evidence.certificationHistory.initialFailClosed.preRemoteHardBlockPassed, true);
assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.writerConclusion, 'success');
assert.deepEqual(evidence.certificationHistory.canonicalMatrixReconciliation.writerOutputs, [
  'docs/DOMAIN-COMPLETION-MATRIX.md',
  'reports/generated/domain-completion-matrix-report.json'
]);
assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.matrixSourceChanged, false);
assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.workflowPermissions, 'contents: read');
assert.equal(evidence.certificationHistory.normalHeadCertification.head, '851da24a6f46d08072dbb0ffd46db7aae1e1445e');
assert.equal(evidence.certificationHistory.normalHeadCertification.r3oConclusion, 'success');
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
  contractId: r3o.CONTRACT_ID,
  decision: decision.decision,
  evidenceStatus: evidence.status,
  preciseObservation: decision.preciseObservation,
  probes: decision.probes.map((probe) => probe.id),
  instrumentation: decision.instrumentation.mechanism,
  remoteExecutionAuthority: decision.remoteExecutionAuthority,
  exactRootCauseProven: decision.exactRootCauseProven
})}\n`);
