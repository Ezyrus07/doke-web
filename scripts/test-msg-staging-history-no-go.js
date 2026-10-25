#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const audit=path.join(root,'scripts/audit-msg-staging-history-no-go.js');
const snap=path.join(root,'docs/validation/MSG-A05-STAGING-MIGRATION-HISTORY-SNAPSHOT-20261025.json');
const run=(...args)=>spawnSync(process.execPath,[audit,...args],{encoding:'utf8'});
let r=run('--json');assert.equal(r.status,0,r.stderr);const evidence=JSON.parse(r.stdout);
assert.equal(evidence.verdict,'STAGING_NO_GO');
assert.equal(evidence.appliedMigrationCount,218);
assert.equal(evidence.olderTargetWithLaterAppliedVersions,49);
assert.equal(evidence.localSqlFiles,187);
assert.equal(evidence.exactVersionMatches,11);
assert.equal(evidence.hostedVersionsWithoutLocalFilename,207);
assert.equal(evidence.locallyMissingLaterVersions,46);
assert.equal(evidence.targets.MSG_A04.applied,false);
assert.equal(evidence.targets.MSG_A05.applied,false);
assert.equal(evidence.targets.MSG_A06.applied,false);
assert.equal(evidence.targets.MSG_UPDATE_GUARD.applied,false);
console.log('MIGRATION_HISTORY_SNAPSHOT_AUDIT_PASS');
r=run('--assert-ready');assert.equal(r.status,2,'the historical status must NEVER claim release-ready');
assert.match(r.stderr,/REFUSE_STAGING_DEPLOYMENT/);
console.log('MIGRATION_HISTORY_HOSTED_RELEASE_REFUSED_PASS');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'msg-history-gate-'));
try{
 const obj=JSON.parse(fs.readFileSync(snap,'utf8'));
 obj.appliedVersions.pop();
 const filepath=path.join(folder,'tampered-history.json');
 fs.writeFileSync(filepath,JSON.stringify(obj));
 r=run('--snapshot',filepath);
 assert.notEqual(r.status,0,'tampered snapshot unexpectedly accepted');
 console.log('MIGRATION_HISTORY_TAMPER_FAIL_CLOSED_PASS');
}finally{fs.rmSync(folder,{recursive:true,force:true});}
console.log('MSG_STAGING_HISTORY_READ_ONLY_GATE_SYNTHETIC_PASS_NOT_RELEASE_APPROVAL');
