#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const script=path.join(root,'scripts/audit-msg-forward-only-sql-reconciliation.js');
const run=(...args)=>spawnSync(process.execPath,[script,...args],{encoding:'utf8'});
let r=run('--json');assert.equal(r.status,0,r.stderr);
const j=JSON.parse(r.stdout);
assert.equal(j.verdict,'FORWARD_ONLY_PLAN_ONLY_STAGING_NO_GO');
assert.equal(j.laterAppliedMigrations,49);
assert.equal(j.laterExactVersionCounterpartsWithNormalizedSqlMatch,3);
assert.equal(j.laterVersionsWithoutLocalVersionedFile,46);
assert.equal(j.directMessageOrAttachmentSqlReferences,0);
assert.equal(j.blocksRelease,true);
console.log('STAGING_LATER_SQL_FINGERPRINT_RECONCILIATION_PASS');
r=run('--assert-release-ready');
assert.equal(r.status,2,'CI must refuse release-ready for a review-only proposal');
assert.match(r.stderr,/REFUSE_RELEASE_READY/);
console.log('FORWARD_ONLY_RELEASE_REFUSAL_PASS');
const evidence=path.join(root,'docs/validation/MSG-A05-STAGING-LATER-SQL-FINGERPRINTS-20261025.json');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'msg-forward-only-'));
try{
 const original=fs.readFileSync(evidence,'utf8');
 const altered=JSON.parse(original);
 altered.rows[0].messages_ref=true;
 const bad=path.join(dir,'injected.json');
 fs.writeFileSync(bad,JSON.stringify(altered));
 r=run('--fingerprints',bad);
 assert.notEqual(r.status,0,'tampered message keyword unexpectedly accepted');
 assert.equal(JSON.parse(fs.readFileSync(evidence,'utf8')).rows[0].messages_ref,false);
 console.log('LATER_SQL_FINGERPRINT_TAMPER_FAIL_CLOSED_PASS');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log('MSG_FORWARD_ONLY_REVIEW_GATE_PASS_HOSTED_NO_GO');
