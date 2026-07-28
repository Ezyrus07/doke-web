#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { console.error('[CAT-A04] ' + message); process.exitCode = 1; };
const assert = (condition, message) => { if (!condition) fail(message); };

const files = {
  catalogSchema: 'supabase/migrations/002_marketplace_core.sql',
  sharedRuntime: 'supabase/migrations/009_service_catalog_shared_runtime.sql',
  moderation: 'supabase/migrations/032_service_listing_moderation.sql',
  storageAuthority: 'supabase/migrations/117_service_media_storage_authority.sql',
  uploadAuthority: 'supabase/migrations/150_service_media_upload_authority.sql',
  cleanupAuthority: 'supabase/migrations/155_service_media_reference_safe_cleanup_authority.sql',
  repository: 'assets/js/repositories/services-repository.js',
  servicesService: 'assets/js/services/services-service.js',
  mediaService: 'assets/js/services/service-media-upload-service.js',
  qualityWorkflow: '.github/workflows/quality.yml',
  qualityPipeline: 'scripts/audit-quality-pipeline.js',
  catA03: 'docs/validation/CAT-001-A03-SERVICE-LIFECYCLE-AUTHORITY.json',
  baselineJson: 'docs/validation/CAT-001-A04-SERVICE-MEDIA-LIFECYCLE-BASELINE.json',
  baselineMarkdown: 'docs/validation/CAT-001-A04-SERVICE-MEDIA-LIFECYCLE-BASELINE.md',
  finalCandidate: 'docs/validation/CAT-001-A04-FINAL-CLOSURE-CANDIDATE.json'
};

Object.values(files).forEach((file) => assert(exists(file), 'required file missing: ' + file));

const catA03 = JSON.parse(read(files.catA03));
assert(catA03.status === 'done', 'CAT-A03 must remain done before CAT-A04');
assert(catA03.validation && catA03.validation.finalEvidence === 'success', 'CAT-A03 final evidence must remain successful');

const finalCandidate = JSON.parse(read(files.finalCandidate));
const implementationReconciled = Boolean(
  ['TECHNICALLY_COMPLETE_CI_PENDING', 'COMPLETE'].includes(finalCandidate.status) &&
  finalCandidate.closure &&
  finalCandidate.closure.legacyRepositorySubmissionReachableFromServiceLayer === false &&
  finalCandidate.closure.signedUploadRequiredForSupabase === true &&
  finalCandidate.closure.browserServiceMediaDml === false &&
  finalCandidate.closure.browserStorageMutationPolicies === false &&
  finalCandidate.closure.referenceSafeCleanupInstalled === true
);

const catalogSchema = read(files.catalogSchema);
[
  'create table if not exists public.service_media',
  'service_id uuid not null references public.services(id) on delete cascade',
  'url text not null'
].forEach((marker) => assert(catalogSchema.includes(marker), 'service_media schema marker missing: ' + marker));
assert(!/\b(object_path|upload_intent_id|media_status|superseded_at|cleanup_eligible_at)\b/i.test(catalogSchema), 'historical service_media schema unexpectedly contains canonical lifecycle columns');

const sharedRuntime = read(files.sharedRuntime);
[
  'create policy service_media_owner_insert',
  'create policy service_media_owner_update',
  'create policy service_media_owner_delete',
  "'service-media'",
  'public = excluded.public'
].forEach((marker) => assert(sharedRuntime.includes(marker), 'historical catalog media authority marker missing: ' + marker));

const storageAuthority = read(files.storageAuthority);
[
  'create policy service_media_bucket_owner_select',
  'create policy service_media_bucket_owner_insert',
  'create policy service_media_bucket_owner_update',
  'create policy service_media_bucket_owner_delete',
  "bucket_id = 'service-media'"
].forEach((marker) => assert(storageAuthority.includes(marker), 'historical storage authority marker missing: ' + marker));

const moderation = read(files.moderation);
[
  "coalesce(p_snapshot -> 'images', '[]'::jsonb)",
  'delete from public.service_media where service_id = p_service_id;',
  'insert into public.service_media(service_id, media_type, url, thumbnail_url, alt_text, sort_order)',
  'from jsonb_array_elements_text(v_images) with ordinality'
].forEach((marker) => assert(moderation.includes(marker), 'version-to-catalog URL projection marker missing: ' + marker));

const baseline = JSON.parse(read(files.baselineJson));
assert(baseline.domain === 'CAT-001' && baseline.sublot === 'CAT-A04', 'CAT-A04 baseline identity invalid');
assert(baseline.status === 'baseline_frozen', 'CAT-A04 historical baseline must remain frozen');
assert(baseline.rootCause && baseline.rootCause.storageUploadMode === 'direct authenticated upload with upsert', 'direct upsert root cause not recorded');
assert(baseline.currentAuthority.storageUpdate === 'authenticated owner policy', 'historical browser storage UPDATE authority not recorded');
assert(baseline.currentAuthority.storageDelete === 'authenticated owner policy', 'historical browser storage DELETE authority not recorded');
assert(baseline.currentAuthority.serviceMediaTableUpdate === 'owner RLS with browser-role table privilege', 'historical browser service_media UPDATE authority not recorded');
assert(baseline.currentAuthority.serviceMediaTableDelete === 'owner RLS with browser-role table privilege', 'historical browser service_media DELETE authority not recorded');
assert(baseline.currentAuthority.signedUploadIntent === 'missing', 'historical missing signed upload intent not recorded');
assert(baseline.currentAuthority.storageUpsert === true, 'historical Storage upsert risk not recorded');
assert(baseline.currentAuthority.immutableObjectPath === false, 'historical mutable object-path risk not recorded');
assert(baseline.currentAuthority.replacementTransaction === 'missing', 'historical missing replacement transaction not recorded');
assert(baseline.currentAuthority.referenceSafeCleanup === 'missing', 'historical missing reference-safe cleanup not recorded');
assert(baseline.smallestSafeCandidate && baseline.smallestSafeCandidate.scope.includes('private upload-intent ledger'), 'smallest safe implementation candidate not recorded');
assert(baseline.safety.productionChanged === false, 'CAT-A04 baseline cannot change production');
assert(baseline.safety.stagingChanged === false, 'CAT-A04 baseline cannot change staging');

const baselineMarkdown = read(files.baselineMarkdown);
[
  'BASELINE FROZEN',
  'upsert: true',
  'snapshot é apenas textual',
  'reserva imutável de upload'
].forEach((marker) => assert(baselineMarkdown.includes(marker), 'human baseline marker missing: ' + marker));

const repository = read(files.repository);
if (!implementationReconciled) {
  [
    "var REMOTE_MEDIA_TABLE = 'service_media';",
    "var REMOTE_MEDIA_BUCKET = 'service-media';",
    'service_media(id,url,thumbnail_url,alt_text,sort_order,media_type)',
    "var objectPath = userId + '/' + safeServiceId + '/' + String(index + 1).padStart(2, '0')",
    'bucket.upload(objectPath, blob',
    'upsert: true',
    "invokeSelfService('submit_service_for_review'"
  ].forEach((marker) => assert(repository.includes(marker), 'pre-implementation browser media lifecycle marker missing: ' + marker));

  const uploadIndex = repository.indexOf('bucket.upload(objectPath, blob');
  const submitIndex = repository.indexOf("invokeSelfService('submit_service_for_review'");
  assert(uploadIndex !== -1 && submitIndex !== -1 && uploadIndex < submitIndex, 'historical upload must precede review submission before CAT-A04 reconciliation');
} else {
  const servicesService = read(files.servicesService);
  [
    'function submitThroughCanonicalAuthority(',
    'ensureMediaUploadService()',
    'return authority.submitForReview(service, options || {}, repository)',
    "syncStatus: 'fixture-memory'"
  ].forEach((marker) => assert(servicesService.includes(marker), 'current CAT-A04 service authority marker missing: ' + marker));
  assert(!servicesService.includes('repository.submitForReview'), 'legacy repository submission became reachable from the service layer');

  const mediaService = read(files.mediaService);
  [
    "authority: 'signed-upload-intent'",
    "invoke('prepare_service_media_uploads'",
    '.uploadToSignedUrl(',
    "invoke('submit_service_for_review'",
    'p_upload_intent_id'
  ].forEach((marker) => assert(mediaService.includes(marker), 'current signed upload authority marker missing: ' + marker));
  assert(!/\.upload\s*\(/.test(mediaService), 'canonical media service cannot use direct Storage upload');
  assert(!/upsert\s*:/.test(mediaService), 'canonical media service cannot request Storage upsert');

  const uploadAuthority = read(files.uploadAuthority);
  [
    'private.service_media_upload_intents',
    'submit_service_for_review_with_media_internal',
    'revoke insert, update, delete on table public.service_media from anon, authenticated',
    'drop policy if exists service_media_bucket_owner_insert on storage.objects',
    'drop policy if exists service_media_bucket_owner_update on storage.objects',
    'drop policy if exists service_media_bucket_owner_delete on storage.objects'
  ].forEach((marker) => assert(uploadAuthority.includes(marker), 'current immutable upload authority marker missing: ' + marker));

  const cleanupAuthority = read(files.cleanupAuthority);
  [
    'claim_service_media_cleanup_batch_internal',
    'complete_service_media_cleanup_internal',
    'fail_service_media_cleanup_internal',
    'for update skip locked'
  ].forEach((marker) => assert(cleanupAuthority.includes(marker), 'current reference-safe cleanup marker missing: ' + marker));
}

const qualityWorkflow = read(files.qualityWorkflow);
assert(qualityWorkflow.includes('Audit CAT-A04 service media lifecycle baseline'), 'Quality must expose the CAT-A04 baseline gate');
assert(qualityWorkflow.includes('npm run audit:quality-pipeline'), 'permanent Quality workflow must execute audit:quality-pipeline');

const qualityPipeline = read(files.qualityPipeline);
assert(
  qualityPipeline.includes('scripts/audit-service-media-lifecycle-baseline.js'),
  'CAT-A04 baseline audit must be registered in the permanent quality-pipeline aggregator'
);

if (!process.exitCode) {
  console.log('[CAT-A04] historical direct-upload authority remains frozen in immutable evidence.');
  console.log(`[CAT-A04] current runtime authority: ${implementationReconciled ? 'signed intents with reference-safe server cleanup' : 'pre-implementation browser upload path'}.`);
  console.log('[CAT-A04] historical baseline no longer requires retired executable debt to remain in product code.');
  console.log('[CAT-A04] staging and production safety boundaries remain explicit.');
}
