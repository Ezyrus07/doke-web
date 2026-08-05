'use strict';

const {
  RPC,
  createCommunitySupabaseRepository
} = require('../../modules/communities/community-supabase-repository-adapter');

const CONTRACT_ID = 'com-b02d-community-composition-root-canary-readiness-v1';
const REQUIRED_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B02D_AUTHENTICATED_READ_ONLY_CANARY_ON_DOKE_STAGING';
const REQUIRED_PROJECT_ID = 'zwkczgewzbsorbrjuzpb';
const REQUIRED_MIGRATION_VERSION = '20260805153539';
const PROBE_COMMUNITY_ID = '00000000-0000-4000-8000-0000000000d2';

function codedError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

function assertUuid(value, code) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw codedError(code, code);
  }
}

function assertAuthenticatedActor(actor) {
  if (!actor || actor.authenticated !== true) throw codedError('COM_AUTHENTICATED_ACTOR_REQUIRED');
  assertUuid(actor.id, 'COM_AUTHENTICATED_ACTOR_UUID_REQUIRED');
  if (actor.status && actor.status !== 'active') throw codedError('COM_ACTIVE_ACTOR_REQUIRED');
  return actor;
}

function createReadOnlyServiceRoleExecutor(serviceSupabase) {
  if (!serviceSupabase || typeof serviceSupabase.rpc !== 'function') {
    throw codedError('COM_SERVICE_ROLE_CLIENT_REQUIRED');
  }
  return Object.freeze({
    authority: 'server_service_role',
    async rpc(name, args) {
      if (name !== RPC.loadCanonicalState) throw codedError('COM_MUTATING_RPC_BLOCKED');
      return serviceSupabase.rpc(name, args);
    }
  });
}

function createCommunityStagingCompositionRoot(options) {
  const safe = options && typeof options === 'object' ? options : {};
  if (safe.runtime !== 'staging') throw codedError('COM_STAGING_RUNTIME_REQUIRED');
  const repository = createCommunitySupabaseRepository(createReadOnlyServiceRoleExecutor(safe.serviceSupabase));

  async function probeCanonicalState(input) {
    const packet = input && typeof input === 'object' ? input : {};
    const actor = assertAuthenticatedActor(packet.actor);
    const communityId = packet.communityId || PROBE_COMMUNITY_ID;
    assertUuid(communityId, 'COM_PROBE_COMMUNITY_UUID_REQUIRED');
    const state = await repository.loadCanonicalState({ communityId });
    return Object.freeze({
      contractId: CONTRACT_ID,
      actorId: actor.id,
      communityId,
      found: Boolean(state),
      state: state || null,
      readOnly: true,
      mutationAuthority: false
    });
  }

  return Object.freeze({
    contractId: CONTRACT_ID,
    runtime: 'staging',
    capabilities: Object.freeze({
      authenticatedReadOnlyCanary: true,
      loadCanonicalState: true,
      claimIdempotencyKey: false,
      commitEventAndProjection: false,
      mutationAuthority: false
    }),
    probeCanonicalState
  });
}

function blocked(reason) {
  return Object.freeze({
    contractId: CONTRACT_ID,
    decision: 'blocked_repository_only',
    reason,
    authenticatedCanaryAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    productionAuthority: false
  });
}

function evaluateAuthenticatedCanaryAuthorization(input) {
  if (!input || typeof input !== 'object') return blocked('CANARY_AUTHORIZATION_PACKET_REQUIRED');
  if (input.authorizationPhrase !== REQUIRED_AUTHORIZATION_PHRASE) return blocked('EXPLICIT_CANARY_AUTHORIZATION_REQUIRED');
  if (input.targetEnvironment !== 'staging') return blocked('STAGING_TARGET_REQUIRED');
  if (input.projectId !== REQUIRED_PROJECT_ID) return blocked('STAGING_PROJECT_MISMATCH');
  if (input.migrationVersion !== REQUIRED_MIGRATION_VERSION) return blocked('MIGRATION_VERSION_MISMATCH');
  if (input.readOnly !== true || input.mutationAllowed !== false) return blocked('READ_ONLY_CANARY_REQUIRED');
  if (input.authorizationConsumed === true) return blocked('CANARY_AUTHORIZATION_ALREADY_CONSUMED');
  if (input.executionAttempted === true) return blocked('PRIOR_CANARY_ATTEMPT_REQUIRES_NEW_AUTHORIZATION');

  return Object.freeze({
    contractId: CONTRACT_ID,
    decision: 'authorized_for_single_authenticated_read_only_canary',
    reason: null,
    authenticatedCanaryAuthority: true,
    stagingReadAuthority: true,
    stagingMutationAuthority: false,
    productionAuthority: false,
    projectId: REQUIRED_PROJECT_ID,
    migrationVersion: REQUIRED_MIGRATION_VERSION,
    communityId: PROBE_COMMUNITY_ID
  });
}

module.exports = Object.freeze({
  CONTRACT_ID,
  REQUIRED_AUTHORIZATION_PHRASE,
  REQUIRED_PROJECT_ID,
  REQUIRED_MIGRATION_VERSION,
  PROBE_COMMUNITY_ID,
  createReadOnlyServiceRoleExecutor,
  createCommunityStagingCompositionRoot,
  evaluateAuthenticatedCanaryAuthorization
});
