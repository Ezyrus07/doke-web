#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const json = (relative) => JSON.parse(read(relative));
let checks = 0;
const ok = (value, label) => { checks += 1; assert.ok(value, label); };
const equal = (actual, expected, label) => { checks += 1; assert.deepStrictEqual(actual, expected, label); };

const files = Object.freeze({
  config: 'config/com-b04i-r1-remote-node-execution-path-recovery.json',
  executor: 'scripts/execute-com-b04i-r1-remote-node-execution-path-recovery.js',
  audit: 'scripts/audit-com-b04i-r1-remote-node-execution-path-recovery.js',
  doc: 'docs/COM-B04I-R1-REMOTE-NODE-EXECUTION-PATH-RECOVERY.md',
  evidence: 'docs/validation/COM-B04I-R1-REMOTE-NODE-EXECUTION-PATH-RECOVERY.json',
  workflow: '.github/workflows/com-b04i-r1-remote-node-execution-path-recovery.yml',
  attempt1: 'config/com-b04i-staging-live-composition-route-canary.json',
  attempt2Readiness: 'config/com-b04i-attempt-2-readiness.json',
  attempt2Evidence: 'docs/validation/COM-B04I-ATTEMPT-2-READINESS.json',
  splitEvidence: 'docs/validation/COM-B04I-ATTEMPT-2-STAGING-LIVE-COMPOSITION-ROUTE-CANARY.json',
  handlers: 'backend/modules/communities/route-handlers.js',
  matrix: 'config/domain-completion-matrix.json'
});

for (const file of Object.values(files)) {
  ok(fs.existsSync(path.join(root, file)), `required file: ${file}`);
}

const config = json(files.config);
const executor = read(files.executor);
const workflow = read(files.workflow);
const doc = read(files.doc);
const evidence = json(files.evidence);
const attempt1 = json(files.attempt1);
const attempt2Readiness = json(files.attempt2Readiness);
const attempt2Evidence = json(files.attempt2Evidence);
const splitEvidence = json(files.splitEvidence);
const handlers = read(files.handlers);
const matrix = json(files.matrix);

equal(config.contractId, 'com-b04i-r1-remote-node-execution-path-recovery-v1', 'contract');
equal(config.scope, 'repository_only_remote_node_execution_path_recovery', 'scope');
equal(config.status, 'recovery_workflow_revision_3_installation_pending_trigger', 'status');
equal(config.sourceHead, '61cc9f7c2f90e841498f545fd2cddc7236e3b420', 'source head');
equal(config.problem.attempt2AuthorizationConsumed, true, 'attempt 2 consumed');
equal(config.problem.attempt2AuthorizationReusable, false, 'attempt 2 not reusable');
equal(config.problem.workflowRunMaterializedForExactTrigger, false, 'historical attempt-2 run absent');
equal(config.problem.remoteNodeExecutorStarted, false, 'historical attempt-2 executor absent');
equal(config.problem.splitPersistenceCanaryPassed, true, 'split persistence passed');
equal(config.problem.endToEndLiveRouteCertified, false, 'end-to-end not certified');
equal(config.recoveryAttempts.length, 2, 'two prior recovery attempts');
equal(config.recoveryAttempts[0].run, 31137291437, 'recovery attempt 1 run');
equal(config.recoveryAttempts[0].remoteNodeExecutorStarted, false, 'attempt 1 executor false');
equal(config.recoveryAttempts[1].run, 31137679848, 'recovery attempt 2 run');
equal(config.recoveryAttempts[1].repositoryAudit, '107/107', 'attempt 2 audit passed');
equal(config.recoveryAttempts[1].remoteNodeExecutorStarted, true, 'attempt 2 executor started');
equal(config.recoveryAttempts[1].artifactCreated, true, 'attempt 2 artifact created');
equal(config.recoveryAttempts[1].stagingAccessed, false, 'attempt 2 no staging');
equal(config.recoveryMechanism.workflowPreinstalledBeforeTrigger, true, 'preinstall workflow');
equal(config.recoveryMechanism.triggerCreatedInSeparateCommit, true, 'separate trigger');
equal(config.recoveryMechanism.triggerPath, 'config/com-b04i-r1-remote-node-execution-trigger-v3.json', 'revision-3 trigger path');
equal(config.recoveryMechanism.historicalReadinessEvidenceValidation, true, 'evidence validation enabled');
equal(config.recoveryMechanism.historicalReadinessAuditReexecution, false, 'stale audit not rerun');
equal(config.recoveryMechanism.secretsRequired, false, 'no secrets');
equal(config.recoveryMechanism.environmentRequired, false, 'no environment');
equal(config.recoveryMechanism.stagingAccessAllowed, false, 'no staging');
equal(config.authority.remoteRepositoryRunnerAuthority, true, 'runner authority only');
for (const [key, value] of Object.entries(config.authority)) {
  if (key !== 'remoteRepositoryRunnerAuthority') equal(value, false, `authority false: ${key}`);
}

for (const marker of [
  'GITHUB_ACTIONS', 'GITHUB_EVENT_NAME', 'GITHUB_REF_NAME', 'GITHUB_RUN_ATTEMPT',
  "git('rev-parse', 'HEAD^')", 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED',
  'test-com-b04i-staging-live-composition-route-canary.js',
  'COM-B04I-ATTEMPT-2-READINESS.json',
  'remote_node_execution_path_recovered',
  'stagingAccessed: false', 'productionChanged: false', 'pullRequestMerged: false'
]) ok(executor.includes(marker), `executor marker: ${marker}`);

for (const forbidden of [
  'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'SUPABASE_SERVICE_ROLE_KEY',
  'createClient(', '.rpc(', '.from(', 'psql ', 'supabase db', 'supabase functions'
]) ok(!executor.includes(forbidden), `executor remote marker absent: ${forbidden}`);

for (const marker of [
  'COM-B04I-R1 Remote Node Execution Path Recovery',
  'config/com-b04i-r1-remote-node-execution-trigger-v3.json',
  'node scripts/execute-com-b04i-r1-remote-node-execution-path-recovery.js',
  'node scripts/audit-com-b04i-r1-remote-node-execution-path-recovery.js',
  'actions/upload-artifact@v4',
  'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED',
  'git diff --check'
]) ok(workflow.includes(marker), `workflow marker: ${marker}`);

for (const forbidden of [
  'environment: staging', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD',
  'workflow_dispatch', 'repository_dispatch', 'supabase db', 'psql ', 'curl '
]) ok(!workflow.includes(forbidden), `workflow forbidden marker absent: ${forbidden}`);

for (const marker of [
  'COM-B04I-R1', 'workflow preinstalled before trigger', 'separate commit',
  'remote Node process', 'HTTP 503', 'staging accessed: false',
  'production changed: false', 'pull request merged: false'
]) ok(doc.includes(marker), `doc marker: ${marker}`);

equal(evidence.contractId, config.contractId, 'evidence contract');
ok([
  'recovery_workflow_installation_pending_trigger',
  'recovery_workflow_revision_2_installation_pending_trigger',
  'recovery_workflow_revision_3_installation_pending_trigger'
].includes(evidence.status), 'evidence pending lifecycle status');
equal(evidence.effects.stagingAccessed, false, 'evidence staging false');
equal(evidence.effects.productionChanged, false, 'evidence production false');
equal(evidence.effects.pullRequestMerged, false, 'evidence merge false');

equal(attempt1.authorization.consumed, true, 'attempt 1 consumed');
equal(attempt1.authorization.reusableAfterFailure, false, 'attempt 1 not reusable');
equal(attempt2Readiness.status, 'repository_ready_new_explicit_authorization_required', 'attempt 2 readiness retained');
equal(attempt2Evidence.certification.result, 'success', 'attempt 2 readiness certified');
equal(attempt2Evidence.certification.localConformance, '28/28', 'attempt 2 conformance evidence');
equal(attempt2Evidence.certification.readinessAudit, '58/58', 'attempt 2 audit evidence');
equal(splitEvidence.status, 'split_canary_passed_full_node_route_not_executed', 'split canary evidence retained');
equal(splitEvidence.execution.githubActionsNodeExecutorStarted, false, 'remote Node executor remained absent in split');
equal(splitEvidence.proof.transactionRolledBack, true, 'split transaction rolled back');
equal(splitEvidence.proof.persistentResidue, false, 'split residue false');
equal(splitEvidence.scopeQualification.remoteNodeHandlerExecuted, false, 'remote handler not executed in split');
equal(splitEvidence.scopeQualification.endToEndLiveRouteCertified, false, 'split not end-to-end');
ok(handlers.includes("const FAILURE_CODE = 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED'"), 'default handler fail closed');

equal(matrix.version, '1.3.112', 'matrix unchanged');
const com = matrix.domains.find((entry) => entry.id === 'COM-001');
ok(com, 'COM domain exists');
equal(com.maturity, 3, 'maturity unchanged');
equal(com.serverAuthority, 'partial', 'server authority partial');
equal(com.productionGate, 'blocked', 'production blocked');

console.log(`COM-B04I-R1 recovery audit passed: ${checks}/${checks}`);
