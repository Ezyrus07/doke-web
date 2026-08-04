'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const adapter = require('../backend/modules/payments/payment-reconciliation-executor-adapter');
const governance = require('../backend/modules/payments/payment-reconciliation-executor-governance');
const evidence = require('../backend/modules/payments/payment-reconciliation-governance-evidence');
const contract = require('../backend/modules/payments/payment-reconciliation-identity-issuer-lifecycle');
const fixture = require('../tests/fixtures/pay-a15-identity-issuer-lifecycle-cases.json');

const h = (value) => adapter.sha256(value);
const clone = (value) => JSON.parse(JSON.stringify(value));
const now = '2026-08-04T10:00:00.000Z';
const observedAt = '2026-08-04T09:55:00.000Z';
const validUntil = '2026-08-04T10:10:00.000Z';
const issuerIdHash = h('issuer-alpha');
const issuerFamilyHash = h('issuer-family-alpha');
const subjectIdHash = h('subject-security');

const ed = crypto.generateKeyPairSync('ed25519');
const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicExponent: 0x10001 });
const edJwk = ed.publicKey.export({ format: 'jwk' });
const rsaJwk = rsa.publicKey.export({ format: 'jwk' });

function makeRoot(keyId, keyFamily, keyVersion, algorithm, publicKeyJwk, signerHashes = [issuerIdHash]) {
  return {
    keyId, keyFamily, keyVersion, algorithm, publicKeyJwk,
    publicKeyFingerprint: evidence.publicKeyFingerprint(publicKeyJwk),
    status: 'active', notBefore: '2026-01-01T00:00:00.000Z',
    notAfter: '2027-01-01T00:00:00.000Z', revokedAt: null,
    allowedPurposes: ['identity_attestation', 'governance_evidence'],
    allowedSignerIdHashes: signerHashes,
    allowedRoles: governance.APPROVER_ROLES.slice(),
    allowedAssuranceLevels: evidence.ALLOWED_ASSURANCE_LEVELS.slice(),
    production: false
  };
}
function finalizeTrustBundle(bundle) {
  bundle.bundleFingerprint = evidence.computeIdentityTrustBundleFingerprint(bundle);
  return bundle;
}
const trustBundle = finalizeTrustBundle({
  bundleVersion: evidence.IDENTITY_TRUST_BUNDLE_VERSION,
  bundleId: 'issuer-trust-bundle-a15', issuedAt: '2026-08-04T09:00:00.000Z',
  production: false, repositoryManagedPrivateKeys: false,
  roots: [
    makeRoot('issuer-ed-root-a15', 'issuer-family-ed', 1, 'ed25519', edJwk),
    makeRoot('issuer-rsa-root-a15', 'issuer-family-rsa', 1, 'rsa_pss_sha256', rsaJwk)
  ]
});
function finalizeRecord(record) {
  record.recordFingerprint = contract.computeIssuerRecordFingerprint(record);
  return record;
}
const record = finalizeRecord({
  recordVersion: contract.ISSUER_RECORD_VERSION,
  recordId: 'issuer-record-alpha', issuerIdHash, issuerFamilyHash,
  trustBundleFingerprint: trustBundle.bundleFingerprint,
  allowedRoles: governance.APPROVER_ROLES.slice(),
  allowedAssuranceLevels: evidence.ALLOWED_ASSURANCE_LEVELS.slice(),
  initialStatus: 'pending', registeredAt: '2026-08-01T00:00:00.000Z',
  reviewBy: '2026-12-01T00:00:00.000Z', production: false,
  containsDirectIdentifiers: false, repositoryManagedCredentials: false,
  remoteAuthorityGranted: false
});
function eventInput(sequence, previous, previousStatus, nextStatus, reasonCode, suffix) {
  return {
    eventId: 'issuer-event-' + suffix, issuerIdHash,
    trustBundleFingerprint: trustBundle.bundleFingerprint, sequence,
    previousEventHash: previous ? previous.eventHash : null,
    previousStatus, nextStatus, reasonCode,
    effectiveAt: `2026-08-0${Math.min(sequence + 1, 9)}T00:00:00.000Z`,
    evidenceHash: h('event-evidence-' + suffix), production: false,
    containsDirectIdentifiers: false
  };
}
function buildChain(transitions) {
  const ledger = new Set(); const heads = new Map(); const events = [];
  let previous = null;
  transitions.forEach(([from, to, reason, suffix], index) => {
    const event = contract.createIssuerLifecycleEvent(record,
      eventInput(index + 1, previous, from, to, reason, suffix),
      { trustBundle, previousEvent: previous, eventLedger: ledger, chainHeadByIssuer: heads });
    events.push(event); previous = event;
  });
  return events;
}
const lifecycle = buildChain([
  ['pending', 'active', 'onboarding_approved', 'activate'],
  ['active', 'suspended', 'security_incident', 'suspend'],
  ['suspended', 'active', 'remediation_complete', 'reactivate'],
  ['active', 'retired', 'contract_ended', 'retire']
]);
const activeEvent = lifecycle[0];
const suspendedEvent = lifecycle[1];
const retiredEvent = lifecycle[3];

function finalizeSnapshot(snapshot) {
  snapshot.snapshotFingerprint = contract.computeStatusSnapshotFingerprint(snapshot);
  return snapshot;
}
function makeSnapshot(event, overrides = {}) {
  return finalizeSnapshot({
    snapshotVersion: contract.STATUS_SNAPSHOT_VERSION,
    snapshotId: 'status-snapshot-' + event.sequence + '-' + event.nextStatus,
    issuerIdHash, issuerRecordFingerprint: record.recordFingerprint,
    trustBundleFingerprint: trustBundle.bundleFingerprint,
    lifecycleEventHash: event.eventHash, lifecycleSequence: event.sequence,
    issuerStatus: event.nextStatus, observedAt, validUntil,
    signerIdHash: issuerIdHash, evidenceHash: h('status-evidence-' + event.nextStatus),
    production: false, containsDirectIdentifiers: false,
    ...overrides
  });
}
function makeEnvelope(snapshot, root, privateKey, overrides = {}) {
  const payload = Buffer.from(adapter.canonicalJson({
    signingDomain: contract.STATUS_SIGNING_DOMAIN, payload: snapshot
  }), 'utf8');
  const signature = root.algorithm === 'ed25519'
    ? crypto.sign(null, payload, privateKey)
    : crypto.sign('sha256', payload, {
      key: privateKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32
    });
  const envelope = {
    envelopeVersion: contract.STATUS_SIGNATURE_VERSION,
    keyId: root.keyId, keyVersion: root.keyVersion,
    signatureScheme: root.algorithm, signerIdHash: issuerIdHash,
    signedPayloadHash: h(payload), signatureBase64: signature.toString('base64'),
    signatureHash: h(signature), signedAt: snapshot.observedAt,
    trustBundleFingerprint: trustBundle.bundleFingerprint,
    ...overrides
  };
  envelope.envelopeFingerprint = contract.computeStatusSignatureFingerprint(envelope);
  return envelope;
}
const activeSnapshot = makeSnapshot(activeEvent);
const activeEnvelope = makeEnvelope(activeSnapshot, trustBundle.roots[0], ed.privateKey);
const verifiedActive = contract.verifyIssuerStatusSnapshot(activeSnapshot, activeEnvelope,
  trustBundle, record, activeEvent, { now });
const suspendedSnapshot = makeSnapshot(suspendedEvent, { snapshotId: 'status-snapshot-suspended' });
const suspendedEnvelope = makeEnvelope(suspendedSnapshot, trustBundle.roots[0], ed.privateKey);
const verifiedSuspended = contract.verifyIssuerStatusSnapshot(suspendedSnapshot, suspendedEnvelope,
  trustBundle, record, suspendedEvent, { now });
const retiredSnapshot = makeSnapshot(retiredEvent, { snapshotId: 'status-snapshot-retired' });
const retiredEnvelope = makeEnvelope(retiredSnapshot, trustBundle.roots[0], ed.privateKey);
const verifiedRetired = contract.verifyIssuerStatusSnapshot(retiredSnapshot, retiredEnvelope,
  trustBundle, record, retiredEvent, { now });

const attestation = {
  attestationVersion: evidence.IDENTITY_ATTESTATION_VERSION,
  attestationId: 'identity-attestation-security', issuerIdHash, subjectIdHash,
  role: 'security', assuranceLevel: 'aal3', credentialStatus: 'active',
  evidenceHash: h('identity-evidence'), nonceHash: h('identity-nonce'),
  issuedAt: '2026-08-04T09:50:00.000Z', expiresAt: '2026-08-04T20:00:00.000Z',
  production: false, containsDirectIdentifiers: false
};
attestation.attestationFingerprint = evidence.computeIdentityAttestationFingerprint(attestation);
const verifiedIdentity = {
  verifiedIdentityVersion: evidence.VERIFIED_IDENTITY_VERSION,
  attestationFingerprint: attestation.attestationFingerprint,
  subjectIdHash, issuerIdHash, role: 'security', assuranceLevel: 'aal3',
  evidenceHash: attestation.evidenceHash, signatureEnvelopeFingerprint: h('identity-signature'),
  trustBundleFingerprint: trustBundle.bundleFingerprint, verifiedOffline: true,
  directIdentifiersStored: false, rawAttestationStored: false,
  rawSignatureStored: false, privateKeyMaterialPresent: false,
  networkRequests: 0, databaseConnections: 0,
  remoteIdentityProviderContacted: false, productionAllowed: false
};

let positives = 0; let negatives = 0;
function pass(name, fn) { fn(); positives += 1; assert(fixture.positiveCases.includes(name), 'missing positive fixture: ' + name); }
function reject(name, code, fn) {
  let error = null; try { fn(); } catch (caught) { error = caught; }
  assert(error, name + ' did not reject'); assert.equal(error.code, code, name + ' error code');
  negatives += 1; assert(fixture.negativeCases.includes(name), 'missing negative fixture: ' + name);
}

pass('issuer_record_valid', () => contract.validateIssuerRecord(record, trustBundle));
pass('lifecycle_chain_valid', () => assert.equal(contract.validateIssuerLifecycleChain(record, lifecycle, trustBundle).currentStatus, 'retired'));
pass('ed25519_status_snapshot_valid', () => assert.equal(verifiedActive.issuerStatus, 'active'));
pass('rsa_pss_status_snapshot_valid', () => {
  const snapshot = makeSnapshot(activeEvent, { snapshotId: 'status-snapshot-rsa' });
  const envelope = makeEnvelope(snapshot, trustBundle.roots[1], rsa.privateKey);
  assert.equal(contract.verifyIssuerStatusSnapshot(snapshot, envelope, trustBundle, record, activeEvent, { now }).verifiedOffline, true);
});
pass('active_credential_accepted', () => assert.equal(contract.acceptIdentityCredential(attestation, verifiedIdentity, record, verifiedActive, { now }).accepted, true));
pass('suspended_credential_invalidated', () => assert.equal(contract.buildCredentialInvalidationReceipt(attestation, record, verifiedSuspended, { now }).reason, 'issuer_suspended'));
pass('stale_snapshot_invalidated', () => {
  const stale = { ...verifiedActive, validUntil: '2026-08-04T09:59:00.000Z' };
  assert.equal(contract.buildCredentialInvalidationReceipt(attestation, record, stale, { now }).staleCredentialInvalidated, true);
});
pass('retention_handoff_valid', () => {
  const handoff = contract.buildAuditRetentionHandoff(record, [
    { artifactType: 'issuer_record', artifactHash: record.recordFingerprint },
    { artifactType: 'issuer_lifecycle_event', artifactHash: activeEvent.eventHash }
  ], { handoffId: 'retention-handoff-alpha', createdAt: '2026-08-04T10:00:00.000Z', retentionUntil: '2033-08-04T10:00:00.000Z', legalHold: true });
  contract.validateAuditRetentionHandoff(handoff);
});

reject('record_unknown_field', 'DOKE_PAY_A15_ISSUER_RECORD_INVALID', () => contract.validateIssuerRecord({ ...record, rawEmail: 'x' }, trustBundle));
reject('record_trust_bundle_mismatch', 'DOKE_PAY_A15_TRUST_BUNDLE_MISMATCH', () => { const r = finalizeRecord({ ...record, trustBundleFingerprint: h('wrong') }); contract.validateIssuerRecord(r, trustBundle); });
reject('record_duplicate_role', 'DOKE_PAY_A15_DUPLICATE_ROLE_DENIED', () => { const r = finalizeRecord({ ...record, allowedRoles: ['security', 'security'] }); contract.validateIssuerRecord(r, trustBundle); });
reject('record_initial_status_invalid', 'DOKE_PAY_A15_INITIAL_STATUS_INVALID', () => { const r = finalizeRecord({ ...record, initialStatus: 'active' }); contract.validateIssuerRecord(r, trustBundle); });
reject('record_review_window_too_long', 'DOKE_PAY_A15_REVIEW_WINDOW_INVALID', () => { const r = finalizeRecord({ ...record, reviewBy: '2027-08-01T00:00:00.000Z' }); contract.validateIssuerRecord(r, trustBundle); });
reject('record_production_denied', 'DOKE_PAY_A15_PRODUCTION_ISSUER_DENIED', () => { const r = finalizeRecord({ ...record, production: true }); contract.validateIssuerRecord(r, trustBundle); });
reject('record_direct_identifier_denied', 'DOKE_PAY_A15_DIRECT_IDENTIFIER_DENIED', () => { const r = finalizeRecord({ ...record, containsDirectIdentifiers: true }); contract.validateIssuerRecord(r, trustBundle); });
reject('record_repository_credentials_denied', 'DOKE_PAY_A15_REPOSITORY_CREDENTIAL_CUSTODY_DENIED', () => { const r = finalizeRecord({ ...record, repositoryManagedCredentials: true }); contract.validateIssuerRecord(r, trustBundle); });
reject('record_remote_authority_denied', 'DOKE_PAY_A15_REMOTE_AUTHORITY_DENIED', () => { const r = finalizeRecord({ ...record, remoteAuthorityGranted: true }); contract.validateIssuerRecord(r, trustBundle); });
reject('record_fingerprint_mismatch', 'DOKE_PAY_A15_ISSUER_RECORD_FINGERPRINT_MISMATCH', () => contract.validateIssuerRecord({ ...record, recordFingerprint: h('wrong') }, trustBundle));
reject('lifecycle_pending_to_suspended_denied', 'DOKE_PAY_A15_LIFECYCLE_TRANSITION_DENIED', () => contract.createIssuerLifecycleEvent(record, eventInput(1, null, 'pending', 'suspended', 'security_incident', 'bad'), { trustBundle }));
reject('lifecycle_onboarding_reason_required', 'DOKE_PAY_A15_ONBOARDING_REASON_REQUIRED', () => contract.createIssuerLifecycleEvent(record, eventInput(1, null, 'pending', 'active', 'periodic_review_passed', 'badreason'), { trustBundle }));
reject('lifecycle_sequence_gap', 'DOKE_PAY_A15_LIFECYCLE_SEQUENCE_GAP', () => contract.createIssuerLifecycleEvent(record, eventInput(3, activeEvent, 'active', 'suspended', 'security_incident', 'gap'), { trustBundle, previousEvent: activeEvent }));
reject('lifecycle_wrong_issuer', 'DOKE_PAY_A15_LIFECYCLE_ISSUER_MISMATCH', () => contract.createIssuerLifecycleEvent(record, { ...eventInput(1, null, 'pending', 'active', 'onboarding_approved', 'issuer'), issuerIdHash: h('other') }, { trustBundle }));
reject('lifecycle_previous_hash_mismatch', 'DOKE_PAY_A15_PREVIOUS_EVENT_HASH_MISMATCH', () => contract.createIssuerLifecycleEvent(record, { ...eventInput(2, activeEvent, 'active', 'suspended', 'security_incident', 'hash'), previousEventHash: h('wrong') }, { trustBundle, previousEvent: activeEvent }));
reject('lifecycle_status_gap', 'DOKE_PAY_A15_LIFECYCLE_STATUS_GAP', () => contract.createIssuerLifecycleEvent(record, eventInput(2, activeEvent, 'suspended', 'active', 'remediation_complete', 'statusgap'), { trustBundle, previousEvent: activeEvent }));
reject('lifecycle_event_replay', 'DOKE_PAY_A15_LIFECYCLE_EVENT_REPLAYED', () => { const ledger = new Set([activeEvent.eventHash]); contract.createIssuerLifecycleEvent(record, eventInput(1, null, 'pending', 'active', 'onboarding_approved', 'activate'), { trustBundle, eventLedger: ledger, chainHeadByIssuer: new Map() }); });
reject('lifecycle_chain_fork', 'DOKE_PAY_A15_LIFECYCLE_CHAIN_FORK_DENIED', () => { const heads = new Map([[issuerIdHash, suspendedEvent.eventHash]]); contract.createIssuerLifecycleEvent(record, eventInput(2, activeEvent, 'active', 'retired', 'contract_ended', 'fork'), { trustBundle, previousEvent: activeEvent, chainHeadByIssuer: heads }); });
reject('lifecycle_terminal_revoked_transition', 'DOKE_PAY_A15_LIFECYCLE_TRANSITION_DENIED', () => { const revoked = buildChain([['pending','active','onboarding_approved','ra'],['active','revoked','key_compromise','rr']]); contract.createIssuerLifecycleEvent(record, eventInput(3, revoked[1], 'revoked', 'active', 'remediation_complete', 'terminal'), { trustBundle, previousEvent: revoked[1] }); });
reject('snapshot_status_mismatch', 'DOKE_PAY_A15_STATUS_VALUE_MISMATCH', () => { const s = makeSnapshot(activeEvent, { issuerStatus: 'suspended' }); const e = makeEnvelope(s, trustBundle.roots[0], ed.privateKey); contract.verifyIssuerStatusSnapshot(s,e,trustBundle,record,activeEvent,{now}); });
reject('snapshot_event_mismatch', 'DOKE_PAY_A15_STATUS_EVENT_MISMATCH', () => { const s = makeSnapshot(activeEvent, { lifecycleEventHash: h('wrong') }); const e = makeEnvelope(s, trustBundle.roots[0], ed.privateKey); contract.verifyIssuerStatusSnapshot(s,e,trustBundle,record,activeEvent,{now}); });
reject('snapshot_window_too_long', 'DOKE_PAY_A15_STATUS_WINDOW_INVALID', () => { const s = makeSnapshot(activeEvent, { validUntil: '2026-08-04T11:00:00.000Z' }); const e = makeEnvelope(s, trustBundle.roots[0], ed.privateKey); contract.verifyIssuerStatusSnapshot(s,e,trustBundle,record,activeEvent,{now}); });
reject('snapshot_stale', 'DOKE_PAY_A15_STATUS_SNAPSHOT_STALE', () => { const s = makeSnapshot(activeEvent, { observedAt: '2026-08-04T09:00:00.000Z', validUntil: '2026-08-04T09:10:00.000Z' }); const e = makeEnvelope(s, trustBundle.roots[0], ed.privateKey); contract.verifyIssuerStatusSnapshot(s,e,trustBundle,record,activeEvent,{now}); });
reject('snapshot_production_denied', 'DOKE_PAY_A15_PRODUCTION_STATUS_DENIED', () => { const s = makeSnapshot(activeEvent, { production: true }); const e = makeEnvelope(s, trustBundle.roots[0], ed.privateKey); contract.verifyIssuerStatusSnapshot(s,e,trustBundle,record,activeEvent,{now}); });
reject('snapshot_direct_identifier_denied', 'DOKE_PAY_A15_DIRECT_IDENTIFIER_DENIED', () => { const s = makeSnapshot(activeEvent, { containsDirectIdentifiers: true }); const e = makeEnvelope(s, trustBundle.roots[0], ed.privateKey); contract.verifyIssuerStatusSnapshot(s,e,trustBundle,record,activeEvent,{now}); });
reject('snapshot_fingerprint_mismatch', 'DOKE_PAY_A15_STATUS_FINGERPRINT_MISMATCH', () => { const s = { ...activeSnapshot, snapshotFingerprint: h('wrong') }; contract.verifyIssuerStatusSnapshot(s,activeEnvelope,trustBundle,record,activeEvent,{now}); });
reject('signature_signer_mismatch', 'DOKE_PAY_A15_STATUS_SIGNER_MISMATCH', () => { const e = makeEnvelope(activeSnapshot, trustBundle.roots[0], ed.privateKey, { signerIdHash: h('other') }); contract.verifyIssuerStatusSnapshot(activeSnapshot,e,trustBundle,record,activeEvent,{now}); });
reject('signature_signed_at_mismatch', 'DOKE_PAY_A15_STATUS_SIGNED_AT_MISMATCH', () => { const e = makeEnvelope(activeSnapshot, trustBundle.roots[0], ed.privateKey, { signedAt: '2026-08-04T09:56:00.000Z' }); contract.verifyIssuerStatusSnapshot(activeSnapshot,e,trustBundle,record,activeEvent,{now}); });
reject('signature_bundle_mismatch', 'DOKE_PAY_A15_STATUS_SIGNATURE_BUNDLE_MISMATCH', () => { const e = makeEnvelope(activeSnapshot, trustBundle.roots[0], ed.privateKey, { trustBundleFingerprint: h('wrong') }); contract.verifyIssuerStatusSnapshot(activeSnapshot,e,trustBundle,record,activeEvent,{now}); });
reject('signature_root_missing', 'DOKE_PAY_A15_STATUS_TRUST_ROOT_NOT_FOUND', () => { const e = makeEnvelope(activeSnapshot, trustBundle.roots[0], ed.privateKey, { keyId: 'missing-root-a15' }); contract.verifyIssuerStatusSnapshot(activeSnapshot,e,trustBundle,record,activeEvent,{now}); });
reject('signature_root_revoked', 'DOKE_PAY_A15_STATUS_TRUST_ROOT_REVOKED', () => { const b = clone(trustBundle); b.roots[0].status='revoked'; b.roots[0].revokedAt='2026-08-04T09:00:00.000Z'; finalizeTrustBundle(b); const r=finalizeRecord({...record,trustBundleFingerprint:b.bundleFingerprint}); const s=makeSnapshot(activeEvent,{issuerRecordFingerprint:r.recordFingerprint,trustBundleFingerprint:b.bundleFingerprint}); const e=makeEnvelope(s,b.roots[0],ed.privateKey,{trustBundleFingerprint:b.bundleFingerprint}); contract.verifyIssuerStatusSnapshot(s,e,b,r,activeEvent,{now}); });
reject('signature_scheme_mismatch', 'DOKE_PAY_A15_STATUS_SIGNATURE_SCHEME_MISMATCH', () => { const e = makeEnvelope(activeSnapshot, trustBundle.roots[0], ed.privateKey, { signatureScheme: 'rsa_pss_sha256' }); contract.verifyIssuerStatusSnapshot(activeSnapshot,e,trustBundle,record,activeEvent,{now}); });
reject('signature_purpose_not_allowed', 'DOKE_PAY_A15_STATUS_PURPOSE_NOT_ALLOWED', () => { const b=clone(trustBundle); b.roots[0].allowedPurposes=['identity_attestation']; finalizeTrustBundle(b); const r=finalizeRecord({...record,trustBundleFingerprint:b.bundleFingerprint}); const s=makeSnapshot(activeEvent,{issuerRecordFingerprint:r.recordFingerprint,trustBundleFingerprint:b.bundleFingerprint}); const e=makeEnvelope(s,b.roots[0],ed.privateKey,{trustBundleFingerprint:b.bundleFingerprint}); contract.verifyIssuerStatusSnapshot(s,e,b,r,activeEvent,{now}); });
reject('signature_signer_not_allowed', 'DOKE_PAY_A15_STATUS_SIGNER_NOT_ALLOWED', () => { const b=clone(trustBundle); b.roots[0].allowedSignerIdHashes=[h('other')]; finalizeTrustBundle(b); const r=finalizeRecord({...record,trustBundleFingerprint:b.bundleFingerprint}); const s=makeSnapshot(activeEvent,{issuerRecordFingerprint:r.recordFingerprint,trustBundleFingerprint:b.bundleFingerprint}); const e=makeEnvelope(s,b.roots[0],ed.privateKey,{trustBundleFingerprint:b.bundleFingerprint}); contract.verifyIssuerStatusSnapshot(s,e,b,r,activeEvent,{now}); });
reject('signature_payload_hash_mismatch', 'DOKE_PAY_A15_STATUS_PAYLOAD_HASH_MISMATCH', () => { const e=makeEnvelope(activeSnapshot,trustBundle.roots[0],ed.privateKey,{signedPayloadHash:h('wrong')}); contract.verifyIssuerStatusSnapshot(activeSnapshot,e,trustBundle,record,activeEvent,{now}); });
reject('signature_hash_mismatch', 'DOKE_PAY_A15_STATUS_SIGNATURE_HASH_MISMATCH', () => { const e=makeEnvelope(activeSnapshot,trustBundle.roots[0],ed.privateKey,{signatureHash:h('wrong')}); contract.verifyIssuerStatusSnapshot(activeSnapshot,e,trustBundle,record,activeEvent,{now}); });
reject('signature_crypto_invalid', 'DOKE_PAY_A15_STATUS_SIGNATURE_VERIFICATION_FAILED', () => { const e=makeEnvelope(activeSnapshot,trustBundle.roots[0],ed.privateKey); e.signatureBase64=Buffer.from('invalid-signature').toString('base64'); e.signatureHash=h(Buffer.from('invalid-signature')); e.envelopeFingerprint=contract.computeStatusSignatureFingerprint(e); contract.verifyIssuerStatusSnapshot(activeSnapshot,e,trustBundle,record,activeEvent,{now}); });
reject('snapshot_replay', 'DOKE_PAY_A15_STATUS_SNAPSHOT_REPLAYED', () => { const snapshots=new Set([activeSnapshot.snapshotFingerprint]); contract.verifyIssuerStatusSnapshot(activeSnapshot,activeEnvelope,trustBundle,record,activeEvent,{now,snapshotLedger:snapshots}); });
reject('signature_replay', 'DOKE_PAY_A15_STATUS_SIGNATURE_REPLAYED', () => { const signatures=new Set([activeEnvelope.envelopeFingerprint]); contract.verifyIssuerStatusSnapshot(activeSnapshot,activeEnvelope,trustBundle,record,activeEvent,{now,signatureLedger:signatures}); });
reject('credential_verified_identity_required', 'DOKE_PAY_A15_VERIFIED_IDENTITY_REQUIRED', () => contract.acceptIdentityCredential(attestation,{...verifiedIdentity,verifiedOffline:false},record,verifiedActive,{now}));
reject('credential_attestation_mismatch', 'DOKE_PAY_A15_IDENTITY_ATTESTATION_MISMATCH', () => contract.acceptIdentityCredential(attestation,{...verifiedIdentity,attestationFingerprint:h('wrong')},record,verifiedActive,{now}));
reject('credential_issuer_mismatch', 'DOKE_PAY_A15_CREDENTIAL_ISSUER_MISMATCH', () => contract.acceptIdentityCredential({...attestation,issuerIdHash:h('other')},verifiedIdentity,record,verifiedActive,{now}));
reject('credential_subject_mismatch', 'DOKE_PAY_A15_CREDENTIAL_SUBJECT_MISMATCH', () => contract.acceptIdentityCredential(attestation,{...verifiedIdentity,subjectIdHash:h('other')},record,verifiedActive,{now}));
reject('credential_role_denied', 'DOKE_PAY_A15_CREDENTIAL_ROLE_DENIED', () => contract.acceptIdentityCredential(attestation,verifiedIdentity,{...record,allowedRoles:['finance_operations']},verifiedActive,{now}));
reject('credential_assurance_denied', 'DOKE_PAY_A15_CREDENTIAL_ASSURANCE_DENIED', () => contract.acceptIdentityCredential(attestation,verifiedIdentity,{...record,allowedAssuranceLevels:['aal2']},verifiedActive,{now}));
reject('credential_issuer_not_active', 'DOKE_PAY_A15_ISSUER_NOT_ACTIVE', () => contract.acceptIdentityCredential(attestation,verifiedIdentity,record,verifiedSuspended,{now}));
reject('credential_status_stale', 'DOKE_PAY_A15_STATUS_SNAPSHOT_STALE', () => contract.acceptIdentityCredential(attestation,verifiedIdentity,record,{...verifiedActive,validUntil:'2026-08-04T09:59:00.000Z'},{now}));
reject('credential_newer_than_status', 'DOKE_PAY_A15_CREDENTIAL_NEWER_THAN_STATUS', () => contract.acceptIdentityCredential({...attestation,issuedAt:'2026-08-04T09:56:00.000Z'},verifiedIdentity,record,verifiedActive,{now}));
reject('credential_expired', 'DOKE_PAY_A15_CREDENTIAL_EXPIRED', () => contract.acceptIdentityCredential({...attestation,expiresAt:'2026-08-04T09:59:00.000Z'},verifiedIdentity,record,verifiedActive,{now}));
reject('credential_invalidation_not_required', 'DOKE_PAY_A15_INVALIDATION_NOT_REQUIRED', () => contract.buildCredentialInvalidationReceipt(attestation,record,verifiedActive,{now}));
reject('retention_artifacts_required', 'DOKE_PAY_A15_RETENTION_ARTIFACTS_REQUIRED', () => contract.buildAuditRetentionHandoff(record,[],{handoffId:'retention-empty',createdAt:now,retentionUntil:'2033-08-04T10:00:00.000Z'}));
reject('retention_artifact_type_invalid', 'DOKE_PAY_A15_RETENTION_ARTIFACT_TYPE_INVALID', () => contract.buildAuditRetentionHandoff(record,[{artifactType:'raw_identity',artifactHash:h('x')}],{handoffId:'retention-type',createdAt:now,retentionUntil:'2033-08-04T10:00:00.000Z'}));
reject('retention_duplicate_artifact', 'DOKE_PAY_A15_DUPLICATE_RETENTION_ARTIFACT_DENIED', () => { const a={artifactType:'issuer_record',artifactHash:record.recordFingerprint}; contract.buildAuditRetentionHandoff(record,[a,a],{handoffId:'retention-duplicate',createdAt:now,retentionUntil:'2033-08-04T10:00:00.000Z'}); });
reject('retention_window_too_short', 'DOKE_PAY_A15_RETENTION_WINDOW_TOO_SHORT', () => contract.buildAuditRetentionHandoff(record,[{artifactType:'issuer_record',artifactHash:record.recordFingerprint}],{handoffId:'retention-short',createdAt:now,retentionUntil:'2027-08-04T10:00:00.000Z'}));
reject('retention_raw_identity_denied', 'DOKE_PAY_A15_RETENTION_AUTHORITY_ESCALATION', () => { const x=contract.buildAuditRetentionHandoff(record,[{artifactType:'issuer_record',artifactHash:record.recordFingerprint}],{handoffId:'retention-raw',createdAt:now,retentionUntil:'2033-08-04T10:00:00.000Z'}); contract.validateAuditRetentionHandoff({...x,rawIdentityDataIncluded:true}); });
reject('retention_fingerprint_mismatch', 'DOKE_PAY_A15_RETENTION_FINGERPRINT_MISMATCH', () => { const x=contract.buildAuditRetentionHandoff(record,[{artifactType:'issuer_record',artifactHash:record.recordFingerprint}],{handoffId:'retention-hash',createdAt:now,retentionUntil:'2033-08-04T10:00:00.000Z'}); contract.validateAuditRetentionHandoff({...x,handoffFingerprint:h('wrong')}); });

assert.equal(positives, fixture.positiveCases.length);
assert.equal(negatives, fixture.negativeCases.length);
assert.equal(positives + negatives, fixture.totalCases);
console.log(`PAY-A15 identity issuer lifecycle conformance passed: ${positives + negatives}/${fixture.totalCases}.`);
