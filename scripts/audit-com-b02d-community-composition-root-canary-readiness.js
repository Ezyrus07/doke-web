#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = {
  module: 'backend/runtime/staging/community-composition-root.js',
  config: 'config/com-b02d-community-composition-root-canary-readiness.json',
  fixtures: 'tests/fixtures/com-b02d-community-composition-root-cases.json',
  test: 'scripts/test-com-b02d-community-composition-root-canary-readiness.js',
  docs: 'docs/COM-B02D-COMMUNITY-COMPOSITION-ROOT-CANARY-READINESS.md',
  executionDocs: 'docs/COM-B02D-AUTHENTICATED-READ-ONLY-CANARY-EXECUTION.md',
  initialEvidence: 'docs/validation/COM-B02D-COMMUNITY-COMPOSITION-ROOT-CANARY-READINESS.json',
  attempt1Evidence: 'docs/validation/COM-B02D-AUTHENTICATED-READ-ONLY-CANARY-ATTEMPT-1.json',
  attempt2Evidence: 'docs/validation/COM-B02D-AUTHENTICATED-READ-ONLY-CANARY-ATTEMPT-2.json',
  workflow: '.github/workflows/com-b02d-community-composition-root-canary-readiness.yml',
  runtime: 'backend/runtime/staging/staging-api-runtime.js',
  routes: 'backend/shared/http/route-registry.js',
  loader: 'backend/shared/http/module-route-loader.js',
  predecessor: 'docs/validation/COM-B02C-STAGING-MIGRATION-APPLICATION.json'
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
const executionDocs = read('executionDocs');
const initialEvidence = JSON.parse(read('initialEvidence'));
const attempt1Evidence = JSON.parse(read('attempt1Evidence'));
const attempt2Evidence = JSON.parse(read('attempt2Evidence'));
const workflow = read('workflow');
const runtime = read('runtime');
const routes = read('routes');
const loader = read('loader');
const predecessor = JSON.parse(read('predecessor'));
const phrase = 'I_EXPLICITLY_AUTHORIZE_COM_B02D_AUTHENTICATED_READ_ONLY_CANARY_ON_DOKE_STAGING';

check(source.includes("const CONTRACT_ID = 'com-b02d-community-composition-root-canary-readiness-v1'"), 'contract id');
check(source.includes("require('../../modules/communities/community-supabase-repository-adapter')"), 'adapter dependency');
check(source.includes("authority: 'server_service_role'"), 'server role executor');
check(source.includes('name !== RPC.loadCanonicalState'), 'read-only allowlist');
check(source.includes('COM_MUTATING_RPC_BLOCKED'), 'mutation blocker');
check(source.includes('assertAuthenticatedActor'), 'authenticated actor guard');
check(source.includes('authorized_for_single_authenticated_read_only_canary'), 'single canary decision');
check(!source.includes('createClient'), 'no client creation');
check(!source.includes('process.env'), 'no env access');
check(!source.includes('fetch('), 'no direct network');
check(!source.includes('.from('), 'no table access');
check(!source.includes('claimIdempotencyKey('), 'no idempotency mutation exposure');
check(!source.includes('commitEventAndProjection('), 'no event mutation exposure');

const expectedContract = 'com-b02d-community-composition-root-canary-readiness-v1';
equal(config.contractId, expectedContract, 'config contract');
equal(config.scope, 'repository_only', 'repository only');
equal(config.status, 'authenticated_read_only_canary_certified', 'status');
equal(config.stagingFoundation.projectId, 'zwkczgewzbsorbrjuzpb', 'project frozen');
equal(config.stagingFoundation.migrationVersion, '20260805153539', 'migration version');
equal(config.stagingFoundation.migrationApplied, true, 'migration applied');
equal(config.stagingFoundation.structuralVerificationPassed, true, 'predecessor verified');
equal(config.compositionRoot.prepared, true, 'root prepared');
equal(config.compositionRoot.connectedToMainRuntime, false, 'not connected');
equal(config.compositionRoot.routeRegistered, false, 'no route');
equal(config.compositionRoot.mutatingRpcExposed, false, 'no mutation rpc');
equal(config.canary.requiredPhrase, phrase, 'phrase frozen');
equal(config.canary.authorizationReceived, true, 'authorization received');
equal(config.canary.authorizationConsumed, true, 'authorization consumed');
equal(config.canary.executionAttempted, true, 'execution attempted');
equal(config.canary.successfulExecutions, 1, 'one success');
equal(config.canary.failedExecutions, 1, 'one historical failure');
equal(config.canary.successfulAttemptNumber, 2, 'successful attempt 2');
equal(config.canary.successfulRunId, 31026205446, 'successful run');
equal(config.canary.successfulExecutionJobId, 92375512459, 'successful job');
equal(config.canary.artifactId, 8938744322, 'artifact id');
equal(config.canary.actorSource, 'server_verified_authenticated_session', 'actor source');
equal(config.canary.assuranceLevel, 'aal1', 'aal');
equal(config.canary.result, 'null', 'probe result null');
equal(config.canary.readOnly, true, 'read only');
equal(config.canary.mutationAllowed, false, 'mutation prohibited');
equal(config.canary.countsUnchanged, true, 'counts unchanged');
equal(config.canary.domainRowsCreated, 0, 'zero rows');
equal(config.canary.endedWithRollback, true, 'rollback');
equal(config.canary.retryAuthorizationRequired, false, 'no retry required');
for (const key of ['authenticatedCanaryAuthority', 'stagingReadAuthority', 'stagingMutationAuthority', 'runtimeDeploymentAuthority', 'productionAuthority', 'pullRequestMergeAuthority']) {
  equal(config.authority[key], false, `${key} closed`);
}
equal(config.effects.networkRequestExecutedByCanary, true, 'network read recorded');
equal(config.effects.databaseReadExecutedByCanary, true, 'database read recorded');
equal(config.effects.databaseMutationExecuted, false, 'no database mutation');
equal(config.effects.routeRegistered, false, 'no route');
equal(config.effects.runtimeDeployed, false, 'no runtime deploy');
equal(config.effects.edgeFunctionDeployed, false, 'no edge deploy');
equal(config.effects.realCommunityChanged, false, 'no community change');
equal(config.effects.realMembershipChanged, false, 'no membership change');
equal(config.effects.realRoleChanged, false, 'no role change');
equal(config.effects.productionChanged, false, 'no production change');
equal(config.effects.pullRequestMerged, false, 'no merge');
equal(config.nextAction, 'define_next_repository_only_com_boundary', 'next action');

equal(fixtures.authorizationCases.length, fixtures.expected.authorizationTotal, 'fixture total');
equal(fixtures.expected.authorized, 1, 'one authorized evaluator case');
equal(fixtures.expected.blocked, 8, 'eight blocked evaluator cases');
check(docs.includes(phrase), 'docs phrase');
check(docs.includes('authenticated read-only canary: passed'), 'docs success');
check(docs.includes('connected to main runtime: false'), 'docs disconnected');
check(docs.includes('database mutation executed: false'), 'docs no mutation');
check(executionDocs.includes('attempt 2: success'), 'execution docs success');
check(executionDocs.includes('run: 31026205446'), 'execution docs run');
check(executionDocs.includes('counts unchanged: true'), 'execution docs counts');
check(!runtime.includes('community-composition-root'), 'main runtime unchanged');
check(!routes.includes("module: 'communities'"), 'no community route');
check(!loader.includes("require('../../modules/communities"), 'loader unchanged');

equal(predecessor.status, 'staging_migration_applied_and_structurally_verified', 'predecessor success');
equal(predecessor.migration.successfulApplications, 1, 'predecessor migration applied');
equal(predecessor.verification.domainRowsCreated, 0, 'predecessor zero rows');
equal(predecessor.remainingAuthority.stagingMutationAuthority, false, 'predecessor mutation authority closed');

equal(initialEvidence.validationId, 'COM-B02D-COMMUNITY-COMPOSITION-ROOT-CANARY-READINESS', 'initial evidence id');
equal(initialEvidence.certification.result, 'success', 'initial readiness certification');
equal(initialEvidence.effects.databaseMutationExecuted, false, 'initial no mutation');

equal(attempt1Evidence.status, 'failed_closed_before_database_access', 'attempt 1 status');
equal(attempt1Evidence.workflow.runId, 31024711149, 'attempt 1 run');
equal(attempt1Evidence.execution.databaseAccessStarted, false, 'attempt 1 database not reached');
equal(attempt1Evidence.effects.databaseMutationExecuted, false, 'attempt 1 no mutation');

equal(attempt2Evidence.status, 'authenticated_read_only_canary_passed', 'attempt 2 status');
equal(attempt2Evidence.workflow.runId, 31026205446, 'attempt 2 run');
equal(attempt2Evidence.workflow.executionJobId, 92375512459, 'attempt 2 job');
equal(attempt2Evidence.artifact.id, 8938744322, 'attempt 2 artifact');
equal(attempt2Evidence.transaction.readOnly, true, 'attempt 2 read only');
equal(attempt2Evidence.transaction.endedWithRollback, true, 'attempt 2 rollback');
equal(attempt2Evidence.result.countsUnchanged, true, 'attempt 2 counts unchanged');
equal(attempt2Evidence.result.domainRowsCreated, 0, 'attempt 2 zero rows');
equal(attempt2Evidence.effects.databaseMutationExecuted, false, 'attempt 2 no mutation');
equal(attempt2Evidence.effects.runtimeDeployed, false, 'attempt 2 no deploy');
equal(attempt2Evidence.effects.productionChanged, false, 'attempt 2 no production');
equal(attempt2Evidence.effects.pullRequestMerged, false, 'attempt 2 no merge');

check(workflow.includes('permissions:\n  contents: read'), 'workflow read-only');
check(workflow.includes('Audit COM-B02D readiness'), 'readiness audit step');
check(workflow.includes('Audit COM-B02D attempt 2 success'), 'attempt 2 audit step');
check(workflow.includes('Conformance COM-B02D'), 'conformance step');
check(workflow.includes('COM-B02C predecessor regression'), 'predecessor regression');
check(workflow.includes('COM-B02D-AUTHENTICATED-READ-ONLY-CANARY-ATTEMPT-2.json'), 'attempt 2 evidence watched');
check(!workflow.includes('workflow_dispatch'), 'no dispatch');
check(!workflow.includes('secrets.'), 'no secrets');
check(!workflow.includes('supabase '), 'no supabase command');
check(!workflow.includes('psql'), 'no psql');
check(!workflow.includes('curl '), 'no curl');

console.log(`COM-B02D final audit passed: ${checks}/${checks}`);
