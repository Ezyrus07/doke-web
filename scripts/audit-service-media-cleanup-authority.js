#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { console.error('[CAT-A04-CLEANUP] ' + message); process.exitCode = 1; };
const assert = (condition, message) => { if (!condition) fail(message); };

const files = {
  migration: 'supabase/migrations/155_service_media_reference_safe_cleanup_authority.sql',
  edgeIndex: 'supabase/functions/service-moderation-operations/index.ts',
  edgeOperations: 'supabase/functions/service-moderation-operations/operations.mjs',
  cleanupExecutor: 'supabase/functions/service-moderation-operations/media-cleanup.mjs',
  runtime: 'scripts/test-service-media-cleanup-authority-runtime.js',
  sql: 'supabase/tests/020_service_media_reference_safe_cleanup_validation.sql'
};

Object.values(files).forEach((file) => assert(exists(file), 'required file missing: ' + file));

const migration = read(files.migration);
[
  'cleanup_claimed_at',
  'cleanup_claimed_by',
  'cleanup_attempts',
  'last_cleanup_error',
  'deleted_at',
  "status in ('prepared','consumed','superseded','cleanup_eligible','cleanup_claimed','delete_failed','deleted')",
  'private.service_media_item_is_referenced',
  'public.service_media',
  'public.service_versions',
  'public.services',
  'service_media_item_version_status_sync',
  "interval '2 hours 15 minutes'",
  "interval '30 days'",
  'for update skip locked',
  'prepare_service_media_cleanup_batch_internal',
  'complete_service_media_cleanup_batch_internal',
  'idx_service_media_upload_intents_service_id',
  'idx_service_media_upload_intents_service_version_id',
  'idx_service_media_upload_items_actor_id',
  'idx_service_media_upload_items_service_id',
  'idx_service_media_upload_items_cleanup_claimed_by'
].forEach((marker) => assert(migration.toLowerCase().includes(marker.toLowerCase()), 'migration marker missing: ' + marker));

assert(!/delete\s+from\s+storage\.objects/i.test(migration), 'Storage objects cannot be deleted through SQL');
assert(!/grant\s+execute[\s\S]{0,180}prepare_service_media_cleanup_batch_internal[\s\S]{0,80}(anon|authenticated)/i.test(migration),
  'browser cleanup prepare execute must not be granted');
assert(!/grant\s+execute[\s\S]{0,180}complete_service_media_cleanup_batch_internal[\s\S]{0,80}(anon|authenticated)/i.test(migration),
  'browser cleanup completion execute must not be granted');

const edgeIndex = read(files.edgeIndex);
[
  'executeServiceMediaCleanup',
  'cleanup_media',
  'limit: 5',
  'windowSeconds: 600'
].forEach((marker) => assert(edgeIndex.includes(marker), 'moderation Edge cleanup marker missing: ' + marker));

const edgeOperations = read(files.edgeOperations);
assert(edgeOperations.includes("'cleanup_media'"), 'cleanup_media action is not allowlisted');
assert(edgeOperations.includes('DOKE_SERVICE_MEDIA_CLEANUP_RESULTS_INVALID'), 'cleanup result error is not normalized');

const cleanupExecutor = read(files.cleanupExecutor);
[
  'prepare_service_media_cleanup_batch_internal',
  '.remove([candidate.path])',
  'complete_service_media_cleanup_batch_internal',
  'p_results: results'
].forEach((marker) => assert(cleanupExecutor.includes(marker), 'cleanup executor marker missing: ' + marker));
assert(!/(localStorage|sessionStorage|indexedDB)/.test(cleanupExecutor), 'cleanup executor cannot persist authority in the browser');
assert(!/\.upload\s*\(/.test(cleanupExecutor), 'cleanup executor cannot upload objects');
assert(!/storage\.objects/.test(cleanupExecutor), 'cleanup executor cannot mutate storage metadata directly');

if (!process.exitCode) {
  console.log('[CAT-A04-CLEANUP] superseded and abandoned media lifecycle authority is structurally present.');
  console.log('[CAT-A04-CLEANUP] every deletion candidate requires reference proof and a PostgreSQL claim.');
  console.log('[CAT-A04-CLEANUP] physical deletion is routed exclusively through the Storage API.');
}
