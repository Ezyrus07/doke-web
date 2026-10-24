#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const snapshotPath = path.join(ROOT, 'docs/validation/MSG-001-A05-HOSTED-SCHEMA-SNAPSHOT-20261024.json');
const evidence = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const migration = fs.readFileSync(path.join(ROOT, evidence.migration.file), 'utf8');
const edge = fs.readFileSync(path.join(ROOT, 'supabase/functions/self-service-operations/index.ts'), 'utf8');
const cleaner = fs.readFileSync(path.join(ROOT, 'supabase/functions/transaction-attachment-cleanup/index.ts'), 'utf8');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/msg-001-a05-attachment-lifecycle.json'), 'utf8'));
const browser = fs.readFileSync(path.join(ROOT, 'assets/js/core/supabase-config.js'), 'utf8');
const PUBLIC_RPCS = [
  'prepare_transaction_attachment_uploads_internal',
  'confirm_transaction_attachment_uploads_internal',
  'attach_transaction_attachments_to_message_internal',
  'authorize_transaction_attachment_removal_internal',
  'mark_transaction_attachment_removed_internal',
  'list_transaction_attachment_cleanup_candidates_internal',
  'mark_transaction_attachment_cleanup_result_internal'
];
const LEGACY_POLICIES = [
  'transaction_attachments_owner_delete',
  'transaction_attachments_owner_update',
  'transaction_attachments_participant_insert',
  'transaction_attachments_participant_select'
];
const NEW_POLICIES = [
  'transaction_attachments_lifecycle_select',
  'transaction_attachments_lifecycle_insert'
];
const REQUIRED_RELATIONS = ['users', 'orders', 'conversations', 'messages'];

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
function assertStaticContracts() {
  assert.equal(evidence.type, 'READ_ONLY_HOSTED_SCHEMA_SNAPSHOT');
  assert.equal(evidence.freshness, 'HISTORICAL_NOT_A_LIVE_CERTIFICATION');
  assert.equal(evidence.approvedHostedWrites, false);
  assert.equal(evidence.noSecretValuesCollected, true);
  assert.equal(evidence.mandatoryLiveRecheck, true);
  assert.equal(evidence.operatorDecision, 'NO_GO');
  assert.equal(sha256(migration), evidence.migration.sha256, 'Migration changed; inventory must be reviewed again.');
  assert.equal(evidence.migration.version, '20260802220000');
  assert.deepEqual(evidence.migration.sourcePublicRpcNames, PUBLIC_RPCS);
  assert.deepEqual([...evidence.migration.legacyPoliciesReplaced].sort(), [...LEGACY_POLICIES].sort());
  assert.deepEqual(evidence.migration.expectedNewPolicies, NEW_POLICIES);
  assert.match(migration, /^\s*begin\s*;/i);
  assert.match(migration, /\bcommit\s*;\s*$/i);
  assert.match(migration, /create table if not exists private\.transaction_attachment_lifecycle\s*\(/i);
  assert.match(migration, /revoke all on table private\.transaction_attachment_lifecycle/i);
  assert.match(migration, /grant select, insert, update, delete on table private\.transaction_attachment_lifecycle\s+to service_role/i);
  assert.match(migration, /security definer\s+set search_path = pg_catalog/i);
  assert.match(migration, /revoke all privileges on function %s from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function %s to service_role/i);
  assert.match(migration, /create trigger messages_attachment_retention_after_removed/i);
  assert.match(migration, /No authenticated UPDATE or DELETE policy is recreated/);
  for (const fn of PUBLIC_RPCS) {
    assert.ok(migration.includes('create or replace function public.' + fn + '('), 'Missing planned RPC: ' + fn);
  }
  for (const policy of LEGACY_POLICIES) {
    assert.ok(migration.includes('drop policy if exists ' + policy + ' on storage.objects;'), 'Migration must explicitly remove legacy policy: ' + policy);
  }
  for (const policy of NEW_POLICIES) {
    assert.ok(migration.includes('create policy ' + policy), 'Missing replacement policy: ' + policy);
  }
  for (const fn of [PUBLIC_RPCS[0],PUBLIC_RPCS[1],PUBLIC_RPCS[3],PUBLIC_RPCS[4]]) {
    assert.ok(edge.includes(fn), 'Edge caller missing RPC contract: '+fn);
  }
  for (const fn of [PUBLIC_RPCS[5],PUBLIC_RPCS[6]]) {
    assert.ok(cleaner.includes(fn), 'Cleanup caller missing RPC contract: '+fn);
  }
  assert.equal(config.status, 'repository_only_attachment_lifecycle_ready_disabled');
  assert.match(browser, /attachmentLifecycleEnabled:\s*false/);
}
function assess(project) {
  const blockers=[];
  if(project.migrationRegistered !== true) blockers.push('migration_not_registered');
  const missingRpc=PUBLIC_RPCS.filter(f => !project.presentRpcNames.includes(f));
  if(missingRpc.length) blockers.push('required_rpcs_missing:' + missingRpc.length);
  if(!project.lifecycleTableExists) blockers.push('lifecycle_table_missing');
  for(const relation of REQUIRED_RELATIONS) if(project.relations[relation] !== true) blockers.push('relation_missing:' + relation);
  if(!project.storageBucket?.present) blockers.push('storage_bucket_missing');
  else {
    if(project.storageBucket.private !== true) blockers.push('bucket_not_private');
    if(project.storageBucket.fileSizeLimitBytes !== 10485760) blockers.push('bucket_size_limit_drift');
    if(project.storageBucket.mimeAllowlistPresent !== true) blockers.push('mime_allowlist_missing');
  }
  const legacy=LEGACY_POLICIES.filter(name=>project.storagePolicies.includes(name));
  if(legacy.length) blockers.push('legacy_storage_policy_replacement_requires_regression:' + legacy.length);
  // Even zero blockers in a historical snapshot is NOT a fresh hosted authorization.
  return {project:project.label,code:blockers.length?'NO_GO':'LIVE_RECHECK_REQUIRED',blockers};
}
function run(){
  assertStaticContracts();
  assert.equal(evidence.projects.length, 2);
  assert.deepEqual(evidence.projects.map(x=>x.label), ['doke-web-staging','doke-prof-b05-g4-e2e']);
  assert.ok(evidence.projects.every(x=>x.presentRpcNames.length===0),'Historical schema snapshot changed unexpectedly');
  const result=evidence.projects.map(assess);
  assert.ok(result.every(x=>x.code==='NO_GO'),'Hosted evidence cannot be silently promoted');
  assert.equal(result[0].blockers.includes('legacy_storage_policy_replacement_requires_regression:4'),true);
  assert.ok(result[1].blockers.includes('relation_missing:orders'));
  // If a future offline input looks ready, it still requires a new live/operational assessment.
  const illustrativeReady={
    ...evidence.projects[0],migrationRegistered:true,lifecycleTableExists:true,
    presentRpcNames:[...PUBLIC_RPCS],relations:{users:true,orders:true,conversations:true,messages:true},
    storagePolicies:NEW_POLICIES
  };
  assert.equal(assess(illustrativeReady).code,'LIVE_RECHECK_REQUIRED');
  console.log('MSG-A05 HOSTED SCHEMA SNAPSHOT AUDIT PASS ? historical evidence remains NO-GO.');
  console.log(JSON.stringify({historicalSnapshot:evidence.observedOn,results:result,liveCertification:false,hostedWrites:0},null,2));
}
if(require.main===module)run();
module.exports={assess,assertStaticContracts,run};
