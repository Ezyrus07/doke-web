'use strict';

const assert = require('node:assert/strict');
const implementationModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-methods-implementation');
const config = require('../config/com-b02bj-repository-only-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-methods-implementation.json');

const implementation =
  implementationModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodsImplementation();

assert.equal(implementation.contractId, implementationModule.CONTRACT_ID);
assert.equal(implementation.boundaryId, 'COM-B02BJ');
assert.equal(implementation.predecessorContractId, implementationModule.PREDECESSOR_CONTRACT_ID);
assert.equal(implementation.predecessorHead, 'bf7a883abf3c0fb95696fcdd6609bd4972494116');
assert.equal(implementation.predecessorTree, '4a61f7206262041943860f67f1de9d318fb1c343');
assert.equal(implementation.predecessorReadinessCertified, true);
assert.equal(implementation.canonicalSignatureCompatibility, true);
assert.equal(implementation.executableOperationMethodImplementationMaterialized, true);
assert.equal(implementation.callableOperationMethodsImplemented, true);
assert.equal(implementation.moduleCallableFunctionsExported, true);
assert.equal(implementation.executableOperationMethodReferencesAvailable, true);
assert.equal(implementation.actualOperationMethodsAttachmentPrerequisitesSatisfied, true);
assert.deepEqual(implementation.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
assert.deepEqual(implementation.operationMethodSignatures, [
  {
    operationName: 'registerOpaqueContinuationState',
    requiredInputs: ['routeName', 'opaqueStateHandle', 'continuationState'],
    callable: true
  },
  {
    operationName: 'resolveOpaqueContinuationState',
    requiredInputs: ['routeName', 'opaqueStateHandle'],
    callable: true
  },
  {
    operationName: 'releaseOpaqueContinuationState',
    requiredInputs: ['routeName', 'opaqueStateHandle'],
    callable: true
  }
]);

assert.equal(typeof implementationModule.registerOpaqueContinuationState, 'function');
assert.equal(typeof implementationModule.resolveOpaqueContinuationState, 'function');
assert.equal(typeof implementationModule.releaseOpaqueContinuationState, 'function');

for (const key of [
  'attachmentAppliedToEntryContainerInstance',
  'operationMethodsAttachedToInstance',
  'executableMethodReferencesCaptured',
  'executableMethodReferenceMaterialized',
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
]) assert.equal(implementation[key], false, `${key} must remain false`);

assert.equal(config.authorization.type, 'fresh_explicit_repository_only_boundary_authorization');
assert.equal(config.authorization.singleUse, true);
assert.equal(config.authorization.consumedByBoundary, 'COM-B02BJ');
assert.equal(config.authority.repositoryOnlyExecutableOperationMethodsImplementationAuthority, true);
assert.equal(config.authority.executableOperationMethodImplementationAuthority, true);
assert.equal(config.authority.moduleCallableFunctionExportAuthority, true);
assert.equal(config.authority.operationMethodsAttachmentAuthority, false);
assert.equal(config.authority.executableMethodReferenceCaptureAuthority, false);
assert.equal(config.authority.executableMethodReferenceMaterializationAuthority, false);
assert.equal(config.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
assert.equal(config.functionalCheckpoint.r5iCreated, false);
assert.equal(config.functionalCheckpoint.r5iInferred, false);

const packet = {
  ...implementation,
  predecessorContractId: implementationModule.PREDECESSOR_CONTRACT_ID,
  predecessorHead: implementationModule.PREDECESSOR_HEAD,
  predecessorTree: implementationModule.PREDECESSOR_TREE,
  b02biCertificationRunId: implementationModule.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02biCertificationJobId: implementationModule.PREDECESSOR_CERTIFICATION_JOB_ID,
  b02biReadinessChanged: false,
  b02bhBindingChanged: false,
  b02bcImplementationChanged: false,
  b02bbContractChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority: config.authority
};

const certification = implementationModule.evaluateBoundaryCertification(packet);
assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.executableOperationMethodImplementationMaterialized, true);
assert.equal(certification.callableOperationMethodsImplemented, true);
assert.equal(certification.executableOperationMethodReferencesAvailable, true);
assert.equal(certification.actualOperationMethodsAttachmentPrerequisitesSatisfied, true);
assert.equal(certification.operationMethodsAttachedToInstance, false);
assert.equal(certification.executableMethodReferenceMaterialized, false);
assert.equal(certification.continuationStateStored, false);
assert.equal(certification.networkAuthority, false);
assert.equal(certification.runtimeActivationAuthority, false);
assert.equal(certification.productionAuthority, false);
assert.equal(certification.r5iCreationAuthority, false);
assert.match(certification.nextAction, /fresh_explicit_authorization/);

const forbiddenPacket = {
  ...packet,
  attachmentAppliedToEntryContainerInstance: true,
  operationMethodsAttachedToInstance: true,
  executableMethodReferencesCaptured: true,
  executableMethodReferenceMaterialized: true
};
const forbiddenCertification = implementationModule.evaluateBoundaryCertification(forbiddenPacket);
assert.equal(forbiddenCertification.ready, false);
assert.ok(forbiddenCertification.blockers.includes('B02BJ_ATTACHMENT_APPLICATION_PROHIBITED'));
assert.ok(forbiddenCertification.blockers.includes('B02BJ_OPERATION_METHOD_ATTACHMENT_PROHIBITED'));
assert.ok(forbiddenCertification.blockers.includes('B02BJ_EXECUTABLE_REFERENCE_CAPTURE_PROHIBITED'));
assert.ok(forbiddenCertification.blockers.includes('B02BJ_EXECUTABLE_REFERENCE_MATERIALIZATION_PROHIBITED'));

console.log('COM-B02BJ repository-only executable operation methods implementation: PASS');
