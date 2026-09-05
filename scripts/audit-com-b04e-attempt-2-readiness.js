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
  config: 'config/com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-canary.json',
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
const config = json(paths.config);
const attempt1 = json(paths.attempt1Config);
const doc = read(paths.doc);
const evidence = json(paths.evidence);
const workflow = read(paths.workflow);
const readiness = read(paths.readiness);
const phrase = 'I_EXPLICITLY_AUTHORIZE_COM_B04E_ATTEMPT_2_AUTHENTICATED_ROLLBACK_ONLY_MODERATION_RUNTIME_COMPOSITION_CANARY_ON_DOKE_STAGING';
const contract = 'com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-composition-canary-v1';

for (const marker of [
  `const CONTRACT_ID = '${contract}'`,
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
  'rawIdentifiersExposed: false'
]) check(wrapper.includes(marker), `wrapper marker: ${marker}`);

for (const forbidden of [
  'process.env',
  'route-registry',
  "activationMode: 'staging'",
  "activationMode: 'live'",
  "activationMode: 'production'",
  'SUPABASE_SERVICE_ROLE_KEY'
]) check(!wrapper.includes(forbidden), `wrapper excludes: ${forbidden}`);
check(wrapper.indexOf('composition.invokePreparedCommand(prepared)') < wrapper.indexOf('repository.commitCaseCommand(prepared.preparedCommit)'), 'live block precedes canary commit');
check(wrapper.indexOf('attempted = true') < wrapper.indexOf('composition.prepareCommand(request)'), 'single-use consumed before preparation');

check(core.includes("Object.freeze(['disabled', 'local_test_double'])"), 'core modes unchanged');
check(core.includes('COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED'), 'core live path blocked');
check(core.includes('routeRegistered: false'), 'core route unregistered');
check(adapter.includes("transactionBoundary: 'single_security_definer_rpc'"), 'single RPC boundary');
check(adapter.includes("authority !== 'server_service_role'"), 'service-role requirement');

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
  'BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE',
  'SET LOCAL ROLE service_role',
  'RESET ROLE',
  "client.query('ROLLBACK')",
  'createModerationRollbackCanaryAttempt2({',
  'assertCountDelta(baselineCounts, insideCounts)',
  'assertSameCounts(baselineCounts, postflightCounts',
  'DOKE_COM_B04E_ATTEMPT_2_PERSISTENT_RESIDUE_DETECTED',
  'rawIdentifiersExposed: false',
  "report.status = 'failed_closed'",
  'writeReport(report)'
]) check(executor.includes(marker), `executor marker: ${marker}`);

for (const forbidden of [
  "client.query('COMMIT')",
  'SUPABASE_SERVICE_ROLE_KEY',
  'signInWithPassword',
  'admin.createUser',
  'route-registry',
  'email:'
]) check(!executor.includes(forbidden), `executor excludes: ${forbidden}`);
check(executor.includes('phraseSha256: hash(REQUIRED_AUTHORIZATION_PHRASE)'), 'phrase hashed');
check(executor.includes('actorSha256: hash(row.user_id)'), 'actor hashed');
check(executor.includes('sessionSha256: hash(row.session_id)'), 'session hashed');
const reportIndex = executor.indexOf('const report = {');
const envelopeInvocationIndex = executor.indexOf('    verifyExecutionEnvelope(env);');
check(reportIndex >= 0 && envelopeInvocationIndex > reportIndex, 'report precedes envelope invocation');

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

// Attempt 1 remains immutable, consumed and residue-free.
equal(attempt1.status, 'authorization_consumed_pre_execution_audit_failed', 'attempt-1 status');
equal(attempt1.authorization.consumed, true, 'attempt-1 consumed');
equal(attempt1.authorization.consumedByRun, 31065331290, 'attempt-1 run');
equal(attempt1.authorization.reusableAfterFailure, false, 'attempt-1 non-reusable');
equal(attempt1.execution.executorStarted, false, 'attempt-1 executor false');
equal(attempt1.execution.databaseConnectionAttemptedByWorkflow, false, 'attempt-1 database false');
equal(attempt1.execution.rollbackScopedMutationExecuted, false, 'attempt-1 mutation false');
equal(attempt1.postflight.persistentResidue, false, 'attempt-1 residue false');

// Attempt 2 lifecycle.
equal(config.contractId, contract, 'config contract');
check([
  'explicit_authorization_received_execution_pending',
  'authenticated_rollback_only_canary_passed'
].includes(config.status), 'config lifecycle status');
equal(config.authorization.phrase, phrase, 'exact authorization phrase');
equal(config.authorization.received, true, 'authorization received');
equal(config.authorization.singleUse, true, 'single-use authorization');
equal(config.authorization.reusableAfterFailure, false, 'authorization non-reusable');
equal(config.previousAttempt.run, 31065331290, 'attempt-1 binding');
equal(config.previousAttempt.authorizationConsumed, true, 'attempt-1 authorization binding');
equal(config.target.environment, 'staging', 'staging target');
equal(config.target.projectId, 'zwkczgewzbsorbrjuzpb', 'project target');
equal(config.target.pullRequest, 61, 'PR target');
equal(config.canary.syntheticOnly, true, 'synthetic only');
equal(config.canary.rollbackOnly, true, 'rollback only');
equal(config.canary.outerIsolation, 'serializable', 'serializable');
equal(config.canary.coreCompositionActivationMode, 'disabled', 'core disabled');
equal(config.execution.workflowRerunAllowed, false, 'rerun prohibited');
equal(config.effects.persistentStagingMutationAllowed, false, 'persistent mutation prohibited');
equal(config.effects.routeRegistrationAllowed, false, 'route prohibited');
equal(config.effects.runtimeDeploymentAllowed, false, 'deploy prohibited');
equal(config.effects.productionAllowed, false, 'production prohibited');
equal(config.effects.pullRequestMergeAllowed, false, 'merge prohibited');

if (config.status === 'explicit_authorization_received_execution_pending') {
  equal(config.authorization.consumed, false, 'pending authorization unconsumed in envelope');
  equal(config.execution.attempted, false, 'pending execution false');
} else {
  equal(config.authorization.consumed, true, 'success authorization consumed');
  equal(config.authorization.consumedByRun, 31067102891, 'success run consumes authorization');
  equal(config.execution.attempted, true, 'success execution attempted');
  equal(config.execution.run, 31067102891, 'success run');
  equal(config.execution.authorizationJob, 92506997430, 'success authorization job');
  equal(config.execution.job, 92507013853, 'success canary job');
  equal(config.execution.head, 'bbe3b52354a7e540a27cadb30c30159fb531485e', 'success head');
  equal(config.execution.result, 'success', 'success result');
  equal(config.execution.executorStarted, true, 'executor started');
  equal(config.execution.transactionRolledBack, true, 'transaction rolled back');
  equal(config.execution.persistentMutationExecuted, false, 'no persistent mutation');
  equal(config.postflight.persistentResidue, false, 'no residue');
}

// Evidence lifecycle mirrors the config without overstating authority.
equal(evidence.contractId, contract, 'evidence contract');
check([
  'explicit_authorization_received_repository_preparation_pending',
  'authenticated_rollback_only_canary_passed'
].includes(evidence.status), 'evidence lifecycle status');
equal(evidence.previousAttempt.authorizationConsumed, true, 'evidence previous auth consumed');
equal(evidence.previousAttempt.executorStarted, false, 'evidence previous executor false');
equal(evidence.preflight.projectStatus, 'ACTIVE_HEALTHY', 'project healthy');
equal(evidence.preflight.requiredMigrations, 2, 'migrations present');
equal(evidence.preflight.activeAuthenticatedSessionCount, 20, 'sessions recorded');
equal(evidence.preflight.moderationLedgerRowsBeforeCanary, 0, 'baseline empty');
equal(evidence.effects.persistentStagingMutationExecuted, false, 'evidence persistent mutation false');
equal(evidence.effects.routeRegistered, false, 'evidence route false');
equal(evidence.effects.runtimeDeployed, false, 'evidence deployment false');
equal(evidence.effects.productionChanged, false, 'evidence production false');
equal(evidence.effects.pullRequestMerged, false, 'evidence merge false');

if (evidence.status === 'explicit_authorization_received_repository_preparation_pending') {
  equal(evidence.authorization.consumed, false, 'pending evidence unconsumed');
  equal(evidence.execution.attempted, false, 'pending evidence execution false');
} else {
  equal(evidence.authorization.consumed, true, 'success evidence consumed');
  equal(evidence.execution.attempted, true, 'success evidence attempted');
  equal(evidence.execution.run, 31067102891, 'success evidence run');
  equal(evidence.execution.job, 92507013853, 'success evidence job');
  equal(evidence.observed.transactionRolledBack, true, 'observed rollback');
  equal(evidence.observed.persistentResidue, false, 'observed no residue');
  equal(evidence.observed.rawIdentifiersExposed, false, 'observed sanitized evidence');
  equal(evidence.postflight.caseProjectionRows, 0, 'postflight projection zero');
  equal(evidence.postflight.caseEventRows, 0, 'postflight event zero');
  equal(evidence.postflight.commandIdempotencyRows, 0, 'postflight command zero');
  equal(evidence.postflight.evidenceRecordRows, 0, 'postflight evidence zero');
}

for (const marker of [
  'Attempt 2 is authorized once by the distinct phrase',
  'attempt-1 status: authorization_consumed_pre_execution_audit_failed',
  'No attempt-1 file is repurposed as the attempt-2 trigger.',
  'COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED',
  'BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE',
  'No `COMMIT` statement is permitted.',
  'case_projection: +1',
  'evidence_record: +1',
  'persistent staging writes: prohibited'
]) check(doc.includes(marker), `doc marker: ${marker}`);

check(workflow.includes('COM-B04E Attempt 2 Archived Rollback-only Canary'), 'archived workflow name');
check(workflow.includes('Attempt 2 authorization was consumed by run 31067102891.'), 'archived run recorded');
check(workflow.includes('config/com-b04e-attempt-2-archived-never-trigger.json'), 'consumed trigger disabled');
check(workflow.includes('config/com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-canary.json'), 'historical trigger retained');
check(workflow.includes('permissions:\n  contents: read'), 'read-only repository permissions');
check(workflow.includes('secrets.SUPABASE_ACCESS_TOKEN'), 'access token secret reference');
check(workflow.includes('secrets.SUPABASE_DB_PASSWORD'), 'DB password secret reference');
check(!workflow.includes('SUPABASE_SERVICE_ROLE_KEY'), 'no service-role key');
check(!workflow.includes('supabase db push'), 'no migration application');
check(!workflow.includes('supabase functions deploy'), 'no deployment');

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

console.log(`COM-B04E attempt-2 lifecycle audit passed: ${checks}/${checks}`);
