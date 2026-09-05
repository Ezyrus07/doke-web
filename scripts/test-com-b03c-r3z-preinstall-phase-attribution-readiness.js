#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const r3z = require('../backend/modules/communities/community-realtime-private-auth-r3z');
const executor = require('./execute-com-b03c-r3z-preinstall-phase-attribution');
const config = require('../config/com-b03c-r3z-preinstall-phase-attribution-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R3Z-PREINSTALL-PHASE-ATTRIBUTION-READINESS.json');
const historical = require('../docs/validation/COM-B03C-R3Y-HOSTED-RUNTIME-OBSERVATION-STAGING-SUMMARY.json');

async function main() {
  assert.equal(config.contractId, r3z.CONTRACT_ID);
  assert.equal(evidence.contractId, r3z.CONTRACT_ID);
  assert.deepEqual(config.phaseAttribution.phases, r3z.PREINSTALL_PHASES);
  assert.deepEqual(config.phaseAttribution.failureCodes, r3z.PHASE_FAILURE_CODES);

  assert.equal(
    historical.status,
    'single_use_hosted_runtime_attempt_failed_before_observation_phase_attribution_required'
  );
  assert.deepEqual(historical.rootCauseNarrowing.failureWindow, [
    'synthetic identity sign-in transport/runtime before a typed R3Y login failure can be emitted',
    'initial realtime.messages policy snapshot',
    'initial instrumentation counter read'
  ]);
  assert.equal(historical.rootCauseNarrowing.exactFailurePhaseProven, false);
  assert.equal(historical.rootCauseNarrowing.exactRootCauseProven, false);
  assert.equal(historical.authorization.consumed, true);
  assert.equal(historical.authorization.reusable, false);
  assert.equal(historical.trigger.removed, true);

  const selfTest = await executor.repositorySelfTest();
  assert.equal(selfTest.contractId, r3z.CONTRACT_ID);
  assert.equal(selfTest.loginPhaseAttributionVerified, true);
  assert.equal(selfTest.baselinePolicyPhaseAttributionVerified, true);
  assert.equal(selfTest.baselineCounterPhaseAttributionVerified, true);
  assert.equal(selfTest.postInstallDelegationPreserved, true);
  assert.equal(selfTest.rawErrorSuppressionVerified, true);
  assert.equal(selfTest.noErrorCauseRetentionVerified, true);
  assert.equal(selfTest.stagingAccess, false);

  const readiness = r3z.evaluateRepositoryReadiness({
    r3yFailureSummaryPinned: true,
    historicalFailureRemainsUnattributed: true,
    exactThreePhaseAllowlist: true,
    rawErrorSuppression: true,
    noErrorCauseRetention: true,
    loginPhaseWrapped: true,
    baselinePolicySnapshotWrapped: true,
    baselineCounterReadWrapped: true,
    postInstallDelegationPreserved: true,
    r3yExecutorReusedWithoutForking: true,
    r3vDbAdapterSemanticsPreserved: true,
    triggerAbsent: true,
    previousAuthorizationConsumed: true,
    previousAuthorizationNonReusable: true,
    repositoryOnlySelfTestPrepared: true,
    freshAuthorizationReceived: false,
    freshAuthorizationConsumed: false,
    triggerCreated: false,
    credentialReadExecuted: false,
    dependencyLoadExecuted: false,
    networkExecuted: false,
    databaseConnectionExecuted: false,
    databaseQueryAgainstRemoteExecuted: false,
    realtimeSubscriptionExecuted: false,
    stagingMutationExecuted: false,
    productionExecuted: false,
    mergeExecuted: false
  });
  assert.equal(
    readiness.decision,
    'repository_preinstall_phase_attribution_ready_no_remote_authority'
  );
  assert.equal(readiness.historicalFailurePhaseProven, false);
  assert.equal(readiness.remoteExecutionAuthority, false);

  const coreSource = fs.readFileSync(
    'backend/modules/communities/community-realtime-private-auth-r3z.js',
    'utf8'
  );
  for (const forbidden of [
    'process.env',
    "require('pg')",
    'require("pg")',
    '@supabase/supabase-js',
    'fetch(',
    'createClient('
  ]) {
    assert.equal(coreSource.includes(forbidden), false, forbidden);
  }
  assert.equal(
    fs.existsSync(
      'config/com-b03c-r3y-single-use-hosted-runtime-observation-trigger.json'
    ),
    false
  );

  process.stdout.write(`${JSON.stringify({
    validationId: r3z.VALIDATION_ID,
    contractId: r3z.CONTRACT_ID,
    decision: readiness.decision,
    phaseCount: r3z.PREINSTALL_PHASES.length,
    historicalFailurePhaseProven: false,
    historicalAuthorizationReusable: false,
    triggerExists: false,
    stagingAccess: false,
    remoteExecution: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${String(error?.stack || error)}\n`);
  process.exitCode = 1;
});