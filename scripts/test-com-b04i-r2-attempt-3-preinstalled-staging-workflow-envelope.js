#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const configPath = path.join(root, 'config/com-b04i-r2-attempt-3-preinstalled-staging-workflow-readiness.json');
const triggerPath = path.join(root, 'config/com-b04i-r2-attempt-3-staging-trigger.json');
const r1Path = path.join(root, 'config/com-b04i-r1-remote-node-execution-path-recovery.json');
const matrixPath = path.join(root, 'config/domain-completion-matrix.json');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const r1 = JSON.parse(fs.readFileSync(r1Path, 'utf8'));
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
let checks = 0;
const equal = (actual, expected, label) => { checks += 1; assert.deepStrictEqual(actual, expected, label); };
const ok = (value, label) => { checks += 1; assert.ok(value, label); };

const phrase = 'I_EXPLICITLY_AUTHORIZE_COM_B04I_ATTEMPT_3_STAGING_LIVE_COMPOSITION_ACTIVATION_AND_ROLLBACK_ONLY_ROUTE_CANARY';

equal(config.contractId, 'com-b04i-r2-attempt-3-preinstalled-staging-workflow-readiness-v1', 'contract');
equal(config.domain, 'COM-001', 'domain');
equal(config.scope, 'repository_only_attempt3_authorization_envelope_and_preinstalled_staging_workflow_readiness', 'scope');
equal(config.status, 'repository_ready_attempt3_authorization_required', 'status');
equal(config.sourceHead, 'e4e42aa85020fc42e55fd94996116f637b706f67', 'source head');

equal(config.predecessor.contractId, 'com-b04i-r1-remote-node-execution-path-recovery-v1', 'R1 contract');
equal(config.predecessor.status, 'remote_node_execution_path_recovered_certified', 'R1 status');
equal(config.predecessor.certifiedHead, 'e4e42aa85020fc42e55fd94996116f637b706f67', 'R1 certified head');
equal(config.predecessor.certificationRun, 31138867230, 'R1 run');
equal(config.predecessor.certificationJob, 92744275310, 'R1 job');
equal(config.predecessor.remoteNodeExecutionRecovered, true, 'R1 remote Node recovered');
equal(config.predecessor.splitPersistenceCanaryPassed, true, 'split persistence passed');
equal(config.predecessor.endToEndLiveRouteCertified, false, 'end-to-end remains pending');

equal(r1.contractId, config.predecessor.contractId, 'R1 source contract matches');
equal(r1.status, config.predecessor.status, 'R1 source status matches');
equal(r1.nextBoundary, 'COM-B04I-R2 repository-only attempt-3 authorization envelope and preinstalled staging workflow readiness', 'R1 next boundary');

equal(config.authorization.phrase, phrase, 'attempt3 phrase frozen');
equal(config.authorization.received, false, 'authorization not received');
equal(config.authorization.consumed, false, 'authorization not consumed');
equal(config.authorization.executionAttempted, false, 'execution not attempted');
equal(config.authorization.singleUse, true, 'single use');
equal(config.authorization.reusableAfterFailure, false, 'not reusable after failure');

equal(config.workflow.preinstalled, true, 'workflow preinstalled');
equal(config.workflow.triggerPath, 'config/com-b04i-r2-attempt-3-staging-trigger.json', 'trigger path');
equal(config.workflow.triggerExists, false, 'trigger absent');
equal(fs.existsSync(triggerPath), false, 'trigger file truly absent');
equal(config.workflow.installBeforeTriggerRequired, true, 'install before trigger');
equal(config.workflow.singleFileTriggerCommitRequired, true, 'single-file trigger');
equal(config.workflow.event, 'push', 'push event');
equal(config.workflow.branch, 'com/com-001-baseline-audit', 'branch');
equal(config.workflow.environment, 'staging', 'future environment');
equal(config.workflow.projectId, 'zwkczgewzbsorbrjuzpb', 'project');
equal(config.workflow.runner, 'ubuntu-24.04', 'runner');
equal(config.workflow.nodeVersion, '24', 'Node version');
equal(config.workflow.syntheticOnly, true, 'synthetic only');
equal(config.workflow.rollbackOnly, true, 'rollback only');
equal(config.workflow.outerIsolation, 'serializable', 'serializable');
equal(config.workflow.publicTrafficEnabled, false, 'public traffic false');
equal(config.workflow.runtimeDeploymentAllowed, false, 'deploy false');
equal(config.workflow.sanitizedArtifactRequired, true, 'sanitized artifact');
equal(config.workflow.rpcAllowlist, ['com_moderation_load_case_v1', 'com_moderation_commit_case_command_v1'], 'exact RPC allowlist');

equal(config.runtime.attemptContractId, 'com-b04i-r2-attempt-3-staging-live-composition-route-canary-v1', 'attempt runtime contract');
equal(config.runtime.handlerContractId, 'com-b04i-staging-live-composition-route-canary-v1', 'handler runtime contract');
equal(config.runtime.activationMode, 'staging_authenticated_server_runtime', 'candidate mode');
equal(config.runtime.defaultHandlerHttpStatus, 503, 'default handler status');
equal(config.runtime.defaultHandlerErrorCode, 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED', 'default handler code');
equal(config.runtime.coreCompositionLiveModeAdded, false, 'core live mode absent');

for (const [key, value] of Object.entries(config.authority)) equal(value, false, `authority false: ${key}`);
for (const [key, value] of Object.entries(config.effects)) {
  if (key === 'repositoryReadinessFilesChanged') equal(value, true, 'repository readiness changed');
  else equal(value, false, `effect false: ${key}`);
}

equal(config.matrix.version, '1.3.112', 'config matrix');
equal(config.matrix.maturity, 3, 'config maturity');
equal(config.matrix.serverAuthority, 'partial', 'config server authority');
equal(config.matrix.productionGate, 'blocked', 'config production gate');
equal(config.matrix.promotionAllowed, false, 'config promotion false');
equal(matrix.version, '1.3.112', 'canonical matrix version');
const com = matrix.domains.find((entry) => entry.id === 'COM-001');
ok(com, 'COM-001 present');
equal(com.maturity, 3, 'canonical maturity');
equal(com.serverAuthority, 'partial', 'canonical server authority');
equal(com.productionGate, 'blocked', 'canonical production gate');

equal(config.nextAction, 'obtain_exact_attempt3_authorization_phrase', 'next action');
equal(config.nextBoundary, 'COM-B04I attempt 3 staging live composition activation and rollback-only route canary', 'next boundary');

console.log(`COM-B04I-R2 attempt-3 authorization envelope conformance passed: ${checks}/${checks}`);
