'use strict';

const adapterImplementation = require('./community-command-runtime-binding-adapter-implementation');
const routeHandlers = require('./route-handlers');
const moduleRouteLoader = require('../../shared/http/module-route-loader');
const repositoryV2 = require('./community-command-source-repository-contract');

const CONTRACT_ID = 'com-b02n-runtime-binding-integration-readiness-v1';
const BOUNDARY_ID = 'COM-B02N';
const PREDECESSOR_CONTRACT_ID = 'com-b02m-command-runtime-binding-adapter-implementation-v1';
const PREDECESSOR_HEAD = 'ee81ce055b96b5c492203a25bc41824184a885f3';
const PREDECESSOR_CERTIFICATION_RUN_ID = 31986358312;
const PREDECESSOR_CERTIFICATION_JOB_ID = 95261959053;
const B02F_FAILURE_CODE = 'COM_B02F_ROUTE_NOT_DEPLOYED_OR_ACTIVATED';
const SQL_DEFINITION_PATH = 'backend/modules/communities/sql/com-b02i-command-sources.sql';

const ROUTE_SEAMS = Object.freeze({
  'communities.membership.command': Object.freeze({
    runtimeHandlerName: 'executeMembershipCommand',
    composerExportName: 'composeMembershipCommandRepositoryOnly'
  }),
  'communities.governance.command': Object.freeze({
    runtimeHandlerName: 'executeGovernanceCommand',
    composerExportName: 'composeGovernanceCommandRepositoryOnly'
  }),
  'communities.content.command': Object.freeze({
    runtimeHandlerName: 'executeContentCommand',
    composerExportName: 'composeContentCommandRepositoryOnly'
  })
});

const REPOSITORY_OPERATIONS = Object.freeze([
  'loadCanonicalState',
  'claimIdempotencyKey',
  'createCommunityProjectionOutcome',
  'commitEventProjectionOutcome'
]);

const REQUIRED_INTEGRATION_BLOCKERS = Object.freeze([
  'RUNTIME_HANDLER_INTEGRATION_NOT_MATERIALIZED',
  'REPOSITORY_V2_EXECUTOR_NOT_BOUND',
  'SERVICE_ROLE_PROVIDER_NOT_BOUND',
  'REPOSITORY_V2_SQL_NOT_APPLIED'
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function inspectRepositoryOnlyIntegrationSeams() {
  const routes = Object.entries(ROUTE_SEAMS).map(([routeName, seam]) => {
    const runtimeHandler = routeHandlers.handlers[seam.runtimeHandlerName] || null;
    const exportedHandler = routeHandlers[seam.runtimeHandlerName] || null;
    const composer = routeHandlers[seam.composerExportName] || null;
    const loaderHandler = moduleRouteLoader.getHandler('communities', seam.runtimeHandlerName);
    return freeze({
      routeName,
      runtimeHandlerName: seam.runtimeHandlerName,
      composerExportName: seam.composerExportName,
      runtimeHandlerPresent: typeof runtimeHandler === 'function',
      exportedHandlerMatchesRuntimeMap: runtimeHandler === exportedHandler,
      loaderResolvesRuntimeMapHandler: loaderHandler === runtimeHandler,
      composerExportPresent: typeof composer === 'function',
      composerInRuntimeHandlerMap: routeHandlers.handlers[seam.composerExportName] === composer,
      adapterImplementationExported: typeof adapterImplementation.beginRuntimeBindingAdapter === 'function',
      runtimeHandlerBoundToAdapter: false,
      runtimeHandlerFailureCode: B02F_FAILURE_CODE
    });
  });

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_integration_seams_inspected',
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    routes,
    adapterImplementationContractId: adapterImplementation.CONTRACT_ID,
    adapterStages: clone(adapterImplementation.STAGES),
    repositoryV2ContractId: repositoryV2.CONTRACT_ID,
    repositoryV2FactoryExported: typeof repositoryV2.createCommandSourceRepository === 'function',
    repositoryOperations: REPOSITORY_OPERATIONS,
    sqlDefinitionPath: SQL_DEFINITION_PATH,
    sqlDefinitionIsMigration: false,
    runtimeHandlerIntegrationMaterialized: false,
    repositoryV2ExecutorBound: false,
    serviceRoleProviderBound: false,
    repositoryV2SqlApplied: false,
    runtimeActivated: false,
    rpcExecuted: false,
    networkExecuted: false,
    migrationApplied: false
  });
}

function describeFutureIntegrationContract() {
  const seams = inspectRepositoryOnlyIntegrationSeams();
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'future_runtime_binding_integration_contract_described',
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    requiredInputs: {
      authenticatedRuntimeRequest: true,
      b02mAdapterStateMachine: adapterImplementation.CONTRACT_ID,
      runtimeHandlerBridge: {
        routeNames: Object.keys(ROUTE_SEAMS),
        loaderModule: 'communities',
        activationDefault: false
      },
      repositoryExecutorBridge: {
        repositoryContractId: repositoryV2.CONTRACT_ID,
        requiredExecutorAuthority: 'server_service_role',
        operations: REPOSITORY_OPERATIONS,
        executorBound: false
      },
      sqlPrerequisite: {
        definitionPath: SQL_DEFINITION_PATH,
        applied: false,
        migrationApplicationAuthority: false
      }
    },
    currentBlockers: REQUIRED_INTEGRATION_BLOCKERS,
    seams,
    integrationContractMaterialized: false,
    runtimeHandlerMutationAuthority: false,
    moduleRouteLoaderMutationAuthority: false,
    repositoryExecutorBindingAuthority: false,
    credentialReadAuthority: false,
    migrationApplicationAuthority: false,
    runtimeActivationAuthority: false,
    remoteExecutionAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const requireValue = (condition, code) => {
    if (!condition) blockers.push(code);
  };

  requireValue(input.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02M_PREDECESSOR_CONTRACT_REQUIRED');
  requireValue(input.predecessorHead === PREDECESSOR_HEAD,
    'B02M_CERTIFIED_HEAD_REQUIRED');
  requireValue(input.b02mCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID,
    'B02M_CERTIFICATION_RUN_REQUIRED');
  requireValue(input.b02mCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID,
    'B02M_CERTIFICATION_JOB_REQUIRED');
  requireValue(input.integrationReadinessMaterialized === true,
    'B02N_INTEGRATION_READINESS_REQUIRED');
  requireValue(input.runtimeHandlerSeamIdentified === true,
    'B02N_RUNTIME_HANDLER_SEAM_REQUIRED');
  requireValue(input.repositoryExecutorSeamIdentified === true,
    'B02N_REPOSITORY_EXECUTOR_SEAM_REQUIRED');
  requireValue(input.sqlApplicationPrerequisiteIdentified === true,
    'B02N_SQL_PREREQUISITE_REQUIRED');
  requireValue(input.serviceRoleProviderPrerequisiteIdentified === true,
    'B02N_SERVICE_ROLE_PROVIDER_PREREQUISITE_REQUIRED');

  requireValue(input.b02mAdapterChanged === false, 'B02M_ADAPTER_MUST_REMAIN_FROZEN');
  requireValue(input.routeHandlersChanged === false, 'ROUTE_HANDLERS_MUST_REMAIN_FROZEN');
  requireValue(input.moduleRouteLoaderChanged === false, 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN');
  requireValue(input.repositoryV2ContractChanged === false, 'REPOSITORY_V2_CONTRACT_MUST_REMAIN_FROZEN');
  requireValue(input.repositoryV2SqlChanged === false, 'REPOSITORY_V2_SQL_DEFINITION_MUST_REMAIN_FROZEN');

  requireValue(input.runtimeHandlerIntegrated === false, 'RUNTIME_HANDLER_INTEGRATION_MUST_REMAIN_ABSENT');
  requireValue(input.repositoryV2ExecutorBound === false, 'REPOSITORY_V2_EXECUTOR_MUST_REMAIN_UNBOUND');
  requireValue(input.serviceRoleProviderBound === false, 'SERVICE_ROLE_PROVIDER_MUST_REMAIN_UNBOUND');
  requireValue(input.repositoryV2SqlApplied === false, 'REPOSITORY_V2_SQL_MUST_REMAIN_UNAPPLIED');
  requireValue(input.runtimeActivated === false, 'RUNTIME_MUST_REMAIN_INACTIVE');
  requireValue(input.rpcExecuted === false, 'B02N_RPC_EXECUTION_PROHIBITED');
  requireValue(input.networkExecuted === false, 'B02N_NETWORK_EXECUTION_PROHIBITED');
  requireValue(input.credentialReadExecuted === false, 'B02N_CREDENTIAL_READ_PROHIBITED');
  requireValue(input.realCommunityMutationExecuted === false, 'B02N_REAL_COMMUNITY_MUTATION_PROHIBITED');
  requireValue(input.migrationApplied === false, 'B02N_MIGRATION_APPLICATION_PROHIBITED');

  const authority = input.authority;
  requireValue(isObject(authority) && authority.repositoryOnlyIntegrationReadinessAuthority === true,
    'REPOSITORY_ONLY_INTEGRATION_READINESS_AUTHORITY_REQUIRED');
  for (const key of [
    'runtimeHandlerMutationAuthority',
    'moduleRouteLoaderMutationAuthority',
    'repositoryExecutorBindingAuthority',
    'runtimeActivationAuthority',
    'stagingDeploymentAuthority',
    'stagingTrafficAuthority',
    'rpcExecutionAuthority',
    'networkAuthority',
    'realtimeActivationAuthority',
    'credentialReadAuthority',
    'identityLifecycleRemoteAuthority',
    'realCommunityMutationAuthority',
    'migrationApplicationAuthority',
    'triggerCreationAuthority',
    'receiptCreationAuthority',
    'productionAuthority',
    'pullRequestMergeAuthority',
    'readyForReviewAuthority',
    'r5iCreationAuthority'
  ]) {
    requireValue(isObject(authority) && authority[key] === false,
      `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);
  }

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_runtime_binding_integration_readiness_certifiable'
      : 'repository_only_runtime_binding_integration_readiness_blocked',
    ready,
    blockers,
    integrationBlockers: REQUIRED_INTEGRATION_BLOCKERS,
    runtimeHandlerIntegrated: false,
    repositoryV2ExecutorBound: false,
    serviceRoleProviderBound: false,
    repositoryV2SqlApplied: false,
    runtimeActivated: false,
    remoteExecutionAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    credentialReadAuthority: false,
    migrationApplicationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction: 'advance_under_standing_repository_only_authority_to_b02o_runtime_binding_integration_contract_without_activation_remote_execution_or_migration_application'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  B02F_FAILURE_CODE,
  SQL_DEFINITION_PATH,
  ROUTE_SEAMS,
  REPOSITORY_OPERATIONS,
  REQUIRED_INTEGRATION_BLOCKERS,
  inspectRepositoryOnlyIntegrationSeams,
  describeFutureIntegrationContract,
  evaluateBoundaryCertification
});
