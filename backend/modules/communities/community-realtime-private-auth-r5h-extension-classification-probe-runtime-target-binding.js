'use strict';

const wiring = require('./community-realtime-private-auth-r5h-extension-classification-probe-execution-wiring.js');

const CONTRACT_ID = 'com-b03c-r5h-extension-classification-probe-runtime-target-binding-implementation-v1';
const VALIDATION_ID = 'COM-B03C-R5H-EXTENSION-CLASSIFICATION-PROBE-RUNTIME-TARGET-BINDING-IMPLEMENTATION';
const STATUS = 'repository_only_runtime_target_binding_descriptor_implementation_defined_unbound_no_remote_authority';
const SPEC_CONTRACT_ID = 'com-b03c-r5h-extension-classification-probe-runtime-target-binding-specification-v1';
const SPEC_BLOB = '9ad9c4ac7a8863ff54cde18bd898483685346906';
const SPEC_CERTIFIED_HEAD = '6c122f6971644767cce56f422596496b1dbb944b';
const SPEC_CERTIFIED_TREE = 'a6da2b37f6754b4c60954de236a2e07cdf84bc3e';
const SPEC_CERTIFICATION_RUN = 31923462148;
const SPEC_CERTIFICATION_JOB = 95107116464;
const WIRING_MODULE_BLOB = '27c1e962f0da3dbf2aaf7f122fa79211d5483dc2';
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const REMOTE_BINDING_DISABLED_CODE = 'DOKE_COM_B03C_R5H_RUNTIME_TARGET_REMOTE_BINDING_DISABLED';

const PRIMARY_BINDING_SCHEMAS = Object.freeze({
  runtime_adapter: Object.freeze({
    requiredFields: Object.freeze(['adapterContractId', 'adapterModulePath', 'adapterModuleBlob', 'bindingBoundaryHead']),
    constraints: Object.freeze({ separateCertifiedBoundaryRequired: true, immutableModuleBlobRequired: true })
  }),
  target_environment: Object.freeze({
    requiredFields: Object.freeze(['environmentClass', 'stableEnvironmentIdentifier', 'production']),
    constraints: Object.freeze({ requiredEnvironmentClass: 'non_production_staging', requiredProductionValue: false })
  }),
  target_resource: Object.freeze({
    requiredFields: Object.freeze(['stableResourceIdentifier', 'targetEnvironmentStableIdentifier', 'resourceScopeFingerprint']),
    constraints: Object.freeze({ mustMatchCertifiedTargetEnvironment: true, resourceScopeFingerprintRequired: true })
  })
});

const DEPENDENT_PORTS = Object.freeze([
  'credential_provider',
  'synthetic_identity_lifecycle',
  'realtime_client_factory',
  'sanitized_evidence_recorder',
  'cleanup_verifier'
]);

const FORBIDDEN_CONCRETE_KEYS = Object.freeze([
  'endpoint', 'url', 'credential', 'credentials', 'secret', 'secretName', 'token',
  'accessToken', 'refreshToken', 'identity', 'identityMaterial', 'client', 'runtimeClient',
  'projectRef', 'projectUrl', 'apiKey', 'password'
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
    runtimeTargetBindingSpecificationDefined: true,
    runtimeTargetBindingImplementationBoundaryDefined: true,
    descriptorValidatorImplementationPresent: true,
    bindingPlanBuilderImplementationPresent: true,
    runtimeTargetBindingDefined: false,
    runtimeTargetBindingImplemented: false,
    concreteBindingPresent: false,
    transportBound: false,
    executionEntryPointExported: false,
    runtimeAdapterBound: false,
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
    wiringModuleBlob: WIRING_MODULE_BLOB,
    matrixVersion: MATRIX_VERSION,
    maturity: REQUIRED_MATURITY,
    productionGate: REQUIRED_PRODUCTION_GATE,
    lastFunctionalCheckpoint: 'COM-B03C-R5H',
    r5iCreated: false,
    r5iInferred: false,
    implementationPresent: true,
    runtimeTargetBindingSpecificationDefined: true,
    runtimeTargetBindingImplementationBoundaryDefined: true,
    descriptorValidatorImplementationPresent: true,
    bindingPlanBuilderImplementationPresent: true,
    runtimeTargetBindingDefined: false,
    runtimeTargetBindingImplemented: false,
    concreteBindingPresent: false,
    transportBound: false,
    executionEntryPointExported: false,
    runtimeAdapterBound: false,
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
    privatePresencePromotionAllowed: false
  });
}

function schemaDescriptor(slotId) {
  const schema = PRIMARY_BINDING_SCHEMAS[slotId];
  if (!schema) return blocked('RUNTIME_TARGET_KNOWN_PRIMARY_SLOT_REQUIRED');
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_only_binding_schema_descriptor',
    slotId,
    requiredFields: [...schema.requiredFields],
    constraints: { ...schema.constraints },
    bound: false,
    concreteValuePresent: false,
    futureBindingRequiresSeparateCertifiedBoundary: true
  });
}

function validateSchemaTemplate(input = {}) {
  const schema = PRIMARY_BINDING_SCHEMAS[input.slotId];
  if (!schema) return blocked('RUNTIME_TARGET_KNOWN_PRIMARY_SLOT_REQUIRED');
  for (const key of FORBIDDEN_CONCRETE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      return blocked('RUNTIME_TARGET_CONCRETE_BINDING_MATERIAL_FORBIDDEN', { slotId: input.slotId, forbiddenField: key });
    }
  }
  if (input.bound !== false || input.concreteValuePresent !== false || input.schemaOnly !== true) {
    return blocked('RUNTIME_TARGET_SCHEMA_TEMPLATE_MUST_REMAIN_UNBOUND', { slotId: input.slotId });
  }
  if (!Array.isArray(input.requiredFields) || JSON.stringify(input.requiredFields) !== JSON.stringify(schema.requiredFields)) {
    return blocked('RUNTIME_TARGET_REQUIRED_FIELD_SCHEMA_DRIFT', { slotId: input.slotId });
  }
  if (input.slotId === 'target_environment') {
    if (input.requiredEnvironmentClass !== 'non_production_staging' || input.requiredProductionValue !== false) {
      return blocked('RUNTIME_TARGET_ENVIRONMENT_CONSTRAINT_DRIFT', { slotId: input.slotId });
    }
  }
  if (input.slotId === 'target_resource') {
    if (input.mustMatchCertifiedTargetEnvironment !== true || input.resourceScopeFingerprintRequired !== true) {
      return blocked('RUNTIME_TARGET_RESOURCE_CONSTRAINT_DRIFT', { slotId: input.slotId });
    }
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_only_schema_template_valid',
    slotId: input.slotId,
    bound: false,
    concreteValuePresent: false,
    schemaOnly: true,
    futureBindingRequiresSeparateCertifiedBoundary: true
  });
}

function buildRepositoryOnlyBindingPlan() {
  const primary = Object.keys(PRIMARY_BINDING_SCHEMAS).map((slotId, index) => freeze({
    sequence: index + 1,
    slotId,
    schema: schemaDescriptor(slotId),
    bound: false,
    concreteValuePresent: false,
    separateCertifiedBoundaryRequired: true
  }));
  const dependent = DEPENDENT_PORTS.map((slotId, index) => freeze({
    sequence: primary.length + index + 1,
    slotId,
    bound: false,
    concreteValuePresent: false,
    separateCertifiedBoundaryRequired: true
  }));
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_only_runtime_target_binding_plan_defined',
    executionEnabled: false,
    transportBound: false,
    concreteBindingPresent: false,
    primary,
    dependent,
    futureAuthorizationMustBeFresh: true,
    futureAuthorizationMustBeExplicit: true,
    futureAuthorizationMustBeSingleUse: true,
    futureAuthorizationMustBindExactCertifiedRuntimeTargetBindingHead: true,
    futureAuthorizationMustBindExactNonProductionEnvironmentIdentifier: true,
    futureAuthorizationMustBindExactResourceIdentifier: true,
    futureAuthorizationMustBindExactResourceScopeFingerprint: true,
    receiptRequiredLaterInSeparateSingleFileCommit: true,
    triggerRequiredLaterInSeparateCanonicalBoundary: true,
    priorR5dAuthorizationReusable: false,
    priorR5dReceiptReusable: false,
    priorR5dTriggerReusable: false
  });
}

function evaluateRepositoryBindingReadiness({ templates = [] } = {}) {
  if (!Array.isArray(templates) || templates.length !== 3) {
    return blocked('RUNTIME_TARGET_THREE_PRIMARY_SCHEMA_TEMPLATES_REQUIRED');
  }
  const seen = new Set();
  for (const template of templates) {
    const result = validateSchemaTemplate(template);
    if (result.decision !== 'repository_only_schema_template_valid') return result;
    if (seen.has(result.slotId)) return blocked('RUNTIME_TARGET_DUPLICATE_SCHEMA_TEMPLATE_FORBIDDEN', { slotId: result.slotId });
    seen.add(result.slotId);
  }
  if (Object.keys(PRIMARY_BINDING_SCHEMAS).some((slotId) => !seen.has(slotId))) {
    return blocked('RUNTIME_TARGET_ALL_PRIMARY_SCHEMA_TEMPLATES_REQUIRED');
  }
  return blocked('RUNTIME_TARGET_CONCRETE_BINDINGS_REQUIRE_SEPARATE_CERTIFIED_BOUNDARIES', {
    schemaTemplateSetValidated: true,
    runtimeAdapterConcreteBindingRequiredLater: true,
    nonProductionTargetEnvironmentConcreteBindingRequiredLater: true,
    exactTargetResourceConcreteBindingRequiredLater: true,
    dependentPortBindingsRequiredLater: true,
    freshExplicitSingleUseAuthorizationRequiredLater: true
  });
}

function assertRemoteBindingDisabled() {
  const error = new Error(REMOTE_BINDING_DISABLED_CODE);
  error.code = REMOTE_BINDING_DISABLED_CODE;
  throw error;
}

const parentDescriptor = wiring.repositoryDescriptor();
if (parentDescriptor.executionWiringDefined !== true || parentDescriptor.executionWiringImplemented !== true) {
  throw new Error('DOKE_COM_B03C_R5H_PARENT_EXECUTION_WIRING_NOT_CERTIFIED');
}
if (parentDescriptor.transportBound !== false || parentDescriptor.remoteExecutionAuthority !== false) {
  throw new Error('DOKE_COM_B03C_R5H_PARENT_EXECUTION_WIRING_MUST_REMAIN_UNBOUND');
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
  WIRING_MODULE_BLOB,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  REMOTE_BINDING_DISABLED_CODE,
  PRIMARY_BINDING_SCHEMAS,
  DEPENDENT_PORTS,
  repositoryDescriptor,
  schemaDescriptor,
  validateSchemaTemplate,
  buildRepositoryOnlyBindingPlan,
  evaluateRepositoryBindingReadiness,
  assertRemoteBindingDisabled
});
