#!/usr/bin/env node
'use strict';

const fs = require('node:fs');

const r3y = require('../backend/modules/communities/community-realtime-private-auth-r3y');
const r3v = require('../backend/modules/communities/community-realtime-private-auth-r3v');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

const FORBIDDEN_KEYS = Object.freeze([
  'accessToken',
  'password',
  'secretKey',
  'publishableKey',
  'dbPassword',
  'managementToken',
  'authorizationPhrase',
  'credentials',
  'apiKeys',
  'rawError',
  'rawRemoteError'
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
  if (
    typeof value !== 'object' ||
    typeof value.code !== 'string' ||
    value.rawRemoteErrorExposed !== false
  ) {
    fail(code);
  }
  if (!/^DOKE_COM_B03C_R3Y_[A-Z0-9_]+$/.test(value.code)) {
    fail(code);
  }
}

function verifyReport(report = {}) {
  if (report.reportSchema !== r3y.REPORT_SCHEMA) {
    fail('DOKE_COM_B03C_R3Y_REPORT_SCHEMA_INVALID');
  }
  if (report.contractId !== r3y.CONTRACT_ID) {
    fail('DOKE_COM_B03C_R3Y_REPORT_CONTRACT_INVALID');
  }
  if (
    report.target?.environment !== 'staging' ||
    report.target?.projectId !== r3y.REQUIRED_PROJECT_ID ||
    report.target?.projectName !== r3y.REQUIRED_PROJECT_NAME ||
    report.target?.branch !== r3y.REQUIRED_BRANCH ||
    report.target?.pullRequest !== r3y.REQUIRED_PULL_REQUEST
  ) {
    fail('DOKE_COM_B03C_R3Y_REPORT_TARGET_INVALID');
  }
  if (
    report.singleUse !== true ||
    report.reusableAfterFailure !== false ||
    report.runAttempt !== 1
  ) {
    fail('DOKE_COM_B03C_R3Y_REPORT_SINGLE_USE_INVALID');
  }
  if (
    typeof report.authorizationEvidenceHead !== 'string' ||
    !/^[0-9a-f]{40}$/.test(report.authorizationEvidenceHead) ||
    typeof report.authorizationReceiptId !== 'string' ||
    !/^[0-9a-f]{64}$/.test(report.authorizationReceiptId)
  ) {
    fail('DOKE_COM_B03C_R3Y_REPORT_AUTHORIZATION_BINDING_INVALID');
  }
  if (
    report.r3vContractId !== r3v.CONTRACT_ID ||
    typeof report.statementFingerprint !== 'string' ||
    !/^[0-9a-f]{64}$/.test(report.statementFingerprint) ||
    report.statementCount !== 21 ||
    typeof report.ownershipDigest !== 'string' ||
    !/^[0-9a-f]{16}$/.test(report.ownershipDigest)
  ) {
    fail('DOKE_COM_B03C_R3Y_REPORT_SQL_BINDING_INVALID');
  }
  if (
    report.rawOwnershipTokenPersisted !== false ||
    report.authorizationPlaintextPersisted !== false ||
    report.credentialValuesPersisted !== false ||
    report.rawAccessTokenPersisted !== false ||
    report.rawRemoteErrorExposed !== false
  ) {
    fail('DOKE_COM_B03C_R3Y_REPORT_SECRET_HYGIENE_INVALID');
  }
  const forbiddenHits = inspectForbiddenKeys(report);
  if (forbiddenHits.length) {
    fail('DOKE_COM_B03C_R3Y_REPORT_FORBIDDEN_SECRET_FIELD');
  }

  assertFailureShape(
    report.cleanupFailure,
    'DOKE_COM_B03C_R3Y_REPORT_CLEANUP_FAILURE_SHAPE_INVALID'
  );
  assertFailureShape(
    report.executionFailure,
    'DOKE_COM_B03C_R3Y_REPORT_EXECUTION_FAILURE_SHAPE_INVALID'
  );

  if (report.identityCreated === true) {
    if (
      report.identityCleanupAttempted !== true ||
      report.identityCleanupSucceeded !== true
    ) {
      fail('DOKE_COM_B03C_R3Y_REPORT_IDENTITY_CLEANUP_REQUIRED');
    }
  }

  if (report.instrumentationInstalled === true) {
    if (
      report.cleanupAttempted !== true ||
      report.zeroResidueProven !== true ||
      report.baselinePolicySnapshotComplete !== true ||
      report.baselineRestored !== true ||
      !report.residueCounts ||
      report.residueCounts.policyCount !== 0 ||
      report.residueCounts.functionCount !== 0 ||
      report.residueCounts.sequenceCount !== 0
    ) {
      fail('DOKE_COM_B03C_R3Y_REPORT_ZERO_RESIDUE_REQUIRED');
    }
  }

  if (report.executionFailure == null) {
    if (
      report.hostedRuntimeObservationExecuted !== true ||
      !r3y.ALLOWED_CLASSIFICATIONS.includes(report.classification) ||
      !report.observation ||
      !report.deltas ||
      report.zeroResidueProven !== true ||
      report.baselineRestored !== true ||
      report.identityCleanupSucceeded !== true
    ) {
      fail('DOKE_COM_B03C_R3Y_REPORT_SUCCESS_EVIDENCE_INCOMPLETE');
    }
  }

  if (
    report.exactRootCauseProven !== false ||
    report.causalPromotionAllowed !== false ||
    report.runtimePolicyChangeExecuted !== false ||
    report.productionExecuted !== false ||
    report.mergeExecuted !== false
  ) {
    fail('DOKE_COM_B03C_R3Y_REPORT_AUTHORITY_INVARIANT_INVALID');
  }

  return Object.freeze({
    validationId: 'COM-B03C-R3Y-SANITIZED-REPORT-VERIFICATION',
    contractId: r3y.CONTRACT_ID,
    reportSchema: r3y.REPORT_SCHEMA,
    authorizationEvidenceHead: report.authorizationEvidenceHead,
    authorizationReceiptId: report.authorizationReceiptId,
    classification: report.classification || null,
    executionFailure: report.executionFailure?.code || null,
    zeroResidueProven: report.zeroResidueProven === true,
    baselineRestored: report.baselineRestored === true,
    identityCleanupSucceeded: report.identityCleanupSucceeded === true,
    rawRemoteErrorExposed: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function readReport(reportPath) {
  if (!reportPath || !fs.existsSync(reportPath)) {
    fail('DOKE_COM_B03C_R3Y_REPORT_FILE_REQUIRED');
  }
  let report;
  try {
    report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch {
    fail('DOKE_COM_B03C_R3Y_REPORT_JSON_INVALID');
  }
  return report;
}

if (require.main === module) {
  try {
    const reportPath = process.argv[2];
    const result = verifyReport(readReport(reportPath));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(
      `${String(error?.code || error?.message || 'DOKE_COM_B03C_R3Y_VERIFY_FAILURE')}\n`
    );
    process.exitCode = 2;
  }
}

module.exports = {
  FORBIDDEN_KEYS,
  inspectForbiddenKeys,
  verifyReport,
  readReport
};
