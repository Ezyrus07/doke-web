#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync('supabase/migrations/110_notification_authority.sql', 'utf8');
const repository = fs.readFileSync('assets/js/repositories/notifications-repository.js', 'utf8');

for (const snippet of [
  'alter table public.notifications enable row level security',
  'notifications_recipient_select',
  'notifications_recipient_update',
  'user_id = (select auth.uid())',
  'revoke all privileges on table public.notifications from public, anon, authenticated, service_role',
  'grant select on table public.notifications to authenticated',
  'grant update (read_at, dismissed_at, updated_at)',
  'grant select, insert, update, delete on table public.notifications to service_role',
  'set search_path = pg_catalog',
  'DOKE_NOTIFICATION_ACTOR_INACTIVE',
  'DOKE_NOTIFICATION_TRANSACTION_CONTEXT_REQUIRED',
  'DOKE_NOTIFICATION_IDEMPOTENCY_CONFLICT',
  'revoke all privileges on function public.create_transaction_notification',
  'revoke all privileges on function public.update_own_notification_state',
  'to authenticated'
]) {
  assert(migration.includes(snippet), `notification authority missing: ${snippet}`);
}

assert(!/grant\s+execute[\s\S]{0,300}\bto\s+anon\b/i.test(migration), 'Notification RPCs must never be granted to anon.');
assert(!/grant\s+(?:all|insert|update|delete|truncate)[^;]*public\.notifications[^;]*\bto\s+anon\b/i.test(migration), 'Anon must not receive notification DML.');
assert(repository.includes("REMOTE_CREATE_RPC = 'create_transaction_notification'"), 'Repository must keep the guarded creation RPC.');
assert(repository.includes("REMOTE_UPDATE_RPC = 'update_own_notification_state'"), 'Repository must keep the owner-state RPC.');
assert(repository.includes("filter: 'user_id=eq.'"), 'Realtime delivery must remain recipient-scoped.');

console.log('Notification authority contract: PASS');
