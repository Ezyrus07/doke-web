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
const expectedClasses = [
  'abandoned_signed_intent',
  'rejected_submission_evidence',
  'verified_submission_evidence',
  'reopened_historical_evidence'
];

assert(contract.schemaVersion === 1, 'schemaVersion must remain 1 until an explicit contract migration exists');
assert(contract.policyKey === 'professional_kyc_policy', 'policyKey changed unexpectedly');
assert(['awaiting_legal_approval', 'approved'].includes(contract.status), 'invalid policy status');
assert(Array.isArray(contract.blockers) && contract.blockers.includes('PROF-B04') && contract.blockers.includes('LEGAL-B03'), 'PROF-B04/LEGAL-B03 blockers must remain explicit until approval');
assert(contract.implementationBoundary?.noDefaultRetentionInterval === true, 'default retention intervals are prohibited');
assert(contract.implementationBoundary?.noPhysicalDeleteBeforeApproval === true, 'physical delete must remain approval-gated');

const classes = Array.isArray(contract.evidenceClasses) ? contract.evidenceClasses : [];
assert(
  JSON.stringify(classes.map((item) => item.key).sort()) === JSON.stringify(expectedClasses.slice().sort()),
  'KYC evidence class inventory changed without contract review'
);

const allowedModes = new Set(['delete_at_termination', 'retain_for_interval', 'retain_until_legal_hold_release']);

for (const item of classes) {
  assert(typeof item.key === 'string' && item.key.length > 0, 'evidence class key missing');
  if (item.retentionMode !== null) {
    assert(allowedModes.has(item.retentionMode), item.key + ': invalid retentionMode');
  }
  if (item.retentionMode === 'retain_for_interval') {
    assert(typeof item.retentionInterval === 'string' && /^P(?!$)/.test(item.retentionInterval), item.key + ': ISO-8601 retentionInterval required');
    assert(typeof item.conservationBasisRef === 'string' && item.conservationBasisRef.length > 0, item.key + ': conservation basis required for interval retention');
  } else {
    assert(item.retentionInterval === null, item.key + ': retentionInterval must be null unless retain_for_interval is approved');
  }
}

const approved = contract.status === 'approved';
if (!approved) {
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
  assert(['image_only', 'biometric_processing'].includes(contract.selfieAndBiometrics?.treatmentMode), 'selfie/biometric treatment mode must be explicit');
  if (contract.selfieAndBiometrics?.treatmentMode === 'biometric_processing') {
    assert(contract.selfieAndBiometrics?.biometricExtractionAllowed === true, 'biometric extraction approval missing');
    assert(typeof contract.selfieAndBiometrics?.sensitiveDataLegalBasisRef === 'string' && contract.selfieAndBiometrics.sensitiveDataLegalBasisRef.length > 0, 'sensitive-data legal basis missing');
    assert(typeof contract.selfieAndBiometrics?.riskAssessmentRef === 'string' && contract.selfieAndBiometrics.riskAssessmentRef.length > 0, 'biometric risk assessment missing');
  }

  assert(contract.rejectionAndAppeal?.decision === 'approved', 'rejection/appeal policy must be approved');
  assert(typeof contract.rejectionAndAppeal?.appealAllowed === 'boolean', 'appealAllowed must be decided');
  assert(contract.legalHold?.decision === 'approved', 'legal-hold policy must be approved');
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

  assert(contract.implementationBoundary?.g6RetentionPolicyMigrationAllowed === true, 'G6 must be explicitly authorized after approval');
  assert(contract.implementationBoundary?.g7PhysicalGcAllowed === true, 'G7 must be explicitly authorized after approval');
}

if (!process.exitCode) {
  console.log('[PROF-B04] KYC policy decision contract is valid and fail-closed.');
  console.log('[PROF-B04] status=' + contract.status);
  console.log('[PROF-B04] G6 allowed=' + String(contract.implementationBoundary.g6RetentionPolicyMigrationAllowed));
  console.log('[PROF-B04] G7 allowed=' + String(contract.implementationBoundary.g7PhysicalGcAllowed));
}
