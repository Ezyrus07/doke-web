'use strict';

const recorder = require('./community-realtime-private-auth-r5h-extension-classification-probe-sanitized-evidence-recorder');

const CONTRACT_ID = 'com-b03c-r5h-extension-classification-probe-cleanup-verifier-repository-implementation-v1';
const VALIDATION_ID = 'COM-B03C-R5H-EXTENSION-CLASSIFICATION-PROBE-CLEANUP-VERIFIER-REPOSITORY-IMPLEMENTATION';
const STATUS = 'repository_only_cleanup_verifier_contract_implemented_read_only_fail_closed_no_persistence_no_sink_no_transport_no_remote_authority';
const VERIFICATION_PERSISTENCE_DISABLED_CODE = 'DOKE_COM_B03C_R5H_CLEANUP_VERIFIER_PERSISTENCE_DISABLED';

const EVIDENCE_FIELDS = recorder.EVIDENCE_FIELDS;
const FORBIDDEN_INPUT_KEYS = Object.freeze([
  ...recorder.FORBIDDEN_INPUT_KEYS,
  'verificationResult',
  'verificationResultPersistenceTarget',
  'verificationSink',
  'executionEntrypoint',
  'executionCommand',
  'executionWorkflow'
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
    cleanupVerifierImplementationPresent: true,
    cleanupVerifierBindingDefined: false,
    cleanupVerifierBound: false,
    evidenceInputReadOnly: true,
    evidenceMutationImplemented: false,
    evidencePersistenceImplemented: false,
    verificationResultPersistenceImplemented: false,
    evidenceSinkDefined: false,
    verificationSinkDefined: false,
    transportBound: false,
    remoteClientInstantiationImplemented: false,
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
    implementationPresent: true,
    cleanupVerifierImplementationPresent: true,
    canonicalEvidenceFields: EVIDENCE_FIELDS,
    canonicalSanitizedEvidenceInputRequired: true,
    inputMustRemainReadOnly: true,
    verificationFailureMustFailClosed: true,
    cleanupCompletedMustEqualTrue: true,
    zeroResidueMustEqualTrue: true,
    rawErrorCapturedMustEqualFalse: true,
    cleanupVerifierBindingDefined: false,
    cleanupVerifierBound: false,
    evidenceMutationImplemented: false,
    evidencePersistenceImplemented: false,
    verificationResultPersistenceImplemented: false,
    evidenceSinkDefined: false,
    verificationSinkDefined: false,
    transportBound: false,
    remoteClientInstantiationImplemented: false,
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
    r5iInferred: false
  });
}

function validateCanonicalInputShape(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return blocked('CLEANUP_VERIFIER_CANONICAL_SANITIZED_EVIDENCE_RECORD_REQUIRED');
  }

  for (const key of FORBIDDEN_INPUT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      return blocked('CLEANUP_VERIFIER_RAW_OR_RUNTIME_MATERIAL_FORBIDDEN', { forbiddenField: key });
    }
  }

  const keys = Object.keys(input);
  if (keys.length !== EVIDENCE_FIELDS.length || keys.join('|') !== EVIDENCE_FIELDS.join('|')) {
    return blocked('CLEANUP_VERIFIER_CANONICAL_EVIDENCE_FIELDS_REQUIRED', {
      expectedFields: EVIDENCE_FIELDS,
      receivedFields: freeze([...keys])
    });
  }

  return null;
}

function verifySanitizedEvidenceRecord(input = {}) {
  const shapeFailure = validateCanonicalInputShape(input);
  if (shapeFailure) return shapeFailure;

  const prepared = recorder.prepareSanitizedEvidenceRecord(input);
  if (!prepared || prepared.decision !== 'sanitized_evidence_record_valid_repository_only_ephemeral') {
    return blocked('CLEANUP_VERIFIER_SANITIZED_RECORDER_VALIDATION_REQUIRED');
  }

  const record = prepared.record;
  if (!record || Object.keys(record).join('|') !== EVIDENCE_FIELDS.join('|')) {
    return blocked('CLEANUP_VERIFIER_PREPARED_CANONICAL_RECORD_REQUIRED');
  }
  if (record.cleanupCompleted !== true) {
    return blocked('CLEANUP_VERIFIER_CLEANUP_COMPLETED_REQUIRED');
  }
  if (record.zeroResidue !== true) {
    return blocked('CLEANUP_VERIFIER_ZERO_RESIDUE_REQUIRED');
  }
  if (record.rawErrorCaptured !== false) {
    return blocked('CLEANUP_VERIFIER_RAW_ERROR_CAPTURE_MUST_BE_FALSE');
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: 'cleanup_verification_passed_repository_only_ephemeral',
    caseId: record.caseId,
    cleanupCompleted: true,
    zeroResidue: true,
    rawErrorCaptured: false,
    canonicalEvidenceFieldsExact: true,
    sanitizedEvidenceOnly: true,
    evidenceInputReadOnly: true,
    verificationFailureMustFailClosed: true,
    evidenceMutationAllowed: false,
    evidencePersistenceAllowed: false,
    verificationResultPersistenceAllowed: false,
    evidenceSinkAllowed: false,
    verificationSinkAllowed: false,
    transportBound: false,
    networkAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    remoteExecutionAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    privatePresencePromotionAllowed: false,
    r5iCreated: false,
    r5iInferred: false
  });
}

function assertVerificationPersistenceDisabled() {
  const error = new Error(VERIFICATION_PERSISTENCE_DISABLED_CODE);
  error.code = VERIFICATION_PERSISTENCE_DISABLED_CODE;
  throw error;
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  VERIFICATION_PERSISTENCE_DISABLED_CODE,
  EVIDENCE_FIELDS,
  FORBIDDEN_INPUT_KEYS,
  repositoryDescriptor,
  verifySanitizedEvidenceRecord,
  assertVerificationPersistenceDisabled
});
