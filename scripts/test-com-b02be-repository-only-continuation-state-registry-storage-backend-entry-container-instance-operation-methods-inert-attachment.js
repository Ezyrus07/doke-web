'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const inertAttachment = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment');
const readiness = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-materialization-readiness');
const config = require('../config/com-b02be-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment.json');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment.js');

assert.strictEqual(inertAttachment.CONTRACT_ID, 'com-b02be-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-inert-attachment-v1');
assert.strictEqual(inertAttachment.BOUNDARY_ID, 'COM-B02BE');
assert.strictEqual(inertAttachment.PREDECESSOR_CONTRACT_ID, readiness.CONTRACT_ID);
assert.strictEqual(inertAttachment.PREDECESSOR_HEAD, '03084aff2a2daded34c015fa5c0966d4c7ad5bc8');
assert.strictEqual(inertAttachment.PREDECESSOR_TREE, '174c266fa5ddd7bba45c5f6bae85fc0ebf307ebf');
assert.strictEqual(inertAttachment.PREDECESSOR_CERTIFICATION_RUN_ID, 32534648274);
assert.strictEqual(inertAttachment.PREDECESSOR_CERTIFICATION_JOB_ID, 96933152487);

const predecessor = readiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentMaterializationReadiness();
const created = inertAttachment.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachment();
const description = inertAttachment.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachment();

assert.strictEqual(Object.isFrozen(created), true);
assert.strictEqual(Object.isFrozen(description), true);
assert.strictEqual(description.contractId, inertAttachment.CONTRACT_ID);
assert.strictEqual(description.boundaryId, 'COM-B02BE');
assert.strictEqual(description.predecessorContractId, readiness.CONTRACT_ID);
assert.strictEqual(description.predecessorMaterializationReadinessMaterialized, true);
assert.strictEqual(description.entryContainerInstanceOperationMethodsAttachmentMaterializationReadinessMaterialized, true);
assert.strictEqual(description.entryContainerInstanceOperationMethodsInertAttachmentMaterialized, true);
assert.strictEqual(description.operationMethodsInertAttachmentMetadataOnly, true);
assert.strictEqual(description.attachmentObjectFrozen, true);
assert.strictEqual(description.descriptorOnly, true);
assert.strictEqual(description.callable, false);
assert.strictEqual(description.entryContainerInstanceMaterialized, true);
assert.strictEqual(description.entryContainerInstanceInert, true);
assert.strictEqual(description.entryContainerInstanceMetadataOnly, true);
assert.strictEqual(description.storageBackendInstanceMaterialized, true);
assert.strictEqual(description.storageBackendInstanceInert, true);
assert.deepStrictEqual(description.routeNames, predecessor.routeNames);
assert.deepStrictEqual(description.requiredOperationNames, predecessor.requiredOperationNames);
assert.deepStrictEqual(description.operationMethodAttachmentRequirements, predecessor.operationMethodAttachmentRequirements);
assert.deepStrictEqual(description.operationMethodSignatures, predecessor.operationMethodSignatures);
assert.deepStrictEqual(description.operationMethodAttachmentMaterializationRequirements, predecessor.operationMethodAttachmentMaterializationRequirements);
assert.deepStrictEqual(description.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);

for (const key of [
  'storageBackendMaterialized', 'entryContainerMaterialized', 'operationMethodsAttachedToInstance',
  'attachmentAppliedToEntryContainerInstance', 'executableMethodReferenceMaterialized',
  'carrierInstanceMaterialized', 'opaqueStateHandleGenerated', 'continuationStateStored',
  'registryOperationInvoked', 'registryLookupExecuted', 'registryReleaseExecuted',
  'rawStateSerialized', 'rawStateExported', 'executableReferencesSerialized',
  'executableReferencesExported', 'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked',
  'repositoryOperationInvoked', 'credentialSourceBound', 'credentialReadExecuted',
  'rpcExecuted', 'networkExecuted', 'stagingReadExecuted', 'stagingMutationExecuted',
  'migrationApplied', 'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
]) assert.strictEqual(description[key], false, `${key} must remain false`);

assert.strictEqual(config.authorization.type, 'general_repository_only_chat_authority');
assert.strictEqual(config.authorization.reusable, true);
assert.strictEqual(config.authorization.forcePushAuthorized, false);
assert.strictEqual(
  config.authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsInertAttachmentMaterializationAuthority,
  true
);
assert.strictEqual(config.authority.operationMethodsInertAttachmentMaterializationAuthority, true);

const prohibitedAuthorityKeys = [
  'operationMethodsAttachmentAuthority', 'entryContainerMaterializationAuthority',
  'storageBackendMaterializationAuthority', 'opaqueContinuationCarrierInstanceAuthority',
  'opaqueStateHandleGenerationAuthority', 'continuationStateStorageAuthority',
  'registryOperationInvocationAuthority', 'registryLookupAuthority', 'registryReleaseAuthority',
  'resumeSurfaceInvocationAuthority', 'activeExecuteHandlerInvocationAuthority',
  'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority', 'routeRegistryMutationAuthority',
  'moduleRouteLoaderMutationAuthority', 'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority',
  'credentialReadAuthority', 'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
  'stagingTrafficAuthority', 'migrationApplicationAuthority', 'runtimeActivationAuthority',
  'productionAuthority', 'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
];
for (const key of prohibitedAuthorityKeys) assert.strictEqual(config.authority[key], false, `${key} must remain false`);

const packet = {
  predecessorContractId: readiness.CONTRACT_ID,
  predecessorHead: inertAttachment.PREDECESSOR_HEAD,
  predecessorTree: inertAttachment.PREDECESSOR_TREE,
  b02bdCertificationRunId: inertAttachment.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02bdCertificationJobId: inertAttachment.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorMaterializationReadinessMaterialized: true,
  entryContainerInstanceOperationMethodsInertAttachmentMaterialized: true,
  operationMethodsInertAttachmentMetadataOnly: true,
  attachmentObjectFrozen: true,
  materializationRequirementsPreserved: true,
  operationMethodSignaturesPreserved: true,
  operationMethodAttachmentRequirementsPreserved: true,
  requiredOperationNamesPreserved: true,
  allThreeCommandRoutesCovered: true,
  entryContainerInstanceRemainsInert: true,
  storageBackendInstanceRemainsInert: true,
  descriptorOnly: true,
  storageBackendMaterialized: false,
  entryContainerMaterialized: false,
  operationMethodsAttachedToInstance: false,
  attachmentAppliedToEntryContainerInstance: false,
  executableMethodReferenceMaterialized: false,
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
  b02bdReadinessChanged: false,
  b02bcImplementationChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
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
  authority: config.authority
};

const certified = inertAttachment.evaluateBoundaryCertification(packet);
assert.strictEqual(Object.isFrozen(certified), true);
assert.strictEqual(certified.ready, true);
assert.deepStrictEqual(certified.blockers, []);
assert.strictEqual(certified.entryContainerInstanceOperationMethodsInertAttachmentMaterialized, true);
assert.strictEqual(certified.operationMethodsInertAttachmentMetadataOnly, true);
assert.strictEqual(certified.operationMethodsAttachedToInstance, false);
assert.strictEqual(certified.attachmentAppliedToEntryContainerInstance, false);
assert.strictEqual(certified.executableMethodReferenceMaterialized, false);
assert.strictEqual(certified.r5iCreationAuthority, false);

const actualAttachmentLeak = inertAttachment.evaluateBoundaryCertification({ ...packet, operationMethodsAttachedToInstance: true });
assert.strictEqual(actualAttachmentLeak.ready, false);
assert(actualAttachmentLeak.blockers.includes('B02BE_ACTUAL_OPERATION_METHOD_ATTACHMENT_PROHIBITED'));

const executableReferenceLeak = inertAttachment.evaluateBoundaryCertification({ ...packet, executableMethodReferenceMaterialized: true });
assert.strictEqual(executableReferenceLeak.ready, false);
assert(executableReferenceLeak.blockers.includes('B02BE_EXECUTABLE_METHOD_REFERENCE_PROHIBITED'));

const authorityLeak = inertAttachment.evaluateBoundaryCertification({
  ...packet,
  authority: { ...config.authority, operationMethodsAttachmentAuthority: true }
});
assert.strictEqual(authorityLeak.ready, false);
assert(authorityLeak.blockers.includes('PROHIBITED_AUTHORITY_MUST_BE_FALSE:operationMethodsAttachmentAuthority'));

const badLineage = inertAttachment.evaluateBoundaryCertification({ ...packet, predecessorHead: 'invalid' });
assert.strictEqual(badLineage.ready, false);
assert(badLineage.blockers.includes('B02BD_CERTIFIED_HEAD_REQUIRED'));

const source = fs.readFileSync(TARGET, 'utf8');
for (const forbidden of [
  /new\s+(?:Map|WeakMap|Set|WeakSet)\s*\(/,
  /randomUUID\s*\(/,
  /randomBytes\s*\(/,
  /createClient\s*\(/,
  /\.rpc\s*\(/,
  /\.from\s*\(/,
  /fetch\s*\(/,
  /process\.env/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /\.registerOpaqueContinuationState\s*\(/,
  /\.resolveOpaqueContinuationState\s*\(/,
  /\.releaseOpaqueContinuationState\s*\(/
]) assert.strictEqual(forbidden.test(source), false, `forbidden source pattern: ${forbidden}`);

assert.strictEqual(config.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
assert.strictEqual(config.functionalCheckpoint.exactRootCauseProven, false);
assert.strictEqual(config.functionalCheckpoint.r5iCreated, false);
assert.strictEqual(config.functionalCheckpoint.r5iInferred, false);

console.log('COM-B02BE repository-only operation methods inert attachment: PASS');
