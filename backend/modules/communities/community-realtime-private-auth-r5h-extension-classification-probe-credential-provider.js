'use strict';

const CONTRACT_ID = 'com-b03c-r5h-extension-classification-probe-credential-provider-repository-implementation-v1';
const VALIDATION_ID = 'COM-B03C-R5H-EXTENSION-CLASSIFICATION-PROBE-CREDENTIAL-PROVIDER-REPOSITORY-IMPLEMENTATION';
const STATUS = 'repository_only_credential_provider_contract_implemented_no_secret_binding_no_credential_read_no_remote_authority';
const CREDENTIAL_READ_DISABLED_CODE = 'DOKE_COM_B03C_R5H_CREDENTIAL_PROVIDER_CREDENTIAL_READ_DISABLED';
const REQUIRED_PURPOSE = 'realtime_extension_classification_probe';

const FORBIDDEN_REQUEST_FIELDS = Object.freeze([
  'credentialSecretName',
  'credentialReference',
  'credentialMaterial',
  'rawCredential',
  'accessToken',
  'refreshToken',
  'serviceKey',
  'password',
  'networkEndpoint',
  'remoteClient'
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
    credentialProviderImplementationPresent: true,
    credentialProviderBindingDefined: false,
    credentialProviderBound: false,
    credentialReadImplemented: false,
    secretResolutionImplemented: false,
    credentialReferenceResolutionImplemented: false,
    remoteDependencyLoadImplemented: false,
    transportBound: false,
    networkAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
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
    credentialProviderImplementationPresent: true,
    requestDescriptorValidationImplemented: true,
    credentialReadHardBlockImplemented: true,
    credentialProviderBindingDefined: false,
    credentialProviderBound: false,
    secretSourceBound: false,
    credentialReferenceBound: false,
    credentialMaterialPresent: false,
    credentialReadImplemented: false,
    secretResolutionImplemented: false,
    credentialReferenceResolutionImplemented: false,
    remoteDependencyLoadImplemented: false,
    transportBound: false,
    networkAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    identityProvisioningAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteExecutionAuthority: false,
    executionAttempted: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    privatePresencePromotionAllowed: false
  });
}

function createCredentialRequestDescriptor(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return blocked('CREDENTIAL_PROVIDER_REQUEST_OBJECT_REQUIRED');
  }
  for (const key of FORBIDDEN_REQUEST_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      return blocked('CREDENTIAL_PROVIDER_CONCRETE_CREDENTIAL_INPUT_FORBIDDEN', { forbiddenField: key });
    }
  }
  if (input.purpose !== REQUIRED_PURPOSE) {
    return blocked('CREDENTIAL_PROVIDER_EXACT_PURPOSE_REQUIRED');
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: 'repository_only_credential_request_descriptor_validated',
    purpose: REQUIRED_PURPOSE,
    credentialLookupAllowed: false,
    credentialReferenceResolutionAllowed: false,
    credentialMaterialAllowed: false,
    transportBound: false,
    networkAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteExecutionAuthority: false
  });
}

function evaluateRepositoryCredentialProviderReadiness({ requestDescriptor } = {}) {
  if (!requestDescriptor || requestDescriptor.decision !== 'repository_only_credential_request_descriptor_validated') {
    return blocked('CREDENTIAL_PROVIDER_VALID_REQUEST_DESCRIPTOR_REQUIRED');
  }
  return blocked('CREDENTIAL_PROVIDER_SOURCE_REQUIRES_SEPARATE_CERTIFIED_BOUNDARY_AND_FUTURE_EXPLICIT_AUTHORIZATION', {
    requestDescriptorValidated: true,
    credentialProviderImplementationPresent: true,
    separateCredentialSourceBoundaryRequired: true,
    futureExplicitSingleUseAuthorizationRequired: true
  });
}

function assertCredentialReadDisabled() {
  const error = new Error(CREDENTIAL_READ_DISABLED_CODE);
  error.code = CREDENTIAL_READ_DISABLED_CODE;
  throw error;
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  CREDENTIAL_READ_DISABLED_CODE,
  REQUIRED_PURPOSE,
  FORBIDDEN_REQUEST_FIELDS,
  repositoryDescriptor,
  createCredentialRequestDescriptor,
  evaluateRepositoryCredentialProviderReadiness,
  assertCredentialReadDisabled
});
