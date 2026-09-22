'use strict';

const CONTRACT_ID = 'com-b02i-command-source-repository-v2';
const RPC = Object.freeze({
  claimIdempotencyKeyV2: 'com_claim_idempotency_key_v2',
  createCommunityProjectionOutcomeV1: 'com_create_community_projection_outcome_v1',
  commitEventProjectionOutcomeV2: 'com_commit_event_projection_outcome_v2'
});

function isUuid(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
function isSha256(value){return typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);}
function assertExecutor(executor){if(!executor||executor.authority!=='server_service_role'||typeof executor.rpc!=='function')throw new Error('SERVER_SERVICE_ROLE_RPC_EXECUTOR_REQUIRED');return executor;}
function assertIdentity(input){if(!input||!isUuid(input.actorId))throw new Error('ACTOR_UUID_REQUIRED');if(!isUuid(input.clientRequestId))throw new Error('CLIENT_REQUEST_UUID_REQUIRED');if(!isSha256(input.idempotencyKey))throw new Error('IDEMPOTENCY_SHA256_REQUIRED');if(!isSha256(input.intentFingerprint))throw new Error('INTENT_SHA256_REQUIRED');}
function unwrap(result){if(!result||typeof result!=='object')throw new Error('INVALID_RPC_RESULT');if(result.error)throw new Error(`RPC_FAILED:${result.error.code||'unknown'}`);return result.data;}

function createCommandSourceRepository(executor){
  const client=assertExecutor(executor);
  return Object.freeze({
    contractId:CONTRACT_ID,
    async claimIdempotencyKey(input){
      assertIdentity(input);
      return unwrap(await client.rpc(RPC.claimIdempotencyKeyV2,{p_actor_id:input.actorId,p_client_request_id:input.clientRequestId,p_idempotency_key:input.idempotencyKey,p_intent_fingerprint:input.intentFingerprint}));
    },
    async createCommunityProjectionOutcome(input){
      assertIdentity(input);if(!isUuid(input.communityId))throw new Error('COMMUNITY_UUID_REQUIRED');if(typeof input.eventType!=='string'||input.eventType.length<3)throw new Error('EVENT_TYPE_REQUIRED');if(!isSha256(input.eventHash))throw new Error('EVENT_SHA256_REQUIRED');
      return unwrap(await client.rpc(RPC.createCommunityProjectionOutcomeV1,{p_community_id:input.communityId,p_actor_id:input.actorId,p_client_request_id:input.clientRequestId,p_idempotency_key:input.idempotencyKey,p_intent_fingerprint:input.intentFingerprint,p_visibility:input.visibility,p_join_policy:input.joinPolicy,p_event_type:input.eventType,p_event_hash:input.eventHash,p_payload:input.payload||{},p_projection:input.projection||{},p_outcome:input.outcome||{}}));
    },
    async commitEventProjectionOutcome(input){
      assertIdentity(input);if(!isUuid(input.communityId))throw new Error('COMMUNITY_UUID_REQUIRED');if(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1)throw new Error('EXPECTED_REVISION_REQUIRED');if(typeof input.eventType!=='string'||input.eventType.length<3)throw new Error('EVENT_TYPE_REQUIRED');if(!isSha256(input.eventHash))throw new Error('EVENT_SHA256_REQUIRED');
      return unwrap(await client.rpc(RPC.commitEventProjectionOutcomeV2,{p_community_id:input.communityId,p_actor_id:input.actorId,p_client_request_id:input.clientRequestId,p_idempotency_key:input.idempotencyKey,p_intent_fingerprint:input.intentFingerprint,p_expected_revision:input.expectedRevision,p_event_type:input.eventType,p_event_hash:input.eventHash,p_payload:input.payload||{},p_projection:input.projection||{},p_outcome:input.outcome||{}}));
    }
  });
}

module.exports=Object.freeze({CONTRACT_ID,RPC,createCommandSourceRepository});
