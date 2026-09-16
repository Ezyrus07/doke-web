#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const r4a = require('../backend/modules/communities/community-realtime-private-auth-r4a');
const r3z = require('../backend/modules/communities/community-realtime-private-auth-r3z');
const config = require('../config/com-b03c-r4a-head-bound-single-use-phase-attributed-retry-authorization-lifecycle-readiness.json');
const predecessorEvidence = require('../docs/validation/COM-B03C-R3Z-PREINSTALL-PHASE-ATTRIBUTION-READINESS.json');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function assert(condition, code) {
  if (!condition) fail(code);
}

function assertBlocked(result, reason) {
  assert(result?.decision === 'blocked_repository_only', `R4A_EXPECTED_BLOCK_${reason}`);
  assert(result?.reason === reason, `R4A_BLOCK_REASON_MISMATCH_${reason}`);
  assert(result?.remoteExecutionAuthority === false, `R4A_BLOCK_REMOTE_AUTHORITY_${reason}`);
}

function readinessInput() {
  return {
    predecessorValidationId: config.predecessorValidationId,
    predecessorStatus: config.predecessorStatus,
    predecessorHead: config.predecessorHead,
    predecessorRecertRun: config.predecessorRecertRun,
    predecessorRecertJob: config.predecessorRecertJob,
    predecessorRecertSuccess: config.predecessorRecertSuccess,
    predecessorNormalHead: config.predecessorNormalHead,
    predecessorMatrixRun: config.predecessorMatrixRun,
    predecessorMatrixJob: config.predecessorMatrixJob,
    predecessorMatrixSuccess: config.predecessorMatrixSuccess,
    predecessorEvidenceHeadMatrixAuditPassed: config.predecessorEvidenceHeadMatrixAuditPassed,
    matrixVersion: config.matrixVersion,
    maturity: config.maturity,
    productionGate: config.productionGate,
    r3zContractId: config.r3zContractId,
    phaseSemanticsFingerprint: config.phaseSemanticsFingerprint,
    futureTriggerPath: config.futureTriggerPath,
    triggerContractId: config.triggerContractId,
    lifecycleStates: config.lifecycleStates,
    requiredTriggerKeys: config.requiredTriggerKeys,
    ...config.controls,
    ...config.prohibitedPreparation
  };
}

function run() {
  assert(predecessorEvidence.status === config.predecessorStatus, 'R4A_R3Z_EVIDENCE_STATUS_MISMATCH');
  assert(predecessorEvidence.contractId === r3z.CONTRACT_ID, 'R4A_R3Z_EVIDENCE_CONTRACT_MISMATCH');
  assert(config.predecessorHead === r4a.PREDECESSOR_HEAD, 'R4A_R3Z_EVIDENCE_HEAD_MISMATCH');
  assert(r3z.PREINSTALL_PHASES.length === 3, 'R4A_EXACT_THREE_PHASES_REQUIRED');
  assert(r4a.PHASE_SEMANTICS_FINGERPRINT === r4a.buildPhaseSemanticsFingerprint(), 'R4A_PHASE_FINGERPRINT_SELF_MISMATCH');
  assert(config.phaseSemanticsFingerprint === r4a.PHASE_SEMANTICS_FINGERPRINT, 'R4A_PHASE_FINGERPRINT_CONFIG_MISMATCH');
  assert(!fs.existsSync(path.resolve(__dirname, '..', r4a.FUTURE_TRIGGER_PATH)), 'R4A_TRIGGER_MUST_BE_ABSENT');

  const readiness = r4a.evaluateRepositoryReadiness(readinessInput());
  assert(readiness.decision === 'repository_head_bound_single_use_phase_attributed_retry_authorization_lifecycle_ready_authorization_absent', 'R4A_READINESS_DECISION_INVALID');
  assert(readiness.repositoryAuthorizationLifecycleAuthority === true, 'R4A_REPOSITORY_AUTHORITY_REQUIRED');
  assert(readiness.explicitAuthorizationReceived === false, 'R4A_AUTHORIZATION_MUST_BE_ABSENT');
  assert(readiness.triggerCreationAuthority === false, 'R4A_TRIGGER_AUTHORITY_MUST_BE_FALSE');
  assert(readiness.remoteExecutionAuthority === false, 'R4A_REMOTE_AUTHORITY_MUST_BE_FALSE');
  assert(readiness.concreteAuthorizationPhrasePersisted === false, 'R4A_CONCRETE_PHRASE_MUST_NOT_BE_PERSISTED');

  const lifecycleHead = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const workflowInstallHead = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const authorizationInput = {
    certifiedLifecycleHead: lifecycleHead,
    authorizationPhrase: r4a.buildAuthorizationPhrase(lifecycleHead),
    authorizationConsumed: false,
    triggerCreated: false,
    previousR3yAuthorizationReusable: false,
    targetEnvironment: 'staging',
    projectId: r4a.REQUIRED_PROJECT_ID,
    branch: r4a.REQUIRED_BRANCH,
    pullRequest: r4a.REQUIRED_PULL_REQUEST
  };

  assert(/^[0-9a-f]{64}$/.test(r4a.authorizationPhraseFingerprint(lifecycleHead)), 'R4A_PHRASE_FINGERPRINT_INVALID');
  const received = r4a.evaluateExplicitAuthorization(authorizationInput);
  assert(received.decision === 'head_bound_single_use_phase_attributed_retry_authorization_received_trigger_creation_only', 'R4A_AUTH_RECEIPT_INVALID');
  assert(received.phaseSemanticsFingerprint === r4a.PHASE_SEMANTICS_FINGERPRINT, 'R4A_RECEIPT_PHASE_BINDING_REQUIRED');
  assert(received.remoteExecutionAuthority === false, 'R4A_AUTH_MUST_NOT_ENABLE_REMOTE_EXECUTION');

  const consumed = r4a.consumeAuthorizationForTrigger(received);
  assert(consumed.authorizationConsumed === true, 'R4A_AUTH_CONSUMPTION_REQUIRED');
  assert(consumed.reusableAfterFailure === false, 'R4A_REUSE_AFTER_FAILURE_PROHIBITED');
  assert(consumed.remoteExecutionAuthority === false, 'R4A_CONSUMPTION_MUST_NOT_ENABLE_REMOTE_EXECUTION');

  assertBlocked(r4a.consumeAuthorizationForTrigger(consumed), 'R4A_VALID_UNCONSUMED_PHASE_BOUND_RECEIPT_REQUIRED');
  assertBlocked(r4a.evaluateExplicitAuthorization({ ...authorizationInput, authorizationConsumed: true }), 'R4A_FRESH_NON_REUSED_AUTHORIZATION_REQUIRED');
  assertBlocked(r4a.evaluateExplicitAuthorization({ ...authorizationInput, previousR3yAuthorizationReusable: true }), 'R4A_FRESH_NON_REUSED_AUTHORIZATION_REQUIRED');
  assertBlocked(r4a.evaluateExplicitAuthorization({ ...authorizationInput, authorizationPhrase: 'wrong' }), 'R4A_EXACT_HEAD_BOUND_AUTHORIZATION_PHRASE_REQUIRED');
  assertBlocked(r4a.evaluateExplicitAuthorization({ ...authorizationInput, branch: 'wrong-branch' }), 'R4A_EXACT_AUTHORIZATION_SCOPE_REQUIRED');

  const trigger = r4a.buildFutureTriggerDescriptor({
    workflowInstallHead,
    authorizationEvidenceHead: lifecycleHead,
    authorizationReceiptId: consumed.authorizationReceiptId
  });
  const validTrigger = r4a.validateFutureTriggerCommit({
    trigger,
    runAttempt: 1,
    parentHead: workflowInstallHead,
    changedFiles: [r4a.FUTURE_TRIGGER_PATH],
    authorizationReceipt: consumed
  });
  assert(validTrigger.decision === 'future_phase_attributed_retry_trigger_shape_valid_remote_execution_still_separately_blocked', 'R4A_TRIGGER_VALIDATION_INVALID');
  assert(validTrigger.remoteExecutionAuthority === false, 'R4A_TRIGGER_MUST_NOT_ENABLE_REMOTE_EXECUTION');

  assertBlocked(r4a.validateFutureTriggerCommit({ trigger, runAttempt: 2, parentHead: workflowInstallHead, changedFiles: [r4a.FUTURE_TRIGGER_PATH], authorizationReceipt: consumed }), 'R4A_RUN_ATTEMPT_ONE_REQUIRED');
  assertBlocked(r4a.validateFutureTriggerCommit({ trigger, runAttempt: 1, parentHead: lifecycleHead, changedFiles: [r4a.FUTURE_TRIGGER_PATH], authorizationReceipt: consumed }), 'R4A_TRIGGER_PARENT_CONTINUITY_REQUIRED');
  assertBlocked(r4a.validateFutureTriggerCommit({ trigger, runAttempt: 1, parentHead: workflowInstallHead, changedFiles: [r4a.FUTURE_TRIGGER_PATH, 'extra.txt'], authorizationReceipt: consumed }), 'R4A_TRIGGER_SINGLE_FILE_DELTA_REQUIRED');
  assertBlocked(r4a.validateFutureTriggerCommit({ trigger: { ...trigger, phaseSemanticsFingerprint: '0'.repeat(64) }, runAttempt: 1, parentHead: workflowInstallHead, changedFiles: [r4a.FUTURE_TRIGGER_PATH], authorizationReceipt: consumed }), 'R4A_R3Z_PHASE_SEMANTICS_BINDING_REQUIRED');
  assertBlocked(r4a.validateFutureTriggerCommit({ trigger, runAttempt: 1, parentHead: workflowInstallHead, changedFiles: [r4a.FUTURE_TRIGGER_PATH], authorizationReceipt: received }), 'R4A_CONSUMED_PHASE_BOUND_RECEIPT_CONTINUITY_REQUIRED');

  let hardBlock = false;
  try { r4a.assertRemoteExecutionBoundaryAbsent(); }
  catch (error) { hardBlock = error?.code === r4a.REMOTE_EXECUTION_BLOCK_CODE; }
  assert(hardBlock, 'R4A_REMOTE_HARD_BLOCK_REQUIRED');

  const badReadiness = readinessInput();
  badReadiness.workflowPushTriggerAbsent = false;
  const blockedReadiness = r4a.evaluateRepositoryReadiness(badReadiness);
  assert(blockedReadiness.reason === 'R4A_LIFECYCLE_CONTROL_REQUIRED', 'R4A_READINESS_BLOCK_REASON_INVALID');
  assert(blockedReadiness.flag === 'workflowPushTriggerAbsent', 'R4A_READINESS_BLOCK_FLAG_INVALID');

  process.stdout.write(`${JSON.stringify({
    validationId: r4a.VALIDATION_ID,
    contractId: r4a.CONTRACT_ID,
    decision: readiness.decision,
    predecessorEvidenceHead: r4a.PREDECESSOR_HEAD,
    phaseCount: r3z.PREINSTALL_PHASES.length,
    phaseSemanticsFingerprint: r4a.PHASE_SEMANTICS_FINGERPRINT,
    lifecycleStateCount: r4a.LIFECYCLE_STATES.length,
    headBoundPhraseFactoryVerified: true,
    receiptPhaseBindingVerified: true,
    singleUseConsumptionVerified: true,
    previousR3yAuthorizationReuseRejected: true,
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
