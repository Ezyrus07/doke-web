#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const r3h = require('../backend/modules/communities/community-realtime-private-auth-r3h');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function verifyReport(report) {
  if (!report || typeof report !== 'object') fail('DOKE_COM_B03C_R3H_REPORT_OBJECT_REQUIRED');
  if (report.validationId !== r3h.REPORT_VALIDATION_ID) fail('DOKE_COM_B03C_R3H_REPORT_VALIDATION_ID_MISMATCH');
  if (report.contractId !== r3h.CONTRACT_ID) fail('DOKE_COM_B03C_R3H_REPORT_CONTRACT_MISMATCH');
  if (report.caseCount !== r3h.CASE_IDS.length) fail('DOKE_COM_B03C_R3H_REPORT_CASE_COUNT_MISMATCH');
  if (JSON.stringify(report.caseIds) !== JSON.stringify([...r3h.CASE_IDS])) fail('DOKE_COM_B03C_R3H_REPORT_CASE_ORDER_MISMATCH');
  if (report.sameIdentityAcrossCases !== true || report.sameAccessTokenAcrossCases !== true || report.sameTopicAcrossCases !== true) {
    fail('DOKE_COM_B03C_R3H_IDENTITY_TOKEN_TOPIC_CONTINUITY_REQUIRED');
  }
  if (report.negativeControlPassed !== true) fail('DOKE_COM_B03C_R3H_NEGATIVE_CONTROL_REQUIRED');
  if (!Array.isArray(report.caseResults) || report.caseResults.length !== r3h.CASE_IDS.length) fail('DOKE_COM_B03C_R3H_CASE_RESULTS_REQUIRED');

  for (let i = 0; i < r3h.CASE_IDS.length; i += 1) {
    const item = report.caseResults[i];
    if (item?.caseId !== r3h.CASE_IDS[i]) fail('DOKE_COM_B03C_R3H_CASE_ID_MISMATCH');
    if (item?.provisionalPreSubscribeStructuralGate !== true) fail('DOKE_COM_B03C_R3H_PRE_SUBSCRIBE_GATE_NOT_PROVEN');
    if (item?.structuralEvidence?.evidenceComplete !== true) fail('DOKE_COM_B03C_R3H_STRUCTURAL_EVIDENCE_INCOMPLETE');
    if (item?.executionFailure !== null) fail('DOKE_COM_B03C_R3H_CASE_EXECUTION_FAILURE_PRESENT');
    if (item?.rawRemoteErrorExposed !== false || item?.join?.rawRemoteErrorExposed !== false) fail('DOKE_COM_B03C_R3H_RAW_REMOTE_ERROR_EXPOSED');
    if (item?.exactRootCauseProven !== false) fail('DOKE_COM_B03C_R3H_CASE_ROOT_CAUSE_OVERCLAIM');
    if (item?.predicateSemanticsProvenByTextComparison !== false || item?.joinOutcomeCanPromoteCausality !== false) {
      fail('DOKE_COM_B03C_R3H_CAUSALITY_GUARD_REQUIRED');
    }
    for (const phase of r3h.SNAPSHOT_PHASES) {
      if (!Array.isArray(item?.snapshots?.[phase])) fail('DOKE_COM_B03C_R3H_SNAPSHOT_PHASE_MISSING');
      for (const row of item.snapshots[phase]) {
        for (const key of r3h.POLICY_SNAPSHOT_COLUMNS) {
          if (!Object.prototype.hasOwnProperty.call(row, key)) fail('DOKE_COM_B03C_R3H_POLICY_COLUMN_MISSING');
        }
      }
    }
  }

  if (report.cleanup?.temporaryPolicyResidue !== 0 || report.cleanup?.syntheticIdentityResidue !== 0 || report.cleanup?.zeroResidueProven !== true) {
    fail('DOKE_COM_B03C_R3H_ZERO_RESIDUE_REQUIRED');
  }
  if (report.exactRootCauseProven !== false || report.runtimeChangeAuthorized !== false) fail('DOKE_COM_B03C_R3H_ROOT_CAUSE_OR_RUNTIME_OVERCLAIM');
  if (report.productionAuthority !== false || report.mergeAuthority !== false) fail('DOKE_COM_B03C_R3H_PRODUCTION_MERGE_AUTHORITY_PROHIBITED');
  if (report.rawRemoteErrorExposed !== false) fail('DOKE_COM_B03C_R3H_RAW_REMOTE_ERROR_EXPOSED');

  const serialized = JSON.stringify(report);
  for (const forbidden of ['SUPABASE_DB_PASSWORD', 'SUPABASE_ACCESS_TOKEN', 'secretKey', 'publishableKey', '"password"', '"accessToken"']) {
    if (serialized.includes(forbidden)) fail('DOKE_COM_B03C_R3H_SECRET_MATERIAL_IN_REPORT');
  }

  return {
    validationId: report.validationId,
    contractId: report.contractId,
    caseCount: report.caseCount,
    zeroResidueProven: true,
    exactRootCauseProven: false,
    evidenceVerified: true
  };
}

if (require.main === module) {
  try {
    const file = process.argv[2];
    if (!file) fail('DOKE_COM_B03C_R3H_REPORT_PATH_REQUIRED');
    const report = JSON.parse(fs.readFileSync(file, 'utf8'));
    process.stdout.write(`${JSON.stringify(verifyReport(report))}\n`);
  } catch (error) {
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R3H_VERIFY_FAILURE')}\n`);
    process.exitCode = 2;
  }
}

module.exports = { verifyReport };
