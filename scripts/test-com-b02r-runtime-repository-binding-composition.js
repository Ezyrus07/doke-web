'use strict';

const assert = require('assert');
const composition = require('../backend/modules/communities/community-command-runtime-repository-binding-composition');
const b02p = require('../backend/modules/communities/community-command-runtime-binding-integration-implementation');
const b02q = require('../backend/modules/communities/community-command-repository-executor-service-role-provider-binding');
const readRepository = require('../backend/modules/communities/community-supabase-repository-adapter');
const commandRepository = require('../backend/modules/communities/community-command-source-repository-contract');
const handlers = require('../backend/modules/communities/route-handlers');
const loader = require('../backend/shared/http/module-route-loader');

const OWNER = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const COMMUNITY = '33333333-3333-4333-8333-333333333333';
const REQUEST = '44444444-4444-4444-8444-444444444444';
const CREATED = '55555555-5555-4555-8555-555555555555';
const NOW = '2026-08-18T08:12:00-03:00';

function permissions(all) {
  return {
    pinMessages: all, deleteMessages: all, addMembers: all, removeMembers: all,
    editCommunity: all, manageRoles: all, manageChannels: all, mentionRoles: all,
    bypassSlowMode: all, moderateMembers: all
  };
}

function snapshot() {
  return {
    schemaVersion: 1, source: 'canonical_server', complete: true,
    id: COMMUNITY, revision: 1, status: 'active', visibility: 'public', joinPolicy: 'open',
    ownerId: OWNER, managerIds: [OWNER], memberIds: [OWNER],
    members: [{ userId: OWNER, status: 'active', roleIds: ['owner', 'member'] }],
    roles: [
      { id: 'owner', system: true, name: 'Owner', permissions: permissions(true) },
      { id: 'moderator', system: true, name: 'Moderator', permissions: permissions(false) },
      { id: 'member', system: true, name: 'Member', permissions: permissions(false) }
    ],
    sanctions: [], channels: [], invitations: [], joinRequests: [], contentItems: [], subscriptions: []
  };
}

function stateEnvelope() {
  return {
    communityId: COMMUNITY, revision: 1, visibility: 'public', joinPolicy: 'open',
    projection: { commandContext: snapshot(), retained: { keep: true } }
  };
}

function runtimeActor(id) {
  return { id, authenticated: true, status: 'active', source: 'server_verified_authenticated_session' };
}

function assertInertBoundState(state, operation, repositoryContractId) {
  assert.equal(state.decision, 'repository_only_b02p_b02q_composition_awaiting_repository_result');
  assert.equal(state.repositoryOperation, operation);
  assert.equal(state.repositoryContractId, repositoryContractId);
  assert.equal(state.integrationState.contractId, b02p.CONTRACT_ID);
  assert.equal(state.nextRepositoryBinding.contractId, b02q.CONTRACT_ID);
  assert.equal(state.nextRepositoryBinding.repositoryOperation, operation);
  assert.equal(state.nextRepositoryBinding.repositoryContractId, repositoryContractId);
  assert.equal(state.nextRepositoryBinding.repositoryExecutorBound, true);
  assert.equal(state.nextRepositoryBinding.serviceRoleProviderBound, true);
  assert.equal(state.nextRepositoryBinding.credentialSourceBound, false);
  assert.equal(state.nextRepositoryBinding.credentialReferenceBound, false);
  assert.equal(state.nextRepositoryBinding.credentialMaterialBound, false);
  assert.equal(state.nextRepositoryBinding.credentialReadImplemented, false);
  assert.equal(state.nextRepositoryBinding.remoteClientBound, false);
  assert.equal(state.nextRepositoryBinding.remoteCapabilityBound, false);
  assert.equal(state.nextRepositoryBinding.executionAuthorized, false);
  assert.equal(state.nextRepositoryBinding.repositoryOperationInvoked, false);
  assert.equal(state.nextRepositoryBinding.rpcExecuted, false);
  assert.equal(state.nextRepositoryBinding.networkExecuted, false);
  assert.equal(state.repositoryExecutorBoundForNextOperation, true);
  assert.equal(state.serviceRoleProviderBoundForNextOperation, true);
  assert.equal(state.credentialSourceBound, false);
  assert.equal(state.credentialReadImplemented, false);
  assert.equal(state.remoteClientBound, false);
  assert.equal(state.repositoryOperationInvoked, false);
  assert.equal(state.runtimeHandlerChanged, false);
  assert.equal(state.moduleRouteLoaderChanged, false);
  assert.equal(state.runtimeActivated, false);
  assert.equal(state.rpcExecuted, false);
  assert.equal(state.networkExecuted, false);
  assert.equal(state.realCommunityMutationExecuted, false);
  assert.equal(state.migrationApplied, false);
  assert.equal(state.productionChanged, false);
}

assert.equal(composition.CONTRACT_ID, 'com-b02r-runtime-repository-binding-composition-v1');
assert.equal(composition.BOUNDARY_ID, 'COM-B02R');
assert.equal(composition.PREDECESSOR_CONTRACT_ID, b02q.CONTRACT_ID);
assert.equal(composition.PREDECESSOR_HEAD, 'f591dbe67594ef48a01fafb293fff2318721c072');
assert.equal(composition.PREDECESSOR_CERTIFICATION_RUN_ID, 32086977320);
assert.equal(composition.PREDECESSOR_CERTIFICATION_JOB_ID, 95561438588);

const existingPacket = {
  runtimeActor: runtimeActor(USER),
  routeParams: { communityId: COMMUNITY },
  request: {
    command: 'join_public', clientRequestId: REQUEST, expectedRevision: 1, payload: {}, now: NOW
  },
  trustedDomainContext: {}
};

const started = composition.beginComposition('communities.membership.command', existingPacket);
assertInertBoundState(started, 'loadCanonicalState', readRepository.CONTRACT_ID);
assert.equal(started.nextRepositoryBinding.rpc, readRepository.RPC.loadCanonicalState);

const afterRead = composition.resumeWithCanonicalState(started, stateEnvelope());
assertInertBoundState(afterRead, 'claimIdempotencyKey', commandRepository.CONTRACT_ID);
assert.equal(afterRead.nextRepositoryBinding.rpc, commandRepository.RPC.claimIdempotencyKeyV2);

const fingerprint = afterRead.repositoryInput.intentFingerprint;
const afterClaim = composition.resumeWithIdempotencyClaim(afterRead, {
  claimed: true, claimState: 'new', intentFingerprint: fingerprint
});
assertInertBoundState(afterClaim, 'commitEventProjectionOutcome', commandRepository.CONTRACT_ID);
assert.equal(afterClaim.nextRepositoryBinding.rpc, commandRepository.RPC.commitEventProjectionOutcomeV2);

const completed = composition.resumeWithRepositoryWrite(afterClaim, {
  revision: 2,
  eventHash: afterClaim.repositoryInput.eventHash,
  outcomeRecorded: true
});
assert.equal(completed.decision, 'repository_only_b02p_b02q_composition_completed');
assert.equal(completed.integrationState.decision, 'repository_only_runtime_binding_integration_completed');
assert.equal(completed.nextRepositoryBinding, null);
assert.equal(completed.repositoryExecutorBoundForNextOperation, false);
assert.equal(completed.serviceRoleProviderBoundForNextOperation, false);
assert.equal(completed.credentialSourceBound, false);
assert.equal(completed.repositoryOperationInvoked, false);
assert.equal(completed.runtimeActivated, false);
assert.equal(completed.rpcExecuted, false);
assert.equal(completed.networkExecuted, false);
assert.equal(completed.realCommunityMutationExecuted, false);
assert.equal(completed.migrationApplied, false);
assert.equal(completed.productionChanged, false);

const createPacket = {
  runtimeActor: runtimeActor(USER), routeParams: {},
  request: {
    command: 'create_community', clientRequestId: REQUEST, expectedRevision: 0,
    payload: { slug: 'alpha-builders', visibility: 'private', joinPolicy: 'request' }, now: NOW
  },
  trustedDomainContext: {}
};

const createStarted = composition.beginComposition('communities.membership.command', createPacket);
assertInertBoundState(createStarted, 'claimIdempotencyKey', commandRepository.CONTRACT_ID);
const createFingerprint = createStarted.repositoryInput.intentFingerprint;
const createWrite = composition.resumeWithIdempotencyClaim(createStarted, {
  claimed: true, claimState: 'new', intentFingerprint: createFingerprint
}, { uuidFactory: () => CREATED });
assertInertBoundState(createWrite, 'createCommunityProjectionOutcome', commandRepository.CONTRACT_ID);
assert.equal(createWrite.nextRepositoryBinding.rpc, commandRepository.RPC.createCommunityProjectionOutcomeV1);
assert.equal(createWrite.repositoryInput.communityId, CREATED);

const blocked = composition.composeIntegrationState({ contractId: 'wrong' });
assert.equal(blocked.decision, 'blocked_repository_only');
assert.equal(blocked.reason, 'B02P_INTEGRATION_STATE_REQUIRED');

const invalidResume = composition.resumeWithRepositoryWrite({ contractId: composition.CONTRACT_ID }, {});
assert.equal(invalidResume.decision, 'blocked_repository_only');
assert.equal(invalidResume.reason, 'B02R_AWAITING_BOUND_REPOSITORY_RESULT_REQUIRED');

for (const name of ['executeMembershipCommand', 'executeGovernanceCommand', 'executeContentCommand']) {
  assert.equal(loader.getHandler('communities', name), handlers[name]);
}
for (const name of [
  'beginComposition', 'composeIntegrationState', 'resumeWithCanonicalState',
  'resumeWithIdempotencyClaim', 'resumeWithRepositoryWrite'
]) {
  assert.equal(loader.getHandler('communities', name), null);
}

const inspection = composition.inspectCompositionBinding();
assert.equal(inspection.decision, 'repository_only_b02p_b02q_composition_binding_materialized');
assert.equal(inspection.integrationImplementationContractId, b02p.CONTRACT_ID);
assert.equal(inspection.repositoryBindingContractId, b02q.CONTRACT_ID);
assert.deepEqual(
  inspection.requiredOperations.slice().sort(),
  ['loadCanonicalState', 'claimIdempotencyKey', 'createCommunityProjectionOutcome', 'commitEventProjectionOutcome'].sort()
);
assert.equal(inspection.automaticOperationBindingCompositionDefined, true);
assert.equal(inspection.stepwiseCompositionDefined, true);
assert.equal(inspection.repositoryExecutorBindingInheritedFromB02q, true);
assert.equal(inspection.serviceRoleProviderBindingInheritedFromB02q, true);
for (const key of [
  'credentialSourceBound', 'credentialReferenceBound', 'credentialMaterialBound',
  'credentialReadImplemented', 'remoteClientBound', 'remoteCapabilityBound',
  'repositoryOperationInvoked', 'activeRuntimeHandlersChanged', 'moduleRouteLoaderChanged',
  'runtimeActivated', 'rpcExecuted', 'networkExecuted', 'realCommunityMutationExecuted',
  'migrationApplied', 'productionChanged'
]) assert.equal(inspection[key], false, key);

const authority = Object.freeze({
  repositoryOnlyCompositionBindingAuthority: true,
  b02pToB02qCompositionAuthority: true,
  credentialSourceBindingAuthority: false,
  credentialReadAuthority: false,
  remoteClientBindingAuthority: false,
  repositoryOperationInvocationAuthority: false,
  runtimeHandlerMutationAuthority: false,
  moduleRouteLoaderMutationAuthority: false,
  runtimeActivationAuthority: false,
  stagingDeploymentAuthority: false,
  stagingTrafficAuthority: false,
  rpcExecutionAuthority: false,
  networkAuthority: false,
  realtimeActivationAuthority: false,
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

const certification = composition.evaluateBoundaryCertification({
  predecessorContractId: b02q.CONTRACT_ID,
  predecessorHead: 'f591dbe67594ef48a01fafb293fff2318721c072',
  b02qCertificationRunId: 32086977320,
  b02qCertificationJobId: 95561438588,
  compositionImplementationMaterialized: true,
  automaticOperationBindingCompositionDefined: true,
  stepwiseCompositionDefined: true,
  allRequiredOperationsCompositionProven: true,
  b02qImplementationChanged: false,
  b02pImplementationChanged: false,
  b02oContractChanged: false,
  canonicalReadRepositoryChanged: false,
  commandSourceRepositoryChanged: false,
  routeHandlersChanged: false,
  moduleRouteLoaderChanged: false,
  repositoryV2SqlChanged: false,
  credentialSourceBound: false,
  credentialReferenceBound: false,
  credentialMaterialBound: false,
  credentialReadImplemented: false,
  remoteClientBound: false,
  remoteCapabilityBound: false,
  repositoryOperationInvoked: false,
  runtimeActivated: false,
  rpcExecuted: false,
  networkExecuted: false,
  realCommunityMutationExecuted: false,
  migrationApplied: false,
  authority
});
assert.equal(certification.ready, true);
assert.equal(certification.decision, 'repository_only_b02p_b02q_composition_binding_certifiable');
assert.equal(certification.automaticOperationBindingCompositionDefined, true);
assert.equal(certification.stepwiseCompositionDefined, true);
assert.equal(certification.allRequiredOperationsCompositionProven, true);
assert.equal(certification.credentialSourceBound, false);
assert.equal(certification.repositoryOperationInvocationAuthority, false);
assert.equal(certification.remoteExecutionAuthority, false);
assert.equal(certification.runtimeActivated, false);
assert.equal(certification.r5iCreationAuthority, false);

console.log('COM-B02R B02P->B02Q repository binding composition: PASS');
