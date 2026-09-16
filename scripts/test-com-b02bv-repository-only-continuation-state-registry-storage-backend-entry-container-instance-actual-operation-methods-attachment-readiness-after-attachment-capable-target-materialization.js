'use strict';

const assert = require('assert');
const config = require('../config/com-b02bv-repository-only-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-readiness-after-attachment-capable-target-materialization.json');
const boundary = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-readiness-after-attachment-capable-target-materialization');

const description =
  boundary.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentReadinessAfterAttachmentCapableTargetMaterialization();

assert.strictEqual(description.contractId, config.contractId);
assert.strictEqual(description.boundaryId, 'COM-B02BV');
assert.strictEqual(description.predecessorContractId,
  'com-b02bu-repository-only-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization-v1');
assert.strictEqual(description.predecessorHead, config.predecessor.head);
assert.strictEqual(description.predecessorTree, config.predecessor.tree);
assert.strictEqual(description.decision,
  'repository_only_actual_operation_methods_attachment_ready_after_attachment_capable_target_materialization');
assert.strictEqual(description.rootCause,
  'FROZEN_NON_EXTENSIBLE_ENTRY_CONTAINER_INSTANCE_REQUIRES_ATTACHMENT_CAPABLE_SUCCESSOR_MATERIALIZATION');

assert.deepStrictEqual(description.requiredOperationNames, [
  'registerOpaqueContinuationState',
  'resolveOpaqueContinuationState',
  'releaseOpaqueContinuationState'
]);
assert.deepStrictEqual(description.hiddenExecutableReferencePropertyNames, [
  'registerOpaqueContinuationStateReference',
  'resolveOpaqueContinuationStateReference',
  'releaseOpaqueContinuationStateReference'
]);

for (const key of Object.keys(config.requiredProofs)) {
  assert.strictEqual(description[key], config.requiredProofs[key], `required proof mismatch: ${key}`);
}
for (const key of Object.keys(config.requiredAbsences)) {
  assert.strictEqual(description[key], config.requiredAbsences[key], `required absence mismatch: ${key}`);
}

assert.strictEqual(description.attachmentAppliedToEntryContainerInstance, false);
assert.strictEqual(description.operationMethodsAttachedToInstance, false);
assert.strictEqual(description.executableOperationMethodsInvoked, false);
assert.strictEqual(description.continuationStateStored, false);
assert.strictEqual(description.registryOperationInvoked, false);
assert.strictEqual(description.registryLookupExecuted, false);
assert.strictEqual(description.registryReleaseExecuted, false);
assert.strictEqual(description.credentialReadExecuted, false);
assert.strictEqual(description.rpcExecuted, false);
assert.strictEqual(description.networkExecuted, false);
assert.strictEqual(description.stagingReadExecuted, false);
assert.strictEqual(description.stagingMutationExecuted, false);
assert.strictEqual(description.migrationApplied, false);
assert.strictEqual(description.runtimeActivated, false);
assert.strictEqual(description.productionChanged, false);

const packet = {
  ...description,
  predecessorContractId: description.predecessorContractId,
  predecessorHead: config.predecessor.head,
  predecessorTree: config.predecessor.tree,
  b02buCertificationRunId: config.predecessor.certificationRunId,
  b02buCertificationJobId: config.predecessor.certificationJobId,
  rootCause: description.rootCause,
  b02buMaterializationChanged: false,
  b02boBindingChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority: config.authorization
};

const evaluation = boundary.evaluateBoundaryCertification(packet);
assert.strictEqual(evaluation.ready, true);
assert.deepStrictEqual(evaluation.blockers, []);
assert.strictEqual(evaluation.decision,
  'repository_only_actual_operation_methods_attachment_readiness_certifiable');
assert.strictEqual(evaluation.actualOperationMethodsAttachmentReadinessMaterialized, true);
assert.strictEqual(evaluation.actualOperationMethodsAttachmentPrerequisitesSatisfied, true);
assert.strictEqual(evaluation.actualOperationMethodsAttachmentReady, true);
assert.strictEqual(evaluation.attachmentAppliedToEntryContainerInstance, false);
assert.strictEqual(evaluation.operationMethodsAttachedToInstance, false);
assert.strictEqual(evaluation.executableOperationMethodsInvoked, false);
assert.strictEqual(evaluation.continuationStateStored, false);
assert.strictEqual(evaluation.registryOperationInvocationAuthority, false);
assert.strictEqual(evaluation.networkAuthority, false);
assert.strictEqual(evaluation.runtimeActivationAuthority, false);
assert.strictEqual(evaluation.productionAuthority, false);
assert.strictEqual(evaluation.r5iCreationAuthority, false);
assert.strictEqual(evaluation.nextAction, config.nextAction);

console.log('COM-B02BV repository-only actual operation-method attachment readiness: PASS');
