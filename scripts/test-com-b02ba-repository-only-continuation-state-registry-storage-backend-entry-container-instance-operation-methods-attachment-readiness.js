'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const boundary = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-readiness');
const config = require('../config/com-b02ba-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-readiness.json');

assert.equal(boundary.CONTRACT_ID, 'com-b02ba-repository-only-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-readiness-v1');
assert.equal(boundary.BOUNDARY_ID, 'COM-B02BA');
assert.equal(boundary.PREDECESSOR_CONTRACT_ID, 'com-b02az-repository-only-continuation-state-registry-storage-backend-entry-container-inert-instance-v1');
assert.equal(boundary.PREDECESSOR_HEAD, 'f48367405b1295eeee50e94336be27fb22e9b738');
assert.equal(boundary.PREDECESSOR_TREE, '1905d9d1853d0f7653f2c56fecd1a8fc7a990f55');
assert.equal(boundary.PREDECESSOR_CERTIFICATION_RUN_ID, 32494343548);
assert.equal(boundary.PREDECESSOR_CERTIFICATION_JOB_ID, 96809107635);

const readiness = boundary.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentReadiness();
assert.equal(Object.isFrozen(readiness), true);
assert.equal(readiness.predecessorInertEntryContainerInstanceMaterialized, true);
assert.equal(readiness.entryContainerInstanceMaterialized, true);
assert.equal(readiness.entryContainerInstanceInert, true);
assert.equal(readiness.entryContainerInstanceMetadataOnly, true);
assert.equal(readiness.entryContainerInstanceOperationDescriptorImplementationMaterialized, true);
assert.equal(readiness.entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized, true);
assert.equal(readiness.operationMethodAttachmentRequirementsDefined, true);
assert.equal(readiness.storageBackendInstanceMaterialized, true);
assert.equal(readiness.storageBackendInstanceInert, true);
assert.deepEqual(readiness.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
assert.deepEqual(readiness.operationMethodAttachmentRequirements, boundary.OPERATION_METHOD_ATTACHMENT_REQUIREMENTS);

for (const key of [
  'storageBackendMaterialized', 'entryContainerMaterialized', 'operationMethodsAttachedToInstance',
  'carrierInstanceMaterialized', 'opaqueStateHandleGenerated', 'continuationStateStored',
  'registryOperationInvoked', 'registryLookupExecuted', 'registryReleaseExecuted',
  'rawStateSerialized', 'rawStateExported', 'executableReferencesSerialized',
  'executableReferencesExported', 'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked',
  'repositoryOperationInvoked', 'credentialSourceBound', 'credentialReadExecuted',
  'rpcExecuted', 'networkExecuted', 'stagingReadExecuted', 'stagingMutationExecuted',
  'migrationApplied', 'runtimeBindingImplemented', 'runtimeActivated', 'productionChanged'
]) assert.equal(readiness[key], false, `${key} must remain false`);

const packet = {
  predecessorContractId: boundary.PREDECESSOR_CONTRACT_ID,
  predecessorHead: boundary.PREDECESSOR_HEAD,
  predecessorTree: boundary.PREDECESSOR_TREE,
  b02azCertificationRunId: boundary.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02azCertificationJobId: boundary.PREDECESSOR_CERTIFICATION_JOB_ID,
  predecessorInertEntryContainerInstanceMaterialized: true,
  entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized: true,
  operationMethodAttachmentRequirementsDefined: true,
  entryContainerRequirementsPreserved: true,
  entryContainerInstanceRequirementsPreserved: true,
  requiredOperationNamesPreserved: true,
  operationDescriptorsPreserved: true,
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
  b02azInstanceChanged: false,
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

const certification = boundary.evaluateBoundaryCertification(packet);
assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.entryContainerInstanceMaterialized, true);
assert.equal(certification.entryContainerInstanceInert, true);
assert.equal(certification.entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized, true);
assert.equal(certification.entryContainerMaterialized, false);
assert.equal(certification.operationMethodsAttachedToInstance, false);
assert.equal(certification.r5iCreationAuthority, false);

const badLineage = boundary.evaluateBoundaryCertification({ ...packet, predecessorHead: 'bad-head' });
assert.equal(badLineage.ready, false);
assert.ok(badLineage.blockers.includes('B02AZ_CERTIFIED_HEAD_REQUIRED'));

const badAuthority = boundary.evaluateBoundaryCertification({
  ...packet,
  authority: { ...config.authority, operationMethodsAttachmentAuthority: true }
});
assert.equal(badAuthority.ready, false);
assert.ok(badAuthority.blockers.includes('PROHIBITED_AUTHORITY_MUST_BE_FALSE:operationMethodsAttachmentAuthority'));

assert.equal(config.predecessor.certifiedHead, boundary.PREDECESSOR_HEAD);
assert.equal(config.predecessor.certifiedTree, boundary.PREDECESSOR_TREE);
assert.equal(config.predecessor.certificationRunId, boundary.PREDECESSOR_CERTIFICATION_RUN_ID);
assert.equal(config.predecessor.certificationJobId, boundary.PREDECESSOR_CERTIFICATION_JOB_ID);
assert.equal(config.readiness.entryContainerInstanceOperationMethodsAttachmentReadinessMaterialized, true);
assert.equal(config.readiness.entryContainerInstanceMaterialized, true);
assert.equal(config.readiness.entryContainerInstanceInert, true);
assert.equal(config.readiness.entryContainerMaterialized, false);
assert.equal(config.readiness.operationMethodsAttachedToInstance, false);
assert.equal(config.authority.repositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceOperationMethodsAttachmentReadinessAuthority, true);
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

const source = fs.readFileSync(path.resolve(__dirname, '../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-operation-methods-attachment-readiness.js'), 'utf8');
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

console.log('COM-B02BA repository-only entry container instance operation methods attachment readiness checks passed.');
