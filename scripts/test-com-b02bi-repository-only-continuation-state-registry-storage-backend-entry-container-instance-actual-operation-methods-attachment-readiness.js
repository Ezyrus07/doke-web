'use strict';

const assert = require('node:assert/strict');
const readinessModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-readiness');
const config = require('../config/com-b02bi-repository-only-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-readiness.json');

const readiness = readinessModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentReadiness();

assert.equal(readiness.contractId, readinessModule.CONTRACT_ID);
assert.equal(readiness.boundaryId, 'COM-B02BI');
assert.equal(readiness.predecessorContractId, readinessModule.PREDECESSOR_CONTRACT_ID);
assert.equal(readiness.predecessorHead, 'fa0666910a6b637f34a7b315d5eea2d1279a0a67');
assert.equal(readiness.predecessorTree, '1e398898dea75cea887b6004136840bd67afc589');
assert.equal(readiness.predecessorBindingCertified, true);
assert.equal(readiness.descriptorOnlyAttachmentImplementationPresent, true);
assert.equal(readiness.nonCallableDescriptorsConfirmed, true);
assert.equal(readiness.actualOperationMethodsAttachmentReadinessMaterialized, true);
assert.equal(readiness.attachmentPreconditionsClassified, true);
assert.equal(readiness.bindingPreconditionSatisfied, true);
assert.equal(readiness.descriptorImplementationPreconditionSatisfied, true);
assert.equal(readiness.executableOperationMethodImplementationPresent, false);
assert.equal(readiness.executableOperationMethodImplementationRequired, true);
assert.equal(readiness.executableOperationMethodReferencesAvailable, false);
assert.equal(readiness.actualOperationMethodsAttachmentPrerequisitesSatisfied, false);
assert.deepEqual(readiness.missingPrerequisiteCodes, ['EXECUTABLE_OPERATION_METHOD_IMPLEMENTATION_REQUIRED']);
assert.deepEqual(readiness.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
assert.equal(readiness.inertAttachmentBoundToEntryContainerInstance, true);

for (const key of [
  'attachmentAppliedToEntryContainerInstance',
  'operationMethodsAttachedToInstance',
  'executableMethodReferencesCaptured',
  'executableMethodReferenceMaterialized',
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
]) assert.equal(readiness[key], false, `${key} must remain false`);

assert.equal(config.authorization.type, 'fresh_explicit_repository_only_boundary_authorization');
assert.equal(config.authorization.singleUse, true);
assert.equal(config.authorization.consumedByBoundary, 'COM-B02BI');
assert.equal(config.authority.repositoryOnlyActualOperationMethodsAttachmentReadinessAuthority, true);
assert.equal(config.authority.operationMethodsAttachmentAuthority, false);
assert.equal(config.authority.executableMethodReferenceMaterializationAuthority, false);
assert.equal(config.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
assert.equal(config.functionalCheckpoint.r5iCreated, false);
assert.equal(config.functionalCheckpoint.r5iInferred, false);

const packet = {
  ...readiness,
  predecessorContractId: readinessModule.PREDECESSOR_CONTRACT_ID,
  predecessorHead: readinessModule.PREDECESSOR_HEAD,
  predecessorTree: readinessModule.PREDECESSOR_TREE,
  b02bhCertificationRunId: readinessModule.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02bhCertificationJobId: readinessModule.PREDECESSOR_CERTIFICATION_JOB_ID,
  b02bcCertifiedHead: readinessModule.B02BC_CERTIFIED_HEAD,
  b02bcCertifiedTree: readinessModule.B02BC_CERTIFIED_TREE,
  b02bcCertificationRunId: readinessModule.B02BC_CERTIFICATION_RUN_ID,
  b02bcCertificationJobId: readinessModule.B02BC_CERTIFICATION_JOB_ID,
  b02bhBindingChanged: false,
  b02bcImplementationChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority: config.authority
};

const certification = readinessModule.evaluateBoundaryCertification(packet);
assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.actualOperationMethodsAttachmentReadinessMaterialized, true);
assert.equal(certification.actualOperationMethodsAttachmentPrerequisitesSatisfied, false);
assert.equal(certification.executableOperationMethodImplementationPresent, false);
assert.equal(certification.operationMethodsAttachedToInstance, false);
assert.equal(certification.executableMethodReferenceMaterialized, false);
assert.equal(certification.continuationStateStored, false);
assert.equal(certification.networkAuthority, false);
assert.equal(certification.runtimeActivationAuthority, false);
assert.equal(certification.productionAuthority, false);
assert.equal(certification.r5iCreationAuthority, false);
assert.match(certification.nextAction, /fresh_explicit_authorization/);

const forbiddenPacket = {
  ...packet,
  executableOperationMethodImplementationPresent: true,
  executableOperationMethodReferencesAvailable: true,
  actualOperationMethodsAttachmentPrerequisitesSatisfied: true,
  operationMethodsAttachedToInstance: true
};
const forbiddenCertification = readinessModule.evaluateBoundaryCertification(forbiddenPacket);
assert.equal(forbiddenCertification.ready, false);
assert.ok(forbiddenCertification.blockers.includes('B02BI_EXECUTABLE_IMPLEMENTATION_MUST_REMAIN_ABSENT'));
assert.ok(forbiddenCertification.blockers.includes('B02BI_EXECUTABLE_REFERENCES_MUST_REMAIN_ABSENT'));
assert.ok(forbiddenCertification.blockers.includes('B02BI_OPERATION_METHOD_ATTACHMENT_PROHIBITED'));

console.log('COM-B02BI repository-only actual operation methods attachment readiness: PASS');
