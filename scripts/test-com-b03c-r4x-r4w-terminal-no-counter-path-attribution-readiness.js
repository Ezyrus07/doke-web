#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const r4x = require('../backend/modules/communities/community-realtime-private-auth-r4x');
const config = require('../config/com-b03c-r4x-r4w-terminal-no-counter-path-attribution-readiness.json');

const result = r4x.evaluateRepositoryReadiness(config.readinessInput);
assert.equal(result.decision, r4x.STATUS);
assert.equal(result.terminalNoCounterPathAttributionReady, true);
assert.equal(result.terminalStatus, 'CLOSED');
assert.equal(result.joinSubscribed, false);
assert.equal(result.broadcastDelta, 0);
assert.equal(result.presenceDelta, 0);
assert.equal(result.observationClassification, 'presence_only_counter_path_diverged');
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
  fs.existsSync('config/com-b03c-r4t-single-use-successor-executor-trigger.json'),
  false
);

let blocked = false;
try {
  r4x.assertRemoteExecutionBoundaryAbsent();
} catch (error) {
  blocked = error?.code === r4x.REMOTE_EXECUTION_BLOCK_CODE;
}
assert.equal(blocked, true);

const invalidCounterEvidence = structuredClone(config.readinessInput);
invalidCounterEvidence.observedR4wEvidence.presenceDelta = 1;
const invalid = r4x.evaluateRepositoryReadiness(invalidCounterEvidence);
assert.equal(invalid.decision, 'blocked_repository_only');

process.stdout.write(`${JSON.stringify({
  validationId: r4x.VALIDATION_ID,
  decision: result.decision,
  terminalStatus: result.terminalStatus,
  joinSubscribed: result.joinSubscribed,
  broadcastDelta: result.broadcastDelta,
  presenceDelta: result.presenceDelta,
  retryAllowed: result.retryAllowed,
  triggerExists: false,
  remoteExecutionAuthority: false,
  exactRootCauseProven: false,
  causalPromotionAllowed: false
})}\n`);
