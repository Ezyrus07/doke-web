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
  journal: 'docs/DOKE-ENGINEERING-JOURNAL.md',
  quality: '.github/workflows/quality.yml'
};

Object.values(files).forEach((file) => assert(exists(file), `required file missing: ${file}`));

const matrix = JSON.parse(read(files.matrix));
const cat = (matrix.domains || []).find((domain) => domain.id === 'CAT-001');
assert(Boolean(cat), 'CAT-001 is missing from the domain completion matrix');
assert(cat && cat.maturity === 4, 'CAT-001 maturity must remain staging_operational baseline level 4');
assert(cat && cat.userFacingAuthority === 'hybrid', 'CAT-001 user-facing authority must remain hybrid before CAT-B03 retirement');
assert(cat && cat.serverAuthority === 'canonical', 'CAT-001 server authority must remain canonical');
assert(cat && cat.stagingEvidence === 'staging_operational', 'CAT-001 staging evidence must remain operational');
assert(cat && cat.securityGate === 'partial', 'CAT-001 security gate must remain partial while blockers are open');
assert(cat && cat.productionGate === 'blocked', 'CAT-001 production gate must remain blocked');
assert(
  same((cat && cat.blockers || []).map((blocker) => blocker.id).sort(), ['CAT-B03', 'CAT-B04']),
  'CAT-001 blocker set changed without a controlled sublot'
);
assert(
  same((cat && cat.dependencies || []).slice().sort(), ['AUTH-001', 'PROF-001', 'SEC-001']),
  'CAT-001 dependency boundary changed'
);

const repository = read(files.repository);
[
  "var STORAGE_KEY = 'doke.services.local.v1'",
  'root.localStorage.getItem(STORAGE_KEY)',
  'root.localStorage.setItem(STORAGE_KEY',
  "setProviderState('local-fallback')",
  "upsertLocal(normalized, 'pending')",
  'return clone(fallback)',
  'mergeById(local, remote)',
  'synchronizePending(merged)',
  'resolveReadableLocalService',
  "REMOTE_TABLE = 'services'",
  "REMOTE_MEDIA_TABLE = 'service_media'",
  "REMOTE_VERSIONS_TABLE = 'service_versions'",
  "invokeSelfService('submit_service_for_review'",
  'uploadServiceImages',
  'isPubliclyVisible',
  'approvedContentRemainsPublic'
].forEach((marker) => assert(repository.includes(marker), `catalog authority marker missing: ${marker}`));

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
  'return repository.update(serviceId, patch || {})',
  'function deactivateOwned(',
  'function reactivateOwned(',
  'function archiveOwned('
].forEach((marker) => assert(service.includes(marker), `service lifecycle marker missing: ${marker}`));

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
assert(evidence.authority && evidence.authority.ownerDraftAndLifecycle === 'hybrid_browser_and_remote', 'hybrid owner authority is not documented');
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
  same(localAuthorityOwners, [files.repository]),
  `service browser authority escaped its controlled owner: ${JSON.stringify(localAuthorityOwners)}`
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
  console.log('[CAT-A01] owner drafts and lifecycle: hybrid browser/remote.');
  console.log('[CAT-A01] remaining blockers: CAT-B03, CAT-B04.');
}
