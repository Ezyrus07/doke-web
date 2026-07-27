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
  storageAuthority: 'supabase/migrations/117_service_media_storage_authority.sql',
  repository: 'assets/js/repositories/services-repository.js',
  catA03: 'docs/validation/CAT-001-A03-SERVICE-LIFECYCLE-AUTHORITY.json',
  evidenceJson: 'docs/validation/CAT-001-A04-SERVICE-MEDIA-LIFECYCLE-BASELINE.json',
  evidenceMarkdown: 'docs/validation/CAT-001-A04-SERVICE-MEDIA-LIFECYCLE-BASELINE.md'
};

Object.values(files).forEach((file) => assert(exists(file), 'required file missing: ' + file));

const catA03 = JSON.parse(read(files.catA03));
assert(catA03.status === 'done', 'CAT-A03 must remain done before CAT-A04');
assert(catA03.validation && catA03.validation.finalEvidence === 'success', 'CAT-A03 final evidence must remain successful');

const migration = read(files.storageAuthority);
[
  'create policy service_media_bucket_owner_select',
  'create policy service_media_bucket_owner_insert',
  'create policy service_media_bucket_owner_update',
  'create policy service_media_bucket_owner_delete',
  "bucket_id = 'service-media'"
].forEach((marker) => assert(migration.includes(marker), 'historical storage authority marker missing: ' + marker));

const repository = read(files.repository);
assert(repository.includes("var REMOTE_MEDIA_TABLE = 'service_media';"), 'service_media catalog table marker missing');
assert(repository.includes("var REMOTE_MEDIA_BUCKET = 'service-media';"), 'service-media bucket marker missing');
assert(repository.includes("service_media(id,url,thumbnail_url,alt_text,sort_order,media_type)"), 'catalog media read contract missing');

const evidence = JSON.parse(read(files.evidenceJson));
assert(evidence.domain === 'CAT-001' && evidence.sublot === 'CAT-A04', 'CAT-A04 evidence identity invalid');
assert(evidence.status === 'baseline_frozen', 'CAT-A04 baseline status must remain frozen before implementation');
assert(evidence.currentAuthority.storageUpdate === 'authenticated owner policy', 'browser storage UPDATE authority not recorded');
assert(evidence.currentAuthority.storageDelete === 'authenticated owner policy', 'browser storage DELETE authority not recorded');
assert(evidence.currentAuthority.replacementTransaction === 'missing', 'missing replacement transaction not recorded');
assert(evidence.currentAuthority.referenceSafeCleanup === 'missing', 'missing reference-safe cleanup not recorded');
assert(evidence.safety.productionChanged === false, 'CAT-A04 baseline cannot change production');
assert(evidence.safety.stagingChanged === false, 'CAT-A04 baseline cannot change staging');
assert(read(files.evidenceMarkdown).includes('BASELINE FROZEN'), 'human baseline marker missing');

if (!process.exitCode) {
  console.log('[CAT-A04] direct owner Storage UPDATE/DELETE authority is frozen as historical state.');
  console.log('[CAT-A04] replacement, superseded cleanup and abandoned-draft cleanup contracts are missing.');
  console.log('[CAT-A04] staging and production remain unchanged.');
}
