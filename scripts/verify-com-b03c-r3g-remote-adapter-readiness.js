#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const r3f = require('../backend/modules/communities/community-realtime-private-auth-r3f');
const r3g = require('../backend/modules/communities/community-realtime-private-auth-r3g');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function verifyReport(report) {
  if (report?.validationId !== 'COM-B03C-R3G-REMOTE-ADAPTER-REPOSITORY-SELF-TEST') fail('DOKE_COM_B03C_R3G_REPORT_ID_MISMATCH');
  if (report?.contractId !== r3g.CONTRACT_ID) fail('DOKE_COM_B03C_R3G_REPORT_CONTRACT_MISMATCH');
  if (report?.caseCount !== r3f.CASE_IDS.length) fail('DOKE_COM_B03C_R3G_REPORT_CASE_COUNT_INVALID');
  if (report?.allStructuralEvidenceComplete !== true) fail('DOKE_COM_B03C_R3G_STRUCTURAL_EVIDENCE_INCOMPLETE');
  if (report?.credentialReadsBeforeAuthorization !== 0) fail('DOKE_COM_B03C_R3G_PREAUTH_CREDENTIAL_READ_DETECTED');
  if (report?.dependencyLoadsBeforeAuthorization !== 0) fail('DOKE_COM_B03C_R3G_PREAUTH_DEPENDENCY_LOAD_DETECTED');
  if (report?.projectIdentityVerified !== true) fail('DOKE_COM_B03C_R3G_PROJECT_IDENTITY_NOT_VERIFIED');
  if (report?.stagingAccess !== false || report?.networkAccess !== false) fail('DOKE_COM_B03C_R3G_REMOTE_ACCESS_DETECTED');
  if (report?.exactRootCauseProven !== false) fail('DOKE_COM_B03C_R3G_ROOT_CAUSE_PROMOTION_PROHIBITED');
  return { verified: true, contractId: r3g.CONTRACT_ID, remoteAccessOccurred: false };
}

if (require.main === module) {
  const target = process.argv[2];
  if (!target) fail('DOKE_COM_B03C_R3G_REPORT_PATH_REQUIRED');
  const report = JSON.parse(fs.readFileSync(path.resolve(target), 'utf8'));
  process.stdout.write(`${JSON.stringify(verifyReport(report))}\n`);
}

module.exports = { verifyReport };
