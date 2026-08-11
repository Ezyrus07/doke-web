#!/usr/bin/env node
'use strict';

const r3z = require('../backend/modules/communities/community-realtime-private-auth-r3z');
const r3yExecutor = require('./execute-com-b03c-r3y-single-use-hosted-runtime-observation');

function safeFailure(error) {
  const code =
    typeof error?.code === 'string' &&
    /^DOKE_COM_B03C_R3Y_[A-Z0-9_]+$/.test(error.code)
      ? error.code
      : 'DOKE_COM_B03C_R3Y_REMOTE_FAILURE';
  const failurePhase = r3z.isValidFailureAttribution({
    code,
    failurePhase: error?.failurePhase
  })
    ? error.failurePhase
    : null;
  return Object.freeze({
    code,
    failurePhase,
    rawRemoteErrorExposed: false
  });
}

async function loginSyntheticIdentityPhaseAttributed(input) {
  return r3z.withSanitizedPhase(
    'synthetic_identity_sign_in',
    () => r3yExecutor.loginSyntheticIdentity(input)
  );
}

async function executeTwoProbeObservationPhaseAttributed(input = {}) {
  const db = r3z.decoratePreinstallDbAdapter(input.db);
  try {
    return await r3yExecutor.executeTwoProbeObservation({
      ...input,
      db
    });
  } catch (error) {
    return Object.freeze({
      instrumentationInstalled: false,
      cleanupAttempted: false,
      cleanupFailure: null,
      residueCounts: null,
      zeroResidueProven: false,
      baselineRestored: false,
      baselinePolicySnapshotComplete: false,
      result: null,
      executionFailure: safeFailure(error)
    });
  }
}

async function repositorySelfTest() {
  const secretMarker = 'SUPER_SECRET_TOKEN_SHOULD_NEVER_SURVIVE';
  const results = {};

  for (const phase of r3z.PREINSTALL_PHASES) {
    try {
      await r3z.withSanitizedPhase(phase, () => {
        throw new Error(`${secretMarker}:https://private.example/${phase}`);
      });
      throw new Error('R3Z_PHASE_WRAPPER_DID_NOT_FAIL');
    } catch (error) {
      if (
        error.code !== r3z.failureCodeForPhase(phase) ||
        error.failurePhase !== phase ||
        Object.hasOwn(error, 'cause') ||
        String(error.message).includes(secretMarker)
      ) {
        throw error;
      }
      results[phase] = true;
    }
  }

  const successValue = await r3z.withSanitizedPhase(
    'baseline_counter_read',
    () => ({ ok: true })
  );
  if (successValue.ok !== true) throw new Error('R3Z_SUCCESS_VALUE_NOT_PRESERVED');

  const loginCreateClient = () => ({
    auth: {
      async signInWithPassword() {
        throw new Error(`${secretMarker}:login-transport`);
      }
    }
  });
  let loginFailure;
  try {
    await loginSyntheticIdentityPhaseAttributed({
      createClient: loginCreateClient,
      publishableKey: 'repository-only-key',
      identity: {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'repository-only@doke.invalid',
        password: 'repository-only-password'
      }
    });
  } catch (error) {
    loginFailure = safeFailure(error);
  }
  if (
    loginFailure?.code !==
      r3z.PHASE_FAILURE_CODES.synthetic_identity_sign_in ||
    loginFailure?.failurePhase !== 'synthetic_identity_sign_in'
  ) {
    throw new Error('R3Z_LOGIN_PHASE_ATTRIBUTION_INVALID');
  }

  const calls = [];
  const db = r3z.decoratePreinstallDbAdapter({
    async snapshotPolicies() {
      calls.push('snapshot');
      return { complete: true, rows: [] };
    },
    async readCounters(phase) {
      calls.push(`counter:${phase}`);
      return {
        broadcast_rls_evaluations: 0,
        presence_rls_evaluations: 0
      };
    },
    async installInstrumentation() {
      calls.push('install');
    },
    async switchToPresenceOnlyPolicy() {
      calls.push('switch');
    },
    async cleanup() {
      calls.push('cleanup');
    },
    async inspectResidue() {
      calls.push('residue');
      return { policyCount: 0, functionCount: 0, sequenceCount: 0 };
    }
  });
  await db.snapshotPolicies();
  await db.readCounters('baseline_before_probe');
  await db.installInstrumentation();
  await db.snapshotPolicies();
  await db.readCounters('after_cleanup');
  if (
    JSON.stringify(calls) !==
    JSON.stringify([
      'snapshot',
      'counter:baseline_before_probe',
      'install',
      'snapshot',
      'counter:after_cleanup'
    ])
  ) {
    throw new Error('R3Z_DB_DECORATOR_DELEGATION_INVALID');
  }

  let policyFailure;
  const policyDb = r3z.decoratePreinstallDbAdapter({
    async snapshotPolicies() {
      throw new Error(`${secretMarker}:policy-snapshot`);
    },
    async readCounters() { return {}; },
    async installInstrumentation() {},
    async switchToPresenceOnlyPolicy() {},
    async cleanup() {},
    async inspectResidue() { return {}; }
  });
  try {
    await policyDb.snapshotPolicies();
  } catch (error) {
    policyFailure = safeFailure(error);
  }
  if (
    policyFailure?.failurePhase !== 'baseline_policy_snapshot' ||
    policyFailure?.code !== r3z.PHASE_FAILURE_CODES.baseline_policy_snapshot
  ) {
    throw new Error('R3Z_POLICY_PHASE_ATTRIBUTION_INVALID');
  }

  let counterFailure;
  const counterDb = r3z.decoratePreinstallDbAdapter({
    async snapshotPolicies() { return { complete: true, rows: [] }; },
    async readCounters() {
      throw new Error(`${secretMarker}:counter-read`);
    },
    async installInstrumentation() {},
    async switchToPresenceOnlyPolicy() {},
    async cleanup() {},
    async inspectResidue() { return {}; }
  });
  await counterDb.snapshotPolicies();
  try {
    await counterDb.readCounters('baseline_before_probe');
  } catch (error) {
    counterFailure = safeFailure(error);
  }
  if (
    counterFailure?.failurePhase !== 'baseline_counter_read' ||
    counterFailure?.code !== r3z.PHASE_FAILURE_CODES.baseline_counter_read
  ) {
    throw new Error('R3Z_COUNTER_PHASE_ATTRIBUTION_INVALID');
  }

  const generic = safeFailure({
    code: 'DOKE_COM_B03C_R3Y_DATABASE_CONNECTION_FAILED',
    failurePhase: 'baseline_counter_read'
  });
  if (generic.failurePhase !== null) {
    throw new Error('R3Z_INVALID_CODE_PHASE_PAIR_NOT_STRIPPED');
  }

  return Object.freeze({
    validationId: 'COM-B03C-R3Z-REPOSITORY-SELF-TEST',
    contractId: r3z.CONTRACT_ID,
    phases: results,
    loginPhaseAttributionVerified: true,
    baselinePolicyPhaseAttributionVerified: true,
    baselineCounterPhaseAttributionVerified: true,
    postInstallDelegationPreserved: true,
    rawErrorSuppressionVerified: true,
    noErrorCauseRetentionVerified: true,
    remoteCredentialRead: false,
    remoteDependencyLoad: false,
    networkAccess: false,
    databaseConnectionAgainstRemote: false,
    stagingAccess: false,
    triggerCreation: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

if (require.main === module) {
  (async () => {
    if (process.argv.includes('--repository-self-test')) {
      process.stdout.write(`${JSON.stringify(await repositorySelfTest())}\n`);
      return;
    }
    r3z.assertRemoteExecutionBoundaryAbsent();
  })().catch((error) => {
    process.stderr.write(
      `${String(error?.code || 'DOKE_COM_B03C_R3Z_REPOSITORY_FAILURE')}\n`
    );
    process.exitCode = 2;
  });
}

module.exports = {
  safeFailure,
  loginSyntheticIdentityPhaseAttributed,
  executeTwoProbeObservationPhaseAttributed,
  repositorySelfTest
};