#!/usr/bin/env node
'use strict';
// Source-only audit. Never opens a database connection or changes migration state.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const readJSON=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const history=readJSON('docs/validation/MSG-A05-STAGING-MIGRATION-HISTORY-SNAPSHOT-20261025.json');
const overrideIndex=process.argv.indexOf('--fingerprints');
const filename=overrideIndex>=0?path.resolve(process.argv[overrideIndex+1]||''):path.join(root,'docs/validation/MSG-A05-STAGING-LATER-SQL-FINGERPRINTS-20261025.json');
const fingerprint=JSON.parse(fs.readFileSync(filename,'utf8'));
assert.equal(history.kind,'staging-migration-history-metadata-only');
assert.equal(history.registeredMigrationCount,218);
assert.equal(history.afterA05.length,49);
assert.equal(fingerprint.schemaVersion,1);
assert.equal(fingerprint.observedDate,history.observationDate);
assert.equal(fingerprint.noHostedWrites,true);
assert.equal(fingerprint.notReleaseApproval,true);
const rows=fingerprint.rows;
assert.equal(rows.length,49);
assert.deepEqual(rows.map(r=>r.version),history.afterA05.map(r=>r.version),'later migration coverage incomplete or out of order');
const matchingLater={};
const exceptions=[];
for(const r of rows){
 assert.match(r.version,/^\d{14}$/);
 assert.equal(r.name,history.afterA05.find(m=>m.version===r.version).name);
 assert.ok(Number.isInteger(r.statement_count)&&r.statement_count>=1);
 assert.ok(Number.isInteger(r.sql_chars)&&r.sql_chars>=1);
 assert.match(r.statement_text_md5,/^[a-f0-9]{32}$/);
 for(const key of ['transaction_attachment_ref','messages_ref','conversations_ref','storage_objects_ref','storage_buckets_ref','professional_kyc_bucket_ref','auth_users_ref']){
  assert.equal(typeof r[key],'boolean',key);
 }
 assert.equal(r.transaction_attachment_ref,false,'transaction-attachments SQL overlap found: '+r.version);
 assert.equal(r.messages_ref,false,'messages SQL overlap found: '+r.version);
 assert.equal(r.conversations_ref,false,'conversations SQL overlap found: '+r.version);
 assert.equal(r.storage_buckets_ref,false,'storage.buckets SQL overlap found: '+r.version);
 if(r.storage_objects_ref){
  assert.equal(r.professional_kyc_bucket_ref,true,'Storage SQL outside known isolated KYC bucket: '+r.version);
  exceptions.push(r.version);
 }
}
assert.deepEqual(exceptions,['20260918232524','20260918234449','20260918234602']);
const knownLater={
 '20260920114049':'48ea1fa4a046fa175ae0d59e79613206',
 '20260922001808':'784369af15753954abc85f2fd590e5b2',
 '20260923003844':'d5546dd7227745a2d40b865a2699c136'
};
const canonical=s=>s.replace(/\r\n/g,'\n').replace(/\/\*[\s\S]*?\*\//g,'').replace(/--[^\n]*/g,'').replace(/\s+/g,'').toLowerCase().replace(/^begin;/,'').replace(/commit;$/,'');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const md5=s=>crypto.createHash('md5').update(s).digest('hex');
const migrationDir=path.join(root,'supabase/migrations');
const names=fs.readdirSync(migrationDir).filter(p=>p.endsWith('.sql'));
const versions=names.map(x=>x.split('_')[0]);
for(const [version,expected] of Object.entries(knownLater)){
 const files=names.filter(f=>f.startsWith(version+'_'));
 assert.equal(files.length,1,'local migration counterpart missing: '+version);
 const sql=fs.readFileSync(path.join(migrationDir,files[0]),'utf8');
 assert.equal(md5(canonical(sql)),expected,'local normalized SQL differs from read-only staging SQL: '+version);
 matchingLater[version]={file:files[0],normalizedBodyMd5:expected};
}
const sources={
 '20260802183100_msg_a04_realtime_publication_contract.sql':'f78f32e1c4dbe442d20f303d1e281c9e4b28c5da0e2c97ad6e15f70069dd297a',
 '20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql':'913d1cb78f166491fb627f57cdc62df411dea3bc7f49235550f6f9274e3a0b3e',
 '20260802234000_msg_a06_presence_typing_realtime_authorization_contract.sql':'eafe6ebb32dbc4dce74d695af66d574f682b7d9188ac3260fbc9662cc4f157e9',
 '20261025022849_message_update_authority_guard.sql':'fea8f398b3a5ddba7fbf5fb02d237885a0db26f73cd36f4d562eece3a61d0d10'
};
for(const [name,want] of Object.entries(sources)){
 const src=fs.readFileSync(path.join(migrationDir,name),'utf8').replace(/\r\n/g,'\n');
 assert.equal(sha(src),want,'historical source file changed: '+name);
}
const localLater=rows.filter(r=>versions.includes(r.version)).map(r=>r.version);
assert.deepEqual(localLater,Object.keys(knownLater).sort());
const result={
 verdict:'FORWARD_ONLY_PLAN_ONLY_STAGING_NO_GO',
 evidenceDate:history.observationDate,
 sqlBodiesCopied:false,
 stagingReadsInCI:0,
 laterAppliedMigrations:rows.length,
 sharedStorageObjectsKycVersions:exceptions,
 directMessageOrAttachmentSqlReferences:0,
 laterExactVersionCounterpartsWithNormalizedSqlMatch:localLater.length,
 laterVersionsWithoutLocalVersionedFile:rows.length-localLater.length,
 proposedHistoricalMigrationVersionsUnapplied:true,
 sourceSqlHashesChecked:Object.keys(sources).length,
 blocksRelease:true
};
if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
else console.log('MSG_FORWARD_ONLY_SQL_RECONCILIATION_NO_GO_PASS',JSON.stringify(result));
if(process.argv.includes('--assert-release-ready')){
 console.error('REFUSE_RELEASE_READY: SQL classification and local-source provenance are not hosted migration or deployment certification.');
 process.exitCode=2;
}
