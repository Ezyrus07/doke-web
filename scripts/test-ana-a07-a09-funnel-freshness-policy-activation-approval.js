#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const contract=require('../config/ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.json');
const evidence=require('../reports/generated/ana-a07-a09-funnel-freshness-policy-activation-approval-evidence.json');
const lib=require('./lib/ana-a07-a09-funnel-freshness-policy-activation-approval');

let passed=0;
function ok(name,fn){try{fn();passed++;}catch(error){error.message=name+': '+error.message;throw error;}}

ok('authorization digest binds exact command',()=>{
  assert.equal(lib.sha256(contract.repositoryActivationApproval.rawAuthorization),evidence.authorizationDigestSha256);
});
ok('evidence digest is canonical and valid',()=>{
  lib.validateCompletedActivationApprovalEvidence(evidence,contract.repositoryActivationApproval.rawAuthorization);
  assert.equal(lib.evidenceDigest(evidence),evidence.evidenceDigestSha256);
});
ok('future insertion approval is single-use',()=>{
  assert.equal(evidence.boundaries.policyInsertAuthorized,true);
  assert.equal(evidence.boundaries.activationInvocationLimit,1);
});
ok('staging remains unauthorized',()=>{
  assert.equal(contract.authority.stagingMutationAuthority,false);
  assert.equal(contract.authority.activationInvocationAuthority,false);
  assert.equal(contract.authority.policyPersistenceAuthority,false);
});
ok('successor candidate is repository only',()=>{
  assert.equal(contract.successorCandidate.status,'repository_ready_staging_unauthorized');
  assert.equal(contract.successorCandidate.stagingApplied,false);
  assert.equal(contract.successorCandidate.validation045Status,'NOT_RUN_STAGING');
});
ok('successor names are postgres safe',()=>{
  assert(contract.successorCandidate.activationFunction.split('.').pop().length<=63);
  assert(contract.successorCandidate.validatorFunction.split('.').pop().length<=63);
});
ok('operational side effects remain zero',()=>{
  assert.equal(contract.operationalState.activationInvoked,false);
  assert.equal(contract.operationalState.policyRowsPersisted,0);
  assert.equal(contract.operationalState.snapshotsWritten,0);
  assert.equal(contract.operationalState.cronCreated,false);
});

assert.equal(passed,7);
console.log('ANA-A07/A09 activation approval conformance passed: 7/7.');
