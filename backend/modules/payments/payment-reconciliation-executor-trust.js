'use strict';

const crypto = require('node:crypto');
const {
  ADAPTER_PROFILES,
  ALLOWED_SIGNATURE_SCHEMES,
  canonicalJson,
  sha256,
  validateExecutorReceipt
} = require('./payment-reconciliation-executor-adapter');

const CONTRACT_VERSION = 'pay-a12-executor-trust-root-signature-v1';
const TRUST_BUNDLE_VERSION = 'pay-reconciliation-executor-trust-bundle-v1';
const DETACHED_ENVELOPE_VERSION = 'pay-reconciliation-detached-signature-v1';
const VERIFIED_RECEIPT_VERSION = 'pay-reconciliation-verified-receipt-v1';
const SIGNING_DOMAIN = 'doke-pay-executor-receipt-v1';
const ALLOWED_ROOT_STATUSES = Object.freeze(['active', 'retiring', 'revoked']);
const PRIVATE_JWK_FIELDS = Object.freeze(['d', 'p', 'q', 'dp', 'dq', 'qi', 'oth', 'k']);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function assert(condition, code, message) {
  if (!condition) fail(code, message);
}

function assertHash(value, code, label) {
  assert(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), code, label + ' must be a SHA-256 digest.');
}

function parseTime(value, code, label) {
  const parsed = Date.parse(value);
  assert(Number.isFinite(parsed), code, label + ' must be a valid timestamp.');
  return parsed;
}

function strictBase64(value) {
  assert(typeof value === 'string' && value.length > 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value), 'DOKE_PAY_A12_SIGNATURE_BASE64_INVALID', 'Detached signature must be canonical base64.');
  const buffer = Buffer.from(value, 'base64');
  const normalizedInput = value.replace(/=+$/u, '');
  const normalizedOutput = buffer.toString('base64').replace(/=+$/u, '');
  assert(normalizedInput === normalizedOutput, 'DOKE_PAY_A12_SIGNATURE_BASE64_INVALID', 'Detached signature base64 is not canonical.');
  return buffer;
}

function publicKeyFingerprint(publicKeyJwk) {
  return sha256(canonicalJson(publicKeyJwk));
}

function assertPublicJwk(publicKeyJwk) {
  assert(publicKeyJwk && typeof publicKeyJwk === 'object' && !Array.isArray(publicKeyJwk), 'DOKE_PAY_A12_PUBLIC_JWK_REQUIRED', 'Public JWK is required.');
  PRIVATE_JWK_FIELDS.forEach((field) => {
    assert(!Object.prototype.hasOwnProperty.call(publicKeyJwk, field), 'DOKE_PAY_A12_PRIVATE_KEY_MATERIAL_DENIED', 'Private key material is denied.');
  });
  assert(typeof publicKeyJwk.kty === 'string', 'DOKE_PAY_A12_PUBLIC_JWK_INVALID', 'Public JWK kty is required.');
}

function trustBundleBody(bundle) {
  const body = { ...bundle };
  delete body.bundleFingerprint;
  return body;
}

function computeTrustBundleFingerprint(bundle) {
  return sha256(canonicalJson(trustBundleBody(bundle)));
}

function detachedEnvelopeBody(envelope) {
  const body = { ...envelope };
  delete body.envelopeFingerprint;
  return body;
}

function computeDetachedEnvelopeFingerprint(envelope) {
  return sha256(canonicalJson(detachedEnvelopeBody(envelope)));
}

function receiptSigningBody(receipt) {
  const required = [
    'receiptVersion', 'operation', 'status', 'exactGitHead', 'manifestHash',
    'resourcePlanHash', 'planFingerprint', 'dispatchFingerprint', 'executorIdHash',
    'executionIdHash', 'signatureScheme', 'issuedAt', 'sequence', 'outcomeCode'
  ];
  required.forEach((key) => assert(Object.prototype.hasOwnProperty.call(receipt, key), 'DOKE_PAY_A12_RECEIPT_FIELD_REQUIRED', 'Receipt signing field is required: ' + key));
  return {
    signingDomain: SIGNING_DOMAIN,
    receiptVersion: receipt.receiptVersion,
    operation: receipt.operation,
    status: receipt.status,
    exactGitHead: receipt.exactGitHead,
    manifestHash: receipt.manifestHash,
    resourcePlanHash: receipt.resourcePlanHash,
    planFingerprint: receipt.planFingerprint,
    dispatchFingerprint: receipt.dispatchFingerprint,
    executorIdHash: receipt.executorIdHash,
    executionIdHash: receipt.executionIdHash,
    signatureScheme: receipt.signatureScheme,
    issuedAt: receipt.issuedAt,
    sequence: receipt.sequence,
    outcomeCode: receipt.outcomeCode
  };
}

function buildReceiptSigningPayload(receipt) {
  return Buffer.from(canonicalJson(receiptSigningBody(receipt)), 'utf8');
}

function validateRootShape(root) {
  const allowed = [
    'keyId', 'keyFamily', 'keyVersion', 'algorithm', 'publicKeyJwk',
    'publicKeyFingerprint', 'status', 'notBefore', 'notAfter', 'retireAt',
    'acceptUntil', 'revokedAt', 'supersedesKeyId', 'allowedOperations',
    'allowedExecutorIdHashes', 'production'
  ];
  Object.keys(root).forEach((key) => assert(allowed.includes(key), 'DOKE_PAY_A12_ROOT_FIELD_DENIED', 'Trust-root field is not allowlisted: ' + key));
  assert(typeof root.keyId === 'string' && /^[a-z0-9][a-z0-9._-]{7,95}$/.test(root.keyId), 'DOKE_PAY_A12_KEY_ID_INVALID', 'Trust-root key id is invalid.');
  assert(typeof root.keyFamily === 'string' && /^[a-z0-9][a-z0-9._-]{3,63}$/.test(root.keyFamily), 'DOKE_PAY_A12_KEY_FAMILY_INVALID', 'Trust-root family is invalid.');
  assert(Number.isInteger(root.keyVersion) && root.keyVersion >= 1, 'DOKE_PAY_A12_KEY_VERSION_INVALID', 'Trust-root key version is invalid.');
  assert(ALLOWED_SIGNATURE_SCHEMES.includes(root.algorithm), 'DOKE_PAY_A12_ROOT_ALGORITHM_INVALID', 'Trust-root algorithm is invalid.');
  assert(ALLOWED_ROOT_STATUSES.includes(root.status), 'DOKE_PAY_A12_ROOT_STATUS_INVALID', 'Trust-root status is invalid.');
  assert(root.production === false, 'DOKE_PAY_A12_PRODUCTION_ROOT_DENIED', 'Production trust roots are denied by this repository contract.');
  assertPublicJwk(root.publicKeyJwk);
  assertHash(root.publicKeyFingerprint, 'DOKE_PAY_A12_PUBLIC_KEY_FINGERPRINT_INVALID', 'Public key fingerprint');
  assert(root.publicKeyFingerprint === publicKeyFingerprint(root.publicKeyJwk), 'DOKE_PAY_A12_PUBLIC_KEY_FINGERPRINT_MISMATCH', 'Public key fingerprint mismatch.');
  const notBefore = parseTime(root.notBefore, 'DOKE_PAY_A12_ROOT_TIME_INVALID', 'notBefore');
  const notAfter = parseTime(root.notAfter, 'DOKE_PAY_A12_ROOT_TIME_INVALID', 'notAfter');
  assert(notAfter > notBefore, 'DOKE_PAY_A12_ROOT_WINDOW_INVALID', 'Trust-root validity window is invalid.');
  assert(Array.isArray(root.allowedOperations) && root.allowedOperations.length > 0, 'DOKE_PAY_A12_OPERATION_ALLOWLIST_REQUIRED', 'Trust-root operation allowlist is required.');
  root.allowedOperations.forEach((operation) => assert(Boolean(ADAPTER_PROFILES[operation]), 'DOKE_PAY_A12_OPERATION_INVALID', 'Trust-root operation is invalid.'));
  assert(new Set(root.allowedOperations).size === root.allowedOperations.length, 'DOKE_PAY_A12_OPERATION_DUPLICATE', 'Duplicate operation is denied.');
  assert(Array.isArray(root.allowedExecutorIdHashes) && root.allowedExecutorIdHashes.length > 0, 'DOKE_PAY_A12_EXECUTOR_ALLOWLIST_REQUIRED', 'Trust-root executor allowlist is required.');
  root.allowedExecutorIdHashes.forEach((value) => assertHash(value, 'DOKE_PAY_A12_EXECUTOR_HASH_INVALID', 'Executor id hash'));
  assert(new Set(root.allowedExecutorIdHashes).size === root.allowedExecutorIdHashes.length, 'DOKE_PAY_A12_EXECUTOR_DUPLICATE', 'Duplicate executor hash is denied.');
  if (root.status === 'retiring') {
    const retireAt = parseTime(root.retireAt, 'DOKE_PAY_A12_ROTATION_TIME_INVALID', 'retireAt');
    const acceptUntil = parseTime(root.acceptUntil, 'DOKE_PAY_A12_ROTATION_TIME_INVALID', 'acceptUntil');
    assert(retireAt >= notBefore && acceptUntil >= retireAt && acceptUntil <= notAfter, 'DOKE_PAY_A12_ROTATION_WINDOW_INVALID', 'Retiring trust-root window is invalid.');
  }
  if (root.status === 'revoked') parseTime(root.revokedAt, 'DOKE_PAY_A12_REVOCATION_TIME_INVALID', 'revokedAt');
  return root;
}

function validateTrustBundle(bundle) {
  assert(bundle && typeof bundle === 'object' && !Array.isArray(bundle), 'DOKE_PAY_A12_TRUST_BUNDLE_REQUIRED', 'Trust bundle is required.');
  const allowed = [
    'bundleVersion', 'bundleId', 'issuedAt', 'production', 'repositoryManagedPrivateKeys',
    'roots', 'bundleFingerprint'
  ];
  Object.keys(bundle).forEach((key) => assert(allowed.includes(key), 'DOKE_PAY_A12_BUNDLE_FIELD_DENIED', 'Trust-bundle field is not allowlisted: ' + key));
  assert(bundle.bundleVersion === TRUST_BUNDLE_VERSION, 'DOKE_PAY_A12_TRUST_BUNDLE_VERSION_INVALID', 'Trust-bundle version is invalid.');
  assert(typeof bundle.bundleId === 'string' && /^[a-z0-9][a-z0-9._-]{7,95}$/.test(bundle.bundleId), 'DOKE_PAY_A12_TRUST_BUNDLE_ID_INVALID', 'Trust-bundle id is invalid.');
  parseTime(bundle.issuedAt, 'DOKE_PAY_A12_TRUST_BUNDLE_TIME_INVALID', 'Trust-bundle issuedAt');
  assert(bundle.production === false, 'DOKE_PAY_A12_PRODUCTION_BUNDLE_DENIED', 'Production trust bundle is denied.');
  assert(bundle.repositoryManagedPrivateKeys === false, 'DOKE_PAY_A12_PRIVATE_KEY_CUSTODY_DENIED', 'Private-key custody is denied.');
  assert(Array.isArray(bundle.roots) && bundle.roots.length > 0 && bundle.roots.length <= 20, 'DOKE_PAY_A12_TRUST_ROOTS_REQUIRED', 'One to twenty trust roots are required.');
  assertHash(bundle.bundleFingerprint, 'DOKE_PAY_A12_TRUST_BUNDLE_FINGERPRINT_INVALID', 'Trust-bundle fingerprint');
  assert(bundle.bundleFingerprint === computeTrustBundleFingerprint(bundle), 'DOKE_PAY_A12_TRUST_BUNDLE_FINGERPRINT_MISMATCH', 'Trust-bundle fingerprint mismatch.');
  bundle.roots.forEach(validateRootShape);
  const identities = new Set();
  const byId = new Map();
  bundle.roots.forEach((root) => {
    const identity = root.keyFamily + ':' + root.keyVersion;
    assert(!identities.has(identity), 'DOKE_PAY_A12_DUPLICATE_KEY_VERSION', 'Duplicate key-family version is denied.');
    identities.add(identity);
    assert(!byId.has(root.keyId), 'DOKE_PAY_A12_DUPLICATE_KEY_ID', 'Duplicate key id is denied.');
    byId.set(root.keyId, root);
  });
  bundle.roots.forEach((root) => {
    if (!root.supersedesKeyId) return;
    const previous = byId.get(root.supersedesKeyId);
    assert(previous, 'DOKE_PAY_A12_ROTATION_PREDECESSOR_UNKNOWN', 'Rotation predecessor is unknown.');
    assert(previous.keyFamily === root.keyFamily, 'DOKE_PAY_A12_ROTATION_FAMILY_MISMATCH', 'Rotation family mismatch.');
    assert(previous.algorithm === root.algorithm, 'DOKE_PAY_A12_ROTATION_ALGORITHM_MISMATCH', 'Rotation algorithm mismatch.');
    assert(root.keyVersion > previous.keyVersion, 'DOKE_PAY_A12_ROTATION_VERSION_INVALID', 'Rotation version must increase.');
    assert(previous.status === 'retiring' || previous.status === 'revoked', 'DOKE_PAY_A12_ROTATION_PREDECESSOR_STATUS_INVALID', 'Rotation predecessor must be retiring or revoked.');
  });
  return Object.freeze({ ...bundle, roots: Object.freeze(bundle.roots.map((root) => Object.freeze({ ...root }))) });
}

function validateDetachedEnvelope(envelope) {
  assert(envelope && typeof envelope === 'object' && !Array.isArray(envelope), 'DOKE_PAY_A12_SIGNATURE_ENVELOPE_REQUIRED', 'Detached-signature envelope is required.');
  const allowed = [
    'envelopeVersion', 'keyId', 'keyVersion', 'signatureScheme', 'signedPayloadHash',
    'signatureBase64', 'signatureHash', 'signedAt', 'bundleFingerprint', 'envelopeFingerprint'
  ];
  Object.keys(envelope).forEach((key) => assert(allowed.includes(key), 'DOKE_PAY_A12_SIGNATURE_FIELD_DENIED', 'Detached-signature field is not allowlisted: ' + key));
  assert(envelope.envelopeVersion === DETACHED_ENVELOPE_VERSION, 'DOKE_PAY_A12_SIGNATURE_ENVELOPE_VERSION_INVALID', 'Detached-signature envelope version is invalid.');
  assert(typeof envelope.keyId === 'string', 'DOKE_PAY_A12_SIGNATURE_KEY_ID_INVALID', 'Detached-signature key id is invalid.');
  assert(Number.isInteger(envelope.keyVersion) && envelope.keyVersion >= 1, 'DOKE_PAY_A12_SIGNATURE_KEY_VERSION_INVALID', 'Detached-signature key version is invalid.');
  assert(ALLOWED_SIGNATURE_SCHEMES.includes(envelope.signatureScheme), 'DOKE_PAY_A12_SIGNATURE_SCHEME_INVALID', 'Detached-signature scheme is invalid.');
  ['signedPayloadHash', 'signatureHash', 'bundleFingerprint', 'envelopeFingerprint'].forEach((key) => assertHash(envelope[key], 'DOKE_PAY_A12_SIGNATURE_HASH_INVALID', key));
  parseTime(envelope.signedAt, 'DOKE_PAY_A12_SIGNATURE_TIME_INVALID', 'signedAt');
  const signature = strictBase64(envelope.signatureBase64);
  assert(envelope.envelopeFingerprint === computeDetachedEnvelopeFingerprint(envelope), 'DOKE_PAY_A12_SIGNATURE_ENVELOPE_FINGERPRINT_MISMATCH', 'Detached-signature envelope fingerprint mismatch.');
  return signature;
}

function assertRootUsable(root, receipt, envelope, nowMs) {
  const signedAt = parseTime(envelope.signedAt, 'DOKE_PAY_A12_SIGNATURE_TIME_INVALID', 'signedAt');
  const notBefore = parseTime(root.notBefore, 'DOKE_PAY_A12_ROOT_TIME_INVALID', 'notBefore');
  const notAfter = parseTime(root.notAfter, 'DOKE_PAY_A12_ROOT_TIME_INVALID', 'notAfter');
  assert(signedAt >= notBefore, 'DOKE_PAY_A12_KEY_NOT_YET_VALID', 'Trust root is not yet valid.');
  assert(signedAt <= notAfter && nowMs <= notAfter, 'DOKE_PAY_A12_KEY_EXPIRED', 'Trust root is expired.');
  assert(root.status !== 'revoked', 'DOKE_PAY_A12_KEY_REVOKED', 'Revoked trust root is denied.');
  if (root.status === 'retiring') {
    const retireAt = parseTime(root.retireAt, 'DOKE_PAY_A12_ROTATION_TIME_INVALID', 'retireAt');
    const acceptUntil = parseTime(root.acceptUntil, 'DOKE_PAY_A12_ROTATION_TIME_INVALID', 'acceptUntil');
    assert(signedAt <= retireAt, 'DOKE_PAY_A12_RETIRED_KEY_NEW_SIGNATURE_DENIED', 'Retiring key may not sign after retireAt.');
    assert(nowMs <= acceptUntil, 'DOKE_PAY_A12_RETIRED_KEY_GRACE_EXPIRED', 'Retiring-key acceptance grace expired.');
  }
  assert(root.allowedOperations.includes(receipt.operation), 'DOKE_PAY_A12_OPERATION_NOT_ALLOWED', 'Receipt operation is not allowed for this trust root.');
  assert(root.allowedExecutorIdHashes.includes(receipt.executorIdHash), 'DOKE_PAY_A12_EXECUTOR_NOT_ALLOWED', 'Receipt executor is not allowed for this trust root.');
}

function verifyDetachedReceiptSignature(receipt, envelope, trustBundle, options = {}) {
  assert(receipt && typeof receipt === 'object' && !Array.isArray(receipt), 'DOKE_PAY_A12_RECEIPT_REQUIRED', 'Receipt is required.');
  const bundle = validateTrustBundle(trustBundle);
  const signature = validateDetachedEnvelope(envelope);
  const nowMs = options.now ? parseTime(options.now, 'DOKE_PAY_A12_NOW_INVALID', 'Verification clock') : Date.now();
  assert(envelope.bundleFingerprint === bundle.bundleFingerprint, 'DOKE_PAY_A12_BUNDLE_BINDING_MISMATCH', 'Detached signature is not bound to this trust bundle.');
  const root = bundle.roots.find((candidate) => candidate.keyId === envelope.keyId && candidate.keyVersion === envelope.keyVersion);
  assert(root, 'DOKE_PAY_A12_TRUST_ROOT_NOT_FOUND', 'Detached-signature trust root was not found.');
  assert(envelope.signatureScheme === root.algorithm && receipt.signatureScheme === root.algorithm, 'DOKE_PAY_A12_SIGNATURE_SCHEME_MISMATCH', 'Signature scheme does not match the trust root and receipt.');
  assert(envelope.signedAt === receipt.issuedAt, 'DOKE_PAY_A12_SIGNED_AT_MISMATCH', 'Detached signature time must equal receipt issuedAt.');
  assertRootUsable(root, receipt, envelope, nowMs);
  const payload = buildReceiptSigningPayload(receipt);
  const payloadHash = sha256(payload);
  assert(envelope.signedPayloadHash === payloadHash, 'DOKE_PAY_A12_SIGNED_PAYLOAD_HASH_MISMATCH', 'Signed payload hash mismatch.');
  const signatureHash = sha256(signature);
  assert(envelope.signatureHash === signatureHash && receipt.signatureHash === signatureHash, 'DOKE_PAY_A12_SIGNATURE_HASH_MISMATCH', 'Signature hash mismatch.');
  let publicKey;
  try {
    publicKey = crypto.createPublicKey({ key: root.publicKeyJwk, format: 'jwk' });
  } catch {
    fail('DOKE_PAY_A12_PUBLIC_KEY_IMPORT_FAILED', 'Public key import failed.');
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
  assert(verified, 'DOKE_PAY_A12_SIGNATURE_INVALID', 'Detached signature verification failed.');
  const ledger = options.signatureLedger || new Set();
  assert(!ledger.has(envelope.envelopeFingerprint), 'DOKE_PAY_A12_SIGNATURE_REPLAYED', 'Detached-signature envelope replay is denied.');
  ledger.add(envelope.envelopeFingerprint);
  return Object.freeze({
    verifiedReceiptVersion: VERIFIED_RECEIPT_VERSION,
    receiptFingerprint: receipt.receiptFingerprint,
    operation: receipt.operation,
    executorIdHash: receipt.executorIdHash,
    keyId: root.keyId,
    keyFamily: root.keyFamily,
    keyVersion: root.keyVersion,
    signatureScheme: root.algorithm,
    trustBundleFingerprint: bundle.bundleFingerprint,
    envelopeFingerprint: envelope.envelopeFingerprint,
    signedPayloadHash: envelope.signedPayloadHash,
    verifiedOffline: true,
    detachedSignatureVerified: true,
    trustRootActiveOrGraceAccepted: true,
    rawSignatureStored: false,
    publicKeyStoredInReceipt: false,
    privateKeyMaterialPresent: false,
    networkRequests: 0,
    databaseConnections: 0,
    subprocesses: 0,
    environmentReads: 0,
    nextPhaseAutomaticallyAuthorized: false,
    remoteActionTriggered: false,
    productionAllowed: false,
    directMoneyMutationAllowed: false,
    providerOperationAllowed: false
  });
}

function verifyAndAcceptExecutorReceipt(receipt, envelope, trustBundle, dispatchEnvelope, options = {}) {
  const signatureVerification = verifyDetachedReceiptSignature(receipt, envelope, trustBundle, options);
  const acceptedReceipt = validateExecutorReceipt(receipt, dispatchEnvelope, options.receiptLedger || new Set());
  return Object.freeze({
    contractVersion: CONTRACT_VERSION,
    signatureVerification,
    acceptedReceipt,
    verifiedOffline: true,
    repositoryExecutionPerformed: false,
    remoteExecutionAllowed: false,
    nextPhaseAutomaticallyAuthorized: false
  });
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  TRUST_BUNDLE_VERSION,
  DETACHED_ENVELOPE_VERSION,
  VERIFIED_RECEIPT_VERSION,
  SIGNING_DOMAIN,
  ALLOWED_ROOT_STATUSES,
  publicKeyFingerprint,
  computeTrustBundleFingerprint,
  computeDetachedEnvelopeFingerprint,
  buildReceiptSigningPayload,
  validateTrustBundle,
  verifyDetachedReceiptSignature,
  verifyAndAcceptExecutorReceipt
});
