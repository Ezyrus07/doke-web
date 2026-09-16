#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r3j = require('../backend/modules/communities/community-realtime-private-auth-r3j');
const r3s = require('../backend/modules/communities/community-realtime-private-auth-r3s');
const r3v = require('../backend/modules/communities/community-realtime-private-auth-r3v');
const r4c = require('../backend/modules/communities/community-realtime-private-auth-r4c');
const r4q = require('../backend/modules/communities/community-realtime-private-auth-r4q');
const r4s = require('../backend/modules/communities/community-realtime-private-auth-r4s');
const r4t = require('../backend/modules/communities/community-realtime-private-auth-r4t');
const successor = require('./build-com-b03c-r4t-r4q-successor-executor');

function makeRuntime({ counterRow, residueRow } = {}) {
  const plan = r3v.buildSingleUseExecutionPlan({ ownershipToken: 'r4t_repository_owner' });
  const groups = plan.sqlMaterialization.statementGroups;
  const baselineRows = [{
    policyname: 'existing_safe_policy',
    permissive: 'PERMISSIVE',
    roles: ['authenticated'],
    cmd: 'SELECT',
    qual: 'true',
    with_check: null
  }];
  const state = {
    counterQueries: 0,
    snapshotQueries: 0,
    residueQueries: 0,
    cleanupStatements: 0,
    transactionBegins: 0,
    passthroughQueries: []
  };
  const defaultCounterRow = counterRow || {
    broadcast_rls_evaluations: '0',
    presence_rls_evaluations: '0'
  };
  const defaultResidueRow = residueRow || {
    policyCount: 0,
    functionCount: 0,
    sequenceCount: 0
  };

  const client = {
    async query(sql) {
      const text = String(sql);
      const lower = text.toLowerCase();
      if (lower === 'begin') { state.transactionBegins += 1; return { rows: [] }; }
      if (lower === 'commit' || lower === 'rollback') return { rows: [] };
      if (text === groups.counterRead[0]) {
        state.counterQueries += 1;
        return { rows: [{ ...defaultCounterRow }] };
      }
      if (text === r3j.SNAPSHOT_SQL) {
        state.snapshotQueries += 1;
        state.passthroughQueries.push(text);
        return { rows: baselineRows.map((row) => ({ ...row, roles: [...row.roles] })) };
      }
      if (text === groups.residueInspection[0]) {
        state.residueQueries += 1;
        return { rows: [{ ...defaultResidueRow }] };
      }
      if (groups.cleanup.includes(text)) {
        state.cleanupStatements += 1;
        return { rows: [] };
      }
      throw new Error('R4T_REPOSITORY_SQL_UNEXPECTED');
    }
  };

  const built = successor.buildSuccessorDbExecutionAdapter(client, plan);
  return { plan, groups, state, client, ...built };
}

async function expectCode(promiseFactory, expected) {
  try {
    await promiseFactory();
  } catch (error) {
    assert.equal(error?.code || error?.message, expected);
    return error;
  }
  throw new Error(`EXPECTED_ERROR_${expected}`);
}

async function main() {
  const runtime = makeRuntime();
  assert.equal(runtime.kind, 'r4t_r4q_successor_db_execution_adapter');
  assert.equal(runtime.remoteCapable, false);
  assert.equal(runtime.codecClientKind, 'r4c_pg_int8_counter_codec_client');

  const baselinePolicies = await runtime.db.snapshotPolicies();
  assert.equal(baselinePolicies.complete, true);
  assert.equal(runtime.state.passthroughQueries[0], r3j.SNAPSHOT_SQL);

  const baselineCounters = await runtime.db.readCounters('baseline_before_probe');
  assert.deepEqual(baselineCounters, {
    broadcast_rls_evaluations: 0,
    presence_rls_evaluations: 0
  });
  const terminalCounters = await runtime.db.readCounters('after_presence_only_join');
  assert.deepEqual(terminalCounters, baselineCounters);
  assert.equal(runtime.state.counterQueries, 2);

  const preInstallCleanup = await successor.executeCleanupPlan({
    db: runtime.db,
    instrumentationInstalled: false,
    baselinePolicySnapshot: baselinePolicies,
    policiesEqual: successor.policiesEqualStrict
  });
  assert.equal(preInstallCleanup.cleanupPlan.mutateCleanup, false);
  assert.equal(preInstallCleanup.cleanupMutationAttempted, false);
  assert.equal(preInstallCleanup.cleanupMutationSucceeded, false);
  assert.equal(runtime.state.cleanupStatements, 0);
  assert.equal(runtime.state.residueQueries, 1);
  assert.equal(runtime.state.snapshotQueries, 2);
  assert.equal(preInstallCleanup.zeroResidueProven, true);
  assert.equal(preInstallCleanup.baselineRestored, true);
  assert.equal(preInstallCleanup.cleanupRecords[0].status, 'skipped_pre_install_failure');

  const installedRuntime = makeRuntime();
  const installedBaseline = await installedRuntime.db.snapshotPolicies();
  const installedCleanup = await successor.executeCleanupPlan({
    db: installedRuntime.db,
    instrumentationInstalled: true,
    baselinePolicySnapshot: installedBaseline,
    policiesEqual: successor.policiesEqualStrict
  });
  assert.equal(installedCleanup.cleanupPlan.mutateCleanup, true);
  assert.equal(installedCleanup.cleanupMutationAttempted, true);
  assert.equal(installedCleanup.cleanupMutationSucceeded, true);
  assert.equal(installedRuntime.state.cleanupStatements, installedRuntime.groups.cleanup.length);
  assert.equal(installedRuntime.state.transactionBegins, 1);
  assert.equal(installedCleanup.zeroResidueProven, true);
  assert.equal(installedCleanup.baselineRestored, true);

  const unsafeRuntime = makeRuntime({ counterRow: {
    broadcast_rls_evaluations: '9007199254740992',
    presence_rls_evaluations: '0'
  } });
  await expectCode(
    () => unsafeRuntime.db.readCounters('baseline_before_probe'),
    'R4C_PG_INT8_COUNTER_VALUE_UNSAFE_broadcast_rls_evaluations'
  );

  const malformedRuntime = makeRuntime({ counterRow: {
    broadcast_rls_evaluations: '0',
    presence_rls_evaluations: '0',
    extra: 'forbidden'
  } });
  await expectCode(
    () => malformedRuntime.db.readCounters('baseline_before_probe'),
    'R4C_PG_COUNTER_ROW_SHAPE_INVALID'
  );

  const rawCleanupError = new Error('provider raw cleanup detail must never escape');
  const cleanupFailure = await expectCode(
    () => successor.executeCleanupPlan({
      db: {
        async inspectResidue() { throw rawCleanupError; },
        async snapshotPolicies() { return baselinePolicies; }
      },
      instrumentationInstalled: false,
      baselinePolicySnapshot: baselinePolicies
    }),
    'DOKE_COM_B03C_R4T_CLEANUP_FAILURE'
  );
  assert.equal(cleanupFailure.cleanupFailure.failedCleanupSubphase, 'cleanup_residue_inspection');
  assert.equal(cleanupFailure.cleanupFailure.rawRemoteErrorExposed, false);
  assert.equal(String(cleanupFailure.message).includes('provider raw'), false);

  const readiness = r4t.evaluateRepositoryReadiness({
    predecessorR4sEvidenceHead: r4t.PREDECESSOR_R4S_EVIDENCE_HEAD,
    predecessorR4sEvidenceBlob: r4t.PREDECESSOR_R4S_EVIDENCE_BLOB,
    predecessorR4sRun: r4t.PREDECESSOR_R4S_RUN,
    predecessorR4sJob: r4t.PREDECESSOR_R4S_JOB,
    predecessorR4sMatrixRun: r4t.PREDECESSOR_R4S_MATRIX_RUN,
    predecessorR4sMatrixJob: r4t.PREDECESSOR_R4S_MATRIX_JOB,
    r4sContractId: r4s.CONTRACT_ID,
    r4cContractId: r4c.CONTRACT_ID,
    r4qContractId: r4q.CONTRACT_ID,
    r3vContractId: r3v.CONTRACT_ID,
    r3sContractId: r3s.CONTRACT_ID,
    matrixVersion: r4t.MATRIX_VERSION,
    maturity: r4t.REQUIRED_MATURITY,
    productionGate: r4t.REQUIRED_PRODUCTION_GATE,
    rawPgClientWrappedByCertifiedR4cCodec: true,
    r4cCodecAppliedBeforeR3vRestrictedAdapter: true,
    r3sStrictSafeIntegerContractPreserved: true,
    baselineCounterPgInt8TextAcceptedAfterBridge: true,
    terminalCounterPgInt8TextAcceptedAfterBridge: true,
    unsafePgInt8Rejected: true,
    malformedCounterRowRejected: true,
    nonCounterSqlPassesThroughUnmodified: true,
    residueInspectionIntegerContractPreserved: true,
    r4sCleanupPlanAppliedBySuccessor: true,
    preInstallFailureSkipsCleanupMutation: true,
    preInstallFailureStillInspectsResidue: true,
    preInstallFailureStillResnapshotsBaselinePolicy: true,
    installedInstrumentationRunsCleanupMutation: true,
    zeroResidueDerivedOnlyFromScopedCounts: true,
    baselineRestorationDerivedOnlyFromSnapshotComparison: true,
    cleanupFailureSanitized: true,
    repositorySelfTestPrepared: true,
    historicalR4qExecutorUnchanged: true,
    historicalR4cR4sR3vUnchanged: true,
    noRemoteExecutionInR4t: true,
    authorizationPhraseDefined: false,
    authorizationReceiptCreated: false,
    triggerPrepared: false,
    workflowSecretsReferenced: false,
    stagingEnvironmentPrepared: false,
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
  assert.equal(readiness.decision, r4t.STATUS);
  assert.deepEqual(readiness.executorComposition, r4t.EXECUTOR_COMPOSITION);
  assert.equal(readiness.remoteExecutionAuthority, false);
  assert.equal(readiness.exactRootCauseProven, false);

  let hardBlocked = false;
  try { successor.assertRepositoryOnly(); } catch (error) {
    hardBlocked = error?.code === r4t.REMOTE_EXECUTION_BLOCK_CODE;
  }
  assert.equal(hardBlocked, true);

  console.log(JSON.stringify({
    validationId: r4t.VALIDATION_ID,
    status: readiness.status,
    executorComposition: readiness.executorComposition,
    cleanupModes: readiness.cleanupModes,
    pgInt8BridgeIntegrated: true,
    preInstallCleanupObservationOnly: true,
    installedCleanupMutationTested: true,
    remoteExecutionAuthority: false,
    exactRootCauseProven: false
  }));
}

main().catch((error) => {
  console.error(error?.code || error?.message || 'R4T_REPOSITORY_SELF_TEST_FAILED');
  process.exit(1);
});
