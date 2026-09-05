'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const readiness = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-materialization-readiness');
const implementation = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-implementation');
const config = require('../config/com-b02ay-repository-only-continuation-state-registry-storage-backend-entry-container-instance-materialization-readiness.json');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-materialization-readiness.js');

assert.strictEqual(readiness.CONTRACT_ID, 'com-b02ay-repository-only-continuation-state-registry-storage-backend-entry-container-instance-materialization-readiness-v1');
assert.strictEqual(readiness.BOUNDARY_ID, 'COM-B02AY');
assert.strictEqual(readiness.PREDECESSOR_CONTRACT_ID, implementation.CONTRACT_ID);
assert.strictEqual(readiness.PREDECESSOR_HEAD, 'b590e1351aeafe32c5b84986c0ef0f1751d47ed2');
assert.strictEqual(readiness.PREDECESSOR_TREE, 'f387b003a52a6120da0e6eeab87c319357f31d72');
assert.strictEqual(readiness.PREDECESSOR_CERTIFICATION_RUN_ID, 32490094960);
assert.strictEqual(readiness.PREDECESSOR_CERTIFICATION_JOB_ID, 96795468361);

const predecessor = implementation.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceImplementation();
const description = readiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceMaterializationReadiness();

assert.strictEqual(Object.isFrozen(description), true);
assert.strictEqual(description.contractId, readiness.CONTRACT_ID);
assert.strictEqual(description.boundaryId, 'COM-B02AY');
assert.strictEqual(description.predecessorContractId, implementation.CONTRACT_ID);
assert.strictEqual(description.predecessorInstanceImplementationMaterialized, true);
assert.strictEqual(description.entryContainerInstanceImplementationMaterialized, true);
assert.strictEqual(description.entryContainerInstanceOperationDescriptorImplementationMaterialized, true);
assert.strictEqual(description.entryContainerInstanceMaterializationReadinessMaterialized, true);
assert.strictEqual(description.entryContainerInstanceMaterializationRequirementsDefined, true);
assert.strictEqual(description.operationDescriptorsOnly, true);
assert.strictEqual(description.descriptorOnly, true);
assert.strictEqual(description.storageBackendInstanceMaterialized, true);
assert.strictEqual(description.storageBackendInstanceInert, true);
assert.deepStrictEqual(description.routeNames, predecessor.routeNames);
assert.deepStrictEqual(description.requiredOperationNames, predecessor.requiredOperationNames);
assert.deepStrictEqual(description.entryContainerRequirements, predecessor.entryContainerRequirements);
assert.deepStrictEqual(description.entryContainerInstanceRequirements, predecessor.entryContainerInstanceRequirements);
assert.deepStrictEqual(description.entryContainerInstanceMaterializationRequirements, readiness.ENTRY_CONTAINER_INSTANCE_MATERIALIZATION_REQUIREMENTS);
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

for (const key of [
  'storageBackendMaterialized', 'entryContainerInstanceMaterialized', 'entryContainerMaterialized',
  'operationMethodsAttachedToInstance', 'carrierInstanceMaterialized', 'opaqueStateHandleGenerated',
  'continuationStateStored', 'registryOperationInvoked', 'registryLookupExecuted',
  'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
  'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
  'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'credentialSourceBound',
  'credentialReadExecuted', 'rpcExecuted', 'networkExecuted', 'stagingReadExecuted',
  'stagingMutationExecuted', 'migrationApplied', 'runtimeBindingImplemented',
  'runtimeActivated', 'productionChanged'
]) assert.strictEqual(description[key], false, `${key} must remain false`);

assert.strictEqual(config.authorization.type, 'general_repository_only_chat_authority');
assert.strictEqual(config.authorization.reusable, true);
assert.strictEqual(config.authorization.forcePushAuthorized, false);
assert.strictEqual(
  config.authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceMaterializationReadinessAuthority,
  true
);

const prohibitedAuthorityKeys = [
  'entryContainerInstanceMaterializationAuthority', 'entryContainerMaterializationAuthority',
  'storageBackendMaterializationAuthority', 'operationMethodsAttachmentAuthority',
  'opaqueContinuationCarrierInstanceAuthority', 'opaqueStateHandleGenerationAuthority',
  'continuationStateStorageAuthority', 'registryOperationInvocationAuthority',
  'registryLookupAuthority', 'registryReleaseAuthority', 'resumeSurfaceInvocationAuthority',
  'activeExecuteHandlerInvocationAuthority', 'repositoryOperationInvocationAuthority',
  'runtimeBindingAuthority', 'routeRegistryMutationAuthority', 'moduleRouteLoaderMutationAuthority',
  'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority', 'credentialReadAuthority',
  'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
  'stagingTrafficAuthority', 'migrationApplicationAuthority', 'runtimeActivationAuthority',
  'productionAuthority', 'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
];
for (const key of prohibitedAuthorityKeys) assert.strictEqual(config.authority[key], false, `${key} must remain false`);

const packet = {
  predecessorContractId: implementation.CONTRACT_ID,
  predecessorHead: readiness.PREDECESSOR_HEAD,
  predecessorTree: readiness.PREDECESSOR_TREE,
  b02axCertificationRunId: readiness.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02axCertificationJobId: readiness.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorInstanceImplementationMaterialized: true,
  entryContainerInstanceMaterializationReadinessMaterialized: true,
  entryContainerInstanceMaterializationRequirementsDefined: true,
  entryContainerInstanceOperationDescriptorImplementationMaterialized: true,
  entryContainerRequirementsPreserved: true,
  entryContainerInstanceRequirementsPreserved: true,
  requiredOperationNamesPreserved: true,
  allThreeCommandRoutesCovered: true,
  storageBackendInstanceRemainsInert: true,
  operationDescriptorsOnly: true,
  descriptorOnly: true,
  storageBackendMaterialized: false,
  entryContainerInstanceMaterialized: false,
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

const certified = readiness.evaluateBoundaryCertification(packet);
assert.strictEqual(Object.isFrozen(certified), true);
assert.strictEqual(certified.ready, true);
assert.deepStrictEqual(certified.blockers, []);
assert.strictEqual(certified.entryContainerInstanceMaterializationReadinessMaterialized, true);
assert.strictEqual(certified.entryContainerInstanceMaterialized, false);
assert.strictEqual(certified.entryContainerMaterialized, false);
assert.strictEqual(certified.r5iCreationAuthority, false);

const materializationLeak = readiness.evaluateBoundaryCertification({
  ...packet,
  entryContainerInstanceMaterialized: true
});
assert.strictEqual(materializationLeak.ready, false);
assert(materializationLeak.blockers.includes('PROHIBITED_ENTRY_CONTAINER_INSTANCE_EFFECT_MUST_REMAIN_FALSE:entryContainerInstanceMaterialized'));

const authorityLeak = readiness.evaluateBoundaryCertification({
  ...packet,
  authority: { ...config.authority, entryContainerInstanceMaterializationAuthority: true }
});
assert.strictEqual(authorityLeak.ready, false);
assert(authorityLeak.blockers.includes('PROHIBITED_AUTHORITY_MUST_BE_FALSE:entryContainerInstanceMaterializationAuthority'));

const badLineage = readiness.evaluateBoundaryCertification({ ...packet, predecessorHead: 'invalid' });
assert.strictEqual(badLineage.ready, false);
assert(badLineage.blockers.includes('B02AX_CERTIFIED_HEAD_REQUIRED'));

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

console.log('COM-B02AY repository-only entry container instance materialization readiness: PASS');
