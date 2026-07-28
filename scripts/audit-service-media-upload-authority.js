#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { console.error('[CAT-A04-UPLOAD] ' + message); process.exitCode = 1; };
const assert = (condition, message) => { if (!condition) fail(message); };

const files = {
  migration: 'supabase/migrations/150_service_media_upload_authority.sql',
  edgeIndex: 'supabase/functions/self-service-operations/index.ts',
  edgeOperations: 'supabase/functions/self-service-operations/operations.mjs',
  mediaService: 'assets/js/services/service-media-upload-service.js',
  servicesService: 'assets/js/services/services-service.js',
  runtime: 'scripts/test-service-media-upload-authority-runtime.js',
  sql: 'supabase/tests/019_service_media_upload_authority_validation.sql'
};

Object.values(files).forEach((file) => assert(exists(file), 'required file missing: ' + file));

const migration = read(files.migration);
[
  'private.service_media_upload_intents',
  'private.service_media_upload_items',
  'create_service_media_upload_intent_internal',
  'get_service_media_upload_intent_internal',
  'submit_service_for_review_with_media_internal',
  "'pending/%s/%s/%s-%s%s'",
  "status in ('prepared', 'consumed', 'expired', 'cancelled')",
  "kind in ('upload', 'retain')",
  'from storage.objects o',
  'revoke insert, update, delete on table public.service_media from anon, authenticated',
  'drop policy if exists service_media_bucket_owner_insert on storage.objects',
  'drop policy if exists service_media_bucket_owner_update on storage.objects',
  'drop policy if exists service_media_bucket_owner_delete on storage.objects',
  'grant execute on function public.create_service_media_upload_intent_internal',
  'grant execute on function public.submit_service_for_review_with_media_internal'
].forEach((marker) => assert(migration.includes(marker), 'migration authority marker missing: ' + marker));

assert(!/grant\s+(insert|update|delete)[\s\S]{0,120}service_media[\s\S]{0,80}(anon|authenticated)/i.test(migration),
  'browser service_media DML must not be granted');
assert(!/create\s+policy\s+service_media_bucket_owner_(insert|update|delete)/i.test(migration),
  'browser Storage mutation policies must not be recreated');

const edgeIndex = read(files.edgeIndex);
[
  'prepare_service_media_uploads',
  'create_service_media_upload_intent_internal',
  'createSignedUploadUrl',
  'get_service_media_upload_intent_internal',
  'getPublicUrl',
  'submit_service_for_review_with_media_internal',
  'p_upload_intent_id'
].forEach((marker) => assert(edgeIndex.includes(marker), 'Edge media authority marker missing: ' + marker));

const edgeOperations = read(files.edgeOperations);
assert(edgeOperations.includes("'prepare_service_media_uploads'"), 'prepare action is not allowlisted');
assert(edgeOperations.includes("'submit_service_for_review'"), 'submit action must remain allowlisted');

const mediaService = read(files.mediaService);
[
  "authority: 'signed-upload-intent'",
  "invoke('prepare_service_media_uploads'",
  '.uploadToSignedUrl(',
  "invoke('submit_service_for_review'",
  'p_upload_intent_id',
  'snapshot.images = []'
].forEach((marker) => assert(mediaService.includes(marker), 'frontend media authority marker missing: ' + marker));
assert(!/\.upload\s*\(/.test(mediaService), 'canonical media service cannot use direct Storage upload');
assert(!/upsert\s*:/.test(mediaService), 'canonical media service cannot request Storage upsert');
assert(!/(localStorage|sessionStorage|indexedDB)/.test(mediaService), 'media upload authority cannot persist in browser storage');

const servicesService = read(files.servicesService);
[
  'ensureMediaUploadService',
  'submitThroughCanonicalAuthority',
  'service-media-upload-service.js',
  'authority.submitForReview'
].forEach((marker) => assert(servicesService.includes(marker), 'services routing marker missing: ' + marker));

if (!process.exitCode) {
  console.log('[CAT-A04-UPLOAD] immutable upload reservation authority is structurally present.');
  console.log('[CAT-A04-UPLOAD] browser Storage mutation and service_media DML are retired by migration.');
  console.log('[CAT-A04-UPLOAD] signed upload and atomic intent consumption gates are registered.');
}
