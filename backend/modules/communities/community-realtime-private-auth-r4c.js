'use strict';

const r3s = require('./community-realtime-private-auth-r3s');
const r3v = require('./community-realtime-private-auth-r3v');

const CONTRACT_ID = 'com-b03c-r4c-pg-int8-counter-codec-compatibility-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R4C-PG-INT8-COUNTER-CODEC-COMPATIBILITY-READINESS';
const STATUS = 'repository_pg_int8_counter_codec_compatibility_certified_no_remote_authority';

const PREDECESSOR_R4B_EVIDENCE_HEAD = '8c79cba46396b092f9b115f88b7a2e2e423062f8';
const PREDECESSOR_R4B_TRIGGER_COMMIT = '1db885835085838be294c2e07ecb676ad0f1540b';
const PREDECESSOR_R4B_RUN = 31487894136;
const PREDECESSOR_R4B_CERTIFY_JOB = 93767389865;
const PREDECESSOR_R4B_AUTHORIZE_JOB = 93767490426;
const PREDECESSOR_R4B_CANARY_JOB = 93767594558;
const PREDECESSOR_R4B_ARTIFACT_ID = 9099871582;
const PREDECESSOR_R4B_ARTIFACT_DIGEST = 'sha256:e66a07e7e8beae71857b2863cecb7deea2788c3f8b18ddef7e9224546b32a07e';
const PREDECESSOR_R4B_FAILURE_CODE = 'DOKE_COM_B03C_R3Y_PHASE_BASELINE_COUNTER_READ_FAILED';
const PREDECESSOR_R4B_FAILURE_PHASE = 'baseline_counter_read';
const PREDECESSOR_R4B_CLEANUP_HEAD = 'bec476c9c55189269026f3ded31570f5e832236e';
const PREDECESSOR_R4B_CLEANUP_RUN = 31488128482;
const PREDECESSOR_R4B_CLEANUP_CERTIFY_JOB = 93768108224;

const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R4C_REMOTE_EXECUTION_BOUNDARY_REQUIRED';
const PG_INT8_OID = 20;
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

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
    repositoryCodecCompatibilityAuthority: false,
    remoteExecutionAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    networkAuthority: false,
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

function normalizePgInt8CounterValue(value, counterId = 'counter') {
  if (Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) {
    const error = new TypeError(`R4C_PG_INT8_COUNTER_VALUE_INVALID_${counterId}`);
    error.code = `R4C_PG_INT8_COUNTER_VALUE_INVALID_${counterId}`;
    throw error;
  }
  const parsed = BigInt(value);
  if (parsed > MAX_SAFE_BIGINT) {
    const error = new RangeError(`R4C_PG_INT8_COUNTER_VALUE_UNSAFE_${counterId}`);
    error.code = `R4C_PG_INT8_COUNTER_VALUE_UNSAFE_${counterId}`;
    throw error;
  }
  return Number(parsed);
}

function normalizePgCounterRow(row = {}) {
  const expected = [...r3s.COUNTER_IDS].sort();
  const actual = Object.keys(row).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const error = new TypeError('R4C_PG_COUNTER_ROW_SHAPE_INVALID');
    error.code = 'R4C_PG_COUNTER_ROW_SHAPE_INVALID';
    throw error;
  }
  return freeze(Object.fromEntries(r3s.COUNTER_IDS.map((counterId) => [
    counterId,
    normalizePgInt8CounterValue(row[counterId], counterId)
  ])));
}

function buildPgInt8CounterCodecClient(client, plan) {
  if (!client || typeof client.query !== 'function') {
    throw new TypeError('R4C_PG_CLIENT_REQUIRED');
  }
  if (!plan || plan.contractId !== r3v.CONTRACT_ID) {
    throw new TypeError('R4C_R3V_EXECUTION_PLAN_REQUIRED');
  }
  const counterSql = plan.sqlMaterialization?.statementGroups?.counterRead?.[0];
  if (typeof counterSql !== 'string' || !counterSql.includes('::bigint as broadcast_rls_evaluations') || !counterSql.includes('::bigint as presence_rls_evaluations')) {
    throw new Error('R4C_R3U_BIGINT_COUNTER_SQL_REQUIRED');
  }

  return Object.freeze({
    kind: 'r4c_pg_int8_counter_codec_client',
    remoteCapable: false,
    counterSql,
    async query(sql, ...args) {
      const result = await client.query(sql, ...args);
      if (String(sql) !== counterSql) return result;
      if (!Array.isArray(result?.rows) || result.rows.length !== 1) {
        const error = new TypeError('R4C_PG_COUNTER_RESULT_SINGLE_ROW_REQUIRED');
        error.code = 'R4C_PG_COUNTER_RESULT_SINGLE_ROW_REQUIRED';
        throw error;
      }
      return {
        ...result,
        rows: [normalizePgCounterRow(result.rows[0])]
      };
    }
  });
}

function inspectDeterministicCodecMismatch() {
  let legacyRejectsPgInt8Text = false;
  try {
    r3s.normalizeCounterSnapshot('baseline_before_probe', {
      broadcast_rls_evaluations: '0',
      presence_rls_evaluations: '0'
    });
  } catch (error) {
    legacyRejectsPgInt8Text = error?.code === undefined &&
      String(error?.message || '').includes('R3S_COUNTER_VALUE_INVALID_broadcast_rls_evaluations');
  }

  const bridged = normalizePgCounterRow({
    broadcast_rls_evaluations: '0',
    presence_rls_evaluations: '0'
  });
  const strictAfterBridge = r3s.normalizeCounterSnapshot('baseline_before_probe', bridged);

  return freeze({
    pgInt8Oid: PG_INT8_OID,
    legacyRejectsPgInt8Text,
    bridgeProducesSafeIntegers:
      strictAfterBridge.broadcast_rls_evaluations === 0 &&
      strictAfterBridge.presence_rls_evaluations === 0,
    r3sStrictContractPreserved: true,
    r3vHistoricalImplementationModified: false,
    r3sHistoricalImplementationModified: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function evaluateRepositoryReadiness(input = {}) {
  const requiredTrue = [
    'r4bSingleUseExecutionAttemptRecorded',
    'r4bAuthorizationConsumedNonReusable',
    'r4bFailurePhaseBaselineCounterRead',
    'r4bIdentityCleanupSucceeded',
    'r4bInstrumentationNotInstalled',
    'r4bCleanupTriggerRemoved',
    'r4bCleanupSecondCanarySkipped',
    'r3uCounterSqlReturnsBigint',
    'r3sStrictSafeIntegerContractPreserved',
    'pgInt8TextCompatibilityBridgePrepared',
    'bridgeOnlyTouchesExactCounterSqlResult',
    'unsafeIntegerRejected',
    'malformedCounterRejected',
    'repositoryPgLikeStringRowTestPrepared',
    'historicalR3vNotModified',
    'historicalR3sNotModified',
    'noRemoteExecutionInR4c'
  ];
  for (const flag of requiredTrue) {
    if (input[flag] !== true) return blocked('R4C_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'remoteCredentialReadExecuted',
    'remoteDependencyLoadExecuted',
    'networkExecuted',
    'databaseConnectionExecuted',
    'databaseQueryAgainstRemoteExecuted',
    'realtimeSubscriptionExecuted',
    'stagingMutationExecuted',
    'runtimePolicyChangeAuthorized',
    'productionPrepared',
    'mergePrepared'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R4C_REMOTE_SCOPE_PROHIBITED', { flag });
  }

  const mismatch = inspectDeterministicCodecMismatch();
  if (!mismatch.legacyRejectsPgInt8Text || !mismatch.bridgeProducesSafeIntegers) {
    return blocked('R4C_DETERMINISTIC_CODEC_MISMATCH_NOT_REPRODUCED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: 'repository_pg_int8_counter_codec_bridge_ready_no_remote_authority',
    predecessorR4bEvidenceHead: PREDECESSOR_R4B_EVIDENCE_HEAD,
    predecessorR4bTriggerCommit: PREDECESSOR_R4B_TRIGGER_COMMIT,
    predecessorR4bRun: PREDECESSOR_R4B_RUN,
    predecessorR4bArtifactId: PREDECESSOR_R4B_ARTIFACT_ID,
    predecessorR4bFailurePhase: PREDECESSOR_R4B_FAILURE_PHASE,
    predecessorR4bCleanupHead: PREDECESSOR_R4B_CLEANUP_HEAD,
    pgInt8Oid: PG_INT8_OID,
    legacyCodecMismatchReproduced: true,
    pgInt8CounterCodecBridgePrepared: true,
    r3sStrictContractPreserved: true,
    r3vHistoricalImplementationModified: false,
    r3sHistoricalImplementationModified: false,
    repositoryCodecCompatibilityAuthority: true,
    remoteExecutionAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    nextBoundaryRequirement:
      'After R4C evidence-head certification, create a separate fresh head-bound single-use authorization lifecycle for an R4C-bridged staging retry. Do not reuse R4B authorization.'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  PREDECESSOR_R4B_EVIDENCE_HEAD,
  PREDECESSOR_R4B_TRIGGER_COMMIT,
  PREDECESSOR_R4B_RUN,
  PREDECESSOR_R4B_CERTIFY_JOB,
  PREDECESSOR_R4B_AUTHORIZE_JOB,
  PREDECESSOR_R4B_CANARY_JOB,
  PREDECESSOR_R4B_ARTIFACT_ID,
  PREDECESSOR_R4B_ARTIFACT_DIGEST,
  PREDECESSOR_R4B_FAILURE_CODE,
  PREDECESSOR_R4B_FAILURE_PHASE,
  PREDECESSOR_R4B_CLEANUP_HEAD,
  PREDECESSOR_R4B_CLEANUP_RUN,
  PREDECESSOR_R4B_CLEANUP_CERTIFY_JOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  REMOTE_EXECUTION_BLOCK_CODE,
  PG_INT8_OID,
  normalizePgInt8CounterValue,
  normalizePgCounterRow,
  buildPgInt8CounterCodecClient,
  inspectDeterministicCodecMismatch,
  assertRemoteExecutionBoundaryAbsent,
  evaluateRepositoryReadiness
});
