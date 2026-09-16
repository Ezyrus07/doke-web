'use strict';

const fs = require('fs');
const path = require('path');
const r5h = require('../backend/modules/communities/community-realtime-private-auth-r5h');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8'));
}

const snapshot = readJson('config/com-b03c-r5h-r5g-bound-single-use-r5d-trigger-certification.json');
const trigger = readJson(r5h.TRIGGER_PATH);
const r5fReceipt = readJson(r5h.R5F_RECEIPT_PATH);
const r5bReceipt = readJson(r5h.R5B_RECEIPT_PATH);

if (JSON.stringify(trigger).includes('I_EXPLICITLY_AUTHORIZE_')) {
  throw new Error('R5H_RAW_AUTHORIZATION_PHRASE_PERSISTED');
}

const result = r5h.evaluateRepositoryCertification({
  ...snapshot,
  trigger,
  r5fReceipt,
  r5bReceipt
});

if (result.decision !== r5h.STATUS) throw new Error(`R5H_DECISION_MISMATCH:${result.reason || result.decision}`);
if (result.triggerCreated !== true || result.triggerCertified !== true) throw new Error('R5H_TRIGGER_CERTIFICATION_REQUIRED');
if (result.triggerSingleUse !== true || result.triggerReusableAfterFailure !== false) throw new Error('R5H_SINGLE_USE_TRIGGER_REQUIRED');
if (result.triggerCreationAuthorizationConsumed !== true || result.triggerCreationAuthorizationReusable !== false) throw new Error('R5H_TRIGGER_AUTHORIZATION_MUST_BE_CONSUMED');
if (result.remoteExecutionAuthority !== false || result.stagingReadAuthority !== false || result.stagingMutationAuthority !== false) throw new Error('R5H_REMOTE_AUTHORITY_PROHIBITED');
if (result.exactRootCauseProven !== false || result.causalPromotionAllowed !== false) throw new Error('R5H_CAUSAL_PROMOTION_PROHIBITED');
if (!Object.isFrozen(result)) throw new Error('R5H_RESULT_MUST_BE_FROZEN');

let blocked = false;
try {
  r5h.assertRemoteExecutionBoundaryAbsent();
} catch (error) {
  blocked = error?.code === r5h.REMOTE_EXECUTION_BLOCK_CODE;
}
if (!blocked) throw new Error('R5H_REMOTE_EXECUTION_HARD_BLOCK_REQUIRED');

console.log('COM-B03C-R5H repository trigger certification self-test passed.');
