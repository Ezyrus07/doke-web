'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const r5d = require('../backend/modules/communities/community-realtime-private-auth-r5d');
const r5f = require('../backend/modules/communities/community-realtime-private-auth-r5f');
const r5g = require('../backend/modules/communities/community-realtime-private-auth-r5g');

const ROOT = path.resolve(__dirname, '..');
const receipt = JSON.parse(fs.readFileSync(path.join(ROOT, r5g.AUTHORIZATION_RECEIPT_PATH), 'utf8'));
const state = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'config/com-b03c-r5g-r5f-consumed-r5d-execution-trigger-readiness.json'),
  'utf8'
));

assert.equal(fs.existsSync(path.join(ROOT, r5g.FUTURE_TRIGGER_PATH)), false);
assert.equal(state.contractId, r5g.CONTRACT_ID);
assert.equal(state.validationId, r5g.VALIDATION_ID);
assert.equal(state.predecessorR5fCertifiedHead, r5g.PREDECESSOR_R5F_CERTIFIED_HEAD);
assert.equal(state.postConsumptionReconciledHead, r5g.POST_CONSUMPTION_RECONCILED_HEAD);
assert.equal(state.authorizationReceiptBlob, r5g.AUTHORIZATION_RECEIPT_BLOB);
assert.equal(state.r5dCertifiedHead, r5g.R5D_CERTIFIED_HEAD);
assert.equal(state.r5dModuleBlob, r5g.R5D_MODULE_BLOB);
assert.equal(state.futureTriggerExists, false);
assert.equal(state.triggerCreated, false);
assert.equal(state.triggerCreationAuthority, false);
assert.equal(state.remoteExecutionAuthority, false);

const readiness = r5g.evaluateRepositoryReadiness({
  predecessorR5fCertifiedHead: r5g.PREDECESSOR_R5F_CERTIFIED_HEAD,
  postConsumptionReconciledHead: r5g.POST_CONSUMPTION_RECONCILED_HEAD,
  r5fContractId: r5f.CONTRACT_ID,
  r5fValidationId: r5f.VALIDATION_ID,
  r5dCertifiedHead: r5g.R5D_CERTIFIED_HEAD,
  r5dModuleBlob: r5g.R5D_MODULE_BLOB,
  r5dContractId: r5d.CONTRACT_ID,
  r5dValidationId: r5d.VALIDATION_ID,
  r5dEnvelopeKind: r5d.ENVELOPE_KIND,
  authorizationReceipt: receipt,
  authorizationReceiptBlob: r5g.AUTHORIZATION_RECEIPT_BLOB,
  authorizationReceiptPath: r5g.AUTHORIZATION_RECEIPT_PATH,
  futureTriggerPath: r5g.FUTURE_TRIGGER_PATH,
  correctedBridgeSemanticsFingerprint: r5g.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
  matrixVersion: r5g.MATRIX_VERSION,
  maturity: r5g.REQUIRED_MATURITY,
  productionGate: r5g.REQUIRED_PRODUCTION_GATE,
  authorizationConsumedTrue: true,
  authorizationReusableFalse: true,
  reusableAfterFailureFalse: true,
  executionAttemptedFalse: true,
  receiptBlobPinned: true,
  receiptIssuerHeadPinned: true,
  r5eAuthorizedHeadPinned: true,
  scopeFingerprintPinned: true,
  authorizationPhraseFingerprintPinned: true,
  authorizationReceiptIdPinned: true,
  r5dCertifiedHeadPinned: true,
  r5dModuleBlobPinned: true,
  r5dEnvelopeKindPinned: true,
  correctedBridgeSemanticsFingerprintPinned: true,
  singleUseRequired: true,
  runAttemptOneRequired: true,
  futureTriggerMustBeSingleFileCommit: true,
  futureTriggerParentMustEqualCertifiedR5gHead: true,
  futureTriggerMustBindReceipt: true,
  futureTriggerMustBindR5dEnvelope: true,
  futureTriggerMustBindCorrectedBridgeSemantics: true,
  futureTriggerBoundarySeparate: true,
  remoteExecutionBoundarySeparate: true,
  zeroResidueRequired: true,
  baselineRestorationRequired: true,
  sanitizedArtifactRequired: true,
  rawAuthorizationPhrasePersistenceForbidden: true,
  historicalR5dR5eR5fUnchanged: true,
  workflowPullRequestOnly: true,
  workflowPushTriggerAbsent: true,
  workflowEnvironmentAbsent: true,
  workflowSecretsAbsent: true,
  noRemoteExecutionInR5g: true,
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

assert.equal(readiness.decision, r5g.STATUS);
assert.equal(readiness.triggerReadinessCertified, true);
assert.equal(readiness.futureTriggerExists, false);
assert.equal(readiness.triggerCreated, false);
assert.equal(readiness.triggerCreationAuthority, false);
assert.equal(readiness.remoteExecutionAuthority, false);
assert.equal(readiness.stagingReadAuthority, false);
assert.equal(readiness.stagingMutationAuthority, false);
assert.equal(readiness.productionAuthority, false);
assert.equal(readiness.pullRequestMergeAuthority, false);
assert.equal(readiness.exactRootCauseProven, false);
assert.equal(readiness.causalPromotionAllowed, false);

const receiptCheck = r5g.validateConsumedAuthorizationReceipt({
  receipt,
  receiptBlob: r5g.AUTHORIZATION_RECEIPT_BLOB
});
assert.equal(
  receiptCheck.decision,
  'r5g_consumed_r5f_execution_authorization_receipt_valid_repository_only'
);
assert.equal(receiptCheck.authorizationConsumed, true);
assert.equal(receiptCheck.authorizationReusable, false);
assert.equal(receiptCheck.reusableAfterFailure, false);
assert.equal(receiptCheck.executionAttempted, false);
assert.equal(receiptCheck.triggerCreated, false);
assert.equal(receiptCheck.triggerCreationAuthority, false);
assert.equal(receiptCheck.remoteExecutionAuthority, false);
assert.equal(receiptCheck.predecessorR5dCertifiedHead, r5g.R5D_CERTIFIED_HEAD);
assert.equal(receiptCheck.r5dEnvelopeKind, r5d.ENVELOPE_KIND);

assert.throws(
  () => r5g.assertRemoteExecutionBoundaryAbsent(),
  (error) => error && error.code === r5g.REMOTE_EXECUTION_BLOCK_CODE
);

console.log(JSON.stringify({
  validationId: r5g.VALIDATION_ID,
  status: readiness.status,
  predecessorR5fCertifiedHead: readiness.predecessorR5fCertifiedHead,
  postConsumptionReconciledHead: readiness.postConsumptionReconciledHead,
  authorizationReceiptBlob: readiness.authorizationReceiptBlob,
  authorizationReceiptId: readiness.authorizationReceiptId,
  r5dCertifiedHead: readiness.r5dCertifiedHead,
  r5dModuleBlob: readiness.r5dModuleBlob,
  authorizationConsumed: true,
  authorizationReusable: false,
  reusableAfterFailure: false,
  executionAttempted: false,
  futureTriggerExists: false,
  triggerCreated: false,
  triggerCreationAuthority: false,
  remoteExecutionAuthority: false,
  stagingReadAuthority: false,
  stagingMutationAuthority: false,
  exactRootCauseProven: false,
  causalPromotionAllowed: false
}, null, 2));
