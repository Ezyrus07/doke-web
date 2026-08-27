'use strict';

const assert = require('assert');
const readiness = require('../backend/shared/http/repository-only-registry-backed-resume-integration-readiness');
const config = require('../config/com-b02ck-repository-only-registry-backed-resume-integration-readiness.json');

function main() {
  const inspection = readiness.inspectRepositoryOnlyRegistryBackedResumeIntegrationReadiness();

  assert.strictEqual(readiness.CONTRACT_ID, 'com-b02ck-repository-only-registry-backed-resume-integration-readiness-v1');
  assert.strictEqual(readiness.BOUNDARY_ID, 'COM-B02CK');
  assert.strictEqual(inspection.rootCause, readiness.ROOT_CAUSE);
  assert.strictEqual(inspection.b02cjControlledResumeContractSatisfied, true);
  assert.strictEqual(inspection.historicalB02ccPreparedMethodsEffectless, true);
  assert.strictEqual(inspection.historicalB02cgLifecycleProofCertified, true);
  assert.strictEqual(inspection.historicalB02cgExecutionReusable, false);
  assert.strictEqual(inspection.permanentOperationMethodsAttached, true);
  assert.strictEqual(inspection.permanentOperationMethodsEffectfulExecutionImplemented, false);
  assert.strictEqual(inspection.dispatcherStillRequiresPreResolvedContinuation, true);
  assert.strictEqual(inspection.opaqueHandleContractAvailable, true);
  assert.strictEqual(inspection.registryBackedResumeIntegrationReadinessDefined, true);
  assert.strictEqual(inspection.permanentProcessLocalRegistryStorageExecutionImplementationRequired, true);
  assert.strictEqual(inspection.dispatcherRegistryLookupIntegrationRequired, true);

  for (const key of [
    'dispatcherModificationPerformedByBoundary',
    'permanentRegistryStorageExecutionImplementedByBoundary',
    'operationMethodInvocationPerformedByBoundary',
    'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
    'registryReleaseExecuted', 'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked',
    'repositoryOperationInvoked', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied', 'runtimeActivated',
    'productionChanged'
  ]) assert.strictEqual(inspection[key], false, `${key} must remain false`);

  assert.strictEqual(config.contractId, readiness.CONTRACT_ID);
  assert.strictEqual(config.boundaryId, readiness.BOUNDARY_ID);
  assert.strictEqual(config.predecessor.head, readiness.PREDECESSOR_HEAD);
  assert.strictEqual(config.predecessor.tree, readiness.PREDECESSOR_TREE);
  assert.strictEqual(config.predecessor.certificationRunId, readiness.PREDECESSOR_CERTIFICATION_RUN_ID);
  assert.strictEqual(config.predecessor.certificationJobId, readiness.PREDECESSOR_CERTIFICATION_JOB_ID);
  assert.strictEqual(config.predecessor.repositoryCertified, true);
  assert.strictEqual(config.rootCause, readiness.ROOT_CAUSE);
  assert.strictEqual(config.authorization.kind, readiness.AUTHORIZATION_KIND);
  assert.strictEqual(config.authorization.source, readiness.AUTHORIZATION_SOURCE);
  assert.strictEqual(config.authorization.repositoryOnlyRegistryBackedResumeIntegrationReadinessAuthority, true);

  const certification = readiness.evaluateBoundaryCertification({
    ...inspection,
    predecessorCertificationRunId: config.predecessor.certificationRunId,
    predecessorCertificationJobId: config.predecessor.certificationJobId,
    predecessorRepositoryCertified: config.predecessor.repositoryCertified,
    routeRegistryChanged: false,
    moduleRouteLoaderChanged: false,
    routeHandlersChanged: false,
    authority: config.authorization
  });

  assert.strictEqual(certification.ready, true, certification.blockers.join(','));
  assert.deepStrictEqual(certification.blockers, []);
  assert.strictEqual(certification.decision, 'repository_only_registry_backed_resume_integration_readiness_certifiable');
  assert.strictEqual(certification.permanentProcessLocalRegistryStorageExecutionImplementationRequired, true);
  assert.strictEqual(certification.dispatcherRegistryLookupIntegrationRequired, true);
  assert.strictEqual(certification.registryLookupAuthority, false);
  assert.strictEqual(certification.resumeSurfaceInvocationAuthority, false);
  assert.strictEqual(certification.repositoryOperationInvocationAuthority, false);
  assert.strictEqual(certification.networkAuthority, false);
  assert.strictEqual(certification.runtimeActivationAuthority, false);
  assert.strictEqual(certification.productionAuthority, false);
  assert.strictEqual(certification.r5iCreationAuthority, false);
  assert.strictEqual(certification.nextAction, readiness.NEXT_ACTION);

  console.log(JSON.stringify({
    contractId: readiness.CONTRACT_ID,
    boundaryId: readiness.BOUNDARY_ID,
    predecessorHead: readiness.PREDECESSOR_HEAD,
    predecessorTree: readiness.PREDECESSOR_TREE,
    predecessorCertificationRunId: readiness.PREDECESSOR_CERTIFICATION_RUN_ID,
    predecessorCertificationJobId: readiness.PREDECESSOR_CERTIFICATION_JOB_ID,
    rootCause: readiness.ROOT_CAUSE,
    permanentOperationMethodsAttached: true,
    permanentOperationMethodsEffectfulExecutionImplemented: false,
    historicalB02cgExecutionReusable: false,
    permanentProcessLocalRegistryStorageExecutionImplementationRequired: true,
    dispatcherRegistryLookupIntegrationRequired: true,
    registryLookupExecuted: false,
    resumeSurfaceInvoked: false,
    networkExecuted: false,
    runtimeActivated: false,
    productionChanged: false,
    result: 'repository_only_registry_backed_resume_integration_readiness_certifiable'
  }, null, 2));
}

main();
