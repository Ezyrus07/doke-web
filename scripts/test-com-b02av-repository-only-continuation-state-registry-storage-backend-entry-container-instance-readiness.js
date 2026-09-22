'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const boundary = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-readiness');
const config = require('../config/com-b02av-repository-only-continuation-state-registry-storage-backend-entry-container-instance-readiness.json');

assert.equal(boundary.CONTRACT_ID, 'com-b02av-repository-only-continuation-state-registry-storage-backend-entry-container-instance-readiness-v1');
assert.equal(boundary.BOUNDARY_ID, 'COM-B02AV');
assert.equal(boundary.PREDECESSOR_CONTRACT_ID, 'com-b02au-repository-only-continuation-state-registry-storage-backend-entry-container-implementation-v1');
assert.equal(boundary.PREDECESSOR_HEAD, 'cef5e63d4bc965445b5a4dee44999fad4b75c728');
assert.equal(boundary.PREDECESSOR_TREE, '7b970d4a617d52bd334b69a2d9a8678f23dac6a8');
assert.equal(boundary.PREDECESSOR_CERTIFICATION_RUN_ID, 32482918198);
assert.equal(boundary.PREDECESSOR_CERTIFICATION_JOB_ID, 96773015469);

const readiness = boundary.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceReadiness();
assert.equal(Object.isFrozen(readiness), true);
assert.equal(readiness.predecessorEntryContainerImplementationMaterialized, true);
assert.equal(readiness.entryContainerMaterializationReadinessMaterialized, true);
assert.equal(readiness.entryContainerContractMaterialized, true);
assert.equal(readiness.entryContainerImplementationMaterialized, true);
assert.equal(readiness.entryContainerImplementationDescriptorMaterialized, true);
assert.equal(readiness.entryContainerInstanceReadinessMaterialized, true);
assert.equal(readiness.entryContainerInstanceRequirementsDefined, true);
assert.equal(readiness.descriptorOnly, true);
assert.equal(readiness.storageBackendInstanceMaterialized, true);
assert.equal(readiness.storageBackendInstanceInert, true);
assert.equal(readiness.entryContainerInstanceKind, 'repository_only_process_local_continuation_state_entry_container_instance');
assert.deepEqual(readiness.routeNames, [
  'communities.membership.command',
  'communities.governance.command',
  'communities.content.command'
]);
assert.deepEqual(readiness.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
assert.deepEqual(readiness.entryContainerInstanceRequirements, boundary.ENTRY_CONTAINER_INSTANCE_REQUIREMENTS);

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
]) assert.equal(readiness[key], false, `${key} must remain false`);

const packet = {
  predecessorContractId: boundary.PREDECESSOR_CONTRACT_ID,
  predecessorHead: boundary.PREDECESSOR_HEAD,
  predecessorTree: boundary.PREDECESSOR_TREE,
  b02auCertificationRunId: boundary.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02auCertificationJobId: boundary.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorEntryContainerImplementationMaterialized: true,
  entryContainerInstanceReadinessMaterialized: true,
  entryContainerInstanceRequirementsDefined: true,
  entryContainerRequirementsPreserved: true,
  requiredOperationNamesPreserved: true,
  allThreeCommandRoutesCovered: true,
  storageBackendInstanceRemainsInert: true,
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
  b02auImplementationChanged: false,
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
assert.equal(certification.entryContainerInstanceReadinessMaterialized, true);
assert.equal(certification.entryContainerInstanceMaterialized, false);
assert.equal(certification.entryContainerMaterialized, false);
assert.equal(certification.operationMethodsAttachedToInstance, false);
assert.equal(certification.r5iCreationAuthority, false);

const badLineage = boundary.evaluateBoundaryCertification({ ...packet, predecessorHead: 'bad-head' });
assert.equal(badLineage.ready, false);
assert.ok(badLineage.blockers.includes('B02AU_CERTIFIED_HEAD_REQUIRED'));

const badAuthority = boundary.evaluateBoundaryCertification({
  ...packet,
  authority: { ...config.authority, entryContainerInstanceMaterializationAuthority: true }
});
assert.equal(badAuthority.ready, false);
assert.ok(badAuthority.blockers.includes('PROHIBITED_AUTHORITY_MUST_BE_FALSE:entryContainerInstanceMaterializationAuthority'));

assert.equal(config.predecessor.certifiedHead, boundary.PREDECESSOR_HEAD);
assert.equal(config.predecessor.certifiedTree, boundary.PREDECESSOR_TREE);
assert.equal(config.predecessor.certificationRunId, boundary.PREDECESSOR_CERTIFICATION_RUN_ID);
assert.equal(config.predecessor.certificationJobId, boundary.PREDECESSOR_CERTIFICATION_JOB_ID);
assert.equal(config.readiness.entryContainerInstanceReadinessMaterialized, true);
assert.equal(config.readiness.entryContainerInstanceMaterialized, false);
assert.equal(config.readiness.entryContainerMaterialized, false);
assert.equal(config.authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceReadinessAuthority, true);
assert.equal(config.authority.entryContainerInstanceMaterializationAuthority, false);
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

const source = fs.readFileSync(path.resolve(__dirname, '../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-readiness.js'), 'utf8');
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

console.log('COM-B02AV repository-only entry container instance readiness checks passed.');
