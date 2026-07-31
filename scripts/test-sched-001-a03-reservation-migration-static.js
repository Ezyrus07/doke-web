#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const migrationPath = 'supabase/migrations/20260731123000_sched_a03_reservation_authority.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');
const normalized = sql.toLowerCase();

assert(normalized.includes('begin;'));
assert(normalized.includes('commit;'));
assert(normalized.indexOf('begin;') < normalized.indexOf('commit;'));
assert(normalized.includes('create extension if not exists btree_gist with schema extensions'));
assert(normalized.includes('create table if not exists public.schedule_reservations'));
assert(normalized.includes("status in ('held', 'confirmed', 'cancelled', 'expired')"));
assert(normalized.includes("tstzrange(starts_at, ends_at, '[)') with &&"));
assert(normalized.includes("where (status in ('held', 'confirmed'))"));
assert(normalized.includes('schedule_reservations_no_active_overlap'));
assert(normalized.includes("interval '15 minutes'"));
assert(normalized.includes("interval '30 days'"));
assert(normalized.includes('resolved_offset_minutes'));
assert(normalized.includes('version bigint not null default 1'));
assert(normalized.includes('create table if not exists private.schedule_command_idempotency'));
assert(normalized.includes('unique (command_name, principal_key, idempotency_key)'));
assert(normalized.includes("request_hash ~ '^[a-f0-9]{64}$'"));
assert(normalized.includes("interval '30 days'"));
assert(normalized.includes('create table if not exists private.schedule_domain_events'));
assert(normalized.includes('unique (reservation_id, sequence_no)'));
assert(normalized.includes('add column if not exists schedule_reservation_id uuid'));
assert(normalized.includes('orders_schedule_reservation_id_fkey'));
assert(normalized.includes("status in ('available', 'blocked')"));
assert(!normalized.includes("status = 'booked'\n    and"));

const browserGrantPattern = /grant\s+(?:select\s*,\s*)?(?:insert|update|delete|all)[\s\S]{0,180}?\s+to\s+(?:anon|authenticated)\b/g;
assert.strictEqual(normalized.match(browserGrantPattern), null, 'Browser DML grant detected on SCHED-A03 authority.');
assert(normalized.includes('grant select, insert, update, delete on table public.schedule_reservations\n  to service_role'));
assert(normalized.includes('grant select, insert, update, delete on table private.schedule_command_idempotency\n  to service_role'));
assert(normalized.includes('grant select, insert, update, delete on table private.schedule_domain_events\n  to service_role'));
assert(!normalized.includes('grant all'));
assert(!normalized.includes('truncate'));
assert(!normalized.includes('supabase db push'));
assert(!normalized.includes('apply_migration'));
assert(!normalized.includes('net.http'));
assert(!normalized.includes('cron.'));

console.log('SCHED-A03 reservation migration static contract test passed.');
