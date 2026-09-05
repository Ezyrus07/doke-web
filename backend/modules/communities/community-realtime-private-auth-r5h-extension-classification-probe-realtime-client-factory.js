'use strict';

const CONTRACT_ID = 'com-b03c-r5h-extension-classification-probe-realtime-client-factory-repository-implementation-v1';
const VALIDATION_ID = 'COM-B03C-R5H-EXTENSION-CLASSIFICATION-PROBE-REALTIME-CLIENT-FACTORY-REPOSITORY-IMPLEMENTATION';
const STATUS = 'repository_only_realtime_client_factory_contract_implemented_no_client_instantiation_no_endpoint_no_transport_no_remote_authority';
const REMOTE_CLIENT_INSTANTIATION_DISABLED_CODE = 'DOKE_COM_B03C_R5H_REALTIME_CLIENT_FACTORY_REMOTE_INSTANTIATION_DISABLED';
const REQUIRED_PURPOSE = 'realtime_extension_classification_probe';
const REQUIRED_CLIENT_LIFECYCLE = 'fresh_client_per_observation';
const REQUIRED_DISPOSAL_LIFECYCLE = 'dispose_after_each_observation';

const FORBIDDEN_REQUEST_FIELDS = Object.freeze([
  'realtimeClientFactory',
  'runtimeClient',
  'remoteClient',
  'client',
  'networkEndpoint',
  'endpoint',
  'projectUrl',
  'projectRef',
  'apiKey',
  'anonKey',
  'serviceKey',
  'serviceRoleKey',
  'credentialSecretName',
  'credentialReference',
  'credentialMaterial',
  'rawCredential',
  'accessToken',
  'refreshToken',
  'syntheticIdentityReference',
  'syntheticIdentityMaterial',
  'syntheticIdentity',
  'userId',
  'email',
  'password',
  'channel',
  'subscription'
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
    realtimeClientFactoryImplementationPresent: true,
    realtimeClientFactoryBindingDefined: false,
    realtimeClientFactoryBound: false,
    freshClientPerObservationContractPreserved: true,
    clientDisposalAfterEachObservationContractPreserved: true,
    clientInstantiationImplemented: false,
    clientDisposalImplemented: false,
    remoteDependencyLoadImplemented: false,
    transportBound: false,
    networkAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteExecutionAuthority: false,
    executionAttempted: false,
    r5iCreated: false,
    r5iInferred: false,
    ...extra
  });
}

function repositoryDescriptor() {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    lastFunctionalCheckpoint: 'COM-B03C-R5H',
    r5iCreated: false,
    r5iInferred: false,
    implementationPresent: true,
    realtimeClientFactoryImplementationPresent: true,
    factoryRequestDescriptorValidationImplemented: true,
    remoteClientInstantiationHardBlockImplemented: true,
    realtimeClientFactoryBindingDefined: false,
    realtimeClientFactoryBound: false,
    freshClientPerObservationContractPreserved: true,
    clientDisposalAfterEachObservationContractPreserved: true,
    clientInstantiationImplemented: false,
    clientDisposalImplemented: false,
    remoteDependencyLoadImplemented: false,
    transportBound: false,
    networkAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteExecutionAuthority: false,
    executionAttempted: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    privatePresencePromotionAllowed: false
  });
}

function createFactoryRequestDescriptor(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return blocked('REALTIME_CLIENT_FACTORY_REQUEST_OBJECT_REQUIRED');
  }
  for (const key of FORBIDDEN_REQUEST_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      return blocked('REALTIME_CLIENT_FACTORY_CONCRETE_RUNTIME_INPUT_FORBIDDEN', { forbiddenField: key });
    }
  }
  if (input.purpose !== REQUIRED_PURPOSE) {
    return blocked('REALTIME_CLIENT_FACTORY_EXACT_PURPOSE_REQUIRED');
  }
  if (input.clientLifecycle !== REQUIRED_CLIENT_LIFECYCLE) {
    return blocked('REALTIME_CLIENT_FACTORY_FRESH_CLIENT_PER_OBSERVATION_REQUIRED');
  }
  if (input.disposalLifecycle !== REQUIRED_DISPOSAL_LIFECYCLE) {
    return blocked('REALTIME_CLIENT_FACTORY_DISPOSAL_AFTER_EACH_OBSERVATION_REQUIRED');
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: 'repository_only_realtime_client_factory_request_descriptor_validated',
    purpose: REQUIRED_PURPOSE,
    clientLifecycle: REQUIRED_CLIENT_LIFECYCLE,
    disposalLifecycle: REQUIRED_DISPOSAL_LIFECYCLE,
    freshClientPerObservationRequired: true,
    clientDisposalAfterEachObservationRequired: true,
    clientInstantiationAllowed: false,
    endpointAllowed: false,
    credentialReadAllowed: false,
    identityLifecycleMutationAllowed: false,
    remoteDependencyLoadAllowed: false,
    transportBound: false,
    networkAuthority: false,
    realtimeSubscriptionAuthority: false,
    remoteExecutionAuthority: false
  });
}

function evaluateRepositoryFactoryReadiness({ requestDescriptor } = {}) {
  if (!requestDescriptor || requestDescriptor.decision !== 'repository_only_realtime_client_factory_request_descriptor_validated') {
    return blocked('REALTIME_CLIENT_FACTORY_VALID_REQUEST_DESCRIPTOR_REQUIRED');
  }
  return blocked('REALTIME_CLIENT_FACTORY_REMOTE_CLIENT_REQUIRES_LATER_CERTIFIED_BOUNDARIES_AND_FUTURE_EXPLICIT_AUTHORIZATION', {
    requestDescriptorValidated: true,
    freshClientPerObservationRequired: true,
    clientDisposalAfterEachObservationRequired: true,
    separateRuntimeCompositionBoundaryRequired: true,
    futureExplicitSingleUseAuthorizationRequired: true
  });
}

function assertRemoteClientInstantiationDisabled() {
  const error = new Error(REMOTE_CLIENT_INSTANTIATION_DISABLED_CODE);
  error.code = REMOTE_CLIENT_INSTANTIATION_DISABLED_CODE;
  throw error;
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  REMOTE_CLIENT_INSTANTIATION_DISABLED_CODE,
  REQUIRED_PURPOSE,
  REQUIRED_CLIENT_LIFECYCLE,
  REQUIRED_DISPOSAL_LIFECYCLE,
  FORBIDDEN_REQUEST_FIELDS,
  repositoryDescriptor,
  createFactoryRequestDescriptor,
  evaluateRepositoryFactoryReadiness,
  assertRemoteClientInstantiationDisabled
});
