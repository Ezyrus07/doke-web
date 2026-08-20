'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const readiness = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-instance-readiness');
const implementation = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-implementation');
const config = require('../config/com-b02an-repository-only-continuation-state-registry-storage-backend-instance-readiness.json');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-instance-readiness.js');

assert.strictEqual(readiness.CONTRACT_ID, 'com-b02an-repository-only-continuation-state-registry-storage-backend-instance-readiness-v1');
assert.strictEqual(readiness.BOUNDARY_ID, 'COM-B02AN');
assert.strictEqual(readiness.PREDECESSOR_CONTRACT_ID, implementation.CONTRACT_ID);
assert.strictEqual(readiness.PREDECESSOR_HEAD, '47def929237e0526d54b6bcab02d495529c96810');
assert.strictEqual(readiness.PREDECESSOR_TREE, '1a279fd19dbd49b99135282aa55af8f14c2bb4ec');
assert.strictEqual(readiness.PREDECESSOR_CERTIFICATION_RUN_ID, 32429419069);
assert.strictEqual(readiness.PREDECESSOR_CERTIFICATION_JOB_ID, 96617865797);
assert.strictEqual(readiness.STORAGE_BACKEND_INSTANCE_KIND, 'repository_only_process_local_continuation_state_storage_backend_instance');

const predecessor = implementation.describeRepositoryOnlyContinuationStateRegistryStorageBackendImplementation();
const description = readiness.describeRepositoryOnlyContinuationStateRegistryStorageBackendInstanceReadiness();

assert.strictEqual(Object.isFrozen(description), true);
assert.strictEqual(description.contractId, readiness.CONTRACT_ID);
assert.strictEqual(description.boundaryId, 'COM-B02AN');
assert.strictEqual(description.predecessorContractId, implementation.CONTRACT_ID);
assert.strictEqual(description.predecessorStorageBackendImplementationMaterialized, true);
assert.strictEqual(description.storageBackendImplementationMaterialized, true);
assert.strictEqual(description.storageBackendInstanceReadinessMaterialized, true);
assert.strictEqual(description.storageBackendInstanceRequirementsDefined, true);
assert.strictEqual(description.operationDescriptorsOnly, true);
assert.deepStrictEqual(description.routeNames, predecessor.routeNames);
assert.deepStrictEqual(description.requiredOperationNames, predecessor.requiredOperationNames);
assert.deepStrictEqual(description.storageBackendRequirements, predecessor.storageBackendRequirements);
assert.deepStrictEqual(description.storageBackendInstanceRequirements, readiness.STORAGE_BACKEND_INSTANCE_REQUIREMENTS);
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
  'storageBackendInstanceMaterialized', 'storageBackendMaterialized', 'entryContainerMaterialized',
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
assert.strictEqual(config.authority.repositoryOnlyContinuationStateRegistryStorageBackendInstanceReadinessAuthority, true);

const prohibitedAuthorityKeys = [
  'storageBackendInstanceMaterializationAuthority', 'storageBackendMaterializationAuthority',
  'entryContainerMaterializationAuthority', 'operationMethodsAttachmentAuthority',
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
for (const key of prohibitedAuthorityKeys) {
  assert.strictEqual(config.authority[key], false, `${key} must remain false`);
}

const packet = {
  predecessorContractId: implementation.CONTRACT_ID,
  predecessorHead: readiness.PREDECESSOR_HEAD,
  predecessorTree: readiness.PREDECESSOR_TREE,
  b02amCertificationRunId: readiness.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02amCertificationJobId: readiness.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorStorageBackendImplementationMaterialized: true,
  storageBackendInstanceReadinessMaterialized: true,
  storageBackendInstanceRequirementsDefined: true,
  storageBackendRequirementsPreserved: true,
  requiredOperationNamesPreserved: true,
  allThreeCommandRoutesCovered: true,
  operationDescriptorsOnly: true,
  storageBackendInstanceMaterialized: false,
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
  b02amImplementationChanged: false,
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
assert.strictEqual(certified.storageBackendInstanceReadinessMaterialized, true);
assert.strictEqual(certified.storageBackendInstanceMaterialized, false);
assert.strictEqual(certified.entryContainerMaterialized, false);
assert.strictEqual(certified.r5iCreationAuthority, false);

const materializationLeak = readiness.evaluateBoundaryCertification({
  ...packet,
  storageBackendInstanceMaterialized: true
});
assert.strictEqual(materializationLeak.ready, false);
assert(materializationLeak.blockers.includes('PROHIBITED_EFFECT_MUST_REMAIN_FALSE:storageBackendInstanceMaterialized'));

const authorityLeak = readiness.evaluateBoundaryCertification({
  ...packet,
  authority: {
    ...config.authority,
    storageBackendInstanceMaterializationAuthority: true
  }
});
assert.strictEqual(authorityLeak.ready, false);
assert(authorityLeak.blockers.includes('PROHIBITED_AUTHORITY_MUST_BE_FALSE:storageBackendInstanceMaterializationAuthority'));

const badLineage = readiness.evaluateBoundaryCertification({
  ...packet,
  predecessorHead: 'invalid'
});
assert.strictEqual(badLineage.ready, false);
assert(badLineage.blockers.includes('B02AM_CERTIFIED_HEAD_REQUIRED'));

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

console.log('COM-B02AN repository-only storage backend instance readiness: PASS');
