#!/usr/bin/env node
'use strict';

const r4j = require('../backend/modules/communities/community-realtime-private-auth-r4j');
const r4gExecutor = require('./execute-com-b03c-r4g-presence-only-terminal-observation-envelope');
const config = require('../config/com-b03c-r4j-hosted-terminal-status-observation-execution-envelope-readiness.json');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function prepareRemoteRuntime({ readCredential, loadDependency } = {}) {
  r4j.assertRemoteExecutionBoundaryAbsent();
  if (typeof readCredential !== 'function' || typeof loadDependency !== 'function') {
    fail('DOKE_COM_B03C_R4J_REMOTE_RUNTIME_READER_REQUIRED');
  }
  return null;
}

async function repositorySelfTest() {
  const readiness = r4j.evaluateRepositoryReadiness(config.readinessInput);
  if (readiness.decision !== r4j.STATUS) fail('DOKE_COM_B03C_R4J_READINESS_REQUIRED');

  let credentialReads = 0;
  let dependencyLoads = 0;
  try {
    prepareRemoteRuntime({
      readCredential() { credentialReads += 1; return 'forbidden'; },
      loadDependency() { dependencyLoads += 1; return {}; }
    });
    fail('DOKE_COM_B03C_R4J_PREAUTH_HARD_BLOCK_DID_NOT_FIRE');
  } catch (error) {
    if (error?.code !== r4j.REMOTE_EXECUTION_BLOCK_CODE) throw error;
  }
  if (credentialReads !== 0 || dependencyLoads !== 0) {
    fail('DOKE_COM_B03C_R4J_PREAUTH_SIDE_EFFECT_DETECTED');
  }

  const workflowInstallHead = 'cccccccccccccccccccccccccccccccccccccccc';
  const trigger = r4j.buildFutureTriggerDescriptor({
    workflowInstallHead,
    nonce: 'r4j_repository_future_trigger'
  });
  const triggerContinuity = r4j.validateFutureTriggerCommit({
    trigger,
    parentHead: workflowInstallHead,
    changedFiles: [r4j.FUTURE_TRIGGER_PATH],
    runAttempt: 1,
    authorizationReceipt: config.readinessInput.authorizationReceipt
  });
  if (triggerContinuity.decision !== 'r4j_future_trigger_continuity_valid_repository_only') {
    fail('DOKE_COM_B03C_R4J_TRIGGER_CONTRACT_INVALID');
  }

  const terminalCases = [
    ['SUBSCRIBED', null, true, 'subscribed', 'presence_only_join_subscribed_after_both_gates'],
    ['CHANNEL_ERROR', new Error('policy access denied'), false, 'realtime_rls_authorization_rejected', 'presence_only_join_rls_rejected_after_both_gates'],
    ['CHANNEL_ERROR', new Error('jwt claim rejected'), false, 'jwt_or_auth_context_rejected', 'presence_only_join_auth_context_rejected_after_both_gates'],
    ['TIMED_OUT', null, false, 'channel_join_timeout', 'presence_only_join_timed_out_after_both_gates'],
    ['CLOSED', null, false, 'channel_closed_during_join', 'presence_only_join_closed_after_both_gates']
  ];
  const observed = [];
  for (const [status, error, subscribed, expectedSanitized, expectedClassification] of terminalCases) {
    const outcome = r4gExecutor.terminalJoinOutcome(status, error);
    if (outcome.subscribed !== subscribed || outcome.classification !== expectedSanitized) {
      fail('DOKE_COM_B03C_R4J_TERMINAL_OUTCOME_SANITIZATION_FAILED');
    }
    const observation = r4j.buildSanitizedTerminalObservation({
      terminalStatus: outcome.terminalStatus,
      subscribed: outcome.subscribed,
      sanitizedJoinClassification: outcome.classification,
      broadcastDelta: 1,
      presenceDelta: 1
    });
    if (observation.classification !== expectedClassification || observation.rawRemoteErrorExposed !== false) {
      fail('DOKE_COM_B03C_R4J_TERMINAL_OBSERVATION_CORRELATION_FAILED');
    }
    observed.push({ terminalStatus: observation.terminalStatus, classification: observation.classification });
  }

  return Object.freeze({
    validationId: 'COM-B03C-R4J-REPOSITORY-EXECUTION-ENVELOPE-SELF-TEST',
    contractId: r4j.CONTRACT_ID,
    envelopeKind: r4j.ENVELOPE_KIND,
    authorizationReceiptId: r4j.AUTHORIZATION_RECEIPT_ID,
    executionEnvelopeReady: true,
    futureTriggerContractVerified: true,
    terminalCaseCount: observed.length,
    terminalCases: Object.freeze(observed),
    credentialReadsBeforeExecutionBoundary: credentialReads,
    dependencyLoadsBeforeExecutionBoundary: dependencyLoads,
    triggerCreated: false,
    stagingAccess: false,
    networkAccess: false,
    databaseQueryAgainstRemote: false,
    realtimeSubscriptionAgainstRemote: false,
    authIdentityMutation: false,
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
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R4J_FAILURE')}\n`);
    process.exitCode = 2;
  });
}

module.exports = {
  prepareRemoteRuntime,
  repositorySelfTest
};
