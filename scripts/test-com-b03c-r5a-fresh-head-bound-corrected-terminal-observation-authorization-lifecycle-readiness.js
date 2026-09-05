#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r4z = require('../backend/modules/communities/community-realtime-private-auth-r4z');
const r5a = require('../backend/modules/communities/community-realtime-private-auth-r5a');

function baseInput() {
  return {
    predecessorR4zEvidenceHead: r5a.PREDECESSOR_R4Z_EVIDENCE_HEAD,
    predecessorR4zEvidenceBlob: r5a.PREDECESSOR_R4Z_EVIDENCE_BLOB,
    predecessorR4zFinalRun: r5a.PREDECESSOR_R4Z_FINAL_RUN,
    predecessorR4zFinalJob: r5a.PREDECESSOR_R4Z_FINAL_JOB,
    predecessorR4zMatrixRun: r5a.PREDECESSOR_R4Z_MATRIX_RUN,
    predecessorR4zMatrixJob: r5a.PREDECESSOR_R4Z_MATRIX_JOB,
    predecessorR4zStatus: r5a.PREDECESSOR_R4Z_STATUS,
    r4zContractId: r4z.CONTRACT_ID,
    r4zValidationId: r4z.VALIDATION_ID,
    r4zModuleBlob: r5a.R4Z_MODULE_BLOB,
    correctedBridgeAsset: r5a.CORRECTED_BRIDGE_ASSET,
    correctedBridgeBlob: r5a.CORRECTED_BRIDGE_BLOB,
    correctedBridgeSemanticsFingerprint: r5a.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    matrixVersion: r5a.MATRIX_VERSION,
    maturity: r5a.REQUIRED_MATURITY,
    productionGate: r5a.REQUIRED_PRODUCTION_GATE,
    freshAuthorizationRequired: true,
    futureAuthorizationMustBindExactCertifiedR5aHead: true,
    futureAuthorizationScopeFingerprintPrepared: true,
    futureAuthorizationReceiptMustBeNew: true,
    priorAuthorizationReuseForbidden: true,
    priorReceiptReuseForbidden: true,
    authorizationSingleUse: true,
    authorizationReusableFalse: true,
    reusableAfterFailureFalse: true,
    runAttemptOneRequired: true,
    rawAuthorizationPhrasePersistenceForbidden: true,
    correctedBridgeAssetImmutable: true,
    correctedBridgeSemanticsImmutable: true,
    zeroResidueRequiredForFutureRemoteAttempt: true,
    baselineRestorationRequiredForFutureRemoteAttempt: true,
    sanitizedArtifactRequiredForFutureRemoteAttempt: true,
    futureReceiptValidationPrepared: true,
    separateAuthorizationIssuanceBoundaryRequired: true,
    separateTriggerCreationBoundaryRequired: true,
    separateRemoteExecutionBoundaryRequired: true,
    historicalR4lR4wR4xR4yR4zUnchanged: true,
    noRemoteExecutionInR5a: true,
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
  assert.equal(
    r5a.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    '29fbba28d1982dc4a4184afca367732e31c84cf95ffe0ccc89d6cc548fd1ee9f'
  );

  const readiness = r5a.evaluateRepositoryReadiness(baseInput());
  assert.equal(readiness.decision, r5a.STATUS);
  assert.equal(readiness.freshAuthorizationLifecycleReady, true);
  assert.equal(readiness.authorizationPhraseDefined, false);
  assert.equal(readiness.authorizationReceiptCreated, false);
  assert.equal(readiness.authorizationConsumed, false);
  assert.equal(readiness.triggerCreated, false);
  assert.equal(readiness.remoteExecutionAuthority, false);
  assert.equal(readiness.exactRootCauseProven, false);

  const futureHeadA = '1111111111111111111111111111111111111111';
  const futureHeadB = '2222222222222222222222222222222222222222';
  const scopeA1 = r5a.buildFutureAuthorizationScope({ certifiedR5aHead: futureHeadA });
  const scopeA2 = r5a.buildFutureAuthorizationScope({ certifiedR5aHead: futureHeadA });
  const scopeB = r5a.buildFutureAuthorizationScope({ certifiedR5aHead: futureHeadB });

  assert.equal(scopeA1.scopeFingerprint, scopeA2.scopeFingerprint);
  assert.notEqual(scopeA1.scopeFingerprint, scopeB.scopeFingerprint);
  assert.equal(scopeA1.predecessorR4zEvidenceHead, r5a.PREDECESSOR_R4Z_EVIDENCE_HEAD);
  assert.equal(scopeA1.correctedBridgeBlob, r5a.CORRECTED_BRIDGE_BLOB);
  assert.equal(scopeA1.correctedBridgeSemanticsFingerprint, r5a.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT);
  assert.equal(scopeA1.runAttempt, 1);
  assert.equal(scopeA1.singleUse, true);
  assert.equal(scopeA1.authorizationReusable, false);
  assert.equal(scopeA1.reusableAfterFailure, false);
  assert.equal(scopeA1.zeroResidueRequired, true);
  assert.equal(scopeA1.baselineRestorationRequired, true);
  assert.equal(scopeA1.sanitizedArtifactRequired, true);
  assert.equal(scopeA1.authorizationPhraseDefined, false);
  assert.equal(scopeA1.authorizationReceiptCreated, false);

  const receipt = {
    authorizationContractId: r5a.CONTRACT_ID,
    authorizedHead: futureHeadA,
    scopeFingerprint: scopeA1.scopeFingerprint,
    predecessorR4zEvidenceHead: r5a.PREDECESSOR_R4Z_EVIDENCE_HEAD,
    r4zContractId: r4z.CONTRACT_ID,
    correctedBridgeSemanticsFingerprint: r5a.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    targetEnvironment: r5a.TARGET_ENVIRONMENT,
    projectId: r5a.REQUIRED_PROJECT_ID,
    branch: r5a.REQUIRED_BRANCH,
    pullRequest: r5a.REQUIRED_PULL_REQUEST,
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
  const receiptCheck = r5a.validateFutureAuthorizationReceiptShape({ receipt, certifiedR5aHead: futureHeadA });
  assert.equal(receiptCheck.decision, 'future_r5a_authorization_receipt_shape_valid_repository_only');
  assert.equal(receiptCheck.remoteExecutionAuthority, false);

  const reused = r5a.validateFutureAuthorizationReceiptShape({
    receipt: { ...receipt, authorizationReusable: true },
    certifiedR5aHead: futureHeadA
  });
  assert.equal(reused.decision, 'blocked_repository_only');
  assert.equal(reused.reason, 'R5A_FUTURE_RECEIPT_BINDING_REQUIRED');

  const wrongHead = r5a.validateFutureAuthorizationReceiptShape({ receipt, certifiedR5aHead: futureHeadB });
  assert.equal(wrongHead.decision, 'blocked_repository_only');

  const wrongSemantics = r5a.evaluateRepositoryReadiness({
    ...baseInput(),
    correctedBridgeSemanticsFingerprint: '0'.repeat(64)
  });
  assert.equal(wrongSemantics.decision, 'blocked_repository_only');
  assert.equal(wrongSemantics.reason, 'R5A_R4Z_CORRECTED_BRIDGE_SEMANTICS_CONTINUITY_REQUIRED');

  const prohibited = r5a.evaluateRepositoryReadiness({ ...baseInput(), authorizationPhraseDefined: true });
  assert.equal(prohibited.decision, 'blocked_repository_only');
  assert.equal(prohibited.reason, 'R5A_REPOSITORY_ONLY_SCOPE_REQUIRED');

  let hardBlocked = false;
  try {
    r5a.assertRemoteExecutionBoundaryAbsent();
  } catch (error) {
    hardBlocked = error?.code === r5a.REMOTE_EXECUTION_BLOCK_CODE;
  }
  assert.equal(hardBlocked, true);

  console.log(JSON.stringify({
    validationId: r5a.VALIDATION_ID,
    status: readiness.status,
    predecessorR4zEvidenceHead: readiness.predecessorR4zEvidenceHead,
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
  console.error(error?.code || error?.message || 'R5A_REPOSITORY_SELF_TEST_FAILED');
  process.exit(1);
});
