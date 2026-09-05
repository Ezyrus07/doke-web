#!/usr/bin/env node
'use strict';

const assert = require('assert');
const contract = require('../backend/modules/communities/community-moderation-case-authority');
const {
  CONTRACT_ID,
  createModerationRuntimeComposition
} = require('../backend/modules/communities/community-moderation-runtime-composition');

const ids = {
  actor: '11111111-1111-4111-8111-111111111111',
  reviewer: '22222222-2222-4222-8222-222222222222',
  targetOwner: '44444444-4444-4444-8444-444444444444',
  reporter: '55555555-5555-4555-8555-555555555555',
  community: '66666666-6666-4666-8666-666666666666',
  target: '77777777-7777-4777-8777-777777777777',
  case: '88888888-8888-4888-8888-888888888888',
  evidence: '99999999-9999-4999-8999-999999999999',
  request: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
};
const policy = {
  status: 'approved',
  version: '2026.08.05',
  fingerprint: contract.sha256('policy'),
  automaticEnforcementAllowed: false,
  reportCountCreatesSanction: false,
  scanResultCreatesFinalDecision: false
};
const community = {
  id: ids.community,
  source: 'canonical_server',
  complete: true,
  revision: 12,
  status: 'active'
};
const target = {
  id: ids.target,
  communityId: ids.community,
  ownerId: ids.targetOwner,
  type: 'community_post',
  state: 'published',
  source: 'canonical_server',
  complete: true,
  revision: 7
};
const evidence = {
  id: ids.evidence,
  kind: 'content_snapshot',
  reference: 'opaque:moderation:evidence:002',
  digest: contract.sha256('new evidence'),
  collectedAt: '2026-08-06T01:00:00.000Z',
  retentionClass: 'standard',
  rawPayloadIncluded: false
};
const existingEvidence = {
  ...evidence,
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  reference: 'opaque:moderation:evidence:001',
  digest: contract.sha256('existing evidence')
};
const canonicalCase = {
  id: ids.case,
  communityId: ids.community,
  kind: 'content_report',
  state: 'evidence_collection',
  reporterId: ids.reporter,
  target,
  evidence: [existingEvidence],
  recommendations: [],
  approvals: [],
  ledgerHead: { revision: 3, eventHash: contract.sha256('ledger head') },
  source: 'canonical_server',
  complete: true,
  revision: 3
};

function sessionVerifier(overrides = {}) {
  return {
    authority: 'server_verified_session_boundary',
    async verify() {
      return {
        verified: true,
        source: 'server_verified_session',
        userId: ids.reviewer,
        role: 'moderator',
        status: 'active',
        aal: 'aal2',
        ...overrides
      };
    }
  };
}

function clock() {
  return {
    authority: 'server_utc_clock',
    async now() { return '2026-08-06T01:05:00.000Z'; }
  };
}

function openContextLoader(overrides = {}) {
  return {
    authority: 'canonical_server_context_loader',
    async load(input) {
      return {
        source: 'canonical_server_context',
        complete: true,
        community,
        authorization: {
          actorId: input.actorId,
          source: 'canonical_server',
          complete: true,
          revision: 5,
          capabilities: {}
        },
        policy,
        target,
        idempotencyRecord: null,
        ...overrides
      };
    }
  };
}

function caseContextLoader(overrides = {}) {
  return {
    authority: 'canonical_server_context_loader',
    async load(input) {
      return {
        source: 'canonical_server_context',
        complete: true,
        community,
        authorization: {
          actorId: input.actorId,
          source: 'canonical_server',
          complete: true,
          revision: 5,
          capabilities: { reviewEvidence: true }
        },
        policy,
        case: canonicalCase,
        persistence: {
          source: 'com_moderation_load_case_v1',
          caseId: ids.case,
          revision: 3
        },
        idempotencyRecord: null,
        ...overrides
      };
    }
  };
}

function executor(calls, environment = 'local_test_double') {
  return {
    authority: 'server_service_role',
    environment,
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === 'com_moderation_load_case_v1') {
        return { data: { caseId: ids.case, revision: 3, projection: { state: 'evidence_collection' } } };
      }
      return { data: { caseId: args.p_case_id, revision: args.p_expected_revision + 1, replay: false } };
    }
  };
}

function openRequest() {
  return {
    headers: { authorization: 'Bearer private-token-never-persisted' },
    requestId: 'request-correlation-only',
    envelope: {
      command: 'open_case',
      clientRequestId: ids.request,
      expectedRevision: 0,
      payload: {
        kind: 'content_report',
        initialEvidenceKind: 'report_statement',
        initialEvidenceRef: 'opaque:moderation:statement:001',
        initialEvidenceDigest: contract.sha256('initial statement')
      }
    }
  };
}

function attachRequest() {
  return {
    headers: { authorization: 'Bearer another-private-token' },
    envelope: {
      command: 'attach_evidence',
      caseId: ids.case,
      clientRequestId: ids.request,
      expectedRevision: 3,
      payload: { evidence }
    }
  };
}

(async () => {
  let checks = 0;
  const ok = (value, message) => { checks += 1; assert.ok(value, message); };
  const equal = (actual, expected, message) => { checks += 1; assert.deepStrictEqual(actual, expected, message); };

  equal(CONTRACT_ID, 'com-b04d-moderation-runtime-composition-readiness-v1', 'contract id');

  assert.throws(() => createModerationRuntimeComposition({}), /SERVER_SESSION_VERIFIER_REQUIRED/); checks += 1;
  assert.throws(() => createModerationRuntimeComposition({
    sessionVerifier: sessionVerifier(), contextLoader: openContextLoader(), clock: clock(),
    executor: executor([]), activationMode: 'live'
  }), /INVALID_COM_B04D_ACTIVATION_MODE/); checks += 1;
  assert.throws(() => createModerationRuntimeComposition({
    sessionVerifier: sessionVerifier(), contextLoader: openContextLoader(), clock: clock(),
    executor: executor([], 'staging'), activationMode: 'local_test_double'
  }), /LOCAL_TEST_EXECUTOR_REQUIRED/); checks += 1;

  const disabledCalls = [];
  const disabled = createModerationRuntimeComposition({
    sessionVerifier: sessionVerifier(),
    contextLoader: openContextLoader(),
    clock: clock(),
    executor: executor(disabledCalls, 'server_only'),
    activationMode: 'disabled'
  });
  equal(disabled.routeRegistered, false, 'route not registered');
  equal(disabled.runtimeMutationAuthority, false, 'runtime authority false');
  equal(disabled.stagingAuthority, false, 'staging authority false');

  const opened = await disabled.prepareCommand(openRequest());
  equal(opened.decision.decision, 'accept', 'open prepared');
  ok(opened.preparedCommit, 'open commit prepared');
  equal(opened.preparedCommit.expectedRevision, 0, 'open revision');
  equal(opened.preparedCommit.caseState, 'open', 'open state');
  equal(opened.preparedCommit.evidenceRecord.kind, 'report_statement', 'initial evidence materialized');
  equal(opened.preparedCommit.evidenceRecord.reference, 'opaque:moderation:statement:001', 'initial evidence reference');
  equal(disabledCalls.length, 0, 'prepare has no RPC for new case');
  ok(!JSON.stringify(opened).includes('private-token-never-persisted'), 'token not retained');
  await assert.rejects(disabled.invokePreparedCommand(opened), /COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED/); checks += 1;
  equal(disabledCalls.length, 0, 'disabled invocation no RPC');

  const localCalls = [];
  const local = createModerationRuntimeComposition({
    sessionVerifier: sessionVerifier(),
    contextLoader: openContextLoader(),
    clock: clock(),
    executor: executor(localCalls),
    activationMode: 'local_test_double'
  });
  const locallyPrepared = await local.prepareCommand(openRequest());
  const localResult = await local.invokePreparedCommand(locallyPrepared);
  equal(localResult.revision, 1, 'local test commit result');
  equal(localCalls.map((item) => item.name), ['com_moderation_commit_case_command_v1'], 'single atomic commit RPC');
  equal(localCalls[0].args.p_evidence_record.kind, 'report_statement', 'initial evidence RPC mapping');

  const caseCalls = [];
  const withCase = createModerationRuntimeComposition({
    sessionVerifier: sessionVerifier(),
    contextLoader: caseContextLoader(),
    clock: clock(),
    executor: executor(caseCalls),
    activationMode: 'local_test_double'
  });
  const attached = await withCase.prepareCommand(attachRequest());
  equal(attached.decision.decision, 'accept', 'attach prepared');
  equal(caseCalls.map((item) => item.name), ['com_moderation_load_case_v1'], 'canonical case loaded first');
  equal(attached.preparedCommit.previousEventHash, canonicalCase.ledgerHead.eventHash, 'hash chain bound');
  equal(attached.preparedCommit.projection.evidence.length, 2, 'evidence appended to projection');
  equal(attached.preparedCommit.evidenceRecord.id, ids.evidence, 'evidence ledger mapping');
  await withCase.invokePreparedCommand(attached);
  equal(caseCalls.map((item) => item.name), [
    'com_moderation_load_case_v1',
    'com_moderation_commit_case_command_v1'
  ], 'load then atomic commit');

  const forged = openRequest();
  forged.envelope.actor = { id: ids.actor };
  await assert.rejects(disabled.prepareCommand(forged), /CLIENT_AUTHORITY_OVERRIDE_PROHIBITED:actor/); checks += 1;
  const forgedPayload = openRequest();
  forgedPayload.envelope.payload.actorId = ids.actor;
  await assert.rejects(disabled.prepareCommand(forgedPayload), /CLIENT_PAYLOAD_AUTHORITY_OVERRIDE_PROHIBITED:actorId/); checks += 1;

  const invalidSession = createModerationRuntimeComposition({
    sessionVerifier: sessionVerifier({ source: 'browser_claim' }),
    contextLoader: openContextLoader(), clock: clock(), executor: executor([])
  });
  await assert.rejects(invalidSession.prepareCommand(openRequest()), /SERVER_VERIFIED_SESSION_REQUIRED/); checks += 1;

  const badAuthorization = createModerationRuntimeComposition({
    sessionVerifier: sessionVerifier(),
    contextLoader: openContextLoader({
      authorization: {
        actorId: ids.actor,
        source: 'canonical_server',
        complete: true,
        revision: 5,
        capabilities: {}
      }
    }),
    clock: clock(), executor: executor([])
  });
  await assert.rejects(badAuthorization.prepareCommand(openRequest()), /CANONICAL_AUTHORIZATION_REQUIRED/); checks += 1;

  const badBindingCalls = [];
  const badBinding = createModerationRuntimeComposition({
    sessionVerifier: sessionVerifier(),
    contextLoader: caseContextLoader({
      persistence: { source: 'com_moderation_load_case_v1', caseId: ids.case, revision: 99 }
    }),
    clock: clock(), executor: executor(badBindingCalls)
  });
  await assert.rejects(badBinding.prepareCommand(attachRequest()), /PERSISTENCE_PROVENANCE_REQUIRED/); checks += 1;
  equal(badBindingCalls.length, 1, 'bad binding only reads');

  const replayCalls = [];
  const replayLoader = caseContextLoader({
    case: { ...canonicalCase, evidence: [existingEvidence, evidence] }
  });
  const replayComposition = createModerationRuntimeComposition({
    sessionVerifier: sessionVerifier(), contextLoader: replayLoader,
    clock: clock(), executor: executor(replayCalls), activationMode: 'local_test_double'
  });
  const replay = await replayComposition.prepareCommand(attachRequest());
  equal(replay.decision.decision, 'replay', 'domain replay preserved');
  equal(replay.preparedCommit, null, 'replay not commit-ready');
  await assert.rejects(replayComposition.invokePreparedCommand(replay), /PREPARED_COM_B04D_COMMAND_REQUIRED/); checks += 1;
  equal(replayCalls.length, 1, 'replay performs read only');

  ok(Object.isFrozen(disabled), 'composition frozen');
  ok(Object.isFrozen(opened), 'prepared result frozen');
  equal(checks, 38, 'expected check count');
  console.log(`COM-B04D conformance passed: ${checks}/${checks}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
