'use strict';

const preparation = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-implementation-descriptor-preparation');
const targetModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization');
const bindingModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-binding');

const CONTRACT_ID = 'com-b02by-repository-only-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-attachment-v1';
const BOUNDARY_ID = 'COM-B02BY';
const PREDECESSOR_CONTRACT_ID = preparation.CONTRACT_ID;
const PREDECESSOR_HEAD = '127bc25bbd0811023fd8c8e00aea0d1172e7166c';
const PREDECESSOR_TREE = 'e07d93b30576a7634c0de636d002993f620e22b0';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32609351644;
const PREDECESSOR_CERTIFICATION_JOB_ID = 97119682553;
const REQUIRED_OPERATION_NAMES = preparation.REQUIRED_OPERATION_NAMES;
const METHOD_PROPERTY_ATTRIBUTES = preparation.FUTURE_METHOD_PROPERTY_ATTRIBUTES;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

let state = null;

function getPreparedDescriptors() {
  return [
    preparation.prepareRegisterOpaqueContinuationStateAttachmentDescriptor(),
    preparation.prepareResolveOpaqueContinuationStateAttachmentDescriptor(),
    preparation.prepareReleaseOpaqueContinuationStateAttachmentDescriptor()
  ];
}

function applyRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachment() {
  if (state) return state.target;

  const predecessor = preparation.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachmentImplementationDescriptorPreparation();
  const target = targetModule.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget();
  const binding = bindingModule.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBinding();
  const descriptors = getPreparedDescriptors();

  const predecessorReady =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02BX' &&
    predecessor.actualOperationMethodsAttachmentImplementationMaterialized === true &&
    predecessor.attachmentDescriptorsPrepared === true &&
    predecessor.allDescriptorsDataOnly === true &&
    predecessor.attachmentCapableTargetMaterialized === true &&
    predecessor.attachmentTargetExtensible === true &&
    predecessor.operationMethodSlotsAbsent === true &&
    predecessor.executableMethodReferencesBound === true &&
    predecessor.executableReferencesRemainExternalToTarget === true &&
    predecessor.executableReferencesCopiedToTarget === false &&
    predecessor.targetMutationPerformedByBoundary === false &&
    predecessor.attachmentAppliedToEntryContainerInstance === false &&
    predecessor.operationMethodsAttachedToInstance === false &&
    predecessor.executableOperationMethodsInvoked === false;

  const targetReady =
    target?.targetId === predecessor.attachmentCapableTargetId &&
    Object.isExtensible(target) &&
    !Object.isFrozen(target) &&
    !Object.isSealed(target) &&
    REQUIRED_OPERATION_NAMES.every((name) => !Object.prototype.hasOwnProperty.call(target, name));

  const bindingReady =
    binding.contractId === bindingModule.CONTRACT_ID &&
    binding.boundaryId === 'COM-B02BO' &&
    binding.executableReferenceBindingId === predecessor.executableReferenceBindingId &&
    binding.executableMethodReferencesBound === true &&
    binding.executableOperationMethodsInvoked === false;

  const descriptorsReady =
    descriptors.length === REQUIRED_OPERATION_NAMES.length &&
    descriptors.every((descriptor, index) =>
      descriptor.valid === true &&
      descriptor.operationName === REQUIRED_OPERATION_NAMES[index] &&
      descriptor.propertyName === REQUIRED_OPERATION_NAMES[index] &&
      descriptor.descriptorOnly === true &&
      descriptor.callableReferenceIncluded === false &&
      descriptor.executableReferenceExternalToDescriptor === true &&
      descriptor.exactCallableReferenceIdentityRequiredOnFutureApplication === true &&
      JSON.stringify(descriptor.futureMethodPropertyAttributes) === JSON.stringify(METHOD_PROPERTY_ATTRIBUTES)
    );

  if (!predecessorReady || !targetReady || !bindingReady || !descriptorsReady) {
    throw new Error('B02BY_ACTUAL_OPERATION_METHODS_ATTACHMENT_PRECONDITIONS_NOT_SATISFIED');
  }

  const references = {};
  for (const name of REQUIRED_OPERATION_NAMES) {
    const hiddenName = bindingModule.HIDDEN_REFERENCE_PROPERTIES[name];
    const property = Object.getOwnPropertyDescriptor(binding, hiddenName);
    if (
      typeof property?.value !== 'function' ||
      property.enumerable !== false ||
      property.writable !== false ||
      property.configurable !== false
    ) {
      throw new Error(`B02BY_EXTERNAL_EXECUTABLE_REFERENCE_INVALID:${name}`);
    }
    references[name] = property.value;
  }

  for (const descriptor of descriptors) {
    Object.defineProperty(target, descriptor.propertyName, {
      value: references[descriptor.operationName],
      enumerable: false,
      writable: false,
      configurable: false
    });
  }

  const attached = REQUIRED_OPERATION_NAMES.every((name) => {
    const property = Object.getOwnPropertyDescriptor(target, name);
    return typeof property?.value === 'function' &&
      property.value === references[name] &&
      property.enumerable === false &&
      property.writable === false &&
      property.configurable === false;
  });
  if (!attached) throw new Error('B02BY_ACTUAL_OPERATION_METHODS_ATTACHMENT_POSTCONDITION_FAILED');

  state = { predecessor, target, binding, descriptors, references };
  return target;
}

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachment() {
  applyRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachment();
  const { predecessor, target, binding, descriptors, references } = state;
  const names = REQUIRED_OPERATION_NAMES.filter((name) => Object.prototype.hasOwnProperty.call(target, name));
  const exactIdentity = REQUIRED_OPERATION_NAMES.every((name) => {
    const targetProperty = Object.getOwnPropertyDescriptor(target, name);
    const bindingProperty = Object.getOwnPropertyDescriptor(binding, bindingModule.HIDDEN_REFERENCE_PROPERTIES[name]);
    return targetProperty?.value === references[name] && targetProperty?.value === bindingProperty?.value;
  });
  const exactAttributes = REQUIRED_OPERATION_NAMES.every((name) => {
    const property = Object.getOwnPropertyDescriptor(target, name);
    return property?.enumerable === false && property?.writable === false && property?.configurable === false;
  });
  const targetIdentity =
    target === targetModule.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget() &&
    target.targetId === predecessor.attachmentCapableTargetId;

  return Object.freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: exactIdentity && exactAttributes && targetIdentity && names.length === 3
      ? 'repository_only_actual_operation_methods_attachment_applied'
      : 'repository_only_actual_operation_methods_attachment_blocked',
    attachmentCapableTargetId: predecessor.attachmentCapableTargetId,
    executableReferenceBindingId: predecessor.executableReferenceBindingId,
    requiredOperationNames: clone(REQUIRED_OPERATION_NAMES),
    methodPropertyAttributes: clone(METHOD_PROPERTY_ATTRIBUTES),
    predecessorDescriptorPreparationCertified: true,
    actualOperationMethodsAttachmentImplementationMaterialized: true,
    attachmentDescriptorsPrepared: true,
    descriptorsRemainDataOnly: descriptors.every((descriptor) => descriptor.callableReferenceIncluded === false),
    externalExecutableReferenceBindingResolved: true,
    exactCallableReferenceIdentityPreserved: exactIdentity,
    targetIdentityPreserved: targetIdentity,
    attachmentCapableTargetMaterialized: true,
    attachmentTargetExtensible: Object.isExtensible(target),
    operationMethodSlotsAbsent: false,
    operationMethodSlotsPresent: names.length === 3,
    attachedOperationMethodNames: clone(names),
    attachedOperationMethodCount: names.length,
    attachedMethodPropertyAttributesPreserved: exactAttributes,
    executableReferencesRemainExternalToDescriptors: true,
    executableReferencesRemainExternalToTarget: false,
    executableReferencesCopiedToTarget: true,
    targetMutationPerformedByBoundary: true,
    attachmentAppliedToEntryContainerInstance: true,
    operationMethodsAttachedToInstance: true,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02BX_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BX_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BX_CERTIFIED_TREE_REQUIRED');
  req(input.b02bxCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02BX_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bxCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02BX_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorDescriptorPreparationCertified',
    'actualOperationMethodsAttachmentImplementationMaterialized',
    'attachmentDescriptorsPrepared',
    'descriptorsRemainDataOnly',
    'externalExecutableReferenceBindingResolved',
    'exactCallableReferenceIdentityPreserved',
    'targetIdentityPreserved',
    'targetRemainsExtensible',
    'operationMethodSlotsPresent',
    'allThreeOperationMethodsAttached',
    'attachedMethodPropertyAttributesPreserved',
    'executableReferencesCopiedToTarget',
    'targetMutationPerformedByBoundary',
    'attachmentAppliedToEntryContainerInstance',
    'operationMethodsAttachedToInstance'
  ]) req(input[key] === true, `REQUIRED_ATTACHMENT_APPLICATION_PROOF_MISSING:${key}`);

  for (const key of [
    'executableOperationMethodsInvoked', 'continuationStateStored', 'registryOperationInvoked',
    'registryLookupExecuted', 'registryReleaseExecuted', 'rawStateSerialized', 'rawStateExported',
    'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
    'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'credentialSourceBound',
    'credentialReadExecuted', 'rpcExecuted', 'networkExecuted', 'stagingReadExecuted',
    'stagingMutationExecuted', 'migrationApplied', 'runtimeBindingImplemented', 'runtimeActivated',
    'productionChanged', 'b02bxDescriptorPreparationChanged', 'b02buMaterializationChanged',
    'b02boBindingChanged', 'routeRegistryChanged', 'moduleRouteLoaderChanged', 'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_ATTACHMENT_APPLICATION_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  for (const key of [
    'repositoryOnlyActualOperationMethodsAttachmentApplicationAuthority',
    'operationMethodsAttachmentAuthority',
    'attachmentCapableTargetMutationAuthority',
    'executableReferenceCopyToTargetAuthority'
  ]) req(isObject(authority) && authority[key] === true, `REQUIRED_AUTHORITY_MISSING:${key}`);

  for (const key of [
    'operationMethodInvocationAuthority', 'continuationStateStorageAuthority',
    'registryOperationInvocationAuthority', 'registryLookupAuthority', 'registryReleaseAuthority',
    'resumeSurfaceInvocationAuthority', 'activeExecuteHandlerInvocationAuthority',
    'repositoryOperationInvocationAuthority', 'runtimeBindingAuthority', 'routeRegistryMutationAuthority',
    'moduleRouteLoaderMutationAuthority', 'routeHandlerMutationAuthority', 'credentialSourceBindingAuthority',
    'credentialReadAuthority', 'rpcExecutionAuthority', 'networkAuthority', 'stagingDeploymentAuthority',
    'stagingTrafficAuthority', 'migrationApplicationAuthority', 'runtimeActivationAuthority',
    'productionAuthority', 'pullRequestMergeAuthority', 'readyForReviewAuthority', 'r5iCreationAuthority'
  ]) req(isObject(authority) && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);

  const ready = blockers.length === 0;
  return Object.freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_actual_operation_methods_attachment_certifiable'
      : 'repository_only_actual_operation_methods_attachment_blocked',
    ready,
    blockers,
    targetMutationPerformedByBoundary: ready,
    attachmentAppliedToEntryContainerInstance: ready,
    operationMethodsAttachedToInstance: ready,
    executableOperationMethodsInvoked: false,
    continuationStateStored: false,
    registryOperationInvocationAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction: 'continue_to_next_minimum_repository_only_post_attachment_verification_before_any_operation_method_invocation_or_sensitive_scope'
  });
}

module.exports = Object.freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_TREE,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  REQUIRED_OPERATION_NAMES,
  METHOD_PROPERTY_ATTRIBUTES,
  applyRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachment,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsAttachment,
  evaluateBoundaryCertification
});
