#!/usr/bin/env node
'use strict';

const r4k = require('../backend/modules/communities/community-realtime-private-auth-r4k');
const config = require('../config/com-b03c-r4k-r4j-lineage-reconciliation-readiness.json');
const r4iConfig = require('../config/com-b03c-r4i-r4h-terminal-observation-authorization-consumption.json');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function assertFalseAuthority(result) {
  const keys = [
    'triggerCreationAuthority',
    'remoteExecutionAuthority',
    'remoteCredentialReadAuthority',
    'remoteDependencyLoadAuthority',
    'networkAuthority',
    'stagingReadAuthority',
    'stagingMutationAuthority',
    'realtimeSubscriptionAuthority',
    'authIdentityLifecycleAuthority',
    'runtimeChangeAuthority',
    'productionAuthority',
    'pullRequestMergeAuthority'
  ];
  for (const key of keys) {
    if (result[key] !== false) fail(`DOKE_COM_B03C_R4K_UNEXPECTED_AUTHORITY_${key}`);
  }
}

function main() {
  const readiness = r4k.evaluateRepositoryReadiness(config.readinessInput);
  if (readiness.decision !== r4k.STATUS || readiness.lineageReconciled !== true) {
    fail('DOKE_COM_B03C_R4K_READINESS_FAILED');
  }
  assertFalseAuthority(readiness);
  if (readiness.authorizationEvidenceHead !== r4k.PREDECESSOR_R4J_HEAD ||
      readiness.futureWorkflowInstallHead !== null ||
      readiness.futureWorkflowInstallHeadMaterialized !== false) {
    fail('DOKE_COM_B03C_R4K_HEAD_SEPARATION_NOT_PRESERVED');
  }

  const staleEvidence = r4k.evaluateRepositoryReadiness({
    ...config.readinessInput,
    authorizationEvidenceHead: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  });
  if (staleEvidence.reason !== 'R4K_AUTHORIZATION_LINEAGE_CONTINUITY_REQUIRED') {
    fail('DOKE_COM_B03C_R4K_STALE_AUTHORIZATION_EVIDENCE_NOT_REJECTED');
  }

  let sameHeadRejected = false;
  try {
    r4k.buildFutureExecutionLineage({
      workflowInstallHead: r4k.AUTHORIZATION_EVIDENCE_HEAD,
      hostedWorkflowCertified: true
    });
  } catch (error) {
    sameHeadRejected = error?.message === 'R4K_WORKFLOW_INSTALL_HEAD_MUST_DIFFER_FROM_AUTHORIZATION_EVIDENCE_HEAD';
  }
  if (!sameHeadRejected) fail('DOKE_COM_B03C_R4K_SAME_HEAD_LINEAGE_NOT_REJECTED');

  const futureWorkflowInstallHead = 'dddddddddddddddddddddddddddddddddddddddd';
  const lineage = r4k.buildFutureExecutionLineage({
    workflowInstallHead: futureWorkflowInstallHead,
    hostedWorkflowCertified: true
  });
  if (lineage.authorizationEvidenceHead !== r4k.AUTHORIZATION_EVIDENCE_HEAD ||
      lineage.workflowInstallHead !== futureWorkflowInstallHead ||
      lineage.requiredTriggerParentHead !== futureWorkflowInstallHead) {
    fail('DOKE_COM_B03C_R4K_FUTURE_LINEAGE_INVALID');
  }

  const trigger = r4k.buildFutureTriggerLineageDescriptor({
    workflowInstallHead: futureWorkflowInstallHead,
    hostedWorkflowCertified: true,
    nonce: 'r4k_repository_lineage_test'
  });
  const continuity = r4k.validateFutureTriggerLineage({
    trigger,
    parentHead: futureWorkflowInstallHead,
    changedFiles: [r4k.FUTURE_TRIGGER_PATH],
    runAttempt: 1,
    hostedWorkflowCertified: true,
    authorizationReceipt: r4iConfig.receipt
  });
  if (continuity.decision !== 'r4k_future_trigger_lineage_valid_repository_only') {
    fail('DOKE_COM_B03C_R4K_FUTURE_TRIGGER_LINEAGE_INVALID');
  }
  assertFalseAuthority({
    ...readiness,
    triggerCreationAuthority: continuity.triggerCreationAuthority,
    remoteExecutionAuthority: continuity.remoteExecutionAuthority,
    stagingReadAuthority: continuity.stagingReadAuthority,
    stagingMutationAuthority: continuity.stagingMutationAuthority
  });

  const wrongParent = r4k.validateFutureTriggerLineage({
    trigger,
    parentHead: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    changedFiles: [r4k.FUTURE_TRIGGER_PATH],
    runAttempt: 1,
    hostedWorkflowCertified: true,
    authorizationReceipt: r4iConfig.receipt
  });
  if (wrongParent.reason !== 'R4K_TRIGGER_WORKFLOW_INSTALL_HEAD_CONTINUITY_REQUIRED') {
    fail('DOKE_COM_B03C_R4K_WRONG_TRIGGER_PARENT_NOT_REJECTED');
  }

  let remoteBlock = false;
  try {
    r4k.assertRemoteExecutionBoundaryAbsent();
  } catch (error) {
    remoteBlock = error?.code === r4k.REMOTE_EXECUTION_BLOCK_CODE;
  }
  if (!remoteBlock) fail('DOKE_COM_B03C_R4K_REMOTE_BLOCK_NOT_ENFORCED');

  process.stdout.write(`${JSON.stringify({
    validationId: r4k.VALIDATION_ID,
    contractId: r4k.CONTRACT_ID,
    status: readiness.status,
    lineageKind: readiness.lineageKind,
    authorizationEvidenceHead: readiness.authorizationEvidenceHead,
    authorizationReceiptId: readiness.authorizationReceiptId,
    futureWorkflowInstallHeadMaterialized: false,
    sampleFutureWorkflowInstallHead: futureWorkflowInstallHead,
    sampleTriggerParentMatchesWorkflowInstallHead: true,
    sameHeadRejected: true,
    staleAuthorizationEvidenceRejected: true,
    wrongTriggerParentRejected: true,
    triggerCreated: false,
    hostedWorkflowInstalled: false,
    stagingAccess: false,
    networkAccess: false,
    rawRemoteErrorExposed: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  })}\n`);
}

main();
