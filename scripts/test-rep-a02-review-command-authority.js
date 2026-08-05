'use strict';

const authority = require('../backend/modules/reputation/review-command-authority');
const fixtures = require('../tests/fixtures/rep-a02-review-command-cases.json');

const cases = [];
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function add(name, fn) { cases.push({ name, fn }); }
function command(patch = {}) { return Object.assign(clone(fixtures.baseCommand), patch); }
function snapshot(patch = {}) {
  const base = clone(fixtures.baseSnapshot);
  Object.keys(patch).forEach((key) => {
    if (patch[key] && typeof patch[key] === 'object' && !Array.isArray(patch[key]) && base[key]) {
      base[key] = Object.assign(base[key], patch[key]);
    } else base[key] = patch[key];
  });
  return base;
}
function expectDecision(result, decision, reason) {
  if (result.decision !== decision || (reason && result.reason !== reason)) {
    throw new Error(`expected ${decision}/${reason || '*'} got ${result.decision}/${result.reason}`);
  }
}

add('base command accepts', () => expectDecision(authority.evaluateEligibility(command(), snapshot()), 'accept', 'eligible'));
add('same input stable idempotency', () => {
  const first = authority.buildReviewCommand(command());
  const second = authority.buildReviewCommand(command());
  if (first.idempotencyKey !== second.idempotencyKey
      || first.intentFingerprint !== second.intentFingerprint
      || first.deterministicReviewId !== second.deterministicReviewId) throw new Error('unstable');
});
add('tag order canonical', () => {
  const first = authority.buildReviewCommand(command({ tags: ['qualidade','pontual'] }));
  const second = authority.buildReviewCommand(command({ tags: ['pontual','qualidade'] }));
  if (first.intentFingerprint !== second.intentFingerprint) throw new Error('tag order drift');
});
add('criteria order canonical', () => {
  const first = authority.buildReviewCommand(command({ criteria: [{key:'quality',rating:5},{key:'communication',rating:5}] }));
  const second = authority.buildReviewCommand(command({ criteria: [{key:'communication',rating:5},{key:'quality',rating:5}] }));
  if (first.intentFingerprint !== second.intentFingerprint) throw new Error('criteria order drift');
});
add('new request same subject keeps uniqueness', () => {
  const first = authority.buildReviewCommand(command());
  const second = authority.buildReviewCommand(command({ clientRequestId: fixtures.ids.request2 }));
  if (first.uniquenessKey !== second.uniquenessKey || first.idempotencyKey === second.idempotencyKey) throw new Error('identity split wrong');
});
add('rating changes fingerprint not idempotency key', () => {
  const first = authority.buildReviewCommand(command());
  const second = authority.buildReviewCommand(command({ rating: 4 }));
  if (first.idempotencyKey !== second.idempotencyKey || first.intentFingerprint === second.intentFingerprint) throw new Error('fingerprint wrong');
});

[
  ['non canonical source',{source:'browser_cache'},'unavailable','non_canonical_snapshot'],
  ['non authoritative',{authoritative:false},'unavailable','non_canonical_snapshot'],
  ['actor inactive',{actor:{active:false}},'reject','actor_inactive'],
  ['professional actor',{actor:{role:'professional'}},'reject','role_not_allowed'],
  ['order requested',{order:{status:'requested'}},'reject','order_not_completed'],
  ['order disputed',{order:{status:'disputed'}},'reject','order_not_completed'],
  ['payment pending',{payment:{status:'pending'}},'reject','payment_not_released'],
  ['payment refunded',{payment:{status:'refunded'}},'reject','payment_not_released'],
  ['dispute blocks',{dispute:{reviewBlocked:true}},'reject','dispute_blocks_review'],
  ['actor mismatch',{actor:{id:fixtures.ids.other}},'reject','actor_not_order_client'],
  ['order client mismatch',{order:{clientId:fixtures.ids.other}},'reject','actor_not_order_client'],
  ['professional mismatch',{order:{professionalId:fixtures.ids.other}},'reject','reviewed_user_not_order_professional'],
  ['order revision mismatch',{order:{revision:'order-r8'}},'conflict','revision_mismatch'],
  ['payment revision mismatch',{payment:{revision:'payment-r5'}},'conflict','revision_mismatch'],
  ['dispute revision mismatch',{dispute:{revision:'dispute-r2'}},'conflict','revision_mismatch']
].forEach(([name, patch, decision, reason]) => add(name, () => expectDecision(authority.evaluateEligibility(command(), snapshot(patch)), decision, reason)));

[
  ['missing request',{clientRequestId:''}],
  ['bad request uuid',{clientRequestId:'request-1'}],
  ['bad actor uuid',{actorId:'actor'}],
  ['bad order uuid',{orderId:'order'}],
  ['bad reviewed uuid',{reviewedUserId:'user'}],
  ['rating zero',{rating:0}],
  ['rating six',{rating:6}],
  ['rating decimal',{rating:4.5}],
  ['unsupported scope',{scope:'professional_to_client'}],
  ['missing order revision',{expectedOrderRevision:''}],
  ['missing payment revision',{expectedPaymentRevision:''}],
  ['missing dispute revision',{expectedDisputeRevision:''}],
  ['too many tags',{tags:Array.from({length:13},(_,index)=>`t${index}`)}],
  ['too many criteria',{criteria:Array.from({length:13},(_,index)=>({key:`c${index}`,rating:5}))}],
  ['duplicate criteria',{criteria:[{key:'quality',rating:5},{key:'quality',rating:4}]}],
  ['forbidden credential',{sessionCredential:'redacted'}],
  ['nested forbidden bank destination',{metadata:{bankDestination:'x'}}],
  ['nested forbidden payment instrument',{metadata:{paymentInstrument:'x'}}],
  ['nested forbidden raw payload',{metadata:{rawPayload:{x:1}}}]
].forEach(([name, patch]) => add(name, () => expectDecision(authority.evaluateEligibility(command(patch), snapshot()), 'reject', 'invalid_command')));

add('existing same command replays', () => {
  const built = authority.buildReviewCommand(command());
  const result = authority.evaluateEligibility(command(), snapshot({ existingReview: {
    reviewId:'review-existing', uniquenessKey:built.uniquenessKey, idempotencyKey:built.idempotencyKey,
    intentFingerprint:built.intentFingerprint, outcomeFingerprint:'outcome'
  }}));
  expectDecision(result, 'replay', 'existing_review_replay');
  if (result.reviewId !== 'review-existing') throw new Error('wrong review');
});
add('existing changed payload conflicts', () => {
  const built = authority.buildReviewCommand(command());
  expectDecision(authority.evaluateEligibility(command({rating:4}), snapshot({existingReview:{
    reviewId:'review-existing', uniquenessKey:built.uniquenessKey, idempotencyKey:built.idempotencyKey,
    intentFingerprint:built.intentFingerprint
  }})), 'conflict', 'existing_review_conflict');
});
add('existing wrong uniqueness conflicts', () => {
  const built = authority.buildReviewCommand(command());
  expectDecision(authority.evaluateEligibility(command(), snapshot({existingReview:{
    reviewId:'review-existing', uniquenessKey:'other', idempotencyKey:built.idempotencyKey,
    intentFingerprint:built.intentFingerprint
  }})), 'conflict', 'uniqueness_conflict');
});

['accepted','committed','rejected'].forEach((state) => add(`ledger ${state} replays`, () => {
  const built = authority.buildReviewCommand(command());
  const result = authority.resolveCommand(command(), snapshot(), {
    state, idempotencyKey:built.idempotencyKey, intentFingerprint:built.intentFingerprint,
    reviewId:'review-ledger', outcomeFingerprint:'outcome-ledger'
  });
  expectDecision(result, 'replay', 'replay_same_outcome');
  if (result.reviewId !== 'review-ledger' || result.priorState !== state) throw new Error('ledger mismatch');
}));
add('ledger payload drift conflicts', () => {
  const built = authority.buildReviewCommand(command());
  expectDecision(authority.resolveCommand(command({rating:4}), snapshot(), {
    state:'accepted', idempotencyKey:built.idempotencyKey, intentFingerprint:built.intentFingerprint
  }), 'conflict', 'idempotency_payload_conflict');
});
add('ledger resolution required unavailable', () => {
  const built = authority.buildReviewCommand(command());
  expectDecision(authority.resolveCommand(command(), snapshot(), {
    state:'resolution_required', idempotencyKey:built.idempotencyKey, intentFingerprint:built.intentFingerprint
  }), 'unavailable', 'ledger_resolution_required');
});

[1,2,3,4,5].forEach((value) => add(`rating ${value} accepted`, () => {
  expectDecision(authority.evaluateEligibility(command({rating:value}), snapshot()), 'accept', 'eligible');
}));
['','Bom','  Muito   bom  ','x'.repeat(2500)].forEach((comment, index) => add(`comment normalization ${index}`, () => {
  const built = authority.buildReviewCommand(command({comment}));
  if (built.comment.length > 2000 || /\s{2,}/.test(built.comment)) throw new Error('comment normalization');
}));
for (let index = 0; index < 12; index += 1) {
  add(`tag count ${index + 1} accepted`, () => {
    const values = Array.from({length:index + 1},(_,item)=>`tag-${item}`);
    if (authority.buildReviewCommand(command({tags:values})).tags.length !== values.length) throw new Error('tag count');
  });
}
for (let index = 0; index < 12; index += 1) {
  add(`criteria count ${index + 1} accepted`, () => {
    const values = Array.from({length:index + 1},(_,item)=>({key:`criterion-${item}`,rating:(item%5)+1}));
    if (authority.buildReviewCommand(command({criteria:values})).criteria.length !== values.length) throw new Error('criteria count');
  });
}
authority.FORBIDDEN_KEYS.forEach((key) => add(`recursive forbidden ${key}`, () => {
  if (!authority.containsForbiddenRawData({a:[{b:{[key]:'x'}}]})) throw new Error('not detected');
}));

add('outcome fingerprint stable', () => {
  const accepted = authority.evaluateEligibility(command(), snapshot());
  const first = authority.buildOutcomeFingerprint(accepted);
  const second = authority.buildOutcomeFingerprint(accepted);
  if (first !== second || first.length !== 64) throw new Error('outcome fingerprint');
});
add('outcome changes with decision', () => {
  const first = authority.buildOutcomeFingerprint({decision:'accept',reason:'eligible',reviewId:'r'});
  const second = authority.buildOutcomeFingerprint({decision:'reject',reason:'ineligible',reviewId:'r'});
  if (first === second) throw new Error('outcome collision');
});

const failures = [];
cases.forEach(({name, fn}) => {
  try { fn(); } catch (error) { failures.push({name,error:error.message}); }
});
const result = {
  contractId: authority.CONTRACT_ID,
  total: cases.length,
  passed: cases.length - failures.length,
  failed: failures.length,
  status: failures.length ? 'failed' : 'passed',
  failedCases: failures
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
