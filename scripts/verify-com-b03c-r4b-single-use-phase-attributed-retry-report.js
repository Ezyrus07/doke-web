#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const r4b = require('../backend/modules/communities/community-realtime-private-auth-r4b');
const r3z = require('../backend/modules/communities/community-realtime-private-auth-r3z');
const r3v = require('../backend/modules/communities/community-realtime-private-auth-r3v');
const r3y = require('../backend/modules/communities/community-realtime-private-auth-r3y');

function fail(code) { const error = new Error(code); error.code = code; throw error; }

const FORBIDDEN_KEYS = Object.freeze([
  'accessToken', 'password', 'secretKey', 'publishableKey', 'dbPassword',
  'managementToken', 'authorizationPhrase', 'credentials', 'apiKeys',
  'rawError', 'rawRemoteError', 'cause'
]);

function inspectForbiddenKeys(value, path = '$', hits = []) {
  if (!value || typeof value !== 'object') return hits;
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectForbiddenKeys(item, `${path}[${index}]`, hits));
    return hits;
  }
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.includes(key)) hits.push(`${path}.${key}`);
    inspectForbiddenKeys(item, `${path}.${key}`, hits);
  }
  return hits;
}

function assertFailureShape(value, code) {
  if (value == null) return;
  if (typeof value !== 'object' || typeof value.code !== 'string' || value.rawRemoteErrorExposed !== false) fail(code);
  if (!/^DOKE_COM_B03C_(?:R3Y|R4B)_[A-Z0-9_]+$/.test(value.code)) fail(code);
  const phase = value.failurePhase == null ? null : value.failurePhase;
  if (phase !== null && !r3z.isValidFailureAttribution({ code: value.code, failurePhase: phase })) fail(code);
}

function verifyReport(report = {}) {
  if (report.reportSchema !== r4b.REPORT_SCHEMA || report.contractId !== r4b.CONTRACT_ID) fail('DOKE_COM_B03C_R4B_REPORT_CONTRACT_INVALID');
  if (
    report.target?.environment !== 'staging' ||
    report.target?.projectId !== r4b.REQUIRED_PROJECT_ID ||
    report.target?.projectName !== r4b.REQUIRED_PROJECT_NAME ||
    report.target?.branch !== r4b.REQUIRED_BRANCH ||
    report.target?.pullRequest !== r4b.REQUIRED_PULL_REQUEST
  ) fail('DOKE_COM_B03C_R4B_REPORT_TARGET_INVALID');
  if (report.singleUse !== true || report.reusableAfterFailure !== false || report.runAttempt !== 1) fail('DOKE_COM_B03C_R4B_REPORT_SINGLE_USE_INVALID');
  if (typeof report.authorizationEvidenceHead !== 'string' || !/^[0-9a-f]{40}$/.test(report.authorizationEvidenceHead) || typeof report.authorizationReceiptId !== 'string' || !/^[0-9a-f]{64}$/.test(report.authorizationReceiptId)) fail('DOKE_COM_B03C_R4B_REPORT_AUTHORIZATION_BINDING_INVALID');

  if (
    report.r4aEvidenceHead !== r4b.R4A_EVIDENCE_HEAD ||
    report.r4aTriggerCommit !== r4b.R4A_TRIGGER_COMMIT ||
    report.r4aAuthorizationReceiptId !== r4b.R4A_AUTHORIZATION_RECEIPT_ID ||
    report.r3zContractId !== r3z.CONTRACT_ID ||
    report.phaseSemanticsFingerprint !== r4b.R3Z_PHASE_SEMANTICS_FINGERPRINT ||
    report.r3vContractId !== r3v.CONTRACT_ID
  ) fail('DOKE_COM_B03C_R4B_REPORT_PHASE_EXECUTION_BINDING_INVALID');

  if (
    typeof report.statementFingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(report.statementFingerprint) ||
    report.statementCount !== 21 ||
    typeof report.ownershipDigest !== 'string' || !/^[0-9a-f]{16}$/.test(report.ownershipDigest)
  ) fail('DOKE_COM_B03C_R4B_REPORT_SQL_BINDING_INVALID');

  if (
    report.rawOwnershipTokenPersisted !== false ||
    report.authorizationPlaintextPersisted !== false ||
    report.credentialValuesPersisted !== false ||
    report.rawAccessTokenPersisted !== false ||
    report.rawRemoteErrorExposed !== false ||
    report.historicalR3yFailurePhaseProven !== false ||
    report.historicalR3yFailureReclassified !== false
  ) fail('DOKE_COM_B03C_R4B_REPORT_SECRET_OR_HISTORY_HYGIENE_INVALID');
  if (inspectForbiddenKeys(report).length) fail('DOKE_COM_B03C_R4B_REPORT_FORBIDDEN_FIELD');

  assertFailureShape(report.cleanupFailure, 'DOKE_COM_B03C_R4B_REPORT_CLEANUP_FAILURE_SHAPE_INVALID');
  assertFailureShape(report.executionFailure, 'DOKE_COM_B03C_R4B_REPORT_EXECUTION_FAILURE_SHAPE_INVALID');
  const expectedFailurePhase = report.executionFailure?.failurePhase || null;
  if ((report.failurePhase || null) !== expectedFailurePhase) fail('DOKE_COM_B03C_R4B_REPORT_FAILURE_PHASE_MISMATCH');

  if (report.identityCreated === true && (report.identityCleanupAttempted !== true || report.identityCleanupSucceeded !== true)) {
    fail('DOKE_COM_B03C_R4B_REPORT_IDENTITY_CLEANUP_REQUIRED');
  }
  if (report.instrumentationInstalled === true) {
    if (
      report.cleanupAttempted !== true || report.zeroResidueProven !== true ||
      report.baselinePolicySnapshotComplete !== true || report.baselineRestored !== true ||
      !report.residueCounts || report.residueCounts.policyCount !== 0 ||
      report.residueCounts.functionCount !== 0 || report.residueCounts.sequenceCount !== 0
    ) fail('DOKE_COM_B03C_R4B_REPORT_ZERO_RESIDUE_REQUIRED');
  }

  if (report.executionFailure == null) {
    if (
      report.hostedRuntimeObservationExecuted !== true ||
      !r3y.ALLOWED_CLASSIFICATIONS.includes(report.classification) ||
      !report.observation || !report.deltas ||
      report.zeroResidueProven !== true || report.baselineRestored !== true ||
      report.identityCleanupSucceeded !== true || report.failurePhase !== null
    ) fail('DOKE_COM_B03C_R4B_REPORT_SUCCESS_EVIDENCE_INCOMPLETE');
  }

  if (
    report.exactRootCauseProven !== false || report.causalPromotionAllowed !== false ||
    report.runtimePolicyChangeExecuted !== false || report.productionExecuted !== false || report.mergeExecuted !== false
  ) fail('DOKE_COM_B03C_R4B_REPORT_AUTHORITY_INVARIANT_INVALID');

  return Object.freeze({
    validationId: 'COM-B03C-R4B-SANITIZED-REPORT-VERIFICATION',
    contractId: r4b.CONTRACT_ID,
    reportSchema: r4b.REPORT_SCHEMA,
    authorizationEvidenceHead: report.authorizationEvidenceHead,
    authorizationReceiptId: report.authorizationReceiptId,
    classification: report.classification || null,
    executionFailure: report.executionFailure?.code || null,
    failurePhase: report.failurePhase || null,
    phaseAttributionValid: report.failurePhase == null || r3z.PREINSTALL_PHASES.includes(report.failurePhase),
    zeroResidueProven: report.zeroResidueProven === true,
    baselineRestored: report.baselineRestored === true,
    identityCleanupSucceeded: report.identityCleanupSucceeded === true,
    rawRemoteErrorExposed: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function readReport(reportPath) {
  if (!reportPath || !fs.existsSync(reportPath)) fail('DOKE_COM_B03C_R4B_REPORT_FILE_REQUIRED');
  try { return JSON.parse(fs.readFileSync(reportPath, 'utf8')); }
  catch { fail('DOKE_COM_B03C_R4B_REPORT_JSON_INVALID'); }
}

if (require.main === module) {
  try {
    const result = verifyReport(readReport(process.argv[2]));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R4B_VERIFY_FAILURE')}\n`);
    process.exitCode = 2;
  }
}

module.exports = { FORBIDDEN_KEYS, inspectForbiddenKeys, verifyReport, readReport };
