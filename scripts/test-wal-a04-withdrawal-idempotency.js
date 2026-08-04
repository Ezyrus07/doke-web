'use strict';

const assert = require('node:assert/strict');
const contract = require('../backend/modules/wallet/withdrawal-idempotency-contract');
const fixtures = require('../tests/fixtures/wal-a04-withdrawal-idempotency-cases.json');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function expectCode(code, fn) { assert.throws(fn, (error) => error && error.code === code); }
function fingerprint(value, field) {
  return contract.sha256(contract.canonicalize(Object.fromEntries(Object.entries(value).filter(([key]) => key !== field))));
}

const baseInput = fixtures.baseIntent;
const baseIntent = contract.createWithdrawalIntent(baseInput);
const request1 = contract.createRequestEnvelope(baseIntent, { attemptNumber: 1, submittedAt: '2026-08-04T18:01:00.000Z' });
const request2 = contract.createRequestEnvelope(baseIntent, { attemptNumber: 2, submittedAt: '2026-08-04T18:05:00.000Z' });

// Core positive paths.
test('intent validates', () => assert.equal(contract.validateWithdrawalIntent(baseIntent).intentId, baseInput.intentId));
test('idempotency key deterministic', () => assert.equal(contract.createWithdrawalIntent(baseInput).idempotencyKey, baseIntent.idempotencyKey));
test('request fingerprint deterministic', () => assert.equal(request1.requestFingerprint, request2.requestFingerprint));
test('retry key stable', () => assert.equal(request1.idempotencyKey, request2.idempotencyKey));
test('attempt may increase', () => assert.equal(contract.assertRequestBinding(request1, request2), true));
test('prepared action submits same key', () => {
  const outcome = contract.createOutcome(request1, { state: 'prepared', attemptCount: 0, observedAt: '2026-08-04T18:00:30.000Z' });
  assert.equal(contract.resolveRetryAction(request1, outcome).action, 'submit_same_key');
});
test('claimed action waits', () => {
  const outcome = contract.createOutcome(request1, { state: 'claimed', attemptCount: 1, observedAt: '2026-08-04T18:01:02.000Z' });
  assert.equal(contract.resolveRetryAction(request1, outcome).action, 'wait_and_reconcile_same_key');
});
test('lost response reconciles same key', () => {
  const outcome = contract.createOutcome(request1, { state: 'resolution_required', errorCode: 'RESPONSE_LOST_AFTER_COMMIT', attemptCount: 1, observedAt: '2026-08-04T18:01:05.000Z' });
  assert.equal(contract.resolveRetryAction(request1, outcome).action, 'reconcile_or_replay_same_key');
});
test('timeout retries same key', () => {
  const outcome = contract.createOutcome(request1, { state: 'failed_retryable', errorCode: 'TRANSPORT_TIMEOUT', attemptCount: 1, observedAt: '2026-08-04T18:01:05.000Z' });
  assert.equal(contract.resolveRetryAction(request2, outcome).action, 'resubmit_same_key');
});
test('success returns stored result', () => {
  const outcome = contract.createOutcome(request1, { state: 'succeeded', withdrawalId: 'wd_server_withdrawal_001', committedAt: '2026-08-04T18:01:03.000Z', attemptCount: 1, observedAt: '2026-08-04T18:01:04.000Z' });
  const action = contract.resolveRetryAction(request2, outcome);
  assert.equal(action.action, 'return_stored_success');
  assert.equal(action.withdrawalId, 'wd_server_withdrawal_001');
});
test('terminal rejection stops', () => {
  const outcome = contract.createOutcome(request1, { state: 'rejected_terminal', errorCode: 'INSUFFICIENT_BALANCE', attemptCount: 1, observedAt: '2026-08-04T18:01:04.000Z' });
  assert.equal(contract.resolveRetryAction(request2, outcome).action, 'stop_terminal');
});
test('no previous outcome submits same key', () => assert.equal(contract.resolveRetryAction(request1, null).action, 'submit_same_key'));
test('opaque destination accepted', () => assert.equal(baseIntent.destinationReferenceId, baseInput.destinationReferenceId));
test('authority remains denied', () => assert.equal(baseIntent.realMoneyAuthority, false));

// Transition paths.
const claimed = contract.createOutcome(request1, { state: 'claimed', attemptCount: 1, observedAt: '2026-08-04T18:01:01.000Z' });
const resolving = contract.createOutcome(request1, { state: 'resolution_required', errorCode: 'UNKNOWN_AFTER_SUBMIT', attemptCount: 1, observedAt: '2026-08-04T18:01:03.000Z' });
const retryable = contract.createOutcome(request2, { state: 'failed_retryable', errorCode: 'GATEWAY_UNAVAILABLE', attemptCount: 2, observedAt: '2026-08-04T18:05:03.000Z' });
const succeeded = contract.createOutcome(request2, { state: 'succeeded', withdrawalId: 'wd_server_withdrawal_001', committedAt: '2026-08-04T18:05:02.000Z', attemptCount: 2, observedAt: '2026-08-04T18:05:03.000Z' });
const rejected = contract.createOutcome(request1, { state: 'rejected_terminal', errorCode: 'DESTINATION_DISABLED', attemptCount: 1, observedAt: '2026-08-04T18:01:03.000Z' });

test('claimed to resolving', () => assert.equal(contract.assertTransition(claimed, resolving), true));
test('resolving to retryable', () => assert.equal(contract.assertTransition(resolving, retryable), true));
test('retryable to succeeded', () => assert.equal(contract.assertTransition(retryable, succeeded), true));
test('succeeded exact replay', () => assert.equal(contract.assertTransition(succeeded, succeeded), true));
test('rejected exact replay', () => assert.equal(contract.assertTransition(rejected, rejected), true));

// Negative intent cases.
const intentCases = [
  ['missing intent id', 'WAL_A04_INTENT_ID_INVALID', { intentId: '' }],
  ['invalid actor hash', 'WAL_A04_ACTOR_SCOPE_INVALID', { actorScopeHash: 'bad' }],
  ['zero amount', 'WAL_A04_AMOUNT_INVALID', { amountCents: 0 }],
  ['negative amount', 'WAL_A04_AMOUNT_INVALID', { amountCents: -1 }],
  ['fraction amount', 'WAL_A04_AMOUNT_INVALID', { amountCents: 1.5 }],
  ['unsupported currency', 'WAL_A04_CURRENCY_UNSUPPORTED', { currency: 'USD' }],
  ['raw document', 'WAL_A04_RAW_BANK_DATA_FORBIDDEN', { document: '123' }],
  ['raw pix', 'WAL_A04_RAW_BANK_DATA_FORBIDDEN', { pixKey: 'x@y.com' }],
  ['raw account', 'WAL_A04_RAW_BANK_DATA_FORBIDDEN', { accountNumber: '123' }],
  ['nested raw account', 'WAL_A04_RAW_BANK_DATA_FORBIDDEN', { metadata: { bankAccount: {} } }],
  ['invalid destination reference', 'WAL_A04_DESTINATION_REFERENCE_INVALID', { destinationReferenceId: 'bank-1' }],
  ['invalid destination fingerprint', 'WAL_A04_DESTINATION_FINGERPRINT_INVALID', { destinationFingerprint: 'bad' }],
  ['equal timestamps', 'WAL_A04_TIMESTAMP_INVALID', { expiresAt: baseInput.createdAt }],
  ['excessive expiry', 'WAL_A04_EXPIRY_WINDOW_INVALID', { expiresAt: '2026-08-20T18:00:00.000Z' }],
  ['revision zero', 'WAL_A04_REVISION_INVALID', { clientRevision: 0 }]
];
for (const [name, code, patch] of intentCases) test(`${name} rejected`, () => expectCode(code, () => contract.createWithdrawalIntent({ ...baseInput, ...patch })));

// Tampering and request cases.
test('intent fingerprint tamper rejected', () => expectCode('WAL_A04_INTENT_FINGERPRINT_MISMATCH', () => contract.validateWithdrawalIntent({ ...baseIntent, intentFingerprint: '0'.repeat(64) })));
test('intent key tamper rejected', () => expectCode('WAL_A04_IDEMPOTENCY_KEY_MISMATCH', () => contract.validateWithdrawalIntent({ ...baseIntent, idempotencyKey: 'wd-v1-' + '0'.repeat(48), intentFingerprint: contract.sha256('x') })));
test('attempt zero rejected', () => expectCode('WAL_A04_ATTEMPT_INVALID', () => contract.createRequestEnvelope(baseIntent, { attemptNumber: 0, submittedAt: '2026-08-04T18:01:00.000Z' })));
test('submitted before creation rejected', () => expectCode('WAL_A04_TIMESTAMP_INVALID', () => contract.createRequestEnvelope(baseIntent, { attemptNumber: 1, submittedAt: '2026-08-04T17:59:59.000Z' })));
test('submitted after expiry rejected', () => expectCode('WAL_A04_INTENT_EXPIRED', () => contract.createRequestEnvelope(baseIntent, { attemptNumber: 1, submittedAt: '2026-08-05T18:00:00.000Z' })));
test('request fingerprint tamper rejected', () => expectCode('WAL_A04_ENVELOPE_FINGERPRINT_MISMATCH', () => contract.validateRequestEnvelope({ ...request1, requestFingerprint: '0'.repeat(64) })));
test('request authority escalation rejected', () => {
  const altered = { ...request1, mutationAuthority: true };
  altered.envelopeFingerprint = fingerprint(altered, 'envelopeFingerprint');
  expectCode('WAL_A04_AUTHORITY_FORBIDDEN', () => contract.validateRequestEnvelope(altered));
});

// Binding conflicts.
const changedAmountIntent = contract.createWithdrawalIntent({ ...baseInput, amountCents: 13000 });
const changedAmountRequest = contract.createRequestEnvelope(changedAmountIntent, { attemptNumber: 2, submittedAt: '2026-08-04T18:05:00.000Z' });
const changedDestinationIntent = contract.createWithdrawalIntent({ ...baseInput, destinationReferenceId: 'wdr_secondary_destination_02', destinationFingerprint: 'a'.repeat(64) });
const changedDestinationRequest = contract.createRequestEnvelope(changedDestinationIntent, { attemptNumber: 2, submittedAt: '2026-08-04T18:05:00.000Z' });
const alternateIntent = contract.createWithdrawalIntent({ ...baseInput, intentId: '018f2c65-8d77-4c2b-8c55-ff3dd4b93471' });
const alternateRequest = contract.createRequestEnvelope(alternateIntent, { attemptNumber: 2, submittedAt: '2026-08-04T18:05:00.000Z' });

test('changed amount conflicts', () => expectCode('WAL_A04_PAYLOAD_CONFLICT', () => contract.assertRequestBinding(request1, changedAmountRequest)));
test('changed destination conflicts', () => expectCode('WAL_A04_IDEMPOTENCY_KEY_CONFLICT', () => contract.assertRequestBinding(request1, changedDestinationRequest)));
test('different intent conflicts', () => expectCode('WAL_A04_INTENT_CONFLICT', () => contract.assertRequestBinding(request1, alternateRequest)));
test('attempt regression conflicts', () => expectCode('WAL_A04_ATTEMPT_REGRESSION', () => contract.assertRequestBinding(request2, request1)));
test('outcome binding conflict', () => expectCode('WAL_A04_RETRY_BINDING_CONFLICT', () => contract.resolveRetryAction(alternateRequest, succeeded)));

// Outcome validation failures.
const outcomeFailures = [
  ['invalid retry code', 'WAL_A04_OUTCOME_INVALID', { state: 'failed_retryable', errorCode: 'UNKNOWN', attemptCount: 1 }],
  ['invalid resolution code', 'WAL_A04_OUTCOME_INVALID', { state: 'resolution_required', errorCode: 'UNKNOWN', attemptCount: 1 }],
  ['invalid terminal code', 'WAL_A04_OUTCOME_INVALID', { state: 'rejected_terminal', errorCode: 'UNKNOWN', attemptCount: 1 }],
  ['success missing withdrawal', 'WAL_A04_OUTCOME_INVALID', { state: 'succeeded', committedAt: '2026-08-04T18:01:02.000Z', attemptCount: 1 }],
  ['success missing committed timestamp', 'WAL_A04_OUTCOME_INVALID', { state: 'succeeded', withdrawalId: 'wd_server_withdrawal_001', attemptCount: 1 }],
  ['commit after observation', 'WAL_A04_TIMESTAMP_INVALID', { state: 'succeeded', withdrawalId: 'wd_server_withdrawal_001', committedAt: '2026-08-04T18:01:04.000Z', attemptCount: 1 }],
  ['claimed zero attempts', 'WAL_A04_OUTCOME_INVALID', { state: 'claimed', attemptCount: 0 }],
  ['prepared nonzero attempts', 'WAL_A04_OUTCOME_INVALID', { state: 'prepared', attemptCount: 1 }]
];
for (const [name, code, input] of outcomeFailures) {
  test(`${name} rejected`, () => expectCode(code, () => contract.createOutcome(request1, { ...input, observedAt: '2026-08-04T18:01:03.000Z' })));
}

// Terminal protections.
test('succeeded cannot reopen', () => expectCode('WAL_A04_TRANSITION_INVALID', () => contract.assertTransition(succeeded, retryable)));
test('rejected cannot reopen', () => expectCode('WAL_A04_TRANSITION_INVALID', () => contract.assertTransition(rejected, claimed)));
test('succeeded altered replay rejected', () => {
  const altered = { ...succeeded, withdrawalId: 'wd_server_withdrawal_002' };
  altered.outcomeFingerprint = fingerprint(altered, 'outcomeFingerprint');
  expectCode('WAL_A04_TERMINAL_REPLAY_MISMATCH', () => contract.assertTransition(succeeded, altered));
});
test('terminal altered replay rejected', () => {
  const altered = { ...rejected, observedAt: '2026-08-04T18:01:04.000Z' };
  altered.outcomeFingerprint = fingerprint(altered, 'outcomeFingerprint');
  expectCode('WAL_A04_TERMINAL_REPLAY_MISMATCH', () => contract.assertTransition(rejected, altered));
});
test('outcome authority escalation rejected', () => {
  const altered = { ...succeeded, realMoneyAuthority: true };
  altered.outcomeFingerprint = fingerprint(altered, 'outcomeFingerprint');
  expectCode('WAL_A04_AUTHORITY_FORBIDDEN', () => contract.validateOutcome(altered));
});

// Programmatic retry matrix.
for (const code of contract.RETRYABLE_FAILURE_CODES) {
  test(`retryable ${code} reuses key`, () => {
    const outcome = contract.createOutcome(request1, { state: 'failed_retryable', errorCode: code, attemptCount: 1, observedAt: '2026-08-04T18:01:03.000Z' });
    const action = contract.resolveRetryAction(request2, outcome);
    assert.equal(action.action, 'resubmit_same_key');
    assert.equal(action.duplicateCreationAllowed, false);
  });
}
for (const code of contract.RESOLUTION_REQUIRED_CODES) {
  test(`resolution ${code} reconciles`, () => {
    const outcome = contract.createOutcome(request1, { state: 'resolution_required', errorCode: code, attemptCount: 1, observedAt: '2026-08-04T18:01:03.000Z' });
    assert.equal(contract.resolveRetryAction(request2, outcome).action, 'reconcile_or_replay_same_key');
  });
}
for (const code of contract.TERMINAL_REJECTION_CODES) {
  test(`terminal ${code} stops`, () => {
    const outcome = contract.createOutcome(request1, { state: 'rejected_terminal', errorCode: code, attemptCount: 1, observedAt: '2026-08-04T18:01:03.000Z' });
    assert.equal(contract.resolveRetryAction(request2, outcome).action, 'stop_terminal');
  });
}

let passed = 0;
const failures = [];
for (const entry of tests) {
  try {
    entry.fn();
    passed += 1;
  } catch (error) {
    failures.push({ name: entry.name, error: error && (error.stack || error.message) || String(error) });
  }
}
const result = { contractId: contract.CONTRACT_VERSION, total: tests.length, passed, failed: failures.length, status: failures.length ? 'failed' : 'passed' };
console.log(JSON.stringify(result, null, 2));
if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL ${failure.name}\n${failure.error}`));
  process.exit(1);
}
