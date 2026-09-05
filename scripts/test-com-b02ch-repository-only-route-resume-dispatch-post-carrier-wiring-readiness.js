'use strict';

const assert = require('node:assert/strict');
const target = require('../backend/shared/http/repository-only-route-resume-dispatch-post-carrier-wiring-readiness');
const config = require('../config/com-b02ch-repository-only-route-resume-dispatch-post-carrier-wiring-readiness.json');

assert.equal(target.CONTRACT_ID, config.contractId);
assert.equal(target.BOUNDARY_ID, config.boundaryId);
assert.equal(target.PREDECESSOR_CONTRACT_ID, config.predecessor.contractId);
assert.equal(target.PREDECESSOR_HEAD, config.predecessor.head);
assert.equal(target.PREDECESSOR_TREE, config.predecessor.tree);
assert.equal(target.PREDECESSOR_CERTIFICATION_RUN_ID, config.predecessor.certificationRunId);
assert.equal(target.PREDECESSOR_CERTIFICATION_JOB_ID, config.predecessor.certificationJobId);
assert.equal(target.AUTHORIZATION_KIND, config.authorization.kind);
assert.equal(target.AUTHORIZATION_SOURCE, config.authorization.source);
assert.equal(target.NEXT_ACTION, config.nextAction);
assert.equal(config.status, 'REPOSITORY_CERTIFICATION_CANDIDATE');
assert.equal(config.authorization.repositoryOnlyResumeDispatchPostCarrierWiringReadinessAuthority, true);

for (const key of [
  'resumeDispatcherImplementationAuthority', 'resumeSurfaceInvocationAuthority',
  'continuationStateStorageAuthority', 'registryOperationInvocationAuthority',
  'activeExecuteHandlerInvocationAuthority', 'repositoryOperationInvocationAuthority',
  'runtimeBindingAuthority', 'routeRegistryMutationAuthority', 'moduleRouteLoaderMutationAuthority',
  'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority', 'credentialReadAuthority',
  'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority', 'stagingTrafficAuthority',
  'migrationApplicationAuthority', 'runtimeActivationAuthority', 'productionAuthority',
  'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
]) assert.equal(config.authorization[key], false, `${key} must remain false`);

const inspection = target.inspectRepositoryOnlyResumeDispatchPostCarrierWiringReadiness();
for (const key of [
  'historicalB02zResumeDispatcherRequirementObserved',
  'opaqueContinuationCarrierContractMaterialized',
  'b02cgLifecycleProofCertified',
  'allResumeSurfacesResolved',
  'b02tResumeSurfaceExists',
  'postCarrierResumeWiringReadinessDefined',
  'resumeDispatcherImplementationRequired'
]) assert.equal(inspection[key], true, `${key} must be true`);

for (const key of [
  'resumeDispatcherImplemented', 'resumeSurfaceInvocationImplemented', 'resumeSurfaceInvoked',
  'newContinuationStateStored', 'registryOperationInvoked', 'activeExecuteHandlerInvoked',
  'repositoryOperationInvoked', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
  'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied', 'runtimeActivated',
  'productionChanged'
]) assert.equal(inspection[key], false, `${key} must be false`);

const certification = target.evaluateBoundaryCertification({
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.head,
  predecessorTree: config.predecessor.tree,
  predecessorCertificationRunId: config.predecessor.certificationRunId,
  predecessorCertificationJobId: config.predecessor.certificationJobId,
  predecessorRepositoryCertified: config.predecessor.repositoryCertified,
  historicalB02zResumeDispatcherRequirementObserved: inspection.historicalB02zResumeDispatcherRequirementObserved,
  opaqueContinuationCarrierContractMaterialized: inspection.opaqueContinuationCarrierContractMaterialized,
  b02cgLifecycleProofCertified: inspection.b02cgLifecycleProofCertified,
  allResumeSurfacesResolved: inspection.allResumeSurfacesResolved,
  b02tResumeSurfaceExists: inspection.b02tResumeSurfaceExists,
  postCarrierResumeWiringReadinessDefined: inspection.postCarrierResumeWiringReadinessDefined,
  resumeDispatcherImplementationRequired: inspection.resumeDispatcherImplementationRequired,
  resumeDispatcherImplemented: inspection.resumeDispatcherImplemented,
  resumeSurfaceInvocationImplemented: inspection.resumeSurfaceInvocationImplemented,
  resumeSurfaceInvoked: inspection.resumeSurfaceInvoked,
  newContinuationStateStored: inspection.newContinuationStateStored,
  registryOperationInvoked: inspection.registryOperationInvoked,
  activeExecuteHandlerInvoked: inspection.activeExecuteHandlerInvoked,
  repositoryOperationInvoked: inspection.repositoryOperationInvoked,
  credentialReadExecuted: inspection.credentialReadExecuted,
  rpcExecuted: inspection.rpcExecuted,
  networkExecuted: inspection.networkExecuted,
  stagingReadExecuted: inspection.stagingReadExecuted,
  stagingMutationExecuted: inspection.stagingMutationExecuted,
  migrationApplied: inspection.migrationApplied,
  runtimeActivated: inspection.runtimeActivated,
  productionChanged: inspection.productionChanged,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority: config.authorization
});

assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.resumeDispatcherImplementationRequired, true);
assert.equal(certification.resumeDispatcherImplemented, false);
assert.equal(certification.resumeSurfaceInvocationAuthority, false);
assert.equal(certification.continuationStateStorageAuthority, false);
assert.equal(certification.registryOperationInvocationAuthority, false);
assert.equal(certification.repositoryOperationInvocationAuthority, false);
assert.equal(certification.networkAuthority, false);
assert.equal(certification.runtimeActivationAuthority, false);
assert.equal(certification.productionAuthority, false);
assert.equal(certification.r5iCreationAuthority, false);
assert.equal(certification.nextAction, config.nextAction);

console.log('COM-B02CH repository-only post-carrier resume wiring readiness assertions passed; resume remains uninvoked.');
