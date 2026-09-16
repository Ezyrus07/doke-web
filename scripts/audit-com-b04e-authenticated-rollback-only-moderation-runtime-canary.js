#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const json = (relative) => JSON.parse(read(relative));
let checks = 0;
const check = (value, message) => { checks += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { checks += 1; assert.deepStrictEqual(actual, expected, message); };

const paths = Object.freeze({
  wrapper: 'backend/runtime/staging/community-moderation-rollback-canary.js',
  core: 'backend/modules/communities/community-moderation-runtime-composition.js',
  adapter: 'backend/modules/communities/community-moderation-supabase-repository-adapter.js',
  test: 'scripts/test-com-b04e-authenticated-rollback-only-moderation-runtime-canary.js',
  executor: 'scripts/execute-com-b04e-authenticated-rollback-only-moderation-runtime-canary.js',
  audit: 'scripts/audit-com-b04e-authenticated-rollback-only-moderation-runtime-canary.js',
  config: 'config/com-b04e-authenticated-rollback-only-moderation-runtime-canary.json',
  doc: 'docs/COM-B04E-AUTHENTICATED-ROLLBACK-ONLY-MODERATION-RUNTIME-CANARY.md',
  evidence: 'docs/validation/COM-B04E-AUTHENTICATED-ROLLBACK-ONLY-MODERATION-RUNTIME-CANARY.json',
  workflow: '.github/workflows/com-b04e-authenticated-rollback-only-moderation-runtime-canary.yml'
});

for (const required of Object.values(paths)) {
  check(fs.existsSync(path.join(root, required)), `required file: ${required}`);
}

const wrapper = read(paths.wrapper);
const core = read(paths.core);
const adapter = read(paths.adapter);
const test = read(paths.test);
const executor = read(paths.executor);
const config = json(paths.config);
const doc = read(paths.doc);
const evidence = json(paths.evidence);
const workflow = read(paths.workflow);
const phrase = 'I_EXPLICITLY_AUTHORIZE_COM_B04E_AUTHENTICATED_ROLLBACK_ONLY_MODERATION_RUNTIME_COMPOSITION_CANARY_ON_DOKE_STAGING';

for (const marker of [
  "const CONTRACT_ID = 'com-b04e-authenticated-rollback-only-moderation-runtime-composition-canary-v1'",
  phrase,
  "const REQUIRED_PROJECT_ID = 'zwkczgewzbsorbrjuzpb'",
  "authority, 'staging_outer_transaction_guard'",
  "isolation || '').toLowerCase(), 'serializable'",
  "rollbackOnly, true",
  "mutationScope, 'synthetic_moderation_canary'",
  "environment, 'staging_rollback_canary'",
  "activationMode: 'disabled'",
  'COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED',
  'COM_B04E_CORE_LIVE_PATH_MUST_REMAIN_BLOCKED',
  'COM_B04E_SYNTHETIC_CASE_MUST_BE_ABSENT',
  'repository.commitCaseCommand(prepared.preparedCommit)',
  'COM_B04E_CANONICAL_READ_AFTER_WRITE_INVALID',
  'authorizationPhraseSha256',
  'rawIdentifiersExposed'
]) check(wrapper.includes(marker), `wrapper marker: ${marker}`);

check(!wrapper.includes('process.env'), 'wrapper does not read environment');
check(!wrapper.includes('route-registry'), 'wrapper does not register route');
check(!wrapper.includes("activationMode: 'staging'"), 'wrapper has no staging activation mode');
check(!wrapper.includes("activationMode: 'live'"), 'wrapper has no live activation mode');
check(!wrapper.includes("activationMode: 'production'"), 'wrapper has no production activation mode');
check(!wrapper.includes('SUPABASE_SERVICE_ROLE_KEY'), 'wrapper has no service role secret');
check(wrapper.indexOf('composition.invokePreparedCommand(prepared)') < wrapper.indexOf('repository.commitCaseCommand(prepared.preparedCommit)'), 'core live block proved before canary commit');
check(wrapper.includes('if (attempted)'), 'single-use attempt guard');
check(wrapper.indexOf('attempted = true') < wrapper.indexOf('composition.prepareCommand(request)'), 'authorization consumed before execution');

check(core.includes("Object.freeze(['disabled', 'local_test_double'])"), 'core still exposes only safe modes');
check(core.includes('COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED'), 'core live invocation remains blocked');
check(core.includes('routeRegistered: false'), 'core route remains unregistered');
check(adapter.includes("transactionBoundary: 'single_security_definer_rpc'"), 'adapter retains single RPC boundary');
check(adapter.includes("authority !== 'server_service_role'"), 'adapter retains service-role executor requirement');

for (const marker of [
  'open decision accepted',
  'core remains disabled',
  'core live path blocked',
  'load commit load order',
  'initial evidence materialized',
  'raw identifiers not exposed',
  'token not retained',
  'transaction guard checked throughout',
  'COM_B04E_AUTHORIZATION_ALREADY_CONSUMED',
  'COM_B04E_AUTHORIZATION_PHRASE_MISMATCH',
  'COM_B04E_STAGING_TRANSACTION_REQUIRED',
  'COM_B04E_STAGING_CANARY_EXECUTOR_REQUIRED',
  'COM_B04E_ROLLBACK_ONLY_TRANSACTION_REQUIRED',
  'equal(checks, 35'
]) check(test.includes(marker), `test marker: ${marker}`);

for (const marker of [
  'REQUIRED_AUTHORIZATION_PHRASE',
  "const REQUIRED_MIGRATIONS = Object.freeze(['20260806004634', '20260806004832'])",
  "exact(String(env.GITHUB_RUN_ATTEMPT || '1'), '1'",
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'auth.sessions session',
  "['aal1', 'aal2'].includes(row.aal)",
  "authority: 'server_service_role'",
  "environment: 'staging_rollback_canary'",
  "authority: 'staging_outer_transaction_guard'",
  "BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE",
  "SET LOCAL ROLE service_role",
  "RESET ROLE",
  "client.query('ROLLBACK')",
  'createModerationRollbackCanary({',
  'assertCountDelta(baselineCounts, insideCounts)',
  'assertSameCounts(baselineCounts, postflightCounts',
  'DOKE_COM_B04E_PERSISTENT_RESIDUE_DETECTED',
  'rawIdentifiersExposed: false',
  'persistentMutationExecuted: false'
]) check(executor.includes(marker), `executor marker: ${marker}`);

check(!executor.includes("client.query('COMMIT')"), 'executor has no COMMIT');
check(!executor.includes('SUPABASE_SERVICE_ROLE_KEY'), 'executor does not use service-role secret');
check(!executor.includes('signInWithPassword'), 'executor does not create a new session');
check(!executor.includes('admin.createUser'), 'executor does not create a user');
check(!executor.includes('route-registry'), 'executor does not register a route');
check(executor.includes('phraseSha256: hash(REQUIRED_AUTHORIZATION_PHRASE)'), 'report hashes authorization phrase');
check(executor.includes('actorSha256: hash(row.user_id)'), 'actor is hashed');
check(executor.includes('sessionSha256: hash(row.session_id)'), 'session is hashed');
check(!executor.includes('email:'), 'email not retained');

const allowedConfigStatuses = [
  'explicit_authorization_received_execution_pending',
  'authorization_consumed_pre_execution_audit_failed',
  'authenticated_rollback_only_canary_passed'
];
equal(config.contractId, 'com-b04e-authenticated-rollback-only-moderation-runtime-composition-canary-v1', 'config contract');
check(allowedConfigStatuses.includes(config.status), 'config lifecycle status');
equal(config.authorization.phrase, phrase, 'config authorization phrase');
equal(config.authorization.received, true, 'authorization received');
equal(config.authorization.singleUse, true, 'authorization single use');
equal(config.authorization.reusableAfterFailure, false, 'authorization non-reusable');
equal(config.execution.workflowRerunAllowed, false, 'rerun blocked');
equal(config.target.environment, 'staging', 'staging target');
equal(config.target.projectId, 'zwkczgewzbsorbrjuzpb', 'project target');
equal(config.canary.syntheticOnly, true, 'synthetic only');
equal(config.canary.rollbackOnly, true, 'rollback only');
equal(config.canary.outerIsolation, 'serializable', 'serializable outer transaction');
equal(config.canary.coreCompositionActivationMode, 'disabled', 'core disabled');
equal(config.effects.persistentStagingMutationAllowed, false, 'persistent staging mutation blocked');
equal(config.effects.routeRegistrationAllowed, false, 'route blocked');
equal(config.effects.runtimeDeploymentAllowed, false, 'deployment blocked');
equal(config.effects.productionAllowed, false, 'production blocked');
equal(config.effects.pullRequestMergeAllowed, false, 'merge blocked');

if (config.status === 'explicit_authorization_received_execution_pending') {
  equal(config.authorization.consumed, false, 'pending authorization unconsumed');
  equal(config.execution.attempted, false, 'pending execution unattempted');
} else {
  equal(config.authorization.consumed, true, 'attempt authorization consumed');
  equal(config.execution.attempted, true, 'execution attempt recorded');
}

const allowedEvidenceStatuses = [
  'explicit_authorization_received_execution_pending',
  'authorization_consumed_pre_execution_audit_failed',
  'authenticated_rollback_only_canary_passed'
];
equal(evidence.contractId, config.contractId, 'evidence contract');
check(allowedEvidenceStatuses.includes(evidence.status), 'evidence lifecycle status');
equal(evidence.preflight.readExecuted, true, 'preflight read recorded');
equal(evidence.preflight.commitRpcPresent, true, 'commit RPC preflight');
equal(evidence.preflight.authenticatedCommitBlocked, true, 'authenticated direct commit blocked');
equal(evidence.preflight.activeAuthenticatedSessionCount, 20, 'active session count recorded');
equal(evidence.preflight.moderationLedgerRowsBeforeCanary, 0, 'empty ledger preflight');
equal(evidence.expected.transactionRolledBack, true, 'rollback expected');
equal(evidence.expected.persistentResidue, false, 'no residue expected');
equal(evidence.effects.stagingReadExecuted, true, 'preflight read effect');
equal(evidence.effects.persistentStagingMutationExecuted, false, 'persistent mutation false');

if (evidence.status === 'explicit_authorization_received_execution_pending') {
  equal(evidence.execution.attempted, false, 'evidence attempt pending');
  equal(evidence.effects.rollbackScopedMutationExecuted, false, 'rollback mutation pending');
} else {
  equal(evidence.execution.attempted, true, 'evidence attempt recorded');
}

for (const marker of [
  'existing active staging session',
  'COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED',
  'BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE',
  'No `COMMIT` statement is permitted.',
  'case_projection: +1',
  'evidence_record: +1',
  'After rollback, every table must return to its exact baseline count.',
  'authorization remains consumed after any execution attempt',
  'persistent staging writes: prohibited'
]) check(doc.includes(marker), `doc marker: ${marker}`);

check(
  workflow.includes('COM-B04E Authenticated Rollback-only Moderation Runtime Canary') ||
    workflow.includes('COM-B04E Attempt 1 Archived Rollback-only Canary'),
  'workflow name or archived name'
);
check(workflow.includes('Attempt 1 authorization was consumed by run 31065331290.'), 'workflow attempt archived');
check(workflow.includes('config/com-b04e-authenticated-rollback-only-moderation-runtime-canary.json'), 'workflow historical one-shot path');
check(workflow.includes('config/com-b04e-attempt-1-archived-never-trigger.json'), 'workflow consumed trigger disabled');
check(workflow.includes('permissions:\n  contents: read'), 'workflow read-only repository permission');
check(workflow.includes('secrets.SUPABASE_ACCESS_TOKEN'), 'workflow access token secret');
check(workflow.includes('secrets.SUPABASE_DB_PASSWORD'), 'workflow database password secret');
check(!workflow.includes('SUPABASE_SERVICE_ROLE_KEY'), 'workflow has no service-role key');
check(workflow.includes('GITHUB_RUN_ATTEMPT'), 'workflow attempt binding');
check(workflow.includes('node scripts/test-com-b04e-authenticated-rollback-only-moderation-runtime-canary.js'), 'workflow conformance');
check(workflow.includes('node scripts/audit-com-b04e-authenticated-rollback-only-moderation-runtime-canary.js'), 'workflow audit');
check(workflow.includes('node scripts/execute-com-b04e-authenticated-rollback-only-moderation-runtime-canary.js'), 'workflow execution');
check(workflow.includes('if: always()'), 'workflow always uploads evidence');
check(workflow.includes('actions/upload-artifact@v4'), 'workflow artifact upload');
check(!workflow.includes('supabase db push'), 'workflow no migration application');
check(!workflow.includes('supabase functions deploy'), 'workflow no deployment');

console.log(`COM-B04E audit passed: ${checks}/${checks}`);
