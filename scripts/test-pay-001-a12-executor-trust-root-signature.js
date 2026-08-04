'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const adapter = require('../backend/modules/payments/payment-reconciliation-executor-adapter');
const trust = require('../backend/modules/payments/payment-reconciliation-executor-trust');

const FIXED_NOW = '2026-08-04T01:00:00.000Z';
const EXECUTOR_HASH = '1'.repeat(64);
const OTHER_EXECUTOR_HASH = '2'.repeat(64);
const HEAD = 'a'.repeat(40);
const HASH = (char) => char.repeat(64);

function generateKey(algorithm) {
  if (algorithm === 'ed25519') return crypto.generateKeyPairSync('ed25519');
  return crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicExponent: 0x10001 });
}

function rootFromKey(keyPair, overrides = {}) {
  const algorithm = overrides.algorithm || 'ed25519';
  const jwk = keyPair.publicKey.export({ format: 'jwk' });
  return {
    keyId: overrides.keyId || 'executor-key-0001',
    keyFamily: overrides.keyFamily || 'executor-main',
    keyVersion: overrides.keyVersion || 1,
    algorithm,
    publicKeyJwk: overrides.publicKeyJwk || jwk,
    publicKeyFingerprint: overrides.publicKeyFingerprint || trust.publicKeyFingerprint(overrides.publicKeyJwk || jwk),
    status: overrides.status || 'active',
    notBefore: overrides.notBefore || '2026-08-03T00:00:00.000Z',
    notAfter: overrides.notAfter || '2026-08-05T00:00:00.000Z',
    ...(overrides.retireAt ? { retireAt: overrides.retireAt } : {}),
    ...(overrides.acceptUntil ? { acceptUntil: overrides.acceptUntil } : {}),
    ...(overrides.revokedAt ? { revokedAt: overrides.revokedAt } : {}),
    ...(overrides.supersedesKeyId ? { supersedesKeyId: overrides.supersedesKeyId } : {}),
    allowedOperations: overrides.allowedOperations || ['read_only_preflight'],
    allowedExecutorIdHashes: overrides.allowedExecutorIdHashes || [EXECUTOR_HASH],
    production: overrides.production ?? false
  };
}

function bundleFromRoots(roots, overrides = {}) {
  const bundle = {
    bundleVersion: overrides.bundleVersion || trust.TRUST_BUNDLE_VERSION,
    bundleId: overrides.bundleId || 'executor-trust-bundle-0001',
    issuedAt: overrides.issuedAt || '2026-08-03T23:00:00.000Z',
    production: overrides.production ?? false,
    repositoryManagedPrivateKeys: overrides.repositoryManagedPrivateKeys ?? false,
    roots
  };
  bundle.bundleFingerprint = trust.computeTrustBundleFingerprint(bundle);
  return bundle;
}

function baseReceipt(overrides = {}) {
  return {
    receiptVersion: 'pay-reconciliation-execution-receipt-v1',
    operation: overrides.operation || 'read_only_preflight',
    status: overrides.status || 'preflight_passed',
    exactGitHead: HEAD,
    manifestHash: HASH('b'),
    resourcePlanHash: HASH('c'),
    planFingerprint: HASH('d'),
    dispatchFingerprint: HASH('e'),
    executorIdHash: overrides.executorIdHash || EXECUTOR_HASH,
    executionIdHash: HASH('f'),
    signatureScheme: overrides.signatureScheme || 'ed25519',
    signatureHash: HASH('0'),
    issuedAt: overrides.issuedAt || '2026-08-04T00:55:00.000Z',
    observedAt: overrides.observedAt || '2026-08-04T00:56:00.000Z',
    sequence: 1,
    outcomeCode: 'ok'
  };
}

function signReceipt(receipt, privateKey, bundle, root, overrides = {}) {
  const payload = trust.buildReceiptSigningPayload(receipt);
  const signature = root.algorithm === 'ed25519'
    ? crypto.sign(null, payload, privateKey)
    : crypto.sign('sha256', payload, {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32
    });
  receipt.signatureHash = adapter.sha256(signature);
  receipt.receiptFingerprint = adapter.computeReceiptFingerprint(receipt);
  const envelope = {
    envelopeVersion: trust.DETACHED_ENVELOPE_VERSION,
    keyId: root.keyId,
    keyVersion: root.keyVersion,
    signatureScheme: root.algorithm,
    signedPayloadHash: adapter.sha256(payload),
    signatureBase64: signature.toString('base64'),
    signatureHash: adapter.sha256(signature),
    signedAt: receipt.issuedAt,
    bundleFingerprint: bundle.bundleFingerprint
  };
  Object.assign(envelope, overrides);
  envelope.envelopeFingerprint = trust.computeDetachedEnvelopeFingerprint(envelope);
  return envelope;
}

function dispatchFor(receipt) {
  return {
    operation: receipt.operation,
    exactGitHead: receipt.exactGitHead,
    manifestHash: receipt.manifestHash,
    resourcePlanHash: receipt.resourcePlanHash,
    planFingerprint: receipt.planFingerprint,
    dispatchFingerprint: receipt.dispatchFingerprint,
    executorIdHash: receipt.executorIdHash
  };
}

function expectCode(code, fn) {
  assert.throws(fn, (error) => error && error.code === code, 'expected error code ' + code);
}

const cases = [];

function addCase(id, expected, run) {
  cases.push({ id, expected, run });
}

addCase('positive_ed25519_active', 'accepted', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys);
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt();
  const envelope = signReceipt(receipt, keys.privateKey, bundle, root);
  const result = trust.verifyAndAcceptExecutorReceipt(receipt, envelope, bundle, dispatchFor(receipt), { now: FIXED_NOW });
  assert.equal(result.signatureVerification.detachedSignatureVerified, true);
});

addCase('positive_rsa_pss_active', 'accepted', () => {
  const keys = generateKey('rsa_pss_sha256');
  const root = rootFromKey(keys, { algorithm: 'rsa_pss_sha256', keyId: 'executor-key-rsa-0001', keyFamily: 'executor-rsa' });
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt({ signatureScheme: 'rsa_pss_sha256' });
  const envelope = signReceipt(receipt, keys.privateKey, bundle, root);
  trust.verifyAndAcceptExecutorReceipt(receipt, envelope, bundle, dispatchFor(receipt), { now: FIXED_NOW });
});

addCase('positive_rotated_successor_active', 'accepted', () => {
  const oldKeys = generateKey('ed25519');
  const newKeys = generateKey('ed25519');
  const oldRoot = rootFromKey(oldKeys, {
    keyId: 'executor-key-0001',
    keyVersion: 1,
    status: 'retiring',
    retireAt: '2026-08-03T23:30:00.000Z',
    acceptUntil: '2026-08-04T02:00:00.000Z'
  });
  const newRoot = rootFromKey(newKeys, {
    keyId: 'executor-key-0002',
    keyVersion: 2,
    supersedesKeyId: oldRoot.keyId
  });
  const bundle = bundleFromRoots([oldRoot, newRoot]);
  const receipt = baseReceipt();
  const envelope = signReceipt(receipt, newKeys.privateKey, bundle, newRoot);
  trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW });
});

addCase('positive_retiring_predecessor_within_grace', 'accepted', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys, {
    status: 'retiring',
    retireAt: '2026-08-04T00:57:00.000Z',
    acceptUntil: '2026-08-04T02:00:00.000Z'
  });
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt();
  const envelope = signReceipt(receipt, keys.privateKey, bundle, root);
  trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW });
});

addCase('negative_missing_bundle', 'DOKE_PAY_A12_TRUST_BUNDLE_REQUIRED', () => {
  expectCode('DOKE_PAY_A12_TRUST_BUNDLE_REQUIRED', () => trust.validateTrustBundle(null));
});

addCase('negative_bundle_version', 'DOKE_PAY_A12_TRUST_BUNDLE_VERSION_INVALID', () => {
  const keys = generateKey('ed25519');
  const bundle = bundleFromRoots([rootFromKey(keys)], { bundleVersion: 'wrong' });
  expectCode('DOKE_PAY_A12_TRUST_BUNDLE_VERSION_INVALID', () => trust.validateTrustBundle(bundle));
});

addCase('negative_bundle_fingerprint', 'DOKE_PAY_A12_TRUST_BUNDLE_FINGERPRINT_MISMATCH', () => {
  const keys = generateKey('ed25519');
  const bundle = bundleFromRoots([rootFromKey(keys)]);
  bundle.bundleFingerprint = HASH('9');
  expectCode('DOKE_PAY_A12_TRUST_BUNDLE_FINGERPRINT_MISMATCH', () => trust.validateTrustBundle(bundle));
});

addCase('negative_duplicate_key_version', 'DOKE_PAY_A12_DUPLICATE_KEY_VERSION', () => {
  const keys1 = generateKey('ed25519');
  const keys2 = generateKey('ed25519');
  const bundle = bundleFromRoots([
    rootFromKey(keys1, { keyId: 'executor-key-0001' }),
    rootFromKey(keys2, { keyId: 'executor-key-0002' })
  ]);
  expectCode('DOKE_PAY_A12_DUPLICATE_KEY_VERSION', () => trust.validateTrustBundle(bundle));
});

addCase('negative_private_jwk', 'DOKE_PAY_A12_PRIVATE_KEY_MATERIAL_DENIED', () => {
  const keys = generateKey('ed25519');
  const privateJwk = keys.privateKey.export({ format: 'jwk' });
  const root = rootFromKey(keys, { publicKeyJwk: privateJwk, publicKeyFingerprint: trust.publicKeyFingerprint(privateJwk) });
  const bundle = bundleFromRoots([root]);
  expectCode('DOKE_PAY_A12_PRIVATE_KEY_MATERIAL_DENIED', () => trust.validateTrustBundle(bundle));
});

addCase('negative_public_key_fingerprint', 'DOKE_PAY_A12_PUBLIC_KEY_FINGERPRINT_MISMATCH', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys, { publicKeyFingerprint: HASH('8') });
  const bundle = bundleFromRoots([root]);
  expectCode('DOKE_PAY_A12_PUBLIC_KEY_FINGERPRINT_MISMATCH', () => trust.validateTrustBundle(bundle));
});

addCase('negative_unknown_key', 'DOKE_PAY_A12_TRUST_ROOT_NOT_FOUND', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys);
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt();
  const envelope = signReceipt(receipt, keys.privateKey, bundle, root, { keyId: 'executor-key-unknown' });
  expectCode('DOKE_PAY_A12_TRUST_ROOT_NOT_FOUND', () => trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW }));
});

addCase('negative_revoked_key', 'DOKE_PAY_A12_KEY_REVOKED', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys, { status: 'revoked', revokedAt: '2026-08-03T22:00:00.000Z' });
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt();
  const envelope = signReceipt(receipt, keys.privateKey, bundle, root);
  expectCode('DOKE_PAY_A12_KEY_REVOKED', () => trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW }));
});

addCase('negative_not_yet_valid', 'DOKE_PAY_A12_KEY_NOT_YET_VALID', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys, { notBefore: '2026-08-04T00:56:00.000Z' });
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt();
  const envelope = signReceipt(receipt, keys.privateKey, bundle, root);
  expectCode('DOKE_PAY_A12_KEY_NOT_YET_VALID', () => trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW }));
});

addCase('negative_expired_key', 'DOKE_PAY_A12_KEY_EXPIRED', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys, { notAfter: '2026-08-04T00:58:00.000Z' });
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt();
  const envelope = signReceipt(receipt, keys.privateKey, bundle, root);
  expectCode('DOKE_PAY_A12_KEY_EXPIRED', () => trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW }));
});

addCase('negative_retiring_signed_after_retire', 'DOKE_PAY_A12_RETIRED_KEY_NEW_SIGNATURE_DENIED', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys, {
    status: 'retiring',
    retireAt: '2026-08-04T00:54:00.000Z',
    acceptUntil: '2026-08-04T02:00:00.000Z'
  });
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt();
  const envelope = signReceipt(receipt, keys.privateKey, bundle, root);
  expectCode('DOKE_PAY_A12_RETIRED_KEY_NEW_SIGNATURE_DENIED', () => trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW }));
});

addCase('negative_retiring_grace_expired', 'DOKE_PAY_A12_RETIRED_KEY_GRACE_EXPIRED', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys, {
    status: 'retiring',
    retireAt: '2026-08-04T00:57:00.000Z',
    acceptUntil: '2026-08-04T00:59:00.000Z'
  });
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt();
  const envelope = signReceipt(receipt, keys.privateKey, bundle, root);
  expectCode('DOKE_PAY_A12_RETIRED_KEY_GRACE_EXPIRED', () => trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW }));
});

addCase('negative_scheme_mismatch', 'DOKE_PAY_A12_SIGNATURE_SCHEME_MISMATCH', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys);
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt({ signatureScheme: 'rsa_pss_sha256' });
  const envelope = signReceipt(receipt, keys.privateKey, bundle, root);
  expectCode('DOKE_PAY_A12_SIGNATURE_SCHEME_MISMATCH', () => trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW }));
});

addCase('negative_operation_denied', 'DOKE_PAY_A12_OPERATION_NOT_ALLOWED', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys, { allowedOperations: ['cleanup'] });
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt();
  const envelope = signReceipt(receipt, keys.privateKey, bundle, root);
  expectCode('DOKE_PAY_A12_OPERATION_NOT_ALLOWED', () => trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW }));
});

addCase('negative_executor_denied', 'DOKE_PAY_A12_EXECUTOR_NOT_ALLOWED', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys, { allowedExecutorIdHashes: [OTHER_EXECUTOR_HASH] });
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt();
  const envelope = signReceipt(receipt, keys.privateKey, bundle, root);
  expectCode('DOKE_PAY_A12_EXECUTOR_NOT_ALLOWED', () => trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW }));
});

addCase('negative_payload_hash', 'DOKE_PAY_A12_SIGNED_PAYLOAD_HASH_MISMATCH', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys);
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt();
  const envelope = signReceipt(receipt, keys.privateKey, bundle, root, { signedPayloadHash: HASH('7') });
  expectCode('DOKE_PAY_A12_SIGNED_PAYLOAD_HASH_MISMATCH', () => trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW }));
});

addCase('negative_signature_hash', 'DOKE_PAY_A12_SIGNATURE_HASH_MISMATCH', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys);
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt();
  const envelope = signReceipt(receipt, keys.privateKey, bundle, root, { signatureHash: HASH('6') });
  expectCode('DOKE_PAY_A12_SIGNATURE_HASH_MISMATCH', () => trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW }));
});

addCase('negative_invalid_signature', 'DOKE_PAY_A12_SIGNATURE_INVALID', () => {
  const keys = generateKey('ed25519');
  const other = generateKey('ed25519');
  const root = rootFromKey(keys);
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt();
  const envelope = signReceipt(receipt, other.privateKey, bundle, root);
  expectCode('DOKE_PAY_A12_SIGNATURE_INVALID', () => trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW }));
});

addCase('negative_signed_at_mismatch', 'DOKE_PAY_A12_SIGNED_AT_MISMATCH', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys);
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt();
  const envelope = signReceipt(receipt, keys.privateKey, bundle, root, { signedAt: '2026-08-04T00:54:00.000Z' });
  expectCode('DOKE_PAY_A12_SIGNED_AT_MISMATCH', () => trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW }));
});

addCase('negative_envelope_fingerprint', 'DOKE_PAY_A12_SIGNATURE_ENVELOPE_FINGERPRINT_MISMATCH', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys);
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt();
  const envelope = signReceipt(receipt, keys.privateKey, bundle, root);
  envelope.envelopeFingerprint = HASH('5');
  expectCode('DOKE_PAY_A12_SIGNATURE_ENVELOPE_FINGERPRINT_MISMATCH', () => trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW }));
});

addCase('negative_envelope_replay', 'DOKE_PAY_A12_SIGNATURE_REPLAYED', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys);
  const bundle = bundleFromRoots([root]);
  const receipt = baseReceipt();
  const envelope = signReceipt(receipt, keys.privateKey, bundle, root);
  const ledger = new Set();
  trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW, signatureLedger: ledger });
  expectCode('DOKE_PAY_A12_SIGNATURE_REPLAYED', () => trust.verifyDetachedReceiptSignature(receipt, envelope, bundle, { now: FIXED_NOW, signatureLedger: ledger }));
});

addCase('negative_rotation_unknown_predecessor', 'DOKE_PAY_A12_ROTATION_PREDECESSOR_UNKNOWN', () => {
  const keys = generateKey('ed25519');
  const root = rootFromKey(keys, { keyVersion: 2, supersedesKeyId: 'executor-key-missing' });
  const bundle = bundleFromRoots([root]);
  expectCode('DOKE_PAY_A12_ROTATION_PREDECESSOR_UNKNOWN', () => trust.validateTrustBundle(bundle));
});

addCase('negative_rotation_nonincremental', 'DOKE_PAY_A12_ROTATION_VERSION_INVALID', () => {
  const oldKeys = generateKey('ed25519');
  const newKeys = generateKey('ed25519');
  const oldRoot = rootFromKey(oldKeys, {
    keyId: 'executor-key-0001',
    keyVersion: 2,
    status: 'retiring',
    retireAt: '2026-08-04T00:57:00.000Z',
    acceptUntil: '2026-08-04T02:00:00.000Z'
  });
  const newRoot = rootFromKey(newKeys, {
    keyId: 'executor-key-0002',
    keyVersion: 1,
    supersedesKeyId: oldRoot.keyId
  });
  const bundle = bundleFromRoots([oldRoot, newRoot]);
  expectCode('DOKE_PAY_A12_ROTATION_VERSION_INVALID', () => trust.validateTrustBundle(bundle));
});

addCase('negative_production_bundle', 'DOKE_PAY_A12_PRODUCTION_BUNDLE_DENIED', () => {
  const keys = generateKey('ed25519');
  const bundle = bundleFromRoots([rootFromKey(keys)], { production: true });
  expectCode('DOKE_PAY_A12_PRODUCTION_BUNDLE_DENIED', () => trust.validateTrustBundle(bundle));
});

const fixture = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../tests/fixtures/pay-a12-executor-trust-root-cases.json'), 'utf8'));
assert.equal(cases.length, fixture.totalCases);
assert.deepEqual(
  cases.map((item) => item.id),
  [...fixture.positiveCases, ...fixture.negativeCases.map((item) => item.id)]
);
for (const item of cases) item.run();
console.log('PAY-A12 executor trust-root and detached-signature runtime tests passed: ' + cases.length + ' cases.');
