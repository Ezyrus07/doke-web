'use strict';

const CONTRACT_ID = 'com-b03c-r3z-preinstall-phase-attribution-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R3Z-PREINSTALL-PHASE-ATTRIBUTION-READINESS';
const STATUS = 'repository_preinstall_phase_attribution_certified_no_remote_authority';
const REMOTE_EXECUTION_BLOCK_CODE =
  'DOKE_COM_B03C_R3Z_REMOTE_EXECUTION_AUTHORIZATION_BOUNDARY_REQUIRED';

const PREINSTALL_PHASES = Object.freeze([
  'synthetic_identity_sign_in',
  'baseline_policy_snapshot',
  'baseline_counter_read'
]);

const PHASE_FAILURE_CODES = Object.freeze({
  synthetic_identity_sign_in:
    'DOKE_COM_B03C_R3Y_PHASE_SYNTHETIC_IDENTITY_SIGN_IN_FAILED',
  baseline_policy_snapshot:
    'DOKE_COM_B03C_R3Y_PHASE_BASELINE_POLICY_SNAPSHOT_FAILED',
  baseline_counter_read:
    'DOKE_COM_B03C_R3Y_PHASE_BASELINE_COUNTER_READ_FAILED'
});

const REQUIRED_DB_METHODS = Object.freeze([
  'snapshotPolicies',
  'readCounters',
  'installInstrumentation',
  'switchToPresenceOnlyPolicy',
  'cleanup',
  'inspectResidue'
]);

function fail(code, failurePhase = null) {
  const error = new Error(code);
  error.code = code;
  if (failurePhase !== null) error.failurePhase = failurePhase;
  throw error;
}

function assertPhase(phase) {
  if (!PREINSTALL_PHASES.includes(phase)) {
    fail('DOKE_COM_B03C_R3Z_PREINSTALL_PHASE_INVALID');
  }
  return phase;
}

function failureCodeForPhase(phase) {
  return PHASE_FAILURE_CODES[assertPhase(phase)];
}

function phaseForFailureCode(code) {
  for (const [phase, candidate] of Object.entries(PHASE_FAILURE_CODES)) {
    if (candidate === code) return phase;
  }
  return null;
}

function isValidFailureAttribution(value = {}) {
  return (
    typeof value.code === 'string' &&
    typeof value.failurePhase === 'string' &&
    phaseForFailureCode(value.code) === value.failurePhase
  );
}

async function withSanitizedPhase(phase, operation) {
  const exactPhase = assertPhase(phase);
  if (typeof operation !== 'function') {
    fail('DOKE_COM_B03C_R3Z_PHASE_OPERATION_REQUIRED');
  }
  try {
    return await Promise.resolve(operation());
  } catch {
    fail(failureCodeForPhase(exactPhase), exactPhase);
  }
}

function assertDbAdapter(db) {
  if (!db || typeof db !== 'object') {
    fail('DOKE_COM_B03C_R3Z_DB_ADAPTER_REQUIRED');
  }
  for (const method of REQUIRED_DB_METHODS) {
    if (typeof db[method] !== 'function') {
      fail('DOKE_COM_B03C_R3Z_EXACT_DB_ADAPTER_METHODS_REQUIRED');
    }
  }
  return db;
}

function decoratePreinstallDbAdapter(db) {
  const source = assertDbAdapter(db);
  let baselinePolicySnapshotComplete = false;
  let baselineCounterReadComplete = false;
  let instrumentationBoundaryCrossed = false;

  return Object.freeze({
    async snapshotPolicies(...args) {
      if (!instrumentationBoundaryCrossed && !baselinePolicySnapshotComplete) {
        const value = await withSanitizedPhase(
          'baseline_policy_snapshot',
          () => source.snapshotPolicies(...args)
        );
        baselinePolicySnapshotComplete = true;
        return value;
      }
      return source.snapshotPolicies(...args);
    },

    async readCounters(phase, ...args) {
      if (
        !instrumentationBoundaryCrossed &&
        phase === 'baseline_before_probe' &&
        !baselineCounterReadComplete
      ) {
        if (!baselinePolicySnapshotComplete) {
          fail('DOKE_COM_B03C_R3Z_BASELINE_POLICY_SNAPSHOT_ORDER_REQUIRED');
        }
        const value = await withSanitizedPhase(
          'baseline_counter_read',
          () => source.readCounters(phase, ...args)
        );
        baselineCounterReadComplete = true;
        return value;
      }
      return source.readCounters(phase, ...args);
    },

    async installInstrumentation(...args) {
      if (!baselinePolicySnapshotComplete || !baselineCounterReadComplete) {
        fail('DOKE_COM_B03C_R3Z_PREINSTALL_OBSERVATIONS_REQUIRED');
      }
      instrumentationBoundaryCrossed = true;
      return source.installInstrumentation(...args);
    },

    switchToPresenceOnlyPolicy: (...args) =>
      source.switchToPresenceOnlyPolicy(...args),
    cleanup: (...args) => source.cleanup(...args),
    inspectResidue: (...args) => source.inspectResidue(...args)
  });
}

function assertRemoteExecutionBoundaryAbsent() {
  fail(REMOTE_EXECUTION_BLOCK_CODE);
}

function evaluateRepositoryReadiness(input = {}) {
  const requiredTrue = [
    'r3yFailureSummaryPinned',
    'historicalFailureRemainsUnattributed',
    'exactThreePhaseAllowlist',
    'rawErrorSuppression',
    'noErrorCauseRetention',
    'loginPhaseWrapped',
    'baselinePolicySnapshotWrapped',
    'baselineCounterReadWrapped',
    'postInstallDelegationPreserved',
    'r3yExecutorReusedWithoutForking',
    'r3vDbAdapterSemanticsPreserved',
    'triggerAbsent',
    'previousAuthorizationConsumed',
    'previousAuthorizationNonReusable',
    'repositoryOnlySelfTestPrepared'
  ];
  for (const flag of requiredTrue) {
    if (input[flag] !== true) {
      return Object.freeze({
        decision: 'blocked_repository_only',
        reason: 'R3Z_CONTROL_REQUIRED',
        flag,
        remoteExecutionAuthority: false,
        stagingAuthority: false,
        exactRootCauseProven: false,
        causalPromotionAllowed: false
      });
    }
  }

  const requiredFalse = [
    'freshAuthorizationReceived',
    'freshAuthorizationConsumed',
    'triggerCreated',
    'credentialReadExecuted',
    'dependencyLoadExecuted',
    'networkExecuted',
    'databaseConnectionExecuted',
    'databaseQueryAgainstRemoteExecuted',
    'realtimeSubscriptionExecuted',
    'stagingMutationExecuted',
    'productionExecuted',
    'mergeExecuted'
  ];
  for (const flag of requiredFalse) {
    if (input[flag] !== false) {
      return Object.freeze({
        decision: 'blocked_repository_only',
        reason: 'R3Z_REMOTE_EFFECT_PROHIBITED',
        flag,
        remoteExecutionAuthority: false,
        stagingAuthority: false,
        exactRootCauseProven: false,
        causalPromotionAllowed: false
      });
    }
  }

  return Object.freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: 'repository_preinstall_phase_attribution_ready_no_remote_authority',
    phases: PREINSTALL_PHASES,
    phaseFailureCodes: PHASE_FAILURE_CODES,
    historicalFailurePhaseProven: false,
    remoteExecutionAuthority: false,
    stagingAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    mergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

module.exports = {
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  REMOTE_EXECUTION_BLOCK_CODE,
  PREINSTALL_PHASES,
  PHASE_FAILURE_CODES,
  REQUIRED_DB_METHODS,
  assertPhase,
  failureCodeForPhase,
  phaseForFailureCode,
  isValidFailureAttribution,
  withSanitizedPhase,
  decoratePreinstallDbAdapter,
  assertRemoteExecutionBoundaryAbsent,
  evaluateRepositoryReadiness
};