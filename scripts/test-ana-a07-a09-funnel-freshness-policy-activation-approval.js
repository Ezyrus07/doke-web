#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const contract=require('../config/ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.json');
const approval=require('../reports/generated/ana-a07-a09-funnel-freshness-policy-activation-approval-evidence.json');
const staging=require('../reports/generated/ana-a07-a09-funnel-freshness-policy-approved-successor-staging-evidence.json');
const lib=require('./lib/ana-a07-a09-funnel-freshness-policy-activation-approval');

let passed=0;
function ok(name,fn){try{fn();passed++;}catch(error){error.message=name+': '+error.message;throw error;}}

ok('activation approval remains valid',()=>{
  lib.validateCompletedActivationApprovalEvidence(approval,contract.repositoryActivationApproval.rawAuthorization);
  assert.equal(lib.evidenceDigest(approval),approval.evidenceDigestSha256);
});
ok('successor is installed and validated',()=>{
  assert.equal(contract.successorCandidate.stagingApplied,true);
  assert.equal(contract.successorCandidate.validation045Status,'PASS');
  assert.equal(staging.validation,'045 PASS');
});
ok('rollback preserved zero persistent rows',()=>{
  assert.equal(staging.validationCoverage.transientEightRowActivationPassed,true);
  assert.equal(staging.validationCoverage.transactionRolledBack,true);
  assert.equal(staging.persistentState.freshnessPolicyRowsPersisted,0);
});
ok('replay and legacy bypass fail closed',()=>{
  assert.equal(staging.validationCoverage.replayRejectedByOverlap,true);
  assert.equal(staging.validationCoverage.legacyTombstoneRejected,true);
});
ok('persistent activation is still not consumed',()=>{
  assert.equal(contract.operationalState.activationInvoked,false);
  assert.equal(contract.operationalState.policyRowsPersisted,0);
  assert.equal(contract.authority.activationInvocationAuthority,false);
  assert.equal(contract.authority.policyPersistenceAuthority,false);
});
ok('single-use future activation remains narrow',()=>{
  assert.equal(contract.persistentActivationAuthorization.activationInvocationLimit,1);
  assert.equal(contract.persistentActivationAuthorization.exactPolicyRows,8);
  assert.equal(contract.persistentActivationAuthorization.snapshotPublicationAuthorizedByCommand,false);
  assert.equal(contract.persistentActivationAuthorization.cronAuthorizedByCommand,false);
});

assert.equal(passed,6);
console.log('ANA-A07/A09 activation approval conformance passed: 6/6.');
