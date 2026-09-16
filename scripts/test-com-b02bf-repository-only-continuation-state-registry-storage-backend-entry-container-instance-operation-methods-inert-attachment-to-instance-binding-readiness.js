'use strict';

const assert = require('node:assert/strict');
const boundary = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment-to-instance-binding-readiness');
const config = require('../config/com-b02bf-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment-to-instance-binding-readiness.json');

assert.equal(boundary.CONTRACT_ID, config.contractId);
assert.equal(boundary.BOUNDARY_ID, 'COM-B02BF');
assert.equal(boundary.PREDECESSOR_HEAD, 'a662d67d4330526238fc397e1781dd8ec711239c');
assert.equal(boundary.PREDECESSOR_TREE, 'd0e80baf727c76fb884775457a0824364be5fcee');
assert.equal(boundary.PREDECESSOR_CERTIFICATION_RUN_ID, 32535210723);
assert.equal(boundary.PREDECESSOR_CERTIFICATION_JOB_ID, 96934708213);
assert.equal(boundary.ENTRY_CONTAINER_INSTANCE_DEPENDENCY_HEAD, 'f48367405b1295eeee50e94336be27fb22e9b738');
assert.equal(boundary.ENTRY_CONTAINER_INSTANCE_DEPENDENCY_TREE, '1905d9d1853d0f7653f2c56fecd1a8fc7a990f55');
assert.equal(boundary.ENTRY_CONTAINER_INSTANCE_DEPENDENCY_CERTIFICATION_RUN_ID, 32494343548);
assert.equal(boundary.ENTRY_CONTAINER_INSTANCE_DEPENDENCY_CERTIFICATION_JOB_ID, 96809107635);

const description = boundary.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingReadiness();

for (const key of [
  'predecessorInertAttachmentMaterialized',
  'entryContainerInstanceDependencyMaterialized',
  'entryContainerInstanceIdentityCompatible',
  'storageBackendKindCompatible',
  'storageBackendInstanceKindCompatible',
  'entryContainerInstanceKindCompatible',
  'registryKindCompatible',
  'registryInstanceKindCompatible',
  'adapterKindCompatible',
  'stateClassificationCompatible',
  'routeNamesCompatible',
  'requiredOperationNamesCompatible',
  'attachmentDescriptorsRemainNonCallable',
  'bindingCompatibilityProven',
  'repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingReadinessMaterialized',
  'inertAttachmentToInstanceBindingReadinessMaterialized',
  'entryContainerInstanceMaterialized',
  'entryContainerInstanceInert',
  'entryContainerInstanceMetadataOnly',
  'storageBackendInstanceMaterialized',
  'storageBackendInstanceInert'
]) assert.equal(description[key], true, `${key} must be true`);

for (const key of [
  'bindingDescriptorMaterialized',
  'inertAttachmentBoundToEntryContainerInstance',
  'attachmentAppliedToEntryContainerInstance',
  'operationMethodsAttachedToInstance',
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
]) assert.equal(description[key], false, `${key} must remain false`);

assert.equal(Object.isFrozen(description), true);
assert.deepEqual(description.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
assert.deepEqual(description.routeNames, [
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);
assert.equal(description.instanceId, 'repository_only_process_local_continuation_state_entry_container_instance_v1');
assert.equal(description.attachmentId, 'repository_only_process_local_continuation_state_entry_container_instance_operation_methods_inert_attachment_v1');

const authority = {
  repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentToInstanceBindingReadinessAuthority: true,
  inertAttachmentToInstanceBindingAuthority: false,
  operationMethodsAttachmentAuthority: false,
  entryContainerMaterializationAuthority: false,
  storageBackendMaterializationAuthority: false,
  opaqueContinuationCarrierInstanceAuthority: false,
  opaqueStateHandleGenerationAuthority: false,
  continuationStateStorageAuthority: false,
  registryOperationInvocationAuthority: false,
  registryLookupAuthority: false,
  registryReleaseAuthority: false,
  resumeSurfaceInvocationAuthority: false,
  activeExecuteHandlerInvocationAuthority: false,
  repositoryOperationInvocationAuthority: false,
  runtimeBindingAuthority: false,
  routeRegistryMutationAuthority: false,
  moduleRouteLoaderMutationAuthority: false,
  routeHandlerMutationAuthority: false,
  credentialSourceBindingAuthority: false,
  credentialReadAuthority: false,
  rpcExecutionAuthority: false,
  networkAuthority: false,
  stagingDeploymentAuthority: false,
  stagingTrafficAuthority: false,
  migrationApplicationAuthority: false,
  runtimeActivationAuthority: false,
  productionAuthority: false,
  pullRequestMergeAuthority: false,
  readyForReviewAuthority: false,
  r5iCreationAuthority: false
};

const packet = {
  ...description,
  predecessorContractId: boundary.PREDECESSOR_CONTRACT_ID,
  predecessorHead: boundary.PREDECESSOR_HEAD,
  predecessorTree: boundary.PREDECESSOR_TREE,
  b02beCertificationRunId: boundary.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02beCertificationJobId: boundary.PREDECESSOR_CERTIFICATION_JOB_ID,
  entryContainerInstanceDependencyContractId: boundary.ENTRY_CONTAINER_INSTANCE_DEPENDENCY_CONTRACT_ID,
  entryContainerInstanceDependencyHead: boundary.ENTRY_CONTAINER_INSTANCE_DEPENDENCY_HEAD,
  entryContainerInstanceDependencyTree: boundary.ENTRY_CONTAINER_INSTANCE_DEPENDENCY_TREE,
  b02azCertificationRunId: boundary.ENTRY_CONTAINER_INSTANCE_DEPENDENCY_CERTIFICATION_RUN_ID,
  b02azCertificationJobId: boundary.ENTRY_CONTAINER_INSTANCE_DEPENDENCY_CERTIFICATION_JOB_ID,
  b02beAttachmentChanged: false,
  b02azInstanceChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority
};

const certification = boundary.evaluateBoundaryCertification(packet);
assert.equal(certification.ready, true, certification.blockers.join(', '));
assert.deepEqual(certification.blockers, []);
assert.equal(certification.bindingCompatibilityProven, true);
assert.equal(certification.inertAttachmentToInstanceBindingReadinessMaterialized, true);
assert.equal(certification.bindingDescriptorMaterialized, false);
assert.equal(certification.inertAttachmentBoundToEntryContainerInstance, false);
assert.equal(certification.attachmentAppliedToEntryContainerInstance, false);
assert.equal(certification.operationMethodsAttachedToInstance, false);
assert.equal(certification.executableMethodReferenceMaterialized, false);
assert.equal(certification.continuationStateStored, false);
assert.equal(certification.networkAuthority, false);
assert.equal(certification.runtimeActivationAuthority, false);
assert.equal(certification.productionAuthority, false);
assert.equal(certification.r5iCreationAuthority, false);

const unsafePacket = {
  ...packet,
  operationMethodsAttachedToInstance: true,
  authority: { ...authority, operationMethodsAttachmentAuthority: true }
};
const unsafeCertification = boundary.evaluateBoundaryCertification(unsafePacket);
assert.equal(unsafeCertification.ready, false);
assert.ok(unsafeCertification.blockers.includes('PROHIBITED_EFFECT_MUST_REMAIN_FALSE:operationMethodsAttachedToInstance'));
assert.ok(unsafeCertification.blockers.includes('PROHIBITED_AUTHORITY_MUST_BE_FALSE:operationMethodsAttachmentAuthority'));

assert.equal(config.readiness.bindingCompatibilityProven, true);
assert.equal(config.readiness.bindingDescriptorMaterialized, false);
assert.equal(config.readiness.inertAttachmentBoundToEntryContainerInstance, false);
assert.equal(config.readiness.attachmentAppliedToEntryContainerInstance, false);
assert.equal(config.readiness.operationMethodsAttachedToInstance, false);
assert.equal(config.readiness.executableMethodReferenceMaterialized, false);
assert.equal(config.authority.inertAttachmentToInstanceBindingAuthority, false);
assert.equal(config.authority.operationMethodsAttachmentAuthority, false);
assert.equal(config.authority.networkAuthority, false);
assert.equal(config.authority.runtimeActivationAuthority, false);
assert.equal(config.authority.productionAuthority, false);
assert.equal(config.functionalCheckpoint.r5iCreated, false);
assert.equal(config.functionalCheckpoint.r5iInferred, false);

console.log('COM-B02BF repository-only inert attachment-to-instance binding readiness: PASS');
