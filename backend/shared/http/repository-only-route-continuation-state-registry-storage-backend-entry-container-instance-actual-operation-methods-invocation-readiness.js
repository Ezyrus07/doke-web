'use strict';

const verification = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-post-attachment-verification');
const targetModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-attachment-capable-target-materialization');
const bindingModule = require('./repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-executable-operation-method-references-binding');

const CONTRACT_ID = 'com-b02ca-repository-only-continuation-state-registry-storage-backend-entry-container-instance-actual-operation-methods-invocation-readiness-v1';
const BOUNDARY_ID = 'COM-B02CA';
const PREDECESSOR_CONTRACT_ID = verification.CONTRACT_ID;
const PREDECESSOR_HEAD = '596ca5c12d2ea517ab3e09a3af4329b41d3854dc';
const PREDECESSOR_TREE = 'aa7c5407aa1d7668ac9a7b9644ba7e4438e3ea25';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32613148769;
const PREDECESSOR_CERTIFICATION_JOB_ID = 97129303181;
const REQUIRED_OPERATION_NAMES = verification.REQUIRED_OPERATION_NAMES;
const METHOD_PROPERTY_ATTRIBUTES = verification.METHOD_PROPERTY_ATTRIBUTES;

const INVOCATION_READINESS_REQUIREMENTS = Object.freeze([
  'certified_b02bz_post_attachment_verification_present',
  'exactly_three_attached_operation_methods_present',
  'exact_callable_reference_identity_preserved',
  'attached_method_property_attributes_preserved',
  'target_identity_preserved_and_extensible',
  'deterministic_repository_only_synthetic_invocation_harness_required_before_invocation',
  'no_operation_method_invocation_during_readiness',
  'no_state_registry_runtime_network_or_remote_side_effects_during_readiness'
]);

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

function describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsInvocationReadiness() {
  const predecessor = verification.describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsPostAttachmentVerification();
  const target = targetModule.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget();
  const binding = bindingModule.createRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceExecutableOperationMethodReferencesBinding();

  const predecessorPostAttachmentVerificationCertified =
    predecessor.contractId === PREDECESSOR_CONTRACT_ID &&
    predecessor.boundaryId === 'COM-B02BZ' &&
    predecessor.decision === 'repository_only_actual_operation_methods_post_attachment_verified' &&
    predecessor.postAttachmentVerificationPerformed === true &&
    predecessor.allThreeOperationMethodsPresent === true &&
    predecessor.attachedOperationMethodCount === REQUIRED_OPERATION_NAMES.length &&
    predecessor.exactCallableReferenceIdentityPreserved === true &&
    predecessor.attachedMethodPropertyAttributesPreserved === true &&
    predecessor.targetIdentityPreserved === true &&
    predecessor.targetRemainsExtensible === true &&
    predecessor.executableOperationMethodsInvoked === false &&
    predecessor.continuationStateStored === false &&
    predecessor.registryOperationInvoked === false &&
    predecessor.registryLookupExecuted === false &&
    predecessor.registryReleaseExecuted === false &&
    predecessor.networkExecuted === false &&
    predecessor.runtimeActivated === false &&
    predecessor.productionChanged === false;

  const descriptorChecks = REQUIRED_OPERATION_NAMES.map((operationName) => {
    const targetProperty = Object.getOwnPropertyDescriptor(target, operationName);
    const hiddenName = bindingModule.HIDDEN_REFERENCE_PROPERTIES[operationName];
    const bindingProperty = Object.getOwnPropertyDescriptor(binding, hiddenName);

    return {
      operationName,
      callablePresent: typeof targetProperty?.value === 'function',
      exactCallableReferenceIdentityPreserved:
        typeof targetProperty?.value === 'function' &&
        typeof bindingProperty?.value === 'function' &&
        targetProperty.value === bindingProperty.value,
      enumerable: targetProperty?.enumerable,
      writable: targetProperty?.writable,
      configurable: targetProperty?.configurable
    };
  });

  const callableOperationMethodsAvailable =
    descriptorChecks.length === REQUIRED_OPERATION_NAMES.length &&
    descriptorChecks.every((check) => check.callablePresent === true);

  const exactCallableReferenceIdentityPreserved =
    descriptorChecks.every((check) => check.exactCallableReferenceIdentityPreserved === true);

  const attachedMethodPropertyAttributesPreserved =
    descriptorChecks.every((check) =>
      check.enumerable === METHOD_PROPERTY_ATTRIBUTES.enumerable &&
      check.writable === METHOD_PROPERTY_ATTRIBUTES.writable &&
      check.configurable === METHOD_PROPERTY_ATTRIBUTES.configurable
    );

  const targetIdentityPreserved =
    target === targetModule.getRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceAttachmentCapableTarget() &&
    predecessor.targetIdentityPreserved === true;

  const readinessPreconditionsSatisfied =
    predecessorPostAttachmentVerificationCertified &&
    callableOperationMethodsAvailable &&
    exactCallableReferenceIdentityPreserved &&
    attachedMethodPropertyAttributesPreserved &&
    targetIdentityPreserved &&
    Object.isExtensible(target) === true;

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    decision: readinessPreconditionsSatisfied
      ? 'repository_only_actual_operation_methods_invocation_readiness_materialized'
      : 'repository_only_actual_operation_methods_invocation_readiness_blocked',
    requiredOperationNames: clone(REQUIRED_OPERATION_NAMES),
    methodPropertyAttributes: clone(METHOD_PROPERTY_ATTRIBUTES),
    invocationReadinessRequirements: [...INVOCATION_READINESS_REQUIREMENTS],
    descriptorChecks: clone(descriptorChecks),
    predecessorPostAttachmentVerificationCertified,
    operationMethodInvocationReadinessMaterialized: true,
    invocationPreconditionsClassified: true,
    callableOperationMethodsAvailable,
    attachedOperationMethodCount: descriptorChecks.filter((check) => check.callablePresent).length,
    exactCallableReferenceIdentityPreserved,
    attachedMethodPropertyAttributesPreserved,
    targetIdentityPreserved,
    targetRemainsExtensible: Object.isExtensible(target),
    deterministicRepositoryOnlySyntheticInvocationRequired: true,
    deterministicRepositoryOnlySyntheticInvocationHarnessRequired: true,
    deterministicRepositoryOnlySyntheticInvocationHarnessMaterialized: false,
    actualOperationMethodInvocationPrerequisitesSatisfied: false,
    missingPrerequisiteCodes: ['DETERMINISTIC_REPOSITORY_ONLY_SYNTHETIC_INVOCATION_HARNESS_REQUIRED'],
    targetMutationPerformedByReadinessBoundary: false,
    operationMethodsAttachedByReadinessBoundary: false,
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

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02BZ_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02BZ_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02BZ_CERTIFIED_TREE_REQUIRED');
  req(input.b02bzCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02BZ_CERTIFICATION_RUN_REQUIRED');
  req(input.b02bzCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02BZ_CERTIFICATION_JOB_REQUIRED');

  for (const key of [
    'predecessorPostAttachmentVerificationCertified',
    'operationMethodInvocationReadinessMaterialized',
    'invocationPreconditionsClassified',
    'callableOperationMethodsAvailable',
    'exactCallableReferenceIdentityPreserved',
    'attachedMethodPropertyAttributesPreserved',
    'targetIdentityPreserved',
    'targetRemainsExtensible',
    'deterministicRepositoryOnlySyntheticInvocationRequired',
    'deterministicRepositoryOnlySyntheticInvocationHarnessRequired'
  ]) req(input[key] === true, `REQUIRED_INVOCATION_READINESS_PROOF_MISSING:${key}`);

  req(input.attachedOperationMethodCount === REQUIRED_OPERATION_NAMES.length,
    'EXACTLY_THREE_ATTACHED_OPERATION_METHODS_REQUIRED');
  req(input.deterministicRepositoryOnlySyntheticInvocationHarnessMaterialized === false,
    'INVOCATION_HARNESS_MUST_REMAIN_UNMATERIALIZED');
  req(input.actualOperationMethodInvocationPrerequisitesSatisfied === false,
    'ACTUAL_INVOCATION_PREREQUISITES_MUST_REMAIN_UNSATISFIED');
  req(Array.isArray(input.missingPrerequisiteCodes) &&
    input.missingPrerequisiteCodes.length === 1 &&
    input.missingPrerequisiteCodes[0] === 'DETERMINISTIC_REPOSITORY_ONLY_SYNTHETIC_INVOCATION_HARNESS_REQUIRED',
  'EXACT_INVOCATION_READINESS_MISSING_PREREQUISITE_REQUIRED');

  for (const key of [
    'targetMutationPerformedByReadinessBoundary',
    'operationMethodsAttachedByReadinessBoundary',
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
    'b02bzVerificationChanged',
    'b02byAttachmentChanged',
    'b02buMaterializationChanged',
    'b02boBindingChanged',
    'routeRegistryChanged',
    'moduleRouteLoaderChanged',
    'routeHandlersChanged'
  ]) req(input[key] === false, `PROHIBITED_INVOCATION_READINESS_EFFECT_MUST_REMAIN_FALSE:${key}`);

  const authority = input.authority;
  req(isObject(authority) && authority.repositoryOnlyOperationMethodInvocationReadinessAuthority === true,
    'REPOSITORY_ONLY_OPERATION_METHOD_INVOCATION_READINESS_AUTHORITY_REQUIRED');

  for (const key of [
    'deterministicSyntheticInvocationHarnessMaterializationAuthority',
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
      ? 'repository_only_actual_operation_methods_invocation_readiness_certifiable'
      : 'repository_only_actual_operation_methods_invocation_readiness_blocked',
    ready,
    blockers,
    operationMethodInvocationReadinessMaterialized: ready,
    deterministicRepositoryOnlySyntheticInvocationHarnessMaterialized: false,
    actualOperationMethodInvocationPrerequisitesSatisfied: false,
    executableOperationMethodsInvoked: false,
    continuationStateStored: false,
    registryOperationInvocationAuthority: false,
    networkAuthority: false,
    runtimeActivationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction:
      'stop_and_require_fresh_explicit_authorization_before_any_deterministic_repository_only_synthetic_invocation_harness_boundary_or_operation_method_invocation_state_storage_registry_execution_or_sensitive_scope'
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
  INVOCATION_READINESS_REQUIREMENTS,
  describeRepositoryOnlyContinuationStateRegistryStorageBackendEntryContainerInstanceActualOperationMethodsInvocationReadiness,
  evaluateBoundaryCertification
});
