'use strict';

const assert = require('assert');
const readiness = require('../backend/modules/communities/community-command-runtime-binding-readiness');

const authority = Object.freeze({
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

const packet = Object.freeze({
  predecessorContractId: 'com-b02j-canonical-command-handler-composition-v1',
  predecessorHead: 'fb7f74e6a5e36f795fd9a1471080a452678d0c8e',
  b02jCertificationRunId: 31983348543,
  b02jCertificationJobId: 95253952739,
  currentRuntime: Object.freeze({
    routesRegistered: true,
    communitiesModuleLoaded: true,
    moduleRouteLoaderReadsHandlersOnly: true,
    composeHelpersExported: true,
    composeHelpersInHandlersMap: false,
    executeHandlersFailClosed503: true,
    failureCode: 'COM_B02F_ROUTE_NOT_DEPLOYED_OR_ACTIVATED',
    runtimeActivated: false
  }),
  actorSource: Object.freeze({
    proven: true,
    source: 'server_verified_authenticated_session',
    createsIdentity: false
  }),
  canonicalStateReadSource: Object.freeze({
    proven: true,
    rpc: 'com_load_canonical_state_v1',
    compositionRootInvoked: true
  }),
  repositoryV2: Object.freeze({
    contractId: 'com-b02i-command-source-repository-v2',
    sqlDefinitionPresent: true,
    executorBound: false,
    migrationApplied: false,
    rpcExecuted: false
  }),
  missingBinding: Object.freeze({
    runtimeHandlerBindingPresent: false,
    requestToCompositionMapperPresent: false,
    repositoryExecutorBindingPresent: false,
    runtimeActivationReady: false
  }),
  authority
});

const result = readiness.evaluateRuntimeBindingReadiness(packet);
assert.equal(result.contractId, 'com-b02k-command-runtime-binding-readiness-v1');
assert.equal(result.boundaryId, 'COM-B02K');
assert.equal(result.decision, 'repository_only_runtime_binding_readiness_certifiable');
assert.equal(result.repositoryOnlyReadinessCertifiable, true);
assert.deepEqual(result.certificationBlockers, []);
assert.equal(result.runtimeBindingReady, false);
assert.deepEqual(result.runtimeBlockers, [
  'B02J_COMPOSE_HELPERS_NOT_IN_RUNTIME_HANDLER_MAP',
  'B02I_V2_REPOSITORY_EXECUTOR_NOT_BOUND',
  'B02I_V2_SQL_NOT_APPLIED',
  'CANONICAL_REQUEST_TO_COMPOSITION_MAPPER_NOT_BOUND'
]);
assert.deepEqual(result.routes, [
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);
assert.equal(result.repositoryV2ExecutorBound, false);
assert.equal(result.repositoryV2MigrationApplied, false);
assert.equal(result.runtimeHandlerBindingPresent, false);
assert.equal(result.requestToCompositionMapperPresent, false);
assert.equal(result.runtimeActivated, false);
assert.equal(result.remoteExecutionAuthority, false);
assert.equal(result.networkAuthority, false);
assert.equal(result.credentialReadAuthority, false);
assert.equal(result.migrationApplicationAuthority, false);
assert.equal(result.productionAuthority, false);
assert.equal(result.nextAction, 'advance_under_standing_repository_only_authority_to_b02l_runtime_binding_adapter_contract_without_activation_remote_execution_or_migration_application');

const handlerDrift = readiness.evaluateRuntimeBindingReadiness({
  ...packet,
  currentRuntime: { ...packet.currentRuntime, composeHelpersInHandlersMap: true }
});
assert.equal(handlerDrift.repositoryOnlyReadinessCertifiable, false);
assert(handlerDrift.certificationBlockers.includes('COMPOSE_HELPERS_MUST_REMAIN_OUTSIDE_RUNTIME_HANDLER_MAP'));

const executorDrift = readiness.evaluateRuntimeBindingReadiness({
  ...packet,
  repositoryV2: { ...packet.repositoryV2, executorBound: true }
});
assert.equal(executorDrift.repositoryOnlyReadinessCertifiable, false);
assert(executorDrift.certificationBlockers.includes('B02I_V2_EXECUTOR_MUST_REMAIN_UNBOUND'));

const migrationDrift = readiness.evaluateRuntimeBindingReadiness({
  ...packet,
  repositoryV2: { ...packet.repositoryV2, migrationApplied: true }
});
assert.equal(migrationDrift.repositoryOnlyReadinessCertifiable, false);
assert(migrationDrift.certificationBlockers.includes('B02I_V2_MIGRATION_MUST_REMAIN_UNAPPLIED'));

const authorityDrift = readiness.evaluateRuntimeBindingReadiness({
  ...packet,
  authority: { ...authority, networkAuthority: true }
});
assert.equal(authorityDrift.repositoryOnlyReadinessCertifiable, false);
assert(authorityDrift.certificationBlockers.includes('PROHIBITED_AUTHORITY_MUST_BE_FALSE:networkAuthority'));

console.log('COM-B02K runtime binding readiness: PASS');
