#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const c=require('../config/ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.json');
const staging=require('../reports/generated/ana-a07-a09-funnel-freshness-policy-approved-successor-staging-evidence.json');

let passed=0;
function ok(name,fn){try{fn();passed++;}catch(error){error.message=name+': '+error.message;throw error;}}

ok('successor is staging validated',()=>{
  assert.equal(c.status,'successor_staging_applied_validated_persistent_activation_unauthorized');
  assert.equal(c.successorCandidate.stagingApplied,true);
  assert.equal(c.successorCandidate.validation045Status,'PASS');
  assert.equal(c.operationalState.successorInstalledInStaging,true);
});
ok('validation was rollback-only',()=>{
  assert.equal(staging.validation,'045 PASS');
  assert.equal(staging.validationMode,'rollback_only');
  assert.equal(staging.validationCoverage.transientEightRowActivationPassed,true);
  assert.equal(staging.validationCoverage.transactionRolledBack,true);
});
ok('persistent state is still zero',()=>{
  assert.equal(c.operationalState.activationInvoked,false);
  assert.equal(c.operationalState.policyRowsPersisted,0);
  assert.equal(staging.persistentState.freshnessPolicyRowsPersisted,0);
});
ok('runtime privilege boundary is closed',()=>{
  assert.equal(staging.runtime.validatorAnonExecute,false);
  assert.equal(staging.runtime.validatorAuthenticatedExecute,false);
  assert.equal(staging.runtime.validatorServiceRoleExecute,false);
  assert.equal(staging.runtime.activationAnonExecute,false);
  assert.equal(staging.runtime.activationAuthenticatedExecute,false);
  assert.equal(staging.runtime.activationServiceRoleExecute,false);
});
ok('persistent activation remains separately gated',()=>{
  assert.equal(c.authority.activationInvocationAuthority,false);
  assert.equal(c.authority.policyPersistenceAuthority,false);
  assert.equal(c.persistentActivationAuthorization.genericProceedIsAuthorization,false);
  assert.equal(c.persistentActivationAuthorization.activationInvocationLimit,1);
  assert.equal(c.persistentActivationAuthorization.exactPolicyRows,8);
});
ok('non-policy authorities remain denied',()=>{
  assert.equal(c.persistentActivationAuthorization.snapshotPublicationAuthorizedByCommand,false);
  assert.equal(c.persistentActivationAuthorization.cronAuthorizedByCommand,false);
  assert.equal(c.persistentActivationAuthorization.productionAuthorizedByCommand,false);
  assert.equal(c.persistentActivationAuthorization.mergeAuthorizedByCommand,false);
  assert.equal(c.persistentActivationAuthorization.readyForReviewAuthorizedByCommand,false);
});

assert.equal(passed,6);
console.log('ANA-A07/A09 activation-invocation lifecycle conformance passed: 6/6.');
