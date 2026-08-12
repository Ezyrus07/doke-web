#!/usr/bin/env node
'use strict';

const r4n = require('../backend/modules/communities/community-realtime-private-auth-r4n');

async function repositorySelfTest() {
  const successful = r4n.createPhaseRecorder();
  const loginValue = await r4n.runAttributedPhase(
    successful,
    'synthetic_identity_login',
    async () => 'repository-access-token-placeholder'
  );
  if (loginValue !== 'repository-access-token-placeholder') {
    throw new Error('R4N_REPOSITORY_SELF_TEST_LOGIN_VALUE_INVALID');
  }

  const failed = r4n.createPhaseRecorder();
  let attributedFailure = null;
  try {
    await r4n.runAttributedPhase(
      failed,
      'baseline_policy_snapshot',
      async () => { throw new Error('raw database error must not persist'); }
    );
  } catch (error) {
    attributedFailure = error;
  }

  if (!attributedFailure ||
      attributedFailure.code !== 'DOKE_COM_B03C_R4N_PHASE_FAILURE' ||
      attributedFailure.phase !== 'baseline_policy_snapshot' ||
      attributedFailure.rawRemoteErrorExposed !== false) {
    throw new Error('R4N_REPOSITORY_SELF_TEST_PHASE_ATTRIBUTION_INVALID');
  }

  const successSnapshot = successful.snapshot();
  const failureSnapshot = failed.snapshot();
  if (successSnapshot.lastSucceededPhase !== 'synthetic_identity_login' ||
      failureSnapshot.failedPhase !== 'baseline_policy_snapshot') {
    throw new Error('R4N_REPOSITORY_SELF_TEST_PHASE_SNAPSHOT_INVALID');
  }

  return Object.freeze({
    validationId: 'COM-B03C-R4N-PHASE-ATTRIBUTION-REPOSITORY-SELF-TEST',
    contractId: r4n.CONTRACT_ID,
    phaseAttributionVerified: true,
    sanitizedFailureVerified: true,
    rawRemoteErrorExposed: false,
    triggerCreated: false,
    credentialReads: 0,
    dependencyLoads: 0,
    networkAccess: false,
    stagingAccess: false,
    databaseQueryAgainstRemote: false,
    authIdentityMutation: false,
    remoteExecutionAuthority: false,
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
    r4n.assertRemoteExecutionBoundaryAbsent();
  })().catch((error) => {
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R4N_FAILURE')}\n`);
    process.exitCode = 2;
  });
}

module.exports = { repositorySelfTest };
