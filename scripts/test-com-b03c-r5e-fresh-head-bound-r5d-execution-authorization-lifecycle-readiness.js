#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r5d = require('../backend/modules/communities/community-realtime-private-auth-r5d');
const r5e = require('../backend/modules/communities/community-realtime-private-auth-r5e');

function baseInput() {
  return {
    predecessorR5dCertifiedHead: r5e.PREDECESSOR_R5D_CERTIFIED_HEAD,
    predecessorR5dCertifiedTree: r5e.PREDECESSOR_R5D_CERTIFIED_TREE,
    predecessorR5dCertificationRun: r5e.PREDECESSOR_R5D_CERTIFICATION_RUN,
    predecessorR5dCertificationJob: r5e.PREDECESSOR_R5D_CERTIFICATION_JOB,
    predecessorR5dCertificationSuccess: true,
    r5dContractId: r5d.CONTRACT_ID,
    r5dValidationId: r5d.VALIDATION_ID,
    r5dStatus: r5d.STATUS,
    r5dEnvelopeKind: r5d.ENVELOPE_KIND,
    r5dModuleBlob: r5e.R5D_MODULE_BLOB,
    lineageAuthorizationReceiptPath: r5e.LINEAGE_AUTHORIZATION_RECEIPT_PATH,
    lineageAuthorizationReceiptBlob: r5e.LINEAGE_AUTHORIZATION_RECEIPT_BLOB,
    lineageAuthorizationReceiptId: r5e.LINEAGE_AUTHORIZATION_RECEIPT_ID,
    correctedBridgePath: r5e.CORRECTED_BRIDGE_PATH,
    correctedBridgeBlob: r5e.CORRECTED_BRIDGE_BLOB,
    correctedBridgeSemanticsFingerprint: r5e.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    matrixVersion: r5e.MATRIX_VERSION,
    maturity: r5e.REQUIRED_MATURITY,
    productionGate: r5e.REQUIRED_PRODUCTION_GATE,
    targetBranch: r5e.REQUIRED_BRANCH,
    targetPr: r5e.REQUIRED_PULL_REQUEST,
    targetStagingProject: r5e.REQUIRED_PROJECT_ID,
    futureTriggerPath: r5e.FUTURE_TRIGGER_PATH,
    futureTriggerExists: false,
    freshExecutionAuthorizationRequired: true,
    futureAuthorizationMustBindExactCertifiedR5eHead: true,
    futureAuthorizationScopeFingerprintPrepared: true,
    futureAuthorizationReceiptMustBeNew: true,
    priorAuthorizationReuseForbidden: true,
    priorExecutionAuthorizationReceiptReuseForbidden: true,
    lineageR5bReceiptPreservedNotReissued: true,
    authorizationSingleUse: true,
    authorizationReusableFalse: true,
    reusableAfterFailureFalse: true,
    runAttemptOneRequired: true,
    rawAuthorizationPhrasePersistenceForbidden: true,
    r5dExecutionEnvelopeImmutable: true,
    r5dTriggerDescriptorSemanticsPreserved: true,
    correctedBridgeSemanticsImmutable: true,
    zeroResidueRequiredForFutureRemoteAttempt: true,
    baselineRestorationRequiredForFutureRemoteAttempt: true,
    sanitizedArtifactRequiredForFutureRemoteAttempt: true,
    futureReceiptValidationPrepared: true,
    separateAuthorizationIssuanceBoundaryRequired: true,
    separateTriggerCreationBoundaryRequired: true,
    separateRemoteExecutionBoundaryRequired: true,
    noRemoteExecutionInR5e: true,
    authorizationPhraseDefined: false,
    authorizationReceiptCreated: false,
    authorizationConsumed: false,
    triggerCreated: false,
    authorizationJobExecuted: false,
    canaryJobExecuted: false,
    workflowSecretsReferenced: false,
    stagingEnvironmentPrepared: false,
    remoteCredentialReadExecuted: false,
    remoteDependencyLoadExecuted: false,
    networkExecuted: false,
    databaseConnectionExecuted: false,
    databaseQueryAgainstRemoteExecuted: false,
    realtimeSubscriptionExecuted: false,
    authIdentityMutationExecuted: false,
    stagingMutationExecuted: false,
    runtimeChangeExecuted: false,
    productionExecuted: false,
    mergeExecuted: false
  };
}

async function main() {
  const readiness = r5e.evaluateRepositoryReadiness(baseInput());
  assert.equal(readiness.decision, r5e.STATUS);
  assert.equal(readiness.freshExecutionAuthorizationLifecycleReady, true);
  assert.equal(readiness.authorizationPhraseDefined, false);
  assert.equal(readiness.authorizationReceiptCreated, false);
  assert.equal(readiness.authorizationConsumed, false);
  assert.equal(readiness.triggerCreated, false);
  assert.equal(readiness.authorizationIssuanceAuthority, false);
  assert.equal(readiness.triggerCreationAuthority, false);
  assert.equal(readiness.remoteExecutionAuthority, false);
  assert.equal(readiness.exactRootCauseProven, false);

  const futureHeadA = '1111111111111111111111111111111111111111';
  const futureHeadB = '2222222222222222222222222222222222222222';
  const scopeA1 = r5e.buildFutureAuthorizationScope({ certifiedR5eHead: futureHeadA });
  const scopeA2 = r5e.buildFutureAuthorizationScope({ certifiedR5eHead: futureHeadA });
  const scopeB = r5e.buildFutureAuthorizationScope({ certifiedR5eHead: futureHeadB });

  assert.equal(scopeA1.scopeFingerprint, scopeA2.scopeFingerprint);
  assert.notEqual(scopeA1.scopeFingerprint, scopeB.scopeFingerprint);
  assert.equal(scopeA1.predecessorR5dCertifiedHead, r5e.PREDECESSOR_R5D_CERTIFIED_HEAD);
  assert.equal(scopeA1.r5dEnvelopeKind, r5d.ENVELOPE_KIND);
  assert.equal(scopeA1.lineageAuthorizationReceiptId, r5e.LINEAGE_AUTHORIZATION_RECEIPT_ID);
  assert.equal(scopeA1.lineageAuthorizationReceiptBlob, r5e.LINEAGE_AUTHORIZATION_RECEIPT_BLOB);
  assert.equal(scopeA1.correctedBridgeSemanticsFingerprint, r5e.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT);
  assert.equal(scopeA1.futureTriggerPath, r5e.FUTURE_TRIGGER_PATH);
  assert.equal(scopeA1.runAttempt, 1);
  assert.equal(scopeA1.singleUse, true);
  assert.equal(scopeA1.authorizationReusable, false);
  assert.equal(scopeA1.reusableAfterFailure, false);
  assert.equal(scopeA1.authorizationPhraseDefined, false);
  assert.equal(scopeA1.authorizationReceiptCreated, false);
  assert.equal(scopeA1.executionAttempted, false);

  const receipt = {
    authorizationContractId: r5e.CONTRACT_ID,
    authorizedHead: futureHeadA,
    scopeFingerprint: scopeA1.scopeFingerprint,
    predecessorR5dCertifiedHead: r5e.PREDECESSOR_R5D_CERTIFIED_HEAD,
    r5dContractId: r5d.CONTRACT_ID,
    r5dEnvelopeKind: r5d.ENVELOPE_KIND,
    lineageAuthorizationReceiptId: r5e.LINEAGE_AUTHORIZATION_RECEIPT_ID,
    lineageAuthorizationReceiptBlob: r5e.LINEAGE_AUTHORIZATION_RECEIPT_BLOB,
    correctedBridgeSemanticsFingerprint: r5e.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    futureTriggerPath: r5e.FUTURE_TRIGGER_PATH,
    targetEnvironment: r5e.TARGET_ENVIRONMENT,
    projectId: r5e.REQUIRED_PROJECT_ID,
    branch: r5e.REQUIRED_BRANCH,
    pullRequest: r5e.REQUIRED_PULL_REQUEST,
    runAttempt: 1,
    singleUse: true,
    authorizationConsumed: true,
    authorizationReusable: false,
    reusableAfterFailure: false,
    rawAuthorizationPhrasePersisted: false,
    executionAttempted: false,
    triggerCreated: false,
    authorizationReceiptId: 'a'.repeat(64)
  };

  const receiptCheck = r5e.validateFutureAuthorizationReceiptShape({ receipt, certifiedR5eHead: futureHeadA });
  assert.equal(receiptCheck.decision, 'future_r5e_execution_authorization_receipt_shape_valid_repository_only');
  assert.equal(receiptCheck.remoteExecutionAuthority, false);

  const reused = r5e.validateFutureAuthorizationReceiptShape({
    receipt: { ...receipt, authorizationReusable: true },
    certifiedR5eHead: futureHeadA
  });
  assert.equal(reused.decision, 'blocked_repository_only');
  assert.equal(reused.reason, 'R5E_FUTURE_RECEIPT_BINDING_REQUIRED');

  const wrongHead = r5e.validateFutureAuthorizationReceiptShape({ receipt, certifiedR5eHead: futureHeadB });
  assert.equal(wrongHead.decision, 'blocked_repository_only');

  const wrongR5dBlob = r5e.evaluateRepositoryReadiness({ ...baseInput(), r5dModuleBlob: '0'.repeat(40) });
  assert.equal(wrongR5dBlob.decision, 'blocked_repository_only');
  assert.equal(wrongR5dBlob.reason, 'R5E_R5D_EXECUTION_ENVELOPE_CONTINUITY_REQUIRED');

  const prohibited = r5e.evaluateRepositoryReadiness({ ...baseInput(), authorizationPhraseDefined: true });
  assert.equal(prohibited.decision, 'blocked_repository_only');
  assert.equal(prohibited.reason, 'R5E_REPOSITORY_ONLY_SCOPE_REQUIRED');

  let hardBlocked = false;
  try {
    r5e.assertRemoteExecutionBoundaryAbsent();
  } catch (error) {
    hardBlocked = error?.code === r5e.REMOTE_EXECUTION_BLOCK_CODE;
  }
  assert.equal(hardBlocked, true);

  console.log(JSON.stringify({
    validationId: r5e.VALIDATION_ID,
    status: readiness.status,
    predecessorR5dCertifiedHead: readiness.predecessorR5dCertifiedHead,
    r5dEnvelopeKind: readiness.r5dEnvelopeKind,
    lineageAuthorizationReceiptId: readiness.lineageAuthorizationReceiptId,
    correctedBridgeSemanticsFingerprint: readiness.correctedBridgeSemanticsFingerprint,
    lifecycleStates: readiness.lifecycleStates,
    exactHeadBindingChangesFingerprint: scopeA1.scopeFingerprint !== scopeB.scopeFingerprint,
    authorizationPhraseDefined: false,
    authorizationReceiptCreated: false,
    authorizationConsumed: false,
    triggerCreated: false,
    remoteExecutionAuthority: false,
    exactRootCauseProven: false
  }));
}

main().catch((error) => {
  console.error(error?.code || error?.message || 'R5E_REPOSITORY_SELF_TEST_FAILED');
  process.exit(1);
});
