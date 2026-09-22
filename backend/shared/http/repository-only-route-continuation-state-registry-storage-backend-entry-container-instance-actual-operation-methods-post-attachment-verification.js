'use strict';

const attachment = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment');
const targetModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization');
const bindingModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-binding');

const CONTRACT_ID = 'com-b02bz-repository-only-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-post-attachment-verification-v1';
const BOUNDARY_ID = 'COM-B02BZ';
const PREDECESSOR_CONTRACT_ID = attachment.CONTRACT_ID;
const PREDECESSOR_HEAD = 'f7b7b5a1704c9f1f28060a13b62cd627b8ce1d17';
const PREDECESSOR_TREE = '3f40efe9cead5c98aee81b97848caaa7495e1d19';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32611188849;
const PREDECESSOR_CERTIFICATION_JOB_ID = 97124437903;
const REQUIRED_OPERATION_NAMES = attachment.REQUIRED_OPERATION_NAMES;
const METHOD_PROPERTY_ATTRIBUTES = attachment.METHOD_PROPERTY_ATTRIBUTES;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsPostAttachmentVerification() {
  const predecessor = attachment.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachment();
  const target = targetModule.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget();
  const binding = bindingModule.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBinding();

  const predecessorAttachmentCertified =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02BY' &&
    predecessor.decision === 'repository_only_actual_operation_methods_attachment_applied' &&
    predecessor.actualOperationMethodsAttachmentImplementationMaterialized === true &&
    predecessor.operationMethodSlotsPresent === true &&
    predecessor.attachedOperationMethodCount === REQUIRED_OPERATION_NAMES.length &&
    predecessor.exactCallableReferenceIdentityPreserved === true &&
    predecessor.attachedMethodPropertyAttributesPreserved === true &&
    predecessor.targetIdentityPreserved === true &&
    predecessor.attachmentAppliedToEntryContainerInstance === true &&
    predecessor.operationMethodsAttachedToInstance === true &&
    predecessor.executableOperationMethodsInvoked === false &&
    predecessor.continuationStateStored === false &&
    predecessor.registryOperationInvoked === false &&
    predecessor.registryLookupExecuted === false &&
    predecessor.registryReleaseExecuted === false &&
    predecessor.networkExecuted === false &&
    predecessor.runtimeActivated === false &&
    predecessor.productionChanged === false;

  const targetIdentityPreserved =
    target === targetModule.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget() &&
    target.targetId === predecessor.attachmentCapableTargetId;

  const descriptorChecks = REQUIRED_OPERATION_NAMES.map((operationName) => {
    const targetProperty = Object.getOwnPropertyDescriptor(target, operationName);
    const hiddenName = bindingModule.HIDDEN_REFERENCE_PROPERTIES[operationName];
    const bindingProperty = Object.getOwnPropertyDescriptor(binding, hiddenName);

    return {
      operationName,
      targetPropertyPresent: typeof targetProperty?.value === 'function',
      exactCallableReferenceIdentityPreserved:
        typeof targetProperty?.value === 'function' &&
        typeof bindingProperty?.value === 'function' &&
        targetProperty.value === bindingProperty.value,
      enumerable: targetProperty?.enumerable,
      writable: targetProperty?.writable,
      configurable: targetProperty?.configurable
    };
  });

  const allThreeOperationMethodsPresent =
    descriptorChecks.length === REQUIRED_OPERATION_NAMES.length &&
    descriptorChecks.every((check) => check.targetPropertyPresent === true);

  const exactCallableReferenceIdentityPreserved =
    descriptorChecks.every((check) => check.exactCallableReferenceIdentityPreserved === true);

  const attachedMethodPropertyAttributesPreserved =
    descriptorChecks.every((check) =>
      check.enumerable === METHOD_PROPERTY_ATTRIBUTES.enumerable &&
      check.writable === METHOD_PROPERTY_ATTRIBUTES.writable &&
      check.configurable === METHOD_PROPERTY_ATTRIBUTES.configurable
    );

  const verificationPassed =
    predecessorAttachmentCertified &&
    targetIdentityPreserved &&
    allThreeOperationMethodsPresent &&
    exactCallableReferenceIdentityPreserved &&
    attachedMethodPropertyAttributesPreserved &&
    Object.isExtensible(target) === true;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: verificationPassed
      ? 'repository_only_actual_operation_methods_post_attachment_verified'
      : 'repository_only_actual_operation_methods_post_attachment_verification_blocked',
    requiredOperationNames: clone(REQUIRED_OPERATION_NAMES),
    methodPropertyAttributes: clone(METHOD_PROPERTY_ATTRIBUTES),
    descriptorChecks: clone(descriptorChecks),
    predecessorAttachmentCertified,
    predecessorAttachmentMaterializedForVerification: true,
    postAttachmentVerificationPerformed: true,
    allThreeOperationMethodsPresent,
    attachedOperationMethodCount: descriptorChecks.filter((check) => check.targetPropertyPresent).length,
    exactCallableReferenceIdentityPreserved,
    attachedMethodPropertyAttributesPreserved,
    targetIdentityPreserved,
    targetRemainsExtensible: Object.isExtensible(target),
    targetMutationPerformedByVerificationBoundary: false,
    operationMethodsAttachedByVerificationBoundary: false,
    executableOperationMethodsInvoked: false,
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
    credentialSourceBound: false,
    credentialReadExecuted: false,
    rpcExecuted: false,
    networkExecuted: false,
    stagingReadExecuted: false,
    stagingMutationExecuted: false,
    migrationApplied: false,
    runtimeBindingImplemented: false,
    runtimeActivated: false,
    productionChanged: false
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02BY_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BY_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BY_CERTIFIED_TREE_REQUIRED');
  req(input.b02byCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02BY_CERTIFICATION_RUN_REQUIRED');
  req(input.b02byCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02BY_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorAttachmentCertified',
    'predecessorAttachmentMaterializedForVerification',
    'postAttachmentVerificationPerformed',
    'allThreeOperationMethodsPresent',
    'exactCallableReferenceIdentityPreserved',
    'attachedMethodPropertyAttributesPreserved',
    'targetIdentityPreserved',
    'targetRemainsExtensible'
  ]) req(input[key] === true, `REQUIRED_POST_ATTACHMENT_VERIFICATION_PROOF_MISSING:${key}`);

  req(input.attachedOperationMethodCount === REQUIRED_OPERATION_NAMES.length,
    'EXACTLY_THREE_ATTACHED_OPERATION_METHODS_REQUIRED');

  for (const key of [
    'targetMutationPerformedByVerificationBoundary',
    'operationMethodsAttachedByVerificationBoundary',
    'executableOperationMethodsInvoked',
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
    'productionChanged',
    'b02byAttachmentChanged',
    'b02buMaterializationChanged',
    'b02boBindingChanged',
    'routeRegistryChanged',
    'moduleRouteLoaderChanged',
    'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_POST_ATTACHMENT_VERIFICATION_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) && authority.repositoryOnlyPostAttachmentVerificationAuthority === true,
    'REPOSITORY_ONLY_POST_ATTACHMENT_VERIFICATION_AUTHORITY_REQUIRED');
  req(isObject(authority) && authority.predecessorAttachmentMaterializationForVerificationAuthority === true,
    'PREDECESSOR_ATTACHMENT_MATERIALIZATION_FOR_VERIFICATION_AUTHORITY_REQUIRED');

  for (const key of [
    'operationMethodInvocationAuthority',
    'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority',
    'registryLookupAuthority',
    'registryReleaseAuthority',
    'resumeSurfaceInvocationAuthority',
    'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority',
    'runtimeBindingAuthority',
    'routeRegistryMutationAuthority',
    'moduleRouteLoaderMutationAuthority',
    'routeHandlerMutationAuthority',
    'credentialSourceBindingAuthority',
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
  ]) req(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_actual_operation_methods_post_attachment_verification_certifiable'
      : 'repository_only_actual_operation_methods_post_attachment_verification_blocked',
    ready,
    blockers,
    postAttachmentVerificationPerformed: ready,
    exactCallableReferenceIdentityPreserved: ready,
    attachedMethodPropertyAttributesPreserved: ready,
    targetIdentityPreserved: ready,
    executableOperationMethodsInvoked: false,
    continuationStateStored: false,
    registryOperationInvocationAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction:
      'stop_and_require_fresh_explicit_authorization_before_any_operation_method_invocation_state_storage_registry_execution_or_sensitive_scope'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_TREE,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  REQUIRED_OPERATION_NAMES,
  METHOD_PROPERTY_ATTRIBUTES,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsPostAttachmentVerification,
  evaluateBoundaryCertification
});
