'use strict';

const r4l = require('./community-realtime-private-auth-r4l');
const r4i = require('./community-realtime-private-auth-r4i');

const CONTRACT_ID = 'com-b03c-r4n-r4l-failure-phase-attribution-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4N-R4L-FAILURE-PHASE-ATTRIBUTION-READINESS';
const STATUS = 'repository_r4l_failure_phase_attribution_ready_no_remote_authority';

const PREDECESSOR_CLEANUP_HEAD = '1fab972b5050167e615a0c57579f488cf3185ffe';
const R4M_TRIGGER_HEAD = '289ea3bd58ea23f85323c63d08e04657fdfbd6e2';
const R4M_RUN = 31553962698;
const R4M_CERTIFY_JOB = 93982391898;
const R4M_AUTHORIZE_JOB = 93982455548;
const R4M_CANARY_JOB = 93982632238;
const R4M_ARTIFACT_ID = 9125307330;
const R4M_ARTIFACT_DIGEST = 'sha256:73897d2e9eaa0a3e207046ece6206e4465676cc532b78817f09d0060910455e9';
const R4M_CLEANUP_RUN = 31554148892;
const R4M_CLEANUP_CERTIFY_JOB = 93982952530;
const R4M_CLEANUP_AUTHORIZE_JOB = 93982999194;
const R4M_CLEANUP_CANARY_JOB = 93982999306;

const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4N_REMOTE_EXECUTION_NOT_AUTHORIZED';

const PHASES = Object.freeze([
  'project_preflight',
  'api_key_discovery',
  'database_connect',
  'synthetic_identity_create',
  'synthetic_identity_login',
  'baseline_policy_snapshot',
  'baseline_counter_read',
  'instrumentation_install',
  'presence_policy_switch',
  'realtime_subscribe',
  'terminal_observation_build',
  'database_cleanup',
  'synthetic_identity_cleanup'
]);

const OBSERVED_LAST_PROVEN_PHASE = 'synthetic_identity_create';
const OBSERVED_FIRST_UNPROVEN_PHASES = Object.freeze([
  'synthetic_identity_login',
  'baseline_policy_snapshot',
  'baseline_counter_read'
]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'blocked_repository_only',
    reason,
    phaseAttributionReady: false,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    networkAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
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

function sanitizePhaseFailure(phase, error) {
  if (!PHASES.includes(phase)) throw new TypeError('R4N_PHASE_REQUIRED');
  const raw = String(error?.code || error?.message || 'DOKE_COM_B03C_R4N_PHASE_FAILURE');
  const code = /^DOKE_COM_B03C_(?:R3Y|R4G|R4J|R4L|R4N)_[A-Z0-9_]+$/.test(raw)
    ? raw
    : 'DOKE_COM_B03C_R4N_PHASE_FAILURE';
  return freeze({
    phase,
    code,
    rawRemoteErrorExposed: false
  });
}

function createPhaseRecorder() {
  const records = [];
  let activePhase = null;

  return {
    begin(phase) {
      if (!PHASES.includes(phase)) throw new TypeError('R4N_PHASE_REQUIRED');
      if (activePhase !== null) throw new Error('R4N_PHASE_ALREADY_ACTIVE');
      activePhase = phase;
      records.push({ phase, state: 'started' });
    },
    succeed(phase) {
      if (activePhase !== phase) throw new Error('R4N_PHASE_CONTINUITY_REQUIRED');
      records.push({ phase, state: 'succeeded' });
      activePhase = null;
    },
    fail(phase, error) {
      if (activePhase !== phase) throw new Error('R4N_PHASE_CONTINUITY_REQUIRED');
      const failure = sanitizePhaseFailure(phase, error);
      records.push({ phase, state: 'failed', failure });
      activePhase = null;
      return failure;
    },
    snapshot() {
      return freeze({
        records: records.map((record) => ({ ...record })),
        activePhase,
        lastSucceededPhase: [...records].reverse().find((record) => record.state === 'succeeded')?.phase || null,
        failedPhase: [...records].reverse().find((record) => record.state === 'failed')?.phase || null,
        rawRemoteErrorExposed: false
      });
    }
  };
}

async function runAttributedPhase(recorder, phase, operation) {
  if (!recorder || typeof recorder.begin !== 'function' || typeof operation !== 'function') {
    throw new TypeError('R4N_ATTRIBUTED_PHASE_INPUT_REQUIRED');
  }
  recorder.begin(phase);
  try {
    const value = await operation();
    recorder.succeed(phase);
    return value;
  } catch (error) {
    const failure = recorder.fail(phase, error);
    const attributed = new Error(failure.code);
    attributed.code = failure.code;
    attributed.phase = phase;
    attributed.rawRemoteErrorExposed = false;
    throw attributed;
  }
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorCleanupHead !== PREDECESSOR_CLEANUP_HEAD ||
      input.r4mTriggerHead !== R4M_TRIGGER_HEAD ||
      input.r4mRun !== R4M_RUN ||
      input.r4mCertifyJob !== R4M_CERTIFY_JOB ||
      input.r4mAuthorizeJob !== R4M_AUTHORIZE_JOB ||
      input.r4mCanaryJob !== R4M_CANARY_JOB) {
    return blocked('R4N_CERTIFIED_R4M_ATTEMPT_REQUIRED');
  }

  if (input.r4mArtifactId !== R4M_ARTIFACT_ID ||
      input.r4mArtifactDigest !== R4M_ARTIFACT_DIGEST ||
      input.r4mCleanupRun !== R4M_CLEANUP_RUN ||
      input.r4mCleanupCertifyJob !== R4M_CLEANUP_CERTIFY_JOB ||
      input.r4mCleanupAuthorizeJob !== R4M_CLEANUP_AUTHORIZE_JOB ||
      input.r4mCleanupCanaryJob !== R4M_CLEANUP_CANARY_JOB) {
    return blocked('R4N_R4M_ARTIFACT_AND_CLEANUP_EVIDENCE_REQUIRED');
  }

  if (input.r4lContractId !== r4l.CONTRACT_ID ||
      input.authorizationReceiptId !== r4l.AUTHORIZATION_RECEIPT_ID ||
      input.authorizationReceiptId !== r4i.AUTHORIZATION_RECEIPT_ID) {
    return blocked('R4N_R4L_AUTHORIZATION_LINEAGE_REQUIRED');
  }

  if (input.matrixVersion !== MATRIX_VERSION ||
      input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('R4N_CANONICAL_MATRIX_STATE_REQUIRED');
  }

  const evidence = input.observedR4mEvidence || {};
  if (evidence.projectHealthy !== true ||
      evidence.identityCreated !== true ||
      evidence.identityCleanupSucceeded !== true ||
      evidence.instrumentationInstalled !== false ||
      evidence.cleanupAttempted !== false ||
      evidence.baselinePolicySnapshotComplete !== false ||
      evidence.terminalStatus !== null ||
      evidence.observation !== null ||
      evidence.zeroResidueProven !== false ||
      evidence.executionFailureCode !== 'DOKE_COM_B03C_R4L_REMOTE_FAILURE' ||
      evidence.rawRemoteErrorExposed !== false) {
    return blocked('R4N_R4M_SANITIZED_EVIDENCE_SHAPE_REQUIRED');
  }

  if (input.observedLastProvenPhase !== OBSERVED_LAST_PROVEN_PHASE ||
      JSON.stringify(input.observedFirstUnprovenPhases) !== JSON.stringify(OBSERVED_FIRST_UNPROVEN_PHASES)) {
    return blocked('R4N_CAUSAL_WINDOW_REQUIRED');
  }

  const required = [
    'authorizationConsumed',
    'authorizationReusableFalse',
    'retryForbidden',
    'triggerAbsentAfterCleanup',
    'repositoryTreeReturnedToPreTriggerState',
    'historicalR4lUnchanged',
    'phaseMarkersSanitized',
    'rawRemoteErrorPersistenceForbidden',
    'separateFreshAuthorizationLifecycleRequiredForAnyFutureRemoteAttempt'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R4N_REPOSITORY_PHASE_ATTRIBUTION_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'triggerCreated',
    'remoteCredentialReadExecuted',
    'remoteDependencyLoadExecuted',
    'networkExecuted',
    'stagingReadExecuted',
    'stagingMutationExecuted',
    'realtimeSubscriptionExecuted',
    'authIdentityMutationExecuted',
    'runtimeChangeExecuted',
    'productionExecuted',
    'mergeExecuted'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R4N_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: STATUS,
    status: STATUS,
    phaseAttributionReady: true,
    predecessorCleanupHead: PREDECESSOR_CLEANUP_HEAD,
    r4mTriggerHead: R4M_TRIGGER_HEAD,
    r4mRun: R4M_RUN,
    r4mArtifactId: R4M_ARTIFACT_ID,
    r4mArtifactDigest: R4M_ARTIFACT_DIGEST,
    observedLastProvenPhase: OBSERVED_LAST_PROVEN_PHASE,
    observedFirstUnprovenPhases: OBSERVED_FIRST_UNPROVEN_PHASES,
    authorizationConsumed: true,
    authorizationReusable: false,
    retryAllowed: false,
    freshAuthorizationRequiredForFutureRemoteAttempt: true,
    triggerCreationAuthority: false,
    remoteExecutionAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    networkAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  PREDECESSOR_CLEANUP_HEAD,
  R4M_TRIGGER_HEAD,
  R4M_RUN,
  R4M_CERTIFY_JOB,
  R4M_AUTHORIZE_JOB,
  R4M_CANARY_JOB,
  R4M_ARTIFACT_ID,
  R4M_ARTIFACT_DIGEST,
  R4M_CLEANUP_RUN,
  R4M_CLEANUP_CERTIFY_JOB,
  R4M_CLEANUP_AUTHORIZE_JOB,
  R4M_CLEANUP_CANARY_JOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  REMOTE_EXECUTION_BLOCK_CODE,
  PHASES,
  OBSERVED_LAST_PROVEN_PHASE,
  OBSERVED_FIRST_UNPROVEN_PHASES,
  sanitizePhaseFailure,
  createPhaseRecorder,
  runAttributedPhase,
  evaluateRepositoryReadiness,
  assertRemoteExecutionBoundaryAbsent
});
