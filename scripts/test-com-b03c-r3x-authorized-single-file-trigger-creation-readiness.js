#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const r3x = require('../backend/modules/communities/community-realtime-private-auth-r3x');
const r3w = require('../backend/modules/communities/community-realtime-private-auth-r3w');
const r3v = require('../backend/modules/communities/community-realtime-private-auth-r3v');
const r3k = require('../backend/modules/communities/community-realtime-private-auth-r3k');
const config = require('../config/com-b03c-r3x-authorized-single-file-trigger-creation-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R3X-AUTHORIZED-SINGLE-FILE-TRIGGER-CREATION-READINESS.json');

function readiness(overrides = {}) {
  return {
    predecessorValidationId: config.predecessor.validationId,
    predecessorStatus: config.predecessor.status,
    predecessorHead: config.predecessor.head,
    predecessorRecertRun: config.predecessor.recertRun,
    predecessorRecertJob: config.predecessor.recertJob,
    predecessorRecertSuccess: config.predecessor.recertSuccess,
    predecessorMatrixRecertRun: config.predecessor.matrixRecertRun,
    predecessorMatrixRecertJob: config.predecessor.matrixRecertJob,
    predecessorMatrixRecertSuccess: config.predecessor.matrixRecertSuccess,
    matrixVersion: config.matrixVersion,
    maturity: config.maturity,
    productionGate: config.productionGate,
    r3wContractId: r3w.CONTRACT_ID,
    r3vContractId: r3v.CONTRACT_ID,
    authorizationEvidenceHead: config.authorizationReceipt.evidenceHead,
    authorizationPhraseFingerprint: config.authorizationReceipt.phraseFingerprint,
    authorizationReceiptId: config.authorizationReceipt.receiptId,
    triggerPath: config.trigger.path,
    triggerContractId: config.trigger.contractId,
    ...config.controls,
    ...config.prohibitedPreparation,
    ...overrides
  };
}

function main() {
  const decision = r3x.evaluateRepositoryReadiness(readiness());
  assert.equal(decision.decision, 'repository_authorized_single_file_trigger_creation_ready_remote_execution_blocked');
  assert.equal(decision.triggerCreationAuthority, true);
  assert.equal(decision.remoteExecutionAuthority, false);
  assert.equal(decision.stagingReadAuthority, false);
  assert.equal(decision.stagingMutationAuthority, false);

  for (const flag of Object.keys(config.controls)) {
    assert.equal(r3x.evaluateRepositoryReadiness(readiness({ [flag]: false })).decision, 'blocked_repository_only', flag);
  }
  for (const flag of Object.keys(config.prohibitedPreparation)) {
    assert.equal(r3x.evaluateRepositoryReadiness(readiness({ [flag]: true })).decision, 'blocked_repository_only', flag);
  }

  const derivation = r3x.verifyAuthorizationReceiptDerivation();
  assert.equal(derivation.phraseFingerprintMatches, true);
  assert.equal(derivation.receiptIdMatches, true);
  assert.equal(derivation.consumedReceiptMatches, true);
  assert.equal(derivation.concreteAuthorizationPhrasePersisted, false);
  assert.equal(r3w.authorizationPhraseFingerprint(r3x.AUTHORIZATION_EVIDENCE_HEAD), r3x.AUTHORIZATION_PHRASE_FINGERPRINT);

  const receipt = r3x.buildAuthorizationReceipt();
  assert.equal(receipt.authorizationConsumed, true);
  assert.equal(receipt.executionAttempted, false);
  assert.equal(receipt.authorizationReceiptId, r3x.AUTHORIZATION_RECEIPT_ID);
  assert.equal(receipt.remoteExecutionAuthority, false);

  const installHead = '1'.repeat(40);
  const trigger = r3x.buildAuthorizedTriggerDescriptor(installHead);
  const valid = r3x.validateAuthorizedTriggerCommit({
    trigger,
    parentHead: installHead,
    changedFiles: [r3x.TRIGGER_PATH],
    runAttempt: 1
  });
  assert.equal(valid.decision, 'future_trigger_commit_shape_valid_remote_execution_still_separately_blocked');
  assert.equal(valid.authorizationConsumed, true);
  assert.equal(valid.remoteExecutionAuthority, false);

  assert.equal(r3x.validateAuthorizedTriggerCommit({ trigger, parentHead: '2'.repeat(40), changedFiles: [r3x.TRIGGER_PATH], runAttempt: 1 }).decision, 'blocked_repository_only');
  assert.equal(r3x.validateAuthorizedTriggerCommit({ trigger, parentHead: installHead, changedFiles: [r3x.TRIGGER_PATH, 'extra.txt'], runAttempt: 1 }).decision, 'blocked_repository_only');
  assert.equal(r3x.validateAuthorizedTriggerCommit({ trigger, parentHead: installHead, changedFiles: [r3x.TRIGGER_PATH], runAttempt: 2 }).decision, 'blocked_repository_only');

  let sideEffects = 0;
  assert.throws(() => {
    r3x.assertRemoteExecutionBoundaryAbsent();
    sideEffects += 1;
  }, (error) => error?.code === r3x.REMOTE_EXECUTION_BLOCK_CODE);
  assert.equal(sideEffects, 0);

  const source = fs.readFileSync(require.resolve('../backend/modules/communities/community-realtime-private-auth-r3x'), 'utf8');
  assert.doesNotMatch(source, /SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|process\.env|require\(['"]pg['"]\)|@supabase\/supabase-js/);

  assert.equal(evidence.contractId, r3x.CONTRACT_ID);
  assert.ok([
    'repository_authorized_single_file_trigger_creation_prepared_remote_execution_blocked',
    'repository_authorized_single_file_trigger_creation_certified_remote_execution_blocked'
  ].includes(evidence.status));
  assert.equal(evidence.authorizationReceipt.phraseFingerprint, r3x.AUTHORIZATION_PHRASE_FINGERPRINT);
  assert.equal(evidence.authorizationReceipt.receiptId, r3x.AUTHORIZATION_RECEIPT_ID);
  assert.equal(evidence.authorizationReceipt.plaintextPersisted, false);
  assert.equal(evidence.authority.remoteExecution, false);
  assert.equal(evidence.effects.stagingAccessExecuted, false);
  assert.equal(evidence.exactRootCauseProven, false);
  assert.equal(evidence.causalPromotionAllowed, false);

  process.stdout.write(JSON.stringify({
    contractId: r3x.CONTRACT_ID,
    decision: decision.decision,
    authorizationReceiptId: r3x.AUTHORIZATION_RECEIPT_ID,
    triggerPath: r3x.TRIGGER_PATH,
    remoteExecutionAuthority: false
  }) + '\n');
}

main();
