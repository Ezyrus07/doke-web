#!/usr/bin/env node
'use strict';

const r3s = require('../backend/modules/communities/community-realtime-private-auth-r3s');
const r3v = require('../backend/modules/communities/community-realtime-private-auth-r3v');
const r4s = require('../backend/modules/communities/community-realtime-private-auth-r4s');
const r4t = require('../backend/modules/communities/community-realtime-private-auth-r4t');
const r3vExecutor = require('./execute-com-b03c-r3v-single-use-remote-execution-envelope');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function buildSuccessorDbExecutionAdapter(client, plan) {
  if (!client || typeof client.query !== 'function') fail('DOKE_COM_B03C_R4T_PG_CLIENT_REQUIRED');
  if (!plan || plan.contractId !== r3v.CONTRACT_ID) fail('DOKE_COM_B03C_R4T_R3V_PLAN_REQUIRED');
  const codecClient = r4s.buildCounterCodecClient(client, plan);
  const db = r3vExecutor.buildRestrictedDbExecutionAdapter(codecClient, plan);
  return freeze({
    kind: 'r4t_r4q_successor_db_execution_adapter',
    remoteCapable: false,
    codecClientKind: codecClient.kind,
    db
  });
}

function policiesEqualStrict(left, right) {
  return JSON.stringify(left || []) === JSON.stringify(right || []);
}

function sanitizeCleanupFailure(error, failedCleanupSubphase = null) {
  const allowed = new Set(r4s.CLEANUP_SUBPHASES);
  return freeze({
    code: /^DOKE_COM_B03C_R4T_[A-Z0-9_]+$/.test(String(error?.code || ''))
      ? String(error.code)
      : 'DOKE_COM_B03C_R4T_CLEANUP_FAILURE',
    failedCleanupSubphase: allowed.has(failedCleanupSubphase) ? failedCleanupSubphase : null,
    rawRemoteErrorExposed: false
  });
}

async function executeCleanupPlan({
  db,
  instrumentationInstalled,
  baselinePolicySnapshot,
  policiesEqual = policiesEqualStrict
} = {}) {
  if (!db || typeof db.inspectResidue !== 'function' || typeof db.snapshotPolicies !== 'function') {
    fail('DOKE_COM_B03C_R4T_DB_ADAPTER_REQUIRED');
  }
  if (typeof policiesEqual !== 'function') fail('DOKE_COM_B03C_R4T_POLICY_COMPARATOR_REQUIRED');

  const cleanupPlan = r4s.buildCleanupPlan({
    instrumentationInstalled: instrumentationInstalled === true,
    baselinePolicySnapshotAvailable: baselinePolicySnapshot?.complete === true
  });
  const records = [];
  let cleanupMutationAttempted = false;
  let cleanupMutationSucceeded = false;
  let residueCounts = null;
  let zeroResidueProven = false;
  let afterCleanupPolicySnapshot = null;
  let baselineRestored = baselinePolicySnapshot?.complete === true ? false : null;

  async function phase(phaseId, operation) {
    records.push({ phase: phaseId, status: 'started' });
    try {
      const value = await operation();
      records.push({ phase: phaseId, status: 'succeeded' });
      return value;
    } catch (error) {
      records.push({ phase: phaseId, status: 'failed' });
      const sanitized = sanitizeCleanupFailure(error, phaseId);
      const wrapped = new Error(sanitized.code);
      wrapped.code = sanitized.code;
      wrapped.cleanupFailure = sanitized;
      throw wrapped;
    }
  }

  if (cleanupPlan.mutateCleanup) {
    await phase('cleanup_mutation_if_instrumentation_installed', async () => {
      cleanupMutationAttempted = true;
      if (typeof db.cleanup !== 'function') fail('DOKE_COM_B03C_R4T_CLEANUP_METHOD_REQUIRED');
      await db.cleanup();
      cleanupMutationSucceeded = true;
    });
  } else {
    records.push({
      phase: 'cleanup_mutation_if_instrumentation_installed',
      status: 'skipped_pre_install_failure'
    });
  }

  if (cleanupPlan.residueInspection) {
    residueCounts = await phase('cleanup_residue_inspection', async () => {
      const counts = await db.inspectResidue();
      zeroResidueProven = r3s.RESIDUE_COUNT_FIELDS.every((field) => counts[field] === 0);
      if (!zeroResidueProven) fail('DOKE_COM_B03C_R4T_ZERO_RESIDUE_REQUIRED');
      return counts;
    });
  }

  if (cleanupPlan.baselinePolicyResnapshot) {
    afterCleanupPolicySnapshot = await phase('cleanup_baseline_policy_resnapshot', () => db.snapshotPolicies());
  }

  if (cleanupPlan.baselineComparison) {
    await phase('cleanup_baseline_comparison', async () => {
      baselineRestored = policiesEqual(
        baselinePolicySnapshot.rows,
        afterCleanupPolicySnapshot?.rows
      ) === true;
      if (!baselineRestored) fail('DOKE_COM_B03C_R4T_BASELINE_RESTORATION_REQUIRED');
    });
  }

  return freeze({
    contractId: r4t.CONTRACT_ID,
    cleanupPlan,
    cleanupMutationAttempted,
    cleanupMutationSucceeded,
    residueCounts,
    zeroResidueProven,
    baselineRestored,
    cleanupRecords: records,
    rawRemoteErrorExposed: false,
    remoteExecutionAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function assertRepositoryOnly() {
  r4t.assertRemoteExecutionBoundaryAbsent();
}

module.exports = freeze({
  buildSuccessorDbExecutionAdapter,
  policiesEqualStrict,
  sanitizeCleanupFailure,
  executeCleanupPlan,
  assertRepositoryOnly
});

if (require.main === module) {
  try {
    assertRepositoryOnly();
  } catch (error) {
    if (error?.code === r4t.REMOTE_EXECUTION_BLOCK_CODE) {
      process.stdout.write(`${error.code}\n`);
      process.exit(2);
    }
    throw error;
  }
  process.exit(1);
}
