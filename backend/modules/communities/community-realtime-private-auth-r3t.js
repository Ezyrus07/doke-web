'use strict';

const r3q = require('./community-realtime-private-auth-r3q');
const r3r = require('./community-realtime-private-auth-r3r');
const r3s = require('./community-realtime-private-auth-r3s');
const r3g = require('./community-realtime-private-auth-r3g');
const r3k = require('./community-realtime-private-auth-r3k');

const CONTRACT_ID = 'com-b03c-r3t-complete-r3q-adapter-composition-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R3T-COMPLETE-R3Q-ADAPTER-COMPOSITION-READINESS';
const PREDECESSOR_VALIDATION_ID = r3s.VALIDATION_ID;
const PREDECESSOR_STATUS = 'repository_constrained_observation_primitives_certified_no_remote_authority';
const PREDECESSOR_HEAD = '2a6cd384af6b141b2c61430ac15e4df777655cdd';
const PREDECESSOR_RECERT_RUN = 31406719279;
const PREDECESSOR_RECERT_JOB = 93514746276;
const PREDECESSOR_MATRIX_RECERT_RUN = 31406719027;
const PREDECESSOR_MATRIX_RECERT_JOB = 93514744241;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';

const REMOTE_EXECUTION_BLOCK_CODE =
  'DOKE_COM_B03C_R3T_REMOTE_ADAPTER_ACTIVATION_BOUNDARY_REQUIRED';

const LIFECYCLE_METHODS = Object.freeze([
  'preflight',
  'snapshotPolicies',
  'installInstrumentation',
  'runPresenceReadEffectiveGate',
  'switchToPresenceOnlyPolicy',
  'runPresenceOnlyJoin',
  'cleanup'
]);

const OBSERVATION_METHODS = Object.freeze([
  'readCounters',
  'assertZeroResidue'
]);

const FORBIDDEN_PROVIDER_METHODS = Object.freeze([
  'query',
  'connect',
  'createClient',
  'loadCredentials',
  'loadRemoteDependencies',
  'executeSql',
  'deploy',
  'push',
  'merge'
]);

const METHOD_PROVIDER_MAP = Object.freeze({
  preflight: 'r3g_r3k_lifecycle_provider',
  snapshotPolicies: 'r3g_r3k_lifecycle_provider',
  installInstrumentation: 'r3g_r3k_lifecycle_provider',
  runPresenceReadEffectiveGate: 'r3g_r3k_lifecycle_provider',
  readCounters: 'r3s_observation_primitives',
  switchToPresenceOnlyPolicy: 'r3g_r3k_lifecycle_provider',
  runPresenceOnlyJoin: 'r3g_r3k_lifecycle_provider',
  cleanup: 'r3g_r3k_lifecycle_provider',
  assertZeroResidue: 'r3s_observation_primitives'
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
    repositoryCompleteAdapterCompositionAuthority: false,
    remoteAdapterActivationAuthority: false,
    remoteExecutionAuthority: false,
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

function assertRemoteActivationBoundaryAbsent() {
  const error = new Error(REMOTE_EXECUTION_BLOCK_CODE);
  error.code = REMOTE_EXECUTION_BLOCK_CODE;
  throw error;
}

function assertSyntheticLifecycleProvider(provider) {
  if (!provider || typeof provider !== 'object') {
    throw new TypeError('R3T_SYNTHETIC_LIFECYCLE_PROVIDER_REQUIRED');
  }
  if (provider.kind !== 'synthetic_repository' || provider.remoteCapable !== false) {
    throw new Error('R3T_REMOTE_CAPABLE_LIFECYCLE_PROVIDER_PROHIBITED');
  }
  for (const method of LIFECYCLE_METHODS) {
    if (typeof provider[method] !== 'function') {
      throw new TypeError(`R3T_MISSING_LIFECYCLE_METHOD_${method}`);
    }
  }
  for (const method of FORBIDDEN_PROVIDER_METHODS) {
    if (typeof provider[method] === 'function') {
      throw new Error(`R3T_FORBIDDEN_PROVIDER_METHOD_${method}`);
    }
  }
  return provider;
}

function inspectCompleteComposition() {
  const r3rState = r3r.inspectBindingCompleteness();
  const originalGaps = [...r3rState.missingCapabilities];
  const r3sCapabilities = [...r3s.REQUIRED_CAPABILITIES];
  const methods = r3q.ADAPTER_METHODS.map((method) => freeze({
    method,
    provider: METHOD_PROVIDER_MAP[method],
    bound: METHOD_PROVIDER_MAP[method] !== undefined
  }));
  return freeze({
    methods,
    methodCount: methods.length,
    boundMethodCount: methods.filter((entry) => entry.bound).length,
    unboundMethodCount: methods.filter((entry) => !entry.bound).length,
    fullyBound: methods.length === r3q.ADAPTER_METHODS.length && methods.every((entry) => entry.bound),
    originalR3rGaps: Object.freeze(originalGaps),
    r3sCapabilities: Object.freeze(r3sCapabilities),
    gapSetSatisfiedByR3s: exactArray(originalGaps, r3sCapabilities),
    remoteActivationAuthority: false
  });
}

function buildCompleteR3qRepositoryAdapter({ lifecycleProvider: lifecycleProviderInput, observationExecutor, ownershipToken } = {}) {
  const lifecycleProvider = assertSyntheticLifecycleProvider(lifecycleProviderInput);
  const token = r3s.assertOwnershipToken(ownershipToken);
  const observationPrimitives = r3s.buildRepositoryObservationPrimitives(observationExecutor);

  const adapter = {
    kind: 'synthetic_repository',
    remoteCapable: false,
    async preflight() { return lifecycleProvider.preflight(); },
    async snapshotPolicies(phase) { return lifecycleProvider.snapshotPolicies(phase); },
    async installInstrumentation(spec) {
      if (spec !== r3q.INSTRUMENTATION_SPEC || spec.executableSqlPrepared !== false) {
        throw new Error('R3T_PINNED_NONEXECUTABLE_INSTRUMENTATION_SPEC_REQUIRED');
      }
      return lifecycleProvider.installInstrumentation(spec);
    },
    async runPresenceReadEffectiveGate(input) { return lifecycleProvider.runPresenceReadEffectiveGate(input); },
    async readCounters(phase) { return observationPrimitives.readCounters(phase, { ownershipToken: token }); },
    async switchToPresenceOnlyPolicy(policy) {
      if (policy !== r3q.INSTRUMENTATION_SPEC.presenceOnlyPolicy) {
        throw new Error('R3T_PINNED_PRESENCE_ONLY_POLICY_REQUIRED');
      }
      return lifecycleProvider.switchToPresenceOnlyPolicy(policy);
    },
    async runPresenceOnlyJoin(input) { return lifecycleProvider.runPresenceOnlyJoin(input); },
    async cleanup() { return lifecycleProvider.cleanup(); },
    async assertZeroResidue() { return observationPrimitives.assertZeroResidue({ ownershipToken: token }); }
  };

  return r3q.assertSyntheticAdapter(freeze(adapter));
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3S_VALIDATION_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3S_CERTIFIED_STATUS_REQUIRED');
  if (input.predecessorHead !== PREDECESSOR_HEAD) return blocked('R3S_EVIDENCE_HEAD_REQUIRED');
  if (input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN || input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB || input.predecessorRecertSuccess !== true) {
    return blocked('R3S_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (input.predecessorMatrixRecertRun !== PREDECESSOR_MATRIX_RECERT_RUN || input.predecessorMatrixRecertJob !== PREDECESSOR_MATRIX_RECERT_JOB || input.predecessorMatrixRecertSuccess !== true) {
    return blocked('R3S_MATRIX_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION || input.maturity !== REQUIRED_MATURITY || input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (input.r3qContractId !== r3q.CONTRACT_ID || input.r3rContractId !== r3r.CONTRACT_ID || input.r3sContractId !== r3s.CONTRACT_ID || input.r3gContractId !== r3g.CONTRACT_ID || input.r3kContractId !== r3k.CONTRACT_ID) {
    return blocked('R3Q_R3R_R3S_R3G_R3K_CONTRACT_CONTINUITY_REQUIRED');
  }
  if (!exactArray(input.adapterMethods, r3q.ADAPTER_METHODS) || !exactArray(input.lifecycleMethods, LIFECYCLE_METHODS) || !exactArray(input.observationMethods, OBSERVATION_METHODS) || !exactArray(input.originalR3rGaps, r3r.REQUIRED_MISSING_CAPABILITIES) || !exactArray(input.r3sCapabilities, r3s.REQUIRED_CAPABILITIES) || !exactArray(input.forbiddenProviderMethods, FORBIDDEN_PROVIDER_METHODS)) {
    return blocked('R3T_COMPOSITION_CONTRACT_CONTINUITY_REQUIRED');
  }

  const required = [
    'completeAdapterFactoryPrepared', 'exactNineMethodSurfaceRequired', 'sevenLifecycleMethodsSyntheticOnly',
    'twoObservationMethodsFromR3s', 'r3sCounterPrimitiveBoundByReference', 'r3sResiduePrimitiveBoundByReference',
    'r3qSyntheticAdapterValidationReused', 'r3qExecutableEnvelopeReused', 'r3rGapSetSatisfiedExactlyByR3s',
    'r3gContractContinuityPreserved', 'r3kContractContinuityPreserved', 'r3sOwnershipScopePreserved',
    'r3sDescriptorsReusedWithoutForking', 'pinnedInstrumentationSpecRequired', 'pinnedPresenceOnlyPolicyRequired',
    'allFourR3qClassificationsCovered', 'failureCleanupCovered', 'remoteCapableLifecycleProviderRejected',
    'remoteCapableObservationExecutorRejected', 'genericRemoteMethodsRejected', 'noExecutableSqlPrepared',
    'noCredentialValuesPrepared', 'noRemoteDependenciesLoaded', 'noRemoteClientInstantiated',
    'noRemoteExecutionPathActivated', 'noCausalPromotionWithoutRemoteObservation'
  ];
  for (const flag of required) if (input[flag] !== true) return blocked('R3T_COMPLETE_ADAPTER_CONTROL_REQUIRED', { flag });

  const prohibited = [
    'authorizationPhraseDefined', 'triggerPrepared', 'stagingEnvironmentJobPrepared', 'workflowSecretsReferenced',
    'remoteCredentialLoadingPrepared', 'remoteDependencyLoadingPrepared', 'instrumentationSqlPrepared',
    'counterReadSqlPrepared', 'residueInspectionSqlPrepared', 'supabaseClientPrepared', 'pgClientPrepared',
    'remoteExecutorPrepared', 'stagingReadPrepared', 'stagingMutationPrepared', 'runtimePolicyChangePrepared',
    'runtimeDeployPrepared', 'productionPrepared', 'mergePrepared'
  ];
  for (const flag of prohibited) if (input[flag] !== false) return blocked('R3T_REMOTE_SCOPE_PROHIBITED', { flag });

  const composition = inspectCompleteComposition();
  if (composition.fullyBound !== true || composition.methodCount !== r3q.ADAPTER_METHODS.length || composition.boundMethodCount !== r3q.ADAPTER_METHODS.length || composition.unboundMethodCount !== 0 || composition.gapSetSatisfiedByR3s !== true) {
    return blocked('R3T_NINE_OF_NINE_COMPOSITION_REQUIRED');
  }
  if (r3q.INSTRUMENTATION_SPEC.executableSqlPrepared !== false || r3s.COUNTER_READ_DESCRIPTOR.executableSqlPrepared !== false || r3s.RESIDUE_INSPECTION_DESCRIPTOR.executableSqlPrepared !== false) {
    return blocked('R3T_COMPOSITION_MUST_REMAIN_NONEXECUTABLE');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_complete_r3q_adapter_composition_ready_nine_of_nine_no_remote_authority',
    reason: null,
    composition,
    adapterMethods: r3q.ADAPTER_METHODS,
    lifecycleMethods: LIFECYCLE_METHODS,
    observationMethods: OBSERVATION_METHODS,
    methodProviderMap: METHOD_PROVIDER_MAP,
    executableEntrypoint: 'buildCompleteR3qRepositoryAdapter',
    repositoryCompleteAdapterCompositionAuthority: true,
    remoteAdapterActivationAuthority: false,
    remoteExecutionAuthority: false,
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
    nextBoundaryRequirement: 'Materialize and certify the exact repository-only instrumentation SQL and constrained observation binding needed by this complete adapter. Do not define staging authorization, trigger, secrets, environment jobs or remote execution in R3T.'
  });
}

module.exports = freeze({
  CONTRACT_ID, VALIDATION_ID, PREDECESSOR_VALIDATION_ID, PREDECESSOR_STATUS, PREDECESSOR_HEAD,
  PREDECESSOR_RECERT_RUN, PREDECESSOR_RECERT_JOB, PREDECESSOR_MATRIX_RECERT_RUN, PREDECESSOR_MATRIX_RECERT_JOB,
  MATRIX_VERSION, REQUIRED_MATURITY, REQUIRED_PRODUCTION_GATE, REMOTE_EXECUTION_BLOCK_CODE,
  LIFECYCLE_METHODS, OBSERVATION_METHODS, FORBIDDEN_PROVIDER_METHODS, METHOD_PROVIDER_MAP,
  assertRemoteActivationBoundaryAbsent, assertSyntheticLifecycleProvider, inspectCompleteComposition,
  buildCompleteR3qRepositoryAdapter, evaluateRepositoryReadiness
});