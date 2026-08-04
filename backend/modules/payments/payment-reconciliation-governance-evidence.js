'use strict';

const crypto = require('node:crypto');
const {
  ALLOWED_SIGNATURE_SCHEMES,
  canonicalJson,
  sha256
} = require('./payment-reconciliation-executor-adapter');
const governance = require('./payment-reconciliation-executor-governance');

const CONTRACT_VERSION = 'pay-a14-governance-evidence-chain-v1';
const IDENTITY_TRUST_BUNDLE_VERSION = 'pay-external-identity-trust-bundle-v1';
const IDENTITY_ATTESTATION_VERSION = 'pay-external-identity-attestation-v1';
const EVIDENCE_BUNDLE_VERSION = 'pay-governance-evidence-bundle-v1';
const SIGNATURE_ENVELOPE_VERSION = 'pay-governance-detached-signature-v1';
const VERIFIED_IDENTITY_VERSION = 'pay-verified-external-identity-v1';
const VERIFIED_EVIDENCE_VERSION = 'pay-verified-governance-evidence-v1';
const DECISION_RECEIPT_VERSION = 'pay-lifecycle-decision-receipt-v1';
const DECISION_CHAIN_VERSION = 'pay-lifecycle-decision-chain-v1';
const SIGNING_DOMAIN = 'doke-pay-governance-evidence-v1';
const A13_CONTRACT_VERSION = governance.CONTRACT_VERSION;
const A13_DECISION_VERSION = governance.DECISION_VERSION;

const ALLOWED_PURPOSES = Object.freeze([
  'identity_attestation',
  'governance_evidence'
]);
const ALLOWED_ASSURANCE_LEVELS = Object.freeze(['aal2', 'aal3']);
const ALLOWED_CREDENTIAL_STATUSES = Object.freeze(['active']);
const ROOT_STATUSES = Object.freeze(['active', 'revoked']);
const PRIVATE_JWK_FIELDS = Object.freeze(['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth', 'k']);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function assert(condition, code, message) {
  if (!condition) fail(code, message);
}

function assertExactKeys(value, allowedKeys, code, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), code, label + ' is required.');
  Object.keys(value).forEach((key) => {
    assert(allowedKeys.includes(key), code, label + ' field is not allowlisted: ' + key);
  });
}

function assertHash(value, code, label) {
  assert(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), code, label + ' must be a SHA-256 digest.');
}

function assertHead(value, code, label) {
  assert(typeof value === 'string' && /^[a-f0-9]{40}$/.test(value), code, label + ' must be an exact git commit.');
}

function assertId(value, code, label) {
  assert(typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{7,95}$/.test(value), code, label + ' is invalid.');
}

function parseTime(value, code, label) {
  const parsed = Date.parse(value);
  assert(Number.isFinite(parsed), code, label + ' must be a valid timestamp.');
  return parsed;
}

function strictBase64(value) {
  assert(typeof value === 'string' && value.length > 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value), 'DOKE_PAY_A14_SIGNATURE_BASE64_INVALID', 'Signature must be canonical base64.');
  const bytes = Buffer.from(value, 'base64');
  assert(bytes.length > 0, 'DOKE_PAY_A14_SIGNATURE_BASE64_INVALID', 'Signature may not be empty.');
  const normalizedInput = value.replace(/=+$/u, '');
  const normalizedOutput = bytes.toString('base64').replace(/=+$/u, '');
  assert(normalizedInput === normalizedOutput, 'DOKE_PAY_A14_SIGNATURE_BASE64_INVALID', 'Signature base64 is not canonical.');
  return bytes;
}

function withoutFingerprint(value, key) {
  const body = { ...value };
  delete body[key];
  return body;
}

function computeFingerprint(value, key) {
  return sha256(canonicalJson(withoutFingerprint(value, key)));
}

function publicKeyFingerprint(publicKeyJwk) {
  return sha256(canonicalJson(publicKeyJwk));
}

function assertPublicJwk(publicKeyJwk) {
  assert(publicKeyJwk && typeof publicKeyJwk === 'object' && !Array.isArray(publicKeyJwk), 'DOKE_PAY_A14_PUBLIC_JWK_REQUIRED', 'Public JWK is required.');
  PRIVATE_JWK_FIELDS.forEach((field) => {
    assert(!Object.prototype.hasOwnProperty.call(publicKeyJwk, field), 'DOKE_PAY_A14_PRIVATE_KEY_MATERIAL_DENIED', 'Private key material is denied.');
  });
  assert(typeof publicKeyJwk.kty === 'string', 'DOKE_PAY_A14_PUBLIC_JWK_INVALID', 'Public JWK kty is required.');
}

function computeIdentityTrustBundleFingerprint(bundle) {
  return computeFingerprint(bundle, 'bundleFingerprint');
}

function computeSignatureEnvelopeFingerprint(envelope) {
  return computeFingerprint(envelope, 'envelopeFingerprint');
}

function computeIdentityAttestationFingerprint(attestation) {
  return computeFingerprint(attestation, 'attestationFingerprint');
}

function computeEvidenceBundleFingerprint(bundle) {
  return computeFingerprint(bundle, 'bundleFingerprint');
}

function decisionReceiptBody(receipt) {
  return {
    receiptVersion: receipt.receiptVersion,
    chainVersion: receipt.chainVersion,
    sequence: receipt.sequence,
    previousReceiptHash: receipt.previousReceiptHash,
    evidenceBundleFingerprint: receipt.evidenceBundleFingerprint,
    evidenceEnvelopeFingerprint: receipt.evidenceEnvelopeFingerprint,
    requestFingerprint: receipt.requestFingerprint,
    decisionFingerprint: receipt.decisionFingerprint,
    action: receipt.action,
    executorIdHash: receipt.executorIdHash,
    exactGitHead: receipt.exactGitHead,
    acceptedAt: receipt.acceptedAt,
    production: receipt.production
  };
}

function computeDecisionReceiptHash(receipt) {
  return sha256(canonicalJson(decisionReceiptBody(receipt)));
}

function validateTrustRoot(root) {
  assertExactKeys(root, [
    'keyId', 'keyFamily', 'keyVersion', 'algorithm', 'publicKeyJwk',
    'publicKeyFingerprint', 'status', 'notBefore', 'notAfter', 'revokedAt',
    'allowedPurposes', 'allowedSignerIdHashes', 'allowedRoles',
    'allowedAssuranceLevels', 'production'
  ], 'DOKE_PAY_A14_TRUST_ROOT_INVALID', 'Evidence trust root');
  assertId(root.keyId, 'DOKE_PAY_A14_KEY_ID_INVALID', 'Trust-root key id');
  assertId(root.keyFamily, 'DOKE_PAY_A14_KEY_FAMILY_INVALID', 'Trust-root key family');
  assert(Number.isInteger(root.keyVersion) && root.keyVersion >= 1, 'DOKE_PAY_A14_KEY_VERSION_INVALID', 'Trust-root key version is invalid.');
  assert(ALLOWED_SIGNATURE_SCHEMES.includes(root.algorithm), 'DOKE_PAY_A14_SIGNATURE_SCHEME_INVALID', 'Trust-root signature scheme is invalid.');
  assert(ROOT_STATUSES.includes(root.status), 'DOKE_PAY_A14_ROOT_STATUS_INVALID', 'Trust-root status is invalid.');
  assert(root.production === false, 'DOKE_PAY_A14_PRODUCTION_ROOT_DENIED', 'Production trust roots are denied.');
  assertPublicJwk(root.publicKeyJwk);
  assertHash(root.publicKeyFingerprint, 'DOKE_PAY_A14_PUBLIC_KEY_FINGERPRINT_INVALID', 'Public-key fingerprint');
  assert(root.publicKeyFingerprint === publicKeyFingerprint(root.publicKeyJwk), 'DOKE_PAY_A14_PUBLIC_KEY_FINGERPRINT_MISMATCH', 'Public-key fingerprint mismatch.');
  const notBefore = parseTime(root.notBefore, 'DOKE_PAY_A14_ROOT_TIME_INVALID', 'Trust-root notBefore');
  const notAfter = parseTime(root.notAfter, 'DOKE_PAY_A14_ROOT_TIME_INVALID', 'Trust-root notAfter');
  assert(notAfter > notBefore, 'DOKE_PAY_A14_ROOT_WINDOW_INVALID', 'Trust-root validity window is invalid.');
  if (root.status === 'revoked') parseTime(root.revokedAt, 'DOKE_PAY_A14_ROOT_TIME_INVALID', 'Trust-root revokedAt');
  else assert(root.revokedAt == null, 'DOKE_PAY_A14_ACTIVE_ROOT_REVOCATION_DENIED', 'Active root may not declare revokedAt.');
  assert(Array.isArray(root.allowedPurposes) && root.allowedPurposes.length > 0, 'DOKE_PAY_A14_PURPOSE_ALLOWLIST_REQUIRED', 'Purpose allowlist is required.');
  root.allowedPurposes.forEach((purpose) => assert(ALLOWED_PURPOSES.includes(purpose), 'DOKE_PAY_A14_PURPOSE_INVALID', 'Purpose is invalid.'));
  assert(new Set(root.allowedPurposes).size === root.allowedPurposes.length, 'DOKE_PAY_A14_DUPLICATE_PURPOSE_DENIED', 'Duplicate purposes are denied.');
  assert(Array.isArray(root.allowedSignerIdHashes) && root.allowedSignerIdHashes.length > 0, 'DOKE_PAY_A14_SIGNER_ALLOWLIST_REQUIRED', 'Signer allowlist is required.');
  root.allowedSignerIdHashes.forEach((value) => assertHash(value, 'DOKE_PAY_A14_SIGNER_HASH_INVALID', 'Signer id hash'));
  assert(new Set(root.allowedSignerIdHashes).size === root.allowedSignerIdHashes.length, 'DOKE_PAY_A14_DUPLICATE_SIGNER_DENIED', 'Duplicate signers are denied.');
  assert(Array.isArray(root.allowedRoles), 'DOKE_PAY_A14_ROLE_ALLOWLIST_REQUIRED', 'Role allowlist is required.');
  root.allowedRoles.forEach((role) => assert(governance.APPROVER_ROLES.includes(role), 'DOKE_PAY_A14_ROLE_INVALID', 'Approver role is invalid.'));
  assert(new Set(root.allowedRoles).size === root.allowedRoles.length, 'DOKE_PAY_A14_DUPLICATE_ROLE_DENIED', 'Duplicate roles are denied.');
  assert(Array.isArray(root.allowedAssuranceLevels), 'DOKE_PAY_A14_ASSURANCE_ALLOWLIST_REQUIRED', 'Assurance allowlist is required.');
  root.allowedAssuranceLevels.forEach((level) => assert(ALLOWED_ASSURANCE_LEVELS.includes(level), 'DOKE_PAY_A14_ASSURANCE_INVALID', 'Assurance level is invalid.'));
  assert(new Set(root.allowedAssuranceLevels).size === root.allowedAssuranceLevels.length, 'DOKE_PAY_A14_DUPLICATE_ASSURANCE_DENIED', 'Duplicate assurance levels are denied.');
  return root;
}

function validateIdentityTrustBundle(bundle) {
  assertExactKeys(bundle, [
    'bundleVersion', 'bundleId', 'issuedAt', 'production',
    'repositoryManagedPrivateKeys', 'roots', 'bundleFingerprint'
  ], 'DOKE_PAY_A14_TRUST_BUNDLE_INVALID', 'Identity trust bundle');
  assert(bundle.bundleVersion === IDENTITY_TRUST_BUNDLE_VERSION, 'DOKE_PAY_A14_TRUST_BUNDLE_VERSION_INVALID', 'Identity trust-bundle version is invalid.');
  assertId(bundle.bundleId, 'DOKE_PAY_A14_TRUST_BUNDLE_ID_INVALID', 'Identity trust-bundle id');
  parseTime(bundle.issuedAt, 'DOKE_PAY_A14_TRUST_BUNDLE_TIME_INVALID', 'Identity trust-bundle issuedAt');
  assert(bundle.production === false, 'DOKE_PAY_A14_PRODUCTION_BUNDLE_DENIED', 'Production trust bundles are denied.');
  assert(bundle.repositoryManagedPrivateKeys === false, 'DOKE_PAY_A14_PRIVATE_KEY_CUSTODY_DENIED', 'Repository-managed private keys are denied.');
  assert(Array.isArray(bundle.roots) && bundle.roots.length > 0 && bundle.roots.length <= 20, 'DOKE_PAY_A14_TRUST_ROOTS_REQUIRED', 'One to twenty trust roots are required.');
  bundle.roots.forEach(validateTrustRoot);
  const keyIds = bundle.roots.map((root) => root.keyId);
  const versions = bundle.roots.map((root) => root.keyFamily + ':' + root.keyVersion);
  assert(new Set(keyIds).size === keyIds.length, 'DOKE_PAY_A14_DUPLICATE_KEY_ID_DENIED', 'Duplicate key ids are denied.');
  assert(new Set(versions).size === versions.length, 'DOKE_PAY_A14_DUPLICATE_KEY_VERSION_DENIED', 'Duplicate key-family versions are denied.');
  assertHash(bundle.bundleFingerprint, 'DOKE_PAY_A14_TRUST_BUNDLE_FINGERPRINT_INVALID', 'Identity trust-bundle fingerprint');
  assert(bundle.bundleFingerprint === computeIdentityTrustBundleFingerprint(bundle), 'DOKE_PAY_A14_TRUST_BUNDLE_FINGERPRINT_MISMATCH', 'Identity trust-bundle fingerprint mismatch.');
  return Object.freeze({ ...bundle, roots: Object.freeze(bundle.roots.map((root) => Object.freeze({ ...root }))) });
}

function validateSignatureEnvelope(envelope) {
  assertExactKeys(envelope, [
    'envelopeVersion', 'purpose', 'keyId', 'keyVersion', 'signatureScheme',
    'signerIdHash', 'signedPayloadHash', 'signatureBase64', 'signatureHash',
    'signedAt', 'bundleFingerprint', 'envelopeFingerprint'
  ], 'DOKE_PAY_A14_SIGNATURE_ENVELOPE_INVALID', 'Detached-signature envelope');
  assert(envelope.envelopeVersion === SIGNATURE_ENVELOPE_VERSION, 'DOKE_PAY_A14_SIGNATURE_ENVELOPE_VERSION_INVALID', 'Detached-signature envelope version is invalid.');
  assert(ALLOWED_PURPOSES.includes(envelope.purpose), 'DOKE_PAY_A14_PURPOSE_INVALID', 'Detached-signature purpose is invalid.');
  assertId(envelope.keyId, 'DOKE_PAY_A14_KEY_ID_INVALID', 'Detached-signature key id');
  assert(Number.isInteger(envelope.keyVersion) && envelope.keyVersion >= 1, 'DOKE_PAY_A14_KEY_VERSION_INVALID', 'Detached-signature key version is invalid.');
  assert(ALLOWED_SIGNATURE_SCHEMES.includes(envelope.signatureScheme), 'DOKE_PAY_A14_SIGNATURE_SCHEME_INVALID', 'Detached-signature scheme is invalid.');
  assertHash(envelope.signerIdHash, 'DOKE_PAY_A14_SIGNER_HASH_INVALID', 'Signer id hash');
  ['signedPayloadHash', 'signatureHash', 'bundleFingerprint', 'envelopeFingerprint'].forEach((key) => {
    assertHash(envelope[key], 'DOKE_PAY_A14_SIGNATURE_HASH_INVALID', key);
  });
  parseTime(envelope.signedAt, 'DOKE_PAY_A14_SIGNATURE_TIME_INVALID', 'Detached-signature signedAt');
  const signature = strictBase64(envelope.signatureBase64);
  assert(envelope.envelopeFingerprint === computeSignatureEnvelopeFingerprint(envelope), 'DOKE_PAY_A14_SIGNATURE_ENVELOPE_FINGERPRINT_MISMATCH', 'Detached-signature envelope fingerprint mismatch.');
  return signature;
}

function signingPayload(purpose, value) {
  return Buffer.from(canonicalJson({
    signingDomain: SIGNING_DOMAIN,
    purpose,
    payload: value
  }), 'utf8');
}

function verifySignedValue(value, envelope, trustBundle, context = {}, options = {}) {
  const bundle = validateIdentityTrustBundle(trustBundle);
  const signature = validateSignatureEnvelope(envelope);
  assert(envelope.purpose === context.purpose, 'DOKE_PAY_A14_SIGNATURE_PURPOSE_MISMATCH', 'Detached-signature purpose mismatch.');
  assert(envelope.bundleFingerprint === bundle.bundleFingerprint, 'DOKE_PAY_A14_SIGNATURE_BUNDLE_MISMATCH', 'Detached signature is not bound to this trust bundle.');
  const root = bundle.roots.find((candidate) => candidate.keyId === envelope.keyId && candidate.keyVersion === envelope.keyVersion);
  assert(root, 'DOKE_PAY_A14_TRUST_ROOT_NOT_FOUND', 'Detached-signature trust root was not found.');
  assert(root.status === 'active', 'DOKE_PAY_A14_TRUST_ROOT_REVOKED', 'Revoked trust roots are denied.');
  assert(root.algorithm === envelope.signatureScheme, 'DOKE_PAY_A14_SIGNATURE_SCHEME_MISMATCH', 'Detached-signature scheme does not match the trust root.');
  assert(root.allowedPurposes.includes(context.purpose), 'DOKE_PAY_A14_PURPOSE_NOT_ALLOWED', 'Signing purpose is not allowed for this root.');
  assert(root.allowedSignerIdHashes.includes(envelope.signerIdHash), 'DOKE_PAY_A14_SIGNER_NOT_ALLOWED', 'Signer is not allowlisted for this root.');
  if (context.role) assert(root.allowedRoles.includes(context.role), 'DOKE_PAY_A14_ROLE_NOT_ALLOWED', 'Role is not allowlisted for this root.');
  if (context.assuranceLevel) assert(root.allowedAssuranceLevels.includes(context.assuranceLevel), 'DOKE_PAY_A14_ASSURANCE_NOT_ALLOWED', 'Assurance level is not allowlisted for this root.');
  const nowMs = options.now ? parseTime(options.now, 'DOKE_PAY_A14_NOW_INVALID', 'Verification clock') : Date.now();
  const signedAt = parseTime(envelope.signedAt, 'DOKE_PAY_A14_SIGNATURE_TIME_INVALID', 'Detached-signature signedAt');
  const notBefore = parseTime(root.notBefore, 'DOKE_PAY_A14_ROOT_TIME_INVALID', 'Trust-root notBefore');
  const notAfter = parseTime(root.notAfter, 'DOKE_PAY_A14_ROOT_TIME_INVALID', 'Trust-root notAfter');
  assert(signedAt >= notBefore && signedAt <= notAfter && nowMs <= notAfter, 'DOKE_PAY_A14_TRUST_ROOT_OUTSIDE_WINDOW', 'Trust root is outside its validity window.');
  const payload = signingPayload(context.purpose, value);
  assert(envelope.signedPayloadHash === sha256(payload), 'DOKE_PAY_A14_SIGNED_PAYLOAD_HASH_MISMATCH', 'Signed payload hash mismatch.');
  assert(envelope.signatureHash === sha256(signature), 'DOKE_PAY_A14_SIGNATURE_HASH_MISMATCH', 'Signature hash mismatch.');
  let publicKey;
  try {
    publicKey = crypto.createPublicKey({ key: root.publicKeyJwk, format: 'jwk' });
  } catch {
    fail('DOKE_PAY_A14_PUBLIC_KEY_IMPORT_FAILED', 'Public key import failed.');
  }
  let verified = false;
  if (root.algorithm === 'ed25519') {
    verified = crypto.verify(null, payload, publicKey, signature);
  } else {
    verified = crypto.verify('sha256', payload, {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32
    }, signature);
  }
  assert(verified, 'DOKE_PAY_A14_SIGNATURE_INVALID', 'Detached signature verification failed.');
  const ledger = options.signatureLedger || new Set();
  assert(!ledger.has(envelope.envelopeFingerprint), 'DOKE_PAY_A14_SIGNATURE_REPLAYED', 'Detached-signature replay is denied.');
  ledger.add(envelope.envelopeFingerprint);
  return Object.freeze({
    root,
    envelopeFingerprint: envelope.envelopeFingerprint,
    trustBundleFingerprint: bundle.bundleFingerprint,
    signedPayloadHash: envelope.signedPayloadHash,
    verifiedOffline: true,
    rawSignatureStored: false,
    privateKeyMaterialPresent: false
  });
}

function validateIdentityAttestation(attestation, options = {}) {
  assertExactKeys(attestation, [
    'attestationVersion', 'attestationId', 'issuerIdHash', 'subjectIdHash',
    'role', 'assuranceLevel', 'credentialStatus', 'evidenceHash', 'nonceHash',
    'issuedAt', 'expiresAt', 'production', 'containsDirectIdentifiers',
    'attestationFingerprint'
  ], 'DOKE_PAY_A14_IDENTITY_ATTESTATION_INVALID', 'External identity attestation');
  assert(attestation.attestationVersion === IDENTITY_ATTESTATION_VERSION, 'DOKE_PAY_A14_IDENTITY_VERSION_INVALID', 'External identity-attestation version is invalid.');
  assertId(attestation.attestationId, 'DOKE_PAY_A14_IDENTITY_ID_INVALID', 'External identity-attestation id');
  assertHash(attestation.issuerIdHash, 'DOKE_PAY_A14_ISSUER_HASH_INVALID', 'Identity issuer hash');
  assertHash(attestation.subjectIdHash, 'DOKE_PAY_A14_SUBJECT_HASH_INVALID', 'Identity subject hash');
  assert(governance.APPROVER_ROLES.includes(attestation.role), 'DOKE_PAY_A14_ROLE_INVALID', 'Identity role is invalid.');
  assert(ALLOWED_ASSURANCE_LEVELS.includes(attestation.assuranceLevel), 'DOKE_PAY_A14_ASSURANCE_INVALID', 'Identity assurance level is invalid.');
  assert(ALLOWED_CREDENTIAL_STATUSES.includes(attestation.credentialStatus), 'DOKE_PAY_A14_CREDENTIAL_STATUS_INVALID', 'Identity credential status is invalid.');
  assertHash(attestation.evidenceHash, 'DOKE_PAY_A14_IDENTITY_EVIDENCE_HASH_INVALID', 'Identity evidence hash');
  assertHash(attestation.nonceHash, 'DOKE_PAY_A14_IDENTITY_NONCE_HASH_INVALID', 'Identity nonce hash');
  const issuedAt = parseTime(attestation.issuedAt, 'DOKE_PAY_A14_IDENTITY_TIME_INVALID', 'Identity issuedAt');
  const expiresAt = parseTime(attestation.expiresAt, 'DOKE_PAY_A14_IDENTITY_TIME_INVALID', 'Identity expiresAt');
  assert(expiresAt > issuedAt && expiresAt - issuedAt <= 24 * 60 * 60 * 1000, 'DOKE_PAY_A14_IDENTITY_WINDOW_INVALID', 'Identity attestation window must be positive and no longer than 24 hours.');
  const nowMs = options.now ? parseTime(options.now, 'DOKE_PAY_A14_NOW_INVALID', 'Verification clock') : Date.now();
  assert(nowMs >= issuedAt && nowMs <= expiresAt, 'DOKE_PAY_A14_IDENTITY_ATTESTATION_EXPIRED', 'Identity attestation is not currently valid.');
  assert(attestation.production === false, 'DOKE_PAY_A14_PRODUCTION_IDENTITY_DENIED', 'Production identity attestations are denied.');
  assert(attestation.containsDirectIdentifiers === false, 'DOKE_PAY_A14_DIRECT_IDENTIFIER_DENIED', 'Direct identity attributes are denied.');
  assertHash(attestation.attestationFingerprint, 'DOKE_PAY_A14_IDENTITY_FINGERPRINT_INVALID', 'Identity attestation fingerprint');
  assert(attestation.attestationFingerprint === computeIdentityAttestationFingerprint(attestation), 'DOKE_PAY_A14_IDENTITY_FINGERPRINT_MISMATCH', 'Identity attestation fingerprint mismatch.');
  return attestation;
}

function verifyExternalIdentityAttestation(attestation, envelope, trustBundle, options = {}) {
  validateIdentityAttestation(attestation, options);
  assert(envelope.signerIdHash === attestation.issuerIdHash, 'DOKE_PAY_A14_IDENTITY_ISSUER_MISMATCH', 'Identity signature signer must match the issuer.');
  assert(envelope.signedAt === attestation.issuedAt, 'DOKE_PAY_A14_IDENTITY_SIGNED_AT_MISMATCH', 'Identity signature time must equal issuedAt.');
  const signature = verifySignedValue(attestation, envelope, trustBundle, {
    purpose: 'identity_attestation',
    role: attestation.role,
    assuranceLevel: attestation.assuranceLevel
  }, options);
  const ledger = options.identityLedger || new Set();
  assert(!ledger.has(attestation.attestationFingerprint), 'DOKE_PAY_A14_IDENTITY_REPLAYED', 'Identity-attestation replay is denied.');
  ledger.add(attestation.attestationFingerprint);
  return Object.freeze({
    verifiedIdentityVersion: VERIFIED_IDENTITY_VERSION,
    attestationFingerprint: attestation.attestationFingerprint,
    subjectIdHash: attestation.subjectIdHash,
    issuerIdHash: attestation.issuerIdHash,
    role: attestation.role,
    assuranceLevel: attestation.assuranceLevel,
    evidenceHash: attestation.evidenceHash,
    signatureEnvelopeFingerprint: signature.envelopeFingerprint,
    trustBundleFingerprint: signature.trustBundleFingerprint,
    verifiedOffline: true,
    directIdentifiersStored: false,
    rawAttestationStored: false,
    rawSignatureStored: false,
    privateKeyMaterialPresent: false,
    networkRequests: 0,
    databaseConnections: 0,
    remoteIdentityProviderContacted: false,
    productionAllowed: false
  });
}

function validateA13Decision(decision) {
  assertExactKeys(decision, [
    'decisionVersion', 'contractVersion', 'a12ContractVersion', 'action',
    'requestFingerprint', 'executorIdHash', 'exactGitHead', 'approvalCount',
    'approvalRoles', 'quorumSatisfied', 'separationOfDutiesSatisfied',
    'custodyAttestationFingerprint', 'trustRootProposalFingerprint',
    'offboardingPlanFingerprint', 'incidentFingerprint', 'decision',
    'realExecutorConfigured', 'realTrustRootConfigured',
    'privateKeyMaterialAccepted', 'stagingAuthorized', 'productionAllowed',
    'remoteExecutionAuthorized', 'nextPhaseAutomaticallyAuthorized',
    'networkRequests', 'databaseConnections', 'subprocesses',
    'environmentReads', 'directMoneyMutationAllowed', 'providerOperationAllowed'
  ], 'DOKE_PAY_A14_A13_DECISION_INVALID', 'PAY-A13 lifecycle decision');
  assert(decision.decisionVersion === A13_DECISION_VERSION, 'DOKE_PAY_A14_A13_DECISION_VERSION_INVALID', 'PAY-A13 decision version mismatch.');
  assert(decision.contractVersion === A13_CONTRACT_VERSION, 'DOKE_PAY_A14_A13_CONTRACT_MISMATCH', 'PAY-A13 contract version mismatch.');
  assert(governance.ALLOWED_ACTIONS.includes(decision.action), 'DOKE_PAY_A14_ACTION_INVALID', 'Lifecycle action is invalid.');
  assertHash(decision.requestFingerprint, 'DOKE_PAY_A14_REQUEST_FINGERPRINT_INVALID', 'Lifecycle request fingerprint');
  assertHash(decision.executorIdHash, 'DOKE_PAY_A14_EXECUTOR_HASH_INVALID', 'Executor id hash');
  assertHead(decision.exactGitHead, 'DOKE_PAY_A14_EXACT_HEAD_INVALID', 'Decision git head');
  assert(Number.isInteger(decision.approvalCount) && decision.approvalCount >= 2, 'DOKE_PAY_A14_APPROVAL_COUNT_INVALID', 'Approval count is invalid.');
  assert(Array.isArray(decision.approvalRoles) && decision.approvalRoles.length === decision.approvalCount, 'DOKE_PAY_A14_APPROVAL_ROLE_COUNT_MISMATCH', 'Approval-role count mismatch.');
  decision.approvalRoles.forEach((role) => assert(governance.APPROVER_ROLES.includes(role), 'DOKE_PAY_A14_ROLE_INVALID', 'Decision role is invalid.'));
  assert(new Set(decision.approvalRoles).size === decision.approvalRoles.length, 'DOKE_PAY_A14_DUPLICATE_DECISION_ROLE_DENIED', 'Duplicate decision roles are denied.');
  assert(decision.quorumSatisfied === true && decision.separationOfDutiesSatisfied === true, 'DOKE_PAY_A14_A13_GOVERNANCE_UNSATISFIED', 'PAY-A13 quorum and separation of duties are required.');
  assert(decision.decision === 'approved_repository_only_handoff', 'DOKE_PAY_A14_A13_DECISION_STATUS_INVALID', 'PAY-A13 decision status is invalid.');
  [
    'realExecutorConfigured', 'realTrustRootConfigured', 'privateKeyMaterialAccepted',
    'stagingAuthorized', 'productionAllowed', 'remoteExecutionAuthorized',
    'nextPhaseAutomaticallyAuthorized', 'directMoneyMutationAllowed',
    'providerOperationAllowed'
  ].forEach((key) => assert(decision[key] === false, 'DOKE_PAY_A14_A13_AUTHORITY_ESCALATION', 'PAY-A13 authority must remain false: ' + key));
  ['networkRequests', 'databaseConnections', 'subprocesses', 'environmentReads'].forEach((key) => {
    assert(decision[key] === 0, 'DOKE_PAY_A14_A13_EFFECT_NONZERO', 'PAY-A13 effect must remain zero: ' + key);
  });
  return decision;
}

function validateApprovalEvidence(approval) {
  assertExactKeys(approval, [
    'approvalVersion', 'approvalId', 'requestFingerprint', 'approverIdHash',
    'role', 'decision', 'approvedAt', 'evidenceHash', 'production',
    'approvalFingerprint'
  ], 'DOKE_PAY_A14_APPROVAL_INVALID', 'PAY-A13 approval evidence');
  assert(approval.approvalVersion === governance.APPROVAL_RECORD_VERSION, 'DOKE_PAY_A14_APPROVAL_VERSION_INVALID', 'Approval version mismatch.');
  assertId(approval.approvalId, 'DOKE_PAY_A14_APPROVAL_ID_INVALID', 'Approval id');
  assertHash(approval.requestFingerprint, 'DOKE_PAY_A14_REQUEST_FINGERPRINT_INVALID', 'Approval request fingerprint');
  assertHash(approval.approverIdHash, 'DOKE_PAY_A14_APPROVER_HASH_INVALID', 'Approver id hash');
  assert(governance.APPROVER_ROLES.includes(approval.role), 'DOKE_PAY_A14_ROLE_INVALID', 'Approval role is invalid.');
  assert(approval.decision === 'approve', 'DOKE_PAY_A14_NON_APPROVAL_DENIED', 'Only explicit approvals may be bundled.');
  parseTime(approval.approvedAt, 'DOKE_PAY_A14_APPROVAL_TIME_INVALID', 'Approval approvedAt');
  assertHash(approval.evidenceHash, 'DOKE_PAY_A14_APPROVAL_EVIDENCE_HASH_INVALID', 'Approval evidence hash');
  assert(approval.production === false, 'DOKE_PAY_A14_PRODUCTION_APPROVAL_DENIED', 'Production approvals are denied.');
  assertHash(approval.approvalFingerprint, 'DOKE_PAY_A14_APPROVAL_FINGERPRINT_INVALID', 'Approval fingerprint');
  assert(approval.approvalFingerprint === governance.computeApprovalFingerprint(approval), 'DOKE_PAY_A14_APPROVAL_FINGERPRINT_MISMATCH', 'Approval fingerprint mismatch.');
  return approval;
}

function buildGovernanceEvidenceBundle(decision, approvals, verifiedIdentities, options = {}) {
  validateA13Decision(decision);
  assert(Array.isArray(approvals) && approvals.length === decision.approvalCount, 'DOKE_PAY_A14_APPROVAL_INVENTORY_MISMATCH', 'Approval inventory must match the PAY-A13 decision.');
  const validatedApprovals = approvals.map(validateApprovalEvidence);
  assert(Array.isArray(verifiedIdentities) && verifiedIdentities.length === validatedApprovals.length, 'DOKE_PAY_A14_IDENTITY_INVENTORY_MISMATCH', 'Verified identity inventory must match approvals.');
  const subjects = verifiedIdentities.map((identity) => identity.subjectIdHash);
  assert(new Set(subjects).size === subjects.length, 'DOKE_PAY_A14_DUPLICATE_IDENTITY_SUBJECT_DENIED', 'Duplicate identity subjects are denied.');
  const entries = validatedApprovals.map((approval) => {
    assert(approval.requestFingerprint === decision.requestFingerprint, 'DOKE_PAY_A14_APPROVAL_REQUEST_MISMATCH', 'Approval request does not match the decision.');
    const identity = verifiedIdentities.find((candidate) => candidate.subjectIdHash === approval.approverIdHash);
    assert(identity, 'DOKE_PAY_A14_APPROVER_IDENTITY_MISSING', 'Verified identity is missing for an approver.');
    assert(identity.verifiedIdentityVersion === VERIFIED_IDENTITY_VERSION && identity.verifiedOffline === true, 'DOKE_PAY_A14_VERIFIED_IDENTITY_REQUIRED', 'Verified offline identity is required.');
    assert(identity.role === approval.role, 'DOKE_PAY_A14_IDENTITY_ROLE_MISMATCH', 'Verified identity role does not match the approval.');
    if (approval.role === 'security') {
      assert(identity.assuranceLevel === 'aal3', 'DOKE_PAY_A14_SECURITY_AAL3_REQUIRED', 'Security approval requires AAL3 identity assurance.');
    }
    return Object.freeze({
      approvalFingerprint: approval.approvalFingerprint,
      approverIdHash: approval.approverIdHash,
      role: approval.role,
      approvalEvidenceHash: approval.evidenceHash,
      identityAttestationFingerprint: identity.attestationFingerprint,
      identityIssuerIdHash: identity.issuerIdHash,
      identityAssuranceLevel: identity.assuranceLevel
    });
  }).sort((left, right) => left.approverIdHash.localeCompare(right.approverIdHash));
  const issuerHashes = new Set(entries.map((entry) => entry.identityIssuerIdHash));
  assert(issuerHashes.size >= 2, 'DOKE_PAY_A14_IDENTITY_ISSUER_DIVERSITY_REQUIRED', 'At least two independent identity issuers are required.');
  const issuedAt = options.issuedAt || new Date().toISOString();
  parseTime(issuedAt, 'DOKE_PAY_A14_EVIDENCE_TIME_INVALID', 'Evidence bundle issuedAt');
  const previousDecisionReceiptHash = options.previousDecisionReceiptHash == null ? null : options.previousDecisionReceiptHash;
  if (previousDecisionReceiptHash != null) assertHash(previousDecisionReceiptHash, 'DOKE_PAY_A14_PREVIOUS_RECEIPT_HASH_INVALID', 'Previous decision receipt hash');
  const body = {
    bundleVersion: EVIDENCE_BUNDLE_VERSION,
    contractVersion: CONTRACT_VERSION,
    a13ContractVersion: A13_CONTRACT_VERSION,
    a13DecisionVersion: A13_DECISION_VERSION,
    requestFingerprint: decision.requestFingerprint,
    decisionFingerprint: sha256(canonicalJson(decision)),
    action: decision.action,
    executorIdHash: decision.executorIdHash,
    exactGitHead: decision.exactGitHead,
    approvalCount: entries.length,
    approvalRoles: entries.map((entry) => entry.role).sort(),
    evidenceEntries: entries,
    previousDecisionReceiptHash,
    issuedAt,
    production: false,
    containsDirectIdentifiers: false,
    containsPrivateKeyMaterial: false
  };
  return Object.freeze({
    ...body,
    bundleFingerprint: sha256(canonicalJson(body))
  });
}

function validateGovernanceEvidenceBundle(bundle) {
  assertExactKeys(bundle, [
    'bundleVersion', 'contractVersion', 'a13ContractVersion',
    'a13DecisionVersion', 'requestFingerprint', 'decisionFingerprint',
    'action', 'executorIdHash', 'exactGitHead', 'approvalCount',
    'approvalRoles', 'evidenceEntries', 'previousDecisionReceiptHash',
    'issuedAt', 'production', 'containsDirectIdentifiers',
    'containsPrivateKeyMaterial', 'bundleFingerprint'
  ], 'DOKE_PAY_A14_EVIDENCE_BUNDLE_INVALID', 'Governance evidence bundle');
  assert(bundle.bundleVersion === EVIDENCE_BUNDLE_VERSION, 'DOKE_PAY_A14_EVIDENCE_BUNDLE_VERSION_INVALID', 'Governance evidence-bundle version is invalid.');
  assert(bundle.contractVersion === CONTRACT_VERSION, 'DOKE_PAY_A14_CONTRACT_VERSION_MISMATCH', 'PAY-A14 contract version mismatch.');
  assert(bundle.a13ContractVersion === A13_CONTRACT_VERSION && bundle.a13DecisionVersion === A13_DECISION_VERSION, 'DOKE_PAY_A14_A13_BINDING_MISMATCH', 'PAY-A13 binding mismatch.');
  assertHash(bundle.requestFingerprint, 'DOKE_PAY_A14_REQUEST_FINGERPRINT_INVALID', 'Lifecycle request fingerprint');
  assertHash(bundle.decisionFingerprint, 'DOKE_PAY_A14_DECISION_FINGERPRINT_INVALID', 'Lifecycle decision fingerprint');
  assert(governance.ALLOWED_ACTIONS.includes(bundle.action), 'DOKE_PAY_A14_ACTION_INVALID', 'Lifecycle action is invalid.');
  assertHash(bundle.executorIdHash, 'DOKE_PAY_A14_EXECUTOR_HASH_INVALID', 'Executor id hash');
  assertHead(bundle.exactGitHead, 'DOKE_PAY_A14_EXACT_HEAD_INVALID', 'Evidence git head');
  assert(Number.isInteger(bundle.approvalCount) && bundle.approvalCount >= 2, 'DOKE_PAY_A14_APPROVAL_COUNT_INVALID', 'Approval count is invalid.');
  assert(Array.isArray(bundle.approvalRoles) && bundle.approvalRoles.length === bundle.approvalCount, 'DOKE_PAY_A14_APPROVAL_ROLE_COUNT_MISMATCH', 'Approval-role count mismatch.');
  assert(Array.isArray(bundle.evidenceEntries) && bundle.evidenceEntries.length === bundle.approvalCount, 'DOKE_PAY_A14_EVIDENCE_ENTRY_COUNT_MISMATCH', 'Evidence-entry count mismatch.');
  const subjects = new Set();
  const approvalFingerprints = new Set();
  const identityFingerprints = new Set();
  bundle.evidenceEntries.forEach((entry) => {
    assertExactKeys(entry, [
      'approvalFingerprint', 'approverIdHash', 'role',
      'approvalEvidenceHash', 'identityAttestationFingerprint',
      'identityIssuerIdHash', 'identityAssuranceLevel'
    ], 'DOKE_PAY_A14_EVIDENCE_ENTRY_INVALID', 'Governance evidence entry');
    ['approvalFingerprint', 'approverIdHash', 'approvalEvidenceHash',
      'identityAttestationFingerprint', 'identityIssuerIdHash'].forEach((key) => {
      assertHash(entry[key], 'DOKE_PAY_A14_EVIDENCE_ENTRY_HASH_INVALID', key);
    });
    assert(governance.APPROVER_ROLES.includes(entry.role), 'DOKE_PAY_A14_ROLE_INVALID', 'Evidence role is invalid.');
    assert(ALLOWED_ASSURANCE_LEVELS.includes(entry.identityAssuranceLevel), 'DOKE_PAY_A14_ASSURANCE_INVALID', 'Evidence assurance level is invalid.');
    assert(!subjects.has(entry.approverIdHash), 'DOKE_PAY_A14_DUPLICATE_IDENTITY_SUBJECT_DENIED', 'Duplicate identity subjects are denied.');
    assert(!approvalFingerprints.has(entry.approvalFingerprint), 'DOKE_PAY_A14_DUPLICATE_APPROVAL_EVIDENCE_DENIED', 'Duplicate approval evidence is denied.');
    assert(!identityFingerprints.has(entry.identityAttestationFingerprint), 'DOKE_PAY_A14_DUPLICATE_IDENTITY_EVIDENCE_DENIED', 'Duplicate identity evidence is denied.');
    subjects.add(entry.approverIdHash);
    approvalFingerprints.add(entry.approvalFingerprint);
    identityFingerprints.add(entry.identityAttestationFingerprint);
    if (entry.role === 'security') assert(entry.identityAssuranceLevel === 'aal3', 'DOKE_PAY_A14_SECURITY_AAL3_REQUIRED', 'Security approval requires AAL3 identity assurance.');
  });
  assert(new Set(bundle.evidenceEntries.map((entry) => entry.identityIssuerIdHash)).size >= 2, 'DOKE_PAY_A14_IDENTITY_ISSUER_DIVERSITY_REQUIRED', 'At least two independent identity issuers are required.');
  if (bundle.previousDecisionReceiptHash != null) assertHash(bundle.previousDecisionReceiptHash, 'DOKE_PAY_A14_PREVIOUS_RECEIPT_HASH_INVALID', 'Previous decision receipt hash');
  parseTime(bundle.issuedAt, 'DOKE_PAY_A14_EVIDENCE_TIME_INVALID', 'Evidence bundle issuedAt');
  assert(bundle.production === false, 'DOKE_PAY_A14_PRODUCTION_EVIDENCE_DENIED', 'Production evidence bundles are denied.');
  assert(bundle.containsDirectIdentifiers === false, 'DOKE_PAY_A14_DIRECT_IDENTIFIER_DENIED', 'Direct identity attributes are denied.');
  assert(bundle.containsPrivateKeyMaterial === false, 'DOKE_PAY_A14_PRIVATE_KEY_MATERIAL_DENIED', 'Private-key material is denied.');
  assertHash(bundle.bundleFingerprint, 'DOKE_PAY_A14_EVIDENCE_BUNDLE_FINGERPRINT_INVALID', 'Governance evidence-bundle fingerprint');
  assert(bundle.bundleFingerprint === computeEvidenceBundleFingerprint(bundle), 'DOKE_PAY_A14_EVIDENCE_BUNDLE_FINGERPRINT_MISMATCH', 'Governance evidence-bundle fingerprint mismatch.');
  return bundle;
}

function verifyGovernanceEvidenceBundleSignature(bundle, envelope, trustBundle, options = {}) {
  validateGovernanceEvidenceBundle(bundle);
  assert(envelope.purpose === 'governance_evidence', 'DOKE_PAY_A14_GOVERNANCE_SIGNATURE_PURPOSE_REQUIRED', 'Governance evidence-signing purpose is required.');
  assert(envelope.signedAt === bundle.issuedAt, 'DOKE_PAY_A14_EVIDENCE_SIGNED_AT_MISMATCH', 'Evidence signature time must equal bundle issuedAt.');
  const signature = verifySignedValue(bundle, envelope, trustBundle, {
    purpose: 'governance_evidence'
  }, options);
  return Object.freeze({
    verifiedEvidenceVersion: VERIFIED_EVIDENCE_VERSION,
    evidenceBundleFingerprint: bundle.bundleFingerprint,
    requestFingerprint: bundle.requestFingerprint,
    decisionFingerprint: bundle.decisionFingerprint,
    executorIdHash: bundle.executorIdHash,
    action: bundle.action,
    exactGitHead: bundle.exactGitHead,
    evidenceSignatureEnvelopeFingerprint: signature.envelopeFingerprint,
    trustBundleFingerprint: signature.trustBundleFingerprint,
    signedPayloadHash: signature.signedPayloadHash,
    verifiedOffline: true,
    immutableEvidenceBundle: true,
    rawSignatureStored: false,
    directIdentifiersStored: false,
    privateKeyMaterialPresent: false,
    networkRequests: 0,
    databaseConnections: 0,
    remoteIdentityProviderContacted: false,
    remoteGovernanceSystemContacted: false,
    productionAllowed: false,
    nextPhaseAutomaticallyAuthorized: false
  });
}

function createLifecycleDecisionReceipt(bundle, verifiedEvidence, options = {}) {
  validateGovernanceEvidenceBundle(bundle);
  assert(verifiedEvidence && verifiedEvidence.verifiedEvidenceVersion === VERIFIED_EVIDENCE_VERSION, 'DOKE_PAY_A14_VERIFIED_EVIDENCE_REQUIRED', 'Verified governance evidence is required.');
  assert(verifiedEvidence.evidenceBundleFingerprint === bundle.bundleFingerprint, 'DOKE_PAY_A14_VERIFIED_EVIDENCE_MISMATCH', 'Verified evidence does not match the bundle.');
  const sequence = options.sequence;
  assert(Number.isInteger(sequence) && sequence >= 1, 'DOKE_PAY_A14_RECEIPT_SEQUENCE_INVALID', 'Decision-receipt sequence is invalid.');
  const previousReceipt = options.previousReceipt || null;
  if (sequence === 1) {
    assert(previousReceipt == null && bundle.previousDecisionReceiptHash == null, 'DOKE_PAY_A14_GENESIS_PREDECESSOR_DENIED', 'Genesis receipt may not reference a predecessor.');
  } else {
    assert(previousReceipt && typeof previousReceipt === 'object', 'DOKE_PAY_A14_PREVIOUS_RECEIPT_REQUIRED', 'Previous decision receipt is required.');
    assert(previousReceipt.sequence === sequence - 1, 'DOKE_PAY_A14_RECEIPT_SEQUENCE_GAP', 'Decision-receipt sequence must be contiguous.');
    assert(previousReceipt.executorIdHash === bundle.executorIdHash, 'DOKE_PAY_A14_RECEIPT_EXECUTOR_MISMATCH', 'Decision-receipt chain may not cross executors.');
    assert(bundle.previousDecisionReceiptHash === previousReceipt.receiptHash, 'DOKE_PAY_A14_PREVIOUS_RECEIPT_HASH_MISMATCH', 'Evidence bundle predecessor does not match the previous receipt.');
    assert(previousReceipt.receiptHash === computeDecisionReceiptHash(previousReceipt), 'DOKE_PAY_A14_PREVIOUS_RECEIPT_INTEGRITY_FAILED', 'Previous decision receipt integrity failed.');
  }
  const acceptedAt = options.acceptedAt || bundle.issuedAt;
  const issuedAtMs = parseTime(bundle.issuedAt, 'DOKE_PAY_A14_EVIDENCE_TIME_INVALID', 'Evidence bundle issuedAt');
  const acceptedAtMs = parseTime(acceptedAt, 'DOKE_PAY_A14_RECEIPT_TIME_INVALID', 'Decision receipt acceptedAt');
  assert(acceptedAtMs >= issuedAtMs && acceptedAtMs - issuedAtMs <= 24 * 60 * 60 * 1000, 'DOKE_PAY_A14_RECEIPT_ACCEPTANCE_WINDOW_INVALID', 'Decision receipt must be accepted within 24 hours.');
  const body = {
    receiptVersion: DECISION_RECEIPT_VERSION,
    chainVersion: DECISION_CHAIN_VERSION,
    sequence,
    previousReceiptHash: previousReceipt ? previousReceipt.receiptHash : null,
    evidenceBundleFingerprint: bundle.bundleFingerprint,
    evidenceEnvelopeFingerprint: verifiedEvidence.evidenceSignatureEnvelopeFingerprint,
    requestFingerprint: bundle.requestFingerprint,
    decisionFingerprint: bundle.decisionFingerprint,
    action: bundle.action,
    executorIdHash: bundle.executorIdHash,
    exactGitHead: bundle.exactGitHead,
    acceptedAt,
    production: false
  };
  const receipt = Object.freeze({ ...body, receiptHash: sha256(canonicalJson(body)) });
  const receiptLedger = options.receiptLedger || new Set();
  assert(!receiptLedger.has(receipt.receiptHash), 'DOKE_PAY_A14_DECISION_RECEIPT_REPLAYED', 'Decision-receipt replay is denied.');
  const chainHeads = options.chainHeadByExecutor || new Map();
  const currentHead = chainHeads.get(receipt.executorIdHash);
  if (sequence === 1) assert(currentHead == null, 'DOKE_PAY_A14_CHAIN_ALREADY_INITIALIZED', 'Decision chain is already initialized.');
  else assert(currentHead === previousReceipt.receiptHash, 'DOKE_PAY_A14_CHAIN_FORK_DENIED', 'Decision-receipt fork is denied.');
  receiptLedger.add(receipt.receiptHash);
  chainHeads.set(receipt.executorIdHash, receipt.receiptHash);
  return Object.freeze({
    ...receipt,
    immutableDecisionReceipt: true,
    rawIdentityDataStored: false,
    rawSignatureStored: false,
    privateKeyMaterialPresent: false,
    networkRequests: 0,
    databaseConnections: 0,
    stagingAuthorized: false,
    productionAllowed: false,
    remoteExecutionAuthorized: false,
    nextPhaseAutomaticallyAuthorized: false,
    directMoneyMutationAllowed: false,
    providerOperationAllowed: false
  });
}

function validateLifecycleDecisionChain(receipts) {
  assert(Array.isArray(receipts) && receipts.length > 0, 'DOKE_PAY_A14_DECISION_CHAIN_REQUIRED', 'Decision-receipt chain is required.');
  const seen = new Set();
  const executorIdHash = receipts[0].executorIdHash;
  receipts.forEach((receipt, index) => {
    assertExactKeys(receipt, [
      'receiptVersion', 'chainVersion', 'sequence', 'previousReceiptHash',
      'evidenceBundleFingerprint', 'evidenceEnvelopeFingerprint',
      'requestFingerprint', 'decisionFingerprint', 'action', 'executorIdHash',
      'exactGitHead', 'acceptedAt', 'production', 'receiptHash',
      'immutableDecisionReceipt', 'rawIdentityDataStored', 'rawSignatureStored',
      'privateKeyMaterialPresent', 'networkRequests', 'databaseConnections',
      'stagingAuthorized', 'productionAllowed', 'remoteExecutionAuthorized',
      'nextPhaseAutomaticallyAuthorized', 'directMoneyMutationAllowed',
      'providerOperationAllowed'
    ], 'DOKE_PAY_A14_DECISION_RECEIPT_INVALID', 'Lifecycle decision receipt');
    assert(receipt.receiptVersion === DECISION_RECEIPT_VERSION && receipt.chainVersion === DECISION_CHAIN_VERSION, 'DOKE_PAY_A14_DECISION_RECEIPT_VERSION_INVALID', 'Decision-receipt version mismatch.');
    assert(receipt.sequence === index + 1, 'DOKE_PAY_A14_RECEIPT_SEQUENCE_GAP', 'Decision-receipt sequence must be contiguous.');
    assert(receipt.executorIdHash === executorIdHash, 'DOKE_PAY_A14_RECEIPT_EXECUTOR_MISMATCH', 'Decision chain may not cross executors.');
    if (index === 0) assert(receipt.previousReceiptHash == null, 'DOKE_PAY_A14_GENESIS_PREDECESSOR_DENIED', 'Genesis receipt may not reference a predecessor.');
    else assert(receipt.previousReceiptHash === receipts[index - 1].receiptHash, 'DOKE_PAY_A14_PREVIOUS_RECEIPT_HASH_MISMATCH', 'Decision-receipt predecessor mismatch.');
    assert(receipt.receiptHash === computeDecisionReceiptHash(receipt), 'DOKE_PAY_A14_DECISION_RECEIPT_INTEGRITY_FAILED', 'Decision-receipt integrity failed.');
    assert(!seen.has(receipt.receiptHash), 'DOKE_PAY_A14_DECISION_RECEIPT_REPLAYED', 'Decision-receipt replay is denied.');
    seen.add(receipt.receiptHash);
    assert(receipt.production === false && receipt.productionAllowed === false, 'DOKE_PAY_A14_PRODUCTION_RECEIPT_DENIED', 'Production decision receipts are denied.');
    assert(receipt.immutableDecisionReceipt === true, 'DOKE_PAY_A14_RECEIPT_IMMUTABILITY_REQUIRED', 'Decision receipt must be immutable.');
    [
      'rawIdentityDataStored', 'rawSignatureStored', 'privateKeyMaterialPresent',
      'stagingAuthorized', 'remoteExecutionAuthorized',
      'nextPhaseAutomaticallyAuthorized', 'directMoneyMutationAllowed',
      'providerOperationAllowed'
    ].forEach((key) => assert(receipt[key] === false, 'DOKE_PAY_A14_AUTHORITY_ESCALATION', 'Decision-receipt authority must remain false: ' + key));
    assert(receipt.networkRequests === 0 && receipt.databaseConnections === 0, 'DOKE_PAY_A14_EFFECT_NONZERO', 'Decision-receipt effects must remain zero.');
  });
  return Object.freeze({
    chainVersion: DECISION_CHAIN_VERSION,
    executorIdHash,
    receiptCount: receipts.length,
    genesisReceiptHash: receipts[0].receiptHash,
    headReceiptHash: receipts[receipts.length - 1].receiptHash,
    contiguous: true,
    immutable: true,
    forkFree: true,
    replayFree: true,
    verifiedOffline: true,
    networkRequests: 0,
    databaseConnections: 0,
    productionAllowed: false,
    remoteExecutionAuthorized: false
  });
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  IDENTITY_TRUST_BUNDLE_VERSION,
  IDENTITY_ATTESTATION_VERSION,
  EVIDENCE_BUNDLE_VERSION,
  SIGNATURE_ENVELOPE_VERSION,
  VERIFIED_IDENTITY_VERSION,
  VERIFIED_EVIDENCE_VERSION,
  DECISION_RECEIPT_VERSION,
  DECISION_CHAIN_VERSION,
  SIGNING_DOMAIN,
  A13_CONTRACT_VERSION,
  A13_DECISION_VERSION,
  ALLOWED_PURPOSES,
  ALLOWED_ASSURANCE_LEVELS,
  publicKeyFingerprint,
  computeIdentityTrustBundleFingerprint,
  computeSignatureEnvelopeFingerprint,
  computeIdentityAttestationFingerprint,
  computeEvidenceBundleFingerprint,
  computeDecisionReceiptHash,
  validateIdentityTrustBundle,
  verifyExternalIdentityAttestation,
  buildGovernanceEvidenceBundle,
  validateGovernanceEvidenceBundle,
  verifyGovernanceEvidenceBundleSignature,
  createLifecycleDecisionReceipt,
  validateLifecycleDecisionChain
});
