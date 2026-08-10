'use strict';

const r3u = require('./community-realtime-private-auth-r3u');
const r3t = require('./community-realtime-private-auth-r3t');
const r3s = require('./community-realtime-private-auth-r3s');
const r3q = require('./community-realtime-private-auth-r3q');
const r3g = require('./community-realtime-private-auth-r3g');
const r3k = require('./community-realtime-private-auth-r3k');

const CONTRACT_ID = 'com-b03c-r3v-single-use-remote-execution-envelope-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R3V-SINGLE-USE-REMOTE-EXECUTION-ENVELOPE-READINESS';
const PREDECESSOR_VALIDATION_ID = r3u.VALIDATION_ID;
const PREDECESSOR_STATUS = 'repository_instrumentation_sql_materialization_certified_no_remote_authority';
const PREDECESSOR_HEAD = '08363a9023c9cd9c5ffc2d31b429309aef10018e';
const PREDECESSOR_RECERT_RUN = 31423888012;
const PREDECESSOR_RECERT_JOB = 93570904450;
const PREDECESSOR_MATRIX_RECERT_RUN = 31423888050;
const PREDECESSOR_MATRIX_RECERT_JOB = 93570904770;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';

const REMOTE_EXECUTION_BLOCK_CODE =
  'DOKE_COM_B03C_R3V_NEW_SINGLE_USE_REMOTE_AUTHORIZATION_BOUNDARY_REQUIRED';
const FUTURE_TRIGGER_PATH =
  'config/com-b03c-r3v-single-use-remote-execution-staging-trigger.json';

const EXECUTION_PHASES = Object.freeze([
  'authorization_boundary_before_credentials',
  'run_attempt_gate',
  'pull_request_checkpoint_preflight',
  'ownership_scope_materialization',
  'credential_read_after_authorization_only',
  'dependency_load_after_authorization_only',
  'supabase_project_identity_preflight',
  'database_connection',
  'api_key_discovery',
  'synthetic_identity_create',
  'synthetic_identity_login',
  'baseline_policy_snapshot',
  'baseline_counter_read',
  'install_core',
  'install_anchor_policies',
  'presence_read_effective_gate',
  'after_anchor_counter_read',
  'switch_presence_only_policy',
  'presence_only_join',
  'after_presence_only_counter_read',
  'cleanup',
  'after_cleanup_counter_snapshot',
  'residue_inspection',
  'synthetic_identity_cleanup_finally',
  'sanitized_report_verification',
  'classify'
]);

const METHOD_BINDINGS = Object.freeze({
  preflight: Object.freeze({ providers: Object.freeze(['r3k.pull_request_checkpoint_preflight', 'r3g.management.inspectProject']) }),
  snapshotPolicies: Object.freeze({ providers: Object.freeze(['r3g.db.snapshot']) }),
  installInstrumentation: Object.freeze({ providers: Object.freeze(['r3v.restrictedDb', 'r3u.installCore', 'r3u.installAnchorPolicies']) }),
  runPresenceReadEffectiveGate: Object.freeze({ providers: Object.freeze(['r3v.presenceAwareRealtimeBridge', 'r3g.subscribeChannel']) }),
  readCounters: Object.freeze({ providers: Object.freeze(['r3v.constrainedObservationExecutor', 'r3u.counterRead', 'r3s.normalizeCounterSnapshot']) }),
  switchToPresenceOnlyPolicy: Object.freeze({ providers: Object.freeze(['r3v.restrictedDb', 'r3u.switchToPresenceOnlyPolicy']) }),
  runPresenceOnlyJoin: Object.freeze({ providers: Object.freeze(['r3v.presenceAwareRealtimeBridge', 'r3g.subscribeChannel']) }),
  cleanup: Object.freeze({ providers: Object.freeze(['r3v.restrictedDb', 'r3u.cleanup']) }),
  assertZeroResidue: Object.freeze({ providers: Object.freeze(['r3v.constrainedObservationExecutor', 'r3u.residueInspection', 'r3s.normalizeResidueCounts']) })
});

const REQUIRED_BRIDGE_CONTROLS = Object.freeze([
  'presence_state_observation_signal',
  'after_cleanup_counter_terminal_snapshot_carry_forward'
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
    repositoryRemoteEnvelopeAuthority: false,
    remoteExecutionAuthority: false,
    remoteAdapterActivationAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    networkAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    ...extra
  });
}

function assertRemoteExecutionBoundaryAbsent() {
  const error = new Error(REMOTE_EXECUTION_BLOCK_CODE);
  error.code = REMOTE_EXECUTION_BLOCK_CODE;
  throw error;
}

function inspectBindingCompleteness() {
  const methods = r3q.ADAPTER_METHODS.map((method) => freeze({
    method,
    providers: METHOD_BINDINGS[method]?.providers || Object.freeze([]),
    bound: Boolean(METHOD_BINDINGS[method])
  }));
  return freeze({
    methods,
    methodCount: methods.length,
    boundMethodCount: methods.filter((entry) => entry.bound).length,
    unboundMethodCount: methods.filter((entry) => !entry.bound).length,
    fullyBound: methods.length === r3q.ADAPTER_METHODS.length && methods.every((entry) => entry.bound),
    bridgeControls: REQUIRED_BRIDGE_CONTROLS,
    remoteExecutionAuthority: false
  });
}

function buildSingleUseExecutionPlan({ ownershipToken } = {}) {
  const materialization = r3u.buildSqlMaterialization(ownershipToken);
  const inspection = r3u.inspectSqlMaterialization(materialization);
  if (inspection.valid !== true) throw new Error('R3V_CERTIFIED_R3U_SQL_MATERIALIZATION_REQUIRED');
  const composition = r3t.inspectCompleteComposition();
  if (composition.fullyBound !== true || composition.boundMethodCount !== r3q.ADAPTER_METHODS.length) {
    throw new Error('R3V_CERTIFIED_R3T_NINE_OF_NINE_COMPOSITION_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    target: freeze({
      environment: 'staging',
      projectId: r3k.REQUIRED_PROJECT_ID,
      projectName: r3k.REQUIRED_PROJECT_NAME,
      branch: r3k.REQUIRED_BRANCH,
      pullRequest: r3k.REQUIRED_PULL_REQUEST
    }),
    singleUse: true,
    reusableAfterFailure: false,
    predecessorAuthorizationReusable: false,
    runAttemptMustBeOneWhenAuthorized: true,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    authorizationPhraseDefined: false,
    executionPhases: EXECUTION_PHASES,
    methodBindings: METHOD_BINDINGS,
    bridgeControls: REQUIRED_BRIDGE_CONTROLS,
    ownershipDigest: materialization.ownershipDigest,
    sqlMaterialization: materialization,
    statementFingerprint: materialization.statementFingerprint,
    statementCount: materialization.statementCount,
    rawOwnershipTokenPersisted: false,
    afterCleanupCounterSnapshotSource:
      'immutable_terminal_snapshot_captured_after_presence_only_before_destructive_cleanup',
    cleanupCounterInvariant:
      'r3u_cleanup_contains_no_probe_execution_and_must_not_advance_rls_evaluation_counters',
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    remoteExecutionAuthority: false
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3U_VALIDATION_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3U_CERTIFIED_STATUS_REQUIRED');
  if (input.predecessorHead !== PREDECESSOR_HEAD) return blocked('R3U_EVIDENCE_HEAD_REQUIRED');
  if (input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN ||
      input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB ||
      input.predecessorRecertSuccess !== true) {
    return blocked('R3U_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (input.predecessorMatrixRecertRun !== PREDECESSOR_MATRIX_RECERT_RUN ||
      input.predecessorMatrixRecertJob !== PREDECESSOR_MATRIX_RECERT_JOB ||
      input.predecessorMatrixRecertSuccess !== true) {
    return blocked('R3U_MATRIX_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION || input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (input.r3uContractId !== r3u.CONTRACT_ID || input.r3tContractId !== r3t.CONTRACT_ID ||
      input.r3sContractId !== r3s.CONTRACT_ID || input.r3qContractId !== r3q.CONTRACT_ID ||
      input.r3gContractId !== r3g.CONTRACT_ID || input.r3kContractId !== r3k.CONTRACT_ID) {
    return blocked('R3U_R3T_R3S_R3Q_R3G_R3K_CONTINUITY_REQUIRED');
  }
  if (!exactArray(input.executionPhases, EXECUTION_PHASES) ||
      !exactArray(input.adapterMethods, r3q.ADAPTER_METHODS) ||
      !exactArray(input.bridgeControls, REQUIRED_BRIDGE_CONTROLS) ||
      !exactArray(input.credentialNames, r3k.CREDENTIAL_NAMES) ||
      !exactArray(input.remoteDependencies, r3k.REMOTE_DEPENDENCIES)) {
    return blocked('R3V_EXECUTION_ENVELOPE_CONTINUITY_REQUIRED');
  }
  if (input.futureTriggerPath !== FUTURE_TRIGGER_PATH) return blocked('R3V_FUTURE_TRIGGER_PATH_REQUIRED');

  const required = [
    'r3uSqlBundleReusedByReference',
    'r3tNineMethodCompositionPreserved',
    'r3qEnvelopeReusedWithoutForking',
    'r3sObservationDescriptorsReused',
    'r3gJoinPrimitiveReusedByReference',
    'r3kSingleUseLifecycleReused',
    'exactExecutionPhasePlanPrepared',
    'exactNineMethodBindingPrepared',
    'restrictedDbAdapterPrepared',
    'genericQueryNotExposed',
    'exactR3uStatementGroupsOnly',
    'presenceStateObservationBridgePrepared',
    'r3gSubscribedMappedToJoinSubscribed',
    'freshRealtimeClientPerProbeRequired',
    'afterCleanupTerminalCounterCarryForwardPrepared',
    'cleanupCounterAdvanceStructurallyProhibited',
    'residueInspectionAfterCleanupPrepared',
    'ownershipDigestOnlyPersisted',
    'rawOwnershipTokenPersistenceProhibited',
    'runAttemptOneFutureRequirementPreserved',
    'singleUseNonReusableFutureRequirementPreserved',
    'repositorySelfTestPrepared',
    'endToEndR3qEnvelopeSimulationPrepared',
    'pinnedPathClassificationCovered',
    'failureCleanupCovered',
    'hardBlockBeforeCredentialReadPrepared',
    'hardBlockBeforeDependencyLoadPrepared',
    'hardBlockBeforeNetworkPrepared',
    'noCausalPromotionWithoutRemoteObservation'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R3V_ENVELOPE_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'authorizationPhraseDefined',
    'triggerPrepared',
    'stagingEnvironmentJobPrepared',
    'workflowSecretsReferenced',
    'credentialValuesPrepared',
    'remoteDependenciesLoaded',
    'networkAccessActivated',
    'databaseConnectionActivated',
    'sqlExecutionActivated',
    'realtimeClientActivated',
    'stagingReadActivated',
    'stagingMutationActivated',
    'authIdentityMutationActivated',
    'runtimePolicyChangeAuthorized',
    'runtimeDeployPrepared',
    'productionPrepared',
    'mergePrepared'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R3V_REMOTE_SCOPE_PROHIBITED', { flag });
  }

  const completeness = inspectBindingCompleteness();
  if (completeness.fullyBound !== true || completeness.unboundMethodCount !== 0 ||
      completeness.boundMethodCount !== r3q.ADAPTER_METHODS.length) {
    return blocked('R3V_COMPLETE_BINDING_REQUIRED');
  }

  const samplePlan = buildSingleUseExecutionPlan({ ownershipToken: 'r3v_contract_sample' });
  if (samplePlan.authorizationPhraseDefined !== false || samplePlan.remoteExecutionAuthority !== false ||
      samplePlan.statementCount !== 21 || samplePlan.rawOwnershipTokenPersisted !== false) {
    return blocked('R3V_SAMPLE_PLAN_INVARIANT_FAILED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_single_use_remote_execution_envelope_ready_no_remote_authority',
    reason: null,
    executionPhases: EXECUTION_PHASES,
    adapterMethods: r3q.ADAPTER_METHODS,
    methodBindings: METHOD_BINDINGS,
    bridgeControls: REQUIRED_BRIDGE_CONTROLS,
    futureTriggerPath: FUTURE_TRIGGER_PATH,
    credentialNames: r3k.CREDENTIAL_NAMES,
    remoteDependencies: r3k.REMOTE_DEPENDENCIES,
    repositoryRemoteEnvelopeAuthority: true,
    remoteExecutionAuthority: false,
    remoteAdapterActivationAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    networkAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    nextBoundaryRequirement:
      'Certify a separate single-use staging authorization lifecycle for this exact R3V envelope. A future trigger must be single-use, run_attempt=1, head-pinned and newly explicitly authorized; no predecessor authorization may be reused.'
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
  FUTURE_TRIGGER_PATH,
  EXECUTION_PHASES,
  METHOD_BINDINGS,
  REQUIRED_BRIDGE_CONTROLS,
  assertRemoteExecutionBoundaryAbsent,
  inspectBindingCompleteness,
  buildSingleUseExecutionPlan,
  evaluateRepositoryReadiness
});
