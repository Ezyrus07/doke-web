#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const c=require('../config/ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.json');
const e=require('../reports/generated/ana-a07-a09-funnel-freshness-policy-persistent-activation-staging-evidence.json');
let passed=0;const ok=(n,f)=>{try{f();passed++;}catch(x){x.message=n+': '+x.message;throw x;}};
ok('single-use activation consumed',()=>{assert.equal(c.persistentActivationAuthorization.authorizationConsumed,true);assert.equal(c.operationalState.activationInvocationCount,1);assert.equal(c.operationalState.activationInvocationLimit,1);});
ok('eight policies persist',()=>{assert.equal(c.operationalState.policyRowsPersisted,8);assert.equal(e.persistentState.exactPolicyRows,8);assert.equal(e.policies.length,8);});
ok('no auxiliary effects',()=>{assert.equal(e.persistentState.publicationPolicyRowsForActivation,0);assert.equal(e.persistentState.postActivationSnapshotRows,0);assert.equal(e.persistentState.matchingCronJobs,0);});
ok('second invocation not authorized',()=>{assert.equal(c.authority.activationInvocationAuthority,false);assert.equal(c.authority.policyPersistenceAuthority,false);assert.equal(e.boundaries.secondActivationInvocationAuthorized,false);});
ok('projection remains canary gated',()=>{assert.equal(c.authority.runtimeProjectionAuthority,false);assert.equal(c.authority.runtimeSnapshotAuthority,false);assert.equal(c.authority.snapshotPublicationAuthority,false);});
ok('canary contract is materialized but staging stays closed',()=>{assert.equal(c.runtimeCanaryContractAuthorization.scope,'repository_only');assert.equal(c.runtimeCanaryContractAuthorization.authorizationReceived,true);assert.equal(c.runtimeCanaryContractAuthorization.authorizationConsumedForRepositoryArtifacts,true);assert.equal(c.runtimeCanaryContractAuthorization.contractStatus,'repository_ready_staging_execution_unauthorized');assert.equal(c.authority.stagingCanaryExecutionAuthority,false);});
assert.equal(passed,6);console.log('ANA-A07/A09 activation lifecycle conformance passed: 6/6.');
