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
const sql = read('migration');
const workflow = read('workflow');
const gitBlobSha = crypto
  .createHash('sha1')
  .update(`blob ${Buffer.byteLength(sql)}\0${sql}`)
  .digest('hex');

check(source.includes("const CONTRACT_ID = 'com-b02c-staging-migration-application-authorization-v1'"), 'contract id');
check(source.includes('I_EXPLICITLY_AUTHORIZE_COM_B02C_SERVER_AUTHORITY_MIGRATION_ON_DOKE_STAGING'), 'exact phrase');
check(source.includes('authorized_for_single_staging_execution'), 'single execution decision');
check(source.includes('AUTHORIZATION_ALREADY_CONSUMED'), 'consumption guard');
check(source.includes('PRIOR_EXECUTION_ATTEMPT_REQUIRES_NEW_AUTHORIZATION'), 'attempt guard');
check(!source.includes('createClient'), 'no client');
check(!source.includes('process.env'), 'no credentials');
check(!source.includes('fetch('), 'no network');
check(!source.includes('exec('), 'no process executor');

const requiredPhrase = 'I_EXPLICITLY_AUTHORIZE_COM_B02C_SERVER_AUTHORITY_MIGRATION_ON_DOKE_STAGING';
equal(config.contractId, 'com-b02c-staging-migration-application-authorization-v1', 'config contract');
equal(config.scope, 'repository_only', 'repository only');
equal(config.status, 'explicit_authorization_required', 'authorization required');
equal(config.authorization.requiredPhrase, requiredPhrase, 'phrase frozen');
equal(config.authorization.received, false, 'authorization not received');
equal(config.authorization.consumed, false, 'authorization not consumed');
equal(config.authorization.singleUse, true, 'single use');
equal(config.authorization.reusableAfterFailure, false, 'not reusable');
equal(config.target.environment, 'staging', 'staging only');
equal(config.target.productionAllowed, false, 'production blocked');
equal(config.migration.repositoryPath, files.migration, 'migration path');
equal(config.migration.repositoryGitBlobSha, gitBlobSha, 'migration blob frozen');
equal(config.migration.prepared, true, 'migration prepared');
equal(config.migration.applied, false, 'migration not applied');
equal(config.executor.installed, false, 'executor absent');
equal(config.executor.credentialsConfigured, false, 'credentials absent');
equal(config.executor.executionAttempted, false, 'execution not attempted');
equal(config.authority.singleExecutionAuthorization, false, 'no current authorization');
equal(config.authority.migrationExecutionAuthority, false, 'no execution authority');
equal(config.authority.stagingReadAuthority, false, 'no staging read authority');
equal(config.authority.stagingMutationAuthority, false, 'no staging mutation authority');
equal(config.authority.productionAuthority, false, 'no production authority');
equal(config.authority.pullRequestMergeAuthority, false, 'no merge authority');
for (const value of Object.values(config.prohibitedEffects)) equal(value, false, 'prohibited effect false');
equal(config.nextAction, 'await_exact_explicit_authorization_phrase', 'next action');

equal(fixtures.expected.total, fixtures.cases.length, 'fixture total');
equal(fixtures.expected.authorized, 1, 'one positive evaluator case');
equal(fixtures.expected.blocked, 7, 'seven blocked cases');
check(docs.includes(requiredPhrase), 'docs phrase');
check(docs.includes('authorization received: false'), 'docs pending state');
check(docs.includes('não representa autorização recebida'), 'docs no implied authorization');
check(workflow.includes('permissions:\n  contents: read'), 'read-only workflow');
check(workflow.includes('Audit COM-B02C'), 'audit workflow');
check(workflow.includes('Conformance COM-B02C'), 'test workflow');
check(workflow.includes('COM-B02B predecessor regression'), 'predecessor workflow');
check(!workflow.includes('workflow_dispatch'), 'no executable dispatch');
check(!workflow.includes('secrets.'), 'no secrets');
check(!workflow.includes('supabase db push'), 'no migration command');
check(!workflow.includes('psql'), 'no database command');
check(!workflow.includes('curl '), 'no network command');

console.log(`COM-B02C authorization audit passed: ${checks}/${checks}`);
