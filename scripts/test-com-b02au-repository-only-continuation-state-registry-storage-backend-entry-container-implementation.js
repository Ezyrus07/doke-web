'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const boundary = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-implementation');
const config = require('../config/com-b02au-repository-only-continuation-state-registry-storage-backend-entry-container-implementation.json');

assert.equal(boundary.CONTRACT_ID, 'com-b02au-repository-only-continuation-state-registry-storage-backend-entry-container-implementation-v1');
assert.equal(boundary.BOUNDARY_ID, 'COM-B02AU');
assert.equal(boundary.PREDECESSOR_CONTRACT_ID, 'com-b02at-repository-only-continuation-state-registry-storage-backend-entry-container-contract-v1');
assert.equal(boundary.PREDECESSOR_HEAD, '53137be9ad8fb833d00ecec8575500e226f9c3e7');
assert.equal(boundary.PREDECESSOR_TREE, '6563df2ca3830271a49b74d2ff03a86078d25f95');
assert.equal(boundary.PREDECESSOR_CERTIFICATION_RUN_ID, 32481757003);
assert.equal(boundary.PREDECESSOR_CERTIFICATION_JOB_ID, 96769436432);

const implementation = boundary.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerImplementation();
assert.equal(Object.isFrozen(implementation), true);
assert.equal(implementation.predecessorContractMaterialized, true);
assert.equal(implementation.storageBackendInstanceMaterialized, true);
assert.equal(implementation.storageBackendInstanceInert, true);
assert.equal(implementation.entryContainerMaterializationReadinessMaterialized, true);
assert.equal(implementation.entryContainerContractMaterialized, true);
assert.equal(implementation.entryContainerImplementationMaterialized, true);
assert.equal(implementation.entryContainerImplementationDescriptorMaterialized, true);
assert.equal(implementation.descriptorOnly, true);
assert.equal(implementation.implementationKind, 'repository_only_process_local_entry_container_descriptor_v1');
assert.deepEqual(implementation.routeNames, [
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);
assert.deepEqual(implementation.requiredOperationNames, [
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
]) assert.equal(implementation[key], false, `implementation ${key} must remain false`);

const descriptor = boundary.createEntryContainerImplementationDescriptor();
assert.equal(Object.isFrozen(descriptor), true);
assert.equal(Object.values(descriptor).some((value) => typeof value === 'function'), false);
assert.equal(descriptor.descriptorOnly, true);
assert.equal(descriptor.entryContainerImplementationMaterialized, true);
assert.equal(descriptor.entryContainerMaterialized, false);
assert.equal(descriptor.operationMethodsAttachedToInstance, false);

const descriptorValidation = boundary.validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerImplementationDescriptor(descriptor);
assert.equal(descriptorValidation.valid, true);
assert.deepEqual(descriptorValidation.blockers, []);
assert.equal(descriptorValidation.entryContainerMaterialized, false);
assert.equal(descriptorValidation.registryOperationInvocationAuthority, false);
assert.equal(descriptorValidation.networkAuthority, false);

const descriptorWithExtraKey = { ...descriptor, unexpected: true };
const extraValidation = boundary.validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerImplementationDescriptor(descriptorWithExtraKey);
assert.equal(extraValidation.valid, false);
assert.ok(extraValidation.blockers.includes('EXACT_MINIMUM_ENTRY_CONTAINER_IMPLEMENTATION_DESCRIPTOR_REQUIRED'));

const descriptorWithMaterializationLeak = { ...descriptor, entryContainerMaterialized: true };
const leakValidation = boundary.validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerImplementationDescriptor(descriptorWithMaterializationLeak);
assert.equal(leakValidation.valid, false);
assert.ok(leakValidation.blockers.includes('PROHIBITED_ENTRY_CONTAINER_IMPLEMENTATION_FIELD_MUST_BE_FALSE:entryContainerMaterialized'));

const packet = {
  predecessorContractId: boundary.PREDECESSOR_CONTRACT_ID,
  predecessorHead: boundary.PREDECESSOR_HEAD,
  predecessorTree: boundary.PREDECESSOR_TREE,
  b02atCertificationRunId: boundary.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02atCertificationJobId: boundary.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorContractMaterialized: true,
  entryContainerImplementationMaterialized: true,
  entryContainerImplementationDescriptorMaterialized: true,
  descriptorOnly: true,
  entryContainerRequirementsPreserved: true,
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
  b02atContractChanged: false,
  b02arInstanceChanged: false,
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

const certification = boundary.evaluateBoundaryCertification(packet);
assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.entryContainerImplementationMaterialized, true);
assert.equal(certification.entryContainerMaterialized, false);
assert.equal(certification.operationMethodsAttachedToInstance, false);
assert.equal(certification.r5iCreationAuthority, false);

const badLineage = boundary.evaluateBoundaryCertification({ ...packet, predecessorHead: 'bad-head' });
assert.equal(badLineage.ready, false);
assert.ok(badLineage.blockers.includes('B02AT_CERTIFIED_HEAD_REQUIRED'));

const badAuthority = boundary.evaluateBoundaryCertification({
  ...packet,
  authority: { ...config.authority, entryContainerMaterializationAuthority: true }
});
assert.equal(badAuthority.ready, false);
assert.ok(badAuthority.blockers.includes('PROHIBITED_AUTHORITY_MUST_BE_FALSE:entryContainerMaterializationAuthority'));

assert.equal(config.predecessor.certifiedHead, boundary.PREDECESSOR_HEAD);
assert.equal(config.predecessor.certifiedTree, boundary.PREDECESSOR_TREE);
assert.equal(config.predecessor.certificationRunId, boundary.PREDECESSOR_CERTIFICATION_RUN_ID);
assert.equal(config.predecessor.certificationJobId, boundary.PREDECESSOR_CERTIFICATION_JOB_ID);
assert.equal(config.implementation.entryContainerImplementationMaterialized, true);
assert.equal(config.implementation.descriptorOnly, true);
assert.equal(config.implementation.entryContainerMaterialized, false);
assert.equal(config.authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerImplementationAuthority, true);
assert.equal(config.authority.entryContainerMaterializationAuthority, false);
assert.equal(config.authority.operationMethodsAttachmentAuthority, false);
assert.equal(config.authority.continuationStateStorageAuthority, false);
assert.equal(config.authority.registryOperationInvocationAuthority, false);
assert.equal(config.authority.networkAuthority, false);
assert.equal(config.authority.runtimeActivationAuthority, false);
assert.equal(config.authority.productionAuthority, false);
assert.equal(config.authority.r5iCreationAuthority, false);
assert.equal(config.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
assert.equal(config.functionalCheckpoint.exactRootCauseProven, false);
assert.equal(config.functionalCheckpoint.causalPromotionAllowed, false);
assert.equal(config.functionalCheckpoint.privatePresencePromotionAllowed, false);
assert.equal(config.functionalCheckpoint.r5iCreated, false);
assert.equal(config.functionalCheckpoint.r5iInferred, false);

const source = fs.readFileSync(path.resolve(__dirname, '../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-implementation.js'), 'utf8');
for (const pattern of [
  /new\s+(Map|WeakMap|Set|WeakSet)\s*\(/,
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
]) assert.equal(pattern.test(source), false, `hard-block source pattern observed: ${pattern}`);

console.log('COM-B02AU repository-only entry container descriptor implementation checks passed.');
