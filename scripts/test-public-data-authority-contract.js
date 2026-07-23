#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const files = [
  '111_audit_log_authority.sql',
  '112_catalog_favorites_authority.sql',
  '113_availability_reviews_authority.sql',
  '114_messaging_reports_authority.sql',
  '115_budget_authority.sql',
  '116_community_authority.sql',
  '118_public_data_default_authority.sql',
  '119_public_policy_role_separation.sql',
  '120_community_owner_membership_invariant.sql',
  '126_service_quote_template_owner_authority.sql',
  '127_idempotency_server_only_policy.sql',
  '128_public_structural_privilege_cleanup.sql',
  '129_public_grant_policy_alignment.sql',
  '131_public_quote_catalog_grant_restore.sql'
].map((name) => `supabase/migrations/${name}`);
const content = Object.fromEntries(files.map((file) => [file, fs.readFileSync(file, 'utf8')]));
const all = files.map((file) => content[file]).join('\n');

const protectedTables = [
  'audit_logs',
  'availability_slots',
  'budgets',
  'communities',
  'community_members',
  'community_posts',
  'favorites',
  'message_attachments',
  'reports',
  'reviews',
  'service_categories'
];

for (const table of protectedTables) {
  assert(all.includes(`alter table public.${table} enable row level security`), `${table} must enable RLS.`);
  assert(all.includes(`revoke all privileges on table public.${table} from public, anon, authenticated, service_role`), `${table} must reset inherited grants.`);
}

for (const snippet of [
  "public.current_user_role() in ('moderator', 'support', 'admin')",
  'grant select, insert on table public.audit_logs to service_role',
  'favorites_owner_insert',
  'availability_slots_owner_insert',
  'reviews_completed_order_insert',
  'message_attachments_sender_insert',
  'reports_reporter_insert',
  'budgets_professional_insert',
  'private.is_community_member',
  'private.is_community_manager',
  'trg_community_owner_membership',
  'grant update (title, body) on table public.community_posts to authenticated',
  'alter default privileges for role postgres in schema public',
  'community_members_manager_update',
  "public.current_user_role() = 'professional'",
  'api_idempotency_keys_service_role_all',
  'revoke all privileges on tables from public, anon, authenticated',
  'revoke all privileges on table',
  'revoke truncate, trigger, references on table',
  'grant select on table'
]) {
  assert(all.includes(snippet), `public data authority missing: ${snippet}`);
}

for (const table of protectedTables.filter((name) => !['service_categories', 'availability_slots', 'reviews', 'communities', 'community_posts'].includes(name))) {
  const dangerousAnonGrant = new RegExp(`grant\\s+(?:all|insert|update|delete|truncate)[^;]*public\\.${table}[^;]*\\bto\\s+anon\\b`, 'i');
  assert(!dangerousAnonGrant.test(all), `${table} must not grant anon DML.`);
}

assert(all.includes("status = 'completed'"), 'Review insertion must require a completed order.');
assert(all.includes("o.professional_id = (select auth.uid())"), 'Budget insertion must bind the professional to the order.');
assert(all.includes("role = 'member'"), 'Self-join must not permit community role escalation.');

console.log('Public data authority contract: PASS');
