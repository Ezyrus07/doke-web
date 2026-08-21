'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const instanceBoundary = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-inert-instance');
const readiness = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-materialization-readiness');
const config = require('../config/com-b02az-repository-only-continuation-state-registry-storage-backend-entry-container-inert-instance.json');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-inert-instance.js');

assert.strictEqual(instanceBoundary.CONTRACT_ID, 'com-b02az-repository-only-continuation-state-registry-storage-backend-entry-container-inert-instance-v1');
assert.strictEqual(instanceBoundary.BOUNDARY_ID, 'COM-B02AZ');
assert.strictEqual(instanceBoundary.PREDECESSOR_CONTRACT_ID, readiness.CONTRACT_ID);
assert.strictEqual(instanceBoundary.PREDECESSOR_HEAD, 'feebb2f6a4b041de1c040bc8ed7022d4e7b3f7ae');
assert.strictEqual(instanceBoundary.PREDECESSOR_TREE, 'dc104b5f5fefdda165469ff8581586d62fbc393f');
assert.strictEqual(instanceBoundary.PREDECESSOR_CERTIFICATION_RUN_ID, 32491484764);
assert.strictEqual(instanceBoundary.PREDECESSOR_CERTIFICATION_JOB_ID, 96799942211);
assert.strictEqual(instanceBoundary.ENTRY_CONTAINER_INSTANCE_ID, 'repository_only_process_local_continuation_state_entry_container_instance_v1');

const predecessor = readiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceMaterializationReadiness();
const instance = instanceBoundary.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstance();
const description = instanceBoundary.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstance();

assert.strictEqual(Object.isFrozen(instance), true);
assert.strictEqual(Object.isFrozen(description), true);
assert.strictEqual(instance.contractId, instanceBoundary.CONTRACT_ID);
assert.strictEqual(instance.boundaryId, 'COM-B02AZ');
assert.strictEqual(instance.predecessorContractId, readiness.CONTRACT_ID);
assert.strictEqual(instance.instanceId, instanceBoundary.ENTRY_CONTAINER_INSTANCE_ID);
assert.strictEqual(instance.predecessorMaterializationReadinessMaterialized, true);
assert.strictEqual(instance.entryContainerInstanceMaterialized, true);
assert.strictEqual(instance.entryContainerInstanceInert, true);
assert.strictEqual(instance.entryContainerInstanceMetadataOnly, true);
assert.strictEqual(description.instanceObjectFrozen, true);
assert.strictEqual(Array.isArray(description.instanceSurfaceKeys), true);
assert.strictEqual(instance.storageBackendInstanceMaterialized, true);
assert.strictEqual(instance.storageBackendInstanceInert, true);
assert.deepStrictEqual(instance.routeNames, predecessor.routeNames);
assert.deepStrictEqual(instance.requiredOperationNames, predecessor.requiredOperationNames);
assert.deepStrictEqual(instance.entryContainerRequirements, predecessor.entryContainerRequirements);
assert.deepStrictEqual(instance.entryContainerInstanceRequirements, predecessor.entryContainerInstanceRequirements);
assert.deepStrictEqual(instance.entryContainerInstanceMaterializationRequirements, predecessor.entryContainerInstanceMaterializationRequirements);
assert.deepStrictEqual(instance.routeNames, [
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);
assert.deepStrictEqual(instance.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);

for (const key of [
  'storageBackendMaterialized', 'entryContainerMaterialized', 'operationMethodsAttachedToInstance',
  'carrierInstanceMaterialized', 'opaqueStateHandleGenerated', 'continuationStateStored',
  'registryOperationInvoked', 'registryLookupExecuted', 'registryReleaseExecuted',
  'rawStateSerialized', 'rawStateExported', 'executableReferencesSerialized',
  'executableReferencesExported', 'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked',
  'repositoryOperationInvoked', 'credentialSourceBound', 'credentialReadExecuted',
  'rpcExecuted', 'networkExecuted', 'stagingReadExecuted', 'stagingMutationExecuted',
  'migrationApplied', 'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
]) assert.strictEqual(instance[key], false, `${key} must remain false`);

assert.strictEqual(config.authorization.type, 'general_repository_only_chat_authority');
assert.strictEqual(config.authorization.reusable, true);
assert.strictEqual(config.authorization.forcePushAuthorized, false);
assert.strictEqual(config.authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceMaterializationAuthority, true);
assert.strictEqual(config.authority.entryContainerInstanceMaterializationAuthority, true);

for (const key of [
  'entryContainerMaterializationAuthority', 'storageBackendMaterializationAuthority',
  'operationMethodsAttachmentAuthority', 'opaqueContinuationCarrierInstanceAuthority',
  'opaqueStateHandleGenerationAuthority', 'continuationStateStorageAuthority',
  'registryOperationInvocationAuthority', 'registryLookupAuthority', 'registryReleaseAuthority',
  'resumeSurfaceInvocationAuthority', 'activeExecuteHandlerInvocationAuthority',
  'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority', 'routeRegistryMutationAuthority',
  'moduleRouteLoaderMutationAuthority', 'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority',
  'credentialReadAuthority', 'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
  'stagingTrafficAuthority', 'migrationApplicationAuthority', 'runtimeActivationAuthority',
  'productionAuthority', 'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
]) assert.strictEqual(config.authority[key], false, `${key} must remain false`);

const packet = {
  predecessorContractId: readiness.CONTRACT_ID,
  predecessorHead: instanceBoundary.PREDECESSOR_HEAD,
  predecessorTree: instanceBoundary.PREDECESSOR_TREE,
  b02ayCertificationRunId: instanceBoundary.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02ayCertificationJobId: instanceBoundary.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorMaterializationReadinessMaterialized: true,
  entryContainerInstanceMaterialized: true,
  entryContainerInstanceInert: true,
  entryContainerInstanceMetadataOnly: true,
  instanceObjectFrozen: true,
  entryContainerRequirementsPreserved: true,
  entryContainerInstanceRequirementsPreserved: true,
  materializationRequirementsPreserved: true,
  requiredOperationNamesPreserved: true,
  allThreeCommandRoutesCovered: true,
  storageBackendInstanceRemainsInert: true,
  storageBackendMaterialized: false,
  entryContainerMaterialized: false,
  operationMethodsAttachedToInstance: false,
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
  b02ayReadinessChanged: false,
  b02axImplementationChanged: false,
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

const certified = instanceBoundary.evaluateBoundaryCertification(packet);
assert.strictEqual(certified.ready, true);
assert.deepStrictEqual(certified.blockers, []);
assert.strictEqual(certified.entryContainerInstanceMaterialized, true);
assert.strictEqual(certified.entryContainerInstanceInert, true);
assert.strictEqual(certified.entryContainerInstanceMetadataOnly, true);
assert.strictEqual(certified.entryContainerMaterialized, false);
assert.strictEqual(certified.r5iCreationAuthority, false);

const containerLeak = instanceBoundary.evaluateBoundaryCertification({ ...packet, entryContainerMaterialized: true });
assert.strictEqual(containerLeak.ready, false);
assert(containerLeak.blockers.includes('B02AZ_ENTRY_CONTAINER_MATERIALIZATION_PROHIBITED'));

const methodsLeak = instanceBoundary.evaluateBoundaryCertification({ ...packet, operationMethodsAttachedToInstance: true });
assert.strictEqual(methodsLeak.ready, false);
assert(methodsLeak.blockers.includes('B02AZ_OPERATION_METHODS_PROHIBITED'));

const authorityLeak = instanceBoundary.evaluateBoundaryCertification({
  ...packet,
  authority: { ...config.authority, entryContainerMaterializationAuthority: true }
});
assert.strictEqual(authorityLeak.ready, false);
assert(authorityLeak.blockers.includes('PROHIBITED_AUTHORITY_MUST_BE_FALSE:entryContainerMaterializationAuthority'));

const badLineage = instanceBoundary.evaluateBoundaryCertification({ ...packet, predecessorHead: 'invalid' });
assert.strictEqual(badLineage.ready, false);
assert(badLineage.blockers.includes('B02AY_CERTIFIED_HEAD_REQUIRED'));

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

console.log('COM-B02AZ repository-only entry container inert instance: PASS');
