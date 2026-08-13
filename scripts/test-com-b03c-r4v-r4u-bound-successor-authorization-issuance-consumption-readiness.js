#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r4u = require('../backend/modules/communities/community-realtime-private-auth-r4u');
const r4v = require('../backend/modules/communities/community-realtime-private-auth-r4v');

function baseInput() {
  return {
    r4uContractId: r4u.CONTRACT_ID,
    r4uValidationId: r4u.VALIDATION_ID,
    r4uEvidenceHead: r4v.R4U_EVIDENCE_HEAD,
    r4uEvidenceBlob: r4v.R4U_EVIDENCE_BLOB,
    r4uCertifiedStatus: r4v.R4U_CERTIFIED_STATUS,
    r4uFinalRun: r4v.R4U_FINAL_RUN,
    r4uFinalJob: r4v.R4U_FINAL_JOB,
    r4uMatrixRun: r4v.R4U_MATRIX_RUN,
    r4uMatrixJob: r4v.R4U_MATRIX_JOB,
    matrixVersion: r4v.MATRIX_VERSION,
    maturity: r4v.REQUIRED_MATURITY,
    productionGate: r4v.REQUIRED_PRODUCTION_GATE,
    exactR4uEvidenceHeadPinned: true,
    exactR4uEvidenceBlobPinned: true,
    r4uAuthorizationScopeFingerprintPinned: true,
    freshAuthorizationPhraseFactoryPrepared: true,
    concreteAuthorizationPhraseNotPersisted: true,
    authorizationPhraseFingerprintPrepared: true,
    freshReceiptDerivationPrepared: true,
    receiptConsumptionTransitionPrepared: true,
    receiptCompatibilityWithR4uPrepared: true,
    receiptMustBindCertifiedR4vIssuerEvidenceHead: true,
    singleUseRequired: true,
    authorizationReusableFalse: true,
    reusableAfterFailureFalse: true,
    secondConsumptionRejected: true,
    priorAuthorizationReuseRejected: true,
    priorReceiptReuseRejected: true,
    rawAuthorizationPhrasePersistenceForbidden: true,
    runAttemptOneRequired: true,
    triggerBoundarySeparate: true,
    remoteExecutionBoundarySeparate: true,
    historicalR4uR4tUnchanged: true,
    workflowPushTriggerAbsent: true,
    workflowEnvironmentAbsent: true,
    workflowSecretsAbsent: true,
    repositorySelfTestPrepared: true,
    noRemoteExecutionInR4v: true,
    noCausalPromotionWithoutRemoteObservation: true,
    authorizationPhraseReceived: false,
    authorizationReceiptCreated: false,
    authorizationConsumed: false,
    futureAuthorizationConsumptionFileExists: false,
    triggerCreated: false,
    futureTriggerExists: false,
    authorizationJobExecuted: false,
    canaryJobExecuted: false,
    stagingEnvironmentPrepared: false,
    workflowSecretsReferenced: false,
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

function authorizationInput(overrides = {}) {
  return {
    authorizationPhrase: r4v.buildAuthorizationPhrase(),
    authorizedHead: r4v.R4U_EVIDENCE_HEAD,
    targetEnvironment: r4v.TARGET_ENVIRONMENT,
    projectId: r4v.REQUIRED_PROJECT_ID,
    projectName: r4v.REQUIRED_PROJECT_NAME,
    branch: r4v.REQUIRED_BRANCH,
    pullRequest: r4v.REQUIRED_PULL_REQUEST,
    runAttempt: 1,
    authorizationConsumed: false,
    executionAttempted: false,
    ...overrides
  };
}

async function main() {
  const readiness = r4v.evaluateRepositoryReadiness(baseInput());
  assert.equal(readiness.decision, r4v.STATUS);
  assert.equal(readiness.repositoryAuthorizationIssuanceConsumptionReady, true);
  assert.equal(readiness.explicitAuthorizationReceived, false);
  assert.equal(readiness.authorizationReceiptCreated, false);
  assert.equal(readiness.authorizationConsumed, false);
  assert.equal(readiness.triggerCreationAuthority, false);
  assert.equal(readiness.remoteExecutionAuthority, false);

  assert.equal(r4v.buildAuthorizationPhrase().endsWith(r4v.R4U_EVIDENCE_HEAD), true);
  assert.equal(r4v.buildAuthorizationScope().certifiedR4uHead, r4v.R4U_EVIDENCE_HEAD);
  assert.equal(r4v.buildAuthorizationScope().singleUse, true);
  assert.equal(r4v.buildAuthorizationScope().authorizationReusable, false);
  assert.equal(r4v.buildAuthorizationScope().reusableAfterFailure, false);

  const wrongPhrase = r4v.evaluateExplicitAuthorization(
    authorizationInput({ authorizationPhrase: `${r4v.buildAuthorizationPhrase()}_WRONG` })
  );
  assert.equal(wrongPhrase.decision, 'blocked_repository_only');
  assert.equal(wrongPhrase.reason, 'R4V_EXACT_R4U_HEAD_BOUND_AUTHORIZATION_PHRASE_REQUIRED');

  const wrongHead = r4v.evaluateExplicitAuthorization(
    authorizationInput({ authorizedHead: '1111111111111111111111111111111111111111' })
  );
  assert.equal(wrongHead.decision, 'blocked_repository_only');
  assert.equal(wrongHead.reason, 'R4V_EXACT_AUTHORIZATION_SCOPE_REQUIRED');

  const received = r4v.evaluateExplicitAuthorization(authorizationInput());
  assert.equal(received.decision, 'fresh_r4u_bound_authorization_received_repository_only');
  assert.equal(received.authorizationConsumed, false);
  assert.equal(received.authorizationReusable, false);
  assert.equal(received.reusableAfterFailure, false);
  assert.equal(received.triggerCreationAuthority, false);
  assert.equal(received.remoteExecutionAuthority, false);
  assert.match(received.authorizationReceiptId, /^[0-9a-f]{64}$/);

  const consumed = r4v.consumeAuthorization(received);
  assert.equal(consumed.decision, 'fresh_r4u_bound_authorization_consumed_repository_only');
  assert.equal(consumed.authorizationConsumed, true);
  assert.equal(consumed.authorizationIssuanceAuthority, false);
  assert.equal(consumed.authorizationConsumptionAuthority, false);
  assert.equal(consumed.triggerCreationAuthority, false);
  assert.equal(consumed.remoteExecutionAuthority, false);

  const secondConsumption = r4v.consumeAuthorization(consumed);
  assert.equal(secondConsumption.decision, 'blocked_repository_only');
  assert.equal(secondConsumption.reason, 'R4V_VALID_FRESH_UNCONSUMED_AUTHORIZATION_RECEIPT_REQUIRED');

  const issuerHeadA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const issuerHeadB = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const descriptor = r4v.buildConsumedReceiptDescriptor({ issuerEvidenceHead: issuerHeadA });
  assert.deepEqual(Object.keys(descriptor).sort(), [...r4v.REQUIRED_CONSUMED_RECEIPT_KEYS].sort());
  assert.equal(descriptor.authorizedHead, r4v.R4U_EVIDENCE_HEAD);
  assert.equal(descriptor.authorizationConsumed, true);
  assert.equal(descriptor.triggerCreated, false);
  assert.equal(descriptor.remoteExecutionAuthority, false);

  const descriptorCheck = r4v.validateConsumedReceiptDescriptor({
    receipt: descriptor,
    issuerEvidenceHead: issuerHeadA
  });
  assert.equal(descriptorCheck.decision, 'consumed_r4u_bound_authorization_receipt_valid_repository_only');
  assert.equal(descriptorCheck.remoteExecutionAuthority, false);

  const wrongIssuer = r4v.validateConsumedReceiptDescriptor({
    receipt: descriptor,
    issuerEvidenceHead: issuerHeadB
  });
  assert.equal(wrongIssuer.decision, 'blocked_repository_only');
  assert.equal(wrongIssuer.reason, 'R4V_CONSUMED_RECEIPT_BINDING_REQUIRED');

  const reusedPriorShape = r4v.validateConsumedReceiptDescriptor({
    receipt: { ...descriptor, authorizationReceiptId: '0'.repeat(64) },
    issuerEvidenceHead: issuerHeadA
  });
  assert.equal(reusedPriorShape.decision, 'blocked_repository_only');

  let hardBlocked = false;
  try { r4v.assertRemoteExecutionBoundaryAbsent(); } catch (error) {
    hardBlocked = error?.code === r4v.REMOTE_EXECUTION_BLOCK_CODE;
  }
  assert.equal(hardBlocked, true);

  const prohibited = r4v.evaluateRepositoryReadiness({
    ...baseInput(),
    futureAuthorizationConsumptionFileExists: true
  });
  assert.equal(prohibited.decision, 'blocked_repository_only');
  assert.equal(prohibited.reason, 'R4V_REPOSITORY_ONLY_SCOPE_REQUIRED');

  console.log(JSON.stringify({
    validationId: r4v.VALIDATION_ID,
    status: readiness.status,
    predecessorR4uEvidenceHead: readiness.predecessorR4uEvidenceHead,
    authorizationScopeFingerprint: readiness.authorizationScopeFingerprint,
    authorizationPhrasePersisted: false,
    authorizationReceiptCreated: false,
    authorizationConsumed: false,
    futureAuthorizationConsumptionPath: readiness.futureAuthorizationConsumptionPath,
    triggerCreated: false,
    remoteExecutionAuthority: false,
    exactRootCauseProven: false
  }));
}

main().catch((error) => {
  console.error(error?.code || error?.message || 'R4V_REPOSITORY_SELF_TEST_FAILED');
  process.exit(1);
});
