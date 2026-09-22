#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const r5a = require('../backend/modules/communities/community-realtime-private-auth-r5a');
const r5b = require('../backend/modules/communities/community-realtime-private-auth-r5b');

function readinessInput() {
  return {
    r5aContractId: r5a.CONTRACT_ID,
    r5aValidationId: r5a.VALIDATION_ID,
    r5aEvidenceHead: r5b.R5A_EVIDENCE_HEAD,
    r5aEvidenceBlob: r5b.R5A_EVIDENCE_BLOB,
    r5aCertifiedStatus: r5b.R5A_CERTIFIED_STATUS,
    r5aFinalRun: r5b.R5A_FINAL_RUN,
    r5aFinalJob: r5b.R5A_FINAL_JOB,
    r5aMatrixRun: r5b.R5A_MATRIX_RUN,
    r5aMatrixJob: r5b.R5A_MATRIX_JOB,
    matrixVersion: r5b.MATRIX_VERSION,
    maturity: r5b.REQUIRED_MATURITY,
    productionGate: r5b.REQUIRED_PRODUCTION_GATE,
    exactR5aEvidenceHeadPinned: true,
    exactR5aEvidenceBlobPinned: true,
    r5aAuthorizationScopeFingerprintPinned: true,
    correctedBridgeSemanticsFingerprintPinned: true,
    freshAuthorizationPhraseFactoryPrepared: true,
    concreteAuthorizationPhraseNotPersisted: true,
    authorizationPhraseFingerprintPrepared: true,
    freshReceiptDerivationPrepared: true,
    receiptConsumptionTransitionPrepared: true,
    receiptCompatibilityWithR5aPrepared: true,
    receiptMustBindCertifiedR5bIssuerEvidenceHead: true,
    singleUseRequired: true,
    authorizationReusableFalse: true,
    reusableAfterFailureFalse: true,
    zeroResidueRequired: true,
    baselineRestorationRequired: true,
    sanitizedArtifactRequired: true,
    secondConsumptionRejected: true,
    priorAuthorizationReuseRejected: true,
    priorReceiptReuseRejected: true,
    rawAuthorizationPhrasePersistenceForbidden: true,
    runAttemptOneRequired: true,
    triggerBoundarySeparate: true,
    remoteExecutionBoundarySeparate: true,
    historicalR4lR4wR4xR4yR4zR5aUnchanged: true,
    workflowPushTriggerAbsent: true,
    workflowEnvironmentAbsent: true,
    workflowSecretsAbsent: true,
    repositorySelfTestPrepared: true,
    noRemoteExecutionInR5b: true,
    noCausalPromotionWithoutCorrectedRemoteObservation: true,
    authorizationPhraseReceived: false,
    authorizationReceiptCreated: false,
    authorizationConsumed: false,
    futureAuthorizationConsumptionFileExists: false,
    triggerCreated: false,
    futureTriggerFileExists: false,
    authorizationJobExecuted: false,
    canaryJobExecuted: false,
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
  const readiness = r5b.evaluateRepositoryReadiness(readinessInput());
  assert.equal(readiness.decision, r5b.STATUS);
  assert.equal(readiness.repositoryAuthorizationIssuanceConsumptionReady, true);
  assert.equal(readiness.explicitAuthorizationReceived, false);
  assert.equal(readiness.authorizationReceiptCreated, false);
  assert.equal(readiness.remoteExecutionAuthority, false);

  const phrase = r5b.buildAuthorizationPhrase();
  assert.equal(phrase, `${r5b.AUTHORIZATION_PREFIX}${r5b.R5A_EVIDENCE_HEAD}`);
  assert.match(r5b.authorizationPhraseFingerprint(), /^[0-9a-f]{64}$/);
  assert.match(r5b.deriveAuthorizationReceiptId(), /^[0-9a-f]{64}$/);
  assert.equal(r5b.buildAuthorizationScope().correctedBridgeSemanticsFingerprint, r5a.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT);

  const received = r5b.evaluateExplicitAuthorization({
    authorizationPhrase: phrase,
    authorizedHead: r5b.R5A_EVIDENCE_HEAD,
    targetEnvironment: r5b.TARGET_ENVIRONMENT,
    projectId: r5b.REQUIRED_PROJECT_ID,
    projectName: r5b.REQUIRED_PROJECT_NAME,
    branch: r5b.REQUIRED_BRANCH,
    pullRequest: r5b.REQUIRED_PULL_REQUEST,
    runAttempt: 1,
    authorizationConsumed: false,
    executionAttempted: false
  });
  assert.equal(received.decision, 'fresh_r5a_bound_authorization_received_repository_only');
  assert.equal(received.authorizationConsumed, false);
  assert.equal(received.authorizationReusable, false);
  assert.equal(received.reusableAfterFailure, false);
  assert.equal(received.remoteExecutionAuthority, false);

  const wrongPhrase = r5b.evaluateExplicitAuthorization({
    authorizationPhrase: `${phrase}_WRONG`,
    authorizedHead: r5b.R5A_EVIDENCE_HEAD,
    targetEnvironment: r5b.TARGET_ENVIRONMENT,
    projectId: r5b.REQUIRED_PROJECT_ID,
    projectName: r5b.REQUIRED_PROJECT_NAME,
    branch: r5b.REQUIRED_BRANCH,
    pullRequest: r5b.REQUIRED_PULL_REQUEST,
    runAttempt: 1,
    authorizationConsumed: false,
    executionAttempted: false
  });
  assert.equal(wrongPhrase.decision, 'blocked_repository_only');

  const wrongHead = r5b.evaluateExplicitAuthorization({
    authorizationPhrase: phrase,
    authorizedHead: '1'.repeat(40),
    targetEnvironment: r5b.TARGET_ENVIRONMENT,
    projectId: r5b.REQUIRED_PROJECT_ID,
    projectName: r5b.REQUIRED_PROJECT_NAME,
    branch: r5b.REQUIRED_BRANCH,
    pullRequest: r5b.REQUIRED_PULL_REQUEST,
    runAttempt: 1,
    authorizationConsumed: false,
    executionAttempted: false
  });
  assert.equal(wrongHead.decision, 'blocked_repository_only');

  const consumed = r5b.consumeAuthorization(received);
  assert.equal(consumed.decision, 'fresh_r5a_bound_authorization_consumed_repository_only');
  assert.equal(consumed.authorizationConsumed, true);
  assert.equal(consumed.remoteExecutionAuthority, false);
  const secondConsumption = r5b.consumeAuthorization(consumed);
  assert.equal(secondConsumption.decision, 'blocked_repository_only');

  const issuerHead = 'a'.repeat(40);
  const descriptorA = r5b.buildConsumedReceiptDescriptor({ issuerEvidenceHead: issuerHead });
  const descriptorB = r5b.buildConsumedReceiptDescriptor({ issuerEvidenceHead: issuerHead });
  assert.deepEqual(descriptorA, descriptorB);
  assert.equal(descriptorA.issuerEvidenceHead, issuerHead);
  assert.equal(descriptorA.authorizationConsumed, true);
  assert.equal(descriptorA.authorizationReusable, false);
  assert.equal(descriptorA.reusableAfterFailure, false);
  assert.equal(descriptorA.rawAuthorizationPhrasePersisted, false);
  assert.equal(descriptorA.executionAttempted, false);
  assert.equal(descriptorA.triggerCreated, false);
  assert.equal(descriptorA.remoteExecutionAuthority, false);
  assert.equal(descriptorA.correctedBridgeSemanticsFingerprint, r5a.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT);

  const valid = r5b.validateConsumedReceiptDescriptor({ receipt: descriptorA, issuerEvidenceHead: issuerHead });
  assert.equal(valid.decision, 'consumed_r5a_bound_authorization_receipt_valid_repository_only');
  assert.equal(valid.remoteExecutionAuthority, false);

  const tampered = r5b.validateConsumedReceiptDescriptor({
    receipt: { ...descriptorA, authorizationReceiptId: 'b'.repeat(64) },
    issuerEvidenceHead: issuerHead
  });
  assert.equal(tampered.decision, 'blocked_repository_only');

  const moduleSource = fs.readFileSync(path.join(__dirname, '../backend/modules/communities/community-realtime-private-auth-r5b.js'), 'utf8');
  const configSource = fs.readFileSync(path.join(__dirname, '../config/com-b03c-r5b-r5a-bound-corrected-terminal-observation-authorization-issuance-consumption-readiness.json'), 'utf8');
  const validationSource = fs.readFileSync(path.join(__dirname, '../docs/validation/COM-B03C-R5B-R5A-BOUND-CORRECTED-TERMINAL-OBSERVATION-AUTHORIZATION-ISSUANCE-CONSUMPTION-READINESS.json'), 'utf8');
  assert.equal(moduleSource.includes(phrase), false);
  assert.equal(configSource.includes(phrase), false);
  assert.equal(validationSource.includes(phrase), false);

  let hardBlocked = false;
  try { r5b.assertRemoteExecutionBoundaryAbsent(); } catch (error) {
    hardBlocked = error?.code === r5b.REMOTE_EXECUTION_BLOCK_CODE;
  }
  assert.equal(hardBlocked, true);

  console.log(JSON.stringify({
    validationId: r5b.VALIDATION_ID,
    status: readiness.status,
    r5aEvidenceHead: r5b.R5A_EVIDENCE_HEAD,
    scopeFingerprint: readiness.scopeFingerprint,
    correctedBridgeSemanticsFingerprint: readiness.correctedBridgeSemanticsFingerprint,
    authorizationPhraseFingerprint: readiness.authorizationPhraseFingerprint,
    authorizationReceiptId: readiness.authorizationReceiptId,
    authorizationPhraseDefined: true,
    explicitAuthorizationReceived: false,
    authorizationReceiptCreated: false,
    authorizationConsumed: false,
    triggerCreated: false,
    remoteExecutionAuthority: false,
    exactRootCauseProven: false
  }));
}

main().catch((error) => {
  console.error(error?.code || error?.message || 'R5B_REPOSITORY_SELF_TEST_FAILED');
  process.exit(1);
});
