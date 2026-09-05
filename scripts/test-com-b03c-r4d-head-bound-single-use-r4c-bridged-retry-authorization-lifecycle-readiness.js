#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const r4d = require('../backend/modules/communities/community-realtime-private-auth-r4d');
const r4c = require('../backend/modules/communities/community-realtime-private-auth-r4c');
const config = require('../config/com-b03c-r4d-head-bound-single-use-r4c-bridged-retry-authorization-lifecycle-readiness.json');
const predecessorEvidence = require('../docs/validation/COM-B03C-R4C-PG-INT8-COUNTER-CODEC-COMPATIBILITY-READINESS.json');

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function assert(value, code) { if (!value) fail(code); }

function buildReadinessInput() {
  return {
    predecessorValidationId: config.predecessor.validationId,
    predecessorStatus: config.predecessor.status,
    predecessorHead: config.predecessor.head,
    predecessorRecertRun: config.predecessor.recertRun,
    predecessorRecertJob: config.predecessor.recertJob,
    predecessorRecertSuccess: config.predecessor.recertSuccess,
    predecessorMatrixRun: config.predecessor.matrixRun,
    predecessorMatrixJob: config.predecessor.matrixJob,
    predecessorMatrixSuccess: config.predecessor.matrixSuccess,
    matrixVersion: config.matrixVersion,
    maturity: config.maturity,
    productionGate: config.productionGate,
    r4cContractId: config.r4cContractId,
    codecSemanticsFingerprint: config.codecSemanticsFingerprint,
    futureTriggerPath: config.futureTriggerPath,
    triggerContractId: config.triggerContractId,
    lifecycleStates: config.lifecycleStates,
    requiredTriggerKeys: config.requiredTriggerKeys,
    ...config.controls,
    ...config.prohibitedEffects
  };
}

function assertBlocked(value, reason) {
  assert(value?.decision === 'blocked_repository_only', `R4D_EXPECTED_BLOCK_${reason}`);
  assert(value?.reason === reason, `R4D_BLOCK_REASON_${reason}`);
  assert(value?.remoteExecutionAuthority === false, 'R4D_BLOCK_REMOTE_AUTHORITY_FALSE_REQUIRED');
}

function run() {
  assert(config.contractId === r4d.CONTRACT_ID, 'R4D_CONFIG_CONTRACT_MISMATCH');
  assert(config.validationId === r4d.VALIDATION_ID, 'R4D_CONFIG_VALIDATION_MISMATCH');
  assert(config.status === r4d.STATUS, 'R4D_CONFIG_STATUS_MISMATCH');
  assert(config.predecessor.head === r4d.PREDECESSOR_HEAD, 'R4D_PREDECESSOR_HEAD_MISMATCH');
  assert(predecessorEvidence.status === r4c.STATUS, 'R4D_R4C_EVIDENCE_STATUS_REQUIRED');
  assert(predecessorEvidence.finding.codecBridgePrepared === true, 'R4D_R4C_CODEC_BRIDGE_REQUIRED');
  assert(predecessorEvidence.finding.historicalR3vModified === false, 'R4D_R4C_R3V_UNCHANGED_REQUIRED');
  assert(predecessorEvidence.finding.historicalR3sModified === false, 'R4D_R4C_R3S_UNCHANGED_REQUIRED');
  assert(predecessorEvidence.r4bStagingEvidence.authorizationReusable === false, 'R4D_R4B_AUTH_NON_REUSABLE_REQUIRED');
  assert(predecessorEvidence.finding.exactRootCauseProven !== true, 'R4D_NO_ROOT_CAUSE_PROMOTION_REQUIRED');

  assert(
    r4d.buildCodecSemanticsFingerprint() === r4d.CODEC_SEMANTICS_FINGERPRINT &&
      r4d.CODEC_SEMANTICS_FINGERPRINT === config.codecSemanticsFingerprint,
    'R4D_CODEC_SEMANTICS_FINGERPRINT_MISMATCH'
  );

  const repoRoot = path.resolve(__dirname, '..');
  assert(
    !fs.existsSync(path.resolve(repoRoot, r4d.FUTURE_TRIGGER_PATH)),
    'R4D_FUTURE_TRIGGER_MUST_BE_ABSENT'
  );

  const readiness = r4d.evaluateRepositoryReadiness(buildReadinessInput());
  assert(
    readiness.decision ===
      'repository_head_bound_single_use_r4c_bridged_retry_authorization_lifecycle_ready_authorization_absent',
    'R4D_REPOSITORY_READINESS_INVALID'
  );
  assert(readiness.repositoryAuthorizationLifecycleAuthority === true, 'R4D_REPOSITORY_LIFECYCLE_AUTHORITY_REQUIRED');
  assert(readiness.explicitAuthorizationReceived === false, 'R4D_PREAUTH_RECEIVED_MUST_BE_FALSE');
  assert(readiness.remoteExecutionAuthority === false, 'R4D_PREAUTH_REMOTE_MUST_BE_FALSE');

  const sampleHead = '1111111111111111111111111111111111111111';
  const phrase = r4d.buildAuthorizationPhrase(sampleHead);
  assert(phrase.startsWith(r4d.AUTHORIZATION_PREFIX), 'R4D_AUTH_PREFIX_REQUIRED');
  assert(!phrase.includes(r4d.PREDECESSOR_HEAD), 'R4D_AUTH_PHRASE_MUST_BIND_SAMPLE_HEAD_ONLY');
  assert(/^[0-9a-f]{64}$/.test(r4d.authorizationPhraseFingerprint(sampleHead)), 'R4D_AUTH_FINGERPRINT_REQUIRED');

  const received = r4d.evaluateExplicitAuthorization({
    certifiedLifecycleHead: sampleHead,
    authorizationPhrase: phrase,
    authorizationConsumed: false,
    triggerCreated: false,
    previousR4bAuthorizationReusable: false,
    targetEnvironment: 'staging',
    projectId: r4d.REQUIRED_PROJECT_ID,
    branch: r4d.REQUIRED_BRANCH,
    pullRequest: r4d.REQUIRED_PULL_REQUEST
  });
  assert(
    received.decision ===
      'head_bound_single_use_r4c_bridged_retry_authorization_received_trigger_creation_only',
    'R4D_AUTH_RECEIPT_INVALID'
  );
  assert(received.triggerCreationAuthority === true, 'R4D_TRIGGER_CREATION_AUTHORITY_REQUIRED');
  assert(received.remoteExecutionAuthority === false, 'R4D_RECEIPT_REMOTE_MUST_BE_FALSE');

  const consumed = r4d.consumeAuthorizationForTrigger(received);
  assert(consumed.authorizationConsumed === true, 'R4D_AUTH_CONSUMPTION_REQUIRED');
  assert(consumed.remoteExecutionAuthority === false, 'R4D_CONSUMED_REMOTE_MUST_BE_FALSE');
  assertBlocked(
    r4d.consumeAuthorizationForTrigger(consumed),
    'R4D_VALID_UNCONSUMED_CODEC_BOUND_RECEIPT_REQUIRED'
  );

  assertBlocked(r4d.evaluateExplicitAuthorization({
    certifiedLifecycleHead: sampleHead,
    authorizationPhrase: `${phrase}x`,
    authorizationConsumed: false,
    triggerCreated: false,
    previousR4bAuthorizationReusable: false,
    targetEnvironment: 'staging',
    projectId: r4d.REQUIRED_PROJECT_ID,
    branch: r4d.REQUIRED_BRANCH,
    pullRequest: r4d.REQUIRED_PULL_REQUEST
  }), 'R4D_EXACT_HEAD_BOUND_AUTHORIZATION_PHRASE_REQUIRED');

  assertBlocked(r4d.evaluateExplicitAuthorization({
    certifiedLifecycleHead: sampleHead,
    authorizationPhrase: phrase,
    authorizationConsumed: false,
    triggerCreated: false,
    previousR4bAuthorizationReusable: true,
    targetEnvironment: 'staging',
    projectId: r4d.REQUIRED_PROJECT_ID,
    branch: r4d.REQUIRED_BRANCH,
    pullRequest: r4d.REQUIRED_PULL_REQUEST
  }), 'R4D_FRESH_NON_REUSED_AUTHORIZATION_REQUIRED');

  const trigger = r4d.buildFutureTriggerDescriptor({
    certifiedLifecycleHead: sampleHead,
    authorizationReceiptId: consumed.authorizationReceiptId
  });
  const valid = r4d.validateFutureTriggerCommit({
    trigger,
    parentHead: sampleHead,
    changedFiles: [r4d.FUTURE_TRIGGER_PATH],
    runAttempt: 1,
    authorizationReceipt: consumed
  });
  assert(
    valid.decision ===
      'future_r4c_bridged_retry_trigger_shape_valid_remote_execution_still_separately_blocked',
    'R4D_TRIGGER_VALIDATION_INVALID'
  );
  assert(valid.remoteExecutionAuthority === false, 'R4D_TRIGGER_REMOTE_AUTHORITY_MUST_BE_FALSE');

  assertBlocked(r4d.validateFutureTriggerCommit({
    trigger,
    parentHead: '2222222222222222222222222222222222222222',
    changedFiles: [r4d.FUTURE_TRIGGER_PATH],
    runAttempt: 1,
    authorizationReceipt: consumed
  }), 'R4D_TRIGGER_PARENT_AND_AUTHORIZATION_HEAD_CONTINUITY_REQUIRED');

  assertBlocked(r4d.validateFutureTriggerCommit({
    trigger,
    parentHead: sampleHead,
    changedFiles: [r4d.FUTURE_TRIGGER_PATH, 'extra.txt'],
    runAttempt: 1,
    authorizationReceipt: consumed
  }), 'R4D_TRIGGER_SINGLE_FILE_DELTA_REQUIRED');

  assertBlocked(r4d.validateFutureTriggerCommit({
    trigger,
    parentHead: sampleHead,
    changedFiles: [r4d.FUTURE_TRIGGER_PATH],
    runAttempt: 2,
    authorizationReceipt: consumed
  }), 'R4D_RUN_ATTEMPT_ONE_REQUIRED');

  let hardBlock = false;
  try { r4d.assertRemoteExecutionBoundaryAbsent(); }
  catch (error) { hardBlock = error?.code === r4d.REMOTE_EXECUTION_BLOCK_CODE; }
  assert(hardBlock, 'R4D_REMOTE_HARD_BLOCK_REQUIRED');

  const concretePrefixHits = [
    path.resolve(repoRoot, 'config/com-b03c-r4d-head-bound-single-use-r4c-bridged-retry-authorization-lifecycle-readiness.json'),
    path.resolve(repoRoot, 'docs/validation/COM-B03C-R4D-HEAD-BOUND-SINGLE-USE-R4C-BRIDGED-RETRY-AUTHORIZATION-LIFECYCLE-READINESS.json')
  ].filter((file) => fs.readFileSync(file, 'utf8').includes(`${r4d.AUTHORIZATION_PREFIX}111111`));
  assert(concretePrefixHits.length === 0, 'R4D_CONCRETE_AUTHORIZATION_PHRASE_PERSISTED');

  process.stdout.write(`${JSON.stringify({
    validationId: r4d.VALIDATION_ID,
    contractId: r4d.CONTRACT_ID,
    status: r4d.STATUS,
    predecessorR4cEvidenceHead: r4d.PREDECESSOR_HEAD,
    codecSemanticsFingerprint: r4d.CODEC_SEMANTICS_FINGERPRINT,
    headBoundAuthorizationFactoryVerified: true,
    authorizationReceiptSingleUseVerified: true,
    secondConsumptionRejected: true,
    previousR4bAuthorizationReuseRejected: true,
    triggerSingleFileContinuityVerified: true,
    remoteExecutionSeparatelyBlocked: true,
    stagingAccess: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  })}\n`);
}

try { run(); }
catch (error) {
  process.stderr.write(`${String(error?.code || error?.message || 'R4D_TEST_FAILURE')}\n`);
  process.exitCode = 1;
}
