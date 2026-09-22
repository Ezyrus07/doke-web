'use strict';

const CONTRACT_ID = 'com-b03c-r5h-extension-classification-probe-harness-implementation-v1';
const VALIDATION_ID = 'COM-B03C-R5H-EXTENSION-CLASSIFICATION-PROBE-HARNESS-IMPLEMENTATION';
const STATUS = 'repository_only_transport_unbound_harness_implementation_ready_execution_disabled';
const SPEC_CONTRACT_ID = 'com-b03c-r5h-extension-classification-probe-harness-specification-v1';
const SPEC_BLOB = '8611bc7cffd54d813248988b3b4fcf9bd894384c';
const SPEC_CERTIFIED_HEAD = 'a74072bc5e7c7063aeb7b667b8ddc7130b06d939';
const SPEC_CERTIFIED_TREE = 'f5773b34b42d357e2cafe2b53dbd6aa8e54afa42';
const SPEC_CERTIFICATION_RUN = 31921526984;
const SPEC_CERTIFICATION_JOB = 95102019697;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const EXECUTION_DISABLED_CODE = 'DOKE_COM_B03C_R5H_EXTENSION_CLASSIFICATION_HARNESS_EXECUTION_NOT_WIRED';

const CASES = [
  {
    id: 'extension_is_null',
    predicate: 'extension IS NULL',
    expectedClassification: 'extension_unavailable_or_null'
  },
  {
    id: 'extension_equals_presence',
    predicate: "extension = 'presence'",
    expectedClassification: 'extension_expected_presence_value'
  },
  {
    id: 'extension_non_null_not_presence',
    predicate: "extension IS NOT NULL AND extension <> 'presence'",
    expectedClassification: 'extension_unexpected_non_null_value'
  }
];

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function isEnvelopeId(value) {
  return typeof value === 'string' && /^[a-z][a-z0-9_-]{7,63}$/.test(value);
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: 'blocked_repository_only',
    reason,
    executionHarnessDefined: true,
    executableHarnessPresent: true,
    implementationPresent: true,
    executionEntryPointExported: false,
    executionCommandDefined: false,
    workflowExecutionJobDefined: false,
    runtimeAdapterBound: false,
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
    matrixVersion: MATRIX_VERSION,
    maturity: REQUIRED_MATURITY,
    productionGate: REQUIRED_PRODUCTION_GATE,
    lastFunctionalCheckpoint: 'COM-B03C-R5H',
    r5iCreated: false,
    r5iInferred: false,
    implementationPresent: true,
    executionHarnessDefined: true,
    executableHarnessPresent: true,
    transportBound: false,
    executionEntryPointExported: false,
    executionCommandDefined: false,
    workflowExecutionJobDefined: false,
    runtimeAdapterBound: false,
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

function buildObservationPlan({ identityEnvelopeId, topicEnvelopeId } = {}) {
  if (!isEnvelopeId(identityEnvelopeId)) {
    const error = new TypeError('HARNESS_SYNTHETIC_IDENTITY_ENVELOPE_ID_REQUIRED');
    error.code = 'HARNESS_SYNTHETIC_IDENTITY_ENVELOPE_ID_REQUIRED';
    throw error;
  }
  if (!isEnvelopeId(topicEnvelopeId)) {
    const error = new TypeError('HARNESS_UNIQUE_TOPIC_ENVELOPE_ID_REQUIRED');
    error.code = 'HARNESS_UNIQUE_TOPIC_ENVELOPE_ID_REQUIRED';
    throw error;
  }
  return freeze(CASES.map((item, index) => ({
    ...item,
    observationOrdinal: index + 1,
    identityEnvelopeId,
    topicEnvelopeId,
    freshRealtimeClientRequired: true,
    privateChannelRequired: true,
    presenceOnlyRequired: true,
    cleanupRequired: true,
    zeroResidueRequired: true,
    sanitizedEvidenceOnly: true
  })));
}

function classifyExtensionValue(value) {
  if (value === null || value === undefined) return 'extension_unavailable_or_null';
  if (value === 'presence') return 'extension_expected_presence_value';
  return 'extension_unexpected_non_null_value';
}

function sanitizeObservation(input = {}) {
  const forbiddenKeys = [
    'rawError',
    'rawRemoteError',
    'credential',
    'credentials',
    'token',
    'accessToken',
    'refreshToken',
    'identity',
    'identityMaterial',
    'remotePayload',
    'payload'
  ];
  for (const key of forbiddenKeys) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      return blocked('HARNESS_RAW_MATERIAL_FORBIDDEN', { forbiddenField: key });
    }
  }
  const caseDef = CASES.find((item) => item.id === input.caseId);
  if (!caseDef) return blocked('HARNESS_KNOWN_CASE_REQUIRED');
  if (input.predicate !== caseDef.predicate || input.expectedClassification !== caseDef.expectedClassification) {
    return blocked('HARNESS_CASE_BINDING_REQUIRED');
  }
  if (typeof input.joinSubscribed !== 'boolean') return blocked('HARNESS_JOIN_SUBSCRIBED_BOOLEAN_REQUIRED');
  if (typeof input.terminalStatusClassification !== 'string' || input.terminalStatusClassification.length < 1) {
    return blocked('HARNESS_TERMINAL_STATUS_CLASSIFICATION_REQUIRED');
  }
  if (input.extensionValueClassification !== caseDef.expectedClassification) {
    return blocked('HARNESS_EXTENSION_CLASSIFICATION_MISMATCH');
  }
  if (input.cleanupCompleted !== true || input.zeroResidue !== true || input.rawErrorCaptured !== false) {
    return blocked('HARNESS_CLEANUP_ZERO_RESIDUE_AND_SANITIZATION_REQUIRED');
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'sanitized_observation_valid_repository_only',
    caseId: caseDef.id,
    predicate: caseDef.predicate,
    expectedClassification: caseDef.expectedClassification,
    joinSubscribed: input.joinSubscribed,
    terminalStatusClassification: input.terminalStatusClassification,
    extensionValueClassification: input.extensionValueClassification,
    cleanupCompleted: true,
    zeroResidue: true,
    rawErrorCaptured: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    privatePresencePromotionAllowed: false
  });
}

function compareObservationSet(observations = []) {
  if (!Array.isArray(observations) || observations.length !== CASES.length) {
    return blocked('HARNESS_EXACTLY_ONE_OBSERVATION_PER_CASE_REQUIRED');
  }
  const byCase = new Map();
  for (const observation of observations) {
    const validated = sanitizeObservation(observation);
    if (validated.decision !== 'sanitized_observation_valid_repository_only') return validated;
    if (byCase.has(validated.caseId)) return blocked('HARNESS_DUPLICATE_CASE_OBSERVATION_FORBIDDEN');
    byCase.set(validated.caseId, validated);
  }
  if (CASES.some((item) => !byCase.has(item.id))) return blocked('HARNESS_COMPLETE_CASE_SET_REQUIRED');
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'cross_case_observation_set_valid_repository_only',
    casesCompared: CASES.map((item) => item.id),
    crossCaseComparisonCompleted: true,
    terminalStatusAloneCannotProveCause: true,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    privatePresencePromotionAllowed: false,
    executionAttempted: false,
    remoteExecutionAuthority: false,
    networkAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false
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
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  EXECUTION_DISABLED_CODE,
  CASES: freeze(CASES),
  repositoryDescriptor,
  buildObservationPlan,
  classifyExtensionValue,
  sanitizeObservation,
  compareObservationSet,
  assertExecutionDisabled
});
