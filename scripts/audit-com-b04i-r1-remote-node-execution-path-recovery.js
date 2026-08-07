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
  certificationWorkflow: '.github/workflows/com-b04i-r1-remote-node-execution-path-certification.yml',
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
const certificationWorkflow = read(files.certificationWorkflow);
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
equal(config.status, 'remote_node_execution_path_recovered_certified', 'certified status');
equal(config.sourceHead, '61cc9f7c2f90e841498f545fd2cddc7236e3b420', 'source head');
equal(config.problem.attempt2AuthorizationConsumed, true, 'attempt 2 consumed');
equal(config.problem.attempt2AuthorizationReusable, false, 'attempt 2 not reusable');
equal(config.problem.splitPersistenceCanaryPassed, true, 'split persistence passed');
equal(config.problem.endToEndLiveRouteCertified, false, 'end-to-end remains uncertified');

equal(config.recoveryAttempts.length, 3, 'three recovery revisions');
equal(config.recoveryAttempts[0].run, 31137291437, 'revision 1 run');
equal(config.recoveryAttempts[0].remoteNodeExecutorStarted, false, 'revision 1 executor false');
equal(config.recoveryAttempts[0].stagingAccessed, false, 'revision 1 no staging');
equal(config.recoveryAttempts[1].run, 31137679848, 'revision 2 run');
equal(config.recoveryAttempts[1].repositoryAudit, '107/107', 'revision 2 audit');
equal(config.recoveryAttempts[1].remoteNodeExecutorStarted, true, 'revision 2 executor started');
equal(config.recoveryAttempts[1].artifactId, 8978678207, 'revision 2 artifact');
equal(config.recoveryAttempts[1].stagingAccessed, false, 'revision 2 no staging');
const success = config.recoveryAttempts[2];
equal(success.revision, 3, 'revision 3');
equal(success.workflowInstallHead, '6b2f7c746fb3e0a844d7843014d5c1f56e5fd610', 'revision 3 workflow head');
equal(success.triggerHead, '0ea0b4df31725dc2164cd19e25d47e7a211aaf8b', 'revision 3 trigger head');
equal(success.run, 31138130568, 'revision 3 run');
equal(success.job, 92742048610, 'revision 3 job');
equal(success.workflowRunCreated, true, 'revision 3 run created');
equal(success.exactTriggerCommitCheckedOut, true, 'revision 3 exact checkout');
equal(success.parentBindingPassed, true, 'revision 3 parent binding');
equal(success.repositoryAudit, '115/115', 'revision 3 audit');
equal(success.remoteNodeExecutorStarted, true, 'revision 3 executor started');
equal(success.remoteNodeProcessExecuted, true, 'revision 3 Node process');
equal(success.defaultHandlerStatus, 503, 'revision 3 handler status');
equal(success.defaultHandlerCode, 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED', 'revision 3 handler code');
equal(success.localCanaryConformance, '28/28', 'revision 3 conformance');
equal(success.attempt2ReadinessEvidence, 'certified 58/58', 'revision 3 readiness evidence');
equal(success.artifactId, 8978795625, 'revision 3 artifact');
equal(success.artifactDigest, 'sha256:0257670a8e284497ef7f32797b3e7c738c40c166cb02bd9ffc645f432a99f3a5', 'revision 3 digest');
equal(success.stagingAccessed, false, 'revision 3 no staging');
equal(success.result, 'success', 'revision 3 result');

equal(config.recoveryMechanism.workflowPreinstalledBeforeTrigger, true, 'workflow preinstalled');
equal(config.recoveryMechanism.triggerCreatedInSeparateCommit, true, 'separate trigger');
equal(config.recoveryMechanism.workflowArchivedAfterCertification, true, 'workflow archived');
equal(config.recoveryMechanism.archivedTriggerPath, 'config/com-b04i-r1-archived-never-trigger.json', 'archive path');
equal(config.recoveryMechanism.secretsRequired, false, 'no secrets');
equal(config.recoveryMechanism.environmentRequired, false, 'no environment');
equal(config.recoveryMechanism.stagingAccessAllowed, false, 'no staging');

for (const [key, value] of Object.entries(config.authority)) {
  equal(value, false, `closed authority: ${key}`);
}

equal(config.certification.candidateHead, '0ea0b4df31725dc2164cd19e25d47e7a211aaf8b', 'certified candidate head');
equal(config.certification.run, 31138130568, 'certified run');
equal(config.certification.job, 92742048610, 'certified job');
equal(config.certification.artifactId, 8978795625, 'certified artifact');
equal(config.certification.result, 'success', 'certification result');
equal(config.certification.repositoryAudit, '115/115', 'certification audit');
equal(config.certification.localCanaryConformance, '28/28', 'certification conformance');
equal(config.certification.comB04HRegression, '121/121 + 159/159', 'B04H regression');
equal(config.certification.comB04GRegression, '95/95 + 159/159', 'B04G regression');

for (const marker of [
  'GITHUB_ACTIONS', 'GITHUB_EVENT_NAME', 'GITHUB_REF_NAME',
  'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED',
  'test-com-b04i-staging-live-composition-route-canary.js',
  'COM-B04I-ATTEMPT-2-READINESS.json',
  'remote_node_execution_path_recovered',
  'stagingAccessed: false', 'productionChanged: false', 'pullRequestMerged: false'
]) ok(executor.includes(marker), `executor marker: ${marker}`);
for (const forbidden of [
  'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'SUPABASE_SERVICE_ROLE_KEY',
  'createClient(', '.rpc(', '.from(', 'psql ', 'supabase db', 'supabase functions'
]) ok(!executor.includes(forbidden), `executor remote marker absent: ${forbidden}`);

ok(workflow.includes('COM-B04I-R1 Archived Remote Node Recovery'), 'recovery workflow archived');
ok(workflow.includes('config/com-b04i-r1-archived-never-trigger.json'), 'archive trigger path');
for (const forbidden of ['environment: staging', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD']) {
  ok(!workflow.includes(forbidden), `archived workflow forbidden marker absent: ${forbidden}`);
  ok(!certificationWorkflow.includes(forbidden), `certification workflow forbidden marker absent: ${forbidden}`);
}
for (const marker of [
  'COM-B04I-R1 Remote Node Recovery Certification',
  'COM-B04I-R1 certified lifecycle audit',
  'Local handler composition conformance',
  'Default handler remains fail closed',
  'COM-B04H regression', 'COM-B04G regression', 'git diff --check'
]) ok(certificationWorkflow.includes(marker), `certification workflow marker: ${marker}`);

for (const marker of [
  'COM-B04I-R1', 'remote Node execution path recovered',
  'run: 31138130568', 'job: 92742048610',
  'artifact ID: 8978795625', 'HTTP 503',
  'staging accessed: false', 'production changed: false',
  'pull request merged: false', 'COM-B04I-R2'
]) ok(doc.includes(marker), `doc marker: ${marker}`);

equal(evidence.contractId, config.contractId, 'evidence contract');
equal(evidence.status, 'remote_node_execution_path_recovered_certified', 'evidence status');
equal(evidence.certification.candidateHead, config.certification.candidateHead, 'evidence head');
equal(evidence.certification.run, config.certification.run, 'evidence run');
equal(evidence.certification.job, config.certification.job, 'evidence job');
equal(evidence.certification.artifactId, config.certification.artifactId, 'evidence artifact');
equal(evidence.certification.artifactDigest, config.certification.artifactDigest, 'evidence digest');
equal(evidence.certification.defaultHandlerStatus, 503, 'evidence handler status');
equal(evidence.certification.defaultHandlerCode, 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED', 'evidence handler code');
equal(evidence.qualification.githubActionsPushPathRecovered, true, 'push path recovered');
equal(evidence.qualification.remoteNodeHandlerProcessProved, true, 'Node process proved');
equal(evidence.qualification.stagingEndToEndRouteCertified, false, 'staging route not certified');
equal(evidence.qualification.attempt3AuthorizationGranted, false, 'attempt 3 not authorized');
for (const [key, value] of Object.entries(evidence.effects)) {
  if (key !== 'repositoryRecoveryFilesChanged') equal(value, false, `evidence effect false: ${key}`);
}

equal(attempt1.authorization.consumed, true, 'attempt 1 consumed');
equal(attempt1.authorization.reusableAfterFailure, false, 'attempt 1 not reusable');
equal(attempt2Readiness.status, 'repository_ready_new_explicit_authorization_required', 'attempt 2 readiness retained');
equal(attempt2Evidence.certification.result, 'success', 'attempt 2 readiness certified');
equal(attempt2Evidence.certification.localConformance, '28/28', 'attempt 2 conformance evidence');
equal(attempt2Evidence.certification.readinessAudit, '58/58', 'attempt 2 audit evidence');
equal(splitEvidence.status, 'split_canary_passed_full_node_route_not_executed', 'split canary retained');
equal(splitEvidence.proof.transactionRolledBack, true, 'split rollback');
equal(splitEvidence.proof.persistentResidue, false, 'split residue false');
equal(splitEvidence.scopeQualification.endToEndLiveRouteCertified, false, 'split remains qualified');
ok(handlers.includes("const FAILURE_CODE = 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED'"), 'default handler fail closed');

equal(matrix.version, '1.3.112', 'matrix unchanged');
const com = matrix.domains.find((entry) => entry.id === 'COM-001');
ok(com, 'COM domain exists');
equal(com.maturity, 3, 'maturity unchanged');
equal(com.serverAuthority, 'partial', 'server authority partial');
equal(com.productionGate, 'blocked', 'production blocked');

console.log(`COM-B04I-R1 certified recovery audit passed: ${checks}/${checks}`);
