'use strict';

const assert = require('node:assert/strict');
const descriptorModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-capture-descriptor');
const config = require('../config/com-b02bl-repository-only-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-capture-descriptor.json');

function containsFunction(value, seen = []) {
  if (typeof value === 'function') return true;
  if (!value || typeof value !== 'object' || seen.includes(value)) return false;
  seen.push(value);
  return Object.values(value).some((child) => containsFunction(child, seen));
}

const descriptor =
  descriptorModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCaptureDescriptor();

assert.equal(descriptor.contractId, config.contractId);
assert.equal(descriptor.boundaryId, config.boundaryId);
assert.equal(descriptor.predecessorHead, config.predecessor.certifiedHead);
assert.equal(descriptor.predecessorTree, config.predecessor.certifiedTree);
assert.deepEqual(descriptor.requiredOperationNames, config.requiredOperationNames);
assert.equal(containsFunction(descriptor), false);

for (const [key, expected] of Object.entries(config.expected)) {
  assert.equal(descriptor[key], expected, `descriptor.${key}`);
}

assert.equal(Object.isFrozen(descriptor), true);
assert.equal(Object.isFrozen(descriptor.operationMethodSignatures), true);
assert.equal(Object.isFrozen(descriptor.captureCandidateOperationNames), true);

const packet = {
  ...descriptor,
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.certifiedHead,
  predecessorTree: config.predecessor.certifiedTree,
  b02bkCertificationRunId: config.predecessor.certificationRunId,
  b02bkCertificationJobId: config.predecessor.certificationJobId,
  b02bkReadinessChanged: false,
  b02bjImplementationChanged: false,
  b02bhBindingChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority: config.authority
};

const certification = descriptorModule.evaluateBoundaryCertification(packet);
assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.captureDescriptorMaterialized, true);
assert.equal(certification.captureDescriptorContainsNoExecutableReferences, true);
assert.equal(certification.executableMethodReferencesCaptured, false);
assert.equal(certification.executableMethodReferenceMaterialized, false);
assert.equal(certification.executableMethodReferencesBound, false);
assert.equal(certification.operationMethodsAttachedToInstance, false);
assert.equal(certification.continuationStateStored, false);
assert.equal(certification.networkAuthority, false);
assert.equal(certification.runtimeActivationAuthority, false);
assert.equal(certification.productionAuthority, false);
assert.equal(certification.r5iCreationAuthority, false);

for (const key of [
  'executableMethodReferenceCaptureAuthority',
  'executableMethodReferenceMaterializationAuthority',
  'executableMethodReferenceBindingAuthority',
  'operationMethodsAttachmentAuthority',
  'continuationStateStorageAuthority',
  'registryOperationInvocationAuthority',
  'registryLookupAuthority',
  'registryReleaseAuthority',
  'credentialReadAuthority',
  'rpcExecutionAuthority',
  'networkAuthority',
  'stagingDeploymentAuthority',
  'stagingTrafficAuthority',
  'migrationApplicationAuthority',
  'runtimeActivationAuthority',
  'productionAuthority',
  'pullRequestMergeAuthority',
  'readyForReviewAuthority',
  'r5iCreationAuthority'
]) {
  assert.equal(config.authority[key], false, `authority.${key}`);
}

assert.equal(config.authorization.singleUse, true);
assert.equal(config.authorization.consumedByBoundary, 'COM-B02BL');
assert.match(certification.nextAction, /fresh_explicit_authorization/);

console.log('COM-B02BL repository-only executable operation method references capture descriptor: PASS');
