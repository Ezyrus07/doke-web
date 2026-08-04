'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const contract = require('../backend/modules/disputes/provider-chargeback-reconciliation-boundary');
const fixtures = require('../tests/fixtures/dsp-a04-provider-chargeback-reconciliation-cases.json');

let total = 0;
let passed = 0;
const failedCases = [];

function check(name, fn) {
  total += 1;
  try { fn(); passed += 1; } catch (error) {
    failedCases.push({ name, code: error && error.code || 'ASSERTION', message: error && error.message || String(error) });
  }
}
function expectCode(name, code, fn) {
  check(name, () => {
    let caught;
    try { fn(); } catch (error) { caught = error; }
    assert.ok(caught);
    assert.equal(caught.code, code);
  });
}
function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
}
function refingerprint(value, field) {
  const copy = { ...value };
  delete copy[field];
  return crypto.createHash('sha256').update(stable(copy)).digest('hex');
}

const observations = fixtures.observations.map(({ input }) => contract.createProviderChargebackObservation(input));
const chain = contract.buildProviderObservationChain(observations);
const reconciliation = contract.createChargebackReconciliation({ chain, ...fixtures.reconciliation });

[
  ['contract id', contract.CONTRACT_ID, 'dsp-a04-provider-chargeback-reconciliation-boundary-v1'],
  ['provider states', contract.PROVIDER_STATES.length, 8],
  ['sources', contract.OBSERVATION_SOURCES.length, 4],
  ['reconciliation states', contract.RECONCILIATION_STATES.length, 9],
  ['latest state', chain.latestProviderState, 'won'],
  ['latest sequence', chain.latestProviderSequence, 4],
  ['observation count', chain.observations.length, 4],
  ['source count', chain.distinctSources.length, 4],
  ['replay count', chain.replayCount, 0],
  ['reconciled state', reconciliation.reconciliationState, 'reconciled_won'],
  ['terminal', reconciliation.terminal, true],
  ['single webhook insufficient', reconciliation.singleWebhookSufficient, false],
  ['provider result alone untrusted', reconciliation.providerResultTrustedAlone, false]
].forEach(([name, actual, expected]) => check(name, () => assert.deepEqual(actual, expected)));

observations.forEach((observation, index) => {
  check(`observation ${index} validates`, () => assert.equal(contract.validateProviderChargebackObservation(observation).observationFingerprint, observation.observationFingerprint));
  check(`observation ${index} sha`, () => assert.match(observation.observationFingerprint, /^[a-f0-9]{64}$/));
  ['runtimeMutationAuthority', 'providerSubmissionAuthority', 'providerDecisionAuthority', 'refundAuthority', 'releaseAuthority', 'chargebackAuthority', 'realMoneyAuthority', 'stagingAuthority', 'productionAuthority']
    .forEach((field) => check(`observation ${index} denies ${field}`, () => assert.equal(observation[field], false)));
});

check('chain validates', () => assert.equal(contract.validateProviderObservationChain(chain).chainFingerprint, chain.chainFingerprint));
check('chain sha', () => assert.match(chain.chainFingerprint, /^[a-f0-9]{64}$/));
check('chain final observed', () => assert.equal(chain.finalProviderStateObserved, true));
check('chain conflict false', () => assert.equal(chain.conflictDetected, false));
check('reconciliation validates', () => assert.equal(contract.validateChargebackReconciliation(reconciliation).reconciliationFingerprint, reconciliation.reconciliationFingerprint));
check('reconciliation sha', () => assert.match(reconciliation.reconciliationFingerprint, /^[a-f0-9]{64}$/));
Object.entries(reconciliation.checks).forEach(([field, value]) => check(`match ${field}`, () => assert.equal(value, true)));
['runtimeMutationAuthority', 'providerSubmissionAuthority', 'providerDecisionAuthority', 'refundAuthority', 'releaseAuthority', 'chargebackAuthority', 'realMoneyAuthority', 'stagingAuthority', 'productionAuthority']
  .forEach((field) => check(`reconciliation denies ${field}`, () => assert.equal(reconciliation[field], false)));

const replayChain = contract.buildProviderObservationChain([...observations, observations[0]]);
check('identical replay accepted', () => assert.equal(replayChain.replayCount, 1));
check('identical replay deduplicated', () => assert.equal(replayChain.observations.length, 4));

[
  ['notification_received', 'opened'],
  ['dispute_opened', 'opened'],
  ['needs_response', 'evidence_due'],
  ['evidence_required', 'evidence_due'],
  ['submitted', 'evidence_submitted'],
  ['provider_review', 'under_review'],
  ['resolved_won', 'won'],
  ['chargeback_lost', 'lost'],
  ['reversal', 'reversed']
].forEach(([input, expected]) => check(`normalize ${input}`, () => assert.equal(contract.normalizeProviderState(input), expected)));

[
  ['providerLedgerMatched', 'reconciliation_required'],
  ['transactionMatched', 'reconciliation_required'],
  ['caseMatched', 'reconciliation_required'],
  ['amountCurrencyMatched', 'reconciliation_required'],
  ['disputeReferenceMatched', 'reconciliation_required'],
  ['evidenceBundleBound', 'reconciliation_required'],
  ['lifecycleSnapshotBound', 'reconciliation_required'],
  ['auditRecorded', 'reconciliation_required']
].forEach(([field, expected]) => {
  check(`missing ${field}`, () => {
    const value = contract.createChargebackReconciliation({ chain, ...fixtures.reconciliation, [field]: false });
    assert.equal(value.reconciliationState, expected);
    assert.equal(value.terminal, false);
  });
});

[
  [1, 'provider_open'],
  [2, 'evidence_required'],
  [3, 'provider_review']
].forEach(([length, state]) => check(`partial chain ${state}`, () => {
  const partial = contract.buildProviderObservationChain(observations.slice(0, length));
  const value = contract.createChargebackReconciliation({ chain: partial, ...fixtures.reconciliation });
  assert.equal(value.reconciliationState, state);
  assert.equal(value.terminal, false);
}));

const lost = contract.createProviderChargebackObservation({ ...fixtures.observations[3].input, providerEventId: 'pevt_synthetic_event_005', providerState: 'lost' });
const lostChain = contract.buildProviderObservationChain([...observations.slice(0, 3), lost]);
const lostResult = contract.createChargebackReconciliation({ chain: lostChain, ...fixtures.reconciliation });
check('lost reconciles', () => assert.equal(lostResult.reconciliationState, 'reconciled_lost'));
check('lost terminal', () => assert.equal(lostResult.terminal, true));

const reversed = contract.createProviderChargebackObservation({
  ...fixtures.observations[3].input,
  providerEventId: 'pevt_synthetic_event_006',
  providerState: 'reversed',
  providerSequence: 5,
  occurredAt: '2026-08-04T16:00:00.000Z',
  receivedAt: '2026-08-04T16:05:00.000Z'
});
const reversedChain = contract.buildProviderObservationChain([...observations, reversed]);
const reversedResult = contract.createChargebackReconciliation({ chain: reversedChain, ...fixtures.reconciliation });
check('reversed reconciles', () => assert.equal(reversedResult.reconciliationState, 'reversed'));
check('reversed terminal', () => assert.equal(reversedResult.terminal, true));

expectCode('unsupported state', 'DSP_A04_PROVIDER_STATE_UNSUPPORTED', () => contract.normalizeProviderState('mystery'));
expectCode('empty observation', 'DSP_A04_OBSERVATION_INVALID', () => contract.createProviderChargebackObservation(null));
[
  ['signature', 'DSP_A04_WEBHOOK_SIGNATURE_REQUIRED', { ...fixtures.observations[0].input, signatureVerified: false }],
  ['channel', 'DSP_A04_AUTHENTICATED_CHANNEL_REQUIRED', { ...fixtures.observations[1].input, authenticatedChannel: false }],
  ['sequence', 'DSP_A04_SEQUENCE_INVALID', { ...fixtures.observations[0].input, providerSequence: 0 }],
  ['amount', 'DSP_A04_AMOUNT_INVALID', { ...fixtures.observations[0].input, amountCents: 0 }],
  ['currency', 'DSP_A04_CURRENCY_UNSUPPORTED', { ...fixtures.observations[0].input, currency: 'USD' }],
  ['timestamp', 'DSP_A04_TIMESTAMP_INVALID', { ...fixtures.observations[0].input, occurredAt: '2026-08-04T13:00:00.000Z', receivedAt: '2026-08-04T12:00:00.000Z' }],
  ['fingerprint', 'DSP_A04_FINGERPRINT_INVALID', { ...fixtures.observations[0].input, evidenceFingerprint: 'bad' }],
  ['card', 'DSP_A04_SENSITIVE_DATA_FORBIDDEN', { ...fixtures.observations[0].input, nested: { card_number: '4111' } }],
  ['credential', 'DSP_A04_SENSITIVE_DATA_FORBIDDEN', { ...fixtures.observations[0].input, nested: { api_key: 'secret' } }],
  ['raw body', 'DSP_A04_SENSITIVE_DATA_FORBIDDEN', { ...fixtures.observations[0].input, rawBody: '{}' }],
  ['banking', 'DSP_A04_SENSITIVE_DATA_FORBIDDEN', { ...fixtures.observations[0].input, bank_account_snapshot: {} }]
].forEach(([name, code, input]) => expectCode(name, code, () => contract.createProviderChargebackObservation(input)));

expectCode('statement fingerprint', 'DSP_A04_STATEMENT_FINGERPRINT_REQUIRED', () => {
  const input = { ...fixtures.observations[3].input };
  delete input.statementFingerprint;
  contract.createProviderChargebackObservation(input);
});
expectCode('observation tamper', 'DSP_A04_OBSERVATION_FINGERPRINT_MISMATCH', () => contract.validateProviderChargebackObservation({ ...observations[0], amountCents: 1 }));
expectCode('observation authority', 'DSP_A04_AUTHORITY_FORBIDDEN', () => contract.validateProviderChargebackObservation({ ...observations[0], providerDecisionAuthority: true }));
expectCode('empty chain', 'DSP_A04_CHAIN_EMPTY', () => contract.buildProviderObservationChain([]));
expectCode('event conflict', 'DSP_A04_EVENT_ID_CONFLICT', () => contract.buildProviderObservationChain([
  observations[0],
  contract.createProviderChargebackObservation({ ...fixtures.observations[0].input, providerState: 'evidence_due' })
]));
expectCode('sequence conflict', 'DSP_A04_SEQUENCE_CONFLICT', () => contract.buildProviderObservationChain([
  observations[0],
  observations[1],
  contract.createProviderChargebackObservation({ ...fixtures.observations[1].input, providerEventId: 'pevt_synthetic_event_conflict', providerState: 'under_review' })
]));
expectCode('identity mismatch', 'DSP_A04_CHAIN_IDENTITY_MISMATCH', () => contract.buildProviderObservationChain([
  observations[0],
  contract.createProviderChargebackObservation({ ...fixtures.observations[1].input, transactionRef: 'txn_synthetic_transaction_999' })
]));
expectCode('transition invalid', 'DSP_A04_PROVIDER_TRANSITION_INVALID', () => contract.buildProviderObservationChain([
  observations[0],
  contract.createProviderChargebackObservation({ ...fixtures.observations[1].input, providerState: 'won' }),
  contract.createProviderChargebackObservation({ ...fixtures.observations[2].input, providerState: 'evidence_due' })
]));
expectCode('time regression', 'DSP_A04_EVENT_TIME_ORDER_INVALID', () => contract.buildProviderObservationChain([
  observations[0],
  contract.createProviderChargebackObservation({ ...fixtures.observations[1].input, occurredAt: '2026-08-04T11:00:00.000Z' })
]));
expectCode('chain tamper', 'DSP_A04_CHAIN_FINGERPRINT_MISMATCH', () => contract.validateProviderObservationChain({ ...chain, latestProviderSequence: 99 }));
expectCode('empty reconciliation', 'DSP_A04_RECONCILIATION_INVALID', () => contract.createChargebackReconciliation(null));
expectCode('reconciliation input fingerprint', 'DSP_A04_RECONCILIATION_FINGERPRINT_INVALID', () => contract.createChargebackReconciliation({ chain, ...fixtures.reconciliation, providerLedgerFingerprint: 'bad' }));
expectCode('reconciliation tamper', 'DSP_A04_RECONCILIATION_FINGERPRINT_MISMATCH', () => contract.validateChargebackReconciliation({ ...reconciliation, accountingFingerprint: '9'.repeat(64) }));
expectCode('terminal mismatch', 'DSP_A04_TERMINAL_FLAG_INVALID', () => {
  const value = { ...reconciliation, terminal: false };
  value.reconciliationFingerprint = refingerprint(value, 'reconciliationFingerprint');
  contract.validateChargebackReconciliation(value);
});
expectCode('single signal trust', 'DSP_A04_SINGLE_SIGNAL_TRUST_FORBIDDEN', () => {
  const value = { ...reconciliation, singleWebhookSufficient: true };
  value.reconciliationFingerprint = refingerprint(value, 'reconciliationFingerprint');
  contract.validateChargebackReconciliation(value);
});

const readiness = contract.readiness({ observationChainValid: true, reconciliationValid: true, providerNeutral: true, noSensitiveData: true, noSingleWebhookTrust: true });
Object.entries({
  structuralReady: true,
  runtimeIntegrated: false,
  providerSelected: false,
  providerCredentialsConfigured: false,
  stagingValidated: false,
  chargebackSubmissionAllowed: false,
  providerDecisionAuthority: false,
  financialEffectAllowed: false,
  productionAllowed: false
}).forEach(([field, expected]) => check(`readiness ${field}`, () => assert.equal(readiness[field], expected)));
check('readiness blockers', () => assert.deepEqual(readiness.blockers, ['DSP-B01', 'DSP-B03', 'DSP-B04', 'PAY-B01', 'PAY-B03', 'PAY-B04', 'WAL-B02', 'WAL-B03', 'WAL-B04']));

const result = { contractId: contract.CONTRACT_ID, total, passed, failed: failedCases.length, status: failedCases.length ? 'failed' : 'passed', failedCases };
console.log(JSON.stringify(result, null, 2));
if (failedCases.length) process.exitCode = 1;
