#!/usr/bin/env node
'use strict';

const r3j = require('../backend/modules/communities/community-realtime-private-auth-r3j');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function verifyReport(report) {
  if (!report || report.contractId !== r3j.CONTRACT_ID) fail('DOKE_COM_B03C_R3J_REPORT_CONTRACT_INVALID');
  if (report.validationId !== 'COM-B03C-R3J-EVALUATION-CONTEXT-DIFFERENTIAL-REPORT') fail('DOKE_COM_B03C_R3J_REPORT_VALIDATION_ID_INVALID');
  if (report.differentialProbeCount !== 16 || report.totalExecutionCaseCount !== 17) fail('DOKE_COM_B03C_R3J_REPORT_CASE_COUNT_INVALID');
  if (JSON.stringify(report.caseIds) !== JSON.stringify(r3j.EXECUTION_CASE_IDS)) fail('DOKE_COM_B03C_R3J_REPORT_CASE_ORDER_INVALID');
  if (!Array.isArray(report.caseResults) || report.caseResults.length !== 17) fail('DOKE_COM_B03C_R3J_REPORT_RESULTS_INVALID');
  if (report.sameIdentityAcrossCases !== true || report.sameAccessTokenAcrossCases !== true || report.sameTopicAcrossCases !== true || report.freshRealtimeClientPerCase !== true) {
    fail('DOKE_COM_B03C_R3J_REPORT_COHORT_CONTINUITY_INVALID');
  }
  if (report.causalPromotionAllowed !== false || report.exactRootCauseProven !== false || report.runtimeChangeAuthorized !== false || report.rawRemoteErrorExposed !== false) {
    fail('DOKE_COM_B03C_R3J_REPORT_AUTHORITY_INVALID');
  }

  const observed = new Set();
  for (let index = 0; index < report.caseResults.length; index += 1) {
    const item = report.caseResults[index];
    const expectedId = r3j.EXECUTION_CASE_IDS[index];
    const expectedDef = expectedId === r3j.NEGATIVE_CONTROL_ID
      ? [r3j.NEGATIVE_CONTROL_ID, 'negative_control', 'false']
      : r3j.CASES[index - 1];
    if (item.caseId !== expectedId || item.surface !== expectedDef[1] || item.predicateTemplate !== expectedDef[2]) {
      fail('DOKE_COM_B03C_R3J_REPORT_CASE_DESCRIPTOR_INVALID');
    }
    if (observed.has(item.caseId)) fail('DOKE_COM_B03C_R3J_REPORT_DUPLICATE_CASE');
    observed.add(item.caseId);
    if (item.structuralEvidence?.evidenceComplete !== true || (item.structuralEvidence?.blockers || []).length !== 0) {
      fail('DOKE_COM_B03C_R3J_REPORT_STRUCTURAL_EVIDENCE_INCOMPLETE');
    }
    const delta = item.structuralEvidence.installDelta;
    if (!delta || delta.added?.length !== 2 || delta.removed?.length !== 0 || delta.changed?.length !== 0) {
      fail('DOKE_COM_B03C_R3J_REPORT_POLICY_DELTA_INVALID');
    }
    const cleanup = item.structuralEvidence.cleanupDelta;
    if (!cleanup || cleanup.added?.length !== 0 || cleanup.removed?.length !== 0 || cleanup.changed?.length !== 0) {
      fail('DOKE_COM_B03C_R3J_REPORT_CLEANUP_INVALID');
    }
    if (item.structuralEvidence.predicateSemanticsProvenByTextComparison !== false || item.structuralEvidence.probeOutcomeCanPromoteCausalityAlone !== false) {
      fail('DOKE_COM_B03C_R3J_REPORT_CAUSAL_GUARD_INVALID');
    }
    if (item.executionFailure !== null) fail('DOKE_COM_B03C_R3J_REPORT_EXECUTION_FAILURE');
    if (typeof item.probe?.subscribed !== 'boolean' || typeof item.probe?.classification !== 'string' || !item.probe.classification) {
      fail('DOKE_COM_B03C_R3J_REPORT_PROBE_OUTCOME_INVALID');
    }
    if (item.probe?.rawRemoteErrorExposed !== false || item.rawRemoteErrorExposed !== false || item.exactRootCauseProven !== false) {
      fail('DOKE_COM_B03C_R3J_REPORT_SANITIZATION_INVALID');
    }
  }

  const negative = report.caseResults[0];
  if (negative.caseId !== r3j.NEGATIVE_CONTROL_ID || negative.probe.subscribed !== false || negative.expectedPolicies?.selectPredicate !== 'false') {
    fail('DOKE_COM_B03C_R3J_REPORT_NEGATIVE_CONTROL_INVALID');
  }

  return {
    validationId: 'COM-B03C-R3J-EVALUATION-CONTEXT-DIFFERENTIAL-REPORT-VERIFIED',
    contractId: r3j.CONTRACT_ID,
    differentialProbeCount: report.differentialProbeCount,
    totalExecutionCaseCount: report.totalExecutionCaseCount,
    evidenceComplete: true,
    zeroStructuralResidue: true,
    causalPromotionAllowed: false,
    exactRootCauseProven: false,
    runtimeChangeAuthorized: false
  };
}

if (require.main === module) {
  try {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => {
      const report = JSON.parse(chunks.join(''));
      process.stdout.write(`${JSON.stringify(verifyReport(report))}\n`);
    });
  } catch (error) {
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R3J_VERIFY_FAILURE')}\n`);
    process.exitCode = 2;
  }
}

module.exports = { verifyReport };
