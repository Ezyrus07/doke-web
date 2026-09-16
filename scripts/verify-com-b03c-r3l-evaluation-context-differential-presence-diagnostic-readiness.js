#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const r3l = require('../backend/modules/communities/community-realtime-private-auth-r3l');

function fail(code) {
  throw new Error(code);
}

function exactCases(report) {
  const ids = report.executionCaseIds || report.caseIds;
  return Array.isArray(ids) && JSON.stringify(ids) === JSON.stringify(r3l.EXECUTION_CASE_IDS);
}

function verifyRepository(report) {
  if (report.validationId !== 'COM-B03C-R3L-REPOSITORY-SELF-TEST') fail('DOKE_COM_B03C_R3L_VERIFY_VALIDATION_ID_MISMATCH');
  if (report.differentialProbeCount !== 16 || report.totalExecutionCaseCount !== 17 || !exactCases(report)) fail('DOKE_COM_B03C_R3L_VERIFY_CASE_MATRIX_MISMATCH');
  if (report.authorizationContractPositivePathVerified !== true) fail('DOKE_COM_B03C_R3L_VERIFY_AUTHORIZATION_CONTRACT_MISSING');
  if (report.credentialReadsBeforeAuthorization !== 0 || report.dependencyLoadsBeforeAuthorization !== 0) fail('DOKE_COM_B03C_R3L_VERIFY_PREAUTH_SIDE_EFFECT');
  if (report.stagingAccess !== false || report.networkAccess !== false || report.triggerExists !== false) fail('DOKE_COM_B03C_R3L_VERIFY_REPOSITORY_ONLY_BROKEN');
  if (report.authorizationPhraseReceived !== false || report.authorizationPhraseConsumed !== false) fail('DOKE_COM_B03C_R3L_VERIFY_AUTHORIZATION_PREMATURE');
}

function verifyRemote(report) {
  if (report.validationId !== 'COM-B03C-R3L-EVALUATION-CONTEXT-DIFFERENTIAL-PRESENCE-STAGING-REPORT') fail('DOKE_COM_B03C_R3L_VERIFY_REMOTE_VALIDATION_ID_MISMATCH');
  if (report.runAttempt !== 1 || !/^[a-f0-9]{40}$/.test(String(report.headSha || '')) || !/^[a-f0-9]{40}$/.test(String(report.workflowInstallHead || ''))) fail('DOKE_COM_B03C_R3L_VERIFY_REMOTE_CONTINUITY_INVALID');
  if (report.differentialProbeCount !== 16 || report.totalExecutionCaseCount !== 17 || !exactCases(report)) fail('DOKE_COM_B03C_R3L_VERIFY_REMOTE_CASE_MATRIX_MISMATCH');
  if (report.structuralGateCount !== 17) fail('DOKE_COM_B03C_R3L_VERIFY_REMOTE_STRUCTURAL_GATE_COUNT_MISMATCH');
  if (!Array.isArray(report.caseResults) || report.caseResults.length !== 17) fail('DOKE_COM_B03C_R3L_VERIFY_REMOTE_RESULTS_MISSING');
  if (report.caseResults.some((item) => item.structuralEvidence?.evidenceComplete !== true || item.rawRemoteErrorExposed !== false)) fail('DOKE_COM_B03C_R3L_VERIFY_REMOTE_STRUCTURAL_EVIDENCE_INVALID');
  if (report.policyResidue?.zeroResidue !== true || report.identityResidue?.zeroResidue !== true || report.zeroResidueProven !== true) fail('DOKE_COM_B03C_R3L_VERIFY_REMOTE_ZERO_RESIDUE_REQUIRED');
  if (report.executionFailure != null) fail('DOKE_COM_B03C_R3L_VERIFY_REMOTE_EXECUTION_FAILURE');
}

function verify(report) {
  if (!report || report.contractId !== r3l.CONTRACT_ID) fail('DOKE_COM_B03C_R3L_VERIFY_CONTRACT_MISMATCH');
  if (report.exactRootCauseProven !== false || report.causalPromotionAllowed !== false) fail('DOKE_COM_B03C_R3L_VERIFY_CAUSAL_PROMOTION_INVALID');
  if (report.rawRemoteErrorExposed === true) fail('DOKE_COM_B03C_R3L_VERIFY_RAW_REMOTE_ERROR_EXPOSED');
  if (report.validationId === 'COM-B03C-R3L-REPOSITORY-SELF-TEST') verifyRepository(report);
  else verifyRemote(report);
  return true;
}

if (require.main === module) {
  try {
    const file = process.argv[2];
    if (!file) fail('DOKE_COM_B03C_R3L_VERIFY_REPORT_PATH_REQUIRED');
    verify(JSON.parse(fs.readFileSync(file, 'utf8')));
    process.stdout.write('COM-B03C-R3L report verified\n');
  } catch (error) {
    process.stderr.write(`${String(error?.message || error)}\n`);
    process.exitCode = 1;
  }
}

module.exports = { verify, verifyRepository, verifyRemote };
