'use strict';

const fs = require('fs');
const path = require('path');
const contract = require('../backend/modules/reputation/rehire-transaction-readiness');

const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tests', 'fixtures', 'rep-a05-rehire-transaction-cases.json'), 'utf8'));
const checks = [];
const clone = (value) => JSON.parse(JSON.stringify(value));
const check = (name, condition) => checks.push({ name, passed: Boolean(condition) });
const equals = (name, actual, expected) => check(name, actual === expected);
const mutate = (base, callback) => { const value = clone(base); callback(value); return value; };

const ready = contract.evaluateRehire(fixtures.baseIntent, fixtures.baseSnapshot);
equals('base preview ready', ready.state, contract.STATES.READY);
equals('base reason', ready.reason, 'current_terms_confirmed');
equals('base transaction authority false', ready.transactionAuthority, false);
equals('base payment authority false', ready.paymentAuthority, false);
equals('base runtime authority false', ready.runtimeAuthority, false);
check('base transaction exists', Boolean(ready.transaction));
check('new order UUID', /^[0-9a-f-]{36}$/i.test(ready.transaction.newOrderId));
check('new transaction UUID', /^[0-9a-f-]{36}$/i.test(ready.transaction.newTransactionId));
check('new order differs from source', ready.transaction.newOrderId !== fixtures.baseIntent.sourceOrderId);
equals('source lineage role', ready.transaction.sourceOrderRole, 'lineage_only');
equals('old terms not copied', ready.transaction.oldCommercialTermsCopied, false);
equals('old finance not copied', ready.transaction.oldFinancialReferencesCopied, false);
equals('new proposal null', ready.transaction.newProposalId, null);
equals('new payment null', ready.transaction.newPaymentIntentId, null);
equals('new escrow null', ready.transaction.newEscrowId, null);
equals('new charge null', ready.transaction.newChargeId, null);
equals('auto payment false', ready.transaction.autoPaymentAllowed, false);
equals('downstream order required', ready.transaction.requiresDownstreamOrderAuthority, true);
equals('downstream payment required', ready.transaction.requiresDownstreamPaymentAuthority, true);
equals('current price preserved', ready.transaction.priceCents, 42000);
equals('current currency preserved', ready.transaction.currency, 'BRL');
equals('current catalog preserved', ready.transaction.catalogRevision, 'catalog-r9');
equals('current service preserved', ready.transaction.serviceRevision, 'service-r4');
equals('transaction fingerprint length', ready.transaction.transactionFingerprint.length, 64);
equals('outcome fingerprint length', ready.outcomeFingerprint.length, 64);
check('ready frozen', Object.isFrozen(ready));
check('transaction frozen', Object.isFrozen(ready.transaction));

const createIntent = mutate(fixtures.baseIntent, (value) => { value.action = 'create'; });
const created = contract.evaluateRehire(createIntent, fixtures.baseSnapshot);
equals('create state', created.state, contract.STATES.CREATED);
equals('create reason', created.reason, 'new_transaction_envelope_created');
equals('create order stable', created.transaction.newOrderId, ready.transaction.newOrderId);
equals('create transaction stable', created.transaction.newTransactionId, ready.transaction.newTransactionId);
const replay = contract.evaluateRehire(createIntent, fixtures.baseSnapshot, created);
equals('replay state', replay.state, contract.STATES.REPLAY);
equals('replay order same', replay.transaction.newOrderId, created.transaction.newOrderId);
equals('replay transaction same', replay.transaction.newTransactionId, created.transaction.newTransactionId);
equals('replay fingerprint same', replay.transaction.transactionFingerprint, created.transaction.transactionFingerprint);
equals('replay points to prior outcome', replay.replayOf, created.outcomeFingerprint);
equals('replay authority false', replay.transactionAuthority, false);

const conflictIntent = mutate(createIntent, (value) => { value.requestedLocationFingerprint = 'd9298a10d1b0735837dc4bd85dac641b0f3cef27a47e5d53a54f2f3f5b2fcffa'; });
equals('changed intent conflicts prior', contract.evaluateRehire(conflictIntent, fixtures.baseSnapshot, created).state, contract.STATES.CONFLICT);
const otherPrior = { ...created, idempotencyKey: 'rehire_v1_other' };
equals('different prior idempotency conflicts', contract.evaluateRehire(createIntent, fixtures.baseSnapshot, otherPrior).state, contract.STATES.CONFLICT);

const noConfirmation = mutate(fixtures.baseIntent, (value) => { delete value.confirmation; });
const confirmationRequired = contract.evaluateRehire(noConfirmation, fixtures.baseSnapshot);
equals('missing confirmation state', confirmationRequired.state, contract.STATES.CONFIRMATION_REQUIRED);
equals('missing confirmation price', confirmationRequired.priceCents, 42000);
equals('missing confirmation currency', confirmationRequired.currency, 'BRL');
['quoteFingerprint','availabilityFingerprint','termsFingerprint','scopeFingerprint'].forEach((field) => {
  const intent = mutate(fixtures.baseIntent, (value) => { value.confirmation[field] = 'd9298a10d1b0735837dc4bd85dac641b0f3cef27a47e5d53a54f2f3f5b2fcffa'; });
  equals(`confirmation mismatch ${field}`, contract.evaluateRehire(intent, fixtures.baseSnapshot).state, contract.STATES.CONFIRMATION_REQUIRED);
});
const futureConfirmation = mutate(fixtures.baseIntent, (value) => { value.confirmation.confirmedAt = '2026-08-04T23:00:00-03:00'; });
equals('future confirmation rejected', contract.evaluateRehire(futureConfirmation, fixtures.baseSnapshot).state, contract.STATES.CONFIRMATION_REQUIRED);

[
  ['requestedScopeFingerprint', 'scope'],
  ['requestedLocationFingerprint', 'location'],
  ['requestedScheduleFingerprint', 'schedule']
].forEach(([field, reason]) => {
  const intent = mutate(fixtures.baseIntent, (value) => { value[field] = 'd9298a10d1b0735837dc4bd85dac641b0f3cef27a47e5d53a54f2f3f5b2fcffa'; });
  const outcome = contract.evaluateRehire(intent, fixtures.baseSnapshot);
  equals(`requote ${reason} state`, outcome.state, contract.STATES.REQUOTE_REQUIRED);
  check(`requote ${reason} changed`, outcome.changed.includes(reason));
});
const unavailableSchedule = mutate(fixtures.baseSnapshot, (value) => { value.current.available = false; });
check('unavailable schedule requote', contract.evaluateRehire(fixtures.baseIntent, unavailableSchedule).changed.includes('availability'));
const expiredQuote = mutate(fixtures.baseSnapshot, (value) => { value.current.quoteExpiresAt = value.now; });
check('expired quote requote', contract.evaluateRehire(fixtures.baseIntent, expiredQuote).changed.includes('quote_expired'));

const actorInactive = mutate(fixtures.baseSnapshot, (value) => { value.actorActive = false; });
equals('inactive actor rejected', contract.evaluateRehire(fixtures.baseIntent, actorInactive).state, contract.STATES.REJECTED);
['professionalActive','serviceActive','serviceBookable'].forEach((field) => {
  const snapshot = mutate(fixtures.baseSnapshot, (value) => { value.current[field] = false; });
  equals(`current ${field} unavailable`, contract.evaluateRehire(fixtures.baseIntent, snapshot).state, contract.STATES.UNAVAILABLE);
});
[
  ['status', ['pending','accepted','in_progress','cancelled']],
  ['paymentStatus', ['pending','authorized','captured','refunded']],
  ['settlementState', ['pending','processing','failed','reversed']]
].forEach(([field, values]) => values.forEach((state) => {
  const snapshot = mutate(fixtures.baseSnapshot, (value) => { value.sourceOrder[field] = state; });
  const outcome = contract.evaluateRehire(fixtures.baseIntent, snapshot);
  equals(`source ${field} ${state} rejected`, outcome.state, contract.STATES.REJECTED);
  equals(`source ${field} ${state} reason`, outcome.reason, 'source_order_not_final');
}));
['open','under_review','appeal_pending','reconciliation_required','unknown'].forEach((state) => {
  const snapshot = mutate(fixtures.baseSnapshot, (value) => { value.sourceOrder.disputeState = state; });
  equals(`dispute ${state} blocks`, contract.evaluateRehire(fixtures.baseIntent, snapshot).reason, 'source_dispute_blocks_rehire');
});
['none','resolved','appeal_resolved'].forEach((state) => {
  const snapshot = mutate(fixtures.baseSnapshot, (value) => { value.sourceOrder.disputeState = state; });
  equals(`dispute ${state} permits`, contract.evaluateRehire(fixtures.baseIntent, snapshot).state, contract.STATES.READY);
});

const actorMismatch = mutate(fixtures.baseSnapshot, (value) => { value.sourceOrder.clientId = '88888888-8888-4888-8888-888888888888'; });
equals('source actor mismatch rejected', contract.evaluateRehire(fixtures.baseIntent, actorMismatch).reason, 'source_actor_mismatch');
const professionalMismatch = mutate(fixtures.baseSnapshot, (value) => { value.sourceOrder.professionalId = '88888888-8888-4888-8888-888888888888'; });
equals('professional mismatch conflict', contract.evaluateRehire(fixtures.baseIntent, professionalMismatch).state, contract.STATES.CONFLICT);
const serviceMismatch = mutate(fixtures.baseSnapshot, (value) => { value.sourceOrder.serviceId = '88888888-8888-4888-8888-888888888888'; });
equals('service mismatch conflict', contract.evaluateRehire(fixtures.baseIntent, serviceMismatch).state, contract.STATES.CONFLICT);
const lineageMismatch = mutate(fixtures.baseSnapshot, (value) => { value.sourceOrder.lineageFingerprint = 'd9298a10d1b0735837dc4bd85dac641b0f3cef27a47e5d53a54f2f3f5b2fcffa'; });
equals('lineage mismatch conflict', contract.evaluateRehire(fixtures.baseIntent, lineageMismatch).reason, 'source_lineage_mismatch');

[
  (v) => { v.source = 'browser_cache'; },
  (v) => { v.authoritative = false; },
  (v) => { v.now = 'invalid'; },
  (v) => { v.snapshotRevision = ''; },
  (v) => { v.current.currency = 'USD'; },
  (v) => { v.current.priceCents = -1; },
  (v) => { v.current.quoteFingerprint = 'bad'; },
  (v) => { v.sourceOrder.orderId = 'bad'; }
].forEach((change, index) => {
  const snapshot = mutate(fixtures.baseSnapshot, change);
  equals(`invalid snapshot ${index} unavailable`, contract.evaluateRehire(fixtures.baseIntent, snapshot).state, contract.STATES.UNAVAILABLE);
});
[
  (v) => { v.rehireIntentId = 'bad'; },
  (v) => { v.idempotencyKey = 'random'; },
  (v) => { v.action = 'pay_now'; },
  (v) => { v.actorId = 'bad'; },
  (v) => { v.sourceLineageFingerprint = 'bad'; },
  (v) => { v.requestedAt = 'invalid'; },
  (v) => { v.confirmation.confirmationId = 'bad'; },
  (v) => { v.confirmation.confirmedAt = 'invalid'; }
].forEach((change, index) => {
  const intent = mutate(fixtures.baseIntent, change);
  equals(`invalid intent ${index} unavailable`, contract.evaluateRehire(intent, fixtures.baseSnapshot).state, contract.STATES.UNAVAILABLE);
});

contract.FORBIDDEN_KEYS.forEach((key) => {
  check(`forbidden detector ${key}`, contract.containsForbiddenRawData({ nested: { [key]: 'secret' } }));
  const intent = mutate(fixtures.baseIntent, (value) => { value.nested = { [key]: 'secret' }; });
  equals(`forbidden intent ${key}`, contract.evaluateRehire(intent, fixtures.baseSnapshot).state, contract.STATES.UNAVAILABLE);
  const snapshot = mutate(fixtures.baseSnapshot, (value) => { value.nested = { [key]: 'secret' }; });
  equals(`forbidden snapshot ${key}`, contract.evaluateRehire(fixtures.baseIntent, snapshot).state, contract.STATES.UNAVAILABLE);
});

for (let index = 0; index < 30; index += 1) {
  const first = contract.deterministicUuid(`seed-${index}`);
  const second = contract.deterministicUuid(`seed-${index}`);
  check(`deterministic uuid shape ${index}`, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(first));
  equals(`deterministic uuid stable ${index}`, first, second);
}

Object.values(contract.STATES).forEach((state) => {
  const outcome = state === contract.STATES.READY ? ready : { contractId: contract.CONTRACT_ID, state };
  const signal = contract.buildRetentionSignal(outcome);
  equals(`signal ${state} event`, signal.event, 'rehire_readiness_evaluated');
  equals(`signal ${state} state`, signal.outcomeState, state);
  equals(`signal ${state} amount excluded`, signal.amountIncluded, false);
  equals(`signal ${state} identity excluded`, signal.rawIdentityIncluded, false);
  equals(`signal ${state} analytics authority false`, signal.analyticsWriteAuthority, false);
  equals(`signal ${state} runtime false`, signal.runtimeAuthority, false);
  equals(`signal ${state} fingerprint`, signal.signalFingerprint.length, 64);
});
const signal = contract.buildRetentionSignal(ready);
equals('signal professional hash length', signal.professionalIdHash.length, 64);
equals('signal service hash length', signal.serviceIdHash.length, 64);
equals('signal source hash length', signal.sourceOrderIdHash.length, 64);
equals('signal new order hash length', signal.newOrderIdHash.length, 64);
check('signal excludes raw actor', !JSON.stringify(signal).includes(fixtures.baseIntent.actorId));
check('signal frozen', Object.isFrozen(signal));

const total = checks.length;
const failedCases = checks.filter((item) => !item.passed).map((item) => item.name);
console.log(JSON.stringify({ contractId: contract.CONTRACT_ID, total, passed: total - failedCases.length, failed: failedCases.length, status: failedCases.length ? 'failed' : 'passed', failedCases }, null, 2));
if (failedCases.length) process.exitCode = 1;
