'use strict';

const assert = require('node:assert/strict');
const captureModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-capture');
const implementationModule = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-methods-implementation');
const config = require('../config/com-b02bm-repository-only-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-capture.json');

const captured =
  captureModule.materializeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCapture();
const description =
  captureModule.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesCapture();

assert.equal(description.contractId, config.contractId);
assert.equal(description.boundaryId, config.boundaryId);
assert.equal(description.predecessorHead, config.predecessor.certifiedHead);
assert.equal(description.predecessorTree, config.predecessor.certifiedTree);
assert.deepEqual(description.requiredOperationNames, config.requiredOperationNames);
assert.deepEqual(description.capturedReferenceNames, config.requiredOperationNames);
assert.equal(Object.isFrozen(captured), true);
assert.equal(Object.keys(captured).length, config.requiredOperationNames.length);

for (const operationName of config.requiredOperationNames) {
  assert.equal(typeof captured[operationName], 'function', `captured.${operationName}`);
  assert.strictEqual(captured[operationName], implementationModule[operationName],
    `identity.${operationName}`);
}

for (const [key, expected] of Object.entries(config.expected)) {
  assert.equal(description[key], expected, `description.${key}`);
}

const packet = {
  ...description,
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.certifiedHead,
  predecessorTree: config.predecessor.certifiedTree,
  b02blCertificationRunId: config.predecessor.certificationRunId,
  b02blCertificationJobId: config.predecessor.certificationJobId,
  b02blDescriptorChanged: false,
  b02bkReadinessChanged: false,
  b02bjImplementationChanged: false,
  b02bhBindingChanged: false,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority: config.authority
};

const certification = captureModule.evaluateBoundaryCertification(packet);
assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.executableMethodReferencesCaptured, true);
assert.equal(certification.executableMethodReferenceMaterialized, true);
assert.equal(certification.executableMethodReferencesBound, false);
assert.equal(certification.operationMethodsAttachedToInstance, false);
assert.equal(certification.executableOperationMethodsInvoked, false);
assert.equal(certification.continuationStateStored, false);
assert.equal(certification.registryOperationInvocationAuthority, false);
assert.equal(certification.registryLookupAuthority, false);
assert.equal(certification.registryReleaseAuthority, false);
assert.equal(certification.networkAuthority, false);
assert.equal(certification.runtimeActivationAuthority, false);
assert.equal(certification.productionAuthority, false);
assert.equal(certification.r5iCreationAuthority, false);

assert.equal(config.authorization.singleUse, true);
assert.equal(config.authorization.reusable, false);
assert.equal(config.authorization.consumedByBoundary, 'COM-B02BM');
assert.equal(config.authorization.executableMethodReferenceCaptureAuthorized, true);
assert.equal(config.authorization.executableMethodReferenceMaterializationAuthorized, true);
assert.equal(config.authorization.executableMethodReferenceBindingAuthorized, false);
assert.equal(config.authorization.operationMethodsAttachmentAuthorized, false);
assert.equal(config.authorization.operationMethodInvocationAuthorized, false);

for (const key of [
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

assert.match(certification.nextAction, /fresh_explicit_authorization/);
assert.match(certification.nextAction, /binding/);

console.log('COM-B02BM repository-only executable operation method references capture/materialization: PASS');
