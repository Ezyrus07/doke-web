#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const r4z = require('../backend/modules/communities/community-realtime-private-auth-r4z');
const config = require('../config/com-b03c-r4z-corrected-terminal-bridge-readiness.json');
const {
  buildCorrectedTerminalRealtimeBridge
} = require('./build-com-b03c-r4z-corrected-terminal-realtime-bridge');

const result = r4z.evaluateRepositoryReadiness(config.readinessInput);
assert.equal(result.decision, r4z.STATUS);
assert.equal(result.correctedTerminalBridgeReady, true);
assert.equal(result.historicalHarnessMutationAllowed, false);
assert.equal(result.r4wTerminalObservationStillContaminated, true);
assert.equal(result.freshAuthorizationRequiredForFutureRemoteAttempt, true);
assert.equal(result.remoteExecutionAuthority, false);
assert.equal(result.stagingReadAuthority, false);
assert.equal(result.stagingMutationAuthority, false);
assert.equal(result.productionAuthority, false);
assert.equal(result.pullRequestMergeAuthority, false);
assert.equal(result.exactRootCauseProven, false);
assert.equal(result.causalPromotionAllowed, false);

const historicalR4lSource = fs.readFileSync(
  'scripts/execute-com-b03c-r4l-single-use-hosted-terminal-status-observation.js',
  'utf8'
);
assert.match(
  historicalR4lSource,
  /return r4gExecutor\.observeSubscribeChannel\(channel, timeoutMs\);/
);
assert.doesNotMatch(
  historicalR4lSource,
  /return await r4gExecutor\.observeSubscribeChannel\(channel, timeoutMs\);/
);

const correctedSource = fs.readFileSync(
  'scripts/build-com-b03c-r4z-corrected-terminal-realtime-bridge.js',
  'utf8'
);
assert.match(
  correctedSource,
  /const outcome = await observeSubscribeChannel\(channel, timeoutMs\);/
);
assert.match(correctedSource, /finally \{/);
assert.match(correctedSource, /await client\.removeChannel\(channel\)\.catch\(\(\) => \{\}\);/);

function createSyntheticClient(events) {
  const channel = {
    on(type, filter, callback) {
      assert.equal(type, 'presence');
      assert.equal(filter.event, 'sync');
      assert.equal(typeof callback, 'function');
      events.push('presence_listener_registered');
      return this;
    },
    presenceState() {
      return {};
    }
  };

  return {
    realtime: {
      async setAuth(token) {
        assert.equal(token, 'synthetic-access-token');
        events.push('auth_set');
      }
    },
    channel(topic, options) {
      assert.match(topic, /^room:r4z-/);
      assert.equal(options.config.private, true);
      assert.equal(options.config.presence.enabled, true);
      assert.equal(typeof options.config.presence.key, 'string');
      assert.equal(options.config.presence.key.length, 16);
      events.push('channel_created');
      return channel;
    },
    async removeChannel(candidate) {
      assert.equal(candidate, channel);
      events.push('remove_channel');
      return 'ok';
    }
  };
}

function index(events, event) {
  const value = events.indexOf(event);
  assert.notEqual(value, -1, `missing event: ${event}`);
  return value;
}

async function runOutcomeCase(id, outcome) {
  const events = [];
  const bridge = buildCorrectedTerminalRealtimeBridge({
    createClient() {
      events.push('client_created');
      return createSyntheticClient(events);
    },
    url: 'https://synthetic.invalid',
    publishableKey: 'synthetic-publishable-key',
    timeoutMs: 25,
    async observeSubscribeChannel(channel, timeoutMs) {
      assert.ok(channel);
      assert.equal(timeoutMs, 25);
      events.push('observer_called');
      await Promise.resolve();
      events.push('observer_settled');
      return Object.freeze({ ...outcome });
    },
    trace(event) {
      events.push(event);
    }
  });

  const observed = await bridge.runPresenceOnlyProbe({
    userId: `synthetic-${id}`,
    accessToken: 'synthetic-access-token',
    topic: `room:r4z-${id}`
  });
  assert.deepEqual(observed, outcome);
  assert.ok(index(events, 'observation_started') < index(events, 'observer_called'));
  assert.ok(index(events, 'observer_called') < index(events, 'observer_settled'));
  assert.ok(index(events, 'observer_settled') < index(events, 'observation_settled'));
  assert.ok(index(events, 'observation_settled') < index(events, 'cleanup_started'));
  assert.ok(index(events, 'cleanup_started') < index(events, 'remove_channel'));
  assert.ok(index(events, 'remove_channel') < index(events, 'cleanup_finished'));
  return events;
}

async function runRejectionCase() {
  const events = [];
  const bridge = buildCorrectedTerminalRealtimeBridge({
    createClient() {
      events.push('client_created');
      return createSyntheticClient(events);
    },
    url: 'https://synthetic.invalid',
    publishableKey: 'synthetic-publishable-key',
    timeoutMs: 25,
    async observeSubscribeChannel() {
      events.push('observer_called');
      await Promise.resolve();
      events.push('observer_rejected');
      throw new Error('synthetic observer rejection');
    },
    trace(event) {
      events.push(event);
    }
  });

  await assert.rejects(
    bridge.runPresenceOnlyProbe({
      userId: 'synthetic-rejection',
      accessToken: 'synthetic-access-token',
      topic: 'room:r4z-rejection'
    }),
    /synthetic observer rejection/
  );
  assert.ok(index(events, 'observer_rejected') < index(events, 'cleanup_started'));
  assert.ok(index(events, 'cleanup_started') < index(events, 'remove_channel'));
  assert.ok(index(events, 'remove_channel') < index(events, 'cleanup_finished'));
  return events;
}

(async () => {
  const cases = {
    subscribed: await runOutcomeCase('subscribed', {
      terminalStatus: 'SUBSCRIBED', subscribed: true, classification: 'subscribed'
    }),
    channelError: await runOutcomeCase('channel-error', {
      terminalStatus: 'CHANNEL_ERROR', subscribed: false, classification: 'sanitized_channel_error'
    }),
    timedOut: await runOutcomeCase('timed-out', {
      terminalStatus: 'TIMED_OUT', subscribed: false, classification: 'sanitized_timeout'
    }),
    rejection: await runRejectionCase()
  };

  let blocked = false;
  try {
    r4z.assertRemoteExecutionBoundaryAbsent();
  } catch (error) {
    blocked = error?.code === r4z.REMOTE_EXECUTION_BLOCK_CODE;
  }
  assert.equal(blocked, true);

  assert.equal(
    fs.existsSync('config/com-b03c-r4t-single-use-successor-executor-trigger.json'),
    false
  );

  const invalid = structuredClone(config.readinessInput);
  invalid.cleanupStartsOnlyAfterObservationSettles = false;
  assert.equal(r4z.evaluateRepositoryReadiness(invalid).decision, 'blocked_repository_only');

  process.stdout.write(`${JSON.stringify({
    validationId: r4z.VALIDATION_ID,
    decision: result.decision,
    correctedTerminalBridgeReady: result.correctedTerminalBridgeReady,
    caseCount: Object.keys(cases).length,
    triggerExists: false,
    remoteExecutionAuthority: false,
    stagingAccess: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  })}\n`);
})().catch((error) => {
  process.stderr.write(`${String(error?.stack || error)}\n`);
  process.exitCode = 2;
});
