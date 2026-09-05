'use strict';

const dispatcher = require('./repository-only-route-resume-dispatcher');
const carrierContract = require('./repository-only-route-continuation-carrier-contract');
const operationImplementation = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-methods-implementation');
const b02byConfig = require('../../../config/com-b02by-repository-only-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment.json');
const b02ccConfig = require('../../../config/com-b02cc-repository-only-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-operation-method-invocation.json');
const b02cgConfig = require('../../../config/com-b02cg-repository-only-deterministic-synthetic-continuation-state-register-resolve-release-execution.json');
const b02cjConfig = require('../../../config/com-b02cj-repository-only-route-resume-surface-controlled-invocation.json');

const CONTRACT_ID = 'com-b02ck-repository-only-registry-backed-resume-integration-readiness-v1';
const BOUNDARY_ID = 'COM-B02CK';
const PREDECESSOR_CONTRACT_ID = 'com-b02cj-repository-only-route-resume-surface-controlled-invocation-v1';
const PREDECESSOR_HEAD = 'c40b9dab87b2ce79d82543ea0c08ce78f99a1339';
const PREDECESSOR_TREE = '09f89d5062b36c6c04f02f32ce2a53d2ce5dcd88';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32967534682;
const PREDECESSOR_CERTIFICATION_JOB_ID = 98173351054;
const AUTHORIZATION_KIND = 'repository_only_registry_backed_resume_integration_readiness';
const AUTHORIZATION_SOURCE = 'user_explicit_authorization_com_001_post_b02cj_100_percent_next';
const READINESS_PROBE_HANDLE = 'repo-only-cont:b02ck-readiness-probe-0001';
const ROOT_CAUSE = 'B02CJ_PROVES_CONTROLLED_RESUME_ONLY_WITH_PRE_RESOLVED_CONTINUATION_WHILE_PERMANENT_REGISTRY_OPERATION_METHODS_REMAIN_EFFECTLESS_PREPARERS_AND_HISTORICAL_B02CG_EXECUTION_IS_NON_REUSABLE';
const NEXT_ACTION = 'continue_to_repository_only_permanent_process_local_registry_storage_execution_implementation_before_dispatcher_registry_lookup_integration_or_sensitive_scope';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function inspectRepositoryOnlyRegistryBackedResumeIntegrationReadiness() {
  const dispatcherInspection = dispatcher.inspectRepositoryOnlyRouteResumeDispatcher();

  const b02cjControlledResumeContractSatisfied =
    b02cjConfig.contractId === PREDECESSOR_CONTRACT_ID &&
    b02cjConfig.boundaryId === 'COM-B02CJ' &&
    b02cjConfig.controlledInvocation?.controlledInvocationCount === 1 &&
    b02cjConfig.controlledInvocation?.resumeSurfaceInvoked === true &&
    b02cjConfig.controlledInvocation?.registryLookupUsedToResolveContinuation === false &&
    b02cjConfig.requiredAbsences?.registryLookupExecuted === false &&
    b02cjConfig.requiredAbsences?.newContinuationStateStored === false &&
    b02cjConfig.requiredAbsences?.repositoryOperationInvoked === false &&
    b02cjConfig.requiredAbsences?.networkExecuted === false &&
    b02cjConfig.requiredAbsences?.runtimeActivated === false;

  const historicalB02ccPreparedMethodsEffectless =
    b02ccConfig.boundaryId === 'COM-B02CC' &&
    b02ccConfig.requiredProofs?.operationMethodInvocationCount === 3 &&
    b02ccConfig.requiredProofs?.executableOperationMethodsInvoked === true &&
    b02ccConfig.requiredProofs?.allInvocationResultsPreparedAndEffectless === true &&
    b02ccConfig.requiredAbsences?.continuationStateStored === false &&
    b02ccConfig.requiredAbsences?.registryOperationInvoked === false &&
    b02ccConfig.requiredAbsences?.registryLookupExecuted === false &&
    b02ccConfig.requiredAbsences?.registryReleaseExecuted === false;

  const historicalB02cgLifecycleProofCertified =
    b02cgConfig.boundaryId === 'COM-B02CG' &&
    b02cgConfig.executionProof?.authorizationConsumed === true &&
    b02cgConfig.executionProof?.registryRegisterExecuted === true &&
    b02cgConfig.executionProof?.registryLookupExecuted === true &&
    b02cgConfig.executionProof?.registryResolveExecuted === true &&
    b02cgConfig.executionProof?.registryReleaseExecuted === true &&
    b02cgConfig.executionProof?.processLocalOnly === true &&
    b02cgConfig.executionProof?.ephemeralRegistry === true &&
    b02cgConfig.executionProof?.stateEscapesExecutionProcess === false &&
    b02cgConfig.finalization?.singleUseExecutorRemoved === true &&
    b02cgConfig.finalization?.reexecutionAllowed === false;

  const permanentOperationMethodsAttached =
    b02byConfig.boundaryId === 'COM-B02BY' &&
    b02byConfig.requiredProofs?.allThreeOperationMethodsAttached === true &&
    b02byConfig.requiredProofs?.operationMethodsAttachedToInstance === true &&
    b02byConfig.requiredAbsences?.executableOperationMethodsInvoked === false &&
    typeof operationImplementation.registerOpaqueContinuationState === 'function' &&
    typeof operationImplementation.resolveOpaqueContinuationState === 'function' &&
    typeof operationImplementation.releaseOpaqueContinuationState === 'function';

  const dispatcherStillRequiresPreResolvedContinuation =
    dispatcherInspection.resumeDispatcherImplemented === true &&
    dispatcherInspection.resumeSurfaceInvocationImplemented === true &&
    dispatcherInspection.registryLookupImplementedByBoundary === false &&
    dispatcherInspection.continuationStateStorageImplementedByBoundary === false;

  const opaqueHandleContractAvailable =
    carrierContract.OPAQUE_HANDLE_PATTERN instanceof RegExp &&
    carrierContract.OPAQUE_HANDLE_PATTERN.test(READINESS_PROBE_HANDLE);

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: 'repository_only_registry_backed_resume_integration_readiness_materialized',
    rootCause: ROOT_CAUSE,
    b02cjControlledResumeContractSatisfied,
    historicalB02ccPreparedMethodsEffectless,
    historicalB02cgLifecycleProofCertified,
    historicalB02cgExecutionReusable: false,
    permanentOperationMethodsAttached,
    permanentOperationMethodsEffectfulExecutionImplemented: false,
    dispatcherStillRequiresPreResolvedContinuation,
    opaqueHandleContractAvailable,
    registryBackedResumeIntegrationReadinessDefined: true,
    permanentProcessLocalRegistryStorageExecutionImplementationRequired: true,
    dispatcherRegistryLookupIntegrationRequired: true,
    dispatcherModificationPerformedByBoundary: false,
    permanentRegistryStorageExecutionImplementedByBoundary: false,
    operationMethodInvocationPerformedByBoundary: false,
    continuationStateStored: false,
    registryOperationInvoked: false,
    registryLookupExecuted: false,
    registryReleaseExecuted: false,
    resumeSurfaceInvoked: false,
    activeExecuteHandlerInvoked: false,
    repositoryOperationInvoked: false,
    credentialReadExecuted: false,
    rpcExecuted: false,
    networkExecuted: false,
    stagingReadExecuted: false,
    stagingMutationExecuted: false,
    migrationApplied: false,
    runtimeActivated: false,
    productionChanged: false,
    nextAction: NEXT_ACTION
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02CJ_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02CJ_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02CJ_CERTIFIED_TREE_REQUIRED');
  req(input.predecessorCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02CJ_CERTIFICATION_RUN_REQUIRED');
  req(input.predecessorCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02CJ_CERTIFICATION_JOB_REQUIRED');
  req(input.predecessorRepositoryCertified === true, 'B02CJ_REPOSITORY_CERTIFICATION_REQUIRED');
  req(input.rootCause === ROOT_CAUSE, 'B02CK_EXACT_ROOT_CAUSE_REQUIRED');

  for (const key of [
    'b02cjControlledResumeContractSatisfied',
    'historicalB02ccPreparedMethodsEffectless',
    'historicalB02cgLifecycleProofCertified',
    'permanentOperationMethodsAttached',
    'dispatcherStillRequiresPreResolvedContinuation',
    'opaqueHandleContractAvailable',
    'registryBackedResumeIntegrationReadinessDefined',
    'permanentProcessLocalRegistryStorageExecutionImplementationRequired',
    'dispatcherRegistryLookupIntegrationRequired'
  ]) req(input[key] === true, `REQUIRED_REGISTRY_BACKED_RESUME_READINESS_PROOF_MISSING:${key}`);

  for (const key of [
    'historicalB02cgExecutionReusable',
    'permanentOperationMethodsEffectfulExecutionImplemented',
    'dispatcherModificationPerformedByBoundary',
    'permanentRegistryStorageExecutionImplementedByBoundary',
    'operationMethodInvocationPerformedByBoundary',
    'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
    'registryReleaseExecuted', 'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked',
    'repositoryOperationInvoked', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied', 'runtimeActivated',
    'productionChanged', 'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_B02CK_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) && authority.kind === AUTHORIZATION_KIND, 'FRESH_AUTHORIZATION_KIND_REQUIRED');
  req(isObject(authority) && authority.source === AUTHORIZATION_SOURCE, 'FRESH_AUTHORIZATION_SOURCE_REQUIRED');
  req(isObject(authority) && authority.repositoryOnlyRegistryBackedResumeIntegrationReadinessAuthority === true,
    'REGISTRY_BACKED_RESUME_INTEGRATION_READINESS_AUTHORITY_REQUIRED');

  for (const key of [
    'permanentRegistryStorageExecutionImplementationAuthority',
    'dispatcherRegistryLookupIntegrationAuthority',
    'operationMethodInvocationAuthority', 'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority', 'registryLookupAuthority', 'registryReleaseAuthority',
    'resumeSurfaceInvocationAuthority', 'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority',
    'routeRegistryMutationAuthority', 'moduleRouteLoaderMutationAuthority', 'routeHandlerMutationAuthority',
    'credentialSourceBindingAuthority', 'credentialReadAuthority', 'rpcExecutionAuthority',
    'networkAuthority', 'stagingDeploymentAuthority', 'stagingTrafficAuthority',
    'migrationApplicationAuthority', 'runtimeActivationAuthority', 'productionAuthority',
    'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_registry_backed_resume_integration_readiness_certifiable'
      : 'repository_only_registry_backed_resume_integration_readiness_blocked',
    ready,
    blockers,
    rootCause: ready ? ROOT_CAUSE : null,
    permanentProcessLocalRegistryStorageExecutionImplementationRequired: ready,
    dispatcherRegistryLookupIntegrationRequired: ready,
    continuationStateStorageAuthority: false,
    registryOperationInvocationAuthority: false,
    registryLookupAuthority: false,
    registryReleaseAuthority: false,
    resumeSurfaceInvocationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction: NEXT_ACTION
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_TREE,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  AUTHORIZATION_KIND,
  AUTHORIZATION_SOURCE,
  READINESS_PROBE_HANDLE,
  ROOT_CAUSE,
  NEXT_ACTION,
  inspectRepositoryOnlyRegistryBackedResumeIntegrationReadiness,
  evaluateBoundaryCertification
});
