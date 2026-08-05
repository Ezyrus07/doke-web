'use strict';

const assert = require('assert');
const a = require('../backend/modules/reputation/review-moderation-lifecycle');
const f = require('../tests/fixtures/rep-a03-review-moderation-cases.json');

let total = 0;
const check = (name, fn) => {
  total += 1;
  try { fn(); }
  catch (error) { error.message = `${name}: ${error.message}`; throw error; }
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const command = (patch) => ({ ...clone(f.baseCommand), ...(patch || {}) });
const snapshot = (patch) => {
  const value = clone(f.baseSnapshot);
  if (!patch) return value;
  Object.entries(patch).forEach(([key, entry]) => {
    value[key] = entry && typeof entry === 'object' && !Array.isArray(entry)
      ? { ...(value[key] || {}), ...entry }
      : entry;
  });
  return value;
};
const expectDecision = (name, input, snap, decision, reason) => check(name, () => {
  const result = a.evaluateModeration(input, snap);
  assert.equal(result.decision, decision);
  if (reason) assert.equal(result.reason, reason);
});

check('contract id', () => assert.equal(a.CONTRACT_ID, 'rep-a03-review-moderation-lifecycle-v1'));
check('actions frozen', () => assert.ok(Object.isFrozen(a.ACTIONS)));
check('states frozen', () => assert.ok(Object.isFrozen(a.REVIEW_STATES)));
check('decisions frozen', () => assert.ok(Object.isFrozen(a.DECISIONS)));

const built = a.buildModerationCommand(f.baseCommand);
check('command frozen', () => assert.ok(Object.isFrozen(built)));
check('command idempotency prefix', () => assert.ok(built.idempotencyKey.startsWith('review_moderation_command_v1_')));
check('command event prefix', () => assert.ok(built.deterministicEventId.startsWith('review_moderation_event_')));
check('command fingerprint', () => assert.equal(built.intentFingerprint.length, 64));
check('evidence sorted', () => assert.deepEqual(built.evidenceRefs, ['evidence://policy-check/1','evidence://policy-check/2']));
check('deterministic command', () => assert.equal(a.buildModerationCommand(f.baseCommand).intentFingerprint, built.intentFingerprint));

expectDecision('publish accepted', f.baseCommand, f.baseSnapshot, 'accept', 'transition_allowed');
const published = a.evaluateModeration(f.baseCommand, f.baseSnapshot);
check('publish state', () => assert.equal(published.reviewState, 'published'));
check('publish visibility', () => assert.equal(published.publicVisibility, true));
check('publish no runtime', () => assert.equal(published.runtimeAuthority, false));
check('publish no reputation mutation', () => assert.equal(published.reputationMutationAuthority, false));

const reportCommand = command({
  action:'report', actorId:f.ids.reporter, actorRole:'authenticated_user',
  reasonCode:'harassment', evidenceRefs:['evidence://report/1']
});
const reportSnapshot = snapshot({
  review:{ state:'published' },
  actor:{ id:f.ids.reporter, role:'authenticated_user' }
});
expectDecision('report accepted', reportCommand, reportSnapshot, 'accept', 'transition_allowed');
const reported = a.evaluateModeration(reportCommand, reportSnapshot);
check('report opens case', () => assert.equal(reported.caseState, 'open'));
check('report does not hide', () => assert.equal(reported.reviewState, 'published'));
check('report remains visible', () => assert.equal(reported.publicVisibility, true));

const triageCommand = command({ action:'triage', reasonCode:'queue_accept' });
const triageSnapshot = snapshot({ review:{state:'published'}, moderationCase:{state:'open'} });
expectDecision('triage accepted', triageCommand, triageSnapshot, 'accept');
check('triage case state', () => assert.equal(a.evaluateModeration(triageCommand, triageSnapshot).caseState, 'under_review'));

for (const [action, expectedReview, expectedVisibility] of [
  ['hide','hidden',false],
  ['remove','removed',false],
  ['dismiss_report','published',true]
]) {
  const input = command({ action, reasonCode:`decision_${action}` });
  const snap = snapshot({ review:{state:'published'}, moderationCase:{state:'under_review'} });
  expectDecision(`${action} accepted`, input, snap, 'accept');
  const result = a.evaluateModeration(input, snap);
  check(`${action} review state`, () => assert.equal(result.reviewState, expectedReview));
  check(`${action} visibility`, () => assert.equal(result.publicVisibility, expectedVisibility));
  check(`${action} resolves case`, () => assert.equal(result.caseState, 'resolved'));
}

const appealCommand = command({
  action:'appeal', actorId:f.ids.author, actorRole:'review_author',
  reasonCode:'appeal_context', priorDecisionEventId:f.ids.event
});
const appealSnapshot = snapshot({
  review:{state:'removed'},
  moderationCase:{state:'resolved', lastDecisionActorId:f.ids.moderator, lastDecisionEventId:f.ids.event},
  actor:{id:f.ids.author, role:'review_author'}
});
expectDecision('appeal accepted', appealCommand, appealSnapshot, 'accept');
check('appeal pending', () => assert.equal(a.evaluateModeration(appealCommand, appealSnapshot).caseState, 'appeal_pending'));
check('appeal does not restore', () => assert.equal(a.evaluateModeration(appealCommand, appealSnapshot).reviewState, 'removed'));

for (const [action, expectedReview, expectedVisibility] of [
  ['restore','published',true],
  ['deny_appeal','removed',false]
]) {
  const input = command({
    action, actorId:f.ids.senior, actorRole:'senior_moderator',
    reasonCode:`appeal_${action}`, priorDecisionEventId:f.ids.event
  });
  const snap = snapshot({
    review:{state:'removed'},
    moderationCase:{
      state:'appeal_pending',
      lastDecisionActorId:f.ids.moderator,
      lastDecisionEventId:f.ids.event
    },
    actor:{id:f.ids.senior, role:'senior_moderator'}
  });
  expectDecision(`${action} accepted`, input, snap, 'accept');
  const result = a.evaluateModeration(input, snap);
  check(`${action} appeal resolved`, () => assert.equal(result.caseState, 'appeal_resolved'));
  check(`${action} expected review`, () => assert.equal(result.reviewState, expectedReview));
  check(`${action} expected visibility`, () => assert.equal(result.publicVisibility, expectedVisibility));
}

expectDecision('non canonical unavailable', f.baseCommand, snapshot({source:'cache'}), 'unavailable', 'non_canonical_snapshot');
expectDecision('non authoritative unavailable', f.baseCommand, snapshot({authoritative:false}), 'unavailable');
expectDecision('inactive actor rejected', f.baseCommand, snapshot({actor:{active:false}}), 'reject', 'actor_inactive');
expectDecision('actor id mismatch rejected', f.baseCommand, snapshot({actor:{id:f.ids.senior}}), 'reject', 'actor_context_mismatch');
expectDecision('actor role mismatch rejected', f.baseCommand, snapshot({actor:{role:'senior_moderator'}}), 'reject', 'actor_context_mismatch');
expectDecision('review mismatch rejected', f.baseCommand, snapshot({review:{id:f.ids.author}}), 'reject', 'subject_mismatch');
expectDecision('case mismatch rejected', f.baseCommand, snapshot({moderationCase:{id:f.ids.author}}), 'reject', 'subject_mismatch');
expectDecision('review revision conflict', f.baseCommand, snapshot({review:{revision:'other'}}), 'conflict', 'revision_mismatch');
expectDecision('case revision conflict', f.baseCommand, snapshot({moderationCase:{revision:'other'}}), 'conflict', 'revision_mismatch');
expectDecision('reporter cannot publish', command({actorId:f.ids.reporter,actorRole:'authenticated_user'}), snapshot({actor:{id:f.ids.reporter,role:'authenticated_user'}}), 'reject', 'role_not_allowed');
expectDecision('moderator cannot report', command({action:'report'}), snapshot({review:{state:'published'}}), 'reject', 'role_not_allowed');
expectDecision('moderator conflict author', f.baseCommand, snapshot({actor:{id:f.ids.author}, review:{authorId:f.ids.author}}), 'reject', 'actor_context_mismatch');
expectDecision('author mismatch appeal rejected', appealCommand, snapshot({
  review:{state:'removed',authorId:f.ids.reviewed},
  moderationCase:{state:'resolved',lastDecisionEventId:f.ids.event,lastDecisionActorId:f.ids.moderator},
  actor:{id:f.ids.author,role:'review_author'}
}), 'reject', 'only_review_author_may_appeal');

const sameActorRestore = command({
  action:'restore', actorId:f.ids.moderator, actorRole:'senior_moderator',
  reasonCode:'restore', priorDecisionEventId:f.ids.event
});
expectDecision('appeal independence', sameActorRestore, snapshot({
  review:{state:'removed'},
  moderationCase:{state:'appeal_pending',lastDecisionActorId:f.ids.moderator,lastDecisionEventId:f.ids.event},
  actor:{id:f.ids.moderator,role:'senior_moderator'}
}), 'reject', 'appeal_independence_required');

const wrongPrior = command({
  action:'restore', actorId:f.ids.senior, actorRole:'senior_moderator',
  reasonCode:'restore', priorDecisionEventId:f.ids.author
});
expectDecision('prior decision mismatch', wrongPrior, snapshot({
  review:{state:'removed'},
  moderationCase:{state:'appeal_pending',lastDecisionActorId:f.ids.moderator,lastDecisionEventId:f.ids.event},
  actor:{id:f.ids.senior,role:'senior_moderator'}
}), 'conflict', 'prior_decision_mismatch');

for (const [action, reviewState, caseState] of [
  ['publish','published','none'],
  ['report','pending_moderation','none'],
  ['triage','published','resolved'],
  ['hide','published','open'],
  ['remove','published','open'],
  ['dismiss_report','hidden','under_review'],
  ['appeal','published','resolved'],
  ['restore','removed','resolved'],
  ['deny_appeal','published','appeal_pending']
]) {
  const actorPatch = ['report'].includes(action)
    ? {actorId:f.ids.reporter,actorRole:'authenticated_user'}
    : ['appeal'].includes(action)
      ? {actorId:f.ids.author,actorRole:'review_author'}
      : ['restore','deny_appeal'].includes(action)
        ? {actorId:f.ids.senior,actorRole:'senior_moderator',priorDecisionEventId:f.ids.event}
        : {};
  const snapActor = action === 'report'
    ? {id:f.ids.reporter,role:'authenticated_user'}
    : action === 'appeal'
      ? {id:f.ids.author,role:'review_author'}
      : ['restore','deny_appeal'].includes(action)
        ? {id:f.ids.senior,role:'senior_moderator'}
        : {id:f.ids.moderator,role:'moderator'};
  const casePatch = {state:caseState,lastDecisionEventId:f.ids.event,lastDecisionActorId:f.ids.moderator};
  expectDecision(`invalid transition ${action}`, command({action,reasonCode:'test',...actorPatch}),
    snapshot({review:{state:reviewState},moderationCase:casePatch,actor:snapActor}), 'reject', 'invalid_state_transition');
}

const replayCommand = a.buildModerationCommand(f.baseCommand);
expectDecision('replay same outcome', f.baseCommand, snapshot({ledger:{
  idempotencyKey:replayCommand.idempotencyKey,
  intentFingerprint:replayCommand.intentFingerprint,
  state:'committed',
  eventId:replayCommand.deterministicEventId,
  outcomeFingerprint:'outcome'
}}), 'replay', 'replay_same_outcome');
expectDecision('ledger resolution required', f.baseCommand, snapshot({ledger:{
  idempotencyKey:replayCommand.idempotencyKey,
  intentFingerprint:replayCommand.intentFingerprint,
  state:'resolution_required'
}}), 'unavailable', 'ledger_resolution_required');
expectDecision('idempotency payload conflict', command({reasonSummary:'changed'}), snapshot({ledger:{
  idempotencyKey:a.buildModerationCommand(command({reasonSummary:'changed'})).idempotencyKey,
  intentFingerprint:'different',
  state:'committed'
}}), 'conflict', 'idempotency_payload_conflict');

for (const key of a.FORBIDDEN_KEYS) {
  check(`forbidden ${key}`, () => assert.equal(a.containsForbiddenRawData({nested:{[key]:'x'}}), true));
  check(`forbidden command ${key}`, () => assert.throws(() => a.buildModerationCommand({...f.baseCommand,[key]:'x'})));
}
for (const action of Object.values(a.ACTIONS)) {
  check(`action recognized ${action}`, () => {
    const input = command({action,reasonCode:'known'});
    if (action === 'report') Object.assign(input,{actorId:f.ids.reporter,actorRole:'authenticated_user'});
    if (action === 'appeal') Object.assign(input,{actorId:f.ids.author,actorRole:'review_author'});
    if (['restore','deny_appeal'].includes(action)) Object.assign(input,{actorId:f.ids.senior,actorRole:'senior_moderator',priorDecisionEventId:f.ids.event});
    assert.equal(a.buildModerationCommand(input).action, action);
  });
}

for (const key of ['clientRequestId','actorId','reviewId','caseId']) {
  check(`invalid uuid ${key}`, () => assert.throws(() => a.buildModerationCommand({...f.baseCommand,[key]:'bad'})));
}
check('unsupported action', () => assert.throws(() => a.buildModerationCommand({...f.baseCommand,action:'delete_everything'})));
check('missing review revision', () => assert.throws(() => a.buildModerationCommand({...f.baseCommand,expectedReviewRevision:''})));
check('missing case revision', () => assert.throws(() => a.buildModerationCommand({...f.baseCommand,expectedCaseRevision:''})));
check('missing reason', () => assert.throws(() => a.buildModerationCommand({...f.baseCommand,reasonCode:''})));
check('too many refs', () => assert.throws(() => a.buildModerationCommand({...f.baseCommand,evidenceRefs:Array.from({length:25},(_,i)=>`ref-${i}`)})));

const accepted = a.evaluateModeration(f.baseCommand, f.baseSnapshot);
const envelope = a.buildEventEnvelope(accepted, f.baseSnapshot, '2026-08-04T20:00:00-03:00');
check('event frozen', () => assert.ok(Object.isFrozen(envelope)));
check('event hash length', () => assert.equal(envelope.eventHash.length,64));
check('event previous hash', () => assert.equal(envelope.previousEventHash,'genesis-review-6666'));
check('event action', () => assert.equal(envelope.action,'publish'));
check('event no raw summary', () => assert.equal(Object.prototype.hasOwnProperty.call(envelope,'reasonSummary'),false));
check('event requires accepted', () => assert.throws(() => a.buildEventEnvelope({decision:'reject'},f.baseSnapshot,'x')));
check('event requires time', () => assert.throws(() => a.buildEventEnvelope(accepted,f.baseSnapshot,'')));
check('outcome fingerprint length', () => assert.equal(a.buildOutcomeFingerprint(accepted).length,64));
check('stable json', () => assert.equal(a.stableJson({b:1,a:2}),a.stableJson({a:2,b:1})));

console.log(JSON.stringify({
  contractId: a.CONTRACT_ID,
  total,
  passed: total,
  failed: 0,
  status: 'passed',
  failedCases: []
}, null, 2));
