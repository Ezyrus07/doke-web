'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const r5c = require('../backend/modules/communities/community-realtime-private-auth-r5c');

const ROOT = path.resolve(__dirname, '..');
const receipt = JSON.parse(fs.readFileSync(path.join(ROOT, r5c.AUTHORIZATION_RECEIPT_PATH), 'utf8'));

const readiness = r5c.evaluateRepositoryReadiness({
  predecessorR5bCertifiedHead: r5c.PREDECESSOR_R5B_CERTIFIED_HEAD,
  postConsumptionReconciledHead: r5c.POST_CONSUMPTION_RECONCILED_HEAD,
  r5bContractId: require('../backend/modules/communities/community-realtime-private-auth-r5b').CONTRACT_ID,
  r5bValidationId: require('../backend/modules/communities/community-realtime-private-auth-r5b').VALIDATION_ID,
  authorizationReceipt: receipt,
  authorizationReceiptBlob: r5c.AUTHORIZATION_RECEIPT_BLOB,
  authorizationReceiptPath: r5c.AUTHORIZATION_RECEIPT_PATH,
  futureTriggerPath: r5c.FUTURE_TRIGGER_PATH,
  correctedBridgeAsset: r5c.CORRECTED_BRIDGE_ASSET,
  correctedBridgeBlob: r5c.CORRECTED_BRIDGE_BLOB,
  matrixVersion: r5c.MATRIX_VERSION,
  maturity: r5c.REQUIRED_MATURITY,
  productionGate: r5c.REQUIRED_PRODUCTION_GATE,
  authorizationConsumedTrue: true,
  authorizationReusableFalse: true,
  reusableAfterFailureFalse: true,
  receiptBlobPinned: true,
  receiptIssuerHeadPinned: true,
  r5aAuthorizedHeadPinned: true,
  scopeFingerprintPinned: true,
  authorizationPhraseFingerprintPinned: true,
  authorizationReceiptIdPinned: true,
  correctedBridgeBlobPinned: true,
  correctedBridgeSemanticsFingerprintPinned: true,
  singleUseRequired: true,
  runAttemptOneRequired: true,
  futureTriggerMustBeSingleFileCommit: true,
  futureTriggerParentMustEqualCertifiedR5cHead: true,
  futureTriggerMustBindReceipt: true,
  futureTriggerMustBindCorrectedBridge: true,
  futureTriggerBoundarySeparate: true,
  remoteExecutionBoundarySeparate: true,
  zeroResidueRequired: true,
  baselineRestorationRequired: true,
  sanitizedArtifactRequired: true,
  rawAuthorizationPhrasePersistenceForbidden: true,
  historicalR4zR5aR5bUnchanged: true,
  workflowPullRequestOnly: true,
  workflowPushTriggerAbsent: true,
  workflowEnvironmentAbsent: true,
  workflowSecretsAbsent: true,
  noRemoteExecutionInR5c: true,
  noCausalPromotionWithoutCorrectedRemoteObservation: true,
  futureTriggerExists: false,
  triggerCreated: false,
  triggerCreationAuthority: false,
  authorizationJobExecuted: false,
  canaryJobExecuted: false,
  remoteCredentialReadExecuted: false,
  remoteDependencyLoadExecuted: false,
  networkExecuted: false,
  databaseConnectionExecuted: false,
  databaseQueryAgainstRemoteExecuted: false,
  realtimeSubscriptionExecuted: false,
  authIdentityMutationExecuted: false,
  stagingReadExecuted: false,
  stagingMutationExecuted: false,
  runtimeChangeExecuted: false,
  productionExecuted: false,
  mergeExecuted: false
});

assert.equal(readiness.decision, r5c.STATUS);
assert.equal(readiness.triggerReadinessCertified, true);
assert.equal(readiness.futureTriggerExists, false);
assert.equal(readiness.triggerCreated, false);
assert.equal(readiness.triggerCreationAuthority, false);
assert.equal(readiness.remoteExecutionAuthority, false);
assert.equal(readiness.stagingReadAuthority, false);
assert.equal(readiness.stagingMutationAuthority, false);
assert.equal(readiness.productionAuthority, false);
assert.equal(readiness.pullRequestMergeAuthority, false);

const receiptCheck = r5c.validateConsumedAuthorizationReceipt({
  receipt,
  receiptBlob: r5c.AUTHORIZATION_RECEIPT_BLOB
});
assert.equal(receiptCheck.decision, 'r5c_consumed_authorization_receipt_valid_repository_only');
assert.equal(receiptCheck.authorizationConsumed, true);
assert.equal(receiptCheck.authorizationReusable, false);
assert.equal(receiptCheck.reusableAfterFailure, false);
assert.equal(receiptCheck.remoteExecutionAuthority, false);

assert.throws(
  () => r5c.assertRemoteExecutionBoundaryAbsent(),
  (error) => error && error.code === r5c.REMOTE_EXECUTION_BLOCK_CODE
);

console.log(JSON.stringify({
  validationId: r5c.VALIDATION_ID,
  status: readiness.status,
  predecessorR5bCertifiedHead: readiness.predecessorR5bCertifiedHead,
  postConsumptionReconciledHead: readiness.postConsumptionReconciledHead,
  authorizationReceiptBlob: readiness.authorizationReceiptBlob,
  authorizationConsumed: true,
  authorizationReusable: false,
  reusableAfterFailure: false,
  futureTriggerExists: false,
  triggerCreated: false,
  triggerCreationAuthority: false,
  remoteExecutionAuthority: false,
  stagingReadAuthority: false,
  stagingMutationAuthority: false,
  exactRootCauseProven: false
}, null, 2));
