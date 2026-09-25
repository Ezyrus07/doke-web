#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const root=path.resolve(__dirname,'..');
const json=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const contract=json('config/ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.json');
const approval=json('reports/generated/ana-a07-a09-funnel-freshness-policy-activation-approval-evidence.json');
const staging=json('reports/generated/ana-a07-a09-funnel-freshness-policy-approved-successor-staging-evidence.json');
const persistent=json('reports/generated/ana-a07-a09-funnel-freshness-policy-persistent-activation-staging-evidence.json');
const lib=require('./lib/ana-a07-a09-funnel-freshness-policy-activation-approval');
lib.validateCompletedActivationApprovalEvidence(approval,contract.repositoryActivationApproval.rawAuthorization);
assert.equal(approval.boundaries.policyInsertAuthorized,true);assert.equal(approval.boundaries.activationInvocationLimit,1);
assert.equal(staging.validation,'045 PASS');assert.equal(staging.persistentState.freshnessPolicyRowsPersisted,0);
assert.equal(persistent.result.originalApprovalValidated,true);assert.equal(persistent.result.activationApprovalValidated,true);
assert.equal(persistent.result.rowsInserted,8);assert.equal(persistent.invocationConsumed,true);
assert.equal(persistent.persistentState.exactBindingRows,8);assert.equal(persistent.persistentState.publicationPolicyRowsForActivation,0);
assert.equal(contract.persistentActivationAuthorization.authorizationConsumed,true);
assert.equal(contract.operationalState.policyRowsPersisted,8);
console.log('ANA-A07/A09 activation approval + persistent activation audit passed.');
