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
  repository: 'assets/js/repositories/services-repository.js',
  qualityWorkflow: '.github/workflows/quality.yml',
  catA03: 'docs/validation/CAT-001-A03-SERVICE-LIFECYCLE-AUTHORITY.json',
  evidenceJson: 'docs/validation/CAT-001-A04-SERVICE-MEDIA-LIFECYCLE-BASELINE.json',
  evidenceMarkdown: 'docs/validation/CAT-001-A04-SERVICE-MEDIA-LIFECYCLE-BASELINE.md'
};

Object.values(files).forEach((file) => assert(exists(file), 'required file missing: ' + file));

const catA03 = JSON.parse(read(files.catA03));
assert(catA03.status === 'done', 'CAT-A03 must remain done before CAT-A04');
assert(catA03.validation && catA03.validation.finalEvidence === 'success', 'CAT-A03 final evidence must remain successful');

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

const repository = read(files.repository);
[
  "var REMOTE_MEDIA_TABLE = 'service_media';",
  "var REMOTE_MEDIA_BUCKET = 'service-media';",
  'service_media(id,url,thumbnail_url,alt_text,sort_order,media_type)',
  "var objectPath = userId + '/' + safeServiceId + '/' + String(index + 1).padStart(2, '0')",
  'bucket.upload(objectPath, blob',
  'upsert: true',
  "invokeSelfService('submit_service_for_review'"
].forEach((marker) => assert(repository.includes(marker), 'browser media lifecycle marker missing: ' + marker));

const uploadIndex = repository.indexOf('bucket.upload(objectPath, blob');
const submitIndex = repository.indexOf("invokeSelfService('submit_service_for_review'");
assert(uploadIndex !== -1 && submitIndex !== -1 && uploadIndex < submitIndex, 'upload must remain recorded as preceding review submission in the frozen baseline');

const moderation = read(files.moderation);
[
  "coalesce(p_snapshot -> 'images', '[]'::jsonb)",
  'delete from public.service_media where service_id = p_service_id;',
  'insert into public.service_media(service_id, media_type, url, thumbnail_url, alt_text, sort_order)',
  'from jsonb_array_elements_text(v_images) with ordinality'
].forEach((marker) => assert(moderation.includes(marker), 'version-to-catalog URL projection marker missing: ' + marker));

const evidence = JSON.parse(read(files.evidenceJson));
assert(evidence.domain === 'CAT-001' && evidence.sublot === 'CAT-A04', 'CAT-A04 evidence identity invalid');
assert(evidence.status === 'baseline_frozen', 'CAT-A04 baseline status must remain frozen before implementation');
assert(evidence.rootCause && evidence.rootCause.storageUploadMode === 'direct authenticated upload with upsert', 'direct upsert root cause not recorded');
assert(evidence.currentAuthority.storageUpdate === 'authenticated owner policy', 'browser storage UPDATE authority not recorded');
assert(evidence.currentAuthority.storageDelete === 'authenticated owner policy', 'browser storage DELETE authority not recorded');
assert(evidence.currentAuthority.serviceMediaTableUpdate === 'owner RLS with browser-role table privilege', 'browser service_media UPDATE authority not recorded');
assert(evidence.currentAuthority.serviceMediaTableDelete === 'owner RLS with browser-role table privilege', 'browser service_media DELETE authority not recorded');
assert(evidence.currentAuthority.signedUploadIntent === 'missing', 'missing signed upload intent not recorded');
assert(evidence.currentAuthority.storageUpsert === true, 'Storage upsert risk not recorded');
assert(evidence.currentAuthority.immutableObjectPath === false, 'mutable object-path risk not recorded');
assert(evidence.currentAuthority.replacementTransaction === 'missing', 'missing replacement transaction not recorded');
assert(evidence.currentAuthority.referenceSafeCleanup === 'missing', 'missing reference-safe cleanup not recorded');
assert(evidence.smallestSafeCandidate && evidence.smallestSafeCandidate.scope.includes('private upload-intent ledger'), 'smallest safe implementation candidate not recorded');
assert(evidence.safety.productionChanged === false, 'CAT-A04 baseline cannot change production');
assert(evidence.safety.stagingChanged === false, 'CAT-A04 baseline cannot change staging');

const evidenceMarkdown = read(files.evidenceMarkdown);
[
  'BASELINE FROZEN',
  'upsert: true',
  'snapshot é apenas textual',
  'reserva imutável de upload'
].forEach((marker) => assert(evidenceMarkdown.includes(marker), 'human baseline marker missing: ' + marker));

const qualityWorkflow = read(files.qualityWorkflow);
assert(
  qualityWorkflow.includes('node scripts/audit-service-media-lifecycle-baseline.js'),
  'CAT-A04 baseline audit must be wired into the permanent Quality workflow'
);

if (!process.exitCode) {
  console.log('[CAT-A04] browser Storage replacement/deletion and service_media DML authority are frozen as historical state.');
  console.log('[CAT-A04] deterministic upsert paths can mutate bytes behind versioned URL snapshots.');
  console.log('[CAT-A04] signed intents, canonical assets and reference-safe Storage API cleanup are missing.');
  console.log('[CAT-A04] staging and production remain unchanged.');
}
