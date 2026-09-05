#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const r4b = require('../backend/modules/communities/community-realtime-private-auth-r4b');
const r4a = require('../backend/modules/communities/community-realtime-private-auth-r4a');
const r3z = require('../backend/modules/communities/community-realtime-private-auth-r3z');
const config = require('../config/com-b03c-r4b-phase-attributed-retry-execution-authorization-lifecycle-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R4B-PHASE-ATTRIBUTED-RETRY-EXECUTION-AUTHORIZATION-LIFECYCLE-READINESS.json');

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function assert(condition, code) { if (!condition) fail(code); }
function assertBlocked(result, reason) {
  assert(result?.decision === 'blocked_repository_only', `R4B_EXPECTED_BLOCK_${reason}`);
  assert(result?.reason === reason, `R4B_BLOCK_REASON_${reason}`);
  assert(result?.remoteExecutionAuthority === false, `R4B_BLOCK_REMOTE_${reason}`);
}

function run() {
  assert(config.contractId === r4b.CONTRACT_ID, 'R4B_CONFIG_CONTRACT_MISMATCH');
  assert(evidence.contractId === r4b.CONTRACT_ID, 'R4B_EVIDENCE_CONTRACT_MISMATCH');
  assert(config.r4a.evidenceHead === r4b.R4A_EVIDENCE_HEAD, 'R4B_R4A_HEAD_MISMATCH');
  assert(config.r4a.triggerCommit === r4b.R4A_TRIGGER_COMMIT, 'R4B_R4A_TRIGGER_COMMIT_MISMATCH');
  assert(config.r4a.authorizationReceiptId === r4b.R4A_AUTHORIZATION_RECEIPT_ID, 'R4B_R4A_RECEIPT_MISMATCH');
  assert(config.phaseAttribution.phaseSemanticsFingerprint === r4b.R3Z_PHASE_SEMANTICS_FINGERPRINT, 'R4B_PHASE_FINGERPRINT_MISMATCH');
  assert(r4b.R3Z_PHASE_SEMANTICS_FINGERPRINT === r4a.PHASE_SEMANTICS_FINGERPRINT, 'R4B_R4A_R3Z_PHASE_BINDING_MISMATCH');
  assert(config.phaseAttribution.r3zContractId === r3z.CONTRACT_ID, 'R4B_R3Z_CONTRACT_MISMATCH');

  const repoRoot = path.resolve(__dirname, '..');
  const r4aTriggerPath = path.resolve(repoRoot, r4a.FUTURE_TRIGGER_PATH);
  assert(fs.existsSync(r4aTriggerPath), 'R4B_R4A_CONSUMED_TRIGGER_REQUIRED');
  const r4aTrigger = JSON.parse(fs.readFileSync(r4aTriggerPath, 'utf8'));
  const r4aContinuity = r4b.assertConsumedR4ATrigger(r4aTrigger);
  assert(r4aContinuity.decision === 'r4a_consumed_trigger_continuity_verified', 'R4B_R4A_TRIGGER_CONTINUITY_INVALID');
  assert(r4aContinuity.remoteExecutionAuthority === false, 'R4B_R4A_TRIGGER_MUST_NOT_AUTHORIZE_REMOTE');

  assert(!fs.existsSync(path.resolve(repoRoot, r4b.FUTURE_TRIGGER_PATH)), 'R4B_EXECUTION_TRIGGER_MUST_BE_ABSENT');

  const readiness = r4b.evaluateRepositoryReadiness({ ...config.controls, ...config.prohibitedEffects });
  assert(readiness.decision === 'repository_phase_attributed_retry_execution_authorization_lifecycle_ready_authorization_absent', 'R4B_READINESS_INVALID');
  assert(readiness.repositoryExecutionAuthorizationLifecycleAuthority === true, 'R4B_REPOSITORY_AUTHORITY_REQUIRED');
  assert(readiness.explicitExecutionAuthorizationReceived === false, 'R4B_EXECUTION_AUTH_MUST_BE_ABSENT');
  assert(readiness.remoteExecutionAuthority === false, 'R4B_REMOTE_AUTH_MUST_BE_FALSE');
  assert(readiness.concreteAuthorizationPhrasePersisted === false, 'R4B_AUTH_PLAINTEXT_MUST_NOT_BE_PERSISTED');

  const sampleHead = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const phrase = r4b.buildAuthorizationPhrase(sampleHead);
  assert(phrase === `${r4b.AUTHORIZATION_PREFIX}${sampleHead}`, 'R4B_HEAD_BOUND_PHRASE_INVALID');
  assert(/^[0-9a-f]{64}$/.test(r4b.authorizationPhraseFingerprint(sampleHead)), 'R4B_AUTH_FINGERPRINT_INVALID');

  const input = {
    certifiedLifecycleHead: sampleHead,
    authorizationPhrase: phrase,
    authorizationConsumed: false,
    executionAttempted: false,
    targetEnvironment: 'staging',
    projectId: r4b.REQUIRED_PROJECT_ID,
    branch: r4b.REQUIRED_BRANCH,
    pullRequest: r4b.REQUIRED_PULL_REQUEST
  };
  const received = r4b.evaluateExplicitExecutionAuthorization(input);
  assert(received.decision === 'fresh_head_bound_execution_authorization_received_trigger_creation_only', 'R4B_EXECUTION_AUTH_RECEIPT_INVALID');
  assert(received.authorizationConsumed === false, 'R4B_EXECUTION_AUTH_PRECONSUMED');
  assert(received.remoteExecutionAuthority === false, 'R4B_RECEIPT_MUST_NOT_AUTHORIZE_REMOTE');
  assert(received.r4aAuthorizationReceiptId === r4b.R4A_AUTHORIZATION_RECEIPT_ID, 'R4B_RECEIPT_R4A_BINDING_INVALID');
  assert(received.phaseSemanticsFingerprint === r4b.R3Z_PHASE_SEMANTICS_FINGERPRINT, 'R4B_RECEIPT_PHASE_BINDING_INVALID');

  const consumed = r4b.consumeExecutionAuthorizationForTrigger(received);
  assert(consumed.authorizationConsumed === true, 'R4B_EXECUTION_AUTH_CONSUMPTION_REQUIRED');
  assert(consumed.reusableAfterFailure === false, 'R4B_EXECUTION_AUTH_REUSE_PROHIBITED');
  assert(consumed.remoteExecutionAuthority === false, 'R4B_CONSUMPTION_MUST_NOT_AUTHORIZE_REMOTE');

  assertBlocked(r4b.consumeExecutionAuthorizationForTrigger(consumed), 'R4B_VALID_FRESH_UNCONSUMED_EXECUTION_AUTHORIZATION_RECEIPT_REQUIRED');
  assertBlocked(r4b.evaluateExplicitExecutionAuthorization({ ...input, authorizationConsumed: true }), 'R4B_EXECUTION_AUTHORIZATION_ALREADY_CONSUMED_OR_ATTEMPTED');
  assertBlocked(r4b.evaluateExplicitExecutionAuthorization({ ...input, authorizationPhrase: 'wrong' }), 'R4B_EXACT_HEAD_BOUND_EXECUTION_AUTHORIZATION_PHRASE_REQUIRED');
  assertBlocked(r4b.evaluateExplicitExecutionAuthorization({ ...input, branch: 'wrong' }), 'R4B_EXACT_EXECUTION_AUTHORIZATION_SCOPE_REQUIRED');

  const trigger = r4b.buildFutureExecutionTriggerDescriptor({
    certifiedLifecycleHead: sampleHead,
    authorizationReceiptId: consumed.authorizationReceiptId
  });
  assert(trigger.r4aTriggerCommit === r4b.R4A_TRIGGER_COMMIT, 'R4B_TRIGGER_R4A_COMMIT_BINDING_INVALID');
  assert(trigger.r4aAuthorizationReceiptId === r4b.R4A_AUTHORIZATION_RECEIPT_ID, 'R4B_TRIGGER_R4A_RECEIPT_BINDING_INVALID');
  assert(trigger.phaseSemanticsFingerprint === r4b.R3Z_PHASE_SEMANTICS_FINGERPRINT, 'R4B_TRIGGER_PHASE_BINDING_INVALID');
  assert(trigger.statementCount === 21, 'R4B_TRIGGER_STATEMENT_COUNT_INVALID');

  const valid = r4b.validateFutureExecutionTriggerCommit({
    trigger,
    parentHead: sampleHead,
    changedFiles: [r4b.FUTURE_TRIGGER_PATH],
    runAttempt: 1,
    authorizationReceipt: consumed
  });
  assert(valid.decision === 'phase_attributed_execution_trigger_valid_authority_available_for_this_attempt', 'R4B_TRIGGER_VALIDATION_INVALID');
  assert(valid.remoteExecutionAuthority === true, 'R4B_VALID_TRIGGER_REMOTE_AUTHORITY_REQUIRED');
  assert(valid.runtimeChangeAuthority === false, 'R4B_RUNTIME_CHANGE_MUST_REMAIN_FALSE');

  const authorized = r4b.authorizeExecution({
    trigger,
    parentHead: sampleHead,
    changedFiles: [r4b.FUTURE_TRIGGER_PATH],
    runAttempt: 1,
    authorizationReceipt: consumed
  });
  assert(authorized.decision === r4b.AUTHORIZED_DECISION, 'R4B_AUTHORIZED_DECISION_INVALID');
  assert(authorized.executionAttempted === true, 'R4B_EXECUTION_ATTEMPT_TRANSITION_REQUIRED');

  assertBlocked(r4b.validateFutureExecutionTriggerCommit({ trigger, parentHead: sampleHead, changedFiles: [r4b.FUTURE_TRIGGER_PATH], runAttempt: 2, authorizationReceipt: consumed }), 'R4B_RUN_ATTEMPT_ONE_REQUIRED');
  assertBlocked(r4b.validateFutureExecutionTriggerCommit({ trigger, parentHead: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', changedFiles: [r4b.FUTURE_TRIGGER_PATH], runAttempt: 1, authorizationReceipt: consumed }), 'R4B_EXECUTION_TRIGGER_PARENT_AND_AUTHORIZATION_HEAD_CONTINUITY_REQUIRED');
  assertBlocked(r4b.validateFutureExecutionTriggerCommit({ trigger, parentHead: sampleHead, changedFiles: [r4b.FUTURE_TRIGGER_PATH, 'extra.txt'], runAttempt: 1, authorizationReceipt: consumed }), 'R4B_EXECUTION_TRIGGER_SINGLE_FILE_DELTA_REQUIRED');

  const badPhaseTrigger = { ...trigger, phaseSemanticsFingerprint: '0'.repeat(64) };
  assertBlocked(r4b.validateFutureExecutionTriggerCommit({ trigger: badPhaseTrigger, parentHead: sampleHead, changedFiles: [r4b.FUTURE_TRIGGER_PATH], runAttempt: 1, authorizationReceipt: consumed }), 'R4B_PHASE_ATTRIBUTED_EXECUTION_BINDING_REQUIRED');

  let hardBlock = false;
  try { r4b.assertRemoteExecutionBoundaryAbsent(); }
  catch (error) { hardBlock = error?.code === r4b.REMOTE_EXECUTION_BLOCK_CODE; }
  assert(hardBlock, 'R4B_REMOTE_HARD_BLOCK_REQUIRED');

  const badReadiness = { ...config.controls, ...config.prohibitedEffects, executionTriggerExists: true };
  assertBlocked(r4b.evaluateRepositoryReadiness(badReadiness), 'R4B_REMOTE_SCOPE_PROHIBITED');

  process.stdout.write(`${JSON.stringify({
    validationId: r4b.VALIDATION_ID,
    contractId: r4b.CONTRACT_ID,
    decision: readiness.decision,
    r4aConsumedTriggerVerified: true,
    r4aAuthorizationReusable: false,
    phaseSemanticsFingerprintVerified: true,
    freshExecutionAuthorizationLifecycleVerified: true,
    singleUseConsumptionVerified: true,
    executionTriggerSingleFileDeltaVerified: true,
    executionTriggerParentContinuityVerified: true,
    runAttemptOneVerified: true,
    remoteExecutionAuthority: false,
    executionTriggerAbsent: true,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  })}\n`);
}

run();
