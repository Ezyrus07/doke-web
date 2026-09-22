#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const r4y = require('../backend/modules/communities/community-realtime-private-auth-r4y');
const config = require('../config/com-b03c-r4y-r4l-async-finally-cleanup-ordering-root-cause-readiness.json');
const r4xEvidence = require('../docs/validation/COM-B03C-R4X-R4W-TERMINAL-NO-COUNTER-PATH-ATTRIBUTION-READINESS.json');
const lock = require('../package-lock.json');

async function main() {
  const result = r4y.evaluateRepositoryReadiness(config.readinessInput);
  assert.equal(result.decision, r4y.STATUS);
  assert.equal(result.harnessRootCauseProven, true);
  assert.equal(result.r4wTerminalObservationContaminated, true);
  assert.equal(result.contaminatedTerminalStatus, 'CLOSED');
  assert.equal(result.correctedBridgeReadinessAllowed, true);
  assert.equal(result.freshAuthorizationRequiredForFutureRemoteAttempt, true);
  assert.equal(result.remoteExecutionAuthority, false);
  assert.equal(result.stagingReadAuthority, false);
  assert.equal(result.stagingMutationAuthority, false);
  assert.equal(result.productionAuthority, false);
  assert.equal(result.pullRequestMergeAuthority, false);
  assert.equal(result.exactRootCauseProven, false);
  assert.equal(result.causalPromotionAllowed, false);

  assert.equal(
    r4xEvidence.status,
    'repository_r4w_terminal_no_counter_path_attribution_certified_no_remote_authority'
  );
  assert.equal(r4xEvidence.exactRootCauseProven, false);
  assert.equal(r4xEvidence.causalPromotionAllowed, false);

  assert.equal(lock.packages['node_modules/@supabase/supabase-js'].version, '2.110.0');
  assert.equal(lock.packages['node_modules/@supabase/realtime-js'].version, '2.110.0');
  assert.equal(lock.packages['node_modules/@supabase/phoenix'].version, '0.4.4');

  const r4lSource = fs.readFileSync(
    'scripts/execute-com-b03c-r4l-single-use-hosted-terminal-status-observation.js',
    'utf8'
  );
  const returnPattern =
    'return r4gExecutor.observeSubscribeChannel(channel, timeoutMs);';
  const cleanupPattern =
    'await client.removeChannel(channel).catch(() => {});';
  assert.ok(r4lSource.includes(returnPattern));
  assert.ok(r4lSource.includes(cleanupPattern));
  assert.equal(
    r4lSource.includes('return await r4gExecutor.observeSubscribeChannel(channel, timeoutMs);'),
    false
  );

  const originalEvents = [];
  let originalResolve;
  const originalProbe = new Promise((resolve) => { originalResolve = resolve; });
  const originalResultPromise = r4y.demonstrateAsyncFinallyOrdering({
    observe(events) {
      originalEvents.push(...events.splice(0));
      return originalProbe.then((value) => {
        originalEvents.push('probe_resolved');
        return value;
      });
    },
    async cleanup(events) {
      originalEvents.push(...events.splice(0));
      originalEvents.push('cleanup_closes_channel');
      originalResolve('CLOSED');
    }
  });
  const originalResult = await originalResultPromise;
  originalEvents.push('outer_resolved');
  assert.equal(originalResult, 'CLOSED');
  assert.ok(
    originalEvents.indexOf('cleanup_closes_channel') < originalEvents.indexOf('probe_resolved')
  );

  const correctedEvents = [];
  let correctedResolve;
  const correctedProbe = new Promise((resolve) => { correctedResolve = resolve; });
  queueMicrotask(() => {
    correctedEvents.push('remote_probe_resolution');
    correctedResolve('SUBSCRIBED');
  });
  const correctedResult = await r4y.demonstrateCorrectedAwaitOrdering({
    observe(events) {
      correctedEvents.push(...events.splice(0));
      return correctedProbe.then((value) => {
        correctedEvents.push('probe_resolved');
        return value;
      });
    },
    async cleanup(events) {
      correctedEvents.push(...events.splice(0));
      correctedEvents.push('cleanup_closes_channel');
    }
  });
  correctedEvents.push('outer_resolved');
  assert.equal(correctedResult, 'SUBSCRIBED');
  assert.ok(
    correctedEvents.indexOf('probe_resolved') < correctedEvents.indexOf('cleanup_closes_channel')
  );

  assert.equal(
    fs.existsSync('config/com-b03c-r4t-single-use-successor-executor-trigger.json'),
    false
  );

  let hardBlocked = false;
  try {
    r4y.assertRemoteExecutionBoundaryAbsent();
  } catch (error) {
    hardBlocked = error?.code === r4y.REMOTE_EXECUTION_BLOCK_CODE;
  }
  assert.equal(hardBlocked, true);

  process.stdout.write(`${JSON.stringify({
    validationId: r4y.VALIDATION_ID,
    decision: result.decision,
    harnessRootCause: result.harnessRootCause,
    harnessRootCauseProven: result.harnessRootCauseProven,
    r4wTerminalObservationContaminated: result.r4wTerminalObservationContaminated,
    correctedBridgeReadinessAllowed: result.correctedBridgeReadinessAllowed,
    triggerExists: false,
    remoteExecutionAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${String(error?.stack || error)}\n`);
  process.exitCode = 1;
});
