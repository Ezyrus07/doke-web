#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const r4t = require('../backend/modules/communities/community-realtime-private-auth-r4t');
const r4w = require('../backend/modules/communities/community-realtime-private-auth-r4w');
const receipt = require('../config/com-b03c-r4v-r4u-fresh-authorization-consumption.json');
const readiness = require('../config/com-b03c-r4w-r4v-consumed-authorization-successor-workflow-installation-readiness.json');

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

const repoRoot = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(repoRoot, r4w.WORKFLOW_PATH), 'utf8');

const receiptCheck = r4w.assertConsumedReceipt(receipt);
assert(receiptCheck.decision === 'r4w_consumed_receipt_valid_repository_only', 'R4W_CONSUMED_RECEIPT_REQUIRED');

const result = r4w.evaluateRepositoryReadiness({
  authorizationEvidenceHead: r4w.AUTHORIZATION_EVIDENCE_HEAD,
  r4vIssuerEvidenceHead: r4w.R4V_ISSUER_EVIDENCE_HEAD,
  authorizedR4uHead: r4w.AUTHORIZED_R4U_HEAD,
  r4tEvidenceHead: r4w.R4T_EVIDENCE_HEAD,
  r4tContractId: r4t.CONTRACT_ID,
  r4tExecutionSemanticsFingerprint: r4w.R4T_EXECUTION_SEMANTICS_FINGERPRINT,
  authorizationReceipt: receipt,
  matrixVersion: r4w.MATRIX_VERSION,
  maturity: r4w.REQUIRED_MATURITY,
  productionGate: r4w.REQUIRED_PRODUCTION_GATE,
  futureTriggerPath: r4w.FUTURE_TRIGGER_PATH,
  workflowPath: r4w.WORKFLOW_PATH,
  executorPath: r4w.EXECUTOR_PATH,
  verifierPath: r4w.VERIFIER_PATH,
  reportPath: r4w.REPORT_PATH,
  reportSchema: r4w.REPORT_SCHEMA,
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
  r4tSuccessorExecutorInstalled: true,
  r4cCodecBeforeR3vAdapterRequired: true,
  r4sCleanupPlanRequired: true,
  phaseAttributedObservationPreserved: true,
  sanitizedReportVerifierInstalled: true,
  canarySecretsOnlyAfterAuthorize: true,
  canaryDependenciesOnlyAfterAuthorize: true,
  sanitizedArtifactUploadDefined: true,
  cleanupRequiredAfterFutureExecution: true,
  zeroResidueRequiredAfterFutureExecution: true,
  historicalR4tR4vR4uR4qUnchanged: true,
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
  r3vContractId: r4w.EXECUTION_BINDING.r3vContractId,
  executionBindingR4tContractId: r4w.EXECUTION_BINDING.r4tContractId,
  statementFingerprint: r4w.EXECUTION_BINDING.statementFingerprint,
  statementCount: r4w.EXECUTION_BINDING.statementCount,
  ownershipDigest: r4w.EXECUTION_BINDING.ownershipDigest
});

assert(result.decision === r4w.STATUS, 'R4W_REPOSITORY_READINESS_REQUIRED');
assert(result.remoteExecutionAuthority === false, 'R4W_REMOTE_AUTHORITY_MUST_BE_FALSE');
assert(result.triggerCreationAuthority === false, 'R4W_TRIGGER_CREATION_AUTHORITY_MUST_BE_FALSE');
assert(result.exactRootCauseProven === false && result.causalPromotionAllowed === false,
  'R4W_CAUSAL_PROMOTION_MUST_REMAIN_BLOCKED');

assert(readiness.contractId === r4w.CONTRACT_ID, 'R4W_CONFIG_CONTRACT_REQUIRED');
assert(readiness.authorizationEvidenceHead === r4w.AUTHORIZATION_EVIDENCE_HEAD, 'R4W_CONFIG_AUTH_HEAD_REQUIRED');
assert(readiness.r4tEvidenceHead === r4w.R4T_EVIDENCE_HEAD, 'R4W_CONFIG_R4T_HEAD_REQUIRED');
assert(readiness.authorizationReceiptId === r4w.AUTHORIZATION_RECEIPT_ID, 'R4W_CONFIG_RECEIPT_REQUIRED');
assert(readiness.futureTriggerPath === r4w.FUTURE_TRIGGER_PATH, 'R4W_CONFIG_TRIGGER_PATH_REQUIRED');
assert(readiness.authority.remoteExecutionAuthority === false, 'R4W_CONFIG_REMOTE_AUTHORITY_FALSE_REQUIRED');

assert(workflow.includes("permissions: { contents: read }"), 'R4W_WORKFLOW_READ_ONLY_PERMISSION_REQUIRED');
assert(workflow.includes(`- '${r4w.FUTURE_TRIGGER_PATH}'`), 'R4W_WORKFLOW_EXACT_TRIGGER_FILTER_REQUIRED');
assert(workflow.includes("if: github.event_name == 'push'"), 'R4W_WORKFLOW_PUSH_GATING_REQUIRED');
assert(workflow.includes('needs: certify'), 'R4W_WORKFLOW_AUTHORIZE_AFTER_CERTIFY_REQUIRED');
assert(workflow.includes('needs: authorize'), 'R4W_WORKFLOW_CANARY_AFTER_AUTHORIZE_REQUIRED');
assert(workflow.includes('environment: doke-staging'), 'R4W_WORKFLOW_STAGING_ENVIRONMENT_REQUIRED');
assert(workflow.includes('secrets.SUPABASE_ACCESS_TOKEN'), 'R4W_WORKFLOW_SECRET_ONLY_FUTURE_CANARY_REQUIRED');
assert(workflow.includes('Current repository-only hard block'), 'R4W_WORKFLOW_REPOSITORY_HARD_BLOCK_REQUIRED');

const futureInstallHead = 'dddddddddddddddddddddddddddddddddddddddd';
const trigger = r4w.buildFutureTriggerDescriptor({
  workflowInstallHead: futureInstallHead,
  nonce: 'repository-self-test-nonce',
  authorizationReceipt: receipt
});
assert(trigger.executionContractId === r4w.CONTRACT_ID, 'R4W_TRIGGER_DESCRIPTOR_REQUIRED');
assert(trigger.workflowInstallHead === futureInstallHead, 'R4W_TRIGGER_INSTALL_HEAD_REQUIRED');
assert(trigger.authorizationReceiptId === r4w.AUTHORIZATION_RECEIPT_ID, 'R4W_TRIGGER_RECEIPT_REQUIRED');

const validFuture = r4w.validateFutureTriggerCommit({
  trigger,
  parentHead: futureInstallHead,
  changedFiles: [r4w.FUTURE_TRIGGER_PATH],
  runAttempt: 1,
  hostedWorkflowCertified: true,
  authorizationReceipt: receipt
});
assert(validFuture.decision === 'r4w_future_trigger_valid_authority_available_for_this_attempt',
  'R4W_FUTURE_SINGLE_FILE_TRIGGER_VALIDATION_REQUIRED');
assert(validFuture.remoteExecutionAuthority === true, 'R4W_FUTURE_TRIGGER_REMOTE_AUTHORITY_REQUIRED');

const reusedAttempt = r4w.validateFutureTriggerCommit({
  trigger,
  parentHead: futureInstallHead,
  changedFiles: [r4w.FUTURE_TRIGGER_PATH],
  runAttempt: 2,
  hostedWorkflowCertified: true,
  authorizationReceipt: receipt
});
assert(reusedAttempt.decision === 'blocked_repository_only', 'R4W_SECOND_RUN_ATTEMPT_MUST_BLOCK');

const mixedCommit = r4w.validateFutureTriggerCommit({
  trigger,
  parentHead: futureInstallHead,
  changedFiles: [r4w.FUTURE_TRIGGER_PATH, 'README.md'],
  runAttempt: 1,
  hostedWorkflowCertified: true,
  authorizationReceipt: receipt
});
assert(mixedCommit.decision === 'blocked_repository_only', 'R4W_MIXED_TRIGGER_COMMIT_MUST_BLOCK');

let blockCode = null;
try {
  r4w.assertRemoteExecutionBoundaryAbsent();
} catch (error) {
  blockCode = error.code;
}
assert(blockCode === r4w.REMOTE_EXECUTION_BLOCK_CODE, 'R4W_REPOSITORY_REMOTE_BLOCK_REQUIRED');

process.stdout.write(`${JSON.stringify({
  validationId: r4w.VALIDATION_ID,
  status: result.status,
  authorizationEvidenceHead: result.authorizationEvidenceHead,
  r4tEvidenceHead: result.r4tEvidenceHead,
  authorizationReceiptId: result.authorizationReceiptId,
  futureTriggerPath: result.futureTriggerPath,
  workflowCertificationReady: result.workflowCertificationReady,
  triggerCreated: false,
  remoteExecutionAuthority: false,
  exactRootCauseProven: false,
  causalPromotionAllowed: false
})}\n`);
