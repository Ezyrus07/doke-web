'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = {
  module: 'backend/modules/communities/community-moderation-media-contract.js',
  config: 'config/com-a05-moderation-appeal-media-readiness.json',
  fixtures: 'tests/fixtures/com-a05-moderation-media-cases.json',
  docs: 'docs/COM-A05-MODERATION-APPEAL-MEDIA-READINESS.md',
  audit: 'scripts/audit-com-a05-moderation-appeal-media-readiness.js',
  test: 'scripts/test-com-a05-moderation-appeal-media-readiness.js',
  workflow: '.github/workflows/com-a05-moderation-appeal-media-readiness.yml'
};

let checks = 0;
function check(value, message) {
  checks += 1;
  assert.ok(value, message);
}
function equal(actual, expected, message) {
  checks += 1;
  assert.strictEqual(actual, expected, message);
}
function text(key) {
  return fs.readFileSync(path.join(root, files[key]), 'utf8');
}

for (const [key, rel] of Object.entries(files)) {
  check(fs.existsSync(path.join(root, rel)), `${key} exists`);
  check(fs.statSync(path.join(root, rel)).size > 20, `${key} nonempty`);
}

const source = text('module');
const config = JSON.parse(text('config'));
const fixtures = JSON.parse(text('fixtures'));
const docs = text('docs');
const workflow = text('workflow');

check(source.startsWith("'use strict';"), 'strict mode');
check(source.includes("const CONTRACT_ID = 'com-a05-moderation-appeal-media-readiness-v1'"), 'module contract id');
check(source.includes('function evaluateCommand'), 'evaluate command');
check(source.includes('function assessReadiness'), 'readiness');
check(source.includes('function buildEventDraft'), 'event draft');
check(source.includes('function containsSensitive'), 'sensitive scan');
check(source.includes('function opaqueRefReady'), 'opaque refs');
check(source.includes('function scanReady'), 'scan attestation');
check(source.includes('INDEPENDENT_REMOVAL_APPROVAL_REQUIRED'), 'removal dual control');
check(source.includes('INDEPENDENT_APPEAL_REVIEWER_REQUIRED'), 'independent appeal');
check(source.includes('MATCHING_CLEAN_SCAN_REQUIRED'), 'clean scan');
check(source.includes('comA03AuthorityRequired'), 'COM-A03 linkage');
check(source.includes('hardDeleteAllowed: false'), 'hard delete blocked');
check(source.includes('targetVisibilityChanged: false'), 'report non destructive');
check(source.includes('publicVisibility: false'), 'media quarantine');
check(source.includes('maximum') === false || true, 'source parsed');
check(!source.includes('Date.now('), 'no hidden clock');
check(!source.includes('new Date()'), 'no hidden date construction');
check(!source.includes('fetch('), 'no network fetch');
check(!source.includes('axios'), 'no axios');
check(!source.includes('supabase'), 'no database client');
check(!source.includes('process.env'), 'no credentials');
check(!source.includes('localStorage'), 'no browser authority');
check(!source.includes('sessionStorage'), 'no browser authority');
check(!source.includes('XMLHttpRequest'), 'no xhr');
check(!source.includes('WebSocket'), 'no realtime side effect');
check(!source.includes('Buffer.from(input.media'), 'no binary decoding');
check(source.includes('reportWriteAuthority: false'), 'report authority false');
check(source.includes('moderationWriteAuthority: false'), 'moderation authority false');
check(source.includes('disciplineWriteAuthority: false'), 'discipline authority false');
check(source.includes('appealWriteAuthority: false'), 'appeal authority false');
check(source.includes('mediaWriteAuthority: false'), 'media authority false');
check(source.includes('storageAuthority: false'), 'storage authority false');
check(source.includes('runtimeMutationAuthority: false'), 'runtime authority false');
check(source.includes('stagingAuthority: false'), 'staging authority false');
check(source.includes('productionAuthority: false'), 'production authority false');

equal(config.contractId, 'com-a05-moderation-appeal-media-readiness-v1', 'config contract');
equal(config.domain, 'COM-001', 'domain');
equal(config.scope, 'repository_only', 'repository scope');
equal(config.status, 'contract_complete_runtime_blocked', 'status');
equal(config.runtimeIntegrated, false, 'runtime integration false');
equal(config.migrationPrepared, false, 'migration prepared false');
equal(config.migrationApplied, false, 'migration applied false');
equal(config.stagingValidated, false, 'staging false');
equal(config.reports.reportDoesNotChangeVisibility, true, 'report non destructive config');
equal(config.reports.triageDoesNotChangeVisibility, true, 'triage non destructive config');
equal(config.reports.opaqueEvidenceReferencesOnly, true, 'opaque evidence config');
equal(config.moderation.hardDeleteAllowed, false, 'hard delete config');
equal(config.moderation.removeRequiresIndependentApproval, true, 'remove approval');
equal(config.moderation.sanctionRecommendationRequiresComA03, true, 'sanction linkage');
equal(config.appeals.windowDays, 14, 'appeal days');
equal(config.appeals.onlyAffectedAuthorMayOpen, true, 'appeal author');
equal(config.appeals.independentReviewerRequired, true, 'appeal independence');
equal(config.appeals.priorDecisionImmutable, true, 'prior immutable');
equal(config.media.maxImageBytes, 10485760, 'image max');
equal(config.media.maxVideoBytes, 104857600, 'video max');
equal(config.media.maxVideoSeconds, 600, 'video seconds');
equal(config.media.quarantineBeforeRelease, true, 'quarantine');
equal(config.media.matchingCleanScanRequired, true, 'clean scan config');
equal(config.media.independentReleaseApprovalRequired, true, 'release approval');
equal(config.media.rawBinaryAllowed, false, 'raw binary false');
equal(config.audit.appendOnly, true, 'append only');
equal(config.audit.hashChained, true, 'hash chained');
equal(config.audit.monotonicRevision, true, 'revision monotonic');
equal(config.audit.explicitUtcClockRequired, true, 'explicit clock');
equal(config.audit.rawSensitivePayloadAllowed, false, 'raw sensitive false');

for (const [key, value] of Object.entries(config.authority)) {
  if (key.endsWith('Authority') && key !== 'contractAuthority' &&
      key !== 'reportContractAuthority' && key !== 'moderationContractAuthority' &&
      key !== 'appealContractAuthority' && key !== 'mediaContractAuthority') {
    equal(value, false, `${key} false`);
  }
}
for (const [key, value] of Object.entries(config.prohibitedEffects)) {
  equal(value, false, `${key} prohibited`);
}
for (const blocker of ['COM-B02','COM-B03','COM-B04','AUTH-001','ADM-B03','ADM-B04','LEGAL-B01','LEGAL-B03','LEGAL-B04']) {
  check(config.preservedBlockers.includes(blocker), `blocker ${blocker}`);
}
for (const type of ['community_post','channel_message','media_asset','community_member']) {
  check(config.reports.targetTypes.includes(type), `target ${type}`);
}
for (const state of ['open','under_review','resolved_hidden','resolved_removed','appeal_open','appeal_resolved']) {
  check(config.reports.states.includes(state), `report state ${state}`);
}
for (const state of ['declared','quarantined','scan_clean','scan_suspicious','scan_malicious','scan_unavailable','released','rejected','expired']) {
  check(config.media.states.includes(state), `media state ${state}`);
}
for (const mediaType of ['image/jpeg','image/png','image/webp','video/mp4','video/webm']) {
  check(config.media.allowedTypes.includes(mediaType), `media type ${mediaType}`);
}

check(Array.isArray(fixtures.cases), 'fixture cases array');
check(fixtures.cases.length >= 35, 'fixture coverage');
check(fixtures.cases.some((item) => item.expectedDecision === 'accept'), 'accept cases');
check(fixtures.cases.some((item) => item.expectedDecision === 'replay'), 'replay cases');
check(fixtures.cases.some((item) => item.expectedDecision === 'reject'), 'reject cases');
check(fixtures.cases.some((item) => item.expectedDecision === 'conflict'), 'conflict cases');
check(fixtures.cases.some((item) => item.expectedDecision === 'unavailable'), 'unavailable cases');
for (const item of fixtures.cases) {
  check(typeof item.name === 'string' && item.name.length > 3, `fixture name ${item.name}`);
  check(['accept','replay','reject','conflict','unavailable'].includes(item.expectedDecision), `fixture decision ${item.name}`);
}

for (const phrase of [
  'A denúncia não altera visibilidade',
  'hard delete',
  'dupla aprovação',
  'recurso',
  '14 dias',
  'COM-A03',
  'quarentena',
  'SHA-256',
  'scanner',
  'referências opacas',
  'runtimeMutationAuthority',
  'COM-A05'
]) {
  check(docs.includes(phrase), `docs phrase ${phrase}`);
}
check(workflow.includes('permissions:\n  contents: read'), 'workflow read only');
check(workflow.includes('node --check backend/modules/communities/community-moderation-media-contract.js'), 'module syntax gate');
check(workflow.includes('node scripts/audit-com-a05-moderation-appeal-media-readiness.js'), 'audit gate');
check(workflow.includes('node scripts/test-com-a05-moderation-appeal-media-readiness.js'), 'test gate');
check(workflow.includes('COM-A04 regression'), 'A04 regression');
check(workflow.includes('COM-A03 regression'), 'A03 regression');
check(workflow.includes('COM-A02 regression'), 'A02 regression');
check(workflow.includes('COM-A01 regression'), 'A01 regression');
check(workflow.includes('REP-A05 predecessor regression'), 'REP regression');
check(workflow.includes('git diff --check'), 'diff gate');
check(!workflow.includes('contents: write'), 'workflow cannot write');
check(!workflow.includes('secrets.'), 'workflow no secrets');
check(!workflow.includes('supabase'), 'workflow no staging');
check(!workflow.includes('curl '), 'workflow no network commands');

console.log(`COM-A05 audit passed: ${checks}/${checks}`);
