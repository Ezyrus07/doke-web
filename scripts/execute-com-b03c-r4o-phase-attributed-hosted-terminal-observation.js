#!/usr/bin/env node
'use strict';

const r4o = require('../backend/modules/communities/community-realtime-private-auth-r4o');
const r4n = require('../backend/modules/communities/community-realtime-private-auth-r4n');

async function repositorySelfTest() {
  const recorder = r4n.createPhaseRecorder();
  await r4n.runAttributedPhase(recorder, 'synthetic_identity_login', async () => 'repository-token-placeholder');
  await r4n.runAttributedPhase(recorder, 'baseline_policy_snapshot', async () => ({ policies: 'repository-placeholder' }));

  let attributedFailure = null;
  try {
    await r4n.runAttributedPhase(recorder, 'baseline_counter_read', async () => {
      throw new Error('raw remote counter error must not persist');
    });
  } catch (error) {
    attributedFailure = error;
  }

  if (!attributedFailure || attributedFailure.phase !== 'baseline_counter_read' ||
      attributedFailure.rawRemoteErrorExposed !== false) {
    throw new Error('R4O_REPOSITORY_SELF_TEST_PHASE_ATTRIBUTION_INVALID');
  }

  const snapshot = recorder.snapshot();
  if (snapshot.lastSucceededPhase !== 'baseline_policy_snapshot' ||
      snapshot.failedPhase !== 'baseline_counter_read' ||
      snapshot.rawRemoteErrorExposed !== false) {
    throw new Error('R4O_REPOSITORY_SELF_TEST_PHASE_SNAPSHOT_INVALID');
  }

  return Object.freeze({
    schema: r4o.REPORT_SCHEMA,
    validationId: 'COM-B03C-R4O-PHASE-ATTRIBUTED-EXECUTION-REPOSITORY-SELF-TEST',
    contractId: r4o.CONTRACT_ID,
    status: 'repository_self_test_only',
    phases: [...r4o.PHASES],
    phaseRecords: snapshot.records,
    lastSucceededPhase: snapshot.lastSucceededPhase,
    failedPhase: snapshot.failedPhase,
    authorizationReceiptId: null,
    authorizationConsumed: false,
    triggerCreated: false,
    executionAttempted: false,
    credentialReads: 0,
    dependencyLoads: 0,
    networkAccess: false,
    stagingAccess: false,
    databaseQueryAgainstRemote: false,
    realtimeSubscriptionAttempted: false,
    authIdentityMutation: false,
    cleanupRequired: true,
    zeroResidueProven: false,
    rawRemoteErrorExposed: false,
    productionChanged: false,
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
    r4o.assertRemoteExecutionBoundaryAbsent();
  })().catch((error) => {
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R4O_FAILURE')}\n`);
    process.exitCode = 2;
  });
}

module.exports = { repositorySelfTest };
