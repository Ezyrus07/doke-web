'use strict';

const assert = require('assert');
const contract = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-contract');
const implementation = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-implementation');
const config = require('../config/com-b02bs-repository-only-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-implementation.json');

const description =
  implementation.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetImplementation();

assert.strictEqual(implementation.CONTRACT_ID, config.contractId);
assert.strictEqual(implementation.BOUNDARY_ID, 'COM-B02BS');
assert.strictEqual(implementation.PREDECESSOR_CONTRACT_ID, contract.CONTRACT_ID);
assert.strictEqual(implementation.PREDECESSOR_HEAD, config.predecessor.certifiedHead);
assert.strictEqual(implementation.PREDECESSOR_TREE, config.predecessor.certifiedTree);
assert.strictEqual(implementation.PREDECESSOR_CERTIFICATION_RUN_ID, config.predecessor.certificationRunId);
assert.strictEqual(implementation.PREDECESSOR_CERTIFICATION_JOB_ID, config.predecessor.certificationJobId);
assert.strictEqual(implementation.ROOT_CAUSE, config.rootCause);

assert.strictEqual(
  typeof implementation.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget,
  'function'
);

for (const key of [
  'predecessorContractCertified',
  'implementationFactoryExported',
  'implementationFactoryInvocationRequiredForFutureMaterialization',
  'implementationProducesDistinctFutureTargetIdentity',
  'implementationProducesExtensibleFutureTarget',
  'implementationProducesInitiallyEmptyOperationMethodSlots',
  'sourceIdentityLineagePreserved',
  'targetIdentityDistinctFromFrozenSource',
  'boundExecutableReferencesExternalUntilSeparateAttachmentAuthority',
  'attachmentCapableTargetMaterializationReadinessMaterialized',
  'attachmentCapableTargetMaterializationReady',
  'attachmentCapableTargetContractMaterialized',
  'attachmentCapableTargetImplementationMaterialized'
]) assert.strictEqual(description[key], true, key);

for (const key of [
  'implementationFactoryInvokedByBoundary',
  'implementationImportsExecutableReferenceBinding',
  'implementationMutatesFrozenSource',
  'implementationCarriesExecutableReferences',
  'implementationInvokesExecutableReferences',
  'attachmentCapableTargetMaterialized',
  'attachmentCapableTargetExtensible',
  'attachmentCapableTargetOperationMethodsPresent',
  'attachmentAppliedToEntryContainerInstance',
  'operationMethodsAttachedToInstance',
  'executableOperationMethodsInvoked',
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
]) assert.strictEqual(description[key], false, key);

const proof = {
  predecessorContractId: implementation.PREDECESSOR_CONTRACT_ID,
  predecessorHead: implementation.PREDECESSOR_HEAD,
  predecessorTree: implementation.PREDECESSOR_TREE,
  b02brCertificationRunId: implementation.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02brCertificationJobId: implementation.PREDECESSOR_CERTIFICATION_JOB_ID,
  rootCause: implementation.ROOT_CAUSE,
  predecessorContractCertified: description.predecessorContractCertified,
  implementationFactoryExported: description.implementationFactoryExported,
  implementationFactoryInvocationRequiredForFutureMaterialization:
    description.implementationFactoryInvocationRequiredForFutureMaterialization,
  implementationProducesDistinctFutureTargetIdentity:
    description.implementationProducesDistinctFutureTargetIdentity,
  implementationProducesExtensibleFutureTarget:
    description.implementationProducesExtensibleFutureTarget,
  implementationProducesInitiallyEmptyOperationMethodSlots:
    description.implementationProducesInitiallyEmptyOperationMethodSlots,
  sourceIdentityLineagePreserved: description.sourceIdentityLineagePreserved,
  targetIdentityDistinctFromFrozenSource: description.targetIdentityDistinctFromFrozenSource,
  boundExecutableReferencesExternalUntilSeparateAttachmentAuthority:
    description.boundExecutableReferencesExternalUntilSeparateAttachmentAuthority,
  attachmentCapableTargetImplementationMaterialized:
    description.attachmentCapableTargetImplementationMaterialized,
  implementationFactoryInvokedByBoundary: false,
  implementationImportsExecutableReferenceBinding: false,
  implementationMutatesFrozenSource: false,
  implementationCarriesExecutableReferences: false,
  implementationInvokesExecutableReferences: false,
  attachmentCapableTargetMaterialized: false,
  attachmentCapableTargetExtensible: false,
  attachmentCapableTargetOperationMethodsPresent: false,
  attachmentAppliedToEntryContainerInstance: false,
  operationMethodsAttachedToInstance: false,
  executableOperationMethodsInvoked: false,
  storageBackendMaterialized: false,
  entryContainerMaterialized: false,
  carrierInstanceMaterialized: false,
  opaqueStateHandleGenerated: false,
  continuationStateStored: false,
  registryOperationInvoked: false,
  registryLookupExecuted: false,
  registryReleaseExecuted: false,
  rawStateSerialized: false,
  rawStateExported: false,
  executableReferencesSerialized: false,
  executableReferencesExported: false,
  resumeSurfaceInvoked: false,
  activeExecuteHandlerInvoked: false,
  repositoryOperationInvoked: false,
  credentialSourceBound: false,
  credentialReadExecuted: false,
  rpcExecuted: false,
  networkExecuted: false,
  stagingReadExecuted: false,
  stagingMutationExecuted: false,
  migrationApplied: false,
  runtimeBindingImplemented: false,
  runtimeActivated: false,
  productionChanged: false,
  b02brContractChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority: config.authority
};

const certification = implementation.evaluateBoundaryCertification(proof);
assert.strictEqual(certification.ready, true);
assert.deepStrictEqual(certification.blockers, []);
assert.strictEqual(certification.attachmentCapableTargetImplementationMaterialized, true);
assert.strictEqual(certification.attachmentCapableTargetMaterialized, false);
assert.match(certification.nextAction, /materialization_readiness/);

const forbiddenMaterialization = implementation.evaluateBoundaryCertification({
  ...proof,
  attachmentCapableTargetMaterialized: true
});
assert.strictEqual(forbiddenMaterialization.ready, false);
assert(
  forbiddenMaterialization.blockers.some((blocker) =>
    blocker.includes('attachmentCapableTargetMaterialized'))
);

const forbiddenAttachment = implementation.evaluateBoundaryCertification({
  ...proof,
  operationMethodsAttachedToInstance: true
});
assert.strictEqual(forbiddenAttachment.ready, false);

const forbiddenSensitiveAuthority = implementation.evaluateBoundaryCertification({
  ...proof,
  authority: {
    ...config.authority,
    networkAuthority: true
  }
});
assert.strictEqual(forbiddenSensitiveAuthority.ready, false);

console.log('COM-B02BS attachment-capable target implementation: PASS');
