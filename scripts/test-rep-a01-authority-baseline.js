'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config', 'rep-a01-authority-baseline.json'), 'utf8'));
const cases = [];

function test(name, condition) {
  cases.push({ name, passed: Boolean(condition) });
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function reviewReadiness(input) {
  const reasons = [];
  if (!isUuid(input.actorId)) reasons.push('AUTHENTICATED_UUID_REQUIRED');
  if (!input.serverCommand) reasons.push('SERVER_COMMAND_REQUIRED');
  if (!input.stableRequestId) reasons.push('STABLE_REQUEST_ID_REQUIRED');
  if (!input.actorIsParticipant) reasons.push('ORDER_PARTICIPANT_REQUIRED');
  if (!input.correctCounterparty) reasons.push('COUNTERPARTY_MISMATCH');
  if (input.orderStatus !== 'completed') reasons.push('COMPLETED_ORDER_REQUIRED');
  if (input.paymentStatus !== 'released') reasons.push('PAYMENT_RELEASE_REQUIRED');
  if (input.activeDispute) reasons.push('ACTIVE_DISPUTE_BLOCKS_REVIEW');
  if (input.existingReview) reasons.push('REVIEW_ALREADY_EXISTS');
  if (!input.moderationIntake) reasons.push('MODERATION_INTAKE_REQUIRED');
  if (!input.atomicEffects) reasons.push('ATOMIC_EFFECTS_REQUIRED');
  return { ready: reasons.length === 0, reasons };
}

function reputationReadiness(input) {
  const reasons = [];
  if (!input.serverProjection) reasons.push('SERVER_PROJECTION_REQUIRED');
  if (!input.policyVersion) reasons.push('POLICY_VERSION_REQUIRED');
  if (!input.moderationStateApplied) reasons.push('MODERATION_STATE_REQUIRED');
  if (!input.fraudControls) reasons.push('FRAUD_CONTROLS_REQUIRED');
  if (!input.disputePolicyApplied) reasons.push('DISPUTE_POLICY_REQUIRED');
  if (!input.auditTrail) reasons.push('AUDIT_TRAIL_REQUIRED');
  return { ready: reasons.length === 0, reasons };
}

function rehireReadiness(input) {
  const reasons = [];
  if (!input.priorCompletedOrderId) reasons.push('PRIOR_COMPLETED_ORDER_REQUIRED');
  if (!input.newOrderId) reasons.push('NEW_ORDER_REQUIRED');
  if (!input.currentServiceSnapshot) reasons.push('CURRENT_SERVICE_SNAPSHOT_REQUIRED');
  if (!input.currentPriceAuthority) reasons.push('CURRENT_PRICE_AUTHORITY_REQUIRED');
  if (!input.currentAvailabilityAuthority) reasons.push('CURRENT_AVAILABILITY_REQUIRED');
  if (!input.dokeTransactionLink) reasons.push('DOKE_TRANSACTION_LINK_REQUIRED');
  return { ready: reasons.length === 0, reasons };
}

const validReview = {
  actorId: '11111111-1111-4111-8111-111111111111',
  serverCommand: true,
  stableRequestId: true,
  actorIsParticipant: true,
  correctCounterparty: true,
  orderStatus: 'completed',
  paymentStatus: 'released',
  activeDispute: false,
  existingReview: false,
  moderationIntake: true,
  atomicEffects: true
};

test('fully valid review readiness', reviewReadiness(validReview).ready);
[
  ['non uuid actor rejected', { actorId: 'local-client' }, 'AUTHENTICATED_UUID_REQUIRED'],
  ['browser-only submission rejected', { serverCommand: false }, 'SERVER_COMMAND_REQUIRED'],
  ['unstable request rejected', { stableRequestId: false }, 'STABLE_REQUEST_ID_REQUIRED'],
  ['nonparticipant rejected', { actorIsParticipant: false }, 'ORDER_PARTICIPANT_REQUIRED'],
  ['wrong counterparty rejected', { correctCounterparty: false }, 'COUNTERPARTY_MISMATCH'],
  ['open order rejected', { orderStatus: 'in_progress' }, 'COMPLETED_ORDER_REQUIRED'],
  ['unreleased payment rejected', { paymentStatus: 'captured' }, 'PAYMENT_RELEASE_REQUIRED'],
  ['active dispute rejected', { activeDispute: true }, 'ACTIVE_DISPUTE_BLOCKS_REVIEW'],
  ['duplicate review rejected', { existingReview: true }, 'REVIEW_ALREADY_EXISTS'],
  ['publication bypass rejected', { moderationIntake: false }, 'MODERATION_INTAKE_REQUIRED'],
  ['non-atomic effects rejected', { atomicEffects: false }, 'ATOMIC_EFFECTS_REQUIRED']
].forEach(([name, patch, reason]) => {
  const result = reviewReadiness({ ...validReview, ...patch });
  test(name, !result.ready && result.reasons.includes(reason));
});

const validReputation = {
  serverProjection: true,
  policyVersion: 'rep-policy-v1',
  moderationStateApplied: true,
  fraudControls: true,
  disputePolicyApplied: true,
  auditTrail: true
};
test('fully valid reputation readiness', reputationReadiness(validReputation).ready);
[
  ['browser reputation rejected', { serverProjection: false }, 'SERVER_PROJECTION_REQUIRED'],
  ['unversioned policy rejected', { policyVersion: '' }, 'POLICY_VERSION_REQUIRED'],
  ['unmoderated rows rejected', { moderationStateApplied: false }, 'MODERATION_STATE_REQUIRED'],
  ['missing fraud controls rejected', { fraudControls: false }, 'FRAUD_CONTROLS_REQUIRED'],
  ['missing dispute policy rejected', { disputePolicyApplied: false }, 'DISPUTE_POLICY_REQUIRED'],
  ['missing audit rejected', { auditTrail: false }, 'AUDIT_TRAIL_REQUIRED']
].forEach(([name, patch, reason]) => {
  const result = reputationReadiness({ ...validReputation, ...patch });
  test(name, !result.ready && result.reasons.includes(reason));
});

const validRehire = {
  priorCompletedOrderId: 'order-prior',
  newOrderId: 'order-new',
  currentServiceSnapshot: true,
  currentPriceAuthority: true,
  currentAvailabilityAuthority: true,
  dokeTransactionLink: true
};
test('fully valid rehire readiness', rehireReadiness(validRehire).ready);
[
  ['missing prior order rejected', { priorCompletedOrderId: '' }, 'PRIOR_COMPLETED_ORDER_REQUIRED'],
  ['same transaction reuse rejected', { newOrderId: '' }, 'NEW_ORDER_REQUIRED'],
  ['stale service snapshot rejected', { currentServiceSnapshot: false }, 'CURRENT_SERVICE_SNAPSHOT_REQUIRED'],
  ['stale price rejected', { currentPriceAuthority: false }, 'CURRENT_PRICE_AUTHORITY_REQUIRED'],
  ['stale availability rejected', { currentAvailabilityAuthority: false }, 'CURRENT_AVAILABILITY_REQUIRED'],
  ['off-platform rehire rejected', { dokeTransactionLink: false }, 'DOKE_TRANSACTION_LINK_REQUIRED']
].forEach(([name, patch, reason]) => {
  const result = rehireReadiness({ ...validRehire, ...patch });
  test(name, !result.ready && result.reasons.includes(reason));
});

test('contract has no review command authority', contract.authority.reviewCommandAuthority === false);
test('contract has no publication authority', contract.authority.reviewPublicationAuthority === false);
test('contract has no moderation authority', contract.authority.moderationAuthority === false);
test('contract has no reputation projection authority', contract.authority.reputationProjectionAuthority === false);
test('contract has no fraud decision authority', contract.authority.fraudDecisionAuthority === false);
test('contract has no rehire authority', contract.authority.rehireAuthority === false);
test('contract has no runtime mutation authority', contract.authority.runtimeMutationAuthority === false);
test('contract has no staging authority', contract.authority.stagingAuthority === false);
test('contract has no production authority', contract.authority.productionAuthority === false);

Object.entries(contract.prohibitedEffects).forEach(([key, value]) => test(`effect ${key} remains false`, value === false));
contract.preservedBlockers.forEach((blocker) => test(`blocker ${blocker} remains preserved`, typeof blocker === 'string' && blocker.length > 4));
contract.nextSublots.forEach((sublot) => test(`next sublot documented: ${sublot}`, typeof sublot === 'string' && sublot.startsWith('REP-A0')));

const failedCases = cases.filter((item) => !item.passed).map((item) => item.name);
const result = {
  contractId: contract.contractId,
  total: cases.length,
  passed: cases.length - failedCases.length,
  failed: failedCases.length,
  status: failedCases.length ? 'failed' : 'passed',
  failedCases
};
console.log(JSON.stringify(result, null, 2));
if (failedCases.length) process.exit(1);
