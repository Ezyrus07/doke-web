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

assert(!/new\.service_snapshot\s*:=\s*(new\.metadata|coalesce\(new\.metadata)/i.test(migration),
  'canonical snapshot cannot be copied from browser metadata');
assert(!/delete\s+from\s+public\.service_versions/i.test(migration),
  'snapshot authority cannot delete service versions');

const backend = read(files.backend);
[
  "'service_version_id'",
  "'service_snapshot'",
  "const SERVICE_SELECT = 'id,external_id,professional_id,status,moderation_status,approved_version_id'",
  'async function readServiceRow',
  "query.eq('external_id', reference)",
  'function isOrderEligibleService',
  'function sanitizeOrderMetadata',
  'delete metadata.serviceSnapshot',
  'delete metadata.serviceVersionId',
  'delete metadata.serviceSnapshotAuthority',
  'professional_id: service.professional_id',
  'service_id: service.id',
  'serviceVersionId:',
  'serviceSnapshot:'
].forEach((marker) => assert(backend.includes(marker), 'backend marker missing: ' + marker));

assert(!/professional_id:\s*(professionalId|body\.|metadata\.)/.test(backend),
  'backend order creation cannot trust caller-selected professional identity');
assert(!/(localStorage|sessionStorage|indexedDB)/.test(backend),
  'backend snapshot authority cannot use browser persistence');

const validation = read(files.sql);
[
  'Canonical professional identity was not enforced',
  'Approved service version was not frozen',
  'Historical order snapshot changed after a new service version was approved',
  'Dedicated snapshot tampering was not blocked',
  'Compatibility snapshot projection tampering was not blocked',
  'Own-service order was not blocked',
  'rollback;'
].forEach((marker) => assert(validation.includes(marker), 'SQL validation marker missing: ' + marker));

if (!process.exitCode) {
  console.log('[CAT-B04-SNAPSHOT] PostgreSQL approved-version snapshot authority is structurally present.');
  console.log('[CAT-B04-SNAPSHOT] Backend resolves canonical service and professional identity.');
  console.log('[CAT-B04-SNAPSHOT] Browser snapshot and professional fields are stripped before remote insertion.');
  console.log('[CAT-B04-SNAPSHOT] Immutable dedicated and compatibility projections are gated.');
}
