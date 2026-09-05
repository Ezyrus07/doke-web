'use strict';

const r3p = require('./community-realtime-private-auth-r3p');
const r3o = require('./community-realtime-private-auth-r3o');

const CONTRACT_ID = 'com-b03c-r3q-repository-executable-observation-envelope-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R3Q-REPOSITORY-EXECUTABLE-OBSERVATION-ENVELOPE-READINESS';
const PREDECESSOR_VALIDATION_ID = 'COM-B03C-R3P-HOSTED-RUNTIME-OBSERVATION-HARNESS-READINESS';
const PREDECESSOR_STATUS = 'repository_synthetic_two_probe_harness_certified_no_remote_authority';
const PREDECESSOR_HEAD = '9edd894e6f7f97a681b6fef85ec2b20977478a27';
const PREDECESSOR_RECERT_RUN = 31399720856;
const PREDECESSOR_RECERT_JOB = 93491364924;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';

const ENVELOPE_PHASES = Object.freeze([
  'preflight',
  'baseline_before_probe',
  'install_instrumentation',
  'presence_read_effective_gate',
  'after_presence_read_effective_gate',
  'presence_only_join',
  'after_presence_only_join',
  'cleanup',
  'after_cleanup',
  'classify'
]);

const ADAPTER_METHODS = Object.freeze([
  'preflight',
  'snapshotPolicies',
  'installInstrumentation',
  'runPresenceReadEffectiveGate',
  'readCounters',
  'switchToPresenceOnlyPolicy',
  'runPresenceOnlyJoin',
  'cleanup',
  'assertZeroResidue'
]);

const FORBIDDEN_ADAPTER_METHODS = Object.freeze([
  'connect',
  'query',
  'createClient',
  'loadCredentials',
  'loadRemoteDependencies',
  'deploy',
  'push',
  'merge'
]);

const INSTRUMENTATION_SPEC = Object.freeze({
  mechanism: 'temporary_security_definer_probe_function_plus_nontransactional_sequences',
  counters: ['broadcast_rls_evaluations', 'presence_rls_evaluations'],
  anchorPolicy: {
    broadcastRead: true,
    presenceRead: true,
    purpose: 'Guarantee join through broadcast while observing effective presence.read.'
  },
  presenceOnlyPolicy: {
    broadcastRead: false,
    presenceRead: true,
    purpose: 'Isolate whether presence.read alone satisfies the private-channel OR join.'
  },
  cleanup: {
    policies: 'remove_all_temporary_probe_policies',
    function: 'remove_temporary_probe_function',
    sequences: 'remove_temporary_probe_sequences',
    requireZeroResidue: true
  },
  executableSqlPrepared: false
});

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
    repositoryExecutableEnvelopeAuthority: false,
    remoteAdapterBindingAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    realtimeSubscriptionAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    ...extra
  });
}

function assertSyntheticAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') throw new TypeError('SYNTHETIC_ADAPTER_REQUIRED');
  if (adapter.kind !== 'synthetic_repository' || adapter.remoteCapable !== false) {
    throw new Error('REMOTE_CAPABLE_ADAPTER_PROHIBITED');
  }
  for (const method of ADAPTER_METHODS) {
    if (typeof adapter[method] !== 'function') throw new TypeError(`MISSING_ADAPTER_METHOD_${method}`);
  }
  for (const method of FORBIDDEN_ADAPTER_METHODS) {
    if (typeof adapter[method] === 'function') throw new Error(`FORBIDDEN_REMOTE_ADAPTER_METHOD_${method}`);
  }
  return adapter;
}

function makeTrace() {
  const entries = [];
  return {
    push(phase) {
      entries.push(String(phase));
    },
    snapshot() {
      return Object.freeze([...entries]);
    }
  };
}

async function executeRepositoryObservationEnvelope(input = {}, adapterInput) {
  if (input.mode !== 'synthetic_repository') throw new Error('SYNTHETIC_REPOSITORY_MODE_REQUIRED');
  const adapter = assertSyntheticAdapter(adapterInput);
  const trace = makeTrace();

  let baselinePolicySnapshot;
  let baselineCounters;
  let afterAnchorCounters;
  let afterPresenceOnlyCounters;
  let afterCleanupCounters;
  let anchorResult;
  let presenceOnlyResult;
  let cleanupAttempted = false;
  let zeroResidueProven = false;

  await adapter.preflight();
  trace.push('preflight');

  baselinePolicySnapshot = await adapter.snapshotPolicies('baseline_before_probe');
  if (!baselinePolicySnapshot || baselinePolicySnapshot.complete !== true) {
    throw new Error('BASELINE_POLICY_SNAPSHOT_REQUIRED');
  }
  baselineCounters = await adapter.readCounters('baseline_before_probe');
  trace.push('baseline_before_probe');

  try {
    await adapter.installInstrumentation(INSTRUMENTATION_SPEC);
    trace.push('install_instrumentation');

    anchorResult = await adapter.runPresenceReadEffectiveGate({
      probeId: 'presence_read_effective_gate',
      privateChannel: true,
      presenceExplicitlyEnabled: true,
      presenceListenerRegisteredBeforeSubscribe: true
    });
    trace.push('presence_read_effective_gate');

    afterAnchorCounters = await adapter.readCounters('after_presence_read_effective_gate');
    trace.push('after_presence_read_effective_gate');

    await adapter.switchToPresenceOnlyPolicy(INSTRUMENTATION_SPEC.presenceOnlyPolicy);

    presenceOnlyResult = await adapter.runPresenceOnlyJoin({
      probeId: 'presence_only_join',
      privateChannel: true,
      presenceExplicitlyEnabled: true,
      presenceListenerRegisteredBeforeSubscribe: true
    });
    trace.push('presence_only_join');

    afterPresenceOnlyCounters = await adapter.readCounters('after_presence_only_join');
    trace.push('after_presence_only_join');
  } finally {
    cleanupAttempted = true;
    await adapter.cleanup();
    trace.push('cleanup');
    afterCleanupCounters = await adapter.readCounters('after_cleanup');
    trace.push('after_cleanup');
    zeroResidueProven = await adapter.assertZeroResidue() === true;
  }

  if (!zeroResidueProven) throw new Error('ZERO_RESIDUE_REQUIRED');
  if (!anchorResult || !presenceOnlyResult) throw new Error('PROBE_RESULT_REQUIRED');

  const harnessResult = r3p.runSyntheticObservationHarness({
    identityId: input.identityId,
    anchorIdentityId: input.identityId,
    presenceOnlyIdentityId: input.identityId,
    tokenFingerprint: input.tokenFingerprint,
    anchorTokenFingerprint: input.tokenFingerprint,
    presenceOnlyTokenFingerprint: input.tokenFingerprint,
    anchorClientId: input.anchorClientId,
    presenceOnlyClientId: input.presenceOnlyClientId,
    anchorTopic: input.anchorTopic,
    presenceOnlyTopic: input.presenceOnlyTopic,
    privateChannel: true,
    presenceExplicitlyEnabled: true,
    presenceListenerRegisteredBeforeSubscribe: true,
    baselinePolicySnapshotComplete: baselinePolicySnapshot.complete === true,
    baselinePolicyImmutableDuringHarness: baselinePolicySnapshot.immutable === true,
    snapshots: {
      baseline_before_probe: baselineCounters,
      after_presence_read_effective_gate: afterAnchorCounters,
      after_presence_only_join: afterPresenceOnlyCounters,
      after_cleanup: afterCleanupCounters
    },
    anchorJoinSubscribed: anchorResult.joinSubscribed === true,
    anchorPresenceStateObserved: anchorResult.presenceStateObserved === true,
    presenceOnlyJoinSubscribed: presenceOnlyResult.joinSubscribed === true,
    cleanupComplete: cleanupAttempted,
    zeroResidueProven
  });
  trace.push('classify');

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    mode: 'synthetic_repository',
    envelopeTrace: trace.snapshot(),
    instrumentationSpec: INSTRUMENTATION_SPEC,
    harnessContractId: r3p.CONTRACT_ID,
    classifierContractId: r3o.CONTRACT_ID,
    classification: harnessResult.classification,
    observation: harnessResult.observation,
    deltas: harnessResult.deltas,
    cleanupAttempted,
    zeroResidueProven,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    remoteExecutionAuthority: false
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3P_VALIDATION_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3P_CERTIFIED_STATUS_REQUIRED');
  if (input.predecessorHead !== PREDECESSOR_HEAD) return blocked('R3P_EVIDENCE_HEAD_REQUIRED');
  if (input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN ||
      input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB ||
      input.predecessorRecertSuccess !== true) {
    return blocked('R3P_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION ||
      input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (input.r3pContractId !== r3p.CONTRACT_ID ||
      input.r3oContractId !== r3o.CONTRACT_ID ||
      !exactArray(input.envelopePhases, ENVELOPE_PHASES) ||
      !exactArray(input.adapterMethods, ADAPTER_METHODS) ||
      !exactArray(input.forbiddenAdapterMethods, FORBIDDEN_ADAPTER_METHODS)) {
    return blocked('R3P_R3O_EXECUTABLE_ENVELOPE_CONTINUITY_REQUIRED');
  }

  const required = [
    'syntheticAdapterOnly',
    'dependencyInjectedAdapterRequired',
    'remoteCapableAdapterRejected',
    'exactLifecycleOrderingRequired',
    'baselinePolicySnapshotRequired',
    'instrumentationSpecPinned',
    'anchorProbeSemanticsPinned',
    'presenceOnlyProbeSemanticsPinned',
    'counterSnapshotsRequired',
    'cleanupInFinallyRequired',
    'zeroResidueRequired',
    'r3pHarnessReusedWithoutForking',
    'r3oClassifierTransitivelyReused',
    'failureCleanupCovered',
    'allFourClassificationsCovered',
    'noExecutableSqlPrepared',
    'noRemoteBindingPrepared',
    'noCausalPromotionWithoutRemoteObservation'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R3Q_EXECUTABLE_ENVELOPE_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'authorizationPhraseDefined',
    'triggerPrepared',
    'stagingEnvironmentJobPrepared',
    'workflowSecretsReferenced',
    'remoteCredentialLoadingPrepared',
    'remoteDependencyLoadingPrepared',
    'supabaseClientPrepared',
    'pgClientPrepared',
    'remoteExecutorPrepared',
    'stagingReadPrepared',
    'stagingMutationPrepared',
    'runtimePolicyChangePrepared',
    'runtimeDeployPrepared',
    'productionPrepared',
    'mergePrepared'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R3Q_REMOTE_SCOPE_PROHIBITED', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_executable_observation_envelope_ready_no_remote_authority',
    reason: null,
    envelopePhases: ENVELOPE_PHASES,
    adapterMethods: ADAPTER_METHODS,
    forbiddenAdapterMethods: FORBIDDEN_ADAPTER_METHODS,
    instrumentationSpec: INSTRUMENTATION_SPEC,
    executableEntrypoint: 'executeRepositoryObservationEnvelope',
    repositoryExecutableEnvelopeAuthority: true,
    remoteAdapterBindingAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    realtimeSubscriptionAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    nextBoundaryRequirement:
      'Certify a separate repository-only remote-adapter binding boundary for this envelope. Do not define staging authorization, trigger, secrets, environment jobs or remote execution in R3Q.'
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
  ENVELOPE_PHASES,
  ADAPTER_METHODS,
  FORBIDDEN_ADAPTER_METHODS,
  INSTRUMENTATION_SPEC,
  assertSyntheticAdapter,
  executeRepositoryObservationEnvelope,
  evaluateRepositoryReadiness
});
