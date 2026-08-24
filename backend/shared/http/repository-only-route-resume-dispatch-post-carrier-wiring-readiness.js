'use strict';

const resumeReadiness = require('./repository-only-route-resume-dispatch-readiness');
const carrierContract = require('./repository-only-route-continuation-carrier-contract');
const resolver = require('./repository-only-route-surface-resolver');
const orchestration = require('../../modules/communities/community-command-handler-repository-orchestration');
const b02cg = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-continuation-state-register-resolve-release-execution');
const b02cgConfig = require('../../../config/com-b02cg-repository-only-deterministic-synthetic-continuation-state-register-resolve-release-execution.json');

const CONTRACT_ID = 'com-b02ch-repository-only-route-resume-dispatch-post-carrier-wiring-readiness-v1';
const BOUNDARY_ID = 'COM-B02CH';
const PREDECESSOR_CONTRACT_ID = b02cg.CONTRACT_ID;
const PREDECESSOR_HEAD = 'efc2e7a635d975d4cf7958e86bd88ac2c703aaea';
const PREDECESSOR_TREE = '1879e8859b43099a73ed910d521d5ad6b581dc48';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32738520064;
const PREDECESSOR_CERTIFICATION_JOB_ID = 97467102582;
const AUTHORIZATION_KIND = 'repository_only_resume_dispatch_post_carrier_wiring_readiness';
const AUTHORIZATION_SOURCE = 'user_explicit_authorization_com_001_post_b02cg_next_boundary_repository_only';
const NEXT_ACTION = 'stop_and_require_fresh_explicit_authorization_before_any_resume_dispatcher_implementation_resume_surface_invocation_or_additional_state_storage';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function inspectRepositoryOnlyResumeDispatchPostCarrierWiringReadiness() {
  const historicalReadiness = resumeReadiness.inspectRepositoryOnlyRouteResumeDispatchReadiness();
  const carrier = carrierContract.describeRepositoryOnlyOpaqueContinuationCarrierContract();
  const resolutions = resolver.listRepositoryOnlyRouteSurfaceResolutions();

  const allResumeSurfacesResolved =
    resolutions.length === 3 &&
    resolutions.every((entry) =>
      isObject(entry) &&
      typeof entry.resumeSurface === 'function' &&
      entry.executableReferencesInvoked === false &&
      entry.repositoryOperationInvoked === false &&
      entry.networkExecuted === false &&
      entry.runtimeActivated === false
    );

  const b02cgLifecycleProofCertified =
    b02cgConfig.contractId === b02cg.CONTRACT_ID &&
    b02cgConfig.boundaryId === 'COM-B02CG' &&
    b02cgConfig.executionProof.authorizationConsumed === true &&
    b02cgConfig.executionProof.registryRegisterExecuted === true &&
    b02cgConfig.executionProof.registryLookupExecuted === true &&
    b02cgConfig.executionProof.registryResolveExecuted === true &&
    b02cgConfig.executionProof.registryReleaseExecuted === true &&
    b02cgConfig.executionProof.entryCountAfterRegister === 1 &&
    b02cgConfig.executionProof.entryCountAfterResolve === 1 &&
    b02cgConfig.executionProof.entryCountAfterRelease === 0 &&
    b02cgConfig.executionProof.resumeSurfaceInvoked === false &&
    b02cgConfig.finalization.executableSurfaceRemoved === true &&
    b02cgConfig.finalization.reexecutionAllowed === false;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: 'repository_only_resume_dispatch_post_carrier_wiring_readiness_materialized',
    historicalB02zResumeDispatcherRequirementObserved:
      historicalReadiness.contractId === resumeReadiness.CONTRACT_ID &&
      historicalReadiness.resumeDispatchContractRequired === true &&
      historicalReadiness.opaqueContinuationStateCarrierRequired === true &&
      historicalReadiness.resumeDispatcherImplemented === false,
    opaqueContinuationCarrierContractMaterialized:
      carrier.contractId === carrierContract.CONTRACT_ID &&
      carrier.contractMaterialized === true,
    b02cgLifecycleProofCertified,
    allResumeSurfacesResolved,
    b02tResumeSurfaceExists:
      typeof orchestration.resumeRepositoryOnlyCommandHandlerOrchestration === 'function',
    postCarrierResumeWiringReadinessDefined: true,
    resumeDispatcherImplementationRequired: true,
    resumeDispatcherImplemented: false,
    resumeSurfaceInvocationImplemented: false,
    resumeSurfaceInvoked: false,
    newContinuationStateStored: false,
    registryOperationInvoked: false,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02CG_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02CG_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02CG_CERTIFIED_TREE_REQUIRED');
  req(input.predecessorCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02CG_CERTIFICATION_RUN_REQUIRED');
  req(input.predecessorCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02CG_CERTIFICATION_JOB_REQUIRED');
  req(input.predecessorRepositoryCertified === true, 'B02CG_REPOSITORY_CERTIFICATION_REQUIRED');

  for (const key of [
    'historicalB02zResumeDispatcherRequirementObserved',
    'opaqueContinuationCarrierContractMaterialized',
    'b02cgLifecycleProofCertified',
    'allResumeSurfacesResolved',
    'b02tResumeSurfaceExists',
    'postCarrierResumeWiringReadinessDefined',
    'resumeDispatcherImplementationRequired'
  ]) req(input[key] === true, `REQUIRED_POST_CARRIER_READINESS_PROOF_MISSING:${key}`);

  for (const key of [
    'resumeDispatcherImplemented', 'resumeSurfaceInvocationImplemented', 'resumeSurfaceInvoked',
    'newContinuationStateStored', 'registryOperationInvoked', 'activeExecuteHandlerInvoked',
    'repositoryOperationInvoked', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied', 'runtimeActivated',
    'productionChanged', 'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) && authority.kind === AUTHORIZATION_KIND, 'FRESH_AUTHORIZATION_KIND_REQUIRED');
  req(isObject(authority) && authority.source === AUTHORIZATION_SOURCE, 'FRESH_AUTHORIZATION_SOURCE_REQUIRED');
  req(isObject(authority) && authority.repositoryOnlyResumeDispatchPostCarrierWiringReadinessAuthority === true,
    'POST_CARRIER_WIRING_READINESS_AUTHORITY_REQUIRED');

  for (const key of [
    'resumeDispatcherImplementationAuthority', 'resumeSurfaceInvocationAuthority',
    'continuationStateStorageAuthority', 'registryOperationInvocationAuthority',
    'activeExecuteHandlerInvocationAuthority', 'repositoryOperationInvocationAuthority',
    'runtimeBindingAuthority', 'routeRegistryMutationAuthority', 'moduleRouteLoaderMutationAuthority',
    'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority', 'credentialReadAuthority',
    'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority', 'stagingTrafficAuthority',
    'migrationApplicationAuthority', 'runtimeActivationAuthority', 'productionAuthority',
    'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_resume_dispatch_post_carrier_wiring_readiness_certifiable'
      : 'repository_only_resume_dispatch_post_carrier_wiring_readiness_blocked',
    ready,
    blockers,
    resumeDispatcherImplementationRequired: ready,
    resumeDispatcherImplemented: false,
    resumeSurfaceInvocationAuthority: false,
    continuationStateStorageAuthority: false,
    registryOperationInvocationAuthority: false,
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
  NEXT_ACTION,
  inspectRepositoryOnlyResumeDispatchPostCarrierWiringReadiness,
  evaluateBoundaryCertification
});
