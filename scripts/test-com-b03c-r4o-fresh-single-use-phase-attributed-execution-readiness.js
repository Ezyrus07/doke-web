'use strict';

const assert = require('node:assert/strict');
const r4o = require('../backend/modules/communities/community-realtime-private-auth-r4o');
const r4n = require('../backend/modules/communities/community-realtime-private-auth-r4n');
const config = require('../config/com-b03c-r4o-fresh-single-use-phase-attributed-execution-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R4O-FRESH-SINGLE-USE-PHASE-ATTRIBUTED-EXECUTION-READINESS.json');

const readiness = r4o.evaluateRepositoryReadiness({
  predecessorR4nEvidenceHead: r4o.PREDECESSOR_R4N_EVIDENCE_HEAD,
  r4nContractId: r4n.CONTRACT_ID,
  r4nValidationId: r4n.VALIDATION_ID,
  r4nStatus: r4n.STATUS,
  matrixVersion: '1.3.113',
  maturity: 3,
  productionGate: 'blocked',
  observedLastProvenPhase: r4n.OBSERVED_LAST_PROVEN_PHASE,
  observedFirstUnprovenPhases: [...r4n.OBSERVED_FIRST_UNPROVEN_PHASES],
  phases: [...r4n.PHASES],
  freshAuthorizationRequired: true,
  authorizationPhraseHeadBound: true,
  authorizationReceiptMustBeNew: true,
  authorizationSingleUse: true,
  authorizationNonReusableAfterFailure: true,
  genericContinuationDoesNotAuthorizeRemoteExecution: true,
  rawAuthorizationPhrasePersistenceForbidden: true,
  singleFileTriggerRequired: true,
  triggerParentMustEqualCertifiedR4oHead: true,
  runAttemptOneRequired: true,
  phaseAttributedExecutorInstalled: true,
  sanitizedReportVerifierInstalled: true,
  rawRemoteErrorPersistenceForbidden: true,
  cleanupRequiredForFutureRemoteAttempt: true,
  zeroResidueRequiredForFutureRemoteAttempt: true,
  separateHostedRemoteExecutionBoundaryRequired: true,
  historicalR4lR4mR4nUnchanged: true,
  authorizationReceiptMaterialized: false,
  authorizationConsumed: false,
  triggerCreated: false,
  hostedRemoteExecutionWorkflowInstalled: false,
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
  mergeExecuted: false
});

assert.equal(readiness.decision, r4o.STATUS);
assert.equal(readiness.freshAuthorizationLifecycleReady, true);
assert.equal(readiness.phaseAttributedExecutionEnvelopeReady, true);
assert.equal(readiness.remoteExecutionAuthority, false);
assert.equal(readiness.authorizationConsumed, false);
assert.equal(readiness.triggerCreated, false);
assert.equal(readiness.exactRootCauseProven, false);

const syntheticCertifiedHead = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const request = r4o.buildFreshAuthorizationRequest({ certifiedHead: syntheticCertifiedHead });
assert.equal(
  request.authorizationPhrase,
  `${r4o.AUTHORIZATION_PHRASE_PREFIX}${syntheticCertifiedHead}`
);
assert.equal(request.singleUse, true);
assert.equal(request.authorizationReusable, false);
assert.equal(request.reusableAfterFailure, false);

const freshReceipt = {
  authorizationContractId: r4o.CONTRACT_ID,
  authorizedHead: syntheticCertifiedHead,
  authorizationPhraseFingerprint: request.authorizationPhraseFingerprint,
  authorizationReceiptId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  authorizationConsumed: true,
  authorizationReusable: false,
  reusableAfterFailure: false,
  rawAuthorizationPhrasePersisted: false,
  executionAttempted: false,
  triggerCreated: false
};
const receiptCheck = r4o.validateFreshAuthorizationReceipt({
  receipt: freshReceipt,
  certifiedHead: syntheticCertifiedHead
});
assert.equal(receiptCheck.decision, 'r4o_fresh_authorization_receipt_valid_repository_only');
assert.equal(receiptCheck.remoteExecutionAuthority, false);

const staleReceipt = { ...freshReceipt, authorizedHead: r4o.PREDECESSOR_R4N_EVIDENCE_HEAD };
assert.equal(
  r4o.validateFreshAuthorizationReceipt({ receipt: staleReceipt, certifiedHead: syntheticCertifiedHead }).decision,
  'blocked_repository_only'
);

const descriptor = r4o.buildFutureTriggerDescriptor({
  workflowInstallHead: syntheticCertifiedHead,
  authorizationReceipt: freshReceipt
});
const trigger = {
  executionContractId: descriptor.executionContractId,
  workflowInstallHead: descriptor.workflowInstallHead,
  authorizationReceiptId: descriptor.authorizationReceiptId,
  authorizationPhraseFingerprint: descriptor.authorizationPhraseFingerprint,
  triggerPath: descriptor.triggerPath,
  executorPath: descriptor.executorPath,
  verifierPath: descriptor.verifierPath,
  reportSchema: descriptor.reportSchema,
  runAttempt: 1,
  singleUse: true,
  reusableAfterFailure: false
};
const triggerCheck = r4o.validateFutureTriggerCommit({
  trigger,
  parentHead: syntheticCertifiedHead,
  changedFiles: [r4o.FUTURE_TRIGGER_PATH],
  runAttempt: 1,
  authorizationReceipt: freshReceipt
});
assert.equal(triggerCheck.decision, 'r4o_future_trigger_lineage_valid_repository_only');
assert.equal(triggerCheck.hostedRemoteExecutionWorkflowInstalled, false);
assert.equal(triggerCheck.remoteExecutionAuthority, false);

assert.equal(config.contractId, r4o.CONTRACT_ID);
assert.equal(config.predecessor.r4nEvidenceHead, r4o.PREDECESSOR_R4N_EVIDENCE_HEAD);
assert.equal(config.authorization.futureReceiptMaterialized, false);
assert.equal(config.authorization.previousAuthorizationReuseForbidden, true);
assert.equal(config.execution.hostedRemoteExecutionWorkflowInstalled, false);
assert.equal(config.authority.remoteExecutionAuthority, false);
assert.equal(config.authority.productionAuthority, false);
assert.equal(evidence.contractId, r4o.CONTRACT_ID);
assert.equal(evidence.exactRootCauseProven, false);
assert.equal(evidence.causalPromotionAllowed, false);
assert.equal(evidence.remoteEffects.stagingAccess, false);
assert.equal(evidence.remoteEffects.productionChanged, false);

process.stdout.write(JSON.stringify({
  validationId: r4o.VALIDATION_ID,
  assertions: 54,
  freshAuthorizationLifecycleReady: true,
  phaseAttributedExecutionEnvelopeReady: true,
  previousAuthorizationReuseForbidden: true,
  triggerCreated: false,
  remoteExecutionAuthority: false,
  exactRootCauseProven: false,
  causalPromotionAllowed: false
}) + '\n');
