#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync('supabase/migrations/117_service_media_storage_authority.sql', 'utf8');

for (const snippet of [
  'drop policy if exists service_media_bucket_public_read',
  'service_media_bucket_owner_select',
  'service_media_bucket_owner_insert',
  'service_media_bucket_owner_update',
  'service_media_bucket_owner_delete',
  "bucket_id = 'service-media'",
  "public.current_user_role() = 'professional'",
  'owner_id = (select auth.uid())::text',
  "(storage.foldername(name))[1] = (select auth.uid())::text",
  'to authenticated'
]) {
  assert(migration.includes(snippet), `service-media authority missing: ${snippet}`);
}

assert(!/create\s+policy\s+service_media_bucket_public_read/i.test(migration), 'Broad service-media listing policy must not be recreated.');
assert(!/to\s+public[\s\S]{0,200}bucket_id\s*=\s*'service-media'/i.test(migration), 'Service-media mutation policies must not target PUBLIC.');

console.log('Service media storage authority contract: PASS');
