#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const routeHandlers = require('../backend/modules/communities/route-handlers');

const root = path.join(__dirname, '..');
const recovery = require('../config/com-b04i-r1-remote-node-execution-path-recovery.json');
const readinessEvidence = require('../docs/validation/COM-B04I-ATTEMPT-2-READINESS.json');
const triggerPath = process.env.COM_B04I_R1_TRIGGER_PATH ||
  'config/com-b04i-r1-remote-node-execution-trigger-v3.json';
const trigger = require(path.join(root, triggerPath));
const reportPath = path.resolve(process.env.COM_B04I_R1_REPORT_PATH ||
  'reports/generated/COM-B04I-R1-REMOTE-NODE-EXECUTION-PATH-RECOVERY.json');

function exact(actual, expected, code) {
  if (actual !== expected) {
    const error = new Error(code);
    error.code = code;
    throw error;
  }
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

async function run() {
  exact(process.env.GITHUB_ACTIONS, 'true', 'COM_B04I_R1_GITHUB_ACTIONS_REQUIRED');
  exact(process.env.GITHUB_EVENT_NAME, 'push', 'COM_B04I_R1_PUSH_EVENT_REQUIRED');
  exact(process.env.GITHUB_REF_NAME, 'com/com-001-baseline-audit', 'COM_B04I_R1_BRANCH_MISMATCH');
  exact(String(process.env.GITHUB_RUN_ATTEMPT || ''), '1', 'COM_B04I_R1_FIRST_RUN_ATTEMPT_REQUIRED');
  exact(recovery.contractId, 'com-b04i-r1-remote-node-execution-path-recovery-v1', 'COM_B04I_R1_CONTRACT_MISMATCH');
  exact(recovery.status, 'recovery_workflow_revision_3_installation_pending_trigger', 'COM_B04I_R1_RECOVERY_STATUS_INVALID');
  exact(trigger.contractId, 'com-b04i-r1-remote-node-execution-trigger-v3', 'COM_B04I_R1_TRIGGER_CONTRACT_MISMATCH');
  exact(trigger.status, 'recovery_retry_trigger_created', 'COM_B04I_R1_TRIGGER_STATUS_INVALID');
  exact(trigger.revision, 3, 'COM_B04I_R1_TRIGGER_REVISION_INVALID');
  exact(trigger.sourceHead, recovery.sourceHead, 'COM_B04I_R1_SOURCE_HEAD_MISMATCH');
  exact(trigger.workflowInstallHead, git('rev-parse', 'HEAD^'), 'COM_B04I_R1_PARENT_NOT_WORKFLOW_INSTALL_HEAD');
  exact(process.env.GITHUB_SHA, git('rev-parse', 'HEAD'), 'COM_B04I_R1_CHECKOUT_SHA_MISMATCH');
  exact(trigger.triggerCommitExpectedToBeHead, true, 'COM_B04I_R1_TRIGGER_HEAD_REQUIRED');
  exact(trigger.secretsAllowed, false, 'COM_B04I_R1_SECRETS_PROHIBITED');
  exact(trigger.stagingAccessAllowed, false, 'COM_B04I_R1_STAGING_ACCESS_PROHIBITED');

  const workflowAtParent = git(
    'show',
    'HEAD^:.github/workflows/com-b04i-r1-remote-node-execution-path-recovery.yml'
  );
  assert.ok(workflowAtParent.includes('COM-B04I-R1 Remote Node Execution Path Recovery'));
  assert.ok(workflowAtParent.includes('config/com-b04i-r1-remote-node-execution-trigger-v3.json'));

  exact(readinessEvidence.contractId, 'com-b04i-attempt-2-readiness-v1', 'COM_B04I_R1_READINESS_EVIDENCE_CONTRACT_INVALID');
  exact(readinessEvidence.certification.result, 'success', 'COM_B04I_R1_READINESS_EVIDENCE_NOT_CERTIFIED');
  exact(readinessEvidence.certification.localConformance, '28/28', 'COM_B04I_R1_READINESS_CONFORMANCE_INVALID');
  exact(readinessEvidence.certification.readinessAudit, '58/58', 'COM_B04I_R1_READINESS_AUDIT_INVALID');
  exact(readinessEvidence.effects.stagingAccessed, false, 'COM_B04I_R1_READINESS_STAGING_EFFECT_INVALID');

  let defaultHandlerStatus = null;
  let defaultHandlerCode = null;
  try {
    await routeHandlers.executeModerationCommand({
      actor: { id: 'forged' },
      body: { command: 'open_case' }
    });
    throw new Error('COM_B04I_R1_DEFAULT_HANDLER_MUST_FAIL_CLOSED');
  } catch (error) {
    defaultHandlerStatus = error && error.status;
    defaultHandlerCode = error && error.code;
  }
  exact(defaultHandlerStatus, 503, 'COM_B04I_R1_DEFAULT_HANDLER_STATUS_INVALID');
  exact(defaultHandlerCode, 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED', 'COM_B04I_R1_DEFAULT_HANDLER_CODE_INVALID');

  const localConformance = execFileSync(
    process.execPath,
    ['scripts/test-com-b04i-staging-live-composition-route-canary.js'],
    { cwd: root, encoding: 'utf8' }
  ).trim();
  assert.ok(localConformance.includes('COM-B04I staging live composition route canary passed: 28/28'));

  const report = {
    validationId: 'COM-B04I-R1-REMOTE-NODE-EXECUTION-PATH-RECOVERY',
    contractId: recovery.contractId,
    status: 'remote_node_execution_path_recovered',
    execution: {
      recoveryRevision: trigger.revision,
      repository: process.env.GITHUB_REPOSITORY,
      event: process.env.GITHUB_EVENT_NAME,
      branch: process.env.GITHUB_REF_NAME,
      head: process.env.GITHUB_SHA,
      workflowInstallHead: trigger.workflowInstallHead,
      runId: Number(process.env.GITHUB_RUN_ID),
      runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT),
      runnerOs: process.env.RUNNER_OS,
      nodeVersion: process.version,
      remoteNodeProcessExecuted: true,
      exactTriggerCommitCheckedOut: true,
      parentMatchesWorkflowInstallHead: true,
      defaultHandlerExecuted: true,
      defaultHandlerStatus,
      defaultHandlerCode,
      localCanaryConformance: '28/28',
      attempt2ReadinessEvidence: 'certified 58/58',
      artifactRequested: true
    },
    priorRecoveryAttempts: recovery.recoveryAttempts,
    effects: {
      secretsRead: false,
      stagingAccessed: false,
      databaseAccessed: false,
      runtimeDeployed: false,
      publicTrafficEnabled: false,
      realModerationExecuted: false,
      productionChanged: false,
      pullRequestMerged: false
    },
    qualification: {
      githubActionsPushPathRecovered: true,
      remoteNodeHandlerProcessProved: true,
      stagingEndToEndRouteCertified: false,
      attempt3AuthorizationGranted: false
    },
    completedAt: new Date().toISOString()
  };

  writeReport(report);
  console.log('COM-B04I-R1 remote Node execution path recovered.');
  console.log(JSON.stringify({
    status: report.status,
    head: report.execution.head,
    runId: report.execution.runId,
    defaultHandlerStatus,
    stagingAccessed: false
  }));
}

run().catch((error) => {
  const code = String(error && (error.code || error.message) || 'COM_B04I_R1_UNEXPECTED_FAILURE');
  writeReport({
    validationId: 'COM-B04I-R1-REMOTE-NODE-EXECUTION-PATH-RECOVERY',
    contractId: recovery.contractId,
    status: 'failed_closed',
    failure: { code },
    effects: {
      secretsRead: false,
      stagingAccessed: false,
      databaseAccessed: false,
      runtimeDeployed: false,
      publicTrafficEnabled: false,
      productionChanged: false,
      pullRequestMerged: false
    },
    completedAt: new Date().toISOString()
  });
  console.error(code);
  process.exit(1);
});
