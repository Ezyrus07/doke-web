#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const adapterPath = 'backend/modules/communities/community-moderation-supabase-repository-adapter.js';
const migrationPath = 'supabase/migrations/20260805205800_com_b04b_moderation_persistence.sql';
const configPath = 'config/com-b04b-immutable-moderation-persistence-readiness.json';
const evidencePath = 'docs/validation/COM-B04B-IMMUTABLE-MODERATION-PERSISTENCE-READINESS.json';
const docPath = 'docs/COM-B04B-IMMUTABLE-MODERATION-PERSISTENCE-READINESS.md';
const adapter = read(adapterPath);
const sql = read(migrationPath);
const config = JSON.parse(read(configPath));
const evidence = JSON.parse(read(evidencePath));
const doc = read(docPath);
let checks = 0;
const check = (value, message) => { checks += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { checks += 1; assert.deepStrictEqual(actual, expected, message); };

for (const relative of [adapterPath, migrationPath, configPath, evidencePath, docPath]) {
  check(fs.existsSync(path.join(root, relative)), `${relative} exists`);
  check(fs.statSync(path.join(root, relative)).size > 100, `${relative} nonempty`);
}

check(adapter.includes("authority !== 'server_service_role'"), 'service role executor required');
check(adapter.includes("transactionBoundary: 'single_security_definer_rpc'"), 'single RPC boundary');
check(adapter.includes('CANONICAL_REPOSITORY_METHOD_SET_REQUIRED'), 'method set enforced');
check(adapter.includes('SERIALIZABLE_TRANSACTION_REQUIRED'), 'serializable enforced');
check(adapter.includes('ATOMIC_ROLLBACK_ONLY_PLAN_REQUIRED'), 'atomic rollback enforced');
check(adapter.includes('RAW_SENSITIVE_DATA_PROHIBITED'), 'sensitive payload blocked');
check(adapter.includes("commitCaseCommand: 'com_moderation_commit_case_command_v1'"), 'canonical commit RPC');
check(!adapter.includes('createClient'), 'no embedded Supabase client');
check(!adapter.includes('process.env'), 'no credentials');
check(!adapter.includes('fetch('), 'no network');

check(sql.startsWith('begin;'), 'migration transaction begin');
check(sql.trim().endsWith('commit;'), 'migration transaction commit');
check(sql.includes('create schema if not exists com_moderation_private'), 'private schema');
check(sql.includes('revoke all on schema com_moderation_private from public, anon, authenticated, service_role'), 'schema privileges revoked');
check(sql.includes('revoke all on all tables in schema com_moderation_private from public, anon, authenticated, service_role'), 'table privileges revoked');
check(sql.includes('revoke all on all sequences in schema com_moderation_private from public, anon, authenticated, service_role'), 'sequence privileges revoked');

for (const table of [
  'case_projection', 'case_event', 'command_idempotency', 'evidence_record',
  'decision_record', 'sanction_event', 'appeal_event', 'media_review_event'
]) {
  check(sql.includes(`create table if not exists com_moderation_private.${table}`), `${table} table`);
  check(sql.includes(`alter table com_moderation_private.${table} enable row level security`), `${table} RLS enabled`);
  check(sql.includes(`alter table com_moderation_private.${table} force row level security`), `${table} RLS forced`);
}

for (const table of ['case_event','evidence_record','decision_record','sanction_event','appeal_event','media_review_event']) {
  check(
    sql.includes(`create trigger ${table}_immutable before update or delete on com_moderation_private.${table}`),
    `${table} immutable trigger registered`
  );
}
check(sql.includes("raise exception 'IMMUTABLE_MODERATION_LEDGER'"), 'immutable mutation rejected');
check(sql.includes('before update or delete'), 'updates and deletes blocked');
check(sql.includes('security definer'), 'security definer functions');
check(sql.includes('set search_path = pg_catalog, com_moderation_private'), 'fixed search path');
check(sql.includes('for update'), 'row locks');
check(sql.includes("raise exception 'CASE_REVISION_CONFLICT'"), 'revision conflict');
check(sql.includes("raise exception 'EVENT_HASH_CHAIN_CONFLICT'"), 'hash-chain conflict');
check(sql.includes("raise exception 'IDEMPOTENCY_INTENT_MISMATCH'"), 'idempotency mismatch');
check(sql.includes("existing_idempotency.status = 'committed'"), 'idempotent replay');
check(sql.includes("raise exception 'CASE_COMPARE_AND_SWAP_FAILED'"), 'CAS enforcement');
check(sql.includes("raise exception 'IDEMPOTENCY_COMMIT_FAILED'"), 'idempotency commit enforcement');
check(sql.includes('grant execute on function public.com_moderation_load_case_v1(uuid) to service_role'), 'load RPC service-role grant');
check(sql.includes('grant execute on function public.com_moderation_commit_case_command_v1'), 'commit RPC grant');
check(sql.includes('from public, anon, authenticated'), 'client roles revoked from RPCs');
check(!/grant execute[\s\S]{0,500}to authenticated/i.test(sql), 'no authenticated RPC grant');
for (const destructive of ['drop table', 'truncate ', 'delete from']) {
  check(!sql.toLowerCase().includes(destructive), `${destructive.trim()} absent`);
}

const expectedMethods = [
  'loadCanonicalCase', 'claimIdempotencyKey', 'appendModerationEvent',
  'insertDecisionRecord', 'compareAndSwapCaseProjection', 'appendSanctionEvent',
  'appendAppealEvent', 'appendMediaReviewEvent'
];
equal(config.contractId, 'com-b04b-immutable-moderation-persistence-readiness-v1', 'contract id');
equal(config.scope, 'repository_only', 'scope');
check(['adapter_and_immutable_migration_prepared_not_applied','repository_contract_certified_migration_not_applied'].includes(config.status), 'status');
equal(config.adapterPrepared, true, 'adapter prepared');
equal(config.migrationPrepared, true, 'migration prepared');
equal(config.migrationApplied, false, 'migration not applied');
equal(config.runtimeIntegrated, false, 'runtime disconnected');
equal(config.stagingValidated, false, 'staging unvalidated');
equal(config.rpcAuthority, 'service_role_only', 'RPC authority');
equal(config.transactionBoundary, 'single_security_definer_rpc', 'transaction boundary');
equal(config.logicalRepositoryMethods, expectedMethods, 'logical repository methods');
equal(config.requiredTables.length, 8, 'eight persistence tables');
equal(config.appendOnlyTables.length, 6, 'six append-only ledgers');
equal(config.requiredRpcs, ['com_moderation_load_case_v1','com_moderation_commit_case_command_v1'], 'RPC set');
for (const [key, value] of Object.entries(config.invariants)) {
  if (['rawEvidencePayloadAllowed', 'browserTableAccessAllowed', 'authenticatedRpcAccessAllowed'].includes(key)) {
    equal(value, false, `${key} false`);
  } else {
    equal(value, true, `${key} true`);
  }
}
for (const [key, value] of Object.entries(config.authority)) {
  if (key === 'serviceRoleRpcAuthorityPrepared') equal(value, true, `${key} true`);
  else equal(value, false, `${key} false`);
}
for (const value of Object.values(config.prohibitedEffects)) equal(value, false, 'prohibited effect false');

if (config.status === 'repository_contract_certified_migration_not_applied') {
  equal(config.certifiedRepositoryHead, 'e6ef05ebf0241a5f3a0d3b9f25304e77fda68861', 'certified repository head');
  equal(config.certification.run, 31060030246, 'certification run');
  equal(config.certification.job, 92485763612, 'certification job');
  equal(config.certification.result, 'success', 'certification result');
  equal(config.certification.audit, '156/156', 'certification audit');
  equal(config.certification.conformance, '21/21', 'certification conformance');
  equal(config.certification.matrixReconciliation, '85/85', 'matrix certification');
  equal(config.certification.predecessorContinuity, '82/82', 'predecessor continuity');
  equal(config.certification.globalMatrix, 'passed', 'global matrix certification');
}

equal(evidence.contractId, config.contractId, 'evidence contract');
check(['repository_artifacts_prepared_pending_ci','repository_contract_certified'].includes(evidence.status), 'evidence status');
check(['pending_repository_certification','passed_repository_only'].includes(evidence.result), 'evidence result');
equal(evidence.migrationApplied, false, 'evidence migration not applied');
equal(evidence.runtimeIntegrated, false, 'evidence runtime false');
equal(evidence.stagingValidated, false, 'evidence staging false');
for (const value of Object.values(evidence.effects)) equal(value, false, 'evidence effect false');
for (const value of Object.values(evidence.remainingAuthority)) equal(value, false, 'remaining authority false');

if (evidence.status === 'repository_contract_certified') {
  equal(evidence.certifiedRepositoryHead, config.certifiedRepositoryHead, 'evidence certified head');
  equal(evidence.certification.run, config.certification.run, 'evidence certification run');
  equal(evidence.certification.job, config.certification.job, 'evidence certification job');
  equal(evidence.certification.result, 'success', 'evidence certification result');
  equal(evidence.certification.audit, '156/156', 'evidence audit result');
  equal(evidence.certification.conformance, '21/21', 'evidence conformance result');
  equal(evidence.certification.matrixReconciliation, '85/85', 'evidence matrix result');
}

for (const marker of [
  'one `SECURITY DEFINER` RPC',
  'RLS enabled and forced',
  'migration applied: false',
  'COM-B04C — migration application authorization and staging structural verification'
]) check(doc.includes(marker), `documentation marker: ${marker}`);

console.log(`COM-B04B audit passed: ${checks}/${checks}`);
