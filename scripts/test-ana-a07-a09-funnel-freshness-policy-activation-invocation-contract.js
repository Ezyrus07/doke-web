#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const c=require('../config/ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.json');
const approval=require('../reports/generated/ana-a07-a09-funnel-freshness-policy-activation-approval-evidence.json');

let passed=0;
function ok(name,fn){try{fn();passed++;}catch(error){error.message=name+': '+error.message;throw error;}}

ok('repository activation approval is materialized',()=>{
  assert.equal(c.status,'activation_approval_materialized_successor_candidate_ready_staging_unauthorized');
  assert.equal(c.authority.repositoryActivationApprovalAuthority,true);
  assert.equal(c.authority.activationApprovalEvidenceAuthority,true);
  assert.equal(c.repositoryActivationApproval.evidenceDigestSha256,approval.evidenceDigestSha256);
});
ok('future insert approval is single-use but not invoked',()=>{
  assert.equal(approval.boundaries.policyInsertAuthorized,true);
  assert.equal(approval.boundaries.activationInvocationLimit,1);
  assert.equal(c.operationalState.activationInvoked,false);
  assert.equal(c.operationalState.policyRowsPersisted,0);
});
ok('successor candidate exists only in repository',()=>{
  assert.equal(c.authority.successorCandidateAuthority,true);
  assert.equal(c.successorCandidate.status,'repository_ready_staging_unauthorized');
  assert.equal(c.successorCandidate.stagingApplied,false);
  assert.equal(c.operationalState.successorInstalledInStaging,false);
});
ok('staging and persistence remain separate authorities',()=>{
  assert.equal(c.authority.stagingMutationAuthority,false);
  assert.equal(c.authority.activationInvocationAuthority,false);
  assert.equal(c.authority.policyPersistenceAuthority,false);
});
ok('successor candidate remains narrow',()=>{
  assert.equal(c.successorCandidate.exactPolicyInsertCardinality,8);
  assert.equal(c.successorCandidate.publicationPolicyInsertAllowed,false);
  assert.equal(c.successorCandidate.snapshotWriteAllowed,false);
  assert.equal(c.successorCandidate.cronCreationAllowed,false);
});
assert.equal(passed,5);
console.log('ANA-A07/A09 activation-invocation lifecycle conformance passed: 5/5.');
