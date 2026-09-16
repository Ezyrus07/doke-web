'use strict';

const runtimeTargetBinding = require('./community-realtime-private-auth-r5h-extension-classification-probe-runtime-target-binding.js');

const CONTRACT_ID = 'com-b03c-r5h-extension-classification-probe-concrete-runtime-adapter-binding-implementation-v1';
const VALIDATION_ID = 'COM-B03C-R5H-EXTENSION-CLASSIFICATION-PROBE-CONCRETE-RUNTIME-ADAPTER-BINDING-IMPLEMENTATION';
const STATUS = 'repository_only_concrete_runtime_adapter_implementation_defined_unbound_no_remote_authority';
const SPEC_CONTRACT_ID = 'com-b03c-r5h-extension-classification-probe-concrete-runtime-adapter-binding-specification-v1';
const SPEC_BLOB = '9f30614b073b62eb90724867204f95b02373020a';
const SPEC_CERTIFIED_HEAD = '6cdd58b2d436acaaf72c160ddde55869ea0e3a63';
const SPEC_CERTIFIED_TREE = 'bf29205415fffc4af1bbed2b54ccfebb5766926e';
const SPEC_CERTIFICATION_RUN = 31951610351;
const SPEC_CERTIFICATION_JOB = 95175797464;
const SPEC_CERTIFIER_BLOB = 'c8cf38e556a977f808a95727e8eafc50ac91673b';
const PARENT_RUNTIME_TARGET_BINDING_MODULE_BLOB = '759935689fccc695cf7bcfa5d495fefb0965d8be';
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const REMOTE_EXECUTION_DISABLED_CODE = 'DOKE_COM_B03C_R5H_CONCRETE_RUNTIME_ADAPTER_REMOTE_EXECUTION_DISABLED';

const CASE_PREDICATES = Object.freeze({
  extension_unavailable_or_null: 'extension IS NULL',
  extension_expected_presence_value: "extension = 'presence'",
  extension_unexpected_non_null_value: "extension IS NOT NULL AND extension <> 'presence'"
});

const DELEGATED_PORTS = Object.freeze([
  'target_environment',
  'target_resource',
  'credential_provider',
  'synthetic_identity_lifecycle',
  'realtime_client_factory',
  'sanitized_evidence_recorder',
  'cleanup_verifier'
]);

const ALLOWED_OUTPUT_FIELDS = Object.freeze([
  'caseId',
  'extensionPredicate',
  'sanitizedClassification',
  'terminalChannelStatus',
  'joinSubscribed',
  'cleanupAttempted',
  'cleanupSucceeded',
  'zeroResidue',
  'observationSequence',
  'crossCaseComparable'
]);

const FORBIDDEN_OUTPUT_FIELDS = Object.freeze([
  'rawRemoteError',
  'rawCredential',
  'rawSyntheticIdentity',
  'rawRemotePayload',
  'unredactedEndpointParameters'
]);

const FORBIDDEN_CONCRETE_BINDING_FIELDS = Object.freeze([
  'stableEnvironmentIdentifier',
  'stableResourceIdentifier',
  'resourceScopeFingerprint',
  'credentialMaterial',
  'credentialSecretName',
  'syntheticIdentity',
  'networkEndpoint',
  'remoteClient',
  'runtimeClient'
]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: 'blocked_repository_only',
    reason,
    concreteRuntimeAdapterBindingSpecificationDefined: true,
    concreteRuntimeAdapterBindingImplementationBoundaryDefined: true,
    runtimeAdapterImplementationPresent: true,
    runtimeAdapterBindingDefined: false,
    runtimeAdapterBound: false,
    transportBound: false,
    executionEntryPointExported: false,
    targetEnvironmentBound: false,
    targetResourceBound: false,
    credentialProviderBound: false,
    identityLifecycleBound: false,
    realtimeClientFactoryBound: false,
    sanitizedEvidenceRecorderBound: false,
    cleanupVerifierBound: false,
    triggerCreated: false,
    receiptCreated: false,
    explicitExecutionAuthorizationReceived: false,
    executionAttempted: false,
    remoteExecutionAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    networkAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    privatePresencePromotionAllowed: false,
    ...extra
  });
}

function repositoryDescriptor() {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    specificationContractId: SPEC_CONTRACT_ID,
    specificationBlob: SPEC_BLOB,
    specificationCertifiedHead: SPEC_CERTIFIED_HEAD,
    specificationCertifiedTree: SPEC_CERTIFIED_TREE,
    specificationCertificationRun: SPEC_CERTIFICATION_RUN,
    specificationCertificationJob: SPEC_CERTIFICATION_JOB,
    specificationCertifierBlob: SPEC_CERTIFIER_BLOB,
    parentRuntimeTargetBindingModuleBlob: PARENT_RUNTIME_TARGET_BINDING_MODULE_BLOB,
    matrixVersion: MATRIX_VERSION,
    maturity: REQUIRED_MATURITY,
    productionGate: REQUIRED_PRODUCTION_GATE,
    lastFunctionalCheckpoint: 'COM-B03C-R5H',
    r5iCreated: false,
    r5iInferred: false,
    implementationPresent: true,
    concreteRuntimeAdapterBindingSpecificationDefined: true,
    concreteRuntimeAdapterBindingImplementationBoundaryDefined: true,
    validatedCaseAdapterImplemented: true,
    delegatedPortContractImplemented: true,
    sanitizedOutputGateImplemented: true,
    repositoryReadinessEvaluatorImplemented: true,
    remoteExecutionHardBlockImplemented: true,
    runtimeAdapterImplementationPresent: true,
    runtimeAdapterBindingDefined: false,
    runtimeAdapterBound: false,
    transportBound: false,
    executionEntryPointExported: false,
    targetEnvironmentBound: false,
    targetResourceBound: false,
    credentialProviderBound: false,
    identityLifecycleBound: false,
    realtimeClientFactoryBound: false,
    sanitizedEvidenceRecorderBound: false,
    cleanupVerifierBound: false,
    executionWorkflowDefined: false,
    triggerCreated: false,
    receiptCreated: false,
    explicitExecutionAuthorizationReceived: false,
    executionAttempted: false,
    remoteExecutionAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    networkAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    privatePresencePromotionAllowed: false,
    privateTypingBroadcastProven: false,
    channelMessagesCanonicalRemoteAuthority: false
  });
}

function validateObservationPlanCase(input = {}) {
  const predicate = CASE_PREDICATES[input.caseId];
  if (!predicate) return blocked('CONCRETE_RUNTIME_ADAPTER_KNOWN_CASE_REQUIRED');
  if (input.extensionPredicate !== predicate) {
    return blocked('CONCRETE_RUNTIME_ADAPTER_CASE_PREDICATE_DRIFT', { caseId: input.caseId });
  }
  if (input.validatedObservationPlanCase !== true) {
    return blocked('CONCRETE_RUNTIME_ADAPTER_VALIDATED_OBSERVATION_PLAN_CASE_REQUIRED', { caseId: input.caseId });
  }
  if (input.freshRealtimeClientRequired !== true || input.privateChannelRequired !== true || input.presenceOnlyRequired !== true) {
    return blocked('CONCRETE_RUNTIME_ADAPTER_OBSERVATION_INVARIANTS_REQUIRED', { caseId: input.caseId });
  }
  for (const key of FORBIDDEN_CONCRETE_BINDING_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      return blocked('CONCRETE_RUNTIME_ADAPTER_CONCRETE_BINDING_MATERIAL_FORBIDDEN', { caseId: input.caseId, forbiddenField: key });
    }
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_only_validated_observation_plan_case',
    caseId: input.caseId,
    extensionPredicate: predicate,
    freshRealtimeClientRequired: true,
    privateChannelRequired: true,
    presenceOnlyRequired: true,
    transportBound: false,
    executionEnabled: false
  });
}

function delegatedPortDescriptor(slotId) {
  if (!DELEGATED_PORTS.includes(slotId)) return blocked('CONCRETE_RUNTIME_ADAPTER_KNOWN_DELEGATED_PORT_REQUIRED');
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_only_delegated_port_descriptor',
    slotId,
    mustBeInjectedBySeparateCertifiedBindingBoundary: true,
    bound: false,
    concreteValuePresent: false
  });
}

function buildAdapterInvocationPlan(input = {}) {
  const validatedCase = validateObservationPlanCase(input);
  if (validatedCase.decision !== 'repository_only_validated_observation_plan_case') return validatedCase;
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_only_concrete_runtime_adapter_invocation_plan_defined',
    caseId: validatedCase.caseId,
    extensionPredicate: validatedCase.extensionPredicate,
    exactlyOneCasePerInvocation: true,
    freshRealtimeClientRequired: true,
    privateChannelRequired: true,
    presenceOnlyRequired: true,
    delegatedPorts: DELEGATED_PORTS.map(delegatedPortDescriptor),
    allowedOutputFields: [...ALLOWED_OUTPUT_FIELDS],
    forbiddenOutputFields: [...FORBIDDEN_OUTPUT_FIELDS],
    cleanupAndZeroResidueRequired: true,
    terminalStatusAloneCannotProveCause: true,
    crossCaseComparisonRequiredBeforeCausalDecision: true,
    transportBound: false,
    executionEnabled: false,
    remoteExecutionAuthority: false
  });
}

function sanitizeAdapterObservation(input = {}) {
  for (const key of FORBIDDEN_OUTPUT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      return blocked('CONCRETE_RUNTIME_ADAPTER_RAW_REMOTE_OUTPUT_FORBIDDEN', { forbiddenField: key });
    }
  }
  const predicate = CASE_PREDICATES[input.caseId];
  if (!predicate || input.extensionPredicate !== predicate) {
    return blocked('CONCRETE_RUNTIME_ADAPTER_SANITIZED_OUTPUT_CASE_DRIFT');
  }
  const output = {};
  for (const key of ALLOWED_OUTPUT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) output[key] = input[key];
  }
  output.caseId = input.caseId;
  output.extensionPredicate = predicate;
  return freeze(output);
}

function evaluateRepositoryAdapterReadiness({ invocationPlan, delegatedPortBindings = {} } = {}) {
  if (!invocationPlan || invocationPlan.decision !== 'repository_only_concrete_runtime_adapter_invocation_plan_defined') {
    return blocked('CONCRETE_RUNTIME_ADAPTER_VALID_INVOCATION_PLAN_REQUIRED');
  }
  if (!delegatedPortBindings || typeof delegatedPortBindings !== 'object' || Array.isArray(delegatedPortBindings)) {
    return blocked('CONCRETE_RUNTIME_ADAPTER_DELEGATED_PORT_BINDING_MAP_REQUIRED');
  }
  for (const slotId of DELEGATED_PORTS) {
    if (Object.prototype.hasOwnProperty.call(delegatedPortBindings, slotId) && delegatedPortBindings[slotId] != null) {
      return blocked('CONCRETE_RUNTIME_ADAPTER_PORT_BINDING_REQUIRES_SEPARATE_CERTIFIED_BOUNDARY', { slotId });
    }
  }
  return blocked('CONCRETE_RUNTIME_ADAPTER_ALL_PORT_BINDINGS_REQUIRE_SEPARATE_CERTIFIED_BOUNDARIES', {
    validatedInvocationPlanPresent: true,
    runtimeAdapterImplementationPresent: true,
    runtimeAdapterBindingRequiredLater: true,
    targetEnvironmentBindingRequiredLater: true,
    targetResourceBindingRequiredLater: true,
    dependentPortBindingsRequiredLater: true,
    freshExplicitSingleUseAuthorizationRequiredLater: true
  });
}

function assertRemoteExecutionDisabled() {
  const error = new Error(REMOTE_EXECUTION_DISABLED_CODE);
  error.code = REMOTE_EXECUTION_DISABLED_CODE;
  throw error;
}

const parentDescriptor = runtimeTargetBinding.repositoryDescriptor();
if (parentDescriptor.runtimeTargetBindingImplementationBoundaryDefined !== true) {
  throw new Error('DOKE_COM_B03C_R5H_PARENT_RUNTIME_TARGET_BINDING_IMPLEMENTATION_NOT_CERTIFIED');
}
if (parentDescriptor.runtimeTargetBindingDefined !== false || parentDescriptor.runtimeTargetBindingImplemented !== false || parentDescriptor.concreteBindingPresent !== false) {
  throw new Error('DOKE_COM_B03C_R5H_PARENT_RUNTIME_TARGET_BINDING_MUST_REMAIN_UNBOUND');
}
if (parentDescriptor.transportBound !== false || parentDescriptor.remoteExecutionAuthority !== false) {
  throw new Error('DOKE_COM_B03C_R5H_PARENT_RUNTIME_TARGET_BINDING_REMOTE_AUTHORITY_FORBIDDEN');
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  SPEC_CONTRACT_ID,
  SPEC_BLOB,
  SPEC_CERTIFIED_HEAD,
  SPEC_CERTIFIED_TREE,
  SPEC_CERTIFICATION_RUN,
  SPEC_CERTIFICATION_JOB,
  SPEC_CERTIFIER_BLOB,
  PARENT_RUNTIME_TARGET_BINDING_MODULE_BLOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  REMOTE_EXECUTION_DISABLED_CODE,
  CASE_PREDICATES,
  DELEGATED_PORTS,
  ALLOWED_OUTPUT_FIELDS,
  FORBIDDEN_OUTPUT_FIELDS,
  repositoryDescriptor,
  validateObservationPlanCase,
  delegatedPortDescriptor,
  buildAdapterInvocationPlan,
  sanitizeAdapterObservation,
  evaluateRepositoryAdapterReadiness,
  assertRemoteExecutionDisabled
});
