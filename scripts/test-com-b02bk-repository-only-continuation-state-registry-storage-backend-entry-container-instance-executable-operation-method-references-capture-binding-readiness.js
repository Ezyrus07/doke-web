'use strict';

const assert = require('node:assert/strict');
const readinessModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-capture-binding-readiness');
const config = require('../config/com-b02bk-repository-only-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-capture-binding-readiness.json');

const readiness =
  readinessModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCaptureBindingReadiness();

assert.equal(readiness.contractId, readinessModule.CONTRACT_ID);
assert.equal(readiness.boundaryId, 'COM-B02BK');
assert.equal(readiness.predecessorContractId, readinessModule.PREDECESSOR_CONTRACT_ID);
assert.equal(readiness.predecessorHead, '0c6bcf383ff7d05b97576657e6990e4cdef7bc0f');
assert.equal(readiness.predecessorTree, '57d0d8a1cd95523c04f3b226208a6b3381eb3096');
assert.equal(readiness.predecessorExecutableImplementationCertified, true);
assert.equal(readiness.canonicalOperationNamesPreserved, true);
assert.equal(readiness.canonicalSignaturesPreserved, true);
assert.equal(readiness.allCallableOperationMethodExportsPresent, true);
assert.equal(readiness.captureBindingCompatibilityProven, true);
assert.equal(readiness.executableOperationMethodReferencesAvailable, true);
assert.equal(readiness.executableMethodReferenceCaptureBindingReadinessMaterialized, true);
assert.equal(readiness.captureCandidatesDataOnly, true);
assert.equal(readiness.captureCandidatesContainNoExecutableReferences, true);
assert.equal(readiness.inertAttachmentBoundToEntryContainerInstance, true);
assert.deepEqual(readiness.captureCandidateOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);

for (const key of [
  'attachmentAppliedToEntryContainerInstance',
  'operationMethodsAttachedToInstance',
  'executableMethodReferencesCaptured',
  'executableMethodReferenceMaterialized',
  'executableMethodReferencesBound',
  'storageBackendMaterialized',
  'entryContainerMaterialized',
  'carrierInstanceMaterialized',
  'opaqueStateHandleGenerated',
  'continuationStateStored',
  'registryOperationInvoked',
  'registryLookupExecuted',
  'registryReleaseExecuted',
  'rawStateSerialized',
  'rawStateExported',
  'executableReferencesSerialized',
  'executableReferencesExported',
  'resumeSurfaceInvoked',
  'activeExecuteHandlerInvoked',
  'repositoryOperationInvoked',
  'credentialSourceBound',
  'credentialReadExecuted',
  'rpcExecuted',
  'networkExecuted',
  'stagingReadExecuted',
  'stagingMutationExecuted',
  'migrationApplied',
  'runtimeBindingImplemented',
  'runtimeActivated',
  'productionChanged'
]) assert.equal(readiness[key], false, `${key} must remain false`);

assert.equal(config.authorization.type, 'fresh_explicit_repository_only_boundary_authorization');
assert.equal(config.authorization.singleUse, true);
assert.equal(config.authorization.consumedByBoundary, 'COM-B02BK');
assert.equal(config.authority.repositoryOnlyExecutableMethodReferenceCaptureBindingReadinessAuthority, true);
assert.equal(config.authority.executableMethodReferenceCaptureAuthority, false);
assert.equal(config.authority.executableMethodReferenceMaterializationAuthority, false);
assert.equal(config.authority.executableMethodReferenceBindingAuthority, false);
assert.equal(config.authority.operationMethodsAttachmentAuthority, false);
assert.equal(config.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
assert.equal(config.functionalCheckpoint.r5iCreated, false);
assert.equal(config.functionalCheckpoint.r5iInferred, false);

const packet = {
  ...readiness,
  predecessorContractId: readinessModule.PREDECESSOR_CONTRACT_ID,
  predecessorHead: readinessModule.PREDECESSOR_HEAD,
  predecessorTree: readinessModule.PREDECESSOR_TREE,
  b02bjCertificationRunId: readinessModule.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02bjCertificationJobId: readinessModule.PREDECESSOR_CERTIFICATION_JOB_ID,
  b02bjImplementationChanged: false,
  b02biReadinessChanged: false,
  b02bhBindingChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority: config.authority
};

const certification = readinessModule.evaluateBoundaryCertification(packet);
assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.captureBindingCompatibilityProven, true);
assert.equal(certification.executableMethodReferenceCaptureBindingReadinessMaterialized, true);
assert.equal(certification.executableMethodReferencesCaptured, false);
assert.equal(certification.executableMethodReferenceMaterialized, false);
assert.equal(certification.executableMethodReferencesBound, false);
assert.equal(certification.operationMethodsAttachedToInstance, false);
assert.equal(certification.continuationStateStored, false);
assert.equal(certification.networkAuthority, false);
assert.equal(certification.runtimeActivationAuthority, false);
assert.equal(certification.productionAuthority, false);
assert.equal(certification.r5iCreationAuthority, false);
assert.match(certification.nextAction, /fresh_explicit_authorization/);

const forbiddenPacket = {
  ...packet,
  executableMethodReferencesCaptured: true,
  executableMethodReferenceMaterialized: true,
  executableMethodReferencesBound: true,
  operationMethodsAttachedToInstance: true
};
const forbiddenCertification = readinessModule.evaluateBoundaryCertification(forbiddenPacket);
assert.equal(forbiddenCertification.ready, false);
assert.ok(forbiddenCertification.blockers.includes('B02BK_EXECUTABLE_REFERENCE_CAPTURE_PROHIBITED'));
assert.ok(forbiddenCertification.blockers.includes('B02BK_EXECUTABLE_REFERENCE_MATERIALIZATION_PROHIBITED'));
assert.ok(forbiddenCertification.blockers.includes('B02BK_EXECUTABLE_REFERENCE_BINDING_PROHIBITED'));
assert.ok(forbiddenCertification.blockers.includes('B02BK_OPERATION_METHOD_ATTACHMENT_PROHIBITED'));

console.log('COM-B02BK repository-only executable operation method references capture/binding readiness: PASS');
