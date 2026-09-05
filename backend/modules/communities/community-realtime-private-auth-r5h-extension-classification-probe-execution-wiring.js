'use strict';

const harness = require('./community-realtime-private-auth-r5h-extension-classification-probe-harness.js');

const CONTRACT_ID = 'com-b03c-r5h-extension-classification-probe-execution-wiring-implementation-v1';
const VALIDATION_ID = 'COM-B03C-R5H-EXTENSION-CLASSIFICATION-PROBE-EXECUTION-WIRING-IMPLEMENTATION';
const STATUS = 'repository_only_execution_wiring_implemented_unbound_execution_disabled_no_remote_authority';
const SPEC_CONTRACT_ID = 'com-b03c-r5h-extension-classification-probe-execution-wiring-specification-v1';
const SPEC_BLOB = '0eab5e1ba23bcbd8adfd5b54bad16acb8a1b1e0d';
const SPEC_CERTIFIED_HEAD = 'a6ac6c76ff22cc34314a177e9496705c94a0bdee';
const SPEC_CERTIFIED_TREE = '973a15523b393476c82a2de83213c35ea15f11af';
const SPEC_CERTIFICATION_RUN = 31922436439;
const SPEC_CERTIFICATION_JOB = 95104395429;
const HARNESS_BLOB = '723d33aea011a28766b819fa823aad82f341aba3';
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const EXECUTION_DISABLED_CODE = 'DOKE_COM_B03C_R5H_EXECUTION_WIRING_REMOTE_EXECUTION_DISABLED';

const PORT_CONTRACTS = [
  { id: 'runtime_adapter', responsibility: 'future_runtime_transport_adapter' },
  { id: 'target_environment', responsibility: 'future_non_production_staging_environment_binding' },
  { id: 'target_resource', responsibility: 'future_exact_staging_resource_binding' },
  { id: 'credential_provider', responsibility: 'future_credential_provider_binding' },
  { id: 'synthetic_identity_lifecycle', responsibility: 'future_synthetic_identity_lifecycle_binding' },
  { id: 'realtime_client_factory', responsibility: 'future_fresh_realtime_client_factory_binding' },
  { id: 'sanitized_evidence_recorder', responsibility: 'future_sanitized_evidence_recording_binding' },
  { id: 'cleanup_verifier', responsibility: 'future_zero_residue_cleanup_verification_binding' }
];

const FORBIDDEN_DESCRIPTOR_KEYS = [
  'value',
  'concreteValue',
  'endpoint',
  'url',
  'secret',
  'secretName',
  'credential',
  'credentials',
  'token',
  'accessToken',
  'refreshToken',
  'identity',
  'identityMaterial',
  'client',
  'runtime',
  'adapter'
];

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
    executionWiringDefined: true,
    executionWiringImplemented: true,
    transportBound: false,
    executionEntryPointExported: false,
    targetEnvironmentBound: false,
    targetResourceBound: false,
    runtimeAdapterBound: false,
    credentialProviderBound: false,
    identityLifecycleBound: false,
    realtimeClientFactoryBound: false,
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
    harnessBlob: HARNESS_BLOB,
    matrixVersion: MATRIX_VERSION,
    maturity: REQUIRED_MATURITY,
    productionGate: REQUIRED_PRODUCTION_GATE,
    lastFunctionalCheckpoint: 'COM-B03C-R5H',
    r5iCreated: false,
    r5iInferred: false,
    implementationPresent: true,
    executionWiringSpecificationDefined: true,
    executionWiringDefined: true,
    executionWiringImplemented: true,
    abstractAdapterContractsImplemented: true,
    remoteRuntimeAdaptersImplemented: false,
    authorizationReadinessEvaluatorImplemented: true,
    transportBound: false,
    executionEntryPointExported: false,
    executionCommandDefined: false,
    executionWorkflowDefined: false,
    targetEnvironmentBound: false,
    targetResourceBound: false,
    runtimeAdapterBound: false,
    credentialProviderBound: false,
    identityLifecycleBound: false,
    realtimeClientFactoryBound: false,
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
    privatePresencePromotionAllowed: false
  });
}

function validateAbstractBindingDescriptor(input = {}) {
  const port = PORT_CONTRACTS.find((item) => item.id === input.slotId);
  if (!port) return blocked('WIRING_KNOWN_ABSTRACT_SLOT_REQUIRED');
  for (const key of FORBIDDEN_DESCRIPTOR_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      return blocked('WIRING_CONCRETE_BINDING_MATERIAL_FORBIDDEN', { slotId: port.id, forbiddenField: key });
    }
  }
  if (input.interfaceOnly !== true || input.bound !== false || input.concreteValuePresent !== false) {
    return blocked('WIRING_SLOT_MUST_REMAIN_INTERFACE_ONLY_AND_UNBOUND', { slotId: port.id });
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'abstract_binding_descriptor_valid_repository_only',
    slotId: port.id,
    responsibility: port.responsibility,
    interfaceOnly: true,
    bound: false,
    concreteValuePresent: false,
    futureBindingRequiresSeparateCertifiedBoundary: true
  });
}

function buildUnboundPortSet() {
  return freeze(PORT_CONTRACTS.map((port) => ({
    slotId: port.id,
    responsibility: port.responsibility,
    interfaceOnly: true,
    bound: false,
    concreteValuePresent: false,
    futureBindingRequiresSeparateCertifiedBoundary: true
  })));
}

function buildUnboundWiringPlan({ identityEnvelopeId, topicEnvelopeId } = {}) {
  const observations = harness.buildObservationPlan({ identityEnvelopeId, topicEnvelopeId });
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_only_unbound_wiring_plan_defined',
    executionEnabled: false,
    transportBound: false,
    executionEntryPointExported: false,
    ports: buildUnboundPortSet(),
    observations,
    observationCount: observations.length,
    exactlyOneObservationPerCase: true,
    freshRealtimeClientPerObservationRequired: true,
    privatePresenceOnlyChannelRequired: true,
    sanitizedEvidenceOnly: true,
    cleanupAndZeroResidueRequired: true,
    crossCaseComparisonRequired: true,
    futureExplicitSingleUseAuthorizationRequired: true,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    privatePresencePromotionAllowed: false
  });
}

function buildInvocationContract({ identityEnvelopeId, topicEnvelopeId } = {}) {
  const plan = buildUnboundWiringPlan({ identityEnvelopeId, topicEnvelopeId });
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_only_invocation_contract_defined_execution_disabled',
    executionEnabled: false,
    callableRemoteEntrypointPresent: false,
    plan,
    requiredFutureBindings: PORT_CONTRACTS.map((item) => item.id),
    requiredFutureAuthorization: {
      fresh: true,
      explicit: true,
      singleUse: true,
      bindsExactCertifiedWiringImplementationHead: true,
      bindsExactNonProductionStagingResource: true
    },
    receiptRequiredLaterInSeparateSingleFileCommit: true,
    triggerRequiredLaterInSeparateCanonicalBoundary: true
  });
}

function evaluateExecutionReadiness({ bindings = [] } = {}) {
  if (!Array.isArray(bindings) || bindings.length !== PORT_CONTRACTS.length) {
    return blocked('WIRING_COMPLETE_UNBOUND_PORT_SET_REQUIRED');
  }
  const seen = new Set();
  for (const descriptor of bindings) {
    const validated = validateAbstractBindingDescriptor(descriptor);
    if (validated.decision !== 'abstract_binding_descriptor_valid_repository_only') return validated;
    if (seen.has(validated.slotId)) return blocked('WIRING_DUPLICATE_SLOT_DESCRIPTOR_FORBIDDEN', { slotId: validated.slotId });
    seen.add(validated.slotId);
  }
  if (PORT_CONTRACTS.some((item) => !seen.has(item.id))) {
    return blocked('WIRING_ALL_ABSTRACT_SLOTS_REQUIRED');
  }
  return blocked('WIRING_RUNTIME_BINDINGS_AND_FRESH_AUTHORIZATION_REQUIRED_SEPARATE_BOUNDARIES', {
    abstractPortSetValidated: true,
    futureTargetBindingRequired: true,
    futureCredentialBindingRequired: true,
    futureIdentityLifecycleBindingRequired: true,
    futureRealtimeFactoryBindingRequired: true,
    futureFreshExplicitSingleUseAuthorizationRequired: true
  });
}

function assertExecutionDisabled() {
  const error = new Error(EXECUTION_DISABLED_CODE);
  error.code = EXECUTION_DISABLED_CODE;
  throw error;
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
  HARNESS_BLOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  EXECUTION_DISABLED_CODE,
  PORT_CONTRACTS: freeze(PORT_CONTRACTS),
  repositoryDescriptor,
  validateAbstractBindingDescriptor,
  buildUnboundPortSet,
  buildUnboundWiringPlan,
  buildInvocationContract,
  evaluateExecutionReadiness,
  assertExecutionDisabled
});
