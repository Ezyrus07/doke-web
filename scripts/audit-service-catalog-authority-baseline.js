#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const same = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);
const fail = (message) => {
  console.error(`[CAT-A01] ${message}`);
  process.exitCode = 1;
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const files = {
  matrix: 'config/domain-completion-matrix.json',
  repository: 'assets/js/repositories/services-repository.js',
  service: 'assets/js/services/services-service.js',
  moderationRepository: 'assets/js/repositories/service-moderation-repository.js',
  moderationEdge: 'supabase/functions/service-moderation-operations/index.ts',
  moderationMigration: 'supabase/migrations/032_service_listing_moderation.sql',
  directRpcLockdown: 'supabase/migrations/136_self_service_direct_rpc_lockdown.sql',
  publicCatalogTest: 'scripts/test-public-service-catalog-contract.js',
  repositoryTest: 'scripts/test-services-supabase-repository-contract.js',
  moderationTest: 'scripts/test-service-moderation-flow-contract.js',
  evidenceJson: 'docs/validation/CAT-001-A01-AUTHORITY-BASELINE.json',
  evidenceMarkdown: 'docs/validation/CAT-001-A01-AUTHORITY-BASELINE.md',
  catA02EvidenceJson: 'docs/validation/CAT-001-A02-SERVICE-AUTHORITY-RETIREMENT.json',
  catA03EvidenceJson: 'docs/validation/CAT-001-A03-SERVICE-LIFECYCLE-AUTHORITY.json',
  journal: 'docs/DOKE-ENGINEERING-JOURNAL.md',
  quality: '.github/workflows/quality.yml'
};

Object.entries(files)
  .filter(([name]) => !['catA02EvidenceJson', 'catA03EvidenceJson'].includes(name))
  .forEach(([, file]) => assert(exists(file), `required file missing: ${file}`));

const catA02Evidence = exists(files.catA02EvidenceJson)
  ? JSON.parse(read(files.catA02EvidenceJson))
  : null;
const catA02Retired = Boolean(
  catA02Evidence &&
  catA02Evidence.authority &&
  catA02Evidence.authority.browserPersistentAuthority === 'retired'
);
const catA03Evidence = exists(files.catA03EvidenceJson)
  ? JSON.parse(read(files.catA03EvidenceJson))
  : null;
const catA03Reconciled = Boolean(
  catA03Evidence &&
  catA03Evidence.authority &&
  catA03Evidence.authority.contentEdit === 'submit_service_for_review' &&
  catA03Evidence.authority.lifecycle === 'transition_owned_service_lifecycle' &&
  catA03Evidence.authority.browserDirectServicesWrite === 'revoked'
);

const matrix = JSON.parse(read(files.matrix));
const cat = (matrix.domains || []).find((domain) => domain.id === 'CAT-001');
assert(Boolean(cat), 'CAT-001 is missing from the domain completion matrix');
assert(cat && cat.maturity === 4, 'CAT-001 maturity must remain staging_operational baseline level 4');
assert(cat && ['hybrid', 'remote'].includes(cat.userFacingAuthority), 'CAT-001 user-facing authority must remain controlled');
assert(cat && cat.serverAuthority === 'canonical', 'CAT-001 server authority must remain canonical');
assert(cat && cat.stagingEvidence === 'staging_operational', 'CAT-001 staging evidence must remain operational');
assert(cat && cat.securityGate === 'partial', 'CAT-001 security gate must remain partial while blockers are open');
assert(cat && cat.productionGate === 'blocked', 'CAT-001 production gate must remain blocked');
const blockerIds = (cat && cat.blockers || []).map((blocker) => blocker.id).sort();
assert(
  same(blockerIds, ['CAT-B03', 'CAT-B04']) || same(blockerIds, ['CAT-B04']),
  'CAT-001 blocker set changed outside the controlled CAT reconciliation'
);
assert(
  same((cat && cat.dependencies || []).slice().sort(), ['AUTH-001', 'PROF-001', 'SEC-001']),
  'CAT-001 dependency boundary changed'
);

const repository = read(files.repository);
[
  "REMOTE_TABLE = 'services'",
  "REMOTE_MEDIA_TABLE = 'service_media'",
  "REMOTE_VERSIONS_TABLE = 'service_versions'",
  "invokeSelfService('submit_service_for_review'",
  'uploadServiceImages',
  'isPubliclyVisible',
  'approvedContentRemainsPublic'
].forEach((marker) => assert(repository.includes(marker), `catalog authority marker missing: ${marker}`));

if (catA02Retired) {
  [
    "AUTHORITY = 'supabase-or-fixture-memory'",
    'fixtureServices',
    'readFixtureServices',
    'upsertFixture',
    'createAuthorityUnavailableError',
    "setProviderState('remote-unavailable')",
    "provider: getSupabaseClient() ? 'supabase' : 'fixture-memory'"
  ].forEach((marker) => assert(repository.includes(marker), `post-CAT-A02 authority marker missing: ${marker}`));
  [
    'doke.services.local.v1',
    'root.localStorage',
    'synchronizePending',
    'local-fallback',
    'upsertLocal',
    'readLocalServices',
    'writeLocalServices',
    'resolveReadableLocalService'
  ].forEach((marker) => assert(!repository.includes(marker), `retired CAT-A02 marker remains executable: ${marker}`));
} else {
  [
    "var STORAGE_KEY = 'doke.services.local.v1'",
    'root.localStorage.getItem(STORAGE_KEY)',
    'root.localStorage.setItem(STORAGE_KEY',
    "setProviderState('local-fallback')",
    "upsertLocal(normalized, 'pending')",
    'return clone(fallback)',
    'mergeById(local, remote)',
    'synchronizePending(merged)',
    'resolveReadableLocalService'
  ].forEach((marker) => assert(repository.includes(marker), `catalog authority marker missing: ${marker}`));
}

[
  'function load(',
  'function list(',
  'function getById(',
  'function save(',
  'function submitForReview(',
  'function getOwnedReviewDraft(',
  'function update(',
  'function deactivate('
].forEach((marker) => assert(repository.includes(marker), `repository surface changed without a controlled sublot: ${marker}`));

const service = read(files.service);
[
  'function submitForReview(',
  'return repository.submitForReview(service, options)',
  'function transitionOwned(',
  'function updateOwned(',
  'function deactivateOwned(',
  'function reactivateOwned(',
  'function archiveOwned('
].forEach((marker) => assert(service.includes(marker), `service lifecycle marker missing: ${marker}`));

if (catA03Reconciled) {
  [
    'repository.submitForReview(candidate',
    'repository.transitionOwnedLifecycle',
    'DOKE_SERVICE_MUTATION_SPLIT_REQUIRED',
    'DOKE_SERVICE_ARCHIVED'
  ].forEach((marker) => assert(service.includes(marker), `post-CAT-A03 lifecycle marker missing: ${marker}`));
  assert(!service.includes('return repository.update(serviceId, patch || {})'), 'CAT-A03 cannot retain generic remote edit routing');
  [
    "invokeSelfService('transition_owned_service_lifecycle'",
    'DOKE_SERVICE_DIRECT_MUTATION_FORBIDDEN',
    'transitionOwnedLifecycle: transitionOwnedLifecycle'
  ].forEach((marker) => assert(repository.includes(marker), `post-CAT-A03 repository marker missing: ${marker}`));
  assert(!repository.includes('function saveRemote(service)'), 'CAT-A03 cannot retain direct remote save authority');
} else {
  assert(service.includes('return repository.update(serviceId, patch || {})'), 'pre-CAT-A03 generic lifecycle marker missing');
}

const moderationRepository = read(files.moderationRepository);
[
  "FUNCTION_NAME = 'service-moderation-operations'",
  'client.functions.invoke',
  "invoke('list'",
  "invoke('detail'",
  "invoke('audit'",
  "invoke('approve'",
  "invoke('request_changes'",
  "invoke('reject'"
].forEach((marker) => assert(moderationRepository.includes(marker), `moderation repository marker missing: ${marker}`));
assert(!moderationRepository.includes('.rpc('), 'browser moderation repository must not call privileged RPCs directly');

const moderationEdge = read(files.moderationEdge);
[
  'authClient.auth.getUser()',
  '.from("users")',
  '["admin", "moderator"].includes(role)',
  'list_service_review_queue_internal',
  'get_service_review_detail_internal',
  'approve_service_version_internal',
  'request_service_version_changes_internal',
  'reject_service_version_internal'
].forEach((marker) => assert(moderationEdge.includes(marker), `canonical moderation Edge marker missing: ${marker}`));

const moderationMigration = read(files.moderationMigration);
[
  'create table if not exists public.service_versions',
  'approved_version_id',
  'pending_version_id',
  'trg_protect_service_moderation_state',
  'service_versions_owner_read'
].forEach((marker) => assert(moderationMigration.includes(marker), `versioned moderation schema marker missing: ${marker}`));

const lockdown = read(files.directRpcLockdown);
[
  'revoke execute on function public.submit_service_for_review',
  'to service_role'
].forEach((marker) => assert(lockdown.includes(marker), `self-service gateway lockdown marker missing: ${marker}`));

const quality = read(files.quality);
[
  "- 'cat/**'",
  'Audit CAT-A01 service catalog authority baseline',
  'node scripts/audit-service-catalog-authority-baseline.js'
].forEach((marker) => assert(quality.includes(marker), `Quality integration missing: ${marker}`));

const evidence = JSON.parse(read(files.evidenceJson));
assert(evidence.domain === 'CAT-001' && evidence.sublot === 'CAT-A01', 'CAT-A01 evidence identity is invalid');
assert(evidence.status === 'baseline_frozen', 'CAT-A01 evidence must remain baseline_frozen');
assert(['pending', 'done'].includes(evidence.validationStatus), 'CAT-A01 validation status is invalid');
assert(evidence.authority && evidence.authority.browserStorageKey === 'doke.services.local.v1', 'browser storage key is not documented');
assert(evidence.authority && evidence.authority.ownerDraftAndLifecycle === 'hybrid_browser_and_remote', 'historical hybrid owner authority is not documented');
assert(evidence.safety && evidence.safety.implementationChanged === false, 'CAT-A01 cannot claim an implementation change');
assert(evidence.safety && evidence.safety.stagingChanged === false, 'CAT-A01 cannot change staging');
assert(evidence.safety && evidence.safety.productionChanged === false, 'CAT-A01 cannot change production');

const evidenceMarkdown = read(files.evidenceMarkdown);
[
  'BASELINE FROZEN',
  'doke.services.local.v1',
  'CAT-B03',
  'CAT-B04',
  'CAT-A02'
].forEach((marker) => assert(evidenceMarkdown.includes(marker), `human evidence marker missing: ${marker}`));

if (evidence.validationStatus === 'done') {
  const requiredSuccess = [
    'staticAudit',
    'quality',
    'blockingE2E',
    'visualStructuralGuards',
    'stagingCanary',
    'diagnostic',
    'finalEvidence'
  ];
  requiredSuccess.forEach((field) => {
    assert(evidence.validation && evidence.validation[field] === 'success', `completed CAT-A01 evidence requires validation.${field}=success`);
  });
  ['qualityRunNumber', 'stagingCanaryRunNumber', 'diagnosticRunNumber'].forEach((field) => {
    assert(Number.isInteger(evidence.validation && evidence.validation[field]), `completed CAT-A01 evidence requires integer validation.${field}`);
  });
  assert(/^[0-9a-f]{40}$/i.test(String(evidence.validatedCandidateHead || '')), 'completed CAT-A01 evidence requires a full validatedCandidateHead');
  assert(evidence.safety && evidence.safety.temporaryWorkflowRemaining === false, 'completed CAT-A01 evidence cannot leave a temporary workflow');
  assert(evidenceMarkdown.includes('BASELINE FROZEN — DONE'), 'completed CAT-A01 human evidence must be marked DONE');
  assert(
    read(files.journal).includes('# 2026-07-27 — CAT-A01 / baseline de autoridade do catálogo'),
    'completed CAT-A01 evidence requires the engineering journal entry'
  );
}

function walk(dir) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(dir.replace(/\\/g, '/'), entry.name);
    return entry.isDirectory() ? walk(relative) : [relative];
  });
}

const assetScripts = walk('assets/js').filter((file) => file.endsWith('.js'));
const localAuthorityOwners = assetScripts.filter((file) => read(file).includes('doke.services.local.v1')).sort();
assert(
  same(localAuthorityOwners, catA02Retired ? [] : [files.repository]),
  `service browser authority escaped its controlled lifecycle: ${JSON.stringify(localAuthorityOwners)}`
);

const htmlFiles = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
  .map((entry) => entry.name)
  .filter((file) => read(file).includes('services-repository.js'))
  .sort();
const expectedHtmlFiles = [
  'anunciar-servico.html',
  'detalhe-anuncio.html',
  'index.html',
  'orcamento.html',
  'perfil-profissional.html',
  'perfil.html',
  'resultados.html'
].sort();
assert(same(htmlFiles, expectedHtmlFiles), `services repository loading surface changed: ${JSON.stringify(htmlFiles)}`);

if (!process.exitCode) {
  console.log('[CAT-A01] service catalog authority baseline remains traceable.');
  console.log('[CAT-A01] public catalog and moderation: remote/server canonical.');
  console.log(`[CAT-A01] browser service authority: ${catA02Retired ? 'retired by CAT-A02' : 'hybrid browser/remote baseline'}.`);
  console.log(`[CAT-A01] owner lifecycle authority: ${catA03Reconciled ? 'server-side via CAT-A03' : 'pre-CAT-A03 generic repository path'}.`);
  console.log(`[CAT-A01] remaining blockers: ${blockerIds.join(', ')}.`);
}
