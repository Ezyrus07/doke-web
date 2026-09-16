#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { createCommunitySupabaseRepository, RPC } = require('../backend/modules/communities/community-supabase-repository-adapter');

const uuid = '11111111-1111-4111-8111-111111111111';
const sha = 'a'.repeat(64);
const calls = [];
const repo = createCommunitySupabaseRepository({
  authority: 'server_service_role',
  async rpc(name, args) {
    calls.push({ name, args });
    return { data: { ok: true } };
  }
});

(async () => {
  await repo.loadCanonicalState({ communityId: uuid });
  await repo.claimIdempotencyKey({ actorId: uuid, clientRequestId: uuid, idempotencyKey: sha, intentFingerprint: sha });
  await repo.commitEventAndProjection({ communityId: uuid, actorId: uuid, expectedRevision: 0, eventType: 'membership_joined', eventHash: sha, payload: {}, projection: {} });
  assert.deepStrictEqual(calls.map((c) => c.name), [RPC.loadCanonicalState, RPC.claimIdempotencyKey, RPC.commitEventAndProjection]);
  assert.throws(() => createCommunitySupabaseRepository({ rpc() {} }), /SERVER_SERVICE_ROLE_RPC_EXECUTOR_REQUIRED/);
  await assert.rejects(repo.loadCanonicalState({ communityId: 'bad' }), /COMMUNITY_UUID_REQUIRED/);
  await assert.rejects(
    repo.commitEventAndProjection({ communityId: uuid, actorId: uuid, expectedRevision: -1, eventType: 'x', eventHash: sha }),
    /EXPECTED_REVISION_REQUIRED/
  );
  console.log('COM-B02B conformance passed: 6/6');
})().catch((error) => { console.error(error); process.exit(1); });
