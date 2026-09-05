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
  runtime: 'backend/runtime/staging/community-moderation-live-route-canary-attempt-3.js',
  executor: 'scripts/execute-com-b04i-r2-attempt-3-staging-live-composition-route-canary.js',
  runtimeTest: 'scripts/test-com-b04i-r2-attempt-3-preinstalled-staging-workflow-readiness.js',
  envelopeTest: 'scripts/test-com-b04i-r2-attempt-3-preinstalled-staging-workflow-envelope.js',
  audit: 'scripts/audit-com-b04i-r2-attempt-3-preinstalled-staging-workflow-readiness.js',
  config: 'config/com-b04i-r2-attempt-3-preinstalled-staging-workflow-readiness.json',
  evidence: 'docs/validation/COM-B04I-R2-ATTEMPT-3-PREINSTALLED-STAGING-WORKFLOW-READINESS.json',
  doc: 'docs/COM-B04I-R2-ATTEMPT-3-PREINSTALLED-STAGING-WORKFLOW-READINESS.md',
  stagingWorkflow: '.github/workflows/com-b04i-r2-attempt-3-staging-live-composition-route-canary.yml',
  readinessWorkflow: '.github/workflows/com-b04i-r2-attempt-3-readiness.yml',
  handler: 'backend/modules/communities/route-handlers.js',
  composition: 'backend/modules/communities/community-moderation-runtime-composition.js',
  r1: 'config/com-b04i-r1-remote-node-execution-path-recovery.json',
  matrix: 'config/domain-completion-matrix.json'
});

for (const file of Object.values(files)) ok(fs.existsSync(path.join(root, file)), `required file: ${file}`);
const trigger = path.join(root, 'config/com-b04i-r2-attempt-3-staging-trigger.json');
equal(fs.existsSync(trigger), false, 'attempt3 trigger absent');

const runtime = read(files.runtime);
const executor = read(files.executor);
const handler = read(files.handler);
const composition = read(files.composition);
const stagingWorkflow = read(files.stagingWorkflow);
const readinessWorkflow = read(files.readinessWorkflow);
const doc = read(files.doc);
const config = json(files.config);
const evidence = json(files.evidence);
const r1 = json(files.r1);
const matrix = json(files.matrix);

for (const marker of [
  "const ATTEMPT_CONTRACT_ID = 'com-b04i-r2-attempt-3-staging-live-composition-route-canary-v1'",
  "const HANDLER_CONTRACT_ID = 'com-b04i-staging-live-composition-route-canary-v1'",
  'I_EXPLICITLY_AUTHORIZE_COM_B04I_ATTEMPT_3_STAGING_LIVE_COMPOSITION_ACTIVATION_AND_ROLLBACK_ONLY_ROUTE_CANARY',
  "const ACTIVATION_MODE = 'staging_authenticated_server_runtime'",
  "'com_moderation_load_case_v1'",
  "'com_moderation_commit_case_command_v1'",
  'workflowInstallHead',
  'triggerHead',
  'publicTrafficEnabled: false',
  'persistentRuntimeAuthority: false',
  'productionAuthority: false',
  'pullRequestMergeAuthority: false'
]) ok(runtime.includes(marker), `runtime marker: ${marker}`);
for (const forbidden of ['process.env', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'createClient(', 'workflow_dispatch']) {
  ok(!runtime.includes(forbidden), `runtime forbidden absent: ${forbidden}`);
}

for (const marker of [
  "const TRIGGER_PATH = 'config/com-b04i-r2-attempt-3-staging-trigger.json'",
  "const EXPECTED_TRIGGER_CONTRACT = 'com-b04i-r2-attempt-3-staging-trigger-v1'",
  'GITHUB_RUN_ATTEMPT',
  'workflowInstallHead',
  'BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE',
  'SET LOCAL ROLE service_role',
  "client.query('ROLLBACK')",
  'DOKE_COM_B04I_R2_ATTEMPT3_PERSISTENT_RESIDUE_DETECTED',
  'rawIdentifiersExposed:false'
]) ok(executor.includes(marker), `executor marker: ${marker}`);

ok(handler.includes("const FAILURE_CODE = 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED'"), 'default handler failure retained');
ok(handler.includes('createStagingCanaryModerationCommandHandler'), 'server-bound factory retained');
ok(composition.includes("Object.freeze(['disabled', 'local_test_double'])"), 'core modes remain closed');
ok(!composition.includes("'staging_authenticated_server_runtime'"), 'core staging live mode absent');

for (const marker of [
  "'config/com-b04i-r2-attempt-3-staging-trigger.json'",
  'environment: staging',
  'ubuntu-24.04',
  "node-version: '24'",
  'SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}',
  'SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}',
  'git diff-tree --no-commit-id --name-only -r HEAD',
  'git rev-parse HEAD^',
  'Execute authenticated attempt-3 canary with rollback',
  'Upload sanitized attempt-3 evidence'
]) ok(stagingWorkflow.includes(marker), `staging workflow marker: ${marker}`);
ok(!stagingWorkflow.includes('workflow_dispatch'), 'staging workflow has no manual dispatch');
ok(!stagingWorkflow.includes('supabase db push'), 'no db push');
ok(!stagingWorkflow.includes('supabase functions deploy'), 'no function deploy');

for (const forbidden of [
  'environment: staging',
  'secrets.',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'workflow_dispatch',
  'execute-com-b04i-r2-attempt-3-staging-live-composition-route-canary.js'
]) ok(!readinessWorkflow.includes(forbidden), `readiness workflow remote marker absent: ${forbidden}`);

for (const marker of [
  'COM-B04I-R2 Attempt 3 Preinstalled Staging Workflow Readiness',
  'test-com-b04i-r2-attempt-3-preinstalled-staging-workflow-readiness.js',
  'test-com-b04i-r2-attempt-3-preinstalled-staging-workflow-envelope.js',
  'audit-com-b04i-r2-attempt-3-preinstalled-staging-workflow-readiness.js',
  'COM-B04I-R1 continuity',
  'COM-B04H regression',
  'git diff --check'
]) ok(readinessWorkflow.includes(marker), `readiness workflow marker: ${marker}`);

for (const marker of [
  'COM-B04I-R2 — attempt-3 preinstalled staging workflow readiness',
  'I_EXPLICITLY_AUTHORIZE_COM_B04I_ATTEMPT_3_STAGING_LIVE_COMPOSITION_ACTIVATION_AND_ROLLBACK_ONLY_ROUTE_CANARY',
  'authorization received: false',
  'authorization consumed: false',
  'attempt-3 trigger created: false',
  'staging accessed: false',
  'HTTP 503',
  'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED'
]) ok(doc.includes(marker), `doc marker: ${marker}`);

for (const [key, expected] of Object.entries({
  contractId: 'com-b04i-r2-attempt-3-preinstalled-staging-workflow-readiness-v1',
  domain: 'COM-001',
  scope: 'repository_only_attempt3_authorization_envelope_and_preinstalled_staging_workflow_readiness',
  status: 'repository_ready_attempt3_authorization_required',
  sourceHead: 'e4e42aa85020fc42e55fd94996116f637b706f67'
})) equal(config[key], expected, `config ${key}`);
equal(config.authorization.received, false, 'config authorization absent');
equal(config.authorization.consumed, false, 'config authorization unconsumed');
equal(config.authorization.executionAttempted, false, 'config execution unattempted');
equal(config.workflow.preinstalled, true, 'workflow preinstalled');
equal(config.workflow.triggerExists, false, 'config trigger absent');
equal(config.runtime.coreCompositionLiveModeAdded, false, 'config core mode unchanged');
for (const [key, value] of Object.entries(config.authority)) equal(value, false, `config authority false: ${key}`);
for (const [key, value] of Object.entries(config.effects)) {
  if (key === 'repositoryReadinessFilesChanged') equal(value, true, 'config repository effect true');
  else equal(value, false, `config effect false: ${key}`);
}

equal(r1.status, 'remote_node_execution_path_recovered_certified', 'R1 certified');
equal(r1.recoveryMechanism.workflowPreinstalledBeforeTrigger, true, 'R1 install-before-trigger precedent');
equal(r1.recoveryMechanism.workflowArchivedAfterCertification, true, 'R1 archived');
equal(r1.recoveryMechanism.stagingAccessAllowed, false, 'R1 mechanism staging access false');
equal(r1.authority.stagingReadAuthority, false, 'R1 staging read authority false');
equal(r1.authority.stagingMutationAuthority, false, 'R1 staging mutation authority false');
equal(r1.authority.stagingSecretAuthority, false, 'R1 staging secret authority false');
equal(r1.authority.publicTrafficAuthority, false, 'R1 public traffic authority false');
equal(r1.authority.runtimeDeploymentAuthority, false, 'R1 runtime deployment authority false');
equal(r1.authority.productionAuthority, false, 'R1 production authority false');
equal(r1.authority.pullRequestMergeAuthority, false, 'R1 merge authority false');

equal(evidence.contractId, config.contractId, 'evidence contract');
equal(evidence.status, config.status, 'evidence status');
equal(evidence.authorization.received, false, 'evidence authorization absent');
equal(evidence.workflow.triggerExists, false, 'evidence trigger absent');
equal(evidence.effects.stagingAccessed, false, 'evidence staging false');
equal(evidence.effects.productionChanged, false, 'evidence production false');
equal(evidence.effects.pullRequestMerged, false, 'evidence merge false');

ok(matrix.version === '1.3.112', 'matrix version stays 1.3.112');
const com = matrix.domains.find((entry) => entry.id === 'COM-001');
ok(com, 'COM-001 matrix entry');
equal(com.maturity, 3, 'maturity unchanged');
equal(com.serverAuthority, 'partial', 'server authority partial');
equal(com.productionGate, 'blocked', 'production blocked');

console.log(`COM-B04I-R2 attempt-3 preinstalled staging workflow readiness audit passed: ${checks}/${checks}`);
