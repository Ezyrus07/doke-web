'use strict';

const r3r = require('./community-realtime-private-auth-r3r');
const r3q = require('./community-realtime-private-auth-r3q');

const CONTRACT_ID = 'com-b03c-r3s-constrained-observation-primitives-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R3S-CONSTRAINED-OBSERVATION-PRIMITIVES-READINESS';
const PREDECESSOR_VALIDATION_ID = r3r.VALIDATION_ID;
const PREDECESSOR_STATUS =
  'repository_remote_adapter_binding_contract_certified_two_db_observation_primitives_unbound_no_remote_authority';
const PREDECESSOR_HEAD = '68ad5828918692a63bfb98032db39ef700be71d3';
const PREDECESSOR_RECERT_RUN = 31404268281;
const PREDECESSOR_RECERT_JOB = 93506626950;
const PREDECESSOR_MATRIX_RECERT_RUN = 31404269125;
const PREDECESSOR_MATRIX_RECERT_JOB = 93506629487;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';

const REMOTE_EXECUTION_BLOCK_CODE =
  'DOKE_COM_B03C_R3S_REMOTE_OBSERVATION_EXECUTION_BOUNDARY_REQUIRED';

const REQUIRED_CAPABILITIES = Object.freeze([
  'instrumentation_counter_read',
  'instrumentation_residue_inspection'
]);

const COUNTER_PHASES = Object.freeze([
  'baseline_before_probe',
  'after_presence_read_effective_gate',
  'after_presence_only_join',
  'after_cleanup'
]);

const COUNTER_IDS = Object.freeze([
  'broadcast_rls_evaluations',
  'presence_rls_evaluations'
]);

const RESIDUE_COUNT_FIELDS = Object.freeze([
  'policyCount',
  'functionCount',
  'sequenceCount'
]);

const FORBIDDEN_EXECUTOR_METHODS = Object.freeze([
  'query',
  'connect',
  'createClient',
  'loadCredentials',
  'loadRemoteDependencies',
  'executeSql',
  'mutate',
  'deploy',
  'push',
  'merge'
]);

const COUNTER_READ_DESCRIPTOR = Object.freeze({
  id: 'com-b03c-r3s-instrumentation-counter-read-v1',
  capability: 'instrumentation_counter_read',
  access: 'read_only_observation',
  resultShape: 'counter_snapshot_v1',
  ownershipScope: 'single_use_instrumentation_ownership_token',
  permittedPhases: COUNTER_PHASES,
  requiredCounters: COUNTER_IDS,
  executableSqlPrepared: false,
  sql: null,
  statementText: null
});

const RESIDUE_INSPECTION_DESCRIPTOR = Object.freeze({
  id: 'com-b03c-r3s-instrumentation-residue-inspection-v1',
  capability: 'instrumentation_residue_inspection',
  access: 'read_only_catalog_observation',
  resultShape: 'scoped_residue_counts_v1',
  ownershipScope: 'single_use_instrumentation_ownership_token',
  countFields: RESIDUE_COUNT_FIELDS,
  objectKinds: Object.freeze(['policy', 'function', 'sequence']),
  executableSqlPrepared: false,
  sql: null,
  statementText: null
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

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'blocked_repository_only',
    reason,
    repositoryObservationPrimitiveAuthority: false,
    remoteAdapterBindingAuthority: false,
    remoteExecutionAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    ...extra
  });
}

function assertRemoteObservationBoundaryAbsent() {
  const error = new Error(REMOTE_EXECUTION_BLOCK_CODE);
  error.code = REMOTE_EXECUTION_BLOCK_CODE;
  throw error;
}

function assertOwnershipToken(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9_-]{7,63}$/.test(value)) {
    throw new TypeError('R3S_INSTRUMENTATION_OWNERSHIP_TOKEN_REQUIRED');
  }
  return value;
}

function assertRepositoryObservationExecutor(executor) {
  if (!executor || typeof executor !== 'object') {
    throw new TypeError('R3S_REPOSITORY_OBSERVATION_EXECUTOR_REQUIRED');
  }
  if (executor.kind !== 'synthetic_repository' || executor.remoteCapable !== false) {
    throw new Error('R3S_REMOTE_CAPABLE_EXECUTOR_PROHIBITED');
  }
  if (typeof executor.executeObservation !== 'function') {
    throw new TypeError('R3S_EXECUTE_OBSERVATION_REQUIRED');
  }
  for (const method of FORBIDDEN_EXECUTOR_METHODS) {
    if (typeof executor[method] === 'function') {
      throw new Error(`R3S_FORBIDDEN_EXECUTOR_METHOD_${method}`);
    }
  }
  return executor;
}

function normalizeCounterSnapshot(phase, value) {
  if (!COUNTER_PHASES.includes(phase)) throw new Error('R3S_COUNTER_PHASE_PROHIBITED');
  if (!exactKeys(value, COUNTER_IDS)) throw new TypeError('R3S_COUNTER_SNAPSHOT_SHAPE_INVALID');
  const normalized = {};
  for (const counterId of COUNTER_IDS) {
    const counterValue = value[counterId];
    if (!Number.isSafeInteger(counterValue) || counterValue < 0) {
      throw new TypeError(`R3S_COUNTER_VALUE_INVALID_${counterId}`);
    }
    normalized[counterId] = counterValue;
  }
  return freeze(normalized);
}

function normalizeResidueCounts(value) {
  if (!exactKeys(value, RESIDUE_COUNT_FIELDS)) {
    throw new TypeError('R3S_RESIDUE_COUNT_SHAPE_INVALID');
  }
  const normalized = {};
  for (const field of RESIDUE_COUNT_FIELDS) {
    const count = value[field];
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new TypeError(`R3S_RESIDUE_COUNT_INVALID_${field}`);
    }
    normalized[field] = count;
  }
  return freeze(normalized);
}

function buildRepositoryObservationPrimitives(executorInput) {
  const executor = assertRepositoryObservationExecutor(executorInput);
  return freeze({
    kind: 'synthetic_repository',
    remoteCapable: false,
    async readCounters(phase, context = {}) {
      const ownershipToken = assertOwnershipToken(context.ownershipToken);
      const payload = await executor.executeObservation(COUNTER_READ_DESCRIPTOR, {
        phase,
        ownershipToken
      });
      return normalizeCounterSnapshot(phase, payload);
    },
    async inspectInstrumentationResidue(context = {}) {
      const ownershipToken = assertOwnershipToken(context.ownershipToken);
      const payload = await executor.executeObservation(RESIDUE_INSPECTION_DESCRIPTOR, {
        ownershipToken
      });
      return normalizeResidueCounts(payload);
    },
    async assertZeroResidue(context = {}) {
      const counts = await this.inspectInstrumentationResidue(context);
      return RESIDUE_COUNT_FIELDS.every((field) => counts[field] === 0);
    }
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) {
    return blocked('R3R_VALIDATION_REQUIRED');
  }
  if (input.predecessorStatus !== PREDECESSOR_STATUS) {
    return blocked('R3R_CERTIFIED_STATUS_REQUIRED');
  }
  if (input.predecessorHead !== PREDECESSOR_HEAD) {
    return blocked('R3R_EVIDENCE_HEAD_REQUIRED');
  }
  if (
    input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN ||
    input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB ||
    input.predecessorRecertSuccess !== true
  ) {
    return blocked('R3R_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (
    input.predecessorMatrixRecertRun !== PREDECESSOR_MATRIX_RECERT_RUN ||
    input.predecessorMatrixRecertJob !== PREDECESSOR_MATRIX_RECERT_JOB ||
    input.predecessorMatrixRecertSuccess !== true
  ) {
    return blocked('R3R_MATRIX_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (
    input.matrixVersion !== MATRIX_VERSION ||
    input.maturity !== REQUIRED_MATURITY ||
    input.productionGate !== REQUIRED_PRODUCTION_GATE
  ) {
    return blocked('CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (input.r3rContractId !== r3r.CONTRACT_ID || input.r3qContractId !== r3q.CONTRACT_ID) {
    return blocked('R3R_R3Q_CONTRACT_CONTINUITY_REQUIRED');
  }
  if (!exactArray(input.requiredCapabilities, REQUIRED_CAPABILITIES)) {
    return blocked('EXACT_R3R_GAP_SET_REQUIRED');
  }
  if (!exactArray(input.counterPhases, COUNTER_PHASES) ||
      !exactArray(input.counterIds, COUNTER_IDS) ||
      !exactArray(input.residueCountFields, RESIDUE_COUNT_FIELDS) ||
      !exactArray(input.forbiddenExecutorMethods, FORBIDDEN_EXECUTOR_METHODS)) {
    return blocked('R3S_PRIMITIVE_CONTRACT_CONTINUITY_REQUIRED');
  }

  const required = [
    'descriptorOnlyObservationContract',
    'counterReadDescriptorPinned',
    'residueInspectionDescriptorPinned',
    'syntheticExecutorOnly',
    'remoteCapableExecutorRejected',
    'genericDatabaseMethodsRejected',
    'singleUseOwnershipScopeRequired',
    'exactCounterPhasesPinned',
    'exactCounterIdsPinned',
    'exactCounterShapeRequired',
    'safeNonnegativeCounterValuesRequired',
    'residueCountsOnly',
    'exactResidueShapeRequired',
    'safeNonnegativeResidueCountsRequired',
    'zeroResidueDerivedOnlyFromScopedCounts',
    'noExecutableSqlPrepared',
    'noCredentialValuesPrepared',
    'noRemoteDependenciesLoaded',
    'noRemoteClientInstantiated',
    'noRemoteExecutionPathActivated',
    'noCausalPromotionWithoutRemoteObservation'
  ];
  for (const flag of required) {
    if (input[flag] !== true) {
      return blocked('R3S_OBSERVATION_PRIMITIVE_CONTROL_REQUIRED', { flag });
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
      return blocked('R3S_REMOTE_SCOPE_PROHIBITED', { flag });
    }
  }

  if (r3q.INSTRUMENTATION_SPEC.executableSqlPrepared !== false ||
      COUNTER_READ_DESCRIPTOR.executableSqlPrepared !== false ||
      RESIDUE_INSPECTION_DESCRIPTOR.executableSqlPrepared !== false ||
      COUNTER_READ_DESCRIPTOR.sql !== null ||
      RESIDUE_INSPECTION_DESCRIPTOR.sql !== null) {
    return blocked('R3S_DESCRIPTOR_MUST_REMAIN_NON_EXECUTABLE');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_constrained_observation_primitives_ready_no_remote_authority',
    reason: null,
    requiredCapabilities: REQUIRED_CAPABILITIES,
    counterReadDescriptor: COUNTER_READ_DESCRIPTOR,
    residueInspectionDescriptor: RESIDUE_INSPECTION_DESCRIPTOR,
    repositoryObservationPrimitiveAuthority: true,
    remoteAdapterBindingAuthority: false,
    remoteExecutionAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    nextBoundaryRequirement:
      'Compose the R3Q adapter repository-only using the certified R3S observation primitives and existing R3G/R3K bindings. Do not activate remote execution or define staging authorization in R3S.'
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
  REQUIRED_CAPABILITIES,
  COUNTER_PHASES,
  COUNTER_IDS,
  RESIDUE_COUNT_FIELDS,
  FORBIDDEN_EXECUTOR_METHODS,
  COUNTER_READ_DESCRIPTOR,
  RESIDUE_INSPECTION_DESCRIPTOR,
  assertRemoteObservationBoundaryAbsent,
  assertOwnershipToken,
  assertRepositoryObservationExecutor,
  normalizeCounterSnapshot,
  normalizeResidueCounts,
  buildRepositoryObservationPrimitives,
  evaluateRepositoryReadiness
});
