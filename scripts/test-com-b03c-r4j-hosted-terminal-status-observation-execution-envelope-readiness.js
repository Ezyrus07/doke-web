#!/usr/bin/env node
'use strict';

const r4j = require('../backend/modules/communities/community-realtime-private-auth-r4j');
const config = require('../config/com-b03c-r4j-hosted-terminal-status-observation-execution-envelope-readiness.json');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function main() {
  const result = r4j.evaluateRepositoryReadiness(config.readinessInput);
  if (result.decision !== r4j.STATUS || result.executionEnvelopeReady !== true) {
    fail('DOKE_COM_B03C_R4J_READINESS_FAILED');
  }
  if (result.authorizationReceiptId !== r4j.AUTHORIZATION_RECEIPT_ID ||
      result.authorizationConsumed !== true || result.authorizationReusable !== false ||
      result.executionAttempted !== false || result.futureTriggerExists !== false) {
    fail('DOKE_COM_B03C_R4J_RECEIPT_CONTINUITY_FAILED');
  }
  for (const field of [
    'triggerCreationAuthority','remoteExecutionAuthority','remoteCredentialReadAuthority',
    'remoteDependencyLoadAuthority','networkAuthority','stagingReadAuthority',
    'stagingMutationAuthority','realtimeSubscriptionAuthority','authIdentityLifecycleAuthority',
    'runtimeChangeAuthority','productionAuthority','pullRequestMergeAuthority'
  ]) {
    if (result[field] !== false) fail(`DOKE_COM_B03C_R4J_REMOTE_AUTHORITY_PRESENT_${field.toUpperCase()}`);
  }

  const workflowInstallHead = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const trigger = r4j.buildFutureTriggerDescriptor({
    workflowInstallHead,
    nonce: 'r4j_repository_trigger_contract'
  });
  const continuity = r4j.validateFutureTriggerCommit({
    trigger,
    parentHead: workflowInstallHead,
    changedFiles: [r4j.FUTURE_TRIGGER_PATH],
    runAttempt: 1,
    authorizationReceipt: config.readinessInput.authorizationReceipt
  });
  if (continuity.decision !== 'r4j_future_trigger_continuity_valid_repository_only' ||
      continuity.triggerContinuityValid !== true || continuity.remoteExecutionAuthority !== false) {
    fail('DOKE_COM_B03C_R4J_FUTURE_TRIGGER_CONTINUITY_CONTRACT_FAILED');
  }

  const wrongParent = r4j.validateFutureTriggerCommit({
    trigger,
    parentHead: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    changedFiles: [r4j.FUTURE_TRIGGER_PATH],
    runAttempt: 1,
    authorizationReceipt: config.readinessInput.authorizationReceipt
  });
  if (wrongParent.reason !== 'R4J_TRIGGER_PARENT_CONTINUITY_REQUIRED') {
    fail('DOKE_COM_B03C_R4J_WRONG_PARENT_NOT_REJECTED');
  }

  const wrongAttempt = r4j.validateFutureTriggerCommit({
    trigger,
    parentHead: workflowInstallHead,
    changedFiles: [r4j.FUTURE_TRIGGER_PATH],
    runAttempt: 2,
    authorizationReceipt: config.readinessInput.authorizationReceipt
  });
  if (wrongAttempt.reason !== 'R4J_SINGLE_USE_RUN_ATTEMPT_REQUIRED') {
    fail('DOKE_COM_B03C_R4J_RUN_ATTEMPT_REUSE_NOT_REJECTED');
  }

  const wrongDiff = r4j.validateFutureTriggerCommit({
    trigger,
    parentHead: workflowInstallHead,
    changedFiles: [r4j.FUTURE_TRIGGER_PATH, 'unexpected-file.txt'],
    runAttempt: 1,
    authorizationReceipt: config.readinessInput.authorizationReceipt
  });
  if (wrongDiff.reason !== 'R4J_EXACT_SINGLE_FILE_TRIGGER_REQUIRED') {
    fail('DOKE_COM_B03C_R4J_MULTIFILE_TRIGGER_NOT_REJECTED');
  }

  const observation = r4j.buildSanitizedTerminalObservation({
    terminalStatus: 'CHANNEL_ERROR',
    subscribed: false,
    sanitizedJoinClassification: 'realtime_rls_authorization_rejected',
    broadcastDelta: 1,
    presenceDelta: 1
  });
  if (observation.classification !== 'presence_only_join_rls_rejected_after_both_gates' ||
      observation.rawRemoteErrorExposed !== false || observation.exactRootCauseProven !== false ||
      observation.causalPromotionAllowed !== false) {
    fail('DOKE_COM_B03C_R4J_R4G_OBSERVATION_BINDING_FAILED');
  }

  let blocked = false;
  try {
    r4j.assertRemoteExecutionBoundaryAbsent();
  } catch (error) {
    blocked = error?.code === r4j.REMOTE_EXECUTION_BLOCK_CODE;
  }
  if (!blocked) fail('DOKE_COM_B03C_R4J_REMOTE_HARD_BLOCK_FAILED');

  process.stdout.write(`${JSON.stringify({
    validationId: r4j.VALIDATION_ID,
    contractId: r4j.CONTRACT_ID,
    status: r4j.STATUS,
    authorizationReceiptId: r4j.AUTHORIZATION_RECEIPT_ID,
    executionEnvelopeReady: true,
    futureTriggerContractVerified: true,
    terminalObservationBindingVerified: true,
    remoteExecutionAuthority: false,
    stagingAccess: false,
    networkAccess: false,
    rawRemoteErrorExposed: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  })}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R4J_TEST_FAILURE')}\n`);
  process.exitCode = 1;
}
