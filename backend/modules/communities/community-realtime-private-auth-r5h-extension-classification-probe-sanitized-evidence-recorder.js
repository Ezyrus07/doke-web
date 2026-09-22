'use strict';

const harness = require('./community-realtime-private-auth-r5h-extension-classification-probe-harness');

const CONTRACT_ID = 'com-b03c-r5h-extension-classification-probe-sanitized-evidence-recorder-repository-implementation-v1';
const VALIDATION_ID = 'COM-B03C-R5H-EXTENSION-CLASSIFICATION-PROBE-SANITIZED-EVIDENCE-RECORDER-REPOSITORY-IMPLEMENTATION';
const STATUS = 'repository_only_sanitized_evidence_recorder_contract_implemented_ephemeral_validation_only_no_persistence_no_sink_no_transport_no_remote_authority';
const EVIDENCE_PERSISTENCE_DISABLED_CODE = 'DOKE_COM_B03C_R5H_SANITIZED_EVIDENCE_RECORDER_PERSISTENCE_DISABLED';

const EVIDENCE_FIELDS = Object.freeze([
  'caseId',
  'predicate',
  'expectedClassification',
  'joinSubscribed',
  'terminalStatusClassification',
  'extensionValueClassification',
  'cleanupCompleted',
  'zeroResidue',
  'rawErrorCaptured'
]);

const FORBIDDEN_INPUT_KEYS = Object.freeze([
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
  'payload',
  'endpoint',
  'networkEndpoint',
  'evidenceSink',
  'evidencePersistenceTarget',
  'transport',
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
    sanitizedEvidenceRecorderImplementationPresent: true,
    sanitizedEvidenceRecorderBindingDefined: false,
    sanitizedEvidenceRecorderBound: false,
    evidenceWriteImplemented: false,
    evidencePersistenceImplemented: false,
    evidenceSinkDefined: false,
    transportBound: false,
    cleanupVerifierBound: false,
    remoteDependencyLoadImplemented: false,
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
    privatePresencePromotionAllowed: false,
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
    sanitizedEvidenceRecorderImplementationPresent: true,
    canonicalEvidenceFields: EVIDENCE_FIELDS,
    sanitizedEvidenceValidationImplemented: true,
    ephemeralRecordDescriptorImplemented: true,
    evidencePersistenceHardBlockImplemented: true,
    sanitizedEvidenceRecorderBindingDefined: false,
    sanitizedEvidenceRecorderBound: false,
    evidenceWriteImplemented: false,
    evidencePersistenceImplemented: false,
    evidenceSinkDefined: false,
    transportBound: false,
    cleanupVerifierBound: false,
    remoteDependencyLoadImplemented: false,
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

function validateInputShape(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return blocked('SANITIZED_EVIDENCE_RECORD_OBJECT_REQUIRED');
  }
  for (const key of FORBIDDEN_INPUT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      return blocked('SANITIZED_EVIDENCE_RAW_OR_RUNTIME_MATERIAL_FORBIDDEN', { forbiddenField: key });
    }
  }
  return null;
}

function prepareSanitizedEvidenceRecord(input = {}) {
  const shapeFailure = validateInputShape(input);
  if (shapeFailure) return shapeFailure;

  const validated = harness.sanitizeObservation(input);
  if (!validated || validated.decision !== 'sanitized_observation_valid_repository_only') {
    return blocked('SANITIZED_EVIDENCE_HARNESS_VALIDATION_REQUIRED');
  }

  const record = {};
  for (const field of EVIDENCE_FIELDS) record[field] = validated[field];

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: 'sanitized_evidence_record_valid_repository_only_ephemeral',
    record: freeze(record),
    evidenceFieldsExact: true,
    sanitizedEvidenceOnly: true,
    rawErrorCapturedMustEqualFalse: true,
    cleanupCompletedMustEqualTrue: true,
    zeroResidueMustEqualTrue: true,
    evidenceWriteAllowed: false,
    evidencePersistenceAllowed: false,
    evidenceSinkAllowed: false,
    transportBound: false,
    cleanupVerifierBound: false,
    networkAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    remoteExecutionAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    privatePresencePromotionAllowed: false
  });
}

function evaluateRepositoryRecorderReadiness({ recordDescriptor } = {}) {
  if (!recordDescriptor || recordDescriptor.decision !== 'sanitized_evidence_record_valid_repository_only_ephemeral') {
    return blocked('SANITIZED_EVIDENCE_VALID_EPHEMERAL_RECORD_DESCRIPTOR_REQUIRED');
  }
  return blocked('SANITIZED_EVIDENCE_PERSISTENCE_REQUIRES_LATER_SEPARATE_CERTIFIED_BOUNDARY', {
    recordDescriptorValidated: true,
    evidenceFieldsExact: true,
    sanitizedEvidenceOnly: true,
    evidencePersistenceAllowed: false,
    evidenceSinkAllowed: false,
    cleanupVerifierBound: false,
    separatePersistenceBoundaryRequired: true
  });
}

function assertEvidencePersistenceDisabled() {
  const error = new Error(EVIDENCE_PERSISTENCE_DISABLED_CODE);
  error.code = EVIDENCE_PERSISTENCE_DISABLED_CODE;
  throw error;
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  EVIDENCE_PERSISTENCE_DISABLED_CODE,
  EVIDENCE_FIELDS,
  FORBIDDEN_INPUT_KEYS,
  repositoryDescriptor,
  prepareSanitizedEvidenceRecord,
  evaluateRepositoryRecorderReadiness,
  assertEvidencePersistenceDisabled
});
