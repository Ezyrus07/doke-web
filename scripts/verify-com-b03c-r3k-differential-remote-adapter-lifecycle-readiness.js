#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const r3j = require('../backend/modules/communities/community-realtime-private-auth-r3j');
const r3k = require('../backend/modules/communities/community-realtime-private-auth-r3k');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function verify(report = {}) {
  if (report.validationId !== 'COM-B03C-R3K-DIFFERENTIAL-REMOTE-ADAPTER-LIFECYCLE-REPOSITORY-SELF-TEST') {
    fail('DOKE_COM_B03C_R3K_REPORT_VALIDATION_ID_INVALID');
  }
  if (report.contractId !== r3k.CONTRACT_ID) {
    fail('DOKE_COM_B03C_R3K_REPORT_CONTRACT_ID_INVALID');
  }
  if (report.differentialProbeCount !== 16 || report.totalExecutionCaseCount !== 17) {
    fail('DOKE_COM_B03C_R3K_REPORT_CASE_COUNT_INVALID');
  }
  if (JSON.stringify(report.executionCaseIds) !== JSON.stringify(r3j.EXECUTION_CASE_IDS)) {
    fail('DOKE_COM_B03C_R3K_REPORT_CASE_ORDER_INVALID');
  }
  const requiredTrue = [
    'negativeControlRejected',
    'allStructuralEvidenceComplete',
    'sameIdentityAcrossCases',
    'sameAccessTokenAcrossCases',
    'sameTopicAcrossCases',
    'freshRealtimeClientPerCase',
    'syntheticIdentityCreatedExactlyOnce',
    'syntheticIdentityDeletedExactlyOnce',
    'projectIdentityVerified'
  ];
  for (const key of requiredTrue) {
    if (report[key] !== true) fail(`DOKE_COM_B03C_R3K_REPORT_${key.toUpperCase()}_REQUIRED`);
  }
  if (report.credentialReadsBeforeAuthorization !== 0) {
    fail('DOKE_COM_B03C_R3K_REPORT_PREAUTH_CREDENTIAL_READ_DETECTED');
  }
  if (report.dependencyLoadsBeforeAuthorization !== 0) {
    fail('DOKE_COM_B03C_R3K_REPORT_PREAUTH_DEPENDENCY_LOAD_DETECTED');
  }
  if (report.stagingAccess !== false || report.networkAccess !== false) {
    fail('DOKE_COM_B03C_R3K_REPORT_REMOTE_EFFECT_DETECTED');
  }
  if (
    report.causalPromotionAllowed !== false ||
    report.exactRootCauseProven !== false ||
    report.rawRemoteErrorExposed !== false
  ) {
    fail('DOKE_COM_B03C_R3K_REPORT_CAUSAL_OR_SANITIZATION_BOUNDARY_INVALID');
  }
  if (!Number.isInteger(report.lifecycleStepCount) || report.lifecycleStepCount < 15) {
    fail('DOKE_COM_B03C_R3K_REPORT_LIFECYCLE_PLAN_INCOMPLETE');
  }
  return {
    validationId: report.validationId,
    contractId: report.contractId,
    verified: true,
    stagingAccess: false,
    networkAccess: false,
    exactRootCauseProven: false
  };
}

if (require.main === module) {
  try {
    const file = process.argv[2];
    if (!file) fail('DOKE_COM_B03C_R3K_REPORT_PATH_REQUIRED');
    const report = JSON.parse(fs.readFileSync(file, 'utf8'));
    process.stdout.write(`${JSON.stringify(verify(report))}\n`);
  } catch (error) {
    process.stderr.write(
      `${String(error?.code || error?.message || 'DOKE_COM_B03C_R3K_VERIFY_FAILURE')}\n`
    );
    process.exitCode = 2;
  }
}

module.exports = { verify };
