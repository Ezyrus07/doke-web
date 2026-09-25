#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const c=require('../config/ana-a07-a09-funnel-runtime-canary-contract.json');
let passed=0;const ok=(n,f)=>{try{f();passed++;}catch(e){e.message=n+': '+e.message;throw e;}};
ok('exact canary set',()=>assert.deepEqual(Object.keys(c.canaries),['complete','orphan','empty-window','late-fact']));
ok('046 is rollback-only',()=>{assert.equal(c.validation046.executionMode,'single_transaction_rollback_only');assert.equal(c.validation046.persistentMutationAllowed,false);});
ok('late fact requires real concurrency',()=>{assert.equal(c.canaries['late-fact'].executionMode,'two_session_transient_pg_cron');assert(c.canaries['late-fact'].assertions.includes('oneMicrosecondPredecessorProven=true'));});
ok('identity follows seed 002 authority',()=>{assert.equal(c.syntheticFixtures.identityAuthority,'seed002-email-resolved');assert.equal(c.syntheticFixtures.clientEmail,'cliente@doke.local');assert.equal(c.syntheticFixtures.professionalEmail,'profissional@doke.local');assert.equal(c.syntheticFixtures.legacyFixedUserIdsRetired,true);});
ok('service eligibility follows approved-version authority',()=>{assert.equal(c.syntheticFixtures.serviceEligibilityAuthority,'approved-service-version');assert.equal(c.syntheticFixtures.serviceFixtureMode,'synthetic-approved-version');assert.equal(c.stagingExecutionAuthorization.serviceEligibilityAuthority,'approved-service-version');});
ok('cleanup is mandatory',()=>{assert.equal(c.syntheticFixtures.cleanupRequired,true);assert.equal(c.stagingExecutionAuthorization.cleanupMandatory,true);});
ok('staging execution is consumed and closed',()=>{assert.equal(c.stagingExecutionAuthorization.authorizationConsumed,true);assert.equal(c.stagingExecutionAuthorization.validation046Status,'PASS');assert.equal(c.stagingExecutionAuthorization.lateFactStatus,'PASS');assert.equal(c.stagingExecutionAuthorization.cleanupStatus,'PASS');assert.equal(c.authority.stagingCanaryExecutionAuthority,false);});
ok('projection authority remains separate',()=>{assert.equal(c.authority.runtimeCanaryEvidenceAuthority,true);assert.equal(c.authority.runtimeProjectionAuthority,false);assert.equal(c.authority.runtimeSnapshotAuthority,false);assert.equal(c.authority.snapshotPublicationAuthority,false);assert.equal(c.runtimeProjectionAuthorityGate.runtimeProjectionAuthorityAuthorizedByCommand,true);});
ok('future execution stays narrow',()=>{assert.equal(c.stagingExecutionAuthorization.persistentCronAuthorizedByCommand,false);assert.equal(c.stagingExecutionAuthorization.productionAuthorizedByCommand,false);assert.equal(c.stagingExecutionAuthorization.mergeAuthorizedByCommand,false);});
ok('old staging token cannot be reused',()=>{assert.equal(c.stagingExecutionAuthorization.previousHeadAuthorizationReusable,false);assert.equal(c.stagingExecutionAuthorization.identityAuthority,'seed002-email-resolved');});
ok('certified staging evidence bound',()=>{assert.equal(c.stagingEvidence.blobSha,'3b7274a391a857f2de06538f3302f6be01b06734');assert.equal(c.stagingEvidence.complete,'PASS');assert.equal(c.stagingEvidence.lateFact,'PASS');assert.equal(c.stagingEvidence.cleanup,'PASS');});
assert.equal(passed,11);console.log('ANA-A07/A09 funnel runtime canary contract conformance passed: 11/11.');
