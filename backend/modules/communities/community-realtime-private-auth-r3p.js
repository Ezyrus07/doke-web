'use strict';

const r3o = require('./community-realtime-private-auth-r3o');

const CONTRACT_ID = 'com-b03c-r3p-hosted-runtime-observation-harness-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R3P-HOSTED-RUNTIME-OBSERVATION-HARNESS-READINESS';
const PREDECESSOR_VALIDATION_ID = 'COM-B03C-R3O-HOSTED-RUNTIME-OBSERVATION-READINESS';
const PREDECESSOR_STATUS = 'repository_hosted_runtime_observation_contract_certified_no_remote_authority';
const PREDECESSOR_HEAD = 'b2577a0451e6fda3e7fc8d1a973666d88de02e73';
const PREDECESSOR_RECERT_RUN = 31396727790;
const PREDECESSOR_RECERT_JOB = 93481336148;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';

const PROBE_IDS = Object.freeze([
  'presence_read_effective_gate',
  'presence_only_join'
]);

const OBSERVATION_PHASES = Object.freeze([
  'baseline_before_probe',
  'after_presence_read_effective_gate',
  'after_presence_only_join',
  'after_cleanup'
]);

const COUNTERS = Object.freeze([
  'broadcast_rls_evaluations',
  'presence_rls_evaluations'
]);

const SYNTHETIC_SCENARIO_IDS = Object.freeze([
  'extension_selection_diverged',
  'presence_read_effective_gate_diverged',
  'presence_only_or_join_diverged',
  'pinned_presence_path_match'
]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function exactArray(actual, expected) {
  return Array.isArray(actual) &&
    JSON.stringify(actual.map(String)) === JSON.stringify(expected.map(String));
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'blocked_repository_only',
    reason,
    repositoryHarnessAuthority: false,
    remoteExecutionAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    ...extra
  });
}

function assertCounterSnapshot(snapshot, phase) {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new TypeError(`INVALID_COUNTER_SNAPSHOT_${phase}`);
  }
  const normalized = {};
  for (const counter of COUNTERS) {
    const value = snapshot[counter];
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TypeError(`INVALID_COUNTER_${phase}_${counter}`);
    }
    normalized[counter] = value;
  }
  return normalized;
}

function delta(after, before, counter) {
  const value = after[counter] - before[counter];
  if (value < 0) throw new Error(`COUNTER_REGRESSION_${counter}`);
  return value;
}

function runSyntheticObservationHarness(input = {}) {
  if (input.identityId !== input.anchorIdentityId ||
      input.identityId !== input.presenceOnlyIdentityId ||
      !input.identityId) {
    throw new Error('SAME_SYNTHETIC_IDENTITY_REQUIRED');
  }
  if (input.tokenFingerprint !== input.anchorTokenFingerprint ||
      input.tokenFingerprint !== input.presenceOnlyTokenFingerprint ||
      !input.tokenFingerprint) {
    throw new Error('SAME_SYNTHETIC_TOKEN_REQUIRED');
  }
  if (!input.anchorClientId || !input.presenceOnlyClientId ||
      input.anchorClientId === input.presenceOnlyClientId) {
    throw new Error('FRESH_CLIENT_PER_PROBE_REQUIRED');
  }
  if (!input.anchorTopic || !input.presenceOnlyTopic ||
      input.anchorTopic === input.presenceOnlyTopic) {
    throw new Error('UNIQUE_TOPIC_PER_PROBE_REQUIRED');
  }
  if (input.privateChannel !== true ||
      input.presenceExplicitlyEnabled !== true ||
      input.presenceListenerRegisteredBeforeSubscribe !== true) {
    throw new Error('PRIVATE_PRESENCE_PROBE_CONTRACT_REQUIRED');
  }
  if (input.baselinePolicySnapshotComplete !== true ||
      input.baselinePolicyImmutableDuringHarness !== true) {
    throw new Error('BASELINE_POLICY_GUARD_REQUIRED');
  }

  const baseline = assertCounterSnapshot(input.snapshots?.baseline_before_probe, 'baseline_before_probe');
  const afterAnchor = assertCounterSnapshot(
    input.snapshots?.after_presence_read_effective_gate,
    'after_presence_read_effective_gate'
  );
  const afterPresenceOnly = assertCounterSnapshot(
    input.snapshots?.after_presence_only_join,
    'after_presence_only_join'
  );
  const afterCleanup = assertCounterSnapshot(input.snapshots?.after_cleanup, 'after_cleanup');

  const anchorBroadcastDelta = delta(afterAnchor, baseline, 'broadcast_rls_evaluations');
  const anchorPresenceDelta = delta(afterAnchor, baseline, 'presence_rls_evaluations');
  const presenceOnlyBroadcastDelta = delta(
    afterPresenceOnly,
    afterAnchor,
    'broadcast_rls_evaluations'
  );
  const presenceOnlyPresenceDelta = delta(
    afterPresenceOnly,
    afterAnchor,
    'presence_rls_evaluations'
  );

  if (afterCleanup.broadcast_rls_evaluations !== afterPresenceOnly.broadcast_rls_evaluations ||
      afterCleanup.presence_rls_evaluations !== afterPresenceOnly.presence_rls_evaluations) {
    throw new Error('CLEANUP_MUST_NOT_EXECUTE_ADDITIONAL_RLS_EVALUATIONS');
  }
  if (input.cleanupComplete !== true || input.zeroResidueProven !== true) {
    throw new Error('ZERO_RESIDUE_REQUIRED');
  }

  const observation = {
    anchorJoinSubscribed: input.anchorJoinSubscribed === true,
    anchorBroadcastEvaluationObserved: anchorBroadcastDelta > 0,
    anchorPresenceEvaluationObserved: anchorPresenceDelta > 0,
    anchorPresenceStateObserved: input.anchorPresenceStateObserved === true,
    presenceOnlyBroadcastEvaluationObserved: presenceOnlyBroadcastDelta > 0,
    presenceOnlyPresenceEvaluationObserved: presenceOnlyPresenceDelta > 0,
    presenceOnlyJoinSubscribed: input.presenceOnlyJoinSubscribed === true
  };

  const classification = r3o.classifyFutureObservation(observation);

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    observation,
    deltas: {
      presence_read_effective_gate: {
        broadcast_rls_evaluations: anchorBroadcastDelta,
        presence_rls_evaluations: anchorPresenceDelta
      },
      presence_only_join: {
        broadcast_rls_evaluations: presenceOnlyBroadcastDelta,
        presence_rls_evaluations: presenceOnlyPresenceDelta
      }
    },
    classification: classification.classification,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    cleanupComplete: true,
    zeroResidueProven: true
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3O_VALIDATION_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3O_CERTIFIED_STATUS_REQUIRED');
  if (input.predecessorHead !== PREDECESSOR_HEAD) return blocked('R3O_EVIDENCE_HEAD_REQUIRED');
  if (input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN ||
      input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB ||
      input.predecessorRecertSuccess !== true) {
    return blocked('R3O_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION ||
      input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (input.r3oContractId !== r3o.CONTRACT_ID ||
      input.r3oPreciseObservation !== r3o.PRECISE_OBSERVATION ||
      !exactArray(input.probeIds, PROBE_IDS) ||
      !exactArray(input.observationPhases, OBSERVATION_PHASES) ||
      !exactArray(input.counters, COUNTERS) ||
      !exactArray(input.syntheticScenarioIds, SYNTHETIC_SCENARIO_IDS)) {
    return blocked('R3O_OBSERVATION_CONTRACT_CONTINUITY_REQUIRED');
  }

  const required = [
    'syntheticOnlyHarness',
    'counterDeltaValidationRequired',
    'monotonicCounterValidationRequired',
    'sameIdentityAndTokenValidationRequired',
    'freshClientPerProbeValidationRequired',
    'uniqueTopicPerProbeValidationRequired',
    'privatePresenceContractValidationRequired',
    'baselinePolicyGuardValidationRequired',
    'cleanupNoAdditionalEvaluationValidationRequired',
    'zeroResidueValidationRequired',
    'allFourR3OClassificationsCovered',
    'invalidLifecycleCasesCovered',
    'r3oClassifierReusedWithoutForking',
    'noExecutableSqlPrepared',
    'noSupabaseClientPrepared',
    'noRemoteExecutorPrepared',
    'noCausalPromotionWithoutRemoteObservation'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R3P_SYNTHETIC_HARNESS_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'authorizationPhraseDefined',
    'triggerPrepared',
    'stagingEnvironmentJobPrepared',
    'remoteCredentialLoadingPrepared',
    'remoteDependencyLoadingPrepared',
    'stagingReadPrepared',
    'stagingMutationPrepared',
    'runtimePolicyChangePrepared',
    'runtimeDeployPrepared',
    'productionPrepared',
    'mergePrepared'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R3P_REMOTE_SCOPE_PROHIBITED', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_synthetic_two_probe_harness_ready_no_remote_authority',
    reason: null,
    syntheticScenarioIds: SYNTHETIC_SCENARIO_IDS,
    probeIds: PROBE_IDS,
    observationPhases: OBSERVATION_PHASES,
    counters: COUNTERS,
    harness: {
      entrypoint: 'runSyntheticObservationHarness',
      classifierAuthority: r3o.CONTRACT_ID,
      remoteDependencies: false,
      executableSql: false
    },
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    repositoryHarnessAuthority: true,
    remoteExecutionAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    nextBoundaryRequirement:
      'Certify a separate repository-only executable envelope that can later materialize the R3O instrumentation lifecycle, but do not create a staging trigger or consume remote credentials without a new explicit single-use authorization.'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  PREDECESSOR_VALIDATION_ID,
  PREDECESSOR_STATUS,
  PREDECESSOR_HEAD,
  PREDECESSOR_RECERT_RUN,
  PREDECESSOR_RECERT_JOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  PROBE_IDS,
  OBSERVATION_PHASES,
  COUNTERS,
  SYNTHETIC_SCENARIO_IDS,
  runSyntheticObservationHarness,
  evaluateRepositoryReadiness
});
