#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const tableRls = read('supabase/migrations/093_identity_table_rls_authority.sql');
const roleAuthority = read('supabase/migrations/094_identity_role_materialization_authority.sql');
const rpcAuthority = read('supabase/migrations/095_identity_rpc_authority_hardening.sql');
const helperHardening = read('supabase/migrations/096_identity_helper_invoker_hardening.sql');
const frontendAuth = read('assets/js/services/auth-service.js');
const actorResolver = read('backend/shared/auth/supabase-actor-resolver.js');
const identityService = read('backend/modules/auth/identity-service.js');
const packageJson = JSON.parse(read('package.json'));

for (const token of [
  'revoke all privileges on table public.users from anon, authenticated',
  'grant select on table public.users to authenticated',
  'create policy users_select_own_account',
  'using ((select auth.uid()) = id)',
  'revoke all privileges on table public.user_profiles from anon, authenticated',
  'grant select on table public.user_profiles to anon, authenticated',
  'create policy user_profiles_public_read'
]) assert(tableRls.includes(token), `Identity table RLS migration missing: ${token}`);

for (const token of [
  'private.materialize_auth_account',
  "'client'",
  "raw_app_meta_data",
  "- 'role' - 'type' - 'account_role' - 'account_status'",
  'private.handle_new_auth_user_doke',
  'security invoker',
  "case when u.status = 'active' then u.role else 'guest' end"
]) assert(roleAuthority.includes(token), `Identity role authority migration missing: ${token}`);

for (const token of [
  'DOKE_AUTH_REQUIRED',
  'DOKE_ACCOUNT_NOT_ACTIVE',
  'DOKE_PROFILE_USERNAME_INVALID',
  'revoke all on function public.complete_account_onboarding',
  'revoke all on function public.update_account_profile',
  'drop function if exists public.materialize_auth_account'
]) assert(rpcAuthority.includes(token), `Identity RPC hardening migration missing: ${token}`);


for (const token of [
  'create or replace function public.current_user_role()',
  'security invoker',
  "return 'guest'",
  'create or replace function public.is_active_admin_or_moderator()'
]) assert(helperHardening.includes(token), `Identity helper hardening migration missing: ${token}`);

assert(!frontendAuth.includes('user?.user_metadata?.role'), 'Frontend must not authorize from user_metadata.role.');
assert(frontendAuth.includes("user?.app_metadata?.role || 'client'"), 'Frontend must read role from app_metadata.');
assert(!frontendAuth.includes("handle, role: 'client'"), 'Signup metadata must not carry authorization role.');
assert(!actorResolver.includes('authUser.user_metadata && authUser.user_metadata.role'), 'Backend actor resolver must not trust user_metadata.role.');
assert(actorResolver.includes('authUser.app_metadata && authUser.app_metadata.role'), 'Backend actor resolver must use app_metadata fallback.');
assert(!identityService.includes('metadata.role'), 'Identity service must not trust user metadata role.');
assert(identityService.includes('appMetadata.role'), 'Identity service must use authoritative app metadata fallback.');

assert.strictEqual(packageJson.scripts['test:identity-rls-authority-contract'], 'node scripts/test-identity-rls-authority-contract.js');
assert.strictEqual(packageJson.scripts['test:identity-role-authority-runtime'], 'node scripts/test-identity-role-authority-runtime.js');

console.log('Identity RLS and role authority contract passed.');
