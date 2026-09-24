#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const c=require('../config/ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.json');
const envelope=require('../config/ana-a07-a09-funnel-freshness-policy-activation-envelope.json');
const evidence=require('../reports/generated/ana-a07-a09-funnel-freshness-policy-runtime-enforcement-staging-evidence.json');

let passed=0;
function ok(name,fn){try{fn();passed++;}catch(error){error.message=name+': '+error.message;throw error;}}

ok('contract is pending and non-authorizing',()=>{
  assert.equal(c.status,'pending_explicit_activation_approval_repository_authorization');
  assert.equal(c.authority.activationAuthorizationAuthority,false);
  assert.equal(c.authority.activationInvocationAuthority,false);
  assert.equal(c.authority.policyPersistenceAuthority,false);
});
ok('fixed policy bindings match approved envelope',()=>{
  assert.equal(c.fixedBindings.policySetId,envelope.policySet.policySetId);
  assert.equal(c.fixedBindings.metricCount,8);
  assert.equal(c.fixedBindings.maxLagSeconds,360);
  assert.equal(c.fixedBindings.effectiveFrom,'2026-09-24T14:00:00Z');
  assert.equal(c.fixedBindings.effectiveUntil,null);
});
ok('runtime evidence is closed before activation contract',()=>{
  assert.equal(evidence.validation,'044 PASS');
  assert.equal(evidence.runtime.legacyActivationTombstoned,true);
  assert.equal(evidence.policyState.freshnessPolicyRowsPersisted,0);
});
ok('generic proceed cannot authorize repository activation approval',()=>{
  assert.equal(c.activationApprovalAuthorization.genericProceedIsAuthorization,false);
  assert.equal(c.activationApprovalAuthorization.valuesMayBeInferred,false);
  assert.equal(c.activationApprovalAuthorization.scope,'repository_only');
  assert.equal(c.activationApprovalAuthorization.stagingMutationAuthorizedByCommand,false);
  assert.equal(c.activationApprovalAuthorization.activationInvocationAuthorizedByCommand,false);
  assert.equal(c.activationApprovalAuthorization.policyPersistenceAuthorizedByCommand,false);
});
ok('future successor name is safe for postgres identifiers',()=>{
  const unqualified=c.successorRequirements.canonicalFunctionName.split('.').pop();
  assert(unqualified.length<=63);
  assert.equal(c.successorRequirements.identifierWithinPostgres63ByteLimit,true);
});
ok('future successor remains constrained to eight freshness rows',()=>{
  assert.equal(c.successorRequirements.exactPolicyInsertCardinality,8);
  assert.equal(c.successorRequirements.freshnessPoliciesOnly,true);
  assert.equal(c.successorRequirements.publicationPolicyInsertAllowed,false);
  assert.equal(c.successorRequirements.snapshotWriteAllowed,false);
  assert.equal(c.successorRequirements.cronCreationAllowed,false);
});
ok('single-use evidence stays pending',()=>{
  assert.equal(c.pendingTemplate.policyInsertAuthorized,false);
  assert.equal(c.pendingTemplate.activationInvocationLimit,0);
  assert.equal(c.pendingTemplate.authorizationDigestSha256,null);
  assert.equal(c.pendingTemplate.evidenceDigestSha256,null);
});
ok('no operational effect occurred in contract lot',()=>{
  assert.equal(c.prohibitedEffects.successorCreated,false);
  assert.equal(c.prohibitedEffects.migrationApplied,false);
  assert.equal(c.prohibitedEffects.activationInvoked,false);
  assert.equal(c.prohibitedEffects.freshnessPolicyRowsPersisted,false);
  assert.equal(c.prohibitedEffects.stagingMutated,false);
});

assert.equal(passed,8);
console.log('ANA-A07/A09 activation-invocation authorization contract conformance passed: 8/8.');
