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
  wrapper: 'backend/runtime/staging/community-moderation-rollback-canary-attempt-2.js',
  core: 'backend/modules/communities/community-moderation-runtime-composition.js',
  adapter: 'backend/modules/communities/community-moderation-supabase-repository-adapter.js',
  test: 'scripts/test-com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-canary.js',
  executor: 'scripts/execute-com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-canary.js',
  envelopeAudit: 'scripts/audit-com-b04e-attempt-2-execution-envelope.js',
  audit: 'scripts/audit-com-b04e-attempt-2-readiness.js',
  attempt1Config: 'config/com-b04e-authenticated-rollback-only-moderation-runtime-canary.json',
  doc: 'docs/COM-B04E-ATTEMPT-2-AUTHENTICATED-ROLLBACK-ONLY-MODERATION-RUNTIME-CANARY.md',
  evidence: 'docs/validation/COM-B04E-ATTEMPT-2-AUTHENTICATED-ROLLBACK-ONLY-MODERATION-RUNTIME-CANARY.json',
  workflow: '.github/workflows/com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-canary.yml',
  readiness: '.github/workflows/com-b04e-attempt-2-authenticated-rollback-only-canary-readiness.yml'
});

for (const required of Object.values(paths)) {
  check(fs.existsSync(path.join(root, required)), `required file: ${required}`);
}

const wrapper = read(paths.wrapper);
const core = read(paths.core);
const adapter = read(paths.adapter);
const test = read(paths.test);
const executor = read(paths.executor);
const envelopeAudit = read(paths.envelopeAudit);
const attempt1 = json(paths.attempt1Config);
const doc = read(paths.doc);
const evidence = json(paths.evidence);
const workflow = read(paths.workflow);
const readiness = read(paths.readiness);
const phrase = 'I_EXPLICITLY_AUTHORIZE_COM_B04E_ATTEMPT_2_AUTHENTICATED_ROLLBACK_ONLY_MODERATION_RUNTIME_COMPOSITION_CANARY_ON_DOKE_STAGING';

for (const marker of [
  "const CONTRACT_ID = 'com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-composition-canary-v1'",
  phrase,
  "const REQUIRED_PROJECT_ID = 'zwkczgewzbsorbrjuzpb'",
  "mutationScope, 'synthetic_moderation_canary_attempt_2'",
  "environment, 'staging_rollback_canary_attempt_2'",
  "activationMode: 'disabled'",
  'COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED',
  'COM_B04E_ATTEMPT_2_CORE_LIVE_PATH_MUST_REMAIN_BLOCKED',
  'COM_B04E_ATTEMPT_2_SYNTHETIC_CASE_MUST_BE_ABSENT',
  'repository.commitCaseCommand(prepared.preparedCommit)',
  'COM_B04E_ATTEMPT_2_CANONICAL_READ_AFTER_WRITE_INVALID',
  'authorizationPhraseSha256',
  'rawIdentifiersExposed: false'
]) check(wrapper.includes(marker), `wrapper marker: ${marker}`);

check(!wrapper.includes('process.env'), 'wrapper does not read environment');
check(!wrapper.includes('route-registry'), 'wrapper does not register route');
check(!wrapper.includes("activationMode: 'staging'"), 'wrapper has no staging mode');
check(!wrapper.includes("activationMode: 'live'"), 'wrapper has no live mode');
check(!wrapper.includes("activationMode: 'production'"), 'wrapper has no production mode');
check(!wrapper.includes('SUPABASE_SERVICE_ROLE_KEY'), 'wrapper contains no service-role secret');
check(wrapper.indexOf('composition.invokePreparedCommand(prepared)') < wrapper.indexOf('repository.commitCaseCommand(prepared.preparedCommit)'), 'live block proved before canary commit');
check(wrapper.includes('if (attempted)'), 'single-use guard');
check(wrapper.indexOf('attempted = true') < wrapper.indexOf('composition.prepareCommand(request)'), 'attempt consumed before preparation');

check(core.includes("Object.freeze(['disabled', 'local_test_double'])"), 'core safe modes unchanged');
check(core.includes('COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED'), 'core live invocation blocked');
check(core.includes('routeRegistered: false'), 'core route unregistered');
check(adapter.includes("transactionBoundary: 'single_security_definer_rpc'"), 'adapter single RPC boundary');
check(adapter.includes("authority !== 'server_service_role'"), 'adapter service-role requirement');

for (const marker of [
  'COM-B04E attempt-2 conformance passed',
  'open decision accepted',
  'core remains disabled',
  'core live path blocked',
  'load commit load order',
  'initial evidence materialized',
  'raw identifiers not exposed',
  'token not retained',
  'transaction guard checked throughout',
  'COM_B04E_ATTEMPT_2_AUTHORIZATION_ALREADY_CONSUMED',
  'COM_B04E_ATTEMPT_2_AUTHORIZATION_PHRASE_MISMATCH',
  'COM_B04E_ATTEMPT_2_STAGING_TRANSACTION_REQUIRED',
  'COM_B04E_ATTEMPT_2_STAGING_CANARY_EXECUTOR_REQUIRED',
  'COM_B04E_ATTEMPT_2_ROLLBACK_ONLY_TRANSACTION_REQUIRED',
  'equal(checks, 35'
]) check(test.includes(marker), `test marker: ${marker}`);

for (const marker of [
  "const ATTEMPT_1 = require('../config/com-b04e-authenticated-rollback-only-moderation-runtime-canary.json')",
  'verifyAttempt1Closure()',
  "ATTEMPT_1.status, 'authorization_consumed_pre_execution_audit_failed'",
  'ATTEMPT_1.authorization.consumedByRun, 31065331290',
  'ATTEMPT_1.execution.executorStarted, false',
  'ATTEMPT_1.postflight.persistentResidue, false',
  'REQUIRED_AUTHORIZATION_PHRASE',
  "const REQUIRED_MIGRATIONS = Object.freeze(['20260806004634', '20260806004832'])",
  "exact(String(env.GITHUB_RUN_ATTEMPT || '1'), '1'",
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'auth.sessions session',
  "['aal1', 'aal2'].includes(row.aal)",
  "authority: 'server_service_role'",
  "environment: 'staging_rollback_canary_attempt_2'",
  "authority: 'staging_outer_transaction_guard'",
  "BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE",
  "SET LOCAL ROLE service_role",
  "RESET ROLE",
  "client.query('ROLLBACK')",
  'createModerationRollbackCanaryAttempt2({',
  'assertCountDelta(baselineCounts, insideCounts)',
  'assertSameCounts(baselineCounts, postflightCounts',
  'DOKE_COM_B04E_ATTEMPT_2_PERSISTENT_RESIDUE_DETECTED',
  'rawIdentifiersExposed: false',
  'persistentMutationExecuted: false',
  "report.status = 'failed_closed'",
  'writeReport(report)'
]) check(executor.includes(marker), `executor marker: ${marker}`);

check(!executor.includes("client.query('COMMIT')"), 'executor has no COMMIT');
check(!executor.includes('SUPABASE_SERVICE_ROLE_KEY'), 'executor contains no service-role key');
check(!executor.includes('signInWithPassword'), 'executor creates no session');
check(!executor.includes('admin.createUser'), 'executor creates no user');
check(!executor.includes('route-registry'), 'executor registers no route');
check(executor.includes('phraseSha256: hash(REQUIRED_AUTHORIZATION_PHRASE)'), 'report hashes phrase');
check(executor.includes('actorSha256: hash(row.user_id)'), 'actor hashed');
check(executor.includes('sessionSha256: hash(row.session_id)'), 'session hashed');
check(!executor.includes('email:'), 'email not retained');
check(executor.indexOf('const report = {') < executor.indexOf('verifyExecutionEnvelope(env)'), 'report initialized before envelope verification');

for (const marker of [
  "require('../config/com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-canary.json')",
  "ATTEMPT_1.status, 'authorization_consumed_pre_execution_audit_failed'",
  'ATTEMPT_1.authorization.consumedByRun, 31065331290',
  'CONFIG.authorization.phrase, REQUIRED_AUTHORIZATION_PHRASE',
  "CONFIG.status, 'explicit_authorization_received_execution_pending'",
  "CONFIG.target.environment, 'staging'",
  "CONFIG.canary.outerIsolation, 'serializable'",
  'CONFIG.execution.workflowRerunAllowed, false',
  'CONFIG.effects.productionAllowed, false',
  'COM-B04E attempt-2 execution envelope audit passed'
]) check(envelopeAudit.includes(marker), `envelope audit marker: ${marker}`);

// Canonical attempt-1 state must remain immutable and consumed.
equal(attempt1.status, 'authorization_consumed_pre_execution_audit_failed', 'attempt-1 status');
equal(attempt1.authorization.consumed, true, 'attempt-1 consumed');
equal(attempt1.authorization.consumedByRun, 31065331290, 'attempt-1 run');
equal(attempt1.authorization.reusableAfterFailure, false, 'attempt-1 non-reusable');
equal(attempt1.execution.executorStarted, false, 'attempt-1 executor false');
equal(attempt1.execution.databaseConnectionAttemptedByWorkflow, false, 'attempt-1 database false');
equal(attempt1.execution.rollbackScopedMutationExecuted, false, 'attempt-1 mutation false');
equal(attempt1.postflight.persistentResidue, false, 'attempt-1 residue false');

// Pending evidence must not claim execution.
equal(evidence.contractId, 'com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-composition-canary-v1', 'evidence contract');
equal(evidence.status, 'explicit_authorization_received_repository_preparation_pending', 'evidence pending status');
equal(evidence.authorization.consumed, false, 'authorization not consumed during preparation');
equal(evidence.previousAttempt.authorizationConsumed, true, 'previous attempt consumed');
equal(evidence.previousAttempt.executorStarted, false, 'previous executor false');
equal(evidence.preflight.projectStatus, 'ACTIVE_HEALTHY', 'project healthy');
equal(evidence.preflight.requiredMigrations, 2, 'migrations present');
equal(evidence.preflight.activeAuthenticatedSessionCount, 20, 'active sessions recorded');
equal(evidence.preflight.moderationLedgerRowsBeforeCanary, 0, 'empty ledger recorded');
equal(evidence.execution.attempted, false, 'execution pending');
equal(evidence.effects.rollbackScopedMutationExecuted, false, 'no rollback mutation yet');
equal(evidence.effects.persistentStagingMutationExecuted, false, 'no persistent mutation');

for (const marker of [
  'Attempt 2 is authorized once by the distinct phrase',
  'attempt-1 status: authorization_consumed_pre_execution_audit_failed',
  'No attempt-1 file is repurposed as the attempt-2 trigger.',
  'COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED',
  'BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE',
  'No `COMMIT` statement is permitted.',
  'case_projection: +1',
  'evidence_record: +1',
  'The executor writes a sanitized report even when it fails before opening the database transaction.',
  'persistent staging writes: prohibited'
]) check(doc.includes(marker), `doc marker: ${marker}`);

for (const marker of [
  'COM-B04E Attempt 2 Authenticated Rollback-only Moderation Runtime Canary',
  'config/com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-canary.json',
  'permissions:\n  contents: read',
  'secrets.SUPABASE_ACCESS_TOKEN',
  'secrets.SUPABASE_DB_PASSWORD',
  'COM_B04E_ATTEMPT_2_AUTHORIZATION',
  'GITHUB_RUN_ATTEMPT',
  'node scripts/test-com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-canary.js',
  'node scripts/audit-com-b04e-attempt-2-readiness.js',
  'node scripts/audit-com-b04e-attempt-2-execution-envelope.js',
  'node scripts/execute-com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-canary.js',
  'if: always()',
  'actions/upload-artifact@v4'
]) check(workflow.includes(marker), `workflow marker: ${marker}`);
check(!workflow.includes('SUPABASE_SERVICE_ROLE_KEY'), 'workflow contains no service-role key');
check(!workflow.includes('supabase db push'), 'workflow applies no migration');
check(!workflow.includes('supabase functions deploy'), 'workflow deploys nothing');

for (const marker of [
  'COM-B04E Attempt 2 Rollback-only Canary Readiness',
  'backend/runtime/staging/community-moderation-rollback-canary-attempt-2.js',
  'scripts/audit-com-b04e-attempt-2-readiness.js',
  'node scripts/test-com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-canary.js',
  'node scripts/audit-com-b04e-attempt-2-readiness.js',
  "! grep -F \"client.query('COMMIT')\"",
  'COM-B04D regression',
  'COM-B04C regression',
  'COM-B04B regression',
  'COM-B04 regression',
  'git diff --check'
]) check(readiness.includes(marker), `readiness workflow marker: ${marker}`);

console.log(`COM-B04E attempt-2 readiness audit passed: ${checks}/${checks}`);
