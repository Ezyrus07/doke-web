#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const r4n = require('../backend/modules/communities/community-realtime-private-auth-r4n');
const config = require('../config/com-b03c-r4n-r4l-failure-phase-attribution-readiness.json');

const result = r4n.evaluateRepositoryReadiness(config.readinessInput);
assert.equal(result.decision, r4n.STATUS);
assert.equal(result.phaseAttributionReady, true);
assert.equal(result.observedLastProvenPhase, 'synthetic_identity_create');
assert.deepEqual(result.observedFirstUnprovenPhases, [
  'synthetic_identity_login',
  'baseline_policy_snapshot',
  'baseline_counter_read'
]);
assert.equal(result.authorizationConsumed, true);
assert.equal(result.authorizationReusable, false);
assert.equal(result.retryAllowed, false);
assert.equal(result.freshAuthorizationRequiredForFutureRemoteAttempt, true);
assert.equal(result.remoteExecutionAuthority, false);
assert.equal(result.stagingReadAuthority, false);
assert.equal(result.stagingMutationAuthority, false);
assert.equal(result.productionAuthority, false);
assert.equal(result.pullRequestMergeAuthority, false);
assert.equal(result.exactRootCauseProven, false);
assert.equal(result.causalPromotionAllowed, false);

assert.equal(
  fs.existsSync('config/com-b03c-r4j-single-use-hosted-terminal-status-observation-trigger.json'),
  false
);

const recorder = r4n.createPhaseRecorder();
recorder.begin('synthetic_identity_login');
const failure = recorder.fail('synthetic_identity_login', new Error('sensitive raw provider text'));
assert.equal(failure.phase, 'synthetic_identity_login');
assert.equal(failure.code, 'DOKE_COM_B03C_R4N_PHASE_FAILURE');
assert.equal(failure.rawRemoteErrorExposed, false);
const snapshot = recorder.snapshot();
assert.equal(snapshot.failedPhase, 'synthetic_identity_login');
assert.equal(snapshot.rawRemoteErrorExposed, false);

let blocked = false;
try {
  r4n.assertRemoteExecutionBoundaryAbsent();
} catch (error) {
  blocked = error?.code === r4n.REMOTE_EXECUTION_BLOCK_CODE;
}
assert.equal(blocked, true);

process.stdout.write(`${JSON.stringify({
  validationId: r4n.VALIDATION_ID,
  decision: result.decision,
  observedLastProvenPhase: result.observedLastProvenPhase,
  observedFirstUnprovenPhases: result.observedFirstUnprovenPhases,
  retryAllowed: result.retryAllowed,
  freshAuthorizationRequiredForFutureRemoteAttempt: result.freshAuthorizationRequiredForFutureRemoteAttempt,
  triggerExists: false,
  remoteExecutionAuthority: false,
  stagingAccess: false,
  exactRootCauseProven: false,
  causalPromotionAllowed: false
})}\n`);
