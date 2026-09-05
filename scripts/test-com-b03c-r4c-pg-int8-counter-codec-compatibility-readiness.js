#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const r4c = require('../backend/modules/communities/community-realtime-private-auth-r4c');
const r3s = require('../backend/modules/communities/community-realtime-private-auth-r3s');
const r3v = require('../backend/modules/communities/community-realtime-private-auth-r3v');
const r3vExecutor = require('./execute-com-b03c-r3v-single-use-remote-execution-envelope');
const config = require('../config/com-b03c-r4c-pg-int8-counter-codec-compatibility-readiness.json');
const summary = require('../docs/validation/COM-B03C-R4B-SINGLE-USE-PHASE-ATTRIBUTED-RETRY-STAGING-SUMMARY.json');

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function assert(value, code) { if (!value) fail(code); }
function throwsCode(fn, code) {
  let actual = null;
  try { fn(); } catch (error) { actual = error?.code || error?.message; }
  assert(actual === code, `R4C_EXPECTED_${code}_GOT_${actual}`);
}

async function run() {
  assert(config.contractId === r4c.CONTRACT_ID, 'R4C_CONFIG_CONTRACT_MISMATCH');
  assert(summary.status === 'staging_phase_attributed_retry_failed_at_baseline_counter_read_terminal_consumed', 'R4C_R4B_SUMMARY_STATUS_REQUIRED');
  assert(summary.authorization.evidenceHead === r4c.PREDECESSOR_R4B_EVIDENCE_HEAD, 'R4C_R4B_EVIDENCE_HEAD_MISMATCH');
  assert(summary.authorization.triggerCommit === r4c.PREDECESSOR_R4B_TRIGGER_COMMIT, 'R4C_R4B_TRIGGER_COMMIT_MISMATCH');
  assert(summary.workflow.run === r4c.PREDECESSOR_R4B_RUN, 'R4C_R4B_RUN_MISMATCH');
  assert(summary.artifact.id === r4c.PREDECESSOR_R4B_ARTIFACT_ID, 'R4C_R4B_ARTIFACT_MISMATCH');
  assert(summary.artifact.digest === r4c.PREDECESSOR_R4B_ARTIFACT_DIGEST, 'R4C_R4B_ARTIFACT_DIGEST_MISMATCH');
  assert(summary.observation.executionFailure.code === r4c.PREDECESSOR_R4B_FAILURE_CODE, 'R4C_R4B_FAILURE_CODE_MISMATCH');
  assert(summary.observation.executionFailure.failurePhase === r4c.PREDECESSOR_R4B_FAILURE_PHASE, 'R4C_R4B_FAILURE_PHASE_MISMATCH');
  assert(summary.observation.identityCleanupSucceeded === true, 'R4C_R4B_IDENTITY_CLEANUP_REQUIRED');
  assert(summary.observation.instrumentationInstalled === false, 'R4C_R4B_INSTRUMENTATION_MUST_BE_FALSE');
  assert(summary.cleanup.triggerRemoved === true && summary.cleanup.secondStagingExecutionOccurred === false, 'R4C_R4B_SINGLE_USE_CLEANUP_REQUIRED');

  const mismatch = r4c.inspectDeterministicCodecMismatch();
  assert(mismatch.legacyRejectsPgInt8Text === true, 'R4C_LEGACY_PG_INT8_TEXT_MISMATCH_REQUIRED');
  assert(mismatch.bridgeProducesSafeIntegers === true, 'R4C_BRIDGE_SAFE_INTEGER_REQUIRED');
  assert(mismatch.r3sStrictContractPreserved === true, 'R4C_R3S_STRICT_CONTRACT_REQUIRED');

  assert(r4c.normalizePgInt8CounterValue('0', 'x') === 0, 'R4C_ZERO_STRING_DECODE_INVALID');
  assert(r4c.normalizePgInt8CounterValue('42', 'x') === 42, 'R4C_POSITIVE_STRING_DECODE_INVALID');
  assert(r4c.normalizePgInt8CounterValue(7, 'x') === 7, 'R4C_NUMBER_PASSTHROUGH_INVALID');
  throwsCode(() => r4c.normalizePgInt8CounterValue('-1', 'x'), 'R4C_PG_INT8_COUNTER_VALUE_INVALID_x');
  throwsCode(() => r4c.normalizePgInt8CounterValue('1.5', 'x'), 'R4C_PG_INT8_COUNTER_VALUE_INVALID_x');
  throwsCode(() => r4c.normalizePgInt8CounterValue('9007199254740992', 'x'), 'R4C_PG_INT8_COUNTER_VALUE_UNSAFE_x');

  const plan = r3v.buildSingleUseExecutionPlan({ ownershipToken: 'r4c_repository_owner' });
  assert(plan.statementCount === 21, 'R4C_R3V_PLAN_STATEMENT_COUNT_REQUIRED');
  const counterSql = plan.sqlMaterialization.statementGroups.counterRead[0];
  assert(counterSql.includes('::bigint as broadcast_rls_evaluations'), 'R4C_BROADCAST_BIGINT_CAST_REQUIRED');
  assert(counterSql.includes('::bigint as presence_rls_evaluations'), 'R4C_PRESENCE_BIGINT_CAST_REQUIRED');

  const calls = [];
  const pgLikeClient = {
    async query(sql) {
      calls.push(String(sql));
      if (String(sql) === counterSql) {
        return {
          rows: [{
            broadcast_rls_evaluations: '0',
            presence_rls_evaluations: '0'
          }]
        };
      }
      return { rows: [] };
    }
  };
  const bridgedClient = r4c.buildPgInt8CounterCodecClient(pgLikeClient, plan);
  const db = r3vExecutor.buildRestrictedDbExecutionAdapter(bridgedClient, plan);
  const snapshot = await db.readCounters('baseline_before_probe');
  assert(snapshot.broadcast_rls_evaluations === 0, 'R4C_BRIDGED_BROADCAST_COUNTER_INVALID');
  assert(snapshot.presence_rls_evaluations === 0, 'R4C_BRIDGED_PRESENCE_COUNTER_INVALID');
  assert(calls.length === 1 && calls[0] === counterSql, 'R4C_EXACT_COUNTER_SQL_DELEGATION_REQUIRED');

  let legacyRejected = false;
  try {
    r3s.normalizeCounterSnapshot('baseline_before_probe', {
      broadcast_rls_evaluations: '0',
      presence_rls_evaluations: '0'
    });
  } catch (error) {
    legacyRejected = String(error?.message || '').includes('R3S_COUNTER_VALUE_INVALID_broadcast_rls_evaluations');
  }
  assert(legacyRejected, 'R4C_LEGACY_STRICT_NORMALIZER_REJECTION_REQUIRED');

  const repoRoot = path.resolve(__dirname, '..');
  assert(!fs.existsSync(path.resolve(repoRoot, 'config/com-b03c-r4b-single-use-phase-attributed-retry-execution-trigger.json')), 'R4C_R4B_TRIGGER_MUST_BE_ABSENT');

  const readiness = r4c.evaluateRepositoryReadiness({ ...config.controls, ...config.prohibitedEffects });
  assert(readiness.decision === 'repository_pg_int8_counter_codec_bridge_ready_no_remote_authority', 'R4C_READINESS_INVALID');
  assert(readiness.remoteExecutionAuthority === false, 'R4C_REMOTE_AUTHORITY_MUST_BE_FALSE');

  let hardBlock = false;
  try { r4c.assertRemoteExecutionBoundaryAbsent(); }
  catch (error) { hardBlock = error?.code === r4c.REMOTE_EXECUTION_BLOCK_CODE; }
  assert(hardBlock, 'R4C_REMOTE_HARD_BLOCK_REQUIRED');

  process.stdout.write(`${JSON.stringify({
    validationId: r4c.VALIDATION_ID,
    contractId: r4c.CONTRACT_ID,
    decision: readiness.decision,
    r4bFailurePhase: r4c.PREDECESSOR_R4B_FAILURE_PHASE,
    pgInt8Oid: r4c.PG_INT8_OID,
    legacyPgInt8TextMismatchReproduced: true,
    bridgeSafeIntegerConversionVerified: true,
    exactCounterSqlDelegationVerified: true,
    r3sStrictContractPreserved: true,
    historicalR3vModified: false,
    historicalR3sModified: false,
    remoteExecutionAuthority: false,
    stagingAccess: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  })}\n`);
}

run().catch((error) => {
  process.stderr.write(`${String(error?.code || error?.message || 'R4C_TEST_FAILURE')}\n`);
  process.exitCode = 1;
});
