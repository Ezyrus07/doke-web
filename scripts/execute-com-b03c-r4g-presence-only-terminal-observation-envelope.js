#!/usr/bin/env node
'use strict';

const r4g = require('../backend/modules/communities/community-realtime-private-auth-r4g');
const r3gExecutor = require('./execute-com-b03c-r3g-remote-adapter-staging-diagnostic');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function prepareRemoteRuntime({ readCredential, loadDependency } = {}) {
  r4g.assertRemoteExecutionBoundaryAbsent();
  if (typeof readCredential !== 'function' || typeof loadDependency !== 'function') {
    fail('DOKE_COM_B03C_R4G_REMOTE_RUNTIME_READER_REQUIRED');
  }
  return null;
}

function terminalJoinOutcome(status, error) {
  if (status === 'SUBSCRIBED') {
    return Object.freeze({
      terminalStatus: 'SUBSCRIBED',
      subscribed: true,
      classification: 'subscribed',
      rawRemoteErrorExposed: false
    });
  }
  const normalized = r4g.normalizeTerminalStatus(status);
  const sanitized = r3gExecutor.sanitizeJoinFailure(normalized, error);
  return Object.freeze({
    terminalStatus: normalized,
    subscribed: false,
    classification: String(sanitized.classification || 'unknown_channel_join_failure'),
    rawRemoteErrorExposed: false
  });
}

function observeSubscribeChannel(channel, timeoutMs = 40) {
  if (!channel || typeof channel.subscribe !== 'function') fail('DOKE_COM_B03C_R4G_CHANNEL_REQUIRED');
  return new Promise((resolve) => {
    let done = false;
    const finish = (outcome) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(outcome);
    };
    const timer = setTimeout(() => finish(terminalJoinOutcome('TIMED_OUT', null)), timeoutMs);
    channel.subscribe((status, error) => {
      if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        finish(terminalJoinOutcome(status, error));
      }
    });
  });
}

function correlate(outcome, { broadcastDelta, presenceDelta } = {}) {
  return r4g.buildTerminalObservation({
    terminalStatus: outcome?.terminalStatus,
    subscribed: outcome?.subscribed,
    sanitizedJoinClassification: outcome?.classification,
    broadcastDelta,
    presenceDelta,
    rawRemoteErrorExposed: false
  });
}

function syntheticChannel(status, error) {
  return {
    subscribe(callback) {
      queueMicrotask(() => callback(status, error));
      return this;
    }
  };
}

async function repositorySelfTest() {
  let credentialReads = 0;
  let dependencyLoads = 0;
  try {
    prepareRemoteRuntime({
      readCredential() { credentialReads += 1; return 'forbidden'; },
      loadDependency() { dependencyLoads += 1; return {}; }
    });
    fail('DOKE_COM_B03C_R4G_PREAUTH_HARD_BLOCK_DID_NOT_FIRE');
  } catch (error) {
    if (error?.code !== r4g.REMOTE_EXECUTION_BLOCK_CODE) throw error;
  }
  if (credentialReads !== 0 || dependencyLoads !== 0) {
    fail('DOKE_COM_B03C_R4G_PREAUTH_SIDE_EFFECT_DETECTED');
  }

  const cases = [
    {
      id: 'subscribed',
      outcome: await observeSubscribeChannel(syntheticChannel('SUBSCRIBED')),
      counters: { broadcastDelta: 1, presenceDelta: 1 },
      expected: 'presence_only_join_subscribed_after_both_gates'
    },
    {
      id: 'rls_rejected',
      outcome: await observeSubscribeChannel(syntheticChannel('CHANNEL_ERROR', new Error('policy access denied'))),
      counters: { broadcastDelta: 1, presenceDelta: 1 },
      expected: 'presence_only_join_rls_rejected_after_both_gates'
    },
    {
      id: 'auth_rejected',
      outcome: await observeSubscribeChannel(syntheticChannel('CHANNEL_ERROR', new Error('jwt claim rejected'))),
      counters: { broadcastDelta: 1, presenceDelta: 1 },
      expected: 'presence_only_join_auth_context_rejected_after_both_gates'
    },
    {
      id: 'timed_out',
      outcome: await observeSubscribeChannel(syntheticChannel('TIMED_OUT')),
      counters: { broadcastDelta: 1, presenceDelta: 1 },
      expected: 'presence_only_join_timed_out_after_both_gates'
    },
    {
      id: 'closed',
      outcome: await observeSubscribeChannel(syntheticChannel('CLOSED')),
      counters: { broadcastDelta: 1, presenceDelta: 1 },
      expected: 'presence_only_join_closed_after_both_gates'
    },
    {
      id: 'unknown',
      outcome: terminalJoinOutcome('UNRECOGNIZED_TERMINAL', new Error('opaque remote error')),
      counters: { broadcastDelta: 1, presenceDelta: 1 },
      expected: 'presence_only_join_unknown_terminal_after_both_gates'
    },
    {
      id: 'counter_divergence',
      outcome: await observeSubscribeChannel(syntheticChannel('CHANNEL_ERROR', new Error('policy denied'))),
      counters: { broadcastDelta: 1, presenceDelta: 0 },
      expected: 'presence_only_counter_path_diverged'
    }
  ];

  const results = [];
  for (const item of cases) {
    const observed = correlate(item.outcome, item.counters);
    if (observed.decision !== 'terminal_observation_sanitized') {
      fail(`DOKE_COM_B03C_R4G_CASE_INVALID_${item.id.toUpperCase()}`);
    }
    if (observed.classification !== item.expected ||
        observed.rawRemoteErrorExposed !== false ||
        observed.exactRootCauseProven !== false ||
        observed.causalPromotionAllowed !== false) {
      fail(`DOKE_COM_B03C_R4G_CASE_MISMATCH_${item.id.toUpperCase()}`);
    }
    results.push({
      id: item.id,
      terminalStatus: observed.terminalStatus,
      joinSubscribed: observed.joinSubscribed,
      sanitizedJoinClassification: observed.sanitizedJoinClassification,
      classification: observed.classification
    });
  }

  return Object.freeze({
    validationId: 'COM-B03C-R4G-REPOSITORY-EXECUTABLE-OBSERVATION-SELF-TEST',
    contractId: r4g.CONTRACT_ID,
    envelopeKind: r4g.ENVELOPE_KIND,
    caseCount: results.length,
    cases: Object.freeze(results),
    credentialReadsBeforeAuthorization: credentialReads,
    dependencyLoadsBeforeAuthorization: dependencyLoads,
    stagingAccess: false,
    networkAccess: false,
    databaseQueryAgainstRemote: false,
    realtimeSubscriptionAgainstRemote: false,
    rawRemoteErrorExposed: false,
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
    prepareRemoteRuntime({
      readCredential() { return null; },
      loadDependency() { return null; }
    });
  })().catch((error) => {
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R4G_FAILURE')}\n`);
    process.exitCode = 2;
  });
}

module.exports = {
  prepareRemoteRuntime,
  terminalJoinOutcome,
  observeSubscribeChannel,
  correlate,
  repositorySelfTest
};
