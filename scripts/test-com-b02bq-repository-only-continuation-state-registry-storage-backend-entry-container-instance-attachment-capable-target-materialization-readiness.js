'use strict';

const assert = require('node:assert/strict');
const readinessModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization-readiness');
const config = require('../config/com-b02bq-repository-only-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization-readiness.json');

const readiness =
  readinessModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTargetMaterializationReadiness();

assert.equal(readiness.contractId, config.contractId);
assert.equal(readiness.boundaryId, 'COM-B02BQ');
assert.equal(readiness.predecessorHead, config.predecessor.certifiedHead);
assert.equal(readiness.predecessorTree, config.predecessor.certifiedTree);
assert.equal(readiness.rootCause, config.rootCause);
assert.equal(readiness.predecessorAttachmentBlockerCertified, true);
assert.equal(readiness.frozenSourceTargetMustRemainUnmodified, true);
assert.equal(readiness.sourceAttachmentTargetFrozen, true);
assert.equal(readiness.sourceAttachmentTargetExtensible, false);
assert.equal(readiness.directAttachmentToFrozenSourceProhibited, true);
assert.equal(readiness.attachmentCapableTargetRequired, true);
assert.equal(readiness.attachmentCapableTargetIdentityDistinctFromFrozenSource, true);
assert.equal(readiness.attachmentCapableTargetMaterializationReadinessMaterialized, true);
assert.equal(readiness.attachmentCapableTargetMaterializationRequirementsDefined, true);
assert.equal(readiness.attachmentCapableTargetExtensibilityRequired, true);
assert.equal(readiness.attachmentCapableTargetOperationMethodSlotsEmptyRequired, true);
assert.equal(readiness.attachmentCapableTargetMaterializationReady, true);
assert.equal(readiness.attachmentCapableTargetMaterialized, false);
assert.equal(readiness.attachmentCapableTargetExtensible, false);
assert.equal(readiness.attachmentCapableTargetOperationMethodsPresent, false);
assert.equal(readiness.executableMethodReferencesCaptured, true);
assert.equal(readiness.executableMethodReferenceMaterialized, true);
assert.equal(readiness.executableMethodReferencesBound, true);
assert.equal(readiness.attachmentAppliedToEntryContainerInstance, false);
assert.equal(readiness.operationMethodsAttachedToInstance, false);
assert.equal(readiness.executableOperationMethodsInvoked, false);
assert.equal(readiness.continuationStateStored, false);
assert.equal(readiness.registryOperationInvoked, false);
assert.equal(readiness.registryLookupExecuted, false);
assert.equal(readiness.registryReleaseExecuted, false);
assert.equal(readiness.networkExecuted, false);
assert.equal(readiness.runtimeActivated, false);
assert.equal(readiness.productionChanged, false);
assert.deepEqual(
  readiness.attachmentCapableTargetMaterializationRequirements,
  config.materializationRequirements
);

const result = readinessModule.evaluateBoundaryCertification({
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.certifiedHead,
  predecessorTree: config.predecessor.certifiedTree,
  b02bpCertificationRunId: config.predecessor.certificationRunId,
  b02bpCertificationJobId: config.predecessor.certificationJobId,
  ...readiness,
  b02bpReadinessChanged: false,
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
assert.equal(result.attachmentCapableTargetMaterializationReadinessMaterialized, true);
assert.equal(result.attachmentCapableTargetMaterializationReady, true);
assert.equal(result.attachmentCapableTargetMaterialized, false);
assert.equal(result.operationMethodsAttachedToInstance, false);
assert.equal(result.executableOperationMethodsInvoked, false);
assert.equal(result.continuationStateStored, false);
assert.equal(result.networkAuthority, false);
assert.equal(result.runtimeActivationAuthority, false);
assert.equal(result.productionAuthority, false);
assert.equal(result.r5iCreationAuthority, false);

const forbidden = readinessModule.evaluateBoundaryCertification({
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.certifiedHead,
  predecessorTree: config.predecessor.certifiedTree,
  b02bpCertificationRunId: config.predecessor.certificationRunId,
  b02bpCertificationJobId: config.predecessor.certificationJobId,
  ...readiness,
  attachmentCapableTargetMaterialized: true,
  operationMethodsAttachedToInstance: true,
  executableOperationMethodsInvoked: true,
  b02bpReadinessChanged: false,
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
assert.ok(forbidden.blockers.includes('B02BQ_TARGET_MATERIALIZATION_PROHIBITED'));
assert.ok(forbidden.blockers.includes('B02BQ_OPERATION_METHOD_ATTACHMENT_PROHIBITED'));
assert.ok(forbidden.blockers.includes('B02BQ_OPERATION_METHOD_INVOCATION_PROHIBITED'));

assert.equal(config.authorization.singleUse, true);
assert.equal(config.authorization.reusable, false);
assert.equal(config.authorization.consumedByBoundary, 'COM-B02BQ');
assert.equal(config.authorization.forcePushAuthorized, false);
assert.equal(config.functionalCheckpoint.lastFunctionalCheckpoint, 'COM-B03C-R5H');
assert.equal(config.functionalCheckpoint.r5iCreated, false);
assert.equal(config.functionalCheckpoint.r5iInferred, false);

console.log('COM-B02BQ attachment-capable target materialization readiness: PASS');
