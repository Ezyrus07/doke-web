#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const r3w = require('../backend/modules/communities/community-realtime-private-auth-r3w');
const r3v = require('../backend/modules/communities/community-realtime-private-auth-r3v');
const r3k = require('../backend/modules/communities/community-realtime-private-auth-r3k');
const config = require('../config/com-b03c-r3w-head-bound-single-use-staging-authorization-lifecycle-readiness.json');
const predecessorEvidence = require('../docs/validation/COM-B03C-R3V-SINGLE-USE-REMOTE-EXECUTION-ENVELOPE-READINESS.json');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function assert(condition, code) {
  if (!condition) fail(code);
}

function readinessInput() {
  return {
    predecessorValidationId: config.predecessorValidationId,
    predecessorStatus: config.predecessorStatus,
    predecessorHead: config.predecessorHead,
    predecessorRecertRun: config.predecessorRecertRun,
    predecessorRecertJob: config.predecessorRecertJob,
    predecessorRecertSuccess: config.predecessorRecertSuccess,
    predecessorMatrixRecertRun: config.predecessorMatrixRecertRun,
    predecessorMatrixRecertJob: config.predecessorMatrixRecertJob,
    predecessorMatrixRecertSuccess: config.predecessorMatrixRecertSuccess,
    matrixVersion: config.matrixVersion,
    maturity: config.maturity,
    productionGate: config.productionGate,
    r3vContractId: config.r3vContractId,
    r3kContractId: config.r3kContractId,
    futureTriggerPath: config.futureTriggerPath,
    triggerContractId: config.triggerContractId,
    lifecycleStates: config.lifecycleStates,
    requiredTriggerKeys: config.requiredTriggerKeys,
    ...config.controls,
    ...config.prohibitedPreparation
  };
}

function assertBlocked(result, reason) {
  assert(result?.decision === 'blocked_repository_only', `R3W_EXPECTED_BLOCK_${reason}`);
  assert(result?.reason === reason, `R3W_BLOCK_REASON_MISMATCH_${reason}`);
  assert(result?.remoteExecutionAuthority === false, `R3W_BLOCK_REMOTE_AUTHORITY_${reason}`);
}

function run() {
  assert(predecessorEvidence.status === config.predecessorStatus, 'R3W_R3V_EVIDENCE_STATUS_MISMATCH');
  assert(predecessorEvidence.contractId === r3v.CONTRACT_ID, 'R3W_R3V_EVIDENCE_CONTRACT_MISMATCH');
  assert(config.r3kContractId === r3k.CONTRACT_ID, 'R3W_R3K_CONTRACT_MISMATCH');
  assert(!fs.existsSync(path.resolve(__dirname, '..', r3w.FUTURE_TRIGGER_PATH)), 'R3W_TRIGGER_MUST_BE_ABSENT');

  const readiness = r3w.evaluateRepositoryReadiness(readinessInput());
  assert(
    readiness.decision === 'repository_head_bound_single_use_staging_authorization_lifecycle_ready_authorization_absent',
    'R3W_READINESS_DECISION_INVALID'
  );
  assert(readiness.repositoryAuthorizationLifecycleAuthority === true, 'R3W_REPOSITORY_AUTHORITY_REQUIRED');
  assert(readiness.explicitAuthorizationReceived === false, 'R3W_AUTHORIZATION_MUST_BE_ABSENT');
  assert(readiness.triggerCreationAuthority === false, 'R3W_TRIGGER_AUTHORITY_MUST_BE_FALSE');
  assert(readiness.remoteExecutionAuthority === false, 'R3W_REMOTE_AUTHORITY_MUST_BE_FALSE');
  assert(readiness.concreteAuthorizationPhrasePersisted === false, 'R3W_CONCRETE_PHRASE_MUST_NOT_BE_PERSISTED');

  const lifecycleHead = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const workflowInstallHead = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const phrase = r3w.buildAuthorizationPhrase(lifecycleHead);
  assert(phrase === `${r3w.AUTHORIZATION_PREFIX}${lifecycleHead}`, 'R3W_HEAD_BOUND_PHRASE_INVALID');
  assert(/^[0-9a-f]{64}$/.test(r3w.authorizationPhraseFingerprint(lifecycleHead)), 'R3W_PHRASE_FINGERPRINT_INVALID');

  const authorizationInput = {
    certifiedLifecycleHead: lifecycleHead,
    authorizationPhrase: phrase,
    authorizationConsumed: false,
    executionAttempted: false,
    targetEnvironment: 'staging',
    projectId: r3w.REQUIRED_PROJECT_ID,
    branch: r3w.REQUIRED_BRANCH,
    pullRequest: r3w.REQUIRED_PULL_REQUEST
  };
  const received = r3w.evaluateExplicitAuthorization(authorizationInput);
  assert(received.decision === 'head_bound_single_use_authorization_received_trigger_creation_only', 'R3W_AUTH_RECEIPT_INVALID');
  assert(received.authorizationConsumed === false, 'R3W_AUTH_RECEIPT_PRECONSUMED');
  assert(received.remoteExecutionAuthority === false, 'R3W_AUTH_MUST_NOT_ENABLE_REMOTE_EXECUTION');

  const consumed = r3w.consumeAuthorizationForTrigger(received);
  assert(consumed.authorizationConsumed === true, 'R3W_AUTH_CONSUMPTION_REQUIRED');
  assert(consumed.reusableAfterFailure === false, 'R3W_REUSE_AFTER_FAILURE_PROHIBITED');
  assert(consumed.remoteExecutionAuthority === false, 'R3W_CONSUMPTION_MUST_NOT_ENABLE_REMOTE_EXECUTION');

  assertBlocked(
    r3w.consumeAuthorizationForTrigger(consumed),
    'R3W_VALID_UNCONSUMED_AUTHORIZATION_RECEIPT_REQUIRED'
  );
  assertBlocked(
    r3w.evaluateExplicitAuthorization({ ...authorizationInput, authorizationConsumed: true }),
    'R3W_AUTHORIZATION_ALREADY_CONSUMED_OR_ATTEMPTED'
  );
  assertBlocked(
    r3w.evaluateExplicitAuthorization({ ...authorizationInput, executionAttempted: true }),
    'R3W_AUTHORIZATION_ALREADY_CONSUMED_OR_ATTEMPTED'
  );
  assertBlocked(
    r3w.evaluateExplicitAuthorization({ ...authorizationInput, authorizationPhrase: 'wrong' }),
    'R3W_EXACT_HEAD_BOUND_AUTHORIZATION_PHRASE_REQUIRED'
  );
  assertBlocked(
    r3w.evaluateExplicitAuthorization({ ...authorizationInput, branch: 'wrong-branch' }),
    'R3W_EXACT_AUTHORIZATION_SCOPE_REQUIRED'
  );

  const trigger = r3w.buildFutureTriggerDescriptor({
    workflowInstallHead,
    authorizationEvidenceHead: lifecycleHead,
    authorizationReceiptId: consumed.authorizationReceiptId
  });
  const validTrigger = r3w.validateFutureTriggerCommit({
    trigger,
    runAttempt: 1,
    parentHead: workflowInstallHead,
    changedFiles: [r3w.FUTURE_TRIGGER_PATH],
    authorizationReceipt: consumed
  });
  assert(
    validTrigger.decision === 'future_trigger_commit_shape_valid_remote_execution_still_separately_blocked',
    'R3W_TRIGGER_VALIDATION_INVALID'
  );
  assert(validTrigger.remoteExecutionAuthority === false, 'R3W_TRIGGER_MUST_NOT_ENABLE_REMOTE_EXECUTION');

  assertBlocked(
    r3w.validateFutureTriggerCommit({
      trigger,
      runAttempt: 2,
      parentHead: workflowInstallHead,
      changedFiles: [r3w.FUTURE_TRIGGER_PATH],
      authorizationReceipt: consumed
    }),
    'R3W_RUN_ATTEMPT_ONE_REQUIRED'
  );
  assertBlocked(
    r3w.validateFutureTriggerCommit({
      trigger,
      runAttempt: 1,
      parentHead: lifecycleHead,
      changedFiles: [r3w.FUTURE_TRIGGER_PATH],
      authorizationReceipt: consumed
    }),
    'R3W_TRIGGER_PARENT_CONTINUITY_REQUIRED'
  );
  assertBlocked(
    r3w.validateFutureTriggerCommit({
      trigger,
      runAttempt: 1,
      parentHead: workflowInstallHead,
      changedFiles: [r3w.FUTURE_TRIGGER_PATH, 'extra.txt'],
      authorizationReceipt: consumed
    }),
    'R3W_TRIGGER_SINGLE_FILE_DELTA_REQUIRED'
  );
  assertBlocked(
    r3w.validateFutureTriggerCommit({
      trigger,
      runAttempt: 1,
      parentHead: workflowInstallHead,
      changedFiles: [r3w.FUTURE_TRIGGER_PATH],
      authorizationReceipt: received
    }),
    'R3W_CONSUMED_AUTHORIZATION_RECEIPT_CONTINUITY_REQUIRED'
  );

  let hardBlock = false;
  try {
    r3w.assertRemoteExecutionBoundaryAbsent();
  } catch (error) {
    hardBlock = error?.code === r3w.REMOTE_EXECUTION_BLOCK_CODE;
  }
  assert(hardBlock, 'R3W_REMOTE_HARD_BLOCK_REQUIRED');

  const badReadiness = readinessInput();
  badReadiness.workflowPushTriggerAbsent = false;
  const blockedReadiness = r3w.evaluateRepositoryReadiness(badReadiness);
  assert(blockedReadiness.decision === 'blocked_repository_only', 'R3W_EXPECTED_READINESS_BLOCK');
  assert(blockedReadiness.reason === 'R3W_LIFECYCLE_CONTROL_REQUIRED', 'R3W_READINESS_BLOCK_REASON_INVALID');
  assert(blockedReadiness.flag === 'workflowPushTriggerAbsent', 'R3W_READINESS_BLOCK_FLAG_INVALID');

  process.stdout.write(`${JSON.stringify({
    validationId: r3w.VALIDATION_ID,
    contractId: r3w.CONTRACT_ID,
    decision: readiness.decision,
    lifecycleStateCount: r3w.LIFECYCLE_STATES.length,
    headBoundPhraseFactoryVerified: true,
    authorizationFingerprintVerified: true,
    singleUseConsumptionVerified: true,
    secondConsumptionRejected: true,
    reuseAfterFailureRejected: true,
    triggerSingleFileDeltaVerified: true,
    triggerParentContinuityVerified: true,
    runAttemptOneVerified: true,
    triggerAbsent: true,
    remoteExecutionAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  })}\n`);
}

run();
