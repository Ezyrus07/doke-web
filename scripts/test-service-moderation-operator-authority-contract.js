#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync('supabase/migrations/122_service_moderation_operator_authority.sql', 'utf8');
const repository = fs.readFileSync('assets/js/repositories/service-moderation-repository.js', 'utf8');
const edge = fs.readFileSync('supabase/functions/service-moderation-operations/index.ts', 'utf8');
const operations = fs.readFileSync('supabase/functions/service-moderation-operations/operations.mjs', 'utf8');
const importMapPath = fs.existsSync('supabase/functions/service-moderation-operations/deno.json')
  ? 'supabase/functions/service-moderation-operations/deno.json'
  : 'supabase/functions/service-moderation-operations/import_map.json';
const runtimeConfig = fs.readFileSync(importMapPath, 'utf8');

for (const snippet of [
  'private.assert_service_moderation_operator',
  "lower(account.role) in ('admin', 'moderator')",
  "lower(account.status) = 'active'",
  'DOKE_SERVICE_MODERATION_OPERATOR_REQUIRED',
  'list_service_review_queue_internal',
  'get_service_review_detail_internal',
  'list_service_moderation_audit_internal',
  'approve_service_version_internal',
  'request_service_version_changes_internal',
  'reject_service_version_internal',
  'from public, anon, authenticated, service_role',
  'to service_role',
  'set search_path = pg_catalog'
]) {
  assert(migration.includes(snippet), `moderation authority missing: ${snippet}`);
}

for (const legacy of [
  'list_service_review_queue()',
  'get_service_review_detail(uuid)',
  'list_service_moderation_audit(integer)',
  'approve_service_version(uuid)',
  'request_service_version_changes(uuid, text)',
  'reject_service_version(uuid, text)'
]) {
  assert(migration.includes(`revoke all privileges on function public.${legacy}`), `${legacy} must be removed from the Data API.`);
}

assert(repository.includes("FUNCTION_NAME = 'service-moderation-operations'"), 'Repository must use the moderation Edge Function.');
assert(repository.includes('client.functions.invoke'), 'Repository must invoke the Functions API.');
for (const action of ['list', 'detail', 'audit', 'approve', 'request_changes', 'reject']) {
  assert(repository.includes(`'${action}'`), `Repository action missing: ${action}`);
}
assert(!/\.rpc\(['"](?:list_service_review_queue|get_service_review_detail|list_service_moderation_audit|approve_service_version|request_service_version_changes|reject_service_version)/.test(repository), 'Browser repository must not call privileged moderation RPCs directly.');

for (const snippet of [
  'auth.getUser()',
  '.from("users")',
  '.select("role,status")',
  '["admin", "moderator"].includes(role)',
  'DOKE_SERVICE_MODERATION_AUTH_REQUIRED',
  'DOKE_SERVICE_MODERATION_OPERATOR_REQUIRED',
  'list_service_review_queue_internal',
  'get_service_review_detail_internal',
  'list_service_moderation_audit_internal',
  'approve_service_version_internal',
  'request_service_version_changes_internal',
  'reject_service_version_internal'
]) {
  assert(edge.includes(snippet), `Edge Function authority missing: ${snippet}`);
}
assert(operations.includes('normalizeModerationError'), 'Edge operation error normalization is missing.');
assert(operations.includes('statusForModerationError'), 'Edge operation status mapping is missing.');
assert(edge.includes('jsr:@supabase/supabase-js@2.49.8') || runtimeConfig.includes('@supabase/supabase-js'), 'Pinned Supabase runtime dependency is missing.');

console.log('Service moderation operator authority contract: PASS');
