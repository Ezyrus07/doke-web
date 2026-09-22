'use strict';

const CONTRACT_ID = 'com-b03c-r3o-hosted-runtime-observation-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R3O-HOSTED-RUNTIME-OBSERVATION-READINESS';
const PREDECESSOR_VALIDATION_ID = 'COM-B03C-R3N-HOSTED-REALTIME-RUNTIME-PARITY-READINESS';
const PREDECESSOR_STATUS = 'repository_hosted_realtime_runtime_parity_contradiction_certified_no_remote_authority';
const PREDECESSOR_HEAD = 'ea8c3825aa8f3a16a405549ffb9bc6155cb2e673';
const PREDECESSOR_RECERT_RUN = 31393980380;
const PREDECESSOR_RECERT_JOB = 93472241908;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';

const UPSTREAM_REPOSITORY = 'supabase/realtime';
const UPSTREAM_COMMIT = '744c6d60f000f721c3942b6df0e7601f54a3b69d';
const UPSTREAM_SOURCE_PATHS = Object.freeze([
  'lib/realtime/tenants/authorization.ex',
  'lib/realtime/api/message.ex',
  'lib/realtime_web/channels/realtime_channel.ex',
  'lib/realtime_web/channels/realtime_channel/message_dispatcher.ex',
  'lib/realtime_web/channels/realtime_channel/presence_handler.ex'
]);

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

const PRECISE_OBSERVATION = 'hosted_presence_extension_selection_read_flag_and_or_join_authorization';

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
    repositoryObservationDesignAuthority: false,
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

function classifyFutureObservation(input = {}) {
  const requiredBooleanFields = [
    'anchorJoinSubscribed',
    'anchorBroadcastEvaluationObserved',
    'anchorPresenceEvaluationObserved',
    'anchorPresenceStateObserved',
    'presenceOnlyBroadcastEvaluationObserved',
    'presenceOnlyPresenceEvaluationObserved',
    'presenceOnlyJoinSubscribed'
  ];
  for (const field of requiredBooleanFields) {
    if (typeof input[field] !== 'boolean') {
      return freeze({ classification: 'incomplete_observation', reason: `MISSING_${field}` });
    }
  }

  if (!input.anchorPresenceEvaluationObserved || !input.presenceOnlyPresenceEvaluationObserved) {
    return freeze({
      classification: 'hosted_presence_extension_selection_diverged',
      exactRootCauseProven: false,
      causalPromotionAllowed: false
    });
  }

  if (!input.anchorJoinSubscribed) {
    return freeze({
      classification: 'anchor_join_failed_before_presence_flag_observation',
      exactRootCauseProven: false,
      causalPromotionAllowed: false
    });
  }

  if (!input.anchorPresenceStateObserved) {
    return freeze({
      classification: 'hosted_presence_read_effective_gate_diverged',
      exactRootCauseProven: false,
      causalPromotionAllowed: false
    });
  }

  if (!input.presenceOnlyJoinSubscribed) {
    return freeze({
      classification: 'hosted_presence_only_or_join_diverged',
      exactRootCauseProven: false,
      causalPromotionAllowed: false
    });
  }

  return freeze({
    classification: 'hosted_runtime_observation_matches_pinned_presence_path',
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3N_VALIDATION_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3N_CERTIFIED_STATUS_REQUIRED');
  if (input.predecessorHead !== PREDECESSOR_HEAD) return blocked('R3N_EVIDENCE_HEAD_REQUIRED');
  if (input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN ||
      input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB ||
      input.predecessorRecertSuccess !== true) {
    return blocked('R3N_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION ||
      input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (input.upstreamRepository !== UPSTREAM_REPOSITORY ||
      input.upstreamCommit !== UPSTREAM_COMMIT ||
      !exactArray(input.upstreamSourcePaths, UPSTREAM_SOURCE_PATHS)) {
    return blocked('PINNED_UPSTREAM_AUTHORIZATION_PATH_REQUIRED');
  }
  if (!exactArray(input.probeIds, PROBE_IDS)) return blocked('EXACT_TWO_PROBE_PLAN_REQUIRED');
  if (!exactArray(input.observationPhases, OBSERVATION_PHASES)) return blocked('EXACT_OBSERVATION_PHASES_REQUIRED');
  if (!exactArray(input.counters, COUNTERS)) return blocked('EXACT_ROLLBACK_RESISTANT_COUNTER_SET_REQUIRED');

  const required = [
    'r3lExtensionDirectWasLiteralPresencePredicateObserved',
    'r3lStructuralPolicyMaterializationCompleteObserved',
    'r3lZeroResidueObserved',
    'r3nContradictionCertifiedObserved',
    'upstreamPresenceEnabledControlsExtensionSelectionObserved',
    'upstreamReadFlagsDerivedFromReturnedSyntheticIdsObserved',
    'upstreamJoinUsesBroadcastOrPresenceReadObserved',
    'upstreamPresenceStateRequiresPresenceReadObserved',
    'upstreamPresenceDiffFastlaneRequiresPresenceReadObserved',
    'anchorProbeJoinGuaranteedByBroadcastDesign',
    'anchorProbePresenceStateIsEffectiveReadFlagObservation',
    'presenceOnlyProbeDeniesBroadcastAndAllowsPresenceDesign',
    'policyInstrumentationCountsBroadcastAndPresenceRlsEvaluation',
    'sequenceCountersSelectedBecauseNextvalSurvivesTransactionAbort',
    'sameSyntheticIdentityTokenRequired',
    'freshRealtimeClientPerProbeRequired',
    'uniqueTopicPerProbeRequired',
    'privateChannelRequired',
    'presenceExplicitlyEnabledRequired',
    'presenceListenerRegisteredBeforeSubscribeRequired',
    'completeRealtimeMessagesPolicySnapshotRequired',
    'baselinePolicyImmutabilityRequired',
    'cleanupAndZeroResidueRequired',
    'sanitizedArtifactRequired',
    'noCausalPromotionWithoutFutureObservation'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R3O_OBSERVATION_DESIGN_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'authorizationPhraseDefined',
    'triggerPrepared',
    'stagingEnvironmentJobPrepared',
    'remoteCredentialLoadingPrepared',
    'remoteDependencyLoadingPrepared',
    'remoteExecutorPrepared',
    'stagingReadPrepared',
    'stagingMutationPrepared',
    'runtimePolicyChangePrepared',
    'runtimeDeployPrepared',
    'productionPrepared',
    'mergePrepared'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R3O_REMOTE_SCOPE_PROHIBITED', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_hosted_runtime_observation_contract_ready_no_remote_authority',
    reason: null,
    preciseObservation: PRECISE_OBSERVATION,
    probes: [
      {
        id: 'presence_read_effective_gate',
        purpose: 'Observe extension selection and effective presence.read without depending on a Presence-only join.',
        readPolicySemantics: 'broadcast=true; presence=true; instrument every RLS evaluation by extension',
        expectedJoin: 'subscribed_via_broadcast_anchor',
        expectedPresenceSignal: 'presence_state_received_when_presence.read_is_effectively_true'
      },
      {
        id: 'presence_only_join',
        purpose: 'Observe whether a proven Presence read authorization is sufficient for the private-channel OR join.',
        readPolicySemantics: 'broadcast=false; presence=true; instrument every RLS evaluation by extension',
        expectedJoin: 'subscribed_via_presence_read'
      }
    ],
    instrumentation: {
      mechanism: 'temporary_security_definer_probe_function_plus_nontransactional_sequences',
      counterNames: COUNTERS,
      rationale: 'sequence nextval increments survive the Realtime authorization transaction rollback and can therefore expose which extension rows reached the RLS policy evaluation path'
    },
    classificationOutcomes: [
      'hosted_presence_extension_selection_diverged',
      'hosted_presence_read_effective_gate_diverged',
      'hosted_presence_only_or_join_diverged',
      'hosted_runtime_observation_matches_pinned_presence_path'
    ],
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    repositoryObservationDesignAuthority: true,
    remoteExecutionAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    nextBoundaryRequirement: 'Build and certify a repository-only synthetic harness for the two-probe observation contract before any staging authorization or executable envelope exists.'
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
  UPSTREAM_REPOSITORY,
  UPSTREAM_COMMIT,
  UPSTREAM_SOURCE_PATHS,
  PROBE_IDS,
  OBSERVATION_PHASES,
  COUNTERS,
  PRECISE_OBSERVATION,
  classifyFutureObservation,
  evaluateRepositoryReadiness
});
