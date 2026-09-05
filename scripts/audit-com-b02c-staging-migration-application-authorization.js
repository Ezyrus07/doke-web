#!/usr/bin/env node
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = {
  module: 'backend/modules/communities/community-staging-migration-authorization-gate.js',
  config: 'config/com-b02c-staging-migration-application-authorization.json',
  fixtures: 'tests/fixtures/com-b02c-staging-migration-authorization-cases.json',
  test: 'scripts/test-com-b02c-staging-migration-application-authorization.js',
  docs: 'docs/COM-B02C-STAGING-MIGRATION-APPLICATION-AUTHORIZATION.md',
  evidence: 'docs/validation/COM-B02C-STAGING-MIGRATION-APPLICATION.json',
  migration: 'supabase/migrations/20260805121500_com_b02b_server_authority.sql',
  workflow: '.github/workflows/com-b02c-staging-migration-application-authorization.yml'
};
const read = (key) => fs.readFileSync(path.join(root, files[key]), 'utf8');
let checks = 0;
const check = (value, message) => { checks += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { checks += 1; assert.strictEqual(actual, expected, message); };

for (const [key, relative] of Object.entries(files)) {
  check(fs.existsSync(path.join(root, relative)), `${key} exists`);
  check(fs.statSync(path.join(root, relative)).size > 20, `${key} nonempty`);
}

const source = read('module');
const config = JSON.parse(read('config'));
const fixtures = JSON.parse(read('fixtures'));
const docs = read('docs');
const evidence = JSON.parse(read('evidence'));
const sql = read('migration');
const workflow = read('workflow');
const gitBlobSha = crypto
  .createHash('sha1')
  .update(`blob ${Buffer.byteLength(sql)}\0${sql}`)
  .digest('hex');

const requiredPhrase = 'I_EXPLICITLY_AUTHORIZE_COM_B02C_SERVER_AUTHORITY_MIGRATION_ON_DOKE_STAGING';
const expectedProject = 'zwkczgewzbsorbrjuzpb';
const expectedVersion = '20260805153539';

check(source.includes("const CONTRACT_ID = 'com-b02c-staging-migration-application-authorization-v1'"), 'contract id');
check(source.includes(requiredPhrase), 'exact phrase');
check(source.includes('authorized_for_single_staging_execution'), 'single execution decision');
check(source.includes('AUTHORIZATION_ALREADY_CONSUMED'), 'consumption guard');
check(source.includes('PRIOR_EXECUTION_ATTEMPT_REQUIRES_NEW_AUTHORIZATION'), 'attempt guard');
check(!source.includes('createClient'), 'no client');
check(!source.includes('process.env'), 'no credentials');
check(!source.includes('fetch('), 'no network');
check(!source.includes('exec('), 'no process executor');

equal(config.contractId, 'com-b02c-staging-migration-application-authorization-v1', 'config contract');
equal(config.scope, 'staging_application_evidence', 'application evidence scope');
equal(config.status, 'staging_migration_applied_and_structurally_verified', 'applied status');
equal(config.authorization.requiredPhrase, requiredPhrase, 'phrase frozen');
equal(config.authorization.received, true, 'authorization received');
equal(config.authorization.source, 'explicit_user_message', 'authorization source');
equal(config.authorization.consumed, true, 'authorization consumed');
equal(config.authorization.singleUse, true, 'single use');
equal(config.authorization.reusableAfterFailure, false, 'not reusable');
equal(config.target.environment, 'staging', 'staging only');
equal(config.target.projectId, expectedProject, 'project frozen');
equal(config.target.productionAllowed, false, 'production blocked');
equal(config.migration.repositoryPath, files.migration, 'migration path');
equal(config.migration.repositoryGitBlobSha, gitBlobSha, 'migration blob frozen');
equal(config.migration.prepared, true, 'migration prepared');
equal(config.migration.applied, true, 'migration applied');
equal(config.migration.appliedName, 'com_b02b_server_authority', 'applied name');
equal(config.migration.supabaseRecordedVersion, expectedVersion, 'recorded version');
equal(config.executor.installed, false, 'permanent executor absent');
equal(config.executor.credentialsConfigured, false, 'credentials absent');
equal(config.executor.executionAttempted, true, 'execution attempted');
equal(config.executor.successfulExecutions, 1, 'single successful execution');
equal(config.executor.failedExecutions, 0, 'zero failed executions');

for (const [key, value] of Object.entries(config.verification)) {
  if (key === 'domainRowsCreated') equal(value, 0, `${key} zero`);
  else equal(value, true, `${key} true`);
}
equal(config.advisors.comSpecificSecurityWarnOrErrorCount, 0, 'no COM security warn/error');
equal(config.advisors.comSpecificPerformanceLintCount, 0, 'no COM performance lint');
equal(config.advisors.expectedPrivateRlsNoPolicyInfoCount, 3, 'expected RLS info count');
equal(config.authority.singleExecutionAuthorization, false, 'authorization exhausted');
equal(config.authority.migrationExecutionAuthority, false, 'execution authority exhausted');
equal(config.authority.stagingReadAuthority, false, 'staging read authority exhausted');
equal(config.authority.stagingMutationAuthority, false, 'staging mutation authority exhausted');
equal(config.authority.runtimeMutationAuthority, false, 'runtime authority false');
equal(config.authority.productionAuthority, false, 'production false');
equal(config.authority.pullRequestMergeAuthority, false, 'merge false');
equal(config.observedEffects.migrationApplied, true, 'application observed');
equal(config.observedEffects.schemaCreated, true, 'schema observed');
equal(config.observedEffects.tablesCreated, 3, 'three tables');
equal(config.observedEffects.functionsCreated, 3, 'three functions');
equal(config.observedEffects.domainRowsCreated, 0, 'zero domain rows');
equal(config.observedEffects.credentialsPersisted, false, 'no persisted credentials');
equal(config.observedEffects.runtimeDeployed, false, 'no runtime deploy');
equal(config.observedEffects.productionChanged, false, 'no production change');
equal(config.observedEffects.pullRequestMerged, false, 'no merge');
equal(config.evidencePath, files.evidence, 'evidence path');

equal(evidence.validationId, 'COM-B02C-STAGING-MIGRATION-APPLICATION', 'evidence id');
equal(evidence.status, config.status, 'evidence status');
equal(evidence.authorization.phrase, requiredPhrase, 'evidence phrase');
equal(evidence.authorization.consumed, true, 'evidence consumed');
equal(evidence.authorization.reusable, false, 'evidence not reusable');
equal(evidence.target.projectId, expectedProject, 'evidence project');
equal(evidence.target.environment, 'staging', 'evidence environment');
equal(evidence.target.productionAllowed, false, 'evidence production false');
equal(evidence.migration.repositoryPath, files.migration, 'evidence migration path');
equal(evidence.migration.repositoryGitBlobSha, gitBlobSha, 'evidence blob');
equal(evidence.migration.supabaseRecordedVersion, expectedVersion, 'evidence version');
equal(evidence.migration.applicationAttempts, 1, 'one attempt');
equal(evidence.migration.successfulApplications, 1, 'one success');
equal(evidence.migration.failedApplications, 0, 'zero failures');
for (const [key, value] of Object.entries(evidence.preflight)) {
  if (key.endsWith('Collision')) equal(value, false, `${key} false`);
  else equal(value, true, `${key} true`);
}
for (const [key, value] of Object.entries(evidence.verification)) {
  if (key.endsWith('Rows') || key === 'domainRowsCreated') equal(value, 0, `${key} zero`);
  else equal(value, true, `${key} true`);
}
equal(evidence.advisors.comSpecificSecurityWarnOrErrorCount, 0, 'evidence security clean');
equal(evidence.advisors.comSpecificPerformanceLintCount, 0, 'evidence performance clean');
equal(evidence.effects.runtimeDeployed, false, 'evidence runtime false');
equal(evidence.effects.productionChanged, false, 'evidence production false');
equal(evidence.effects.pullRequestMerged, false, 'evidence merge false');
for (const value of Object.values(evidence.remainingAuthority)) equal(value, false, 'remaining authority false');

equal(fixtures.expected.total, fixtures.cases.length, 'fixture total');
equal(fixtures.expected.authorized, 1, 'one positive evaluator case');
equal(fixtures.expected.blocked, 7, 'seven blocked cases');
check(docs.includes('authorization received: true'), 'docs received state');
check(docs.includes('authorization consumed: true'), 'docs consumed state');
check(docs.includes('migration applied: true'), 'docs applied state');
check(docs.includes(expectedVersion), 'docs migration version');
check(docs.includes(files.evidence), 'docs evidence path');
check(workflow.includes('permissions:\n  contents: read'), 'read-only workflow');
check(workflow.includes(files.evidence), 'workflow covers evidence');
check(workflow.includes('Audit COM-B02C'), 'audit workflow');
check(workflow.includes('Conformance COM-B02C'), 'test workflow');
check(workflow.includes('COM-B02B predecessor regression'), 'predecessor workflow');
check(!workflow.includes('workflow_dispatch'), 'no executable dispatch');
check(!workflow.includes('secrets.'), 'no secrets');
check(!workflow.includes('supabase db push'), 'no migration command');
check(!workflow.includes('psql'), 'no database command');
check(!workflow.includes('curl '), 'no network command');

console.log(`COM-B02C application evidence audit passed: ${checks}/${checks}`);
