#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

const boundary = require('../backend/modules/communities/community-realtime-private-auth-r5d-hosted-execution');
const r5d = require('../backend/modules/communities/community-realtime-private-auth-r5d');
const r5h = require('../backend/modules/communities/community-realtime-private-auth-r5h');
const config = require('../config/com-b03c-r5d-corrected-terminal-observation-hosted-execution-boundary.json');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function blobAt(ref, file) {
  return childProcess.execFileSync('git', ['rev-parse', `${ref}:${file}`], { encoding: 'utf8' }).trim();
}

function fileExists(file) {
  return fs.existsSync(path.resolve(file));
}

function assertRepositoryReadiness() {
  const result = boundary.evaluateRepositoryReadiness(config.readinessInput);
  if (result.decision !== boundary.STATUS) fail('DOKE_COM_B03C_R5D_HOSTED_READINESS_REQUIRED');
  if (
    result.hostedExecutionBoundaryReady !== true ||
    result.remoteExecutionAuthority !== false ||
    result.stagingReadAuthority !== false ||
    result.stagingMutationAuthority !== false ||
    result.exactRootCauseProven !== false ||
    result.causalPromotionAllowed !== false
  ) {
    fail('DOKE_COM_B03C_R5D_HOSTED_REPOSITORY_ONLY_AUTHORITY_REQUIRED');
  }
  return result;
}

function assertFrozenLineage() {
  if (blobAt('HEAD', 'backend/modules/communities/community-realtime-private-auth-r5h.js') !== boundary.R5H_MODULE_BLOB) {
    fail('DOKE_COM_B03C_R5D_HOSTED_R5H_BLOB_DRIFT');
  }
  if (blobAt('HEAD', boundary.TRIGGER_PATH) !== boundary.TRIGGER_BLOB) {
    fail('DOKE_COM_B03C_R5D_HOSTED_TRIGGER_BLOB_DRIFT');
  }
  if (blobAt('HEAD', boundary.R5F_RECEIPT_PATH) !== boundary.R5F_RECEIPT_BLOB) {
    fail('DOKE_COM_B03C_R5D_HOSTED_R5F_RECEIPT_BLOB_DRIFT');
  }
  if (blobAt('HEAD', r5d.CORRECTED_BRIDGE_PATH) !== boundary.CORRECTED_BRIDGE_BLOB) {
    fail('DOKE_COM_B03C_R5D_HOSTED_CORRECTED_BRIDGE_BLOB_DRIFT');
  }
  if (r5h.STATUS !== config.readinessInput.r5hStatus) {
    fail('DOKE_COM_B03C_R5D_HOSTED_R5H_STATUS_DRIFT');
  }
}

function assertAuthorizationLifecycle() {
  const head = '1111111111111111111111111111111111111111';
  const wrong = boundary.evaluateExplicitAuthorization({
    certifiedBoundaryHead: head,
    authorizationPhrase: 'PROXIMO'
  });
  if (wrong.decision !== 'blocked_repository_only') {
    fail('DOKE_COM_B03C_R5D_HOSTED_GENERIC_CONTINUATION_MUST_BE_REJECTED');
  }

  const phrase = boundary.buildAuthorizationPhrase({ certifiedBoundaryHead: head });
  const received = boundary.evaluateExplicitAuthorization({
    certifiedBoundaryHead: head,
    authorizationPhrase: phrase
  });
  if (
    received.decision !== 'fresh_head_bound_r5d_execution_authorization_received_repository_only' ||
    received.remoteExecutionAuthority !== false
  ) {
    fail('DOKE_COM_B03C_R5D_HOSTED_FRESH_AUTHORIZATION_REPOSITORY_ONLY_REQUIRED');
  }

  const receipt = boundary.buildConsumedExecutionAuthorizationReceipt({
    certifiedBoundaryHead: head
  });
  const validated = boundary.validateConsumedExecutionAuthorizationReceipt({
    receipt,
    parentHead: head,
    changedFiles: [boundary.FUTURE_EXECUTION_AUTHORIZATION_RECEIPT_PATH],
    runAttempt: 1,
    triggerBlob: boundary.TRIGGER_BLOB
  });
  if (
    validated.decision !== 'r5d_consumed_execution_authorization_receipt_valid_for_single_use_attempt' ||
    validated.remoteExecutionAuthority !== false
  ) {
    fail('DOKE_COM_B03C_R5D_HOSTED_RECEIPT_VALIDATION_REQUIRED');
  }

  const authorized = boundary.authorizeExecution({
    receipt,
    parentHead: head,
    changedFiles: [boundary.FUTURE_EXECUTION_AUTHORIZATION_RECEIPT_PATH],
    runAttempt: 1,
    triggerBlob: boundary.TRIGGER_BLOB
  });
  if (
    authorized.decision !== boundary.AUTHORIZED_DECISION ||
    authorized.remoteExecutionAuthority !== true ||
    authorized.remoteCredentialReadAuthority !== true ||
    authorized.remoteDependencyLoadAuthority !== true ||
    authorized.networkAuthority !== true ||
    authorized.stagingReadAuthority !== true ||
    authorized.stagingMutationAuthority !== true ||
    authorized.realtimeSubscriptionAuthority !== true ||
    authorized.authIdentityLifecycleAuthority !== true ||
    authorized.runtimeChangeAuthority !== false ||
    authorized.productionAuthority !== false ||
    authorized.pullRequestMergeAuthority !== false ||
    authorized.exactRootCauseProven !== false ||
    authorized.causalPromotionAllowed !== false
  ) {
    fail('DOKE_COM_B03C_R5D_HOSTED_AUTHORIZED_EXECUTION_SCOPE_INVALID');
  }

  const wrongParent = boundary.authorizeExecution({
    receipt,
    parentHead: '2222222222222222222222222222222222222222',
    changedFiles: [boundary.FUTURE_EXECUTION_AUTHORIZATION_RECEIPT_PATH],
    runAttempt: 1,
    triggerBlob: boundary.TRIGGER_BLOB
  });
  if (wrongParent.decision !== 'blocked_repository_only') {
    fail('DOKE_COM_B03C_R5D_HOSTED_RECEIPT_PARENT_REUSE_MUST_FAIL');
  }

  const secondFile = boundary.authorizeExecution({
    receipt,
    parentHead: head,
    changedFiles: [boundary.FUTURE_EXECUTION_AUTHORIZATION_RECEIPT_PATH, 'extra.txt'],
    runAttempt: 1,
    triggerBlob: boundary.TRIGGER_BLOB
  });
  if (secondFile.decision !== 'blocked_repository_only') {
    fail('DOKE_COM_B03C_R5D_HOSTED_RECEIPT_SCOPE_EXPANSION_MUST_FAIL');
  }

  const retry = boundary.authorizeExecution({
    receipt,
    parentHead: head,
    changedFiles: [boundary.FUTURE_EXECUTION_AUTHORIZATION_RECEIPT_PATH],
    runAttempt: 2,
    triggerBlob: boundary.TRIGGER_BLOB
  });
  if (retry.decision !== 'blocked_repository_only') {
    fail('DOKE_COM_B03C_R5D_HOSTED_RUN_ATTEMPT_REUSE_MUST_FAIL');
  }

  return {
    head,
    phraseFingerprint: boundary.authorizationPhraseFingerprint({ certifiedBoundaryHead: head }),
    receiptId: receipt.authorizationReceiptId
  };
}

function assertExecutionReceiptAbsent() {
  if (fileExists(boundary.FUTURE_EXECUTION_AUTHORIZATION_RECEIPT_PATH)) {
    fail('DOKE_COM_B03C_R5D_HOSTED_EXECUTION_RECEIPT_MUST_REMAIN_ABSENT');
  }
}

function main() {
  const readiness = assertRepositoryReadiness();
  assertFrozenLineage();
  const lifecycle = assertAuthorizationLifecycle();
  assertExecutionReceiptAbsent();

  const output = {
    validationId: boundary.VALIDATION_ID,
    contractId: boundary.CONTRACT_ID,
    status: boundary.STATUS,
    repositoryBaselineHead: boundary.REPOSITORY_BASELINE_HEAD,
    r5hCertifiedHead: boundary.R5H_CERTIFIED_HEAD,
    r5dCertifiedHead: boundary.R5D_CERTIFIED_HEAD,
    triggerBlob: boundary.TRIGGER_BLOB,
    correctedBridgeSemanticsFingerprint: boundary.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    futureExecutionAuthorizationReceiptPath: boundary.FUTURE_EXECUTION_AUTHORIZATION_RECEIPT_PATH,
    freshAuthorizationLifecycleVerified: true,
    genericContinuationRejected: true,
    singleFileReceiptEnforced: true,
    parentHeadBindingEnforced: true,
    runAttemptOneEnforced: true,
    priorAuthorizationReuseForbidden: true,
    triggerRecreationForbidden: true,
    hostedExecutionBoundaryReady: readiness.hostedExecutionBoundaryReady,
    remoteExecutionAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    syntheticAuthorizationPhraseFingerprint: lifecycle.phraseFingerprint,
    syntheticAuthorizationReceiptId: lifecycle.receiptId
  };
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R5D_HOSTED_TEST_FAILURE')}\n`);
  process.exitCode = 1;
}
