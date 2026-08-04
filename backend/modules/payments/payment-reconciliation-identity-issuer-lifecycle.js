'use strict';

const crypto = require('node:crypto');
const { ALLOWED_SIGNATURE_SCHEMES, canonicalJson, sha256 } = require('./payment-reconciliation-executor-adapter');
const governance = require('./payment-reconciliation-executor-governance');
const evidence = require('./payment-reconciliation-governance-evidence');

const CONTRACT_VERSION = 'pay-a15-identity-issuer-lifecycle-v1';
const ISSUER_RECORD_VERSION = 'pay-external-identity-issuer-record-v1';
const LIFECYCLE_EVENT_VERSION = 'pay-external-identity-issuer-lifecycle-event-v1';
const STATUS_SNAPSHOT_VERSION = 'pay-external-identity-issuer-status-snapshot-v1';
const STATUS_SIGNATURE_VERSION = 'pay-identity-status-detached-signature-v1';
const VERIFIED_STATUS_VERSION = 'pay-verified-identity-issuer-status-v1';
const CREDENTIAL_ACCEPTANCE_VERSION = 'pay-identity-credential-acceptance-v1';
const CREDENTIAL_INVALIDATION_VERSION = 'pay-identity-credential-invalidation-v1';
const RETENTION_HANDOFF_VERSION = 'pay-identity-audit-retention-handoff-v1';
const STATUS_CHAIN_VERSION = 'pay-identity-issuer-status-chain-v1';
const STATUS_SIGNING_DOMAIN = 'doke-pay-identity-issuer-status-v1';
const A14_CONTRACT_VERSION = evidence.CONTRACT_VERSION;
const MAX_STATUS_SNAPSHOT_AGE_SECONDS = 900;
const MINIMUM_RETENTION_DAYS = 2555;

const ISSUER_STATUSES = Object.freeze(['pending', 'active', 'suspended', 'revoked', 'retired']);
const LIFECYCLE_REASON_CODES = Object.freeze([
  'onboarding_approved', 'periodic_review_passed', 'security_incident',
  'compliance_hold', 'remediation_complete', 'contract_ended',
  'key_compromise', 'operator_request'
]);
const ALLOWED_TRANSITIONS = Object.freeze({
  pending: Object.freeze(['active']),
  active: Object.freeze(['suspended', 'revoked', 'retired']),
  suspended: Object.freeze(['active', 'revoked', 'retired']),
  revoked: Object.freeze([]),
  retired: Object.freeze([])
});
const RETENTION_ARTIFACT_TYPES = Object.freeze([
  'issuer_record', 'issuer_lifecycle_event', 'issuer_status_snapshot',
  'credential_acceptance', 'credential_invalidation',
  'governance_evidence_bundle', 'lifecycle_decision_receipt'
]);
const PRIVATE_JWK_FIELDS = Object.freeze(['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth', 'k']);

function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
function assert(condition, code, message) { if (!condition) fail(code, message); }
function assertExactKeys(value, allowed, code, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), code, label + ' is required.');
  Object.keys(value).forEach((key) => assert(allowed.includes(key), code, label + ' field is not allowlisted: ' + key));
}
function assertHash(value, code, label) { assert(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), code, label + ' must be SHA-256.'); }
function assertId(value, code, label) { assert(typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{7,95}$/.test(value), code, label + ' is invalid.'); }
function parseTime(value, code, label) { const parsed = Date.parse(value); assert(Number.isFinite(parsed), code, label + ' must be a timestamp.'); return parsed; }
function fingerprint(value, field) { const body = { ...value }; delete body[field]; return sha256(canonicalJson(body)); }
function strictBase64(value) {
  assert(typeof value === 'string' && /^[A-Za-z0-9+/]+={0,2}$/.test(value), 'DOKE_PAY_A15_SIGNATURE_BASE64_INVALID', 'Signature base64 invalid.');
  const bytes = Buffer.from(value, 'base64');
  assert(bytes.length > 0 && value.replace(/=+$/u, '') === bytes.toString('base64').replace(/=+$/u, ''), 'DOKE_PAY_A15_SIGNATURE_BASE64_INVALID', 'Signature base64 non-canonical.');
  return bytes;
}

function computeIssuerRecordFingerprint(value) { return fingerprint(value, 'recordFingerprint'); }
function lifecycleBody(value) {
  return {
    eventVersion: value.eventVersion, chainVersion: value.chainVersion, eventId: value.eventId,
    issuerIdHash: value.issuerIdHash, trustBundleFingerprint: value.trustBundleFingerprint,
    sequence: value.sequence, previousEventHash: value.previousEventHash,
    previousStatus: value.previousStatus, nextStatus: value.nextStatus,
    reasonCode: value.reasonCode, effectiveAt: value.effectiveAt,
    evidenceHash: value.evidenceHash, production: value.production,
    containsDirectIdentifiers: value.containsDirectIdentifiers
  };
}
function computeLifecycleEventHash(value) { return sha256(canonicalJson(lifecycleBody(value))); }
function computeStatusSnapshotFingerprint(value) { return fingerprint(value, 'snapshotFingerprint'); }
function computeStatusSignatureFingerprint(value) { return fingerprint(value, 'envelopeFingerprint'); }
function retentionBody(value) {
  const body = { ...value };
  delete body.handoffFingerprint;
  delete body.remoteArchiveConfigured;
  delete body.remoteArchiveWritePerformed;
  delete body.repositoryDeletionAuthorized;
  delete body.networkRequests;
  delete body.databaseConnections;
  delete body.stagingAuthorized;
  delete body.productionAllowed;
  delete body.remoteExecutionAuthorized;
  return body;
}
function computeRetentionHandoffFingerprint(value) { return sha256(canonicalJson(retentionBody(value))); }

function validateIssuerRecord(record, trustBundle) {
  assertExactKeys(record, [
    'recordVersion', 'recordId', 'issuerIdHash', 'issuerFamilyHash', 'trustBundleFingerprint',
    'allowedRoles', 'allowedAssuranceLevels', 'initialStatus', 'registeredAt', 'reviewBy',
    'production', 'containsDirectIdentifiers', 'repositoryManagedCredentials',
    'remoteAuthorityGranted', 'recordFingerprint'
  ], 'DOKE_PAY_A15_ISSUER_RECORD_INVALID', 'Issuer record');
  assert(record.recordVersion === ISSUER_RECORD_VERSION, 'DOKE_PAY_A15_ISSUER_RECORD_VERSION_INVALID', 'Issuer-record version invalid.');
  assertId(record.recordId, 'DOKE_PAY_A15_ISSUER_RECORD_ID_INVALID', 'Issuer-record id');
  assertHash(record.issuerIdHash, 'DOKE_PAY_A15_ISSUER_HASH_INVALID', 'Issuer id hash');
  assertHash(record.issuerFamilyHash, 'DOKE_PAY_A15_ISSUER_FAMILY_HASH_INVALID', 'Issuer family hash');
  const bundle = evidence.validateIdentityTrustBundle(trustBundle);
  assert(record.trustBundleFingerprint === bundle.bundleFingerprint, 'DOKE_PAY_A15_TRUST_BUNDLE_MISMATCH', 'Issuer record trust-bundle mismatch.');
  assert(Array.isArray(record.allowedRoles) && record.allowedRoles.length > 0, 'DOKE_PAY_A15_ROLE_ALLOWLIST_REQUIRED', 'Role allowlist required.');
  record.allowedRoles.forEach((role) => assert(governance.APPROVER_ROLES.includes(role), 'DOKE_PAY_A15_ROLE_INVALID', 'Role invalid.'));
  assert(new Set(record.allowedRoles).size === record.allowedRoles.length, 'DOKE_PAY_A15_DUPLICATE_ROLE_DENIED', 'Duplicate role denied.');
  assert(Array.isArray(record.allowedAssuranceLevels) && record.allowedAssuranceLevels.length > 0, 'DOKE_PAY_A15_ASSURANCE_ALLOWLIST_REQUIRED', 'Assurance allowlist required.');
  record.allowedAssuranceLevels.forEach((level) => assert(evidence.ALLOWED_ASSURANCE_LEVELS.includes(level), 'DOKE_PAY_A15_ASSURANCE_LEVEL_INVALID', 'Assurance level invalid.'));
  assert(new Set(record.allowedAssuranceLevels).size === record.allowedAssuranceLevels.length, 'DOKE_PAY_A15_DUPLICATE_ASSURANCE_DENIED', 'Duplicate assurance denied.');
  assert(record.initialStatus === 'pending', 'DOKE_PAY_A15_INITIAL_STATUS_INVALID', 'Initial issuer status must be pending.');
  const registeredAt = parseTime(record.registeredAt, 'DOKE_PAY_A15_ISSUER_TIME_INVALID', 'registeredAt');
  const reviewBy = parseTime(record.reviewBy, 'DOKE_PAY_A15_ISSUER_TIME_INVALID', 'reviewBy');
  assert(reviewBy > registeredAt && reviewBy - registeredAt <= 180 * 86400000, 'DOKE_PAY_A15_REVIEW_WINDOW_INVALID', 'Review window invalid.');
  assert(record.production === false, 'DOKE_PAY_A15_PRODUCTION_ISSUER_DENIED', 'Production issuer record denied.');
  assert(record.containsDirectIdentifiers === false, 'DOKE_PAY_A15_DIRECT_IDENTIFIER_DENIED', 'Direct identifiers denied.');
  assert(record.repositoryManagedCredentials === false, 'DOKE_PAY_A15_REPOSITORY_CREDENTIAL_CUSTODY_DENIED', 'Repository credential custody denied.');
  assert(record.remoteAuthorityGranted === false, 'DOKE_PAY_A15_REMOTE_AUTHORITY_DENIED', 'Remote authority denied.');
  assertHash(record.recordFingerprint, 'DOKE_PAY_A15_ISSUER_RECORD_FINGERPRINT_INVALID', 'Record fingerprint');
  assert(record.recordFingerprint === computeIssuerRecordFingerprint(record), 'DOKE_PAY_A15_ISSUER_RECORD_FINGERPRINT_MISMATCH', 'Record fingerprint mismatch.');
  assert(bundle.roots.some((root) => root.allowedSignerIdHashes.includes(record.issuerIdHash)), 'DOKE_PAY_A15_ISSUER_TRUST_ROOT_MISSING', 'Issuer trust root missing.');
  return Object.freeze({ ...record });
}

function assertTransition(previousStatus, nextStatus, reasonCode) {
  assert(ISSUER_STATUSES.includes(previousStatus) && ISSUER_STATUSES.includes(nextStatus), 'DOKE_PAY_A15_ISSUER_STATUS_INVALID', 'Issuer status invalid.');
  assert(ALLOWED_TRANSITIONS[previousStatus].includes(nextStatus), 'DOKE_PAY_A15_LIFECYCLE_TRANSITION_DENIED', 'Lifecycle transition denied.');
  assert(LIFECYCLE_REASON_CODES.includes(reasonCode), 'DOKE_PAY_A15_REASON_CODE_INVALID', 'Reason code invalid.');
  if (previousStatus === 'pending') assert(reasonCode === 'onboarding_approved', 'DOKE_PAY_A15_ONBOARDING_REASON_REQUIRED', 'Onboarding reason required.');
  if (nextStatus === 'suspended') assert(['security_incident', 'compliance_hold'].includes(reasonCode), 'DOKE_PAY_A15_SUSPENSION_REASON_INVALID', 'Suspension reason invalid.');
  if (previousStatus === 'suspended' && nextStatus === 'active') assert(['remediation_complete', 'periodic_review_passed'].includes(reasonCode), 'DOKE_PAY_A15_REACTIVATION_REASON_INVALID', 'Reactivation reason invalid.');
  if (nextStatus === 'revoked') assert(['key_compromise', 'security_incident', 'compliance_hold'].includes(reasonCode), 'DOKE_PAY_A15_REVOCATION_REASON_INVALID', 'Revocation reason invalid.');
  if (nextStatus === 'retired') assert(['contract_ended', 'operator_request'].includes(reasonCode), 'DOKE_PAY_A15_RETIREMENT_REASON_INVALID', 'Retirement reason invalid.');
}

function createIssuerLifecycleEvent(record, input, options = {}) {
  validateIssuerRecord(record, options.trustBundle);
  assertExactKeys(input, [
    'eventId', 'issuerIdHash', 'trustBundleFingerprint', 'sequence', 'previousEventHash',
    'previousStatus', 'nextStatus', 'reasonCode', 'effectiveAt', 'evidenceHash',
    'production', 'containsDirectIdentifiers'
  ], 'DOKE_PAY_A15_LIFECYCLE_EVENT_INVALID', 'Lifecycle event');
  assertId(input.eventId, 'DOKE_PAY_A15_LIFECYCLE_EVENT_ID_INVALID', 'Lifecycle event id');
  assert(input.issuerIdHash === record.issuerIdHash, 'DOKE_PAY_A15_LIFECYCLE_ISSUER_MISMATCH', 'Lifecycle issuer mismatch.');
  assert(input.trustBundleFingerprint === record.trustBundleFingerprint, 'DOKE_PAY_A15_LIFECYCLE_TRUST_BUNDLE_MISMATCH', 'Lifecycle trust-bundle mismatch.');
  assert(Number.isInteger(input.sequence) && input.sequence >= 1, 'DOKE_PAY_A15_LIFECYCLE_SEQUENCE_INVALID', 'Lifecycle sequence invalid.');
  assertTransition(input.previousStatus, input.nextStatus, input.reasonCode);
  parseTime(input.effectiveAt, 'DOKE_PAY_A15_LIFECYCLE_TIME_INVALID', 'effectiveAt');
  assertHash(input.evidenceHash, 'DOKE_PAY_A15_LIFECYCLE_EVIDENCE_HASH_INVALID', 'Lifecycle evidence hash');
  assert(input.production === false, 'DOKE_PAY_A15_PRODUCTION_LIFECYCLE_DENIED', 'Production lifecycle denied.');
  assert(input.containsDirectIdentifiers === false, 'DOKE_PAY_A15_DIRECT_IDENTIFIER_DENIED', 'Direct identifiers denied.');
  const previous = options.previousEvent || null;
  if (input.sequence === 1) {
    assert(previous == null && input.previousEventHash == null, 'DOKE_PAY_A15_LIFECYCLE_GENESIS_PREDECESSOR_DENIED', 'Genesis predecessor denied.');
    assert(input.previousStatus === record.initialStatus, 'DOKE_PAY_A15_LIFECYCLE_INITIAL_STATUS_MISMATCH', 'Initial status mismatch.');
  } else {
    assert(previous, 'DOKE_PAY_A15_PREVIOUS_LIFECYCLE_EVENT_REQUIRED', 'Previous lifecycle event required.');
    assert(previous.sequence === input.sequence - 1, 'DOKE_PAY_A15_LIFECYCLE_SEQUENCE_GAP', 'Lifecycle sequence gap.');
    assert(previous.issuerIdHash === input.issuerIdHash, 'DOKE_PAY_A15_LIFECYCLE_ISSUER_MISMATCH', 'Lifecycle chain crossed issuer.');
    assert(previous.eventHash === computeLifecycleEventHash(previous), 'DOKE_PAY_A15_PREVIOUS_EVENT_INTEGRITY_FAILED', 'Previous event integrity failed.');
    assert(input.previousEventHash === previous.eventHash, 'DOKE_PAY_A15_PREVIOUS_EVENT_HASH_MISMATCH', 'Previous event hash mismatch.');
    assert(input.previousStatus === previous.nextStatus, 'DOKE_PAY_A15_LIFECYCLE_STATUS_GAP', 'Lifecycle status gap.');
  }
  const body = { eventVersion: LIFECYCLE_EVENT_VERSION, chainVersion: STATUS_CHAIN_VERSION, ...input };
  const event = Object.freeze({ ...body, eventHash: sha256(canonicalJson(body)) });
  const ledger = options.eventLedger || new Set();
  assert(!ledger.has(event.eventHash), 'DOKE_PAY_A15_LIFECYCLE_EVENT_REPLAYED', 'Lifecycle replay denied.');
  const heads = options.chainHeadByIssuer || new Map();
  const current = heads.get(record.issuerIdHash);
  if (input.sequence === 1) assert(current == null, 'DOKE_PAY_A15_LIFECYCLE_CHAIN_ALREADY_INITIALIZED', 'Lifecycle already initialized.');
  else assert(current === previous.eventHash, 'DOKE_PAY_A15_LIFECYCLE_CHAIN_FORK_DENIED', 'Lifecycle fork denied.');
  ledger.add(event.eventHash); heads.set(record.issuerIdHash, event.eventHash);
  return Object.freeze({ ...event, immutableLifecycleEvent: true, networkRequests: 0, databaseConnections: 0, remoteIdentityProviderContacted: false, stagingAuthorized: false, productionAllowed: false, remoteExecutionAuthorized: false });
}

function validateIssuerLifecycleChain(record, events, trustBundle) {
  validateIssuerRecord(record, trustBundle);
  assert(Array.isArray(events) && events.length > 0, 'DOKE_PAY_A15_LIFECYCLE_CHAIN_REQUIRED', 'Lifecycle chain required.');
  const seen = new Set(); let previousStatus = record.initialStatus; let previousHash = null;
  events.forEach((event, index) => {
    assert(event.eventVersion === LIFECYCLE_EVENT_VERSION && event.chainVersion === STATUS_CHAIN_VERSION, 'DOKE_PAY_A15_LIFECYCLE_EVENT_VERSION_INVALID', 'Lifecycle version invalid.');
    assert(event.sequence === index + 1, 'DOKE_PAY_A15_LIFECYCLE_SEQUENCE_GAP', 'Lifecycle sequence gap.');
    assert(event.issuerIdHash === record.issuerIdHash, 'DOKE_PAY_A15_LIFECYCLE_ISSUER_MISMATCH', 'Lifecycle crossed issuer.');
    assert(event.previousStatus === previousStatus, 'DOKE_PAY_A15_LIFECYCLE_STATUS_GAP', 'Lifecycle status gap.');
    assert(event.previousEventHash === previousHash, 'DOKE_PAY_A15_PREVIOUS_EVENT_HASH_MISMATCH', 'Lifecycle predecessor mismatch.');
    assertTransition(event.previousStatus, event.nextStatus, event.reasonCode);
    assert(event.eventHash === computeLifecycleEventHash(event), 'DOKE_PAY_A15_LIFECYCLE_EVENT_INTEGRITY_FAILED', 'Lifecycle integrity failed.');
    assert(!seen.has(event.eventHash), 'DOKE_PAY_A15_LIFECYCLE_EVENT_REPLAYED', 'Lifecycle replay denied.');
    seen.add(event.eventHash); previousStatus = event.nextStatus; previousHash = event.eventHash;
  });
  return Object.freeze({ chainVersion: STATUS_CHAIN_VERSION, issuerIdHash: record.issuerIdHash, eventCount: events.length, currentStatus: previousStatus, headEventHash: previousHash, contiguous: true, immutable: true, forkFree: true, replayFree: true, networkRequests: 0, databaseConnections: 0, productionAllowed: false, remoteExecutionAuthorized: false });
}

function validateSnapshot(snapshot, record, event, nowMs) {
  assertExactKeys(snapshot, [
    'snapshotVersion', 'snapshotId', 'issuerIdHash', 'issuerRecordFingerprint',
    'trustBundleFingerprint', 'lifecycleEventHash', 'lifecycleSequence', 'issuerStatus',
    'observedAt', 'validUntil', 'signerIdHash', 'evidenceHash', 'production',
    'containsDirectIdentifiers', 'snapshotFingerprint'
  ], 'DOKE_PAY_A15_STATUS_SNAPSHOT_INVALID', 'Status snapshot');
  assert(snapshot.snapshotVersion === STATUS_SNAPSHOT_VERSION, 'DOKE_PAY_A15_STATUS_SNAPSHOT_VERSION_INVALID', 'Snapshot version invalid.');
  assertId(snapshot.snapshotId, 'DOKE_PAY_A15_STATUS_SNAPSHOT_ID_INVALID', 'Snapshot id');
  assert(snapshot.issuerIdHash === record.issuerIdHash, 'DOKE_PAY_A15_STATUS_ISSUER_MISMATCH', 'Snapshot issuer mismatch.');
  assert(snapshot.issuerRecordFingerprint === record.recordFingerprint, 'DOKE_PAY_A15_STATUS_RECORD_MISMATCH', 'Snapshot record mismatch.');
  assert(snapshot.trustBundleFingerprint === record.trustBundleFingerprint, 'DOKE_PAY_A15_STATUS_TRUST_BUNDLE_MISMATCH', 'Snapshot trust-bundle mismatch.');
  assert(snapshot.lifecycleEventHash === event.eventHash && snapshot.lifecycleSequence === event.sequence, 'DOKE_PAY_A15_STATUS_EVENT_MISMATCH', 'Snapshot lifecycle event mismatch.');
  assert(snapshot.issuerStatus === event.nextStatus, 'DOKE_PAY_A15_STATUS_VALUE_MISMATCH', 'Snapshot status mismatch.');
  const observed = parseTime(snapshot.observedAt, 'DOKE_PAY_A15_STATUS_TIME_INVALID', 'observedAt');
  const validUntil = parseTime(snapshot.validUntil, 'DOKE_PAY_A15_STATUS_TIME_INVALID', 'validUntil');
  assert(validUntil > observed && validUntil - observed <= MAX_STATUS_SNAPSHOT_AGE_SECONDS * 1000, 'DOKE_PAY_A15_STATUS_WINDOW_INVALID', 'Snapshot window invalid.');
  assert(nowMs >= observed && nowMs <= validUntil, 'DOKE_PAY_A15_STATUS_SNAPSHOT_STALE', 'Snapshot stale.');
  assertHash(snapshot.signerIdHash, 'DOKE_PAY_A15_STATUS_SIGNER_HASH_INVALID', 'Snapshot signer hash');
  assertHash(snapshot.evidenceHash, 'DOKE_PAY_A15_STATUS_EVIDENCE_HASH_INVALID', 'Snapshot evidence hash');
  assert(snapshot.production === false, 'DOKE_PAY_A15_PRODUCTION_STATUS_DENIED', 'Production snapshot denied.');
  assert(snapshot.containsDirectIdentifiers === false, 'DOKE_PAY_A15_DIRECT_IDENTIFIER_DENIED', 'Direct identifiers denied.');
  assertHash(snapshot.snapshotFingerprint, 'DOKE_PAY_A15_STATUS_FINGERPRINT_INVALID', 'Snapshot fingerprint');
  assert(snapshot.snapshotFingerprint === computeStatusSnapshotFingerprint(snapshot), 'DOKE_PAY_A15_STATUS_FINGERPRINT_MISMATCH', 'Snapshot fingerprint mismatch.');
}

function validateEnvelope(envelope) {
  assertExactKeys(envelope, [
    'envelopeVersion', 'keyId', 'keyVersion', 'signatureScheme', 'signerIdHash',
    'signedPayloadHash', 'signatureBase64', 'signatureHash', 'signedAt',
    'trustBundleFingerprint', 'envelopeFingerprint'
  ], 'DOKE_PAY_A15_STATUS_SIGNATURE_INVALID', 'Status signature');
  assert(envelope.envelopeVersion === STATUS_SIGNATURE_VERSION, 'DOKE_PAY_A15_STATUS_SIGNATURE_VERSION_INVALID', 'Status signature version invalid.');
  assertId(envelope.keyId, 'DOKE_PAY_A15_STATUS_KEY_ID_INVALID', 'Status key id');
  assert(Number.isInteger(envelope.keyVersion) && envelope.keyVersion >= 1, 'DOKE_PAY_A15_STATUS_KEY_VERSION_INVALID', 'Status key version invalid.');
  assert(ALLOWED_SIGNATURE_SCHEMES.includes(envelope.signatureScheme), 'DOKE_PAY_A15_STATUS_SIGNATURE_SCHEME_INVALID', 'Status signature scheme invalid.');
  assertHash(envelope.signerIdHash, 'DOKE_PAY_A15_STATUS_SIGNER_HASH_INVALID', 'Status signer hash');
  ['signedPayloadHash', 'signatureHash', 'trustBundleFingerprint', 'envelopeFingerprint'].forEach((key) => assertHash(envelope[key], 'DOKE_PAY_A15_STATUS_SIGNATURE_HASH_INVALID', key));
  parseTime(envelope.signedAt, 'DOKE_PAY_A15_STATUS_SIGNATURE_TIME_INVALID', 'signedAt');
  const bytes = strictBase64(envelope.signatureBase64);
  assert(envelope.envelopeFingerprint === computeStatusSignatureFingerprint(envelope), 'DOKE_PAY_A15_STATUS_SIGNATURE_FINGERPRINT_MISMATCH', 'Status envelope fingerprint mismatch.');
  return bytes;
}
function statusPayload(snapshot) { return Buffer.from(canonicalJson({ signingDomain: STATUS_SIGNING_DOMAIN, payload: snapshot }), 'utf8'); }

function verifyIssuerStatusSnapshot(snapshot, envelope, trustBundle, record, event, options = {}) {
  const bundle = evidence.validateIdentityTrustBundle(trustBundle);
  validateIssuerRecord(record, trustBundle);
  const nowMs = options.now ? parseTime(options.now, 'DOKE_PAY_A15_NOW_INVALID', 'Verification clock') : Date.now();
  validateSnapshot(snapshot, record, event, nowMs);
  const signature = validateEnvelope(envelope);
  assert(envelope.signerIdHash === snapshot.signerIdHash, 'DOKE_PAY_A15_STATUS_SIGNER_MISMATCH', 'Status signer mismatch.');
  assert(envelope.signedAt === snapshot.observedAt, 'DOKE_PAY_A15_STATUS_SIGNED_AT_MISMATCH', 'Status signedAt mismatch.');
  assert(envelope.trustBundleFingerprint === bundle.bundleFingerprint, 'DOKE_PAY_A15_STATUS_SIGNATURE_BUNDLE_MISMATCH', 'Status bundle mismatch.');
  const root = bundle.roots.find((candidate) => candidate.keyId === envelope.keyId && candidate.keyVersion === envelope.keyVersion);
  assert(root, 'DOKE_PAY_A15_STATUS_TRUST_ROOT_NOT_FOUND', 'Status trust root missing.');
  PRIVATE_JWK_FIELDS.forEach((field) => assert(!Object.prototype.hasOwnProperty.call(root.publicKeyJwk || {}, field), 'DOKE_PAY_A15_PRIVATE_KEY_MATERIAL_DENIED', 'Private JWK denied.'));
  assert(root.status === 'active', 'DOKE_PAY_A15_STATUS_TRUST_ROOT_REVOKED', 'Revoked status root denied.');
  assert(root.algorithm === envelope.signatureScheme, 'DOKE_PAY_A15_STATUS_SIGNATURE_SCHEME_MISMATCH', 'Status signature scheme mismatch.');
  assert(root.allowedPurposes.includes('governance_evidence'), 'DOKE_PAY_A15_STATUS_PURPOSE_NOT_ALLOWED', 'Root purpose denied.');
  assert(root.allowedSignerIdHashes.includes(envelope.signerIdHash), 'DOKE_PAY_A15_STATUS_SIGNER_NOT_ALLOWED', 'Status signer denied.');
  const signedAt = parseTime(envelope.signedAt, 'DOKE_PAY_A15_STATUS_SIGNATURE_TIME_INVALID', 'signedAt');
  const notBefore = parseTime(root.notBefore, 'DOKE_PAY_A15_STATUS_ROOT_TIME_INVALID', 'notBefore');
  const notAfter = parseTime(root.notAfter, 'DOKE_PAY_A15_STATUS_ROOT_TIME_INVALID', 'notAfter');
  assert(signedAt >= notBefore && signedAt <= notAfter && nowMs <= notAfter, 'DOKE_PAY_A15_STATUS_ROOT_OUTSIDE_WINDOW', 'Status root outside window.');
  const payload = statusPayload(snapshot);
  assert(envelope.signedPayloadHash === sha256(payload), 'DOKE_PAY_A15_STATUS_PAYLOAD_HASH_MISMATCH', 'Status payload hash mismatch.');
  assert(envelope.signatureHash === sha256(signature), 'DOKE_PAY_A15_STATUS_SIGNATURE_HASH_MISMATCH', 'Status signature hash mismatch.');
  let publicKey; try { publicKey = crypto.createPublicKey({ key: root.publicKeyJwk, format: 'jwk' }); } catch { fail('DOKE_PAY_A15_STATUS_PUBLIC_KEY_IMPORT_FAILED', 'Status public key import failed.'); }
  const verified = root.algorithm === 'ed25519'
    ? crypto.verify(null, payload, publicKey, signature)
    : crypto.verify('sha256', payload, { key: publicKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }, signature);
  assert(verified, 'DOKE_PAY_A15_STATUS_SIGNATURE_VERIFICATION_FAILED', 'Status signature invalid.');
  const snapshots = options.snapshotLedger || new Set(); const signatures = options.signatureLedger || new Set();
  assert(!snapshots.has(snapshot.snapshotFingerprint), 'DOKE_PAY_A15_STATUS_SNAPSHOT_REPLAYED', 'Snapshot replay denied.');
  assert(!signatures.has(envelope.envelopeFingerprint), 'DOKE_PAY_A15_STATUS_SIGNATURE_REPLAYED', 'Status signature replay denied.');
  snapshots.add(snapshot.snapshotFingerprint); signatures.add(envelope.envelopeFingerprint);
  return Object.freeze({ verifiedStatusVersion: VERIFIED_STATUS_VERSION, issuerIdHash: snapshot.issuerIdHash, issuerStatus: snapshot.issuerStatus, lifecycleEventHash: snapshot.lifecycleEventHash, lifecycleSequence: snapshot.lifecycleSequence, snapshotFingerprint: snapshot.snapshotFingerprint, signatureEnvelopeFingerprint: envelope.envelopeFingerprint, trustBundleFingerprint: bundle.bundleFingerprint, observedAt: snapshot.observedAt, validUntil: snapshot.validUntil, verifiedOffline: true, directIdentifiersStored: false, rawSnapshotStored: false, rawSignatureStored: false, privateKeyMaterialPresent: false, networkRequests: 0, databaseConnections: 0, remoteIdentityProviderContacted: false, productionAllowed: false, remoteExecutionAuthorized: false });
}

function validateCredential(attestation, verifiedIdentity, record) {
  assert(attestation && attestation.attestationVersion === evidence.IDENTITY_ATTESTATION_VERSION, 'DOKE_PAY_A15_IDENTITY_ATTESTATION_REQUIRED', 'A14 attestation required.');
  assert(verifiedIdentity && verifiedIdentity.verifiedIdentityVersion === evidence.VERIFIED_IDENTITY_VERSION && verifiedIdentity.verifiedOffline === true, 'DOKE_PAY_A15_VERIFIED_IDENTITY_REQUIRED', 'Verified A14 identity required.');
  assert(attestation.attestationFingerprint === verifiedIdentity.attestationFingerprint, 'DOKE_PAY_A15_IDENTITY_ATTESTATION_MISMATCH', 'Attestation mismatch.');
  assert(attestation.issuerIdHash === record.issuerIdHash && verifiedIdentity.issuerIdHash === record.issuerIdHash, 'DOKE_PAY_A15_CREDENTIAL_ISSUER_MISMATCH', 'Credential issuer mismatch.');
  assert(attestation.subjectIdHash === verifiedIdentity.subjectIdHash, 'DOKE_PAY_A15_CREDENTIAL_SUBJECT_MISMATCH', 'Credential subject mismatch.');
  assert(attestation.role === verifiedIdentity.role && record.allowedRoles.includes(attestation.role), 'DOKE_PAY_A15_CREDENTIAL_ROLE_DENIED', 'Credential role denied.');
  assert(attestation.assuranceLevel === verifiedIdentity.assuranceLevel && record.allowedAssuranceLevels.includes(attestation.assuranceLevel), 'DOKE_PAY_A15_CREDENTIAL_ASSURANCE_DENIED', 'Credential assurance denied.');
  assert(attestation.production === false && attestation.containsDirectIdentifiers === false, 'DOKE_PAY_A15_CREDENTIAL_DATA_BOUNDARY_VIOLATION', 'Credential data boundary violated.');
}

function acceptIdentityCredential(attestation, verifiedIdentity, record, status, options = {}) {
  validateCredential(attestation, verifiedIdentity, record);
  assert(status && status.verifiedStatusVersion === VERIFIED_STATUS_VERSION && status.verifiedOffline === true, 'DOKE_PAY_A15_VERIFIED_STATUS_REQUIRED', 'Verified issuer status required.');
  assert(status.issuerIdHash === record.issuerIdHash, 'DOKE_PAY_A15_STATUS_ISSUER_MISMATCH', 'Status issuer mismatch.');
  assert(status.issuerStatus === 'active', 'DOKE_PAY_A15_ISSUER_NOT_ACTIVE', 'Issuer not active.');
  const nowMs = options.now ? parseTime(options.now, 'DOKE_PAY_A15_NOW_INVALID', 'Credential clock') : Date.now();
  const observed = parseTime(status.observedAt, 'DOKE_PAY_A15_STATUS_TIME_INVALID', 'observedAt');
  const validUntil = parseTime(status.validUntil, 'DOKE_PAY_A15_STATUS_TIME_INVALID', 'validUntil');
  assert(nowMs >= observed && nowMs <= validUntil, 'DOKE_PAY_A15_STATUS_SNAPSHOT_STALE', 'Status snapshot stale.');
  const issuedAt = parseTime(attestation.issuedAt, 'DOKE_PAY_A15_CREDENTIAL_TIME_INVALID', 'issuedAt');
  const expiresAt = parseTime(attestation.expiresAt, 'DOKE_PAY_A15_CREDENTIAL_TIME_INVALID', 'expiresAt');
  assert(issuedAt <= observed, 'DOKE_PAY_A15_CREDENTIAL_NEWER_THAN_STATUS', 'Credential newer than status.');
  assert(nowMs >= issuedAt && nowMs <= expiresAt, 'DOKE_PAY_A15_CREDENTIAL_EXPIRED', 'Credential expired.');
  const body = { acceptanceVersion: CREDENTIAL_ACCEPTANCE_VERSION, issuerIdHash: record.issuerIdHash, subjectIdHash: attestation.subjectIdHash, role: attestation.role, assuranceLevel: attestation.assuranceLevel, attestationFingerprint: attestation.attestationFingerprint, statusSnapshotFingerprint: status.snapshotFingerprint, acceptedAt: options.acceptedAt || new Date(nowMs).toISOString(), production: false };
  return Object.freeze({ ...body, acceptanceFingerprint: sha256(canonicalJson(body)), accepted: true, directIdentifiersStored: false, rawCredentialStored: false, networkRequests: 0, databaseConnections: 0, remoteIdentityProviderContacted: false, stagingAuthorized: false, productionAllowed: false, remoteExecutionAuthorized: false });
}

function buildCredentialInvalidationReceipt(attestation, record, status, options = {}) {
  assert(attestation && attestation.attestationVersion === evidence.IDENTITY_ATTESTATION_VERSION, 'DOKE_PAY_A15_IDENTITY_ATTESTATION_REQUIRED', 'A14 attestation required.');
  assert(status && status.verifiedStatusVersion === VERIFIED_STATUS_VERSION, 'DOKE_PAY_A15_VERIFIED_STATUS_REQUIRED', 'Verified status required.');
  assert(attestation.issuerIdHash === record.issuerIdHash && status.issuerIdHash === record.issuerIdHash, 'DOKE_PAY_A15_CREDENTIAL_ISSUER_MISMATCH', 'Invalidation issuer mismatch.');
  const nowMs = options.now ? parseTime(options.now, 'DOKE_PAY_A15_NOW_INVALID', 'Invalidation clock') : Date.now();
  const validUntil = parseTime(status.validUntil, 'DOKE_PAY_A15_STATUS_TIME_INVALID', 'validUntil');
  let reason;
  if (nowMs > validUntil) reason = 'status_snapshot_stale';
  else if (status.issuerStatus === 'suspended') reason = 'issuer_suspended';
  else if (status.issuerStatus === 'revoked') reason = 'issuer_revoked';
  else if (status.issuerStatus === 'retired') reason = 'issuer_retired';
  else fail('DOKE_PAY_A15_INVALIDATION_NOT_REQUIRED', 'Fresh active status does not require invalidation.');
  const body = { invalidationVersion: CREDENTIAL_INVALIDATION_VERSION, issuerIdHash: record.issuerIdHash, subjectIdHash: attestation.subjectIdHash, attestationFingerprint: attestation.attestationFingerprint, statusSnapshotFingerprint: status.snapshotFingerprint, reason, invalidatedAt: options.invalidatedAt || new Date(nowMs).toISOString(), production: false };
  return Object.freeze({ ...body, invalidationFingerprint: sha256(canonicalJson(body)), invalidated: true, staleCredentialInvalidated: reason === 'status_snapshot_stale', directIdentifiersStored: false, rawCredentialStored: false, remoteRevocationPerformed: false, networkRequests: 0, databaseConnections: 0, stagingAuthorized: false, productionAllowed: false, remoteExecutionAuthorized: false });
}

function buildAuditRetentionHandoff(record, artifacts, options = {}) {
  assert(Array.isArray(artifacts) && artifacts.length > 0 && artifacts.length <= 100, 'DOKE_PAY_A15_RETENTION_ARTIFACTS_REQUIRED', 'Retention artifacts required.');
  const normalized = artifacts.map((artifact) => {
    assertExactKeys(artifact, ['artifactType', 'artifactHash'], 'DOKE_PAY_A15_RETENTION_ARTIFACT_INVALID', 'Retention artifact');
    assert(RETENTION_ARTIFACT_TYPES.includes(artifact.artifactType), 'DOKE_PAY_A15_RETENTION_ARTIFACT_TYPE_INVALID', 'Retention artifact type invalid.');
    assertHash(artifact.artifactHash, 'DOKE_PAY_A15_RETENTION_ARTIFACT_HASH_INVALID', 'Retention artifact hash');
    return { ...artifact };
  });
  assert(new Set(normalized.map((item) => item.artifactType + ':' + item.artifactHash)).size === normalized.length, 'DOKE_PAY_A15_DUPLICATE_RETENTION_ARTIFACT_DENIED', 'Duplicate retention artifact denied.');
  const createdAt = options.createdAt || new Date().toISOString();
  const retentionUntil = options.retentionUntil;
  const created = parseTime(createdAt, 'DOKE_PAY_A15_RETENTION_TIME_INVALID', 'createdAt');
  const until = parseTime(retentionUntil, 'DOKE_PAY_A15_RETENTION_TIME_INVALID', 'retentionUntil');
  assert(until - created >= MINIMUM_RETENTION_DAYS * 86400000, 'DOKE_PAY_A15_RETENTION_WINDOW_TOO_SHORT', 'Retention window too short.');
  const body = { handoffVersion: RETENTION_HANDOFF_VERSION, handoffId: options.handoffId, issuerIdHash: record.issuerIdHash, issuerRecordFingerprint: record.recordFingerprint, artifacts: normalized.slice().sort((a, b) => (a.artifactType + a.artifactHash).localeCompare(b.artifactType + b.artifactHash)), createdAt, retentionUntil, minimumRetentionDays: MINIMUM_RETENTION_DAYS, legalHold: options.legalHold === true, preserveImmutability: true, hashesOnly: true, rawIdentityDataIncluded: false, privateKeyMaterialIncluded: false, deleteRemoteArtifacts: false, externalArchiveRequired: true, production: false };
  assertId(body.handoffId, 'DOKE_PAY_A15_RETENTION_HANDOFF_ID_INVALID', 'Retention handoff id');
  const result = { ...body, handoffFingerprint: sha256(canonicalJson(body)), remoteArchiveConfigured: false, remoteArchiveWritePerformed: false, repositoryDeletionAuthorized: false, networkRequests: 0, databaseConnections: 0, stagingAuthorized: false, productionAllowed: false, remoteExecutionAuthorized: false };
  return Object.freeze(result);
}

function validateAuditRetentionHandoff(handoff) {
  assert(handoff && handoff.handoffVersion === RETENTION_HANDOFF_VERSION, 'DOKE_PAY_A15_RETENTION_HANDOFF_VERSION_INVALID', 'Retention handoff version invalid.');
  assertHash(handoff.issuerIdHash, 'DOKE_PAY_A15_ISSUER_HASH_INVALID', 'Retention issuer hash');
  assertHash(handoff.issuerRecordFingerprint, 'DOKE_PAY_A15_ISSUER_RECORD_FINGERPRINT_INVALID', 'Retention record fingerprint');
  assert(Array.isArray(handoff.artifacts) && handoff.artifacts.length > 0, 'DOKE_PAY_A15_RETENTION_ARTIFACTS_REQUIRED', 'Retention artifacts required.');
  handoff.artifacts.forEach((artifact) => { assert(RETENTION_ARTIFACT_TYPES.includes(artifact.artifactType), 'DOKE_PAY_A15_RETENTION_ARTIFACT_TYPE_INVALID', 'Retention artifact type invalid.'); assertHash(artifact.artifactHash, 'DOKE_PAY_A15_RETENTION_ARTIFACT_HASH_INVALID', 'Retention artifact hash'); });
  const created = parseTime(handoff.createdAt, 'DOKE_PAY_A15_RETENTION_TIME_INVALID', 'createdAt');
  const until = parseTime(handoff.retentionUntil, 'DOKE_PAY_A15_RETENTION_TIME_INVALID', 'retentionUntil');
  assert(handoff.minimumRetentionDays === MINIMUM_RETENTION_DAYS && until - created >= MINIMUM_RETENTION_DAYS * 86400000, 'DOKE_PAY_A15_RETENTION_WINDOW_TOO_SHORT', 'Retention policy not satisfied.');
  ['preserveImmutability', 'hashesOnly', 'externalArchiveRequired'].forEach((key) => assert(handoff[key] === true, 'DOKE_PAY_A15_RETENTION_POLICY_INVALID', 'Retention policy invalid: ' + key));
  ['rawIdentityDataIncluded', 'privateKeyMaterialIncluded', 'deleteRemoteArtifacts', 'remoteArchiveConfigured', 'remoteArchiveWritePerformed', 'repositoryDeletionAuthorized', 'stagingAuthorized', 'productionAllowed', 'remoteExecutionAuthorized'].forEach((key) => assert(handoff[key] === false, 'DOKE_PAY_A15_RETENTION_AUTHORITY_ESCALATION', 'Retention boundary invalid: ' + key));
  assert(handoff.production === false, 'DOKE_PAY_A15_PRODUCTION_RETENTION_DENIED', 'Production retention denied.');
  assert(handoff.networkRequests === 0 && handoff.databaseConnections === 0, 'DOKE_PAY_A15_EFFECT_NONZERO', 'Retention effects nonzero.');
  assertHash(handoff.handoffFingerprint, 'DOKE_PAY_A15_RETENTION_FINGERPRINT_INVALID', 'Retention fingerprint');
  assert(handoff.handoffFingerprint === computeRetentionHandoffFingerprint(handoff), 'DOKE_PAY_A15_RETENTION_FINGERPRINT_MISMATCH', 'Retention fingerprint mismatch.');
  return handoff;
}

module.exports = Object.freeze({
  CONTRACT_VERSION, ISSUER_RECORD_VERSION, LIFECYCLE_EVENT_VERSION,
  STATUS_SNAPSHOT_VERSION, STATUS_SIGNATURE_VERSION, VERIFIED_STATUS_VERSION,
  CREDENTIAL_ACCEPTANCE_VERSION, CREDENTIAL_INVALIDATION_VERSION,
  RETENTION_HANDOFF_VERSION, STATUS_CHAIN_VERSION, STATUS_SIGNING_DOMAIN,
  A14_CONTRACT_VERSION, MAX_STATUS_SNAPSHOT_AGE_SECONDS, MINIMUM_RETENTION_DAYS,
  ISSUER_STATUSES, LIFECYCLE_REASON_CODES, ALLOWED_TRANSITIONS,
  RETENTION_ARTIFACT_TYPES, computeIssuerRecordFingerprint,
  computeLifecycleEventHash, computeStatusSnapshotFingerprint,
  computeStatusSignatureFingerprint, computeRetentionHandoffFingerprint,
  validateIssuerRecord, createIssuerLifecycleEvent, validateIssuerLifecycleChain,
  verifyIssuerStatusSnapshot, acceptIdentityCredential,
  buildCredentialInvalidationReceipt, buildAuditRetentionHandoff,
  validateAuditRetentionHandoff
});
