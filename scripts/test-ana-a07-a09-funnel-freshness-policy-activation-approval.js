#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const c=require('../config/ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.json');
const a=require('../reports/generated/ana-a07-a09-funnel-freshness-policy-activation-approval-evidence.json');
const p=require('../reports/generated/ana-a07-a09-funnel-freshness-policy-persistent-activation-staging-evidence.json');
const lib=require('./lib/ana-a07-a09-funnel-freshness-policy-activation-approval');
let passed=0;const ok=(n,f)=>{try{f();passed++;}catch(e){e.message=n+': '+e.message;throw e;}};
ok('approval remains canonical',()=>lib.validateCompletedActivationApprovalEvidence(a,c.repositoryActivationApproval.rawAuthorization));
ok('approved invocation consumed once',()=>{assert.equal(a.boundaries.activationInvocationLimit,1);assert.equal(p.invocationConsumed,true);assert.equal(c.operationalState.activationInvocationCount,1);});
ok('persistent rows exact',()=>{assert.equal(p.result.rowsInserted,8);assert.equal(p.persistentState.exactPolicyRows,8);assert.equal(p.persistentState.exactBindingRows,8);});
ok('no publication snapshot cron',()=>{assert.equal(p.result.publicationPolicyInserted,false);assert.equal(p.result.snapshotWritten,false);assert.equal(p.result.cronCreated,false);});
ok('future writes closed',()=>{assert.equal(c.authority.activationInvocationAuthority,false);assert.equal(c.authority.policyPersistenceAuthority,false);});
assert.equal(passed,5);console.log('ANA-A07/A09 activation approval conformance passed: 5/5.');
