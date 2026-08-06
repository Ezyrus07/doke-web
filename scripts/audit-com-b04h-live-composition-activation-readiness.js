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
  contract: 'backend/modules/communities/community-moderation-live-composition-activation-readiness.js',
  composition: 'backend/modules/communities/community-moderation-runtime-composition.js',
  handlers: 'backend/modules/communities/route-handlers.js',
  registry: 'backend/shared/http/route-registry.js',
  loader: 'backend/shared/http/module-route-loader.js',
  config: 'config/com-b04h-live-composition-activation-readiness.json',
  test: 'scripts/test-com-b04h-live-composition-activation-readiness.js',
  audit: 'scripts/audit-com-b04h-live-composition-activation-readiness.js',
  evidence: 'docs/validation/COM-B04H-LIVE-COMPOSITION-ACTIVATION-READINESS.json',
  doc: 'docs/COM-B04H-LIVE-COMPOSITION-ACTIVATION-READINESS.md',
  workflow: '.github/workflows/com-b04h-live-composition-activation-readiness.yml',
  matrix: 'config/domain-completion-matrix.json'
});

for (const file of Object.values(files)) ok(fs.existsSync(path.join(root, file)), `required file: ${file}`);

const contract = read(files.contract);
const composition = read(files.composition);
const handlers = read(files.handlers);
const registry = read(files.registry);
const loader = read(files.loader);
const config = json(files.config);
const evidence = json(files.evidence);
const doc = read(files.doc);
const workflow = read(files.workflow);
const matrix = json(files.matrix);

for (const marker of [
  "const CONTRACT_ID = 'com-b04h-live-composition-activation-readiness-v1'",
  "const PREDECESSOR_CONTRACT_ID = 'com-b04g-route-registry-module-loader-wiring-authorization-v1'",
  "const COMPOSITION_CONTRACT_ID = 'com-b04d-moderation-runtime-composition-readiness-v1'",
  "const CURRENT_ACTIVATION_MODE = 'disabled'",
  "const CANDIDATE_ACTIVATION_MODE = 'staging_authenticated_server_runtime'",
  'I_EXPLICITLY_AUTHORIZE_COM_B04I_STAGING_LIVE_COMPOSITION_ACTIVATION_AND_ROLLBACK_ONLY_ROUTE_CANARY',
  "'com_moderation_load_case_v1'",
  "'com_moderation_commit_case_command_v1'",
  'ready_for_separate_com_b04i_activation_authorization',
  'live_composition_activation_blocked',
  'repositoryReadinessAuthority: ready',
  'liveCompositionAuthority: false',
  'stagingDeploymentAuthority: false',
  'productionAuthority: false'
]) ok(contract.includes(marker), `contract marker: ${marker}`);

for (const marker of [
  'server_verified_session_boundary', 'supabase_auth_get_user',
  'canonical_server_context_loader', 'approvedPolicyRequired', 'persistedCaseBindingRequired',
  'server_utc_clock', 'clientTimestampTrusted',
  'server_service_role', 'arbitraryRpcAllowed', 'directTableAccessAllowed', 'serviceRoleKeyExposureAllowed',
  'immutable_moderation_audit_storage', 'appendOnly', 'transactionBound', 'immutableLedgerRequired',
  'approved_moderation_policy_boundary', 'institutionalApprovalRecorded',
  'idempotencyRequired', 'requestFreshnessRequired', 'rlsValidationRequired', 'clientAuthorityOverrideAllowed'
]) ok(contract.includes(marker), `dependency marker: ${marker}`);

for (const forbidden of [
  'createClient(', '.rpc(', '.from(', 'fetch(', 'process.env',
  'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD',
  'workflow_dispatch'
]) ok(!contract.includes(forbidden), `contract forbidden marker absent: ${forbidden}`);

ok(composition.includes("Object.freeze(['disabled', 'local_test_double'])"), 'composition has no live mode');
ok(composition.includes('COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED'), 'composition live invocation blocked');
ok(handlers.includes("const FAILURE_CODE = 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED'"), 'handler code retained');
ok(handlers.includes('error.status = 503'), 'handler status retained');
ok(!handlers.includes('community-moderation-live-composition-activation-readiness'), 'handler does not import readiness');
ok(!handlers.includes('community-moderation-runtime-composition'), 'handler does not import composition');
ok(registry.includes("'communities.moderation.command'"), 'route retained');
ok(loader.includes("require('../../modules/communities/route-handlers')"), 'module retained');

for (const remote of [
  'secrets.', 'environment: staging', 'workflow_dispatch', 'curl ', 'psql ',
  'supabase db', 'supabase functions'
]) ok(!workflow.includes(remote), `workflow remote marker absent: ${remote}`);
ok(workflow.includes("! grep -R -F 'SUPABASE_SERVICE_ROLE_KEY'"), 'workflow proves service-role key absence');
ok(workflow.includes("! grep -R -F 'SUPABASE_ACCESS_TOKEN'"), 'workflow proves access token absence');
ok(workflow.includes("! grep -R -F 'SUPABASE_DB_PASSWORD'"), 'workflow proves database password absence');

for (const marker of [
  'COM-B04H Live Composition Activation Readiness',
  'node scripts/test-com-b04h-live-composition-activation-readiness.js',
  'node scripts/audit-com-b04h-live-composition-activation-readiness.js',
  'COM-B04G regression', 'COM-B04D regression', 'Immutable predecessor blobs', 'git diff --check'
]) ok(workflow.includes(marker), `workflow marker: ${marker}`);

for (const marker of [
  'COM-B04H — live composition activation readiness',
  'repository-only',
  'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED',
  'staging_authenticated_server_runtime',
  'I_EXPLICITLY_AUTHORIZE_COM_B04I_STAGING_LIVE_COMPOSITION_ACTIVATION_AND_ROLLBACK_ONLY_ROUTE_CANARY',
  'runtime activated: false', 'staging changed: false', 'production changed: false', 'pull request merged: false',
  'COM-001 maturity: 3/6'
]) ok(doc.includes(marker), `doc marker: ${marker}`);

for (const [key, value] of Object.entries({
  contractId: 'com-b04h-live-composition-activation-readiness-v1',
  scope: 'repository_only_live_composition_activation_readiness',
  status: 'repository_readiness_prepared_live_activation_blocked'
})) equal(config[key], value, `config ${key}`);

equal(config.currentState.handlerHttpStatus, 503, 'config 503');
equal(config.currentState.compositionActivationMode, 'disabled', 'config disabled');
equal(config.currentState.liveCompositionActivated, false, 'config live false');
equal(config.candidateActivation.mode, 'staging_authenticated_server_runtime', 'config candidate mode');
equal(config.candidateActivation.allowedRpcs, ['com_moderation_load_case_v1', 'com_moderation_commit_case_command_v1'], 'config allowlist');
equal(config.candidateActivation.arbitraryRpcAllowed, false, 'config arbitrary RPC false');
equal(config.candidateActivation.directTableAccessAllowed, false, 'config direct table false');
for (const [key, value] of Object.entries(config.excludedAuthority)) equal(value, false, `excluded authority false: ${key}`);
for (const [key, value] of Object.entries(config.effects)) {
  if (key === 'repositoryReadinessFilesChanged') equal(value, true, 'repository files changed');
  else equal(value, false, `effect false: ${key}`);
}
equal(config.matrix.maturityBefore, 3, 'maturity before');
equal(config.matrix.maturityAfterReadiness, 3, 'maturity after');
equal(config.matrix.promotionAllowed, false, 'promotion false');

equal(evidence.contractId, config.contractId, 'evidence contract');
equal(evidence.status, config.status, 'evidence status');
equal(evidence.readiness.ready, true, 'evidence ready');
equal(evidence.readiness.liveCompositionAuthority, false, 'evidence live false');
equal(evidence.effects.runtimeActivated, false, 'evidence runtime false');
equal(evidence.effects.stagingChanged, false, 'evidence staging false');
equal(evidence.effects.productionChanged, false, 'evidence production false');
equal(evidence.effects.pullRequestMerged, false, 'evidence merge false');

ok(['1.3.111', '1.3.112'].includes(matrix.version), 'matrix lifecycle version');
const com = matrix.domains.find((entry) => entry.id === 'COM-001');
ok(com, 'COM-001 exists');
equal(com.maturity, 3, 'matrix maturity unchanged');
equal(com.serverAuthority, 'partial', 'matrix server authority partial');
equal(com.productionGate, 'blocked', 'matrix production blocked');

console.log(`COM-B04H live composition activation readiness audit passed: ${checks}/${checks}`);
