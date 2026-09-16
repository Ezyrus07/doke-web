'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const instance = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-instance');
const readiness = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-instance-materialization-readiness');
const config = require('../config/com-b02ar-repository-only-continuation-state-registry-storage-backend-instance.json');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-instance.js');

assert.strictEqual(instance.CONTRACT_ID, 'com-b02ar-repository-only-continuation-state-registry-storage-backend-instance-v1');
assert.strictEqual(instance.BOUNDARY_ID, 'COM-B02AR');
assert.strictEqual(instance.PREDECESSOR_CONTRACT_ID, readiness.CONTRACT_ID);
assert.strictEqual(instance.PREDECESSOR_HEAD, '2aedca59db41a54c20ec7bc49f6f8d73da6cc369');
assert.strictEqual(instance.PREDECESSOR_TREE, 'f780600d87653b2a94b0e30f1349b252d71f978b');
assert.strictEqual(instance.PREDECESSOR_CERTIFICATION_RUN_ID, 32435461721);
assert.strictEqual(instance.PREDECESSOR_CERTIFICATION_JOB_ID, 96635658213);
assert.strictEqual(instance.STORAGE_BACKEND_INSTANCE_ID, 'repository_only_process_local_continuation_state_storage_backend_instance_v1');

const predecessor = readiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendInstanceMaterializationReadiness();
const materialized = instance.createRepositoryOnlyContinuationStateRegistryStorageBackendInstance();
const description = instance.describeRepositoryOnlyContinuationStateRegistryStorageBackendInstance();

assert.strictEqual(Object.isFrozen(materialized), true);
assert.strictEqual(Object.isFrozen(description), true);
assert.strictEqual(description.contractId, instance.CONTRACT_ID);
assert.strictEqual(description.boundaryId, 'COM-B02AR');
assert.strictEqual(description.predecessorContractId, readiness.CONTRACT_ID);
assert.strictEqual(description.predecessorMaterializationReadinessMaterialized, true);
assert.strictEqual(description.storageBackendInstanceMaterialized, true);
assert.strictEqual(description.storageBackendInstanceInert, true);
assert.strictEqual(description.instanceObjectFrozen, true);
assert.strictEqual(description.instanceId, instance.STORAGE_BACKEND_INSTANCE_ID);
assert.deepStrictEqual(description.routeNames, predecessor.routeNames);
assert.deepStrictEqual(description.requiredOperationNames, predecessor.requiredOperationNames);
assert.deepStrictEqual(description.storageBackendRequirements, predecessor.storageBackendRequirements);
assert.deepStrictEqual(description.storageBackendInstanceRequirements, predecessor.storageBackendInstanceRequirements);
assert.deepStrictEqual(
  description.storageBackendInstanceMaterializationRequirements,
  predecessor.storageBackendInstanceMaterializationRequirements
);
assert.deepStrictEqual(description.routeNames, [
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);
assert.deepStrictEqual(description.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
assert.strictEqual(Object.values(materialized).some((value) => typeof value === 'function'), false);

for (const key of [
  'storageBackendMaterialized', 'entryContainerMaterialized', 'operationMethodsAttachedToInstance',
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
assert.strictEqual(config.authority.repositoryOnlyContinuationStateRegistryStorageBackendInstanceMaterializationAuthority, true);
assert.strictEqual(config.authority.storageBackendInstanceMaterializationAuthority, true);

const prohibitedAuthorityKeys = [
  'storageBackendMaterializationAuthority', 'entryContainerMaterializationAuthority',
  'operationMethodsAttachmentAuthority', 'opaqueContinuationCarrierInstanceAuthority',
  'opaqueStateHandleGenerationAuthority', 'continuationStateStorageAuthority',
  'registryOperationInvocationAuthority', 'registryLookupAuthority', 'registryReleaseAuthority',
  'resumeSurfaceInvocationAuthority', 'activeExecuteHandlerInvocationAuthority',
  'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority',
  'routeRegistryMutationAuthority', 'moduleRouteLoaderMutationAuthority',
  'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority', 'credentialReadAuthority',
  'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
  'stagingTrafficAuthority', 'migrationApplicationAuthority', 'runtimeActivationAuthority',
  'productionAuthority', 'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
];
for (const key of prohibitedAuthorityKeys) {
  assert.strictEqual(config.authority[key], false, `${key} must remain false`);
}

const packet = {
  predecessorContractId: readiness.CONTRACT_ID,
  predecessorHead: instance.PREDECESSOR_HEAD,
  predecessorTree: instance.PREDECESSOR_TREE,
  b02aqCertificationRunId: instance.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02aqCertificationJobId: instance.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorMaterializationReadinessMaterialized: true,
  storageBackendInstanceMaterialized: true,
  storageBackendInstanceInert: true,
  instanceObjectFrozen: true,
  storageBackendInstanceRequirementsPreserved: true,
  materializationRequirementsPreserved: true,
  requiredOperationNamesPreserved: true,
  allThreeCommandRoutesCovered: true,
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
  b02aqReadinessChanged: false,
  b02apImplementationChanged: false,
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

const certified = instance.evaluateBoundaryCertification(packet);
assert.strictEqual(Object.isFrozen(certified), true);
assert.strictEqual(certified.ready, true);
assert.deepStrictEqual(certified.blockers, []);
assert.strictEqual(certified.storageBackendInstanceMaterialized, true);
assert.strictEqual(certified.storageBackendInstanceInert, true);
assert.strictEqual(certified.entryContainerMaterialized, false);
assert.strictEqual(certified.r5iCreationAuthority, false);

const containerLeak = instance.evaluateBoundaryCertification({
  ...packet,
  entryContainerMaterialized: true
});
assert.strictEqual(containerLeak.ready, false);
assert(containerLeak.blockers.includes('B02AR_ENTRY_CONTAINER_PROHIBITED'));

const authorityLeak = instance.evaluateBoundaryCertification({
  ...packet,
  authority: {
    ...config.authority,
    operationMethodsAttachmentAuthority: true
  }
});
assert.strictEqual(authorityLeak.ready, false);
assert(authorityLeak.blockers.includes('PROHIBITED_AUTHORITY_MUST_BE_FALSE:operationMethodsAttachmentAuthority'));

const badLineage = instance.evaluateBoundaryCertification({
  ...packet,
  predecessorHead: 'invalid'
});
assert.strictEqual(badLineage.ready, false);
assert(badLineage.blockers.includes('B02AQ_CERTIFIED_HEAD_REQUIRED'));

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

console.log('COM-B02AR repository-only storage backend inert instance: PASS');
