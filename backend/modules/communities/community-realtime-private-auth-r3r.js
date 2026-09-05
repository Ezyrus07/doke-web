'use strict';

const r3q = require('./community-realtime-private-auth-r3q');
const r3g = require('./community-realtime-private-auth-r3g');
const r3k = require('./community-realtime-private-auth-r3k');

const CONTRACT_ID = 'com-b03c-r3r-r3q-remote-adapter-binding-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R3R-R3Q-REMOTE-ADAPTER-BINDING-READINESS';
const PREDECESSOR_VALIDATION_ID = r3q.VALIDATION_ID;
const PREDECESSOR_STATUS = 'repository_executable_observation_envelope_certified_no_remote_authority';
const PREDECESSOR_HEAD = '5238dc5474b8735f4b6269866a5b0c8bafbd1f41';
const PREDECESSOR_RECERT_RUN = 31401690653;
const PREDECESSOR_RECERT_JOB = 93497971761;
const PREDECESSOR_MATRIX_RECERT_RUN = 31401690681;
const PREDECESSOR_MATRIX_RECERT_JOB = 93497971321;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';

const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R3R_REMOTE_ACTIVATION_BOUNDARY_REQUIRED';

const BINDING_MAP = Object.freeze({
  preflight: Object.freeze({
    status: 'bound',
    providers: Object.freeze(['r3k.pull_request_checkpoint_preflight', 'r3g.management.inspectProject'])
  }),
  snapshotPolicies: Object.freeze({
    status: 'bound',
    providers: Object.freeze(['r3g.db.snapshot'])
  }),
  installInstrumentation: Object.freeze({
    status: 'bound_payload_deferred',
    providers: Object.freeze(['r3g.db.install']),
    deferred: 'authorized_instrumentation_statement_payload'
  }),
  runPresenceReadEffectiveGate: Object.freeze({
    status: 'bound',
    providers: Object.freeze(['r3g.realtime.createClient', 'r3g.realtime.subscribePresenceReadJoin'])
  }),
  readCounters: Object.freeze({
    status: 'unbound_required_capability',
    providers: Object.freeze([]),
    missingCapability: 'instrumentation_counter_read'
  }),
  switchToPresenceOnlyPolicy: Object.freeze({
    status: 'bound_payload_deferred',
    providers: Object.freeze(['r3g.db.drop', 'r3g.db.install']),
    deferred: 'authorized_presence_only_policy_statement_payload'
  }),
  runPresenceOnlyJoin: Object.freeze({
    status: 'bound',
    providers: Object.freeze(['r3g.realtime.createClient', 'r3g.realtime.subscribePresenceReadJoin'])
  }),
  cleanup: Object.freeze({
    status: 'bound_payload_deferred',
    providers: Object.freeze(['r3g.db.drop', 'r3g.realtime.remove']),
    deferred: 'authorized_instrumentation_cleanup_statement_payload'
  }),
  assertZeroResidue: Object.freeze({
    status: 'unbound_required_capability',
    providers: Object.freeze(['r3g.db.snapshot']),
    missingCapability: 'instrumentation_residue_inspection'
  })
});

const REQUIRED_MISSING_CAPABILITIES = Object.freeze([
  'instrumentation_counter_read',
  'instrumentation_residue_inspection'
]);

const REQUIRED_R3G_EXECUTOR_EXPORTS = Object.freeze([
  'buildPgDbAdapter',
  'buildSupabaseRealtimeAdapter',
  'buildManagementAdapter',
  'prepareRemoteRuntime'
]);

const REQUIRED_R3K_EXECUTOR_EXPORTS = Object.freeze([
  'prepareRemoteRuntime',
  'buildFutureLifecyclePlan',
  'buildRepositoryAdapters'
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
    repositoryBindingContractAuthority: false,
    remoteAdapterActivationAuthority: false,
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

function bindingEntries() {
  return r3q.ADAPTER_METHODS.map((method) => ({
    method,
    ...BINDING_MAP[method]
  }));
}

function inspectBindingCompleteness() {
  const entries = bindingEntries();
  const missingCapabilities = entries
    .filter((entry) => entry.status === 'unbound_required_capability')
    .map((entry) => entry.missingCapability);
  return freeze({
    adapterMethods: Object.freeze(entries.map((entry) => entry.method)),
    entries: Object.freeze(entries.map((entry) => freeze(entry))),
    missingCapabilities: Object.freeze(missingCapabilities),
    fullyBound: missingCapabilities.length === 0,
    remoteActivationAuthority: false
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) {
    return blocked('R3Q_VALIDATION_REQUIRED');
  }
  if (input.predecessorStatus !== PREDECESSOR_STATUS) {
    return blocked('R3Q_CERTIFIED_STATUS_REQUIRED');
  }
  if (input.predecessorHead !== PREDECESSOR_HEAD) {
    return blocked('R3Q_EVIDENCE_HEAD_REQUIRED');
  }
  if (
    input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN ||
    input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB ||
    input.predecessorRecertSuccess !== true
  ) {
    return blocked('R3Q_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (
    input.predecessorMatrixRecertRun !== PREDECESSOR_MATRIX_RECERT_RUN ||
    input.predecessorMatrixRecertJob !== PREDECESSOR_MATRIX_RECERT_JOB ||
    input.predecessorMatrixRecertSuccess !== true
  ) {
    return blocked('R3Q_MATRIX_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (
    input.matrixVersion !== MATRIX_VERSION ||
    input.maturity !== REQUIRED_MATURITY ||
    input.productionGate !== REQUIRED_PRODUCTION_GATE
  ) {
    return blocked('CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (
    input.r3qContractId !== r3q.CONTRACT_ID ||
    input.r3gContractId !== r3g.CONTRACT_ID ||
    input.r3kContractId !== r3k.CONTRACT_ID
  ) {
    return blocked('R3Q_R3G_R3K_CONTRACT_CONTINUITY_REQUIRED');
  }
  if (!exactArray(input.adapterMethods, r3q.ADAPTER_METHODS)) {
    return blocked('EXACT_R3Q_ADAPTER_INTERFACE_REQUIRED');
  }
  if (!exactArray(input.missingCapabilities, REQUIRED_MISSING_CAPABILITIES)) {
    return blocked('EXACT_BINDING_GAP_SET_REQUIRED');
  }
  if (!exactArray(input.requiredR3gExecutorExports, REQUIRED_R3G_EXECUTOR_EXPORTS)) {
    return blocked('R3G_EXECUTOR_SURFACE_REQUIRED');
  }
  if (!exactArray(input.requiredR3kExecutorExports, REQUIRED_R3K_EXECUTOR_EXPORTS)) {
    return blocked('R3K_EXECUTOR_SURFACE_REQUIRED');
  }

  const required = [
    'bindingDescriptorComplete',
    'allR3qMethodsClassified',
    'r3gAdapterBuildersReusedByReference',
    'r3kLifecycleReusedByReference',
    'r3gHardBlockVerifiedBeforeCredentials',
    'r3gHardBlockVerifiedBeforeDependencies',
    'r3kHardBlockVerifiedBeforeCredentials',
    'r3kHardBlockVerifiedBeforeDependencies',
    'bindingGapFailsClosed',
    'counterReadGapExplicit',
    'instrumentationResidueGapExplicit',
    'statementPayloadsDeferred',
    'noExecutableSqlPrepared',
    'noCredentialValuesPrepared',
    'noRemoteDependenciesLoaded',
    'noRemoteClientInstantiated',
    'noRemoteExecutionPathActivated',
    'noCausalPromotionWithoutRemoteObservation'
  ];
  for (const flag of required) {
    if (input[flag] !== true) {
      return blocked('R3R_BINDING_CONTROL_REQUIRED', { flag });
    }
  }

  const prohibited = [
    'authorizationPhraseDefined',
    'triggerPrepared',
    'stagingEnvironmentJobPrepared',
    'workflowSecretsReferenced',
    'remoteCredentialLoadingPrepared',
    'remoteDependencyLoadingPrepared',
    'instrumentationSqlPrepared',
    'counterReadSqlPrepared',
    'residueInspectionSqlPrepared',
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
    if (input[flag] !== false) {
      return blocked('R3R_REMOTE_SCOPE_PROHIBITED', { flag });
    }
  }

  const completeness = inspectBindingCompleteness();
  if (completeness.fullyBound !== false ||
      !exactArray(completeness.missingCapabilities, REQUIRED_MISSING_CAPABILITIES)) {
    return blocked('R3R_EXPECTED_BINDING_GAPS_NOT_PRESERVED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_remote_adapter_binding_contract_ready_two_db_observation_primitives_unbound_no_remote_authority',
    reason: null,
    bindingEntries: completeness.entries,
    missingCapabilities: REQUIRED_MISSING_CAPABILITIES,
    fullyBound: false,
    r3qContractId: r3q.CONTRACT_ID,
    r3gContractId: r3g.CONTRACT_ID,
    r3kContractId: r3k.CONTRACT_ID,
    r3gRemoteExecutionBlockCode: r3g.REMOTE_EXECUTION_BLOCK_CODE,
    r3kRemoteExecutionBlockCode: r3k.REMOTE_EXECUTION_BLOCK_CODE,
    repositoryBindingContractAuthority: true,
    remoteAdapterActivationAuthority: false,
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
      'Certify a repository-only constrained database-observation primitive for instrumentation counter reads and instrumentation residue inspection. Do not define staging authorization, trigger, secrets, environment jobs or remote execution in R3R.'
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
  PREDECESSOR_MATRIX_RECERT_RUN,
  PREDECESSOR_MATRIX_RECERT_JOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  REMOTE_EXECUTION_BLOCK_CODE,
  BINDING_MAP,
  REQUIRED_MISSING_CAPABILITIES,
  REQUIRED_R3G_EXECUTOR_EXPORTS,
  REQUIRED_R3K_EXECUTOR_EXPORTS,
  assertRemoteActivationBoundaryAbsent,
  bindingEntries,
  inspectBindingCompleteness,
  evaluateRepositoryReadiness
});
