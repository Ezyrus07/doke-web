#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r5f = require('../backend/modules/communities/community-realtime-private-auth-r5f');
const r5e = require('../backend/modules/communities/community-realtime-private-auth-r5e');

const required = {
  exactR5eEvidenceHeadPinned: true,
  exactR5eEvidenceTreePinned: true,
  exactR5eEvidenceBlobPinned: true,
  r5eAuthorizationScopeFingerprintPinned: true,
  r5dImmutableLineagePinned: true,
  correctedBridgeSemanticsFingerprintPinned: true,
  freshAuthorizationPhraseFactoryPrepared: true,
  concreteAuthorizationPhraseNotPersisted: true,
  authorizationPhraseFingerprintPrepared: true,
  freshReceiptDerivationPrepared: true,
  receiptConsumptionTransitionPrepared: true,
  receiptCompatibilityWithR5ePrepared: true,
  receiptMustBindCertifiedR5fIssuerEvidenceHead: true,
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
  workflowPushTriggerAbsent: true,
  workflowEnvironmentAbsent: true,
  workflowSecretsAbsent: true,
  repositorySelfTestPrepared: true,
  noRemoteExecutionInR5f: true,
  noCausalPromotionWithoutCorrectedRemoteObservation: true
};
const prohibited = {
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
const readiness = r5f.evaluateRepositoryReadiness({
  r5eContractId: r5e.CONTRACT_ID,
  r5eValidationId: r5e.VALIDATION_ID,
  r5eEvidenceHead: r5f.R5E_EVIDENCE_HEAD,
  r5eEvidenceTree: r5f.R5E_EVIDENCE_TREE,
  r5eEvidenceBlob: r5f.R5E_EVIDENCE_BLOB,
  r5eCertifiedStatus: r5f.R5E_CERTIFIED_STATUS,
  r5eFinalRun: r5f.R5E_FINAL_RUN,
  r5eFinalJob: r5f.R5E_FINAL_JOB,
  r5eReconciliationRun: r5f.R5E_RECONCILIATION_RUN,
  r5eReconciliationJob: r5f.R5E_RECONCILIATION_JOB,
  matrixVersion: r5f.MATRIX_VERSION,
  maturity: r5f.REQUIRED_MATURITY,
  productionGate: r5f.REQUIRED_PRODUCTION_GATE,
  ...required,
  ...prohibited
});
assert.equal(readiness.decision, r5f.STATUS);
assert.equal(readiness.explicitAuthorizationReceived, false);
assert.equal(readiness.remoteExecutionAuthority, false);
assert.equal(readiness.exactRootCauseProven, false);

const scope = r5f.buildAuthorizationScope();
assert.equal(scope.certifiedR5eHead, r5f.R5E_EVIDENCE_HEAD);
assert.equal(scope.authorizationPhraseDefined, false);
assert.equal(scope.executionAttempted, false);

const wrong = r5f.evaluateExplicitAuthorization({ authorizationPhrase: 'NOPE' });
assert.equal(wrong.decision, 'blocked_repository_only');

const issued = r5f.evaluateExplicitAuthorization({
  authorizationPhrase: r5f.buildAuthorizationPhrase(),
  authorizedHead: r5f.R5E_EVIDENCE_HEAD,
  targetEnvironment: r5f.TARGET_ENVIRONMENT,
  projectId: r5f.REQUIRED_PROJECT_ID,
  branch: r5f.REQUIRED_BRANCH,
  pullRequest: r5f.REQUIRED_PULL_REQUEST,
  runAttempt: 1,
  authorizationConsumed: false,
  executionAttempted: false
});
assert.equal(issued.decision, 'fresh_r5e_bound_execution_authorization_received_repository_only');
assert.equal(issued.authorizationConsumed, false);
assert.equal(issued.remoteExecutionAuthority, false);

const consumed = r5f.consumeAuthorization(issued);
assert.equal(consumed.decision, 'fresh_r5e_bound_execution_authorization_consumed_repository_only');
assert.equal(consumed.authorizationConsumed, true);
assert.equal(r5f.consumeAuthorization(consumed).decision, 'blocked_repository_only');

const issuerEvidenceHead = '1111111111111111111111111111111111111111';
const descriptor = r5f.buildConsumedReceiptDescriptor({ issuerEvidenceHead });
const valid = r5f.validateConsumedReceiptDescriptor({ receipt: descriptor, issuerEvidenceHead });
assert.equal(valid.decision, 'consumed_r5e_bound_execution_authorization_receipt_valid_repository_only');
assert.equal(valid.remoteExecutionAuthority, false);

const tampered = { ...descriptor, authorizedHead: '2222222222222222222222222222222222222222' };
assert.equal(
  r5f.validateConsumedReceiptDescriptor({ receipt: tampered, issuerEvidenceHead }).decision,
  'blocked_repository_only'
);

assert.throws(
  () => r5f.assertRemoteExecutionBoundaryAbsent(),
  (error) => error && error.code === r5f.REMOTE_EXECUTION_BLOCK_CODE
);

process.stdout.write(`${JSON.stringify({
  validationId: r5f.VALIDATION_ID,
  status: r5f.STATUS,
  r5eEvidenceHead: r5f.R5E_EVIDENCE_HEAD,
  scopeFingerprint: readiness.scopeFingerprint,
  authorizationPhraseReceived: false,
  authorizationReceiptCreated: false,
  authorizationConsumed: false,
  triggerCreated: false,
  remoteExecutionAuthority: false,
  exactRootCauseProven: false
})}\n`);
