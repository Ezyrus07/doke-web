'use strict';

const assert = require('node:assert/strict');
const r4i = require('../backend/modules/communities/community-realtime-private-auth-r4i');
const r4o = require('../backend/modules/communities/community-realtime-private-auth-r4o');
const r4p = require('../backend/modules/communities/community-realtime-private-auth-r4p');
const config = require('../config/com-b03c-r4p-r4o-fresh-authorization-consumption.json');

const request = r4o.buildFreshAuthorizationRequest({ certifiedHead: r4p.R4O_CERTIFIED_HEAD });

const input = {
  r4oCertifiedHead: r4p.R4O_CERTIFIED_HEAD,
  r4oCertificationRun: r4p.R4O_CERTIFICATION_RUN,
  r4oCertificationJob: r4p.R4O_CERTIFICATION_JOB,
  r4oCertificationSuccess: true,
  matrixRun: r4p.MATRIX_RUN,
  matrixJob: r4p.MATRIX_JOB,
  matrixSuccess: true,
  matrixVersion: r4p.MATRIX_VERSION,
  maturity: r4p.REQUIRED_MATURITY,
  productionGate: r4p.REQUIRED_PRODUCTION_GATE,
  targetBranch: r4p.TARGET_BRANCH,
  targetPr: r4p.TARGET_PR,
  targetEnvironment: r4p.TARGET_ENVIRONMENT,
  authorizationPhraseFingerprint: request.authorizationPhraseFingerprint,
  authorizationPreviouslyConsumed: false,
  historicalAuthorizationReceiptReuseAttempted: false,
  executionAttempted: false,
  triggerCreated: false,
  separateHostedExecutionBoundaryRequired: true,
  rawAuthorizationPhrasePersistenceAllowed: false
};

assert.equal(request.authorizationPhraseFingerprint, r4p.AUTHORIZATION_PHRASE_FINGERPRINT);
assert.equal(r4p.deriveAuthorizationReceiptId(), r4p.AUTHORIZATION_RECEIPT_ID);

const consumed = r4p.consumeAuthorization(input);
assert.equal(consumed.status, r4p.STATUS);
assert.equal(consumed.authorizationConsumed, true);
assert.equal(consumed.authorizationReusable, false);
assert.equal(consumed.singleUse, true);
assert.equal(consumed.reusableAfterFailure, false);
assert.equal(consumed.historicalAuthorizationReceiptReused, false);
assert.equal(consumed.executionAttempted, false);
assert.equal(consumed.triggerCreated, false);
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
assert.equal(consumed.separateHostedExecutionBoundaryRequired, true);
assert.equal(consumed.rawAuthorizationPhrasePersisted, false);
assert.equal(consumed.exactRootCauseProven, false);
assert.equal(consumed.causalPromotionAllowed, false);

assert.equal(r4p.validatePersistedReceipt(config.receipt), true);
assert.equal(config.receipt.authorizationReceiptId, consumed.authorizationReceiptId);
assert.equal(config.receipt.authorizationPhraseFingerprint, consumed.authorizationPhraseFingerprint);
assert.notEqual(config.receipt.authorizationReceiptId, r4i.AUTHORIZATION_RECEIPT_ID);
assert.notEqual(config.receipt.authorizationPhraseFingerprint, r4i.AUTHORIZATION_PHRASE_FINGERPRINT);
assert.equal(JSON.stringify(config).includes(r4o.AUTHORIZATION_PHRASE_PREFIX), false);

const replay = r4p.consumeAuthorization({ ...input, authorizationPreviouslyConsumed: true });
assert.equal(replay.decision, 'blocked_repository_only');
assert.equal(replay.reason, 'R4P_FRESH_SINGLE_USE_AUTHORIZATION_REQUIRED');

const historicalReuse = r4p.consumeAuthorization({ ...input, historicalAuthorizationReceiptReuseAttempted: true });
assert.equal(historicalReuse.decision, 'blocked_repository_only');
assert.equal(historicalReuse.reason, 'R4P_FRESH_SINGLE_USE_AUTHORIZATION_REQUIRED');

const attempted = r4p.consumeAuthorization({ ...input, executionAttempted: true });
assert.equal(attempted.decision, 'blocked_repository_only');
assert.equal(attempted.reason, 'R4P_FRESH_SINGLE_USE_AUTHORIZATION_REQUIRED');

assert.throws(
  () => r4p.assertRemoteExecutionBoundaryAbsent(),
  (error) => error && error.code === r4p.REMOTE_EXECUTION_BLOCK_CODE
);

console.log(JSON.stringify({
  contractId: r4p.CONTRACT_ID,
  validationId: r4p.VALIDATION_ID,
  status: r4p.STATUS,
  authorizationReceiptId: r4p.AUTHORIZATION_RECEIPT_ID,
  authorizationConsumed: true,
  authorizationReusable: false,
  historicalAuthorizationReceiptReused: false,
  triggerCreationAuthority: false,
  remoteExecutionAuthority: false,
  stagingAccessExecuted: false,
  rawAuthorizationPhrasePersisted: false,
  exactRootCauseProven: false,
  causalPromotionAllowed: false
}, null, 2));
