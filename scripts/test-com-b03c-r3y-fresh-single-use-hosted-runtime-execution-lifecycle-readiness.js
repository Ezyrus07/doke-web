#!/usr/bin/env node
'use strict';

const fs = require('node:fs');

const r3y = require('../backend/modules/communities/community-realtime-private-auth-r3y');
const r3x = require('../backend/modules/communities/community-realtime-private-auth-r3x');
const r3v = require('../backend/modules/communities/community-realtime-private-auth-r3v');
const r3w = require('../backend/modules/communities/community-realtime-private-auth-r3w');
const r3p = require('../backend/modules/communities/community-realtime-private-auth-r3p');
const r3o = require('../backend/modules/communities/community-realtime-private-auth-r3o');
const r3k = require('../backend/modules/communities/community-realtime-private-auth-r3k');
const r3vExecutor = require('./execute-com-b03c-r3v-single-use-remote-execution-envelope');
const r3yExecutor = require('./execute-com-b03c-r3y-single-use-hosted-runtime-observation');
const r3yVerifier = require('./verify-com-b03c-r3y-single-use-hosted-runtime-observation');

const config = require('../config/com-b03c-r3y-fresh-single-use-hosted-runtime-execution-lifecycle-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R3Y-FRESH-SINGLE-USE-HOSTED-RUNTIME-EXECUTION-LIFECYCLE-READINESS.json');
const r3xEvidence = require('../docs/validation/COM-B03C-R3X-AUTHORIZED-SINGLE-FILE-TRIGGER-CREATION-READINESS.json');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function exactArray(actual, expected) {
  return Array.isArray(actual) &&
    JSON.stringify(actual.map(String)) === JSON.stringify(expected.map(String));
}

function readinessInput(overrides = {}) {
  return {
    predecessorValidationId: r3x.VALIDATION_ID,
    predecessorStatus:
      'repository_authorized_single_file_trigger_creation_certified_remote_execution_blocked',
    predecessorHead: 'c8fb12b4302af203da8d9c906878716cbf5f13e0',
    predecessorRecertRun: 31446099223,
    predecessorRecertJob: 93640563224,
    predecessorRecertSuccess: true,
    predecessorMatrixRecertRun: 31446099310,
    predecessorMatrixRecertJob: 93640563186,
    predecessorMatrixRecertSuccess: true,
    matrixVersion: '1.3.113',
    maturity: 3,
    productionGate: 'blocked',
    r3xContractId: r3x.CONTRACT_ID,
    r3vContractId: r3v.CONTRACT_ID,
    r3wContractId: r3w.CONTRACT_ID,
    r3pContractId: r3p.CONTRACT_ID,
    r3oContractId: r3o.CONTRACT_ID,
    futureTriggerPath: r3y.FUTURE_TRIGGER_PATH,
    triggerContractId: r3y.TRIGGER_CONTRACT_ID,
    reportSchema: r3y.REPORT_SCHEMA,
    lifecycleStates: [...r3y.LIFECYCLE_STATES],
    requiredTriggerKeys: [...r3y.REQUIRED_TRIGGER_KEYS],
    allowedClassifications: [...r3y.ALLOWED_CLASSIFICATIONS],

    previousAuthorizationConsumed: true,
    previousAuthorizationNonReusable: true,
    previousTriggerRemoved: true,
    previousExecutionNotAttempted: true,
    r3xPrHeadContinuityHardeningPreserved: true,
    freshAuthorizationHeadBound: true,
    freshAuthorizationDigestOnlyPersistence: true,
    freshAuthorizationSingleUse: true,
    freshAuthorizationNonReusableAfterFailure: true,
    triggerSingleFileDeltaRequired: true,
    triggerParentEqualsAuthorizationEvidenceHeadRequired: true,
    runAttemptOneRequired: true,
    exactR3vStatementFingerprintBoundToReceipt: true,
    rawOwnershipTokenPersistenceProhibited: true,
    credentialReadAfterAuthorizationOnly: true,
    dependencyLoadAfterAuthorizationOnly: true,
    projectIdentityPreflightRequired: true,
    apiKeyDiscoveryAfterAuthorizationOnly: true,
    syntheticIdentityLifecyclePrepared: true,
    sameIdentityAndTokenAcrossTwoProbes: true,
    freshRealtimeClientPerProbe: true,
    uniqueTopicPerProbe: true,
    r3vRestrictedDbAdapterReused: true,
    r3vPresenceAwareBridgeReused: true,
    r3pHarnessAndR3oClassifierReusedWithoutForking: true,
    cleanupInFinallyRequired: true,
    scopedResidueInspectionRequired: true,
    baselinePolicyRestorationCheckRequired: true,
    syntheticIdentityCleanupFinallyRequired: true,
    databaseConnectionCleanupFinallyRequired: true,
    sanitizedReportVerifierPrepared: true,
    sanitizedArtifactUploadPrepared: true,
    canaryFailurePropagatedAfterArtifact: true,
    workflowPushRestrictedToExactTriggerPath: true,
    ordinaryPullRequestRemoteJobsSkipped: true,
    repositorySelfTestPrepared: true,
    hardBlockBeforeCredentialReadPrepared: true,
    hardBlockBeforeDependencyLoadPrepared: true,
    noCausalPromotionWithoutHostedObservation: true,

    freshAuthorizationPhraseReceived: false,
    freshAuthorizationConsumed: false,
    triggerExists: false,
    credentialValuesPersisted: false,
    authorizationPlaintextPersisted: false,
    rawOwnershipTokenPersisted: false,
    remoteDependenciesLoadedDuringReadiness: false,
    networkAccessActivatedDuringReadiness: false,
    databaseConnectionActivatedDuringReadiness: false,
    sqlExecutionActivatedDuringReadiness: false,
    realtimeClientActivatedDuringReadiness: false,
    stagingReadActivatedDuringReadiness: false,
    stagingMutationActivatedDuringReadiness: false,
    authIdentityMutationActivatedDuringReadiness: false,
    runtimePolicyChangeAuthorized: false,
    productionPrepared: false,
    mergePrepared: false,
    ...overrides
  };
}

function assertConfigAndEvidence() {
  if (config.validationId !== r3y.VALIDATION_ID || config.contractId !== r3y.CONTRACT_ID) {
    fail('R3Y_CONFIG_CONTRACT_MISMATCH');
  }
  if (
    config.matrixVersion !== '1.3.113' ||
    config.maturity !== 3 ||
    config.productionGate !== 'blocked'
  ) {
    fail('R3Y_CONFIG_MATRIX_STATE_INVALID');
  }
  if (
    config.predecessor?.head !== r3y.PREDECESSOR_HEAD ||
    config.predecessor?.recertRun !== r3y.PREDECESSOR_RECERT_RUN ||
    config.predecessor?.recertJob !== r3y.PREDECESSOR_RECERT_JOB ||
    config.predecessor?.matrixRecertRun !== r3y.PREDECESSOR_MATRIX_RECERT_RUN ||
    config.predecessor?.matrixRecertJob !== r3y.PREDECESSOR_MATRIX_RECERT_JOB
  ) {
    fail('R3Y_CONFIG_PREDECESSOR_INVALID');
  }
  if (
    config.predecessor?.previousAuthorizationConsumed !== true ||
    config.predecessor?.previousAuthorizationReusable !== false ||
    config.predecessor?.previousTriggerExists !== false ||
    config.predecessor?.previousStagingExecutionAttempted !== false
  ) {
    fail('R3Y_PREVIOUS_AUTHORIZATION_TERMINAL_STATE_INVALID');
  }
  if (
    evidence.validationId !== r3y.VALIDATION_ID ||
    evidence.contractId !== r3y.CONTRACT_ID ||
    evidence.exactRootCauseProven !== false ||
    evidence.causalPromotionAllowed !== false
  ) {
    fail('R3Y_EVIDENCE_CONTRACT_INVALID');
  }
  for (const value of Object.values(evidence.effects || {})) {
    if (value !== false) fail('R3Y_EVIDENCE_REMOTE_EFFECT_DETECTED');
  }
  if (
    r3xEvidence.authorizationReceipt?.consumed !== true ||
    r3xEvidence.authorizationReceipt?.reusable !== false ||
    r3xEvidence.trigger?.exists !== false ||
    r3xEvidence.effects?.stagingAccessExecuted !== false
  ) {
    fail('R3Y_R3X_TERMINAL_EVIDENCE_INVALID');
  }
}


function assertCertificationHistory() {
  if (
    evidence.status !== 'repository_fresh_single_use_hosted_runtime_execution_lifecycle_certified_authorization_absent' ||
    evidence.initialBoundaryCommit !== 'ce354069fb3db45deaad111167d3bfd128d2ceaa'
  ) {
    fail('R3Y_EVIDENCE_CERTIFIED_STATUS_INVALID');
  }
  const initial = evidence.certificationHistory?.initialFailClosed;
  if (
    initial?.head !== 'ce354069fb3db45deaad111167d3bfd128d2ceaa' ||
    initial?.r3yRun !== 31447388164 ||
    initial?.r3yJob !== 93644421183 ||
    initial?.failedStep !== 'Domain Completion Matrix' ||
    initial?.lifecycleReadinessPassed !== true ||
    initial?.executorRepositorySelfTestPassed !== true ||
    initial?.preAuthorizationHardBlockPassed !== true ||
    initial?.authorizeSkipped !== true ||
    initial?.canarySkipped !== true
  ) {
    fail('R3Y_INITIAL_FAIL_CLOSED_EVIDENCE_INVALID');
  }
  const matrix = evidence.certificationHistory?.canonicalMatrixReconciliation;
  if (
    matrix?.writerInstallHead !== '1c11825119cd5d933ca9acaec1802e0028782405' ||
    matrix?.writerRun !== 31447567336 ||
    matrix?.writerJob !== 93644948351 ||
    matrix?.writerOutputCommit !== 'd3cced113eabac724518ea31a86a24c8d162ac46' ||
    matrix?.workflowRestoredHead !== '21ea075af90d6c2e763bfb2283173d336bf9808d' ||
    matrix?.workflowRestoredBlob !== '299108d86dc097ba090392ebe9f218f6849e74ad' ||
    matrix?.matrixSourceChanged !== false
  ) {
    fail('R3Y_MATRIX_RECONCILIATION_EVIDENCE_INVALID');
  }
  const normal = evidence.certificationHistory?.normalHeadCertification;
  if (
    normal?.head !== '21ea075af90d6c2e763bfb2283173d336bf9808d' ||
    normal?.r3yRun !== 31447634335 ||
    normal?.r3yJob !== 93645173765 ||
    normal?.matrixRun !== 31447634287 ||
    normal?.matrixJob !== 93645147086 ||
    normal?.r3yConclusion !== 'success' ||
    normal?.matrixConclusion !== 'success' ||
    normal?.authorizeSkipped !== true ||
    normal?.canarySkipped !== true
  ) {
    fail('R3Y_NORMAL_HEAD_CERTIFICATION_EVIDENCE_INVALID');
  }
}

function assertReadiness() {
  const ready = r3y.evaluateRepositoryReadiness(readinessInput());
  if (
    ready.decision !==
      'repository_fresh_single_use_hosted_runtime_execution_lifecycle_ready_authorization_absent'
  ) {
    console.error(ready);
    fail('R3Y_READINESS_POSITIVE_PATH_FAILED');
  }

  const required = [
    'previousAuthorizationConsumed',
    'previousAuthorizationNonReusable',
    'previousTriggerRemoved',
    'previousExecutionNotAttempted',
    'r3xPrHeadContinuityHardeningPreserved',
    'freshAuthorizationHeadBound',
    'freshAuthorizationDigestOnlyPersistence',
    'freshAuthorizationSingleUse',
    'freshAuthorizationNonReusableAfterFailure',
    'triggerSingleFileDeltaRequired',
    'triggerParentEqualsAuthorizationEvidenceHeadRequired',
    'runAttemptOneRequired',
    'exactR3vStatementFingerprintBoundToReceipt',
    'rawOwnershipTokenPersistenceProhibited',
    'credentialReadAfterAuthorizationOnly',
    'dependencyLoadAfterAuthorizationOnly',
    'projectIdentityPreflightRequired',
    'apiKeyDiscoveryAfterAuthorizationOnly',
    'syntheticIdentityLifecyclePrepared',
    'sameIdentityAndTokenAcrossTwoProbes',
    'freshRealtimeClientPerProbe',
    'uniqueTopicPerProbe',
    'r3vRestrictedDbAdapterReused',
    'r3vPresenceAwareBridgeReused',
    'r3pHarnessAndR3oClassifierReusedWithoutForking',
    'cleanupInFinallyRequired',
    'scopedResidueInspectionRequired',
    'baselinePolicyRestorationCheckRequired',
    'syntheticIdentityCleanupFinallyRequired',
    'databaseConnectionCleanupFinallyRequired',
    'sanitizedReportVerifierPrepared',
    'sanitizedArtifactUploadPrepared',
    'canaryFailurePropagatedAfterArtifact',
    'workflowPushRestrictedToExactTriggerPath',
    'ordinaryPullRequestRemoteJobsSkipped',
    'repositorySelfTestPrepared',
    'hardBlockBeforeCredentialReadPrepared',
    'hardBlockBeforeDependencyLoadPrepared',
    'noCausalPromotionWithoutHostedObservation'
  ];
  for (const flag of required) {
    const result = r3y.evaluateRepositoryReadiness(readinessInput({ [flag]: false }));
    if (result.decision !== 'blocked_repository_only' || result.flag !== flag) {
      fail(`R3Y_REQUIRED_FLAG_FAIL_CLOSED_${flag}`);
    }
  }

  const prohibited = [
    'freshAuthorizationPhraseReceived',
    'freshAuthorizationConsumed',
    'triggerExists',
    'credentialValuesPersisted',
    'authorizationPlaintextPersisted',
    'rawOwnershipTokenPersisted',
    'remoteDependenciesLoadedDuringReadiness',
    'networkAccessActivatedDuringReadiness',
    'databaseConnectionActivatedDuringReadiness',
    'sqlExecutionActivatedDuringReadiness',
    'realtimeClientActivatedDuringReadiness',
    'stagingReadActivatedDuringReadiness',
    'stagingMutationActivatedDuringReadiness',
    'authIdentityMutationActivatedDuringReadiness',
    'runtimePolicyChangeAuthorized',
    'productionPrepared',
    'mergePrepared'
  ];
  for (const flag of prohibited) {
    const result = r3y.evaluateRepositoryReadiness(readinessInput({ [flag]: true }));
    if (result.decision !== 'blocked_repository_only' || result.flag !== flag) {
      fail(`R3Y_PROHIBITED_FLAG_FAIL_CLOSED_${flag}`);
    }
  }
}

function assertAuthorizationLifecycle() {
  const head = '1111111111111111111111111111111111111111';
  const phrase = r3y.buildAuthorizationPhrase(head);
  if (!phrase.endsWith(head) || phrase !== `${r3y.AUTHORIZATION_PREFIX}${head}`) {
    fail('R3Y_AUTHORIZATION_PHRASE_FACTORY_INVALID');
  }

  const wrong = r3y.evaluateExplicitAuthorization({
    certifiedLifecycleHead: head,
    authorizationPhrase: `${phrase}x`,
    authorizationConsumed: false,
    executionAttempted: false,
    targetEnvironment: 'staging',
    projectId: r3y.REQUIRED_PROJECT_ID,
    branch: r3y.REQUIRED_BRANCH,
    pullRequest: r3y.REQUIRED_PULL_REQUEST
  });
  if (wrong.decision !== 'blocked_repository_only') {
    fail('R3Y_WRONG_AUTHORIZATION_NOT_BLOCKED');
  }

  const received = r3y.evaluateExplicitAuthorization({
    certifiedLifecycleHead: head,
    authorizationPhrase: phrase,
    authorizationConsumed: false,
    executionAttempted: false,
    targetEnvironment: 'staging',
    projectId: r3y.REQUIRED_PROJECT_ID,
    branch: r3y.REQUIRED_BRANCH,
    pullRequest: r3y.REQUIRED_PULL_REQUEST
  });
  if (
    received.decision !==
      'fresh_head_bound_single_use_authorization_received_trigger_creation_only' ||
    received.authorizationConsumed !== false ||
    received.remoteExecutionAuthority !== false
  ) {
    fail('R3Y_AUTHORIZATION_RECEIPT_INVALID');
  }

  const consumed = r3y.consumeAuthorizationForTrigger(received);
  if (
    consumed.decision !== 'fresh_authorization_consumed_trigger_creation_pending' ||
    consumed.authorizationConsumed !== true ||
    consumed.reusableAfterFailure !== false
  ) {
    fail('R3Y_AUTHORIZATION_CONSUMPTION_INVALID');
  }

  const secondConsumption = r3y.consumeAuthorizationForTrigger(consumed);
  if (secondConsumption.decision !== 'blocked_repository_only') {
    fail('R3Y_SECOND_AUTHORIZATION_CONSUMPTION_NOT_BLOCKED');
  }

  const oldReceipt = r3x.buildAuthorizationReceipt();
  const oldReuse = r3y.consumeAuthorizationForTrigger(oldReceipt);
  if (oldReuse.decision !== 'blocked_repository_only') {
    fail('R3Y_PREVIOUS_AUTHORIZATION_REUSE_NOT_BLOCKED');
  }

  const trigger = r3y.buildFutureTriggerDescriptor({
    certifiedLifecycleHead: head,
    authorizationReceiptId: consumed.authorizationReceiptId
  });
  const binding = r3y.buildExecutionBinding(consumed.authorizationReceiptId);
  if (
    trigger.workflowInstallHead !== head ||
    trigger.authorizationEvidenceHead !== head ||
    trigger.statementFingerprint !== binding.statementFingerprint ||
    trigger.statementCount !== 21 ||
    trigger.ownershipDigest !== binding.ownershipDigest
  ) {
    fail('R3Y_TRIGGER_DESCRIPTOR_BINDING_INVALID');
  }

  const valid = r3y.validateFutureTriggerCommit({
    trigger,
    parentHead: head,
    changedFiles: [r3y.FUTURE_TRIGGER_PATH],
    runAttempt: 1,
    authorizationReceipt: consumed
  });
  if (
    valid.decision !==
      'fresh_trigger_commit_valid_execution_authority_available_for_this_attempt'
  ) {
    fail('R3Y_TRIGGER_POSITIVE_PATH_INVALID');
  }

  const authorized = r3y.authorizeExecution({
    trigger,
    parentHead: head,
    changedFiles: [r3y.FUTURE_TRIGGER_PATH],
    runAttempt: 1,
    authorizationReceipt: consumed
  });
  if (
    authorized.decision !== r3y.AUTHORIZED_DECISION ||
    authorized.remoteExecutionAuthority !== true ||
    authorized.productionAuthority !== false ||
    authorized.pullRequestMergeAuthority !== false
  ) {
    fail('R3Y_EXECUTION_AUTHORITY_POSITIVE_PATH_INVALID');
  }

  const negatives = [
    { parentHead: '2222222222222222222222222222222222222222' },
    { changedFiles: [r3y.FUTURE_TRIGGER_PATH, 'README.md'] },
    { runAttempt: 2 }
  ];
  for (const negative of negatives) {
    const result = r3y.validateFutureTriggerCommit({
      trigger,
      parentHead: head,
      changedFiles: [r3y.FUTURE_TRIGGER_PATH],
      runAttempt: 1,
      authorizationReceipt: consumed,
      ...negative
    });
    if (result.decision !== 'blocked_repository_only') {
      fail('R3Y_TRIGGER_NEGATIVE_CASE_NOT_BLOCKED');
    }
  }
}

function assertWorkflowAndSourceGuards() {
  const workflowPath =
    '.github/workflows/com-b03c-r3y-fresh-single-use-hosted-runtime-execution-lifecycle.yml';
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  const executorSource = fs.readFileSync(
    'scripts/execute-com-b03c-r3y-single-use-hosted-runtime-observation.js',
    'utf8'
  );

  if (!workflow.includes("permissions: { contents: read }")) {
    fail('R3Y_WORKFLOW_CONTENTS_READ_REQUIRED');
  }
  if (
    !workflow.includes("push:") ||
    !workflow.includes("config/com-b03c-r3y-single-use-hosted-runtime-observation-trigger.json")
  ) {
    fail('R3Y_WORKFLOW_TRIGGER_PATH_REQUIRED');
  }
  if (
    !workflow.includes("if: github.event_name == 'push'") ||
    !workflow.includes('needs: authorize') ||
    !workflow.includes('environment: doke-staging')
  ) {
    fail('R3Y_WORKFLOW_REMOTE_JOB_GATING_INVALID');
  }
  if (
    !workflow.includes('${{ secrets.SUPABASE_ACCESS_TOKEN }}') ||
    !workflow.includes('${{ secrets.SUPABASE_DB_PASSWORD }}')
  ) {
    fail('R3Y_WORKFLOW_STAGING_SECRET_CONTRACT_REQUIRED');
  }
  if (workflow.includes('COM_B03C_R3Y_AUTHORIZATION:')) {
    fail('R3Y_WORKFLOW_AUTHORIZATION_PLAINTEXT_PERSISTED');
  }

  const executeIndex = executorSource.indexOf(
    'async function executeAuthorizedStaging'
  );
  const authIndex = executorSource.indexOf(
    'authorization = assertAuthorizedExecution({',
    executeIndex
  );
  const runtimeIndex = executorSource.indexOf(
    'const runtime = prepareRemoteRuntime({',
    authIndex
  );
  const requireIndex = executorSource.indexOf('require(name)', runtimeIndex);
  if (
    executeIndex < 0 ||
    authIndex <= executeIndex ||
    runtimeIndex <= authIndex ||
    requireIndex <= runtimeIndex
  ) {
    fail('R3Y_EXECUTOR_AUTHORIZATION_BEFORE_DEPENDENCY_LOAD_INVALID');
  }
  if (
    !executorSource.includes('finally {') ||
    !executorSource.includes('identity.admin.deleteUser(identity.userId)') ||
    !executorSource.includes('connection.pool.end()') ||
    !executorSource.includes('db.inspectResidue()') ||
    !executorSource.includes('baselineRestored = policiesEqual(') ||
    !executorSource.includes('r3p.runSyntheticObservationHarness({')
  ) {
    fail('R3Y_EXECUTOR_CLEANUP_OR_CLASSIFIER_CONTINUITY_INVALID');
  }

  if (fs.existsSync(r3y.FUTURE_TRIGGER_PATH)) {
    fail('R3Y_TRIGGER_MUST_BE_ABSENT_AT_READINESS');
  }
}

function sampleVerifiedReport() {
  const head = '1111111111111111111111111111111111111111';
  const receiptId = r3y.deriveAuthorizationReceiptId(head);
  const binding = r3y.buildExecutionBinding(receiptId);
  return {
    reportSchema: r3y.REPORT_SCHEMA,
    validationId: 'COM-B03C-R3Y-SINGLE-USE-HOSTED-RUNTIME-OBSERVATION',
    contractId: r3y.CONTRACT_ID,
    target: {
      environment: 'staging',
      projectId: r3y.REQUIRED_PROJECT_ID,
      projectName: r3y.REQUIRED_PROJECT_NAME,
      branch: r3y.REQUIRED_BRANCH,
      pullRequest: r3y.REQUIRED_PULL_REQUEST
    },
    singleUse: true,
    reusableAfterFailure: false,
    runAttempt: 1,
    authorizationEvidenceHead: head,
    authorizationReceiptId: receiptId,
    r3vContractId: r3v.CONTRACT_ID,
    statementFingerprint: binding.statementFingerprint,
    statementCount: 21,
    ownershipDigest: binding.ownershipDigest,
    rawOwnershipTokenPersisted: false,
    authorizationPlaintextPersisted: false,
    credentialValuesPersisted: false,
    rawAccessTokenPersisted: false,
    projectPreflight: {
      id: r3y.REQUIRED_PROJECT_ID,
      name: r3y.REQUIRED_PROJECT_NAME,
      status: 'ACTIVE_HEALTHY',
      region: 'sa-east-1'
    },
    identityCreated: true,
    identityCleanupAttempted: true,
    identityCleanupSucceeded: true,
    instrumentationInstalled: true,
    cleanupAttempted: true,
    cleanupFailure: null,
    residueCounts: {
      policyCount: 0,
      functionCount: 0,
      sequenceCount: 0
    },
    zeroResidueProven: true,
    baselinePolicySnapshotComplete: true,
    baselineRestored: true,
    classification: 'hosted_runtime_observation_matches_pinned_presence_path',
    observation: {
      anchorJoinSubscribed: true,
      anchorBroadcastEvaluationObserved: true,
      anchorPresenceEvaluationObserved: true,
      anchorPresenceStateObserved: true,
      presenceOnlyBroadcastEvaluationObserved: false,
      presenceOnlyPresenceEvaluationObserved: true,
      presenceOnlyJoinSubscribed: true
    },
    deltas: {
      presence_read_effective_gate: {
        broadcast_rls_evaluations: 1,
        presence_rls_evaluations: 1
      },
      presence_only_join: {
        broadcast_rls_evaluations: 0,
        presence_rls_evaluations: 1
      }
    },
    executionFailure: null,
    hostedRuntimeObservationExecuted: true,
    rawRemoteErrorExposed: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    runtimePolicyChangeExecuted: false,
    productionExecuted: false,
    mergeExecuted: false
  };
}

async function main() {
  assertConfigAndEvidence();
  assertCertificationHistory();
  assertReadiness();
  assertAuthorizationLifecycle();
  assertWorkflowAndSourceGuards();

  const verified = r3yVerifier.verifyReport(sampleVerifiedReport());
  if (
    verified.zeroResidueProven !== true ||
    verified.baselineRestored !== true ||
    verified.identityCleanupSucceeded !== true
  ) {
    fail('R3Y_SANITIZED_REPORT_VERIFIER_POSITIVE_PATH_INVALID');
  }

  const forbidden = sampleVerifiedReport();
  forbidden.credentials = { leaked: true };
  let forbiddenRejected = false;
  try {
    r3yVerifier.verifyReport(forbidden);
  } catch (error) {
    forbiddenRejected =
      error?.code === 'DOKE_COM_B03C_R3Y_REPORT_FORBIDDEN_SECRET_FIELD';
  }
  if (!forbiddenRejected) fail('R3Y_SANITIZED_REPORT_SECRET_GUARD_INVALID');

  const executorSelfTest = await r3yExecutor.repositorySelfTest();
  if (
    executorSelfTest.credentialReadsBeforeAuthorization !== 0 ||
    executorSelfTest.dependencyLoadsBeforeAuthorization !== 0 ||
    executorSelfTest.r3vFailureCleanupVerified !== true ||
    executorSelfTest.r3vZeroResidueProven !== true ||
    executorSelfTest.stagingAccess !== false ||
    executorSelfTest.networkAccess !== false
  ) {
    fail('R3Y_EXECUTOR_REPOSITORY_SELF_TEST_INVALID');
  }

  const r3vSelfTest = await r3vExecutor.repositorySelfTest();
  if (
    r3vSelfTest.zeroResidueProven !== true ||
    r3vSelfTest.failureCleanupVerified !== true
  ) {
    fail('R3Y_R3V_SELF_TEST_CONTINUITY_INVALID');
  }

  process.stdout.write(`${JSON.stringify({
    contractId: r3y.CONTRACT_ID,
    decision:
      'repository_fresh_single_use_hosted_runtime_execution_lifecycle_ready_authorization_absent',
    previousAuthorizationConsumed: true,
    previousAuthorizationReusable: false,
    futureTriggerPath: r3y.FUTURE_TRIGGER_PATH,
    triggerExists: false,
    freshAuthorizationReceived: false,
    executorRepositorySelfTest: true,
    sanitizedReportVerifier: true,
    r3vExecutionMechanicsReused: true,
    stagingAccess: false,
    remoteCredentialRead: false,
    remoteDependencyLoad: false,
    networkAccess: false,
    production: false,
    merge: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${String(error?.code || error?.message || 'R3Y_TEST_FAILURE')}\n`);
  process.exitCode = 1;
});
