#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r4t = require('../backend/modules/communities/community-realtime-private-auth-r4t');
const r4u = require('../backend/modules/communities/community-realtime-private-auth-r4u');

function baseInput() {
  return {
    predecessorR4tEvidenceHead: r4u.PREDECESSOR_R4T_EVIDENCE_HEAD,
    predecessorR4tEvidenceBlob: r4u.PREDECESSOR_R4T_EVIDENCE_BLOB,
    predecessorR4tFinalRun: r4u.PREDECESSOR_R4T_FINAL_RUN,
    predecessorR4tFinalJob: r4u.PREDECESSOR_R4T_FINAL_JOB,
    predecessorR4tMatrixRun: r4u.PREDECESSOR_R4T_MATRIX_RUN,
    predecessorR4tMatrixJob: r4u.PREDECESSOR_R4T_MATRIX_JOB,
    r4tContractId: r4t.CONTRACT_ID,
    r4tValidationId: r4t.VALIDATION_ID,
    r4tExecutionSemanticsFingerprint: r4u.R4T_EXECUTION_SEMANTICS_FINGERPRINT,
    matrixVersion: r4u.MATRIX_VERSION,
    maturity: r4u.REQUIRED_MATURITY,
    productionGate: r4u.REQUIRED_PRODUCTION_GATE,
    freshAuthorizationRequired: true,
    futureAuthorizationMustBindExactCertifiedR4uHead: true,
    futureAuthorizationScopeFingerprintPrepared: true,
    futureAuthorizationReceiptMustBeNew: true,
    priorAuthorizationReuseForbidden: true,
    priorReceiptReuseForbidden: true,
    authorizationSingleUse: true,
    authorizationReusableFalse: true,
    reusableAfterFailureFalse: true,
    runAttemptOneRequired: true,
    rawAuthorizationPhrasePersistenceForbidden: true,
    r4tExecutorCompositionImmutable: true,
    r4tCleanupSemanticsImmutable: true,
    futureReceiptValidationPrepared: true,
    separateAuthorizationIssuanceBoundaryRequired: true,
    separateTriggerCreationBoundaryRequired: true,
    separateRemoteExecutionBoundaryRequired: true,
    historicalR4tR4sR4qR4cUnchanged: true,
    noRemoteExecutionInR4u: true,
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
  const readiness = r4u.evaluateRepositoryReadiness(baseInput());
  assert.equal(readiness.decision, r4u.STATUS);
  assert.equal(readiness.freshAuthorizationLifecycleReady, true);
  assert.equal(readiness.authorizationPhraseDefined, false);
  assert.equal(readiness.authorizationReceiptCreated, false);
  assert.equal(readiness.remoteExecutionAuthority, false);

  const futureHeadA = '1111111111111111111111111111111111111111';
  const futureHeadB = '2222222222222222222222222222222222222222';
  const scopeA1 = r4u.buildFutureAuthorizationScope({ certifiedR4uHead: futureHeadA });
  const scopeA2 = r4u.buildFutureAuthorizationScope({ certifiedR4uHead: futureHeadA });
  const scopeB = r4u.buildFutureAuthorizationScope({ certifiedR4uHead: futureHeadB });
  assert.equal(scopeA1.scopeFingerprint, scopeA2.scopeFingerprint);
  assert.notEqual(scopeA1.scopeFingerprint, scopeB.scopeFingerprint);
  assert.equal(scopeA1.authorizationPhraseDefined, false);
  assert.equal(scopeA1.authorizationReceiptCreated, false);
  assert.equal(scopeA1.singleUse, true);
  assert.equal(scopeA1.authorizationReusable, false);
  assert.equal(scopeA1.reusableAfterFailure, false);
  assert.equal(scopeA1.runAttempt, 1);
  assert.equal(scopeA1.predecessorR4tEvidenceHead, r4u.PREDECESSOR_R4T_EVIDENCE_HEAD);
  assert.equal(scopeA1.r4tContractId, r4t.CONTRACT_ID);
  assert.equal(scopeA1.r4tExecutionSemanticsFingerprint, r4u.R4T_EXECUTION_SEMANTICS_FINGERPRINT);

  const receipt = {
    authorizationContractId: r4u.CONTRACT_ID,
    authorizedHead: futureHeadA,
    scopeFingerprint: scopeA1.scopeFingerprint,
    predecessorR4tEvidenceHead: r4u.PREDECESSOR_R4T_EVIDENCE_HEAD,
    r4tContractId: r4t.CONTRACT_ID,
    r4tExecutionSemanticsFingerprint: r4u.R4T_EXECUTION_SEMANTICS_FINGERPRINT,
    targetEnvironment: r4u.TARGET_ENVIRONMENT,
    projectId: r4u.REQUIRED_PROJECT_ID,
    branch: r4u.REQUIRED_BRANCH,
    pullRequest: r4u.REQUIRED_PULL_REQUEST,
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
  const receiptCheck = r4u.validateFutureAuthorizationReceiptShape({ receipt, certifiedR4uHead: futureHeadA });
  assert.equal(receiptCheck.decision, 'future_r4u_authorization_receipt_shape_valid_repository_only');
  assert.equal(receiptCheck.remoteExecutionAuthority, false);

  const reused = r4u.validateFutureAuthorizationReceiptShape({
    receipt: { ...receipt, authorizationReusable: true },
    certifiedR4uHead: futureHeadA
  });
  assert.equal(reused.decision, 'blocked_repository_only');
  assert.equal(reused.reason, 'R4U_FUTURE_RECEIPT_BINDING_REQUIRED');

  const wrongHead = r4u.validateFutureAuthorizationReceiptShape({ receipt, certifiedR4uHead: futureHeadB });
  assert.equal(wrongHead.decision, 'blocked_repository_only');

  let hardBlocked = false;
  try { r4u.assertRemoteExecutionBoundaryAbsent(); } catch (error) {
    hardBlocked = error?.code === r4u.REMOTE_EXECUTION_BLOCK_CODE;
  }
  assert.equal(hardBlocked, true);

  const prohibited = r4u.evaluateRepositoryReadiness({ ...baseInput(), authorizationPhraseDefined: true });
  assert.equal(prohibited.decision, 'blocked_repository_only');
  assert.equal(prohibited.reason, 'R4U_REPOSITORY_ONLY_SCOPE_REQUIRED');

  console.log(JSON.stringify({
    validationId: r4u.VALIDATION_ID,
    status: readiness.status,
    predecessorR4tEvidenceHead: readiness.predecessorR4tEvidenceHead,
    lifecycleStates: readiness.lifecycleStates,
    exactHeadBindingChangesFingerprint: scopeA1.scopeFingerprint !== scopeB.scopeFingerprint,
    authorizationPhraseDefined: false,
    authorizationReceiptCreated: false,
    triggerCreated: false,
    remoteExecutionAuthority: false,
    exactRootCauseProven: false
  }));
}

main().catch((error) => {
  console.error(error?.code || error?.message || 'R4U_REPOSITORY_SELF_TEST_FAILED');
  process.exit(1);
});
