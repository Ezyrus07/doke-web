#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) errors.push(message); };

const files = {
  baseMigration: 'supabase/migrations/158_service_search_contract.sql',
  hardeningMigration: 'supabase/migrations/159_service_search_approved_snapshot_authority.sql',
  baseTest: 'supabase/tests/022_service_search_contract_validation.sql',
  hardeningTest: 'supabase/tests/023_service_search_approved_snapshot_authority_validation.sql',
  evidence: 'docs/validation/SEARCH-001-A04-SERVER-SEARCH-CONTRACT.json',
  workflow: '.github/workflows/search-server-contract.yml'
};

Object.values(files).forEach((file) => assert(exists(file), `required approved-snapshot authority file missing: ${file}`));
if (errors.length) {
  console.error('[SEARCH-A04 approved snapshot] Required files are missing:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const migration = read(files.hardeningMigration);
[
  'create or replace function private.build_approved_service_search_vector(p_snapshot jsonb)',
  'create or replace function private.refresh_service_search_vector()',
  'from public.service_versions version_row',
  'version_row.id = new.approved_version_id',
  "version_row.review_status = 'approved'",
  'private.build_approved_service_search_vector(v_snapshot)',
  'before insert or update of approved_version_id, status, moderation_status, professional_id',
  'update public.services service_row',
  'set search_vector = private.build_approved_service_search_vector(version_row.snapshot)',
  'revoke all on function private.build_approved_service_search_vector(jsonb) from public, anon, authenticated',
  'revoke all on function private.refresh_service_search_vector() from public, anon, authenticated'
].forEach((marker) => assert(migration.includes(marker), `approved-snapshot migration marker missing: ${marker}`));

assert(!migration.includes('new.title'), 'approved-snapshot trigger must not index mutable service title');
assert(!migration.includes('new.description'), 'approved-snapshot trigger must not index mutable service description');
assert(!migration.includes("before insert or update of title"), 'mutable service fields cannot drive the approved search trigger');
assert(!migration.includes('service_role'), 'approved-snapshot search authority cannot depend on service_role browser access');

const sqlTest = read(files.hardeningTest);
[
  'begin;',
  'rollback;',
  "to_regprocedure('private.build_approved_service_search_vector(jsonb)')",
  'SEARCH-A04 pending service content leaked into public discovery',
  'SEARCH-A04 pending edit displaced the approved search authority',
  'SEARCH-A04 approved-version transition did not refresh the search document',
  'SEARCH-A04 superseded approved content remained searchable',
  "'query', 'pendingsecretneedle'",
  "'query', 'approvedneedle'",
  "set review_status = 'superseded'",
  "set review_status = 'approved'"
].forEach((marker) => assert(sqlTest.includes(marker), `approved-snapshot SQL test marker missing: ${marker}`));

assert(!sqlTest.includes('snapshot = jsonb_set'), 'validation must preserve service-version snapshot immutability');

const evidence = JSON.parse(read(files.evidence));
assert(evidence.domain === 'SEARCH-001' && evidence.sublot === 'SEARCH-A04', 'SEARCH-A04 evidence identity is invalid');
assert(evidence.approvedSnapshotAuthority && evidence.approvedSnapshotAuthority.pendingEditsSearchable === false, 'pending-edit exclusion is not documented');
assert(evidence.approvedSnapshotAuthority && evidence.approvedSnapshotAuthority.triggerSource === 'approved_service_version_snapshot', 'approved trigger source is not documented');
assert(evidence.validation && evidence.validation.approvedSnapshotMigration === files.hardeningMigration, 'approved-snapshot migration path is not documented');
assert(evidence.validation && evidence.validation.approvedSnapshotSqlTest === files.hardeningTest, 'approved-snapshot SQL test path is not documented');
assert(evidence.safety && evidence.safety.productionChanged === false, 'approved-snapshot hardening cannot change production');

const workflow = read(files.workflow);
[
  'supabase/migrations/159_service_search_approved_snapshot_authority.sql',
  'supabase/tests/023_service_search_approved_snapshot_authority_validation.sql',
  'scripts/audit-search-approved-snapshot-authority.js',
  'node scripts/audit-search-approved-snapshot-authority.js'
].forEach((marker) => assert(workflow.includes(marker), `approved-snapshot workflow marker missing: ${marker}`));

if (errors.length) {
  console.error('[SEARCH-A04 approved snapshot] Authority audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[SEARCH-A04 approved snapshot] Authority audit: PASS');
console.log('[SEARCH-A04 approved snapshot] Pending service edits cannot influence the materialized public search document.');
console.log('[SEARCH-A04 approved snapshot] Search vectors refresh only through approved-version transitions.');
