'use strict';

const CONTRACT_ID = 'com-b02b-supabase-repository-migration-readiness-v1';
const RPC = Object.freeze({
  loadCanonicalState: 'com_load_canonical_state_v1',
  claimIdempotencyKey: 'com_claim_idempotency_key_v1',
  appendEvent: 'com_append_event_v1',
  commitProjection: 'com_commit_projection_v1'
});

function assertExecutor(executor) {
  if (!executor || typeof executor.rpc !== 'function') {
    throw new Error('SUPABASE_RPC_EXECUTOR_REQUIRED');
  }
  return executor;
}

function assertUuid(value, code) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(code);
  }
}

function assertSha(value, code) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new Error(code);
}

function unwrap(result) {
  if (!result || typeof result !== 'object') throw new Error('INVALID_RPC_RESULT');
  if (result.error) throw new Error(`RPC_FAILED:${result.error.code || 'unknown'}`);
  return result.data;
}

function createCommunitySupabaseRepository(executor) {
  const client = assertExecutor(executor);
  return Object.freeze({
    contractId: CONTRACT_ID,
    async loadCanonicalState(input) {
      assertUuid(input && input.communityId, 'COMMUNITY_UUID_REQUIRED');
      return unwrap(await client.rpc(RPC.loadCanonicalState, { p_community_id: input.communityId }));
    },
    async claimIdempotencyKey(input) {
      assertUuid(input && input.actorId, 'ACTOR_UUID_REQUIRED');
      assertUuid(input && input.clientRequestId, 'CLIENT_REQUEST_UUID_REQUIRED');
      assertSha(input && input.idempotencyKey, 'IDEMPOTENCY_SHA256_REQUIRED');
      assertSha(input && input.intentFingerprint, 'INTENT_SHA256_REQUIRED');
      return unwrap(await client.rpc(RPC.claimIdempotencyKey, {
        p_actor_id: input.actorId,
        p_client_request_id: input.clientRequestId,
        p_idempotency_key: input.idempotencyKey,
        p_intent_fingerprint: input.intentFingerprint
      }));
    },
    async appendEvent(input) {
      assertUuid(input && input.communityId, 'COMMUNITY_UUID_REQUIRED');
      assertUuid(input && input.actorId, 'ACTOR_UUID_REQUIRED');
      assertSha(input && input.eventHash, 'EVENT_SHA256_REQUIRED');
      if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) throw new Error('EXPECTED_REVISION_REQUIRED');
      return unwrap(await client.rpc(RPC.appendEvent, {
        p_community_id: input.communityId,
        p_actor_id: input.actorId,
        p_expected_revision: input.expectedRevision,
        p_event_type: input.eventType,
        p_event_hash: input.eventHash,
        p_payload: input.payload || {}
      }));
    },
    async commitProjection(input) {
      assertUuid(input && input.communityId, 'COMMUNITY_UUID_REQUIRED');
      if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) throw new Error('EXPECTED_REVISION_REQUIRED');
      return unwrap(await client.rpc(RPC.commitProjection, {
        p_community_id: input.communityId,
        p_expected_revision: input.expectedRevision,
        p_projection: input.projection || {}
      }));
    }
  });
}

module.exports = Object.freeze({ CONTRACT_ID, RPC, createCommunitySupabaseRepository });
