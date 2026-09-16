'use strict';

const assert = require('assert');
const adapter = require('../backend/modules/communities/community-command-runtime-binding-adapter-implementation');

const OWNER = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const COMMUNITY = '33333333-3333-4333-8333-333333333333';
const REQUEST = '44444444-4444-4444-8444-444444444444';
const CREATED = '55555555-5555-4555-8555-555555555555';
const NOW = '2026-08-16T22:46:00-03:00';

function permissions(all) {
  return {
    pinMessages: all, deleteMessages: all, addMembers: all, removeMembers: all,
    editCommunity: all, manageRoles: all, manageChannels: all, mentionRoles: all,
    bypassSlowMode: all, moderateMembers: all
  };
}

function snapshot() {
  return {
    schemaVersion: 1,
    source: 'canonical_server',
    complete: true,
    id: COMMUNITY,
    revision: 1,
    status: 'active',
    visibility: 'public',
    joinPolicy: 'open',
    ownerId: OWNER,
    managerIds: [OWNER],
    memberIds: [OWNER],
    members: [{ userId: OWNER, status: 'active', roleIds: ['owner', 'member'] }],
    roles: [
      { id: 'owner', system: true, name: 'Owner', permissions: permissions(true) },
      { id: 'moderator', system: true, name: 'Moderator', permissions: permissions(false) },
      { id: 'member', system: true, name: 'Member', permissions: permissions(false) }
    ],
    sanctions: [], channels: [], invitations: [], joinRequests: [], contentItems: [], subscriptions: []
  };
}

function envelope() {
  return {
    communityId: COMMUNITY,
    revision: 1,
    visibility: 'public',
    joinPolicy: 'open',
    projection: { commandContext: snapshot(), retained: { keep: true } }
  };
}

function runtimeActor(id) {
  return {
    id,
    authenticated: true,
    status: 'active',
    source: 'server_verified_authenticated_session'
  };
}

const existingPacket = {
  routeName: 'communities.membership.command',
  runtimeActor: runtimeActor(USER),
  routeParams: { communityId: COMMUNITY },
  request: {
    command: 'join_public',
    clientRequestId: REQUEST,
    expectedRevision: 1,
    payload: {},
    now: NOW
  },
  trustedDomainContext: {}
};

const started = adapter.beginRuntimeBindingAdapter(existingPacket);
assert.equal(started.decision, 'repository_only_adapter_awaiting_input');
assert.equal(started.stage, adapter.STAGES.AWAITING_CANONICAL_STATE);
assert.equal(started.nextOperation.repositoryOperation, 'loadCanonicalState');
assert.deepEqual(started.nextOperation.repositoryInput, { communityId: COMMUNITY });
assert.equal(started.nextOperation.execute, false);
assert.equal(started.portInvoked, false);

const afterRead = adapter.resumeWithCanonicalState(started, envelope());
assert.equal(afterRead.stage, adapter.STAGES.AWAITING_IDEMPOTENCY_CLAIM);
assert.equal(afterRead.nextOperation.repositoryOperation, 'claimIdempotencyKey');
assert.equal(afterRead.nextOperation.execute, false);
assert.equal(afterRead.suppliedCanonicalState, true);

const fingerprint = afterRead.nextOperation.repositoryInput.intentFingerprint;
const afterClaim = adapter.resumeWithIdempotencyClaim(afterRead, {
  claimed: true,
  claimState: 'new',
  intentFingerprint: fingerprint
});
assert.equal(afterClaim.stage, adapter.STAGES.AWAITING_REPOSITORY_WRITE);
assert.equal(afterClaim.nextOperation.repositoryOperation, 'commitEventProjectionOutcome');
assert.equal(afterClaim.nextOperation.repositoryInput.expectedRevision, 1);
assert.equal(afterClaim.nextOperation.repositoryInput.projection.commandContext.revision, 2);
assert(afterClaim.nextOperation.repositoryInput.projection.commandContext.memberIds.includes(USER));
assert.equal(afterClaim.nextOperation.execute, false);
assert.equal(afterClaim.portInvoked, false);
assert.equal(afterClaim.rpcExecuted, false);

const writeResult = {
  revision: 2,
  eventHash: afterClaim.nextOperation.repositoryInput.eventHash,
  outcomeRecorded: true
};
const completed = adapter.resumeWithRepositoryWrite(afterClaim, writeResult);
assert.equal(completed.decision, 'repository_only_adapter_completed');
assert.equal(completed.stage, adapter.STAGES.COMPLETED_WRITE_RESULT);
assert.equal(completed.resultValidated, true);
assert.equal(completed.executionClaimedByAdapter, false);
assert.equal(completed.portInvoked, false);
assert.equal(completed.rpcExecuted, false);
assert.equal(completed.networkExecuted, false);
assert.equal(completed.realCommunityMutationExecuted, false);

const replay = adapter.resumeWithIdempotencyClaim(afterRead, {
  claimed: true,
  claimState: 'existing',
  intentFingerprint: fingerprint,
  priorRecord: {
    actorId: USER,
    clientRequestId: REQUEST,
    idempotencyKey: afterRead.nextOperation.repositoryInput.idempotencyKey,
    intentFingerprint: fingerprint,
    outcome: { state: 'already_committed' }
  }
});
assert.equal(replay.decision, 'repository_only_adapter_completed');
assert.equal(replay.stage, adapter.STAGES.COMPLETED_TERMINAL);
assert.equal(replay.nextOperation, null);
assert.equal(replay.persistenceMayContinue, false);

const createPacket = {
  routeName: 'communities.membership.command',
  runtimeActor: runtimeActor(USER),
  routeParams: {},
  request: {
    command: 'create_community',
    clientRequestId: REQUEST,
    expectedRevision: 0,
    payload: { slug: 'alpha-builders', visibility: 'private', joinPolicy: 'request' },
    now: NOW
  },
  trustedDomainContext: {}
};
const createStarted = adapter.beginRuntimeBindingAdapter(createPacket);
assert.equal(createStarted.stage, adapter.STAGES.AWAITING_IDEMPOTENCY_CLAIM);
assert.equal(createStarted.nextOperation.repositoryOperation, 'claimIdempotencyKey');
const createFingerprint = createStarted.nextOperation.repositoryInput.intentFingerprint;
const createWrite = adapter.resumeWithIdempotencyClaim(createStarted, {
  claimed: true,
  claimState: 'new',
  intentFingerprint: createFingerprint
}, { uuidFactory: () => CREATED });
assert.equal(createWrite.stage, adapter.STAGES.AWAITING_REPOSITORY_WRITE);
assert.equal(createWrite.nextOperation.repositoryOperation, 'createCommunityProjectionOutcome');
assert.equal(createWrite.nextOperation.repositoryInput.communityId, CREATED);
assert.equal(createWrite.nextOperation.repositoryInput.projection.commandContext.id, CREATED);
assert.equal(createWrite.nextOperation.repositoryInput.projection.commandContext.revision, 1);
assert.equal(createWrite.portInvoked, false);

const badActor = adapter.beginRuntimeBindingAdapter({
  ...existingPacket,
  runtimeActor: { ...runtimeActor(USER), source: 'untrusted_client' }
});
assert.equal(badActor.decision, 'blocked_repository_only');
assert.equal(badActor.reason, 'B02L_RUNTIME_REQUEST_MAPPING_BLOCKED');

const wrongStage = adapter.resumeWithCanonicalState(createStarted, envelope());
assert.equal(wrongStage.decision, 'blocked_repository_only');
assert.equal(wrongStage.reason, 'AWAITING_CANONICAL_STATE_ADAPTER_STATE_REQUIRED');

const badWrite = adapter.resumeWithRepositoryWrite(afterClaim, {
  revision: 99,
  eventHash: afterClaim.nextOperation.repositoryInput.eventHash,
  outcomeRecorded: true
});
assert.equal(badWrite.decision, 'blocked_repository_only');
assert.equal(badWrite.reason, 'REPOSITORY_RESULT_REVISION_MISMATCH');

const authority = Object.freeze({
  repositoryOnlyAdapterImplementationAuthority: true,
  runtimeHandlerMutationAuthority: false,
  moduleRouteLoaderMutationAuthority: false,
  repositoryExecutorBindingAuthority: false,
  runtimeActivationAuthority: false,
  stagingDeploymentAuthority: false,
  stagingTrafficAuthority: false,
  rpcExecutionAuthority: false,
  networkAuthority: false,
  realtimeActivationAuthority: false,
  credentialReadAuthority: false,
  identityLifecycleRemoteAuthority: false,
  realCommunityMutationAuthority: false,
  migrationApplicationAuthority: false,
  triggerCreationAuthority: false,
  receiptCreationAuthority: false,
  productionAuthority: false,
  pullRequestMergeAuthority: false,
  readyForReviewAuthority: false,
  r5iCreationAuthority: false
});

const certification = adapter.evaluateBoundaryCertification({
  predecessorContractId: 'com-b02l-command-runtime-binding-adapter-contract-v1',
  predecessorHead: 'c5dca9ed3f797d0d062d113ea9417645d2016bf3',
  b02lCertificationRunId: 31985514343,
  b02lCertificationJobId: 95259746097,
  adapterImplementationMaterialized: true,
  stepwiseOrchestrationImplemented: true,
  operationDescriptorsOnly: true,
  portInvocationImplemented: false,
  b02lContractChanged: false,
  b02jCompositionChanged: false,
  routeHandlersChanged: false,
  moduleRouteLoaderChanged: false,
  repositoryV2ExecutorBound: false,
  repositoryV2SqlApplied: false,
  runtimeHandlerBound: false,
  runtimeActivated: false,
  rpcExecuted: false,
  networkExecuted: false,
  credentialReadExecuted: false,
  remoteIdentityMutationExecuted: false,
  realCommunityMutationExecuted: false,
  migrationApplied: false,
  authority
});
assert.equal(certification.ready, true);
assert.equal(certification.decision, 'repository_only_runtime_binding_adapter_implementation_certifiable');
assert.equal(certification.portInvocationImplemented, false);
assert.equal(certification.repositoryExecutorBound, false);
assert.equal(certification.runtimeActivated, false);
assert.equal(certification.r5iCreationAuthority, false);
assert.equal(certification.nextAction, 'advance_under_standing_repository_only_authority_to_b02n_runtime_binding_integration_readiness_without_activation_remote_execution_or_migration_application');

const authorityDrift = adapter.evaluateBoundaryCertification({
  predecessorContractId: 'com-b02l-command-runtime-binding-adapter-contract-v1',
  predecessorHead: 'c5dca9ed3f797d0d062d113ea9417645d2016bf3',
  b02lCertificationRunId: 31985514343,
  b02lCertificationJobId: 95259746097,
  adapterImplementationMaterialized: true,
  stepwiseOrchestrationImplemented: true,
  operationDescriptorsOnly: true,
  portInvocationImplemented: false,
  b02lContractChanged: false,
  b02jCompositionChanged: false,
  routeHandlersChanged: false,
  moduleRouteLoaderChanged: false,
  repositoryV2ExecutorBound: false,
  repositoryV2SqlApplied: false,
  runtimeHandlerBound: false,
  runtimeActivated: false,
  rpcExecuted: false,
  networkExecuted: false,
  credentialReadExecuted: false,
  remoteIdentityMutationExecuted: false,
  realCommunityMutationExecuted: false,
  migrationApplied: false,
  authority: { ...authority, networkAuthority: true }
});
assert.equal(authorityDrift.ready, false);
assert(authorityDrift.blockers.includes('PROHIBITED_AUTHORITY_MUST_BE_FALSE:networkAuthority'));

console.log('COM-B02M runtime binding adapter implementation: PASS');
