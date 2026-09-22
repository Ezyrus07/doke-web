'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const r4o = require('../backend/modules/communities/community-realtime-private-auth-r4o');
const r4p = require('../backend/modules/communities/community-realtime-private-auth-r4p');
const r4q = require('../backend/modules/communities/community-realtime-private-auth-r4q');
const r4pConfig = require('../config/com-b03c-r4p-r4o-fresh-authorization-consumption.json');
const config = require('../config/com-b03c-r4q-hosted-phase-attributed-terminal-observation-workflow-installation-readiness.json');
const r4pEvidence = require('../docs/validation/COM-B03C-R4P-R4O-FRESH-AUTHORIZATION-CONSUMPTION.json');

assert.equal(r4pEvidence.status, r4q.EXPECTED_R4P_EVIDENCE_STATUS);
assert.equal(r4q.PREDECESSOR_R4P_HEAD, '185ee09842354feabbe14bffe9f11c73e8cf3137');
assert.equal(r4q.AUTHORIZATION_EVIDENCE_HEAD, r4q.PREDECESSOR_R4P_HEAD);
assert.equal(r4q.AUTHORIZED_R4O_HEAD, r4p.R4O_CERTIFIED_HEAD);
assert.equal(r4q.AUTHORIZATION_RECEIPT_ID, r4p.AUTHORIZATION_RECEIPT_ID);
assert.equal(r4q.AUTHORIZATION_PHRASE_FINGERPRINT, r4p.AUTHORIZATION_PHRASE_FINGERPRINT);
assert.equal(r4q.FUTURE_TRIGGER_PATH, r4o.FUTURE_TRIGGER_PATH);
assert.equal(r4q.REPORT_SCHEMA, r4o.REPORT_SCHEMA);
assert.equal(r4q.assertConsumedReceipt(r4pConfig.receipt).decision, 'r4q_consumed_receipt_valid_repository_only');

const readiness = r4q.evaluateRepositoryReadiness({
  predecessorR4pHead: r4q.PREDECESSOR_R4P_HEAD,
  r4pContractId: r4p.CONTRACT_ID,
  r4pValidationId: r4p.VALIDATION_ID,
  r4pEvidenceStatus: r4pEvidence.status,
  authorizationReceipt: r4pConfig.receipt,
  authorizationEvidenceHead: r4q.AUTHORIZATION_EVIDENCE_HEAD,
  authorizationReceiptId: r4q.AUTHORIZATION_RECEIPT_ID,
  authorizedR4oHead: r4q.AUTHORIZED_R4O_HEAD,
  matrixVersion: r4q.MATRIX_VERSION,
  maturity: r4q.REQUIRED_MATURITY,
  productionGate: r4q.REQUIRED_PRODUCTION_GATE,
  futureTriggerPath: r4q.FUTURE_TRIGGER_PATH,
  workflowPath: r4q.WORKFLOW_PATH,
  executorPath: r4q.EXECUTOR_PATH,
  verifierPath: r4q.VERIFIER_PATH,
  reportPath: r4q.REPORT_PATH,
  reportSchema: r4q.REPORT_SCHEMA,
  hostedWorkflowInstalled: true,
  certifyAuthorizeCanaryOrderingDefined: true,
  pullRequestCertifyOnly: true,
  pushFilteredToExactTriggerOnly: true,
  authorizeNeedsCertify: true,
  canaryNeedsAuthorize: true,
  singleFileTriggerRequired: true,
  triggerParentMustEqualCertifiedWorkflowInstallHead: true,
  runAttemptOneRequired: true,
  authorizationEvidenceHeadSeparatedFromWorkflowInstallHead: true,
  authorizationReceiptContinuityRequired: true,
  phaseRegistryPreservedFromR4o: true,
  phaseAttributedExecutorInstalled: true,
  sanitizedReportVerifierInstalled: true,
  canarySecretsOnlyAfterAuthorize: true,
  canaryDependenciesOnlyAfterAuthorize: true,
  sanitizedArtifactUploadDefined: true,
  cleanupRequiredAfterFutureExecution: true,
  zeroResidueRequiredAfterFutureExecution: true,
  historicalR4oR4pUnchanged: true,
  finalCertifiedHeadBecomesFutureWorkflowInstallHead: true,
  futureWorkflowInstallHeadMaterialized: false,
  triggerCreated: false,
  authorizationJobExecuted: false,
  canaryJobExecuted: false,
  remoteCredentialReadExecuted: false,
  remoteDependencyLoadExecuted: false,
  networkExecuted: false,
  stagingReadExecuted: false,
  stagingMutationExecuted: false,
  realtimeSubscriptionExecuted: false,
  authIdentityMutationExecuted: false,
  runtimeChangeExecuted: false,
  productionExecuted: false,
  mergeExecuted: false,
  r3vContractId: r4q.EXECUTION_BINDING.r3vContractId,
  statementFingerprint: r4q.EXECUTION_BINDING.statementFingerprint,
  statementCount: r4q.EXECUTION_BINDING.statementCount,
  ownershipDigest: r4q.EXECUTION_BINDING.ownershipDigest
});

assert.equal(readiness.status, r4q.STATUS);
assert.equal(readiness.workflowCertificationReady, true);
assert.equal(readiness.certifyAvailableNow, true);
assert.equal(readiness.authorizeAvailableNow, false);
assert.equal(readiness.canaryAvailableNow, false);
assert.equal(readiness.futureWorkflowInstallHead, null);
assert.equal(readiness.triggerCreationAuthority, false);
assert.equal(readiness.remoteExecutionAuthority, false);
assert.equal(readiness.stagingReadAuthority, false);
assert.equal(readiness.stagingMutationAuthority, false);
assert.equal(readiness.productionAuthority, false);
assert.equal(readiness.pullRequestMergeAuthority, false);
assert.equal(readiness.exactRootCauseProven, false);
assert.equal(readiness.causalPromotionAllowed, false);

const workflowInstallHead = 'dddddddddddddddddddddddddddddddddddddddd';
const trigger = r4q.buildFutureTriggerDescriptor({
  workflowInstallHead,
  nonce: 'r4q_repository_test_nonce',
  authorizationReceipt: r4pConfig.receipt
});
assert.equal(trigger.executionContractId, r4q.CONTRACT_ID);
assert.equal(trigger.workflowInstallHead, workflowInstallHead);
assert.equal(trigger.authorizationEvidenceHead, r4q.AUTHORIZATION_EVIDENCE_HEAD);
assert.equal(trigger.authorizedR4oHead, r4q.AUTHORIZED_R4O_HEAD);
assert.equal(trigger.authorizationReceiptId, r4q.AUTHORIZATION_RECEIPT_ID);
assert.notEqual(trigger.workflowInstallHead, trigger.authorizationEvidenceHead);
assert.deepEqual(trigger.phases, [...r4o.PHASES]);
assert.equal(trigger.singleUse, true);
assert.equal(trigger.reusableAfterFailure, false);
assert.equal(trigger.rawAuthorizationPhrasePersisted, false);

const continuity = r4q.validateFutureTriggerCommit({
  trigger,
  parentHead: workflowInstallHead,
  changedFiles: [r4q.FUTURE_TRIGGER_PATH],
  runAttempt: 1,
  hostedWorkflowCertified: true,
  authorizationReceipt: r4pConfig.receipt
});
assert.equal(continuity.decision, 'r4q_future_trigger_valid_authority_available_for_this_attempt');
assert.equal(continuity.remoteExecutionAuthority, true);
assert.equal(continuity.stagingReadAuthority, true);
assert.equal(continuity.stagingMutationAuthority, true);
assert.equal(continuity.runtimeChangeAuthority, false);
assert.equal(continuity.productionAuthority, false);
assert.equal(continuity.pullRequestMergeAuthority, false);

const wrongParent = r4q.validateFutureTriggerCommit({
  trigger,
  parentHead: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  changedFiles: [r4q.FUTURE_TRIGGER_PATH],
  runAttempt: 1,
  hostedWorkflowCertified: true,
  authorizationReceipt: r4pConfig.receipt
});
assert.equal(wrongParent.decision, 'blocked_repository_only');

assert.throws(
  () => r4q.assertRemoteExecutionBoundaryAbsent(),
  (error) => error && error.code === r4q.REMOTE_EXECUTION_BLOCK_CODE
);

assert.equal(fs.existsSync(path.resolve(r4q.FUTURE_TRIGGER_PATH)), false);
const serialized = JSON.stringify({ config, r4pEvidence });
assert.equal(serialized.includes(r4o.AUTHORIZATION_PHRASE_PREFIX), false);

console.log(JSON.stringify({
  contractId: r4q.CONTRACT_ID,
  validationId: r4q.VALIDATION_ID,
  status: r4q.STATUS,
  predecessorR4pHead: r4q.PREDECESSOR_R4P_HEAD,
  authorizationEvidenceHead: r4q.AUTHORIZATION_EVIDENCE_HEAD,
  authorizedR4oHead: r4q.AUTHORIZED_R4O_HEAD,
  authorizationReceiptId: r4q.AUTHORIZATION_RECEIPT_ID,
  hostedWorkflowInstalled: true,
  triggerCreated: false,
  remoteExecutionAuthority: false,
  stagingAccessExecuted: false,
  exactRootCauseProven: false,
  causalPromotionAllowed: false
}, null, 2));
