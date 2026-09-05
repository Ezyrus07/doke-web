'use strict';

const assert = require('assert');
const readiness = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-post-implementation-materialization-readiness');
const config = require('../config/com-b02bt-repository-only-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-post-implementation-materialization-readiness.json');

const description = readiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetMaterializationReadiness();

assert.strictEqual(description.contractId, readiness.CONTRACT_ID);
assert.strictEqual(description.boundaryId, 'COM-B02BT');
assert.strictEqual(description.predecessorHead, '0223287ce2e64885e2914be203ca3cd8cdcd28f6');
assert.strictEqual(description.predecessorTree, 'ece4b8d5bb0584ccacd5cbf9888b6362402d135c');
assert.strictEqual(description.rootCause, 'FROZEN_NON_EXTENSIBLE_ENTRY_CONTAINER_INSTANCE_REQUIRES_ATTACHMENT_CAPABLE_SUCCESSOR_MATERIALIZATION');
for (const key of [
  'predecessorImplementationCertified',
  'implementationFactoryExported',
  'implementationFactoryInvocationRequiredForFutureMaterialization',
  'futureMaterializationRequiresSeparateExplicitAuthority',
  'futureTargetIdentityDistinctFromFrozenSourceRequired',
  'futureTargetExtensibilityRequired',
  'futureTargetOperationMethodSlotsInitiallyEmptyRequired',
  'boundExecutableReferencesExternalUntilSeparateAttachmentAuthority',
  'attachmentCapableTargetImplementationMaterialized',
  'attachmentCapableTargetMaterializationReadinessMaterialized',
  'attachmentCapableTargetMaterializationRequirementsDefined',
  'attachmentCapableTargetMaterializationReady'
]) assert.strictEqual(description[key], true, `${key} must be true`);
assert.strictEqual(description.implementationFactoryInvokedByBoundary, false);

for (const key of [
  'attachmentCapableTargetMaterialized', 'attachmentCapableTargetExtensible',
  'attachmentCapableTargetOperationMethodsPresent', 'attachmentAppliedToEntryContainerInstance',
  'operationMethodsAttachedToInstance', 'executableOperationMethodsInvoked',
  'storageBackendMaterialized', 'entryContainerMaterialized', 'carrierInstanceMaterialized',
  'opaqueStateHandleGenerated', 'continuationStateStored', 'registryOperationInvoked',
  'registryLookupExecuted', 'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
  'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
  'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'credentialSourceBound',
  'credentialReadExecuted', 'rpcExecuted', 'networkExecuted', 'stagingReadExecuted',
  'stagingMutationExecuted', 'migrationApplied', 'runtimeBindingImplemented', 'runtimeActivated',
  'productionChanged'
]) assert.strictEqual(description[key], false, `${key} must remain false`);

const packet = {
  predecessorContractId: readiness.PREDECESSOR_CONTRACT_ID,
  predecessorHead: readiness.PREDECESSOR_HEAD,
  predecessorTree: readiness.PREDECESSOR_TREE,
  b02bsCertificationRunId: readiness.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02bsCertificationJobId: readiness.PREDECESSOR_CERTIFICATION_JOB_ID,
  rootCause: readiness.ROOT_CAUSE,
  predecessorImplementationCertified: true,
  implementationFactoryExported: true,
  implementationFactoryInvocationRequiredForFutureMaterialization: true,
  implementationFactoryInvokedByBoundary: false,
  futureMaterializationRequiresSeparateExplicitAuthority: true,
  futureTargetIdentityDistinctFromFrozenSourceRequired: true,
  futureTargetExtensibilityRequired: true,
  futureTargetOperationMethodSlotsInitiallyEmptyRequired: true,
  boundExecutableReferencesExternalUntilSeparateAttachmentAuthority: true,
  attachmentCapableTargetImplementationMaterialized: true,
  attachmentCapableTargetMaterializationReadinessMaterialized: true,
  attachmentCapableTargetMaterializationRequirementsDefined: true,
  attachmentCapableTargetMaterializationReady: true,
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
  b02bsImplementationChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority: config.authority
};

const certification = readiness.evaluateBoundaryCertification(packet);
assert.strictEqual(certification.ready, true);
assert.deepStrictEqual(certification.blockers, []);
assert.strictEqual(certification.attachmentCapableTargetMaterializationReadinessMaterialized, true);
assert.strictEqual(certification.attachmentCapableTargetMaterializationReady, true);
assert.strictEqual(certification.attachmentCapableTargetMaterialized, false);
assert.strictEqual(certification.operationMethodsAttachedToInstance, false);
assert.strictEqual(certification.executableOperationMethodsInvoked, false);

const forbiddenMaterialization = readiness.evaluateBoundaryCertification({ ...packet, attachmentCapableTargetMaterialized: true });
assert.strictEqual(forbiddenMaterialization.ready, false);
const forbiddenInvocation = readiness.evaluateBoundaryCertification({ ...packet, implementationFactoryInvokedByBoundary: true });
assert.strictEqual(forbiddenInvocation.ready, false);

console.log('COM-B02BT repository-only attachment-capable target post-implementation materialization readiness: PASS');
