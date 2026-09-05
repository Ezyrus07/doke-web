#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const r4e = require('../backend/modules/communities/community-realtime-private-auth-r4e');
const r4c = require('../backend/modules/communities/community-realtime-private-auth-r4c');
const r4d = require('../backend/modules/communities/community-realtime-private-auth-r4d');
const r3z = require('../backend/modules/communities/community-realtime-private-auth-r3z');
const r3v = require('../backend/modules/communities/community-realtime-private-auth-r3v');
const r3y = require('../backend/modules/communities/community-realtime-private-auth-r3y');
function fail(code) { const e = new Error(code); e.code = code; throw e; }
const FORBIDDEN_KEYS = Object.freeze(['accessToken','password','secretKey','publishableKey','dbPassword','managementToken','authorizationPhrase','credentials','apiKeys','rawError','rawRemoteError','cause']);
function inspectForbiddenKeys(value, p = '$', hits = []) { if (!value || typeof value !== 'object') return hits; if (Array.isArray(value)) { value.forEach((v,i) => inspectForbiddenKeys(v, `${p}[${i}]`, hits)); return hits; } for (const [k,v] of Object.entries(value)) { if (FORBIDDEN_KEYS.includes(k)) hits.push(`${p}.${k}`); inspectForbiddenKeys(v, `${p}.${k}`, hits); } return hits; }
function assertFailureShape(value, code) { if (value == null) return; if (typeof value !== 'object' || typeof value.code !== 'string' || value.rawRemoteErrorExposed !== false) fail(code); if (!/^DOKE_COM_B03C_(?:R3Y|R4E)_[A-Z0-9_]+$/.test(value.code)) fail(code); const phase = value.failurePhase == null ? null : value.failurePhase; if (phase !== null && !r3z.isValidFailureAttribution({ code: value.code, failurePhase: phase })) fail(code); }
function verifyReport(report = {}) {
  if (report.reportSchema !== r4e.REPORT_SCHEMA || report.contractId !== r4e.CONTRACT_ID) fail('DOKE_COM_B03C_R4E_REPORT_CONTRACT_INVALID');
  if (report.target?.environment !== 'staging' || report.target?.projectId !== r4e.REQUIRED_PROJECT_ID || report.target?.projectName !== r4e.REQUIRED_PROJECT_NAME || report.target?.branch !== r4e.REQUIRED_BRANCH || report.target?.pullRequest !== r4e.REQUIRED_PULL_REQUEST) fail('DOKE_COM_B03C_R4E_REPORT_TARGET_INVALID');
  if (report.singleUse !== true || report.reusableAfterFailure !== false || report.runAttempt !== 1) fail('DOKE_COM_B03C_R4E_REPORT_SINGLE_USE_INVALID');
  if (typeof report.authorizationEvidenceHead !== 'string' || !/^[0-9a-f]{40}$/.test(report.authorizationEvidenceHead) || typeof report.authorizationReceiptId !== 'string' || !/^[0-9a-f]{64}$/.test(report.authorizationReceiptId)) fail('DOKE_COM_B03C_R4E_REPORT_AUTHORIZATION_BINDING_INVALID');
  if (report.r4dEvidenceHead !== r4e.R4D_EVIDENCE_HEAD || report.r4dTriggerCommit !== r4e.R4D_TRIGGER_COMMIT || report.r4dAuthorizationReceiptId !== r4e.R4D_AUTHORIZATION_RECEIPT_ID || report.r4dAuthorizationReusable !== false || report.previousR4bAuthorizationReusable !== false || report.predecessorR4cEvidenceHead !== r4d.PREDECESSOR_HEAD || report.r4cContractId !== r4c.CONTRACT_ID || report.codecSemanticsFingerprint !== r4d.CODEC_SEMANTICS_FINGERPRINT || report.codecBridgeApplied !== true || report.codecBridgeScope !== 'exact_r3u_counter_read_result_only' || report.historicalR4bFailurePhase !== r4c.PREDECESSOR_R4B_FAILURE_PHASE || report.historicalR4bFailureReclassified !== false || report.historicalR3vModified !== false || report.historicalR3sModified !== false || report.r3zContractId !== r3z.CONTRACT_ID || report.r3vContractId !== r3v.CONTRACT_ID) fail('DOKE_COM_B03C_R4E_REPORT_BRIDGE_EXECUTION_BINDING_INVALID');
  if (typeof report.statementFingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(report.statementFingerprint) || report.statementCount !== 21 || typeof report.ownershipDigest !== 'string' || !/^[0-9a-f]{16}$/.test(report.ownershipDigest)) fail('DOKE_COM_B03C_R4E_REPORT_SQL_BINDING_INVALID');
  if (report.rawOwnershipTokenPersisted !== false || report.authorizationPlaintextPersisted !== false || report.credentialValuesPersisted !== false || report.rawAccessTokenPersisted !== false || report.rawRemoteErrorExposed !== false || inspectForbiddenKeys(report).length) fail('DOKE_COM_B03C_R4E_REPORT_SECRET_HYGIENE_INVALID');
  assertFailureShape(report.cleanupFailure, 'DOKE_COM_B03C_R4E_REPORT_CLEANUP_FAILURE_SHAPE_INVALID'); assertFailureShape(report.executionFailure, 'DOKE_COM_B03C_R4E_REPORT_EXECUTION_FAILURE_SHAPE_INVALID');
  if ((report.failurePhase || null) !== (report.executionFailure?.failurePhase || null)) fail('DOKE_COM_B03C_R4E_REPORT_FAILURE_PHASE_MISMATCH');
  if (report.identityCreated === true && (report.identityCleanupAttempted !== true || report.identityCleanupSucceeded !== true)) fail('DOKE_COM_B03C_R4E_REPORT_IDENTITY_CLEANUP_REQUIRED');
  if (report.instrumentationInstalled === true && (report.cleanupAttempted !== true || report.zeroResidueProven !== true || report.baselinePolicySnapshotComplete !== true || report.baselineRestored !== true || !report.residueCounts || report.residueCounts.policyCount !== 0 || report.residueCounts.functionCount !== 0 || report.residueCounts.sequenceCount !== 0)) fail('DOKE_COM_B03C_R4E_REPORT_ZERO_RESIDUE_REQUIRED');
  if (report.executionFailure == null && (report.hostedRuntimeObservationExecuted !== true || !r3y.ALLOWED_CLASSIFICATIONS.includes(report.classification) || !report.observation || !report.deltas || report.zeroResidueProven !== true || report.baselineRestored !== true || report.identityCleanupSucceeded !== true || report.failurePhase !== null)) fail('DOKE_COM_B03C_R4E_REPORT_SUCCESS_EVIDENCE_INCOMPLETE');
  if (report.exactRootCauseProven !== false || report.causalPromotionAllowed !== false || report.runtimePolicyChangeExecuted !== false || report.productionExecuted !== false || report.mergeExecuted !== false) fail('DOKE_COM_B03C_R4E_REPORT_AUTHORITY_INVARIANT_INVALID');
  return Object.freeze({ validationId: 'COM-B03C-R4E-SANITIZED-REPORT-VERIFICATION', contractId: r4e.CONTRACT_ID, reportSchema: r4e.REPORT_SCHEMA,
    authorizationEvidenceHead: report.authorizationEvidenceHead, authorizationReceiptId: report.authorizationReceiptId, codecBridgeApplied: true,
    historicalR4bFailurePhase: report.historicalR4bFailurePhase, classification: report.classification || null, executionFailure: report.executionFailure?.code || null,
    failurePhase: report.failurePhase || null, phaseAttributionValid: report.failurePhase == null || r3z.PREINSTALL_PHASES.includes(report.failurePhase),
    zeroResidueProven: report.zeroResidueProven === true, baselineRestored: report.baselineRestored === true, identityCleanupSucceeded: report.identityCleanupSucceeded === true,
    rawRemoteErrorExposed: false, exactRootCauseProven: false, causalPromotionAllowed: false });
}
function readReport(reportPath) { if (!reportPath || !fs.existsSync(reportPath)) fail('DOKE_COM_B03C_R4E_REPORT_FILE_REQUIRED'); try { return JSON.parse(fs.readFileSync(reportPath, 'utf8')); } catch { fail('DOKE_COM_B03C_R4E_REPORT_JSON_INVALID'); } }
if (require.main === module) { try { process.stdout.write(`${JSON.stringify(verifyReport(readReport(process.argv[2])))}\n`); } catch (error) { process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R4E_VERIFY_FAILURE')}\n`); process.exitCode = 2; } }
module.exports = { FORBIDDEN_KEYS, inspectForbiddenKeys, verifyReport, readReport };
