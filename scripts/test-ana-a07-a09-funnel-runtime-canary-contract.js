#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const c=require('../config/ana-a07-a09-funnel-runtime-canary-contract.json');
let passed=0;const ok=(n,f)=>{try{f();passed++;}catch(e){e.message=n+': '+e.message;throw e;}};
ok('exact canary set',()=>assert.deepEqual(Object.keys(c.canaries),['complete','orphan','empty-window','late-fact']));
ok('046 is rollback-only',()=>{assert.equal(c.validation046.executionMode,'single_transaction_rollback_only');assert.equal(c.validation046.persistentMutationAllowed,false);});
ok('late fact requires real concurrency',()=>{assert.equal(c.canaries['late-fact'].executionMode,'two_session_transient_pg_cron');assert(c.canaries['late-fact'].assertions.includes('oneMicrosecondPredecessorProven=true'));});
ok('cleanup is mandatory',()=>{assert.equal(c.syntheticFixtures.cleanupRequired,true);assert.equal(c.stagingExecutionAuthorization.cleanupMandatory,true);});
ok('staging is still unauthorized',()=>assert.equal(c.authority.stagingCanaryExecutionAuthority,false));
ok('projection authority remains false',()=>{assert.equal(c.authority.runtimeProjectionAuthority,false);assert.equal(c.authority.runtimeSnapshotAuthority,false);assert.equal(c.authority.snapshotPublicationAuthority,false);});
ok('future execution stays narrow',()=>{assert.equal(c.stagingExecutionAuthorization.persistentCronAuthorizedByCommand,false);assert.equal(c.stagingExecutionAuthorization.productionAuthorizedByCommand,false);assert.equal(c.stagingExecutionAuthorization.mergeAuthorizedByCommand,false);});
assert.equal(passed,7);console.log('ANA-A07/A09 funnel runtime canary contract conformance passed: 7/7.');
