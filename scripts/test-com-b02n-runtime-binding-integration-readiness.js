'use strict';

const assert = require('node:assert/strict');
const readiness = require('../backend/modules/communities/community-command-runtime-binding-integration-readiness');
const routeHandlers = require('../backend/modules/communities/route-handlers');
const loader = require('../backend/shared/http/module-route-loader');

async function main() {
  const seams = readiness.inspectRepositoryOnlyIntegrationSeams();
  assert.equal(seams.decision, 'repository_only_integration_seams_inspected');
  assert.equal(seams.routes.length, 3);
  assert.equal(seams.repositoryV2FactoryExported, true);
  assert.equal(seams.sqlDefinitionIsMigration, false);
  assert.equal(seams.runtimeHandlerIntegrationMaterialized, false);
  assert.equal(seams.repositoryV2ExecutorBound, false);
  assert.equal(seams.serviceRoleProviderBound, false);
  assert.equal(seams.repositoryV2SqlApplied, false);
  assert.equal(seams.runtimeActivated, false);

  for (const seam of seams.routes) {
    assert.equal(seam.runtimeHandlerPresent, true);
    assert.equal(seam.exportedHandlerMatchesRuntimeMap, true);
    assert.equal(seam.loaderResolvesRuntimeMapHandler, true);
    assert.equal(seam.composerExportPresent, true);
    assert.equal(seam.composerInRuntimeHandlerMap, false);
    assert.equal(seam.adapterImplementationExported, true);
    assert.equal(seam.runtimeHandlerBoundToAdapter, false);
    assert.equal(seam.runtimeHandlerFailureCode, 'COM_B02F_ROUTE_NOT_DEPLOYED_OR_ACTIVATED');
  }

  assert.equal(
    loader.getHandler('communities', 'executeMembershipCommand'),
    routeHandlers.handlers.executeMembershipCommand
  );
  assert.equal(
    loader.getHandler('communities', 'composeMembershipCommandRepositoryOnly'),
    null
  );

  const future = readiness.describeFutureIntegrationContract();
  assert.equal(future.decision, 'future_runtime_binding_integration_contract_described');
  assert.deepEqual(future.currentBlockers, [
    'RUNTIME_HANDLER_INTEGRATION_NOT_MATERIALIZED',
    'REPOSITORY_V2_EXECUTOR_NOT_BOUND',
    'SERVICE_ROLE_PROVIDER_NOT_BOUND',
    'REPOSITORY_V2_SQL_NOT_APPLIED'
  ]);
  assert.equal(future.requiredInputs.runtimeHandlerBridge.activationDefault, false);
  assert.equal(future.requiredInputs.repositoryExecutorBridge.requiredExecutorAuthority, 'server_service_role');
  assert.equal(future.requiredInputs.repositoryExecutorBridge.executorBound, false);
  assert.equal(future.requiredInputs.sqlPrerequisite.applied, false);
  assert.equal(future.requiredInputs.sqlPrerequisite.migrationApplicationAuthority, false);
  assert.equal(future.integrationContractMaterialized, false);

  const cert = readiness.evaluateBoundaryCertification({
    predecessorContractId: 'com-b02m-command-runtime-binding-adapter-implementation-v1',
    predecessorHead: 'ee81ce055b96b5c492203a25bc41824184a885f3',
    b02mCertificationRunId: 31986358312,
    b02mCertificationJobId: 95261959053,
    integrationReadinessMaterialized: true,
    runtimeHandlerSeamIdentified: true,
    repositoryExecutorSeamIdentified: true,
    sqlApplicationPrerequisiteIdentified: true,
    serviceRoleProviderPrerequisiteIdentified: true,
    b02mAdapterChanged: false,
    routeHandlersChanged: false,
    moduleRouteLoaderChanged: false,
    repositoryV2ContractChanged: false,
    repositoryV2SqlChanged: false,
    runtimeHandlerIntegrated: false,
    repositoryV2ExecutorBound: false,
    serviceRoleProviderBound: false,
    repositoryV2SqlApplied: false,
    runtimeActivated: false,
    rpcExecuted: false,
    networkExecuted: false,
    credentialReadExecuted: false,
    realCommunityMutationExecuted: false,
    migrationApplied: false,
    authority: {
      repositoryOnlyIntegrationReadinessAuthority: true,
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
    }
  });
  assert.equal(cert.ready, true);
  assert.equal(cert.decision, 'repository_only_runtime_binding_integration_readiness_certifiable');
  assert.deepEqual(cert.integrationBlockers, readiness.REQUIRED_INTEGRATION_BLOCKERS);
  assert.equal(cert.runtimeHandlerIntegrated, false);
  assert.equal(cert.repositoryV2ExecutorBound, false);
  assert.equal(cert.serviceRoleProviderBound, false);
  assert.equal(cert.repositoryV2SqlApplied, false);
  assert.equal(cert.r5iCreationAuthority, false);

  for (const handlerName of [
    'executeMembershipCommand',
    'executeGovernanceCommand',
    'executeContentCommand'
  ]) {
    await assert.rejects(
      () => routeHandlers.handlers[handlerName](),
      (error) => {
        assert.equal(error.code, 'COM_B02F_ROUTE_NOT_DEPLOYED_OR_ACTIVATED');
        assert.equal(error.status, 503);
        assert.equal(error.runtimeActivated, false);
        return true;
      }
    );
  }

  console.log('COM-B02N semantic conformance PASS');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
