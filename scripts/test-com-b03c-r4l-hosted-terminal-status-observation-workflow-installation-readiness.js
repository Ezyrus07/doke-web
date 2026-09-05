#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const r4iConfig = require('../config/com-b03c-r4i-r4h-terminal-observation-authorization-consumption.json');
const config = require('../config/com-b03c-r4l-hosted-terminal-status-observation-workflow-installation-readiness.json');
const r4l = require('../backend/modules/communities/community-realtime-private-auth-r4l');
const r4j = require('../backend/modules/communities/community-realtime-private-auth-r4j');
const executor = require('./execute-com-b03c-r4l-single-use-hosted-terminal-status-observation');
const verifier = require('./verify-com-b03c-r4l-single-use-hosted-terminal-status-observation-report');

function main() {
  assert.equal(config.contractId, r4l.CONTRACT_ID);
  assert.equal(config.validationId, r4l.VALIDATION_ID);
  assert.equal(config.status, r4l.STATUS);
  assert.equal(fs.existsSync(r4l.FUTURE_TRIGGER_PATH), false);

  const readiness = r4l.evaluateRepositoryReadiness(config.readinessInput);
  assert.equal(readiness.decision, r4l.STATUS);
  assert.equal(readiness.hostedWorkflowInstalled, true);
  assert.equal(readiness.workflowCertificationReady, true);
  assert.equal(readiness.certifyAvailableNow, true);
  assert.equal(readiness.authorizeAvailableNow, false);
  assert.equal(readiness.canaryAvailableNow, false);
  assert.equal(readiness.authorizationEvidenceHead, '66e8b1fefdbf7fa70be3093bdcad50880a5cdf70');
  assert.equal(readiness.authorizationReceiptId, '004a68f8916eb8f63b2e6812a9183924f2ceb8135b9e3864b77f280f11efab1f');
  assert.equal(readiness.futureWorkflowInstallHead, null);

  for (const key of [
    'triggerCreationAuthority', 'remoteExecutionAuthority', 'remoteCredentialReadAuthority',
    'remoteDependencyLoadAuthority', 'networkAuthority', 'stagingReadAuthority',
    'stagingMutationAuthority', 'realtimeSubscriptionAuthority', 'authIdentityLifecycleAuthority',
    'runtimeChangeAuthority', 'productionAuthority', 'pullRequestMergeAuthority'
  ]) assert.equal(readiness[key], false, key);

  let blockedCode = null;
  try { r4l.assertRemoteExecutionBoundaryAbsent(); } catch (error) { blockedCode = error.code; }
  assert.equal(blockedCode, r4l.REMOTE_EXECUTION_BLOCK_CODE);

  const workflowInstallHead = 'dddddddddddddddddddddddddddddddddddddddd';
  const trigger = r4l.buildFutureTriggerDescriptor({
    workflowInstallHead,
    nonce: 'r4l_repository_future_trigger',
    hostedWorkflowCertified: true
  });
  const validated = r4l.validateFutureTriggerCommit({
    trigger,
    parentHead: workflowInstallHead,
    changedFiles: [r4l.FUTURE_TRIGGER_PATH],
    runAttempt: 1,
    hostedWorkflowCertified: true,
    authorizationReceipt: r4iConfig.receipt
  });
  assert.equal(validated.decision, 'r4l_future_trigger_valid_authority_available_for_this_attempt');
  assert.equal(validated.authorizationEvidenceHead, '66e8b1fefdbf7fa70be3093bdcad50880a5cdf70');
  assert.equal(validated.workflowInstallHead, workflowInstallHead);
  assert.notEqual(validated.workflowInstallHead, validated.authorizationEvidenceHead);
  assert.equal(validated.remoteExecutionAuthority, true);
  assert.equal(validated.runtimeChangeAuthority, false);
  assert.equal(validated.productionAuthority, false);
  assert.equal(validated.pullRequestMergeAuthority, false);

  const wrongParent = r4l.validateFutureTriggerCommit({
    trigger,
    parentHead: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    changedFiles: [r4l.FUTURE_TRIGGER_PATH],
    runAttempt: 1,
    hostedWorkflowCertified: true,
    authorizationReceipt: r4iConfig.receipt
  });
  assert.equal(wrongParent.decision, 'blocked_repository_only');

  const wrongDiff = r4l.validateFutureTriggerCommit({
    trigger,
    parentHead: workflowInstallHead,
    changedFiles: [r4l.FUTURE_TRIGGER_PATH, 'unexpected.txt'],
    runAttempt: 1,
    hostedWorkflowCertified: true,
    authorizationReceipt: r4iConfig.receipt
  });
  assert.equal(wrongDiff.decision, 'blocked_repository_only');

  const wrongAttempt = r4l.validateFutureTriggerCommit({
    trigger,
    parentHead: workflowInstallHead,
    changedFiles: [r4l.FUTURE_TRIGGER_PATH],
    runAttempt: 2,
    hostedWorkflowCertified: true,
    authorizationReceipt: r4iConfig.receipt
  });
  assert.equal(wrongAttempt.decision, 'blocked_repository_only');

  const terminalObservation = r4j.buildSanitizedTerminalObservation({
    terminalStatus: 'CHANNEL_ERROR',
    subscribed: false,
    sanitizedJoinClassification: 'realtime_rls_authorization_rejected',
    broadcastDelta: 1,
    presenceDelta: 1
  });
  const reportVerification = verifier.verifyReport({
    ...executor.baseReport({ trigger }),
    identityCreated: false,
    identityCleanupAttempted: false,
    identityCleanupSucceeded: false,
    instrumentationInstalled: true,
    cleanupAttempted: true,
    cleanupFailure: null,
    residueCounts: { policyCount: 0, functionCount: 0, sequenceCount: 0 },
    zeroResidueProven: true,
    baselinePolicySnapshotComplete: true,
    baselineRestored: true,
    terminalStatus: 'CHANNEL_ERROR',
    joinSubscribed: false,
    sanitizedJoinClassification: 'realtime_rls_authorization_rejected',
    observation: terminalObservation,
    executionFailure: null,
    hostedTerminalObservationExecuted: true
  });
  assert.equal(reportVerification.validationId, 'COM-B03C-R4L-SANITIZED-REPORT-VERIFICATION');
  assert.equal(reportVerification.rawRemoteErrorExposed, false);

  process.stdout.write(`${JSON.stringify({
    validationId: r4l.VALIDATION_ID,
    status: r4l.STATUS,
    hostedWorkflowInstalled: true,
    certifyAvailableNow: true,
    authorizeAvailableNow: false,
    canaryAvailableNow: false,
    triggerCreated: false,
    authorizationEvidenceHead: r4l.AUTHORIZATION_EVIDENCE_HEAD,
    authorizationReceiptId: r4l.AUTHORIZATION_RECEIPT_ID,
    futureWorkflowInstallHeadMaterialized: false,
    stagingAccess: false,
    secretsRead: false,
    networkAccess: false,
    productionChanged: false,
    mergeExecuted: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  })}\n`);
}

main();
