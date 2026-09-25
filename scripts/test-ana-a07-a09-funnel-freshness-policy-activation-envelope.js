#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const envelope=require('../config/ana-a07-a09-funnel-freshness-policy-activation-envelope.json');
const lib=require('./lib/ana-a07-a09-funnel-freshness-policy-activation-envelope');

let passed=0;
function ok(name,fn){try{fn();passed++;}catch(error){error.message=name+': '+error.message;throw error;}}
function rejects(name,code,fn){ok(name,()=>{let error=null;try{fn();}catch(caught){error=caught;}assert(error);assert.equal(error.code,code);});}
const clone=(value)=>JSON.parse(JSON.stringify(value));
const valid=envelope.approvalEvidence;

ok('completed envelope validates',()=>assert.equal(lib.validateCompletedApprovalEvidence(valid),valid));
ok('authorization digest is exact',()=>assert.equal(lib.sha256(envelope.authorization.rawCommand),valid.authorizationDigestSha256));
ok('evidence digest deterministic',()=>assert.equal(lib.evidenceDigest(valid),valid.evidenceDigestSha256));
ok('builder reproduces canonical evidence',()=>{
  const built=lib.buildCompletedApprovalEvidence({
    authorizationDigestSha256:valid.authorizationDigestSha256,
    approvedAt:valid.approvedAt,
    repositoryHead:valid.repositoryHead,
    matrixVersion:valid.matrixVersion,
    effectiveFrom:valid.approvedParameters.effectiveFrom
  });
  assert.deepEqual(built,valid);
});
ok('all eight policies bind one effective window',()=>{
  assert.equal(valid.policies.length,8);
  assert.equal(new Set(valid.policies.map((policy)=>policy.policyId)).size,8);
  assert(valid.policies.every((policy)=>policy.effectiveFrom==='2026-09-24T14:00:00Z'&&policy.effectiveUntil===null&&policy.maxLagSeconds===360));
});
ok('only final funnel metric crosses into ORD',()=>{
  const cross=valid.policies.filter((policy)=>policy.sourceDomains.includes('ORD-001'));
  assert.equal(cross.length,1);
  assert.equal(cross[0].metricKey,'funnel.quote_submitted_to_order_requested');
});
rejects('tampered digest','ANA_A07_A09_FUNNEL_ENVELOPE_EVIDENCE_DIGEST_INVALID',()=>{
  const value=clone(valid);value.evidenceDigestSha256='0'.repeat(64);lib.validateCompletedApprovalEvidence(value);
});
rejects('activation authority escalation','ANA_A07_A09_FUNNEL_ENVELOPE_BOUNDARY_INVALID',()=>{
  const value=clone(valid);value.boundaries.policyActivationInvocationAuthorized=true;value.evidenceDigestSha256=lib.evidenceDigest(value);lib.validateCompletedApprovalEvidence(value);
});
rejects('policy persistence escalation','ANA_A07_A09_FUNNEL_ENVELOPE_BOUNDARY_INVALID',()=>{
  const value=clone(valid);value.boundaries.policyPersistenceAuthorized=true;value.evidenceDigestSha256=lib.evidenceDigest(value);lib.validateCompletedApprovalEvidence(value);
});
rejects('wrong effective window','ANA_A07_A09_FUNNEL_ENVELOPE_POLICY_INVALID',()=>{
  const value=clone(valid);value.policies[0].effectiveFrom='2026-09-24T14:05:00Z';value.evidenceDigestSha256=lib.evidenceDigest(value);lib.validateCompletedApprovalEvidence(value);
});
rejects('wrong threshold','ANA_A07_A09_FUNNEL_ENVELOPE_VALUES_INVALID',()=>{
  const value=clone(valid);value.approvedParameters.maxLagSeconds=361;value.evidenceDigestSha256=lib.evidenceDigest(value);lib.validateCompletedApprovalEvidence(value);
});
rejects('wrong policy set','ANA_A07_A09_FUNNEL_ENVELOPE_POLICY_SET_INVALID',()=>{
  const value=clone(valid);value.policySetId='other';value.evidenceDigestSha256=lib.evidenceDigest(value);lib.validateCompletedApprovalEvidence(value);
});
rejects('extra evidence field','ANA_A07_A09_FUNNEL_ENVELOPE_SCHEMA_INVALID',()=>{
  const value={...clone(valid),extraAuthority:true};lib.validateCompletedApprovalEvidence(value);
});

assert.equal(passed,13);
console.log('ANA-A07/A09 funnel freshness activation envelope conformance passed: 13/13.');
