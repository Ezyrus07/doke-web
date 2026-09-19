#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTRACT_PATH = path.join(ROOT, 'config/professional-kyc-policy-decision-contract.json');
const fail = (message) => {
  console.error('[PROF-B04] ' + message);
  process.exitCode = 1;
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
const migrationPath = path.join(ROOT, 'supabase/migrations/20260919005500_professional_kyc_retention_policy_authority.sql');
const validationPath = path.join(ROOT, 'supabase/tests/034_professional_kyc_retention_policy_validation.sql');
assert(fs.existsSync(migrationPath), 'sealed G6 retention migration is missing');
assert(fs.existsSync(validationPath), 'PROF-B04 validation 034 is missing');
const migration = fs.readFileSync(migrationPath, 'utf8');
const validation = fs.readFileSync(validationPath, 'utf8');
const expectedClasses = [
  'abandoned_signed_intent',
  'rejected_submission_evidence',
  'verified_submission_evidence',
  'reopened_historical_evidence'
];

assert(contract.schemaVersion === 1, 'schemaVersion must remain 1 until an explicit contract migration exists');
assert(contract.policyKey === 'professional_kyc_policy', 'policyKey changed unexpectedly');
assert(['awaiting_legal_approval', 'approved'].includes(contract.status), 'invalid policy status');
assert(Array.isArray(contract.blockers), 'blockers must be an array');
assert(contract.implementationBoundary?.noDefaultRetentionInterval === true, 'default retention intervals are prohibited');
assert(contract.implementationBoundary?.noPhysicalDeleteBeforeApproval === true, 'physical delete must remain approval-gated');
assert(migration.includes("retention_mode in ('delete_at_termination','elapsed_interval','hold_only')"), 'G6 retention modes diverge from policy-decision contract');
assert(migration.includes("'POLICY_TERMINATION_TECHNICAL_ALLOW'::text"), 'G6 delete-at-termination technical gate is missing');
assert(migration.includes("'PROF_B05_G7_PHYSICAL_GC'::text"), 'G6 must delegate execution to the separate G7 gate');
for (const marker of [
  'legal_approval_reference text',
  'privacy_approval_reference text',
  'legal_hold_policy_reference text',
  'provider_terms_reference text',
  'international_transfer_decision_reference text',
  'sensitive_data_legal_basis_reference text',
  'risk_assessment_reference text',
]) assert(migration.includes(marker), 'G6 governance field missing: ' + marker);
assert(!migration.toLowerCase().includes('delete from storage.objects'), 'G6 must never delete directly from storage.objects');
assert(!migration.toLowerCase().includes('storage.from('), 'G6 must never contain a Storage API delete path');
assert(!migration.includes('claim_token'), 'G6 must not introduce physical-GC claim authority');
assert(!migration.includes('lease_expires_at'), 'G6 must not introduce physical-GC lease authority');
for (const marker of [
  'PROF_B04_DELETE_AT_TERMINATION_INTERVAL_ALLOWED',
  'PROF_B04_TERMINATION_FUTURE_ANCHOR_INVALID',
  'PROF_B04_DELETE_AT_TERMINATION_GATE_INVALID',
  'PROF_B04_GOVERNANCE_WITHOUT_LEGAL_PRIVACY_APPROVAL_ALLOWED',
  'PROF_B04_EXTERNAL_PROVIDER_WITHOUT_TERMS_TRANSFER_ALLOWED',
  'PROF_B04_BIOMETRIC_APPROVAL_WITHOUT_SENSITIVE_BASIS_ALLOWED',
  'PROF_B04_BIOMETRIC_APPROVAL_WITHOUT_RISK_ASSESSMENT_ALLOWED',
  'PROF_B04_PHYSICAL_GC_AUTHORITY_DETECTED',
]) assert(validation.includes(marker), '034 validation missing: ' + marker);

const classes = Array.isArray(contract.evidenceClasses) ? contract.evidenceClasses : [];
assert(
  JSON.stringify(classes.map((item) => item.key).sort()) === JSON.stringify(expectedClasses.slice().sort()),
  'KYC evidence class inventory changed without contract review'
);

const allowedModes = new Set(['delete_at_termination', 'elapsed_interval', 'hold_only']);

for (const item of classes) {
  assert(typeof item.key === 'string' && item.key.length > 0, 'evidence class key missing');
  if (item.retentionMode !== null) {
    assert(allowedModes.has(item.retentionMode), item.key + ': invalid retentionMode');
  }
  if (item.retentionMode === 'elapsed_interval') {
    assert(typeof item.retentionInterval === 'string' && /^P(?!$)/.test(item.retentionInterval), item.key + ': ISO-8601 retentionInterval required');
    assert(typeof item.conservationBasisRef === 'string' && item.conservationBasisRef.length > 0, item.key + ': conservation basis required for interval retention');
  } else {
    assert(item.retentionInterval === null, item.key + ': retentionInterval must be null unless elapsed_interval is approved');
  }
}

const approved = contract.status === 'approved';
if (!approved) {
  assert(contract.blockers.includes('PROF-B04') && contract.blockers.includes('LEGAL-B03'), 'PROF-B04/LEGAL-B03 blockers must remain explicit before approval');
  assert(contract.activation?.retentionAuthority === 'blocked', 'retention authority must remain blocked before approval');
  assert(contract.activation?.physicalGc === 'blocked', 'physical GC must remain blocked before approval');
  assert(contract.activation?.externalProvider === 'blocked', 'external provider must remain blocked before approval');
  assert(contract.implementationBoundary?.g6RetentionPolicyMigrationAllowed === false, 'G6 must remain sealed before approval');
  assert(contract.implementationBoundary?.g7PhysicalGcAllowed === false, 'G7 must remain sealed before approval');

  for (const item of classes) {
    assert(item.retentionMode === null, item.key + ': retention mode cannot be preselected before legal/privacy approval');
    assert(item.retentionInterval === null, item.key + ': retention interval cannot be invented before approval');
  }
} else {
  for (const approvalKey of ['legal', 'privacy']) {
    const approval = contract.approvals?.[approvalKey];
    assert(approval?.state === 'approved', approvalKey + ': approval state missing');
    assert(typeof approval?.approvedVersion === 'string' && approval.approvedVersion.length > 0, approvalKey + ': approvedVersion missing');
    assert(typeof approval?.approvedAt === 'string' && !Number.isNaN(Date.parse(approval.approvedAt)), approvalKey + ': approvedAt invalid');
    assert(typeof approval?.approverRef === 'string' && approval.approverRef.length > 0, approvalKey + ': approverRef missing');
    assert(typeof approval?.sourceDocumentRef === 'string' && approval.sourceDocumentRef.length > 0, approvalKey + ': sourceDocumentRef missing');
  }

  assert(['approved_provider', 'no_external_provider'].includes(contract.provider?.decision), 'provider decision must be explicit');
  if (contract.provider?.decision === 'approved_provider') {
    assert(typeof contract.provider?.providerRef === 'string' && contract.provider.providerRef.length > 0, 'providerRef missing');
    assert(typeof contract.provider?.processorTermsRef === 'string' && contract.provider.processorTermsRef.length > 0, 'processorTermsRef missing');
    assert(typeof contract.provider?.internationalTransferDecisionReference === 'string' && contract.provider.internationalTransferDecisionReference.length > 0, 'international transfer decision reference missing');
  }
  assert(['image_only', 'biometric_processing'].includes(contract.selfieAndBiometrics?.treatmentMode), 'selfie/biometric treatment mode must be explicit');
  if (contract.selfieAndBiometrics?.treatmentMode === 'biometric_processing') {
    assert(contract.selfieAndBiometrics?.biometricExtractionAllowed === true, 'biometric extraction approval missing');
    assert(typeof contract.selfieAndBiometrics?.sensitiveDataLegalBasisRef === 'string' && contract.selfieAndBiometrics.sensitiveDataLegalBasisRef.length > 0, 'sensitive-data legal basis missing');
    assert(typeof contract.selfieAndBiometrics?.riskAssessmentRef === 'string' && contract.selfieAndBiometrics.riskAssessmentRef.length > 0, 'biometric risk assessment missing');
  }

  assert(contract.rejectionAndAppeal?.decision === 'approved', 'rejection/appeal policy must be approved');
  assert(typeof contract.rejectionAndAppeal?.appealAllowed === 'boolean', 'appealAllowed must be decided');
  assert(contract.legalHold?.decision === 'approved', 'legal-hold policy must be approved');
  assert(typeof contract.legalHold?.policyReference === 'string' && contract.legalHold.policyReference.length > 0, 'legal-hold policy reference missing');
  assert(typeof contract.legalHold?.enabled === 'boolean', 'legal-hold enabled flag must be decided');

  for (const item of classes) {
    assert(typeof item.terminationAnchor === 'string' && item.terminationAnchor.length > 0, item.key + ': terminationAnchor missing');
    assert(allowedModes.has(item.retentionMode), item.key + ': approved retentionMode missing');
    assert(typeof item.deletionRuleRef === 'string' && item.deletionRuleRef.length > 0, item.key + ': deletionRuleRef missing');
    assert(typeof item.legalHoldApplicability === 'boolean', item.key + ': legalHoldApplicability must be decided');
    if (item.retentionMode !== 'delete_at_termination') {
      assert(typeof item.conservationBasisRef === 'string' && item.conservationBasisRef.length > 0, item.key + ': conservation basis missing');
    }
  }

  assert(!contract.blockers.includes('PROF-B04') && !contract.blockers.includes('LEGAL-B03'), 'resolved PROF-B04/LEGAL-B03 blockers must be cleared after approval');
  assert(contract.activation?.retentionAuthority === 'approved', 'retention authority must be approved after policy approval');
  assert(contract.implementationBoundary?.g6RetentionPolicyMigrationAllowed === true, 'G6 must be explicitly authorized after policy approval');

  const g7 = contract.g7ExecutionAuthorization;
  assert(g7 && ['blocked', 'approved'].includes(g7.state), 'G7 execution authorization state is invalid');
  if (g7.state === 'approved') {
    assert(contract.implementationBoundary?.g7PhysicalGcAllowed === true, 'G7 allowed flag requires approved execution authorization');
    assert(contract.activation?.physicalGc === 'authorized', 'physicalGc activation must be authorized when G7 is approved');
    assert(typeof g7.approvedAt === 'string' && !Number.isNaN(Date.parse(g7.approvedAt)), 'G7 approvedAt invalid');
    assert(typeof g7.approvalRef === 'string' && g7.approvalRef.length > 0, 'G7 approvalRef missing');
    assert(typeof g7.dryRunEvidenceRef === 'string' && g7.dryRunEvidenceRef.length > 0, 'G7 dryRunEvidenceRef missing');
    assert(typeof g7.operatorReviewRef === 'string' && g7.operatorReviewRef.length > 0, 'G7 operatorReviewRef missing');
  } else {
    assert(contract.implementationBoundary?.g7PhysicalGcAllowed === false, 'G7 must remain blocked until separate execution authorization');
    assert(contract.activation?.physicalGc === 'blocked', 'physicalGc must remain blocked without separate G7 authorization');
  }

  if (contract.provider?.decision === 'approved_provider') {
    assert(contract.activation?.externalProvider === 'approved', 'external provider activation must match approved provider decision');
  } else {
    assert(contract.activation?.externalProvider === 'not_applicable', 'external provider activation must be not_applicable when no provider is used');
  }
}

if (!process.exitCode) {
  console.log('[PROF-B04] KYC policy decision contract is valid and fail-closed.');
  console.log('[PROF-B04] status=' + contract.status);
  console.log('[PROF-B04] G6 allowed=' + String(contract.implementationBoundary.g6RetentionPolicyMigrationAllowed));
  console.log('[PROF-B04] G7 allowed=' + String(contract.implementationBoundary.g7PhysicalGcAllowed));
}
