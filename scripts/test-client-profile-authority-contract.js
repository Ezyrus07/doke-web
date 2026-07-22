#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const read = (file) => fs.readFileSync(file, 'utf8');
const tableAuthority = read('supabase/migrations/102_client_profile_table_authority.sql');
const metricsAuthority = read('supabase/migrations/103_client_profile_metrics_authority.sql');
const permissionContract = read('supabase/migrations/104_client_profile_permission_contract.sql');
const consistencyHardening = read('supabase/migrations/105_client_profile_consistency_hardening.sql');
const runtimeValidation = read('supabase/tests/008_client_profile_authority_validation.sql');
const identityService = read('backend/modules/auth/identity-service.js');
const packageJson = JSON.parse(read('package.json'));

for (const token of [
  'alter table public.client_profiles enable row level security',
  'create table if not exists public.client_profile_public_summaries',
  'client_profile_public_summaries_read',
  'private.refresh_client_profile_public_summary',
  'private.handle_user_client_summary_eligibility'
]) assert(tableAuthority.includes(token), `Client table authority missing: ${token}`);

for (const token of [
  'private.refresh_client_profile_metrics',
  "o.status = 'completed'",
  "r.status = 'published'",
  'refresh_client_profile_metrics_internal',
  'to service_role'
]) assert(metricsAuthority.includes(token), `Client metrics authority missing: ${token}`);

for (const token of [
  'revoke all privileges on table public.client_profiles from public, anon, authenticated',
  'grant select on table public.client_profiles to authenticated',
  'Public-safe client reputation summary'
]) assert(permissionContract.includes(token), `Client permission contract missing: ${token}`);

for (const token of [
  'create policy client_profiles_owner_read',
  'using ((select auth.uid()) = user_id)',
  'join public.client_profiles cp on cp.user_id = u.id',
  'from public, anon, authenticated, service_role',
  'direct browser mutations and cross-account operator reads are prohibited'
]) assert(consistencyHardening.includes(token), `Client consistency hardening missing: ${token}`);

assert(!consistencyHardening.includes("actor.role in ('support', 'moderator', 'admin')"), 'Final client policy must not allow cross-account operator table reads.');
assert(identityService.includes(".select('user_id,orders_count,average_rating,reviews_count,updated_at')"), 'Identity service must read the complete owner-safe client metric projection.');
assert(identityService.includes('professional.reviews_count || client.reviews_count || 0'), 'Client review count must be normalized without exposing private fields.');

for (const token of [
  'owner_and_forged_metadata',
  'operator_cross_account_read',
  'service_role_minimum_grants',
  'delete_removes_public_summary',
  'suspension_removes_public_summary',
  'public_projection_columns'
]) assert(runtimeValidation.includes(token), `Client runtime validation missing: ${token}`);

assert.strictEqual(packageJson.scripts['test:client-profile-authority-contract'], 'node scripts/test-client-profile-authority-contract.js');
assert.strictEqual(packageJson.scripts['test:client-profile-authority-runtime'], 'node scripts/test-client-profile-authority-runtime.js');

console.log('Client profile authority contract passed.');
