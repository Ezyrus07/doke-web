#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { console.error('[CAT-B04-SNAPSHOT] ' + message); process.exitCode = 1; };
const assert = (condition, message) => { if (!condition) fail(message); };

const files = {
  migration: 'supabase/migrations/156_order_service_snapshot_authority.sql',
  coalesceFix: 'supabase/migrations/157_order_service_snapshot_coalesce_fix.sql',
  commandBoundary: 'supabase/migrations/20260729201000_ord_a03_order_command_boundary.sql',
  sql: 'supabase/tests/021_order_service_snapshot_authority_validation.sql',
  backend: 'backend/modules/orders/orders-service.js',
  runtime: 'scripts/test-order-service-snapshot-authority-runtime.js'
};

Object.values(files).forEach((file) => assert(exists(file), 'required file missing: ' + file));

const migration = read(files.migration);
[
  'add column if not exists service_version_id uuid',
  'add column if not exists service_snapshot jsonb',
  'orders_service_version_id_fkey',
  'orders_service_snapshot_shape_check',
  'orders_service_snapshot_required_check',
  'orders_service_snapshot_projection_check',
  'idx_orders_service_version_created',
  'private.canonicalize_order_service_snapshot()',
  'trg_orders_service_snapshot_authority',
  'DOKE_ORDER_SERVICE_SNAPSHOT_IMMUTABLE',
  'DOKE_ORDER_SERVICE_NOT_ELIGIBLE',
  'DOKE_ORDER_OWN_SERVICE_FORBIDDEN',
  "'snapshotAuthority', 'approved_service_version'",
  "'serviceSnapshotAuthority', 'approved_service_version'",
  "review_status = 'approved'",
  'new.professional_id := v_service.professional_id',
  'new.service_version_id := v_version.id',
  'new.service_snapshot := v_snapshot',
  'on delete restrict',
  'revoke all on function private.canonicalize_order_service_snapshot() from public, anon, authenticated'
].forEach((marker) => assert(migration.includes(marker), 'migration marker missing: ' + marker));

const coalesceFix = read(files.coalesceFix);
[
  'create or replace function private.canonicalize_order_service_snapshot()',
  "v_status text := pg_catalog.lower(coalesce(new.status, 'draft'))",
  "coalesce(old.metadata, '{}'::jsonb)",
  "coalesce(new.metadata, '{}'::jsonb)",
  "coalesce(v_version.snapshot, '{}'::jsonb)",
  "coalesce(new.created_at, pg_catalog.now())",
  'revoke all on function private.canonicalize_order_service_snapshot() from public, anon, authenticated'
].forEach((marker) => assert(coalesceFix.includes(marker), 'snapshot trigger repair marker missing: ' + marker));
assert(!coalesceFix.includes('pg_catalog.coalesce'),
  'COALESCE is SQL syntax and must never be schema-qualified');

assert(!/new\.service_snapshot\s*:=\s*(new\.metadata|coalesce\(new\.metadata)/i.test(migration + '\n' + coalesceFix),
  'canonical snapshot cannot be copied from browser metadata');
assert(!/delete\s+from\s+public\.service_versions/i.test(migration + '\n' + coalesceFix),
  'snapshot authority cannot delete service versions');

const commandBoundary = read(files.commandBoundary);
[
  'create or replace function public.create_order_command(',
  'p_service_ref text',
  'select * into v_service from public.services where id = v_ref::uuid',
  'select * into v_service from public.services where external_id = v_ref',
  'v_service.professional_id',
  'v_service.id',
  "'requested'",
  "grant execute on function public.create_order_command",
  "revoke all on function public.create_order_command"
].forEach((marker) => assert(commandBoundary.includes(marker), 'ORD-A03 command marker missing: ' + marker));

assert(!/\bp_professional_id\b/i.test(commandBoundary),
  'create_order_command must not accept caller-selected professional identity');
assert(!/\bp_service_id\b/i.test(commandBoundary),
  'create_order_command must accept a service reference, not a caller-selected canonical service_id');
assert(!/\bp_service_snapshot\b/i.test(commandBoundary),
  'create_order_command must not accept caller-selected service snapshots');

const backend = read(files.backend);
[
  "'service_version_id'",
  "'service_snapshot'",
  "const SERVICE_SELECT = 'id,external_id,professional_id,status,moderation_status,approved_version_id'",
  'async function readServiceRow',
  "query.eq('external_id', reference)",
  'function isOrderEligibleService',
  'function sanitizeOrderMetadata',
  'delete metadata.serviceId',
  'delete metadata.service_id',
  'delete metadata.professionalId',
  'delete metadata.professional_id',
  'delete metadata.providerId',
  'delete metadata.provider_id',
  'delete metadata.serviceSnapshot',
  'delete metadata.service_snapshot',
  'delete metadata.serviceVersionId',
  'delete metadata.service_version_id',
  'delete metadata.serviceSnapshotAuthority',
  'delete metadata.service_snapshot_authority',
  "supabase.rpc('create_order_command'",
  'p_service_ref: serviceRef',
  'serviceVersionId:',
  'serviceSnapshot:'
].forEach((marker) => assert(backend.includes(marker), 'backend marker missing: ' + marker));

const createStart = backend.indexOf('async function createOrder');
const createEnd = backend.indexOf('async function acceptOrder', createStart);
const createOrderSource = backend.slice(createStart, createEnd);
assert(createStart >= 0 && createEnd > createStart, 'createOrder source range is required');
assert(!/\.from\(['"]orders['"]\)/.test(createOrderSource),
  'canonical order creation must not write directly to public.orders');
assert(!/\.insert\s*\(/.test(createOrderSource),
  'canonical order creation must not use a direct insert');
assert(!/p_professional_id\s*:/.test(createOrderSource),
  'backend must not send professional identity as an RPC authority parameter');
assert(!/p_service_id\s*:/.test(createOrderSource),
  'backend must not send canonical service_id as an RPC authority parameter');
assert(!/p_service_snapshot\s*:/.test(createOrderSource),
  'backend must not send a service snapshot as an RPC authority parameter');
assert(!/(localStorage|sessionStorage|indexedDB)/.test(createOrderSource),
  'backend snapshot authority cannot use browser persistence');

const validation = read(files.sql);
[
  "set_config('doke.service_moderation_apply', 'on', true)",
  "set_config('doke.service_moderation_apply', 'off', true)",
  'Canonical professional identity was not enforced',
  'Approved service version was not frozen',
  'Historical order snapshot changed after a new service version was approved',
  'Dedicated snapshot tampering was not blocked',
  'Compatibility snapshot projection tampering was not blocked',
  'Own-service order was not blocked',
  'rollback;'
].forEach((marker) => assert(validation.includes(marker), 'SQL validation marker missing: ' + marker));

const runtime = read(files.runtime);
[
  "rpc.name, 'create_order_command'",
  "rpc.payload.p_service_ref, externalServiceId",
  "'p_professional_id'",
  "'p_service_id'",
  "'p_service_snapshot'",
  'authority-shaped metadata must be stripped before RPC',
  "call.type === 'from' && call.table === 'orders'",
  'Order approved-version snapshot RPC authority runtime: PASS'
].forEach((marker) => assert(runtime.includes(marker), 'runtime marker missing: ' + marker));

if (!process.exitCode) {
  console.log('[CAT-B04-SNAPSHOT] PostgreSQL approved-version snapshot authority is structurally present.');
  console.log('[CAT-B04-SNAPSHOT] ORD-A03 create_order_command resolves canonical service/professional identity server-side.');
  console.log('[CAT-B04-SNAPSHOT] Backend sends only service intent reference and sanitized metadata to the canonical command.');
  console.log('[CAT-B04-SNAPSHOT] Browser-selected authority fields are stripped or rejected as command parameters.');
  console.log('[CAT-B04-SNAPSHOT] Immutable dedicated and compatibility projections remain gated.');
}
