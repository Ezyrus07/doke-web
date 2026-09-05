#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const r4o = require('../backend/modules/communities/community-realtime-private-auth-r4o');
const r4w = require('../backend/modules/communities/community-realtime-private-auth-r4w');

const FORBIDDEN_KEYS = new Set([
  'accessToken', 'refreshToken', 'serviceRoleKey', 'anonKey', 'databasePassword',
  'password', 'email', 'userId', 'syntheticUserId', 'rawError', 'rawRemoteError',
  'authorizationPhrase', 'secretKey', 'publishableKey', 'ownershipToken'
]);

function assertNoForbiddenKeys(value, path = '$') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) throw new Error(`R4W_REPORT_FORBIDDEN_KEY:${path}.${key}`);
    assertNoForbiddenKeys(child, `${path}.${key}`);
  }
}

function verifyReport(report, { repositorySelfTest = false } = {}) {
  if (!report || typeof report !== 'object') throw new TypeError('R4W_REPORT_OBJECT_REQUIRED');
  if (report.schema !== r4w.REPORT_SCHEMA || report.schema !== r4o.REPORT_SCHEMA) {
    throw new Error('R4W_REPORT_SCHEMA_REQUIRED');
  }
  if (report.contractId !== r4o.CONTRACT_ID || report.executionBoundaryContractId !== r4w.CONTRACT_ID) {
    throw new Error('R4W_REPORT_CONTRACT_LINEAGE_REQUIRED');
  }
  if (!Array.isArray(report.phases) || JSON.stringify(report.phases) !== JSON.stringify(r4o.PHASES)) {
    throw new Error('R4W_REPORT_PHASE_REGISTRY_REQUIRED');
  }
  if (!Array.isArray(report.phaseRecords)) throw new Error('R4W_REPORT_PHASE_RECORDS_REQUIRED');
  for (const record of report.phaseRecords) {
    if (!record || !r4o.PHASES.includes(record.phase) || !['started', 'succeeded', 'failed'].includes(record.state)) {
      throw new Error('R4W_REPORT_PHASE_RECORD_INVALID');
    }
    if (record.state === 'failed') {
      if (!record.failure || record.failure.rawRemoteErrorExposed !== false ||
          typeof record.failure.code !== 'string' || !record.failure.code.startsWith('DOKE_COM_B03C_')) {
        throw new Error('R4W_REPORT_SANITIZED_FAILURE_REQUIRED');
      }
    }
  }
  if (report.failedPhase != null && !r4o.PHASES.includes(report.failedPhase)) {
    throw new Error('R4W_REPORT_FAILED_PHASE_INVALID');
  }
  if (report.lastSucceededPhase != null && !r4o.PHASES.includes(report.lastSucceededPhase)) {
    throw new Error('R4W_REPORT_LAST_SUCCEEDED_PHASE_INVALID');
  }
  if (report.rawRemoteErrorExposed !== false || report.productionChanged !== false ||
      report.runtimePolicyPromotionAuthorized !== false || report.exactRootCauseProven !== false ||
      report.causalPromotionAllowed !== false) {
    throw new Error('R4W_REPORT_FAIL_CLOSED_INVARIANTS_REQUIRED');
  }
  if (report.r4tEvidenceHead !== r4w.R4T_EVIDENCE_HEAD ||
      report.r4tContractId !== r4w.EXECUTION_BINDING.r4tContractId ||
      report.r4tExecutionSemanticsFingerprint !== r4w.R4T_EXECUTION_SEMANTICS_FINGERPRINT ||
      report.r3vContractId !== r4w.EXECUTION_BINDING.r3vContractId ||
      report.statementFingerprint !== r4w.EXECUTION_BINDING.statementFingerprint ||
      report.statementCount !== r4w.EXECUTION_BINDING.statementCount ||
      report.ownershipDigest !== r4w.EXECUTION_BINDING.ownershipDigest) {
    throw new Error('R4W_REPORT_R4T_SUCCESSOR_BINDING_REQUIRED');
  }
  assertNoForbiddenKeys(report);

  if (repositorySelfTest) {
    if (report.status !== 'repository_self_test_only' || report.authorizationConsumed !== false ||
        report.triggerCreated !== false || report.executionAttempted !== false ||
        report.credentialReads !== 0 || report.dependencyLoads !== 0 ||
        report.networkAccess !== false || report.stagingAccess !== false ||
        report.databaseQueryAgainstRemote !== false || report.realtimeSubscriptionAttempted !== false ||
        report.authIdentityMutation !== false || report.hostedR4tSuccessorAttemptExecuted !== false ||
        report.successorExecutorKind !== 'r4t_r4q_successor_db_execution_adapter' ||
        report.r4cCounterCodecBridgeApplied !== true ||
        report.preInstallCleanupMutationAttempted !== false ||
        report.preInstallResidueInspectionExecuted !== true ||
        report.preInstallBaselineResnapshotExecuted !== true ||
        report.zeroResidueProven !== false || report.baselineRestored !== false) {
      throw new Error('R4W_REPOSITORY_SELF_TEST_REMOTE_EFFECT_OR_SUCCESSOR_GAP_DETECTED');
    }
  } else {
    if (report.authorizationEvidenceHead !== r4w.AUTHORIZATION_EVIDENCE_HEAD ||
        report.r4vIssuerEvidenceHead !== r4w.R4V_ISSUER_EVIDENCE_HEAD ||
        report.authorizedR4uHead !== r4w.AUTHORIZED_R4U_HEAD ||
        report.authorizationReceiptId !== r4w.AUTHORIZATION_RECEIPT_ID ||
        typeof report.workflowInstallHead !== 'string' || !/^[0-9a-f]{40}$/.test(report.workflowInstallHead) ||
        report.workflowInstallHead === r4w.AUTHORIZATION_EVIDENCE_HEAD ||
        report.authorizationConsumed !== true || report.triggerCreated !== true || report.executionAttempted !== true ||
        report.runAttempt !== 1 || report.singleUse !== true || report.reusableAfterFailure !== false ||
        report.hostedR4tSuccessorAttemptExecuted !== true) {
      throw new Error('R4W_REPORT_EXECUTION_LINEAGE_REQUIRED');
    }
    if (report.executionFailure &&
        (typeof report.executionFailure.code !== 'string' || report.executionFailure.rawRemoteErrorExposed !== false)) {
      throw new Error('R4W_REPORT_EXECUTION_FAILURE_SANITIZATION_REQUIRED');
    }
    if (report.successorExecutorKind != null &&
        report.successorExecutorKind !== 'r4t_r4q_successor_db_execution_adapter') {
      throw new Error('R4W_REPORT_SUCCESSOR_EXECUTOR_KIND_INVALID');
    }
    if (report.instrumentationInstalled === true && report.cleanupMutationAttempted !== true) {
      throw new Error('R4W_REPORT_INSTALLED_INSTRUMENTATION_CLEANUP_REQUIRED');
    }
    if (report.cleanupPlan && report.zeroResidueProven !== true) {
      throw new Error('R4W_REPORT_ZERO_RESIDUE_REQUIRED_AFTER_CLEANUP');
    }
  }

  return Object.freeze({
    validationId: 'COM-B03C-R4W-R4T-SUCCESSOR-REPORT-VERIFIER',
    reportSchema: r4w.REPORT_SCHEMA,
    phaseRegistryVerified: true,
    r4tSuccessorBindingVerified: true,
    sanitizedFailureVerified: true,
    forbiddenKeyScanPassed: true,
    rawRemoteErrorExposed: false,
    productionChanged: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

async function repositorySelfTest() {
  const executor = require('./execute-com-b03c-r4w-single-use-r4t-successor-hosted-execution');
  const report = await executor.repositorySelfTest();
  return verifyReport(report, { repositorySelfTest: true });
}

if (require.main === module) {
  (async () => {
    if (process.argv.includes('--repository-self-test')) {
      process.stdout.write(`${JSON.stringify(await repositorySelfTest())}\n`);
      return;
    }
    const reportPath = process.argv[2];
    if (!reportPath) throw new Error('R4W_REPORT_PATH_REQUIRED');
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    process.stdout.write(`${JSON.stringify(verifyReport(report))}\n`);
  })().catch((error) => {
    process.stderr.write(`${String(error?.message || 'R4W_REPORT_VERIFICATION_FAILED')}\n`);
    process.exitCode = 1;
  });
}

module.exports = { verifyReport, repositorySelfTest };
