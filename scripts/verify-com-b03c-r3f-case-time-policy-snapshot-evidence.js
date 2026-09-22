#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const r3e = require('../backend/modules/communities/community-realtime-private-auth-r3e');
const r3f = require('../backend/modules/communities/community-realtime-private-auth-r3f');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function verifyCase(item) {
  if (!item || !r3f.CASE_IDS.includes(item.caseId)) fail('DOKE_COM_B03C_R3F_EVIDENCE_CASE_INVALID');
  const snapshots = item.snapshots || {};
  const expected = item.expectedPolicies || {};
  const reevaluated = r3e.evaluateCaseEvidence({
    caseId: item.caseId,
    beforeCase: snapshots.before_case,
    afterInstallBeforeSubscribe: snapshots.after_install_before_subscribe,
    afterCleanup: snapshots.after_cleanup,
    expectedPolicies: {
      selectPolicyName: expected.selectPolicyName,
      insertPolicyName: expected.insertPolicyName,
      selectPredicate: expected.selectPredicate
    }
  });
  if (reevaluated.evidenceComplete !== true) fail('DOKE_COM_B03C_R3F_STRUCTURAL_EVIDENCE_INCOMPLETE');
  if (item.structuralEvidence?.evidenceComplete !== true) fail('DOKE_COM_B03C_R3F_REPORTED_EVIDENCE_INCOMPLETE');
  if (item.rawRemoteErrorExposed !== false || item.join?.rawRemoteErrorExposed !== false) fail('DOKE_COM_B03C_R3F_RAW_REMOTE_ERROR_EXPOSED');
  if (item.predicateSemanticsProvenByTextComparison !== false || item.joinOutcomeCanPromoteCausality !== false || item.exactRootCauseProven !== false) fail('DOKE_COM_B03C_R3F_CAUSAL_OVERCLAIM');
  const installIndex = item.trace.indexOf('install:complete');
  const installedSnapshotIndex = item.trace.indexOf('snapshot:after_install_before_subscribe');
  const createClientIndex = item.trace.indexOf('realtime:create_client');
  if (installIndex < 0 || installedSnapshotIndex <= installIndex || createClientIndex <= installedSnapshotIndex) fail('DOKE_COM_B03C_R3F_SNAPSHOT_ORDER_INVALID');
  return true;
}

function verifyReport(report) {
  if (report?.contractId !== r3f.CONTRACT_ID) fail('DOKE_COM_B03C_R3F_REPORT_CONTRACT_MISMATCH');
  if (report?.caseCount !== r3f.CASE_IDS.length || JSON.stringify(report.caseIds) !== JSON.stringify(r3f.CASE_IDS)) fail('DOKE_COM_B03C_R3F_REPORT_CASE_MATRIX_MISMATCH');
  if (!Array.isArray(report.caseResults) || report.caseResults.length !== r3f.CASE_IDS.length) fail('DOKE_COM_B03C_R3F_REPORT_RESULTS_MISSING');
  report.caseResults.forEach(verifyCase);
  if (report.sameIdentityAcrossCases !== true || report.sameAccessTokenAcrossCases !== true || report.sameTopicAcrossCases !== true) fail('DOKE_COM_B03C_R3F_CONTEXT_CONTROL_MISSING');
  if (report.exactRootCauseProven !== false || report.runtimeChangeAuthorized !== false || report.rawRemoteErrorExposed !== false) fail('DOKE_COM_B03C_R3F_REPORT_AUTHORITY_OVERCLAIM');
  return { verified: true, caseCount: report.caseResults.length, exactRootCauseProven: false, runtimeChangeAuthorized: false };
}

if (require.main === module) {
  const path = process.argv[2];
  if (!path || !fs.existsSync(path)) fail('DOKE_COM_B03C_R3F_REPORT_PATH_REQUIRED');
  const report = JSON.parse(fs.readFileSync(path, 'utf8'));
  process.stdout.write(`${JSON.stringify(verifyReport(report))}\n`);
}

module.exports = { verifyCase, verifyReport };
