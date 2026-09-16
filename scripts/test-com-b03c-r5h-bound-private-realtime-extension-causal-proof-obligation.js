#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const config = require('../config/com-b03c-r5h-bound-private-realtime-extension-causal-proof-obligation.json');

const CONFIG_PATH = 'config/com-b03c-r5h-bound-private-realtime-extension-causal-proof-obligation.json';
const CONFIG_BLOB = '0f59265ecb6ff8c36c2e42780c171896f21c7d6a';
const R3L_PATH = 'docs/validation/COM-B03C-R3L-EVALUATION-CONTEXT-DIFFERENTIAL-PRESENCE-STAGING-SUMMARY.json';
const R3L_BLOB = '05cca2fb472f48b11850d116ce3666523209abb4';
const R5D_PATH = 'docs/validation/COM-B03C-R5D-CORRECTED-TERMINAL-OBSERVATION-HOSTED-EXECUTION.json';
const R5D_BLOB = '2e0e0d0d5026daee6dc64ce057e449dd92cf13c8';

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function assertEqual(actual, expected, code) {
  if (actual !== expected) fail(code);
}

function blobAt(path) {
  return childProcess.execFileSync('git', ['rev-parse', `HEAD:${path}`], { encoding: 'utf8' }).trim();
}

function assertFrozenEvidence() {
  assertEqual(blobAt(CONFIG_PATH), CONFIG_BLOB, 'DOKE_COM_B03C_EXTENSION_PROOF_CONFIG_BLOB_DRIFT');
  assertEqual(blobAt(R3L_PATH), R3L_BLOB, 'DOKE_COM_B03C_EXTENSION_PROOF_R3L_BLOB_DRIFT');
  assertEqual(blobAt(R5D_PATH), R5D_BLOB, 'DOKE_COM_B03C_EXTENSION_PROOF_R5D_BLOB_DRIFT');
}

function assertRepositoryContext() {
  assertEqual(config.contractId, 'com-b03c-r5h-bound-private-realtime-extension-causal-proof-obligation-v1', 'DOKE_COM_B03C_EXTENSION_PROOF_CONTRACT_DRIFT');
  assertEqual(config.validationId, 'COM-B03C-R5H-BOUND-PRIVATE-REALTIME-EXTENSION-CAUSAL-PROOF-OBLIGATION', 'DOKE_COM_B03C_EXTENSION_PROOF_VALIDATION_ID_DRIFT');
  assertEqual(config.status, 'repository_r5h_bound_private_realtime_extension_causal_proof_obligation_defined_no_remote_authority', 'DOKE_COM_B03C_EXTENSION_PROOF_STATUS_DRIFT');
  assertEqual(config.repositoryContext.repository, 'Ezyrus07/doke-web', 'DOKE_COM_B03C_EXTENSION_PROOF_REPOSITORY_DRIFT');
  assertEqual(config.repositoryContext.pullRequest, 61, 'DOKE_COM_B03C_EXTENSION_PROOF_PR_DRIFT');
  assertEqual(config.repositoryContext.branch, 'com/com-001-baseline-audit', 'DOKE_COM_B03C_EXTENSION_PROOF_BRANCH_DRIFT');
  assertEqual(config.repositoryContext.base, 'rep/rep-001-baseline-audit', 'DOKE_COM_B03C_EXTENSION_PROOF_BASE_DRIFT');
  assertEqual(config.repositoryContext.repositoryBaselineHead, 'b8f6f94443434bae4c75f7bcbc7239011702a6c5', 'DOKE_COM_B03C_EXTENSION_PROOF_BASELINE_HEAD_DRIFT');
  assertEqual(config.repositoryContext.repositoryBaselineTree, '9d19aeb06cd81f434c90d82cf5de5dfe37baa352', 'DOKE_COM_B03C_EXTENSION_PROOF_BASELINE_TREE_DRIFT');
  assertEqual(config.repositoryContext.matrixVersion, '1.3.113', 'DOKE_COM_B03C_EXTENSION_PROOF_MATRIX_VERSION_DRIFT');
  assertEqual(config.repositoryContext.maturity, 3, 'DOKE_COM_B03C_EXTENSION_PROOF_MATURITY_DRIFT');
  assertEqual(config.repositoryContext.productionGate, 'blocked', 'DOKE_COM_B03C_EXTENSION_PROOF_PRODUCTION_GATE_DRIFT');
}

function assertFunctionalCheckpointPreserved() {
  const checkpoint = config.functionalCheckpoint;
  assertEqual(checkpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H', 'DOKE_COM_B03C_EXTENSION_PROOF_R5H_CHECKPOINT_REQUIRED');
  assertEqual(checkpoint.r5hCertifiedHead, 'a06de307f580c6b787a4c233a342a28a751f3621', 'DOKE_COM_B03C_EXTENSION_PROOF_R5H_HEAD_DRIFT');
  assertEqual(checkpoint.r5hCertifiedTree, '6ef6a16772785200b1ddf0564b01b7da5d55abe5', 'DOKE_COM_B03C_EXTENSION_PROOF_R5H_TREE_DRIFT');
  assertEqual(checkpoint.r5hCertificationRun, 31852587738, 'DOKE_COM_B03C_EXTENSION_PROOF_R5H_RUN_DRIFT');
  assertEqual(checkpoint.r5hCertificationJob, 94931027687, 'DOKE_COM_B03C_EXTENSION_PROOF_R5H_JOB_DRIFT');
  assertEqual(checkpoint.r5iCreated, false, 'DOKE_COM_B03C_EXTENSION_PROOF_R5I_MUST_NOT_EXIST');
  assertEqual(checkpoint.r5iInferred, false, 'DOKE_COM_B03C_EXTENSION_PROOF_R5I_MUST_NOT_BE_INFERRED');
}

function assertCausalEvidence() {
  const r3l = config.causalEvidence.r3l;
  assertEqual(r3l.path, R3L_PATH, 'DOKE_COM_B03C_EXTENSION_PROOF_R3L_PATH_DRIFT');
  assertEqual(r3l.blob, R3L_BLOB, 'DOKE_COM_B03C_EXTENSION_PROOF_R3L_CONFIG_BLOB_DRIFT');
  assertEqual(r3l.run, 31388916899, 'DOKE_COM_B03C_EXTENSION_PROOF_R3L_RUN_DRIFT');
  const expectedSubscribed = ['control_true', 'uid_helper_direct', 'topic_helper_direct', 'row_topic_direct'];
  assertEqual(JSON.stringify(r3l.subscribedCaseIds), JSON.stringify(expectedSubscribed), 'DOKE_COM_B03C_EXTENSION_PROOF_R3L_SUBSCRIBED_CASES_DRIFT');
  assertEqual(r3l.extensionDirectRejected, true, 'DOKE_COM_B03C_EXTENSION_PROOF_EXTENSION_DIRECT_REJECTION_REQUIRED');
  assertEqual(r3l.allTestedPresenceExtensionPredicateCasesRejected, true, 'DOKE_COM_B03C_EXTENSION_PROOF_EXTENSION_PREDICATE_REJECTION_REQUIRED');
  assertEqual(r3l.exactRootCauseProven, false, 'DOKE_COM_B03C_EXTENSION_PROOF_R3L_ROOT_CAUSE_MUST_REMAIN_FALSE');
  assertEqual(r3l.causalPromotionAllowed, false, 'DOKE_COM_B03C_EXTENSION_PROOF_R3L_PROMOTION_MUST_REMAIN_FALSE');

  const r5d = config.causalEvidence.r5dHostedExecution;
  assertEqual(r5d.path, R5D_PATH, 'DOKE_COM_B03C_EXTENSION_PROOF_R5D_PATH_DRIFT');
  assertEqual(r5d.blob, R5D_BLOB, 'DOKE_COM_B03C_EXTENSION_PROOF_R5D_CONFIG_BLOB_DRIFT');
  assertEqual(r5d.run, 31916760689, 'DOKE_COM_B03C_EXTENSION_PROOF_R5D_RUN_DRIFT');
  assertEqual(r5d.runAttempt, 1, 'DOKE_COM_B03C_EXTENSION_PROOF_R5D_ATTEMPT_DRIFT');
  assertEqual(r5d.terminalStatus, 'CHANNEL_ERROR', 'DOKE_COM_B03C_EXTENSION_PROOF_R5D_TERMINAL_STATUS_DRIFT');
  assertEqual(r5d.joinSubscribed, false, 'DOKE_COM_B03C_EXTENSION_PROOF_R5D_JOIN_STATUS_DRIFT');
  assertEqual(r5d.sanitizedJoinClassification, 'realtime_rls_authorization_rejected', 'DOKE_COM_B03C_EXTENSION_PROOF_R5D_CLASSIFICATION_DRIFT');
  assertEqual(r5d.zeroResidueProven, true, 'DOKE_COM_B03C_EXTENSION_PROOF_R5D_ZERO_RESIDUE_REQUIRED');
  assertEqual(r5d.exactRootCauseProven, false, 'DOKE_COM_B03C_EXTENSION_PROOF_R5D_ROOT_CAUSE_MUST_REMAIN_FALSE');
  assertEqual(r5d.causalPromotionAllowed, false, 'DOKE_COM_B03C_EXTENSION_PROOF_R5D_PROMOTION_MUST_REMAIN_FALSE');
  assertEqual(r5d.rerunForbidden, true, 'DOKE_COM_B03C_EXTENSION_PROOF_R5D_RERUN_MUST_REMAIN_FORBIDDEN');
  assertEqual(r5d.receiptReuseForbidden, true, 'DOKE_COM_B03C_EXTENSION_PROOF_R5D_RECEIPT_REUSE_MUST_REMAIN_FORBIDDEN');
  assertEqual(r5d.triggerRecreationForbidden, true, 'DOKE_COM_B03C_EXTENSION_PROOF_R5D_TRIGGER_RECREATION_MUST_REMAIN_FORBIDDEN');
}

function assertProofObligation() {
  const proof = config.proofObligation;
  assertEqual(proof.evaluationSurface, 'realtime.messages.extension', 'DOKE_COM_B03C_EXTENSION_PROOF_SURFACE_DRIFT');
  assertEqual(proof.casesAreMutuallyExclusive, true, 'DOKE_COM_B03C_EXTENSION_PROOF_CASES_MUST_BE_EXCLUSIVE');
  assertEqual(proof.casesAreCollectivelyExhaustiveForExtensionValueClassification, true, 'DOKE_COM_B03C_EXTENSION_PROOF_CASES_MUST_BE_EXHAUSTIVE');
  const expectedCases = [
    { id: 'extension_is_null', predicate: 'extension IS NULL', classification: 'extension_unavailable_or_null' },
    { id: 'extension_equals_presence', predicate: "extension = 'presence'", classification: 'extension_expected_presence_value' },
    { id: 'extension_non_null_not_presence', predicate: "extension IS NOT NULL AND extension <> 'presence'", classification: 'extension_unexpected_non_null_value' }
  ];
  assertEqual(JSON.stringify(proof.cases), JSON.stringify(expectedCases), 'DOKE_COM_B03C_EXTENSION_PROOF_CASE_SET_DRIFT');
  assertEqual(proof.resultMustRemainObservational, true, 'DOKE_COM_B03C_EXTENSION_PROOF_MUST_REMAIN_OBSERVATIONAL');
  assertEqual(proof.terminalStatusAloneCannotProveCause, true, 'DOKE_COM_B03C_EXTENSION_PROOF_TERMINAL_STATUS_CAUSAL_GUARD_REQUIRED');
  assertEqual(proof.exactRootCauseProven, false, 'DOKE_COM_B03C_EXTENSION_PROOF_ROOT_CAUSE_MUST_REMAIN_FALSE');
  assertEqual(proof.causalPromotionAllowed, false, 'DOKE_COM_B03C_EXTENSION_PROOF_CAUSAL_PROMOTION_MUST_REMAIN_FALSE');
  assertEqual(proof.privatePresencePromotionAllowed, false, 'DOKE_COM_B03C_EXTENSION_PROOF_PRESENCE_PROMOTION_MUST_REMAIN_FALSE');
  assertEqual(proof.privateTypingBroadcastProven, false, 'DOKE_COM_B03C_EXTENSION_PROOF_TYPING_BROADCAST_MUST_REMAIN_UNPROVEN');
  assertEqual(proof.channelMessagesCanonicalRemoteAuthority, false, 'DOKE_COM_B03C_EXTENSION_PROOF_CHANNEL_MESSAGES_AUTHORITY_MUST_REMAIN_FALSE');
}

function assertGovernanceFailClosed() {
  const governance = config.governance;
  const requiredTrue = [
    'repositoryOnlyDefinition',
    'priorAuthorizationReuseForbidden',
    'priorReceiptReuseForbidden',
    'priorTriggerRecreationForbidden',
    'futureRemoteProbeRequiresSeparateCertifiedExecutionBoundary',
    'futureRemoteProbeRequiresFreshExplicitSingleUseAuthorization',
    'futureAuthorizationMustBindExactCertifiedHeadAndResource'
  ];
  for (const key of requiredTrue) assertEqual(governance[key], true, `DOKE_COM_B03C_EXTENSION_PROOF_${key.toUpperCase()}_REQUIRED`);

  const requiredFalse = [
    'executionBoundaryDefined',
    'triggerCreated',
    'receiptCreated',
    'executionAttempted',
    'remoteExecutionAuthority',
    'remoteCredentialReadAuthority',
    'remoteDependencyLoadAuthority',
    'networkAuthority',
    'stagingReadAuthority',
    'stagingMutationAuthority',
    'realtimeSubscriptionAuthority',
    'authIdentityLifecycleAuthority',
    'runtimeChangeAuthority',
    'productionAuthority',
    'pullRequestMergeAuthority',
    'readyForReviewAuthority',
    'genericContinuationGrantsRemoteAuthority'
  ];
  for (const key of requiredFalse) assertEqual(governance[key], false, `DOKE_COM_B03C_EXTENSION_PROOF_${key.toUpperCase()}_MUST_REMAIN_FALSE`);
}

function main() {
  assertFrozenEvidence();
  assertRepositoryContext();
  assertFunctionalCheckpointPreserved();
  assertCausalEvidence();
  assertProofObligation();
  assertGovernanceFailClosed();

  process.stdout.write(`${JSON.stringify({
    validationId: config.validationId,
    contractId: config.contractId,
    status: 'repository_r5h_bound_private_realtime_extension_causal_proof_obligation_certifiable_no_remote_authority',
    evaluationSurface: config.proofObligation.evaluationSurface,
    caseIds: config.proofObligation.cases.map((item) => item.id),
    lastFunctionalCheckpoint: config.functionalCheckpoint.lastFunctionalCheckpoint,
    r5iCreated: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    executionBoundaryDefined: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  })}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_EXTENSION_PROOF_TEST_FAILURE')}\n`);
  process.exitCode = 1;
}
