#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r3s = require('../backend/modules/communities/community-realtime-private-auth-r3s');
const r3v = require('../backend/modules/communities/community-realtime-private-auth-r3v');
const r4c = require('../backend/modules/communities/community-realtime-private-auth-r4c');
const r4q = require('../backend/modules/communities/community-realtime-private-auth-r4q');
const r4s = require('../backend/modules/communities/community-realtime-private-auth-r4s');
const r3vExecutor = require('./execute-com-b03c-r3v-single-use-remote-execution-envelope');

function expectCode(fn, expected) {
  try { fn(); } catch (error) {
    assert.equal(error?.code || error?.message, expected);
    return;
  }
  throw new Error(`EXPECTED_ERROR_${expected}`);
}

async function main() {
  const plan = r3v.buildSingleUseExecutionPlan({ ownershipToken: 'r4s_repository_owner' });
  const counterSql = plan.sqlMaterialization.statementGroups.counterRead[0];
  let queryCount = 0;
  const pgLikeClient = {
    async query(sql) {
      queryCount += 1;
      if (String(sql) === counterSql) {
        return { rows: [{
          broadcast_rls_evaluations: '0',
          presence_rls_evaluations: '0'
        }] };
      }
      return { rows: [] };
    }
  };

  const codecClient = r4s.buildCounterCodecClient(pgLikeClient, plan);
  const db = r3vExecutor.buildRestrictedDbExecutionAdapter(codecClient, plan);
  const counters = await db.readCounters('baseline_before_probe');
  assert.deepEqual(counters, {
    broadcast_rls_evaluations: 0,
    presence_rls_evaluations: 0
  });
  assert.equal(queryCount, 1);

  expectCode(() => r4s.normalizeBaselineCounterResult({ rows: [] }), 'R4S_COUNTER_RESULT_SINGLE_ROW_REQUIRED');
  expectCode(() => r4s.normalizeBaselineCounterResult({ rows: [{
    broadcast_rls_evaluations: '9007199254740992',
    presence_rls_evaluations: '0'
  }] }), 'R4C_PG_INT8_COUNTER_VALUE_UNSAFE_broadcast_rls_evaluations');
  expectCode(() => r4s.normalizeBaselineCounterResult({ rows: [{
    broadcast_rls_evaluations: '0',
    presence_rls_evaluations: '0',
    extra: 'forbidden'
  }] }), 'R4C_PG_COUNTER_ROW_SHAPE_INVALID');

  const preInstallCleanup = r4s.buildCleanupPlan({
    instrumentationInstalled: false,
    baselinePolicySnapshotAvailable: true
  });
  assert.equal(preInstallCleanup.mutateCleanup, false);
  assert.equal(preInstallCleanup.residueInspection, true);
  assert.equal(preInstallCleanup.baselinePolicyResnapshot, true);
  assert.equal(preInstallCleanup.baselineComparison, true);

  const installedCleanup = r4s.buildCleanupPlan({
    instrumentationInstalled: true,
    baselinePolicySnapshotAvailable: true
  });
  assert.equal(installedCleanup.mutateCleanup, true);

  const mismatch = r4s.inspectDeterministicR4rFailureCompatibility();
  assert.equal(mismatch.r4cLegacyRejectsPgInt8Text, true);
  assert.equal(mismatch.r4cBridgeProducesSafeIntegers, true);
  assert.equal(mismatch.r3sStrictContractPreserved, true);
  assert.equal(mismatch.cleanupMutationSkippedWhenInstrumentationAbsent, true);

  const readiness = r4s.evaluateRepositoryReadiness({
    predecessorR4rEvidenceHead: r4s.PREDECESSOR_R4R_EVIDENCE_HEAD,
    r4rRun: r4s.R4R_RUN,
    r4rCanaryJob: r4s.R4R_CANARY_JOB,
    r4rArtifactId: r4s.R4R_ARTIFACT_ID,
    r4rArtifactDigest: r4s.R4R_ARTIFACT_DIGEST,
    r4rLastSucceededPhase: r4s.R4R_LAST_SUCCEEDED_PHASE,
    r4rFailedPhase: r4s.R4R_FAILED_PHASE,
    r4rCleanupHead: r4s.R4R_CLEANUP_HEAD,
    r4cContractId: r4c.CONTRACT_ID,
    r4qContractId: r4q.CONTRACT_ID,
    r3vContractId: r3v.CONTRACT_ID,
    r3sContractId: r3s.CONTRACT_ID,
    matrixVersion: r4s.MATRIX_VERSION,
    maturity: r4s.REQUIRED_MATURITY,
    productionGate: r4s.REQUIRED_PRODUCTION_GATE,
    counterQueryDispatchSubphasePrepared: true,
    counterSingleRowShapeSubphasePrepared: true,
    counterPgInt8CodecSubphasePrepared: true,
    counterStrictNormalizationSubphasePrepared: true,
    historicalR4cCodecReusedByReference: true,
    r3sStrictSafeIntegerContractPreserved: true,
    legacyPgInt8TextMismatchReproduced: true,
    pgInt8TextBridgePassesStrictNormalization: true,
    unsafePgInt8Rejected: true,
    malformedCounterRowRejected: true,
    cleanupMutationConditionalOnInstrumentationInstalled: true,
    preInstallFailureSkipsDestructiveCleanup: true,
    residueInspectionStillRequiredAfterPreInstallFailure: true,
    baselinePolicyResnapshotStillRequiredWhenSnapshotAvailable: true,
    zeroResidueDerivedOnlyFromScopedCounts: true,
    baselineRestorationDerivedOnlyFromSnapshotComparison: true,
    repositorySelfTestPrepared: true,
    historicalR4cR4qR4rUnchanged: true,
    noRemoteExecutionInR4s: true,
    authorizationPhraseDefined: false,
    triggerPrepared: false,
    workflowSecretsReferenced: false,
    remoteCredentialReadExecuted: false,
    remoteDependencyLoadExecuted: false,
    networkExecuted: false,
    databaseConnectionExecuted: false,
    databaseQueryAgainstRemoteExecuted: false,
    realtimeSubscriptionExecuted: false,
    authIdentityMutationExecuted: false,
    stagingMutationExecuted: false,
    runtimePolicyChangeAuthorized: false,
    productionPrepared: false,
    mergePrepared: false
  });
  assert.equal(readiness.decision, r4s.STATUS);
  assert.equal(readiness.remoteExecutionAuthority, false);
  assert.equal(readiness.exactRootCauseProven, false);

  let blocked = false;
  try { r4s.assertRemoteExecutionBoundaryAbsent(); } catch (error) {
    blocked = error?.code === r4s.REMOTE_EXECUTION_BLOCK_CODE;
  }
  assert.equal(blocked, true);

  console.log(JSON.stringify({
    validationId: r4s.VALIDATION_ID,
    status: readiness.status,
    counterReadSubphases: readiness.counterReadSubphases,
    cleanupSubphases: readiness.cleanupSubphases,
    historicalR4cCodecReused: readiness.historicalR4cCodecReused,
    remoteExecutionAuthority: false,
    exactRootCauseProven: false
  }));
}

main().catch((error) => {
  console.error(error?.code || error?.message || 'R4S_REPOSITORY_SELF_TEST_FAILED');
  process.exit(1);
});
