'use strict';

const CONTRACT_ID = 'com-b03c-r5h-extension-classification-probe-synthetic-identity-lifecycle-repository-implementation-v1';
const VALIDATION_ID = 'COM-B03C-R5H-EXTENSION-CLASSIFICATION-PROBE-SYNTHETIC-IDENTITY-LIFECYCLE-REPOSITORY-IMPLEMENTATION';
const STATUS = 'repository_only_synthetic_identity_lifecycle_contract_implemented_no_identity_reference_no_identity_material_no_provisioning_no_remote_authority';
const IDENTITY_LIFECYCLE_MUTATION_DISABLED_CODE = 'DOKE_COM_B03C_R5H_SYNTHETIC_IDENTITY_LIFECYCLE_REMOTE_MUTATION_DISABLED';
const REQUIRED_PURPOSE = 'realtime_extension_classification_probe';

const FORBIDDEN_REQUEST_FIELDS = Object.freeze([
  'syntheticIdentityReference',
  'syntheticIdentityMaterial',
  'syntheticIdentity',
  'identityReference',
  'identityMaterial',
  'identity',
  'userId',
  'email',
  'password',
  'credentialSecretName',
  'credentialReference',
  'credentialMaterial',
  'rawCredential',
  'accessToken',
  'refreshToken',
  'serviceKey',
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
    syntheticIdentityLifecycleImplementationPresent: true,
    syntheticIdentityLifecycleBindingDefined: false,
    identityLifecycleBound: false,
    identityReferenceBound: false,
    identityMaterialPresent: false,
    identityProvisioningImplemented: false,
    identityDeletionImplemented: false,
    identityMaterializationImplemented: false,
    credentialReadImplemented: false,
    remoteDependencyLoadImplemented: false,
    transportBound: false,
    networkAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
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
    syntheticIdentityLifecycleImplementationPresent: true,
    lifecycleRequestDescriptorValidationImplemented: true,
    identityLifecycleMutationHardBlockImplemented: true,
    syntheticIdentityLifecycleBindingDefined: false,
    identityLifecycleBound: false,
    identityReferenceBound: false,
    identityMaterialPresent: false,
    identityProvisioningImplemented: false,
    identityDeletionImplemented: false,
    identityMaterializationImplemented: false,
    credentialReadImplemented: false,
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

function createLifecycleRequestDescriptor(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return blocked('SYNTHETIC_IDENTITY_LIFECYCLE_REQUEST_OBJECT_REQUIRED');
  }
  for (const key of FORBIDDEN_REQUEST_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      return blocked('SYNTHETIC_IDENTITY_LIFECYCLE_CONCRETE_IDENTITY_INPUT_FORBIDDEN', { forbiddenField: key });
    }
  }
  if (input.purpose !== REQUIRED_PURPOSE) {
    return blocked('SYNTHETIC_IDENTITY_LIFECYCLE_EXACT_PURPOSE_REQUIRED');
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: 'repository_only_identity_lifecycle_request_descriptor_validated',
    purpose: REQUIRED_PURPOSE,
    identityReferenceAllowed: false,
    identityMaterialAllowed: false,
    identityProvisioningAllowed: false,
    identityDeletionAllowed: false,
    identityMaterializationAllowed: false,
    credentialReadAllowed: false,
    transportBound: false,
    networkAuthority: false,
    authIdentityLifecycleAuthority: false,
    remoteExecutionAuthority: false
  });
}

function evaluateRepositoryLifecycleReadiness({ requestDescriptor } = {}) {
  if (!requestDescriptor || requestDescriptor.decision !== 'repository_only_identity_lifecycle_request_descriptor_validated') {
    return blocked('SYNTHETIC_IDENTITY_LIFECYCLE_VALID_REQUEST_DESCRIPTOR_REQUIRED');
  }
  return blocked('SYNTHETIC_IDENTITY_LIFECYCLE_REMOTE_OPERATIONS_REQUIRE_LATER_CERTIFIED_BOUNDARIES_AND_FUTURE_EXPLICIT_AUTHORIZATION', {
    requestDescriptorValidated: true,
    syntheticIdentityLifecycleImplementationPresent: true,
    separateRemoteIdentityBoundaryRequired: true,
    futureExplicitSingleUseAuthorizationRequired: true
  });
}

function assertIdentityLifecycleMutationDisabled() {
  const error = new Error(IDENTITY_LIFECYCLE_MUTATION_DISABLED_CODE);
  error.code = IDENTITY_LIFECYCLE_MUTATION_DISABLED_CODE;
  throw error;
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  IDENTITY_LIFECYCLE_MUTATION_DISABLED_CODE,
  REQUIRED_PURPOSE,
  FORBIDDEN_REQUEST_FIELDS,
  repositoryDescriptor,
  createLifecycleRequestDescriptor,
  evaluateRepositoryLifecycleReadiness,
  assertIdentityLifecycleMutationDisabled
});
