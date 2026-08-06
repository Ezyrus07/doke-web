#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  createModerationSupabaseRepository,
  RPC,
  LOGICAL_REPOSITORY_METHODS
} = require('../backend/modules/communities/community-moderation-supabase-repository-adapter');

const ids = {
  caseId: '11111111-1111-4111-8111-111111111111',
  communityId: '22222222-2222-4222-8222-222222222222',
  actorId: '33333333-3333-4333-8333-333333333333',
  requestId: '44444444-4444-4444-8444-444444444444',
  reporterId: '55555555-5555-4555-8555-555555555555',
  targetId: '66666666-6666-4666-8666-666666666666'
};
const hashes = {
  idempotency: 'a'.repeat(64),
  intent: 'b'.repeat(64),
  event: 'c'.repeat(64),
  previous: 'd'.repeat(64),
  policy: 'e'.repeat(64)
};

function input(overrides = {}) {
  const eventDraft = {
    eventHash: hashes.event,
    intentFingerprint: hashes.intent
  };
  return {
    caseId: ids.caseId,
    communityId: ids.communityId,
    actorId: ids.actorId,
    clientRequestId: ids.requestId,
    reporterId: ids.reporterId,
    targetId: ids.targetId,
    idempotencyKey: hashes.idempotency,
    intentFingerprint: hashes.intent,
    eventHash: hashes.event,
    previousEventHash: hashes.previous,
    policyFingerprint: hashes.policy,
    expectedRevision: 3,
    eventId: `evt-${'f'.repeat(24)}`,
    eventAction: 'moderation_evidence_attached',
    occurredAt: '2026-08-05T23:58:00.000Z',
    caseKind: 'content_report',
    caseState: 'evidence_collection',
    targetType: 'community_post',
    projection: { state: 'evidence_collection', nextRevision: 4 },
    eventDetails: { evidenceId: ids.targetId },
    evidenceRecord: null,
    decisionRecord: null,
    sanctionEvent: null,
    appealEvent: null,
    mediaReviewEvent: null,
    transactionPlan: {
      isolation: 'serializable',
      atomic: true,
      rollbackOnFailure: true,
      commitAuthority: false,
      expectedCaseRevision: 3,
      idempotencyKey: hashes.idempotency,
      intentFingerprint: hashes.intent,
      requiredRepositoryMethods: [...LOGICAL_REPOSITORY_METHODS],
      eventDraft
    },
    ...overrides
  };
}

(async () => {
  let checks = 0;
  const check = (value, message) => { checks += 1; assert.ok(value, message); };
  const equal = (actual, expected, message) => { checks += 1; assert.deepStrictEqual(actual, expected, message); };
  const calls = [];
  const repo = createModerationSupabaseRepository({
    authority: 'server_service_role',
    async rpc(name, args) {
      calls.push({ name, args });
      return { data: { ok: true, name } };
    }
  });

  const loaded = await repo.loadCanonicalCase({ caseId: ids.caseId });
  equal(loaded.name, RPC.loadCanonicalCase, 'load RPC');
  const committed = await repo.commitCaseCommand(input());
  equal(committed.name, RPC.commitCaseCommand, 'commit RPC');
  equal(calls.map((call) => call.name), [RPC.loadCanonicalCase, RPC.commitCaseCommand], 'RPC order');
  equal(calls[1].args.p_expected_revision, 3, 'revision mapping');
  equal(calls[1].args.p_previous_event_hash, hashes.previous, 'hash-chain mapping');
  equal(calls[1].args.p_projection.state, 'evidence_collection', 'projection mapping');
  equal(repo.transactionBoundary, 'single_security_definer_rpc', 'atomic boundary');
  equal(repo.logicalRepositoryMethods, LOGICAL_REPOSITORY_METHODS, 'logical port');

  assert.throws(() => createModerationSupabaseRepository({ rpc() {} }), /SERVER_SERVICE_ROLE_RPC_EXECUTOR_REQUIRED/); checks += 1;
  await assert.rejects(repo.loadCanonicalCase({ caseId: 'bad' }), /CASE_UUID_REQUIRED/); checks += 1;
  await assert.rejects(repo.commitCaseCommand(input({ expectedRevision: -1 })), /EXPECTED_REVISION_REQUIRED/); checks += 1;
  await assert.rejects(repo.commitCaseCommand(input({ occurredAt: 'not-a-date' })), /OCCURRED_AT_REQUIRED/); checks += 1;
  await assert.rejects(repo.commitCaseCommand(input({ projection: { rawPayload: 'x' } })), /RAW_SENSITIVE_DATA_PROHIBITED/); checks += 1;

  const badIsolation = input();
  badIsolation.transactionPlan = { ...badIsolation.transactionPlan, isolation: 'read committed' };
  await assert.rejects(repo.commitCaseCommand(badIsolation), /SERIALIZABLE_TRANSACTION_REQUIRED/); checks += 1;

  const badAuthority = input();
  badAuthority.transactionPlan = { ...badAuthority.transactionPlan, commitAuthority: true };
  await assert.rejects(repo.commitCaseCommand(badAuthority), /ATOMIC_ROLLBACK_ONLY_PLAN_REQUIRED/); checks += 1;

  const missingMethod = input();
  missingMethod.transactionPlan = {
    ...missingMethod.transactionPlan,
    requiredRepositoryMethods: LOGICAL_REPOSITORY_METHODS.slice(0, -1)
  };
  await assert.rejects(repo.commitCaseCommand(missingMethod), /CANONICAL_REPOSITORY_METHOD_SET_REQUIRED/); checks += 1;

  const mismatchedEvent = input();
  mismatchedEvent.transactionPlan = {
    ...mismatchedEvent.transactionPlan,
    eventDraft: { eventHash: '9'.repeat(64), intentFingerprint: hashes.intent }
  };
  await assert.rejects(repo.commitCaseCommand(mismatchedEvent), /PLAN_EVENT_MISMATCH/); checks += 1;

  const newCase = input({ expectedRevision: 0, previousEventHash: null });
  newCase.transactionPlan = {
    ...newCase.transactionPlan,
    expectedCaseRevision: 0
  };
  await repo.commitCaseCommand(newCase);
  equal(calls.at(-1).args.p_previous_event_hash, null, 'new case null previous hash');

  const failingRepo = createModerationSupabaseRepository({
    authority: 'server_service_role',
    async rpc() { return { error: { code: 'REVISION_CONFLICT' } }; }
  });
  await assert.rejects(failingRepo.loadCanonicalCase({ caseId: ids.caseId }), /RPC_FAILED:REVISION_CONFLICT/); checks += 1;

  check(Object.isFrozen(repo), 'repository frozen');
  equal(checks, 20, 'expected check count');
  console.log(`COM-B04B conformance passed: ${checks}/${checks}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
