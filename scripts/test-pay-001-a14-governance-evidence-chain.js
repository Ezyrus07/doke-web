'use strict';

const crypto = require('node:crypto');
const contract = require('../backend/modules/payments/payment-reconciliation-governance-evidence');
const governance = require('../backend/modules/payments/payment-reconciliation-executor-governance');
const { canonicalJson, sha256 } = require('../backend/modules/payments/payment-reconciliation-executor-adapter');

const NOW = '2026-08-03T23:00:00.000Z';
const HEAD = 'a'.repeat(40);
const h = (value) => sha256(value);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function keyPair(algorithm) {
  if (algorithm === 'ed25519') return crypto.generateKeyPairSync('ed25519');
  return crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicExponent: 0x10001 });
}

function exportPublicJwk(publicKey) {
  return publicKey.export({ format: 'jwk' });
}

function makeRoot({
  keyId, keyFamily, keyVersion = 1, algorithm = 'ed25519',
  keyPairValue, signerHashes, purposes, roles = governance.APPROVER_ROLES,
  assurance = contract.ALLOWED_ASSURANCE_LEVELS, status = 'active',
  notBefore = '2026-08-03T20:00:00.000Z',
  notAfter = '2026-08-05T20:00:00.000Z'
}) {
  const publicKeyJwk = exportPublicJwk(keyPairValue.publicKey);
  return {
    keyId,
    keyFamily,
    keyVersion,
    algorithm,
    publicKeyJwk,
    publicKeyFingerprint: contract.publicKeyFingerprint(publicKeyJwk),
    status,
    notBefore,
    notAfter,
    revokedAt: status === 'revoked' ? '2026-08-03T22:00:00.000Z' : null,
    allowedPurposes: purposes,
    allowedSignerIdHashes: signerHashes,
    allowedRoles: roles,
    allowedAssuranceLevels: assurance,
    production: false
  };
}

function makeTrustBundle(roots, overrides = {}) {
  const body = {
    bundleVersion: contract.IDENTITY_TRUST_BUNDLE_VERSION,
    bundleId: 'identity-trust-bundle.synthetic',
    issuedAt: '2026-08-03T21:00:00.000Z',
    production: false,
    repositoryManagedPrivateKeys: false,
    roots,
    ...overrides
  };
  delete body.bundleFingerprint;
  return {
    ...body,
    bundleFingerprint: contract.computeIdentityTrustBundleFingerprint(body)
  };
}

function makeSignatureEnvelope(value, purpose, keyPairValue, root, trustBundle, signerIdHash, signedAt, overrides = {}) {
  const payload = Buffer.from(canonicalJson({
    signingDomain: contract.SIGNING_DOMAIN,
    purpose,
    payload: value
  }), 'utf8');
  const signature = root.algorithm === 'ed25519'
    ? crypto.sign(null, payload, keyPairValue.privateKey)
    : crypto.sign('sha256', payload, {
      key: keyPairValue.privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32
    });
  const body = {
    envelopeVersion: contract.SIGNATURE_ENVELOPE_VERSION,
    purpose,
    keyId: root.keyId,
    keyVersion: root.keyVersion,
    signatureScheme: root.algorithm,
    signerIdHash,
    signedPayloadHash: sha256(payload),
    signatureBase64: signature.toString('base64'),
    signatureHash: sha256(signature),
    signedAt,
    bundleFingerprint: trustBundle.bundleFingerprint,
    ...overrides
  };
  delete body.envelopeFingerprint;
  return {
    ...body,
    envelopeFingerprint: contract.computeSignatureEnvelopeFingerprint(body)
  };
}

function makeIdentityAttestation({ suffix, issuerIdHash, subjectIdHash, role, assuranceLevel = role === 'security' ? 'aal3' : 'aal2', overrides = {} }) {
  const body = {
    attestationVersion: contract.IDENTITY_ATTESTATION_VERSION,
    attestationId: 'identity-attestation.' + suffix,
    issuerIdHash,
    subjectIdHash,
    role,
    assuranceLevel,
    credentialStatus: 'active',
    evidenceHash: h('identity-evidence:' + suffix),
    nonceHash: h('identity-nonce:' + suffix),
    issuedAt: '2026-08-03T22:30:00.000Z',
    expiresAt: '2026-08-04T22:30:00.000Z',
    production: false,
    containsDirectIdentifiers: false,
    ...overrides
  };
  delete body.attestationFingerprint;
  return {
    ...body,
    attestationFingerprint: contract.computeIdentityAttestationFingerprint(body)
  };
}

function makeDecision(action, roles, executorIdHash, suffix, overrides = {}) {
  const nullable = {
    custodyAttestationFingerprint: null,
    trustRootProposalFingerprint: null,
    offboardingPlanFingerprint: null,
    incidentFingerprint: null
  };
  if (action === 'onboard_executor' || action === 'rotate_trust_root') {
    nullable.custodyAttestationFingerprint = h('custody:' + suffix);
    nullable.trustRootProposalFingerprint = h('root:' + suffix);
  }
  if (action === 'offboard_executor') nullable.offboardingPlanFingerprint = h('offboard:' + suffix);
  if (action === 'emergency_revoke_root') {
    nullable.trustRootProposalFingerprint = h('root:' + suffix);
    nullable.incidentFingerprint = h('incident:' + suffix);
  }
  return {
    decisionVersion: governance.DECISION_VERSION,
    contractVersion: governance.CONTRACT_VERSION,
    a12ContractVersion: 'pay-a12-executor-trust-root-signature-v1',
    action,
    requestFingerprint: h('request:' + suffix),
    executorIdHash,
    exactGitHead: HEAD,
    approvalCount: roles.length,
    approvalRoles: roles.slice().sort(),
    quorumSatisfied: true,
    separationOfDutiesSatisfied: true,
    ...nullable,
    decision: 'approved_repository_only_handoff',
    realExecutorConfigured: false,
    realTrustRootConfigured: false,
    privateKeyMaterialAccepted: false,
    stagingAuthorized: false,
    productionAllowed: false,
    remoteExecutionAuthorized: false,
    nextPhaseAutomaticallyAuthorized: false,
    networkRequests: 0,
    databaseConnections: 0,
    subprocesses: 0,
    environmentReads: 0,
    directMoneyMutationAllowed: false,
    providerOperationAllowed: false,
    ...overrides
  };
}

function makeApproval(decision, role, suffix, overrides = {}) {
  const body = {
    approvalVersion: governance.APPROVAL_RECORD_VERSION,
    approvalId: 'governance-approval.' + suffix + '.' + role,
    requestFingerprint: decision.requestFingerprint,
    approverIdHash: h('approver:' + role),
    role,
    decision: 'approve',
    approvedAt: '2026-08-03T22:40:00.000Z',
    evidenceHash: h('approval-evidence:' + suffix + ':' + role),
    production: false,
    ...overrides
  };
  delete body.approvalFingerprint;
  return {
    ...body,
    approvalFingerprint: governance.computeApprovalFingerprint(body)
  };
}

const issuer1Id = h('issuer:one');
const issuer2Id = h('issuer:two');
const issuer3Id = h('issuer:rsa');
const governanceSignerId = h('governance:signer');
const issuer1Keys = keyPair('ed25519');
const issuer2Keys = keyPair('ed25519');
const issuer3Keys = keyPair('rsa_pss_sha256');
const governanceKeys = keyPair('ed25519');

const issuer1Root = makeRoot({
  keyId: 'issuer-one-key',
  keyFamily: 'issuer-one',
  algorithm: 'ed25519',
  keyPairValue: issuer1Keys,
  signerHashes: [issuer1Id],
  purposes: ['identity_attestation']
});
const issuer2Root = makeRoot({
  keyId: 'issuer-two-key',
  keyFamily: 'issuer-two',
  algorithm: 'ed25519',
  keyPairValue: issuer2Keys,
  signerHashes: [issuer2Id],
  purposes: ['identity_attestation']
});
const issuer3Root = makeRoot({
  keyId: 'issuer-rsa-key',
  keyFamily: 'issuer-rsa',
  algorithm: 'rsa_pss_sha256',
  keyPairValue: issuer3Keys,
  signerHashes: [issuer3Id],
  purposes: ['identity_attestation']
});
const governanceRoot = makeRoot({
  keyId: 'governance-signing-key',
  keyFamily: 'governance-signing',
  algorithm: 'ed25519',
  keyPairValue: governanceKeys,
  signerHashes: [governanceSignerId],
  purposes: ['governance_evidence'],
  roles: [],
  assurance: []
});
const trustBundle = makeTrustBundle([issuer1Root, issuer2Root, issuer3Root, governanceRoot]);

function identityForApproval(approval, suffix, issuerChoice = approval.role === 'finance_operations' || approval.role === 'platform_operations' ? 2 : 1, assuranceOverride) {
  const issuerIdHash = issuerChoice === 1 ? issuer1Id : issuerChoice === 2 ? issuer2Id : issuer3Id;
  const root = issuerChoice === 1 ? issuer1Root : issuerChoice === 2 ? issuer2Root : issuer3Root;
  const keys = issuerChoice === 1 ? issuer1Keys : issuerChoice === 2 ? issuer2Keys : issuer3Keys;
  const attestation = makeIdentityAttestation({
    suffix: suffix + '.' + approval.role,
    issuerIdHash,
    subjectIdHash: approval.approverIdHash,
    role: approval.role,
    assuranceLevel: assuranceOverride || (approval.role === 'security' ? 'aal3' : 'aal2')
  });
  const envelope = makeSignatureEnvelope(attestation, 'identity_attestation', keys, root, trustBundle, issuerIdHash, attestation.issuedAt);
  const verified = contract.verifyExternalIdentityAttestation(attestation, envelope, trustBundle, {
    now: NOW,
    signatureLedger: new Set(),
    identityLedger: new Set()
  });
  return { attestation, envelope, verified, root, keys };
}

function makeStage(action, roles, executorIdHash, suffix, previousReceipt, sequence, shared) {
  const decision = makeDecision(action, roles, executorIdHash, suffix);
  const approvals = roles.map((role) => makeApproval(decision, role, suffix));
  const identities = approvals.map((approval) => identityForApproval(approval, suffix).verified);
  const bundle = contract.buildGovernanceEvidenceBundle(decision, approvals, identities, {
    issuedAt: '2026-08-03T22:' + String(45 + sequence).padStart(2, '0') + ':00.000Z',
    previousDecisionReceiptHash: previousReceipt ? previousReceipt.receiptHash : null
  });
  const envelope = makeSignatureEnvelope(bundle, 'governance_evidence', governanceKeys, governanceRoot, trustBundle, governanceSignerId, bundle.issuedAt);
  const verifiedEvidence = contract.verifyGovernanceEvidenceBundleSignature(bundle, envelope, trustBundle, {
    now: NOW,
    signatureLedger: new Set()
  });
  const receipt = contract.createLifecycleDecisionReceipt(bundle, verifiedEvidence, {
    sequence,
    previousReceipt,
    acceptedAt: bundle.issuedAt,
    receiptLedger: shared.receiptLedger,
    chainHeadByExecutor: shared.chainHeads
  });
  return { decision, approvals, identities, bundle, envelope, verifiedEvidence, receipt };
}

const positiveNames = [
  'ed25519_identity_attestation_verified',
  'rsa_pss_identity_attestation_verified',
  'signed_governance_evidence_verified',
  'genesis_decision_receipt_created',
  'four_stage_lifecycle_chain_created',
  'four_stage_lifecycle_chain_validated'
];

const negativeNames = [
  'private_jwk_rejected',
  'production_trust_bundle_rejected',
  'revoked_root_rejected',
  'expired_root_rejected',
  'purpose_not_allowlisted_rejected',
  'signer_not_allowlisted_rejected',
  'role_not_allowlisted_rejected',
  'assurance_not_allowlisted_rejected',
  'invalid_signature_rejected',
  'signature_hash_mismatch_rejected',
  'signed_payload_hash_mismatch_rejected',
  'envelope_fingerprint_mismatch_rejected',
  'identity_version_mismatch_rejected',
  'direct_identifiers_rejected',
  'production_identity_rejected',
  'inactive_credential_rejected',
  'expired_identity_rejected',
  'identity_issuer_mismatch_rejected',
  'identity_signed_at_mismatch_rejected',
  'identity_replay_rejected',
  'approval_inventory_mismatch_rejected',
  'identity_inventory_mismatch_rejected',
  'missing_approver_identity_rejected',
  'identity_role_mismatch_rejected',
  'duplicate_identity_subject_rejected',
  'issuer_diversity_missing_rejected',
  'security_without_aal3_rejected',
  'evidence_unknown_field_rejected',
  'evidence_fingerprint_drift_rejected',
  'production_evidence_rejected',
  'direct_identifiers_in_evidence_rejected',
  'private_key_flag_in_evidence_rejected',
  'governance_purpose_mismatch_rejected',
  'governance_signature_replay_rejected',
  'genesis_predecessor_rejected',
  'non_genesis_without_previous_rejected',
  'receipt_sequence_gap_rejected',
  'previous_receipt_hash_mismatch_rejected',
  'decision_chain_fork_rejected',
  'decision_receipt_replay_rejected',
  'decision_receipt_integrity_drift_rejected',
  'decision_chain_sequence_gap_rejected',
  'decision_chain_executor_mismatch_rejected',
  'production_decision_receipt_rejected',
  'a13_authority_escalation_rejected',
  'approval_fingerprint_drift_rejected'
];

const results = [];
function pass(name, fn) {
  fn();
  results.push({ name, passed: true, expected: 'accepted' });
}
function reject(name, code, fn) {
  let caught;
  try { fn(); } catch (error) { caught = error; }
  if (!caught) throw new Error(name + ' did not reject.');
  if (code && caught.code !== code) throw new Error(name + ' rejected with ' + caught.code + ', expected ' + code);
  results.push({ name, passed: true, expected: 'rejected', code: caught.code });
}

const executorIdHash = h('executor:primary');
const shared = { receiptLedger: new Set(), chainHeads: new Map() };
const onboarding = makeStage(
  'onboard_executor',
  ['security', 'finance_operations', 'legal_compliance'],
  executorIdHash,
  'onboard',
  null,
  1,
  shared
);
const rotation = makeStage(
  'rotate_trust_root',
  ['security', 'finance_operations', 'platform_operations'],
  executorIdHash,
  'rotate',
  onboarding.receipt,
  2,
  shared
);
const offboarding = makeStage(
  'offboard_executor',
  ['security', 'finance_operations', 'legal_compliance'],
  executorIdHash,
  'offboard',
  rotation.receipt,
  3,
  shared
);
const emergency = makeStage(
  'emergency_revoke_root',
  ['security', 'finance_operations'],
  executorIdHash,
  'emergency',
  offboarding.receipt,
  4,
  shared
);

pass(positiveNames[0], () => {
  if (!onboarding.identities[0].verifiedOffline) throw new Error('Ed25519 identity was not verified.');
});
pass(positiveNames[1], () => {
  const approval = makeApproval(onboarding.decision, 'legal_compliance', 'rsa-positive');
  const item = identityForApproval(approval, 'rsa-positive', 3);
  if (item.verified.assuranceLevel !== 'aal2') throw new Error('RSA identity assurance mismatch.');
});
pass(positiveNames[2], () => {
  if (!onboarding.verifiedEvidence.verifiedOffline) throw new Error('Governance evidence was not verified.');
});
pass(positiveNames[3], () => {
  if (onboarding.receipt.sequence !== 1 || onboarding.receipt.previousReceiptHash !== null) throw new Error('Genesis receipt mismatch.');
});
pass(positiveNames[4], () => {
  if (emergency.receipt.sequence !== 4) throw new Error('Lifecycle chain was not created.');
});
pass(positiveNames[5], () => {
  const summary = contract.validateLifecycleDecisionChain([
    onboarding.receipt, rotation.receipt, offboarding.receipt, emergency.receipt
  ]);
  if (!summary.contiguous || summary.receiptCount !== 4) throw new Error('Lifecycle chain validation failed.');
});

const baseApproval = onboarding.approvals[0];
const baseIdentity = identityForApproval(baseApproval, 'negative-base');
const baseAtt = baseIdentity.attestation;
const baseEnv = baseIdentity.envelope;

reject(negativeNames[0], 'DOKE_PAY_A14_PRIVATE_KEY_MATERIAL_DENIED', () => {
  const roots = clone(trustBundle.roots);
  roots[0].publicKeyJwk.d = 'private';
  contract.validateIdentityTrustBundle(makeTrustBundle(roots));
});
reject(negativeNames[1], 'DOKE_PAY_A14_PRODUCTION_BUNDLE_DENIED', () => {
  contract.validateIdentityTrustBundle(makeTrustBundle(clone(trustBundle.roots), { production: true }));
});
reject(negativeNames[2], 'DOKE_PAY_A14_TRUST_ROOT_REVOKED', () => {
  const roots = clone(trustBundle.roots);
  roots[0].status = 'revoked'; roots[0].revokedAt = '2026-08-03T22:00:00.000Z';
  const bundle = makeTrustBundle(roots);
  contract.verifyExternalIdentityAttestation(baseAtt, makeSignatureEnvelope(baseAtt, 'identity_attestation', issuer1Keys, roots[0], bundle, issuer1Id, baseAtt.issuedAt), bundle, { now: NOW });
});
reject(negativeNames[3], 'DOKE_PAY_A14_TRUST_ROOT_OUTSIDE_WINDOW', () => {
  const roots = clone(trustBundle.roots);
  roots[0].notAfter = '2026-08-03T22:40:00.000Z';
  const bundle = makeTrustBundle(roots);
  const env = makeSignatureEnvelope(baseAtt, 'identity_attestation', issuer1Keys, roots[0], bundle, issuer1Id, baseAtt.issuedAt);
  contract.verifyExternalIdentityAttestation(baseAtt, env, bundle, { now: NOW });
});
reject(negativeNames[4], 'DOKE_PAY_A14_PURPOSE_NOT_ALLOWED', () => {
  const roots = clone(trustBundle.roots);
  roots[0].allowedPurposes = ['governance_evidence'];
  const bundle = makeTrustBundle(roots);
  const env = makeSignatureEnvelope(baseAtt, 'identity_attestation', issuer1Keys, roots[0], bundle, issuer1Id, baseAtt.issuedAt);
  contract.verifyExternalIdentityAttestation(baseAtt, env, bundle, { now: NOW });
});
reject(negativeNames[5], 'DOKE_PAY_A14_SIGNER_NOT_ALLOWED', () => {
  const env = makeSignatureEnvelope(baseAtt, 'identity_attestation', issuer1Keys, issuer1Root, trustBundle, h('unknown-issuer'), baseAtt.issuedAt);
  contract.verifyExternalIdentityAttestation({ ...baseAtt, issuerIdHash: env.signerIdHash, attestationFingerprint: contract.computeIdentityAttestationFingerprint({ ...baseAtt, issuerIdHash: env.signerIdHash, attestationFingerprint: undefined }) }, env, trustBundle, { now: NOW });
});
reject(negativeNames[6], 'DOKE_PAY_A14_ROLE_NOT_ALLOWED', () => {
  const roots = clone(trustBundle.roots); roots[0].allowedRoles = ['finance_operations'];
  const bundle = makeTrustBundle(roots);
  const env = makeSignatureEnvelope(baseAtt, 'identity_attestation', issuer1Keys, roots[0], bundle, issuer1Id, baseAtt.issuedAt);
  contract.verifyExternalIdentityAttestation(baseAtt, env, bundle, { now: NOW });
});
reject(negativeNames[7], 'DOKE_PAY_A14_ASSURANCE_NOT_ALLOWED', () => {
  const roots = clone(trustBundle.roots); roots[0].allowedAssuranceLevels = ['aal2'];
  const bundle = makeTrustBundle(roots);
  const env = makeSignatureEnvelope(baseAtt, 'identity_attestation', issuer1Keys, roots[0], bundle, issuer1Id, baseAtt.issuedAt);
  contract.verifyExternalIdentityAttestation(baseAtt, env, bundle, { now: NOW });
});
reject(negativeNames[8], 'DOKE_PAY_A14_SIGNATURE_INVALID', () => {
  const env = clone(baseEnv);
  const bytes = Buffer.from(env.signatureBase64, 'base64'); bytes[0] ^= 1;
  env.signatureBase64 = bytes.toString('base64'); env.signatureHash = sha256(bytes);
  env.envelopeFingerprint = contract.computeSignatureEnvelopeFingerprint({ ...env, envelopeFingerprint: undefined });
  contract.verifyExternalIdentityAttestation(baseAtt, env, trustBundle, { now: NOW });
});
reject(negativeNames[9], 'DOKE_PAY_A14_SIGNATURE_HASH_MISMATCH', () => {
  const env = clone(baseEnv); env.signatureHash = h('wrong');
  env.envelopeFingerprint = contract.computeSignatureEnvelopeFingerprint({ ...env, envelopeFingerprint: undefined });
  contract.verifyExternalIdentityAttestation(baseAtt, env, trustBundle, { now: NOW });
});
reject(negativeNames[10], 'DOKE_PAY_A14_SIGNED_PAYLOAD_HASH_MISMATCH', () => {
  const env = clone(baseEnv); env.signedPayloadHash = h('wrong');
  env.envelopeFingerprint = contract.computeSignatureEnvelopeFingerprint({ ...env, envelopeFingerprint: undefined });
  contract.verifyExternalIdentityAttestation(baseAtt, env, trustBundle, { now: NOW });
});
reject(negativeNames[11], 'DOKE_PAY_A14_SIGNATURE_ENVELOPE_FINGERPRINT_MISMATCH', () => {
  contract.verifyExternalIdentityAttestation(baseAtt, { ...baseEnv, envelopeFingerprint: h('wrong') }, trustBundle, { now: NOW });
});
reject(negativeNames[12], 'DOKE_PAY_A14_IDENTITY_VERSION_INVALID', () => {
  const att = { ...baseAtt, attestationVersion: 'wrong' };
  att.attestationFingerprint = contract.computeIdentityAttestationFingerprint({ ...att, attestationFingerprint: undefined });
  contract.verifyExternalIdentityAttestation(att, baseEnv, trustBundle, { now: NOW });
});
reject(negativeNames[13], 'DOKE_PAY_A14_DIRECT_IDENTIFIER_DENIED', () => {
  const att = { ...baseAtt, containsDirectIdentifiers: true };
  att.attestationFingerprint = contract.computeIdentityAttestationFingerprint({ ...att, attestationFingerprint: undefined });
  contract.verifyExternalIdentityAttestation(att, baseEnv, trustBundle, { now: NOW });
});
reject(negativeNames[14], 'DOKE_PAY_A14_PRODUCTION_IDENTITY_DENIED', () => {
  const att = { ...baseAtt, production: true };
  att.attestationFingerprint = contract.computeIdentityAttestationFingerprint({ ...att, attestationFingerprint: undefined });
  contract.verifyExternalIdentityAttestation(att, baseEnv, trustBundle, { now: NOW });
});
reject(negativeNames[15], 'DOKE_PAY_A14_CREDENTIAL_STATUS_INVALID', () => {
  const att = { ...baseAtt, credentialStatus: 'suspended' };
  att.attestationFingerprint = contract.computeIdentityAttestationFingerprint({ ...att, attestationFingerprint: undefined });
  contract.verifyExternalIdentityAttestation(att, baseEnv, trustBundle, { now: NOW });
});
reject(negativeNames[16], 'DOKE_PAY_A14_IDENTITY_ATTESTATION_EXPIRED', () => {
  const att = makeIdentityAttestation({ suffix: 'expired', issuerIdHash: issuer1Id, subjectIdHash: baseApproval.approverIdHash, role: baseApproval.role, overrides: { issuedAt: '2026-08-02T20:00:00.000Z', expiresAt: '2026-08-03T20:00:00.000Z' } });
  const env = makeSignatureEnvelope(att, 'identity_attestation', issuer1Keys, issuer1Root, trustBundle, issuer1Id, att.issuedAt);
  contract.verifyExternalIdentityAttestation(att, env, trustBundle, { now: NOW });
});
reject(negativeNames[17], 'DOKE_PAY_A14_IDENTITY_ISSUER_MISMATCH', () => {
  contract.verifyExternalIdentityAttestation(baseAtt, { ...baseEnv, signerIdHash: issuer2Id }, trustBundle, { now: NOW });
});
reject(negativeNames[18], 'DOKE_PAY_A14_IDENTITY_SIGNED_AT_MISMATCH', () => {
  contract.verifyExternalIdentityAttestation(baseAtt, { ...baseEnv, signedAt: '2026-08-03T22:31:00.000Z' }, trustBundle, { now: NOW });
});
reject(negativeNames[19], 'DOKE_PAY_A14_SIGNATURE_REPLAYED', () => {
  const signatureLedger = new Set();
  contract.verifyExternalIdentityAttestation(baseAtt, baseEnv, trustBundle, { now: NOW, signatureLedger, identityLedger: new Set() });
  contract.verifyExternalIdentityAttestation(baseAtt, baseEnv, trustBundle, { now: NOW, signatureLedger, identityLedger: new Set() });
});
reject(negativeNames[20], 'DOKE_PAY_A14_APPROVAL_INVENTORY_MISMATCH', () => {
  contract.buildGovernanceEvidenceBundle(onboarding.decision, onboarding.approvals.slice(0, 2), onboarding.identities, { issuedAt: onboarding.bundle.issuedAt });
});
reject(negativeNames[21], 'DOKE_PAY_A14_IDENTITY_INVENTORY_MISMATCH', () => {
  contract.buildGovernanceEvidenceBundle(onboarding.decision, onboarding.approvals, onboarding.identities.slice(0, 2), { issuedAt: onboarding.bundle.issuedAt });
});
reject(negativeNames[22], 'DOKE_PAY_A14_APPROVER_IDENTITY_MISSING', () => {
  const identities = onboarding.identities.slice();
  identities[0] = { ...identities[0], subjectIdHash: h('unknown-subject') };
  contract.buildGovernanceEvidenceBundle(onboarding.decision, onboarding.approvals, identities, { issuedAt: onboarding.bundle.issuedAt });
});
reject(negativeNames[23], 'DOKE_PAY_A14_IDENTITY_ROLE_MISMATCH', () => {
  const identities = onboarding.identities.map((item) => ({ ...item }));
  identities[0].role = 'legal_compliance';
  contract.buildGovernanceEvidenceBundle(onboarding.decision, onboarding.approvals, identities, { issuedAt: onboarding.bundle.issuedAt });
});
reject(negativeNames[24], 'DOKE_PAY_A14_DUPLICATE_IDENTITY_SUBJECT_DENIED', () => {
  const identities = onboarding.identities.map((item) => ({ ...item }));
  identities[1].subjectIdHash = identities[0].subjectIdHash;
  contract.buildGovernanceEvidenceBundle(onboarding.decision, onboarding.approvals, identities, { issuedAt: onboarding.bundle.issuedAt });
});
reject(negativeNames[25], 'DOKE_PAY_A14_IDENTITY_ISSUER_DIVERSITY_REQUIRED', () => {
  const identities = onboarding.approvals.map((approval, index) => identityForApproval(approval, 'same-issuer-' + index, 1).verified);
  contract.buildGovernanceEvidenceBundle(onboarding.decision, onboarding.approvals, identities, { issuedAt: onboarding.bundle.issuedAt });
});
reject(negativeNames[26], 'DOKE_PAY_A14_SECURITY_AAL3_REQUIRED', () => {
  const identities = onboarding.identities.map((item) => ({ ...item }));
  const index = identities.findIndex((item) => item.role === 'security');
  identities[index].assuranceLevel = 'aal2';
  contract.buildGovernanceEvidenceBundle(onboarding.decision, onboarding.approvals, identities, { issuedAt: onboarding.bundle.issuedAt });
});
reject(negativeNames[27], 'DOKE_PAY_A14_EVIDENCE_BUNDLE_INVALID', () => {
  contract.validateGovernanceEvidenceBundle({ ...onboarding.bundle, unexpected: true });
});
reject(negativeNames[28], 'DOKE_PAY_A14_EVIDENCE_BUNDLE_FINGERPRINT_MISMATCH', () => {
  contract.validateGovernanceEvidenceBundle({ ...onboarding.bundle, bundleFingerprint: h('wrong') });
});
reject(negativeNames[29], 'DOKE_PAY_A14_PRODUCTION_EVIDENCE_DENIED', () => {
  const bundle = { ...onboarding.bundle, production: true };
  bundle.bundleFingerprint = contract.computeEvidenceBundleFingerprint({ ...bundle, bundleFingerprint: undefined });
  contract.validateGovernanceEvidenceBundle(bundle);
});
reject(negativeNames[30], 'DOKE_PAY_A14_DIRECT_IDENTIFIER_DENIED', () => {
  const bundle = { ...onboarding.bundle, containsDirectIdentifiers: true };
  bundle.bundleFingerprint = contract.computeEvidenceBundleFingerprint({ ...bundle, bundleFingerprint: undefined });
  contract.validateGovernanceEvidenceBundle(bundle);
});
reject(negativeNames[31], 'DOKE_PAY_A14_PRIVATE_KEY_MATERIAL_DENIED', () => {
  const bundle = { ...onboarding.bundle, containsPrivateKeyMaterial: true };
  bundle.bundleFingerprint = contract.computeEvidenceBundleFingerprint({ ...bundle, bundleFingerprint: undefined });
  contract.validateGovernanceEvidenceBundle(bundle);
});
reject(negativeNames[32], 'DOKE_PAY_A14_GOVERNANCE_SIGNATURE_PURPOSE_REQUIRED', () => {
  const env = makeSignatureEnvelope(onboarding.bundle, 'identity_attestation', governanceKeys, { ...governanceRoot, allowedPurposes: ['identity_attestation'] }, makeTrustBundle([issuer1Root, issuer2Root, issuer3Root, { ...governanceRoot, allowedPurposes: ['identity_attestation'] }]), governanceSignerId, onboarding.bundle.issuedAt);
  contract.verifyGovernanceEvidenceBundleSignature(onboarding.bundle, env, trustBundle, { now: NOW });
});
reject(negativeNames[33], 'DOKE_PAY_A14_SIGNATURE_REPLAYED', () => {
  const ledger = new Set();
  contract.verifyGovernanceEvidenceBundleSignature(onboarding.bundle, onboarding.envelope, trustBundle, { now: NOW, signatureLedger: ledger });
  contract.verifyGovernanceEvidenceBundleSignature(onboarding.bundle, onboarding.envelope, trustBundle, { now: NOW, signatureLedger: ledger });
});
reject(negativeNames[34], 'DOKE_PAY_A14_GENESIS_PREDECESSOR_DENIED', () => {
  const bundle = { ...onboarding.bundle, previousDecisionReceiptHash: h('previous') };
  bundle.bundleFingerprint = contract.computeEvidenceBundleFingerprint({ ...bundle, bundleFingerprint: undefined });
  const env = makeSignatureEnvelope(bundle, 'governance_evidence', governanceKeys, governanceRoot, trustBundle, governanceSignerId, bundle.issuedAt);
  const verified = contract.verifyGovernanceEvidenceBundleSignature(bundle, env, trustBundle, { now: NOW });
  contract.createLifecycleDecisionReceipt(bundle, verified, { sequence: 1 });
});
reject(negativeNames[35], 'DOKE_PAY_A14_PREVIOUS_RECEIPT_REQUIRED', () => {
  const bundle = { ...rotation.bundle, previousDecisionReceiptHash: onboarding.receipt.receiptHash };
  contract.createLifecycleDecisionReceipt(bundle, rotation.verifiedEvidence, { sequence: 2 });
});
reject(negativeNames[36], 'DOKE_PAY_A14_RECEIPT_SEQUENCE_GAP', () => {
  contract.createLifecycleDecisionReceipt(rotation.bundle, rotation.verifiedEvidence, { sequence: 3, previousReceipt: onboarding.receipt });
});
reject(negativeNames[37], 'DOKE_PAY_A14_PREVIOUS_RECEIPT_HASH_MISMATCH', () => {
  const bundle = { ...rotation.bundle, previousDecisionReceiptHash: h('wrong') };
  bundle.bundleFingerprint = contract.computeEvidenceBundleFingerprint({ ...bundle, bundleFingerprint: undefined });
  const env = makeSignatureEnvelope(bundle, 'governance_evidence', governanceKeys, governanceRoot, trustBundle, governanceSignerId, bundle.issuedAt);
  const verified = contract.verifyGovernanceEvidenceBundleSignature(bundle, env, trustBundle, { now: NOW });
  contract.createLifecycleDecisionReceipt(bundle, verified, { sequence: 2, previousReceipt: onboarding.receipt });
});
reject(negativeNames[38], 'DOKE_PAY_A14_CHAIN_FORK_DENIED', () => {
  const alternateBody = {
    ...onboarding.receipt,
    action: 'offboard_executor'
  };
  alternateBody.receiptHash = contract.computeDecisionReceiptHash(alternateBody);
  const bundle = { ...rotation.bundle, previousDecisionReceiptHash: alternateBody.receiptHash };
  bundle.bundleFingerprint = contract.computeEvidenceBundleFingerprint({ ...bundle, bundleFingerprint: undefined });
  const env = makeSignatureEnvelope(bundle, 'governance_evidence', governanceKeys, governanceRoot, trustBundle, governanceSignerId, bundle.issuedAt);
  const verified = contract.verifyGovernanceEvidenceBundleSignature(bundle, env, trustBundle, { now: NOW });
  contract.createLifecycleDecisionReceipt(bundle, verified, {
    sequence: 2,
    previousReceipt: alternateBody,
    chainHeadByExecutor: new Map([[executorIdHash, onboarding.receipt.receiptHash]])
  });
});
reject(negativeNames[39], 'DOKE_PAY_A14_DECISION_RECEIPT_REPLAYED', () => {
  const receiptLedger = new Set();
  const chainHeads = new Map();
  contract.createLifecycleDecisionReceipt(onboarding.bundle, onboarding.verifiedEvidence, { sequence: 1, receiptLedger, chainHeadByExecutor: chainHeads });
  contract.createLifecycleDecisionReceipt(onboarding.bundle, onboarding.verifiedEvidence, { sequence: 1, receiptLedger, chainHeadByExecutor: chainHeads });
});
reject(negativeNames[40], 'DOKE_PAY_A14_DECISION_RECEIPT_INTEGRITY_FAILED', () => {
  contract.validateLifecycleDecisionChain([{ ...onboarding.receipt, action: 'offboard_executor' }]);
});
reject(negativeNames[41], 'DOKE_PAY_A14_RECEIPT_SEQUENCE_GAP', () => {
  const receipt = { ...emergency.receipt, sequence: 3, previousReceiptHash: onboarding.receipt.receiptHash };
  receipt.receiptHash = contract.computeDecisionReceiptHash(receipt);
  contract.validateLifecycleDecisionChain([onboarding.receipt, receipt]);
});
reject(negativeNames[42], 'DOKE_PAY_A14_RECEIPT_EXECUTOR_MISMATCH', () => {
  contract.validateLifecycleDecisionChain([onboarding.receipt, { ...rotation.receipt, executorIdHash: h('other-executor') }]);
});
reject(negativeNames[43], 'DOKE_PAY_A14_PRODUCTION_RECEIPT_DENIED', () => {
  const receipt = { ...onboarding.receipt, production: true, productionAllowed: true };
  receipt.receiptHash = contract.computeDecisionReceiptHash(receipt);
  contract.validateLifecycleDecisionChain([receipt]);
});
reject(negativeNames[44], 'DOKE_PAY_A14_A13_AUTHORITY_ESCALATION', () => {
  contract.buildGovernanceEvidenceBundle({ ...onboarding.decision, productionAllowed: true }, onboarding.approvals, onboarding.identities, { issuedAt: onboarding.bundle.issuedAt });
});
reject(negativeNames[45], 'DOKE_PAY_A14_APPROVAL_FINGERPRINT_MISMATCH', () => {
  const approvals = onboarding.approvals.map((item) => ({ ...item }));
  approvals[0].approvalFingerprint = h('wrong');
  contract.buildGovernanceEvidenceBundle(onboarding.decision, approvals, onboarding.identities, { issuedAt: onboarding.bundle.issuedAt });
});

if (results.length !== positiveNames.length + negativeNames.length) {
  throw new Error('PAY-A14 case inventory mismatch: ' + results.length);
}
if (!results.every((result) => result.passed)) throw new Error('PAY-A14 conformance failed.');

console.log('PAY-A14 governance evidence and immutable decision-chain runtime tests passed: ' + results.length + ' cases.');
