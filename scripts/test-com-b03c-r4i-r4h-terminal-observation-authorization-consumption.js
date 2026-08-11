'use strict';

const assert = require('node:assert/strict');
const r4h = require('../backend/modules/communities/community-realtime-private-auth-r4h');
const r4i = require('../backend/modules/communities/community-realtime-private-auth-r4i');
const config = require('../config/com-b03c-r4i-r4h-terminal-observation-authorization-consumption.json');

const exactStatement = r4h.buildAuthorizationPhrase(r4i.R4H_CERTIFIED_HEAD);

const input = {
  r4hCertifiedHead: r4i.R4H_CERTIFIED_HEAD,
  r4hCertificationRun: r4i.R4H_CERTIFICATION_RUN,
  r4hCertificationJob: r4i.R4H_CERTIFICATION_JOB,
  r4hCertificationSuccess: true,
  matrixRun: r4i.MATRIX_RUN,
  matrixJob: r4i.MATRIX_JOB,
  matrixSuccess: true,
  matrixVersion: r4i.MATRIX_VERSION,
  maturity: r4i.REQUIRED_MATURITY,
  productionGate: r4i.REQUIRED_PRODUCTION_GATE,
  targetBranch: r4i.TARGET_BRANCH,
  targetPr: r4i.TARGET_PR,
  targetStagingProject: r4i.TARGET_STAGING_PROJECT,
  authorizationStatement: exactStatement,
  authorizationPreviouslyConsumed: false,
  executionAttempted: false,
  triggerExists: false,
  r4eAuthorizationReusable: false,
  separateExecutionBoundaryRequired: true,
  rawAuthorizationPhrasePersistenceAllowed: false
};

assert.equal(r4i.sha256(exactStatement), r4i.AUTHORIZATION_PHRASE_FINGERPRINT);
assert.equal(r4i.deriveAuthorizationReceiptId(), r4i.AUTHORIZATION_RECEIPT_ID);

const consumed = r4i.consumeAuthorization(input);
assert.equal(consumed.decision, r4i.STATUS);
assert.equal(consumed.authorizationConsumed, true);
assert.equal(consumed.authorizationReusable, false);
assert.equal(consumed.singleUse, true);
assert.equal(consumed.reusableAfterFailure, false);
assert.equal(consumed.executionAttempted, false);
assert.equal(consumed.triggerExists, false);
assert.equal(consumed.triggerCreationAuthority, false);
assert.equal(consumed.remoteExecutionAuthority, false);
assert.equal(consumed.stagingReadAuthority, false);
assert.equal(consumed.stagingMutationAuthority, false);
assert.equal(consumed.remoteCredentialReadAuthority, false);
assert.equal(consumed.remoteDependencyLoadAuthority, false);
assert.equal(consumed.networkAuthority, false);
assert.equal(consumed.realtimeSubscriptionAuthority, false);
assert.equal(consumed.authIdentityLifecycleAuthority, false);
assert.equal(consumed.runtimeChangeAuthority, false);
assert.equal(consumed.productionAuthority, false);
assert.equal(consumed.pullRequestMergeAuthority, false);
assert.equal(consumed.separateExecutionBoundaryRequired, true);
assert.equal(consumed.rawAuthorizationPhrasePersisted, false);
assert.equal(consumed.exactRootCauseProven, false);
assert.equal(consumed.causalPromotionAllowed, false);

assert.equal(r4i.validatePersistedReceipt(config.receipt), true);
assert.equal(config.receipt.authorizationReceiptId, consumed.authorizationReceiptId);
assert.equal(config.receipt.authorizationPhraseFingerprint, consumed.authorizationPhraseFingerprint);
assert.equal(JSON.stringify(config).includes(exactStatement), false);

const wrongStatement = r4i.consumeAuthorization({ ...input, authorizationStatement: `${exactStatement}x` });
assert.equal(wrongStatement.decision, 'blocked_repository_only');
assert.equal(wrongStatement.reason, 'R4I_EXACT_HEAD_BOUND_AUTHORIZATION_STATEMENT_REQUIRED');

const replay = r4i.consumeAuthorization({ ...input, authorizationPreviouslyConsumed: true });
assert.equal(replay.decision, 'blocked_repository_only');
assert.equal(replay.reason, 'R4I_FRESH_SINGLE_USE_AUTHORIZATION_REQUIRED');

const attempted = r4i.consumeAuthorization({ ...input, executionAttempted: true });
assert.equal(attempted.decision, 'blocked_repository_only');
assert.equal(attempted.reason, 'R4I_FRESH_SINGLE_USE_AUTHORIZATION_REQUIRED');

const reusedR4e = r4i.consumeAuthorization({ ...input, r4eAuthorizationReusable: true });
assert.equal(reusedR4e.decision, 'blocked_repository_only');
assert.equal(reusedR4e.reason, 'R4I_FRESH_SINGLE_USE_AUTHORIZATION_REQUIRED');

assert.throws(() => r4i.assertRemoteExecutionBoundaryAbsent(), (error) => error && error.code === r4i.REMOTE_EXECUTION_BLOCK_CODE);

console.log(JSON.stringify({
  contractId: r4i.CONTRACT_ID,
  validationId: r4i.VALIDATION_ID,
  status: r4i.STATUS,
  authorizationReceiptId: r4i.AUTHORIZATION_RECEIPT_ID,
  authorizationConsumed: true,
  authorizationReusable: false,
  triggerCreationAuthority: false,
  remoteExecutionAuthority: false,
  stagingAccessExecuted: false,
  rawAuthorizationPhrasePersisted: false,
  exactRootCauseProven: false,
  causalPromotionAllowed: false
}, null, 2));
