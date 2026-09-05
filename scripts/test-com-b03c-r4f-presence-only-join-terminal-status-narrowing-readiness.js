#!/usr/bin/env node
'use strict';

const r4f = require('../backend/modules/communities/community-realtime-private-auth-r4f');
const config = require('../config/com-b03c-r4f-presence-only-join-terminal-status-narrowing-readiness.json');
const r4eEvidence = require('../docs/validation/COM-B03C-R4E-R4C-BRIDGED-RETRY-EXECUTION-AUTHORIZATION-LIFECYCLE-READINESS.json');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function assert(condition, code) {
  if (!condition) fail(code);
}

function assertPredecessorEvidence() {
  assert(r4eEvidence.validationId === config.predecessorValidationId, 'R4F_R4E_VALIDATION_MISMATCH');
  assert(r4eEvidence.status === config.predecessorStatus, 'R4F_R4E_STATUS_MISMATCH');
  assert(r4eEvidence.matrixVersion === config.matrixVersion, 'R4F_R4E_MATRIX_VERSION_MISMATCH');
  assert(r4eEvidence.maturity === config.maturity, 'R4F_R4E_MATURITY_MISMATCH');
  assert(r4eEvidence.productionGate === config.productionGate, 'R4F_R4E_PRODUCTION_GATE_MISMATCH');
  assert(r4eEvidence.hostedObservation?.classification === config.r4eClassification, 'R4F_R4E_CLASSIFICATION_MISMATCH');
  assert(r4eEvidence.hostedObservation?.executionFailure === null, 'R4F_R4E_EXECUTION_FAILURE_MUST_BE_NULL');
  assert(r4eEvidence.hostedObservation?.failurePhase === null, 'R4F_R4E_FAILURE_PHASE_MUST_BE_NULL');
  assert(r4eEvidence.hostedObservation?.zeroResidueProven === true, 'R4F_R4E_ZERO_RESIDUE_REQUIRED');
  assert(r4eEvidence.hostedObservation?.baselineRestored === true, 'R4F_R4E_BASELINE_RESTORED_REQUIRED');
  assert(r4eEvidence.hostedObservation?.identityCleanupSucceeded === true, 'R4F_R4E_IDENTITY_CLEANUP_REQUIRED');
  assert(r4eEvidence.hostedObservation?.observation?.presenceOnlyJoinSubscribed === false, 'R4F_R4E_PRESENCE_ONLY_NON_SUBSCRIPTION_REQUIRED');
  assert(r4eEvidence.hostedObservation?.deltas?.presence_only_join?.broadcast_rls_evaluations === 1, 'R4F_R4E_BROADCAST_DELTA_REQUIRED');
  assert(r4eEvidence.hostedObservation?.deltas?.presence_only_join?.presence_rls_evaluations === 1, 'R4F_R4E_PRESENCE_DELTA_REQUIRED');
  assert(r4eEvidence.certificationHistory?.singleUseCleanup?.authorizationReusable === false, 'R4F_R4E_AUTHORIZATION_MUST_BE_NON_REUSABLE');
  assert(r4eEvidence.certificationHistory?.singleUseCleanup?.secondStagingExecutionOccurred === false, 'R4F_R4E_SECOND_EXECUTION_MUST_BE_FALSE');
}

function classificationCases() {
  return [
    {
      input: { broadcastDelta: 1, presenceDelta: 1, terminalStatus: 'SUBSCRIBED', sanitizedJoinClassification: 'subscribed', rawRemoteErrorExposed: false },
      expected: 'presence_only_join_subscribed_after_both_gates'
    },
    {
      input: { broadcastDelta: 1, presenceDelta: 1, terminalStatus: 'CHANNEL_ERROR', sanitizedJoinClassification: 'realtime_rls_authorization_rejected', rawRemoteErrorExposed: false },
      expected: 'presence_only_join_rls_rejected_after_both_gates'
    },
    {
      input: { broadcastDelta: 1, presenceDelta: 1, terminalStatus: 'CHANNEL_ERROR', sanitizedJoinClassification: 'jwt_or_auth_context_rejected', rawRemoteErrorExposed: false },
      expected: 'presence_only_join_auth_context_rejected_after_both_gates'
    },
    {
      input: { broadcastDelta: 1, presenceDelta: 1, terminalStatus: 'TIMED_OUT', sanitizedJoinClassification: 'channel_join_timeout', rawRemoteErrorExposed: false },
      expected: 'presence_only_join_timed_out_after_both_gates'
    },
    {
      input: { broadcastDelta: 1, presenceDelta: 1, terminalStatus: 'CLOSED', sanitizedJoinClassification: 'channel_closed_during_join', rawRemoteErrorExposed: false },
      expected: 'presence_only_join_closed_after_both_gates'
    },
    {
      input: { broadcastDelta: 1, presenceDelta: 1, terminalStatus: 'UNKNOWN', sanitizedJoinClassification: 'unknown_channel_join_failure', rawRemoteErrorExposed: false },
      expected: 'presence_only_join_unknown_terminal_after_both_gates'
    },
    {
      input: { broadcastDelta: 0, presenceDelta: 1, terminalStatus: 'CHANNEL_ERROR', sanitizedJoinClassification: 'realtime_rls_authorization_rejected', rawRemoteErrorExposed: false },
      expected: 'presence_only_counter_path_diverged'
    }
  ];
}

function main() {
  assertPredecessorEvidence();
  const readiness = r4f.evaluateRepositoryReadiness(config);
  assert(readiness.decision === r4f.STATUS, 'R4F_REPOSITORY_READINESS_NOT_CERTIFIED');
  assert(readiness.repositoryNarrowingAuthority === true, 'R4F_REPOSITORY_AUTHORITY_REQUIRED');
  for (const flag of [
    'remoteExecutionAuthority','triggerCreationAuthority','remoteCredentialReadAuthority',
    'remoteDependencyLoadAuthority','networkAuthority','stagingReadAuthority',
    'stagingMutationAuthority','realtimeSubscriptionAuthority','authIdentityLifecycleAuthority',
    'runtimeChangeAuthority','productionAuthority','pullRequestMergeAuthority',
    'exactRootCauseProven','causalPromotionAllowed'
  ]) assert(readiness[flag] === false, `R4F_${flag}_MUST_BE_FALSE`);

  for (const item of classificationCases()) {
    const result = r4f.classifyTerminalObservation(item.input);
    assert(result.classification === item.expected, `R4F_CLASSIFICATION_MISMATCH_${item.expected}`);
    assert(result.exactRootCauseProven !== true, 'R4F_CLASSIFIER_MUST_NOT_PROVE_ROOT_CAUSE');
    assert(result.causalPromotionAllowed !== true, 'R4F_CLASSIFIER_MUST_NOT_ALLOW_CAUSAL_PROMOTION');
  }

  const rawErrorLeak = r4f.classifyTerminalObservation({
    broadcastDelta: 1,
    presenceDelta: 1,
    terminalStatus: 'CHANNEL_ERROR',
    sanitizedJoinClassification: 'realtime_rls_authorization_rejected',
    rawRemoteErrorExposed: true
  });
  assert(rawErrorLeak.classification === 'incomplete_terminal_observation', 'R4F_RAW_ERROR_LEAK_MUST_FAIL_CLOSED');

  process.stdout.write(`${JSON.stringify({
    validationId: r4f.VALIDATION_ID,
    contractId: r4f.CONTRACT_ID,
    status: readiness.decision,
    predecessorHead: r4f.PREDECESSOR_R4E_HEAD,
    classificationCaseCount: classificationCases().length,
    preciseObservation: readiness.preciseObservation,
    remoteExecutionAuthority: readiness.remoteExecutionAuthority,
    stagingReadAuthority: readiness.stagingReadAuthority,
    stagingMutationAuthority: readiness.stagingMutationAuthority,
    exactRootCauseProven: readiness.exactRootCauseProven,
    causalPromotionAllowed: readiness.causalPromotionAllowed
  })}\n`);
}

main();
