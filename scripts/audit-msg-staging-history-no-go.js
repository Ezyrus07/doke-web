#!/usr/bin/env node
'use strict';
// Historical-readiness HOLD gate. Takes a versioned SELECT-only staging snapshot.
// It DOES NOT connect to or mutate a Supabase project.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname,'..');
const defaultSnapshot = path.join(root,'docs/validation/MSG-A05-STAGING-MIGRATION-HISTORY-SNAPSHOT-20261025.json');
const snapshotFlag = process.argv.indexOf('--snapshot');
const location = snapshotFlag>=0 ? path.resolve(process.argv[snapshotFlag+1]||'') : defaultSnapshot;
assert.ok(location.endsWith('.json'),'requires a JSON evidence file');
const input = JSON.parse(fs.readFileSync(location,'utf8'));
assert.equal(input.kind,'staging-migration-history-metadata-only');
assert.equal(input.notAReleaseApproval,true);
assert.equal(input.capturedWith,'Supabase list_migrations read-only');
assert.match(input.observationDate,/^\d{4}-\d\d-\d\d$/);
assert.equal(input.registeredMigrationCount,218);
assert.ok(Array.isArray(input.appliedVersions));
assert.equal(input.appliedVersions.length,input.registeredMigrationCount);
assert.equal(new Set(input.appliedVersions).size,input.appliedVersions.length);
assert.deepEqual([...input.appliedVersions].sort(),input.appliedVersions,'staging migration ordering changed');
assert.equal(input.latestRegisteredMigration.version,input.appliedVersions.at(-1));
assert.equal(input.latestRegisteredMigration.version,'20261002002201');
assert.equal(input.afterA05.length,49);
assert.deepEqual(input.afterA05.map(m=>m.version),input.appliedVersions.filter(v=>v>'20260802220000'));
const targets = input.targetVersions;
assert.deepEqual(targets,{
 MSG_A04:'20260802183100',
 MSG_A05:'20260802220000',
 MSG_A06:'20260802234000',
 MSG_UPDATE_GUARD:'20261025022849'
});
const applied = new Set(input.appliedVersions);
const targetStatus = Object.fromEntries(Object.entries(targets).map(([name,v])=>[name,{version:v,applied:applied.has(v)}]));
assert.deepEqual(Object.values(targetStatus).map(v=>v.applied),[false,false,false,false]);
assert.equal(input.catalog.lifecycleTablePresent,false);
assert.equal(input.catalog.internalLifecycleFunctionsPresent,false);
assert.equal(input.catalog.messageUpdateGuardTriggerPresent,false);
assert.deepEqual([...input.catalog.storageLegacyPolicies].sort(),[
 'transaction_attachments_owner_delete',
 'transaction_attachments_owner_update',
 'transaction_attachments_participant_insert',
 'transaction_attachments_participant_select'
].sort());
assert.deepEqual(input.catalog.storageLifecyclePolicies,[]);
for(const key of ['sender_id','conversation_id','attachments','body','status']){
 assert.ok(input.catalog.messageUpdateColumnGrants.includes(key),'missing catalog grant '+key);
}
const dir=path.join(root,'supabase/migrations');
const filenames=fs.readdirSync(dir).filter(p=>p.endsWith('.sql')).sort();
const localVersions=filenames.map(f=>f.split('_')[0]);
const localSet=new Set(localVersions);
const matching=filenames.filter(name=>applied.has(name.split('_')[0]));
const remoteUnmatched=input.appliedVersions.filter(v=>!localSet.has(v));
const locallyAbsentLater=input.afterA05.filter(m=>!localSet.has(m.version));
const localOnly=filenames.filter(f=>!applied.has(f.split('_')[0]));
for(const version of Object.values(targets)){
 assert.equal(localVersions.filter(v=>v===version).length,1,'missing/duplicate local proposal '+version);
}
assert.equal(matching.length,11,'local/remote migration roster changed; collect fresh evidence');
assert.equal(locallyAbsentLater.length,46,'later migration roster changed');
const blockers=[
 {id:'UNAPPLIED_HISTORICAL_A04_A05_A06',reason:'Historical message migrations are missing after later migrations were applied'},
 {id:'UNAPPLIED_MESSAGE_UPDATE_GUARD',reason:'The hosted messages UPDATE privilege and guard are not hardened'},
 {id:'REMOTE_HISTORY_NOT_RECONCILED',reason:'Local migration filenames do not represent the full staged history'},
 {id:'STAGING_ATTACHMENT_LIFECYCLE_ABSENT',reason:'The lifecycle table, functions and current Storage policies are absent'},
 {id:'CURRENT_PRIVILEGE_RISK',reason:'Authenticated retains UPDATE to sender_id, conversation_id and attachments'},
 {id:'HOSTED_RUNBOOK_NOT_CERTIFIED',reason:'No approved hosted backup, dependency replay, forward migration and recovery sequence'}
];
const result={
 observationDate:input.observationDate,
 source:'historical-read-only-snapshot',
 disclaimer:'This is not a live staging query or deployment certificate',
 verdict:'STAGING_NO_GO',
 appliedMigrationCount:input.registeredMigrationCount,
 lastAppliedVersion:input.latestRegisteredMigration.version,
 olderTargetWithLaterAppliedVersions:input.afterA05.length,
 localSqlFiles:filenames.length,
 exactVersionMatches:matching.length,
 hostedVersionsWithoutLocalFilename:remoteUnmatched.length,
 locallyMissingLaterVersions:locallyAbsentLater.length,
 localSqlFilesWithoutAppliedVersion:localOnly.length,
 locallyMatchingLaterVersions:input.afterA05.filter(x=>localSet.has(x.version)).map(x=>x.version),
 targets:targetStatus,
 blockers
};
assert.equal(result.verdict,'STAGING_NO_GO');
assert.ok(result.blockers.length>=6);
if(process.argv.includes('--json'))process.stdout.write(JSON.stringify(result,null,2)+'\n');
else console.log('MSG_STAGING_HISTORY_GATE_NO_GO_CONFIRMED',JSON.stringify({
 applied:result.appliedMigrationCount,postA05:result.olderTargetWithLaterAppliedVersions,
 local:result.localSqlFiles,overlap:result.exactVersionMatches,blockers:result.blockers.length
}));
if(process.argv.includes('--assert-ready')) {
 console.error('REFUSE_STAGING_DEPLOYMENT: unresolved migration history and privilege blockers');
 process.exitCode=2;
}
