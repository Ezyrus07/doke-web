#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const boundary = require('../backend/modules/communities/community-realtime-private-auth-r5d-hosted-execution');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function readReport(file) {
  if (!file || !fs.existsSync(file)) fail('DOKE_COM_B03C_R5D_HOSTED_REPORT_REQUIRED');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    fail('DOKE_COM_B03C_R5D_HOSTED_REPORT_JSON_INVALID');
  }
}

function containsForbiddenKey(value, pathParts = []) {
  if (!value || typeof value !== 'object') return null;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase();
    if (
      normalized === 'email' ||
      normalized === 'password' ||
      normalized === 'accesstoken' ||
      normalized === 'access_token' ||
      normalized === 'secretkey' ||
      normalized === 'secret_key' ||
      normalized === 'credentials' ||
      normalized === 'authorizationphrase' ||
      normalized === 'rawremoteerror'
    ) {
      return [...pathParts, key].join('.');
    }
    const nested = containsForbiddenKey(child, [...pathParts, key]);
    if (nested) return nested;
  }
  return null;
}

function verifyReport(report) {
  if (!report || report.schema !== boundary.REPORT_SCHEMA) {
    fail('DOKE_COM_B03C_R5D_HOSTED_REPORT_SCHEMA_REQUIRED');
  }
  if (
    report.validationId !== 'COM-B03C-R5D-CORRECTED-TERMINAL-OBSERVATION-HOSTED-EXECUTION' ||
    report.executionBoundaryContractId !== boundary.CONTRACT_ID ||
    report.r5dContractId !== 'com-b03c-r5d-corrected-terminal-observation-execution-envelope-v1' ||
    report.r5hContractId !== 'com-b03c-r5h-r5g-bound-single-use-r5d-trigger-certification-v1'
  ) {
    fail('DOKE_COM_B03C_R5D_HOSTED_REPORT_CONTRACT_BINDING_REQUIRED');
  }
  if (
    report.target?.environment !== 'staging' ||
    report.target?.projectId !== boundary.TARGET_STAGING_PROJECT ||
    report.target?.branch !== boundary.TARGET_BRANCH ||
    report.target?.pullRequest !== boundary.TARGET_PR
  ) {
    fail('DOKE_COM_B03C_R5D_HOSTED_REPORT_TARGET_REQUIRED');
  }
  if (
    report.singleUse !== true ||
    report.reusableAfterFailure !== false ||
    report.runAttempt !== 1 ||
    typeof report.authorizedBoundaryHead !== 'string' ||
    !/^[0-9a-f]{40}$/.test(report.authorizedBoundaryHead) ||
    typeof report.executionAuthorizationReceiptId !== 'string' ||
    !/^[0-9a-f]{64}$/.test(report.executionAuthorizationReceiptId)
  ) {
    fail('DOKE_COM_B03C_R5D_HOSTED_REPORT_SINGLE_USE_BINDING_REQUIRED');
  }
  if (
    report.r5hCertifiedHead !== boundary.R5H_CERTIFIED_HEAD ||
    report.r5dCertifiedHead !== boundary.R5D_CERTIFIED_HEAD ||
    report.r5fAuthorizationReceiptId !== boundary.R5F_RECEIPT_ID ||
    report.frozenTriggerPath !== boundary.TRIGGER_PATH ||
    report.frozenTriggerBlob !== boundary.TRIGGER_BLOB ||
    report.correctedBridgeBlob !== boundary.CORRECTED_BRIDGE_BLOB ||
    report.correctedBridgeSemanticsFingerprint !== boundary.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT
  ) {
    fail('DOKE_COM_B03C_R5D_HOSTED_REPORT_FROZEN_LINEAGE_REQUIRED');
  }

  const terminalStatuses = new Set(['SUBSCRIBED', 'CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED', 'UNKNOWN']);
  if (!terminalStatuses.has(report.terminalStatus)) {
    fail('DOKE_COM_B03C_R5D_HOSTED_TERMINAL_STATUS_REQUIRED');
  }
  if (typeof report.sanitizedJoinClassification !== 'string' || !report.sanitizedJoinClassification) {
    fail('DOKE_COM_B03C_R5D_HOSTED_SANITIZED_CLASSIFICATION_REQUIRED');
  }
  if (
    !Array.isArray(report.correctedBridgeTrace) ||
    JSON.stringify(report.correctedBridgeTrace) !==
      JSON.stringify(['observation_started', 'observation_settled', 'cleanup_started', 'cleanup_finished'])
  ) {
    fail('DOKE_COM_B03C_R5D_HOSTED_CORRECTED_BRIDGE_TRACE_REQUIRED');
  }

  if (
    report.executionAuthorizationConsumed !== true ||
    report.triggerCreated !== true ||
    report.triggerCertified !== true ||
    report.executionAttempted !== true ||
    report.networkAccess !== true ||
    report.stagingReadAccess !== true ||
    report.stagingMutationAccess !== true ||
    report.databaseQueryAgainstRemote !== true ||
    report.realtimeSubscriptionAttempted !== true ||
    report.authIdentityMutation !== true ||
    report.identityCreated !== true ||
    report.identityCleanupAttempted !== true ||
    report.identityCleanupSucceeded !== true ||
    report.zeroResidueProven !== true ||
    report.correctedTerminalObservationExecuted !== true
  ) {
    fail('DOKE_COM_B03C_R5D_HOSTED_EXECUTION_COMPLETION_REQUIRED');
  }

  if (
    !report.residueCounts ||
    report.residueCounts.authUsers !== 0 ||
    report.residueCounts.publicUsers !== 0 ||
    report.residueCounts.userProfiles !== 0 ||
    report.residueCounts.clientProfiles !== 0
  ) {
    fail('DOKE_COM_B03C_R5D_HOSTED_ZERO_RESIDUE_REQUIRED');
  }

  if (
    report.authorizationPlaintextPersisted !== false ||
    report.credentialValuesPersisted !== false ||
    report.rawAccessTokenPersisted !== false ||
    report.rawIdentityPersisted !== false ||
    report.rawRemoteErrorExposed !== false ||
    report.runtimeChangeExecuted !== false ||
    report.productionExecuted !== false ||
    report.mergeExecuted !== false ||
    report.exactRootCauseProven !== false ||
    report.causalPromotionAllowed !== false
  ) {
    fail('DOKE_COM_B03C_R5D_HOSTED_FAIL_CLOSED_REPORT_REQUIRED');
  }

  if (report.executionFailure !== null) {
    fail('DOKE_COM_B03C_R5D_HOSTED_EXECUTION_FAILURE_PRESENT');
  }

  const forbidden = containsForbiddenKey(report);
  if (forbidden) {
    fail('DOKE_COM_B03C_R5D_HOSTED_SENSITIVE_REPORT_FIELD_FORBIDDEN');
  }

  return Object.freeze({
    validationId: 'COM-B03C-R5D-CORRECTED-TERMINAL-OBSERVATION-HOSTED-EXECUTION-REPORT-VERIFICATION',
    executionBoundaryContractId: boundary.CONTRACT_ID,
    authorizedBoundaryHead: report.authorizedBoundaryHead,
    executionAuthorizationReceiptId: report.executionAuthorizationReceiptId,
    terminalStatus: report.terminalStatus,
    joinSubscribed: report.joinSubscribed === true,
    sanitizedJoinClassification: report.sanitizedJoinClassification,
    identityCleanupSucceeded: true,
    zeroResidueProven: true,
    rawRemoteErrorExposed: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function repositorySelfTest() {
  const head = '1111111111111111111111111111111111111111';
  const sample = {
    schema: boundary.REPORT_SCHEMA,
    validationId: 'COM-B03C-R5D-CORRECTED-TERMINAL-OBSERVATION-HOSTED-EXECUTION',
    executionBoundaryContractId: boundary.CONTRACT_ID,
    r5dContractId: 'com-b03c-r5d-corrected-terminal-observation-execution-envelope-v1',
    r5hContractId: 'com-b03c-r5h-r5g-bound-single-use-r5d-trigger-certification-v1',
    target: {
      environment: 'staging',
      projectId: boundary.TARGET_STAGING_PROJECT,
      branch: boundary.TARGET_BRANCH,
      pullRequest: boundary.TARGET_PR
    },
    singleUse: true,
    reusableAfterFailure: false,
    runAttempt: 1,
    authorizedBoundaryHead: head,
    executionAuthorizationReceiptId: boundary.deriveAuthorizationReceiptId({
      certifiedBoundaryHead: head
    }),
    r5hCertifiedHead: boundary.R5H_CERTIFIED_HEAD,
    r5dCertifiedHead: boundary.R5D_CERTIFIED_HEAD,
    r5fAuthorizationReceiptId: boundary.R5F_RECEIPT_ID,
    frozenTriggerPath: boundary.TRIGGER_PATH,
    frozenTriggerBlob: boundary.TRIGGER_BLOB,
    correctedBridgeBlob: boundary.CORRECTED_BRIDGE_BLOB,
    correctedBridgeSemanticsFingerprint: boundary.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    authorizationPlaintextPersisted: false,
    credentialValuesPersisted: false,
    rawAccessTokenPersisted: false,
    rawIdentityPersisted: false,
    rawRemoteErrorExposed: false,
    runtimeChangeExecuted: false,
    productionExecuted: false,
    mergeExecuted: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    executionAuthorizationConsumed: true,
    triggerCreated: true,
    triggerCertified: true,
    executionAttempted: true,
    credentialReads: 3,
    dependencyLoads: 2,
    networkAccess: true,
    stagingReadAccess: true,
    stagingMutationAccess: true,
    databaseQueryAgainstRemote: true,
    realtimeSubscriptionAttempted: true,
    authIdentityMutation: true,
    identityCreated: true,
    identityCleanupAttempted: true,
    identityCleanupSucceeded: true,
    residueCounts: {
      authUsers: 0,
      publicUsers: 0,
      userProfiles: 0,
      clientProfiles: 0
    },
    zeroResidueProven: true,
    correctedBridgeTrace: [
      'observation_started',
      'observation_settled',
      'cleanup_started',
      'cleanup_finished'
    ],
    terminalStatus: 'CHANNEL_ERROR',
    joinSubscribed: false,
    sanitizedJoinClassification: 'realtime_rls_authorization_rejected',
    executionFailure: null,
    correctedTerminalObservationExecuted: true
  };
  const verified = verifyReport(sample);

  const unsafe = JSON.parse(JSON.stringify(sample));
  unsafe.email = 'forbidden@example.invalid';
  let unsafeRejected = false;
  try {
    verifyReport(unsafe);
  } catch (error) {
    unsafeRejected = error?.code === 'DOKE_COM_B03C_R5D_HOSTED_SENSITIVE_REPORT_FIELD_FORBIDDEN';
  }
  if (!unsafeRejected) {
    fail('DOKE_COM_B03C_R5D_HOSTED_SENSITIVE_FIELD_SELF_TEST_FAILED');
  }

  return {
    validationId: 'COM-B03C-R5D-HOSTED-EXECUTION-VERIFIER-REPOSITORY-SELF-TEST',
    executionBoundaryContractId: boundary.CONTRACT_ID,
    reportVerificationPassed: true,
    sensitiveFieldRejectionPassed: true,
    terminalStatus: verified.terminalStatus,
    zeroResidueProven: verified.zeroResidueProven,
    rawRemoteErrorExposed: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  };
}

if (require.main === module) {
  try {
    if (process.argv.includes('--repository-self-test')) {
      process.stdout.write(`${JSON.stringify(repositorySelfTest())}\n`);
    } else {
      const file = path.resolve(process.argv[2] || '');
      process.stdout.write(`${JSON.stringify(verifyReport(readReport(file)))}\n`);
    }
  } catch (error) {
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R5D_HOSTED_VERIFIER_FAILURE')}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  readReport,
  containsForbiddenKey,
  verifyReport,
  repositorySelfTest
};
