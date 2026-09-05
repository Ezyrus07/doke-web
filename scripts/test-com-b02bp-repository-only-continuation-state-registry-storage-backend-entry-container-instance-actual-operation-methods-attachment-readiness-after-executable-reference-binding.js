'use strict';

const assert = require('node:assert/strict');
const readinessModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-readiness-after-executable-reference-binding');
const config = require('../config/com-b02bp-repository-only-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-readiness-after-executable-reference-binding.json');

const readiness =
  readinessModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentReadinessAfterExecutableReferenceBinding();

assert.equal(readiness.contractId, config.contractId);
assert.equal(readiness.boundaryId, 'COM-B02BP');
assert.equal(readiness.predecessorHead, config.predecessor.certifiedHead);
assert.equal(readiness.predecessorTree, config.predecessor.certifiedTree);
assert.equal(readiness.rootCause, config.rootCause);
assert.equal(readiness.predecessorBindingCertified, true);
assert.equal(readiness.targetBindingReferencePresent, true);
assert.equal(readiness.entryContainerInstanceReferencePresent, true);
assert.equal(readiness.targetIdentityPreserved, true);
assert.equal(readiness.attachmentTargetFrozen, true);
assert.equal(readiness.attachmentTargetExtensible, false);
assert.equal(readiness.operationMethodSlotsAbsent, true);
assert.equal(readiness.directAttachmentPossible, false);
assert.equal(readiness.attachmentBlockerProven, true);
assert.equal(readiness.attachmentCapableTargetRequired, true);
assert.equal(readiness.actualOperationMethodsAttachmentReadinessMaterialized, true);
assert.equal(readiness.actualOperationMethodsAttachmentReady, false);
assert.equal(readiness.actualOperationMethodsAttachmentPrerequisitesSatisfied, false);
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

const result = readinessModule.evaluateBoundaryCertification({
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.certifiedHead,
  predecessorTree: config.predecessor.certifiedTree,
  b02boCertificationRunId: config.predecessor.certificationRunId,
  b02boCertificationJobId: config.predecessor.certificationJobId,
  ...readiness,
  b02boBindingChanged: false,
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
assert.equal(result.actualOperationMethodsAttachmentReadinessMaterialized, true);
assert.equal(result.actualOperationMethodsAttachmentReady, false);
assert.equal(result.actualOperationMethodsAttachmentPrerequisitesSatisfied, false);
assert.equal(result.attachmentCapableTargetRequired, true);
assert.equal(result.operationMethodsAttachedToInstance, false);
assert.equal(result.executableOperationMethodsInvoked, false);
assert.equal(result.continuationStateStored, false);
assert.equal(result.networkAuthority, false);
assert.equal(result.runtimeActivationAuthority, false);
assert.equal(result.productionAuthority, false);
assert.equal(result.r5iCreationAuthority, false);

console.log('COM-B02BP actual operation methods attachment readiness blocker: PASS');
