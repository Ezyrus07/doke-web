#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const migrationPath = 'supabase/migrations/20260922001808_sched_a03b_public_policy_guard.sql';
const validationPath = 'supabase/tests/030_sched_a03b_public_policy_guard_validation.sql';
const originalPath = 'supabase/migrations/20260731123000_sched_a03_reservation_authority.sql';

[migrationPath, validationPath, originalPath].forEach((path) => {
  assert(fs.existsSync(path), `Missing SCHED-A03B asset: ${path}`);
});

const migration = fs.readFileSync(migrationPath, 'utf8').toLowerCase();
const validation = fs.readFileSync(validationPath, 'utf8').toLowerCase();
const original = fs.readFileSync(originalPath, 'utf8').toLowerCase();

[
  'alter table public.schedule_availability_rules enable row level security',
  'alter table public.schedule_reservations enable row level security',
  'revoke all privileges on table public.schedule_availability_rules',
  'revoke all privileges on table public.schedule_reservations',
  'create policy schedule_availability_rules_browser_deny_all',
  'create policy schedule_reservations_browser_deny_all',
  'as restrictive',
  'for all',
  'to anon, authenticated',
  'using (false)',
  'with check (false)'
].forEach((token) => assert(migration.includes(token), `Migration missing: ${token}`));

assert.strictEqual(
  /grant\s+[\s\S]{0,120}?\s+to\s+(?:anon|authenticated)\b/.test(migration),
  false,
  'SCHED-A03B must never grant browser privileges.'
);
assert.strictEqual(
  /create policy[\s\S]{0,220}?\bto\s+service_role\b/.test(migration),
  false,
  'SCHED-A03B must not create service-role RLS policies.'
);
assert(!migration.includes('alter default privileges'));
assert(!migration.includes('grant all'));
assert(!migration.includes('truncate '));
assert(!migration.includes('drop table'));
assert(!migration.includes('alter table public.schedule_availability_rules disable row level security'));
assert(!migration.includes('alter table public.schedule_reservations disable row level security'));

[
  'service_role',
  'rolbypassrls',
  'polpermissive = false',
  "p.polcmd = '*'",
  "pg_get_expr(p.polqual, p.polrelid) = 'false'",
  "pg_get_expr(p.polwithcheck, p.polrelid) = 'false'",
  'sched_a03b_browser_privilege_regression',
  'sched_a03b_service_role_crud_missing',
  'platform_tables_without_policy'
].forEach((token) => assert(validation.includes(token), `Validation missing: ${token}`));

[
  'grant select, insert, update, delete on table public.schedule_availability_rules\n  to service_role',
  'grant select, insert, update, delete on table public.schedule_reservations\n  to service_role'
].forEach((token) => assert(original.includes(token), `Original SCHED-A03 authority missing: ${token}`));

console.log('SCHED-A03B public policy guard static contract passed.');
