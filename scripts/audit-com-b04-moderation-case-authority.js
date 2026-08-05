'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = {
  module: 'backend/modules/communities/community-moderation-case-authority.js',
  config: 'config/com-b04-moderation-case-authority.json',
  fixture: 'tests/fixtures/com-b04-moderation-case-cases.json',
  test: 'scripts/test-com-b04-moderation-case-authority.js',
  docs: 'docs/COM-B04-MODERATION-CASE-AUTHORITY.md',
  evidence: 'docs/validation/COM-B04-MODERATION-CASE-AUTHORITY.json',
  workflow: '.github/workflows/com-b04-moderation-case-authority.yml',
  a03Module: 'backend/modules/communities/community-governance-discipline-contract.js',
  a05Module: 'backend/modules/communities/community-moderation-media-contract.js',
  a05Config: 'config/com-a05-moderation-appeal-media-readiness.json',
  b03Config: 'config/com-b03-realtime-channel-scale-policy.json',
  runtime: 'backend/runtime/staging/staging-api-runtime.js',
  routes: 'backend/shared/http/route-registry.js',
  loader: 'backend/shared/http/module-route-loader.js'
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
const fixture = JSON.parse(read('fixture'));
const test = read('test');
const docs = read('docs');
const evidence = JSON.parse(read('evidence'));
const workflow = read('workflow');
const a03Module = read('a03Module');
const a05Module = read('a05Module');
const a05Config = JSON.parse(read('a05Config'));
const b03Config = JSON.parse(read('b03Config'));
const runtime = read('runtime');
const routes = read('routes');
const loader = read('loader');
const contract = 'com-b04-moderation-case-authority-v1';

for (const marker of [
  `const CONTRACT_ID = '${contract}'`,
  "'open_case'", "'attach_evidence'", "'record_media_scan'",
  "'recommend_decision'", "'approve_decision'", "'open_appeal'",
  "'recommend_appeal_decision'", "'approve_appeal_decision'",
  "'expire_sanction'", "'close_case'",
  "'content_report', 'member_report', 'media_review'",
  "'serializable'", 'rollbackOnFailure: true', 'commitAuthority: false',
  'AUTOMATIC_FINAL_DECISION_PROHIBITED', 'RECOMMENDER_CANNOT_SELF_APPROVE',
  'INDEPENDENT_APPEAL_REVIEWER_REQUIRED', 'MEDIA_SCANNER_CANNOT_APPROVE_DISPOSITION',
  'PERMANENT_BAN_REQUIRES_EXPLICIT_APPROVAL', 'SANCTION_DURATION_EXCEEDS_POLICY',
  'reportWriteAuthority: false', 'repositoryWriteAuthority: false',
  'runtimeMutationAuthority: false', 'stagingAuthority: false',
  'productionAuthority: false', 'pullRequestMergeAuthority: false'
]) check(source.includes(marker), `source marker: ${marker}`);

for (const token of [
  'createClient', 'process.env', 'fetch(', '.channel(', 'postgres_changes',
  'ALTER TABLE', 'CREATE TABLE', 'ALTER PUBLICATION', 'supabase_realtime',
  'supabase.from(', 'serviceSupabase.from(', 'client.from(', 'pg.Client',
  'new Pool(', 'storage.from('
]) check(!source.includes(token), `no operational surface: ${token}`);

 equal(config.contractId, contract, 'config contract');
equal(config.domain, 'COM-001', 'domain');
equal(config.scope, 'repository_only', 'scope');
equal(config.status, 'repository_contract_certified_runtime_blocked', 'certified status');
equal(config.caseAuthority.caseKinds.length, 3, 'case kinds');
equal(config.caseAuthority.caseStates.length, 12, 'case states');
equal(config.caseAuthority.canonicalServerSnapshotRequired, true, 'canonical case');
equal(config.caseAuthority.expectedRevisionRequired, true, 'expected revision');
equal(config.caseAuthority.serializableTransactionRequired, true, 'serializable');
equal(config.caseAuthority.compareAndSwapProjectionRequired, true, 'cas');
equal(config.caseAuthority.automaticFinalDecisionAllowed, false, 'automatic false');
equal(config.caseAuthority.reportCountCreatesSanction, false, 'report count false');
equal(config.evidence.opaqueReferencesOnly, true, 'opaque evidence');
equal(config.evidence.sha256DigestRequired, true, 'digest');
equal(config.evidence.rawPayloadAllowed, false, 'raw false');
equal(config.decisions.outcomes.length, 11, 'outcomes');
equal(config.decisions.recommenderCannotApprove, true, 'self approval false');
equal(config.decisions.reporterTargetAndAuthorCannotDecide, true, 'conflict separation');
equal(config.decisions.irreversibleOutcomesRequireDualControl, true, 'dual control');
equal(config.decisions.runtimeAppliedByContract, false, 'runtime false');
equal(config.sanctions.maximumMuteDays, 30, 'mute cap');
equal(config.sanctions.maximumRestrictionDays, 90, 'restriction cap');
equal(config.sanctions.maximumTemporaryBanDays, 365, 'ban cap');
equal(config.sanctions.onlyBanMayBePermanent, true, 'permanent only ban');
equal(config.appeals.windowDays, 14, 'appeal window');
equal(config.appeals.originalRecommenderExcluded, true, 'original recommender excluded');
equal(config.appeals.originalApproverExcluded, true, 'original approver excluded');
equal(config.appeals.priorDecisionImmutable, true, 'prior immutable');
equal(config.media.scanResultCreatesFinalDecision, false, 'scan not decision');
equal(config.media.scannerCannotApproveDisposition, true, 'scanner separation');
equal(config.repositoryPort.methods.length, 8, 'repository methods');
equal(config.repositoryPort.isolation, 'serializable', 'repository isolation');
equal(config.repositoryPort.commitAuthority, false, 'commit closed');
for (const key of ['runtimeIntegrated', 'migrationPrepared', 'migrationApplied', 'stagingValidated']) {
  equal(config[key], false, `${key} false`);
}
for (const [key, value] of Object.entries(config.authority)) {
  if (key === 'contractAuthority') equal(value, true, 'contract authority only');
  else equal(value, false, `${key} closed`);
}
for (const value of Object.values(config.prohibitedEffects)) equal(value, false, 'effect false');
equal(config.certification.head, '33c0f454ced665af4363bc86dbecf6b3b59249d5', 'certified head');
equal(config.certification.run, 31056452918, 'certification run');
equal(config.certification.job, 92474892858, 'certification job');
equal(config.certification.audit, '210/210', 'certification audit');
equal(config.certification.conformance, '51/51', 'certification conformance');
equal(config.certification.result, 'success', 'certification success');

 equal(fixture.contractId, contract, 'fixture contract');
equal(fixture.scope, 'repository_only', 'fixture scope');
equal(fixture.positiveCases.length, 9, 'positive fixture count');
equal(fixture.negativeCases.length, 10, 'negative fixture count');
equal(fixture.expected.commands, 10, 'fixture commands');
equal(fixture.expected.repositoryMethods, 8, 'fixture repository methods');
equal(fixture.expected.appealWindowDays, 14, 'fixture appeal');
equal(fixture.expected.maximumMuteDays, 30, 'fixture mute');
equal(fixture.expected.maximumRestrictionDays, 90, 'fixture restriction');
equal(fixture.expected.maximumTemporaryBanDays, 365, 'fixture ban');
equal(fixture.expected.automaticEnforcementAllowed, false, 'fixture automatic false');
equal(fixture.expected.scanResultCreatesFinalDecision, false, 'fixture scan false');

for (const marker of [
  'COM-B04 conformance passed', 'open accepted', 'automatic prohibited',
  'self approval rejected', 'scan not final', 'appeal independently approved',
  'no repository write authority'
]) check(test.includes(marker), `test marker: ${marker}`);

 equal(evidence.validationId, 'COM-B04-MODERATION-CASE-AUTHORITY', 'evidence id');
equal(evidence.contractId, contract, 'evidence contract');
equal(evidence.status, 'repository_contract_certified', 'evidence certified');
equal(evidence.scope, 'repository_only', 'evidence scope');
equal(evidence.certification.headSha, '33c0f454ced665af4363bc86dbecf6b3b59249d5', 'evidence head');
equal(evidence.certification.runId, 31056452918, 'evidence run');
equal(evidence.certification.jobId, 92474892858, 'evidence job');
equal(evidence.certification.auditPassed, 210, 'evidence audit');
equal(evidence.certification.conformancePassed, 51, 'evidence conformance');
equal(evidence.certification.diffHygiene, 'success', 'evidence hygiene');
for (const value of Object.values(evidence.effects)) equal(value, false, 'evidence effect false');
for (const value of Object.values(evidence.remainingAuthority)) equal(value, false, 'evidence authority false');

 equal(a05Config.contractId, 'com-a05-moderation-appeal-media-readiness-v1', 'A05 predecessor config');
equal(a05Config.status, 'contract_complete_runtime_blocked', 'A05 complete');
check(a05Module.includes("const CONTRACT_ID = 'com-a05-moderation-appeal-media-readiness-v1'"), 'A05 source contract');
check(a05Module.includes('INDEPENDENT_MODERATOR_REQUIRED'), 'A05 moderator separation');
check(a05Module.includes('INDEPENDENT_MEDIA_RELEASE_APPROVAL_REQUIRED'), 'A05 media dual control');
check(a05Module.includes('priorDecisionImmutable: true'), 'A05 prior decision immutable');
check(a03Module.includes("const CONTRACT_ID = 'com-a03-governance-discipline-ledger-v1'"), 'A03 predecessor');
check(a03Module.includes('SANCTION_DURATION_EXCEEDS_POLICY'), 'A03 sanction limits');
equal(b03Config.contractId, 'com-b03-realtime-channel-scale-policy-v1', 'B03 predecessor');
equal(b03Config.status, 'repository_contract_certified_runtime_blocked', 'B03 certified');

for (const marker of [
  'COM-B04 — autoridade canônica de casos de moderação',
  'com-b04-moderation-case-authority-v1',
  'Nenhuma contagem de denúncias ou classificação automática produz decisão final.',
  'commitAuthority',
  'COM-B04B'
]) check(docs.includes(marker), `docs marker: ${marker}`);

check(!runtime.includes('community-moderation-case-authority'), 'runtime unchanged');
check(!routes.includes("module: 'community-moderation-case-authority'"), 'route absent');
check(!loader.includes('community-moderation-case-authority'), 'loader unchanged');
for (const marker of [
  'permissions:\n  contents: read', 'Audit COM-B04', 'Conformance COM-B04',
  'COM-A05 predecessor regression', 'COM-A03 predecessor regression',
  'COM-B03 predecessor regression', 'Diff hygiene'
]) check(workflow.includes(marker), `workflow marker: ${marker}`);
for (const token of ['workflow_dispatch', 'secrets.', 'psql', 'curl ', 'contents: write', 'supabase ']) {
  check(!workflow.includes(token), `workflow no ${token}`);
}

console.log(`COM-B04 audit passed: ${checks}/${checks}`);
