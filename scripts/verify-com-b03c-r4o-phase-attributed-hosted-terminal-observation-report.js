#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const r4o = require('../backend/modules/communities/community-realtime-private-auth-r4o');

const FORBIDDEN_KEYS = new Set([
  'accessToken', 'refreshToken', 'serviceRoleKey', 'anonKey', 'databasePassword',
  'password', 'email', 'userId', 'syntheticUserId', 'rawError', 'rawRemoteError',
  'authorizationPhrase'
]);

function assertNoForbiddenKeys(value, path = '$') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) throw new Error(`R4O_REPORT_FORBIDDEN_KEY:${path}.${key}`);
    assertNoForbiddenKeys(child, `${path}.${key}`);
  }
}

function verifyReport(report, { repositorySelfTest = false } = {}) {
  if (!report || typeof report !== 'object') throw new TypeError('R4O_REPORT_OBJECT_REQUIRED');
  if (report.schema !== r4o.REPORT_SCHEMA) throw new Error('R4O_REPORT_SCHEMA_REQUIRED');
  if (report.contractId !== r4o.CONTRACT_ID) throw new Error('R4O_REPORT_CONTRACT_REQUIRED');
  if (!Array.isArray(report.phases) || JSON.stringify(report.phases) !== JSON.stringify(r4o.PHASES)) {
    throw new Error('R4O_REPORT_PHASE_REGISTRY_REQUIRED');
  }
  if (!Array.isArray(report.phaseRecords)) throw new Error('R4O_REPORT_PHASE_RECORDS_REQUIRED');
  for (const record of report.phaseRecords) {
    if (!record || !r4o.PHASES.includes(record.phase) || !['started', 'succeeded', 'failed'].includes(record.state)) {
      throw new Error('R4O_REPORT_PHASE_RECORD_INVALID');
    }
    if (record.state === 'failed') {
      if (!record.failure || record.failure.rawRemoteErrorExposed !== false ||
          typeof record.failure.code !== 'string' || !record.failure.code.startsWith('DOKE_COM_B03C_')) {
        throw new Error('R4O_REPORT_SANITIZED_FAILURE_REQUIRED');
      }
    }
  }
  if (report.rawRemoteErrorExposed !== false || report.productionChanged !== false ||
      report.exactRootCauseProven !== false || report.causalPromotionAllowed !== false) {
    throw new Error('R4O_REPORT_FAIL_CLOSED_INVARIANTS_REQUIRED');
  }
  assertNoForbiddenKeys(report);

  if (repositorySelfTest) {
    if (report.status !== 'repository_self_test_only' || report.authorizationConsumed !== false ||
        report.triggerCreated !== false || report.executionAttempted !== false ||
        report.credentialReads !== 0 || report.dependencyLoads !== 0 ||
        report.networkAccess !== false || report.stagingAccess !== false ||
        report.databaseQueryAgainstRemote !== false || report.realtimeSubscriptionAttempted !== false ||
        report.authIdentityMutation !== false || report.zeroResidueProven !== false) {
      throw new Error('R4O_REPOSITORY_SELF_TEST_REMOTE_EFFECT_DETECTED');
    }
  }

  return Object.freeze({
    validationId: 'COM-B03C-R4O-PHASE-ATTRIBUTED-REPORT-VERIFIER',
    reportSchema: r4o.REPORT_SCHEMA,
    phaseRegistryVerified: true,
    sanitizedFailureVerified: true,
    forbiddenKeyScanPassed: true,
    rawRemoteErrorExposed: false,
    productionChanged: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

async function repositorySelfTest() {
  const executor = require('./execute-com-b03c-r4o-phase-attributed-hosted-terminal-observation');
  const report = await executor.repositorySelfTest();
  return verifyReport(report, { repositorySelfTest: true });
}

if (require.main === module) {
  (async () => {
    if (process.argv.includes('--repository-self-test')) {
      process.stdout.write(`${JSON.stringify(await repositorySelfTest())}\n`);
      return;
    }
    const path = process.argv[2];
    if (!path) throw new Error('R4O_REPORT_PATH_REQUIRED');
    const report = JSON.parse(fs.readFileSync(path, 'utf8'));
    process.stdout.write(`${JSON.stringify(verifyReport(report))}\n`);
  })().catch((error) => {
    process.stderr.write(`${String(error?.message || 'R4O_REPORT_VERIFICATION_FAILED')}\n`);
    process.exitCode = 1;
  });
}

module.exports = { verifyReport, repositorySelfTest };
