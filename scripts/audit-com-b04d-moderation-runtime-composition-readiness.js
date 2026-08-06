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

const modulePath = 'backend/modules/communities/community-moderation-runtime-composition.js';
const testPath = 'scripts/test-com-b04d-moderation-runtime-composition-readiness.js';
const configPath = 'config/com-b04d-moderation-runtime-composition-readiness.json';
const docPath = 'docs/COM-B04D-MODERATION-RUNTIME-COMPOSITION-READINESS.md';
const evidencePath = 'docs/validation/COM-B04D-MODERATION-RUNTIME-COMPOSITION-READINESS.json';
const workflowPath = '.github/workflows/com-b04d-moderation-runtime-composition-readiness.yml';
const domainPath = 'backend/modules/communities/community-moderation-case-authority.js';
const adapterPath = 'backend/modules/communities/community-moderation-supabase-repository-adapter.js';

for (const required of [
  modulePath, testPath, configPath, docPath, evidencePath, workflowPath,
  domainPath, adapterPath
]) check(fs.existsSync(path.join(root, required)), `required file: ${required}`);

const source = read(modulePath);
const test = read(testPath);
const config = json(configPath);
const doc = read(docPath);
const evidence = json(evidencePath);
const workflow = read(workflowPath);
const domain = read(domainPath);
const adapter = read(adapterPath);

for (const marker of [
  "const CONTRACT_ID = 'com-b04d-moderation-runtime-composition-readiness-v1'",
  "require('./community-moderation-case-authority')",
  "require('./community-moderation-supabase-repository-adapter')",
  "evaluateCommand({",
  'createModerationSupabaseRepository(input.executor)',
  "Object.freeze(['disabled', 'local_test_double'])",
  'SERVER_SESSION_VERIFIER_REQUIRED',
  'CANONICAL_CONTEXT_LOADER_REQUIRED',
  'SERVER_UTC_CLOCK_REQUIRED',
  'CLIENT_AUTHORITY_OVERRIDE_PROHIBITED',
  'CLIENT_PAYLOAD_AUTHORITY_OVERRIDE_PROHIBITED',
  'PERSISTED_CASE_BINDING_REQUIRED',
  'PERSISTENCE_PROVENANCE_REQUIRED',
  'COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED',
  'buildInitialEvidence',
  'transactionBoundary: repository.transactionBoundary'
]) check(source.includes(marker), `source marker: ${marker}`);

check(!source.includes("activationMode === 'live'"), 'no live activation branch');
check(!source.includes("activationMode === 'staging'"), 'no staging activation branch');
check(!source.includes("activationMode === 'production'"), 'no production activation branch');
check(!source.includes("require('../../shared/http/route-registry')"), 'composition does not register routes');
check(!source.includes('process.env.SUPABASE_SERVICE_ROLE_KEY'), 'no environment secret read');
check(!source.includes('Deno.env.get'), 'no edge secret read');
const decisionIndex = source.indexOf('const decision = evaluateCommand({');
const preparedIndex = source.indexOf("const preparedCommit = decision.decision === 'accept'");
const commitMappingIndex = source.indexOf('buildCommitInput(envelope, actor, context, decision)', preparedIndex);
check(decisionIndex >= 0 && preparedIndex > decisionIndex && commitMappingIndex > preparedIndex,
  'domain evaluates before accepted commit mapping');
check(source.includes("decision.decision === 'accept'"), 'only accept creates commit');
check(source.includes("preparedCommit: null") || source.includes(': null;'), 'non-accept path can remain read-only');
check(source.includes("environment !== 'local_test_double'"), 'test executor environment restricted');
check(source.includes('bearer') === false, 'composition does not parse bearer token');

for (const marker of [
  'open commit prepared',
  'initial evidence materialized',
  'prepare has no RPC for new case',
  'token not retained',
  'COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED',
  'single atomic commit RPC',
  'canonical case loaded first',
  'hash chain bound',
  'evidence appended to projection',
  'CLIENT_AUTHORITY_OVERRIDE_PROHIBITED:actor',
  'CLIENT_PAYLOAD_AUTHORITY_OVERRIDE_PROHIBITED:actorId',
  'SERVER_VERIFIED_SESSION_REQUIRED',
  'CANONICAL_AUTHORIZATION_REQUIRED',
  'PERSISTENCE_PROVENANCE_REQUIRED',
  'domain replay preserved',
  'replay not commit-ready'
]) check(test.includes(marker), `test marker: ${marker}`);

check(test.includes("activationMode: 'local_test_double'"), 'test-only activation covered');
check(test.includes("activationMode: 'live'"), 'invalid live activation covered');
check(test.includes("environment = 'local_test_double'"), 'test executor explicit');
check(test.includes('private-token-never-persisted'), 'token non-retention fixture');
check(test.includes('equal(checks, 38'), 'deterministic test count');

check(domain.includes("const CONTRACT_ID = 'com-b04-moderation-case-authority-v1'"), 'B04 domain contract');
check(domain.includes('commitAuthority: false'), 'domain keeps commit authority false');
check(adapter.includes("const CONTRACT_ID = 'com-b04b-immutable-moderation-persistence-readiness-v1'"), 'B04B adapter contract');
check(adapter.includes("authority !== 'server_service_role'"), 'adapter requires service role executor');
check(adapter.includes("transactionBoundary: 'single_security_definer_rpc'"), 'adapter atomic RPC boundary');
check(source.includes('transactionBoundary: repository.transactionBoundary') &&
  adapter.includes("transactionBoundary: 'single_security_definer_rpc'"),
'composition preserves exact adapter transaction boundary');

equal(config.contractId, 'com-b04d-moderation-runtime-composition-readiness-v1', 'config contract');
equal(config.scope, 'repository_only_runtime_composition_readiness', 'config scope');
equal(config.status, 'repository_composition_ready_live_invocation_blocked', 'config status');
equal(config.composition.defaultActivationMode, 'disabled', 'default disabled');
equal(config.composition.allowedActivationModes, ['disabled', 'local_test_double'], 'only safe modes');
equal(config.composition.liveActivationModePresent, false, 'no live mode');
equal(config.composition.routeRegistered, false, 'route not registered');
equal(config.securityBoundary.serverVerifiedSessionRequired, true, 'server session required');
equal(config.securityBoundary.canonicalServerContextRequired, true, 'canonical context required');
equal(config.securityBoundary.persistedCaseBindingRequired, true, 'persistence binding');
equal(config.securityBoundary.bearerTokenRetainedInPreparedCommand, false, 'token not retained');
equal(config.translationBoundary.domainRulesDuplicated, false, 'domain not duplicated');
equal(config.translationBoundary.initialEvidenceMaterialized, true, 'initial evidence mapping');
equal(config.translationBoundary.singleSecurityDefinerRpcCommit, true, 'single RPC');
equal(config.localConformance.disabledInvocationRejected, true, 'disabled invocation');
equal(config.localConformance.replayRemainsReadOnly, true, 'replay read-only');
equal(config.canonicalMatrix.version, '1.3.110', 'config matrix version');
equal(config.canonicalMatrix.commit, '5cb1b90364be487aaa477a6443a97fbbbb625d34', 'config matrix commit');
equal(config.canonicalMatrix.syncRun, 31063511588, 'config matrix run');
equal(config.canonicalMatrix.syncJob, 92496281894, 'config matrix job');
equal(config.canonicalMatrix.result, 'success', 'config matrix result');
equal(config.canonicalMatrix.comB04DConformance, '39/39', 'config conformance total');
equal(config.canonicalMatrix.comB04DAudit, '136/136', 'config audit total');
equal(config.canonicalMatrix.comB04DContinuity, '71/71', 'config continuity total');
equal(config.canonicalMatrix.globalMatrix, 'passed', 'config global matrix');
equal(config.canonicalMatrix.diffRestriction, 'passed', 'config diff restriction');
for (const [key, value] of Object.entries(config.effects)) equal(value, false, `effect false: ${key}`);
for (const [key, value] of Object.entries(config.remainingAuthority)) equal(value, false, `authority false: ${key}`);

equal(evidence.contractId, config.contractId, 'evidence contract');
equal(evidence.status, config.status, 'evidence status');
equal(evidence.result, 'repository_certified_live_invocation_blocked', 'evidence certified result');
equal(evidence.composition.defaultActivationMode, 'disabled', 'evidence default disabled');
equal(evidence.composition.liveMode, false, 'evidence no live mode');
equal(evidence.composition.routeRegistered, false, 'evidence route false');
equal(evidence.verifiedProperties.initialEvidenceMaterialized, true, 'evidence initial materialization');
equal(evidence.verifiedProperties.disabledModeRejectsInvocation, true, 'evidence disabled invocation');
equal(evidence.verifiedProperties.bearerTokenRetained, false, 'evidence token absent');
equal(evidence.canonicalMatrix.version, config.canonicalMatrix.version, 'evidence matrix version');
equal(evidence.canonicalMatrix.commit, config.canonicalMatrix.commit, 'evidence matrix commit');
equal(evidence.canonicalMatrix.syncRun, config.canonicalMatrix.syncRun, 'evidence matrix run');
equal(evidence.canonicalMatrix.syncJob, config.canonicalMatrix.syncJob, 'evidence matrix job');
equal(evidence.canonicalMatrix.result, 'success', 'evidence matrix result');
equal(evidence.canonicalMatrix.comB04DConformance, '39/39', 'evidence conformance');
equal(evidence.canonicalMatrix.comB04DAudit, '136/136', 'evidence audit');
equal(evidence.canonicalMatrix.comB04DContinuity, '71/71', 'evidence continuity');
equal(evidence.certification.result, 'matrix_sync_certified_pending_final_head_gate', 'evidence certification phase');
for (const [key, value] of Object.entries(evidence.effects)) equal(value, false, `evidence effect false: ${key}`);

for (const marker of [
  'repository_composition_ready_live_invocation_blocked',
  'server session verifier',
  'canonical context loader',
  'PERSISTED_CASE_BINDING_REQUIRED',
  'COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED',
  'initial report statement as an immutable `evidence_record`',
  'database accessed: false',
  'COM-B04E — authenticated staging runtime composition canary'
]) check(doc.includes(marker), `doc marker: ${marker}`);

check(workflow.includes('COM-B04D Moderation Runtime Composition Readiness'), 'workflow name');
check(workflow.includes('permissions:\n  contents: read'), 'workflow read-only permission');
check(workflow.includes('node --check backend/modules/communities/community-moderation-runtime-composition.js'), 'workflow source syntax');
check(workflow.includes('node scripts/test-com-b04d-moderation-runtime-composition-readiness.js'), 'workflow conformance');
check(workflow.includes('node scripts/audit-com-b04d-moderation-runtime-composition-readiness.js'), 'workflow audit');
check(!workflow.includes('secrets.'), 'workflow no secrets');
check(!workflow.includes('supabase db'), 'workflow no database command');
check(!workflow.includes('apply_migration'), 'workflow no migration');
check(!workflow.includes('deploy'), 'workflow no deploy');

console.log(`COM-B04D audit passed: ${checks}/${checks}`);
