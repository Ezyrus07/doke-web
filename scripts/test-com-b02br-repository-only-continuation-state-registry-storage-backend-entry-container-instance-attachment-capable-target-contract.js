'use strict';

const assert = require('node:assert/strict');
const contractModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-contract');
const config = require('../config/com-b02br-repository-only-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-contract.json');

const contract =
  contractModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetContract();

assert.equal(contract.contractId, config.contractId);
assert.equal(contract.boundaryId, 'COM-B02BR');
assert.equal(contract.predecessorHead, config.predecessor.certifiedHead);
assert.equal(contract.predecessorTree, config.predecessor.certifiedTree);
assert.equal(contract.rootCause, config.rootCause);
assert.equal(contract.predecessorReadinessCertified, true);
assert.equal(contract.minimumContractShapeDefined, true);
assert.equal(contract.contractShapeValidated, true);
assert.equal(contract.contractShapeDataOnly, true);
assert.equal(contract.sourceIdentityLineagePreserved, true);
assert.equal(contract.targetIdentityDistinctFromFrozenSource, true);
assert.equal(contract.targetExtensibilityRequirementPreserved, true);
assert.equal(contract.emptyOperationMethodSlotsRequirementPreserved, true);
assert.equal(contract.boundExecutableReferencesExternalUntilSeparateAttachmentAuthority, true);
assert.equal(contract.requiredOperationNamesPreserved, true);
assert.equal(contract.materializationRequirementsPreserved, true);
assert.equal(contract.attachmentCapableTargetMaterializationReadinessMaterialized, true);
assert.equal(contract.attachmentCapableTargetMaterializationReady, true);
assert.equal(contract.attachmentCapableTargetContractMaterialized, true);
assert.equal(contract.attachmentCapableTargetImplementationMaterialized, false);
assert.equal(contract.attachmentCapableTargetMaterialized, false);
assert.equal(contract.attachmentCapableTargetExtensible, false);
assert.equal(contract.attachmentCapableTargetOperationMethodsPresent, false);
assert.equal(contract.attachmentAppliedToEntryContainerInstance, false);
assert.equal(contract.operationMethodsAttachedToInstance, false);
assert.equal(contract.executableOperationMethodsInvoked, false);
assert.equal(contract.continuationStateStored, false);
assert.equal(contract.registryOperationInvoked, false);
assert.equal(contract.registryLookupExecuted, false);
assert.equal(contract.registryReleaseExecuted, false);
assert.equal(contract.networkExecuted, false);
assert.equal(contract.runtimeActivated, false);
assert.equal(contract.productionChanged, false);
assert.equal(contract.attachmentCapableTargetId, config.attachmentCapableTarget.targetId);
assert.deepEqual(contract.requiredOperationNames, config.requiredOperationNames);
assert.deepEqual(contract.attachmentCapableTargetMaterializationRequirements, config.materializationRequirements);

const shape =
  contractModule.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetContractShape();
const shapeValidation =
  contractModule.validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetContractShape(shape);
assert.equal(shapeValidation.valid, true);
assert.deepEqual(shapeValidation.blockers, []);
assert.equal(shapeValidation.attachmentCapableTargetContractMaterialized, true);
assert.equal(shapeValidation.attachmentCapableTargetImplementationMaterialized, false);
assert.equal(shapeValidation.attachmentCapableTargetMaterialized, false);
assert.equal(shapeValidation.operationMethodsAttachedToInstance, false);
assert.equal(shapeValidation.executableOperationMethodsInvoked, false);
assert.equal(shapeValidation.networkAuthority, false);
assert.equal(shapeValidation.runtimeActivationAuthority, false);

const result = contractModule.evaluateBoundaryCertification({
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.certifiedHead,
  predecessorTree: config.predecessor.certifiedTree,
  b02bqCertificationRunId: config.predecessor.certificationRunId,
  b02bqCertificationJobId: config.predecessor.certificationJobId,
  ...contract,
  b02bqReadinessChanged: false,
  b02azInstanceChanged: false,
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
});

assert.equal(result.ready, true);
assert.deepEqual(result.blockers, []);
assert.equal(result.rootCause, config.rootCause);
assert.equal(result.attachmentCapableTargetContractMaterialized, true);
assert.equal(result.attachmentCapableTargetImplementationMaterialized, false);
assert.equal(result.attachmentCapableTargetMaterialized, false);
assert.equal(result.operationMethodsAttachedToInstance, false);
assert.equal(result.executableOperationMethodsInvoked, false);
assert.equal(result.continuationStateStored, false);
assert.equal(result.networkAuthority, false);
assert.equal(result.runtimeActivationAuthority, false);
assert.equal(result.productionAuthority, false);
assert.equal(result.r5iCreationAuthority, false);
assert.equal(result.nextAction, config.nextAction);

const forbiddenShape = {
  ...shape,
  attachmentCapableTargetMaterialized: true
};
const forbiddenShapeValidation =
  contractModule.validateRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetContractShape(forbiddenShape);
assert.equal(forbiddenShapeValidation.valid, false);
assert.ok(forbiddenShapeValidation.blockers.includes(
  'PROHIBITED_ATTACHMENT_CAPABLE_TARGET_CONTRACT_FIELD_MUST_BE_FALSE:attachmentCapableTargetMaterialized'
));

const forbidden = contractModule.evaluateBoundaryCertification({
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.certifiedHead,
  predecessorTree: config.predecessor.certifiedTree,
  b02bqCertificationRunId: config.predecessor.certificationRunId,
  b02bqCertificationJobId: config.predecessor.certificationJobId,
  ...contract,
  attachmentCapableTargetImplementationMaterialized: true,
  attachmentCapableTargetMaterialized: true,
  operationMethodsAttachedToInstance: true,
  executableOperationMethodsInvoked: true,
  b02bqReadinessChanged: false,
  b02azInstanceChanged: false,
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
});
assert.equal(forbidden.ready, false);
assert.ok(forbidden.blockers.includes('B02BR_TARGET_IMPLEMENTATION_PROHIBITED'));
assert.ok(forbidden.blockers.includes('B02BR_TARGET_MATERIALIZATION_PROHIBITED'));
assert.ok(forbidden.blockers.includes('B02BR_OPERATION_METHOD_ATTACHMENT_PROHIBITED'));
assert.ok(forbidden.blockers.includes('B02BR_OPERATION_METHOD_INVOCATION_PROHIBITED'));

assert.equal(config.authorization.singleUse, true);
assert.equal(config.authorization.reusable, false);
assert.equal(config.authorization.consumedByBoundary, 'COM-B02BR');
assert.equal(config.authorization.forcePushAuthorized, false);
assert.equal(config.attachmentCapableTarget.contractOnly, true);
assert.equal(config.attachmentCapableTarget.contractDataOnly, true);
assert.equal(config.attachmentCapableTarget.implementationMaterialized, false);
assert.equal(config.attachmentCapableTarget.materialized, false);
assert.equal(config.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
assert.equal(config.functionalCheckpoint.r5iCreated, false);
assert.equal(config.functionalCheckpoint.r5iInferred, false);

console.log('COM-B02BR attachment-capable target contract: PASS');
