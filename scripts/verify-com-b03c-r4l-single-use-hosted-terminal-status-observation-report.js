#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const r4j = require('../backend/modules/communities/community-realtime-private-auth-r4j');
const r4l = require('../backend/modules/communities/community-realtime-private-auth-r4l');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function forbiddenKeys(value, found = []) {
  if (!value || typeof value !== 'object') return found;
  for (const [key, nested] of Object.entries(value)) {
    if (/^(?:accessToken|password|secretKey|publishableKey|authorizationPhrase)$/i.test(key)) found.push(key);
    forbiddenKeys(nested, found);
  }
  return found;
}

function verifyReport(report) {
  if (report?.reportSchema !== r4l.REPORT_SCHEMA || report?.contractId !== r4l.CONTRACT_ID ||
      report?.validationId !== 'COM-B03C-R4L-SINGLE-USE-HOSTED-TERMINAL-STATUS-OBSERVATION') {
    fail('DOKE_COM_B03C_R4L_REPORT_CONTRACT_INVALID');
  }
  if (report.target?.environment !== 'staging' || report.target?.projectId !== r4j.TARGET_STAGING_PROJECT ||
      report.target?.branch !== r4j.TARGET_BRANCH || report.target?.pullRequest !== r4j.TARGET_PR) {
    fail('DOKE_COM_B03C_R4L_REPORT_TARGET_INVALID');
  }
  if (report.singleUse !== true || report.reusableAfterFailure !== false || report.runAttempt !== 1 ||
      report.authorizationEvidenceHead !== r4l.AUTHORIZATION_EVIDENCE_HEAD ||
      report.authorizationReceiptId !== r4l.AUTHORIZATION_RECEIPT_ID ||
      !/^[0-9a-f]{40}$/.test(String(report.workflowInstallHead || '')) ||
      report.workflowInstallHead === report.authorizationEvidenceHead) {
    fail('DOKE_COM_B03C_R4L_REPORT_LINEAGE_INVALID');
  }
  if (report.r3vContractId !== r4l.EXECUTION_BINDING.r3vContractId ||
      report.statementFingerprint !== r4l.EXECUTION_BINDING.statementFingerprint ||
      report.statementCount !== r4l.EXECUTION_BINDING.statementCount ||
      report.ownershipDigest !== r4l.EXECUTION_BINDING.ownershipDigest) {
    fail('DOKE_COM_B03C_R4L_REPORT_EXECUTION_BINDING_INVALID');
  }
  if (report.rawOwnershipTokenPersisted !== false || report.authorizationPlaintextPersisted !== false ||
      report.credentialValuesPersisted !== false || report.rawAccessTokenPersisted !== false ||
      report.rawRemoteErrorExposed !== false || forbiddenKeys(report).length) {
    fail('DOKE_COM_B03C_R4L_REPORT_SECRET_HYGIENE_INVALID');
  }
  if (report.exactRootCauseProven !== false || report.causalPromotionAllowed !== false ||
      report.runtimePolicyChangeExecuted !== false || report.productionExecuted !== false ||
      report.mergeExecuted !== false) {
    fail('DOKE_COM_B03C_R4L_REPORT_AUTHORITY_INVARIANT_INVALID');
  }
  if (report.identityCreated === true &&
      (report.identityCleanupAttempted !== true || report.identityCleanupSucceeded !== true)) {
    fail('DOKE_COM_B03C_R4L_REPORT_IDENTITY_CLEANUP_REQUIRED');
  }
  if (report.instrumentationInstalled === true &&
      (report.cleanupAttempted !== true || report.zeroResidueProven !== true ||
       report.baselinePolicySnapshotComplete !== true || report.baselineRestored !== true ||
       report.residueCounts?.policyCount !== 0 || report.residueCounts?.functionCount !== 0 ||
       report.residueCounts?.sequenceCount !== 0)) {
    fail('DOKE_COM_B03C_R4L_REPORT_ZERO_RESIDUE_REQUIRED');
  }
  if (!report.executionFailure &&
      (report.hostedTerminalObservationExecuted !== true || !report.observation ||
       report.observation.rawRemoteErrorExposed !== false ||
       report.observation.exactRootCauseProven !== false ||
       report.observation.causalPromotionAllowed !== false)) {
    fail('DOKE_COM_B03C_R4L_REPORT_SUCCESS_EVIDENCE_INCOMPLETE');
  }
  if (report.executionFailure &&
      (typeof report.executionFailure.code !== 'string' || report.executionFailure.rawRemoteErrorExposed !== false)) {
    fail('DOKE_COM_B03C_R4L_REPORT_FAILURE_NOT_SANITIZED');
  }
  return Object.freeze({
    validationId: 'COM-B03C-R4L-SANITIZED-REPORT-VERIFICATION',
    contractId: r4l.CONTRACT_ID,
    reportSchema: r4l.REPORT_SCHEMA,
    authorizationEvidenceHead: r4l.AUTHORIZATION_EVIDENCE_HEAD,
    authorizationReceiptId: r4l.AUTHORIZATION_RECEIPT_ID,
    workflowInstallHead: report.workflowInstallHead,
    terminalStatus: report.terminalStatus,
    classification: report.observation?.classification || null,
    zeroResidueProven: report.zeroResidueProven === true,
    rawRemoteErrorExposed: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function readReport(reportPath) {
  if (!reportPath || !fs.existsSync(reportPath)) fail('DOKE_COM_B03C_R4L_REPORT_FILE_REQUIRED');
  try { return JSON.parse(fs.readFileSync(reportPath, 'utf8')); }
  catch { fail('DOKE_COM_B03C_R4L_REPORT_JSON_INVALID'); }
}

if (require.main === module) {
  try { process.stdout.write(`${JSON.stringify(verifyReport(readReport(process.argv[2])))}\n`); }
  catch (error) {
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R4L_VERIFY_FAILURE')}\n`);
    process.exitCode = 2;
  }
}

module.exports = { forbiddenKeys, verifyReport, readReport };
